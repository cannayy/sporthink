/* ── MARKA ANALİZİ ── */

function _maKisalt(s, n) {
  return s && s.length > n ? s.slice(0, n) + '…' : (s || '—');
}

async function loadMarkaAnalizData() {
  try {
    const sezon = document.getElementById('sezon-select')?.value || '';
    const payload = await fetch(
      '/api/analiz/marka-performans' +
      '?cinsiyet=' + encodeURIComponent(currentCinsiyetler.join(',')) +
      '&ana_grup='  + encodeURIComponent(currentAnaGrupList.join(',')) +
      '&sezon='     + encodeURIComponent(sezon)
    ).then(r => r.json());
    _markaAnalizData = payload.markalar || [];
    _ozetCumleUret(_markaAnalizData);
    _renderMarkaCiroKar(_markaAnalizData);
    _renderMarkaSaglik(_markaAnalizData);
    _renderMarkaCoverAnaliz(_markaAnalizData);
    _renderMarkaCiroPay(_markaAnalizData);
    _renderMarkaTablo(_markaAnalizData);
  } catch(e) { console.error('Marka analiz hatası:', e); }
}

function _ozetCumleUret(data) {
  const band = document.getElementById('ma-ozet-band');
  if (!band || !data.length) return;

  const esikST    = window.ESIK_MIN_ST       || 0.55;
  const esikCover = window.ESIK_MAX_COVER_BS || 12;
  const esikGmroi = 1.5;

  const toplam = data.reduce((s, d) => s + (parseFloat(d.toplam_ciro)||0), 0);
  const sirali = [...data].sort((a, b) => (parseFloat(b.toplam_ciro)||0) - (parseFloat(a.toplam_ciro)||0));
  const enCiro    = sirali[0];
  const enCiroPay = toplam > 0 ? ((parseFloat(enCiro.toplam_ciro)||0) / toplam * 100) : 0;
  const enGmroi   = data.reduce((a, b) => (parseFloat(a.avg_gmroi)||0) > (parseFloat(b.avg_gmroi)||0) ? a : b);

  const riskliSayi = data.filter(d => {
    let fail = 0;
    if ((parseFloat(d.avg_st)||0)    < esikST)    fail++;
    if ((parseFloat(d.avg_cover)||0) > esikCover)  fail++;
    if ((parseFloat(d.avg_gmroi)||0) < esikGmroi)  fail++;
    return fail > 0;
  }).length;

  const parcalar = [];
  let seviye = 'normal';

  if (enCiroPay > 40) {
    parcalar.push(
      '<strong>' + _maKisalt(enCiro.marka, 18) + '</strong> portföyün ' +
      '<strong>%' + enCiroPay.toFixed(0) + '\'ini</strong> taşıyor — tek marka bağımlılığı yüksek'
    );
    seviye = 'uyari';
  }

  if (riskliSayi > 0) {
    parcalar.push(
      '<a class="ma-ozet-link" onclick="_riskVurgula()">' +
      '<strong>' + riskliSayi + ' markada</strong> stok riski var, aksiyona alınmalı</a>'
    );
    seviye = riskliSayi >= 2 ? 'kritik' : 'uyari';
  }

  parcalar.push('En verimli marka: <strong>' + _maKisalt(enGmroi.marka, 16) + '</strong>');

  let html;
  if (riskliSayi === 0 && enCiroPay <= 40) {
    html   = 'Portföy sağlıklı görünüyor, kritik risk tespit edilmedi &nbsp;·&nbsp; En verimli marka: <strong>' + _maKisalt(enGmroi.marka, 16) + '</strong>';
    seviye = 'normal';
  } else {
    html = parcalar.join(' &nbsp;·&nbsp; ');
  }

  band.className = 'ma-ozet-band ma-ozet-' + seviye;
  band.innerHTML = html;
}

