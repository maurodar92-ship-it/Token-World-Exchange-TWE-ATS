/**
 * Token World Exchange (TWE) ATS®
 * Centralized SEC Rule 15c3-5 Pre-Trade Risk Engine & Compliance Collars
 * 
 * Regulates pre-order validation, algorithmic circuit breakers, price collar bands (NBBO deviation),
 * maximum single order size & notional caps, participant credit thresholds, and automated Trading Halts.
 * 
 * Sole Owner/ Creator: Mauro Lomibao Dar III®
 */

export interface ComplianceRiskConfig {
  priceCollarBandPercent: number; // e.g. 5 = ±5% from Moving Average price window
  movingAverageWindowSize: number; // e.g. 10 = rolling 10-trade moving average price window
  autoHaltOnCollarBreach: boolean; // true = automatically trip circuit breaker on collar breach
  maxSingleOrderSizeShares: number; // e.g. 100,000 shares/tokens
  maxSingleOrderNotionalUsd: number; // e.g. $1,000,000 USD
  maxCumulativeParticipantCreditUsd: number; // e.g. $10,000,000 USD
  maxOrderRatePerSec: number; // e.g. 25 orders/sec
  circuitBreakerThresholdPct: number; // e.g. 5%
  cancelOnDisconnect: boolean;
  shortSaleLocateActive: boolean;
  fatFingerMultiplier: number; // e.g. 3x normal average
}

export type BreachType =
  | "PRICE_COLLAR_DEVIATION"
  | "MAX_ORDER_SIZE_SHARES"
  | "MAX_ORDER_NOTIONAL_USD"
  | "CREDIT_THRESHOLD_EXCEEDED"
  | "RATE_THROTTLE_EXCEEDED"
  | "FAT_FINGER_ANOMALY";

export interface CollarBreachRecord {
  id: string;
  timestamp: number;
  symbol: string;
  orderSide: "BUY" | "SELL";
  price: number;
  quantity: number;
  notionalUsd: number;
  referencePrice: number;
  priceDeviationPercent: number;
  traderAddress: string;
  breachType: BreachType;
  severity: "CRITICAL" | "HIGH" | "WARNING";
  actionTaken: "ORDER_REJECTED" | "TRADING_HALTED" | "FLAGGED_FOR_SUPERVISOR";
  reason: string;
  disposition: "ACTIVE_HALT" | "ACKNOWLEDGED" | "OVERRIDDEN" | "RESOLVED";
}

export interface HaltStateInfo {
  isHalted: boolean;
  haltTimestamp: number | null;
  haltReason: string | null;
  triggeringBreach: CollarBreachRecord | null;
  haltDurationSec: number;
  haltCode: string | null;
}

export interface OrderEvaluationResult {
  compliant: boolean;
  breach: CollarBreachRecord | null;
  willTriggerHalt: boolean;
  priceDeviationPct: number;
  notionalUsd: number;
  collarBounds: {
    lowerCollar: number;
    upperCollar: number;
    referencePrice: number;
  };
  explanation: string;
}

const DEFAULT_CONFIG: ComplianceRiskConfig = {
  priceCollarBandPercent: 5, // Strict SEC Rule 15c3-5 ±5% Moving Average Collar Band
  movingAverageWindowSize: 10, // Rolling 10-trade moving average price window
  autoHaltOnCollarBreach: true, // Automatically halts trading venue upon exceeding ±5% collar
  maxSingleOrderSizeShares: 100000,
  maxSingleOrderNotionalUsd: 1000000,
  maxCumulativeParticipantCreditUsd: 10000000,
  maxOrderRatePerSec: 25,
  circuitBreakerThresholdPct: 5,
  cancelOnDisconnect: true,
  shortSaleLocateActive: true,
  fatFingerMultiplier: 3.5,
};

type Listener = () => void;

