/* ── DASHBOARD GRAFİKLERİ ── */

async function updateMarkaChart() {
  try {
    const sezon = document.getElementById('sezon-select')?.value || '';
    const payload = await fetch(
      '/api/analiz/marka-performans' +
      '?cinsiyet=' + encodeURIComponent(currentCinsiyetler.join(',')) +
      '&ana_grup='  + encodeURIComponent(currentAnaGrupList.join(',')) +
      '&sezon='     + encodeURIComponent(sezon)
    ).then(r => r.json());

    const raw = payload.markalar || [];
    if (!raw.length) return;

    const totalCiro = raw.reduce((s, d) => s + (parseFloat(d.toplam_ciro) || 0), 0);
    const ST_CUT    = window.MARKA_ST_CUT || 0.50;
    const GM_CUT    = window.MARKA_GM_CUT || 15;
    const c         = _temaRenkleri();
    const isDark    = document.body.classList.contains('dark');

    const TIERS = {
      star:   { light: 'rgba(22,163,74,0.82)',   dark: 'rgba(82,115,92,0.80)',   hex: '#16a34a', solid: '#15803d', label: 'Yıldız'        },
      niche:  { light: 'rgba(37,99,235,0.82)',   dark: 'rgba(85,110,148,0.80)',  hex: '#2563EB', solid: '#1D4ED8', label: 'Niş'           },
      volume: { light: 'rgba(156,163,175,0.82)', dark: 'rgba(120,125,132,0.78)', hex: '#9CA3AF', solid: '#4B5563', label: 'Hacim'         },
      low:    { light: 'rgba(214,69,69,0.82)',   dark: 'rgba(148,88,88,0.80)',   hex: '#D64545', solid: '#B91C1C', label: 'Geliştirilmeli'},
    };
    const tierOf = (x, y) => x >= ST_CUT ? (y >= GM_CUT ? 'star' : 'volume') : (y >= GM_CUT ? 'niche' : 'low');
    const tColor = t => isDark ? TIERS[t].dark : TIERS[t].light;

    // P4: logaritmik yarıçap, max 36px
    const calcR = share => Math.min(Math.pow(share, 0.55) * 5 + 4, 24);

    const points = raw.map(d => {
      const ciro  = parseFloat(d.toplam_ciro) || 0;
      const x     = parseFloat(d.avg_st)      || 0;
      const y     = parseFloat(d.avg_gmroi)   || 0;
      const tier  = tierOf(x, y);
      const share = totalCiro > 0 ? ciro / totalCiro * 100 : 0;
      return {
        marka: d.marka || '?',
        x, y, ciro, kar: parseFloat(d.toplam_kar) || 0,
        share, tier, r: calcR(share),
        showLabel: share >= 8 || tier === 'star' || tier === 'low',
      };
    });

    if (markaBarChart) { markaBarChart.destroy(); markaBarChart = null; }
    const ctx = document.getElementById('marka-bar-chart')?.getContext('2d');
    if (!ctx) return;

    const mrkTip = ({ chart, tooltip }) => {
      let el = document.getElementById('ct-tip-marka');
      if (!el) { el = document.createElement('div'); el.className = 'ct-tip'; el.id = 'ct-tip-marka'; document.body.appendChild(el); }
      clearTimeout(el._ht);
      if (tooltip.opacity === 0) { el._ht = setTimeout(() => { el.style.opacity = '0'; el._idx = -1; }, 80); return; }
      const dp = tooltip.dataPoints?.[0]; if (!dp) return;
      if (el._idx !== dp.dataIndex) {
        el._idx = dp.dataIndex;
        const p = points[dp.dataIndex];
        el.innerHTML =
          '<div class="ct-tip-title">' + p.marka + '</div>' +
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Sell-Through</span><span class="ct-tip-val">' + fmtYuzde(p.x * 100) + '</span></div>' +
          '<div class="ct-tip-row"><span class="ct-tip-lbl">GMROI</span><span class="ct-tip-val">' + fmtSayi(p.y, 1) + '</span></div>' +
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Ciro</span><span class="ct-tip-val">' + fmtPara(p.ciro) + '</span></div>' +
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Kâr</span><span class="ct-tip-val">' + fmtPara(p.kar) + '</span></div>';
      }
      el.style.opacity = '1';
      const rect = chart.canvas.getBoundingClientRect();
      const bx = rect.left + dp.element.x, by = rect.top + dp.element.y;
      const tw = el.offsetWidth || 160, th = el.offsetHeight || 70;
      el.style.left = (bx + 14 + tw > window.innerWidth ? bx - tw - 8 : bx + 14) + 'px';
      el.style.top  = Math.max(8, Math.min(by - th / 2, window.innerHeight - th - 8)) + 'px';
    };

    markaBarChart = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [{
          data:            points.map(p => ({ x: p.x, y: p.y, r: p.r })),
          backgroundColor: points.map(p => tColor(p.tier)),
          borderColor:     '#ffffff',
          borderWidth:     2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 44, right: 32, bottom: 30, left: 12 } },
        plugins: {
          legend:  { display: false },
          tooltip: { enabled: false, external: mrkTip },
        },
        scales: {
          x: {
            min: 0, max: 1,
            ticks: { color: c.textMuted, font: { size: 10, family: "'DM Sans',sans-serif" }, callback: v => Math.round(v * 100) + '%', stepSize: 0.2 },
            grid: { display: false },
            border: { display: false },
            title: { display: true, text: 'SELL-THROUGH', color: isDark ? '#52525B' : '#9CA3AF', font: { size: 9, weight: '700', family: "'DM Sans',sans-serif" }, padding: { top: 6 } },
          },
          y: {
            beginAtZero: true,
            max: 40,
            ticks: { color: c.textMuted, font: { size: 10, family: "'DM Sans',sans-serif" }, stepSize: 5, callback: v => v },
            grid: { color: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6', lineWidth: 1 },
            border: { display: false },
            title: { display: true, text: 'GMROI', color: isDark ? '#52525B' : '#9CA3AF', font: { size: 9, weight: '700', family: "'DM Sans',sans-serif" }, padding: { bottom: 6 } },
          }
        },
        animation: { duration: 600, easing: 'easeOutQuart' }
      },
      plugins: [
        {
          id: 'mrkaTints',
          beforeDatasetsDraw(chart) {
            const { ctx: cx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
            const stPx = x.getPixelForValue(ST_CUT), gmPx = y.getPixelForValue(GM_CUT);
            cx.save();
            cx.fillStyle = isDark ? 'rgba(74,222,128,0.04)' : 'rgba(22,163,74,0.04)';
            cx.fillRect(stPx, top, right - stPx, gmPx - top);
            cx.fillStyle = isDark ? 'rgba(248,113,113,0.04)' : 'rgba(214,69,69,0.04)';
            cx.fillRect(left, gmPx, stPx - left, bottom - gmPx);
            cx.restore();
          }
        },
        {
          id: 'mrkaOverlay',
          afterDatasetsDraw(chart) {
            const { ctx: cx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
            const meta   = chart.getDatasetMeta(0);
            const bubbles = meta.data; // pixel positions of each bubble
            cx.save();

            // P5: kadran çizgileri 1.5px + eşik etiketleri
            const stPx = x.getPixelForValue(ST_CUT), gmPx = y.getPixelForValue(GM_CUT);
            cx.setLineDash([3, 4]); cx.lineWidth = 1.5; cx.strokeStyle = isDark ? '#3F3F46' : '#D1D5DB';
            cx.beginPath(); cx.moveTo(stPx, top);  cx.lineTo(stPx, bottom);  cx.stroke();
            cx.beginPath(); cx.moveTo(left, gmPx); cx.lineTo(right, gmPx);   cx.stroke();
            cx.setLineDash([]);

            cx.font = "600 9px 'DM Sans',sans-serif";
            cx.fillStyle = isDark ? '#52525B' : '#6B7280';
            cx.textAlign = 'left'; cx.textBaseline = 'top';
            cx.fillText('ST ' + Math.round(ST_CUT * 100) + '%', stPx + 3, top + 3);
            cx.textAlign = 'right'; cx.textBaseline = 'bottom';
            cx.fillText('GMROI ' + GM_CUT, right - 3, gmPx - 3);


            // P1: 16 açı tabanlı greedy label placement
            // Önce bubble pixel merkezlerini topla (etiket↔bubble çakışma için)
            const bMeta = points.map((_p, i) => {
              const b = bubbles[i];
              return b ? { bx: b.x, by: b.y, br: b.options.radius } : null;
            });

            const LH = 14, LPADX = 6;
            const placedBoxes = [];

            // Etiket↔bubble çakışma: rect ile circle kesişim
            function rectCircleOk(rx1, ry1, rx2, ry2, cbx, cby, cbr) {
              const nx = Math.max(rx1, Math.min(cbx, rx2));
              const ny = Math.max(ry1, Math.min(cby, ry2));
              return Math.hypot(nx - cbx, ny - cby) >= cbr - 1;
            }
            function noOverlap(box) {
              if (placedBoxes.some(b => box.x1 < b.x2 && box.x2 > b.x1 && box.y1 < b.y2 && box.y2 > b.y1)) return false;
              if (bMeta.some(b => b && !rectCircleOk(box.x1, box.y1, box.x2, box.y2, b.bx, b.by, b.br))) return false;
              return true;
            }

            // 16 yön açısı (derece → radyan)
            const ANGLES = [270,292,315,338,0,22,45,68,90,112,135,157,180,202,225,248].map(a => a * Math.PI / 180);

            cx.font = "600 10px 'DM Sans',sans-serif";

            // P1: büyükten küçüğe sırala
            const labelOrder = points
              .map((p, i) => ({ p, i }))
              .filter(({ p }) => p.showLabel)
              .sort((a, b) => b.p.share - a.p.share);

            labelOrder.forEach(({ p, i }) => {
              const bm = bMeta[i]; if (!bm) return;
              const { bx, by, br } = bm;
              const lbl = p.marka.length > 15 ? p.marka.slice(0, 14) + '…' : p.marka;
              const tw  = cx.measureText(lbl).width + LPADX * 2;
              const hw  = tw / 2, hh = LH / 2;
              let pos   = null;

              for (const ang of ANGLES) {
                const dist = br + Math.max(hw, hh) + 6;
                const lx   = bx + Math.cos(ang) * dist;
                const ly   = by + Math.sin(ang) * dist;
                const box  = { x1: lx - hw, y1: ly - hh, x2: lx + hw, y2: ly + hh };
                if (box.x1 < left + 2 || box.x2 > right - 2 || box.y1 < top + 2 || box.y2 > bottom - 2) continue;
                if (noOverlap(box)) { placedBoxes.push(box); pos = { lx, ly }; break; }
              }

              if (!pos) return;

              const { lx, ly } = pos;
              // leader-line
              const ang2 = Math.atan2(ly - by, lx - bx);
              cx.beginPath();
              cx.strokeStyle = isDark ? '#52525B' : '#9CA3AF'; cx.lineWidth = 0.6;
              cx.moveTo(bx + Math.cos(ang2) * (br + 1), by + Math.sin(ang2) * (br + 1));
              cx.lineTo(lx, ly); cx.stroke();

              // sade text: 2px white outline + koyu yazı
              cx.textAlign = 'center'; cx.textBaseline = 'middle';
              cx.strokeStyle = isDark ? 'rgba(28,28,32,0.7)' : 'rgba(255,255,255,0.9)';
              cx.lineWidth = 2; cx.lineJoin = 'round';
              cx.strokeText(lbl, lx, ly);
              cx.fillStyle = isDark ? '#D4D4D8' : '#18181B';
              cx.fillText(lbl, lx, ly);
            });

            cx.restore();
          }
        }
      ]
    });

    _mrkaFooter(points, ST_CUT, GM_CUT, isDark);
  } catch(e) { console.error('Marka scatter hatası:', e); }
}


