/* ── YARDIMCI FONKSİYONLAR ── */

function fmtSayi(val, basamak) {
  basamak = (basamak === undefined) ? 0 : basamak;
  return (parseFloat(val) || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: basamak,
    maximumFractionDigits: basamak
  });
}
function fmtPara(val, basamak) {
  const v = parseFloat(val) || 0;
  if (basamak !== undefined) return '₺' + fmtSayi(v, basamak);
  if (Math.abs(v) >= 1e6) return '₺' + fmtSayi(v / 1e6, 1) + 'M';
  if (Math.abs(v) >= 1e3) return '₺' + fmtSayi(v / 1e3, 1) + 'B';
  return '₺' + fmtSayi(v, 0);
}
function fmtYuzde(val, basamak) {
  return '%' + fmtSayi(val, basamak === undefined ? 1 : basamak);
}

function autoHideMsg(el) {
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.add('fading');
    setTimeout(() => { el.style.display = 'none'; el.classList.remove('fading'); }, 500);
  }, 3000);
}

function toggleNavFilter(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.classList.toggle('open', !group.classList.contains('open'));
  if (groupId === 'fg-bsskor' && group.classList.contains('open')) {
    requestAnimationFrame(updateSliders);
  }
  if (groupId === 'fg-marka' && group.classList.contains('open')) {
    const body = document.getElementById('fg-marka-body');
    if (body && body.querySelectorAll('.nav-cin-item').length === 0) {
      fetch('/api/filters').then(r => r.json()).then(data => {
        if (data.markalar && data.markalar.length) markalariDoldur(data.markalar);
      });
    }
  }
}

function toggleFilterAccordion() {
  const section = document.getElementById('nav-filter-section');
  if (section) section.classList.toggle('acc-open');
}

function filtreSifirla() {
  currentCinsiyetler = [];
  currentAnaGrupList = [];
  currentAltKatList = [];
  currentMarkaList = [];
  updateMarkaUI();

  const donemSel = document.getElementById('donem-select');
  if (donemSel && donemSel.options.length > 0) donemSel.selectedIndex = 0;

  const sezonSel = document.getElementById('sezon-select');
  if (sezonSel) sezonSel.value = '';

  ['Aksesuar', 'Ayakkabı', 'Giyim'].forEach(grp => {
    const sub = document.getElementById('ag-sub-' + grp);
    const chev = document.querySelector('#ag-item-' + grp + ' .nav-anagrp-chevron');
    if (sub) sub.classList.remove('open');
    if (chev) chev.style.transform = 'rotate(0deg)';
  });

  document.querySelectorAll('.nav-altkat-item').forEach(i => i.classList.remove('active'));

  document.querySelectorAll('.nav-filter-group').forEach(g => g.classList.remove('open'));

  updateCinsiyetUI();
  updateAnaGrupUI();
  updateMarkaUI();
  updateFilterSummaries();
  renderActiveFilterChips();
  loadData();
}

function toggleSidebar() {
  const sidebar = document.getElementById('nav-sidebar');
  sidebar.classList.toggle('collapsed');
  if (sidebar.classList.contains('collapsed')) {
    const submenu = document.getElementById('kartlar-submenu');
    const chevron = document.getElementById('kartlar-chevron');
    if (submenu) submenu.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
}

function dismissWelcome() {
  document.getElementById('welcome-banner').classList.add('hidden');
}

function setupWelcome(userName) {
  const days = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const now = new Date();
  document.getElementById('welcome-heading').textContent = 'Hoş geldiniz, ' + (userName || 'Kullanıcı');
  document.getElementById('welcome-day').textContent = days[now.getDay()];
  document.getElementById('welcome-datestr').textContent = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
}
