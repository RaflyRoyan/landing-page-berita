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
│   ├── galeri.html         # album kegiatan; ?id= satu album + lightbox foto
│   ├── informasi.html      # pojok informasi: dokumen resmi, cari, filter jenis, 10 per halaman
│   ├── admin/login.html
│   ├── admin/dashboard.html     # ringkasan + berita terbaru
│   ├── admin/berita.html        # daftar berita (cari, filter, hapus)
│   ├── admin/berita-form.html   # tambah / edit (?id=) berita
│   ├── admin/galeri.html        # daftar album kegiatan
│   ├── admin/galeri-form.html   # tambah / edit (?id=) album, upload banyak foto
│   ├── admin/dokumen.html       # pojok informasi: arsip dokumen (PDF / gambar)
│   ├── admin/kategori.html      # master kategori
│   ├── admin/pesan.html         # pesan masuk dari form kontak
│   ├── admin/testimoni.html     # testimoni: setujui kiriman pengunjung, tulis sendiri (draft/publish)
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
│   ├── create-pesan.js     # POST   /api/create-pesan         (publik, form kontak)
│   ├── get-pesan.js        # GET    /api/get-pesan            (JWT)
│   ├── update-pesan.js     # PUT    /api/update-pesan         (JWT, hanya status)
│   ├── delete-pesan.js     # DELETE /api/delete-pesan?id=     (JWT)
│   ├── get-testimoni.js    # GET    /api/get-testimoni        (publik: hanya publish; admin: semua)
│   ├── submit-testimoni.js # POST   /api/submit-testimoni     (publik, masuk sebagai "menunggu")
│   ├── create-/update-/delete-testimoni.js                    (JWT)
│   ├── get-galeri.js       # GET    /api/get-galeri[?id=]     (publik: hanya publish; admin: semua)
│   ├── create-/update-/delete-galeri.js                       (JWT)
│   ├── get-dokumen.js      # GET    /api/get-dokumen[?id=]    (publik: hanya publish; admin: semua)
│   ├── create-/update-/delete-dokumen.js                      (JWT)
│   ├── upload-file.js      # POST   /api/upload-file          (JWT, maks 4MB, folder: berita/galeri/banner/dokumen)
│   ├── upload-foto.js      # POST   /api/upload-foto          (JWT, lama: sama dengan upload-file folder berita)
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

   Isi kategori dikelola dari admin (menu **Master → Kategori**), tidak perlu diisi manual.

   > Sudah memakai versi lama tanpa master kategori? Cukup tambahkan tab `kategori` ini, lalu buat kategori yang sudah dipakai berita lewat menu Master → Kategori.

5. Tambah tab baru bernama **`pesan`**, isi **baris 1** (kolom A sampai G):

   | id | nama | email | telepon | pesan | status | tanggal |
   |----|------|-------|---------|-------|--------|---------|

   Tab ini menampung pesan dari form kontak di halaman depan. Semua kolom diisi otomatis; `status` berisi `baru` atau `dibaca`.

6. Tambah tab baru bernama **`testimoni`**, isi **baris 1** (kolom A sampai J):

   | id | nama | peran | kutipan | foto_id | email | sumber | status | urutan | tanggal |
   |----|------|-------|---------|---------|-------|--------|--------|--------|---------|

   `status`: `menunggu` (kiriman pengunjung, belum disetujui), `draft`, atau `publish`. Hanya `publish` yang tampil di situs. `sumber`: `admin` atau `pengunjung`. `email` hanya diisi untuk kiriman pengunjung dan tidak pernah ditampilkan.

7. Tambah tab baru bernama **`galeri`**, isi **baris 1** (kolom A sampai H):

   | id | judul | keterangan | tanggal_kegiatan | foto_ids | sampul_id | status | tanggal |
   |----|-------|------------|------------------|----------|-----------|--------|---------|

   Satu baris = satu album kegiatan. `foto_ids` berisi id file Drive dipisah koma (urutan = urutan tampil), `sampul_id` salah satu di antaranya. `tanggal_kegiatan` berformat `YYYY-MM-DD`. Semua kolom diisi lewat admin.

8. Tambah tab baru bernama **`dokumen`**, isi **baris 1** (kolom A sampai J):

   | id | nomor | judul | jenis | tanggal_dokumen | ringkasan | file_id | file_tipe | status | tanggal |
   |----|-------|-------|-------|-----------------|-----------|---------|-----------|--------|---------|

   Arsip Pojok Informasi. `jenis`: `SK`, `Surat Edaran`, `Pengumuman`, `Laporan`, atau `Lainnya`. `nomor` opsional, tapi jika diisi tidak boleh kembar. `file_tipe`: `pdf` atau `gambar`. Semua kolom diisi lewat admin.

9. Ambil **SHEET_ID** dari URL spreadsheet, lalu simpan untuk bagian "6. Isi `.env`":
   `https://docs.google.com/spreadsheets/d/`**`SHEET_ID_DI_SINI`**`/edit`

