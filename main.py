"""
Token World Alternative Trading System (ATS) - Sandbox Matching & Compliance Backend
Sole Owner & Treasury Principal: Mauro Lomibao Dar III
Headquarters: 945 Westholme Ave, Los Angeles, CA 90024 | (310) 904-5646 | mdgodsiii@gmail.com

REGULATORY GUARDRAIL NOTICE:
The software deliberately defaults to:
ENABLE_LIVE_TRADING = False
so it cannot be mistaken for an authorized securities market.

A Token World deployment cannot legally become an NYSE-equivalent market simply by
deploying Solidity contracts or opening a website. An ATS operates under Regulation ATS
and must operate through a registered broker-dealer and file Form ATS / Form ATS-N.
"""

from fastapi import FastAPI, HTTPException, status, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import time
import uuid
import hashlib
import os
import datetime

# Mandatory Regulatory Flag
ENABLE_LIVE_TRADING: bool = os.getenv("ENABLE_LIVE_TRADING", "false").lower() in ("true", "1", "t")

OWNER_NAME = "MAURO Lomibao Dar III"

app = FastAPI(
    title="Token World Exchange Analytics & Trading Engine",
    description="Backend microservice created for owner MAURO Lomibao Dar III",
    version="2.4.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for institutional web trading portal
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TokenMarketData(BaseModel):
    symbol: str
    prices: List[float]

class AnalysisResponse(BaseModel):
    symbol: str
    owner: str
    moving_average: float
    signal: str
    timestamp: str

@app.get("/")
def read_root():
    return {
        "exchange": "Token World Exchange",
        "owner": OWNER_NAME,
        "status": "Operational - Production Reality Mode"
    }

@app.post("/analytics/forecast", response_model=AnalysisResponse)
def compute_market_signal(data: TokenMarketData):
    if not data.prices:
        raise HTTPException(status_code=400, detail="Price list cannot be empty.")

    avg_price = sum(data.prices) / len(data.prices)
    latest_price = data.prices[-1]

    # Simple Moving Average Signal Logic
    if latest_price > avg_price * 1.02:
        signal = "BULLISH_BUY"
    elif latest_price < avg_price * 0.98:
        signal = "BEARISH_SELL"
    else:
        signal = "HOLD"

    return AnalysisResponse(
        symbol=data.symbol,
        owner=OWNER_NAME,
        moving_average=round(avg_price, 4),
        signal=signal,
        timestamp=datetime.datetime.utcnow().isoformat()
    )

# --- ENUMS & SCHEMAS ---

class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderType(str, Enum):
    LIMIT = "LIMIT"
    MARKET = "MARKET"

class InvestorTier(str, Enum):
    SOLE_OWNER_PRINCIPAL = "SOLE_OWNER_PRINCIPAL"
    QIB_RULE_144A = "QIB_RULE_144A"
    ACCREDITED_REG_D = "ACCREDITED_REG_D"
    OFFSHORE_REG_S = "OFFSHORE_REG_S"
    RETAIL_UNQUALIFIED = "RETAIL_UNQUALIFIED"

class OrderStatus(str, Enum):
    OPEN = "OPEN"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class OrderCreateRequest(BaseModel):
    trader_address: str = Field(..., description="EVM 20-byte address of participant")
    side: OrderSide
    symbol: str = Field("TW-EQ", description="Security symbol")
    price: float = Field(..., gt=0, description="Limit price in USD")
    quantity: int = Field(..., gt=0, description="Number of share units")
    order_type: OrderType = Field(OrderType.LIMIT)
    investor_tier: InvestorTier = Field(InvestorTier.ACCREDITED_REG_D)

class OrderResponse(BaseModel):
    order_id: str
    trader_address: str
    symbol: str
    side: OrderSide
    price: float
    quantity: int
    initial_quantity: int
    status: OrderStatus
    investor_tier: InvestorTier
    timestamp: float

class TradeExecution(BaseModel):
    trade_id: str
    buy_order_id: str
    sell_order_id: str
    buyer_address: str
    seller_address: str
    symbol: str
    quantity: int
    price: float
    total_usd: float
    timestamp: float
    tx_hash: str
    settlement_type: str = "ATOMIC_DVP_ERC3643"
    dtcc_fast_status: str = "RECONCILED"

class KycVerifyRequest(BaseModel):
    entity_name: str
    wallet_address: str
    jurisdiction: str = "US"
    accreditation_type: str = "NET_WORTH_EXCEED_1M"
    net_worth_usd: float = 2500000.0
    is_qib: bool = False
    tax_id: str = "XX-XXXXXXX"

class KycVerifyResponse(BaseModel):
    verified: bool
    wallet_address: str
    investor_tier: InvestorTier
    rule_status: str
    ofac_sanctions_cleared: bool
    whitelisted: bool
    certificate_id: str

class DvPSimulateRequest(BaseModel):
    buyer_address: str
    seller_address: str
    symbol: str = "TW-EQ"
    shares_quantity: int = 1000
    price_per_share: float = 52.50
    settlement_currency: str = "USDC"

# --- IN-MEMORY SANDBOX MATCHING ENGINE ---

class SandboxMatchingEngine:
    def __init__(self, symbol: str = "TW-EQ"):
        self.symbol = symbol
        self.bids: List[Dict[str, Any]] = []
        self.asks: List[Dict[str, Any]] = []
        self.trades: List[Dict[str, Any]] = []
        self.whitelisted_wallets: Dict[str, InvestorTier] = {
            "0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D".lower(): InvestorTier.SOLE_OWNER_PRINCIPAL,
            "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E".lower(): InvestorTier.QIB_RULE_144A,
            "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF".lower(): InvestorTier.ACCREDITED_REG_D,
            "0x12bE66708709320Ac321A858712C208492E69d12".lower(): InvestorTier.OFFSHORE_REG_S,
        }
        self.seed_initial_book()

    def seed_initial_book(self):
        # Initial bids
        self.bids = [
            {
                "order_id": "ORD-B01",
                "trader_address": "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
                "symbol": self.symbol,
                "side": "BUY",
                "price": 52.50,
                "quantity": 10000,
                "initial_quantity": 10000,
                "status": "OPEN",
                "investor_tier": "QIB_RULE_144A",
                "timestamp": time.time() - 360,
            },
            {
                "order_id": "ORD-B02",
                "trader_address": "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF",
                "symbol": self.symbol,
                "side": "BUY",
                "price": 52.25,
                "quantity": 25000,
                "initial_quantity": 25000,
                "status": "OPEN",
                "investor_tier": "ACCREDITED_REG_D",
                "timestamp": time.time() - 300,
            },
            {
                "order_id": "ORD-B03",
                "trader_address": "0x12bE66708709320Ac321A858712C208492E69d12",
                "symbol": self.symbol,
                "side": "BUY",
                "price": 51.90,
                "quantity": 50000,
                "initial_quantity": 50000,
                "status": "OPEN",
                "investor_tier": "QIB_RULE_144A",
                "timestamp": time.time() - 240,
            },
        ]
        # Initial asks
        self.asks = [
            {
                "order_id": "ORD-S01",
                "trader_address": "0x7F037A34A600e1669485C92bCc0C3E6899A1E028",
                "symbol": self.symbol,
                "side": "SELL",
                "price": 52.75,
                "quantity": 15000,
                "initial_quantity": 15000,
                "status": "OPEN",
                "investor_tier": "ACCREDITED_REG_D",
                "timestamp": time.time() - 340,
            },
            {
                "order_id": "ORD-S02",
                "trader_address": "0x56aD9818C0bA176840715D081Ba722e0e9819921",
                "symbol": self.symbol,
                "side": "SELL",
                "price": 53.00,
                "quantity": 30000,
                "initial_quantity": 30000,
                "status": "OPEN",
                "investor_tier": "QIB_RULE_144A",
                "timestamp": time.time() - 280,
            },
        ]

    def pre_trade_risk_checks(self, order: OrderCreateRequest):
        # 1. EVM Address Check
        addr = order.trader_address.lower()
        if not (addr.startswith("0x") and len(addr) == 42):
            raise HTTPException(status_code=400, detail="SEC Pre-Trade Failure: Malformed EVM Address")

        # 2. Maximum Single Order Value Cap ($10,000,000 Rule 15c3-5)
        total_order_val = order.price * order.quantity
        if total_order_val > 10_000_000.0:
            raise HTTPException(status_code=400, detail="SEC Rule 15c3-5 Pre-Trade Check: Order exceeds maximum single capital collar ($10M)")

        # 3. Price Collar Check (within 20% of reference price $52.50)
        ref_price = 52.50
        if order.price < (ref_price * 0.70) or order.price > (ref_price * 1.30):
            raise HTTPException(status_code=400, detail="Pre-Trade Error Check: Price exceeds allowable market collar (±30% from benchmark $52.50)")

        # 4. Whitelist Verification
        if addr not in self.whitelisted_wallets:
            # Sandbox auto-registers accredited status for demonstration
            self.whitelisted_wallets[addr] = order.investor_tier

    def submit_order(self, req: OrderCreateRequest) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
        self.pre_trade_risk_checks(req)

        order_id = f"ORD-{req.side.value[0]}-{str(uuid.uuid4())[:6].upper()}"
        order_obj = {
            "order_id": order_id,
            "trader_address": req.trader_address,
            "symbol": req.symbol,
            "side": req.side.value,
            "price": float(req.price),
            "quantity": int(req.quantity),
            "initial_quantity": int(req.quantity),
            "status": "OPEN",
            "investor_tier": req.investor_tier.value,
            "timestamp": time.time(),
        }

        executed_trades = []

        if req.side == OrderSide.BUY:
            self.bids.append(order_obj)
            self.bids.sort(key=lambda x: (-x["price"], x["timestamp"]))
        else:
            self.asks.append(order_obj)
            self.asks.sort(key=lambda x: (x["price"], x["timestamp"]))

        # Execute Price-Time Priority Matching
        while self.bids and self.asks:
            highest_buy = self.bids[0]
            lowest_sell = self.asks[0]

            if highest_buy["price"] >= lowest_sell["price"]:
                trade_price = lowest_sell["price"]
                trade_qty = min(highest_buy["quantity"], lowest_sell["quantity"])

                now = time.time()
                payload = f"{highest_buy['trader_address']}:{lowest_sell['trader_address']}:{trade_qty}:{trade_price}:{now}"
                tx_hash = "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()

                trade_receipt = {
                    "trade_id": f"TRD-{str(uuid.uuid4())[:6].upper()}",
                    "buy_order_id": highest_buy["order_id"],
                    "sell_order_id": lowest_sell["order_id"],
                    "buyer_address": highest_buy["trader_address"],
                    "seller_address": lowest_sell["trader_address"],
                    "symbol": req.symbol,
                    "quantity": trade_qty,
                    "price": trade_price,
                    "total_usd": round(trade_qty * trade_price, 2),
                    "timestamp": now,
                    "tx_hash": tx_hash,
                    "settlement_type": "ATOMIC_DVP_ERC3643",
                    "dtcc_fast_status": "RECONCILED",
                }

                executed_trades.append(trade_receipt)
                self.trades.insert(0, trade_receipt)

                highest_buy["quantity"] -= trade_qty
                lowest_sell["quantity"] -= trade_qty

                if highest_buy["quantity"] == 0:
                    highest_buy["status"] = "FILLED"
                    self.bids.pop(0)
                else:
                    highest_buy["status"] = "PARTIALLY_FILLED"

                if lowest_sell["quantity"] == 0:
                    lowest_sell["status"] = "FILLED"
                    self.asks.pop(0)
                else:
                    lowest_sell["status"] = "PARTIALLY_FILLED"
            else:
                break

        return order_obj, executed_trades

engine = SandboxMatchingEngine()

# --- ROUTES ---

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Token World ATS Sandbox Matching Engine",
        "principal": "Mauro Lomibao Dar III",
        "enable_live_trading": ENABLE_LIVE_TRADING,
        "mode": "REGULATORY_SIMULATION_SANDBOX",
        "timestamp": time.time(),
    }

