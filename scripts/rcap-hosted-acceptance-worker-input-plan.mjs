#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

export const CANONICAL_WORKER_INPUTS = Object.freeze([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "scripts/rcap-render-worker.mjs",
  "scripts/lib",
  "src",
  "deploy/rcap-render-worker/Dockerfile"
]);

const FIXED_FILE_INPUTS = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "scripts/rcap-render-worker.mjs",
  "deploy/rcap-render-worker/Dockerfile"
]);

function validateSourceSha(value, label) {
  if (!/^[0-9a-f]{40}$/.test(value ?? "")) {
    throw new Error(`${label} must be an exact 40-character lowercase Git SHA`);
  }
}

function validateDigest(value) {
  if (!/^sha256:[0-9a-f]{64}$/.test(value ?? "")) {
    throw new Error("HOSTED_ACCEPTED_WORKER_DIGEST must be an immutable sha256 digest");
  }
}

function git(rootDir, args, { binary = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: binary ? null : "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8") : String(result.stderr ?? "");
    throw new Error(`git ${args[0]} failed: ${stderr.trim() || `exit ${result.status}`}`);
  }
  return result.stdout;
}

function verifyCanonicalInputs(rootDir, candidateSha) {
  for (const canonicalPath of CANONICAL_WORKER_INPUTS) {
    const type = String(git(rootDir, ["cat-file", "-t", `${candidateSha}:${canonicalPath}`])).trim();
    const expectedType = FIXED_FILE_INPUTS.has(canonicalPath) ? "blob" : "tree";
    if (type !== expectedType) {
      throw new Error(`canonical worker input ${canonicalPath} must be a Git ${expectedType} at the candidate SHA`);
    }
  }
}

function changedCanonicalPaths(rootDir, acceptedSourceSha, candidateSha) {
  const output = git(rootDir, [
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    acceptedSourceSha,
    candidateSha,
    "--",
    ...CANONICAL_WORKER_INPUTS
  ], { binary: true });
  return output.toString("utf8").split("\0").filter(Boolean).sort();
}

function aggregateCanonicalInputs(rootDir, candidateSha) {
  const output = git(rootDir, [
    "ls-tree",
    "-r",
    "-z",
    "--full-tree",
    candidateSha,
    "--",
    ...CANONICAL_WORKER_INPUTS
  ], { binary: true });
  const entries = output.toString("utf8").split("\0").filter(Boolean).map((entry) => {
    const tabIndex = entry.indexOf("\t");
    if (tabIndex < 0) throw new Error("git ls-tree returned an unparseable canonical worker input");
    const [mode, type, objectId] = entry.slice(0, tabIndex).split(" ");
    return { mode, type, objectId, path: entry.slice(tabIndex + 1) };
  }).sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

  const hash = crypto.createHash("sha256");
  hash.update("rcap-canonical-worker-inputs/v1\0");
  for (const entry of entries) {
    hash.update(entry.path);
    hash.update("\0");
    hash.update(entry.mode);
    hash.update("\0");
    hash.update(entry.type);
    hash.update("\0");
    hash.update(entry.objectId);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function createWorkerInputPlan({
  rootDir,
  acceptedSourceSha,
  acceptedDigest,
  candidateSha
}) {
  const resolvedRoot = path.resolve(rootDir);
  validateSourceSha(acceptedSourceSha, "HOSTED_ACCEPTED_WORKER_SOURCE_SHA");
  validateSourceSha(candidateSha, "HOSTED_APPLICATION_SHA");
  validateDigest(acceptedDigest);
  git(resolvedRoot, ["cat-file", "-e", `${acceptedSourceSha}^{commit}`]);
  git(resolvedRoot, ["cat-file", "-e", `${candidateSha}^{commit}`]);
  verifyCanonicalInputs(resolvedRoot, candidateSha);

  const changedPaths = changedCanonicalPaths(resolvedRoot, acceptedSourceSha, candidateSha);
  const rebuildRequired = changedPaths.length > 0;
  const imageSourceSha = rebuildRequired ? candidateSha : acceptedSourceSha;

  return {
    schemaVersion: "rcap-worker-input-plan/v1",
    acceptedSourceSha,
    acceptedDigest,
    candidateSha,
    canonicalInputs: [...CANONICAL_WORKER_INPUTS],
    changedPaths,
    aggregateInputSha256: aggregateCanonicalInputs(resolvedRoot, candidateSha),
    aggregateAlgorithm: "sha256 of sorted path, mode, type, and Git object ID records",
    rebuildRequired,
    decision: rebuildRequired ? "rebuild-required" : "reuse-accepted-digest",
    image: {
      sourceSha: imageSourceSha,
      tags: rebuildRequired ? [candidateSha] : [],
      tagPolicy: "full-40-character-candidate-sha-only",
      digest: rebuildRequired ? "pending" : acceptedDigest,
      ociAnnotations: {
        "org.opencontainers.image.revision": imageSourceSha
      }
    }
  };
}

export function writeWorkerInputPlan({ rootDir, environment = process.env } = {}) {
  const evidenceFolders = prepareHostedAcceptanceEvidenceLayout({ rootDir, environment });
  const plan = createWorkerInputPlan({
    rootDir,
    acceptedSourceSha: environment.HOSTED_ACCEPTED_WORKER_SOURCE_SHA,
    acceptedDigest: environment.HOSTED_ACCEPTED_WORKER_DIGEST,
    candidateSha: environment.HOSTED_APPLICATION_SHA
  });
  const evidencePath = path.join(evidenceFolders.root, "worker-input-plan.json");
  fs.writeFileSync(evidencePath, `${JSON.stringify(plan, null, 2)}\n`, { mode: 0o600 });
  return { evidencePath, plan };
}

function isMainModule() {
  return process.argv[1]
    ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
    : false;
}

if (isMainModule()) {
  try {
    const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const { evidencePath, plan } = writeWorkerInputPlan({ rootDir });
    console.log(`WORKER INPUT PLAN ${plan.decision.toUpperCase()} — ${evidencePath}`);
  } catch (error) {
    console.error(`WORKER INPUT PLAN FAILED — ${error.message}`);
    process.exitCode = 1;
  }
}
