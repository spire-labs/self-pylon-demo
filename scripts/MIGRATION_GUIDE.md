# Human Appchain Migration Guide

This guide walks through the process of migrating HumanNFT contract state if the appchain (Pylon) state is reset. This includes exporting state before reset, redeploying contracts, re-importing state, and updating the frontend.

## Overview

When the Human appchain state is reset, you need to:
1. **Export** the current HumanNFT contract state (owners, tokenIds, nullifiers)
2. **Verify** the export is correct
3. **Redeploy** contracts on the new appchain instance
4. **Import/Seed** the exported state into the new contracts
5. **Verify** the import matches the export
6. **Rebuild** and **redeploy** the frontend with new contract addresses
7. **Update** the README with new addresses

## Prerequisites

- Access to the old Human appchain RPC (before reset)
- Access to the new Human appchain RPC (after reset)
- Deployer private key with funds on both chains
- Existing ProofOfHuman contract address on Celo (unchanged)
- `snapshot-human-nft.json` file location (or create new one)

## Step 1: Export Contract State (Before Reset)

Export the current HumanNFT contract state to a snapshot file:

```bash
# Set environment variables for the OLD appchain
export RPC_URL="https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc"
export HUMAN_NFT_ADDRESS=0x6DC93BEFC7311089B92A39242411ACd102A0F6f8  # OLD address

# Optional: Set output file (defaults to snapshot-human-nft.json in project root)
export OUT_FILE="./snapshot-human-nft.json"

# Run the snapshot script
node scripts/snapshot-human-nft.mjs
```

The script will:
- Query all `HumanVerified` events from the contract
- Extract owners, tokenIds, and nullifiers
- Organize data into batches (default: 200 entries per batch)
- Save to `snapshot-human-nft.json`

**Expected output:**
```
Snapshotting HumanVerified logs for 0x... from block 0 to 3730692...
Fetching logs for blocks 0-2000...
...
✅ Snapshot complete!
   - Total entries: 215
   - Batches: 2
   - Max token ID: 215
   - Duplicates: 0 tokenIds, 0 nullifiers
```

## Step 2: Verify the Export

Verify the snapshot file is correct and matches the contract state:

```bash
RPC_URL="https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc" \
HUMAN_NFT_ADDRESS=0x6DC93BEFC7311089B92A39242411ACd102A0F6f8 \
VERIFY_ONLY=1 \
VERIFY_NULLIFIERS=1 \
node scripts/snapshot-human-nft.mjs
```

**Expected output:**
```
Verification OK: 215 tokens checked in Xs.
```

**⚠️ Important:** Only proceed if verification shows **0 mismatches**. If there are mismatches, investigate and fix before proceeding.

## Step 3: Redeploy Contracts on New Appchain

After the appchain is reset, redeploy the contracts:

```bash
# Set environment variables
export SIGNER_PRIVATE_KEY=<your_private_key>
export PYLON_RPC_URL="https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc"
export PYLON_CHAIN_ID=2139
export PYLON_SETTLEMENT_PORT="0x0000000000000000000000000000000000000042"

# Use the EXISTING ProofOfHuman address on Celo (not redeploying this)
export PROOF_OF_HUMAN_ADDRESS=0x5E05a5CCf9fe3EC0a4b602A56381D685D0f711a8

# Deploy on Human appchain (deploys both SettlementForwardingProxy and HumanNFT)
pushd contracts
forge script script/DeployPylon.s.sol:DeployPylon \
  --rpc-url $PYLON_RPC_URL \
  --broadcast \
  --private-key $SIGNER_PRIVATE_KEY
popd

# Extract the deployed addresses
latest=$(find contracts/broadcast/DeployPylon.s.sol/$PYLON_CHAIN_ID -name "run-latest.json" -type f)

# Get SettlementForwardingProxy address
lowercase_proxy=$(jq -r '.transactions[] | select(.contractName=="SettlementForwardingProxy") | .contractAddress' "$latest")
export SETTLEMENT_FORWARDING_PROXY=$(cast to-check-sum-address $lowercase_proxy)
echo "SettlementForwardingProxy deployed at: $SETTLEMENT_FORWARDING_PROXY"

# Get HumanNFT address
lowercase_nft=$(jq -r '.transactions[] | select(.contractName=="HumanNFT") | .contractAddress' "$latest")
export HUMAN_NFT_ADDRESS=$(cast to-check-sum-address $lowercase_nft)
echo "HumanNFT deployed at: $HUMAN_NFT_ADDRESS"
```

