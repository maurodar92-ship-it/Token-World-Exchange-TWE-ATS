// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC734 — Key Manager (as used by ONCHAINID)
/// @notice Keys are stored as keccak256(abi.encode(address)) and carry one or more purposes.
/// @dev Purposes: 1 = MANAGEMENT, 2 = ACTION, 3 = CLAIM signer, 4 = ENCRYPTION. Key type 1 = ECDSA, 2 = RSA.
interface IERC734 {
    /// @notice Emitted when an execution request was approved.
    event Approved(uint256 indexed executionId, bool approved);
    /// @notice Emitted when an execute operation was approved and successfully performed.
    event Executed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    /// @notice Emitted when an execution request was performed via `execute`.
    event ExecutionRequested(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    /// @notice Emitted when an execute operation was called and failed.
    event ExecutionFailed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    /// @notice Emitted when a key was added to the identity.
    event KeyAdded(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    /// @notice Emitted when a key was removed from the identity.
    event KeyRemoved(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);

    /// @notice Adds a key with a purpose. MUST only be callable by a MANAGEMENT key (or the identity itself).
    function addKey(bytes32 key, uint256 purpose, uint256 keyType) external returns (bool success);

    /// @notice Removes a purpose from a key. MUST only be callable by a MANAGEMENT key.
    function removeKey(bytes32 key, uint256 purpose) external returns (bool success);

    /// @notice Approves or rejects a pending execution. MANAGEMENT keys approve calls to the identity itself; ACTION keys approve external calls.
    function approve(uint256 id, bool approved) external returns (bool success);

    /// @notice Requests execution of a call. Executes immediately if the sender holds a sufficient key; otherwise queues for approval.
    /// @return executionId The id to use with `approve`.
    function execute(address to, uint256 value, bytes calldata data) external payable returns (uint256 executionId);

    /// @notice Returns the purposes, key type and key for a key hash.
    function getKey(bytes32 key) external view returns (uint256[] memory purposes, uint256 keyType, bytes32 key_);

    /// @notice Returns the purposes held by a key.
    function getKeyPurposes(bytes32 key) external view returns (uint256[] memory purposes);

    /// @notice Returns all keys holding a given purpose.
    function getKeysByPurpose(uint256 purpose) external view returns (bytes32[] memory keys);

    /// @notice Returns true if the key holds the purpose (implementations MAY treat MANAGEMENT as holding all purposes).
    function keyHasPurpose(bytes32 key, uint256 purpose) external view returns (bool exists);
}
