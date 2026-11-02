package com.tokenworld.exchange.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.ConcurrentSkipListMap;
import org.springframework.stereotype.Service;

public record Order(
    String orderId,
    String ownerId,
    String symbol,
    OrderSide side,
    BigDecimal price,
    BigDecimal quantity,
    Instant timestamp
) {}

enum OrderSide { BUY, SELL }

@Service
public class OrderMatchingEngine {
    // Price-time priority order books
    private final ConcurrentSkipListMap<BigDecimal, Order> buyBook = 
            new ConcurrentSkipListMap<>((a, b) -> b.compareTo(a)); // Descending
    private final ConcurrentSkipListMap<BigDecimal, Order> sellBook = 
            new ConcurrentSkipListMap<>(); // Ascending

    private final String platformOwner = "MAURO Lomibao Dar III";

    public synchronized void submitOrder(Order order) {
        if (order.side() == OrderSide.BUY) {
            matchBuyOrder(order);
        } else {
            matchSellOrder(order);
        }
    }

    private void matchBuyOrder(Order buyOrder) {
        var iterator = sellBook.entrySet().iterator();
        BigDecimal remainingQty = buyOrder.quantity();

        while (iterator.hasNext() && remainingQty.compareTo(BigDecimal.ZERO) > 0) {
            var entry = iterator.next();
            BigDecimal bestSellPrice = entry.getKey();
            Order sellOrder = entry.getValue();

            if (buyOrder.price().compareTo(bestSellPrice) >= 0) {
                BigDecimal tradeQty = remainingQty.min(sellOrder.quantity());
                executeTrade(buyOrder, sellOrder, bestSellPrice, tradeQty);

                remainingQty = remainingQty.subtract(tradeQty);
                if (tradeQty.compareTo(sellOrder.quantity()) == 0) {
                    iterator.remove();
                }
            } else {
                break;
            }
        }

        if (remainingQty.compareTo(BigDecimal.ZERO) > 0) {
            buyBook.put(buyOrder.price(), new Order(
                buyOrder.orderId(), buyOrder.ownerId(), buyOrder.symbol(),
                OrderSide.BUY, buyOrder.price(), remainingQty, buyOrder.timestamp()
            ));
        }
    }

    private void matchSellOrder(Order sellOrder) {
        var iterator = buyBook.entrySet().iterator();
        BigDecimal remainingQty = sellOrder.quantity();

        while (iterator.hasNext() && remainingQty.compareTo(BigDecimal.ZERO) > 0) {
            var entry = iterator.next();
            BigDecimal bestBuyPrice = entry.getKey();
            Order buyOrder = entry.getValue();

            if (sellOrder.price().compareTo(bestBuyPrice) <= 0) {
                BigDecimal tradeQty = remainingQty.min(buyOrder.quantity());
                executeTrade(buyOrder, sellOrder, bestBuyPrice, tradeQty);

                remainingQty = remainingQty.subtract(tradeQty);
                if (tradeQty.compareTo(buyOrder.quantity()) == 0) {
                    iterator.remove();
                }
            } else {
                break;
            }
        }

        if (remainingQty.compareTo(BigDecimal.ZERO) > 0) {
            sellBook.put(sellOrder.price(), new Order(
                sellOrder.orderId(), sellOrder.ownerId(), sellOrder.symbol(),
                OrderSide.SELL, sellOrder.price(), remainingQty, sellOrder.timestamp()
            ));
        }
    }

    private void executeTrade(Order buy, Order sell, BigDecimal price, BigDecimal qty) {
        System.out.printf("[Token World Exchange - Owner: %s] Executed Trade: %s %s @ %s%n",
                platformOwner, qty, buy.symbol(), price);
    }
}