**Save these addresses** - you'll need them for the frontend and README updates.

## Step 4: Import/Seed the Contract State

Import the exported state into the new contract:

```bash
# Set the seeding input file path (relative to contracts directory)
export SEED_INPUT="../snapshot-human-nft.json"

# Seed the mints (this will call seedMints for each batch)
pushd contracts
forge script script/SeedHumanNFT.s.sol:SeedHumanNFT \
  --rpc-url $PYLON_RPC_URL \
  --broadcast \
  --private-key $SIGNER_PRIVATE_KEY
popd
```

The script will:
- Read batches from `snapshot-human-nft.json`
- Call `seedMints(owners, tokenIds, nullifiers)` for each batch
- Update `nextId` to the maximum token ID + 1

## Step 5: Verify the Import

Verify the seeded data matches the snapshot before finalizing:

```bash
# Verify the snapshot against the NEW contract
RPC_URL=$PYLON_RPC_URL \
HUMAN_NFT_ADDRESS=$HUMAN_NFT_ADDRESS \
VERIFY_ONLY=1 \
node scripts/snapshot-human-nft.mjs
```

**Expected output:**
```
Verification OK: 215 tokens checked in Xs.
```

**⚠️ Critical:** Only proceed to finalize if verification shows **0 mismatches**. If there are mismatches, you may need to:
- Check for duplicate nullifiers
- Verify the snapshot file is correct
- Re-seed if necessary (but note: once a nullifier is used, it cannot be re-seeded)

## Step 6: Finalize the Seeding

After verification passes, finalize the seeding (this prevents further seeding):

```bash
# Finalize the seeding - use FINALIZE_ONLY=1 to skip the seeding loop
# This will only call completeSeeding() without trying to seed again
export FINALIZE_ONLY=1
export FINALIZE_SEEDING=1
pushd contracts
forge script script/SeedHumanNFT.s.sol:SeedHumanNFT \
  --rpc-url $PYLON_RPC_URL \
  --broadcast \
  --private-key $SIGNER_PRIVATE_KEY
popd
```

**Verify finalization:**
```bash
cast call $HUMAN_NFT_ADDRESS \
  "seedingComplete()(bool)" \
  --rpc-url $PYLON_RPC_URL
```

Should return: `true`

## Step 7: Update Frontend Configuration

Update the frontend `.env.local` file with the new contract address:

```bash
# Update the HumanNFT address in frontend/.env.local
sed -i '' "s/NEXT_PUBLIC_HUMAN_NFT_ADDRESS=.*/NEXT_PUBLIC_HUMAN_NFT_ADDRESS=$HUMAN_NFT_ADDRESS/" frontend/.env.local
```

**Verify the update:**
```bash
cat frontend/.env.local | grep NEXT_PUBLIC_HUMAN_NFT_ADDRESS
```

## Step 8: Rebuild the Frontend

Build the frontend with the updated contract addresses:

```bash
# Build the frontend for deployment
# ./scripts/build-frontend.sh

# OR for repository path deployment:
# NEXT_PUBLIC_BASE_PATH="/self-pylon-demo" ./scripts/build-frontend.sh

# for custom domain with CNAME:
GITHUB_PAGES_CUSTOM_DOMAIN="human.spire.dev" ./scripts/build-frontend.sh
```

## Step 9: Deploy to GitHub Pages

If deploying to GitHub Pages:

```bash
# Commit and push the built frontend
git add docs/
git commit -m "Deploy: Update frontend with new HumanNFT contract address after appchain migration"
git push origin main
```

The frontend will be available at:
- Custom domain: `https://your-custom-domain.com/` (if configured)
- Repository path: `https://yourusername.github.io/self-pylon-demo/` (if using basePath)

