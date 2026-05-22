/* ── FİLTRELER & SIDEBAR ── */


function setMarka(m) {
  const idx = currentMarkaList.indexOf(m);
  if (idx >= 0) currentMarkaList.splice(idx, 1); else currentMarkaList.push(m);
  const allOpts = Array.from(document.querySelectorAll('#fg-marka-body .nav-cin-item[data-val]')).map(e => e.getAttribute('data-val')).filter(Boolean);
  if (allOpts.length > 0 && allOpts.every(o => currentMarkaList.includes(o))) currentMarkaList = [];
  updateMarkaUI();
  updateFilterSummaries();
  renderActiveFilterChips();
  loadKartlarData();
}

function updateMarkaUI() {
  document.querySelectorAll('#fg-marka-body .nav-cin-item').forEach(t => {
    t.classList.toggle('active', currentMarkaList.includes(t.getAttribute('data-val')));
  });
}

function toBasHarfBuyuk(str) {
  return str.replace(/(\S+)/g, w => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR'));
}

function markalariDoldur(markalar) {
  const body = document.getElementById('fg-marka-body');
  if (!body) return;
  body.innerHTML = '';
  markalar.forEach(m => {
    const div = document.createElement('div');
    div.className = 'nav-cin-item';
    div.setAttribute('data-val', m);
    div.setAttribute('onclick', `setMarka('${m.replace(/'/g, "\\'")}', this)`);
    div.innerHTML = `<div class="nav-cin-check"></div>${toBasHarfBuyuk(m)}`;
    body.appendChild(div);
  });
  updateMarkaUI();
}

function setCinsiyet(c) {
  const idx = currentCinsiyetler.indexOf(c);
  if (idx >= 0) currentCinsiyetler.splice(idx, 1); else currentCinsiyetler.push(c);
  const allOpts = Array.from(document.querySelectorAll('#fg-cinsiyet .nav-cin-item[data-val]')).map(e => e.getAttribute('data-val')).filter(Boolean);
  if (allOpts.length > 0 && allOpts.every(o => currentCinsiyetler.includes(o))) currentCinsiyetler = [];
  updateCinsiyetUI();
  updateFilterSummaries();
  renderActiveFilterChips();
  loadData();
}

async function toggleAnaGrupExpand(g) {
  const sub = document.getElementById('ag-sub-' + g);
  const chevron = document.querySelector('#ag-item-' + g + ' .nav-anagrp-chevron');

  // Diğer grupların sub-menülerini kapat
  ['Aksesuar', 'Ayakkabı', 'Giyim'].filter(grp => grp !== g).forEach(grp => {
    const s = document.getElementById('ag-sub-' + grp);
    const c = document.querySelector('#ag-item-' + grp + ' .nav-anagrp-chevron');
    if (s) s.classList.remove('open');
    if (c) c.style.transform = 'rotate(0deg)';
  });

  const isOpen = sub && sub.classList.contains('open');
  if (isOpen) {
    if (sub) sub.classList.remove('open');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  } else {
    if (sub && !sub.dataset.loaded && currentNav === 'kartlar') {
      const kat = await fetch('/api/alt_kategoriler?ana_grup=' + encodeURIComponent(g)).then(r => r.json());
      sub.innerHTML = kat.map(k =>
        `<div class="nav-altkat-item" onclick="setAltKatSidebar('${k.replace(/'/g, "\\'")}', this)">${k}</div>`
      ).join('');
      sub.dataset.loaded = '1';
    }
    if (sub) sub.classList.add('open');
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  }
}

function setAltKatSidebar(altKat, el) {
  const idx = currentAltKatList.indexOf(altKat);
  if (idx >= 0) {
    currentAltKatList.splice(idx, 1);
    el.classList.remove('active');
  } else {
    currentAltKatList.push(altKat);
    el.classList.add('active');
  }
  renderActiveFilterChips();
  loadData();
}

async function setAnaGrupSidebar(g) {
  const allGroups = Array.from(document.querySelectorAll('.nav-anagrp-item')).map(e => e.id.replace('ag-item-', ''));

  const idx = currentAnaGrupList.indexOf(g);
  if (idx >= 0) currentAnaGrupList.splice(idx, 1); else currentAnaGrupList.push(g);

  // Tümü'ne dön: tüm gruplar manuel seçilince sıfırla
  if (allGroups.length > 0 && allGroups.every(grp => currentAnaGrupList.includes(grp))) {
    currentAnaGrupList = [];
    ['Aksesuar', 'Ayakkabı', 'Giyim'].forEach(grp => {
      const sub = document.getElementById('ag-sub-' + grp);
      const chev = document.querySelector('#ag-item-' + grp + ' .nav-anagrp-chevron');
      if (sub) sub.classList.remove('open');
      if (chev) chev.style.transform = 'rotate(0deg)';
    });
  }

  updateAnaGrupUI();
  updateFilterSummaries();
  renderActiveFilterChips();

  currentAltKatList = [];
  document.querySelectorAll('.nav-altkat-item').forEach(i => i.classList.remove('active'));
  loadData();
}

/* ── FİLTRE GÖRSEL GÜNCELLEME YARDIMCIları ── */
function updateCinsiyetUI() {
  document.querySelectorAll('#fg-cinsiyet .nav-cin-item').forEach(t => {
    t.classList.toggle('active', currentCinsiyetler.includes(t.getAttribute('data-val')));
  });
}

function updateAnaGrupUI() {
  document.querySelectorAll('.nav-anagrp-head').forEach(h => {
    const itemEl = h.closest('.nav-anagrp-item');
    if (!itemEl) return;
    h.classList.toggle('active', currentAnaGrupList.includes(itemEl.id.replace('ag-item-', '')));
  });
}

function setSortBy(criterion, el) {
  currentSortBy = criterion;
  document.querySelectorAll('.sort-pill').forEach(b => {
    const on = b.getAttribute('data-val') === criterion;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  loadKartlarData();
}

function renderActiveFilterChips() {
  const bar = document.getElementById('active-filter-bar');
  const row = document.getElementById('active-filter-row');
  if (!bar) return;
  const chips = [];
  currentAnaGrupList.forEach(v => chips.push({ label: v, type: 'anagrp', val: v }));
  currentAltKatList.forEach(v  => chips.push({ label: v, type: 'altkat', val: v }));
  currentCinsiyetler.forEach(v => chips.push({ label: v, type: 'cinsiyet', val: v }));
  currentMarkaList.forEach(v   => chips.push({ label: toBasHarfBuyuk(v), type: 'marka', val: v }));
  const sezon = document.getElementById('sezon-select')?.value;
  if (sezon && sezon !== (window._adminSezon || '')) chips.push({ label: sezon, type: 'sezon', val: sezon });
  bar.innerHTML = chips.map(c =>
    '<span class="active-chip">' + c.label
    + '<span class="x" onclick="removeFilterChip(\'' + c.type + '\',\'' + c.val.replace(/'/g, "\\'") + '\')">×</span></span>'
  ).join('');
  if (row) row.style.display = chips.length > 0 ? 'flex' : 'none';
}

function removeFilterChip(type, val) {
  if (type === 'anagrp')   { currentAnaGrupList = currentAnaGrupList.filter(x => x !== val); updateAnaGrupUI(); }
  if (type === 'altkat')   { currentAltKatList  = currentAltKatList.filter(x => x !== val); document.querySelectorAll('.nav-altkat-item').forEach(i => { if (i.textContent.trim() === val) i.classList.remove('active'); }); }
  if (type === 'cinsiyet') { currentCinsiyetler = currentCinsiyetler.filter(x => x !== val); updateCinsiyetUI(); }
  if (type === 'marka')    { currentMarkaList   = currentMarkaList.filter(x => x !== val); updateMarkaUI(); }
  if (type === 'sezon')    { const s = document.getElementById('sezon-select'); if (s) s.value = ''; }
  renderActiveFilterChips();
  updateFilterSummaries();
  loadData();
  if (currentNav === 'kartlar') loadKartlarData();
}

function updateFilterSummaries() {
  const setBadge = (countId, arr) => {
    const el = document.getElementById(countId);
    if (!el) return;
    if (arr && arr.length > 0) { el.textContent = arr.length; el.style.display = ''; }
    else { el.style.display = 'none'; }
  };
  setBadge('anagrp-count',   currentAnaGrupList);
  setBadge('cinsiyet-count', currentCinsiyetler);
  setBadge('marka-count',    currentMarkaList);
  const sezon = document.getElementById('sezon-select')?.value;
  const sezonUserChanged = sezon && sezon !== (window._adminSezon || '');
  setBadge('sezon-count', sezonUserChanged ? [sezon] : []);

  // Clear button
  const totalActive = currentCinsiyetler.length + currentMarkaList.length + currentAnaGrupList.length
                    + currentAltKatList.length + (sezonUserChanged ? 1 : 0);
  const clearRow = document.querySelector('.nav-filter-clear-row');
  if (clearRow) clearRow.style.display = totalActive > 0 ? 'flex' : 'none';
}


function toggleKartlarMenu(el) {
  const submenu = document.getElementById('kartlar-submenu');
  const chevron = document.getElementById('kartlar-chevron');
  const isOpen = submenu.style.display === 'flex';

  if (isOpen) {
    submenu.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  } else {
    submenu.style.display = 'flex';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
  }
}

function selectKartlarTab(tip, el) {
  currentNav = 'kartlar';
  document.querySelectorAll('.nav-sub-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');

  // Sayfayı göster
  ['dashboard','kartlar','kullanicilar'].forEach(p => {
    const pg = document.getElementById('page-'+p);
    if (pg) pg.style.display = p === 'kartlar' ? 'block' : 'none';
  });

  // Ana grup chevron'larını göster
  document.querySelectorAll('.nav-anagrp-chevron').forEach(c => c.style.display = '');

  // BS/WS listesini göster
  document.getElementById('panel-bs-cards').style.display = tip === 'bs' ? 'block' : 'none';
  document.getElementById('panel-ws-cards').style.display = tip === 'ws' ? 'block' : 'none';

  // Excel butonu rengini aktif taba göre güncelle
  const excelBtn = document.getElementById('btn-export-top10');
  if (excelBtn) {
    excelBtn.style.color       = tip === 'bs' ? '#16a34a' : '#dc2626';
    excelBtn.style.borderColor = tip === 'bs' ? '#bbf7d0' : '#fca5a5';
  }

  // Topbar başlığını güncelle
  const baslik = tip === 'bs'
    ? 'Top 10 <span>Best Seller Kartlar</span>'
    : 'Top 10 <span>Worst Seller Kartlar</span>';
  document.getElementById('topbar-title').innerHTML = baslik;

  // Marka filtre grubunu göster
  const markaGrup = document.getElementById('fg-marka');
  if (markaGrup) {
    markaGrup.style.display = '';
    const markaBody = document.getElementById('fg-marka-body');
    if (markaBody && markaBody.querySelectorAll('.nav-cin-item[data-val]').length === 0) {
      fetch('/api/filters').then(r => r.json()).then(data => {
        if (data.markalar && data.markalar.length) markalariDoldur(data.markalar);
      });
    }
  }

  // Menüyü kapat, chevron'ı sıfırla
  const submenu = document.getElementById('kartlar-submenu');
  const chevron = document.getElementById('kartlar-chevron');
  if (submenu) submenu.style.display = 'none';
  if (chevron) chevron.style.transform = 'rotate(0deg)';

  loadKartlarData();
}
