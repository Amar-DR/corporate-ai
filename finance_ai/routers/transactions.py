from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date
from core.database import get_pool

router = APIRouter(prefix="/api/v1/transactions", tags=["Transaksi"])

class TransactionUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    type: Optional[str] = None
    note: Optional[str] = None
    category_id: Optional[int] = None

@router.get("/")
async def list_transactions(
    type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    keyword: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    pool = get_pool()
    conditions = []
    params = []
    i = 1

    if type:
        conditions.append(f"type = ${i}"); params.append(type); i += 1
    if date_from:
        conditions.append(f"date >= ${i}"); params.append(date_from); i += 1
    if date_to:
        conditions.append(f"date <= ${i}"); params.append(date_to); i += 1
    if keyword:
        conditions.append(f"note ILIKE ${i}"); params.append(f"%{keyword}%"); i += 1

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    params.extend([limit, offset])

    async with pool.acquire() as conn:
        rows = await conn.fetch(f"""
            SELECT id, date, amount, currency, type, category_id,
                   note, source, platform, asset, asset_qty, created_at
            FROM transactions
            {where}
            ORDER BY date DESC, created_at DESC
            LIMIT ${i} OFFSET ${i+1}
        """, *params)

        total = await conn.fetchval(f"SELECT COUNT(*) FROM transactions {where}", *params[:-2])

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [dict(r) for r in rows],
    }

@router.get("/{txn_id}")
async def get_transaction(txn_id: int):
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM transactions WHERE id = $1", txn_id
        )
    if not row:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    return dict(row)

@router.patch("/{txn_id}")
async def update_transaction(txn_id: int, body: TransactionUpdate):
    pool = get_pool()
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(400, "Tidak ada field yang diupdate")

    sets = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
    params = list(fields.values()) + [txn_id]

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE transactions SET {sets} WHERE id = ${len(params)} RETURNING *",
            *params
        )
    if not row:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    return dict(row)

@router.delete("/{txn_id}")
async def delete_transaction(txn_id: int):
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM transactions WHERE id = $1", txn_id
        )
    if result == "DELETE 0":
        raise HTTPException(404, "Transaksi tidak ditemukan")
    return {"status": "deleted", "id": txn_id}
