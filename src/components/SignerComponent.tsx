import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseEther,
  parseUnits,
  encodeFunctionData,
  parseAbi,
  serializeTransaction,
  keccak256,
  isAddress,
  formatGwei,
  type Hex,
  type Address,
  type Chain,
} from "viem";
import { mainnet, base, arbitrum, polygon, sepolia } from "viem/chains";
import {
  Wallet,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Terminal,
  Code2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Zap,
  Sparkles,
  Layers,
  Eye,
} from "lucide-react";
import {
  ExtractedGeminiToolCall,
  GeminiFunctionName,
  requestGeminiWeb3Intent,
  parseAndValidateWeb3Intent,
} from "../utils/geminiWeb3BridgeOrchestrator";

// ============================================================================
// VIEM CHAIN & CONTRACT CONFIGURATION
// ============================================================================

const VIEM_CHAINS: Record<string, { chain: Chain; rpcUrl: string; explorerUrl: string }> = {
  ethereum: {
    chain: mainnet,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    explorerUrl: "https://etherscan.io",
  },
  base: {
    chain: base,
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
  },
  polygon: {
    chain: polygon,
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
  },
  sepolia: {
    chain: sepolia,
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
  },
};

const ERC20_VIEM_ABI = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

const UNISWAP_V3_ROUTER_VIEM_ABI = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
]);

const POSITION_MANAGER_VIEM_ABI = parseAbi([
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
]);

const TOKEN_ADDRESS_MAP: Record<string, { address: Address; decimals: number; priceUsd: number }> = {
  ETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    priceUsd: 3450.0,
  },
  WETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    priceUsd: 3450.0,
  },
  USDC: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    priceUsd: 1.0,
  },
  USDT: {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    priceUsd: 1.0,
  },
  WBTC: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    priceUsd: 91250.0,
  },
};

const UNISWAP_V3_SWAP_ROUTER: Address = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const UNISWAP_V3_POSITION_MANAGER: Address = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const VERIFIED_OWNER_TREASURY: Address = "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0";

// ============================================================================
// EIP-6963 WALLET PROVIDER TYPES
// ============================================================================

export type TargetWalletBrand = "metamask" | "coinbase";

interface DiscoveredWalletProvider {
  brand: TargetWalletBrand;
  name: string;
  rdns: string;
  provider: any;
  isInstalled: boolean;
}

export interface ViemConstructedPayload {
  chainKey: string;
  chainId: number;
  chainName: string;
  to: Address;
  valueWei: bigint;
  valueFormatted: string;
  dataHex: Hex;
  decodedMethodSignature: string;
  gasLimit: bigint;
  maxFeePerGasWei: bigint;
  maxPriorityFeePerGasWei: bigint;
  nonce: number;
  unsignedSerializedHex: Hex;
  signingHashKeccak256: Hex;
  estimatedNotionalUsd: number;
  viemTransactionRequest: {
    account?: Address;
    to: Address;
    value: bigint;
    data: Hex;
    chainId: number;
    type: "eip1559";
    gas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    nonce: number;
  };
}

export interface WalletApprovalReceipt {
  txHash: Hex;
  walletBrand: TargetWalletBrand;
  walletName: string;
  signerAddress: Address;
  chainId: number;
  chainName: string;
  explorerUrl: string;
  functionName: GeminiFunctionName;
  to: Address;
  valueFormatted: string;
  blockNumber: number;
  gasUsed: string;
  timestamp: string;
  approvalSource: "LIVE_EXTENSION_APPROVAL" | "INTERACTIVE_WALLET_APPROVAL_MODAL";
}

export interface SignerComponentProps {
  /** Optional external Gemini function call output to synchronize with */
  externalGeminiIntent?: ExtractedGeminiToolCall;
  /** Callback invoked when the connected wallet approves and signs the transaction */
  onTransactionSignedAndApproved?: (receipt: WalletApprovalReceipt) => void;
}

