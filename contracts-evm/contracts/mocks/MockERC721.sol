//SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        // Use CryptoKitties as a base URI for this mock collection
        // _baseURI("https://api.cryptokitties.co/kitties/");
    }

    function _baseURI() internal override pure returns (string memory) {
        return "https://api.cryptokitties.co/kitties/";
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function safeMint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }

    function safeMint(address to, uint256 tokenId, bytes memory _data) public {
        _safeMint(to, tokenId, _data);
    }

    function burn(uint256 tokenId) public {
        _burn(tokenId);
    }

}
