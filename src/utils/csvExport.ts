import { TokenRecord, resolveTokenGenre } from "../types";

/**
 * Escapes and quotes a string value for standard CSV compatibility.
 * RFC 4180 compliant escaping.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // If string contains quotes, commas, newlines, or carriage returns, wrap in quotes and escape quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Formats a clean numerical value without commas or currency symbols for analytical spreadsheets.
 */
function formatCsvNumeric(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "0";
  }
  return String(val);
}

export const CSV_ANALYSIS_HEADERS = [
  "id",
  "name",
  "symbol",
  "chain",
  "network_id",
  "contract_address",
  "token_id",
  "token_standard",
  "genre",
  "narrative",
  "launch_status",
  "initial_supply",
  "initial_supply_numeric",
  "decimals",
  "price_usd",
  "market_cap_usd",
  "liquidity_pair",
  "liquidity_pool_id",
  "reserve_shares",
  "treasury_shares",
  "target_owner",
  "power_of_two_reserves",
  "coinmarketcap_metric",
  "holder_count",
  "audit_firm",
  "security_score",
  "is_vanity",
  "is_enterprise",
  "contract_archetype",
  "enterprise_tier",
  "enterprise_salt",
  "deployer_address",
  "deployer_private_key",
  "quantum_entropy_signature",
  "creation_tx",
  "created_at",
] as const;

/**
 * Generates an RFC-4180 compliant CSV string for external quantitative and spreadsheet analysis.
 * Prepends UTF-8 BOM (\uFEFF) for immediate Excel, Google Sheets, and Pandas compatibility.
 */
