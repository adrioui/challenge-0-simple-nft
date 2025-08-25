// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ERC721ReceiverReentrant
 * @dev Mock contract that attempts reentrancy during onERC721Received
 */
contract ERC721ReceiverReentrant is IERC721Receiver {
    IERC721 public immutable nftContract;
    bool public reentrancyAttempted = false;

    constructor(address _nftContract) {
        nftContract = IERC721(_nftContract);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // Attempt reentrancy by trying to transfer the token we just received
        if (!reentrancyAttempted) {
            reentrancyAttempted = true;
            // This should fail due to OpenZeppelin's reentrancy protection
            // Wrap in try/catch to avoid cluttering test logs with revert messages
            try nftContract.transferFrom(address(this), from, tokenId) {
                // If this succeeds, reentrancy protection failed
                revert("Reentrancy attack succeeded - this should not happen!");
            } catch {
                // Expected: reentrancy should be blocked
            }
        }
        
        return IERC721Receiver.onERC721Received.selector;
    }
}

