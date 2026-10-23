/* Halaman galeri (galeri.html): daftar album, satu album (?id=), dan lightbox foto. */
(function () {
  const { escapeHtml, formatDate } = window.Util;
  const id = new URLSearchParams(window.location.search).get('id');

  // ===== Daftar album =====
  if (!id) {
    const list = document.getElementById('album-list');
    window.API.get('get-galeri')
      .then(({ data }) => {
        list.innerHTML = data.length
          ? data.map(window.renderAlbumCard).join('')
          : '<p class="empty">Belum ada album kegiatan.</p>';
      })
      .catch(() => {
        list.innerHTML = '<p class="empty">Gagal memuat galeri.</p>';
      });
    return;
  }

  // ===== Satu album =====
  document.getElementById('album-list-view').hidden = true;
  document.getElementById('album-view').hidden = false;
  const detail = document.getElementById('album-detail');
  let photos = [];

  window.API.get(`get-galeri?id=${encodeURIComponent(id)}`)
    .then(({ data: g }) => {
      document.title = `${g.judul} — Galeri — Warta`;
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', g.keterangan || g.judul);
      photos = g.foto || [];

      detail.innerHTML = `
        <div class="meta">
          <span>${escapeHtml(formatDate(g.tanggal_kegiatan))}</span>
          <span>· ${escapeHtml(photos.length)} foto</span>
        </div>
        <h1 class="album-title">${escapeHtml(g.judul)}</h1>
        ${g.keterangan ? `<p class="lead muted album-desc">${escapeHtml(g.keterangan)}</p>` : ''}
        <ul class="gallery-grid">
          ${photos
            .map(
              (f, i) => `
            <li><button class="gallery-item" type="button" data-index="${i}" aria-label="Lihat foto ${i + 1} dari ${photos.length}">
              <img src="${escapeHtml(f.thumb_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">
            </button></li>`
            )
            .join('')}
        </ul>`;
    })
    .catch((err) => {
      detail.innerHTML = `<p class="empty">${
        err.status === 404 ? 'Album tidak ditemukan.' : 'Gagal memuat album.'
      }</p>`;
    });

  // ===== Lightbox =====
  const box = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  let current = 0;
  let opener = null; // tombol yang membuka lightbox, fokus dikembalikan ke sini

  function show(i) {
    current = (i + photos.length) % photos.length;
    img.src = photos[current].url;
    img.alt = `Foto ${current + 1} dari ${photos.length}`;
    counter.textContent = `${current + 1} / ${photos.length}`;
    // Muat foto berikutnya lebih dulu agar geser terasa cepat
    if (photos.length > 1) new Image().src = photos[(current + 1) % photos.length].url;
  }

  function open(i, trigger) {
    opener = trigger;
    box.classList.toggle('is-single', photos.length < 2);
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('[data-lb="close"]').focus();
  }

  function close() {
    box.hidden = true;
    img.removeAttribute('src');
    document.body.style.overflow = '';
    if (opener) opener.focus();
  }

  detail.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (item) open(Number(item.dataset.index), item);
  });

  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lb]');
    if (btn) {
      const act = btn.dataset.lb;
      if (act === 'close') close();
      if (act === 'prev') show(current - 1);
      if (act === 'next') show(current + 1);
    } else if (e.target === box) {
      close(); // klik area gelap di luar foto
    }
  });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
    // Fokus tetap di dalam lightbox
    if (e.key === 'Tab') {
      const btns = [...box.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
      const first = btns[0];
      const last = btns[btns.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Geser di HP
  let touchX = null;
  box.addEventListener('touchstart', (e) => {
    touchX = e.touches.length === 1 ? e.touches[0].clientX : null;
  }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (touchX === null || photos.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });
})();
