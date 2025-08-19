export const HumanNFTABI = [
  // Standard ERC721 functions from OpenZeppelin
  { type: 'function', stateMutability: 'view', name: 'name', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', stateMutability: 'view', name: 'symbol', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', stateMutability: 'view', name: 'balanceOf', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'ownerOf', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', stateMutability: 'view', name: 'tokenURI', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', stateMutability: 'view', name: 'supportsInterface', inputs: [{ name: 'interfaceId', type: 'bytes4' }], outputs: [{ name: '', type: 'bool' }] },
  
  // Custom nullifier-based functions
  { type: 'function', stateMutability: 'view', name: 'nullifierMinted', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', stateMutability: 'view', name: 'isNullifierMinted', inputs: [{ name: 'nullifier', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', stateMutability: 'view', name: 'getNullifierForAddress', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'proofOfHumanContract', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', stateMutability: 'view', name: 'nextId', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  
  // Admin functions
  { type: 'function', stateMutability: 'nonpayable', name: 'mint', inputs: [], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setProofOfHumanContract', inputs: [{ name: '_proofOfHumanContract', type: 'address' }], outputs: [] },
  { type: 'function', stateMutability: 'view', name: 'owner', inputs: [], outputs: [{ name: '', type: 'address' }] },
  
  // Soulbound transfer functions (all revert)
  { type: 'function', stateMutability: 'nonpayable', name: 'transferFrom', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'safeTransferFrom', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'safeTransferFrom', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'approve', inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setApprovalForAll', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { type: 'function', stateMutability: 'view', name: 'getApproved', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', stateMutability: 'view', name: 'isApprovedForAll', inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  
  // Events
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'approved', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ApprovalForAll',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'operator', type: 'address', indexed: true },
      { name: 'approved', type: 'bool', indexed: false }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ProofOfHumanContractUpdated',
    inputs: [
      { name: 'oldContract', type: 'address', indexed: true },
      { name: 'newContract', type: 'address', indexed: true }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'HumanVerified',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'nullifier', type: 'uint256', indexed: false }
    ],
    anonymous: false
  }
] as const;

