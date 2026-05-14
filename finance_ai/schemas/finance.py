from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import date
from decimal import Decimal


class TransactionItem(BaseModel):
    """Satu transaksi hasil parse dari chat"""
    type: Literal["income", "expense", "invest_in", "invest_out"]
    amount: float
    currency: str = "IDR"
    category: str
    note: str
    date: date

    # Khusus investasi
    platform: Optional[str] = None
    asset: Optional[str] = None
    asset_qty: Optional[float] = None
    asset_price: Optional[float] = None

    @field_validator("amount")
    @classmethod
    def must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount harus lebih dari 0")
        return v


class ParseResult(BaseModel):
    """Hasil parse dari satu pesan chat — bisa berisi banyak transaksi"""
    raw_input: str
    transactions: list[TransactionItem]
    unrecognized: list[str] = []   # bagian pesan yang tidak bisa di-parse


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    status: str
    saved: int
    transactions: list[dict]
    unrecognized: list[str] = []