function _mrkaFooter(points, stCut, gmCut, isDark) {
  const wrap = document.getElementById('marka-bar-chart')?.closest('.chart-card');
  if (!wrap) return;
  let el = wrap.querySelector('.mrka-footer');
  if (!el) {
    el = document.createElement('div');
    el.className = 'mrka-footer';
    el.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 4px 0;margin-top:12px;border-top:1px solid var(--border);font-size:12px;font-family:"DM Sans",sans-serif;';
    wrap.appendChild(el);
  }
  const muted = isDark ? '#71717A' : '#6B7280';
  const bold  = isDark ? '#D4D4D8' : '#18181B';
  el.innerHTML =
    '<span style="color:' + muted + '">Eşikler: ' +
    '<strong style="font-weight:600;color:' + bold + '">Sell-Through ' + Math.round(stCut * 100) + '%</strong> · ' +
    '<strong style="font-weight:600;color:' + bold + '">GMROI ' + gmCut + '</strong></span>' +
    '<span style="color:' + muted + '">' + points.length + ' marka · toplam cironun %1+\'ı</span>';
}



function _donutPalette(isDrillDown) {
  const dark = document.body.classList.contains('dark');
  if (isDrillDown) return dark ? DONUT_COLORS_EXT_DARK : DONUT_COLORS_EXT;
  return dark ? DONUT_COLORS_DARK : DONUT_COLORS;
}

