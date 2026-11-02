import Prism from "prismjs";

// Ensure base prism grammar dependencies are loaded safely
if (typeof window !== "undefined") {
  // Browser environment
}

/**
 * Custom EVM ABI grammar definition for Prism.js
 * Explicitly separates and tokenizes:
 * 1. ABI Keys (e.g., "name", "type", "inputs", "outputs", "stateMutability", "internalType", "indexed")
 * 2. EVM Types (e.g., "address", "uint256", "bool", "bytes32", "string", "tuple", "uint8", array suffixes)
 * 3. EVM Function / Event Keywords (e.g., "function", "event", "constructor", "view", "pure", "nonpayable", "payable")
 * 4. Values (e.g., "transfer", "balanceOf", "recipient", "amount")
 * 5. JavaScript language keywords (for single-line ethers, viem, web3 wrapper expressions)
 */
export function initAbiPrismGrammar() {
  if (Prism.languages.evmAbi) {
    return;
  }

  Prism.languages.evmAbi = {
    // JavaScript keywords for wrapper code: const, let, new, import, await, etc.
    "abi-js-keyword": {
      pattern: /\b(const|let|var|new|import|export|from|await|async|return|function)\b(?!\s*[:=]\s*["'])/,
      alias: "keyword",
    },

    // Cast CLI command tokens
    "abi-cli-command": {
      pattern: /\b(cast|call|send|rpc|forge|anvil)\b/,
      alias: "builtin",
    },

    // ABI JSON Property Keys (specifically preceding a colon in JSON or object literals)
    "abi-key": {
      pattern: /"(?:name|type|inputs|outputs|stateMutability|constant|payable|anonymous|indexed|components|internalType)"(?=\s*:)/,
      greedy: true,
    },

    // EVM Types: in JSON string values ("address", "uint256") or unquoted in human-readable signatures
    "abi-type": {
      pattern: /"(?:address|uint256|uint8|uint16|uint32|uint64|uint128|int256|int8|int16|int32|int64|int128|bool|string|bytes32|bytes4|bytes|tuple)(?:\[\d*\])*"|\b(?:address|uint256|uint8|uint16|uint32|uint64|uint128|int256|int8|int16|int32|int64|int128|bool|string|bytes32|bytes4|bytes|tuple)(?:\[\d*\])*\b/,
      greedy: true,
    },

    // EVM Entry Kinds & State Mutabilities
    "abi-keyword": {
      pattern: /"(?:function|event|constructor|error|receive|fallback|view|pure|nonpayable|payable)"|\b(?:function|event|constructor|error|receive|fallback|returns|view|pure|payable|nonpayable|indexed|anonymous)\b/,
      greedy: true,
    },

    // Ethereum Addresses (e.g., 0x5AFE... or 0x000...)
    "abi-address": {
      pattern: /0x[a-fA-F0-9]{40}\b/,
      greedy: true,
    },

    // General string values (e.g., function names, variable names, descriptions)
    "abi-value": {
      pattern: /"(?:\\.|[^\\"\r\n])*"/,
      greedy: true,
    },

    // Booleans
    "abi-boolean": {
      pattern: /\b(?:true|false)\b/,
      alias: "boolean",
    },

    // Numbers
    "abi-number": {
      pattern: /\b\d+(?:\.\d+)?\b/,
      alias: "number",
    },

    // Delimiters & Punctuation: braces, brackets, colons, commas, semicolons
    "abi-punctuation": {
      pattern: /[{}[\],;:()]/,
      alias: "punctuation",
    },

    // Operators
    "abi-operator": {
      pattern: /[=+\-*/%&|^~<>!]/,
      alias: "operator",
    },
  };
}

// Auto-initialize grammar
initAbiPrismGrammar();

export interface HighlightStats {
  keyCount: number;
  typeCount: number;
  valueCount: number;
  keywordCount: number;
}

/**
 * Highlights an ABI string using Prism.js with custom EVM ABI tokens.
 * Returns safe HTML with classes for key, value, and type distinction.
 */
export function highlightAbiString(code: string): { html: string; stats: HighlightStats } {
  if (!code) {
    return {
      html: "",
      stats: { keyCount: 0, typeCount: 0, valueCount: 0, keywordCount: 0 },
    };
  }

  initAbiPrismGrammar();

  // Run Prism highlighting
  const grammar = Prism.languages.evmAbi || Prism.languages.javascript;
  const html = Prism.highlight(code, grammar, "evmAbi");

  // Calculate quick stats from rendered tokens
  const keyMatches = html.match(/class="[^"]*abi-key[^"]*"/g);
  const typeMatches = html.match(/class="[^"]*abi-type[^"]*"/g);
  const keywordMatches = html.match(/class="[^"]*abi-keyword[^"]*"/g);
  const valueMatches = html.match(/class="[^"]*abi-value[^"]*"/g);

  return {
    html,
    stats: {
      keyCount: keyMatches ? keyMatches.length : 0,
      typeCount: typeMatches ? typeMatches.length : 0,
      keywordCount: keywordMatches ? keywordMatches.length : 0,
      valueCount: valueMatches ? valueMatches.length : 0,
    },
  };
}