Catatan:
- Nama tab dan header harus persis sama (huruf kecil semua).
- `status` berisi `draft` atau `publish`. Hanya `publish` yang tampil di website publik.
- `id`, `slug`, `tanggal`, dan `penulis` diisi otomatis oleh sistem.
- Kolom `kategori` di tab `berita` menyimpan **nama** kategori dari master. Mengganti nama kategori di admin ikut mengganti semua berita yang memakainya; kategori yang masih dipakai berita tidak bisa dihapus.
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
| `DRIVE_FOLDER_GALERI_ID`, `DRIVE_FOLDER_BANNER_ID`, `DRIVE_FOLDER_DOKUMEN_ID`, `DRIVE_FOLDER_TESTIMONI_ID` | Langkah 3 | Opsional. ID folder Drive `galeri`, `banner`, `dokumen`, dan `testimoni`; baru diperlukan saat modul yang memakainya aktif. Folder `dokumen` dan `testimoni` dibuat di samping `berita/`. Tanpa `DRIVE_FOLDER_TESTIMONI_ID`, testimoni tetap bisa dibuat, hanya tanpa foto. `DRIVE_FOLDER_GALERI_ID` wajib untuk menambah album galeri, `DRIVE_FOLDER_DOKUMEN_ID` wajib untuk menambah dokumen Pojok Informasi |

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

Login di <http://localhost:8888/admin/login.html>. Setelah login, admin punya sidebar dengan menu:

| Menu | Halaman | Isi |
|---|---|---|
| Dashboard | `/admin/dashboard.html` | Ringkasan (total, publish, draft, kategori), 5 berita terbaru, tombol **+ Tambah Berita** |
| Berita | `/admin/berita.html` | Semua berita: cari, filter status/kategori, edit, hapus |
| | `/admin/berita-form.html` | Tambah berita, atau edit dengan `?id=` |
| Galeri | `/admin/galeri.html` | Album kegiatan: cari, filter status, edit, hapus |
| | `/admin/galeri-form.html` | Tambah album, atau edit dengan `?id=`: pilih banyak foto sekaligus, geser urutan, pilih sampul (★), hapus foto dari album |
| Pojok Informasi | `/admin/dokumen.html` | Arsip dokumen resmi: nomor, judul, jenis, tanggal, ringkasan, file PDF / gambar, draft / publish. Cari dan filter jenis/status |
| Testimoni | `/admin/testimoni.html` | Badge jumlah yang menunggu persetujuan. Kiriman pengunjung: **Setujui** (tampil di situs) / **Tolak** (dihapus). Testimoni buatan admin: draft / publish, foto opsional, urutan tampil |
| Pesan Masuk | `/admin/pesan.html` | Pesan dari form kontak: badge jumlah pesan baru, buka (otomatis ditandai dibaca), balas via email / WhatsApp, tandai belum dibaca, hapus |
| Master → Kategori | `/admin/kategori.html` | Tambah, ganti nama, dan hapus kategori |

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
| `Unable to parse range: berita!A:Z` | Nama tab bukan `berita` / `users` / `kategori` / `pesan` / `testimoni` / `galeri` / `dokumen` persis. |
| `redirect_uri_mismatch` | Redirect URI di OAuth client belum `https://developers.google.com/oauthplayground`. |

## Catatan

- Form kontak dan form kirim testimoni punya anti-spam sederhana: kolom tersembunyi (*honeypot*) untuk bot, dan maksimal 3 kiriman per email dalam 10 menit. Pesan hanya bisa dibaca admin.
- Halaman depan menampilkan maksimal 6 testimoni ber-status publish (urut `urutan`, lalu terbaru). Pengunjung tidak bisa mengunggah foto; foto ditambahkan admin.
- Galeri: halaman depan menampilkan 6 album publish terbaru (urut tanggal kegiatan). Satu album maksimal 200 foto; admin bisa memilih maksimal 20 foto per kali pilih, lalu foto diunggah satu per satu saat disimpan. Menghapus album atau foto dari album **tidak** menghapus file di Google Drive.
- Pojok Informasi: halaman depan menampilkan 3 dokumen publish terbaru (urut tanggal dokumen); `informasi.html` menampilkan 10 dokumen per halaman, dan pencarian, filter jenis, serta halaman tersimpan di URL (`?q=&jenis=&hal=`). Tombol **Lihat** membuka penampil Google Drive, **Unduh** mengunduh file. Menghapus dokumen **tidak** menghapus file di Drive.
- Endpoint `get-berita` di-cache 60 detik (`Cache-Control: public, max-age=60`), jadi berita baru bisa butuh hingga 1 menit untuk muncul di halaman publik.
- Gambar dikompres di browser (lebar maks 1600px, JPEG kualitas 0.8) sebelum diunggah; server menolak file > 4 MB (batas body request Netlify ±6 MB, base64 menambah ±33%). Folder `dokumen` juga menerima PDF.
- Token login berlaku 8 jam. Setelah kedaluwarsa, admin otomatis diarahkan ke halaman login.
- Foto ditampilkan lewat `https://drive.google.com/thumbnail?id=FILE_ID&sz=w1200`.
- Refresh token setara password akun Google untuk Drive & Sheets. Simpan hanya di `.env` dan Environment variables Netlify.
