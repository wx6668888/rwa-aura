// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";

contract MockPausable is Pausable {
    function pause() external {
        _pause();
    }

    function unpause() external {
        _unpause();
    }
}
