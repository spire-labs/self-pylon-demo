// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/token/ERC721/ERC721.sol";
import "@openzeppelin/access/Ownable.sol";

// Interface for ProofOfHuman contract on Celo L2
interface IProofOfHuman {
    function isVerified(address user) external view returns (bool);
    function addressToNullifier(address user) external view returns (uint256);
}

contract HumanNFT is ERC721, Ownable {
    uint256 public nextId = 1;
    mapping(uint256 => bool) public nullifierMinted; // Track which nullifiers have been used
    
    // ProofOfHuman contract address on Celo L2
    address public proofOfHumanContract;
    
    // Events
    event ProofOfHumanContractUpdated(address indexed oldContract, address indexed newContract);
    event HumanVerified(address indexed user, uint256 indexed tokenId, uint256 nullifier);

    constructor(address _proofOfHumanContract) ERC721("I Am Human", "HUMAN") Ownable(msg.sender) {
        require(_proofOfHumanContract != address(0), "Invalid ProofOfHuman contract address");
        proofOfHumanContract = _proofOfHumanContract;
    }
    
    // Public view function to check if a nullifier has been used
    function isNullifierMinted(uint256 nullifier) public view returns (bool) {
        return nullifierMinted[nullifier];
    }
    
    function setProofOfHumanContract(address _proofOfHumanContract) external onlyOwner {
        require(_proofOfHumanContract != address(0), "Invalid contract address");
        address oldContract = proofOfHumanContract;
        proofOfHumanContract = _proofOfHumanContract;
        emit ProofOfHumanContractUpdated(oldContract, _proofOfHumanContract);
    }
    
    function _getNullifier(address user) internal view returns (uint256) {
        require(proofOfHumanContract != address(0), "ProofOfHuman contract not set");
        
        try IProofOfHuman(proofOfHumanContract).addressToNullifier(user) returns (uint256 nullifier) {
            return nullifier;
        } catch {
            // If the call fails, return 0 (no nullifier found)
            return 0;
        }
    }
    
    // Public view function to get nullifier for an address
    function getNullifierForAddress(address user) external view returns (uint256) {
        return _getNullifier(user);
    }
    
    // Override transfer functions to make NFT soulbound (non-transferable)
    function transferFrom(address from, address to, uint256 tokenId) public virtual override {
        revert("Soulbound: This NFT cannot be transferred");
    }
    
    // Override approval functions since transfers are disabled
    function approve(address to, uint256 tokenId) public virtual override {
        revert("Soulbound: This NFT cannot be transferred");
    }
    
    function setApprovalForAll(address operator, bool approved) public virtual override {
        revert("Soulbound: This NFT cannot be transferred");
    }
    
    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        revert("Soulbound: This NFT cannot be transferred");
    }
    
    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return false;
    }
    
    function mint() external {
        // Get the nullifier for this address from ProofOfHuman contract
        uint256 nullifier = _getNullifier(msg.sender);
        
        // Check if they have a nullifier (are attested)
        require(nullifier != 0, "BEEP BOOP! The ProofOfHuman contract says you're not verified. Are you sure you're not a sophisticated AI trying to infiltrate our human club? Maybe try getting a real passport first?");
        
        // Check if this nullifier has already been used to mint an NFT
        require(!isNullifierMinted(nullifier), "Nice try, robot! This passport has already been used to claim an NFT. Are you trying to create multiple identities? That's very... robot-like behavior! Maybe try cloning yourself and getting another passport first?");
        
        // All checks passed - mint the NFT
        nullifierMinted[nullifier] = true;
        uint256 tokenId = nextId++;
        _mint(msg.sender, tokenId);
        
        emit HumanVerified(msg.sender, tokenId, nullifier);
    }
    
    // Override tokenURI to provide custom metadata
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "ERC721: invalid token ID");
        
        // Small on-chain SVG. Replace with your own art; keep it short to limit gas.
        string memory imageData = _imageData();
        
        // Minimal JSON with image inlined as data URI
        return string(
            abi.encodePacked(
                'data:application/json,{',
                '\n  "name": "I Am Human",',
                '\n  "description": "Attested human on Self+Celo",',
                '\n  "image": "', imageData, '"',
                '\n}'
            )
        );
    }
    
    function _imageData() private pure returns (string memory) {
        return
            'data:image/svg+xml;utf8,'
            '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'
            '<rect width="100%" height="100%" fill="#0A0A0A"/>'
            '<circle cx="256" cy="180" r="60" fill="#00E08B"/>'
            '<rect x="196" y="250" width="120" height="160" rx="28" fill="#00E08B"/>'
            '<text x="256" y="460" font-family="monospace" font-size="28" text-anchor="middle" fill="#FFFFFF">I AM HUMAN</text>'
            '</svg>';
    }
}

