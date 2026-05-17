from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import date
from core.database import init_db, close_db, get_pool
from core.telegram import notify_weekly_summary, send_message
from routers.chat import router as chat_router
from routers.transactions import router as txn_router
from routers.import_excel import router as import_router
from routers.summary import router as summary_router
from routers.portfolio import router as portfolio_router
from routers.advisor import router as advisor_router

scheduler = AsyncIOScheduler()

async def weekly_summary_job():
    """Jalankan setiap Minggu jam 20.00 WIB (13.00 UTC)"""
    from sqlalchemy import text
    month = date.today().strftime("%Y-%m")
    pool = get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT type, SUM(amount) as total
            FROM transactions
            WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
            GROUP BY type
        """)

    totals = {r["type"]: float(r["total"]) for r in rows}
    income = totals.get("income", 0)
    expense = totals.get("expense", 0)
    invest = totals.get("invest_in", 0)
    net = income - expense
    saving_rate = round((net / income * 100), 1) if income > 0 else 0

    summary = {
        "total_income": income,
        "total_expense": expense,
        "total_invest": invest,
        "net_cashflow": net,
        "saving_rate_pct": saving_rate,
    }

    # Hitung health score sederhana
    score = min(saving_rate * 1.33, 40) + (10 if net > 0 else 0) + (20 if invest > 0 else 0) + 15
    level = 5 if score >= 80 else 4 if score >= 60 else 3 if score >= 40 else 2 if score >= 20 else 1
    labels = {1: "KRITIS", 2: "WASPADA", 3: "CUKUP", 4: "SEHAT", 5: "SEHAT PRIMA"}
    advices = {
        1: "Pengeluaran melebihi pemasukan! Segera evaluasi.",
        2: "Hampir impas. Kurangi pengeluaran tidak perlu.",
        3: "Masih aman tapi perlu perhatian.",
        4: "Keuangan sehat. Tingkatkan investasi.",
        5: "Kondisi keuangan sangat baik! Pertahankan.",
    }

    health = {"score": round(score, 1), "level": level, "label": labels[level], "advice": advices[level]}
    await notify_weekly_summary(summary, health)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Jadwal weekly summary: setiap Minggu jam 13.00 UTC (20.00 WIB)
    scheduler.add_job(weekly_summary_job, "cron", day_of_week="sun", hour=13, minute=0)
    scheduler.start()
    await send_message("🚀 <b>FinanceAI Backend Started</b>\nSistem siap digunakan!")
    yield
    scheduler.shutdown()
    await close_db()

app = FastAPI(
    title="Finance AI",
    description="Asisten keuangan personal berbasis AI",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(txn_router)
app.include_router(import_router)
app.include_router(summary_router)
app.include_router(portfolio_router)
app.include_router(advisor_router)

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "finance_ai", "version": "2.0.0"}
