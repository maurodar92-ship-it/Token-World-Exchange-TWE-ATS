# 02 — Venue Integration and Smart Order Routing (Module B)

Status: Draft v1.0 · Owner: Brokerage Technology · Regulatory anchors: FINRA Rule 5310 (best execution), Supplementary Material .09 (regular and rigorous review), FINRA Rule 3110 (supervision), Reg ATS Rule 301(b)(10) (confidential treatment of subscriber information on the TWE ATS itself)

## 1. Scope

TWE's broker-dealer routes customer orders in tokenized securities to (a) the TWE ATS (Module A) and (b) third-party digital-securities ATSs. Every external venue is integrated through a **venue adapter** behind a single interface. Adapters run in one of two modes:

* `simulated` — deterministic synthetic book, fills and settlement driven by seeded models. Default.
* `live` — real connectivity. The sandbox prototype enables live mode only when the adapter's credential environment variables are present; production additionally requires a `venue_enablement` record signed off by Compliance (doc 09 §5).

> Vendor API specifics below are written as **adapter contracts**. Unless stated otherwise, transport, message formats, and field names are *to be confirmed against vendor certification docs* and the executed subscriber / market-access agreements. Nothing here asserts a vendor's actual API surface.

## 2. Venue adapter interface

```ts
// packages/sor/src/venue.ts (production); sandbox prototype mirrors this shape.
export type VenueId =
  | 'SECURITIZE_MARKETS' | 'TZERO' | 'INX' | 'OASIS_PRO'
  | 'FIGURE_ATS' | 'TEXTURE_CAPITAL' | 'PPEX' | 'TWE_ATS';

export type AdapterMode = 'simulated' | 'live';

export interface VenueCapabilities {
  orderTypes: Array<'LIMIT' | 'MARKET' | 'IOC' | 'FOK' | 'POST_ONLY'>;
  timeInForce: Array<'DAY' | 'GTC' | 'GTD' | 'IOC' | 'FOK'>;
  supportsCancelReplace: boolean;
  supportsMarketData: 'L1' | 'L2' | 'NONE';
  /** Settlement models offered by the venue for this instrument. */
  settlement: Array<'ONCHAIN_ATOMIC' | 'ONCHAIN_AGENT' | 'OFFCHAIN_T0' | 'OFFCHAIN_T1' | 'OFFCHAIN_T2'>;
  cashLegs: Array<'USD_WIRE' | 'USD_ACH' | 'USDC' | 'EURC' | 'USDS' | 'OTHER'>;
  minQty: bigint; lotSize: bigint; tickSize: bigint;
  /** Whether the investor must be pre-onboarded at the venue (most ATSs require venue-level KYC). */
  requiresVenueAccount: boolean;
}

export interface VenueInstrumentRef {
  twInstrumentId: string;       // TWE master ID
  venueSymbol: string;          // venue-native symbol
  isin?: string; cusip?: string; chainId?: number; tokenAddress?: `0x${string}`;
}

export interface VenueQuote {
  venue: VenueId; instrument: VenueInstrumentRef;
  bids: Array<{ px: bigint; qty: bigint }>; asks: Array<{ px: bigint; qty: bigint }>;
  lastTrade?: { px: bigint; qty: bigint; ts: number };
  venueTs: number; receivedTs: number;
  /** Quotes older than this are excluded from routing. */
  staleAfterMs: number;
  /** 'firm' = executable; 'indicative' = IOI/displayed interest only. */
  firmness: 'firm' | 'indicative';
}

export interface ChildOrder {
  parentId: string; childId: string; venue: VenueId;
  instrument: VenueInstrumentRef; side: 'BUY' | 'SELL';
  qty: bigint; limitPx: bigint; tif: 'IOC' | 'DAY' | 'GTC' | 'FOK';
  investorRef: { twAccountId: string; venueAccountId: string };
  regExemption: 'REG_D_506B' | 'REG_D_506C' | 'REG_S' | 'REG_A_T1' | 'REG_A_T2' | 'REG_CF' | 'RULE_144' | 'RULE_144A' | 'REGISTERED';
  catOrderId: string;           // links MEOR (route) to venue's MEOA
}

export type VenueOrderEvent =
  | { kind: 'ACK'; childId: string; venueOrderId: string; ts: number }
  | { kind: 'FILL'; childId: string; fillId: string; px: bigint; qty: bigint; fee: bigint; liquidity: 'MAKER'|'TAKER'|'NA'; ts: number }
  | { kind: 'CANCELLED'; childId: string; leaves: bigint; reason?: string; ts: number }
  | { kind: 'REJECTED'; childId: string; code: string; text: string; ts: number }
  | { kind: 'SETTLEMENT'; fillId: string; state: 'PENDING'|'SETTLED'|'FAILED'; ref?: string; ts: number };

export interface VenueAdapter {
  readonly id: VenueId;
  readonly mode: AdapterMode;
  capabilities(instrument: VenueInstrumentRef): Promise<VenueCapabilities>;
  listInstruments(): Promise<VenueInstrumentRef[]>;
  quote(instrument: VenueInstrumentRef): Promise<VenueQuote | null>;
  subscribe?(instrument: VenueInstrumentRef, onQuote: (q: VenueQuote) => void): () => void;
  /** Idempotent on childId. MUST NOT resend if a prior ACK/REJECT exists. */
  submit(order: ChildOrder): Promise<{ accepted: boolean; venueOrderId?: string; reason?: string }>;
  cancel(childId: string): Promise<void>;
  onEvent(handler: (e: VenueOrderEvent) => void): () => void;
  /** Investor pre-check at venue (account exists, venue-side KYC/accreditation accepted). */
  eligibility(investor: { twAccountId: string }, instrument: VenueInstrumentRef): Promise<{ eligible: boolean; reason?: string }>;
  feeSchedule(instrument: VenueInstrumentRef): Promise<{ takerBps: number; makerBps: number; fixedPerTrade: bigint; settlementFee: bigint }>;
  health(): Promise<{ ok: boolean; latencyMs: number; lastHeartbeat: number }>;
}

export function resolveMode(env: Record<string, string | undefined>, required: string[]): AdapterMode {
  return required.every((k) => !!env[k]) ? 'live' : 'simulated';
}
```

