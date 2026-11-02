// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./InvestorIdentityNFT.sol";

/**
 * @title PreTradeComplianceHook
 * @author Token World Exchange - Architecture Option 2
 * @notice Pre-Execution Compliance Gate running on enterprise L2/L3 EVM rollup.
 *         Intercepts every order placement before insertion into the Central Limit Order Book (CLOB).
 *         Enforces SEC Rule 15c3-5 risk controls, investor accreditation SBT verification, and position limits.
 */

interface IPreTradeComplianceHook {
    function validateOrderPlacement(
        address trader,
        string calldata symbol,
        bool isBuy,
        uint256 priceUsdMicros,   // Price in micro-USD (e.g. $52.50 = 52_500_000)
        uint256 quantityShares,
        uint256 referencePriceMicros,
        uint256 currentTraderOpenShares
    ) external view returns (bool approved, string memory failureReason);
}

contract PreTradeComplianceHook is IPreTradeComplianceHook {
    address public owner;
    InvestorIdentityNFT public immutable identityNFT;

    // --- Risk Parameters per Symbol ---
    struct SymbolRiskParams {
        bool tradingActive;
        uint16 requiredJurisdiction;      // 0 = any valid accredited, 840 = US 506c, 841 = QIB, etc.
        uint8 minAccreditationTier;       // 1 = QIB, 2 = QP, 3 = Accredited
        uint256 maxSingleOrderShares;     // Maximum shares in a single ticket
        uint256 maxTraderPositionShares;  // Maximum aggregate open position limit
        uint256 maxPriceCollarBps;        // Max deviation from reference price in bps (e.g. 1000 = 10%)
    }

    mapping(string => SymbolRiskParams) public symbolParameters;

    // --- Asset Restriction List (Blocked wallets per asset) ---
    mapping(string => mapping(address => bool)) public restrictedWallets;

    // --- Events ---
    event RiskParamsUpdated(string indexed symbol, uint256 maxOrderShares, uint256 maxPositionShares, uint256 maxPriceCollarBps);
    event WalletRestrictionUpdated(string indexed symbol, address indexed wallet, bool restricted);

    error ErrOnlyOwner();
    error ErrSymbolTradingHalted();
    error ErrOrderSizeExceeded();
    error ErrPositionLimitExceeded();
    error ErrPriceCollarBreached();
    error ErrWalletRestricted();

    modifier onlyOwner() {
        if (msg.sender != owner) revert ErrOnlyOwner();
        _;
    }

    constructor(address _identityNFTAddress) {
        owner = msg.sender;
        identityNFT = InvestorIdentityNFT(_identityNFTAddress);

        // Seed default parameters for benchmark security tokens
        symbolParameters["TW-EQ"] = SymbolRiskParams({
            tradingActive: true,
            requiredJurisdiction: 0, // Cross-border accredited
            minAccreditationTier: 3, // Accredited or higher
            maxSingleOrderShares: 100_000,
            maxTraderPositionShares: 500_000,
            maxPriceCollarBps: 1000 // 10% SEC Rule 15c3-5 collar
        });

        symbolParameters["TREE3"] = SymbolRiskParams({
            tradingActive: true,
            requiredJurisdiction: 0,
            minAccreditationTier: 3,
            maxSingleOrderShares: 500_000,
            maxTraderPositionShares: 2_000_000,
            maxPriceCollarBps: 1500 // 15% collar
        });

        symbolParameters["SPX-EQ"] = SymbolRiskParams({
            tradingActive: true,
            requiredJurisdiction: 840, // US 506(c) or 841 QIB
            minAccreditationTier: 2,   // Qualified Purchaser / QIB
            maxSingleOrderShares: 25_000,
            maxTraderPositionShares: 150_000,
            maxPriceCollarBps: 800  // 8% collar
        });
    }

    function setSymbolRiskParams(
        string calldata symbol,
        bool tradingActive,
        uint16 requiredJurisdiction,
        uint8 minAccreditationTier,
        uint256 maxSingleOrderShares,
        uint256 maxTraderPositionShares,
        uint256 maxPriceCollarBps
    ) external onlyOwner {
        symbolParameters[symbol] = SymbolRiskParams({
            tradingActive: tradingActive,
            requiredJurisdiction: requiredJurisdiction,
            minAccreditationTier: minAccreditationTier,
            maxSingleOrderShares: maxSingleOrderShares,
            maxTraderPositionShares: maxTraderPositionShares,
            maxPriceCollarBps: maxPriceCollarBps
        });

        emit RiskParamsUpdated(symbol, maxSingleOrderShares, maxTraderPositionShares, maxPriceCollarBps);
    }

    function setWalletRestriction(string calldata symbol, address wallet, bool restricted) external onlyOwner {
        restrictedWallets[symbol][wallet] = restricted;
        emit WalletRestrictionUpdated(symbol, wallet, restricted);
    }

    /**
     * @notice Primary pre-execution compliance evaluation hook
     */
    function validateOrderPlacement(
        address trader,
        string calldata symbol,
        bool /* isBuy */,
        uint256 priceUsdMicros,
        uint256 quantityShares,
        uint256 referencePriceMicros,
        uint256 currentTraderOpenShares
    ) external view override returns (bool approved, string memory failureReason) {
        SymbolRiskParams memory params = symbolParameters[symbol];

        // 1. Trading Halt Check
        if (!params.tradingActive) {
            return (false, "TRADING_HALTED_FOR_SYMBOL");
        }

        // 2. Asset Restriction List
        if (restrictedWallets[symbol][trader]) {
            return (false, "TRADER_ON_ASSET_RESTRICTION_LIST");
        }

        // 3. Identity NFT Verification (ERC-5192 Soulbound Token)
        (bool isVerified, string memory idReason) = identityNFT.isVerifiedInvestor(
            trader,
            params.requiredJurisdiction,
            params.minAccreditationTier
        );
        if (!isVerified) {
            return (false, string.concat("COMPLIANCE_GATE_FAILED: ", idReason));
        }

        // 4. Single Order Size Limit
        if (params.maxSingleOrderShares > 0 && quantityShares > params.maxSingleOrderShares) {
            return (false, "ORDER_SIZE_EXCEEDS_MAX_LIMIT");
        }

        // 5. Aggregate Position Limit Check
        if (params.maxTraderPositionShares > 0 && (currentTraderOpenShares + quantityShares) > params.maxTraderPositionShares) {
            return (false, "AGGREGATE_POSITION_LIMIT_EXCEEDED");
        }

        // 6. SEC Rule 15c3-5 Price Collar Check (Fat-finger & volatility prevention)
        if (referencePriceMicros > 0 && params.maxPriceCollarBps > 0) {
            uint256 maxDeviationMicros = (referencePriceMicros * params.maxPriceCollarBps) / 10_000;
            uint256 upperBand = referencePriceMicros + maxDeviationMicros;
            uint256 lowerBand = referencePriceMicros > maxDeviationMicros ? referencePriceMicros - maxDeviationMicros : 0;

            if (priceUsdMicros > upperBand || priceUsdMicros < lowerBand) {
                return (false, "RULE_15C3_5_PRICE_COLLAR_BREACH");
            }
        }

        return (true, "PRE_EXECUTION_COMPLIANCE_PASSED");
    }
}
