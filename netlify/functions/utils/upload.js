const { uploadFile } = require('./drive');
const { httpError } = require('./crud');

// Netlify membatasi body request ±6MB dan base64 menambah ±33%, jadi file asli maks. ±4.4MB.
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Tujuan upload: nama folder → env var berisi ID folder Drive + tipe file yang diterima
const FOLDERS = {
  berita: { env: 'DRIVE_FOLDER_ID', types: IMAGE_TYPES },
  galeri: { env: 'DRIVE_FOLDER_GALERI_ID', types: IMAGE_TYPES },
  banner: { env: 'DRIVE_FOLDER_BANNER_ID', types: IMAGE_TYPES },
  dokumen: { env: 'DRIVE_FOLDER_DOKUMEN_ID', types: [...IMAGE_TYPES, 'application/pdf'] },
};

// body = { filename, mimeType, data (base64 / data URL) }. Return { fileId, url, viewUrl }.
async function handleUpload(folderName, body) {
  const folder = FOLDERS[folderName];
  if (!folder) throw httpError(400, `Folder upload tidak dikenal: ${folderName}`);

  const folderId = process.env[folder.env];
  if (!folderId) {
    console.error(`Environment variable ${folder.env} belum diisi`);
    throw httpError(503, `Folder upload "${folderName}" belum diatur di server`);
  }

  const { filename, mimeType, data } = body;
  if (!filename || !mimeType || !data) throw httpError(400, 'filename, mimeType, dan data wajib diisi');
  if (!folder.types.includes(mimeType)) throw httpError(415, 'Tipe file tidak didukung');

  // Terima juga format data URL "data:image/jpeg;base64,...."
  const base64 = String(data).replace(/^data:[^;]+;base64,/, '');
  if (Buffer.byteLength(base64, 'base64') > MAX_BYTES) throw httpError(413, 'Ukuran file melebihi 4 MB');

  const safeName = String(filename).replace(/[^\w.\-]/g, '_').slice(0, 100);
  return uploadFile(base64, `${Date.now()}-${safeName}`, mimeType, folderId);
}

module.exports = { handleUpload, FOLDERS, MAX_BYTES };
