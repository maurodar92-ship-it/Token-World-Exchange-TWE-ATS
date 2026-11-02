/**
 * UNVERIFIED BYTECODE INSPECTOR ENGINE
 * 
 * Static analysis engine for raw EVM bytecode to identify critical vulnerabilities:
 * 1. Potential Reentrancy (External CALL/CALLCODE followed by SSTORE state write)
 * 2. Unprotected or Dangerous SELFDESTRUCT (Opcode 0xFF execution pathways & caller verification)
 * 3. Arbitrary or Untrusted DELEGATECALL (Opcode 0xF4 with calldata-supplied target or missing auth)
 * 
 * Also extracts:
 * - Function Dispatcher Selectors (PUSH4 ... EQ ... JUMPI patterns)
 * - State Storage Footprint (SLOAD, SSTORE, EIP-1153 TLOAD, TSTORE)
 * - Low-level Calls (CALL, STATICCALL, CALLCODE, DELEGATECALL, CREATE, CREATE2)
 */

export interface EvmInstruction {
  pc: number;
  opcode: number;
  mnemonic: string;
  pushData?: string;
  pushDataNumeric?: number;
  gasCost: number;
  category: "flow" | "storage" | "call" | "system" | "push" | "stack" | "crypto" | "arithmetic" | "environment";
  vulnerabilityTag?: "REENTRANCY_CALL" | "REENTRANCY_SSTORE" | "SELFDESTRUCT" | "DELEGATECALL" | "CALLER_CHECK" | "SELECTOR_DISPATCH";
}

export type VulnerabilitySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE" | "INFO";

export interface BytecodeVulnerability {
  id: string;
  category: "reentrancy" | "selfdestruct" | "delegatecall" | "access_control" | "compiler_anomaly";
  severity: VulnerabilitySeverity;
  title: string;
  summary: string;
  affectedPcs: number[];
  disassemblySnippet: EvmInstruction[];
  exploitScenario: string;
  remediation: string;
  cvssEstimate: number; // 0 - 10
}

export interface ExtractedSelector {
  selectorHex: string;
  jumpDestPc: number;
  probableSignature?: string;
  isKnownCollision?: boolean;
  notes?: string;
}

export interface BytecodeAnalysisReport {
  rawBytecodeLength: number;
  instructionCount: number;
  overallRiskScore: number; // 0 - 100
  overallRiskGrade: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SECURE";
  vulnerabilities: BytecodeVulnerability[];
  instructions: EvmInstruction[];
  extractedSelectors: ExtractedSelector[];
  storageStats: {
    sloadCount: number;
    sstoreCount: number;
    tloadCount: number;
    tstoreCount: number;
    hasTransientStorage: boolean;
  };
  callStats: {
    callCount: number;
    delegatecallCount: number;
    staticcallCount: number;
    callcodeCount: number;
    selfdestructCount: number;
    createCount: number;
  };
  hasReentrancyGuardPattern: boolean;
  summaryText: string;
}

