// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title USDTRWASwap
 * @dev USDT <-> RWA swap contract with fixed price
 * 
 * Features:
 * - USDT -> RWA (buy RWA with USDT)
 * - RWA -> USDT (sell RWA for USDT)
 * - Fixed price: 1 RWA = 0.85 USDT
 * - Liquidity management by owner
 * - Emergency pause
 */
contract USDTRWASwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Token addresses
    IERC20 public immutable usdtToken;
    IERC20 public immutable rwaToken;
    
    // Price configuration (scaled by 10000 for precision)
    // 1 RWA = 0.85 USDT => 8500 / 10000
    uint256 public constant PRICE_NUMERATOR = 8500;
    uint256 public constant PRICE_DENOMINATOR = 10000;
    
    // USDT decimals (6) vs RWA decimals (18)
    uint256 public constant USDT_DECIMALS = 6;
    uint256 public constant RWA_DECIMALS = 18;
    uint256 public constant PRECISION_MULTIPLIER = 10 ** (RWA_DECIMALS - USDT_DECIMALS);
    
    // Swap limits
    uint256 public minSwapAmount = 10 * 10**USDT_DECIMALS; // 10 USDT minimum
    uint256 public maxSwapAmount = 100000 * 10**USDT_DECIMALS; // 100k USDT maximum
    
    // Swap enabled flag
    bool public swapEnabled = true;
    
    // Events
    event SwapUSDTToRWA(
        address indexed user,
        uint256 usdtAmount,
        uint256 rwaAmount
    );
    
    event SwapRWAToUSDT(
        address indexed user,
        uint256 rwaAmount,
        uint256 usdtAmount
    );
    
    event LiquidityAdded(
        uint256 usdtAmount,
        uint256 rwaAmount
    );
    
    event LiquidityRemoved(
        uint256 usdtAmount,
        uint256 rwaAmount
    );
    
    event SwapEnabledUpdated(bool enabled);
    event SwapLimitsUpdated(uint256 minAmount, uint256 maxAmount);
    
    constructor(
        address _usdtToken,
        address _rwaToken
    ) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_rwaToken != address(0), "Invalid RWA address");
        
        usdtToken = IERC20(_usdtToken);
        rwaToken = IERC20(_rwaToken);
    }
    
    /**
     * @dev Swap USDT for RWA
     * @param usdtAmount Amount of USDT to swap (6 decimals)
     */
    function swapUSDTToRWA(uint256 usdtAmount) external nonReentrant {
        require(swapEnabled, "Swap is disabled");
        require(usdtAmount >= minSwapAmount, "Amount too small");
        require(usdtAmount <= maxSwapAmount, "Amount too large");
        
        // Calculate RWA amount: usdtAmount / 0.85
        // usdtAmount * PRICE_DENOMINATOR / PRICE_NUMERATOR
        uint256 rwaAmount = (usdtAmount * PRECISION_MULTIPLIER * PRICE_DENOMINATOR) / PRICE_NUMERATOR;
        
        // Check contract has enough RWA
        require(rwaToken.balanceOf(address(this)) >= rwaAmount, "Insufficient RWA liquidity");
        
        // Transfer USDT from user to contract
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        // Transfer RWA from contract to user
        rwaToken.safeTransfer(msg.sender, rwaAmount);
        
        emit SwapUSDTToRWA(msg.sender, usdtAmount, rwaAmount);
    }
    
    /**
     * @dev Swap RWA for USDT
     * @param rwaAmount Amount of RWA to swap (18 decimals)
     */
    function swapRWAToUSDT(uint256 rwaAmount) external nonReentrant {
        require(swapEnabled, "Swap is disabled");
        
        // Calculate USDT amount: rwaAmount * 0.85
        // rwaAmount * PRICE_NUMERATOR / PRICE_DENOMINATOR
        uint256 usdtAmount = (rwaAmount * PRICE_NUMERATOR) / (PRICE_DENOMINATOR * PRECISION_MULTIPLIER);
        
        require(usdtAmount >= minSwapAmount, "Amount too small");
        require(usdtAmount <= maxSwapAmount, "Amount too large");
        
        // Check contract has enough USDT
        require(usdtToken.balanceOf(address(this)) >= usdtAmount, "Insufficient USDT liquidity");
        
        // Transfer RWA from user to contract
        rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
        
        // Transfer USDT from contract to user
        usdtToken.safeTransfer(msg.sender, usdtAmount);
        
        emit SwapRWAToUSDT(msg.sender, rwaAmount, usdtAmount);
    }
    
    /**
     * @dev Get quote for USDT -> RWA swap
     * @param usdtAmount Amount of USDT (6 decimals)
     * @return rwaAmount Amount of RWA user will receive (18 decimals)
     */
    function getQuoteUSDTToRWA(uint256 usdtAmount) external pure returns (uint256 rwaAmount) {
        rwaAmount = (usdtAmount * PRECISION_MULTIPLIER * PRICE_DENOMINATOR) / PRICE_NUMERATOR;
    }
    
    /**
     * @dev Get quote for RWA -> USDT swap
     * @param rwaAmount Amount of RWA (18 decimals)
     * @return usdtAmount Amount of USDT user will receive (6 decimals)
     */
    function getQuoteRWAToUSDT(uint256 rwaAmount) external pure returns (uint256 usdtAmount) {
        usdtAmount = (rwaAmount * PRICE_NUMERATOR) / (PRICE_DENOMINATOR * PRECISION_MULTIPLIER);
    }
    
    /**
     * @dev Add liquidity (owner only)
     * @param usdtAmount Amount of USDT to add
     * @param rwaAmount Amount of RWA to add
     */
    function addLiquidity(uint256 usdtAmount, uint256 rwaAmount) external onlyOwner {
        if (usdtAmount > 0) {
            usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
        }
        if (rwaAmount > 0) {
            rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
        }
        
        emit LiquidityAdded(usdtAmount, rwaAmount);
    }
    
    /**
     * @dev Remove liquidity (owner only)
     * @param usdtAmount Amount of USDT to remove
     * @param rwaAmount Amount of RWA to remove
     */
    function removeLiquidity(uint256 usdtAmount, uint256 rwaAmount) external onlyOwner {
        if (usdtAmount > 0) {
            usdtToken.safeTransfer(msg.sender, usdtAmount);
        }
        if (rwaAmount > 0) {
            rwaToken.safeTransfer(msg.sender, rwaAmount);
        }
        
        emit LiquidityRemoved(usdtAmount, rwaAmount);
    }
    
    /**
     * @dev Enable/disable swap
     */
    function setSwapEnabled(bool _enabled) external onlyOwner {
        swapEnabled = _enabled;
        emit SwapEnabledUpdated(_enabled);
    }
    
    /**
     * @dev Update swap limits
     */
    function setSwapLimits(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        require(_minAmount < _maxAmount, "Invalid limits");
        minSwapAmount = _minAmount;
        maxSwapAmount = _maxAmount;
        emit SwapLimitsUpdated(_minAmount, _maxAmount);
    }
    
    /**
     * @dev Get contract liquidity
     */
    function getLiquidity() external view returns (uint256 usdtBalance, uint256 rwaBalance) {
        usdtBalance = usdtToken.balanceOf(address(this));
        rwaBalance = rwaToken.balanceOf(address(this));
    }
}