async function updateDonutChart(donem) {
  try {
    const sezon = document.getElementById('sezon-select')?.value || '';
    const isDrillDown = currentAnaGrupList.length > 0;
    const palette = _donutPalette(isDrillDown);
    const url = '/api/analiz/kategori-dagilim?donem_tip='+currentPeriod+'&donem_deger='+encodeURIComponent(donem)+'&cinsiyet='+encodeURIComponent(currentCinsiyetler.join(','))+'&sezon='+encodeURIComponent(sezon)+(isDrillDown?'&ana_grup='+encodeURIComponent(currentAnaGrupList.join(',')):'');
    const rawData = await fetch(url).then(r=>r.json());
    if (!rawData.length) return;
    let displayData;
    if (isDrillDown && rawData.length > 3) {
      const top5=rawData.slice(0,3), rest=rawData.slice(3);
      displayData=[...top5,{label:'Diğer',toplam_satis:rest.reduce((s,d)=>s+(parseInt(d.toplam_satis)||0),0),toplam_ciro:rest.reduce((s,d)=>s+(parseFloat(d.toplam_ciro)||0),0),_othersCount:rest.length,_isOthers:true}];
    } else { displayData=rawData; }
    const total=displayData.reduce((s,d)=>s+(parseInt(d.toplam_satis)||0),0);
    const labels=displayData.map(d=>d.label);
    const values=displayData.map(d=>parseInt(d.toplam_satis)||0);
    const dark = document.body.classList.contains('dark');
    const othersColor = dark ? '#6B6B70' : '#d1d5db';
    const borderCol   = dark ? '#232328' : '#FDF2F2';
    const colors=displayData.map((d,i)=>d._isOthers?othersColor:palette[i%palette.length]);
    const grupLabel = currentAnaGrupList.length === 1 ? currentAnaGrupList[0] : 'Seçili Gruplar';
    const centerTitle = isDrillDown ? grupLabel : 'Tüm Ürünler';
    const titleEl = document.getElementById('donut-chart-title');
    if (titleEl) titleEl.textContent = isDrillDown ? grupLabel + ' — Alt Kategoriler' : 'Popüler Kategoriler';
    if(donutChart){
      donutChart._donutMeta={data:displayData,total,isDrillDown,centerTitle};
      donutChart.data.labels=labels;
      donutChart.data.datasets[0].data=values;
      donutChart.data.datasets[0].backgroundColor=colors;
      donutChart.data.datasets[0].borderColor=borderCol;
      donutChart.setActiveElements([]); donutChart.update();
    } else {
      const ctx=document.getElementById('donut-chart').getContext('2d');
      donutChart=new Chart(ctx,{
        type:'doughnut',
        data:{labels,datasets:[{data:values,backgroundColor:colors,borderWidth:2,borderColor:borderCol,hoverOffset:4,hoverBorderWidth:1.5}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:false},tooltip:{enabled:false}}},
        plugins:[{id:'center',afterDraw(chart){
          const{ctx,chartArea:{left,top,right,bottom}}=chart;
          const cx=(left+right)/2,cy=(top+bottom)/2;
          const active=chart.getActiveElements(),meta=chart._donutMeta||{};
          const c=_temaRenkleri();
          ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
          if(active&&active.length){
            const idx=active[0].index,item=(meta.data||[])[idx]||{};
            const val=parseInt(item.toplam_satis)||0,pct=meta.total>0?fmtSayi(val/meta.total*100,1):'0';
            ctx.fillStyle=c.textMuted; ctx.font='10px "DM Sans",sans-serif'; ctx.fillText(item._isOthers?item._othersCount+' Kategori':item.label||'',cx,cy-8);
            ctx.fillStyle=c.tooltipText; ctx.font='bold 14px "DM Sans",sans-serif'; ctx.fillText('%'+pct,cx,cy+8);
          } else {
            ctx.fillStyle=c.textMuted; ctx.font='10px "DM Sans",sans-serif'; ctx.fillText(meta.centerTitle||'Tüm Ürünler',cx,cy-8);
            ctx.fillStyle=c.tooltipText; ctx.font='bold 12px "DM Sans",sans-serif'; ctx.fillText(fmtSayi(meta.total||0),cx,cy+8);
          }
          ctx.restore();
        }}]
      });
      donutChart._donutMeta={data:displayData,total,isDrillDown,centerTitle};
    }
    document.getElementById('donut-legend').innerHTML=displayData.map((d,i)=>{
      const pct=total>0?fmtSayi((parseInt(d.toplam_satis)||0)/total*100,1):0;
      const ciroRaw=parseFloat(d.toplam_ciro)||0;
      const ciro=fmtPara(ciroRaw);
      const labelText=d._isOthers?'Diğer ('+d._othersCount+')':d.label;
      return '<div class="donut-legend-item"><div class="donut-legend-cat"><div class="donut-legend-dot" style="background:'+colors[i]+'"></div><div class="donut-legend-label">'+labelText+'</div></div><div class="donut-legend-pct"> %'+pct+'</div><div class="donut-legend-sep">·</div><div class="donut-legend-val">'+ciro+'</div></div>';
    }).join('');
  } catch(e) {}
}

