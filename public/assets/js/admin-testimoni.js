/* Testimoni (admin/testimoni.html, filter langsung: ?status=menunggu).
   Kiriman pengunjung masuk sebagai "menunggu" → Setujui (publish) / Tolak (hapus).
   Testimoni dari admin: draft / publish. */
(function () {
  if (!window.Admin) return;
  const { showAlert, icon, loadBadgeData, prepareUpload, upload } = window.Admin;
  const { escapeHtml, formatDate } = window.Util;
  const API = window.API;

  const STATUS_LABEL = { menunggu: 'menunggu', draft: 'draft', publish: 'publish' };

  const alertEl = document.getElementById('testimoni-alert');
  const tbody = document.querySelector('#testimoni-table tbody');
  const countEl = document.getElementById('testimoni-count');
  const statusFilter = document.getElementById('filter-status');

  const form = document.getElementById('testimoni-form');
  const formTitle = document.getElementById('testimoni-form-title');
  const formAlert = document.getElementById('form-alert');
  const sumberNote = document.getElementById('sumber-note');
  const submitBtn = document.getElementById('testimoni-submit');
  const cancelBtn = document.getElementById('testimoni-cancel');
  const fotoInput = document.getElementById('t-foto');
  const preview = document.getElementById('t-foto-preview');
  const removeFotoBtn = document.getElementById('t-foto-remove');

  let items = [];
  let prepared = null; // foto baru yang belum diunggah

  const initialStatus = new URLSearchParams(window.location.search).get('status');
  if (STATUS_LABEL[initialStatus]) statusFilter.value = initialStatus;

  function avatar(t) {
    return t.foto_url
      ? `<img class="thumb thumb-round" src="${escapeHtml(t.foto_url)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
      : `<span class="thumb thumb-round thumb-initial">${escapeHtml(String(t.nama || '?').charAt(0).toUpperCase())}</span>`;
  }

  function render() {
    const menunggu = items.filter((t) => t.status === 'menunggu').length;
    countEl.textContent = `${items.length} testimoni${menunggu ? ` · ${menunggu} menunggu persetujuan` : ''}`;

    const rows = items.filter((t) => !statusFilter.value || t.status === statusFilter.value);
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">Belum ada testimoni.</td></tr>';
      return;
    }
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">Tidak ada testimoni dengan status ini.</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map((t) => {
        const id = escapeHtml(t.id);
        const actions =
          t.status === 'menunggu'
            ? `<button class="btn btn-sm" type="button" data-approve="${id}">${icon('check')}<span>Setujui</span></button>
               <button class="icon-btn" type="button" data-edit="${id}" title="Edit" aria-label="Edit">${icon('edit')}</button>
               <button class="icon-btn icon-btn-danger" type="button" data-reject="${id}" title="Tolak" aria-label="Tolak">${icon('x')}</button>`
            : `<button class="icon-btn" type="button" data-edit="${id}" title="Edit" aria-label="Edit">${icon('edit')}</button>
               <button class="icon-btn icon-btn-danger" type="button" data-delete="${id}" title="Hapus" aria-label="Hapus">${icon('trash')}</button>`;
        return `
        <tr>
          <td class="hide-sm">${avatar(t)}</td>
          <td>
            <strong>${escapeHtml(t.nama)}</strong>${t.peran ? ` <span class="muted">· ${escapeHtml(t.peran)}</span>` : ''}
            <div class="testimoni-snippet">“${escapeHtml(t.kutipan)}”</div>
            <div class="meta">
              ${t.sumber === 'pengunjung' ? '<span class="badge badge-muted">dari pengunjung</span>' : ''}
              ${t.urutan !== '' && t.urutan !== undefined ? `<span>Urutan ${escapeHtml(t.urutan)}</span>` : ''}
              <span>${escapeHtml(formatDate(t.tanggal))}</span>
            </div>
          </td>
          <td><span class="badge ${t.status === 'publish' ? '' : 'badge-draft'}">${escapeHtml(STATUS_LABEL[t.status] || t.status)}</span></td>
          <td class="actions">${actions}</td>
        </tr>`;
      })
      .join('');
  }

  async function load(force) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Memuat...</td></tr>';
    try {
      items = await loadBadgeData('testimoni', force);
      render();
    } catch (err) {
      tbody.innerHTML = '';
      showAlert(alertEl, err.message);
    }
  }

  // ----- Form tambah / edit -----
  function setStatusOptions(current) {
    const options = [
      ['draft', 'Draft'],
      ['publish', 'Publish'],
    ];
    if (current === 'menunggu') options.unshift(['menunggu', 'Menunggu persetujuan']);
    form.status.innerHTML = options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    form.status.value = current || 'draft';
  }

  function showPhoto(url) {
    if (url) {
      preview.src = url;
      preview.hidden = false;
      removeFotoBtn.hidden = false;
    } else {
      preview.removeAttribute('src');
      preview.hidden = true;
      removeFotoBtn.hidden = true;
    }
  }

  function resetForm() {
    form.reset();
    form.id.value = '';
    form.foto_id.value = '';
    prepared = null;
    showPhoto('');
    setStatusOptions('draft');
    sumberNote.hidden = true;
    formTitle.textContent = 'Tambah Testimoni';
    cancelBtn.hidden = true;
    formAlert.hidden = true;
  }

  function fillForm(t) {
    resetForm();
    form.id.value = t.id;
    form.nama.value = t.nama;
    form.peran.value = t.peran || '';
    form.kutipan.value = t.kutipan;
    form.foto_id.value = t.foto_id || '';
    form.urutan.value = t.urutan || '';
    setStatusOptions(t.status);
    showPhoto(t.foto_url);
    if (t.sumber === 'pengunjung') {
      sumberNote.textContent = `Dikirim pengunjung${t.email ? ` (${t.email})` : ''} pada ${formatDate(t.tanggal)}.`;
      sumberNote.hidden = false;
    }
    formTitle.textContent = 'Edit Testimoni';
    cancelBtn.hidden = false;
    form.nama.focus();
    if (window.matchMedia('(max-width: 1023px)').matches) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  fotoInput.addEventListener('change', async () => {
    prepared = null;
    const file = fotoInput.files[0];
    if (!file) return;
    try {
      prepared = await prepareUpload(file);
      showPhoto(prepared.previewUrl);
      formAlert.hidden = true;
    } catch (err) {
      fotoInput.value = '';
      showAlert(formAlert, err.message);
    }
  });

  removeFotoBtn.addEventListener('click', () => {
    prepared = null;
    fotoInput.value = '';
    form.foto_id.value = '';
    showPhoto('');
  });

  cancelBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formAlert.hidden = true;
    submitBtn.disabled = true;
    const id = form.id.value;

    try {
      if (prepared) {
        submitBtn.textContent = 'Mengunggah foto...';
        const { fileId } = await upload(prepared, 'testimoni');
        form.foto_id.value = fileId;
        prepared = null;
      }

      submitBtn.textContent = 'Menyimpan...';
      const payload = {
        nama: form.nama.value.trim(),
        peran: form.peran.value.trim(),
        kutipan: form.kutipan.value.trim(),
        foto_id: form.foto_id.value,
        status: form.status.value,
        urutan: form.urutan.value,
      };
      if (id) {
        await API.put('update-testimoni', { id, ...payload });
        showAlert(alertEl, 'Testimoni diperbarui.', 'success');
      } else {
        await API.post('create-testimoni', payload);
        showAlert(alertEl, 'Testimoni ditambahkan.', 'success');
      }
      resetForm();
      await load(true);
    } catch (err) {
      showAlert(formAlert, err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan';
    }
  });

  // ----- Aksi di tabel -----
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-approve], [data-edit], [data-reject], [data-delete]');
    if (!btn) return;
    const id = btn.dataset.approve || btn.dataset.edit || btn.dataset.reject || btn.dataset.delete;
    const t = items.find((x) => x.id === id);
    if (!t) return;

    if (btn.dataset.edit) {
      fillForm(t);
      return;
    }

    const isApprove = Boolean(btn.dataset.approve);
    const question = btn.dataset.reject
      ? `Tolak testimoni dari "${t.nama}"? Testimoni akan dihapus.`
      : `Hapus testimoni dari "${t.nama}"?`;
    if (!isApprove && !window.confirm(question)) return;

    btn.disabled = true;
    try {
      if (isApprove) {
        await API.put('update-testimoni', { id, status: 'publish' });
        showAlert(alertEl, `Testimoni dari "${t.nama}" disetujui dan sekarang tampil di situs.`, 'success');
      } else {
        await API.del(`delete-testimoni?id=${encodeURIComponent(id)}`);
        if (form.id.value === id) resetForm();
        showAlert(alertEl, btn.dataset.reject ? 'Testimoni ditolak.' : 'Testimoni dihapus.', 'success');
      }
      await load(true);
    } catch (err) {
      showAlert(alertEl, err.message);
      btn.disabled = false;
    }
  });

  statusFilter.addEventListener('input', render);
  document.getElementById('testimoni-filter').addEventListener('submit', (e) => e.preventDefault());

  resetForm();
  load(false);
})();
