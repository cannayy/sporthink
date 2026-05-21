let currentPeriod = 'hafta';
let currentCinsiyetler = [];
let currentAnaGrupList = [];
let currentAltKatList = [];
let currentMarkaList = [];
let currentSortBy = 'skor';
let currentNav = 'dashboard';
let donutChart = null, karliChart = null, ciroChart = null, markaBarChart = null;
let allBS = [], allWS = [];
let _bsData = [], _wsData = [], _lollipopData = [];
// Yönetici tarafından ayarlanan global sıralama ağırlıkları
let globalWeights = { gmroi: 0.40, st: 0.35, cover: 0.25 };
// Grafik eşikleri (her grafik bağımsız)
window.ESIK_MIN_ST        = 0.55;  // BS listesi
window.ESIK_MAX_COVER_BS  = 12;    // BS listesi
window.ESIK_MIN_ST_CIRO   = 0.55;  // Ciro grafiği
window.ESIK_MAX_COVER_CIRO= 10;    // Ciro grafiği
window.ESIK_MIN_ST_KAR    = 0.55;  // Kâr grafiği
window.ESIK_MAX_COVER_KAR = 10;    // Kâr grafiği
window.ESIK_RISK          = 15;    // Stok risk eşiği
window.MARKA_ST_CUT       = 0.50;  // Marka performansı — ST eşiği
window.MARKA_GM_CUT       = 15;    // Marka performansı — GMROI eşiği

const DONUT_COLORS     = ['#C0392B', '#27AE60', '#2563EB'];
const DONUT_COLORS_EXT = ['#C0392B','#27AE60','#2563EB','#B45309','#9D174D','#065F46','#1E40AF','#92400E','#6D28D9','#0E7490','#7C3AED','#BE185D'];

/* Karanlık mod — düşük doygunluk, mat, koyu zeminde okunur */
const DONUT_COLORS_DARK     = ['#A85650', '#6BAF85', '#5270A6'];
const DONUT_COLORS_EXT_DARK = ['#A85650','#6BAF85','#5270A6','#9A7A38','#884E7A','#3A8070','#485A8E','#9E6445','#664A9A','#387A84','#7A42A0','#9A4065'];

const PAGE_TITLES = {
  dashboard:     'Dashboard <span>Satış Analiz Paneli</span>',
  kartlar:       'Top 10 <span>Best &amp; Worst Seller Kartlar</span>',
  profil:        'Ayarlar <span>Hesap ve sistem tercihlerinizi yapılandırın</span>'
};

const fmt = v => v >= 1e6 ? '₺'+(v/1e6).toFixed(2)+'M' : v >= 1e3 ? '₺'+(v/1e3).toFixed(0)+'K' : '₺'+v.toFixed(0);
