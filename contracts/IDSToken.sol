// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Metadata} from "./IERC20.sol";

/*
 * ============================================================================================
 *  APPROXIMATION — NOT THE AUTHORITATIVE SECURITIZE DS PROTOCOL ABI.
 *  These interfaces model the publicly described *shape* of Securitize's DS Protocol
 *  (DS Token + Registry, Compliance, Trust and Lock Manager services) so that TWE's
 *  `SecuritizeDsAdapter` can be designed and unit-tested against a mock. Function names,
 *  parameter types, role semantics and return codes MUST be confirmed against Securitize's
 *  official documentation / deployed contracts and certification before any live integration.
 * ============================================================================================
 */

/// @title IDSRegistryService (approximation) — investor and wallet registry.
interface IDSRegistryService {
    /// @notice Attribute identifiers (approximate): KYC_APPROVED, ACCREDITED, QUALIFIED, PROFESSIONAL.
    enum Attribute {
        NONE,
        KYC_APPROVED,
        ACCREDITED,
        QUALIFIED,
        PROFESSIONAL
    }

    event DSRegistryServiceInvestorAdded(string investorId, address sender);
    event DSRegistryServiceInvestorRemoved(string investorId, address sender);
    event DSRegistryServiceWalletAdded(address wallet, string investorId, address sender);
    event DSRegistryServiceWalletRemoved(address wallet, string investorId, address sender);
    event DSRegistryServiceInvestorAttributeChanged(string investorId, uint8 attributeId, uint256 value, uint256 expiry, string proofHash, address sender);

    function registerInvestor(string calldata investorId, string calldata collisionHash) external returns (bool);
    function removeInvestor(string calldata investorId) external returns (bool);
    function setCountry(string calldata investorId, string calldata country) external returns (bool);
    function setAttribute(string calldata investorId, uint8 attributeId, uint256 value, uint256 expiry, string calldata proofHash) external returns (bool);
    function addWallet(address wallet, string calldata investorId) external returns (bool);
    function removeWallet(address wallet, string calldata investorId) external returns (bool);

    function getInvestor(address wallet) external view returns (string memory investorId);
    function getCountry(string calldata investorId) external view returns (string memory);
    function getAttributeValue(string calldata investorId, uint8 attributeId) external view returns (uint256);
    function getAttributeExpiry(string calldata investorId, uint8 attributeId) external view returns (uint256);
    function isInvestor(string calldata investorId) external view returns (bool);
    function isWallet(address wallet) external view returns (bool);
}

/// @title IDSComplianceService (approximation) — per-token transfer rules.
interface IDSComplianceService {
    /// @notice Pre-transfer check returning a code (0 = valid) and a reason string.
    function preTransferCheck(address from, address to, uint256 value) external view returns (uint256 code, string memory reason);
    /// @notice Pre-issuance check.
    function preIssuanceCheck(address to, uint256 value) external view returns (uint256 code, string memory reason);
}

/// @title IDSToken (approximation) — DS Protocol security token.
/// @notice ERC-20 compatible; transfers consult the Compliance Service; issuance, burn and seizure are role-gated
///         (issuer / transfer agent / master per the Trust Service).
interface IDSToken is IERC20Metadata {
    event Issue(address indexed to, uint256 value, uint256 valueLocked);
    event Burn(address indexed burner, uint256 value, string reason);
    event Seize(address indexed from, address indexed to, uint256 value, string reason);
    event WalletAdded(address wallet);
    event WalletRemoved(address wallet);

    /// @notice Issue tokens to a registered wallet.
    function issueTokens(address to, uint256 value) external returns (bool);

    /// @notice Issue tokens with a lock (e.g., Rule 144 / Reg S / Reg CF restriction) until `releaseTime`.
    function issueTokensCustom(
        address to,
        uint256 value,
        uint256 issuanceTime,
        uint256 valueLocked,
        string calldata reason,
        uint64 releaseTime
    ) external returns (bool);

    /// @notice Burn tokens from a wallet (redemption / cancellation).
    function burn(address who, uint256 value, string calldata reason) external;

    /// @notice Seize tokens to a target wallet (court order / regulatory action / recovery).
    function seize(address from, address to, uint256 value, string calldata reason) external;

    /// @notice Aggregate balance across all wallets of an investor.
    function balanceOfInvestor(string calldata investorId) external view returns (uint256);

    /// @notice Total ever issued (not reduced by burns).
    function totalIssued() external view returns (uint256);

    /// @notice Enumerate holder wallets (for record-date snapshots).
    function walletCount() external view returns (uint256);
    function getWalletAt(uint256 index) external view returns (address);

    /// @notice Convenience proxy to the compliance service.
    function preTransferCheck(address from, address to, uint256 value) external view returns (uint256 code, string memory reason);

    /// @notice Bound services (approximate getter; DS uses a service-id lookup pattern).
    function getDSService(uint256 serviceId) external view returns (address);
}
