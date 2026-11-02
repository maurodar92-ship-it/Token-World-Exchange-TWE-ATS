import { useState, useEffect, useMemo } from "react";
import { TokenRecord, GenerationConfig, ChainType, TokenStandard } from "./types";
import {
  generateTokenBatch,
  expandAllTokensToSovereignMarketCap,
  upgradeAllTokensToEnterprise,
  ensureAllTokensHavePrivateKeys,
  SOVEREIGN_RESERVE_SHARES,
  SOVEREIGN_TREASURY_SHARES,
  SOVEREIGN_OWNER,
  duplicateTokenRecord,
  duplicateTokenBatch,
} from "./utils/cryptoGenerators";
import { useTheme } from "./utils/theme";
import { Navbar, NavTabId } from "./components/Navbar";
import { BatchGenerator } from "./components/BatchGenerator";
import { TokenExplorer } from "./components/TokenExplorer";
import { TokenFilterBar, CHAIN_OPTIONS, STANDARD_OPTIONS } from "./components/TokenFilterBar";
import { SelectedTokenomicsDashboard } from "./components/SelectedTokenomicsDashboard";
import { TokenDetailModal } from "./components/TokenDetailModal";
import { ScriptHub } from "./components/ScriptHub";
import { PromptLibrary } from "./components/PromptLibrary";
import { AIAssistant } from "./components/AIAssistant";
import { HighVolumeWorkerModal } from "./components/HighVolumeWorkerModal";
import { CryptoArchitect } from "./components/CryptoArchitect";
import { TokenAnalyticsCharts } from "./components/TokenAnalyticsCharts";
import { RemixIntegration } from "./components/RemixIntegration";
import { ConstantSaveModePanel } from "./components/ConstantSaveModePanel";
import { GenesisLaunchAutomator } from "./components/GenesisLaunchAutomator";
import { TokenArtVisualizer } from "./components/TokenArtVisualizer";
import { TokenVault } from "./components/TokenVault";
import { DeploymentSimulator } from "./components/DeploymentSimulator";
import { GenreDirectory } from "./components/GenreDirectory";
import { ChainAppOrchestrator } from "./components/ChainAppOrchestrator";
import { LiquidityPoolsExplorer } from "./components/LiquidityPoolsExplorer";
import { PublicContractRegistry } from "./components/PublicContractRegistry";
import { TopFullstackCockpit } from "./components/TopFullstackCockpit";
import { TokenomicsEngine } from "./components/TokenomicsEngine";
import { QuantumAnalytics } from "./components/QuantumAnalytics";
import { QuickNavigationDock } from "./components/QuickNavigationDock";
import { persistTokenBatch, fetchTokens, secureTokensToVault, subscribeToTokens, deleteTokensBatchFromFirestore, updateBatchTokenDeploymentStatus } from "./utils/firebase";
import { continuousVaultSaver } from "./utils/continuousVaultSaver";
import { ensureTokenHasImage } from "./utils/tokenImageGenerator";
import { preloadTokenImages } from "./utils/tokenImageCache";
import { UniversalContractValidationModal } from "./components/UniversalContractValidationModal";
import { MarketDeploymentHubModal } from "./components/MarketDeploymentHubModal";
import { deployTokensToBlockchainMarket } from "./utils/blockchainMarketDeployer";
import { MemoryHealthAlertBanner } from "./components/MemoryHealthAlertBanner";
import { FirestoreQuotaAlertBanner } from "./components/FirestoreQuotaAlertBanner";
import { MemoryHealthCheckModal } from "./components/MemoryHealthCheckModal";
import { useMetaMaskSync } from "./utils/useMetaMaskSync";
import { MetaMaskDeployerSyncModal } from "./components/MetaMaskDeployerSyncModal";
import { ActiveFoundryDeployerBanner } from "./components/ActiveFoundryDeployerBanner";
import { GlobalExchangeTerminal } from "./components/GlobalExchangeTerminal";
import { GlobalExchangeSwapSellModal } from "./components/GlobalExchangeSwapSellModal";
import { WalletPortfolioView } from "./components/WalletPortfolioView";
import { MonetizationRevenueHub } from "./components/MonetizationRevenueHub";
import { ProSubscriptionModal } from "./components/ProSubscriptionModal";
import { HarmonicsStudio } from "./components/HarmonicsStudio";
import { FloatingHarmonicsPlayer } from "./components/FloatingHarmonicsPlayer";
import { MultiModalVisionHub } from "./components/MultiModalVisionHub";
import { FullstackTokenServiceManagerModal } from "./components/FullstackTokenServiceManagerModal";
import { TokenWorldAtsVenue } from "./components/TokenWorldAtsVenue";
import { EnterpriseTokenExchangeCockpit } from "./components/EnterpriseTokenExchangeCockpit";
import { RiskAnalyticsPanel } from "./components/RiskAnalyticsPanel";
import { WeeklyTree3UpdateView } from "./components/WeeklyTree3UpdateView";
import { InstitutionalSandboxView } from "./components/InstitutionalSandboxView";
import { WorldConnectivityModal } from "./components/WorldConnectivityModal";
import { SwiftGlideController } from "./components/SwiftGlideController";
import { SecurityThreatScanner } from "./components/SecurityThreatScanner";
import { MaximumSecurityLifecycleCockpit } from "./components/MaximumSecurityLifecycleCockpit";
import { SolidityCompilerFullstackView } from "./components/SolidityCompilerFullstackView";
import { GoogleWorkspaceAndFuturesHub } from "./components/GoogleWorkspaceAndFuturesHub";
import { AdvancedTradingTerminal } from "./components/AdvancedTradingTerminal";
import { RegulatoryComplianceDashboard } from "./components/RegulatoryComplianceDashboard";
import { MetaMaskMaoMaoTransferModal } from "./components/MetaMaskMaoMaoTransferModal";
import { injectMaoMaoIntoTokens } from "./utils/maoMaoToken";
import { UniversalWalletExtensionPopup } from "./components/UniversalWalletExtensionPopup";
import { FloatingWalletExtensionDrawer } from "./components/FloatingWalletExtensionDrawer";
import { ProductionExchangeDeploymentHub } from "./components/ProductionExchangeDeploymentHub";
import { LiveMarketUniswapBinanceTerminal } from "./components/LiveMarketUniswapBinanceTerminal";
import { SecMonitorComponent } from "./components/SecMonitorComponent";
import { UniversalPageHeaderLogo } from "./components/UniversalPageHeaderLogo";
import { FourCornersOfTheWorld } from "./components/FourCornersOfTheWorld";
import { TokenWorldUnifiedAuthGateway } from "./components/TokenWorldUnifiedAuthGateway";
import { TokenWorldAtsTerminal } from "./components/TokenWorldAtsTerminal";
import { withVIPProtection } from "./components/withVIPProtection";
import { MembershipProvider, useMembership } from "./context/MembershipContext";
import { MembershipPortalModal } from "./components/membership/MembershipPortalModal";
import { TierGatedModal } from "./components/membership/TierGatedModal";
import { DiscountCenter } from "./components/membership/DiscountCenter";
import { ShowroomSyncProvider } from "./context/ShowroomSyncContext";
import { EnterpriseShowroomView } from "./components/showroom/EnterpriseShowroomView";
import { EnterpriseCrossPlatformHub } from "./components/EnterpriseCrossPlatformHub";
import { EnterpriseWorkspaceShell } from "./components/enterprise/EnterpriseWorkspaceShell";
import { TreasuryCollateralSettlementHub } from "./components/TreasuryCollateralSettlementHub";
import { CustomerLiquidityShareExchange } from "./components/CustomerLiquidityShareExchange";
import { CryptographicKeyEnclaveSigningBridge } from "./components/CryptographicKeyEnclaveSigningBridge";
import { LiquidityPoolInitializationModal } from "./components/LiquidityPoolInitializationModal";

const ProtectedInstitutionalSandboxView = withVIPProtection(
  InstitutionalSandboxView,
  "Institutional Sandbox (TW-DEMO & Go-Live Gates)"
);

const ProtectedAdvancedTradingTerminal = withVIPProtection(
  AdvancedTradingTerminal,
  "Advanced Trading Terminal (L3 Book & OCO)"
);

