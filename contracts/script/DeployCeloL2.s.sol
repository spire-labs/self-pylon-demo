// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {SelfAttestationRegistry} from "../src/SelfAttestationRegistry.sol";
import {IVerifier} from "../src/IVerifier.sol";

contract DeployCeloL2 is Script {
    function run() external {
        vm.startBroadcast();
        // Expect a pre-deployed verifier address via env to avoid mocks
        address verifierAddr = vm.envAddress("SELF_VERIFIER_ADDRESS");
        IVerifier verifier = IVerifier(verifierAddr);
        SelfAttestationRegistry registry = new SelfAttestationRegistry(verifier);
        console2.log("Verifier:", address(verifier));
        console2.log("Registry:", address(registry));
        vm.stopBroadcast();
    }
}

