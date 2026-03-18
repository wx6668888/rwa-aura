// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ReferralRewardPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdtToken;
    address public stakingContract;
    
    struct PendingReward {
        address referrer;
        address referee;
        uint256 stakeAmount;
        uint256 timestamp;
        bool settled;
        uint8 levelSnapshot; // referrer level at stake time (1-9)
    }
    
    PendingReward[] public pendingRewards;
    mapping(address => uint256[]) public userPendingIndexes;
    mapping(address => uint256) public withdrawableBalance;
    uint256 public lastSettlementTime;
    uint256 public constant MIN_WITHDRAWAL = 100 * 10**6;
    uint256 public constant WITHDRAWAL_FEE = 8;
    
    event RewardRecorded(address indexed referrer, address indexed referee, uint256 stakeAmount, uint8 levelSnapshot, uint256 index);
    event RewardSettled(address indexed referrer, uint256 amount, uint256 count);
    event RewardWithdrawn(address indexed user, uint256 amount, uint256 fee);
    
    constructor(address _usdtToken, address _stakingContract) Ownable(msg.sender) {
        usdtToken = IERC20(_usdtToken);
        stakingContract = _stakingContract;
        lastSettlementTime = block.timestamp;
    }
    
    function recordReferralReward(address referrer, address referee, uint256 stakeAmount, uint256, uint8 userLevel) external {
        require(msg.sender == stakingContract, "Only staking");
        require(userLevel >= 1 && userLevel <= 9, "Invalid level");
        uint256 index = pendingRewards.length;
        pendingRewards.push(PendingReward(referrer, referee, stakeAmount, block.timestamp, false, userLevel));
        userPendingIndexes[referrer].push(index);
        emit RewardRecorded(referrer, referee, stakeAmount, userLevel, index);
    }
    
    /**
     * @notice Weekly settlement entrypoint (compatibility)
     * @dev `levels` is kept for backward compatibility but is ignored.
     *      Each PendingReward carries `levelSnapshot` captured at stake time.
     */
    function settleWeeklyRewards(address[] calldata referrers, uint8[] calldata levels) external onlyOwner nonReentrant {
        require(referrers.length == levels.length, "Length mismatch");
        for (uint256 i = 0; i < referrers.length; i++) {
            _settleUserRewards(referrers[i]);
        }
        lastSettlementTime = block.timestamp;
    }
    
    function _settleUserRewards(address referrer) internal {
        uint256[] storage indexes = userPendingIndexes[referrer];
        uint256 totalReward = 0;
        uint256 count = 0;
        
        for (uint256 i = 0; i < indexes.length; i++) {
            PendingReward storage reward = pendingRewards[indexes[i]];
            if (!reward.settled) {
                uint256 rate = _getReferralRewardRate(reward.levelSnapshot);
                totalReward += (reward.stakeAmount * rate) / 10000;
                reward.settled = true;
                count++;
            }
        }
        
        if (totalReward > 0) {
            withdrawableBalance[referrer] += totalReward;
            emit RewardSettled(referrer, totalReward, count);
        }
    }
    
    function withdraw(uint256 amount) external nonReentrant {
        require(amount >= MIN_WITHDRAWAL, "Below minimum");
        require(withdrawableBalance[msg.sender] >= amount, "Insufficient balance");
        
        uint256 fee = (amount * WITHDRAWAL_FEE) / 100;
        uint256 netAmount = amount - fee;
        
        withdrawableBalance[msg.sender] -= amount;
        
        if (msg.sender == owner()) {
            // 如果提现人是owner，直接转全额
            usdtToken.safeTransfer(msg.sender, amount);
        } else {
            usdtToken.safeTransfer(msg.sender, netAmount);
            if (fee > 0) usdtToken.safeTransfer(owner(), fee);
        }
        
        emit RewardWithdrawn(msg.sender, netAmount, fee);
    }
    
    function _getReferralRewardRate(uint8 level) internal pure returns (uint256) {
        if (level == 1) return 300;
        if (level == 2) return 500;
        if (level == 3) return 800;
        if (level == 4) return 1200;
        if (level == 5) return 1700;
        if (level == 6) return 2300;
        if (level == 7) return 3000;
        if (level == 8) return 3500;
        if (level == 9) return 4000;
        return 0;
    }
    
    function getPendingRewards(address user) external view returns (uint256 pending, uint256 withdrawable) {
        uint256[] storage indexes = userPendingIndexes[user];
        for (uint256 i = 0; i < indexes.length; i++) {
            PendingReward storage reward = pendingRewards[indexes[i]];
            if (!reward.settled) {
                pending += reward.stakeAmount;
            }
        }
        withdrawable = withdrawableBalance[user];
    }
    
    // 批量充值推荐奖励（用于后端周结算）
    function batchDeposit(address[] calldata users, uint256[] calldata amounts) external onlyOwner nonReentrant {
        require(users.length == amounts.length, "Length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(usdtToken.balanceOf(address(this)) >= totalAmount, "Insufficient contract balance");
        
        for (uint256 i = 0; i < users.length; i++) {
            withdrawableBalance[users[i]] += amounts[i];
        }
    }
    
    function setStakingContract(address _staking) external onlyOwner {
        stakingContract = _staking;
    }
    
    // 查询用户可提取余额
    function balances(address user) external view returns (uint256) {
        return withdrawableBalance[user];
    }
}


