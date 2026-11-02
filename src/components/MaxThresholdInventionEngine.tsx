import React, { useState, useMemo } from "react";
import {
  Cpu,
  Layers,
  Shield,
  ShieldCheck,
  Coins,
  Zap,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  Info,
  TrendingUp,
  Globe,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Code2,
  FileCode,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { TokenRecord, ChainType } from "../types";
import { generateEVMAddress, generateUint256TokenId, generateRandomHex } from "../utils/cryptoGenerators";
import { DeploymentSimulator } from "./DeploymentSimulator";
import { LIQUIDITY_POOLS_509, LIQUIDITY_CATEGORIES, LiquidityPoolItem, getLiquidityPoolById } from "../data/liquidityPools509";
import { saveTokensToFirestore } from "../lib/firebase";

// Exact 256-bit unsigned integer maximum: 2^256 - 1
export const UINT256_MAX_STRING = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
// Max displayable with 18 decimals: (2^256 - 1) / 10^18
export const UINT256_MAX_18DEC_STRING = "115792089237316195423570985008687907853269984665640564039457";

interface MaxThresholdInventionEngineProps {
  onInventToken?: (tokens: TokenRecord[]) => void;
  onSendToRemix?: (solidityCode: string, tokenName: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const MaxThresholdInventionEngine: React.FC<MaxThresholdInventionEngineProps> = ({
  onInventToken,
  onSendToRemix,
  onNavigateTab,
}) => {
  // Multi-Invention Batch State
  const [isBatchInventing, setIsBatchInventing] = useState<boolean>(false);
  const [batchCountInput, setBatchCountInput] = useState<number>(10);
  const [batchInventLog, setBatchInventLog] = useState<string | null>(null);
  const [remixSentSuccess, setRemixSentSuccess] = useState<boolean>(false);
  // Supply Paradigm Selection
  const [supplyParadigm, setSupplyParadigm] = useState<
    "uncapped" | "btc_21m" | "fixed_1t" | "giga_900t" | "giga_factory" | "septillion" | "protocol_max" | "sovereign_macro" | "custom"
  >("uncapped");
  const [customSupplyInput, setCustomSupplyInput] = useState<string>("1000000000000000000000000"); // 1 Septillion default
  const [decimals, setDecimals] = useState<number>(18);
  const [sovereignOwner, setSovereignOwner] = useState<string>("Mauro Lomibao Dar III");
  const [reserveShares, setReserveShares] = useState<string>("900000000000000000000"); // 9e20 (uint256, 18 decimals)
  const [treasuryShares, setTreasuryShares] = useState<string>("9000000000000000000000"); // 9e21 (uint256, 18 decimals)

  // Price Selection (Variable Order Book Liquidity)
  const [pricePreset, setPricePreset] = useState<string>("80077");
  const [customPriceInput, setCustomPriceInput] = useState<string>("80077");

  // Token Identification Inputs
  const [tokenName, setTokenName] = useState<string>("Infinite Token");
  const [tokenSymbol, setTokenSymbol] = useState<string>("INFT");
  const [tokenStandard, setTokenStandard] = useState<"ERC-20" | "ERC-721" | "ERC-1155">("ERC-20");
  const [targetChain, setTargetChain] = useState<ChainType>("ethereum");

  // Liquidity Pool Pair Configuration (509 pools across 11 ecosystems)
  const [selectedPoolId, setSelectedPoolId] = useState<number>(1);
  const [poolCategoryFilter, setPoolCategoryFilter] = useState<string>("all");
  const [poolSearchQuery, setPoolSearchQuery] = useState<string>("");
  const [pairMode, setPairMode] = useState<"pair_token" | "bind_pool">("pair_token");

  // Code Tab Selection
  const [codeTab, setCodeTab] = useState<"solidity" | "hardhat" | "foundry_cli" | "simulator">("solidity");

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inventedSuccess, setInventedSuccess] = useState<boolean>(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Compute effective numeric / displayable supply string
  const displaySupplyString = useMemo(() => {
    switch (supplyParadigm) {
      case "uncapped":
        return "Continuous Uncapped (Up to 2^256 - 1)";
      case "btc_21m":
        return "21,000,000";
      case "fixed_1t":
        return "1,000,000,000,000";
      case "giga_900t":
        return "900,000,000,000,000 (900 Trillion with 18 decimals)";
      case "giga_factory":
        return "Endless Stream Factory (900 Trillion per deployed instance)";
      case "septillion":
        return "1,000,000,000,000,000,000,000,000"; // 10^24
      case "protocol_max":
        if (decimals === 18) return `~1.15792 × 10^59 (${UINT256_MAX_18DEC_STRING})`;
        if (decimals === 9) return "~1.15792 × 10^68";
        if (decimals === 6) return "~1.15792 × 10^71";
        return `~1.15792 × 10^77 (${UINT256_MAX_STRING})`;
      case "sovereign_macro":
        return "9,900,000,000,000,000,000,000 (9e20 Reserve + 9e21 Treasury)";
      case "custom":
        return customSupplyInput || "0";
      default:
        return "1,000,000,000";
    }
  }, [supplyParadigm, decimals, customSupplyInput]);

  // Numerical multiplier for Market Cap calculation
  const numericSupply = useMemo<number>(() => {
    switch (supplyParadigm) {
      case "uncapped":
        // For calculation purposes of circulating initial supply, use 1 Billion circulating unless specified
        return 1000000000;
      case "btc_21m":
        return 21000000;
      case "fixed_1t":
        return 1000000000000;
      case "giga_900t":
      case "giga_factory":
        return 900000000000000;
      case "septillion":
        return 1e24;
      case "protocol_max":
        return 1.157920892373162e59;
      case "sovereign_macro":
        return 9.9e21;
      case "custom": {
        const parsed = parseFloat(customSupplyInput.replace(/,/g, ""));
        return isNaN(parsed) || parsed <= 0 ? 1000000000 : parsed;
      }
      default:
        return 1000000000;
    }
  }, [supplyParadigm, customSupplyInput]);

  // Numerical price per token
  const numericPrice = useMemo<number>(() => {
    const val = parseFloat(customPriceInput.replace(/,/g, ""));
    return isNaN(val) || val <= 0 ? 80077 : val;
  }, [customPriceInput]);

  // Market Cap = Supply * Price
  const { marketCapScientific, marketCapFormatted, globalWealthRatio } = useMemo(() => {
    const cap = numericSupply * numericPrice;
    
    // Total global wealth ~ $454 Trillion ($4.54e14)
    const TOTAL_GLOBAL_WEALTH = 4.54e14;
    const ratio = cap / TOTAL_GLOBAL_WEALTH;

    // Helper for large words
    let formatted = "";
    if (cap < 1e6) {
      formatted = `$${cap.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else if (cap < 1e9) {
      formatted = `$${(cap / 1e6).toFixed(2)} Million`;
    } else if (cap < 1e12) {
      formatted = `$${(cap / 1e9).toFixed(2)} Billion`;
    } else if (cap < 1e15) {
      formatted = `$${(cap / 1e12).toFixed(2)} Trillion`;
    } else if (cap < 1e18) {
      formatted = `$${(cap / 1e15).toFixed(2)} Quadrillion`;
    } else if (cap < 1e21) {
      formatted = `$${(cap / 1e18).toFixed(2)} Quintillion`;
    } else if (cap < 1e24) {
      formatted = `$${(cap / 1e21).toFixed(2)} Sextillion`;
    } else if (cap < 1e27) {
      formatted = `$${(cap / 1e24).toFixed(2)} Septillion`;
    } else if (cap < 1e30) {
      formatted = `$${(cap / 1e27).toFixed(2)} Octillion`;
    } else if (cap < 1e33) {
      formatted = `$${(cap / 1e30).toFixed(2)} Nonillion`;
    } else if (cap < 1e36) {
      formatted = `$${(cap / 1e33).toFixed(2)} Decillion`;
    } else {
      formatted = `$${cap.toExponential(4)} USD`;
    }

    return {
      marketCapScientific: cap.toExponential(5),
      marketCapFormatted: formatted,
      globalWealthRatio: ratio,
    };
  }, [numericSupply, numericPrice]);

  // Derived Contract Identifiers
  const contractIdentifier = useMemo(() => {
    if (supplyParadigm === "giga_factory") return "TokenFactory";
    if (supplyParadigm === "giga_900t") return "GigaSupplyToken";
    const cleanSym = tokenSymbol.replace(/[^a-zA-Z0-9]/g, "") || "INFT";
    if (tokenStandard === "ERC-721") return "DynamicERC721";
    if (tokenStandard === "ERC-1155") return "UncappedERC1155";
    return supplyParadigm === "uncapped" ? "UncappedERC20" : `${cleanSym}Token`;
  }, [tokenStandard, tokenSymbol, supplyParadigm]);

  const contractFileName = useMemo(() => {
    if (supplyParadigm === "giga_factory") return "TokenFactory.sol";
    if (supplyParadigm === "giga_900t") return "GigaSupplyToken.sol";
    if (tokenStandard === "ERC-721") return "DynamicERC721.sol";
    if (tokenStandard === "ERC-1155") return "UncappedERC1155.sol";
    const cleanSym = tokenSymbol.replace(/[^a-zA-Z0-9]/g, "") || "Token";
    return supplyParadigm === "uncapped" ? "UncappedERC20.sol" : `${cleanSym}Token.sol`;
  }, [tokenStandard, tokenSymbol, supplyParadigm]);

  // 509 Liquidity Pool Helpers
  const selectedPool = useMemo(() => {
    return getLiquidityPoolById(selectedPoolId) || LIQUIDITY_POOLS_509[0];
  }, [selectedPoolId]);

  const filteredPoolsForEngine = useMemo(() => {
    return LIQUIDITY_POOLS_509.filter((p) => {
      const matchCat = poolCategoryFilter === "all" || p.categoryKey === poolCategoryFilter;
      if (!matchCat) return false;
      if (!poolSearchQuery.trim()) return true;
      const q = poolSearchQuery.toLowerCase();
      return (
        p.pair.toLowerCase().includes(q) ||
        p.dex.toLowerCase().includes(q) ||
        p.chain.toLowerCase().includes(q) ||
        p.id.toString() === q.replace("#", "")
      );
    });
  }, [poolCategoryFilter, poolSearchQuery]);

  const inventedLiquidityPair = useMemo(() => {
    const quoteAsset = selectedPool.pair.split("/")[1] || "USDC";
    if (pairMode === "pair_token") {
      return `${tokenSymbol}/${quoteAsset} [Pool #${selectedPool.id}: ${selectedPool.pair} via ${selectedPool.dex}]`;
    }
    return `${selectedPool.pair} (${selectedPool.dex})`;
  }, [selectedPool, tokenSymbol, pairMode]);

  // Synthetic TokenRecord for Simulation
  const currentConfiguredToken: TokenRecord = useMemo(() => {
    const calculatedCap = supplyParadigm === "sovereign_macro"
      ? Math.max(3_000_000_000_000, Math.floor(numericSupply * numericPrice))
      : numericSupply * numericPrice;

    return {
      id: "current_invented_token",
      name: tokenName,
      symbol: tokenSymbol,
      chain: targetChain,
      networkId: 1,
      contractAddress: "0x71C8364862088029F741C89F30C66567584143a9",
      isVanity: false,
      tokenId: "0",
      tokenStandard: tokenStandard,
      narrative: "ai_agents",
      launchStatus: "Deployed",
      initialSupply: displaySupplyString,
      decimals: decimals,
      marketCap: calculatedCap,
      priceUsd: numericPrice,
      liquidityPair: inventedLiquidityPair,
      liquidityPoolId: selectedPool.id,
      reserveShares: supplyParadigm === "sovereign_macro" ? reserveShares : undefined,
      treasuryShares: supplyParadigm === "sovereign_macro" ? treasuryShares : undefined,
      targetOwner: sovereignOwner,
      holderCount: 1,
      auditFirm: "OpenZeppelin",
      securityScore: 98,
      createdAt: new Date().toISOString(),
      creationTx: "0x00",
      deployerAddress: "0x71C8364862088029F741C89F30C66567584143a9",
      quantum_entropy_signature: "0000000000000000000000000000000000000000000000000000000000000000",
    };
  }, [tokenName, tokenSymbol, targetChain, tokenStandard, displaySupplyString, decimals, numericSupply, numericPrice, inventedLiquidityPair, selectedPool.id, supplyParadigm, reserveShares, treasuryShares, sovereignOwner]);

  // Generated Solidity Code
  const generatedSolidityCode = useMemo(() => {
    const isUncapped = supplyParadigm === "uncapped";
    const cleanSym = tokenSymbol.replace(/[^a-zA-Z0-9]/g, "") || "INFT";
    const cleanNam = tokenName.replace(/[^a-zA-Z0-9 ]/g, "") || "Infinite Token";

    // TokenFactory (Endless GigaSupplyToken Factory by Mauro Lomibao Dar III)
    if (supplyParadigm === "giga_factory") {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GigaSupplyToken.sol";

/**
 * @title TokenFactory
 * @author Mauro Lomibao Dar III
 * @notice Factory to deploy and track an endless list of GigaSupplyToken contracts.
 */
contract TokenFactory {
    // Automatically routes and registers to Mauro Lomibao Dar III's treasury address
    address public constant TREASURY_WALLET = 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D;

    // Tracks the endless stream of dynamically deployed contract addresses
    address[] public deployedTokensRegistry;

    event TokenDeployed(
        address indexed tokenAddress,
        string name,
        string symbol,
        address indexed beneficiary
    );

    /**
     * @dev Deploys a new GigaSupplyToken instance and sends the 900 Trillion supply to the Treasury.
     * @param name Name of the new token (e.g., "Giga Token")
     * @param symbol Symbol of the new token (e.g., "GIGA")
     */
    function generateNewToken(
        string memory name, 
        string memory symbol
    ) public returns (address) {
        // Deploy a new GigaSupplyToken instance
        GigaSupplyToken newToken = new GigaSupplyToken(name, symbol);
        address tokenAddress = address(newToken);

        // Record the freshly generated address to the registry list
        deployedTokensRegistry.push(tokenAddress);

        emit TokenDeployed(tokenAddress, name, symbol, TREASURY_WALLET);

        return tokenAddress;
    }

    /**
     * @dev Fetch the complete array of generated contract addresses
     */
    function getGeneratedAddresses() public view returns (address[] memory) {
        return deployedTokensRegistry;
    }

    /**
     * @dev Helper to get the total number of deployed contracts
     */
    function getDeployedCount() public view returns (uint256) {
        return deployedTokensRegistry.length;
    }
}`;
    }

    // GigaSupplyToken (900 Trillion Treasury Mint by Mauro Lomibao Dar III)
    if (supplyParadigm === "giga_900t") {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GigaSupplyToken
 * @author Mauro Lomibao Dar III
 * @notice Standard ERC20 token with 900 Trillion initial supply minted to Treasury.
 */
contract GigaSupplyToken is ERC20, Ownable {
    // 900 Trillion Supply = 900,000,000,000,000 with 18 decimals
    uint256 private constant TARGET_SUPPLY = 900_000_000_000_000 * 10**18;
    
    // Designated Treasury Wallet for Mauro Lomibao Dar III
    address public constant TREASURY_WALLET = 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D;

    constructor(
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) Ownable(TREASURY_WALLET) {
        // Automatically mints the entire supply directly to the Treasury Wallet
        _mint(TREASURY_WALLET, TARGET_SUPPLY);
    }
}`;
    }

    // Sovereign Reserve & Treasury Dedicated Smart Contract
    if (supplyParadigm === "sovereign_macro") {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SovereignReserveTreasuryToken (${cleanNam} - ${cleanSym})
 * @notice 18-Decimal EVM Token with Dedicated 9e20 Reserve & 9e21 Treasury Architecture
 * 
 * PROTOCOL SPECIFICATIONS:
 * - Sovereign Owner: ${sovereignOwner}
 * - Decimals: 18 (Standard uint256 precision)
 * - Reserve Allocation: ${reserveShares} (9e20 uint256 units with 18 decimals)
 * - Treasury Allocation: ${treasuryShares} (9e21 uint256 units with 18 decimals)
 * - Total Sovereign Cap: 9,900,000,000,000,000,000,000 * (10 ** 18)
 * - CoinMarketCap Valuation Target: >= $3,000,000,000,000 USD ($3.00+ Trillion MCap)
 */
contract ${cleanSym}SovereignToken is ERC20, ERC20Permit, ERC20Burnable, AccessControl {
    bytes32 public constant SOVEREIGN_ROLE = keccak256("SOVEREIGN_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    // uint256 with 18 decimals specifications
    uint256 public constant RESERVE_SHARES = 900_000_000_000_000_000_000 * (10 ** 18);
    uint256 public constant TREASURY_SHARES = 9_000_000_000_000_000_000_000 * (10 ** 18);
    uint256 public constant TOTAL_SOVEREIGN_CAP = RESERVE_SHARES + TREASURY_SHARES;

    address public reserveVault;
    address public treasuryVault;
    string public constant SOVEREIGN_ARCHITECT = "${sovereignOwner}";
    uint256 public constant COINMARKETCAP_TARGET_USD = 3_000_000_000_000;

    event ReserveAllocated(address indexed reserveVault, uint256 amount);
    event TreasuryAllocated(address indexed treasuryVault, uint256 amount);
    event VaultsUpdated(address indexed newReserve, address indexed newTreasury);

    constructor(
        address initialSovereign,
        address initialReserveVault,
        address initialTreasuryVault
    ) 
        ERC20("${cleanNam}", "${cleanSym}") 
        ERC20Permit("${cleanNam}") 
    {
        address admin = initialSovereign != address(0) ? initialSovereign : msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SOVEREIGN_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);

        reserveVault = initialReserveVault != address(0) ? initialReserveVault : admin;
        treasuryVault = initialTreasuryVault != address(0) ? initialTreasuryVault : admin;

        // Genesis mint for Reserve and Treasury partitions
        _mint(reserveVault, RESERVE_SHARES);
        _mint(treasuryVault, TREASURY_SHARES);

        emit ReserveAllocated(reserveVault, RESERVE_SHARES);
        emit TreasuryAllocated(treasuryVault, TREASURY_SHARES);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function setVaults(address newReserve, address newTreasury) external onlyRole(SOVEREIGN_ROLE) {
        require(newReserve != address(0) && newTreasury != address(0), "Zero address invalid");
        reserveVault = newReserve;
        treasuryVault = newTreasury;
        emit VaultsUpdated(newReserve, newTreasury);
    }
}`;
    }

    // ERC-721 Dynamic Continuous Minting (No cap)
    if (tokenStandard === "ERC-721") {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DynamicERC721 (${cleanNam})
 * @notice 2026 EVM Continuous Uncapped NFT Protocol
 * Mints new token IDs continuously without total supply cap.
 */
contract DynamicERC721 is ERC721, Ownable {
    uint256 private _nextTokenId;

    constructor(string memory name_, string memory symbol_) 
        ERC721(name_, symbol_) 
        Ownable(msg.sender) 
    {}

    /**
     * @dev Mints new token IDs continuously without total supply cap.
     */
    function safeMint(address to) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }

    /**
     * @dev Returns total minted token count so far
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}`;
    }

    // ERC-1155 Multi-Token Continuous Minting (No cap)
    if (tokenStandard === "ERC-1155") {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UncappedERC1155 (${cleanNam})
 * @notice 2026 EVM Uncapped Multi-Token Protocol
 * Mints any quantity of any token ID without total supply constraints.
 */
contract UncappedERC1155 is ERC1155, Ownable {
    constructor(string memory uri) ERC1155(uri) Ownable(msg.sender) {}

    /**
     * @dev Mints any quantity of any token ID without total supply constraints.
     */
    function mint(address account, uint256 id, uint256 amount, bytes memory data) external onlyOwner {
        _mint(account, id, amount, data);
    }

    /**
     * @dev Batch mints arbitrary quantities across multiple token IDs simultaneously.
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @dev Update URI for metadata
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}`;
    }

    // ERC-20 Uncapped Continuous Minting
    if (isUncapped) {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UncappedERC20 (${cleanNam} - ${cleanSym})
 * @notice EVM Uncapped Continuous Minting Invention (Solidity 0.8.24)
 * 
 * PROTOCOL LIMITS & ECONOMIC THRESHOLDS:
 * 1. Technical Limit: EVM uint256 max is 2^256 - 1 (~1.15792e77 raw units).
 *    With ${decimals} decimals, displayable limit is ~1.15792e59 tokens.
 * 2. Design Limit: This contract OMITS a hardcoded supply cap. Authorized minters
 *    can continually mint tokens up to type(uint256).max.
 * 3. Market Pricing: Configured target order book price: $${numericPrice.toLocaleString()} / token.
 */
contract UncappedERC20 is ERC20, ERC20Permit, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint8 private immutable _customDecimals;

    // Technical 256-bit protocol limit
    uint256 public constant PROTOCOL_THEORETICAL_MAX = type(uint256).max;

    event ContinuousMint(address indexed minter, address indexed recipient, uint256 amount, uint256 newTotalSupply);
    event BatchContinuousMint(address indexed minter, uint256 totalRecipients, uint256 totalAmount);

    constructor(string memory name_, string memory symbol_) 
        ERC20(name_, symbol_) 
        ERC20Permit(name_) 
    {
        _customDecimals = ${decimals};
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }

    /**
     * @notice Continually mints up to the 256-bit protocol ceiling (type(uint256).max)
     * @dev Solidity 0.8+ checked arithmetic naturally protects against integer overflow.
     */
    function continuousMint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= PROTOCOL_THEORETICAL_MAX, "EVM uint256 overflow limit reached");
        _mint(to, amount);
        emit ContinuousMint(msg.sender, to, amount, totalSupply());
    }

    /**
     * @notice Batch continuous distribution for high-volume liquidity provisioning
     */
    function batchContinuousMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyRole(MINTER_ROLE) 
    {
        require(recipients.length == amounts.length, "Length mismatch");
        uint256 totalBatch = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            totalBatch += amounts[i];
            _mint(recipients[i], amounts[i]);
        }
        emit BatchContinuousMint(msg.sender, recipients.length, totalBatch);
    }

    /**
     * @notice Returns remaining mint capacity under EVM 256-bit ceiling
     */
    function remainingMintCapacity() external view returns (uint256) {
        return PROTOCOL_THEORETICAL_MAX - totalSupply();
    }
}`;
    }

    // ERC-20 Capped Version
    let supplyLiteral = "1_000_000_000";
    if (supplyParadigm === "btc_21m") supplyLiteral = "21_000_000";
    else if (supplyParadigm === "fixed_1t") supplyLiteral = "1_000_000_000_000";
    else if (supplyParadigm === "septillion") supplyLiteral = "1_000_000_000_000_000_000_000_000";
    else if (supplyParadigm === "protocol_max") supplyLiteral = "type(uint256).max / (10 ** 18)";
    else supplyLiteral = customSupplyInput.replace(/,/g, "");

    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title ${cleanNam} (${cleanSym})
 * @notice Fixed Cap EVM Token Invention (${supplyParadigm})
 * 
 * Supply Cap: ${displaySupplyString}
 * Decimals: ${decimals}
 * Target Order Book Price: $${numericPrice.toLocaleString()} / token
 */
contract ${cleanSym}Token is ERC20, ERC20Permit, ERC20Burnable, Ownable2Step {
    uint256 public constant MAX_SUPPLY = ${supplyLiteral} * (10 ** ${decimals});
    uint8 private immutable _customDecimals;

    constructor(address initialOwner) 
        ERC20("${cleanNam}", "${cleanSym}") 
        ERC20Permit("${cleanNam}") 
        Ownable(initialOwner) 
    {
        _customDecimals = ${decimals};
        // Initial genesis mint to owner
        _mint(initialOwner, MAX_SUPPLY);
    }

    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}`;
  }, [tokenStandard, supplyParadigm, decimals, tokenSymbol, tokenName, numericPrice, customSupplyInput, displaySupplyString]);

  // Generated Hardhat Deployment Script (deploy.js)
  const generatedHardhatDeployScript = useMemo(() => {
    return `const hre = require("hardhat");

async function main() {
  const contractName = "${contractIdentifier}";
  console.log(\`Starting deployment of \${contractName} ("${tokenName}", "${tokenSymbol}")...\`);

  const ContractFactory = await hre.ethers.getContractFactory(contractName);
  const token = await ContractFactory.deploy("${tokenName}", "${tokenSymbol}");

  await token.waitForDeployment();

  const deployedAddress = await token.getAddress();
  console.log(\`\${contractName} deployed to: \${deployedAddress}\`);
  console.log(\`Token Name: ${tokenName} | Symbol: ${tokenSymbol} | Standard: ${tokenStandard}\`);
  console.log(\`Configured Supply: ${displaySupplyString}\`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
`;
  }, [contractIdentifier, tokenName, tokenSymbol, tokenStandard, displaySupplyString]);

  // Generated Terminal Commands (Git, Hardhat, Foundry forge create)
  const generatedTerminalCommands = useMemo(() => {
    return `# ==============================================================================
# 1. INITIALIZE PROJECT
# ==============================================================================
git init
npm init -y
npm install --save-dev hardhat @openzeppelin/contracts
npx hardhat init

# ==============================================================================
# 2. FOUNDRY CLI DEPLOYMENT COMMAND (Instant Terminal Deployment)
# ==============================================================================
forge create --rpc-url <RPC_URL> \\
  --private-key <PRIVATE_KEY> \\
  src/${contractFileName}:${contractIdentifier} \\
  --constructor-args "${tokenName}" "${tokenSymbol}"

# ==============================================================================
# 3. RUN HARDHAT DEPLOYMENT SCRIPT
# ==============================================================================
npx hardhat run scripts/deploy.js --network <NETWORK_NAME>
`;
  }, [contractFileName, contractIdentifier, tokenName, tokenSymbol]);

  // Active Code Content based on selected tab
  const activeCodeContent = useMemo(() => {
    if (codeTab === "solidity") return generatedSolidityCode;
    if (codeTab === "hardhat") return generatedHardhatDeployScript;
    return generatedTerminalCommands;
  }, [codeTab, generatedSolidityCode, generatedHardhatDeployScript, generatedTerminalCommands]);

  // Handle Instant Invention Dispatch
  const handleInventAndInstantiate = () => {
    const isVanity = Math.random() > 0.4;
    const { address } = generateEVMAddress(isVanity, "777", true);
    const tokenId = generateUint256TokenId("decimal");

    const calculatedCap = supplyParadigm === "sovereign_macro"
      ? Math.max(3_000_000_000_000, Math.floor(numericSupply * numericPrice))
      : Math.min(Number.MAX_SAFE_INTEGER, Math.floor(numericSupply * numericPrice));

    const newRecord: TokenRecord = {
      id: `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      name: tokenName,
      symbol: tokenSymbol,
      chain: targetChain,
      networkId: targetChain === "ethereum" ? 1 : targetChain === "base" ? 8453 : 42161,
      contractAddress: address,
      isVanity,
      tokenId,
      tokenStandard,
      narrative: "quantum_defi",
      launchStatus: "Audited",
      initialSupply: displaySupplyString,
      decimals,
      marketCap: calculatedCap,
      priceUsd: numericPrice,
      liquidityPair: inventedLiquidityPair,
      liquidityPoolId: selectedPool.id,
      reserveShares: supplyParadigm === "sovereign_macro" ? reserveShares : undefined,
      treasuryShares: supplyParadigm === "sovereign_macro" ? treasuryShares : undefined,
      targetOwner: sovereignOwner,
      holderCount: Math.floor(Math.random() * 8000 + 500),
      auditFirm: "OpenZeppelin",
      securityScore: 98,
      createdAt: new Date().toISOString(),
      creationTx: "0x" + Math.random().toString(16).substring(2).padEnd(64, "f"),
      deployerAddress: "0x000000000000000000000000000000000000dEaD",
      quantum_entropy_signature: generateRandomHex(64),
    };

    if (onInventToken) {
      onInventToken([newRecord]);
      saveTokensToFirestore([newRecord]).catch(console.warn);
      setInventedSuccess(true);
      setTimeout(() => setInventedSuccess(false), 3500);
    }
  };

  // Send Current Generated Solidity Code to Remix Studio
  const handleSendCurrentToRemix = () => {
    if (onSendToRemix) {
      onSendToRemix(generatedSolidityCode, tokenName);
      setRemixSentSuccess(true);
      setTimeout(() => setRemixSentSuccess(false), 3500);
    }
  };

  // Multi-Invention Batch Generator across Paradigms & 509 Liquidity Pools
  const handleBatchInvent = async (count: number, mode: "diverse" | "paradigms" = "diverse") => {
    setIsBatchInventing(true);
    setBatchInventLog(`Forging ${count} multi-invention cryptocurrency records across paradigms & 509 liquidity pools...`);

    try {
      await new Promise((r) => setTimeout(r, 60));

      const PARADIGM_PRESETS = [
        { name: "Uncapped Continuous", paradigm: "uncapped", supply: "Continuous Uncapped (Up to 2^256 - 1)", numSupply: 1e9, price: 80077 },
        { name: "GigaSupply 900T Treasury", paradigm: "giga_900t", supply: "900,000,000,000,000 * 10^18", numSupply: 9e14, price: 100 },
        { name: "TokenFactory Endless Stream", paradigm: "giga_factory", supply: "Endless Stream (900T per instance)", numSupply: 9e14, price: 150 },
        { name: "Sovereign Treasury 9.9e21", paradigm: "sovereign_macro", supply: "9,900,000,000,000,000,000,000 (9e20 Reserve + 9e21 Treasury)", numSupply: 9.9e21, price: 3000 },
        { name: "Protocol Max 2^256-1", paradigm: "protocol_max", supply: `~1.15792 × 10^59 (${UINT256_MAX_18DEC_STRING})`, numSupply: 1.15792e59, price: 1.0 },
        { name: "Hyper Scale Septillion", paradigm: "septillion", supply: "1,000,000,000,000,000,000,000,000", numSupply: 1e24, price: 0.0001 },
        { name: "Bitcoin Standard 21M", paradigm: "btc_21m", supply: "21,000,000", numSupply: 21000000, price: 95000 },
        { name: "Macro 1 Trillion", paradigm: "fixed_1t", supply: "1,000,000,000,000", numSupply: 1e12, price: 42.50 },
        { name: "Sovereign Elastic", paradigm: "custom", supply: "500,000,000,000,000", numSupply: 5e14, price: 10.0 },
      ];

      const CHAINS: ChainType[] = [
        "ethereum", "base", "arbitrum", "solana", "polygon", "quantum", "cosmos", "bitcoin"
      ];

      const INVENTIONS_SEED = [
        { name: "✦ Autonomous AI Swarm Currency", symbol: "SWARM" },
        { name: "⏣ Quantum Zero-Knowledge Compute", symbol: "QZK" },
        { name: "⚡ Uncapped Continuous Liquid Credit", symbol: "UCLC" },
        { name: "🛡️ Sovereign Reserve & Macro Vault", symbol: "SRMV" },
        { name: "🌐 DePIN Orbital Sensor Mesh", symbol: "ORB" },
        { name: "⚛ HyperLiquid Layer-1 Arbitrage", symbol: "HLARB" },
        { name: "🜚 CometBFT Interchain Collateral", symbol: "IBC" },
        { name: "🌌 Photonic Neural Synthesis", symbol: "PNS" },
        { name: "💎 Dark Matter Gasless Credit", symbol: "DMGC" },
        { name: "🔥 EIP-7702 Delegation Token", symbol: "DEL7" },
        { name: "🚀 Septillion Micro-Gas Reactor", symbol: "MGR" },
        { name: "💠 2^256 Protocol Limit Asset", symbol: "PL256" },
        { name: "🪐 zkRollup Liquidity Router", symbol: "ZKLR" },
        { name: "💫 Cross-Chain ERC-6551 Account", symbol: "TBA" },
        { name: "✨ Self-Absorbing Quantum Glyphs", symbol: "SAQG" },
        { name: "🌟 Superluminal Settlement Coin", symbol: "SLSC" },
        { name: "🧬 Synthetic Genome Compute Bond", symbol: "SGCB" },
        { name: "🎯 Concentrated Liquidity Matrix", symbol: "CLM" },
        { name: "🔮 Algorithmic Debt Amortizer", symbol: "ADA" },
        { name: "🌿 Regenerative Carbon Oracle", symbol: "RCO" },
        { name: "⚡ High-Frequency Flash Liquidity", symbol: "HFFL" },
        { name: "🏛️ Sovereign Wealth Backstop", symbol: "SWB" },
        { name: "🛸 Interstellar Data Transit", symbol: "IDT" },
        { name: "❄️ Zero-Entropy State Anchor", symbol: "ZESA" },
        { name: "🌊 Deep Sea Sensor Telemetry", symbol: "DSST" },
      ];

      const batch: TokenRecord[] = [];

      for (let i = 0; i < count; i++) {
        const seed = INVENTIONS_SEED[i % INVENTIONS_SEED.length];
        const pPreset = mode === "paradigms"
          ? PARADIGM_PRESETS[i % PARADIGM_PRESETS.length]
          : PARADIGM_PRESETS[Math.floor(Math.random() * PARADIGM_PRESETS.length)];
        const chain = CHAINS[i % CHAINS.length];
        const poolIndex = (selectedPoolId + i * 19) % LIQUIDITY_POOLS_509.length;
        const pool = LIQUIDITY_POOLS_509[poolIndex] || LIQUIDITY_POOLS_509[0];
        const quoteAsset = pool.pair.split("/")[1] || "USDC";

        const isVanity = Math.random() > 0.3;
        const { address } = generateEVMAddress(isVanity, i % 2 === 0 ? "777" : "DEAD", true);
        const tokenId = generateUint256TokenId("decimal");
        const cap = pPreset.paradigm === "sovereign_macro"
          ? Math.max(3_000_000_000_000, Math.floor(pPreset.numSupply * pPreset.price))
          : Math.min(Number.MAX_SAFE_INTEGER, Math.floor(pPreset.numSupply * pPreset.price));

        const standard = i % 5 === 3 ? "ERC-721" : i % 5 === 4 ? "ERC-1155" : "ERC-20";
        const suffix = i >= INVENTIONS_SEED.length ? ` #${Math.floor(i / INVENTIONS_SEED.length) + 1}` : "";

        const record: TokenRecord = {
          id: `inv_batch_${Date.now().toString(36)}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          name: `${seed.name}${suffix}`,
          symbol: `${seed.symbol}${i >= INVENTIONS_SEED.length ? (i + 1) : ""}`,
          chain,
          networkId: chain === "ethereum" ? 1 : chain === "base" ? 8453 : chain === "arbitrum" ? 42161 : chain === "polygon" ? 137 : 10,
          contractAddress: address,
          isVanity,
          tokenId,
          tokenStandard: standard,
          narrative: (i % 4 === 0 ? "quantum_defi" : i % 4 === 1 ? "ai_agents" : i % 4 === 2 ? "depin_sensors" : "rwa") as any,
          launchStatus: "Audited",
          initialSupply: pPreset.supply,
          decimals: 18,
          marketCap: cap,
          priceUsd: pPreset.price,
          liquidityPair: `${seed.symbol}/${quoteAsset} [Pool #${pool.id}: ${pool.pair} via ${pool.dex}]`,
          liquidityPoolId: pool.id,
          reserveShares: pPreset.paradigm === "sovereign_macro" ? "900000000000000000000" : undefined,
          treasuryShares: pPreset.paradigm === "sovereign_macro" ? "9000000000000000000000" : undefined,
          targetOwner: sovereignOwner,
          holderCount: Math.floor(Math.random() * 9500 + 400),
          auditFirm: (i % 3 === 0 ? "OpenZeppelin" : i % 3 === 1 ? "Trail of Bits" : "CertiK") as any,
          securityScore: Math.floor(Math.random() * 6 + 94),
          createdAt: new Date().toISOString(),
          creationTx: "0x" + Math.random().toString(16).substring(2).padEnd(64, "e"),
          deployerAddress: "0x000000000000000000000000000000000000dEaD",
          quantum_entropy_signature: generateRandomHex(64),
        };
        batch.push(record);
      }

      if (onInventToken) {
        onInventToken(batch);
      }

      try {
        const saved = await saveTokensToFirestore(batch);
        setBatchInventLog(`✓ Successfully forged and deployed ${batch.length} multi-inventions (${saved} saved to Cloud Vault & Public Registry)!`);
      } catch {
        setBatchInventLog(`✓ Forged ${batch.length} multi-inventions into local workspace memory!`);
      }
    } catch (err: any) {
      setBatchInventLog(`Error forging batch: ${err.message}`);
    } finally {
      setIsBatchInventing(false);
    }
  };

  // Download Active Code
  const handleDownloadActiveCode = () => {
    const element = document.createElement("a");
    const file = new Blob([activeCodeContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    if (codeTab === "solidity") {
      element.download = contractFileName;
    } else if (codeTab === "hardhat") {
      element.download = "deploy.js";
    } else {
      element.download = "init_and_deploy.sh";
    }
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Hero Overview Card */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#1F1F23]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[#F27D26]">
                <Flame className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white uppercase tracking-tight font-mono">
                Maximum Protocol Limits & Economic Inventions Foundry
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold uppercase">
                2^256 - 1 Uncapped
              </span>
            </div>
            <p className="text-xs text-[#8E9299] max-w-3xl leading-relaxed">
              Architect and build novel cryptocurrencies pushed to the ultimate technical EVM protocol ceiling (<code className="text-purple-300 font-bold">uint256 Max = 2^256 - 1</code> or <code className="text-purple-300 font-bold">~1.15 × 10^77 raw units</code> / <code className="text-purple-300 font-bold">~1.15 × 10^59 tokens</code> at 18 decimals). Design uncapped continuous minting contracts that omit artificial caps, explore variable order book pricing up to <code className="text-green-400 font-bold">$80,077+</code> and Trillions per token, and benchmark against global circulating wealth.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-right">
              <span className="text-[10px] text-[#8E9299] block uppercase">EVM Integer Bitwidth</span>
              <span className="text-white font-bold">256 Bits (uint256)</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-right">
              <span className="text-[10px] text-[#8E9299] block uppercase">Solidity Standard</span>
              <span className="text-green-400 font-bold">Checked 0.8.24+</span>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 font-mono text-xs">
          {/* Pillar 1 */}
          <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[#8E9299]">
              <span className="text-[10px] uppercase font-bold text-purple-400">Pillar 1: Technical Limit</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-white font-bold text-sm">2^256 - 1 Protocol Max</div>
            <div className="text-[11px] text-[#8E9299]">
              Hardcoded EVM 32-byte storage limit. Exactly <span className="text-white">~1.15 × 10^77</span> atomic units (<span className="text-white">~1.15 × 10^59</span> tokens with 18 decimals).
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[#8E9299]">
              <span className="text-[10px] uppercase font-bold text-[#F27D26]">Pillar 2: Design Freedom</span>
              <Sliders className="w-4 h-4 text-[#F27D26]" />
            </div>
            <div className="text-white font-bold text-sm">Capped vs Uncapped</div>
            <div className="text-[11px] text-[#8E9299]">
              Developers can set 21M, 1T, or <span className="text-white">omit the cap entirely</span> to allow continuous, unlimited emissions up to the 256-bit protocol ceiling.
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[#8E9299]">
              <span className="text-[10px] uppercase font-bold text-green-400">Pillar 3: Price Dynamics</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-white font-bold text-sm">Economically Unlimited</div>
            <div className="text-[11px] text-[#8E9299]">
              Price is entirely determined by order book liquidity and market demand (<span className="text-white">$80,077+</span>, Trillions, or micro-cents).
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[#8E9299]">
              <span className="text-[10px] uppercase font-bold text-cyan-400">Pillar 4: Market Cap Reality</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-white font-bold text-sm">Circulating Wealth Limit</div>
            <div className="text-[11px] text-[#8E9299]">
              Theoretical cap = Supply × Price. In reality, market realization is bounded by total global liquidity (<span className="text-white">~$454T</span> total world wealth).
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Simulator Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Configuration & Economics (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Mint Limit & Supply Paradigm */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#F27D26]" />
                  <span>1. Mint Limit & Supply Architecture</span>
                </h3>
                <p className="text-[11px] text-[#8E9299] font-mono">
                  Select between capped designs (Bitcoin 21M, 1 Trillion, Septillion) or Uncapped Continuous Minting.
                </p>
              </div>
              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Solidity 0.8.24
              </span>
            </div>

            {/* Paradigms Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSupplyParadigm("uncapped")}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "uncapped"
                    ? "bg-purple-600/15 border-purple-500 text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-purple-400">No Cap (Design)</div>
                <div className="text-xs font-bold text-white mt-1">Uncapped Continuous</div>
                <div className="text-[10px] text-[#666] mt-0.5">Mints up to 2^256 - 1</div>
              </button>

              <button
                type="button"
                onClick={() => setSupplyParadigm("protocol_max")}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "protocol_max"
                    ? "bg-purple-600/15 border-purple-500 text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-purple-400">Technical Limit</div>
                <div className="text-xs font-bold text-white mt-1">2^256 - 1 Maximum</div>
                <div className="text-[10px] text-[#666] mt-0.5">~1.15 × 10^59 tokens</div>
              </button>

              <button
                type="button"
                onClick={() => setSupplyParadigm("btc_21m")}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "btc_21m"
                    ? "bg-[#F27D26]/15 border-[#F27D26] text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-[#F27D26]">Bitcoin Standard</div>
                <div className="text-xs font-bold text-white mt-1">21,000,000 Cap</div>
                <div className="text-[10px] text-[#666] mt-0.5">Fixed Scarcity Model</div>
              </button>

              <button
                type="button"
                onClick={() => setSupplyParadigm("fixed_1t")}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "fixed_1t"
                    ? "bg-[#F27D26]/15 border-[#F27D26] text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-[#F27D26]">Macro Supply</div>
                <div className="text-xs font-bold text-white mt-1">1 Trillion Cap</div>
                <div className="text-[10px] text-[#666] mt-0.5">1,000,000,000,000 units</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSupplyParadigm("giga_900t");
                  setDecimals(18);
                  setTokenName("GigaSupplyToken");
                  setTokenSymbol("GIGA");
                  setSovereignOwner("Mauro Lomibao Dar III");
                }}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "giga_900t"
                    ? "bg-purple-500/20 border-purple-500 text-white shadow-sm ring-1 ring-purple-500"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-purple-400">GigaSupply Treasury Standard</div>
                <div className="text-xs font-bold text-white mt-1">900 Trillion ($GIGA)</div>
                <div className="text-[10px] text-purple-300/80 mt-0.5">Mauro Lomibao Dar III Treasury Mint</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSupplyParadigm("giga_factory");
                  setDecimals(18);
                  setTokenName("TokenFactory");
                  setTokenSymbol("GIGA_STREAM");
                  setSovereignOwner("Mauro Lomibao Dar III");
                }}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "giga_factory"
                    ? "bg-amber-500/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-amber-400">TokenFactory Stream Deployer</div>
                <div className="text-xs font-bold text-white mt-1">Endless 900T Tokens</div>
                <div className="text-[10px] text-amber-300/80 mt-0.5">Mauro Lomibao Dar III Factory</div>
              </button>

              <button
                type="button"
                onClick={() => setSupplyParadigm("septillion")}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "septillion"
                    ? "bg-cyan-500/15 border-cyan-500 text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-cyan-400">Hyper Scale</div>
                <div className="text-xs font-bold text-white mt-1">1 Septillion (10^24)</div>
                <div className="text-[10px] text-[#666] mt-0.5">Global compute / micro-gas</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSupplyParadigm("sovereign_macro");
                  setDecimals(18);
                  setPricePreset("3000");
                  setCustomPriceInput("3000");
                }}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "sovereign_macro"
                    ? "bg-emerald-500/20 border-emerald-500 text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-emerald-400">Sovereign Treasury & Reserve</div>
                <div className="text-xs font-bold text-white mt-1">9.9e21 Total (18 Dec)</div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5">9e20 Reserve + 9e21 Treasury</div>
              </button>

              <button
                type="button"
                onClick={() => setSupplyParadigm("custom")}
                className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  supplyParadigm === "custom"
                    ? "bg-green-500/15 border-green-500 text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-green-400">Custom Design</div>
                <div className="text-xs font-bold text-white mt-1">Arbitrary Input</div>
                <div className="text-[10px] text-[#666] mt-0.5">Enter bespoke cap</div>
              </button>
            </div>

            {/* GigaSupplyToken 900T Treasury Configuration Panel */}
            {supplyParadigm === "giga_900t" && (
              <div className="p-3.5 bg-[#0A0A0C] border border-purple-500/40 rounded-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2">
                  <span className="text-purple-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    GigaSupplyToken Architecture (900 Trillion Initial Supply)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                    Treasury Mint Standard
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8E9299] block">Architect & Author:</label>
                    <div className="w-full bg-[#16161A] border border-[#1F1F23] rounded px-3 py-1.5 text-xs text-white">
                      Mauro Lomibao Dar III
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-purple-400 block">Designated Treasury Wallet:</label>
                    <div className="w-full bg-[#16161A] border border-purple-500/30 rounded px-3 py-1.5 text-xs text-purple-300 font-mono select-all">
                      0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-emerald-400 block">Total Target Supply (uint256, 18 Dec):</label>
                    <div className="w-full bg-[#16161A] border border-emerald-500/40 rounded px-3 py-1.5 text-xs text-emerald-300">
                      900,000,000,000,000 * 10**18 (900 Trillion)
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-cyan-400 block">Genesis Mint Behavior:</label>
                    <div className="w-full bg-[#16161A] border border-cyan-500/40 rounded px-3 py-1.5 text-xs text-cyan-300">
                      Entire supply automatically minted to Treasury in constructor
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TokenFactory Endless Stream Configuration Panel */}
            {supplyParadigm === "giga_factory" && (
              <div className="p-3.5 bg-[#0A0A0C] border border-amber-500/40 rounded-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    TokenFactory Protocol Architecture (Endless Stream Factory)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      Deployed 0xf8e81D47203A594245E36C48e151709F0C19fBe8
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                      Factory Registry
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8E9299] block">Architect & Sovereign Author:</label>
                    <div className="w-full bg-[#16161A] border border-[#1F1F23] rounded px-3 py-1.5 text-xs text-white">
                      Mauro Lomibao Dar III
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-amber-400 block">Auto-Routing Treasury Address:</label>
                    <div className="w-full bg-[#16161A] border border-amber-500/30 rounded px-3 py-1.5 text-xs text-amber-300 font-mono select-all">
                      0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-emerald-400 block">Factory Dispatch Function:</label>
                    <div className="w-full bg-[#16161A] border border-emerald-500/40 rounded px-3 py-1.5 text-xs text-emerald-300">
                      generateNewToken(string name, string symbol)
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-cyan-400 block">On-Chain Registry Storage:</label>
                    <div className="w-full bg-[#16161A] border border-cyan-500/40 rounded px-3 py-1.5 text-xs text-cyan-300">
                      deployedTokensRegistry[] • Endless dynamically tracked contracts
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sovereign Reserve & Treasury Configuration Panel */}
            {supplyParadigm === "sovereign_macro" && (
              <div className="p-3.5 bg-[#0A0A0C] border border-emerald-500/30 rounded-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Sovereign Tokenomics Protocol (uint256 with 18 Decimals)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    Active Architecture
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8E9299] block">Authorized Protocol Owner:</label>
                    <input
                      type="text"
                      value={sovereignOwner}
                      onChange={(e) => setSovereignOwner(e.target.value)}
                      className="w-full bg-[#16161A] border border-[#1F1F23] rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8E9299] block">CoinMarketCap Target Cap:</label>
                    <div className="w-full bg-[#16161A] border border-amber-500/30 rounded px-3 py-1.5 text-xs text-amber-300 font-bold">
                      &gt;= $3,000,000,000,000 USD ($3.00T+)
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-emerald-400 block">Reserve Allocation (uint256, 18 Dec):</label>
                    <input
                      type="text"
                      value={reserveShares}
                      onChange={(e) => setReserveShares(e.target.value)}
                      className="w-full bg-[#16161A] border border-emerald-500/40 rounded px-3 py-1.5 text-xs text-emerald-300"
                    />
                    <span className="text-[10px] text-[#666]">900,000,000,000,000,000,000 (9e20 units)</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-cyan-400 block">Treasury Allocation (uint256, 18 Dec):</label>
                    <input
                      type="text"
                      value={treasuryShares}
                      onChange={(e) => setTreasuryShares(e.target.value)}
                      className="w-full bg-[#16161A] border border-cyan-500/40 rounded px-3 py-1.5 text-xs text-cyan-300"
                    />
                    <span className="text-[10px] text-[#666]">9,000,000,000,000,000,000,000 (9e21 units)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Supply Input if selected */}
            {supplyParadigm === "custom" && (
              <div className="p-3 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg space-y-1.5">
                <label className="text-[11px] font-mono text-[#8E9299]">Custom Supply Amount:</label>
                <input
                  type="text"
                  value={customSupplyInput}
                  onChange={(e) => setCustomSupplyInput(e.target.value)}
                  placeholder="e.g. 500000000000"
                  className="w-full bg-[#16161A] border border-[#1F1F23] rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            )}

            {/* Decimals Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs font-mono text-[#8E9299]">
              <span className="text-[11px]">Token Decimals:</span>
              <div className="flex items-center gap-1.5">
                {[18, 9, 6, 0].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDecimals(d)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                      decimals === d
                        ? "bg-[#F27D26] text-black font-bold"
                        : "bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    {d} Decimals {d === 18 ? "(EVM Std)" : d === 6 ? "(USDC)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Protocol Math Verification Box */}
            <div className="p-3 rounded-lg bg-[#0A0A0C] border border-purple-500/20 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-purple-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-purple-400" />
                  <span>Exact EVM 256-Bit Calculation:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(UINT256_MAX_STRING, "exact_uint256")}
                  className="text-[10px] text-[#8E9299] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === "exact_uint256" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy 78-Digit Max</span>
                </button>
              </div>
              <p className="text-[11px] text-[#AAA] break-all">
                <span className="text-white font-bold">2^256 - 1:</span> {UINT256_MAX_STRING}
              </p>
              <div className="text-[10px] text-[#777] pt-1">
                At {decimals} decimals, maximum displayable tokens before overflow ={" "}
                <span className="text-purple-300 font-bold">
                  {decimals === 18 ? "~1.157920892373161954 × 10^59" : `~1.15792 × 10^${77 - decimals}`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Variable Token Price (Order Book Liquidity) */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span>2. Variable Price per Token (Order Book Liquidity)</span>
                </h3>
                <p className="text-[11px] text-[#8E9299] font-mono">
                  Economically unlimited in theory; tested across variable price regimes from micro-cents to $80,077 and Trillions.
                </p>
              </div>
              <span className="text-[10px] font-mono text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                Order Book Depth
              </span>
            </div>

            {/* Price Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setPricePreset("0.0001");
                  setCustomPriceInput("0.0001");
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  customPriceInput === "0.0001"
                    ? "bg-green-500/15 border-green-500 text-white"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] text-[#8E9299]">Micro-Cent DePIN</div>
                <div className="text-xs font-bold text-white">$0.0001</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricePreset("45");
                  setCustomPriceInput("45");
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  customPriceInput === "45"
                    ? "bg-green-500/15 border-green-500 text-white"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] text-[#8E9299]">Standard TGE Market</div>
                <div className="text-xs font-bold text-white">$45.00</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricePreset("80077");
                  setCustomPriceInput("80077");
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  customPriceInput === "80077"
                    ? "bg-green-500/20 border-green-400 text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] text-green-400 font-bold uppercase">Target Order Book</div>
                <div className="text-xs font-bold text-white">$80,077.00</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricePreset("1000000");
                  setCustomPriceInput("1000000");
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  customPriceInput === "1000000"
                    ? "bg-green-500/15 border-green-500 text-white"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] text-[#8E9299]">Super-Asset</div>
                <div className="text-xs font-bold text-white">$1,000,000</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricePreset("3000");
                  setCustomPriceInput("3000");
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer sm:col-span-2 ${
                  customPriceInput === "3000"
                    ? "bg-amber-500/20 border-amber-400 text-white shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] text-amber-400 font-bold uppercase">CoinMarketCap Target: $3.00 Trillion ($3,000 / token)</div>
                <div className="text-xs font-bold text-white">$3,000.00 / token (&gt;= $3.00T Macro Market Cap)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricePreset("1000000000000");
                  setCustomPriceInput("1000000000000");
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer sm:col-span-2 ${
                  customPriceInput === "1000000000000"
                    ? "bg-cyan-500/15 border-cyan-500 text-white"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] text-cyan-400 font-bold uppercase">Trillion Liquidity ($1T / token)</div>
                <div className="text-xs font-bold text-white">$1,000,000,000,000.00</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricePreset("80077000000000");
                  setCustomPriceInput("80077000000000");
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer sm:col-span-2 ${
                  customPriceInput === "80077000000000"
                    ? "bg-purple-500/15 border-purple-500 text-white"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="text-[10px] text-purple-400 font-bold uppercase">Trillions Scale ($80.077T / token)</div>
                <div className="text-xs font-bold text-white">$80,077,000,000,000.00</div>
              </button>
            </div>

            {/* Custom Variable Price Field */}
            <div className="space-y-1.5 font-mono text-xs">
              <label className="text-[11px] text-[#8E9299]">Custom Variable Price (USD):</label>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold text-sm">$</span>
                <input
                  type="text"
                  value={customPriceInput}
                  onChange={(e) => setCustomPriceInput(e.target.value)}
                  placeholder="80077"
                  className="flex-1 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Token Metadata & Quick Instantiation */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
              <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F27D26]" />
                <span>3. Token Identity & Chain Destination</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Active Foundry
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-[#8E9299] uppercase">Token Name</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#8E9299] uppercase">Symbol</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#8E9299] uppercase">Target EVM Chain</label>
                <select
                  value={targetChain}
                  onChange={(e) => setTargetChain(e.target.value as ChainType)}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-1.5 text-xs text-white cursor-pointer"
                >
                  <option value="ethereum">Ethereum Mainnet (ID: 1)</option>
                  <option value="base">Base (ID: 8453)</option>
                  <option value="arbitrum">Arbitrum One (ID: 42161)</option>
                  <option value="polygon">Polygon POS (ID: 137)</option>
                  <option value="quantum">Quantum-Hybrid (ID: 7777)</option>
                </select>
              </div>
            </div>

            {/* Token Standard & Dynamic Minting Protocol Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] text-[#8E9299] uppercase font-mono">Token Standard & Minting Architecture</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTokenStandard("ERC-20")}
                  className={`p-2 rounded border text-left font-mono text-xs transition-all cursor-pointer ${
                    tokenStandard === "ERC-20"
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-sm"
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                  }`}
                >
                  <div className="text-[10px] text-purple-400 font-bold">ERC-20</div>
                  <div className="text-[11px] font-bold text-white">Uncapped ERC20</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTokenStandard("ERC-721")}
                  className={`p-2 rounded border text-left font-mono text-xs transition-all cursor-pointer ${
                    tokenStandard === "ERC-721"
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-sm"
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                  }`}
                >
                  <div className="text-[10px] text-purple-400 font-bold">ERC-721</div>
                  <div className="text-[11px] font-bold text-white">DynamicERC721</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTokenStandard("ERC-1155")}
                  className={`p-2 rounded border text-left font-mono text-xs transition-all cursor-pointer ${
                    tokenStandard === "ERC-1155"
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-sm"
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                  }`}
                >
                  <div className="text-[10px] text-purple-400 font-bold">ERC-1155</div>
                  <div className="text-[11px] font-bold text-white">UncappedERC1155</div>
                </button>
              </div>
            </div>

            {/* Section 4: Liquidity Pool Pair & AMM Orchestration (509 Pairs Across 11 Ecosystems) */}
            <div className="pt-3 border-t border-[#1F1F23] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-[#8E9299] uppercase font-mono flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white font-bold">4. Liquidity Pool Pair & AMM Orchestrator</span>
                </label>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                  509 Pairs Available
                </span>
              </div>

              {/* Selected Pool Overview Badge */}
              <div className="p-3 rounded-lg bg-[#0A0A0C] border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                      #{selectedPool.id}
                    </span>
                    <span>{inventedLiquidityPair}</span>
                  </span>
                  <span className="text-[#8E9299] text-[10px]">
                    {selectedPool.dex} • {selectedPool.chain}
                  </span>
                </div>
                <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
                  <span>Ecosystem: <strong className="text-white">{selectedPool.category}</strong></span>
                  <span className="text-cyan-400 font-mono">AMM Pair: {selectedPool.pair}</span>
                </div>
              </div>

              {/* Pair Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setPairMode("pair_token")}
                  className={`p-2 rounded border text-left transition-all cursor-pointer ${
                    pairMode === "pair_token"
                      ? "bg-emerald-500/15 border-emerald-500 text-white"
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                  }`}
                >
                  <div className="text-[10px] text-emerald-400 font-bold">Pair Token with Quote</div>
                  <div className="text-[11px] text-white truncate font-bold">
                    {tokenSymbol}/{selectedPool.pair.split("/")[1] || "USDC"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPairMode("bind_pool")}
                  className={`p-2 rounded border text-left transition-all cursor-pointer ${
                    pairMode === "bind_pool"
                      ? "bg-emerald-500/15 border-emerald-500 text-white"
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                  }`}
                >
                  <div className="text-[10px] text-emerald-400 font-bold">Direct Pool Binding</div>
                  <div className="text-[11px] text-white truncate font-bold">
                    {selectedPool.pair} ({selectedPool.dex})
                  </div>
                </button>
              </div>

              {/* Ecosystem Category Filter Pills */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#8E9299] uppercase font-mono">
                  Filter Ecosystem (11 Blockchain Categories):
                </label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setPoolCategoryFilter("all")}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer ${
                      poolCategoryFilter === "all"
                        ? "bg-emerald-500 text-black font-bold"
                        : "bg-[#0A0A0C] text-[#8E9299] hover:text-white border border-[#1F1F23]"
                    }`}
                  >
                    All 509
                  </button>
                  {LIQUIDITY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setPoolCategoryFilter(cat.key)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer flex items-center gap-1 ${
                        poolCategoryFilter === cat.key
                          ? "bg-emerald-500 text-black font-bold"
                          : "bg-[#0A0A0C] text-[#8E9299] hover:text-white border border-[#1F1F23]"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className="text-[9px] opacity-70">({cat.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pool Search & Dropdown Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={poolSearchQuery}
                    onChange={(e) => setPoolSearchQuery(e.target.value)}
                    placeholder="Search 509 pools (e.g. AERO, SOL, 3CRV, Raydium, #61)..."
                    className="flex-1 bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#5A5E66] font-mono focus:outline-none focus:border-emerald-500"
                  />
                  {poolSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPoolSearchQuery("")}
                      className="text-[10px] text-[#8E9299] hover:text-white font-mono px-1.5 py-1 rounded bg-[#0A0A0C] border border-[#1F1F23]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <select
                  value={selectedPoolId}
                  onChange={(e) => setSelectedPoolId(Number(e.target.value))}
                  className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded px-2.5 py-2 text-xs text-white font-mono cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  {filteredPoolsForEngine.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} | {p.pair} ({p.dex} • {p.chain})
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-[#8E9299] flex justify-between font-mono">
                  <span>Matching Pools: <strong className="text-white">{filteredPoolsForEngine.length}</strong> / 509</span>
                  <span className="text-emerald-400">AMM Router Ready</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                id="btn-invent-token-workspace"
                type="button"
                onClick={handleInventAndInstantiate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-lg shadow-orange-600/20 active:scale-95"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Invent & Instantiate Token</span>
              </button>

              <button
                id="btn-send-to-remix"
                type="button"
                onClick={handleSendCurrentToRemix}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 font-mono font-bold text-xs transition-all cursor-pointer active:scale-95"
                title="Send active Solidity contract directly to Remix 2.5.4 Studio"
              >
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Open in Remix Studio</span>
              </button>

              <button
                id="btn-download-code-engine"
                type="button"
                onClick={handleDownloadActiveCode}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1A1A20] border border-[#1F1F23] text-white font-mono text-xs transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {codeTab === "solidity" ? contractFileName : codeTab === "hardhat" ? "deploy.js" : ".sh"}</span>
              </button>

              {onNavigateTab && (
                <>
                  <button
                    id="btn-view-public-registry"
                    type="button"
                    onClick={() => onNavigateTab("public_registry")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-xs cursor-pointer transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Public Registry</span>
                  </button>

                  <button
                    id="btn-view-liquidity-pools"
                    type="button"
                    onClick={() => onNavigateTab("liquidity_pools")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-xs cursor-pointer transition-all"
                  >
                    <Globe className="w-3 h-3" />
                    <span>509 Pools</span>
                  </button>
                </>
              )}

              {inventedSuccess && (
                <span className="flex items-center gap-1 text-xs font-mono text-green-400 animate-fade-in font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Token instantiated into Foundry & Vault!</span>
                </span>
              )}

              {remixSentSuccess && (
                <span className="flex items-center gap-1 text-xs font-mono text-purple-400 animate-fade-in font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Transferred to Remix Studio!</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Market Cap & Circulating Wealth Benchmark (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Market Cap Reality Card */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>4. Market Cap & Circulating Wealth Simulator</span>
                </h3>
                <p className="text-[11px] text-[#8E9299] font-mono">
                  Market Cap = Circulating Supply × Price per Token
                </p>
              </div>
            </div>

            {/* Live Calculation Display */}
            <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] space-y-3 font-mono">
              <div className="text-[11px] text-[#8E9299]">Simulated Market Capitalization:</div>
              <div className="text-xl sm:text-2xl font-bold text-green-400 break-words">
                {marketCapFormatted}
              </div>
              <div className="text-[10px] text-[#8E9299] flex items-center justify-between pt-1 border-t border-[#1F1F23]">
                <span>Scientific Notation:</span>
                <span className="text-white font-bold">{marketCapScientific} USD</span>
              </div>
              <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
                <span>Effective Supply:</span>
                <span className="text-[#AAA]">{displaySupplyString}</span>
              </div>
              <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
                <span>Marginal Price:</span>
                <span className="text-green-400 font-bold">${numericPrice.toLocaleString()} USD</span>
              </div>
            </div>

            {/* Global Wealth Benchmark Reality Check */}
            <div className="space-y-2.5 font-mono text-xs">
              <div className="text-[11px] font-bold text-white uppercase flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Macroeconomic Absorption Reality:</span>
              </div>
              <p className="text-[11px] text-[#8E9299] leading-relaxed">
                While EVM code and mathematical order books place zero ceiling on market cap, real-world redemption is bounded by total global liquidity:
              </p>

              <div className="space-y-2 pt-1">
                {/* Global Benchmark 1: Crypto */}
                <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#8E9299]">Total Global Crypto Cap</div>
                    <div className="text-xs font-bold text-white">$3.0 Trillion</div>
                  </div>
                  <span className="text-[10px] text-[#8E9299]">
                    {globalWealthRatio < 0.001 ? "Fraction of Crypto" : `${(numericSupply * numericPrice / 3e12).toFixed(1)}x Total Crypto`}
                  </span>
                </div>

                {/* Global Benchmark 2: US M2 */}
                <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#8E9299]">US M2 Money Supply</div>
                    <div className="text-xs font-bold text-white">$21.4 Trillion</div>
                  </div>
                  <span className="text-[10px] text-[#8E9299]">
                    {(numericSupply * numericPrice / 21.4e12).toFixed(1)}x US M2
                  </span>
                </div>

                {/* Global Benchmark 3: Total World Wealth */}
                <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-cyan-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-cyan-400 font-bold">Total Global Wealth (All Assets)</div>
                    <div className="text-xs font-bold text-white">$454.0 Trillion</div>
                  </div>
                  <span className="text-xs font-bold text-cyan-400">
                    {globalWealthRatio >= 1 ? `${globalWealthRatio.toFixed(2)}x Earth Wealth` : `${(globalWealthRatio * 100).toFixed(2)}% of Earth`}
                  </span>
                </div>

                {/* Global Benchmark 4: Derivatives Notionals */}
                <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#8E9299]">Global Derivatives Notional</div>
                    <div className="text-xs font-bold text-white">$1.0 Quadrillion ($1,000T)</div>
                  </div>
                  <span className="text-[10px] text-[#8E9299]">
                    {(numericSupply * numericPrice / 1e15).toFixed(1)}x Derivatives
                  </span>
                </div>
              </div>

              {/* Slippage & Order Book Depth Notice */}
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                <div>
                  <span className="font-bold">Economic Reality Insight:</span> A token trading at $80,077 with uncapped or septillion supply creates an astronomical face-value market cap on paper. However, order books only clear as much wealth as actual buyers bid in liquidity pools.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MULTI-INVENTION SUITE: BATCH FORGER & SOVEREIGN PARADIGM MATRIX       */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-br from-[#181822] via-[#12121A] to-[#0A0A0E] border border-orange-500/30 rounded-xl p-5 shadow-2xl space-y-4 font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1F1F23]">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Multi-Invention Engine: Batch Synthesis & Sovereign Matrix
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                Multi-App Ecosystem
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299] mt-1">
              Synthesize and deploy multi-token invention suites across all 7 supply paradigms, multi-chains, and the 509 paired liquidity pools catalogue in one click.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8E9299]">Batch Count:</span>
            <input
              type="number"
              min={1}
              max={50}
              value={batchCountInput}
              onChange={(e) => setBatchCountInput(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-16 px-2 py-1 rounded bg-[#0A0A0C] border border-[#2F2F38] text-white text-xs font-bold text-center focus:outline-none focus:border-orange-500"
            />
            <button
              id="btn-batch-custom-forge"
              type="button"
              disabled={isBatchInventing}
              onClick={() => handleBatchInvent(batchCountInput, "diverse")}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95"
            >
              {isBatchInventing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Forge {batchCountInput} Inventions</span>
            </button>
          </div>
        </div>

        {/* Multi-Invention Quick Action Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            id="btn-forge-10-inventions"
            type="button"
            disabled={isBatchInventing}
            onClick={() => handleBatchInvent(10, "diverse")}
            className="p-3.5 rounded-lg bg-[#0E0E12] hover:bg-[#16161E] border border-orange-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-orange-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span>Forge 10 Inventions</span>
              </span>
              <span className="text-[10px] text-orange-400 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded">
                10 Tokens
              </span>
            </div>
            <p className="text-[10px] text-[#8E9299] mt-1.5 leading-relaxed">
              Synthesizes 10 varied cryptocurrency inventions with paired 509 liquidity pools and vanity EVM contracts.
            </p>
          </button>

          <button
            id="btn-forge-25-inventions"
            type="button"
            disabled={isBatchInventing}
            onClick={() => handleBatchInvent(25, "diverse")}
            className="p-3.5 rounded-lg bg-[#0E0E12] hover:bg-[#16161E] border border-purple-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Forge 25 Inventions Suite</span>
              </span>
              <span className="text-[10px] text-purple-300 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">
                25 Tokens
              </span>
            </div>
            <p className="text-[10px] text-[#8E9299] mt-1.5 leading-relaxed">
              Spans 9 mainnets (Ethereum, Base, Solana, Arbitrum, Monad) with quantum numerals and multi-standard tokens.
            </p>
          </button>

          <button
            id="btn-forge-7-paradigms-matrix"
            type="button"
            disabled={isBatchInventing}
            onClick={() => handleBatchInvent(7, "paradigms")}
            className="p-3.5 rounded-lg bg-[#0E0E12] hover:bg-[#16161E] border border-emerald-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-emerald-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>7-Paradigm Sovereign Matrix</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                7 Paradigms
              </span>
            </div>
            <p className="text-[10px] text-[#8E9299] mt-1.5 leading-relaxed">
              Forges exactly 1 token for each supply model: Uncapped, 2^256-1, 21M BTC, 1T Macro, Septillion, and Sovereign 9e20/9e21.
            </p>
          </button>

          <button
            id="btn-forge-50-enterprise"
            type="button"
            disabled={isBatchInventing}
            onClick={() => handleBatchInvent(50, "diverse")}
            className="p-3.5 rounded-lg bg-[#0E0E12] hover:bg-[#16161E] border border-cyan-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Forge 50 Mega-Suite</span>
              </span>
              <span className="text-[10px] text-cyan-300 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
                50 Tokens
              </span>
            </div>
            <p className="text-[10px] text-[#8E9299] mt-1.5 leading-relaxed">
              Full enterprise spectrum across 509 liquidity pool catalogue with complete Firestore vault synchronization.
            </p>
          </button>
        </div>

        {/* Batch Status Notification Log */}
        {batchInventLog && (
          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-emerald-500/30 text-emerald-400 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isBatchInventing ? (
                <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>{batchInventLog}</span>
            </div>

            {onNavigateTab && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab("public_registry")}
                  className="text-[10px] text-cyan-300 hover:text-white px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 cursor-pointer"
                >
                  View in Public Registry →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("liquidity_pools")}
                  className="text-[10px] text-emerald-300 hover:text-white px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 cursor-pointer"
                >
                  View in 509 Pools →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-Width Multi-Tab Code & Terminal Deployment Inspector */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl font-mono text-xs">
        <div className="bg-[#0E0E10] px-4 py-3 border-b border-[#1F1F23] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCodeTab("solidity")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
                codeTab === "solidity"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500 shadow-sm"
                  : "text-[#8E9299] hover:text-white bg-[#0A0A0C] border border-[#1F1F23]"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Solidity ({contractFileName})</span>
            </button>
            <button
              type="button"
              onClick={() => setCodeTab("hardhat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
                codeTab === "hardhat"
                  ? "bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26] shadow-sm"
                  : "text-[#8E9299] hover:text-white bg-[#0A0A0C] border border-[#1F1F23]"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Hardhat (scripts/deploy.js)</span>
            </button>
            <button
              type="button"
              onClick={() => setCodeTab("foundry_cli")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
                codeTab === "foundry_cli"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500 shadow-sm"
                  : "text-[#8E9299] hover:text-white bg-[#0A0A0C] border border-[#1F1F23]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>CLI Terminal & Forge</span>
            </button>
            <button
              type="button"
              onClick={() => setCodeTab("simulator")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
                codeTab === "simulator"
                  ? "bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26] shadow-sm"
                  : "text-[#8E9299] hover:text-white bg-[#0A0A0C] border border-[#1F1F23]"
              }`}
            >
              <Gauge className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Deployment Simulator</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8E9299] px-2 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23] hidden md:inline">
              {tokenStandard} • {supplyParadigm === "uncapped" ? "Uncapped Continuous" : `Capped (${supplyParadigm})`}
            </span>
            {codeTab !== "simulator" && (
              <>
                {codeTab === "solidity" && onSendToRemix && (
                  <button
                    id="btn-code-header-remix"
                    type="button"
                    onClick={handleSendCurrentToRemix}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 cursor-pointer transition-all"
                    title="Send active contract directly to Remix IDE"
                  >
                    <Code2 className="w-3.5 h-3.5 text-purple-300" />
                    <span>Remix Studio</span>
                  </button>
                )}
                <button
                  id="btn-code-copy"
                  type="button"
                  onClick={() => handleCopy(activeCodeContent, `code_${codeTab}`)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0A0A0C] hover:bg-[#1A1A20] border border-[#1F1F23] text-white cursor-pointer transition-all"
                >
                  {copiedKey === `code_${codeTab}` ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                  )}
                  <span>Copy</span>
                </button>
                <button
                  id="btn-code-download"
                  type="button"
                  onClick={handleDownloadActiveCode}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Code or Simulator Content */}
        {codeTab === "simulator" ? (
          <div className="p-4 bg-[#0A0A0C]">
            <DeploymentSimulator tokens={[currentConfiguredToken]} />
          </div>
        ) : (
          <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed text-[#D4D4D4] bg-[#0A0A0C] max-h-[420px] overflow-y-auto">
            <code>{activeCodeContent}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
