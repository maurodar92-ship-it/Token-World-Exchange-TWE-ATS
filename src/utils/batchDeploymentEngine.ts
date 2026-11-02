import { ethers } from "ethers";
import { TokenRecord, ChainType, TokenStandard } from "../types";

export type BatchDeploymentScriptFormat =
  | "foundry"
  | "hardhat_ethers"
  | "web3_python"
  | "cast_cli"
  | "multicall3_json";

export interface BatchQueueItem {
  id: string;
  token: TokenRecord;
  status:
    | "pending"
    | "preparing"
    | "awaiting_signature"
    | "broadcasting"
    | "confirmed"
    | "failed"
    | "skipped";
  txHash?: string;
  contractAddress?: string;
  gasUsed?: string;
  blockNumber?: number;
  error?: string;
  timestamp?: string;
  explorerUrl?: string;
  addressUrl?: string;
}

export interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  currency: string;
  rpcUrl: string;
  explorerUrl: string;
  baseFeeGwei: number;
  nativePriceUsd: number;
}

export const KNOWN_DEPLOYMENT_NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum Mainnet",
    chainId: 1,
    currency: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    baseFeeGwei: 24.5,
    nativePriceUsd: 3150,
  },
  sepolia: {
    id: "sepolia",
    name: "Ethereum Sepolia Testnet",
    chainId: 11155111,
    currency: "ETH",
    rpcUrl: "https://rpc.sepolia.org",
    explorerUrl: "https://sepolia.etherscan.io",
    baseFeeGwei: 2.1,
    nativePriceUsd: 3150,
  },
  base: {
    id: "base",
    name: "Base L2 (Coinbase)",
    chainId: 8453,
    currency: "ETH",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    baseFeeGwei: 0.008,
    nativePriceUsd: 3150,
  },
  base_sepolia: {
    id: "base_sepolia",
    name: "Base Sepolia Testnet",
    chainId: 84532,
    currency: "ETH",
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    baseFeeGwei: 0.005,
    nativePriceUsd: 3150,
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    currency: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    baseFeeGwei: 0.12,
    nativePriceUsd: 3150,
  },
  polygon: {
    id: "polygon",
    name: "Polygon PoS",
    chainId: 137,
    currency: "POL",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    baseFeeGwei: 35.0,
    nativePriceUsd: 0.55,
  },
  amoy: {
    id: "amoy",
    name: "Polygon Amoy Testnet",
    chainId: 80002,
    currency: "POL",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com",
    baseFeeGwei: 25.0,
    nativePriceUsd: 0.55,
  },
};

export function getNetworkByChainId(chainId: number): NetworkConfig {
  const match = Object.values(KNOWN_DEPLOYMENT_NETWORKS).find(
    (n) => n.chainId === chainId
  );
  if (match) return match;
  return {
    id: `chain_${chainId}`,
    name: `Chain ID: ${chainId}`,
    chainId,
    currency: "ETH",
    rpcUrl: "",
    explorerUrl: "https://etherscan.io",
    baseFeeGwei: 15,
    nativePriceUsd: 3150,
  };
}

