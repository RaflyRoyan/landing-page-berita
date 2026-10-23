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

- [x] Desain: kolom nomor (opsional, unik), judul, jenis (daftar tetap), tanggal dokumen, ringkasan, file PDF/gambar, draft/publish; paging 10; seksi 3 dokumen terbaru di landing
- [x] Tab Sheets `dokumen` → **dibuat pemilik di spreadsheet** (header: id, nomor, judul, jenis, tanggal_dokumen, ringkasan, file_id, file_tipe, status, tanggal)
- [x] Env `DRIVE_FOLDER_DOKUMEN_ID` (folder `dokumen/`) → **diisi pemilik** di `.env` & Netlify
- [x] Function CRUD `*-dokumen`; upload PDF / gambar ke folder Drive `dokumen/`
- [x] Admin: halaman Pojok Informasi
- [x] Publik: halaman `informasi.html` (cari, filter jenis, paging 10, tombol lihat/unduh) + seksi "Pojok informasi" di landing
- [x] Uji, update README & CLAUDE.md
- [x] Commit & push

## 5. Konten landing page

- [x] Diputuskan pemilik (23 Okt 2026): konten hero, tentang, dan kontak tetap **statis** di `public/index.html` (diedit langsung di file), tidak dikelola lewat admin

## 6. Seksi Kampung Pancasila

- [x] Seksi statis di bawah Berita: ringkasan program, angka ringkas, kartu 4 pilar, diagram kegiatan per bulan & sampah terpilah
- [ ] Ganti nama RW dan data contoh dengan data asli (`DATA` di `public/assets/js/kampung-pancasila.js`), lalu hapus label "Data contoh"

## 7. Reservasi kunjungan (Belajar Bareng Kelola Lingkungan)

- [x] Desain: tanpa sesi tetap; pilih tanggal, jam mulai (tiap 30 menit) + durasi 60/90/120, tidak boleh bentrok; Senin–Sabtu 08.00–16.00; halaman `reservasi.html` + kalender di landing
- [x] Function `jadwal-`/`create-`/`cek-reservasi` (publik) + `get-`/`update-`/`delete-reservasi` (admin)
- [x] Halaman publik `reservasi.html`, seksi kalender di landing, halaman admin Reservasi + konfirmasi WhatsApp
- [ ] Tab Sheets `reservasi` → **dibuat pemilik di spreadsheet** (header: id, kode, tanggal_kunjungan, jam_mulai, durasi, organisasi, nama_pic, jumlah, telepon, email, sumber_info, surat_id, status, tanggal)
- [ ] (Opsional) folder Drive `reservasi/` + env `DRIVE_FOLDER_RESERVASI_ID` untuk surat permohonan
- [ ] Ganti data contoh: nama program, RT/RW/kelurahan, nomor WhatsApp admin (`reservasi.html`, seksi `#reservasi` di `index.html`, `LOKASI` di `admin-reservasi.js`)

## Ditunda

- **Multi bahasa**: ditunda atas permintaan pemilik (22 Okt 2026). Jangan tambahkan kolom `_en` atau pemilih bahasa sampai fitur ini diaktifkan lagi. Catatan diskusi sebelumnya (belum final): Indonesia + Inggris, semua konten diterjemahkan otomatis lewat Claude API, admin hanya menulis bahasa Indonesia.
