const { expect } = require("chai")
const { ethers } = require("hardhat")
const { toUsdc, fromUsdc, toEther, fromEther, getBalance } = require("./Helpers")

// contracts

let marketplace

// mocks
let erc1155
let erc721
let mockUsdc

// accounts
let admin
let alice
let bob
let dev


describe("PromptMarket", () => {

    beforeEach(async () => {
        [admin, alice, bob, relayer, dev] = await ethers.getSigners()

        const Marketplace = await ethers.getContractFactory("Market")
        const MockERC1155 = await ethers.getContractFactory("MockERC1155")
        const MockERC20 = await ethers.getContractFactory("MockERC20")

        marketplace = await Marketplace.deploy(ethers.constants.AddressZero)

        erc1155 = await MockERC1155.deploy(
            "https://api.cryptokitties.co/kitties/{id}"
        )
        mockUsdc = await MockERC20.deploy("Mock USDC", "USDC", 6)
    })


    it("NFT -> NFT", async () => {

        // mint ERC-1155
        await erc1155.mint(alice.address, 1, 1, "0x00")
        await erc1155.mint(bob.address, 2, 1, "0x00")

        // make approvals
        await erc1155.connect(alice).setApprovalForAll(marketplace.address, true)
        await erc1155.connect(bob).setApprovalForAll(marketplace.address, true)

        await marketplace.connect(alice).create(1, erc1155.address, 1, 1, 1, erc1155.address, 2, 1)

        // verify
        const firstOrder = await marketplace.orders(1)
        expect(firstOrder['assetAddress']).to.equal(erc1155.address)
        expect(firstOrder['tokenId'].toString()).to.equal("1")
        expect(firstOrder['tokenType']).to.equal(1)
        expect(firstOrder['owner']).to.equal(alice.address)


        // swap
        // Token 2 -> Token 1
        await marketplace.connect(bob).swap(1 )

        // Alice should receives Token 2
        expect(await erc1155.balanceOf(alice.address, 2)).to.equal(1)
        // Bob should receives Token 1
        expect(await erc1155.balanceOf(bob.address, 1)).to.equal(1)
    })

    it("NFT -> ERC-20", async () => {
        // mint NFT to Alice
        await erc1155.mint(alice.address, 1, 1, "0x00")
        // Prepare ERC-20 for Bob
        await mockUsdc.connect(bob).faucet()

        // make approvals
        await erc1155.connect(alice).setApprovalForAll(marketplace.address, true)
        await mockUsdc.connect(bob).approve(marketplace.address, ethers.constants.MaxUint256)

        // create an order
        await marketplace.connect(alice).create(1, erc1155.address, 1, 1, 1, mockUsdc.address, toUsdc(200), 0)

        const before = await mockUsdc.balanceOf(bob.address)

        // swap 200 USDC for 1 NFT
        await marketplace.connect(bob).swap(1)

        const after = await mockUsdc.balanceOf(bob.address)

        expect(Number(fromUsdc(before)) - Number(fromUsdc(after))).to.equal(200)

        // validate the result
        expect(await erc1155.balanceOf(bob.address, 1)).to.equal(1)

        expect(await mockUsdc.balanceOf(alice.address)).to.equal(toUsdc(180))

    })

    it("NFT -> ETH", async () => {

        // mint ERC-1155 for Alice
        await erc1155.mint(alice.address, 1, 1, "0x00")

        // make approvals
        await erc1155.connect(alice).setApprovalForAll(marketplace.address, true)

        // list the NFT
        await marketplace.connect(alice).create(1, erc1155.address, 1, 1, 1, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", toEther(0.1), 2)

        // swap 0.1 ETH for 1 NFT
        await marketplace.connect(bob).swapWithEth(1, {
            value: toEther(0.1)
        })

        // validate the result
        expect(await erc1155.balanceOf(bob.address, 1)).to.equal(1)
    })

    it("NFT -> FIAT", async () => {

        // mint ERC-1155 for Alice
        await erc1155.mint(alice.address, 1, 1, "0x00")

        // make approvals
        await erc1155.connect(alice).setApprovalForAll(marketplace.address, true)

        // list the NFT
        await marketplace.connect(alice).create(1, erc1155.address, 1, 1, 1, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", toEther(10), 3)

        // swap 
        await marketplace.connect(admin).swapWithFiat(1, bob.address)

        // validate the result
        expect(await erc1155.balanceOf(bob.address, 1)).to.equal(1)
    })

    it("LIST WITH 10 UNITS ERC-1155", async () => {
        // mint ERC-1155 for Alice
        await erc1155.mint(alice.address, 1, 10, "0x00")
        // Prepare ERC-20 for Bob
        await mockUsdc.connect(bob).faucet()

        // make approvals
        await erc1155.connect(alice).setApprovalForAll(marketplace.address, true)
        await mockUsdc.connect(bob).approve(marketplace.address, ethers.constants.MaxUint256)

        // make approvals
        await erc1155.connect(alice).setApprovalForAll(marketplace.address, true)

        // list the NFT
        await marketplace.connect(alice).create(1, erc1155.address, 1, 10, 1, mockUsdc.address, toUsdc(200), 0)

        const before = await mockUsdc.balanceOf(bob.address)

        for (let i = 0; i < 10; i++) {
            // swap 200 USDC for 1 NFT
            await marketplace.connect(bob).swap(1)
        }

        const after = await mockUsdc.balanceOf(bob.address)

        expect(Number(fromUsdc(before)) - Number(fromUsdc(after))).to.equal(2000)

        // validate the result
        expect(await erc1155.balanceOf(bob.address, 1)).to.equal(10)

    })

})