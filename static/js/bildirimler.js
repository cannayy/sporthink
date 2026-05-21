/* ── BİLDİRİM MEKANİZMASI ── */

const BILDIRIM_LS_ANAHTARI = 'sporthink_okundu_ids';

function _okunmusIdler() {
  try { return JSON.parse(localStorage.getItem(BILDIRIM_LS_ANAHTARI) || '[]'); }
  catch { return []; }
}

function _okunmusKaydet(liste) {
  localStorage.setItem(BILDIRIM_LS_ANAHTARI, JSON.stringify(liste));
}

function _tumunuOkunduYap(bildirimler) {
  const okunmuslar = _okunmusIdler();
  let degisti = false;
  bildirimler.forEach(function(b) {
    if (!okunmuslar.includes(b.id)) {
      okunmuslar.push(b.id);
      degisti = true;
    }
  });
  if (degisti) _okunmusKaydet(okunmuslar);
}

function _okunmamisSayisi(bildirimler) {
  const okunmuslar = _okunmusIdler();
  return bildirimler.filter(function(b) { return !okunmuslar.includes(b.id); }).length;
}

function _seviyeRenk(seviye) {
  if (seviye === 'kritik') return 'var(--red)';
  if (seviye === 'uyari')  return 'var(--yellow)';
  return 'var(--blue)';
}

function _seviyeArkaplan(seviye) {
  if (seviye === 'kritik') return 'rgba(214,69,69,0.08)';
  if (seviye === 'uyari')  return 'rgba(251,191,36,0.10)';
  return 'rgba(59,130,246,0.08)';
}

var _bildirimListesi = [];

function bildirimPanelRender(bildirimler) {
  var panel = document.getElementById('bildirim-panel');
  if (!panel) return;
  var okunmuslar = _okunmusIdler();
  if (!bildirimler.length) {
    panel.innerHTML = '<div class="bildirim-bos">Yeni bildirim yok</div>';
    return;
  }
  panel.innerHTML = bildirimler.map(function(b) {
    var okundu = okunmuslar.includes(b.id);
    return '<div class="bildirim-satir' + (okundu ? ' okundu' : '') + '" data-id="' + b.id + '" style="background:' + (okundu ? 'transparent' : _seviyeArkaplan(b.seviye)) + '">'
      + '<div class="bildirim-seviye-cizgi" style="background:' + _seviyeRenk(b.seviye) + '"></div>'
      + '<div class="bildirim-icerik">'
      + '<div class="bildirim-baslik">' + b.baslik + '</div>'
      + '<div class="bildirim-mesaj">' + b.mesaj + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function bildirimBadgeGuncelle(bildirimler) {
  var badge = document.getElementById('bildirim-badge');
  if (!badge) return;
  var sayi = _okunmamisSayisi(bildirimler);
  if (sayi > 0) {
    badge.textContent = sayi > 9 ? '9+' : String(sayi);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

async function bildirimlerYukle() {
  try {
    var veri = await fetch('/api/bildirimler').then(function(r) { return r.json(); });
    _bildirimListesi = veri.bildirimler || [];
    bildirimBadgeGuncelle(_bildirimListesi);
  } catch(e) {
    _bildirimListesi = [];
  }
}

function bildirimDropdownAc(e) {
  e.stopPropagation();
  var wrap = document.getElementById('bildirim-wrap');
  if (!wrap) return;
  var zatenAcik = wrap.classList.contains('open');
  // Kullanıcı dropdownunu kapat
  var userDD = document.getElementById('topbar-user');
  if (userDD) userDD.classList.remove('open');
  if (zatenAcik) {
    wrap.classList.remove('open');
    return;
  }
  wrap.classList.add('open');
  bildirimPanelRender(_bildirimListesi);
  // Okunmamış varsa okundu yap
  if (_okunmamisSayisi(_bildirimListesi) > 0) {
    _tumunuOkunduYap(_bildirimListesi);
    bildirimBadgeGuncelle(_bildirimListesi);
    bildirimPanelRender(_bildirimListesi);
    // Sezon bildirimi varsa session'ı güncelle
    var sezonVar = _bildirimListesi.some(function(b) { return b.id.indexOf('sezon_') === 0; });
    if (sezonVar) {
      fetch('/api/bildirimler/oku', { method: 'POST' }).catch(function() {});
    }
  }
}

// Global click ile bildirim dropdownunu kapat
document.addEventListener('click', function() {
  var wrap = document.getElementById('bildirim-wrap');
  if (wrap) wrap.classList.remove('open');
});
