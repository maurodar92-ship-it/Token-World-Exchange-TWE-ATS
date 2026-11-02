// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenWorldAMMPair.sol";

/**
 * @title TokenWorldRouter
 * @notice Production-grade multi-hop router for Token World Exchange
 */
interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint256 value) external returns (bool);
    function withdraw(uint256) external;
}

contract TokenWorldRouter {
    address public immutable factory;
    address public immutable WETH;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "TokenWorldRouter: EXPIRED");
        _;
    }

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal virtual returns (uint256 amountA, uint256 amountB) {
        if (TokenWorldAMMFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            TokenWorldAMMFactory(factory).createPair(tokenA, tokenB);
        }
        (uint256 reserveA, uint256 reserveB) = getReserves(tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "TokenWorldRouter: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "TokenWorldRouter: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = TokenWorldAMMFactory(factory).getPair(tokenA, tokenB);
        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);
        liquidity = TokenWorldAMMPair(pair).mint(to);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public virtual ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = TokenWorldAMMFactory(factory).getPair(tokenA, tokenB);
        TokenWorldAMMPair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = TokenWorldAMMPair(pair).burn(to);
        (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, "TokenWorldRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "TokenWorldRouter: INSUFFICIENT_B_AMOUNT");
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) returns (uint256[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "TokenWorldRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        IERC20(path[0]).transferFrom(
            msg.sender,
            TokenWorldAMMFactory(factory).getPair(path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = input < output ? (input, output) : (output, input);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address to = i < path.length - 2 ? TokenWorldAMMFactory(factory).getPair(output, path[i + 2]) : _to;
            TokenWorldAMMPair(TokenWorldAMMFactory(factory).getPair(input, output)).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
        }
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure virtual returns (uint256 amountB) {
        require(amountA > 0, "TokenWorldRouter: INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "TokenWorldRouter: INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        virtual
        returns (uint256 amountOut)
    {
        require(amountIn > 0, "TokenWorldRouter: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "TokenWorldRouter: INSUFFICIENT_LIQUIDITY");
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getReserves(address tokenA, address tokenB) public view returns (uint256 reserveA, uint256 reserveB) {
        (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        address pair = TokenWorldAMMFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) return (0, 0);
        (uint112 reserve0, uint112 reserve1,) = TokenWorldAMMPair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function getAmountsOut(uint256 amountIn, address[] memory path)
        public
        view
        virtual
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "TokenWorldRouter: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }
}
