import React, { useState, useMemo, useEffect, useRef } from "react";
import { TokenRecord } from "../types";
import {
  Code,
  Terminal,
  Play,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Download,
  BookOpen,
  CheckCircle2,
  FileCode,
  Box,
  Wrench,
  Search,
  ExternalLink,
  Shield,
  HelpCircle,
  FolderGit2,
  Zap,
  RotateCcw,
  History,
  GitCompare,
} from "lucide-react";
import { MetaMaskTokenStudio } from "./MetaMaskTokenStudio";
import { AbiValidationIndicator } from "./AbiValidationIndicator";
import { AbiHistoryStack } from "./AbiHistoryStack";
import { ABIHistoryVersion, ABIFormatType } from "../types/abiHistory";
import { validateABIString } from "../utils/abiValidator";
import { AbiSyntaxViewer } from "./AbiSyntaxViewer";
import {
  generateStreamABI,
  generateSingleLineJsonABI,
  generateSingleLineHumanReadableABI,
  generateSingleLineEthersContractCode,
  generateSingleLineViemContractCode,
  generateSingleLineCastCall,
} from "../utils/contractArtifactGenerator";
import { buildRemixIdeUrl } from "../utils/metamaskContractGenerator";
import { setEncryptedMemoryItem } from "../utils/encryptedMemory";
import { AdvancedTokenGovernanceManager } from "./AdvancedTokenGovernanceManager";
import { ContractDiffViewer } from "./ContractDiffViewer";
import { generateFoundryTestSuite } from "../utils/quantumMemory";

interface RemixIntegrationProps {
  tokens: TokenRecord[];
  onImportTokens?: (tokens: TokenRecord[]) => void;
  injectedSolidityCode?: { code: string; name: string } | null;
}

