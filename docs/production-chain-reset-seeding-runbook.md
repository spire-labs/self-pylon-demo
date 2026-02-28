# Production Runbook: Appchain Reset + HumanNFT Migration via Seeding

This runbook covers the scenario where the **Pylon appchain chain state is reset** (PVC wipe / fresh genesis), but we still need the HumanNFT app to behave as if nothing happened by **migrating the historical NFT state** (owners + nullifier usage) using the `HumanNFT.seedMints(...)` “seeding” mechanism.

Assumptions:
- Celo mainnet state is **not** reset; the `ProofOfHuman` contract on Celo remains the source of truth for `(address -> nullifier)`.
- The appchain exposes crosschain reads via the **AppchainPort preinstall** at `0x0000000000000000000000000000000000000043` (method: `crosschainRead(address,bytes)`).
- `HumanNFT` is deployed deterministically (CREATE2 factory preinstall at `0x4e59b44847b379578588920cA78FbF26c0B4956C`) so redeploys after resets land at the same addresses.

---

## 0) Collect inputs (source of truth)

```bash
export PYLON_RPC_URL="https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc"
export PYLON_CHAIN_ID=2139
export CELO_RPC_URL="https://forno.celo.org"
export CELO_CHAIN_ID=42220

export PYLON_APPCHAIN_PORT="0x0000000000000000000000000000000000000043"
export PROOF_OF_HUMAN_ADDRESS="0x5E05a5CCf9fe3EC0a4b602A56381D685D0f711a8"

# Pre-reset HumanNFT address (old chain)
export OLD_HUMAN_NFT_ADDRESS="<fill_me>"

# Ops key used to deploy + seed on the new chain
export SIGNER_PRIVATE_KEY="<0x...>"
export HUMAN_NFT_OWNER="<0x...address-of-that-key>"
```

Sanity checks:
```bash
cast chain-id --rpc-url "$PYLON_RPC_URL"   # expect 2139
cast code "$PYLON_APPCHAIN_PORT" --rpc-url "$PYLON_RPC_URL" | head -c 20
cast code "$PROOF_OF_HUMAN_ADDRESS" --rpc-url "$CELO_RPC_URL" | head -c 20
```

---

## 1) Snapshot old HumanNFT state (before reset)

From `self-pylon-demo/`:

```bash
cd self-pylon-demo

# IMPORTANT:
# If the current chain state was ever restored via "seeding" (common after a reset),
# most historical mints will NOT exist as `HumanVerified` logs (seeding does not emit them).
# In that case, you must merge the previous seeding snapshot + the new on-chain mints.
#
# Use the last seeding snapshot as your BASE_SNAPSHOT. If you don't have a newer one yet,
# the repo ships with an initial baseline at `self-pylon-demo/snapshot-human-nft.json`.
export BASE_SNAPSHOT="$(pwd)/snapshot-human-nft.json"

PYLON_RPC_URL="$PYLON_RPC_URL" \
HUMAN_NFT_ADDRESS="$OLD_HUMAN_NFT_ADDRESS" \
CELO_RPC_URL="$CELO_RPC_URL" \
PROOF_OF_HUMAN_ADDRESS="$PROOF_OF_HUMAN_ADDRESS" \
BASE_SNAPSHOT="$BASE_SNAPSHOT" \
OUT_FILE="snapshot-human-nft.$(date +%Y%m%dT%H%M%S).json" \
./scripts/run-human-nft-snapshot.sh
```

What must be true before proceeding:
- The script completes without error.
- The snapshot is stored durably (treat it like production data) and becomes the new BASE_SNAPSHOT next time.

---

## 2) Stop the appchain and wipe state (reset)

This is the destructive step. The point is to force a *fresh* appchain from genesis.

### 2a) Stop writes (avoid snapshot drift)
As soon as the snapshot is taken, stop the appchain so no additional `HumanVerified` events can land after your snapshot:

```bash
export AWS_PROFILE=spire-admin
export KUBECONFIG=/Users/work/.kube/eks-prod-use1

# Inspect current config (example from production)
kubectl -n pylon get sts/pylon-celo-mainnet-prod -o yaml > /tmp/pylon-celo-mainnet-prod.sts.yaml

# Scale down to halt block production
kubectl -n pylon scale sts/pylon-celo-mainnet-prod --replicas=0
kubectl -n pylon rollout status sts/pylon-celo-mainnet-prod
```

### 2b) Wipe appchain state
Identify the PVCs backing the StatefulSet:

```bash
kubectl -n pylon get pvc | rg "pylon-celo-mainnet-prod"
```

