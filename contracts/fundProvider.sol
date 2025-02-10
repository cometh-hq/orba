// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// Disclaimer: This contract is for demonstration purposes only and is not intended for production use.
contract FundProvider {
    using ECDSA for bytes32;

    address public immutable coSigner;
    IERC20 public immutable usdc;

    event Withdrawal(address indexed to, uint256 amount);

    constructor(address _coSigner, address _usdc) {
        require(_coSigner != address(0), "Invalid co-signer address");
        require(_usdc != address(0), "Invalid USDC address");

        coSigner = _coSigner;
        usdc = IERC20(_usdc);
    }

    function getWithdrawalHash(address to, uint256 amount) external view returns (bytes32) {
        return keccak256(abi.encodePacked(to, amount, address(this)));
    }

    function withdraw(address to, uint256 amount, bytes memory signature) external {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        bytes32 messageHash = keccak256(abi.encodePacked(to, amount, address(this)));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(ECDSA.recover(ethSignedMessageHash, signature) == coSigner, "Invalid signature");

        require(usdc.transfer(to, amount), "USDC transfer failed");

        emit Withdrawal(to, amount);
    }
}