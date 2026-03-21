// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TreasuryContract
 * @dev Treasury 管理合约 - 投资份额、回报分配、月度分红
 * 
 * Features:
 * - 投资份额记录（用户质押的50%进入Treasury）
 * - 投资回报分配（40%用户分红，30%再投资，20%流动性，10%风险准备金）
 * - 月度分红机制
 * - 投资记录管理
 * - 提取限制（每日限额）
 * - 多签控制（可选）
 */
contract TreasuryContract is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Token address
    IERC20 public immutable usdtToken;
    
    // StakingContract address (only StakingContract can deposit)
    address public stakingContractAddress;
    
    // 资金分类
    uint256 public totalDeposited;        // 总存入金额
    uint256 public totalInvested;         // 已投资金额
    uint256 public totalReturns;          // 投资回报总额
    uint256 public totalDistributed;      // 已分配金额
    
    // 用户投资份额记录
    mapping(address => uint256) public userInvestmentShares;
    uint256 public totalInvestmentShares;
    
    // 投资回报分配比例
    uint256 public constant USER_DIVIDEND_SHARE = 40;  // 40% 用户分红
    uint256 public constant REINVEST_SHARE = 30;       // 30% 再投资
    uint256 public constant LIQUIDITY_SHARE = 20;      // 20% 流动性
    uint256 public constant RESERVE_SHARE = 10;       // 10% 风险准备金
    
    // 投资记录
    struct Investment {
        address projectAddress;
        uint256 amount;
        uint256 timestamp;
        uint256 expectedReturn;
        uint256 actualReturn;
        bool isActive;
    }
    
    mapping(uint256 => Investment) public investments;
    uint256 public investmentCounter;
    
    // 提取限制
    uint256 public maxWithdrawalPerDay = 100000 * 10**6;  // 每日最大提取100,000 USDT
    mapping(uint256 => uint256) public dailyWithdrawn;   // 每日已提取金额
    
    // 月度分红记录
    struct MonthlyDividend {
        uint256 month;              // 月份标识（timestamp / 30 days）
        uint256 totalDividend;      // 总分红金额
        uint256 distributedAmount;  // 已分配金额
        bool isDistributed;         // 是否已分配
    }
    
    mapping(uint256 => MonthlyDividend) public monthlyDividends;
    mapping(address => mapping(uint256 => bool)) public userDividendClaimed; // user => month => claimed
    
    // 多签控制（可选）
    address public multiSigWallet;
    bool public multiSigEnabled = false;
    
    // 地址配置
    address public liquidityPoolAddress;  // 流动性池地址
    address public reserveFundAddress;    // 风险准备金地址
    
    // 事件
    event DepositReceived(address indexed from, address indexed user, uint256 amount, uint256 timestamp);
    event InvestmentMade(uint256 indexed investmentId, address projectAddress, uint256 amount, uint256 expectedReturn, uint256 timestamp);
    event ReturnReceived(uint256 indexed investmentId, uint256 amount, uint256 timestamp);
    event DividendDistributed(uint256 indexed month, uint256 totalDividend, uint256 userShare, uint256 reinvest, uint256 liquidity, uint256 reserve, uint256 timestamp);
    event UserDividendClaimed(address indexed user, uint256 indexed month, uint256 amount, uint256 timestamp);
    event WithdrawalMade(address indexed to, uint256 amount, string reason, uint256 timestamp);
    event StakingContractUpdated(address indexed oldAddress, address indexed newAddress);
    event MultiSigWalletUpdated(address indexed oldAddress, address indexed newAddress, bool enabled);
    event LiquidityPoolAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event ReserveFundAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event MaxWithdrawalPerDayUpdated(uint256 oldLimit, uint256 newLimit);
    
    /**
     * @dev Constructor
     * @param _usdtToken USDT token address
     */
    constructor(address _usdtToken) Ownable(msg.sender) {
        require(_usdtToken != address(0), "TreasuryContract: Invalid USDT token address");
        usdtToken = IERC20(_usdtToken);
    }
    
    /**
     * @dev Modifier: Only StakingContract can call
     */
    modifier onlyStakingContract() {
        require(msg.sender == stakingContractAddress, "TreasuryContract: Only staking contract can call");
        _;
    }
    
    /**
     * @dev Modifier: Only Owner or MultiSig can call
     */
    modifier onlyOwnerOrMultiSig() {
        if (multiSigEnabled) {
            require(msg.sender == multiSigWallet, "TreasuryContract: Only multi-sig wallet can call");
        } else {
            require(msg.sender == owner(), "TreasuryContract: Only owner can call");
        }
        _;
    }
    
    /**
     * @dev 接收质押资金（仅 StakingContract 可调用）
     * @param amount 存入金额（6 decimals）
     * @param user 用户地址
     */
    function deposit(uint256 amount, address user) external onlyStakingContract whenNotPaused {
        require(amount > 0, "TreasuryContract: Amount must be greater than zero");
        require(user != address(0), "TreasuryContract: Invalid user address");
        
        // 从 StakingContract 转账 USDT
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // 记录用户投资份额
        userInvestmentShares[user] += amount;
        totalInvestmentShares += amount;
        totalDeposited += amount;
        
        emit DepositReceived(msg.sender, user, amount, block.timestamp);
    }
    
    /**
     * @dev 投资实体项目（仅Owner或多签）
     * @param projectAddress 项目地址
     * @param amount 投资金额（6 decimals）
     * @param expectedReturn 预期回报（6 decimals）
     */
    function invest(
        address projectAddress,
        uint256 amount,
        uint256 expectedReturn
    ) external onlyOwnerOrMultiSig whenNotPaused nonReentrant {
        require(amount > 0, "TreasuryContract: Amount must be greater than zero");
        require(projectAddress != address(0), "TreasuryContract: Invalid project address");
        
        uint256 availableBalance = usdtToken.balanceOf(address(this));
        require(availableBalance >= amount, "TreasuryContract: Insufficient balance");
        
        // 投资到实体项目
        usdtToken.safeTransfer(projectAddress, amount);
        
        // 记录投资
        uint256 investmentId = investmentCounter++;
        investments[investmentId] = Investment({
            projectAddress: projectAddress,
            amount: amount,
            timestamp: block.timestamp,
            expectedReturn: expectedReturn,
            actualReturn: 0,
            isActive: true
        });
        
        totalInvested += amount;
        
        emit InvestmentMade(investmentId, projectAddress, amount, expectedReturn, block.timestamp);
    }
    
    /**
     * @dev 接收投资回报（仅Owner或多签）
     * @param investmentId 投资ID
     * @param returnAmount 回报金额（6 decimals）
     */
    function receiveReturn(
        uint256 investmentId,
        uint256 returnAmount
    ) external onlyOwnerOrMultiSig whenNotPaused nonReentrant {
        require(returnAmount > 0, "TreasuryContract: Return amount must be greater than zero");
        
        Investment storage investment = investments[investmentId];
        require(investment.isActive, "TreasuryContract: Investment not active");
        
        // 从调用者转账回报到合约
        usdtToken.safeTransferFrom(msg.sender, address(this), returnAmount);
        
        investment.actualReturn += returnAmount;
        totalReturns += returnAmount;
        
        // 分配回报
        distributeReturns(returnAmount);
        
        emit ReturnReceived(investmentId, returnAmount, block.timestamp);
    }
    
    /**
     * @dev 分配投资回报
     * @param totalReturn 总回报金额（6 decimals）
     */
    function distributeReturns(uint256 totalReturn) internal {
        uint256 userDividend = (totalReturn * USER_DIVIDEND_SHARE) / 100;
        uint256 reinvest = (totalReturn * REINVEST_SHARE) / 100;
        uint256 liquidity = (totalReturn * LIQUIDITY_SHARE) / 100;
        uint256 reserve = totalReturn - userDividend - reinvest - liquidity; // 确保总和为100%
        
        // 记录月度分红（用户分红部分）
        uint256 currentMonth = block.timestamp / (30 days);
        MonthlyDividend storage monthlyDividend = monthlyDividends[currentMonth];
        
        if (!monthlyDividend.isDistributed) {
            monthlyDividend.month = currentMonth;
            monthlyDividend.totalDividend = userDividend;
            monthlyDividend.distributedAmount = 0;
            monthlyDividend.isDistributed = false;
        } else {
            monthlyDividend.totalDividend += userDividend;
        }
        
        // 再投资（保留在合约中，用于后续投资）
        // reinvest 保留在合约中，不需要转账
        
        // 流动性（转账到流动性池）
        if (liquidity > 0 && liquidityPoolAddress != address(0)) {
            usdtToken.safeTransfer(liquidityPoolAddress, liquidity);
        }
        
        // 风险准备金（转账到风险准备金地址）
        if (reserve > 0 && reserveFundAddress != address(0)) {
            usdtToken.safeTransfer(reserveFundAddress, reserve);
        }
        
        totalDistributed += totalReturn;
        
        emit DividendDistributed(
            currentMonth,
            monthlyDividend.totalDividend,
            userDividend,
            reinvest,
            liquidity,
            reserve,
            block.timestamp
        );
    }
    
    /**
     * @dev 用户领取月度分红
     * @param month 月份标识（timestamp / 30 days）
     */
    function claimMonthlyDividend(uint256 month) external whenNotPaused nonReentrant {
        require(!userDividendClaimed[msg.sender][month], "TreasuryContract: Dividend already claimed");
        
        MonthlyDividend storage monthlyDividend = monthlyDividends[month];
        require(monthlyDividend.isDistributed, "TreasuryContract: Dividend not distributed yet");
        require(monthlyDividend.totalDividend > 0, "TreasuryContract: No dividend for this month");
        
        // 计算用户应得分红
        uint256 userShare = userInvestmentShares[msg.sender];
        if (userShare == 0 || totalInvestmentShares == 0) {
            revert("TreasuryContract: No investment share");
        }
        
        uint256 userDividend = (monthlyDividend.totalDividend * userShare) / totalInvestmentShares;
        require(userDividend > 0, "TreasuryContract: Dividend amount too small");
        
        // 标记为已领取
        userDividendClaimed[msg.sender][month] = true;
        monthlyDividend.distributedAmount += userDividend;
        
        // 转账分红
        usdtToken.safeTransfer(msg.sender, userDividend);
        
        emit UserDividendClaimed(msg.sender, month, userDividend, block.timestamp);
    }
    
    /**
     * @dev 提取资金（仅Owner或多签，有限制）
     * @param to 接收地址
     * @param amount 提取金额（6 decimals）
     * @param reason 提取原因
     */
    function withdraw(
        address to,
        uint256 amount,
        string memory reason
    ) external onlyOwnerOrMultiSig whenNotPaused nonReentrant {
        require(amount > 0, "TreasuryContract: Amount must be greater than zero");
        require(to != address(0), "TreasuryContract: Invalid address");
        
        // 检查每日限额
        uint256 currentDay = block.timestamp / 1 days;
        require(
            dailyWithdrawn[currentDay] + amount <= maxWithdrawalPerDay,
            "TreasuryContract: Daily withdrawal limit exceeded"
        );
        
        // 检查可用余额（不能提取已投资部分）
        uint256 availableBalance = usdtToken.balanceOf(address(this));
        uint256 maxWithdrawable = availableBalance > totalInvested ? availableBalance - totalInvested : 0;
        require(amount <= maxWithdrawable, "TreasuryContract: Cannot withdraw invested funds");
        
        // 更新每日提取记录
        dailyWithdrawn[currentDay] += amount;
        
        // 转账
        usdtToken.safeTransfer(to, amount);
        
        emit WithdrawalMade(to, amount, reason, block.timestamp);
    }
    
    /**
     * @dev 紧急提取（仅Owner，需要更高权限）
     * @param to 接收地址
     * @param amount 提取金额（6 decimals）
     */
    function emergencyWithdraw(
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(to != address(0), "TreasuryContract: Invalid address");
        require(amount > 0, "TreasuryContract: Amount must be greater than zero");
        
        // 紧急情况下可以提取所有资金
        usdtToken.safeTransfer(to, amount);
        
        emit WithdrawalMade(to, amount, "Emergency withdrawal", block.timestamp);
    }
    
    /**
     * @dev 设置 StakingContract 地址
     * @param _stakingContractAddress StakingContract 地址
     */
    function setStakingContractAddress(address _stakingContractAddress) external onlyOwner {
        require(_stakingContractAddress != address(0), "TreasuryContract: Invalid address");
        address oldAddress = stakingContractAddress;
        stakingContractAddress = _stakingContractAddress;
        emit StakingContractUpdated(oldAddress, _stakingContractAddress);
    }
    
    /**
     * @dev 设置多签钱包
     * @param _multiSigWallet 多签钱包地址
     * @param _enabled 是否启用多签
     */
    function setMultiSigWallet(address _multiSigWallet, bool _enabled) external onlyOwner {
        address oldAddress = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        multiSigEnabled = _enabled;
        emit MultiSigWalletUpdated(oldAddress, _multiSigWallet, _enabled);
    }
    
    /**
     * @dev 设置流动性池地址
     * @param _liquidityPoolAddress 流动性池地址
     */
    function setLiquidityPoolAddress(address _liquidityPoolAddress) external onlyOwner {
        address oldAddress = liquidityPoolAddress;
        liquidityPoolAddress = _liquidityPoolAddress;
        emit LiquidityPoolAddressUpdated(oldAddress, _liquidityPoolAddress);
    }
    
    /**
     * @dev 设置风险准备金地址
     * @param _reserveFundAddress 风险准备金地址
     */
    function setReserveFundAddress(address _reserveFundAddress) external onlyOwner {
        address oldAddress = reserveFundAddress;
        reserveFundAddress = _reserveFundAddress;
        emit ReserveFundAddressUpdated(oldAddress, _reserveFundAddress);
    }
    
    /**
     * @dev 设置每日最大提取限额
     * @param newLimit 新的限额（6 decimals）
     */
    function setMaxWithdrawalPerDay(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "TreasuryContract: Invalid limit");
        uint256 oldLimit = maxWithdrawalPerDay;
        maxWithdrawalPerDay = newLimit;
        emit MaxWithdrawalPerDayUpdated(oldLimit, newLimit);
    }
    
    /**
     * @dev 查询用户投资份额
     * @param user 用户地址
     * @return share 投资份额
     */
    function getUserInvestmentShare(address user) external view returns (uint256 share) {
        return userInvestmentShares[user];
    }
    
    /**
     * @dev 查询用户应得分红（基于总分红金额）
     * @param user 用户地址
     * @param totalDividend 总分红金额
     * @return dividend 用户应得分红
     */
    function getUserDividend(address user, uint256 totalDividend) external view returns (uint256 dividend) {
        if (totalInvestmentShares == 0) {
            return 0;
        }
        return (totalDividend * userInvestmentShares[user]) / totalInvestmentShares;
    }
    
    /**
     * @dev 查询用户月度分红
     * @param user 用户地址
     * @param month 月份标识
     * @return dividend 用户应得分红
     * @return claimed 是否已领取
     */
    function getUserMonthlyDividend(address user, uint256 month) external view returns (uint256 dividend, bool claimed) {
        MonthlyDividend storage monthlyDividend = monthlyDividends[month];
        if (!monthlyDividend.isDistributed || monthlyDividend.totalDividend == 0) {
            return (0, false);
        }
        
        if (totalInvestmentShares == 0) {
            return (0, false);
        }
        
        uint256 userShare = userInvestmentShares[user];
        dividend = (monthlyDividend.totalDividend * userShare) / totalInvestmentShares;
        claimed = userDividendClaimed[user][month];
        
        return (dividend, claimed);
    }
    
    /**
     * @dev 查询投资信息
     * @param investmentId 投资ID
     * @return investment 投资信息
     */
    function getInvestment(uint256 investmentId) external view returns (Investment memory investment) {
        return investments[investmentId];
    }
    
    /**
     * @dev 查询合约状态
     * @return totalDeposited_ 总存入金额
     * @return totalInvested_ 已投资金额
     * @return totalReturns_ 投资回报总额
     * @return totalDistributed_ 已分配金额
     * @return totalInvestmentShares_ 总投资份额
     * @return availableBalance 可用余额
     */
    function getTreasuryStatus() external view returns (
        uint256 totalDeposited_,
        uint256 totalInvested_,
        uint256 totalReturns_,
        uint256 totalDistributed_,
        uint256 totalInvestmentShares_,
        uint256 availableBalance
    ) {
        totalDeposited_ = totalDeposited;
        totalInvested_ = totalInvested;
        totalReturns_ = totalReturns;
        totalDistributed_ = totalDistributed;
        totalInvestmentShares_ = totalInvestmentShares;
        availableBalance = usdtToken.balanceOf(address(this));
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
