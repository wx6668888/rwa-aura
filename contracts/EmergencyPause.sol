// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EmergencyPause
 * @dev 紧急暂停合约 - 紧急暂停机制、多签控制
 * 
 * Features:
 * - 紧急暂停机制
 * - 多签控制
 * - 暂停所有合约操作
 * - 合约注册管理
 */
contract EmergencyPause is Ownable {
    // 全局暂停状态
    bool public globalPauseActive = false;
    
    // 多签控制
    address public multiSigWallet;
    bool public multiSigEnabled = false;
    uint256 public requiredSignatures = 2; // 需要的签名数量（简化版，实际应使用 Gnosis Safe 等）
    
    // 紧急暂停操作员
    address public emergencyPauseOperator;
    
    // 注册的合约列表
    address[] public registeredContracts;
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public pausedContracts; // 暂停的合约
    
    // 暂停记录
    struct PauseRecord {
        address contractAddress;
        address pausedBy;
        uint256 timestamp;
        string reason;
        bool isActive;
    }
    
    mapping(address => PauseRecord[]) public pauseHistory; // 合约暂停历史
    
    // 事件
    event GlobalPauseActivated(address indexed pausedBy, string reason, uint256 timestamp);
    event GlobalPauseDeactivated(address indexed unpausedBy, uint256 timestamp);
    event ContractPaused(address indexed contractAddress, address indexed pausedBy, string reason, uint256 timestamp);
    event ContractUnpaused(address indexed contractAddress, address indexed unpausedBy, uint256 timestamp);
    event ContractRegistered(address indexed contractAddress, address indexed registeredBy, uint256 timestamp);
    event ContractUnregistered(address indexed contractAddress, address indexed unregisteredBy, uint256 timestamp);
    event EmergencyPauseOperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event MultiSigWalletUpdated(address indexed oldWallet, address indexed newWallet, bool enabled);
    
    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {
        emergencyPauseOperator = msg.sender;
    }
    
    /**
     * @dev Modifier: Only Owner or Emergency Pause Operator
     */
    modifier onlyOwnerOrOperator() {
        require(
            msg.sender == owner() || msg.sender == emergencyPauseOperator,
            "EmergencyPause: Not authorized"
        );
        _;
    }
    
    /**
     * @dev Modifier: Only Owner or MultiSig
     */
    modifier onlyOwnerOrMultiSig() {
        if (multiSigEnabled) {
            require(msg.sender == multiSigWallet, "EmergencyPause: Only multi-sig wallet can call");
        } else {
            require(msg.sender == owner(), "EmergencyPause: Only owner can call");
        }
        _;
    }
    
    /**
     * @dev 设置紧急暂停操作员
     * @param operator 操作员地址
     */
    function setEmergencyPauseOperator(address operator) external onlyOwner {
        require(operator != address(0), "EmergencyPause: Invalid operator address");
        address oldOperator = emergencyPauseOperator;
        emergencyPauseOperator = operator;
        emit EmergencyPauseOperatorUpdated(oldOperator, operator);
    }
    
    /**
     * @dev 设置多签钱包
     * @param _multiSigWallet 多签钱包地址
     * @param _enabled 是否启用多签
     */
    function setMultiSigWallet(address _multiSigWallet, bool _enabled) external onlyOwner {
        address oldWallet = multiSigWallet;
        multiSigWallet = _multiSigWallet;
        multiSigEnabled = _enabled;
        emit MultiSigWalletUpdated(oldWallet, _multiSigWallet, _enabled);
    }
    
    /**
     * @dev 注册合约
     * @param contractAddress 合约地址
     */
    function registerContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "EmergencyPause: Invalid contract address");
        require(!isRegistered[contractAddress], "EmergencyPause: Contract already registered");
        
        registeredContracts.push(contractAddress);
        isRegistered[contractAddress] = true;
        
        emit ContractRegistered(contractAddress, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 取消注册合约
     * @param contractAddress 合约地址
     */
    function unregisterContract(address contractAddress) external onlyOwner {
        require(isRegistered[contractAddress], "EmergencyPause: Contract not registered");
        
        isRegistered[contractAddress] = false;
        
        // 从数组中移除（简化处理，不实际删除）
        // 实际应用中可以使用更高效的数据结构
        
        emit ContractUnregistered(contractAddress, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 全局暂停（暂停所有注册的合约）
     * @param reason 暂停原因
     */
    function globalPause(string memory reason) external onlyOwnerOrMultiSig {
        require(!globalPauseActive, "EmergencyPause: Already globally paused");
        
        globalPauseActive = true;
        
        // 暂停所有注册的合约
        for (uint256 i = 0; i < registeredContracts.length; i++) {
            address contractAddress = registeredContracts[i];
            if (isRegistered[contractAddress] && !pausedContracts[contractAddress]) {
                _pauseContract(contractAddress, reason);
            }
        }
        
        emit GlobalPauseActivated(msg.sender, reason, block.timestamp);
    }
    
    /**
     * @dev 解除全局暂停
     */
    function globalUnpause() external onlyOwnerOrMultiSig {
        require(globalPauseActive, "EmergencyPause: Not globally paused");
        
        globalPauseActive = false;
        
        // 解除所有注册合约的暂停
        for (uint256 i = 0; i < registeredContracts.length; i++) {
            address contractAddress = registeredContracts[i];
            if (isRegistered[contractAddress] && pausedContracts[contractAddress]) {
                _unpauseContract(contractAddress);
            }
        }
        
        emit GlobalPauseDeactivated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 暂停单个合约（操作员或Owner）
     * @param contractAddress 合约地址
     * @param reason 暂停原因
     */
    function pauseContract(address contractAddress, string memory reason) external onlyOwnerOrOperator {
        require(contractAddress != address(0), "EmergencyPause: Invalid contract address");
        require(isRegistered[contractAddress], "EmergencyPause: Contract not registered");
        require(!pausedContracts[contractAddress], "EmergencyPause: Contract already paused");
        
        _pauseContract(contractAddress, reason);
    }
    
    /**
     * @dev 解除单个合约暂停（仅Owner或多签）
     * @param contractAddress 合约地址
     */
    function unpauseContract(address contractAddress) external onlyOwnerOrMultiSig {
        require(contractAddress != address(0), "EmergencyPause: Invalid contract address");
        require(pausedContracts[contractAddress], "EmergencyPause: Contract not paused");
        
        _unpauseContract(contractAddress);
    }
    
    /**
     * @dev 内部函数：暂停合约
     * @param contractAddress 合约地址
     * @param reason 暂停原因
     */
    function _pauseContract(address contractAddress, string memory reason) internal {
        pausedContracts[contractAddress] = true;
        
        // 记录暂停历史
        pauseHistory[contractAddress].push(PauseRecord({
            contractAddress: contractAddress,
            pausedBy: msg.sender,
            timestamp: block.timestamp,
            reason: reason,
            isActive: true
        }));
        
        // 尝试调用合约的 pause() 函数（如果合约支持 Pausable）
        (bool success, ) = contractAddress.call(
            abi.encodeWithSignature("pause()")
        );
        // 即使调用失败也不回滚，因为可能合约不支持 pause()
        // 我们仍然记录暂停状态
        success; // 避免未使用变量警告
        
        emit ContractPaused(contractAddress, msg.sender, reason, block.timestamp);
    }
    
    /**
     * @dev 内部函数：解除合约暂停
     * @param contractAddress 合约地址
     */
    function _unpauseContract(address contractAddress) internal {
        pausedContracts[contractAddress] = false;
        
        // 更新暂停历史
        PauseRecord[] storage history = pauseHistory[contractAddress];
        for (uint256 i = history.length; i > 0; i--) {
            if (history[i - 1].isActive) {
                history[i - 1].isActive = false;
                break;
            }
        }
        
        // 尝试调用合约的 unpause() 函数（如果合约支持 Pausable）
        (bool success, ) = contractAddress.call(
            abi.encodeWithSignature("unpause()")
        );
        // 即使调用失败也不回滚，因为可能合约不支持 unpause()
        // 我们仍然记录解除暂停状态
        success; // 避免未使用变量警告
        
        emit ContractUnpaused(contractAddress, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 检查合约是否暂停
     * @param contractAddress 合约地址
     * @return paused 是否暂停
     */
    function isPaused(address contractAddress) external view returns (bool paused) {
        // 如果全局暂停激活，所有合约都视为暂停
        if (globalPauseActive) {
            return true;
        }
        
        // 检查单个合约的暂停状态
        return pausedContracts[contractAddress];
    }
    
    /**
     * @dev 获取注册的合约列表
     * @return contracts 合约地址数组
     */
    function getRegisteredContracts() external view returns (address[] memory contracts) {
        return registeredContracts;
    }
    
    /**
     * @dev 获取合约的暂停历史
     * @param contractAddress 合约地址
     * @return history 暂停历史记录
     */
    function getPauseHistory(address contractAddress) external view returns (PauseRecord[] memory history) {
        return pauseHistory[contractAddress];
    }
    
    /**
     * @dev 获取紧急暂停状态
     * @return globalPause_ 全局暂停状态
     * @return registeredCount 注册的合约数量
     * @return pausedCount 暂停的合约数量
     */
    function getEmergencyPauseStatus() external view returns (
        bool globalPause_,
        uint256 registeredCount,
        uint256 pausedCount
    ) {
        globalPause_ = globalPauseActive;
        registeredCount = registeredContracts.length;
        
        // 计算暂停的合约数量
        pausedCount = 0;
        for (uint256 i = 0; i < registeredContracts.length; i++) {
            if (pausedContracts[registeredContracts[i]]) {
                pausedCount++;
            }
        }
        
        return (globalPause_, registeredCount, pausedCount);
    }
}
