const { uploadFile } = require('./utils/drive');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, parseBody, serverError } = require('./utils/http');

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);

  try {
    if (!verifyToken(event)) return json(401, { error: 'Tidak terautentikasi' });

    const { filename, mimeType, data } = parseBody(event);
    if (!filename || !mimeType || !data) {
      return json(400, { error: 'filename, mimeType, dan data wajib diisi' });
    }
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return json(415, { error: 'Tipe file tidak didukung' });
    }

    // Terima juga format data URL "data:image/jpeg;base64,...."
    const base64 = String(data).replace(/^data:[^;]+;base64,/, '');
    const size = Buffer.byteLength(base64, 'base64');
    if (size > MAX_BYTES) return json(413, { error: 'Ukuran file melebihi 5MB' });

    const safeName = String(filename).replace(/[^\w.\-]/g, '_').slice(0, 100);
    const result = await uploadFile(base64, `${Date.now()}-${safeName}`, mimeType, process.env.DRIVE_FOLDER_ID);

    return json(201, result);
  } catch (err) {
    return serverError(err);
  }
};
