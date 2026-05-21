# -*- coding: utf-8 -*-
import os
import json
import threading
import urllib.request
import urllib.error
from flask_mail import Mail, Message

mail = Mail()
_app = None


def init_mail(app):
    global _app
    _app = app
    mail.init_app(app)


def _brevo_api_gonder(recipients, subject, html):
    api_key = os.getenv('BREVO_API_KEY')
    from_email = os.getenv('MAIL_FROM', os.getenv('MAIL_USERNAME', ''))
    if not api_key:
        return False, 'BREVO_API_KEY eksik'
    payload = json.dumps({
        'sender': {'email': from_email, 'name': 'Sporthink'},
        'to': [{'email': r} for r in recipients],
        'subject': subject,
        'htmlContent': html
    }).encode('utf-8')
    req = urllib.request.Request(
        'https://api.brevo.com/v3/smtp/email',
        data=payload,
        headers={'api-key': api_key, 'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"✅ Brevo API mail gönderildi: {recipients}")
            return True, None
    except urllib.error.HTTPError as e:
        hata = f"HTTP {e.code}: {e.read().decode()}"
        print(f"❌ Brevo API hatası: {hata}")
        return False, hata
    except Exception as e:
        print(f"❌ Brevo API bağlantı hatası: {e}")
        return False, str(e)


def mail_gonger(recipients, subject, html):
    return _brevo_api_gonder(recipients, subject, html)


def mail_gonger_bg(recipients, subject, html):
    def _send():
        _brevo_api_gonder(recipients, subject, html)
    t = threading.Thread(target=_send, daemon=True)
    t.start()


def mail_template(icerik):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f4f5f7;">
      <div style="background: white; border-radius: 16px; padding: 36px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 900; color: #1a1a2e;">sp<span style="color:#e02020;">o</span>rthink</span>
        </div>
        {icerik}
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #c0ccd8; font-size: 11px;">© 2025 Sporthink — Tüm hakları saklıdır.</p>
      </div>
    </div>
    """
