// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title MetaStakingExtension
 * @dev Extension for StakingContract to support gasless transactions via EIP-712 signatures
 */
abstract contract MetaStakingExtension is EIP712 {
    using ECDSA for bytes32;

    // Nonce for replay protection
    mapping(address => uint256) public nonces;

    // EIP-712 type hashes
    bytes32 private constant STAKE_TYPEHASH = keccak256(
        "Stake(address user,uint256 amount,address referrer,uint256 lockPeriod,uint256 nonce,uint256 deadline)"
    );

    bytes32 private constant STAKE_RWA_TYPEHASH = keccak256(
        "StakeRWA(address user,uint256 amount,address referrer,uint256 lockPeriod,uint256 nonce,uint256 deadline)"
    );

    bytes32 private constant WITHDRAW_TYPEHASH = keccak256(
        "Withdraw(address user,uint256 stakeId,uint256 nonce,uint256 deadline)"
    );

    event MetaTransactionExecuted(address indexed user, address indexed relayer, string action);

    constructor() EIP712("RWAStaking", "1") {}

    /**
     * @dev Verify stake signature
     */
    function _verifyStakeSignature(
        address user,
        uint256 amount,
        address referrer,
        uint256 lockPeriod,
        uint256 deadline,
        bytes memory signature
    ) internal returns (bool) {
        require(block.timestamp <= deadline, "Signature expired");
        
        bytes32 structHash = keccak256(
            abi.encode(STAKE_TYPEHASH, user, amount, referrer, lockPeriod, nonces[user]++, deadline)
        );
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        
        return signer == user;
    }

    /**
     * @dev Verify stake RWA signature
     */
    function _verifyStakeRWASignature(
        address user,
        uint256 amount,
        address referrer,
        uint256 lockPeriod,
        uint256 deadline,
        bytes memory signature
    ) internal returns (bool) {
        require(block.timestamp <= deadline, "Signature expired");
        
        bytes32 structHash = keccak256(
            abi.encode(STAKE_RWA_TYPEHASH, user, amount, referrer, lockPeriod, nonces[user]++, deadline)
        );
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        
        return signer == user;
    }

    /**
     * @dev Verify withdraw signature
     */
    function _verifyWithdrawSignature(
        address user,
        uint256 stakeId,
        uint256 deadline,
        bytes memory signature
    ) internal returns (bool) {
        require(block.timestamp <= deadline, "Signature expired");
        
        bytes32 structHash = keccak256(
            abi.encode(WITHDRAW_TYPEHASH, user, stakeId, nonces[user]++, deadline)
        );
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        
        return signer == user;
    }
}
