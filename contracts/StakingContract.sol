// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev 紧凑 revert，避免主网 24KB 限制
error Staking_R();

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MetaStakingExtension.sol";

interface IStRWA {
    function burn(address from, uint256 amount) external;
}

interface IReferralRewardPool {
    function recordReferralReward(
        address referrer,
        address referee,
        uint256 stakeAmount,
        uint256 rewardAmount,
        uint8 userLevel
    ) external;
}

/**
 * @title StakingContract
 * @dev Core staking contract for RWA Tokenization Protocol
 * 
 * Features:
 * - 50/50 fund allocation (50% Treasury, 50% Contract). User principal withdrawal pays full amount (100%); when contract 50% is insufficient, admin tops up from treasury.
 * - Permanent referral relationship binding
 * - Unique stakeId generation and tracking
 * - USDT precision conversion (6 decimals to 18 decimals)
 * - Withdrawal with cooldown and fee
 * - Emergency withdrawal mechanism
 */
contract StakingContract is Ownable, Pausable, ReentrancyGuard, MetaStakingExtension {
    using SafeERC20 for IERC20;
    
    // Token addresses (immutable for gas optimization)
    IERC20 public immutable usdtToken;
    IERC20 public immutable rwaToken;
    IERC20 public stRwaToken; // stRWA 代币地址（可设置，因为需要先部署 StRWA）
    
    // System addresses：treasury 仍不可变；backend 允许 owner 轮换（被盗等应急场景需重新部署本版合约或迁移）
    address public immutable treasuryAddress;
    address public backendAddress;
    address public buybackAddress;
    address public referralRewardPool; // 推荐奖励池地址
    
    // Precision constants
    uint256 private constant USDT_DECIMALS = 6;
    uint256 private constant INTERNAL_DECIMALS = 18;
    uint256 private constant PRECISION_MULTIPLIER = 1e12; // 10^12 (pre-calculated for gas optimization)
    
    // Withdrawal configuration
    uint256 public constant WITHDRAWAL_FEE_RATE = 8; // 8%
    uint256 public constant BUYBACK_FEE_RATE = 3; // 3%
    uint256 public constant TREASURY_FEE_RATE = 3; // 3%
    uint256 public constant POOL_FEE_RATE = 2; // 2%
    uint256 public constant ST_RWA_LOCK_DURATION = 30 days;
    uint256 public constant WITHDRAWAL_COOLDOWN = 24 hours;
    uint256 public constant MIN_WITHDRAWAL_AMOUNT = 100 * 10 ** INTERNAL_DECIMALS; // 100 tokens (RWA or USDT equivalent)
    
    // Reward limits
    uint256 public maxRewardPerCall = 10000 * 10 ** INTERNAL_DECIMALS; // 10000 USDT equivalent
    
    // Multiple cap configuration
    uint256 public constant SINGLE_CAP_MULTIPLIER = 50; // Single reward ≤ staked × 50% (in basis points)
    uint256 public constant DAILY_CAP_MULTIPLIER = 15; // Daily rewards ≤ staked × 15% (in basis points)
    uint256 public constant SOFT_LANDING_THRESHOLD = 45; // Soft landing starts at 45% (in basis points)
    uint256 public constant SOFT_LANDING_REDUCTION_RATE = 2; // 2% reduction per 1% above threshold
    
    // Global statistics
    uint256 public totalStaked; // Total staked amount (18 decimals)
    uint256 public totalDynamicRewardsPaid; // Total dynamic rewards paid (18 decimals)
    /// @dev 公开以便迁移后对齐老合约 stakeId，避免新质押与已迁移 stakeId 冲突
    uint256 public stakesCounter; // Auto-increment counter for stakeId
    
    // Daily reward tracking (user => day => amount)
    // day = block.timestamp / 1 days
    mapping(address => mapping(uint256 => uint256)) public dailyRewards;
    
    // Stake record for weighted average holding period calculation
    struct StakeRecord {
        uint256 amount;      // Staked amount (18 decimals)
        uint256 timestamp;   // Stake timestamp
    }
    
    // Lock period mapping: stakeId => lockPeriod (0=flexible, 30, 90, 180, 365 days)
    mapping(uint256 => uint256) public stakeLockPeriods;

    struct USDTLockedPrincipal {
        uint256 stakeId;
        uint256 totalAmount;       // Full original stake amount (18 decimals)
        uint256 principalAmount;   // Refundable principal kept in contract (18 decimals)
        uint256 lockStartTime;
        uint256 lockEndTime;
        bool isWithdrawn;
        uint256 lockPeriod;
    }
    
    // RWA Staking structures (parallel to USDT staking)
    struct RWAStakeInfo {
        uint256 totalStakedRWA;   // Total staked RWA amount (18 decimals)
        uint256 rwaPending;        // Pending RWA tokens (18 decimals)
        uint256 lastWithdrawTime;  // Last withdrawal timestamp
        address referrer;          // Referrer address
        uint256 firstStakeTime;    // First stake timestamp
        uint8 nodeLevel;           // Node level (1-9)
        bool isActive;             // Whether user has active principal
    }
    
    struct RWALockedPrincipal {
        uint256 stakeId;           // Stake ID
        uint256 totalAmount;       // Full original stake amount (18 decimals)
        uint256 principalAmount;   // Principal amount (RWA, 18 decimals)
        uint256 lockStartTime;     // Lock start time
        uint256 lockEndTime;       // Lock end time
        bool isWithdrawn;          // Whether withdrawn
        uint256 lockPeriod;        // Lock period in days
    }
    
    // USDT staking principal tracking
    mapping(address => USDTLockedPrincipal[]) public usdtLockedPrincipals;
    mapping(address => uint256) public usdtFlexiblePrincipal;
    mapping(address => uint256) public usdtFlexibleTotalStaked;

    // RWA Staking mappings
    mapping(address => RWAStakeInfo) public rwaStakes;
    mapping(address => RWALockedPrincipal[]) public rwaLockedPrincipals;
    /// @dev 未锁仓（灵活）合约侧 50% 记账；提现时按全额（totalStaked）支付，不足时由管理员从国库转入
    mapping(address => uint256) public rwaFlexiblePrincipal;
    mapping(address => uint256) public rwaFlexibleTotalStaked;
    uint256 public totalStakedRWA;  // Global total staked RWA
    
    // User information structure (optimized with packed storage)
    struct UserInfo {
        uint256 totalStaked;        // Total staked amount (18 decimals) - Slot 1
        uint256 rwaPending;         // Pending RWA tokens (18 decimals) - Slot 2
        uint256 usdtRewards;        // Dynamic USDT rewards (18 decimals) - Slot 3
        uint256 lastWithdrawTime;   // Last withdrawal timestamp - Slot 4
        address referrer;           // Referrer address (immutable once set) - Slot 5
        uint256 firstStakeTime;     // First stake timestamp - Slot 6
        uint8 nodeLevel;            // Node level (1-9) - Slot 7 (packed with isActive)
        bool isActive;              // Whether user has active principal - Slot 7 (packed with nodeLevel)
    }
    
    // Mappings
    mapping(address => UserInfo) public users;
    mapping(uint256 => bool) public processedStakes; // Track processed stakeIds
    mapping(address => bool) public whitelist; // Whitelist for fee exemption
    mapping(address => StakeRecord[]) public stakeHistory; // User stake history for weighted average calculation

    /// @dev 锁仓到期后已对该笔 burn 过 stRWA 的标记，提现时不再重复 burn
    mapping(address => mapping(uint256 => bool)) public usdtMaturedStRwaBurned;
    mapping(address => mapping(uint256 => bool)) public rwaMaturedStRwaBurned;

    /// @dev 新部署后一次性从老合约恢复用户态；关闭后不可再写入
    bool public migrationEnabled;
    /// @dev 防止同一用户重复导入导致全局统计翻倍
    mapping(address => bool) public migrationSeen;
    
    // Events
    event StakeEvent(
        address indexed user,
        uint256 amount,
        address indexed referrer,
        uint256 indexed stakeId,
        uint256 timestamp,
        uint256 lockPeriod  // Lock period in days (0=flexible, 30, 90, 180, 365)
    );
    
    event ReferralBound(
        address indexed user,
        address indexed referrer,
        uint256 timestamp
    );
    
    event RewardsUpdated(
        address indexed user,
        uint256 rwAmount,
        uint256 usdtAmount,
        uint256 indexed stakeId,
        uint256 timestamp
    );
    
    event WithdrawalRequested(
        address indexed user,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );
    
    event NodeLevelUpdated(
        address indexed user,
        uint8 oldLevel,
        uint8 newLevel,
        uint256 timestamp
    );
    
    event EmergencyWithdrawal(
        address indexed user,
        uint256 refundAmount,
        uint256 deductedRewards
    );
    
    event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event BackendAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event MaxRewardPerCallUpdated(uint256 newLimit);
    event WhitelistUpdated(address indexed account, bool status);
    event BuybackAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event StRWATokenUpdated(address indexed oldToken, address indexed newToken);
    event StRWAMinted(address indexed user, uint256 amount, uint256 timestamp);
    event TokensBurned(uint256 amount, uint256 timestamp);
    event CapCheckFailed(
        address indexed user,
        string capType,
        uint256 limit,
        uint256 requested,
        uint256 timestamp
    );
    
    // RWA Staking events
    event RWAStakeEvent(
        address indexed user,
        uint256 amount,
        address indexed referrer,
        uint256 indexed stakeId,
        uint256 timestamp,
        uint256 lockPeriod
    );
    
    event RWAPrincipalWithdrawn(
        address indexed user,
        uint256 indexed lockIndex,
        uint256 amount,
        uint256 timestamp
    );
    
    event RWARewardWithdrawn(
        address indexed user,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );

    event USDTPrincipalWithdrawn(
        address indexed user,
        uint256 indexed lockIndex,
        uint256 grossAmount,
        uint256 netAmount,
        uint256 timestamp
    );

    event FlexibleUSDTPrincipalWithdrawn(
        address indexed user,
        uint256 grossAmount,
        uint256 netAmount,
        uint256 timestamp
    );
    
    event FlexibleRWAPrincipalWithdrawn(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event MigrationToggled(bool enabled);
    event MigrationUserImported(
        address indexed user,
        uint256 usdtLockCount,
        uint256 rwaLockCount,
        uint256 globalDeltaTotalStaked,
        uint256 globalDeltaTotalStakedRWA
    );
    
    /**
     * @dev Constructor
     */
    constructor(
        address _usdtToken,
        address _rwaToken,
        address _treasuryAddress,
        address _backendAddress
    ) Ownable(msg.sender) {
        if (!(_usdtToken != address(0))) revert Staking_R();
        if (!(_rwaToken != address(0))) revert Staking_R();
        if (!(_treasuryAddress != address(0))) revert Staking_R();
        if (!(_backendAddress != address(0))) revert Staking_R();
        
        // Immutable variables are assigned directly (stored in code, not storage - saves gas)
        // Note: For immutable variables, we assign them directly in the constructor
        // The compiler will optimize storage - they're stored in the bytecode, not storage slots
        usdtToken = IERC20(_usdtToken);
        rwaToken = IERC20(_rwaToken);
        treasuryAddress = _treasuryAddress;
        backendAddress = _backendAddress;
        buybackAddress = _treasuryAddress;
        
        // Add system addresses to whitelist
        whitelist[_treasuryAddress] = true;
        whitelist[_backendAddress] = true;
        whitelist[msg.sender] = true;
    }

    function setBuybackAddress(address _buybackAddress) external onlyOwner {
        if (!(_buybackAddress != address(0))) revert Staking_R();
        address oldAddress = buybackAddress;
        buybackAddress = _buybackAddress;
        whitelist[_buybackAddress] = true;
        emit BuybackAddressUpdated(oldAddress, _buybackAddress);
    }

    /**
     * @dev 轮换链上 backend（须与服务器 BACKEND_PRIVATE_KEY 一致）。仅 owner 可调用。
     * @notice 已部署的旧合约若为 immutable backend，无法通过本函数修复，需部署包含本逻辑的新合约并迁移。
     */
    function setBackendAddress(address newBackend) external onlyOwner {
        if (!(newBackend != address(0))) revert Staking_R();
        address oldAddress = backendAddress;
        backendAddress = newBackend;
        whitelist[newBackend] = true;
        emit BackendAddressUpdated(oldAddress, newBackend);
    }

    function setReferralRewardPool(address _pool) external onlyOwner {
        if (!(_pool != address(0))) revert Staking_R();
        referralRewardPool = _pool;
    }
    
    /**
     * @dev Set stRWA token address (can be set after StRWA deployment)
     * @param _stRwaToken stRWA 代币地址
     */
    function setStRWAToken(address _stRwaToken) external onlyOwner {
        if (!(_stRwaToken != address(0))) revert Staking_R();
        address oldToken = address(stRwaToken);
        stRwaToken = IERC20(_stRwaToken);
        emit StRWATokenUpdated(oldToken, _stRwaToken);
    }

    /**
     * @dev Return the unified referrer for a user.
     * The protocol now treats referrer as a single identity across USDT and RWA staking.
     */
    function _getUnifiedReferrer(address userAddress) internal view returns (address) {
        address userReferrer = users[userAddress].referrer;
        if (userReferrer != address(0)) {
            return userReferrer;
        }
        return rwaStakes[userAddress].referrer;
    }

    /**
     * @dev Bind a single referrer across both staking modes.
     * If one side was historically bound, sync the other side to the same referrer.
     */
    function _bindUnifiedReferrer(address userAddress, address referrer) internal returns (address) {
        UserInfo storage user = users[userAddress];
        RWAStakeInfo storage rwaStake = rwaStakes[userAddress];

        address existingReferrer = user.referrer != address(0) ? user.referrer : rwaStake.referrer;
        if (existingReferrer != address(0)) {
            if (user.referrer == address(0)) {
                user.referrer = existingReferrer;
            }
            if (rwaStake.referrer == address(0)) {
                rwaStake.referrer = existingReferrer;
            }
            return existingReferrer;
        }

        if (referrer == address(0) || referrer == userAddress) {
            return address(0);
        }

        user.referrer = referrer;
        rwaStake.referrer = referrer;
        emit ReferralBound(userAddress, referrer, block.timestamp);
        return referrer;
    }

    function _splitImmediateFee(uint256 grossAmount) internal pure returns (
        uint256 buybackAmount,
        uint256 treasuryAmount,
        uint256 poolAmount,
        uint256 netAmount
    ) {
        buybackAmount = grossAmount * BUYBACK_FEE_RATE / 100;
        treasuryAmount = grossAmount * TREASURY_FEE_RATE / 100;
        poolAmount = grossAmount * POOL_FEE_RATE / 100;
        netAmount = grossAmount - buybackAmount - treasuryAmount - poolAmount;
    }

    function _payoutUsdtImmediate(address user, uint256 grossAmount) internal returns (uint256 netAmount) {
        uint256 buybackAmount;
        uint256 treasuryAmount;
        uint256 poolAmount;
        (buybackAmount, treasuryAmount, poolAmount, netAmount) = _splitImmediateFee(grossAmount);
        poolAmount;

        usdtToken.safeTransfer(user, netAmount / PRECISION_MULTIPLIER);

        if (buybackAmount > 0) {
            usdtToken.safeTransfer(buybackAddress, buybackAmount / PRECISION_MULTIPLIER);
        }

        if (treasuryAmount > 0) {
            usdtToken.safeTransfer(treasuryAddress, treasuryAmount / PRECISION_MULTIPLIER);
        }
    }

    function _payoutRwaImmediate(address user, uint256 grossAmount) internal returns (uint256 netAmount) {
        uint256 buybackAmount;
        uint256 treasuryAmount;
        uint256 poolAmount;
        (buybackAmount, treasuryAmount, poolAmount, netAmount) = _splitImmediateFee(grossAmount);
        poolAmount;

        rwaToken.safeTransfer(user, netAmount);

        if (buybackAmount > 0) {
            rwaToken.safeTransfer(address(0x000000000000000000000000000000000000dEaD), buybackAmount);
        }

        if (treasuryAmount > 0) {
            rwaToken.safeTransfer(treasuryAddress, treasuryAmount);
        }
    }

    function _decreaseUserStakeTotals(
        address userAddress,
        uint256 usdtAmount,
        uint256 rwaAmount
    ) internal {
        UserInfo storage user = users[userAddress];
        RWAStakeInfo storage rwaStakeInfo = rwaStakes[userAddress];

        if (usdtAmount > 0) {
            if (user.totalStaked <= usdtAmount) {
                user.totalStaked = 0;
            } else {
                unchecked {
                    user.totalStaked -= usdtAmount;
                }
            }
        }

        if (rwaAmount > 0) {
            if (rwaStakeInfo.totalStakedRWA <= rwaAmount) {
                rwaStakeInfo.totalStakedRWA = 0;
            } else {
                unchecked {
                    rwaStakeInfo.totalStakedRWA -= rwaAmount;
                }
            }
        }

        user.isActive = user.totalStaked > 0;
        rwaStakeInfo.isActive = rwaStakeInfo.totalStakedRWA > 0;
    }

    function _mintStRWA(address to, uint256 amount, uint256 lockDuration) internal {
        if (!(address(stRwaToken) != address(0))) revert Staking_R();

        bytes memory data = lockDuration > 0
            ? abi.encodeWithSignature("mintLocked(address,uint256,uint256)", to, amount, lockDuration)
            : abi.encodeWithSignature("mint(address,uint256)", to, amount);

        (bool success, ) = address(stRwaToken).call(data);
        if (!(success)) revert Staking_R();
        emit StRWAMinted(to, amount, block.timestamp);
    }

    /// @dev 从 from 销毁 amount 的 stRWA（仅 StakingContract 可调 StRWA.burn）；应销毁量 = 提现金额×50%
    function _burnStRWA(address from, uint256 amount) internal {
        if (address(stRwaToken) == address(0) || amount == 0) return;
        if (!(IERC20(stRwaToken).balanceOf(from) >= amount)) revert Staking_R();
        IStRWA(address(stRwaToken)).burn(from, amount);
    }
    
    /**
     * @dev Stake USDT tokens
     * @param amount USDT amount (6 decimals)
     * @param referrer Referrer address (optional, only for first stake)
     * @param lockPeriod Lock period in days (0=flexible, 30, 90, 180, 365)
     */
    function stake(uint256 amount, address referrer, uint256 lockPeriod) external nonReentrant whenNotPaused {
        if (!(amount > 0)) revert Staking_R();
        if (!(amount >= 100 * 10 ** USDT_DECIMALS)) revert Staking_R(); // Minimum 100 USDT
        
        // Convert USDT amount to internal precision (6 decimals -> 18 decimals)
        // CRITICAL: Multiply first, then divide to avoid precision loss
        uint256 internalAmount = amount * PRECISION_MULTIPLIER;
        
        // Generate unique stakeId (unchecked for gas optimization - counter won't overflow)
        uint256 stakeId;
        unchecked {
            stakeId = stakesCounter++;
        }
        
        // 50/50：灵活与锁仓均为 50% 国库、50% 合约；提现时按全额支付，不足由管理员从国库转入
        uint256 treasuryAmount = internalAmount / 2;
        uint256 contractAmount = internalAmount - treasuryAmount;
        
        usdtToken.safeTransferFrom(msg.sender, treasuryAddress, treasuryAmount / PRECISION_MULTIPLIER);
        usdtToken.safeTransferFrom(msg.sender, address(this), contractAmount / PRECISION_MULTIPLIER);
        
        // Store lock period (0=flexible, 30, 90, 180, 365)
        if (!(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365)) revert Staking_R();
        stakeLockPeriods[stakeId] = lockPeriod;
        // 注意：质押时不再铸造stRWA，只在提现选择stRWA时才铸造
        
        // Cache user info to reduce storage reads
        UserInfo storage user = users[msg.sender];
        address effectiveReferrer = _bindUnifiedReferrer(msg.sender, referrer);
        
        // Update user info (optimized: single storage access)
        unchecked {
            user.totalStaked += internalAmount;
        }
        user.isActive = true;
        
        if (user.firstStakeTime == 0) {
            user.firstStakeTime = block.timestamp;
            user.nodeLevel = 1; // Default to L1
        }
        
        // Record stake history for weighted average holding period calculation
        stakeHistory[msg.sender].push(StakeRecord({
            amount: internalAmount,
            timestamp: block.timestamp
        }));
        
        // Update global statistics (unchecked for gas optimization)
        unchecked {
            totalStaked += internalAmount;
        }

        if (lockPeriod > 0) {
            usdtLockedPrincipals[msg.sender].push(USDTLockedPrincipal({
                stakeId: stakeId,
                totalAmount: internalAmount,
                principalAmount: contractAmount,
                lockStartTime: block.timestamp,
                lockEndTime: block.timestamp + (lockPeriod * 1 days),
                isWithdrawn: false,
                lockPeriod: lockPeriod
            }));
        } else {
            unchecked {
                usdtFlexiblePrincipal[msg.sender] += contractAmount;
                usdtFlexibleTotalStaked[msg.sender] += internalAmount;
            }
        }
        
        // 记录推荐奖励（不立即发放，等待每周结算）
        // 规则：按推荐人“当时等级”快照写入 ReferralRewardPool，结算时按快照等级计算
        if (effectiveReferrer != address(0) && referralRewardPool != address(0)) {
            uint8 refLevel = users[effectiveReferrer].nodeLevel;
            if (refLevel < 1) refLevel = 1;
            IReferralRewardPool(referralRewardPool).recordReferralReward(
                effectiveReferrer,
                msg.sender,
                internalAmount / PRECISION_MULTIPLIER,
                0,
                refLevel
            );
        }
        
        // Emit stake event
        emit StakeEvent(msg.sender, internalAmount, effectiveReferrer, stakeId, block.timestamp, lockPeriod);
    }

    /**
     * @dev Meta transaction version of stake - gasless for users
     * @param user User address (from signature)
     * @param amount USDT amount (6 decimals)
     * @param referrer Referrer address
     * @param lockPeriod Lock period (0, 30, 90, 180, 365)
     * @param deadline Signature expiration timestamp
     * @param signature EIP-712 signature from user
     */
    function metaStake(
        address user,
        uint256 amount,
        address referrer,
        uint256 lockPeriod,
        uint256 deadline,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        if (!(_verifyStakeSignature(user, amount, referrer, lockPeriod, deadline, signature))) revert Staking_R();
        if (!(amount > 0)) revert Staking_R();
        if (!(amount >= 100 * 10 ** USDT_DECIMALS)) revert Staking_R();
        
        uint256 internalAmount = amount * PRECISION_MULTIPLIER;
        uint256 stakeId;
        unchecked {
            stakeId = stakesCounter++;
        }
        
        uint256 treasuryAmount = internalAmount / 2;
        uint256 contractAmount = internalAmount - treasuryAmount;
        
        usdtToken.safeTransferFrom(user, treasuryAddress, treasuryAmount / PRECISION_MULTIPLIER);
        usdtToken.safeTransferFrom(user, address(this), contractAmount / PRECISION_MULTIPLIER);
        
        if (!(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365)) revert Staking_R();
        stakeLockPeriods[stakeId] = lockPeriod;
        
        UserInfo storage userInfo = users[user];
        address effectiveReferrer = _bindUnifiedReferrer(user, referrer);
        
        unchecked {
            userInfo.totalStaked += internalAmount;
        }
        userInfo.isActive = true;
        
        if (userInfo.firstStakeTime == 0) {
            userInfo.firstStakeTime = block.timestamp;
            userInfo.nodeLevel = 1;
        }
        
        if (lockPeriod == 0) {
            unchecked {
                usdtFlexiblePrincipal[user] += contractAmount;
                usdtFlexibleTotalStaked[user] += internalAmount;
            }
        } else {
            uint256 lockEndTime = block.timestamp + (lockPeriod * 1 days);
            usdtLockedPrincipals[user].push(USDTLockedPrincipal({
                stakeId: stakeId,
                totalAmount: internalAmount,
                principalAmount: contractAmount,
                lockStartTime: block.timestamp,
                lockEndTime: lockEndTime,
                isWithdrawn: false,
                lockPeriod: lockPeriod
            }));
        }
        
        stakeHistory[user].push(StakeRecord({
            amount: internalAmount,
            timestamp: block.timestamp
        }));
        
        unchecked {
            totalStaked += internalAmount;
        }
        
        emit MetaTransactionExecuted(user, msg.sender, "stake");
        emit StakeEvent(user, internalAmount, effectiveReferrer, stakeId, block.timestamp, lockPeriod);
    }

    /**
     * @dev Meta stake with permit - completely gasless
     */
    function metaStakeWithPermit(
        address user,
        uint256 amount,
        address referrer,
        uint256 lockPeriod,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        if (!(_verifyStakeSignature(user, amount, referrer, lockPeriod, deadline, signature))) revert Staking_R();
        
        // Execute permit
        IERC20Permit(address(usdtToken)).permit(user, address(this), amount, deadline, v, r, s);
        
        // Execute stake
        if (!(amount > 0)) revert Staking_R();
        if (!(amount >= 100 * 10 ** USDT_DECIMALS)) revert Staking_R();
        
        uint256 internalAmount = amount * PRECISION_MULTIPLIER;
        uint256 stakeId;
        unchecked {
            stakeId = stakesCounter++;
        }
        
        uint256 treasuryAmount = internalAmount / 2;
        uint256 contractAmount = internalAmount - treasuryAmount;
        
        usdtToken.safeTransferFrom(user, treasuryAddress, treasuryAmount / PRECISION_MULTIPLIER);
        usdtToken.safeTransferFrom(user, address(this), contractAmount / PRECISION_MULTIPLIER);
        
        if (!(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365)) revert Staking_R();
        stakeLockPeriods[stakeId] = lockPeriod;
        
        UserInfo storage userInfo = users[user];
        address effectiveReferrer = _bindUnifiedReferrer(user, referrer);
        
        unchecked {
            userInfo.totalStaked += internalAmount;
        }
        userInfo.isActive = true;
        
        if (userInfo.firstStakeTime == 0) {
            userInfo.firstStakeTime = block.timestamp;
            userInfo.nodeLevel = 1;
        }
        
        if (lockPeriod == 0) {
            unchecked {
                usdtFlexiblePrincipal[user] += contractAmount;
                usdtFlexibleTotalStaked[user] += internalAmount;
            }
        } else {
            uint256 lockEndTime = block.timestamp + (lockPeriod * 1 days);
            usdtLockedPrincipals[user].push(USDTLockedPrincipal({
                stakeId: stakeId,
                totalAmount: internalAmount,
                principalAmount: contractAmount,
                lockStartTime: block.timestamp,
                lockEndTime: lockEndTime,
                isWithdrawn: false,
                lockPeriod: lockPeriod
            }));
        }
        
        stakeHistory[user].push(StakeRecord({
            amount: internalAmount,
            timestamp: block.timestamp
        }));
        
        unchecked {
            totalStaked += internalAmount;
        }
        
        emit MetaTransactionExecuted(user, msg.sender, "stakeWithPermit");
        emit StakeEvent(user, internalAmount, effectiveReferrer, stakeId, block.timestamp, lockPeriod);
    }

    function metaStakeRWAWithPermit(
        address user,
        uint256 amount,
        address referrer,
        uint256 lockPeriod,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        if (!(_verifyStakeRWASignature(user, amount, referrer, lockPeriod, deadline, signature))) revert Staking_R();
        
        // Execute permit
        IERC20Permit(address(rwaToken)).permit(user, address(this), amount, deadline, v, r, s);
        
        // Execute RWA stake
        if (!(amount > 0)) revert Staking_R();
        
        uint256 stakeId;
        unchecked {
            stakeId = stakesCounter++;
        }
        
        rwaToken.safeTransferFrom(user, address(this), amount);
        
        if (!(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365)) revert Staking_R();
        stakeLockPeriods[stakeId] = lockPeriod;
        
        RWAStakeInfo storage rwaStakeInfo = rwaStakes[user];
        address effectiveReferrer = _bindUnifiedReferrer(user, referrer);
        
        // 50/50 split
        uint256 treasuryAmount = amount / 2;
        uint256 contractAmount = amount - treasuryAmount;
        rwaToken.safeTransfer(treasuryAddress, treasuryAmount);
        
        unchecked {
            rwaStakeInfo.totalStakedRWA += amount;
        }
        rwaStakeInfo.isActive = true;
        
        if (rwaStakeInfo.firstStakeTime == 0) {
            rwaStakeInfo.firstStakeTime = block.timestamp;
            rwaStakeInfo.nodeLevel = 1;
        }
        
        if (lockPeriod == 0) {
            unchecked {
                rwaFlexiblePrincipal[user] += contractAmount;
                rwaFlexibleTotalStaked[user] += amount;
            }
        } else {
            uint256 lockEndTime = block.timestamp + (lockPeriod * 1 days);
            rwaLockedPrincipals[user].push(RWALockedPrincipal({
                stakeId: stakeId,
                totalAmount: amount,
                principalAmount: contractAmount,
                lockStartTime: block.timestamp,
                lockEndTime: lockEndTime,
                isWithdrawn: false,
                lockPeriod: lockPeriod
            }));
        }
        
        stakeHistory[user].push(StakeRecord({
            amount: amount,
            timestamp: block.timestamp
        }));
        
        unchecked {
            totalStaked += amount;
        }
        
        emit MetaTransactionExecuted(user, msg.sender, "stakeRWAWithPermit");
        emit RWAStakeEvent(user, amount, effectiveReferrer, stakeId, block.timestamp, lockPeriod);
    }

    function _getReferralRewardRate(uint8 level) internal pure returns (uint256) {
        if (level == 1) return 300;  // 3%
        if (level == 2) return 500;  // 5%
        if (level == 3) return 800;  // 8%
        if (level == 4) return 1200; // 12%
        if (level == 5) return 1700; // 17%
        if (level == 6) return 2300; // 23%
        if (level == 7) return 3000; // 30%
        if (level == 8) return 3500; // 35%
        if (level == 9) return 4000; // 40%
        return 0;
    }
    
    /**
     * @dev Stake RWA tokens
     * @param amount RWA amount (18 decimals)
     * @param referrer Referrer address (optional, only for first stake)
     * @param lockPeriod Lock period in days (0=flexible, 30, 90, 180, 365)
     * NOTE: Minimum stake (100 USDT equivalent) is enforced on the frontend only; contract does not enforce a minimum for RWA.
     */
    function stakeRWA(uint256 amount, address referrer, uint256 lockPeriod) external nonReentrant whenNotPaused {
        if (!(amount > 0)) revert Staking_R();
        
        // Transfer RWA from user
        rwaToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Generate unique stakeId
        uint256 stakeId;
        unchecked {
            stakeId = stakesCounter++;
        }
        
        // 50/50
        uint256 treasuryAmount = amount / 2;
        uint256 contractAmount = amount - treasuryAmount;
        
        rwaToken.safeTransfer(treasuryAddress, treasuryAmount);
        if (!(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365)) revert Staking_R();
        // 注意：质押时不再铸造stRWA，只在提现选择stRWA时才铸造
        
        // Cache user info
        RWAStakeInfo storage rwaStakeInfo = rwaStakes[msg.sender];
        address effectiveReferrer = _bindUnifiedReferrer(msg.sender, referrer);
        
        // Update user info
        unchecked {
            rwaStakeInfo.totalStakedRWA += amount;
        }
        rwaStakeInfo.isActive = true;
        
        if (rwaStakeInfo.firstStakeTime == 0) {
            rwaStakeInfo.firstStakeTime = block.timestamp;
            rwaStakeInfo.nodeLevel = 1; // Default to L1
        }
        
        if (lockPeriod > 0) {
            rwaLockedPrincipals[msg.sender].push(RWALockedPrincipal({
                stakeId: stakeId,
                totalAmount: amount,
                principalAmount: contractAmount,
                lockStartTime: block.timestamp,
                lockEndTime: block.timestamp + (lockPeriod * 1 days),
                isWithdrawn: false,
                lockPeriod: lockPeriod
            }));
        } else {
            unchecked {
                rwaFlexiblePrincipal[msg.sender] += contractAmount;
                rwaFlexibleTotalStaked[msg.sender] += amount;
            }
        }
        
        // Update global statistics
        unchecked {
            totalStakedRWA += amount;
        }
        
        // Record stake history for weighted average holding period calculation
        stakeHistory[msg.sender].push(StakeRecord({
            amount: amount,  // RWA amount (18 decimals)
            timestamp: block.timestamp
        }));
        
        // 记录推荐奖励（不立即发放，等待每周结算）
        // 规则：按推荐人“当时等级”快照写入 ReferralRewardPool，结算时按快照等级计算
        if (effectiveReferrer != address(0) && referralRewardPool != address(0)) {
            uint256 usdtEquivalent = (amount * 85) / 100; // RWA * 0.85
            uint8 refLevel = users[effectiveReferrer].nodeLevel;
            if (refLevel < 1) refLevel = 1;
            IReferralRewardPool(referralRewardPool).recordReferralReward(
                effectiveReferrer,
                msg.sender,
                usdtEquivalent / PRECISION_MULTIPLIER,
                0,
                refLevel
            );
        }
        
        // Emit event
        emit RWAStakeEvent(msg.sender, amount, effectiveReferrer, stakeId, block.timestamp, lockPeriod);
    }

    /**
     * @dev Meta transaction version of stakeRWA - gasless for users
     */
    function metaStakeRWA(
        address user,
        uint256 amount,
        address referrer,
        uint256 lockPeriod,
        uint256 deadline,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        if (!(_verifyStakeRWASignature(user, amount, referrer, lockPeriod, deadline, signature))) revert Staking_R();
        if (!(amount > 0)) revert Staking_R();
        
        rwaToken.safeTransferFrom(user, address(this), amount);
        
        uint256 stakeId;
        unchecked {
            stakeId = stakesCounter++;
        }
        
        uint256 treasuryAmount = amount / 2;
        uint256 contractAmount = amount - treasuryAmount;
        rwaToken.safeTransfer(treasuryAddress, treasuryAmount);
        
        if (!(lockPeriod == 0 || lockPeriod == 30 || lockPeriod == 90 || lockPeriod == 180 || lockPeriod == 365)) revert Staking_R();
        stakeLockPeriods[stakeId] = lockPeriod;
        
        RWAStakeInfo storage rwaStake = rwaStakes[user];
        address effectiveReferrer = _bindUnifiedReferrer(user, referrer);
        
        unchecked {
            rwaStake.totalStakedRWA += amount;
        }
        
        if (lockPeriod > 0) {
            uint256 lockEndTime = block.timestamp + (lockPeriod * 1 days);
            rwaLockedPrincipals[user].push(RWALockedPrincipal({
                stakeId: stakeId,
                totalAmount: amount,
                principalAmount: contractAmount,
                lockStartTime: block.timestamp,
                lockEndTime: lockEndTime,
                isWithdrawn: false,
                lockPeriod: lockPeriod
            }));
        } else {
            unchecked {
                rwaFlexiblePrincipal[user] += contractAmount;
                rwaFlexibleTotalStaked[user] += amount;
            }
        }
        
        unchecked {
            totalStakedRWA += amount;
        }
        
        stakeHistory[user].push(StakeRecord({
            amount: amount,
            timestamp: block.timestamp
        }));
        
        if (effectiveReferrer != address(0) && referralRewardPool != address(0)) {
            uint256 usdtEquivalent = (amount * 85) / 100;
            uint8 refLevel = users[effectiveReferrer].nodeLevel;
            if (refLevel < 1) refLevel = 1;
            IReferralRewardPool(referralRewardPool).recordReferralReward(
                effectiveReferrer,
                user,
                usdtEquivalent / PRECISION_MULTIPLIER,
                0,
                refLevel
            );
        }
        
        emit MetaTransactionExecuted(user, msg.sender, "stakeRWA");
        emit RWAStakeEvent(user, amount, effectiveReferrer, stakeId, block.timestamp, lockPeriod);
    }
    
    /**
     * @dev Get user stake information
     */
    function getUserStakeInfo(address userAddress) external view returns (
        uint256 totalStaked_,
        uint256 rwaPending_,
        uint256 usdtRewards_,
        uint256 lastWithdrawTime_,
        address referrer_,
        uint8 nodeLevel_,
        uint256 firstStakeTime_
    ) {
        UserInfo storage user = users[userAddress];
        return (
            user.totalStaked,
            user.rwaPending,
            user.usdtRewards,
            user.lastWithdrawTime,
            _getUnifiedReferrer(userAddress),
            user.nodeLevel,
            user.firstStakeTime
        );
    }
    
    /**
     * @dev Get user rewards
     */
    function getUserRewards(address userAddress) external view returns (
        uint256 rwaPending_,
        uint256 usdtRewards_
    ) {
        UserInfo storage user = users[userAddress];
        return (user.rwaPending, user.usdtRewards);
    }
    
    /**
     * @dev Get referral info
     */
    function getReferralInfo(address userAddress) external view returns (
        address referrer_,
        bool hasReferrer_
    ) {
        address referrer = _getUnifiedReferrer(userAddress);
        return (referrer, referrer != address(0));
    }
    
    // treasuryAddress 仍为 immutable；backend 可通过 setBackendAddress 由 owner 更新。

    /**
     * @dev Set max reward per call
     */
    function setMaxRewardPerCall(uint256 newLimit) external onlyOwner {
        if (!(newLimit > 0 && newLimit <= 100000 * 10 ** INTERNAL_DECIMALS)) revert Staking_R();
        maxRewardPerCall = newLimit;
        emit MaxRewardPerCallUpdated(newLimit);
    }
    
    /**
     * @dev Set whitelist status
     */
    function setWhitelist(address account, bool status) external onlyOwner {
        if (!(account != address(0))) revert Staking_R();
        whitelist[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    /**
     * @dev Get total dynamic rewards paid
     */
    function getTotalDynamicRewardsPaid() external view returns (uint256) {
        return totalDynamicRewardsPaid;
    }
    
    /**
     * @dev Get total staked
     */
    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }
    
    /**
     * @dev Get user's daily reward for a specific day
     * @param user User address
     * @param day Day number (block.timestamp / 1 days)
     */
    function getUserDailyReward(address user, uint256 day) external view returns (uint256) {
        return dailyRewards[user][day];
    }
    
    /**
     * @dev Get user's today's reward
     * @param user User address
     */
    function getUserTodayReward(address user) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        return dailyRewards[user][today];
    }
    
    /**
     * @dev Get user's personal cap info
     * @param user User address
     * @return totalStaked_ User's total staked amount
     * @return totalRewards_ User's total rewards
     * @return maxRewards_ Maximum allowed rewards (staked × 3)
     * @return remainingCap_ Remaining cap space
     */
    function getUserPersonalCapInfo(address user) external view returns (
        uint256 totalStaked_,
        uint256 totalRewards_,
        uint256 maxRewards_,
        uint256 remainingCap_
    ) {
        UserInfo storage userInfo = users[user];
        totalStaked_ = userInfo.totalStaked;
        totalRewards_ = userInfo.usdtRewards;
        maxRewards_ = type(uint256).max;
        remainingCap_ = type(uint256).max;
    }
    
    /**
     * @dev Get global cap info
     * @return totalStaked_ Total staked amount
     * @return totalRewards_ Total rewards paid
     * @return maxRewards_ Maximum allowed rewards (50% of total staked)
     * @return currentPercentage_ Current percentage (in basis points, 10000 = 100%)
     * @return softLandingActive_ Whether soft landing is active
     */
    function getGlobalCapInfo() external view returns (
        uint256 totalStaked_,
        uint256 totalRewards_,
        uint256 maxRewards_,
        uint256 currentPercentage_,
        bool softLandingActive_
    ) {
        totalStaked_ = totalStaked;
        totalRewards_ = totalDynamicRewardsPaid;
        maxRewards_ = totalStaked / 2;
        
        if (totalStaked > 0) {
            currentPercentage_ = (totalDynamicRewardsPaid * 10000) / totalStaked;
        } else {
            currentPercentage_ = 0;
        }
        
        softLandingActive_ = currentPercentage_ >= (SOFT_LANDING_THRESHOLD * 100);
    }
    
    /**
     * @dev Calculate weighted average holding period for a user
     * @param user User address
     * @return weightedAverageTime Weighted average holding time in seconds
     */
    function calculateWeightedAverageHoldingPeriod(address user) external view returns (uint256 weightedAverageTime) {
        StakeRecord[] memory history = stakeHistory[user];
        
        if (history.length == 0) {
            return 0;
        }
        
        uint256 totalWeightedTime = 0;
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < history.length; i++) {
            uint256 timeWeight = block.timestamp - history[i].timestamp;
            uint256 weight = history[i].amount;
            
            totalWeightedTime += timeWeight * weight;
            totalAmount += weight;
        }
        
        if (totalAmount == 0) {
            return 0;
        }
        
        return totalWeightedTime / totalAmount;
    }
    
    /**
     * @dev Get user stake info with weighted average holding period (for RWAToken)
     * @param user User address
     * @return totalStaked_ Total staked amount
     * @return weightedAverageTime_ Weighted average holding time in seconds
     */
    function getUserStakeInfoForTax(address user) external view returns (
        uint256 totalStaked_,
        uint256 weightedAverageTime_
    ) {
        UserInfo storage userInfo = users[user];
        totalStaked_ = userInfo.totalStaked;
        weightedAverageTime_ = this.calculateWeightedAverageHoldingPeriod(user);
    }
    
    /**
     * @dev Withdraw RWA tokens (backward compatibility - defaults to withdraw U mode)
     * @param amount Amount to withdraw (18 decimals)
     */
    function withdraw(uint256 amount) external {
        withdraw(amount, false);
    }
    
    /**
     * @dev Withdraw RWA tokens
     * @param amount Amount to withdraw (18 decimals)
     * @param chooseStRWA If true, mint 120% as 30-day locked stRWA, else immediate withdrawal with 8% fee
     */
    function withdraw(uint256 amount, bool chooseStRWA) public nonReentrant whenNotPaused {
        UserInfo storage user = users[msg.sender];
        
        // Verify user has sufficient balance
        if (!(user.rwaPending >= amount)) revert Staking_R();
        
        // Verify minimum withdrawal amount
        if (!(amount >= MIN_WITHDRAWAL_AMOUNT)) revert Staking_R();
        
        // Verify cooldown period (24 hours)
        require(
            block.timestamp >= user.lastWithdrawTime + WITHDRAWAL_COOLDOWN,
            "Withdrawal cooldown active"
        );

        // Update user balance
        user.rwaPending -= amount;
        user.lastWithdrawTime = block.timestamp;

        uint256 burnAmount = amount / 2;
        _burnStRWA(msg.sender, burnAmount);

        if (chooseStRWA) {
            uint256 stRwaAmount = (amount * 120) / 100;
            _mintStRWA(msg.sender, stRwaAmount, ST_RWA_LOCK_DURATION);
            emit WithdrawalRequested(msg.sender, amount, 0, block.timestamp);
        } else {
            uint256 netAmount = _payoutRwaImmediate(msg.sender, amount);
            emit WithdrawalRequested(msg.sender, amount, amount - netAmount, block.timestamp);
        }
    }

    /**
     * @dev Withdraw RWA staking rewards stored in rwaStakes[msg.sender].rwaPending
     * Uses the same 24h cooldown as USDT-staking reward withdrawal.
     */
    function withdrawRWARewards(uint256 amount, bool chooseStRWA) external nonReentrant whenNotPaused {
        RWAStakeInfo storage rwaStakeInfo = rwaStakes[msg.sender];

        if (!(rwaStakeInfo.rwaPending >= amount)) revert Staking_R();
        if (!(amount >= MIN_WITHDRAWAL_AMOUNT)) revert Staking_R();
        require(
            block.timestamp >= rwaStakeInfo.lastWithdrawTime + WITHDRAWAL_COOLDOWN,
            "Withdrawal cooldown active"
        );

        rwaStakeInfo.rwaPending -= amount;
        rwaStakeInfo.lastWithdrawTime = block.timestamp;

        // 注意：不再销毁stRWA，因为质押时没有铸造

        if (chooseStRWA) {
            uint256 stRwaAmount = (amount * 120) / 100;
            _mintStRWA(msg.sender, stRwaAmount, ST_RWA_LOCK_DURATION);
            emit RWARewardWithdrawn(msg.sender, amount, 0, block.timestamp);
        } else {
            uint256 netAmount = _payoutRwaImmediate(msg.sender, amount);
            emit RWARewardWithdrawn(msg.sender, amount, amount - netAmount, block.timestamp);
        }
    }

    /// @dev 灵活 USDT 本金提现：按指定金额（amount = 本次提现的全额本金，18 位）支付并扣手续费，剩余保留在合约；销毁 amount/2 的 stRWA
    function withdrawFlexibleUSDTPrincipal(uint256 amount) external nonReentrant whenNotPaused {
        if (!(amount >= MIN_WITHDRAWAL_AMOUNT)) revert Staking_R();
        
        // 计算可用余额：灵活期 + 已到期的锁仓
        uint256 flexibleBalance = usdtFlexibleTotalStaked[msg.sender];
        uint256 maturedBalance = 0;
        
        // 遍历锁仓记录，找出已到期的
        USDTLockedPrincipal[] storage locks = usdtLockedPrincipals[msg.sender];
        for (uint256 i = 0; i < locks.length; i++) {
            if (!locks[i].isWithdrawn && block.timestamp >= locks[i].lockEndTime) {
                maturedBalance += locks[i].principalAmount;
            }
        }
        
        uint256 totalAvailable = flexibleBalance + maturedBalance;
        if (!(totalAvailable > 0)) revert Staking_R();
        if (!(amount <= totalAvailable)) revert Staking_R();

        // 先从灵活期扣除
        if (flexibleBalance >= amount) {
            usdtFlexiblePrincipal[msg.sender] -= amount / 2;
            usdtFlexibleTotalStaked[msg.sender] -= amount;
        } else {
            // 灵活期不足，从已到期的锁仓扣除
            if (flexibleBalance > 0) {
                usdtFlexiblePrincipal[msg.sender] = 0;
                usdtFlexibleTotalStaked[msg.sender] = 0;
            }
            
            uint256 remaining = amount - flexibleBalance;
            // 从已到期的锁仓中扣除
            for (uint256 i = 0; i < locks.length && remaining > 0; i++) {
                if (!locks[i].isWithdrawn && block.timestamp >= locks[i].lockEndTime) {
                    if (locks[i].principalAmount <= remaining) {
                        remaining -= locks[i].principalAmount;
                        locks[i].isWithdrawn = true;
                    } else {
                        locks[i].principalAmount -= remaining;
                        locks[i].totalAmount -= remaining;
                        remaining = 0;
                    }
                }
            }
        }
        
        _decreaseUserStakeTotals(msg.sender, amount, 0);

        // 注意：不再销毁stRWA，因为质押时没有铸造

        uint256 netAmount = _payoutUsdtImmediate(msg.sender, amount);
        emit FlexibleUSDTPrincipalWithdrawn(msg.sender, amount, netAmount, block.timestamp);
    }

    function withdrawUSDTPrincipal(uint256 lockIndex) external nonReentrant whenNotPaused {
        USDTLockedPrincipal storage lockedPrincipal = usdtLockedPrincipals[msg.sender][lockIndex];
        if (!(!lockedPrincipal.isWithdrawn)) revert Staking_R();
        if (!(block.timestamp >= lockedPrincipal.lockEndTime)) revert Staking_R();
        if (!(lockedPrincipal.principalAmount >= MIN_WITHDRAWAL_AMOUNT)) revert Staking_R();

        // 注意：不再销毁stRWA，因为质押时没有铸造

        lockedPrincipal.isWithdrawn = true;
        _decreaseUserStakeTotals(msg.sender, lockedPrincipal.totalAmount, 0);

        uint256 netAmount = _payoutUsdtImmediate(msg.sender, lockedPrincipal.principalAmount);
        emit USDTPrincipalWithdrawn(msg.sender, lockIndex, lockedPrincipal.principalAmount, netAmount, block.timestamp);
    }

    /// @dev 灵活 RWA 本金提现：按指定金额（amount = 本次提现的全额本金，18 位）支付并扣手续费，剩余保留在合约；销毁 amount/2 的 stRWA
    function withdrawFlexibleRWAPrincipal(uint256 amount) external nonReentrant whenNotPaused {
        if (!(amount >= MIN_WITHDRAWAL_AMOUNT)) revert Staking_R();
        
        // 计算可用余额：灵活期 + 已到期的锁仓
        uint256 flexibleBalance = rwaFlexibleTotalStaked[msg.sender];
        uint256 maturedBalance = 0;
        
        RWALockedPrincipal[] storage locks = rwaLockedPrincipals[msg.sender];
        for (uint256 i = 0; i < locks.length; i++) {
            if (!locks[i].isWithdrawn && block.timestamp >= locks[i].lockEndTime) {
                maturedBalance += locks[i].principalAmount;
            }
        }
        
        uint256 totalAvailable = flexibleBalance + maturedBalance;
        if (!(totalAvailable > 0)) revert Staking_R();
        if (!(amount <= totalAvailable)) revert Staking_R();

        if (flexibleBalance >= amount) {
            rwaFlexiblePrincipal[msg.sender] -= amount / 2;
            rwaFlexibleTotalStaked[msg.sender] -= amount;
        } else {
            if (flexibleBalance > 0) {
                rwaFlexiblePrincipal[msg.sender] = 0;
                rwaFlexibleTotalStaked[msg.sender] = 0;
            }
            
            uint256 remaining = amount - flexibleBalance;
            for (uint256 i = 0; i < locks.length && remaining > 0; i++) {
                if (!locks[i].isWithdrawn && block.timestamp >= locks[i].lockEndTime) {
                    if (locks[i].principalAmount <= remaining) {
                        remaining -= locks[i].principalAmount;
                        locks[i].isWithdrawn = true;
                    } else {
                        locks[i].principalAmount -= remaining;
                        locks[i].totalAmount -= remaining;
                        remaining = 0;
                    }
                }
            }
        }
        
        _decreaseUserStakeTotals(msg.sender, 0, amount);

        // 注意：不再销毁stRWA，因为质押时没有铸造

        uint256 netAmount = _payoutRwaImmediate(msg.sender, amount);
        emit FlexibleRWAPrincipalWithdrawn(msg.sender, netAmount, block.timestamp);
    }

    function withdrawRWALockedPrincipal(uint256 lockIndex, bool chooseStRWA) external nonReentrant whenNotPaused {
        RWALockedPrincipal storage lockedPrincipal = rwaLockedPrincipals[msg.sender][lockIndex];
        if (!(!lockedPrincipal.isWithdrawn)) revert Staking_R();
        if (!(block.timestamp >= lockedPrincipal.lockEndTime)) revert Staking_R();
        if (!(lockedPrincipal.principalAmount >= MIN_WITHDRAWAL_AMOUNT)) revert Staking_R();

        // 注意：不再销毁stRWA，因为质押时没有铸造

        lockedPrincipal.isWithdrawn = true;
        _decreaseUserStakeTotals(msg.sender, 0, lockedPrincipal.totalAmount);

        if (chooseStRWA) {
            uint256 stRwaAmount = (lockedPrincipal.principalAmount * 120) / 100;
            _mintStRWA(msg.sender, stRwaAmount, ST_RWA_LOCK_DURATION);
            emit RWAPrincipalWithdrawn(msg.sender, lockIndex, stRwaAmount, block.timestamp);
        } else {
            uint256 netAmount = _payoutRwaImmediate(msg.sender, lockedPrincipal.principalAmount);
            emit RWAPrincipalWithdrawn(msg.sender, lockIndex, netAmount, block.timestamp);
        }
    }

    /// @dev 锁仓到期后由任何人调用，从 user 销毁该笔 USDT 锁仓对应的 stRWA（本金×50%），之后 user 提现本金时不再 burn
    function processMaturedStakeUSDT(address user, uint256 lockIndex) external nonReentrant whenNotPaused {
        USDTLockedPrincipal storage lockedPrincipal = usdtLockedPrincipals[user][lockIndex];
        if (!(block.timestamp >= lockedPrincipal.lockEndTime)) revert Staking_R();
        if (!(!lockedPrincipal.isWithdrawn)) revert Staking_R();
        if (!(!usdtMaturedStRwaBurned[user][lockIndex])) revert Staking_R();

        uint256 burnAmount = lockedPrincipal.principalAmount / 2;
        _burnStRWA(user, burnAmount);
        usdtMaturedStRwaBurned[user][lockIndex] = true;
    }

    /// @dev 锁仓到期后由任何人调用，从 user 销毁该笔 RWA 锁仓对应的 stRWA（本金×50%），之后 user 提现本金时不再 burn
    function processMaturedStakeRWA(address user, uint256 lockIndex) external nonReentrant whenNotPaused {
        RWALockedPrincipal storage lockedPrincipal = rwaLockedPrincipals[user][lockIndex];
        if (!(block.timestamp >= lockedPrincipal.lockEndTime)) revert Staking_R();
        if (!(!lockedPrincipal.isWithdrawn)) revert Staking_R();
        if (!(!rwaMaturedStRwaBurned[user][lockIndex])) revert Staking_R();

        uint256 burnAmount = lockedPrincipal.principalAmount / 2;
        _burnStRWA(user, burnAmount);
        rwaMaturedStRwaBurned[user][lockIndex] = true;
    }
    
    /**
     * @dev Check global cap with soft landing mechanism
     * @param newReward New reward amount to add
     * @return allowed Whether the reward is allowed
     * @return adjustedReward Adjusted reward amount after soft landing
     */
    function checkGlobalCap(uint256 newReward) internal view returns (bool allowed, uint256 adjustedReward) {
        uint256 maxAllowedRewards = totalStaked / 2; // 50% hard limit
        uint256 projectedTotal = totalDynamicRewardsPaid + newReward;
        
        // Hard limit check
        if (projectedTotal > maxAllowedRewards) {
            return (false, 0);
        }
        
        // Soft landing mechanism: if global rewards >= 45%, reduce rewards
        // Calculate current percentage (in basis points, 10000 = 100%)
        uint256 currentPercentage;
        if (totalStaked > 0) {
            currentPercentage = (totalDynamicRewardsPaid * 10000) / totalStaked;
        }
        
        if (currentPercentage >= SOFT_LANDING_THRESHOLD * 100) {
            // Calculate reduction: for each 1% above 45%, reduce by 2%
            uint256 excessPercentage = currentPercentage - (SOFT_LANDING_THRESHOLD * 100);
            uint256 reductionPercentage = (excessPercentage * SOFT_LANDING_REDUCTION_RATE) / 100;
            
            // Apply reduction (max 100% reduction)
            if (reductionPercentage >= 10000) {
                return (false, 0);
            }
            
            uint256 reductionMultiplier = 10000 - reductionPercentage;
            adjustedReward = (newReward * reductionMultiplier) / 10000;
            
            // Re-check with adjusted reward
            if (totalDynamicRewardsPaid + adjustedReward > maxAllowedRewards) {
                adjustedReward = maxAllowedRewards > totalDynamicRewardsPaid 
                    ? maxAllowedRewards - totalDynamicRewardsPaid 
                    : 0;
            }
            
            return (adjustedReward > 0, adjustedReward);
        }
        
        return (true, newReward);
    }
    
    /**
     * @dev Check single reward cap (single reward ≤ staked × 50%)
     * @param user User address
     * @param reward Single reward amount
     * @return allowed Whether the reward is allowed
     */
    function checkSingleCap(address user, uint256 reward) internal view returns (bool allowed) {
        UserInfo storage userInfo = users[user];
        if (userInfo.totalStaked == 0) {
            return false;
        }
        
        uint256 maxSingleReward = (userInfo.totalStaked * SINGLE_CAP_MULTIPLIER) / 100;
        return reward <= maxSingleReward;
    }
    
    /**
     * @dev Check daily cap (daily rewards ≤ staked × 15%)
     * @param user User address
     * @param reward New reward amount to add
     * @return allowed Whether the reward is allowed
     */
    function checkDailyCap(address user, uint256 reward) internal returns (bool allowed) {
        UserInfo storage userInfo = users[user];
        if (userInfo.totalStaked == 0) {
            return false;
        }
        
        uint256 today = block.timestamp / 1 days;
        uint256 maxDailyReward = (userInfo.totalStaked * DAILY_CAP_MULTIPLIER) / 100;
        uint256 currentDailyReward = dailyRewards[user][today];
        uint256 projectedDailyReward = currentDailyReward + reward;
        
        if (projectedDailyReward > maxDailyReward) {
            // Update daily reward to max (for tracking)
            dailyRewards[user][today] = maxDailyReward;
            return false;
        }
        
        // Update daily reward tracking
        dailyRewards[user][today] = projectedDailyReward;
        return true;
    }
    
    /**
     * @dev Update user rewards (backend only)
     * @param user User address
     * @param rwAmount RWA token amount (18 decimals)
     * @param usdtAmount USDT amount (18 decimals)
     * @param stakeId Stake ID to prevent duplicate processing
     * 
     * CRITICAL SECURITY: This function follows Checks-Effects-Interactions pattern
     * Order: 1) All checks, 2) Lock and state updates, 3) External calls
     */
    function updateUserRewards(
        address user,
        uint256 rwAmount,
        uint256 usdtAmount,
        uint256 stakeId
    ) external nonReentrant whenNotPaused {
        if (!(msg.sender == backendAddress)) revert Staking_R();
        
        // ========== Phase 1: All Checks ==========
        
        // 1.1 Prevent duplicate processing
        if (!(!processedStakes[stakeId])) revert Staking_R();
        
        // 1.2 Single call limit check (prevent backend hack)
        if (!(usdtAmount <= maxRewardPerCall)) revert Staking_R();
        
        // Check if this is RWA staking reward (usdtAmount == 0) or USDT staking reward
        if (usdtAmount == 0) {
            // RWA staking reward update
            RWAStakeInfo storage rwaStake = rwaStakes[user];
            if (!(rwAmount <= maxRewardPerCall)) revert Staking_R();
            
            // Check contract RWA balance
            require(
                rwaToken.balanceOf(address(this)) >= rwAmount,
                "Insufficient RWA contract balance"
            );
            
            // Prevent duplicate processing
            processedStakes[stakeId] = true;
            
            // Update RWA stake rewards
            unchecked {
                rwaStake.rwaPending += rwAmount;
            }
            
            emit RewardsUpdated(user, rwAmount, 0, stakeId, block.timestamp);
            return;
        }
        
        // USDT staking reward update (existing logic)
        // 1.3 Real-time balance check
        // Convert usdtAmount from 18 decimals to 6 decimals for comparison
        uint256 usdtAmountIn6Decimals = usdtAmount / PRECISION_MULTIPLIER;
        uint256 contractBalance = usdtToken.balanceOf(address(this));
        if (!(contractBalance >= usdtAmountIn6Decimals)) revert Staking_R();
        
        // Cache user info to reduce storage reads (used in multiple checks)
        UserInfo storage userInfo = users[user];
        
        // 1.4 Multiple cap checks with soft landing
        (bool globalAllowed, uint256 adjustedUsdtAmount) = checkGlobalCap(usdtAmount);
        if (!globalAllowed) {
            emit CapCheckFailed(user, "Global", totalStaked / 2, usdtAmount, block.timestamp);
            revert("Dynamic rewards exceed global cap");
        }
        
        // Apply soft landing adjustment if needed
        if (adjustedUsdtAmount < usdtAmount) {
            // Adjust rwAmount proportionally
            rwAmount = (rwAmount * adjustedUsdtAmount) / usdtAmount;
            usdtAmount = adjustedUsdtAmount;
        }
        
        // 1.5 Single reward cap check
        if (!checkSingleCap(user, usdtAmount)) {
            uint256 maxSingleReward = (userInfo.totalStaked * SINGLE_CAP_MULTIPLIER) / 100;
            emit CapCheckFailed(user, "Single", maxSingleReward, usdtAmount, block.timestamp);
            revert("Exceeds single reward cap (50% of staked)");
        }
        
        // 1.6 Daily cap check (this also updates daily tracking)
        if (!checkDailyCap(user, usdtAmount)) {
            uint256 maxDailyReward = (userInfo.totalStaked * DAILY_CAP_MULTIPLIER) / 100;
            emit CapCheckFailed(user, "Daily", maxDailyReward, dailyRewards[user][block.timestamp / 1 days], block.timestamp);
            revert("Exceeds daily cap (15% of staked)");
        }
        
        // ========== Phase 2: State Updates (Effects) ==========
        
        // 2.1 Immediately set lock flag (prevent reentrancy)
        processedStakes[stakeId] = true;
        
        // 2.2 Update user balances (using cached storage pointer)
        unchecked {
            userInfo.rwaPending += rwAmount;
            userInfo.usdtRewards += usdtAmount;
        }
        
        // 2.3 Update global statistics (unchecked for gas optimization)
        unchecked {
            totalDynamicRewardsPaid += usdtAmount;
        }
        
        // ========== Phase 3: External Calls (Interactions) ==========
        
        // 3.1 Emit event
        emit RewardsUpdated(user, rwAmount, usdtAmount, stakeId, block.timestamp);
    }
    
    /**
     * @dev Update user node level (backend only)
     * @param user User address
     * @param level New node level (1-9)
     */
    function updateNodeLevel(address user, uint8 level) external nonReentrant whenNotPaused {
        if (!(msg.sender == backendAddress)) revert Staking_R();
        if (!(level >= 1 && level <= 9)) revert Staking_R();
        
        uint8 oldLevel = users[user].nodeLevel;
        if (!(level != oldLevel)) revert Staking_R();
        
        users[user].nodeLevel = level;
        // Keep RWA stake node level in sync (for RWA-only stakers)
        if (rwaStakes[user].totalStakedRWA > 0) {
            rwaStakes[user].nodeLevel = level;
        }
        
        emit NodeLevelUpdated(user, oldLevel, level, block.timestamp);
    }
    
    /**
     * @dev Emergency exit is only available for locked USDT principal positions.
     * Refundable principal is proportional to completed full days, then the standard 8% immediate-exit fee applies.
     */
    function emergencyWithdraw(uint256 lockIndex) external nonReentrant whenNotPaused {
        USDTLockedPrincipal storage lockedPrincipal = usdtLockedPrincipals[msg.sender][lockIndex];

        if (!(!lockedPrincipal.isWithdrawn)) revert Staking_R();
        if (!(block.timestamp < lockedPrincipal.lockEndTime)) revert Staking_R();

        uint256 elapsedDays = (block.timestamp - lockedPrincipal.lockStartTime) / 1 days;
        if (!(elapsedDays > 0)) revert Staking_R();

        uint256 grossRefund = (lockedPrincipal.principalAmount * elapsedDays) / lockedPrincipal.lockPeriod;
        if (!(grossRefund > 0)) revert Staking_R();
        if (!(grossRefund >= MIN_WITHDRAWAL_AMOUNT)) revert Staking_R();

        uint256 burnAmount = grossRefund / 2;
        _burnStRWA(msg.sender, burnAmount);

        lockedPrincipal.isWithdrawn = true;
        _decreaseUserStakeTotals(msg.sender, lockedPrincipal.totalAmount, 0);

        uint256 netAmount = _payoutUsdtImmediate(msg.sender, grossRefund);
        emit EmergencyWithdrawal(msg.sender, netAmount, lockedPrincipal.principalAmount - grossRefund);
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
    
    /**
     * @dev Get RWA stake info for tax calculation
     * @param user User address
     * @return totalStaked_ Total staked RWA amount
     * @return weightedAverageTime Weighted average holding time
     */
    function getRWAStakeInfoForTax(address user) external view returns (uint256 totalStaked_, uint256 weightedAverageTime) {
        RWAStakeInfo storage rwaStakeInfo = rwaStakes[user];
        totalStaked_ = rwaStakeInfo.totalStakedRWA;
        
        // Calculate weighted average holding time (same logic as USDT stake)
        uint256 totalWeightedTime = 0;
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < stakeHistory[user].length; i++) {
            uint256 timeDiff = block.timestamp - stakeHistory[user][i].timestamp;
            totalWeightedTime += stakeHistory[user][i].amount * timeDiff;
            totalAmount += stakeHistory[user][i].amount;
        }
        
        if (totalAmount > 0) {
            weightedAverageTime = totalWeightedTime / totalAmount;
        }
        
        return (totalStaked_, weightedAverageTime);
    }

    function getEmergencyWithdrawPreview(address user, uint256 lockIndex) external view returns (
        uint256 grossRefund,
        uint256 netRefund,
        uint256 elapsedDays,
        uint256 totalLockDays,
        bool eligible
    ) {
        USDTLockedPrincipal storage lockedPrincipal = usdtLockedPrincipals[user][lockIndex];
        totalLockDays = lockedPrincipal.lockPeriod;

        if (lockedPrincipal.isWithdrawn || block.timestamp >= lockedPrincipal.lockEndTime || totalLockDays == 0) {
            return (0, 0, 0, totalLockDays, false);
        }

        elapsedDays = (block.timestamp - lockedPrincipal.lockStartTime) / 1 days;
        if (elapsedDays == 0) {
            return (0, 0, 0, totalLockDays, false);
        }

        grossRefund = (lockedPrincipal.principalAmount * elapsedDays) / totalLockDays;
        (, , , netRefund) = _splitImmediateFee(grossRefund);
        eligible = grossRefund >= MIN_WITHDRAWAL_AMOUNT;
    }

    function getUSDTLockedPrincipals(address user) external view returns (
        uint256[] memory stakeIds,
        uint256[] memory amounts,
        uint256[] memory lockStartTimes,
        uint256[] memory lockEndTimes,
        bool[] memory canWithdraw,
        bool[] memory isWithdrawn
    ) {
        USDTLockedPrincipal[] storage locks = usdtLockedPrincipals[user];
        uint256 length = locks.length;

        stakeIds = new uint256[](length);
        amounts = new uint256[](length);
        lockStartTimes = new uint256[](length);
        lockEndTimes = new uint256[](length);
        canWithdraw = new bool[](length);
        isWithdrawn = new bool[](length);

        for (uint256 i = 0; i < length; i++) {
            stakeIds[i] = locks[i].stakeId;
            amounts[i] = locks[i].principalAmount;
            lockStartTimes[i] = locks[i].lockStartTime;
            lockEndTimes[i] = locks[i].lockEndTime;
            canWithdraw[i] = !locks[i].isWithdrawn && block.timestamp >= locks[i].lockEndTime;
            isWithdrawn[i] = locks[i].isWithdrawn;
        }
    }
    
    /**
     * @dev Get locked RWA principals for a user
     * @param user User address
     * @return stakeIds Array of stake IDs
     * @return amounts Array of principal amounts
     * @return lockStartTimes Array of lock start times
     * @return lockEndTimes Array of lock end times
     * @return canWithdraw Array of whether can withdraw
     * @return isWithdrawn Array of whether withdrawn
     */
    function getRWALockedPrincipals(address user) external view returns (
        uint256[] memory stakeIds,
        uint256[] memory amounts,
        uint256[] memory lockStartTimes,
        uint256[] memory lockEndTimes,
        bool[] memory canWithdraw,
        bool[] memory isWithdrawn
    ) {
        RWALockedPrincipal[] storage locks = rwaLockedPrincipals[user];
        uint256 length = locks.length;
        
        stakeIds = new uint256[](length);
        amounts = new uint256[](length);
        lockStartTimes = new uint256[](length);
        lockEndTimes = new uint256[](length);
        canWithdraw = new bool[](length);
        isWithdrawn = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            stakeIds[i] = locks[i].stakeId;
            amounts[i] = locks[i].principalAmount;
            lockStartTimes[i] = locks[i].lockStartTime;
            lockEndTimes[i] = locks[i].lockEndTime;
            canWithdraw[i] = !locks[i].isWithdrawn && block.timestamp >= locks[i].lockEndTime;
            isWithdrawn[i] = locks[i].isWithdrawn;
        }
    }

    // ============ 老合约迁移（新部署后一次性使用）============

    /// @notice 开启/关闭迁移窗口；关闭后无法再 import
    function setMigrationEnabled(bool enabled) external onlyOwner {
        migrationEnabled = enabled;
        emit MigrationToggled(enabled);
    }

    /// @notice 将 stakesCounter 至少提升到 minNext（须 >= 当前值），避免新 stakeId 与老数据冲突
    function migrationSetStakesCounter(uint256 minNext) external onlyOwner {
        if (!(migrationEnabled)) revert Staking_R();
        if (!(minNext >= stakesCounter)) revert Staking_R();
        stakesCounter = minNext;
    }

    /**
     * @notice 写入单个用户在老合约中的完整仓位（由链下脚本从老合约只读导出）
     * @param globalDeltaTotalStaked 该用户在老合约中对全局 totalStaked 的贡献（通常 = users(user).totalStaked；若老数据有特殊路径另由脚本说明）
     * @param globalDeltaTotalStakedRWA 对全局 totalStakedRWA 的贡献（= rwaStakes(user).totalStakedRWA）
     */
    function migrationImportUserBundle(
        address user,
        UserInfo calldata uInfo,
        RWAStakeInfo calldata rInfo,
        USDTLockedPrincipal[] calldata usdtLocks,
        RWALockedPrincipal[] calldata rwaLocks,
        uint256 usdtFlexPrincipal_,
        uint256 usdtFlexTotal_,
        uint256 rwaFlexPrincipal_,
        uint256 rwaFlexTotal_,
        StakeRecord[] calldata hist,
        uint256 globalDeltaTotalStaked,
        uint256 globalDeltaTotalStakedRWA
    ) external onlyOwner {
        if (!(migrationEnabled)) revert Staking_R();
        if (!(user != address(0))) revert Staking_R();
        if (!(!migrationSeen[user])) revert Staking_R();
        migrationSeen[user] = true;

        delete usdtLockedPrincipals[user];
        delete rwaLockedPrincipals[user];
        delete stakeHistory[user];

        users[user] = uInfo;
        rwaStakes[user] = rInfo;
        usdtFlexiblePrincipal[user] = usdtFlexPrincipal_;
        usdtFlexibleTotalStaked[user] = usdtFlexTotal_;
        rwaFlexiblePrincipal[user] = rwaFlexPrincipal_;
        rwaFlexibleTotalStaked[user] = rwaFlexTotal_;

        for (uint256 i = 0; i < usdtLocks.length; i++) {
            usdtLockedPrincipals[user].push(usdtLocks[i]);
            stakeLockPeriods[usdtLocks[i].stakeId] = usdtLocks[i].lockPeriod;
        }
        for (uint256 j = 0; j < rwaLocks.length; j++) {
            rwaLockedPrincipals[user].push(rwaLocks[j]);
            stakeLockPeriods[rwaLocks[j].stakeId] = rwaLocks[j].lockPeriod;
        }
        for (uint256 k = 0; k < hist.length; k++) {
            stakeHistory[user].push(hist[k]);
        }

        unchecked {
            totalStaked += globalDeltaTotalStaked;
            totalStakedRWA += globalDeltaTotalStakedRWA;
        }

        emit MigrationUserImported(
            user,
            usdtLocks.length,
            rwaLocks.length,
            globalDeltaTotalStaked,
            globalDeltaTotalStakedRWA
        );
    }

    /// @notice 迁移结束后若链上 totalStaked / totalStakedRWA 与老合约总览不一致，可一次性校准（慎用）
    function migrationSetGlobalTotals(uint256 newTotalStaked, uint256 newTotalStakedRWA) external onlyOwner {
        if (!(migrationEnabled)) revert Staking_R();
        totalStaked = newTotalStaked;
        totalStakedRWA = newTotalStakedRWA;
    }

    /// @notice 校准已发放动态奖励累计（与老合约 totalDynamicRewardsPaid 对齐时使用）
    function migrationSetDynamicRewardsPaid(uint256 newPaid) external onlyOwner {
        if (!(migrationEnabled)) revert Staking_R();
        totalDynamicRewardsPaid = newPaid;
    }
}
