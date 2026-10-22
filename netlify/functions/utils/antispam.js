const { getRows } = require('./sheets');
const { httpError } = require('./crud');

// Form publik punya kolom tersembunyi "website" (honeypot) yang hanya diisi bot
function isBot(body) {
  return Boolean(body && body.website);
}

// Tolak (429) jika email yang sama sudah mengirim `max` kali dalam `windowMs` terakhir.
// Tab harus punya kolom `email` dan `tanggal` (ISO).
async function checkRateLimit(sheet, email, { max = 3, windowMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now();
  const key = String(email).toLowerCase();
  const recent = (await getRows(sheet)).filter(
    (r) => String(r.email).toLowerCase() === key && now - new Date(r.tanggal).getTime() < windowMs
  ).length;
  if (recent >= max) {
    throw httpError(429, 'Terlalu banyak kiriman dalam waktu singkat. Silakan coba lagi beberapa menit lagi.');
  }
}

module.exports = { isBot, checkRateLimit };
