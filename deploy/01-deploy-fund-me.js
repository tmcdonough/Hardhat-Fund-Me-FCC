// import
// hardhat-deploy doesnt work like our prior deploy script where we defined a main function and then called the main function
// hardhat-deploy instead just runs whatever function is the default function that deploy look for.

// function deployFunc() {
//     console.log("Hi!")
// }

// module.exports.default = deployFunc

// alternatively you can just export an anonymous function.

// hre = hardhat runtime environment.
// module.exports = async (hre) => {
//     const {getNamedAccounts, deployments } = hre
//     // same as hre.getNamedAccounts and hre.deployments

// }

// lastly, this is the one-liner. I am not sure how it knows getNamedAccounts and deployments come from hre though...

// the below syntax does the smae thing as if you'd done:
// const helperConfig = require("../helper-hardhat-config")
// const networkConfig = helperConfig.networkConfig
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { network } = require("hardhat") // network comes from hardhat

// we created a utils folder and within it placed a verify script. we import that here:
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments // pull these out of deployments

    // in hardhat.config.js, for each network you can define an array of "accounts"
    // but you can also add a section of "named accounts" which map to index.
    // e.g. your deployer account can be set to the 0th account in the accounts array.

    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // how do we get the right exchange address?
    // pseudo code: if chainId is x, use address y
    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator") // this will get the most recently deployed mock.
        ethUsdPriceFeedAddress = ethUsdAggregator.address // this will get the address of that mock.
    } else {
        // if it isnt a dev chain, we just get the actual address
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    // when using localhost or hardhat, use a mock.
    // deploying mocks is technically a deploy script. so 00-deploy-mocks.js is created.

    // dont need deployfactories with hardhat-deploy
    const args = [ethUsdPriceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, // put price feed address
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // now we can verify the contract if it isnt in a developer network
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args)
    }
    log(
        "---------------------------------------------------------------------------------------------------------"
    )
}

module.exports.tags = ["all", "fundme"]
