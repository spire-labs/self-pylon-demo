// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {ProofOfHuman} from "../src/ProofOfHuman.sol";

contract DeployHubRoot is Script {
    function run() external {
        address hub = vm.envAddress("SELF_HUB_ADDRESS");

        uint256 scope;
        // Fallback to 0 if SELF_SCOPE is not set
        try vm.envUint("SELF_SCOPE") returns (uint256 s) {
            scope = s;
        } catch {
            scope = 0;
        }

        bytes32 configId;
        // Fallback to 0x01 if SELF_CONFIG_ID is not set (for smoke tests)
        try vm.envBytes32("SELF_CONFIG_ID") returns (bytes32 cid) {
            configId = cid;
        } catch {
            configId = bytes32(uint256(1));
        }

        vm.startBroadcast();
        ProofOfHuman root = new ProofOfHuman(hub, scope, configId);
        console2.log("ProofOfHuman:", address(root));
        vm.stopBroadcast();
    }
}


