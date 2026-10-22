const { getRows, deleteRowById } = require('./utils/sheets');
const { SHEET, sameName } = require('./utils/kategori');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, parseBody, serverError } = require('./utils/http');

exports.handler = async (event) => {
  if (!['DELETE', 'POST'].includes(event.httpMethod)) return methodNotAllowed(['DELETE', 'POST']);

  try {
    if (!verifyToken(event)) return json(401, { error: 'Tidak terautentikasi' });

    const id = (event.queryStringParameters || {}).id || parseBody(event).id;
    if (!id) return json(400, { error: 'id wajib diisi' });

    const existing = (await getRows(SHEET)).find((r) => r.id === id);
    if (!existing) return json(404, { error: 'Kategori tidak ditemukan' });

    // Kategori yang masih dipakai berita tidak boleh dihapus
    const dipakai = (await getRows('berita')).filter((b) => sameName(b.kategori, existing.nama)).length;
    if (dipakai) {
      return json(409, {
        error: `Kategori "${existing.nama}" masih dipakai ${dipakai} berita. Ganti kategori berita tersebut dulu.`,
      });
    }

    await deleteRowById(SHEET, id);
    return json(200, { success: true, id });
  } catch (err) {
    return serverError(err);
  }
};
