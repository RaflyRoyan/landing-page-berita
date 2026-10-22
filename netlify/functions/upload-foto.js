const { handleUpload } = require('./utils/upload');
const { createHandler } = require('./utils/crud');
const { json, parseBody } = require('./utils/http');

// Endpoint lama (foto berita). Upload baru sebaiknya memakai upload-file dengan folder.
exports.handler = createHandler({
  methods: ['POST'],
  run: async ({ event }) => json(201, await handleUpload('berita', parseBody(event))),
});
