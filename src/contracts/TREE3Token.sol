// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Token World Exchange® - TREE3Token
 * @notice System: Token World Exchange®
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 * @notice Core ERC-20 token for the Token World Exchange® ecosystem featuring a deterministic TREE(3)-inspired ID generator.
 */
contract TREE3Token is ERC20, ERC20Burnable, Ownable {
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    // 1 Quadrillion TREE3 (1,000,000,000,000,000 * 10**18)
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000_000_000 * 10**18;

    event BatchDataIngested(uint256 indexed batchId, uint256 validRecordsCount);
    event Tree3IdGenerated(address indexed account, uint256 indexed nonce, bytes32 tree3Id);

    constructor(address initialOwner) ERC20("Token World Exchange\u00ae TREE3", "TREE3") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @notice Generates a deterministic TREE(3)-inspired identifier based on an address, nonce, and seed block.
     * @param account Target account address
     * @param nonce Transaction or sequence nonce
     * @param seed Arbitrary seed or block variable
     */
    function generateTree3ID(address account, uint256 nonce, uint256 seed) public pure returns (bytes32) {
        bytes32 step1 = keccak256(abi.encodePacked(account, nonce, seed));
        bytes32 step2 = keccak256(abi.encodePacked(step1, account, nonce + 1));
        return keccak256(abi.encodePacked(step1, step2, seed));
    }
}
