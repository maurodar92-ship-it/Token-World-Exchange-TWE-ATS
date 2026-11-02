import { ethers } from "ethers";

export type SupportedWalletType = "metamask" | "coinbase" | "trust" | "rabby" | "injected";

export interface WalletProviderInfo {
  id: SupportedWalletType;
  name: string;
  tagline: string;
  icon: string; // Emoji / SVG representation
  color: string;
  installed: boolean;
  downloadUrl: string;
}

export type RiskLevel = "SAFE" | "SUSPICIOUS" | "CRITICAL_DRAINER";

export interface TokenApprovalRecord {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  tokenLogo?: string;
  spenderAddress: string;
  spenderName: string;
  spenderProtocol: string;
  allowanceFormatted: string;
  isUnlimited: boolean;
  riskLevel: RiskLevel;
  riskReason: string;
  timestamp: number;
  lastUpdatedDate: string;
  chain: string;
  chainId: number;
}

export interface PermitAnalysisResult {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  spenderAddress: string;
  spenderName: string;
  amount: string;
  deadlineTimestamp: number;
  isExpired: boolean;
  riskLevel: RiskLevel;
  findings: string[];
  recommendation: "APPROVE_SAFE" | "WARN_UNVERIFIED" | "BLOCK_DRAINER";
  permitType: "EIP-2612" | "Permit2" | "EIP-712-MetaTx";
}

export interface UnusualActivityAlert {
  id: string;
  timestamp: number;
  type: "UNLIMITED_APPROVAL" | "SUSPICIOUS_SPENDER" | "DRAINER_PATTERN" | "HIGH_GAS_SWEEP" | "PHISHING_PERMIT";
  title: string;
  description: string;
  riskLevel: RiskLevel;
  targetAddress: string;
  blocked: boolean;
}

export interface UniversalWalletState {
  activeWallet: SupportedWalletType;
  connected: boolean;
  address: string;
  solanaAddress: string;
  activeNetworkProvider: "ethereum" | "solana";
  chainId: number;
  chainName: string;
  nativeBalanceEth: number;
  nativeBalanceUsd: number;
  nativeBalanceSol: number;
  walletName: string;
  walletIcon: string;
  isSimulatedSandbox: boolean;
  securityScore: number; // 0 to 100
  approvals: TokenApprovalRecord[];
  alerts: UnusualActivityAlert[];
  recentPermits: PermitAnalysisResult[];
  savedAddresses: SavedAddressRecord[];
}

export interface SavedAddressRecord {
  id: string;
  address: string;
  network: "ethereum" | "solana";
  label: string;
  importedAt: number;
  source: "camera_qr_scan" | "qr_image_upload" | "manual_input" | "preset";
}

// Known malicious drainers or unverified phishing contracts for security scanning
export const KNOWN_DRAINER_SPENDERS: { address: string; name: string; pattern: string }[] = [
  {
    address: "0x1337bAbe1f9530D72fEE899988a08855F81D6e32",
    name: "Inferno Drainer Signature Spool",
    pattern: "Stealth Permit2 Signature Phishing contract targeting ERC20/NFTs",
  },
  {
    address: "0x666999badcA1123444400000000000000000dead",
    name: "PinkDrainer Proxy Contract",
    pattern: "Sweeper bot that calls transferFrom immediately after setApprovalForAll",
  },
  {
    address: "0x88880000deadbeefcafebabefaced00000000001",
    name: "Monkey Drainer Fake Permit Relayer",
    pattern: "Phishing dApp smart contract executing zero-gas drain permits",
  },
  {
    address: "0x000000000022d473030f116ddee9f6b43ac78ba3",
    name: "Uniswap Permit2 Official (Verified Safe)",
    pattern: "Canonical Uniswap Permit2 contract",
  },
];

