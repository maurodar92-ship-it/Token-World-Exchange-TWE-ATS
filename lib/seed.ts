// Sandbox reference data: fictional issuers tokenised on each primary platform, a designated
// market maker that keeps two-sided quotes, and investor archetypes that exercise every
// compliance rule (accredited, retail, Reg S offshore, sanctioned).

import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { executions, holdings, instruments, orders, participants, wal } from "../db/schema.js";
import { VENUES } from "./venues.js";

const CREDENTIAL = (id: string) => `vc:twe:${id.toLowerCase()}:kyc-accreditation-2026`;
const WALLET = (n: number) => `0x${(0x7e1a00 + n).toString(16)}${"c0ffee".repeat(5)}${n.toString(16).padStart(4, "0")}`.slice(0, 42);

export const MM_ID = "MM-01";

const PARTICIPANTS = [
  { id: MM_ID, name: "Meridian Liquidity Partners (DMM)", kind: "market_maker", country: "US", accredited: true, credentialId: CREDENTIAL("mm-01"), wallet: WALLET(1), cashCents: 50_000_000_000 },
  { id: "INST-01", name: "Halcyon Asset Management", kind: "institution", country: "US", accredited: true, credentialId: CREDENTIAL("inst-01"), wallet: WALLET(2), cashCents: 2_500_000_000 },
  { id: "ACC-01", name: "Jordan Reyes (Accredited)", kind: "accredited", country: "US", accredited: true, credentialId: CREDENTIAL("acc-01"), wallet: WALLET(3), cashCents: 50_000_000 },
  { id: "RET-01", name: "Sam Okafor (Retail)", kind: "retail", country: "US", accredited: false, credentialId: CREDENTIAL("ret-01"), wallet: null, cashCents: 2_000_000 },
  { id: "OFF-01", name: "Lumen Capital Pte. (Singapore)", kind: "institution", country: "SG", accredited: true, credentialId: CREDENTIAL("off-01"), wallet: WALLET(5), cashCents: 900_000_000 },
  { id: "SAN-01", name: "Test Entity — OFAC hit", kind: "retail", country: "US", accredited: false, credentialId: null, wallet: null, cashCents: 1_000_000, sanctionsClear: false },
  ...VENUES.map((v) => ({ id: `VENUE-${v.id}`, name: v.name, kind: "venue", country: "US", accredited: true, credentialId: `venue:${v.id}`, wallet: null, cashCents: 0 })),
];

