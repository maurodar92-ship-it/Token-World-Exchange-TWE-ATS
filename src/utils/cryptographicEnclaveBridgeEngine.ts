/**
 * Cryptographic Key Management & Secure Enclave Web3 Bridge Engine
 * 
 * Provides deterministic cryptographic algorithms, isolated enclave emulation,
 * AES-256-GCM authenticated storage, EIP-712 / ECDSA secp256k1 / Ed25519 signing engines,
 * and JSON-RPC node communication bridging Gemini API / AI Studio intelligence with
 * dedicated Web3 execution runtimes.
 */

import { ethers } from "ethers";
import { SOLANA_MULTISIG_TREASURY } from "./treasuryConstants";

// ============================================================================
// 1. DATA TYPES & ARCHITECTURAL DEFINITIONS
// ============================================================================

export type EnclaveStorageType = 
  | "hardware_hsm"        // AWS CloudHSM, Google Cloud HSM, YubiHSM
  | "secure_enclave"     // Apple Secure Enclave (T2/SEP), Android StrongBox Keymaster
  | "webauthn_passkey"   // FIDO2 / WebAuthn PRF extension (Biometric Passkeys)
  | "encrypted_storage"  // Client-side AES-256-GCM + PBKDF2 authenticated store
  | "embedded_mpc";      // Turnkey / Privy / Dynamic / Fireblocks MPC-CMP

export type SigningAlgorithm = 
  | "ecdsa_secp256k1"    // Ethereum, Bitcoin, Arbitrum, Base, Polygon
  | "ed25519_curve25519" // Solana SVM, Near, Cardano
  | "eip712_typed_data"  // UniswapX intents, CoW Swap, Permit2
  | "erc4337_user_op";   // Account Abstraction Smart Accounts

export interface EnclaveKeyProfile {
  id: string;
  name: string;
  enclaveType: EnclaveStorageType;
  publicKey: string;
  evmAddress: string;
  solanaAddress?: string;
  derivationPath: string;
  isEnclaveIsolated: boolean;
  tamperProofRating: "FIPS 140-3 Level 3" | "Common Criteria EAL6+" | "WebAuthn Biometric" | "AES-256-GCM";
  createdAt: string;
}

export interface DeterministicEcdsaSignature {
  r: string;
  s: string;
  v: number;
  yParity: number;
  compact: string;
  rawSignatureHex: string;
  digestKeccak256: string;
  recoveryId: number;
  isCanonicalLowS: boolean;
}

export interface Eip712IntentPayload {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  message: Record<string, any>;
  primaryType: string;
}

export interface JsonRpcNodeConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
}

export const SUPPORTED_RPC_NODES: JsonRpcNodeConfig[] = [
  {
    id: "eth_mainnet",
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    nativeCurrency: "ETH"
  },
  {
    id: "base_mainnet",
    name: "Base Mainnet",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    nativeCurrency: "ETH"
  },
  {
    id: "arbitrum_one",
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    nativeCurrency: "ETH"
  },
  {
    id: "polygon_pos",
    name: "Polygon POS",
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    nativeCurrency: "POL"
  },
  {
    id: "optimism_mainnet",
    name: "Optimism",
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    nativeCurrency: "ETH"
  }
];

export interface AiStudioIntelligenceIntent {
  rawUserPrompt: string;
  parsedAction: "swap" | "transfer" | "permit_approval" | "liquidity_mint" | "deploy_contract";
  sourceToken: string;
  targetToken: string;
  amount: string;
  recipientOrContract: string;
  targetChainId: number;
  maxSlippagePercent: number;
  aiConfidenceScore: number;
  reasoning: string;
  functionCallingSchema: {
    functionName: string;
    parameters: Record<string, any>;
  };
}

export interface Web3SerializedTransaction {
  to: string;
  from: string;
  nonce: number;
  value: string;
  data: string;
  chainId: number;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  type: 2; // EIP-1559
  rawUnsignedPayloadHex: string;
}

// ============================================================================
// 2. CRYPTOGRAPHIC KEY GENERATION & ENCLAVE ISOLATION
// ============================================================================

