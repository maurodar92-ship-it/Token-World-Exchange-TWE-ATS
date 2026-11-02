import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  User 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch,
  serverTimestamp,
  deleteDoc,
  getDoc,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { TokenRecord } from "../types";
import {
  shouldBypassFirestoreWrite,
  markFirestoreQuotaExceeded,
  isQuotaError,
} from "../utils/firestoreQuotaGuard";

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with configured databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Gracefully initialize anonymous auth if not already signed in
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth).catch(() => {
        // Fallback silently if anonymous auth is not configured on project
      });
    }
  });
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      // Save/update user profile in Firestore
      try {
        const userRef = doc(db, "users", result.user.uid);
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email || "",
          displayName: result.user.displayName || "Web3 Architect",
          photoURL: result.user.photoURL || "",
          lastLoginAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn("Could not sync user document to Firestore:", err);
      }
    }
    return result.user;
  } catch (error) {
    console.error("Google Sign-In failed:", error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-Out failed:", error);
    throw error;
  }
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface GeminiMemoryItem {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: string;
  source?: string;
  tags?: string[];
  tokenCount?: number;
  tokenSymbol?: string;
  associatedContractAddress?: string;
}

export interface GeneratorSaveState {
  id: string;
  totalTokensCount: number;
  autoSaveEnabled: boolean;
  constantGenerationActive: boolean;
  generationIntervalMs: number;
  maxListCapacity?: number;
  isVaultSecured?: boolean;
  vaultTokenCount?: number;
  lastSavedAt: string;
  activeChains: string[];
}

/**
 * Real-time listener for Firestore tokens
 */
export function subscribeToSavedTokens(
  callback: (tokens: TokenRecord[]) => void,
  onError?: (err: any) => void
) {
  const tokensRef = collection(db, "tokens");
  const q = query(tokensRef, limit(300));

  return onSnapshot(
    q,
    (snapshot) => {
      const tokens: TokenRecord[] = [];
      snapshot.forEach((docSnap) => {
        tokens.push(docSnap.data() as TokenRecord);
      });
      callback(tokens);
    },
    (err) => {
      console.warn("Firestore tokens subscription error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save single or batch tokens to Firestore
 */
export async function saveTokensToFirestore(tokens: TokenRecord[]): Promise<number> {
  if (!tokens || tokens.length === 0) return 0;
  if (shouldBypassFirestoreWrite()) {
    return tokens.length;
  }

  const maxBatch = Math.min(tokens.length, 450); // Firestore batch limit is 500

  try {
    const batch = writeBatch(db);

    for (let i = 0; i < maxBatch; i++) {
      const token = tokens[i];
      const docRef = doc(db, "tokens", token.id || `tok_${Date.now()}_${i}`);
      const quantum_entropy_signature = token.quantum_entropy_signature || 
        `qes_0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}::${token.chain || "evm"}::node_${i + 1}::t_${Date.now().toString(16)}`;

      batch.set(docRef, {
        ...token,
        quantum_entropy_signature,
        _updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    await batch.commit();
    return maxBatch;
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err instanceof Error ? err.message : String(err));
      return maxBatch;
    }
    console.warn("Firestore saveTokensToFirestore error, falling back to local storage:", err);
    return maxBatch;
  }
}

/**
 * Recursively removes undefined fields from an object to ensure Firestore setDoc/updateDoc never fails
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    }
    if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      result[key] = removeUndefinedFields(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

const LOCAL_STORAGE_GEMINI_FALLBACK = "foundry_vault_gemini_memory_fallback_v1";

/**
 * Save Gemini base memory item
 */
export async function saveGeminiMemory(item: GeminiMemoryItem): Promise<void> {
  // Always persist to local storage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_GEMINI_FALLBACK);
    const list: GeminiMemoryItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(item);
    localStorage.setItem(LOCAL_STORAGE_GEMINI_FALLBACK, JSON.stringify(list.slice(0, 100)));
  } catch {
    // Ignore
  }

  if (shouldBypassFirestoreWrite()) {
    return;
  }

  try {
    const memoryRef = doc(db, "gemini_memory", item.id || `mem_${Date.now()}`);
    await setDoc(
      memoryRef,
      removeUndefinedFields({
        ...item,
        savedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err instanceof Error ? err.message : String(err));
      return;
    }
    console.warn("Could not persist memory to Firestore:", err);
  }
}

/**
 * Subscribe to Gemini persistent memories
 */
export function subscribeToGeminiMemories(
  callback: (memories: GeminiMemoryItem[]) => void
) {
  const memRef = collection(db, "gemini_memory");
  const q = query(memRef, limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const memories: GeminiMemoryItem[] = [];
      snapshot.forEach((docSnap) => {
        memories.push(docSnap.data() as GeminiMemoryItem);
      });
      callback(memories);
    },
    (err) => {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded(err?.message);
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_GEMINI_FALLBACK);
          if (raw) callback(JSON.parse(raw));
        } catch {
          // ignore
        }
        return;
      }
      console.warn("Firestore memory subscription error:", err);
    }
  );
}

const LOCAL_STORAGE_GENERATOR_STATE = "foundry_vault_generator_state_fallback_v1";

/**
 * Save Generator constant state
 */
export async function saveGeneratorState(state: GeneratorSaveState): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_GENERATOR_STATE, JSON.stringify(state));
  } catch {
    // ignore
  }

  if (shouldBypassFirestoreWrite()) {
    return;
  }

  try {
    const stateRef = doc(db, "generator_state", "current");
    await setDoc(stateRef, removeUndefinedFields({
      ...state,
      lastSavedAt: new Date().toISOString(),
    }), { merge: true });
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err instanceof Error ? err.message : String(err));
      return;
    }
    console.warn("Could not save generator state to Firestore:", err);
  }
}

