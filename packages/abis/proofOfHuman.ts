export const ProofOfHumanABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'isVerified',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'addressToNullifier',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'nullifierToAddresses',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }]
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'verificationConfigId',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'getConfigId',
    inputs: [
      { name: '_destinationChainId', type: 'bytes32' },
      { name: '_userIdentifier', type: 'bytes32' },
      { name: '_userDefinedData', type: 'bytes' }
    ],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'setConfigId',
    inputs: [{ name: 'configId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'setScope',
    inputs: [{ name: 'newScope', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'event',
    name: 'VerificationCompleted',
    inputs: [
      { name: 'nullifier', type: 'uint256', indexed: true },
      { name: 'userAddress', type: 'address', indexed: true },
      { name: 'userIdentifier', type: 'bytes32', indexed: false }
    ],
    anonymous: false
  }
] as const;

