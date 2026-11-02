import { PromptTemplate } from "../types";

export const PROMPT_COLLECTION: PromptTemplate[] = [
  {
    id: "p_evm_script",
    category: "scripts",
    title: "High-Volume EVM Contract Address Script (Python)",
    description: "Generates 1 million unique Ethereum-style contract addresses (0x + 40 hex chars) with corresponding uint256 Token IDs.",
    promptText: `Write a Python script to generate 1 million unique Ethereum-style contract addresses. The addresses must follow the 0x format followed by 40 hexadecimal characters (0-9, a-f). The script should also generate corresponding 'Token IDs' as unique uint256 integers. Output the result to a CSV file with columns: contract_address, token_id, and network_id (set to 1 for Ethereum).`,
    chainTarget: "Ethereum / EVM",
    tags: ["Python", "EVM", "CSV", "1 Million", "uint256"],
    sampleOutput: `import csv, secrets

with open("contracts_1m.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["contract_address", "token_id", "network_id"])
    for i in range(1, 1_000_001):
        addr = "0x" + secrets.token_hex(20)
        token_id = str(int(secrets.token_hex(32), 16))
        w.writerow([addr, token_id, 1])`,
  },
  {
    id: "p_solana_script",
    category: "scripts",
    title: "Solana Base58 Public Key Script (Python)",
    description: "Creates 1 million unique Solana-style public keys (32-44 characters in Base58) and exports to JSON.",
    promptText: `Generate a Python script using the base58 library to create 1 million unique Solana-style public keys. These should be 32 to 44 characters long using the Base58 alphabet (excluding 0, O, I, and l). Ensure the script is optimized for speed and saves the output to a JSON file.`,
    chainTarget: "Solana",
    tags: ["Python", "Solana", "Base58", "JSON", "High-Performance"],
    sampleOutput: `import base58, secrets, json

keys = [{"mint_address": base58.b58encode(secrets.token_bytes(32)).decode(), "chain": "solana"} for _ in range(1_000_000)]
with open("solana_keys.json", "w") as f:
    json.dump(keys, f, indent=2)`,
  },
  {
    id: "p_ai_depin_narrative",
    category: "narratives",
    title: "2026 AI Agents & DePIN Narrative Metadata",
    description: "Generate 1,000 unique token names and symbols aligned with 2026 AI agent and decentralized infrastructure narratives.",
    promptText: `Act as a crypto-market analyst in 2026. Generate a list of 1,000 unique token names and symbols for projects focusing on Decentralized Physical Infrastructure (DePIN) and Autonomous AI Agents. Use modern naming conventions like 'Synap-', 'Neural-', '-Node', or '-Grid'. Format: Name (Symbol) - e.g., NeuralNode (NNode).`,
    chainTarget: "Multi-Chain",
    tags: ["2026 Narrative", "AI Agents", "DePIN", "Metadata", "Naming"],
    sampleOutput: `1. NeuralGrid (NGRID)
2. SynapMesh (SYNM)
3. AgentNode (AGNODE)
4. CogniCore (CGCR)
5. HelioBand (HLBD)`,
  },
  {
    id: "p_rwa_narrative",
    category: "narratives",
    title: "RWA & Sustainability Token Batch",
    description: "Batch prompt for 2026 Real-World Asset protocols: tokenized carbon, real estate, and treasury yields.",
    promptText: `Generate a batch of 500 token names for 2026 Real-World Asset (RWA) protocols. Focus on tokenized carbon credits, real estate, and high-frequency trading. Use professional, institutional-grade naming styles like 'Regen-X', 'PrimeYield', 'BrickChain', and 'CarbonFlow'.`,
    chainTarget: "Multi-Chain",
    tags: ["RWA", "Carbon", "Real Estate", "Institutional", "2026"],
    sampleOutput: `1. CarbonFlow (CFLOW)
2. Regen-X (RGNX)
3. BrickChain (BRCK)
4. PrimeYield (PYLD)
5. TreasuryVault (TVLT)`,
  },
  {
    id: "p_market_simulation",
    category: "market_sim",
    title: "Realistic Market Status & Token Standards",
    description: "Simulates realistic 2026 standard distributions (ERC-20, ERC-721, ERC-1155, Quantum-Hybrid) and launch statuses.",
    promptText: `Provide a Python function that randomly assigns a 'Token Standard' and 'Launch Status' to a list of IDs. The standards should reflect 2026 usage: 60% ERC-20, 20% ERC-721 (NFTs), 10% ERC-1155, and 10% 'Quantum-Hybrid'. The statuses should include 'Deployed', 'Audited', 'Paused', and 'Liquidity Locked'.`,
    chainTarget: "EVM & Quantum",
    tags: ["Market Sim", "ERC-20", "Quantum-Hybrid", "Audited", "Weights"],
    sampleOutput: `import random

def assign_market_state():
    standards = ["ERC-20", "ERC-721", "ERC-1155", "Quantum-Hybrid"]
    standard_weights = [0.60, 0.20, 0.10, 0.10]
    
    statuses = ["Deployed", "Audited", "Liquidity Locked", "Paused"]
    status_weights = [0.50, 0.30, 0.15, 0.05]
    
    return {
        "standard": random.choices(standards, weights=standard_weights)[0],
        "status": random.choices(statuses, weights=status_weights)[0]
    }`,
  },
  {
    id: "p_recursive_batch",
    category: "recursive",
    title: "Recursive 50-Batch AI Generation Strategy",
    description: "A 4-step AI agent prompt that constructs 400+ unique tokens with vanity contract addresses in paginated 50-item batches.",
    promptText: `Step 1: Define a list of 20 creative prefixes and 20 suffixes for new 2026 crypto tokens.
Step 2: Use these to generate 400 unique name combinations.
Step 3: For each name, generate a random 42-character hexadecimal contract ID.
Step 4: Present the first 50 as a table, then tell me to say 'NEXT' to generate the next 50.`,
    chainTarget: "All Chains",
    tags: ["Recursive", "AI Agent", "Pagination", "Table", "Interactive"],
    sampleOutput: `| # | Token Name | Symbol | Contract Address | Standard |
|---|------------|--------|------------------|----------|
| 1 | SynapGrid  | SGRID  | 0x000a98f12... | ERC-20   |
| 2 | NeuralMesh | NMESH  | 0xACE9473b1... | ERC-20   |
... (50 items)
Say 'NEXT' to generate rows 51-100.`,
  },
  {
    id: "p_vanity_pro_tip",
    category: "pro_tips",
    title: "Institutional Vanity Address Simulation",
    description: "Pro-tip prompt for realistic 2026 institutional vanity prefixes (0x000, 0xACE, 0xDEFI).",
    promptText: `Ensure 5% of the generated contract IDs are 'Vanity Addresses' that start with 0x000, 0xACE, or 0xDEFI to look like high-budget institutional projects.`,
    chainTarget: "EVM",
    tags: ["Vanity", "0x000", "0xACE", "0xDEFI", "Institutional"],
    sampleOutput: `Vanity matchers:
- 0x0008f172a3... (Tier 1 Gas Optimized Contract)
- 0xACED7b420f... (Ace Protocol)
- 0xDEF17a992c... (DeFi Institutional Liquidity Vault)`,
  },
  {
    id: "p_founder_tokenomics_cap",
    category: "technical",
    title: "Founder Ownership Cap & 48-Month Vesting Architecture",
    description: "Institutional tokenomics specification enforcing a 15% core founder allocation cap, 12-month cliff, 36-month linear vesting, 20% ecosystem treasury, and 0.15% non-dilutive protocol fee.",
    promptText: `Role: You are an expert Web3 Tokenomics Architect and Smart Contract Strategist.
Task: Define and enforce the exact ownership, allocation, and revenue boundaries for the project lead/developer ("Creator") for the new token launch, drawing upon historical precedents (e.g., Satoshi Nakamoto's ~5% BTC holdings) and modern institutional tokenomics standards.

Tokenomics Parameters & Rules:
1. Core Ownership Cap: Direct allocation to core developer/founding team must not exceed 15% of total supply (capping founder control relative to Satoshi's ~5.2% baseline).
2. Vesting & Lockup Constraints: 12-month mandatory cliff (0% at TGE) followed by 36-month linear unlock via immutable multi-sig contract.
3. Treasury & Protocol Earnings Mechanics: 20% ecosystem treasury multi-sig reserve.
4. Protocol Fee Revenue: 0.15% protocol transaction fee routed to dev treasury; 0% transaction/transfer tax.

Provide: Token Distribution Table, Smart Contract Vesting Schedule Summary, and Draft Whitepaper Disclosure Statement.`,
    chainTarget: "EVM / Multi-Chain",
    tags: ["Tokenomics", "Vesting", "Founder Cap", "Whitepaper", "Smart Contracts", "Institutional"],
    sampleOutput: `Detailed Token Distribution Table (15% Founder, 20% Treasury, 30% Community, 25% Liquidity, 10% Reserve), 48-Month Smart Contract Vesting Schedule, and Institutional Whitepaper Disclosure Statement.`,
  },
  // --- 13 Specialized Public Contract ID Prompt Templates ---
  {
    id: "p_contract_id_evm_native",
    category: "smart_contracts",
    title: "EVM / Smart Contract Native (Solidity & Web3)",
    description: "Use when generating contract IDs on-chain using transaction execution context (msg.sender, block.timestamp, nonce).",
    promptText: `Write a Solidity function that generates a unique public contract ID using keccak256 hashing on msg.sender, block.timestamp, and an incrementing nonce, returning the result as a bytes32 value.`,
    chainTarget: "Ethereum / EVM (Solidity ^0.8.24)",
    tags: ["Solidity", "EVM", "keccak256", "bytes32", "On-Chain", "Nonce"],
    sampleOutput: `function generateContractId() public returns (bytes32) {
    _nonce++;
    bytes32 contractId = keccak256(
        abi.encodePacked(msg.sender, block.timestamp, _nonce)
    );
    emit ContractIdCreated(contractId, msg.sender, _nonce);
    return contractId;
}`,
  },
  {
    id: "p_contract_id_iso_compliance",
    category: "compliance",
    title: "Regulatory / ISO-Compliant (Legal Tech & Finance)",
    description: "Use when public contract identifiers must follow standardized enterprise or jurisdictional formats like [COUNTRY]-[YEAR]-[ENTITY]-[RANDOM6].",
    promptText: `Write a [Language] function to generate a public contract ID following the format [COUNTRY]-[YEAR]-[ENTITY]-[RANDOM6] (e.g., US-2026-FIN-8F3A92), ensuring input parameters are validated against standard ISO country codes.`,
    chainTarget: "Multi-Chain & Enterprise Legal Tech",
    tags: ["ISO-3166", "Compliance", "Legal Tech", "Finance", "Jurisdictional"],
    sampleOutput: `US-2026-FIN-8F3A92 (Validated against ISO 3166-1 alpha-2, 4-digit fiscal year, regulated entity ticker, and 6 secure uppercase hex characters)`,
  },
  {
    id: "p_contract_id_checksum_luhn",
    category: "technical",
    title: "Checksum-Validated (Error-Tolerant & Offline)",
    description: "Use when human data entry requires immediate validation against typos or manual transposition errors.",
    promptText: `Write a [Language] function that generates an 8-character alphanumeric public contract ID appended with a Luhn-mod-36 (or ISO/IEC 7064) checksum digit to validate user input before performing a database lookup.`,
    chainTarget: "Offline / Database / UI Validation",
    tags: ["Checksum", "Luhn-mod-36", "ISO/IEC 7064", "Typo-Proof", "Offline"],
    sampleOutput: `A9F4K2P8-M (8-character alphanumeric payload with appended Luhn-mod-36 verification digit M, enabling client-side zero-latency typo detection)`,
  },
  {
    id: "p_contract_id_zk_pedersen",
    category: "privacy_zk",
    title: "Zero-Knowledge / Privacy-Preserving (Blind Identifiers)",
    description: "Use when public contract IDs must expose validity without revealing underlying party identities or metadata.",
    promptText: `Write a [Language] function that generates a privacy-preserving public contract ID using a Pedersen commitment or keyed hash function to mask sensitive metadata while allowing cryptographic verification.`,
    chainTarget: "ZK-Rollups & Privacy-Preserving L2s",
    tags: ["Zero-Knowledge", "Pedersen Commitment", "Privacy", "Blind ID", "Cryptography"],
    sampleOutput: `zk_blind_0x9b4e87a1d52fc3804e59b44847b37957 (Cryptographic Pedersen commitment concealing counterparty addresses while maintaining verifiable audit proofs)`,
  },
  {
    id: "p_contract_id_snowflake",
    category: "distributed_systems",
    title: "K-Sortable / Snowflake IDs (High-Concurrency Distributed Systems)",
    description: "Use when generating unique, ordered contract IDs across distributed server nodes without database lock contention.",
    promptText: `Write a function in [Language] that generates a 64-bit K-sortable public contract ID (such as Twitter Snowflake or Sonyflake) encoding a timestamp, worker ID, and sequence number.`,
    chainTarget: "Distributed Backend & Node Clusters",
    tags: ["Snowflake", "Sonyflake", "64-bit", "K-Sortable", "Distributed", "High-Concurrency"],
    sampleOutput: `178878518820412894 (64-bit integer: 41 bits millisecond timestamp, 10 bits worker ID, 12 bits sequence number; supports 4,096 IDs/ms per worker)`,
  },
  {
    id: "p_contract_id_tenant_scoped",
    category: "distributed_systems",
    title: "Tenant-Scoped & Partitioned (Multi-Tenant SaaS)",
    description: "Use when contract IDs must include organization-level context for multi-tenant database routing and security scoping.",
    promptText: `Write a [Language] function to generate a public contract ID in the format [tenant_slug]_ctr_[random_base58], where the tenant identifier is normalized and followed by 10 secure Base58 characters.`,
    chainTarget: "Multi-Tenant Cloud & SaaS Protocols",
    tags: ["Multi-Tenant", "Base58", "Partitioning", "SaaS", "Security Scope"],
    sampleOutput: `acme_syndicate_ctr_8J4kL9mNpQ (Normalized tenant slug for database shard routing combined with 10 cryptographic Base58 chars)`,
  },
  {
    id: "p_contract_id_hmac_tamper_evident",
    category: "compliance",
    title: "HMAC-Signed / Tamper-Evident (Zero-Trust Validation)",
    description: "Use when public contract IDs need self-verifying integrity to prevent URL tampering without requiring a database lookup.",
    promptText: `Write a [Language] function that constructs a public contract ID by combining a payload (e.g., ctr_12345) with a truncated HMAC-SHA256 signature using a secret key, returning a format like ctr_12345.a1b2c3d4.`,
    chainTarget: "Zero-Trust Web3 Gateway & API Routing",
    tags: ["HMAC", "SHA-256", "Tamper-Evident", "Zero-Trust", "Self-Verifying"],
    sampleOutput: `ctr_12345.a1b2c3d4 (Self-verifying ID combining numeric identifier with 8-character truncated HMAC-SHA256 cryptographic signature)`,
  },
  {
    id: "p_contract_id_sequential_timestamp",
    category: "scripts",
    title: "Sequential / Timestamp-Based (Audit-Friendly)",
    description: "Use when contract IDs need to sort chronologically or convey creation sequence without exposing sensitive volume stats.",
    promptText: `Write a function in [Language] that generates a public contract ID in the format CTR-YYYYMMDD-[RANDOM6], using the current UTC date and 6 cryptographically secure random alphanumeric characters.`,
    chainTarget: "Audit & Chronological Ledgers",
    tags: ["Timestamp", "Audit-Friendly", "UTC", "Chronological", "Sequential"],
    sampleOutput: `CTR-20260915-A9F204 (Chronologically sorted calendar prefix with 6 cryptographically random alphanumeric entropy characters)`,
  },
  {
    id: "p_contract_id_blockchain_sha256",
    category: "smart_contracts",
    title: "Blockchain / Hash-Based (Deterministic)",
    description: "Use when generating a reproducible, verifiable public contract ID derived from contract state, metadata, or address details.",
    promptText: `Write a [Language] function that generates a public contract ID by taking contract metadata inputs (such as timestamp, creator address, and nonce), hashing them with SHA-256, and returning a 0x-prefixed 32-character hexadecimal string.`,
    chainTarget: "EVM / Cross-Chain State Derivation",
    tags: ["SHA-256", "Deterministic", "Reproducible", "Hexadecimal", "State-Derived"],
    sampleOutput: `0xdE901AeDe6b149954596b202f2411117 (Deterministic 0x-prefixed 32-char hexadecimal string computed from creator address, timestamp, and nonce)`,
  },
  {
    id: "p_contract_id_ulid",
    category: "distributed_systems",
    title: "ULID (Universally Unique Lexicographically Sortable Identifier)",
    description: "Use as a modern alternative to UUID when you need 128-bit security, URL-safe Base32 encoding, and natural chronological sorting.",
    promptText: `Write a snippet in [Language] to generate a 26-character ULID with an optional custom prefix contract_ for use as a public database identifier.`,
    chainTarget: "Modern Web3 APIs & Indexers",
    tags: ["ULID", "Crockford Base32", "Sortable", "128-bit", "URL-Safe"],
    sampleOutput: `contract_01ARZ3NDEKTSV4RRFFQ69G5FAV (26-character Crockford Base32 identifier with 48-bit timestamp prefix and 80-bit randomness)`,
  },
  {
    id: "p_contract_id_uuid_v4",
    category: "technical",
    title: "UUID v4 (Standard & Unique)",
    description: "Use when you need globally unique, unguessable identifiers without central coordination.",
    promptText: `Write a function in [Language] to generate a cryptographically secure UUID v4 string for a public contract ID.`,
    chainTarget: "RFC-4122 Universal Standard",
    tags: ["UUID", "UUIDv4", "RFC-4122", "Unguessable", "Standard"],
    sampleOutput: `a3bb189e-8bf9-4888-9912-ace4e6543002 (RFC-4122 v4 128-bit cryptographically secure unique identifier)`,
  },
  {
    id: "p_contract_id_prefixed_hex",
    category: "scripts",
    title: "Prefixed Hexadecimal (Readable & Structured)",
    description: "Use when you want a clear human-readable prefix (e.g., CTR-) combined with random bytes.",
    promptText: `Generate a code snippet in [Language] that creates a public contract ID using the format CTR- followed by 12 random uppercase hexadecimal characters generated with a secure random number generator.`,
    chainTarget: "Human-Readable & Explorer Friendly",
    tags: ["Prefixed Hex", "CTR-", "Secure Random", "Readable", "Structured"],
    sampleOutput: `CTR-8F3A92BC10D4 (Formatted with human-scannable CTR- prefix and 12 cryptographically random uppercase hex digits)`,
  },
  {
    id: "p_contract_id_nanoid_base58",
    category: "technical",
    title: "Nanoid / Base58 (Short & URL-Safe)",
    description: "Use when you need compact, collision-resistant IDs suitable for URLs or public reference numbers.",
    promptText: `Write a [Language] function using Nanoid (or Base58 encoding) to generate an 8-to-12 character URL-safe string with the prefix contract_.`,
    chainTarget: "Compact URLs & QR Codes",
    tags: ["Nanoid", "Base58", "Compact", "URL-Safe", "QR-Code Friendly"],
    sampleOutput: `contract_V1StGXR8_Z5j (Compact 10-character URL-safe collision-resistant token with custom contract_ prefix)`,
  },
  {
    id: "p_metamask_ierc20_spec",
    category: "smart_contracts",
    title: "MetaMask Custom Token Auto-Discovery & IERC20 Specification",
    description: "Detailed specification of how MetaMask imports custom tokens via eth_call (symbol, decimals), calculates balances via 10^decimals division, and constructs transfer transactions.",
    promptText: `Explain how MetaMask uses the ERC-20 smart contract specification for custom token importing, balance display, and transfers. Provide the canonical IERC20 interface containing both view functions (name, symbol, decimals, totalSupply, balanceOf, allowance) and transaction functions (transfer, approve, transferFrom) alongside Transfer and Approval events. Highlight required EVM RPC calls (eth_call for selectors 0x95d89b41 symbol, 0x313ce567 decimals, and 0x70a08231 balanceOf) and the exact precision arithmetic used to convert raw uint256 integers to human-readable decimals.`,
    chainTarget: "Ethereum / EVM / Base / Arbitrum / Polygon",
    tags: ["MetaMask", "IERC20", "ERC-20", "eth_call", "Decimals", "wallet_watchAsset"],
    sampleOutput: `interface IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}`,
  },
];
