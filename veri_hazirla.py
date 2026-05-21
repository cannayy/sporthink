# -*- coding: utf-8 -*-
import os
import pandas as pd
import psycopg2
import numpy as np
from dotenv import load_dotenv

load_dotenv()

EXCEL_YOLU = "PROJE Bestseller & Worstseller Data (1).xlsx"

database_url = os.getenv('DATABASE_URL')
if database_url:
    conn = psycopg2.connect(database_url)
else:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'), port=5432,
        database="proje_db", user="postgres",
        password=os.getenv('DB_PASSWORD', '92959803')
    )
cursor = conn.cursor()

print("Tablo olusturuluyor...")
cursor.execute("""
    DROP TABLE IF EXISTS urun_analiz;
    CREATE TABLE urun_analiz (
        id                  SERIAL PRIMARY KEY,
        hafta_no            INTEGER,
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
        psf                 NUMERIC(10,2),
        regule_psf          NUMERIC(10,2),
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
        gmroi               NUMERIC(10,4),
        ortalama_stok       NUMERIC(10,2),
        gorsel_url          TEXT,
        urun_giris_tarihi   DATE
    );
""")
conn.commit()
print("Tablo olusturuldu.")


def sadele(df):
    df["ana_grup"]    = df["ana_grup"].str.extract(r"- (.+)$")
    df["alt_kategori"] = df["alt_kategori"].str.extract(r"- (.+)$")
    df["cinsiyet"]    = df["cinsiyet"].str.extract(r"^(.+?) -")
    df["sezon"]       = df["sezon"].str.extract(r"^(.+?) -")
    return df


# ── DÜZENLİ DATA ─────────────────────────────────────────────────────────────
print("Duzenli Data okunuyor...")
df_duz = pd.read_excel(EXCEL_YOLU, sheet_name="Düzenli Data Örnek")
df_duz = df_duz.rename(columns={
    "Stok Kodu":                "stok_kodu",
    "Stok Kodu Açıklama":       "stok_kodu_aciklama",
    "E-TİCARET RENK":           "eticaret_renk",
    "Renk Açıklama":            "renk_aciklama",
    "Marka Açıklama":           "marka",
    "ANAGRUP":                  "ana_grup",
    "Alt Kategori":             "alt_kategori",
    "E-TİCARET CİNSİYET":       "eticaret_cinsiyet",
    "CİNSİYET":                 "cinsiyet",
    "Mevcut Sezon Kodu":        "sezon",
    "Alış Fiyat":               "alis_fiyat",
    "PSF":                      "psf",
    "Regüle PSF":               "regule_psf",
    "Toplam Satış Miktarı":     "toplam_satis_miktar",
    "Toplam DSS Miktar":        "toplam_dss_miktar",
    "Toplam SMM":               "toplam_smm",
    "Toplam Initial Ciro":      "toplam_initial_ciro",
    "Ciro":                     "ciro",
    "İnd. Oranı":               "indirim_orani",
    "Toplam Kar":               "toplam_kar",
    "MU":                       "mu",
    "Periyot Cover (19 hafta)": "periyot_cover",
    "Sell Through %":           "sell_through",
    "Görsel Link":              "gorsel_url",
    "Ürün Giriş Tarihi":        "urun_giris_tarihi",
    "Ortalama Stok":            "ortalama_stok",
})
df_duz = sadele(df_duz)

df_duz["gmroi"] = np.where(
    df_duz["toplam_smm"] > 0,
    (df_duz["toplam_kar"] / df_duz["toplam_smm"] * 19).round(4),
    0.0
)
print(f"  {len(df_duz)} urun yuklendi.")


# ── DATA SEKMESİ ──────────────────────────────────────────────────────────────
print("Data okunuyor...")
df_raw = pd.read_excel(EXCEL_YOLU, sheet_name="Data")
df_raw = df_raw.rename(columns={
    "ANAGRUP":              "ana_grup",
    "Marka Açıklama":       "marka",
    "Alt Kategori":         "alt_kategori",
    "Mevcut Sezon Kodu":    "sezon",
    "Stok Kodu":            "stok_kodu",
    "Stok Kodu Açıklama":   "stok_kodu_aciklama",
    "E-TİCARET RENK":       "eticaret_renk",
    "Renk Açıklama":        "renk_aciklama",
    "E-TİCARET CİNSİYET":   "eticaret_cinsiyet",
    "CİNSİYET":             "cinsiyet",
    "Alış Miktarı":         "alis_miktar",
    "Alış Tutarı":          "alis_tutar",
    "Satış Miktarı":        "satis_miktar",
    "Satış Tutarı":         "satis_tutar",
    "DSS Miktar":           "dss_miktar",
    "Ortalama Stok":        "ortalama_stok",
})
df_raw = sadele(df_raw)

