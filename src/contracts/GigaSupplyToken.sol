// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Token World Exchange® - GigaSupplyToken
 * @notice System: Token World Exchange®
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 * @notice Standard ERC20 token with 900 Trillion initial supply minted to Token World Exchange® Treasury.
 */
contract GigaSupplyToken is ERC20, Ownable {
    // 900 Trillion Supply = 900,000,000,000,000 with 18 decimals
    uint256 private constant TARGET_SUPPLY = 900_000_000_000_000 * 10**18;
    
    // Designated Token World Exchange® Treasury Wallet for Sole Owner/ Creator Mauro Lomibao Dar III®
    address public constant TREASURY_WALLET = 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D;
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    constructor(
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) Ownable(TREASURY_WALLET) {
        // Automatically mints the entire supply directly to the Treasury Wallet
        _mint(TREASURY_WALLET, TARGET_SUPPLY);
    }
}
