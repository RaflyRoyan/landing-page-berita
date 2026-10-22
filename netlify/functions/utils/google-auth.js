const { google } = require('googleapis');

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

  oauthClient = new google.auth.OAuth2(
    requireEnv('GOOGLE_OAUTH_CLIENT_ID'),
    requireEnv('GOOGLE_OAUTH_CLIENT_SECRET')
  );
  oauthClient.setCredentials({ refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN') });
  return oauthClient;
}

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  sheetsClient = google.sheets({ version: 'v4', auth: getOAuthClient() });
  return sheetsClient;
}

function getDriveClient() {
  if (driveClient) return driveClient;
  driveClient = google.drive({ version: 'v3', auth: getOAuthClient() });
  return driveClient;
}

module.exports = { getSheetsClient, getDriveClient };
