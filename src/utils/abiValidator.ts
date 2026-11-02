/**
 * ABI Structural Validation Engine
 * Inspects EVM contract ABI strings (minified single-line, multi-line JSON, or human-readable arrays)
 * for common structural syntax issues, unbalanced delimiters, missing commas, trailing commas,
 * and EVM ABI schema conformance.
 */

export interface ABIValidationIssue {
  type: "error" | "warning";
  code:
    | "UNBALANCED_BRACKETS"
    | "UNBALANCED_BRACES"
    | "UNBALANCED_PARENS"
    | "UNMATCHED_CLOSING"
    | "UNTERMINATED_STRING"
    | "MISSING_COMMA"
    | "TRAILING_COMMA"
    | "INVALID_JSON"
    | "INVALID_ROOT_TYPE"
    | "INVALID_ENTRY_SCHEMA"
    | "EMPTY_ABI";
  message: string;
  position?: number;
  snippet?: string;
}

export interface ABIValidationStats {
  squareOpen: number;
  squareClose: number;
  curlyOpen: number;
  curlyClose: number;
  parenOpen: number;
  parenClose: number;
  quoteCount: number;
  balanced: boolean;
}

export interface ABIValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  status: "valid" | "warning" | "invalid";
  score: number; // 0 to 100
  bracketStats: ABIValidationStats;
  issues: ABIValidationIssue[];
  entryCount: number;
  detectedFormat: "json" | "human_readable" | "code_wrapper" | "empty" | "unknown";
  summary: string;
}

/**
 * Extracts pure ABI JSON/array substring if the string is wrapped in JS/TS/Shell declarations
 * (e.g., `const abi = [...];`, `ABI='[...]'`, `new ethers.Contract(addr, [...], signer)`).
 */
export function extractAbiFromCode(raw: string): { cleanStr: string; isWrapper: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { cleanStr: "", isWrapper: false };
  }

  // Check if string starts with standard array brackets or JSON
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return { cleanStr: trimmed, isWrapper: false };
  }

  // Match `const ... = [...]` or `ABI='[...]'` or `ABI="[...]"`
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return { cleanStr: arrayMatch[0], isWrapper: true };
  }

  return { cleanStr: trimmed, isWrapper: false };
}

/**
 * Validates any ABI string for structural defects.
 */