/**
 * Generate a cryptographically secure BIP-39 mnemonic using the Web Crypto API
 * with high entropy (128-bit for 12 words or 256-bit for 24 words).
 */
export function generateCryptographicMnemonic(wordCount: 12 | 24 = 12): {
  mnemonic: string;
  entropyHex: string;
  wordCount: number;
} {
  const entropyBytesCount = wordCount === 24 ? 32 : 16;
  const entropy = new Uint8Array(entropyBytesCount);
  window.crypto.getRandomValues(entropy);
  
  // Use ethers HDNode to format canonical wordlist
  const mnemonicObj = ethers.Mnemonic.fromEntropy(entropy);
  
  return {
    mnemonic: mnemonicObj.phrase,
    entropyHex: ethers.hexlify(entropy),
    wordCount
  };
}

/**
 * Derive deterministic HD accounts from BIP-39 mnemonic
 */
export function deriveHdEnclaveAccount(
  mnemonicPhrase: string, 
  accountIndex: number = 0,
  derivationPathPrefix: string = "m/44'/60'/0'/0/"
): {
  path: string;
  address: string;
  publicKey: string;
  privateKeyMasked: string;
  privateKeyFull: string;
} {
  const path = `${derivationPathPrefix}${accountIndex}`;
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonicPhrase, undefined, path);
  
  return {
    path,
    address: hdNode.address,
    publicKey: hdNode.publicKey,
    privateKeyMasked: `${hdNode.privateKey.slice(0, 6)}...${hdNode.privateKey.slice(-4)}`,
    privateKeyFull: hdNode.privateKey
  };
}

// ============================================================================
// 3. TAMPER-PROOF CLIENT STORAGE (AES-256-GCM + PBKDF2)
// ============================================================================

export interface EncryptedEnclaveVaultBlob {
  version: 1;
  cipherTextBase64: string;
  ivHex: string;
  saltHex: string;
  tagLengthBits: number;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  createdAt: string;
}

/**
 * Encrypt arbitrary sensitive key data using standard AES-256-GCM with PBKDF2 key derivation.
 */
export async function encryptKeyPayloadWithAesGcm(
  plainText: string,
  passphrase: string,
  iterations: number = 600000
): Promise<EncryptedEnclaveVaultBlob> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    derivedKey,
    enc.encode(plainText)
  );

  const cipherBytes = new Uint8Array(cipherBuffer);
  let binary = "";
  for (let i = 0; i < cipherBytes.byteLength; i++) {
    binary += String.fromCharCode(cipherBytes[i]);
  }

  return {
    version: 1,
    cipherTextBase64: window.btoa(binary),
    ivHex: ethers.hexlify(iv),
    saltHex: ethers.hexlify(salt),
    tagLengthBits: 128,
    kdf: "PBKDF2-SHA256",
    iterations,
    createdAt: new Date().toISOString()
  };
}

/**
 * Decrypt AES-256-GCM vault blob with passphrase
 */
export async function decryptKeyPayloadWithAesGcm(
  blob: EncryptedEnclaveVaultBlob,
  passphrase: string
): Promise<string> {
  const dec = new TextDecoder();
  const enc = new TextEncoder();

  const salt = ethers.getBytes(blob.saltHex);
  const iv = ethers.getBytes(blob.ivHex);
  const cipherBinary = window.atob(blob.cipherTextBase64);
  const cipherBytes = new Uint8Array(cipherBinary.length);
  for (let i = 0; i < cipherBinary.length; i++) {
    cipherBytes[i] = cipherBinary.charCodeAt(i);
  }

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: blob.iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: blob.tagLengthBits },
    derivedKey,
    cipherBytes
  );

  return dec.decode(decryptedBuffer);
}

// ============================================================================
// 4. DETERMINISTIC TRANSACTION SIGNING ENGINE (secp256k1 & EIP-712)
// ============================================================================

/**
 * Perform deterministic ECDSA on secp256k1 signing of an arbitrary message or transaction hash.
 * Enforces canonical low-S (BIP-62 / EIP-2) and calculates recovery ID.
 */
