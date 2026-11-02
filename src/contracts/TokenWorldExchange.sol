// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Token World Exchange®
 * @notice Native token contract for Token World Exchange® ecosystem
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 */
contract TokenWorldExchange is ERC20, Ownable, ReentrancyGuard {
    string public constant EXCHANGE_NAME = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(uint256 initialSupply) ERC20("Token World Exchange\u00ae", "TWE") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
    }

    function mintTokens(address to, uint256 amount) external onlyOwner nonReentrant {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burnTokens(uint256 amount) external nonReentrant {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
}
