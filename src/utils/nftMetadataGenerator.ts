import { TokenRecord, ChainType, TokenStandard } from "../types";
import { CHAIN_METADATA, CHAIN_NETWORK_MAP, NARRATIVE_METADATA_POOLS } from "./marketData";

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: "number" | "boost_percentage" | "boost_number" | "date";
  max_value?: number;
}

export interface NFTMarketplaceMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  animation_url?: string;
  background_color?: string;
  attributes: NFTAttribute[];
  properties: {
    category: string;
    files: Array<{ uri: string; type: string }>;
    creators?: Array<{ address: string; share: number }>;
    contract: {
      address: string;
      token_id: string;
      standard: TokenStandard;
      chain: string;
      network_id: number;
      deployer: string;
    };
    simulated_deployment: {
      total_gas_units: number;
      gas_cost_native: string;
      gas_cost_usd: number;
      success_rate_percentage: number;
      mempool_clearance_score: number;
      code_size_safety_score: number;
      block_gas_safety_score: number;
      bytecode_size_bytes: number;
      eip170_limit_bytes: number;
      solc_version: string;
      optimizer_runs: number;
      evm_target: string;
    };
    tokenomics: {
      initial_supply: string;
      decimals: number;
      market_cap_usd: number;
      simulated_price_usd: number;
      security_score: number;
      audit_firm: string;
      launch_status: string;
    };
  };
}

/**
 * Computes realistic simulated deployment gas and success statistics for any token record
 */
export function computeSimulatedDeploymentStats(token: TokenRecord) {
  const isL2 = token.chain === "base" || token.chain === "arbitrum";
  const bytecodeSize =
    token.tokenStandard === "ERC-721"
      ? 11450
      : token.tokenStandard === "ERC-1155"
      ? 9880
      : token.tokenStandard === "Quantum-Hybrid"
      ? 14890
      : 8520;

  const intrinsicGas = 21000;
  const codeDepositGas = Math.round(bytecodeSize * 200);
  const executionGas =
    token.tokenStandard === "ERC-721"
      ? 2240000
      : token.tokenStandard === "ERC-1155"
      ? 1980000
      : 1680000;
  const l1DataGas = isL2 ? 38000 : 0;
  const totalGasUnits = intrinsicGas + codeDepositGas + executionGas + l1DataGas;

  const baseFeeGwei =
    token.chain === "ethereum"
      ? 28.5
      : token.chain === "base"
      ? 0.008
      : token.chain === "arbitrum"
      ? 0.12
      : token.chain === "polygon"
      ? 35.0
      : 15.0;

  const priorityFeeGwei = token.chain === "ethereum" ? 2.0 : 0.001;
  const effectiveGwei = baseFeeGwei + priorityFeeGwei;

  const nativeCost = (totalGasUnits * effectiveGwei) / 1e9;
  const ethPriceUsd = 3120;
  const nativePriceUsd =
    token.chain === "polygon" ? 0.42 : token.chain === "solana" ? 145 : ethPriceUsd;
  const usdCost = nativeCost * nativePriceUsd;

  const maxEIP170 = 24576;
  const sizeRatio = bytecodeSize / maxEIP170;
  const codeSizeSafety = Number((Math.max(0, 1 - sizeRatio * 0.6) * 100).toFixed(1));
  const mempoolClearance = Number((98.5 - (token.chain === "ethereum" ? 3.0 : 0.8)).toFixed(1));
  const blockGasSafety = 99.2;
  const overallSuccessRate = Number(
    (codeSizeSafety * 0.35 + mempoolClearance * 0.35 + blockGasSafety * 0.3).toFixed(1)
  );

  const nativeSymbol =
    token.chain === "polygon"
      ? "POL"
      : token.chain === "solana"
      ? "SOL"
      : token.chain === "bitcoin"
      ? "BTC"
      : "ETH";

  return {
    bytecodeSize,
    totalGasUnits,
    nativeCostFormatted: `${nativeCost.toFixed(6)} ${nativeSymbol}`,
    usdCostFormatted: Number(usdCost.toFixed(2)),
    overallSuccessRate,
    mempoolClearance,
    codeSizeSafety,
    blockGasSafety,
  };
}

