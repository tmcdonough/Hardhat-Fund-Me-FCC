// JS IMPORTS:

const { task } = require("hardhat/config")

require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()
require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-waffle")

// // ADD TASK IMPORTS HERE:
// require("./tasks/block-number")

// GAS REPORTER
require("hardhat-gas-reporter")

// TEST COVERAGE CHECKER (sees which parts of our solidity contract arent covered by tests)
require("solidity-coverage")

// REPLACES DEPLOY SCRIPT
require("hardhat-deploy")

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    // solidity: "0.8.7",
    // can also add multiple solidity versions we can handle:
    solidity: {
        compilers: [{ version: "0.8.8" }, { version: "0.6.6" }],
    },
    namedAccounts: {
        deployer: {
            default: 0, // so, for the default network (which is hardhat), the first account is the deployer account
            1: 0, // note that 1 here refers to ethereum / mainnet.
        },
    },
    networks: {
        rinkeby: {
            url: RINKEBY_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 4,
            blockConfirmations: 6,
            gas: 10000000,
        },
    },
    // allows us to test $ cost of gas to run our contract's functions
    gasReporter: {
        enabled: true,
        outputFile: "gas-report.txt",
        noColors: true, // we do this because we're outputting to .txt
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        // to test how much it would cost on other chains:
        // token: "MATIC",
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    defaultNetwork: "hardhat", // this is done automatically. this is just more explicit.
}
