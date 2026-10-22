/* Helper fetch ke /api/*. Token admin otomatis ditambahkan di halaman /admin/. */
(function () {
  const TOKEN_KEY = 'admin_token';
  const USER_KEY = 'admin_user';
  const isAdminPage = window.location.pathname.startsWith('/admin/');

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* abaikan */
    }
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || '{}');
    } catch {
      return {};
    }
  }

  // Cek exp di payload JWT tanpa verifikasi signature (verifikasi asli tetap di server)
  function isTokenValid(token) {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return !payload.exp || payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body !== undefined && typeof options.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const token = getToken();
    if (isAdminPage && token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api/${path.replace(/^\//, '')}`, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* respons kosong / bukan JSON */
    }

    if (res.status === 401 && isAdminPage && !path.startsWith('login')) {
      clearSession();
      window.location.href = '/admin/login.html';
    }

    if (!res.ok) {
      const err = new Error((data && data.error) || `Request gagal (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  window.API = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' }),
    getToken,
    setSession,
    clearSession,
    getUser,
    isTokenValid,
  };

  window.Util = { escapeHtml, formatDate };
})();
