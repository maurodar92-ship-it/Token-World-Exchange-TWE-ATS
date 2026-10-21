-- =====================================================================================
-- 06 — Token World Exchange (TWE) — Production database schema
-- Target: PostgreSQL 16 + TimescaleDB 2.x
-- Status: Draft v1.0. The sandbox prototype uses a Drizzle-managed subset of this schema
-- on Netlify Database Postgres (no TimescaleDB); hypertables there are plain tables.
--
-- Conventions
--   * Money/price/qty: NUMERIC(38,18) at rest (exact); the matching core uses fixed-point ints.
--   * All timestamps TIMESTAMPTZ (UTC). Core sequencer time additionally stored as BIGINT ns.
--   * Every mutable business table has created_at/updated_at and an audit trigger to audit_log.
--   * Append-only tables (wal_events, settlement_events, compliance_decisions, audit_log,
--     cat_events submissions) are protected by triggers forbidding UPDATE/DELETE.
--   * Module C (crypto) lives in schema "crypto" on a SEPARATE database cluster in production;
--     it is included here for completeness only.
--
-- Row-level security (RLS) — see section 12
--   Roles: twe_app (services), twe_subscriber (per-subscriber API reads via SET app.subscriber_id),
--   twe_ats_ops, twe_compliance, twe_ta_ops, twe_bd_desk (NO access to subscriber order data:
--   Reg ATS 301(b)(10) confidential treatment), twe_readonly_regulator.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS twe;
SET search_path = twe, public;

-- -------------------------------------------------------------------------------------
-- 1. Enums
-- -------------------------------------------------------------------------------------
CREATE TYPE order_side        AS ENUM ('BUY','SELL');
CREATE TYPE order_type        AS ENUM ('LIMIT','MARKET','POST_ONLY','IOC','FOK');
CREATE TYPE time_in_force     AS ENUM ('DAY','GTC','GTD','IOC','FOK');
CREATE TYPE order_status      AS ENUM ('PENDING_NEW','NEW','PARTIALLY_FILLED','FILLED','CANCELLED','REJECTED','EXPIRED','REPLACED');
CREATE TYPE reg_exemption     AS ENUM ('REGISTERED','REG_D_506B','REG_D_506C','REG_S','REG_A_TIER1','REG_A_TIER2','REG_CF','RULE_144','RULE_144A','OTHER');
CREATE TYPE asset_class       AS ENUM ('EQUITY','DEBT','FUND_INTEREST','REAL_ESTATE','PRIVATE_CREDIT','CRYPTO','STABLECOIN','DERIVATIVE');
CREATE TYPE reporting_profile AS ENUM ('RESTRICTED_EQUITY','OTC_EQUITY','TRACE_DEBT','NON_REPORTABLE','CRYPTO_NON_SECURITY');
CREATE TYPE investor_type     AS ENUM ('INDIVIDUAL','ENTITY','BROKER_DEALER','INSTITUTION','ISSUER');
CREATE TYPE kyc_status        AS ENUM ('NOT_STARTED','PENDING','APPROVED','REJECTED','EXPIRED');
CREATE TYPE accreditation     AS ENUM ('NONE','ACCREDITED','QUALIFIED_PURCHASER','QIB','NON_US_PERSON');
CREATE TYPE settlement_model  AS ENUM ('ONCHAIN_ATOMIC','ONCHAIN_AGENT','OFFCHAIN_T0','OFFCHAIN_T1','OFFCHAIN_T2','INTERNAL_LEDGER');
CREATE TYPE settlement_state  AS ENUM ('PENDING','PRECHECK','REJECTED_PRECHECK','ESCROW_OPEN','ASSET_LOCKED','CASH_LOCKED','BOTH_LOCKED',
                                       'SETTLING','SETTLED','BOOKED','EXPIRED','REFUNDING','FAILED','BUY_IN','MANUAL_REVIEW');
