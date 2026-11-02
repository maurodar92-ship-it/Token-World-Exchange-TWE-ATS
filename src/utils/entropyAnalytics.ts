import { TokenRecord } from "../types";

export interface EntropyCell {
  position: number; // 0 to 63
  char: string; // '0' to 'f'
  charIndex: number; // 0 to 15
  count: number;
  frequency: number; // count / totalTokens
  expectedCount: number; // totalTokens / 16
  deviation: number; // count - expectedCount
  zScore: number; // (count - expectedCount) / sqrt(expectedCount)
}

export interface TokenEntropyMetrics {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  chain: string;
  signature: string;
  shannonEntropy: number; // bits per nibble (0 to 4.0)
  entropyEfficiency: number; // percentage (0 to 100%)
  charCounts: Record<string, number>;
  nistMonobitPValue: number;
  nistRunsPValue: number;
  chiSquareScore: number;
  chiSquarePassed: boolean;
  longestRunOfZeros: number;
  longestRunOfOnes: number;
  oneBitCount: number;
  zeroBitCount: number;
  monobitRatio: number; // ~0.500
}

export interface AggregateEntropyAnalysis {
  totalTokensAnalyzed: number;
  matrix: EntropyCell[][]; // 64 positions x 16 chars
  flatCells: EntropyCell[];
  meanShannonEntropy: number;
  minShannonEntropy: number;
  maxShannonEntropy: number;
  overallChiSquare: number;
  overallPValue: number;
  positionalEntropy: number[]; // 64 positions
  charFrequencies: Record<string, number>; // total counts for '0'..'f'
  topOutliers: EntropyCell[];
  uniqueSignaturesCount: number;
  collisionCount: number;
  sampleTokens: TokenEntropyMetrics[];
}

export const HEX_CHARACTERS = [
  "0", "1", "2", "3", "4", "5", "6", "7",
  "8", "9", "a", "b", "c", "d", "e", "f"
] as const;

// Erfc approximation for NIST test P-values
function erfc(x: number): number {
  // Abramowitz and Stegun approximation
  const z = Math.abs(x);
  const t = 1.0 / (1.0 + 0.5 * z);
  const ans =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? ans : 2.0 - ans;
}

// Convert 64-char hex string to 256 bits array
export function hexToBits(hex: string): number[] {
  const clean = hex.toLowerCase().replace(/[^0-9a-f]/g, "").padStart(64, "0").slice(0, 64);
  const bits: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const val = parseInt(clean[i], 16);
    for (let b = 3; b >= 0; b--) {
      bits.push((val >> b) & 1);
    }
  }
  return bits;
}

// Calculate Shannon entropy of a 64-char string (H = -sum(p * log2(p)))
export function calculateShannonEntropy(signature: string): {
  entropy: number;
  efficiency: number;
  counts: Record<string, number>;
} {
  const clean = signature.toLowerCase().replace(/[^0-9a-f]/g, "");
  const len = clean.length || 64;
  const counts: Record<string, number> = {};
  HEX_CHARACTERS.forEach((c) => (counts[c] = 0));

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (counts[c] !== undefined) {
      counts[c]++;
    }
  }

  let entropy = 0;
  for (const c of HEX_CHARACTERS) {
    const count = counts[c];
    if (count > 0) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
  }

  // Theoretical max for 16 symbols is log2(16) = 4.0 bits
  const efficiency = (entropy / 4.0) * 100;
  return { entropy, efficiency, counts };
}

// NIST SP 800-22 Monobit Frequency Test on 256 bits
export function calculateNistMonobitTest(bits: number[]): {
  pValue: number;
  passed: boolean;
  monobitRatio: number;
  oneCount: number;
  zeroCount: number;
} {
  const n = bits.length;
  let sn = 0;
  let ones = 0;
  for (let i = 0; i < n; i++) {
    if (bits[i] === 1) {
      sn += 1;
      ones++;
    } else {
      sn -= 1;
    }
  }
  const sObs = Math.abs(sn) / Math.sqrt(n);
  const pValue = erfc(sObs / Math.SQRT2);
  return {
    pValue,
    passed: pValue >= 0.01,
    monobitRatio: ones / n,
    oneCount: ones,
    zeroCount: n - ones,
  };
}

