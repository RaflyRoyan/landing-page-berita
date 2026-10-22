const { getSheetsClient } = require('./google-auth');
const { slugify } = require('./http');

function sheetId() {
  const id = process.env.SHEET_ID;
  if (!id) throw new Error('Environment variable SHEET_ID belum diisi');
  return id;
}

async function getValues(sheetName) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${sheetName}!A:Z`,
  });
  return res.data.values || [];
}

async function getHeaders(sheetName) {
  const values = await getValues(sheetName);
  if (!values.length) throw new Error(`Sheet "${sheetName}" tidak punya header`);
  return values[0];
}

// Baris pertama = header, sisanya dikonversi ke array of object.
// _row = nomor baris di sheet (1-based), dipakai untuk update/delete.
async function getRows(sheetName) {
  const values = await getValues(sheetName);
  if (values.length < 2) return [];

  const [headers, ...rows] = values;
  return rows
    .map((row, i) => {
      const obj = { _row: i + 2 };
      headers.forEach((h, j) => {
        obj[h] = row[j] !== undefined ? row[j] : '';
      });
      return obj;
    })
    .filter((obj) => headers.some((h) => obj[h] !== ''));
}

function toRow(headers, data) {
  return headers.map((h) => (data[h] !== undefined && data[h] !== null ? String(data[h]) : ''));
}

async function appendRow(sheetName, data) {
  const sheets = getSheetsClient();
  const headers = await getHeaders(sheetName);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(),
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [toRow(headers, data)] },
  });
  return data;
}

async function updateRowById(sheetName, id, data) {
  const sheets = getSheetsClient();
  const headers = await getHeaders(sheetName);
  const rows = await getRows(sheetName);
  const existing = rows.find((r) => r.id === id);
  if (!existing) return null;

  const merged = { ...existing, ...data, id };
  const lastCol = columnLetter(headers.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${sheetName}!A${existing._row}:${lastCol}${existing._row}`,
    valueInputOption: 'RAW',
    requestBody: { values: [toRow(headers, merged)] },
  });

  delete merged._row;
  return merged;
}

// Tulis ulang banyak baris sekaligus. rows = hasil getRows() yang sudah diubah (punya _row).
async function updateRows(sheetName, rows) {
  if (!rows.length) return;
  const sheets = getSheetsClient();
  const headers = await getHeaders(sheetName);
  const lastCol = columnLetter(headers.length);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId(),
    requestBody: {
      valueInputOption: 'RAW',
      data: rows.map((row) => ({
        range: `${sheetName}!A${row._row}:${lastCol}${row._row}`,
        values: [toRow(headers, row)],
      })),
    },
  });
}

async function deleteRowById(sheetName, id) {
  const sheets = getSheetsClient();
  const rows = await getRows(sheetName);
  const existing = rows.find((r) => r.id === id);
  if (!existing) return false;

  // deleteDimension butuh sheetId numerik (gid), bukan nama sheet
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId(),
    fields: 'sheets.properties',
  });
  const sheet = meta.data.sheets.find((s) => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" tidak ditemukan`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: existing._row - 1,
              endIndex: existing._row,
            },
          },
        },
      ],
    },
  });
  return true;
}

// Slug dari judul, ditambah -2, -3, ... jika sudah dipakai baris lain
async function uniqueSlug(sheetName, judul, excludeId) {
  const base = slugify(judul) || 'item';
  const rows = await getRows(sheetName);
  const taken = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

function columnLetter(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

module.exports = { getRows, appendRow, updateRowById, updateRows, deleteRowById, uniqueSlug };