CREATE TYPE wal_kind          AS ENUM ('NEW','CANCEL','REPLACE','TIMER','HALT','RESUME','TRADE_BREAK','LIQUIDATE','ADMIN');
CREATE TYPE venue_id          AS ENUM ('TWE_ATS','SECURITIZE_MARKETS','TZERO','INX','OASIS_PRO','FIGURE_ATS','TEXTURE_CAPITAL','PPEX');
CREATE TYPE adapter_mode      AS ENUM ('simulated','live');
CREATE TYPE alert_type        AS ENUM ('WASH_SAME_BO','WASH_ROUNDTRIP','SPOOFING','LAYERING','FRONT_RUNNING','MARKING_CLOSE','RAMPING','PRICE_SPIKE','SETTLEMENT_FAIL_PATTERN');
CREATE TYPE alert_status      AS ENUM ('OPEN','TRIAGED','INVESTIGATING','ESCALATED','CLOSED_NO_ACTION','CLOSED_ACTION');
CREATE TYPE cat_event_type    AS ENUM ('MENO','MEOR','MEOA','MEIR','MECO','MEOM','MEOC','MEOJ','MEOT','MEOF','MEPA','MEAA','MENQ','MEQR','MEQC','MEQS');
CREATE TYPE cat_status        AS ENUM ('STAGED','SUBMITTED','ACCEPTED','REJECTED','REPAIRED');
CREATE TYPE ca_type           AS ENUM ('CASH_DIVIDEND','COUPON','RENT_DISTRIBUTION','PRINCIPAL_REDEMPTION','SPLIT','REVERSE_SPLIT','TENDER','MERGER');
CREATE TYPE approval_status   AS ENUM ('REQUESTED','APPROVED','REJECTED','EXECUTED','EXPIRED');

