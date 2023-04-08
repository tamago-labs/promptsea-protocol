const { expect } = require("chai")
const { ethers } = require("hardhat")

const { toUsdc, toEther } = require("./Helpers")

let item

let admin
let alice
let bob
let charlie

let mockUsdc

describe("PromptNFT", () => {

    beforeEach(async () => {

        [admin, alice, bob, charlie] = await ethers.getSigners();

        const Item = await ethers.getContractFactory("Item");
        const MockERC20 = await ethers.getContractFactory("MockERC20")

        item = await Item.deploy(ethers.constants.AddressZero)
        mockUsdc = await MockERC20.deploy("Mock USDC", "USDC", 6)
    })

    it("Alice tokenizes an NFT and sell to Bob for 100 USDC", async function () {

        // Prepare ERC-20 for Bob
        await mockUsdc.connect(bob).faucet()

        await item.connect(alice).authorise(
            "https://api.cryptokitties.co/kitties/{id}",
            100,
            0,
            mockUsdc.address,
            toUsdc(100),
            101
        )

        const owner = await item.tokenOwners(1)
        expect(owner).to.equal(alice.address)

        // checking prices
        const prices = await item.tokenPrice(1)
        expect(prices[0]).to.equal(0)
        expect(prices[1]).to.equal(mockUsdc.address)
        expect(prices[2]).to.equal(toUsdc(100))

        await mockUsdc.connect(bob).approve(item.address, ethers.constants.MaxUint256)

        await item.connect(bob).mint(
            bob.address,
            1,
            1,
            "0x00"
        )

        expect(await item.balanceOf(bob.address, 1)).to.equal(1)
        expect(`${await mockUsdc.balanceOf(bob.address)}`).to.equal("9900000000")
    })

    it("Alice tokenizes an NFT and sell to Bob for 1 ETH", async function () {

        await item.connect(alice).authorise(
            "https://api.cryptokitties.co/kitties/{id}",
            100,
            1,
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            toEther(1),
            101
        )

        const owner = await item.tokenOwners(1)
        expect(owner).to.equal(alice.address)

        // checking prices
        const prices = await item.tokenPrice(1)
        expect(prices[0]).to.equal(1)
        expect(prices[1]).to.equal("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE")
        expect(prices[2]).to.equal(toEther(1))

        await item.connect(bob).mintWithEth(
            bob.address,
            1,
            1,
            "0x00", {
            value: toEther(1)
        })

        expect(await item.balanceOf(bob.address, 1)).to.equal(1)

    })


})