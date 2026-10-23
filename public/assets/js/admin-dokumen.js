/* Pojok Informasi (admin/dokumen.html): arsip dokumen resmi, file PDF / gambar di Drive. */
(function () {
  if (!window.Admin) return;
  const { showAlert, icon, prepareUpload, upload } = window.Admin;
  const { escapeHtml, formatDate } = window.Util;
  const API = window.API;

  const JENIS = ['SK', 'Surat Edaran', 'Pengumuman', 'Laporan', 'Lainnya']; // sama dengan utils/dokumen.js

  const alertEl = document.getElementById('dokumen-alert');
  const tbody = document.querySelector('#dokumen-table tbody');
  const countEl = document.getElementById('dokumen-count');
  const searchInput = document.getElementById('filter-q');
  const jenisFilter = document.getElementById('filter-jenis');
  const statusFilter = document.getElementById('filter-status');

  const form = document.getElementById('dokumen-form');
  const formTitle = document.getElementById('dokumen-form-title');
  const formAlert = document.getElementById('form-alert');
  const submitBtn = document.getElementById('dokumen-submit');
  const cancelBtn = document.getElementById('dokumen-cancel');
  const fileInput = document.getElementById('d-file');
  const fileCurrent = document.getElementById('d-file-current');

  let items = [];
  let prepared = null; // file baru yang belum diunggah

  const jenisOptions = JENIS.map((j) => `<option value="${escapeHtml(j)}">${escapeHtml(j)}</option>`).join('');
  jenisFilter.innerHTML = `<option value="">Semua jenis</option>${jenisOptions}`;
  form.jenis.innerHTML = jenisOptions;

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const rows = items.filter(
      (d) =>
        (!q || [d.nomor, d.judul, d.ringkasan].some((v) => String(v || '').toLowerCase().includes(q))) &&
        (!jenisFilter.value || d.jenis === jenisFilter.value) &&
        (!statusFilter.value || d.status === statusFilter.value)
    );
    countEl.textContent = `${rows.length} dari ${items.length} dokumen`;
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">Belum ada dokumen.</td></tr>';
      return;
    }
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">Tidak ada dokumen yang cocok dengan filter.</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map((d) => {
        const id = escapeHtml(d.id);
        return `
        <tr>
          <td>
            <strong>${escapeHtml(d.judul)}</strong>
            ${d.nomor ? `<div class="muted doc-nomor">${escapeHtml(d.nomor)}</div>` : ''}
            <div class="meta">
              <span class="badge badge-muted">${escapeHtml(d.jenis)}</span>
              <span>${d.file_tipe === 'pdf' ? 'PDF' : 'Gambar'}</span>
            </div>
          </td>
          <td><span class="badge ${d.status === 'publish' ? '' : 'badge-draft'}">${escapeHtml(d.status)}</span></td>
          <td class="nowrap hide-sm">${escapeHtml(formatDate(d.tanggal_dokumen))}</td>
          <td class="actions">
            <a class="icon-btn" href="${escapeHtml(d.lihat_url)}" target="_blank" rel="noopener" title="Lihat file" aria-label="Lihat file ${escapeHtml(d.judul)}">${icon('external')}</a>
            <button class="icon-btn" type="button" data-edit="${id}" title="Edit" aria-label="Edit ${escapeHtml(d.judul)}">${icon('edit')}</button>
            <button class="icon-btn icon-btn-danger" type="button" data-delete="${id}" title="Hapus" aria-label="Hapus ${escapeHtml(d.judul)}">${icon('trash')}</button>
          </td>
        </tr>`;
      })
      .join('');
  }

  async function load() {
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Memuat...</td></tr>';
    try {
      const { data } = await API.get('get-dokumen');
      items = data;
      render();
    } catch (err) {
      tbody.innerHTML = '';
      showAlert(alertEl, err.message);
    }
  }

  // ----- Form tambah / edit -----
  function showFile(html) {
    fileCurrent.innerHTML = html;
    fileCurrent.hidden = !html;
  }

  function resetForm() {
    form.reset();
    form.id.value = '';
    form.file_id.value = '';
    form.file_tipe.value = '';
    form.tanggal_dokumen.value = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD lokal
    prepared = null;
    showFile('');
    formTitle.textContent = 'Tambah Dokumen';
    cancelBtn.hidden = true;
    formAlert.hidden = true;
  }

  function fillForm(d) {
    resetForm();
    form.id.value = d.id;
    form.nomor.value = d.nomor || '';
    form.judul.value = d.judul;
    form.jenis.value = d.jenis;
    form.tanggal_dokumen.value = d.tanggal_dokumen || '';
    form.ringkasan.value = d.ringkasan || '';
    form.file_id.value = d.file_id;
    form.file_tipe.value = d.file_tipe;
    form.status.value = d.status || 'draft';
    showFile(
      `File saat ini: <a href="${escapeHtml(d.lihat_url)}" target="_blank" rel="noopener">${
        d.file_tipe === 'pdf' ? 'PDF' : 'gambar'
      }</a>. Pilih file baru untuk mengganti.`
    );
    formTitle.textContent = 'Edit Dokumen';
    cancelBtn.hidden = false;
    form.judul.focus();
    if (window.matchMedia('(max-width: 1023px)').matches) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  fileInput.addEventListener('change', async () => {
    prepared = null;
    const file = fileInput.files[0];
    if (!file) return;
    try {
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        throw new Error('File harus PDF atau gambar');
      }
      prepared = await prepareUpload(file);
      formAlert.hidden = true;
    } catch (err) {
      fileInput.value = '';
      showAlert(formAlert, err.message);
    }
  });

  cancelBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formAlert.hidden = true;
    if (!prepared && !form.file_id.value) {
      showAlert(formAlert, 'Pilih file dokumen (PDF atau gambar).');
      return;
    }
    submitBtn.disabled = true;
    const id = form.id.value;

    try {
      if (prepared) {
        submitBtn.textContent = 'Mengunggah file...';
        const { fileId } = await upload(prepared, 'dokumen');
        form.file_id.value = fileId;
        form.file_tipe.value = prepared.mimeType === 'application/pdf' ? 'pdf' : 'gambar';
        prepared = null;
        fileInput.value = '';
      }

      submitBtn.textContent = 'Menyimpan...';
      const payload = {
        nomor: form.nomor.value.trim(),
        judul: form.judul.value.trim(),
        jenis: form.jenis.value,
        tanggal_dokumen: form.tanggal_dokumen.value,
        ringkasan: form.ringkasan.value.trim(),
        file_id: form.file_id.value,
        file_tipe: form.file_tipe.value,
        status: form.status.value,
      };
      if (id) {
        await API.put('update-dokumen', { id, ...payload });
        showAlert(alertEl, 'Dokumen diperbarui.', 'success');
      } else {
        await API.post('create-dokumen', payload);
        showAlert(alertEl, 'Dokumen ditambahkan.', 'success');
      }
      resetForm();
      await load();
    } catch (err) {
      showAlert(formAlert, err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan';
    }
  });

  // ----- Aksi di tabel -----
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-edit], [data-delete]');
    if (!btn) return;
    const d = items.find((x) => x.id === (btn.dataset.edit || btn.dataset.delete));
    if (!d) return;

    if (btn.dataset.edit) {
      fillForm(d);
      return;
    }
    if (!window.confirm(`Hapus dokumen "${d.judul}"? File di Google Drive tidak ikut terhapus.`)) return;
    btn.disabled = true;
    try {
      await API.del(`delete-dokumen?id=${encodeURIComponent(d.id)}`);
      if (form.id.value === d.id) resetForm();
      showAlert(alertEl, 'Dokumen dihapus.', 'success');
      await load();
    } catch (err) {
      showAlert(alertEl, err.message);
      btn.disabled = false;
    }
  });

  [searchInput, jenisFilter, statusFilter].forEach((el) => el.addEventListener('input', render));
  document.getElementById('dokumen-filter').addEventListener('submit', (e) => e.preventDefault());

  resetForm();
  load();
})();