// EVM Opcode table mapping
const OPCODES: Record<number, { mnemonic: string; gas: number; category: EvmInstruction["category"] }> = {
  0x00: { mnemonic: "STOP", gas: 0, category: "flow" },
  0x01: { mnemonic: "ADD", gas: 3, category: "arithmetic" },
  0x02: { mnemonic: "MUL", gas: 5, category: "arithmetic" },
  0x03: { mnemonic: "SUB", gas: 3, category: "arithmetic" },
  0x04: { mnemonic: "DIV", gas: 5, category: "arithmetic" },
  0x05: { mnemonic: "SDIV", gas: 5, category: "arithmetic" },
  0x06: { mnemonic: "MOD", gas: 5, category: "arithmetic" },
  0x07: { mnemonic: "SMOD", gas: 5, category: "arithmetic" },
  0x08: { mnemonic: "ADDMOD", gas: 8, category: "arithmetic" },
  0x09: { mnemonic: "MULMOD", gas: 8, category: "arithmetic" },
  0x0a: { mnemonic: "EXP", gas: 10, category: "arithmetic" },
  0x0b: { mnemonic: "SIGNEXTEND", gas: 5, category: "arithmetic" },

  0x10: { mnemonic: "LT", gas: 3, category: "arithmetic" },
  0x11: { mnemonic: "GT", gas: 3, category: "arithmetic" },
  0x12: { mnemonic: "SLT", gas: 3, category: "arithmetic" },
  0x13: { mnemonic: "SGT", gas: 3, category: "arithmetic" },
  0x14: { mnemonic: "EQ", gas: 3, category: "arithmetic" },
  0x15: { mnemonic: "ISZERO", gas: 3, category: "arithmetic" },
  0x16: { mnemonic: "AND", gas: 3, category: "arithmetic" },
  0x17: { mnemonic: "OR", gas: 3, category: "arithmetic" },
  0x18: { mnemonic: "XOR", gas: 3, category: "arithmetic" },
  0x19: { mnemonic: "NOT", gas: 3, category: "arithmetic" },
  0x1a: { mnemonic: "BYTE", gas: 3, category: "arithmetic" },
  0x1b: { mnemonic: "SHL", gas: 3, category: "arithmetic" },
  0x1c: { mnemonic: "SHR", gas: 3, category: "arithmetic" },
  0x1d: { mnemonic: "SAR", gas: 3, category: "arithmetic" },

  0x20: { mnemonic: "KECCAK256", gas: 30, category: "crypto" },

  0x30: { mnemonic: "ADDRESS", gas: 2, category: "environment" },
  0x31: { mnemonic: "BALANCE", gas: 100, category: "environment" },
  0x32: { mnemonic: "ORIGIN", gas: 2, category: "environment" },
  0x33: { mnemonic: "CALLER", gas: 2, category: "environment" },
  0x34: { mnemonic: "CALLVALUE", gas: 2, category: "environment" },
  0x35: { mnemonic: "CALLDATALOAD", gas: 3, category: "environment" },
  0x36: { mnemonic: "CALLDATASIZE", gas: 2, category: "environment" },
  0x37: { mnemonic: "CALLDATACOPY", gas: 3, category: "environment" },
  0x38: { mnemonic: "CODESIZE", gas: 2, category: "environment" },
  0x39: { mnemonic: "CODECOPY", gas: 3, category: "environment" },
  0x3a: { mnemonic: "GASPRICE", gas: 2, category: "environment" },
  0x3b: { mnemonic: "EXTCODESIZE", gas: 100, category: "environment" },
  0x3c: { mnemonic: "EXTCODECOPY", gas: 100, category: "environment" },
  0x3d: { mnemonic: "RETURNDATASIZE", gas: 2, category: "environment" },
  0x3e: { mnemonic: "RETURNDATACOPY", gas: 3, category: "environment" },
  0x3f: { mnemonic: "EXTCODEHASH", gas: 100, category: "environment" },

  0x40: { mnemonic: "BLOCKHASH", gas: 20, category: "environment" },
  0x41: { mnemonic: "COINBASE", gas: 2, category: "environment" },
  0x42: { mnemonic: "TIMESTAMP", gas: 2, category: "environment" },
  0x43: { mnemonic: "NUMBER", gas: 2, category: "environment" },
  0x44: { mnemonic: "PREVRANDAO", gas: 2, category: "environment" },
  0x45: { mnemonic: "GASLIMIT", gas: 2, category: "environment" },
  0x46: { mnemonic: "CHAINID", gas: 2, category: "environment" },
  0x47: { mnemonic: "SELFBALANCE", gas: 5, category: "environment" },
  0x48: { mnemonic: "BASEFEE", gas: 2, category: "environment" },
  0x49: { mnemonic: "BLOBHASH", gas: 3, category: "environment" },
  0x4a: { mnemonic: "BLOBBASEFEE", gas: 2, category: "environment" },

  0x50: { mnemonic: "POP", gas: 2, category: "stack" },
  0x51: { mnemonic: "MLOAD", gas: 3, category: "storage" },
  0x52: { mnemonic: "MSTORE", gas: 3, category: "storage" },
  0x53: { mnemonic: "MSTORE8", gas: 3, category: "storage" },
  0x54: { mnemonic: "SLOAD", gas: 100, category: "storage" },
  0x55: { mnemonic: "SSTORE", gas: 100, category: "storage" },
  0x56: { mnemonic: "JUMP", gas: 8, category: "flow" },
  0x57: { mnemonic: "JUMPI", gas: 10, category: "flow" },
  0x58: { mnemonic: "PC", gas: 2, category: "flow" },
  0x59: { mnemonic: "MSIZE", gas: 2, category: "storage" },
  0x5a: { mnemonic: "GAS", gas: 2, category: "system" },
  0x5b: { mnemonic: "JUMPDEST", gas: 1, category: "flow" },
  0x5c: { mnemonic: "TLOAD", gas: 100, category: "storage" }, // EIP-1153 Transient storage
  0x5d: { mnemonic: "TSTORE", gas: 100, category: "storage" }, // EIP-1153 Transient storage
  0x5e: { mnemonic: "MCOPY", gas: 3, category: "storage" }, // EIP-5656 Memory copy
  0x5f: { mnemonic: "PUSH0", gas: 2, category: "push" }, // EIP-3855 Shanghai

  0xf0: { mnemonic: "CREATE", gas: 32000, category: "system" },
  0xf1: { mnemonic: "CALL", gas: 100, category: "call" },
  0xf2: { mnemonic: "CALLCODE", gas: 100, category: "call" },
  0xf3: { mnemonic: "RETURN", gas: 0, category: "flow" },
  0xf4: { mnemonic: "DELEGATECALL", gas: 100, category: "call" },
  0xf5: { mnemonic: "CREATE2", gas: 32000, category: "system" },
  0xfa: { mnemonic: "STATICCALL", gas: 100, category: "call" },
  0xfd: { mnemonic: "REVERT", gas: 0, category: "flow" },
  0xfe: { mnemonic: "INVALID", gas: 0, category: "flow" },
  0xff: { mnemonic: "SELFDESTRUCT", gas: 5000, category: "system" },
};

