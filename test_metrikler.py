# -*- coding: utf-8 -*-
"""
GMROI, Sell Through ve Cover hesaplamalarını test eder.
veri_hazirla.py'daki formülleri baz alır.
"""
import numpy as np
import pandas as pd

# ── Formüller (veri_hazirla.py ile birebir aynı) ──────────────────────────────

def hesapla_sell_through(satis_miktar, dss_miktar):
    # Pandas Series kullanarak üretim koduyla birebir aynı davranış
    s = pd.Series([satis_miktar], dtype=float)
    d = pd.Series([dss_miktar], dtype=float)
    toplam = s + d
    sonuc = np.where(toplam > 0, (s / toplam).round(4), 0.0)
    return float(sonuc[0])


def hesapla_cover(dss_miktar, satis_miktar, hafta=19):
    if satis_miktar > 0:
        return float(min(round(dss_miktar / satis_miktar * hafta, 2), 1000.0))
    return 1000.0


def hesapla_gmroi(toplam_kar, toplam_smm, hafta=19):
    if toplam_smm > 0:
        return round(toplam_kar / toplam_smm * hafta, 4)
    return 0.0


# ── Test yardımcısı ───────────────────────────────────────────────────────────

passed = 0
failed = 0

def check(test_adi, gercek, beklenen, tolerans=0.0001):
    global passed, failed
    if abs(gercek - beklenen) <= tolerans:
        print(f"  ✓  {test_adi}")
        passed += 1
    else:
        print(f"  ✗  {test_adi}  →  beklenen={beklenen}, hesaplanan={gercek}")
        failed += 1


# ── SELL THROUGH testleri ─────────────────────────────────────────────────────
print("\n─── Sell Through ───────────────────────────────────────────")

# Normal durum: satis=80, stok=20 → 80/(80+20)=0.80
check("Normal durum", hesapla_sell_through(80, 20), 0.80)

# Tüm ürünler satıldı: dss=0 → 1.0
check("Tüm stok tükendi (dss=0)", hesapla_sell_through(100, 0), 1.0)

# Hiç satış yok: satis=0 → 0.0
check("Sıfır satış (satis=0)", hesapla_sell_through(0, 50), 0.0)

# Her ikisi de 0 → 0.0 (bölme hatasına düşmemeli)
check("Her ikisi sıfır", hesapla_sell_through(0, 0), 0.0)

# Ondalıklı sonuç: 1/3 → 0.3333
check("Kesirli oran (1/3)", hesapla_sell_through(1, 2), 0.3333)

# Çok küçük satış oranı
check("Küçük ST (5/100=0.05)", hesapla_sell_through(5, 95), 0.05)

# %100 sell-through doğrulama
check("%55 ST eşiğinin doğru belirlenmesi", hesapla_sell_through(55, 45), 0.55)


# ── COVER testleri ────────────────────────────────────────────────────────────
print("\n─── Periyot Cover (19 hafta) ───────────────────────────────")

# Temel formül: cover = (dss / satis) * 19
# dss=20, satis=80 → (20/80)*19 = 4.75
check("Normal cover (dss=20, satis=80)", hesapla_cover(20, 80), 4.75)

# Sıfır satış → 1000.0 (maksimum cap)
check("Sıfır satış → 1000 cap", hesapla_cover(50, 0), 1000.0)

# Tüm stok satıldı: dss=0 → cover=0.0
check("Stok yok (dss=0)", hesapla_cover(0, 100), 0.0)

# Cap kontrolü: çok büyük dss değeri → 1000.0
check("Çok büyük dss → 1000 cap", hesapla_cover(10000, 1), 1000.0)

# Cover = 19: dss=satis → (s/s)*19=19.0 (tam periyot)
check("Tam periyot cover (dss=satis)", hesapla_cover(80, 80), 19.0)

# max_cover=12 eşiğinin altında bir değer
check("12 haftanın altında cover", hesapla_cover(40, 80), 9.5)

# max_cover=12 eşiğinin üstünde bir değer (worst-seller'a düşmeli)
check("12 haftanın üstünde cover", hesapla_cover(60, 80), 14.25)

# Sell Through ile tutarlılık: ST yüksekse cover düşük olmalı
st  = hesapla_sell_through(80, 20)   # 0.8
cov = hesapla_cover(20, 80)          # 4.75
assert st > 0.55 and cov < 12, "ST yüksek → cover düşük beklenir"
print("  ✓  ST yüksek ↔ cover düşük tutarlılığı")
passed += 1


# ── GMROI testleri ────────────────────────────────────────────────────────────
print("\n─── GMROI (Kar / SMM × 19) ─────────────────────────────────")

# Temel: kar=200, smm=800 → (200/800)*19 = 4.75
check("Normal GMROI", hesapla_gmroi(200, 800), 4.75)

# Sıfır SMM → 0.0 (bölme hatasına düşmemeli)
check("Sıfır SMM → 0.0", hesapla_gmroi(100, 0), 0.0)

# Sıfır kar → 0.0
check("Sıfır kar", hesapla_gmroi(0, 500), 0.0)

# Negatif kar (zarar durumu): (-100/500)*19 = -3.8
check("Negatif kar (zarar)", hesapla_gmroi(-100, 500), -3.8)

# Yüksek karlılık: kar=smm → (500/500)*19 = 19.0
check("Kar = SMM → GMROI=19", hesapla_gmroi(500, 500), 19.0)

# Gerçekçi örnek: %40 gross margin, SMM=1000 → (400/1000)*19 = 7.6
check("%%40 brüt marj senaryosu", hesapla_gmroi(400, 1000), 7.6)

# GMROI ile cover ilişkisi: yüksek GMROI → best-seller'da yüksek skor
gmroi_iyi  = hesapla_gmroi(400, 800)   # 9.5
gmroi_kotu = hesapla_gmroi(50,  800)   # 1.1875
assert gmroi_iyi > gmroi_kotu, "Daha karlı ürün daha yüksek GMROI almalı"
print("  ✓  Yüksek kar → yüksek GMROI doğrulandı")
passed += 1


# ── GMROI formül doğruluğu notu ──────────────────────────────────────────────
print("\n─── GMROI Formül Analizi ───────────────────────────────────")
print("  Kullanılan  : GMROI = (Toplam Kar / Toplam SMM) × 19")
print("  Yorumu      : SMM/19 = tahmini haftalık ortalama stok maliyeti")
print("                GMROI  = Kar / (SMM/19) = Brüt Marj × Stok Devir (19 haftada)")
print()

# Ortalama stok ile doğrulama karşılaştırması
smm       = 1000.0
kar       = 300.0
ort_stok  = 80.0   # adet
alis_fiy  = 10.0   # TL

gmroi_smm_proxy = round(kar / smm * 19, 4)
gmroi_gercek    = round(kar / (ort_stok * alis_fiy), 4)  # standart formül

print(f"  SMM proxy ile GMROI     : {gmroi_smm_proxy}")
print(f"  Gerçek ort. stok ile    : {gmroi_gercek}")
print(f"  Ortalama stok = SMM/19? : SMM/19={smm/19:.1f}, ort_stok×alis={ort_stok*alis_fiy:.1f}")
if abs(smm / 19 - ort_stok * alis_fiy) < 1:
    print("  → Proxy ile gerçek değer örtüşüyor ✓")
else:
    print("  → Proxy ile gerçek değer arasında fark var (beklenen sapma)")


# ── Sonuç ─────────────────────────────────────────────────────────────────────
print(f"\n{'═'*55}")
print(f"  Sonuç: {passed} geçti  |  {failed} başarısız")
print(f"{'═'*55}")
