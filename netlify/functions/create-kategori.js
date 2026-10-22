const crypto = require('crypto');
const { appendRow } = require('./utils/sheets');
const { SHEET, normalize, findKategoriByName } = require('./utils/kategori');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, parseBody, serverError } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);

  try {
    if (!verifyToken(event)) return json(401, { error: 'Tidak terautentikasi' });

    const nama = normalize(parseBody(event).nama);
    if (!nama) return json(400, { error: 'Nama kategori wajib diisi' });
    if (nama.length > 50) return json(400, { error: 'Nama kategori maksimal 50 karakter' });

    if (await findKategoriByName(nama)) {
      return json(409, { error: `Kategori "${nama}" sudah ada` });
    }

    const kategori = { id: crypto.randomUUID(), nama };
    await appendRow(SHEET, kategori);
    return json(201, { data: kategori });
  } catch (err) {
    return serverError(err);
  }
};
