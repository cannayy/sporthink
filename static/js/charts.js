/* ── KARANLIK MOD: GRAFİK RENKLERİ ─────────────────────────────────────── */
function _temaRenkleri() {
  const dark = document.body.classList.contains('dark');
  return {
    text:          dark ? '#B5B5B1' : '#374151',
    textMuted:     dark ? '#85857F' : '#6B7280',
    grid:          dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    gridBorder:    dark ? '#2D2D32' : '#E5E7EB',
    tooltipBg:     dark ? '#2A2A30' : '#FFFFFF',
    tooltipBorder: dark ? '#383840' : '#E5E7EB',
    tooltipText:   dark ? '#DEDEDA' : '#18181B',
    red:           dark ? '#A85650' : '#D64545',
    redDeep:       dark ? '#7A3A35' : '#C0392B',
    green:         dark ? '#4E8A66' : '#22C55E',
    blue:          dark ? '#5270A6' : '#3B82F6',
    yellow:        dark ? '#D9B470' : '#FBBF24',
    purple:        dark ? '#D9B470' : '#7C3AED',
    barBg:         dark ? '#27272B' : '#F3F4F6',
  };
}

function temayiGrafiklereUygula() {
  if (typeof Chart === 'undefined') return;
  const c = _temaRenkleri();
  Chart.defaults.color = c.text;
  Chart.defaults.borderColor = c.gridBorder;
  Object.values(Chart.instances || {}).forEach(chart => {
    if (chart.options.scales) {
      Object.values(chart.options.scales).forEach(scale => {
        if (scale.ticks)  scale.ticks.color  = c.textMuted;
        if (scale.grid) { scale.grid.color   = c.grid; scale.grid.borderColor = c.gridBorder; }
        if (scale.title) scale.title.color   = c.text;
      });
    }
    if (chart.options.plugins?.tooltip) {
      const t = chart.options.plugins.tooltip;
      t.backgroundColor = c.tooltipBg;
      t.titleColor = c.tooltipText;
      t.bodyColor = c.tooltipText;
      t.borderColor = c.tooltipBorder;
      t.borderWidth = 1;
    }
    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = c.text;
    }
    chart.update('none');
  });
  // Donut renk paletini tema geçişinde güncelle
  if (typeof donutChart !== 'undefined' && donutChart) {
    const dark = document.body.classList.contains('dark');
    const meta = donutChart._donutMeta || {};
    const pal = _donutPalette(meta.isDrillDown || false);
    const othersColor = dark ? '#6B6B70' : '#d1d5db';
    const borderCol   = dark ? '#232328' : '#FDF2F2';
    if (donutChart.data.datasets[0]) {
      donutChart.data.datasets[0].backgroundColor =
        (meta.data || []).map((d, i) => d._isOthers ? othersColor : pal[i % pal.length]);
      donutChart.data.datasets[0].borderColor = borderCol;
    }
    donutChart.update('none');
  }
  // BS/WS listelerini tema renkleriyle yeniden çiz
  if (typeof renderBS === 'function' && _bsData && _bsData.length) renderBS(_bsData);
  if (typeof renderWS === 'function' && _wsData && _wsData.length) renderWS(_wsData);
  if (typeof updateMarkaChart === 'function') updateMarkaChart();
  if (_lollipopData.length) _renderLollipop(_lollipopData);
}

if (typeof Chart !== 'undefined') {
  const c = _temaRenkleri();
  Chart.defaults.color = c.text;
  Chart.defaults.borderColor = c.gridBorder;
}

/* ── VERİ YÜKLEME & GRAFİKLER ── */

function getBaseParams() {
  const donem = document.getElementById('donem-select').value;
  const sezon = document.getElementById('sezon-select')?.value || '';
  return 'donem_tip='+currentPeriod+'&donem_deger='+donem
    +'&cinsiyet='+encodeURIComponent(currentCinsiyetler.join(','))
    +'&ana_grup='+encodeURIComponent(currentAnaGrupList.join(','))
    +'&sezon='+encodeURIComponent(sezon);
}