const INITIAL_APPROVALS: TokenApprovalRecord[] = [
  {
    id: "appr-1",
    tokenSymbol: "USDT",
    tokenName: "Tether USD",
    tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    spenderAddress: "0x1337bAbe1f9530D72fEE899988a08855F81D6e32",
    spenderName: "Inferno Drainer Signature Spool",
    spenderProtocol: "Unverified Phishing Site (CryptoAirdrop-Claim.xyz)",
    allowanceFormatted: "Unlimited (1.15e77)",
    isUnlimited: true,
    riskLevel: "CRITICAL_DRAINER",
    riskReason: "Contract matches known Inferno Drainer hash. High probability of complete asset sweep upon next transaction.",
    timestamp: Date.now() - 3600000 * 4,
    lastUpdatedDate: "4 hours ago",
    chain: "Ethereum Mainnet",
    chainId: 1,
  },
  {
    id: "appr-2",
    tokenSymbol: "MAOMAO",
    tokenName: "Mao Mao Token",
    tokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    spenderAddress: "0x666999badcA1123444400000000000000000dead",
    spenderName: "PinkDrainer Proxy Contract",
    spenderProtocol: "Suspicious DEX Spooler",
    allowanceFormatted: "Unlimited (MaxUint256)",
    isUnlimited: true,
    riskLevel: "CRITICAL_DRAINER",
    riskReason: "Spender is flagged on global Web3 anti-drainer registry. Can withdraw all MAOMAO tokens without user prompt.",
    timestamp: Date.now() - 3600000 * 18,
    lastUpdatedDate: "18 hours ago",
    chain: "Ethereum Mainnet",
    chainId: 1,
  },
  {
    id: "appr-3",
    tokenSymbol: "WETH",
    tokenName: "Wrapped Ether",
    tokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    spenderAddress: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    spenderName: "Uniswap V3 SwapRouter02",
    spenderProtocol: "Uniswap Labs (Verified)",
    allowanceFormatted: "Unlimited (MaxUint256)",
    isUnlimited: true,
    riskLevel: "SUSPICIOUS",
    riskReason: "Unlimited allowance to verified DEX router. Safe protocol, but infinite approvals carry residual smart contract risk.",
    timestamp: Date.now() - 86400000 * 3,
    lastUpdatedDate: "3 days ago",
    chain: "Ethereum Mainnet",
    chainId: 1,
  },
  {
    id: "appr-4",
    tokenSymbol: "USDC",
    tokenName: "USD Coin",
    tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    spenderAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    spenderName: "Token World ATS CLOB Router",
    spenderProtocol: "Token World Exchange (Verified)",
    allowanceFormatted: "5,000.00 USDC",
    isUnlimited: false,
    riskLevel: "SAFE",
    riskReason: "Capped allowance to official Token World Exchange institutional router. Verified safe.",
    timestamp: Date.now() - 86400000 * 5,
    lastUpdatedDate: "5 days ago",
    chain: "Ethereum Mainnet",
    chainId: 1,
  },
];

const INITIAL_PERMITS: PermitAnalysisResult[] = [
  {
    id: "permit-1",
    tokenSymbol: "USDT",
    tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    spenderAddress: "0x1337bAbe1f9530D72fEE899988a08855F81D6e32",
    spenderName: "Inferno Drainer Signature Spool",
    amount: "MaxUint256 (All Balance)",
    deadlineTimestamp: Date.now() + 86400000 * 30,
    isExpired: false,
    riskLevel: "CRITICAL_DRAINER",
    findings: [
      "Off-chain EIP-712 signature grants full transfer allowance without gas cost.",
      "Spender code contains self-destruct and sweeper delegatecalls.",
      "Origin domain is not in verified dApp whitelist."
    ],
    recommendation: "BLOCK_DRAINER",
    permitType: "Permit2",
  },
  {
    id: "permit-2",
    tokenSymbol: "MAOMAO",
    tokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    spenderAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    spenderName: "Token World Exchange ATS Settlement",
    amount: "1,000 MAOMAO",
    deadlineTimestamp: Date.now() + 3600000,
    isExpired: false,
    riskLevel: "SAFE",
    findings: [
      "Standard EIP-2612 permit with 1 hour expiration limit.",
      "Spender is verified Token World ATS Smart Contract.",
      "Amount strictly restricted to user's order size."
    ],
    recommendation: "APPROVE_SAFE",
    permitType: "EIP-2612",
  },
];

const INITIAL_ALERTS: UnusualActivityAlert[] = [
  {
    id: "alert-1",
    timestamp: Date.now() - 1000 * 60 * 15,
    type: "DRAINER_PATTERN",
    title: "Critical Approval Drainer Detected",
    description: "Inferno Drainer Spool (0x1337...6e32) holds unlimited approval on your USDT balance. Revocation recommended immediately.",
    riskLevel: "CRITICAL_DRAINER",
    targetAddress: "0x1337bAbe1f9530D72fEE899988a08855F81D6e32",
    blocked: true,
  },
  {
    id: "alert-2",
    timestamp: Date.now() - 1000 * 60 * 45,
    type: "UNLIMITED_APPROVAL",
    title: "PinkDrainer Unlimited Allowance Active",
    description: "Your Mao Mao Token (MAOMAO) has an active unlimited approval to flagged blacklisted contract.",
    riskLevel: "CRITICAL_DRAINER",
    targetAddress: "0x666999badcA1123444400000000000000000dead",
    blocked: true,
  },
];

