import {
  pgTable, serial, bigserial, text, integer, bigint, boolean, timestamp, jsonb, index, uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";

// Prices are stored as integer cents and quantities as integer token units so that the
// matching engine stays deterministic (no floating point anywhere on the order path).

export const participants = pgTable("participants", {
  id: text().primaryKey(),
  name: text().notNull(),
  kind: text().notNull(), // institution | accredited | retail | market_maker | venue
  country: text().notNull(),
  accredited: boolean().notNull().default(false),
  kycStatus: text("kyc_status").notNull().default("approved"), // pending | approved | rejected
  sanctionsClear: boolean("sanctions_clear").notNull().default(true),
  wallet: text(),
  credentialId: text("credential_id"), // hash of W3C VC / soulbound credential, required for permissioned pairs
  cashCents: bigint("cash_cents", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const instruments = pgTable("instruments", {
  id: serial().primaryKey(),
  symbol: text().notNull().unique(),
  name: text().notNull(),
  assetClass: text("asset_class").notNull(), // equity | debt | real_estate | fund_lp | crypto
  tokenStandard: text("token_standard").notNull(), // ERC-3643 | ERC-1404 | DS-Protocol | ...
  issuancePlatform: text("issuance_platform").notNull(),
  chain: text().notNull(),
  regExemption: text("reg_exemption").notNull(), // reg_d_506c | reg_s | reg_a_tier2 | reg_cf | none
  permissioned: boolean().notNull().default(true),
  status: text().notNull().default("active"), // active | halted | frozen
  refPriceCents: integer("ref_price_cents").notNull(),
  tickCents: integer("tick_cents").notNull().default(1),
  lockupDays: integer("lockup_days").notNull().default(0),
  totalSupply: bigint("total_supply", { mode: "number" }).notNull().default(0),
  description: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial().primaryKey(),
  clOrdId: text("cl_ord_id").notNull(),
  participantId: text("participant_id").notNull().references(() => participants.id),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  side: text().notNull(), // buy | sell
  type: text().notNull(), // limit | market
  tif: text().notNull().default("gtc"), // gtc | ioc | day
  priceCents: integer("price_cents"),
  qty: integer().notNull(),
  leavesQty: integer("leaves_qty").notNull(),
  cumQty: integer("cum_qty").notNull().default(0),
  filledNotionalCents: bigint("filled_notional_cents", { mode: "number" }).notNull().default(0),
  status: text().notNull(), // new | partially_filled | filled | canceled | rejected
  rejectReason: text("reject_reason"),
  routing: text().notNull().default("internal"), // internal | sor
  source: text().notNull().default("web"), // web | fix | mm
  seq: bigint({ mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("orders_participant_clordid_idx").on(t.participantId, t.clOrdId),
  index("orders_book_idx").on(t.instrumentId, t.side, t.status),
]);

export const executions = pgTable("executions", {
  id: serial().primaryKey(),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  buyOrderId: integer("buy_order_id"),
  sellOrderId: integer("sell_order_id"),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  priceCents: integer("price_cents").notNull(),
  qty: integer().notNull(),
  aggressorSide: text("aggressor_side").notNull(),
  venue: text().notNull().default("TWE"),
  seq: bigint({ mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("executions_instrument_idx").on(t.instrumentId, t.createdAt)]);

// Append-only write-ahead journal. Every state transition on the order path is journaled
// with a monotonically increasing sequence so the book can be deterministically replayed.
export const wal = pgTable("wal", {
  seq: bigserial({ mode: "number" }).primaryKey(),
  instrumentId: integer("instrument_id"),
  eventType: text("event_type").notNull(),
  payload: jsonb().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const holdings = pgTable("holdings", {
  participantId: text("participant_id").notNull().references(() => participants.id),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  qty: bigint({ mode: "number" }).notNull().default(0),
  restrictedQty: bigint("restricted_qty", { mode: "number" }).notNull().default(0),
  restrictedUntil: timestamp("restricted_until"),
  frozen: boolean().notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.participantId, t.instrumentId] })]);

export const settlements = pgTable("settlements", {
  id: serial().primaryKey(),
  executionId: integer("execution_id").notNull().references(() => executions.id),
  instrumentId: integer("instrument_id").notNull(),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  qty: integer().notNull(),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  mode: text().notNull(), // onchain_atomic | offchain_t0 | offchain_t1
  rail: text().notNull(), // USDC | EURC | USDS | FEDWIRE | ACH | ESCROW
  status: text().notNull().default("matched"), // matched | locked | settled | failed
  failReason: text("fail_reason"),
  txRef: text("tx_ref"),
  dueAt: timestamp("due_at").notNull(),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("settlements_status_idx").on(t.status, t.dueAt)]);

export const venueRoutes = pgTable("venue_routes", {
  id: serial().primaryKey(),
  parentOrderId: integer("parent_order_id").notNull().references(() => orders.id),
  venue: text().notNull(),
  side: text().notNull(),
  qty: integer().notNull(),
  priceCents: integer("price_cents").notNull(),
  feeBps: integer("fee_bps").notNull(),
  score: integer().notNull(),
  mode: text().notNull(), // simulated | live
  status: text().notNull(), // filled | rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const surveillanceAlerts = pgTable("surveillance_alerts", {
  id: serial().primaryKey(),
  type: text().notNull(), // wash_trade | spoofing | layering | price_spike | front_running
  severity: text().notNull(), // low | medium | high
  participantId: text("participant_id"),
  instrumentId: integer("instrument_id"),
  details: jsonb().notNull(),
  status: text().notNull().default("open"), // open | dismissed | escalated
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Consolidated Audit Trail industry-member events, staged for submission.
export const catEvents = pgTable("cat_events", {
  id: serial().primaryKey(),
  eventType: text("event_type").notNull(), // MENO | MEOA | MEOR | MEOM | MEOC | MEOT ...
  orderId: integer("order_id"),
  participantId: text("participant_id"),
  instrumentId: integer("instrument_id"),
  payload: jsonb().notNull(),
  status: text().notNull().default("staged"), // staged | submitted
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActions = pgTable("admin_actions", {
  id: serial().primaryKey(),
  actor: text().notNull(),
  action: text().notNull(),
  target: text().notNull(),
  reason: text().notNull(),
  details: jsonb(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
