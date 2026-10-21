// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ITWECorporateActions — Distribution engine for dividends, coupons and rent distributions
/// @notice Entitlements are computed off-chain from the record-date snapshot joined with the TA ledger
///         (docs/03 §11), net of tax withholding, and committed either as explicit push payments (small holder sets)
///         or as a Merkle root of (index, account, amount) leaves for pull-based claims.
/// @dev Leaf encoding: keccak256(bytes.concat(keccak256(abi.encode(index, account, amount)))) (double-hash to
///      prevent second-preimage attacks). Withholding is never computed on-chain; `amount` is the net amount.
///      Frozen holders' entitlements are paid to an escrow/hold account designated by the TA, not to the frozen wallet.
interface ITWECorporateActions {
    /// @notice Kind of distribution.
    enum Kind {
        CASH_DIVIDEND,
        COUPON,
        RENT_DISTRIBUTION,
        PRINCIPAL_REDEMPTION,
        RETURN_OF_CAPITAL
    }

    /// @notice Distribution lifecycle.
    enum Status {
        NONE,
        ANNOUNCED,
        FUNDED,
        PAYING,
        CLOSED,
        CANCELLED
    }

    /// @notice Distribution record.
    struct Distribution {
        address securityToken;     // ERC-3643 / DS / ERC-1404 token
        address payoutToken;       // approved settlement asset (USDC, EURC, ...)
        Kind kind;
        uint64 recordTimestamp;    // record date/time (UTC)
        uint64 snapshotBlock;      // last block with timestamp <= recordTimestamp at required finality
        uint64 payDate;            // earliest payment time
        uint64 claimDeadline;      // after which unclaimed funds may be reclaimed
        uint256 totalNet;          // sum of all net entitlements
        uint256 paidOut;           // running total
        bytes32 merkleRoot;        // 0 if push-only
        bytes32 offchainRef;       // keccak256 of TWE corporate_actions.ca_id
        Status status;
    }

    event DistributionAnnounced(uint256 indexed distributionId, address indexed securityToken, Kind kind, uint64 recordTimestamp, uint64 payDate, bytes32 offchainRef);
    event DistributionFunded(uint256 indexed distributionId, address indexed funder, uint256 amount);
    event EntitlementsCommitted(uint256 indexed distributionId, bytes32 merkleRoot, uint256 totalNet, uint64 snapshotBlock);
    event Paid(uint256 indexed distributionId, address indexed account, uint256 amount, bool pushed);
    event Reclaimed(uint256 indexed distributionId, address indexed to, uint256 amount);
    event DistributionCancelled(uint256 indexed distributionId, string reason);

    error InvalidStatus(uint256 distributionId, Status current);
    error AlreadyClaimed(uint256 distributionId, uint256 index);
    error InvalidProof(uint256 distributionId, uint256 index);
    error Underfunded(uint256 distributionId, uint256 required, uint256 available);
    error NotYetPayable(uint256 distributionId, uint64 payDate);
    error ClaimWindowOpen(uint256 distributionId, uint64 claimDeadline);

    /// @notice Announce a distribution. CA_AGENT role; off-chain 4-eyes approval required (docs/08 §3).
    function announce(
        address securityToken,
        address payoutToken,
        Kind kind,
        uint64 recordTimestamp,
        uint64 payDate,
        uint64 claimDeadline,
        bytes32 offchainRef
    ) external returns (uint256 distributionId);

    /// @notice Commit entitlements after the record date. Sets the Merkle root (or 0 for push-only) and totals.
    function commitEntitlements(uint256 distributionId, bytes32 merkleRoot, uint256 totalNet, uint64 snapshotBlock) external;

    /// @notice Transfer payout tokens into the contract for this distribution (issuer / paying agent).
    function fund(uint256 distributionId, uint256 amount) external;

    /// @notice Push payments to a batch of holders (≤ a few hundred per tx). Each (account, amount) must equal its committed leaf.
    /// @param indices Leaf indices (prevents double payment across push and claim paths).
    function pushPayments(uint256 distributionId, uint256[] calldata indices, address[] calldata accounts, uint256[] calldata amounts, bytes32[][] calldata proofs) external;

    /// @notice Pull-based claim by the holder (or a relayer on the holder's behalf; funds always go to `account`).
    function claim(uint256 distributionId, uint256 index, address account, uint256 amount, bytes32[] calldata proof) external;

    /// @notice Reclaim unclaimed funds to the issuer/paying agent after `claimDeadline` (escheatment handled off-chain).
    function reclaimUnclaimed(uint256 distributionId, address to) external;

    /// @notice Cancel before payments begin; returns funding.
    function cancel(uint256 distributionId, string calldata reason) external;

    /// @notice Read a distribution.
    function getDistribution(uint256 distributionId) external view returns (Distribution memory);

    /// @notice Whether a leaf index has been paid.
    function isPaid(uint256 distributionId, uint256 index) external view returns (bool);
}
