// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ERC721ReceiverReject
 * @dev Mock contract that rejects all ERC721 transfers by returning wrong selector
 */
contract ERC721ReceiverReject is IERC721Receiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        // Return wrong selector to reject transfer
        return bytes4(0x12345678);
    }
}

