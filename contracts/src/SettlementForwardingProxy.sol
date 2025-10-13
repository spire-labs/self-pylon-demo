// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISettlementReader} from "./ISettlementReader.sol";

contract SettlementForwardingProxy {
    address public immutable SETTLEMENT_PORT;
    address public immutable IMPL;

    constructor(address _settlementPort, address _impl) {
        SETTLEMENT_PORT = _settlementPort;
        IMPL = _impl;
    }

    fallback() external payable {
        bytes memory result = ISettlementReader(SETTLEMENT_PORT).readSettlement(IMPL, msg.data);
        assembly {
            let ptr := add(result, 0x20)
            let len := mload(result)
            return(ptr, len)
        }
    }

    receive() external payable {
        bytes memory result = ISettlementReader(SETTLEMENT_PORT).readSettlement(IMPL, bytes(""));
        assembly {
            let ptr := add(result, 0x20)
            let len := mload(result)
            return(ptr, len)
        }
    }
}