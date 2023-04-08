// SPDX-License-Identifier: MIT 

pragma solidity 0.8.10;

interface IArtwork {
    
    function tokenOwners(uint256 _tokenId) external view returns (address);
    
    function tokenOwnerCount() external view returns (uint256);

    function uri(uint256 _tokenId) external view returns (string memory);

    function balanceOf(address _account, uint256 _tokenId) external view returns (uint256);

    function isApprovedForAll(address _account, address _operator) external view returns (bool);

}