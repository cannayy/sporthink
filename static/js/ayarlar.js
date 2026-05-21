/* ── PROFİL & AYARLAR ── */

function ayarTabSec(name, el) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['genel', 'kullanici', 'sistem'].forEach(n => {
    const div = document.getElementById('tab-' + n);
    if (div) div.style.display = (n === name) ? 'block' : 'none';
  });
  if (name === 'kullanici' && typeof kullanicilariYukle === 'function') kullanicilariYukle();
}


async function profilSayfasiYukle() {
  try {
    const ben = await fetch('/api/benim-bilgilerim').then(r=>r.json());
    const ad = ben.ad || '';

    const emailEl = document.getElementById('profil-email');
    if (emailEl) emailEl.textContent = ben.email || '';

    const adInput = document.getElementById('profil-ad');
    if (adInput) { adInput.value = ad; adInput.disabled = true; }

    const adBtn = document.getElementById('profil-ad-btn');
    if (adBtn) { adBtn.textContent = 'Değiştir'; adBtn.className = 'btn'; }

    const rolBadge = document.getElementById('profil-rol-badge');
    if (rolBadge) {
      rolBadge.textContent = ben.rol === 'yonetici' ? 'Yönetici' : 'Kullanıcı';
      rolBadge.className = 'role-pill ' + (ben.rol === 'yonetici' ? 'role-yonetici' : 'role-kullanici');
    }

    const dmToggle = document.getElementById('dark-mode-toggle');
    if (dmToggle) dmToggle.checked = sessionStorage.getItem('sporthink_dark') === '1';
    const hfToggle = document.getElementById('hatirla-filtre-toggle');
    if (hfToggle) {
      const _t = JSON.parse(localStorage.getItem('sporthink_tercihler') || '{}');
      hfToggle.checked = !!_t.hatirlaFiltre;
    }

    // Şifre alanlarını temizle, göz ikonlarını sıfırla
    ['profil-sifre-eski','profil-sifre-yeni','profil-sifre-tekrar'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = '';
      el.type = 'password';
      const btn = el.parentElement.querySelector('.input-pwd-toggle');
      if (btn) btn.querySelector('svg').innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/><circle cx="12" cy="12" r="3"/>';
    });

    // Admin sekmeleri: yönetici değilse gizle, değişse genel'e dön
    const isAdmin = ben.rol === 'yonetici';
    const tabKullanici = document.querySelector('[data-tab="kullanici"]');
    const tabSistem = document.querySelector('[data-tab="sistem"]');
    if (tabKullanici) tabKullanici.style.display = isAdmin ? '' : 'none';
    if (tabSistem) tabSistem.style.display = isAdmin ? '' : 'none';
    if (!isAdmin) {
      const genelBtn = document.querySelector('[data-tab="genel"]');
      if (genelBtn) ayarTabSec('genel', genelBtn);
    }
    if (isAdmin) ayarlarSayfasiYukle();

  } catch(e) {}
}

// Tercihler localStorage'dan yükle
function tercihleriYukle() {
  const t = JSON.parse(localStorage.getItem('sporthink_tercihler') || '{}');
  if (!t.hatirlaFiltre) return t;
  const f = JSON.parse(localStorage.getItem('sporthink_son_filtreler') || 'null');
  if (!f) return t;
  // Dönem tipini buildDonemSelect'ten ÖNCE ayarla (select option'ları bu değere göre doluyor)
  if (f.period) {
    currentPeriod = f.period;
    document.querySelectorAll('.period-btn-sm').forEach(b => b.classList.remove('active'));
    const btn = f.period === 'hafta' ? document.getElementById('pb-hafta') : document.getElementById('pb-ay');
    if (btn) btn.classList.add('active');
  }
  return t;
}

// Önbellek: sayfa açık kaldığı sürece yeniden fetch gerekmez
let _sistemBilgisi = null;

async function ayarlarSayfasiYukle() {
  try {
    const data = await fetch('/api/sistem-bilgisi').then(r => r.json());
    _sistemBilgisi = data;
    // Başlangıçta tüm sezon (Tümü) statslerini göster
    _statsGuncelle(data);
    _tarihAraliginiGuncelle(data);
    _sezonKartlariniOlustur(data);
    document.getElementById('aktif-sezon-text').textContent = _seciliSezon || 'Tümü';
  } catch(e) {}
}

