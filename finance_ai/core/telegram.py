import os
import httpx
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

async def send_message(text: str, parse_mode: str = "HTML"):
    """Kirim pesan ke Telegram"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(f"{BASE_URL}/sendMessage", json={
                "chat_id": CHAT_ID,
                "text": text,
                "parse_mode": parse_mode,
            })
    except Exception as e:
        print(f"[Telegram] Error: {e}")

async def notify_transaction(transactions: list[dict]):
    """Notifikasi transaksi baru"""
    if not transactions:
        return

    lines = ["💰 <b>Transaksi Baru Dicatat</b>\n"]
    for t in transactions:
        emoji = "📈" if t["type"] == "income" else "📉" if t["type"] == "expense" else "₿"
        amount = f"Rp {t['amount']:,.0f}"
        lines.append(f"{emoji} <b>{t['category']}</b> — {amount}")
        lines.append(f"   📝 {t['note']}")

    await send_message("\n".join(lines))

async def notify_weekly_summary(summary: dict, health: dict):
    """Weekly summary setiap Minggu"""
    level_emoji = {1: "🔴", 2: "🟠", 3: "🟡", 4: "🔵", 5: "🟢"}
    emoji = level_emoji.get(health.get("level", 3), "🟡")

    text = f"""📊 <b>Weekly Finance Summary</b>

{emoji} <b>Health Score: {health.get('score', 0)}/100 — {health.get('label', '')}</b>

💚 Pemasukan: Rp {summary.get('total_income', 0):,.0f}
❤️ Pengeluaran: Rp {summary.get('total_expense', 0):,.0f}
💙 Investasi: Rp {summary.get('total_invest', 0):,.0f}
⚡ Net Cashflow: Rp {summary.get('net_cashflow', 0):,.0f}
📊 Saving Rate: {summary.get('saving_rate_pct', 0)}%

💡 {health.get('advice', '')}"""

    await send_message(text)
