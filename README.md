# Token World Exchange (TWE) — ATS & Unified Digital Asset Exchange

A sandbox prototype and full architecture specification for an institutional Alternative Trading System, broker-dealer portal, crypto spot market and multi-standard RWA liquidity hub.

> **Sandbox.** Venue connectivity is simulated, accounts are pre-funded and no real assets move. Nothing here is an offer to buy or sell securities.

## What's in the repo

| Path | Contents |
| --- | --- |
| `docs/` | Architecture specs: system diagrams (Mermaid/ASCII), venue integration and SOR, tokenization protocols, DvP settlement and margin, compliance and surveillance, PostgreSQL/TimescaleDB DDL, FIX 4.4 templates, front-end blueprint, roadmap |
| `contracts/` | Solidity interfaces: ERC-3643, ERC-1404, ERC-734/735, DS-Protocol-style token, identity registry, DvP escrow, corporate actions, soulbound credential |
| `lib/` | Exchange core: deterministic price-time matching engine, pre-trade compliance gate, FIX 4.4 codec, smart order router and venue adapters, surveillance detectors, FIFO tax lots, DB orchestration |
| `netlify/functions/` | HTTP API (market data, orders, FIX gateway, venues, compliance, settlement, admin) and a scheduled clearing batch that runs every minute |
| `db/schema.ts` | Drizzle schema for Netlify Database (Postgres); migrations live in `netlify/database/migrations/` |
| `src/` | React terminal: trading terminal, investor portal, settlement, surveillance, transfer-agent console, spec viewer |

## Module map

- **A: Matching & FIX core.** `lib/matching.ts`, `lib/fix.ts`, `lib/surveillance.ts`, `/api/fix`, CAT event staging
- **B: RWA token hub.** `contracts/`, identity registry and cap table in the admin console, mint/burn/freeze
- **C: DvP clearing.** `settle()` and `runSettlementBatch()` in `lib/exchange.ts`, `settlement-batch` scheduled function
- **D: Front end.** `src/`

## Try it

1. Open **Terminal** as `INST-01` and buy `AURA`. The order matches against the market maker's ladder and settles atomically.
2. Switch to `RET-01` and try to buy `AURA`. Reg D 506(c) rejects it before it reaches the book.
3. Pick **Smart router** on a large order. Child orders route to simulated away venues (see Surveillance → SOR routing log).
4. Open **Raw FIX entry**, change any value without recomputing the checksum, and send it. You get a session-level Reject (35=3).
5. Place a large bid and cancel it quickly, or stack bids at four prices. Spoofing and layering alerts appear under **Surveillance**.
6. In **Transfer agent**, halt or freeze a book, freeze a holder's position, mint tokens, or pay a dividend, coupon or rent distribution.

## Venue credentials

Each adapter reads its credentials from environment variables. When all of them are set, the venue reports `credentials_configured`. Order transmission stays simulated until the connector passes that venue's certification.

| Venue | Env vars |
| --- | --- |
| Securitize Markets | `SECURITIZE_MARKETS_API_KEY`, `SECURITIZE_MARKETS_API_SECRET` |
| tZERO ATS | `TZERO_FIX_SENDER_COMP_ID`, `TZERO_FIX_PASSWORD` |
| INX Securities | `INX_API_KEY`, `INX_API_SECRET` |
| Oasis Pro Markets | `OASIS_PRO_API_KEY` |
| Figure ATS | `FIGURE_API_KEY` |
| Texture Capital | `TEXTURE_API_KEY` |
| PPEX / North Capital | `NORTHCAPITAL_CLIENT_ID`, `NORTHCAPITAL_DEVELOPER_API_KEY` |

## Development

```bash
npm install
npm test            # engine unit tests (matching, compliance, FIX, SOR, surveillance, tax lots)
npm run typecheck
netlify dev         # app + functions + database
```

After you change `db/schema.ts`, run `npx drizzle-kit generate --name <change>`. Netlify applies migrations on deploy.
