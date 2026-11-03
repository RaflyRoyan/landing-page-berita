/* Seksi Kampung Pancasila di landing (index.html #kampung-pancasila). Konten statis.
   Wilayah, ringkasan, fokus, dan indikator pilar berasal dari dokumen profil RW 03 Tambakrejo.
   Angka diagram per bulan (bulan, kegiatanPerBulan, sampahPerBulan) MASIH CONTOH (dummy). */
(function () {
  const root = document.getElementById('kampung-pancasila');
  if (!root) return;

  const DATA = {
    wilayah: 'RW 03 Kelurahan Tambakrejo',
    periode: 'Januari – Oktober 2026',
    ringkasan: [
      { label: 'Rukun Tetangga', nilai: 9, satuan: 'RT' },
      { label: 'Indikator Kampung Pancasila', nilai: 42, satuan: '' },
      { label: 'Tahap penyaringan IPL CRT', nilai: 4, satuan: 'tahap' },
      { label: 'Lapangan rumput sintetis', nilai: 120, satuan: 'm' },
    ],
    // Empat pilar Kampung Pancasila Kota Surabaya. Kode indikator mengikuti dokumen.
    pilar: [
      {
        nama: 'Lingkungan',
        ikon: 'leaf',
        fokus: ['Pengelolaan sampah', 'Penghijauan & ketahanan pangan', 'Sanitasi & drainase', 'Kebersihan kawasan', 'Konservasi sumber daya'],
        indikator: [
          ['PL-01', 'Alur pengelolaan sampah tertata dan tercatat'],
          ['PL-02', 'Inovasi pengelolaan sampah organik berkelanjutan'],
          ['PL-03', 'Keberadaan dan operasional bank sampah lingkungan'],
          ['PL-04', 'Pemilahan sampah tingkat rumah tangga'],
          ['PL-05', 'Pelaksanaan kerja bakti lingkungan terjadwal'],
          ['PL-06', 'Sanitasi lingkungan dan bebas ODF (Stop BABS)'],
          ['PL-07', 'Pengendalian jentik nyamuk (ABJ ≥ 95%)'],
          ['PL-08', 'Ketahanan pangan (urban farming dan kolam ikan U-Ditch)'],
        ],
      },
      {
        nama: 'Ekonomi',
        ikon: 'coin',
        fokus: ['Sumber pendapatan alternatif', 'UMKM', 'Ekonomi sirkular', 'Produk lokal', 'Pemberdayaan ekonomi warga'],
        indikator: [
          ['PE-01', 'Data warga usia produktif belum bekerja dan fasilitasinya'],
          ['PE-02', 'Legalitas usaha mikro dan kecil (UMK)'],
          ['PE-03', 'Keterlibatan pemuda/Karang Taruna dalam nilai ekonomi'],
          ['PE-04', 'Pemasaran digital dan gerai komunitas bersama'],
          ['PE-05', 'Pengembangan wisata kampung dan produk unggulan'],
          ['PE-06', 'Donasi swadaya warga dan pengentasan kemiskinan (GAMIS)'],
          ['PE-07', 'Basis data pelaku UMK wilayah termutakhir'],
          ['PE-08', 'Tata kelola SOP pembagian hasil usaha produktif'],
        ],
      },
      {
        nama: 'Kemasyarakatan',
        ikon: 'shield',
        fokus: ['Kelembagaan & partisipasi', 'Gotong royong', 'Pelayanan sosial', 'Keamanan & ketertiban', 'Transparansi tata kelola'],
        indikator: [
          ['PK-01', 'Sistem deteksi dini dan pencegahan gangguan kamtibmas'],
          ['PK-02', 'Pelaksanaan patroli siskamling rutin'],
          ['PK-03', 'Pengawasan dan jam malam remaja di bawah 18 tahun'],
          ['PK-04', 'Pendekatan persuasif dengan melibatkan orang tua'],
          ['PK-05', 'Pembentukan tim tanggap bencana lingkungan'],
          ['PK-06', 'Rambu jalur evakuasi dan titik kumpul darurat'],
          ['PK-07', 'Edukasi pencegahan bahaya narkoba (P4GN)'],
          ['PK-08', 'Tertib administrasi kependudukan (Adminduk)'],
          ['PK-09', 'Kepedulian fasilitas penerangan jalan umum (PJU)'],
          ['PK-10', 'Sarana dan prasarana pos ronda siskamling'],
          ['PK-11', 'Penjadwalan rutin kerja bakti tingkat lingkungan'],
          ['PK-12', 'Persentase partisipasi warga dalam kerja bakti'],
          ['PK-13', 'Edukasi nomor darurat bebas pulsa (112 dan WA)'],
          ['PK-14', 'Laporan kamtibmas dan nihil kasus curanmor selama 1 tahun'],
          ['PK-15', 'Pemetaan area rawan konflik dan SOP mediasi'],
          ['PK-16', 'Pelatihan dan simulasi penanggulangan bencana'],
          ['PK-17', 'SOP musyawarah warga yang teratur dan notulen rapat'],
        ],
      },
      {
        nama: 'Sosial Budaya',
        ikon: 'heart',
        fokus: ['Pelestarian budaya lokal', 'Kegiatan sosial budaya', 'Pendidikan & literasi', 'Pembinaan generasi muda', 'Solidaritas sosial'],
        indikator: [
          ['PS-01', 'Identifikasi dan penanganan kasus anak putus sekolah'],
          ['PS-02', 'Bimbingan belajar (Sinau Bareng) di balai'],
          ['PS-03', 'Identifikasi dan pendampingan warga PPKS'],
          ['PS-04', 'Identifikasi dan advokasi rumah tidak layak huni (Rutilahu)'],
          ['PS-05', 'Ketahanan keluarga (PUSPAGA, SOTH, KASRPA)'],
          ['PS-06', 'Penerapan kawasan bebas asap rokok di ruang publik'],
          ['PS-07', 'Pemantauan kesehatan bumil dan balita serta pencegahan stunting'],
          ['PS-08', 'Promosi kesehatan dan penyuluhan bebas TB dan PHBS'],
          ['PS-09', 'Rukun kematian dan SOP regenerasi transisi kepengurusan'],
        ],
      },
    ],
    // Diagram di bawah ini masih data contoh
    bulan: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt'],
    kegiatanPerBulan: [5, 6, 8, 7, 9, 10, 8, 11, 12, 10],
    sampahPerBulan: [80, 95, 105, 110, 120, 130, 135, 145, 155, 165], // kg
  };

  const ICONS = {
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  };

  const fmt = (n) => Number(n).toLocaleString('id-ID');
  const el = (id) => document.getElementById(id);
  const esc = window.Util.escapeHtml;

  // ----- Teks, angka ringkas, kartu pilar -----
  el('kp-wilayah').textContent = DATA.wilayah;
  el('kp-periode').textContent = DATA.periode;

  el('kp-stats').innerHTML = DATA.ringkasan
    .map(
      (s) => `
      <div class="kp-stat">
        <span class="kp-stat-label">${esc(s.label)}</span>
        <span class="kp-stat-value">${fmt(s.nilai)}${s.satuan ? ` <small>${esc(s.satuan)}</small>` : ''}</span>
      </div>`
    )
    .join('');

  el('kp-pilar').innerHTML = DATA.pilar
    .map(
      (p) => `
      <article class="kp-pilar">
        <div class="kp-pilar-head">
          <span class="feature-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.ikon] || ''}</svg></span>
          <h3>${esc(p.nama)}</h3>
        </div>
        <p class="kp-pilar-count"><strong>${fmt(p.indikator.length)}</strong> indikator</p>
        <ul>${p.fokus.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <details class="kp-indikator">
          <summary>Lihat indikator</summary>
          <ol>${p.indikator.map(([kode, teks]) => `<li><span class="kp-kode">${esc(kode)}</span>${esc(teks)}</li>`).join('')}</ol>
        </details>
      </article>`
    )
    .join('');

  // ----- Diagram (SVG, digambar ulang saat lebar berubah) -----
  const NS = 'http://www.w3.org/2000/svg';
  const H = 220;
  const M = { top: 22, right: 12, bottom: 28, left: 36 };

  function svgEl(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  // Batas atas sumbu Y yang "bulat" + 4 jarak tick
  function niceScale(max) {
    const rough = max / 4;
    const pow = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough);
    return { max: step * 4, step };
  }

  // Sumbu, gridline, label bulan, tooltip, dan area hover per bulan (dipakai kedua diagram)
  function frame(box, values, { unit, label }) {
    box.querySelector('svg')?.remove();
    const W = Math.max(box.clientWidth, 260);
    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'kp-svg', 'aria-hidden': 'true' });
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;
    const { max, step } = niceScale(Math.max(...values));
    const band = innerW / values.length;
    const x = (i) => M.left + band * i + band / 2;
    const y = (v) => M.top + innerH - (v / max) * innerH;

    for (let t = 0; t <= max; t += step) {
      svg.appendChild(svgEl('line', { x1: M.left, x2: W - M.right, y1: y(t), y2: y(t), class: t ? 'kp-grid' : 'kp-axis' }));
      const tick = svgEl('text', { x: M.left - 6, y: y(t) + 4, class: 'kp-tick', 'text-anchor': 'end' });
      tick.textContent = fmt(t);
      svg.appendChild(tick);
    }
    DATA.bulan.forEach((b, i) => {
      const t = svgEl('text', { x: x(i), y: H - 8, class: 'kp-tick', 'text-anchor': 'middle' });
      t.textContent = b;
      svg.appendChild(t);
    });
    box.prepend(svg);

    const tip = box.querySelector('.kp-tooltip');
    const hits = svgEl('g', {});
    function show(i) {
      tip.replaceChildren();
      const v = document.createElement('strong');
      v.textContent = `${fmt(values[i])}${unit ? ` ${unit}` : ''}`;
      const l = document.createElement('span');
      l.textContent = `${label} · ${DATA.bulan[i]} 2026`;
      tip.append(v, l);
      tip.hidden = false;
      const left = Math.min(Math.max(x(i), 60), W - 60);
      tip.style.left = `${left}px`;
      tip.style.top = `${Math.max(y(values[i]) - 8, 0)}px`;
      box.dispatchEvent(new CustomEvent('kp-hover', { detail: i }));
    }
    function hide() {
      tip.hidden = true;
      box.dispatchEvent(new CustomEvent('kp-hover', { detail: -1 }));
    }
    values.forEach((_, i) => {
      const r = svgEl('rect', {
        x: M.left + band * i, y: M.top, width: band, height: innerH, class: 'kp-hit', tabindex: 0,
        role: 'img', 'aria-label': `${DATA.bulan[i]}: ${fmt(values[i])}${unit ? ` ${unit}` : ''}`,
      });
      r.addEventListener('pointerenter', () => show(i));
      r.addEventListener('focus', () => show(i));
      r.addEventListener('pointerleave', hide);
      r.addEventListener('blur', hide);
      hits.appendChild(r);
    });
    svg.removeAttribute('aria-hidden');
    return { svg, hits, x, y, band, innerH, W };
  }

  function columnChart(box, values, opts) {
    const { svg, hits, x, y, band } = frame(box, values, opts);
    const w = Math.min(24, band - 6);
    const base = y(0);
    const bars = values.map((v, i) => {
      const top = y(v);
      const r = Math.min(4, (base - top) / 2);
      const x0 = x(i) - w / 2;
      // Ujung data membulat 4px, pangkal di baseline tetap siku
      const d = `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + w - r}Q${x0 + w},${top} ${x0 + w},${top + r}V${base}Z`;
      const bar = svgEl('path', { d, class: 'kp-bar' });
      svg.appendChild(bar);
      return bar;
    });
    // Label hanya di nilai tertinggi
    const iMax = values.indexOf(Math.max(...values));
    const lbl = svgEl('text', { x: x(iMax), y: y(values[iMax]) - 6, class: 'kp-value', 'text-anchor': 'middle' });
    lbl.textContent = fmt(values[iMax]);
    svg.appendChild(lbl);
    svg.appendChild(hits);
    box.onkp = (e) => bars.forEach((b, i) => b.classList.toggle('is-active', i === e.detail));
  }

  function lineChart(box, values, opts) {
    const { svg, hits, x, y } = frame(box, values, opts);
    const pts = values.map((v, i) => `${x(i)},${y(v)}`);
    svg.appendChild(svgEl('path', { d: `M${pts.join('L')}L${x(values.length - 1)},${y(0)}L${x(0)},${y(0)}Z`, class: 'kp-area' }));
    svg.appendChild(svgEl('path', { d: `M${pts.join('L')}`, class: 'kp-line' }));
    const cross = svgEl('line', { y1: y(0), y2: 22, class: 'kp-cross', visibility: 'hidden' });
    svg.appendChild(cross);
    const dot = svgEl('circle', { r: 5, class: 'kp-dot', visibility: 'hidden' });
    svg.appendChild(dot);
    // Titik + label di nilai terakhir
    const last = values.length - 1;
    svg.appendChild(svgEl('circle', { cx: x(last), cy: y(values[last]), r: 4, class: 'kp-dot' }));
    const lbl = svgEl('text', { x: x(last), y: y(values[last]) - 10, class: 'kp-value', 'text-anchor': 'end' });
    lbl.textContent = `${fmt(values[last])} ${opts.unit}`;
    svg.appendChild(lbl);
    svg.appendChild(hits);
    box.onkp = (e) => {
      const i = e.detail;
      const on = i >= 0;
      cross.setAttribute('visibility', on ? 'visible' : 'hidden');
      dot.setAttribute('visibility', on ? 'visible' : 'hidden');
      if (!on) return;
      cross.setAttribute('x1', x(i));
      cross.setAttribute('x2', x(i));
      dot.setAttribute('cx', x(i));
      dot.setAttribute('cy', y(values[i]));
    };
  }

  // Tabel data di bawah diagram (tetap terbaca tanpa hover)
  function table(id, values, head) {
    el(id).innerHTML = `
      <thead><tr><th>Bulan</th><th>${esc(head)}</th></tr></thead>
      <tbody>${values.map((v, i) => `<tr><td>${esc(DATA.bulan[i])} 2026</td><td>${fmt(v)}</td></tr>`).join('')}</tbody>`;
  }

  const charts = [
    [el('kp-chart-kegiatan'), DATA.kegiatanPerBulan, { unit: 'kegiatan', label: 'Kegiatan' }, columnChart],
    [el('kp-chart-sampah'), DATA.sampahPerBulan, { unit: 'kg', label: 'Sampah terpilah' }, lineChart],
  ];
  charts.forEach(([box]) => box.addEventListener('kp-hover', (e) => box.onkp && box.onkp(e)));

  let lastWidth = 0;
  function drawAll() {
    const w = root.clientWidth;
    if (w === lastWidth) return;
    lastWidth = w;
    charts.forEach(([box, values, opts, draw]) => draw(box, values, opts));
  }
  table('kp-table-kegiatan', DATA.kegiatanPerBulan, 'Kegiatan');
  table('kp-table-sampah', DATA.sampahPerBulan, 'Sampah terpilah (kg)');
  drawAll();
  window.addEventListener('resize', drawAll);
})();
