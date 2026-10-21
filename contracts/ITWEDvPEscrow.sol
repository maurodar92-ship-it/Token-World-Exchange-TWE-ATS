// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ITWEDvPEscrow — Atomic delivery-versus-payment escrow with hashlock and timelock
/// @notice Holds an asset leg (security token, typically ERC-3643) and a cash leg (USDC/EURC/USDS or other
///         approved ERC-20) for a single settlement. `settle` releases both legs atomically in one transaction;
///         after `timelock`, `refund` returns each funded leg to its depositor. See docs/04 §2–§3.
/// @dev Invariants (MUST hold; targets for formal verification):
///      I1. Neither leg is released to a counterparty unless BOTH legs are fully funded.
///      I2. `settle` and `refund` are mutually exclusive and each executes at most once per settlement.
///      I3. `refund` succeeds only when block.timestamp >= timelock (or by GUARDIAN on a cancelled settlement).
///      I4. Tokens held by the escrow for open settlements equal the sum of funded, unreleased legs per token.
///      I5. The escrow never holds a balance it cannot attribute to a settlement (excess is sweepable only by GUARDIAN to treasury, logged).
///      Same-chain settlements MAY use hashlock == bytes32(0), in which case `settle` is restricted to SETTLER_ROLE.
///      Cross-chain HTLC: each chain's escrow uses the same hashlock; the cash-side timelock MUST be shorter.
///      The escrow address must be registered/whitelisted in the asset token's identity registry or compliance.
interface ITWEDvPEscrow {
    /// @notice Lifecycle of an escrowed settlement.
    enum State {
        NONE,
        OPEN,
        ASSET_FUNDED,
        CASH_FUNDED,
        BOTH_FUNDED,
        SETTLED,
        REFUNDED,
        CANCELLED
    }

    /// @notice One side of the exchange.
    /// @param token ERC-20 compatible token address.
    /// @param from Depositor (seller for asset leg, buyer for cash leg).
    /// @param to Recipient on settlement.
    /// @param amount Amount in token base units.
    struct Leg {
        address token;
        address from;
        address to;
        uint256 amount;
    }

    /// @notice Full settlement record.
    struct Settlement {
        Leg asset;
        Leg cash;
        uint256 fee;          // deducted from cash leg, paid to feeRecipient
        address feeRecipient;
        bytes32 hashlock;     // keccak256(preimage) or 0 for settler-only same-chain mode
        uint64 timelock;      // unix seconds
        bytes32 tradeRef;     // keccak256 of TWE trade id (off-chain linkage, docs/06 settlements)
        State state;
    }

    event SettlementOpened(
        bytes32 indexed settlementId,
        bytes32 indexed tradeRef,
        address assetToken,
        address cashToken,
        uint256 assetAmount,
        uint256 cashAmount,
        bytes32 hashlock,
        uint64 timelock
    );
    event LegFunded(bytes32 indexed settlementId, bool indexed isAssetLeg, address indexed from, uint256 amount);
    event Settled(bytes32 indexed settlementId, bytes32 preimage, uint256 fee);
    event Refunded(bytes32 indexed settlementId, bool assetReturned, bool cashReturned);
    event Cancelled(bytes32 indexed settlementId, address indexed by, string reason);
    event EscrowPaused(address indexed by);
    event EscrowUnpaused(address indexed by);

    error SettlementExists(bytes32 settlementId);
    error UnknownSettlement(bytes32 settlementId);
    error InvalidState(bytes32 settlementId, State current);
    error NotDepositor(bytes32 settlementId, address caller);
    error InvalidPreimage(bytes32 settlementId);
    error TimelockNotExpired(bytes32 settlementId, uint64 timelock);
    error TimelockExpired(bytes32 settlementId, uint64 timelock);
    error CounterpartyNotEligible(address account);
    error FeeExceedsCash(uint256 fee, uint256 cashAmount);
    error EscrowIsPaused();

    /// @notice Create a settlement. SETTLER_ROLE only. `settlementId` = keccak256(tradeId, venueId, chainId).
    /// @dev MUST revert if the id exists, if fee > cash.amount, or if timelock <= block.timestamp.
    function openSettlement(
        bytes32 settlementId,
        Leg calldata asset,
        Leg calldata cash,
        uint256 fee,
        address feeRecipient,
        bytes32 hashlock,
        uint64 timelock,
        bytes32 tradeRef
    ) external;

    /// @notice Pull the asset leg from `asset.from` (requires prior allowance, or an agent-approved transfer for ERC-3643).
    /// @dev Callable by the depositor or SETTLER_ROLE. MUST revert after timelock.
    function fundAssetLeg(bytes32 settlementId) external;

    /// @notice Pull the cash leg from `cash.from` (requires prior allowance).
    function fundCashLeg(bytes32 settlementId) external;

    /// @notice Fund the cash leg using an EIP-2612 permit (USDC supports permit on many chains; confirm per deployment).
    function fundCashLegWithPermit(bytes32 settlementId, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;

    /// @notice Atomically deliver asset to buyer and cash (minus fee) to seller.
    /// @dev Requires state BOTH_FUNDED, block.timestamp < timelock, keccak256(abi.encodePacked(preimage)) == hashlock
    ///      (or SETTLER_ROLE when hashlock == 0). MUST re-check buyer eligibility via the token's compliance path —
    ///      a revert here leaves funds in escrow for `refund`.
    function settle(bytes32 settlementId, bytes32 preimage) external;

    /// @notice Return funded legs to depositors after timelock. Callable by anyone.
    function refund(bytes32 settlementId) external;

    /// @notice Cancel before timelock (e.g., trade break, compliance change). GUARDIAN_ROLE only; returns funded legs.
    function cancel(bytes32 settlementId, string calldata reason) external;

    /// @notice Pause new opens/fundings/settlements (refunds remain available). GUARDIAN_ROLE only.
    function pause() external;

    /// @notice Unpause. Requires multisig/quorum per deployment.
    function unpause() external;

    /// @notice Read a settlement.
    function getSettlement(bytes32 settlementId) external view returns (Settlement memory);

    /// @notice Current state.
    function stateOf(bytes32 settlementId) external view returns (State);

    /// @notice Whether the escrow is paused.
    function paused() external view returns (bool);
}
