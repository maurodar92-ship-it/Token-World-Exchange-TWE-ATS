from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime, timezone

Side = Literal["BUY", "SELL"]

class OrderIn(BaseModel):
    symbol: str = Field(min_length=1, max_length=32)
    side: Side
    price: float = Field(gt=0)
    quantity: int = Field(gt=0, le=1_000_000)
    account_id: str = Field(min_length=1, max_length=128)
    wallet: str | None = None

class Order(BaseModel):
    order_id: str
    symbol: str
    side: Side
    price: float
    quantity: int
    account_id: str
    wallet: str | None = None
    status: str = "OPEN"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Trade(BaseModel):
    trade_id: str
    symbol: str
    buy_order_id: str
    sell_order_id: str
    price: float
    quantity: int
    status: str = "CAPTURED"
    settlement_status: str = "NOT_SUBMITTED"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Eligibility(BaseModel):
    account_id: str
    kyc_status: Literal["PENDING", "VERIFIED", "REJECTED"]
    investor_category: Literal["RETAIL", "ACCREDITED", "QIB", "OFFSHORE", "OTHER"]
    jurisdictions: list[str] = []
    restrictions: list[str] = []
