const { network } = require("hardhat") // network comes from hardhat
const {
    developmentChains,
    DECIMALS,
    INITIAL_ANSWER,
} = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments // pull these out of deployments
    const { deployer } = await getNamedAccounts()

    if (developmentChains.includes(network.name)) {
        // notice we just use log() here. We imported above from deployments which is from hre (see 01-deploy-fund-me.js for more)
        log("local network detected, deploying mocks")
        await deploy("MockV3Aggregator", {
            contract: "MockV3Aggregator",
            from: deployer,
            log: true,
            // to see what args are required, go to the actual mock and find the constructor.
            // this mock takes decimals and initial answer.
            // decimals is the "starting" price feed value. works well for tesing.
            // we will add these in helper.
            args: [DECIMALS, INITIAL_ANSWER],
        })
        log("Mocks deployed!")
        log(
            "--------------------------------------------------------------------------------"
        )
    }
}

// this allows us to run yarn hardhat deploy --tags <TAG> and it will only deploy those with specific tags. i.e. if we did "yarn hardhat deploy --tags mocks" this one would run.
module.exports.tags = ["all", "mocks"]
