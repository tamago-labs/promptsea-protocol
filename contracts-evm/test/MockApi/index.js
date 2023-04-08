const { ethers } = require("ethers")
const CryptoJS = require("crypto-js");

const SECRET = "12345678"


exports.encrypt = (message) => {
    return CryptoJS.AES.encrypt(message, SECRET).toString()
}


exports.decrypt = async ({
    message,
    signature,
    item,
    encrypted
}) => {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature)
    if (Number(await item.balanceOf(recoveredAddress, 1)) > 0) {
        const bytes = CryptoJS.AES.decrypt(encrypted, SECRET);
        return bytes.toString(CryptoJS.enc.Utf8);
    } else {
        throw new Error("NO_NFT_IN_THE_WALLET")
    }
}