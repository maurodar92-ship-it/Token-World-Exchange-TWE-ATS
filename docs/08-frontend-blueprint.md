# 08 — Frontend Blueprint

Status: Draft v1.0 · Owner: Product Engineering · Stack: React 18 + TypeScript + Vite (as in the sandbox prototype), TanStack Query, Zustand for local terminal state, WebSocket client per doc 07 §9.

Three applications share a design system and auth, but are deployed as separate bundles with separate role scopes:

| App | Users | Auth | Modules |
|---|---|---|---|
| **Institutional Terminal** | Subscriber traders, TWE ATS ops (read-only views), Module C traders | SSO (SAML/OIDC) + WebAuthn hardware key; IP allowlist optional | A, B, C |
| **Investor Portal** | Accredited/qualified investors, entities | Email + passkey (WebAuthn); step-up for withdrawals | A, B, D |
| **Admin / TA Console** | TA ops, compliance, ATS ops, finance | SSO + WebAuthn + device posture; every action role-checked server-side | A, D |

Cross-cutting rules: no secrets in the browser; all prices rendered from decimal strings (never JS floats for arithmetic — use a decimal library); every destructive action has an explicit confirmation showing exact quantities; WCAG 2.2 AA; timestamps shown in user TZ with UTC on hover.

## 1. Institutional Terminal

### 1.1 Layout system

* Dockable, resizable panels (e.g., `dockview` or `golden-layout`-class library; choose after licensing review). Layouts serialized to JSON (`{version, panels:[{id, type, params, position}]}`) and stored per user server-side; named workspaces ("Block trading", "RWA monitor", "Crypto perps").
* Panels are **linked by color groups**: selecting an instrument in a watchlist in group *blue* retargets every *blue* panel.
* Pop-out to separate browser window via `window.open` + `BroadcastChannel` sharing a single WS connection (SharedWorker) to keep one sequence stream.

### 1.2 Panels

| Panel | Function | Data |
|---|---|---|
| Watchlist | Symbol, bid/ask, last, change, volume, halt status, exemption badge (506(c), Reg S...) | L1 WS |
| Chart | Candles + volume, studies, trade markers for own fills | `ohlcv_*` REST + trades WS |
| DOM ladder | Vertical price ladder: bid qty / price / ask qty, own working orders at each price, click-to-trade (single-click arms, double-click sends — configurable), drag order to re-price (sends 35=G), right-click cancel-all-at-price | L2 WS + own orders |
| Order ticket | Limit/market/IOC/FOK/post-only, TIF, settlement mode (5005), cash asset (5009), wallet (5006); **pre-trade eligibility preview** (calls compliance gate dry-run; shows lockup expiry, accreditation status) before enabling Send | REST |
| Blotter | Working orders, fills, cancels; columns include DvP state (5011) live-updating | WS private channel |
| Positions & P/L | Module A: holdings by lot with transferable-date; Module C: margin, liquidation price, margin ratio gauge | REST + WS |
| SOR panel (Module B) | Consolidated venue view (firm vs indicative), routing preview with score breakdown per venue (doc 02 §5), "why this route" explanation | SOR API |
| Time & Sales | Prints with aggressor side | trades WS |
| **FIX Session Dashboard** | Per CompID: status (logged on / disconnected), in/out MsgSeqNum, last heartbeat age, TestRequests sent, resend requests, rejects (35=3/35=j) with reason, message rate sparkline, throttle utilization; actions: request logout, reset sequence (ops only, 4-eyes), download session log (redacted) | Gateway admin API |
| Alerts | Price alerts, settlement failures, halts | WS |

DOM ladder performance: render with canvas or virtualized rows; apply L2 deltas in a Web Worker, post a frozen view every animation frame (≤ 60 Hz); verify L2 checksum after each update and resubscribe on mismatch.

### 1.3 Charting: TradingView licensing note

The **TradingView Charting Library** (and Advanced Charts / Trading Platform products) is free-of-charge only under TradingView's license terms for qualifying public-facing uses and requires an application/approval; it is not open source, cannot be redistributed in a public repo, and requires attribution per the license. Commercial terms for a brokerage terminal ("Trading Platform" with built-in trading UI) must be negotiated. Until a license is executed, TWE uses **TradingView Lightweight Charts** (Apache-2.0, open source, attribution notice required) or an in-house canvas chart. The chart panel is behind a `ChartProvider` interface so the library can be swapped:

```ts
interface ChartProvider {
  mount(el: HTMLElement, opts: { symbol: string; resolution: '1'|'5'|'60'|'1D'; theme: 'dark'|'light' }): void;
  setBars(bars: Array<{ t: number; o: string; h: string; l: string; c: string; v: string }>): void;
  pushBar(bar: { t: number; o: string; h: string; l: string; c: string; v: string }): void;
  addMarkers(m: Array<{ t: number; side: 'B'|'S'; text: string }>): void;
  destroy(): void;
}
```

### 1.4 Keyboard and safety

Hotkeys (configurable, off by default): `B`/`S` focus ticket side, `Esc` cancel pending, `Ctrl+Shift+X` cancel all (confirmation). Fat-finger guard: confirm if notional > user limit or price outside band; hard block mirrors server-side pre-trade risk.

## 2. Investor Portal

### 2.1 Onboarding flow

```
Account type (individual / entity / IRA via custodian)
  → Identity (KYC provider SDK: document + selfie liveness; KYB: formation docs, UBOs ≥ 25% each KYC'd)
  → Sanctions/PEP screening (server-side)
  → Tax forms (W-9 or W-8BEN / W-8BEN-E, e-signature, TIN match)
  → Investor status:
       Accredited (Rule 501(a)) — income, net worth (excl. primary residence), professional certs (Series 7/65/82), entity tests
       506(c) verification: third-party letter upload, or verifier integration
       QP / QIB / Non-US person attestation + evidence
  → Suitability / Reg BI questionnaire (where TWE BD makes recommendations)
  → Bank link (Plaid) and/or wallet link
  → Agreements: customer agreement, ATS disclosures, risk disclosures for digital securities, e-delivery consent
  → Issue VC(s) + on-chain claims (doc 05 §8) → account APPROVED
```

Progress is resumable; each step writes a server-side state; PII collected via provider-hosted components where possible so TWE frontend never handles raw document images.

### 2.2 Bank linking (Plaid)

* Plaid Link (client) → `public_token` → exchanged server-side for `access_token` (stored encrypted, never in browser).
* Products: **Auth** (account/routing numbers for ACH), **Identity** (name match against KYC record), optionally **Balance** (pre-debit check to reduce returns). Use processor tokens where the ACH/payments partner supports Plaid processor integration — *confirm partner support*.
* ACH holds and return handling per doc 04 §5; UI shows "available to invest" vs "pending".

### 2.3 Wallets

| Option | Model | Use case | Notes |
|---|---|---|---|
| **Turnkey** | Non-custodial key infrastructure with keys in secure enclaves; policy engine | TWE-provisioned investor wallets with policy (e.g., only TWE escrow as spender) | Policy rules mirror transfer restrictions; confirm custody characterization with counsel (who controls keys determines 15c3-3 possession/control) |
| **Privy** | Embedded wallets with social/email login | Retail-friendly onboarding for Reg CF / Reg A investors | Embedded wallet export/recovery UX must not break registry binding (recovery triggers identity re-verification) |
| **MetaMask Institutional** | Institution's custodian (qualified custodian) connected via MMI | Institutions using Fireblocks/BitGo/Copper-class custodians | TWE whitelists custodian-controlled addresses; signature flows go through custodian approval queues — UI must handle multi-hour pending signatures |
| **MPC (TWE custody)** | TWE BD-controlled MPC (threshold signing, e.g., 2-of-3 across HSM + cloud + offline) | Default for BD customers wanting TWE to hold assets (possession/control) | Investor never sees keys; withdrawals require step-up auth + allowlisted destination with 24 h cooling-off |

Wallet binding: user signs SIWE (EIP-4361) challenge → backend verifies → registers wallet in identity registry (sync worker, doc 03 §10). Unbound wallets cannot receive restricted tokens.

### 2.4 Portfolio and actions