// NIST SP 800-22 Runs Test
export function calculateNistRunsTest(bits: number[], monobitRatio: number): {
  pValue: number;
  passed: boolean;
  longestRunZeros: number;
  longestRunOnes: number;
} {
  const n = bits.length;
  const pi = monobitRatio;
  // If monobit fails drastically, runs test is invalid
  if (Math.abs(pi - 0.5) >= 2 / Math.sqrt(n)) {
    return { pValue: 0.0, passed: false, longestRunZeros: 0, longestRunOnes: 0 };
  }

  let vObs = 1;
  let currentRun = 1;
  let currentBit = bits[0];
  let maxRunZero = currentBit === 0 ? 1 : 0;
  let maxRunOne = currentBit === 1 ? 1 : 0;

  for (let i = 1; i < n; i++) {
    if (bits[i] !== bits[i - 1]) {
      vObs++;
      currentBit = bits[i];
      currentRun = 1;
    } else {
      currentRun++;
      if (currentBit === 0 && currentRun > maxRunZero) maxRunZero = currentRun;
      if (currentBit === 1 && currentRun > maxRunOne) maxRunOne = currentRun;
    }
  }

  const numerator = Math.abs(vObs - 2 * n * pi * (1 - pi));
  const denominator = 2 * Math.sqrt(2 * n) * pi * (1 - pi);
  const pValue = erfc(numerator / denominator);

  return {
    pValue,
    passed: pValue >= 0.01,
    longestRunZeros: maxRunZero,
    longestRunOnes: maxRunOne,
  };
}

// Chi-Square Uniformity Test for 16-nibble distribution
export function calculateChiSquareScore(counts: Record<string, number>, totalLength: number = 64): {
  score: number;
  passed: boolean;
} {
  const expected = totalLength / 16; // 4.0 for 64 chars
  let chiSquare = 0;
  HEX_CHARACTERS.forEach((c) => {
    const diff = counts[c] - expected;
    chiSquare += (diff * diff) / expected;
  });
  // Critical value for 15 degrees of freedom at alpha = 0.01 is ~30.58
  return {
    score: chiSquare,
    passed: chiSquare <= 30.58,
  };
}

// Analyze single token metrics
export function analyzeTokenEntropy(token: TokenRecord): TokenEntropyMetrics {
  const sig = (token.quantum_entropy_signature || "").toLowerCase().replace(/[^0-9a-f]/g, "").padEnd(64, "0").slice(0, 64);
  const { entropy, efficiency, counts } = calculateShannonEntropy(sig);
  const bits = hexToBits(sig);
  const monobit = calculateNistMonobitTest(bits);
  const runs = calculateNistRunsTest(bits, monobit.monobitRatio);
  const chi = calculateChiSquareScore(counts, 64);

  return {
    tokenId: token.id,
    tokenName: token.name,
    tokenSymbol: token.symbol,
    chain: token.chain,
    signature: sig,
    shannonEntropy: Number(entropy.toFixed(4)),
    entropyEfficiency: Number(efficiency.toFixed(2)),
    charCounts: counts,
    nistMonobitPValue: Number(monobit.pValue.toFixed(4)),
    nistRunsPValue: Number(runs.pValue.toFixed(4)),
    chiSquareScore: Number(chi.score.toFixed(2)),
    chiSquarePassed: chi.passed,
    longestRunOfZeros: runs.longestRunZeros,
    longestRunOfOnes: runs.longestRunOnes,
    oneBitCount: monobit.oneCount,
    zeroBitCount: monobit.zeroCount,
    monobitRatio: Number(monobit.monobitRatio.toFixed(4)),
  };
}

