// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestUSDT
 * @dev 测试用的 USDT 代币，用于本地开发和测试
 * 
 * 特性:
 * - 6 位小数（与真实 USDT 相同）
 * - 任何人都可以铸造（仅用于测试）
 * - 初始供应量 100 万 USDT
 */
contract TestUSDT is ERC20 {
    /**
     * @dev 构造函数
     * 铸造 100 万 USDT 给部署者
     */
    constructor() ERC20("Test USDT", "USDT") {
        // 铸造 100 万 USDT (6 decimals)
        _mint(msg.sender, 1000000 * 10**6);
    }
    
    /**
     * @dev 返回代币精度（6 位小数）
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    /**
     * @dev 铸造代币（仅用于测试）
     * @param to 接收地址
     * @param amount 铸造数量（6 位小数）
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev 批量铸造（方便测试）
     * @param recipients 接收地址数组
     * @param amounts 铸造数量数组
     */
    function mintBatch(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
}
