/**
 * Automated Memory Health Check Diagnostic Engine
 * Validates the cryptographic integrity, schema, and decryptability of encrypted
 * quantum memory blobs stored in localStorage / durable stores.
 * Alerts if ciphertext corruption, invalid IV/salt, or decryption failure occurs.
 */

import {
  ACTIVE_COCKPIT_VAULT_KEY,
  DEFAULT_SESSION_PASSPHRASE,
  decryptMemoryPayload,
  encryptMemoryPayload,
  EncryptedPackage,
} from "./quantumMemory";

export { DEFAULT_SESSION_PASSPHRASE };

// Storage keys for encrypted enclaves
export const ENCRYPTED_STORAGE_KEY = "quantum_encrypted_memory_vault";
export const ENCRYPTED_VAULT_ITEMS_KEY = "encrypted_token_vault_items";

export function isClientCryptoAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

export type HealthStatus = "healthy" | "degraded" | "corrupted" | "empty" | "error";

export interface BlobDiagnosticResult {
  storageKey: string;
  name: string;
  status: HealthStatus;
  exists: boolean;
  sizeBytes: number;
  algorithm: string;
  ivLengthBits: number | null;
  saltLengthBits: number | null;
  decryptedSuccessfully: boolean;
  itemCount: number;
  lastEncryptedAt: number | null;
  latencyMs: number;
  errorMessage: string | null;
  tamperDetected: boolean;
}

export interface MemoryHealthReport {
  timestamp: number;
  overallStatus: HealthStatus;
  totalBlobsChecked: number;
  healthyBlobsCount: number;
  corruptedBlobsCount: number;
  cryptoApiAvailable: boolean;
  results: BlobDiagnosticResult[];
  recommendations: string[];
}

// Track health listeners for automated continuous monitoring
type HealthListener = (report: MemoryHealthReport) => void;
const healthListeners = new Set<HealthListener>();
let lastHealthReport: MemoryHealthReport | null = null;
let automatedIntervalId: any = null;

/**
 * Validates base64 string safety and decodes length
 */
function testBase64Length(b64Str: string): number | null {
  try {
    const raw = atob(b64Str);
    return raw.length;
  } catch {
    return null;
  }
}

/**
 * Executes a complete diagnostic health check on a specific encrypted blob
 */
