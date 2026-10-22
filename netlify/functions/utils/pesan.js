const crypto = require('crypto');
const { appendRow } = require('./sheets');
const { defineResource, createHandler, httpError, validate } = require('./crud');
const { isBot, checkRateLimit } = require('./antispam');
const { json, parseBody } = require('./http');

const SHEET = 'pesan';

// Kolom yang diisi pengunjung lewat form kontak
const FORM_FIELDS = {
  nama: { label: 'Nama', required: true, max: 100, normalize: true },
  email: { label: 'Email', type: 'email', required: true },
  telepon: { label: 'Nomor telepon', max: 20 },
  pesan: { label: 'Pesan', required: true, max: 2000 },
};

// Pesan berisi data pribadi: daftar/ubah/hapus hanya untuk admin, dan admin hanya mengubah status
const resource = defineResource({
  sheet: SHEET,
  label: 'Pesan',
  fields: {
    ...FORM_FIELDS,
    status: { label: 'Status', options: ['baru', 'dibaca'], default: 'baru' },
  },
  auth: { list: true },
  editable: ['status'],
  // Terbaru di atas; tanggal sama → baris yang ditambahkan belakangan dulu
  sort: (a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0) || b._row - a._row,
});

// POST /api/create-pesan (publik, tanpa login) dari form kontak di landing page
const create = createHandler({
  methods: ['POST'],
  auth: false,
  run: async ({ event }) => {
    const body = parseBody(event);

    // Kiriman bot → pura-pura berhasil, tidak disimpan
    if (isBot(body)) return json(201, { success: true });

    const data = validate(FORM_FIELDS, body);
    if (data.telepon && !/^[0-9+\-\s()]{6,20}$/.test(data.telepon)) {
      throw httpError(400, 'Nomor telepon tidak valid');
    }
    await checkRateLimit(SHEET, data.email);

    await appendRow(SHEET, {
      id: crypto.randomUUID(),
      ...data,
      status: 'baru',
      tanggal: new Date().toISOString(),
    });
    return json(201, { success: true });
  },
});

module.exports = { SHEET, resource, create };