All adapters MUST:

1. Persist every outbound child order and inbound event to `sor_child_orders` / `sor_venue_events` *before* acting on it (outbox/inbox).
2. Normalize venue prices/quantities into TWE fixed-point (`bigint` ticks/lots).
3. Emit CAT route linkage (`MEOR` from TWE with `destination` = venue IMID / `routedOrderID`); see doc 05.
4. Fail closed: on adapter health failure, the venue is removed from the routable set; open children are reconciled before re-enabling.

## 3. Venues

Each section: operator profile (high-level, public), integration pattern, credentials (sandbox env vars), settlement model, open items. Env var names are TWE-internal conventions.

### 3.1 Securitize Markets

* **Profile**: ATS operated by Securitize Markets, LLC (SEC-registered BD, FINRA member). Securities are typically issued on Securitize's DS Protocol, with Securitize, LLC acting as registered transfer agent.
* **Pattern**: REST/API or FIX connectivity for a broker-subscriber — *to be confirmed against vendor certification docs*. Investor eligibility is enforced on-chain by DS Protocol Compliance/Registry services (doc 03 §2); TWE must map its investor to a DS registry investor ID.
* **Env**: `SECURITIZE_MARKETS_API_URL`, `SECURITIZE_MARKETS_CLIENT_ID`, `SECURITIZE_MARKETS_CLIENT_SECRET`.
* **Settlement**: venue/TA-controlled; assume `ONCHAIN_AGENT` or `OFFCHAIN_T1` until confirmed.
* **Open items**: subscriber vs. omnibus account model; whether TWE customers need individual Securitize IDs; fee schedule; drop-copy availability.

### 3.2 tZERO ATS

* **Profile**: tZERO ATS, LLC (BD/ATS). Has historically traded digital securities with off-chain settlement and a separate custody affiliate.
* **Pattern**: FIX 4.x order entry is the expected integration path for broker-subscribers — *to be confirmed*.
* **Env**: `TZERO_FIX_HOST`, `TZERO_FIX_PORT`, `TZERO_SENDER_COMP_ID`, `TZERO_TARGET_COMP_ID`, `TZERO_CERT_PEM`.
* **Settlement**: `OFFCHAIN_T1` or venue-defined; token transfer recorded by the issuer's TA.
* **Open items**: certification test scripts, session times, symbol master format, clearing arrangement.

### 3.3 INX

* **Profile**: INX operates an SEC-registered ATS for digital securities through its broker-dealer subsidiary and a separate crypto trading platform. INX was acquired by Republic (announced 2024) — confirm current corporate structure and venue branding.
* **Pattern**: REST/WebSocket — *to be confirmed*. Keep the security-token ATS integration strictly in Module B; any crypto connectivity belongs to Module C under a separate entity.
* **Env**: `INX_API_URL`, `INX_API_KEY`, `INX_API_SECRET`.
* **Settlement**: venue-defined; potentially on-chain with stablecoin cash legs — *to be confirmed*.

### 3.4 Oasis Pro

