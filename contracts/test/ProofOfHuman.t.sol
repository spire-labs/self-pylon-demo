// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ProofOfHuman} from "../src/ProofOfHuman.sol";
import {ISelfVerificationRoot} from "lib/selfxyz-contracts/contracts/interfaces/ISelfVerificationRoot.sol";

contract ProofOfHumanTest is Test {
    ProofOfHuman public proofOfHuman;
    address public mockVerifier;
    
    // Paste the signature from the frontend here
    bytes public constant FRONTEND_SIGNATURE = hex"8a9b3f19817970a6ec6d4fbc91d9860609bcab9eba16aeb6858aefcb3ff2b99b73a1f4bfd33007cfc195d49e6bc6e9eeca2acad47369db7b73595f071b8399f61c";
    
    // The address that should be recovered from the signature
    address public constant EXPECTED_SIGNER = 0xa5be43129B247AcB30175905D635a39D883602d4;

    function setUp() public {
        mockVerifier = address(0x123);
        proofOfHuman = new ProofOfHuman(mockVerifier, 12345, bytes32(uint256(1)));
    }

    /**
     * @dev Test that the frontend signature recovers the expected address
     */
    function testFrontendSignature() public view {
        // Skip if no signature is provided
        if (FRONTEND_SIGNATURE.length == 0) {
            console2.log("No signature provided - paste frontend signature in FRONTEND_SIGNATURE");
            return;
        }
        
        // Convert the signature to ASCII-encoded hex string (like Self sends)
        string memory signatureHex = _bytesToHexString(FRONTEND_SIGNATURE);
        bytes memory asciiSignature = bytes(signatureHex);
        
        // Test the contract's signature verification with ASCII-encoded hex
        bool isValid = proofOfHuman._verifySignature(EXPECTED_SIGNER, asciiSignature);
        assertTrue(isValid, "Frontend signature should verify correctly");
        
        console2.log("Frontend signature verified successfully!");
    }
    
    /**
     * @dev Test with the exact userData that Self would send (just the signature)
     */
    function testWithActualSelfData() public view {
        // This is just the signature hex string (65 bytes = 130 hex chars + 0x prefix)
        // No junk prefix data, just the signature that Self would send
        string memory signatureHexString = "0x8a9b3f19817970a6ec6d4fbc91d9860609bcab9eba16aeb6858aefcb3ff2b99b73a1f4bfd33007cfc195d49e6bc6e9eeca2acad47369db7b73595f071b8399f61c";
        
        console2.log("Testing with actual Self data format:");
        console2.log("Signature hex string length:", bytes(signatureHexString).length);
        console2.log("Signature hex string starts with:", _substring(signatureHexString, 0, 10));
        
        // Convert hex string to ASCII bytes (like Self sends)
        bytes memory userData = bytes(signatureHexString);
        console2.log("ASCII userData length:", userData.length);
        
        // Test with _verifySignature first
        bool verifyResult = proofOfHuman._verifySignature(EXPECTED_SIGNER, userData);
        console2.log("_verifySignature result:", verifyResult);
        
        assertTrue(verifyResult, "_verifySignature should succeed with clean signature data");
    }
    
    /**
     * @dev Helper function to get substring for testing
     */
    function _substring(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex && i < strBytes.length; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }
    
    /**
     * @dev Helper function to convert bytes to ASCII-encoded hex string
     */
    function _bytesToHexString(bytes memory data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(data.length * 2);
        for (uint256 i = 0; i < data.length; i++) {
            result[i * 2] = hexChars[uint8(data[i]) / 16];
            result[i * 2 + 1] = hexChars[uint8(data[i]) % 16];
        }
        return string(result);
    }
}
