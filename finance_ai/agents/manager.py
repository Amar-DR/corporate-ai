from agents.expense import extract_all as extract_expense
from agents.invest import extract
from schemas.finance import ParseResult

INVEST_KEYWORDS = [
    'usdt', 'btc', 'bitcoin', 'eth', 'crypto', 'kripto',
    'saham', 'switch', 'swap', 'tukar', 'invest',
    'tokocrypto', 'pintu', 'indodax', 'bybit', 'binance',
    'stockbit', 'bmri', 'bbca', 'pwon', 'pluang',
]

def is_invest(text: str) -> bool:
    text = text.lower()
    return any(kw in text for kw in INVEST_KEYWORDS)

async def process(message: str) -> ParseResult:
    transactions = []

    if is_invest(message):
        item = extract(message)
        if item:
            transactions.append(item)
    else:
        transactions = extract_expense(message)

    return ParseResult(
        raw_input=message,
        transactions=transactions,
        unrecognized=[] if transactions else [message],
    )
