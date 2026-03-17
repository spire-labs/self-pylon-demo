// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MigratableHumanNFT} from "../src/MigratableHumanNFT.sol";

contract HumanNFTMigrationTest is Test {
    MigratableHumanNFT private nft;

    function setUp() public {
        nft = new MigratableHumanNFT(address(0x1234), address(this));
    }

    function testSeedMintsSetsStateAndNextId() public {
        address[] memory owners = new address[](2);
        owners[0] = address(0x1111);
        owners[1] = address(0x2222);

        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = 5;
        tokenIds[1] = 2;

        uint256[] memory nullifiers = new uint256[](2);
        nullifiers[0] = 111;
        nullifiers[1] = 222;

        nft.seedMints(owners, tokenIds, nullifiers);

        assertEq(nft.ownerOf(5), owners[0]);
        assertEq(nft.ownerOf(2), owners[1]);
        assertTrue(nft.nullifierMinted(111));
        assertTrue(nft.nullifierMinted(222));
        assertEq(nft.nextId(), 6);
    }

    function testSeedMintsRejectsDuplicateNullifier() public {
        address[] memory owners = new address[](2);
        owners[0] = address(0x1111);
        owners[1] = address(0x2222);

        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = 1;
        tokenIds[1] = 2;

        uint256[] memory nullifiers = new uint256[](2);
        nullifiers[0] = 999;
        nullifiers[1] = 999;

        vm.expectRevert();
        nft.seedMints(owners, tokenIds, nullifiers);
    }

    function testSeedMintsOnlyOwner() public {
        address[] memory owners = new address[](1);
        owners[0] = address(0x1111);

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = 1;

        uint256[] memory nullifiers = new uint256[](1);
        nullifiers[0] = 123;

        vm.prank(address(0xBEEF));
        vm.expectRevert();
        nft.seedMints(owners, tokenIds, nullifiers);
    }

    function testMintRequiresMigrationComplete() public {
        vm.expectRevert(bytes("Seeding not complete"));
        nft.mint();
    }

    function testCompleteMigrationBlocksFurtherSeeding() public {
        nft.completeSeeding();

        address[] memory owners = new address[](1);
        owners[0] = address(0x1111);

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = 1;

        uint256[] memory nullifiers = new uint256[](1);
        nullifiers[0] = 123;

        vm.expectRevert(bytes("Seeding complete"));
        nft.seedMints(owners, tokenIds, nullifiers);
    }
}