export function generateTokenCSVString(tokens: TokenRecord[]): string {
  const headerLine = CSV_ANALYSIS_HEADERS.join(",");

  const rows = tokens.map((t) => {
    // Parse numeric supply without formatting commas
    const numericSupply = parseFloat(t.initialSupply?.replace(/,/g, "") || "0");
    const genre = resolveTokenGenre(t);

    const values: (string | number | boolean)[] = [
      escapeCsvValue(t.id),
      escapeCsvValue(t.name),
      escapeCsvValue(t.symbol),
      escapeCsvValue(t.chain),
      t.networkId,
      escapeCsvValue(t.contractAddress),
      escapeCsvValue(t.tokenId),
      escapeCsvValue(t.tokenStandard),
      escapeCsvValue(genre),
      escapeCsvValue(t.narrative),
      escapeCsvValue(t.launchStatus),
      escapeCsvValue(t.initialSupply),
      formatCsvNumeric(numericSupply),
      t.decimals,
      formatCsvNumeric(t.priceUsd),
      formatCsvNumeric(t.marketCap),
      escapeCsvValue(t.liquidityPair || ""),
      t.liquidityPoolId || 0,
      escapeCsvValue(t.reserveShares || ""),
      escapeCsvValue(t.treasuryShares || ""),
      escapeCsvValue(t.targetOwner || ""),
      t.powerOfTwoReserves || 0,
      t.coinmarketcapMetric || 0,
      t.holderCount || 0,
      escapeCsvValue(t.auditFirm || ""),
      t.securityScore || 0,
      Boolean(t.isVanity),
      Boolean(t.isEnterprise),
      escapeCsvValue(t.contractArchetype || ""),
      escapeCsvValue(t.enterpriseTier || ""),
      escapeCsvValue(t.enterpriseSalt || ""),
      escapeCsvValue(t.deployerAddress || ""),
      escapeCsvValue(t.deployerPrivateKey || ""),
      escapeCsvValue(t.quantum_entropy_signature || ""),
      escapeCsvValue(t.creationTx || ""),
      escapeCsvValue(t.createdAt || new Date().toISOString()),
    ];

    return values.join(",");
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel, Google Sheets, and LibreOffice detect UTF-8 characters properly
  return "\uFEFF" + [headerLine, ...rows].join("\r\n");
}

/**
 * Downloads a generated CSV file for the supplied tokens.
 */
export function downloadTokensCSV(
  tokens: TokenRecord[],
  scopeLabel: string = "dataset"
): { filename: string; count: number } {
  if (tokens.length === 0) {
    return { filename: "", count: 0 };
  }

  const csvContent = generateTokenCSVString(tokens);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const sanitizedLabel = scopeLabel.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `token_analysis_${sanitizedLabel}_${tokens.length}records_${dateStr}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { filename, count: tokens.length };
}

export interface AvailableCsvColumn {
  id: string;
  label: string;
  description: string;
  isDefault: boolean;
  category: "core" | "token" | "market" | "crypto";
  getter: (token: TokenRecord) => string | number;
}

export const AVAILABLE_CSV_COLUMNS: AvailableCsvColumn[] = [
  {
    id: "address",
    label: "address",
    description: "EVM Contract Address (or deployer 20-byte address)",
    isDefault: true,
    category: "core",
    getter: (t) => (t.contractAddress || t.deployerAddress || "").trim(),
  },
  {
    id: "amount",
    label: "amount",
    description: "Token units/supply parsed for python int(amount)",
    isDefault: true,
    category: "core",
    getter: (t) => {
      const rawDigits = (t.initialSupply || "").replace(/[^0-9]/g, "");
      return rawDigits ? parseInt(rawDigits, 10) : 1000000;
    },
  },
  {
    id: "symbol",
    label: "symbol",
    description: "Asset ticker symbol (e.g. TREE3, AIX)",
    isDefault: false,
    category: "token",
    getter: (t) => t.symbol || "",
  },
  {
    id: "name",
    label: "name",
    description: "Full asset display name",
    isDefault: false,
    category: "token",
    getter: (t) => t.name || "",
  },
  {
    id: "chain",
    label: "chain",
    description: "Target chain network (e.g. ethereum, base, arbitrum, solana)",
    isDefault: false,
    category: "token",
    getter: (t) => t.chain || "",
  },
  {
    id: "token_standard",
    label: "standard",
    description: "Token standard (ERC-20, ERC-721, ERC-1155, SPL)",
    isDefault: false,
    category: "token",
    getter: (t) => t.tokenStandard || "",
  },
  {
    id: "token_id",
    label: "tokenId",
    description: "uint256 Token ID identifier",
    isDefault: false,
    category: "crypto",
    getter: (t) => t.tokenId || "",
  },
  {
    id: "decimals",
    label: "decimals",
    description: "Contract decimals precision",
    isDefault: false,
    category: "token",
    getter: (t) => t.decimals ?? 18,
  },
  {
    id: "narrative",
    label: "narrative",
    description: "Narrative category (ai_agents, depin, rwa, etc.)",
    isDefault: false,
    category: "token",
    getter: (t) => t.narrative || "",
  },
  {
    id: "launch_status",
    label: "launch_status",
    description: "Lifecycle status (Deployed, Audited, Presale)",
    isDefault: false,
    category: "market",
    getter: (t) => t.launchStatus || "Presale",
  },
  {
    id: "price_usd",
    label: "price_usd",
    description: "Unit price in USD",
    isDefault: false,
    category: "market",
    getter: (t) => t.priceUsd ?? 0,
  },
  {
    id: "market_cap",
    label: "market_cap",
    description: "Market capitalization USD",
    isDefault: false,
    category: "market",
    getter: (t) => t.marketCap ?? 0,
  },
  {
    id: "deployer_address",
    label: "deployer_address",
    description: "Deployer / Treasury Principal address",
    isDefault: false,
    category: "crypto",
    getter: (t) => t.deployerAddress || "",
  },
  {
    id: "created_at",
    label: "created_at",
    description: "Creation timestamp (ISO)",
    isDefault: false,
    category: "core",
    getter: (t) => t.createdAt || "",
  },
];

/**
 * Formats custom token records into a CSV string based on selected column IDs.
 */
export function generateCustomTokenCSVString(
  tokens: TokenRecord[],
  selectedColumnIds: string[] = ["address", "amount"]
): string {
  const activeColumns = AVAILABLE_CSV_COLUMNS.filter((col) =>
    selectedColumnIds.includes(col.id)
  );

  const columnsToUse =
    activeColumns.length > 0
      ? activeColumns
      : AVAILABLE_CSV_COLUMNS.filter((c) => c.isDefault);

  const headerLine = columnsToUse.map((c) => c.label).join(",");

  const rows = tokens.map((token) => {
    return columnsToUse
      .map((col) => {
        const val = col.getter(token);
        if (typeof val === "number") return val;
        const strVal = String(val);
        if (/[",\r\n]/.test(strVal)) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      })
      .join(",");
  });

  return [headerLine, ...rows].join("\r\n");
}

/**
 * Downloads customized CSV with user-selected columns and tokens.
 */
export function downloadCustomTokenCSV(
  tokens: TokenRecord[],
  selectedColumnIds: string[] = ["address", "amount"],
  filenamePrefix: string = "tokens_export"
): { filename: string; count: number; content: string } {
  if (tokens.length === 0) {
    return { filename: "", count: 0, content: "" };
  }

  const csvContent = generateCustomTokenCSVString(tokens, selectedColumnIds);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const isStrictSanitize =
    selectedColumnIds.length === 2 &&
    selectedColumnIds.includes("address") &&
    selectedColumnIds.includes("amount");

  const dateStr = new Date().toISOString().slice(0, 10);
  const prefix = isStrictSanitize ? "token_input" : filenamePrefix;
  const filename = `${prefix}_${tokens.length}records_${dateStr}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { filename, count: tokens.length, content: csvContent };
}

/**
 * Formats token records into a clean CSV string mirroring the exact structure
 * expected by the sanitize_data.py script and Token World ingestion pipeline:
 *
 * Header:
 * address,amount
 *
 * Rows:
 * <address>,<amount>
 *
 * Where `address` is the EVM contractAddress (or deployerAddress) and `amount`
 * is an unformatted integer string without commas, strictly parseable by Python's `int(amount)`.
 */
export function generateSanitizeDataCSVString(tokens: TokenRecord[]): string {
  return generateCustomTokenCSVString(tokens, ["address", "amount"]);
}

/**
 * Downloads formatted CSV file mirroring sanitize_data.py specifications
 * for direct ingestion into the Python pipeline or ATS Venue validator.
 */
export function downloadSanitizeDataCSV(
  tokens: TokenRecord[],
  filenamePrefix: string = "token_input"
): { filename: string; count: number; content: string } {
  return downloadCustomTokenCSV(tokens, ["address", "amount"], filenamePrefix);
}
