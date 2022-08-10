// WITH HARDHAT YOU CAN RUN CONSOLE.LOG WITHIN SOLIDITY PROJECTS.
// AT TOP OF YOUR SOLIDITY FILE IN IMPORTS: import "hardhat/console.sol";
// THEN YOU CAN RUN console.log() WITHIN THE CONTRACT FUNCTIONS
// EQUIVALENT OF `asdfasdf ${VAR}` and f"asdfasdf {VAR}" is console.log("asdfasdf %s", VAR)
// VERY HELPFUL FOR WHEN YOU'RE RUNNING TESTS

const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

// function in describe shouldnt be async
// added a ternary operator to ensure it is a development chain before continuing.

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          // const sendValue = "1000000000000000000" // 1 eth
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async function () {
              // deploy our FundMe contract
              // using hardhat-deploy

              // another way to get account
              // const accounts = await ethers.getSigners()
              // const accountZero = accounts[0]

              // Option 1:
              deployer = (await getNamedAccounts()).deployer
              // Option 2:
              // const { deployer } = await getNamedAccounts()
              await deployments.fixture(["all"]) // this will deploy all scripts in deploy folder that have the tag all
              fundMe = await ethers.getContract("FundMe", deployer) // this will get the most recent deployment of a contract we tell it. since fundme has the "all" tag, it will have just come.
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })
          // can group our tests based on functions. e.g., this one is the constructor
          describe("constructor", function () {
              it("sets the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          // this one tests to make sure something fails. i.e., we expect failure so failure should == passing
          // for this we use waffle
          describe("fund", function () {
              it("Fails if you don't send enough ETH", async function () {
                  // this syntax is for waffle
                  await expect(fundMe.fund()).to.be.reverted // less specific. can revert for any reason and will pass
                  // await expect(fundMe.fund()).to.be.revertedWith(
                  //     "You need to spend more ETH!"
                  // ) // more specific. needs to be the specific revert error we pass.
              })
              it("Updates the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  // we're calling a mapping which shouldve stored our sent value.
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Adds funder to array of getFunder", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0) // since this is a new deployment, first index should be this one thats funding
                  assert.equal(funder, deployer)
              })
          })
          // only owner should be able to call, and the arrays/mappings should be reset
          // we need to have money in this though.
          describe("withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })

              it("Withdraw ETH From a single founder", async function () {
                  // Arrange
                  // starting balance of fundMe after having been funded above
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  // starting balance of deployer after having funded above contract.
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1) // 1 block confirm

                  // BREAKPOINTS (click the red dot to the left)
                  // breakpoint will stop script at this line, and we can drop into debug console to see all variables to this point. we will want to look at transactionReceipt to see if gas cost is in there.
                  // this allowed us to look into the transactionReceipt object to find which variables we needed to compute gas price.

                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice) // can use these functions like mul add etc. when they are both bigNumbers

                  // note you could use ethers.provider as well. but fundMe has a provider so we can do either.
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert
                  // at this point the entire fundMe balance should be added to deployer balance.
                  // HOWEVER you have to make sure to account for gas costs.

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
              it("allows us to withdraw with multiple getFunder", async function () {
                  const accounts = await ethers.getSigners() // gets an array of accounts we can use.
                  for (let i = 1; i < 6; i++) {
                      // the fundMe contract is connected to the deployer address
                      // we need to 'connect' the contract to our other accounts to then fund from them.
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  // get balances to start
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  // starting balance of deployer after having funded above contract.
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Act
                  // so at this point we've funded the contract from 5 accounts (did not fund from the deployer address)
                  // now we want to withdraw
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1) // 1 block confirm
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice) // can use these functions like mul add etc. when they are both bigNumbers

                  // Assert
                  // now we a) make sure that there are no getFunder stored b) make sure theres no balances associated with any of the accounts we had previously funded with.
                  await expect(fundMe.getFunder(0)).to.be.reverted // this should revert since we are resettings after withdraw
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attackerConnectedContract = await fundMe.connect(
                      accounts[1]
                  )
                  await expect(
                      attackerConnectedContract.withdraw()
                      // ).to.be.revertedWith("FundMe__NotOwner") // account 1 shouldnt be able to withdraw since they didnt deploy.
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner") // different from the tutorial
              })
              it("cheaperWithdraw testing...", async function () {
                  const accounts = await ethers.getSigners() // gets an array of accounts we can use.
                  for (let i = 1; i < 6; i++) {
                      // the fundMe contract is connected to the deployer address
                      // we need to 'connect' the contract to our other accounts to then fund from them.
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  // get balances to start
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  // starting balance of deployer after having funded above contract.
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Act
                  // so at this point we've funded the contract from 5 accounts (did not fund from the deployer address)
                  // now we want to withdraw

                  // ONLY THING THAT CHANGED IN CHEAPERWITHDRAW VERSION:
                  // const transactionResponse = await fundMe.withdraw()
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1) // 1 block confirm
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice) // can use these functions like mul add etc. when they are both bigNumbers

                  // Assert
                  // now we a) make sure that there are no getFunder stored b) make sure theres no balances associated with any of the accounts we had previously funded with.
                  await expect(fundMe.getFunder(0)).to.be.reverted // this should revert since we are resettings after withdraw
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
          })
      })