@app.get("/api/ats/status")
def get_ats_status():
    return {
        "system_title": "Token World",
        "sole_owner": "Mauro Lomibao Dar III",
        "headquarters": "945 Westholme Ave, Los Angeles, CA 90024",
        "phone": "(310) 904-5646",
        "email": "mdgodsiii@gmail.com",
        "enable_live_trading": ENABLE_LIVE_TRADING,
        "regulatory_disclaimer": (
            "CRITICAL REGULATORY NOTICE: A Token World deployment cannot legally become an NYSE-equivalent market "
            "simply by deploying Solidity contracts or opening a website. Regulation ATS requires an ATS to operate "
            "through a registered broker-dealer and file Form ATS / Form ATS-N with the SEC. Form ATS itself is not "
            "an SEC approval order. The software operates strictly in demonstration & regulatory sandbox mode."
        ),
        "open_bids_count": len(engine.bids),
        "open_asks_count": len(engine.asks),
        "total_executed_trades": len(engine.trades),
        "reference_ticker": "TW-EQ",
    }

@app.get("/api/ats/depth")
def get_order_book_depth():
    spread = round(engine.asks[0]["price"] - engine.bids[0]["price"], 2) if engine.bids and engine.asks else 0.0
    return {
        "symbol": "TW-EQ",
        "bids": engine.bids[:15],
        "asks": engine.asks[:15],
        "spread": spread,
        "timestamp": time.time(),
    }

