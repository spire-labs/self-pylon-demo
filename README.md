# Self ↔ Pylon Demo

A fully on-chain, privacy-preserving identity attestation system using the Self protocol and Pylon appchain with **true cross-chain architecture**.

### Test the Complete Flow

1. **Connect Wallet (Celo)**: Connect your wallet to Celo mainnet
2. **Generate Signature**: Sign a message to prove address ownership
3. **Scan QR Code**: Use Self app to scan passport and generate proof
4. **Automatic Submission**: Self automatically submits proof to ProofOfHuman contract **on Celo mainnet**
5. **ProofOfHuman**: Binds your wallet address to your passport without revealing passport details
6. **Switch to Pylon**: Connect to the Pylon appchain
7. **Claim NFT**: Visit claim-web on Pylon appchain and mint the "I am human" NFT
8. **Cross-Chain Verification**: The HumanNFT contract on Pylon reads your attestation from Celo via Pylon's settlement mechanism

## Architecture

This system enables:
1. **Users to Maintain privacy** - only cryptographic commitments and ZK proofs are stored on-chain
2. **App devs to defend against sybil attacks** - NFTs can only be claimed once per passport
3. **Celo to act as a user identity hub** - Celo's network effects expand their reach making it a more attractive deployment target
4. **True cross-chain composability** - Pylon appchain reads Celo state synchronously via settlement

```mermaid
graph TD
    U[User]:::userLayer
    AW[attest-web on Celo]:::serviceLayer
    CW[claim-web on Pylon]:::serviceLayer
    SA[Self Mobile App]:::externalLayer
    
    subgraph Celo["🌍 Celo Mainnet"]
        SH[Self Hub Contract]:::contractLayer
        PH[ProofOfHuman Contract]:::contractLayer
    end
    
    subgraph Pylon["⚡ Pylon Appchain"]
        SP[Settlement Port]:::pylonLayer
        PROXY[SettlementForwardingProxy]:::pylonLayer
        HN[HumanNFT Contract]:::contractLayer
    end
    
    U -->|1- Connect & Sign| AW
    AW -->|2- Display QR| AW
    U -->|3- Scan QR| SA
    SA -->|4- Submit ZK Proof| SH
    SH -->|5- Verify & Store| PH
    U -->|6- Switch Network & Mint| CW
    CW -->|7- Mint Request| HN
    HN -->|8- Read Attestation| PROXY
    PROXY -->|9- Settlement Read| SP
    SP -.->|10- Cross-chain Read| PH
    PH -.->|11- Return Data| SP
    SP -->|12- Return Result| PROXY
    PROXY -->|13- Verify Success| HN
    HN -->|14- Mint NFT| HN
    
    %% Styling
    classDef userLayer fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#0d47a1
    classDef serviceLayer fill:#fff8e1,stroke:#f57f17,stroke-width:2px,color:#e65100
    classDef externalLayer fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#880e4f
    classDef contractLayer fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#1b5e20
    classDef pylonLayer fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c
```

## 0. Using Existing Deployment

### Quick Start with Pre-deployed Contracts

If you want to use our existing deployment instead of deploying your own contracts:

```bash
# Install dependencies
pnpm install

# Set environment variables for existing deployment
export SELF_HUB_ADDRESS=0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
export SELF_CONFIG_ID=0x7baf7f25b3fe0f6eacb06d67e319140996ad4dd54f00529abf3fea5095f06b72
export SELF_SCOPE=18357982425819932074273780827128310208012362272222002103953286134929761147025
export NEXT_PUBLIC_SELF_SCOPE="self-pylon-demo"

# Celo mainnet configuration
export CELO_RPC_URL=https://forno.celo.org
export CELO_CHAIN_ID=42220
export PROOF_OF_HUMAN_ADDRESS=0x5E05a5CCf9fe3EC0a4b602A56381D685D0f711a8

# Pylon appchain configuration
export PYLON_RPC_URL=https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc
export PYLON_CHAIN_ID=2139
export PYLON_SETTLEMENT_PORT=0x0000000000000000000000000000000000000042
# Celo contract address
# export HUMAN_NFT_ADDRESS=0xE95515970B457130B5D891666e02ABBA49c84448
# Pylon contract address
export HUMAN_NFT_ADDRESS=0xF54a6f384d88afB9c9b48fa9979BBdf445B8eC6D

# Configure attest-web (Celo mainnet)
cat > apps/attest-web/.env.local << EOF
NEXT_PUBLIC_CELO_RPC_URL=$CELO_RPC_URL
NEXT_PUBLIC_CELO_CHAIN_ID=$CELO_CHAIN_ID
NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS=$PROOF_OF_HUMAN_ADDRESS
NEXT_PUBLIC_SELF_SCOPE=$NEXT_PUBLIC_SELF_SCOPE
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
EOF

# Configure claim-web (Pylon appchain)
cat > apps/claim-web/.env.local << EOF
NEXT_PUBLIC_PYLON_RPC_URL=$PYLON_RPC_URL
NEXT_PUBLIC_PYLON_CHAIN_ID=$PYLON_CHAIN_ID
NEXT_PUBLIC_HUMAN_NFT_ADDRESS=$HUMAN_NFT_ADDRESS
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
EOF

# Start both apps simultaneously
pnpm --parallel --filter attest-web --filter claim-web dev
```

