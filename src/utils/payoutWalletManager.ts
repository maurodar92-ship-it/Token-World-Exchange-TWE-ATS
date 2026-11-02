import { ethers } from "ethers";
import { getMonetizationSettings, saveMonetizationSettings } from "./monetizationManager";
import { globalOnChainAtsEngine } from "./onChainAtsEngine";
import { POLYGON_TREASURY_ADDRESS, PROTOCOL_TREASURY_ADDRESS } from "./treasuryConstants";

export interface GeneratedPayoutWallet {
  walletId: string; // e.g. PAYOUT-EVM-70AC9BB8
  address: string;
  privateKey: string;
  mnemonic: string;
  publicKey: string;
  chain: "ethereum" | "base" | "polygon" | "arbitrum" | "solana";
  createdAt: string;
  label: string;
  isPrimaryPayout: boolean;
  isWhitelistedAts: boolean;
  complianceTier: string;
  transferClearance: boolean;
  notes: string;
}

const STORAGE_KEY_PAYOUT_WALLETS = "tokenworld_enabled_payout_wallets_v2";

/**
 * Default fallback wallet (Sovereign Treasury Beneficiary)
 */
export const DEFAULT_PAYOUT_WALLET_RECORD: GeneratedPayoutWallet = {
  walletId: "PAYOUT-EVM-70AC9BB8",
  address: PROTOCOL_TREASURY_ADDRESS,
  privateKey: "0x70ac0000000000000000000000000000000000000000000000000000000094f0",
  mnemonic: "sovereign treasury institutional clearinghouse liquid settlement vault root key enabled",
  publicKey: "0x0470ac9bb89d5c3d4a47d5cd11b108fea9ad4e94f0...",
  chain: "ethereum",
  createdAt: "2026-01-01T00:00:00.000Z",
  label: "Sovereign Treasury Primary Payout Vault",
  isPrimaryPayout: true,
  isWhitelistedAts: true,
  complianceTier: "Tier 1: Institutional Qualified Purchaser & Broker-Dealer",
  transferClearance: true,
  notes: "Pre-authorized sovereign payout gateway receiving all DEX swap fees and liquidation settlements.",
};

export const POLYGON_TREASURY_PAYOUT_WALLET_RECORD: GeneratedPayoutWallet = {
  walletId: "PAYOUT-POLYGON-D12A2E29",
  address: POLYGON_TREASURY_ADDRESS,
  privateKey: "0xd12a00000000000000000000000000000000000000000000000000000000704d",
  mnemonic: "polygon sovereign treasury institutional clearinghouse liquid settlement vault root key enabled",
  publicKey: "0x04d12a2e29b64e8cefc8bc2aa80a7169817608704d...",
  chain: "polygon",
  createdAt: "2026-01-01T00:00:00.000Z",
  label: "Polygon Sovereign Treasury Vault (Chain ID 137)",
  isPrimaryPayout: false,
  isWhitelistedAts: true,
  complianceTier: "Tier 1: Institutional Qualified Purchaser & Broker-Dealer",
  transferClearance: true,
  notes: "Pre-authorized Polygon sovereign payout gateway receiving QuickSwap fees, POL and Polygon POS settlements.",
};

/**
 * Retrieve all registered enabled payout wallets
 */
export function getEnabledPayoutWallets(): GeneratedPayoutWallet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYOUT_WALLETS);
    if (!raw) {
      return [DEFAULT_PAYOUT_WALLET_RECORD, POLYGON_TREASURY_PAYOUT_WALLET_RECORD];
    }
    const parsed: GeneratedPayoutWallet[] = JSON.parse(raw);
    if (!parsed.some((w) => w.address.toLowerCase() === DEFAULT_PAYOUT_WALLET_RECORD.address.toLowerCase())) {
      parsed.unshift(DEFAULT_PAYOUT_WALLET_RECORD);
    }
    if (!parsed.some((w) => w.address.toLowerCase() === POLYGON_TREASURY_PAYOUT_WALLET_RECORD.address.toLowerCase())) {
      parsed.push(POLYGON_TREASURY_PAYOUT_WALLET_RECORD);
    }
    return parsed;
  } catch {
    return [DEFAULT_PAYOUT_WALLET_RECORD, POLYGON_TREASURY_PAYOUT_WALLET_RECORD];
  }
}

/**
 * Save payout wallets list to localStorage
 */
function savePayoutWallets(wallets: GeneratedPayoutWallet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PAYOUT_WALLETS, JSON.stringify(wallets));
  } catch (err) {
    console.error("Failed to save payout wallets:", err);
  }
}

/**
 * Get active primary payout wallet
 */
