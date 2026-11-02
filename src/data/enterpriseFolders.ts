import { NavTabId } from "../components/Navbar";
import { MembershipTier } from "../types/membership";

export type EnterpriseFolderId =
  | "ats_markets"
  | "sec_compliance"
  | "foundry_web3"
  | "ai_analytics"
  | "sovereign_vault";

export interface EnterpriseModuleItem {
  id: NavTabId;
  title: string;
  shortTitle: string;
  description: string;
  badge: string;
  requiredTier: MembershipTier;
  isExecutiveVault?: boolean;
}

export interface EnterpriseFolderDefinition {
  id: EnterpriseFolderId;
  number: string;
  name: string;
  shortName: string;
  description: string;
  clearanceLabel: string;
  defaultLocked: boolean;
  accentColor: string;
  modules: EnterpriseModuleItem[];
}

export const ENTERPRISE_FOLDERS: EnterpriseFolderDefinition[] = [
  {
    id: "ats_markets",
    number: "01",
    name: "Institutional ATS & Global Markets",
    shortName: "ATS & Markets",
    description: "24/7 SEC/FINRA Alternative Trading System, L2/L3 Order Books, NYSE Dual-Listing & 52-Exchange Routing",
    clearanceLabel: "PUBLIC • ELITE • VIP",
    defaultLocked: false,
    accentColor: "emerald",
    modules: [
      {
        id: "enterprise_showroom",
        title: "Enterprise Showroom (Desktop • Tablet • Mobile Sync)",
        shortTitle: "Enterprise Showroom",
        description: "4-Pillar cross-platform workstation, mobile native mirror, Style Dictionary tokens & ISO 20022.",
        badge: "4-Pillar Live",
        requiredTier: "free",
      },
      {
        id: "twe_ats_terminal",
        title: "Token World Exchange ATS® (TWE) Terminal",
        shortTitle: "TWE ATS® Terminal",
        description: "Multi-asset L2 order book with 18-decimal uint256 Wei precision and T+0 atomic settlement.",
        badge: "uint256•18-Dec",
        requiredTier: "free",
      },
      {
        id: "ats_nyse_exchange",
        title: "Token World Exchange (TWE) ATS® & NYSE Venue",
        shortTitle: "TWE ATS® & NYSE",
        description: "Institutional specification matrix, T+0 settlement engine, and TWE ecosystem utility model.",
        badge: "FINRA ATS",
        requiredTier: "free",
      },
      {
        id: "enterprise_exchange",
        title: "Enterprise TWE ATS® (Java • FastAPI • Kotlin)",
        shortTitle: "Enterprise Cockpit",
        description: "High-frequency matching engine schematics and Fortune 500/1000 institutional trajectory.",
        badge: "Fortune 500",
        requiredTier: "elite",
      },
      {
        id: "advanced_trading_terminal",
        title: "Advanced Trading & L3 Order Book",
        shortTitle: "Advanced L3 Book",
        description: "Limit, Stop-Loss, OCO orders, and deep institutional liquidity routing.",
        badge: "Limit•Stop•OCO",
        requiredTier: "vip",
      },
      {
        id: "live_market_uniswap_binance",
        title: "Live Market: Uniswap AMM & Binance CEX",
        shortTitle: "Live DEX & CEX",
        description: "Real-time arbitrage telemetry across decentralized AMM pools and centralized order books.",
        badge: "DEX & CEX",
        requiredTier: "free",
      },
      {
        id: "customer_liquidity_exchange",
        title: "Customer Liquidity Share Exchange (Multi-Wallet LP Marketplace)",
        shortTitle: "Buy LP Shares",
        description: "Customers connect MetaMask, Coinbase, Trust, Rabby, Uniswap, or Phantom to buy token liquidity shares.",
        badge: "LP Shares • APY",
        requiredTier: "free",
      },
      {
        id: "global_exchange",
        title: "Universal Token Swap (52 World Exchanges)",
        shortTitle: "52-Exchange Swap",
        description: "Cross-venue liquidity aggregator connected to Protocol Treasury 0x70Ac.",
        badge: "52 Venues",
        requiredTier: "free",
      },
      {
        id: "liquidity_pools",
        title: "509 Institutional Liquidity Pools",
        shortTitle: "509 Pools",
        description: "Deep automated market maker pairs and institutional TVL analytics.",
        badge: "509 Pairs",
        requiredTier: "free",
      },
    ],
  },
  {
    id: "sec_compliance",
    number: "02",
    name: "SEC EDGAR, Regulatory & Risk Surveillance",
    shortName: "SEC & Compliance",
    description: "Real-Time 10-K/10-Q/8-K Filings, Gemini MD&A Sentiment, Rule 15c3-5 Collars & Zero-Trust WORM",
    clearanceLabel: "REGULATORY SURVEILLANCE",
    defaultLocked: false,
    accentColor: "amber",
    modules: [
      {
        id: "sec_monitor",
        title: "SEC EDGAR Live Monitor (10-K, 10-Q, 8-K & AI Tone)",
        shortTitle: "SEC EDGAR Monitor",
        description: "Live EDGAR disclosures, Recharts risk heatmaps, keyword highlighting, and MD&A AI sentiment.",
        badge: "10-K•10-Q•8-K",
        requiredTier: "free",
      },
      {
        id: "regulatory_compliance",
        title: "Regulatory & SEC Rule 15c3-5 Compliance Hub",
        shortTitle: "Rule 15c3-5 Hub",
        description: "Automated pre-trade risk collars, tiered KYC/AML velocity checks, and FINRA audit logs.",
        badge: "KYC•15c3-5",
        requiredTier: "free",
      },
      {
        id: "risk_analytics",
        title: "Risk Analytics Panel (VaR & Volatility)",
        shortTitle: "Risk Analytics",
        description: "Value-at-Risk modeling, smart contract security scores, and portfolio stress testing.",
        badge: "VaR & Audit",
        requiredTier: "elite",
      },
      {
        id: "security_threat_scanner",
        title: "Security Threat Scanner (Heuristic AI)",
        shortTitle: "Threat Scanner",
        description: "Automated bytecode vulnerability detection and anti-drainer heuristics.",
        badge: "Heuristic AI",
        requiredTier: "elite",
      },
      {
        id: "maximum_security",
        title: "Maximum Security Lifecycle (Zero Trust • WORM)",
        shortTitle: "Max Security WORM",
        description: "Write-Once-Read-Many immutable compliance storage and hardware enclave telemetry.",
        badge: "Zero Trust",
        requiredTier: "vip",
      },
    ],
  },
  {
    id: "foundry_web3",
    number: "03",
    name: "Token Foundry, Web3 Compiler & Deployment",
    shortName: "Foundry & Web3",
    description: "Synthetic Token Batch Generator, Solidity Compiler, Remix 2.5.4 Studio & 75+ Chain Orchestrator",
    clearanceLabel: "BUILDER & FOUNDRY",
    defaultLocked: false,
    accentColor: "cyan",
    modules: [
      {
        id: "generator",
        title: "Token Foundry & Sovereign Batch Explorer",
        shortTitle: "Token Foundry",
        description: "High-volume synthetic token generator with EIP-55 checksums and sovereign reserve metrics.",
        badge: "Core Foundry",
        requiredTier: "free",
      },
      {
        id: "solidity_compiler",
        title: "Solidity Compiler & Full-Stack Web3 Engine",
        shortTitle: "Solidity Compiler",
        description: "Compile ERC-20/ERC-3643 contracts, inspect ABI/bytecode, and verify on-chain.",
        badge: "Full-Stack Web3",
        requiredTier: "free",
      },
      {
        id: "remix",
        title: "Remix 2.5.4 Studio Integration",
        shortTitle: "Remix Studio",
        description: "Interactive EVM smart contract IDE and deployment workspace.",
        badge: "EVM IDE",
        requiredTier: "free",
      },
      {
        id: "production_deployment",
        title: "Production Deployment & 5-Pillar Export Hub",
        shortTitle: "Deploy & Export",
        description: "One-click mainnet deployment pipelines and full-stack artifact bundling.",
        badge: "5-Pillar Live",
        requiredTier: "elite",
      },
      {
        id: "genesis_launch",
        title: "Genesis Launch Automator",
        shortTitle: "Genesis Launch",
        description: "Automated liquidity bootstrapping and genesis block provisioning.",
        badge: "Genesis",
        requiredTier: "elite",
      },
      {
        id: "simulator",
        title: "EVM Deployment Simulator",
        shortTitle: "Simulator",
        description: "Dry-run gas estimation and transaction execution simulation.",
        badge: "Gas Sim",
        requiredTier: "free",
      },
      {
        id: "public_registry",
        title: "Public Contract Registry (EVM Explorers)",
        shortTitle: "Contract Registry",
        description: "Verified smart contract directory across Ethereum, Base, Arbitrum, and Polygon.",
        badge: "Verified",
        requiredTier: "free",
      },
      {
        id: "all_apps",
        title: "All Apps Orchestrator (75+ Chains)",
        shortTitle: "75+ Chains",
        description: "Cross-chain bridge and multi-network dApp registry across EVM and SVM.",
        badge: "EVM•SVM",
        requiredTier: "free",
      },
      {
        id: "key_enclave_bridge",
        title: "Cryptographic Key Management & Secure Enclaves (Web3 Signing Bridge)",
        shortTitle: "Key Enclave Bridge",
        description: "Deterministic signing engine (ECDSA/Ed25519/EIP-712), AES-256-GCM enclave vault, and JSON-RPC node bridge.",
        badge: "Enclave Bridge",
        requiredTier: "free",
      },
    ],
  },
  {
    id: "ai_analytics",
    number: "04",
    name: "AI Intelligence, Quantum Analytics & Harmonics",
    shortName: "AI & Analytics",
    description: "Multimodal AI Vision/Music, Quantum D3 Heatmaps, 2⁸ Tokenomics, Workspace Hub & Solfeggio Hz",
    clearanceLabel: "QUANTUM & AI SUITE",
    defaultLocked: false,
    accentColor: "indigo",
    modules: [
      {
        id: "multi_modal_vision",
        title: "AI Vision & Music Hub (Lyria & Veo)",
        shortTitle: "AI Vision & Music",
        description: "Multimodal asset synthesis, audio generation, and visual inspection.",
        badge: "Lyria & Veo",
        requiredTier: "elite",
      },
      {
        id: "quantum_analytics",
        title: "Quantum D3 Analytics & Entropy Heatmaps",
        shortTitle: "Quantum D3",
        description: "Interactive D3.js market cap sparklines, chain risk pie charts, and entropy heatmaps.",
        badge: "D3 Heatmap",
        requiredTier: "elite",
      },
      {
        id: "analytics",
        title: "Recharts Financial Analytics",
        shortTitle: "Recharts Suite",
        description: "Institutional valuation distribution and multi-chain reserve charting.",
        badge: "Recharts",
        requiredTier: "free",
      },
      {
        id: "tokenomics_engine",
        title: "2⁸ Sovereign Tokenomics Engine",
        shortTitle: "2⁸ Tokenomics",
        description: "Power-of-two reserve modeling, burn simulators, and supply emission curves.",
        badge: "2⁸ Model",
        requiredTier: "free",
      },
      {
        id: "harmonics_studio",
        title: "Solfeggio & Fibonacci Sacred Harmonics Studio",
        shortTitle: "Harmonics Studio",
        description: "528 Hz / 432 Hz acoustic frequency synthesizer and Golden Ratio oscilloscope.",
        badge: "Solfeggio & Φ",
        requiredTier: "free",
      },
      {
        id: "workspace_hub",
        title: "Google Workspace (Gmail & Keep) & Futures Hub",
        shortTitle: "Workspace & Futures",
        description: "Enterprise communication sync and concurrent futures execution pipeline.",
        badge: "Gmail•Keep",
        requiredTier: "elite",
      },
      {
        id: "crypto_architect",
        title: "AI Crypto Architect & Invention Engine",
        shortTitle: "Crypto Architect",
        description: "Autonomous token architecture design and Solidity code synthesis.",
        badge: "AI Architect",
        requiredTier: "elite",
      },
      {
        id: "art_studio",
        title: "Crypto Art & SVG Bespoke Visualizer",
        shortTitle: "Art Studio",
        description: "Vector cryptography emblem generator and NFT metadatapackager.",
        badge: "SVG Art",
        requiredTier: "free",
      },
      {
        id: "weekly_tree3_update",
        title: "Weekly TREE3 Sovereign Carbon Update",
        shortTitle: "TREE3 Weekly",
        description: "Automated Monday telemetry for Tree3 ecological and RWA reserves.",
        badge: "Every Monday",
        requiredTier: "free",
      },
      {
        id: "genre_directory",
        title: "Web3 4-Matrix Genre Directory",
        shortTitle: "Web3 Genres",
        description: "Taxonomy of DeFi, RWA, GameFi, and Sovereign infrastructure tokens.",
        badge: "4-Matrix",
        requiredTier: "free",
      },
      {
        id: "scripts",
        title: "Hardhat & Foundry Script Hub",
        shortTitle: "Script Hub",
        description: "Automated deployment scripts, CLI pipelines, and verification utilities.",
        badge: "CLI Scripts",
        requiredTier: "free",
      },
      {
        id: "prompts",
        title: "2026 Institutional Prompt Library",
        shortTitle: "Prompt Library",
        description: "Curated quantitative and smart-contract engineering prompt templates.",
        badge: "2026 Prompts",
        requiredTier: "free",
      },
      {
        id: "ai_assistant",
        title: "AI Synthesizer & Smart Contract Agent",
        shortTitle: "AI Synthesizer",
        description: "Interactive quantitative research and smart contract assistant.",
        badge: "AI Agent",
        requiredTier: "elite",
      },
    ],
  },
  {
    id: "sovereign_vault",
    number: "05",
    name: "Sovereign Vault, Membership & Executive Admin",
    shortName: "Vault & Admin",
    description: "Tiered Memberships, 75% Discount Center, Unified SSO/TOTP Auth, Cloud Vault & Executive Sandbox",
    clearanceLabel: "SECURED ENCLAVE VAULT",
    defaultLocked: true,
    accentColor: "rose",
    modules: [
      {
        id: "discount_center",
        title: "ATS Discount Center & Fee Rebates (Up to 75% Off)",
        shortTitle: "Discount Center",
        description: "Interactive maker/taker rebate calculator, TWE OTC token discounts, and partner API credits.",
        badge: "75% Rebate",
        requiredTier: "free",
      },
      {
        id: "membership_tiers",
        title: "TWE ATS® Membership Tiers (Free • Elite • VIP)",
        shortTitle: "Membership Tiers",
        description: "Recurring subscriptions and one-time lifetime passes (strictly partitioned from Admin).",
        badge: "Tiers & Passes",
        requiredTier: "free",
      },
      {
        id: "unified_auth_gateway",
        title: "Unified Auth Gateway (Member SSO & Admin 2FA TOTP)",
        shortTitle: "Auth Gateway",
        description: "OAuth 2.0 institutional single sign-on and RFC 6238 hardware authenticator.",
        badge: "SSO • TOTP",
        requiredTier: "free",
        isExecutiveVault: true,
      },
      {
        id: "token_vault",
        title: "Sovereign Token Vault (Cloud Durable Storage)",
        shortTitle: "Token Vault",
        description: "Encrypted Firestore & local durable vault for minted token records and private keys.",
        badge: "Cloud Vault",
        requiredTier: "elite",
        isExecutiveVault: true,
      },
      {
        id: "wallet_portfolio",
        title: "Institutional Wallet Portfolio (MetaMask Sync)",
        shortTitle: "Wallet Portfolio",
        description: "Consolidated multi-chain asset balances, deployer sync, and treasury routing.",
        badge: "MetaMask Sync",
        requiredTier: "free",
        isExecutiveVault: true,
      },
      {
        id: "monetization",
        title: "Earn & Owner Revenue Command Hub",
        shortTitle: "Owner Revenue Hub",
        description: "DEX swap fee collection, deployment royalties, and protocol treasury telemetry.",
        badge: "Revenue Engine",
        requiredTier: "vip",
        isExecutiveVault: true,
      },
      {
        id: "institutional_sandbox",
        title: "Institutional Sandbox (TW-DEMO & Go-Live Gates)",
        shortTitle: "TW-DEMO Sandbox",
        description: "Permissioned institutional testing environment and regulatory go-live checklist.",
        badge: "TW-DEMO",
        requiredTier: "vip",
        isExecutiveVault: true,
      },
    ],
  },
];

export function findFolderByTabId(tabId: NavTabId): EnterpriseFolderDefinition {
  for (const folder of ENTERPRISE_FOLDERS) {
    if (folder.modules.some((m) => m.id === tabId)) {
      return folder;
    }
  }
  return ENTERPRISE_FOLDERS[0];
}
