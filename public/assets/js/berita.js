/* Halaman daftar berita (berita.html) dan detail berita (detail.html). */
(function () {
  const { escapeHtml, formatDate } = window.Util;

  // ===== Daftar + pencarian =====
  const list = document.getElementById('news-list');
  if (list) {
    const search = document.getElementById('search');
    let all = [];

    const render = () => {
      const q = (search.value || '').trim().toLowerCase();
      const items = q
        ? all.filter((b) =>
            [b.judul, b.ringkasan, b.kategori].some((v) => String(v || '').toLowerCase().includes(q))
          )
        : all;
      list.innerHTML = items.length
        ? items.map(window.renderNewsCard).join('')
        : `<p class="empty">${q ? 'Tidak ada berita yang cocok.' : 'Belum ada berita.'}</p>`;
    };

    search.addEventListener('input', render);
    document.getElementById('search-form').addEventListener('submit', (e) => e.preventDefault());

    // Isi kolom pencarian dari ?q=
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) search.value = q;

    window.API.get('get-berita')
      .then(({ data }) => {
        all = data;
        render();
      })
      .catch(() => {
        list.innerHTML = '<p class="empty">Gagal memuat berita.</p>';
      });
  }

  // ===== Detail =====
  const article = document.getElementById('article');
  if (article) {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) {
      article.innerHTML = '<p class="empty">Berita tidak ditemukan.</p>';
      return;
    }

    window.API.get(`get-berita?slug=${encodeURIComponent(slug)}`)
      .then(({ data: b }) => {
        document.title = `${b.judul} — Warta`;
        const desc = document.querySelector('meta[name="description"]');
        if (desc) desc.setAttribute('content', b.ringkasan || '');

        // Isi ditampilkan sebagai teks biasa, baris kosong = paragraf baru
        const paragraphs = String(b.isi || '')
          .split(/\n\s*\n/)
          .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
          .join('');

        article.innerHTML = `
          <div class="meta">
            ${b.kategori ? `<span class="badge">${escapeHtml(b.kategori)}</span>` : ''}
            <span>${escapeHtml(formatDate(b.tanggal))}</span>
            ${b.penulis ? `<span>· ${escapeHtml(b.penulis)}</span>` : ''}
          </div>
          <h1>${escapeHtml(b.judul)}</h1>
          ${b.ringkasan ? `<p class="lead muted">${escapeHtml(b.ringkasan)}</p>` : ''}
          ${b.foto_url ? `<img class="article-cover" src="${escapeHtml(b.foto_url)}" alt="" referrerpolicy="no-referrer">` : ''}
          <div class="article-body">${paragraphs}</div>`;
      })
      .catch((err) => {
        article.innerHTML = `<p class="empty">${
          err.status === 404 ? 'Berita tidak ditemukan.' : 'Gagal memuat berita.'
        }</p>`;
      });
  }
})();
