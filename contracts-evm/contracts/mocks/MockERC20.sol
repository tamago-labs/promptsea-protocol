//SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {

    uint8 _d;

    constructor(
        string memory name,
        string memory symbol,
        uint8 _decimals
    ) ERC20(name, symbol) {
        _d = _decimals;
    }

    function decimals() public view virtual override returns (uint8) {
        return _d;
    }

    function faucet() public {
        _mint(msg.sender, 10000 * (10 ** uint256(decimals())));
    }

    function deposit(uint256 _amount) public payable {
        
    }   

    function withdraw(uint256 _amount) public {

    }

}