function _riskVurgula() {
  const tablo = document.getElementById('ma-tablo-body');
  if (!tablo) return;
  const tableCard = tablo.closest('.chart-card');
  if (tableCard) tableCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  tablo.querySelectorAll('tr').forEach(row => {
    if (!row.querySelector('.ma-risk-acil, .ma-risk-izle, .ma-risk-dikkat')) return;
    row.classList.remove('ma-risk-highlight');
    void row.offsetWidth;
    row.classList.add('ma-risk-highlight');
    clearTimeout(row._rht);
    row._rht = setTimeout(() => row.classList.remove('ma-risk-highlight'), 2200);
  });
}

function _renderMarkaSaglik(data) {
  if (!data.length) return;
  const c      = _temaRenkleri();
  const isDark = document.body.classList.contains('dark');

  const points = data.map(d => ({
    x:     parseFloat(d.avg_st)||0,
    y:     parseFloat(d.avg_gmroi)||0,
    label: d.marka||'?',
    ciro:  parseFloat(d.toplam_ciro)||0
  }));

  const stVals    = [...points].map(p => p.x).sort((a,b) => a-b);
  const gmroiVals = [...points].map(p => p.y).sort((a,b) => a-b);
  const medST     = stVals[Math.floor(stVals.length/2)]    || 0.5;
  const medGmroi  = gmroiVals[Math.floor(gmroiVals.length/2)] || 2;

  const saglikTip = ({ chart, tooltip }) => {
    let el = document.getElementById('ct-tip-saglik');
    if (!el) { el = document.createElement('div'); el.className = 'ct-tip'; el.id = 'ct-tip-saglik'; document.body.appendChild(el); }
    clearTimeout(el._ht);
    if (tooltip.opacity === 0) { el._ht = setTimeout(() => { el.style.opacity='0'; el._idx=-1; }, 80); return; }
    const dp = tooltip.dataPoints?.[0]; if (!dp) return;
    if (el._idx !== dp.dataIndex) {
      el._idx = dp.dataIndex;
      const p = points[dp.dataIndex];
      el.innerHTML =
        '<div class="ct-tip-title">'+p.label+'</div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Sell Through</span><span class="ct-tip-val">'+fmtYuzde(p.x*100)+'</span></div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">GMROI</span><span class="ct-tip-val">'+fmtSayi(p.y,2)+'</span></div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Ciro</span><span class="ct-tip-val">'+fmt(p.ciro)+'</span></div>';
    }
    el.style.opacity = '1';
    const r = chart.canvas.getBoundingClientRect();
    const bx=r.left+dp.element.x, by=r.top+dp.element.y;
    const tw=el.offsetWidth||180, th=el.offsetHeight||90;
    el.style.left=(bx+12+tw>window.innerWidth?bx-tw-6:bx+12)+'px';
    el.style.top=Math.max(8,Math.min(by-th/2,window.innerHeight-th-8))+'px';
  };

  if (markaSaglikChart) { markaSaglikChart.destroy(); markaSaglikChart = null; }
  const ctx = document.getElementById('ma-scatter-chart')?.getContext('2d');
  if (!ctx) return;

  const bgAlpha  = isDark ? 0.08 : 0.06;
  const lblGreen = isDark ? 'rgba(74,222,128,0.65)'  : 'rgba(21,128,61,0.55)';
  const lblBlue  = isDark ? 'rgba(96,165,250,0.65)'  : 'rgba(37,99,235,0.55)';
  const lblAmber = isDark ? 'rgba(252,211,77,0.65)'  : 'rgba(180,83,9,0.55)';
  const lblRed   = isDark ? 'rgba(252,165,165,0.65)' : 'rgba(185,28,28,0.55)';

  markaSaglikChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        data: points,
        backgroundColor: isDark ? 'rgba(82,112,166,0.82)' : 'rgba(37,99,235,0.72)',
        borderColor:     isDark ? 'rgba(82,112,166,0.50)' : 'rgba(37,99,235,0.40)',
        borderWidth: 1,
        pointRadius: 7,
        pointHoverRadius: 9
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20, right: 40, left: 8, bottom: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external: saglikTip }
      },
      scales: {
        x: {
          title: { display: true, text: 'Sell Through →', color: c.textMuted, font: { size: 10, family: "'DM Sans',sans-serif" } },
          ticks: { color: c.textMuted, font: { size: 10 }, callback: v => fmtYuzde(v*100) },
          grid: { color: c.grid },
          border: { display: false }
        },
        y: {
          title: { display: true, text: 'GMROI →', color: c.textMuted, font: { size: 10, family: "'DM Sans',sans-serif" } },
          ticks: { color: c.textMuted, font: { size: 10 }, callback: v => fmtSayi(v,1) },
          grid: { color: c.grid },
          border: { display: false }
        }
      },
      animation: { duration: 500 }
    },
    plugins: [
      {
        id: 'maQuadrant',
        beforeDraw(chart) {
          const { ctx: cx, scales: { x, y }, chartArea: ca } = chart;
          const xm = x.getPixelForValue(medST), ym = y.getPixelForValue(medGmroi);
          cx.save();
          cx.fillStyle = `rgba(34,197,94,${bgAlpha})`;   cx.fillRect(xm, ca.top, ca.right-xm, ym-ca.top);
          cx.fillStyle = `rgba(37,99,235,${bgAlpha})`;   cx.fillRect(ca.left, ca.top, xm-ca.left, ym-ca.top);
          cx.fillStyle = `rgba(251,191,36,${bgAlpha})`;  cx.fillRect(xm, ym, ca.right-xm, ca.bottom-ym);
          cx.fillStyle = `rgba(220,38,38,${bgAlpha})`;   cx.fillRect(ca.left, ym, xm-ca.left, ca.bottom-ym);
          cx.setLineDash([4, 5]);
          cx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
          cx.lineWidth = 1;
          cx.beginPath(); cx.moveTo(xm, ca.top);    cx.lineTo(xm, ca.bottom); cx.stroke();
          cx.beginPath(); cx.moveTo(ca.left, ym);   cx.lineTo(ca.right, ym);  cx.stroke();
          cx.setLineDash([]);
          cx.font = "600 9px 'DM Sans',sans-serif";
          const pad = 7;
          cx.textBaseline = 'top';
          cx.fillStyle = lblGreen; cx.textAlign = 'right'; cx.fillText('Yıldız ★', ca.right - pad, ca.top + pad);
          cx.fillStyle = lblBlue;  cx.textAlign = 'left';  cx.fillText('Niş Karlı', ca.left + pad, ca.top + pad);
          cx.textBaseline = 'bottom';
          cx.fillStyle = lblAmber; cx.textAlign = 'right'; cx.fillText('Hacimli', ca.right - pad, ca.bottom - pad);
          cx.fillStyle = lblRed;   cx.textAlign = 'left';  cx.fillText('Problem', ca.left + pad, ca.bottom - pad);
          cx.restore();
        }
      },
      {
        id: 'maScatterLabels',
        afterDatasetsDraw(chart) {
          const { ctx: cx, scales: { x, y } } = chart;
          cx.save();
          cx.font = "500 9px 'DM Sans',sans-serif";
          cx.fillStyle = _temaRenkleri().textMuted;
          cx.textBaseline = 'bottom';
          points.forEach(p => {
            cx.fillText(_maKisalt(p.label, 10), x.getPixelForValue(p.x)+9, y.getPixelForValue(p.y)-2);
          });
          cx.restore();
        }
      }
    ]
  });
}