async function updateKarliChart(donem) {
  try {
    const sezon = document.getElementById('sezon-select')?.value || '';
    const raw = await fetch('/api/analiz/en-karli-urunler?donem_tip='+currentPeriod+'&donem_deger='+donem+'&cinsiyet='+encodeURIComponent(currentCinsiyetler.join(','))+'&ana_grup='+encodeURIComponent(currentAnaGrupList.join(','))+'&sezon='+encodeURIComponent(sezon)+'&limit=10'+'&min_st='+(window.ESIK_MIN_ST_KAR||0.55)+'&max_cover='+(window.ESIK_MAX_COVER_KAR||10)).then(r=>r.json());
    if (!raw.length) return;
    if (karliChart) { karliChart.destroy(); karliChart = null; }
    const data = [...raw].sort((a, b) => (parseFloat(b.toplam_kar) || 0) - (parseFloat(a.toplam_kar) || 0));
    const ctx = document.getElementById('karli-chart').getContext('2d');
    const labels = data.map(d => d.stok_kodu || '---');
    const values = data.map(d => parseFloat(d.toplam_kar) || 0);
    const fmt = v => fmtPara(v);
    const karliExtTooltip = ({ chart, tooltip }) => {
      let el = document.getElementById('ct-tip-karli');
      if (!el) { el = document.createElement('div'); el.className = 'ct-tip'; el.id = 'ct-tip-karli'; document.body.appendChild(el); }
      clearTimeout(el._ht);
      if (tooltip.opacity === 0) { el._ht = setTimeout(() => { el.style.opacity = '0'; el._idx = -1; }, 80); return; }
      const dp = tooltip.dataPoints?.[0]; if (!dp) return;
      if (el._idx !== dp.dataIndex) {
        el._idx = dp.dataIndex;
        const d = data[dp.dataIndex];
        const ciro  = parseFloat(d.toplam_ciro)||0, kar = parseFloat(d.toplam_kar)||0;
        const gmroi = parseFloat(d.ort_gmroi)||0, cover = parseFloat(d.periyot_cover)||0, st = parseFloat(d.avg_st)||0;
        const ttl = d.stok_kodu + (d.stok_kodu_aciklama ? ' · ' + d.stok_kodu_aciklama : '');
        el.innerHTML =
          '<div class="ct-tip-title">'+ttl+'</div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Ciro</span><span class="ct-tip-val">'+fmt(ciro)+'</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl" style="color:'+_temaRenkleri().blue+'">Kâr</span><span class="ct-tip-val" style="color:'+_temaRenkleri().blue+'">'+fmt(kar)+'</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl">GMROI</span><span class="ct-tip-val">'+fmtSayi(gmroi,2)+'</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Cover</span><span class="ct-tip-val">'+fmtSayi(cover,1)+' hf</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl">ST</span><span class="ct-tip-val">'+fmtYuzde(st*100)+'</span></div>';
      }
      el.style.opacity = '1';
      const r = chart.canvas.getBoundingClientRect();
      const bx = r.left + dp.element.x, by = r.top + dp.element.y;
      const tw = el.offsetWidth || 190, th = el.offsetHeight || 100;
      el.style.left = (bx + 12 + tw > window.innerWidth ? bx - tw - 6 : bx + 12) + 'px';
      el.style.top  = Math.max(8, Math.min(by - th / 2, window.innerHeight - th - 8)) + 'px';
    };
    karliChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: _temaRenkleri().blue, borderColor: 'transparent', borderWidth: 0, borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: 'left', maxBarThickness: 18, categoryPercentage: 0.80, barPercentage: 0.85 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 4, right: 68, left: 4, bottom: 4 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false, external: karliExtTooltip } },
        scales: {
          x: { beginAtZero: true, display: false, grid: { display: false }, border: { display: false } },
          y: { ticks: { color: _temaRenkleri().textMuted, font: { size: 10, weight: '700', family: "'DM Sans', sans-serif" }, padding: 6, autoSkip: false }, grid: { display: false }, border: { display: false }, afterFit(scale) { scale.width = Math.max(scale.width, 78); } }
        },
        animation: { duration: 600, easing: 'easeOutQuart' }
      },
      plugins: [{ id: 'karliValueRight', afterDatasetsDraw(chart) {
        const { ctx } = chart, meta = chart.getDatasetMeta(0);
        ctx.save(); ctx.font = "600 10px 'DM Sans',sans-serif"; ctx.fillStyle = _temaRenkleri().text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        meta.data.forEach((bar, i) => { const v = values[i]; if (!v) return; ctx.fillText(fmt(v), bar.x + 6, bar.y); });
        ctx.restore();
      }}]
    });
  } catch(e) { console.error('Karli chart hatasi:', e); }
}

