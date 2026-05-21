/* ── VERİ YÜKLEME & METRİKLER ── */

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
  const wGmroi = globalWeights.gmroi;
  const wST    = globalWeights.st;
  const wCover = globalWeights.cover;
  const donem  = document.getElementById('donem-select').value;
  const altKatParam = '&alt_kategori=' + encodeURIComponent(currentAltKatList.join(','));
  const markaParam  = '&marka=' + encodeURIComponent(currentMarkaList.join(','));
  const sortParam   = '&sort_by=' + currentSortBy;
  let bsExtra = '';
  if (currentSortBy === 'skor') {
    bsExtra = '&w_gmroi='+wGmroi+'&w_st='+wST+'&w_cover='+wCover+'&min_st='+(window.ESIK_MIN_ST||0.55)+'&max_cover='+(window.ESIK_MAX_COVER_BS||12);
  }

  const [bsRes, wsRes] = await Promise.all([
    fetch('/api/bestseller?'+base+altKatParam+markaParam+sortParam+'&limit=10'+bsExtra),
    fetch('/api/worstseller?'+base+altKatParam+markaParam+sortParam+'&limit=10')
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
