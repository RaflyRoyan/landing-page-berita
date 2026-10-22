const { getRows, updateRows } = require('./sheets');
const { defineResource, httpError } = require('./crud');

const SHEET = 'kategori';

function normalize(nama) {
  return String(nama || '').trim().replace(/\s+/g, ' ');
}

// Perbandingan nama kategori tidak membedakan huruf besar/kecil
function sameName(a, b) {
  return normalize(a).toLowerCase() === normalize(b).toLowerCase();
}

// Return baris master yang cocok dengan nama, atau undefined
async function findKategoriByName(nama) {
  const rows = await getRows(SHEET);
  return rows.find((r) => sameName(r.nama, nama));
}

const resource = defineResource({
  sheet: SHEET,
  label: 'Kategori',
  fields: {
    nama: {
      label: 'Nama kategori',
      required: true,
      max: 50,
      normalize: true,
      unique: true,
      uniqueMessage: (nama) => `Kategori "${nama}" sudah ada`,
    },
  },
  sort: (a, b) => a.nama.localeCompare(b.nama, 'id'),

  // Nama berubah → ganti juga kategori di semua berita yang memakai nama lama
  afterUpdate: async (before, after) => {
    if (before.nama === after.nama) return { beritaDiperbarui: 0 };
    const berita = (await getRows('berita')).filter((b) => sameName(b.kategori, before.nama));
    berita.forEach((b) => {
      b.kategori = after.nama;
    });
    await updateRows('berita', berita);
    return { beritaDiperbarui: berita.length };
  },

  // Kategori yang masih dipakai berita tidak boleh dihapus
  beforeDelete: async (kategori) => {
    const dipakai = (await getRows('berita')).filter((b) => sameName(b.kategori, kategori.nama)).length;
    if (dipakai) {
      throw httpError(
        409,
        `Kategori "${kategori.nama}" masih dipakai ${dipakai} berita. Ganti kategori berita tersebut dulu.`
      );
    }
  },
});

module.exports = { SHEET, normalize, sameName, findKategoriByName, resource };
