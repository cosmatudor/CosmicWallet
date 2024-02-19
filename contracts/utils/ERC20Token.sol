// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Token is ERC20 {
    constructor() ERC20("Token", "Token") {}

    function mint(address _to, uint _value) external {
        _mint(_to, _value);
    }
}
