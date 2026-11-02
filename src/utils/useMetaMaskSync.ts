import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { TokenRecord } from "../types";
import {
  checkMetaMaskInstalled,
  getMetaMaskProvider,
  getStoredDeployerAddress,
  setStoredDeployerAddress,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
  getStoredAttestation,
  setStoredAttestation,
  connectMetaMaskWallet,
  switchMetaMaskChain,
  signDeployerOwnershipAttestation,
  addCustomTokenToMetaMask,
  applyDeployerAddressToTokens,
  resolveNetworkName,
  METAMASK_CHAINS,
  DeployerAttestation,
  FOUNDRY_SOVEREIGN_DEPLOYER,
  runMetaMaskSecurityAudit,
  MetaMaskSecurityAudit,
  getDiscoveredProviders,
  EIP6963ProviderDetail,
  getIsSecurityMatrixSealed,
  setIsSecurityMatrixSealed,
  createOrGetSovereignAttestation,
  isFullCapacityMetaMaskEnabled,
  setFullCapacityMetaMaskEnabled,
  injectFullCapacityMetaMask,
} from "./metamaskSync";
import { toChecksumAddress } from "./cryptoGenerators";

export interface UseMetaMaskSyncReturn {
  isInstalled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  activeDeployerAddress: string;
  chainId: string | null;
  networkId: number | null;
  networkName: string;
  balanceEth: string | null;
  error: string | null;
  lastSyncedAt: string | null;
  isAutoSyncEnabled: boolean;
  attestation: DeployerAttestation | null;
  isAttesting: boolean;
  securityAudit: MetaMaskSecurityAudit;
  discoveredProviders: EIP6963ProviderDetail[];
  isMatrixSealed: boolean;
  isFullCapacityEnabled: boolean;
  enableFullCapacityExtension: () => void;
  toggleFullCapacityExtension: () => void;
  enableAndSealSecurityMatrix: () => void;
  toggleSecurityMatrixSealed: () => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  secureDisconnect: () => void;
  syncManualDeployerAddress: (manualAddr: string) => { success: boolean; error?: string };
  resetToFoundryDeployer: () => void;
  toggleAutoSync: () => void;
  switchChain: (chainKey: keyof typeof METAMASK_CHAINS) => Promise<boolean>;
  signAttestation: () => Promise<boolean>;
  watchTokenInMetaMask: (token: TokenRecord) => Promise<boolean>;
  applyDeployerToTokens: (
    tokens: TokenRecord[],
    selectedIds?: Set<string>
  ) => { updatedTokens: TokenRecord[]; count: number };
  clearError: () => void;
  refreshBalance: () => Promise<void>;
  reRunSecurityAudit: () => MetaMaskSecurityAudit;
}

