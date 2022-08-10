// Get funds from users & withdraw funds
// Set a minimum deposit in USD

/*

Decentralized Oracles:

- blockchains are deterministic so that nodes can reach consensus.
- randomness would mean you cant reach a consensus
- so how do you get random data and/or api calls?
- oracles.
- but if u get that oracle data from a centralized node, whats the point of the smart contract?
- chainlink brings decentralized oracle data from offchain to on chain.

Chainlink data feeds:
- network of nodes gets data from apis/data providers etc.
- the nodes then come ot a consensus and deliver to a contract, which can be called.

Chainlink VRF:
- get verifiably random numbers delivered to your smart contract

Chainlink keepers:
- decentralized event driven computation. if trigger then do this

Chainlink APIs:
- can grab data from anywhere in the world via api. We will learn more about this...

GAS OPTIMIZATIONS

+ constant keyword.
- say you assign a variable at compile and never change it. E.g. minimumUsd in our contract. You can give it the constant keyword and it will take up less storage space.
- constant variable naming convention is ALL CAPS

+ immutable keyword.
- say you assign a variable at compile but don't set it. you only set it once, later in the contract.
- e.g., "owner" variable in our contract, which is declared at compile and assigned in the constructor.
- use immutable.
- convention is setting the variable as "i_varName"

+ custom errors (solidity 0.8.4+)
- declare an error outside of the contract.
- see onlyOwner modifier below for details.

*/

pragma solidity ^0.8.4;

import "./PriceConverter.sol";

// WITH HARDHAT YOU CAN RUN CONSOLE.LOG WITHIN SOLIDITY PROJECTS.
// AT TOP OF YOUR SOLIDITY FILE IN IMPORTS: import "hardhat/console.sol";
// THEN YOU CAN RUN console.log() WITHIN THE CONTRACT FUNCTIONS
// EQUIVALENT OF `asdfasdf ${VAR}` and f"asdfasdf {VAR}" is console.log("asdfasdf %s", VAR)
// VERY HELPFUL FOR WHEN YOU'RE RUNNING TESTS

import "hardhat/console.sol";

// convention now is to do <CONTRACTNAME>__<ERRORNAME>()
error FundMe__NotOwner();

// natspec documentation... can generally ignore

