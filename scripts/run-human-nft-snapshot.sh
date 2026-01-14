#!/usr/bin/env bash
# Runs snapshot export + ownerOf verification + ProofOfHuman nullifier check.
# Requires env vars: PYLON_RPC_URL, HUMAN_NFT_ADDRESS, CELO_RPC_URL, PROOF_OF_HUMAN_ADDRESS
# Optional env vars: BLOCK_CHUNK (default 10000), OUT_FILE (default snapshot-human-nft.json)
set -euo pipefail

if [[ -z "${PYLON_RPC_URL:-}" ]]; then
  echo "Missing PYLON_RPC_URL" >&2
  exit 1
fi

if [[ -z "${HUMAN_NFT_ADDRESS:-}" ]]; then
  echo "Missing HUMAN_NFT_ADDRESS" >&2
  exit 1
fi

if [[ -z "${CELO_RPC_URL:-}" ]]; then
  echo "Missing CELO_RPC_URL" >&2
  exit 1
fi

if [[ -z "${PROOF_OF_HUMAN_ADDRESS:-}" ]]; then
  echo "Missing PROOF_OF_HUMAN_ADDRESS" >&2
  exit 1
fi

BLOCK_CHUNK="${BLOCK_CHUNK:-10000}"
OUT_FILE="${OUT_FILE:-snapshot-human-nft.json}"

RPC_URL="$PYLON_RPC_URL" \
HUMAN_NFT_ADDRESS="$HUMAN_NFT_ADDRESS" \
CELO_RPC_URL="$CELO_RPC_URL" \
PROOF_OF_HUMAN_ADDRESS="$PROOF_OF_HUMAN_ADDRESS" \
BLOCK_CHUNK="$BLOCK_CHUNK" \
OUT_FILE="$OUT_FILE" \
VERIFY=1 \
VERIFY_NULLIFIERS=1 \
node scripts/snapshot-human-nft.mjs

echo "Snapshot + verification complete: $OUT_FILE"