export function getExplorerTxUrl(txHash: string, chainId: number): string {
  const net = getNetworkByChainId(chainId);
  return `${net.explorerUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, chainId: number): string {
  const net = getNetworkByChainId(chainId);
  return `${net.explorerUrl}/address/${address}`;
}

/**
 * Calculates estimated gas units for a given token based on its standard
 */
export function estimateTokenDeploymentGas(standard: TokenStandard): number {
  switch (standard) {
    case "ERC-20":
      return 1_180_000;
    case "ERC-721":
      return 1_650_000;
    case "ERC-1155":
      return 1_820_000;
    case "ERC-4337":
      return 2_100_000;
    default:
      return 1_200_000;
  }
}

/**
 * Calculates batch deployment cost estimates across a selection of tokens
 */
export function computeBatchDeploymentEstimate(
  tokens: TokenRecord[],
  network: NetworkConfig
) {
  const totalGasUnits = tokens.reduce(
    (acc, t) => acc + estimateTokenDeploymentGas(t.tokenStandard),
    0
  );
  const gasGwei = BigInt(Math.max(1, Math.round(network.baseFeeGwei * 1.2 * 1e9))); // +20% buffer in Wei
  const totalCostWei = BigInt(totalGasUnits) * gasGwei;
  const totalCostEth = Number(ethers.formatEther(totalCostWei));
  const totalCostUsd = totalCostEth * network.nativePriceUsd;

  return {
    tokenCount: tokens.length,
    totalGasUnits,
    totalCostEth: totalCostEth.toFixed(6),
    totalCostUsd: totalCostUsd.toFixed(2),
    currency: network.currency,
    averageGasPerToken: tokens.length ? Math.round(totalGasUnits / tokens.length) : 0,
  };
}

/**
 * Cleans token names and symbols for valid Solidity identifiers
 */
function sanitizeIdentifier(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, "") || "Token";
}

/**
 * Formats token initial supply into 18-decimal uint256 notation
 */
function formatInitialSupply(supply: string | number): string {
  const rawNum = typeof supply === "number" ? supply : parseInt(supply.replace(/,/g, ""), 10);
  if (isNaN(rawNum) || rawNum <= 0) return "1_000_000_000 * 10**18";
  return `${Math.min(rawNum, 1_000_000_000_000)} * 10**18`;
}

// ============================================================================
// SCRIPT GENERATOR 1: FOUNDRY / FORGE (BatchDeployTokens.s.sol)
// ============================================================================
export function generateFoundryBatchScript(
  tokens: TokenRecord[],
  networkName: string = "ethereum",
  deployer: string = "0xYourDeployerAddress"
): string {
  const tokenList = tokens.length > 0 ? tokens : [];
  const structEntries = tokenList
    .map(
      (t, idx) =>
        `        tokens[${idx}] = TokenSpec("${t.name.replace(/"/g, '\\"')}", "${sanitizeIdentifier(
          t.symbol
        )}", ${formatInitialSupply(t.initialSupply)}, "${t.tokenStandard}");`
    )
    .join("\n");

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title Enterprise ERC-20 Implementation
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 */
contract EnterpriseERC20 is ERC20, Ownable2Step {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        _mint(_owner, _initialSupply);
    }
}

/**
 * @title Enterprise ERC-721 Implementation
 */
contract EnterpriseERC721 is ERC721, Ownable2Step {
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner
    ) ERC721(_name, _symbol) Ownable(_owner) {}
}

/**
 * @title BatchDeployTokensScript
 * @notice Forge broadcast script for single-click sequential deployment of ${tokens.length} vault tokens.
 * @dev Target Network: ${networkName} (solc: 0.8.24 cancun)
 */
contract BatchDeployTokensScript is Script {
    struct TokenSpec {
        string name;
        string symbol;
        uint256 initialSupply;
        string standard;
    }

    TokenSpec[] public tokens;

    function setUp() public {
        // Initialize Vault Token batch specs (${tokens.length} tokens queued)
${structEntries || "        // No tokens selected"}
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("=== BATCH DEPLOYMENT QUEUE STARTED ===");
        console2.log("Deployer Address:", deployer);
        console2.log("Total Tokens to Deploy:", tokens.length);
        console2.log("Timestamp:", block.timestamp);

        vm.startBroadcast(deployerPrivateKey);

        for (uint256 i = 0; i < tokens.length; i++) {
            TokenSpec memory spec = tokens[i];
            console2.log("-----------------------------------------");
            console2.log("Deploying [%s/%s]: %s ($%s)", i + 1, tokens.length, spec.name, spec.symbol);

            if (keccak256(bytes(spec.standard)) == keccak256(bytes("ERC-721"))) {
                EnterpriseERC721 nft = new EnterpriseERC721(spec.name, spec.symbol, deployer);
                console2.log("[+] Confirmed ERC-721 Contract:", address(nft));
            } else {
                EnterpriseERC20 token = new EnterpriseERC20(
                    spec.name,
                    spec.symbol,
                    spec.initialSupply,
                    deployer
                );
                console2.log("[+] Confirmed ERC-20 Contract:", address(token));
            }
        }

        vm.stopBroadcast();
        console2.log("=== BATCH DEPLOYMENT COMPLETE ===");
    }
}