* Holdings by instrument with lots: acquisition date, cost basis, **transferable date** (Rule 144 / Reg S / Reg CF), on-chain location (wallet + chain + explorer link).
* Primary offerings (Reg D / Reg A / Reg CF): offering docs, investment-limit calculator (Reg CF, non-accredited investors only, aggregate across all Reg CF offerings in 12 months: if either annual income or net worth < $124,000 → greater of $2,500 or 5% of the greater of income and net worth; if both ≥ $124,000 → 10% of the greater, capped at $124,000; accredited investors unlimited since the 2021 amendments; confirm current inflation-adjusted amounts in 17 CFR 227.100), subscription e-sign, funding.
* Secondary trading: simplified ticket (limit only, DAY/GTC) with eligibility preview.
* Distributions history; tax documents center.

## 3. Admin / Transfer-Agent Console

### 3.1 Principles

* **Dual control (4-eyes)** for: mint, burn, freeze/unfreeze, forced transfer, wallet recovery, compliance override, corporate-action execution, trade break, fair-access denial, sequence reset. Maker creates `approvals` row (doc 06); a different user with checker role approves; execution uses HSM/MPC signing service which re-validates `approved_by ≠ requested_by` and expiry. UI displays a diff of the exact on-chain call (contract, function, args, decoded) for both maker and checker.
* **Break-glass**: emergency pause (escrow/token) with single approver + mandatory post-hoc review within 24 h.
* Every view of investor PII logged (`data_access_log`).

### 3.2 Modules

| Screen | Capabilities |
|---|---|
| Issuer & instrument setup | Create instrument, choose standard (ERC-3643 default), compliance modules (country allowlist, max holders — e.g., 2,000 holders / 500 non-accredited Section 12(g) monitoring, lockups), deploy via factory (4-eyes) |
| **Cap table auditor** | Three-way recon view (TA ledger vs chain vs BD ledger — doc 03 §12), drill into breaks, holder count vs 12(g) thresholds, as-of-date cap table (time travel via `cap_table_entries`), export for issuer/auditor (CSV + signed hash) |
| Mint / burn | Issuance against subscription records; redemption; batch upload with validation preview |
| Freeze / unfreeze | Address freeze, partial token freeze, investor-level freeze (propagates to all wallets); reason codes (sanctions, court order, lost key, dispute) |
| Forced transfer / recovery | Legal basis upload, approval, on-chain `forcedTransfer` / `recoveryAddress` |
| Compliance overrides | Time-boxed overrides of a non-statutory rule (e.g., min holding size) with justification; statutory rules (sanctions, Rule 144 holding period) **cannot** be overridden in UI |
| Corporate actions | Announce, snapshot preview, entitlement table, withholding preview, fund, execute, reconcile |
| **Tax lots** | Lot-level view per investor; lot relief method (FIFO default; specific ID if elected before settlement); wash-sale adjustments for covered securities where applicable; basis corrections (4-eyes) |
| **Tax reporting** | **1099-B** (proceeds, dates, basis for covered securities, short/long-term), **1099-DIV** (ordinary/qualified dividends, return of capital, federal withholding), **1099-INT** for coupons, **1042-S** for foreign persons, **K-1** distribution (generated by fund administrator for partnership SPVs; TWE delivers and tracks); IRS FIRE/IRIS e-file export; corrections workflow; recipient e-delivery with consent; digital-asset broker reporting (Form 1099-DA) for Module C entity where applicable |
| Surveillance case management | Alert queue (doc 05 §7), replay viewer (book at seq N), dispositions |
| CAT repair | Rejected records, edit + resubmit with audit trail |
| Venue enablement | Simulated/live per venue (doc 02), compliance sign-off |

### 3.3 Example 4-eyes flow (freeze)

```
Maker: Freeze wallet 0x5A0b…9c4c (investor INV-1042), reason SANCTIONS_POTENTIAL_MATCH, scope ALL_TOKENS
  → system immediately blocks at compliance gate (off-chain freeze needs no 4-eyes — protective action)
  → approvals row created for on-chain setAddressFrozen on 6 tokens
Checker: reviews decoded calls, approves
  → signer executes; tx hashes appear; status chips turn green
Unfreeze requires 4-eyes AND compliance role as checker.
```

## 4. Sandbox prototype mapping

The sandbox prototype provides: terminal views (book, ticket, blotter), the FIX encoder demo, SOR venue panel with simulated/live badges, surveillance alerts list, settlement state viewer, and the admin/TA console (freeze/mint/cap table) **without** 4-eyes enforcement. Production adds dual control, WebAuthn, layout persistence, and the full tax module.
