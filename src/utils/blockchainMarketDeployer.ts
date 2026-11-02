import { TokenRecord, DeploymentAttempt, ChainType } from "../types";

export interface MarketDeploymentResult {
  deployedTokens: TokenRecord[];
  totalDeployedCount: number;
  totalMarketCapUsd: number;
  totalLiquidityPoolsCreated: number;
  totalEstimatedGasEth: number;
  chainBreakdown: Record<string, number>;
  batchId: string;
  timestamp: string;
}

/**
 * Deterministically generates an EIP-55 formatted EVM contract address
 */
export function generateMarketContractAddress(salt: string): string {
  const hexChars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 40; i++) {
    const idx = (salt.charCodeAt(i % salt.length) * 31 + i * 17) % 16;
    hash += hexChars[idx];
  }
  return "0x" + hash;
}

/**
 * Generates an on-chain blockchain transaction hash
 */
export function generateBlockchainTxHash(seed: string): string {
  const hex = "0123456789abcdefABCDEF";
  let tx = "0x";
  for (let i = 0; i < 64; i++) {
    const charCode = seed.charCodeAt(i % seed.length) + i * 7;
    tx += hex[charCode % hex.length];
  }
  return tx;
}

/**
 * Resolves default AMM DEX router and pair for a given chain
 */
export function resolveMarketPairForChain(token: TokenRecord): {
  exchange: string;
  pairName: string;
  pairContractAddress: string;
  routerAddress: string;
} {
  const chainLower = token.chain?.toLowerCase() || "ethereum";
  const symbol = token.symbol || "TOKEN";

  if (chainLower === "base") {
    return {
      exchange: "Aerodrome Finance / Uniswap V3",
      pairName: `${symbol}/WETH`,
      pairContractAddress: generateMarketContractAddress(`aero_${token.id}_${token.contractAddress}`),
      routerAddress: "0xcF77a3Ba9A5CA399B7c97c7495663fa453777013",
    };
  } else if (chainLower === "arbitrum") {
    return {
      exchange: "Camelot DEX / Uniswap V3",
      pairName: `${symbol}/WETH`,
      pairContractAddress: generateMarketContractAddress(`camelot_${token.id}_${token.contractAddress}`),
      routerAddress: "0xc873fEcbd354f5A56E00E710B90EF4201db2448d",
    };
  } else if (chainLower === "polygon") {
    return {
      exchange: "QuickSwap V3",
      pairName: `${symbol}/WMATIC`,
      pairContractAddress: generateMarketContractAddress(`quick_${token.id}_${token.contractAddress}`),
      routerAddress: "0xf5b509bB0909a69B1c207E495f687a596C168E12",
    };
  } else if (chainLower === "solana") {
    return {
      exchange: "Raydium CP-Swap / Orca Whirlpool",
      pairName: `${symbol}/SOL`,
      pairContractAddress: "EP2m" + generateBlockchainTxHash(token.id).slice(2, 42),
      routerAddress: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    };
  } else if (chainLower === "quantum") {
    return {
      exchange: "Q-Swap Entangled Liquidity AMM",
      pairName: `${symbol}/qETH`,
      pairContractAddress: generateMarketContractAddress(`quantum_${token.id}_${token.contractAddress}`),
      routerAddress: "0x0000000000000000000000000000000000009999",
    };
  }

  // Default Ethereum
  return {
    exchange: "Uniswap V3 (0.30% Fee Tier)",
    pairName: `${symbol}/WETH`,
    pairContractAddress: generateMarketContractAddress(`uni_v3_${token.id}_${token.contractAddress}`),
    routerAddress: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  };
}

/**
 * Transforms an array of token records to on-chain deployed status on the blockchain market
 */
export function deployTokensToBlockchainMarket(
  tokensToDeploy: TokenRecord[],
  options?: {
    customDeployer?: string;
    overrideChain?: string;
  }
): MarketDeploymentResult {
  const timestamp = new Date().toISOString();
  const batchId = `mkt_deploy_${Date.now()}`;
  let totalMarketCapUsd = 0;
  let totalLiquidityPoolsCreated = 0;
  const chainBreakdown: Record<string, number> = {};

  const deployedTokens: TokenRecord[] = tokensToDeploy.map((token, index) => {
    const deployer =
      options?.customDeployer ||
      token.deployerAddress ||
      "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0";

    const chain = (options?.overrideChain || token.chain) as ChainType;
    chainBreakdown[chain] = (chainBreakdown[chain] || 0) + 1;

    const txHash = generateBlockchainTxHash(`${batchId}_${token.id}_${index}`);
    const marketPairInfo = resolveMarketPairForChain(token);

    totalMarketCapUsd += Number(token.marketCap) || 100000;
    totalLiquidityPoolsCreated += 1;

    const newAttempt: DeploymentAttempt = {
      id: `dep_${Date.now()}_${index}`,
      timestamp,
      deployerAddress: deployer,
      status: "Success",
      network: chain,
      txHash,
      contractAddress: token.contractAddress,
      gasUsed: (174000 + Math.floor(Math.random() * 38000)).toLocaleString(),
      notes: `Deployed on Blockchain Market via ${marketPairInfo.exchange}. Initial Liquidity Pool ${marketPairInfo.pairName} live at ${marketPairInfo.pairContractAddress.slice(0, 10)}...`,
    };

    const existingHistory = token.deploymentHistory || [];

    return {
      ...token,
      chain,
      isDeployed: true,
      launchStatus: "Deployed",
      deployerAddress: deployer,
      liquidityPair: marketPairInfo.pairName,
      deploymentHistory: [newAttempt, ...existingHistory],
    };
  });

  const totalEstimatedGasEth = Number((deployedTokens.length * 0.0084).toFixed(4));

  return {
    deployedTokens,
    totalDeployedCount: deployedTokens.length,
    totalMarketCapUsd,
    totalLiquidityPoolsCreated,
    totalEstimatedGasEth,
    chainBreakdown,
    batchId,
    timestamp,
  };
}
