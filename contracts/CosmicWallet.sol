// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFeeValueStorage {
    function feeRate() external view returns (uint);
}

contract CosmicWallet {
    using SafeERC20 for IERC20;

    uint public constant MAX_FEE_RATE = 1e4;

    /* State variables */
    address public immutable owner;
    address public immutable feeValueStorage;
    address public feeReceiver;
    mapping(address => mapping(address => uint)) public erc20Allowance;
    mapping(address => mapping(address => mapping(uint => bool)))
        public erc721Allowance;
    mapping(address => mapping(address => bool)) public erc721AllowanceForAll;

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
        require(msg.sender == owner, "You are not the owner");
        _;
    }

    constructor(
        address _owner,
        address _feeValueStorage,
        address _feeReceiver
    ) {
        require(_feeReceiver != address(0), "CosmicWallet: Address Zero");

        owner = _owner;
        feeValueStorage = _feeValueStorage;
        feeReceiver = _feeReceiver;
    }

    function setFeeReceiver(address _newFeeReceiver) external onlyOwner {
        feeReceiver = _newFeeReceiver;
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
        uint feeRate = IFeeValueStorage(feeValueStorage).feeRate();
        uint amount = msg.value;
        uint fee = amount * (feeRate / MAX_FEE_RATE);
        if (fee > 0) {
            (bool success, ) = feeReceiver.call{value: fee}("");
            require(success, "CosmicWallet: Ether transfer failed");
        }
        emit EthReceived(msg.sender, amount, block.timestamp);
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
                // IERC20(_token).allowance(address(this), withdrawer) >= _amount,
                erc20Allowance[_token][withdrawer] >= _amount,
                "CosmicWallet: Insufficient allowance"
            );
            erc20Allowance[_token][withdrawer] -= _amount;
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

    function internalAproveForERC20Token(
        address _token,
        address _spender,
        uint _amount
    ) external onlyOwner {
        erc20Allowance[_token][_spender] = _amount;
    }

    // Approval for external contracts that need direct communication with the wallet
    function externalApproveForERC20Token(
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
        if (withdrawer != owner) {
            if (erc721Allowance[_token][withdrawer][_tokenId]) {
                erc721Allowance[_token][withdrawer][_tokenId] = false;
            } else {
                require(
                    erc721AllowanceForAll[_token][withdrawer],
                    "CosmicWallet: Insufficient allowance"
                );
            }
        }
        IERC721(_token).safeTransferFrom(address(this), _recipient, _tokenId);
        if (IERC721(_token).balanceOf(address(this)) == 0) {
            erc721AllowanceForAll[_token][withdrawer] = false;
        }

        emit ERC721Withdraw(
            _token,
            withdrawer,
            _recipient,
            _tokenId,
            block.timestamp
        );
    }

    function internalAproveForERC721Token(
        address _token,
        address _spender,
        uint _tokenId,
        bool _approval
    ) external onlyOwner {
        erc721Allowance[_token][_spender][_tokenId] = _approval;
    }

    function internalAproveForAllERC721Token(
        address _token,
        address _spender,
        bool _approval
    ) external onlyOwner {
        erc721AllowanceForAll[_token][_spender] = _approval;
    }

    // Approval for external contracts that need direct communication with the wallet
    function externalAproveForERC721Token(
        address _token,
        address _spender,
        uint _tokenId
    ) external onlyOwner {
        IERC721(_token).approve(_spender, _tokenId);
    }

    function externalAproveForAllERC721Token(
        address _token,
        address _spender,
        bool _approved
    ) external onlyOwner {
        IERC721(_token).setApprovalForAll(_spender, _approved);
    }
}
