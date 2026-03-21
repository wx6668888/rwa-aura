// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestUSDTWithPermit is ERC20Permit, Ownable {
    uint8 private _decimals = 6;

    constructor() ERC20("Test USDT", "USDT") ERC20Permit("Test USDT") Ownable(msg.sender) {}

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
