const crypto = require('crypto');
const { appendRow, uniqueSlug } = require('./utils/sheets');
const { normalize, findKategoriByName } = require('./utils/kategori');
const { verifyToken } = require('./utils/auth-check');
const { json, methodNotAllowed, parseBody, serverError } = require('./utils/http');

const STATUS = ['draft', 'publish'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);

  try {
    const user = verifyToken(event);
    if (!user) return json(401, { error: 'Tidak terautentikasi' });

    const body = parseBody(event);
    const judul = String(body.judul || '').trim();
    if (!judul) return json(400, { error: 'Judul wajib diisi' });

    const status = body.status || 'draft';
    if (!STATUS.includes(status)) return json(400, { error: 'Status harus draft atau publish' });

    // Kategori boleh kosong; jika diisi harus ada di master (pakai penulisan dari master)
    let kategori = normalize(body.kategori);
    if (kategori) {
      const master = await findKategoriByName(kategori);
      if (!master) return json(400, { error: `Kategori "${kategori}" tidak ada di master kategori` });
      kategori = master.nama;
    }

    const berita = {
      id: crypto.randomUUID(),
      judul,
      slug: await uniqueSlug('berita', judul),
      ringkasan: String(body.ringkasan || '').trim(),
      isi: String(body.isi || ''),
      foto_id: String(body.foto_id || ''),
      kategori,
      status,
      tanggal: new Date().toISOString(),
      penulis: user.nama || user.username,
    };

    await appendRow('berita', berita);
    return json(201, { data: berita });
  } catch (err) {
    return serverError(err);
  }
};
