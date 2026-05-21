# -*- coding: utf-8 -*-
# UYARI: Bu script artık kullanılmamaktadır.
# Güncel veri yükleme scripti: veri_hazirla.py
# Bu dosyada eksik gmroi kolonu ve farklı Excel adı bulunmaktadır;
# çalıştırılması halinde uygulama veritabanını bozar.
import pandas as pd
import psycopg2
import numpy as np
from datetime import datetime, timedelta

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="proje_db",
    user="postgres",
    password="92959803"
)
cursor = conn.cursor()

print("Tablo olusturuluyor...")
cursor.execute("""
    DROP TABLE IF EXISTS urun_analiz;
    CREATE TABLE urun_analiz (
        id                  SERIAL PRIMARY KEY,
        stok_kodu           VARCHAR(50),
        stok_kodu_aciklama  VARCHAR(255),
        eticaret_renk       VARCHAR(50),
        renk_aciklama       VARCHAR(100),
        marka               VARCHAR(100),
        ana_grup            VARCHAR(100),
        alt_kategori        VARCHAR(100),
        eticaret_cinsiyet   VARCHAR(50),
        cinsiyet            VARCHAR(50),
        sezon               VARCHAR(20),
        alis_fiyat          NUMERIC(10,2),
        regule_psf          NUMERIC(10,2),
        psf                 NUMERIC(10,2),
        toplam_satis_miktar INTEGER,
        toplam_dss_miktar   INTEGER,
        toplam_smm          NUMERIC(12,2),
        toplam_initial_ciro NUMERIC(12,2),
        ciro                NUMERIC(12,2),
        indirim_orani       NUMERIC(8,4),
        toplam_kar          NUMERIC(12,2),
        mu                  NUMERIC(10,4),
        periyot_cover       NUMERIC(8,2),
        sell_through        NUMERIC(8,4),
        gorsel_url          TEXT,
        urun_giris_tarihi   DATE,
        ortalama_stok       NUMERIC(10,2),
        hafta_no            INTEGER,
        hafta_tarihi        DATE,
        ay                  INTEGER,
        ay_adi              VARCHAR(20),
        ceyrek              VARCHAR(5)
    );
""")
conn.commit()
print("Tablo olusturuldu!")

print("Excel okunuyor...")
df_ham = pd.read_excel("PROJE_Bestseller_Worstseller_Data.xlsx", sheet_name="Data")
df_duzenli = pd.read_excel("PROJE_Bestseller_Worstseller_Data.xlsx", sheet_name=2)

# Duzenli datadan gerekli sutunlari al - gercek sutun isimleriyle
psf_map = df_duzenli[[
    "Stok Kodu", "Alış Fiyat", "Regüle PSF", "PSF", "MU",
    "Görsel Link", "Ürün Giriş Tarihi", "Ortalama Stok"
]].copy()
psf_map.columns = [
    "stok_kodu", "alis_fiyat", "regule_psf", "psf", "mu",
    "gorsel_url", "urun_giris_tarihi", "ortalama_stok"
]
psf_map = psf_map.drop_duplicates("stok_kodu")

# Ham datadan gerekli sutunlari al
df_ham = df_ham.rename(columns={
    "Stok Kodu": "stok_kodu",
    "Stok Kodu Açıklama": "stok_kodu_aciklama",
    "E-TİCARET RENK": "eticaret_renk",
    "Renk Açıklama": "renk_aciklama",
    "Marka Açıklama": "marka",
    "ANAGRUP": "ana_grup",
    "Alt Kategori": "alt_kategori",
    "E-TİCARET CİNSİYET": "eticaret_cinsiyet",
    "CİNSİYET": "cinsiyet",
    "Mevcut Sezon Kodu": "sezon",
    "Alış Miktarı": "alis_miktar",
    "Alış Tutarı": "alis_tutar",
    "Satış Miktarı": "satis_miktar",
    "DSS Miktar": "dss_miktar",
    "Ortalama Stok": "ortalama_stok_ham",
})

df = df_ham.merge(psf_map, on="stok_kodu", how="left")

# Ana grup ve alt kategori sadeleştir
df["ana_grup"] = df["ana_grup"].str.extract(r"- (.+)$")
df["alt_kategori"] = df["alt_kategori"].str.extract(r"- (.+)$")
df["cinsiyet"] = df["cinsiyet"].str.extract(r"^(.+?) -")

np.random.seed(42)
HAFTA_SAYISI = 19
BASLANGIC = datetime(2025, 6, 2)

def dagilim_uret(alt_kategori):
    h = np.arange(HAFTA_SAYISI)
    alt = str(alt_kategori)
    if any(k in alt for k in ["Mont", "Bot", "Outdoor"]):
        tepe = np.random.randint(9, 13)
        ag = np.exp(-0.5 * ((h - tepe) / 3.5) ** 2)
        ag[:4] *= 0.3
    elif any(k in alt for k in ["Sweatshirt", "Esofman", "Ceket"]):
        z1 = np.exp(-0.5 * ((h - 3) / 2.5) ** 2) * 0.7
        z2 = np.exp(-0.5 * ((h - 11) / 3.0) ** 2)
        ag = z1 + z2
        ag[6:9] *= 0.6
    elif any(k in alt for k in ["Canta", "Kalem", "Omuz"]):
        tepe = np.random.randint(2, 5)
        ag = np.exp(-0.5 * ((h - tepe) / 2.0) ** 2)
        if tepe + 4 < HAFTA_SAYISI:
            ag[tepe+4:] *= np.linspace(0.5, 0.1, len(ag[tepe+4:]))
    elif any(k in alt for k in ["Sneaker", "Spor", "Kosu"]):
        tepe = np.random.randint(6, 10)
        ag = np.exp(-0.5 * ((h - tepe) / 5.0) ** 2)
        ag = np.clip(ag, 0.2, 1.0)
    elif any(k in alt for k in ["Corap", "Aksesuar"]):
        ag = np.ones(HAFTA_SAYISI)
        ag += np.random.uniform(-0.2, 0.3, HAFTA_SAYISI)
    else:
        tepe = np.random.randint(4, 10)
        ag = np.exp(-0.5 * ((h - tepe) / 4.0) ** 2)
        ag = np.clip(ag, 0.15, 1.0)
    ag *= np.random.uniform(0.75, 1.25, HAFTA_SAYISI)
    ag = np.clip(ag, 0.01, None)
    return ag / ag.sum()

