# TODO — Pengembangan Fitur

Daftar kerja untuk fitur di roadmap `CLAUDE.md`, mengikuti situs referensi https://rt08rw04malakajaya.com/.
Kerjakan satu fitur per sesi: **desain dulu → setuju → kerjakan → uji → update README/CLAUDE.md → commit**.
Centang `[x]` jika selesai.

Pola tiap modul: satu tab Google Sheets, file di Drive (jika perlu), function `get-*` / `create-*` / `update-*` / `delete-*`, satu menu di `MENU` (`public/assets/js/admin-layout.js`), satu halaman admin, dan tampilan publik.

---

## 0. Persiapan

- [x] Commit & push perubahan README terakhir (tabel menu admin + catatan upgrade tab `kategori`)
- [ ] **Putuskan cakupan multi bahasa** sebelum membuat tab Sheets baru
  - Bahasa apa saja? (ID, EN, AR, ZH seperti referensi, atau lebih sedikit)
  - Hanya tampilan (menu, label, judul seksi) yang diterjemahkan, atau isi juga (berita, galeri, testimoni)?
  - Jika isi ikut diterjemahkan, tiap tab butuh kolom per bahasa (mis. `judul_en`), jadi harus diputuskan sebelum langkah 2 dst.
- [ ] Fondasi bersama (hindari copy-paste di tiap modul)
  - [ ] Helper CRUD generik di `netlify/functions/utils/` untuk pola baca/tambah/ubah/hapus per tab
  - [ ] Perluas upload: folder Drive per modul (`galeri/`, `banner/`, dokumen) dan dukungan PDF (untuk Pojok Informasi)

## 1. Form kontak

- [ ] Desain: kolom form, anti-spam (honeypot / batas kirim), status pesan (baru / dibaca)
- [ ] Tab Sheets `pesan`
- [ ] Function publik kirim pesan (tanpa JWT) + function admin baca / tandai dibaca / hapus
- [ ] Form di seksi Kontak `public/index.html` (saat ini belum ada form)
- [ ] Admin: menu **Pesan Masuk** + jumlah pesan baru di dashboard
- [ ] Uji, update README & CLAUDE.md, commit

## 2. Testimoni

- [ ] Desain: kolom (nama, peran/afiliasi, kutipan, foto opsional, urutan, tampil/sembunyi)
- [ ] Tab Sheets `testimoni` + function CRUD
- [ ] Admin: halaman Testimoni
- [ ] Landing: seksi "Kata Mereka" (slider / grid)
- [ ] Uji, update README & CLAUDE.md, commit

## 3. Galeri Kegiatan

- [ ] Desain: album vs foto lepas, keterangan, tanggal kegiatan, foto sampul, upload banyak foto sekaligus
- [ ] Tab Sheets galeri + function CRUD; foto ke folder Drive `galeri/`
- [ ] Admin: halaman Galeri (upload banyak + kompres di browser seperti berita)
- [ ] Publik: seksi "Yang Baru" di landing + halaman `galeri.html` dengan lightbox
- [ ] Uji, update README & CLAUDE.md, commit

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

## 6. Multi bahasa

- [ ] Desain sesuai keputusan di langkah 0 (cara pilih bahasa: `?lang=` / folder `/en/`, simpan pilihan)
- [ ] File terjemahan UI (label, menu, judul seksi)
- [ ] Pemilih bahasa di header situs publik
- [ ] Jika isi ikut diterjemahkan: kolom per bahasa di form admin semua modul
- [ ] Jika ada bahasa Arab: dukungan tampilan kanan-ke-kiri (`dir="rtl"`)
- [ ] Uji, update README & CLAUDE.md, commit