export function validateABIString(input: string): ABIValidationResult {
  const issues: ABIValidationIssue[] = [];
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      isValid: false,
      hasWarnings: false,
      status: "invalid",
      score: 0,
      bracketStats: {
        squareOpen: 0,
        squareClose: 0,
        curlyOpen: 0,
        curlyClose: 0,
        parenOpen: 0,
        parenClose: 0,
        quoteCount: 0,
        balanced: false,
      },
      issues: [
        {
          type: "error",
          code: "EMPTY_ABI",
          message: "ABI string is empty. No functions or event definitions detected.",
        },
      ],
      entryCount: 0,
      detectedFormat: "empty",
      summary: "Empty input string",
    };
  }

  const { cleanStr, isWrapper } = extractAbiFromCode(trimmed);

  // 1. Structural Lexer: Scan character by character for delimiters, strings, and commas
  const stack: { char: string; pos: number }[] = [];
  let inString = false;
  let stringQuoteChar = "";
  let stringStartPos = -1;
  let isEscaped = false;

  const stats: ABIValidationStats = {
    squareOpen: 0,
    squareClose: 0,
    curlyOpen: 0,
    curlyClose: 0,
    parenOpen: 0,
    parenClose: 0,
    quoteCount: 0,
    balanced: true,
  };

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === "\\") {
        isEscaped = true;
        continue;
      }
      if (char === stringQuoteChar) {
        inString = false;
        stats.quoteCount++;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuoteChar = char;
      stringStartPos = i;
      stats.quoteCount++;
      continue;
    }

    if (char === "[") {
      stats.squareOpen++;
      stack.push({ char, pos: i });
    } else if (char === "]") {
      stats.squareClose++;
      const top = stack.pop();
      if (!top || top.char !== "[") {
        stats.balanced = false;
        issues.push({
          type: "error",
          code: "UNMATCHED_CLOSING",
          message: `Unmatched closing square bracket ']' at column ${i + 1}.`,
          position: i,
          snippet: cleanStr.slice(Math.max(0, i - 15), Math.min(cleanStr.length, i + 15)),
        });
      }
    } else if (char === "{") {
      stats.curlyOpen++;
      stack.push({ char, pos: i });
    } else if (char === "}") {
      stats.curlyClose++;
      const top = stack.pop();
      if (!top || top.char !== "{") {
        stats.balanced = false;
        issues.push({
          type: "error",
          code: "UNMATCHED_CLOSING",
          message: `Unmatched closing brace '}' at column ${i + 1}.`,
          position: i,
          snippet: cleanStr.slice(Math.max(0, i - 15), Math.min(cleanStr.length, i + 15)),
        });
      }
    } else if (char === "(") {
      stats.parenOpen++;
      stack.push({ char, pos: i });
    } else if (char === ")") {
      stats.parenClose++;
      const top = stack.pop();
      if (!top || top.char !== "(") {
        stats.balanced = false;
        issues.push({
          type: "error",
          code: "UNMATCHED_CLOSING",
          message: `Unmatched closing parenthesis ')' at column ${i + 1}.`,
          position: i,
          snippet: cleanStr.slice(Math.max(0, i - 15), Math.min(cleanStr.length, i + 15)),
        });
      }
    }
  }

  // Check unterminated string
  if (inString) {
    stats.balanced = false;
    issues.push({
      type: "error",
      code: "UNTERMINATED_STRING",
      message: `Unclosed string literal starting at column ${stringStartPos + 1}. Expected matching quote ${stringQuoteChar}.`,
      position: stringStartPos,
      snippet: cleanStr.slice(stringStartPos, Math.min(cleanStr.length, stringStartPos + 30)),
    });
  }

  // Check remaining open brackets on stack
  if (stack.length > 0) {
    stats.balanced = false;
    for (const open of stack) {
      const name = open.char === "{" ? "brace '{'" : open.char === "[" ? "bracket '['" : "parenthesis '('";
      issues.push({
        type: "error",
        code: open.char === "{" ? "UNBALANCED_BRACES" : open.char === "[" ? "UNBALANCED_BRACKETS" : "UNBALANCED_PARENS",
        message: `Unclosed ${name} opened at column ${open.pos + 1}. Missing closing counterpart.`,
        position: open.pos,
        snippet: cleanStr.slice(open.pos, Math.min(cleanStr.length, open.pos + 25)),
      });
    }
  }

  // Delimiter count symmetry verification
  if (stats.squareOpen !== stats.squareClose && !issues.some((e) => e.code === "UNBALANCED_BRACKETS")) {
    stats.balanced = false;
    issues.push({
      type: "error",
      code: "UNBALANCED_BRACKETS",
      message: `Mismatched square bracket count: ${stats.squareOpen} opening '[' vs ${stats.squareClose} closing ']'.`,
    });
  }
  if (stats.curlyOpen !== stats.curlyClose && !issues.some((e) => e.code === "UNBALANCED_BRACES")) {
    stats.balanced = false;
    issues.push({
      type: "error",
      code: "UNBALANCED_BRACES",
      message: `Mismatched curly brace count: ${stats.curlyOpen} opening '{' vs ${stats.curlyClose} closing '}'.`,
    });
  }
  if (stats.parenOpen !== stats.parenClose && !issues.some((e) => e.code === "UNBALANCED_PARENS")) {
    stats.balanced = false;
    issues.push({
      type: "error",
      code: "UNBALANCED_PARENS",
      message: `Mismatched parenthesis count: ${stats.parenOpen} opening '(' vs ${stats.parenClose} closing ')'.`,
    });
  }

  // 2. Specific Comma Inspection (Missing commas, Trailing commas)
  // Check for missing commas between objects: `}\s*{`
  const missingCommaBetweenObjects = cleanStr.match(/\}\s*\{/);
  if (missingCommaBetweenObjects && missingCommaBetweenObjects.index !== undefined) {
    issues.push({
      type: "error",
      code: "MISSING_COMMA",
      message: `Missing comma between consecutive JSON objects '}{' at column ${missingCommaBetweenObjects.index + 1}.`,
      position: missingCommaBetweenObjects.index,
      snippet: cleanStr.slice(
        Math.max(0, missingCommaBetweenObjects.index - 10),
        Math.min(cleanStr.length, missingCommaBetweenObjects.index + 15)
      ),
    });
  }

  // Check for missing comma between array elements: `\]\s*\[`
  const missingCommaBetweenArrays = cleanStr.match(/\]\s*\[/);
  if (missingCommaBetweenArrays && missingCommaBetweenArrays.index !== undefined) {
    issues.push({
      type: "error",
      code: "MISSING_COMMA",
      message: `Missing comma between consecutive array elements at column ${missingCommaBetweenArrays.index + 1}.`,
      position: missingCommaBetweenArrays.index,
      snippet: cleanStr.slice(
        Math.max(0, missingCommaBetweenArrays.index - 10),
        Math.min(cleanStr.length, missingCommaBetweenArrays.index + 15)
      ),
    });
  }

  // Check for missing comma between quoted strings in human-readable arrays: e.g. `"..."\s*"..."` (without comma or colon)
  const missingCommaBetweenStrings = cleanStr.match(/"\s*"(?![\s]*:)/);
  if (missingCommaBetweenStrings && missingCommaBetweenStrings.index !== undefined) {
    issues.push({
      type: "error",
      code: "MISSING_COMMA",
      message: `Missing comma between consecutive string signatures at column ${missingCommaBetweenStrings.index + 1}.`,
      position: missingCommaBetweenStrings.index,
      snippet: cleanStr.slice(
        Math.max(0, missingCommaBetweenStrings.index - 10),
        Math.min(cleanStr.length, missingCommaBetweenStrings.index + 15)
      ),
    });
  }

  // Check for illegal trailing commas before closing bracket/brace: `,\s*\]` or `,\s*\}`
  const trailingCommaMatch = cleanStr.match(/,\s*([\]\}])/);
  if (trailingCommaMatch && trailingCommaMatch.index !== undefined) {
    issues.push({
      type: "error",
      code: "TRAILING_COMMA",
      message: `Illegal trailing comma before closing '${trailingCommaMatch[1]}' at column ${trailingCommaMatch.index + 1}. This causes parser errors in standard EVM tools.`,
      position: trailingCommaMatch.index,
      snippet: cleanStr.slice(
        Math.max(0, trailingCommaMatch.index - 10),
        Math.min(cleanStr.length, trailingCommaMatch.index + 15)
      ),
    });
  }

  // 3. JSON Parser & EVM Schema Inspection
  let detectedFormat: "json" | "human_readable" | "code_wrapper" | "empty" | "unknown" = "unknown";
  let parsedEntries: any[] | undefined = undefined;
  let entryCount = 0;

  if (isWrapper) {
    detectedFormat = "code_wrapper";
  }

  try {
    const parsed = JSON.parse(cleanStr);
    if (!Array.isArray(parsed)) {
      issues.push({
        type: "error",
        code: "INVALID_ROOT_TYPE",
        message: `ABI root must be a top-level Array '[]', but received '${typeof parsed}'.`,
      });
    } else {
      parsedEntries = parsed;
      entryCount = parsed.length;

      if (parsed.length === 0) {
        issues.push({
          type: "warning",
          code: "EMPTY_ABI",
          message: "ABI array is empty '[]'. Contains no functions, events, or errors.",
        });
      } else {
        // Inspect individual elements
        const firstItem = parsed[0];
        if (typeof firstItem === "string") {
          detectedFormat = isWrapper ? "code_wrapper" : "human_readable";
          // Validate human-readable signatures
          const validKeywords = /^(function|event|error|constructor|fallback|receive)\s+/;
          parsed.forEach((sig: any, idx: number) => {
            if (typeof sig !== "string" || !validKeywords.test(sig.trim())) {
              issues.push({
                type: "warning",
                code: "INVALID_ENTRY_SCHEMA",
                message: `Item #${idx + 1} does not appear to be a valid human-readable Solidity signature: "${String(sig).slice(0, 40)}..."`,
              });
            }
          });
        } else if (typeof firstItem === "object" && firstItem !== null) {
          detectedFormat = isWrapper ? "code_wrapper" : "json";
          // Validate standard EVM ABI object schema
          const validTypes = new Set(["function", "constructor", "event", "error", "fallback", "receive"]);
          parsed.forEach((item: any, idx: number) => {
            if (!item || typeof item !== "object") {
              issues.push({
                type: "error",
                code: "INVALID_ENTRY_SCHEMA",
                message: `Item #${idx + 1} is not a valid ABI definition object.`,
              });
              return;
            }
            if (!item.type || !validTypes.has(item.type)) {
              issues.push({
                type: "warning",
                code: "INVALID_ENTRY_SCHEMA",
                message: `Item #${idx + 1} (${item.name || "unnamed"}) has unrecognized or missing 'type': "${item.type}". Expected one of: function, event, error, constructor.`,
              });
            }
            if (item.inputs && !Array.isArray(item.inputs)) {
              issues.push({
                type: "error",
                code: "INVALID_ENTRY_SCHEMA",
                message: `Item #${idx + 1} (${item.name || "unnamed"}) 'inputs' property must be an Array.`,
              });
            }
            if (item.outputs && !Array.isArray(item.outputs)) {
              issues.push({
                type: "error",
                code: "INVALID_ENTRY_SCHEMA",
                message: `Item #${idx + 1} (${item.name || "unnamed"}) 'outputs' property must be an Array.`,
              });
            }
          });
        }
      }
    }
  } catch (jsonErr: any) {
    // If JSON.parse failed and we haven't already reported a specific syntax error
    if (!issues.some((i) => i.type === "error")) {
      issues.push({
        type: "error",
        code: "INVALID_JSON",
        message: `JSON Syntax Error: ${jsonErr.message}`,
      });
    }
  }

  // Calculate score and status
  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;
  const isValid = errorCount === 0;
  const hasWarnings = warningCount > 0;

  let score = 100;
  score -= errorCount * 40;
  score -= warningCount * 10;
  score = Math.max(0, Math.min(100, score));

  let status: "valid" | "warning" | "invalid" = "valid";
  if (!isValid) {
    status = "invalid";
  } else if (hasWarnings) {
    status = "warning";
  }

  let summary = "";
  if (isValid && !hasWarnings) {
    summary = `Syntactically valid EVM ABI (${entryCount} definitions, delimiters balanced).`;
  } else if (isValid && hasWarnings) {
    summary = `Structurally valid with ${warningCount} advisory warning(s).`;
  } else {
    summary = `Syntax validation failed with ${errorCount} structural error(s).`;
  }

  return {
    isValid,
    hasWarnings,
    status,
    score,
    bracketStats: stats,
    issues,
    entryCount,
    detectedFormat,
    summary,
  };
}