async function updateCiroChart(donem) {
  try {
    const sezon = document.getElementById('sezon-select')?.value || '';
    const raw = await fetch('/api/analiz/en-cok-ciro-urunler?donem_tip='+currentPeriod+'&donem_deger='+donem+'&cinsiyet='+encodeURIComponent(currentCinsiyetler.join(','))+'&ana_grup='+encodeURIComponent(currentAnaGrupList.join(','))+'&sezon='+encodeURIComponent(sezon)+'&limit=10'+'&min_st='+(window.ESIK_MIN_ST_CIRO||0.55)+'&max_cover='+(window.ESIK_MAX_COVER_CIRO||10)).then(r=>r.json());
    if (!raw.length) return;
    if (ciroChart) { ciroChart.destroy(); ciroChart = null; }
    const data = [...raw];
    const ctx = document.getElementById('ciro-chart').getContext('2d');
    const labels = data.map(d => d.stok_kodu || '---');
    const values = data.map(d => parseFloat(d.toplam_ciro) || 0);
    const fmt = v => fmtPara(v);
    const ciroExtTooltip = ({ chart, tooltip }) => {
      let el = document.getElementById('ct-tip-ciro');
      if (!el) { el = document.createElement('div'); el.className = 'ct-tip'; el.id = 'ct-tip-ciro'; document.body.appendChild(el); }
      clearTimeout(el._ht);
      if (tooltip.opacity === 0) { el._ht = setTimeout(() => { el.style.opacity = '0'; el._idx = -1; }, 80); return; }
      const dp = tooltip.dataPoints?.[0]; if (!dp) return;
      if (el._idx !== dp.dataIndex) {
        el._idx = dp.dataIndex;
        const d = data[dp.dataIndex];
        const ciro  = parseFloat(d.toplam_ciro)||0, kar = parseFloat(d.toplam_kar)||0;
        const gmroi = parseFloat(d.ort_gmroi)||0, cover = parseFloat(d.periyot_cover)||0, st = parseFloat(d.avg_st)||0;
        const ttl = d.stok_kodu + (d.stok_kodu_aciklama ? ' · ' + d.stok_kodu_aciklama : '');
        el.innerHTML =
          '<div class="ct-tip-title">'+ttl+'</div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl" style="color:'+_temaRenkleri().red+'">Ciro</span><span class="ct-tip-val" style="color:'+_temaRenkleri().red+'">'+fmt(ciro)+'</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Kâr</span><span class="ct-tip-val">'+fmt(kar)+'</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl">GMROI</span><span class="ct-tip-val">'+fmtSayi(gmroi,2)+'</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Cover</span><span class="ct-tip-val">'+fmtSayi(cover,1)+' hf</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl">ST</span><span class="ct-tip-val">'+fmtYuzde(st*100)+'</span></div>';
      }
      el.style.opacity = '1';
      const r = chart.canvas.getBoundingClientRect();
      const bx = r.left + dp.element.x, by = r.top + dp.element.y;
      const tw = el.offsetWidth || 190, th = el.offsetHeight || 100;
      el.style.left = (bx + 12 + tw > window.innerWidth ? bx - tw - 6 : bx + 12) + 'px';
      el.style.top  = Math.max(8, Math.min(by - th / 2, window.innerHeight - th - 8)) + 'px';
    };
    ciroChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: _temaRenkleri().red, borderColor: 'transparent', borderWidth: 0, borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: 'left', maxBarThickness: 18, categoryPercentage: 0.80, barPercentage: 0.85 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 4, right: 68, left: 4, bottom: 4 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false, external: ciroExtTooltip } },
        scales: {
          x: { beginAtZero: true, display: false, grid: { display: false }, border: { display: false } },
          y: { ticks: { color: _temaRenkleri().textMuted, font: { size: 10, weight: '700', family: "'DM Sans', sans-serif" }, padding: 6, autoSkip: false }, grid: { display: false }, border: { display: false }, afterFit(scale) { scale.width = Math.max(scale.width, 78); } }
        },
        animation: { duration: 600, easing: 'easeOutQuart' }
      },
      plugins: [{ id: 'ciroValueRight', afterDatasetsDraw(chart) {
        const { ctx } = chart, meta = chart.getDatasetMeta(0);
        ctx.save(); ctx.font = "600 10px 'DM Sans',sans-serif"; ctx.fillStyle = _temaRenkleri().text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        meta.data.forEach((bar, i) => { const v = values[i]; if (!v) return; ctx.fillText(fmt(v), bar.x + 6, bar.y); });
        ctx.restore();
      }}]
    });
  } catch(e) { console.error('Ciro chart hatasi:', e); }
}

