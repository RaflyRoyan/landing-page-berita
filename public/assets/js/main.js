/* Script bersama: navigasi mobile, tahun footer, render card berita, 3 berita terbaru di landing. */
(function () {
  const { escapeHtml, formatDate } = window.Util;

  // Navigasi mobile
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  function newsCard(b) {
    const img = b.foto_url
      ? `<img class="card-img" src="${escapeHtml(b.foto_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : '<div class="card-img" aria-hidden="true"></div>';
    return `
      <a class="card" href="/detail.html?slug=${encodeURIComponent(b.slug)}">
        ${img}
        <div class="card-body">
          <div class="meta">
            ${b.kategori ? `<span class="badge">${escapeHtml(b.kategori)}</span>` : ''}
            <span>${escapeHtml(formatDate(b.tanggal))}</span>
          </div>
          <h3>${escapeHtml(b.judul)}</h3>
          <p>${escapeHtml(b.ringkasan)}</p>
        </div>
      </a>`;
  }

  window.renderNewsCard = newsCard;

  // Landing: 3 berita terbaru
  const latest = document.getElementById('latest-news');
  if (latest) {
    window.API.get('get-berita')
      .then(({ data }) => {
        latest.innerHTML = data.length
          ? data.slice(0, 3).map(newsCard).join('')
          : '<p class="empty">Belum ada berita.</p>';
      })
      .catch(() => {
        latest.innerHTML = '<p class="empty">Gagal memuat berita.</p>';
      });
  }
})();
