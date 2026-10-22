# Landing Page + Berita

Website landing page dengan modul berita. Dibangun dengan HTML/CSS/JS vanilla, di-hosting di **Netlify**, backend memakai **Netlify Functions** (Node.js), data disimpan di **Google Sheets**, dan foto di **Google Drive**.

Akses ke Google Sheets dan Google Drive memakai **satu OAuth refresh token** milik akun Google Anda. Project ini **tidak memakai service account**, sehingga tetap bisa dipakai walaupun organisasi Google Cloud memblokir pembuatan key service account (`iam.disableServiceAccountKeyCreation`).

## Struktur

```
landing-page-berita/
├── netlify.toml            # publish = public, functions = netlify/functions, /api/* → functions
├── package.json
├── .env.example
├── public/                 # file statis (frontend)
│   ├── index.html          # landing page
│   ├── berita.html         # daftar berita + pencarian
│   ├── detail.html         # detail berita (?slug=)
│   ├── admin/login.html
│   ├── admin/dashboard.html     # ringkasan + berita terbaru
│   ├── admin/berita.html        # daftar berita (cari, filter, hapus)
│   ├── admin/berita-form.html   # tambah / edit (?id=) berita
│   ├── admin/kategori.html      # master kategori
│   └── assets/{css,js,img}
├── netlify/functions/      # backend
│   ├── get-berita.js       # GET    /api/get-berita[?id=|?slug=]
│   ├── create-berita.js    # POST   /api/create-berita        (JWT)
│   ├── update-berita.js    # PUT    /api/update-berita        (JWT)
│   ├── delete-berita.js    # DELETE /api/delete-berita?id=    (JWT)
│   ├── get-kategori.js     # GET    /api/get-kategori
│   ├── create-kategori.js  # POST   /api/create-kategori      (JWT)
│   ├── update-kategori.js  # PUT    /api/update-kategori      (JWT)
│   ├── delete-kategori.js  # DELETE /api/delete-kategori?id=  (JWT)
│   ├── upload-foto.js      # POST   /api/upload-foto          (JWT, maks 5MB)
│   ├── login.js            # POST   /api/login
│   └── utils/
└── scripts/hash-password.js
```

---

## Langkah Setup

> Pakai **satu akun Google yang sama** untuk semua langkah: pemilik spreadsheet, pemilik folder Drive, dan akun yang login di OAuth Playground.

### 1. Buat Google Cloud project, aktifkan Sheets API & Drive API

1. Buka <https://console.cloud.google.com/> → **Select project → New Project**, beri nama, lalu **Create**.
2. Pastikan project baru sudah terpilih di bagian atas halaman.
3. Masuk ke **APIs & Services → Library**.
4. Cari **Google Sheets API** → klik **Enable**.
5. Kembali ke Library, cari **Google Drive API** → klik **Enable**.

### 2. Buat spreadsheet

1. Buka <https://sheets.google.com> → buat spreadsheet kosong (mis. `Website-LandingPage-Data`).
2. Ganti nama tab pertama menjadi **`berita`**, lalu isi **baris 1** dengan header berikut (satu per kolom, A sampai J):

   | id | judul | slug | ringkasan | isi | foto_id | kategori | status | tanggal | penulis |
   |----|-------|------|-----------|-----|---------|----------|--------|---------|---------|

3. Tambah tab baru bernama **`users`**, isi **baris 1** (kolom A sampai D):

   | username | password_hash | nama | role |
   |----------|---------------|------|------|

4. Tambah tab baru bernama **`kategori`**, isi **baris 1** (kolom A sampai B):

   | id | nama |
   |----|------|

   Isi kategori dikelola dari dashboard admin (panel **Master Kategori**), tidak perlu diisi manual.

5. Ambil **SHEET_ID** dari URL spreadsheet, lalu simpan untuk langkah 6:
   `https://docs.google.com/spreadsheets/d/`**`SHEET_ID_DI_SINI`**`/edit`

