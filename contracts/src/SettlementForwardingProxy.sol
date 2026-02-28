// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISettlementReader} from "./ISettlementReader.sol";

contract SettlementForwardingProxy {
    address public immutable APPCHAIN_PORT;
    address public immutable IMPL;

    constructor(address _appchainPort, address _impl) {
        APPCHAIN_PORT = _appchainPort;
        IMPL = _impl;
    }

    fallback() external payable {
        bytes memory result = ISettlementReader(APPCHAIN_PORT).crosschainRead(IMPL, msg.data);
        assembly {
            let ptr := add(result, 0x20)
            let len := mload(result)
            return(ptr, len)
        }
    }

    receive() external payable {
        bytes memory result = ISettlementReader(APPCHAIN_PORT).crosschainRead(IMPL, bytes(""));
        assembly {
            let ptr := add(result, 0x20)
            let len := mload(result)
            return(ptr, len)
        }
    }
}