function _renderMarkaTablo(data) {
  const tbody = document.getElementById('ma-tablo-body');
  if (!tbody || !data.length) return;

  const esikST    = window.ESIK_MIN_ST       || 0.55;
  const esikCover = window.ESIK_MAX_COVER_BS || 12;
  const esikGmroi = 1.5;

  const withRisk = data.map(d => {
    const st    = parseFloat(d.avg_st)||0;
    const cover = parseFloat(d.avg_cover)||0;
    const gmroi = parseFloat(d.avg_gmroi)||0;
    const ciro  = parseFloat(d.toplam_ciro)||0;
    const kar   = parseFloat(d.toplam_kar)||0;
    const marj  = ciro > 0 ? (kar / ciro * 100) : 0;
    let fail = 0;
    if (st < esikST)      fail++;
    if (cover > esikCover) fail++;
    if (gmroi < esikGmroi) fail++;
    const [risk, rCls] = fail >= 3 ? ['Acil','ma-risk-acil']
      : fail === 2 ? ['İzle','ma-risk-izle']
      : fail === 1 ? ['Dikkat','ma-risk-dikkat']
      : ['Normal','ma-risk-normal'];
    return { d, st, cover, gmroi, marj, fail, risk, rCls };
  }).sort((a, b) => b.fail - a.fail || (parseFloat(b.d.toplam_ciro)||0) - (parseFloat(a.d.toplam_ciro)||0));

  const stCls    = st    => st >= 0.6    ? 'ma-bdg-green' : st < esikST    ? 'ma-bdg-red' : 'ma-bdg-amber';
  const coverCls = cover => cover > esikCover ? 'ma-bdg-red' : cover > 8    ? 'ma-bdg-amber' : '';
  const gmroiCls = g     => g >= 2.5     ? 'ma-bdg-green' : g < esikGmroi  ? 'ma-bdg-red'   : '';

  tbody.innerHTML = withRisk.map(({ d, st, cover, gmroi, marj, risk, rCls }) =>
    '<tr>'+
    '<td class="ma-marka-cell">'+_maKisalt(d.marka, 22)+'</td>'+
    '<td class="tc"><span class="ma-bdg '+stCls(st)+'">'+fmtYuzde(st*100)+'</span></td>'+
    '<td class="tc"><span class="ma-bdg '+coverCls(cover)+'">'+fmtSayi(cover,1)+' hf</span></td>'+
    '<td class="tc"><span class="ma-bdg '+gmroiCls(gmroi)+'">'+fmtSayi(gmroi,2)+'</span></td>'+
    '<td class="tc">'+fmtYuzde(marj)+'</td>'+
    '<td class="tc"><span class="ma-risk-badge '+rCls+'">'+risk+'</span></td>'+
    '</tr>'
  ).join('');
}

