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
  const baseSnapshotPath = process.env.BASE_SNAPSHOT || "";

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
  const seenTokenIds = new Set(); // within delta logs
  const seenNullifiers = new Set(); // within delta logs
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

  let mergedEntries = entries;
  let baseEntryCount = 0;
  let mergeConflicts = 0;
  let mergeOverlaps = 0;

  if (baseSnapshotPath) {
    const baseSnapshot = readSnapshotEntries(baseSnapshotPath);
    baseEntryCount = baseSnapshot.entries.length;
    const merged = mergeSnapshots({
      base: baseSnapshot.entries,
      delta: entries,
    });
    mergedEntries = merged.entries;
    mergeConflicts = merged.conflicts;
    mergeOverlaps = merged.overlaps;
  }

  mergedEntries.sort((a, b) => {
    const aId = BigInt(a.tokenId);
    const bId = BigInt(b.tokenId);
    if (aId === bId) return 0;
    return aId < bId ? -1 : 1;
  });

  const batches = [];
  for (let i = 0; i < mergedEntries.length; i += batchSize) {
    const chunk = mergedEntries.slice(i, i + batchSize);
    batches.push({
      owners: chunk.map((entry) => entry.user),
      tokenIds: chunk.map((entry) => entry.tokenId),
      nullifiers: chunk.map((entry) => entry.nullifier),
    });
  }

  const maxTokenId =
    mergedEntries.length === 0 ? "0" : mergedEntries[mergedEntries.length - 1].tokenId;

  const payload = {
    generatedAt: new Date().toISOString(),
    contract: contractAddress,
    fromBlock,
    toBlock,
    entryCount: mergedEntries.length,
    batchCount: batches.length,
    maxTokenId,
    duplicates: {
      tokenIds: duplicateTokenIds,
      nullifiers: duplicateNullifiers,
    },
    sources: baseSnapshotPath
      ? {
          baseSnapshot: path.resolve(baseSnapshotPath),
          baseEntryCount,
          deltaFromBlock: fromBlock,
          deltaToBlock: toBlock,
          deltaEntryCount: entries.length,
          merge: { overlaps: mergeOverlaps, conflicts: mergeConflicts },
        }
      : {
          deltaFromBlock: fromBlock,
          deltaToBlock: toBlock,
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
  if (baseSnapshotPath) {
    console.log(
      `Merged base snapshot (${baseEntryCount} entries) + delta logs (${entries.length} entries) -> ${mergedEntries.length} entries.`
    );
    if (mergeOverlaps) {
      console.warn(`Merge overlaps (tokenId or nullifier present in both): ${mergeOverlaps}`);
    }
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
  const tokenIdList = [];
  for (const batch of snapshot.batches || []) {
    const owners = batch.owners || [];
    const tokenIds = batch.tokenIds || [];
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i]?.toString();
      const owner = owners[i]?.toLowerCase();
      if (!tokenId) continue;
      snapshotMap.set(tokenId, owner);
      tokenIdList.push(tokenId);
    }
  }

  const nextIdHex = await rpcRequest(rpcUrl, "eth_call", [
    { to: contractAddress, data: NEXT_ID_SELECTOR },
    "latest",
  ]);
  const nextId = hexToInt(nextIdHex);
  const onChainMaxTokenId = Math.max(0, nextId - 1);

  const strictFull = process.env.STRICT_FULL_SNAPSHOT === "1";
  const hasAny = snapshotMap.size > 0;

  if (!hasAny) {
    if (onChainMaxTokenId === 0) {
      console.log("No tokens on-chain and snapshot is empty. OK.");
      return;
    }
    throw new Error(
      `Snapshot is empty but on-chain nextId implies ${onChainMaxTokenId} minted tokens.`
    );
  }

  let mismatches = 0;
  const snapshotTokenIds = Array.from(
    new Set(tokenIdList.map((x) => x.toString()))
  ).sort((a, b) => {
    const aId = BigInt(a);
    const bId = BigInt(b);
    if (aId === bId) return 0;
    return aId < bId ? -1 : 1;
  });

  const minSnapshotTokenId = Number(BigInt(snapshotTokenIds[0]));
  const maxSnapshotTokenId = Number(BigInt(snapshotTokenIds[snapshotTokenIds.length - 1]));

  const looksFull =
    minSnapshotTokenId === 1 &&
    maxSnapshotTokenId === onChainMaxTokenId &&
    snapshotMap.size === onChainMaxTokenId;

  if (!looksFull) {
    const msg =
      `Snapshot appears partial (snapshot tokenIds: ${minSnapshotTokenId}..${maxSnapshotTokenId} ` +
      `(${snapshotMap.size} tokens), on-chain max tokenId=${onChainMaxTokenId}).`;
    if (strictFull) {
      throw new Error(
        `${msg} If this chain includes seeded mints without HumanVerified logs, rerun with BASE_SNAPSHOT pointing to the seeding snapshot.`
      );
    }
    console.warn(`${msg} Verifying only tokenIds present in snapshot.`);
  }

  const tokensToCheck = looksFull
    ? Array.from({ length: onChainMaxTokenId }, (_, i) => (i + 1).toString())
    : snapshotTokenIds;

  const total = tokensToCheck.length;
  const startTime = Date.now();

  for (let i = 0; i < tokensToCheck.length; i++) {
    const tokenIdStr = tokensToCheck[i];
    const tokenId = Number(BigInt(tokenIdStr));
    const data = OWNER_OF_SELECTOR + padUint256Hex(tokenId);
    const result = await rpcRequest(rpcUrl, "eth_call", [
      { to: contractAddress, data },
      "latest",
    ]);
    const owner = decodeAddress(result);
    const expected = snapshotMap.get(tokenIdStr);

    if (!expected || owner !== expected) {
      mismatches += 1;
      console.warn(
        `Mismatch tokenId ${tokenIdStr}: on-chain ${owner}, snapshot ${expected || "missing"}`
      );
    }

    const done = i + 1;
    if (done % 50 === 0 || done === total) {
      console.log(
        `Verified ${done}/${total} tokens (${mismatches} mismatches)`
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

function readSnapshotEntries(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Base snapshot file not found: ${snapshotPath}`);
  }
  const raw = fs.readFileSync(snapshotPath, "utf8");
  const snapshot = JSON.parse(raw);
  const entries = [];
  for (const batch of snapshot.batches || []) {
    const owners = batch.owners || [];
    const tokenIds = batch.tokenIds || [];
    const nullifiers = batch.nullifiers || [];
    for (let i = 0; i < tokenIds.length; i++) {
      const user = owners[i]?.toLowerCase();
      const tokenId = tokenIds[i]?.toString();
      const nullifier = nullifiers[i]?.toString();
      if (!user || !tokenId || !nullifier) continue;
      entries.push({ user, tokenId, nullifier });
    }
  }
  return { snapshot, entries };
}

function mergeSnapshots({ base, delta }) {
  const byTokenId = new Map();
  const byNullifier = new Map();
  let overlaps = 0;
  let conflicts = 0;

  function add(entry, source) {
    const tokenId = entry.tokenId.toString();
    const nullifier = entry.nullifier.toString();
    const user = entry.user.toLowerCase();

    const existingByToken = byTokenId.get(tokenId);
    if (existingByToken) {
      overlaps += 1;
      if (
        existingByToken.user !== user ||
        existingByToken.nullifier.toString() !== nullifier
      ) {
        conflicts += 1;
        throw new Error(
          `Snapshot merge conflict for tokenId=${tokenId} (${source} differs from base).`
        );
      }
      return;
    }

    const existingByNullifier = byNullifier.get(nullifier);
    if (existingByNullifier) {
      overlaps += 1;
      if (
        existingByNullifier.user !== user ||
        existingByNullifier.tokenId.toString() !== tokenId
      ) {
        conflicts += 1;
        throw new Error(
          `Snapshot merge conflict for nullifier=${nullifier} (${source} differs from base).`
        );
      }
      return;
    }

    byTokenId.set(tokenId, { user, tokenId, nullifier });
    byNullifier.set(nullifier, { user, tokenId, nullifier });
  }

  for (const e of base) add(e, "base");
  for (const e of delta) add(e, "delta");

  return { entries: Array.from(byTokenId.values()), overlaps, conflicts };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
