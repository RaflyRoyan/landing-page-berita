function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function methodNotAllowed(allowed) {
  return json(405, { error: 'Method tidak diizinkan' }, { Allow: allowed.join(', ') });
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error('Body harus JSON yang valid');
    err.statusCode = 400;
    throw err;
  }
}

function serverError(err) {
  console.error(err);
  const status = err.statusCode || 500;
  return json(status, { error: status === 500 ? 'Terjadi kesalahan server' : err.message });
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80);
}

module.exports = { json, methodNotAllowed, parseBody, serverError, slugify };