async function updateKatPerfTable(donem) {
  try {
    const sezon = document.getElementById('sezon-select')?.value || '';
    const data = await fetch('/api/analiz/kategori-performans?donem_tip='+currentPeriod+'&donem_deger='+donem+'&cinsiyet='+encodeURIComponent(currentCinsiyetler.join(','))+'&ana_grup='+encodeURIComponent(currentAnaGrupList.join(','))+'&sezon='+encodeURIComponent(sezon)).then(r=>r.json());
    if (!data.length) return;
    data.sort((a,b)=>(parseFloat(b.avg_st)||0)-(parseFloat(a.avg_st)||0));
    const maxCiro = Math.max(...data.map(d=>parseFloat(d.toplam_ciro)||0));
    const _tc = _temaRenkleri();
    document.getElementById('kat-perf-body').innerHTML = data.map(d => {
      const ciro=parseFloat(d.toplam_ciro)||0, kar=parseFloat(d.toplam_kar)||0, mu=parseFloat(d.avg_mu)||0, st=parseFloat(d.avg_st)||0;
      const stPct=fmtSayi(st*100,1), barW=maxCiro>0?(ciro/maxCiro*100).toFixed(0):0;
      const stClass=st>=0.6?'st-good':st>=0.3?'st-mid':'st-bad';
      const stColor=st>=0.6?_tc.green:st>=0.3?_tc.yellow:_tc.red;
      const stBar='<div style="display:inline-flex;align-items:center;gap:6px;justify-content:flex-end;width:100%"><div style="width:56px;height:3px;background:var(--border-md);border-radius:2px;flex-shrink:0"><div style="width:'+Math.min(st*100,100).toFixed(0)+'%;height:3px;border-radius:2px;background:'+stColor+'"></div></div><span class="st-badge '+stClass+'">%'+stPct+'</span></div>';
      return '<tr><td><div style="font-weight:600">'+d.alt_kategori+'</div><div style="font-size:9px;color:#9ca3af">'+d.ana_grup+'</div></td><td>'+fmtSayi(d.toplam_satis)+'</td><td><div>'+fmtPara(ciro)+'</div><div class="kat-mini-bar" style="width:'+barW+'%;max-width:80px"></div></td><td>'+fmtPara(kar)+'</td><td>'+fmtSayi(mu,2)+'</td><td>'+stBar+'</td></tr>';
    }).join('');
  } catch(e) {}
}

