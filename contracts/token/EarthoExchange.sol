// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "../dependencies/contracts/access/Ownable.sol";
import "../dependencies/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../dependencies/contracts/utils/math/SafeMath.sol";
import "../dependencies/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interface/IUniswapV2Router.sol";
import "../interface/IWETH.sol";
import "./Eartho.sol";

import "../utils/DebugTool.sol";

contract EarthoExchange is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // bsc: 0x10ed43c718714eb63d5aa57b78b54704e256024e (pancakeswap base on uniswap)
    IUniswapV2Router02 public immutable _uniswapV2Router;
    Eartho public immutable _eartho;
    IWETH public immutable _weth;
    /**
     * bsc usd set:
         usdc: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
         usdt: 0x55d398326f99059ff775485246999027b3197955.
    **/
    address[] public _usd;
    // who will receive payment
    address public _recipient;
    // the purchase price for earth(for example: $1.00 --> 100)
    uint32 public _purchasePrice;
    uint32 public constant PRICE_BASE = 100;

    // the input params of purchase
    struct purchaseInput {
        int16 longitude;                // [-1800, 1800]: -1800 mean: 180°.00'W; 121 mean: 12°.10'E
        int16 latitude;                 // [-900, 900]: -900 mean: 90°.00'S; 121 mead: 12°.10'N
        string link;
        address to;
    }

    /**** event ****/
    event Purchase(address user, address asset, uint256 amount);


    constructor (address swapV2Router,
                 address eartho,
                 address weth,
                 address[] memory usd,
                 address recipient) {
        _uniswapV2Router = IUniswapV2Router02(swapV2Router);
        _eartho = Eartho(eartho);
        _weth = IWETH(weth);
        _purchasePrice = PRICE_BASE;

        for ( uint256 i = 0; i < usd.length; i++ ) {
            _usd.push(usd[i]);
        }
        _recipient = recipient;
    }

    /*
    * @dev: setPurchasePrice for setting the price for nft
    */
    function setPurchasePrice(uint32 price) external onlyOwner {
        require(price > 0, "Set purchase price fail for price is zero");
        _purchasePrice = price;
    }

    /*
    * @dev purchaseByToken for buy eartho by erc-20/bep-20 asset
    * @params token: the address of asset
    * @params amount: the buy amount for user by asset
    * @params input: the input params of purchase
    */
    function purchaseByToken(address asset, uint256 amount, purchaseInput memory input) external {
        require(amount > 0, "purchase eartho fail for amount is zero");
        uint256 price = 0;
        bool isUSD = _matchUSD(asset);

        if ( isUSD ) {
            uint8 decimals = IERC20Metadata(asset).decimals();
            price = _purchasePrice*(10**decimals) / PRICE_BASE;
            if ( amount >= price ) {
                IERC20(asset).safeTransferFrom(msg.sender, _recipient, amount);
                price = amount;
            } else {
                price = 0;
            }
        }
        else {
            price = _swap(asset, amount);
        }

        /*if ( price < amount ) {
            string memory print1 = DebugTool.uintToString(price);
            require(false, print1);
        }*/
        require((price > 0 && price >= amount), 'purchase eartho fail for amount is not enough');
        _mintNFT(input);
        emit Purchase(input.to, asset, amount);
    }

    /*
    * @dev purchaseByETH for buy eartho by eth
    * @params input: the input params of purchase
    */
    function purchaseByETH(purchaseInput memory input) external payable {
        uint256 amount = msg.value;
        uint256 price = 0;
        require(amount > 0, "purchase eartho by ETH fail for amount is zero");

        _weth.deposit{value: amount}();
        price = _swap(address(_weth), amount);

        require(price >= amount, 'purchase eartho fail for amount is not enough');
        _mintNFT(input);
        emit Purchase(input.to, address(_weth), amount);
    }

    /*
    * @dev getAmount the purchase nft amount of asset
    * @params: the address of asset
    */
    function getAmount(address asset) public view returns(uint256) {
        uint8 decimals = 0;
        uint256 price = 0;
        uint256 amount = 0;
        address[] memory path = new address[](2);
        address[] memory path2 = new address[](3);
        uint256 i = 0;

        while ( i < _usd.length ) {
            path[0] = asset;
            path[1] = _usd[i];

            decimals = IERC20Metadata(_usd[i]).decimals();
            price = _purchasePrice*(10**decimals) / PRICE_BASE;

            amount = _getAmount(path, price);
            if ( amount == 0 ) {
                if ( asset != address(_weth) ) {
                    path2[0] = asset;
                    path2[1] = address(_weth);
                    path2[2] = _usd[i];
                    amount = _getAmount(path2, price);
                }
            }

            if ( amount > 0 ) {
                break;
            } else {
                i++;
            }
        }

        return amount;
    }

    function _getAmount(address[] memory path, uint256 auctionPrice) internal view returns (uint256) {
        try _uniswapV2Router.getAmountsIn(auctionPrice, path) returns (uint[] memory amounts) {
            return (amounts.length > 0) ? amounts[0] : 0;
        } catch (bytes memory) {
            return 0;
        }
    }

    function _swap(address asset, uint256 amount) internal returns (uint256) {
        uint256 i = 0;
        uint256 ret = amount;

        while ( i < _usd.length ) {
            if ( _isSwap(_usd[i], asset, amount) ) {
                break;
            } else {
                i++;
            }
        }

        if ( i < _usd.length ) {
            return ret;
        }
        else {
            return 0;
        }
    }

    function _isSwap(address usd, address asset, uint256 amount) internal returns (bool) {
        bool ret = false;
        uint8 decimals = IERC20Metadata(usd).decimals();
        uint256 price = _purchasePrice*(10**decimals) / PRICE_BASE;
        address[] memory path = new address[](2);
        address[] memory path2 = new address[](3);
        uint256 approveAmount = IERC20(asset).allowance(address(this), address(_uniswapV2Router));

        if ( approveAmount < amount ) {
            approveAmount = type(uint128).max;
            IERC20(asset).approve(address(_uniswapV2Router), approveAmount);
        }

        if ( asset != address(_weth) ) {
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        }

        path[0] = asset;
        path[1] = usd;
        ret = _swapToken(path, amount, price);
        if ( !ret ) {
            if ( asset != address(_weth) ) {
                path2[0] = asset;
                path2[1] = address(_weth);
                path2[2] = usd;
                ret = _swapToken(path2, amount, price);
            }
        }

        return ret;
    }

    function _swapToken(address[] memory path, uint256 amount, uint256 auctionPrice) internal returns(bool) {
        bool ret = false;
        uint256 refPrice = 0;

        (ret, refPrice) = auctionPrice.tryMul(99);
        if ( ret ) {
            refPrice = refPrice.div(100);
            try _uniswapV2Router.swapExactTokensForTokens(amount,
                                                          refPrice,
                                                          path,
                                                          _recipient,
                                                          block.timestamp)
                                                          returns (uint[] memory amounts)
            {
                return (amounts.length > 0) ? true : false;
            } catch Error(string memory revertReason) {
                //if ( path.length >= 3 ) {
                //    require(false, revertReason);
                //}
                return false;
            } catch (bytes memory returnData) {
                return false;
            }
        } else {
            return false;
        }
    }

    function _matchUSD(address asset) internal view returns(bool) {
        uint256 i = 0;

        while ( i < _usd.length ) {
            if ( _usd[i] == asset ) {
                break;
            } else {
                i++;
            }
        }

        return ( i < _usd.length ) ? true : false;
    }

    function _mintNFT(purchaseInput memory input) internal {
        Eartho.mintInput memory mintParams;

        mintParams.context.longitude = input.longitude;
        mintParams.context.latitude = input.latitude;
        mintParams.context.link = input.link;
        mintParams.context.level = rand();
        mintParams.to = input.to;

        _eartho.mint(mintParams);
    }

    function rand() internal view returns(uint8) {
        uint256 random = uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp)));
        return uint8(random%6+1);
    }
}