Catatan:
- Nama tab dan header harus persis sama (huruf kecil semua).
- `status` berisi `draft` atau `publish`. Hanya `publish` yang tampil di website publik.
- `id`, `slug`, `tanggal`, dan `penulis` diisi otomatis oleh sistem.
- Kolom `kategori` di tab `berita` menyimpan **nama** kategori dari master. Mengganti nama kategori di dashboard ikut mengganti semua berita yang memakainya; kategori yang masih dipakai berita tidak bisa dihapus.
- Berita lama yang kategorinya belum ada di master tetap bisa diedit. Kategorinya muncul dengan tanda "(tidak ada di master)" sampai diganti, atau sampai kategori dengan nama yang sama ditambahkan ke master.
- Spreadsheet **tidak perlu di-share** ke siapa pun.

### 3. Buat folder Google Drive

1. Buka <https://drive.google.com>, buat struktur folder:

   ```
   Website-LandingPage/
   ├── berita/
   ├── galeri/
   └── banner/
   ```

2. Buka folder **berita**, ambil ID dari URL, lalu simpan untuk langkah 6:
   `https://drive.google.com/drive/folders/`**`FOLDER_ID_DI_SINI`**

Foto berita akan diunggah ke folder ini dan otomatis diberi izin *Anyone with the link – Viewer* agar bisa tampil di website. Folder `galeri` dan `banner` disiapkan untuk pengembangan berikutnya.

### 4. Atur OAuth consent screen dan buat OAuth Client ID

1. Di Google Cloud Console: **APIs & Services → OAuth consent screen** (di tampilan baru: **Google Auth Platform → Branding / Audience**).
2. Klik **Get started** / **Configure consent screen**, isi:
   - **App name**: bebas, mis. `Website Berita`
   - **User support email**: email Anda
   - **Audience / User type**:
     - Project di bawah organisasi (Google Workspace, ada nama organisasi di pojok kiri atas) → pilih **Internal**. Refresh token tidak kedaluwarsa dan tidak perlu test users.
     - Akun Gmail biasa (tanpa organisasi) → pilih **External**. Setelah itu, di **Audience**, tambahkan email Anda ke **Test users**, lalu klik **Publish app** agar status menjadi **In production**. Tanpa ini refresh token kedaluwarsa setelah 7 hari. Untuk pemakaian pribadi tidak perlu verifikasi Google; abaikan peringatan "unverified app".
   - **Contact information**: email Anda → **Create**.
3. Buka **APIs & Services → Credentials → Create Credentials → OAuth client ID** (atau **Google Auth Platform → Clients → Create client**):
   - Application type: **Web application**
   - Name: bebas, mis. `website-berita`
   - **Authorized redirect URIs** → **Add URI**: `https://developers.google.com/oauthplayground`
   - Klik **Create**.
4. Salin **Client ID** dan **Client secret**, simpan untuk langkah 5 dan 6.

### 5. Dapatkan refresh token via OAuth 2.0 Playground

1. Buka <https://developers.google.com/oauthplayground>.
2. Klik ikon ⚙️ (**OAuth 2.0 configuration**, kanan atas):
   - Centang **Use your own OAuth credentials**.
   - Isi **OAuth Client ID** dan **OAuth Client secret** dari langkah 4.
   - Tutup panel.
3. Di panel kiri (**Step 1**), pada kolom *Input your own scopes* di bagian bawah, tempel dua scope berikut (pisahkan dengan spasi):

   ```
   https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets
   ```

4. Klik **Authorize APIs**. Login dengan akun Google pemilik spreadsheet & folder Drive, lalu klik **Allow** / **Continue**. Jika muncul "Google hasn't verified this app", klik **Advanced → Go to ... (unsafe)**.
5. Kembali ke Playground (**Step 2**), klik **Exchange authorization code for tokens**.
6. Salin nilai **Refresh token** (diawali `1//...`), simpan untuk langkah 6.

