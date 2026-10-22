/* Form tambah/edit berita (admin/berita-form.html, edit: ?id=). */
(function () {
  if (!window.Admin) return;
  const { showAlert, setFlash, prepareUpload, upload } = window.Admin;
  const { escapeHtml } = window.Util;
  const API = window.API;

  const LIST_URL = '/admin/berita.html';

  const editId = new URLSearchParams(window.location.search).get('id');
  const form = document.getElementById('berita-form');
  const formAlert = document.getElementById('form-alert');
  const fotoInput = document.getElementById('foto');
  const preview = document.getElementById('foto-preview');
  const submitBtn = document.getElementById('submit-btn');
  const submitLabel = editId ? 'Simpan Perubahan' : 'Simpan';

  let kategoriList = [];
  let compressed = null; // { data, mimeType, filename }

  if (editId) {
    document.title = 'Edit Berita — Warta';
    document.querySelector('.topbar-title').textContent = 'Edit Berita';
  }
  submitBtn.textContent = submitLabel;

  // Dropdown kategori dari master. Nilai lama yang tidak ada di master tetap ditampilkan.
  function renderKategoriSelect(current) {
    const options = ['<option value="">— Tanpa kategori —</option>'];
    kategoriList.forEach((k) => {
      options.push(`<option value="${escapeHtml(k.nama)}">${escapeHtml(k.nama)}</option>`);
    });
    if (current && !kategoriList.some((k) => k.nama === current)) {
      options.push(`<option value="${escapeHtml(current)}">${escapeHtml(current)} (tidak ada di master)</option>`);
    }
    form.kategori.innerHTML = options.join('');
    form.kategori.value = current || '';
  }

  function fillForm(b) {
    form.judul.value = b.judul;
    form.ringkasan.value = b.ringkasan;
    form.isi.value = b.isi;
    form.status.value = b.status || 'draft';
    form.foto_id.value = b.foto_id || '';
    renderKategoriSelect(b.kategori);
    if (b.foto_url) {
      preview.src = b.foto_url;
      preview.hidden = false;
    }
  }

  async function load() {
    const fieldset = form.querySelector('fieldset');
    fieldset.disabled = true;
    try {
      const [{ data: kategori }, berita] = await Promise.all([
        API.get('get-kategori'),
        editId ? API.get(`get-berita?id=${encodeURIComponent(editId)}`) : null,
      ]);
      kategoriList = kategori;
      if (berita) fillForm(berita.data);
      else renderKategoriSelect('');
      fieldset.disabled = false;
      form.judul.focus();
    } catch (err) {
      showAlert(formAlert, err.status === 404 ? 'Berita tidak ditemukan.' : err.message);
    }
  }

  fotoInput.addEventListener('change', async () => {
    compressed = null;
    const file = fotoInput.files[0];
    if (!file) return;
    try {
      compressed = await prepareUpload(file);
      preview.src = compressed.previewUrl;
      preview.hidden = false;
      formAlert.hidden = true;
    } catch (err) {
      fotoInput.value = '';
      showAlert(formAlert, err.message);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formAlert.hidden = true;
    submitBtn.disabled = true;

    try {
      // 1. Upload foto dulu (jika ada file baru), 2. simpan foto_id ke berita
      if (compressed) {
        submitBtn.textContent = 'Mengunggah foto...';
        const { fileId } = await upload(compressed, 'berita');
        form.foto_id.value = fileId;
        compressed = null;
      }

      submitBtn.textContent = 'Menyimpan...';
      const payload = {
        judul: form.judul.value.trim(),
        ringkasan: form.ringkasan.value.trim(),
        isi: form.isi.value,
        kategori: form.kategori.value,
        status: form.status.value,
        foto_id: form.foto_id.value,
      };

      if (editId) {
        await API.put('update-berita', { id: editId, ...payload });
        setFlash('Berita diperbarui.');
      } else {
        await API.post('create-berita', payload);
        setFlash('Berita ditambahkan.');
      }
      window.location.href = LIST_URL;
    } catch (err) {
      showAlert(formAlert, err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });

  load();
})();
