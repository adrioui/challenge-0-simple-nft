// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YourCollectible is ERC721, ERC721Enumerable, ERC721URIStorage, ReentrancyGuard, Ownable {
    uint256 public tokenIdCounter;

    constructor() ERC721("YourCollectible", "YCB") Ownable(msg.sender) {}

    function _baseURI() internal view override returns (string memory) {
        return "https://ipfs.io/ipfs/";
    }


    /**
     * @notice Public mint function — any account may mint
     * @dev Marked nonReentrant to prevent reentrancy during _safeMint (which calls onERC721Received).
     *      We call _safeMint first (so token exists and ownership is assigned) then _setTokenURI.
     * @param to recipient
     * @param uri token-specific path/CID (may be empty)
     * @return tokenId minted token id
     */
    function mintItem(address to, string memory uri) public nonReentrant returns (uint256) {
        // _safeMint will revert for zero address with OZ v5's custom error (no need to duplicate)
        tokenIdCounter++;
        uint256 tokenId = tokenIdCounter;

        // Safe mint triggers onERC721Received on contracts. ReentrancyGuard prevents
        // re-entrance into this function while the receiver hook runs.
        _safeMint(to, tokenId);

        // Set token URI after mint. This is safe because reentrancy into mintItem is blocked.
        _setTokenURI(tokenId, uri);

        return tokenId;
    }

    // Override functions from OpenZeppelin ERC721, ERC721Enumerable and ERC721URIStorage

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
