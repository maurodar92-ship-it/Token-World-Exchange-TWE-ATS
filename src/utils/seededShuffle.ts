/**
 * Seeded PRNG & Fisher-Yates Shuffling Engine
 *
 * Implements an unbiased Fisher-Yates (Knuth) shuffle driven by the Mulberry32
 * pseudo-random number generator (PRNG).
 *
 * Why Mulberry32 + Fisher-Yates?
 * 1. Unbiased: Every permutation of N elements has exact equal probability (1 / N!).
 * 2. Deterministic & Seeded: The exact sequence is 100% reproducible for auditability.
 * 3. High Performance: O(N) linear time and low memory footprint, scaling to large datasets.
 * 4. Bias Elimination: Removes temporal, alphabetical, and chain insertion bias from large datasets.
 */

/**
 * 32-bit Mulberry32 PRNG generator
 * Produces pseudo-random numbers in [0, 1) from a 32-bit unsigned integer seed.
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Performs an unbiased Fisher-Yates shuffle using Mulberry32 PRNG.
 * Does not mutate the source array.
 *
 * @param array The source array of items to shuffle
 * @param seed A 32-bit integer seed for deterministic randomization
 * @returns A new shuffled array with identical elements in randomized order
 */
export function seededShuffle<T>(array: readonly T[], seed: number): T[] {
  if (!array || array.length <= 1) {
    return array ? [...array] : [];
  }

  const result = [...array];
  const rng = createMulberry32(seed);

  // Modern Fisher-Yates (Knuth) shuffle: loop from n-1 down to 1
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

/**
 * Generates an entropy-rich 32-bit unsigned integer seed.
 * Uses window.crypto if available, falling back to timestamp + high-precision timer.
 */
export function generateShuffleSeed(): number {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.getRandomValues === "function") {
    try {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      if (buffer[0] !== 0) {
        return buffer[0] >>> 0;
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback: mix Date.now() with Math.random()
  const time = Date.now() >>> 0;
  const rand = Math.floor(Math.random() * 0xffffffff) >>> 0;
  return ((time ^ rand) >>> 0) || 0x12345678;
}

/**
 * Formats a seed into a human-readable identifier (e.g. #04829).
 */
export function formatSeedDisplay(seed: number): string {
  const normalized = Math.abs(seed) % 1000000;
  return `#${normalized.toString(16).toUpperCase().padStart(5, "0")}`;
}
