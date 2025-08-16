# Self ↔ Pylon Demo

A fully on-chain, privacy-preserving identity attestation system using the Self protocol and Pylon appchain.

## Architecture

This system enables users to:
1. **Generate zero-knowledge proofs** for identity attributes using the Self mobile app
2. **Submit proofs on-chain** to Celo L2 via a frontend-initiated, wallet-signed transaction
3. **Claim "I am human" NFTs** on Pylon's appchain based on verified attestations
4. **Maintain privacy** - only cryptographic commitments and ZK proofs are stored on-chain

```mermaid
graph TD
    A[User scans QR code] --> B[Self app generates ZKP]
    B --> C[Frontend receives proof]
    C --> D[User signs transaction]
    D --> E[Proof verified on Celo L2]
    E --> F[Attestation stored on-chain]
    F --> G[Pylon appchain reads attestation]
    G --> H[User claims "I am human" NFT]
    
    I[Self Hub Contract] --> E
    J[ProofOfHuman Contract] --> F
    K[HumanNFT Contract] --> H
```

### Component Interactions

1. **QR Code Generation**: Frontend creates Self app QR code with specific scope and disclosures
2. **Proof Generation**: Self mobile app scans passport/ID and generates zero-knowledge proof
3. **Proof Submission**: Frontend receives proof and prompts user to submit on-chain transaction
4. **On-chain Verification**: Self Hub contract verifies the ZK proof meets requirements
5. **Attestation Storage**: ProofOfHuman contract stores verified human status
6. **Cross-chain Read**: Pylon appchain reads attestation data from Celo L2
7. **NFT Minting**: User claims "I am human" NFT with verified attestation

## Quick Start (Deploy-First Approach)

### 0. Using Existing Deployment (Optional)
If you want to use our existing deployment instead of deploying your own contracts, you can skip the deployment steps and use these pre-configured values:

```bash
# Core configuration
export SELF_HUB_ADDRESS=0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
export SELF_CONFIG_ID=0x7baf7f25b3fe0f6eacb06d67e319140996ad4dd54f00529abf3fea5095f06b72
export SELF_SCOPE=14512460194057449064845631405870909134609057302642515550058931165412051128987
export NEXT_PUBLIC_SELF_SCOPE="self-pylon-demo"

# Network configuration
export CELO_L2_RPC_URL=https://forno.celo.org
export CELO_L2_CHAIN_ID=42220
export PYLON_RPC_URL=https://pylon.celo-mainnet.spire.dev
export PYLON_CHAIN_ID=2139

# Contract addresses (running for the first time you can get these from deployment files)
export PROOF_OF_HUMAN_ADDRESS=0x5234cc99A4197525b8550E17d02b25F0D00D10B9

# @todo need to deploy
latest_pylon=$(find contracts/broadcast/DeployPylon.s.sol/2139 -name "run-latest.json" -type f)
export HUMAN_NFT_ADDRESS=$(jq -r '.transactions[] | select(.contractName=="HumanNFT") | .contractAddress' "$latest_pylon")
```

**Note:** The existing deployment already has the scope and configId configured on the ProofOfHuman contract so those steps can be skipped if using the existing deployment as well.

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set RPC Environment Variables
```bash
# Celo mainnet
export CELO_L2_RPC_URL="https://forno.celo.org"
export CELO_L2_CHAIN_ID=42220

# Pylon appchain
export PYLON_RPC_URL="https://pylon.celo-mainnet.spire.dev"
export PYLON_CHAIN_ID=2139

# Self Hub contract address (this is the official Self contract)
export SELF_HUB_ADDRESS=0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
```

### 3. Generate Self Configuration
You need to use the Self web tool to generate your verification configuration and scope. This cannot be done via CLI.

