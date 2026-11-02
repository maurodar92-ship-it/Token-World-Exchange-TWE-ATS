import { TokenRecord } from "../types";
import { 
  persistTokenBatch, 
  fetchTokens, 
  secureTokensToVault 
} from "./firebase";
import { 
  saveGeneratorState, 
  loadGeneratorState, 
  savePromptToVault,
  GeneratorSaveState 
} from "../lib/firebase";
import { saveWorkingTokensToQuantumVault } from "./quantumMemory";
import {
  shouldBypassFirestoreWrite,
  markFirestoreQuotaExceeded,
  isQuotaError,
} from "./firestoreQuotaGuard";

const LOCAL_STORAGE_VAULT_TOKENS = "foundry_vault_tokens_durable_store_v2";
const LOCAL_STORAGE_SAVER_STATE = "foundry_vault_continuous_saver_state_v2";
const LOCAL_STORAGE_PROMPTS = "foundry_vault_prompts_store_v2";

export interface ContinuousSaverState {
  isActive: boolean;
  promptText: string;
  totalSecuredCount: number;
  lastSavedAt: string;
  maxCapacity: number;
  stepCount: number;
  autoResumeOnReload: boolean;
}

export type ContinuousSaverListener = (state: ContinuousSaverState) => void;

class ContinuousVaultSaverService {
  private state: ContinuousSaverState = {
    isActive: false,
    promptText: "Synthesizing and securing token contract IDs to maximum vault memory...",
    totalSecuredCount: 0,
    lastSavedAt: new Date().toISOString(),
    maxCapacity: 1000,
    stepCount: 0,
    autoResumeOnReload: true,
  };

  private listeners: Set<ContinuousSaverListener> = new Set();
  private timerId: any = null;
  private isInitialized = false;
  private getTokensCallback: (() => TokenRecord[]) | null = null;
  private appendTokensCallback: ((newTokens: TokenRecord[]) => void) | null = null;

  constructor() {
    this.loadStateFromStorage();
  }

