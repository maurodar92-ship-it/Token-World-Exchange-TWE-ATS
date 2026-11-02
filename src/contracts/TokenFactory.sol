// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GigaSupplyToken.sol";

/**
 * @title Token World Exchange® - TokenFactory
 * @notice System: Token World Exchange®
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 * @notice Factory to deploy and track an endless list of Token World Exchange® GigaSupplyToken contracts.
 */
contract TokenFactory {
    // Automatically routes and registers to Sole Owner/ Creator Mauro Lomibao Dar III® treasury address
    address public constant TREASURY_WALLET = 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D;
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    // Tracks the endless stream of dynamically deployed contract addresses
    address[] public deployedTokensRegistry;

    event TokenDeployed(
        address indexed tokenAddress,
        string name,
        string symbol,
        address indexed beneficiary
    );

    /**
     * @dev Deploys a new GigaSupplyToken instance in the Token World ecosystem and sends the 900 Trillion supply to the Treasury.
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
}
