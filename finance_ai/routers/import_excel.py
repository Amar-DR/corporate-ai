import io
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from core.database import get_pool

router = APIRouter(prefix="/api/v1/import", tags=["Import Excel"])

COL_ALIASES = {
    "tanggal": "date", "tgl": "date", "date": "date",
    "jumlah": "amount", "nominal": "amount", "amount": "amount",
    "jenis": "type", "tipe": "type", "type": "type",
    "keterangan": "note", "note": "note", "deskripsi": "note", "catatan": "note",
    "kategori": "category", "category": "category",
}

TYPE_MAP = {
    "masuk": "income", "income": "income", "pemasukan": "income",
    "keluar": "expense", "expense": "expense", "pengeluaran": "expense",
    "invest": "invest_in", "investasi": "invest_in",
}

def normalize_type(raw: str) -> str:
    raw = str(raw).lower().strip()
    for key, val in TYPE_MAP.items():
        if key in raw:
            return val
    return "expense"

def parse_amount(raw) -> float:
    cleaned = str(raw).replace("Rp", "").replace("rp", "")
    cleaned = cleaned.replace(".", "").replace(",", "").strip()
    return abs(float(cleaned))

def parse_date(raw):
    if pd.isna(raw):
        raise ValueError("Tanggal kosong")
    if isinstance(raw, (datetime, pd.Timestamp)):
        return raw.date()
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
        try:
            return datetime.strptime(str(raw).strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Format tanggal tidak dikenali: {raw}")

@router.post("/excel")
async def import_excel(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "File harus .xlsx atau .xls")

    content = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Gagal baca file: {e}")

    if df.empty:
        raise HTTPException(400, "File kosong")

    df.columns = [COL_ALIASES.get(c.lower().strip(), c.lower().strip()) for c in df.columns]

    missing = {"date", "amount", "type"} - set(df.columns)
    if missing:
        raise HTTPException(400, f"Kolom tidak ditemukan: {missing}. Kolom tersedia: {list(df.columns)}")

    pool = get_pool()
    saved, errors = 0, []

    async with pool.acquire() as conn:
        for i, row in df.iterrows():
            try:
                await conn.execute("""
                    INSERT INTO transactions (date, amount, currency, type, note, raw_input, source)
                    VALUES ($1, $2, 'IDR', $3, $4, $5, 'excel_import')
                """,
                    parse_date(row["date"]),
                    parse_amount(row["amount"]),
                    normalize_type(row["type"]),
                    str(row.get("note", "") or ""),
                    str(row.to_dict()),
                )
                saved += 1
            except Exception as e:
                errors.append({"row": i + 2, "error": str(e)})

    return {
        "success": True,
        "imported": saved,
        "skipped": len(errors),
        "errors": errors,
        "message": f"Berhasil import {saved} transaksi, {len(errors)} dilewati."
    }

@router.get("/template")
def download_template():
    df = pd.DataFrame({
        "tanggal":    ["2025-05-01", "2025-05-02"],
        "jumlah":     [100000, 15000],
        "jenis":      ["pemasukan", "pengeluaran"],
        "keterangan": ["Uang saku", "Beli ayam geprek"],
        "kategori":   ["Uang Saku", "Makanan & Minuman"],
    })
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Transaksi")
    output.seek(0)
    headers = {"Content-Disposition": 'attachment; filename="template_financeai.xlsx"'}
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
