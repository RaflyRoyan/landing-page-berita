/* Helper reservasi kunjungan, dipakai landing (#reservasi), reservasi.html, dan admin/reservasi.html:
   ambil jadwal terisi, hitung jam mulai yang bebas, gambar kalender bulan dan lini waktu harian.
   Aturan (hari buka, jam, durasi, periode) datang dari server lewat jadwal-reservasi. */
(function () {
  const { escapeHtml } = window.Util;
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const toMenit = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + m;
  };
  const toJam = (menit) => `${String(Math.floor(menit / 60)).padStart(2, '0')}:${String(menit % 60).padStart(2, '0')}`;
  const fmtJam = (hhmm) => String(hhmm).replace(':', '.');
  const parse = (ymd) => new Date(`${ymd}T00:00:00Z`);
  const ymdOf = (d) => d.toISOString().slice(0, 10);

  // "Kamis, 5 November 2026"
  function fmtTanggal(ymd, { hari = true } = {}) {
    const d = parse(ymd);
    const teks = `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    return hari ? `${HARI[d.getUTCDay()]}, ${teks}` : teks;
  }

  async function load() {
    const { data } = await window.API.get('jadwal-reservasi');
    const byDate = {};
    data.terisi.forEach((t) => {
      (byDate[t.tanggal] = byDate[t.tanggal] || []).push(t);
    });
    return { ...data, byDate };
  }

  // Semua jam mulai di grid 30 menit untuk durasi tertentu; ok = tidak bentrok & selesai sebelum tutup
  function startOptions(config, booked, durasi) {
    const out = [];
    const tutup = toMenit(config.jamTutup);
    for (let s = toMenit(config.jamBuka); s + config.durasi[0] <= tutup; s += config.langkahMenit) {
      const e = s + Number(durasi);
      const ok = e <= tutup && !(booked || []).some((b) => toMenit(b.jam_mulai) < e && s < toMenit(b.jam_selesai));
      out.push({ jam: toJam(s), ok });
    }
    return out;
  }

  // luar (di luar periode) | libur | penuh | sebagian | kosong
  function statusTanggal(config, ymd, booked) {
    if (ymd < config.mulai || ymd > config.akhir) return 'luar';
    if (!config.hariBuka.includes(parse(ymd).getUTCDay())) return 'libur';
    if (!booked || !booked.length) return 'kosong';
    return startOptions(config, booked, config.durasi[0]).some((o) => o.ok) ? 'sebagian' : 'penuh';
  }

  const STATUS_LABEL = {
    kosong: 'masih kosong',
    sebagian: 'sebagian terisi',
    penuh: 'penuh',
    libur: 'libur',
    luar: 'belum dibuka',
  };

  /* Kalender bulan (Senin di kiri). opts: { config, byDate, month: 'YYYY-MM', selected, onSelect(ymd), onMonth(ym) }
     Tanggal yang bisa dipilih: kosong & sebagian. */
  function renderCalendar(el, opts) {
    const { config, byDate, month, selected } = opts;
    const [y, m] = month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7; // kolom Senin = 0
    const minMonth = config.mulai.slice(0, 7);
    const maxMonth = config.akhir.slice(0, 7);
    const shift = (n) => ymdOf(new Date(Date.UTC(y, m - 1 + n, 1))).slice(0, 7);

    const cells = [];
    for (let i = 0; i < lead; i += 1) cells.push('<span class="cal-cell cal-empty"></span>');
    for (let d = 1; d <= days; d += 1) {
      const ymd = `${month}-${String(d).padStart(2, '0')}`;
      const st = statusTanggal(config, ymd, byDate[ymd]);
      const label = `${fmtTanggal(ymd)}, ${STATUS_LABEL[st]}`;
      const cls = `cal-cell cal-${st}${ymd === selected ? ' is-selected' : ''}${ymd === config.hariIni ? ' is-today' : ''}`;
      cells.push(
        st === 'kosong' || st === 'sebagian'
          ? `<button type="button" class="${cls}" data-date="${ymd}" aria-label="${escapeHtml(label)}"${
              ymd === selected ? ' aria-pressed="true"' : ' aria-pressed="false"'
            }><span>${d}</span><i aria-hidden="true"></i></button>`
          : `<span class="${cls}" aria-label="${escapeHtml(label)}" role="img"><span>${d}</span><i aria-hidden="true"></i></span>`
      );
    }

    el.innerHTML = `
      <div class="cal-head">
        <button type="button" class="cal-nav" data-month="${shift(-1)}" aria-label="Bulan sebelumnya"${month <= minMonth ? ' disabled' : ''}>‹</button>
        <strong aria-live="polite">${BULAN[m - 1]} ${y}</strong>
        <button type="button" class="cal-nav" data-month="${shift(1)}" aria-label="Bulan berikutnya"${month >= maxMonth ? ' disabled' : ''}>›</button>
      </div>
      <div class="cal-grid" role="group" aria-label="Pilih tanggal">
        ${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((h) => `<span class="cal-dow">${h}</span>`).join('')}
        ${cells.join('')}
      </div>`;

    el.onclick = (e) => {
      const nav = e.target.closest('[data-month]');
      if (nav && !nav.disabled) opts.onMonth(nav.dataset.month);
      const day = e.target.closest('[data-date]');
      if (day) opts.onSelect(day.dataset.date);
    };
  }

  /* Lini waktu satu hari: blok terisi (menunggu / disetujui) + blok pilihan pengunjung (opsional) */
  function renderTimeline(el, config, booked, pilihan) {
    const buka = toMenit(config.jamBuka);
    const span = toMenit(config.jamTutup) - buka;
    const pos = (jam) => ((toMenit(jam) - buka) / span) * 100;
    const block = (a, b, cls, title) =>
      `<span class="tl-block ${cls}" style="left:${pos(a)}%;width:${pos(b) - pos(a)}%" title="${escapeHtml(title)}"></span>`;
    const ticks = [];
    for (let t = buka; t <= buka + span; t += 60) {
      ticks.push(`<span class="tl-tick" style="left:${((t - buka) / span) * 100}%">${fmtJam(toJam(t)).slice(0, 2)}</span>`);
    }
    const list = (booked || []).map(
      (b) => `<li><span class="tl-key tl-${b.status}" aria-hidden="true"></span>${fmtJam(b.jam_mulai)}–${fmtJam(b.jam_selesai)} · ${
        b.status === 'disetujui' ? 'terkonfirmasi' : 'menunggu konfirmasi'
      }</li>`
    );
    el.innerHTML = `
      <div class="tl-bar" aria-hidden="true">
        ${(booked || []).map((b) => block(b.jam_mulai, b.jam_selesai, `tl-${b.status}`, `${fmtJam(b.jam_mulai)}–${fmtJam(b.jam_selesai)}`)).join('')}
        ${pilihan ? block(pilihan.mulai, pilihan.selesai, 'tl-pilihan', 'Pilihan Anda') : ''}
      </div>
      <div class="tl-ticks" aria-hidden="true">${ticks.join('')}</div>
      <ul class="tl-list">${list.length ? list.join('') : '<li class="muted">Belum ada reservasi di tanggal ini.</li>'}</ul>`;
  }

  window.Reservasi = { load, startOptions, statusTanggal, renderCalendar, renderTimeline, fmtTanggal, fmtJam, toMenit, toJam };
})();
