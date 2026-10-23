/* Daftar album galeri admin (admin/galeri.html): cari, filter, hapus. */
(function () {
  if (!window.Admin) return;
  const { showAlert, showFlash, icon } = window.Admin;
  const { escapeHtml, formatDate } = window.Util;
  const API = window.API;

  const alertEl = document.getElementById('list-alert');
  const tbody = document.querySelector('#galeri-table tbody');
  const searchInput = document.getElementById('filter-q');
  const statusSelect = document.getElementById('filter-status');
  const countEl = document.getElementById('galeri-count');

  let items = [];

  showFlash(alertEl);

  function row(g) {
    const editHref = `/admin/galeri-form.html?id=${encodeURIComponent(g.id)}`;
    return `
      <tr>
        <td class="hide-sm">${
          g.sampul_url
            ? `<img class="thumb" src="${escapeHtml(g.sampul_url)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
            : '<div class="thumb"></div>'
        }</td>
        <td>
          <a class="row-title" href="${editHref}">${escapeHtml(g.judul)}</a>
          <div class="meta">${escapeHtml(g.jumlah_foto)} foto</div>
        </td>
        <td><span class="badge ${g.status === 'publish' ? '' : 'badge-draft'}">${escapeHtml(g.status)}</span></td>
        <td class="nowrap hide-sm">${escapeHtml(formatDate(g.tanggal_kegiatan))}</td>
        <td class="actions">
          <a class="icon-btn" href="${editHref}" title="Edit" aria-label="Edit ${escapeHtml(g.judul)}">${icon('edit')}</a>
          <button class="icon-btn icon-btn-danger" type="button" data-delete="${escapeHtml(g.id)}" title="Hapus" aria-label="Hapus ${escapeHtml(g.judul)}">${icon('trash')}</button>
        </td>
      </tr>`;
  }

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const status = statusSelect.value;
    const rows = items.filter(
      (g) =>
        (!q || [g.judul, g.keterangan].some((v) => String(v || '').toLowerCase().includes(q))) &&
        (!status || g.status === status)
    );
    countEl.textContent = `${rows.length} dari ${items.length} album`;
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Belum ada album.</td></tr>';
    } else if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Tidak ada album yang cocok dengan filter.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(row).join('');
    }
  }

  async function load() {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Memuat...</td></tr>';
    try {
      const { data } = await API.get('get-galeri');
      items = data;
      render();
    } catch (err) {
      tbody.innerHTML = '';
      showAlert(alertEl, err.message);
    }
  }

  [searchInput, statusSelect].forEach((el) => el.addEventListener('input', render));
  document.getElementById('filter-form').addEventListener('submit', (e) => e.preventDefault());

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete]');
    if (!btn) return;
    const id = btn.getAttribute('data-delete');
    const g = items.find((x) => x.id === id);
    if (!g || !window.confirm(`Hapus album "${g.judul}"? Foto di Google Drive tidak ikut terhapus.`)) return;
    btn.disabled = true;
    try {
      await API.del(`delete-galeri?id=${encodeURIComponent(id)}`);
      showAlert(alertEl, 'Album dihapus.', 'success');
      await load();
    } catch (err) {
      showAlert(alertEl, err.message);
      btn.disabled = false;
    }
  });

  load();
})();
