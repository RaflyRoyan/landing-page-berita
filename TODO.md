# TODO — Pengembangan Fitur

Daftar kerja untuk fitur di roadmap `CLAUDE.md`, mengikuti situs referensi https://rt08rw04malakajaya.com/.
Kerjakan satu fitur per sesi: **desain dulu → setuju → kerjakan → uji → update README/CLAUDE.md → commit**.
Centang `[x]` jika selesai.

Pola tiap modul: satu tab Google Sheets, file di Drive (jika perlu), function `get-*` / `create-*` / `update-*` / `delete-*`, satu menu di `MENU` (`public/assets/js/admin-layout.js`), satu halaman admin, dan tampilan publik.

---

## 0. Persiapan

- [x] Commit & push perubahan README terakhir (tabel menu admin + catatan upgrade tab `kategori`)
- [x] Fondasi bersama (hindari copy-paste di tiap modul)
  - [x] Helper CRUD generik di `netlify/functions/utils/` untuk pola baca/tambah/ubah/hapus per tab
  - [x] Perluas upload: folder Drive per modul (`galeri/`, `banner/`, dokumen) dan dukungan PDF (untuk Pojok Informasi)

## 1. Form kontak

- [x] Desain: kolom form, anti-spam (honeypot / batas kirim), status pesan (baru / dibaca)
- [x] Tab Sheets `pesan` → **dibuat pemilik di spreadsheet** (header: id, nama, email, telepon, pesan, status, tanggal)
- [x] Function publik kirim pesan (tanpa JWT) + function admin baca / tandai dibaca / hapus
- [x] Form di seksi Kontak `public/index.html`
- [x] Admin: menu **Pesan Masuk** + jumlah pesan baru di dashboard (+ balas via email / WhatsApp)
- [x] Uji (handler + browser), update README & CLAUDE.md
- [x] Commit & push

## 2. Testimoni

- [x] Desain: kiriman pengunjung (menunggu → disetujui admin) + tulisan admin (draft / publish); kolom nama, peran, kutipan, foto opsional, urutan
- [x] Tab Sheets `testimoni` → **dibuat pemilik di spreadsheet** (header: id, nama, peran, kutipan, foto_id, email, sumber, status, urutan, tanggal)
- [x] (Opsional) folder Drive `testimoni/` + env `DRIVE_FOLDER_TESTIMONI_ID` agar admin bisa menambah foto
- [x] Function CRUD admin + `submit-testimoni` publik (anti-spam bersama di `utils/antispam.js`)
- [x] Admin: halaman Testimoni (setujui / tolak, edit, hapus) + badge menunggu persetujuan
- [x] Landing: seksi "Kata Mereka" (grid kartu, maks. 6) + form kirim testimoni
- [x] Uji (handler + browser), update README & CLAUDE.md
- [x] Commit & push

## 3. Galeri Kegiatan

- [x] Desain: album per kegiatan (judul, keterangan, tanggal kegiatan, sampul), tanpa keterangan per foto, upload banyak foto sekaligus; "Yang Baru" tidak dibuat terpisah
- [x] Tab Sheets `galeri` → **dibuat pemilik di spreadsheet** (header: id, judul, keterangan, tanggal_kegiatan, foto_ids, sampul_id, status, tanggal)
- [x] Env `DRIVE_FOLDER_GALERI_ID` (folder `galeri/` sudah ada) → **diisi pemilik** di `.env` & Netlify
- [x] Function CRUD `*-galeri`; foto ke folder Drive `galeri/`
- [x] Admin: halaman Galeri + form album (pilih banyak foto, kompres di browser, urutan, sampul)
- [x] Publik: seksi "Galeri kegiatan" di landing + halaman `galeri.html` dengan lightbox
- [x] Uji, update README & CLAUDE.md
- [x] Commit & push

## 4. Pojok Informasi

- [ ] Desain: kolom (nomor, judul, tanggal, jenis dokumen, file PDF/gambar, ringkasan)
- [ ] Tab Sheets + function CRUD; upload PDF ke Drive
- [ ] Admin: halaman Pojok Informasi
- [ ] Publik: halaman daftar dokumen dengan paging + tombol lihat/unduh
- [ ] Uji, update README & CLAUDE.md, commit

## 5. Konten landing page lewat admin

- [ ] Desain: tab Sheets `pengaturan` (key → value) untuk hero (judul, tagline, gambar), tentang (profil, visi, misi, fokus), kontak (telepon, email, alamat, jam, WhatsApp, sosmed)
- [ ] Function baca (publik, di-cache) + simpan (JWT)
- [ ] Admin: halaman **Pengaturan Situs** dengan tab Hero / Tentang / Kontak, upload gambar hero ke Drive `banner/`
- [ ] `public/index.html`: isi teks dari API, dengan teks bawaan sebagai cadangan jika API gagal
- [ ] Uji, update README & CLAUDE.md, commit

## Ditunda

- **Multi bahasa**: ditunda atas permintaan pemilik (22 Okt 2026). Jangan tambahkan kolom `_en` atau pemilih bahasa sampai fitur ini diaktifkan lagi. Catatan diskusi sebelumnya (belum final): Indonesia + Inggris, semua konten diterjemahkan otomatis lewat Claude API, admin hanya menulis bahasa Indonesia.