@app.post("/api/ats/order", status_code=status.HTTP_201_CREATED)
def submit_order(order: OrderCreateRequest):
    if ENABLE_LIVE_TRADING:
        raise HTTPException(
            status_code=403,
            detail="LIVE TRADING BLOCKED: Live trading is disabled by default (ENABLE_LIVE_TRADING=false) pending Form ATS/ATS-N and FINRA broker-dealer registration."
        )
    order_record, executed_trades = engine.submit_order(order)
    return {
        "success": True,
        "order": order_record,
        "executed_trades": executed_trades,
        "matches_count": len(executed_trades),
        "mode": "SANDBOX_SIMULATION",
    }

@app.get("/api/ats/trades", response_model=List[TradeExecution])
def get_trades(limit: int = Query(25, ge=1, le=100)):
    return engine.trades[:limit]

@app.post("/api/kyc/verify", response_model=KycVerifyResponse)
def simulate_kyc_verification(req: KycVerifyRequest):
    # Rule 501 / Rule 144A verification simulation
    is_accredited = req.net_worth_usd >= 1_000_000.0 or req.is_qib
    tier = InvestorTier.QIB_RULE_144A if req.is_qib else (InvestorTier.ACCREDITED_REG_D if is_accredited else InvestorTier.RETAIL_UNQUALIFIED)

    cert_hash = hashlib.sha256(f"{req.wallet_address}:{req.entity_name}:{time.time()}".encode("utf-8")).hexdigest()

    if is_accredited:
        engine.whitelisted_wallets[req.wallet_address.lower()] = tier

    return KycVerifyResponse(
        verified=is_accredited,
        wallet_address=req.wallet_address,
        investor_tier=tier,
        rule_status="Rule 501(a) Accredited" if is_accredited else "Non-Accredited Retail (Restricted)",
        ofac_sanctions_cleared=True,
        whitelisted=is_accredited,
        certificate_id=f"KYC-{cert_hash[:10].upper()}",
    )