async function loadKartlarData() {
  const base = getBaseParams();
  const markaParam = '&marka=' + encodeURIComponent(currentMarkaList.join(','));
  const sortParam  = '&sort_by=' + currentSortBy;
  const altKatParam = '&alt_kategori=' + encodeURIComponent(currentAltKatList.join(','));
  let bsExtra = '';
  if (currentSortBy === 'skor') {
    bsExtra = '&w_gmroi='+globalWeights.gmroi+'&w_st='+globalWeights.st+'&w_cover='+globalWeights.cover
            + '&min_st='+(window.ESIK_MIN_ST||0.55)+'&max_cover='+(window.ESIK_MAX_COVER_BS||12);
  }
  const [bsRes, wsRes] = await Promise.all([
    fetch('/api/bestseller?'+base+altKatParam+markaParam+sortParam+'&limit=10'+bsExtra),
    fetch('/api/worstseller?'+base+altKatParam+markaParam+sortParam+'&limit=10')
  ]);
  allBS = await bsRes.json(); allWS = await wsRes.json();
  renderBS(allBS); renderWS(allWS); renderCards(allBS, allWS); updateRiskModal(allWS);
}

async function loadData() {
  updateFilterSummaries();
  const base = getBaseParams();
  // Filtreleri hatırla
  const _t = JSON.parse(localStorage.getItem('sporthink_tercihler') || '{}');
  if (_t.hatirlaFiltre) {
    localStorage.setItem('sporthink_son_filtreler', JSON.stringify({
      period:      currentPeriod,
      donem_deger: document.getElementById('donem-select')?.value || '',
      sezon:       document.getElementById('sezon-select')?.value || '',
      cinsiyet:    currentCinsiyetler,
      ana_grup_list: currentAnaGrupList,
      alt_kategori: currentAltKatList
    }));
  }
  // Dashboard her zaman global ağırlıkları kullanır; Top 10 için loadKartlarData() kullanılır.
  const wGmroi = globalWeights.gmroi;
  const wST    = globalWeights.st;
  const wCover = globalWeights.cover;
  const donem  = document.getElementById('donem-select').value;

  const [bsRes, wsRes] = await Promise.all([
    fetch('/api/bestseller?'+base+'&alt_kategori='+encodeURIComponent(currentAltKatList.join(','))+'&limit=10&w_gmroi='+wGmroi+'&w_st='+wST+'&w_cover='+wCover+'&min_st='+(window.ESIK_MIN_ST||0.55)+'&max_cover='+(window.ESIK_MAX_COVER_BS||12)),
    fetch('/api/worstseller?'+base+'&alt_kategori='+encodeURIComponent(currentAltKatList.join(','))+'&limit=10')
  ]);
  allBS = await bsRes.json(); allWS = await wsRes.json();
  renderBS(allBS); renderWS(allWS); renderCards(allBS, allWS); updateRiskModal(allWS);
  await Promise.all([
    updateMetricsWithComparison(donem),
    updateMarkaChart(),
    updateLollipopChart(),
    updateDonutChart(donem),
    updateKarliChart(donem),
    updateCiroChart(donem),
    updateKatPerfTable(donem)
  ]);
}