// Build the aggregate 64 x 16 Entropy Heat Map Matrix across all tokens
export function buildAggregateEntropyAnalysis(tokens: TokenRecord[]): AggregateEntropyAnalysis {
  const validTokens = tokens.filter((t) => t.quantum_entropy_signature && t.quantum_entropy_signature.length >= 32);
  const N = validTokens.length || 1;
  const expectedPerCell = N / 16;

  // Initialize matrix: 64 positions x 16 characters
  const matrix: EntropyCell[][] = [];
  const flatCells: EntropyCell[] = [];
  const charTotals: Record<string, number> = {};
  HEX_CHARACTERS.forEach((c) => (charTotals[c] = 0));

  for (let pos = 0; pos < 64; pos++) {
    const rowCells: EntropyCell[] = [];
    HEX_CHARACTERS.forEach((char, charIndex) => {
      const cell: EntropyCell = {
        position: pos,
        char,
        charIndex,
        count: 0,
        frequency: 0,
        expectedCount: expectedPerCell,
        deviation: 0,
        zScore: 0,
      };
      rowCells.push(cell);
    });
    matrix.push(rowCells);
  }

  // Populate counts from all tokens
  const signaturesSeen = new Set<string>();
  let collisions = 0;
  const analyzedTokens: TokenEntropyMetrics[] = [];

  validTokens.forEach((token) => {
    const sig = (token.quantum_entropy_signature || "").toLowerCase().replace(/[^0-9a-f]/g, "").padEnd(64, "0").slice(0, 64);
    if (signaturesSeen.has(sig)) {
      collisions++;
    } else {
      signaturesSeen.add(sig);
    }

    analyzedTokens.push(analyzeTokenEntropy(token));

    for (let pos = 0; pos < 64; pos++) {
      const char = sig[pos];
      const charIdx = parseInt(char, 16);
      if (charIdx >= 0 && charIdx < 16) {
        matrix[pos][charIdx].count++;
        charTotals[char]++;
      }
    }
  });

  // Calculate frequencies and deviations
  for (let pos = 0; pos < 64; pos++) {
    for (let c = 0; c < 16; c++) {
      const cell = matrix[pos][c];
      cell.frequency = cell.count / N;
      cell.deviation = cell.count - expectedPerCell;
      cell.zScore = expectedPerCell > 0 ? (cell.count - expectedPerCell) / Math.sqrt(expectedPerCell) : 0;
      flatCells.push(cell);
    }
  }

  // Calculate positional Shannon entropy for each of the 64 positions
  const positionalEntropy: number[] = [];
  for (let pos = 0; pos < 64; pos++) {
    let posH = 0;
    for (let c = 0; c < 16; c++) {
      const count = matrix[pos][c].count;
      if (count > 0) {
        const p = count / N;
        posH -= p * Math.log2(p);
      }
    }
    positionalEntropy.push(Number(posH.toFixed(4)));
  }

  // Shannon entropy stats across tokens
  const entropies = analyzedTokens.map((t) => t.shannonEntropy);
  const meanH = entropies.length > 0 ? entropies.reduce((a, b) => a + b, 0) / entropies.length : 3.98;
  const minH = entropies.length > 0 ? entropies.reduce((min, v) => (v < min ? v : min), entropies[0]) : 3.8;
  const maxH = entropies.length > 0 ? entropies.reduce((max, v) => (v > max ? v : max), entropies[0]) : 4.0;

  // Global Chi-Square test across all 64 x 16 cells (df = 64 * 15 = 960)
  let totalChiSquare = 0;
  flatCells.forEach((cell) => {
    if (expectedPerCell > 0) {
      const diff = cell.count - expectedPerCell;
      totalChiSquare += (diff * diff) / expectedPerCell;
    }
  });

  // Outlier cells with highest absolute deviation
  const topOutliers = [...flatCells]
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
    .slice(0, 10);

  return {
    totalTokensAnalyzed: validTokens.length,
    matrix,
    flatCells,
    meanShannonEntropy: Number(meanH.toFixed(4)),
    minShannonEntropy: Number(minH.toFixed(4)),
    maxShannonEntropy: Number(maxH.toFixed(4)),
    overallChiSquare: Number(totalChiSquare.toFixed(2)),
    overallPValue: Number(erfc(Math.sqrt(totalChiSquare / 960)).toFixed(4)),
    positionalEntropy,
    charFrequencies: charTotals,
    topOutliers,
    uniqueSignaturesCount: signaturesSeen.size,
    collisionCount: collisions,
    sampleTokens: analyzedTokens.slice(0, 50),
  };
}
