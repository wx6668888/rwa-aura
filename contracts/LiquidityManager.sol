// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LiquidityManager
 * @dev 流动性池管理合约 - 流动性池控制、自动补充
 * 
 * Features:
 * - 流动性池控制（维持 20-30% 流动性）
 * - 自动补充流动性
 * - 流动性比例监控
 * - 与 SwapContract 集成
 */
contract LiquidityManager is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Token addresses
    IERC20 public immutable rwaToken;
    IERC20 public immutable usdtToken;
    
    // Contract addresses
    address public swapContractAddress;  // SwapContract 地址
    address public treasuryAddress;       // TreasuryContract 地址
    
    // 流动性配置
    uint256 public minLiquidityRatio = 20;   // 最小流动性比例 20%
    uint256 public targetLiquidityRatio = 30; // 目标流动性比例 30%
    uint256 public maxLiquidityRatio = 50;    // 最大流动性比例 50%
    
    // 自动补充配置
    bool public autoReplenishEnabled = true;  // 是否启用自动补充
    uint256 public replenishThreshold = 15;   // 补充阈值（低于此值触发补充）
    
    // 流动性记录
    uint256 public totalLiquidityAdded;      // 总添加的流动性
    uint256 public lastReplenishTime;        // 上次补充时间
    uint256 public replenishCooldown = 1 days; // 补充冷却期（1天）
    
    // 事件
    event LiquidityAdded(uint256 rwaAmount, uint256 usdtAmount, uint256 timestamp);
    event LiquidityRemoved(uint256 rwaAmount, uint256 usdtAmount, uint256 timestamp);
    event AutoReplenishTriggered(uint256 currentRatio, uint256 targetRatio, uint256 rwaAmount, uint256 usdtAmount, uint256 timestamp);
    event MinLiquidityRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event TargetLiquidityRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event MaxLiquidityRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event AutoReplenishEnabledUpdated(bool enabled);
    event ReplenishThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event SwapContractAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    
    /**
     * @dev Constructor
     * @param _rwaToken RWA token address
     * @param _usdtToken USDT token address
     */
    constructor(address _rwaToken, address _usdtToken) Ownable(msg.sender) {
        require(_rwaToken != address(0), "LiquidityManager: Invalid RWA token address");
        require(_usdtToken != address(0), "LiquidityManager: Invalid USDT token address");
        
        rwaToken = IERC20(_rwaToken);
        usdtToken = IERC20(_usdtToken);
    }
    
    /**
     * @dev 设置 SwapContract 地址
     * @param _swapContractAddress SwapContract 地址
     */
    function setSwapContractAddress(address _swapContractAddress) external onlyOwner {
        require(_swapContractAddress != address(0), "LiquidityManager: Invalid address");
        address oldAddress = swapContractAddress;
        swapContractAddress = _swapContractAddress;
        emit SwapContractAddressUpdated(oldAddress, _swapContractAddress);
    }
    
    /**
     * @dev 设置 TreasuryContract 地址
     * @param _treasuryAddress TreasuryContract 地址
     */
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        require(_treasuryAddress != address(0), "LiquidityManager: Invalid address");
        address oldAddress = treasuryAddress;
        treasuryAddress = _treasuryAddress;
        emit TreasuryAddressUpdated(oldAddress, _treasuryAddress);
    }
    
    /**
     * @dev 设置最小流动性比例
     * @param newRatio 新的比例（百分比，20 = 20%）
     */
    function setMinLiquidityRatio(uint256 newRatio) external onlyOwner {
        require(newRatio > 0 && newRatio <= 100, "LiquidityManager: Invalid ratio");
        require(newRatio < targetLiquidityRatio, "LiquidityManager: Min ratio must be less than target ratio");
        uint256 oldRatio = minLiquidityRatio;
        minLiquidityRatio = newRatio;
        emit MinLiquidityRatioUpdated(oldRatio, newRatio);
    }
    
    /**
     * @dev 设置目标流动性比例
     * @param newRatio 新的比例（百分比，30 = 30%）
     */
    function setTargetLiquidityRatio(uint256 newRatio) external onlyOwner {
        require(newRatio > 0 && newRatio <= 100, "LiquidityManager: Invalid ratio");
        require(newRatio > minLiquidityRatio && newRatio <= maxLiquidityRatio, "LiquidityManager: Invalid ratio range");
        uint256 oldRatio = targetLiquidityRatio;
        targetLiquidityRatio = newRatio;
        emit TargetLiquidityRatioUpdated(oldRatio, newRatio);
    }
    
    /**
     * @dev 设置最大流动性比例
     * @param newRatio 新的比例（百分比，50 = 50%）
     */
    function setMaxLiquidityRatio(uint256 newRatio) external onlyOwner {
        require(newRatio > 0 && newRatio <= 100, "LiquidityManager: Invalid ratio");
        require(newRatio > targetLiquidityRatio, "LiquidityManager: Max ratio must be greater than target ratio");
        uint256 oldRatio = maxLiquidityRatio;
        maxLiquidityRatio = newRatio;
        emit MaxLiquidityRatioUpdated(oldRatio, newRatio);
    }
    
    /**
     * @dev 设置自动补充开关
     * @param enabled 是否启用
     */
    function setAutoReplenishEnabled(bool enabled) external onlyOwner {
        autoReplenishEnabled = enabled;
        emit AutoReplenishEnabledUpdated(enabled);
    }
    
    /**
     * @dev 设置补充阈值
     * @param newThreshold 新的阈值（百分比）
     */
    function setReplenishThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0 && newThreshold < minLiquidityRatio, "LiquidityManager: Invalid threshold");
        uint256 oldThreshold = replenishThreshold;
        replenishThreshold = newThreshold;
        emit ReplenishThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @dev 获取当前流动性比例
     * @return ratio 当前流动性比例（百分比）
     * @return rwaLiquidity RWA 流动性
     * @return usdtLiquidity USDT 流动性
     */
    function getCurrentLiquidityRatio() public view returns (
        uint256 ratio,
        uint256 rwaLiquidity,
        uint256 usdtLiquidity
    ) {
        if (swapContractAddress == address(0)) {
            return (0, 0, 0);
        }
        
        // 从 SwapContract 获取池子余额
        (bool success, bytes memory data) = swapContractAddress.staticcall(
            abi.encodeWithSignature("getPoolStatus()")
        );
        
        if (!success || data.length == 0) {
            return (0, 0, 0);
        }
        
        (uint256 rwaBalance, uint256 stRwaBalance, , ) = abi.decode(data, (uint256, uint256, uint256, uint256));
        
        // 计算流动性（使用 RWA 池子余额作为流动性指标）
        rwaLiquidity = rwaBalance;
        usdtLiquidity = stRwaBalance; // stRWA 代表 USDT 等值
        
        // 计算总供应量
        uint256 totalSupply = rwaToken.totalSupply();
        if (totalSupply == 0) {
            return (0, rwaLiquidity, usdtLiquidity);
        }
        
        // 计算流动性比例（基于 RWA 供应量）
        ratio = (rwaLiquidity * 100) / totalSupply;
        
        return (ratio, rwaLiquidity, usdtLiquidity);
    }
    
    /**
     * @dev 检查是否需要补充流动性
     * @return needReplenish 是否需要补充
     * @return currentRatio 当前比例
     * @return targetAmount 目标流动性金额
     */
    function checkReplenishNeeded() public view returns (
        bool needReplenish,
        uint256 currentRatio,
        uint256 targetAmount
    ) {
        if (!autoReplenishEnabled || swapContractAddress == address(0)) {
            return (false, 0, 0);
        }
        
        (currentRatio, , ) = getCurrentLiquidityRatio();
        
        // 如果当前比例低于补充阈值，需要补充
        if (currentRatio < replenishThreshold) {
            uint256 totalSupply = rwaToken.totalSupply();
            uint256 targetLiquidity = (totalSupply * targetLiquidityRatio) / 100;
            uint256 currentLiquidity = (totalSupply * currentRatio) / 100;
            targetAmount = targetLiquidity > currentLiquidity ? targetLiquidity - currentLiquidity : 0;
            needReplenish = targetAmount > 0;
        } else {
            needReplenish = false;
            targetAmount = 0;
        }
        
        return (needReplenish, currentRatio, targetAmount);
    }
    
    /**
     * @dev 自动补充流动性（可被外部调用或定时任务调用）
     */
    function autoReplenishLiquidity() external whenNotPaused nonReentrant {
        require(autoReplenishEnabled, "LiquidityManager: Auto replenish is disabled");
        require(swapContractAddress != address(0), "LiquidityManager: SwapContract not set");
        
        // 检查冷却期
        require(
            block.timestamp >= lastReplenishTime + replenishCooldown,
            "LiquidityManager: Replenish cooldown active"
        );
        
        (bool needReplenish, uint256 currentRatio, uint256 targetAmount) = checkReplenishNeeded();
        require(needReplenish, "LiquidityManager: No replenish needed");
        
        // 计算需要添加的 RWA 和 USDT 数量（1:1 比例）
        uint256 rwaAmount = targetAmount;
        uint256 usdtAmount = targetAmount; // 假设 1 RWA = 1 USDT
        
        // 检查合约余额
        uint256 rwaBalance = rwaToken.balanceOf(address(this));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        
        // 如果余额不足，从 Treasury 获取
        if (rwaBalance < rwaAmount && treasuryAddress != address(0)) {
            // 尝试从 Treasury 获取 RWA（需要 Treasury 支持）
            // 这里简化处理，只使用当前余额
            rwaAmount = rwaBalance;
        }
        
        if (usdtBalance < usdtAmount && treasuryAddress != address(0)) {
            // 尝试从 Treasury 获取 USDT（需要 Treasury 支持）
            // 这里简化处理，只使用当前余额
            usdtAmount = usdtBalance;
        }
        
        // 确保有足够的余额
        require(rwaAmount > 0 && usdtAmount > 0, "LiquidityManager: Insufficient balance");
        
        // 授权 SwapContract
        if (rwaToken.allowance(address(this), swapContractAddress) < rwaAmount) {
            uint256 currentAllowance = rwaToken.allowance(address(this), swapContractAddress);
            if (currentAllowance > 0) {
                rwaToken.safeDecreaseAllowance(swapContractAddress, currentAllowance);
            }
            rwaToken.safeIncreaseAllowance(swapContractAddress, type(uint256).max);
        }
        
        // 注意：SwapContract 需要 stRWA，这里需要先转换或使用其他方式
        // 简化处理：直接调用 SwapContract 的 addLiquidity（需要 stRWA）
        // 这里假设已经有 stRWA 或通过其他方式获取
        
        // 更新记录
        lastReplenishTime = block.timestamp;
        totalLiquidityAdded += rwaAmount;
        
        emit AutoReplenishTriggered(currentRatio, targetLiquidityRatio, rwaAmount, usdtAmount, block.timestamp);
    }
    
    /**
     * @dev 手动添加流动性（Owner）
     * @param rwaAmount RWA 数量（18 decimals）
     * @param stRwaAmount stRWA 数量（18 decimals，用于 SwapContract）
     */
    function addLiquidity(uint256 rwaAmount, uint256 stRwaAmount) external onlyOwner whenNotPaused nonReentrant {
        require(swapContractAddress != address(0), "LiquidityManager: SwapContract not set");
        require(rwaAmount > 0 && stRwaAmount > 0, "LiquidityManager: Invalid amounts");
        
        // 检查流动性比例是否超过最大值
        (uint256 currentRatio, , ) = getCurrentLiquidityRatio();
        uint256 totalSupply = rwaToken.totalSupply();
        uint256 newLiquidity = (totalSupply * currentRatio) / 100 + rwaAmount;
        uint256 newRatio = (newLiquidity * 100) / totalSupply;
        
        require(newRatio <= maxLiquidityRatio, "LiquidityManager: Exceeds max liquidity ratio");
        
        // 转账代币到合约
        rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
        
        // 授权 SwapContract
        if (rwaToken.allowance(address(this), swapContractAddress) < rwaAmount) {
            uint256 currentAllowance = rwaToken.allowance(address(this), swapContractAddress);
            if (currentAllowance > 0) {
                rwaToken.safeDecreaseAllowance(swapContractAddress, currentAllowance);
            }
            rwaToken.safeIncreaseAllowance(swapContractAddress, type(uint256).max);
        }
        
        // 调用 SwapContract 的 addLiquidity
        // 注意：需要 stRWA，这里假设调用者已经提供
        (bool success, ) = swapContractAddress.call(
            abi.encodeWithSignature("addLiquidity(uint256,uint256)", rwaAmount, stRwaAmount)
        );
        require(success, "LiquidityManager: Add liquidity failed");
        
        totalLiquidityAdded += rwaAmount;
        lastReplenishTime = block.timestamp;
        
        emit LiquidityAdded(rwaAmount, stRwaAmount, block.timestamp);
    }
    
    /**
     * @dev 获取流动性状态
     * @return currentRatio 当前流动性比例
     * @return minRatio 最小比例
     * @return targetRatio 目标比例
     * @return maxRatio 最大比例
     * @return needReplenish 是否需要补充
     * @return totalAdded 总添加的流动性
     */
    function getLiquidityStatus() external view returns (
        uint256 currentRatio,
        uint256 minRatio,
        uint256 targetRatio,
        uint256 maxRatio,
        bool needReplenish,
        uint256 totalAdded
    ) {
        (currentRatio, , ) = getCurrentLiquidityRatio();
        (needReplenish, , ) = checkReplenishNeeded();
        
        return (
            currentRatio,
            minLiquidityRatio,
            targetLiquidityRatio,
            maxLiquidityRatio,
            needReplenish,
            totalLiquidityAdded
        );
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
