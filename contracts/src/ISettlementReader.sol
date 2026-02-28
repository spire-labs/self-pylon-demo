// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISettlementReader {
    function crosschainRead(address _to, bytes calldata _data) external view returns (bytes memory);
}