export function useMetaMaskSync(defaultDeployer: string = FOUNDRY_SOVEREIGN_DEPLOYER): UseMetaMaskSyncReturn {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [account, setAccount] = useState<string | null>(null);
  const [activeDeployerAddress, setActiveDeployerAddress] = useState<string>(() => {
    return getStoredDeployerAddress() || defaultDeployer || FOUNDRY_SOVEREIGN_DEPLOYER;
  });
  const [chainId, setChainId] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string>("Ethereum Mainnet");
  const [balanceEth, setBalanceEth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isAutoSyncEnabled, setIsAutoSyncState] = useState<boolean>(getAutoSyncEnabled());
  const [attestation, setAttestationState] = useState<DeployerAttestation | null>(getStoredAttestation());
  const [isAttesting, setIsAttesting] = useState<boolean>(false);
  const [isMatrixSealed, setIsMatrixSealed] = useState<boolean>(() => getIsSecurityMatrixSealed());
  const [isFullCapacityEnabled, setIsFullCapacityEnabledState] = useState<boolean>(() => isFullCapacityMetaMaskEnabled());

  const enableFullCapacityExtension = useCallback(() => {
    setFullCapacityMetaMaskEnabled(true);
    setIsFullCapacityEnabledState(true);
    injectFullCapacityMetaMask();
    setIsInstalled(true);
    setIsConnected(true);
    setAccount(activeDeployerAddress);
    setIsMatrixSealed(true);
    setIsSecurityMatrixSealed(true);
  }, [activeDeployerAddress]);

  const toggleFullCapacityExtension = useCallback(() => {
    setIsFullCapacityEnabledState((prev) => {
      const next = !prev;
      setFullCapacityMetaMaskEnabled(next);
      if (next) {
        injectFullCapacityMetaMask();
        setIsInstalled(true);
      }
      return next;
    });
  }, []);

  // Automatically ensure sovereign attestation is available if matrix is sealed
  useEffect(() => {
    if (isMatrixSealed && !attestation) {
      const att = createOrGetSovereignAttestation(activeDeployerAddress);
      setAttestationState(att);
    }
  }, [isMatrixSealed, attestation, activeDeployerAddress]);

  // Network ID derived from chainId hex
  const networkId = useMemo(() => {
    if (!chainId) return 1;
    try {
      return parseInt(chainId, 16);
    } catch {
      return 1;
    }
  }, [chainId]);

  const refreshBalanceForAccount = useCallback(async (addr: string) => {
    const provider = getMetaMaskProvider();
    if (!provider || !addr) return;
    try {
      const balanceHex: string = await provider.request({
        method: "eth_getBalance",
        params: [addr, "latest"],
      });
      const big = BigInt(balanceHex);
      const formatted = ethers.formatEther(big);
      const num = parseFloat(formatted);
      setBalanceEth(num < 0.0001 && num > 0 ? "< 0.0001" : num.toFixed(4));
    } catch (e) {
      console.warn("Failed to refresh balance:", e);
    }
  }, []);

  // Check installation and restore existing session on mount
  useEffect(() => {
    const installed = checkMetaMaskInstalled();
    setIsInstalled(installed);

    const provider = getMetaMaskProvider();
    if (!provider) return;

    // Silent check for pre-authorized accounts (doesn't prompt user)
    provider
      .request({ method: "eth_accounts" })
      .then(async (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          const checksummed = ethers.getAddress(accounts[0]);
          setAccount(checksummed);
          setIsConnected(true);
          setLastSyncedAt(new Date().toLocaleTimeString());

          // Read current network
          try {
            const currentChainId: string = await provider.request({
              method: "eth_chainId",
            });
            setChainId(currentChainId);
            setNetworkName(resolveNetworkName(currentChainId));
          } catch (netErr) {
            console.warn("Could not read chain ID:", netErr);
          }

          // Auto-sync deployer if enabled or if not set
          if (getAutoSyncEnabled()) {
            setActiveDeployerAddress(checksummed);
            setStoredDeployerAddress(checksummed);
          }

          refreshBalanceForAccount(checksummed);
        }
      })
      .catch((err: any) => {
        console.warn("Silent eth_accounts check failed:", err);
      });

    // Event listeners
    const handleAccountsChanged = (newAccounts: string[]) => {
      if (!newAccounts || newAccounts.length === 0) {
        setAccount(null);
        setIsConnected(false);
        setBalanceEth(null);
        setError("MetaMask disconnected.");
      } else {
        const nextAddr = ethers.getAddress(newAccounts[0]);
        setAccount(nextAddr);
        setIsConnected(true);
        setError(null);
        setLastSyncedAt(new Date().toLocaleTimeString());

        if (getAutoSyncEnabled()) {
          setActiveDeployerAddress(nextAddr);
          setStoredDeployerAddress(nextAddr);
        }

        refreshBalanceForAccount(nextAddr);
      }
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(newChainId);
      setNetworkName(resolveNetworkName(newChainId));
      if (account) {
        refreshBalanceForAccount(account);
      }
    };

    const handleDisconnect = () => {
      setAccount(null);
      setIsConnected(false);
      setBalanceEth(null);
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);
    provider.on?.("disconnect", handleDisconnect);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
      provider.removeListener?.("disconnect", handleDisconnect);
    };
  }, [refreshBalanceForAccount, account]);

  // Connect action
  const connect = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await connectMetaMaskWallet();
      if (res.success && res.address) {
        setAccount(res.address);
        setIsConnected(true);
        setActiveDeployerAddress(res.address);
        setStoredDeployerAddress(res.address);
        if (res.chainId) {
          setChainId(res.chainId);
          setNetworkName(res.networkName || resolveNetworkName(res.chainId));
        }
        if (res.balanceEth) {
          setBalanceEth(res.balanceEth);
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
        return true;
      } else {
        setError(res.error || "MetaMask connection failed");
        return false;
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error connecting to MetaMask");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect action (clears app session)
  const disconnect = useCallback(() => {
    setAccount(null);
    setIsConnected(false);
    setBalanceEth(null);
    setError(null);
  }, []);

  // Secure Disconnect: Hard teardown of session, removes local storage keys and resets to default Foundry sovereign deployer
  const secureDisconnect = useCallback(() => {
    setAccount(null);
    setIsConnected(false);
    setBalanceEth(null);
    setError(null);
    setAttestationState(null);
    setStoredAttestation(null);
    setActiveDeployerAddress(FOUNDRY_SOVEREIGN_DEPLOYER);
    setStoredDeployerAddress(FOUNDRY_SOVEREIGN_DEPLOYER);
    setLastSyncedAt(new Date().toLocaleTimeString());
  }, []);

  const enableAndSealSecurityMatrix = useCallback(() => {
    setIsMatrixSealed(true);
    setIsSecurityMatrixSealed(true);
    const att = createOrGetSovereignAttestation(activeDeployerAddress);
    setAttestationState(att);
    setStoredAttestation(att);
    setError(null);
  }, [activeDeployerAddress]);

  const toggleSecurityMatrixSealed = useCallback(() => {
    setIsMatrixSealed((prev) => {
      const next = !prev;
      setIsSecurityMatrixSealed(next);
      return next;
    });
  }, []);

  // Real-time security audit computation
  const securityAudit = useMemo(() => {
    return runMetaMaskSecurityAudit(account, chainId, attestation, activeDeployerAddress, isMatrixSealed);
  }, [account, chainId, attestation, activeDeployerAddress, isMatrixSealed]);

  const reRunSecurityAudit = useCallback(() => {
    return runMetaMaskSecurityAudit(account, chainId, attestation, activeDeployerAddress, isMatrixSealed);
  }, [account, chainId, attestation, activeDeployerAddress, isMatrixSealed]);

  const discoveredProviders = useMemo(() => {
    return getDiscoveredProviders();
  }, []);

  // Manual address fallback for users without extension or hardware cold storage
  const syncManualDeployerAddress = useCallback(
    (manualAddr: string): { success: boolean; error?: string } => {
      if (!manualAddr || !manualAddr.trim()) {
        return { success: false, error: "Address cannot be empty" };
      }
      try {
        const clean = manualAddr.trim();
        if (!ethers.isAddress(clean)) {
          return { success: false, error: "Invalid Ethereum / EVM address format" };
        }
        const checksummed = toChecksumAddress(clean);
        setActiveDeployerAddress(checksummed);
        setStoredDeployerAddress(checksummed);
        setLastSyncedAt(new Date().toLocaleTimeString());
        setError(null);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || "Invalid address" };
      }
    },
    []
  );

  const resetToFoundryDeployer = useCallback(() => {
    setActiveDeployerAddress(FOUNDRY_SOVEREIGN_DEPLOYER);
    setStoredDeployerAddress(FOUNDRY_SOVEREIGN_DEPLOYER);
    setLastSyncedAt(new Date().toLocaleTimeString());
    setError(null);
  }, []);

  const toggleAutoSync = useCallback(() => {
    setIsAutoSyncState((prev) => {
      const next = !prev;
      setAutoSyncEnabled(next);
      if (next && account) {
        setActiveDeployerAddress(account);
        setStoredDeployerAddress(account);
      }
      return next;
    });
  }, [account]);

  const switchChain = useCallback(
    async (chainKey: keyof typeof METAMASK_CHAINS): Promise<boolean> => {
      setError(null);
      const res = await switchMetaMaskChain(chainKey);
      if (res.success) {
        const target = METAMASK_CHAINS[chainKey];
        if (target) {
          setChainId(target.chainIdHex);
          setNetworkName(target.chainName);
        }
        if (account) {
          refreshBalanceForAccount(account);
        }
        return true;
      } else {
        setError(res.error || "Failed to switch chain");
        return false;
      }
    },
    [account, refreshBalanceForAccount]
  );

  const signAttestation = useCallback(async (): Promise<boolean> => {
    if (!account) {
      setError("Connect MetaMask first before requesting attestation signature.");
      return false;
    }
    setIsAttesting(true);
    setError(null);
    try {
      const res = await signDeployerOwnershipAttestation(account);
      if (res.success && res.attestation) {
        setAttestationState(res.attestation);
        setStoredAttestation(res.attestation);
        return true;
      } else {
        setError(res.error || "Attestation signature failed");
        return false;
      }
    } catch (err: any) {
      setError(err?.message || "Attestation error");
      return false;
    } finally {
      setIsAttesting(false);
    }
  }, [account]);

  const watchTokenInMetaMask = useCallback(
    async (token: TokenRecord): Promise<boolean> => {
      setError(null);
      const res = await addCustomTokenToMetaMask({
        address: token.contractAddress,
        symbol: token.symbol,
        decimals: token.decimals,
      });
      if (res.success) {
        return true;
      } else {
        setError(res.error || "Failed to add token to MetaMask");
        return false;
      }
    },
    []
  );

  const applyDeployerToTokens = useCallback(
    (
      tokens: TokenRecord[],
      selectedIds?: Set<string>
    ): { updatedTokens: TokenRecord[]; count: number } => {
      return applyDeployerAddressToTokens(tokens, activeDeployerAddress, selectedIds);
    },
    [activeDeployerAddress]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (account) {
      await refreshBalanceForAccount(account);
    }
  }, [account, refreshBalanceForAccount]);

  return {
    isInstalled,
    isConnected,
    isConnecting,
    account,
    activeDeployerAddress,
    chainId,
    networkId,
    networkName,
    balanceEth,
    error,
    lastSyncedAt,
    isAutoSyncEnabled,
    attestation,
    isAttesting,
    securityAudit,
    discoveredProviders,
    isMatrixSealed,
    isFullCapacityEnabled,
    enableFullCapacityExtension,
    toggleFullCapacityExtension,
    enableAndSealSecurityMatrix,
    toggleSecurityMatrixSealed,
    connect,
    disconnect,
    secureDisconnect,
    syncManualDeployerAddress,
    resetToFoundryDeployer,
    toggleAutoSync,
    switchChain,
    signAttestation,
    watchTokenInMetaMask,
    applyDeployerToTokens,
    clearError,
    refreshBalance,
    reRunSecurityAudit,
  };
}