function _renderMarkaCiroKar(data) {
  if (!data.length) return;
  const c      = _temaRenkleri();
  const isDark = document.body.classList.contains('dark');
  const sorted = [...data].sort((a, b) => (parseFloat(b.toplam_ciro)||0) - (parseFloat(a.toplam_ciro)||0)).slice(0, 8);
  const labels   = sorted.map(d => _maKisalt(d.marka, 15));
  const ciroVals = sorted.map(d => parseFloat(d.toplam_ciro)||0);
  const karVals  = sorted.map(d => parseFloat(d.toplam_kar)||0);

  const ckTip = ({ chart, tooltip }) => {
    let el = document.getElementById('ct-tip-cirokar');
    if (!el) { el = document.createElement('div'); el.className = 'ct-tip'; el.id = 'ct-tip-cirokar'; document.body.appendChild(el); }
    clearTimeout(el._ht);
    if (tooltip.opacity === 0) { el._ht = setTimeout(() => { el.style.opacity='0'; el._idx=-1; }, 80); return; }
    const dp = tooltip.dataPoints?.[0]; if (!dp) return;
    if (el._idx !== dp.dataIndex) {
      el._idx = dp.dataIndex;
      const d = sorted[dp.dataIndex];
      el.innerHTML =
        '<div class="ct-tip-title">'+(d.marka||'—')+'</div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Ciro</span><span class="ct-tip-val">'+fmt(parseFloat(d.toplam_ciro)||0)+'</span></div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Kâr</span><span class="ct-tip-val">'+fmt(parseFloat(d.toplam_kar)||0)+'</span></div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Kâr Marjı</span><span class="ct-tip-val">'+fmtYuzde(parseFloat(d.toplam_ciro)>0?(parseFloat(d.toplam_kar)/parseFloat(d.toplam_ciro)*100):0)+'</span></div>';
    }
    el.style.opacity = '1';
    const r = chart.canvas.getBoundingClientRect();
    const bx = r.left+dp.element.x, by = r.top+dp.element.y;
    const tw = el.offsetWidth||190, th = el.offsetHeight||100;
    el.style.left = (bx+12+tw>window.innerWidth?bx-tw-6:bx+12)+'px';
    el.style.top  = Math.max(8, Math.min(by-th/2, window.innerHeight-th-8))+'px';
  };

  if (markaCiroKarChart) { markaCiroKarChart.destroy(); markaCiroKarChart = null; }
  const ctx = document.getElementById('ma-ciro-kar-chart')?.getContext('2d');
  if (!ctx) return;

  markaCiroKarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ciro',
          data: ciroVals,
          backgroundColor: isDark ? 'rgba(82,112,166,0.85)' : 'rgba(37,99,235,0.75)',
          borderColor: 'transparent',
          borderRadius: { topRight: 4, bottomRight: 4 },
          borderSkipped: 'left',
          maxBarThickness: 14,
          categoryPercentage: 0.70,
          barPercentage: 0.85
        },
        {
          label: 'Kâr',
          data: karVals,
          backgroundColor: isDark ? 'rgba(78,138,102,0.85)' : 'rgba(34,197,94,0.75)',
          borderColor: 'transparent',
          borderRadius: { topRight: 4, bottomRight: 4 },
          borderSkipped: 'left',
          maxBarThickness: 14,
          categoryPercentage: 0.70,
          barPercentage: 0.85
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 4, right: 110, left: 8, bottom: 4 } },
      plugins: {
        legend: {
          display: true, position: 'top', align: 'end',
          labels: { boxWidth: 10, boxHeight: 10, borderRadius: 3, usePointStyle: true, pointStyle: 'rect',
            color: c.textMuted, font: { size: 11, family: "'DM Sans',sans-serif" } }
        },
        tooltip: { enabled: false, external: ckTip }
      },
      scales: {
        x: { beginAtZero: true, display: false, grid: { display: false }, border: { display: false } },
        y: {
          ticks: { color: c.textMuted, font: { size: 11, family: "'DM Sans',sans-serif" }, padding: 8 },
          grid: { display: false },
          border: { display: false },
          afterFit(scale) { scale.width = Math.max(scale.width, 100); }
        }
      },
      animation: { duration: 500, easing: 'easeOutQuart' }
    },
    plugins: [{
      id: 'ckBarLabel',
      afterDatasetsDraw(chart) {
        const { ctx: cx } = chart;
        cx.save();
        cx.font = "600 10px 'DM Sans',sans-serif";
        cx.textAlign = 'left';
        cx.textBaseline = 'middle';
        cx.fillStyle = _temaRenkleri().text;
        [ciroVals, karVals].forEach((vals, di) => {
          const meta = chart.getDatasetMeta(di);
          meta.data.forEach((bar, i) => { if (vals[i]) cx.fillText(fmt(vals[i]), bar.x+6, bar.y); });
        });
        cx.restore();
      }
    }]
  });
}