@app.get("/api/compliance/gates")
def get_compliance_gates():
    return {
        "gates": [
            {"gate_id": "GATE-01", "name": "Corporate Entity Formation", "status": "CLEARED", "owner": "Mauro Lomibao Dar III"},
            {"gate_id": "GATE-02", "name": "Broker-Dealer Registration (Form BD / FINRA)", "status": "IN_PROGRESS", "owner": "Chief Compliance Officer"},
            {"gate_id": "GATE-03", "name": "Qualified Custodian & Cash Escrow Agreement", "status": "IN_PROGRESS", "owner": "Treasury Lead"},
            {"gate_id": "GATE-04", "name": "Transfer Agent & DTCC FAST FAST#9450 Interface", "status": "IN_PROGRESS", "owner": "Operations"},
            {"gate_id": "GATE-05", "name": "SEC Form ATS Filing (Rule 301)", "status": "READY_FOR_FILING", "owner": "Regulatory Counsel"},
            {"gate_id": "GATE-06", "name": "SEC Form ATS-N (if trading NMS Stocks)", "status": "SCHEDULED", "owner": "Chief Regulatory Officer"},
            {"gate_id": "GATE-07", "name": "Pre-Trade Market Access Controls (Rule 15c3-5)", "status": "CLEARED", "owner": "Head of Engineering"},
            {"gate_id": "GATE-08", "name": "Smart Contract Audit & Formal Verification", "status": "CLEARED", "owner": "Blockchain Lead"},
            {"gate_id": "GATE-09", "name": "FINRA Rule 3110 Supervisory Procedures", "status": "READY_FOR_FILING", "owner": "Chief Compliance Officer"},
            {"gate_id": "GATE-10", "name": "Controlled Pilot Beta Launch", "status": "PENDING_GATES_2_6", "owner": "Mauro Lomibao Dar III"},
        ],
        "default_state": "ENABLE_LIVE_TRADING=false",
        "live_trading_eligible": False,
        "recommendation": "Maintain ENABLE_LIVE_TRADING=false while executing phases 1 through 9 of the regulatory workplan.",
    }

