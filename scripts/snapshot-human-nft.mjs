#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const REQUIRED_ENV = ["RPC_URL", "HUMAN_NFT_ADDRESS"];
const OWNER_OF_SELECTOR = "0x6352211e";
const NEXT_ID_SELECTOR = "0x61b8ce8c";
const ADDRESS_TO_NULLIFIER_SELECTOR = "0xdd71369c";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parsePositiveInt(value, fallback) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  return parsed;
}

async function main() {
  REQUIRED_ENV.forEach(requireEnv);

  const rpcUrl = requireEnv("RPC_URL");
  const contractAddress = normalizeAddress(requireEnv("HUMAN_NFT_ADDRESS"));
  const outputFile =
    process.env.OUT_FILE || path.join(process.cwd(), "snapshot-human-nft.json");
  const verifyOnly = process.env.VERIFY_ONLY === "1";
  const verifyAfter = process.env.VERIFY === "1";
  const verifyNullifiers = process.env.VERIFY_NULLIFIERS === "1";

  if (verifyOnly) {
    await verifySnapshot(rpcUrl, contractAddress, outputFile);
    if (verifyNullifiers) {
      await verifyNullifiersOnCelo(outputFile);
    }
    return;
  }

  const fromBlock = parsePositiveInt(process.env.FROM_BLOCK, 0);
  const blockChunk = parsePositiveInt(process.env.BLOCK_CHUNK, 2000);
  const batchSize = parsePositiveInt(process.env.BATCH_SIZE, 200);
  const topic0 =
    process.env.TOPIC0 ||
    "0x71560b91699bfc86f07ddf9692ac920afde3e58fec44adce20d1cb49db95d5f7";

  const toBlock =
    process.env.TO_BLOCK && process.env.TO_BLOCK !== "latest"
      ? parsePositiveInt(process.env.TO_BLOCK, 0)
      : await rpcRequest(rpcUrl, "eth_blockNumber", []).then((value) =>
          hexToInt(value)
        );

  if (fromBlock > toBlock) {
    throw new Error(`FROM_BLOCK ${fromBlock} is greater than TO_BLOCK ${toBlock}`);
  }

  const entries = [];
  const seenTokenIds = new Set();
  const seenNullifiers = new Set();
  let duplicateTokenIds = 0;
  let duplicateNullifiers = 0;
  let totalLogs = 0;
  const startTime = Date.now();

  console.log(
    `Snapshotting HumanVerified logs for ${contractAddress} from block ${fromBlock} to ${toBlock}...`
  );

  for (let start = fromBlock; start <= toBlock; start += blockChunk + 1) {
    const end = Math.min(start + blockChunk, toBlock);
    console.log(`Fetching logs for blocks ${start}-${end}...`);
    const logs = await rpcRequest(rpcUrl, "eth_getLogs", [
      {
        address: contractAddress,
        topics: [topic0],
        fromBlock: intToHex(start),
        toBlock: intToHex(end),
      },
    ]);
    totalLogs += logs.length;

    for (const log of logs) {
      const user = topicToAddress(log.topics?.[1]);
      const tokenId = hexToBigInt(log.topics?.[2]).toString();
      const nullifier = hexToBigInt(log.data).toString();

      if (seenTokenIds.has(tokenId)) {
        duplicateTokenIds += 1;
        continue;
      }
      if (seenNullifiers.has(nullifier)) {
        duplicateNullifiers += 1;
        continue;
      }

      seenTokenIds.add(tokenId);
      seenNullifiers.add(nullifier);
      entries.push({ user, tokenId, nullifier });
    }

    console.log(
      `Accumulated ${entries.length} unique mints (${totalLogs} logs, ${duplicateTokenIds} dup tokenIds, ${duplicateNullifiers} dup nullifiers).`
    );
  }

  entries.sort((a, b) => {
    const aId = BigInt(a.tokenId);
    const bId = BigInt(b.tokenId);
    if (aId === bId) return 0;
    return aId < bId ? -1 : 1;
  });

  const batches = [];
  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    batches.push({
      owners: chunk.map((entry) => entry.user),
      tokenIds: chunk.map((entry) => entry.tokenId),
      nullifiers: chunk.map((entry) => entry.nullifier),
    });
  }

  const maxTokenId =
    entries.length === 0 ? "0" : entries[entries.length - 1].tokenId;

  const payload = {
    generatedAt: new Date().toISOString(),
    contract: contractAddress,
    fromBlock,
    toBlock,
    entryCount: entries.length,
    batchCount: batches.length,
    maxTokenId,
    duplicates: {
      tokenIds: duplicateTokenIds,
      nullifiers: duplicateNullifiers,
    },
    batches,
  };

  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`Wrote snapshot to ${outputFile}`);
  console.log(
    `Done in ${durationSec}s. ${entries.length} entries across ${batches.length} batches.`
  );
  if (duplicateTokenIds || duplicateNullifiers) {
    console.warn(
      `Skipped ${duplicateTokenIds} duplicate tokenId logs and ${duplicateNullifiers} duplicate nullifier logs`
    );
  }

  if (verifyAfter) {
    await verifySnapshot(rpcUrl, contractAddress, outputFile);
  }

  if (verifyNullifiers) {
    await verifyNullifiersOnCelo(outputFile);
  }
}

async function rpcRequest(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`RPC error: ${payload.error.message || "unknown error"}`);
  }

  return payload.result;
}