// Add PUSH1..PUSH32
for (let i = 1; i <= 32; i++) {
  OPCODES[0x5f + i] = { mnemonic: `PUSH${i}`, gas: 3, category: "push" };
}

// Add DUP1..DUP16
for (let i = 1; i <= 16; i++) {
  OPCODES[0x7f + i] = { mnemonic: `DUP${i}`, gas: 3, category: "stack" };
}

// Add SWAP1..SWAP16
for (let i = 1; i <= 16; i++) {
  OPCODES[0x8f + i] = { mnemonic: `SWAP${i}`, gas: 3, category: "stack" };
}

// Add LOG0..LOG4
for (let i = 0; i <= 4; i++) {
  OPCODES[0xa0 + i] = { mnemonic: `LOG${i}`, gas: 375, category: "system" };
}

// Common function signatures for matching selectors
const COMMON_SELECTORS: Record<string, string> = {
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b87266": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0x70a08231": "balanceOf(address)",
  "0x18160ddd": "totalSupply()",
  "0xdd62ed3e": "allowance(address,address)",
  "0xd0e30db0": "deposit()",
  "0x2e1a7d4d": "withdraw(uint256)",
  "0x3ccfd60b": "withdraw()",
  "0x8da5cb5b": "owner()",
  "0xf2fde38b": "transferOwnership(address)",
  "0x715018a6": "renounceOwnership()",
  "0x3659cfe6": "upgradeTo(address)",
  "0x4f1ef286": "upgradeToAndCall(address,bytes)",
  "0x41c0e1b5": "kill()",
  "0x00f714ce": "destroy()",
  "0xb3388710": "burnAll()",
  "0x42966c68": "burn(uint256)",
  "0x40c10f19": "mint(address,uint256)",
  "0x6a627842": "mint(uint256)",
  "0x313ce567": "decimals()",
  "0x06fdde03": "name()",
  "0x95d89b41": "symbol()",
};

/**
 * Clean hex bytecode string
 */
export function cleanHexBytecode(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("0x") || cleaned.startsWith("0X")) {
    cleaned = cleaned.slice(2);
  }
  // Strip whitespace, newlines, quotes
  cleaned = cleaned.replace(/[\s\r\n"']/g, "");
  // Ensure even length
  if (cleaned.length % 2 !== 0) {
    cleaned = cleaned + "0";
  }
  return cleaned.toLowerCase();
}

/**
 * Disassemble raw EVM bytecode into instructions
 */
export function disassembleBytecode(hex: string): EvmInstruction[] {
  const instructions: EvmInstruction[] = [];
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }

  let pc = 0;
  while (pc < bytes.length) {
    const opcode = bytes[pc];
    const opInfo = OPCODES[opcode] || { mnemonic: `UNKNOWN_0x${opcode.toString(16).padStart(2, "0").toUpperCase()}`, gas: 0, category: "system" };

    const instr: EvmInstruction = {
      pc,
      opcode,
      mnemonic: opInfo.mnemonic,
      gasCost: opInfo.gas,
      category: opInfo.category,
    };

    // If PUSH opcode, extract payload bytes
    if (opcode >= 0x60 && opcode <= 0x7f) {
      const pushLength = opcode - 0x5f;
      let pushDataHex = "";
      for (let j = 1; j <= pushLength && pc + j < bytes.length; j++) {
        pushDataHex += bytes[pc + j].toString(16).padStart(2, "0");
      }
      instr.pushData = "0x" + pushDataHex;
      if (pushLength <= 6) {
        instr.pushDataNumeric = parseInt(pushDataHex, 16);
      }
      pc += pushLength;
    }

    instructions.push(instr);
    pc++;
  }

  return instructions;
}

