// Paket per-API (bukan "googleapis" penuh yang butuh ±4 detik untuk dimuat)
const { OAuth2Client } = require('google-auth-library');
const { sheets } = require('@googleapis/sheets');
const { drive } = require('@googleapis/drive');

let oauthClient = null;
let sheetsClient = null;
let driveClient = null;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} belum diisi`);
  return value;
}

// Satu OAuth2 client (refresh token akun Google pemilik spreadsheet & folder Drive)
// dipakai untuk Sheets dan Drive. Tidak memakai service account.
function getOAuthClient() {
  if (oauthClient) return oauthClient;

  oauthClient = new OAuth2Client(
    requireEnv('GOOGLE_OAUTH_CLIENT_ID'),
    requireEnv('GOOGLE_OAUTH_CLIENT_SECRET')
  );
  oauthClient.setCredentials({ refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN') });
  return oauthClient;
}

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  sheetsClient = sheets({ version: 'v4', auth: getOAuthClient() });
  return sheetsClient;
}

function getDriveClient() {
  if (driveClient) return driveClient;
  driveClient = drive({ version: 'v3', auth: getOAuthClient() });
  return driveClient;
}

module.exports = { getSheetsClient, getDriveClient };
