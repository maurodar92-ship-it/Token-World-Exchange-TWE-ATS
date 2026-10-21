// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC1404 — Simple Restricted Token Standard
/// @notice ERC-20 extension exposing transfer-restriction detection with human-readable messages.
/// @dev Restriction code 0 MUST mean "no restriction". Implementations MUST call `detectTransferRestriction`
///      inside `transfer`/`transferFrom` and revert when the code is non-zero.
///      TWE maps non-zero codes to FIX tag 5012 as `ONCHAIN_RESTRICTION_<code>`.
interface IERC1404 {
    /// @notice Detects whether a transfer would be restricted.
    /// @param from Sender.
    /// @param to Recipient.
    /// @param value Amount (token base units).
    /// @return restrictionCode 0 if allowed, otherwise an implementation-defined code.
    function detectTransferRestriction(address from, address to, uint256 value) external view returns (uint8 restrictionCode);

    /// @notice Human-readable message for a restriction code.
    function messageForTransferRestriction(uint8 restrictionCode) external view returns (string memory message);
}

/// @title TWE suggested restriction codes for ERC-1404 tokens issued or wrapped by TWE.
library TWERestrictionCodes {
    uint8 internal constant SUCCESS = 0;
    uint8 internal constant SENDER_NOT_VERIFIED = 1;
    uint8 internal constant RECIPIENT_NOT_VERIFIED = 2;
    uint8 internal constant SENDER_FROZEN = 3;
    uint8 internal constant RECIPIENT_FROZEN = 4;
    uint8 internal constant LOCKUP_ACTIVE = 5;          // Rule 144 / Reg CF / Reg S lot not yet transferable
    uint8 internal constant JURISDICTION_BLOCKED = 6;
    uint8 internal constant NOT_ACCREDITED = 7;
    uint8 internal constant HOLDER_CAP_REACHED = 8;
    uint8 internal constant TOKEN_PAUSED = 9;
    uint8 internal constant INSUFFICIENT_UNFROZEN_BALANCE = 10;
}
