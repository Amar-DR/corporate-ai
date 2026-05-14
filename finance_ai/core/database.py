import os
import asyncpg
from asyncpg import Pool
from dotenv import load_dotenv

load_dotenv()

_pool: Pool | None = None

CREATE_TABLES_SQL = [
    """
    CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        icon VARCHAR(10),
        color VARCHAR(7),
        is_active BOOLEAN DEFAULT true
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'IDR',
        type VARCHAR(20) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        note TEXT,
        raw_input TEXT,
        source VARCHAR(30) DEFAULT 'chat',
        platform VARCHAR(50),
        asset VARCHAR(20),
        asset_qty NUMERIC(20,8),
        asset_price NUMERIC(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id),
        amount NUMERIC(15,2) NOT NULL,
        period VARCHAR(10) DEFAULT 'monthly',
        start_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true
    );
    """
]

async def init_db():
    global _pool
    _pool = await asyncpg.create_pool(
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        host=os.environ["DB_HOST"],
        port=int(os.environ["DB_PORT"]),
        min_size=2,
        max_size=5,
    )
    async with _pool.acquire() as conn:
        for sql in CREATE_TABLES_SQL:
            await conn.execute(sql)
    print("[Database] ✅ Pool siap & semua tabel terverifikasi!")

async def close_db():
    global _pool
    if _pool:
        await _pool.close()
        print("[Database] 🔌 Pool ditutup.")

def get_pool() -> Pool:
    if _pool is None:
        raise RuntimeError("Pool belum diinisialisasi.")
    return _pool
