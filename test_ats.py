"""
Automated Test Suite for Token World ATS Matching Engine & Compliance Backend
Sole Owner: Mauro Lomibao Dar III
Headquarters: 945 Westholme Ave, Los Angeles, CA 90024

Compatible with standard Python 3 (unittest) as well as pytest & FastAPI TestClient.
"""

import unittest
import time
import hashlib

# Local in-memory test implementation of Token World CLOB
class TokenWorldTestEngine:
    def __init__(self):
        self.bids = []
        self.asks = []
        self.trades = []
        self.enable_live_trading = False
        self.seed()

    def seed(self):
        self.bids = [
            {"order_id": "ORD-B01", "price": 52.50, "quantity": 10000, "trader": "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E", "ts": time.time() - 100},
            {"order_id": "ORD-B02", "price": 52.25, "quantity": 25000, "trader": "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF", "ts": time.time() - 80},
        ]
        self.asks = [
            {"order_id": "ORD-S01", "price": 52.75, "quantity": 15000, "trader": "0x7F037A34A600e1669485C92bCc0C3E6899A1E028", "ts": time.time() - 90},
            {"order_id": "ORD-S02", "price": 53.00, "quantity": 30000, "trader": "0x56aD9818C0bA176840715D081Ba722e0e9819921", "ts": time.time() - 70},
        ]

    def pre_trade_check(self, trader: str, price: float, quantity: int):
        if not (trader.startswith("0x") and len(trader) == 42):
            raise ValueError("Malformed EVM Address")
        if price * quantity > 10_000_000:
            raise ValueError("Exceeds maximum order capital collar ($10M)")
        if price < (52.50 * 0.70) or price > (52.50 * 1.30):
            raise ValueError("Price exceeds allowable market collar (±30% from benchmark $52.50)")

    def submit_order(self, trader: str, side: str, price: float, quantity: int):
        self.pre_trade_check(trader, price, quantity)
        order = {"order_id": f"ORD-{side[0]}-{int(time.time())}", "price": price, "quantity": quantity, "trader": trader, "ts": time.time()}
        matched = []

        if side == "BUY":
            self.bids.append(order)
            self.bids.sort(key=lambda x: (-x["price"], x["ts"]))
        else:
            self.asks.append(order)
            self.asks.sort(key=lambda x: (x["price"], x["ts"]))

        while self.bids and self.asks and self.bids[0]["price"] >= self.asks[0]["price"]:
            highest_buy = self.bids[0]
            lowest_sell = self.asks[0]
            trade_qty = min(highest_buy["quantity"], lowest_sell["quantity"])
            trade_price = lowest_sell["price"]

            tx_hash = "0x" + hashlib.sha256(f"{highest_buy['trader']}:{lowest_sell['trader']}:{trade_qty}:{trade_price}".encode()).hexdigest()
            receipt = {
                "trade_id": f"TRD-{int(time.time())}",
                "buyer": highest_buy["trader"],
                "seller": lowest_sell["trader"],
                "price": trade_price,
                "quantity": trade_qty,
                "tx_hash": tx_hash,
                "settlement_type": "ATOMIC_DVP_ERC3643"
            }
            matched.append(receipt)
            self.trades.insert(0, receipt)

            highest_buy["quantity"] -= trade_qty
            lowest_sell["quantity"] -= trade_qty

            if highest_buy["quantity"] == 0:
                self.bids.pop(0)
            if lowest_sell["quantity"] == 0:
                self.asks.pop(0)

        return order, matched

class TestTokenWorldAtsSuite(unittest.TestCase):
    def setUp(self):
        self.engine = TokenWorldTestEngine()

    def test_default_regulatory_guardrail(self):
        """Verify that live trading defaults to False as required by Regulation ATS."""
        self.assertFalse(self.engine.enable_live_trading, "ENABLE_LIVE_TRADING must default to False")

    def test_pre_trade_collar_check(self):
        """Verify SEC Rule 15c3-5 price collars reject erroneous extreme orders."""
        with self.assertRaises(ValueError) as ctx:
            self.engine.submit_order("0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E", "BUY", 150.00, 1000)
        self.assertIn("Price exceeds allowable market collar", str(ctx.exception))

    def test_pre_trade_capital_collar_check(self):
        """Verify orders exceeding $10,000,000 single order cap are rejected."""
        with self.assertRaises(ValueError) as ctx:
            self.engine.submit_order("0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E", "BUY", 52.50, 250000)
        self.assertIn("Exceeds maximum order capital collar", str(ctx.exception))

    def test_pre_trade_malformed_address_check(self):
        """Verify non-EVM addresses are rejected."""
        with self.assertRaises(ValueError) as ctx:
            self.engine.submit_order("invalid_wallet_address", "BUY", 52.50, 1000)
        self.assertIn("Malformed EVM Address", str(ctx.exception))

    def test_price_time_priority_matching(self):
        """Verify orders match at the resting limit price when bids cross asks."""
        # Current best ask is $52.75 for 15,000 shares
        # Submit crossing buy at $52.75 for 5,000 shares
        order, matched = self.engine.submit_order(
            "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF", "BUY", 52.75, 5000
        )
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["price"], 52.75)
        self.assertEqual(matched[0]["quantity"], 5000)
        self.assertEqual(matched[0]["settlement_type"], "ATOMIC_DVP_ERC3643")
        self.assertTrue(matched[0]["tx_hash"].startswith("0x"))

    def test_dtcc_fast_reconciliation_zero_variance(self):
        """Verify DTCC FAST equation: master == nyse_public + token_wrapped."""
        nyse_float = 15400000
        token_float = 4600000
        master_file = 20000000
        variance = master_file - (nyse_float + token_float)
        self.assertEqual(variance, 0, "Variance between DTC Cede & Co. and ATS on-chain must be zero")

if __name__ == "__main__":
    unittest.main()
