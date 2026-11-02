// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PreTradeComplianceHook.sol";

/**
 * @title OnChainInstitutionalOrderBook
 * @author Token World Exchange - Architecture Option 2
 * @notice On-chain Central Limit Order Book (CLOB) running on an enterprise L2/L3 rollup.
 *         Optimized for sub-second block times (e.g., Arbitrum Orbit 250ms, Avalanche Subnet 500ms).
 *         Features strict pre-execution compliance gates via smart contract hook interception.
 */

contract OnChainInstitutionalOrderBook {
    address public owner;
    IPreTradeComplianceHook public complianceHook;

    enum OrderSide { BUY, SELL }
    enum OrderStatus { ACTIVE, FILLED, CANCELLED, REJECTED }

    struct OnChainOrder {
        uint256 orderId;
        address trader;
        string symbol;
        OrderSide side;
        uint256 priceMicros;     // Micro-USD (e.g. 52.50 USD = 52_500_000)
        uint256 quantityShares;
        uint256 filledShares;
        uint64 timestamp;
        OrderStatus status;
        bytes32 clientOrderId;
    }

    uint256 public nextOrderId = 1;

    // Mapping from Order ID to OnChainOrder
    mapping(uint256 => OnChainOrder) public orders;

    // Trader active open interest tracking (symbol => trader => total open shares)
    mapping(string => mapping(address => uint256)) public traderOpenShares;

    // Reference mark price per symbol (micro-USD)
    mapping(string => uint256) public referenceMarkPrices;

    // Order books per symbol
    mapping(string => uint256[]) public activeBuyOrderIds;
    mapping(string => uint256[]) public activeSellOrderIds;

    // Events
    event OrderPlaced(
        uint256 indexed orderId,
        address indexed trader,
        string indexed symbol,
        OrderSide side,
        uint256 priceMicros,
        uint256 quantityShares,
        bytes32 clientOrderId
    );

    event OrderFilled(
        uint256 indexed buyOrderId,
        uint256 indexed sellOrderId,
        string indexed symbol,
        uint256 matchPriceMicros,
        uint256 matchShares,
        uint64 timestamp
    );

    event OrderCancelled(uint256 indexed orderId, address indexed trader, string reason);
    event PreTradeGateRejected(address indexed trader, string indexed symbol, string reason);
    event ComplianceHookUpdated(address indexed newHook);
    event ReferenceMarkPriceUpdated(string indexed symbol, uint256 newPriceMicros);

    error ErrOnlyOwner();
    error ErrPreTradeComplianceFailed(string reason);
    error ErrSelfTradePrevention();
    error ErrOrderNotFound();
    error ErrNotOrderOwner();
    error ErrOrderNotActive();

    modifier onlyOwner() {
        if (msg.sender != owner) revert ErrOnlyOwner();
        _;
    }

    constructor(address _complianceHook) {
        owner = msg.sender;
        complianceHook = IPreTradeComplianceHook(_complianceHook);

        // Seed initial benchmark reference prices
        referenceMarkPrices["TW-EQ"] = 52_500_000;  // $52.50
        referenceMarkPrices["TREE3"] = 125_000_000; // $125.00
        referenceMarkPrices["SPX-EQ"] = 210_000_000;// $210.00
    }

    function setComplianceHook(address _newHook) external onlyOwner {
        complianceHook = IPreTradeComplianceHook(_newHook);
        emit ComplianceHookUpdated(_newHook);
    }

    function setReferenceMarkPrice(string calldata symbol, uint256 priceMicros) external onlyOwner {
        referenceMarkPrices[symbol] = priceMicros;
        emit ReferenceMarkPriceUpdated(symbol, priceMicros);
    }

    /**
     * @notice Place order with pre-execution compliance interception
     */
    function placeOrder(
        string calldata symbol,
        OrderSide side,
        uint256 priceMicros,
        uint256 quantityShares,
        bytes32 clientOrderId
    ) external returns (uint256 orderId) {
        address trader = msg.sender;
        uint256 currentOpen = traderOpenShares[symbol][trader];
        uint256 refPrice = referenceMarkPrices[symbol];

        // --- PRE-TRADE COMPLIANCE GATE INTERCEPTION ---
        (bool approved, string memory reason) = complianceHook.validateOrderPlacement(
            trader,
            symbol,
            side == OrderSide.BUY,
            priceMicros,
            quantityShares,
            refPrice,
            currentOpen
        );

        if (!approved) {
            emit PreTradeGateRejected(trader, symbol, reason);
            revert ErrPreTradeComplianceFailed(reason);
        }

        // --- SELF-TRADE / WASH TRADING PREVENTION ---
        _preventSelfMatch(trader, symbol, side, priceMicros);

        orderId = nextOrderId++;
        orders[orderId] = OnChainOrder({
            orderId: orderId,
            trader: trader,
            symbol: symbol,
            side: side,
            priceMicros: priceMicros,
            quantityShares: quantityShares,
            filledShares: 0,
            timestamp: uint64(block.timestamp),
            status: OrderStatus.ACTIVE,
            clientOrderId: clientOrderId
        });

        traderOpenShares[symbol][trader] += quantityShares;

        if (side == OrderSide.BUY) {
            activeBuyOrderIds[symbol].push(orderId);
        } else {
            activeSellOrderIds[symbol].push(orderId);
        }

        emit OrderPlaced(orderId, trader, symbol, side, priceMicros, quantityShares, clientOrderId);

        // Run sub-second matching pass
        _matchOrders(symbol);
    }

    /**
     * @notice Prevents wash-trading by verifying trader has no opposing order at crossing price
     */
    function _preventSelfMatch(address trader, string calldata symbol, OrderSide side, uint256 priceMicros) internal view {
        if (side == OrderSide.BUY) {
            uint256[] storage asks = activeSellOrderIds[symbol];
            for (uint256 i = 0; i < asks.length; i++) {
                OnChainOrder memory ask = orders[asks[i]];
                if (ask.status == OrderStatus.ACTIVE && ask.trader == trader && ask.priceMicros <= priceMicros) {
                    revert ErrSelfTradePrevention();
                }
            }
        } else {
            uint256[] storage bids = activeBuyOrderIds[symbol];
            for (uint256 i = 0; i < bids.length; i++) {
                OnChainOrder memory bid = orders[bids[i]];
                if (bid.status == OrderStatus.ACTIVE && bid.trader == trader && bid.priceMicros >= priceMicros) {
                    revert ErrSelfTradePrevention();
                }
            }
        }
    }

    /**
     * @notice Sub-second price-time priority match logic
     */
    function _matchOrders(string calldata symbol) internal {
        uint256[] storage bids = activeBuyOrderIds[symbol];
        uint256[] storage asks = activeSellOrderIds[symbol];

        for (uint256 bIdx = 0; bIdx < bids.length; bIdx++) {
            uint256 bId = bids[bIdx];
            OnChainOrder storage buyOrder = orders[bId];
            if (buyOrder.status != OrderStatus.ACTIVE) continue;

            for (uint256 aIdx = 0; aIdx < asks.length; aIdx++) {
                uint256 aId = asks[aIdx];
                OnChainOrder storage sellOrder = orders[aId];
                if (sellOrder.status != OrderStatus.ACTIVE) continue;

                // Match condition: Bid Price >= Ask Price
                if (buyOrder.priceMicros >= sellOrder.priceMicros) {
                    uint256 remainingBuy = buyOrder.quantityShares - buyOrder.filledShares;
                    uint256 remainingSell = sellOrder.quantityShares - sellOrder.filledShares;
                    uint256 matchShares = remainingBuy < remainingSell ? remainingBuy : remainingSell;
                    uint256 matchPrice = sellOrder.priceMicros; // Price-time: resting ask sets execution price

                    buyOrder.filledShares += matchShares;
                    sellOrder.filledShares += matchShares;

                    traderOpenShares[symbol][buyOrder.trader] -= matchShares;
                    traderOpenShares[symbol][sellOrder.trader] -= matchShares;

                    if (buyOrder.filledShares >= buyOrder.quantityShares) {
                        buyOrder.status = OrderStatus.FILLED;
                    }
                    if (sellOrder.filledShares >= sellOrder.quantityShares) {
                        sellOrder.status = OrderStatus.FILLED;
                    }

                    emit OrderFilled(buyOrder.orderId, sellOrder.orderId, symbol, matchPrice, matchShares, uint64(block.timestamp));

                    if (buyOrder.status == OrderStatus.FILLED) break;
                }
            }
        }
    }

    function cancelOrder(uint256 orderId, string calldata reason) external {
        OnChainOrder storage order = orders[orderId];
        if (order.trader == address(0)) revert ErrOrderNotFound();
        if (order.trader != msg.sender && msg.sender != owner) revert ErrNotOrderOwner();
        if (order.status != OrderStatus.ACTIVE) revert ErrOrderNotActive();

        order.status = OrderStatus.CANCELLED;
        uint256 unfilled = order.quantityShares - order.filledShares;
        if (unfilled > 0 && traderOpenShares[order.symbol][order.trader] >= unfilled) {
            traderOpenShares[order.symbol][order.trader] -= unfilled;
        }

        emit OrderCancelled(orderId, order.trader, reason);
    }
}
