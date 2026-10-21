// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Metadata} from "./IERC20.sol";
import {IERC734} from "./IERC734.sol";
import {IERC735} from "./IERC735.sol";

/// @title IIdentity — ONCHAINID identity (ERC-734 keys + ERC-735 claims).
interface IIdentity is IERC734, IERC735 {
    /// @notice Validates a claim against this identity (signature recovers to a CLAIM key of the issuer and not revoked).
    function isClaimValid(IIdentity identity, uint256 claimTopic, bytes calldata sig, bytes calldata data)
        external
        view
        returns (bool);
}

/// @title IClaimIssuer — identity of a trusted claim issuer with revocation.
interface IClaimIssuer is IIdentity {
    event ClaimRevoked(bytes indexed signature);

    /// @notice Revokes a claim by its id on a given identity.
    function revokeClaim(bytes32 claimId, address identity) external returns (bool);
    /// @notice Revokes a claim by its signature.
    function revokeClaimBySignature(bytes calldata signature) external;
    /// @notice Returns true if a claim signature was revoked.
    function isClaimRevoked(bytes calldata sig) external view returns (bool);
}

/// @title IClaimTopicsRegistry — claim topics required to hold a token.
interface IClaimTopicsRegistry {
    event ClaimTopicAdded(uint256 indexed claimTopic);
    event ClaimTopicRemoved(uint256 indexed claimTopic);

    function addClaimTopic(uint256 claimTopic) external;
    function removeClaimTopic(uint256 claimTopic) external;
    function getClaimTopics() external view returns (uint256[] memory);
}

/// @title ITrustedIssuersRegistry — trusted claim issuers and their allowed topics.
interface ITrustedIssuersRegistry {
    event TrustedIssuerAdded(IClaimIssuer indexed trustedIssuer, uint256[] claimTopics);
    event TrustedIssuerRemoved(IClaimIssuer indexed trustedIssuer);
    event ClaimTopicsUpdated(IClaimIssuer indexed trustedIssuer, uint256[] claimTopics);

    function addTrustedIssuer(IClaimIssuer trustedIssuer, uint256[] calldata claimTopics) external;
    function removeTrustedIssuer(IClaimIssuer trustedIssuer) external;
    function updateIssuerClaimTopics(IClaimIssuer trustedIssuer, uint256[] calldata claimTopics) external;
    function getTrustedIssuers() external view returns (IClaimIssuer[] memory);
    function getTrustedIssuersForClaimTopic(uint256 claimTopic) external view returns (IClaimIssuer[] memory);
    function isTrustedIssuer(address issuer) external view returns (bool);
    function getTrustedIssuerClaimTopics(IClaimIssuer trustedIssuer) external view returns (uint256[] memory);
    function hasClaimTopic(address issuer, uint256 claimTopic) external view returns (bool);
}

/// @title IIdentityRegistryStorage — shared wallet→identity storage bindable by many registries.
interface IIdentityRegistryStorage {
    event IdentityStored(address indexed investorAddress, IIdentity indexed identity);
    event IdentityUnstored(address indexed investorAddress, IIdentity indexed identity);
    event IdentityModified(IIdentity indexed oldIdentity, IIdentity indexed newIdentity);
    event CountryModified(address indexed investorAddress, uint16 indexed country);
    event IdentityRegistryBound(address indexed identityRegistry);
    event IdentityRegistryUnbound(address indexed identityRegistry);

    function addIdentityToStorage(address userAddress, IIdentity identity, uint16 country) external;
    function removeIdentityFromStorage(address userAddress) external;
    function modifyStoredInvestorCountry(address userAddress, uint16 country) external;
    function modifyStoredIdentity(address userAddress, IIdentity identity) external;
    function bindIdentityRegistry(address identityRegistry) external;
    function unbindIdentityRegistry(address identityRegistry) external;
    function linkedIdentityRegistries() external view returns (address[] memory);
    function storedIdentity(address userAddress) external view returns (IIdentity);
    function storedInvestorCountry(address userAddress) external view returns (uint16);
}

/// @title IERC3643IdentityRegistry — ERC-3643 Identity Registry.
/// @notice `isVerified` is the eligibility predicate used by the token on every transfer and mint.
interface IERC3643IdentityRegistry {
    event ClaimTopicsRegistrySet(address indexed claimTopicsRegistry);
    event IdentityStorageSet(address indexed identityStorage);
    event TrustedIssuersRegistrySet(address indexed trustedIssuersRegistry);
    event IdentityRegistered(address indexed investorAddress, IIdentity indexed identity);
    event IdentityRemoved(address indexed investorAddress, IIdentity indexed identity);
    event IdentityUpdated(IIdentity indexed oldIdentity, IIdentity indexed newIdentity);
    event CountryUpdated(address indexed investorAddress, uint16 indexed country);

    /// @notice Registers a wallet→identity mapping with an ISO 3166-1 numeric country code. Agent only.
    function registerIdentity(address userAddress, IIdentity _identity, uint16 country) external;
    function deleteIdentity(address userAddress) external;
    function updateCountry(address userAddress, uint16 country) external;
    function updateIdentity(address userAddress, IIdentity _identity) external;
    function batchRegisterIdentity(address[] calldata userAddresses, IIdentity[] calldata identities, uint16[] calldata countries) external;
    function setIdentityRegistryStorage(address _identityRegistryStorage) external;
    function setClaimTopicsRegistry(address _claimTopicsRegistry) external;
    function setTrustedIssuersRegistry(address _trustedIssuersRegistry) external;

