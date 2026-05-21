# -*- coding: utf-8 -*-
import psycopg2
import numpy as np

np.random.seed(42)

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="proje_db",
    user="postgres",
    password="92959803"
)
cursor = conn.cursor()

# Her alt kategori icin medyan PSF ve MU al
cursor.execute("""
    SELECT alt_kategori,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY psf) as medyan_psf,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mu) as medyan_mu,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY alis_fiyat) as medyan_alis
    FROM urun_analiz
    WHERE psf > 0 AND mu > 0
    GROUP BY alt_kategori
""")
kategori_medyanlar = {row[0]: {'psf': row[1], 'mu': row[2], 'alis': row[3]} for row in cursor.fetchall()}

# PSF ve MU'su 0 olan urunleri al
cursor.execute("""
    SELECT DISTINCT stok_kodu, alt_kategori, alis_fiyat
    FROM urun_analiz
    WHERE psf = 0 OR mu = 0
""")
urunler = cursor.fetchall()

print(str(len(urunler)) + " urun duzeltilecek...")

for stok_kodu, alt_kategori, alis_fiyat in urunler:
    if alt_kategori not in kategori_medyanlar:
        continue

    medyan = kategori_medyanlar[alt_kategori]
    
    # Her urune farkli bir sapma ekle (medyanin %15 - %25 arasinda)
    sapma_psf = np.random.uniform(0.80, 1.20)
    sapma_mu = np.random.uniform(0.85, 1.15)
    
    yeni_psf = round(float(medyan['psf']) * sapma_psf / 50) * 50  # 50'nin katlarina yuvarla
    yeni_psf = max(yeni_psf, 99)  # minimum 99 TL
    
    yeni_mu = round(float(medyan['mu']) * sapma_mu, 2)
    yeni_mu = max(yeni_mu, 0.5)  # minimum 0.5
    
    # Alis fiyati yoksa hesapla
    if not alis_fiyat or float(alis_fiyat) == 0:
        yeni_alis = round(yeni_psf / (yeni_mu + 1), 2)
    else:
        yeni_alis = float(alis_fiyat)
    
    yeni_regule_psf = round(yeni_psf * np.random.uniform(0.80, 0.95) / 50) * 50
    
    # Guncelle
    cursor.execute("""
        UPDATE urun_analiz
        SET psf = %s,
            mu = %s,
            alis_fiyat = %s,
            regule_psf = %s
        WHERE stok_kodu = %s AND (psf = 0 OR mu = 0)
    """, (yeni_psf, yeni_mu, yeni_alis, yeni_regule_psf, stok_kodu))

conn.commit()

# Ciro ve kar guncelle
print("Ciro ve kar guncelleniyor...")
cursor.execute("""
    UPDATE urun_analiz
    SET ciro = toplam_satis_miktar * psf,
        toplam_smm = toplam_satis_miktar * alis_fiyat,
        toplam_kar = (toplam_satis_miktar * psf) - (toplam_satis_miktar * alis_fiyat)
    WHERE toplam_satis_miktar > 0
""")
conn.commit()

# Kontrol
cursor.execute("""
    SELECT 
        SUM(CASE WHEN psf = 0 THEN 1 ELSE 0 END) as psf_bos,
        SUM(CASE WHEN mu = 0 THEN 1 ELSE 0 END) as mu_sifir
    FROM urun_analiz
""")
row = cursor.fetchone()
print("PSF bos kalan: " + str(row[0]))
print("MU sifir kalan: " + str(row[1]))

cursor.close()
conn.close()
print("Tamamlandi!")