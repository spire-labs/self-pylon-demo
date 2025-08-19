// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {HumanNFT} from "../src/HumanNFT.sol";

contract DeployPylon is Script {
    function run() external {
        vm.startBroadcast();
        
        // Get the ProofOfHuman contract address from environment
        address proofOfHumanContract = vm.envAddress("PROOF_OF_HUMAN_ADDRESS");
        
        // Deploy HumanNFT contract with ProofOfHuman address
        HumanNFT nft = new HumanNFT(proofOfHumanContract);
        console2.log("HumanNFT:", address(nft));
        console2.log("ProofOfHuman contract set to:", proofOfHumanContract);
        
        vm.stopBroadcast();
    }
}

