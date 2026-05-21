/* ── TOP 10 KARTLAR: BS/WS LİSTELERİ, KARTLAR, MODAL, EXCEL ── */

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
      +'<div class="row-info"><div class="row-name">'+(d.stok_kodu_aciklama||'—')+'</div><div class="row-code">'+(d.stok_kodu||'')+'</div></div>'
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
      +'<div class="row-info"><div class="row-name">'+(d.stok_kodu_aciklama||'—')+'</div><div class="row-code">'+(d.stok_kodu||'')+'</div></div>'
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
  const mode = type === 'bs' ? 'best' : 'worst';
  const hl = key => currentSortBy === key ? ' sort-hl' : '';
  return '<div class="product-card ' + type + '" data-mode="' + mode + '">'
    + '<div class="card-img-wrap">' + imgContent + '<div class="card-rank-badge">#' + rank + '</div></div>'
    + '<div class="card-footer">'
    +   '<div class="card-footer-info">'
    +     '<div class="card-footer-code">' + (d.stok_kodu || '') + '</div>'
    +     '<div class="card-footer-name">' + (d.stok_kodu_aciklama || '—') + '</div>'
    +   '</div>'
    +   '<div class="card-metrics-grid">'
    +     '<div class="card-metric-cell"><span class="card-metric-label">PSF</span><span class="card-metric-value">' + (psf > 0 ? '₺' + psf.toLocaleString('tr-TR') : '—') + '</span></div>'
    +     '<div class="card-metric-cell' + hl('st') + '"><span class="card-metric-label">ST</span><span class="card-metric-value">' + fmtYuzde(st * 100, 0) + '</span></div>'
    +     '<div class="card-metric-cell' + hl('gmroi') + '"><span class="card-metric-label">GMROI</span><span class="card-metric-value">' + fmtSayi(gmroi, 2) + '</span></div>'
    +     '<div class="card-metric-cell' + hl('cover') + '"><span class="card-metric-label">Cover</span><span class="card-metric-value">' + fmtSayi(cover, 1) + '</span></div>'
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
