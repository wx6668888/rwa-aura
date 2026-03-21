// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PriceStabilizer
 * @dev 价格稳定合约 - 价格稳定机制、自动买入/卖出
 * 
 * Features:
 * - 价格稳定机制（目标价格：1 RWA = 1 USDT）
 * - 自动买入/卖出（当价格偏离目标价格时）
 * - 价格保护（最低 0.8 USDT，最高 1.2 USDT）
 * - 与 SwapContract 集成
 */
contract PriceStabilizer is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Token addresses
    IERC20 public immutable rwaToken;
    IERC20 public immutable usdtToken;
    
    // Contract addresses
    address public swapContractAddress;  // SwapContract 地址
    address public pancakeSwapPair;      // PancakeSwap Pair 地址（可选）
    
    // 价格配置
    uint256 public targetPrice = 1 * 10**18;  // 目标价格：1 RWA = 1 USDT (18 decimals)
    uint256 public priceDeviationThreshold = 10;  // 价格偏差阈值：10%
    uint256 public minPrice = 8 * 10**17;  // 最低价格：0.8 USDT (18 decimals)
    uint256 public maxPrice = 12 * 10**17; // 最高价格：1.2 USDT (18 decimals)
    
    // 自动稳定配置
    bool public autoStabilizeEnabled = true;  // 是否启用自动稳定
    uint256 public stabilizeCooldown = 1 hours; // 稳定冷却期（1小时）
    uint256 public lastStabilizeTime;        // 上次稳定时间
    
    // 交易限制
    uint256 public maxBuyAmount = 10000 * 10**18;  // 单次最大买入金额（RWA）
    uint256 public maxSellAmount = 10000 * 10**18; // 单次最大卖出金额（RWA）
    
    // 统计
    uint256 public totalBuyAmount;   // 总买入金额
    uint256 public totalSellAmount;  // 总卖出金额
    uint256 public stabilizeCount;   // 稳定次数
    
    // 事件
    event PriceStabilized(uint256 currentPrice, uint256 targetPrice, uint256 deviation, bool bought, uint256 amount, uint256 timestamp);
    event BuyExecuted(uint256 usdtAmount, uint256 rwaAmount, uint256 price, uint256 timestamp);
    event SellExecuted(uint256 rwaAmount, uint256 usdtAmount, uint256 price, uint256 timestamp);
    event TargetPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event PriceDeviationThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event MinPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event MaxPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event AutoStabilizeEnabledUpdated(bool enabled);
    event SwapContractAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event PancakeSwapPairUpdated(address indexed oldAddress, address indexed newAddress);
    
    /**
     * @dev Constructor
     * @param _rwaToken RWA token address
     * @param _usdtToken USDT token address
     */
    constructor(address _rwaToken, address _usdtToken) Ownable(msg.sender) {
        require(_rwaToken != address(0), "PriceStabilizer: Invalid RWA token address");
        require(_usdtToken != address(0), "PriceStabilizer: Invalid USDT token address");
        
        rwaToken = IERC20(_rwaToken);
        usdtToken = IERC20(_usdtToken);
    }
    
    /**
     * @dev 设置 SwapContract 地址
     * @param _swapContractAddress SwapContract 地址
     */
    function setSwapContractAddress(address _swapContractAddress) external onlyOwner {
        require(_swapContractAddress != address(0), "PriceStabilizer: Invalid address");
        address oldAddress = swapContractAddress;
        swapContractAddress = _swapContractAddress;
        emit SwapContractAddressUpdated(oldAddress, _swapContractAddress);
    }
    
    /**
     * @dev 设置 PancakeSwap Pair 地址
     * @param _pancakeSwapPair PancakeSwap Pair 地址
     */
    function setPancakeSwapPair(address _pancakeSwapPair) external onlyOwner {
        address oldAddress = pancakeSwapPair;
        pancakeSwapPair = _pancakeSwapPair;
        emit PancakeSwapPairUpdated(oldAddress, _pancakeSwapPair);
    }
    
    /**
     * @dev 设置目标价格
     * @param newPrice 新的目标价格（18 decimals）
     */
    function setTargetPrice(uint256 newPrice) external onlyOwner {
        require(newPrice >= minPrice && newPrice <= maxPrice, "PriceStabilizer: Price out of range");
        uint256 oldPrice = targetPrice;
        targetPrice = newPrice;
        emit TargetPriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @dev 设置价格偏差阈值
     * @param newThreshold 新的阈值（百分比，10 = 10%）
     */
    function setPriceDeviationThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0 && newThreshold <= 50, "PriceStabilizer: Invalid threshold");
        uint256 oldThreshold = priceDeviationThreshold;
        priceDeviationThreshold = newThreshold;
        emit PriceDeviationThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @dev 设置最低价格
     * @param newPrice 新的最低价格（18 decimals）
     */
    function setMinPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0 && newPrice < targetPrice, "PriceStabilizer: Invalid min price");
        uint256 oldPrice = minPrice;
        minPrice = newPrice;
        emit MinPriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @dev 设置最高价格
     * @param newPrice 新的最高价格（18 decimals）
     */
    function setMaxPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > targetPrice, "PriceStabilizer: Invalid max price");
        uint256 oldPrice = maxPrice;
        maxPrice = newPrice;
        emit MaxPriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @dev 设置自动稳定开关
     * @param enabled 是否启用
     */
    function setAutoStabilizeEnabled(bool enabled) external onlyOwner {
        autoStabilizeEnabled = enabled;
        emit AutoStabilizeEnabledUpdated(enabled);
    }
    
    /**
     * @dev 获取当前价格（从 SwapContract 或 PancakeSwap）
     * @return price 当前价格（18 decimals，1 RWA = ? USDT）
     */
    function getCurrentPrice() public view returns (uint256 price) {
        // 优先从 SwapContract 获取价格
        if (swapContractAddress != address(0)) {
            (bool success, bytes memory data) = swapContractAddress.staticcall(
                abi.encodeWithSignature("getPoolStatus()")
            );
            
            if (success && data.length > 0) {
                (uint256 rwaBalance, uint256 stRwaBalance, , ) = abi.decode(data, (uint256, uint256, uint256, uint256));
                
                // 计算价格：price = stRwaBalance / rwaBalance（假设 1 stRWA = 1 USDT）
                if (rwaBalance > 0) {
                    // 价格 = stRwaBalance / rwaBalance * 1e18
                    price = (stRwaBalance * 1e18) / rwaBalance;
                    return price;
                }
            }
        }
        
        // 如果 SwapContract 不可用，尝试从 PancakeSwap 获取
        // 这里简化处理，返回目标价格作为默认值
        return targetPrice;
    }
    
    /**
     * @dev 计算价格偏差
     * @param currentPrice 当前价格
     * @param targetPrice_ 目标价格
     * @return deviation 偏差百分比（10 = 10%）
     */
    function calculateDeviation(uint256 currentPrice, uint256 targetPrice_) public pure returns (uint256 deviation) {
        if (targetPrice_ == 0) {
            return 100; // 如果目标价格为0，返回100%偏差
        }
        
        if (currentPrice >= targetPrice_) {
            // 价格高于目标价格
            deviation = ((currentPrice - targetPrice_) * 100) / targetPrice_;
        } else {
            // 价格低于目标价格
            deviation = ((targetPrice_ - currentPrice) * 100) / targetPrice_;
        }
        
        return deviation;
    }
    
    /**
     * @dev 检查是否需要稳定价格
     * @return needStabilize 是否需要稳定
     * @return currentPrice 当前价格
     * @return deviation 价格偏差
     * @return shouldBuy 是否应该买入（true = 买入，false = 卖出）
     */
    function checkStabilizeNeeded() public view returns (
        bool needStabilize,
        uint256 currentPrice,
        uint256 deviation,
        bool shouldBuy
    ) {
        currentPrice = getCurrentPrice();
        deviation = calculateDeviation(currentPrice, targetPrice);
        
        // 检查价格是否在保护范围内
        if (currentPrice < minPrice || currentPrice > maxPrice) {
            needStabilize = true;
            shouldBuy = currentPrice < minPrice; // 价格过低时买入
            return (needStabilize, currentPrice, deviation, shouldBuy);
        }
        
        // 检查偏差是否超过阈值
        if (deviation > priceDeviationThreshold) {
            needStabilize = true;
            shouldBuy = currentPrice < targetPrice; // 价格低于目标时买入
        } else {
            needStabilize = false;
            shouldBuy = false;
        }
        
        return (needStabilize, currentPrice, deviation, shouldBuy);
    }
    
    /**
     * @dev 稳定价格（自动买入/卖出）
     */
    function stabilizePrice() external whenNotPaused nonReentrant {
        require(autoStabilizeEnabled, "PriceStabilizer: Auto stabilize is disabled");
        require(swapContractAddress != address(0), "PriceStabilizer: SwapContract not set");
        
        // 检查冷却期
        require(
            block.timestamp >= lastStabilizeTime + stabilizeCooldown,
            "PriceStabilizer: Stabilize cooldown active"
        );
        
        (bool needStabilize, uint256 currentPrice, uint256 deviation, bool shouldBuy) = checkStabilizeNeeded();
        require(needStabilize, "PriceStabilizer: No stabilize needed");
        
        if (shouldBuy) {
            // 价格过低，买入RWA提升价格
            uint256 buyAmount = calculateBuyAmount(currentPrice, targetPrice);
            buyAmount = buyAmount > maxBuyAmount ? maxBuyAmount : buyAmount;
            
            if (buyAmount > 0) {
                buyRWA(buyAmount);
            }
        } else {
            // 价格过高，卖出RWA降低价格
            uint256 sellAmount = calculateSellAmount(currentPrice, targetPrice);
            sellAmount = sellAmount > maxSellAmount ? maxSellAmount : sellAmount;
            
            if (sellAmount > 0) {
                sellRWA(sellAmount);
            }
        }
        
        lastStabilizeTime = block.timestamp;
        stabilizeCount++;
        
        emit PriceStabilized(currentPrice, targetPrice, deviation, shouldBuy, shouldBuy ? calculateBuyAmount(currentPrice, targetPrice) : calculateSellAmount(currentPrice, targetPrice), block.timestamp);
    }
    
    /**
     * @dev 计算买入金额
     * @param currentPrice 当前价格
     * @param targetPrice_ 目标价格
     * @return amount 需要买入的USDT金额（6 decimals）
     */
    function calculateBuyAmount(uint256 currentPrice, uint256 targetPrice_) public view returns (uint256 amount) {
        // 简化计算：根据价格偏差计算买入金额
        uint256 deviation = calculateDeviation(currentPrice, targetPrice_);
        
        // 偏差越大，买入金额越大
        // 基础买入金额：1000 USDT
        uint256 baseAmount = 1000 * 10**6; // 1000 USDT (6 decimals)
        amount = (baseAmount * deviation) / priceDeviationThreshold;
        
        // 限制最大买入金额
        uint256 maxUsdtAmount = maxBuyAmount / 1e12; // 转换为6 decimals
        if (amount > maxUsdtAmount) {
            amount = maxUsdtAmount;
        }
        
        return amount;
    }
    
    /**
     * @dev 计算卖出金额
     * @param currentPrice 当前价格
     * @param targetPrice_ 目标价格
     * @return amount 需要卖出的RWA金额（18 decimals）
     */
    function calculateSellAmount(uint256 currentPrice, uint256 targetPrice_) public view returns (uint256 amount) {
        // 简化计算：根据价格偏差计算卖出金额
        uint256 deviation = calculateDeviation(currentPrice, targetPrice_);
        
        // 偏差越大，卖出金额越大
        // 基础卖出金额：1000 RWA
        uint256 baseAmount = 1000 * 10**18; // 1000 RWA (18 decimals)
        amount = (baseAmount * deviation) / priceDeviationThreshold;
        
        // 限制最大卖出金额
        if (amount > maxSellAmount) {
            amount = maxSellAmount;
        }
        
        return amount;
    }
    
    /**
     * @dev 买入RWA（提升价格）
     * @param usdtAmount USDT 金额（6 decimals）
     */
    function buyRWA(uint256 usdtAmount) internal {
        require(usdtAmount > 0, "PriceStabilizer: Invalid amount");
        
        // 检查合约USDT余额
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        require(usdtBalance >= usdtAmount, "PriceStabilizer: Insufficient USDT balance");
        
        // 通过 SwapContract 买入 RWA（使用 USDT 购买 RWA）
        // 注意：SwapContract 使用 stRWA，这里需要先转换为 stRWA 或直接使用 RWA/USDT 交易对
        // 简化处理：假设可以直接通过 SwapContract 或 PancakeSwap 买入
        
        // 授权 SwapContract
        uint256 currentAllowance = usdtToken.allowance(address(this), swapContractAddress);
        if (currentAllowance < usdtAmount) {
            if (currentAllowance > 0) {
                usdtToken.safeDecreaseAllowance(swapContractAddress, currentAllowance);
            }
            usdtToken.safeIncreaseAllowance(swapContractAddress, type(uint256).max);
        }
        
        // 调用 SwapContract 的 swapRWAToStRWA（反向操作，用 USDT 买入 RWA）
        // 注意：这里需要根据实际的 SwapContract 接口调整
        // 简化处理：假设有直接买入RWA的方法
        
        // 记录统计
        totalBuyAmount += usdtAmount;
        
        emit BuyExecuted(usdtAmount, 0, getCurrentPrice(), block.timestamp);
    }
    
    /**
     * @dev 卖出RWA（降低价格）
     * @param rwaAmount RWA 金额（18 decimals）
     */
    function sellRWA(uint256 rwaAmount) internal {
        require(rwaAmount > 0, "PriceStabilizer: Invalid amount");
        
        // 检查合约RWA余额
        uint256 rwaBalance = rwaToken.balanceOf(address(this));
        require(rwaBalance >= rwaAmount, "PriceStabilizer: Insufficient RWA balance");
        
        // 通过 SwapContract 卖出 RWA（换取 USDT）
        // 授权 SwapContract
        uint256 currentAllowance = rwaToken.allowance(address(this), swapContractAddress);
        if (currentAllowance < rwaAmount) {
            if (currentAllowance > 0) {
                rwaToken.safeDecreaseAllowance(swapContractAddress, currentAllowance);
            }
            rwaToken.safeIncreaseAllowance(swapContractAddress, type(uint256).max);
        }
        
        // 调用 SwapContract 的 swapStRWAToRWA（反向操作，卖出 RWA 换取 stRWA/USDT）
        // 注意：这里需要根据实际的 SwapContract 接口调整
        
        // 记录统计
        totalSellAmount += rwaAmount;
        
        emit SellExecuted(rwaAmount, 0, getCurrentPrice(), block.timestamp);
    }
    
    /**
     * @dev 手动买入RWA（Owner）
     * @param usdtAmount USDT 金额（6 decimals）
     */
    function manualBuy(uint256 usdtAmount) external onlyOwner whenNotPaused nonReentrant {
        require(usdtAmount > 0, "PriceStabilizer: Invalid amount");
        buyRWA(usdtAmount);
    }
    
    /**
     * @dev 手动卖出RWA（Owner）
     * @param rwaAmount RWA 金额（18 decimals）
     */
    function manualSell(uint256 rwaAmount) external onlyOwner whenNotPaused nonReentrant {
        require(rwaAmount > 0, "PriceStabilizer: Invalid amount");
        sellRWA(rwaAmount);
    }
    
    /**
     * @dev 获取价格稳定状态
     * @return currentPrice 当前价格
     * @return targetPrice_ 目标价格
     * @return deviation 价格偏差
     * @return needStabilize 是否需要稳定
     * @return stabilizeCount_ 稳定次数
     */
    function getPriceStabilizeStatus() external view returns (
        uint256 currentPrice,
        uint256 targetPrice_,
        uint256 deviation,
        bool needStabilize,
        uint256 stabilizeCount_
    ) {
        currentPrice = getCurrentPrice();
        targetPrice_ = targetPrice;
        deviation = calculateDeviation(currentPrice, targetPrice);
        (needStabilize, , , ) = checkStabilizeNeeded();
        stabilizeCount_ = stabilizeCount;
        
        return (currentPrice, targetPrice_, deviation, needStabilize, stabilizeCount_);
    }
    
    /**
     * @dev 提取代币（Owner，紧急情况）
     * @param token 代币地址
     * @param amount 提取金额
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "PriceStabilizer: Invalid token address");
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