export function signDeterministicEcdsa(
  privateKeyHex: string, 
  rawPayload: string
): DeterministicEcdsaSignature {
  const signingKey = new ethers.SigningKey(privateKeyHex);
  const digest = ethers.keccak256(ethers.toUtf8Bytes(rawPayload));
  const sig = signingKey.sign(digest);

  return {
    r: sig.r,
    s: sig.s,
    v: sig.v,
    yParity: sig.yParity,
    compact: sig.compactSerialized,
    rawSignatureHex: sig.serialized,
    digestKeccak256: digest,
    recoveryId: sig.yParity,
    isCanonicalLowS: true // ethers automatically enforces low-S
  };
}

/**
 * Deterministically sign an EIP-712 Structured Data Intent (UniswapX, CoW Swap, Permit)
 */
export async function signEip712IntentPayload(
  privateKeyHex: string,
  payload: Eip712IntentPayload
): Promise<{
  signature: string;
  domainSeparator: string;
  typeHash: string;
  structHash: string;
}> {
  const wallet = new ethers.Wallet(privateKeyHex);
  const signature = await wallet.signTypedData(payload.domain, payload.types, payload.message);
  
  // Calculate domain separator
  const domainSeparator = ethers.TypedDataEncoder.hashDomain(payload.domain);
  const structHash = ethers.TypedDataEncoder.from(payload.types).hash(payload.message);

  return {
    signature,
    domainSeparator,
    typeHash: ethers.TypedDataEncoder.getPrimaryType(payload.types),
    structHash
  };
}

/**
 * Mock deterministic Ed25519 signature computation for Solana SVM transactions
 */
export function signDeterministicEd25519Mock(
  messagePayload: string,
  solanaPublicKey: string = SOLANA_MULTISIG_TREASURY
): {
  signatureBase58: string;
  curve: "Ed25519 / SHA-512";
  publicKey: string;
  verified: boolean;
} {
  // Deterministic 64-byte hex representation derived from hash
  const hash = ethers.keccak256(ethers.toUtf8Bytes(messagePayload));
  const rawBytes = ethers.getBytes(hash);
  const doubleBytes = new Uint8Array(64);
  doubleBytes.set(rawBytes, 0);
  doubleBytes.set(rawBytes.reverse(), 32);

  // Simple base58 representation
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let base58Str = "";
  for (let i = 0; i < 44; i++) {
    base58Str += chars[doubleBytes[i % 64] % chars.length];
  }

  return {
    signatureBase58: `${base58Str}...SolSig`,
    curve: "Ed25519 / SHA-512",
    publicKey: solanaPublicKey,
    verified: true
  };
}

// ============================================================================
// 5. JSON-RPC NODE COMMUNICATION CLIENT
// ============================================================================

export class Web3RpcClient {
  private provider: ethers.JsonRpcProvider;
  private config: JsonRpcNodeConfig;

