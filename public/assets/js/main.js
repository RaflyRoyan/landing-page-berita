/* Script bersama: navigasi mobile, tahun footer, render card berita & album, isi seksi landing. */
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

  function albumCard(g) {
    const img = g.sampul_url
      ? `<img class="card-img" src="${escapeHtml(g.sampul_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : '<div class="card-img" aria-hidden="true"></div>';
    return `
      <a class="card" href="/galeri.html?id=${encodeURIComponent(g.id)}">
        ${img}
        <div class="card-body">
          <div class="meta">
            <span class="badge">${escapeHtml(g.jumlah_foto)} foto</span>
            <span>${escapeHtml(formatDate(g.tanggal_kegiatan))}</span>
          </div>
          <h3>${escapeHtml(g.judul)}</h3>
          ${g.keterangan ? `<p class="card-clamp">${escapeHtml(g.keterangan)}</p>` : ''}
        </div>
      </a>`;
  }

  window.renderAlbumCard = albumCard;

  // Landing: 6 album galeri terbaru
  const latestGaleri = document.getElementById('latest-galeri');
  if (latestGaleri) {
    window.API.get('get-galeri')
      .then(({ data }) => {
        latestGaleri.innerHTML = data.length
          ? data.slice(0, 6).map(albumCard).join('')
          : '<p class="empty">Belum ada album kegiatan.</p>';
      })
      .catch(() => {
        latestGaleri.innerHTML = '<p class="empty">Gagal memuat galeri.</p>';
      });
  }

  // Landing: testimoni yang sudah publish + form kirim testimoni (masuk sebagai "menunggu")
  const testimoniList = document.getElementById('testimoni-list');
  if (testimoniList) {
    const MAX_TESTIMONI = 6;
    const testimoniCard = (t) => {
      const avatar = t.foto_url
        ? `<img class="testimoni-avatar" src="${escapeHtml(t.foto_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : `<span class="testimoni-avatar" aria-hidden="true">${escapeHtml(String(t.nama || '?').charAt(0).toUpperCase())}</span>`;
      return `
        <figure class="testimoni-card">
          <blockquote>${escapeHtml(t.kutipan)}</blockquote>
          <figcaption>
            ${avatar}
            <span><strong>${escapeHtml(t.nama)}</strong>${t.peran ? `<span class="muted">${escapeHtml(t.peran)}</span>` : ''}</span>
          </figcaption>
        </figure>`;
    };

    window.API.get('get-testimoni')
      .then(({ data }) => {
        testimoniList.innerHTML = data.length
          ? data.slice(0, MAX_TESTIMONI).map(testimoniCard).join('')
          : '<p class="empty">Belum ada testimoni. Jadilah yang pertama!</p>';
      })
      .catch(() => {
        testimoniList.innerHTML = '<p class="empty">Gagal memuat testimoni.</p>';
      });

    const toggle = document.getElementById('testimoni-toggle');
    const form = document.getElementById('testimoni-form');
    const alertEl = document.getElementById('testimoni-alert');
    toggle.addEventListener('click', () => {
      form.hidden = !form.hidden;
      toggle.setAttribute('aria-expanded', String(!form.hidden));
      if (!form.hidden) form.nama.focus();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertEl.hidden = true;
      if (!form.reportValidity()) return;

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Mengirim...';
      try {
        await window.API.post('submit-testimoni', {
          nama: form.nama.value.trim(),
          peran: form.peran.value.trim(),
          email: form.email.value.trim(),
          kutipan: form.kutipan.value.trim(),
          website: form.website.value,
        });
        form.reset();
        alertEl.textContent = 'Terima kasih! Testimoni Anda akan tampil setelah disetujui admin.';
        alertEl.className = 'alert alert-success';
      } catch (err) {
        alertEl.textContent = err.message;
        alertEl.className = 'alert alert-error';
      } finally {
        alertEl.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Kirim Testimoni';
      }
    });
  }

  // Landing: form kontak → disimpan ke tab "pesan"
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const alertEl = document.getElementById('contact-alert');
    const showContactAlert = (message, type) => {
      alertEl.textContent = message;
      alertEl.className = `alert alert-${type}`;
      alertEl.hidden = false;
    };

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertEl.hidden = true;
      if (!contactForm.reportValidity()) return;

      const btn = contactForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Mengirim...';
      try {
        await window.API.post('create-pesan', {
          nama: contactForm.nama.value.trim(),
          email: contactForm.email.value.trim(),
          telepon: contactForm.telepon.value.trim(),
          pesan: contactForm.pesan.value.trim(),
          website: contactForm.website.value,
        });
        contactForm.reset();
        showContactAlert('Terima kasih, pesan Anda sudah kami terima.', 'success');
      } catch (err) {
        showContactAlert(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Kirim Pesan';
      }
    });
  }
})();
