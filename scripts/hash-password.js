// Pakai: node scripts/hash-password.js "passwordRahasia"
// Salin hasilnya ke kolom password_hash di sheet "users".
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Pakai: node scripts/hash-password.js "passwordAnda"');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 10));
