// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {AppchainReadForwarder} from "celo-self-contracts/src/AppchainReadForwarder.sol";
import {MigratableHumanNFT} from "../src/MigratableHumanNFT.sol";

contract DeployAppchainDeterministic is Script {
    address internal constant DETERMINISTIC_DEPLOYMENT_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        address appchainPort = vm.envAddress("APPCHAIN_PORT");

        address proofOfHumanOnCelo = vm.envAddress("PROOF_OF_HUMAN_ADDRESS");
        address humanNftOwner = vm.envAddress("HUMAN_NFT_OWNER");

        bytes32 defaultForwarderSalt =
            keccak256(abi.encodePacked("self-appchain-demo:AppchainReadForwarder:v1:", block.chainid));
        bytes32 defaultHumanNftSalt =
            keccak256(abi.encodePacked("self-appchain-demo:MigratableHumanNFT:v1:", block.chainid));

        bytes32 forwarderSalt = _envBytes32Or("APPCHAIN_FORWARDER_SALT", defaultForwarderSalt);
        bytes32 humanNftSalt = _envBytes32Or("HUMAN_NFT_SALT", defaultHumanNftSalt);

        bytes memory forwarderInit =
            abi.encodePacked(type(AppchainReadForwarder).creationCode, abi.encode(appchainPort, proofOfHumanOnCelo));
        address forwarderAddr =
            _computeCreate2Address(DETERMINISTIC_DEPLOYMENT_PROXY, forwarderSalt, keccak256(forwarderInit));

        bytes memory nftInit =
            abi.encodePacked(type(MigratableHumanNFT).creationCode, abi.encode(forwarderAddr, humanNftOwner));
        address humanNftAddr = _computeCreate2Address(DETERMINISTIC_DEPLOYMENT_PROXY, humanNftSalt, keccak256(nftInit));

        console2.log("Deterministic deployment proxy:", DETERMINISTIC_DEPLOYMENT_PROXY);
        console2.log("AppchainPort:", appchainPort);
        console2.log("ProofOfHuman (Celo):", proofOfHumanOnCelo);
        console2.log("HumanNFT owner:", humanNftOwner);
        console2.log("AppchainReadForwarder salt:", uint256(forwarderSalt));
        console2.log("MigratableHumanNFT salt:", uint256(humanNftSalt));
        console2.log("Expected AppchainReadForwarder:", forwarderAddr);
        console2.log("Expected MigratableHumanNFT:", humanNftAddr);

        vm.startBroadcast();
        _deployIfMissing(forwarderAddr, forwarderSalt, forwarderInit, "AppchainReadForwarder");
        _deployIfMissing(humanNftAddr, humanNftSalt, nftInit, "MigratableHumanNFT");
        vm.stopBroadcast();
    }

    function _deployIfMissing(address expected, bytes32 salt, bytes memory initCode, string memory label) internal {
        if (expected.code.length != 0) {
            console2.log(label, "already deployed");
            return;
        }

        bytes memory data = abi.encodePacked(salt, initCode);
        (bool ok, bytes memory ret) = DETERMINISTIC_DEPLOYMENT_PROXY.call(data);
        if (!ok) {
            assembly {
                revert(add(ret, 0x20), mload(ret))
            }
        }

        if (expected.code.length == 0) {
            revert(string.concat(label, " deploy failed: expected address has no code"));
        }
        console2.log(label, "deployed");
    }

    function _envBytes32Or(string memory name, bytes32 defaultValue) internal returns (bytes32) {
        try vm.envBytes32(name) returns (bytes32 value) {
            return value;
        } catch {
            return defaultValue;
        }
    }

    function _computeCreate2Address(address factory, bytes32 salt, bytes32 initCodeHash)
        internal
        pure
        returns (address)
    {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), factory, salt, initCodeHash)))));
    }
}
