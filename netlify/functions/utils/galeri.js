const { defineResource, httpError } = require('./crud');
const { thumbnailUrl } = require('./drive');

const MAX_FOTO = 200; // per album

// "id1, id2,id1" → ['id1', 'id2'] (tanpa duplikat, hanya karakter id Drive)
function parseIds(raw) {
  const list = Array.isArray(raw) ? raw : String(raw || '').split(',');
  const ids = [];
  list.forEach((v) => {
    const id = String(v).trim();
    if (id && /^[\w-]{10,100}$/.test(id) && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

// Album kegiatan. foto_ids = id file Drive dipisah koma, urutannya = urutan tampil.
const resource = defineResource({
  sheet: 'galeri',
  label: 'Album',
  fields: {
    judul: { label: 'Judul', required: true, max: 150, normalize: true },
    keterangan: { label: 'Keterangan', max: 1000 },
    tanggal_kegiatan: { label: 'Tanggal kegiatan', required: true, max: 10 },
    foto_ids: { label: 'Foto', max: 45000 },
    sampul_id: { label: 'Sampul', max: 100 },
    status: { label: 'Status', options: ['draft', 'publish'], default: 'draft' },
  },
  publicFilter: (row) => row.status === 'publish',

  // Kegiatan terbaru dulu, lalu yang terakhir dibuat
  sort: (a, b) =>
    String(b.tanggal_kegiatan).localeCompare(String(a.tanggal_kegiatan)) ||
    new Date(b.tanggal || 0) - new Date(a.tanggal || 0),

  toPublic: (row) => {
    const ids = parseIds(row.foto_ids);
    const sampul = ids.includes(row.sampul_id) ? row.sampul_id : ids[0] || '';
    return {
      ...row,
      sampul_id: sampul,
      sampul_url: sampul ? thumbnailUrl(sampul, 800) : '',
      jumlah_foto: ids.length,
      foto: ids.map((id) => ({ id, thumb_url: thumbnailUrl(id, 400), url: thumbnailUrl(id, 1600) })),
    };
  },

  prepare: ({ data, existing }) => {
    const tanggal = data.tanggal_kegiatan ?? (existing && existing.tanggal_kegiatan);
    if (data.tanggal_kegiatan !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      throw httpError(400, 'Tanggal kegiatan tidak valid (format YYYY-MM-DD)');
    }

    const ids = parseIds(data.foto_ids ?? (existing && existing.foto_ids));
    if (!ids.length) throw httpError(400, 'Album minimal berisi 1 foto');
    if (ids.length > MAX_FOTO) throw httpError(400, `Album maksimal ${MAX_FOTO} foto`);

    // Sampul harus salah satu foto album; jika tidak, pakai foto pertama
    const sampul = data.sampul_id ?? (existing && existing.sampul_id);
    const extra = { foto_ids: ids.join(','), sampul_id: ids.includes(sampul) ? sampul : ids[0] };
    if (!existing) extra.tanggal = new Date().toISOString();
    return extra;
  },
});

module.exports = { resource, parseIds };
