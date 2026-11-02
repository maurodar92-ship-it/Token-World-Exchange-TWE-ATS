// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Token World Exchange® - Permissioned Security Demo Contract
 * @dev DEMONSTRATION ONLY. Not ERC-3643 certification and not for live securities.
 * System: Token World Exchange®
 * Sole Owner/ Creator: Mauro Lomibao Dar III®
 * Notice: Teaching / sandbox demo skeleton. An on-chain contract address is not a security registration,
 * exchange approval, or broker-dealer license.
 */

interface IIdentityRegistry {
    function isVerified(address account) external view returns (bool);
}

contract TokenWorldPermissionedSecurityDemo {
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    string public constant name = "Token World Exchange\u00ae Security Demo";
    string public constant symbol = "TW-DEMO";
    uint8 public constant decimals = 0;

    address public owner;
    address public transferAgent;
    IIdentityRegistry public identityRegistry;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public frozen;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);
    event Frozen(address indexed account, bool value);

    modifier onlyOwner() {
        require(msg.sender == owner, "owner");
        _;
    }

    modifier onlyTransferAgent() {
        require(msg.sender == transferAgent, "transferAgent");
        _;
    }

    constructor(address registry, address agent) {
        owner = msg.sender;
        identityRegistry = IIdentityRegistry(registry);
        transferAgent = agent;
    }

    function setFrozen(address account, bool value) external onlyOwner {
        frozen[account] = value;
        emit Frozen(account, value);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(!frozen[msg.sender] && !frozen[to], "frozen");
        require(identityRegistry.isVerified(to), "recipient not verified");
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyTransferAgent {
        require(identityRegistry.isVerified(to), "recipient not verified");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyTransferAgent {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Burn(from, amount);
        emit Transfer(from, address(0), amount);
    }
}
