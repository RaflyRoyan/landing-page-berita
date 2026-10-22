const { deleteRowById } = require('./utils/sheets');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, parseBody, serverError } = require('./utils/http');

exports.handler = async (event) => {
  if (!['DELETE', 'POST'].includes(event.httpMethod)) return methodNotAllowed(['DELETE', 'POST']);

  try {
    if (!verifyToken(event)) return json(401, { error: 'Tidak terautentikasi' });

    const id = (event.queryStringParameters || {}).id || parseBody(event).id;
    if (!id) return json(400, { error: 'id wajib diisi' });

    const deleted = await deleteRowById('berita', id);
    if (!deleted) return json(404, { error: 'Berita tidak ditemukan' });

    return json(200, { success: true, id });
  } catch (err) {
    return serverError(err);
  }
};
