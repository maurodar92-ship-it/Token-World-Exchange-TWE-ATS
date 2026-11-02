import { useState, useMemo, useRef } from "react";
import { TokenRecord, GeneratedTokenomics } from "../types";
import { CHAIN_METADATA, CHAIN_NETWORK_MAP, NARRATIVE_METADATA_POOLS } from "../utils/marketData";
import { getCategoricalTagMeta } from "../utils/tokenTaggingEngine";
import { ChainIcon } from "./ChainIcon";
import { TokenImage } from "./TokenImage";
import { StreamContractArtifactModal } from "./StreamContractArtifactModal";
import {
  generateStreamABI,
  generateSingleLineJsonABI,
  generateSingleLineHumanReadableABI,
  generateSingleLineEthersContractCode,
  generateSingleLineCastCall,
  generateFullStreamArtifactPackage,
} from "../utils/contractArtifactGenerator";
import {
  getEtherscanVerificationUrl,
  encodeEtherscanConstructorArgs,
} from "../utils/etherscanBatchVerifier";
import {
  generateTokenNFTMetadata,
  computeSimulatedDeploymentStats,
} from "../utils/nftMetadataGenerator";
import {
  buildDotEnvConfig,
  buildCastKeystoreCommand,
  buildForgeDeployScriptCommand,
  DEFAULT_RPC_URLS,
  generateDeployerPrivateKey,
  PROTOCOL_TREASURY_ADDRESS,
  BASE_CHAIN_ID,
  BASE_TREASURY_ADDRESS,
  POLYGON_CHAIN_ID,
  POLYGON_TREASURY_ADDRESS,
  SOLANA_MULTISIG_TREASURY,
} from "../utils/cryptoGenerators";
import {
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  FileCode2,
  FileJson,
  Cpu,
  Layers,
  TrendingUp,
  Activity,
  Terminal,
  Gauge,
  CheckCircle2,
  Database,
  Shield,
  Scale,
  Calculator,
  Code2,
  Eye,
  EyeOff,
  Key,
  Lock,
  FileDown,
  ArrowRight,
  Smartphone,
  Globe,
  Zap,
  CopyPlus,
  History,
  Rocket,
  Clock,
  AlertTriangle,
  Play,
  RefreshCw,
  ArrowDownUp,
  Binary,
  FileText,
  HelpCircle,
  Info,
  Search,
  Music,
  Volume2,
  Pause,
  Radio,
  Waves,
} from "lucide-react";
import { METAMASK_IERC20_SOLIDITY } from "./MetaMaskTokenStudio";
import { buildRemixIdeUrl } from "../utils/metamaskContractGenerator";
import { DeploymentAttempt } from "../types";

interface TokenDetailModalProps {
  token: TokenRecord | null;
  onClose: () => void;
  metaMaskDeployer?: string | null;
  isMetaMaskConnected?: boolean;
  onOpenMetaMaskSync?: () => void;
  onUpdateTokenDeployer?: (tokenId: string, newDeployer: string) => void;
  onDuplicateToken?: (token: TokenRecord) => void;
  onToggleDeployStatus?: (tokenId: string, isDeployed: boolean) => void;
  onRecordDeploymentAttempt?: (tokenId: string, attempt: DeploymentAttempt) => void;
  onOpenGlobalSwapSell?: (token: TokenRecord, mode?: "swap" | "sell") => void;
  onOpenMultimodalHub?: (token: TokenRecord, subTab?: "music" | "video" | "chat") => void;
}

