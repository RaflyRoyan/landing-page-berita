const { handleUpload } = require('./utils/upload');
const { createHandler } = require('./utils/crud');
const { json, parseBody } = require('./utils/http');

// POST /api/upload-file  { folder: 'berita'|'galeri'|'banner'|'dokumen', filename, mimeType, data }
exports.handler = createHandler({
  methods: ['POST'],
  run: async ({ event }) => {
    const body = parseBody(event);
    return json(201, await handleUpload(body.folder, body));
  },
});