/**
 * Run comprehensive static analysis on disassembled bytecode
 */
export function analyzeUnverifiedBytecode(rawHex: string): BytecodeAnalysisReport {
  const hex = cleanHexBytecode(rawHex);
  const instructions = disassembleBytecode(hex);
  const vulnerabilities: BytecodeVulnerability[] = [];

  // 1. Gather opcodes and location indices
  const callIndices: number[] = [];
  const sstoreIndices: number[] = [];
  const sloadIndices: number[] = [];
  const tloadIndices: number[] = [];
  const tstoreIndices: number[] = [];
  const selfdestructIndices: number[] = [];
  const delegatecallIndices: number[] = [];
  const staticcallIndices: number[] = [];
  const callcodeIndices: number[] = [];
  const createIndices: number[] = [];

  instructions.forEach((instr, idx) => {
    switch (instr.opcode) {
      case 0xf1: // CALL
        callIndices.push(idx);
        break;
      case 0xf2: // CALLCODE
        callcodeIndices.push(idx);
        callIndices.push(idx);
        break;
      case 0xf4: // DELEGATECALL
        delegatecallIndices.push(idx);
        break;
      case 0xfa: // STATICCALL
        staticcallIndices.push(idx);
        break;
      case 0xff: // SELFDESTRUCT
        selfdestructIndices.push(idx);
        break;
      case 0x54: // SLOAD
        sloadIndices.push(idx);
        break;
      case 0x55: // SSTORE
        sstoreIndices.push(idx);
        break;
      case 0x5c: // TLOAD (EIP-1153)
        tloadIndices.push(idx);
        break;
      case 0x5d: // TSTORE (EIP-1153)
        tstoreIndices.push(idx);
        break;
      case 0xf0: // CREATE
      case 0xf5: // CREATE2
        createIndices.push(idx);
        break;
    }
  });

  // Check for reentrancy guard pattern (presence of TLOAD/TSTORE or SLOAD/SSTORE early branch)
  const hasTransientReentrancyGuard = tloadIndices.length > 0 && tstoreIndices.length > 0;
  const hasReentrancyGuardPattern = hasTransientReentrancyGuard || detectStorageReentrancyGuardPattern(instructions);

  // =========================================================================
  // CHECK 1: REENTRANCY ANALYSIS (CALL followed by SSTORE)
  // =========================================================================
  if (callIndices.length > 0 && sstoreIndices.length > 0) {
    // Look for any CALL index that occurs before an SSTORE index without protection
    for (const callIdx of callIndices) {
      const callInstr = instructions[callIdx];
      // Search forward in the next 40 instructions for an SSTORE
      const windowEnd = Math.min(instructions.length, callIdx + 45);
      const subsequentSstoreIdx = instructions.slice(callIdx + 1, windowEnd).findIndex(i => i.opcode === 0x55);

      if (subsequentSstoreIdx !== -1) {
        const actualSstoreIdx = callIdx + 1 + subsequentSstoreIdx;
        const sstoreInstr = instructions[actualSstoreIdx];

        // Tag instructions
        callInstr.vulnerabilityTag = "REENTRANCY_CALL";
        sstoreInstr.vulnerabilityTag = "REENTRANCY_SSTORE";

        // Grab snippet
        const snippetStart = Math.max(0, callIdx - 3);
        const snippetEnd = Math.min(instructions.length, actualSstoreIdx + 4);
        const snippet = instructions.slice(snippetStart, snippetEnd);

        vulnerabilities.push({
          id: `vuln-reentrancy-pc-${callInstr.pc}`,
          category: "reentrancy",
          severity: hasReentrancyGuardPattern ? "MEDIUM" : "CRITICAL",
          title: hasReentrancyGuardPattern
            ? "Potential Reentrancy Pattern (Protected by Guard Heuristics)"
            : "Critical State-Update After External Call (Classic Reentrancy / CEI Violation)",
          summary: `External execution (CALL at PC 0x${callInstr.pc.toString(16)}) is executed before state modification (SSTORE at PC 0x${sstoreInstr.pc.toString(16)}). An untrusted recipient contract can re-enter before storage is updated.`,
          affectedPcs: [callInstr.pc, sstoreInstr.pc],
          disassemblySnippet: snippet,
          exploitScenario: `1. Attacker calls victim contract method triggering external CALL at PC 0x${callInstr.pc.toString(16)}.\n2. In attacker's receive()/fallback(), attacker re-invokes the same method before SSTORE executes.\n3. The contract evaluates balance based on outdated storage state, draining available funds until gas exhaustion or contract insolvency.`,
          remediation: `Enforce the Checks-Effects-Interactions (CEI) design pattern: complete all storage writes (SSTORE) BEFORE dispatching low-level external calls (CALL). Alternatively, integrate an OpenZeppelin ReentrancyGuard or EIP-1153 transient mutex lock (TSTORE 0x01 / TLOAD check).`,
          cvssEstimate: hasReentrancyGuardPattern ? 5.3 : 9.1,
        });
        break; // Report primary instance to avoid overwhelming duplicates
      }
    }
  }

  // =========================================================================
  // CHECK 2: SELFDESTRUCT VULNERABILITY ANALYSIS (Opcode 0xFF)
  // =========================================================================
  if (selfdestructIndices.length > 0) {
    for (const sdIdx of selfdestructIndices) {
      const sdInstr = instructions[sdIdx];
      sdInstr.vulnerabilityTag = "SELFDESTRUCT";

      // Trace backward looking for CALLER (0x33) check or access-control guard
      const lookbackStart = Math.max(0, sdIdx - 35);
      const precedingWindow = instructions.slice(lookbackStart, sdIdx);
      const hasCallerCheck = precedingWindow.some(i => i.opcode === 0x33 || i.opcode === 0x32);
      const hasEqCheck = precedingWindow.some(i => i.opcode === 0x14); // EQ
      const hasJumpiCheck = precedingWindow.some(i => i.opcode === 0x57); // JUMPI

      const isProtected = hasCallerCheck && (hasEqCheck || hasJumpiCheck);

      const snippetStart = Math.max(0, sdIdx - 8);
      const snippetEnd = Math.min(instructions.length, sdIdx + 3);
      const snippet = instructions.slice(snippetStart, snippetEnd);

      vulnerabilities.push({
        id: `vuln-selfdestruct-pc-${sdInstr.pc}`,
        category: "selfdestruct",
        severity: isProtected ? "HIGH" : "CRITICAL",
        title: isProtected
          ? "Authenticated SELFDESTRUCT Instruction Detected (EIP-6780 Deprecation & Centralization Risk)"
          : "Unprotected SELFDESTRUCT Opcode (Arbitrary Contract Destruction / Suicide Vector)",
        summary: isProtected
          ? `SELFDESTRUCT instruction at PC 0x${sdInstr.pc.toString(16)} is preceded by caller validation, but introduces centralization rug-pull vector and violates post-Cancun EIP-6780 expectations.`
          : `SELFDESTRUCT instruction at PC 0x${sdInstr.pc.toString(16)} appears callable without robust CALLER (0x33) authentication, allowing arbitrary third parties to destroy the contract (Parity multi-sig style freeze).`,
        affectedPcs: [sdInstr.pc],
        disassemblySnippet: snippet,
        exploitScenario: isProtected
          ? `A compromised owner private key or malicious governance proposal can trigger SELFDESTRUCT, sweeping entire contract ether balance to an external address and incapacitating user integrations.`
          : `An unauthenticated attacker dispatches a transaction routed to this instruction. The EVM executes SELFDESTRUCT 0xFF, zeroing out contract code in the same transaction or locking all dependent proxy clients forever.`,
        remediation: `Remove SELFDESTRUCT entirely. In modern EVM versions (Cancun EIP-6780), SELFDESTRUCT is deprecated and does not delete storage unless created in the same transaction. For balance sweeping, use a standard restricted transfer.`,
        cvssEstimate: isProtected ? 7.2 : 9.8,
      });
    }
  }

  // =========================================================================
  // CHECK 3: DELEGATECALL VULNERABILITY ANALYSIS (Opcode 0xF4)
  // =========================================================================
  if (delegatecallIndices.length > 0) {
    for (const delIdx of delegatecallIndices) {
      const delInstr = instructions[delIdx];
      delInstr.vulnerabilityTag = "DELEGATECALL";

      // Inspect instructions preceding DELEGATECALL (target address setup on stack)
      const lookbackStart = Math.max(0, delIdx - 20);
      const precedingWindow = instructions.slice(lookbackStart, delIdx);

      // Check if target address is derived from CALLDATALOAD (0x35) -> untrusted user input!
      const hasCalldataLoad = precedingWindow.some(i => i.opcode === 0x35);
      const hasStorageLoad = precedingWindow.some(i => i.opcode === 0x54); // SLOAD
      const hasCallerCheck = precedingWindow.some(i => i.opcode === 0x33);

      const isArbitraryTarget = hasCalldataLoad && !hasCallerCheck;

      const snippetStart = Math.max(0, delIdx - 8);
      const snippetEnd = Math.min(instructions.length, delIdx + 3);
      const snippet = instructions.slice(snippetStart, snippetEnd);

      if (isArbitraryTarget) {
        vulnerabilities.push({
          id: `vuln-delegatecall-arbitrary-pc-${delInstr.pc}`,
          category: "delegatecall",
          severity: "CRITICAL",
          title: "Arbitrary DELEGATECALL Injection (Calldata-Controlled Target Address)",
          summary: `DELEGATECALL at PC 0x${delInstr.pc.toString(16)} loads execution target from calldata (CALLDATALOAD 0x35) without strict caller authorization. Attacker can invoke arbitrary malicious contracts within the storage context of this contract.`,
          affectedPcs: [delInstr.pc],
          disassemblySnippet: snippet,
          exploitScenario: `1. Attacker deploys malicious exploit contract with a method that executes SSTORE(slot 0, attacker_address).\n2. Attacker calls victim contract, passing exploit contract address as target.\n3. Victim executes DELEGATECALL to exploit, overwriting victim's owner slot, granting full administrative ownership to the attacker.`,
          remediation: `Never delegatecall to user-provided addresses. Delegatecall targets must either be hardcoded constants or loaded strictly from verified implementation slots (such as ERC-1967: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc).`,
          cvssEstimate: 9.8,
        });
      } else {
        vulnerabilities.push({
          id: `vuln-delegatecall-proxy-pc-${delInstr.pc}`,
          category: "delegatecall",
          severity: hasStorageLoad ? "MEDIUM" : "HIGH",
          title: hasStorageLoad
            ? "Proxy DELEGATECALL Pattern Detected (Verify Storage Namespace Isolation)"
            : "DELEGATECALL Instruction with Dynamic Target Stack Formulation",
          summary: `DELEGATECALL at PC 0x${delInstr.pc.toString(16)} executes external code in the current storage context. Ensure proxy implementation layout prevents storage collisions (ERC-1967 / ERC-7201 compliance).`,
          affectedPcs: [delInstr.pc],
          disassemblySnippet: snippet,
          exploitScenario: `If implementation contracts inherit conflicting state variable layouts, upgraded logic can inadvertently overwrite critical state slots (proxy storage collision vulnerability).`,
          remediation: `Enforce ERC-1967 standard implementation slots or ERC-7201 formula-based namespaced storage layout (keccak256(namespace) - 1).`,
          cvssEstimate: hasStorageLoad ? 4.8 : 6.9,
        });
      }
    }
  }

  // =========================================================================
  // CHECK 4: TX.ORIGIN AUTHENTICATION CHECK (Opcode 0x32)
  // =========================================================================
  instructions.forEach((instr, idx) => {
    if (instr.opcode === 0x32) { // ORIGIN
      const forwardWindow = instructions.slice(idx, Math.min(instructions.length, idx + 6));
      const hasEq = forwardWindow.some(i => i.opcode === 0x14); // EQ
      if (hasEq) {
        const snippetStart = Math.max(0, idx - 2);
        const snippetEnd = Math.min(instructions.length, idx + 8);
        vulnerabilities.push({
          id: `vuln-tx-origin-pc-${instr.pc}`,
          category: "access_control",
          severity: "MEDIUM",
          title: "tx.origin (ORIGIN 0x32) Authorization Check Vulnerability",
          summary: `Bytecode performs equality comparison on tx.origin (PC 0x${instr.pc.toString(16)}) rather than msg.sender (CALLER 0x33). This makes the contract susceptible to phishing attacks through malicious intermediate contracts.`,
          affectedPcs: [instr.pc],
          disassemblySnippet: instructions.slice(snippetStart, snippetEnd),
          exploitScenario: `An attacker tricks an authorized admin into sending a transaction to a trap contract. The trap contract calls this contract, where tx.origin equals the admin, bypassing access control.`,
          remediation: `Replace tx.origin checks with msg.sender (CALLER 0x33).`,
          cvssEstimate: 6.2,
        });
      }
    }
  });

  // Extract function dispatcher selectors
  const extractedSelectors = extractFunctionSelectors(instructions);

  // Storage Stats
  const storageStats = {
    sloadCount: sloadIndices.length,
    sstoreCount: sstoreIndices.length,
    tloadCount: tloadIndices.length,
    tstoreCount: tstoreIndices.length,
    hasTransientStorage: tloadIndices.length > 0 || tstoreIndices.length > 0,
  };

  // Call Stats
  const callStats = {
    callCount: callIndices.length,
    delegatecallCount: delegatecallIndices.length,
    staticcallCount: staticcallIndices.length,
    callcodeCount: callcodeIndices.length,
    selfdestructCount: selfdestructIndices.length,
    createCount: createIndices.length,
  };

  // Compute Overall Risk Score & Grade
  let score = 0;
  for (const v of vulnerabilities) {
    switch (v.severity) {
      case "CRITICAL":
        score += 35;
        break;
      case "HIGH":
        score += 20;
        break;
      case "MEDIUM":
        score += 10;
        break;
      case "LOW":
        score += 5;
        break;
    }
  }
  const overallRiskScore = Math.min(100, score);
  let overallRiskGrade: BytecodeAnalysisReport["overallRiskGrade"] = "SECURE";
  if (overallRiskScore >= 70) overallRiskGrade = "CRITICAL";
  else if (overallRiskScore >= 45) overallRiskGrade = "HIGH";
  else if (overallRiskScore >= 20) overallRiskGrade = "MEDIUM";
  else if (overallRiskScore > 0) overallRiskGrade = "LOW";

  // Build Summary Text
  const summaryText = buildSummaryText(overallRiskGrade, vulnerabilities, instructions.length, storageStats, callStats);

  return {
    rawBytecodeLength: hex.length / 2,
    instructionCount: instructions.length,
    overallRiskScore,
    overallRiskGrade,
    vulnerabilities,
    instructions,
    extractedSelectors,
    storageStats,
    callStats,
    hasReentrancyGuardPattern,
    summaryText,
  };
}