export async function diagnoseEncryptedBlob(
  storageKey: string,
  friendlyName: string,
  passphrase: string = DEFAULT_SESSION_PASSPHRASE
): Promise<BlobDiagnosticResult> {
  const startTime = performance.now();

  const emptyResult: BlobDiagnosticResult = {
    storageKey,
    name: friendlyName,
    status: "empty",
    exists: false,
    sizeBytes: 0,
    algorithm: "AES-GCM-256",
    ivLengthBits: null,
    saltLengthBits: null,
    decryptedSuccessfully: false,
    itemCount: 0,
    lastEncryptedAt: null,
    latencyMs: 0,
    errorMessage: null,
    tamperDetected: false,
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return {
      ...emptyResult,
      status: "error",
      errorMessage: "Local storage is not accessible in this environment",
      latencyMs: performance.now() - startTime,
    };
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return {
      ...emptyResult,
      latencyMs: performance.now() - startTime,
    };
  }

  emptyResult.exists = true;
  emptyResult.sizeBytes = new Blob([raw]).size;

  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    return {
      ...emptyResult,
      status: "corrupted",
      errorMessage: `JSON parse failed: Corrupted storage format (${e?.message || "Invalid syntax"})`,
      tamperDetected: true,
      latencyMs: performance.now() - startTime,
    };
  }

  // Check structure for quantumMemory package
  if (parsed.ciphertext && parsed.iv && parsed.salt) {
    const ivBytes = testBase64Length(parsed.iv);
    const saltBytes = testBase64Length(parsed.salt);
    const cipherBytes = testBase64Length(parsed.ciphertext);

    emptyResult.algorithm = parsed.algorithm || "AES-GCM-256";
    emptyResult.lastEncryptedAt = parsed.timestamp || null;
    emptyResult.ivLengthBits = ivBytes ? ivBytes * 8 : null;
    emptyResult.saltLengthBits = saltBytes ? saltBytes * 8 : null;

    if (ivBytes === null || saltBytes === null || cipherBytes === null) {
      return {
        ...emptyResult,
        status: "corrupted",
        errorMessage: "Corrupted Base64 encoding in cryptographic vector (IV or Salt invalid)",
        tamperDetected: true,
        latencyMs: performance.now() - startTime,
      };
    }

    if (ivBytes !== 12) {
      return {
        ...emptyResult,
        status: "corrupted",
        errorMessage: `Non-standard AES-GCM IV length: expected 96-bit (12 bytes), received ${ivBytes * 8}-bit`,
        tamperDetected: true,
        latencyMs: performance.now() - startTime,
      };
    }

    // Attempt cryptographic decryption
    try {
      const decrypted = await decryptMemoryPayload(parsed as EncryptedPackage, passphrase);
      const itemsCount = Array.isArray(decrypted?.tokens)
        ? decrypted.tokens.length
        : decrypted?.tokenId !== undefined
        ? 1
        : 0;

      return {
        ...emptyResult,
        status: "healthy",
        decryptedSuccessfully: true,
        itemCount: itemsCount,
        errorMessage: null,
        tamperDetected: false,
        latencyMs: performance.now() - startTime,
      };
    } catch (decryptErr: any) {
      return {
        ...emptyResult,
        status: "corrupted",
        decryptedSuccessfully: false,
        errorMessage: `Decryption failed: GCM Authentication Tag mismatch or incorrect passphrase (${decryptErr?.message || "Authentication tag validation failure"})`,
        tamperDetected: true,
        latencyMs: performance.now() - startTime,
      };
    }
  }

  // Check structure for encryptedMemory legacy format (encryptedPackage with data/iv/salt)
  if (parsed.encryptedPackage && typeof parsed.encryptedPackage === "string") {
    try {
      const innerPackage = JSON.parse(parsed.encryptedPackage);
      const decrypted = await decryptMemoryPayload(innerPackage, passphrase);
      return {
        ...emptyResult,
        status: "healthy",
        decryptedSuccessfully: true,
        itemCount: Array.isArray(decrypted?.tokens) ? decrypted.tokens.length : 1,
        errorMessage: null,
        tamperDetected: false,
        latencyMs: performance.now() - startTime,
      };
    } catch (err: any) {
      return {
        ...emptyResult,
        status: "corrupted",
        decryptedSuccessfully: false,
        errorMessage: `Legacy vault decryption failed: ${err?.message || "Corrupted payload"}`,
        tamperDetected: true,
        latencyMs: performance.now() - startTime,
      };
    }
  }

  // Not recognized as valid encrypted package
  return {
    ...emptyResult,
    status: "corrupted",
    errorMessage: "Storage blob does not conform to recognized cryptographic package schema (missing ciphertext/IV/salt)",
    tamperDetected: true,
    latencyMs: performance.now() - startTime,
  };
}

/**
 * Runs a comprehensive health diagnostic check across all known encrypted storage keys
 */
