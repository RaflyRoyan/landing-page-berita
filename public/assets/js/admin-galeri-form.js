/* Form tambah/edit album galeri (admin/galeri-form.html, edit: ?id=).
   Foto baru disiapkan (dikompres) saat dipilih, lalu diunggah satu per satu saat disimpan. */
(function () {
  if (!window.Admin) return;
  const { showAlert, setFlash, prepareUpload, upload, icon } = window.Admin;
  const { escapeHtml } = window.Util;
  const API = window.API;

  const LIST_URL = '/admin/galeri.html';
  const MAX_PER_PICK = 20;
  const MAX_FOTO = 200; // sama dengan batas server (utils/galeri.js)

  const editId = new URLSearchParams(window.location.search).get('id');
  const form = document.getElementById('galeri-form');
  const fieldset = form.querySelector('fieldset');
  const formAlert = document.getElementById('form-alert');
  const fotoInput = document.getElementById('foto');
  const grid = document.getElementById('photo-grid');
  const countEl = document.getElementById('foto-count');
  const submitBtn = document.getElementById('submit-btn');
  const submitLabel = editId ? 'Simpan Perubahan' : 'Simpan';

  // Foto album: { key, id (id Drive, kosong jika belum diunggah), url (pratinjau), prepared }
  let photos = [];
  let sampulKey = '';
  let nextKey = 1;

  if (editId) {
    document.title = 'Edit Album — Warta';
    document.querySelector('.topbar-title').textContent = 'Edit Album';
  }
  submitBtn.textContent = submitLabel;

  function addPhoto(p) {
    const photo = { key: String(nextKey++), id: '', url: '', prepared: null, ...p };
    photos.push(photo);
    if (!sampulKey) sampulKey = photo.key;
    return photo;
  }

  function render() {
    const pending = photos.filter((p) => !p.id).length;
    countEl.textContent = photos.length
      ? `${photos.length} foto${pending ? ` · ${pending} belum diunggah` : ''}`
      : 'Belum ada foto. Album minimal berisi 1 foto.';

    grid.innerHTML = photos
      .map((p, i) => {
        const isSampul = p.key === sampulKey;
        return `
        <li class="photo-tile${isSampul ? ' is-cover' : ''}${p.id ? '' : ' is-pending'}">
          <img src="${escapeHtml(p.url)}" alt="Foto ${i + 1}" referrerpolicy="no-referrer" loading="lazy">
          ${isSampul ? '<span class="photo-tag">Sampul</span>' : ''}
          ${p.id ? '' : '<span class="photo-tag photo-tag-pending">Baru</span>'}
          <div class="photo-actions">
            <button class="icon-btn" type="button" data-act="left" data-key="${p.key}" title="Geser ke kiri" aria-label="Geser foto ${i + 1} ke kiri"${i === 0 ? ' disabled' : ''}>${icon('left')}</button>
            <button class="icon-btn" type="button" data-act="cover" data-key="${p.key}" title="Jadikan sampul" aria-label="Jadikan foto ${i + 1} sampul"${isSampul ? ' disabled' : ''}>${icon('star')}</button>
            <button class="icon-btn" type="button" data-act="right" data-key="${p.key}" title="Geser ke kanan" aria-label="Geser foto ${i + 1} ke kanan"${i === photos.length - 1 ? ' disabled' : ''}>${icon('right')}</button>
            <button class="icon-btn icon-btn-danger" type="button" data-act="remove" data-key="${p.key}" title="Hapus dari album" aria-label="Hapus foto ${i + 1} dari album">${icon('x')}</button>
          </div>
        </li>`;
      })
      .join('');
  }

  async function load() {
    if (!editId) {
      form.tanggal_kegiatan.value = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD lokal
      render();
      form.judul.focus();
      return;
    }
    fieldset.disabled = true;
    try {
      const { data: g } = await API.get(`get-galeri?id=${encodeURIComponent(editId)}`);
      form.judul.value = g.judul;
      form.keterangan.value = g.keterangan || '';
      form.tanggal_kegiatan.value = g.tanggal_kegiatan || '';
      form.status.value = g.status || 'draft';
      (g.foto || []).forEach((f) => {
        const photo = addPhoto({ id: f.id, url: f.thumb_url });
        if (f.id === g.sampul_id) sampulKey = photo.key;
      });
      render();
      fieldset.disabled = false;
      form.judul.focus();
    } catch (err) {
      showAlert(formAlert, err.status === 404 ? 'Album tidak ditemukan.' : err.message);
    }
  }

  fotoInput.addEventListener('change', async () => {
    formAlert.hidden = true;
    let files = [...fotoInput.files];
    fotoInput.value = '';
    if (!files.length) return;

    const notes = [];
    if (files.length > MAX_PER_PICK) {
      notes.push(`Hanya ${MAX_PER_PICK} foto pertama yang diambil (maks. ${MAX_PER_PICK} per kali pilih).`);
      files = files.slice(0, MAX_PER_PICK);
    }
    const room = MAX_FOTO - photos.length;
    if (files.length > room) {
      notes.push(`Album maksimal ${MAX_FOTO} foto.`);
      files = files.slice(0, Math.max(0, room));
    }

    // Disiapkan berurutan agar memori browser HP tidak penuh
    fieldset.disabled = true;
    const failed = [];
    for (let i = 0; i < files.length; i += 1) {
      countEl.textContent = `Menyiapkan foto ${i + 1}/${files.length}...`;
      try {
        const prepared = await prepareUpload(files[i]);
        addPhoto({ url: prepared.previewUrl, prepared });
      } catch (err) {
        failed.push(`${files[i].name} (${err.message})`);
      }
    }
    fieldset.disabled = false;
    if (failed.length) notes.push(`Dilewati: ${failed.join(', ')}.`);
    if (notes.length) showAlert(formAlert, notes.join(' '));
    render();
  });

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const i = photos.findIndex((p) => p.key === btn.dataset.key);
    if (i < 0) return;
    const act = btn.dataset.act;

    if (act === 'cover') sampulKey = photos[i].key;
    if (act === 'left' && i > 0) [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]];
    if (act === 'right' && i < photos.length - 1) [photos[i + 1], photos[i]] = [photos[i], photos[i + 1]];
    if (act === 'remove') {
      photos.splice(i, 1);
      if (sampulKey === btn.dataset.key) sampulKey = photos.length ? photos[0].key : '';
    }
    render();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formAlert.hidden = true;
    if (!photos.length) {
      showAlert(formAlert, 'Album minimal berisi 1 foto.');
      return;
    }
    submitBtn.disabled = true;

    try {
      // 1. Unggah foto baru satu per satu. Foto yang sudah terunggah menyimpan id-nya,
      //    jadi jika gagal di tengah jalan, simpan ulang hanya mengunggah sisanya.
      const pending = photos.filter((p) => !p.id);
      for (let i = 0; i < pending.length; i += 1) {
        submitBtn.textContent = `Mengunggah foto ${i + 1}/${pending.length}...`;
        const { fileId } = await upload(pending[i].prepared, 'galeri');
        pending[i].id = fileId;
        pending[i].prepared = null;
      }
      render();

      // 2. Simpan album
      submitBtn.textContent = 'Menyimpan...';
      const payload = {
        judul: form.judul.value.trim(),
        keterangan: form.keterangan.value.trim(),
        tanggal_kegiatan: form.tanggal_kegiatan.value,
        status: form.status.value,
        foto_ids: photos.map((p) => p.id).join(','),
        sampul_id: (photos.find((p) => p.key === sampulKey) || photos[0]).id,
      };

      if (editId) {
        await API.put('update-galeri', { id: editId, ...payload });
        setFlash('Album diperbarui.');
      } else {
        await API.post('create-galeri', payload);
        setFlash('Album ditambahkan.');
      }
      window.location.href = LIST_URL;
    } catch (err) {
      render();
      showAlert(formAlert, err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });

  load();
})();
