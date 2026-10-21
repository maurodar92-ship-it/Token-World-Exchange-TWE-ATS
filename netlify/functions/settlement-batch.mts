import type { Config } from "@netlify/functions";
import { runSettlementBatch } from "../../lib/exchange.js";

// Asynchronous transfer-agent batch clearing for off-chain (T+0 / T+1) trades.
export default async () => {
  const results = await runSettlementBatch(false);
  console.log(`settlement batch: ${results.length} processed`);
};

export const config: Config = { schedule: "* * * * *" };
