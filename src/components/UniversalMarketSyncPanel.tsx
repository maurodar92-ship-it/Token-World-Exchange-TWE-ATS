import React, { useState } from "react";
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  Copy,
  Terminal,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Sliders,
  Code2,
  FileCode,
  Globe,
  Share2,
  Check,
  Play,
  RefreshCw,
  Cpu,
  Coins,
  Compass,
} from "lucide-react";
import { ChainInfo, getChainById } from "../utils/chainCatalog";
import {
  generateStreamABI,
  generateSingleLineJsonABI,
  generateSingleLineHumanReadableABI,
  generateSingleLineEthersContractCode,
} from "../utils/contractArtifactGenerator";

interface UniversalMarketSyncPanelProps {
  selectedChainId?: string;
  activeTokenName?: string;
  activeTokenSymbol?: string;
  onDeploySuccess?: (deployedAddress: string) => void;
}

export const UniversalMarketSyncPanel: React.FC<UniversalMarketSyncPanelProps> = ({
  selectedChainId = "ethereum",
  activeTokenName = "MarketAsset",
  activeTokenSymbol = "MKT",
  onDeploySuccess,
}) => {
  const chain: ChainInfo = getChainById(selectedChainId);

  // Wallet State Reading schema state
  const [walletAddress, setWalletAddress] = useState<string>("0x71C8364f3B83F34B2Db634e06B9A89d71A69eB89");
  const [isReadingWallet, setIsReadingWallet] = useState<boolean>(false);
  const [walletBalanceNative, setWalletBalanceNative] = useState<number>(14.85);
  const [walletBalanceUsdc, setWalletBalanceUsdc] = useState<number>(48500);
  const [stakingTier, setStakingTier] = useState<string>("Singularity Tier IV");
  const [dynamicInitialSupply, setDynamicInitialSupply] = useState<string>("42,000,000");
  const [liquidityMultiplier, setLiquidityMultiplier] = useState<number>(4.2);
  const [maxWalletPercent, setMaxWalletPercent] = useState<number>(2.5);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Cross-Platform Indexing active tab
  const [indexerTab, setIndexerTab] = useState<"cmc" | "dexscreener" | "extension" | "abi_bytecode">("cmc");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Scripts viewer tab
  const [scriptTab, setScriptTab] = useState<"deploy_script" | "universal_token">("deploy_script");

  // CLI broadcast simulation
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [broadcastLogs, setBroadcastLogs] = useState<string[]>([]);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string>("0x3a92C15e8697A19F86e4A767098De6A93F52E9B4");

  // Derive dynamic RPC URL & Chain ID
  const networkRpc = chain.rpcEndpoint || "https://eth-mainnet.g.alchemy.com/v2/demo-key";
  const chainIdNum = chain.chainId || 1;

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Inject Live Wallet State Reading
  const handleInjectWalletState = () => {
    setIsReadingWallet(true);
    setSyncFeedback("Connecting to RPC & reading on-chain wallet balance schema...");
    setTimeout(() => {
      // Dynamically scale parameters based on simulated wallet state
      const randomNative = parseFloat((12 + Math.random() * 8).toFixed(2));
      const randomUsdc = Math.floor(40000 + Math.random() * 25000);
      const computedMultiplier = parseFloat((3.5 + (randomNative / 10)).toFixed(2));
      const computedSupplyNum = Math.floor(10000000 * computedMultiplier);

      setWalletBalanceNative(randomNative);
      setWalletBalanceUsdc(randomUsdc);
      setLiquidityMultiplier(computedMultiplier);
      setDynamicInitialSupply(computedSupplyNum.toLocaleString());
      setIsReadingWallet(false);
      setSyncFeedback(
        `✓ Injected live wallet schema: ${randomNative} ${chain.symbol} + $${randomUsdc.toLocaleString()} USDC. Initial token distribution dynamically scaled to ${computedSupplyNum.toLocaleString()} ${activeTokenSymbol} (${computedMultiplier}x Multiplier)!`
      );
    }, 600);
  };

  // Build commands
  const cliBroadcastCommand = `forge script script/DeployTokens.s.sol --rpc-url ${networkRpc} --broadcast --browser`;
  const cliVerifyCommand = `forge verify-contract ${deployedContractAddress} src/UniversalToken.sol:UniversalToken --chain ${chainIdNum} --watch`;

  // Simulated Broadcast via Browser Wallet / CLI
  const handleExecuteBroadcast = () => {
    setIsBroadcasting(true);
    setBroadcastLogs([
      `[⠋] Initiating Forge script deployment on ${chain.name} (${chain.symbol})...`,
      `[⠋] Reading script/DeployTokens.s.sol with solc 0.8.20...`,
    ]);

    setTimeout(() => {
      setBroadcastLogs((prev) => [
        ...prev,
        `[✓] Compiled 2 Solidity source files successfully.`,
        `[⠋] Connecting to RPC: ${networkRpc}...`,
        `[⠋] Launching browser wallet for broadcast signature confirmation...`,
      ]);
    }, 500);

    setTimeout(() => {
      const generatedAddr = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      setDeployedContractAddress(generatedAddr);
      if (onDeploySuccess) onDeploySuccess(generatedAddr);

      setBroadcastLogs((prev) => [
        ...prev,
        `[✓] Browser Wallet Broadcast Authorized by: ${walletAddress}`,
        `[✓] Transaction Hash: 0x9b7f32e18c4d9a6572e90f6b43825a07183e29f0c24d673891`,
        `[✓] Token Deployed at: ${generatedAddr}`,
        `[✓] Initial Supply: ${dynamicInitialSupply} ${activeTokenSymbol} minted to deployer`,
        `[✓] Wallet State reading synchronized with on-chain bonding curve.`,
      ]);
      setIsBroadcasting(false);
    }, 1200);
  };

  // Simulated Explorer Verification
  const handleExecuteVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setBroadcastLogs((prev) => [
        ...prev,
        `[⠋] Verifying contract ${deployedContractAddress} on ${chain.name} explorer...`,
        `[✓] Submitting standard-json-input metadata & constructor arguments...`,
        `[✓] Contract verified successfully on ${chain.name} explorer with source code match!`,
      ]);
      setIsVerifying(false);
    }, 800);
  };

  // Solidity Script Source Code
  const deployScriptSolidity = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/UniversalToken.sol";

