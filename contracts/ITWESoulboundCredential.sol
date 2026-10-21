// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC5192 — Minimal Soulbound NFTs
/// @notice ERC-721 extension: a token for which `locked` returns true MUST revert on any transfer.
/// @dev ERC-165 interface id: 0xb45a3c0e.
interface IERC5192 {
    /// @notice Emitted when the locking status is changed to locked.
    event Locked(uint256 tokenId);
    /// @notice Emitted when the locking status is changed to unlocked.
    event Unlocked(uint256 tokenId);

    /// @notice Returns the locking status of a soulbound token.
    function locked(uint256 tokenId) external view returns (bool);
}

/// @title IERC721Minimal — subset of ERC-721 needed by credential readers.
interface IERC721Minimal {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/// @title ITWESoulboundCredential — non-transferable eligibility credentials for permissioned pairs
/// @notice Used by Module C (and optionally Module A) to gate access to permissioned markets, e.g.
///         ELIGIBLE_CONTRACT_PARTICIPANT for derivatives, NON_US_PERSON for offshore-only pairs (docs/04 §8.6).
///         All tokens are permanently `locked`. Each credential references an off-chain W3C VC 2.0 credential by hash.
/// @dev `credentialType` values reuse claim topic IDs from docs/05 §8.3 so a single identity pipeline serves all modules.
///      Recovery to a new wallet is burn-and-reissue (never transfer).
interface ITWESoulboundCredential is IERC5192, IERC721Minimal {
    /// @notice Credential data.
    struct Credential {
        uint256 credentialType;  // claim topic id
        address issuer;          // TWE issuer key or trusted issuer
        uint64 issuedAt;
        uint64 expiresAt;        // 0 = no expiry (discouraged)
        bytes32 evidenceHash;    // keccak256(VC id || salt); no PII
        bool revoked;
    }

    event CredentialIssued(uint256 indexed tokenId, address indexed holder, uint256 indexed credentialType, uint64 expiresAt, bytes32 evidenceHash);
    event CredentialRevoked(uint256 indexed tokenId, address indexed holder, uint256 indexed credentialType, string reason);
    event CredentialRenewed(uint256 indexed tokenId, uint64 newExpiresAt, bytes32 newEvidenceHash);

    error Soulbound();
    error NotIssuer(address caller);
    error HolderNotVerified(address holder);
    error DuplicateCredential(address holder, uint256 credentialType);

    /// @notice Issue a credential. ISSUER_ROLE only. MUST emit `Locked(tokenId)` and `Transfer(0, holder, tokenId)`.
    /// @dev SHOULD require `holder` to be verified in the TWE identity registry.
    function issue(address holder, uint256 credentialType, uint64 expiresAt, bytes32 evidenceHash) external returns (uint256 tokenId);

    /// @notice Revoke (burns or flags) a credential. ISSUER_ROLE or GUARDIAN_ROLE.
    function revoke(uint256 tokenId, string calldata reason) external;

    /// @notice Extend expiry with fresh evidence (re-verification).
    function renew(uint256 tokenId, uint64 newExpiresAt, bytes32 newEvidenceHash) external;

    /// @notice True if `holder` has an unrevoked, unexpired credential of `credentialType`.
    function hasValidCredential(address holder, uint256 credentialType) external view returns (bool);

    /// @notice Token id of the holder's credential of the given type (0 if none).
    function credentialIdOf(address holder, uint256 credentialType) external view returns (uint256);

    /// @notice Credential details.
    function getCredential(uint256 tokenId) external view returns (Credential memory);
}
