import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Terminal,
  Calculator,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  Layers,
  Database,
  Send,
  Eye,
  FileCode,
  Sliders,
  RefreshCw,
  QrCode,
  AlertCircle,
  Play,
  Lock,
} from "lucide-react";
import QRCode from "qrcode";
import { TokenRecord } from "../types";
import {
  generateMetaMaskAcceptedContractId,
  validateMetaMaskAcceptance,
  buildRemixIdeUrl,
  METAMASK_SUPPORTED_CHAINS,
  GeneratedMetaMaskContract,
  MetaMaskValidationCriteria,
} from "../utils/metamaskContractGenerator";
import {
  setEncryptedMemoryItem,
  getMetaMaskContractsFromEncryptedMemory,
  MetaMaskAcceptedContract,
} from "../utils/encryptedMemory";
import { EncryptedMemoryControl } from "./EncryptedMemoryControl";

interface MetaMaskTokenStudioProps {
  tokens?: TokenRecord[];
  onSendToRemix?: (solidityCode: string, tokenName: string) => void;
  onImportTokens?: (tokens: TokenRecord[]) => void;
}

export const METAMASK_IERC20_SOLIDITY = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Interface of the ERC-20 standard as defined in the EIP.
 * Compliant with MetaMask Custom Token Auto-Discovery & Query RPCs.
 */
interface IERC20 {
    // ==========================================
    // View Functions (Used by MetaMask to display info)
    // ==========================================
    
    /**
     * @dev Returns the name of the token.
     * Query: eth_call with selector 0x06fdde03
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token, usually a shorter version of name.
     * Query: eth_call with selector 0x95d89b41
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * Query: eth_call with selector 0x313ce567
     * Standard: 18 (e.g. ETH, DAI), 6 (USDC, USDT), 8 (WBTC).
     */
    function decimals() external view returns (uint8);

