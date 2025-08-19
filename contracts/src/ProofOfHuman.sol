// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/interfaces/ISelfVerificationRoot.sol";
import {Ownable} from "@openzeppelin/access/Ownable.sol";
import {Strings} from "@openzeppelin/utils/Strings.sol";

contract ProofOfHuman is SelfVerificationRoot, Ownable {
    // Mapping from address to nullifier (passport ID)
    mapping(address => uint256) public addressToNullifier;
    
    // Mapping from nullifier to array of associated addresses
    mapping(uint256 => address[]) public nullifierToAddresses;
    
    // Verification config ID
    bytes32 public verificationConfigId;
    
    // Events
    event VerificationCompleted(
        uint256 indexed nullifier, 
        address indexed userAddress, 
        bytes32 userIdentifier
    );
    
    constructor(address hubV2, uint256 scope, bytes32 configId)
        SelfVerificationRoot(hubV2, scope)
        Ownable(msg.sender)
    {
        verificationConfigId = configId;
    }

    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    function setScope(uint256 newScope) external onlyOwner {
        _setScope(newScope);
    }
    
    /**
     * @dev Extract signature from userData and verify it matches the claimed address
     * @param claimedAddress The address that should have signed the message
     * @param userData ASCII-encoded hex string from Self (e.g., "0x0001020304...")
     * @return bool True if signature is valid for the claimed address
     */
    function _verifySignature(
        address claimedAddress, 
        bytes memory userData
    ) public pure returns (bool) {
        // Self sends ASCII-encoded hex string, convert to actual bytes
        string memory hexString = string(userData);
        bytes memory actualData = _hexStringToBytes(hexString);
        
        if (actualData.length < 65) return false; // Need at least 65 bytes for signature
        
        // Extract the signature directly (no prefix to skip)
        bytes memory signature = new bytes(65);
        for (uint256 i = 0; i < 65; i++) {
            signature[i] = actualData[i];
        }
        
        // Extract r, s, v from the signature
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        // Recover the signer using EIP-191 hash (what personal_sign generates)
        // Use hardcoded message with address
        string memory messageText = string(abi.encodePacked(
            "I confirm that both this passport and public address ",
            Strings.toHexString(claimedAddress),
            " are owned by me"
        ));
        bytes memory message = bytes(messageText);
        
        // Create EIP-191 hash: \x19Ethereum Signed Message:\n<length><message>
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n",
            _uintToString(message.length),
            message
        ));
        
        address signer = ecrecover(messageHash, v, r, s);
        return signer == claimedAddress;
    }
    
    /**
     * @dev Helper function to convert uint to string (for EIP-191 prefix)
     * @param value The uint to convert
     * @return string The string representation
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Helper function to convert hex string to bytes
     * @param hexString The hex string to convert (with or without 0x prefix)
     * @return bytes The bytes representation
     */
    function _hexStringToBytes(string memory hexString) internal pure returns (bytes memory) {
        // Remove 0x prefix if present
        if (bytes(hexString).length >= 2 && bytes(hexString)[0] == bytes1("0") && bytes(hexString)[1] == bytes1("x")) {
            hexString = _substring(hexString, 2, bytes(hexString).length);
        }
        
        bytes memory result = new bytes(bytes(hexString).length / 2);
        for (uint256 i = 0; i < result.length; i++) {
            uint8 high = _hexCharToByte(bytes(hexString)[i * 2]);
            uint8 low = _hexCharToByte(bytes(hexString)[i * 2 + 1]);
            result[i] = bytes1((high << 4) | low);
        }
        return result;
    }
    
    /**
     * @dev Helper function to convert hex character to byte
     * @param char The hex character
     * @return uint8 The byte value
     */
    function _hexCharToByte(bytes1 char) internal pure returns (uint8) {
        if (char >= bytes1("0") && char <= bytes1("9")) {
            return uint8(char) - uint8(bytes1("0"));
        } else if (char >= bytes1("a") && char <= bytes1("f")) {
            return uint8(char) - uint8(bytes1("a")) + 10;
        } else if (char >= bytes1("A") && char <= bytes1("F")) {
            return uint8(char) - uint8(bytes1("A")) + 10;
        } else {
            revert("Invalid hex character");
        }
    }
    
    /**
     * @dev Helper function to get substring
     * @param str The string to slice
     * @param startIndex The starting index
     * @param endIndex The ending index
     * @return string The substring
     */
    function _substring(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        require(startIndex <= endIndex && endIndex <= strBytes.length, "Invalid substring indices");
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }
    
    /**
     * @dev Custom verification hook called by Self protocol
     * @param output The disclosure output from Self
     * @param userData User-defined data containing the signature
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        uint256 nullifier = output.nullifier;
        address userAddress = address(uint160(output.userIdentifier));
        
        // Prevent address from being associated with multiple passports
        require(
            addressToNullifier[userAddress] == 0, 
            "Address already associated with a passport"
        );
        
        // Verify signature in userData
        require(_verifySignature(userAddress, userData), string(abi.encodePacked(
            "Invalid signature. userData length: ",
            ", userData: ", 
            string(userData)
        )));
        
        nullifierToAddresses[nullifier].push(userAddress);
        addressToNullifier[userAddress] = nullifier;
        
        emit VerificationCompleted(nullifier, userAddress, bytes32(output.userIdentifier));
    }

    /**
     * @dev Check if an address is verified (has a non-zero nullifier)
     * @param user The address to check
     * @return bool True if the address is verified
     */
    function isVerified(address user) external view returns (bool) {
        return addressToNullifier[user] != 0;
    }

    /**
     * @dev Get all addresses associated with a passport (nullifier)
     * @param nullifier The passport nullifier
     * @return address[] Array of addresses associated with the passport
     */
    function getAddressesForPassport(uint256 nullifier) external view returns (address[] memory) {
        return nullifierToAddresses[nullifier];
    }
}


