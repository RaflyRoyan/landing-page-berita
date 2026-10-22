/* Master kategori (admin/kategori.html): tambah, ubah nama, hapus. */
(function () {
  if (!window.Admin) return;
  const { showAlert, icon } = window.Admin;
  const { escapeHtml } = window.Util;
  const API = window.API;

  const form = document.getElementById('kategori-form');
  const alertEl = document.getElementById('kategori-alert');
  const submitBtn = document.getElementById('kategori-submit');
  const cancelBtn = document.getElementById('kategori-cancel');
  const formTitle = document.getElementById('kategori-form-title');
  const tbody = document.querySelector('#kategori-table tbody');

  let kategoriList = [];
  let berita = [];

  const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

  async function load() {
    tbody.innerHTML = '<tr><td colspan="3" class="loading">Memuat...</td></tr>';
    try {
      // Daftar berita dipakai untuk menghitung jumlah berita per kategori
      const [{ data: kategori }, { data: rows }] = await Promise.all([
        API.get('get-kategori'),
        API.get('get-berita'),
      ]);
      kategoriList = kategori;
      berita = rows;
      render();
    } catch (err) {
      tbody.innerHTML = '';
      showAlert(alertEl, err.message);
    }
  }

  function render() {
    if (!kategoriList.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty">Belum ada kategori.</td></tr>';
      return;
    }
    tbody.innerHTML = kategoriList
      .map((k) => {
        const jumlah = berita.filter((b) => sameName(b.kategori, k.nama)).length;
        return `
        <tr>
          <td><strong>${escapeHtml(k.nama)}</strong></td>
          <td>${jumlah} berita</td>
          <td class="actions">
            <button class="icon-btn" type="button" data-edit="${escapeHtml(k.id)}" title="Ubah" aria-label="Ubah ${escapeHtml(k.nama)}">${icon('edit')}</button>
            <button class="icon-btn icon-btn-danger" type="button" data-delete="${escapeHtml(k.id)}" title="Hapus" aria-label="Hapus ${escapeHtml(k.nama)}">${icon('trash')}</button>
          </td>
        </tr>`;
      })
      .join('');
  }

  function resetForm() {
    form.reset();
    form.id.value = '';
    formTitle.textContent = 'Tambah Kategori';
    submitBtn.textContent = 'Tambah';
    cancelBtn.hidden = true;
  }

  cancelBtn.addEventListener('click', () => {
    resetForm();
    alertEl.hidden = true;
  });

  tbody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const deleteBtn = e.target.closest('[data-delete]');

    if (editBtn) {
      const k = kategoriList.find((x) => x.id === editBtn.getAttribute('data-edit'));
      if (!k) return;
      form.id.value = k.id;
      form.nama.value = k.nama;
      formTitle.textContent = 'Ubah Kategori';
      submitBtn.textContent = 'Simpan';
      cancelBtn.hidden = false;
      alertEl.hidden = true;
      form.nama.focus();
    }

    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-delete');
      const k = kategoriList.find((x) => x.id === id);
      if (!k || !window.confirm(`Hapus kategori "${k.nama}"?`)) return;
      deleteBtn.disabled = true;
      try {
        await API.del(`delete-kategori?id=${encodeURIComponent(id)}`);
        if (form.id.value === id) resetForm();
        showAlert(alertEl, 'Kategori dihapus.', 'success');
        await load();
      } catch (err) {
        showAlert(alertEl, err.message);
        deleteBtn.disabled = false;
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.hidden = true;
    submitBtn.disabled = true;
    const id = form.id.value;
    const nama = form.nama.value.trim();

    try {
      if (id) {
        const res = await API.put('update-kategori', { id, nama });
        const info = res.beritaDiperbarui ? ` ${res.beritaDiperbarui} berita ikut diperbarui.` : '';
        showAlert(alertEl, `Kategori diperbarui.${info}`, 'success');
      } else {
        await API.post('create-kategori', { nama });
        showAlert(alertEl, 'Kategori ditambahkan.', 'success');
      }
      resetForm();
      await load();
    } catch (err) {
      showAlert(alertEl, err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  load();
})();