/**
 * Generates OpenSea / ERC-721 / ERC-1155 compliant NFT marketplace JSON metadata
 */
export function generateTokenNFTMetadata(
  token: TokenRecord,
  options?: {
    customImageUri?: string;
    animationUri?: string;
  }
): NFTMarketplaceMetadata {
  const chainMeta = CHAIN_METADATA[token.chain] || CHAIN_METADATA.ethereum;
  const narrativeInfo = NARRATIVE_METADATA_POOLS[token.narrative] || {
    label: "Emerging Web3 Paradigm",
    description: "Decentralized cryptographic protocol.",
  };
  const networkId = CHAIN_NETWORK_MAP[token.chain] || 1;

  const stats = computeSimulatedDeploymentStats(token);

  // Derive display ID
  const shortId =
    token.tokenId.length > 8
      ? `${token.tokenId.slice(0, 4)}...${token.tokenId.slice(-4)}`
      : token.tokenId;

  // On-chain SVG data URI fallback if custom image is not provided
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
    <rect width="800" height="800" fill="#0A0A0C"/>
    <defs>
      <radialGradient id="grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
        <stop offset="0%" stop-color="#F27D26" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#0A0A0C" stop-opacity="0.1"/>
      </radialGradient>
      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F27D26"/>
        <stop offset="100%" stop-color="#00F0FF"/>
      </linearGradient>
    </defs>
    <circle cx="400" cy="400" r="320" fill="url(#grad)"/>
    <circle cx="400" cy="400" r="280" fill="none" stroke="url(#lineGrad)" stroke-width="3" stroke-dasharray="8 6"/>
    <text x="400" y="340" fill="#FFFFFF" font-family="monospace" font-size="44" font-weight="bold" text-anchor="middle">${token.name}</text>
    <text x="400" y="400" fill="#F27D26" font-family="monospace" font-size="28" font-weight="bold" text-anchor="middle">${token.symbol} • ${token.tokenStandard}</text>
    <text x="400" y="450" fill="#8E9299" font-family="monospace" font-size="18" text-anchor="middle">${chainMeta.name.toUpperCase()} (ID: ${networkId})</text>
    <text x="400" y="520" fill="#34D399" font-family="monospace" font-size="16" text-anchor="middle">DEPLOYMENT SIMULATION: ${stats.overallSuccessRate}% SUCCESS</text>
    <text x="400" y="550" fill="#8E9299" font-family="monospace" font-size="14" text-anchor="middle">EST. GAS: ${stats.totalGasUnits.toLocaleString()} UNITS | ${stats.nativeCostFormatted}</text>
  </svg>`;

  const imageUri =
    options?.customImageUri || token.imageUrl || `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}`;

  const creationDateUnix = Math.floor(new Date(token.createdAt).getTime() / 1000);

  const attributes: NFTAttribute[] = [
    {
      trait_type: "Intended Blockchain",
      value: chainMeta.name,
    },
    {
      trait_type: "Token Standard",
      value: token.tokenStandard,
    },
    {
      trait_type: "Sector Narrative",
      value: narrativeInfo.label,
    },
    {
      trait_type: "Launch Status",
      value: token.launchStatus,
    },
    {
      trait_type: "Security Audit Score",
      value: token.securityScore,
      display_type: "number",
      max_value: 100,
    },
    {
      trait_type: "Audit Verification Firm",
      value: token.auditFirm,
    },
    {
      trait_type: "Vanity Contract Address",
      value: token.isVanity ? "Verified Vanity (Custom Entropy)" : "Standard Cryptographic Hash",
    },
    {
      trait_type: "Decimals",
      value: token.decimals,
      display_type: "number",
    },
    {
      trait_type: "Simulated Deployment Success Rate",
      value: stats.overallSuccessRate,
      display_type: "number",
      max_value: 100,
    },
    {
      trait_type: "Simulated Deployment Gas Units",
      value: stats.totalGasUnits,
      display_type: "number",
    },
    {
      trait_type: "Simulated Deployment Cost (USD)",
      value: stats.usdCostFormatted,
      display_type: "number",
    },
    {
      trait_type: "EVM Bytecode Size (Bytes)",
      value: stats.bytecodeSize,
      display_type: "number",
    },
    {
      trait_type: "EIP-170 Code Size Safety Score",
      value: stats.codeSizeSafety,
      display_type: "number",
      max_value: 100,
    },
    {
      trait_type: "Mempool Clearance Probability",
      value: stats.mempoolClearance,
      display_type: "number",
      max_value: 100,
    },
    {
      trait_type: "Genesis Creation Date",
      display_type: "date",
      value: creationDateUnix,
    },
  ];

  return {
    name: `${token.name} (${token.symbol}) #${shortId}`,
    description: `Official Genesis Metadata for **${token.name}** [${token.symbol}], an institutional-grade ${token.tokenStandard} protocol deployed to **${chainMeta.name}** (Chain ID: ${networkId}).\n\n### Deployment & Protocol Profile:\n- **Contract Standard:** ${token.tokenStandard}\n- **Narrative Sector:** ${narrativeInfo.label}\n- **Initial Supply:** ${token.initialSupply}\n- **Security Audit:** Certified by ${token.auditFirm} (Score: ${token.securityScore}/100)\n- **Simulated Gas Estimate:** ${stats.totalGasUnits.toLocaleString()} gas units (${stats.nativeCostFormatted} / ~$${stats.usdCostFormatted} USD)\n- **Deployment Success Rate:** ${stats.overallSuccessRate}% under EIP-1559 mempool conditions\n- **Bytecode Footprint:** ${stats.bytecodeSize} bytes (well within 24,576 byte EIP-170 Spurious Dragon ceiling)\n\nStructured for automated ingestion by OpenSea, LooksRare, Magic Eden, and ERC-721/1155 indexing pipelines.`,
    image: imageUri,
    external_url: `${chainMeta.explorerUrl}${token.contractAddress}`,
    animation_url: options?.animationUri,
    background_color: "0A0A0C",
    attributes,
    properties: {
      category: "smart_contract_asset",
      files: [
        {
          uri: imageUri,
          type: "image/svg+xml",
        },
      ],
      creators: [
        {
          address: token.deployerAddress,
          share: 100,
        },
      ],
      contract: {
        address: token.contractAddress,
        token_id: token.tokenId,
        standard: token.tokenStandard,
        chain: token.chain,
        network_id: networkId,
        deployer: token.deployerAddress,
      },
      simulated_deployment: {
        total_gas_units: stats.totalGasUnits,
        gas_cost_native: stats.nativeCostFormatted,
        gas_cost_usd: stats.usdCostFormatted,
        success_rate_percentage: stats.overallSuccessRate,
        mempool_clearance_score: stats.mempoolClearance,
        code_size_safety_score: stats.codeSizeSafety,
        block_gas_safety_score: stats.blockGasSafety,
        bytecode_size_bytes: stats.bytecodeSize,
        eip170_limit_bytes: 24576,
        solc_version: "v0.8.24+commit.e11b9ed9",
        optimizer_runs: 200,
        evm_target: "cancun",
      },
      tokenomics: {
        initial_supply: token.initialSupply,
        decimals: token.decimals,
        market_cap_usd: token.marketCap,
        simulated_price_usd: token.priceUsd,
        security_score: token.securityScore,
        audit_firm: token.auditFirm,
        launch_status: token.launchStatus,
      },
    },
  };
}
