// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TREE3Token.sol";

/**
 * @title Token World Exchange® - DeployTREE3
 * @notice System: Token World Exchange®
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 * @notice Production Foundry script to deploy Token World Exchange® TREE3 Token.
 */
contract DeployTREE3 {
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    function run() external returns (TREE3Token) {
        uint256 deployerPrivateKey = vm_envUint("PRIVATE_KEY");
        address deployerAddress = vm_addr(deployerPrivateKey);

        vm_startBroadcast(deployerPrivateKey);

        TREE3Token token = new TREE3Token(deployerAddress);

        vm_stopBroadcast();

        emit log_named_address("Token World Exchange\u00ae TREE3 Deployed To", address(token));
        emit log_named_address("Token World Exchange\u00ae Sole Owner/ Creator Address", deployerAddress);
        emit log_named_uint("Token World Exchange\u00ae TREE3 Total Supply", token.totalSupply());

        return token;
    }

    // Foundry cheatcode helpers
    function vm_envUint(string memory) internal pure returns (uint256) {
        return 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d;
    }

    function vm_addr(uint256 privKey) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(privKey)))));
    }

    function vm_startBroadcast(uint256) internal pure {}
    function vm_stopBroadcast() internal pure {}

    event log_named_address(string key, address val);
    event log_named_uint(string key, uint256 val);
}
