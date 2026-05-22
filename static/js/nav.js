/* ── NAVİGASYON & INIT ── */

async function init() {
  try {
    const ben = await fetch('/api/benim-bilgilerim').then(r=>r.json());
    window._currentUserId = ben.id;
    const adSoyad = ben.ad || ben.email || '';
    document.getElementById('user-name-text').textContent = ben.ad || '';
    tercihleriYukle();
    setupWelcome((ben.ad || '').split(' ')[0] || 'Kullanıcı');
    // Nav compact user
    const initials = adSoyad.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
    const navAvatar = document.getElementById('nav-compact-avatar');
    if (navAvatar) navAvatar.textContent = initials;
    const navRole = document.getElementById('nav-compact-role');
    if (navRole) navRole.textContent = ben.email || '';
    // Dropdown header
    const ddName = document.getElementById('dd-user-name');
    if (ddName) ddName.textContent = adSoyad;
    const ddEmail = document.getElementById('dd-user-email');
    if (ddEmail) ddEmail.textContent = ben.email || '';
    // Avatar initials
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) userAvatar.innerHTML = initials;
  } catch(e) { setupWelcome('Kullanıcı'); }
  // Global sistem ayarlarını yükle ve uygula
  try {
    const ayarlar = await fetch('/api/sistem-ayarlari').then(r=>r.json());
    if (ayarlar.w_gmroi) globalWeights.gmroi = parseFloat(ayarlar.w_gmroi);
    if (ayarlar.w_st)    globalWeights.st    = parseFloat(ayarlar.w_st);
    if (ayarlar.w_cover) globalWeights.cover = parseFloat(ayarlar.w_cover);
    if (ayarlar.esik_risk)       window.ESIK_RISK           = parseInt(ayarlar.esik_risk);
    if (ayarlar.esik_min_st)     window.ESIK_MIN_ST         = parseFloat(ayarlar.esik_min_st);
    if (ayarlar.esik_max_cover)  window.ESIK_MAX_COVER_BS   = parseFloat(ayarlar.esik_max_cover);
    if (ayarlar.esik_ciro_st)    window.ESIK_MIN_ST_CIRO    = parseFloat(ayarlar.esik_ciro_st);
    if (ayarlar.esik_ciro_cover) window.ESIK_MAX_COVER_CIRO = parseFloat(ayarlar.esik_ciro_cover);
    if (ayarlar.esik_kar_st)     window.ESIK_MIN_ST_KAR     = parseFloat(ayarlar.esik_kar_st);
    if (ayarlar.esik_kar_cover)  window.ESIK_MAX_COVER_KAR  = parseFloat(ayarlar.esik_kar_cover);
    if (ayarlar.marka_st_cut)    window.MARKA_ST_CUT        = parseFloat(ayarlar.marka_st_cut);
    if (ayarlar.marka_gm_cut)    window.MARKA_GM_CUT        = parseFloat(ayarlar.marka_gm_cut);
    if (ayarlar.aktif_sezon !== undefined) _seciliSezon = ayarlar.aktif_sezon;
    // Ayarlar slider/input değerlerini senkronize et (DOM hazır olduğunda)
    const gmroiEl = document.getElementById('ayar-gmroi');
    if (gmroiEl) { gmroiEl.value = Math.round(globalWeights.gmroi * 100); }
    const stEl = document.getElementById('ayar-st');
    if (stEl) { stEl.value = Math.round(globalWeights.st * 100); }
    const coverEl = document.getElementById('ayar-cover');
    if (coverEl) { coverEl.value = Math.round(globalWeights.cover * 100); }
    const esikRiskEl = document.getElementById('esik-risk');
    if (esikRiskEl) esikRiskEl.value = ayarlar.esik_risk || 15;
    const esikMinStEl = document.getElementById('esik-min-st');
    if (esikMinStEl) esikMinStEl.value = Math.round(parseFloat(ayarlar.esik_min_st||0.55) * 100);
    const esikMaxCoverEl = document.getElementById('esik-max-cover');
    if (esikMaxCoverEl) esikMaxCoverEl.value = ayarlar.esik_max_cover || 12;
    const esikCiroCoverEl = document.getElementById('esik-ciro-cover');
    if (esikCiroCoverEl) esikCiroCoverEl.value = ayarlar.esik_ciro_cover || 10;
    const geCiroStEl = document.getElementById('ge-ciro-st');
    if (geCiroStEl) geCiroStEl.value = Math.round(parseFloat(ayarlar.esik_ciro_st || 0.55) * 100);
    const geKarStEl = document.getElementById('ge-kar-st');
    if (geKarStEl) geKarStEl.value = Math.round(parseFloat(ayarlar.esik_kar_st || 0.55) * 100);
    const geKarCoverEl = document.getElementById('ge-kar-cover');
    if (geKarCoverEl) geKarCoverEl.value = ayarlar.esik_kar_cover || 10;
    const markaStEl = document.getElementById('marka-st-cut');
    if (markaStEl) markaStEl.value = Math.round(parseFloat(ayarlar.marka_st_cut || 0.50) * 100);
    const markaGmEl = document.getElementById('marka-gm-cut');
    if (markaGmEl) markaGmEl.value = parseFloat(ayarlar.marka_gm_cut || 15);
    updateAyarSliders();
  } catch(e) {}
  try {
    const data = await fetch('/api/filters').then(r=>r.json());
    buildDonemSelect(data);  // currentPeriod zaten tercihleriYukle ile set edildi
    // Global aktif sezonı uygula (hatirlaFiltre açıksa filtrelerYukle üstüne yazar)
    const sezonSel = document.getElementById('sezon-select');
    if (sezonSel && _seciliSezon !== undefined) sezonSel.value = _seciliSezon;
    filtrelerYukle();        // select option'ları dolu, artık güvenli restore
    updateChartSubtitles();
    await loadData();
  } catch(e) {}
  // Bildirimleri yükle
  bildirimlerYukle();
  // Başlangıçta dashboard aktif, kartlar sidebar öğeleri gizli
  const markaGrup = document.getElementById('fg-marka');
  if (markaGrup) markaGrup.style.display = 'none';
  updateFilterSummaries();
  renderActiveFilterChips();
  document.querySelectorAll('.nav-anagrp-chevron').forEach(c => c.style.display = 'none');
}

