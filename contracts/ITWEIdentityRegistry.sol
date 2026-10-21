// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC3643IdentityRegistry, IIdentity} from "./IERC3643.sol";

/// @title ITWEIdentityRegistry — TWE identity registry (ERC-3643 compatible with TWE extensions)
/// @notice Extends the ERC-3643 Identity Registry with investor-level grouping of wallets, investor-level
///         freezes (sanctions / legal holds), topic-specific eligibility queries and claim expiry awareness.
/// @dev Claim topic IDs are defined in docs/05-compliance-surveillance.md §8.3 (1 KYC, 2 AML, 3 Accredited US,
///      4 QP, 5 Non-US person, 6 QIB, 7 Jurisdiction, 8 ECP, 9 Professional EU, 10 Reg CF limit attestation).
///      No PII is stored on-chain: `investorKey` is keccak256(TWE investor UUID || registry salt).
interface ITWEIdentityRegistry is IERC3643IdentityRegistry {
    /// @notice Reason codes for investor-level freezes.
    enum FreezeReason {
        NONE,
        SANCTIONS,
        COURT_ORDER,
        KYC_EXPIRED,
        LOST_KEY,
        DISPUTE,
        REGULATORY_HOLD
    }

    /// @notice Emitted when a wallet is linked to an investor key.
    event WalletLinked(bytes32 indexed investorKey, address indexed wallet, IIdentity indexed identity);
    /// @notice Emitted when a wallet is unlinked from an investor key.
    event WalletUnlinked(bytes32 indexed investorKey, address indexed wallet);
    /// @notice Emitted on investor-level freeze or unfreeze; applies to all linked wallets across all bound tokens.
    event InvestorFrozen(bytes32 indexed investorKey, FreezeReason reason, bool frozen, address indexed agent);
    /// @notice Emitted when a jurisdiction subdivision (ISO 3166-2 code hash) is recorded for blue-sky checks.
    event SubdivisionUpdated(bytes32 indexed investorKey, bytes32 subdivisionHash);
    /// @notice Emitted when the off-chain eligibility snapshot version is advanced by the sync worker (docs/03 §10).
    event EligibilityVersionUpdated(bytes32 indexed investorKey, uint64 version);

    /// @notice Thrown when a caller lacks the AGENT role.
    error NotAgent(address caller);
    /// @notice Thrown when the wallet is already linked to another investor.
    error WalletAlreadyLinked(address wallet, bytes32 existingInvestorKey);
    /// @notice Thrown when an update carries a non-increasing eligibility version (replay protection for sync).
    error StaleVersion(bytes32 investorKey, uint64 current, uint64 provided);

    /// @notice Link a wallet to an investor and register it with the investor's ONCHAINID and country.
    /// @param investorKey Pseudonymous investor key.
    /// @param wallet Wallet address (proven controlled by the investor via SIWE off-chain).
    /// @param _identity Investor ONCHAINID.
    /// @param country ISO 3166-1 numeric country code.
    /// @param version Monotonic eligibility version from the off-chain source of truth.
    function linkWallet(bytes32 investorKey, address wallet, IIdentity _identity, uint16 country, uint64 version) external;

    /// @notice Unlink a wallet (balance must be zero or moved via recovery first).
    function unlinkWallet(bytes32 investorKey, address wallet, uint64 version) external;

    /// @notice Freeze or unfreeze every wallet of an investor. Freezing MUST be callable by a single agent
    ///         (protective action); unfreezing SHOULD require an on-chain multisig/agent quorum.
    function setInvestorFrozen(bytes32 investorKey, bool frozen, FreezeReason reason) external;

    /// @notice Record the investor's ISO 3166-2 subdivision hash (e.g., keccak256("US-NY")).
    function setSubdivision(bytes32 investorKey, bytes32 subdivisionHash, uint64 version) external;

    /// @notice Investor key for a wallet (zero if unlinked).
    function investorKeyOf(address wallet) external view returns (bytes32);

    /// @notice All wallets linked to an investor.
    function walletsOf(bytes32 investorKey) external view returns (address[] memory);

    /// @notice True if the investor (and hence all linked wallets) is frozen.
    function isInvestorFrozen(bytes32 investorKey) external view returns (bool frozen, FreezeReason reason);

    /// @notice True if the wallet holds a valid, unrevoked, unexpired claim from a trusted issuer for `topic`.
    /// @dev Expiry is read from the claim `data` encoding abi.encode(bytes32 evidenceHash, uint64 validUntil).
    function hasValidClaim(address wallet, uint256 topic) external view returns (bool);

    /// @notice True iff `isVerified(wallet)`, the investor is not frozen, and the wallet holds valid claims for all `topics`.
    /// @dev Used by TWE compliance modules and the DvP escrow pre-settlement check for instrument-specific topics.
    function isEligible(address wallet, uint256[] calldata topics) external view returns (bool);

    /// @notice Earliest `validUntil` among the wallet's claims for `topics` (0 if any is missing).
    function eligibleUntil(address wallet, uint256[] calldata topics) external view returns (uint64);

    /// @notice Current off-chain eligibility version for an investor.
    function eligibilityVersion(bytes32 investorKey) external view returns (uint64);
}
