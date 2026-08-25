#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFreshReviewArtifacts,
  stableJson
} from "./fresh-review-matrix-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");

const CANDIDATE_PATHS = Object.freeze({
  manifest: "data/expungement-ai/flow-audit/flow-manifest.json",
  dispositions:
    "data/expungement-ai/flow-audit/phase4-corrections/final-flow-dispositions.json",
  waitingRuleAuthority:
    "data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json"
});

const BROWSER_SHARD_STATE_GROUPS = Object.freeze([
  Object.freeze(["AZ", "CA", "MT", "NC", "NE", "NY", "OR", "TN", "WI"]),
  Object.freeze(["AL", "FL", "HI", "IA", "MI", "ND", "NV", "RI", "TX"]),
  Object.freeze(["IN", "MA", "MN", "MO", "MS", "OK", "SC", "VA"]),
  Object.freeze(["AK", "DC", "MD", "ME", "NM", "SD", "WA", "WY"]),
  Object.freeze(["AR", "CO", "GA", "KS", "OH", "PA", "UT", "WV"]),
  Object.freeze(["CT", "DE", "ID", "IL", "KY", "LA", "NH", "NJ", "VT"])
]);

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function readCandidateJson(candidateSha, candidatePath) {
  const content = execFileSync(
    "git",
    ["show", `${candidateSha}:${candidatePath}`],
    {
      cwd: rootDir,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024
    }
  );
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`invalid JSON at ${candidatePath}: ${error.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const candidateSha = valueAfter(args, "--candidate-sha");
  const check = args.includes("--check");
  const outputDir = path.resolve(
    rootDir,
    valueAfter(args, "--output-dir")
      ?? "data/expungement-ai/qa/fresh-review"
  );

  if (!candidateSha || !/^[0-9a-f]{40}$/.test(candidateSha)) {
    throw new Error("--candidate-sha must be an exact 40-character lowercase SHA");
  }

  const resolved = execFileSync(
    "git",
    ["rev-parse", "--verify", `${candidateSha}^{commit}`],
    { cwd: rootDir, encoding: "utf8" }
  ).trim();
  if (resolved !== candidateSha) {
    throw new Error(`candidate did not resolve exactly: ${resolved}`);
  }

  const artifacts = buildFreshReviewArtifacts({
    candidateSha,
    manifest: readCandidateJson(candidateSha, CANDIDATE_PATHS.manifest),
    dispositions: readCandidateJson(candidateSha, CANDIDATE_PATHS.dispositions),
    waitingRuleAuthority: readCandidateJson(
      candidateSha,
      CANDIDATE_PATHS.waitingRuleAuthority
    ),
    expectedRealFlowCount: 356,
    browserShardStateGroups: BROWSER_SHARD_STATE_GROUPS
  });
  const outputs = new Map([
    ["CURRENT_MATRIX.json", artifacts.matrix],
    ["BROWSER_SHARDS.json", artifacts.browserShards],
    ["THREE_STATE_STRESS_SET.json", artifacts.stressSet],
    ["BUILD_SUMMARY.json", artifacts.summary]
  ]);

  if (!check) fs.mkdirSync(outputDir, { recursive: true });
  for (const [fileName, value] of outputs) {
    const expected = stableJson(value);
    const target = path.join(outputDir, fileName);
    if (check) {
      const actual = fs.readFileSync(target, "utf8");
      if (actual !== expected) {
        throw new Error(
          `${fileName} does not match candidate ${candidateSha}`
        );
      }
    } else {
      fs.writeFileSync(target, expected);
    }
  }

  const action = check ? "verified" : "generated";
  console.log(
    `fresh-review-matrix ${action}: ${artifacts.summary.realFlows} flows, `
      + `${artifacts.summary.deviceFixtures} device fixtures, `
      + `${artifacts.summary.browserShards} shards, candidate ${candidateSha}`
  );
}

try {
  main();
} catch (error) {
  console.error(`fresh-review-matrix: ${error.message}`);
  process.exit(1);
}
