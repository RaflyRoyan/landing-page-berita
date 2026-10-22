/* Daftar berita admin (admin/berita.html): cari, filter, hapus. */
(function () {
  if (!window.Admin) return;
  const { showAlert, showFlash, beritaRow } = window.Admin;
  const { escapeHtml } = window.Util;
  const API = window.API;

  const alertEl = document.getElementById('list-alert');
  const tbody = document.querySelector('#berita-table tbody');
  const searchInput = document.getElementById('filter-q');
  const statusSelect = document.getElementById('filter-status');
  const kategoriSelect = document.getElementById('filter-kategori');
  const countEl = document.getElementById('berita-count');

  let items = [];

  showFlash(alertEl);

  function filtered() {
    const q = searchInput.value.trim().toLowerCase();
    const status = statusSelect.value;
    const kategori = kategoriSelect.value;
    return items.filter(
      (b) =>
        (!q || [b.judul, b.ringkasan].some((v) => String(v || '').toLowerCase().includes(q))) &&
        (!status || b.status === status) &&
        (!kategori || (kategori === '__none' ? !b.kategori : b.kategori === kategori))
    );
  }

  function render() {
    const rows = filtered();
    countEl.textContent = `${rows.length} dari ${items.length} berita`;
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Belum ada berita.</td></tr>';
    } else if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Tidak ada berita yang cocok dengan filter.</td></tr>';
    } else {
      tbody.innerHTML = rows.map((b) => beritaRow(b, { withDelete: true })).join('');
    }
  }

  // Opsi filter kategori diambil dari kategori yang benar-benar dipakai berita
  function renderKategoriFilter() {
    const current = kategoriSelect.value;
    const names = [...new Set(items.map((b) => b.kategori).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'id')
    );
    kategoriSelect.innerHTML = [
      '<option value="">Semua kategori</option>',
      ...names.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`),
      '<option value="__none">Tanpa kategori</option>',
    ].join('');
    kategoriSelect.value = [...kategoriSelect.options].some((o) => o.value === current) ? current : '';
  }

  async function load() {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Memuat...</td></tr>';
    try {
      const { data } = await API.get('get-berita');
      items = data;
      renderKategoriFilter();
      render();
    } catch (err) {
      tbody.innerHTML = '';
      showAlert(alertEl, err.message);
    }
  }

  [searchInput, statusSelect, kategoriSelect].forEach((el) => el.addEventListener('input', render));
  document.getElementById('filter-form').addEventListener('submit', (e) => e.preventDefault());

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete]');
    if (!btn) return;
    const id = btn.getAttribute('data-delete');
    const b = items.find((x) => x.id === id);
    if (!b || !window.confirm(`Hapus berita "${b.judul}"?`)) return;
    btn.disabled = true;
    try {
      await API.del(`delete-berita?id=${encodeURIComponent(id)}`);
      showAlert(alertEl, 'Berita dihapus.', 'success');
      await load();
    } catch (err) {
      showAlert(alertEl, err.message);
      btn.disabled = false;
    }
  });

  load();
})();