function normalizeAddress(value) {
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return trimmed.toLowerCase();
}

function topicToAddress(topic) {
  if (!topic || !/^0x[0-9a-fA-F]{64}$/.test(topic)) {
    throw new Error(`Invalid topic for address: ${topic}`);
  }
  return `0x${topic.slice(26)}`.toLowerCase();
}

function hexToBigInt(value) {
  if (!value || typeof value !== "string") {
    throw new Error(`Invalid hex value: ${value}`);
  }
  return BigInt(value);
}

function hexToInt(value) {
  const parsed = Number(BigInt(value));
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Block number exceeds safe integer: ${value}`);
  }
  return parsed;
}

function intToHex(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid block number: ${value}`);
  }
  return `0x${value.toString(16)}`;
}

async function verifyNullifiersOnCelo(outputFile) {
  const celoRpcUrl = requireEnv("CELO_RPC_URL");
  const proofOfHumanAddress = normalizeAddress(
    requireEnv("PROOF_OF_HUMAN_ADDRESS")
  );

  if (!fs.existsSync(outputFile)) {
    throw new Error(`Snapshot file not found: ${outputFile}`);
  }

  console.log(
    `Verifying nullifiers via ProofOfHuman at ${proofOfHumanAddress}...`
  );
  const raw = fs.readFileSync(outputFile, "utf8");
  const snapshot = JSON.parse(raw);

  let checked = 0;
  let mismatches = 0;
  const startTime = Date.now();

  for (const batch of snapshot.batches || []) {
    const owners = batch.owners || [];
    const nullifiers = batch.nullifiers || [];

    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i]?.toLowerCase();
      const expected = nullifiers[i]?.toString();
      const data =
        ADDRESS_TO_NULLIFIER_SELECTOR + padAddressHex(owner || "");
      const result = await rpcRequest(celoRpcUrl, "eth_call", [
        { to: proofOfHumanAddress, data },
        "latest",
      ]);
      const onchain = hexToBigInt(result).toString();

      if (onchain !== expected) {
        mismatches += 1;
        console.warn(
          `Nullifier mismatch for ${owner}: on-chain ${onchain}, snapshot ${expected}`
        );
      }

      checked += 1;
      if (checked % 50 === 0) {
        console.log(
          `Verified ${checked} nullifiers (${mismatches} mismatches)`
        );
      }
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  if (mismatches === 0) {
    console.log(`Nullifier verification OK: ${checked} checked in ${durationSec}s.`);
  } else {
    console.log(
      `Nullifier verification finished with ${mismatches} mismatches in ${durationSec}s.`
    );
  }
}

async function verifySnapshot(rpcUrl, contractAddress, outputFile) {
  if (!fs.existsSync(outputFile)) {
    throw new Error(`Snapshot file not found: ${outputFile}`);
  }

  console.log(`Verifying snapshot against on-chain ownerOf...`);
  const raw = fs.readFileSync(outputFile, "utf8");
  const snapshot = JSON.parse(raw);

  const snapshotMap = new Map();
  for (const batch of snapshot.batches || []) {
    const owners = batch.owners || [];
    const tokenIds = batch.tokenIds || [];
    for (let i = 0; i < tokenIds.length; i++) {
      snapshotMap.set(tokenIds[i].toString(), owners[i]?.toLowerCase());
    }
  }

  const nextIdHex = await rpcRequest(rpcUrl, "eth_call", [
    { to: contractAddress, data: NEXT_ID_SELECTOR },
    "latest",
  ]);
  const nextId = hexToInt(nextIdHex);
  const maxTokenId = Math.max(0, nextId - 1);
  const loggedMints = snapshotMap.size;

  if (maxTokenId > loggedMints) {
    throw new Error(
      `On-chain mint count (${maxTokenId}) exceeds logged events (${loggedMints}).`
    );
  }

  let mismatches = 0;
  const total = maxTokenId;
  const startTime = Date.now();

  for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
    const data = OWNER_OF_SELECTOR + padUint256Hex(tokenId);
    const result = await rpcRequest(rpcUrl, "eth_call", [
      { to: contractAddress, data },
      "latest",
    ]);
    const owner = decodeAddress(result);
    const expected = snapshotMap.get(tokenId.toString());

    if (!expected || owner !== expected) {
      mismatches += 1;
      console.warn(
        `Mismatch tokenId ${tokenId}: on-chain ${owner}, snapshot ${expected || "missing"}`
      );
    }

    if (tokenId % 50 === 0 || tokenId === total) {
      console.log(
        `Verified ${tokenId}/${total} tokens (${mismatches} mismatches)`
      );
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  if (mismatches === 0) {
    console.log(`Verification OK: ${total} tokens checked in ${durationSec}s.`);
  } else {
    console.log(
      `Verification finished with ${mismatches} mismatches in ${durationSec}s.`
    );
  }
}

function padUint256Hex(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid uint256 value: ${value}`);
  }
  return value.toString(16).padStart(64, "0");
}

function decodeAddress(value) {
  if (!value || typeof value !== "string" || !value.startsWith("0x")) {
    throw new Error(`Invalid address data: ${value}`);
  }
  const hex = value.slice(2).padStart(64, "0");
  return `0x${hex.slice(24)}`.toLowerCase();
}

function padAddressHex(value) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return value.slice(2).padStart(64, "0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
