const { Readable } = require('stream');
const { getDriveClient } = require('./google-auth');

function thumbnailUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
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