async function updateMetricsWithComparison(donem) {
  try {
    const sezon = document.getElementById('sezon-select')?.value || '';
    const data = await fetch('/api/analiz/karsilastirma?donem_tip='+currentPeriod+'&donem_deger='+donem+'&cinsiyet='+encodeURIComponent(currentCinsiyetler.join(','))+'&ana_grup='+encodeURIComponent(currentAnaGrupList.join(','))+'&sezon='+encodeURIComponent(sezon)).then(r=>r.json());
    const bd = data.bu_donem, od = data.onceki_donem;
    document.getElementById('m-satis').textContent = fmtSayi(bd.toplam_satis);
    document.getElementById('m-ciro').textContent = fmtPara(bd.toplam_ciro);
    document.getElementById('m-kar').textContent = fmtPara(bd.toplam_kar);
    document.getElementById('m-st').textContent = fmtYuzde((parseFloat(bd.avg_st)||0)*100);
    setChangeLabel('m-satis-change', bd.toplam_satis, od.toplam_satis);
    setChangeLabel('m-ciro-change', bd.toplam_ciro, od.toplam_ciro);
    setChangeLabel('m-kar-change', bd.toplam_kar, od.toplam_kar);
    setChangeLabel('m-st-change', bd.avg_st, od.avg_st);
  } catch(e) {}
}

function setChangeLabel(id, current, previous) {
  const el = document.getElementById(id);
  const c = parseFloat(current)||0, p = parseFloat(previous)||0;
  if (!p) { el.textContent=''; return; }
  const pct = Math.abs((c-p)/p*100);
  if (c>p) { el.textContent='↑ '+fmtYuzde(pct); el.className='metric-change up'; }
  else if (c<p) { el.textContent='↓ '+fmtYuzde(pct); el.className='metric-change down'; }
  else { el.textContent='—'; el.className='metric-change neutral'; }
}

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
    const points = raw.map(d => ({
      marka: d.marka || '?',
      x:     parseFloat(d.avg_st)      || 0,
      y:     parseFloat(d.avg_gmroi)   || 0,
      ciro:  parseFloat(d.toplam_ciro) || 0,
      kar:   parseFloat(d.toplam_kar)  || 0,
    }));

    const maxCiro = Math.max(...points.map(p => p.ciro));
    points.forEach(p => { p.r = maxCiro > 0 ? 6 + (p.ciro / maxCiro) * 16 : 8; });

    const ST_ESIK    = window.ESIK_MIN_ST || 0.55;
    const GMROI_ESIK = 1.5;
    const c       = _temaRenkleri();
    const isDark  = document.body.classList.contains('dark');

    function bubbleColor(p) {
      const hiST = p.x >= ST_ESIK, hiGM = p.y >= GMROI_ESIK;
      if ( hiST &&  hiGM) return isDark ? 'rgba(82,115,92,0.80)'   : 'rgba(22,163,74,0.75)';
      if (!hiST &&  hiGM) return isDark ? 'rgba(85,110,148,0.80)'  : 'rgba(37,99,235,0.75)';
      if ( hiST && !hiGM) return isDark ? 'rgba(138,115,68,0.80)'  : 'rgba(217,119,6,0.75)';
      return                     isDark ? 'rgba(148,88,88,0.80)'   : 'rgba(220,38,38,0.72)';
    }

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
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Ciro</span><span class="ct-tip-val">' + fmt(p.ciro) + '</span></div>' +
          '<div class="ct-tip-row"><span class="ct-tip-lbl" style="color:' + c.green + '">Kâr</span><span class="ct-tip-val" style="color:' + c.green + '">' + fmt(p.kar) + '</span></div>';
      }
      el.style.opacity = '1';
      const r = chart.canvas.getBoundingClientRect();
      const bx = r.left + dp.element.x, by = r.top + dp.element.y;
      const tw = el.offsetWidth || 160, th = el.offsetHeight || 70;
      el.style.left = (bx + 14 + tw > window.innerWidth ? bx - tw - 8 : bx + 14) + 'px';
      el.style.top  = Math.max(8, Math.min(by - th / 2, window.innerHeight - th - 8)) + 'px';
    };

    markaBarChart = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [{
          data:            points.map(p => ({ x: p.x, y: p.y, r: p.r })),
          backgroundColor: points.map(p => bubbleColor(p)),
          borderColor:     points.map(p => bubbleColor(p)),
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20, right: 20, bottom: 8, left: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false, external: mrkTip },
        },
        scales: {
          x: {
            min: 0, max: 1,
            ticks: {
              color: c.textMuted,
              font: { size: 10, family: "'DM Sans', sans-serif" },
              callback: v => '%' + Math.round(v * 100),
              stepSize: 0.2,
            },
            grid: { color: c.grid },
            border: { display: false },
            title: { display: true, text: 'Sell-Through', color: c.textMuted, font: { size: 10, family: "'DM Sans', sans-serif" }, padding: { top: 6 } },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: c.textMuted,
              font: { size: 10, family: "'DM Sans', sans-serif" },
              callback: v => v.toFixed(1),
            },
            grid: { color: c.grid },
            border: { display: false },
            title: { display: true, text: 'GMROI', color: c.textMuted, font: { size: 10, family: "'DM Sans', sans-serif" }, padding: { bottom: 6 } },
          }
        },
        animation: { duration: 600, easing: 'easeOutQuart' }
      },
      plugins: [{
        id: 'markaOverlay',
        afterDatasetsDraw(chart) {
          const { ctx: cx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
          cx.save();

          const stPx    = x.getPixelForValue(ST_ESIK);
          const gmroiPx = y.getPixelForValue(GMROI_ESIK);
          cx.setLineDash([4, 4]);
          cx.lineWidth   = 1;
          cx.strokeStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
          cx.beginPath(); cx.moveTo(stPx, top);  cx.lineTo(stPx, bottom); cx.stroke();
          cx.beginPath(); cx.moveTo(left, gmroiPx); cx.lineTo(right, gmroiPx); cx.stroke();
          cx.setLineDash([]);

          cx.font          = "600 9px 'DM Sans', sans-serif";
          cx.textAlign     = 'center';
          cx.textBaseline  = 'bottom';
          chart.getDatasetMeta(0).data.forEach((bubble, i) => {
            const p   = points[i];
            const lbl = p.marka.length > 13 ? p.marka.slice(0, 12) + '…' : p.marka;
            cx.fillStyle = isDark ? 'rgba(210,210,206,0.85)' : 'rgba(30,30,30,0.72)';
            cx.fillText(lbl, bubble.x, bubble.y - bubble.options.radius - 4);
          });

          cx.restore();
        }
      }]
    });
  } catch(e) { console.error('Marka scatter hatası:', e); }
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

