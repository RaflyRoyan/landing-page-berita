const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getRows } = require('./utils/sheets');
const { json, methodNotAllowed, parseBody, serverError } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Environment variable JWT_SECRET belum diisi');

    const { username, password } = parseBody(event);
    if (!username || !password) return json(400, { error: 'Username dan password wajib diisi' });

    const users = await getRows('users');
    const user = users.find((u) => u.username === String(username).trim());

    // Pesan sama untuk user tidak ada / password salah
    const valid = user && user.password_hash && (await bcrypt.compare(String(password), user.password_hash));
    if (!valid) return json(401, { error: 'Username atau password salah' });

    const payload = { username: user.username, nama: user.nama, role: user.role };
    const token = jwt.sign(payload, secret, { expiresIn: '8h' });

    return json(200, { token, user: payload });
  } catch (err) {
    return serverError(err);
  }
};
