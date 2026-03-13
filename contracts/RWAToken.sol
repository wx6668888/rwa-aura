// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RWAToken
 * @dev BEP-20 token with transaction tax mechanism and EIP-2612 Permit
 * 
 * Features:
 * - Dynamic sell tax: base rate from weighted avg holding (max 4%) + sell-ratio penalty (above 30% of total, 1% per 1%, no cap)
 * - At most 1 sell per 24 hours per address (non-whitelisted)
 * - Buy transactions are tax-free
 * - Whitelist addresses are exempt from tax and 24h limit
 * - Pausable for emergency situations
 */
contract RWAToken is ERC20, ERC20Permit, Ownable, Pausable {
    // Tax configuration
    uint256 public constant SELL_TAX_RATE = 4; // 4% default when no staking info (base rate max 4%)
    uint256 public constant SELL_RATIO_THRESHOLD = 30; // Sell above 30% of total: each 1% above adds 1% tax
    uint256 public constant SELL_COOLDOWN = 1 days;   // At most 1 sell per 24 hours per address
    uint256 public constant TREASURY_SHARE = 50; // 50% of tax
    uint256 public constant BURN_SHARE = 25; // 25% of tax (5% of total)
    uint256 public constant LIQUIDITY_SHARE = 25; // 25% of tax (5% of total)
    
    // Addresses (immutable for gas optimization where possible)
    address public immutable treasuryAddress;
    address public immutable liquidityFundAddress;
    address public pancakeSwapPair; // Mutable - can be set after deployment
    address public stakingContract; // StakingContract address for dynamic tax calculation
    
    // Whitelist (using mapping for Gas optimization)
    mapping(address => bool) public whitelist;
    // Last sell timestamp per address (for 24h cooldown)
    mapping(address => uint256) public lastSellTimestamp;
    
    // Events
    event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event LiquidityFundAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event PancakeSwapPairUpdated(address indexed oldPair, address indexed newPair);
    event StakingContractUpdated(address indexed oldContract, address indexed newContract);
    event WhitelistUpdated(address indexed account, bool status);
    event TaxCollected(address indexed from, address indexed to, uint256 amount, uint256 taxAmount);
    event DynamicTaxCalculated(address indexed user, uint256 holdingDays, uint256 sellRatio, uint256 baseRate, uint256 finalRate);
    
    /**
     * @dev Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _initialSupply Initial token supply (in wei, 18 decimals)
     * @param _treasuryAddress Treasury address for receiving tax
     * @param _liquidityFundAddress Liquidity fund address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _treasuryAddress,
        address _liquidityFundAddress
    ) ERC20(_name, _symbol) ERC20Permit(_name) Ownable(msg.sender) {
        require(_treasuryAddress != address(0), "Treasury address cannot be zero");
        require(_liquidityFundAddress != address(0), "Liquidity fund address cannot be zero");
        
        treasuryAddress = _treasuryAddress;
        liquidityFundAddress = _liquidityFundAddress;
        
        // Mint initial supply to deployer
        _mint(msg.sender, _initialSupply);
        
        // Add deployer to whitelist
        whitelist[msg.sender] = true;
        whitelist[_treasuryAddress] = true;
        whitelist[_liquidityFundAddress] = true;
    }
    
    /**
     * @dev Calculate dynamic sell tax rate based on weighted average holding period and sell ratio
     * @param user User address
     * @param sellAmount Sell amount
     * @return taxRate Tax rate in percentage (0-100)
     */
    function calculateDynamicSellTaxRate(address user, uint256 sellAmount) internal view returns (uint256 taxRate) {
        // If staking contract is not set, use default rate
        if (stakingContract == address(0)) {
            return SELL_TAX_RATE; // Default (no staking info)
        }
        
        // Get user stake info from StakingContract
        (bool success, bytes memory data) = stakingContract.staticcall(
            abi.encodeWithSignature("getUserStakeInfoForTax(address)", user)
        );
        
        if (!success || data.length == 0) {
            return SELL_TAX_RATE; // Default (cannot read staking info)
        }
        
        (uint256 totalStaked, uint256 weightedAverageTime) = abi.decode(data, (uint256, uint256));
        
        // If user has no stake, use default rate
        if (totalStaked == 0) {
            return SELL_TAX_RATE; // Default (non-staker)
        }
        
        // Calculate weighted average holding days
        uint256 holdingDays = weightedAverageTime / 1 days;
        
        // Base tax rate from weighted average holding period (max 4%)
        uint256 baseRate;
        if (holdingDays < 30) {
            baseRate = 4;  // 4% for < 30 days
        } else if (holdingDays < 90) {
            baseRate = 3;  // 3% for 30-90 days
        } else if (holdingDays < 180) {
            baseRate = 2;  // 2% for 90-180 days
        } else {
            baseRate = 1;  // 1% for 180+ days
        }
        
        // Sell ratio = sell amount as % of total staked (user's "总额" = totalStaked)
        uint256 sellRatio = (sellAmount * 100) / totalStaked;
        
        // Above 30%: each 1% above 30% adds 1% tax (no cap on this penalty)
        uint256 finalRate = baseRate;
        if (sellRatio > SELL_RATIO_THRESHOLD) {
            uint256 additionalTax = sellRatio - SELL_RATIO_THRESHOLD;
            finalRate = baseRate + additionalTax;
            // Cap at 100% so taxAmount never exceeds amount
            if (finalRate > 100) {
                finalRate = 100;
            }
        }
        
        return finalRate;
    }
    
    /**
     * @dev Override transfer function to implement dynamic tax logic
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        // Check if this is a sell transaction (to PancakeSwap Pair)
        bool isSell = to == pancakeSwapPair && pancakeSwapPair != address(0);
        
        // Check if sender or receiver is whitelisted
        bool isAddressWhitelisted = whitelist[from] || whitelist[to];
        
        // Apply tax only on sell transactions from non-whitelisted addresses
        if (isSell && !isAddressWhitelisted && from != address(0) && to != address(0)) {
            // 24h cooldown: at most 1 sell per address per day
            require(
                lastSellTimestamp[from] == 0 || block.timestamp >= lastSellTimestamp[from] + SELL_COOLDOWN,
                "Only one sell per 24h"
            );
            lastSellTimestamp[from] = block.timestamp;
            
            // Calculate dynamic tax rate
            uint256 taxRate = calculateDynamicSellTaxRate(from, amount);
            
            uint256 taxAmount;
            uint256 amountAfterTax;
            unchecked {
                taxAmount = (amount * taxRate) / 100;
                amountAfterTax = amount - taxAmount;
            }
            
            // Calculate tax distribution (optimized: cache calculations)
            uint256 treasuryAmount;
            uint256 burnAmount;
            uint256 liquidityAmount;
            unchecked {
                treasuryAmount = (taxAmount * TREASURY_SHARE) / 100;
                burnAmount = (taxAmount * BURN_SHARE) / 100;
                liquidityAmount = taxAmount - treasuryAmount - burnAmount;
            }
            
            // Get user stake info for event emission
            uint256 holdingDays = 0;
            uint256 sellRatio = 0;
            if (stakingContract != address(0)) {
                (bool success, bytes memory data) = stakingContract.staticcall(
                    abi.encodeWithSignature("getUserStakeInfoForTax(address)", from)
                );
                if (success && data.length > 0) {
                    (uint256 totalStaked, uint256 weightedAverageTime) = abi.decode(data, (uint256, uint256));
                    if (totalStaked > 0) {
                        holdingDays = weightedAverageTime / 1 days;
                        sellRatio = (amount * 100) / totalStaked;
                    }
                }
            }
            
            // Transfer to Treasury
            super._update(from, treasuryAddress, treasuryAmount);
            
            // Burn tokens
            super._update(from, address(0), burnAmount);
            
            // Transfer to Liquidity Fund
            super._update(from, liquidityFundAddress, liquidityAmount);
            
            // Transfer remaining amount to recipient
            super._update(from, to, amountAfterTax);
            
            emit TaxCollected(from, to, amount, taxAmount);
            emit DynamicTaxCalculated(from, holdingDays, sellRatio, taxRate, taxRate);
        } else {
            // No tax applied
            super._update(from, to, amount);
        }
    }
    
    // Note: treasuryAddress and liquidityFundAddress are now immutable
    // These functions are removed to save gas. If you need to change addresses,
    // you would need to deploy a new contract. This is a security feature.
    // If you need mutable addresses, remove 'immutable' keyword above.
    
    // Removed setTreasuryAddress and setLiquidityFundAddress functions
    // because addresses are now immutable for gas optimization and security
    
    /**
     * @dev Set PancakeSwap Pair address
     * @param _pancakeSwapPair PancakeSwap pair address
     */
    function setPancakeSwapPair(address _pancakeSwapPair) external onlyOwner {
        require(_pancakeSwapPair != address(0), "Pair address cannot be zero");
        address oldPair = pancakeSwapPair;
        pancakeSwapPair = _pancakeSwapPair;
        emit PancakeSwapPairUpdated(oldPair, _pancakeSwapPair);
    }
    
    /**
     * @dev Set StakingContract address for dynamic tax calculation
     * @param _stakingContract StakingContract address
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "StakingContract address cannot be zero");
        address oldContract = stakingContract;
        stakingContract = _stakingContract;
        emit StakingContractUpdated(oldContract, _stakingContract);
    }
    
    /**
     * @dev Get dynamic sell tax rate for a user (view function)
     * @param user User address
     * @param sellAmount Sell amount
     * @return taxRate Tax rate in percentage (0-100)
     */
    function getDynamicSellTaxRate(address user, uint256 sellAmount) external view returns (uint256 taxRate) {
        return calculateDynamicSellTaxRate(user, sellAmount);
    }
    
    /**
     * @dev Get next timestamp when user is allowed to sell again (0 = never sold)
     */
    function getNextSellAllowedTime(address user) external view returns (uint256) {
        if (lastSellTimestamp[user] == 0) return 0;
        return lastSellTimestamp[user] + SELL_COOLDOWN;
    }
    
    /**
     * @dev Add or remove address from whitelist
     * @param account Address to update
     * @param status Whitelist status (true = whitelisted, false = not whitelisted)
     */
    function setWhitelist(address account, bool status) external onlyOwner {
        require(account != address(0), "Cannot whitelist zero address");
        whitelist[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    /**
     * @dev Batch update whitelist
     * @param accounts Array of addresses to update
     * @param status Whitelist status for all addresses
     */
    function setWhitelistBatch(address[] calldata accounts, bool status) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Cannot whitelist zero address");
            whitelist[accounts[i]] = status;
            emit WhitelistUpdated(accounts[i], status);
        }
    }
    
    /**
     * @dev Check if address is whitelisted
     * @param account Address to check
     * @return bool Whitelist status
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelist[account];
    }
    
    /**
     * @dev Pause token transfers (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Burn tokens from caller's account
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
