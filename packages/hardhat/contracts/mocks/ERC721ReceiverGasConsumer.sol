// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ERC721ReceiverGasConsumer
 * @dev Mock contract that consumes a lot of gas during onERC721Received
 * Useful for testing gas limit scenarios
 */
contract ERC721ReceiverGasConsumer is IERC721Receiver {
    mapping(uint256 => uint256) public wastedStorage;

    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // Consume gas by doing unnecessary storage operations
        for (uint256 i = 0; i < 100; i++) {
            wastedStorage[tokenId + i] = block.timestamp + i;
        }
        
        return IERC721Receiver.onERC721Received.selector;
    }
}

