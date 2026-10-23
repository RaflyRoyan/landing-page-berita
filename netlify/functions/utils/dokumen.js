const { defineResource, httpError } = require('./crud');
const { thumbnailUrl, viewUrl } = require('./drive');

const JENIS = ['SK', 'Surat Edaran', 'Pengumuman', 'Laporan', 'Lainnya'];

function downloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Pojok Informasi: arsip dokumen resmi (SK, surat edaran, ...) dengan file PDF / gambar di Drive
const resource = defineResource({
  sheet: 'dokumen',
  label: 'Dokumen',
  fields: {
    nomor: {
      label: 'Nomor',
      max: 100,
      normalize: true,
      unique: true, // hanya dicek jika diisi
      uniqueMessage: (nomor) => `Dokumen dengan nomor "${nomor}" sudah ada`,
    },
    judul: { label: 'Judul', required: true, max: 200, normalize: true },
    jenis: { label: 'Jenis', required: true, options: JENIS },
    tanggal_dokumen: { label: 'Tanggal dokumen', required: true, max: 10 },
    ringkasan: { label: 'Ringkasan', max: 500 },
    file_id: { label: 'File', required: true, max: 100 },
    file_tipe: { label: 'Tipe file', required: true, options: ['pdf', 'gambar'] },
    status: { label: 'Status', options: ['draft', 'publish'], default: 'draft' },
  },
  publicFilter: (row) => row.status === 'publish',

  // Dokumen terbaru dulu, lalu yang terakhir dibuat
  sort: (a, b) =>
    String(b.tanggal_dokumen).localeCompare(String(a.tanggal_dokumen)) ||
    new Date(b.tanggal || 0) - new Date(a.tanggal || 0),

  toPublic: (row) => ({
    ...row,
    lihat_url: !row.file_id ? '' : row.file_tipe === 'pdf' ? viewUrl(row.file_id) : thumbnailUrl(row.file_id, 1600),
    unduh_url: row.file_id ? downloadUrl(row.file_id) : '',
  }),

  prepare: ({ data, existing }) => {
    if (data.tanggal_dokumen !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal_dokumen)) {
      throw httpError(400, 'Tanggal dokumen tidak valid (format YYYY-MM-DD)');
    }
    if (data.file_id !== undefined && !/^[\w-]{10,100}$/.test(data.file_id)) {
      throw httpError(400, 'File tidak valid');
    }
    return existing ? {} : { tanggal: new Date().toISOString() };
  },
});

module.exports = { JENIS, resource };