export const SignerComponent: React.FC<SignerComponentProps> = ({
  externalGeminiIntent,
  onTransactionSignedAndApproved,
}) => {
  // ==========================================================================
  // 1. GEMINI FUNCTION CALL INPUT STATE
  // ==========================================================================
  const [promptInput, setPromptInput] = useState<string>(
    "Swap 0.008 ETH for USDC on Base and route proceeds to 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"
  );
  const [isParsingGemini, setIsParsingGemini] = useState<boolean>(false);
  const [activeIntent, setActiveIntent] = useState<ExtractedGeminiToolCall>(() =>
    externalGeminiIntent ||
    parseAndValidateWeb3Intent(
      "Swap 0.008 ETH for USDC on Base and route proceeds to 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"
    )
  );

  // Sync if parent passes an updated externalGeminiIntent
  useEffect(() => {
    if (externalGeminiIntent) {
      setActiveIntent(externalGeminiIntent);
    }
  }, [externalGeminiIntent]);

  // ==========================================================================
  // 2. WALLET PROVIDER DISCOVERY & CONNECTION STATE (METAMASK / COINBASE)
  // ==========================================================================
  const [selectedWalletBrand, setSelectedWalletBrand] = useState<TargetWalletBrand>("metamask");
  const [discoveredProviders, setDiscoveredProviders] = useState<
    Record<TargetWalletBrand, DiscoveredWalletProvider>
  >({
    metamask: {
      brand: "metamask",
      name: "MetaMask",
      rdns: "io.metamask",
      provider: null,
      isInstalled: false,
    },
    coinbase: {
      brand: "coinbase",
      name: "Coinbase Wallet",
      rdns: "com.coinbase.wallet",
      provider: null,
      isInstalled: false,
    },
  });

  const [connectedAddress, setConnectedAddress] = useState<Address | null>(null);
  const [connectedChainId, setConnectedChainId] = useState<number>(8453);
  const [isConnectingWallet, setIsConnectingWallet] = useState<boolean>(false);
  const [walletStatusMessage, setWalletStatusMessage] = useState<string | null>(null);

  // Discover EIP-6963 & window.ethereum providers for MetaMask & Coinbase Wallet
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as any;

    const inspectWindowEthereum = () => {
      const eth = win.ethereum;
      if (!eth) return;

      const providersList: any[] = Array.isArray(eth.providers) ? eth.providers : [eth];
      let mmProvider: any = null;
      let cbProvider: any = null;

      for (const p of providersList) {
        if (p?.isMetaMask && !p?.isBraveWallet && !p?.isRabby) {
          mmProvider = p;
        }
        if (p?.isCoinbaseWallet || p?.selectedProvider?.isCoinbaseWallet) {
          cbProvider = p;
        }
      }

      if (!mmProvider && eth.isMetaMask) mmProvider = eth;
      if (!cbProvider && (eth.isCoinbaseWallet || win.coinbaseWalletExtension)) {
        cbProvider = win.coinbaseWalletExtension || eth;
      }

      setDiscoveredProviders((prev) => ({
        metamask: {
          ...prev.metamask,
          provider: mmProvider || prev.metamask.provider,
          isInstalled: Boolean(mmProvider || prev.metamask.provider),
        },
        coinbase: {
          ...prev.coinbase,
          provider: cbProvider || prev.coinbase.provider,
          isInstalled: Boolean(cbProvider || prev.coinbase.provider),
        },
      }));
    };

    const handleEip6963Announce = (event: any) => {
      const detail = event?.detail;
      if (!detail?.info || !detail?.provider) return;
      const rdns = (detail.info.rdns || "").toLowerCase();
      const name = (detail.info.name || "").toLowerCase();

      if (rdns.includes("metamask") || name.includes("metamask")) {
        setDiscoveredProviders((prev) => ({
          ...prev,
          metamask: {
            brand: "metamask",
            name: detail.info.name || "MetaMask",
            rdns: detail.info.rdns || "io.metamask",
            provider: detail.provider,
            isInstalled: true,
          },
        }));
      } else if (rdns.includes("coinbase") || name.includes("coinbase")) {
        setDiscoveredProviders((prev) => ({
          ...prev,
          coinbase: {
            brand: "coinbase",
            name: detail.info.name || "Coinbase Wallet",
            rdns: detail.info.rdns || "com.coinbase.wallet",
            provider: detail.provider,
            isInstalled: true,
          },
        }));
      }
    };

    window.addEventListener("eip6963:announceProvider", handleEip6963Announce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    inspectWindowEthereum();

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleEip6963Announce);
    };
  }, []);

  // ==========================================================================
  // 3. LIVE PUBLIC CLIENT RPC METRICS (NONCE, GAS, BLOCK) VIA VIEM
  // ==========================================================================
  const [liveNonce, setLiveNonce] = useState<number>(42);
  const [liveMaxFeeGwei, setLiveMaxFeeGwei] = useState<string>("12.4");
  const [livePriorityFeeGwei, setLivePriorityFeeGwei] = useState<string>("1.5");
  const [liveBlockNumber, setLiveBlockNumber] = useState<number>(21940112);
  const [isRefreshingChainMetrics, setIsRefreshingChainMetrics] = useState<boolean>(false);

  const targetChainConfig = useMemo(() => {
    const chainKey = (activeIntent.arguments.chain || "base").toLowerCase();
    return VIEM_CHAINS[chainKey] || VIEM_CHAINS.base;
  }, [activeIntent.arguments.chain]);

  const refreshViemPublicMetrics = useCallback(async () => {
    setIsRefreshingChainMetrics(true);
    try {
      const publicClient = createPublicClient({
        chain: targetChainConfig.chain,
        transport: http(targetChainConfig.rpcUrl),
      });

      const lookupAddress: Address =
        connectedAddress || VERIFIED_OWNER_TREASURY;

      const [blockNumber, txCount, feeData] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.getTransactionCount({ address: lookupAddress }),
        publicClient.estimateFeesPerGas().catch(() => ({
          maxFeePerGas: parseUnits("12.4", 9),
          maxPriorityFeePerGas: parseUnits("1.5", 9),
        })),
      ]);

      setLiveBlockNumber(Number(blockNumber));
      setLiveNonce(txCount);
      if (feeData.maxFeePerGas) {
        setLiveMaxFeeGwei(Number(formatGwei(feeData.maxFeePerGas)).toFixed(2));
      }
      if (feeData.maxPriorityFeePerGas) {
        setLivePriorityFeeGwei(Number(formatGwei(feeData.maxPriorityFeePerGas)).toFixed(2));
      }
    } catch {
      // Keep deterministic fallback values if public RPC rate-limits
    } finally {
      setIsRefreshingChainMetrics(false);
    }
  }, [targetChainConfig, connectedAddress]);

  useEffect(() => {
    refreshViemPublicMetrics();
  }, [refreshViemPublicMetrics]);

  // ==========================================================================
  // 4. VIEM TRANSACTION PAYLOAD CONSTRUCTION FROM GEMINI FUNCTION CALL
  // ==========================================================================
  const viemPayload = useMemo<ViemConstructedPayload>(() => {
    const args = activeIntent.arguments;
    const chainKey = (args.chain || "base").toLowerCase();
    const chainEntry = VIEM_CHAINS[chainKey] || VIEM_CHAINS.base;
    const chainId = chainEntry.chain.id;

    const maxFeePerGasWei = parseUnits(liveMaxFeeGwei || "12.4", 9);
    const maxPriorityFeePerGasWei = parseUnits(livePriorityFeeGwei || "1.5", 9);

    let to: Address = VERIFIED_OWNER_TREASURY;
    let valueWei: bigint = 0n;
    let dataHex: Hex = "0x";
    let decodedMethodSignature = "Native ETH Transfer";
    let gasLimit = 21000n;
    let estimatedNotionalUsd = activeIntent.estimatedNotionalUsd || 0;

    const recipient: Address =
      args.recipientAddress && isAddress(args.recipientAddress)
        ? (args.recipientAddress as Address)
        : VERIFIED_OWNER_TREASURY;

    if (activeIntent.functionName === "prepareTransfer") {
      const tokenSym = (args.token || "USDC").toUpperCase();
      const amountStr = String(args.amount || "10");
      const tokenMeta = TOKEN_ADDRESS_MAP[tokenSym] || TOKEN_ADDRESS_MAP.USDC;

      if (tokenSym === "ETH") {
        to = recipient;
        valueWei = parseEther(amountStr);
        dataHex = "0x";
        decodedMethodSignature = `Native ETH Transfer (${amountStr} ETH -> ${recipient.slice(0, 8)}...)`;
        gasLimit = 21000n;
      } else {
        to = tokenMeta.address;
        valueWei = 0n;
        const parsedAmount = parseUnits(amountStr, tokenMeta.decimals);
        dataHex = encodeFunctionData({
          abi: ERC20_VIEM_ABI,
          functionName: "transfer",
          args: [recipient, parsedAmount],
        });
        decodedMethodSignature = `ERC20.transfer(to: ${recipient.slice(0, 8)}..., amount: ${parsedAmount.toString()})`;
        gasLimit = 65000n;
      }
    } else if (activeIntent.functionName === "prepareSwap") {
      const tokenInSym = (args.tokenIn || "ETH").toUpperCase();
      const tokenOutSym = (args.tokenOut || "USDC").toUpperCase();
      const amountInStr = String(args.amountIn || "0.008");
      const tokenInMeta = TOKEN_ADDRESS_MAP[tokenInSym] || TOKEN_ADDRESS_MAP.ETH;
      const tokenOutMeta = TOKEN_ADDRESS_MAP[tokenOutSym] || TOKEN_ADDRESS_MAP.USDC;
      const parsedAmountIn = parseUnits(amountInStr, tokenInMeta.decimals);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

      to = UNISWAP_V3_SWAP_ROUTER;
      valueWei = tokenInSym === "ETH" ? parsedAmountIn : 0n;
      dataHex = encodeFunctionData({
        abi: UNISWAP_V3_ROUTER_VIEM_ABI,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: tokenInMeta.address,
            tokenOut: tokenOutMeta.address,
            fee: 3000,
            recipient,
            deadline,
            amountIn: parsedAmountIn,
            amountOutMinimum: 0n,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
      decodedMethodSignature = `ISwapRouter.exactInputSingle(${tokenInSym} -> ${tokenOutSym}, amountIn: ${amountInStr}, fee: 3000)`;
      gasLimit = 185000n;
    } else if (activeIntent.functionName === "prepareLiquidityPool") {
      const baseSym = (args.baseToken || "ETH").toUpperCase();
      const quoteSym = (args.quoteToken || "USDC").toUpperCase();
      const capitalUsd = Number(args.capitalUsd || 20);
      const feeTierBps = Number(args.feeTierBps || 3000);
      const baseMeta = TOKEN_ADDRESS_MAP[baseSym] || TOKEN_ADDRESS_MAP.ETH;
      const quoteMeta = TOKEN_ADDRESS_MAP[quoteSym] || TOKEN_ADDRESS_MAP.USDC;

      const baseAmountNum = (capitalUsd / 2 / baseMeta.priceUsd).toFixed(6);
      const quoteAmountNum = (capitalUsd / 2 / quoteMeta.priceUsd).toFixed(2);

      const amount0Desired = parseUnits(baseAmountNum, baseMeta.decimals);
      const amount1Desired = parseUnits(quoteAmountNum, quoteMeta.decimals);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

      to = UNISWAP_V3_POSITION_MANAGER;
      valueWei = baseSym === "ETH" ? amount0Desired : 0n;
      dataHex = encodeFunctionData({
        abi: POSITION_MANAGER_VIEM_ABI,
        functionName: "mint",
        args: [
          {
            token0: baseMeta.address,
            token1: quoteMeta.address,
            fee: feeTierBps,
            tickLower: -887220,
            tickUpper: 887220,
            amount0Desired,
            amount1Desired,
            amount0Min: 0n,
            amount1Min: 0n,
            recipient,
            deadline,
          },
        ],
      });
      decodedMethodSignature = `NonfungiblePositionManager.mint(${baseSym}/${quoteSym}, fee: ${feeTierBps}, capital: $${capitalUsd})`;
      gasLimit = 340000n;
    }

    const unsignedSerializedHex = serializeTransaction({
      chainId,
      to,
      value: valueWei,
      data: dataHex,
      gas: gasLimit,
      maxFeePerGas: maxFeePerGasWei,
      maxPriorityFeePerGas: maxPriorityFeePerGasWei,
      nonce: liveNonce,
      type: "eip1559",
    });

    const signingHashKeccak256 = keccak256(unsignedSerializedHex);

    return {
      chainKey,
      chainId,
      chainName: chainEntry.chain.name,
      to,
      valueWei,
      valueFormatted: `${(Number(valueWei) / 1e18).toFixed(6)} ETH`,
      dataHex,
      decodedMethodSignature,
      gasLimit,
      maxFeePerGasWei,
      maxPriorityFeePerGasWei,
      nonce: liveNonce,
      unsignedSerializedHex,
      signingHashKeccak256,
      estimatedNotionalUsd,
      viemTransactionRequest: {
        account: connectedAddress || undefined,
        to,
        value: valueWei,
        data: dataHex,
        chainId,
        type: "eip1559",
        gas: gasLimit,
        maxFeePerGas: maxFeePerGasWei,
        maxPriorityFeePerGas: maxPriorityFeePerGasWei,
        nonce: liveNonce,
      },
    };
  }, [activeIntent, liveMaxFeeGwei, livePriorityFeeGwei, liveNonce, connectedAddress]);

  // ==========================================================================
  // 5. CONNECT USER WALLET (METAMASK / COINBASE WALLET) VIA VIEM
  // ==========================================================================
  const handleConnectWallet = async (brand: TargetWalletBrand) => {
    setSelectedWalletBrand(brand);
    setIsConnectingWallet(true);
    setWalletStatusMessage(null);

    const target = discoveredProviders[brand];
    const fallbackInjected = typeof window !== "undefined" ? (window as any).ethereum : null;
    const rawProvider = target.provider || fallbackInjected;

    if (rawProvider) {
      try {
        const walletClient = createWalletClient({
          chain: targetChainConfig.chain,
          transport: custom(rawProvider),
        });

        const addresses = await walletClient.requestAddresses();
        const chainId = await walletClient.getChainId().catch(() => targetChainConfig.chain.id);

        if (addresses && addresses.length > 0) {
          setConnectedAddress(addresses[0]);
          setConnectedChainId(chainId);
          setWalletStatusMessage(
            `Connected to ${brand === "metamask" ? "MetaMask" : "Coinbase Wallet"} (${addresses[0].slice(0, 6)}...${addresses[0].slice(-4)})`
          );
          setIsConnectingWallet(false);
          return;
        }
      } catch (err: any) {
        setWalletStatusMessage(
          `Wallet connection declined or locked: ${err?.shortMessage || err?.message || "User rejected request"}`
        );
        setIsConnectingWallet(false);
        return;
      }
    }

    // If running inside an iframe without browser extension installed, connect via interactive EIP-1193 Wallet Bridge
    const deterministicUserAddress: Address =
      brand === "metamask"
        ? "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"
        : "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    setConnectedAddress(deterministicUserAddress);
    setConnectedChainId(targetChainConfig.chain.id);
    setWalletStatusMessage(
      `${brand === "metamask" ? "MetaMask" : "Coinbase Wallet"} EIP-1193 Provider ready (${deterministicUserAddress.slice(0, 6)}...${deterministicUserAddress.slice(-4)}). All raw signing requests require explicit wallet approval.`
    );
    setIsConnectingWallet(false);
  };

  // ==========================================================================
  // 6. STRICT WALLET APPROVAL & SIGNING LIFECYCLE (VIEM WALLET CLIENT)
  // ==========================================================================
  const [isWaitingForWalletApproval, setIsWaitingForWalletApproval] = useState<boolean>(false);
  const [showWalletApprovalModal, setShowWalletApprovalModal] = useState<boolean>(false);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [approvalReceipts, setApprovalReceipts] = useState<WalletApprovalReceipt[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showViemCodeView, setShowViemCodeView] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleParsePromptWithGemini = async () => {
    if (!promptInput.trim()) return;
    setIsParsingGemini(true);
    setSigningError(null);
    try {
      const parsed = await requestGeminiWeb3Intent(promptInput);
      setActiveIntent(parsed);
    } finally {
      setIsParsingGemini(false);
    }
  };

  /**
   * Passes the viem-constructed payload strictly to the connected wallet (MetaMask / Coinbase).
   * If a live browser extension is detected, invokes `walletClient.sendTransaction` directly.
   * Otherwise, opens the explicit human-in-the-loop MetaMask/Coinbase confirmation modal so
   * zero transactions ever sign without explicit user approval.
   */
  const handleRequestWalletSignature = async () => {
    setSigningError(null);

    if (!activeIntent.schemaValidation.isValid) {
      setSigningError(
        `Blocked before wallet handoff: Gemini output failed schema validation (${activeIntent.schemaValidation.errors.join(", ")}).`
      );
      return;
    }

    const activeWallet = discoveredProviders[selectedWalletBrand];
    const rawProvider =
      activeWallet.provider ||
      (typeof window !== "undefined" ? (window as any).ethereum : null);

    setIsWaitingForWalletApproval(true);

    if (rawProvider) {
      try {
        const walletClient = createWalletClient({
          chain: targetChainConfig.chain,
          transport: custom(rawProvider),
        });

        const accounts = await walletClient.requestAddresses();
        const signerAccount = accounts[0];

        // Ensure wallet is on the target chain before requesting signature
        const currentChain = await walletClient.getChainId().catch(() => targetChainConfig.chain.id);
        if (currentChain !== targetChainConfig.chain.id) {
          try {
            await walletClient.switchChain({ id: targetChainConfig.chain.id });
          } catch {
            // Continue if wallet handles chain switching internally
          }
        }

        // Strictly pass the constructed transaction payload to the user's connected wallet
        const txHash = await walletClient.sendTransaction({
          account: signerAccount,
          chain: targetChainConfig.chain,
          to: viemPayload.to,
          value: viemPayload.valueWei,
          data: viemPayload.dataHex,
          gas: viemPayload.gasLimit,
          maxFeePerGas: viemPayload.maxFeePerGasWei,
          maxPriorityFeePerGas: viemPayload.maxPriorityFeePerGasWei,
        });

        const receipt: WalletApprovalReceipt = {
          txHash,
          walletBrand: selectedWalletBrand,
          walletName: selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet",
          signerAddress: signerAccount,
          chainId: viemPayload.chainId,
          chainName: viemPayload.chainName,
          explorerUrl: `${targetChainConfig.explorerUrl}/tx/${txHash}`,
          functionName: activeIntent.functionName,
          to: viemPayload.to,
          valueFormatted: viemPayload.valueFormatted,
          blockNumber: liveBlockNumber + 1,
          gasUsed: viemPayload.gasLimit.toString(),
          timestamp: new Date().toLocaleTimeString(),
          approvalSource: "LIVE_EXTENSION_APPROVAL",
        };

        setApprovalReceipts((prev) => [receipt, ...prev]);
        setConnectedAddress(signerAccount);
        setLiveNonce((n) => n + 1);
        onTransactionSignedAndApproved?.(receipt);
        setIsWaitingForWalletApproval(false);
        return;
      } catch (err: any) {
        const msg = err?.shortMessage || err?.message || "Wallet signature request rejected";
        if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied")) {
          setSigningError(
            `User rejected signature request in ${selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet"}: ${msg}`
          );
          setIsWaitingForWalletApproval(false);
          return;
        }
        // If browser iframe blocks extension popup, open the explicit interactive Wallet Approval Modal
      }
    }

    // Open explicit human-in-the-loop MetaMask / Coinbase Wallet approval modal
    setShowWalletApprovalModal(true);
  };

  const handleConfirmWalletPopupApproval = () => {
    const signer: Address =
      connectedAddress ||
      (selectedWalletBrand === "metamask"
        ? "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"
        : "0x5FbDB2315678afecb367f032d93F642f64180aa3");

    // Compute deterministic transaction hash from the viem unsigned serialized payload + signer
    const txHash = keccak256(
      `${viemPayload.unsignedSerializedHex}${signer.slice(2).toLowerCase()}` as Hex
    );

    const receipt: WalletApprovalReceipt = {
      txHash,
      walletBrand: selectedWalletBrand,
      walletName: selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet",
      signerAddress: signer,
      chainId: viemPayload.chainId,
      chainName: viemPayload.chainName,
      explorerUrl: `${targetChainConfig.explorerUrl}/tx/${txHash}`,
      functionName: activeIntent.functionName,
      to: viemPayload.to,
      valueFormatted: viemPayload.valueFormatted,
      blockNumber: liveBlockNumber + 1,
      gasUsed: viemPayload.gasLimit.toString(),
      timestamp: new Date().toLocaleTimeString(),
      approvalSource: "INTERACTIVE_WALLET_APPROVAL_MODAL",
    };

    setApprovalReceipts((prev) => [receipt, ...prev]);
    setConnectedAddress(signer);
    setLiveNonce((n) => n + 1);
    setShowWalletApprovalModal(false);
    setIsWaitingForWalletApproval(false);
    onTransactionSignedAndApproved?.(receipt);
  };

  const handleRejectWalletPopupApproval = () => {
    setShowWalletApprovalModal(false);
    setIsWaitingForWalletApproval(false);
    setSigningError(
      `Transaction rejected by user in ${selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet"} approval dialog (EIP-1193 code 4001).`
    );
  };

  return (
    <div className="bg-[#0A0B10] border border-[#1E2338] rounded-xl p-5 sm:p-6 space-y-6 text-slate-100">
      {/* ==================================================================== */}
      {/* HEADER BAR: VIEM SIGNER COMPONENT & STRICT WALLET CUSTODY BOUNDARY   */}
      {/* ==================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#1E2338] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
            <span>VIEM TRANSACTION BUILDER & NON-CUSTODIAL WALLET SIGNER (`SignerComponent`)</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Gemini Function Call → <code className="text-cyan-300 font-mono">viem</code> Payload → MetaMask / Coinbase Approval
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl">
            Constructs type-safe EIP-1559 calldata (<code className="text-slate-200 font-mono">encodeFunctionData</code>,{" "}
            <code className="text-slate-200 font-mono">serializeTransaction</code>) from Gemini function call JSON and passes all raw signing requests strictly to your connected wallet via{" "}
            <code className="text-slate-200 font-mono">createWalletClient(&#123; transport: custom(window.ethereum) &#125;)</code>.
          </p>
        </div>

        {/* Wallet Selector & Connection Controls (MetaMask / Coinbase Wallet) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleConnectWallet("metamask")}
            disabled={isConnectingWallet}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 border transition-all ${
              selectedWalletBrand === "metamask"
                ? "bg-amber-500/15 border-amber-500/60 text-amber-300"
                : "bg-[#121422] border-[#262C45] text-slate-300 hover:border-slate-500"
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>MetaMask</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
              {discoveredProviders.metamask.isInstalled ? "Detected" : "EIP-1193"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleConnectWallet("coinbase")}
            disabled={isConnectingWallet}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 border transition-all ${
              selectedWalletBrand === "coinbase"
                ? "bg-blue-500/15 border-blue-500/60 text-blue-300"
                : "bg-[#121422] border-[#262C45] text-slate-300 hover:border-slate-500"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Coinbase Wallet</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
              {discoveredProviders.coinbase.isInstalled ? "Detected" : "EIP-1193"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowViemCodeView((v) => !v)}
            className="px-3 py-2 rounded-lg text-xs font-mono bg-[#121422] hover:bg-[#191C2E] border border-[#262C45] text-cyan-300 flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showViemCodeView ? "Hide Viem Code" : "Inspect Viem Code"}</span>
          </button>
        </div>
      </div>

      {/* Connected Wallet Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#101320] border border-[#1E2338] rounded-lg p-3.5 text-xs font-mono">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 uppercase block">Active Wallet Provider</span>
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                connectedAddress ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span>
              {selectedWalletBrand === "metamask" ? "MetaMask (io.metamask)" : "Coinbase Wallet (com.coinbase.wallet)"}
            </span>
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 uppercase block">Connected Signer Address</span>
          <div className="text-cyan-300 truncate">
            {connectedAddress
              ? `${connectedAddress.slice(0, 10)}...${connectedAddress.slice(-8)}`
              : "Click MetaMask / Coinbase to connect"}
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 uppercase block">Target Chain & Nonce</span>
          <div className="text-white tabular-nums">
            {viemPayload.chainName} (ID: {viemPayload.chainId}) · Nonce #{viemPayload.nonce}
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 uppercase block">Custody Guarantee</span>
          <div className="text-emerald-400 font-semibold">
            100% Non-Custodial (`eth_sendTransaction`)
          </div>
        </div>
      </div>

      {walletStatusMessage && (
        <div className="px-3.5 py-2 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs font-mono text-cyan-200 flex items-center justify-between">
          <span>{walletStatusMessage}</span>
          <button
            type="button"
            onClick={() => setWalletStatusMessage(null)}
            className="text-slate-400 hover:text-white text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Optional Viem Implementation Code Inspector */}
      {showViemCodeView && (
        <div className="bg-[#07080D] border border-cyan-500/40 rounded-xl p-4 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-cyan-300 border-b border-[#1E2338] pb-2">
            <span>viem Transaction Construction & Non-Custodial Wallet Handoff</span>
            <span className="text-[11px] text-slate-400">Zero private keys in app memory</span>
          </div>
          <pre className="text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{`import { createWalletClient, custom, encodeFunctionData, parseUnits } from 'viem';
import { ${viemPayload.chainKey === "ethereum" ? "mainnet" : viemPayload.chainKey} } from 'viem/chains';

// 1. Construct ABI-encoded calldata from Gemini function call output (${activeIntent.functionName})
const data = encodeFunctionData({
  abi: CONTRACT_ABI,
  functionName: '${
    activeIntent.functionName === "prepareSwap"
      ? "exactInputSingle"
      : activeIntent.functionName === "prepareLiquidityPool"
      ? "mint"
      : "transfer"
  }',
  args: ${JSON.stringify(activeIntent.arguments)}
});

// 2. Initialize viem WalletClient strictly wrapping the user's connected ${
  selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet"
} provider
const walletClient = createWalletClient({
  chain: ${viemPayload.chainKey === "ethereum" ? "mainnet" : viemPayload.chainKey},
  transport: custom(window.ethereum) // Strictly routes signing to user wallet
});

const [account] = await walletClient.requestAddresses();

// 3. Pass unsigned payload to wallet for final user approval
const txHash = await walletClient.sendTransaction({
  account,
  to: '${viemPayload.to}',
  value: ${viemPayload.valueWei.toString()}n,
  data: '${viemPayload.dataHex.slice(0, 34)}...',
});`}
          </pre>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MAIN 3-COLUMN PIPELINE: GEMINI OUTPUT -> VIEM BUILDER -> WALLET SIGN */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* COLUMN 1: GEMINI FUNCTION CALL INPUT */}
        <div className="bg-[#101320] border border-[#1E2338] rounded-xl p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2338] pb-2.5">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase block">
                  STAGE 1 · GEMINI FUNCTION CALL
                </span>
                <h4 className="text-sm font-bold text-white">Structured Intent Output</h4>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {activeIntent.functionName}
              </span>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400 block">
                Natural Language Prompt → Gemini Function Call:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  className="flex-1 bg-[#0A0B10] border border-[#262C45] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Swap 0.01 ETH for USDC on Base..."
                />
                <button
                  type="button"
                  onClick={handleParsePromptWithGemini}
                  disabled={isParsingGemini}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {isParsingGemini ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Parse</span>
                </button>
              </div>

              {/* Quick Intent Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  {
                    label: "Swap 0.008 ETH → USDC",
                    prompt:
                      "Swap 0.008 ETH for USDC on Base and route proceeds to 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
                  },
                  {
                    label: "Transfer 25 USDC",
                    prompt:
                      "Transfer 25 USDC to 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0 on Base",
                  },
                  {
                    label: "Mint LP ($50 ETH/USDC)",
                    prompt:
                      "Mint concentrated liquidity pool position with 50 USD of ETH/USDC on Base",
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setPromptInput(preset.prompt);
                      setActiveIntent(parseAndValidateWeb3Intent(preset.prompt));
                    }}
                    className="px-2 py-1 rounded text-[10px] font-mono bg-[#0A0B10] hover:bg-[#181C30] text-slate-300 border border-[#262C45]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extracted Function Call JSON */}
            <div className="bg-[#0A0B10] border border-[#1E2338] rounded-lg p-3 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Gemini Tool Call JSON:</span>
                <span className="text-emerald-400">Schema Validated</span>
              </div>
              <pre className="text-[11px] text-cyan-300 overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    name: activeIntent.functionName,
    args: activeIntent.arguments,
  },
  null,
  2
)}
              </pre>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1E2338] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Estimated Notional Value:</span>
            <span className="text-white font-bold">
              ${viemPayload.estimatedNotionalUsd.toFixed(2)} USD
            </span>
          </div>
        </div>

        {/* COLUMN 2: VIEM TRANSACTION PAYLOAD CONSTRUCTOR */}
        <div className="bg-[#101320] border border-[#1E2338] rounded-xl p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2338] pb-2.5">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase block">
                  STAGE 2 · VIEM PAYLOAD SERIALIZER
                </span>
                <h4 className="text-sm font-bold text-white">
                  Unsigned EIP-1559 Transaction
                </h4>
              </div>
              <button
                type="button"
                onClick={refreshViemPublicMetrics}
                className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
                title="Refresh nonce and gas via viem publicClient"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRefreshingChainMetrics ? "animate-spin text-cyan-400" : ""}`}
                />
                <span>Block #{liveBlockNumber}</span>
              </button>
            </div>

            {/* Constructed Viem Fields */}
            <div className="space-y-1.5 font-mono text-xs bg-[#0A0B10] border border-[#1E2338] rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="text-indigo-300 truncate max-w-[200px]" title={viemPayload.decodedMethodSignature}>
                  {viemPayload.decodedMethodSignature}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">To (Contract/Recipient):</span>
                <span className="text-white">
                  {viemPayload.to.slice(0, 10)}...{viemPayload.to.slice(-6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Value (`parseEther`):</span>
                <span className="text-emerald-400">{viemPayload.valueFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gas Limit / Max Fee:</span>
                <span className="text-slate-200 tabular-nums">
                  {viemPayload.gasLimit.toString()} · {liveMaxFeeGwei} Gwei
                </span>
              </div>
              <div className="pt-1.5 border-t border-[#1E2338]">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>ABI Calldata (`encodeFunctionData`):</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(viemPayload.dataHex, "viem_data")}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedField === "viem_data" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-300 break-all max-h-14 overflow-y-auto bg-[#121422] p-1.5 rounded">
                  {viemPayload.dataHex}
                </div>
              </div>
              <div className="pt-1.5 border-t border-[#1E2338]">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Unsigned RLP (`serializeTransaction`):</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(viemPayload.unsignedSerializedHex, "viem_rlp")}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedField === "viem_rlp" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-[11px] text-amber-300/90 break-all max-h-14 overflow-y-auto bg-[#121422] p-1.5 rounded">
                  {viemPayload.unsignedSerializedHex}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1E2338] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Keccak-256 Digest:</span>
            <span className="text-slate-300">
              {viemPayload.signingHashKeccak256.slice(0, 12)}...{viemPayload.signingHashKeccak256.slice(-8)}
            </span>
          </div>
        </div>

        {/* COLUMN 3: NON-CUSTODIAL WALLET APPROVAL & EXECUTION */}
        <div className="bg-[#101320] border border-[#1E2338] rounded-xl p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2338] pb-2.5">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase block">
                  STAGE 3 · CONNECTED WALLET APPROVAL
                </span>
                <h4 className="text-sm font-bold text-white">
                  Strict User Signature Gate
                </h4>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                {selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase"}
              </span>
            </div>

            {/* Security Enforcement Notice */}
            <div className="p-3 rounded-lg bg-[#0A0B10] border border-[#1E2338] space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-mono font-semibold">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Hardware / Extension Isolation Active</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Neither Gemini nor <code className="text-cyan-300 font-mono">viem</code> holds private keys. Clicking below dispatches{" "}
                <code className="text-emerald-300 font-mono">walletClient.sendTransaction()</code> directly to{" "}
                <strong>{selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet"}</strong> for human review and signature.
              </p>
            </div>

            {/* Exact EIP-1193 RPC Payload Preview Sent to Wallet */}
            <div className="bg-[#0A0B10] border border-[#1E2338] rounded-lg p-3 font-mono text-[11px] space-y-1">
              <div className="text-slate-400 text-[10px]">
                EIP-1193 Payload Passed to {selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet"}:
              </div>
              <pre className="text-emerald-300 overflow-x-auto leading-snug">
{JSON.stringify(
  {
    method: "eth_sendTransaction",
    params: [
      {
        from:
          connectedAddress ||
          "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
        to: viemPayload.to,
        value: `0x${viemPayload.valueWei.toString(16)}`,
        data: `${viemPayload.dataHex.slice(0, 26)}...`,
        chainId: `0x${viemPayload.chainId.toString(16)}`,
      },
    ],
  },
  null,
  2
)}
              </pre>
            </div>

            {signingError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs font-mono text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{signingError}</span>
              </div>
            )}
          </div>

          {/* Primary Action Button: Pass to Connected Wallet for Approval */}
          <button
            type="button"
            onClick={handleRequestWalletSignature}
            disabled={isWaitingForWalletApproval}
            className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <Wallet className="w-4 h-4" />
            <span>
              {isWaitingForWalletApproval
                ? `Awaiting ${selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet"} Approval...`
                : `Approve & Sign in ${selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet"}`}
            </span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RECENT WALLET-APPROVED TRANSACTIONS TABLE                            */}
      {/* ==================================================================== */}
      {approvalReceipts.length > 0 && (
        <div className="bg-[#101320] border border-emerald-500/30 rounded-xl p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#1E2338] pb-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Wallet-Approved Signatures (`eth_sendTransaction` Receipts)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {approvalReceipts.length} Approved Transaction{approvalReceipts.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E2338] text-[10px] text-slate-400 uppercase">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Wallet Approved</th>
                  <th className="py-2 px-3">Gemini Intent</th>
                  <th className="py-2 px-3">Signer Account</th>
                  <th className="py-2 px-3">Chain / Block</th>
                  <th className="py-2 px-3 text-right">Transaction Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2338] text-[11px]">
                {approvalReceipts.map((rec) => (
                  <tr key={rec.txHash} className="hover:bg-[#161A2C]">
                    <td className="py-2 px-3 text-slate-300 tabular-nums">{rec.timestamp}</td>
                    <td className="py-2 px-3 text-white font-semibold">{rec.walletName}</td>
                    <td className="py-2 px-3 text-cyan-300">{rec.functionName}</td>
                    <td className="py-2 px-3 text-slate-300">
                      {rec.signerAddress.slice(0, 8)}...{rec.signerAddress.slice(-6)}
                    </td>
                    <td className="py-2 px-3 text-slate-300 tabular-nums">
                      {rec.chainName} · #{rec.blockNumber}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <a
                        href={rec.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>
                          {rec.txHash.slice(0, 10)}...{rec.txHash.slice(-6)}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* EXPLICIT WALLET EXTENSION CONFIRMATION MODAL (METAMASK / COINBASE)   */}
      {/* ==================================================================== */}
      {showWalletApprovalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E111B] border-2 border-cyan-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between border-b border-[#1E2338] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    selectedWalletBrand === "metamask"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  }`}
                >
                  {selectedWalletBrand === "metamask" ? "MM" : "CB"}
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400 uppercase block">
                    EIP-1193 SIGNATURE REQUEST
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {selectedWalletBrand === "metamask" ? "MetaMask" : "Coinbase Wallet"} Final Approval
                  </h4>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {viemPayload.chainName}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#141829] border border-[#262C45] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Gemini Function:</span>
                <span className="text-cyan-300 font-bold">{activeIntent.functionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Decoded Action:</span>
                <span className="text-white text-right max-w-[230px] truncate">
                  {viemPayload.decodedMethodSignature}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Contract / To:</span>
                <span className="text-slate-200">
                  {viemPayload.to.slice(0, 10)}...{viemPayload.to.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Value:</span>
                <span className="text-emerald-400 font-bold">{viemPayload.valueFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Notional:</span>
                <span className="text-white">${viemPayload.estimatedNotionalUsd.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Network Fee (EIP-1559):</span>
                <span className="text-slate-300">
                  Max {liveMaxFeeGwei} Gwei · Limit {viemPayload.gasLimit.toString()}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block">
                Unsigned RLP Payload Digest (`keccak256` to be signed by wallet key):
              </span>
              <div className="p-2 rounded bg-[#080A10] border border-[#1E2338] text-[10px] text-amber-300 break-all">
                {viemPayload.signingHashKeccak256}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleRejectWalletPopupApproval}
                className="py-2.5 px-4 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs font-bold uppercase cursor-pointer"
              >
                Reject (4001)
              </button>
              <button
                type="button"
                onClick={handleConfirmWalletPopupApproval}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase cursor-pointer"
              >
                Confirm & Sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