    function contains(address userAddress) external view returns (bool);
    /// @notice True iff the wallet has an identity holding a valid, unrevoked claim from a trusted issuer for every required topic.
    function isVerified(address userAddress) external view returns (bool);
    function identity(address userAddress) external view returns (IIdentity);
    function investorCountry(address userAddress) external view returns (uint16);
    function identityStorage() external view returns (IIdentityRegistryStorage);
    function issuersRegistry() external view returns (ITrustedIssuersRegistry);
    function topicsRegistry() external view returns (IClaimTopicsRegistry);
}

/// @title IERC3643Compliance — Modular compliance bound to a token.
/// @notice Holds the offering-level rules (country allow/deny, holder caps, lockups, max balance, supply limits).
interface IERC3643Compliance {
    event TokenBound(address token);
    event TokenUnbound(address token);
    event ModuleAdded(address indexed module);
    event ModuleRemoved(address indexed module);
    event ModuleInteraction(address indexed target, bytes4 selector);

    function bindToken(address token) external;
    function unbindToken(address token) external;
    function addModule(address module) external;
    function removeModule(address module) external;
    function callModuleFunction(bytes calldata callData, address module) external;

    /// @notice Hook: called by the token after a successful transfer (state updates in modules).
    function transferred(address from, address to, uint256 amount) external;
    /// @notice Hook: called by the token after mint.
    function created(address to, uint256 amount) external;
    /// @notice Hook: called by the token after burn.
    function destroyed(address from, uint256 amount) external;

    /// @notice Returns true if the transfer complies with all bound modules. Does not check identity (registry does).
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);
    function getModules() external view returns (address[] memory);
    function getTokenBound() external view returns (address);
    function isModuleBound(address module) external view returns (bool);
}

/// @title IERC3643 — T-REX permissioned security token.
/// @notice ERC-20 compatible token where every transfer requires `identityRegistry().isVerified(to)` and
///         `compliance().canTransfer(from, to, amount)`, and the sender's unfrozen balance to cover `amount`.
/// @dev Agent role (issuer / TA) can mint, burn, freeze, force-transfer and recover. TWE's agent keys are
///      HSM/MPC-held and every agent call is preceded by an off-chain 4-eyes approval (docs/08 §3.1).
interface IERC3643 is IERC20Metadata {
    event UpdatedTokenInformation(string newName, string newSymbol, uint8 newDecimals, string newVersion, address newOnchainID);
    event IdentityRegistryAdded(address indexed identityRegistry);
    event ComplianceAdded(address indexed compliance);
    event RecoverySuccess(address indexed lostWallet, address indexed newWallet, address indexed investorOnchainID);
    event AddressFrozen(address indexed userAddress, bool indexed isFrozen, address indexed owner);
    event TokensFrozen(address indexed userAddress, uint256 amount);
    event TokensUnfrozen(address indexed userAddress, uint256 amount);
    event Paused(address userAddress);
    event Unpaused(address userAddress);
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);

    // ---- configuration (owner) ----
    function setName(string calldata _name) external;
    function setSymbol(string calldata _symbol) external;
    function setOnchainID(address _onchainID) external;
    function setIdentityRegistry(address _identityRegistry) external;
    function setCompliance(address _compliance) external;
    function addAgent(address agent) external;
    function removeAgent(address agent) external;

    // ---- agent operations ----
    function pause() external;
    function unpause() external;
    function setAddressFrozen(address userAddress, bool freeze) external;
    function freezePartialTokens(address userAddress, uint256 amount) external;
    function unfreezePartialTokens(address userAddress, uint256 amount) external;
    /// @notice Transfer bypassing compliance modules (still requires `to` to be verified). For court orders, error correction.
    function forcedTransfer(address from, address to, uint256 amount) external returns (bool);
    /// @notice Issue tokens to a verified wallet.
    function mint(address to, uint256 amount) external;
    /// @notice Burn tokens (redemption, cancellation). Unfreezes partial frozen balance if required.
    function burn(address userAddress, uint256 amount) external;
    /// @notice Move full balance and frozen status from a lost wallet to a new wallet of the same ONCHAINID.
    function recoveryAddress(address lostWallet, address newWallet, address investorOnchainID) external returns (bool);

    // ---- batch ----
    function batchTransfer(address[] calldata toList, uint256[] calldata amounts) external;
    function batchForcedTransfer(address[] calldata fromList, address[] calldata toList, uint256[] calldata amounts) external;
    function batchMint(address[] calldata toList, uint256[] calldata amounts) external;
    function batchBurn(address[] calldata userAddresses, uint256[] calldata amounts) external;
    function batchSetAddressFrozen(address[] calldata userAddresses, bool[] calldata freeze) external;
    function batchFreezePartialTokens(address[] calldata userAddresses, uint256[] calldata amounts) external;
    function batchUnfreezePartialTokens(address[] calldata userAddresses, uint256[] calldata amounts) external;

    // ---- views ----
    function onchainID() external view returns (address);
    function version() external view returns (string memory);
    function identityRegistry() external view returns (IERC3643IdentityRegistry);
    function compliance() external view returns (IERC3643Compliance);
    function paused() external view returns (bool);
    function isFrozen(address userAddress) external view returns (bool);
    function getFrozenTokens(address userAddress) external view returns (uint256);
    function isAgent(address account) external view returns (bool);
}