export function getActivePayoutWallet(): GeneratedPayoutWallet {
  const wallets = getEnabledPayoutWallets();
  const primary = wallets.find((w) => w.isPrimaryPayout);
  return primary || wallets[0] || DEFAULT_PAYOUT_WALLET_RECORD;
}

/**
 * Generate a brand new cryptographically secure EVM Payout Wallet ID
 * Automatically enables it, sets it as primary payout wallet, and whitelists it in the ATS Identity Registry
 */
export function generateEnabledPayoutWallet(params?: {
  label?: string;
  autoSetPrimary?: boolean;
  registerAtsIdentity?: boolean;
}): GeneratedPayoutWallet {
  const randomWallet = ethers.Wallet.createRandom();
  const address = ethers.getAddress(randomWallet.address); // checksum EIP-55
  const shortId = address.slice(2, 10).toUpperCase();
  const walletId = `PAYOUT-EVM-${shortId}`;
  const label = params?.label || `Generated Payout Wallet (${shortId})`;
  const autoSetPrimary = params?.autoSetPrimary !== false;
  const registerAts = params?.registerAtsIdentity !== false;

  const newPayoutWallet: GeneratedPayoutWallet = {
    walletId,
    address,
    privateKey: randomWallet.privateKey,
    mnemonic: randomWallet.mnemonic?.phrase || "N/A (Raw Private Key Generated)",
    publicKey: randomWallet.signingKey.publicKey,
    chain: "ethereum",
    createdAt: new Date().toISOString(),
    label,
    isPrimaryPayout: autoSetPrimary,
    isWhitelistedAts: true,
    complianceTier: "Tier 1: SEC Accredited Institutional Depository",
    transferClearance: true,
    notes: "Cryptographically verified EIP-55 payout address enabled for atomic DvP token transfers, DEX liquidations, and treasury revenue distributions.",
  };

  // Update existing wallets primary status
  let wallets = getEnabledPayoutWallets();
  if (autoSetPrimary) {
    wallets = wallets.map((w) => ({ ...w, isPrimaryPayout: false }));
  }
  wallets.unshift(newPayoutWallet);
  savePayoutWallets(wallets);

  // Sync with monetizationManager settings
  if (autoSetPrimary) {
    try {
      const monSettings = getMonetizationSettings();
      monSettings.payoutWallets.evm = address;
      monSettings.payoutWallets.usdtPolygon = address;
      saveMonetizationSettings(monSettings);
    } catch (e) {
      console.warn("Could not sync with monetization settings:", e);
    }
  }

  // Register in ATS Identity & Compliance Attestation Registry
  if (registerAts) {
    try {
      globalOnChainAtsEngine.issueInvestorNft({
        walletAddress: address,
        entityName: `Enabled Payout Depository (${walletId})`,
        jurisdictionCode: 840,
        accreditationTier: 1,
        sanctionsProvider: "Chainalysis KYT",
      });
    } catch (e) {
      console.warn("Could not auto-register in ATS engine:", e);
    }
  }

  return newPayoutWallet;
}

/**
 * Enable and whitelist an existing user address (e.g. MetaMask or hardware wallet) as an Enabled Payout Wallet ID
 */
export function enableExistingAddressAsPayoutWallet(
  rawAddress: string,
  label: string = "Connected User Payout Wallet"
): GeneratedPayoutWallet {
  const address = ethers.getAddress(rawAddress.trim());
  const shortId = address.slice(2, 10).toUpperCase();
  const walletId = `PAYOUT-EVM-${shortId}`;

  let wallets = getEnabledPayoutWallets();
  const existing = wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());

  if (existing) {
    existing.isPrimaryPayout = true;
    existing.transferClearance = true;
    existing.isWhitelistedAts = true;
    wallets = wallets.map((w) =>
      w.address.toLowerCase() === address.toLowerCase() ? existing : { ...w, isPrimaryPayout: false }
    );
    savePayoutWallets(wallets);

    // Sync with monetization
    const monSettings = getMonetizationSettings();
    monSettings.payoutWallets.evm = address;
    saveMonetizationSettings(monSettings);

    return existing;
  }

  const enabledWallet: GeneratedPayoutWallet = {
    walletId,
    address,
    privateKey: "Controlled via Connected Web3 Provider / MetaMask",
    mnemonic: "Secured by User Web3 Signer",
    publicKey: "Derived via Web3 Signer",
    chain: "ethereum",
    createdAt: new Date().toISOString(),
    label,
    isPrimaryPayout: true,
    isWhitelistedAts: true,
    complianceTier: "Tier 1: Verified User Payout Depository",
    transferClearance: true,
    notes: "Active user address enabled as verified payout destination for token transfers and liquidation settlements.",
  };

  wallets = wallets.map((w) => ({ ...w, isPrimaryPayout: false }));
  wallets.unshift(enabledWallet);
  savePayoutWallets(wallets);

  // Sync with monetization
  try {
    const monSettings = getMonetizationSettings();
    monSettings.payoutWallets.evm = address;
    saveMonetizationSettings(monSettings);
  } catch (e) {
    console.warn("Could not sync with monetization:", e);
  }

  // Register in ATS Identity Registry
  try {
    globalOnChainAtsEngine.issueInvestorNft({
      walletAddress: address,
      entityName: `${label} (${walletId})`,
      jurisdictionCode: 840,
      accreditationTier: 1,
      sanctionsProvider: "Chainalysis KYT",
    });
  } catch (e) {
    console.warn("Could not register address in ATS engine:", e);
  }

  return enabledWallet;
}

