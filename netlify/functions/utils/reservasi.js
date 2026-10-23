const crypto = require('crypto');
const { getRows, appendRow } = require('./sheets');
const { defineResource, createHandler, httpError, validate } = require('./crud');
const { isBot, checkRateLimit } = require('./antispam');
const { handleUpload } = require('./upload');
const { json, parseBody } = require('./http');

const SHEET = 'reservasi';

// Aturan jadwal kunjungan. Dikirim juga ke browser lewat jadwal-reservasi agar kalender memakai aturan yang sama.
const CONFIG = {
  hariBuka: [1, 2, 3, 4, 5, 6], // 0 = Minggu ... 6 = Sabtu → Senin–Sabtu
  jamBuka: '08:00',
  jamTutup: '16:00',
  durasi: [60, 90, 120], // menit
  langkahMenit: 30, // jam mulai tiap 30 menit
  minHari: 1, // paling cepat besok
  maxHari: 60, // paling lambat 60 hari ke depan
};

// Status yang memakai jam (tidak boleh ditumpuki reservasi lain)
const AKTIF = ['menunggu', 'disetujui'];
const SUMBER_INFO = ['Instagram', 'WhatsApp', 'Teman / kenalan', 'Sekolah / instansi', 'Kelurahan / kecamatan', 'Lainnya'];

const toMenit = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};
const toJam = (menit) => `${String(Math.floor(menit / 60)).padStart(2, '0')}:${String(menit % 60).padStart(2, '0')}`;

// Tanggal hari ini di WIB (Surabaya) sebagai YYYY-MM-DD
function hariIni() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function tambahHari(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function periode() {
  const today = hariIni();
  return { mulai: tambahHari(today, CONFIG.minHari), akhir: tambahHari(today, CONFIG.maxHari) };
}

// Lempar 400 jika tanggal/jam/durasi di luar aturan
function cekAturan({ tanggal_kunjungan: tgl, jam_mulai: jam, durasi }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl) || Number.isNaN(new Date(`${tgl}T00:00:00Z`).getTime())) {
    throw httpError(400, 'Tanggal kunjungan tidak valid');
  }
  const { mulai, akhir } = periode();
  if (tgl < mulai || tgl > akhir) throw httpError(400, 'Tanggal kunjungan di luar periode reservasi');
  if (!CONFIG.hariBuka.includes(new Date(`${tgl}T00:00:00Z`).getUTCDay())) {
    throw httpError(400, 'Kunjungan hanya dibuka Senin–Sabtu');
  }
  if (!CONFIG.durasi.includes(Number(durasi))) throw httpError(400, 'Durasi harus 60, 90, atau 120 menit');
  if (!/^\d{2}:\d{2}$/.test(jam)) throw httpError(400, 'Jam mulai tidak valid');
  const start = toMenit(jam);
  if (start % CONFIG.langkahMenit) throw httpError(400, 'Jam mulai harus kelipatan 30 menit');
  if (start < toMenit(CONFIG.jamBuka) || start + Number(durasi) > toMenit(CONFIG.jamTutup)) {
    throw httpError(400, `Kunjungan harus di antara pukul ${CONFIG.jamBuka.replace(':', '.')}–${CONFIG.jamTutup.replace(':', '.')}`);
  }
}

// Lempar 409 jika [jam_mulai, jam_mulai + durasi) bentrok dengan reservasi aktif lain di tanggal yang sama
function cekBentrok(rows, { tanggal_kunjungan: tgl, jam_mulai: jam, durasi }, excludeId) {
  const start = toMenit(jam);
  const end = start + Number(durasi);
  const bentrok = rows.find(
    (r) =>
      r.id !== excludeId &&
      AKTIF.includes(r.status) &&
      r.tanggal_kunjungan === tgl &&
      toMenit(r.jam_mulai) < end &&
      start < toMenit(r.jam_mulai) + Number(r.durasi)
  );
  if (bentrok) {
    const sampai = toJam(toMenit(bentrok.jam_mulai) + Number(bentrok.durasi));
    throw httpError(
      409,
      `Jam tersebut bentrok dengan reservasi lain (${bentrok.jam_mulai.replace(':', '.')}–${sampai.replace(':', '.')}). Silakan pilih jam lain.`
    );
  }
}

// Kode untuk cek status, mis. RSV-7K2QF (tanpa huruf/angka yang mirip: 0/O, 1/I/L)
function buatKode(rows) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (;;) {
    const kode = `RSV-${Array.from(crypto.randomBytes(5), (b) => chars[b % chars.length]).join('')}`;
    if (!rows.some((r) => r.kode === kode)) return kode;
  }
}

const jamSelesai = (r) => toJam(toMenit(r.jam_mulai) + Number(r.durasi));

