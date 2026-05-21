# -*- coding: utf-8 -*-
import os
from flask import Flask
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
secret_key = os.getenv('SECRET_KEY')
if not secret_key:
    raise RuntimeError('.env dosyasında SECRET_KEY tanımlı değil')
app.secret_key = secret_key
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# ── MAIL AYARLARI ──
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_FROM', os.getenv('MAIL_USERNAME'))
app.config['MAIL_TIMEOUT'] = 10

from utils.mail import init_mail
init_mail(app)

from utils.db import init_sistem_ayarlari
init_sistem_ayarlari()

from routes.auth import auth_bp
from routes.kullanicilar import kullanicilar_bp
from routes.analiz import analiz_bp
from routes.bildirimler import bildirimler_bp

app.register_blueprint(auth_bp)
app.register_blueprint(kullanicilar_bp)
app.register_blueprint(analiz_bp)
app.register_blueprint(bildirimler_bp)

if __name__ == '__main__':
    app.run(debug=True)
