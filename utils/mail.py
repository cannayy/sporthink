# -*- coding: utf-8 -*-
from flask_mail import Mail, Message

mail = Mail()


def init_mail(app):
    mail.init_app(app)


def mail_gonger(recipients, subject, html):
    try:
        msg = Message(subject=subject, recipients=recipients)
        msg.html = html
        mail.send(msg)
        print(f"✅ Mail gönderildi: {recipients}")
        return True, None
    except Exception as e:
        hata = f"{type(e).__name__}: {e}"
        print(f"❌ Mail gönderilemedi: {hata}")
        return False, hata


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