* **Profile**: Oasis Pro Markets, LLC — BD/ATS that has publicly supported settlement of digital securities in fiat and stablecoins.
* **Pattern**: API — *to be confirmed*.
* **Env**: `OASIS_PRO_API_URL`, `OASIS_PRO_API_KEY`, `OASIS_PRO_ACCOUNT_ID`.
* **Settlement**: candidate for `ONCHAIN_ATOMIC` or `ONCHAIN_AGENT` with USDC — *confirm supported stablecoins and chain list*.

### 3.5 Figure ATS

* **Profile**: ATS operated by Figure Securities; assets recorded on the Provenance Blockchain ecosystem.
* **Pattern**: API — *to be confirmed*. Provenance is not EVM; the adapter needs a Provenance-aware settlement observer (Cosmos SDK-based chain) rather than the EVM observer used elsewhere.
* **Env**: `FIGURE_ATS_API_URL`, `FIGURE_ATS_API_KEY`, `FIGURE_ATS_PARTICIPANT_ID`.
* **Settlement**: venue-native on Provenance — *to be confirmed*.

### 3.6 Texture Capital

* **Profile**: Texture Capital, Inc. — BD/ATS for digital securities.
* **Pattern**: API — *to be confirmed*.
* **Env**: `TEXTURE_API_URL`, `TEXTURE_API_KEY`, `TEXTURE_API_SECRET`.
* **Settlement**: venue-defined.

### 3.7 PPEX ATS / North Capital

* **Profile**: PPEX ATS operated by North Capital Private Securities Corporation (BD/ATS). North Capital also offers issuer/investor transaction infrastructure (TransactAPI) and escrow/custody-adjacent services, relevant as a fiat-rail and qualified-custodian alternative (doc 04 §5).
* **Pattern**: REST API — *endpoint names and auth to be confirmed against North Capital developer documentation and certification*.
* **Env**: `NORTHCAPITAL_API_URL`, `NORTHCAPITAL_CLIENT_ID`, `NORTHCAPITAL_DEVELOPER_KEY`.
* **Settlement**: `OFFCHAIN_T1`/`T2` with fiat; TA book entry.

### 3.8 TWE ATS (internal)

Treated as just another adapter (`TWE_ATS`) so the SOR applies identical scoring. Because TWE BD routes to an affiliated ATS, this is a **conflict of interest** that MUST be disclosed (§8) and monitored in the regular and rigorous review (§7): the scoring formula gives the TWE ATS no preference term.

## 4. Quote aggregation

```
for each routable venue v with adapter.health().ok and mode in allowed_modes:
   q_v = latest quote with (now - q_v.receivedTs) < q_v.staleAfterMs
   if q_v.firmness == 'indicative': include in display; exclude from firm routing unless strategy = 'IOI_SEEK'
   normalize: px -> TWE ticks, qty -> TWE lots, fees -> per-unit all-in cost
consolidated_book = k-way merge of levels by (effective_px, venue_priority_tiebreak)
```

* **Effective price** (buy side): `eff_px = px * (1 + takerBps/1e4) + (fixedPerTrade + settlementFee) / expected_fill_qty`. Sell side mirrors with subtraction.
* **Tiebreak** among equal effective prices: higher fill probability, then lower settlement latency, then venue ID order (deterministic).
* Consolidated book is a TWE-internal view; redistribution of third-party venue data is subject to each venue's data agreement.

## 5. Best-execution scoring

For a candidate allocation of quantity `x_v` to venue `v`, the per-venue score (higher is better) is:

```
S_v = w_p · PriceImprovement_v
    − w_f · FeeCost_v
    + w_q · log(FillProb_v)
    − w_l · SettleLatency_v
    − w_r · RiskCost_v

PriceImprovement_v = side · (ref_px − eff_px_v) / ref_px              (bps; side=+1 buy, −1 sell)
FeeCost_v          = (taker_bps_v + 1e4 · (fixed_v + settle_fee_v) / (x_v · eff_px_v))   (bps)
FillProb_v         = P(fill | x_v, displayed_qty_v, quote_age_v, venue_hist)            ∈ (0,1]
                     ≈ σ(β0 + β1·min(1, displayed_qty_v/x_v) − β2·quote_age_ms_v/1000 + β3·hist_fill_rate_v)
SettleLatency_v    = expected hours from execution to final settlement / 24            (days)
RiskCost_v         = λ_cp · PD_cp(v) · LGD + λ_s · P(settle_fail_v) + λ_c · custody_risk_v   (bps-equivalent)

ref_px = NBBO-equivalent consolidated mid of firm quotes (no SIP exists for these securities),
         falling back to last TWE-validated reference price.
```