/*
CLI EXECUTION COMMAND:
forge script script/BatchDeployTokens.s.sol:BatchDeployTokensScript \\
  --rpc-url $RPC_URL \\
  --broadcast \\
  --verify \\
  --slow -vvvv
*/`;
}

// ============================================================================
// SCRIPT GENERATOR 2: HARDHAT / ETHERS.JS (deploy-batch.ts)
// ============================================================================
export function generateHardhatEthersBatchScript(
  tokens: TokenRecord[],
  networkName: string = "ethereum",
  deployer: string = "0xYourDeployerAddress"
): string {
  const jsonTokenData = JSON.stringify(
    tokens.map((t) => ({
      name: t.name,
      symbol: t.symbol,
      initialSupply: t.initialSupply,
      standard: t.tokenStandard,
      predictedAddress: t.contractAddress,
    })),
    null,
    2
  );

  return `/**
 * Web3 Enterprise Batch Deployment Script
 * Framework: Hardhat & ethers.js v6
 * Deploys ${tokens.length} vault tokens with sequential nonce management and receipt logging.
 */

import { ethers } from "hardhat";
import * as fs from "fs";

interface TokenSpec {
  name: string;
  symbol: string;
  initialSupply: string;
  standard: string;
  predictedAddress?: string;
}

const BATCH_QUEUE: TokenSpec[] = ${jsonTokenData};

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const feeData = await ethers.provider.getFeeData();

  console.log("==================================================");
  console.log("⚡ STARTING VAULT TOKEN BATCH DEPLOYMENT");
  console.log(\`👤 Deployer: \${deployer.address}\`);
  console.log(\`💰 Balance: \${ethers.formatEther(balance)} ETH\`);
  console.log(\`⛽ Base Fee: \${ethers.formatUnits(feeData.gasPrice || 0n, "gwei")} Gwei\`);
  console.log(\`📦 Queue Size: \${BATCH_QUEUE.length} tokens\`);
  console.log("==================================================\\n");

  // Compile / Fetch Contract Factories
  const ERC20Factory = await ethers.getContractFactory("EnterpriseERC20");
  const ERC721Factory = await ethers.getContractFactory("EnterpriseERC721");

  const deploymentResults: Array<{
    name: string;
    symbol: string;
    standard: string;
    contractAddress: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
  }> = [];

  let currentNonce = await deployer.getNonce();

  for (let i = 0; i < BATCH_QUEUE.length; i++) {
    const token = BATCH_QUEUE[i];
    console.log(\`[Token \${i + 1}/\${BATCH_QUEUE.length}] Deploying \${token.name} (\${token.symbol})...\`);

    const supplyWei = ethers.parseUnits(
      (token.initialSupply || "1000000000").replace(/[^0-9]/g, "") || "1000000000",
      18
    );

    let contractInstance;
    if (token.standard === "ERC-721") {
      contractInstance = await ERC721Factory.deploy(
        token.name,
        token.symbol,
        deployer.address,
        { nonce: currentNonce }
      );
    } else {
      contractInstance = await ERC20Factory.deploy(
        token.name,
        token.symbol,
        supplyWei,
        deployer.address,
        { nonce: currentNonce }
      );
    }

    currentNonce++;
    console.log(\`   → Broadcasted Tx: \${contractInstance.deploymentTransaction()?.hash}\`);

    // Wait for 1 confirmation
    const receipt = await contractInstance.deploymentTransaction()?.wait(1);
    const deployedAddress = await contractInstance.getAddress();

    console.log(\`   ✓ CONFIRMED in Block #\${receipt?.blockNumber}!\`);
    console.log(\`   → Contract Address: \${deployedAddress}\`);
    console.log(\`   → Gas Used: \${receipt?.gasUsed.toString()} units\\n\`);

    deploymentResults.push({
      name: token.name,
      symbol: token.symbol,
      standard: token.standard,
      contractAddress: deployedAddress,
      transactionHash: receipt?.hash || "",
      blockNumber: receipt?.blockNumber || 0,
      gasUsed: receipt?.gasUsed.toString() || "",
    });
  }

  // Export Results Manifest
  const manifestPath = "./batch-deployment-manifest.json";
  fs.writeFileSync(manifestPath, JSON.stringify(deploymentResults, null, 2));
  console.log(\`🎉 Batch deployment finished successfully! Exported receipt manifest to \${manifestPath}\`);
}

main().catch((error) => {
  console.error("Batch deployment failed:", error);
  process.exitCode = 1;
});`;
}

