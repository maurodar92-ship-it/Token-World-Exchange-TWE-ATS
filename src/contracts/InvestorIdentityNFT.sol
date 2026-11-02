// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title InvestorIdentityNFT (ERC-5192 Soulbound Token)
 * @author Token World Exchange - Architecture Option 2 & Tokenomics Option 3
 * @notice Non-transferable Identity NFT issued to verified institutional/accredited investors.
 *         Complies with ERC-5192 Minimal Soulbound Token interface.
 *         Contains multi-jurisdictional attestation hashes, ZK KYC proofs, and sanctions screening.
 */

interface IERC5192 {
    /// @notice Emitted when the soulbound token is locked.
    event Locked(uint256 tokenId);

    /// @notice Emitted when the soulbound token is unlocked.
    event Unlocked(uint256 tokenId);

    /// @notice Returns the locking status of an Soulbound Token.
    function locked(uint256 tokenId) external view returns (bool);
}

contract InvestorIdentityNFT is IERC5192 {
    // --- ERC-721 Metadata ---
    string public name = "Token World Investor Identity SBT";
    string public symbol = "TW-ID-SBT";

    // --- Roles & Governance ---
    address public owner;
    address public complianceOracle;

    // --- ERC-5192 Soulbound Status ---
    // All identity NFTs are permanently locked upon minting
    mapping(uint256 => bool) private _isLocked;

    // --- Jurisdiction Numeric Codes (ISO 3166-1 Numeric / Regulatory Category) ---
    // 840 = US Reg D 506(c) Accredited
    // 841 = US Rule 144A Qualified Institutional Buyer (QIB)
    // 276 = EU MiFID II Professional Client
    // 702 = SG MAS Accredited Investor
    // 826 = UK FCA Certified High Net Worth / Professional
    // 392 = JP FIEA Qualified Institutional Investor
    // 756 = CH FinSA Qualified Investor
    // 999 = Offshore Reg S Non-US

    // --- Accreditation Tiers ---
    // 1 = Institutional QIB ($100M+ AUM)
    // 2 = Qualified Purchaser ($5M+ Investments)
    // 3 = Accredited Investor ($1M+ Net Worth or $200k+ Income)
    // 4 = Professional Client / Family Office
    // 5 = Retail Non-Accredited (Restricted)

    struct InvestorAttestation {
        address investorWallet;
        uint16 jurisdictionCode;
        uint8 accreditationTier;
        uint64 issuedAt;
        uint64 expirationTimestamp;
        bytes32 zkIdentityCommitment;   // Hashed Poseidon / SHA-256 commitment of KYC credentials (no raw PII)
        bytes32 sanctionsScreeningHash; // Chainalysis / Elliptic / OFAC sanctions verification oracle hash
        bool isRevoked;
        string revocationReason;
    }

    uint256 public nextTokenId = 1;

    // Mapping from Token ID to Attestation
    mapping(uint256 => InvestorAttestation) public attestations;

    // Mapping from Investor Wallet Address to Active Token ID
    mapping(address => uint256) public walletToTokenId;

    // Mapping from Token ID to Owner Address
    mapping(uint256 => address) public tokenOwners;

    // --- Events ---
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event IdentityNFTMinted(
        uint256 indexed tokenId,
        address indexed investor,
        uint16 jurisdictionCode,
        uint8 accreditationTier,
        uint64 expirationTimestamp,
        bytes32 zkCommitment,
        bytes32 sanctionsHash
    );
    event IdentityNFTRevoked(uint256 indexed tokenId, address indexed investor, string reason);
    event SanctionsAttestationRefreshed(uint256 indexed tokenId, bytes32 newSanctionsHash);

    // --- Custom Errors ---
    error ErrOnlyOwner();
    error ErrOnlyComplianceOracle();
    error ErrSoulboundLocked();
    error ErrZeroAddress();
    error ErrAlreadyMinted();
    error ErrIdentityExpired();
    error ErrIdentityRevoked();
    error ErrNotVerified();

    modifier onlyOwner() {
        if (msg.sender != owner) revert ErrOnlyOwner();
        _;
    }

    modifier onlyOracleOrOwner() {
        if (msg.sender != complianceOracle && msg.sender != owner) revert ErrOnlyComplianceOracle();
        _;
    }

    constructor(address _complianceOracle) {
        owner = msg.sender;
        complianceOracle = _complianceOracle != address(0) ? _complianceOracle : msg.sender;
    }

    function setComplianceOracle(address _newOracle) external onlyOwner {
        if (_newOracle == address(0)) revert ErrZeroAddress();
        complianceOracle = _newOracle;
    }

    /**
     * @notice Issue a new non-transferable ERC-5192 Investor Identity SBT
     */
    function issueIdentityNFT(
        address investor,
        uint16 jurisdictionCode,
        uint8 accreditationTier,
        uint64 expirationTimestamp,
        bytes32 zkIdentityCommitment,
        bytes32 sanctionsScreeningHash
    ) external onlyOracleOrOwner returns (uint256 tokenId) {
        if (investor == address(0)) revert ErrZeroAddress();
        if (walletToTokenId[investor] != 0 && !attestations[walletToTokenId[investor]].isRevoked) {
            revert ErrAlreadyMinted();
        }

        tokenId = nextTokenId++;
        tokenOwners[tokenId] = investor;
        walletToTokenId[investor] = tokenId;

        attestations[tokenId] = InvestorAttestation({
            investorWallet: investor,
            jurisdictionCode: jurisdictionCode,
            accreditationTier: accreditationTier,
            issuedAt: uint64(block.timestamp),
            expirationTimestamp: expirationTimestamp,
            zkIdentityCommitment: zkIdentityCommitment,
            sanctionsScreeningHash: sanctionsScreeningHash,
            isRevoked: false,
            revocationReason: ""
        });

        // Lock permanently (Soulbound)
        _isLocked[tokenId] = true;

        emit Transfer(address(0), investor, tokenId);
        emit Locked(tokenId);
        emit IdentityNFTMinted(
            tokenId,
            investor,
            jurisdictionCode,
            accreditationTier,
            expirationTimestamp,
            zkIdentityCommitment,
            sanctionsScreeningHash
        );
    }

    /**
     * @notice Revoke an identity NFT upon sanctions breach, compliance failure, or KYC expiry
     */
    function revokeIdentityNFT(uint256 tokenId, string calldata reason) external onlyOracleOrOwner {
        InvestorAttestation storage att = attestations[tokenId];
        if (att.investorWallet == address(0)) revert ErrZeroAddress();
        
        att.isRevoked = true;
        att.revocationReason = reason;

        emit IdentityNFTRevoked(tokenId, att.investorWallet, reason);
    }

    /**
     * @notice Refresh sanctions screening oracle attestation hash (must be updated periodically)
     */
    function updateSanctionsAttestation(uint256 tokenId, bytes32 newSanctionsHash) external onlyOracleOrOwner {
        InvestorAttestation storage att = attestations[tokenId];
        if (att.investorWallet == address(0) || att.isRevoked) revert ErrIdentityRevoked();
        att.sanctionsScreeningHash = newSanctionsHash;
        emit SanctionsAttestationRefreshed(tokenId, newSanctionsHash);
    }

    /**
     * @notice Check if an investor wallet holds an active, valid Identity NFT for the target criteria
     */
    function isVerifiedInvestor(
        address wallet,
        uint16 requiredJurisdiction,
        uint8 minTier
    ) external view returns (bool isValid, string memory reason) {
        uint256 tokenId = walletToTokenId[wallet];
        if (tokenId == 0) {
            return (false, "NO_IDENTITY_NFT_FOUND");
        }

        InvestorAttestation memory att = attestations[tokenId];
        if (att.isRevoked) {
            return (false, string.concat("IDENTITY_REVOKED: ", att.revocationReason));
        }

        if (block.timestamp > att.expirationTimestamp) {
            return (false, "IDENTITY_ATTESTATION_EXPIRED");
        }

        if (att.sanctionsScreeningHash == bytes32(0)) {
            return (false, "SANCTIONS_SCREENING_MISSING");
        }

        if (requiredJurisdiction != 0 && att.jurisdictionCode != requiredJurisdiction && att.jurisdictionCode != 841) {
            // Rule 144A QIB (841) has cross-jurisdictional pass-through
            return (false, "JURISDICTION_MISMATCH");
        }

        if (att.accreditationTier > minTier) {
            return (false, "INSUFFICIENT_ACCREDITATION_TIER");
        }

        return (true, "COMPLIANT_ACTIVE_INVESTOR");
    }

    /**
     * @notice ERC-5192 locked query
     */
    function locked(uint256 tokenId) external view override returns (bool) {
        return _isLocked[tokenId];
    }

    /**
     * @notice ERC-721 Soulbound transfer restriction: ANY transfer reverts!
     */
    function transferFrom(address, address, uint256) external pure {
        revert ErrSoulboundLocked();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert ErrSoulboundLocked();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert ErrSoulboundLocked();
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return tokenOwners[tokenId];
    }
}
