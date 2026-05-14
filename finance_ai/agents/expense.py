import re
from datetime import date, timedelta
from schemas.finance import TransactionItem

EXPENSE_KEYWORDS = {
    "Makanan & Minuman": ["makan", "minum", "beli", "geprek", "ayam", "nasi", "kopi", "teh", "bakso", "mie", "warung", "resto", "cafe", "jajan"],
    "Transport": ["bensin", "ojol", "grab", "gojek", "parkir", "tol", "angkot", "bus", "kereta", "bbm"],
    "Tagihan & Utilitas": ["listrik", "air", "internet", "wifi", "tagihan", "bayar", "iuran"],
    "Pulsa & Internet": ["pulsa", "kuota", "paket data", "telkomsel", "xl", "indosat"],
    "Kesehatan": ["obat", "dokter", "klinik", "apotek", "vitamin", "rs", "rumah sakit"],
    "Hiburan": ["nonton", "bioskop", "game", "spotify", "netflix", "youtube"],
    "Belanja": ["baju", "sepatu", "hp", "laptop", "elektronik", "tokopedia", "shopee", "lazada"],
}

INCOME_KEYWORDS = {
    "Uang Saku": ["uang saku", "saku", "jajan"],
    "Gaji": ["gaji", "salary", "upah"],
    "Freelance": ["freelance", "project", "klien", "client", "kerjaan"],
    "Bonus": ["bonus", "reward", "hadiah"],
    "Penjualan": ["jual", "sold", "laku"],
}

AMOUNT_PATTERN = re.compile(r'(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta|m(?![a-z]))?', re.IGNORECASE)
SEPARATORS = re.compile(r'\b(dan|sama|juga|terus|trus|serta|plus|\+)\b', re.IGNORECASE)

def parse_amount(text: str) -> float:
    match = AMOUNT_PATTERN.search(text)
    if not match:
        return 0.0
    val = float(match.group(1).replace(',', '.'))
    unit = (match.group(2) or "").lower()
    if unit in ['k', 'rb', 'ribu']: val *= 1_000
    elif unit in ['jt', 'juta']: val *= 1_000_000
    elif unit == 'm': val *= 1_000_000
    return val

def detect_date(text: str) -> date:
    text = text.lower()
    today = date.today()
    if any(x in text for x in ['kemarin', 'yesterday']): return today - timedelta(days=1)
    if any(x in text for x in ['lusa']): return today - timedelta(days=2)
    return today

def detect_category(text: str, is_income: bool) -> str:
    text = text.lower()
    keywords = INCOME_KEYWORDS if is_income else EXPENSE_KEYWORDS
    for category, words in keywords.items():
        if any(w in text for w in words):
            return category
    return "Pemasukan Lain" if is_income else "Pengeluaran Lain"

def is_income(text: str) -> bool:
    text = text.lower()
    return any(x in text for x in [
        'pemasukan', 'dapat', 'dapet', 'terima', 'masuk',
        'uang saku', 'gaji', 'bonus', 'freelance', 'jual'
    ])

def parse_chunk(chunk: str) -> TransactionItem | None:
    chunk = chunk.strip()
    if not chunk:
        return None
    amount = parse_amount(chunk)
    if amount <= 0:
        return None
    income = is_income(chunk)
    return TransactionItem(
        type="income" if income else "expense",
        amount=amount,
        currency="IDR",
        category=detect_category(chunk, income),
        note=chunk,
        date=detect_date(chunk),
    )

def extract_all(text: str) -> list[TransactionItem]:
    chunks = SEPARATORS.split(text)
    results = []
    for chunk in chunks:
        if SEPARATORS.match(chunk.strip()):
            continue
        item = parse_chunk(chunk)
        if item:
            results.append(item)
    return results