const INSTRUMENTS = [
  { symbol: "AURA", name: "Aurora Robotics — Series C Preferred", assetClass: "equity", tokenStandard: "ERC-3643 (T-REX)", issuancePlatform: "Tokeny Systems", chain: "Polygon", regExemption: "reg_d_506c", refPriceCents: 4_250, tickCents: 1, lockupDays: 0, totalSupply: 2_000_000, description: "Late-stage private robotics issuer. ONCHAINID claims gate every transfer." },
  { symbol: "CBLT", name: "Cobalt Infrastructure REIT — Class A", assetClass: "equity", tokenStandard: "DS Protocol", issuancePlatform: "Securitize", chain: "Ethereum", regExemption: "reg_a_tier2", refPriceCents: 1_015, tickCents: 1, lockupDays: 0, totalSupply: 10_000_000, description: "Reg A+ Tier 2 REIT; Securitize acts as digital transfer agent." },
  { symbol: "HGB28", name: "Hanseatic Green Bond 4.25% 2028", assetClass: "debt", tokenStandard: "ERC-20 + Token Tool compliance", issuancePlatform: "Bitbond", chain: "Off-chain ledger", regExemption: "reg_s", refPriceCents: 9_840, tickCents: 5, lockupDays: 0, totalSupply: 500_000, description: "Bearer-style eWpG crypto-security; semi-annual coupon distribution. Offshore (Reg S) only." },
  { symbol: "BRKL", name: "Brickell Tower Prop-Token", assetClass: "real_estate", tokenStandard: "BST (Blocksquare)", issuancePlatform: "Blocksquare / Oceanpoint", chain: "Ethereum", regExemption: "reg_d_506c", refPriceCents: 5_200, tickCents: 5, lockupDays: 0, totalSupply: 100_000, description: "Fractional Miami Class-A office; monthly rent distributions in USDC." },
  { symbol: "ALGV", name: "Algarve Resort Holdings", assetClass: "real_estate", tokenStandard: "ERC-1404", issuancePlatform: "DigiShares", chain: "Polygon", regExemption: "reg_s", refPriceCents: 2_380, tickCents: 1, lockupDays: 0, totalSupply: 400_000, description: "Portuguese hospitality SPV; multi-jurisdiction cap table synced from DigiShares." },
  { symbol: "NWVF1", name: "Northwind Ventures Fund I — LP Interest", assetClass: "fund_lp", tokenStandard: "V-Token", issuancePlatform: "Vertalo", chain: "Off-chain ledger", regExemption: "reg_d_506c", refPriceCents: 112_500, tickCents: 25, lockupDays: 0, totalSupply: 8_000, description: "Ledger-agnostic LP units; Vertalo is book of record." },
  { symbol: "FHC", name: "Fieldhouse Coffee Co. — Crowd SAFE Units", assetClass: "equity", tokenStandard: "ERC-1404", issuancePlatform: "Republic", chain: "Ethereum", regExemption: "reg_cf", refPriceCents: 325, tickCents: 1, lockupDays: 365, totalSupply: 3_000_000, description: "Reg CF raise; purchases are subject to a 12-month resale restriction (Rule 501 of Reg CF)." },
  { symbol: "PHEL", name: "Provenance HELOC Pool 2026-A", assetClass: "debt", tokenStandard: "Provenance Marker", issuancePlatform: "Figure", chain: "Provenance", regExemption: "reg_d_506c", refPriceCents: 10_060, tickCents: 5, lockupDays: 0, totalSupply: 250_000, description: "Securitised home-equity lines, native to Provenance Blockchain." },
  { symbol: "ETH-USDC", name: "Ether / USD Coin", assetClass: "crypto", tokenStandard: "Native", issuancePlatform: "—", chain: "Ethereum", regExemption: "none", permissioned: false, refPriceCents: 381_000, tickCents: 10, lockupDays: 0, totalSupply: 0, description: "Crypto spot pair, atomic USDC settlement." },
  { symbol: "SOL-USDC", name: "Solana / USD Coin", assetClass: "crypto", tokenStandard: "Native", issuancePlatform: "—", chain: "Solana", regExemption: "none", permissioned: false, refPriceCents: 18_240, tickCents: 1, lockupDays: 0, totalSupply: 0, description: "Crypto spot pair, atomic USDC settlement." },
];

function lotSize(refPriceCents: number) {
  return Math.max(1, Math.round(2_000_000 / refPriceCents / 5) * 5 || 1);
}