# PSF referans haritası: Düzenli Data + BS/WS örnek sekmelerinden listelenen fiyatlar
df_bs_ornek = pd.read_excel(EXCEL_YOLU, sheet_name="Bestseller Örnek")[["Stok Kodu", "PSF", "Regüle PSF"]].dropna(subset=["PSF"])
df_ws_ornek = pd.read_excel(EXCEL_YOLU, sheet_name="Worstseller Örnek")[["Stok Kodu", "PSF", "Regüle PSF"]].dropna(subset=["PSF"])
psf_ref = pd.concat([
    df_duz[["stok_kodu", "psf", "regule_psf"]],
    df_bs_ornek.rename(columns={"Stok Kodu": "stok_kodu", "PSF": "psf", "Regüle PSF": "regule_psf"}),
    df_ws_ornek.rename(columns={"Stok Kodu": "stok_kodu", "PSF": "psf", "Regüle PSF": "regule_psf"}),
]).drop_duplicates("stok_kodu").set_index("stok_kodu")

am  = df_raw["alis_miktar"].replace(0, np.nan)
sm  = df_raw["satis_miktar"].replace(0, np.nan)

df_raw["alis_fiyat"]          = (df_raw["alis_tutar"] / am).fillna(0).round(2)
# Önce referans PSF haritasından al, yoksa satış verisinden hesapla
psf_from_ref    = df_raw["stok_kodu"].map(psf_ref["psf"])
regpsf_from_ref = df_raw["stok_kodu"].map(psf_ref["regule_psf"])
psf_from_sales  = (df_raw["satis_tutar"] / sm).fillna(0).round(2)
df_raw["psf"]       = psf_from_ref.fillna(psf_from_sales).round(2)
df_raw["regule_psf"] = regpsf_from_ref.where(regpsf_from_ref.notna(), df_raw["psf"])
df_raw["ciro"]                = df_raw["satis_tutar"].fillna(0).round(2)
df_raw["toplam_satis_miktar"] = df_raw["satis_miktar"].fillna(0).astype(int)
df_raw["toplam_dss_miktar"]   = df_raw["dss_miktar"].fillna(0).astype(int)
df_raw["toplam_smm"]          = (df_raw["toplam_satis_miktar"] * df_raw["alis_fiyat"]).round(2)
# Initial Ciro = satış × Regüle PSF (şirket mantığı); referans yoksa Ciro'ya düşer
df_raw["toplam_initial_ciro"] = np.where(
    psf_from_ref.notna(),
    (df_raw["toplam_satis_miktar"] * df_raw["regule_psf"]).round(2),
    df_raw["ciro"],
)
df_raw["toplam_kar"]          = (df_raw["toplam_initial_ciro"] - df_raw["toplam_smm"]).round(2)

toplam_stok = df_raw["toplam_satis_miktar"] + df_raw["toplam_dss_miktar"]
df_raw["sell_through"] = np.where(
    toplam_stok > 0,
    (df_raw["toplam_satis_miktar"] / toplam_stok).round(4),
    0.0
)
df_raw["periyot_cover"] = np.where(
    df_raw["toplam_satis_miktar"] > 0,
    np.minimum((df_raw["toplam_dss_miktar"] / df_raw["toplam_satis_miktar"] * 19).round(2), 1000.0),
    1000.0
)
df_raw["mu"] = np.where(
    df_raw["toplam_smm"] > 0,
    (df_raw["ciro"] / df_raw["toplam_smm"]).round(4),
    0.0
)
df_raw["gmroi"] = np.where(
    df_raw["toplam_smm"] > 0,
    (df_raw["toplam_kar"] / df_raw["toplam_smm"] * 19).round(4),
    0.0
)

df_raw["regule_psf"]        = None
df_raw["indirim_orani"]     = None
df_raw["gorsel_url"]        = ""
df_raw["urun_giris_tarihi"] = None
df_raw["hafta_no"]          = 1   # Data sekmesi