/* ── YATAY BAR GRAFİK YARDIMCI FONKSİYONU ── */

async function updateKarliChart(donem) {
  try {
    const sezon = document.getElementById('sezon-select')?.value || '';
    const raw = await fetch('/api/analiz/en-karli-urunler?donem_tip='+currentPeriod+'&donem_deger='+donem+'&cinsiyet='+encodeURIComponent(currentCinsiyetler.join(','))+'&ana_grup='+encodeURIComponent(currentAnaGrupList.join(','))+'&sezon='+encodeURIComponent(sezon)+'&limit=10'+'&min_st='+(window.ESIK_MIN_ST_KAR||0.55)+'&max_cover='+(window.ESIK_MAX_COVER_KAR||10)).then(r=>r.json());
    if (!raw.length) return;
    if (karliChart) { karliChart.destroy(); karliChart = null; }
    const data = [...raw];
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
          '<div class="ct-tip-row"><span class="ct-tip-lbl">Kâr</span><span class="ct-tip-val">'+fmt(kar)+'</span></div>'+
          '<div class="ct-tip-row"><span class="ct-tip-lbl" style="color:'+_temaRenkleri().blue+'">GMROI</span><span class="ct-tip-val" style="color:'+_temaRenkleri().blue+'">'+fmtSayi(gmroi,2)+'</span></div>'+
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
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false, external: karliExtTooltip }
        },
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
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false, external: ciroExtTooltip }
        },
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

/* ── EN ÇOK SATAN ÜRÜNLER — LOLLIPOP HTML ── */

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

let _bsData=[], _wsData=[], _lollipopData=[];

