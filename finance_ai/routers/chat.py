from fastapi import APIRouter
from schemas.finance import ChatRequest, ChatResponse
from agents.manager import process
from core.database import get_pool
from core.telegram import notify_transaction

router = APIRouter(prefix="/api/v1", tags=["Chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    result = await process(req.message)
    pool = get_pool()
    saved = 0
    saved_txns = []

    async with pool.acquire() as conn:
        for txn in result.transactions:
            await conn.execute("""
                INSERT INTO transactions
                    (date, amount, currency, type, category_id, note, raw_input, source, platform, asset, asset_qty)
                VALUES ($1, $2, $3, $4, NULL, $5, $6, 'chat', $7, $8, $9)
            """,
                txn.date, txn.amount, txn.currency, txn.type,
                txn.note, result.raw_input,
                txn.platform, txn.asset, txn.asset_qty,
            )
            saved += 1
            saved_txns.append({
                "type": txn.type,
                "amount": txn.amount,
                "category": txn.category,
                "note": txn.note,
            })

    # Kirim notifikasi Telegram (async, tidak block response)
    if saved_txns:
        import asyncio
        asyncio.create_task(notify_transaction(saved_txns))

    return ChatResponse(
        status="success" if saved > 0 else "unrecognized",
        saved=saved,
        transactions=[t.model_dump() for t in result.transactions],
        unrecognized=result.unrecognized,
    )