**Note**: The existing deployment uses the cross-chain architecture where attestations are on Celo and claims happen on Pylon via settlement.


## 1. Deploying the Project

### Prerequisites

```bash
# Install dependencies
pnpm install

# Generate deployer private key
export SIGNER_PRIVATE_KEY=$(cast wallet new | grep "Private key:" | cut -d: -f2 | tr -d ' ')

# Get the public address from the private key
export SIGNER_ADDRESS=$(cast wallet address --private-key $SIGNER_PRIVATE_KEY)

echo "Private key: $SIGNER_PRIVATE_KEY"
echo "Address: $SIGNER_ADDRESS"

# Ensure account has funds for deployment gas fees
```

### Network Configuration

```bash
# Celo mainnet - where attestations are stored
export CELO_RPC_URL="https://forno.celo.org"
export CELO_CHAIN_ID=42220

# Pylon appchain - where claims happen
export PYLON_RPC_URL="https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc"
export PYLON_CHAIN_ID=2139

# Pylon settlement port - enables cross-chain reads from Celo
# This is a fixed address on all Pylon chains
export PYLON_SETTLEMENT_PORT="0x0000000000000000000000000000000000000042"

# Self Hub contract (official Self contract on Celo)
export SELF_HUB_ADDRESS=0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
```

**Verify Configuration**:
```bash
# Check Celo connectivity
cast block-number --rpc-url $CELO_RPC_URL

# Check Pylon connectivity and verify chain ID
cast block-number --rpc-url $PYLON_RPC_URL
cast chain-id --rpc-url $PYLON_RPC_URL  # Should return: 2139

# Verify settlement port contract exists
cast code $PYLON_SETTLEMENT_PORT --rpc-url $PYLON_RPC_URL

# Verify Pylon is synced with Celo
curl -s https://pylon.celo-mainnet.spire.dev/_status/ready | jq
```

## 2. ProofOfHuman Setup

### 2a. Using Existing Deployment

Skip to section 3 if using our existing ProofOfHuman contract.

### 2b. Deploying ProofOfHuman for First Time

#### Generate Self Configuration