/**
 * Heuristic to detect storage-based reentrancy guard
 */
function detectStorageReentrancyGuardPattern(instructions: EvmInstruction[]): boolean {
  for (let i = 0; i < instructions.length - 8; i++) {
    // Look for SLOAD followed by PUSH / EQ / JUMPI and subsequent SSTORE
    if (instructions[i].opcode === 0x54) { // SLOAD
      const window = instructions.slice(i + 1, i + 8);
      const hasEq = window.some(w => w.opcode === 0x14 || w.opcode === 0x15);
      const hasJumpi = window.some(w => w.opcode === 0x57);
      const hasSstore = window.some(w => w.opcode === 0x55);
      if (hasEq && hasJumpi && hasSstore) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract 4-byte selectors from EVM dispatcher
 * Pattern: PUSH4 0xXXXXXXXX -> DUP1 / EQ -> JUMPI
 */
function extractFunctionSelectors(instructions: EvmInstruction[]): ExtractedSelector[] {
  const selectors: ExtractedSelector[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < instructions.length - 3; i++) {
    const instr = instructions[i];
    // Check for PUSH4 (0x63)
    if (instr.opcode === 0x63 && instr.pushData) {
      const forwardWindow = instructions.slice(i + 1, i + 5);
      const hasEq = forwardWindow.some(w => w.opcode === 0x14); // EQ
      const jumpiInstr = forwardWindow.find(w => w.opcode === 0x57); // JUMPI

      if (hasEq) {
        const selectorHex = instr.pushData.toLowerCase();
        if (!seen.has(selectorHex)) {
          seen.add(selectorHex);
          instr.vulnerabilityTag = "SELECTOR_DISPATCH";

          // Find target jumpdest if preceded by PUSH2 or PUSH1
          let jumpDest = 0;
          if (jumpiInstr) {
            const pushTarget = instructions[i - 1] || instructions[i + 1];
            if (pushTarget && pushTarget.pushDataNumeric !== undefined) {
              jumpDest = pushTarget.pushDataNumeric;
            }
          }

          const probableSig = COMMON_SELECTORS[selectorHex];
          selectors.push({
            selectorHex,
            jumpDestPc: jumpDest,
            probableSignature: probableSig,
            notes: probableSig ? `Standard EVM match: ${probableSig}` : "Custom or unmapped method selector",
          });
        }
      }
    }
  }

  return selectors;
}

function buildSummaryText(
  grade: BytecodeAnalysisReport["overallRiskGrade"],
  vulnerabilities: BytecodeVulnerability[],
  instrCount: number,
  storage: BytecodeAnalysisReport["storageStats"],
  calls: BytecodeAnalysisReport["callStats"]
): string {
  if (vulnerabilities.length === 0) {
    return `Static analysis of ${instrCount} EVM instructions completed with ZERO critical flags. No unprotected selfdestruct, arbitrary delegatecall, or classic reentrancy patterns were identified. Contract maintains isolated execution boundaries.`;
  }

  const critCount = vulnerabilities.filter(v => v.severity === "CRITICAL").length;
  const highCount = vulnerabilities.filter(v => v.severity === "HIGH").length;

  return `Static analysis flagged ${vulnerabilities.length} security items across ${instrCount} instructions (${critCount} CRITICAL, ${highCount} HIGH). Storage footprint: ${storage.sloadCount} SLOAD, ${storage.sstoreCount} SSTORE (${storage.hasTransientStorage ? "EIP-1153 Transient active" : "No transient storage"}). Interaction footprint: ${calls.callCount} CALL, ${calls.delegatecallCount} DELEGATECALL, ${calls.selfdestructCount} SELFDESTRUCT. Detailed remediation traces are documented below.`;
}

// =========================================================================
// SAMPLE VULNERABLE & VERIFIED BYTECODES FOR IMMEDIATE 1-CLICK TESTING
// =========================================================================

export interface SampleBytecodePreset {
  id: string;
  name: string;
  category: "reentrancy" | "selfdestruct" | "delegatecall" | "secure_vault" | "clean_erc20";
  expectedRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "SECURE";
  description: string;
  bytecode: string;
}

export const SAMPLE_BYTECODE_PRESETS: SampleBytecodePreset[] = [
  {
    id: "vuln_reentrancy_dao",
    name: "Classic DAO-Style Reentrancy (CALL -> SSTORE)",
    category: "reentrancy",
    expectedRisk: "CRITICAL",
    description: "Contains an external CALL dispatching ETH/execution to caller before updating balance in SSTORE, violating Checks-Effects-Interactions.",
    // Real minimal bytecode containing dispatcher, CALL (0xF1), followed by SSTORE (0x55)
    bytecode: "608060405234801561001057600080fd5b50600436106100365760003560e01c80632e1a7d4d14610040578063d0e30db014610080575b600080fd5b61007e600480360381019061005b9190610190565b3360009081526020819052604090205481111561007b5733600060006000600085856000f1600050336000908152602081905260409020600090555b50565b00",
  },
  {
    id: "vuln_unprotected_selfdestruct",
    name: "Unprotected Parity-Style SELFDESTRUCT (Suicide)",
    category: "selfdestruct",
    expectedRisk: "CRITICAL",
    description: "Contains an unauthenticated SELFDESTRUCT (0xFF) opcode reachable directly via public method selector kill() without caller verification.",
    // Minimal bytecode with dispatcher routing 0x41c0e1b5 (kill) straight to SELFDESTRUCT (0xFF) without caller check
    bytecode: "608060405234801561001057600080fd5b506004361061002b5760003560e01c806341c0e1b514610030575b600080fd5b600033905080ff",
  },
  {
    id: "vuln_arbitrary_delegatecall",
    name: "Arbitrary Forwarding Proxy (DELEGATECALL Hijack)",
    category: "delegatecall",
    expectedRisk: "CRITICAL",
    description: "Loads the delegatecall target address directly from calldata (CALLDATALOAD 0x35) with no whitelist or caller restriction.",
    // Bytecode that loads address from calldata offset and executes DELEGATECALL (0xF4)
    bytecode: "60806040526004361061001a57600035600060006000600084366000f46000505b00",
  },
  {
    id: "secure_transient_reentrancy_vault",
    name: "Secure Vault (EIP-1153 Transient Reentrancy Guard)",
    category: "secure_vault",
    expectedRisk: "SECURE",
    description: "Uses Cancun EIP-1153 TLOAD (0x5C) and TSTORE (0x5D) transient storage mutex locks and adheres strictly to Checks-Effects-Interactions.",
    // Bytecode utilizing 0x5C (TLOAD), 0x5D (TSTORE) transient lock before CALL and zeroing after
    bytecode: "6080604052600436106100305760003560e01c80632e1a7d4d14610035575b600080fd5b60005c1561004557600080fd5b600160005d3360009081526020819052604090206000905533600060006000600085856000f150600060005d56",
  },
  {
    id: "clean_erc20_token",
    name: "Clean ERC-20 Standard Token (Protected)",
    category: "clean_erc20",
    expectedRisk: "SECURE",
    description: "Standard ERC-20 implementation with transfer and balanceOf logic, proper arithmetic guards, and zero dangerous opcodes.",
    // Standard ERC-20 runtime bytecode snippet
    bytecode: "608060405234801561001057600080fd5b506004361061004c5760003560e01c806370a0823114610051578063a9059cbb1461008057806318160ddd146100b0575b600080fd5b61006e60048036038101906100699190565b60009081526020819052604090205490565b60405190815260200160405180910390f35b6100a060005490565b60405190815260200160405180910390f3",
  },
];