import {
  FOUNDRY_SOVEREIGN_DEPLOYER,
  SOLANA_SOVEREIGN_DEPLOYER,
  PROTOCOL_TREASURY_ADDRESS,
  BASE_CHAIN_ID,
  BASE_TREASURY_ADDRESS,
  POLYGON_CHAIN_ID,
  POLYGON_TREASURY_ADDRESS,
  SOLANA_MULTISIG_TREASURY,
} from "./utils/treasuryConstants";
import { Sparkles, Layers, Shield, Cpu, Play, Square, Archive, Crown, Percent, Monitor } from "lucide-react";

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { openCheckoutModal, openDiscountCenter, isDiscountCenterOpen, closeDiscountCenter } = useMembership();
  const [activeTab, setActiveTab] = useState<NavTabId>("enterprise_showroom");
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastGenerationTime, setLastGenerationTime] = useState<number | null>(null);
  const [lastGeneratedCount, setLastGeneratedCount] = useState<number>(0);
  const [selectedToken, setSelectedToken] = useState<TokenRecord | null>(null);
  const [aiPromptOverride, setAiPromptOverride] = useState<string>("");
  const [constantLoopActive, setConstantLoopActive] = useState<boolean>(false);
  const [maxCapacity, setMaxCapacity] = useState<number>(100);
  const [vaultTokensCount, setVaultTokensCount] = useState<number>(0);
  const [remixInjectedSolidity, setRemixInjectedSolidity] = useState<{ code: string; name: string } | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState<boolean>(false);
  const [isMetaMaskModalOpen, setIsMetaMaskModalOpen] = useState<boolean>(false);
  const [isMarketDeployModalOpen, setIsMarketDeployModalOpen] = useState<boolean>(false);
  const [marketDeployTargetIds, setMarketDeployTargetIds] = useState<string[] | undefined>(undefined);
  const [marketDeployNotice, setMarketDeployNotice] = useState<string | null>(null);
  const [isGlobalSwapSellModalOpen, setIsGlobalSwapSellModalOpen] = useState<boolean>(false);
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);
  const [isWorldConnectivityModalOpen, setIsWorldConnectivityModalOpen] = useState<boolean>(false);
  const [isMaoMaoModalOpen, setIsMaoMaoModalOpen] = useState<boolean>(false);
  const [maoMaoModalMode, setMaoMaoModalMode] = useState<"send" | "receive">("send");
  const [globalSwapSellToken, setGlobalSwapSellToken] = useState<TokenRecord | null>(null);
  const [globalSwapSellMode, setGlobalSwapSellMode] = useState<"swap" | "sell">("swap");
  const [isTokenServiceManagerOpen, setIsTokenServiceManagerOpen] = useState<boolean>(false);
  const [isUniversalWalletOpen, setIsUniversalWalletOpen] = useState<boolean>(false);
  const [isAuthGatewayModalOpen, setIsAuthGatewayModalOpen] = useState<boolean>(false);
  const [isLiquidityPoolModalOpen, setIsLiquidityPoolModalOpen] = useState<boolean>(false);
  const [liquidityPoolTargetToken, setLiquidityPoolTargetToken] = useState<TokenRecord | null>(null);
  const metaMaskSync = useMetaMaskSync();

  const handleOpenLiquidityPoolInit = (token?: TokenRecord) => {
    setLiquidityPoolTargetToken(token || selectedToken || null);
    setIsLiquidityPoolModalOpen(true);
  };

  const handleOpenMaoMaoTransfer = (mode: "send" | "receive" = "send") => {
    setMaoMaoModalMode(mode);
    setIsMaoMaoModalOpen(true);
  };

  const handleOpenGlobalSwapSell = (token?: TokenRecord, mode: "swap" | "sell" = "swap") => {
    setGlobalSwapSellToken(token || null);
    setGlobalSwapSellMode(mode);
    setIsGlobalSwapSellModalOpen(true);
  };

  const handleOpenMarketDeploy = (targetIds?: string[]) => {
    setMarketDeployTargetIds(targetIds);
    setIsMarketDeployModalOpen(true);
  };

  const handleMarketDeploySuccess = (updatedTokens: TokenRecord[]) => {
    setTokens(updatedTokens);
    continuousVaultSaver.saveTokensToDurableStorage(updatedTokens);
    setMarketDeployNotice(`Market Broadcast Live: ${updatedTokens.length} token inventions are deployed on the blockchain market!`);
    setTimeout(() => setMarketDeployNotice(null), 5000);
  };

  const handleApplyDeployerToTokens = (updatedTokens: TokenRecord[], count: number) => {
    setTokens(updatedTokens);
    continuousVaultSaver.saveTokensToDurableStorage(updatedTokens);
    secureTokensToVault(updatedTokens, maxCapacity, "metamask_deployer_applied_bulk")
      .catch((err) => console.warn("Vault sync warning:", err));
  };

  const handleUpdateTokenDeployer = (tokenId: string, newDeployer: string) => {
    setTokens((prev) => {
      const next = prev.map((t) => (t.id === tokenId ? { ...t, deployerAddress: newDeployer } : t));
      continuousVaultSaver.saveTokensToDurableStorage(next);
      secureTokensToVault(next, maxCapacity, "single_token_metamask_deployer_update")
        .catch((err) => console.warn("Vault single token deployer update warning:", err));
      return next;
    });
    setSelectedToken((prev) => (prev && prev.id === tokenId ? { ...prev, deployerAddress: newDeployer } : prev));
  };

  const handleSendToRemix = (solidityCode: string, tokenName: string) => {
    setRemixInjectedSolidity({ code: solidityCode, name: tokenName });
    setActiveTab("remix");
  };

  const handleDuplicateToken = (token: TokenRecord): TokenRecord => {
    const duplicated = duplicateTokenRecord(token);
    setTokens((prev) => {
      const idx = prev.findIndex((t) => t.id === token.id);
      let updated: TokenRecord[];
      if (idx !== -1) {
        updated = [...prev.slice(0, idx + 1), duplicated, ...prev.slice(idx + 1)];
      } else {
        updated = [duplicated, ...prev];
      }
      const capped = updated.slice(0, maxCapacity);
      continuousVaultSaver.saveTokensToDurableStorage(capped);
      secureTokensToVault(capped, maxCapacity, "duplicate_token")
        .catch((err) => console.warn("Vault duplicate token warning:", err));
      return capped;
    });
    return duplicated;
  };

  const handleDuplicateTokens = (tokensToDuplicate: TokenRecord[]) => {
    if (tokensToDuplicate.length === 0) return;
    const duplicates = duplicateTokenBatch(tokensToDuplicate);
    setTokens((prev) => {
      const updated = [...duplicates, ...prev];
      const capped = updated.slice(0, maxCapacity);
      continuousVaultSaver.saveTokensToDurableStorage(capped);
      secureTokensToVault(capped, maxCapacity, "duplicate_tokens_batch")
        .catch((err) => console.warn("Vault duplicate tokens batch warning:", err));
      return capped;
    });
  };

  const handleBatchRenameTokens = (
    tokenIds: string[],
    updater: (token: TokenRecord) => { name: string; symbol?: string }
  ) => {
    const idSet = new Set(tokenIds);
    setTokens((prev) => {
      const updated = prev.map((t) => {
        if (!idSet.has(t.id)) return t;
        const res = updater(t);
        return {
          ...t,
          name: res.name,
          ...(res.symbol ? { symbol: res.symbol } : {}),
        };
      });
      continuousVaultSaver.saveTokensToDurableStorage(updated);
      secureTokensToVault(updated, maxCapacity, "batch_rename_tokens")
        .catch((err) => console.warn("Vault batch rename warning:", err));
      return updated;
    });
  };

  const handleBatchUpdateTokens = (updatedList: TokenRecord[]) => {
    const updateMap = new Map<string, TokenRecord>(updatedList.map((t) => [t.id, t]));
    setTokens((prev) => {
      const updated = prev.map((t) => updateMap.get(t.id) || t);
      continuousVaultSaver.saveTokensToDurableStorage(updated);
      secureTokensToVault(updated, maxCapacity, "batch_update_tokens")
        .catch((err) => console.warn("Vault batch update warning:", err));
      return updated;
    });
  };

  const handleBulkDeleteTokens = async (tokenIds: string[]) => {
    if (!tokenIds || tokenIds.length === 0) return;
    const idSet = new Set(tokenIds);
    setTokens((prev) => {
      const remaining = prev.filter((t) => !idSet.has(t.id));
      continuousVaultSaver.saveTokensToDurableStorage(remaining);
      secureTokensToVault(remaining, maxCapacity, "bulk_delete_tokens")
        .catch((err) => console.warn("Vault bulk delete warning:", err));
      return remaining;
    });

    // Also remove from Firestore in safe 450-doc chunked batches
    try {
      await deleteTokensBatchFromFirestore(tokenIds);
    } catch (err) {
      console.warn("Firestore bulk delete warning:", err);
    }
  };

  // Token Filter Bar state: Search query, Chain toggles, Standard type toggles
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [selectedChains, setSelectedChains] = useState<Set<ChainType>>(
    () => new Set(CHAIN_OPTIONS.map((c) => c.id))
  );
  const [selectedStandards, setSelectedStandards] = useState<Set<TokenStandard>>(
    () => new Set(STANDARD_OPTIONS.map((s) => s.id))
  );

  const handleToggleChain = (chain: ChainType) => {
    setSelectedChains((prev) => {
      const next = new Set(prev);
      if (next.has(chain)) {
        next.delete(chain);
      } else {
        next.add(chain);
      }
      return next;
    });
  };

  const handleSelectAllChains = () => {
    setSelectedChains(new Set(CHAIN_OPTIONS.map((c) => c.id)));
  };

  const handleSoloChain = (chain: ChainType) => {
    setSelectedChains(new Set([chain]));
  };

  const handleOnlyEVMChains = () => {
    setSelectedChains(
      new Set(["ethereum", "base", "arbitrum", "polygon"] as ChainType[])
    );
  };

  const handleToggleStandard = (std: TokenStandard) => {
    setSelectedStandards((prev) => {
      const next = new Set(prev);
      if (next.has(std)) {
        next.delete(std);
      } else {
        next.add(std);
      }
      return next;
    });
  };

  const handleSelectAllStandards = () => {
    setSelectedStandards(new Set(STANDARD_OPTIONS.map((s) => s.id)));
  };

  const handleSoloStandard = (std: TokenStandard) => {
    setSelectedStandards(new Set([std]));
  };

  const handleQuickStandardPreset = (category: "fungible" | "nft" | "smart") => {
    if (category === "fungible") {
      setSelectedStandards(new Set(["ERC-20", "SPL-Token"] as TokenStandard[]));
    } else if (category === "nft") {
      setSelectedStandards(new Set(["ERC-721", "ERC-1155"] as TokenStandard[]));
    } else if (category === "smart") {
      setSelectedStandards(new Set(["ERC-4337"] as TokenStandard[]));
    }
  };

  const handleResetAllFilters = () => {
    setFilterSearch("");
    setSelectedChains(new Set(CHAIN_OPTIONS.map((c) => c.id)));
    setSelectedStandards(new Set(STANDARD_OPTIONS.map((s) => s.id)));
  };

  const handleApplyFilterCombination = (combo: {
    searchQuery: string;
    chains: ChainType[];
    standards: TokenStandard[];
  }) => {
    setFilterSearch(combo.searchQuery);
    setSelectedChains(new Set(combo.chains));
    setSelectedStandards(new Set(combo.standards));
  };

  // Global Selection state for tokens and contract IDs
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());

  // Real-time calculation of matching tokens count for the filter bar display
  const filteredTokensList = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return tokens.filter((t) => {
      if (selectedChains.size > 0 && !selectedChains.has(t.chain)) return false;
      if (selectedStandards.size > 0 && !selectedStandards.has(t.tokenStandard)) return false;
      if (q) {
        const matches =
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q) ||
          t.contractAddress.toLowerCase().includes(q) ||
          t.tokenId.toLowerCase().includes(q) ||
          t.chain.toLowerCase().includes(q) ||
          (t.tokenStandard && t.tokenStandard.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [tokens, filterSearch, selectedChains, selectedStandards]);

  const filteredTokensCount = filteredTokensList.length;

  const handleToggleSelectAllTokens = () => {
    if (
      filteredTokensList.length > 0 &&
      filteredTokensList.every((t) => selectedTokenIds.has(t.id))
    ) {
      setSelectedTokenIds(new Set());
    } else {
      setSelectedTokenIds(new Set(filteredTokensList.map((t) => t.id)));
    }
  };

  // Initialize from Token Vault on mount: preserve whatever is in the vault across reloads and app exits
  useEffect(() => {
    // 1. Immediately restore from local durable storage to prevent any blank frame
    const durableTokens = continuousVaultSaver.getDurableTokens();
    if (durableTokens && durableTokens.length > 0) {
      const migrated = durableTokens.map((t) => {
        let deployer = t.deployerAddress;
        if (t.chain === "solana") {
          deployer = SOLANA_SOVEREIGN_DEPLOYER;
        } else if (!t.deployerAddress || t.deployerAddress.toLowerCase() === "0x5afe48a2f594f8e619e63b09cd4d64593c1fc891") {
          deployer = FOUNDRY_SOVEREIGN_DEPLOYER;
        }
        const treasury =
          t.treasuryAddress ||
          (t.chain === "base"
            ? BASE_TREASURY_ADDRESS
            : t.chain === "polygon"
            ? POLYGON_TREASURY_ADDRESS
            : t.chain === "solana"
            ? SOLANA_MULTISIG_TREASURY
            : PROTOCOL_TREASURY_ADDRESS);
        return ensureTokenHasImage({
          ...t,
          deployerAddress: deployer,
          treasuryAddress: treasury,
          isDeployed: typeof t.isDeployed === "boolean" ? t.isDeployed : true,
          launchStatus: t.launchStatus || "Deployed",
        });
      });
      const withKeys = ensureAllTokensHavePrivateKeys(migrated);
      const withMaoMao = injectMaoMaoIntoTokens(withKeys);
      preloadTokenImages(withMaoMao);
      setTokens(withMaoMao.slice(0, maxCapacity));
      setLastGeneratedCount(withMaoMao.length);
      continuousVaultSaver.saveTokensToDurableStorage(withMaoMao);
    } else {
      // Generate initial 100 with FOUNDRY_SOVEREIGN_DEPLOYER (0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0)
      const initial100 = generateTokenBatch(100, {
        chains: ["ethereum", "base", "arbitrum", "solana", "quantum"],
        narratives: ["ai_agents", "depin", "rwa", "quantum_defi"],
        standards: ["ERC-20", "ERC-721", "ERC-1155"],
        includeVanity: true,
        vanityPercentage: 15,
        eip55Checksum: true,
        customDeployerAddress: FOUNDRY_SOVEREIGN_DEPLOYER,
      });
      const withKeys = ensureAllTokensHavePrivateKeys(initial100);
      const initialWithMaoMao = injectMaoMaoIntoTokens(withKeys);
      preloadTokenImages(initialWithMaoMao);
      setTokens(initialWithMaoMao);
      setLastGeneratedCount(initialWithMaoMao.length);
      continuousVaultSaver.saveTokensToDurableStorage(initialWithMaoMao);
      secureTokensToVault(initialWithMaoMao, maxCapacity, "initial_foundry_deployer_seed").catch(() => {});
    }

    // 2. Initialize continuous vault saver service
    continuousVaultSaver.init(
      () => tokens,
      (appended) => {
        setTokens((prev) => {
          const map = new Map<string, TokenRecord>();
          [...appended, ...prev].forEach((t) => {
            const enriched = ensureTokenHasImage(t);
            map.set(enriched.contractAddress?.toLowerCase() || enriched.id, enriched);
          });
          const listWithKeys = ensureAllTokensHavePrivateKeys(Array.from(map.values()));
          return listWithKeys.slice(0, maxCapacity);
        });
      }
    );

    // 3. Fetch from remote Firestore and merge seamlessly (whatever is in the vault stays in the vault)
    fetchTokens({ limitCount: 300 })
      .then((existingTokens) => {
        if (existingTokens && existingTokens.length > 0) {
          const enterpriseTokens = upgradeAllTokensToEnterprise(existingTokens);
          const enterpriseWithKeys = ensureAllTokensHavePrivateKeys(enterpriseTokens);
          const deployedEnterprise = enterpriseWithKeys.map((t) => ensureTokenHasImage({
            ...t,
            isDeployed: typeof t.isDeployed === "boolean" ? t.isDeployed : true,
            launchStatus: t.launchStatus || "Deployed",
          }));
          preloadTokenImages(deployedEnterprise);
          setTokens((prev) => {
            const map = new Map<string, TokenRecord>();
            deployedEnterprise.forEach((t) => map.set(t.contractAddress?.toLowerCase() || t.id, t));
            prev.forEach((t) => map.set(t.contractAddress?.toLowerCase() || t.id, t));
            const merged = Array.from(map.values()).slice(0, maxCapacity);
            continuousVaultSaver.saveTokensToDurableStorage(merged);
            return merged;
          });
          setLastGeneratedCount(enterpriseTokens.length);

          // Background sync to ensure all tokens in Firestore reflect Deployed on blockchain market
          const needStatusUpdate = existingTokens.filter((t) => !t.isDeployed || t.launchStatus !== "Deployed");
          if (needStatusUpdate.length > 0) {
            updateBatchTokenDeploymentStatus(
              needStatusUpdate.map((t) => ({
                tokenId: t.id,
                launchStatus: "Deployed",
                creationTx: t.creationTx || "0x" + t.id,
                isDeployed: true,
                contractAddress: t.contractAddress,
                deployerAddress: t.deployerAddress,
                liquidityPair: t.liquidityPair,
              }))
            ).catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.warn("Could not retrieve existing vault tokens on mount:", err);
      });

    // Real-time subscribe to vault count
    const unsubscribe = subscribeToTokens((remoteTokens) => {
      setVaultTokensCount(remoteTokens.length);
    });

    return () => unsubscribe();
  }, [maxCapacity]);

  // Explicit Trigger: Generate 100 IDs
  const handleGenerate100 = async () => {
    setIsGenerating(true);
    const start = performance.now();

    setTimeout(async () => {
      const new100 = generateTokenBatch(100, {
        chains: ["ethereum", "base", "arbitrum", "solana", "quantum"],
        narratives: ["ai_agents", "depin", "rwa", "quantum_defi"],
        standards: ["ERC-20", "ERC-721", "ERC-1155"],
        includeVanity: true,
        vanityPercentage: 15,
        eip55Checksum: true,
        customDeployerAddress: metaMaskSync.activeDeployerAddress || FOUNDRY_SOVEREIGN_DEPLOYER,
      });

      const elapsed = performance.now() - start;

      // Calculate new list, capped at maxCapacity
      setTokens((prev) => {
        const combined = [...new100, ...prev];
        const capped = combined.slice(0, maxCapacity);
        
        // Auto-secure to Firebase Token Vault
        secureTokensToVault(capped, maxCapacity, "generate_100_ids_trigger")
          .catch((err) => console.error("Auto vault save error:", err));

        return capped;
      });

      setLastGeneratedCount(100);
      setLastGenerationTime(elapsed);
      setIsGenerating(false);
    }, 50);
  };

  const handleGenerate1000More = () => {
    setIsGenerating(true);
    const start = performance.now();

    setTimeout(async () => {
      // Scale capacity dynamically to accommodate 1,000 more tokens
      const newCapacity = Math.max(maxCapacity, tokens.length + 1000);
      setMaxCapacity(newCapacity);

      const batch1000 = generateTokenBatch(1000, {
        macroMarketCapScale: true,
        eip55Checksum: true,
        customDeployerAddress: metaMaskSync.activeDeployerAddress || FOUNDRY_SOVEREIGN_DEPLOYER,
      });
      const elapsed = performance.now() - start;

      setTokens((prev) => {
        const combined = [...batch1000, ...prev];
        const capped = combined.slice(0, newCapacity);

        secureTokensToVault(capped, newCapacity, "generate_1000_tokens_2exp8_batch")
          .catch((err) => console.error("Vault save error for 1000 batch:", err));

        return capped;
      });

      setLastGeneratedCount(1000);
      setLastGenerationTime(elapsed);
      setIsGenerating(false);
    }, 60);
  };

  const handleSyncAllToDeployer = () => {
    const evmTarget = metaMaskSync.activeDeployerAddress || FOUNDRY_SOVEREIGN_DEPLOYER;
    setTokens((prev) => {
      const updated = prev.map((t) => {
        const treasury =
          t.chain === "base"
            ? BASE_TREASURY_ADDRESS
            : t.chain === "polygon"
            ? POLYGON_TREASURY_ADDRESS
            : t.chain === "solana"
            ? SOLANA_MULTISIG_TREASURY
            : PROTOCOL_TREASURY_ADDRESS;
        return {
          ...t,
          deployerAddress: t.chain === "solana" ? SOLANA_SOVEREIGN_DEPLOYER : evmTarget,
          treasuryAddress: treasury,
        };
      });
      continuousVaultSaver.saveTokensToDurableStorage(updated);
      secureTokensToVault(updated, maxCapacity, "sync_all_to_multi_chain_deployers_and_treasuries")
        .catch((err) => console.warn("Vault sync warning:", err));
      return updated;
    });
  };

  const handleGenerateSolanaTokens = () => {
    setIsGenerating(true);
    const start = performance.now();
    setTimeout(() => {
      const solanaBatch = generateTokenBatch(50, {
        chains: ["solana"],
        narratives: ["ai_agents", "depin", "rwa", "quantum_defi"],
        standards: ["SPL-Token"],
        customDeployerAddress: SOLANA_SOVEREIGN_DEPLOYER,
        customTreasuryAddress: SOLANA_MULTISIG_TREASURY,
      });
      const elapsed = performance.now() - start;

      setTokens((prev) => {
        const combined = [...solanaBatch, ...prev];
        const capped = combined.slice(0, maxCapacity);
        continuousVaultSaver.saveTokensToDurableStorage(capped);
        secureTokensToVault(capped, maxCapacity, "generate_solana_spl_batch")
          .catch((err) => console.warn("Vault save warning:", err));
        return capped;
      });

      setLastGeneratedCount(50);
      setLastGenerationTime(elapsed);
      setIsGenerating(false);
    }, 40);
  };

  const handleGenerateBatch = (config: GenerationConfig) => {
    setIsGenerating(true);
    const start = performance.now();

    setTimeout(async () => {
      const newTokens = generateTokenBatch(config.count, config);
      const elapsed = performance.now() - start;

      setTokens((prev) => {
        const combined = [...newTokens, ...prev];
        const capped = combined.slice(0, maxCapacity);

        // Real-time persistence and snapshot in Token Vault
        secureTokensToVault(capped, maxCapacity, "batch_generator_secured")
          .catch((e) => console.warn("Async batch persistence notification:", e));

        return capped;
      });

      setLastGeneratedCount(config.count);
      setLastGenerationTime(elapsed);
      setIsGenerating(false);
    }, 40);
  };

  const handleImportTokens = async (newTokens: TokenRecord[]) => {
    setTokens((prev) => {
      const capped = [...newTokens, ...prev].slice(0, maxCapacity);
      secureTokensToVault(capped, maxCapacity, "manual_import_secured")
        .catch((e) => console.warn("Async import persistence notification:", e));
      return capped;
    });
    setActiveTab("generator");
  };

  const handleUsePromptInAI = (promptText: string) => {
    setAiPromptOverride(promptText);
    setActiveTab("ai_assistant");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E0E0E0] flex flex-col font-sans selection:bg-[#F27D26] selection:text-black">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalTokensCount={tokens.length}
        vaultTokensCount={vaultTokensCount}
        theme={theme}
        onToggleTheme={toggleTheme}
        isMetaMaskConnected={metaMaskSync.isConnected}
        metaMaskAccount={metaMaskSync.activeDeployerAddress}
        onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
        onOpenUniversalWallet={() => setIsUniversalWalletOpen(true)}
        onOpenMarketDeploy={() => handleOpenMarketDeploy()}
        onOpenGlobalSwapSell={handleOpenGlobalSwapSell}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenWorldConnectivity={() => setIsWorldConnectivityModalOpen(true)}
        onOpenAuthGateway={() => setIsAuthGatewayModalOpen(true)}
        onOpenMembershipPortal={() => openCheckoutModal()}
        onOpenDiscountCenter={() => openDiscountCenter()}
      />

      {/* Reactive Encrypted Memory Integrity Alert Banner */}
      <MemoryHealthAlertBanner
        tokens={tokens}
        onOpenDiagnosticModal={() => setIsHealthModalOpen(true)}
      />

      {/* Firestore Quota Resilience & Offline Mode Banner */}
      <FirestoreQuotaAlertBanner />

      {/* Market Deployment Notification Banner */}
      {marketDeployNotice && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-950/70 via-[#181822] to-emerald-950/50 border border-orange-500/50 text-white flex items-center justify-between text-xs font-mono shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-base animate-bounce">🚀</span>
              <span className="font-bold text-orange-400">{marketDeployNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setMarketDeployNotice(null)}
              className="text-[#8E9299] hover:text-white px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Active Sovereign Multi-Chain Deployer Banner (EVM + Solana + Treasury) */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ActiveFoundryDeployerBanner
          activeDeployerAddress={metaMaskSync.activeDeployerAddress || FOUNDRY_SOVEREIGN_DEPLOYER}
          solanaDeployerAddress={SOLANA_SOVEREIGN_DEPLOYER}
          solanaMultiSigTreasuryAddress={SOLANA_MULTISIG_TREASURY}
          baseTreasuryAddress={BASE_TREASURY_ADDRESS}
          polygonTreasuryAddress={POLYGON_TREASURY_ADDRESS}
          treasuryAddress={PROTOCOL_TREASURY_ADDRESS}
          isMetaMaskConnected={metaMaskSync.isConnected}
          totalTokensCount={tokens.length}
          tokens={tokens}
          onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
          onGenerateWithDeployer={handleGenerate100}
          onGenerateSolanaTokens={handleGenerateSolanaTokens}
          onSyncAllTokensToDeployer={handleSyncAllToDeployer}
          onResetToFoundryDeployer={metaMaskSync.resetToFoundryDeployer}
          onOpenMarketDeploy={() => handleOpenMarketDeploy()}
          onOpenGlobalSwapSell={() => handleOpenGlobalSwapSell()}
          onOpenPortfolio={() => setActiveTab("wallet_portfolio")}
          onOpenAtsExchange={() => setActiveTab("ats_nyse_exchange")}
          onOpenWeeklyTree3Update={() => setActiveTab("weekly_tree3_update")}
          onOpenWorldConnectivity={() => setIsWorldConnectivityModalOpen(true)}
          onOpenThreatScanner={() => setActiveTab("security_threat_scanner")}
          onOpenMaoMaoTransfer={() => handleOpenMaoMaoTransfer("send")}
        />
      </div>

      {/* Clean Enterprise Workspace Shell: 5 Secured Domain Folders, Left Sidebar, Sub-Tabs, Docked Utility Drawer & Bottom Control Bar */}
      <EnterpriseWorkspaceShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalTokensCount={tokens.length}
        vaultTokensCount={vaultTokensCount}
        isGenerating={isGenerating}
        onGenerate100={handleGenerate100}
        onGenerate1000More={handleGenerate1000More}
        onGenerateSolanaTokens={handleGenerateSolanaTokens}
        onSyncAllToDeployer={handleSyncAllToDeployer}
        onOpenMarketDeploy={() => handleOpenMarketDeploy()}
        onToggleTheme={toggleTheme}
        theme={theme}
        isMetaMaskConnected={metaMaskSync.isConnected}
        metaMaskAccount={metaMaskSync.activeDeployerAddress}
        onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
        onOpenUniversalWallet={() => setIsUniversalWalletOpen(true)}
        onOpenWorldConnectivity={() => setIsWorldConnectivityModalOpen(true)}
        onOpenSendReceive={handleOpenMaoMaoTransfer}
        onOpenSwap={() => handleOpenGlobalSwapSell(undefined, "swap")}
      >
        <main id="active-module-view" className="w-full space-y-6">
          {/* Official Token World Exchange ATS® Logo & Page Header - Top of Every Page */}
          <UniversalPageHeaderLogo
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab)}
          totalTokensCount={tokens.length}
        />

        {/* Top Active Fullstack Cockpit & Intelligent Prompt Card Matrix */}
        <TopFullstackCockpit
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalTokensCount={tokens.length}
          vaultTokensCount={vaultTokensCount}
          onGenerate100={handleGenerate100}
          onGenerate1000More={handleGenerate1000More}
          onUsePromptInAI={handleUsePromptInAI}
          onQuickGenerate={(cfg) => {
            const batch = generateTokenBatch(cfg.count || 25, {
              ...cfg,
              customDeployerAddress:
                metaMaskSync.isAutoSyncEnabled && metaMaskSync.activeDeployerAddress
                  ? metaMaskSync.activeDeployerAddress
                  : cfg.customDeployerAddress,
            });
            setTokens((prev) => {
              const combined = [...batch, ...prev];
              const capped = combined.slice(0, maxCapacity);
              secureTokensToVault(capped, maxCapacity, "cockpit_prompt_quick_generate")
                .catch((err) => console.error("Vault save error:", err));
              return capped;
            });
            setLastGeneratedCount(cfg.count || 25);
          }}
          maxCapacity={maxCapacity}
          isGenerating={isGenerating}
          onOpenValidationModal={() => setIsValidationModalOpen(true)}
          tokens={tokens}
          onMaxCapacityChange={setMaxCapacity}
          onTokensUpdated={(updated) => setTokens(updated)}
          metaMaskAccount={metaMaskSync.activeDeployerAddress}
          isMetaMaskConnected={metaMaskSync.isConnected}
          onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
        />

        {/* Dynamic In-Page Quick Navigation Dock & Fast Page Switcher Strip */}
        <QuickNavigationDock
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalTokensCount={tokens.length}
          vaultTokensCount={vaultTokensCount}
        />

        {/* Live Market Terminal (Uniswap AMM & Binance CEX) */}
        {activeTab === "live_market_uniswap_binance" && (
          <LiveMarketUniswapBinanceTerminal
            metaMaskAccount={metaMaskSync.account}
            isMetaMaskConnected={metaMaskSync.isConnected}
            onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
            onNavigateToDeploy={() => setActiveTab("production_deployment")}
          />
        )}

        {/* Production Exchange Deployment & Export Hub (5 Pillars) */}
        {activeTab === "production_deployment" && (
          <ProductionExchangeDeploymentHub />
        )}

        {activeTab === "generator" && (
          <div className="space-y-6">
            <ConstantSaveModePanel
              tokens={tokens}
              onTokensUpdated={(updated) => setTokens(updated)}
              onAppendTokens={(appended) => {
                setTokens((prev) => {
                  const combined = [...appended, ...prev];
                  return combined.slice(0, maxCapacity);
                });
              }}
              maxCapacity={maxCapacity}
              onMaxCapacityChange={(cap) => setMaxCapacity(cap)}
              constantLoopActive={constantLoopActive}
              onToggleConstantLoop={() => setConstantLoopActive((prev) => !prev)}
              onGenerate100={handleGenerate100}
              onOpenVault={() => setActiveTab("token_vault")}
              isGenerating={isGenerating}
            />

            <BatchGenerator
              tokens={tokens}
              onGenerate={handleGenerateBatch}
              onGenerate100={handleGenerate100}
              onOpenTokenServiceManager={() => setIsTokenServiceManagerOpen(true)}
              isGenerating={isGenerating}
              lastGenerationTime={lastGenerationTime}
              lastGeneratedCount={lastGeneratedCount}
              metaMaskDeployer={metaMaskSync.activeDeployerAddress}
              isMetaMaskConnected={metaMaskSync.isConnected}
              onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
            />

            {/* Filter Bar Above Token Explorer */}
            <TokenFilterBar
              tokens={tokens}
              searchQuery={filterSearch}
              onSearchChange={setFilterSearch}
              selectedChains={selectedChains}
              onToggleChain={handleToggleChain}
              onSelectAllChains={handleSelectAllChains}
              onSoloChain={handleSoloChain}
              onOnlyEVMChains={handleOnlyEVMChains}
              selectedStandards={selectedStandards}
              onToggleStandard={handleToggleStandard}
              onSelectAllStandards={handleSelectAllStandards}
              onSoloStandard={handleSoloStandard}
              onQuickStandardPreset={handleQuickStandardPreset}
              onResetAllFilters={handleResetAllFilters}
              onApplyFilterCombination={handleApplyFilterCombination}
              filteredCount={filteredTokensCount}
              totalCount={tokens.length}
              selectedTokenIds={selectedTokenIds}
              onToggleSelectAllTokens={handleToggleSelectAllTokens}
            />

            {/* Selected Tokens Summary Dashboard Panel */}
            {selectedTokenIds.size > 0 && (
              <SelectedTokenomicsDashboard
                tokens={tokens}
                selectedTokenIds={selectedTokenIds}
                onDeselectAll={() => setSelectedTokenIds(new Set())}
                onExpandSelectedToSovereign={() => {
                  setTokens((prev) => {
                    const expanded = prev.map((t) => {
                      if (selectedTokenIds.has(t.id)) {
                        return {
                          ...t,
                          marketCap: Math.max(t.marketCap, 3_000_000_000_000),
                          reserveShares: SOVEREIGN_RESERVE_SHARES,
                          treasuryShares: SOVEREIGN_TREASURY_SHARES,
                          targetOwner: SOVEREIGN_OWNER,
                          powerOfTwoReserves: 256,
                          coinmarketcapMetric: Math.max(t.coinmarketcapMetric || 256, 256),
                        };
                      }
                      return t;
                    });
                    secureTokensToVault(expanded, maxCapacity, "expand_selected_sovereign_mcap")
                      .catch((err) => console.error("Vault save error:", err));
                    return expanded;
                  });
                }}
                onSelectToken={(token) => setSelectedToken(token)}
              />
            )}

            <TokenExplorer
              tokens={tokens}
              searchQuery={filterSearch}
              onSearchChange={setFilterSearch}
              selectedChains={selectedChains}
              selectedStandards={selectedStandards}
              selectedTokenIds={selectedTokenIds}
              onSelectedTokenIdsChange={setSelectedTokenIds}
              onSelectToken={(token) => setSelectedToken(token)}
              onClearTokens={() => setTokens([])}
              onDuplicateToken={handleDuplicateToken}
              onDuplicateTokens={handleDuplicateTokens}
              onBatchRenameTokens={handleBatchRenameTokens}
              onBatchUpdateTokens={handleBatchUpdateTokens}
              onBulkDeleteTokens={handleBulkDeleteTokens}
              onOpenMarketDeploy={handleOpenMarketDeploy}
              onOpenGlobalSwapSell={handleOpenGlobalSwapSell}
              lastGeneratedCount={lastGeneratedCount}
              onExpandAllToSovereignMCap={() => {
                setTokens((prev) => {
                  const expanded = expandAllTokensToSovereignMarketCap(prev);
                  secureTokensToVault(expanded, maxCapacity, "expand_all_sovereign_mcap")
                    .catch((err) => console.error("Vault save error:", err));
                  return expanded;
                });
              }}
              onBulkUpdate={(tokenIds, updates) => {
                const idSet = new Set(tokenIds);
                setTokens((prev) => {
                  const updated = prev.map((t) => (idSet.has(t.id) ? { ...t, ...updates } : t));
                  continuousVaultSaver.saveTokensToDurableStorage(updated);
                  secureTokensToVault(updated, maxCapacity, "bulk_update")
                    .catch((err) => console.warn("Vault bulk update warning:", err));
                  return updated;
                });
              }}
            />
          </div>
        )}

        {/* Maximum Security Lifecycle Command Center (Zero Trust, IaC, SIEM Telemetry, BAS, Active Deception, WORM Storage) */}
        {activeTab === "maximum_security" && (
          <MaximumSecurityLifecycleCockpit />
        )}

        {/* Google Workspace (Gmail & Keep) & Python concurrent.futures Hub */}
        {activeTab === "workspace_hub" && (
          <GoogleWorkspaceAndFuturesHub
            tokens={tokens}
            onSelectToken={(token) => {
              setSelectedToken(token);
              setActiveTab("generator");
            }}
            onUpdateToken={(tokenId, updates) => {
              setTokens((prev) => {
                const updated = prev.map((t) => (t.id === tokenId ? { ...t, ...updates } : t));
                continuousVaultSaver.saveTokensToDurableStorage(updated);
                secureTokensToVault(updated, maxCapacity, "keep_note_import")
                  .catch((err) => console.warn("Vault save warning:", err));
                return updated;
              });
            }}
          />
        )}

        {/* Solidity Source Code Compiler, Einstein-Dar Logic Field Formula, Fossibot Memory Card & Web3 Platform Engine */}
        {activeTab === "solidity_compiler" && (
          <SolidityCompilerFullstackView
            onSendToRemix={handleSendToRemix}
            onOpenMetaMaskTransferModal={handleOpenMaoMaoTransfer}
          />
        )}

        {/* Security Threat Scanner (Heuristic Vulnerability Intelligence Engine) */}
        {activeTab === "security_threat_scanner" && (
          <SecurityThreatScanner
            tokens={tokens}
            onUpdateTokens={(updatedTokens) => {
              setTokens(updatedTokens);
              continuousVaultSaver.saveTokensToDurableStorage(updatedTokens);
              secureTokensToVault(updatedTokens, maxCapacity, "threat_scanner_remediation")
                .catch((err) => console.warn("Vault save warning:", err));
            }}
            onSelectToken={(token) => {
              setSelectedToken(token);
              setActiveTab("generator");
            }}
            onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)}
          />
        )}

        {/* Weekly TREE3 Update (Runs Every Monday) */}
        {activeTab === "weekly_tree3_update" && (
          <WeeklyTree3UpdateView onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)} />
        )}

        {/* Institutional Sandbox (TW-DEMO, Permissioned Security Demo, Go-Live Gates) - Protected by withVIPProtection */}
        {activeTab === "institutional_sandbox" && (
          <ProtectedInstitutionalSandboxView />
        )}

        {/* Advanced Trading Terminal (Limit, Stop-Loss, OCO, Order Book Depth & Binance/CoinGecko Feeds) - Protected by withVIPProtection */}
        {activeTab === "advanced_trading_terminal" && (
          <ProtectedAdvancedTradingTerminal
            tokens={tokens}
            selectedToken={selectedToken}
            onSelectToken={(token) => setSelectedToken(token)}
            metaMaskAccount={metaMaskSync.activeDeployerAddress}
            isMetaMaskConnected={metaMaskSync.isConnected}
            onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
          />
        )}

        {/* Regulatory Compliance & SEC Audit Hub (Tiered KYC, AML Velocity, SEC Rule 15c3-5 Collars) */}
        {activeTab === "regulatory_compliance" && (
          <RegulatoryComplianceDashboard
            tokens={tokens}
            onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)}
          />
        )}

        {/* Enterprise Showroom & Cross-Platform 4-Pillar Hub (Web Workstation, Desktop Tauri, Tablet Pro, Mobile Native & Side-by-Side) */}
        {activeTab === "enterprise_showroom" && (
          <div className="space-y-8">
            <EnterpriseCrossPlatformHub />
            <EnterpriseShowroomView onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)} />
          </div>
        )}

        {/* ATS Discount Center & Fee Rebates Module */}
        {activeTab === "discount_center" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <DiscountCenter isModal={false} />
          </div>
        )}

        {/* ATS Membership Tiers & Fee Structure Overview */}
        {activeTab === "membership_tiers" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <DiscountCenter isModal={false} />
          </div>
        )}

        {/* Token World Exchange ATS® (TWE) Terminal (Multi-Asset L2 Order Book, 18-Dec uint256 Wei, OpenZeppelin v5.0 & Auth0/SSO) */}
        {activeTab === "twe_ats_terminal" && (
          <TokenWorldAtsTerminal onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)} />
        )}

        {/* Token World Exchange ATS® Unified Auth Gateway (Member SSO, Social OAuth 2.0 & Admin 2FA TOTP) */}
        {activeTab === "unified_auth_gateway" && (
          <TokenWorldUnifiedAuthGateway
            isEmbedded={true}
            onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)}
          />
        )}

        {/* SEC EDGAR Live Monitor (10-K, 10-Q, 8-K, XBRL Financials, RSS Feed & High-Risk Alert Service) */}
        {activeTab === "sec_monitor" && (
          <SecMonitorComponent onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)} />
        )}

        {/* Token World ATS & NYSE Dual-Listing Venue */}
        {activeTab === "ats_nyse_exchange" && (
          <TokenWorldAtsVenue
            tokens={tokens}
            metaMaskAccount={metaMaskSync.activeDeployerAddress}
            isMetaMaskConnected={metaMaskSync.isConnected}
            onNavigateToMonetization={() => setActiveTab("monetization")}
          />
        )}

        {/* Enterprise Token World Exchange (Java Matching Engine, Python/FastAPI Analytics, Kotlin Android Compose & Fortune 500/1000 Trajectory) */}
        {activeTab === "enterprise_exchange" && (
          <EnterpriseTokenExchangeCockpit tokens={tokens} />
        )}

        {/* Risk Analytics Panel (Volatility, Liquidity, Smart Contract Security Scores) */}
        {activeTab === "risk_analytics" && (
          <RiskAnalyticsPanel
            tokens={tokens}
            selectedToken={selectedToken}
            onSelectToken={(token) => setSelectedToken(token)}
          />
        )}

        {/* 1A. AI Vision & Multimodal Hub (Lyria Music, Veo Video, Gemini 3.8, Transcribe, Search & Maps) */}
        {activeTab === "multi_modal_vision" && (
          <MultiModalVisionHub
            onImportTokens={handleImportTokens}
            selectedToken={selectedToken}
          />
        )}

        {/* 1B. Solfeggio & Fibonacci Sacred Harmonics Studio */}
        {activeTab === "harmonics_studio" && <HarmonicsStudio />}

        {activeTab === "monetization" && (
          <div className="space-y-6">
            <TreasuryCollateralSettlementHub
              tokens={tokens}
              onUpdateTokens={handleBatchUpdateTokens}
              activeDeployerAddress={metaMaskSync.activeDeployerAddress}
              isMetaMaskConnected={metaMaskSync.isConnected}
              onOpenGlobalSwapModal={handleOpenGlobalSwapSell}
              onOpenLiquidityPoolModal={handleOpenLiquidityPoolInit}
            />
            <MonetizationRevenueHub
              tokens={tokens}
              metaMaskAccount={metaMaskSync.activeDeployerAddress}
              isMetaMaskConnected={metaMaskSync.isConnected}
              onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
              onOpenProModal={() => setIsProModalOpen(true)}
              onNavigateToVenue={() => setActiveTab("ats_nyse_exchange")}
            />
          </div>
        )}

        {activeTab === "wallet_portfolio" && (
          <div className="space-y-6">
            <TreasuryCollateralSettlementHub
              tokens={tokens}
              onUpdateTokens={handleBatchUpdateTokens}
              activeDeployerAddress={metaMaskSync.activeDeployerAddress}
              isMetaMaskConnected={metaMaskSync.isConnected}
              onOpenGlobalSwapModal={handleOpenGlobalSwapSell}
              onOpenLiquidityPoolModal={handleOpenLiquidityPoolInit}
            />
            <WalletPortfolioView
              metaMaskSync={metaMaskSync}
              tokens={tokens}
              onOpenMetaMaskModal={() => setIsMetaMaskModalOpen(true)}
              onOpenGlobalSwapSell={handleOpenGlobalSwapSell}
            />
          </div>
        )}

        {activeTab === "customer_liquidity_exchange" && (
          <CustomerLiquidityShareExchange
            tokens={tokens}
            initialToken={selectedToken}
            onUpdateTokens={handleBatchUpdateTokens}
            onSelectToken={(token) => setSelectedToken(token)}
          />
        )}

        {activeTab === "global_exchange" && (
          <div className="space-y-6">
            <TreasuryCollateralSettlementHub
              tokens={tokens}
              onUpdateTokens={handleBatchUpdateTokens}
              activeDeployerAddress={metaMaskSync.activeDeployerAddress}
              isMetaMaskConnected={metaMaskSync.isConnected}
              onOpenGlobalSwapModal={handleOpenGlobalSwapSell}
              onOpenLiquidityPoolModal={handleOpenLiquidityPoolInit}
            />
            <GlobalExchangeTerminal
              tokens={tokens}
              initialToken={selectedToken}
              metaMaskAccount={metaMaskSync.activeDeployerAddress}
              isMetaMaskConnected={metaMaskSync.isConnected}
              onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
              onUpdateTokens={handleBatchUpdateTokens}
              onSelectToken={(token) => setSelectedToken(token)}
            />
          </div>
        )}

        {activeTab === "all_apps" && (
          <ChainAppOrchestrator
            onAddTokens={(newTokens) => {
              setTokens((prev) => [...newTokens, ...prev]);
              setLastGeneratedCount((prev) => prev + newTokens.length);
            }}
            onClose={() => setActiveTab("genre_directory")}
          />
        )}

        {activeTab === "genre_directory" && (
          <GenreDirectory
            tokens={tokens}
            onAddTokens={(newTokens) => {
              setTokens((prev) => [...newTokens, ...prev]);
              setLastGeneratedCount((prev) => prev + newTokens.length);
            }}
            onSelectToken={(token) => setSelectedToken(token)}
          />
        )}

        {activeTab === "token_vault" && (
          <TokenVault
            workingTokens={tokens}
            onRestoreTokens={(restored) => setTokens(restored.slice(0, maxCapacity))}
            onSelectToken={(token) => setSelectedToken(token)}
            maxCapacity={maxCapacity}
            onMaxCapacityChange={(cap) => setMaxCapacity(cap)}
            constantLoopActive={constantLoopActive}
            onToggleConstantLoop={() => setConstantLoopActive((prev) => !prev)}
            onGenerate100={handleGenerate100}
            isGenerating={isGenerating}
          />
        )}

        {activeTab === "public_registry" && (
          <PublicContractRegistry
            tokens={tokens}
            onSelectToken={(token) => setSelectedToken(token)}
            selectedTokenIds={selectedTokenIds}
            onSelectedTokenIdsChange={setSelectedTokenIds}
            onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)}
          />
        )}

        {activeTab === "tokenomics_engine" && (
          <TokenomicsEngine
            tokens={tokens}
            onSelectToken={(token) => setSelectedToken(token)}
            onGenerate1000More={handleGenerate1000More}
            isGenerating={isGenerating}
            onBulkUpdateTokens={(tokenIds, updates) => {
              const idSet = new Set(tokenIds);
              setTokens((prev) => {
                const next = prev.map((t) => (idSet.has(t.id) ? { ...t, ...updates } : t));
                secureTokensToVault(next, maxCapacity, "tokenomics_engine_bulk_update")
                  .catch((err) => console.error("Vault save error:", err));
                return next;
              });
            }}
            onAddTokens={(newTokens) => {
              setTokens((prev) => {
                const next = [...newTokens, ...prev];
                return next.slice(0, maxCapacity);
              });
            }}
          />
        )}

        {activeTab === "liquidity_pools" && (
          <LiquidityPoolsExplorer
            onSelectPool={() => {
              setActiveTab("customer_liquidity_exchange");
            }}
            onOpenLiquidityPoolInit={() => handleOpenLiquidityPoolInit(selectedToken || undefined)}
          />
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <TokenAnalyticsCharts tokens={tokens} onSelectToken={(token) => setSelectedToken(token)} />
          </div>
        )}

        {activeTab === "quantum_analytics" && (
          <QuantumAnalytics
            tokens={tokens}
            onSelectToken={(token) => setSelectedToken(token)}
            onGenerate100={handleGenerate100}
            onGenerate1000More={handleGenerate1000More}
            isGenerating={isGenerating}
            onAddTokens={(newTokens) => {
              setTokens((prev) => {
                const next = [...newTokens, ...prev];
                return next.slice(0, maxCapacity);
              });
            }}
          />
        )}

        {activeTab === "scripts" && <ScriptHub />}

        {activeTab === "prompts" && (
          <PromptLibrary
            onUsePromptInAI={handleUsePromptInAI}
            onImportTokens={handleImportTokens}
            onSendToRemix={handleSendToRemix}
          />
        )}

        {activeTab === "ai_assistant" && (
          <AIAssistant
            initialPrompt={aiPromptOverride}
            onImportTokens={handleImportTokens}
          />
        )}

        {activeTab === "genesis_launch" && (
          <GenesisLaunchAutomator
            tokens={tokens}
            onSelectToken={(token) => setSelectedToken(token)}
          />
        )}

        {activeTab === "simulator" && (
          <DeploymentSimulator
            tokens={tokens}
            onSelectToken={(token) => setSelectedToken(token)}
          />
        )}

        {activeTab === "art_studio" && (
          <TokenArtVisualizer
            tokens={tokens}
            selectedToken={selectedToken}
            onSelectToken={(token) => setSelectedToken(token)}
            onDeployToken={(token) => {
              setSelectedToken(token);
              setActiveTab("genesis_launch");
            }}
          />
        )}

        {activeTab === "crypto_architect" && (
          <CryptoArchitect
            onInventToken={handleImportTokens}
            onSendToRemix={handleSendToRemix}
            onNavigateTab={(tab) => setActiveTab(tab as NavTabId)}
          />
        )}

        {activeTab === "remix" && (
          <RemixIntegration
            tokens={tokens}
            onImportTokens={handleImportTokens}
            injectedSolidityCode={remixInjectedSolidity}
          />
        )}

        {activeTab === "high_volume" && <HighVolumeWorkerModal />}

        {/* Cryptographic Key Management & Secure Enclaves (Deterministic Web3 Signing Bridge) */}
        {activeTab === "key_enclave_bridge" && (
          <CryptographicKeyEnclaveSigningBridge
            onNavigateToTab={(tab) => setActiveTab(tab as NavTabId)}
            onOpenUniversalWallet={() => setIsUniversalWalletOpen(true)}
          />
        )}
        </main>
      </EnterpriseWorkspaceShell>

      {/* Footer */}
      <footer className="border-t border-[#1F1F23] bg-[#0A0A0C] py-5 pb-14 text-xs text-[#8E9299]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#F27D26]" />
            <span className="font-bold text-[#E0E0E0] tracking-tight">OMNI-ID 2026</span>
            <span className="text-[10px] text-[#555] uppercase font-mono">High-Volume Synthetic Foundry</span>
          </div>
          <div className="flex items-center space-x-6 text-[10px] font-mono">
            <div>
              <span className="text-[#555] uppercase font-bold mr-1.5">Latency:</span>
              <span className="text-white">12ms</span>
            </div>
            <div>
              <span className="text-[#555] uppercase font-bold mr-1.5">Entropy Source:</span>
              <span className="text-green-500">Quantum Lattice PRNG</span>
            </div>
            <div>
              <span className="text-[#555] uppercase font-bold mr-1.5">System:</span>
              <span className="text-green-500">Operational (94%)</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Inspector */}
      {selectedToken && (
        <TokenDetailModal
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          metaMaskDeployer={metaMaskSync.activeDeployerAddress}
          isMetaMaskConnected={metaMaskSync.isConnected}
          onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
          onUpdateTokenDeployer={handleUpdateTokenDeployer}
          onDuplicateToken={(tok) => {
            const duplicated = handleDuplicateToken(tok);
            setSelectedToken(duplicated);
          }}
          onOpenGlobalSwapSell={handleOpenGlobalSwapSell}
          onOpenMultimodalHub={(tok) => {
            setSelectedToken(tok);
            setActiveTab("multi_modal_vision");
          }}
        />
      )}

      {/* Universal Swap & Sell Modal (52 World Exchanges) */}
      <GlobalExchangeSwapSellModal
        isOpen={isGlobalSwapSellModalOpen}
        onClose={() => setIsGlobalSwapSellModalOpen(false)}
        tokens={tokens}
        initialToken={globalSwapSellToken}
        initialMode={globalSwapSellMode}
        metaMaskAccount={metaMaskSync.activeDeployerAddress}
        isMetaMaskConnected={metaMaskSync.isConnected}
        onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
        onUpdateTokens={handleBatchUpdateTokens}
        onSelectToken={(token) => setSelectedToken(token)}
      />

      {/* Universal Smart Contract Validation Matrix (Remix + Etherscan + MetaMask) */}
      <UniversalContractValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        tokens={tokens}
      />

      {/* Global Encrypted Memory Health Check & Diagnostics Modal */}
      <MemoryHealthCheckModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        tokens={tokens}
        onHealed={() => {
          // Token state is maintained
        }}
      />

      {/* MetaMask Deployer Address Sync Studio Modal */}
      <MetaMaskDeployerSyncModal
        isOpen={isMetaMaskModalOpen}
        onClose={() => setIsMetaMaskModalOpen(false)}
        metaMaskSync={metaMaskSync}
        tokens={tokens}
        selectedTokenIds={selectedTokenIds}
        onApplyDeployerToTokens={handleApplyDeployerToTokens}
      />

      {/* MetaMask Sovereign Enclave: Mao-Mao Full Capacity Transfer Modal */}
      <MetaMaskMaoMaoTransferModal
        isOpen={isMaoMaoModalOpen}
        onClose={() => setIsMaoMaoModalOpen(false)}
        metaMaskSync={metaMaskSync}
        initialMode={maoMaoModalMode}
      />

      {/* Sovereign Blockchain Market Deployment Hub Modal */}
      <MarketDeploymentHubModal
        isOpen={isMarketDeployModalOpen}
        onClose={() => setIsMarketDeployModalOpen(false)}
        tokens={tokens}
        targetTokenIds={marketDeployTargetIds}
        metaMaskDeployer={metaMaskSync.activeDeployerAddress}
        onDeployAllSuccess={handleMarketDeploySuccess}
      />

      {/* Pro VIP Subscription & Web3 Crypto Payment Modal */}
      <ProSubscriptionModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        metaMaskAccount={metaMaskSync.activeDeployerAddress}
        isMetaMaskConnected={metaMaskSync.isConnected}
        onOpenMetaMaskSync={() => setIsMetaMaskModalOpen(true)}
      />

      {/* World Wide Web Connectivity Modal (8 Global Nodes, 10 Core Languages & Market Feeds) */}
      <WorldConnectivityModal
        isOpen={isWorldConnectivityModalOpen}
        onClose={() => setIsWorldConnectivityModalOpen(false)}
      />

      {/* Fullstack Token Service Manager (Trillions & UINT256 Max Allowance Generator) */}
      {isTokenServiceManagerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setIsTokenServiceManagerOpen(false)}
        >
          <div
            className="w-full max-w-5xl my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setIsTokenServiceManagerOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-[#22222E] text-gray-300 hover:text-white text-xs font-mono border border-[#2B2B38] transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Close Window</span>
                <span>✕</span>
              </button>
            </div>
            <FullstackTokenServiceManagerModal
              onAddTokens={(newTokens) => {
                setTokens((prev) => {
                  const combined = [...newTokens, ...prev];
                  return combined.slice(0, maxCapacity);
                });
                continuousVaultSaver.saveTokensToDurableStorage(newTokens);
                secureTokensToVault(newTokens, maxCapacity, "trillions_uint256_fullstack_generator")
                  .catch((err) => console.warn("Vault save warning:", err));
                setLastGeneratedCount(newTokens.length);
              }}
              onSelectToken={(token) => {
                setSelectedToken(token);
                setIsTokenServiceManagerOpen(false);
              }}
              onNavigateToTab={(tab) => {
                setActiveTab(tab as NavTabId);
                setIsTokenServiceManagerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Universal Web3 Multi-Wallet Extension Popup (MetaMask, Coinbase, Trust, Rabby + Drainer Sentinel) */}
      <UniversalWalletExtensionPopup
        isOpen={isUniversalWalletOpen}
        onClose={() => setIsUniversalWalletOpen(false)}
        onOpenSendReceive={handleOpenMaoMaoTransfer}
        onOpenSwap={() => handleOpenGlobalSwapSell(undefined, "swap")}
      />

      {/* Unified Auth Gateway Modal */}
      <TokenWorldUnifiedAuthGateway
        isOpen={isAuthGatewayModalOpen}
        onClose={() => setIsAuthGatewayModalOpen(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab as NavTabId);
          setIsAuthGatewayModalOpen(false);
        }}
      />

      {/* Membership Tiers & Unified Checkout Portal Modal */}
      <MembershipPortalModal />

      {/* Tier Gated Feature Protection Modal */}
      <TierGatedModal />

      {/* Discount Center Modal (Triggerable from Quick Links) */}
      {isDiscountCenterOpen && (
        <DiscountCenter isModal={true} onClose={closeDiscountCenter} />
      )}

      {/* Interactive Liquidity Pool Initialization Modal (Sovereign Market Cap Parameterized) */}
      <LiquidityPoolInitializationModal
        isOpen={isLiquidityPoolModalOpen}
        onClose={() => setIsLiquidityPoolModalOpen(false)}
        tokens={tokens}
        initialToken={liquidityPoolTargetToken}
        onUpdateTokens={handleBatchUpdateTokens}
        activeDeployerAddress={metaMaskSync.activeDeployerAddress}
        isMetaMaskConnected={metaMaskSync.isConnected}
      />
    </div>
  );
}

export default function App() {
  return (
    <MembershipProvider>
      <ShowroomSyncProvider>
        <AppContent />
      </ShowroomSyncProvider>
    </MembershipProvider>
  );
}