> Jika refresh token tidak muncul, buka <https://myaccount.google.com/permissions>, hapus akses aplikasi Anda, lalu ulangi langkah 4–5.
>
> Kedua scope wajib. Tanpa `spreadsheets`, akses ke Sheets gagal dengan error 403; tanpa `drive`, upload foto gagal.

### 6. Isi `.env`, install, dan jalankan

```bash
cp .env.example .env      # Windows: copy .env.example .env
```

Isi semua variabel di `.env`:

| Variabel | Dari | Keterangan |
|---|---|---|
| `SHEET_ID` | Langkah 2 | ID spreadsheet |
| `DRIVE_FOLDER_ID` | Langkah 3 | ID folder Drive `berita` |
| `GOOGLE_OAUTH_CLIENT_ID` | Langkah 4 | OAuth Client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Langkah 4 | OAuth Client secret |
| `GOOGLE_REFRESH_TOKEN` | Langkah 5 | Refresh token dari OAuth Playground |
| `JWT_SECRET` | Buat sendiri | String acak panjang, lihat perintah di bawah |

Buat `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Lalu:

```bash
npm install
npm run dev
```

Website berjalan di <http://localhost:8888> (Netlify Dev otomatis membaca `.env` dan menjalankan functions).

### 7. Buat user admin pertama

Buat hash bcrypt dari password:

```bash
node scripts/hash-password.js "PasswordRahasiaAnda"
```

Output berupa string seperti `$2b$10$....`. Tambahkan baris 2 di sheet `users`:

| username | password_hash | nama | role |
|----------|---------------|------|------|
| admin | `$2b$10$....` | Administrator | admin |

Login di <http://localhost:8888/admin/login.html>.

### 8. Deploy ke Netlify

1. Push project ke GitHub/GitLab (file `.env` sudah di-ignore, **jangan** di-commit).
2. Di <https://app.netlify.com> → **Add new site → Import an existing project**, pilih repo.
   Build command: kosongkan. Publish directory: `public` (sudah diatur di `netlify.toml`).
3. **Site configuration → Environment variables** → tambahkan semua variabel dari `.env`.
4. **Deploys → Trigger deploy** agar environment variables terbaca.

Alternatif via CLI:

```bash
npx netlify login
npx netlify init
npx netlify deploy --prod
```

---

## Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `invalid_grant` | Refresh token kedaluwarsa atau dicabut. Consent screen External masih **Testing** (berlaku 7 hari) → publish ke **In production**, lalu ulangi langkah 5. |
| `403 insufficient authentication scopes` / `Request had insufficient authentication scopes` | Refresh token dibuat tanpa scope `spreadsheets` atau `drive`. Ulangi langkah 5 dengan kedua scope. |
| `403 The caller does not have permission` di Sheets | Spreadsheet bukan milik akun yang login di Playground. Pakai akun yang sama, atau share spreadsheet ke akun itu sebagai Editor. |
| `404 File not found` saat upload | `DRIVE_FOLDER_ID` salah atau folder bukan milik akun yang sama. |
| `Unable to parse range: berita!A:Z` | Nama tab bukan `berita` / `users` / `kategori` persis. |
| `redirect_uri_mismatch` | Redirect URI di OAuth client belum `https://developers.google.com/oauthplayground`. |

## Catatan

- Endpoint `get-berita` di-cache 60 detik (`Cache-Control: public, max-age=60`), jadi berita baru bisa butuh hingga 1 menit untuk muncul di halaman publik.
- Gambar dikompres di browser (lebar maks 1600px, JPEG kualitas 0.8) sebelum diunggah; server menolak file > 5MB.
- Token login berlaku 8 jam. Setelah kedaluwarsa, admin otomatis diarahkan ke halaman login.
- Foto ditampilkan lewat `https://drive.google.com/thumbnail?id=FILE_ID&sz=w1200`.
- Refresh token setara password akun Google untuk Drive & Sheets. Simpan hanya di `.env` dan Environment variables Netlify.
