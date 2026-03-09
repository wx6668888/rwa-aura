// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StRWA
 * @dev Staked RWA - 实体资产代币化凭证
 * 
 * stRWA 代表用户持有的实体资产凭证
 * 1 stRWA = 1 USDT 等值的实体资产
 * 可在二级市场交易或等待实体资产清结算
 * 
 * 核心功能：
 * - 仅 StakingContract 可以铸造/销毁
 * - Owner 可以设置 StakingContract 地址
 * - 支持批量转账（用于实体资产清结算）
 */
contract StRWA is ERC20, Ownable {
    // 质押合约地址（只有质押合约可以铸造/销毁）
    address public stakingContract;

    struct BalanceLock {
        uint256 amount;
        uint256 unlockTime;
    }

    mapping(address => BalanceLock[]) private accountLocks;
    mapping(address => uint256) private nextLockIndex;
    mapping(address => uint256) public lockedBalance;
    
    // 事件
    event StakingContractUpdated(address indexed oldContract, address indexed newContract);
    event Minted(address indexed to, uint256 amount);
    event LockedMinted(address indexed to, uint256 amount, uint256 unlockTime);
    event Burned(address indexed from, uint256 amount);
    event LocksReleased(address indexed account, uint256 amount);
    
    /**
     * @dev 构造函数
     */
    constructor() ERC20("Staked RWA", "stRWA") Ownable(msg.sender) {
        // 初始供应量为 0，通过 mint 函数铸造
    }
    
    /**
     * @dev 设置质押合约地址（仅Owner可调用）
     * @param _stakingContract 质押合约地址
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "StRWA: Invalid address");
        require(_stakingContract != stakingContract, "StRWA: Same address");
        
        address oldContract = stakingContract;
        stakingContract = _stakingContract;
        
        emit StakingContractUpdated(oldContract, _stakingContract);
    }
    
    /**
     * @dev 铸造 stRWA（仅质押合约可调用）
     * 
     * 使用场景：
     * - 用户质押时：50%转换为 stRWA
     * - 用户选择"持RWA模式"提现时：120%收益转换为 stRWA
     * 
     * @param to 接收地址
     * @param amount 铸造数量（18 decimals）
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == stakingContract, "StRWA: Only staking contract");
        require(to != address(0), "StRWA: Invalid address");
        require(amount > 0, "StRWA: Amount must be greater than zero");

        _mintWithOptionalLock(to, amount, 0);
    }

    function mintLocked(address to, uint256 amount, uint256 lockDuration) external {
        require(msg.sender == stakingContract, "StRWA: Only staking contract");
        require(to != address(0), "StRWA: Invalid address");
        require(amount > 0, "StRWA: Amount must be greater than zero");
        require(lockDuration > 0, "StRWA: Invalid lock duration");

        _mintWithOptionalLock(to, amount, lockDuration);
    }
    
    /**
     * @dev 销毁 stRWA（仅质押合约可调用）
     * 
     * 使用场景：
     * - 用户解锁 stRWA 时
     * - 用户互换 stRWA → RWA 时
     * 
     * @param from 销毁地址
     * @param amount 销毁数量（18 decimals）
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == stakingContract, "StRWA: Only staking contract");
        require(from != address(0), "StRWA: Invalid address");
        require(amount > 0, "StRWA: Amount must be greater than zero");
        require(balanceOf(from) >= amount, "StRWA: Insufficient balance");

        _releaseExpiredLocks(from);
        _burn(from, amount);
        emit Burned(from, amount);
    }
    
    /**
     * @dev 批量转账（用于实体资产清结算）
     * 
     * 使用场景：
     * - 项目方定期回购 stRWA
     * - 实体资产清结算时批量转账
     * 
     * @param recipients 接收地址数组
     * @param amounts 转账数量数组（18 decimals）
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "StRWA: Arrays length mismatch");
        require(recipients.length > 0, "StRWA: Empty arrays");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "StRWA: Invalid recipient");
            require(amounts[i] > 0, "StRWA: Invalid amount");
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev 检查是否可以铸造/销毁
     * @return 如果 stakingContract 已设置返回 true
     */
    function isReady() external view returns (bool) {
        return stakingContract != address(0);
    }

    function releaseExpiredLocks(address account) external returns (uint256 releasedAmount) {
        return _releaseExpiredLocks(account);
    }

    function availableBalanceOf(address account) external view returns (uint256) {
        return balanceOf(account) - getLockedBalance(account);
    }

    function getLockedBalance(address account) public view returns (uint256 currentLocked) {
        currentLocked = lockedBalance[account];
        uint256 cursor = nextLockIndex[account];
        BalanceLock[] storage locks = accountLocks[account];

        while (cursor < locks.length && locks[cursor].unlockTime <= block.timestamp) {
            currentLocked -= locks[cursor].amount;
            cursor++;
        }
    }

    function getLocks(address account) external view returns (
        uint256[] memory amounts,
        uint256[] memory unlockTimes,
        bool[] memory released
    ) {
        BalanceLock[] storage locks = accountLocks[account];
        uint256 length = locks.length;

        amounts = new uint256[](length);
        unlockTimes = new uint256[](length);
        released = new bool[](length);

        for (uint256 i = 0; i < length; i++) {
            amounts[i] = locks[i].amount;
            unlockTimes[i] = locks[i].unlockTime;
            released[i] = i < nextLockIndex[account] || locks[i].unlockTime <= block.timestamp;
        }
    }

    function _mintWithOptionalLock(address to, uint256 amount, uint256 lockDuration) internal {
        _mint(to, amount);
        emit Minted(to, amount);

        if (lockDuration > 0) {
            uint256 unlockTime = block.timestamp + lockDuration;
            accountLocks[to].push(BalanceLock({ amount: amount, unlockTime: unlockTime }));
            lockedBalance[to] += amount;
            emit LockedMinted(to, amount, unlockTime);
        }
    }

    function _releaseExpiredLocks(address account) internal returns (uint256 releasedAmount) {
        uint256 cursor = nextLockIndex[account];
        BalanceLock[] storage locks = accountLocks[account];

        while (cursor < locks.length && locks[cursor].unlockTime <= block.timestamp) {
            releasedAmount += locks[cursor].amount;
            cursor++;
        }

        if (releasedAmount > 0) {
            lockedBalance[account] -= releasedAmount;
            nextLockIndex[account] = cursor;
            emit LocksReleased(account, releasedAmount);
        }
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && msg.sender != stakingContract) {
            _releaseExpiredLocks(from);
            require(balanceOf(from) - lockedBalance[from] >= value, "StRWA: Amount exceeds unlocked balance");
        }

        super._update(from, to, value);

        if (from != address(0) && lockedBalance[from] > balanceOf(from)) {
            lockedBalance[from] = balanceOf(from);
        }
    }
}
