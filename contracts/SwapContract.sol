// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SwapContract
 * @dev 双币互换合约 - stRWA ↔ RWA
 * 
 * 提供内部流动性，不依赖 DEX
 * 简化版：固定 1:1 比例（后续可升级为 AMM 曲线）
 * 
 * 核心功能：
 * - stRWA → RWA 互换（无税）
 * - RWA → stRWA 互换（无税，鼓励持有）
 * - 池子管理（初始化、补充流动性）
 */
contract SwapContract is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // 代币地址
    IERC20 public immutable rwaToken;
    IERC20 public immutable stRwaToken;
    
    // 互换池余额
    uint256 public rwaPoolBalance;
    uint256 public stRwaPoolBalance;
    
    // AMM 常量乘积 k = x * y
    uint256 public constantProduct;
    
    // 互换限额配置
    uint256 public maxDailySwapPerUser = 1000000 * 10**18; // 100万代币/天/用户
    uint256 public maxDailySwapGlobal = 10000000 * 10**18; // 1000万代币/天/全局
    
    // 每日互换记录（user => day => amount）
    mapping(address => mapping(uint256 => uint256)) public dailySwapAmount;
    mapping(uint256 => uint256) public globalDailySwapAmount; // day => amount
    
    // 互换开关（紧急情况下可以暂停）
    bool public swapEnabled = true;
    
    // 事件
    event SwapStRWAToRWA(
        address indexed user,
        uint256 stRwaAmount,
        uint256 rwaAmount
    );
    
    event SwapRWAToStRWA(
        address indexed user,
        uint256 rwaAmount,
        uint256 stRwaAmount
    );
    
    event PoolUpdated(
        uint256 rwaBalance,
        uint256 stRwaBalance
    );
    
    event SwapEnabledUpdated(bool enabled);
    event SwapLimitExceeded(address indexed user, string limitType, uint256 limit, uint256 requested);
    event ConstantProductUpdated(uint256 oldK, uint256 newK);
    
    /**
     * @dev 构造函数
     * @param _rwaToken RWA 代币地址
     * @param _stRwaToken stRWA 代币地址
     */
    constructor(address _rwaToken, address _stRwaToken) Ownable(msg.sender) {
        require(_rwaToken != address(0), "SwapContract: Invalid RWA token address");
        require(_stRwaToken != address(0), "SwapContract: Invalid stRWA token address");
        
        rwaToken = IERC20(_rwaToken);
        stRwaToken = IERC20(_stRwaToken);
    }
    
    /**
     * @dev 初始化互换池（项目方提供初始流动性）
     * 
     * 使用场景：
     * - 合约部署后，项目方提供初始流动性
     * - 建议：至少 10,000 USDT 等值的代币
     * 
     * @param rwaAmount RWA 代币数量（18 decimals）
     * @param stRwaAmount stRWA 代币数量（18 decimals）
     */
    function initializePool(uint256 rwaAmount, uint256 stRwaAmount) external onlyOwner {
        require(rwaPoolBalance == 0 && stRwaPoolBalance == 0, "SwapContract: Pool already initialized");
        require(rwaAmount > 0 && stRwaAmount > 0, "SwapContract: Invalid amounts");
        
        rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
        stRwaToken.safeTransferFrom(msg.sender, address(this), stRwaAmount);
        
        rwaPoolBalance = rwaAmount;
        stRwaPoolBalance = stRwaAmount;
        
        // 初始化常量乘积 k = x * y
        constantProduct = rwaAmount * stRwaAmount;
        
        emit PoolUpdated(rwaPoolBalance, stRwaPoolBalance);
        emit ConstantProductUpdated(0, constantProduct);
    }
    
    /**
     * @dev 计算 AMM 输出金额（基于 x * y = k）
     * @param inputAmount 输入金额
     * @param inputReserve 输入池子余额
     * @param outputReserve 输出池子余额
     * @return outputAmount 输出金额
     */
    function calculateAMMOutput(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) internal pure returns (uint256 outputAmount) {
        require(inputReserve > 0 && outputReserve > 0, "SwapContract: Insufficient liquidity");
        
        // AMM 公式：x * y = k
        // 当输入 inputAmount 时：
        // (inputReserve + inputAmount) * (outputReserve - outputAmount) = k
        // 解出：outputAmount = (inputAmount * outputReserve) / (inputReserve + inputAmount)
        
        uint256 numerator = inputAmount * outputReserve;
        uint256 denominator = inputReserve + inputAmount;
        
        // 防止除零和精度损失
        require(denominator > 0, "SwapContract: Division by zero");
        
        return numerator / denominator;
    }
    
    /**
     * @dev 检查互换限额
     * @param user 用户地址
     * @param amount 互换金额
     * @return allowed 是否允许
     */
    function checkSwapLimit(address user, uint256 amount) internal returns (bool allowed) {
        uint256 today = block.timestamp / 1 days;
        
        // 检查用户每日限额
        uint256 userDailyAmount = dailySwapAmount[user][today];
        if (userDailyAmount + amount > maxDailySwapPerUser) {
            emit SwapLimitExceeded(user, "UserDaily", maxDailySwapPerUser, userDailyAmount + amount);
            return false;
        }
        
        // 检查全局每日限额
        uint256 globalDailyAmount = globalDailySwapAmount[today];
        if (globalDailyAmount + amount > maxDailySwapGlobal) {
            emit SwapLimitExceeded(user, "GlobalDaily", maxDailySwapGlobal, globalDailyAmount + amount);
            return false;
        }
        
        // 更新记录
        dailySwapAmount[user][today] = userDailyAmount + amount;
        globalDailySwapAmount[today] = globalDailyAmount + amount;
        
        return true;
    }
    
    /**
     * @dev stRWA → RWA（使用 AMM 曲线）
     * 
     * AMM 公式：x * y = k
     * 当用户输入 stRwaAmount 时，计算能获得多少 RWA
     * 
     * @param stRwaAmount stRWA 数量（18 decimals）
     */
    function swapStRWAToRWA(uint256 stRwaAmount) external nonReentrant {
        require(swapEnabled, "SwapContract: Swap is disabled");
        require(stRwaAmount > 0, "SwapContract: Amount must be greater than zero");
        require(constantProduct > 0, "SwapContract: Pool not initialized");
        
        // 检查互换限额
        require(checkSwapLimit(msg.sender, stRwaAmount), "SwapContract: Swap limit exceeded");
        
        // 计算 AMM 输出金额
        uint256 rwaAmount = calculateAMMOutput(stRwaAmount, stRwaPoolBalance, rwaPoolBalance);
        require(rwaAmount > 0, "SwapContract: Output amount too small");
        require(rwaPoolBalance >= rwaAmount, "SwapContract: Insufficient RWA pool");
        
        // 从用户转账 stRWA 到合约
        stRwaToken.safeTransferFrom(msg.sender, address(this), stRwaAmount);
        
        // 从合约转账 RWA 给用户
        rwaToken.safeTransfer(msg.sender, rwaAmount);
        
        // 更新池子余额
        stRwaPoolBalance += stRwaAmount;
        rwaPoolBalance -= rwaAmount;
        
        // 更新常量乘积（理论上应该保持不变，但由于整数除法可能有微小误差）
        // 为了保持 k 的准确性，重新计算：k = x * y
        uint256 oldK = constantProduct;
        constantProduct = rwaPoolBalance * stRwaPoolBalance;
        
        emit SwapStRWAToRWA(msg.sender, stRwaAmount, rwaAmount);
        emit PoolUpdated(rwaPoolBalance, stRwaPoolBalance);
        emit ConstantProductUpdated(oldK, constantProduct);
    }
    
    /**
     * @dev RWA → stRWA（使用 AMM 曲线，鼓励持有）
     * 
     * AMM 公式：x * y = k
     * 当用户输入 rwaAmount 时，计算能获得多少 stRWA
     * 
     * @param rwaAmount RWA 数量（18 decimals）
     */
    function swapRWAToStRWA(uint256 rwaAmount) external nonReentrant {
        require(swapEnabled, "SwapContract: Swap is disabled");
        require(rwaAmount > 0, "SwapContract: Amount must be greater than zero");
        require(constantProduct > 0, "SwapContract: Pool not initialized");
        
        // 检查互换限额
        require(checkSwapLimit(msg.sender, rwaAmount), "SwapContract: Swap limit exceeded");
        
        // 计算 AMM 输出金额
        uint256 stRwaAmount = calculateAMMOutput(rwaAmount, rwaPoolBalance, stRwaPoolBalance);
        require(stRwaAmount > 0, "SwapContract: Output amount too small");
        require(stRwaPoolBalance >= stRwaAmount, "SwapContract: Insufficient stRWA pool");
        
        // 从用户转账 RWA 到合约
        rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
        
        // 从合约转账 stRWA 给用户
        stRwaToken.safeTransfer(msg.sender, stRwaAmount);
        
        // 更新池子余额
        rwaPoolBalance += rwaAmount;
        stRwaPoolBalance -= stRwaAmount;
        
        // 更新常量乘积（理论上应该保持不变，但由于整数除法可能有微小误差）
        // 为了保持 k 的准确性，重新计算：k = x * y
        uint256 oldK = constantProduct;
        constantProduct = rwaPoolBalance * stRwaPoolBalance;
        
        emit SwapRWAToStRWA(msg.sender, rwaAmount, stRwaAmount);
        emit PoolUpdated(rwaPoolBalance, stRwaPoolBalance);
        emit ConstantProductUpdated(oldK, constantProduct);
    }
    
    /**
     * @dev 项目方补充流动性
     * 
     * 使用场景：
     * - 池子余额不足时补充
     * - 维持池子健康度
     * 
     * @param rwaAmount RWA 代币数量（18 decimals，0 表示不补充）
     * @param stRwaAmount stRWA 代币数量（18 decimals，0 表示不补充）
     */
    function addLiquidity(uint256 rwaAmount, uint256 stRwaAmount) external onlyOwner {
        if (rwaAmount > 0) {
            rwaToken.safeTransferFrom(msg.sender, address(this), rwaAmount);
            rwaPoolBalance += rwaAmount;
        }
        
        if (stRwaAmount > 0) {
            stRwaToken.safeTransferFrom(msg.sender, address(this), stRwaAmount);
            stRwaPoolBalance += stRwaAmount;
        }
        
        // 更新常量乘积
        if (constantProduct == 0) {
            // 如果还未初始化，初始化 k
            constantProduct = rwaPoolBalance * stRwaPoolBalance;
        } else {
            // 如果已初始化，重新计算 k（补充流动性会增加 k）
            uint256 oldK = constantProduct;
            constantProduct = rwaPoolBalance * stRwaPoolBalance;
            emit ConstantProductUpdated(oldK, constantProduct);
        }
        
        emit PoolUpdated(rwaPoolBalance, stRwaPoolBalance);
    }
    
    /**
     * @dev 设置用户每日互换限额
     * @param newLimit 新的限额（18 decimals）
     */
    function setMaxDailySwapPerUser(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "SwapContract: Invalid limit");
        maxDailySwapPerUser = newLimit;
    }
    
    /**
     * @dev 设置全局每日互换限额
     * @param newLimit 新的限额（18 decimals）
     */
    function setMaxDailySwapGlobal(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "SwapContract: Invalid limit");
        maxDailySwapGlobal = newLimit;
    }
    
    /**
     * @dev 设置互换开关（紧急情况下可以暂停）
     * @param _enabled 是否启用
     */
    function setSwapEnabled(bool _enabled) external onlyOwner {
        require(swapEnabled != _enabled, "SwapContract: Same status");
        swapEnabled = _enabled;
        emit SwapEnabledUpdated(_enabled);
    }
    
    /**
     * @dev 查询池子状态
     * @return rwaBalance RWA 池子余额
     * @return stRwaBalance stRWA 池子余额
     * @return constantProduct_ 常量乘积 k
     * @return swapRate 当前互换比例（基于 AMM 曲线计算）
     */
    function getPoolStatus() external view returns (
        uint256 rwaBalance,
        uint256 stRwaBalance,
        uint256 constantProduct_,
        uint256 swapRate
    ) {
        // 计算当前互换比例（1 stRWA = ? RWA）
        // 使用 AMM 公式计算小额互换的比例
        if (rwaPoolBalance > 0 && stRwaPoolBalance > 0) {
            // 计算 1 stRWA 能换多少 RWA（使用 1e18 作为单位）
            uint256 oneStRWA = 1 * 10**18;
            uint256 rwaOutput = calculateAMMOutput(oneStRWA, stRwaPoolBalance, rwaPoolBalance);
            // swapRate = (rwaOutput / 1e18) * 100，表示百分比
            swapRate = (rwaOutput * 100) / (1 * 10**18);
        } else {
            swapRate = 100; // 默认 1:1
        }
        
        return (rwaPoolBalance, stRwaPoolBalance, constantProduct, swapRate);
    }
    
    /**
     * @dev 查询当前互换比例（基于 AMM 曲线）
     * @param amount 互换金额（用于计算实际比例）
     * @param isStRWAToRWA true = stRWA → RWA, false = RWA → stRWA
     * @return outputAmount 输出金额
     * @return swapRate 互换比例（百分比，100 = 1:1）
     */
    function getSwapRate(uint256 amount, bool isStRWAToRWA) external view returns (
        uint256 outputAmount,
        uint256 swapRate
    ) {
        if (constantProduct == 0 || amount == 0) {
            return (0, 100); // 默认 1:1
        }
        
        if (isStRWAToRWA) {
            outputAmount = calculateAMMOutput(amount, stRwaPoolBalance, rwaPoolBalance);
        } else {
            outputAmount = calculateAMMOutput(amount, rwaPoolBalance, stRwaPoolBalance);
        }
        
        // 计算比例：outputAmount / amount * 100
        swapRate = (outputAmount * 100) / amount;
        
        return (outputAmount, swapRate);
    }
    
    /**
     * @dev 获取用户今日互换金额
     * @param user 用户地址
     * @return amount 今日互换金额
     */
    function getUserDailySwapAmount(address user) external view returns (uint256 amount) {
        uint256 today = block.timestamp / 1 days;
        return dailySwapAmount[user][today];
    }
    
    /**
     * @dev 获取全局今日互换金额
     * @return amount 今日互换金额
     */
    function getGlobalDailySwapAmount() external view returns (uint256 amount) {
        uint256 today = block.timestamp / 1 days;
        return globalDailySwapAmount[today];
    }
}
