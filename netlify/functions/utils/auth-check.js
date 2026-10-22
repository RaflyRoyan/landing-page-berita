const jwt = require('jsonwebtoken');

function getToken(event) {
  const headers = event.headers || {};
  const header = headers.authorization || headers.Authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// Return payload JWT jika valid, null jika tidak ada / tidak valid / expired.
function verifyToken(event) {
  const token = getToken(event);
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Environment variable JWT_SECRET belum diisi');
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

module.exports = { verifyToken };