function _statsGuncelle(d) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('sys-urun',      (d.urun_sayisi || 0).toLocaleString('tr-TR'));
  set('sys-kategori',  d.kategori_sayisi || '—');
  set('sys-marka',     d.marka_sayisi    || '—');
  set('sys-hafta',     d.hafta_sayisi    || '—');
  set('sys-kullanici', d.kullanici_sayisi || '—');
}

function _tarihFormatla(iso) {
  if (!iso || iso === '—') return '—';
  const [y, m, d] = iso.split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${parseInt(d)} ${aylar[parseInt(m)-1]} ${y}`;
}

function _tarihAraliginiGuncelle(d) {
  // Gizli yardımcı spanlar
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
  set('sys-baslangic', d.baslangic !== '—' ? d.baslangic : '—');
  set('sys-bitis',     d.bitis     !== '—' ? d.bitis     : '—');
  // Görünür tarih aralığı
  const el = document.getElementById('vo-sezon-aralik');
  if (!el) return;
  if (!d.baslangic || d.baslangic === '—') { el.textContent = '—'; return; }
  const hafta = d.hafta_sayisi ? ' · ' + d.hafta_sayisi + ' hafta' : '';
  el.textContent = _tarihFormatla(d.baslangic) + ' — ' + _tarihFormatla(d.bitis) + hafta;
}

function _sezonRengi(sezon) {
  if (!sezon) return 'vo-sc-gray';
  const kod = sezon.toUpperCase();
  if (kod.endsWith('F')) return 'vo-sc-red';
  if (kod.endsWith('S')) return 'vo-sc-blue';
  return 'vo-sc-gray';
}

function _sezonEtiketi(sezon) {
  if (!sezon) return 'Tüm Sezonlar';
  const kod = sezon.toUpperCase();
  const yilNo = kod.replace(/\D/g, '').slice(0, 2);
  const yil = yilNo ? ' 20' + yilNo : '';
  if (kod.endsWith('F')) return 'Sonbahar / Kış' + yil;
  if (kod.endsWith('S')) return 'İlkbahar / Yaz' + yil;
  return sezon;
}

function _sezonBadgeStyle() {
  return document.body.classList.contains('dark')
    ? 'color:#78AF78;background:rgba(120,175,120,0.13)'
    : 'color:#5f955f;background:rgba(95,149,95,0.12)';
}

function _sezonKartlariniOlustur(data) {
  const wrap = document.getElementById('sezon-chips-wrap');
  if (!wrap) return;
  const detaylar = data.sezon_detaylari || [];
  const karlar = detaylar.map(s => {
    const aktif = s.sezon === _seciliSezon ? 'active' : '';
    const renk = _sezonRengi(s.sezon);
    const etiket = _sezonEtiketi(s.sezon);
    const badgeStyle = _sezonBadgeStyle(s.sezon);
    const urun = (s.urun_sayisi || 0).toLocaleString('tr-TR');
    return `<div class="vo-sc ${renk} ${aktif}" onclick="sezonChipSec('${s.sezon}', this)">
      <div class="vo-sc-head"><span class="vo-sc-chip">${s.sezon}</span><span class="vo-sc-badge" style="${badgeStyle}">✓ AKTİF</span></div>
      <div class="vo-sc-label">${etiket}</div>
      <div class="vo-sc-count"><span class="vo-sc-num">${urun}</span><span class="vo-sc-unit"> ürün</span></div>
    </div>`;
  });
  // Tümü kartı
  const tumuAktif = !_seciliSezon ? 'active' : '';
  const tumuUrun = (data.urun_sayisi || 0).toLocaleString('tr-TR');
  const tumuBadgeStyle = _sezonBadgeStyle('');
  karlar.push(`<div class="vo-sc vo-sc-gray ${tumuAktif}" onclick="sezonChipSec('', this)">
    <div class="vo-sc-head"><span class="vo-sc-chip">Tümü</span><span class="vo-sc-badge" style="${tumuBadgeStyle}">✓ AKTİF</span></div>
    <div class="vo-sc-label">Tüm Sezonlar</div>
    <div class="vo-sc-count"><span class="vo-sc-num">${tumuUrun}</span><span class="vo-sc-unit"> ürün</span></div>
  </div>`);
  wrap.innerHTML = karlar.join('');
}

let _seciliSezon = '';
function sezonChipSec(sezon, el) {
  _seciliSezon = sezon;
  document.querySelectorAll('.vo-sc').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('aktif-sezon-text').textContent = sezon || 'Tümü';
  // Stats'ı önbellekten güncelle (ek fetch gerekmez)
  if (!_sistemBilgisi) return;
  if (!sezon) {
    _statsGuncelle(_sistemBilgisi);
    _tarihAraliginiGuncelle(_sistemBilgisi);
  } else {
    const d = (_sistemBilgisi.sezon_detaylari || []).find(s => s.sezon === sezon);
    if (d) {
      _statsGuncelle({ ...d, kullanici_sayisi: _sistemBilgisi.kullanici_sayisi });
      _tarihAraliginiGuncelle(d);
    }
  }
}

async function sezonUygula() {
  const sezonSelect = document.getElementById('sezon-select');
  if (sezonSelect) {
    sezonSelect.value = _seciliSezon;
    loadData();
  }
  try {
    await fetch('/api/sistem-ayarlari-kaydet', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ aktif_sezon: _seciliSezon })
    });
  } catch(e) {}
  const msg = document.getElementById('sezon-msg');
  msg.className = 'profil-msg ok'; msg.style.display = 'block';
  msg.textContent = '✓ Sezon uygulandı: ' + (_seciliSezon || 'Tüm Sezonlar') + ' — tüm kullanıcılar etkilendi.';
  autoHideMsg(msg);
}

async function profilKaydet() {
  const ad = document.getElementById('profil-ad').value.trim();
  const msg = document.getElementById('profil-bilgi-msg');
  if (!ad) { msg.className='profil-msg err'; msg.style.display='block'; msg.textContent='Ad Soyad boş olamaz.'; return; }

  const res = await fetch('/api/profil-guncelle', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ad})
  });
  const data = await res.json();
  msg.style.display = 'block';
  if (res.ok) {
    msg.className = 'profil-msg ok';
    msg.textContent = '✓ Profil bilgileri güncellendi.';
    autoHideMsg(msg);
    const unText = document.getElementById('user-name-text');
    if (unText) unText.textContent = ad;
    const adInput = document.getElementById('profil-ad');
    if (adInput) { adInput.disabled = true; }
    const adBtn = document.getElementById('profil-ad-btn');
    if (adBtn) { adBtn.textContent = 'Değiştir'; adBtn.className = 'btn'; }
  } else {
    msg.className = 'profil-msg err';
    msg.textContent = data.message || 'Bir hata oluştu.';
  }
}

function toggleAdEdit() {
  const input = document.getElementById('profil-ad');
  const btn   = document.getElementById('profil-ad-btn');
  if (input.disabled) {
    input.disabled = false;
    input.focus();
    btn.textContent = 'Kaydet';
    btn.className = 'btn btn-primary';
  } else {
    profilKaydet();
  }
}

function togglePwd(inputId, btn) {
  const el = document.getElementById(inputId);
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  btn.querySelector('svg').innerHTML = show
    ? '<line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" stroke="currentColor" stroke-width="2" fill="none"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/><circle cx="12" cy="12" r="3"/>';
}

function toggleDarkModePref(cb) {
  const on = cb.checked;
  sessionStorage.setItem('sporthink_dark', on ? '1' : '0');
  localStorage.removeItem('sporthink_dark');
  document.body.classList.toggle('dark', on);
  if (typeof temayiGrafiklereUygula === 'function') temayiGrafiklereUygula();
}

function cikisYap() {
  sessionStorage.removeItem('sporthink_dark');
  localStorage.removeItem('sporthink_dark');
  window.location.href = '/logout';
}

function toggleHatirlaFiltrePref(cb) {
  const t = JSON.parse(localStorage.getItem('sporthink_tercihler') || '{}');
  t.hatirlaFiltre = cb.checked;
  localStorage.setItem('sporthink_tercihler', JSON.stringify(t));
  if (cb.checked) {
    // Toggle açıldığında mevcut filtreleri hemen kaydet
    localStorage.setItem('sporthink_son_filtreler', JSON.stringify({
      period:       currentPeriod,
      donem_deger:  document.getElementById('donem-select')?.value || '',
      sezon:        document.getElementById('sezon-select')?.value || '',
      cinsiyet:     currentCinsiyetler,
      ana_grup_list: currentAnaGrupList,
      alt_kategori: currentAltKatList
    }));
  } else {
    localStorage.removeItem('sporthink_son_filtreler');
  }
}

function filtrelerYukle() {
  const t = JSON.parse(localStorage.getItem('sporthink_tercihler') || '{}');
  if (!t.hatirlaFiltre) return;
  const f = JSON.parse(localStorage.getItem('sporthink_son_filtreler') || 'null');
  if (!f) return;

  // Dönem değeri (buildDonemSelect çalıştıktan sonra select dolu olduğu için buraya alındı)
  if (f.donem_deger) {
    const s = document.getElementById('donem-select');
    if (s) s.value = f.donem_deger;
  }

  // Sezon (buildDonemSelect sezon options'ları doldurur, sonra restore edilir)
  if (f.sezon !== undefined) {
    const s = document.getElementById('sezon-select');
    if (s) s.value = f.sezon;
  }

  // Cinsiyet
  if (Array.isArray(f.cinsiyet)) {
    currentCinsiyetler = [...f.cinsiyet];
    updateCinsiyetUI();
  }

  // Ana grup (yeni çoklu format + eski tekli format uyumluluğu)
  const agList = Array.isArray(f.ana_grup_list) ? f.ana_grup_list : (f.ana_grup ? [f.ana_grup] : null);
  if (agList !== null) {
    currentAnaGrupList = [...agList];
    updateAnaGrupUI();
  }

  // Alt kategori
  if (Array.isArray(f.alt_kategori)) {
    currentAltKatList = [...f.alt_kategori];
  }
}

async function sifreDegistir() {
  const eski = document.getElementById('profil-sifre-eski').value;
  const yeni = document.getElementById('profil-sifre-yeni').value;
  const tekrar = document.getElementById('profil-sifre-tekrar').value;
  const msg = document.getElementById('profil-sifre-msg');

  if (!eski || !yeni || !tekrar) { msg.className='profil-msg err'; msg.style.display='block'; msg.textContent='Tüm alanları doldurun.'; return; }
  if (yeni !== tekrar) { msg.className='profil-msg err'; msg.style.display='block'; msg.textContent='Yeni şifreler eşleşmiyor.'; return; }
  if (yeni.length < 6) { msg.className='profil-msg err'; msg.style.display='block'; msg.textContent='Şifre en az 6 karakter olmalı.'; return; }

  const res = await fetch('/api/profil-guncelle', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({mevcut_sifre: eski, yeni_sifre: yeni})
  });
  const data = await res.json();
  msg.style.display = 'block';
  if (res.ok) {
    msg.className = 'profil-msg ok';
    msg.textContent = '✓ Şifreniz güncellendi.';
    autoHideMsg(msg);
    document.getElementById('profil-sifre-eski').value = '';
    document.getElementById('profil-sifre-yeni').value = '';
    document.getElementById('profil-sifre-tekrar').value = '';
  } else {
    msg.className = 'profil-msg err';
    msg.textContent = data.message || 'Bir hata oluştu.';
  }
}

function updateAyarSliders() {
  const g = parseInt(document.getElementById('ayar-gmroi').value);
  const s = parseInt(document.getElementById('ayar-st').value);
  const c = parseInt(document.getElementById('ayar-cover').value);
  document.getElementById('ayar-v-gmroi').textContent = g;
  document.getElementById('ayar-v-st').textContent = s;
  document.getElementById('ayar-v-cover').textContent = c;
  const toplam = g + s + c;
  const totEl = document.getElementById('ayar-toplam');
  if (totEl) totEl.textContent = toplam;
  const totDiv = document.querySelector('.slider-toplam');
  if (totDiv) totDiv.classList.toggle('invalid', toplam !== 100);
  const checkEl = document.querySelector('.slider-check');
  if (checkEl) checkEl.style.visibility = toplam === 100 ? 'visible' : 'hidden';
}

function updateSpStack() {
  const g = parseInt(document.getElementById('ayar-gmroi').value) || 0;
  const s = parseInt(document.getElementById('ayar-st').value) || 0;
  const c = parseInt(document.getElementById('ayar-cover').value) || 0;
  const t = g + s + c;
  const pct = v => (v / Math.max(t, 1) * 100).toFixed(1) + '%';
  const sg = document.getElementById('sp-seg-gmroi'); if (sg) sg.style.width = pct(g);
  const ss = document.getElementById('sp-seg-st');    if (ss) ss.style.width = pct(s);
  const sc = document.getElementById('sp-seg-cover'); if (sc) sc.style.width = pct(c);
  const lg = document.getElementById('sp-leg-gmroi'); if (lg) lg.textContent = g;
  const ls = document.getElementById('sp-leg-st');    if (ls) ls.textContent = s;
  const lc = document.getElementById('sp-leg-cover'); if (lc) lc.textContent = c;
  const ok = document.getElementById('sp-legend-ok'); if (ok) ok.style.display = t === 100 ? '' : 'none';
}

const DEFAULT_WEIGHTS = { gmroi: 40, st: 35, cover: 25 };

function spSifirla() {
  ['gmroi', 'st', 'cover'].forEach(k => {
    const range = document.getElementById('ayar-' + k);
    if (range) range.value = DEFAULT_WEIGHTS[k];
    spSyncFromRange(k);
  });
  updateAyarSliders(); updateSpStack();
}

function spUpdateFooter() {
  const tot = (['gmroi','st','cover'].reduce((s, k) => {
    return s + (parseInt(document.getElementById('ayar-' + k)?.value) || 0);
  }, 0));
  const numEl = document.getElementById('sp-total-num');
  const statusEl = document.getElementById('sp-total-status');
  if (numEl) { numEl.textContent = tot; numEl.style.color = tot === 100 ? '#16A34A' : '#E63030'; }
  if (statusEl) {
    statusEl.textContent = tot === 100 ? '✓ dengeli' : '· 100% olmalı';
    statusEl.style.color = tot === 100 ? '#16A34A' : '#9CA3AF';
  }
}

function spSyncFromRange(key) {
  const range = document.getElementById('ayar-' + key);
  if (!range) return;
  const v = range.value;
  const num = document.getElementById('sp-num-' + key);
  const fill = document.getElementById('sp-fill-' + key);
  if (num) num.value = v;
  if (fill) fill.style.width = v + '%';
  spUpdateFooter();
}

function spSyncFromNum(key) {
  const num = document.getElementById('sp-num-' + key);
  const range = document.getElementById('ayar-' + key);
  const fill = document.getElementById('sp-fill-' + key);
  if (!num || !range) return;
  const v = Math.max(0, Math.min(100, parseInt(num.value) || 0));
  range.value = v;
  if (fill) fill.style.width = v + '%';
  updateAyarSliders(); updateSpStack(); spUpdateFooter();
}

function spClamp(key) {
  const num = document.getElementById('sp-num-' + key);
  if (!num) return;
  const v = Math.max(0, Math.min(100, parseInt(num.value) || 0));
  num.value = v;
  spSyncFromNum(key);
}

function spStep(key, delta) {
  const range = document.getElementById('ayar-' + key);
  if (!range) return;
  const v = Math.max(0, Math.min(100, (parseInt(range.value) || 0) + delta));
  range.value = v;
  spSyncFromRange(key);
  updateAyarSliders(); updateSpStack();
}

function esikSifirla() {
  const r  = document.getElementById('esik-risk');        if (r)  r.value  = 15;
  const ms = document.getElementById('esik-min-st');      if (ms) ms.value = 55;
  const mc = document.getElementById('esik-max-cover');   if (mc) mc.value = 12;
  const cc = document.getElementById('esik-ciro-cover');  if (cc) cc.value = 10;
}

async function ayarlariKaydet() {
  const g = parseInt(document.getElementById('ayar-gmroi').value);
  const s = parseInt(document.getElementById('ayar-st').value);
  const c = parseInt(document.getElementById('ayar-cover').value);
  const msg = document.getElementById('ayar-msg');
  if (g + s + c !== 100) {
    msg.className = 'profil-msg err'; msg.style.display = 'block';
    msg.textContent = 'Toplam 100 olmalıdır.'; return;
  }
  globalWeights = { gmroi: g / 100, st: s / 100, cover: c / 100 };
  loadData();
  try {
    await fetch('/api/sistem-ayarlari-kaydet', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ w_gmroi: String(g/100), w_st: String(s/100), w_cover: String(c/100) })
    });
  } catch(e) {}
  msg.className = 'profil-msg ok'; msg.style.display = 'block';
  msg.textContent = '✓ Global ağırlıklar güncellendi ve tüm kullanıcılara uygulandı.';
  autoHideMsg(msg);
}

function geSpin(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = Math.max(parseInt(el.min), Math.min(parseInt(el.max), (parseInt(el.value) || 0) + delta));
}

function geClamp(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = Math.max(parseInt(el.min), Math.min(parseInt(el.max), parseInt(el.value) || parseInt(el.min)));
}

function geSifirla() {
  [['ge-ciro-st', 55], ['ge-kar-st', 55], ['ge-kar-cover', 10], ['marka-st-cut', 50], ['marka-gm-cut', 15]].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

function updateChartSubtitles() {
  const ciroSt    = Math.round((window.ESIK_MIN_ST_CIRO || 0.55) * 100);
  const ciroCover = window.ESIK_MAX_COVER_CIRO || 10;
  const karSt     = Math.round((window.ESIK_MIN_ST_KAR  || 0.55) * 100);
  const karCover  = window.ESIK_MAX_COVER_KAR  || 10;
  const ciroEl  = document.getElementById('ciro-chart-subtitle');
  const karliEl = document.getElementById('karli-chart-subtitle');
  if (ciroEl)  ciroEl.textContent  = 'Ciro katkısı en yüksek 10 ürün · ST>%' + ciroSt + ' · Cover<' + ciroCover + ' hafta';
  if (karliEl) karliEl.textContent = 'Brüt kâr katkısı en yüksek 10 ürün · ST>%' + karSt + ' · Cover<' + karCover + ' hafta';
}

async function esikleriKaydet() {
  const risk      = parseInt(document.getElementById('esik-risk').value);
  const bsSt      = parseInt(document.getElementById('esik-min-st').value);
  const bsCover   = parseInt(document.getElementById('esik-max-cover').value);
  const ciroSt    = parseInt(document.getElementById('ge-ciro-st').value);
  const ciroCover = parseInt(document.getElementById('esik-ciro-cover').value);
  const karSt     = parseInt(document.getElementById('ge-kar-st').value);
  const karCover  = parseInt(document.getElementById('ge-kar-cover').value);
  const msg = document.getElementById('esik-msg');

  window.ESIK_RISK           = risk;
  window.ESIK_MIN_ST         = bsSt / 100;
  window.ESIK_MAX_COVER_BS   = bsCover;
  window.ESIK_MIN_ST_CIRO    = ciroSt / 100;
  window.ESIK_MAX_COVER_CIRO = ciroCover;
  window.ESIK_MIN_ST_KAR     = karSt / 100;
  window.ESIK_MAX_COVER_KAR  = karCover;

  const markaStCut = parseInt(document.getElementById('marka-st-cut')?.value) || 50;
  const markaGmCut = parseInt(document.getElementById('marka-gm-cut')?.value) || 15;
  window.MARKA_ST_CUT = markaStCut / 100;
  window.MARKA_GM_CUT = markaGmCut;

  updateChartSubtitles();
  loadData();
  try {
    await fetch('/api/sistem-ayarlari-kaydet', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        esik_risk:       String(risk),
        esik_min_st:     String(bsSt / 100),
        esik_max_cover:  String(bsCover),
        esik_ciro_st:    String(ciroSt / 100),
        esik_ciro_cover: String(ciroCover),
        esik_kar_st:     String(karSt / 100),
        esik_kar_cover:  String(karCover),
        marka_st_cut:    String(markaStCut / 100),
        marka_gm_cut:    String(markaGmCut)
      })
    });
  } catch(e) {}
  msg.className = 'profil-msg ok'; msg.style.display = 'block';
  msg.textContent = '✓ Eşikler güncellendi ve tüm kullanıcılara uygulandı.';
  autoHideMsg(msg);
}
