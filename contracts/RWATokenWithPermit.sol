// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RWATokenWithPermit is ERC20, ERC20Permit, Ownable {
    mapping(address => bool) public whitelist;
    
    constructor() ERC20("RWA Token", "RWA") ERC20Permit("RWA Token") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function addToWhitelist(address account) external onlyOwner {
        whitelist[account] = true;
    }
    
    function removeFromWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
    }
    
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            require(whitelist[to] || whitelist[from], "Transfer not allowed");
        }
        super._update(from, to, value);
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
