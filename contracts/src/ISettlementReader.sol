// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISettlementReader {
    function readSettlement(address target, bytes calldata callData) external view returns (bytes memory);
}
