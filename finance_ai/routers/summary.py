from fastapi import APIRouter, Query, HTTPException
from datetime import date
from calendar import monthrange
from core.database import get_pool

router = APIRouter(prefix="/api/v1", tags=["Analytics"])

@router.delete("/transactions/all")
async def delete_all_transactions():
    pool = get_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM transactions")
        await conn.execute("DELETE FROM transactions")
        await conn.execute("ALTER SEQUENCE transactions_id_seq RESTART WITH 1")
    return {"status": "cleared", "deleted": count}

@router.get("/summary")
async def get_summary(
    month: str = Query(..., description="Format: YYYY-MM, contoh: 2026-05")
):
    try:
        year, mon = map(int, month.split("-"))
        date_from = date(year, mon, 1)
        date_to = date(year, mon, monthrange(year, mon)[1])
    except Exception:
        raise HTTPException(400, "Format bulan salah. Gunakan YYYY-MM")

    pool = get_pool()
    async with pool.acquire() as conn:
        # Total per tipe
        rows = await conn.fetch("""
            SELECT type, SUM(amount) as total, COUNT(*) as count
            FROM transactions
            WHERE date >= $1 AND date <= $2
            GROUP BY type
        """, date_from, date_to)

        # Top 5 pengeluaran terbesar
        top_expense = await conn.fetch("""
            SELECT note, amount
            FROM transactions
            WHERE type = 'expense' AND date >= $1 AND date <= $2
            ORDER BY amount DESC
            LIMIT 5
        """, date_from, date_to)

        # Transaksi per hari (untuk grafik)
        daily = await conn.fetch("""
            SELECT date, type, SUM(amount) as total
            FROM transactions
            WHERE date >= $1 AND date <= $2
            GROUP BY date, type
            ORDER BY date ASC
        """, date_from, date_to)

    # Hitung totals
    totals = {r["type"]: float(r["total"]) for r in rows}
    income  = totals.get("income", 0)
    expense = totals.get("expense", 0)
    invest  = totals.get("invest_in", 0) + totals.get("invest_out", 0)
    net     = income - expense
    saving_rate = round((net / income * 100), 2) if income > 0 else 0

    return {
        "period": month,
        "date_range": {"from": str(date_from), "to": str(date_to)},
        "summary": {
            "total_income": income,
            "total_expense": expense,
            "total_invest": invest,
            "net_cashflow": net,
            "saving_rate_pct": saving_rate,
        },
        "breakdown": [dict(r) for r in rows],
        "top_expenses": [dict(r) for r in top_expense],
        "daily_chart": [dict(r) for r in daily],
    }

@router.get("/summary/today")
async def get_today():
    today = date.today()
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT type, SUM(amount) as total, COUNT(*) as count
            FROM transactions
            WHERE date = $1
            GROUP BY type
        """, today)

        txns = await conn.fetch("""
            SELECT id, type, amount, currency, note, platform, asset
            FROM transactions
            WHERE date = $1
            ORDER BY created_at DESC
        """, today)

    totals = {r["type"]: float(r["total"]) for r in rows}
    income  = totals.get("income", 0)
    expense = totals.get("expense", 0)

    return {
        "date": str(today),
        "total_income": income,
        "total_expense": expense,
        "net": income - expense,
        "transactions": [dict(r) for r in txns],
    }

@router.get("/health-score")
async def get_health_score(
    month: str = Query(..., description="Format: YYYY-MM")
):
    try:
        year, mon = map(int, month.split("-"))
        date_from = date(year, mon, 1)
        date_to = date(year, mon, monthrange(year, mon)[1])
    except Exception:
        raise HTTPException(400, "Format bulan salah. Gunakan YYYY-MM")

    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT type, SUM(amount) as total
            FROM transactions
            WHERE date >= $1 AND date <= $2
            GROUP BY type
        """, date_from, date_to)

        daily_expense = await conn.fetch("""
            SELECT date, SUM(amount) as total
            FROM transactions
            WHERE type = 'expense' AND date >= $1 AND date <= $2
            GROUP BY date
        """, date_from, date_to)

    totals = {r["type"]: float(r["total"]) for r in rows}
    income  = totals.get("income", 0)
    expense = totals.get("expense", 0)
    invest  = totals.get("invest_in", 0)

    if income == 0:
        return {"error": "Tidak ada data income di periode ini"}

    # ── Komponen 1: Saving Rate (40 poin) ──────────────────────
    saving_rate = (income - expense) / income
    score_saving = min(saving_rate * 133, 40)

    # ── Komponen 2: Konsistensi pengeluaran (30 poin) ───────────
    amounts = [float(r["total"]) for r in daily_expense]
    if len(amounts) > 1:
        mean = sum(amounts) / len(amounts)
        variance = sum((x - mean) ** 2 for x in amounts) / len(amounts)
        std = variance ** 0.5
        cv = std / mean if mean > 0 else 1
        score_consist = max(0, 30 - cv * 30)
    else:
        score_consist = 15  # netral jika data sedikit

    # ── Komponen 3: Investasi (20 poin) ─────────────────────────
    invest_ratio = invest / income
    score_invest = min(invest_ratio * 100, 20)

    # ── Komponen 4: Tidak boncos (10 poin) ──────────────────────
    score_surplus = 10 if expense < income else 0

    total_score = round(score_saving + score_consist + score_invest + score_surplus, 1)

    # ── Level & label ────────────────────────────────────────────
    if total_score >= 80:
        level, label, color = 5, "SEHAT PRIMA", "#00d4aa"
        advice = "Kondisi keuangan sangat baik! Pertahankan dan tingkatkan porsi investasi."
    elif total_score >= 60:
        level, label, color = 4, "SEHAT", "#3b82f6"
        advice = "Keuangan sehat. Coba tingkatkan saving rate ke 30%+."
    elif total_score >= 40:
        level, label, color = 3, "CUKUP", "#f59e0b"
        advice = "Masih aman tapi perlu perhatian. Kurangi pengeluaran tidak perlu."
    elif total_score >= 20:
        level, label, color = 2, "WASPADA", "#f97316"
        advice = "Pengeluaran hampir menyamai pemasukan. Segera evaluasi budget."
    else:
        level, label, color = 1, "KRITIS", "#ef4444"
        advice = "Pengeluaran melebihi pemasukan! Butuh tindakan segera."

    return {
        "period": month,
        "score": total_score,
        "level": level,
        "label": label,
        "color": color,
        "advice": advice,
        "breakdown": {
            "saving_rate_pct": round(saving_rate * 100, 2),
            "score_saving": round(score_saving, 1),
            "score_consistency": round(score_consist, 1),
            "score_invest": round(score_invest, 1),
            "score_surplus": score_surplus,
        },
        "raw": {
            "income": income,
            "expense": expense,
            "invest": invest,
        }
    }