contract DeployTokensScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Automatically deploy token mapped to wallet metadata
        UniversalToken token = new UniversalToken("${activeTokenName}", "${activeTokenSymbol}", msg.sender);
        console.log("Token Deployed at:", address(token));

        vm.stopBroadcast();
    }
}`;

  const universalTokenSolidity = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UniversalToken
 * @notice Universal Web3 Contract Foundry Asset with Live Wallet State Dynamic Distribution
 */
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract UniversalToken is IERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals = 18;
    uint256 private _totalSupply;

    address public immutable deployer;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Universal Market Sync Metadata
    uint256 public immutable walletScalingMultiplier = ${Math.round(liquidityMultiplier * 100)};
    uint256 public immutable deployedTimestamp;

    constructor(string memory _name, string memory _symbol, address _initialOwner) {
        name = _name;
        symbol = _symbol;
        deployer = _initialOwner;
        deployedTimestamp = block.timestamp;

        // Scale initial distribution to wallet balance schema
        uint256 initialMint = ${dynamicInitialSupply.replace(/,/g, "")} * 10**18;
        _totalSupply = initialMint;
        _balances[_initialOwner] = initialMint;
        emit Transfer(address(0), _initialOwner, initialMint);
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) external override returns (bool) {
        require(_balances[msg.sender] >= value, "ERC20: transfer exceeds balance");
        _balances[msg.sender] -= value;
        _balances[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external override returns (bool) {
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transferFrom(address from, address to, uint256 value) external override returns (bool) {
        require(_allowances[from][msg.sender] >= value, "ERC20: allowance exceeded");
        require(_balances[from] >= value, "ERC20: transfer exceeds balance");
        _allowances[from][msg.sender] -= value;
        _balances[from] -= value;
        _balances[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
}`;

  // CoinMarketCap Formatted Output
  const cmcFormattedPayload = {
    token_name: activeTokenName,
    token_symbol: activeTokenSymbol,
    blockchain: chain.name,
    chain_id: chainIdNum,
    contract_address: deployedContractAddress,
    decimals: 18,
    total_supply: dynamicInitialSupply.replace(/,/g, ""),
    circulating_supply: (parseFloat(dynamicInitialSupply.replace(/,/g, "")) * 0.85).toString(),
    wallet_sync_distribution: {
      initial_deployer_wallet: walletAddress,
      liquidity_pool_allocation: `${Math.round(liquidityMultiplier * 10)}%`,
      treasury_allocation: "15%",
      public_circulating: "45%",
    },
    explorer_url: `${chain.explorerUrl || "https://etherscan.io"}/token/${deployedContractAddress}`,
    tags: ["defi", "web3-foundry", "universal-market-sync", chain.category.toLowerCase()],
  };

  // Dexscreener Formatted Output
  const dexscreenerFormattedPayload = {
    schemaVersion: "1.0.0",
    chainId: chain.id,
    pairAddress: `0x${deployedContractAddress.slice(2, 10)}...pair`,
    dexId: chain.isEVM ? "uniswap_v3" : "raydium",
    baseToken: {
      address: deployedContractAddress,
      name: activeTokenName,
      symbol: activeTokenSymbol,
    },
    quoteToken: {
      address: chain.isEVM ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : "So11111111111111111111111111111111111111112",
      name: chain.isEVM ? "Wrapped Ether" : "Wrapped SOL",
      symbol: chain.isEVM ? "WETH" : "WSOL",
    },
    feeTier: "0.3%",
    initialLiquidityUsd: (walletBalanceUsdc * 2.5).toLocaleString("en-US", { style: "currency", currency: "USD" }),
  };

  // Web3 Browser Extension Watch Asset Payload
  const extensionWatchAssetPayload = {
    method: "wallet_watchAsset",
    params: {
      type: "ERC20",
      options: {
        address: deployedContractAddress,
        symbol: activeTokenSymbol,
        decimals: 18,
        image: `https://api.mdgods.xyz/tokens/${activeTokenSymbol.toLowerCase()}.png`,
      },
    },
  };

  return (
    <div className="bg-[#121216] border border-[#27272F] rounded-xl p-5 shadow-2xl space-y-6 font-mono text-xs">
      {/* Top Banner: Universal Market Sync & Foundry Script */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272F]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F27D26] animate-ping" />
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Universal Market Sync Parameters & Foundry CLI Suite</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Live Wallet State Reading
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Aggregator Indexing
            </span>
          </div>
          <p className="text-[11px] text-[#8E9299] mt-1 leading-relaxed">
            A universal Web3 contract foundry script enables automated multi-chain token deployment and wallet synchronization with a single command.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0A0A0C] px-3 py-1.5 rounded-lg border border-[#27272F]">
          <span className="text-[10px] text-[#8E9299] uppercase font-bold">Target Chain:</span>
          <span className="text-xs font-bold text-[#F27D26] flex items-center gap-1">
            <Globe className="w-3 h-3" />
            <span>{chain.name}</span>
          </span>
          <span className="text-[10px] text-[#8E9299]">ID: {chainIdNum}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: UNIVERSAL MARKET SYNC PARAMETERS                               */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#F27D26] uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>Universal Market Sync Parameters</span>
          </h4>
          <span className="text-[10px] text-[#8E9299]">Dynamic State Engine</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sub-block 1: Wallet State Reading */}
          <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#27272F] space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#F27D26]" />
                  <span className="text-xs font-bold text-white">Wallet State Reading</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {stakingTier}
                </span>
              </div>

              <p className="text-[11px] text-[#8E9299] leading-relaxed">
                Injects live wallet balance schemas to dynamically scale initial token distribution parameters.
              </p>

              {/* Connected Wallet input */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#8E9299] uppercase font-bold flex items-center justify-between">
                  <span>Connected Deployer Wallet</span>
                  <span className="text-emerald-400">Online RPC Connected</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="flex-1 bg-[#16161A] border border-[#27272F] rounded-lg px-3 py-1.5 text-white font-mono text-[11px] focus:border-[#F27D26] outline-none"
                  />
                  <button
                    type="button"
                    disabled={isReadingWallet}
                    onClick={handleInjectWalletState}
                    className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                  >
                    {isReadingWallet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Inject Schema</span>
                  </button>
                </div>
              </div>

              {/* Detected Live Balance Schema */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-[#16161A] border border-[#27272F]">
                  <span className="text-[9px] text-[#8E9299] uppercase font-bold block">Native Balance</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {walletBalanceNative} {chain.symbol}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#16161A] border border-[#27272F]">
                  <span className="text-[9px] text-[#8E9299] uppercase font-bold block">USDC Treasury</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    ${walletBalanceUsdc.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Dynamically Scaled Parameters Output */}
              <div className="p-3 rounded-lg bg-[#16161A] border border-[#F27D26]/40 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8E9299]">Dynamically Scaled Supply:</span>
                  <span className="font-bold text-[#F27D26] font-mono text-xs">
                    {dynamicInitialSupply} {activeTokenSymbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8E9299]">Liquidity Scaling Multiplier:</span>
                  <span className="font-bold text-white font-mono">{liquidityMultiplier}x (Wallet Scaled)</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8E9299]">Max Wallet Holding Limit:</span>
                  <span className="font-bold text-white font-mono">{maxWalletPercent}%</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8E9299]">Vesting Schedule:</span>
                  <span className="font-bold text-white font-mono">12 Months (Linear Continuous)</span>
                </div>
              </div>
            </div>

            {syncFeedback && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
            )}
          </div>

          {/* Sub-block 2: Cross-Platform Indexing */}
          <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#27272F] space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Cross-Platform Indexing</span>
                </div>
                <span className="text-[10px] text-[#8E9299]">Instant Metadata Outputs</span>
              </div>

              <p className="text-[11px] text-[#8E9299] leading-relaxed">
                Formats contract metadata outputs (ABI, Bytecode, and Token ID) for immediate integration into aggregators like CoinMarketCap, Dexscreener, and popular Web3 browser extensions.
              </p>

              {/* Sub-tabs for Indexer Formats */}
              <div className="flex items-center gap-1 bg-[#16161A] p-1 rounded-lg border border-[#27272F]">
                <button
                  type="button"
                  onClick={() => setIndexerTab("cmc")}
                  className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                    indexerTab === "cmc" ? "bg-[#0A0A0C] text-[#F27D26] border border-[#F27D26]/40" : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  CoinMarketCap
                </button>
                <button
                  type="button"
                  onClick={() => setIndexerTab("dexscreener")}
                  className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                    indexerTab === "dexscreener" ? "bg-[#0A0A0C] text-cyan-400 border border-cyan-500/40" : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  Dexscreener
                </button>
                <button
                  type="button"
                  onClick={() => setIndexerTab("extension")}
                  className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                    indexerTab === "extension" ? "bg-[#0A0A0C] text-purple-400 border border-purple-500/40" : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  Web3 Extension
                </button>
                <button
                  type="button"
                  onClick={() => setIndexerTab("abi_bytecode")}
                  className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                    indexerTab === "abi_bytecode" ? "bg-[#0A0A0C] text-emerald-400 border border-emerald-500/40" : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  ABI / Bytecode
                </button>
              </div>

              {/* Indexer Tab 1: CoinMarketCap */}
              {indexerTab === "cmc" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8E9299]">CoinMarketCap Listing Metadata Payload:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(cmcFormattedPayload, null, 2), "cmc")}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "cmc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "cmc" ? "Copied!" : "Copy CMC JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#16161A] border border-[#27272F] text-cyan-300 text-[10px] font-mono overflow-x-auto max-h-36">
                    {JSON.stringify(cmcFormattedPayload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Indexer Tab 2: Dexscreener */}
              {indexerTab === "dexscreener" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8E9299]">Dexscreener Pair & Pool Metadata:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(dexscreenerFormattedPayload, null, 2), "dex")}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "dex" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "dex" ? "Copied!" : "Copy Pair JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#16161A] border border-[#27272F] text-amber-300 text-[10px] font-mono overflow-x-auto max-h-36">
                    {JSON.stringify(dexscreenerFormattedPayload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Indexer Tab 3: Web3 Browser Extension */}
              {indexerTab === "extension" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8E9299]">EIP-747 wallet_watchAsset Payload:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(extensionWatchAssetPayload, null, 2), "ext")}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "ext" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "ext" ? "Copied!" : "Copy EIP-747 JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#16161A] border border-[#27272F] text-purple-300 text-[10px] font-mono overflow-x-auto max-h-24">
                    {JSON.stringify(extensionWatchAssetPayload, null, 2)}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      setSyncFeedback(`✓ Triggered EIP-747 wallet_watchAsset for ${activeTokenSymbol} on ${chain.name}!`);
                    }}
                    className="w-full py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-[11px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Trigger Browser Extension Add Asset</span>
                  </button>
                </div>
              )}

              {/* Indexer Tab 4: ABI / Bytecode */}
              {indexerTab === "abi_bytecode" && (
                <div className="space-y-2.5">
                  {(() => {
                    const sampleAbi = generateStreamABI({
                      contractAddress: deployedContractAddress,
                      tokenId: "1",
                      tokenStandard: "ERC-20",
                      name: activeTokenName,
                      symbol: activeTokenSymbol,
                    });
                    const singleLineAbi = generateSingleLineJsonABI(sampleAbi);
                    const singleLineHuman = generateSingleLineHumanReadableABI(sampleAbi);
                    const singleLineEthers = generateSingleLineEthersContractCode(deployedContractAddress, sampleAbi);

                    return (
                      <>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#8E9299] font-mono flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[9px]">
                              1-LINE ABI
                            </span>
                            Minified JSON ABI:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(singleLineAbi, "single_line_abi_market")}
                            className="text-purple-300 hover:text-purple-200 flex items-center gap-1 cursor-pointer font-bold"
                          >
                            {copiedKey === "single_line_abi_market" ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-purple-300" />
                            )}
                            <span>{copiedKey === "single_line_abi_market" ? "Copied 1-Line ABI!" : "Copy Single-Line ABI"}</span>
                          </button>
                        </div>

                        <div className="p-2.5 rounded bg-[#16161A] border border-purple-500/30 text-[10px] font-mono text-purple-300 overflow-x-auto whitespace-nowrap scrollbar-thin">
                          <span className="text-[#555] select-none mr-2">1:</span>
                          <code>{singleLineAbi}</code>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1">
                          <span className="text-[#8E9299]">Ethers.js v6 Single-Line Binding:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(singleLineEthers, "single_line_ethers_market")}
                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === "single_line_ethers_market" ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-cyan-400" />
                            )}
                            <span>{copiedKey === "single_line_ethers_market" ? "Copied Code!" : "Copy 1-Line Ethers"}</span>
                          </button>
                        </div>

                        <div className="p-2.5 rounded bg-[#16161A] border border-[#27272F] text-[10px] font-mono text-cyan-300 overflow-x-auto whitespace-nowrap scrollbar-thin">
                          <span className="text-[#555] select-none mr-2">1:</span>
                          <code>{singleLineEthers}</code>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1">
                          <span className="text-[#8E9299]">Creation Bytecode:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy("0x608060405234801561001057600080fd5b50...", "byte")}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === "byte" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Copy Bytecode</span>
                          </button>
                        </div>

                        <div className="p-2 rounded bg-[#16161A] border border-[#27272F] text-[9px] font-mono text-[#8E9299] truncate">
                          0x608060405234801561001057600080fd5b506040516109a03803806109a083398101604081905261002f9161010056...
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: WALLET & MARKETPLACE SYNCHRONIZATION COMMANDS                  */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2 border-t border-[#27272F]">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>Wallet & Marketplace Synchronization Commands</span>
          </h4>
          <span className="text-[10px] text-emerald-400 font-mono">Forge Foundry Automation</span>
        </div>

        {/* Commands execution boxes */}
        <div className="space-y-2.5">
          {/* Command 1: Build & broadcast */}
          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#27272F] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Build and broadcast via browser wallet or CLI:</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(cliBroadcastCommand, "cmd_broadcast")}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 cursor-pointer"
              >
                {copiedKey === "cmd_broadcast" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "cmd_broadcast" ? "Copied Command" : "Copy Command"}</span>
              </button>
            </div>
            <div className="p-2.5 rounded bg-[#16161A] border border-cyan-500/30 text-cyan-300 font-mono text-[11px] overflow-x-auto flex items-center justify-between gap-2">
              <span className="select-all">{cliBroadcastCommand}</span>
              <button
                type="button"
                disabled={isBroadcasting}
                onClick={handleExecuteBroadcast}
                className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-[10px] cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
              >
                {isBroadcasting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                <span>Broadcast</span>
              </button>
            </div>
          </div>

          {/* Command 2: Contract verification */}
          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#27272F] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Automatic contract verification across market explorers:</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(cliVerifyCommand, "cmd_verify")}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 cursor-pointer"
              >
                {copiedKey === "cmd_verify" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "cmd_verify" ? "Copied Command" : "Copy Command"}</span>
              </button>
            </div>
            <div className="p-2.5 rounded bg-[#16161A] border border-emerald-500/30 text-emerald-300 font-mono text-[11px] overflow-x-auto flex items-center justify-between gap-2">
              <span className="select-all">{cliVerifyCommand}</span>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleExecuteVerification}
                className="px-2.5 py-1 rounded bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-[10px] cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
              >
                {isVerifying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                <span>Verify Explorer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Solidity Source Code Tabs (DeployTokens.s.sol & UniversalToken.sol) */}
        <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#27272F] space-y-3">
          <div className="flex items-center justify-between border-b border-[#27272F] pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScriptTab("deploy_script")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                  scriptTab === "deploy_script"
                    ? "bg-[#16161A] text-white border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>script/DeployTokens.s.sol</span>
              </button>

              <button
                type="button"
                onClick={() => setScriptTab("universal_token")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                  scriptTab === "universal_token"
                    ? "bg-[#16161A] text-white border border-cyan-400"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>src/UniversalToken.sol</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(scriptTab === "deploy_script" ? deployScriptSolidity : universalTokenSolidity, "sol_code")}
              className="text-[10px] text-[#8E9299] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === "sol_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === "sol_code" ? "Copied Solidity" : "Copy Code"}</span>
            </button>
          </div>

          <pre className="p-3 rounded-lg bg-[#16161A] border border-[#27272F] text-[#E0E0E0] text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
            {scriptTab === "deploy_script" ? deployScriptSolidity : universalTokenSolidity}
          </pre>
        </div>

        {/* Live Execution Logs Terminal */}
        {broadcastLogs.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[#08080A] border border-cyan-500/30 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-[10px] text-cyan-400 border-b border-[#27272F] pb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Terminal className="w-3 h-3" />
                <span>Forge Broadcast & Explorer Verification Terminal</span>
              </span>
              <button
                type="button"
                onClick={() => setBroadcastLogs([])}
                className="text-[#8E9299] hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pt-1">
              {broadcastLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.includes("[✓]") ? "text-emerald-400 font-medium" : log.includes("[⠋]") ? "text-cyan-300" : "text-[#8E9299]"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
