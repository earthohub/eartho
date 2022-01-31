const Eartho = artifacts.require("Eartho");
const WETH = artifacts.require("WETH9");
const Factory = artifacts.require("PancakeFactory");
const Router = artifacts.require("PancakeRouter");
const USDC = artifacts.require("ERC20Mock");
const USDT = artifacts.require("ERC20Mock");
const ATOKEN = artifacts.require("ERC20Mock");
const BTOKEN = artifacts.require("ERC20Mock");
const EarthoExchange = artifacts.require("EarthoExchange");
const BigNumber = require("bignumber.js");

let owner;
let andy;
let recipient;
let swapRouter;
let weth;
let wethBase;
let usdc;
let usdcBase;
let usdt;
let usdtBase;
let atoken;
let atokenBase;
let btoken;
let btokenBase;
let earthoNFT;
let earthoExchangeIns;
let isInit = false;

contract('EarthoExchangeTest', async accounts => {
    beforeEach(async() => {
        if ( !isInit ) {
            owner = accounts[0];
            andy = accounts[1];
            recipient = accounts[2];

            await web3.eth.sendTransaction({from: accounts[6], to: andy, value: '90000000000000000000'});
            await web3.eth.sendTransaction({from: accounts[7], to: andy, value: '90000000000000000000'});
            await web3.eth.sendTransaction({from: accounts[8], to: andy, value: '90000000000000000000'});
            await web3.eth.sendTransaction({from: accounts[9], to: andy, value: '90000000000000000000'});

            earthoNFT = await Eartho.deployed();
            swapRouter = await Router.deployed();

            weth = await WETH.deployed();
            console.log("WETH symbol=" + await weth.symbol() + ", decimals=" + await weth.decimals()
                        + ", address=" + weth.address);
            var decimals = new BigNumber(await weth.decimals());
            var base = new BigNumber(10);
            wethBase = base.exponentiatedBy(decimals);
            //swapRouter = await Router.deployed();
            usdc = await USDC.at('0x8f0483125FCb9aaAEFA9209D8E9d7b9C8B9Fb90F');
            decimals = new BigNumber(await usdc.decimals());
            usdcBase = base.exponentiatedBy(decimals);
            usdt = await USDT.at('0x9FBDa871d559710256a2502A2517b794B482Db40');
            decimals = new BigNumber(await usdt.decimals());
            usdtBase = base.exponentiatedBy(decimals);
            atoken = await ATOKEN.at('0x2C2B9C9a4a25e24B174f26114e8926a9f2128FE4');
            decimals = new BigNumber(await atoken.decimals());
            atokenBase = base.exponentiatedBy(decimals);
            btoken = await BTOKEN.at('0x30753E4A8aad7F8597332E813735Def5dD395028');
            decimals = new BigNumber(await btoken.decimals());
            btokenBase = base.exponentiatedBy(decimals);

            // mint erc20
            var mintSupply = new BigNumber(10000);
            mintSupply = mintSupply.multipliedBy(usdcBase);
            await usdc.mint(mintSupply, {from: andy});
            var balance = new BigNumber(await usdc.balanceOf(andy));
            console.log("Andy usdc=" + usdc.address + ",balance = " + balance.dividedBy(base).toNumber());

            mintSupply = new BigNumber(10000);
            mintSupply = mintSupply.multipliedBy(usdtBase);
            await usdt.mint(mintSupply, {from: andy});
            balance = new BigNumber(await usdt.balanceOf(andy));
            console.log("Andy usdt=" + usdt.address + ",balance = " + balance.dividedBy(base).toNumber());

            mintSupply = new BigNumber(800000);
            mintSupply = mintSupply.multipliedBy(atokenBase);
            await atoken.mint(mintSupply, {from: andy});
            balance = new BigNumber(await atoken.balanceOf(andy));
            console.log("Andy atoken=" + atoken.address + ",balance = " + balance.dividedBy(base).toNumber());

            mintSupply = new BigNumber(900000);
            mintSupply = mintSupply.multipliedBy(btokenBase);
            await btoken.mint(mintSupply, {from: andy});
            balance = new BigNumber(await btoken.balanceOf(andy));
            console.log("Andy btoken=" + btoken.address + ",balance = " + balance.dividedBy(base).toNumber());

            // add pool eth:usdc 1:2.5
            var amount = new BigNumber(25);
            amount = amount.multipliedBy(usdcBase);
            var block = await web3.eth.getBlock();
            var value = new BigNumber(10);
            value = value.multipliedBy(wethBase);
            console.log('amount=' + amount + ',value=' + value.toNumber());
            var approveAmount = new BigNumber('1e+25');
            await usdc.approve(swapRouter.address, approveAmount, {from: andy});
            await swapRouter.addLiquidityETH(usdc.address,
                                             amount,
                                             0,
                                             0,
                                             andy,
                                             block.timestamp+300, {from:andy, value:value.toNumber()});
            console.log("addLiquidityETH success");
            var amountIn = new BigNumber("1e+18");
            var path = [];
            path.push(weth.address);
            path.push(usdc.address);
            var amountOuts = await swapRouter.getAmountsOut(amountIn, path);
            var price = new BigNumber(amountOuts[1].toString());
            price = price.dividedBy(usdcBase).toFixed(3);
            console.log('One weth = $' + price.toString() + ' usdc');

            // add pool eth:usdt 1:2.5
            amount = new BigNumber(50);
            amount = amount.multipliedBy(usdtBase);
            block = await web3.eth.getBlock();
            value = new BigNumber(20);
            value = value.multipliedBy(wethBase);
            console.log('amount=' + amount + ',value=' + value.toNumber());
            var approveAmount = new BigNumber('1e+25');
            await usdt.approve(swapRouter.address, approveAmount, {from: andy});
            await swapRouter.addLiquidityETH(usdt.address,
                                             amount,
                                             0,
                                             0,
                                             andy,
                                             block.timestamp+300, {from:andy, value:value.toNumber()});
            console.log("addLiquidityETH/usdt success");
            amountIn = new BigNumber("1e+18");
            path = [];
            path.push(weth.address);
            path.push(usdt.address);
            amountOuts = await swapRouter.getAmountsOut(amountIn, path);
            price = new BigNumber(amountOuts[1].toString());
            price = price.dividedBy(usdtBase).toFixed(3);
            console.log('One weth = $' + price.toString() + ' usdt');


            // add pool eth:atoken 1:50
            amount = new BigNumber(2000);
            amount = amount.multipliedBy(atokenBase);
            block = await web3.eth.getBlock();
            value = new BigNumber(40);
            value = value.multipliedBy(wethBase);
            console.log('amount=' + amount + ',value=' + value.toNumber());
            var approveAmount = new BigNumber('1e+28');
            await atoken.approve(swapRouter.address, approveAmount, {from: andy});
            await swapRouter.addLiquidityETH(atoken.address,
                                             amount,
                                             0,
                                             0,
                                             andy,
                                             block.timestamp+300, {from:andy, value:value.toNumber()});
            console.log("addLiquidityETH/atoken success");
            amountIn = new BigNumber(1);
            amountIn = amountIn.multipliedBy(atokenBase);
            path = [];
            path.push(atoken.address);
            path.push(weth.address);
            path.push(usdt.address);
            amountOuts = await swapRouter.getAmountsOut(amountIn, path);
            price = new BigNumber(amountOuts[2].toString());
            price = price.dividedBy(usdtBase).toFixed(3);
            console.log('One Atoken = $' + price.toString() + ' usdt');

            // add pool eth:btoken 1:100
            amount = new BigNumber(20000);
            amount = amount.multipliedBy(btokenBase);
            block = await web3.eth.getBlock();
            value = new BigNumber(500);
            value = value.multipliedBy(usdtBase);
            console.log('amount=' + amount + ',value=' + value.toNumber());
            var approveAmount = new BigNumber('1e+28');
            await btoken.approve(swapRouter.address, approveAmount, {from: andy});
            await swapRouter.addLiquidity(btoken.address,
                                          usdt.address,
                                          amount,
                                          value,
                                          0,
                                          0,
                                          andy,
                                          block.timestamp+300, {from:andy});
            console.log("addLiquidity usdt/btoken success");
            amountIn = new BigNumber(1);
            amountIn = amountIn.multipliedBy(btokenBase);
            path = [];
            path.push(btoken.address);
            path.push(usdt.address);
            amountOuts = await swapRouter.getAmountsOut(amountIn, path);
            price = new BigNumber(amountOuts[1].toString());
            price = price.dividedBy(usdtBase).toFixed(3);
            console.log('One Btoken = $' + price.toString() + ' usdt');

            earthoExchangeIns = await EarthoExchange.deployed();

            isInit = true;
        }
    });

    it('purchase', async() => {
        await earthoExchangeIns.setPurchasePrice(100);
        var purchasePrice = new BigNumber(await earthoExchangeIns._purchasePrice());
        console.log('purchasePrice = $' + purchasePrice.div(100).toFixed(2));

        var atokenAmount = new BigNumber(await earthoExchangeIns.getAmount(atoken.address));
        console.log("purchase NFT want atoken amount=" + atokenAmount.div(atokenBase).toFixed(2));

        var btokenAmount = new BigNumber(await earthoExchangeIns.getAmount(btoken.address));
        console.log("purchase NFT want btoken amount=" + btokenAmount.div(btokenBase).toFixed(2));

        var usdtAmount = new BigNumber(await earthoExchangeIns.getAmount(usdt.address));
        console.log("purchase NFT want usdt amount=" + usdtAmount.div(usdtBase).toFixed(2));

        var usdcAmount = new BigNumber(await earthoExchangeIns.getAmount(usdc.address));
        console.log("purchase NFT want usdc amount=" + usdcAmount.div(usdcBase).toFixed(2));

        var wethAmount = new BigNumber(await earthoExchangeIns.getAmount(weth.address));
        console.log("purchase NFT want weth amount=" + wethAmount.div(wethBase).toFixed(2));

        var purchaseInput = [];
        purchaseInput.push(0);
        purchaseInput.push(0);
        purchaseInput.push("https://www.google.com");
        purchaseInput.push(andy);
        //approve to earthoExchangeIns
        var approveAmount = new BigNumber("1e+30");
        await atoken.approve(earthoExchangeIns.address, approveAmount, {from: andy});
        console.log('purchaseByToken value=' + atokenAmount);
        await earthoExchangeIns.purchaseByToken(atoken.address, atokenAmount, purchaseInput, {from: andy});
    });
});