from fastapi import APIRouter, Query
from pydantic import BaseModel
from datetime import date
from calendar import monthrange
from core.database import get_pool
from core.ai_client import ask_ai

router = APIRouter(prefix="/api/v1/ai", tags=["AI Advisor"])


async def get_financial_context(month: str) -> dict:
    """Ambil data keuangan dari DB untuk dikirim ke AI"""
    year, mon = map(int, month.split("-"))
    date_from = date(year, mon, 1)
    date_to = date(year, mon, monthrange(year, mon)[1])

    pool = get_pool()
    async with pool.acquire() as conn:
        # Summary per tipe
        rows = await conn.fetch("""
            SELECT type, SUM(amount) as total, COUNT(*) as count
            FROM transactions
            WHERE date >= $1 AND date <= $2
            GROUP BY type
        """, date_from, date_to)

        # Top pengeluaran
        top_exp = await conn.fetch("""
            SELECT note, amount
            FROM transactions
            WHERE type = 'expense' AND date >= $1 AND date <= $2
            ORDER BY amount DESC LIMIT 5
        """, date_from, date_to)

        # Semua transaksi bulan ini
        all_txn = await conn.fetch("""
            SELECT date, type, amount, note
            FROM transactions
            WHERE date >= $1 AND date <= $2
            ORDER BY date DESC
        """, date_from, date_to)

        # Holdings crypto
        crypto = await conn.fetch("""
            SELECT asset, SUM(CASE WHEN type='invest_in' THEN asset_qty ELSE -asset_qty END) as qty
            FROM transactions
            WHERE asset IS NOT NULL AND asset_qty IS NOT NULL
            GROUP BY asset
        """)

    totals = {r["type"]: float(r["total"]) for r in rows}
    income = totals.get("income", 0)
    expense = totals.get("expense", 0)
    invest = totals.get("invest_in", 0)
    saving_rate = round((income - expense) / income * 100, 1) if income > 0 else 0

    return {
        "period": month,
        "income": income,
        "expense": expense,
        "invest": invest,
        "net": income - expense,
        "saving_rate": saving_rate,
        "top_expenses": [{"note": r["note"], "amount": float(r["amount"])} for r in top_exp],
        "transactions": [
            {"date": str(r["date"]), "type": r["type"], "amount": float(r["amount"]), "note": r["note"]}
            for r in all_txn
        ],
        "crypto_holdings": [
            {"asset": r["asset"], "qty": float(r["qty"] or 0)}
            for r in crypto if (r["qty"] or 0) > 0
        ],
    }


# ─── 1. AI Chat Advisor ───────────────────────────────────────────────────────

class AdvisorRequest(BaseModel):
    question: str
    month: str = None

@router.post("/chat")
async def ai_advisor_chat(body: AdvisorRequest):
    """Tanya AI tentang kondisi keuangan kamu"""
    month = body.month or date.today().strftime("%Y-%m")
    ctx = await get_financial_context(month)

    system_prompt = f"""Kamu adalah financial advisor AI personal yang cerdas dan jujur.
Kamu menganalisis data keuangan user dan memberikan saran yang actionable dalam Bahasa Indonesia.
Jawab dengan singkat, jelas, dan langsung ke poin. Gunakan angka dari data yang diberikan.

DATA KEUANGAN USER ({ctx['period']}):
- Total Pemasukan: Rp {ctx['income']:,.0f}
- Total Pengeluaran: Rp {ctx['expense']:,.0f}
- Total Investasi: Rp {ctx['invest']:,.0f}
- Net Cashflow: Rp {ctx['net']:,.0f}
- Saving Rate: {ctx['saving_rate']}%
- Top Pengeluaran: {ctx['top_expenses']}
- Crypto Holdings: {ctx['crypto_holdings']}
- Semua Transaksi: {ctx['transactions']}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": body.question},
    ]

    response = await ask_ai(messages)
    return {"answer": response, "context_period": month}


# ─── 2. Monthly AI Report ─────────────────────────────────────────────────────

@router.get("/report")
async def ai_monthly_report(month: str = Query(..., description="Format: YYYY-MM")):
    """Generate laporan bulanan otomatis dari AI"""
    ctx = await get_financial_context(month)

    prompt = f"""Buatkan laporan keuangan bulanan yang komprehensif untuk periode {ctx['period']}.

