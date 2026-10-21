// Pre-trade compliance gate. Every order passes through here before it can touch the book.
// Mirrors the on-chain ERC-3643 `canTransfer` checks so off-chain matches never produce
// trades that the token contract would refuse to settle.

export interface ParticipantProfile {
  id: string;
  kind: string;
  country: string;
  accredited: boolean;
  kycStatus: string;
  sanctionsClear: boolean;
  credentialId: string | null;
  cashCents: number;
}

export interface InstrumentProfile {
  symbol: string;
  status: string;
  regExemption: string;
  permissioned: boolean;
  refPriceCents: number;
  tickCents: number;
}

export interface Position {
  qty: number;
  restrictedQty: number;
  restrictedUntil: Date | null;
  frozen: boolean;
}

export interface CheckInput {
  participant: ParticipantProfile;
  instrument: InstrumentProfile;
  side: "buy" | "sell";
  type: "limit" | "market";
  qty: number;
  priceCents: number | null;
  position: Position | null;
  committedSellQty: number; // open sell leaves + unsettled sells
  committedBuyCents: number; // open buy notional + unsettled buys
  now: Date;
}

export const PRICE_COLLAR_PCT = 20;
export const REG_CF_MAX_ORDER_CENTS = 250_000; // $2,500 per order for non-accredited Reg CF investors
export const REG_A_TIER2_MAX_ORDER_CENTS = 2_500_000; // $25,000 per order for non-accredited Reg A+ Tier 2

export function preTradeCheck(input: CheckInput): string[] {
  const { participant: p, instrument: i, side, qty, now } = input;
  const reasons: string[] = [];

  if (!Number.isInteger(qty) || qty <= 0) reasons.push("Quantity must be a positive whole number of token units");
  if (p.kycStatus !== "approved") reasons.push("KYC/AML not approved");
  if (!p.sanctionsClear) reasons.push("Sanctions screening hit (OFAC SDN) — account blocked");
  if (i.status === "halted") reasons.push(`${i.symbol} is halted`);
  if (i.status === "frozen") reasons.push(`${i.symbol} is frozen by the transfer agent`);
  if (i.permissioned && !p.credentialId) reasons.push("Permissioned instrument: no verifiable credential bound to wallet");

  switch (i.regExemption) {
    case "reg_d_506c":
      if (!p.accredited) reasons.push("Reg D 506(c): verified accredited investor status required");
      break;
    case "reg_s":
      if (p.country === "US") reasons.push("Reg S: offshore transaction required — US persons excluded");
      break;
  }

  const refPrice = input.priceCents ?? i.refPriceCents;
  const notional = refPrice * qty;

  if (input.type === "limit") {
    if (input.priceCents === null || input.priceCents <= 0) reasons.push("Limit price required");
    else {
      if (input.priceCents % i.tickCents !== 0) reasons.push(`Price must be a multiple of the ${i.tickCents}¢ tick`);
      const band = (i.refPriceCents * PRICE_COLLAR_PCT) / 100;
      if (Math.abs(input.priceCents - i.refPriceCents) > band) {
        reasons.push(`Price outside ±${PRICE_COLLAR_PCT}% collar around reference ${(i.refPriceCents / 100).toFixed(2)}`);
      }
    }
  }

  if (side === "buy" && !p.accredited) {
    if (i.regExemption === "reg_cf" && notional > REG_CF_MAX_ORDER_CENTS) {
      reasons.push("Reg CF: non-accredited per-order limit $2,500 exceeded");
    }
    if (i.regExemption === "reg_a_tier2" && notional > REG_A_TIER2_MAX_ORDER_CENTS) {
      reasons.push("Reg A+ Tier 2: non-accredited per-order limit $25,000 exceeded");
    }
  }

  if (p.kind !== "venue") {
    if (side === "buy") {
      // Market buys are sized against a reference price plus the collar.
      const worst = input.type === "market" ? Math.ceil(i.refPriceCents * (1 + PRICE_COLLAR_PCT / 100)) * qty : notional;
      if (worst + input.committedBuyCents > p.cashCents) reasons.push("Insufficient buying power");
    } else {
      const pos = input.position;
      if (pos?.frozen) reasons.push("Position frozen by transfer agent");
      const restricted = pos && pos.restrictedUntil && pos.restrictedUntil > now ? pos.restrictedQty : 0;
      const available = (pos?.qty ?? 0) - restricted - input.committedSellQty;
      if (qty > available) {
        reasons.push(
          restricted > 0
            ? `Insufficient unrestricted tokens (${restricted} under Rule 144 lock-up until ${pos!.restrictedUntil!.toISOString().slice(0, 10)})`
            : "Insufficient tokens — short sales are not permitted on security tokens",
        );
      }
    }
  }

  return reasons;
}
