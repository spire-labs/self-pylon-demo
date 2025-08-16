// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {HumanNFT} from "../src/HumanNFT.sol";

contract DeployPylon is Script {
    function run() external {
        vm.startBroadcast();
        HumanNFT nft = new HumanNFT();
        console2.log("HumanNFT:", address(nft));
        vm.stopBroadcast();
    }
}

