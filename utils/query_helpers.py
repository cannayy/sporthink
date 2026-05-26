# -*- coding: utf-8 -*-
from functools import wraps
from flask import session, redirect, url_for, request, jsonify


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'message': 'Oturum açmanız gerekiyor.'}), 401
            return redirect(url_for('auth.login_page'))
        return f(*args, **kwargs)
    return decorated


_CINSIYET_DB_MAP = {
    'Kız Çocuk': ['Kız', 'Kız Çocuk'],
    'Erkek Çocuk': ['EC', 'Erkek Çocuk'],
    'Çocuk': ['Çocuk', 'Kız', 'Kız Çocuk', 'EC', 'Erkek Çocuk'],
}

def cinsiyet_filter(where, params, cinsiyet):
    if not cinsiyet:
        return
    cinsiyet_list = [c.strip() for c in cinsiyet.split(',') if c.strip()]
    if not cinsiyet_list:
        return
    expanded = set()
    for c in cinsiyet_list:
        expanded.update(_CINSIYET_DB_MAP.get(c, [c]))
    placeholders = ','.join(['%s'] * len(expanded))
    where.append(f"cinsiyet IN ({placeholders})")
    params.extend(expanded)


def sezon_filter(where, params, sezon):
    if sezon:
        where.append("sezon = %s")
        params.append(sezon)


def ana_grup_filter(where, params, ana_grup):
    if not ana_grup:
        return
    ag_list = [a.strip() for a in ana_grup.split(',') if a.strip()]
    if not ag_list:
        return
    if len(ag_list) == 1:
        where.append("ana_grup = %s")
        params.append(ag_list[0])
    else:
        placeholders = ','.join(['%s'] * len(ag_list))
        where.append(f"ana_grup IN ({placeholders})")
        params.extend(ag_list)


def marka_filter(where, params, marka):
    if not marka:
        return
    marka_list = [m.strip() for m in marka.split(',') if m.strip()]
    if not marka_list:
        return
    placeholders = ','.join(['%s'] * len(marka_list))
    where.append(f"marka IN ({placeholders})")
    params.extend(marka_list)


def donem_filter(where, params, donem_tip, donem_deger):
    if donem_tip == 'hafta' and donem_deger:
        try:
            where.append("hafta_no = %s")
            params.append(int(donem_deger))
        except (ValueError, TypeError):
            pass
