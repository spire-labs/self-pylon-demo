// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from './IVerifier.sol';

contract SelfAttestationRegistry {
    event Attested(address indexed user, bytes32 commitment, uint256 attributeSetId);

    IVerifier public immutable verifier;

    mapping(address => bytes32) public commitmentOf;

    constructor(IVerifier _verifier) {
        verifier = _verifier;
    }

    function submitProof(
        bytes calldata proof,
        uint256[] calldata publicSignals,
        bytes32 commitment,
        uint256 attributeSetId
    ) external {
        bool ok = verifier.verifyProof(proof, publicSignals);
        require(ok, 'invalid proof');
        // NOTE: In production ensure the proof binds to msg.sender
        commitmentOf[msg.sender] = commitment;
        emit Attested(msg.sender, commitment, attributeSetId);
    }
}