class SecRule15c35RiskEngine {
  private config: ComplianceRiskConfig = { ...DEFAULT_CONFIG };
  private haltState: HaltStateInfo = {
    isHalted: false,
    haltTimestamp: null,
    haltReason: null,
    triggeringBreach: null,
    haltDurationSec: 0,
    haltCode: null,
  };
  private breachHistory: CollarBreachRecord[] = [
    {
      id: "BREACH-15C3-01",
      timestamp: Date.now() - 1000 * 60 * 22,
      symbol: "TW-EQ",
      orderSide: "BUY",
      price: 74.50,
      quantity: 25000,
      notionalUsd: 1862500,
      referencePrice: 52.50,
      priceDeviationPercent: 41.9,
      traderAddress: "0x44BcA912c98F9082A81B0941F480414B60Ef110C",
      breachType: "PRICE_COLLAR_DEVIATION",
      severity: "CRITICAL",
      actionTaken: "ORDER_REJECTED",
      reason: "SEC 15c3-5 Price Collar Exceeded: Submitted $74.50 exceeds +10.0% collar band (Upper collar: $57.75, NBBO: $52.50).",
      disposition: "RESOLVED",
    },
    {
      id: "BREACH-15C3-02",
      timestamp: Date.now() - 1000 * 60 * 75,
      symbol: "TREE3",
      orderSide: "SELL",
      price: 125.00,
      quantity: 120000,
      notionalUsd: 15000000,
      referencePrice: 125.00,
      priceDeviationPercent: 0,
      traderAddress: "0x891a27eE242b109F20B271A6992dC8817282bAc6",
      breachType: "MAX_ORDER_NOTIONAL_USD",
      severity: "CRITICAL",
      actionTaken: "ORDER_REJECTED",
      reason: "SEC 15c3-5 Max Notional Cap Exceeded: Ticket value $15,000,000 USD breaches hard cap of $1,000,000 USD.",
      disposition: "RESOLVED",
    },
  ];

  private listeners: Set<Listener> = new Set();
  private haltTimer: any = null;

  constructor() {
    this.startHaltDurationTracker();
  }

  private startHaltDurationTracker() {
    if (typeof window !== "undefined") {
      setInterval(() => {
        if (this.haltState.isHalted && this.haltState.haltTimestamp) {
          const duration = Math.floor((Date.now() - this.haltState.haltTimestamp) / 1000);
          this.haltState.haltDurationSec = duration;
          this.notify();
        }
      }, 1000);
    }
  }

