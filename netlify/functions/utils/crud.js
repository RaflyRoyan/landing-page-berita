const crypto = require('crypto');
const { getRows, appendRow, updateRowById, deleteRowById } = require('./sheets');
const { verifyToken } = require('./auth-check');
const { json, methodNotAllowed, parseBody, serverError } = require('./http');

// Error dengan status HTTP; pesannya diteruskan ke klien oleh serverError()
function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Bungkus handler: cek method, cek JWT (auth: true = wajib login), tangkap error.
// run({ event, user, query }) mengembalikan respons json(...).
function createHandler({ methods, auth = true, run }) {
  return async (event) => {
    if (!methods.includes(event.httpMethod)) return methodNotAllowed(methods);
    try {
      const user = verifyToken(event);
      if (auth && !user) return json(401, { error: 'Tidak terautentikasi' });
      return await run({ event, user, query: event.queryStringParameters || {} });
    } catch (err) {
      return serverError(err);
    }
  };
}

function labelOf(name, def) {
  return def.label || name.charAt(0).toUpperCase() + name.slice(1);
}

// Bersihkan & validasi satu nilai sesuai definisi field. Return string (Sheets menyimpan teks).
function cleanValue(name, def, raw) {
  const label = labelOf(name, def);
  const type = def.type || 'string';

  if (type === 'boolean') return raw === true || raw === 'true' ? 'true' : 'false';

  if (type === 'number') {
    if (raw === undefined || raw === null || raw === '') {
      if (def.required) throw httpError(400, `${label} wajib diisi`);
      return '';
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) throw httpError(400, `${label} harus berupa angka`);
    return String(n);
  }

  let value = String(raw === undefined || raw === null ? '' : raw);
  value = def.normalize ? value.trim().replace(/\s+/g, ' ') : value.trim();
  if (def.required && !value) throw httpError(400, `${label} wajib diisi`);
  if (def.max && value.length > def.max) throw httpError(400, `${label} maksimal ${def.max} karakter`);
  if (value && def.options && !def.options.includes(value)) {
    throw httpError(400, `${label} harus salah satu dari: ${def.options.join(', ')}`);
  }
  return value;
}

// partial = true (update): hanya field yang dikirim yang divalidasi & diubah
function validate(fields, body, { partial = false } = {}) {
  const data = {};
  Object.entries(fields).forEach(([name, def]) => {
    if (body[name] === undefined) {
      if (partial) return;
      data[name] = cleanValue(name, def, typeof def.default === 'function' ? def.default() : def.default);
      return;
    }
    data[name] = cleanValue(name, def, body[name]);
  });
  return data;
}

// Field dengan unique: true tidak boleh sama dengan baris lain (tanpa beda huruf besar/kecil)
function checkUnique(fields, rows, data, excludeId) {
  Object.entries(fields).forEach(([name, def]) => {
    if (!def.unique || !data[name]) return;
    const value = data[name].toLowerCase();
    if (rows.some((r) => r.id !== excludeId && String(r[name] || '').toLowerCase() === value)) {
      const message = def.uniqueMessage
        ? def.uniqueMessage(data[name])
        : `${labelOf(name, def)} "${data[name]}" sudah dipakai`;
      throw httpError(409, message);
    }
  });
}

function strip(row) {
  const { _row, ...rest } = row;
  return rest;
}

/*
  CRUD standar untuk satu tab Google Sheets. Tab wajib punya kolom `id`.
  Opsi:
    sheet         nama tab
    label         nama data untuk pesan error, mis. 'Kategori' → "Kategori tidak ditemukan"
    fields        { nama: { required, max, type: 'string'|'number'|'boolean', options, normalize,
                    unique, uniqueMessage, default, label } }
    sort          fungsi pembanding untuk list
    publicFilter  baris yang boleh dilihat publik (tanpa login); admin melihat semua
    toPublic      ubah baris sebelum dikirim, mis. tambah URL foto
    prepare       ({ data, user, existing }) → data tambahan sebelum disimpan (existing = null saat create)
    afterUpdate   (sebelum, sesudah) → objek tambahan untuk respons update
    beforeDelete  (baris) → lempar httpError untuk menolak hapus
  Return handler { list, create, update, remove } untuk dipasang di file function:
    exports.handler = resource.list;
*/
function defineResource(opts) {
  const { sheet, label = 'Data', fields } = opts;
  const toPublic = opts.toPublic || ((row) => row);
  const notFound = () => httpError(404, `${label} tidak ditemukan`);

  const list = createHandler({
    methods: ['GET'],
    auth: false,
    run: async ({ user, query }) => {
      let rows = await getRows(sheet);
      if (!user && opts.publicFilter) rows = rows.filter(opts.publicFilter);

      // Respons admin tidak boleh di-cache publik
      const cacheHeader = user
        ? { 'Cache-Control': 'private, no-store' }
        : { 'Cache-Control': 'public, max-age=60' };

      if (query.id) {
        const found = rows.find((r) => r.id === query.id);
        if (!found) throw notFound();
        return json(200, { data: toPublic(strip(found)) }, cacheHeader);
      }

      if (opts.sort) rows.sort(opts.sort);
      return json(200, { data: rows.map((r) => toPublic(strip(r))) }, cacheHeader);
    },
  });

  const create = createHandler({
    methods: ['POST'],
    run: async ({ event, user }) => {
      let data = validate(fields, parseBody(event));
      checkUnique(fields, await getRows(sheet), data);
      if (opts.prepare) data = { ...data, ...(await opts.prepare({ data, user, existing: null })) };

      const record = { id: crypto.randomUUID(), ...data };
      await appendRow(sheet, record);
      return json(201, { data: toPublic(record) });
    },
  });

  const update = createHandler({
    methods: ['PUT', 'PATCH'],
    run: async ({ event, user, query }) => {
      const body = parseBody(event);
      const id = body.id || query.id;
      if (!id) throw httpError(400, 'id wajib diisi');

      const rows = await getRows(sheet);
      const existing = rows.find((r) => r.id === id);
      if (!existing) throw notFound();

      let data = validate(fields, body, { partial: true });
      checkUnique(fields, rows, data, id);
      if (opts.prepare) data = { ...data, ...(await opts.prepare({ data, user, existing: strip(existing) })) };

      const updated = strip(await updateRowById(sheet, id, data));
      const extra = opts.afterUpdate ? await opts.afterUpdate(strip(existing), updated) : {};
      return json(200, { data: toPublic(updated), ...extra });
    },
  });

  const remove = createHandler({
    methods: ['DELETE', 'POST'],
    run: async ({ event, query }) => {
      const id = query.id || parseBody(event).id;
      if (!id) throw httpError(400, 'id wajib diisi');

      const existing = (await getRows(sheet)).find((r) => r.id === id);
      if (!existing) throw notFound();
      if (opts.beforeDelete) await opts.beforeDelete(strip(existing));

      await deleteRowById(sheet, id);
      return json(200, { success: true, id });
    },
  });

  return { list, create, update, remove };
}

module.exports = { defineResource, createHandler, httpError, validate };