-- -------------------------------------------------------------------------------------
-- 2. Reference data
-- -------------------------------------------------------------------------------------
CREATE TABLE issuers (
  issuer_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name       TEXT NOT NULL,
  lei              CHAR(20) UNIQUE,
  jurisdiction     CHAR(2) NOT NULL,
  is_reporting_co  BOOLEAN NOT NULL DEFAULT FALSE,      -- drives Rule 144 6-month vs 1-year
  reporting_since  DATE,
  transfer_agent   TEXT NOT NULL,                       -- registered TA of record
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE instruments (
  instrument_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol            TEXT NOT NULL UNIQUE,
  issuer_id         UUID REFERENCES issuers,
  asset_class       asset_class NOT NULL,
  reporting_profile reporting_profile NOT NULL,
  exemption         reg_exemption NOT NULL,
  isin              CHAR(12) UNIQUE,
  cusip             CHAR(9),
  chain_id          INTEGER,
  token_address     BYTEA CHECK (token_address IS NULL OR octet_length(token_address) = 20),
  token_standard    TEXT CHECK (token_standard IN ('ERC3643','DS','ERC1404','ERC20','PROVENANCE','NONE')),
  token_decimals    SMALLINT NOT NULL DEFAULT 0 CHECK (token_decimals BETWEEN 0 AND 18),
  tick_size         NUMERIC(38,18) NOT NULL CHECK (tick_size > 0),
  lot_size          NUMERIC(38,18) NOT NULL CHECK (lot_size > 0),
  price_band_bps    INTEGER NOT NULL DEFAULT 1000 CHECK (price_band_bps > 0),
  liquidity_tier    SMALLINT NOT NULL DEFAULT 3 CHECK (liquidity_tier BETWEEN 1 AND 3),
  settlement_model  settlement_model NOT NULL,
  shard_id          SMALLINT NOT NULL,
  is_halted         BOOLEAN NOT NULL DEFAULT FALSE,
  reg_s_dcp_end     DATE,                               -- Reg S distribution compliance period end
  regcf_issue_date  DATE,                               -- Reg CF 1-year resale restriction anchor
  allowed_jurisdictions TEXT[] NOT NULL DEFAULT '{}',   -- ISO 3166-2 codes; empty = none
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chain_requires_address CHECK ((chain_id IS NULL) = (token_address IS NULL))
);
CREATE INDEX ON instruments (shard_id);
CREATE UNIQUE INDEX ON instruments (chain_id, token_address) WHERE token_address IS NOT NULL;

CREATE TABLE settlement_assets (
  asset_code   TEXT PRIMARY KEY,                       -- 'USD','USDC','EURC','USDS'
  chain_id     INTEGER, token_address BYTEA,
  haircut_bps  INTEGER NOT NULL DEFAULT 0 CHECK (haircut_bps BETWEEN 0 AND 10000),
  approved_by  TEXT NOT NULL, approved_at TIMESTAMPTZ NOT NULL,
  is_paused    BOOLEAN NOT NULL DEFAULT FALSE           -- depeg circuit breaker
);

-- -------------------------------------------------------------------------------------
-- 3. Participants & identity
-- -------------------------------------------------------------------------------------
CREATE TABLE subscribers (                              -- Reg ATS subscribers (BDs, institutions)
  subscriber_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name     TEXT NOT NULL,
  crd_number     INTEGER,
  cat_imid       TEXT,
  mpid           CHAR(4),
  fix_comp_id    TEXT UNIQUE,
  status         TEXT NOT NULL CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','TERMINATED')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE investors (
  investor_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id    UUID REFERENCES subscribers,          -- introducing subscriber, if any
  investor_type    investor_type NOT NULL,
  legal_name_enc   BYTEA NOT NULL,                       -- envelope-encrypted PII (KMS); never plaintext
  tin_hash         BYTEA,                                -- HMAC for dedupe; TIN itself in vault
  country          CHAR(2) NOT NULL,
  subdivision      TEXT,                                 -- ISO 3166-2, e.g. 'US-NY'
  kyc_status       kyc_status NOT NULL DEFAULT 'NOT_STARTED',
  kyc_expires_at   TIMESTAMPTZ,
  accreditation    accreditation NOT NULL DEFAULT 'NONE',
  accreditation_expires_at TIMESTAMPTZ,
  sanctions_cleared_at TIMESTAMPTZ,
  is_frozen        BOOLEAN NOT NULL DEFAULT FALSE,
  cat_fdid         TEXT UNIQUE,                          -- Firm Designated ID for CAT/CAIS
  onchain_id       BYTEA CHECK (onchain_id IS NULL OR octet_length(onchain_id) = 20),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON investors (subscriber_id);

CREATE TABLE wallets (
  wallet_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id   UUID NOT NULL REFERENCES investors,
  chain_id      INTEGER NOT NULL,
  address       BYTEA NOT NULL CHECK (octet_length(address) = 20),
  custody_type  TEXT NOT NULL CHECK (custody_type IN ('TWE_MPC','TWE_HSM','QUALIFIED_CUSTODIAN','SELF_CUSTODY','EMBEDDED')),
  provider      TEXT,                                  -- 'turnkey','privy','mmi','fireblocks',...
  verified_at   TIMESTAMPTZ,                           -- key-control proof (SIWE)
  is_frozen     BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (chain_id, address)
);

CREATE TABLE investor_credentials (
  credential_id   TEXT PRIMARY KEY,                    -- VC id (urn:uuid:...)
  investor_id     UUID NOT NULL REFERENCES investors,
  claim_topic     INTEGER NOT NULL,                    -- doc 05 §8.3
  issuer_did      TEXT NOT NULL,
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_until     TIMESTAMPTZ,
  status_list_url TEXT, status_list_index BIGINT,
  revoked_at      TIMESTAMPTZ,
  onchain_claim_id BYTEA,                              -- keccak256(issuer, topic)
  evidence_hash   BYTEA NOT NULL,
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);
CREATE INDEX ON investor_credentials (investor_id, claim_topic) WHERE revoked_at IS NULL;

CREATE TABLE trusted_issuers (
  issuer_did   TEXT PRIMARY KEY,
  claim_topics INTEGER[] NOT NULL,
  onchain_addr BYTEA,
  active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- -------------------------------------------------------------------------------------
-- 4. Compliance decisions (append-only) & fair access
-- -------------------------------------------------------------------------------------
CREATE TABLE compliance_decisions (
  decision_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  investor_id   UUID NOT NULL REFERENCES investors,
  instrument_id UUID NOT NULL REFERENCES instruments,
  side          order_side NOT NULL,
  qty           NUMERIC(38,18) NOT NULL CHECK (qty > 0),
  approved      BOOLEAN NOT NULL,
  reason_code   TEXT,                                   -- e.g. LOCKUP_ACTIVE, SANCTIONS_HIT, JURISDICTION_BLOCKED
  checks        JSONB NOT NULL,                         -- per-check result vector
  ruleset_version TEXT NOT NULL,
  CHECK (approved OR reason_code IS NOT NULL)
);
CREATE INDEX ON compliance_decisions (investor_id, decided_at DESC);

CREATE TABLE fair_access_decisions (
  id            BIGSERIAL PRIMARY KEY,
  subscriber_id UUID REFERENCES subscribers,
  applicant     TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('GRANT','DENY','LIMIT','SUSPEND','REINSTATE')),
  standard_ref  TEXT NOT NULL,
  reasons       TEXT NOT NULL,
  decided_by    TEXT NOT NULL,
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------------------
-- 5. Orders, WAL, trades
-- -------------------------------------------------------------------------------------
CREATE TABLE orders (
  order_id       BIGINT PRIMARY KEY,                    -- shard_id<<48 | seq (deterministic)
  cl_ord_id      TEXT NOT NULL,
  subscriber_id  UUID NOT NULL REFERENCES subscribers,
  investor_id    UUID NOT NULL REFERENCES investors,
  instrument_id  UUID NOT NULL REFERENCES instruments,
  decision_id    UUID NOT NULL REFERENCES compliance_decisions,
  side           order_side NOT NULL,
  type           order_type NOT NULL,
  tif            time_in_force NOT NULL,
  limit_px       NUMERIC(38,18) CHECK (limit_px IS NULL OR limit_px > 0),
  qty            NUMERIC(38,18) NOT NULL CHECK (qty > 0),
  leaves_qty     NUMERIC(38,18) NOT NULL CHECK (leaves_qty >= 0),
  cum_qty        NUMERIC(38,18) NOT NULL DEFAULT 0 CHECK (cum_qty >= 0),
  status         order_status NOT NULL,
  owner_group    UUID NOT NULL,                         -- beneficial-owner group for STP & surveillance
  expire_at      TIMESTAMPTZ,
  seq            BIGINT NOT NULL,
  recv_ns        BIGINT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, cl_ord_id),
  CHECK (cum_qty + leaves_qty <= qty),
  CHECK ((type IN ('MARKET')) OR limit_px IS NOT NULL),
  CHECK (tif <> 'GTD' OR expire_at IS NOT NULL)
);
CREATE INDEX orders_open_book ON orders (instrument_id, side, limit_px, seq) WHERE status IN ('NEW','PARTIALLY_FILLED');
CREATE INDEX ON orders (investor_id, created_at DESC);

-- Append-only, hash-chained journal (mirrors core WAL; doc 01 §6.3)
CREATE TABLE wal_events (
  shard_id     SMALLINT NOT NULL,
  seq          BIGINT   NOT NULL,
  recv_ns      BIGINT   NOT NULL,
  kind         wal_kind NOT NULL,
  instrument_id UUID REFERENCES instruments,
  decision_id  UUID REFERENCES compliance_decisions,
  payload      JSONB NOT NULL,
  prev_hash    BYTEA NOT NULL CHECK (octet_length(prev_hash) = 32),
  hash         BYTEA NOT NULL CHECK (octet_length(hash) = 32),
  written_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shard_id, seq),
  CHECK (kind IN ('TIMER','HALT','RESUME','ADMIN','TRADE_BREAK','LIQUIDATE') OR decision_id IS NOT NULL OR kind = 'CANCEL')
);

CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only: % forbidden', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

-- Enforce gapless seq + hash chain on insert
CREATE OR REPLACE FUNCTION wal_check_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last RECORD;
BEGIN
  SELECT seq, hash INTO last FROM wal_events WHERE shard_id = NEW.shard_id ORDER BY seq DESC LIMIT 1;
  IF FOUND THEN
    IF NEW.seq <> last.seq + 1 THEN RAISE EXCEPTION 'WAL gap: expected %, got %', last.seq + 1, NEW.seq; END IF;
    IF NEW.prev_hash <> last.hash THEN RAISE EXCEPTION 'WAL hash chain broken at seq %', NEW.seq; END IF;
  ELSIF NEW.seq <> 1 THEN
    RAISE EXCEPTION 'WAL must start at seq 1 for shard %', NEW.shard_id;
  END IF;
  IF NEW.hash <> digest(NEW.prev_hash || convert_to(NEW.shard_id::text || ':' || NEW.seq::text || ':' || NEW.payload::text, 'UTF8'), 'sha256') THEN
    RAISE EXCEPTION 'WAL hash mismatch at seq %', NEW.seq;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER wal_chain BEFORE INSERT ON wal_events FOR EACH ROW EXECUTE FUNCTION wal_check_chain();
CREATE TRIGGER wal_no_update BEFORE UPDATE OR DELETE ON wal_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER wal_no_truncate BEFORE TRUNCATE ON wal_events FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER cd_no_update BEFORE UPDATE OR DELETE ON compliance_decisions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
-- Note: inserts are serialized per shard by the single journaler writer (or pg_advisory_xact_lock(shard_id)
-- in the sandbox prototype), so the "last row" read in wal_check_chain is race-free.

-- Trades: hypertable (time-partitioned), 1-day chunks
CREATE TABLE trades (
  trade_id       BIGINT NOT NULL,
  executed_at    TIMESTAMPTZ NOT NULL,
  instrument_id  UUID NOT NULL REFERENCES instruments,
  seq            BIGINT NOT NULL,
  px             NUMERIC(38,18) NOT NULL CHECK (px > 0),
  qty            NUMERIC(38,18) NOT NULL CHECK (qty > 0),
  buy_order_id   BIGINT NOT NULL,
  sell_order_id  BIGINT NOT NULL,
  aggressor      order_side NOT NULL,
  buy_owner_group  UUID NOT NULL,
  sell_owner_group UUID NOT NULL,
  venue          venue_id NOT NULL DEFAULT 'TWE_ATS',
  is_broken      BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (trade_id, executed_at),
  CHECK (buy_order_id <> sell_order_id)
);
SELECT create_hypertable('trades', 'executed_at', chunk_time_interval => INTERVAL '1 day');
CREATE INDEX ON trades (instrument_id, executed_at DESC);
CREATE INDEX ON trades (buy_owner_group, executed_at DESC);
CREATE INDEX ON trades (sell_owner_group, executed_at DESC);

-- -------------------------------------------------------------------------------------
-- 6. Market data hypertables & continuous aggregates
-- -------------------------------------------------------------------------------------
CREATE TABLE ticks (                                    -- L1 top-of-book changes
  ts            TIMESTAMPTZ NOT NULL,
  instrument_id UUID NOT NULL,
  bid_px NUMERIC(38,18), bid_qty NUMERIC(38,18),
  ask_px NUMERIC(38,18), ask_qty NUMERIC(38,18),
  seq    BIGINT NOT NULL,
  CHECK (bid_px IS NULL OR ask_px IS NULL OR bid_px < ask_px)   -- book never locked/crossed after match
);
SELECT create_hypertable('ticks', 'ts', chunk_time_interval => INTERVAL '1 day');
CREATE INDEX ON ticks (instrument_id, ts DESC);

CREATE TABLE book_snapshots (                           -- L2 periodic snapshots (every 1 s and on halt)
  ts            TIMESTAMPTZ NOT NULL,
  instrument_id UUID NOT NULL,
  seq           BIGINT NOT NULL,
  bids          JSONB NOT NULL,                         -- [[px, qty, order_count], ...] top 50
  asks          JSONB NOT NULL,
  book_hash     BYTEA NOT NULL                          -- matches core StateDigest for replay validation
);
SELECT create_hypertable('book_snapshots', 'ts', chunk_time_interval => INTERVAL '6 hours');
CREATE INDEX ON book_snapshots (instrument_id, ts DESC);

ALTER TABLE ticks SET (timescaledb.compress, timescaledb.compress_segmentby = 'instrument_id', timescaledb.compress_orderby = 'ts DESC');
ALTER TABLE book_snapshots SET (timescaledb.compress, timescaledb.compress_segmentby = 'instrument_id');
ALTER TABLE trades SET (timescaledb.compress, timescaledb.compress_segmentby = 'instrument_id', timescaledb.compress_orderby = 'executed_at DESC');
SELECT add_compression_policy('ticks', INTERVAL '7 days');
SELECT add_compression_policy('book_snapshots', INTERVAL '3 days');
SELECT add_compression_policy('trades', INTERVAL '30 days');
-- Retention: NO drop policy on trades (books & records; 17a-4 / Rule 303). Ticks/snapshots kept >= 6 years in
-- compressed form, then exported to WORM object storage before any drop_chunks.

CREATE MATERIALIZED VIEW ohlcv_1m WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 minute', executed_at) AS bucket,
       instrument_id,
       first(px, executed_at) AS open,
       max(px) AS high,
       min(px) AS low,
       last(px, executed_at)  AS close,
       sum(qty) AS volume,
       sum(px * qty) / NULLIF(sum(qty), 0) AS vwap,
       count(*) AS trade_count
FROM trades WHERE NOT is_broken
GROUP BY bucket, instrument_id
WITH NO DATA;
SELECT add_continuous_aggregate_policy('ohlcv_1m', start_offset => INTERVAL '2 hours', end_offset => INTERVAL '1 minute', schedule_interval => INTERVAL '1 minute');

-- Hierarchical aggregates (TimescaleDB >= 2.9)
CREATE MATERIALIZED VIEW ohlcv_1h WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 hour', bucket) AS bucket, instrument_id,
       first(open, bucket) AS open, max(high) AS high, min(low) AS low, last(close, bucket) AS close,
       sum(volume) AS volume, sum(vwap * volume) / NULLIF(sum(volume), 0) AS vwap, sum(trade_count) AS trade_count
FROM ohlcv_1m GROUP BY 1, 2 WITH NO DATA;
SELECT add_continuous_aggregate_policy('ohlcv_1h', start_offset => INTERVAL '1 day', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '15 minutes');

CREATE MATERIALIZED VIEW ohlcv_1d WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 day', bucket) AS bucket, instrument_id,
       first(open, bucket) AS open, max(high) AS high, min(low) AS low, last(close, bucket) AS close,
       sum(volume) AS volume, sum(vwap * volume) / NULLIF(sum(volume), 0) AS vwap, sum(trade_count) AS trade_count
FROM ohlcv_1h GROUP BY 1, 2 WITH NO DATA;
SELECT add_continuous_aggregate_policy('ohlcv_1d', start_offset => INTERVAL '7 days', end_offset => INTERVAL '1 day', schedule_interval => INTERVAL '1 hour');
-- Trade breaks after aggregation: refresh_continuous_aggregate('ohlcv_1m', from, to) is invoked by the break workflow.

-- -------------------------------------------------------------------------------------
-- 7. Settlement
-- -------------------------------------------------------------------------------------
CREATE TABLE settlements (
  settlement_id  BYTEA PRIMARY KEY CHECK (octet_length(settlement_id) = 32),   -- keccak256(trade_id, venue, chain)
  trade_id       BIGINT NOT NULL,
  trade_executed_at TIMESTAMPTZ NOT NULL,
  model          settlement_model NOT NULL,
  state          settlement_state NOT NULL DEFAULT 'PENDING',
  cash_asset     TEXT NOT NULL REFERENCES settlement_assets,
  cash_amount    NUMERIC(38,18) NOT NULL CHECK (cash_amount > 0),
  fee_amount     NUMERIC(38,18) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  asset_qty      NUMERIC(38,18) NOT NULL CHECK (asset_qty > 0),
  buyer_wallet   UUID REFERENCES wallets, seller_wallet UUID REFERENCES wallets,
  hashlock       BYTEA, timelock_at TIMESTAMPTZ,
  settle_date    DATE NOT NULL,
  version        INTEGER NOT NULL DEFAULT 0,             -- optimistic concurrency for saga steps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- FK into a hypertable requires TimescaleDB >= 2.16; on older versions enforce in the DvP service.
  FOREIGN KEY (trade_id, trade_executed_at) REFERENCES trades (trade_id, executed_at),
  CHECK (model NOT IN ('ONCHAIN_ATOMIC') OR timelock_at IS NOT NULL)
);
CREATE INDEX settlements_open ON settlements (state, settle_date) WHERE state NOT IN ('BOOKED','FAILED');

CREATE TABLE settlement_events (                         -- append-only transition log
  id           BIGSERIAL PRIMARY KEY,
  settlement_id BYTEA NOT NULL REFERENCES settlements,
  from_state   settlement_state, to_state settlement_state NOT NULL,
  cause        TEXT NOT NULL,
  chain_id INTEGER, tx_hash BYTEA, block_number BIGINT, log_index INTEGER,
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chain_id, tx_hash, log_index)
);
CREATE TRIGGER se_no_update BEFORE UPDATE OR DELETE ON settlement_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE cash_movements (
  id          BIGSERIAL PRIMARY KEY,
  rail        TEXT NOT NULL CHECK (rail IN ('FEDWIRE','ACH','STABLECOIN','INTERNAL')),
  direction   TEXT NOT NULL CHECK (direction IN ('IN','OUT')),
  investor_id UUID REFERENCES investors,
  asset_code  TEXT NOT NULL REFERENCES settlement_assets,
  amount      NUMERIC(38,18) NOT NULL CHECK (amount > 0),
  external_ref TEXT,                                     -- IMAD/OMAD, ACH trace, tx hash
  status      TEXT NOT NULL CHECK (status IN ('PENDING','COMPLETED','RETURNED','FAILED')),
  available_at TIMESTAMPTZ,                              -- ACH hold release
  is_customer_funds BOOLEAN NOT NULL,                    -- 15c3-3 reserve computation input
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------------------
-- 8. Transfer agent ledger / cap table / tax lots / corporate actions
-- -------------------------------------------------------------------------------------
CREATE TABLE cap_table_entries (                         -- book-entry movements (append-only)
  id            BIGSERIAL PRIMARY KEY,
  instrument_id UUID NOT NULL REFERENCES instruments,
  investor_id   UUID NOT NULL REFERENCES investors,
  delta_units   NUMERIC(38,18) NOT NULL CHECK (delta_units <> 0),
  reason        TEXT NOT NULL CHECK (reason IN ('ISSUANCE','TRADE','REDEMPTION','FORCED_TRANSFER','RECOVERY','CORP_ACTION','CORRECTION')),
  settlement_id BYTEA REFERENCES settlements,
  approval_id   UUID,                                    -- dual-control approval for non-trade reasons
  chain_tx_hash BYTEA,
  effective_at  TIMESTAMPTZ NOT NULL,
  CHECK (reason = 'TRADE' OR approval_id IS NOT NULL)
);
CREATE TRIGGER cte_no_update BEFORE UPDATE OR DELETE ON cap_table_entries FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE INDEX ON cap_table_entries (instrument_id, investor_id, effective_at);

CREATE VIEW cap_table AS
SELECT instrument_id, investor_id, sum(delta_units) AS units
FROM cap_table_entries GROUP BY 1, 2 HAVING sum(delta_units) <> 0;

CREATE TABLE tax_lots (
  lot_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id   UUID NOT NULL REFERENCES investors,
  instrument_id UUID NOT NULL REFERENCES instruments,
  acquired_at   TIMESTAMPTZ NOT NULL,
  holding_period_start TIMESTAMPTZ NOT NULL,             -- Rule 144 clock (may differ from acquired_at via tacking)
  qty_open      NUMERIC(38,18) NOT NULL CHECK (qty_open >= 0),
  qty_original  NUMERIC(38,18) NOT NULL CHECK (qty_original > 0),
  cost_basis    NUMERIC(38,18) NOT NULL CHECK (cost_basis >= 0),
  exemption     reg_exemption NOT NULL,
  is_covered    BOOLEAN NOT NULL DEFAULT TRUE,           -- 1099-B covered vs noncovered security
  closed_at     TIMESTAMPTZ,
  CHECK (qty_open <= qty_original)
);
CREATE INDEX ON tax_lots (investor_id, instrument_id) WHERE qty_open > 0;

CREATE TABLE corporate_actions (
  ca_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id  UUID NOT NULL REFERENCES instruments,
  ca_type        ca_type NOT NULL,
  announce_date  DATE NOT NULL, record_date DATE NOT NULL, pay_date DATE NOT NULL,
  rate_per_unit  NUMERIC(38,18),
  cash_asset     TEXT REFERENCES settlement_assets,
  ratio_num INTEGER, ratio_den INTEGER,
  snapshot_block BIGINT,
  merkle_root    BYTEA,
  status         approval_status NOT NULL DEFAULT 'REQUESTED',
  CHECK (record_date >= announce_date AND pay_date >= record_date),
  CHECK (ca_type NOT IN ('SPLIT','REVERSE_SPLIT') OR (ratio_num > 0 AND ratio_den > 0))
);

CREATE TABLE ca_payments (
  ca_id        UUID NOT NULL REFERENCES corporate_actions,
  investor_id  UUID NOT NULL REFERENCES investors,
  gross_amount NUMERIC(38,18) NOT NULL CHECK (gross_amount >= 0),
  withholding  NUMERIC(38,18) NOT NULL DEFAULT 0 CHECK (withholding >= 0),
  net_amount   NUMERIC(38,18) GENERATED ALWAYS AS (gross_amount - withholding) STORED,
  tax_form     TEXT CHECK (tax_form IN ('1099-DIV','1099-INT','1042-S','K-1','NONE')),
  paid_tx      TEXT,
  PRIMARY KEY (ca_id, investor_id),
  CHECK (withholding <= gross_amount)
);

CREATE TABLE approvals (                                -- 4-eyes / dual control
  approval_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action       TEXT NOT NULL,                            -- MINT, BURN, FREEZE, FORCED_TRANSFER, OVERRIDE, CA_EXECUTE
  payload      JSONB NOT NULL,
  requested_by TEXT NOT NULL, requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by  TEXT, approved_at TIMESTAMPTZ,
  status       approval_status NOT NULL DEFAULT 'REQUESTED',
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  CHECK (approved_by IS NULL OR approved_by <> requested_by)   -- maker != checker
);

CREATE TABLE recon_breaks (
  id BIGSERIAL PRIMARY KEY, run_at TIMESTAMPTZ NOT NULL, instrument_id UUID REFERENCES instruments,
  break_type TEXT NOT NULL CHECK (break_type IN ('TA_VS_CHAIN','CHAIN_VS_BD','SUPPLY','UNKNOWN_HOLDER','REGISTRY_DRIFT')),
  detail JSONB NOT NULL, severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 4),
  resolved_at TIMESTAMPTZ, resolution TEXT
);