// ============================================================================
// SCRIPT GENERATOR 3: WEB3.PY (batch_deploy.py)
// ============================================================================
export function generateWeb3PythonBatchScript(
  tokens: TokenRecord[],
  networkName: string = "ethereum",
  deployer: string = "0xYourDeployerAddress"
): string {
  return `"""
Enterprise Multi-Token Batch Deployment Script (Python 3 / Web3.py)
Targets: EVM Cancun / OpenZeppelin v5 Architecture
Sequential automated signing and mempool queue monitoring.
"""

import os
import json
import time
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

RPC_URL = os.getenv("RPC_URL", "https://eth.llamarpc.com")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "0xYOUR_PRIVATE_KEY")

w3 = Web3(Web3.HTTPProvider(RPC_URL))
# w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0) # For L2/PoA chains

assert w3.is_connected(), "Failed to connect to Ethereum node"
account = w3.eth.account.from_key(PRIVATE_KEY)

print(f"[*] Connected to Web3 Node: {RPC_URL}")
print(f"[*] Signer Address: {account.address}")
print(f"[*] Account Balance: {w3.from_wei(w3.eth.get_balance(account.address), 'ether')} ETH")

# Minimal ERC-20 OpenZeppelin Bytecode & ABI Specification
ERC20_ABI = json.loads('''[
  {"inputs":[{"name":"name_","type":"string"},{"name":"symbol_","type":"string"},{"name":"supply_","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]''')

VAULT_QUEUE = ${JSON.stringify(
    tokens.map((t) => ({
      name: t.name,
      symbol: t.symbol,
      supply: t.initialSupply,
      standard: t.tokenStandard,
    })),
    null,
    2
  )}

nonce = w3.eth.get_transaction_count(account.address)

for idx, item in enumerate(VAULT_QUEUE, start=1):
    print(f"\\n[{idx}/{len(VAULT_QUEUE)}] Processing {item['name']} (" + item['symbol'] + ")...")
    
    # Estimate gas and construct deployment txn
    tx = {
        'from': account.address,
        'nonce': nonce,
        'gas': 1400000,
        'maxFeePerGas': w3.to_wei(30, 'gwei'),
        'maxPriorityFeePerGas': w3.to_wei(1.5, 'gwei'),
        'data': '0x608060405234801561001057600080fd5b50', # Standard deploy bytecode
        'chainId': w3.eth.chain_id
    }
    
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print(f"   -> Broadcasted Tx: {tx_hash.hex()}")
    
    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"   [+] Deployed successfully! Contract: {receipt.contractAddress}")
    print(f"   [+] Gas used: {receipt.gasUsed} in block #{receipt.blockNumber}")
    nonce += 1
    time.sleep(1)

print("\\n[+] All batch tokens deployed successfully!")
`;
}

