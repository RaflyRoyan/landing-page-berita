/* Dashboard admin (admin/dashboard.html): ringkasan + berita terbaru. */
(function () {
  if (!window.Admin) return;
  const { showAlert, showFlash, beritaRow, loadPesan } = window.Admin;
  const API = window.API;

  const RECENT = 5;
  const alertEl = document.getElementById('dashboard-alert');
  const tbody = document.querySelector('#recent-table tbody');
  const setStat = (key, value) => {
    document.querySelector(`[data-stat="${key}"]`).textContent = value;
  };

  showFlash(alertEl);

  // Kartu pesan baru dimuat terpisah: jika tab "pesan" belum ada, kartu berita tetap tampil
  loadPesan()
    .then((pesan) => setStat('pesan', pesan.filter((p) => p.status === 'baru').length))
    .catch(() => setStat('pesan', '–'));

  async function load() {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Memuat...</td></tr>';
    try {
      const [{ data: berita }, { data: kategori }] = await Promise.all([
        API.get('get-berita'),
        API.get('get-kategori'),
      ]);

      setStat('total', berita.length);
      setStat('publish', berita.filter((b) => b.status === 'publish').length);
      setStat('draft', berita.filter((b) => b.status !== 'publish').length);
      setStat('kategori', kategori.length);

      tbody.innerHTML = berita.length
        ? berita.slice(0, RECENT).map((b) => beritaRow(b)).join('')
        : '<tr><td colspan="5" class="empty">Belum ada berita. Mulai dengan menambah berita pertama.</td></tr>';
    } catch (err) {
      tbody.innerHTML = '';
      showAlert(alertEl, err.message);
    }
  }

  load();
})();