export async function runCompleteMemoryHealthCheck(
  passphrase: string = DEFAULT_SESSION_PASSPHRASE
): Promise<MemoryHealthReport> {
  const cryptoAvailable = isClientCryptoAvailable();

  const targetBlobs = [
    { key: ACTIVE_COCKPIT_VAULT_KEY, name: "Active Cockpit Quantum Vault" },
    { key: ENCRYPTED_STORAGE_KEY, name: "Persistent Quantum Encrypted Memory" },
    { key: ENCRYPTED_VAULT_ITEMS_KEY, name: "Encrypted Token Vault Archive" },
  ];

  const results: BlobDiagnosticResult[] = [];
  for (const target of targetBlobs) {
    const res = await diagnoseEncryptedBlob(target.key, target.name, passphrase);
    results.push(res);
  }

  const corruptedCount = results.filter((r) => r.status === "corrupted" || r.status === "error").length;
  const healthyCount = results.filter((r) => r.status === "healthy").length;
  const existingCount = results.filter((r) => r.exists).length;

  let overallStatus: HealthStatus = "healthy";
  const recommendations: string[] = [];

  if (!cryptoAvailable) {
    overallStatus = "error";
    recommendations.push("Web Crypto API is not available or disabled in your browser environment.");
  } else if (corruptedCount > 0) {
    overallStatus = "corrupted";
    recommendations.push(
      "One or more encrypted memory blobs failed cryptographic authentication. Use 'Self-Heal Vault' to re-encrypt working tokens with a verified key."
    );
  } else if (existingCount === 0) {
    overallStatus = "empty";
    recommendations.push("No encrypted blobs found in local storage. Click 'Encrypt Working Tokens' to seed the vault.");
  } else {
    overallStatus = "healthy";
    recommendations.push("All encrypted memory blobs passed 256-bit AES-GCM verification with zero integrity faults.");
  }

  const report: MemoryHealthReport = {
    timestamp: Date.now(),
    overallStatus,
    totalBlobsChecked: results.length,
    healthyBlobsCount: healthyCount,
    corruptedBlobsCount: corruptedCount,
    cryptoApiAvailable: cryptoAvailable,
    results,
    recommendations,
  };

  lastHealthReport = report;
  notifyHealthListeners(report);
  return report;
}

/**
 * Simulates a corrupted blob in local storage for testing the health check & alerting tool
 */
export function simulateBlobCorruption(storageKey: string = ACTIVE_COCKPIT_VAULT_KEY): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  const existing = localStorage.getItem(storageKey);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed.ciphertext) {
        parsed.ciphertext = "TAMPERED__" + parsed.ciphertext.slice(10);
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
    } catch {
      localStorage.setItem(storageKey, "CORRUPTED_NON_JSON_DATA_0xDEADBEEF");
    }
  } else {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ciphertext: "BAD_CIPHERTEXT_SIGNATURE",
        iv: btoa("invalid_iv_length"),
        salt: btoa("invalid_salt"),
        timestamp: Date.now(),
      })
    );
  }

  runCompleteMemoryHealthCheck();
}

/**
 * Self-healing repair: re-encrypts current tokens and writes a fresh, valid AES-GCM package
 */
export async function selfHealEncryptedVault(
  tokens: any[],
  passphrase: string = DEFAULT_SESSION_PASSPHRASE
): Promise<MemoryHealthReport> {
  const payload = {
    contractId: tokens[0]?.contractAddress || "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891",
    tokenId: tokens[0]?.tokenId || 101,
    savedBalance: (tokens.length * 1000).toFixed(2),
    timestamp: Date.now(),
    tokens,
    healedAt: Date.now(),
  };

  const encrypted = await encryptMemoryPayload(payload, passphrase);
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(ACTIVE_COCKPIT_VAULT_KEY, JSON.stringify(encrypted));
  }

  return await runCompleteMemoryHealthCheck(passphrase);
}

/**
 * Subscribe to automated periodic health checks
 */
export function subscribeToMemoryHealth(listener: HealthListener): () => void {
  healthListeners.add(listener);
  if (lastHealthReport) {
    listener(lastHealthReport);
  }
  return () => {
    healthListeners.delete(listener);
  };
}

function notifyHealthListeners(report: MemoryHealthReport): void {
  healthListeners.forEach((l) => {
    try {
      l(report);
    } catch (e) {
      console.error("Health listener callback error:", e);
    }
  });
}

/**
 * Starts automated background interval monitoring
 */
export function startAutomatedHealthMonitoring(intervalSeconds: number = 20): void {
  if (automatedIntervalId) clearInterval(automatedIntervalId);
  runCompleteMemoryHealthCheck();

  automatedIntervalId = setInterval(() => {
    runCompleteMemoryHealthCheck();
  }, intervalSeconds * 1000);
}

export function stopAutomatedHealthMonitoring(): void {
  if (automatedIntervalId) {
    clearInterval(automatedIntervalId);
    automatedIntervalId = null;
  }
}

export function getLastHealthReport(): MemoryHealthReport | null {
  return lastHealthReport;
}