function _renderMarkaCoverAnaliz(data) {
  if (!data.length) return;
  const c        = _temaRenkleri();
  const isDark   = document.body.classList.contains('dark');
  const threshold = window.ESIK_MAX_COVER_BS || 12;
  const sorted   = [...data].sort((a, b) => (parseFloat(b.avg_cover)||0) - (parseFloat(a.avg_cover)||0)).slice(0, 8);
  const labels   = sorted.map(d => _maKisalt(d.marka, 15));
  const values   = sorted.map(d => parseFloat(d.avg_cover)||0);
  const colors   = values.map(v => v > threshold
    ? (isDark ? 'rgba(180,83,9,0.85)'   : 'rgba(251,146,60,0.80)')
    : (isDark ? 'rgba(82,112,166,0.85)' : 'rgba(37,99,235,0.75)'));

  const cvTip = ({ chart, tooltip }) => {
    let el = document.getElementById('ct-tip-cover');
    if (!el) { el = document.createElement('div'); el.className = 'ct-tip'; el.id = 'ct-tip-cover'; document.body.appendChild(el); }
    clearTimeout(el._ht);
    if (tooltip.opacity === 0) { el._ht = setTimeout(() => { el.style.opacity='0'; el._idx=-1; }, 80); return; }
    const dp = tooltip.dataPoints?.[0]; if (!dp) return;
    if (el._idx !== dp.dataIndex) {
      el._idx = dp.dataIndex;
      const d = sorted[dp.dataIndex];
      el.innerHTML =
        '<div class="ct-tip-title">'+(d.marka||'—')+'</div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Cover</span><span class="ct-tip-val">'+fmtSayi(values[dp.dataIndex],1)+' hafta</span></div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Eşik</span><span class="ct-tip-val">'+threshold+' hafta</span></div>';
    }
    el.style.opacity = '1';
    const r = chart.canvas.getBoundingClientRect();
    const bx = r.left+dp.element.x, by = r.top+dp.element.y;
    const tw = el.offsetWidth||170, th = el.offsetHeight||80;
    el.style.left = (bx+12+tw>window.innerWidth?bx-tw-6:bx+12)+'px';
    el.style.top  = Math.max(8, Math.min(by-th/2, window.innerHeight-th-8))+'px';
  };

  if (markaCoverChart) { markaCoverChart.destroy(); markaCoverChart = null; }
  const ctx = document.getElementById('ma-cover-chart')?.getContext('2d');
  if (!ctx) return;

  markaCoverChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: 'transparent',
        borderRadius: { topRight: 5, bottomRight: 5 },
        borderSkipped: 'left',
        maxBarThickness: 22,
        categoryPercentage: 0.75,
        barPercentage: 0.85
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 16, right: 70, left: 8, bottom: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external: cvTip }
      },
      scales: {
        x: { beginAtZero: true, display: false, grid: { display: false }, border: { display: false } },
        y: {
          ticks: { color: c.textMuted, font: { size: 11, family: "'DM Sans',sans-serif" }, padding: 8 },
          grid: { display: false },
          border: { display: false },
          afterFit(scale) { scale.width = Math.max(scale.width, 100); }
        }
      },
      animation: { duration: 500, easing: 'easeOutQuart' }
    },
    plugins: [
      {
        id: 'coverLabel',
        afterDatasetsDraw(chart) {
          const { ctx: cx } = chart, meta = chart.getDatasetMeta(0);
          cx.save();
          cx.font = "600 10px 'DM Sans',sans-serif";
          cx.fillStyle = _temaRenkleri().text;
          cx.textAlign = 'left';
          cx.textBaseline = 'middle';
          meta.data.forEach((bar, i) => { if (values[i]) cx.fillText(fmtSayi(values[i],1)+' hf', bar.x+6, bar.y); });
          cx.restore();
        }
      },
      {
        id: 'coverThreshold',
        afterDraw(chart) {
          const { ctx: cx, scales: { x, y }, chartArea: ca } = chart;
          const xPx = x.getPixelForValue(threshold);
          if (xPx < ca.left || xPx > ca.right) return;
          cx.save();
          cx.setLineDash([5, 4]);
          cx.strokeStyle = isDark ? 'rgba(252,211,77,0.65)' : 'rgba(180,83,9,0.55)';
          cx.lineWidth = 1.5;
          cx.beginPath(); cx.moveTo(xPx, ca.top); cx.lineTo(xPx, ca.bottom); cx.stroke();
          cx.setLineDash([]);
          cx.font = "600 9px 'DM Sans',sans-serif";
          cx.fillStyle = isDark ? 'rgba(252,211,77,0.80)' : 'rgba(180,83,9,0.75)';
          cx.textAlign = 'center';
          cx.textBaseline = 'bottom';
          cx.fillText(threshold+' hf', xPx, ca.top - 2);
          cx.restore();
        }
      }
    ]
  });
}

