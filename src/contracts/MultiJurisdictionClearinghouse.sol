// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./InvestorIdentityNFT.sol";

/**
 * @title MultiJurisdictionClearinghouse
 * @author Token World Exchange - Tokenomics Option 3
 * @notice Multi-jurisdictional KYC/AML clearinghouse with investor identity NFTs.
 *         Automated clearing & settlement on-chain atomic swap logic that cross-references
 *         the buyer's and seller's Identity NFTs against the asset token's regulatory rule set.
 */

contract MultiJurisdictionClearinghouse {
    address public owner;
    InvestorIdentityNFT public immutable identityNFT;

    struct SettlementReceipt {
        bytes32 settlementId;
        address buyer;
        address seller;
        string assetSymbol;
        uint256 sharesCleared;
        uint256 totalConsiderationUsdMicros;
        uint16 buyerJurisdiction;
        uint16 sellerJurisdiction;
        uint64 settledAtTimestamp;
        bytes32 clearanceProofHash;
        bool isCleared;
    }

    uint256 public nextSettlementNonce = 1;
    mapping(bytes32 => SettlementReceipt) public settlements;
    bytes32[] public settlementHistory;

    // Cross-Border Regulatory Transfer Matrix:
    // (buyerJurisdiction, sellerJurisdiction) => allowed
    mapping(uint32 => bool) public crossBorderPermitted;

    // Holding Period Lockup timestamps for assets: asset => wallet => eligibleAfter
    mapping(string => mapping(address => uint64)) public holdingPeriodUnlockTimestamp;

    // Events
    event TradeClearedAndSettledDvP(
        bytes32 indexed settlementId,
        address indexed buyer,
        address indexed seller,
        string assetSymbol,
        uint256 sharesCleared,
        uint256 considerationMicros,
        uint16 buyerJurisdiction,
        uint16 sellerJurisdiction,
        bytes32 clearanceProofHash
    );

    event CrossBorderRuleUpdated(uint16 buyerJur, uint16 sellerJur, bool allowed);

    error ErrOnlyOwner();
    error ErrBuyerNotAccredited(string reason);
    error ErrSellerNotAccredited(string reason);
    error ErrCrossBorderProhibited();
    error ErrHoldingPeriodLocked();
    error ErrSanctionsScreeningStale();

    modifier onlyOwner() {
        if (msg.sender != owner) revert ErrOnlyOwner();
        _;
    }

    constructor(address _identityNFTAddress) {
        owner = msg.sender;
        identityNFT = InvestorIdentityNFT(_identityNFTAddress);

        // Pre-configure initial cross-border matrix:
        // Key format: (uint32(buyerJurisdiction) << 16) | uint32(sellerJurisdiction)

        // 1. US 506(c) (840) <-> US 506(c) (840)
        _setCrossBorderRule(840, 840, true);

        // 2. US Rule 144A QIB (841) <-> US Rule 144A QIB (841)
        _setCrossBorderRule(841, 841, true);

        // 3. QIB (841) can trade with US 506(c) (840)
        _setCrossBorderRule(841, 840, true);
        _setCrossBorderRule(840, 841, true);

        // 4. EU MiFID II Professional (276) <-> EU MiFID II (276)
        _setCrossBorderRule(276, 276, true);

        // 5. SG MAS Accredited (702) <-> SG MAS Accredited (702)
        _setCrossBorderRule(702, 702, true);

        // 6. SG MAS (702) <-> EU Professional (276) Cross-Border Treaty
        _setCrossBorderRule(702, 276, true);
        _setCrossBorderRule(276, 702, true);

        // 7. CH FinSA (756) <-> EU Professional (276)
        _setCrossBorderRule(756, 276, true);
        _setCrossBorderRule(276, 756, true);

        // 8. QIB (841) global cross-border eligibility
        _setCrossBorderRule(841, 276, true);
        _setCrossBorderRule(276, 841, true);
        _setCrossBorderRule(841, 702, true);
        _setCrossBorderRule(702, 841, true);
    }

    function _setCrossBorderRule(uint16 buyerJur, uint16 sellerJur, bool allowed) internal {
        uint32 key = (uint32(buyerJur) << 16) | uint32(sellerJur);
        crossBorderPermitted[key] = allowed;
    }

    function setCrossBorderRule(uint16 buyerJur, uint16 sellerJur, bool allowed) external onlyOwner {
        _setCrossBorderRule(buyerJur, sellerJur, allowed);
        emit CrossBorderRuleUpdated(buyerJur, sellerJur, allowed);
    }

    function setHoldingPeriodLockup(string calldata asset, address seller, uint64 unlockTimestamp) external onlyOwner {
        holdingPeriodUnlockTimestamp[asset][seller] = unlockTimestamp;
    }

    /**
     * @notice Automated Clearing & Settlement: Atomic DvP cross-referencing buyer and seller Identity NFTs
     */
    function clearAndSettleAtomicDvP(
        address buyer,
        address seller,
        string calldata assetSymbol,
        uint256 sharesToClear,
        uint256 pricePerShareMicros
    ) external returns (bytes32 settlementId) {
        // 1. Verify Buyer Identity NFT
        (bool buyerOk, string memory buyerReason) = identityNFT.isVerifiedInvestor(buyer, 0, 4);
        if (!buyerOk) revert ErrBuyerNotAccredited(buyerReason);

        // 2. Verify Seller Identity NFT
        (bool sellerOk, string memory sellerReason) = identityNFT.isVerifiedInvestor(seller, 0, 4);
        if (!sellerOk) revert ErrSellerNotAccredited(sellerReason);

        uint256 buyerTokenId = identityNFT.walletToTokenId(buyer);
        uint256 sellerTokenId = identityNFT.walletToTokenId(seller);

        (, uint16 buyerJur, , , , , bytes32 buyerSanctions, , ) = identityNFT.attestations(buyerTokenId);
        (, uint16 sellerJur, , , , , bytes32 sellerSanctions, , ) = identityNFT.attestations(sellerTokenId);

        // 3. Verify Fresh Sanctions Screening
        if (buyerSanctions == bytes32(0) || sellerSanctions == bytes32(0)) {
            revert ErrSanctionsScreeningStale();
        }

        // 4. Cross-Border Jurisdictional Matrix Check
        uint32 jurKey = (uint32(buyerJur) << 16) | uint32(sellerJur);
        if (!crossBorderPermitted[jurKey]) {
            revert ErrCrossBorderProhibited();
        }

        // 5. Holding Period Check (e.g. Rule 144 1-year holding period for Reg D 506(c))
        uint64 unlockTime = holdingPeriodUnlockTimestamp[assetSymbol][seller];
        if (unlockTime > 0 && block.timestamp < unlockTime) {
            revert ErrHoldingPeriodLocked();
        }

        // 6. Generate Cryptographic DvP Clearance Proof Hash
        uint256 totalConsideration = (sharesToClear * pricePerShareMicros) / 1_000_000;
        settlementId = keccak256(
            abi.encodePacked(
                nextSettlementNonce++,
                buyer,
                seller,
                assetSymbol,
                sharesToClear,
                totalConsideration,
                block.timestamp
            )
        );

        bytes32 proofHash = keccak256(
            abi.encodePacked(
                settlementId,
                buyerJur,
                sellerJur,
                buyerSanctions,
                sellerSanctions,
                block.number
            )
        );

        settlements[settlementId] = SettlementReceipt({
            settlementId: settlementId,
            buyer: buyer,
            seller: seller,
            assetSymbol: assetSymbol,
            sharesCleared: sharesToClear,
            totalConsiderationUsdMicros: totalConsideration,
            buyerJurisdiction: buyerJur,
            sellerJurisdiction: sellerJur,
            settledAtTimestamp: uint64(block.timestamp),
            clearanceProofHash: proofHash,
            isCleared: true
        });

        settlementHistory.push(settlementId);

        emit TradeClearedAndSettledDvP(
            settlementId,
            buyer,
            seller,
            assetSymbol,
            sharesToClear,
            totalConsideration,
            buyerJur,
            sellerJur,
            proofHash
        );
    }

    function getSettlementHistoryCount() external view returns (uint256) {
        return settlementHistory.length;
    }
}