-- -------------------------------------------------------------------------------------
-- 9. SOR (Module B)
-- -------------------------------------------------------------------------------------
CREATE TABLE venue_enablement (
  venue venue_id PRIMARY KEY, mode adapter_mode NOT NULL DEFAULT 'simulated',
  compliance_signoff_by TEXT, compliance_signoff_at TIMESTAMPTZ,
  CHECK (mode = 'simulated' OR compliance_signoff_at IS NOT NULL)
);
CREATE TABLE sor_routing_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), parent_order_id BIGINT NOT NULL,
  quote_snapshot_id UUID NOT NULL, model_version TEXT NOT NULL, scores JSONB NOT NULL,
  allocation JSONB NOT NULL, excluded JSONB NOT NULL, decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sor_child_orders (
  child_id TEXT PRIMARY KEY, decision_id UUID NOT NULL REFERENCES sor_routing_decisions,
  venue venue_id NOT NULL, mode adapter_mode NOT NULL, venue_order_id TEXT,
  qty NUMERIC(38,18) NOT NULL CHECK (qty > 0), limit_px NUMERIC(38,18) NOT NULL,
  state TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sor_venue_events (
  ts TIMESTAMPTZ NOT NULL, child_id TEXT NOT NULL, kind TEXT NOT NULL, body JSONB NOT NULL
);
SELECT create_hypertable('sor_venue_events', 'ts', chunk_time_interval => INTERVAL '7 days');

-- -------------------------------------------------------------------------------------
-- 10. CAT & surveillance
-- -------------------------------------------------------------------------------------
CREATE TABLE cat_events (
  id            BIGSERIAL,
  event_ts      TIMESTAMPTZ NOT NULL,
  event_type    cat_event_type NOT NULL,
  trade_date    DATE NOT NULL,
  order_key     TEXT NOT NULL,                            -- orderKeyDate + orderID
  record        JSONB NOT NULL,                           -- spec-conformant JSON record
  status        cat_status NOT NULL DEFAULT 'STAGED',
  batch_file    TEXT, feedback JSONB,
  PRIMARY KEY (id, event_ts)
);
SELECT create_hypertable('cat_events', 'event_ts', chunk_time_interval => INTERVAL '1 day');
CREATE INDEX ON cat_events (trade_date, status);

CREATE TABLE surveillance_alerts (
  alert_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type  alert_type NOT NULL, instrument_id UUID REFERENCES instruments,
  owner_groups UUID[] NOT NULL, score NUMERIC(10,4) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL, window_end TIMESTAMPTZ NOT NULL,
  evidence    JSONB NOT NULL, wal_seq_from BIGINT, wal_seq_to BIGINT,
  status      alert_status NOT NULL DEFAULT 'OPEN', assignee TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (window_end >= window_start)
);
CREATE INDEX ON surveillance_alerts (status, created_at DESC);

-- -------------------------------------------------------------------------------------
-- 11. Audit & data-access logs (append-only)
-- -------------------------------------------------------------------------------------
CREATE TABLE audit_log (
  id BIGSERIAL, at TIMESTAMPTZ NOT NULL DEFAULT now(), actor TEXT NOT NULL,
  table_name TEXT NOT NULL, op TEXT NOT NULL, row_pk TEXT, before JSONB, after JSONB,
  PRIMARY KEY (id, at)
);
SELECT create_hypertable('audit_log', 'at', chunk_time_interval => INTERVAL '7 days');
CREATE TRIGGER al_no_update BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE data_access_log (                            -- Reg ATS 301(b)(10) monitoring
  at TIMESTAMPTZ NOT NULL DEFAULT now(), actor TEXT NOT NULL, purpose TEXT NOT NULL,
  query_hash BYTEA NOT NULL, row_count INTEGER NOT NULL
);
SELECT create_hypertable('data_access_log', 'at', chunk_time_interval => INTERVAL '7 days');

-- -------------------------------------------------------------------------------------
-- 12. Row-level security (sketch)
-- -------------------------------------------------------------------------------------
-- Services set per-request context: SET LOCAL app.subscriber_id = '<uuid>'; SET LOCAL app.role = '<role>'.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_subscriber_read ON orders FOR SELECT
  USING (subscriber_id = current_setting('app.subscriber_id', true)::uuid);
CREATE POLICY orders_ops_read ON orders FOR SELECT
  USING (current_setting('app.role', true) IN ('ATS_OPS','COMPLIANCE','REGULATOR'));
CREATE POLICY orders_engine_write ON orders FOR ALL
  USING (current_setting('app.role', true) = 'ENGINE') WITH CHECK (current_setting('app.role', true) = 'ENGINE');
-- NOTE: role BD_DESK deliberately has no policy on orders/investors/compliance_decisions → zero rows
-- (confidential treatment of subscriber trading information, Rule 301(b)(10)).
CREATE POLICY investors_scoped ON investors FOR SELECT
  USING (subscriber_id = current_setting('app.subscriber_id', true)::uuid
         OR current_setting('app.role', true) IN ('COMPLIANCE','TA_OPS','REGULATOR'));
CREATE POLICY cd_scoped ON compliance_decisions FOR SELECT
  USING (current_setting('app.role', true) IN ('COMPLIANCE','ATS_OPS','REGULATOR'));
-- Hypertables (trades, cat_events, audit_log) support RLS on the root table; apply equivalent policies.
-- Grants: twe_app gets INSERT only on append-only tables; no role (including owner in app) is granted
-- UPDATE/DELETE there, and triggers above are the second line of defense. Table owner is a break-glass
-- role whose sessions are logged by pgaudit.
