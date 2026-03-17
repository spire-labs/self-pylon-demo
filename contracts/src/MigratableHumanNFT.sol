// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {HumanNFT as BaseHumanNFT} from "celo-self-contracts/src/HumanNFT.sol";

contract MigratableHumanNFT is BaseHumanNFT {
    bool public seedingComplete;

    event Seeded(uint256 count, uint256 maxTokenId);
    event SeedingCompleted();

    constructor(address proofOfHumanContract_, address initialOwner)
        BaseHumanNFT(proofOfHumanContract_, initialOwner)
    {}

    function mint() public override {
        require(seedingComplete, "Seeding not complete");
        super.mint();
    }

    function seedMints(address[] calldata owners, uint256[] calldata tokenIds, uint256[] calldata nullifiers)
        external
        onlyOwner
    {
        require(!seedingComplete, "Seeding complete");
        require(owners.length == tokenIds.length && owners.length == nullifiers.length, "Array length mismatch");

        uint256 updatedNextId = nextId;
        for (uint256 i = 0; i < owners.length; i++) {
            address owner = owners[i];
            uint256 tokenId = tokenIds[i];
            uint256 nullifier = nullifiers[i];

            require(owner != address(0), "Invalid owner");
            require(tokenId != 0, "Invalid tokenId");
            require(nullifier != 0, "Invalid nullifier");
            require(!nullifierMinted[nullifier], "Nullifier already used");

            nullifierMinted[nullifier] = true;
            _mint(owner, tokenId);

            if (tokenId >= updatedNextId) {
                updatedNextId = tokenId + 1;
            }
        }

        if (updatedNextId != nextId) {
            nextId = updatedNextId;
        }

        emit Seeded(owners.length, updatedNextId > 0 ? updatedNextId - 1 : 0);
    }

    function completeSeeding() external onlyOwner {
        require(!seedingComplete, "Seeding complete");
        seedingComplete = true;
        emit SeedingCompleted();
    }
}
