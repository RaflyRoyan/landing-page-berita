/* Layout admin bersama: cek login, sidebar, topbar, logout, dan helper untuk script halaman.
   Halaman memakai <body class="admin-body" data-page="..." data-title="..."> dengan
   <aside id="admin-sidebar"> dan <header id="admin-topbar"> kosong yang diisi di sini. */
(function () {
  const API = window.API;
  const { escapeHtml, formatDate } = window.Util;

  if (!API.isTokenValid(API.getToken())) {
    API.clearSession();
    window.location.replace('/admin/login.html');
    return; // window.Admin tidak dibuat → script halaman berhenti
  }

  // Ikon SVG inline (gaya garis, 24x24)
  const ICON_PATHS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    berita: '<path d="M4 4h13a2 2 0 0 1 2 2v13a1 1 0 0 0 2 0V8"/><path d="M4 4v15a2 2 0 0 0 2 2h15"/><path d="M8 8h7M8 12h7M8 16h4"/>',
    kategori: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    external: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    draft: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  };

  function icon(name) {
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
  }

  const MENU = [
    { items: [
      { page: 'dashboard', href: '/admin/dashboard.html', label: 'Dashboard', icon: 'dashboard' },
      { page: 'berita', href: '/admin/berita.html', label: 'Berita', icon: 'berita' },
    ] },
    { title: 'Master', items: [
      { page: 'kategori', href: '/admin/kategori.html', label: 'Kategori', icon: 'kategori' },
    ] },
  ];

  const body = document.body;
  const active = body.dataset.page;
  const user = API.getUser();

  const sidebar = document.getElementById('admin-sidebar');
  sidebar.className = 'admin-sidebar';
  sidebar.innerHTML = `
    <a class="sidebar-brand" href="/admin/dashboard.html">Warta<span>.</span> <small>Admin</small></a>
    <nav class="sidebar-nav" aria-label="Menu admin">
      ${MENU.map(
        (group) => `
        ${group.title ? `<div class="sidebar-section">${escapeHtml(group.title)}</div>` : ''}
        ${group.items
          .map(
            (m) => `<a href="${m.href}" class="${m.page === active ? 'active' : ''}"${
              m.page === active ? ' aria-current="page"' : ''
            }>${icon(m.icon)}<span>${escapeHtml(m.label)}</span></a>`
          )
          .join('')}`
      ).join('')}
    </nav>
    <div class="sidebar-footer">
      <a href="/" target="_blank" rel="noopener">${icon('external')}<span>Lihat situs</span></a>
    </div>`;

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  sidebar.after(backdrop);

  const topbar = document.getElementById('admin-topbar');
  topbar.className = 'admin-topbar';
  topbar.innerHTML = `
    <button class="icon-btn sidebar-toggle" type="button" aria-label="Buka menu" aria-expanded="false">${icon('menu')}</button>
    <h1 class="topbar-title">${escapeHtml(body.dataset.title || '')}</h1>
    <div class="topbar-user">
      <span class="avatar" aria-hidden="true">${escapeHtml((user.nama || user.username || '?').charAt(0).toUpperCase())}</span>
      <span class="topbar-name">${escapeHtml(user.nama || user.username || '')}</span>
      <button class="btn btn-ghost btn-sm" type="button" id="logout-btn">${icon('logout')}<span>Logout</span></button>
    </div>`;

  // Sidebar mobile (off-canvas)
  const toggle = topbar.querySelector('.sidebar-toggle');
  function setSidebar(open) {
    body.classList.toggle('sidebar-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', () => setSidebar(!body.classList.contains('sidebar-open')));
  backdrop.addEventListener('click', () => setSidebar(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setSidebar(false);
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    API.clearSession();
    window.location.replace('/admin/login.html');
  });

  function showAlert(el, message, type = 'error') {
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.hidden = false;
  }

  // Pesan sekali tampil antar halaman (mis. "Berita ditambahkan." setelah redirect dari form)
  const FLASH_KEY = 'admin_flash';
  function setFlash(message, type = 'success') {
    try {
      sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type }));
    } catch {
      /* abaikan */
    }
  }
  function showFlash(el) {
    try {
      const flash = JSON.parse(sessionStorage.getItem(FLASH_KEY) || 'null');
      sessionStorage.removeItem(FLASH_KEY);
      if (flash) showAlert(el, flash.message, flash.type);
    } catch {
      /* abaikan */
    }
  }

  // Satu baris tabel berita, dipakai dashboard dan halaman berita
  function beritaRow(b, { withDelete = false } = {}) {
    const editHref = `/admin/berita-form.html?id=${encodeURIComponent(b.id)}`;
    return `
      <tr>
        <td class="hide-sm">${
          b.foto_url
            ? `<img class="thumb" src="${escapeHtml(b.foto_url)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
            : '<div class="thumb"></div>'
        }</td>
        <td>
          <a class="row-title" href="${editHref}">${escapeHtml(b.judul)}</a>
          <div class="meta">${escapeHtml(b.kategori || 'Tanpa kategori')}</div>
        </td>
        <td><span class="badge ${b.status === 'publish' ? '' : 'badge-draft'}">${escapeHtml(b.status)}</span></td>
        <td class="nowrap hide-sm">${escapeHtml(formatDate(b.tanggal))}</td>
        <td class="actions">
          <a class="icon-btn" href="${editHref}" title="Edit" aria-label="Edit ${escapeHtml(b.judul)}">${icon('edit')}</a>
          ${
            withDelete
              ? `<button class="icon-btn icon-btn-danger" type="button" data-delete="${escapeHtml(b.id)}" title="Hapus" aria-label="Hapus ${escapeHtml(b.judul)}">${icon('trash')}</button>`
              : ''
          }
        </td>
      </tr>`;
  }

  // Isi ikon pada elemen statis halaman: <span data-icon="plus"></span>
  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.outerHTML = icon(el.dataset.icon);
  });

  window.Admin = { icon, showAlert, setFlash, showFlash, beritaRow };
})();