function renderBS(data) {
  _bsData = data;
  document.getElementById('bs-sub').textContent = (currentCinsiyetler.length?currentCinsiyetler.join(', '):'Tüm')+(currentAnaGrupList.length?' / '+currentAnaGrupList.join(', '):'');
  const list = document.getElementById('bs-list');
  if (!data.length) { list.innerHTML='<div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px">Veri bulunamadı</div>'; return; }
  const g = _temaRenkleri().green;
  list.innerHTML = data.map((d,i) => {
    const psf=parseFloat(d.psf)||0;
    return '<div class="table-row" data-idx="'+i+'"><div class="rank" style="color:'+g+'">'+( i+1)+'</div>'
      +'<div class="img-box"><img src="'+(d.gorsel_url||'/static/images/adidas.png')+'" onerror="this.src=\'/static/images/adidas.png\'"></div>'
      +'<div class="row-info"><div class="row-name">'+(d.stok_kodu_aciklama||'—')+'</div><div class="row-sub">'+(d.alt_kategori||'')+' · '+(d.marka||'')+'</div></div>'
      +'<div class="row-psf">'+(psf>0?'₺'+psf.toLocaleString('tr-TR'):'—')+'</div>'
      +'<div class="bar-score"><div class="bar-bg" style="flex:1"><div class="bar-fill" style="width:'+Math.min(parseFloat(d.sell_through||d.avg_st||0)*100,100).toFixed(0)+'%;background:'+g+'"></div></div><div class="score-txt" style="color:'+g+';width:34px;text-align:right">'+fmtYuzde(parseFloat(d.sell_through||d.avg_st||0)*100)+'</div></div></div>';
  }).join('');
  list.querySelectorAll('.table-row').forEach(el=>el.addEventListener('click',function(){showDetay(_bsData[+this.dataset.idx],'bs',+this.dataset.idx+1);}));
}

function renderWS(data) {
  _wsData = data;
  document.getElementById('ws-sub').textContent = (currentCinsiyetler.length?currentCinsiyetler.join(', '):'Tüm')+(currentAnaGrupList.length?' / '+currentAnaGrupList.join(', '):'');
  const list = document.getElementById('ws-list');
  if (!data.length) { list.innerHTML='<div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px">Veri bulunamadı</div>'; return; }
  const r = _temaRenkleri().red;
  list.innerHTML = data.map((d,i) => {
    const cover=parseFloat(d.periyot_cover)||0, psf=parseFloat(d.psf)||0;
    return '<div class="table-row" data-idx="'+i+'"><div class="rank" style="color:'+r+'">'+( i+1)+'</div>'
      +'<div class="img-box"><img src="'+(d.gorsel_url||'/static/images/converse.png')+'" onerror="this.src=\'/static/images/converse.png\'"></div>'
      +'<div class="row-info"><div class="row-name">'+(d.stok_kodu_aciklama||'—')+'</div><div class="row-sub">'+(d.alt_kategori||'')+' · '+(d.marka||'')+'</div></div>'
      +'<div class="row-psf">'+(psf>0?'₺'+psf.toLocaleString('tr-TR'):'—')+'</div>'
      +'<div class="bar-score"><div class="bar-bg" style="flex:1"><div class="bar-fill" style="width:'+Math.min(cover/19*100,100).toFixed(0)+'%;background:'+r+'"></div></div><div class="score-txt" style="color:'+r+';width:28px;text-align:right">'+fmtSayi(cover,1)+'</div></div></div>';
  }).join('');
  list.querySelectorAll('.table-row').forEach(el=>el.addEventListener('click',function(){showDetay(_wsData[+this.dataset.idx],'ws',+this.dataset.idx+1);}));
}