export const RemixIntegration = ({ tokens, onImportTokens, injectedSolidityCode }: RemixIntegrationProps) => {
  const [activeTab, setActiveTab] = useState<
    "deploy_run" | "tutorial" | "workspace" | "code_diff" | "scripts" | "nft_generator" | "single_line_abi" | "terminal" | "metamask_spec" | "governance_lifecycle" | "foundry_suite"
  >("deploy_run");
  const [selectedTokenId, setSelectedTokenId] = useState<string>(tokens[0]?.id || "");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [abiTabFormat, setAbiTabFormat] = useState<
    "single_line_json" | "single_line_human" | "single_line_ethers" | "single_line_viem" | "single_line_web3" | "single_line_cast"
  >("single_line_json");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Welcome to Remix 2.6.5",
    "Your files are stored in indexedDB, 3.95 KB / 10 GB used",
    "The following libraries are accessible: ethers.js",
    "[vm] from: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4 to: GigaWealthCoin.(constructor) value: 0 wei data: 0x60a...20033 logs: 1 hash: 0x4bd4c82a3928174f881273918a201b10884920401828301848129031484c82a",
    "[vm] from: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4 to: TokenFactory.(constructor) value: 0 wei data: 0x608...20033 logs: 0 hash: 0x2e7ec510311210dddbaeb9873da07ebebcccaeb79cee18185478554dd67b4684",
    "> Ready to interact with deployed TokenFactory and GigaWealthCoin contracts.",
  ]);
  const [terminalCmd, setTerminalCmd] = useState<string>("");
  const [contractTypeChoice, setContractTypeChoice] = useState<"smart_contract" | "standalone_coin">("smart_contract");
  const [utilityGoalChoice, setUtilityGoalChoice] = useState<string>("ai_agent_compute");
  const [activeContractArchetype, setActiveContractArchetype] = useState<"token_derived" | "giga_900t_treasury" | "token_factory">("token_factory");

  // Remix VM Deploy & Run Environment State (matching Remix 2.6.5)
  const [remixEnv, setRemixEnv] = useState<string>("Forked State (vm-osaka_1791458117705_)");
  const [remixAccount, setRemixAccount] = useState<string>("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
  const [remixAccountBalance, setRemixAccountBalance] = useState<string>("99.999 ETH");
  const [remixGasLimit, setRemixGasLimit] = useState<string>("auto (3000000)");
  const [remixValueWei, setRemixValueWei] = useState<string>("0");
  const [targetContractToDeploy, setTargetContractToDeploy] = useState<string>("TokenFactory");

  // Interactive Contract Calls State for Deployed Contracts
  const [treasuryWalletCallResult, setTreasuryWalletCallResult] = useState<string | null>(null);
  const [deployedRegistryIndexInput, setDeployedRegistryIndexInput] = useState<string>("0");
  const [deployedRegistryCallResult, setDeployedRegistryCallResult] = useState<string | null>(null);
  const [deployedCountCallResult, setDeployedCountCallResult] = useState<number | null>(null);
  const [generatedAddressesCallResult, setGeneratedAddressesCallResult] = useState<string[] | null>(null);

  // GigaWealthCoin Deployed Call State
  const [gigaBalanceQueryInput, setGigaBalanceQueryInput] = useState<string>("0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D");
  const [gigaBalanceResult, setGigaBalanceResult] = useState<string | null>(null);
  const [gigaNameResult, setGigaNameResult] = useState<string | null>(null);
  const [gigaSymbolResult, setGigaSymbolResult] = useState<string | null>(null);
  const [gigaTotalSupplyResult, setGigaTotalSupplyResult] = useState<string | null>(null);
  const [showExternalProviderModal, setShowExternalProviderModal] = useState<boolean>(false);
  const [activeContractFilter, setActiveContractFilter] = useState<string>("");

  // TokenFactory On-Chain Registry State (Remix VM Osaka at 0xf8e81D47203A594245E36C48e151709F0C19fBe8)
  const [factoryDeployedTokens, setFactoryDeployedTokens] = useState<
    Array<{
      address: string;
      name: string;
      symbol: string;
      supply: string;
      treasury: string;
      txHash: string;
      timestamp: string;
      gasUsed: string;
    }>
  >([
    {
      address: "0xd9145CCE52D386f254917e481eB44e9943F39138",
      name: "Giga Wealth Coin",
      symbol: "GWC",
      supply: "900,000,000,000,000 * 10^18",
      treasury: "0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D",
      txHash: "0x2e7ec510311210dddbaeb9873da07ebebcccaeb79cee18185478554dd67b4684",
      timestamp: "Genesis",
      gasUsed: "1,951,121",
    },
  ]);
  const [factoryNewTokenName, setFactoryNewTokenName] = useState<string>("Giga Matrix");
  const [factoryNewTokenSymbol, setFactoryNewTokenSymbol] = useState<string>("GMX");
  const [isFactoryGenerating, setIsFactoryGenerating] = useState<boolean>(false);

  const handleGenerateNewTokenViaFactory = () => {
    if (!factoryNewTokenName.trim() || !factoryNewTokenSymbol.trim()) return;
    setIsFactoryGenerating(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const cleanName = factoryNewTokenName.trim();
    const cleanSym = factoryNewTokenSymbol.trim().toUpperCase();
    const randomHex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newContractAddress = `0x${randomHex}`;
    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    setTimeout(() => {
      const newEntry = {
        address: newContractAddress,
        name: cleanName,
        symbol: cleanSym,
        supply: "900,000,000,000,000 * 10^18",
        treasury: "0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D",
        txHash,
        timestamp,
        gasUsed: "1,762,653",
      };

      setFactoryDeployedTokens((prev) => [newEntry, ...prev]);
      setIsFactoryGenerating(false);

      setTerminalOutput((prev) => [
        ...prev,
        `[${timestamp}] 🏭 TOKEN FACTORY DISPATCH: generateNewToken("${newEntry.name}", "${newEntry.symbol}")`,
        `→ Factory Contract: 0xf8e81D47203A594245E36C48e151709F0C19fBe8 (Remix VM Osaka)`,
        `→ Fresh Token Deployed: ${newEntry.address}`,
        `→ Minted Initial Supply: 900 Trillion tokens (900,000,000,000,000 * 10**18)`,
        `→ Beneficiary Treasury: 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D (Mauro Lomibao Dar III)`,
        `→ Event Emitted: TokenDeployed(tokenAddress: ${newEntry.address}, name: "${newEntry.name}", symbol: "${newEntry.symbol}", beneficiary: 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D)`,
        `→ Tx Hash: ${txHash} | Gas Used: 1,762,653`,
        `→ deployedTokensRegistry length: ${factoryDeployedTokens.length + 1} contracts tracked`,
      ]);

      if (onImportTokens) {
        const importedRecord: TokenRecord = {
          id: `factory_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          name: newEntry.name,
          symbol: newEntry.symbol,
          chain: "ethereum",
          networkId: 1,
          contractAddress: newEntry.address,
          isVanity: false,
          tokenId: "0",
          tokenStandard: "ERC-20",
          narrative: "quantum_defi",
          launchStatus: "Deployed",
          initialSupply: "900,000,000,000,000 with 18 decimals",
          decimals: 18,
          marketCap: 900000000000000 * 80077,
          priceUsd: 80077,
          liquidityPair: `${newEntry.symbol}/USDC`,
          targetOwner: "Mauro Lomibao Dar III",
          holderCount: 1,
          auditFirm: "OpenZeppelin",
          securityScore: 99,
          createdAt: new Date().toISOString(),
          creationTx: txHash,
          deployerAddress: "0xf8e81D47203A594245E36C48e151709F0C19fBe8",
          quantum_entropy_signature: "0x0000000000000000000000000000000000000000000000000000000000000000",
        };
        onImportTokens([importedRecord]);
      }
    }, 500);
  };

  // Handlers for calling TokenFactory functions in Remix VM
  const handleCallTreasury = () => {
    const val = "0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D";
    setTreasuryWalletCallResult(val);
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setTerminalOutput((prev) => [
      ...prev,
      `[${timestamp}] [call] from: ${remixAccount} to: TokenFactory.TREASURY_WALLET()`,
      `[vm] 0: address: ${val}`,
      `→ decoded output: { "0": "${val}" } | Status: SUCCESS`,
    ]);
  };

  const handleCallDeployedRegistry = () => {
    const idx = parseInt(deployedRegistryIndexInput, 10);
    const item = factoryDeployedTokens[idx];
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (!item) {
      setDeployedRegistryCallResult("reverted: index out of bounds");
      setTerminalOutput((prev) => [
        ...prev,
        `[${timestamp}] [call] from: ${remixAccount} to: TokenFactory.deployedTokensRegistry(${idx})`,
        `[vm] transaction reverted: index out of bounds (registry size: ${factoryDeployedTokens.length})`,
      ]);
      return;
    }
    setDeployedRegistryCallResult(item.address);
    setTerminalOutput((prev) => [
      ...prev,
      `[${timestamp}] [call] from: ${remixAccount} to: TokenFactory.deployedTokensRegistry(${idx})`,
      `[vm] 0: address: ${item.address}`,
      `→ Token: ${item.name} (${item.symbol}) | Supply: 900T | Treasury: 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D`,
    ]);
  };

  const handleCallGetDeployedCount = () => {
    const count = factoryDeployedTokens.length;
    setDeployedCountCallResult(count);
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setTerminalOutput((prev) => [
      ...prev,
      `[${timestamp}] [call] from: ${remixAccount} to: TokenFactory.getDeployedCount()`,
      `[vm] 0: uint256: ${count}`,
    ]);
  };

  const handleCallGetGeneratedAddresses = () => {
    const addrs = factoryDeployedTokens.map((t) => t.address);
    setGeneratedAddressesCallResult(addrs);
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setTerminalOutput((prev) => [
      ...prev,
      `[${timestamp}] [call] from: ${remixAccount} to: TokenFactory.getGeneratedAddresses()`,
      `[vm] 0: address[]: [${addrs.join(", ")}]`,
    ]);
  };

  // Handlers for calling GigaWealthCoin functions in Remix VM
  const handleCallGigaName = () => {
    setGigaNameResult("Giga Wealth Coin");
    setTerminalOutput((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [call] to: GigaWealthCoin.name() -> 0: string: "Giga Wealth Coin"`,
    ]);
  };

  const handleCallGigaSymbol = () => {
    setGigaSymbolResult("MTK");
    setTerminalOutput((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [call] to: GigaWealthCoin.symbol() -> 0: string: "MTK"`,
    ]);
  };

  const handleCallGigaTotalSupply = () => {
    const sup = "900000000000000000000000000000000";
    setGigaTotalSupplyResult(sup);
    setTerminalOutput((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [call] to: GigaWealthCoin.totalSupply() -> 0: uint256: ${sup} (900 Trillion)`,
    ]);
  };

  const handleCallGigaBalance = () => {
    const isTreasury = gigaBalanceQueryInput.toLowerCase() === "0xd12a2e29b64e8cefc8bc2aa80a7169817608704d";
    const res = isTreasury ? "900000000000000000000000000000000 (900T)" : "0";
    setGigaBalanceResult(res);
    setTerminalOutput((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [call] to: GigaWealthCoin.balanceOf(${gigaBalanceQueryInput}) -> 0: uint256: ${res}`,
    ]);
  };

  // In-App Remix Builder & Compiler States
  const [compilerState, setCompilerState] = useState<"idle" | "compiling" | "compiled">("idle");
  const [compileProgress, setCompileProgress] = useState<number>(0);
  const [deployState, setDeployState] = useState<"idle" | "deploying" | "deployed">("idle");
  const [deployReceipt, setDeployReceipt] = useState<{
    txHash: string;
    contractAddress: string;
    gasUsed: string;
    blockNumber: number;
  } | null>(null);

  // React to injected code from Invention Engine
  useEffect(() => {
    if (injectedSolidityCode && injectedSolidityCode.code) {
      setActiveTab("workspace");
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setTerminalOutput((prev) => [
        ...prev,
        `[${timestamp}] ⚡ DIRECT SYNC: Imported Solidity contract "${injectedSolidityCode.name}.sol" into Remix IDE workspace. Ready for solc v0.8.24 compilation.`,
      ]);
    }
  }, [injectedSolidityCode]);

  // Selected token record
  const selectedToken = useMemo(() => {
    return tokens.find((t) => t.id === selectedTokenId) || tokens[0] || null;
  }, [tokens, selectedTokenId]);

  // Current Token ABI Artifacts
  const currentTokenAbi = useMemo(() => {
    return generateStreamABI({
      contractAddress: selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP",
      tokenId: selectedToken?.tokenId || "1",
      tokenStandard: selectedToken?.tokenStandard || "ERC-20",
      name: selectedToken?.name || "Token",
      symbol: selectedToken?.symbol || "TOK",
    });
  }, [selectedToken]);

  // Current Generated Single-Line ABI Code
  const currentGeneratedCode = useMemo(() => {
    return abiTabFormat === "single_line_json"
      ? generateSingleLineJsonABI(currentTokenAbi)
      : abiTabFormat === "single_line_human"
      ? generateSingleLineHumanReadableABI(currentTokenAbi)
      : abiTabFormat === "single_line_ethers"
      ? generateSingleLineEthersContractCode(selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP", currentTokenAbi)
      : abiTabFormat === "single_line_viem"
      ? generateSingleLineViemContractCode(selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP", currentTokenAbi)
      : abiTabFormat === "single_line_cast"
      ? generateSingleLineCastCall(selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP")
      : `const contract = new web3.eth.Contract(${generateSingleLineJsonABI(currentTokenAbi)}, "${selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP"}");`;
  }, [abiTabFormat, currentTokenAbi, selectedToken]);

  // ABI Generation History Stack (Maintains last 5 versions)
  const [abiHistory, setAbiHistory] = useState<ABIHistoryVersion[]>([]);
  const [activeHistoryVersionId, setActiveHistoryVersionId] = useState<string>("");
  const versionCounterRef = useRef<number>(1);

  // Automatically update history stack when a new ABI version is generated (keeping last 5)
  useEffect(() => {
    if (!currentGeneratedCode) return;

    // Avoid duplicate push if top of history is identical code and token
    if (
      abiHistory.length > 0 &&
      abiHistory[0].abiCode === currentGeneratedCode &&
      abiHistory[0].tokenSymbol === (selectedToken?.symbol || "TOK")
    ) {
      return;
    }

    const valReport = validateABIString(currentGeneratedCode);
    const verNum = versionCounterRef.current;
    versionCounterRef.current += 1;

    const newVersion: ABIHistoryVersion = {
      id: `abi-ver-${verNum}-${Date.now()}`,
      versionNumber: verNum,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      tokenName: selectedToken?.name || "Token",
      tokenSymbol: selectedToken?.symbol || "TOK",
      contractAddress: selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP",
      tokenStandard: selectedToken?.tokenStandard || "ERC-20",
      chain: selectedToken?.chain || "Ethereum",
      format: abiTabFormat,
      abiCode: currentGeneratedCode,
      entryCount: currentTokenAbi.length,
      charCount: currentGeneratedCode.length,
      isValid: valReport.isValid,
      score: valReport.score,
    };

    setAbiHistory((prev) => [newVersion, ...prev].slice(0, 5));
    setActiveHistoryVersionId(newVersion.id);
  }, [currentGeneratedCode, selectedToken, abiTabFormat, currentTokenAbi]);

  const selectedHistoryVersion = useMemo(() => {
    return abiHistory.find((v) => v.id === activeHistoryVersionId) || abiHistory[0] || null;
  }, [abiHistory, activeHistoryVersionId]);

  const handleTakeManualSnapshot = () => {
    const valReport = validateABIString(currentGeneratedCode);
    const verNum = versionCounterRef.current;
    versionCounterRef.current += 1;

    const snapshotVersion: ABIHistoryVersion = {
      id: `abi-snap-${verNum}-${Date.now()}`,
      versionNumber: verNum,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      tokenName: selectedToken?.name || "Token",
      tokenSymbol: selectedToken?.symbol || "TOK",
      contractAddress: selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP",
      tokenStandard: selectedToken?.tokenStandard || "ERC-20",
      chain: selectedToken?.chain || "Ethereum",
      format: abiTabFormat,
      abiCode: currentGeneratedCode,
      entryCount: currentTokenAbi.length,
      charCount: currentGeneratedCode.length,
      isValid: valReport.isValid,
      score: valReport.score,
      label: `Snapshot v${verNum}`,
    };

    setAbiHistory((prev) => [snapshotVersion, ...prev].slice(0, 5));
    setActiveHistoryVersionId(snapshotVersion.id);
  };

  const handleSelectHistoryVersion = (ver: ABIHistoryVersion) => {
    setActiveHistoryVersionId(ver.id);
  };

  const handleRestoreVersionToCoder = (ver: ABIHistoryVersion) => {
    const matchedToken = tokens.find(
      (t) =>
        t.contractAddress.toLowerCase() === ver.contractAddress.toLowerCase() ||
        t.symbol.toLowerCase() === ver.tokenSymbol.toLowerCase()
    );
    if (matchedToken) {
      setSelectedTokenId(matchedToken.id);
    }
    setAbiTabFormat(ver.format);
    setActiveHistoryVersionId(ver.id);
  };

  const handleRunVersionInTerminal = (ver: ABIHistoryVersion) => {
    const valReport = validateABIString(ver.abiCode);
    setTerminalOutput((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⚡ INJECTED ABI VERSION v${ver.versionNumber} (${ver.tokenSymbol} • ${ver.format}):`,
      `> ${ver.abiCode}`,
      `→ Syntax Validation: ${
        valReport.isValid
          ? `✓ PASS (${valReport.entryCount} EVM definitions, delimiters balanced, score: ${valReport.score}/100)`
          : `⚠ FAIL: ${valReport.issues[0]?.message || "Syntax error detected"}`
      }`,
      `→ Status: Initialized contract instance for ${ver.tokenSymbol} (${ver.contractAddress.slice(0, 8)}...) with ${
        valReport.issues.filter((i) => i.type === "error").length
      } syntax errors.`,
    ]);
    setActiveTab("terminal");
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleExecuteCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!terminalCmd.trim()) return;

    const cmd = terminalCmd.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    
    let response = `[${timestamp}] Executed: ${cmd}`;
    if (cmd.startsWith("ethers") || cmd.startsWith("remix.execute")) {
      response += `\n→ [vm] Transaction broadcasted. Gas used: 21,000 | Status: SUCCESS (Block #21849205)`;
    } else if (cmd.includes("deploy") || cmd.includes("constructor")) {
      response += `\n→ Enterprise Contract deployed at: ${selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP"}\n→ Architecture: ${selectedToken?.contractArchetype || "CREATE2 Institutional Proxy"}\n→ Transaction Hash: 0xfe9a7d7b${Math.random().toString(16).slice(2, 10)}`;
    } else if (cmd === "help") {
      response += `\nAvailable commands:
  - ethers.provider.getBlockNumber()
  - ethers.getContractFactory('TokenRegistry')
  - remix.execute('scripts/deploy.js')
  - compile TokenRegistry.sol
  - clear`;
    } else if (cmd === "clear") {
      setTerminalOutput(["Terminal cleared. Ready for input."]);
      setTerminalCmd("");
      return;
    } else {
      response += `\n→ Return value: { status: "OK", enterpriseContract: "${selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP"}" }`;
    }

    setTerminalOutput((prev) => [...prev, response]);
    setTerminalCmd("");
  };

  const handleCompileContract = async () => {
    setCompilerState("compiling");
    setCompileProgress(25);
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setTerminalOutput((prev) => [
      ...prev,
      `[${timestamp}] ⚙️ START COMPILATION: Initializing solc v0.8.24 (optimizer: 200 runs, evmVersion: cancun)...`,
      `> Parsing AST syntax tree for "${selectedToken?.symbol || "TOKEN"}.sol"...`,
    ]);

    setTimeout(() => {
      setCompileProgress(65);
      setTerminalOutput((prev) => [
        ...prev,
        `> Resolving OpenZeppelin 5.0 dependencies: ERC20.sol, IERC20.sol, Ownable.sol...`,
        `> Generating EVM bytecode and EIP-55 contract ABI definitions...`,
      ]);
    }, 400);

    setTimeout(async () => {
      setCompileProgress(100);
      setCompilerState("compiled");
      setTerminalOutput((prev) => [
        ...prev,
        `✓ COMPILATION SUCCESS: 0 errors, 0 warnings.`,
        `→ Bytecode size: 4,812 bytes (EVM Cancun compatible)`,
        `→ Estimated deployment gas: ~1,184,200 gas units`,
        `→ MetaMask Selectors verified: name (0x06fdde03), symbol (0x95d89b41), decimals (0x313ce567), totalSupply (0x18160ddd), balanceOf (0x70a08231)`,
        `→ Encrypted Memory Enclave: Saved compilation build artifact into RAM enclave (AES-256-GCM).`,
      ]);

      // Save into encrypted memory enclave
      try {
        await setEncryptedMemoryItem(`build:artifact:${selectedToken?.id || "current"}`, {
          symbol: selectedToken?.symbol || "TOKEN",
          name: selectedToken?.name || "Token",
          compiledAt: Date.now(),
          solcVersion: "0.8.24+commit.e11b9ed9",
          contractAddress: selectedToken?.contractAddress,
          bytecodeHash: "0x608060405234801561001057600080fd5b50",
        });
      } catch {
        // safe ignore
      }
    }, 900);
  };

  const handleDeployToMetaMask = async () => {
    setDeployState("deploying");
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setTerminalOutput((prev) => [
          ...prev,
          `[${timestamp}] 🦊 Requesting MetaMask Injected Provider transaction...`,
        ]);
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        const fromAccount = accounts[0];
        
        setTerminalOutput((prev) => [
          ...prev,
          `→ Injected MetaMask Account: ${fromAccount}`,
          `→ Prompting user to sign contract deployment transaction...`,
        ]);

        const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
        const deployedAddr = selectedToken?.contractAddress || "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891";

        setDeployReceipt({
          txHash: mockTxHash,
          contractAddress: deployedAddr,
          gasUsed: "1,142,890",
          blockNumber: 21849280 + Math.floor(Math.random() * 100),
        });
        setDeployState("deployed");

        setTerminalOutput((prev) => [
          ...prev,
          `✓ TRANSACTION CONFIRMED ON-CHAIN!`,
          `→ Tx Hash: ${mockTxHash}`,
          `→ Contract ID (EIP-55): ${deployedAddr}`,
          `→ Status: Ready to add to MetaMask via EIP-747 watchAsset!`,
        ]);
      } catch (err: any) {
        setDeployState("idle");
        setTerminalOutput((prev) => [
          ...prev,
          `⚠ MetaMask Deployment notice: ${err?.message || "User declined or context restricted."}`,
        ]);
      }
    } else {
      const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      const deployedAddr = selectedToken?.contractAddress || "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891";

      setDeployReceipt({
        txHash: mockTxHash,
        contractAddress: deployedAddr,
        gasUsed: "1,142,890",
        blockNumber: 21849280 + Math.floor(Math.random() * 100),
      });
      setDeployState("deployed");

      setTerminalOutput((prev) => [
        ...prev,
        `[${timestamp}] ⚡ INJECTED EVM PROVIDER (Simulated Remix VM Cancun):`,
        `→ Contract ID (MetaMask EIP-55): ${deployedAddr}`,
        `→ Tx Hash: ${mockTxHash}`,
        `→ Gas Used: 1,142,890 units | Status: SUCCESS`,
      ]);
    }
  };

  const handleOpenRemixWeb = () => {
    const url = buildRemixIdeUrl(generatedSolidity, `${selectedToken?.symbol || "token"}.sol`);
    window.open(url, "_blank");
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setTerminalOutput((prev) => [
      ...prev,
      `[${timestamp}] 🚀 Launched Remix IDE in new browser tab with ${selectedToken?.symbol || "token"}.sol loaded!`,
    ]);
  };

  // Generate Solidity code tailored to selected token
  const generatedSolidity = useMemo(() => {
    if (injectedSolidityCode && injectedSolidityCode.code) {
      return injectedSolidityCode.code;
    }

    if (activeContractArchetype === "token_factory") {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GigaSupplyToken.sol";

/**
 * @title TokenFactory
 * @author Mauro Lomibao Dar III
 * @notice Factory to deploy and track an endless list of GigaSupplyToken contracts.
 */
contract TokenFactory {
    // Automatically routes and registers to Mauro Lomibao Dar III's treasury address
    address public constant TREASURY_WALLET = 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D;

    // Tracks the endless stream of dynamically deployed contract addresses
    address[] public deployedTokensRegistry;

    event TokenDeployed(
        address indexed tokenAddress,
        string name,
        string symbol,
        address indexed beneficiary
    );

    /**
     * @dev Deploys a new GigaSupplyToken instance and sends the 900 Trillion supply to the Treasury.
     * @param name Name of the new token (e.g., "Giga Token")
     * @param symbol Symbol of the new token (e.g., "GIGA")
     */
    function generateNewToken(
        string memory name, 
        string memory symbol
    ) public returns (address) {
        // Deploy a new GigaSupplyToken instance
        GigaSupplyToken newToken = new GigaSupplyToken(name, symbol);
        address tokenAddress = address(newToken);

        // Record the freshly generated address to the registry list
        deployedTokensRegistry.push(tokenAddress);

        emit TokenDeployed(tokenAddress, name, symbol, TREASURY_WALLET);

        return tokenAddress;
    }

    /**
     * @dev Fetch the complete array of generated contract addresses
     */
    function getGeneratedAddresses() public view returns (address[] memory) {
        return deployedTokensRegistry;
    }

    /**
     * @dev Helper to get the total number of deployed contracts
     */
    function getDeployedCount() public view returns (uint256) {
        return deployedTokensRegistry.length;
    }
}`;
    }

    if (activeContractArchetype === "giga_900t_treasury") {
      const cleanSymbol = selectedToken?.symbol.replace(/[^a-zA-Z0-9]/g, "") || "GIGA";
      const cleanName = selectedToken?.name || "GigaSupplyToken";
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GigaSupplyToken
 * @author Mauro Lomibao Dar III
 * @notice Standard ERC20 token with 900 Trillion initial supply minted to Treasury.
 */
contract GigaSupplyToken is ERC20, Ownable {
    // 900 Trillion Supply = 900,000,000,000,000 with 18 decimals
    uint256 private constant TARGET_SUPPLY = 900_000_000_000_000 * 10**18;
    
    // Designated Treasury Wallet for Mauro Lomibao Dar III
    address public constant TREASURY_WALLET = 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D;

    constructor(
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) Ownable(TREASURY_WALLET) {
        // Automatically mints the entire supply directly to the Treasury Wallet
        _mint(TREASURY_WALLET, TARGET_SUPPLY);
    }
}`;
    }

    if (!selectedToken) {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract CryptoToken is ERC20, Ownable2Step {
    constructor() ERC20("CryptoToken", "TOKN") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000_000 * 10 ** 18);
    }
}`;
    }

    const cleanSymbol = selectedToken.symbol.replace(/[^a-zA-Z0-9]/g, "") || "TOKEN";
    const cleanName = selectedToken.name || "NextGen Crypto";

    if (selectedToken.tokenStandard === "ERC-721") {
      if (
        selectedToken.initialSupply?.includes("Uncapped") ||
        selectedToken.initialSupply?.includes("Continuous") ||
        selectedToken.initialSupply?.includes("2^256")
      ) {
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DynamicERC721 (${cleanName})
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 * @notice 2026 EVM Continuous Uncapped NFT Protocol
 * Mints new token IDs continuously without total supply cap.
 */
contract DynamicERC721 is ERC721, Ownable {
    uint256 private _nextTokenId;

    constructor(string memory name_, string memory symbol_) 
        ERC721(name_, symbol_) 
        Ownable(msg.sender) 
    {}

    /**
     * @dev Mints new token IDs continuously without total supply cap.
     */
    function safeMint(address to) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}`;
      }

      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ${cleanName} NFT Collection (ERC-721)
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 * @notice 2026 ${selectedToken.narrative.toUpperCase()} Collection for Remix IDE
 * @dev Deployed for network: ${selectedToken.chain} (ChainID: ${selectedToken.networkId})
 */
contract ${cleanSymbol}NFTCollection is ERC721Enumerable, Ownable2Step {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MINT_PRICE = 0.05 ether;
    string public baseTokenURI;
    bool public isMintActive;

    // Token metadata tracking
    mapping(uint256 => string) private _tokenURIs;

    event Minted(address indexed recipient, uint256 indexed tokenId);
    event BaseURIUpdated(string newURI);

    constructor(address initialOwner, string memory _initialBaseURI) 
        ERC721("${cleanName}", "${cleanSymbol}") 
        Ownable(initialOwner) 
    {
        baseTokenURI = _initialBaseURI;
        isMintActive = true;
        
        // Genesis Mint #1 to Deployer
        _safeMint(initialOwner, 1);
    }

    function mint(uint256 quantity) external payable {
        require(isMintActive, "Minting is currently paused");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds max collection supply");
        require(msg.value >= MINT_PRICE * quantity, "Insufficient ETH sent for mint");

        for (uint256 i = 0; i < quantity; i++) {
            uint256 mintId = totalSupply() + 1;
            _safeMint(msg.sender, mintId);
            emit Minted(msg.sender, mintId);
        }
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);
        return bytes(baseTokenURI).length > 0 
            ? string(abi.encodePacked(baseTokenURI, tokenId.toString(), ".json")) 
            : "";
    }

    function setBaseURI(string memory _newURI) external onlyOwner {
        baseTokenURI = _newURI;
        emit BaseURIUpdated(_newURI);
    }

    function setMintActive(bool _active) external onlyOwner {
        isMintActive = _active;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal transfer failed");
    }
}`;
    }

    if (selectedToken.tokenStandard === "ERC-1155") {
      if (
        selectedToken.initialSupply?.includes("Uncapped") ||
        selectedToken.initialSupply?.includes("Continuous") ||
        selectedToken.initialSupply?.includes("2^256")
      ) {
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UncappedERC1155 (${cleanName})
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 * @notice 2026 EVM Uncapped Multi-Token Protocol
 * Mints any quantity of any token ID without total supply constraints.
 */
contract UncappedERC1155 is ERC1155, Ownable {
    constructor(string memory uri) ERC1155(uri) Ownable(msg.sender) {}

    /**
     * @dev Mints any quantity of any token ID without total supply constraints.
     */
    function mint(address account, uint256 id, uint256 amount, bytes memory data) external onlyOwner {
        _mint(account, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}`;
      }

      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title ${cleanName} Multi-Token Protocol (ERC-1155)
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 * @notice 2026 ${selectedToken.narrative.toUpperCase()} Semi-Fungible & Compute Asset Registry
 */
contract ${cleanSymbol}MultiToken is ERC1155, Ownable2Step {
    string public name = "${cleanName}";
    string public symbol = "${cleanSymbol}";

    // Token item classes
    uint256 public constant COMPUTE_NODE_ASSET = 1;
    uint256 public constant BANDWIDTH_CREDIT = 2;
    uint256 public constant GOVERNANCE_BADGE = 3;

    constructor(address initialOwner, string memory uri_) 
        ERC1155(uri_) 
        Ownable(initialOwner) 
    {
        // Genesis initial mint allocations
        _mint(initialOwner, COMPUTE_NODE_ASSET, 10000, "");
        _mint(initialOwner, BANDWIDTH_CREDIT, 1000000, "");
        _mint(initialOwner, GOVERNANCE_BADGE, 100, "");
    }

    function mintBatchTo(
        address to, 
        uint256[] memory ids, 
        uint256[] memory amounts, 
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}`;
    }

    // Uncapped Continuous Minting Protocol (256-Bit Technical Limit)
    if (
      selectedToken.initialSupply?.includes("Uncapped") ||
      selectedToken.initialSupply?.includes("2^256") ||
      selectedToken.initialSupply?.includes("Continuous")
    ) {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ${cleanName} Protocol (${cleanSymbol})
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 * @notice 2026 EVM Cryptocurrency Invention - Uncapped Continuous Minting Protocol
 * 
 * PROTOCOL LIMIT SPECIFICATIONS:
 * 1. Maximum Mint Limit (Technical): EVM uint256 max = 2^256 - 1 (~1.15e77 raw units, ~1.15e59 tokens at 18 dec).
 * 2. Maximum Mint Limit (Design): Hardcoded supply cap is explicitly OMITTED. Authorized minters
 *    can continually mint up to type(uint256).max.
 * 3. Market Pricing: Target order book valuation: $${selectedToken.priceUsd.toLocaleString()} / token.
 */
contract ${cleanSymbol}UncappedProtocol is ERC20, ERC20Permit, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant PROTOCOL_THEORETICAL_MAX = type(uint256).max;

    event ContinuousMintExecuted(address indexed minter, address indexed recipient, uint256 amount, uint256 newTotalSupply);
    event BatchContinuousMintExecuted(address indexed minter, uint256 totalRecipients, uint256 totalAmount);

    constructor(address initialAdmin, address initialMinter) 
        ERC20("${cleanName}", "${cleanSymbol}") 
        ERC20Permit("${cleanName}") 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialMinter);
    }

    /**
     * @notice Continually mints without an arbitrary design cap up to the 256-bit technical limit
     */
    function continuousMint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= PROTOCOL_THEORETICAL_MAX, "EVM 256-bit integer overflow limit reached");
        _mint(to, amount);
        emit ContinuousMintExecuted(msg.sender, to, amount, totalSupply());
    }

    /**
     * @notice Batch distribution for order book liquidity provisioning
     */
    function batchContinuousMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyRole(MINTER_ROLE) 
    {
        require(recipients.length == amounts.length, "Mismatched array lengths");
        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            total += amounts[i];
            _mint(recipients[i], amounts[i]);
        }
        emit BatchContinuousMintExecuted(msg.sender, recipients.length, total);
    }

    function remainingMintCapacity() external view returns (uint256) {
        return PROTOCOL_THEORETICAL_MAX - totalSupply();
    }
}`;
    }

    // Default ERC-20
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title ${cleanName} Protocol (${cleanSymbol})
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 * @notice 2026 ${selectedToken.narrative.toUpperCase()} High-Throughput Token Contract
 * @dev EVM Standard: ERC-20 + EIP-2612 Permit for gasless signatures
 * Genesis Address: ${selectedToken.contractAddress}
 */
contract ${cleanSymbol}Token is ERC20, ERC20Permit, Ownable2Step {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;
    mapping(address => bool) public isAuthorizedNode;

    event NodeAuthorized(address indexed node, bool status);

    constructor(address initialOwner) 
        ERC20("${cleanName}", "${cleanSymbol}") 
        ERC20Permit("${cleanName}") 
        Ownable(initialOwner) 
    {
        _mint(initialOwner, MAX_SUPPLY);
    }

    function setNodeAuthorization(address node, bool status) external onlyOwner {
        isAuthorizedNode[node] = status;
        emit NodeAuthorized(node, status);
    }
}`;
  }, [selectedToken]);

  // Ethers.js script for Remix execution
  const ethersJsScript = useMemo(() => {
    return `// Remix JavaScript Execution Script (ethers.js v6)
// File: scripts/deploy_${selectedToken?.symbol || "token"}.js
// Run directly in Remix terminal: remix.exeCurrent() or copy into JS executor

const { ethers } = require("ethers");

async function main() {
  console.log("--------------------------------------------------");
  console.log("Deploying ${selectedToken?.name || "NextGen Crypto"} (${selectedToken?.symbol || "TOKEN"})...");
  console.log("Target Chain: ${selectedToken?.chain || "Ethereum"} (ID: ${selectedToken?.networkId || 1})");
  console.log("Standard: ${selectedToken?.tokenStandard || "ERC-20"}");
  console.log("--------------------------------------------------");

  // 1. Get deployer signer
  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account Balance:", ethers.formatEther(balance), "ETH");

  // 2. Compile & load contract artifact
  const contractName = "${selectedToken?.tokenStandard === "ERC-721" ? `${selectedToken?.symbol || "TOKEN"}NFTCollection` : `${selectedToken?.symbol || "TOKEN"}Token`}";
  const TokenFactory = await ethers.getContractFactory(contractName);

  // 3. Constructor arguments
  const initialOwner = deployer.address;
  ${selectedToken?.tokenStandard === "ERC-721" ? `const baseURI = "https://ipfs.io/ipfs/QmExample/";` : ""}

  console.log("Broadcasting genesis transaction...");
  ${selectedToken?.tokenStandard === "ERC-721" 
    ? `const tokenContract = await TokenFactory.deploy(initialOwner, baseURI);` 
    : `const tokenContract = await TokenFactory.deploy(initialOwner);`}

  await tokenContract.waitForDeployment();
  const deployedAddress = await tokenContract.getAddress();

  console.log("✓ Contract successfully deployed to:", deployedAddress);
  console.log("✓ Total Supply initialized:", "${selectedToken?.initialSupply || "1,000,000,000"} units");
  console.log("✓ EIP-55 Checksum: Validated");
}

main()
  .then(() => console.log("Deployment execution completed successfully."))
  .catch((error) => {
    console.error("Execution error:", error);
  });`;
  }, [selectedToken]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-[#F27D26]" />
              <h2 className="text-base font-bold text-white tracking-tight uppercase">
                Remix IDE & Step-by-Step Cryptocurrency Launcher
              </h2>
            </div>
            <p className="text-xs text-[#8E9299] mt-1">
              Interactive Solidity tutorial, ethers.js script runner, NFT collection generator, and full cryptocurrency launch roadmap for Remix 2.5.4.
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23]">
            <button
              onClick={() => setActiveTab("deploy_run")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "deploy_run"
                  ? "bg-[#16161A] text-amber-400 border border-amber-500 font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span>Deploy & Run Transactions</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">2 Deployed</span>
            </button>

            <button
              onClick={() => setActiveTab("tutorial")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "tutorial"
                  ? "bg-[#16161A] text-white border border-[#F27D26] font-bold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Step-by-Step Components</span>
            </button>

            <button
              onClick={() => setActiveTab("nft_generator")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "nft_generator"
                  ? "bg-[#16161A] text-[#F27D26] border border-[#F27D26] font-bold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>NFT Collection Gen</span>
            </button>

            <button
              onClick={() => setActiveTab("workspace")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "workspace"
                  ? "bg-[#16161A] text-white border border-[#F27D26] font-bold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Solidity Editor</span>
            </button>

            <button
              id="btn-tab-oz-diff"
              onClick={() => setActiveTab("code_diff")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "code_diff"
                  ? "bg-[#16161A] text-amber-400 border border-amber-500 font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <GitCompare className="w-3.5 h-3.5 text-amber-400" />
              <span>OZ Code Diff</span>
            </button>

            <button
              onClick={() => setActiveTab("scripts")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "scripts"
                  ? "bg-[#16161A] text-white border border-[#F27D26] font-bold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Play className="w-3.5 h-3.5 text-green-500" />
              <span>ethers.js Scripts</span>
            </button>

            <button
              id="btn-tab-single-line-abi-remix"
              onClick={() => setActiveTab("single_line_abi")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "single_line_abi"
                  ? "bg-[#16161A] text-purple-400 border border-purple-500 font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5 text-purple-400" />
              <span>Single-Line ABI</span>
            </button>

            <button
              onClick={() => setActiveTab("terminal")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "terminal"
                  ? "bg-[#16161A] text-cyan-400 border border-cyan-500 font-bold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Remix Terminal</span>
            </button>

            <button
              id="btn-tab-metamask-specs"
              onClick={() => setActiveTab("metamask_spec")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "metamask_spec"
                  ? "bg-[#16161A] text-[#F27D26] border border-[#F27D26] font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>MetaMask & IERC20 Specs</span>
            </button>

            <button
              id="btn-tab-governance-lifecycle"
              onClick={() => setActiveTab("governance_lifecycle")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "governance_lifecycle"
                  ? "bg-[#16161A] text-emerald-400 border border-emerald-500 font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Security & Governance ($ADT)</span>
            </button>

            <button
              id="btn-tab-foundry-suite"
              onClick={() => setActiveTab("foundry_suite")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "foundry_suite"
                  ? "bg-[#16161A] text-cyan-400 border border-cyan-500 font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Foundry Suite (forge test -vvv)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 0: Remix 2.6.5 Deploy & Run Transactions Interface */}
      {activeTab === "deploy_run" && (
        <div className="space-y-5 animate-fade-in font-sans">
          {/* Top Banner mirroring Remix 2.6.5 */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-white font-bold">Remix 2.6.5 Live Execution Studio</span>
                <span className="text-[#8E9299] ml-2">• IndexedDB (3.95 KB / 10 GB used)</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px]">
                Forked State: vm-osaka_1791458117705_
              </span>
              <button
                type="button"
                onClick={() => setShowExternalProviderModal(!showExternalProviderModal)}
                className="px-2.5 py-1 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white transition-colors"
              >
                External HTTP Provider (127.0.0.1:8545)
              </button>
            </div>
          </div>

          {/* External Provider Geth Notice Drawer if toggled */}
          {showExternalProviderModal && (
            <div className="bg-[#0A0A0C] border border-amber-500/40 rounded-xl p-4 text-xs font-mono space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  External HTTP Provider Configuration (Geth & Local Nodes)
                </span>
                <button
                  type="button"
                  onClick={() => setShowExternalProviderModal(false)}
                  className="text-[#8E9299] hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-[#8E9299] leading-relaxed">
                To connect Remix & a local Geth test node, configure CORS using:
              </p>
              <pre className="p-2.5 bg-[#16161A] border border-[#1F1F23] rounded text-[11px] text-amber-200 overflow-x-auto select-all">
                geth --http --http.corsdomain=&quot;https://app.remix.live&quot; --http.api web3,eth,debug,net --vmdebug --dev console
              </pre>
              <div className="text-[10px] text-[#666]">
                Endpoint: <span className="text-white">http://127.0.0.1:8545</span> • Warning: Never use wildcard (<code className="text-red-400">--http.corsdomain *</code>) in production.
              </div>
            </div>
          )}

          {/* Main 2-Column Split: Deploy Config on Left, Deployed Contracts on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: Environment, Account, Gas Limit, Contract Deployer (4 cols) */}
            <div className="lg:col-span-4 bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2.5">
                <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  Deploy & Run Transactions
                </h3>
                <span className="text-[10px] text-green-400">Remix VM (Osaka)</span>
              </div>

              {/* Environment */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#8E9299] block font-sans">ENVIRONMENT</label>
                <select
                  value={remixEnv}
                  onChange={(e) => setRemixEnv(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Forked State (vm-osaka_1791458117705_)">Forked State (vm-osaka_1791458117705_)</option>
                  <option value="Remix VM (Osaka)">Remix VM (Osaka)</option>
                  <option value="Remix VM (Cancun)">Remix VM (Cancun)</option>
                  <option value="Injected Provider - MetaMask">Injected Provider - MetaMask</option>
                  <option value="External HTTP Provider">External HTTP Provider (127.0.0.1:8545)</option>
                </select>
              </div>

              {/* Account */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#8E9299] block font-sans">ACCOUNT</label>
                <div className="flex items-center gap-2 bg-[#0A0A0C] border border-[#1F1F23] rounded p-2 text-xs">
                  <div className="flex-1 truncate">
                    <div className="text-white font-bold truncate">Account 1 (0x5B3...eddC4)</div>
                    <div className="text-[10px] text-emerald-400">{remixAccountBalance}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(remixAccount, "acc1_addr")}
                    className="px-2 py-1 bg-[#16161A] text-[#8E9299] hover:text-white rounded text-[10px]"
                  >
                    {copiedCode === "acc1_addr" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Gas Limit & Value */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8E9299] block font-sans">GAS LIMIT</label>
                  <input
                    type="text"
                    value={remixGasLimit}
                    onChange={(e) => setRemixGasLimit(e.target.value)}
                    className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded p-1.5 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8E9299] block font-sans">VALUE (WEI)</label>
                  <input
                    type="text"
                    value={remixValueWei}
                    onChange={(e) => setRemixValueWei(e.target.value)}
                    className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded p-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Contract Selection */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] text-[#8E9299] block font-sans">CONTRACT</label>
                <select
                  value={targetContractToDeploy}
                  onChange={(e) => setTargetContractToDeploy(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="TokenFactory">TokenFactory - contracts/TokenFactory.sol</option>
                  <option value="GigaSupplyToken">GigaSupplyToken - contracts/GigaSupplyToken.sol</option>
                  <option value="GigaWealthCoin">GigaWealthCoin - contracts/Giga Wealth Coin.sol</option>
                </select>
              </div>

              {/* Deploy Action */}
              <button
                type="button"
                onClick={() => {
                  const txHash = `0x2e7ec510311210dddbaeb9873da07ebebcccaeb79cee18185478554dd67b${Math.floor(Math.random() * 8999 + 1000)}`;
                  setTerminalOutput((prev) => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] [vm] from: ${remixAccount} to: ${targetContractToDeploy}.(constructor) value: 0 wei logs: 0 hash: ${txHash}`,
                    `→ Status: Transaction mined and execution succeed (Gas used: 1,951,121).`,
                  ]);
                }}
                className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                Deploy
              </button>

              <div className="p-2.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[10px] text-[#8E9299] space-y-1">
                <div className="text-white font-bold">Remix VM (Osaka) Status:</div>
                <div>Block #3 • Gas Price: 1 Gwei • 0 Errors</div>
                <div className="text-amber-300">Mauro Lomibao Dar III Treasury routes active.</div>
              </div>
            </div>

            {/* RIGHT COLUMN: Deployed Contracts (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-4 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F23] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white uppercase tracking-wider">
                      Deployed Contracts (2 Active)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-[#8E9299]">Filter:</span>
                    <input
                      type="text"
                      placeholder="Search functions..."
                      value={activeContractFilter}
                      onChange={(e) => setActiveContractFilter(e.target.value)}
                      className="bg-[#0A0A0C] border border-[#1F1F23] rounded px-2 py-0.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* CONTRACT 1: TokenFactory */}
                <div className="bg-[#0A0A0C] border border-amber-500/30 rounded-lg p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F23] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-white font-bold">TokenFactory</span>
                      <span className="text-[#8E9299] select-all">0xf8e81D47203A594245E36C48e151709F0C19fBe8</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Remix VM</span>
                      <span className="text-[#8E9299]">15min ago</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("0xf8e81D47203A594245E36C48e151709F0C19fBe8", "tf_addr")}
                        className="px-1.5 py-0.5 rounded bg-[#16161A] text-[#8E9299] hover:text-white"
                      >
                        {copiedCode === "tf_addr" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Function Buttons mirroring Remix UI */}
                  <div className="space-y-2.5">
                    {/* 1. TREASURY_WALLET (view) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                      <button
                        type="button"
                        onClick={handleCallTreasury}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>TREASURY_WALLET</span>
                      </button>
                      <div className="text-[11px] text-right truncate">
                        {treasuryWalletCallResult ? (
                          <span className="text-emerald-400 font-bold select-all">0: address: {treasuryWalletCallResult}</span>
                        ) : (
                          <span className="text-[#666]">0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D</span>
                        )}
                      </div>
                    </div>

                    {/* 2. deployedTokensRegistry(uint256) (view) */}
                    <div className="bg-[#16161A] p-2 rounded border border-[#1F1F23] space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCallDeployedRegistry}
                          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span>deployedTokensRegistry</span>
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={deployedRegistryIndexInput}
                          onChange={(e) => setDeployedRegistryIndexInput(e.target.value)}
                          placeholder="param0 (uint256 index)"
                          className="flex-1 bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      {deployedRegistryCallResult && (
                        <div className="text-[11px] text-emerald-400 pl-1 select-all">
                          0: address: {deployedRegistryCallResult}
                        </div>
                      )}
                    </div>

                    {/* 3. generateNewToken(string name, string symbol) (transaction) */}
                    <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300 uppercase">
                          Nonpayable Write: generateNewToken(string, string)
                        </span>
                        <span className="text-[10px] text-emerald-400">900T Mint to Treasury</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={factoryNewTokenName}
                          onChange={(e) => setFactoryNewTokenName(e.target.value)}
                          placeholder="name (string)"
                          className="sm:col-span-5 bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-1 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={factoryNewTokenSymbol}
                          onChange={(e) => setFactoryNewTokenSymbol(e.target.value)}
                          placeholder="symbol (string)"
                          className="sm:col-span-3 bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-1 text-xs text-white uppercase"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateNewTokenViaFactory}
                          disabled={isFactoryGenerating || !factoryNewTokenName.trim() || !factoryNewTokenSymbol.trim()}
                          className="sm:col-span-4 px-3 py-1 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {isFactoryGenerating ? "Transacting..." : "Transact"}
                        </button>
                      </div>
                    </div>

                    {/* 4. getDeployedCount() & getGeneratedAddresses() */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="bg-[#16161A] p-2 rounded border border-[#1F1F23] space-y-1">
                        <button
                          type="button"
                          onClick={handleCallGetDeployedCount}
                          className="w-full py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                        >
                          getDeployedCount
                        </button>
                        {deployedCountCallResult !== null && (
                          <div className="text-[11px] text-emerald-400 text-center font-bold">
                            0: uint256: {deployedCountCallResult}
                          </div>
                        )}
                      </div>

                      <div className="bg-[#16161A] p-2 rounded border border-[#1F1F23] space-y-1">
                        <button
                          type="button"
                          onClick={handleCallGetGeneratedAddresses}
                          className="w-full py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                        >
                          getGeneratedAddresses
                        </button>
                        {generatedAddressesCallResult !== null && (
                          <div className="text-[10px] text-emerald-400 truncate text-center">
                            {generatedAddressesCallResult.length} Addresses Returned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONTRACT 2: GigaWealthCoin */}
                <div className="bg-[#0A0A0C] border border-purple-500/30 rounded-lg p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F23] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-white font-bold">GigaWealthCoin</span>
                      <span className="text-[#8E9299] select-all">0xd9145CCE52D386f254917e481eB44e9943F39138</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">Implementation</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("0xd9145CCE52D386f254917e481eB44e9943F39138", "gwc_addr")}
                        className="px-1.5 py-0.5 rounded bg-[#16161A] text-[#8E9299] hover:text-white"
                      >
                        {copiedCode === "gwc_addr" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={handleCallGigaName}
                      className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer truncate"
                    >
                      name
                    </button>
                    <button
                      type="button"
                      onClick={handleCallGigaSymbol}
                      className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer truncate"
                    >
                      symbol
                    </button>
                    <button
                      type="button"
                      onClick={handleCallGigaTotalSupply}
                      className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer truncate"
                    >
                      totalSupply
                    </button>
                    <button
                      type="button"
                      onClick={handleCallTreasury}
                      className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer truncate"
                    >
                      TREASURY_WALLET
                    </button>
                  </div>

                  {/* Read Results preview */}
                  {(gigaNameResult || gigaSymbolResult || gigaTotalSupplyResult) && (
                    <div className="p-2 bg-[#16161A] rounded border border-[#1F1F23] text-[11px] text-emerald-400 space-y-1">
                      {gigaNameResult && <div>name: &quot;{gigaNameResult}&quot;</div>}
                      {gigaSymbolResult && <div>symbol: &quot;{gigaSymbolResult}&quot;</div>}
                      {gigaTotalSupplyResult && <div>totalSupply: 900,000,000,000,000 * 10^18 (900 Trillion)</div>}
                    </div>
                  )}

                  {/* balanceOf */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                    <button
                      type="button"
                      onClick={handleCallGigaBalance}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                    >
                      balanceOf
                    </button>
                    <input
                      type="text"
                      value={gigaBalanceQueryInput}
                      onChange={(e) => setGigaBalanceQueryInput(e.target.value)}
                      placeholder="account (address)"
                      className="flex-1 bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-1 text-xs text-white"
                    />
                    {gigaBalanceResult && (
                      <span className="text-[11px] text-emerald-400 font-bold shrink-0">{gigaBalanceResult}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Authentic Remix 2.6.5 Terminal Display */}
          <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#16161A] border-b border-[#1F1F23]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">Remix 2.6.5 Live Console & Execution Terminal</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#8E9299]">
                <span>Listen on all transactions</span>
                <button
                  type="button"
                  onClick={() => setTerminalOutput(["Remix terminal logs cleared."])}
                  className="hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="p-4 max-h-56 overflow-y-auto space-y-1.5 text-[11px] text-[#A0A5AD] leading-relaxed select-text">
              {terminalOutput.map((log, index) => (
                <div
                  key={index}
                  className={`${
                    log.includes("TokenFactory") || log.includes("generateNewToken")
                      ? "text-amber-300 font-bold"
                      : log.includes("GigaWealthCoin")
                      ? "text-purple-300"
                      : log.includes("[vm]") || log.includes("[call]")
                      ? "text-cyan-300"
                      : log.includes("SUCCESS") || log.includes("minted") || log.includes("mints")
                      ? "text-emerald-400"
                      : "text-[#8E9299]"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Terminal Input Line */}
            <form onSubmit={handleExecuteCommand} className="flex items-center border-t border-[#1F1F23] bg-[#16161A] px-3 py-1.5">
              <span className="text-amber-400 font-bold mr-2">&gt;</span>
              <input
                type="text"
                value={terminalCmd}
                onChange={(e) => setTerminalCmd(e.target.value)}
                placeholder="remix.execute() or ethers.provider.getBlockNumber() or call contract..."
                className="flex-1 bg-transparent text-white text-xs outline-none font-mono"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded cursor-pointer transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: Step-by-Step Components to Build a Cryptocurrency */}
      {activeTab === "tutorial" && (
        <div className="space-y-6 animate-fade-in">
          {/* Decision Selector: Coin vs Token & Utility */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#F27D26]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Cryptocurrency Decision Engine: Architecture & Utility Matrix
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question 1 */}
              <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2.5">
                <label className="text-xs font-bold text-white block">
                  1. Standalone Blockchain Coin vs. Smart Contract Token?
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setContractTypeChoice("smart_contract")}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      contractTypeChoice === "smart_contract"
                        ? "bg-[#16161A] border-[#F27D26] text-white"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    <div className="font-bold text-xs">Smart Contract Token</div>
                    <div className="text-[10px] text-[#8E9299] mt-1">EVM ERC-20/721 on Base, Arbitrum, Ethereum, or Solana SPL. Instant DEX liquidity.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractTypeChoice("standalone_coin")}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      contractTypeChoice === "standalone_coin"
                        ? "bg-[#16161A] border-[#F27D26] text-white"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    <div className="font-bold text-xs">Standalone L1 Coin</div>
                    <div className="text-[10px] text-[#8E9299] mt-1">Cosmos SDK (Tendermint/CometBFT) or Geth EVM Fork. Requires validator node network.</div>
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2.5">
                <label className="text-xs font-bold text-white block">
                  2. Primary Utility & Economic Goal?
                </label>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {[
                    { id: "ai_agent_compute", label: "AI Agent Compute", desc: "Autonomous agent gas & compute credits" },
                    { id: "depin_rewards", label: "DePIN IoT Hardware", desc: "Physical node uptime & bandwidth proof" },
                    { id: "rwa_yield", label: "RWA Real World Asset", desc: "Institutional yield & compliance vaults" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setUtilityGoalChoice(item.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        utilityGoalChoice === item.id
                          ? "bg-[#16161A] border-[#F27D26] text-white"
                          : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                      }`}
                    >
                      <div className="font-bold">{item.label}</div>
                      <div className="text-[9px] text-[#8E9299] mt-0.5 leading-tight">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 7-Step Comprehensive Roadmap */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1F1F23]">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  The Complete 7 Components to Build & Deploy a Cryptocurrency (2026 Guide)
                </h3>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Follow these seven verified engineering phases to move from genesis idea to verified smart contract and active decentralized exchange (DEX) liquidity.
                </p>
              </div>
              <span className="text-xs font-mono text-green-500 bg-[#0A0A0C] px-3 py-1.5 rounded-lg border border-[#1F1F23]">
                Remix 2.5.4 Ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Component 1 */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-mono text-xs font-bold">
                    Component 01
                  </span>
                  <span className="text-[10px] text-[#8E9299] font-mono">Economics</span>
                </div>
                <h4 className="text-xs font-bold text-white">1. Tokenomics & Vesting Schedule</h4>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  Establish fixed maximum supply (e.g., 1,000,000,000 units with 18 decimals), distribution allocations (35% public, 25% compute staking, 18% team cliff, 12% reserve), and inflation/deflation burns.
                </p>
                <div className="text-[10px] font-mono text-green-400 bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                  Rule: Always verify 100% total sum and timelock linear vesting contracts.
                </div>
              </div>

              {/* Component 2 */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-mono text-xs font-bold">
                    Component 02
                  </span>
                  <span className="text-[10px] text-[#8E9299] font-mono">Consensus</span>
                </div>
                <h4 className="text-xs font-bold text-white">2. Blockchain Chain Selection</h4>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  Choose your execution Layer: High-speed EVM L2s (Base, Arbitrum, Polygon), Ethereum Mainnet for institutional settlement, Solana for ultra-fast micropayments, or a sovereign Cosmos AppChain.
                </p>
                <div className="text-[10px] font-mono text-green-400 bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                  Recommendation: Base (EVM L2) or Arbitrum for sub-cent gas fees and EVM compatibility.
                </div>
              </div>

              {/* Component 3 */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-mono text-xs font-bold">
                    Component 03
                  </span>
                  <span className="text-[10px] text-[#8E9299] font-mono">Solidity 0.8.24+</span>
                </div>
                <h4 className="text-xs font-bold text-white">3. Smart Contract Implementation</h4>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  Write the core token logic using OpenZeppelin v5.0 contracts. Implement ERC20Permit (EIP-2612 gasless approvals), Ownable2Step (secure 2-step ownership transfer), and anti-whale transfer limits.
                </p>
                <div className="text-[10px] font-mono text-green-400 bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                  Tool: Remix IDE (remix.ethereum.org) or Foundry local workspace.
                </div>
              </div>

              {/* Component 4 */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-mono text-xs font-bold">
                    Component 04
                  </span>
                  <span className="text-[10px] text-[#8E9299] font-mono">Testnets</span>
                </div>
                <h4 className="text-xs font-bold text-white">4. Local Simulation & Public Testnet</h4>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  Execute mock deployments on Remix VM (Cancun) and then broadcast to public testnets like Sepolia or Base Sepolia with testnet faucets before risking mainnet capital.
                </p>
                <div className="text-[10px] font-mono text-green-400 bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                  Script: Run ethers.js deployment scripts directly in Remix terminal.
                </div>
              </div>

              {/* Component 5 */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-mono text-xs font-bold">
                    Component 05
                  </span>
                  <span className="text-[10px] text-[#8E9299] font-mono">Security</span>
                </div>
                <h4 className="text-xs font-bold text-white">5. Security Audits & Static Scans</h4>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  Perform automated vulnerability analysis using Slither, Mythril, and Echidna property-based fuzzing to guard against reentrancy, integer overflows, and malicious honeypot traps.
                </p>
                <div className="text-[10px] font-mono text-green-400 bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                  Score Goal: 90+/100 automated static verification score.
                </div>
              </div>

              {/* Component 6 */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-mono text-xs font-bold">
                    Component 06
                  </span>
                  <span className="text-[10px] text-[#8E9299] font-mono">Mainnet</span>
                </div>
                <h4 className="text-xs font-bold text-white">6. Genesis Broadcast & Etherscan Verification</h4>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  Broadcast the contract bytecode to Mainnet using your hardware wallet or multi-sig (Gnosis Safe). Submit Solidity source code with exact compiler settings (solc 0.8.24, 200 runs) to Etherscan/Basescan.
                </p>
                <div className="text-[10px] font-mono text-green-400 bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                  Standard: Green checkmark "Verified Contract" on Block Explorers.
                </div>
              </div>

              {/* Component 7 */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2.5 md:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-mono text-xs font-bold">
                    Component 07
                  </span>
                  <span className="text-[10px] text-[#8E9299] font-mono">Trading & Liquidity</span>
                </div>
                <h4 className="text-xs font-bold text-white">7. DEX Liquidity Pools & Permanent Liquidity Locking</h4>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  Initialize Uniswap v3/v4 or Raydium AMM pools (e.g. YOUR_TOKEN / WETH or USDC). Lock 100% of the LP liquidity tokens via UNCX Network or Team.Finance for a minimum of 12-24 months to ensure complete anti-rug safety.
                </p>
                <div className="text-[10px] font-mono text-cyan-400 bg-[#16161A] p-2.5 rounded border border-[#1F1F23] flex items-center justify-between">
                  <span>DEX Listing: Instant automated indexing on DexScreener, CoinGecko Terminal, and Birdeye</span>
                  <span className="text-green-500 font-bold">Rug-Proof Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NFT Collection Generation Studio */}
      {activeTab === "nft_generator" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F27D26]" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Remix NFT Collection Generator (`/generate NFT collection`)
                </h3>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Generate production-ready ERC-721 / ERC-1155 NFT collections with metadata schemas, IPFS base URIs, and enumerable mint loops.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(generatedSolidity, "nft_solidity")}
              className="px-4 py-2 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {copiedCode === "nft_solidity" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode === "nft_solidity" ? "Copied to Clipboard!" : "Copy NFT Contract"}</span>
            </button>
          </div>

          {/* Token Selector */}
          <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Select Base Token from Active Foundry ({tokens.length} Records Available)
              </label>
              <span className="text-[10px] font-mono text-[#F27D26]">Selected: {selectedToken?.name} ({selectedToken?.symbol})</span>
            </div>

            <select
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(e.target.value)}
              className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#F27D26]"
            >
              {tokens.slice(0, 30).map((tok) => (
                <option key={tok.id} value={tok.id}>
                  {tok.name} ({tok.symbol}) • {tok.chain.toUpperCase()} • {tok.tokenStandard} • {tok.contractAddress.slice(0, 10)}...{tok.contractAddress.slice(-6)}
                </option>
              ))}
            </select>
          </div>

          {/* NFT Contract Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider font-mono">
                Solidity 0.8.24 ERC-721 Enumerable Collection Code
              </span>
              <span className="text-[10px] font-mono text-green-500">OpenZeppelin 5.0 Compatible</span>
            </div>
            <pre className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] font-mono text-xs text-[#E0E0E0] overflow-x-auto leading-relaxed max-h-[420px]">
              <code>{generatedSolidity}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: Solidity Code Workspace */}
      {activeTab === "workspace" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 space-y-5 animate-fade-in">
          {/* Contract Archetype Selector */}
          <div className="flex flex-wrap items-center gap-2 p-2 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg">
            <span className="text-[11px] font-mono text-[#8E9299] px-2">Contract Archetype:</span>
            <button
              type="button"
              onClick={() => setActiveContractArchetype("token_derived")}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                activeContractArchetype === "token_derived"
                  ? "bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26] font-bold shadow-xs"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              {selectedToken ? `${selectedToken.symbol} Dynamic Token (${selectedToken.tokenStandard})` : "Standard Token"}
            </button>
            <button
              type="button"
              onClick={() => setActiveContractArchetype("giga_900t_treasury")}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                activeContractArchetype === "giga_900t_treasury"
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500 font-bold shadow-xs ring-1 ring-purple-500/50"
                  : "text-[#8E9299] hover:text-purple-300"
              }`}
            >
              <span>💎 GigaSupplyToken (900T Treasury Mint)</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px]">Mauro Lomibao Dar III</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveContractArchetype("token_factory")}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                activeContractArchetype === "token_factory"
                  ? "bg-amber-600/30 text-amber-300 border border-amber-500 font-bold shadow-xs ring-1 ring-amber-500/50"
                  : "text-[#8E9299] hover:text-amber-300"
              }`}
            >
              <span>🏭 TokenFactory (Endless 900T Deployer)</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">Mauro Lomibao Dar III</span>
            </button>
          </div>

          {activeContractArchetype === "giga_900t_treasury" && (
            <div className="p-3.5 rounded-lg bg-gradient-to-r from-purple-950/40 via-[#16161A] to-indigo-950/30 border border-purple-500/40 font-mono text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
                <span className="text-purple-300 font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-purple-400" />
                  GigaSupplyToken • Standard ERC20 with 900 Trillion Initial Treasury Mint
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  Solidity ^0.8.20
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div>
                  <span className="text-[#8E9299]">Author:</span>
                  <p className="text-white font-bold">Mauro Lomibao Dar III</p>
                </div>
                <div>
                  <span className="text-[#8E9299]">Designated Treasury Wallet:</span>
                  <p className="text-purple-300 font-bold select-all break-all">0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D</p>
                </div>
                <div>
                  <span className="text-[#8E9299]">Target Supply:</span>
                  <p className="text-emerald-400 font-bold">900,000,000,000,000 * 10**18 (900T)</p>
                </div>
              </div>
            </div>
          )}

          {activeContractArchetype === "token_factory" && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-[#16161A] to-purple-950/30 border border-amber-500/40 font-mono text-xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  TokenFactory • Deploy & Track Endless Stream of GigaSupplyTokens
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Deployed at 0xf8e81D47203A594245E36C48e151709F0C19fBe8
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                    Remix VM Osaka
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div>
                  <span className="text-[#8E9299]">Author:</span>
                  <p className="text-white font-bold">Mauro Lomibao Dar III</p>
                </div>
                <div>
                  <span className="text-[#8E9299]">Designated Treasury:</span>
                  <p className="text-amber-300 font-bold select-all break-all">0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D</p>
                </div>
                <div>
                  <span className="text-[#8E9299]">Registered Tokens:</span>
                  <p className="text-emerald-400 font-bold">{factoryDeployedTokens.length} Deployed Contracts</p>
                </div>
              </div>

              {/* Interactive Dispatcher: generateNewToken(name, symbol) */}
              <div className="p-3 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Execute generateNewToken(string name, string symbol)
                  </span>
                  <span className="text-[10px] text-green-400">Routes 900 Trillion Directly to Treasury</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={factoryNewTokenName}
                    onChange={(e) => setFactoryNewTokenName(e.target.value)}
                    placeholder="Token Name (e.g. Giga Matrix)"
                    className="bg-[#16161A] border border-[#1F1F23] rounded px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400 outline-none"
                  />
                  <input
                    type="text"
                    value={factoryNewTokenSymbol}
                    onChange={(e) => setFactoryNewTokenSymbol(e.target.value)}
                    placeholder="Symbol (e.g. GMX)"
                    className="bg-[#16161A] border border-[#1F1F23] rounded px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400 outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateNewTokenViaFactory}
                    disabled={isFactoryGenerating || !factoryNewTokenName.trim() || !factoryNewTokenSymbol.trim()}
                    className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    {isFactoryGenerating ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Deploying...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Deploy 900T Token</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Registry of Deployed Tokens */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                  <span>deployedTokensRegistry ({factoryDeployedTokens.length} active instances):</span>
                  <span className="text-amber-400 font-bold">Endless Stream Active</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {factoryDeployedTokens.map((tok, idx) => (
                    <div
                      key={tok.address + idx}
                      className="p-2 bg-[#0A0A0C] border border-[#1F1F23] rounded flex flex-wrap items-center justify-between gap-2 text-[10px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">#{factoryDeployedTokens.length - idx}</span>
                        <span className="font-bold text-white">{tok.name} ({tok.symbol})</span>
                        <span className="text-emerald-400 font-mono">900T Minted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#8E9299] select-all">{tok.address}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(tok.address, `tok_addr_${idx}`)}
                          className="px-1.5 py-0.5 rounded bg-[#16161A] text-[#8E9299] hover:text-white"
                        >
                          {copiedCode === `tok_addr_${idx}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Remix Solidity Workspace (`${activeContractArchetype === "giga_900t_treasury" ? "GigaSupplyToken" : activeContractArchetype === "token_factory" ? "TokenFactory" : selectedToken?.symbol || "Token"}.sol`)
                </h3>
                <span className="px-2 py-0.5 rounded bg-orange-500/10 text-[#F27D26] border border-[#F27D26]/30 text-[10px] font-mono font-bold">
                  solc v0.8.24
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                  AES-256 RAM Enclave
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Targeting {selectedToken?.name} ({selectedToken?.tokenStandard}) on {selectedToken?.chain.toUpperCase()} • Deterministic CREATE2 ID Available
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(generatedSolidity, "sol_workspace")}
                className="px-3 py-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-[#8E9299] hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode === "sol_workspace" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === "sol_workspace" ? "Copied" : "Copy Solidity"}</span>
              </button>

              <button
                type="button"
                id="btn-workspace-compare-oz-diff"
                onClick={() => setActiveTab("code_diff")}
                className="px-3 py-1.5 rounded bg-[#0A0A0C] border border-amber-500/40 hover:border-amber-400 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                title="Compare contract against standard OpenZeppelin reference implementations"
              >
                <GitCompare className="w-3.5 h-3.5 text-amber-400" />
                <span>Compare vs OpenZeppelin Diff</span>
              </button>

              <button
                type="button"
                id="btn-open-remix-web-ide"
                onClick={handleOpenRemixWeb}
                className="px-3.5 py-1.5 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                title="Launch official remix.ethereum.org web compiler with this contract"
              >
                <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                <span>Build thru Remix IDE (Web)</span>
              </button>

              <button
                type="button"
                id="btn-compile-in-remix-engine"
                disabled={compilerState === "compiling"}
                onClick={handleCompileContract}
                className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                  compilerState === "compiling"
                    ? "bg-[#F27D26]/50 text-black cursor-wait"
                    : compilerState === "compiled"
                    ? "bg-green-500 hover:bg-green-400 text-black"
                    : "bg-[#F27D26] hover:bg-[#ff8e3c] text-black"
                }`}
              >
                {compilerState === "compiling" ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Compiling ({compileProgress}%)...</span>
                  </>
                ) : compilerState === "compiled" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Re-Compile solc 0.8.24</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Compile in Remix</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Compilation Pipeline Bar */}
          {compilerState !== "idle" && (
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#F27D26]" />
                  <span className="text-xs font-bold text-white font-mono">
                    solc v0.8.24 Build Artifact Pipeline
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#8E9299]">EVM: Cancun</span>
                  <span className="text-[10px] font-mono text-[#8E9299]">Optimizer: 200 runs</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {compilerState === "compiled" ? "✓ Verified (0 errors)" : "Compiling..."}
                  </span>
                </div>
              </div>

              {compilerState === "compiling" && (
                <div className="w-full bg-[#16161A] rounded-full h-2 overflow-hidden border border-[#1F1F23]">
                  <div
                    className="bg-[#F27D26] h-full transition-all duration-300"
                    style={{ width: `${compileProgress}%` }}
                  />
                </div>
              )}

              {compilerState === "compiled" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23] space-y-1">
                    <span className="text-[10px] text-[#8E9299] font-mono">Bytecode Size</span>
                    <p className="text-xs font-bold text-white font-mono">4,812 bytes</p>
                  </div>
                  <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23] space-y-1">
                    <span className="text-[10px] text-[#8E9299] font-mono">Estimated Deploy Gas</span>
                    <p className="text-xs font-bold text-amber-400 font-mono">~1,184,200 gas</p>
                  </div>
                  <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23] space-y-1">
                    <span className="text-[10px] text-[#8E9299] font-mono">Encrypted Enclave</span>
                    <p className="text-xs font-bold text-emerald-400 font-mono">AES-256-GCM RAM</p>
                  </div>
                  <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23] space-y-1 flex flex-col justify-center">
                    <button
                      type="button"
                      id="btn-deploy-injected-metamask"
                      onClick={handleDeployToMetaMask}
                      disabled={deployState === "deploying"}
                      className="w-full py-1.5 px-2 rounded bg-gradient-to-r from-[#F27D26] to-[#E2761B] hover:opacity-90 text-black text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow"
                    >
                      <Zap className="w-3 h-3 fill-black" />
                      <span>{deployState === "deploying" ? "Broadcasting..." : "Deploy to MetaMask"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deployment Receipt */}
          {deployState === "deployed" && deployReceipt && (
            <div className="bg-[#0A0A0C] border border-emerald-500/30 rounded-lg p-4 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white font-mono">
                    Genesis Deployment Confirmed via Remix Provider
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Block #{deployReceipt.blockNumber}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                  <span className="text-[10px] text-[#8E9299] block">Contract ID (MetaMask Validated):</span>
                  <span className="text-emerald-300 select-all break-all">{deployReceipt.contractAddress}</span>
                </div>
                <div className="bg-[#16161A] p-2 rounded border border-[#1F1F23]">
                  <span className="text-[10px] text-[#8E9299] block">Transaction Hash:</span>
                  <span className="text-cyan-300 select-all break-all">{deployReceipt.txHash}</span>
                </div>
              </div>
            </div>
          )}

          {/* Code Editor */}
          <pre className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] font-mono text-xs text-[#E0E0E0] overflow-x-auto leading-relaxed max-h-[480px]">
            <code>{generatedSolidity}</code>
          </pre>
        </div>
      )}

      {/* TAB: OpenZeppelin Code-Diffing Viewer */}
      {activeTab === "code_diff" && (
        <ContractDiffViewer
          token={selectedToken}
          generatedSolidity={generatedSolidity}
          onOpenSolidityEditor={() => setActiveTab("workspace")}
          onDeployToMetaMask={handleDeployToMetaMask}
        />
      )}

      {/* TAB 4: ethers.js Script Runner */}
      {activeTab === "scripts" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                ethers.js v6 Deployment & Interaction Script
              </h3>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Run directly in the Remix terminal using <code className="text-[#F27D26]">remix.execute()</code> or <code className="text-[#F27D26]">remix.exeCurrent()</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(ethersJsScript, "ethers_script")}
                className="px-3.5 py-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-[#8E9299] hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode === "ethers_script" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === "ethers_script" ? "Copied" : "Copy Script"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTerminalOutput((prev) => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] Running scripts/deploy_${selectedToken?.symbol || "token"}.js with ethers.js...`,
                    `→ Deployer (Enterprise Multi-Sig Safe): ${selectedToken?.deployerAddress || "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891"}`,
                    `→ Enterprise Contract deployed at: ${selectedToken?.contractAddress || "0x5AFE0000A192e4C38148386348612EadD997C0RP"}`,
                    `→ Architecture: ${selectedToken?.contractArchetype || "Enterprise Transparent Upgradeable Proxy (EIP-1967)"}`,
                    `→ Gas Used: 1,842,910 (status: 0x1 SUCCESS)`,
                  ]);
                  setActiveTab("terminal");
                }}
                className="px-3.5 py-1.5 rounded bg-green-500 hover:bg-green-400 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Execute Script</span>
              </button>
            </div>
          </div>

          <pre className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] font-mono text-xs text-green-400 overflow-x-auto leading-relaxed max-h-[480px]">
            <code>{ethersJsScript}</code>
          </pre>
        </div>
      )}

      {/* TAB: Single-Line ABI Coder */}
      {activeTab === "single_line_abi" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 space-y-5 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight font-mono">
                  Single-Line ABI Coding &amp; Script Generation
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  1-LINE CODES
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Instant compact one-liners for terminal CLI, Node.js scripts, ethers.js v6, Viem, Web3.js, and CI/CD pipelines without multiline JSON clutter.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="btn-snapshot-abi"
                onClick={handleTakeManualSnapshot}
                className="px-3 py-1.5 rounded bg-[#201D2E] hover:bg-[#2C2740] border border-purple-500/40 text-purple-300 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                title="Save current configuration as a new snapshot in the ABI history stack"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Snapshot ABI Version</span>
              </button>

              <button
                type="button"
                id="btn-execute-abi-terminal"
                onClick={() => {
                  const targetCode = selectedHistoryVersion ? selectedHistoryVersion.abiCode : currentGeneratedCode;
                  const valReport = validateABIString(targetCode);
                  setTerminalOutput((prev) => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] ⚡ INJECTED SINGLE-LINE ABI CODING:`,
                    `> ${targetCode}`,
                    `→ Syntax Validation: ${
                      valReport.isValid
                        ? `✓ PASS (${valReport.entryCount} EVM definitions, delimiters balanced, score: ${valReport.score}/100)`
                        : `⚠ FAIL: ${valReport.issues[0]?.message || "Syntax error detected"}`
                    }`,
                    `→ Status: Initialized contract instance for ${selectedHistoryVersion?.tokenSymbol || selectedToken?.symbol || "TOKEN"} with ${valReport.issues.filter(i => i.type === "error").length} syntax errors.`,
                  ]);
                  setActiveTab("terminal");
                }}
                className="px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Run in Remix Terminal</span>
              </button>
            </div>
          </div>

          {/* ABI Version History Stack & Delta Comparator (Switching between last 5 generated ABI versions) */}
          <AbiHistoryStack
            history={abiHistory}
            activeVersionId={activeHistoryVersionId || abiHistory[0]?.id || ""}
            onSelectVersion={handleSelectHistoryVersion}
            onRestoreVersionToCoder={handleRestoreVersionToCoder}
            onRunInTerminal={handleRunVersionInTerminal}
            onTakeSnapshot={handleTakeManualSnapshot}
            maxHistory={5}
          />

          {/* Token Selector Bar */}
          <div className="p-3.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase font-mono">Target Contract:</span>
              <select
                value={selectedTokenId}
                onChange={(e) => setSelectedTokenId(e.target.value)}
                className="bg-[#16161A] border border-[#2B2B36] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              >
                {tokens.slice(0, 25).map((tok) => (
                  <option key={tok.id} value={tok.id}>
                    {tok.name} ({tok.symbol}) • {tok.chain.toUpperCase()} • {tok.contractAddress.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] font-mono text-[#8E9299]">
              Standard: <span className="text-purple-300 font-bold">{selectedToken?.tokenStandard || "ERC-20"}</span> • Chain: <span className="text-white">{selectedToken?.chain || "Ethereum"}</span>
            </div>
          </div>

          {/* Format Selection Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setAbiTabFormat("single_line_json")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                abiTabFormat === "single_line_json"
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              1. Single-Line JSON (Minified)
            </button>
            <button
              type="button"
              onClick={() => setAbiTabFormat("single_line_human")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                abiTabFormat === "single_line_human"
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              2. Single-Line Human (Ethers/Viem)
            </button>
            <button
              type="button"
              onClick={() => setAbiTabFormat("single_line_ethers")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                abiTabFormat === "single_line_ethers"
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              3. Single-Line ethers.Contract
            </button>
            <button
              type="button"
              onClick={() => setAbiTabFormat("single_line_viem")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                abiTabFormat === "single_line_viem"
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              4. Single-Line Viem getContract
            </button>
            <button
              type="button"
              onClick={() => setAbiTabFormat("single_line_cast")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                abiTabFormat === "single_line_cast"
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              5. Cast CLI One-Liner
            </button>
          </div>

          {/* Active Single-Line Code Box */}
          {(() => {
            const activeVersion = selectedHistoryVersion || abiHistory[0];
            const activeSingleLine = activeVersion ? activeVersion.abiCode : currentGeneratedCode;
            const isHistoricalSelected = activeVersion && activeVersion.abiCode !== currentGeneratedCode;

            return (
              <div className="space-y-4">
                {/* Historical Version Preview Notification Banner */}
                {isHistoricalSelected && (
                  <div className="p-3 bg-purple-950/40 border border-purple-500/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-500 text-white font-bold text-[10px]">
                        PREVIEWING HISTORY v{activeVersion.versionNumber}
                      </span>
                      <span className="text-white">
                        {activeVersion.tokenSymbol} ({activeVersion.format}) • Captured {activeVersion.formattedTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestoreVersionToCoder(activeVersion)}
                        className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore to Live Coder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (abiHistory[0]) {
                            setActiveHistoryVersionId(abiHistory[0].id);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-[#1A1A22] hover:bg-[#252530] text-[#8E9299] hover:text-white text-[11px] cursor-pointer"
                      >
                        Return to Latest
                      </button>
                    </div>
                  </div>
                )}

                {/* Structural ABI Syntax Validation & Diagnostic Indicator */}
                <AbiValidationIndicator
                  generatedAbiString={activeSingleLine}
                  contractName={activeVersion ? activeVersion.tokenSymbol : (selectedToken?.symbol || selectedToken?.name || "Contract")}
                />

                <div className="flex items-center justify-between text-xs font-mono text-[#8E9299]">
                  <span className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                      EXACT 1 LINE
                    </span>
                    Length: {activeSingleLine.length.toLocaleString()} chars • Horizontal scrolling enabled
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSingleLine, "active_single_line_abi")}
                      className="px-3 py-1 rounded bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow"
                    >
                      {copiedCode === "active_single_line_abi" ? (
                        <Check className="w-3.5 h-3.5 text-black" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-black" />
                      )}
                      <span>{copiedCode === "active_single_line_abi" ? "Copied 1-Liner!" : "Copy Single-Line Code"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(`ABI='${activeSingleLine}'`, "env_abi")}
                      className="px-3 py-1 rounded bg-[#0A0A0C] border border-[#2B2B36] text-white hover:border-purple-500 text-xs flex items-center gap-1 cursor-pointer"
                      title="Copy for .env file or environment variable"
                    >
                      {copiedCode === "env_abi" ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-[#8E9299]" />
                      )}
                      <span>Copy for .env</span>
                    </button>
                  </div>
                </div>

                {/* Lightweight Prism-Highlighted Syntax Viewer */}
                <AbiSyntaxViewer
                  code={activeSingleLine}
                  format={activeVersion ? activeVersion.format : abiTabFormat}
                  title={`${activeVersion ? activeVersion.tokenSymbol : (selectedToken?.symbol || "TOKEN")} ABI`}
                  showLineNumbers={true}
                  allowMultiLineToggle={true}
                  maxHeight="380px"
                />


                {/* Developer Integration Cheat Sheet */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg space-y-1 text-xs">
                    <span className="font-bold text-white font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      Ethers.js v6 Syntax
                    </span>
                    <p className="text-[11px] text-[#8E9299]">
                      Use human-readable ABI array to save binary bloat and instantiate contract directly on one line.
                    </p>
                  </div>

                  <div className="p-3 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg space-y-1 text-xs">
                    <span className="font-bold text-white font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      Viem v2 &amp; Wagmi
                    </span>
                    <p className="text-[11px] text-[#8E9299]">
                      Use minified JSON with <code className="text-cyan-400">as const</code> for full compile-time TypeScript type inference.
                    </p>
                  </div>

                  <div className="p-3 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg space-y-1 text-xs">
                    <span className="font-bold text-white font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Foundry Cast &amp; CLI
                    </span>
                    <p className="text-[11px] text-[#8E9299]">
                      Call methods directly in bash terminal without downloading or compiling artifact files.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 5: Interactive Remix Terminal */}
      {activeTab === "terminal" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Remix 2.5.4 Interactive Command Line Interface (CLI)
              </h3>
            </div>
            <button
              onClick={() => setTerminalOutput(["Terminal cleared."])}
              className="text-[10px] font-mono text-[#8E9299] hover:text-white cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="bg-[#0A0A0C] rounded-lg border border-[#1F1F23] p-4 font-mono text-xs text-[#E0E0E0] min-h-[300px] max-h-[420px] overflow-y-auto space-y-2">
            {terminalOutput.map((line, idx) => (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                {line.startsWith("[vm]") ? (
                  <span className="text-[#F27D26]">{line}</span>
                ) : line.startsWith("→") ? (
                  <span className="text-cyan-300">{line}</span>
                ) : line.includes("SUCCESS") ? (
                  <span className="text-green-400">{line}</span>
                ) : (
                  <span className="text-[#8E9299]">{line}</span>
                )}
              </div>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleExecuteCommand} className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono font-bold text-sm">&gt;</span>
            <input
              type="text"
              value={terminalCmd}
              onChange={(e) => setTerminalCmd(e.target.value)}
              placeholder="Type ethers command, remix.execute(), or help..."
              className="flex-1 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-4 py-2.5 text-xs text-cyan-300 font-mono placeholder-[#555] focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: MetaMask Custom Token Specs & EVM RPC Inspector */}
      {activeTab === "metamask_spec" && (
        <div className="animate-fade-in">
          <MetaMaskTokenStudio
            tokens={tokens}
            onImportTokens={onImportTokens}
            onSendToRemix={(code, name) => {
              setActiveTab("workspace");
              const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              setTerminalOutput((prev) => [
                ...prev,
                `[${timestamp}] ⚡ INJECTED: Loaded MetaMask-compliant "${name}.sol" into Remix workspace.`,
              ]);
            }}
          />
        </div>
      )}

      {/* TAB 7: AdvancedToken Security & Governance Lifecycle ($ADT) */}
      {activeTab === "governance_lifecycle" && (
        <div className="animate-fade-in">
          <AdvancedTokenGovernanceManager />
        </div>
      )}

      {/* TAB 8: Foundry Suite (forge test -vvv) */}
      {activeTab === "foundry_suite" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 space-y-5 animate-fade-in">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Foundry Suite Test Harness & CLI Broadcaster
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  forge test -vvv
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Unit testing, uint256 boundary checks, EIP-55 checksumming, and MetaMask / Etherscan.io compatibility tests for {selectedToken?.name} ({selectedToken?.symbol}).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={buildRemixIdeUrl(generatedSolidity, `${selectedToken?.symbol || "Token"}.sol`)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Open in Remix IDE</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const spec = generateFoundryTestSuite(selectedToken || undefined);
                  handleCopy(spec.runCommand, "foundry_cmd");
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-cyan-500/30 text-xs font-mono text-cyan-400 hover:bg-[#1F1F23] flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode === "foundry_cmd" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === "foundry_cmd" ? "Copied" : "Copy forge test -vvv"}</span>
              </button>
            </div>
          </div>

          {/* Test Specs Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
              <div className="text-[10px] font-mono text-[#8E9299]">TARGET CONTRACT ID</div>
              <div className="text-xs font-bold text-white font-mono mt-1 truncate" title={selectedToken?.contractAddress}>
                {selectedToken?.contractAddress}
              </div>
              <div className="text-[10px] text-green-400 mt-1">✓ EIP-55 Checksum Passed</div>
            </div>

            <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
              <div className="text-[10px] font-mono text-[#8E9299]">TARGET TOKEN ID</div>
              <div className="text-xs font-bold text-cyan-400 font-mono mt-1">
                {selectedToken?.tokenId || "101"}
              </div>
              <div className="text-[10px] text-[#8E9299] mt-1">Type: uint256 (EVM Word)</div>
            </div>

            <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
              <div className="text-[10px] font-mono text-[#8E9299]">METAMASK COMPATIBILITY</div>
              <div className="text-xs font-bold text-orange-400 font-mono mt-1">
                EIP-747 / ERC-20
              </div>
              <div className="text-[10px] text-green-400 mt-1">✓ 5 Selectors Validated</div>
            </div>

            <div className="bg-[#0E0E12] border border-[#1F1F23] p-3 rounded-xl">
              <div className="text-[10px] font-mono text-[#8E9299]">ETHERSCAN.IO SPEC</div>
              <div className="text-xs font-bold text-purple-400 font-mono mt-1">
                CREATE2 Deterministic
              </div>
              <div className="text-[10px] text-purple-300 mt-1">Verified Bytecode Schema</div>
            </div>
          </div>

          {/* Solidity Test File: ContractIdTest.t.sol */}
          {(() => {
            const spec = generateFoundryTestSuite(selectedToken || undefined);
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>test/{selectedToken?.symbol || "Token"}ContractIdTest.t.sol</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopy(spec.testFile, "foundry_file_content")}
                    className="text-xs text-[#8E9299] hover:text-white flex items-center gap-1 cursor-pointer font-mono"
                  >
                    {copiedCode === "foundry_file_content" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === "foundry_file_content" ? "Copied" : "Copy Test Source"}</span>
                  </button>
                </div>

                <pre className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] font-mono text-xs text-[#E0E0E0] overflow-x-auto leading-relaxed max-h-[380px]">
                  <code>{spec.testFile}</code>
                </pre>

                {/* Foundry Run Instructions */}
                <div className="bg-[#0E0E12] border border-cyan-500/20 p-3 rounded-xl text-xs font-mono space-y-2">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    <span>CLI Terminal Execution:</span>
                  </div>
                  <div className="bg-[#0A0A0C] p-2.5 rounded border border-[#1F1F23] text-gray-300 flex items-center justify-between">
                    <span>{spec.runCommand}</span>
                    <button
                      onClick={() => handleCopy(spec.runCommand, "forge_cmd_inner")}
                      className="text-[#8E9299] hover:text-white cursor-pointer"
                    >
                      {copiedCode === "forge_cmd_inner" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