/** Cancel the market maker's resting quotes and post a fresh 6-level ladder around the reference price. */
export async function replenishLiquidity(symbols?: string[]) {
  const insts = symbols?.length
    ? await db.select().from(instruments).where(inArray(instruments.symbol, symbols))
    : await db.select().from(instruments);
  for (const inst of insts) {
    if (inst.status !== "active") continue;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${inst.id})`);
      await tx.update(orders).set({ status: "canceled", leavesQty: 0, updatedAt: new Date() }).where(and(
        eq(orders.participantId, MM_ID), eq(orders.instrumentId, inst.id), inArray(orders.status, ["new", "partially_filled"]),
      ));
      const step = Math.max(inst.tickCents, Math.round((inst.refPriceCents * 0.0015) / inst.tickCents) * inst.tickCents);
      const lot = lotSize(inst.refPriceCents);
      const rows = [];
      for (let lvl = 1; lvl <= 6; lvl++) {
        for (const side of ["buy", "sell"] as const) {
          const px = inst.refPriceCents + (side === "buy" ? -1 : 1) * step * lvl;
          rows.push({ side, px, qty: lot * (lvl + (lvl % 3)) });
        }
      }
      const seqs = await tx.insert(wal).values(rows.map((r) => ({
        instrumentId: inst.id, eventType: "ORDER_ACCEPTED", payload: { participantId: MM_ID, side: r.side, priceCents: r.px, qty: r.qty, source: "mm" },
      }))).returning({ seq: wal.seq });
      await tx.insert(orders).values(rows.map((r, i) => ({
        clOrdId: `MM-${inst.symbol}-${seqs[i].seq}`, participantId: MM_ID, instrumentId: inst.id, side: r.side, type: "limit",
        tif: "gtc", priceCents: r.px, qty: r.qty, leavesQty: r.qty, status: "new", source: "mm", seq: seqs[i].seq,
      })));
    });
  }
}

export async function ensureSeeded() {
  const [{ n }] = await db.select({ n: count() }).from(participants);
  if (n > 0) return false;
  const seeded = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    const [{ n: again }] = await tx.select({ n: count() }).from(participants);
    if (again > 0) return false;
    await tx.insert(participants).values(PARTICIPANTS);
    const insts = await tx.insert(instruments).values(INSTRUMENTS).returning();
    const bySym = Object.fromEntries(insts.map((i) => [i.symbol, i]));

    const pos: (typeof holdings.$inferInsert)[] = insts.map((i) => ({ participantId: MM_ID, instrumentId: i.id, qty: lotSize(i.refPriceCents) * 400 }));
    pos.push(
      { participantId: "INST-01", instrumentId: bySym.AURA.id, qty: 12_000 },
      { participantId: "INST-01", instrumentId: bySym.PHEL.id, qty: 900 },
      { participantId: "ACC-01", instrumentId: bySym.BRKL.id, qty: 150 },
      { participantId: "ACC-01", instrumentId: bySym.CBLT.id, qty: 2_000 },
      { participantId: "OFF-01", instrumentId: bySym.HGB28.id, qty: 1_500 },
      { participantId: "OFF-01", instrumentId: bySym.ALGV.id, qty: 4_000 },
      { participantId: "RET-01", instrumentId: bySym.FHC.id, qty: 600, restrictedQty: 400, restrictedUntil: new Date(Date.now() + 140 * 86_400_000) },
      { participantId: "RET-01", instrumentId: bySym["SOL-USDC"].id, qty: 12 },
    );
    await tx.insert(holdings).values(pos);

    // Six hours of historical prints for charting (already settled, outside the settlement queue).
    const now = Date.now();
    const hist = [];
    for (const i of insts) {
      let px = i.refPriceCents * 0.97;
      for (let k = 72; k >= 1; k--) {
        px = px * (1 + Math.sin(k * 0.7 + i.id) * 0.004 + (i.refPriceCents - px) / i.refPriceCents * 0.08);
        const p = Math.max(i.tickCents, Math.round(px / i.tickCents) * i.tickCents);
        hist.push({ instrumentId: i.id, buyerId: k % 2 ? "INST-01" : MM_ID, sellerId: k % 2 ? MM_ID : "INST-01", priceCents: p,
          qty: Math.max(1, Math.round(lotSize(i.refPriceCents) * (0.4 + ((k * 7) % 10) / 6))), aggressorSide: k % 2 ? "buy" : "sell",
          venue: "TWE", seq: 0, createdAt: new Date(now - k * 5 * 60_000) });
      }
    }
    await tx.insert(executions).values(hist);
    await tx.insert(wal).values({ instrumentId: null, eventType: "GENESIS", payload: { participants: PARTICIPANTS.length, instruments: insts.length } });
    return true;
  });
  if (seeded) await replenishLiquidity();
  return seeded;
}
