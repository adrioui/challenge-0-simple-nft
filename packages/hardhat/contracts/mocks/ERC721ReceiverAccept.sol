// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ERC721ReceiverAccept
 * @dev Mock contract that properly implements IERC721Receiver and accepts all transfers
 */
contract ERC721ReceiverAccept is IERC721Receiver {
    event TokenReceived(address operator, address from, uint256 tokenId, bytes data);

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        emit TokenReceived(operator, from, tokenId, data);
        return IERC721Receiver.onERC721Received.selector;
    }
}

