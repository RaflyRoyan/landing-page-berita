/* Halaman reservasi kunjungan (reservasi.html, bisa dibuka dengan ?tanggal=YYYY-MM-DD).
   1. pilih tanggal → 2. pilih durasi + jam mulai yang tidak bentrok → 3. isi data rombongan.
   Jadwal dimuat ulang tiap 30 detik. */
(function () {
  const R = window.Reservasi;
  const { escapeHtml } = window.Util;
  const REFRESH_MS = 30 * 1000;
  const MAX_SURAT = 4 * 1024 * 1024;

  const $ = (id) => document.getElementById(id);
  const calendarEl = $('rsv-calendar');
  const liveText = $('rsv-live-text');
  const alertEl = $('rsv-alert');
  const tanggalEl = $('rsv-tanggal');
  const jamBox = $('rsv-jam');
  const timelineEl = $('rsv-timeline');
  const slotsEl = $('rsv-slots');
  const pilihanText = $('rsv-pilihan-text');
  const form = $('rsv-form');
  const formAlert = $('rsv-form-alert');
  const submitBtn = $('rsv-submit');
  const sukses = $('rsv-sukses');

  let jadwal = null; // { config, terisi, byDate, diperbarui }
  let month = '';
  let tanggal = new URLSearchParams(window.location.search).get('tanggal') || '';
  let durasi = 60;
  let jam = '';
  let lastKey = '';

  function showAlert(el, message, type = 'error') {
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.hidden = false;
  }

  const bisaDipilih = (ymd) => ['kosong', 'sebagian'].includes(R.statusTanggal(jadwal.config, ymd, jadwal.byDate[ymd]));
  const jamSelesai = () => R.toJam(R.toMenit(jam) + durasi);

  function render() {
    const { config, byDate } = jadwal;
    R.renderCalendar(calendarEl, {
      config,
      byDate,
      month,
      selected: tanggal,
      onMonth: (ym) => {
        month = ym;
        render();
      },
      onSelect: (ymd) => {
        tanggal = ymd;
        jam = '';
        render();
        if (window.matchMedia('(max-width: 859px)').matches) tanggalEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });

    if (!tanggal) {
      tanggalEl.textContent = 'Pilih tanggal di kalender dulu.';
      jamBox.hidden = true;
      pilihanText.textContent = 'Belum ada';
      return;
    }

    const booked = byDate[tanggal] || [];
    tanggalEl.innerHTML = `<strong>${escapeHtml(R.fmtTanggal(tanggal))}</strong><span class="muted">${
      booked.length ? `${booked.length} reservasi di tanggal ini` : 'Belum ada reservasi'
    }</span>`;
    jamBox.hidden = false;
    R.renderTimeline(timelineEl, config, booked, jam ? { mulai: jam, selesai: jamSelesai() } : null);

    const options = R.startOptions(config, booked, durasi);
    slotsEl.innerHTML = options
      .map(
        (o) =>
          `<button type="button" class="rsv-slot${o.jam === jam ? ' is-selected' : ''}" data-jam="${o.jam}"${o.ok ? '' : ' disabled'} aria-pressed="${
            o.jam === jam
          }">${R.fmtJam(o.jam)}</button>`
      )
      .join('');
    if (!options.some((o) => o.ok)) {
      slotsEl.insertAdjacentHTML('beforeend', `<p class="muted rsv-small">Tidak ada jam kosong untuk durasi ${durasi} menit. Coba durasi lebih pendek atau tanggal lain.</p>`);
    }

    pilihanText.textContent = jam
      ? `${R.fmtTanggal(tanggal)} · ${R.fmtJam(jam)}–${R.fmtJam(jamSelesai())} WIB (${durasi} menit)`
      : `Pilih jam mulai untuk ${R.fmtTanggal(tanggal)}`;
  }

  async function refresh() {
    try {
      jadwal = await R.load();
      const { config } = jadwal;
      if (!month) month = (tanggal && tanggal >= config.mulai && tanggal <= config.akhir ? tanggal : config.mulai).slice(0, 7);
      if (tanggal && !bisaDipilih(tanggal)) {
        if (jam) showAlert(alertEl, `Tanggal ${R.fmtTanggal(tanggal)} sudah tidak tersedia. Silakan pilih tanggal lain.`);
        tanggal = '';
        jam = '';
      }
      // Jam pilihan baru saja diambil orang lain
      if (jam && !R.startOptions(config, jadwal.byDate[tanggal], durasi).some((o) => o.ok && o.jam === jam)) {
        showAlert(alertEl, `Jam ${R.fmtJam(jam)} baru saja terisi. Silakan pilih jam lain.`);
        jam = '';
      }
      $('rsv-periode').textContent = `Periode reservasi ${R.fmtTanggal(config.mulai, { hari: false })} – ${R.fmtTanggal(config.akhir, {
        hari: false,
      })}. Minggu libur.`;
      const waktu = new Date(jadwal.diperbarui).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
      liveText.textContent = `Jadwal langsung dari spreadsheet · diperbarui ${waktu} WIB, otomatis tiap 30 detik`;
      // Gambar ulang hanya jika jadwal berubah, agar fokus keyboard tidak hilang tiap 30 detik
      const key = JSON.stringify([jadwal.terisi, tanggal, jam]);
      if (key !== lastKey) render();
      lastKey = key;
    } catch {
      liveText.textContent = 'Gagal memuat jadwal. Mencoba lagi dalam 30 detik...';
      if (!jadwal) calendarEl.innerHTML = '<p class="empty">Jadwal belum bisa dimuat.</p>';
    }
  }

  slotsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-jam]');
    if (!btn || btn.disabled) return;
    jam = btn.dataset.jam;
    alertEl.hidden = true;
    render();
  });

  jamBox.addEventListener('change', (e) => {
    if (e.target.name !== 'durasi') return;
    durasi = Number(e.target.value);
    // Jam yang dipilih tetap dipakai jika masih muat dengan durasi baru
    if (jam && !R.startOptions(jadwal.config, jadwal.byDate[tanggal], durasi).some((o) => o.ok && o.jam === jam)) jam = '';
    render();
  });

  function bacaSurat(file) {
    return new Promise((resolve, reject) => {
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        reject(new Error('Surat harus berupa PDF, JPG, atau PNG'));
        return;
      }
      if (file.size > MAX_SURAT) {
        reject(new Error('Ukuran surat melebihi 4 MB'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ filename: file.name, mimeType: file.type, data: String(reader.result).split(',')[1] });
      reader.onerror = () => reject(new Error('File surat tidak bisa dibaca'));
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formAlert.hidden = true;
    if (!tanggal || !jam) {
      showAlert(formAlert, 'Pilih tanggal dan jam mulai dulu (langkah 1 dan 2).');
      return;
    }
    if (!form.reportValidity()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    try {
      const file = $('r-surat').files[0];
      const payload = {
        tanggal_kunjungan: tanggal,
        jam_mulai: jam,
        durasi,
        organisasi: form.organisasi.value.trim(),
        nama_pic: form.nama_pic.value.trim(),
        jumlah: form.jumlah.value,
        telepon: form.telepon.value.trim(),
        email: form.email.value.trim(),
        sumber_info: form.sumber_info.value,
        website: form.website.value,
      };
      if (file) payload.surat = await bacaSurat(file);

      const { data } = await window.API.post('create-reservasi', payload);
      $('rsv-sukses-kode').textContent = data.kode;
      $('rsv-sukses-jadwal').textContent = `${R.fmtTanggal(tanggal)} · ${R.fmtJam(jam)}–${R.fmtJam(jamSelesai())} WIB`;
      form.hidden = true;
      sukses.hidden = false;
      sukses.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.reset();
      jam = '';
      await refresh();
    } catch (err) {
      showAlert(formAlert, err.message);
      if (err.status === 409) {
        jam = '';
        await refresh();
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirim Reservasi';
    }
  });

  $('rsv-lagi').addEventListener('click', () => {
    sukses.hidden = true;
    form.hidden = false;
    tanggal = '';
    render();
    calendarEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ----- Cek status -----
  const STATUS = {
    menunggu: ['badge-draft', 'Menunggu persetujuan'],
    disetujui: ['', 'Disetujui'],
    ditolak: ['badge-danger', 'Ditolak'],
  };
  $('rsv-cek-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const hasil = $('rsv-cek-hasil');
    const kode = $('rsv-kode').value.trim().toUpperCase();
    if (!kode) return;
    hasil.innerHTML = '<p class="muted rsv-small">Mencari...</p>';
    try {
      const { data: r } = await window.API.get(`cek-reservasi?kode=${encodeURIComponent(kode)}`);
      const [cls, label] = STATUS[r.status] || ['badge-muted', r.status];
      hasil.innerHTML = `
        <dl class="rsv-cek-dl">
          <dt>Kode</dt><dd>${escapeHtml(r.kode)}</dd>
          <dt>Rombongan</dt><dd>${escapeHtml(r.organisasi)}</dd>
          <dt>Jadwal</dt><dd>${escapeHtml(R.fmtTanggal(r.tanggal_kunjungan))}, ${escapeHtml(R.fmtJam(r.jam_mulai))}–${escapeHtml(R.fmtJam(r.jam_selesai))} WIB</dd>
          <dt>Status</dt><dd><span class="badge ${cls}">${escapeHtml(label)}</span></dd>
        </dl>`;
    } catch (err) {
      hasil.innerHTML = `<p class="rsv-cek-error">${escapeHtml(err.message)}</p>`;
    }
  });

  refresh();
  setInterval(() => {
    if (!document.hidden) refresh();
  }, REFRESH_MS);
})();