function _renderLollipop(data) {
  const list = document.getElementById('lol-list');
  if (!list || !data.length) return;
  _lollipopData = data;

  const top10 = [...data].sort((a, b) => (parseInt(b.toplam_satis)||0) - (parseInt(a.toplam_satis)||0)).slice(0, 10);
  const max = Math.max(...top10.map(d => parseInt(d.toplam_satis)||0), 1);
  const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '—');

  list.innerHTML = top10.map((d, i) => {
    const val    = parseInt(d.toplam_satis) || 0;
    const pct    = (val / max) * 100;
    const topCls = i < 3 ? 'top' : '';
    const rank   = String(i + 1).padStart(2, '0');
    return `<div class="lol-row" data-idx="${i}">
      <span class="lol-rank ${topCls}">${rank}</span>
      <span class="lol-code" title="${d.stok_kodu||''}">${trunc(d.stok_kodu, 13)}</span>
      <div class="lol-track">
        <div class="lol-line-dashed"></div>
        <div class="lol-line-solid" style="width:${pct.toFixed(1)}%"></div>
        <div class="lol-dot ${topCls}" style="left:${pct.toFixed(1)}%"></div>
      </div>
      <span class="lol-value">${val.toLocaleString('tr-TR')}</span>
    </div>`;
  }).join('');

  const tt = document.getElementById('lollipop-tt');
  list.querySelectorAll('.lol-row').forEach(el => {
    el.addEventListener('mouseenter', function() {
      const d = top10[+this.dataset.idx];
      if (!d || !tt) return;
      tt.innerHTML =
        `<div class="lollipop-tt-name">${d.stok_kodu_aciklama || d.stok_kodu}</div>` +
        `<div class="lollipop-tt-row"><span class="lollipop-tt-lbl">Marka</span><span class="lollipop-tt-val">${d.marka || '—'}</span></div>` +
        `<div class="lollipop-tt-row"><span class="lollipop-tt-lbl">Satış Adedi</span><span class="lollipop-tt-val">${(parseInt(d.toplam_satis)||0).toLocaleString('tr-TR')} adet</span></div>` +
        `<div class="lollipop-tt-row"><span class="lollipop-tt-lbl">Ciro</span><span class="lollipop-tt-val">${fmt(parseFloat(d.toplam_ciro)||0)}</span></div>`;
    });
    el.addEventListener('mousemove', function(e) {
      if (!tt) return;
      const tw = tt.offsetWidth || 190, th = tt.offsetHeight || 80;
      let lx = e.clientX + 14, ly = e.clientY - th / 2;
      if (lx + tw > window.innerWidth - 8) lx = e.clientX - tw - 10;
      if (ly < 8) ly = 8;
      if (ly + th > window.innerHeight - 8) ly = window.innerHeight - th - 8;
      tt.style.left = lx + 'px'; tt.style.top = ly + 'px';
      tt.style.opacity = '1'; tt.style.visibility = 'visible';
    });
    el.addEventListener('mouseleave', function() {
      if (tt) { tt.style.opacity = '0'; tt.style.visibility = 'hidden'; }
    });
  });
}

async function updateLollipopChart() {
  try {
    const data = await fetch('/api/analiz/en-cok-satan-urunler?' + getBaseParams()).then(r => r.json());
    if (!data.length) return;
    _renderLollipop(data);
  } catch(e) { console.error('Lollipop chart hatası:', e); }
}