function renderCards(bs, ws) {
  const bsGrid=document.getElementById('bs-cards'), wsGrid=document.getElementById('ws-cards');
  bsGrid.innerHTML=bs.map((d,i)=>cardHTML(d,'bs',i+1)).join('');
  wsGrid.innerHTML=ws.map((d,i)=>cardHTML(d,'ws',i+1)).join('');
  bsGrid.querySelectorAll('.product-card').forEach((el,i)=>el.addEventListener('click',()=>showDetay(bs[i],'bs',i+1)));
  wsGrid.querySelectorAll('.product-card').forEach((el,i)=>el.addEventListener('click',()=>showDetay(ws[i],'ws',i+1)));
}

function cardHTML(d, type, rank) {
  const psf   = parseFloat(d.psf) || 0;
  const st    = parseFloat(d.sell_through || d.avg_st) || 0;
  const gmroi = parseFloat(d.ort_gmroi) || 0;
  const cover = parseFloat(d.periyot_cover || d.avg_cover) || 0;
  const fallback = type === 'bs' ? '/static/images/adidas.png' : '/static/images/converse.png';
  const imgContent = '<img src="' + (d.gorsel_url || fallback) + '" onerror="this.src=\'' + fallback + '\'">';
  const hl = key => currentSortBy === key ? ' sort-hl' : '';
  return '<div class="product-card ' + type + '">'
    + '<div class="card-img-wrap">' + imgContent + '<div class="card-rank-badge">#' + rank + '</div></div>'
    + '<div class="card-footer">'
    +   '<div class="card-footer-info">'
    +     '<div class="card-footer-code">' + (d.stok_kodu || '') + '</div>'
    +     '<div class="card-footer-name">' + (d.stok_kodu_aciklama || '—') + '</div>'
    +   '</div>'
    +   '<div class="card-footer-metrics">'
    +     '<div class="card-metric-item"><span class="card-metric-label">PSF</span><span class="card-metric-value">' + (psf > 0 ? '₺' + psf.toLocaleString('tr-TR') : '—') + '</span></div>'
    +     '<div class="card-metric-item' + hl('st') + '"><span class="card-metric-label">ST</span><span class="card-metric-value">' + fmtYuzde(st * 100, 0) + '</span></div>'
    +     '<div class="card-metric-item' + hl('gmroi') + '"><span class="card-metric-label">GMROI</span><span class="card-metric-value">' + fmtSayi(gmroi, 2) + '</span></div>'
    +     '<div class="card-metric-item' + hl('cover') + '"><span class="card-metric-label">Cover</span><span class="card-metric-value">' + fmtSayi(cover, 1) + '</span></div>'
    +   '</div>'
    + '</div></div>';
}

function updateRiskModal(ws) {
  const riskli = ws.filter(d=>(parseFloat(d.periyot_cover)||0)>=(window.ESIK_RISK||15));
  const list = document.getElementById('risk-list');
  if (!list) return;
  if (!riskli.length) { list.innerHTML='<div style="color:#9ca3af;font-size:12px;text-align:center;padding:20px">Kritik stok riski bulunamadı</div>'; return; }
  list.innerHTML = riskli.map(d => {
    const cover=parseFloat(d.periyot_cover)||0, indirim=parseFloat(d.ort_indirim)||0;
    const tag=indirim>20?'transfer':cover>=19?'indirim':'siparis';
    const tagText=tag==='indirim'?'İndirim Öner':tag==='transfer'?'Transfer Öner':'Sipariş';
    return '<div class="risk-row"><div class="risk-tag '+tag+'">'+tagText+'</div><div class="risk-info"><div class="risk-name">'+(d.stok_kodu_aciklama||'—')+'</div><div class="risk-detail">'+(d.marka||'')+' · '+(d.alt_kategori||'')+' · PSF: '+fmtPara(d.psf||0,0)+'</div></div><div class="risk-cover">'+fmtSayi(cover,1)+' hafta</div></div>';
  }).join('');
}