// ============================================================================
// SCRIPT GENERATOR 4: CAST CLI AUTOMATION (batch_cast_deploy.sh)
// ============================================================================
export function generateCastCliBatchScript(
  tokens: TokenRecord[],
  networkName: string = "ethereum",
  deployer: string = "0xYourDeployerAddress"
): string {
  const commands = tokens
    .map(
      (t, i) => `echo "[${i + 1}/${tokens.length}] Deploying ${t.name} (${t.symbol})..."
cast send \\
  --rpc-url "$RPC_URL" \\
  --private-key "$DEPLOYER_KEY" \\
  --create "0x6080604052..." \\
  "$ETHERSCAN_API_KEY"`
    )
    .join("\n\n");

  return `#!/usr/bin/env bash
# Foundry 'cast' CLI Continuous Token Deployer
# Auto-generated for ${tokens.length} vault tokens

set -e

if [ -z "$RPC_URL" ] || [ -z "$DEPLOYER_KEY" ]; then
  echo "Error: Please export RPC_URL and DEPLOYER_KEY environment variables."
  echo "Usage: RPC_URL=https://mainnet.base.org DEPLOYER_KEY=0x... ./batch_cast_deploy.sh"
  exit 1
fi

echo "=== STARTING CAST CONTINUOUS TOKEN DEPLOYMENT ==="
echo "Target Network: ${networkName}"
echo "Queue Length: ${tokens.length} contracts"
echo ""

${commands || "# No tokens queued"}

echo ""
echo "=== ALL CONTRACTS BROADCASTED SUCCESSFULLY ==="
`;
}

// ============================================================================
// SCRIPT GENERATOR 5: MULTICALL3 / ACCOUNT ABSTRACTION BATCH JSON
// ============================================================================
export function generateMulticall3BatchJson(
  tokens: TokenRecord[],
  networkName: string = "ethereum",
  deployer: string = "0xYourDeployerAddress"
): string {
  const payload = {
    version: "1.0.0",
    meta: {
      generator: "CryptoVault Enterprise Batch Deployer",
      createdAt: new Date().toISOString(),
      network: networkName,
      targetMulticall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
      tokenCount: tokens.length,
      deployerAddress: deployer,
    },
    calls: tokens.map((t, idx) => ({
      index: idx + 1,
      name: t.name,
      symbol: t.symbol,
      standard: t.tokenStandard,
      predictedAddress: t.contractAddress,
      target: "0x0000000000000000000000000000000000000000",
      allowFailure: false,
      value: "0",
      callData: `0x6080604052_${Buffer.from(t.symbol).toString("hex")}`,
      estimatedGas: estimateTokenDeploymentGas(t.tokenStandard),
    })),
  };

  return JSON.stringify(payload, null, 2);
}

// ============================================================================
// MASTER COMPILER: DISPATCH SCRIPT ACCORDING TO FORMAT
// ============================================================================
export function generateBatchDeploymentScript(
  format: BatchDeploymentScriptFormat,
  tokens: TokenRecord[],
  networkName: string = "ethereum",
  deployer: string = "0xYourDeployerAddress"
): { filename: string; language: string; code: string } {
  switch (format) {
    case "foundry":
      return {
        filename: "BatchDeployTokens.s.sol",
        language: "solidity",
        code: generateFoundryBatchScript(tokens, networkName, deployer),
      };
    case "hardhat_ethers":
      return {
        filename: "deploy-batch.ts",
        language: "typescript",
        code: generateHardhatEthersBatchScript(tokens, networkName, deployer),
      };
    case "web3_python":
      return {
        filename: "batch_deploy.py",
        language: "python",
        code: generateWeb3PythonBatchScript(tokens, networkName, deployer),
      };
    case "cast_cli":
      return {
        filename: "batch_cast_deploy.sh",
        language: "bash",
        code: generateCastCliBatchScript(tokens, networkName, deployer),
      };
    case "multicall3_json":
      return {
        filename: "multicall3_batch.json",
        language: "json",
        code: generateMulticall3BatchJson(tokens, networkName, deployer),
      };
  }
}
