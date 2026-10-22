const { getRows } = require('./utils/sheets');
const { thumbnailUrl } = require('./utils/drive');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, serverError } = require('./utils/http');

function toPublic(row) {
  const { _row, ...rest } = row;
  return { ...rest, foto_url: rest.foto_id ? thumbnailUrl(rest.foto_id) : '' };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);

  try {
    const isAdmin = Boolean(verifyToken(event));
    const { id, slug } = event.queryStringParameters || {};

    let rows = await getRows('berita');
    if (!isAdmin) rows = rows.filter((r) => r.status === 'publish');

    // Respons admin tidak boleh di-cache publik
    const cacheHeader = isAdmin
      ? { 'Cache-Control': 'private, no-store' }
      : { 'Cache-Control': 'public, max-age=60' };

    if (id || slug) {
      const found = rows.find((r) => (id ? r.id === id : r.slug === slug));
      if (!found) return json(404, { error: 'Berita tidak ditemukan' });
      return json(200, { data: toPublic(found) }, cacheHeader);
    }

    rows.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));
    return json(200, { data: rows.map(toPublic) }, cacheHeader);
  } catch (err) {
    return serverError(err);
  }
};
