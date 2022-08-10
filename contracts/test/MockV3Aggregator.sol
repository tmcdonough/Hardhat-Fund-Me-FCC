// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

// the beauty of just importing this versus copy+pasting is any imports in the imported contract dont have to be changed.abi
// i.e. in this one there is a "../" that we'd need to change if we werent importing
import "@chainlink/contracts/src/v0.6/tests/MockV3Aggregator.sol";