contract FundMe {
    // if you use a library for some functions (which we are doing with PriceConverter.sol), you can "attach" those functions to specific types.
    // then it sort of acts like a method of a class object in python where you can do .function on a variable of that type.
    // the keyword is "using <LIBRARY> for <TYPE>"
    // e.g. we're using PriceConverter with the line here: require(msg.value.getConversionRate() >= MINIMUMUSD);
    using PriceConverter for uint256;

    uint256 public number;
    uint256 public constant MINIMUMUSD = 50 * 1e18;

    // HARDHAT VERSION ADDITIONS:
    AggregatorV3Interface private s_priceFeed;

    // Transaction fields:
    // - Every tx will have the following fields:
    // 1) Nonce 2) Gas Price 3) Gas Limit 4) To 5) Value 6) Data 7) v, r, s (components of tx signature).
    // Notice that every tx can have a value in wei. It can also have other value (not in wei) included in data.

    // storage costs a lot of gas. so it is good practice to prepend them with s_ to note this.
    // i_ is used for immutable which isnt as expensive.
    // once youve identified all of the s_ variables, can go thru code and remove some of these where it makes sense to save gas.

    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountFunded;

    address private immutable i_owner;

    // gets called upon deployment.
    // we can set the declared "owner" variable to be equal to the address of whoever deployed the contract initially.

    modifier onlyOwner() {
        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        }
        // require(msg.sender == i_owner, "Sender is not owner!");
        _; // this represents DO THE REST OF CODE in the function that uses this modifier.
    }

    // what happens if someone sends this contract eth without calling the fund contract?

    // receive & fallback are special functions in solidity.
    // see FallbackExample.sol

    // one purpose of this is if someone accidentally calls the wrong function but still sends eth, this will still work as if they had called fund()

    // receive() external payable {
    //     fund();
    // }

    // fallback() external payable {
    //     fund();
    // }

    // original/remix version constructor didnt take any parameters.
    // constructor() {
    //     i_owner = msg.sender;
    // }

    // HARDHAT VERSION OF CONSTRUCTOR - for chainlink price feed address to be modular
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // error checking. say you forgot the "payable" below...
    // Step 1. read error code and it might be straightforward (e.g. in this case it will say make it payable)
    // -- spend at least 15-20 minutes on step 1 before trying next steps
    // Step 2. say you tinkered and can't figure it out. Google the error.
    // Step 2.5. for this course only, go to the github repo for this course.
    // Step 3. Ask a question on a forum like stack exchange eth and stack overflow.
    //

    function fund() public payable {
        // PAYABLE keyword is key. Allows someone to send wei with this function.
        // Just like the wallet can hold funds, so too can a contract address.

        // set a minimum fund amount in USD
        // -- remember, every tx will include the field 'value' so msg.value is just allowing us to grab that amount (could be 0 in a lot of cases).
        // -- require will revert if a condition is not met.s

        number = 5;
        // require(msg.value >= 1e18); // 1e18 wei == 1 eth
        // require(msg.value >= minimumUsd);

        // BEFORE using a library we would've done this:
        // require(getConversionRate(msg.value) >= minimumUsd, "didn't send enough!");

        // NOW with using a library we do this:
        // note that the variable that this function is being applied to will serve as the first input into that function
        // // REMIX VERSION:
        // // require(msg.value.getConversionRate() >= MINIMUMUSD);

        // // NEW VERSION FOR HARDHAT. We pass the newly created modular priceFeed object in as second variable (first variable is msg.value).
        uint256 usdPassed;
        uint256 usdPassedDecimaled;
        usdPassed = msg.value.getConversionRate(s_priceFeed);
        usdPassedDecimaled = usdPassed / 10**18;
        console.log("Attempting to fund with %s USD", usdPassedDecimaled);
        require(usdPassed >= MINIMUMUSD);

        // GAS OPTIMIZATION TECHNIQUE:
        // -- global state variables
        // --

        // revert:
        // -- undo any actions from before and send any leftover gas back.
        // -- e.g. in above, number will no longer be stored as 5 if you sent less than 1 eth.

        // msg.sender = address of sender
        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] = msg.value;
    }

    function cheaperWithdraw() public payable onlyOwner {
        // instead of constantly reading from storage, can read to memory one time and thne read from memory.

        // note that mappings cant be in memory, so when using mappings youll still have to do storage / pay the high gas costs.

        address[] memory funders = s_funders; // store the current s_funders into memory
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length; // loop thru the new memory funders instead of s_funders, saves gas.
            funderIndex++
        ) {
            address funder = funders[funderIndex]; // pull out the funder from the new memory funders instead of s_funders, saves gas.
            s_addressToAmountFunded[funder] = 0; // ultimately need to reset the mapping which is in storage, cant save gas here
        }
        s_funders = new address[](0); // also ultimately have to reset the funders array in storage
        (bool success, ) = i_owner.call{value: address(this).balance}("");
        require(success);
    }

    function withdraw() public onlyOwner {
        // we are going to use a modifier instead of code below, but this would be another way to make sure the owner is only one calling this.
        // make sure that the sender is the owner of the contract i.e. the person who deployed it.
        // require(msg.sender == owner, "sender is not owner");

        // for loop
        // for (starting index, ending index, step amount)
        // option 1: loop thru and reset each variable in the array

        // GAS SAVINGS:
        // -- every time we go thru this loop we're reading from storage, and it gets even more expensive when we add to the length
        //      -- we need a cheaper withdraw...
        // -- public variables are more expensive than private or internal. so if you dont need them to be public, should set them as such.
        //      -- we can create getter functions for these private/internal variables to allow people to read them if they wish.
        //      -- this also makes the code more readable (people dont call s_FUNCTION they just call getFUNCTION)
        //      -- we are doing this with: i_owner, s_funders (can pass in an index), s_addressToAmountFunded (can pass in an address), s_priceFeed.

        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }

        // option 2: reset the array
        s_funders = new address[](0); // 0 specifies how many elements are in the array to start

        // now need to withdraw the funds
        // three ways: transfer, send, call

        // // transfer
        // // msg.sender (type address) needs to be typecast to payable msg.sender
        // payable(msg.sender).transfer(address(this).balance);

        // issues with transfer: if it fails, it will not return a boolean it will just fail
        // can use .send which will reeturn a boolean.

        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed");

        // call doesnt have capped gas.
        // call is RECOMMENDED WAY TO SEND/RECEIVE.
        // (bool callSuccess, bytes dataReturned) = payable(msg.sender).call{value: address(this).balance}("")
        // (bool callSuccess, ) = payable(msg.sender).call{
        //     value: address(this).balance
        // }("");
        (bool callSuccess, ) = i_owner.call{value: address(this).balance}("");
        require(callSuccess, "Call failed");
    }

    // GETTER functions to save on gas instead of making variables public & make more readable.
    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(address funder)
        public
        view
        returns (uint256)
    {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
