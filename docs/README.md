# Token World Exchange (TWE) — Architecture Specifications

TWE is an institutional venue combining four business lines on one shared core:

| Module | Business line | Regulatory wrapper (target) |
|---|---|---|
| **A** | Alternative Trading System for tokenized private / non-NMS securities (RWA, real estate, private credit, funds) | SEC-registered broker-dealer, FINRA member, Form ATS filed under Reg ATS (17 CFR 242.300–304) |
| **B** | Broker-dealer portal and Smart Order Router (SOR) into third-party digital-securities ATSs | Same BD; FINRA Rule 5310 best execution; Rule 606-style routing disclosure as best practice |
| **C** | Crypto spot and derivatives market (non-security crypto assets, permissioned pairs) | Separate legal entity / licensing track (state MTL / NYDFS, CFTC registration for derivatives where applicable). Strictly segregated from Module A books and records |
| **D** | RWA liquidity hub: tokenization integrations, transfer-agent book of record, corporate actions, DvP settlement | SEC-registered transfer agent (Form TA-1) or contracted registered TA; qualified custodian partners |

The **sandbox prototype** in this repository (Vite + React frontend, Netlify Functions, Netlify Database Postgres via Drizzle) implements a functional slice of every module with simulated external dependencies. These documents describe the **production target** and call out where the sandbox prototype differs.

## Document index

| # | File | Scope | Modules |
|---|---|---|---|
| 01 | [01-system-architecture.md](01-system-architecture.md) | Context/container diagrams, order lifecycle, LMAX-style matching core, determinism and replay, latency budgets, HA, deployment, sandbox-to-production mapping | A, B, C, D |
| 02 | [02-venue-integration.md](02-venue-integration.md) | Venue adapters (Securitize Markets, tZERO, INX, Oasis Pro, Figure ATS, Texture Capital, PPEX/North Capital), SOR, best-ex scoring, order splitting, Rule 5310 regular and rigorous review | B |
| 03 | [03-tokenization-protocols.md](03-tokenization-protocols.md) | Securitize DS Protocol, ERC-3643/T-REX + ONCHAINID, DigiShares, Republic, Vertalo, Bitbond, Blocksquare; mint/burn, identity sync, corporate actions, TA reconciliation | D (A consumes) |
| 04 | [04-settlement-clearing.md](04-settlement-clearing.md) | DvP orchestrator state machine, atomic escrow vs batch clearing, fiat and stablecoin rails, failure handling, Rule 15c3-3, margin engine | A, C, D |
| 05 | [05-compliance-surveillance.md](05-compliance-surveillance.md) | Reg ATS controls, fair access, confidential treatment, CAT pipeline, Rule 15c2-11/Form 211, surveillance algorithms, identity gateway (W3C VC 2.0, ERC-734/735) | A, B, C |
| 06 | [06-database-schema.sql](06-database-schema.sql) | PostgreSQL + TimescaleDB DDL: enums, reference data, orders, WAL, trades, settlement, compliance, CAT, hypertables, continuous aggregates, RLS notes | All |
| 07 | [07-fix-protocol.md](07-fix-protocol.md) | FIX 4.4 session and application messages with verified BodyLength/CheckSum, TWE custom tags 5000–9999, FIXT.1.1/FIX 5.0 SP2 differences, WebSocket L1/L2/L3 JSON schemas | A, B, C |
| 08 | [08-frontend-blueprint.md](08-frontend-blueprint.md) | Institutional terminal, investor portal, admin / transfer-agent console | All |
| 09 | [09-roadmap.md](09-roadmap.md) | Delivery plan, milestones, regulatory prerequisites, simulated-to-live adapter checklist | All |
| — | [../contracts/README.md](../contracts/README.md) | Solidity ^0.8.24 interfaces: identity registry, ERC-3643, ERC-1404, ERC-734/735, DS-style token, DvP escrow, corporate actions, soulbound credentials | A, C, D |

## Module-to-document map

```
Module A (ATS)          : 01, 04, 05, 06, 07, 08, 09, contracts/ITWEDvPEscrow, IERC3643, ITWEIdentityRegistry
Module B (BD + SOR)     : 02, 05 (best-ex surveillance, CAT routes), 07, 08 (terminal), 09
Module C (Crypto)       : 01, 04 (margin engine), 05 (crypto surveillance), 07 (WS feeds), contracts/ITWESoulboundCredential
Module D (RWA hub / TA) : 03, 04 (DvP, corporate-action cash), 06 (cap table), 08 (TA console), contracts/ITWECorporateActions, IDSToken, IERC1404
```

## Conventions

* **MUST / SHOULD / MAY** follow RFC 2119.
* All timestamps are UTC. Internal clock precision is nanoseconds (`int64` ns since epoch); CAT-reportable timestamps are captured at the precision the system uses, and at least milliseconds (CAT NMS Plan clock-synchronization and timestamp-granularity requirements; FINRA Rule 6860 / 6830 — confirm current granularity in the CAT Industry Member Technical Specifications).
* Prices and quantities are fixed-point integers in the core (`price_ticks`, `qty_lots`), with instrument-level `tick_size` and `lot_size` scale factors. No floating point in matching, margin, or settlement arithmetic.
* Regulatory citations are to the Code of Federal Regulations (17 CFR) and FINRA rules as of the document date. They are engineering references, **not legal advice**; every control mapped here must be confirmed by TWE's CCO and outside counsel before reliance.
* Vendor integration details are written as **adapter contracts**. Where a vendor's actual API shape is not public or not confirmed, the text says *"to be confirmed against vendor certification docs"*.
