/* Reservasi kunjungan (admin/reservasi.html, filter langsung: ?status=menunggu).
   Setujui / tolak, kirim konfirmasi lewat WhatsApp (wa.me dengan pesan terisi), hapus. */
(function () {
  if (!window.Admin) return;
  const { showAlert, icon, loadBadgeData, waNumber } = window.Admin;
  const { escapeHtml, formatDate } = window.Util;
  const R = window.Reservasi;
  const API = window.API;

  const LOKASI = 'RT 03 RW 07 Kel. Sukamaju'; // data contoh, samakan dengan reservasi.html
  const STATUS = {
    menunggu: ['badge-draft', 'menunggu'],
    disetujui: ['', 'disetujui'],
    ditolak: ['badge-danger', 'ditolak'],
  };

  const alertEl = document.getElementById('reservasi-alert');
  const tbody = document.querySelector('#reservasi-table tbody');
  const countEl = document.getElementById('reservasi-count');
  const searchInput = document.getElementById('filter-q');
  const statusFilter = document.getElementById('filter-status');
  const waktuFilter = document.getElementById('filter-waktu');

  let items = [];
  const initialStatus = new URLSearchParams(window.location.search).get('status');
  if (STATUS[initialStatus]) statusFilter.value = initialStatus;

  // Hari ini (WIB) untuk filter akan datang / sudah lewat
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const jadwalTeks = (r) => `${R.fmtTanggal(r.tanggal_kunjungan)} pukul ${R.fmtJam(r.jam_mulai)}–${R.fmtJam(r.jam_selesai)} WIB`;

  // Pesan WhatsApp sesuai status
  function waPesan(r) {
    const awal = `Halo ${r.nama_pic}, reservasi kunjungan ${r.organisasi} (kode ${r.kode}) pada ${jadwalTeks(r)}`;
    if (r.status === 'disetujui') {
      return `${awal} telah DISETUJUI. Sampai jumpa di ${LOKASI}. Terima kasih.`;
    }
    if (r.status === 'ditolak') {
      return `${awal} mohon maaf belum dapat kami terima. Silakan pilih jadwal lain di ${window.location.origin}/reservasi.html. Terima kasih.`;
    }
    return `${awal} sudah kami terima dan sedang menunggu persetujuan Ketua RT. Terima kasih.`;
  }

  function row(r) {
    const id = escapeHtml(r.id);
    const [cls, label] = STATUS[r.status] || ['badge-muted', r.status];
    const wa = waNumber(r.telepon);
    const statusActions =
      r.status === 'menunggu'
        ? `<button class="btn btn-sm" type="button" data-status="disetujui" data-id="${id}">${icon('check')}<span>Setujui</span></button>
           <button class="icon-btn icon-btn-danger" type="button" data-status="ditolak" data-id="${id}" title="Tolak" aria-label="Tolak reservasi ${escapeHtml(r.kode)}">${icon('x')}</button>`
        : r.status === 'disetujui'
          ? `<button class="icon-btn icon-btn-danger" type="button" data-status="ditolak" data-id="${id}" title="Batalkan (tolak)" aria-label="Batalkan reservasi ${escapeHtml(r.kode)}">${icon('x')}</button>`
          : `<button class="btn btn-sm btn-ghost" type="button" data-status="menunggu" data-id="${id}"><span>Pulihkan</span></button>`;
    return `
      <tr>
        <td class="nowrap">
          <strong>${escapeHtml(R.fmtTanggal(r.tanggal_kunjungan))}</strong>
          <div class="meta"><span>${escapeHtml(R.fmtJam(r.jam_mulai))}–${escapeHtml(R.fmtJam(r.jam_selesai))} WIB</span><span>${escapeHtml(r.durasi)} mnt</span></div>
          <div class="muted rsv-kode">${escapeHtml(r.kode)}</div>
        </td>
        <td>
          <strong>${escapeHtml(r.organisasi)}</strong>
          <div class="rsv-admin-detail">
            <span>PIC ${escapeHtml(r.nama_pic)} · ${escapeHtml(r.jumlah)} orang</span>
            <span>${escapeHtml(r.telepon)} · <a href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a></span>
            <span class="muted">${r.sumber_info ? `Tahu dari ${escapeHtml(r.sumber_info)} · ` : ''}Daftar ${escapeHtml(formatDate(r.tanggal))}${
              r.surat_id
                ? ` · <a href="https://drive.google.com/file/d/${encodeURIComponent(r.surat_id)}/view" target="_blank" rel="noopener">Lihat surat</a>`
                : ''
            }</span>
          </div>
        </td>
        <td><span class="badge ${cls}">${escapeHtml(label)}</span></td>
        <td class="actions">
          ${statusActions}
          ${
            wa
              ? `<a class="icon-btn" href="https://wa.me/${wa}?text=${encodeURIComponent(waPesan(r))}" target="_blank" rel="noopener" title="Kirim konfirmasi WhatsApp" aria-label="Kirim konfirmasi WhatsApp ke ${escapeHtml(r.nama_pic)}">${icon('whatsapp')}</a>`
              : ''
          }
          <button class="icon-btn icon-btn-danger" type="button" data-delete="${id}" title="Hapus" aria-label="Hapus reservasi ${escapeHtml(r.kode)}">${icon('trash')}</button>
        </td>
      </tr>`;
  }

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const waktu = waktuFilter.value;
    const rows = items
      .filter(
        (r) =>
          (!q || [r.kode, r.organisasi, r.nama_pic].some((v) => String(v || '').toLowerCase().includes(q))) &&
          (!statusFilter.value || r.status === statusFilter.value) &&
          (!waktu || (waktu === 'datang' ? r.tanggal_kunjungan >= today : r.tanggal_kunjungan < today))
      );
    // Sudah lewat: terbaru dulu
    if (waktu === 'lewat') rows.reverse();

    const menunggu = items.filter((r) => r.status === 'menunggu' && r.tanggal_kunjungan >= today).length;
    countEl.textContent = `${rows.length} dari ${items.length} reservasi${menunggu ? ` · ${menunggu} menunggu persetujuan` : ''}`;
    tbody.innerHTML = rows.length
      ? rows.map(row).join('')
      : `<tr><td colspan="4" class="empty">${items.length ? 'Tidak ada reservasi yang cocok dengan filter.' : 'Belum ada reservasi.'}</td></tr>`;
  }

  async function load(force) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Memuat...</td></tr>';
    try {
      items = await loadBadgeData('reservasi', force);
      render();
    } catch (err) {
      tbody.innerHTML = '';
      showAlert(alertEl, err.message);
    }
  }

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-status], [data-delete]');
    if (!btn) return;
    const r = items.find((x) => x.id === (btn.dataset.id || btn.dataset.delete));
    if (!r) return;

    if (btn.dataset.delete) {
      if (!window.confirm(`Hapus reservasi ${r.kode} (${r.organisasi})? Data tidak bisa dikembalikan.`)) return;
    } else if (btn.dataset.status === 'ditolak' && !window.confirm(`Tolak reservasi ${r.kode} (${r.organisasi})? Jamnya akan kosong lagi.`)) {
      return;
    }

    btn.disabled = true;
    try {
      if (btn.dataset.delete) {
        await API.del(`delete-reservasi?id=${encodeURIComponent(r.id)}`);
        showAlert(alertEl, `Reservasi ${r.kode} dihapus.`, 'success');
      } else {
        await API.put('update-reservasi', { id: r.id, status: btn.dataset.status });
        const pesan = {
          disetujui: `Reservasi ${r.kode} disetujui. Kirim konfirmasi ke PIC lewat tombol WhatsApp.`,
          ditolak: `Reservasi ${r.kode} ditolak. Kabari PIC lewat tombol WhatsApp.`,
          menunggu: `Reservasi ${r.kode} dipulihkan ke status menunggu.`,
        };
        showAlert(alertEl, pesan[btn.dataset.status], 'success');
      }
      await load(true);
    } catch (err) {
      showAlert(alertEl, err.message);
      btn.disabled = false;
    }
  });

  [searchInput, statusFilter, waktuFilter].forEach((el) => el.addEventListener('input', render));
  document.getElementById('reservasi-filter').addEventListener('submit', (e) => e.preventDefault());

  load(false);
})();