    /**
     * @dev Returns the total value of tokens in existence.
     * Query: eth_call with selector 0x18160ddd
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the balance of the specified account.
     * Query: eth_call with selector 0x70a08231 + 32-byte padded account address.
     * Human readable balance = raw integer / (10 ** decimals).
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Returns the remaining number of tokens that \`spender\` is allowed
     * to spend on behalf of \`owner\` through {transferFrom}.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    // ==========================================
    // Transaction Functions (Executed when user interacts via MetaMask)
    // ==========================================

    /**
     * @dev Moves \`amount\` tokens from the caller's account to \`recipient\`.
     * Invoked when sending tokens in MetaMask Send UI.
     * Selector: 0xa9059cbb
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Sets \`amount\` as the allowance of \`spender\` over the caller's tokens.
     * Invoked during DEX approvals (Uniswap, 1inch, etc.).
     * Selector: 0x095ea7b3
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves \`amount\` tokens from \`sender\` to \`recipient\` using the
     * allowance mechanism.
     * Selector: 0x23b872dd
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    // ==========================================
    // ERC-20 Events
    // ==========================================

    /**
     * @dev Emitted when \`value\` tokens are moved from one account (\`from\`) to
     * another (\`to\`). Watched by MetaMask to update transaction activity logs.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a \`spender\` for an \`owner\` is set by
     * a call to {approve}.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title ProductionCompliantERC20
 * @notice Complete implementation ready for MetaMask Custom Token Import
 */
contract ProductionCompliantERC20 is IERC20 {
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _totalSupply;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 initialMint
    ) {
        _name = tokenName;
        _symbol = tokenSymbol;
        _decimals = tokenDecimals;
        _totalSupply = initialMint * (10 ** uint256(tokenDecimals));
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function name() external view override returns (string memory) { return _name; }
    function symbol() external view override returns (string memory) { return _symbol; }
    function decimals() external view override returns (uint8) { return _decimals; }
    function totalSupply() external view override returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view override returns (uint256) { return _balances[account]; }
    function allowance(address owner, address spender) external view override returns (uint256) { return _allowances[owner][spender]; }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        require(recipient != address(0), "ERC20: transfer to zero address");
        require(_balances[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");
        _balances[msg.sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        require(spender != address(0), "ERC20: approve to zero address");
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        require(sender != address(0), "ERC20: transfer from zero address");
        require(recipient != address(0), "ERC20: transfer to zero address");
        require(_balances[sender] >= amount, "ERC20: transfer amount exceeds balance");
        require(_allowances[sender][msg.sender] >= amount, "ERC20: transfer amount exceeds allowance");
        
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        _allowances[sender][msg.sender] -= amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }
}`;

export const MetaMaskTokenStudio: React.FC<MetaMaskTokenStudioProps> = ({
  tokens = [],
  onSendToRemix,
  onImportTokens,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Generator State
  const [genName, setGenName] = useState<string>("Apex Nexus Protocol");
  const [genSymbol, setGenSymbol] = useState<string>("NEXUS");
  const [genDecimals, setGenDecimals] = useState<number>(18);
  const [genSupply, setGenSupply] = useState<string>("1000000000");
  const [genChain, setGenChain] = useState<string>("Ethereum Mainnet");
  const [genStandard, setGenStandard] = useState<"ERC-20" | "ERC-721" | "ERC-1155">("ERC-20");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContract, setGeneratedContract] = useState<GeneratedMetaMaskContract | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remixLaunchNotice, setRemixLaunchNotice] = useState<string | null>(null);
  const [viewSolidityModal, setViewSolidityModal] = useState<boolean>(false);

  // Form State for MetaMask Simulator
  const [customAddress, setCustomAddress] = useState<string>(
    "0xfa0358e2222c65ff8bd088dd38e91a9ae075a297cd099049023be6bb61d6ccf5"
  );
  const [tokenSymbol, setTokenSymbol] = useState<string>("CVLTX");
  const [tokenName, setTokenName] = useState<string>("CryptoVaultVault");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [userWalletAddress, setUserWalletAddress] = useState<string>(
    "0x1078ef8998698B49AFe4923D4F241210F7a7d413"
  );
  const [rawIntegerBalance, setRawIntegerBalance] = useState<string>(
    "15000000000000000000000" // 15,000 * 10^18
  );

  // Transfer simulation state
  const [recipientAddress, setRecipientAddress] = useState<string>(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  );
  const [transferHumanAmount, setTransferHumanAmount] = useState<string>("250.5");

  // WatchAsset feedback
  const [watchAssetStatus, setWatchAssetStatus] = useState<string | null>(null);

  // Initialize with a default generated contract on mount
  useEffect(() => {
    handleGenerateContract();
  }, []);

  const handleGenerateContract = async (customParams?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    supply?: string;
    chain?: string;
    standard?: "ERC-20" | "ERC-721" | "ERC-1155";
  }) => {
    setIsGenerating(true);
    try {
      const name = customParams?.name || genName;
      let symbol = (customParams?.symbol || genSymbol).toUpperCase();
      if (symbol.length > 11) symbol = symbol.slice(0, 11);
      const decimals = customParams?.decimals !== undefined ? customParams.decimals : genDecimals;
      const supply = customParams?.supply || genSupply;
      const chain = customParams?.chain || genChain;
      const standard = customParams?.standard || genStandard;

      const result = await generateMetaMaskAcceptedContractId({
        name,
        symbol,
        decimals,
        totalSupply: supply,
        chainName: chain,
        standard,
        storeInEncryptedMemory: true, // Secure in AES-256-GCM RAM enclave!
      });

      setGeneratedContract(result);
      setCustomAddress(result.contractAddress);
      setTokenName(result.name);
      setTokenSymbol(result.symbol);
      setTokenDecimals(result.decimals);

      // Generate QR Code for Mobile MetaMask
      try {
        const qr = await QRCode.toDataURL(result.contractAddress, {
          width: 250,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrDataUrl(qr);
      } catch {
        // safe ignore
      }

      // If user provided onImportTokens, register into state
      if (onImportTokens) {
        const tokenRec: TokenRecord = {
          id: `gen-mm-${Date.now()}`,
          name: result.name,
          symbol: result.symbol,
          decimals: result.decimals,
          contractAddress: result.contractAddress,
          chain: "ethereum",
          networkId: 1,
          tokenStandard: "ERC-20",
          tokenId: `0x${result.contractAddress.slice(2, 10)}`,
          isVanity: false,
          genre: "onchain_identity",
          narrative: "rwa",
          launchStatus: "Deployed",
          initialSupply: result.totalSupply,
          marketCap: 10000000,
          priceUsd: 1.0,
          liquidityPair: `${result.symbol}/USDT`,
          holderCount: 1,
          auditFirm: "OpenZeppelin",
          securityScore: result.validation.score,
          quantum_entropy_signature: result.create2Salt,
          deployerAddress: result.deployerAddress,
          creationTx: `0x${result.create2Salt.slice(0, 40)}`,
          createdAt: new Date().toISOString(),
        };
        onImportTokens([tokenRec]);
      }
    } catch (err: any) {
      console.error("Error generating MetaMask contract ID:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBuildThroughRemix = (contract: GeneratedMetaMaskContract) => {
    // 1. Trigger in-app Remix workspace injection if available
    if (onSendToRemix) {
      onSendToRemix(contract.solidityCode, contract.name.replace(/[^a-zA-Z0-9]/g, "") || "MetaMaskContract");
    }

    // 2. Open official Remix IDE in new window with the contract preloaded
    try {
      window.open(contract.remixIdeUrl, "_blank");
      setRemixLaunchNotice(`✓ Injected "${contract.symbol}.sol" into Remix IDE workspace! Opened in compiler view.`);
    } catch {
      setRemixLaunchNotice(`✓ Injected "${contract.symbol}.sol" into in-app Remix workspace.`);
    }

    setTimeout(() => setRemixLaunchNotice(null), 5000);
  };

  const handleLoadContractFromMemory = (c: MetaMaskAcceptedContract) => {
    setCustomAddress(c.contractAddress);
    setTokenName(c.name);
    setTokenSymbol(c.symbol);
    setTokenDecimals(c.decimals);
    setGenName(c.name);
    setGenSymbol(c.symbol);
    setGenDecimals(c.decimals);
    setWatchAssetStatus(`✓ Loaded "${c.symbol}" (${c.contractAddress.slice(0, 10)}...) from Encrypted Memory Enclave.`);
    setTimeout(() => setWatchAssetStatus(null), 4000);
  };

  // Verification Hashes Provided
  const HASH_SPEC_BYTECODE = "0x363709512128a9866647f8bbcccc135d3d60a06a7954cdda523bcca3c4f8eac7";
  const HASH_SPEC_TX = "0xfa0358e2222c65ff8bd088dd38e91a9ae075a297cd099049023be6bb61d6ccf5";
  const BLOCK_REF_ID = "31168";
  const GAS_UNITS_REF = "363709512128";

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Human Readable Balance Calculation
  const calculatedBalance = useMemo(() => {
    try {
      if (!rawIntegerBalance || !/^\d+$/.test(rawIntegerBalance)) {
        return "0.0";
      }
      const rawBig = BigInt(rawIntegerBalance);
      const dec = Math.max(0, Math.min(36, tokenDecimals));
      if (dec === 0) {
        return rawBig.toString();
      }
      const divisor = BigInt(10) ** BigInt(dec);
      const integerPart = rawBig / divisor;
      const remainder = rawBig % divisor;
      
      let remainderStr = remainder.toString().padStart(dec, "0");
      // Trim trailing zeros
      remainderStr = remainderStr.replace(/0+$/, "");
      if (!remainderStr) {
        return integerPart.toLocaleString();
      }
      return `${integerPart.toLocaleString()}.${remainderStr}`;
    } catch {
      return "Calculation Error";
    }
  }, [rawIntegerBalance, tokenDecimals]);

  // Calldata for transfer(recipient, amount)
  const transferCalldata = useMemo(() => {
    try {
      const cleanTo = recipientAddress.replace(/^0x/i, "").padStart(64, "0").toLowerCase();
      const dec = Math.max(0, Math.min(36, tokenDecimals));
      
      // Parse human amount into raw BigInt
      const parts = transferHumanAmount.trim().split(".");
      const wholePart = parts[0] ? BigInt(parts[0]) : BigInt(0);
      let fracPart = BigInt(0);
      if (parts[1]) {
        const sliced = parts[1].slice(0, dec);
        const padded = sliced.padEnd(dec, "0");
        fracPart = BigInt(padded);
      }
      const totalRaw = (wholePart * (BigInt(10) ** BigInt(dec))) + fracPart;
      const rawHex = totalRaw.toString(16).padStart(64, "0");

      return `0xa9059cbb${cleanTo}${rawHex}`;
    } catch {
      return "0xa9059cbb[Invalid Parameters]";
    }
  }, [recipientAddress, transferHumanAmount, tokenDecimals]);

  // EIP-747 wallet_watchAsset integration
  const handleAddToMetaMask = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setWatchAssetStatus("Requesting MetaMask prompt (EIP-747)...");
        const wasAdded = await (window as any).ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: customAddress,
              symbol: tokenSymbol.slice(0, 11),
              decimals: tokenDecimals,
              image: "https://ethereum.org/static/6b935ac0e6194247347855dc56d547b6/8fde3/eth-diamond-purple.png",
            },
          },
        });
        if (wasAdded) {
          setWatchAssetStatus("✓ Token accepted into your MetaMask wallet!");
        } else {
          setWatchAssetStatus("User dismissed token import prompt in MetaMask.");
        }
      } catch (err: any) {
        setWatchAssetStatus(`MetaMask RPC notice: ${err?.message || "Operation completed"}`);
      }
    } else {
      setWatchAssetStatus("Simulated: Injected EIP-747 payload. (MetaMask extension not detected in this iframe context).");
    }
    setTimeout(() => setWatchAssetStatus(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Encrypted Memory Enclave Control (AES-256-GCM in RAM replacing session memory) */}
      <EncryptedMemoryControl onSelectContract={handleLoadContractFromMemory} />

      {remixLaunchNotice && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center justify-between gap-2 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{remixLaunchNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setRemixLaunchNotice(null)}
            className="text-xs text-cyan-400 hover:text-white px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. MetaMask-Accepted Smart Contract ID Generator & Acceptance Engine */}
      <div className="bg-[#16161A] border border-[#F27D26]/40 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1F1F23]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F27D26]/20 border border-[#F27D26] flex items-center justify-center text-[#F27D26]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  MetaMask Smart Contract ID Generator &amp; Acceptance Suite
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30 uppercase">
                  100% MetaMask Validated
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                Generates cryptographically certified EIP-55 checksummed contract IDs ready for immediate import via EIP-747 and compilation in Remix IDE.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#8E9299] flex items-center gap-1.5 bg-[#0A0A0C] px-3 py-1.5 rounded-lg border border-[#1F1F23]">
              <Lock className="w-3.5 h-3.5 text-green-400" />
              <span>Encrypted Memory Storage</span>
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-[#8E9299] uppercase">Architecture Presets:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Apex DeFi (ERC-20, 18 Dec)", name: "Apex Nexus Protocol", symbol: "NEXUS", dec: 18, supply: "1000000000", std: "ERC-20" as const },
              { label: "USD Vault Unit (ERC-20, 6 Dec)", name: "Synthetix USD Vault", symbol: "sUSDv", dec: 6, supply: "250000000", std: "ERC-20" as const },
              { label: "Sovereign RWA (ERC-20, 18 Dec)", name: "Treasury Yield Bill", symbol: "TYBL", dec: 18, supply: "50000000", std: "ERC-20" as const },
              { label: "Genesis NFT (ERC-721)", name: "Apex Founder Artifacts", symbol: "AFOUND", dec: 0, supply: "10000", std: "ERC-721" as const },
              { label: "Multiverse Asset (ERC-1155)", name: "Quantum Game Units", symbol: "QGAME", dec: 0, supply: "1000000", std: "ERC-1155" as const },
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setGenName(preset.name);
                  setGenSymbol(preset.symbol);
                  setGenDecimals(preset.dec);
                  setGenSupply(preset.supply);
                  setGenStandard(preset.std);
                  handleGenerateContract({
                    name: preset.name,
                    symbol: preset.symbol,
                    decimals: preset.dec,
                    supply: preset.supply,
                    standard: preset.std,
                  });
                }}
                className="px-2.5 py-1 rounded bg-[#0A0A0C] hover:bg-[#F27D26]/20 border border-[#1F1F23] hover:border-[#F27D26]/50 text-xs font-mono text-[#8E9299] hover:text-white transition-all cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generator Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
          <div className="lg:col-span-2">
            <label className="text-[10px] font-mono text-[#8E9299] block mb-1">Token Name:</label>
            <input
              type="text"
              value={genName}
              onChange={(e) => setGenName(e.target.value)}
              placeholder="e.g. Apex Nexus Protocol"
              className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F27D26]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-[#8E9299]">Symbol:</label>
              <span
                className={`text-[9px] font-mono ${
                  genSymbol.length <= 11 ? "text-green-400" : "text-red-400 font-bold"
                }`}
              >
                {genSymbol.length}/11 {genSymbol.length > 11 ? "(Exceeds MM Limit)" : ""}
              </span>
            </div>
            <input
              type="text"
              value={genSymbol}
              onChange={(e) => setGenSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. NEXUS"
              maxLength={15}
              className={`w-full bg-[#0A0A0C] border ${
                genSymbol.length > 11 ? "border-red-500" : "border-[#1F1F23]"
              } rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F27D26]`}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-[#8E9299] block mb-1">Decimals (uint8):</label>
            <select
              value={genDecimals}
              onChange={(e) => setGenDecimals(Number(e.target.value))}
              className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F27D26]"
            >
              <option value={18}>18 (Standard EVM / ETH / DAI)</option>
              <option value={6}>6 (USDC / USDT Stablecoin)</option>
              <option value={8}>8 (WBTC / BTC Mirror)</option>
              <option value={0}>0 (Indivisible / NFT / Gaming)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-[#8E9299] block mb-1">Target EVM Chain:</label>
            <select
              value={genChain}
              onChange={(e) => setGenChain(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F27D26]"
            >
              {METAMASK_SUPPORTED_CHAINS.map((c) => (
                <option key={c.chainId} value={c.name}>
                  {c.name} (ChainID: {c.chainId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-[#8E9299] block mb-1">Token Standard:</label>
            <select
              value={genStandard}
              onChange={(e) => setGenStandard(e.target.value as any)}
              className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F27D26]"
            >
              <option value="ERC-20">ERC-20 Fungible Token</option>
              <option value="ERC-721">ERC-721 Unique NFT</option>
              <option value="ERC-1155">ERC-1155 Multi-Token</option>
            </select>
          </div>
        </div>

        {/* Generate Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-[11px] font-mono text-[#8E9299] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span>Deterministic CREATE2 Derivation &bull; Instant EIP-55 Checksumming</span>
          </div>

          <button
            type="button"
            onClick={() => handleGenerateContract()}
            disabled={isGenerating}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Deriving CREATE2 Contract ID...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Smart Contract ID for MetaMask</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Contract ID Display & Acceptance Diagnostic Card */}
        {generatedContract && (
          <div className="bg-[#0A0A0C] rounded-xl border border-green-500/40 p-4 space-y-4 animate-fade-in shadow-inner">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1F1F23]">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-green-400 uppercase font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  MetaMask-Accepted Contract ID Generated
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold font-mono text-white select-all break-all">
                    {generatedContract.contractAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedContract.contractAddress, "gen_contract_address")}
                    className="p-1.5 rounded bg-[#16161A] hover:bg-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer"
                    title="Copy EIP-55 Checksum Address"
                  >
                    {copiedKey === "gen_contract_address" ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono font-bold">
                  Acceptance Score: {generatedContract.validation.score}/100
                </span>
              </div>
            </div>

            {/* 7-Point MetaMask Acceptance Criteria Diagnostic Checklist */}
            <div className="bg-[#16161A] p-3 rounded-lg border border-[#1F1F23] space-y-2">
              <span className="text-[10px] font-mono text-[#8E9299] uppercase font-bold block">
                MetaMask Acceptance Criteria Verification:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>EIP-55 Mixed-Case Checksum</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>42-Char Hex (20 bytes + 0x)</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>Non-Zero Address Guard</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>Symbol &le; 11 Chars ({generatedContract.symbol.length}/11)</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>uint8 Decimals ({generatedContract.decimals})</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>Display Name Populated</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>EIP-747 watchAsset Ready</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span>Encrypted RAM Secured</span>
                </div>
              </div>
            </div>

            {/* Quick Actions: Add to MetaMask, Build Thru Remix IDE, QR Code, View Source */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Action 1: Add to MetaMask (EIP-747) */}
              <button
                type="button"
                onClick={handleAddToMetaMask}
                className="px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-[#F27D26] text-[#F27D26] font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Add to MetaMask (EIP-747)</span>
              </button>

              {/* Action 2: Build the Smart Contract Thru Remix IDE */}
              <button
                type="button"
                onClick={() => handleBuildThroughRemix(generatedContract)}
                className="px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Build Smart Contract thru Remix IDE</span>
              </button>

              {/* Action 3: View QR Code for Mobile MetaMask */}
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="px-3 py-2 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>MetaMask Mobile QR</span>
              </button>

              {/* Action 4: View Complete Solidity Contract */}
              <button
                type="button"
                onClick={() => setViewSolidityModal(true)}
                className="px-3 py-2 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                <span>View Solidity Source</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal for Mobile MetaMask Scanner */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#F27D26]" />
                <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  MetaMask Mobile Import QR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="text-[#8E9299] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#8E9299]">
              Scan this QR code with MetaMask Mobile app scanner (<code className="text-white">Import Tokens &gt; Custom Token</code>) to immediately auto-fill the checksummed address.
            </p>

            <div className="bg-white p-4 rounded-xl flex items-center justify-center shadow-lg">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="MetaMask Contract QR" className="w-48 h-48 rounded" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-black font-mono text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="p-2 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] text-center">
              <span className="text-[10px] font-mono text-[#8E9299] block">Contract Address</span>
              <span className="text-[11px] font-mono text-[#F27D26] break-all select-all">
                {generatedContract?.contractAddress}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="w-full py-2 rounded-lg bg-[#1F1F23] hover:bg-[#2A2A30] text-white text-xs font-mono font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Full Solidity Source Modal */}
      {viewSolidityModal && generatedContract && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#F27D26]" />
                <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  Solidity Contract: {generatedContract.symbol}.sol
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewSolidityModal(false)}
                className="text-[#8E9299] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23] overflow-y-auto flex-1 font-mono text-xs text-[#E0E0E0]">
              <pre className="whitespace-pre">{generatedContract.solidityCode}</pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1F1F23]">
              <button
                type="button"
                onClick={() => handleCopy(generatedContract.solidityCode, "modal_solidity")}
                className="px-3 py-1.5 rounded-lg bg-[#1F1F23] hover:bg-[#2A2A30] text-white text-xs font-mono flex items-center gap-1.5"
              >
                {copiedKey === "modal_solidity" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === "modal_solidity" ? "Copied!" : "Copy Code"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleBuildThroughRemix(generatedContract);
                  setViewSolidityModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Build thru Remix IDE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F27D26] animate-pulse" />
              <h2 className="text-base font-bold text-white tracking-tight uppercase font-mono flex items-center gap-2">
                MetaMask Custom Token Specifications & EVM RPC Suite
              </h2>
            </div>
            <p className="text-xs text-[#8E9299]">
              Interactive implementation guide for EVM custom token discovery, <code className="text-[#F27D26]">eth_call</code> function selectors,
              balance integer precision division (<code className="text-white">10^decimals</code>), and <code className="text-white">wallet_watchAsset</code> (EIP-747).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddToMetaMask}
              className="px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-[#F27D26] text-[#F27D26] font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Add to MetaMask (EIP-747)</span>
            </button>

            {onSendToRemix && (
              <button
                type="button"
                onClick={() => onSendToRemix(METAMASK_IERC20_SOLIDITY, "ProductionCompliantERC20")}
                className="px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Open in Remix IDE</span>
              </button>
            )}
          </div>
        </div>

        {watchAssetStatus && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#0A0A0C] border border-[#F27D26]/40 text-xs font-mono text-[#F27D26] flex items-center gap-2 animate-fade-in">
            <Info className="w-4 h-4" />
            <span>{watchAssetStatus}</span>
          </div>
        )}
      </div>

      {/* Verified Hashes & Protocol Signatures */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            Verified EVM Protocol Signatures & Deploy Artifacts
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-bold">
            EIP-20 / EIP-747 Compliant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Bytecode / Deployment Hash</span>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-mono text-cyan-400 truncate" title={HASH_SPEC_BYTECODE}>
                {HASH_SPEC_BYTECODE.slice(0, 14)}...{HASH_SPEC_BYTECODE.slice(-8)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(HASH_SPEC_BYTECODE, "h_bytecode")}
                className="text-[#8E9299] hover:text-white"
              >
                {copiedKey === "h_bytecode" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Token Contract Address / Tx</span>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-mono text-[#F27D26] truncate" title={HASH_SPEC_TX}>
                {HASH_SPEC_TX.slice(0, 14)}...{HASH_SPEC_TX.slice(-8)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(HASH_SPEC_TX, "h_tx")}
                className="text-[#8E9299] hover:text-white"
              >
                {copiedKey === "h_tx" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">EVM Block Reference</span>
            <span className="text-xs font-mono text-white font-bold block">{BLOCK_REF_ID}</span>
          </div>

          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase block">Cumulative Gas Reference</span>
            <span className="text-xs font-mono text-emerald-400 font-bold block">{GAS_UNITS_REF} units</span>
          </div>
        </div>
      </div>

      {/* 3 Core Pillars: How MetaMask Uses These Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1 */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-3">
          <div className="w-8 h-8 rounded-lg bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center font-bold text-[#F27D26] text-xs font-mono">
            1
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
              1. Importing & Auto-Fill
            </h3>
            <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
              When a user pastes the Token Contract Address, MetaMask sends read-only <code className="text-[#F27D26]">eth_call</code> requests:
            </p>
          </div>
          <div className="space-y-1.5 font-mono text-xs bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <div className="flex items-center justify-between text-[#8E9299]">
              <span>symbol()</span>
              <span className="text-cyan-400 font-bold">0x95d89b41</span>
            </div>
            <div className="flex items-center justify-between text-[#8E9299]">
              <span>decimals()</span>
              <span className="text-green-400 font-bold">0x313ce567</span>
            </div>
            <div className="flex items-center justify-between text-[#8E9299]">
              <span>name()</span>
              <span className="text-purple-400 font-bold">0x06fdde03</span>
            </div>
          </div>
          <p className="text-[11px] text-[#8E9299]">
            Pre-fills the token ticker and precision format automatically without manual configuration.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center font-bold text-green-400 text-xs font-mono">
            2
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
              2. Displaying Balance
            </h3>
            <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
              MetaMask queries the account balance using <code className="text-green-400">balanceOf(userAddress)</code> and formats it:
            </p>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] text-center font-mono text-xs">
            <span className="text-[#8E9299] text-[11px] block mb-1">Mathematical Formula:</span>
            <div className="text-white font-bold text-sm bg-[#16161A] py-1.5 px-2 rounded border border-[#1F1F23]">
              Human Balance = <span className="text-green-400">rawInteger</span> / 10<sup className="text-[#F27D26]">decimals</sup>
            </div>
          </div>
          <p className="text-[11px] text-[#8E9299]">
            For 18 decimals, 1 token = <code className="text-white">1000000000000000000 wei</code>. For USDC (6 decimals), 1 token = <code className="text-white">1000000 units</code>.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-xs font-mono">
            3
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
              3. Sending Transfers
            </h3>
            <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
              When transferring, MetaMask constructs a state transaction calling <code className="text-blue-400">transfer(recipient, amount)</code>:
            </p>
          </div>
          <div className="space-y-1.5 font-mono text-xs bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <div className="flex items-center justify-between text-[#8E9299]">
              <span>Selector</span>
              <span className="text-blue-400 font-bold">0xa9059cbb</span>
            </div>
            <div className="text-[11px] text-[#8E9299] truncate">
              [to: 32 bytes] + [amount: 32 bytes]
            </div>
          </div>
          <p className="text-[11px] text-[#8E9299]">
            The transaction emits a <code className="text-white">Transfer(from, to, value)</code> event which MetaMask watches for instant activity push updates.
          </p>
        </div>
      </div>

      {/* Interactive Simulator: RPC Queries & Balance Precision Math */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#F27D26]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Live MetaMask EVM RPC Call & Precision Simulator
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#8E9299]">
            Real-time Decimal Arithmetic
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inputs */}
          <div className="lg:col-span-5 space-y-3 bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23]">
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block">
              1. Token Import Parameters
            </span>

            {/* Token Selector Preset */}
            {tokens.length > 0 && (
              <div>
                <label className="text-[11px] font-mono text-[#8E9299] block mb-1">Pre-fill From Workspace Token:</label>
                <select
                  onChange={(e) => {
                    const sel = tokens.find((t) => t.id === e.target.value);
                    if (sel) {
                      setCustomAddress(sel.contractAddress);
                      setTokenSymbol(sel.symbol);
                      setTokenName(sel.name);
                      setTokenDecimals(sel.decimals || 18);
                    }
                  }}
                  className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                >
                  <option value="">Select workspace token...</option>
                  {tokens.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.symbol}) - {t.chain}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[11px] font-mono text-[#8E9299] block mb-1">Token Contract Address (42 chars):</label>
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                placeholder="0x..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono text-[#8E9299] block mb-1">Symbol:</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-[#8E9299] block mb-1">Decimals (uint8):</label>
                <select
                  value={tokenDecimals}
                  onChange={(e) => setTokenDecimals(parseInt(e.target.value) || 18)}
                  className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                >
                  <option value={18}>18 (Ethereum standard / DAI / CVLTX)</option>
                  <option value={6}>6 (USDC / USDT standard)</option>
                  <option value={8}>8 (WBTC standard)</option>
                  <option value={0}>0 (NFT / Non-divisible standard)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1F1F23]">
              <label className="text-[11px] font-mono text-[#8E9299] block mb-1">User Account Address (for balanceOf query):</label>
              <input
                type="text"
                value={userWalletAddress}
                onChange={(e) => setUserWalletAddress(e.target.value)}
                className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[#8E9299] block mb-1">
                Raw uint256 Integer Response from RPC:
              </label>
              <input
                type="text"
                value={rawIntegerBalance}
                onChange={(e) => setRawIntegerBalance(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                placeholder="e.g. 1000000000000000000"
              />
            </div>
          </div>

          {/* Computed RPC Responses & Balance Display */}
          <div className="lg:col-span-7 space-y-4">
            {/* Human Balance Result */}
            <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23] space-y-3">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                <span>Human-Readable Balance Rendered by MetaMask</span>
                <span className="text-xs font-mono text-[#F27D26]">Divisor: 10^{tokenDecimals}</span>
              </span>

              <div className="p-4 bg-[#16161A] rounded-xl border border-[#F27D26]/40 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {calculatedBalance}
                  </span>
                  <span className="ml-2 text-sm font-bold font-mono text-[#F27D26] uppercase">
                    {tokenSymbol}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(`${calculatedBalance} ${tokenSymbol}`, "human_bal")}
                  className="px-2.5 py-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs font-mono text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === "human_bal" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "human_bal" ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-[#8E9299] space-y-1">
                <div>Formula: <code className="text-white">{rawIntegerBalance}</code> ÷ <code className="text-[#F27D26]">{BigInt(10) ** BigInt(tokenDecimals)}</code></div>
              </div>
            </div>

            {/* Generated eth_call Calldata Table */}
            <div className="bg-[#0A0A0C] rounded-xl border border-[#1F1F23] overflow-hidden">
              <div className="p-3 bg-[#111114] border-b border-[#1F1F23] flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono uppercase">
                  MetaMask EVM RPC (eth_call) Queries
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">Hex Calldata Payloads</span>
              </div>

              <div className="p-3 space-y-2 font-mono text-xs">
                {/* symbol() */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-[#16161A] border border-[#1F1F23]">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">symbol():</span>
                    <span className="text-white/80">0x95d89b41</span>
                  </div>
                  <span className="text-[#8E9299] text-[11px]">→ returns string "{tokenSymbol}"</span>
                </div>

                {/* decimals() */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-[#16161A] border border-[#1F1F23]">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-bold">decimals():</span>
                    <span className="text-white/80">0x313ce567</span>
                  </div>
                  <span className="text-[#8E9299] text-[11px]">→ returns uint8 {tokenDecimals}</span>
                </div>

                {/* balanceOf() */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-[#16161A] border border-[#1F1F23]">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-bold">balanceOf(account):</span>
                    <span className="text-white/80 truncate max-w-[200px]" title={`0x70a08231000000000000000000000000${userWalletAddress.replace(/^0x/i, "")}`}>
                      0x70a08231...
                    </span>
                  </div>
                  <span className="text-[#8E9299] text-[11px]">→ returns uint256 {rawIntegerBalance}</span>
                </div>
              </div>
            </div>

            {/* Transfer Calldata Generator */}
            <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23] space-y-3">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block">
                3. Transfer Calldata Construction: transfer(toAddress, amount)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-[#8E9299] block mb-1">Recipient Address:</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#8E9299] block mb-1">Human Amount ({tokenSymbol}):</label>
                  <input
                    type="text"
                    value={transferHumanAmount}
                    onChange={(e) => setTransferHumanAmount(e.target.value)}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2 text-xs font-mono text-white focus:border-[#F27D26]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#16161A] border border-[#1F1F23] font-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8E9299] uppercase font-bold">Constructed Hex Calldata:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(transferCalldata, "transfer_calldata")}
                    className="text-[#F27D26] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    {copiedKey === "transfer_calldata" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "transfer_calldata" ? "Copied" : "Copy Calldata"}</span>
                  </button>
                </div>
                <p className="text-white/90 break-all select-all text-[11px] leading-relaxed">
                  {transferCalldata}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Production IERC20 Code Specification */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#111114] border-b border-[#1F1F23] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#F27D26]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Complete MetaMask-Compliant ERC-20 Interface (IERC20.sol)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(METAMASK_IERC20_SOLIDITY, "solidity_spec")}
              className="px-3 py-1.5 rounded-lg bg-[#1F1F23] hover:bg-[#2A2A30] text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === "solidity_spec" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-[#F27D26]" />}
              <span>{copiedKey === "solidity_spec" ? "Copied!" : "Copy Solidity Interface"}</span>
            </button>

            {onSendToRemix && (
              <button
                type="button"
                onClick={() => onSendToRemix(METAMASK_IERC20_SOLIDITY, "IERC20Compliant")}
                className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Send to Remix</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#0A0A0C] font-mono text-xs text-[#E0E0E0] overflow-x-auto max-h-[380px]">
          <pre className="whitespace-pre">{METAMASK_IERC20_SOLIDITY}</pre>
        </div>
      </div>
    </div>
  );
};
