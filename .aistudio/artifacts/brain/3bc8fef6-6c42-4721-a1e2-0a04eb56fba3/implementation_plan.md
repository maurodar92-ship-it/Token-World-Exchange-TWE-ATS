# 3-Tier Web3 Architecture & Gemini Intelligence Bridge Plan

This implementation plan formalizes the architectural separation between the **AI Development/Intelligence Layer (Google AI Studio & Gemini API)** and the **Web3 Execution Runtime**. Language models act strictly as intent parsing and parameter extraction engines, never as custodians or raw cryptographic signers. Key custody, ABI encoding, and deterministic transaction signing are offloaded to dedicated non-custodial wallets, embedded MPC passkeys, and autonomous agent TEE enclaves governed by ERC-4337 session keys.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions reflect your confirmed selections:

- **Confirmed Decision 1 — Multi-Mode Signing & Custody**: The system supports three distinct signing tiers:
  1. **Non-Custodial User Wallets** (MetaMask, Coinbase Wallet, Rabby, Uniswap via EIP-6963) for manual user approval.
  2. **Embedded MPC Passkeys** (WebAuthn PRF / sharded key custody) for seamless Web2-style onboarding.
  3. **Autonomous AI Agent TEE Enclave** (Turnkey / AWS Nitro Enclave model) with policy-based programmatic signing.
- **Confirmed Decision 2 — Interactive Gemini Prompt Parser & Serialization**: An interactive prompt testing console where users can submit natural language trading commands (e.g., *"Swap 0.5 ETH for USDC on Base"*). Gemini parses this into strict function calling schemas (`prepareSwap`, `prepareTransfer`), and frontend Web3 libraries (`ethers.js` / `viem`) compile the unsigned EIP-1559 payload with real gas estimation.
- **Confirmed Decision 3 — Security Guardrails & Session Key Policies**: Strict policy enforcement for autonomous execution:
  - **ERC-4337 Session Keys**: Time-bounded permission validity (e.g., 2 hours).
  - **Spending Caps**: Maximum value per transaction ($25) and rolling 24-hour spending limit ($50/day default).
  - **Contract & Recipient Allow-Lists**: Only pre-approved contracts (Uniswap V3 Router `0xE592...1564`, Universal Router `0x3fC9...7FAD`, and verified Protocol Treasury `0x70Ac...94f0` / `0x5FbD...0aa3`) can receive transactions. Transactions outside the allow-list are rejected before reaching the signer.

---

## 1. Overview & Core Concept

- **Core Problem**: Language models are probabilistic reasoning engines over tokens; they lack isolated tamper-proof enclaves, cannot deterministically compute elliptic curve signatures ($r, s, v$ on secp256k1 or Ed25519), and cannot safely hold private keys.
- **The Solution**: A clean 3-tier separation of concerns:
  ```
  User Prompt ("Swap 0.5 ETH for USDC")
      │
      ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Tier 1: Intelligence Layer (Google AI Studio / Gemini API)  │
  │ • Natural language intent parsing                           │
  │ • Validates parameters against strict JSON Function Schemas │
  │ • Outputs Structured JSON (prepareSwap, prepareTransfer)    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Structured Tool Call Arguments
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Tier 2: Client Orchestration Layer (ethers.js / viem)       │
  │ • Queries live RPC for nonces and EIP-1559 gas fees         │
  │ • Encodes Uniswap V3 / ERC-20 ABI calldata                  │
  │ • Constructs unsigned EIP-1559 Transaction Payload          │
  │ • Evaluates ERC-4337 Policy & Spending Cap Guardrails       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Unsigned Transaction Payload
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Tier 3: Key Custody & Signing Layer                         │
  │ ├─ Mode A (Non-Custodial): MetaMask / Rabby / EIP-6963      │
  │ ├─ Mode B (Embedded MPC): WebAuthn Biometric Passkey        │
  │ └─ Mode C (Agent TEE): Hardware Security Enclave + Policy   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Signed Raw Bytecode (0x02f8...)
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Tier 4: Node RPC Layer (Ethereum / Base / Arbitrum RPC)     │
  │ • Broadcasts raw transaction via eth_sendRawTransaction     │
  │ • Queries eth_getTransactionReceipt for on-chain finality   │
  └─────────────────────────────────────────────────────────────┘
  ```

---

## 2. User Experience & Visual Design