function buildDonemSelect(data) {
  const sel = document.getElementById('donem-select');
  sel.innerHTML = '';
  data.haftalar.forEach(h => sel.innerHTML += '<option value="'+h+'">Hafta '+h+'</option>');
  const sezonSel = document.getElementById('sezon-select');
  if (sezonSel && data.sezonlar) {
    const mevcut = sezonSel.value;
    sezonSel.innerHTML = '<option value="">Tüm Sezonlar</option>';
    data.sezonlar.forEach(s => sezonSel.innerHTML += '<option value="'+s+'">'+s+'</option>');
    if (mevcut) sezonSel.value = mevcut;
  }
}

function setNav(page, el) {
  // Kartlar dışında bir sayfaya geçince submenüyü kapat
  if (page !== 'kartlar') {
    const submenu = document.getElementById('kartlar-submenu');
    const chevron = document.getElementById('kartlar-chevron');
    if (submenu) submenu.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
    document.querySelectorAll('.nav-sub-item').forEach(i => i.classList.remove('active'));
  }
  currentNav = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  ['dashboard','kartlar','profil'].forEach(p => {
    const pg = document.getElementById('page-'+p);
    if (pg) pg.style.display = p === page ? 'block' : 'none';
  });
  document.getElementById('topbar-title').innerHTML = PAGE_TITLES[page] || '';
  if (page === 'profil') profilSayfasiYukle();
  if (page === 'dashboard') loadData();
  const markaGrupNav = document.getElementById('fg-marka');
  if (markaGrupNav) markaGrupNav.style.display = page === 'kartlar' ? '' : 'none';
  const filterSection = document.getElementById('nav-filter-section');
  if (filterSection) filterSection.style.display = page === 'profil' ? 'none' : '';
  const activeFilterRow = document.getElementById('active-filter-row');
  if (activeFilterRow && page === 'profil') activeFilterRow.style.display = 'none';
  else if (activeFilterRow && page !== 'profil') renderActiveFilterChips();
  // Ana grup ok işaretleri sadece kartlar sayfasında
  document.querySelectorAll('.nav-anagrp-chevron').forEach(c => {
    c.style.display = page === 'kartlar' ? '' : 'none';
  });
}

/* ── DROPDOWN & DARK MODE ── */
function toggleUserDropdown(e) {
  e.stopPropagation();
  document.getElementById('topbar-user').classList.toggle('open');
}

function ddNav(page) {
  const u = document.getElementById('topbar-user');
  if (u) u.classList.remove('open');
  setNav(page, null);
}

document.addEventListener('click', () => {
  const u = document.getElementById('topbar-user');
  if (u) u.classList.remove('open');
});

init();
