// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Minimal ERC165
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// Minimal ERC721 interface
interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
}

contract HumanNFT is IERC721 {
    string public constant name = "I Am Human";
    string public constant symbol = "HUMAN";

    uint256 public nextId = 1;
    mapping(address => bool) public minted;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) private _approvals;
    mapping(address => mapping(address => bool)) private _operatorApproval;

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == 0x80ac58cd /* ERC721 */ || interfaceId == 0x01ffc9a7 /* ERC165 */;
    }

    // Small on-chain SVG. Replace with your own art; keep it short to limit gas.
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

    function tokenURI(uint256) public pure returns (string memory) {
        // Minimal JSON with image inlined as data URI
        return string(
            abi.encodePacked(
                'data:application/json,{',
                '\n  "name": "I Am Human",',
                '\n  "description": "Attested human on Self+Celo",',
                '\n  "image": "', _imageData(), '"',
                '\n}'
            )
        );
    }

    function balanceOf(address owner) external view override returns (uint256) {
        require(owner != address(0), "zero address");
        return _balanceOf[owner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _ownerOf[tokenId];
        require(owner != address(0), "not minted");
        return owner;
    }

    function getApproved(uint256 tokenId) external view override returns (address) {
        require(_ownerOf[tokenId] != address(0), "not minted");
        return _approvals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) external view override returns (bool) {
        return _operatorApproval[owner][operator];
    }

    // Soulbound: disallow approvals/transfers to keep minimal
    function approve(address, uint256) external override {
        revert("soulbound");
    }

    function setApprovalForAll(address, bool) external override {
        revert("soulbound");
    }

    function transferFrom(address, address, uint256) external override {
        revert("soulbound");
    }

    function safeTransferFrom(address, address, uint256) external override {
        revert("soulbound");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external override {
        revert("soulbound");
    }

    function mint() external {
        require(!minted[msg.sender], "already minted");
        minted[msg.sender] = true;
        uint256 tokenId = nextId++;
        _ownerOf[tokenId] = msg.sender;
        _balanceOf[msg.sender] += 1;
        emit Transfer(address(0), msg.sender, tokenId);
    }
}

