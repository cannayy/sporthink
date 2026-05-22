/* ── KULLANICI YÖNETİMİ ── */

async function kullanicilariYukle() {
  // Her açılışta davet formunu sıfırla (tarayıcı otomatik doldurmasını önler)
  ['yeni-ad','yeni-email'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const rolEl = document.getElementById('yeni-rol'); if (rolEl) rolEl.value = '';
  try {
    const data = await fetch('/api/kullanicilar').then(r=>r.json());
    const html = data.map(k => {
      const benim = k.id === window._currentUserId;
      const toggleBtn = benim ? '' : k.aktif
        ? `<button onclick="kullaniciPasifYap(${k.id})" class="btn-mini warning">Pasif Yap</button>`
        : `<button onclick="kullaniciAktifYap(${k.id})" class="btn-mini success">Aktif Yap</button>`;
      const silBtn = !benim
        ? `<button onclick="kullaniciKaliciSil(${k.id},'${(k.ad||k.email).replace(/'/g,"\\'")}')" class="btn-mini danger">Sil</button>`
        : '<span style="color:var(--border-md);font-size:11px">—</span>';
      return `
      <tr>
        <td style="font-weight:600">${k.ad||'—'}</td>
        <td style="color:var(--text-mid);overflow:hidden;text-overflow:ellipsis">${k.email}</td>
        <td class="tc">
          <select onchange="rolDegistir(${k.id}, this.value)" ${benim?'disabled':''} class="ku-rol-select">
            <option value="kullanici" ${k.rol==='kullanici'?'selected':''}>Kullanıcı</option>
            <option value="yonetici" ${k.rol==='yonetici'?'selected':''}>Yönetici</option>
          </select>
        </td>
        <td class="tc">${k.beklemede
          ? '<span class="ku-durum beklemede">Beklemede</span>'
          : k.aktif
            ? '<span class="ku-durum aktif">Aktif</span>'
            : '<span class="ku-durum pasif">Pasif</span>'
        }</td>
        <td class="tr">
          <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center">
            ${toggleBtn}${silBtn}
          </div>
        </td>
      </tr>`;
    }).join('');
    const el = document.getElementById('kullanici-liste');
    if (el) el.innerHTML = html;
  } catch(e) {}
}

async function rolDegistir(id, yeniRol) {
  await fetch('/api/kullanici-rol/'+id, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({rol:yeniRol}) });
}

async function kullaniciDavetEt() {
  const ad = document.getElementById('yeni-ad').value.trim();
  const email = document.getElementById('yeni-email').value.trim();
  const rol = document.getElementById('yeni-rol').value;
  const msg = document.getElementById('davet-msg');
  if (!ad || !email || !rol) { msg.className='profil-msg err'; msg.style.display='block'; msg.textContent='Ad, e-posta ve rol zorunludur.'; return; }
  const res = await fetch('/api/kullanici-davet', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ad,email,rol}) });
  const data = await res.json();
  msg.style.display='block';
  if (res.ok) {
    document.getElementById('yeni-ad').value=''; document.getElementById('yeni-email').value=''; document.getElementById('yeni-rol').value='';
    kullanicilariYukle();
    ayarlarSayfasiYukle();
    if (data.mail_basarisiz && data.davet_link) {
      msg.className='profil-msg ok';
      msg.innerHTML='✓ Kullanıcı oluşturuldu. Mail gönderilemedi — daveti manuel paylaş:<br><a href="'+data.davet_link+'" target="_blank" style="word-break:break-all;color:#e02020;">'+data.davet_link+'</a>';
      msg.style.display='block';
    } else {
      msg.className='profil-msg ok'; msg.textContent='✓ Davet gönderildi! '+email+' adresine giriş bilgileri iletildi.';
      msg.style.display='block'; autoHideMsg(msg);
    }
  } else { msg.className='profil-msg err'; msg.textContent=data.message||'Bir hata oluştu.'; msg.style.display='block'; }
}

async function kullaniciPasifYap(id) {
  if (!confirm('Bu kullanıcıyı pasif yapmak istediğinize emin misiniz?')) return;
  await fetch('/api/kullanici-pasif/'+id, {method:'POST'});
  kullanicilariYukle();
  ayarlarSayfasiYukle();
}

async function kullaniciAktifYap(id) {
  await fetch('/api/kullanici-aktif/'+id, {method:'POST'});
  kullanicilariYukle();
  ayarlarSayfasiYukle();
}

let _silOnayId = null;
function kullaniciKaliciSil(id, ad) {
  _silOnayId = id;
  const mesaj = document.getElementById('silme-modal-mesaj');
  if (mesaj) mesaj.textContent = '"' + ad + '" kullanıcısı kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?';
  document.getElementById('silme-modal').classList.add('open');
}

function silmeModalKapat() {
  _silOnayId = null;
  document.getElementById('silme-modal').classList.remove('open');
}

async function silmeOnaylaAction() {
  if (!_silOnayId) return;
  const id = _silOnayId;
  silmeModalKapat();
  await fetch('/api/kullanici-kalici-sil/'+id, {method:'POST'});
  kullanicilariYukle();
  ayarlarSayfasiYukle();
}