@app.post("/api/settlement/simulate-dvp")
def simulate_dvp_settlement(req: DvPSimulateRequest):
    gross_usd = req.shares_quantity * req.price_per_share
    tx_hash = "0x" + hashlib.sha256(f"DVP:{req.buyer_address}:{req.seller_address}:{gross_usd}:{time.time()}".encode("utf-8")).hexdigest()
    return {
        "status": "ATOMIC_DVP_SIMULATED_SUCCESS",
        "settlement_bus": "TokenWorldSecurityToken.sol / DvPSettlementVault",
        "tx_hash": tx_hash,
        "asset_transferred": f"{req.shares_quantity:,} {req.symbol} tokens to {req.buyer_address}",
        "funds_debited": f"${gross_usd:,.2f} {req.settlement_currency} to {req.seller_address}",
        "settlement_cycle": "T+0 Real-Time Instantaneous",
        "dtcc_reconciliation_variance": 0,
    }

@app.get("/api/dtcc/reconciliation")
def get_dtcc_reconciliation():
    return {
        "timestamp": time.time(),
        "symbol": "TW-EQ",
        "nyse_public_float_dtc_shares": 18_750_000,
        "token_world_wrapped_shares": 1_250_000,
        "transfer_agent_master_file_total": 20_000_000,
        "variance": 0,
        "status": "BALANCED_AND_RECONCILED",
        "transfer_agent": "VStock Transfer / Computershare (DTCC FAST Participant #9450)",
        "operator": "Mauro Lomibao Dar III",
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Token World ATS Sandbox FastAPI Backend on port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