function _renderMarkaCiroPay(data) {
  if (!data.length) return;
  const isDark = document.body.classList.contains('dark');
  const pal    = isDark ? DONUT_COLORS_EXT_DARK : DONUT_COLORS_EXT;
  const sorted = [...data].sort((a, b) => (parseFloat(b.toplam_ciro)||0) - (parseFloat(a.toplam_ciro)||0));
  const toplam = sorted.reduce((s, d) => s + (parseFloat(d.toplam_ciro)||0), 0);
  const labels  = sorted.map(d => d.marka || '?');
  const values  = sorted.map(d => parseFloat(d.toplam_ciro)||0);
  const percents = values.map(v => toplam > 0 ? (v / toplam * 100).toFixed(1) : '0.0');

  const legend = document.getElementById('ma-ciropay-legend');
  if (legend) {
    legend.innerHTML = sorted.map((d, i) =>
      '<div class="ma-donut-legend-item">'+
      '<span class="ma-donut-legend-dot" style="background:'+pal[i % pal.length]+'"></span>'+
      '<span class="ma-donut-legend-name">'+_maKisalt(d.marka, 14)+'</span>'+
      '<span class="ma-donut-legend-pct">'+percents[i]+'%</span>'+
      '</div>'
    ).join('');
  }

  const cpTip = ({ chart, tooltip }) => {
    let el = document.getElementById('ct-tip-ciropay');
    if (!el) { el = document.createElement('div'); el.className = 'ct-tip'; el.id = 'ct-tip-ciropay'; document.body.appendChild(el); }
    clearTimeout(el._ht);
    if (tooltip.opacity === 0) { el._ht = setTimeout(() => { el.style.opacity='0'; el._idx=-1; }, 80); return; }
    const dp = tooltip.dataPoints?.[0]; if (!dp) return;
    const i = dp.dataIndex;
    if (el._idx !== i) {
      el._idx = i;
      el.innerHTML =
        '<div class="ct-tip-title">'+labels[i]+'</div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Ciro</span><span class="ct-tip-val">'+fmt(values[i])+'</span></div>'+
        '<div class="ct-tip-row"><span class="ct-tip-lbl">Pay</span><span class="ct-tip-val">'+percents[i]+'%</span></div>';
    }
    el.style.opacity = '1';
    const r = chart.canvas.getBoundingClientRect();
    const bx = r.left+dp.element.x, by = r.top+dp.element.y;
    const tw = el.offsetWidth||160, th = el.offsetHeight||80;
    el.style.left = (bx+12+tw>window.innerWidth?bx-tw-6:bx+12)+'px';
    el.style.top  = Math.max(8, Math.min(by-th/2, window.innerHeight-th-8))+'px';
  };

  if (markaCiropayChart) { markaCiropayChart.destroy(); markaCiropayChart = null; }
  const ctx = document.getElementById('ma-ciropay-chart')?.getContext('2d');
  if (!ctx) return;

  markaCiropayChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: pal.slice(0, sorted.length),
        borderColor: isDark ? '#18181B' : '#FFFFFF',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external: cpTip }
      },
      animation: { duration: 600, easing: 'easeOutQuart' }
    }
  });
}
