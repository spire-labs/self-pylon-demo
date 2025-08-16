// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/interfaces/ISelfVerificationRoot.sol";
import {Ownable} from "lib/openzeppelin-contracts/access/Ownable.sol";

contract ProofOfHuman is SelfVerificationRoot, Ownable {
    mapping(address => bool) public verifiedHumans;
    bytes32 public verificationConfigId;

    event VerificationCompleted(ISelfVerificationRoot.GenericDiscloseOutputV2 output, bytes userData);

    constructor(address hubV2, uint256 scope, bytes32 configId)
        SelfVerificationRoot(hubV2, scope)
        Ownable(msg.sender)
    {
        verificationConfigId = configId;
    }

    function getConfigId(
        bytes32 /*destinationChainId*/,
        bytes32 /*userIdentifier*/,
        bytes memory /*userDefinedData*/
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    function setScope(uint256 newScope) external onlyOwner {
        _setScope(newScope);
    }

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        address user = address(uint160(output.userIdentifier));
        verifiedHumans[user] = true;
        emit VerificationCompleted(output, userData);
    }
}


