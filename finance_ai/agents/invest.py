import re
from datetime import date
from schemas.finance import TransactionItem

AMOUNT_PATTERN = re.compile(r'(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta|m(?![a-z]))?', re.IGNORECASE)

PLATFORMS = ["tokocrypto", "pintu", "indodax", "bybit", "binance", "pluang", "stockbit", "bibit"]
CRYPTO_ASSETS = ["usdt", "btc", "bitcoin", "eth", "ethereum", "bnb", "sol", "xrp"]
STOCK_ASSETS = ["bmri", "bbca", "bbri", "pwon", "tlkm", "asii"]

def parse_amounts(text: str) -> list[float]:
    results = []
    for match in AMOUNT_PATTERN.finditer(text):
        val = float(match.group(1).replace(',', '.'))
        unit = (match.group(2) or "").lower()
        if unit in ['k', 'rb', 'ribu']: val *= 1_000
        elif unit in ['jt', 'juta']: val *= 1_000_000
        elif unit == 'm': val *= 1_000_000
        results.append(val)
    return results

def detect_platform(text: str) -> str | None:
    text = text.lower()
    for p in PLATFORMS:
        if p in text:
            return p.capitalize()
    return None

def detect_asset(text: str) -> str:
    text = text.lower()
    for a in CRYPTO_ASSETS + STOCK_ASSETS:
        if a in text:
            return a.upper()
    return "Unknown"

def detect_action(text: str) -> str:
    text = text.lower()
    if any(x in text for x in ['switch', 'swap', 'tukar', 'convert']): return "invest_in"
    if any(x in text for x in ['jual', 'sell', 'cairkan']): return "invest_out"
    return "invest_in"

def extract(text: str) -> TransactionItem | None:
    amounts = parse_amounts(text)
    if not amounts:
        return None
    action = detect_action(text)
    asset = detect_asset(text)
    platform = detect_platform(text)
    return TransactionItem(
        type=action,
        amount=amounts[0],
        currency="IDR",
        category="Investasi",
        note=text,
        date=date.today(),
        platform=platform,
        asset=asset,
        asset_qty=amounts[1] if len(amounts) > 1 else None,
    )
