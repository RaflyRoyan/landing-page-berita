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

**Google auth.** `utils/google-auth.js` builds one OAuth2 client from a user refresh token and shares it across the Sheets and Drive clients. A module-level cache keeps them alive across warm invocations. The project deliberately uses **no service account**, because the user's Google org blocks service account key creation. Don't switch to a service account. It uses the per-API packages `@googleapis/sheets`, `@googleapis/drive` and `google-auth-library` instead of the full `googleapis` package, which took ~4 s to `require` in every function and made `netlify dev` slow. Don't add `googleapis` back.

**Sheets as a database.** `utils/sheets.js` is the data layer:
- It reads `<sheet>!A:Z`. Row 1 holds the headers, and rows map to objects keyed by header name. Each object gets `_row`, its 1-based sheet row number, which update and delete use. Strip `_row` before returning data to clients.
- Writes go through `toRow(headers, data)`, so column order follows the sheet's header row, not the object key order. Adding a field means adding a header column in the sheet.
- Rows are looked up by `id` (a UUID). Delete needs the numeric sheet `gid`, which it fetches from the spreadsheet metadata.
- Every operation re-reads the whole sheet. Nothing locks rows, so concurrent writes can race.
- `uniqueSlug` derives the slug from `judul`, appends `-2`, `-3`, ... on collision, and regenerates it whenever `judul` changes.

Sheet schemas (tab names and headers are lowercase and must match exactly):
- `berita`: `id, judul, slug, ringkasan, isi, foto_id, kategori, status, tanggal, penulis`. `status` is `draft` or `publish`. `id`, `slug`, `tanggal` and `penulis` are set by the server.
- `users`: `username, password_hash, nama, role`
- `pesan`: `id, nama, email, telepon, pesan, status, tanggal`. These are messages from the landing-page contact form (`main.js`), handled in `utils/pesan.js`.
  - `create-pesan` is public. It uses `utils/antispam.js`: `isBot(body)` checks the honeypot field `website` (a filled value gets a fake 201 and nothing is stored) and `checkRateLimit(sheet, email)` allows 3 submissions per email per 10 minutes (429).
  - list/update/delete are admin-only (`auth: { list: true }`), because messages hold personal data, and admins can change only `status` (`baru`/`dibaca`, via `editable`).
  - The admin page `admin/pesan.html` marks a message read when it is opened and offers mailto and wa.me reply links. `Admin.loadBadgeData('pesan')` shares one `get-pesan` request between the sidebar badge, the dashboard card and the page (badges are configured in `BADGES` in `admin-layout.js`; `Admin.setBadge(name, n)` updates one).
- `testimoni`: `id, nama, peran, kutipan, foto_id, email, sumber, status, urutan, tanggal`, handled in `utils/testimoni.js`.
  - Visitors post to the public `submit-testimoni` (no photo, same antispam). It always stores `sumber: pengunjung`, `status: menunggu` and the visitor's email.
  - Admin-written entries via `create-testimoni` get `sumber: admin` and default to `draft`. Approving means `update-testimoni` with `status: publish`; rejecting deletes the entry.
  - Only `publish` rows are public, and `toPublic` strips `email`/`sumber` for non-admins. Admins cannot edit `email`/`sumber` (they are not in `fields`).
  - Sorted by `urutan` (empty last), then newest. The landing page (`#testimoni`, `main.js`) shows up to 6 entries. Photos upload to the folder `testimoni`.
