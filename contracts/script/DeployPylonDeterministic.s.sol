// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {HumanNFT} from "../src/HumanNFT.sol";
import {SettlementForwardingProxy} from "../src/SettlementForwardingProxy.sol";

contract DeployPylonDeterministic is Script {
    address internal constant DETERMINISTIC_DEPLOYMENT_PROXY =
        0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        address appchainPort = vm.envAddress("PYLON_APPCHAIN_PORT");
        address proofOfHumanOnCelo = vm.envAddress("PROOF_OF_HUMAN_ADDRESS");
        address humanNftOwner = vm.envAddress("HUMAN_NFT_OWNER");

        bytes32 defaultProxySalt =
            keccak256(abi.encodePacked("self-pylon-demo:SettlementForwardingProxy:v1:", block.chainid));
        bytes32 defaultHumanNftSalt = keccak256(abi.encodePacked("self-pylon-demo:HumanNFT:v1:", block.chainid));

        bytes32 proxySalt = _envBytes32Or("PROXY_SALT", defaultProxySalt);
        bytes32 humanNftSalt = _envBytes32Or("HUMAN_NFT_SALT", defaultHumanNftSalt);

        bytes memory proxyInit =
            abi.encodePacked(type(SettlementForwardingProxy).creationCode, abi.encode(appchainPort, proofOfHumanOnCelo));
        address proxyAddr =
            _computeCreate2Address(DETERMINISTIC_DEPLOYMENT_PROXY, proxySalt, keccak256(proxyInit));

        bytes memory nftInit = abi.encodePacked(type(HumanNFT).creationCode, abi.encode(proxyAddr, humanNftOwner));
        address humanNftAddr =
            _computeCreate2Address(DETERMINISTIC_DEPLOYMENT_PROXY, humanNftSalt, keccak256(nftInit));

        console2.log("Deterministic deployment proxy:", DETERMINISTIC_DEPLOYMENT_PROXY);
        console2.log("AppchainPort:", appchainPort);
        console2.log("ProofOfHuman (Celo):", proofOfHumanOnCelo);
        console2.log("HumanNFT owner:", humanNftOwner);
        console2.log("SettlementForwardingProxy salt:", uint256(proxySalt));
        console2.log("HumanNFT salt:", uint256(humanNftSalt));
        console2.log("Expected SettlementForwardingProxy:", proxyAddr);
        console2.log("Expected HumanNFT:", humanNftAddr);

        vm.startBroadcast();
        _deployIfMissing(proxyAddr, proxySalt, proxyInit, "SettlementForwardingProxy");
        _deployIfMissing(humanNftAddr, humanNftSalt, nftInit, "HumanNFT");
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
        try vm.envBytes32(name) returns (bytes32 v) {
            return v;
        } catch {
            return defaultValue;
        }
    }

    function _computeCreate2Address(address factory, bytes32 salt, bytes32 initCodeHash) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), factory, salt, initCodeHash)))));
    }
}