Delete the data PVCs (names depend on `volumeClaimTemplates`, but will typically look like):
- `appchain-data-pylon-celo-mainnet-prod-0`
- `chainsync-data-pylon-celo-mainnet-prod-0`

```bash
kubectl -n pylon delete pvc appchain-data-pylon-celo-mainnet-prod-0
kubectl -n pylon delete pvc chainsync-data-pylon-celo-mainnet-prod-0
```

### 2c) Restart and verify the chain is fresh

```bash
kubectl -n pylon scale sts/pylon-celo-mainnet-prod --replicas=1
kubectl -n pylon rollout status sts/pylon-celo-mainnet-prod
```

After restart, verify preinstalls:
```bash
cast code "0x0000000000000000000000000000000000000043" --rpc-url "$PYLON_RPC_URL" | head -c 20
cast code "0x4e59b44847b379578588920cA78FbF26c0B4956C" --rpc-url "$PYLON_RPC_URL" | head -c 20
```

And verify the appchain is empty from the HumanNFT perspective (this should fail on the fresh chain, because the old contract is gone):

```bash
cast code "$OLD_HUMAN_NFT_ADDRESS" --rpc-url "$PYLON_RPC_URL"
```

---

## 3) Deterministically redeploy the proxy + HumanNFT (post-reset)

From `self-pylon-demo/contracts/`:

```bash
cd self-pylon-demo/contracts
./scripts/install-foundry-deps.sh

PYLON_APPCHAIN_PORT="$PYLON_APPCHAIN_PORT" \
PROOF_OF_HUMAN_ADDRESS="$PROOF_OF_HUMAN_ADDRESS" \
HUMAN_NFT_OWNER="$HUMAN_NFT_OWNER" \
forge script script/DeployPylonDeterministic.s.sol:DeployPylonDeterministic \
  --rpc-url "$PYLON_RPC_URL" \
  --broadcast \
  --private-key "$SIGNER_PRIVATE_KEY"
```

Record the printed addresses:
- `SettlementForwardingProxy` (appchain)
- `HumanNFT` (appchain)

Verify `HumanNFT` is owned by the seeding key:

```bash
export HUMAN_NFT_ADDRESS="<from deploy output>"
cast call "$HUMAN_NFT_ADDRESS" "owner()(address)" --rpc-url "$PYLON_RPC_URL"
```

---

## 4) Seed from snapshot, then finalize seeding

```bash
cd self-pylon-demo/contracts

export SEED_INPUT="/absolute/path/to/snapshot-human-nft.<timestamp>.json"
export FINALIZE_SEEDING=1

HUMAN_NFT_ADDRESS="$HUMAN_NFT_ADDRESS" \
SEED_INPUT="$SEED_INPUT" \
FINALIZE_SEEDING="$FINALIZE_SEEDING" \
forge script script/SeedHumanNFT.s.sol:SeedHumanNFT \
  --rpc-url "$PYLON_RPC_URL" \
  --broadcast \
  --private-key "$SIGNER_PRIVATE_KEY"
```

Post-checks:
```bash
cast call "$HUMAN_NFT_ADDRESS" "seedingComplete()(bool)" --rpc-url "$PYLON_RPC_URL"
cast call "$HUMAN_NFT_ADDRESS" "nextId()(uint256)" --rpc-url "$PYLON_RPC_URL"
```

---

## 5) Verify migrated state matches snapshot (hard correctness check)

```bash
cd self-pylon-demo

RPC_URL="$PYLON_RPC_URL" \
HUMAN_NFT_ADDRESS="$HUMAN_NFT_ADDRESS" \
OUT_FILE="$SEED_INPUT" \
VERIFY_ONLY=1 \
node scripts/snapshot-human-nft.mjs
```

Optional end-to-end nullifier verification against Celo:
```bash
RPC_URL="$PYLON_RPC_URL" \
HUMAN_NFT_ADDRESS="$HUMAN_NFT_ADDRESS" \
OUT_FILE="$SEED_INPUT" \
VERIFY_ONLY=1 \
VERIFY_NULLIFIERS=1 \
CELO_RPC_URL="$CELO_RPC_URL" \
PROOF_OF_HUMAN_ADDRESS="$PROOF_OF_HUMAN_ADDRESS" \
node scripts/snapshot-human-nft.mjs
```

---

## 6) Update frontend config and redeploy

Update `self-pylon-demo/frontend/.env.local` (and your deploy pipeline) with the new/expected deterministic `NEXT_PUBLIC_HUMAN_NFT_ADDRESS`.
