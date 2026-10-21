// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC735 — Claim Holder (as used by ONCHAINID)
/// @notice Claims are signed statements by an issuer about the identity, grouped by topic.
/// @dev claimId = keccak256(abi.encode(issuer, topic)). Scheme 1 = ECDSA.
///      Signature convention (ONCHAINID): issuer CLAIM key signs
///      keccak256(abi.encode(identityAddress, topic, data)) using EIP-191 personal_sign prefix.
///      TWE stores only hashes in `data` (no PII on-chain); `uri` points to an access-controlled resolver.
interface IERC735 {
    /// @notice Emitted when a claim was added.
    event ClaimAdded(bytes32 indexed claimId, uint256 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);
    /// @notice Emitted when a claim was removed.
    event ClaimRemoved(bytes32 indexed claimId, uint256 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);
    /// @notice Emitted when a claim was changed.
    event ClaimChanged(bytes32 indexed claimId, uint256 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);

    /// @notice Adds or updates a claim. MUST be callable by a CLAIM key of this identity (or the identity itself).
    /// @return claimRequestId The claim id.
    function addClaim(
        uint256 topic,
        uint256 scheme,
        address issuer,
        bytes calldata signature,
        bytes calldata data,
        string calldata uri
    ) external returns (bytes32 claimRequestId);

    /// @notice Removes a claim. MUST be callable by a CLAIM/MANAGEMENT key or the issuer.
    function removeClaim(bytes32 claimId) external returns (bool success);

    /// @notice Returns a claim by id.
    function getClaim(bytes32 claimId)
        external
        view
        returns (uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri);

    /// @notice Returns all claim ids for a topic.
    function getClaimIdsByTopic(uint256 topic) external view returns (bytes32[] memory claimIds);
}