// ----- Admin: daftar, ubah status, hapus (data pribadi → hanya admin) -----
const resource = defineResource({
  sheet: SHEET,
  label: 'Reservasi',
  fields: {
    status: { label: 'Status', options: ['menunggu', 'disetujui', 'ditolak'] },
  },
  auth: { list: true },
  editable: ['status'],
  // Kunjungan terdekat dulu
  sort: (a, b) =>
    String(a.tanggal_kunjungan).localeCompare(String(b.tanggal_kunjungan)) ||
    toMenit(a.jam_mulai) - toMenit(b.jam_mulai),
  toPublic: (row) => ({ ...row, jam_selesai: jamSelesai(row) }),
  // Menyetujui / mengaktifkan lagi tidak boleh membuat jadwal bentrok
  prepare: async ({ data, existing }) => {
    if (existing && AKTIF.includes(data.status) && !AKTIF.includes(existing.status)) {
      cekBentrok(await getRows(SHEET), existing, existing.id);
    }
    return {};
  },
});

// ----- Publik: jadwal terisi (tanpa data pribadi) -----
const jadwal = createHandler({
  methods: ['GET'],
  auth: false,
  run: async () => {
    const { mulai, akhir } = periode();
    const terisi = (await getRows(SHEET))
      .filter((r) => AKTIF.includes(r.status) && r.tanggal_kunjungan >= mulai && r.tanggal_kunjungan <= akhir)
      .map((r) => ({
        tanggal: r.tanggal_kunjungan,
        jam_mulai: r.jam_mulai,
        jam_selesai: jamSelesai(r),
        status: r.status,
      }))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.jam_mulai.localeCompare(b.jam_mulai));
    return json(
      200,
      { data: { config: { ...CONFIG, mulai, akhir, hariIni: hariIni() }, terisi, diperbarui: new Date().toISOString() } },
      { 'Cache-Control': 'public, max-age=15' }
    );
  },
});

// ----- Publik: kirim reservasi -----
const FORM_FIELDS = {
  tanggal_kunjungan: { label: 'Tanggal kunjungan', required: true, max: 10 },
  jam_mulai: { label: 'Jam mulai', required: true, max: 5 },
  durasi: { label: 'Durasi', type: 'number', required: true },
  organisasi: { label: 'Nama organisasi', required: true, max: 150, normalize: true },
  nama_pic: { label: 'Nama PIC', required: true, max: 100, normalize: true },
  jumlah: { label: 'Jumlah yang hadir', type: 'number', required: true },
  telepon: { label: 'No. telepon / WhatsApp', required: true, max: 20 },
  email: { label: 'Email', type: 'email', required: true },
  sumber_info: { label: 'Sumber info', options: SUMBER_INFO },
};

const create = createHandler({
  methods: ['POST'],
  auth: false,
  run: async ({ event }) => {
    const body = parseBody(event);
    if (isBot(body)) return json(201, { data: { kode: 'RSV-XXXXX', status: 'menunggu' } });

    const data = validate(FORM_FIELDS, body);
    const jumlah = Number(data.jumlah);
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 200) throw httpError(400, 'Jumlah yang hadir harus 1–200 orang');
    if (!/^[0-9+\-\s()]{6,20}$/.test(data.telepon)) throw httpError(400, 'Nomor telepon tidak valid');
    cekAturan(data);

    const rows = await getRows(SHEET);
    cekBentrok(rows, data);
    await checkRateLimit(SHEET, data.email);

    // Surat permohonan (opsional) diunggah setelah semua pemeriksaan lolos
    let suratId = '';
    if (body.surat && body.surat.data) {
      try {
        ({ fileId: suratId } = await handleUpload('reservasi', body.surat));
      } catch (err) {
        if (err.statusCode !== 503) throw err;
        throw httpError(503, 'Upload surat belum tersedia. Kirim reservasi tanpa surat, lalu kirim surat lewat WhatsApp admin.');
      }
    }

    const record = {
      id: crypto.randomUUID(),
      kode: buatKode(rows),
      ...data,
      surat_id: suratId,
      status: 'menunggu',
      tanggal: new Date().toISOString(),
    };
    await appendRow(SHEET, record);
    return json(201, {
      data: {
        kode: record.kode,
        tanggal_kunjungan: record.tanggal_kunjungan,
        jam_mulai: record.jam_mulai,
        jam_selesai: jamSelesai(record),
        status: record.status,
      },
    });
  },
});

// ----- Publik: cek status dengan kode (tanpa data pribadi) -----
const cek = createHandler({
  methods: ['GET'],
  auth: false,
  run: async ({ query }) => {
    const kode = String(query.kode || '').trim().toUpperCase();
    if (!/^RSV-[A-Z0-9]{5}$/.test(kode)) throw httpError(400, 'Format kode tidak valid, contoh: RSV-7K2QF');
    const r = (await getRows(SHEET)).find((x) => x.kode === kode);
    if (!r) throw httpError(404, 'Kode reservasi tidak ditemukan');
    return json(
      200,
      {
        data: {
          kode: r.kode,
          organisasi: r.organisasi,
          tanggal_kunjungan: r.tanggal_kunjungan,
          jam_mulai: r.jam_mulai,
          jam_selesai: jamSelesai(r),
          status: r.status,
        },
      },
      { 'Cache-Control': 'no-store' }
    );
  },
});

module.exports = { SHEET, CONFIG, SUMBER_INFO, resource, jadwal, create, cek };
