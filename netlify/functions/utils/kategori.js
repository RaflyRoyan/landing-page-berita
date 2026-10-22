const { getRows } = require('./sheets');

const SHEET = 'kategori';

function normalize(nama) {
  return String(nama || '').trim().replace(/\s+/g, ' ');
}

// Perbandingan nama kategori tidak membedakan huruf besar/kecil
function sameName(a, b) {
  return normalize(a).toLowerCase() === normalize(b).toLowerCase();
}

async function getKategoriRows() {
  const rows = await getRows(SHEET);
  return rows.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

// Return baris master yang cocok dengan nama, atau undefined
async function findKategoriByName(nama) {
  const rows = await getRows(SHEET);
  return rows.find((r) => sameName(r.nama, nama));
}

module.exports = { SHEET, normalize, sameName, getKategoriRows, findKategoriByName };