DATA:
- Pemasukan: Rp {ctx['income']:,.0f}
- Pengeluaran: Rp {ctx['expense']:,.0f}
- Investasi: Rp {ctx['invest']:,.0f}
- Net Cashflow: Rp {ctx['net']:,.0f}
- Saving Rate: {ctx['saving_rate']}%
- Top Pengeluaran: {ctx['top_expenses']}
- Crypto Holdings: {ctx['crypto_holdings']}
- Detail Transaksi: {ctx['transactions']}

Buat laporan dengan format:
1. RINGKASAN EKSEKUTIF (2-3 kalimat)
2. ANALISIS PEMASUKAN
3. ANALISIS PENGELUARAN (highlight yang terbesar)
4. STATUS INVESTASI
5. KESEHATAN KEUANGAN (rating 1-5 dengan penjelasan)
6. REKOMENDASI AKSI (3 poin konkret untuk bulan depan)

Gunakan Bahasa Indonesia yang profesional tapi mudah dipahami."""

    messages = [{"role": "user", "content": prompt}]
    response = await ask_ai(messages, temperature=0.5)
    return {"report": response, "period": month}


# ─── 3. Anomaly Detection ────────────────────────────────────────────────────

@router.get("/anomaly")
async def detect_anomaly(month: str = Query(..., description="Format: YYYY-MM")):
    """Deteksi pengeluaran tidak wajar dibanding bulan sebelumnya"""
    pool = get_pool()

    year, mon = map(int, month.split("-"))
    # Bulan sebelumnya
    prev_mon = mon - 1 if mon > 1 else 12
    prev_year = year if mon > 1 else year - 1

    async with pool.acquire() as conn:
        # Data bulan ini per kategori
        current = await conn.fetch("""
            SELECT note, type, SUM(amount) as total
            FROM transactions
            WHERE date >= $1 AND date <= $2 AND type = 'expense'
            GROUP BY note, type
            ORDER BY total DESC
        """, date(year, mon, 1), date(year, mon, monthrange(year, mon)[1]))

        # Data bulan lalu
        prev = await conn.fetch("""
            SELECT note, type, SUM(amount) as total
            FROM transactions
            WHERE date >= $1 AND date <= $2 AND type = 'expense'
            GROUP BY note, type
            ORDER BY total DESC
        """, date(prev_year, prev_mon, 1),
            date(prev_year, prev_mon, monthrange(prev_year, prev_mon)[1]))

    current_data = [{"note": r["note"], "total": float(r["total"])} for r in current]
    prev_data = [{"note": r["note"], "total": float(r["total"])} for r in prev]

    prompt = f"""Analisis anomali pengeluaran keuangan berikut dalam Bahasa Indonesia.

PENGELUARAN BULAN INI ({month}):
{current_data}

PENGELUARAN BULAN LALU ({prev_year}-{prev_mon:02d}):
{prev_data}

Identifikasi:
1. Pengeluaran yang naik signifikan (>50%) dibanding bulan lalu
2. Pengeluaran baru yang tidak ada bulan lalu
3. Pola pengeluaran yang perlu diwaspadai
4. Rekomendasi konkret

Jika data terlalu sedikit untuk dibandingkan, sampaikan dengan jujur."""

    messages = [{"role": "user", "content": prompt}]
    response = await ask_ai(messages, temperature=0.3)
    return {
        "anomaly_analysis": response,
        "period": month,
        "current_expenses": current_data,
        "prev_expenses": prev_data,
    }


# ─── 4. Smart Categorization ─────────────────────────────────────────────────

class CategorizeRequest(BaseModel):
    text: str

@router.post("/categorize")
async def smart_categorize(body: CategorizeRequest):
    """Kategorisasi transaksi dengan AI — lebih akurat dari regex"""
    prompt = f"""Kategorikan transaksi keuangan berikut dalam Bahasa Indonesia.

Teks transaksi: "{body.text}"

Tentukan:
1. type: income / expense / invest_in / invest_out
2. category: (pilih satu) Makanan & Minuman / Transport / Tagihan & Utilitas / Kesehatan / Hiburan / Belanja / Pendidikan / Pulsa & Internet / Investasi / Uang Saku / Gaji / Freelance / Lainnya
3. confidence: 0.0-1.0

Jawab HANYA dalam format JSON:
{{"type": "...", "category": "...", "confidence": 0.0}}"""

    messages = [{"role": "user", "content": prompt}]
    response = await ask_ai(messages, temperature=0.1)

    import json, re
    try:
        clean = re.search(r'\{.*\}', response, re.DOTALL)
        result = json.loads(clean.group()) if clean else {}
    except Exception:
        result = {"type": "expense", "category": "Lainnya", "confidence": 0.0}

    return {"categorization": result, "raw_response": response}
