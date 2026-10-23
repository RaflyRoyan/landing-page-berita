/* Pesan masuk dari form kontak (admin/pesan.html, buka langsung: ?id=). */
(function () {
  if (!window.Admin) return;
  const { showAlert, icon, loadBadgeData, setBadge, waNumber } = window.Admin;
  const { escapeHtml } = window.Util;
  const API = window.API;

  const alertEl = document.getElementById('pesan-alert');
  const listEl = document.getElementById('pesan-list');
  const detailEl = document.getElementById('pesan-detail');
  const countEl = document.getElementById('pesan-count');
  const searchInput = document.getElementById('pesan-q');
  const statusSelect = document.getElementById('pesan-status');

  const params = new URLSearchParams(window.location.search);
  let items = [];
  let selectedId = params.get('id');
  if (['baru', 'dibaca'].includes(params.get('status'))) statusSelect.value = params.get('status');

  function formatDateTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function updateBadge() {
    setBadge('pesan', items.filter((p) => p.status === 'baru').length);
  }

  function filtered() {
    const q = searchInput.value.trim().toLowerCase();
    const status = statusSelect.value;
    return items.filter(
      (p) =>
        (!status || p.status === status) &&
        (!q || [p.nama, p.email, p.telepon, p.pesan].some((v) => String(v || '').toLowerCase().includes(q)))
    );
  }

  function renderList() {
    const baru = items.filter((p) => p.status === 'baru').length;
    countEl.textContent = `${items.length} pesan · ${baru} belum dibaca`;

    const rows = filtered();
    if (!items.length) {
      listEl.innerHTML = '<li class="empty">Belum ada pesan masuk.</li>';
      return;
    }
    if (!rows.length) {
      listEl.innerHTML = '<li class="empty">Tidak ada pesan yang cocok dengan filter.</li>';
      return;
    }
    listEl.innerHTML = rows
      .map(
        (p) => `
        <li>
          <button type="button" class="message-item${p.status === 'baru' ? ' is-unread' : ''}${
            p.id === selectedId ? ' is-active' : ''
          }" data-id="${escapeHtml(p.id)}">
            <span class="message-dot" aria-hidden="true"></span>
            <span class="message-main">
              <span class="message-top">
                <strong>${escapeHtml(p.nama)}</strong>
                <span class="message-date">${escapeHtml(formatDateTime(p.tanggal))}</span>
              </span>
              <span class="message-snippet">${escapeHtml(p.pesan)}</span>
            </span>
            ${p.status === 'baru' ? '<span class="sr-only">(belum dibaca)</span>' : ''}
          </button>
        </li>`
      )
      .join('');
  }

  function renderDetail() {
    const p = items.find((x) => x.id === selectedId);
    if (!p) {
      detailEl.innerHTML = '<p class="empty">Pilih pesan untuk melihat isinya.</p>';
      return;
    }
    const wa = waNumber(p.telepon);
    // Email sudah divalidasi server; alamat dibiarkan apa adanya (bukan %40) agar dikenali semua aplikasi email
    const mailto = `mailto:${p.email}?subject=${encodeURIComponent('Balasan pesan Anda')}`;
    detailEl.innerHTML = `
      <div class="message-head">
        <h2 class="panel-title">${escapeHtml(p.nama)}</h2>
        <span class="badge ${p.status === 'baru' ? 'badge-draft' : ''}">${p.status === 'baru' ? 'baru' : 'dibaca'}</span>
      </div>
      <dl class="message-meta">
        <dt>Email</dt><dd><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></dd>
        <dt>Telepon</dt><dd>${p.telepon ? escapeHtml(p.telepon) : '<span class="muted">-</span>'}</dd>
        <dt>Dikirim</dt><dd>${escapeHtml(formatDateTime(p.tanggal))}</dd>
      </dl>
      <div class="message-body">${escapeHtml(p.pesan)}</div>
      <div class="form-actions message-actions">
        <a class="btn btn-sm" href="${escapeHtml(mailto)}">${icon('mail')}<span>Balas via Email</span></a>
        ${
          wa
            ? `<a class="btn btn-sm btn-outline" href="https://wa.me/${wa}" target="_blank" rel="noopener">${icon('whatsapp')}<span>Balas via WhatsApp</span></a>`
            : ''
        }
      </div>
      <div class="form-actions message-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-action="unread">${icon('unread')}<span>Tandai belum dibaca</span></button>
        <button class="btn btn-danger btn-sm" type="button" data-action="delete">${icon('trash')}<span>Hapus</span></button>
      </div>`;
  }

  async function setStatus(p, status) {
    const previous = p.status;
    p.status = status;
    renderList();
    renderDetail();
    updateBadge();
    try {
      await API.put('update-pesan', { id: p.id, status });
    } catch (err) {
      p.status = previous;
      renderList();
      renderDetail();
      updateBadge();
      showAlert(alertEl, err.message);
    }
  }

  // Membuka pesan otomatis menandainya "dibaca"
  function openMessage(id) {
    selectedId = id;
    const p = items.find((x) => x.id === id);
    alertEl.hidden = true;
    if (p && p.status === 'baru') setStatus(p, 'dibaca');
    else {
      renderList();
      renderDetail();
    }
    if (window.matchMedia('(max-width: 1023px)').matches) {
      detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function load(force) {
    listEl.innerHTML = '<li class="loading">Memuat...</li>';
    try {
      items = await loadBadgeData('pesan', force);
      if (selectedId && !items.some((p) => p.id === selectedId)) selectedId = null;
      if (selectedId) openMessage(selectedId);
      else {
        renderList();
        renderDetail();
      }
    } catch (err) {
      listEl.innerHTML = '';
      showAlert(alertEl, err.message);
    }
  }

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]');
    if (btn) openMessage(btn.getAttribute('data-id'));
  });

  detailEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    const p = items.find((x) => x.id === selectedId);
    if (!btn || !p) return;

    if (btn.dataset.action === 'unread') setStatus(p, 'baru');

    if (btn.dataset.action === 'delete') {
      if (!window.confirm(`Hapus pesan dari "${p.nama}"?`)) return;
      btn.disabled = true;
      try {
        await API.del(`delete-pesan?id=${encodeURIComponent(p.id)}`);
        selectedId = null;
        showAlert(alertEl, 'Pesan dihapus.', 'success');
        await load(true);
      } catch (err) {
        showAlert(alertEl, err.message);
        btn.disabled = false;
      }
    }
  });

  [searchInput, statusSelect].forEach((el) => el.addEventListener('input', renderList));
  document.getElementById('pesan-filter').addEventListener('submit', (e) => e.preventDefault());

  load(false);
})();