Default weights (reviewed quarterly by the Best Execution Committee): `w_p=1.0, w_f=1.0, w_q=15, w_l=8, w_r=1.0`. Weights, coefficients, and inputs are version-stamped and stored with each routing decision (`sor_routing_decisions.model_version`), so any decision is reproducible for review.

Rule 5310 factors mapped: character of the market (liquidity, volatility → FillProb, ref_px quality), size and type of transaction (x_v vs displayed), number of markets checked (logged venue set), accessibility of quotes (firmness, eligibility), terms of the order (limit, TIF).

Hard constraints (applied before scoring; a venue failing any is excluded, reason logged):

* Investor eligible at venue (`eligibility()`), instrument tradable there, transfer restriction check passes for the resulting buyer/seller pair (where determinable).
* Customer instructions (directed orders, venue exclusions) — directed orders bypass scoring but are logged as `DIRECTED`.
* Settlement model acceptable to the customer's account (e.g., account without stablecoin wallet excludes USDC-only venues).

## 6. Order splitting algorithm

Greedy marginal-score allocation over level-by-level liquidity, with minimum child sizes and a cap on venue count.

```
function split(parent, venues, maxVenues=3, minChild=lot*max(minQty_v)):
  remaining = parent.qty; alloc = {}
  levels = all (v, px, qty) from firm quotes passing constraints, limit-compliant
  while remaining > 0:
     best = argmax over levels l of S_v(l.v, x = min(l.qty, remaining)) evaluated incrementally
     if best is none or S(best) < S_floor: break
     if l.v not in alloc and |alloc| == maxVenues: drop l; continue
     take = min(l.qty, remaining); if take < minChild(l.v): drop l; continue
     alloc[l.v] += take; remaining -= take; consume l
  if remaining > 0 and parent.tif allows resting:
     rest_venue = argmax_v (S_v with FillProb from resting model)    # usually TWE_ATS or primary listing venue
     alloc[rest_venue] += remaining (as resting DAY/GTC child)
  emit children; sends are concurrent; IOC children that miss are re-evaluated (max 3 sweeps, 250 ms apart)
```

* **Anti-information-leakage**: children to indicative-only venues are capped at `min(displayed, 20% of parent)`.
* **Settlement fragmentation guard**: if splitting would produce > 2 distinct settlement models for one parent, the SOR prefers the allocation with fewer models unless score loss < 5 bps.
* **Determinism**: splitting uses the frozen quote snapshot ID; re-runs with the same snapshot yield the same allocation.

## 7. Regular and rigorous review (FINRA Rule 5310.09)

TWE does not execute every order individually reviewed; therefore it MUST conduct a regular and rigorous review, at least quarterly, on a security-by-security and type-of-order basis, comparing execution quality obtained against competing markets.

Pipeline:

1. **Data capture**: every parent, child, quote snapshot, score vector, and fill joins on `parent_id` (doc 06 tables `sor_*`).
2. **Metrics per venue × instrument × order type × size bucket**: fill rate, effective spread vs ref_px, price improvement, realized spread (5 min / 1 h / 1 d — horizons long because these markets are illiquid), time to fill, settlement fail rate, average all-in cost, cancel latency.
3. **Counterfactual**: for each executed child, compute the score the best *non-chosen* venue would have received at decision time; flag decisions where alternative beat chosen by > 10 bps all-in.
4. **Affiliated venue test**: compare TWE_ATS routing share against score-implied share; material excess triggers investigation.
5. **Committee**: Best Execution Committee (CCO, head of trading, independent member) reviews report, approves weight changes, documents rationale; minutes retained under Rule 17a-4.
6. **Changes** to routing logic follow change management with pre/post comparison.

## 8. Routing disclosures

Rule 606 applies to NMS securities; TWE's instruments are generally non-NMS, so Rule 606 reports are not mandated. As best practice TWE publishes a **quarterly routing disclosure** modeled on Rule 606(a): venues used, % of orders routed per venue, order-type breakdown, fees paid / rebates received, and any material relationships (including TWE's affiliation with the TWE ATS and any revenue-sharing with venues). Customers may request per-order routing information for the prior six months (606(b)(1)-style).

## 9. Error handling

| Condition | Action |
|---|---|
| Child REJECTED for eligibility | Mark venue ineligible for investor+instrument for 24 h; re-route remainder |
| No ACK within 5 s | Send cancel; mark child `UNKNOWN`; reconcile via venue order-status query before reroute (prevents double fills) |
| Fill for unknown child | Accept into `sor_unmatched_fills`, page desk, block new routes to venue |
| Venue settlement FAILED | Notify customer, trigger buy-in/close-out per venue rules, feed RiskCost P(settle_fail) |
| Adapter credentials removed | Mode flips to simulated on restart; open live children must be reconciled first (startup check refuses to flip with open live children) |