## Step 10: Update README

Update the README with the new contract addresses. Edit `README.md` section "0. Using Existing Deployment" (around lines 96-97):

**Update these values:**
- `SETTLEMENT_FORWARDING_PROXY` - New proxy address from Step 3
- `HUMAN_NFT_ADDRESS` - New NFT address from Step 3

**Keep these unchanged (Celo side):**
- `PROOF_OF_HUMAN_ADDRESS` - Still on Celo, unchanged
- `SELF_HUB_ADDRESS` - Unchanged
- `SELF_CONFIG_ID` - Unchanged
- `SELF_SCOPE` - Unchanged
- `PYLON_SETTLEMENT_PORT` - System contract, unchanged

## Final Verification

After completing all steps, verify everything is working:

```bash
# Verify contracts on Pylon
cast code $SETTLEMENT_FORWARDING_PROXY --rpc-url $PYLON_RPC_URL
cast code $HUMAN_NFT_ADDRESS --rpc-url $PYLON_RPC_URL

# Verify Settlement Port exists (should always exist)
cast code $PYLON_SETTLEMENT_PORT --rpc-url $PYLON_RPC_URL

# Check if seeding is complete
cast call $HUMAN_NFT_ADDRESS \
  "seedingComplete()(bool)" \
  --rpc-url $PYLON_RPC_URL

# Verify contract state matches snapshot
RPC_URL=$PYLON_RPC_URL \
HUMAN_NFT_ADDRESS=$HUMAN_NFT_ADDRESS \
VERIFY_ONLY=1 \
node scripts/snapshot-human-nft.mjs
```

## Troubleshooting

### "Nullifier already used" error during seeding

This means the nullifier was already seeded. Check:
- Did you run the seeding script multiple times?
- Is the snapshot file correct?
- Are there duplicate nullifiers in the snapshot?

**Solution:** If you need to re-seed, you'll need to deploy a fresh contract (nullifiers cannot be reused).

### Verification shows mismatches

If verification shows mismatches:
1. Check the snapshot file is from the correct contract
2. Verify the RPC URL is correct
3. Ensure the contract address is correct
4. Check if there were any issues during seeding

**Solution:** Do not finalize if there are mismatches. Investigate and fix first.

### Frontend not connecting to new contract

Check:
- `frontend/.env.local` has the correct `NEXT_PUBLIC_HUMAN_NFT_ADDRESS`
- Frontend was rebuilt after updating `.env.local`
- Browser cache cleared (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)

## Quick Reference

**Export state:**
```bash
RPC_URL=<old_rpc> HUMAN_NFT_ADDRESS=<old_address> node scripts/snapshot-human-nft.mjs
```

**Verify export:**
```bash
RPC_URL=<old_rpc> HUMAN_NFT_ADDRESS=<old_address> VERIFY_ONLY=1 node scripts/snapshot-human-nft.mjs
```

**Deploy contracts:**
```bash
forge script script/DeployPylon.s.sol:DeployPylon --rpc-url $PYLON_RPC_URL --broadcast --private-key $SIGNER_PRIVATE_KEY
```

**Seed state:**
```bash
SEED_INPUT="../snapshot-human-nft.json" forge script script/SeedHumanNFT.s.sol:SeedHumanNFT --rpc-url $PYLON_RPC_URL --broadcast --private-key $SIGNER_PRIVATE_KEY
```

**Verify import:**
```bash
RPC_URL=<new_rpc> HUMAN_NFT_ADDRESS=<new_address> VERIFY_ONLY=1 node scripts/snapshot-human-nft.mjs
```

**Finalize:**
```bash
FINALIZE_ONLY=1 FINALIZE_SEEDING=1 forge script script/SeedHumanNFT.s.sol:SeedHumanNFT --rpc-url $PYLON_RPC_URL --broadcast --private-key $SIGNER_PRIVATE_KEY
```

## Notes

- The snapshot file (`snapshot-human-nft.json`) should be committed to the repository for record-keeping
- Always verify exports and imports before finalizing
- Keep backups of snapshot files before appchain resets
- The Celo side (ProofOfHuman contract) is not affected by appchain resets
