# -*- coding: utf-8 -*-
import os
import bcrypt
import secrets
import psycopg2.extras
from flask import Blueprint, jsonify, request, render_template, session, redirect, url_for
from utils.db import get_db
from utils.mail import mail_gonger_bg, mail_template

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('analiz.index'))
    return render_template('login.html')


@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM kullanicilar WHERE email = %s AND aktif = TRUE", (email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'message': 'E-posta veya şifre hatalı.'}), 401
    sifre_hash = user['sifre_hash']
    try:
        gecerli = bcrypt.checkpw(password.encode('utf-8'), sifre_hash.encode('utf-8'))
    except Exception:
        gecerli = (password == sifre_hash)
    if not gecerli:
        conn.close()
        return jsonify({'message': 'E-posta veya şifre hatalı.'}), 401
    cursor.execute("""
        UPDATE kullanicilar
        SET son_giris = NOW(), giris_sayisi = COALESCE(giris_sayisi,0) + 1
        WHERE id = %s
    """, (user['id'],))
    conn.commit()
    conn.close()
    session['user_id'] = user['id']
    session['user_email'] = user['email']
    session['user_ad'] = user.get('ad', '')
    session['user_rol'] = user.get('rol', 'kullanici')
    return jsonify({'ok': True})


@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login_page'))


@auth_bp.route('/sifremi-unuttum')
def sifremi_unuttum_page():
    return render_template('sifremi_unuttum.html')


@auth_bp.route('/api/sifremi-unuttum', methods=['POST'])
def sifremi_unuttum():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT * FROM kullanicilar WHERE email = %s AND aktif = TRUE", (email,))
        user = cursor.fetchone()
        if not user:
            conn.close()
            return jsonify({'ok': True})
        token = secrets.token_urlsafe(32)
        cursor.execute(
            "INSERT INTO sifre_sifirlama (email, token, expires_at) VALUES (%s, %s, NOW() + INTERVAL '1 hour')",
            (email, token)
        )
        conn.commit()
        conn.close()
    except Exception:
        return jsonify({'ok': True})
    base_url = os.getenv('BASE_URL', 'http://127.0.0.1:5000')
    reset_link = f"{base_url}/sifre-sifirla/{token}"
    icerik = f"""
        <h2 style="color:#1a1a2e;font-size:18px;margin-bottom:12px;">Şifre Sıfırlama Talebi</h2>
        <p style="color:#6b7a90;font-size:14px;line-height:1.6;margin-bottom:24px;">
          Merhaba {user.get('ad','') or ''},<br><br>
          Sporthink hesabınız için şifre sıfırlama talebinde bulundunuz.
        </p>
        <a href="{reset_link}" style="display:inline-block;background:#e02020;color:white;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
          Şifremi Sıfırla
        </a>
        <p style="color:#b0bec8;font-size:12px;margin-top:24px;">Bu link <strong>1 saat</strong> geçerlidir.</p>
    """
    mail_gonger_bg([email], "Sporthink — Şifre Sıfırlama", mail_template(icerik))
    return jsonify({'ok': True})


@auth_bp.route('/sifre-sifirla/<token>')
def sifre_sifirla_page(token):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT * FROM sifre_sifirlama WHERE token = %s AND used = FALSE AND expires_at > NOW()",
            (token,)
        )
        kayit = cursor.fetchone()
        if not kayit:
            return render_template('gecersiz_token.html', tip='reset')
        return render_template('sifre_sifirla.html', token=token)
    except Exception as e:
        print(f"sifre_sifirla_page hatası: {e}")
        return render_template('gecersiz_token.html', tip='reset')
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@auth_bp.route('/api/sifre-sifirla', methods=['POST'])
def sifre_sifirla():
    data = request.get_json()
    token = data.get('token', '')
    yeni_sifre = data.get('sifre', '')
    if len(yeni_sifre) < 6:
        return jsonify({'message': 'Şifre en az 6 karakter olmalıdır.'}), 400
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT * FROM sifre_sifirlama WHERE token = %s AND used = FALSE AND expires_at > NOW()",
            (token,)
        )
        kayit = cursor.fetchone()
        if not kayit:
            return jsonify({'message': 'Link geçersiz veya süresi dolmuş.'}), 400
        sifre_hash = bcrypt.hashpw(yeni_sifre.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute("UPDATE kullanicilar SET sifre_hash = %s WHERE email = %s", (sifre_hash, kayit['email']))
        cursor.execute("UPDATE sifre_sifirlama SET used = TRUE WHERE token = %s", (token,))
        conn.commit()
    except Exception as e:
        print(f"sifre_sifirla API hatası: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return jsonify({'message': 'Sunucu hatası. Lütfen tekrar deneyin.'}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
    return jsonify({'ok': True})


@auth_bp.route('/hesap-olustur/<token>')
def hesap_olustur_page(token):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT * FROM sifre_sifirlama WHERE token = %s AND used = FALSE AND expires_at > NOW()",
            (token,)
        )
        kayit = cursor.fetchone()
        if not kayit:
            return render_template('gecersiz_token.html', tip='davet')
        cursor.execute("SELECT ad FROM kullanicilar WHERE email = %s AND aktif = FALSE", (kayit['email'],))
        kul = cursor.fetchone()
        if not kul:
            return render_template('gecersiz_token.html', tip='davet')
        return render_template('hesap_olustur.html', token=token, ad=kul['ad'] or '', email=kayit['email'])
    except Exception as e:
        print(f"hesap_olustur_page hatası: {e}")
        return render_template('gecersiz_token.html', tip='davet')
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@auth_bp.route('/api/hesap-olustur', methods=['POST'])
def hesap_olustur():
    data = request.get_json()
    token = data.get('token', '')
    sifre = data.get('sifre', '')
    if len(sifre) < 6:
        return jsonify({'message': 'Şifre en az 6 karakter olmalıdır.'}), 400
    conn = None
    kul = None
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT * FROM sifre_sifirlama WHERE token = %s AND used = FALSE AND expires_at > NOW()",
            (token,)
        )
        kayit = cursor.fetchone()
        if not kayit:
            return jsonify({'message': 'Bu link geçersiz veya süresi dolmuş.'}), 400
        cursor.execute("SELECT id FROM kullanicilar WHERE email = %s AND aktif = FALSE", (kayit['email'],))
        if not cursor.fetchone():
            return jsonify({'message': 'Bu davet linki artık geçerli değil.'}), 400
        sifre_hash = bcrypt.hashpw(sifre.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute(
            "UPDATE kullanicilar SET sifre_hash = %s, aktif = TRUE WHERE email = %s RETURNING id, email, ad, rol",
            (sifre_hash, kayit['email'])
        )
        kul = cursor.fetchone()
        if not kul:
            return jsonify({'message': 'Kullanıcı güncellenemedi.'}), 500
        cursor.execute("UPDATE sifre_sifirlama SET used = TRUE WHERE token = %s", (token,))
        cursor.execute(
            "UPDATE kullanicilar SET son_giris = NOW(), giris_sayisi = COALESCE(giris_sayisi,0) + 1 WHERE id = %s",
            (kul['id'],)
        )
        conn.commit()
    except Exception as e:
        print(f"hesap_olustur API hatası: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return jsonify({'message': 'Sunucu hatası. Lütfen tekrar deneyin.'}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
    if not kul:
        return jsonify({'message': 'İşlem tamamlanamadı.'}), 500
    session['user_id'] = kul['id']
    session['user_email'] = kul['email']
    session['user_ad'] = kul['ad'] or ''
    session['user_rol'] = kul['rol'] or 'kullanici'
    return jsonify({'ok': True})
