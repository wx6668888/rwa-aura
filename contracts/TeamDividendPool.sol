// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TeamDividendPool
 * @dev 团队业绩分红池 - 1-of-2 签名方案（后端 + 管理员）
 * 用户质押产生的分红记录需后端与管理员双签后批量写入，用户可随时提取
 */
contract TeamDividendPool is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;

    /// @dev 1-of-2：后端地址与管理员地址，batchRecordDividend 需两者各自签名
    address public backendSigner;
    address public adminSigner;

    /// @dev 用户分红余额（USDT 6位精度）
    mapping(address => uint256) public dividendBalances;

    /// @dev 已结算未提取总额
    uint256 public settledUnwithdrawn;
    /// @dev 预留 gas/运营费用
    uint256 public reservedGas;

    /// @dev 单笔提取上限 100,000 USDT
    uint256 public constant MAX_WITHDRAWAL_PER_TX = 100_000 * 10**6;
    /// @dev 每日提取次数上限
    uint256 public constant MAX_WITHDRAWALS_PER_DAY = 10;
    /// @dev autoTransfer 24小时冷却
    uint256 public constant AUTO_TRANSFER_COOLDOWN = 24 hours;
    mapping(address => uint256) public dailyWithdrawalCount;
    mapping(address => uint256) public lastWithdrawalDay;

    /// @dev 防重放
    mapping(bytes32 => bool) public usedNonces;

    /// @dev autoTransfer 24小时冷却
    uint256 public lastAutoTransferTime;

    event DividendsRecorded(uint256 indexed month, uint256 userCount, uint256 totalAmount);
    event DividendWithdrawn(address indexed user, uint256 amount);
    event AutoTransferExecuted(address indexed targetPool, uint256 amount);
    event SignersUpdated(address backendSigner, address adminSigner);
    event ReservedGasUpdated(uint256 oldValue, uint256 newValue);
    event FundsReceived(address indexed from, uint256 amount, string source);

    constructor(
        address _usdt,
        address _backendSigner,
        address _adminSigner,
        uint256 _reservedGas
    ) {
        require(_usdt != address(0), "Invalid USDT");
        require(_backendSigner != address(0), "Invalid backend");
        require(_adminSigner != address(0), "Invalid admin");
        require(_backendSigner != _adminSigner, "Signers must differ");

        usdt = IERC20(_usdt);
        backendSigner = _backendSigner;
        adminSigner = _adminSigner;
        reservedGas = _reservedGas;
    }

    /// @notice 接收质押划拨（由质押合约调用，划拨规则：质押金额 × 50% × 18% = 9%）
    function receiveStakeFunds(uint256 amount) external {
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit FundsReceived(msg.sender, amount, "stake");
    }

    /// @notice 接收手续费划拨
    function receiveFeeFunds(uint256 amount) external {
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit FundsReceived(msg.sender, amount, "fee");
    }

    /// @notice 更新签名者（仅管理员可调，兼容旧版）
    function setSigners(address _backendSigner, address _adminSigner) external {
        require(msg.sender == adminSigner, "Unauthorized");
        require(_backendSigner != address(0) && _adminSigner != address(0), "Invalid");
        require(_backendSigner != _adminSigner, "Signers must differ");
        backendSigner = _backendSigner;
        adminSigner = _adminSigner;
        emit SignersUpdated(_backendSigner, _adminSigner);
    }

    /// @notice 更新预留 gas
    function updateReservedGas(uint256 newValue) external {
        require(msg.sender == adminSigner, "Unauthorized");
        emit ReservedGasUpdated(reservedGas, newValue);
        reservedGas = newValue;
    }

    /// @notice 更新后端签名地址（仅 adminSigner）
    function updateBackendSigner(address newSigner) external {
        require(msg.sender == adminSigner, "Unauthorized");
        require(newSigner != address(0), "Invalid address");
        require(newSigner != adminSigner, "Signers must differ");
        backendSigner = newSigner;
    }

    /// @notice 更新管理员签名地址（仅当前 adminSigner）
    function updateAdminSigner(address newSigner) external {
        require(msg.sender == adminSigner, "Unauthorized");
        require(newSigner != address(0), "Invalid address");
        require(newSigner != backendSigner, "Signers must differ");
        adminSigner = newSigner;
    }

    /// @notice 批量记录用户分红（需 backend 与 admin 双签）
    function batchRecordDividend(
        address[] calldata users,
        uint256[] calldata amounts,
        uint256 month,
        bytes32 nonce,
        bytes calldata backendSig,
        bytes calldata adminSig
    ) external whenNotPaused {
        require(users.length == amounts.length, "Length mismatch");
        require(!usedNonces[nonce], "Nonce already used");

        bytes32 msgHash = keccak256(abi.encodePacked(users, amounts, month, nonce));
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash)
        );

        require(_recoverSigner(ethHash, backendSig) == backendSigner, "Invalid backend sig");
        require(_recoverSigner(ethHash, adminSig) == adminSigner, "Invalid admin sig");

        usedNonces[nonce] = true;
        uint256 total = 0;
        for (uint256 i = 0; i < users.length; i++) {
            require(amounts[i] > 0, "Zero amount");
            dividendBalances[users[i]] += amounts[i];
            total += amounts[i];
        }
        settledUnwithdrawn += total;

        emit DividendsRecorded(month, users.length, total);
    }

    /// @notice 用户提取分红
    function withdrawDividend(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0 && amount <= MAX_WITHDRAWAL_PER_TX, "Invalid amount");
        require(dividendBalances[msg.sender] >= amount, "Insufficient balance");

        uint256 today = block.timestamp / 1 days;
        if (lastWithdrawalDay[msg.sender] < today) {
            dailyWithdrawalCount[msg.sender] = 0;
            lastWithdrawalDay[msg.sender] = today;
        }
        require(dailyWithdrawalCount[msg.sender] < MAX_WITHDRAWALS_PER_DAY, "Daily limit");

        dividendBalances[msg.sender] -= amount;
        settledUnwithdrawn -= amount;
        dailyWithdrawalCount[msg.sender]++;

        usdt.safeTransfer(msg.sender, amount);

        emit DividendWithdrawn(msg.sender, amount);
    }

    /// @notice 自动调拨（单次不超过可用余额 50%，24h 冷却）
    function autoTransfer(address targetPool, uint256 amount) external whenNotPaused {
        require(msg.sender == backendSigner, "Unauthorized");
        require(
            block.timestamp >= lastAutoTransferTime + AUTO_TRANSFER_COOLDOWN,
            "Cooldown active"
        );
        uint256 maxTransfer = getAvailableBalance() / 2;
        require(amount > 0 && amount <= maxTransfer, "Exceeds 50% limit");

        lastAutoTransferTime = block.timestamp;
        usdt.safeTransfer(targetPool, amount);

        emit AutoTransferExecuted(targetPool, amount);
    }

    /// @notice 可用余额 = 总余额 - 已结算未提取 - 预留
    function getAvailableBalance() public view returns (uint256) {
        uint256 total = usdt.balanceOf(address(this));
        if (total <= settledUnwithdrawn + reservedGas) return 0;
        return total - settledUnwithdrawn - reservedGas;
    }

    /// @notice 查询分红池完整状态（供后端轮询）
    function getPoolStatus() external view returns (
        uint256 totalBalance,
        uint256 _settledUnwithdrawn,
        uint256 _reservedGas,
        uint256 availableBalance
    ) {
        totalBalance = usdt.balanceOf(address(this));
        _settledUnwithdrawn = settledUnwithdrawn;
        _reservedGas = reservedGas;
        availableBalance = getAvailableBalance();
    }

    function pause() external {
        require(msg.sender == adminSigner, "Unauthorized");
        _pause();
    }

    function unpause() external {
        require(msg.sender == adminSigner, "Unauthorized");
        _unpause();
    }

    function _recoverSigner(bytes32 ethHash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        return ecrecover(ethHash, v, r, s);
    }
}