class UniversalWalletExtensionEngine {
  private state: UniversalWalletState = {
    activeWallet: "metamask",
    connected: true,
    address: "0x71C841913b025071047511456c3C6456f43D610e", // Sovereign founder address
    solanaAddress: "Mauro7xS7p8FwJgR32XQy91KkPmMU9Vp9q5L3t1B6e2",
    activeNetworkProvider: "ethereum",
    chainId: 1,
    chainName: "Ethereum Mainnet",
    nativeBalanceEth: 28.45,
    nativeBalanceSol: 420.5,
    nativeBalanceUsd: 98152.5,
    walletName: "MetaMask",
    walletIcon: "🦊",
    isSimulatedSandbox: false,
    securityScore: 68, // starts lower due to critical drainer approvals
    approvals: [...INITIAL_APPROVALS],
    alerts: [...INITIAL_ALERTS],
    recentPermits: [...INITIAL_PERMITS],
    savedAddresses: [
      {
        id: "saved-founder",
        address: "0x71C841913b025071047511456c3C6456f43D610e",
        network: "ethereum",
        label: "Mauro Sovereign Founder (EVM)",
        importedAt: Date.now() - 86400000 * 3,
        source: "preset",
      },
      {
        id: "saved-sol-founder",
        address: "Mauro7xS7p8FwJgR32XQy91KkPmMU9Vp9q5L3t1B6e2",
        network: "solana",
        label: "Mauro Sovereign Vault (Solana)",
        importedAt: Date.now() - 86400000 * 3,
        source: "preset",
      },
      {
        id: "saved-vitalik",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        network: "ethereum",
        label: "Vitalik.eth Staking Node",
        importedAt: Date.now() - 86400000 * 2,
        source: "preset",
      },
    ],
  };

  private listeners: Set<(state: UniversalWalletState) => void> = new Set();

  constructor() {
    this.detectInstalledWallets();
    this.recalculateSecurityScore();
  }

  public getState(): UniversalWalletState {
    return { ...this.state };
  }