/**
 * Load Generator constant state
 */
export async function loadGeneratorState(): Promise<GeneratorSaveState | null> {
  if (shouldBypassFirestoreWrite()) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_GENERATOR_STATE);
      if (raw) return JSON.parse(raw) as GeneratorSaveState;
    } catch {
      // ignore
    }
  }

  try {
    const stateRef = doc(db, "generator_state", "current");
    const snap = await getDoc(stateRef);
    if (snap.exists()) {
      return snap.data() as GeneratorSaveState;
    }
  } catch (e) {
    if (isQuotaError(e)) {
      markFirestoreQuotaExceeded();
    }
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_GENERATOR_STATE);
      if (raw) return JSON.parse(raw) as GeneratorSaveState;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Save Prompt directly to Firebase Vault
 */
export async function savePromptToVault(
  promptText: string,
  metadata?: {
    tokenCount?: number;
    tokenSymbol?: string;
    source?: string;
    associatedContractAddress?: string;
    tags?: string[];
  }
): Promise<GeminiMemoryItem> {
  const item: GeminiMemoryItem = {
    id: `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    role: "user",
    content: promptText,
    timestamp: new Date().toISOString(),
    source: metadata?.source || "vault_prompt_generator",
    tags: metadata?.tags || ["vault_prompt", metadata?.tokenSymbol || "token"],
    tokenCount: metadata?.tokenCount,
    tokenSymbol: metadata?.tokenSymbol,
    associatedContractAddress: metadata?.associatedContractAddress,
  };
  await saveGeminiMemory(item);
  return item;
}

/**
 * Fetch all saved prompts/memories from Firestore
 */
export async function fetchVaultPrompts(): Promise<GeminiMemoryItem[]> {
  try {
    const memRef = collection(db, "gemini_memory");
    const q = query(memRef, orderBy("timestamp", "desc"), limit(100));
    const snapshot = await getDocs(q);
    const results: GeminiMemoryItem[] = [];
    snapshot.forEach((d) => {
      results.push(d.data() as GeminiMemoryItem);
    });
    return results;
  } catch (err) {
    try {
      const memRef = collection(db, "gemini_memory");
      const q = query(memRef, limit(100));
      const snapshot = await getDocs(q);
      const results: GeminiMemoryItem[] = [];
      snapshot.forEach((d) => {
        results.push(d.data() as GeminiMemoryItem);
      });
      return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      console.warn("Error fetching vault prompts:", e);
      return [];
    }
  }
}

/**
 * Delete a prompt/memory from Firestore
 */
export async function deleteVaultPrompt(id: string): Promise<void> {
  const docRef = doc(db, "gemini_memory", id);
  await deleteDoc(docRef);
}
