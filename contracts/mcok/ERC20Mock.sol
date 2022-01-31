// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "../dependencies/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {

    constructor(string memory name,
                string memory symbol,
                uint8 decimals) ERC20(name, symbol) {
        _setDecimals(decimals);
    }

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}