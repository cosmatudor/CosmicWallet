// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CosmicWallet {
    using SafeERC20 for IERC20;

    /* State variables */
    address public immutable owner;

    /* Events */
    event EthReceived(address indexed sender, uint amount, uint timestamp);
    event EthWithdraw(address indexed recepient, uint amout, uint timestamp);
    event ERC20Withdraw(
        address indexed token,
        address indexed withdrawer,
        address indexed recepient,
        uint amount,
        uint timestamp
    );
    event ERC721Withdraw(
        address indexed token,
        address indexed withdrawer,
        address indexed recepient,
        uint tokenId,
        uint timestamp
    );

    /* Modifiers */
    modifier onlyOwner() {
        require(msg.sender == owner, "You are not the owner!");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    // Ether Management
    function withdrawEth(address _recepient, uint _amount) external onlyOwner {
        require(_amount > 0, "CosmicWallet: Invalid amount");
        require(
            address(this).balance >= _amount,
            "CosmicWallet: Not enough Eth to withdraw"
        );
        require(_recepient != address(0), "CosmicWallet: Zero Address");

        (bool success, ) = _recepient.call{value: _amount}("");
        require(success, "CosmicWallet: ETH transfer failed");

        emit EthWithdraw(_recepient, _amount, block.timestamp);
    }

    receive() external payable {
        emit EthReceived(msg.sender, msg.value, block.timestamp);
    }

    // --- ERC20 Tokens Support ---
    function withdrawERC20Token(
        address _token,
        address _recepient,
        uint _amount
    ) external {
        require(_amount > 0, "CosmicWallet: Invalid amount");

        address walletAddress = address(this);
        require(
            IERC20(_token).balanceOf(walletAddress) >= _amount,
            "CosmicWallet: Not enough tokens to withdraw"
        );

        address withdrawer = msg.sender;
        if (withdrawer != owner) {
            require(
                IERC20(_token).allowance(address(this), withdrawer) >= _amount,
                "CosmicWallet: Insufficient allowance"
            );
        }
        IERC20(_token).safeTransfer(_recepient, _amount);

        emit ERC20Withdraw(
            _token,
            withdrawer,
            _recepient,
            _amount,
            block.timestamp
        );
    }

    function approveForERC20Token(
        address _token,
        address _spender,
        uint _amount
    ) external onlyOwner {
        IERC20(_token).approve(_spender, _amount);
    }

    // --- ERC721 Tokens Support ---
    function withdrawERC721Token(
        address _token,
        address _recipient,
        uint _tokenId
    ) external {
        require(
            IERC721(_token).ownerOf(_tokenId) == address(this),
            "CosmicWallet: There is not token to withdraw"
        );

        address withdrawer = msg.sender;
        // Check if the withdrawer is either the owner or has been approved for this specific token
        if (withdrawer != owner) {
            require(
                IERC721(_token).getApproved(_tokenId) == withdrawer ||
                    IERC721(_token).isApprovedForAll(address(this), withdrawer),
                "CosmicWallet: Withdrawer not approved"
            );
        }

        IERC721(_token).safeTransferFrom(address(this), _recipient, _tokenId);

        emit ERC721Withdraw(
            _token,
            withdrawer,
            _recipient,
            _tokenId,
            block.timestamp
        );
    }

    function aproveForERC721Token(
        address _token,
        address _spender,
        uint _tokenId
    ) external onlyOwner {
        IERC721(_token).approve(_spender, _tokenId);
    }

    function aproveForAllERC721Token(
        address _token,
        address _spender,
        bool _approved
    ) external onlyOwner {
        IERC721(_token).setApprovalForAll(_spender, _approved);
    }
}
