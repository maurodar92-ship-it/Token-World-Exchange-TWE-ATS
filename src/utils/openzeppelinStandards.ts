/**
 * OpenZeppelin v5.0 Standard Contract Reference Implementations
 * For pre-deployment contract diffing and security audits.
 */

export interface OpenZeppelinStandardPreset {
  id: string;
  name: string;
  category: "ERC-20" | "ERC-721" | "ERC-1155" | "Security" | "Factory";
  version: string;
  filePath: string;
  description: string;
  keyFeatures: string[];
  code: string;
}

export const OPENZEPPELIN_PRESETS: OpenZeppelinStandardPreset[] = [
  {
    id: "oz_erc20_standard",
    name: "OpenZeppelin ERC-20 (Base Spec v5.0)",
    category: "ERC-20",
    version: "v5.0.2",
    filePath: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
    description: "Canonical OpenZeppelin v5.0.2 ERC-20 base implementation conforming strictly to EIP-20 and EIP-6093 custom error standard.",
    keyFeatures: [
      "EIP-20 Interface Compliance",
      "EIP-6093 Custom Error Reverts (ERC20InvalidSender, etc.)",
      "Internal _update hook pattern (v5.0 architecture)",
      "Unchecked gas optimizations for balance arithmetic",
      "Decimals standard (18)",
    ],
    code: `// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.20;

import {IERC20} from "./IERC20.sol";
import {IERC20Metadata} from "./extensions/IERC20Metadata.sol";
import {Context} from "../../utils/Context.sol";
import {IERC20Errors} from "../../interfaces/draft-IERC6093.sol";

/**
 * @dev Implementation of the {IERC20} interface.
 * Standard OpenZeppelin ERC-20 implementation with basic transfers and allowances.
 */
contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {
    mapping(address account => uint256) private _balances;
    mapping(address account => mapping(address spender => uint256)) private _allowances;

    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(from, to, value);
    }

    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) {
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) {
                revert ERC20InsufficientBalance(from, fromBalance, value);
            }
            unchecked {
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                _totalSupply -= value;
            }
        } else {
            unchecked {
                _balances[to] += value;
            }
        }

        emit Transfer(from, to, value);
    }

    function _mint(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(address(0), account, value);
    }

    function _burn(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        _update(account, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(owner, spender, value);
        }
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }
}`,
  },
  {
    id: "oz_erc20_ownable2step_permit",
    name: "OpenZeppelin ERC-20 + Ownable2Step + Permit (EIP-2612)",
    category: "ERC-20",
    version: "v5.0.2",
    filePath: "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol",
    description: "Production-grade institutional token implementation pairing OpenZeppelin ERC20 with Ownable2Step governance and EIP-2612 gasless permits.",
    keyFeatures: [
      "EIP-2612 Permit for 1-click gasless approvals",
      "Two-Step Ownership Transfer (Ownable2Step prevents accidental burning)",
      "Fixed MAX_SUPPLY Cap",
      "OpenZeppelin v5.0 Module Compatibility",
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title StandardERC20PermitReference
 * @notice OpenZeppelin v5.0 Reference Token with EIP-2612 Gasless Signatures & Ownable2Step
 */
contract StandardERC20PermitReference is ERC20, ERC20Permit, Ownable2Step {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    event MintAllocation(address indexed to, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner
    ) ERC20(name_, symbol_) ERC20Permit(name_) Ownable(initialOwner) {
        _mint(initialOwner, MAX_SUPPLY);
        emit MintAllocation(initialOwner, MAX_SUPPLY);
    }
}`,
  },
  {
    id: "oz_erc20_enterprise",
    name: "OpenZeppelin ERC-20 Enterprise (Burnable + Pausable + Ownable2Step)",
    category: "ERC-20",
    version: "v5.0.2",
    filePath: "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol",
    description: "Enterprise compliance token with emergency circuit breaker pause capabilities, token burning, and two-step multisig ownership.",
    keyFeatures: [
      "ERC20Pausable emergency halting",
      "ERC20Burnable deflationary mechanism",
      "Ownable2Step governance safe transfers",
      "v5.0 _update super override pattern",
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title EnterpriseTokenSpecification
 * @notice Canonical OpenZeppelin Reference for Institutional Pausable & Burnable ERC-20
 */
contract EnterpriseTokenSpecification is ERC20, ERC20Burnable, ERC20Pausable, Ownable2Step {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    event EmergencyStatusChanged(bool isPaused, address indexed authority);

    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner
    ) ERC20(name_, symbol_) Ownable(initialOwner) {
        _mint(initialOwner, MAX_SUPPLY);
    }

    function pause() external onlyOwner {
        _pause();
        emit EmergencyStatusChanged(true, msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit EmergencyStatusChanged(false, msg.sender);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}`,
  },
  {
    id: "oz_erc721_standard",
    name: "OpenZeppelin ERC-721 (Non-Fungible Token v5.0)",
    category: "ERC-721",
    version: "v5.0.2",
    filePath: "@openzeppelin/contracts/token/ERC721/ERC721.sol",
    description: "Standard OpenZeppelin v5.0 Non-Fungible Token with Ownable administrative controls and metadata resolution.",
    keyFeatures: [
      "EIP-721 Standard Compliance",
      "Safe Transfer Verification (IERC721Receiver check)",
      "OpenZeppelin v5.0 _requireOwned & _update patterns",
      "EIP-165 Interface Detection",
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StandardERC721Reference
 * @notice Canonical OpenZeppelin v5.0 NFT Smart Contract
 */
contract StandardERC721Reference is ERC721, Ownable {
    uint256 private _nextTokenId;
    string public baseTokenURI;

    event TokenMinted(address indexed to, uint256 indexed tokenId);
    event BaseURIUpdated(string newURI);

    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner,
        string memory initialBaseURI_
    ) ERC721(name_, symbol_) Ownable(initialOwner) {
        baseTokenURI = initialBaseURI_;
    }

    function safeMint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        emit TokenMinted(to, tokenId);
        return tokenId;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseURI(string memory newURI) external onlyOwner {
        baseTokenURI = newURI;
        emit BaseURIUpdated(newURI);
    }
}`,
  },
  {
    id: "oz_erc1155_standard",
    name: "OpenZeppelin ERC-1155 (Multi-Token Semi-Fungible v5.0)",
    category: "ERC-1155",
    version: "v5.0.2",
    filePath: "@openzeppelin/contracts/token/ERC1155/ERC1155.sol",
    description: "Standard OpenZeppelin v5.0 Multi-Token Standard for batch transfers, compute quotas, and semi-fungibles.",
    keyFeatures: [
      "EIP-1155 Batch Transfers",
      "Multi-ID Balance Queries in Single Call",
      "URI Template Resolution",
      "Ownable2Step Governance",
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title StandardERC1155Reference
 * @notice OpenZeppelin v5.0 Multi-Token Smart Contract Architecture
 */
contract StandardERC1155Reference is ERC1155, Ownable2Step {
    string public name;
    string public symbol;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_,
        address initialOwner
    ) ERC1155(uri_) Ownable(initialOwner) {
        name = name_;
        symbol = symbol_;
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyOwner {
        _mint(to, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}`,
  },
  {
    id: "giga_supply_token_900t",
    name: "GigaSupplyToken (900 Trillion Treasury Mint)",
    category: "ERC-20",
    version: "v5.0.2",
    filePath: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
    description: "Architected by Mauro Lomibao Dar III. Standard ERC20 token with 900 Trillion initial supply automatically minted directly to the designated Treasury Wallet (0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D).",
    keyFeatures: [
      "900,000,000,000,000 * 10**18 Target Supply",
      "Designated Treasury: 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D",
      "OpenZeppelin v5 ERC20 + Ownable Standard",
      "Single Genesis Mint Transaction directly to Treasury",
      "Solidity 0.8.20 Compliant",
    ],
    code: `// SPDX-License-Identifier: MIT
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
}`,
  },
  {
    id: "token_factory_giga_stream",
    name: "TokenFactory (Endless GigaSupplyToken Factory)",
    category: "Factory",
    version: "v5.0.2",
    filePath: "contracts/TokenFactory.sol",
    description: "Architected by Mauro Lomibao Dar III. Automated factory to deploy and track an endless list of GigaSupplyToken contracts, automatically routing and registering 900 Trillion initial supply to Treasury Wallet 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D.",
    keyFeatures: [
      "Dynamic generateNewToken(name, symbol) deployment",
      "Endless stream tracking via deployedTokensRegistry",
      "Automatic 900 Trillion supply route to Treasury Wallet",
      "TokenDeployed indexed event emission",
      "getGeneratedAddresses() and getDeployedCount() helpers",
    ],
    code: `// SPDX-License-Identifier: MIT
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
}`,
  },
];

export interface DiffLine {
  type: "unchanged" | "added" | "removed" | "modified";
  leftLineNumber?: number;
  rightLineNumber?: number;
  leftContent?: string;
  rightContent?: string;
}

export interface DiffReport {
  lines: DiffLine[];
  additionsCount: number;
  deletionsCount: number;
  unchangedCount: number;
  totalLinesLeft: number;
  totalLinesRight: number;
  similarityScore: number;
  complianceChecks: {
    title: string;
    passed: boolean;
    detail: string;
  }[];
}

/**
 * Compute line-by-line diff comparing standard reference (left) against generated contract (right).
 */
export function computeContractDiff(
  standardCode: string,
  generatedCode: string,
  ignoreWhitespace: boolean = false
): DiffReport {
  const leftRawLines = standardCode.split("\n");
  const rightRawLines = generatedCode.split("\n");

  const normalize = (line: string) => (ignoreWhitespace ? line.trim().replace(/\s+/g, " ") : line);

  const leftLines = leftRawLines.map((l) => ({ raw: l, norm: normalize(l) }));
  const rightLines = rightRawLines.map((r) => ({ raw: r, norm: normalize(r) }));

  // Quick Longest Common Subsequence (LCS) matrix
  const m = leftLines.length;
  const n = rightLines.length;

  // For very large files, limit matrix size to prevent OOM
  const maxLines = 1500;
  const safeM = Math.min(m, maxLines);
  const safeN = Math.min(n, maxLines);

  const dp: number[][] = Array.from({ length: safeM + 1 }, () => new Array(safeN + 1).fill(0));

  for (let i = 1; i <= safeM; i++) {
    for (let j = 1; j <= safeN; j++) {
      if (leftLines[i - 1].norm === rightLines[j - 1].norm) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const diffLines: DiffLine[] = [];
  let i = safeM;
  let j = safeN;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1].norm === rightLines[j - 1].norm) {
      diffLines.unshift({
        type: "unchanged",
        leftLineNumber: i,
        rightLineNumber: j,
        leftContent: leftLines[i - 1].raw,
        rightContent: rightLines[j - 1].raw,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffLines.unshift({
        type: "added",
        rightLineNumber: j,
        rightContent: rightLines[j - 1].raw,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diffLines.unshift({
        type: "removed",
        leftLineNumber: i,
        leftContent: leftLines[i - 1].raw,
      });
      i--;
    }
  }

  let additionsCount = 0;
  let deletionsCount = 0;
  let unchangedCount = 0;

  for (const line of diffLines) {
    if (line.type === "added") additionsCount++;
    else if (line.type === "removed") deletionsCount++;
    else unchangedCount++;
  }

  const similarityScore = Math.max(
    10,
    Math.min(
      99,
      Math.round(
        ((unchangedCount * 2) / (m + n || 1)) * 100
      )
    )
  );

  // Security & standard compliance checks
  const hasSpdx = generatedCode.includes("SPDX-License-Identifier");
  const hasPragma = generatedCode.includes("pragma solidity");
  const hasOpenZeppelinImports = generatedCode.includes("@openzeppelin/contracts");
  const hasOwnable2Step = generatedCode.includes("Ownable2Step");
  const hasPermit = generatedCode.includes("ERC20Permit");
  const hasMaxSupply = generatedCode.includes("MAX_SUPPLY") || generatedCode.includes("totalSupply");
  const hasReentrancyGuard = generatedCode.includes("ReentrancyGuard");

  const complianceChecks = [
    {
      title: "SPDX License Identifier",
      passed: hasSpdx,
      detail: hasSpdx ? "Standard MIT license recognized by block explorers & Etherscan" : "Missing SPDX tag",
    },
    {
      title: "Solidity Compiler Spec",
      passed: hasPragma,
      detail: hasPragma ? "pragma solidity 0.8.20+ with built-in overflow/underflow protection" : "Missing pragma declaration",
    },
    {
      title: "OpenZeppelin v5 Module Imports",
      passed: hasOpenZeppelinImports,
      detail: hasOpenZeppelinImports ? "Imports canonical @openzeppelin/contracts v5.0 abstractions" : "Non-standard or inline imports",
    },
    {
      title: "Secure Ownership (Ownable2Step)",
      passed: hasOwnable2Step,
      detail: hasOwnable2Step ? "Two-step ownership protects against zero-address or typo transfer lockouts" : "Standard single-step Ownable or no access control",
    },
    {
      title: "Gasless Approvals (EIP-2612 Permit)",
      passed: hasPermit,
      detail: hasPermit ? "ERC20Permit implemented for signature-based meta-transactions" : "Standard allowance mechanism only",
    },
    {
      title: "Total Supply Bounds",
      passed: hasMaxSupply,
      detail: hasMaxSupply ? "Explicit MAX_SUPPLY cap defined to prevent arbitrary inflation" : "Unbounded supply parameter",
    },
  ];

  return {
    lines: diffLines,
    additionsCount,
    deletionsCount,
    unchangedCount,
    totalLinesLeft: m,
    totalLinesRight: n,
    similarityScore,
    complianceChecks,
  };
}
