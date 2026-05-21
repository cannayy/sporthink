# -*- coding: utf-8 -*-
import os
import psycopg2
import psycopg2.extras


def get_db():
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'), port=5432,
        database="proje_db", user="postgres",
        password=os.getenv('DB_PASSWORD', '92959803')
    )


def init_sistem_ayarlari():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sistem_ayarlari (
                anahtar VARCHAR(50) PRIMARY KEY,
                deger TEXT NOT NULL,
                guncelleme TIMESTAMP DEFAULT NOW()
            )
        """)
        cursor.execute("""
            INSERT INTO sistem_ayarlari (anahtar, deger) VALUES
                ('aktif_sezon', ''),
                ('w_gmroi', '0.40'),
                ('w_st', '0.35'),
                ('w_cover', '0.25'),
                ('esik_risk', '15'),
                ('esik_min_st', '0.55'),
                ('esik_max_cover', '12'),
                ('esik_ciro_cover', '10')
            ON CONFLICT (anahtar) DO NOTHING
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠ sistem_ayarlari init hatası: {e}")
