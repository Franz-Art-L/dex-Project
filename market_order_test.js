const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions');

contract("Dex", accounts => {
    //When creating a SELL market order, the seller needs to have enough tokens for the trade
    it("should throw an error if the user don't have enough tokens to do the trade", async () => {
        let dex = await Dex.deployed()
        //let link = await Link.deployed() //try to do the opposite, we will try to pass the test


        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 0, "Initial LINK balance is not 0");

        //await link.approve(dex.address, 100);
        /*await truffleAssert.passes(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10) 
        ) //try to do the opposite, we will try to pass the test
        */

        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )
    })

    //When creating a BUY market order, the buyer needs to have enough ETH for the trade
    it("should throw an error if the user don't have enough tokens to do the trade", async () => {
        let dex = await Dex.deployed()

        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))
        assert.equal(balance.toNumber(), 0, "Initial ETH balance is not 0");

        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )
    })

    //Market orders can be submitted even if the order book is empty
    it("Market orders is allowed even the order book is empty", async () => {
        let dex = await Dex.deployed()
        //let link = await Link.deployed() //this is only for revert test

        await dex.depositEth({ value: 5000 });

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0); //Get BUY side orderbook
        assert(orderbook.length == 0, "Buy side Orderbook length is not 0");

        //await link.approve(dex.address, 1000); //this is only for revert test

        /* only for revert test

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //send link tokens to accounts 1, 2 from account 0
        await link.transfer(accounts[1], 100)
        await link.transfer(accounts[2], 100)

        //approve DEX for accounts 1,2 from account 0
        await link.approve(dex.address, 50, from{accounts[1]});
        await link.approve(dex.address, 50, from{accounts[2]});

        //deposit LINK into DEX for accounts 1, 2
        await dex.deposit(20, web3.utils.fromUtf8("LINK"), {from: accounts[1]});
        await dex.deposit(20, web3.utils.fromUtf8("LINK"), {from: accounts[2]});

        //fill up the sell order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 200, {from: accounts[2]})

        //create market order so that our orderbook is not empty
        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )
        */

        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )

    })

    //Market orders should be filled until the order book is empty or the market order is 100% filled
    it("Market orders should not fill more limit orders than the market order amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //Send LINK tokens to accounts 1, 2, 3 from account 0
        await link.transfer(accounts[1], 150)
        await link.transfer(accounts[2], 150)
        await link.transfer(accounts[3], 150)

        //approve DEX for accounts 1, 2, 3
        await link.approve(dex.address, 50, { from: accounts[1] });
        await link.approve(dex.address, 50, { from: accounts[2] });
        await link.approve(dex.address, 50, { from: accounts[3] });

        //Deposit LINK into DEX for accounts 1, 2, 3
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), { from: accounts[1] });
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), { from: accounts[2] });
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), { from: accounts[3] });

        //Fill up the sell order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, { from: accounts[1] })
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, { from: accounts[2] })
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, { from: accounts[3] })

        //create a merket order that should fill 2/3 orders in the book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should only have 1 order left");
        assert(orderbook[0].filled == 0, "Sell side order should have 0 filled");
    })

    //Market orders should be filled until the order book is empty or the market order is 100% filled
    it("Market orders should be filled until such time that the order book will be empty", async () => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "The Sell column of the Orderbook should have 1 order left");

        //fill up the sell order book again
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, { from: accounts[1] });
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, { from: accounts[2] });

        //check buyer link balance before link purchase
        let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

        //create market order that could fill more than the entire order book (15 link)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 50);

        //check buyer link balance after link purchase
        let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

        //Buyer should have 15 more link after, even though order was for 50.
        assert.equal(balanceBefore.toNumber() + 15, balanceAfter.toNumber());
    })

    //the ETH balance of the buyer should decrease with the filled amount
    it("Should decrease the ETH balance of the buyer with the corresponding filled amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        //seller deposits link and creates a sell limit order for 1 link for 300 wei
        await link.approve(dex.address, 500, { from: accounts[1] })
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, { from: accounts[1] })

        //check buyer ETH balance before trade
        let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);
        let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

        assert.equal(balanceBefore.toNumber() - 300, balanceAfter.toNumber());
    })

    //The token balance of the limit order sellers should decrease with the filled amounts
    it("The token balance of the limit order sellers should decrease with the filled amounts", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side order book
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of the test")

        //Seller accounts[1] already has approved and deposited Link

        //Seller accounts[2] deposits link
        await link.approve(dex.address, 500, { from: accounts[2] });
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), { from: accounts[2] });

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, { from: accounts[1] })
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 400, { from: accounts[2] })

        //Check sellers Link balances before trade
        let account1balanceBefore = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
        let account2balanceBefore = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));

        //Account[0] created market order to buy up both sell orders
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

        //Check sellers Link balances after trade
        let account1balanceAfter = await dex.balances(acounts[1], web3.utils.fromUtf8("LINK"));
        let account2balanceAfter = await dex.balances(acounts[2], web3.utils.fromUtf8("LINK"));

        assert.equal(account1balanceBefore.toNumber() - 1, account1balanceAfter.toNumber());
        assert.equal(account2balanceBefore.toNumber() - 1, account2balanceAfter.toNumber());
    })

    //filled limit orders should be removed from the orderbook
    it("Limit orders that are already been filled should be removed from the orderbook", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //Seller deposits link and creates a sell limit order for 1 link for 300 wei
        await link.approve(dex.address, 500);
        await dex.deposit(50, web3.utils.fromUtf8("LINK"));

        await dex.depositEth({ value: 1000 });

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty after trade");

    })

    //Partly filled limit orders should be modified to represent the filled/remaining amount
    it("The filled limit orders should be set correctly after the trade", async () => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert.equal(orderbook[0].filled, 2);
        assert.equal(orderbook[0].amount, 5);

    })

    //When creating a BUY market order, the buyer needs to have enough ETH for the trade
    it("Should throw an error when creating a buy market order without adequate ETH balance", async () => {
        let dex = await Dex.deployed()

        let balance = await dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
        assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0");
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, { from: accounts[1] })

        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 5, { from: accounts[4] })
        )
    })

})