df_duz["hafta_no"]          = 2   # Düzenli Data sekmesi

print(f"  {len(df_raw)} urun islendi.")


# ── BİRLEŞTİR ────────────────────────────────────────────────────────────────
print("Birlestiriliyor...")
SUTUNLAR = [
    "hafta_no",
    "stok_kodu", "stok_kodu_aciklama", "eticaret_renk", "renk_aciklama",
    "marka", "ana_grup", "alt_kategori", "eticaret_cinsiyet", "cinsiyet", "sezon",
    "alis_fiyat", "psf", "regule_psf", "toplam_satis_miktar", "toplam_dss_miktar",
    "toplam_smm", "toplam_initial_ciro", "ciro", "indirim_orani", "toplam_kar",
    "mu", "periyot_cover", "sell_through", "gmroi", "ortalama_stok",
    "gorsel_url", "urun_giris_tarihi",
]

duzenli_stoklar = set(df_duz["stok_kodu"].unique())
df_yeni = df_raw[~df_raw["stok_kodu"].isin(duzenli_stoklar)][SUTUNLAR]

df_birlesik = pd.concat([df_duz[SUTUNLAR], df_yeni], ignore_index=True)
print(f"  Duzenli Data : {len(df_duz)} urun")
print(f"  Data (eklenen): {len(df_yeni)} urun")
print(f"  Toplam       : {len(df_birlesik)} urun")


# ── VERİTABANINA KAYDET ───────────────────────────────────────────────────────
print("Veritabanina kaydediliyor...")


def safe(v, default=None):
    if v is None:
        return default
    try:
        if pd.isna(v):
            return default
    except (TypeError, ValueError):
        pass
    return v


toplam = 0
for _, row in df_birlesik.iterrows():
    cursor.execute("""
        INSERT INTO urun_analiz (
            hafta_no,
            stok_kodu, stok_kodu_aciklama, eticaret_renk, renk_aciklama,
            marka, ana_grup, alt_kategori, eticaret_cinsiyet, cinsiyet, sezon,
            alis_fiyat, psf, regule_psf, toplam_satis_miktar, toplam_dss_miktar,
            toplam_smm, toplam_initial_ciro, ciro, indirim_orani, toplam_kar,
            mu, periyot_cover, sell_through, gmroi, ortalama_stok,
            gorsel_url, urun_giris_tarihi
        ) VALUES (
            %s,
            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
            %s,%s,%s,%s,%s,%s,%s
        )
    """, (
        int(row["hafta_no"]),
        str(row["stok_kodu"]),
        str(row["stok_kodu_aciklama"]),
        str(row["eticaret_renk"]),
        str(row["renk_aciklama"]),
        str(row["marka"]),
        str(safe(row["ana_grup"], "")),
        str(safe(row["alt_kategori"], "")),
        str(row["eticaret_cinsiyet"]),
        str(safe(row["cinsiyet"], "")),
        str(safe(row["sezon"], "")),
        float(safe(row["alis_fiyat"], 0)),
        float(safe(row["psf"], 0)),
        float(safe(row["regule_psf"])) if safe(row["regule_psf"]) is not None else None,
        int(safe(row["toplam_satis_miktar"], 0)),
        int(safe(row["toplam_dss_miktar"], 0)),
        float(safe(row["toplam_smm"], 0)),
        float(safe(row["toplam_initial_ciro"], 0)),
        float(safe(row["ciro"], 0)),
        float(safe(row["indirim_orani"])) if safe(row["indirim_orani"]) is not None else None,
        float(safe(row["toplam_kar"], 0)),
        float(safe(row["mu"], 0)),
        float(safe(row["periyot_cover"], 0)),
        float(safe(row["sell_through"], 0)),
        float(safe(row["gmroi"], 0)),
        float(safe(row["ortalama_stok"], 0)),
        str(safe(row["gorsel_url"], "")),
        safe(row["urun_giris_tarihi"]),
    ))
    toplam += 1

conn.commit()

cursor.execute("CREATE INDEX IF NOT EXISTS idx_cinsiyet  ON urun_analiz(cinsiyet)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_grup      ON urun_analiz(ana_grup)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_kategori  ON urun_analiz(alt_kategori)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_sezon     ON urun_analiz(sezon)")
conn.commit()
cursor.close()
conn.close()

print(f"\nTamamlandi! {toplam} kayit eklendi.")
