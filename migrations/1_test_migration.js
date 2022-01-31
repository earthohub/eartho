const Eartho = artifacts.require("Eartho");
const WETH = artifacts.require("WETH9");
const Factory = artifacts.require("PancakeFactory");
const Router = artifacts.require("PancakeRouter");
const USDC = artifacts.require("ERC20Mock");
const USDT = artifacts.require("ERC20Mock");
const ATOKEN = artifacts.require("ERC20Mock");
const BTOKEN = artifacts.require("ERC20Mock");
const EarthoExchange = artifacts.require("EarthoExchange");


module.exports = async function(deployer, network, accounts) {
  if ( network == 'test' ) {
    console.log("accounts = " + accounts.length);
    var owner = accounts[0];
    var feeToSetter = accounts[1];
    var recipient = accounts[2];

    // deploy eartho nft
    await deployer.deploy(Eartho, "https://eartho.com", {from: owner});
    var earthoNFT = await Eartho.deployed();
    console.log("eartho nft address=" + earthoNFT.address);

    // deploy weth
    await deployer.deploy(WETH, {from: owner});
    var wethIns = await WETH.deployed();
    console.log("WETH address=" + wethIns.address);

    // deploy swap factory
    await deployer.deploy(Factory, feeToSetter, {from: owner});
    var factoryIns = await Factory.deployed();
    console.log("Factory address=" + factoryIns.address);
    await deployer.deploy(Router, factoryIns.address, wethIns.address, {from: owner});
    var swapRouter = await Router.deployed();
    console.log("swapRouter address=" + swapRouter.address);

    // depoly erc20
    await deployer.deploy(USDC, "USDC", "USDC", 6, {from: owner});
    var usdc = await USDC.deployed();
    console.log("USDC symbol=" + await usdc.symbol() +
                ", decimals=" + await usdc.decimals() +
                ", address=" + usdc.address);

    await deployer.deploy(USDT, "USDT", "USDT", 8, {from: owner});
    var usdt = await USDT.deployed();
    console.log("USDT symbol=" + await usdt.symbol() + ", decimals=" + await usdt.decimals()
                + ", address=" + usdt.address);

    await deployer.deploy(ATOKEN, "ATOKEN", "ATOKEN", 18, {from: owner});
    var atoken = await ATOKEN.deployed();
    console.log("ATOKEN symbol=" + await atoken.symbol() + ", decimals=" + await atoken.decimals()
                + ", address=" + atoken.address);

    await deployer.deploy(BTOKEN, "BTOKEN", "BTOKEN", 18, {from: owner});
    var btoken = await BTOKEN.deployed();
    console.log("BTOKEN symbol=" + await btoken.symbol() + ", decimals=" + await btoken.decimals()
                + ", address=" + btoken.address);

    var usd = [];
    usd.push(usdc.address);
    usd.push(usdt.address);
    await deployer.deploy(EarthoExchange,
                          swapRouter.address,
                          earthoNFT.address,
                          wethIns.address,
                          usd,
                          recipient,
                          {from: owner});

    // create pair pool
    // 1. eth/usdc
    //await factoryIns.createPair(wethIns.address, usdc.address);
    // 2. eth/usdt
    //await factoryIns.createPair(wethIns.address, usdt.address);
    // 3. atoken/usdt
    //await factoryIns.createPair(atoken.address, usdt.address);
    // 4. btoken/usdc
    //await factoryIns.createPair(btoken.address, usdc.address);
    // 5. atoken/eth
    //await factoryIns.createPair(wethIns.address, atoken.address);
    // 6. btoken/eth
    //await factoryIns.createPair(wethIns.address, btoken.address);
  }
};
