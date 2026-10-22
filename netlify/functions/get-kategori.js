const { getKategoriRows } = require('./utils/kategori');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, serverError } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);

  try {
    const isAdmin = Boolean(verifyToken(event));
    const rows = await getKategoriRows();

    // Admin harus langsung melihat perubahan master, jadi jangan di-cache
    const cacheHeader = isAdmin
      ? { 'Cache-Control': 'private, no-store' }
      : { 'Cache-Control': 'public, max-age=60' };

    return json(200, { data: rows.map(({ _row, ...rest }) => rest) }, cacheHeader);
  } catch (err) {
    return serverError(err);
  }
};
