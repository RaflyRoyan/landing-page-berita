const crypto = require('crypto');
const { appendRow } = require('./sheets');
const { defineResource, createHandler, validate } = require('./crud');
const { isBot, checkRateLimit } = require('./antispam');
const { thumbnailUrl } = require('./drive');
const { json, parseBody } = require('./http');

const SHEET = 'testimoni';

// status: menunggu (kiriman pengunjung, belum disetujui) → publish; tulisan admin: draft → publish.
// Hanya "publish" yang tampil di situs.
const resource = defineResource({
  sheet: SHEET,
  label: 'Testimoni',
  fields: {
    nama: { label: 'Nama', required: true, max: 100, normalize: true },
    peran: { label: 'Peran', max: 100, normalize: true },
    kutipan: { label: 'Testimoni', required: true, max: 500 },
    foto_id: { label: 'Foto', max: 200 },
    status: { label: 'Status', options: ['menunggu', 'draft', 'publish'], default: 'draft' },
    urutan: { label: 'Urutan', type: 'number' },
  },
  publicFilter: (row) => row.status === 'publish',

  // Urutan kecil dulu (kosong di belakang), lalu yang terbaru
  sort: (a, b) => {
    const ua = a.urutan === '' ? Infinity : Number(a.urutan);
    const ub = b.urutan === '' ? Infinity : Number(b.urutan);
    return ua - ub || new Date(b.tanggal || 0) - new Date(a.tanggal || 0);
  },

  // Email & sumber hanya untuk admin; publik cukup nama, peran, kutipan, foto
  toPublic: (row, { isAdmin }) => {
    const out = { ...row, foto_url: row.foto_id ? thumbnailUrl(row.foto_id) : '' };
    if (!isAdmin) {
      delete out.email;
      delete out.sumber;
    }
    return out;
  },

  // Testimoni yang dibuat admin: sumber "admin", tanggal sekarang
  prepare: ({ existing }) => (existing ? {} : { sumber: 'admin', email: '', tanggal: new Date().toISOString() }),
});

// Kolom form "Kirim testimoni" untuk pengunjung (tanpa foto)
const SUBMIT_FIELDS = {
  nama: { label: 'Nama', required: true, max: 100, normalize: true },
  peran: { label: 'Peran', max: 100, normalize: true },
  email: { label: 'Email', type: 'email', required: true },
  kutipan: { label: 'Testimoni', required: true, max: 500 },
};

// POST /api/submit-testimoni (publik): selalu masuk sebagai "menunggu" persetujuan admin
const submit = createHandler({
  methods: ['POST'],
  auth: false,
  run: async ({ event }) => {
    const body = parseBody(event);

    // Kiriman bot → pura-pura berhasil, tidak disimpan
    if (isBot(body)) return json(201, { success: true });

    const data = validate(SUBMIT_FIELDS, body);
    await checkRateLimit(SHEET, data.email);

    await appendRow(SHEET, {
      id: crypto.randomUUID(),
      ...data,
      foto_id: '',
      sumber: 'pengunjung',
      status: 'menunggu',
      urutan: '',
      tanggal: new Date().toISOString(),
    });
    return json(201, { success: true });
  },
});

module.exports = { SHEET, resource, submit };