export const TokenDetailModal = ({
  token,
  onClose,
  metaMaskDeployer,
  isMetaMaskConnected,
  onOpenMetaMaskSync,
  onUpdateTokenDeployer,
  onDuplicateToken,
  onToggleDeployStatus,
  onRecordDeploymentAttempt,
  onOpenGlobalSwapSell,
  onOpenMultimodalHub,
}: TokenDetailModalProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "tokenomics" | "nft_metadata" | "solidity" | "bytecode" | "foundry" | "stream_artifacts" | "metamask" | "deployment_history" | "sonic_anthem"
  >("overview");
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiData, setAiData] = useState<GeneratedTokenomics | null>(null);
  const [abiFormat, setAbiFormat] = useState<
    "single_line_json" | "single_line_human" | "single_line_ethers" | "multiline"
  >("single_line_json");
  const [bytecodeSubView, setBytecodeSubView] = useState<
    "bytecode" | "constructor" | "source" | "abi" | "guide"
  >("bytecode");
  const [solidityPreset, setSolidityPreset] = useState<"standard" | "giga_900t">("standard");

  // Sonic Anthem & Music Generation State
  const [isGeneratingAnthem, setIsGeneratingAnthem] = useState<boolean>(false);
  const [anthemTrack, setAnthemTrack] = useState<{
    audioBase64: string;
    mimeType: string;
    title: string;
    frequencyHz: number;
    lyrics?: string;
    durationSeconds: number;
  } | null>(null);
  const [isPlayingAnthem, setIsPlayingAnthem] = useState<boolean>(false);
  const [selectedAnthemHz, setSelectedAnthemHz] = useState<number>(528);
  const anthemAudioRef = useRef<HTMLAudioElement | null>(null);

  // Deployment History internal state
  const [localHistory, setLocalHistory] = useState<DeploymentAttempt[]>(() => {
    if (token?.deploymentHistory && token.deploymentHistory.length > 0) {
      return token.deploymentHistory;
    }
    return [
      {
        id: `dep_genesis_${token?.id || "init"}`,
        timestamp: token?.createdAt || new Date().toISOString(),
        deployerAddress: token?.deployerAddress || "0x0000000000000000000000000000000000000000",
        status: token?.isDeployed || token?.launchStatus === "Deployed" ? "Success" : "Pending",
        network: token?.chain || "ethereum",
        txHash: token?.creationTx || "0x98f4e24391a27b8417c918efca210b",
        gasUsed: "1,420,890 units",
        contractAddress: token?.contractAddress,
        notes: "Genesis contract compilation & broadcast to network RPC",
      },
    ];
  });

  const [isMarkedDeployed, setIsMarkedDeployed] = useState<boolean>(
    Boolean(token?.isDeployed || token?.launchStatus === "Deployed")
  );

  const [isRecordingAttempt, setIsRecordingAttempt] = useState<boolean>(false);
  const [attemptAddressInput, setAttemptAddressInput] = useState<string>(
    metaMaskDeployer || token?.deployerAddress || ""
  );
  const [attemptNetworkInput, setAttemptNetworkInput] = useState<string>(
    token?.chain || "ethereum"
  );
  const [attemptStatusInput, setAttemptStatusInput] = useState<"Success" | "Failed" | "Pending">("Success");
  const [attemptNotesInput, setAttemptNotesInput] = useState<string>("");
  const [isTreasuryHidden, setIsTreasuryHidden] = useState<boolean>(true);

  const handleToggleDeployment = () => {
    const nextState = !isMarkedDeployed;
    setIsMarkedDeployed(nextState);
    if (token) {
      onToggleDeployStatus?.(token.id, nextState);
    }
  };

  const handleRecordNewAttempt = () => {
    if (!token) return;
    const newAttempt: DeploymentAttempt = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      deployerAddress: attemptAddressInput.trim() || token.deployerAddress || "0x0000000000000000000000000000000000000000",
      status: attemptStatusInput,
      network: attemptNetworkInput,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      gasUsed: `${Math.floor(1200000 + Math.random() * 800000).toLocaleString()} units`,
      contractAddress: token.contractAddress,
      notes: attemptNotesInput.trim() || (attemptStatusInput === "Success" ? "Cast transaction broadcast verified on chain" : "Transaction simulation failed / gas estimate exceeded"),
    };

    const updated = [newAttempt, ...localHistory];
    setLocalHistory(updated);
    setIsRecordingAttempt(false);
    setAttemptNotesInput("");
    if (attemptStatusInput === "Success" && !isMarkedDeployed) {
      setIsMarkedDeployed(true);
      onToggleDeployStatus?.(token.id, true);
    }
    onRecordDeploymentAttempt?.(token.id, newAttempt);
  };

  const fullPkg = useMemo(() => {
    if (!token) return null;
    return generateFullStreamArtifactPackage({
      contractAddress: token.contractAddress,
      tokenId: token.tokenId,
      networkId: 1,
      chain: token.chain,
      tokenStandard: token.tokenStandard,
      name: token.name,
      symbol: token.symbol,
      deployerAddress: token.deployerAddress,
      decimals: token.decimals || 18,
      initialSupply: token.initialSupply || "1000000000",
    });
  }, [token]);

  const etherscanUrls = useMemo(() => {
    if (!token) return null;
    return getEtherscanVerificationUrl(token.chain, token.contractAddress);
  }, [token?.chain, token?.contractAddress]);

  const constructorArgsInfo = useMemo(() => {
    if (!token) return null;
    try {
      return encodeEtherscanConstructorArgs(token, token.tokenId);
    } catch {
      return {
        hex: fullPkg?.bytecode?.constructorCalldata || "00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8",
        readable: `initialOwner: ${token.deployerAddress || "0x7099..."}, name: "${token.name}", symbol: "${token.symbol}"`,
      };
    }
  }, [token, fullPkg]);

  if (!token || !fullPkg || !etherscanUrls || !constructorArgsInfo) return null;

  const chainMeta = CHAIN_METADATA[token.chain] || CHAIN_METADATA.ethereum;
  const narrativeInfo = NARRATIVE_METADATA_POOLS[token.narrative];
  const effectivePrivateKey = token.deployerPrivateKey || generateDeployerPrivateKey(token.chain);
  const dotEnvContent = buildDotEnvConfig(token);
  const castCommand = buildCastKeystoreCommand(effectivePrivateKey);
  const forgeCommand = buildForgeDeployScriptCommand(
    DEFAULT_RPC_URLS[token.chain] || "${RPC_URL}"
  );

  const tokenAbi = generateStreamABI({
    contractAddress: token.contractAddress,
    tokenId: token.tokenId,
    tokenStandard: token.tokenStandard,
    name: token.name,
    symbol: token.symbol,
  });
  const singleLineJsonAbi = generateSingleLineJsonABI(tokenAbi);
  const singleLineHumanAbi = generateSingleLineHumanReadableABI(tokenAbi);
  const singleLineEthersCode = generateSingleLineEthersContractCode(token.contractAddress, tokenAbi);
  const singleLineCastCommand = generateSingleLineCastCall(token.contractAddress);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateTokenAnthem = async () => {
    if (!token || isGeneratingAnthem) return;
    setIsGeneratingAnthem(true);
    try {
      const res = await fetch("/api/gemini/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Web3 sonic identity protocol anthem for ${token.name} (${token.symbol}) on ${token.chain}. Cybernetic synth with ${selectedAnthemHz}Hz resonance, pulsating bass, and uplifting decentralized theme.`,
          model: "lyria-3-clip-preview",
          frequencyHz: selectedAnthemHz,
          durationSeconds: 20,
          tokenSymbol: token.symbol,
        }),
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        const track = {
          audioBase64: data.audioBase64,
          mimeType: data.mimeType || "audio/wav",
          title: data.title || `${token.symbol} Anthem (${selectedAnthemHz}Hz)`,
          frequencyHz: selectedAnthemHz,
          lyrics: data.lyrics,
          durationSeconds: 20,
        };
        setAnthemTrack(track);
        if (anthemAudioRef.current) {
          anthemAudioRef.current.src = `data:${track.mimeType};base64,${track.audioBase64}`;
          anthemAudioRef.current.play().then(() => setIsPlayingAnthem(true)).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Anthem generation failed:", err);
    } finally {
      setIsGeneratingAnthem(false);
    }
  };

  const togglePlayAnthem = () => {
    if (!anthemAudioRef.current) return;
    if (isPlayingAnthem) {
      anthemAudioRef.current.pause();
      setIsPlayingAnthem(false);
    } else {
      anthemAudioRef.current.play().then(() => setIsPlayingAnthem(true)).catch(() => {});
    }
  };

  const handleDownloadAnthem = () => {
    if (!anthemTrack || !token) return;
    const link = document.createElement("a");
    link.href = `data:${anthemTrack.mimeType};base64,${anthemTrack.audioBase64}`;
    link.download = `${token.symbol}_Anthem_${selectedAnthemHz}Hz.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDotEnv = () => {
    const blob = new Blob([dotEnvContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `.env.${token.symbol.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateAIWhitepaper = async () => {
    setIsLoadingAI(true);
    try {
      const res = await fetch("/api/gemini/generate-tokenomics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenName: token.name,
          symbol: token.symbol,
          narrative: narrativeInfo.label,
          chain: chainMeta.name,
          standard: token.tokenStandard,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiData(data.data);
        setActiveTab("tokenomics");
      }
    } catch (err) {
      console.error("AI Generation error:", err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1F1F23] flex items-center justify-between bg-[#0A0A0C]">
          <div className="flex items-center gap-3">
            <TokenImage
              token={token}
              size="md"
              showChainBadge
              chainBadgeSize="xs"
              rounded="rounded-xl"
              fallbackSymbolLength={3}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{token.name}</h3>
                <span className="text-xs font-mono text-[#8E9299]">({token.symbol})</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${chainMeta.badgeColor}`}>
                  <ChainIcon chain={token.chain} size="xs" />
                  <span>{chainMeta.name}</span>
                </span>
                {token.isVanity && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 font-medium">
                    Vanity Address
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="text-xs text-[#8E9299] font-mono">
                  {narrativeInfo.label} • Standard: {token.tokenStandard}
                </p>
                {token.tags && token.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {token.tags.map((tag, idx) => {
                      const meta = getCategoricalTagMeta(tag);
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                            meta
                              ? `${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText}`
                              : "bg-[#1E1E24] text-zinc-300 border-[#2A2A30]"
                          }`}
                          title={meta ? meta.description : tag}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta ? meta.dotColor : "bg-zinc-400"}`} />
                          <span>{meta ? meta.label : tag}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDuplicateToken && token && (
              <button
                id="btn-duplicate-token-modal"
                type="button"
                onClick={() => {
                  onDuplicateToken(token);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-amber-400 text-[#8E9299] hover:text-amber-300 text-xs font-mono transition-all active:scale-[0.98] cursor-pointer"
                title="Duplicate Token (Deep copy with new random contract address & shared tokenomics)"
              >
                <CopyPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Duplicate</span>
              </button>
            )}

            {token && onOpenGlobalSwapSell && (
              <button
                type="button"
                onClick={() => {
                  onOpenGlobalSwapSell(token, "swap");
                  onClose();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono transition-all active:scale-[0.98] cursor-pointer"
                title="Swap or Sell on 52 World Exchanges (Uniswap, Binance, Coinbase, etc.)"
              >
                <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Swap &amp; Sell (52 Ex.)</span>
              </button>
            )}

            <button
              id="btn-ai-synthesize-modal"
              type="button"
              onClick={generateAIWhitepaper}
              disabled={isLoadingAI}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoadingAI ? "Synthesizing with Gemini..." : "Synthesize AI Tokenomics"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded text-[#8E9299] hover:text-white hover:bg-[#1F1F23] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-[#1F1F23] bg-[#0A0A0C] flex items-center gap-2 pt-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "overview"
                ? "border-[#F27D26] text-white font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            Protocol Explorer
          </button>
          <button
            onClick={() => setActiveTab("tokenomics")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "tokenomics"
                ? "border-[#F27D26] text-white font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#F27D26]" />
            <span>Tokenomics & Whitepaper</span>
          </button>
          <button
            id="btn-tab-nft-metadata"
            onClick={() => setActiveTab("nft_metadata")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "nft_metadata"
                ? "border-cyan-400 text-cyan-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span>NFT Marketplace Metadata</span>
          </button>
          <button
            onClick={() => setActiveTab("solidity")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "solidity"
                ? "border-[#F27D26] text-white font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            Smart Contract Stub
          </button>
          <button
            id="btn-tab-bytecode-etherscan"
            onClick={() => setActiveTab("bytecode")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "bytecode"
                ? "border-cyan-400 text-cyan-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <span>Bytecode & Etherscan Codes</span>
          </button>
          <button
            id="btn-tab-foundry-deploy"
            onClick={() => setActiveTab("foundry")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "foundry"
                ? "border-emerald-400 text-emerald-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Foundry Deploy (.env & Keystore)</span>
          </button>
          <button
            id="btn-tab-stream-artifacts"
            onClick={() => setActiveTab("stream_artifacts")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "stream_artifacts"
                ? "border-green-400 text-green-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            <span>Stream Artifacts & Proof (5)</span>
          </button>
          <button
            id="btn-tab-metamask-specs"
            onClick={() => setActiveTab("metamask")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "metamask"
                ? "border-[#F27D26] text-[#F27D26] font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>MetaMask Specs & RPC</span>
          </button>
          <button
            id="btn-tab-deployment-history"
            onClick={() => setActiveTab("deployment_history")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "deployment_history"
                ? "border-emerald-400 text-emerald-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deployment History ({localHistory.length})</span>
          </button>
          <button
            id="btn-tab-sonic-anthem"
            onClick={() => setActiveTab("sonic_anthem")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "sonic_anthem"
                ? "border-purple-400 text-purple-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span>🎵 Lyria Anthem & Tunes</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Contract & Token ID Callouts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2">
                  <div className="flex items-center justify-between text-[#8E9299]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#E0E0E0] uppercase tracking-wider text-[11px]">Enterprise Contract Address</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">Institutional</span>
                    </div>
                    <span className="font-mono text-[10px] text-green-500">CREATE2 / EIP-55</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#16161A] p-2.5 rounded border border-[#1F1F23] font-mono text-xs text-[#00F0FF] break-all">
                    <span>{token.contractAddress}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(token.contractAddress, "contract_full")}
                      className="ml-2 p-1.5 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white"
                      title="Copy Enterprise Address"
                    >
                      {copiedKey === "contract_full" ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9299] pt-1 border-t border-[#1F1F23]">
                    <span className="truncate max-w-[240px]" title={token.contractArchetype}>Archetype: {token.contractArchetype || "Enterprise Transparent Proxy (EIP-1967)"}</span>
                    <span className="text-[#F27D26]">{token.enterpriseTier || "Tier-1 Institutional"}</span>
                  </div>
                </div>

                <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2">
                  <div className="flex items-center justify-between text-[#8E9299]">
                    <span className="font-semibold text-[#E0E0E0] uppercase tracking-wider text-[11px]">uint256 Token ID</span>
                    <span className="font-mono text-[10px] text-cyan-400">ERC-721 / Mint ID</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#16161A] p-2.5 rounded border border-[#1F1F23] font-mono text-xs text-cyan-300 break-all">
                    <span>{token.tokenId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(token.tokenId, "token_id_full")}
                      className="ml-2 p-1.5 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white"
                      title="Copy Token ID"
                    >
                      {copiedKey === "token_id_full" ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Deployer Private Key Card (Foundry & Cast Integration) */}
              <div className="bg-[#0A0A0C] p-4 rounded-lg border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-[#8E9299]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      Deployer Private Key (256-bit EVM)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Devnet / Foundry
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPrivateKey ? "Hide Key" : "Reveal Key"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#16161A] p-2.5 rounded border border-amber-500/20 font-mono text-xs text-amber-300 break-all">
                  <span className="tracking-wide select-all">
                    {showPrivateKey
                      ? effectivePrivateKey
                      : `${effectivePrivateKey.slice(0, 10)}••••••••••••••••••••••••••••••••${effectivePrivateKey.slice(-8)}`}
                  </span>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(effectivePrivateKey, "p_key_overview")}
                      className="p-1.5 rounded hover:bg-[#1F1F23] text-amber-400 hover:text-white cursor-pointer"
                      title="Copy Deployer Private Key"
                    >
                      {copiedKey === "p_key_overview" ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9299] pt-1 border-t border-[#1F1F23]">
                  <span>Ready for <code className="text-amber-300">cast wallet import</code> & <code className="text-amber-300">.env</code> deployment</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("foundry")}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Foundry Deployment Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Quantum Entropy Signature Callout */}
              <div className="bg-[#0A0A0C] p-4 rounded-lg border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-[#8E9299]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-purple-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Quantum Entropy Signature
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                      64-Char Hex (256-Bit)
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    Cryptographically Secure
                  </span>
                </div>
                <div className="flex items-center justify-between bg-[#16161A] p-2.5 rounded border border-purple-500/20 font-mono text-xs text-purple-300 break-all">
                  <span className="tracking-wide select-all">{token.quantum_entropy_signature}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(token.quantum_entropy_signature, "qes_sig")}
                    className="ml-2 p-1.5 rounded hover:bg-[#1F1F23] text-purple-400 hover:text-white flex-shrink-0 cursor-pointer"
                    title="Copy 64-char Hex Quantum Entropy Signature"
                  >
                    {copiedKey === "qes_sig" ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Simulated Block Explorer Details */}
              <div className="bg-[#0A0A0C] rounded-lg border border-[#1F1F23] overflow-hidden">
                <div className="p-3 bg-[#16161A] border-b border-[#1F1F23] font-semibold text-[#E0E0E0] flex items-center justify-between uppercase tracking-wider text-[11px]">
                  <span>Simulated On-Chain Genesis Record</span>
                  <span className="text-[10px] text-[#8E9299] font-mono">Block #21,849,204</span>
                </div>
                <div className="divide-y divide-[#1F1F23] p-3 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#8E9299]">Creation Tx Hash:</span>
                    <span className="text-[#E0E0E0]">{token.creationTx}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 gap-1.5">
                    <span className="text-[#8E9299]">Enterprise Deployer (Multi-Sig / Timelock):</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#E0E0E0] truncate max-w-[240px] font-mono" title={token.deployerAddress}>{token.deployerAddress}</span>
                      {metaMaskDeployer && (
                        token.deployerAddress.toLowerCase() === metaMaskDeployer.toLowerCase() ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap">
                            🦊 MetaMask Synced
                          </span>
                        ) : onUpdateTokenDeployer ? (
                          <button
                            type="button"
                            onClick={() => onUpdateTokenDeployer(token.id, metaMaskDeployer)}
                            className="px-2 py-0.5 rounded text-[9px] font-mono bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 whitespace-nowrap cursor-pointer transition-colors"
                            title="Set your connected MetaMask address as the deployer for this token"
                          >
                            🦊 Sync My MetaMask
                          </button>
                        ) : null
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 gap-1.5 border-t border-[#1F1F23]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8E9299]">
                        {token.chain === "base"
                          ? `Base Chain Treasury (ID: ${BASE_CHAIN_ID}):`
                          : token.chain === "solana"
                          ? "Solana Multi-Sig Treasury:"
                          : "Protocol Treasury Multi-Sig:"}
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {isTreasuryHidden ? "Hidden in Vault" : "Revealed"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate max-w-[240px] font-mono select-all ${
                          token.chain === "base"
                            ? "text-blue-300"
                            : token.chain === "polygon"
                            ? "text-purple-300"
                            : token.chain === "solana"
                            ? "text-[#14F195]"
                            : "text-cyan-300"
                        }`}
                        title={
                          isTreasuryHidden
                            ? "Treasury wallet ID hidden in vault"
                            : token.treasuryAddress ||
                              (token.chain === "base"
                                ? BASE_TREASURY_ADDRESS
                                : token.chain === "polygon"
                                ? POLYGON_TREASURY_ADDRESS
                                : token.chain === "solana"
                                ? SOLANA_MULTISIG_TREASURY
                                : PROTOCOL_TREASURY_ADDRESS)
                        }
                      >
                        {isTreasuryHidden
                          ? "••••••••••••••••••••••••••••••••••••••••"
                          : token.treasuryAddress ||
                            (token.chain === "base"
                              ? BASE_TREASURY_ADDRESS
                              : token.chain === "polygon"
                              ? POLYGON_TREASURY_ADDRESS
                              : token.chain === "solana"
                              ? SOLANA_MULTISIG_TREASURY
                              : PROTOCOL_TREASURY_ADDRESS)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsTreasuryHidden(!isTreasuryHidden)}
                        className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer"
                        title={isTreasuryHidden ? "Reveal Treasury Wallet ID" : "Hide Treasury Wallet ID in Vault"}
                      >
                        {isTreasuryHidden ? (
                          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            token.treasuryAddress ||
                              (token.chain === "base"
                                ? BASE_TREASURY_ADDRESS
                                : token.chain === "polygon"
                                ? POLYGON_TREASURY_ADDRESS
                                : token.chain === "solana"
                                ? SOLANA_MULTISIG_TREASURY
                                : PROTOCOL_TREASURY_ADDRESS),
                            "treasury_addr_detail"
                          )
                        }
                        className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer"
                        title="Copy Treasury Address"
                      >
                        {copiedKey === "treasury_addr_detail" ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={
                          token.chain === "base"
                            ? `https://basescan.org/address/${
                                token.treasuryAddress || BASE_TREASURY_ADDRESS
                              }`
                            : token.chain === "polygon"
                            ? `https://polygonscan.com/address/${
                                token.treasuryAddress || POLYGON_TREASURY_ADDRESS
                              }`
                            : token.chain === "solana"
                            ? `https://solscan.io/account/${
                                token.treasuryAddress || SOLANA_MULTISIG_TREASURY
                              }`
                            : `https://etherscan.io/address/${
                                token.treasuryAddress || PROTOCOL_TREASURY_ADDRESS
                              }`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className={`p-1 rounded hover:bg-[#1F1F23] ${
                          token.chain === "base"
                            ? "text-blue-400 hover:text-blue-300"
                            : token.chain === "solana"
                            ? "text-[#14F195] hover:text-emerald-300"
                            : "text-cyan-400 hover:text-cyan-300"
                        }`}
                        title={
                          token.chain === "base"
                            ? "View on Basescan"
                            : token.chain === "solana"
                            ? "View on Solscan"
                            : "View on Etherscan"
                        }
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  {token.enterpriseSalt && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E9299]">CREATE2 Deterministic Salt:</span>
                      <span className="text-cyan-400 truncate max-w-[280px]" title={token.enterpriseSalt}>{token.enterpriseSalt}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#8E9299]">Total Supply:</span>
                    <span className="text-white font-semibold">{token.initialSupply} tokens</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#8E9299]">Decimals:</span>
                    <span className="text-[#E0E0E0]">{token.decimals}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 bg-amber-500/5 px-2 rounded border border-amber-500/20">
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      CoinMarketCap Valuation:
                    </span>
                    <span className="text-amber-300 font-bold flex items-center gap-1.5">
                      {token.marketCap >= 1e12 ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                          $3T+ Macro Cap
                        </span>
                      ) : null}
                      <span>${token.marketCap >= 1e12 ? (token.marketCap / 1e12).toFixed(2) + " Trillion" : token.marketCap >= 1e9 ? (token.marketCap / 1e9).toFixed(2) + " Billion" : (token.marketCap / 1e6).toFixed(2) + " Million"} USD</span>
                    </span>
                  </div>

                  {token.reserveShares && (
                    <div className="flex items-center justify-between py-1 bg-emerald-500/5 px-2 rounded border border-emerald-500/20">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        Reserve Allocation (uint256, 18 Dec):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-300 font-mono text-[10px] font-bold">
                          {token.reserveShares} shares (9e20)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(token.reserveShares!, "res_shares")}
                          className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-200 cursor-pointer"
                          title="Copy Reserve Shares"
                        >
                          {copiedKey === "res_shares" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {token.treasuryShares && (
                    <div className="flex items-center justify-between py-1 bg-cyan-500/5 px-2 rounded border border-cyan-500/20">
                      <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        Treasury Allocation (uint256, 18 Dec):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-300 font-mono text-[10px] font-bold">
                          {token.treasuryShares} shares (9e21)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(token.treasuryShares!, "tr_shares")}
                          className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-200 cursor-pointer"
                          title="Copy Treasury Shares"
                        >
                          {copiedKey === "tr_shares" ? (
                            <Check className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {token.targetOwner && (
                    <div className="flex items-center justify-between py-1 bg-purple-500/5 px-2 rounded border border-purple-500/20">
                      <span className="text-purple-400 font-semibold">Sovereign Owner / Protocol Architect:</span>
                      <span className="text-purple-300 font-bold">{token.targetOwner}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#8E9299]">Liquidity Pool Pair (509 Catalog):</span>
                    <span className="text-green-400 font-bold flex items-center gap-1.5">
                      {token.liquidityPoolId && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                          #{token.liquidityPoolId}
                        </span>
                      )}
                      <span>{token.liquidityPair}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#8E9299]">Active Unique Holders:</span>
                    <span className="text-[#E0E0E0]">{token.holderCount.toLocaleString()} addresses</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#8E9299]">Audited Security Firm:</span>
                    <span className="text-[#F27D26] font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                      {token.auditFirm} (Score: {token.securityScore}/100)
                    </span>
                  </div>

                  {token.quantum_entropy_signature && (
                    <div className="flex items-center justify-between py-1 bg-purple-500/5 px-2 rounded border border-purple-500/20">
                      <span className="text-purple-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Quantum Entropy Signature:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-300 font-mono text-[10px] break-all max-w-[280px] truncate" title={token.quantum_entropy_signature}>
                          {token.quantum_entropy_signature}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(token.quantum_entropy_signature!, "qes_sig")}
                          className="p-1 rounded hover:bg-purple-500/20 text-purple-400 hover:text-purple-200 cursor-pointer"
                          title="Copy Quantum Entropy Signature"
                        >
                          {copiedKey === "qes_sig" ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Token Description (Imported from Google Keep or Whitepaper) */}
              {token.description && (
                <div className="p-4 rounded-lg bg-[#0A0A0C] border border-orange-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#F27D26]" />
                      <span>Token Narrative & Specification</span>
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      Google Workspace / Keep Note
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {token.description}
                  </div>
                </div>
              )}

              {/* Narrative Context */}
              <div className="p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F27D26]" />
                  <span>2026 Narrative Architecture: {narrativeInfo.label}</span>
                </h4>
                <p className="text-[#8E9299] leading-relaxed">{narrativeInfo.description}</p>
              </div>
            </div>
          )}

          {activeTab === "tokenomics" && (() => {
            const displayTokenomics = aiData || token.tokenomics;
            const pillars = displayTokenomics?.pillars || token.tokenomicsPillars;
            const powerOfTwo = displayTokenomics?.powerOfTwo;

            return (
              <div className="space-y-5">
                {!displayTokenomics ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] flex items-center justify-center mx-auto text-[#F27D26]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Generate 2026 Whitepaper & Tokenomics</h4>
                      <p className="text-[#8E9299] max-w-md mx-auto mt-1">
                        Synthesize a complete protocol whitepaper, institutional vesting schedule, and smart contract architecture with Google Gemini.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={generateAIWhitepaper}
                      disabled={isLoadingAI}
                      className="px-5 py-2.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                    >
                      {isLoadingAI ? "Generating Model Output..." : "Synthesize with Gemini 3.8"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5 animate-fade-in">
                    {/* Header Protocol Tagline */}
                    <div className="p-4 rounded-lg bg-[#0A0A0C] border border-amber-500/30 space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono text-amber-400 font-bold">
                            Institutional 2⁸ Tokenomics Protocol
                          </span>
                          <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                            2⁸ (256 Shares)
                          </span>
                          <span className="px-2 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                            CMC ≥ 2⁸ ({token.coinmarketcapMetric || 256} pts)
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-1 italic">"{displayTokenomics.tagline}"</p>
                      </div>

                      <button
                        type="button"
                        onClick={generateAIWhitepaper}
                        disabled={isLoadingAI}
                        className="px-3 py-1.5 rounded bg-[#1F1F23] hover:bg-[#2A2A30] text-amber-300 border border-amber-500/30 text-xs font-mono font-bold shrink-0 transition-all cursor-pointer"
                      >
                        {isLoadingAI ? "Generating..." : "⚡ Re-Synthesize with AI"}
                      </button>
                    </div>

                    {/* Three Core Foundation Pillars */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-[#0A0A0C] border border-purple-500/30 rounded-lg space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[11px]">
                          <Calculator className="w-3.5 h-3.5" />
                          <span>1. Mathematical Boundaries</span>
                        </div>
                        <p className="text-[11px] text-[#8E9299]">
                          uint256 hard ceiling (2²⁵⁶-1). Numbers on EVM blockchains cannot represent literal infinity. Checked arithmetic prevents overflows.
                        </p>
                        <div className="p-1.5 bg-[#16161A] rounded font-mono text-[10px] text-purple-300 break-all select-all">
                          2²⁵⁶-1 (~1.1579e77 wei)
                        </div>
                      </div>

                      <div className="p-3 bg-[#0A0A0C] border border-cyan-500/30 rounded-lg space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>2. Economic Realities</span>
                        </div>
                        <p className="text-[11px] text-[#8E9299]">
                          Real liquidity reserves require actual capital deposited by participants. Market values depend on market dynamics, not automated code commands.
                        </p>
                        <div className="p-1.5 bg-[#16161A] rounded font-mono text-[10px] text-cyan-300">
                          AMM Invariant: x · y = k
                        </div>
                      </div>

                      <div className="p-3 bg-[#0A0A0C] border border-amber-500/30 rounded-lg space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>3. Smart Contract Architecture</span>
                        </div>
                        <p className="text-[11px] text-[#8E9299]">
                          OpenZeppelin contracts define supplies governed by owner/multisig, but cannot create monetary value on their own.
                        </p>
                        <div className="p-1.5 bg-[#16161A] rounded font-mono text-[10px] text-amber-300">
                          Owner: Mauro Lomibao Dar III
                        </div>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Executive Summary</h4>
                      <p className="text-[#8E9299] text-xs leading-relaxed bg-[#0A0A0C] p-3.5 rounded-lg border border-[#1F1F23] whitespace-pre-line">
                        {displayTokenomics.executiveSummary}
                      </p>
                    </div>

                    {/* Token Allocation & Vesting Model */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Token Allocation & 2⁸ Reserve Structure</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {displayTokenomics.tokenomics.map((item, i) => (
                          <div
                            key={i}
                            className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-white text-xs">{item.category}</span>
                              <p className="text-[11px] text-[#8E9299] font-mono mt-0.5">{item.lockup}</p>
                            </div>
                            <span className="text-sm font-bold font-mono text-amber-400 bg-[#16161A] px-2 py-0.5 rounded border border-[#1F1F23]">
                              {item.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Security Audit Analysis */}
                    <div className="p-3.5 rounded-lg bg-[#0A0A0C] border border-green-500/30 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-green-400 text-xs">Mathematical & Economic Audit Analysis</span>
                        <p className="text-[11px] text-[#8E9299] mt-0.5">{displayTokenomics.auditNotes}</p>
                      </div>
                      <span className="text-base font-bold font-mono text-green-400">
                        {displayTokenomics.securityScore}/100
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === "nft_metadata" && (() => {
            const metadata = generateTokenNFTMetadata(token);
            const stats = computeSimulatedDeploymentStats(token);
            const jsonStr = JSON.stringify(metadata, null, 2);

            const handleDownloadJson = () => {
              const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${token.symbol.toLowerCase()}_nft_metadata.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            };

            return (
              <div className="space-y-6 animate-fade-in font-sans">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">OpenSea / ERC-721 / ERC-1155 Schema</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                        Marketplace Ready
                      </span>
                    </div>
                    <p className="text-xs text-[#8E9299] mt-0.5">
                      Includes simulated deployment gas breakdown, bytecode size, intended chain, and standard traits.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(jsonStr, "nft_modal_json")}
                      className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-white flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-colors"
                    >
                      {copiedKey === "nft_modal_json" ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                      )}
                      <span>Copy JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .json</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Deployment Metric Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
                    <span className="text-[10px] text-[#8E9299] font-mono uppercase block">Intended Blockchain</span>
                    <span className="text-xs font-bold text-white mt-1 block font-mono">{chainMeta.name}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">Chain ID: {token.networkId}</span>
                  </div>
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
                    <span className="text-[10px] text-[#8E9299] font-mono uppercase block">Standard</span>
                    <span className="text-xs font-bold text-[#F27D26] mt-1 block font-mono">{token.tokenStandard}</span>
                    <span className="text-[10px] text-[#8E9299] font-mono">{token.decimals} Decimals</span>
                  </div>
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
                    <span className="text-[10px] text-[#8E9299] font-mono uppercase block">Simulated Gas Units</span>
                    <span className="text-xs font-bold text-white mt-1 block font-mono">{stats.totalGasUnits.toLocaleString()}</span>
                    <span className="text-[10px] text-green-400 font-mono">{stats.nativeCostFormatted}</span>
                  </div>
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
                    <span className="text-[10px] text-[#8E9299] font-mono uppercase block">Simulation Success</span>
                    <span className="text-xs font-bold text-emerald-400 mt-1 block font-mono flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      {stats.overallSuccessRate}%
                    </span>
                    <span className="text-[10px] text-[#8E9299] font-mono">Bytecode: {stats.bytecodeSize}B</span>
                  </div>
                </div>

                {/* 2-Column Marketplace Preview & Trait Pills */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Left: OpenSea Preview Card */}
                  <div className="md:col-span-5 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl overflow-hidden shadow-lg flex flex-col">
                    <div className="relative aspect-square bg-[#06080E] flex items-center justify-center p-3 border-b border-[#1F1F23]">
                      <img
                        src={metadata.image}
                        alt={metadata.name}
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white border border-[#1F1F23]">
                        #{token.tokenId.slice(-4) || "0001"}
                      </span>
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                        {token.tokenStandard}
                      </span>
                    </div>
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                        <span>Web3 Token Foundry</span>
                        <span className="text-green-400 font-mono flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{metadata.name}</h4>
                      <p className="text-[10px] text-[#8E9299] font-mono truncate">{token.contractAddress}</p>
                    </div>
                  </div>

                  {/* Right: Attributes Table */}
                  <div className="md:col-span-7 space-y-3">
                    <span className="font-bold text-white uppercase text-[11px] tracking-wider font-mono block">
                      Marketplace Attributes ({metadata.attributes.length} Traits)
                    </span>
                    <div className="grid grid-cols-2 gap-2 max-h-[290px] overflow-y-auto pr-1">
                      {metadata.attributes.map((attr, i) => (
                        <div key={i} className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23] font-mono">
                          <span className="text-[9px] text-cyan-400 uppercase font-semibold block truncate">
                            {attr.trait_type}
                          </span>
                          <span className="text-xs font-bold text-white truncate block mt-0.5">
                            {attr.display_type === "date"
                              ? new Date(Number(attr.value) * 1000).toLocaleDateString()
                              : String(attr.value)}
                            {attr.max_value ? ` / ${attr.max_value}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Raw JSON Code Block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase text-[11px] tracking-wider font-mono">
                      Generated JSON Payload
                    </span>
                    <span className="text-[10px] text-[#8E9299] font-mono">metadata.json</span>
                  </div>
                  <pre className="p-4 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg overflow-x-auto text-[11px] leading-relaxed text-[#D4D4D4] max-h-[300px] overflow-y-auto font-mono">
                    <code>{jsonStr}</code>
                  </pre>
                </div>
              </div>
            );
          })()}

          {activeTab === "solidity" && (() => {
            const cleanSym = token.symbol.replace(/[^a-zA-Z0-9]/g, "") || "TOKEN";
            const standardCode = aiData?.solidityStub || `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${token.name} Protocol (${token.tokenStandard})
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 * @notice 2026 ${token.narrative.toUpperCase()} Smart Contract
 */
contract ${cleanSym}Token is ERC20, Ownable {
    uint256 public constant TOTAL_CAP = 1_000_000_000 * 10 ** 18;
    mapping(address => bool) public isAuthorizedNode;

    event NodeRegistered(address indexed node, uint256 timestamp);

    constructor(address initialOwner) ERC20("${token.name}", "${token.symbol}") Ownable(initialOwner) {
        _mint(initialOwner, TOTAL_CAP);
    }

    function registerNode(address node) external onlyOwner {
        isAuthorizedNode[node] = true;
        emit NodeRegistered(node, block.timestamp);
    }
}`;

            const gigaCode = `// SPDX-License-Identifier: MIT
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

            const activeSolidity = solidityPreset === "giga_900t" ? gigaCode : standardCode;

            return (
              <div className="space-y-4">
                {/* Template Selection Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-mono text-[#8E9299] px-1">Contract Archetype:</span>
                    <button
                      type="button"
                      onClick={() => setSolidityPreset("standard")}
                      className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                        solidityPreset === "standard"
                          ? "bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26] font-bold shadow-xs"
                          : "text-[#8E9299] hover:text-white"
                      }`}
                    >
                      {token.symbol} Standard (1B Cap)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSolidityPreset("giga_900t")}
                      className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                        solidityPreset === "giga_900t"
                          ? "bg-purple-600/30 text-purple-300 border border-purple-500 font-bold shadow-xs ring-1 ring-purple-500/50"
                          : "text-[#8E9299] hover:text-purple-300"
                      }`}
                    >
                      <span>💎 GigaSupplyToken (900T Treasury Mint)</span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px]">Mauro Lomibao Dar III</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={buildRemixIdeUrl(activeSolidity, `${solidityPreset === "giga_900t" ? "GigaSupplyToken" : token.symbol}.sol`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center gap-1.5 font-mono text-[11px] cursor-pointer"
                      title="Open and compile in official Remix IDE web compiler"
                    >
                      <ExternalLink className="w-3 h-3 text-purple-400" />
                      <span>Launch Remix IDE</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSolidity, "sol_code")}
                      className="px-2.5 py-1 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-[#E0E0E0] flex items-center gap-1 font-mono text-[11px] cursor-pointer"
                    >
                      {copiedKey === "sol_code" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy Code</span>
                    </button>
                  </div>
                </div>

                {solidityPreset === "giga_900t" && (
                  <div className="p-3.5 rounded-lg bg-gradient-to-r from-purple-950/40 via-[#16161A] to-indigo-950/30 border border-purple-500/40 font-mono text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
                      <span className="text-purple-300 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        GigaSupplyToken • Standard ERC20 with 900 Trillion Initial Treasury Mint
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                        Solidity ^0.8.20
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                      <div>
                        <span className="text-[#8E9299]">Architect:</span>
                        <p className="text-white font-bold">Mauro Lomibao Dar III</p>
                      </div>
                      <div>
                        <span className="text-[#8E9299]">Designated Treasury Wallet:</span>
                        <p className="text-purple-300 font-bold select-all break-all">0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D</p>
                      </div>
                      <div>
                        <span className="text-[#8E9299]">Target Supply:</span>
                        <p className="text-emerald-400 font-bold">900,000,000,000,000 * 10**18 (900 Trillion)</p>
                      </div>
                    </div>
                  </div>
                )}

                <pre className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] font-mono text-[11px] text-[#8E9299] overflow-x-auto leading-relaxed">
                  <code>{activeSolidity}</code>
                </pre>
              </div>
            );
          })()}

          {activeTab === "bytecode" && (
            <div className="space-y-5 font-mono text-xs">
              {/* Etherscan Verification Hub Header Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0C121E] via-[#0E1524] to-[#14121F] border border-cyan-500/30 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider">
                        {etherscanUrls.explorerName} Verification Station
                      </span>
                      <span className="text-[11px] text-[#A0A0B0]">
                        Compiler <strong className="text-white">v0.8.20+commit.a1b79de6</strong>
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      Bytecode & Explorer Verification Artifacts
                    </h3>
                    <p className="text-[11px] text-[#8E9299] font-sans">
                      All deterministic EVM bytecodes, constructor calldata hex, and compiler parameters required to verify on {etherscanUrls.explorerName}.
                    </p>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      id="btn-copy-etherscan-bundle"
                      onClick={() => {
                        const bundleText = [
                          `=============================================`,
                          `ETHERSCAN VERIFICATION PACKAGE FOR ${token.name} (${token.symbol})`,
                          `=============================================`,
                          `Contract Address: ${token.contractAddress}`,
                          `Network: ${token.chain} (EVM Chain)`,
                          `Verification Portal: ${etherscanUrls.verificationUrl}`,
                          `Explorer Code URL: ${etherscanUrls.contractCodeUrl}`,
                          ``,
                          `COMPILER SPECIFICATIONS FOR ETHERSCAN:`,
                          `- Compiler Type: Solidity (Single file)`,
                          `- Compiler Version: v0.8.20+commit.a1b79de6`,
                          `- Open Source License: 3) MIT License (MIT)`,
                          `- Optimization: Enabled (Yes)`,
                          `- Optimization Runs: 200`,
                          `- EVM Version: Paris`,
                          ``,
                          `CONSTRUCTOR ARGUMENTS (ABI-ENCODED HEX FOR ETHERSCAN):`,
                          `${constructorArgsInfo.hex}`,
                          ``,
                          `DECODED PARAMETERS:`,
                          `${constructorArgsInfo.readable}`,
                          ``,
                          `BYTECODE METRICS:`,
                          `- Creation InitCode: ${fullPkg.bytecode.creationBytecode.slice(0, 66)}... (${fullPkg.bytecode.sizeBytes} Bytes)`,
                          `- Deployed Runtime Bytecode: ${fullPkg.bytecode.runtimeBytecode.slice(0, 66)}... (${fullPkg.bytecode.runtimeSizeBytes} Bytes)`,
                          `- InitCode Hash: ${fullPkg.bytecode.initCodeHash}`,
                          `=============================================`,
                        ].join("\n");
                        handleCopy(bundleText, "all_etherscan_bundle");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                      title="Copy complete Etherscan verification parameters bundle to clipboard"
                    >
                      {copiedKey === "all_etherscan_bundle" ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>{copiedKey === "all_etherscan_bundle" ? "Copied All Codes!" : "Copy Verification Bundle"}</span>
                    </button>

                    <a
                      href={etherscanUrls.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id="btn-open-etherscan-verify"
                      className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <span>Verify on {etherscanUrls.explorerName}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-black" />
                    </a>

                    <a
                      href={etherscanUrls.contractCodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id="btn-view-etherscan-code"
                      className="px-3 py-1.5 rounded-lg bg-[#1F222E] hover:bg-[#282C3C] text-gray-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>View on Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                  </div>
                </div>

                {/* Compiler Specs Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10 text-[11px]">
                  <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[#8E9299] block text-[10px]">Compiler Version</span>
                      <span className="text-cyan-300 font-bold">v0.8.20+commit.a1b79de6</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy("v0.8.20+commit.a1b79de6", "compiler_ver")}
                      className="text-[#8E9299] hover:text-white"
                      title="Copy compiler version"
                    >
                      {copiedKey === "compiler_ver" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[#8E9299] block text-[10px]">Optimization</span>
                    <span className="text-green-300 font-bold">Yes (200 runs)</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[#8E9299] block text-[10px]">EVM Version</span>
                    <span className="text-purple-300 font-bold">Paris</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[#8E9299] block text-[10px]">Open Source License</span>
                    <span className="text-amber-300 font-bold">3) MIT License (MIT)</span>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#0D0D11] border border-[#1F1F24] rounded-xl overflow-x-auto">
                <button
                  type="button"
                  id="btn-subtab-bytecode"
                  onClick={() => setBytecodeSubView("bytecode")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    bytecodeSubView === "bytecode"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                      : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
                  }`}
                >
                  <Binary className="w-3.5 h-3.5" />
                  <span>1. EVM Bytecode ({fullPkg.bytecode.sizeBytes}B)</span>
                </button>

                <button
                  type="button"
                  id="btn-subtab-constructor"
                  onClick={() => setBytecodeSubView("constructor")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    bytecodeSubView === "constructor"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                      : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>2. Constructor Calldata (Hex)</span>
                </button>

                <button
                  type="button"
                  id="btn-subtab-source"
                  onClick={() => setBytecodeSubView("source")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    bytecodeSubView === "source"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                      : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>3. Solidity Source (.sol)</span>
                </button>

                <button
                  type="button"
                  id="btn-subtab-abi"
                  onClick={() => setBytecodeSubView("abi")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    bytecodeSubView === "abi"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                      : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>4. Contract ABI</span>
                </button>

                <button
                  type="button"
                  id="btn-subtab-guide"
                  onClick={() => setBytecodeSubView("guide")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    bytecodeSubView === "guide"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                      : "text-[#8E9299] hover:text-white hover:bg-[#16161C]"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>5. Step-by-Step Etherscan Guide</span>
                </button>
              </div>

              {/* VIEW 1: BYTECODE (Creation & Runtime) */}
              {bytecodeSubView === "bytecode" && (
                <div className="space-y-4">
                  {/* Creation Bytecode (InitCode) */}
                  <div className="p-3.5 rounded-xl bg-[#090A0E] border border-[#1A1C26] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Contract Creation Bytecode (InitCode)</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {fullPkg.bytecode.sizeBytes} Bytes
                        </span>
                        <span className="text-[10px] text-[#8E9299] hidden sm:inline">
                          Deployment transaction payload
                        </span>
                      </div>
                      <button
                        type="button"
                        id="btn-copy-creation-bytecode"
                        onClick={() => handleCopy(fullPkg.bytecode.creationBytecode, "creation_bytecode")}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "creation_bytecode" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === "creation_bytecode" ? "Copied!" : "Copy InitCode"}</span>
                      </button>
                    </div>
                    <div className="p-3 bg-[#050608] rounded-lg border border-[#161820] text-[10px] text-cyan-300/80 break-all max-h-32 overflow-y-auto scrollbar-thin select-all">
                      {fullPkg.bytecode.creationBytecode}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#8E9299] pt-1">
                      <span>Keccak256 Hash: <code className="text-gray-300 font-mono">{fullPkg.bytecode.initCodeHash}</code></span>
                    </div>
                  </div>

                  {/* Deployed Runtime Bytecode */}
                  <div className="p-3.5 rounded-xl bg-[#090A0E] border border-[#1A1C26] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Deployed Runtime Bytecode</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {fullPkg.bytecode.runtimeSizeBytes} Bytes
                        </span>
                        <span className="text-[10px] text-[#8E9299] hidden sm:inline">
                          On-chain code returned by eth_getCode
                        </span>
                      </div>
                      <button
                        type="button"
                        id="btn-copy-runtime-bytecode"
                        onClick={() => handleCopy(fullPkg.bytecode.runtimeBytecode, "runtime_bytecode")}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "runtime_bytecode" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === "runtime_bytecode" ? "Copied!" : "Copy Runtime Bytecode"}</span>
                      </button>
                    </div>
                    <div className="p-3 bg-[#050608] rounded-lg border border-[#161820] text-[10px] text-emerald-300/80 break-all max-h-32 overflow-y-auto scrollbar-thin select-all">
                      {fullPkg.bytecode.runtimeBytecode}
                    </div>
                  </div>

                  {/* EVM Opcodes Summary */}
                  {fullPkg.bytecode.opcodesSummary && fullPkg.bytecode.opcodesSummary.length > 0 && (
                    <div className="p-3 rounded-lg bg-[#07080B] border border-[#14161E] space-y-1.5">
                      <div className="text-[11px] font-bold text-white flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>EVM Opcode Dispatch Table</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {fullPkg.bytecode.opcodesSummary.map((op, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-black/60 border border-[#20222C] text-[10px] text-purple-300 font-mono"
                          >
                            {op}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: CONSTRUCTOR CALLDATA (HEX FOR ETHERSCAN) */}
              {bytecodeSubView === "constructor" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#090A0E] border border-cyan-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-white text-xs flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          <span>Constructor Arguments ABI-Encoded (Raw Hex)</span>
                        </h4>
                        <p className="text-[11px] text-[#8E9299]">
                          Paste this exact string into the <strong className="text-white">"Constructor Arguments ABI-encoded"</strong> input box on the Etherscan verification form (without leading 0x).
                        </p>
                      </div>

                      <button
                        type="button"
                        id="btn-copy-constructor-hex"
                        onClick={() => handleCopy(constructorArgsInfo.hex, "constructor_hex")}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                      >
                        {copiedKey === "constructor_hex" ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                        <span>{copiedKey === "constructor_hex" ? "Copied Hex!" : "Copy Constructor Hex"}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-[#050608] rounded-lg border border-[#161820] text-[10px] text-cyan-300 font-mono break-all max-h-36 overflow-y-auto select-all">
                      {constructorArgsInfo.hex}
                    </div>

                    {/* Decoded Parameters Table */}
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <span className="text-[11px] font-bold text-[#E0E0E0]">Decoded Constructor Parameters:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-black/40 border border-white/5">
                          <span className="text-[#8E9299] block text-[10px]">string name</span>
                          <span className="text-white font-bold">{token.name}</span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/5">
                          <span className="text-[#8E9299] block text-[10px]">string symbol</span>
                          <span className="text-white font-bold">{token.symbol}</span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/5">
                          <span className="text-[#8E9299] block text-[10px]">address initialOwner</span>
                          <span className="text-cyan-300 font-mono text-[10px] break-all">
                            {token.deployerAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/5">
                          <span className="text-[#8E9299] block text-[10px]">uint256 initialSupply</span>
                          <span className="text-emerald-300 font-mono text-[10px]">
                            {token.initialSupply || "1,000,000,000"} tokens ({token.decimals || 18} decimals)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 3: SOLIDITY SOURCE */}
              {bytecodeSubView === "source" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Flattened Single-File Contract (.sol)</span>
                      <span className="text-[10px] text-[#8E9299]">Ready for direct paste into Etherscan verification editor</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-copy-solidity-source"
                        onClick={() => handleCopy(fullPkg.soliditySource.code, "solidity_source_code")}
                        className="px-2.5 py-1 rounded bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        {copiedKey === "solidity_source_code" ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3 text-black" />}
                        <span>{copiedKey === "solidity_source_code" ? "Copied Source!" : "Copy Source (.sol)"}</span>
                      </button>

                      <button
                        type="button"
                        id="btn-download-solidity-file"
                        onClick={() => {
                          const blob = new Blob([fullPkg.soliditySource.code], { type: "text/plain;charset=utf-8" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${token.symbol}_Contract.sol`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="px-2.5 py-1 rounded bg-[#1A1C24] hover:bg-[#252834] text-gray-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download .sol</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-3 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] text-[10px] text-cyan-300 overflow-x-auto max-h-72 overflow-y-auto scrollbar-thin select-all">
                    <code>{fullPkg.soliditySource.code}</code>
                  </pre>
                </div>
              )}

              {/* VIEW 4: ABI (4 FORMATS) */}
              {bytecodeSubView === "abi" && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#E0E0E0]">Contract ABI (Application Binary Interface)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Multi-Format
                      </span>
                    </div>

                    <button
                      type="button"
                      id="btn-copy-active-abi"
                      onClick={() => {
                        const code =
                          abiFormat === "single_line_json"
                            ? singleLineJsonAbi
                            : abiFormat === "single_line_human"
                            ? singleLineHumanAbi
                            : abiFormat === "single_line_ethers"
                            ? singleLineEthersCode
                            : JSON.stringify(tokenAbi, null, 2);
                        handleCopy(code, "token_abi_copied");
                      }}
                      className="px-2.5 py-1 rounded bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      {copiedKey === "token_abi_copied" ? (
                        <Check className="w-3 h-3 text-black" />
                      ) : (
                        <Copy className="w-3 h-3 text-black" />
                      )}
                      <span>{copiedKey === "token_abi_copied" ? "Copied!" : "Copy Active ABI"}</span>
                    </button>
                  </div>

                  {/* Sub-format toggles */}
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-[#060608] border border-[#1F1F23] rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAbiFormat("single_line_json")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        abiFormat === "single_line_json"
                          ? "bg-purple-600 text-white font-bold"
                          : "text-[#8E9299] hover:text-white"
                      }`}
                    >
                      1. Single-Line JSON (Minified)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbiFormat("single_line_human")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        abiFormat === "single_line_human"
                          ? "bg-purple-600 text-white font-bold"
                          : "text-[#8E9299] hover:text-white"
                      }`}
                    >
                      2. Single-Line Human (Ethers/Viem)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbiFormat("single_line_ethers")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        abiFormat === "single_line_ethers"
                          ? "bg-purple-600 text-white font-bold"
                          : "text-[#8E9299] hover:text-white"
                      }`}
                    >
                      3. Single-Line Ethers Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbiFormat("multiline")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        abiFormat === "multiline"
                          ? "bg-purple-600 text-white font-bold"
                          : "text-[#8E9299] hover:text-white"
                      }`}
                    >
                      4. Multi-Line Tree
                    </button>
                  </div>

                  {/* Format displays */}
                  {abiFormat === "single_line_json" && (
                    <div className="p-3 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] text-[11px] text-cyan-400 overflow-x-auto whitespace-nowrap scrollbar-thin select-all">
                      <span className="text-[#555] select-none mr-2">1:</span>
                      <code>{singleLineJsonAbi}</code>
                    </div>
                  )}

                  {abiFormat === "single_line_human" && (
                    <div className="p-3 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] text-[11px] text-emerald-300 overflow-x-auto whitespace-nowrap scrollbar-thin select-all">
                      <span className="text-[#555] select-none mr-2">1:</span>
                      <code>{singleLineHumanAbi}</code>
                    </div>
                  )}

                  {abiFormat === "single_line_ethers" && (
                    <div className="p-3 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] text-[11px] text-purple-300 overflow-x-auto whitespace-nowrap scrollbar-thin select-all">
                      <span className="text-[#555] select-none mr-2">1:</span>
                      <code>{singleLineEthersCode}</code>
                    </div>
                  )}

                  {abiFormat === "multiline" && (
                    <pre className="p-3 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] text-[10px] text-cyan-400 overflow-x-auto max-h-56 overflow-y-auto select-all">
                      <code>{JSON.stringify(tokenAbi, null, 2)}</code>
                    </pre>
                  )}

                  {/* Single line CLI invocation helper */}
                  <div className="p-2.5 bg-[#0e0e12] border border-[#22222a] rounded-lg flex items-center justify-between text-[11px] text-[#A0A0B0]">
                    <span className="truncate mr-2">
                      <span className="text-amber-400 font-bold mr-1">CLI One-Liner:</span>
                      <code className="text-gray-300">{singleLineCastCommand}</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(singleLineCastCommand, "cast_cmd")}
                      className="text-xs text-amber-400 hover:text-amber-300 flex-shrink-0 cursor-pointer"
                    >
                      {copiedKey === "cast_cmd" ? "Copied!" : "Copy CLI"}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 5: STEP-BY-STEP ETHERSCAN VERIFICATION GUIDE */}
              {bytecodeSubView === "guide" && (
                <div className="space-y-4 font-sans text-xs">
                  {/* Part 1: How to find Bytecode on Etherscan */}
                  <div className="p-4 rounded-xl bg-[#090A0E] border border-[#1F222E] space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Search className="w-4 h-4" />
                      <h4 className="font-bold text-sm text-white">
                        Part 1: How to Find Bytecode on Etherscan.io (Existing Contracts)
                      </h4>
                    </div>
                    <ol className="space-y-2 list-decimal list-inside text-[#B0B4C0] leading-relaxed">
                      <li>
                        Go to <code className="text-cyan-300 bg-black/60 px-1 py-0.5 rounded">https://etherscan.io</code> (or <code className="text-cyan-300 bg-black/60 px-1 py-0.5 rounded">sepolia.etherscan.io</code> for testnet).
                      </li>
                      <li>
                        Paste your contract address (<code className="text-white font-mono">{token.contractAddress}</code>) into the search bar and press Enter.
                      </li>
                      <li>
                        Click the <strong className="text-white">"Contract"</strong> tab located beneath the Overview section.
                      </li>
                      <li>
                        <strong>If unverified:</strong> Etherscan displays the raw EVM Bytecode directly, with two sections:
                        <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-gray-400">
                          <li><strong className="text-white">Deployed Bytecode (Runtime code):</strong> The exact opcodes residing on the blockchain at this address.</li>
                          <li><strong className="text-white">Contract Creation Code (InitCode):</strong> The constructor bytecode executed when the contract was created.</li>
                        </ul>
                      </li>
                      <li>
                        <strong>If verified:</strong> Scroll below the Solidity source code and ABI. Under the section titled <strong className="text-white">"Contract Bytecode"</strong>, you will find both the Deployed Bytecode and Constructor Arguments!
                      </li>
                    </ol>
                  </div>

                  {/* Part 2: How to Verify & Publish Contract on Etherscan */}
                  <div className="p-4 rounded-xl bg-[#090A0E] border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <h4 className="font-bold text-sm text-white">
                          Part 2: Step-by-Step Etherscan Verification &amp; Publishing
                        </h4>
                      </div>
                      <a
                        href={etherscanUrls.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Verification Form</span>
                        <ExternalLink className="w-3 h-3 text-black" />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-lg bg-[#050608] border border-white/5 space-y-1.5">
                        <span className="font-bold text-cyan-300 block text-xs">Step 1: Contract Details</span>
                        <p className="text-[#8E9299] text-[11px]">
                          Enter contract address and select:
                        </p>
                        <ul className="text-[11px] text-gray-300 space-y-1 font-mono">
                          <li>&bull; Compiler Type: <strong className="text-white">Solidity (Single file)</strong></li>
                          <li>&bull; Compiler Version: <strong className="text-cyan-300">v0.8.20+commit.a1b79de6</strong></li>
                          <li>&bull; Open Source License: <strong className="text-amber-300">3) MIT License (MIT)</strong></li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg bg-[#050608] border border-white/5 space-y-1.5">
                        <span className="font-bold text-emerald-300 block text-xs">Step 2: Source &amp; Optimization</span>
                        <p className="text-[#8E9299] text-[11px]">
                          In the main code editor form:
                        </p>
                        <ul className="text-[11px] text-gray-300 space-y-1 font-mono">
                          <li>&bull; Paste source from <strong className="text-white">Tab 3 (Solidity Source)</strong></li>
                          <li>&bull; Optimization: Select <strong className="text-green-300">Yes</strong></li>
                          <li>&bull; Runs: Enter <strong className="text-green-300">200</strong></li>
                          <li>&bull; EVM Version: Select <strong className="text-purple-300">Paris</strong> (or default)</li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg bg-[#050608] border border-white/5 space-y-1.5">
                        <span className="font-bold text-amber-300 block text-xs">Step 3: Constructor Calldata (Hex)</span>
                        <p className="text-[#8E9299] text-[11px]">
                          In the "Constructor Arguments ABI-encoded" box:
                        </p>
                        <ul className="text-[11px] text-gray-300 space-y-1 font-mono">
                          <li>&bull; Copy the hex from <strong className="text-cyan-300">Tab 2 (Constructor Calldata)</strong></li>
                          <li>&bull; Ensure it does NOT have a leading <code className="text-red-400">0x</code></li>
                          <li>&bull; Click <strong className="text-white">"Verify and Publish"</strong></li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg bg-[#050608] border border-white/5 space-y-1.5">
                        <span className="font-bold text-purple-300 block text-xs">Step 4: Success &amp; Web3 Unlocked</span>
                        <p className="text-[#8E9299] text-[11px]">
                          Within 10-30 seconds:
                        </p>
                        <ul className="text-[11px] text-gray-300 space-y-1">
                          <li>&bull; Etherscan displays a green checkmark: <strong className="text-green-400">Contract Verified</strong></li>
                          <li>&bull; Unlocks <strong className="text-white">Read Contract</strong> &amp; <strong className="text-white">Write Contract</strong> tabs for direct MetaMask / Trust Wallet interactions</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "foundry" && (
            <div className="space-y-6 font-mono text-xs">
              {/* Header Overview Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0E1015] to-[#12141C] border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                      Foundry CLI & Etherscan Deploy Hub
                    </span>
                    <span className="text-white font-bold text-sm">
                      {token.name} ({token.symbol})
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E9299] mt-1">
                    Execute deterministic contract deployment via Foundry <code className="text-emerald-300">forge script</code>, import keystore with <code className="text-emerald-300">cast</code>, and interact on Etherscan with Web3 wallets.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(dotEnvContent, "copy_full_dotenv")}
                    className="px-3 py-1.5 rounded-lg bg-[#161820] hover:bg-[#202533] border border-[#2B3245] text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all"
                  >
                    {copiedKey === "copy_full_dotenv" ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>{copiedKey === "copy_full_dotenv" ? "Copied .env!" : "Copy .env"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDotEnv}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .env</span>
                  </button>
                </div>
              </div>

              {/* 3 Step Deployment Pipeline Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#0A0A0C] border border-cyan-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      STEP 1
                    </span>
                    <span className="text-[10px] text-[#8E9299]">1 min setup</span>
                  </div>
                  <h4 className="font-bold text-white text-xs">Set Up Environment</h4>
                  <p className="text-[11px] text-[#8E9299]">
                    Create a <code className="text-cyan-300">.env</code> file with RPC_URL, PRIVATE_KEY (from your wallet app), and ETHERSCAN_API_KEY.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0A0A0C] border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      STEP 2
                    </span>
                    <span className="text-[10px] text-[#8E9299]">Foundry CLI</span>
                  </div>
                  <h4 className="font-bold text-white text-xs">Execute Deployment</h4>
                  <p className="text-[11px] text-[#8E9299]">
                    Run <code className="text-amber-300">forge script</code> or <code className="text-amber-300">forge create</code> with <code className="text-amber-300">--broadcast</code> and <code className="text-amber-300">--verify</code> flags.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0A0A0C] border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      STEP 3
                    </span>
                    <span className="text-[10px] text-[#8E9299]">Browser / Mobile</span>
                  </div>
                  <h4 className="font-bold text-white text-xs">Interact via Etherscan</h4>
                  <p className="text-[11px] text-[#8E9299]">
                    Navigate to Etherscan, connect your MetaMask, Uniswap, or Trust Wallet, and interact via the verified contract tab.
                  </p>
                </div>
              </div>

              {/* STEP 1: Detailed .env Configuration & Key Retrieval */}
              <div className="p-4 bg-[#0A0A0C] rounded-xl border border-[#1F1F23] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileDown className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      1. Environment Configuration File (.env)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(dotEnvContent, "dotenv_tab_btn")}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === "dotenv_tab_btn" ? "Copied!" : "Copy .env Content"}</span>
                  </button>
                </div>

                <pre className="bg-[#12141A] p-3.5 rounded-lg border border-[#1F222E] font-mono text-[11px] text-cyan-300 overflow-x-auto leading-relaxed select-all">
                  <code>{dotEnvContent}</code>
                </pre>

                <div className="p-3 bg-[#12141A] rounded-lg border border-[#222736] space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Export Private Key Security Guidance</span>
                  </div>
                  <p className="text-[11px] text-[#8E9299] leading-relaxed">
                    <strong>Export Private Key:</strong> Retrieve the account private key from your wallet app (MetaMask, Trust Wallet, or Uniswap Wallet settings) and pass it safely into Foundry using an environment variable (<code className="text-amber-300">.env</code> file) or by importing it directly into an encrypted Foundry keystore profile using <code className="text-amber-300">cast wallet import</code>. Never commit raw private keys to public git repositories.
                  </p>
                </div>
              </div>

              {/* STEP 2: Foundry CLI Commands */}
              <div className="p-4 bg-[#0A0A0C] rounded-xl border border-[#1F1F23] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      2. Execute Deployment (Foundry CLI)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono">Foundry Toolkit</span>
                </div>

                {/* Sub-step A: Cast Wallet Import */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                    <span className="font-semibold text-white">A. Import Key Securely into an Encrypted Keystore</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(castCommand, "cast_cmd")}
                      className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === "cast_cmd" ? "Copied!" : "Copy Command"}</span>
                    </button>
                  </div>
                  <pre className="bg-[#12141A] p-3 rounded-lg border border-[#1F222E] font-mono text-[11px] text-amber-300 overflow-x-auto leading-relaxed select-all">
                    <code>{castCommand}</code>
                  </pre>
                  <p className="text-[10px] text-[#8E9299]">
                    You will be prompted to set an encryption password. Foundry saves the key safely to <code className="text-slate-300">~/.foundry/keystores/deployer</code>.
                  </p>
                </div>

                {/* Sub-step B: Forge Script Deploy */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                    <span className="font-semibold text-white">B. Deploy Script with --broadcast & --verify</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(forgeCommand, "forge_cmd")}
                      className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === "forge_cmd" ? "Copied!" : "Copy Command"}</span>
                    </button>
                  </div>
                  <pre className="bg-[#12141A] p-3 rounded-lg border border-[#1F222E] font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed select-all">
                    <code>{forgeCommand}</code>
                  </pre>
                </div>

                {/* Mobile Wallet Notes */}
                <div className="p-3 bg-[#12141A] rounded-lg border border-purple-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[11px]">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Connecting Mobile Wallets (MetaMask, Trust Wallet, Uniswap Wallet)</span>
                  </div>
                  <p className="text-[11px] text-[#8E9299] leading-relaxed">
                    Foundry is a developer-focused CLI and testing framework. It does not connect to browser extensions or mobile wallet apps in the same way consumer dApps do. Instead, Foundry uses RPC URLs and Private Keys/Keystores rather than browser extensions. To deploy with your mobile wallet funds, export your private key or load its address into a local keystore.
                  </p>
                </div>
              </div>

              {/* STEP 3: Interact via Etherscan (Browser / Mobile) */}
              <div className="p-4 bg-[#0A0A0C] rounded-xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      3. Post-Deploy Interaction on Etherscan
                    </span>
                  </div>
                  <a
                    href={`${chainMeta.explorerUrl}${token.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center gap-1 transition-all"
                  >
                    <span>View on {chainMeta.name} Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 bg-[#12141A] rounded-lg border border-[#222736] space-y-2">
                  <p className="text-[11px] text-[#8E9299] leading-relaxed">
                    <strong>Post-Deploy Interaction on Etherscan:</strong> Once verified, open the contract address on Etherscan, click the <strong>Contract &rarr; Write Contract</strong> tab, and use <strong>Connect to Web3</strong> to link MetaMask, Trust Wallet (via WalletConnect), or Uniswap Wallet directly to execute functions.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1F222E]">
                    <div className="p-2 bg-[#0A0B0E] rounded border border-[#1A1D26] space-y-1">
                      <span className="text-cyan-400 font-bold text-[11px]">1. Open Contract</span>
                      <p className="text-[10px] text-[#8E9299]">Search <code className="text-slate-300">{token.contractAddress.slice(0, 8)}...</code> on {chainMeta.name} Explorer</p>
                    </div>
                    <div className="p-2 bg-[#0A0B0E] rounded border border-[#1A1D26] space-y-1">
                      <span className="text-amber-400 font-bold text-[11px]">2. Connect to Web3</span>
                      <p className="text-[10px] text-[#8E9299]">Select MetaMask, Trust Wallet, or Uniswap Wallet via WalletConnect</p>
                    </div>
                    <div className="p-2 bg-[#0A0B0E] rounded border border-[#1A1D26] space-y-1">
                      <span className="text-emerald-400 font-bold text-[11px]">3. Execute Functions</span>
                      <p className="text-[10px] text-[#8E9299]">Invoke <code className="text-slate-300">transfer()</code>, <code className="text-slate-300">mint()</code>, or proxy admin calls</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stream_artifacts" && (
            <div className="animate-in fade-in duration-150">
              <StreamContractArtifactModal
                params={{
                  contractAddress: token.contractAddress,
                  tokenId: token.tokenId,
                  networkId: token.networkId,
                  chain: token.chain,
                  tokenStandard: token.tokenStandard,
                  name: token.name,
                  symbol: token.symbol,
                  decimals: token.decimals,
                  initialSupply: token.initialSupply,
                  launchStatus: token.launchStatus,
                  deployerAddress: token.deployerAddress,
                }}
                isEmbedded={true}
              />
            </div>
          )}

          {activeTab === "metamask" && (
            <div className="space-y-5 animate-fade-in">
              {/* Sovereign Deployer Synchronization Card */}
              <div className="bg-[#0A0A0C] p-4 rounded-xl border border-orange-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl select-none">🦊</span>
                    <div>
                      <span className="font-bold text-white text-xs font-mono uppercase tracking-wider block">
                        MetaMask Deployer Synchronization
                      </span>
                      <span className="text-[11px] text-[#8E9299]">
                        Sync this token's authority to your MetaMask browser account
                      </span>
                    </div>
                  </div>
                  {onOpenMetaMaskSync && (
                    <button
                      type="button"
                      onClick={onOpenMetaMaskSync}
                      className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F24] border border-[#2B2B38] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <span>🦊</span>
                      <span>MetaMask Studio</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#121216] p-3 rounded-lg border border-[#1F1F23] space-y-1">
                    <span className="text-[#8E9299] text-[10px] uppercase font-mono block">Token Deployer Address:</span>
                    <div className="font-mono text-xs text-white truncate" title={token.deployerAddress}>
                      {token.deployerAddress}
                    </div>
                  </div>

                  <div className="bg-[#121216] p-3 rounded-lg border border-[#1F1F23] space-y-1">
                    <span className="text-[#8E9299] text-[10px] uppercase font-mono block">MetaMask Synced Address:</span>
                    <div className="font-mono text-xs text-emerald-400 truncate" title={metaMaskDeployer || "Not Connected"}>
                      {metaMaskDeployer || "No MetaMask connected"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {metaMaskDeployer && token.deployerAddress.toLowerCase() === metaMaskDeployer.toLowerCase() ? (
                      <span className="text-xs text-green-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span>Token deployer is fully synchronized with your MetaMask wallet</span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-mono flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Deployer differs from your connected MetaMask address</span>
                      </span>
                    )}
                  </div>

                  {metaMaskDeployer && token.deployerAddress.toLowerCase() !== metaMaskDeployer.toLowerCase() && onUpdateTokenDeployer && (
                    <button
                      type="button"
                      onClick={() => onUpdateTokenDeployer(token.id, metaMaskDeployer)}
                      className="px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md self-start sm:self-auto"
                    >
                      Set My MetaMask as Deployer
                    </button>
                  )}
                </div>
              </div>

              {/* Integration Mechanics Summary */}
              <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#F27D26]" />
                    <span className="font-bold text-white text-xs font-mono uppercase tracking-wider">
                      MetaMask EVM Integration Mechanics ({token.symbol})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26] font-bold">
                    ERC-20 Compliant
                  </span>
                </div>
                <p className="text-xs text-[#8E9299] leading-relaxed">
                  MetaMask queries deployed smart contracts via JSON-RPC read calls (<code className="text-[#F27D26]">eth_call</code>) to auto-populate token metadata, divide integer balances by <code className="text-white">10^{token.decimals || 18}</code>, and construct signed transactions.
                </p>
              </div>

              {/* 3 Core Mechanics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Importing */}
                <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2 font-mono">
                  <span className="text-[10px] text-[#8E9299] uppercase font-bold block">1. Importing & Auto-Fill</span>
                  <div className="text-xs text-white">eth_call Queries:</div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-[#8E9299]">
                      <span>symbol():</span>
                      <span className="text-cyan-400 font-bold">0x95d89b41</span>
                    </div>
                    <div className="flex justify-between text-[#8E9299]">
                      <span>decimals():</span>
                      <span className="text-green-400 font-bold">0x313ce567</span>
                    </div>
                    <div className="flex justify-between text-[#8E9299]">
                      <span>name():</span>
                      <span className="text-purple-400 font-bold">0x06fdde03</span>
                    </div>
                  </div>
                  <div className="pt-1 text-[10px] text-[#8E9299] border-t border-[#1F1F23]">
                    Pre-fills <span className="text-white font-bold">{token.symbol}</span> with <span className="text-white font-bold">{token.decimals || 18}</span> decimals.
                  </div>
                </div>

                {/* 2. Displaying Balance */}
                <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2 font-mono">
                  <span className="text-[10px] text-[#8E9299] uppercase font-bold block">2. Displaying Balance</span>
                  <div className="text-xs text-white">balanceOf(userAddress):</div>
                  <div className="p-2 bg-[#16161A] rounded border border-[#1F1F23] text-center text-[11px]">
                    <span className="text-[#8E9299]">Formatted Balance =</span>
                    <div className="text-green-400 font-bold mt-0.5">
                      balanceOf(user) ÷ 10^{token.decimals || 18}
                    </div>
                  </div>
                  <div className="pt-1 text-[10px] text-[#8E9299] border-t border-[#1F1F23]">
                    1.0 {token.symbol} = {token.decimals === 6 ? "1,000,000" : "1,000,000,000,000,000,000"} raw units.
                  </div>
                </div>

                {/* 3. Executing Transfers */}
                <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2 font-mono">
                  <span className="text-[10px] text-[#8E9299] uppercase font-bold block">3. Executing Transfers</span>
                  <div className="text-xs text-white">transfer(recipient, amount):</div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-[#8E9299]">
                      <span>Selector:</span>
                      <span className="text-blue-400 font-bold">0xa9059cbb</span>
                    </div>
                    <div className="flex justify-between text-[#8E9299]">
                      <span>Event Watched:</span>
                      <span className="text-yellow-400">Transfer(...)</span>
                    </div>
                  </div>
                  <div className="pt-1 text-[10px] text-[#8E9299] border-t border-[#1F1F23]">
                    Amount is scaled by <span className="text-white font-bold">10^{token.decimals || 18}</span> before broadcasting.
                  </div>
                </div>
              </div>

              {/* Action: Add to MetaMask (EIP-747) */}
              <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block">
                    One-Click MetaMask Ingestion (EIP-747 wallet_watchAsset)
                  </span>
                  <span className="text-[11px] text-[#8E9299]">
                    Trigger browser wallet asset import with contract address <code className="text-[#F27D26]">{token.contractAddress.slice(0, 10)}...</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof window !== "undefined" && (window as any).ethereum) {
                      try {
                        await (window as any).ethereum.request({
                          method: "wallet_watchAsset",
                          params: {
                            type: "ERC20",
                            options: {
                              address: token.contractAddress,
                              symbol: token.symbol.slice(0, 11),
                              decimals: token.decimals || 18,
                            },
                          },
                        });
                      } catch {
                        // ignore dismiss
                      }
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Import Into MetaMask</span>
                </button>
              </div>

              {/* Canonical IERC20 Interface snippet */}
              <div className="bg-[#0A0A0C] rounded-xl border border-[#1F1F23] overflow-hidden">
                <div className="p-3 bg-[#16161A] border-b border-[#1F1F23] flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">
                    Canonical IERC20.sol Interface
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(METAMASK_IERC20_SOLIDITY, "sol_ierc20_modal")}
                    className="text-[#F27D26] hover:underline text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "sol_ierc20_modal" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "sol_ierc20_modal" ? "Copied" : "Copy Interface"}</span>
                  </button>
                </div>
                <pre className="p-4 font-mono text-[11px] text-[#8E9299] max-h-60 overflow-y-auto leading-relaxed">
{METAMASK_IERC20_SOLIDITY}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "deployment_history" && (
            <div className="space-y-6">
              {/* Header Status & Deployment State Banner */}
              <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-mono tracking-wider text-[#8E9299]">Current Deployment Status</span>
                    {isMarkedDeployed ? (
                      <span
                        id="modal-status-badge-deployed"
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>DEPLOYED ON-CHAIN</span>
                      </span>
                    ) : (
                      <span
                        id="modal-status-badge-undeployed"
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-xs font-medium"
                      >
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>UNDEPLOYED (DRAFT)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8E9299]">
                    {isMarkedDeployed
                      ? "This token is marked as actively deployed. On-chain contract address and deployer keystore are registered."
                      : "This token is in draft/staged mode. You can mark it as deployed once broadcast to the network."}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    id="btn-toggle-deployed-status"
                    type="button"
                    onClick={handleToggleDeployment}
                    className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      isMarkedDeployed
                        ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
                        : "bg-emerald-600 hover:bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-950"
                    }`}
                  >
                    {isMarkedDeployed ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Mark as Undeployed</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                        <span>Mark as Deployed</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn-open-record-attempt"
                    type="button"
                    onClick={() => setIsRecordingAttempt(!isRecordingAttempt)}
                    className="flex-1 md:flex-none px-3.5 py-2 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isRecordingAttempt ? "Close Form" : "Record Attempt"}</span>
                  </button>
                </div>
              </div>

              {/* Record New Deployment Attempt Drawer / Form */}
              {isRecordingAttempt && (
                <div className="p-4 bg-[#111115] rounded-xl border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-amber-400" />
                      <span className="font-mono font-bold text-white text-xs">
                        Record New On-Chain Deployment Attempt
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#8E9299]">Logs to token history</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-[#8E9299] mb-1">
                        Deployer Address Used
                      </label>
                      <input
                        id="input-deployer-address"
                        type="text"
                        value={attemptAddressInput}
                        onChange={(e) => setAttemptAddressInput(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-[#0A0A0C] border border-[#1F1F23] focus:border-amber-500/60 rounded px-3 py-1.5 font-mono text-xs text-white outline-none"
                      />
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setAttemptAddressInput(token.deployerAddress)}
                          className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                        >
                          Use Genesis Deployer
                        </button>
                        {metaMaskDeployer && (
                          <button
                            type="button"
                            onClick={() => setAttemptAddressInput(metaMaskDeployer)}
                            className="text-[10px] font-mono text-orange-400 hover:underline cursor-pointer"
                          >
                            Use MetaMask Address
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#8E9299] mb-1">
                        Target Network
                      </label>
                      <select
                        id="select-deploy-network"
                        value={attemptNetworkInput}
                        onChange={(e) => setAttemptNetworkInput(e.target.value)}
                        className="w-full bg-[#0A0A0C] border border-[#1F1F23] focus:border-amber-500/60 rounded px-3 py-1.5 font-mono text-xs text-white outline-none"
                      >
                        <option value="ethereum">Ethereum Mainnet (ChainID: 1)</option>
                        <option value="polygon">Polygon PoS (ChainID: 137)</option>
                        <option value="arbitrum">Arbitrum One (ChainID: 42161)</option>
                        <option value="optimism">Optimism Mainnet (ChainID: 10)</option>
                        <option value="base">Base Mainnet (ChainID: 8453)</option>
                        <option value="binance">BNB Smart Chain (ChainID: 56)</option>
                        <option value="avalanche">Avalanche C-Chain (ChainID: 43114)</option>
                        <option value="solana">Solana Mainnet-Beta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#8E9299] mb-1">
                        Deployment Status
                      </label>
                      <select
                        id="select-deploy-status"
                        value={attemptStatusInput}
                        onChange={(e) => setAttemptStatusInput(e.target.value as "Success" | "Failed" | "Pending")}
                        className="w-full bg-[#0A0A0C] border border-[#1F1F23] focus:border-amber-500/60 rounded px-3 py-1.5 font-mono text-xs text-white outline-none"
                      >
                        <option value="Success">Success (Contract Deployed & Verified)</option>
                        <option value="Failed">Failed (Revert / Gas Exhaustion)</option>
                        <option value="Pending">Pending (Mempool Broadcast)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#8E9299] mb-1">
                        Deployment Notes & Parameters
                      </label>
                      <input
                        id="input-deploy-notes"
                        type="text"
                        value={attemptNotesInput}
                        onChange={(e) => setAttemptNotesInput(e.target.value)}
                        placeholder="e.g., Cast broadcast with CREATE2 deterministic salt"
                        className="w-full bg-[#0A0A0C] border border-[#1F1F23] focus:border-amber-500/60 rounded px-3 py-1.5 font-mono text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F1F23]">
                    <button
                      type="button"
                      onClick={() => setIsRecordingAttempt(false)}
                      className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-submit-deployment-attempt"
                      type="button"
                      onClick={handleRecordNewAttempt}
                      className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Log Deployment Attempt</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Deployment Attempts List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-bold text-white text-xs uppercase tracking-wider">
                      Deployment Attempts ({localHistory.length})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#8E9299]">
                    Chronological audit log of deployer transactions
                  </span>
                </div>

                {localHistory.length === 0 ? (
                  <div className="bg-[#0A0A0C] rounded-xl p-8 border border-[#1F1F23] text-center space-y-2">
                    <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="font-mono text-sm text-zinc-300">No deployment attempts recorded</p>
                    <p className="text-xs text-[#8E9299]">
                      Click "Record Attempt" above to log on-chain deployment transactions for this token.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {localHistory.map((attempt, index) => {
                      const isSuccess = attempt.status === "Success";
                      const isFailed = attempt.status === "Failed";
                      const isPending = attempt.status === "Pending";

                      return (
                        <div
                          key={attempt.id || index}
                          id={`deployment-attempt-${attempt.id}`}
                          className={`bg-[#0A0A0C] rounded-xl border p-4 space-y-3 transition-all ${
                            isSuccess
                              ? "border-emerald-500/30 hover:border-emerald-500/50"
                              : isFailed
                              ? "border-rose-500/30 hover:border-rose-500/50"
                              : "border-amber-500/30 hover:border-amber-500/50"
                          }`}
                        >
                          {/* Top Row: Status badge, Timestamp, Network */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F23] pb-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                                  isSuccess
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : isFailed
                                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {isSuccess ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : isFailed ? (
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                ) : (
                                  <Clock className="w-3 h-3 text-amber-400" />
                                )}
                                <span>{attempt.status.toUpperCase()}</span>
                              </span>

                              <span className="px-2 py-0.5 rounded bg-[#16161A] text-[10px] font-mono text-[#8E9299] border border-[#1F1F23]">
                                Attempt #{localHistory.length - index}
                              </span>

                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-[10px] font-mono text-cyan-300 border border-cyan-500/20 uppercase">
                                {attempt.network}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-mono text-[#8E9299]">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              <span title={attempt.timestamp}>
                                {new Date(attempt.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Middle Row: Deployer Address and Contract */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-[#16161A] p-2.5 rounded-lg border border-[#1F1F23] space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                                <span className="font-semibold uppercase tracking-wider text-[10px]">Deployer Address Used</span>
                                <span className="font-mono text-[9px] text-zinc-500">Signer</span>
                              </div>
                              <div className="flex items-center justify-between font-mono text-xs text-amber-300 break-all">
                                <span>{attempt.deployerAddress}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(attempt.deployerAddress, `dep_addr_${attempt.id}`)}
                                  className="ml-2 text-[#8E9299] hover:text-white cursor-pointer shrink-0"
                                  title="Copy Deployer Address"
                                >
                                  {copiedKey === `dep_addr_${attempt.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="bg-[#16161A] p-2.5 rounded-lg border border-[#1F1F23] space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                                <span className="font-semibold uppercase tracking-wider text-[10px]">Contract Address</span>
                                <span className="font-mono text-[9px] text-zinc-500">Target</span>
                              </div>
                              <div className="flex items-center justify-between font-mono text-xs text-cyan-300 break-all">
                                <span>{attempt.contractAddress || token.contractAddress}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(attempt.contractAddress || token.contractAddress, `contract_${attempt.id}`)}
                                  className="ml-2 text-[#8E9299] hover:text-white cursor-pointer shrink-0"
                                  title="Copy Contract Address"
                                >
                                  {copiedKey === `contract_${attempt.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Tx Hash & Gas */}
                          {attempt.txHash && (
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-[#070709] border border-[#1F1F23] text-[11px] font-mono">
                              <div className="flex items-center gap-2 break-all">
                                <span className="text-zinc-500">Tx Hash:</span>
                                <span className="text-emerald-400 font-mono">{attempt.txHash}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {attempt.gasUsed && (
                                  <span className="text-[#8E9299]">
                                    Gas: <strong className="text-zinc-300">{attempt.gasUsed}</strong>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopy(attempt.txHash || "", `tx_${attempt.id}`)}
                                  className="text-[#8E9299] hover:text-white cursor-pointer flex items-center gap-1"
                                >
                                  {copiedKey === `tx_${attempt.id}` ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>{copiedKey === `tx_${attempt.id}` ? "Copied" : "Copy Tx"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {attempt.notes && (
                            <div className="text-xs text-[#8E9299] flex items-start gap-1.5 bg-[#16161A]/50 p-2 rounded">
                              <span className="text-zinc-500 font-mono text-[10px] uppercase shrink-0">Notes:</span>
                              <span className="text-zinc-300 font-mono text-[11px]">{attempt.notes}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "sonic_anthem" && (
            <div className="space-y-6">
              <audio ref={anthemAudioRef} onEnded={() => setIsPlayingAnthem(false)} />

              {/* Header Banner */}
              <div className="relative rounded-xl bg-gradient-to-r from-purple-950/40 via-[#131124] to-indigo-950/40 border border-purple-500/30 p-5 overflow-hidden">
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                        <Music className="w-3 h-3 text-purple-400" />
                        Lyria 3 Neural Audio
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Solfeggio & Fibonacci Φ
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{token.name}</span>
                      <span className="text-purple-400 font-mono">({token.symbol})</span>
                      <span className="text-xs font-normal text-gray-400">Sonic Identity Theme</span>
                    </h3>
                    <p className="text-xs text-gray-300 max-w-xl">
                      Generate an authentic, high-fidelity Web3 protocol musical anthem and Solfeggio harmonic frequency wave aligned with this token&apos;s smart contract genesis.
                    </p>
                  </div>

                  {onOpenMultimodalHub && (
                    <button
                      type="button"
                      onClick={() => onOpenMultimodalHub(token, "music")}
                      className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Open Multimodal Studio</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Harmonic Frequency Selector */}
              <div className="bg-[#0C0D14] p-4 rounded-xl border border-[#1E1F2E] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-purple-400" />
                    Harmonic Tuning Frequency (Hz)
                  </span>
                  <span className="text-[11px] font-mono text-purple-300">
                    Active: <strong>{selectedAnthemHz} Hz</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { hz: 528, label: "528 Hz - Miracle & Genesis", desc: "DNA repair & transformation" },
                    { hz: 432, label: "432 Hz - Universal Harmony", desc: "Verdi mathematical sacred scale" },
                    { hz: 699, label: "699 Hz - Fibonacci Golden Ratio", desc: "432 × 1.618 golden spiral" },
                    { hz: 396, label: "396 Hz - Root Foundation", desc: "Liberation & stability" },
                    { hz: 639, label: "639 Hz - Community Wave", desc: "Harmonic connection & governance" },
                    { hz: 963, label: "963 Hz - Crown Genesis Light", desc: "Pure decentralized awakening" },
                  ].map((preset) => (
                    <button
                      key={preset.hz}
                      type="button"
                      onClick={() => setSelectedAnthemHz(preset.hz)}
                      className={`p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                        selectedAnthemHz === preset.hz
                          ? "bg-purple-900/30 border-purple-500 text-white shadow-sm"
                          : "bg-[#07080D] border-[#181926] text-gray-400 hover:text-white hover:bg-[#10121C]"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{preset.hz} Hz</span>
                        {selectedAnthemHz === preset.hz && <Check className="w-3 h-3 text-purple-400" />}
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-0.5 line-clamp-1">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Action Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerateTokenAnthem}
                  disabled={isGeneratingAnthem}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-[#F27D26] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAnthem ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing {token.symbol} Anthem & Harmonics...</span>
                    </>
                  ) : (
                    <>
                      <Music className="w-4 h-4" />
                      <span>Synthesize {token.symbol} Musical Anthem ({selectedAnthemHz}Hz)</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-gray-400">
                  Outputs 24kHz Stereo PCM audio with Solfeggio wave resonance.
                </span>
              </div>

              {/* Track Player & Visualizer */}
              {anthemTrack && (
                <div className="bg-[#0B0C14] border border-purple-500/40 rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {anthemTrack.frequencyHz} Hz Solfeggio Tune
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/20 text-green-300">
                          Ready for Broadcast
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{anthemTrack.title}</h4>
                      {anthemTrack.lyrics && (
                        <p className="text-xs text-purple-200/80 font-mono italic">
                          &quot;{anthemTrack.lyrics}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlayAnthem}
                        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        {isPlayingAnthem ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Play Track</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadAnthem}
                        className="px-3.5 py-2 rounded-lg bg-[#161724] hover:bg-[#202234] border border-[#2A2C40] text-gray-200 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Download .wav audio"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download WAV</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic waveform visualization animation */}
                  <div className="h-12 bg-[#06070B] rounded-lg border border-[#161726] flex items-center justify-center gap-1 px-3 overflow-hidden">
                    {Array.from({ length: 48 }).map((_, idx) => {
                      const heights = [20, 35, 55, 75, 45, 90, 60, 30, 80, 100, 70, 40, 65, 85, 50, 25];
                      const baseH = heights[idx % heights.length];
                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-full transition-all duration-150 ${
                            isPlayingAnthem
                              ? "bg-gradient-to-t from-purple-600 via-indigo-500 to-[#00F0FF]"
                              : "bg-purple-950"
                          }`}
                          style={{
                            height: isPlayingAnthem ? `${Math.max(15, baseH * 0.9)}%` : "20%",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0A0A0C] border-t border-[#1F1F23] flex items-center justify-between text-xs text-[#8E9299]">
          <span className="font-mono">ID: {token.id}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-white font-medium transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
