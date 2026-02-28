// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SettlementForwardingProxy} from "../src/SettlementForwardingProxy.sol";

contract SettlementForwardingProxyTest is Test {
    function testProxyCallsCrosschainRead() public {
        MockAppchainPort port = new MockAppchainPort();

        address impl = address(0xBEEF);
        SettlementForwardingProxy proxy = new SettlementForwardingProxy(address(port), impl);

        bytes memory callData = abi.encodeWithSignature("addressToNullifier(address)", address(0x1234));
        (bool ok, bytes memory ret) = address(proxy).call(callData);
        assertTrue(ok);

        (address observedTo, bytes memory observedData) = abi.decode(ret, (address, bytes));
        assertEq(observedTo, impl);
        assertEq(observedData, callData);
    }
}

contract MockAppchainPort {
    function crosschainRead(address _to, bytes calldata _data) external pure returns (bytes memory) {
        return abi.encode(_to, _data);
    }
}
