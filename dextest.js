const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require('truffle-assertions');

contract.skip("Dex", accounts => {
    //The user must have ETH deposited such that deposited eth >= buy order value
    it("should throw an error if the user don't have enough ETH over its buy order value", async() => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 1))

        await dex.depositEth({value: 10})

        await truffleAssert.passes(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 1)
        )
    });

    //The user must have enough tokens deposited such that token balance >= sell order amount
    it("should throw an error if the user don't have enough token to its sell order", async() => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        
        await truffleAssert.reverts(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 1)
        )
        await link.approve(dex.address, 500)
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        await dex.deposit(10, web3.utils.fromUtf8("LINK"));
        await truffleAssert.passes(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 1)
        )
    });

    //The BUY order book should be ordered on price from highest to lowest starting at index 0
    it("should be that the BUY order book will be properly in correct order from highest to lowest starting from index 0", async() => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        
        await link.approve(dex.address, 500);
        await dex.depositEth({value: 3000});

        await createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 300)
        await createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 100)
        await createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 200)

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        assert(orderbook.length > 0);
        console.log(orderbook);
        for (let i = 0; i < orderbook.length - 1; i++) {
            assert(orderbook[i].price >= orderbook[i+1].price, "The BUY order book is not correctly in order by its price starting from index 0")
        }
    });

    //The SELL order book should be ordered on price from highest to lowest starting at index 0
    it("should be that the SELL order book will be properly in correct order from highest to lowest starting from index 0", async() => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        await link.approve(dex.address, 500);
        
        await createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300)
        await createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 100)
        await createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 200)

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert(orderbook.length > 0);
        console.log(orderbook);
        for (let i = 0; i < orderbook.length - 1; i++) {
            assert(orderbook[i].price <= ordebook[i+1].price, "The SELL order book is not correctly in order by its price starting from index 0")
        };

    })
})