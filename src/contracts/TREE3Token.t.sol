// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TREE3Token.sol";

/**
 * @title Token World Exchange® - TREE3TokenTest
 * @notice System: Token World Exchange®
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 * @notice Complete Foundry test suite for Token World Exchange® TREE3 Token.
 */
contract TREE3TokenTest {
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    TREE3Token public token;
    address public owner = address(0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D); // Sole Owner/ Creator Mauro Lomibao Dar III® Treasury
    address public user = address(0x2222222222222222222222222222222222222222);

    function setUp() public {
        token = new TREE3Token(owner);
    }

    function test_InitialSupply() public view {
        require(token.totalSupply() == 1_000_000_000_000_000 * 10**18, "Supply mismatch");
        require(token.balanceOf(owner) == 1_000_000_000_000_000 * 10**18, "Owner balance mismatch");
    }

    function test_DeterministicTree3ID() public view {
        bytes32 id1 = token.generateTree3ID(user, 1, 999);
        bytes32 id2 = token.generateTree3ID(user, 1, 999);
        require(id1 == id2, "Deterministic ID failure: IDs must match");
    }
}
