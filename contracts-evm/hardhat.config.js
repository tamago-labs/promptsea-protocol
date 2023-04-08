require("dotenv").config()

require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan")

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  mocha: {
    timeout: 1200000,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    // mainnet: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://mainnet.infura.io/v3/7608a06e94cc47edbdc6be561ba7e43e",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    // },
    // polygon: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://nd-423-609-188.p2pify.com/0168cc71e34de272e6159fa552d194c0",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    // },
    // mumbai: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://matic-mumbai.chainstacklabs.com",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    // },
    // harmony: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://rpc.s1.t.hmny.io",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    // },
    // bsc: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://bsc-dataseed.binance.org/",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    // },
    // bscTestnet: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://data-seed-prebsc-1-s3.binance.org:8545/",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    // },
    // kovan: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    //   timeout: 500000,
    // },
    // avaxTestnet: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://nd-473-270-876.p2pify.com/613a7805f3d64a52349b6ca19b6e27a7/ext/bc/C/rpc",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    //   timeout: 500000,
    // },
    // avax: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://api.avax.network/ext/bc/C/rpc",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    //   timeout: 500000,
    // },
    // cronos: {
    //   allowUnlimitedContractSize: true,
    //   url: "https://evm.cronos.org",
    //   accounts: [process.env.PRIVATEKEY_DEPLOYER, process.env.PRIVATEKEY_DEV],
    //   timeout: 500000,
    // },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    dev: {
      default: 1,
    },
  },
  etherscan: {
    apiKey: process.env.POLYGON_API_KEY,
    customChains: [
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL: "https://api.cronoscan.com/api",
          browserURL: "https://cronoscan.com/"
        }
      }
    ]
  },
};
