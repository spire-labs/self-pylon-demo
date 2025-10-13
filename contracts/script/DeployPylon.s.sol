// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {HumanNFT} from "../src/HumanNFT.sol";
import {SettlementForwardingProxy} from "../src/SettlementForwardingProxy.sol";

contract DeployPylon is Script {
    function run() external {
        vm.startBroadcast();
        
        // Get the SettlementPort address on Pylon (provided by Pylon appchain)
        address settlementPort = vm.envAddress("PYLON_SETTLEMENT_PORT");
        
        // Get the ProofOfHuman contract address on Celo
        address proofOfHumanOnCelo = vm.envAddress("PROOF_OF_HUMAN_ADDRESS");
        
        // Deploy SettlementForwardingProxy that reads from ProofOfHuman on Celo via settlement
        SettlementForwardingProxy proxy = new SettlementForwardingProxy(
            settlementPort,
            proofOfHumanOnCelo
        );
        console2.log("SettlementForwardingProxy:", address(proxy));
        console2.log("- SettlementPort (on Pylon):", settlementPort);
        console2.log("- ProofOfHuman (on Celo):", proofOfHumanOnCelo);
        
        // Deploy HumanNFT contract with the proxy address (proxy acts as ProofOfHuman)
        HumanNFT nft = new HumanNFT(address(proxy));
        console2.log("HumanNFT:", address(nft));
        console2.log("- Using SettlementForwardingProxy as ProofOfHuman:", address(proxy));
        
        vm.stopBroadcast();
    }
}