  constructor(config: JsonRpcNodeConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  public async getLatestBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  public async getFeeData(): Promise<{
    gasPriceGwei: string;
    maxFeePerGasGwei: string;
    maxPriorityFeePerGasGwei: string;
  }> {
    const feeData = await this.provider.getFeeData();
    const formatGwei = (val: bigint | null) => 
      val ? (Number(val) / 1e9).toFixed(3) : "N/A";

    return {
      gasPriceGwei: formatGwei(feeData.gasPrice),
      maxFeePerGasGwei: formatGwei(feeData.maxFeePerGas),
      maxPriorityFeePerGasGwei: formatGwei(feeData.maxPriorityFeePerGas)
    };
  }

  public async getTransactionCount(address: string): Promise<number> {
    return await this.provider.getTransactionCount(address, "latest");
  }

  public async getBalance(address: string): Promise<string> {
    const bal = await this.provider.getBalance(address);
    return ethers.formatEther(bal);
  }

  public async simulateEthCall(to: string, data: string): Promise<string> {
    return await this.provider.call({ to, data });
  }

  public async estimateGas(to: string, data: string, value: string = "0"): Promise<bigint> {
    return await this.provider.estimateGas({
      to,
      data,
      value: ethers.parseEther(value)
    });
  }

  public async broadcastRawTransaction(rawSignedTxHex: string): Promise<{
    hash: string;
    explorerLink: string;
  }> {
    const txResponse = await this.provider.broadcastTransaction(rawSignedTxHex);
    return {
      hash: txResponse.hash,
      explorerLink: `${this.config.explorerUrl}/tx/${txResponse.hash}`
    };
  }
}

// ============================================================================
// 6. AI STUDIO INTELLIGENCE → WEB3 BRIDGE PIPELINE
// ============================================================================

/**
 * Simulates Gemini Function Calling preparation of an execution transaction
 * given a natural language prompt.
 */
export function parseIntentViaGeminiFunctionCalling(prompt: string): AiStudioIntelligenceIntent {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("swap") || lower.includes("exchange") || lower.includes("buy")) {
    const amountMatch = prompt.match(/\b\d+(\.\d+)?\b/);
    const amount = amountMatch ? amountMatch[0] : "1.0";
    
    return {
      rawUserPrompt: prompt,
      parsedAction: "swap",
      sourceToken: lower.includes("usdc") && !lower.startsWith("swap usdc") ? "ETH" : "USDC",
      targetToken: lower.includes("usdc") ? "USDC" : "ETH",
      amount,
      recipientOrContract: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
      targetChainId: lower.includes("base") ? 8453 : lower.includes("arbitrum") ? 42161 : 1,
      maxSlippagePercent: 0.5,
      aiConfidenceScore: 0.985,
      reasoning: "Extracted intent: Decentralized AMM swap routed via Uniswap Universal Router. Identified source token, target token, volume, and slippage guardrail.",
      functionCallingSchema: {
        functionName: "prepareUniswapSwapExactInput",
        parameters: {
          tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
          tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
          feeTier: 3000,
          amountInWei: ethers.parseEther(amount).toString(),
          recipient: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
          deadlineSeconds: 1800
        }
      }
    };
  }

  // Default transfer intent
  return {
    rawUserPrompt: prompt,
    parsedAction: "transfer",
    sourceToken: "ETH",
    targetToken: "ETH",
    amount: "0.25",
    recipientOrContract: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
    targetChainId: 1,
    maxSlippagePercent: 0.0,
    aiConfidenceScore: 0.99,
    reasoning: "Extracted intent: Native token value transfer to verified enterprise treasury recipient.",
    functionCallingSchema: {
      functionName: "prepareNativeTransfer",
      parameters: {
        recipient: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
        amountWei: ethers.parseEther("0.25").toString(),
        memo: "Treasury settlement allocation"
      }
    }
  };
}

/**
 * Bridge step 2: Web3 Library serializes unsigned EIP-1559 payload
 */
export function serializeUnsignedEip1559Transaction(
  intent: AiStudioIntelligenceIntent,
  senderAddress: string,
  nonce: number = 42
): Web3SerializedTransaction {
  const tx = ethers.Transaction.from({
    to: intent.recipientOrContract,
    from: senderAddress,
    nonce,
    value: intent.parsedAction === "transfer" ? ethers.parseEther(intent.amount) : 0n,
    data: intent.parsedAction === "swap" 
      ? "0x04e45aaf000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" 
      : "0x",
    chainId: intent.targetChainId,
    gasLimit: 65000n,
    maxFeePerGas: ethers.parseUnits("22", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("1.5", "gwei"),
    type: 2
  });

  return {
    to: tx.to || "",
    from: tx.from || senderAddress,
    nonce: tx.nonce,
    value: tx.value.toString(),
    data: tx.data,
    chainId: Number(tx.chainId),
    gasLimit: tx.gasLimit.toString(),
    maxFeePerGas: tx.maxFeePerGas?.toString() || "0",
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString() || "0",
    type: 2,
    rawUnsignedPayloadHex: tx.unsignedSerialized
  };
}
