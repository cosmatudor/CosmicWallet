// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FeeValueStorage {
    address public owner;
    uint public feeRate;

    uint public constant MAX_FEE_RATE = 1e4;

    modifier validFeeRate(uint _feeRate) {
        require(_feeRate <= MAX_FEE_RATE, "FeeValueStorage: Invalid fee rate");
        _;
    }

    constructor(uint _feeRate) validFeeRate(_feeRate) {
        owner = msg.sender;
        feeRate = _feeRate;
    }

    function setFeeRate(uint _feeRate) external validFeeRate(_feeRate) {
        require(msg.sender == owner, "FeeValueStorage: You are not the owner");
        feeRate = _feeRate;
    }
}