**Steps:**
1. Visit [Self's configuration interface](https://app.self.xyz/configure)
2. Set your verification requirements:
   - Minimum age: 18
   - Enable OFAC 1 and OFAC 2 sanctions checks
   - Submit to get your `configId`
3. Generate a scope seed (this will be used as `NEXT_PUBLIC_SELF_SCOPE` in your frontend)
4. Set the actual scope value on your contract (this is the numeric scope, not the seed)

**Important:** The `NEXT_PUBLIC_SELF_SCOPE` environment variable in your frontend should be set to the scope seed (a string like "self-pylon-demo"), while the `scope` parameter you set on your contract should be the numeric scope value returned by the Self tool.

**Example values from our deployment:**
```bash
# Config ID from Self web tool
export SELF_CONFIG_ID=0x7baf7f25b3fe0f6eacb06d67e319140996ad4dd54f00529abf3fea5095f06b72

# Scope seed for frontend (this is what users see in the QR code)
export NEXT_PUBLIC_SELF_SCOPE="self-pylon-demo"

# Numeric scope for contract (this is what gets set on-chain)
export SELF_SCOPE=14512460194057449064845631405870909134609057302642515550058931165412051128987
```

### 4. Configure Self Hub Contract On-Chain
After generating the configuration, you need to set it on Self's Hub contract. You can do this via terminal or through their UI if you have a browser wallet with funds:

**Terminal Method:**
```bash
# Set verification configuration on Self's Hub contract
cast send 0xe57f4773bd9c9d8b6cd70431117d353298b9f5bf \
"setVerificationConfigV2((bool,uint256,bool,uint256[4],bool[3]))" \
"(true,18,false,[0,0,0,0],[true,true,false])" \
--rpc-url $CELO_L2_RPC_URL \
--private-key $SIGNER_PRIVATE_KEY

# Parameter breakdown:
# config.olderThanEnabled: true (enable age verification)
# config.olderThan: 18 (minimum age requirement)
# config.forbiddenCountriesEnabled: false (disable country restrictions)
# config.forbiddenCountriesListPacked: [0,0,0,0] (no forbidden countries)
# config.ofacEnabled: [true,true,false] (enable OFAC 1 & 2, disable OFAC 3)
```

**UI Method:**
- Visit Self's configuration interface
- Set minimum age to 18
- Enable OFAC 1 and OFAC 2 checks
- Submit the transaction with your browser wallet

### 5. Set Up Deployer Account
```bash
# Generate a new private key for deployment
export SIGNER_PRIVATE_KEY=$(cast wallet new)


```

### 6. Deploy ProofOfHuman Contract (Hub-Root Pattern)

**⚠️ CRITICAL: Address Casing Matters for Self Scope Calculation**

Self's proof system is case-sensitive for contract addresses. The scope calculation includes the contract address, and if the casing doesn't match between proof generation and verification, you'll get a `ScopeMismatch` error.

**Foundry's `run-latest.json` always provides lowercase addresses, but you need the checksummed version for Self.**

**Note:** If you're using our existing deployment, you can skip this step and use the existing contract address:
```bash
export PROOF_OF_HUMAN_ADDRESS=0x5234cc99A4197525b8550E17d02b25F0D00D10B9
```

If you need to deploy your own contract:
```bash
forge script script/DeployHubRoot.s.sol:DeployHubRoot --rpc-url $CELO_L2_RPC_URL --broadcast --verify


# 1. Get the lowercase address from Foundry
latest=$(find contracts/broadcast/DeployHubRoot.s.sol/42220 -name "run-latest.json" -type f)
lowercase_addr=$(jq -r '.transactions[] | select(.contractName=="ProofOfHuman") | .contractAddress' "$latest")
# 
# 2. Convert to checksummed address for Self
# ⚠️ IMPORTANT: Get the checksummed address for Self scope calculation
# Foundry provides lowercase addresses, but Self needs the exact casing
export PROOF_OF_HUMAN_ADDRESS=$(cast to-check-sum-address $lowercase_addr)
echo "ProofOfHuman deployed at: $PROOF_OF_HUMAN_ADDRESS"
```

### 7. Set Scope and ConfigId on ProofOfHuman

**Note:** If you're using our existing deployment, these values are already set and you can skip this step. You can verify them:
```bash
# Check current values
cast call $PROOF_OF_HUMAN_ADDRESS "scope()" --rpc-url $CELO_L2_RPC_URL
cast call $PROOF_OF_HUMAN_ADDRESS "configId()" --rpc-url $CELO_L2_RPC_URL
```

If you need to set these values on your own contract:
```bash
# Get the configId from the previous transaction
export SELF_CONFIG_ID="0x..." # Use the configId returned from setVerificationConfigV2

# Set the scope and configId on your ProofOfHuman contract
cast send $PROOF_OF_HUMAN_ADDRESS \
"setScope(uint256)" \
"$SELF_SCOPE" \
--rpc-url $CELO_L2_RPC_URL \
--private-key $SIGNER_PRIVATE_KEY

cast send $PROOF_OF_HUMAN_ADDRESS \
"setConfigId(bytes32)" \
"$SELF_CONFIG_ID" \
--rpc-url $CELO_L2_RPC_URL \
--private-key $SIGNER_PRIVATE_KEY
```

### 8. Deploy HumanNFT Contract

**Note:** If you're using our existing deployment, you can skip this step and use the existing contract address:
```bash
# Get the latest deployment run
latest=$(find contracts/broadcast/DeployPylon.s.sol/2139 -name "run-latest.json" -type f)
export HUMAN_NFT_ADDRESS=$(jq -r '.transactions[] | select(.contractName=="HumanNFT") | .contractAddress' "$latest")
```

If you need to deploy your own contract:
```bash
forge script script/DeployPylon.s.sol:DeployPylon --rpc-url $PYLON_RPC_URL --broadcast --verify

# 1. Get the lowercase address from Foundry
latest=$(find contracts/broadcast/DeployPylon.s.sol/2139 -name "run-latest.json" -type f)
lowercase_addr=$(jq -r '.transactions[] | select(.contractName=="HumanNFT") | .contractAddress' "$latest")

# 2. Convert to checksummed address (for consistency, though not required for scope)
export HUMAN_NFT_ADDRESS=$(cast to-check-sum-address $lowercase_addr)
echo "HumanNFT deployed at: $HUMAN_NFT_ADDRESS"
```

### 9. Configure Frontend Environment
```bash
# Generate .env.local files from environment variables
# Note: NEXT_PUBLIC_SELF_SCOPE should be the scope seed (string), not the numeric scope
cat > apps/attest-web/.env.local << EOF
NEXT_PUBLIC_CELO_L2_RPC_URL=$CELO_L2_RPC_URL
NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS=$PROOF_OF_HUMAN_ADDRESS
NEXT_PUBLIC_SELF_SCOPE=$NEXT_PUBLIC_SELF_SCOPE
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
EOF

cat > apps/claim-web/.env.local << EOF
NEXT_PUBLIC_CELO_L2_RPC_URL=$CELO_L2_RPC_URL
NEXT_PUBLIC_PYLON_RPC_URL=$PYLON_RPC_URL
NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS=$PROOF_OF_HUMAN_ADDRESS
NEXT_PUBLIC_HUMAN_NFT_ADDRESS=$HUMAN_NFT_ADDRESS
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
EOF
```

### 10. Build Static Sites
```bash
pnpm --filter attest-web build
pnpm --filter claim-web build
```

## Local Development

### Run Apps Locally
```bash
# Start attest-web
cd apps/attest-web && pnpm dev

# Start claim-web (in another terminal)
cd apps/claim-web && pnpm dev
```

### Test Complete Flow
1. **Generate QR Code**: Visit attest-web and scan QR with Self app
2. **Create Proof**: Use mock passport in Self app to generate ZK proof
3. **Submit Proof**: Frontend receives proof and prompts for on-chain submission
4. **Verify Attestation**: Check that `verifiedHumans(address)` returns `true`
5. **Claim NFT**: Visit claim-web and mint "I am human" NFT

## Troubleshooting

### ScopeMismatch Error

If you encounter a `ScopeMismatch` error when submitting proofs, this is almost always caused by **address casing mismatch**:

**Symptoms:**
- Error: `ScopeMismatch: scope in header doesn't match scope in proof`
- Proof generation works, but contract submission fails

**Root Cause:**
Self's scope calculation is case-sensitive and includes the contract address. If the address casing doesn't match between:
- **Proof generation** (what Self app uses)
- **Contract submission** (what your frontend sends)

**Solution:**
1. **Use checksummed addresses**: Always use `cast to-checksum-address` to get the correct casing
2. **Check environment variables**: Ensure `NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS` uses the checksummed address
3. **Verify consistency**: The address in your frontend must exactly match what was used during proof generation

**Example:**
```bash
# ❌ Wrong - lowercase address from Foundry
export PROOF_OF_HUMAN_ADDRESS=0x5234cc99a4197525b8550e17d02b25f0d00d10b9

# ✅ Correct - checksummed address for Self
export PROOF_OF_HUMAN_ADDRESS=$(cast to-check-sum-address 0x5234cc99a4197525b8550e17d02b25f0d00d10b9)
```

## Technical Details