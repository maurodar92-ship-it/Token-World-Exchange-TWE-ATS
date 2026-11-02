from collections import defaultdict
from .models import Order, Trade
import uuid

class MatchingEngine:
    """Deterministic price/time demo engine; not suitable for live securities trading."""
    def __init__(self):
        self.bids = defaultdict(list)
        self.asks = defaultdict(list)
        self.orders = {}
        self.trades = []

    def add(self, order: Order):
        self.orders[order.order_id] = order
        book = self.bids if order.side == "BUY" else self.asks
        book[order.symbol].append(order)
        self._sort(order.symbol)
        self._match(order.symbol)
        return order

    def _sort(self, symbol):
        self.bids[symbol].sort(key=lambda o: (-o.price, o.created_at))
        self.asks[symbol].sort(key=lambda o: (o.price, o.created_at))

    def _match(self, symbol):
        while self.bids[symbol] and self.asks[symbol]:
            bid, ask = self.bids[symbol][0], self.asks[symbol][0]
            if bid.price < ask.price:
                break
            if bid.account_id == ask.account_id:
                break
            qty = min(bid.quantity, ask.quantity)
            self.trades.append(
                Trade(
                    trade_id=str(uuid.uuid4()),
                    symbol=symbol,
                    buy_order_id=bid.order_id,
                    sell_order_id=ask.order_id,
                    price=ask.price,
                    quantity=qty,
                )
            )
            bid.quantity -= qty
            ask.quantity -= qty
            if bid.quantity == 0:
                bid.status = "FILLED"
                self.bids[symbol].pop(0)
            if ask.quantity == 0:
                ask.status = "FILLED"
                self.asks[symbol].pop(0)
