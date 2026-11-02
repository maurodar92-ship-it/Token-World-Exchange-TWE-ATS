/**
 * High-Performance Client-Side Token Image Cache (IndexedDB + L1 Memory Cache)
 * 
 * Provides instantaneous, flicker-free rendering of token images across app re-renders:
 * 1. Synchronous L1 memory cache (Map) for 0ms render latency.
 * 2. Asynchronous L2 IndexedDB cache for persistent local storage across sessions.
 * 3. Graceful fallback to memory/localStorage if IndexedDB is restricted or unavailable.
 */

const DB_NAME = "CryptoVaultTokenImageDB";
const DB_VERSION = 1;
const STORE_NAME = "token_images";

interface CachedImageEntry {
  tokenId: string;
  data: string; // Base64 or Data URI string
  contentType: string;
  updatedAt: number;
}

// In-memory L1 cache for zero-latency synchronous reads
const memoryCache = new Map<string, string>();
const listeners = new Set<() => void>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function isIndexedDBSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window && window.indexedDB !== null;
}

function getDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDBSupported()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "tokenId" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn("[TokenImageCache] IndexedDB open error, falling back to memory:", err);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn("[TokenImageCache] IndexedDB open blocked");
        resolve(null);
      };
    } catch (e) {
      console.warn("[TokenImageCache] Failed to initialize IndexedDB:", e);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Synchronous read from L1 memory cache (0ms latency, zero flicker)
 */
export function getSyncCachedTokenImage(tokenId: string): string | null {
  if (!tokenId) return null;
  return memoryCache.get(tokenId) || null;
}

/**
 * Asynchronous read with fallback from L1 memory -> L2 IndexedDB
 */
export async function getTokenImageFromCache(tokenId: string): Promise<string | null> {
  if (!tokenId) return null;

  // Check L1 cache first
  const memHit = memoryCache.get(tokenId);
  if (memHit) return memHit;

  // Check L2 IndexedDB
  try {
    const db = await getDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(tokenId);

        req.onsuccess = () => {
          const entry = req.result as CachedImageEntry | undefined;
          if (entry && entry.data) {
            memoryCache.set(tokenId, entry.data);
            resolve(entry.data);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Persist image data URI or Blob to L1 and L2 cache
 */
export async function setTokenImageInCache(
  tokenId: string,
  imageSrc: string | Blob
): Promise<string> {
  if (!tokenId || !imageSrc) return "";

  let dataUri: string;

  if (imageSrc instanceof Blob) {
    dataUri = await blobToDataUri(imageSrc);
  } else {
    dataUri = imageSrc;
  }

  // Update L1 Cache immediately
  memoryCache.set(tokenId, dataUri);

  // Notify active subscribers
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener error
    }
  });

  // Asynchronously update L2 IndexedDB
  try {
    const db = await getDatabase();
    if (db) {
      const entry: CachedImageEntry = {
        tokenId,
        data: dataUri,
        contentType: dataUri.startsWith("data:image/svg") ? "image/svg+xml" : "image/png",
        updatedAt: Date.now(),
      };

      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);
    }
  } catch (err) {
    console.warn("[TokenImageCache] Error persisting image to IndexedDB:", err);
  }

  return dataUri;
}

/**
 * Preload and warm up cache for a batch of tokens in the background
 */
export async function preloadTokenImages(
  tokens: Array<{ id: string; imageUrl?: string; svgData?: string }>
): Promise<void> {
  if (!tokens || tokens.length === 0) return;

  const db = await getDatabase();
  const missingFromMemory: Array<{ id: string; src: string }> = [];

  for (const token of tokens) {
    if (!token.id) continue;
    const src = token.imageUrl || (token.svgData ? `data:image/svg+xml;utf8,${encodeURIComponent(token.svgData)}` : "");
    if (!src) continue;

    if (!memoryCache.has(token.id)) {
      memoryCache.set(token.id, src);
      missingFromMemory.push({ id: token.id, src });
    }
  }

  if (db && missingFromMemory.length > 0) {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      for (const item of missingFromMemory) {
        store.put({
          tokenId: item.id,
          data: item.src,
          contentType: item.src.startsWith("data:image/svg") ? "image/svg+xml" : "image/png",
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      // background batch write failed gracefully
    }
  }
}

/**
 * Helper to convert Blob to Data URI
 */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Clear the entire image cache
 */
export async function clearTokenImageCache(): Promise<void> {
  memoryCache.clear();

  try {
    const db = await getDatabase();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
    }
  } catch (err) {
    console.warn("[TokenImageCache] Failed to clear IndexedDB:", err);
  }

  listeners.forEach((l) => l());
}

/**
 * Subscribe to image cache updates
 */
export function subscribeToImageCache(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
