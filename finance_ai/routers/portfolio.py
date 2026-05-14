from fastapi import APIRouter, HTTPException
from core.database import get_pool
import httpx

router = APIRouter(prefix="/api/v1/portfolio", tags=["Portfolio"])

COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
ASSETS = {
    "USDT": "tether",
    "BTC": "bitcoin",
}

async def get_prices_idr() -> dict:
    """Ambil harga USDT & BTC dalam IDR dari CoinGecko"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(COINGECKO_URL, params={
                "ids": "tether,bitcoin",
                "vs_currencies": "idr",
            })
            data = resp.json()
            return {
                "USDT": data["tether"]["idr"],
                "BTC": data["bitcoin"]["idr"],
            }
    except Exception as e:
        raise HTTPException(503, f"Gagal ambil harga dari CoinGecko: {e}")

@router.get("/prices")
async def get_prices():
    """Harga USDT & BTC realtime dalam IDR"""
    prices = await get_prices_idr()
    return {
        "source": "CoinGecko",
        "currency": "IDR",
        "prices": prices,
    }

@router.get("/crypto")
async def get_crypto_portfolio():
    """Hitung portfolio crypto dari histori transaksi + harga realtime"""
    pool = get_pool()

    async with pool.acquire() as conn:
        # Ambil semua transaksi invest crypto
        rows = await conn.fetch("""
            SELECT type, asset, asset_qty, amount
            FROM transactions
            WHERE asset IN ('USDT', 'BTC')
            ORDER BY id ASC
        """)

    # Hitung total qty per aset
    holdings = {"USDT": 0.0, "BTC": 0.0}
    total_invested = {"USDT": 0.0, "BTC": 0.0}

    for r in rows:
        asset = r["asset"]
        qty = float(r["asset_qty"] or 0)
        amount = float(r["amount"] or 0)

        if asset not in holdings:
            continue

        if r["type"] == "invest_in":
            holdings[asset] += qty
            total_invested[asset] += amount
        elif r["type"] == "invest_out":
            holdings[asset] -= qty

    # Ambil harga realtime
    prices = await get_prices_idr()

    # Hitung P&L
    result = []
    total_value_idr = 0
    total_invested_idr = 0

    for asset, qty in holdings.items():
        if qty <= 0:
            continue

        price_idr = prices.get(asset, 0)
        market_value = qty * price_idr
        invested = total_invested[asset]
        pnl = market_value - invested
        pnl_pct = (pnl / invested * 100) if invested > 0 else 0

        total_value_idr += market_value
        total_invested_idr += invested

        result.append({
            "asset": asset,
            "qty": qty,
            "price_idr": price_idr,
            "market_value_idr": round(market_value, 2),
            "total_invested_idr": round(invested, 2),
            "pnl_idr": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
        })

    total_pnl = total_value_idr - total_invested_idr

    return {
        "holdings": result,
        "summary": {
            "total_market_value_idr": round(total_value_idr, 2),
            "total_invested_idr": round(total_invested_idr, 2),
            "total_pnl_idr": round(total_pnl, 2),
            "total_pnl_pct": round((total_pnl / total_invested_idr * 100) if total_invested_idr > 0 else 0, 2),
        }
    }