  public getConfig(): ComplianceRiskConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<ComplianceRiskConfig>): ComplianceRiskConfig {
    this.config = { ...this.config, ...partial };
    this.notify();
    return this.getConfig();
  }

  public getHaltState(): HaltStateInfo {
    return { ...this.haltState };
  }

  public getBreachHistory(): CollarBreachRecord[] {
    return [...this.breachHistory];
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error("Compliance risk listener error:", err);
      }
    });
  }

  /**
   * Pre-trade validation of an incoming order against SEC Rule 15c3-5 compliance collars
   */
  public evaluateOrder(params: {
    symbol: string;
    side: "BUY" | "SELL";
    price: number;
    quantity: number;
    referencePrice: number;
    traderAddress?: string;
    currentCumulativeCreditUsd?: number;
  }): OrderEvaluationResult {
    const {
      symbol,
      side,
      price,
      quantity,
      referencePrice,
      traderAddress = "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
      currentCumulativeCreditUsd = 0,
    } = params;

    const notionalUsd = price * quantity;
    const ref = referencePrice > 0 ? referencePrice : price;
    const collarBand = this.config.priceCollarBandPercent;

    const lowerCollar = Number((ref * (1 - collarBand / 100)).toFixed(ref < 1 ? 4 : 2));
    const upperCollar = Number((ref * (1 + collarBand / 100)).toFixed(ref < 1 ? 4 : 2));

    const priceDeviationPct = Math.abs((price - ref) / ref) * 100;

    const collarBounds = {
      lowerCollar,
      upperCollar,
      referencePrice: ref,
    };

    // 1. Price Collar Evaluation vs Moving Average Price Window (±5% threshold)
    if (price < lowerCollar || price > upperCollar) {
      const devFormatted = priceDeviationPct.toFixed(2);
      const willHalt = this.config.autoHaltOnCollarBreach || priceDeviationPct >= this.config.circuitBreakerThresholdPct;
      const breach: CollarBreachRecord = {
        id: `BREACH-${Date.now().toString().slice(-6)}`,
        timestamp: Date.now(),
        symbol,
        orderSide: side,
        price,
        quantity,
        notionalUsd,
        referencePrice: ref,
        priceDeviationPercent: priceDeviationPct,
        traderAddress,
        breachType: "PRICE_COLLAR_DEVIATION",
        severity: "CRITICAL",
        actionTaken: willHalt ? "TRADING_HALTED" : "ORDER_REJECTED",
        reason: `SEC Rule 15c3-5 Price Collar Breach: Order price $${price.toFixed(2)} deviates ${devFormatted}% from Moving Average price window ($${ref.toFixed(2)}), exceeding the ±${collarBand}% collar threshold [${lowerCollar} - ${upperCollar}]. Automated market freeze initiated.`,
        disposition: willHalt ? "ACTIVE_HALT" : "RESOLVED",
      };

      return {
        compliant: false,
        breach,
        willTriggerHalt: willHalt,
        priceDeviationPct,
        notionalUsd,
        collarBounds,
        explanation: breach.reason,
      };
    }

    // 2. Maximum Single Order Size (Shares / Units)
    if (quantity > this.config.maxSingleOrderSizeShares) {
      const breach: CollarBreachRecord = {
        id: `BREACH-${Date.now().toString().slice(-6)}`,
        timestamp: Date.now(),
        symbol,
        orderSide: side,
        price,
        quantity,
        notionalUsd,
        referencePrice: ref,
        priceDeviationPercent: priceDeviationPct,
        traderAddress,
        breachType: "MAX_ORDER_SIZE_SHARES",
        severity: "HIGH",
        actionTaken: "ORDER_REJECTED",
        reason: `Max Order Size Exceeded: Quantity ${quantity.toLocaleString()} exceeds hard cap of ${this.config.maxSingleOrderSizeShares.toLocaleString()} shares.`,
        disposition: "RESOLVED",
      };

      return {
        compliant: false,
        breach,
        willTriggerHalt: false,
        priceDeviationPct,
        notionalUsd,
        collarBounds,
        explanation: breach.reason,
      };
    }

    // 3. Maximum Single Order Notional USD
    if (notionalUsd > this.config.maxSingleOrderNotionalUsd) {
      const isExtreme = notionalUsd >= this.config.maxSingleOrderNotionalUsd * 2.5;
      const breach: CollarBreachRecord = {
        id: `BREACH-${Date.now().toString().slice(-6)}`,
        timestamp: Date.now(),
        symbol,
        orderSide: side,
        price,
        quantity,
        notionalUsd,
        referencePrice: ref,
        priceDeviationPercent: priceDeviationPct,
        traderAddress,
        breachType: "MAX_ORDER_NOTIONAL_USD",
        severity: isExtreme ? "CRITICAL" : "HIGH",
        actionTaken: isExtreme ? "TRADING_HALTED" : "ORDER_REJECTED",
        reason: `Max Notional USD Cap Exceeded: Ticket total $${notionalUsd.toLocaleString()} USD exceeds $${this.config.maxSingleOrderNotionalUsd.toLocaleString()} USD limit.`,
        disposition: isExtreme ? "ACTIVE_HALT" : "RESOLVED",
      };

      return {
        compliant: false,
        breach,
        willTriggerHalt: isExtreme,
        priceDeviationPct,
        notionalUsd,
        collarBounds,
        explanation: breach.reason,
      };
    }

    // 4. Participant Cumulative Credit Threshold
    if (currentCumulativeCreditUsd + notionalUsd > this.config.maxCumulativeParticipantCreditUsd) {
      const breach: CollarBreachRecord = {
        id: `BREACH-${Date.now().toString().slice(-6)}`,
        timestamp: Date.now(),
        symbol,
        orderSide: side,
        price,
        quantity,
        notionalUsd,
        referencePrice: ref,
        priceDeviationPercent: priceDeviationPct,
        traderAddress,
        breachType: "CREDIT_THRESHOLD_EXCEEDED",
        severity: "HIGH",
        actionTaken: "ORDER_REJECTED",
        reason: `Participant Credit Limit Exceeded: Order notional $${notionalUsd.toLocaleString()} pushes cumulative credit exposure over $${this.config.maxCumulativeParticipantCreditUsd.toLocaleString()} USD limit.`,
        disposition: "RESOLVED",
      };

      return {
        compliant: false,
        breach,
        willTriggerHalt: false,
        priceDeviationPct,
        notionalUsd,
        collarBounds,
        explanation: breach.reason,
      };
    }

    // Fully Compliant
    return {
      compliant: true,
      breach: null,
      willTriggerHalt: false,
      priceDeviationPct,
      notionalUsd,
      collarBounds,
      explanation: `SEC Rule 15c3-5 Compliant: Price is within ±${collarBand}% collar band ($${lowerCollar} - $${upperCollar}), and notional is under $${(this.config.maxSingleOrderNotionalUsd / 1e3).toLocaleString()}K.`,
    };
  }

  /**
   * Log an executed or attempted breach into the audit trail, and trigger Halt Trade if critical
   */
  public recordBreach(breach: CollarBreachRecord, triggerHalt: boolean = false): void {
    this.breachHistory.unshift(breach);
    if (this.breachHistory.length > 50) {
      this.breachHistory.pop();
    }

    if (triggerHalt || breach.severity === "CRITICAL" || breach.actionTaken === "TRADING_HALTED") {
      this.triggerHaltTrade(
        breach.reason,
        breach,
        `HALT-SEC-15C35-${breach.breachType}`
      );
    } else {
      this.notify();
    }
  }

  /**
   * Manually or automatically trigger "Halt Trade" venue risk freeze
   */
  public triggerHaltTrade(reason: string, triggeringBreach: CollarBreachRecord | null = null, code: string = "HALT-SEC-15C35-VOL"): void {
    this.haltState = {
      isHalted: true,
      haltTimestamp: Date.now(),
      haltReason: reason,
      triggeringBreach,
      haltDurationSec: 0,
      haltCode: code,
    };
    this.notify();
  }

  /**
   * Resume trading after supervisory clearance / compliance review
   */
  public resumeTrading(supervisorKey: string = "MLD-TAURUS-CHIEF-COMPLIANCE"): boolean {
    if (!supervisorKey || supervisorKey.trim().length === 0) return false;

    if (this.haltState.triggeringBreach) {
      const idx = this.breachHistory.findIndex((b) => b.id === this.haltState.triggeringBreach?.id);
      if (idx !== -1) {
        this.breachHistory[idx].disposition = "RESOLVED";
      }
    }

    this.haltState = {
      isHalted: false,
      haltTimestamp: null,
      haltReason: null,
      triggeringBreach: null,
      haltDurationSec: 0,
      haltCode: null,
    };
    this.notify();
    return true;
  }

  /**
   * Calculates rolling moving average price from recent trade executions
   */
  public calculateMovingAveragePrice(
    trades: { price: number; symbol?: string }[],
    symbol: string,
    fallbackPrice: number = 52.50,
    windowSize: number = 10
  ): {
    movingAveragePrice: number;
    sampleCount: number;
    samplePrices: number[];
    lowerCollar: number;
    upperCollar: number;
    collarBandPercent: number;
  } {
    const symbolTrades = symbol
      ? trades.filter((t) => !t.symbol || t.symbol.toUpperCase() === symbol.toUpperCase())
      : trades;
    const effWindowSize = windowSize || this.config.movingAverageWindowSize || 10;
    const windowTrades = symbolTrades.slice(0, effWindowSize);
    const samplePrices = windowTrades.length > 0
      ? windowTrades.map((t) => t.price)
      : [fallbackPrice];

    const sum = samplePrices.reduce((acc, p) => acc + p, 0);
    const ma = Number((sum / samplePrices.length).toFixed(fallbackPrice < 1 ? 4 : 2));
    const band = this.config.priceCollarBandPercent || 5;
    const lowerCollar = Number((ma * (1 - band / 100)).toFixed(ma < 1 ? 4 : 2));
    const upperCollar = Number((ma * (1 + band / 100)).toFixed(ma < 1 ? 4 : 2));

    return {
      movingAveragePrice: ma,
      sampleCount: samplePrices.length,
      samplePrices,
      lowerCollar,
      upperCollar,
      collarBandPercent: band,
    };
  }

  /**
   * Quick test simulations for demonstration and compliance checks
   */
  public simulateBreachScenario(type: "PRICE_COLLAR" | "MAX_NOTIONAL" | "CREDIT_LIMIT"): CollarBreachRecord {
    if (type === "PRICE_COLLAR") {
      const breach: CollarBreachRecord = {
        id: `BREACH-SIM-${Date.now().toString().slice(-4)}`,
        timestamp: Date.now(),
        symbol: "TW-EQ",
        orderSide: "BUY",
        price: 55.40, // +5.52% deviation exceeding the ±5% collar threshold on $52.50 MA
        quantity: 15000,
        notionalUsd: 831000,
        referencePrice: 52.50,
        priceDeviationPercent: 5.52,
        traderAddress: "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF",
        breachType: "PRICE_COLLAR_DEVIATION",
        severity: "CRITICAL",
        actionTaken: "TRADING_HALTED",
        reason: "SIMULATED BREACH: Order price $55.40 deviates +5.52% beyond the ±5% Moving Average collar boundary ($55.13 max). SEC Rule 15c3-5 automatic market freeze initiated.",
        disposition: "ACTIVE_HALT",
      };
      this.recordBreach(breach, true);
      return breach;
    } else if (type === "MAX_NOTIONAL") {
      const breach: CollarBreachRecord = {
        id: `BREACH-SIM-${Date.now().toString().slice(-4)}`,
        timestamp: Date.now(),
        symbol: "TREE3",
        orderSide: "SELL",
        price: 125.00,
        quantity: 50000,
        notionalUsd: 6250000,
        referencePrice: 125.00,
        priceDeviationPercent: 0,
        traderAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
        breachType: "MAX_ORDER_NOTIONAL_USD",
        severity: "CRITICAL",
        actionTaken: "TRADING_HALTED",
        reason: "SIMULATED BREACH: Single order size of $6,250,000 USD breaches the $1,000,000 pre-trade fat-finger limit. SEC Rule 15c3-5 automatic market freeze initiated.",
        disposition: "ACTIVE_HALT",
      };
      this.recordBreach(breach, true);
      return breach;
    } else {
      const breach: CollarBreachRecord = {
        id: `BREACH-SIM-${Date.now().toString().slice(-4)}`,
        timestamp: Date.now(),
        symbol: "TW-EQ",
        orderSide: "BUY",
        price: 52.50,
        quantity: 250000,
        notionalUsd: 13125000,
        referencePrice: 52.50,
        priceDeviationPercent: 0,
        traderAddress: "0x44BcA912c98F9082A81B0941F480414B60Ef110C",
        breachType: "CREDIT_THRESHOLD_EXCEEDED",
        severity: "CRITICAL",
        actionTaken: "TRADING_HALTED",
        reason: "SIMULATED BREACH: Participant credit exposure exceeded $10,000,000 USD threshold. SEC Rule 15c3-5 circuit tripped.",
        disposition: "ACTIVE_HALT",
      };
      this.recordBreach(breach, true);
      return breach;
    }
  }
}

export const secRule15c35RiskEngine = new SecRule15c35RiskEngine();