1. Visit [Self's configuration interface](https://app.self.xyz/configure)
2. Set verification requirements:
   - Minimum age: 18
   - Enable OFAC 1 and OFAC 2 sanctions checks
3. Submit to get your `configId`
4. Generate a scope seed for frontend

The Self configuration tool will:
- Deploy a new configuration if one doesn't exist for your chosen settings
- Provide you with a `configId` (bytes32) and `scope` (uint256)
- Allow you to customize verification parameters through the UI

**Note**: If you prefer to deploy the configuration from the terminal instead of the UI, you can use the CLI instead.

```bash
# After using the Self configuration tool, set the generated values
# Replace these with the actual values from your Self configuration
export SELF_CONFIG_ID=<your_generated_config_id>
export NEXT_PUBLIC_SELF_SCOPE="<your_scope_seed>"
export SELF_SCOPE=<your_generated_scope_value>

# Example of what these might look like:
# export SELF_CONFIG_ID=0x7baf7f25b3fe0f6eacb06d67e319140996ad4dd54f00529abf3fea5095f06b72
# export NEXT_PUBLIC_SELF_SCOPE="my-custom-demo"
# export SELF_SCOPE=6477103330237602230352812949141264605456698243037569300666502678848111318328
```

#### Configure Self Hub Contract

```bash
# Set verification configuration on Self's Hub contract on Celo
cast send $SELF_HUB_ADDRESS \
"setVerificationConfigV2((bool,uint256,bool,uint256[4],bool[3]))" \
"(true,18,false,[0,0,0,0],[true,true,false])" \
--rpc-url $CELO_RPC_URL \
--private-key $SIGNER_PRIVATE_KEY

# Parameter breakdown:
# config.olderThanEnabled: true (enable age verification)
# config.olderThan: 18 (minimum age requirement)
# config.forbiddenCountriesEnabled: false (disable country restrictions)
# config.forbiddenCountriesListPacked: [0,0,0,0] (no forbidden countries)
# config.ofacEnabled: [true,true,false] (enable OFAC 1 & 2, disable OFAC 3)
```

#### Deploy ProofOfHuman Contract

```bash
# Deploy the contract on Celo mainnet
pushd contracts
forge script script/DeployHubRoot.s.sol:DeployHubRoot \
  --rpc-url $CELO_RPC_URL \
  --broadcast \
  --private-key $SIGNER_PRIVATE_KEY
popd

# Get the deployed address
latest=$(find contracts/broadcast/DeployHubRoot.s.sol/$CELO_CHAIN_ID -name "run-latest.json" -type f)
lowercase_addr=$(jq -r '.transactions[] | select(.contractName=="ProofOfHuman") | .contractAddress' "$latest")
export PROOF_OF_HUMAN_ADDRESS=$(cast to-check-sum-address $lowercase_addr)
echo "ProofOfHuman deployed on Celo at: $PROOF_OF_HUMAN_ADDRESS"
```

#### Set Scope and ConfigId

```bash
# Set the scope and configId on your ProofOfHuman contract on Celo
cast send $PROOF_OF_HUMAN_ADDRESS \
"setScope(uint256)" \
"$SELF_SCOPE" \
--rpc-url $CELO_RPC_URL \
--private-key $SIGNER_PRIVATE_KEY

cast send $PROOF_OF_HUMAN_ADDRESS \
"setConfigId(bytes32)" \
"$SELF_CONFIG_ID" \
--rpc-url $CELO_RPC_URL \
--private-key $SIGNER_PRIVATE_KEY
```

## 3. HumanNFT Setup on Pylon

### 3a. Using Existing Deployment

Skip to section 4 if using our existing HumanNFT contract.

### 3b. Deploying HumanNFT for First Time

**Important**: This deployment creates both the SettlementForwardingProxy and HumanNFT on Pylon. The proxy enables cross-chain reads from Celo as if the app were deployed directly on the settlement chain.

```bash
# Set the settlement port address (fixed address on all Pylon chains)
export PYLON_SETTLEMENT_PORT="0x0000000000000000000000000000000000000042"

# Deploy on Pylon appchain (deploys both SettlementForwardingProxy and HumanNFT)
pushd contracts
forge script script/DeployPylon.s.sol:DeployPylon \
  --rpc-url $PYLON_RPC_URL \
  --broadcast \
  --private-key $SIGNER_PRIVATE_KEY
popd

# Get the deployed addresses
latest=$(find contracts/broadcast/DeployPylon.s.sol/$PYLON_CHAIN_ID -name "run-latest.json" -type f)

# Get SettlementForwardingProxy address
lowercase_proxy=$(jq -r '.transactions[] | select(.contractName=="SettlementForwardingProxy") | .contractAddress' "$latest")
export PROOF_OF_HUMAN_PROXY=$(cast to-check-sum-address $lowercase_proxy)
echo "SettlementForwardingProxy deployed on Pylon at: $PROOF_OF_HUMAN_PROXY"

# Get HumanNFT address
lowercase_nft=$(jq -r '.transactions[] | select(.contractName=="HumanNFT") | .contractAddress' "$latest")
export HUMAN_NFT_ADDRESS=$(cast to-check-sum-address $lowercase_nft)
echo "HumanNFT deployed on Pylon at: $HUMAN_NFT_ADDRESS"
echo ""
echo "✅ Cross-chain setup complete!"
echo "   - Attestations are stored on Celo: $PROOF_OF_HUMAN_ADDRESS"
echo "   - Claims happen on Pylon: $HUMAN_NFT_ADDRESS"
echo "   - Settlement proxy on Pylon: $PROOF_OF_HUMAN_PROXY"
```

## 4. Configure Frontend

```bash
# Configure attest-web (runs on Celo mainnet)
cat > apps/attest-web/.env.local << EOF
NEXT_PUBLIC_CELO_RPC_URL=$CELO_RPC_URL
NEXT_PUBLIC_CELO_CHAIN_ID=$CELO_CHAIN_ID
NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS=$PROOF_OF_HUMAN_ADDRESS
NEXT_PUBLIC_SELF_SCOPE=$NEXT_PUBLIC_SELF_SCOPE
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
EOF

# Configure claim-web (runs on Pylon appchain)
cat > apps/claim-web/.env.local << EOF
NEXT_PUBLIC_PYLON_RPC_URL=$PYLON_RPC_URL
NEXT_PUBLIC_PYLON_CHAIN_ID=$PYLON_CHAIN_ID
NEXT_PUBLIC_HUMAN_NFT_ADDRESS=$HUMAN_NFT_ADDRESS
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
EOF

echo "✅ Frontend configured!"
echo "   - attest-web connects to Celo mainnet (chain $CELO_CHAIN_ID)"
echo "   - claim-web connects to Pylon appchain (chain $PYLON_CHAIN_ID)"

# Build static sites
pnpm --filter attest-web build
pnpm --filter claim-web build
```

## 5. Run the Project

```bash
# Option 1: Start both apps simultaneously using pnpm parallel execution
pnpm --parallel --filter attest-web --filter claim-web dev

# Option 2: Start them in separate terminals (recommended for development)
# Terminal 1: attest-web
pnpm --filter attest-web dev

# Terminal 2: claim-web  
pnpm --filter claim-web dev

# Option 3: Use tmux/screen to manage multiple terminals
# tmux new-session -d -s demo
# tmux send-keys -t demo:0 "pnpm --filter attest-web dev" Enter
# tmux split-window -h
# tmux send-keys -t demo:1 "pnpm --filter claim-web dev" Enter
# tmux attach-session -t demo
```

## Important Notes

### Cross-Chain Architecture

This demo uses **Pylon's settlement mechanism** for synchronous cross-chain reads:

1. **ProofOfHuman on Celo**: Stores attestations on Celo mainnet
2. **SettlementForwardingProxy on Pylon**: Deployed on Pylon, forwards calls to Settlement Port
3. **Settlement Port on Pylon**: Fixed address `0x0000000000000000000000000000000000000042` - reads state from Celo synchronously
4. **HumanNFT on Pylon**: Uses the proxy to verify attestations during minting

The beauty of this architecture is that from the HumanNFT contract's perspective, it's just calling a local contract (the proxy), but the data is actually being read from Celo in real-time!

**Pylon Network Status**: You can verify the Pylon network is operational at [https://pylon.celo-mainnet.spire.dev/_status/ready](https://pylon.celo-mainnet.spire.dev/_status/ready)

### Address Casing for Self Protocol

⚠️ **CRITICAL**: Self's proof system is case-sensitive for contract addresses. Always use checksummed addresses:

```bash
# ❌ Wrong - lowercase address from Foundry
export PROOF_OF_HUMAN_ADDRESS=0xf3d2672c6321311e4e7606fb081e59a08c43abad

# ✅ Correct - checksummed address for Self
export PROOF_OF_HUMAN_ADDRESS=$(cast to-check-sum-address 0xf3d2672c6321311e4e7606fb081e59a08c43abad)
```

## Troubleshooting

### ScopeMismatch Error

**Symptoms**: `ScopeMismatch: scope in header doesn't match scope in proof`

**Solution**: Ensure you have set the Scope on the ProofOfHuman contract and that the casing matches between the frontend and contract deployment.

### Signature Generation Issues

**Solutions**:
1. Ensure wallet is connected and address is available
2. Check wallet permissions for message signing
3. Verify network connection
4. Refresh page if wallet state gets stuck

### Minting Issues

**If minting fails, check**:
1. **Attestation completed on Celo**: Complete the attestation process using attest-web first
2. **Connected to correct network**: Ensure your wallet is connected to Pylon (chain ID 2139)
3. **Settlement proxy deployed**: The SettlementForwardingProxy must be deployed on Pylon
4. **Cross-chain read working**: The settlement mechanism must be able to read from Celo

**Debug Steps**:
```bash
# Check environment variables
echo "HumanNFT Address (Pylon): $HUMAN_NFT_ADDRESS"
echo "ProofOfHuman Address (Celo): $PROOF_OF_HUMAN_ADDRESS"
echo "Pylon RPC: $PYLON_RPC_URL"
echo "Celo RPC: $CELO_RPC_URL"

# Verify contracts exist
echo "Checking HumanNFT on Pylon..."
cast code $HUMAN_NFT_ADDRESS --rpc-url $PYLON_RPC_URL

echo "Checking ProofOfHuman on Celo..."
cast code $PROOF_OF_HUMAN_ADDRESS --rpc-url $CELO_RPC_URL

# Check if address is attested on Celo
cast call $PROOF_OF_HUMAN_ADDRESS \
  "addressToNullifier(address)(uint256)" \
  <your_address> \
  --rpc-url $CELO_RPC_URL
```

**Solutions**:
1. **Complete attestation first**: Use attest-web on Celo to generate and submit proof
2. **Switch to Pylon network**: In your wallet, add and switch to Pylon chain (2139)
3. **Verify settlement setup**: Ensure `PYLON_SETTLEMENT_PORT` is set correctly
4. **Check proxy configuration**: The HumanNFT should point to the SettlementForwardingProxy

### Cross-Chain Read Issues

**If the settlement read fails**:
1. **Settlement Port address**: Should be `0x0000000000000000000000000000000000000042` (fixed address)
2. **Network connectivity**: Ensure both Celo and Pylon RPCs are accessible
3. **Contract addresses**: Verify ProofOfHuman address is correctly set in the proxy
4. **Pylon status**: Check [https://pylon.celo-mainnet.spire.dev/_status/ready](https://pylon.celo-mainnet.spire.dev/_status/ready) to verify Pylon is operational
