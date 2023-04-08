const { expect } = require("chai")
const { ethers } = require("hardhat")

const { toUsdc, toEther } = require("./Helpers")

const { encrypt, decrypt } = require("./MockApi")

let item

let admin
let alice
let bob
let charlie

let mockUsdc

const MESSAGE_TO_SIGN = "MESSAGE_TO_SIGN"

describe("PromptNetwork", () => {

    beforeEach(async () => {

        [admin, alice, bob, charlie] = await ethers.getSigners();

        const Item = await ethers.getContractFactory("Item")
        const MockERC20 = await ethers.getContractFactory("MockERC20")

        item = await Item.deploy(ethers.constants.AddressZero)
        mockUsdc = await MockERC20.deploy("Mock USDC", "USDC", 6)
    })

    it("Alice reveals the private data should success", async function () {

        await item.connect(alice).authorise(
            "https://api.cryptokitties.co/kitties/{id}",
            1,
            0,
            mockUsdc.address,
            toUsdc(100),
            1
        )

        expect(await item.balanceOf(alice.address, 1)).to.equal(1)

        const encrypted = encrypt("PRIVATE_INFORMATION")

        const signature = await alice.signMessage(MESSAGE_TO_SIGN)

        const original = await decrypt({
            message : MESSAGE_TO_SIGN,
            signature,
            item,
            encrypted
        })

        expect(original).to.equal("PRIVATE_INFORMATION")

    })

    it("Bob reveals the private data should not success", async function () {

        expect(await item.balanceOf(bob.address, 1)).to.equal(0)

        const encrypted = encrypt("PRIVATE_INFORMATION")

        const signature = await alice.signMessage(MESSAGE_TO_SIGN)

        try {
            const original = await decrypt({
                message : MESSAGE_TO_SIGN,
                signature,
                item,
                encrypted
            })
        } catch (e) {
            expect(e.message.indexOf("NO_NFT_IN_THE_WALLET") !== -1).to.true
        }

    })

})