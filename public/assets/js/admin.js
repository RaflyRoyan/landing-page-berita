/* Admin: login (admin/login.html) dan dashboard CRUD berita (admin/dashboard.html). */
(function () {
  const { escapeHtml, formatDate } = window.Util;
  const API = window.API;

  const MAX_WIDTH = 1600;
  const JPEG_QUALITY = 0.8;

  function showAlert(el, message, type = 'error') {
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.hidden = false;
  }

  // ===== Login =====
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    if (API.isTokenValid(API.getToken())) {
      window.location.replace('/admin/dashboard.html');
      return;
    }

    const alertEl = document.getElementById('login-alert');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      alertEl.hidden = true;
      try {
        const { token, user } = await API.post('login', {
          username: loginForm.username.value.trim(),
          password: loginForm.password.value,
        });
        API.setSession(token, user);
        window.location.replace('/admin/dashboard.html');
      } catch (err) {
        showAlert(alertEl, err.message);
        btn.disabled = false;
      }
    });
    return;
  }

  // ===== Dashboard =====
  const table = document.getElementById('berita-table');
  if (!table) return;

  if (!API.isTokenValid(API.getToken())) {
    API.clearSession();
    window.location.replace('/admin/login.html');
    return;
  }

  const user = API.getUser();
  document.getElementById('user-name').textContent = user.nama || user.username || '';

  const form = document.getElementById('berita-form');
  const formTitle = document.getElementById('form-title');
  const formAlert = document.getElementById('form-alert');
  const listAlert = document.getElementById('list-alert');
  const fotoInput = document.getElementById('foto');
  const preview = document.getElementById('foto-preview');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const tbody = table.querySelector('tbody');

  let items = [];
  let compressed = null; // { data, mimeType, filename }

  document.getElementById('logout-btn').addEventListener('click', () => {
    API.clearSession();
    window.location.replace('/admin/login.html');
  });

  // ----- Tabel -----
  async function loadList() {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Memuat...</td></tr>';
    try {
      const { data } = await API.get('get-berita');
      items = data;
      renderList();
    } catch (err) {
      tbody.innerHTML = '';
      showAlert(listAlert, err.message);
    }
  }

  function renderList() {
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Belum ada berita.</td></tr>';
      return;
    }
    tbody.innerHTML = items
      .map(
        (b) => `
        <tr>
          <td>${b.foto_url ? `<img class="thumb" src="${escapeHtml(b.foto_url)}" alt="" referrerpolicy="no-referrer">` : '<div class="thumb"></div>'}</td>
          <td>
            <strong>${escapeHtml(b.judul)}</strong>
            <div class="meta">${escapeHtml(b.kategori || '-')}</div>
          </td>
          <td><span class="badge ${b.status === 'publish' ? '' : 'badge-draft'}">${escapeHtml(b.status)}</span></td>
          <td>${escapeHtml(formatDate(b.tanggal))}</td>
          <td class="actions">
            <button class="btn btn-ghost btn-sm" data-edit="${escapeHtml(b.id)}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${escapeHtml(b.id)}">Hapus</button>
          </td>
        </tr>`
      )
      .join('');
  }

  tbody.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const deleteId = e.target.getAttribute('data-delete');

    if (editId) {
      const b = items.find((x) => x.id === editId);
      if (b) fillForm(b);
    }

    if (deleteId) {
      const b = items.find((x) => x.id === deleteId);
      if (!b || !window.confirm(`Hapus berita "${b.judul}"?`)) return;
      e.target.disabled = true;
      try {
        await API.del(`delete-berita?id=${encodeURIComponent(deleteId)}`);
        if (form.id.value === deleteId) resetForm();
        showAlert(listAlert, 'Berita dihapus.', 'success');
        await loadList();
      } catch (err) {
        showAlert(listAlert, err.message);
        e.target.disabled = false;
      }
    }
  });

  // ----- Form -----
  function fillForm(b) {
    form.id.value = b.id;
    form.judul.value = b.judul;
    form.ringkasan.value = b.ringkasan;
    form.isi.value = b.isi;
    form.kategori.value = b.kategori;
    form.status.value = b.status || 'draft';
    form.foto_id.value = b.foto_id || '';
    fotoInput.value = '';
    compressed = null;
    if (b.foto_url) {
      preview.src = b.foto_url;
      preview.hidden = false;
    } else {
      preview.hidden = true;
    }
    formTitle.textContent = 'Edit Berita';
    submitBtn.textContent = 'Simpan Perubahan';
    cancelBtn.hidden = false;
    formAlert.hidden = true;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetForm() {
    form.reset();
    form.id.value = '';
    form.foto_id.value = '';
    compressed = null;
    preview.hidden = true;
    preview.removeAttribute('src');
    formTitle.textContent = 'Tambah Berita';
    submitBtn.textContent = 'Simpan';
    cancelBtn.hidden = true;
  }

  cancelBtn.addEventListener('click', () => {
    resetForm();
    formAlert.hidden = true;
  });

  // Kompres gambar di browser: max lebar 1600px, JPEG kualitas 0.8
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        // Latar putih agar PNG transparan tidak jadi hitam di JPEG
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve({
          dataUrl,
          data: dataUrl.split(',')[1],
          mimeType: 'image/jpeg',
          filename: file.name.replace(/\.[^.]+$/, '') + '.jpg',
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('File bukan gambar yang valid'));
      };
      img.src = url;
    });
  }

  fotoInput.addEventListener('change', async () => {
    compressed = null;
    const file = fotoInput.files[0];
    if (!file) return;
    try {
      compressed = await compressImage(file);
      preview.src = compressed.dataUrl;
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
        const { fileId } = await API.post('upload-foto', {
          filename: compressed.filename,
          mimeType: compressed.mimeType,
          data: compressed.data,
        });
        form.foto_id.value = fileId;
        compressed = null;
      }

      submitBtn.textContent = 'Menyimpan...';
      const payload = {
        judul: form.judul.value.trim(),
        ringkasan: form.ringkasan.value.trim(),
        isi: form.isi.value,
        kategori: form.kategori.value.trim(),
        status: form.status.value,
        foto_id: form.foto_id.value,
      };

      if (form.id.value) {
        await API.put('update-berita', { id: form.id.value, ...payload });
        showAlert(listAlert, 'Berita diperbarui.', 'success');
      } else {
        await API.post('create-berita', payload);
        showAlert(listAlert, 'Berita ditambahkan.', 'success');
      }

      resetForm();
      await loadList();
    } catch (err) {
      showAlert(formAlert, err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = form.id.value ? 'Simpan Perubahan' : 'Simpan';
    }
  });

  loadList();
})();
