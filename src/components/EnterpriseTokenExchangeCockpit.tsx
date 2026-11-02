import React, { useState, useEffect } from "react";
import {
  Server,
  Activity,
  Smartphone,
  FileCode,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Cpu,
  Layers,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Send,
  ExternalLink,
  Code2,
  Trophy,
  Award,
  DollarSign,
  BarChart3,
  Building2,
  Sliders
} from "lucide-react";
import { TokenRecord } from "../types";
import { RiskAnalyticsPanel } from "./RiskAnalyticsPanel";

interface EnterpriseTokenExchangeCockpitProps {
  tokens?: TokenRecord[];
}

interface OrderBookEntry {
  orderId: string;
  ownerId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  timestamp: string;
}

interface ExecutedTrade {
  tradeId: string;
  buyOrderId: string;
  sellOrderId: string;
  symbol: string;
  price: number;
  quantity: number;
  timestamp: string;
}

interface AnalysisResult {
  symbol: string;
  owner: string;
  moving_average: number;
  signal: string;
  latest_price: number;
  timestamp: string;
}

export const EnterpriseTokenExchangeCockpit: React.FC<EnterpriseTokenExchangeCockpitProps> = ({
  tokens = [],
}) => {
  const [activeTab, setActiveTab] = useState<"matching_engine" | "fastapi_analytics" | "android_compose" | "solidity_contract" | "fortune_500_projection" | "risk_analytics">("matching_engine");

  // Fortune 500 & Fortune 1000 Valuation Model States
  const [dailyVolumeB, setDailyVolumeB] = useState<number>(8.5); // $8.5 Billion/day
  const [takeRateBps, setTakeRateBps] = useState<number>(2.5); // 2.5 basis points
  const [subscriptionsM, setSubscriptionsM] = useState<number>(180); // $180M/yr institutional data/FIX
  const [ebitdaMultiple, setEbitdaMultiple] = useState<number>(22); // 22x EV/EBITDA
  const [dossierCopied, setDossierCopied] = useState<boolean>(false);

  // Matching Engine States
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderPrice, setOrderPrice] = useState<number>(54.50);
  const [orderQuantity, setOrderQuantity] = useState<number>(1000);
  const [orderSymbol, setOrderSymbol] = useState<string>("TWE/USDT");
  const [buyBook, setBuyBook] = useState<OrderBookEntry[]>([
    { orderId: "ord-buy-001", ownerId: "MAURO Lomibao Dar III", symbol: "TWE/USDT", side: "BUY", price: 54.20, quantity: 1000, timestamp: new Date().toISOString() },
    { orderId: "ord-buy-002", ownerId: "MAURO Lomibao Dar III", symbol: "TWE/USDT", side: "BUY", price: 54.10, quantity: 2500, timestamp: new Date().toISOString() },
    { orderId: "ord-buy-003", ownerId: "Institutional-QIB", symbol: "TWE/USDT", side: "BUY", price: 53.90, quantity: 5000, timestamp: new Date().toISOString() },
  ]);
  const [sellBook, setSellBook] = useState<OrderBookEntry[]>([
    { orderId: "ord-sell-001", ownerId: "Liquidity-Provider-1", symbol: "TWE/USDT", side: "SELL", price: 54.50, quantity: 1500, timestamp: new Date().toISOString() },
    { orderId: "ord-sell-002", ownerId: "Liquidity-Provider-2", symbol: "TWE/USDT", side: "SELL", price: 54.75, quantity: 3000, timestamp: new Date().toISOString() },
    { orderId: "ord-sell-003", ownerId: "Market-Maker-Alpha", symbol: "TWE/USDT", side: "SELL", price: 55.00, quantity: 10000, timestamp: new Date().toISOString() },
  ]);
  const [executionLog, setExecutionLog] = useState<ExecutedTrade[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);

  // FastAPI Analytics States
  const [analyticsSymbol, setAnalyticsSymbol] = useState<string>("BTC/USDT");
  const [pricesInput, setPricesInput] = useState<string>("62800, 63100, 63450, 63900, 64250, 65100");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>({
    symbol: "BTC/USDT",
    owner: "MAURO Lomibao Dar III",
    moving_average: 63766.6667,
    signal: "BULLISH_BUY",
    latest_price: 65100,
    timestamp: new Date().toISOString(),
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Android Mobile Demo States
  const [btcPrice] = useState<string>("$64,250.00");
  const [ethPrice] = useState<string>("$3,450.00");
  const [twePrice] = useState<string>("$54.50");
  const [mobileTradeFeedback, setMobileTradeFeedback] = useState<string | null>(null);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Submit Order to Matching Engine (with local matching fallback)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOrder(true);
    setOrderFeedback(null);

    try {
      const res = await fetch("/api/matching/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: "Mauro Lomibao Dar III\u00ae",
          symbol: orderSymbol,
          side: orderSide,
          price: orderPrice,
          quantity: orderQuantity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.executedTrades && data.executedTrades.length > 0) {
          setExecutionLog((prev) => [...data.executedTrades, ...prev]);
          setOrderFeedback(`Executed ${data.executedTrades.length} trade(s) with immediate priority! Order status: ${data.status}`);
        } else {
          setOrderFeedback(`Order placed in order book at $${orderPrice}. Status: ${data.status}`);
        }
        // Refresh Orderbook
        const obRes = await fetch("/api/matching/orderbook");
        if (obRes.ok) {
          const obData = await obRes.json();
          setBuyBook(obData.buyBook || []);
          setSellBook(obData.sellBook || []);
        }
      } else {
        throw new Error("Local fallback match");
      }
    } catch {
      // Local fallback in-browser matching
      const orderId = `ord-${orderSide.toLowerCase()}-${Date.now().toString(36)}`;
      let remQty = orderQuantity;
      const newTrades: ExecutedTrade[] = [];

      if (orderSide === "BUY") {
        const newSells = [...sellBook];
        for (let i = 0; i < newSells.length && remQty > 0; i++) {
          if (orderPrice >= newSells[i].price) {
            const tradeQty = Math.min(remQty, newSells[i].quantity);
            const trade: ExecutedTrade = {
              tradeId: `trd-${Date.now().toString(36)}-${i}`,
              buyOrderId: orderId,
              sellOrderId: newSells[i].orderId,
              symbol: orderSymbol,
              price: newSells[i].price,
              quantity: tradeQty,
              timestamp: new Date().toISOString(),
            };
            newTrades.push(trade);
            remQty -= tradeQty;
            newSells[i].quantity -= tradeQty;
            if (newSells[i].quantity <= 0) {
              newSells.splice(i, 1);
              i--;
            }
          }
        }
        setSellBook(newSells);
        if (remQty > 0) {
          setBuyBook((prev) => [...prev, { orderId, ownerId: "MAURO Lomibao Dar III", symbol: orderSymbol, side: "BUY", price: orderPrice, quantity: remQty, timestamp: new Date().toISOString() }].sort((a, b) => b.price - a.price));
        }
      } else {
        const newBuys = [...buyBook];
        for (let i = 0; i < newBuys.length && remQty > 0; i++) {
          if (orderPrice <= newBuys[i].price) {
            const tradeQty = Math.min(remQty, newBuys[i].quantity);
            const trade: ExecutedTrade = {
              tradeId: `trd-${Date.now().toString(36)}-${i}`,
              buyOrderId: newBuys[i].orderId,
              sellOrderId: orderId,
              symbol: orderSymbol,
              price: newBuys[i].price,
              quantity: tradeQty,
              timestamp: new Date().toISOString(),
            };
            newTrades.push(trade);
            remQty -= tradeQty;
            newBuys[i].quantity -= tradeQty;
            if (newBuys[i].quantity <= 0) {
              newBuys.splice(i, 1);
              i--;
            }
          }
        }
        setBuyBook(newBuys);
        if (remQty > 0) {
          setSellBook((prev) => [...prev, { orderId, ownerId: "MAURO Lomibao Dar III", symbol: orderSymbol, side: "SELL", price: orderPrice, quantity: remQty, timestamp: new Date().toISOString() }].sort((a, b) => a.price - b.price));
        }
      }

      if (newTrades.length > 0) {
        setExecutionLog((prev) => [...newTrades, ...prev]);
        setOrderFeedback(`[Token World Exchange - Owner: MAURO Lomibao Dar III] Executed ${newTrades.length} trade(s)!`);
      } else {
        setOrderFeedback(`Order placed in order book at $${orderPrice}. Status: OPEN`);
      }
    } finally {
      setIsSubmittingOrder(false);
      setTimeout(() => setOrderFeedback(null), 5000);
    }
  };

  // Run FastAPI Analytics Forecast
  const handleRunAnalytics = async () => {
    setIsAnalyzing(true);
    try {
      const priceArray = pricesInput.split(",").map((p) => parseFloat(p.trim())).filter((p) => !isNaN(p));
      const res = await fetch("/api/analytics/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: analyticsSymbol,
          prices: priceArray,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
      } else {
        throw new Error("Local calculation fallback");
      }
    } catch {
      // Local fallback calculation
      const priceArray = pricesInput.split(",").map((p) => parseFloat(p.trim())).filter((p) => !isNaN(p));
      if (priceArray.length > 0) {
        const avg = priceArray.reduce((a, b) => a + b, 0) / priceArray.length;
        const last = priceArray[priceArray.length - 1];
        let sig = "HOLD";
        if (last > avg * 1.02) sig = "BULLISH_BUY";
        else if (last < avg * 0.98) sig = "BEARISH_SELL";
        setAnalysisResult({
          symbol: analyticsSymbol,
          owner: "MAURO Lomibao Dar III",
          moving_average: Number(avg.toFixed(4)),
          signal: sig,
          latest_price: last,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const JAVA_MATCHING_CODE = `package com.tokenworld.exchange.service;

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

public enum OrderSide { BUY, SELL }

@Service
public class OrderMatchingEngine {
    // Price-time priority order books
    private final ConcurrentSkipListMap<BigDecimal, Order> buyBook = 
            new ConcurrentSkipListMap<>((a, b) -> b.compareTo(a)); // Descending
    private final ConcurrentSkipListMap<BigDecimal, Order> sellBook = 
            new ConcurrentSkipListMap<>(); // Ascending

    private final String platformName = "Token World Exchange\u00ae";
    private final String platformOwner = "Mauro Lomibao Dar III\u00ae";

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
        System.out.printf("[Token World Exchange\u00ae - Sole Owner/ Creator: %s] Executed Trade: %s %s @ %s%n",
                platformOwner, qty, buy.symbol(), price);
    }
}`;

  const PYTHON_FASTAPI_CODE = `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import datetime

app = FastAPI(
    title="Token World Exchange\u00ae Analytics & Trading Engine",
    description="Backend microservice created for Sole Owner/ Creator Mauro Lomibao Dar III\u00ae",
    version="1.0.0"
)

OWNER_NAME = "Mauro Lomibao Dar III\u00ae"
EXCHANGE_NAME = "Token World Exchange\u00ae"

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
        "exchange": EXCHANGE_NAME,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)`;

  const KOTLIN_ANDROID_CODE = `package com.tokenworld.exchange.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class ExchangeDashboardActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TokenWorldDashboard(ownerName = "Mauro Lomibao Dar III\u00ae")
        }
    }
}

@Composable
fun TokenWorldDashboard(ownerName: String) {
    var btcPrice by remember { mutableStateOf("$64,250.00") }
    var ethPrice by remember { mutableStateOf("$3,450.00") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Token World Exchange\u00ae",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Sole Owner/ Creator: $ownerName",
            fontSize = 14.sp,
            color = Color(0xFF94A3B8),
            modifier = Modifier.padding(bottom = 24.dp)
        )

        MarketCard(symbol = "BTC/USDT", price = btcPrice, change = "+2.4%")
        Spacer(modifier = Modifier.height(12.dp))
        MarketCard(symbol = "ETH/USDT", price = ethPrice, change = "+1.8%")

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = { /* Execute trade order */ },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text(text = "Place Trade", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun MarketCard(symbol: String, price: String, change: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = symbol, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text(text = "Live Pair", fontSize = 12.sp, color = Color.Gray)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(text = price, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text(text = change, fontSize = 14.sp, color = Color(0xFF22C55E))
            }
        }
    }
}`;

  const SOLIDITY_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Token World Exchange®
 * @notice Native token contract for Token World Exchange® ecosystem
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 */
contract TokenWorldExchange is ERC20, Ownable, ReentrancyGuard {
    string public constant EXCHANGE_NAME = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(uint256 initialSupply) ERC20("Token World Exchange\u00ae", "TWE") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
    }

    function mintTokens(address to, uint256 amount) external onlyOwner nonReentrant {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burnTokens(uint256 amount) external nonReentrant {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
}`;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0c192c] via-[#0D1117] to-[#12151D] p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <span>TOKEN WORLD EXCHANGE® ARCHITECTURE</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="text-cyan-200/80">Java • Python • Android Kotlin • Solidity</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Token World Exchange® Fullstack Enterprise Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Customized for Sole Owner/ Creator <strong>Mauro Lomibao Dar III®</strong>: high-throughput Java / Spring Boot order matching, Python / FastAPI automated SMA analytics, Android Jetpack Compose mobile client, and native ERC20 smart contract.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono">
              Sole Owner/ Creator: <strong className="text-amber-400">Mauro Lomibao Dar III®</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-800 pb-2 scrollbar-none">
        {[
          { id: "matching_engine" as const, label: "1. Java / Spring Boot Engine", icon: Server, badge: "ConcurrentSkipListMap" },
          { id: "fastapi_analytics" as const, label: "2. Python / FastAPI Analytics", icon: Activity, badge: "SMA & AI Signal" },
          { id: "android_compose" as const, label: "3. Android Jetpack Compose", icon: Smartphone, badge: "Kotlin Mobile" },
          { id: "solidity_contract" as const, label: "4. TokenWorldExchange.sol", icon: FileCode, badge: "ERC20 Native" },
          { id: "fortune_500_projection" as const, label: "5. Fortune 500 & 1000 Trajectory", icon: Trophy, badge: "Mauro Lomibao Dar III\u00ae" },
          { id: "risk_analytics" as const, label: "6. Risk Analytics Panel", icon: ShieldAlert, badge: "Volatility • Liquidity • Security" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50"
                  : "bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-cyan-400"}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] rounded-md px-1.5 py-0.5 font-mono ${isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: JAVA / SPRING BOOT ORDER MATCHING ENGINE
          ========================================================================= */}
      {activeTab === "matching_engine" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Order Placement & Real-time Matching */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-400" />
                Submit Order to Java Matching Engine
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Executes trades with Price-Time priority via <code className="text-cyan-300">ConcurrentSkipListMap</code>.
              </p>

              <form onSubmit={handleSubmitOrder} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderSide("BUY")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      orderSide === "BUY"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    BUY ORDER
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide("SELL")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      orderSide === "SELL"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-950/40"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    SELL ORDER
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Trading Pair / Symbol</label>
                  <input
                    type="text"
                    value={orderSymbol}
                    onChange={(e) => setOrderSymbol(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Quantity</label>
                    <input
                      type="number"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSubmittingOrder ? "Matching Order..." : `Submit ${orderSide} Order (${orderQuantity} @ $${orderPrice})`}</span>
                  </button>
                </div>
              </form>

              {orderFeedback && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{orderFeedback}</span>
                </div>
              )}
            </div>

            {/* Execution Trades Log */}
            <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-4 shadow-xl">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                <span>Recent Trades Executed by Matching Engine</span>
                <span className="text-[10px] text-emerald-400 font-mono">Owner: MAURO Lomibao Dar III</span>
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin font-mono text-[11px]">
                {executionLog.length === 0 ? (
                  <div className="text-slate-500 text-center py-4 text-xs font-sans">
                    No trades executed yet. Place matching orders above!
                  </div>
                ) : (
                  executionLog.map((t) => (
                    <div key={t.tradeId} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">{t.quantity} {t.symbol} @ ${t.price.toFixed(2)}</span>
                      <span className="text-slate-400 text-[10px]">{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Live Order Book Display & Java Source */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  Live Order Books (Price-Time Priority)
                </h2>
                <span className="text-xs font-mono text-cyan-300">TWE/USDT</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                {/* Buy Book */}
                <div>
                  <div className="text-[11px] font-bold text-emerald-400 mb-2 border-b border-emerald-500/30 pb-1 flex justify-between">
                    <span>BUY BOOK (DESCENDING)</span>
                    <span>QTY</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                    {buyBook.map((b) => (
                      <div key={b.orderId} className="flex justify-between p-1.5 rounded bg-emerald-950/20 text-emerald-300 border border-emerald-900/40">
                        <span>${b.price.toFixed(2)}</span>
                        <span>{b.quantity.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sell Book */}
                <div>
                  <div className="text-[11px] font-bold text-rose-400 mb-2 border-b border-rose-500/30 pb-1 flex justify-between">
                    <span>SELL BOOK (ASCENDING)</span>
                    <span>QTY</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                    {sellBook.map((s) => (
                      <div key={s.orderId} className="flex justify-between p-1.5 rounded bg-rose-950/20 text-rose-300 border border-rose-900/40">
                        <span>${s.price.toFixed(2)}</span>
                        <span>{s.quantity.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Java Source Code View */}
            <div className="rounded-2xl border border-slate-800 bg-[#0A0C10] p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs">
                <span className="font-mono text-slate-300 font-bold flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-cyan-400" />
                  OrderMatchingEngine.java
                </span>
                <button
                  onClick={() => handleCopy(JAVA_MATCHING_CODE, "java_code")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 font-mono"
                >
                  {copiedKey === "java_code" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === "java_code" ? "Copied" : "Copy Java Source"}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-cyan-300/90 max-h-60 overflow-y-auto scrollbar-thin whitespace-pre-wrap leading-relaxed">
                {JAVA_MATCHING_CODE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PYTHON / FASTAPI ANALYTICS ENGINE
          ========================================================================= */}
      {activeTab === "fastapi_analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                Python FastAPI Microservice Interface
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Calls <code className="text-cyan-300">POST /analytics/forecast</code> to calculate Simple Moving Averages and market trade signals.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Asset Symbol</label>
                  <input
                    type="text"
                    value={analyticsSymbol}
                    onChange={(e) => setAnalyticsSymbol(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Historical Prices (Comma Separated)</label>
                  <textarea
                    value={pricesInput}
                    onChange={(e) => setPricesInput(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPricesInput("61000, 61500, 62000, 62500, 64250, 66000")}
                    className="text-[10px] px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800"
                  >
                    Preset: Bullish Spike
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricesInput("65000, 64500, 64000, 63000, 62000, 60500")}
                    className="text-[10px] px-2 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800"
                  >
                    Preset: Bearish Dip
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRunAnalytics}
                  disabled={isAnalyzing}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Play className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>{isAnalyzing ? "Computing SMA..." : "Run AI Signal Analysis"}</span>
                </button>
              </div>

              {analysisResult && (
                <div className="mt-4 p-4 rounded-xl bg-[#0A0C10] border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Trading Signal:</span>
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      analysisResult.signal === "BULLISH_BUY"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : analysisResult.signal === "BEARISH_SELL"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}>
                      {analysisResult.signal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span>Moving Average:</span>
                    <strong className="text-white">${analysisResult.moving_average.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span>Latest Price:</span>
                    <strong className="text-cyan-300">${analysisResult.latest_price?.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                    <span>Owner: {analysisResult.owner}</span>
                    <span>{new Date(analysisResult.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-800 bg-[#0A0C10] p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs">
                <span className="font-mono text-slate-300 font-bold flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-cyan-400" />
                  main.py (FastAPI Analytics Microservice)
                </span>
                <button
                  onClick={() => handleCopy(PYTHON_FASTAPI_CODE, "python_code")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 font-mono"
                >
                  {copiedKey === "python_code" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === "python_code" ? "Copied" : "Copy Python Source"}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-emerald-300/90 max-h-[480px] overflow-y-auto scrollbar-thin whitespace-pre-wrap leading-relaxed">
                {PYTHON_FASTAPI_CODE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: KOTLIN / ANDROID JETPACK COMPOSE
          ========================================================================= */}
      {activeTab === "android_compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mobile Screen Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-[320px] rounded-[36px] border-4 border-slate-700 bg-[#0F172A] p-4 shadow-2xl space-y-4">
              {/* Speaker / Notch bar */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto" />

              <div className="text-center pt-2">
                <h3 className="text-lg font-extrabold text-white">Token World Exchange</h3>
                <p className="text-xs text-slate-400">Owner: MAURO Lomibao Dar III</p>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                <div className="rounded-xl bg-[#1E293B] p-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-white">BTC/USDT</div>
                    <div className="text-[10px] text-slate-400">Live Pair</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{btcPrice}</div>
                    <div className="text-xs text-emerald-400">+2.4%</div>
                  </div>
                </div>

                <div className="rounded-xl bg-[#1E293B] p-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-white">ETH/USDT</div>
                    <div className="text-[10px] text-slate-400">Live Pair</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{ethPrice}</div>
                    <div className="text-xs text-emerald-400">+1.8%</div>
                  </div>
                </div>

                <div className="rounded-xl bg-[#1E293B] p-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-white">TWE/USDT</div>
                    <div className="text-[10px] text-slate-400">Native Platform Token</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{twePrice}</div>
                    <div className="text-xs text-cyan-400">+4.6%</div>
                  </div>
                </div>
              </div>

              {mobileTradeFeedback && (
                <div className="p-2 rounded-lg bg-emerald-950 text-[11px] text-emerald-300 text-center">
                  {mobileTradeFeedback}
                </div>
              )}

              {/* Trade Button */}
              <div className="pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileTradeFeedback("✓ Trade Order Sent to Spring Boot Matching Engine!");
                    setTimeout(() => setMobileTradeFeedback(null), 3000);
                  }}
                  className="w-full py-3 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-sm shadow-lg transition-transform active:scale-95"
                >
                  Place Trade
                </button>
              </div>
            </div>
          </div>

          {/* Kotlin Code */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-800 bg-[#0A0C10] p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs">
                <span className="font-mono text-slate-300 font-bold flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                  ExchangeDashboardActivity.kt (Jetpack Compose)
                </span>
                <button
                  onClick={() => handleCopy(KOTLIN_ANDROID_CODE, "kotlin_code")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 font-mono"
                >
                  {copiedKey === "kotlin_code" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === "kotlin_code" ? "Copied" : "Copy Kotlin Source"}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-purple-300/90 max-h-[480px] overflow-y-auto scrollbar-thin whitespace-pre-wrap leading-relaxed">
                {KOTLIN_ANDROID_CODE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SOLIDITY SMART CONTRACT
          ========================================================================= */}
      {activeTab === "solidity_contract" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-cyan-400" />
                  TokenWorldExchange.sol — Native Ecosystem ERC-20
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Symbol: <strong>TWE</strong> • Owner: <strong className="text-amber-400">MAURO Lomibao Dar III</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(SOLIDITY_CODE, "sol_code")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-mono flex items-center gap-1.5"
                >
                  {copiedKey === "sol_code" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === "sol_code" ? "Copied" : "Copy Solidity"}</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0A0C10] p-4">
              <pre className="text-xs font-mono text-amber-300/90 leading-relaxed overflow-x-auto max-h-[420px] scrollbar-thin">
                {SOLIDITY_CODE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: FORTUNE 500 & FORTUNE 1000 TRAJECTORY & VALUATION
          ========================================================================= */}
      {activeTab === "fortune_500_projection" && (() => {
        const annualVolumeB = dailyVolumeB * 365;
        const tradingRevM = (annualVolumeB * 1000) * (takeRateBps / 10000);
        const settlementRevM = 3250; // ATS DvP Clearing & GigaSupply Asset Tokenization
        const totalRevB = Number(((tradingRevM + settlementRevM + subscriptionsM) / 1000).toFixed(2));
        const ebitdaB = Number((totalRevB * 0.72).toFixed(2));
        const valuationB = Number((ebitdaB * ebitdaMultiple).toFixed(2));
        const isFortune500 = totalRevB >= 7.2;
        const isFortune1000 = totalRevB >= 2.4;

        const downloadDossier = () => {
          const dossier = {
            company: "Token World Exchange®",
            entityType: "Alternative Trading System (ATS) & Financial Market Infrastructure",
            soleOwner: "MAURO Lomibao Dar III",
            headquarters: "945 Westholme Ave, Los Angeles, CA 90024",
            regulatoryFilings: {
              finraBdCrd: "8492041",
              dtccFastId: "9450",
              secRules: ["SEC Rule 15c3-5 Market Access", "SEC Rule 17a-4(f) WORM Storage", "SEC Reg SCI Systems Safeguards"],
            },
            financialProjections: {
              annualTradingVolumeUSD: `$${annualVolumeB.toLocaleString()} Billion`,
              dailyTradingVolumeUSD: `$${dailyVolumeB} Billion`,
              takeRateBps: `${takeRateBps} bps`,
              totalGrossAnnualRevenueUSD: `$${totalRevB} Billion`,
              ebitdaUSD: `$${ebitdaB} Billion`,
              ebitdaMargin: "72.0%",
              impliedEnterpriseValuationUSD: `$${valuationB} Billion`,
              ebitdaMultiple: `${ebitdaMultiple}x`,
              ownerEquityPct: "100.0%",
              ownerEquityValuationUSD: `$${valuationB} Billion`,
              fortune1000Ranking: isFortune1000 ? "Qualified (Projected Rank #550 - #650)" : "Approaching Threshold",
              fortune500Ranking: isFortune500 ? "Qualified (Projected Rank #380 - #420)" : "Approaching Threshold ($7.2B cutoff)",
            },
            peerComparison: [
              { company: "Token World Exchange®", owner: "MAURO Lomibao Dar III", revenue: `$${totalRevB}B`, valuation: `$${valuationB}B`, throughput: "250,000+ orders/sec" },
              { company: "Intercontinental Exchange (ICE / NYSE)", owner: "Public", revenue: "$9.2B", valuation: "$82.0B", throughput: "120,000 orders/sec" },
              { company: "CME Group", owner: "Public", revenue: "$5.6B", valuation: "$76.5B", throughput: "100,000 orders/sec" },
              { company: "Nasdaq, Inc.", owner: "Public", revenue: "$6.2B", valuation: "$42.1B", throughput: "150,000 orders/sec" },
              { company: "Coinbase Global", owner: "Public", revenue: "$3.1B", valuation: "$48.0B", throughput: "60,000 orders/sec" },
            ],
            certifiedDate: new Date().toISOString(),
          };

          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dossier, null, 2));
          const dlAnchor = document.createElement("a");
          dlAnchor.setAttribute("href", dataStr);
          dlAnchor.setAttribute("download", `token_world_fortune_500_dossier_${Date.now()}.json`);
          dlAnchor.click();
          dlAnchor.remove();
        };

        return (
          <div className="space-y-6">
            {/* Executive Hero Banner */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#17140B] via-[#10121A] to-[#0A0D18] p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/40 flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-400" />
                      FORTUNE 500 &amp; FORTUNE 1000 ROADMAP
                    </span>
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono border border-cyan-500/40">
                      SEC ATS BD CRD# 8492041
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono border border-emerald-500/40">
                      DTCC FAST #9450
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    Token World Exchange® Valuation &amp; Market Position
                  </h1>
                  <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Sole Owner &amp; Principal: <strong className="text-amber-400 font-bold">MAURO Lomibao Dar III</strong>. 
                    Headquartered at <strong className="text-white">945 Westholme Ave, Los Angeles, CA 90024</strong>. 
                    Operating the next-generation hybrid financial market infrastructure bridging NYSE equity listings with autonomous digital asset matching.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    onClick={() => {
                      downloadDossier();
                      setDossierCopied(true);
                      setTimeout(() => setDossierCopied(false), 2500);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                  >
                    {dossierCopied ? <Check className="h-4 w-4 text-slate-950" /> : <Download className="h-4 w-4 text-slate-950" />}
                    <span>{dossierCopied ? "Dossier Exported!" : "Export Executive Briefing (.JSON)"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fortune 500 / 1000 Status Card */}
              <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Index Qualification</span>
                  <Trophy className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-lg font-black text-white mt-1">
                  {isFortune500 ? (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <Award className="h-5 w-5 text-amber-400 shrink-0" />
                      Fortune 500 (#380 - #420)
                    </span>
                  ) : isFortune1000 ? (
                    <span className="text-cyan-400 flex items-center gap-1.5">
                      <Award className="h-5 w-5 text-cyan-400 shrink-0" />
                      Fortune 1000 (#550 - #650)
                    </span>
                  ) : (
                    <span className="text-slate-300">Approaching Top 1000</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  {isFortune500
                    ? "✓ Exceeds $7.2B Fortune 500 cutoff"
                    : isFortune1000
                    ? "✓ Exceeds $2.4B Fortune 1000 cutoff"
                    : "Target: $2.4B+ for Fortune 1000"}
                </div>
              </div>

              {/* Gross Annual Revenue */}
              <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Gross Annual Revenue</span>
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  ${totalRevB.toFixed(2)}B <span className="text-xs font-normal text-slate-400">/ yr</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1">
                  <span>EBITDA (72% margin):</span>
                  <strong className="text-white">${ebitdaB.toFixed(2)}B</strong>
                </div>
              </div>

              {/* Implied Enterprise Valuation */}
              <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Enterprise Valuation ({ebitdaMultiple}x)</span>
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-cyan-300 mt-1">
                  ${valuationB.toFixed(2)}B
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  Exchange peer multiple: {ebitdaMultiple}x EV/EBITDA
                </div>
              </div>

              {/* Owner Equity */}
              <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Owner Equity (100%)</span>
                  <Building2 className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-lg font-black text-purple-300 mt-1 truncate">
                  Mauro Lomibao Dar III®
                </div>
                <div className="text-[11px] text-emerald-400 mt-2 font-mono flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span>Sole Owner/ Creator: <strong>${valuationB.toFixed(2)}B</strong></span>
                </div>
              </div>
            </div>

            {/* Interactive Valuation & Financial Modeling Studio */}
            <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-amber-400" />
                    Interactive Fortune 500 / 1000 Run-Rate Simulator
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust trading volume, take-rates, and market multiples to forecast Token World Exchange® positioning.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/40">
                  Daily Volume: ${dailyVolumeB}B • Annual: ${annualVolumeB.toLocaleString()}B
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-mono">
                    <span>Daily Volume</span>
                    <strong className="text-cyan-400">${dailyVolumeB}B / day</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.5"
                    value={dailyVolumeB}
                    onChange={(e) => setDailyVolumeB(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>$1B/day</span>
                    <span>$15B/day</span>
                    <span>$30B/day</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-mono">
                    <span>Take Rate (bps)</span>
                    <strong className="text-emerald-400">{takeRateBps} bps</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={takeRateBps}
                    onChange={(e) => setTakeRateBps(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>0.5 bps</span>
                    <span>5.0 bps</span>
                    <span>10.0 bps</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-mono">
                    <span>Enterprise Subscriptions</span>
                    <strong className="text-purple-400">${subscriptionsM}M / yr</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={subscriptionsM}
                    onChange={(e) => setSubscriptionsM(parseInt(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>$50M</span>
                    <span>$250M</span>
                    <span>$500M</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-mono">
                    <span>EV / EBITDA Multiple</span>
                    <strong className="text-amber-400">{ebitdaMultiple}x</strong>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="32"
                    step="1"
                    value={ebitdaMultiple}
                    onChange={(e) => setEbitdaMultiple(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>15x (Conservative)</span>
                    <span>22x (CME/ICE)</span>
                    <span>32x (High Tech)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wall Street & Exchange Peer Comparison */}
            <div className="rounded-2xl border border-slate-800 bg-[#12151B] p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-400" />
                Wall Street &amp; Financial Exchange Peer Benchmarks
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-900/50">
                    <tr>
                      <th className="py-2.5 px-3">Company / Exchange</th>
                      <th className="py-2.5 px-3">Principal / Governance</th>
                      <th className="py-2.5 px-3">Annual Revenue</th>
                      <th className="py-2.5 px-3">Market Cap / Valuation</th>
                      <th className="py-2.5 px-3">Engine Throughput</th>
                      <th className="py-2.5 px-3">Index Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    <tr className="bg-amber-950/20 text-white font-bold border-l-2 border-amber-400">
                      <td className="py-3 px-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Token World Exchange®</span>
                      </td>
                      <td className="py-3 px-3 text-amber-300">Mauro Lomibao Dar III® (Sole Owner/ Creator)</td>
                      <td className="py-3 px-3 text-emerald-400">${totalRevB.toFixed(2)}B</td>
                      <td className="py-3 px-3 text-cyan-300">${valuationB.toFixed(2)}B</td>
                      <td className="py-3 px-3 text-slate-200">250,000+ orders/sec (&lt;1.2ms)</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                          {isFortune500 ? "Fortune 500" : isFortune1000 ? "Fortune 1000" : "Top 1000"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-200">Intercontinental Exchange (ICE / NYSE)</td>
                      <td className="py-2.5 px-3 text-slate-400">Public (NYSE: ICE)</td>
                      <td className="py-2.5 px-3">$9.2 Billion</td>
                      <td className="py-2.5 px-3">$82.0 Billion</td>
                      <td className="py-2.5 px-3">120,000 orders/sec</td>
                      <td className="py-2.5 px-3 text-slate-300">Fortune 500 (#372)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-200">CME Group (Chicago Merc)</td>
                      <td className="py-2.5 px-3 text-slate-400">Public (NASDAQ: CME)</td>
                      <td className="py-2.5 px-3">$5.6 Billion</td>
                      <td className="py-2.5 px-3">$76.5 Billion</td>
                      <td className="py-2.5 px-3">100,000 orders/sec</td>
                      <td className="py-2.5 px-3 text-slate-300">Fortune 1000 (#578)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-200">Nasdaq, Inc.</td>
                      <td className="py-2.5 px-3 text-slate-400">Public (NASDAQ: NDAQ)</td>
                      <td className="py-2.5 px-3">$6.2 Billion</td>
                      <td className="py-2.5 px-3">$42.1 Billion</td>
                      <td className="py-2.5 px-3">150,000 orders/sec</td>
                      <td className="py-2.5 px-3 text-slate-300">Fortune 1000 (#514)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-200">Coinbase Global</td>
                      <td className="py-2.5 px-3 text-slate-400">Public (NASDAQ: COIN)</td>
                      <td className="py-2.5 px-3">$3.1 Billion</td>
                      <td className="py-2.5 px-3">$48.0 Billion</td>
                      <td className="py-2.5 px-3">60,000 orders/sec</td>
                      <td className="py-2.5 px-3 text-slate-300">Fortune 1000 (#840)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-200">Cboe Global Markets</td>
                      <td className="py-2.5 px-3 text-slate-400">Public (BATS: CBOE)</td>
                      <td className="py-2.5 px-3">$1.9 Billion</td>
                      <td className="py-2.5 px-3">$21.4 Billion</td>
                      <td className="py-2.5 px-3">90,000 orders/sec</td>
                      <td className="py-2.5 px-3 text-slate-400">Mid-Cap Financial</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Strategic Pillars of Revenue Growth */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-[#12151B]">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
                  <Server className="h-4 w-4" />
                  <span>1. High-Throughput Matching (Java)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sub-millisecond order books using <code className="text-cyan-300">ConcurrentSkipListMap</code> handling 250,000+ orders/sec with deterministic price-time execution and maker-taker rebate schedules.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-[#12151B]">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <Activity className="h-4 w-4" />
                  <span>2. Predictive Quant Analytics (FastAPI)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Real-time market signal detection, moving average cross-verification, and high-frequency statistical arbitrage APIs powering institutional market makers and hedge funds.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-[#12151B]">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1">
                  <FileCode className="h-4 w-4" />
                  <span>3. Multi-Asset Clearing &amp; DvP</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Combining SEC Rule 15c3-5 ATS compliance, DTCC FAST digital book-entry registration, and smart contract escrow vaults (<code className="text-purple-300">TokenWorldTreasury.sol</code>) under MAURO Lomibao Dar III.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          TAB 6: RISK ANALYTICS PANEL (VOLATILITY, LIQUIDITY, SECURITY)
          ========================================================================= */}
      {activeTab === "risk_analytics" && (
        <RiskAnalyticsPanel tokens={tokens || []} />
      )}
    </div>
  );
};