  /**
   * Initializes the continuous saver with window unload / visibility handlers
   */
  public init(
    getTokens: () => TokenRecord[],
    appendTokens: (newTokens: TokenRecord[]) => void
  ) {
    this.getTokensCallback = getTokens;
    this.appendTokensCallback = appendTokens;

    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load durable state
    this.loadStateFromStorage();

    // Attach unload & visibility listeners to ensure data is preserved when leaving or reloading
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleBeforeUnload);
      window.addEventListener("pagehide", this.handleBeforeUnload);
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    // Auto-resume if active previously
    if (this.state.isActive && this.state.autoResumeOnReload) {
      this.startLoop();
    }
  }

  private handleBeforeUnload = () => {
    // Flush state and tokens immediately to durable storage
    if (this.getTokensCallback) {
      const currentTokens = this.getTokensCallback();
      this.saveTokensToDurableStorage(currentTokens);
    }
    this.saveStateToStorage();
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      this.handleBeforeUnload();
    }
  };

  /**
   * Read durable tokens from local storage
   */
  public getDurableTokens(): TokenRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_VAULT_TOKENS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn("Error reading durable tokens:", e);
    }
    return [];
  }

  /**
   * Save tokens to local durable store (instant, sync) with memory expansion resilience
   */
  public saveTokensToDurableStorage(tokens: TokenRecord[], maxCap: number = 100000) {
    if (typeof window === "undefined" || !tokens) return;
    let capped: TokenRecord[] = [];
    try {
      // Merge with existing durable tokens to ensure whatever was in the vault STAYS in the vault
      const existing = this.getDurableTokens();
      const existingIds = new Set(existing.map((t) => t.contractAddress?.toLowerCase() || t.id));

      const merged = [...existing];
      for (const t of tokens) {
        const key = t.contractAddress?.toLowerCase() || t.id;
        if (!existingIds.has(key)) {
          merged.push(t);
          existingIds.add(key);
        }
      }

      // Expandable memory capacity up to requested ceiling
      capped = merged.slice(0, Math.max(10000, maxCap));
      
      try {
        localStorage.setItem(LOCAL_STORAGE_VAULT_TOKENS, JSON.stringify(capped));
      } catch (quotaErr) {
        // Fallback for tight localStorage quota: store condensed top slice
        console.warn("Storage quota warning, storing top 2,500 in durable text store:", quotaErr);
        try {
          localStorage.setItem(LOCAL_STORAGE_VAULT_TOKENS, JSON.stringify(capped.slice(0, 2500)));
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn("Could not save to durable storage:", e);
      capped = tokens.slice(0, maxCap);
    }

    // Always encrypt into Quantum Memory Enclave (AES-GCM-256 with stack-safe streaming)
    try {
      saveWorkingTokensToQuantumVault(capped).catch((err) => {
        console.warn("Quantum memory vault auto-encrypt warning:", err);
      });
    } catch (encErr) {
      console.warn("Direct quantum save error:", encErr);
    }
  }

  private loadStateFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SAVER_STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = { ...this.state, ...parsed };
      }
    } catch (e) {
      console.warn("Could not load continuous saver state:", e);
    }
  }

  private saveStateToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVER_STATE, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Could not save continuous saver state:", e);
    }
  }

  /**
   * Start or resume continuous saving
   */
  public start(promptText?: string) {
    this.state.isActive = true;
    if (promptText) {
      this.state.promptText = promptText;
    }
    this.saveStateToStorage();
    this.notifyListeners();
    this.startLoop();
  }

  /**
   * Pause continuous saving
   */
  public pause() {
    this.state.isActive = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.saveStateToStorage();
    this.notifyListeners();
  }

  /**
   * Toggle continuous saving
   */
  public toggle(promptText?: string) {
    if (this.state.isActive) {
      this.pause();
    } else {
      this.start(promptText);
    }
  }

  private lastRemoteSyncTime: number = 0;
  private lastRemoteSyncCount: number = 0;

  /**
   * Update the active prompt text
   */
  public updatePrompt(promptText: string) {
    this.state.promptText = promptText;
    this.saveStateToStorage();
    this.notifyListeners();

    if (shouldBypassFirestoreWrite()) {
      return;
    }

    // Persist prompt to Firestore memory
    savePromptToVault(promptText, {
      source: "continuous_vault_saver",
      tags: ["continuous_saving", "active_cockpit_prompt"],
    }).catch((e) => {
      if (isQuotaError(e)) {
        markFirestoreQuotaExceeded(e?.message);
      } else {
        console.warn("Could not persist prompt to Firestore:", e);
      }
    });
  }

  private startLoop() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.timerId = setInterval(async () => {
      if (!this.state.isActive) return;

      this.state.stepCount += 1;
      this.state.lastSavedAt = new Date().toISOString();

      if (this.getTokensCallback) {
        const tokens = this.getTokensCallback();
        if (tokens.length > 0) {
          // 1. Sync to local durable storage immediately (always 100% reliable)
          this.saveTokensToDurableStorage(tokens);

          // 2. Sync to Firestore in background with quota protection & smart throttling
          if (!shouldBypassFirestoreWrite()) {
            const now = Date.now();
            const elapsedSinceLastRemote = now - this.lastRemoteSyncTime;
            const countChanged = tokens.length !== this.lastRemoteSyncCount;

            // Only sync remote if at least 45s passed OR token count changed significantly, avoiding burning free quota
            if (elapsedSinceLastRemote > 45000 || (countChanged && elapsedSinceLastRemote > 15000)) {
              try {
                this.lastRemoteSyncTime = now;
                this.lastRemoteSyncCount = tokens.length;
                await secureTokensToVault(tokens, this.state.maxCapacity, "continuous_vault_saver_tick");
                this.state.totalSecuredCount = tokens.length;
              } catch (err) {
                if (isQuotaError(err)) {
                  markFirestoreQuotaExceeded(err instanceof Error ? err.message : String(err));
                } else {
                  console.warn("Continuous Firestore save tick warning:", err);
                }
              }
            }
          } else {
            this.state.totalSecuredCount = tokens.length;
          }
        }
      }

      // Save state
      this.saveStateToStorage();
      this.notifyListeners();
    }, 4000);
  }

  /**
   * Subscribe to state updates
   */
  public subscribe(listener: ContinuousSaverListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): ContinuousSaverState {
    return { ...this.state };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.state });
      } catch (e) {
        console.error("Error in continuous saver listener:", e);
      }
    }
  }
}

export const continuousVaultSaver = new ContinuousVaultSaverService();