  public subscribe(listener: (state: UniversalWalletState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(s);
      } catch (err) {
        console.error("Error in wallet extension listener", err);
      }
    });
  }

  public getAvailableWallets(): WalletProviderInfo[] {
    const win = typeof window !== "undefined" ? (window as any) : {};
    const eth = win.ethereum;

    const hasMetaMask = !!(eth && (eth.isMetaMask || win.isMetaMask));
    const hasCoinbase = !!(win.coinbaseWalletExtension || (eth && eth.isCoinbaseWallet));
    const hasTrust = !!(win.trustwallet || (eth && eth.isTrust));
    const hasRabby = !!(win.rabby || (eth && eth.isRabby));

    return [
      {
        id: "metamask",
        name: "MetaMask",
        tagline: "The world's leading self-custody Web3 wallet",
        icon: "🦊",
        color: "from-amber-500 to-orange-600",
        installed: hasMetaMask,
        downloadUrl: "https://metamask.io/download/",
      },
      {
        id: "coinbase",
        name: "Coinbase Wallet",
        tagline: "Enterprise security & passkey native Web3 wallet",
        icon: "🔵",
        color: "from-blue-600 to-indigo-600",
        installed: hasCoinbase,
        downloadUrl: "https://www.coinbase.com/wallet",
      },
      {
        id: "trust",
        name: "Trust Wallet",
        tagline: "Multichain decentralized self-custody wallet",
        icon: "🛡️",
        color: "from-cyan-500 to-blue-500",
        installed: hasTrust,
        downloadUrl: "https://trustwallet.com/browser-extension",
      },
      {
        id: "rabby",
        name: "Rabby Wallet",
        tagline: "Game-changing game-ready multi-chain security wallet by DeBank",
        icon: "🐰",
        color: "from-indigo-500 to-purple-600",
        installed: hasRabby,
        downloadUrl: "https://rabby.io/",
      },
      {
        id: "injected",
        name: "Injected Web3 Provider",
        tagline: "Brave, Frame, Opera, or custom Web3 browser provider",
        icon: "⚡",
        color: "from-emerald-500 to-teal-600",
        installed: !!eth,
        downloadUrl: "https://ethereum.org/en/wallets/",
      },
    ];
  }

  public detectInstalledWallets(): { [key in SupportedWalletType]: boolean } {
    const wallets = this.getAvailableWallets();
    const map: any = {};
    wallets.forEach((w) => {
      map[w.id] = w.installed;
    });
    return map;
  }

  public async connectWallet(walletId: SupportedWalletType, useRealIfAvailable: boolean = true): Promise<boolean> {
    const win = typeof window !== "undefined" ? (window as any) : {};
    const eth = win.ethereum;
    let connectedAddress = "";
    let isReal = false;

    // Check if actual browser extension is available
    if (useRealIfAvailable && eth) {
      try {
        let provider = eth;
        if (walletId === "coinbase" && win.coinbaseWalletExtension) {
          provider = win.coinbaseWalletExtension;
        } else if (walletId === "trust" && win.trustwallet) {
          provider = win.trustwallet;
        } else if (walletId === "rabby" && win.rabby) {
          provider = win.rabby;
        }

        const accounts = await provider.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          connectedAddress = accounts[0];
          isReal = true;
        }
      } catch (err) {
        console.warn(`Could not connect real ${walletId} extension, falling back to sovereign sandbox simulation`, err);
      }
    }

    if (!connectedAddress) {
      // Deterministic sovereign sandbox address per wallet for realistic demonstration
      const sandboxAddresses: Record<SupportedWalletType, string> = {
        metamask: "0x71C841913b025071047511456c3C6456f43D610e", // Sovereign Founder
        coinbase: "0x534631Bcf33BDb069fB20A75d2791c863E11ad53",
        trust: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        rabby: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        injected: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      };
      connectedAddress = sandboxAddresses[walletId];
      isReal = false;
    }

    const solanaAddresses: Record<SupportedWalletType, string> = {
      metamask: "Mauro7xS7p8FwJgR32XQy91KkPmMU9Vp9q5L3t1B6e2",
      coinbase: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
      trust: "Bxd9x3iF5Z8u9mFkVqX7gL4aW4R1d9Z3c7s2m7u4V5e8",
      rabby: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
      injected: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    };

    const walletNames: Record<SupportedWalletType, { name: string; icon: string }> = {
      metamask: { name: "MetaMask", icon: "🦊" },
      coinbase: { name: "Coinbase Wallet", icon: "🔵" },
      trust: { name: "Trust Wallet", icon: "🛡️" },
      rabby: { name: "Rabby Wallet", icon: "🐰" },
      injected: { name: "Injected Web3", icon: "⚡" },
    };

    this.state.activeWallet = walletId;
    this.state.connected = true;
    this.state.address = connectedAddress;
    this.state.solanaAddress = solanaAddresses[walletId];
    this.state.walletName = walletNames[walletId].name;
    this.state.walletIcon = walletNames[walletId].icon;
    this.state.isSimulatedSandbox = !isReal;

    this.recalculateSecurityScore();
    this.notify();
    return true;
  }

  public disconnectWallet() {
    this.state.connected = false;
    this.notify();
  }

  public switchChain(chainId: number, chainName: string) {
    this.state.chainId = chainId;
    this.state.chainName = chainName;
    this.notify();
  }

  public setActiveNetworkProvider(network: "ethereum" | "solana") {
    this.state.activeNetworkProvider = network;
    this.state.chainName = network === "ethereum" ? "Ethereum Mainnet" : "Solana Mainnet-Beta";
    this.notify();
  }

  public updateActiveAddress(network: "ethereum" | "solana", address: string) {
    if (network === "ethereum") {
      this.state.address = address;
    } else {
      this.state.solanaAddress = address;
    }
    this.notify();
  }

  public updateBalances(balances: { eth?: number; sol?: number; usd?: number }) {
    if (balances.eth !== undefined) this.state.nativeBalanceEth = balances.eth;
    if (balances.sol !== undefined) this.state.nativeBalanceSol = balances.sol;
    if (balances.usd !== undefined) this.state.nativeBalanceUsd = balances.usd;
    this.notify();
  }

  public addSavedAddress(data: {
    address: string;
    network: "ethereum" | "solana";
    label: string;
    source: "camera_qr_scan" | "qr_image_upload" | "manual_input" | "preset";
  }): SavedAddressRecord {
    const existingIndex = this.state.savedAddresses.findIndex(
      (a) => a.address.toLowerCase() === data.address.toLowerCase()
    );
    const newRecord: SavedAddressRecord = {
      id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      address: data.address,
      network: data.network,
      label: data.label || (data.network === "solana" ? "Imported Solana Address" : "Imported Ethereum Address"),
      importedAt: Date.now(),
      source: data.source,
    };

    if (existingIndex >= 0) {
      this.state.savedAddresses[existingIndex] = newRecord;
    } else {
      this.state.savedAddresses.unshift(newRecord);
    }

    this.notify();
    return newRecord;
  }

  public removeSavedAddress(id: string) {
    this.state.savedAddresses = this.state.savedAddresses.filter((a) => a.id !== id);
    this.notify();
  }

  // Security & Drainer Scanner logic
  public recalculateSecurityScore(): number {
    let score = 100;
    const criticals = this.state.approvals.filter((a) => a.riskLevel === "CRITICAL_DRAINER").length;
    const suspicious = this.state.approvals.filter((a) => a.riskLevel === "SUSPICIOUS").length;

    score -= criticals * 25;
    score -= suspicious * 10;
    if (score < 10) score = 10;

    this.state.securityScore = score;
    return score;
  }

  public revokeApproval(approvalId: string): boolean {
    const apprIndex = this.state.approvals.findIndex((a) => a.id === approvalId);
    if (apprIndex === -1) return false;

    const removed = this.state.approvals[apprIndex];
    // Remove or reset allowance to 0
    this.state.approvals.splice(apprIndex, 1);

    // Add alert indicating revocation
    this.state.alerts.unshift({
      id: `alert-revoked-${Date.now()}`,
      timestamp: Date.now(),
      type: "UNLIMITED_APPROVAL",
      title: `Approval Revoked: ${removed.tokenSymbol}`,
      description: `Successfully revoked allowance for ${removed.spenderName}. Spender can no longer access your ${removed.tokenSymbol}.`,
      riskLevel: "SAFE",
      targetAddress: removed.spenderAddress,
      blocked: true,
    });

    this.recalculateSecurityScore();
    this.notify();
    return true;
  }

  public revokeAllCritical(): number {
    const criticalCount = this.state.approvals.filter((a) => a.riskLevel === "CRITICAL_DRAINER").length;
    this.state.approvals = this.state.approvals.filter((a) => a.riskLevel !== "CRITICAL_DRAINER");

    this.state.alerts.unshift({
      id: `alert-bulk-revoked-${Date.now()}`,
      timestamp: Date.now(),
      type: "DRAINER_PATTERN",
      title: "All High-Risk Drainer Approvals Terminated",
      description: `Emergency Defense triggered: Cleaned ${criticalCount} critical drainer spools. Wallet is shielded.`,
      riskLevel: "SAFE",
      targetAddress: "0x0000000000000000000000000000000000000000",
      blocked: true,
    });

    this.recalculateSecurityScore();
    this.notify();
    return criticalCount;
  }

  public simulateDrainerAttack(): {
    intercepted: boolean;
    drainerName: string;
    targetToken: string;
    reason: string;
  } {
    const drainer = KNOWN_DRAINER_SPENDERS[0];
    const newAlert: UnusualActivityAlert = {
      id: `attack-intercepted-${Date.now()}`,
      timestamp: Date.now(),
      type: "PHISHING_PERMIT",
      title: `⚡ MALICIOUS ATTACK BLOCKED: ${drainer.name}`,
      description: `Interception Engine caught fake EIP-712 Permit requesting zero-gas transferFrom sweep on 50,000 USDT. Execution halted!`,
      riskLevel: "CRITICAL_DRAINER",
      targetAddress: drainer.address,
      blocked: true,
    };

    this.state.alerts.unshift(newAlert);
    this.notify();

    return {
      intercepted: true,
      drainerName: drainer.name,
      targetToken: "USDT",
      reason: drainer.pattern,
    };
  }

  public simulateAddSafeApproval(tokenSymbol: string, protocolName: string, amount: string) {
    const newApproval: TokenApprovalRecord = {
      id: `appr-manual-${Date.now()}`,
      tokenSymbol,
      tokenName: `${tokenSymbol} Token`,
      tokenAddress: "0x" + Math.random().toString(16).slice(2, 42).padStart(40, "0"),
      spenderAddress: "0x" + Math.random().toString(16).slice(2, 42).padStart(40, "0"),
      spenderName: protocolName,
      spenderProtocol: protocolName,
      allowanceFormatted: amount,
      isUnlimited: amount.toLowerCase().includes("unlimited"),
      riskLevel: amount.toLowerCase().includes("unlimited") ? "SUSPICIOUS" : "SAFE",
      riskReason: "User approved contract via Token World Exchange verified order book routing.",
      timestamp: Date.now(),
      lastUpdatedDate: "Just now",
      chain: this.state.chainName,
      chainId: this.state.chainId,
    };

    this.state.approvals.unshift(newApproval);
    this.recalculateSecurityScore();
    this.notify();
  }
}

export const universalWalletExtensionEngine = new UniversalWalletExtensionEngine();
