// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721Token is ERC721 {
    uint public totalSupply;

    constructor() ERC721("NFToken", "NFT") {}

    function mint(address _to) external {
        _safeMint(_to, totalSupply);
        totalSupply += 1;
    }
}
