# -*- coding: utf-8 -*-
import os
import bcrypt
import secrets
import psycopg2.extras
from flask import Blueprint, jsonify, request, session
from utils.db import get_db
from utils.mail import mail_gonger, mail_template
from utils.query_helpers import login_required

kullanicilar_bp = Blueprint('kullanicilar', __name__)


@kullanicilar_bp.route('/api/benim-bilgilerim')
@login_required
def benim_bilgilerim():
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(
        "SELECT id, email, ad, rol, son_giris, giris_sayisi FROM kullanicilar WHERE id = %s",
        (session['user_id'],)
    )
    user = cursor.fetchone()
    conn.close()
    return jsonify({
        'id': user['id'],
        'email': user['email'],
        'ad': user['ad'] or '',
        'rol': user['rol'] or 'kullanici',
        'son_giris': str(user['son_giris']) if user['son_giris'] else None,
        'giris_sayisi': user['giris_sayisi'] or 0
    })


@kullanicilar_bp.route('/api/kullanicilar')
@login_required
def kullanici_listesi():
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT k.id, k.email, k.ad, k.aktif, k.rol, k.created_at,
               (k.aktif = FALSE AND EXISTS (
                   SELECT 1 FROM sifre_sifirlama s
                   WHERE s.email = k.email AND s.used = FALSE AND s.expires_at > NOW()
               )) AS beklemede
        FROM kullanicilar k
        ORDER BY k.created_at DESC
    """)
    kullanicilar = cursor.fetchall()
    conn.close()
    return jsonify([dict(k) for k in kullanicilar])


@kullanicilar_bp.route('/api/kullanici-davet', methods=['POST'])
@login_required
def kullanici_davet():
    if session.get('user_rol') != 'yonetici':
        return jsonify({'message': 'Yetkisiz erişim.'}), 403
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    ad = data.get('ad', '').strip()
    rol = data.get('rol', 'kullanici')
    if rol not in ['yonetici', 'kullanici']:
        rol = 'kullanici'

    if not email or not ad:
        return jsonify({'message': 'Ad ve e-posta zorunludur.'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT aktif FROM kullanicilar WHERE email = %s", (email,))
        mevcut = cursor.fetchone()
        conn.close()
    except Exception as e:
        return jsonify({'message': str(e)}), 500

    if mevcut:
        if mevcut['aktif']:
            return jsonify({'message': 'Bu e-posta adresi zaten kayıtlı ve aktif.'}), 400
        else:
            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("DELETE FROM sifre_sifirlama WHERE email = %s", (email,))
                cursor.execute("DELETE FROM kullanicilar WHERE email = %s", (email,))
                conn.commit()
                conn.close()
            except Exception as e:
                return jsonify({'message': str(e)}), 500

    dummy_hash = bcrypt.hashpw(secrets.token_hex(16).encode(), bcrypt.gensalt()).decode()
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO kullanicilar (email, sifre_hash, ad, aktif, rol) VALUES (%s, %s, %s, FALSE, %s)",
            (email, dummy_hash, ad, rol)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        return jsonify({'message': str(e)}), 500

    token = secrets.token_urlsafe(32)
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sifre_sifirlama (email, token, expires_at) VALUES (%s, %s, NOW() + INTERVAL '7 days')",
            (email, token)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        try:
            conn2 = get_db()
            c2 = conn2.cursor()
            c2.execute("DELETE FROM kullanicilar WHERE email = %s AND aktif = FALSE", (email,))
            conn2.commit()
            conn2.close()
        except Exception:
            pass
        return jsonify({'message': 'Token oluşturma hatası.'}), 500

    rol_label = 'Yönetici' if rol == 'yonetici' else 'Kullanıcı'
    base_url = os.getenv('BASE_URL', 'http://127.0.0.1:5000')
    davet_link = f"{base_url}/hesap-olustur/{token}"
    icerik = f"""
        <p style="color:#6b7a90;font-size:14px;line-height:1.6;margin-bottom:20px;">
          Merhaba {ad},<br><br>
          Sporthink Satış Analiz Paneline <strong>{rol_label}</strong> olarak davet edildiniz.
          Hesabınıza erişmek için aşağıdaki butona tıklayın ve şifrenizi belirleyin.
        </p>
        <a href="{davet_link}" style="display:inline-block;background:#e02020;color:white;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
          Hesabımı Oluştur →
        </a>
        <p style="color:#b0bec8;font-size:12px;margin-top:20px;">Bu link <strong>7 gün</strong> geçerlidir ve yalnızca bir kez kullanılabilir.</p>
        <p style="color:#b0bec8;font-size:12px;margin-top:6px;">Bu daveti siz talep etmediyseniz bu e-postayı görmezden gelebilirsiniz.</p>
    """
    mail_gitti, mail_hata = mail_gonger([email], "Sporthink — Hesabınıza Davet Edildiniz", mail_template(icerik))
    if not mail_gitti:
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sifre_sifirlama WHERE token = %s", (token,))
            cursor.execute("DELETE FROM kullanicilar WHERE email = %s AND aktif = FALSE", (email,))
            conn.commit()
            conn.close()
        except Exception:
            pass
        hata_mesaj = 'Davet e-postası gönderilemedi.'
        if mail_hata and 'SMTPAuthenticationError' in mail_hata:
            hata_mesaj = 'Gmail App Şifresi geçersiz veya süresi dolmuş. .env dosyasındaki MAIL_PASSWORD değerini güncelleyin.'
        elif mail_hata and ('Connection' in mail_hata or 'timeout' in mail_hata.lower()):
            hata_mesaj = 'SMTP sunucusuna bağlanılamadı. İnternet bağlantısını ve güvenlik duvarı ayarlarını kontrol edin.'
        elif mail_hata:
            hata_mesaj = f'Mail gönderilemedi: {mail_hata}'
        return jsonify({'message': hata_mesaj}), 500
    return jsonify({'ok': True})


@kullanicilar_bp.route('/api/kullanici-rol/<int:kullanici_id>', methods=['POST'])
@login_required
def kullanici_rol(kullanici_id):
    if session.get('user_rol') != 'yonetici':
        return jsonify({'message': 'Yetkisiz erişim.'}), 403
    data = request.get_json()
    yeni_rol = data.get('rol', 'kullanici')
    if yeni_rol not in ['yonetici', 'kullanici']:
        return jsonify({'message': 'Geçersiz rol.'}), 400
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE kullanicilar SET rol = %s WHERE id = %s", (yeni_rol, kullanici_id))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


@kullanicilar_bp.route('/api/kullanici-pasif/<int:kullanici_id>', methods=['POST'])
@login_required
def kullanici_pasif(kullanici_id):
    if session.get('user_rol') != 'yonetici':
        return jsonify({'message': 'Yetkisiz erişim.'}), 403
    if kullanici_id == session.get('user_id'):
        return jsonify({'message': 'Kendi hesabınızı pasif yapamazsınız.'}), 400
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE kullanicilar SET aktif = FALSE WHERE id = %s", (kullanici_id,))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


@kullanicilar_bp.route('/api/kullanici-kalici-sil/<int:kullanici_id>', methods=['POST'])
@login_required
def kullanici_kalici_sil(kullanici_id):
    if session.get('user_rol') != 'yonetici':
        return jsonify({'message': 'Yetkisiz erişim.'}), 403
    if kullanici_id == session.get('user_id'):
        return jsonify({'message': 'Kendi hesabınızı silemezsiniz.'}), 400
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM sifre_sifirlama WHERE email = (SELECT email FROM kullanicilar WHERE id = %s)",
        (kullanici_id,)
    )
    cursor.execute("DELETE FROM kullanicilar WHERE id = %s", (kullanici_id,))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


@kullanicilar_bp.route('/api/sistem-ayarlari')
@login_required
def sistem_ayarlari_getir():
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT anahtar, deger FROM sistem_ayarlari")
        rows = cursor.fetchall()
        conn.close()
        return jsonify({r['anahtar']: r['deger'] for r in rows})
    except Exception:
        return jsonify({})


@kullanicilar_bp.route('/api/sistem-ayarlari-kaydet', methods=['POST'])
@login_required
def sistem_ayarlari_kaydet():
    if session.get('user_rol') != 'yonetici':
        return jsonify({'message': 'Yetkisiz erişim.'}), 403
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Veri bulunamadı.'}), 400
    try:
        conn = get_db()
        cursor = conn.cursor()
        for anahtar, deger in data.items():
            cursor.execute("""
                INSERT INTO sistem_ayarlari (anahtar, deger, guncelleme)
                VALUES (%s, %s, NOW())
                ON CONFLICT (anahtar) DO UPDATE SET deger = EXCLUDED.deger, guncelleme = NOW()
            """, (anahtar, str(deger)))
        conn.commit()
        conn.close()
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@kullanicilar_bp.route('/api/sistem-bilgisi')
@login_required
def sistem_bilgisi():
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Global istatistikler
    cursor.execute("""
        SELECT COUNT(DISTINCT stok_kodu)    AS urun_sayisi,
               COUNT(DISTINCT hafta_no)     AS hafta_sayisi,
               COUNT(DISTINCT alt_kategori) AS kategori_sayisi,
               COUNT(DISTINCT marka)        AS marka_sayisi,
               MIN(urun_giris_tarihi)       AS baslangic,
               MAX(urun_giris_tarihi)       AS bitis
        FROM urun_analiz
    """)
    global_row = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) AS kullanici_sayisi FROM kullanicilar WHERE aktif = TRUE")
    kullanici = cursor.fetchone()

    # Sezon bazlı detaylar
    cursor.execute("""
        SELECT sezon,
               COUNT(DISTINCT stok_kodu)    AS urun_sayisi,
               COUNT(DISTINCT hafta_no)     AS hafta_sayisi,
               COUNT(DISTINCT alt_kategori) AS kategori_sayisi,
               COUNT(DISTINCT marka)        AS marka_sayisi,
               MIN(urun_giris_tarihi)       AS baslangic,
               MAX(urun_giris_tarihi)       AS bitis
        FROM urun_analiz
        WHERE sezon IS NOT NULL AND sezon != 'nan'
        GROUP BY sezon
        ORDER BY sezon
    """)
    sezon_rows = cursor.fetchall()

    # En güncel sezon = en büyük giriş tarihine sahip sezon
    cursor.execute("""
        SELECT sezon FROM urun_analiz
        WHERE sezon IS NOT NULL AND sezon != 'nan'
        GROUP BY sezon
        ORDER BY MAX(urun_giris_tarihi) DESC NULLS LAST
        LIMIT 1
    """)
    son_sezon_row = cursor.fetchone()
    sezonlar = [r['sezon'] for r in sezon_rows]
    aktif_sezon = son_sezon_row['sezon'] if son_sezon_row else (sezonlar[-1] if sezonlar else '—')

    conn.close()

    sezon_detaylari = [
        {
            'sezon': r['sezon'],
            'urun_sayisi': r['urun_sayisi'],
            'hafta_sayisi': r['hafta_sayisi'],
            'kategori_sayisi': r['kategori_sayisi'],
            'marka_sayisi': r['marka_sayisi'],
            'baslangic': str(r['baslangic']) if r['baslangic'] else '—',
            'bitis': str(r['bitis']) if r['bitis'] else '—',
        }
        for r in sezon_rows
    ]

    return jsonify({
        'urun_sayisi': global_row['urun_sayisi'],
        'hafta_sayisi': global_row['hafta_sayisi'],
        'kategori_sayisi': global_row['kategori_sayisi'],
        'marka_sayisi': global_row['marka_sayisi'],
        'baslangic': str(global_row['baslangic']) if global_row['baslangic'] else '—',
        'bitis': str(global_row['bitis']) if global_row['bitis'] else '—',
        'kullanici_sayisi': kullanici['kullanici_sayisi'],
        'sezonlar': sezonlar,
        'aktif_sezon': aktif_sezon,
        'sezon_detaylari': sezon_detaylari,
    })


@kullanicilar_bp.route('/api/profil-guncelle', methods=['POST'])
@login_required
def profil_guncelle():
    data = request.get_json()
    ad = data.get('ad', '').strip()
    mevcut_sifre = data.get('mevcut_sifre', '')
    yeni_sifre = data.get('yeni_sifre', '')

    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM kullanicilar WHERE id = %s", (session['user_id'],))
    user = cursor.fetchone()

    if ad:
        cursor.execute("UPDATE kullanicilar SET ad = %s WHERE id = %s", (ad, session['user_id']))
        session['user_ad'] = ad

    if mevcut_sifre and yeni_sifre:
        try:
            gecerli = bcrypt.checkpw(mevcut_sifre.encode('utf-8'), user['sifre_hash'].encode('utf-8'))
        except Exception:
            gecerli = False
        if not gecerli:
            conn.close()
            return jsonify({'message': 'Mevcut şifre hatalı.'}), 400
        if len(yeni_sifre) < 6:
            conn.close()
            return jsonify({'message': 'Yeni şifre en az 6 karakter olmalıdır.'}), 400
        yeni_hash = bcrypt.hashpw(yeni_sifre.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute("UPDATE kullanicilar SET sifre_hash = %s WHERE id = %s", (yeni_hash, session['user_id']))

    conn.commit()
    conn.close()
    return jsonify({'ok': True})
