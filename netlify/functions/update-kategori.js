const { getRows, updateRowById, updateRows } = require('./utils/sheets');
const { SHEET, normalize, sameName } = require('./utils/kategori');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, parseBody, serverError } = require('./utils/http');

exports.handler = async (event) => {
  if (!['PUT', 'PATCH'].includes(event.httpMethod)) return methodNotAllowed(['PUT', 'PATCH']);

  try {
    if (!verifyToken(event)) return json(401, { error: 'Tidak terautentikasi' });

    const body = parseBody(event);
    const id = body.id || (event.queryStringParameters || {}).id;
    if (!id) return json(400, { error: 'id wajib diisi' });

    const nama = normalize(body.nama);
    if (!nama) return json(400, { error: 'Nama kategori wajib diisi' });
    if (nama.length > 50) return json(400, { error: 'Nama kategori maksimal 50 karakter' });

    const rows = await getRows(SHEET);
    const existing = rows.find((r) => r.id === id);
    if (!existing) return json(404, { error: 'Kategori tidak ditemukan' });
    if (rows.some((r) => r.id !== id && sameName(r.nama, nama))) {
      return json(409, { error: `Kategori "${nama}" sudah ada` });
    }

    const oldNama = existing.nama;
    const updated = await updateRowById(SHEET, id, { nama });

    // Nama berubah → ganti juga kategori di semua berita yang memakai nama lama
    let beritaDiperbarui = 0;
    if (oldNama !== nama) {
      const berita = (await getRows('berita')).filter((b) => sameName(b.kategori, oldNama));
      berita.forEach((b) => {
        b.kategori = nama;
      });
      await updateRows('berita', berita);
      beritaDiperbarui = berita.length;
    }

    return json(200, { data: updated, beritaDiperbarui });
  } catch (err) {
    return serverError(err);
  }
};