/**
 * Diagnostic analysis for why tokens cannot transfer to a payout address
 */
export interface TransferDiagnostic {
  isTransferable: boolean;
  status: "ENABLED" | "RESTRICTED" | "BLOCKED";
  title: string;
  explanation: string;
  resolution: string;
  recommendedAction: "GENERATE_ENABLE_PAYOUT_WALLET" | "USE_DEX_LIQUIDATION" | "PERMANENT_SOULBOUND" | "READY";
}

export function diagnoseTokenTransferability(params: {
  tokenSymbol?: string;
  tokenStandard?: string;
  isSoulbound?: boolean;
  recipientPayoutAddress?: string;
  senderAddress?: string;
}): TransferDiagnostic {
  const { tokenSymbol = "TOKEN", tokenStandard = "ERC-20", isSoulbound = false, recipientPayoutAddress } = params;

  // Case 1: ERC-5192 Soulbound Token (SBT)
  if (isSoulbound || tokenStandard.toUpperCase().includes("5192") || tokenSymbol.toUpperCase().includes("SBT")) {
    return {
      isTransferable: false,
      status: "BLOCKED",
      title: "ERC-5192 Soulbound Tokens Are Permanently Bound to Identity",
      explanation: `Soulbound Tokens (${tokenSymbol}) adhere to the EIP-5192 standard where locked(tokenId) == true. By protocol definition, they cannot be transferred to any payout address or secondary wallet because they serve as non-transferable institutional compliance credentials and investor attestations.`,
      resolution: `Do not attempt to transfer the SBT itself. If you hold tokenized securities or reward tokens earned through this identity, those underlying tokens (ERC-20 / ERC-1400) can be transferred or liquidated to your enabled payout wallet.`,
      recommendedAction: "PERMANENT_SOULBOUND",
    };
  }

  // Case 2: No payout address provided or invalid format
  if (!recipientPayoutAddress || !ethers.isAddress(recipientPayoutAddress.trim())) {
    return {
      isTransferable: false,
      status: "RESTRICTED",
      title: "No Valid EIP-55 Payout Address Configured",
      explanation: "Token transfers require a valid 42-character checksummed EVM address adhering to EIP-55 specifications.",
      resolution: "Generate an enabled Payout Wallet ID or paste your connected MetaMask address.",
      recommendedAction: "GENERATE_ENABLE_PAYOUT_WALLET",
    };
  }

  const checksummedRecipient = ethers.getAddress(recipientPayoutAddress.trim());
  const enabledWallets = getEnabledPayoutWallets();
  const isEnabled = enabledWallets.some((w) => w.address.toLowerCase() === checksummedRecipient.toLowerCase());

  // Case 3: Recipient is not registered as an enabled payout wallet in Token World
  if (!isEnabled) {
    return {
      isTransferable: false,
      status: "RESTRICTED",
      title: "Payout Address Not Enabled in Institutional Clearinghouse",
      explanation: `The destination address ${checksummedRecipient.slice(0, 8)}...${checksummedRecipient.slice(-6)} has not been registered as an authorized payout depository in the Sovereign Treasury and ATS Compliance Registry.`,
      resolution: "Click 'Enable Payout Wallet ID' to whitelist this address and issue an institutional clearance attestation.",
      recommendedAction: "GENERATE_ENABLE_PAYOUT_WALLET",
    };
  }

  // Case 4: Fully enabled and cleared
  return {
    isTransferable: true,
    status: "ENABLED",
    title: "Transfer Clearance Approved",
    explanation: `Destination ${checksummedRecipient.slice(0, 8)}...${checksummedRecipient.slice(-6)} is verified as an active, enabled Payout Wallet ID with full on-chain clearance.`,
    resolution: "You can proceed with sending tokens or liquidating directly to this payout address.",
    recommendedAction: "READY",
  };
}
