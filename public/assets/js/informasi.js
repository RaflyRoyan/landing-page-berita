/* Pojok Informasi (informasi.html): daftar dokumen, cari, filter jenis, 10 per halaman.
   Keadaan disimpan di URL (?q=&jenis=&hal=) agar bisa dibagikan. */
(function () {
  const { escapeHtml } = window.Util;
  const PER_PAGE = 10;

  const list = document.getElementById('dokumen-list');
  const search = document.getElementById('search');
  const jenisSelect = document.getElementById('jenis');
  const countEl = document.getElementById('dokumen-count');
  const pager = document.getElementById('pager');

  const params = new URLSearchParams(window.location.search);
  let all = [];
  let page = Math.max(1, parseInt(params.get('hal'), 10) || 1);
  search.value = params.get('q') || '';

  function syncUrl() {
    const p = new URLSearchParams();
    if (search.value.trim()) p.set('q', search.value.trim());
    if (jenisSelect.value) p.set('jenis', jenisSelect.value);
    if (page > 1) p.set('hal', page);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }

  // Nomor halaman: 1 … 4 5 [6] 7 8 … 20
  function pageNumbers(total) {
    const nums = [];
    for (let i = 1; i <= total; i += 1) {
      if (i === 1 || i === total || Math.abs(i - page) <= 2) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    return nums;
  }

  function renderPager(totalPages) {
    pager.hidden = totalPages < 2;
    if (totalPages < 2) {
      pager.innerHTML = '';
      return;
    }
    pager.innerHTML = `
      <button class="btn btn-ghost btn-sm" type="button" data-page="${page - 1}"${page === 1 ? ' disabled' : ''}>← Sebelumnya</button>
      <span class="pager-pages">
        ${pageNumbers(totalPages)
          .map((n) =>
            n === '…'
              ? '<span class="pager-gap">…</span>'
              : `<button class="pager-num${n === page ? ' is-active' : ''}" type="button" data-page="${n}"${
                  n === page ? ' aria-current="page"' : ''
                } aria-label="Halaman ${n}">${n}</button>`
          )
          .join('')}
      </span>
      <button class="btn btn-ghost btn-sm" type="button" data-page="${page + 1}"${page === totalPages ? ' disabled' : ''}>Berikutnya →</button>`;
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const jenis = jenisSelect.value;
    const items = all.filter(
      (d) =>
        (!q || [d.nomor, d.judul, d.ringkasan].some((v) => String(v || '').toLowerCase().includes(q))) &&
        (!jenis || d.jenis === jenis)
    );

    const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    page = Math.min(page, totalPages);
    const start = (page - 1) * PER_PAGE;
    const shown = items.slice(start, start + PER_PAGE);

    countEl.textContent = items.length
      ? `Menampilkan ${start + 1}–${start + shown.length} dari ${items.length} dokumen`
      : '';
    list.innerHTML = shown.length
      ? shown.map(window.renderDokumenItem).join('')
      : `<p class="empty">${q || jenis ? 'Tidak ada dokumen yang cocok.' : 'Belum ada dokumen.'}</p>`;
    renderPager(totalPages);
    syncUrl();
  }

  pager.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    page = Number(btn.dataset.page);
    render();
    countEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Mengubah pencarian / filter kembali ke halaman 1
  search.addEventListener('input', () => {
    page = 1;
    render();
  });
  jenisSelect.addEventListener('input', () => {
    page = 1;
    render();
  });
  document.getElementById('dokumen-search').addEventListener('submit', (e) => e.preventDefault());

  window.API.get('get-dokumen')
    .then(({ data }) => {
      all = data;
      // Opsi jenis diambil dari dokumen yang ada
      const jenisList = [...new Set(data.map((d) => d.jenis).filter(Boolean))];
      jenisSelect.innerHTML = [
        '<option value="">Semua jenis</option>',
        ...jenisList.map((j) => `<option value="${escapeHtml(j)}">${escapeHtml(j)}</option>`),
      ].join('');
      const wanted = params.get('jenis');
      if (wanted && jenisList.includes(wanted)) jenisSelect.value = wanted;
      render();
    })
    .catch(() => {
      list.innerHTML = '<p class="empty">Gagal memuat dokumen.</p>';
    });
})();
