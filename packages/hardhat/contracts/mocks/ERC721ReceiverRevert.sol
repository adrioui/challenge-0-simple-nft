// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ERC721ReceiverRevert
 * @dev Mock contract that reverts on ERC721 transfers
 */
contract ERC721ReceiverRevert is IERC721Receiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert("ERC721ReceiverRevert: transfer rejected");
    }
}

