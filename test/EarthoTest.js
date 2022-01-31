const Eartho = artifacts.require("Eartho");
const BigNumber = require("bignumber.js");

let earthoNFT;
let RAY = 0;
let isInit = false;
let owner;
let minter;
let account_one;
let account_two;
let account_three;
const zero_address = '0x0000000000000000000000000000000000000000';

contract('EarthoTest', async accounts => {
    beforeEach(async() => {
        if ( !isInit ) {
            owner = accounts[0];
            minter = accounts[1];

            account_one = accounts[2];
            account_two = accounts[3];
            account_three = accounts[4];

            earthoNFT = await Eartho.deployed();
            console.log('NFT Name=', await earthoNFT.name() , ",Symbol=", await earthoNFT.symbol());
            console.log('Uri = ', await earthoNFT.baseURI());
            isInit = true;
        }
    });

    it('mint', async() => {
        var mintInput = []
        var earthoContext = [];
        earthoContext.push(-1666);
        earthoContext.push(888);
        earthoContext.push(3);
        earthoContext.push("https://google.com");

        mintInput.push(earthoContext);
        mintInput.push(account_one);
        // test success for not minter
        // earthoNFT.mint(mintInput, {from: owner});
        // add minter
        await earthoNFT.updateMinter(minter, true, {from: owner});
        assert.equal(await earthoNFT.isMinter(minter), true);
        await earthoNFT.mint(mintInput, {from: minter});

        var nftForOne = await earthoNFT.getEarthos(account_one);
        console.log('account_one has nft=' + nftForOne);
        assert.equal(await earthoNFT.checkEarthCoordinates(-1666, 888), true);
        assert.equal(await earthoNFT.checkEarthCoordinates(-1667, 889), false);

        // test success for has been mint
        // await earthoNFT.mint(mintInput, {from: minter});
        var nftContext = await earthoNFT.getNFTContext(nftForOne);
        console.log(nftContext);

        //
        mintInput = [];
        earthoContext = [];

        earthoContext.push(-1668);
        earthoContext.push(889);
        earthoContext.push(1);
        earthoContext.push("https://github.com/Uniswap");

        mintInput.push(earthoContext);
        mintInput.push(account_one);
        await earthoNFT.mint(mintInput, {from: minter});

        nftForOne = await earthoNFT.getEarthos(account_one);
        assert.equal(nftForOne.length, 2);
    });

    it('burn-transfer', async() => {
        // test success for not approve
        // await earthoNFT.safeTransferFrom(account_one, account_two, 1, {from: account_three});

        // test transfer
        await earthoNFT.safeTransferFrom(account_one, account_two, 1, {from: account_one});
        var nftForOne = await earthoNFT.getEarthos(account_one);
        console.log(nftForOne.toString());
        assert.equal(nftForOne.length, 1);
        var nftForTwo = await earthoNFT.getEarthos(account_two);
        assert.equal(nftForTwo.length, 1);
        console.log(nftForTwo.toString());

        // test burn
        // test success for burn nft is not owner
        // await earthoNFT.burn(1, {from: account_one});
        //var two_balance = await web3.eth.getBalance(account_two);
        //console.log(two_balance);
        assert.equal(await earthoNFT.checkEarthCoordinates(-1666, 888), true);
        await earthoNFT.burn(1, {from: account_two});

        var nftContext = await earthoNFT.getNFTContext(1);
        assert.equal(nftContext.longitude, 0);
        assert.equal(nftContext.latitude, 0);
        assert.equal(nftContext.level, 0);
        assert.equal(await earthoNFT.checkEarthCoordinates(-1666, 888), false);
    });

    it('Guard-Test', async() => {
        var mintInput = []
        var earthoContext = [];
        // earthoContext.push(-1801);
        // test guard overflow success
        // earthoContext.push(-601);
        earthoContext.push(-1800);
        earthoContext.push(-600);
        earthoContext.push(2);
        earthoContext.push("http://www.facebook.com/");

        mintInput.push(earthoContext);
        mintInput.push(account_one);
        await earthoNFT.mint(mintInput, {from: minter});

        // setLatitudeDownGuard
        await earthoNFT.setLatitudeDownGuard(-700, {from: owner});

        mintInput = []
        earthoContext = [];
        // earthoContext.push(-1801);
        // test guard overflow success
        // earthoContext.push(-601);
        earthoContext.push(-1800);
        earthoContext.push(-601);
        earthoContext.push(1);
        earthoContext.push("http://www.facebook.com/");

        mintInput.push(earthoContext);
        mintInput.push(account_one);
        await earthoNFT.mint(mintInput, {from: minter});

        var nftForOne = await earthoNFT.getEarthos(account_one);
        assert.equal(nftForOne.length, 3);
        console.log(nftForOne.toString());
    });

    it ('approve-transferFrom', async() => {
        // test success for owner query for nonexistent token
        // await earthoNFT.approve(account_three, 1, {from: account_one});
        // await earthoNFT.safeTransferFrom(account_one, account_five, 1, {from: account_three});
        await earthoNFT.approve(account_three, 4, {from: account_one});
        await earthoNFT.safeTransferFrom(account_one, account_two, 4, {from: account_three});
    });

    it ('approve-transferAll', async() => {
        await earthoNFT.setApprovalForAll(account_three, true, {from: account_one});
        await earthoNFT.safeTransferFrom(account_one, account_two, 2, {from: account_three});
        await earthoNFT.safeTransferFrom(account_one, account_two, 3, {from: account_three});
        var nftForOne = await earthoNFT.getEarthos(account_one);
        assert.equal(nftForOne.length, 0);
        var nftForTwo = await earthoNFT.getEarthos(account_two);
        assert.equal(nftForTwo.length, 3);
    });
});