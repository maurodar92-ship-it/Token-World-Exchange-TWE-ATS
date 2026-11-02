// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Token World Exchange® - TokenWorldTreasury
 * @notice System: Token World Exchange®
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 * @notice Compliant security token using standard ERC-20 patterns with investor whitelisting for Token World Treasury.
 */
contract TokenWorldTreasury {
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    string public name = "Token World Exchange\u00ae Treasury";
    string public symbol = "TWT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public whitelistedInvestors;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event WhitelistUpdated(address indexed investor, bool status);
    event BatchWhitelistUpdated(uint256 totalUpdated, bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Token World: Not authorized - Caller is not Sole Owner");
        _;
    }

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        totalSupply = initialSupply * 10**uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        whitelistedInvestors[msg.sender] = true;
    }

    function setWhitelistStatus(address investor, bool status) external onlyOwner {
        whitelistedInvestors[investor] = status;
        emit WhitelistUpdated(investor, status);
    }

    function batchSetWhitelist(address[] calldata investors, bool status) external onlyOwner {
        for (uint256 i = 0; i < investors.length; i++) {
            whitelistedInvestors[investors[i]] = status;
            emit WhitelistUpdated(investors[i], status);
        }
        emit BatchWhitelistUpdated(investors.length, status);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(whitelistedInvestors[msg.sender], "Token World: Sender not whitelisted");
        require(whitelistedInvestors[to], "Token World: Recipient not whitelisted");
        require(balanceOf[msg.sender] >= value, "Token World: Insufficient balance");

        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
}