- `galeri`: `id, judul, keterangan, tanggal_kegiatan, foto_ids, sampul_id, status, tanggal`, handled in `utils/galeri.js`. One row is one activity album.
  - `foto_ids` is a comma-separated list of Drive file ids in display order (max 200). `prepare` dedupes it, requires at least 1 photo, validates `tanggal_kegiatan` (`YYYY-MM-DD`), and falls back to the first photo when `sampul_id` is not in the list. Photos have no per-photo caption (user's choice).
  - `toPublic` adds `sampul_url` (w800), `jumlah_foto` and `foto: [{ id, thumb_url (w400), url (w1600) }]`. `thumbnailUrl(id, size)` in `utils/drive.js` takes the width.
  - Only `publish` rows are public; sorted by `tanggal_kegiatan` desc. The landing page (`#galeri`, `main.js` `renderAlbumCard`) shows 6 albums; `galeri.html` lists all and `galeri.html?id=` shows one album with a vanilla lightbox (`galeri.js`: arrows, Esc, swipe, focus trap).
  - Admin: `admin/galeri.html` (list) and `admin/galeri-form.html` (multi-select, max 20 per pick; photos are compressed on pick and uploaded one by one to folder `galeri` on save, so a failed save only re-uploads the rest). Deleting an album or photo does not delete Drive files.
- `dokumen`: `id, nomor, judul, jenis, tanggal_dokumen, ringkasan, file_id, file_tipe, status, tanggal`, handled in `utils/dokumen.js` (Pojok Informasi).
  - `jenis` is a fixed list (`JENIS`: SK, Surat Edaran, Pengumuman, Laporan, Lainnya), duplicated in `admin-dokumen.js`; the user chose a fixed list over a master tab. `nomor` is optional but unique when filled (`checkUnique` skips empty values). `file_tipe` is `pdf`/`gambar`, set by the admin page from the uploaded MIME type.
  - `toPublic` adds `lihat_url` (Drive viewer for PDF, w1600 thumbnail for images) and `unduh_url` (`uc?export=download`). Only `publish` rows are public; sorted by `tanggal_dokumen` desc.
  - Admin: `admin/dokumen.html` (list + side form, like testimoni); files upload to folder `dokumen`. Public: landing `#informasi` shows 3 (`main.js` `renderDokumenItem`); `informasi.html` (`informasi.js`) pages 10 per page client-side with search/jenis filter kept in the URL (`?q=&jenis=&hal=`).
- `reservasi`: `id, kode, tanggal_kunjungan, jam_mulai, durasi, organisasi, nama_pic, jumlah, telepon, email, sumber_info, surat_id, status, tanggal`, handled in `utils/reservasi.js` (visit booking, "Belajar Bareng Kelola Lingkungan").
  - Rules live in `CONFIG` (Mon–Sat, 08:00–16:00, 30-minute start grid, durations 60/90/120, from tomorrow to +60 days, dates in WIB via `Asia/Jakarta`). There are no fixed sessions: visitors pick a start time and a duration. `menunggu` and `disetujui` rows block their time range (`cekBentrok`); `ditolak` frees it. `tanggal` is the creation timestamp (needed by `checkRateLimit`), the visit date is `tanggal_kunjungan`.
  - Public endpoints: `jadwal-reservasi` returns `CONFIG` plus booked ranges only (no names, phone, email; cache 15 s), `create-reservasi` validates, checks conflicts, uses the shared antispam, optionally uploads `surat` (base64, folder `reservasi`, PDF/JPG/PNG) only after all checks pass, and returns a `kode` like `RSV-7K2QF`; `cek-reservasi?kode=` returns status and schedule only.
  - Admin: `get-/update-/delete-reservasi` (`auth: { list: true }`, only `status` editable; re-activating a rejected booking re-checks conflicts). `admin/reservasi.html` approves/rejects and opens `wa.me` with a prefilled message (`Admin.waNumber`, shared with Pesan Masuk). Sidebar badge `reservasi` counts `menunggu`.
  - Frontend: `reservasi-kalender.js` (`window.Reservasi`: `load`, `startOptions`, `statusTanggal`, `renderCalendar`, `renderTimeline`) is shared by the landing section `#reservasi` (read-only calendar, links to `reservasi.html?tanggal=`), `reservasi.html` (`reservasi.js`, polls every 30 s and re-renders only when the schedule changes) and the admin page. Location is RW 03 Kel. Tambakrejo (also `LOKASI` in `admin-reservasi.js`); programme name and admin WhatsApp number are still **dummy**.
- `kategori`: `id, nama`. This is the category master, managed through `*-kategori` functions and the dashboard's "Master Kategori" panel. `berita.kategori` stores the category **name**, not its id, so public pages need no lookup. Shared rules live in `utils/kategori.js`:
  - names compare case-insensitively;
  - create/update-berita reject names not in the master and store the master's spelling, but update-berita skips the check when the kategori is unchanged, so legacy rows stay editable;
  - renaming a category rewrites matching berita rows via `updateRows`;
  - deleting a category still used by berita returns 409.

**Auth.** `login.js` checks a bcrypt hash from the `users` sheet and signs an 8h JWT with `{username, nama, role}`. Write endpoints call `verifyToken(event)` from `utils/auth-check.js`, which returns the payload or `null`. `role` is never checked. `get-berita` is public, but if a valid token is present it also returns drafts and sends `Cache-Control: private, no-store`. Public responses are `public, max-age=60`.

**Generic CRUD.** `utils/crud.js` holds the shared plumbing:
- `createHandler({ methods, auth, run })` handles the method check, JWT check and error catching.
- `defineResource({ sheet, label, fields, auth, editable, sort, publicFilter, toPublic, prepare, afterUpdate, beforeDelete })` builds `{ list, create, update, remove }` handlers with field validation (`required`, `max`, `type` incl. `email`, `options`, `normalize`, `unique`), auto `id`, `?id=` lookup, and the public/admin cache split. `toPublic(row, { isAdmin })` can add derived fields (e.g. `foto_url`) or hide private columns from the public. `auth` sets login per action (default: public list, admin-only writes). `editable` limits which fields update may change.
- Throw `httpError(status, message)` to return a 4xx with an Indonesian message. `serverError` logs only 5xx.
- New modules should use it. Each endpoint file is one line, e.g. `exports.handler = require('./utils/kategori').resource.list;`. The kategori module is the reference implementation (`utils/kategori.js`, with a rename cascade in `afterUpdate` and a delete guard in `beforeDelete`). Berita still has hand-written functions because of its slug/penulis/kategori logic.

**Uploads.** In the admin, `Admin.prepareUpload(file)` (in `admin-layout.js`) compresses images (max width 1600px, JPEG 0.8), reads other files (PDF) as-is, and rejects anything over 4 MB. `Admin.upload(prepared, folder)` POSTs base64 JSON to `upload-file`. `utils/upload.js` maps the `folder` to an env var and a MIME allowlist:
- `berita` → `DRIVE_FOLDER_ID`
- `galeri` / `banner` / `dokumen` / `testimoni` → `DRIVE_FOLDER_<NAME>_ID`
- only `dokumen` accepts PDF
- a missing env var returns 503

The 4 MB limit exists because Netlify caps request bodies at ~6 MB and base64 adds ~33%. `upload-foto` is the legacy endpoint (same as folder `berita`). `utils/drive.js` grants `anyone: reader` and returns `{ fileId, url (thumbnail), viewUrl (Drive viewer, for PDFs) }`. Rows store only the file id; `get-berita` adds `foto_url`.

**Function conventions.** Use the helpers in `utils/http.js`: `json(status, body, headers)`, `parseBody`, and `serverError`. `serverError` hides the message on a 500 but passes `err.statusCode` errors through. Error bodies are shaped `{ error: "..." }` and success bodies `{ data: ... }`.

**Frontend.** Every page loads `assets/js/api.js` first. It defines `window.API` (`get/post/put/del`, which prefix `/api/`) and `window.Util` (`escapeHtml`, `formatDate` in `id-ID`). Then come the page scripts:
- `main.js`: nav, footer, news cards and the landing page's latest 3 posts
- `berita.js`: the list/search page and `detail.html?slug=`
- `galeri.js`: `galeri.html` (album list, `?id=` album + lightbox)
- `informasi.js`: `informasi.html` (document list with paging)
- `kampung-pancasila.js`: the static landing section `#kampung-pancasila` (below Berita). Content lives in its `DATA` object, taken from the RW 03 Tambakrejo profile document: stat tiles, and 4 pillar cards (Lingkungan, Ekonomi, Kemasyarakatan, Sosial Budaya, the four pillars of Surabaya's Kampung Pancasila program) with focus areas and the 42 official indicators (codes PL-/PE-/PK-/PS-) in a `<details>`. Only the monthly chart series (`bulan`, `kegiatanPerBulan`, `sampahPerBulan`) are still **dummy**, labelled "Data contoh" above the charts. It also renders two hand-built SVG charts with hover tooltips and a table view. No API, no sheet.
- Landing static sections (`index.html`, hardcoded, from the same profile document): `#tentang` (history + "Sekilas" facts), `#visi-misi` (draft vision and 6 missions, badged "Rancangan" because they are not yet adopted) and `#program` (IPL CRT with its 4 filter stages, KRPL/hidroponik/bank sampah, children's activities, kelembagaan). Contact email and phone are still dummy.
- Landing look (`index.html`, `body.home`): photo backgrounds from `public/assets/img/latar/` (`*.webp` desktop, `*-m.webp` phone via `<picture>`; currently **dummy Unsplash photos**, credits in `KREDIT.md`; replace them under the same names). The hero is layered: `.photo-layer` (parallax) → `.hero-scrim` → copy and glass `.hero-card` → `.hero-frond` palm SVGs (`daun-kiri.svg`/`daun-kanan.svg`) that part sideways as the hero scrolls away. `.section-photo` (Reservasi, Kontak) and `.photo-band` (Kampung Pancasila header, stat cards overlap its bottom edge) reuse `.photo-layer`; text over photos goes in an `.on-dark` wrapper. `main.js` sets `--shift` on `[data-depth]` layers, `--hp` (hero progress 0–1) on `[data-hero]`, toggles `.is-solid` on the transparent header, and reveals `[data-reveal]`; all motion is skipped under `prefers-reduced-motion`.
- `admin-login.js`: the login page

The admin area is one HTML page per menu: `dashboard.html` (stats and recent news), `berita.html` (list), `berita-form.html` (add, or edit with `?id=`), `galeri.html` / `galeri-form.html` (same list + form pattern), `dokumen.html`, `testimoni.html`, `pesan.html`, and `kategori.html`.
- Each page has `<body class="admin-body" data-page data-title>` with an empty `<aside id="admin-sidebar">` and `<header id="admin-topbar">`.
- `admin-layout.js` loads before the page script. It redirects to login when the token is invalid; otherwise it renders the sidebar and topbar and exposes `window.Admin` (`icon`, `showAlert`, `setFlash`/`showFlash`, `beritaRow`).
- The menu lives in the `MENU` array in `admin-layout.js`. `<span data-icon="name">` is replaced with an inline SVG.
- Each page script (`admin-dashboard.js`, `admin-berita.js`, `admin-berita-form.js`, `admin-kategori.js`) starts with `if (!window.Admin) return;`.
- After a save, the form page stores a flash message in `sessionStorage` and redirects to the list page, which shows it.

The JWT is stored in `localStorage` (`admin_token`). `api.js` attaches it only on `/admin/` pages, and on a 401 it redirects to `/admin/login.html`. Pages render with `innerHTML` templates, so pass all sheet-sourced values through `escapeHtml`.

## Roadmap (planned, not started)

The working checklist and build order live in `TODO.md`. Tick items there as they are done.

The user picked these features from the reference site https://rt08rw04malakajaya.com/ (an RT community site built with Zyro). We will build them one at a time. Brainstorm and design each feature with the user before implementing it. The approach for every module: one Sheets tab, files in Drive if needed, a `get-*`/`create-*`/`update-*`/`delete-*` function set, and a new menu entry in `MENU` in `admin-layout.js`.

1. **Landing page content: static.** The user decided on 2026-10-23 to keep the hero, Tentang and contact info hardcoded in `public/index.html` and edit them in the file. Do not build a `pengaturan` tab or a "Pengaturan Situs" admin page unless they ask again.
2. **Galeri Kegiatan.** Done: albums per activity (see the `galeri` schema above). "Yang Baru" from the reference site was dropped; the latest berita and galeri sections cover it.
3. **Pojok Informasi.** Done: document archive with paging (see the `dokumen` schema above).
4. **Testimoni.** Done: visitor submissions need admin approval; admin-written entries use draft/publish (see the `testimoni` schema above).
5. **Form kontak.** Done: the landing-page form saves to the `pesan` tab, and admins read it in the "Pesan Masuk" inbox (see the `pesan` schema above).
**Postponed: Multi bahasa.** The user postponed multi-language support on 2026-10-22. Do not add `_en` columns, translation calls, or a language switcher until they bring it back. Notes from the earlier discussion (not final): Indonesian and English, all content machine-translated through the Claude API, admins write only Indonesian.

The user did **not** pick these parts of the reference site (out of scope unless asked): Program & CSR/mitra list, Data Pengelolaan Limbah (plant inventory, bank sampah, charts), and the Replikasi SAI leaderboard dashboard.