- **Visual Theme**: Obsidian and dark slate palette (`#0A0B10` background, `#121422` structural panels, `#1E2338` 1px borders) following zero-pill discipline and high-contrast typography (`font-mono tabular-nums`).
- **Interactive Console Workflow**:
  1. **Prompt & Intelligence Sandbox (Tier 1)**:
     - Natural language input bar with curated prompt presets (*"Swap 0.5 ETH for USDC on Base"*, *"Transfer 100 USDC to Protocol Treasury"*, *"Mint Concentrated Liquidity Position"*).
     - Live Gemini Function Calling visualizer showing extracted JSON arguments, confidence score, and parameter validation tags.
  2. **Unsigned Payload & Policy Gate (Tier 2)**:
     - Real-time serialization inspector showing destination address, EIP-1559 max fee / priority fee in Gwei, nonce, and ABI calldata hex.
     - **Policy Guardrail Matrix**: Visual checks for (a) Contract Allow-list match, (b) 24h spending cap remaining ($50 max), and (c) Session key expiration countdown.
  3. **Signing Mode Switcher & Execution (Tier 3)**:
     - Switcher between **Mode A (MetaMask User Approval)**, **Mode B (Embedded Passkey MPC)**, and **Mode C (Autonomous Agent TEE)**.
     - Interactive signing simulation displaying mathematical curve decomposition ($r, s, v$, recovery ID) and raw signed hex string.
  4. **Blockchain Node RPC & Receipt Monitor (Tier 4)**:
     - Live node status with block number, gas tracker, and raw mempool broadcast receipt with Etherscan/Basescan explorer links.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Gemini SDK Function Calling with Deterministic Local Validation**:
  - *Chosen Approach*: Use `@google/genai` (model `gemini-3.8-flash`) with strict `functionDeclarations` for `prepareSwap` and `prepareTransfer`, backed by local Zod-style runtime verification before any calldata is constructed.
  - *Why*: Prevents hallucinated contract addresses or malformed amounts from ever touching transaction serializers.
- **Decision 2: Comprehensive Multi-Mode Signing Simulation**:
  - *Chosen Approach*: Implement real browser wallet hooks (`window.ethereum` / `eth_sendTransaction`), WebAuthn biometric PRF simulation for embedded MPC, and deterministic Web Crypto secp256k1 enclave signing for the autonomous agent mode.
  - *Why*: Allows the user to test and experience all three production Web3 patterns within a single unified workspace.
- **Decision 3: Hard Policy Enforcement Engine (Pre-Signing Block)**:
  - *Chosen Approach*: Block transactions at the orchestration level if they exceed spending limits or target unauthorized contracts, before the request ever reaches the signing layer.
  - *Why*: Enforces defense-in-depth so an autonomous agent cannot be prompted into draining treasury funds.

---

## 4. Technical Architecture & File Organization

- **Files to Create / Update**:
  1. `src/utils/geminiWeb3BridgeOrchestrator.ts`:
     - Gemini function declaration schemas: `prepareTransfer`, `prepareSwap`, `prepareLiquidityPool`.
     - Intent parsing and parameter validation engine.
     - ERC-4337 session key and spending cap policy engine.
     - Transaction serialization and ABI calldata encoding via `ethers.js`.
     - Multi-mode signing abstractions (MetaMask, Embedded Passkey, Agent TEE).
  2. `src/components/GeminiWeb3ArchitectureBridge.tsx`:
     - Interactive 4-stage dashboard (Intelligence → Orchestration → Signing → RPC).
     - Live Gemini prompt tester with function calling schema outputs.
     - Policy engine controls (configurable 24h limit, session duration, allow-list manager).
     - Real-time signing console with mathematical curve telemetry.
  3. Integration into Enterprise Navigation:
     - Add dedicated tab or embed into `CryptographicKeyEnclaveSigningBridge.tsx`, `Web3FullStackArchitectureCockpit.tsx`, and `Navbar.tsx`.

---

## 5. Step-by-Step Implementation Plan

1. **Step 1: Build the Orchestration & Policy Engine (`geminiWeb3BridgeOrchestrator.ts`)**:
   - Define exact Gemini function declarations and parameter schemas.
   - Implement the ERC-4337 policy engine with session keys, rolling 24h spending tracker, and verified address allow-list.
   - Implement unsigned EIP-1559 transaction constructor with live RPC gas estimation.
2. **Step 2: Build the Multi-Mode Signing Layer**:
   - Mode A: EIP-1193 browser wallet provider (`eth_sendTransaction`).
   - Mode B: Embedded MPC passkey signer with key-share simulation.
   - Mode C: Autonomous agent enclave with policy check enforcement.
3. **Step 3: Build the Interactive UI Console (`GeminiWeb3ArchitectureBridge.tsx`)**:
   - 4-column / 4-card architectural pipeline layout matching the blueprint.
   - Real-time prompt input with quick prompt buttons.
   - Policy limit meters (Daily spend used, remaining cap, session timer).
   - Signed calldata inspector with copy and explorer deep links.
4. **Step 4: Integrate with Navigation & Compile**:
   - Wire into `CryptographicKeyEnclaveSigningBridge.tsx` as a primary interactive tab.
   - Update `Navbar.tsx` and `enterpriseFolders.ts` if needed.
   - Run `lint_applet` and `compile_applet` to ensure zero compilation or type errors.

---

## 6. Verification & Testing Strategy

- **Test 1**: Input natural language prompt *"Swap 0.5 ETH for USDC on Base"* → verify Gemini extracts `{ action: "swap", amount: "0.5", tokenIn: "ETH", tokenOut: "USDC", chainId: 8453 }`.
- **Test 2**: Verify ethers.js compiles authentic unsigned EIP-1559 payload with valid router calldata and gas limits.
- **Test 3**: Test policy enforcement: attempt to send $75 when the 24h cap is $50 → verify the policy engine halts execution with a clear spending limit violation.
- **Test 4**: Test all 3 signing modes: Mode A (MetaMask prompt), Mode B (Passkey MPC), and Mode C (Enclave TEE) with deterministic $r, s, v$ verification.
- **Test 5**: Run TypeScript linter (`lint_applet`) and production compiler (`compile_applet`).
