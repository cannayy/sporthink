# -*- coding: utf-8 -*-
import psycopg2.extras
from flask import Blueprint, jsonify, session
from utils.db import get_db
from utils.query_helpers import login_required

bildirimler_bp = Blueprint('bildirimler', __name__)

VARSAYILAN_AYARLAR = {
    'w_gmroi':         0.40,
    'w_st':            0.35,
    'w_cover':         0.25,
    'esik_risk':       15,
    'esik_min_st':     0.55,
    'esik_max_cover':  12,
    'esik_ciro_cover': 10,
    'esik_ciro_st':    0.55,
    'esik_kar_st':     0.55,
    'esik_kar_cover':  10,
}

AYAR_ETIKETLERI = {
    'w_gmroi':         'GMROI Ağırlığı',
    'w_st':            'ST Ağırlığı',
    'w_cover':         'Cover Ağırlığı',
    'esik_risk':       'Stok Risk Eşiği',
    'esik_min_st':     'Min. ST Eşiği',
    'esik_max_cover':  'Maks. Cover Eşiği',
    'esik_ciro_cover': 'Ciro Cover Eşiği',
    'esik_ciro_st':    'Ciro ST Eşiği',
    'esik_kar_st':     'Kâr ST Eşiği',
    'esik_kar_cover':  'Kâr Cover Eşiği',
}


def _ayarlari_getir():
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT anahtar, deger FROM sistem_ayarlari")
    rows = cursor.fetchall()
    conn.close()
    return {r['anahtar']: r['deger'] for r in rows}


@bildirimler_bp.route('/api/bildirimler')
@login_required
def bildirimler_getir():
    try:
        ayarlar = _ayarlari_getir()
    except Exception:
        return jsonify({'bildirimler': []})

    sonuclar = []

    # 1. Sezon değişikliği kontrolü
    aktif_sezon = ayarlar.get('aktif_sezon', '').strip()
    gorulen_sezon = session.get('gorulen_sezon', None)

    if aktif_sezon and gorulen_sezon != aktif_sezon:
        sezon_id = 'sezon_' + aktif_sezon.replace(' ', '_').replace('/', '_')
        sonuclar.append({
            'id':     sezon_id,
            'seviye': 'uyari',
            'baslik': 'Aktif Sezon Değişti',
            'mesaj':  f'Sistem aktif sezonu "{aktif_sezon}" olarak güncellendi.',
        })

    # 2. Varsayılan ayar farklılığı kontrolü
    degisen = []
    for anahtar, varsayilan in VARSAYILAN_AYARLAR.items():
        if anahtar not in ayarlar:
            continue
        try:
            if isinstance(varsayilan, int):
                mevcut = int(float(ayarlar[anahtar]))
            else:
                mevcut = round(float(ayarlar[anahtar]), 4)
        except (ValueError, TypeError):
            continue
        if mevcut != varsayilan:
            degisen.append(AYAR_ETIKETLERI.get(anahtar, anahtar))

    if degisen:
        ozet = ', '.join(degisen[:3]) + ('…' if len(degisen) > 3 else '')
        sonuclar.append({
            'id':     'ayar_degisikligi',
            'seviye': 'info',
            'baslik': 'Özelleştirilmiş Ayarlar Aktif',
            'mesaj':  f'{len(degisen)} ayar varsayılandan farklı: {ozet}',
        })

    return jsonify({'bildirimler': sonuclar})


@bildirimler_bp.route('/api/bildirimler/oku', methods=['POST'])
@login_required
def bildirimler_oku():
    try:
        ayarlar = _ayarlari_getir()
        aktif_sezon = ayarlar.get('aktif_sezon', '').strip()
        session['gorulen_sezon'] = aktif_sezon
    except Exception:
        pass
    return jsonify({'ok': True})
