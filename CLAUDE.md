# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A landing page plus news ("berita") module. The frontend is vanilla HTML/CSS/JS in `public/`, with no framework and no build step. The backend is Netlify Functions (Node >= 20, CommonJS) in `netlify/functions/`. Data lives in Google Sheets and photos in Google Drive. UI text, error messages and comments are in Indonesian; keep new ones in Indonesian too.

The parent folder's `D:\code\CLAUDE.md` describes an unrelated scratch folder of tax-app snippets. It does not apply here.

## Commands

```bash
npm install
npm run dev                                   # netlify dev → http://localhost:8888, reads .env, runs functions
node scripts/hash-password.js "<password>"    # bcrypt hash for a row in the `users` sheet
npx netlify deploy --prod                     # deploy (no build command; publish dir = public)
```

There are no tests, linter or build. To verify a change, run `npm run dev` and call the endpoints at `/api/<function-name>`. A working `.env` is needed (see `.env.example`): `SHEET_ID`, `DRIVE_FOLDER_ID`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `JWT_SECRET`. The README has the full Google Cloud and OAuth setup, plus a troubleshooting table for Google API errors.

## Architecture

**Routing.** `netlify.toml` redirects `/api/*` to `/.netlify/functions/:splat`, so each file in `netlify/functions/` is one endpoint named after the file (for example `get-berita.js` is served at `/api/get-berita`). Each function exports `handler` and checks `event.httpMethod` itself, returning `methodNotAllowed` on a mismatch.

**Google auth.** `utils/google-auth.js` builds one OAuth2 client from a user refresh token and shares it across the Sheets and Drive clients. A module-level cache keeps them alive across warm invocations. The project deliberately uses **no service account**, because the user's Google org blocks service account key creation. Don't switch to a service account.

**Sheets as a database.** `utils/sheets.js` is the data layer:
- It reads `<sheet>!A:Z`. Row 1 holds the headers, and rows map to objects keyed by header name. Each object gets `_row`, its 1-based sheet row number, which update and delete use. Strip `_row` before returning data to clients.
- Writes go through `toRow(headers, data)`, so column order follows the sheet's header row, not the object key order. Adding a field means adding a header column in the sheet.
- Rows are looked up by `id` (a UUID). Delete needs the numeric sheet `gid`, which it fetches from the spreadsheet metadata.
- Every operation re-reads the whole sheet. Nothing locks rows, so concurrent writes can race.
- `uniqueSlug` derives the slug from `judul`, appends `-2`, `-3`, ... on collision, and regenerates it whenever `judul` changes.

Sheet schemas (tab names and headers are lowercase and must match exactly):
- `berita`: `id, judul, slug, ringkasan, isi, foto_id, kategori, status, tanggal, penulis`. `status` is `draft` or `publish`. `id`, `slug`, `tanggal` and `penulis` are set by the server.
- `users`: `username, password_hash, nama, role`
- `kategori`: `id, nama`. This is the category master, managed through `*-kategori` functions and the dashboard's "Master Kategori" panel. `berita.kategori` stores the category **name**, not its id, so public pages need no lookup. Shared rules live in `utils/kategori.js`:
  - names compare case-insensitively;
  - create/update-berita reject names not in the master and store the master's spelling, but update-berita skips the check when the kategori is unchanged, so legacy rows stay editable;
  - renaming a category rewrites matching berita rows via `updateRows`;
  - deleting a category still used by berita returns 409.

**Auth.** `login.js` checks a bcrypt hash from the `users` sheet and signs an 8h JWT with `{username, nama, role}`. Write endpoints call `verifyToken(event)` from `utils/auth-check.js`, which returns the payload or `null`. `role` is never checked. `get-berita` is public, but if a valid token is present it also returns drafts and sends `Cache-Control: private, no-store`. Public responses are `public, max-age=60`.

