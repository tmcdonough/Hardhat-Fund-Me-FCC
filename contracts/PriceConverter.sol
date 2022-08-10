// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// import "./AggregatorV3Interface.sol";

// REMIX knows how to automatically download below using npm.
// With local code we need to add these manually
// it is much simpler than with brownie. Just do yarn add --dev @chainlink/contracts and then you dont have to touch the code below. Hardfhat will find it in node_modules folder
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// librarys cant maintain state and also cant send ether
// all of the functions are internal.

library PriceConverter {
    // since we want to compare a value to a USD-based minimum, we need to get the price of eth in USD first.
    // ORIGINAL REMIX VERSION DIDNT INCLUDE AggregatorV3Interface as FUNCTION IN getPrice()
    function getPrice(AggregatorV3Interface priceFeed)
        internal
        view
        returns (uint256)
    {
        // THE BELOW CODE WAS WITH REMIX VERSION. NOW THAT WE PASS IN AN INTERFACE, NO LONGER NEED TO CREATE IT HERE.
        // // We're interacting with another contract so we need:
        // // 1) Address... we can get from docs: 0x8A753747A1Fa494EC906cE90E9f37563A8AF630e (Rinkeby)
        // // 2) ABI... we can use an interface.
        // // --- interfaces DECLARE the functions but doesnt say what they do. That's fine because we just need the names / required inputs / required outputs of the functions.
        // AggregatorV3Interface priceFeed = AggregatorV3Interface(
        //     0x8A753747A1Fa494EC906cE90E9f37563A8AF630e
        // );
        // // (uint80 roundID, int price, uint startedAt, uint timeStamp, uint80 answeredInRound) = priceFeed.latestRoundData();
        (, int256 price, , , ) = priceFeed.latestRoundData(); // int instead of uint so that it can be negative.
        return uint256(price * 1e10); // because the chainlink oracle data is 8 decimals versus wei is 18
    }

    // function getVersion() internal view returns (uint256) {
    //     AggregatorV3Interface priceFeed = AggregatorV3Interface(
    //         0x8A753747A1Fa494EC906cE90E9f37563A8AF630e
    //     );
    //     return priceFeed.version();
    // }

    // Original REMIX VERSION
    // function getConversionRate(uint256 ethAmount)
    // HARDHAT VERSION (incorporates modular priceFeed)
    function getConversionRate(
        uint256 ethAmount,
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        // ORIGINAL REMIX VERSION DIDNT INCLUDE priceFeed AS A VARIABLE IN getPrice()
        uint256 ethPrice = getPrice(priceFeed);
        uint256 ethAmountInUsd = (ethPrice * ethAmount) / 1e18;
        return ethAmountInUsd;
    }
}