function showDetay(d, tip, rank) {
  const psf   = parseFloat(d.psf)                          || 0;
  const mu    = parseFloat(d.mu)                           || 0;
  const st    = parseFloat(d.sell_through || d.avg_st)     || 0;
  const cover = parseFloat(d.periyot_cover || d.avg_cover) || 0;
  const gmroi = parseFloat(d.ort_gmroi)                    || 0;
  const kar   = parseFloat(d.toplam_kar)                   || 0;
  const ciro  = parseFloat(d.toplam_ciro)                  || 0;
  const _mc = _temaRenkleri();
  const isDark = document.body.classList.contains('dark');
  const metrikRenk = tip === 'bs' ? 'color:'+_mc.green : 'color:'+_mc.red;
  const ntr = 'color:'+_mc.tooltipText;
  const tipBadge = document.getElementById('urun-modal-tip-badge');
  if (tipBadge) {
    tipBadge.textContent = (rank ? '#'+rank+' ' : '') + (tip === 'bs' ? 'Best Seller' : 'Worst Seller');
    tipBadge.style.background = tip === 'bs'
      ? (isDark ? 'rgba(78,138,102,0.12)' : '#f0fdf4')
      : (isDark ? 'rgba(168,86,80,0.12)'  : '#fff0f0');
    tipBadge.style.color = tip === 'bs' ? _mc.green : _mc.red;
  }
  const imgWrap = document.getElementById('urun-modal-img-wrap');
  if (imgWrap) imgWrap.style.display = 'none';
  document.getElementById('urun-modal-detay').innerHTML =
    '<div class="detail-row"><span class="detail-label">Ürün Kodu</span><span class="detail-val" style="font-family:monospace;'+ntr+';font-weight:600">'+(d.stok_kodu||'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">Ürün Adı</span><span class="detail-val" style="'+ntr+';font-weight:600">'+(d.stok_kodu_aciklama||'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">Marka</span><span class="detail-val" style="'+ntr+';font-weight:600">'+(d.marka||'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">Kategori</span><span class="detail-val" style="'+ntr+';font-weight:600">'+(d.alt_kategori||'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">PSF</span><span class="detail-val" style="'+ntr+';font-size:15px;font-weight:600">'+(psf>0?'₺'+psf.toLocaleString('tr-TR'):'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">MU</span><span class="detail-val" style="'+ntr+';font-weight:600">'+fmtSayi(mu,4)+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">Toplam Ciro</span><span class="detail-val" style="'+ntr+';font-weight:600">'+(ciro>0?fmt(ciro):'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">Toplam Kâr</span><span class="detail-val" style="'+ntr+';font-weight:600">'+(kar>0?fmt(kar):'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">GMROI</span><span class="detail-val" style="'+metrikRenk+';font-weight:600">'+fmtSayi(gmroi,2)+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">Sell Through</span><span class="detail-val" style="'+metrikRenk+';font-weight:600">'+fmtYuzde(st*100)+'</span></div>'+
    '<div class="detail-row"><span class="detail-label">Periyot Cover</span><span class="detail-val" style="'+metrikRenk+';font-weight:600">'+fmtSayi(cover,1)+' hafta</span></div>';
  document.getElementById('urun-modal').classList.add('open');
}

function exportTop10Excel() {
  const base = getBaseParams();
  const wGmroi  = (document.getElementById('s-gmroi')?.value  ?? 40) / 100;
  const wST     = (document.getElementById('s-st')?.value     ?? 30) / 100;
  const wCover  = (document.getElementById('s-cover')?.value  ?? 20) / 100;
  const minST   = window.ESIK_MIN_ST    || 0.55;
  const maxCov  = window.ESIK_MAX_COVER_BS || 12.0;
  const altKat  = encodeURIComponent(currentAltKatList.join(','));
  const url = `/api/export/top10?${base}&alt_kategori=${altKat}`
    + `&w_gmroi=${wGmroi}&w_st=${wST}&w_cover=${wCover}`
    + `&min_st=${minST}&max_cover=${maxCov}`;
  window.location.href = url;
}

