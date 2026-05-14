from fastapi import APIRouter
from schemas.finance import ChatRequest, ChatResponse
from agents.manager import process
from core.database import get_pool

router = APIRouter(prefix="/api/v1", tags=["Chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    result = await process(req.message)
    pool = get_pool()
    saved = 0

    async with pool.acquire() as conn:
        for txn in result.transactions:
            await conn.execute("""
                INSERT INTO transactions
                    (date, amount, currency, type, category_id, note, raw_input, source, platform, asset, asset_qty)
                VALUES ($1, $2, $3, $4, NULL, $5, $6, 'chat', $7, $8, $9)
            """,
                txn.date,
                txn.amount,
                txn.currency,
                txn.type,
                txn.note,
                result.raw_input,
                txn.platform,
                txn.asset,
                txn.asset_qty,
            )
            saved += 1

    return ChatResponse(
        status="success" if saved > 0 else "unrecognized",
        saved=saved,
        transactions=[t.model_dump() for t in result.transactions],
        unrecognized=result.unrecognized,
    )
