const { updateRowById, uniqueSlug } = require('./utils/sheets');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, parseBody, serverError } = require('./utils/http');

const STATUS = ['draft', 'publish'];
const EDITABLE = ['judul', 'ringkasan', 'isi', 'foto_id', 'kategori', 'status'];

exports.handler = async (event) => {
  if (!['PUT', 'PATCH'].includes(event.httpMethod)) return methodNotAllowed(['PUT', 'PATCH']);

  try {
    if (!verifyToken(event)) return json(401, { error: 'Tidak terautentikasi' });

    const body = parseBody(event);
    const id = body.id || (event.queryStringParameters || {}).id;
    if (!id) return json(400, { error: 'id wajib diisi' });

    const changes = {};
    EDITABLE.forEach((key) => {
      if (body[key] !== undefined) changes[key] = String(body[key]);
    });

    if (changes.status && !STATUS.includes(changes.status)) {
      return json(400, { error: 'Status harus draft atau publish' });
    }

    if (changes.judul !== undefined) {
      changes.judul = changes.judul.trim();
      if (!changes.judul) return json(400, { error: 'Judul tidak boleh kosong' });

      // Slug ikut judul, tetap unik
      changes.slug = await uniqueSlug('berita', changes.judul, id);
    }

    const updated = await updateRowById('berita', id, changes);
    if (!updated) return json(404, { error: 'Berita tidak ditemukan' });

    return json(200, { data: updated });
  } catch (err) {
    return serverError(err);
  }
};
