// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {HumanNFT} from "../src/HumanNFT.sol";
import {SettlementForwardingProxy} from "../src/SettlementForwardingProxy.sol";

contract DeployPylon is Script {
    function run() external {
        vm.startBroadcast();
        
        // Get the AppchainPort (crosschain read/write preinstall) address on Pylon.
        // Default is 0x...0043 on modern Pylon chains; we keep a legacy fallback to PYLON_SETTLEMENT_PORT.
        address appchainPort;
        try vm.envAddress("PYLON_APPCHAIN_PORT") returns (address v) {
            appchainPort = v;
        } catch {
            appchainPort = vm.envAddress("PYLON_SETTLEMENT_PORT");
        }
        
        // Get the ProofOfHuman contract address on Celo
        address proofOfHumanOnCelo = vm.envAddress("PROOF_OF_HUMAN_ADDRESS");

        // Deploy SettlementForwardingProxy that reads from ProofOfHuman on Celo via AppchainPort.crosschainRead
        SettlementForwardingProxy proxy = new SettlementForwardingProxy(
            appchainPort,
            proofOfHumanOnCelo
        );
        console2.log("SettlementForwardingProxy:", address(proxy));
        console2.log("- AppchainPort (on Pylon):", appchainPort);
        console2.log("- ProofOfHuman (on Celo):", proofOfHumanOnCelo);
        
        address initialOwner = vm.envAddress("HUMAN_NFT_OWNER");

        // Deploy HumanNFT contract with the proxy address (proxy acts as ProofOfHuman)
        HumanNFT nft = new HumanNFT(address(proxy), initialOwner);
        console2.log("HumanNFT:", address(nft));
        console2.log("- Using SettlementForwardingProxy as ProofOfHuman:", address(proxy));
        console2.log("- HumanNFT owner:", initialOwner);
        
        vm.stopBroadcast();
    }
}
