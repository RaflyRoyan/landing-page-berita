const { Readable } = require('stream');
const { getDriveClient } = require('./google-auth');

// size = lebar maksimum dalam piksel
function thumbnailUrl(fileId, size = 1200) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

// Halaman pratinjau Drive (untuk PDF / dokumen)
function viewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

async function uploadFile(base64, filename, mimeType, folderId) {
  const drive = getDriveClient();
  const buffer = Buffer.from(base64, 'base64');

  const created = await drive.files.create({
    requestBody: {
      name: filename,
      mimeType,
      parents: folderId ? [folderId] : undefined,
    },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id',
  });

  const fileId = created.data.id;

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return { fileId, url: thumbnailUrl(fileId), viewUrl: viewUrl(fileId) };
}

module.exports = { uploadFile, thumbnailUrl, viewUrl };
