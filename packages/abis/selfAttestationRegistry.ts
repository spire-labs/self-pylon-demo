export const SelfAttestationRegistryABI = [
  {
    type: 'event',
    name: 'Attested',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'commitment', type: 'bytes32', indexed: false },
      { name: 'attributeSetId', type: 'uint256', indexed: false }
    ],
    anonymous: false
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'commitmentOf',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'submitProof',
    inputs: [
      { name: 'proof', type: 'bytes' },
      { name: 'publicSignals', type: 'uint256[]' },
      { name: 'commitment', type: 'bytes32' },
      { name: 'attributeSetId', type: 'uint256' }
    ],
    outputs: []
  }
] as const;

