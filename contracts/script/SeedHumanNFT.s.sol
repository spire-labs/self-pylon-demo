// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import {HumanNFT} from "../src/HumanNFT.sol";

contract SeedHumanNFT is Script {
    using stdJson for string;

    function run() external {
        address nftAddress = vm.envAddress("HUMAN_NFT_ADDRESS");
        string memory inputPath = vm.envString("SEED_INPUT");
        string memory json = vm.readFile(inputPath);
        uint256 batchCount = json.readUint(".batchCount");
        uint256 finalize = vm.envOr("FINALIZE_SEEDING", uint256(0));
        if (finalize == 0) {
            finalize = vm.envOr("FINALIZE_MIGRATION", uint256(0));
        }
        uint256 finalizeOnly = vm.envOr("FINALIZE_ONLY", uint256(0));

        vm.startBroadcast();
        HumanNFT nft = HumanNFT(nftAddress);

        if (finalizeOnly != 1) {
            for (uint256 i = 0; i < batchCount; i++) {
                string memory prefix = string.concat(".batches[", vm.toString(i), "]");
                address[] memory owners = json.readAddressArray(string.concat(prefix, ".owners"));
                uint256[] memory tokenIds = json.readUintArray(string.concat(prefix, ".tokenIds"));
                uint256[] memory nullifiers = json.readUintArray(string.concat(prefix, ".nullifiers"));

                nft.seedMints(owners, tokenIds, nullifiers);
            }
        }

        if (finalize == 1) {
            nft.completeSeeding();
        }
        vm.stopBroadcast();
    }
}