**Photos.** The browser compresses images (max width 1600px, JPEG quality 0.8) in `admin-berita-form.js`, then POSTs them as base64 JSON to `upload-foto`. The server enforces a 5MB limit and an image MIME allowlist. `utils/drive.js` uploads the file to `DRIVE_FOLDER_ID` and grants `anyone: reader` on it. Rows store only `foto_id`; `get-berita` adds `foto_url` (`drive.google.com/thumbnail?id=...&sz=w1200`).

**Function conventions.** Use the helpers in `utils/http.js`: `json(status, body, headers)`, `parseBody`, and `serverError`. `serverError` hides the message on a 500 but passes `err.statusCode` errors through. Error bodies are shaped `{ error: "..." }` and success bodies `{ data: ... }`.

**Frontend.** Every page loads `assets/js/api.js` first. It defines `window.API` (`get/post/put/del`, which prefix `/api/`) and `window.Util` (`escapeHtml`, `formatDate` in `id-ID`). Then come the page scripts:
- `main.js`: nav, footer, news cards and the landing page's latest 3 posts
- `berita.js`: the list/search page and `detail.html?slug=`
- `admin-login.js`: the login page

The admin area is one HTML page per menu: `dashboard.html` (stats and recent news), `berita.html` (list), `berita-form.html` (add, or edit with `?id=`), and `kategori.html`.
- Each page has `<body class="admin-body" data-page data-title>` with an empty `<aside id="admin-sidebar">` and `<header id="admin-topbar">`.
- `admin-layout.js` loads before the page script. It redirects to login when the token is invalid; otherwise it renders the sidebar and topbar and exposes `window.Admin` (`icon`, `showAlert`, `setFlash`/`showFlash`, `beritaRow`).
- The menu lives in the `MENU` array in `admin-layout.js`. `<span data-icon="name">` is replaced with an inline SVG.
- Each page script (`admin-dashboard.js`, `admin-berita.js`, `admin-berita-form.js`, `admin-kategori.js`) starts with `if (!window.Admin) return;`.
- After a save, the form page stores a flash message in `sessionStorage` and redirects to the list page, which shows it.

The JWT is stored in `localStorage` (`admin_token`). `api.js` attaches it only on `/admin/` pages, and on a 401 it redirects to `/admin/login.html`. Pages render with `innerHTML` templates, so pass all sheet-sourced values through `escapeHtml`.

## Roadmap (planned, not started)

The user picked these features from the reference site https://rt08rw04malakajaya.com/ (an RT community site built with Zyro). We will build them one at a time. Brainstorm and design each feature with the user before implementing it. The approach for every module: one Sheets tab, files in Drive if needed, a `get-*`/`create-*`/`update-*`/`delete-*` function set, and a new menu entry in `MENU` in `admin-layout.js`.

1. **Landing page content managed from admin.** The hero (title, tagline, image), Tentang/profil (including visi, misi and fokus), and the contact info (phone, email, alamat, jam operasional, WhatsApp, social links) are currently hardcoded in `public/index.html`. Admins should be able to edit them.
2. **Galeri Kegiatan.** Activity photo albums: upload to the Drive folder `galeri/`, which already exists. Show them on the landing page ("Yang Baru" and "Galeri Kegiatan") and on a gallery page.
3. **Pojok Informasi.** An archive of official documents such as RT decrees (e.g. "SK No. 29/SK-RT/V/08/04/2026"): number, title, date, and a PDF or image file in Drive. Show a public list with paging.
4. **Testimoni.** A "Kata Mereka Tentang RT08" section: name, role or affiliation, quote, optional photo. Admins manage the entries.
5. **Form kontak.** The landing page form (nama, email, telepon, pesan) should save to Sheets, with an inbox page in admin. Today the form submits nowhere.
6. **Multi bahasa.** The reference site offers Indonesian, English, Arabic and Chinese. Which languages to support, and whether content (berita etc.) gets translated or only the UI, is still undecided.

The user did **not** pick these parts of the reference site (out of scope unless asked): Program & CSR/mitra list, Data Pengelolaan Limbah (plant inventory, bank sampah, charts), and the Replikasi SAI leaderboard dashboard.