print("Veri isleniyor...")
toplam = 0

for _, urun in df.iterrows():
    toplam_satis = int(urun.get("satis_miktar") or 0)
    toplam_dss = int(urun.get("dss_miktar") or 0)
    ort_stok = float(urun.get("ortalama_stok") or 0)
    if np.isnan(ort_stok):
        ort_stok = 0.0
    psf_val = float(urun.get("psf") or 0)
    regule_psf = float(urun.get("regule_psf") or 0)
    alis_fiyat = float(urun.get("alis_fiyat") or 0)
    mu_val = float(urun.get("mu") or 0)

    toplam_smm = round(toplam_satis * alis_fiyat, 2)
    toplam_initial_ciro = round(toplam_satis * psf_val, 2)

    indirim_var = np.random.random() < 0.2
    efektif_psf = regule_psf if (indirim_var and regule_psf > 0 and regule_psf < psf_val) else psf_val
    indirim_orani = round((psf_val - efektif_psf) / psf_val, 4) if psf_val > 0 else 0
    toplam_kar = round(toplam_initial_ciro - toplam_smm, 2)

    toplam_stok = toplam_satis + toplam_dss
    sell_through = round(toplam_satis / toplam_stok, 4) if toplam_stok > 0 else 0

    haftalik_ort = toplam_satis / HAFTA_SAYISI if toplam_satis > 0 else 0
    periyot_cover = min(round(toplam_dss / haftalik_ort, 2), 1000.0) if haftalik_ort > 0 else 1000.0

    try:
        gt = urun.get("urun_giris_tarihi")
        if pd.isna(gt):
            giris_tarihi = BASLANGIC.date()
        else:
            giris_tarihi = pd.to_datetime(gt).date()
    except:
        giris_tarihi = BASLANGIC.date()

    agirliklar = dagilim_uret(urun.get("alt_kategori", ""))
    haftalik_satislar = np.round(agirliklar * toplam_satis).astype(int)
    fark = toplam_satis - haftalik_satislar.sum()
    haftalik_satislar[np.argmax(haftalik_satislar)] += fark

    for hafta_no in range(HAFTA_SAYISI):
        tarih = BASLANGIC + timedelta(weeks=hafta_no)
        adet = max(0, haftalik_satislar[hafta_no])
        hafta_ciro = round(adet * efektif_psf, 2)
        hafta_smm = round(adet * alis_fiyat, 2)
        hafta_kar = round(hafta_ciro - hafta_smm, 2)

        cursor.execute("""
            INSERT INTO urun_analiz (
                stok_kodu, stok_kodu_aciklama, eticaret_renk, renk_aciklama,
                marka, ana_grup, alt_kategori, eticaret_cinsiyet, cinsiyet, sezon,
                alis_fiyat, regule_psf, psf, toplam_satis_miktar, toplam_dss_miktar,
                toplam_smm, toplam_initial_ciro, ciro, indirim_orani, toplam_kar, mu,
                periyot_cover, sell_through, gorsel_url, urun_giris_tarihi,
                ortalama_stok, hafta_no, hafta_tarihi, ay, ay_adi, ceyrek
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
             str(urun.get("stok_kodu","")),
            str(urun.get("stok_kodu_aciklama","")),
            str(urun.get("eticaret_renk","")),
            str(urun.get("renk_aciklama","")),
            str(urun.get("marka","")),
            str(urun.get("ana_grup","")),
            str(urun.get("alt_kategori","")),
            str(urun.get("eticaret_cinsiyet","")),
            str(urun.get("cinsiyet","")),
            str(urun.get("sezon","")),
            float(alis_fiyat), float(regule_psf), float(psf_val),
            int(toplam_satis), int(toplam_dss), float(toplam_smm),
            float(toplam_initial_ciro), float(hafta_ciro), float(indirim_orani), float(hafta_kar), float(mu_val),
            float(periyot_cover), float(sell_through),
            str(urun.get("gorsel_url","")) if not pd.isna(urun.get("gorsel_url","")) else "",
            giris_tarihi, float(ort_stok),
            int(hafta_no + 1), tarih.date(),
            int(tarih.month), tarih.strftime("%B"),
            "Q" + str((tarih.month - 1) // 3 + 1)
        ))
        toplam += 1

conn.commit()
cursor.execute("CREATE INDEX IF NOT EXISTS idx_hafta ON urun_analiz(hafta_no)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_cinsiyet ON urun_analiz(cinsiyet)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_grup ON urun_analiz(ana_grup)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_kategori ON urun_analiz(alt_kategori)")
conn.commit()
cursor.close()
conn.close()

print("Tamamlandi!")
print("Toplam kayit: " + str(toplam))