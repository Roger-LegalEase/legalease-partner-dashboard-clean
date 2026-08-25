#!/usr/bin/env node

import crypto from "node:crypto";
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

function parseJson(content, label) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`invalid JSON at ${label}: ${error.message}`);
  }
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function readAuthorityBundle(candidateSha, authorityDir) {
  const provenancePath = path.join(authorityDir, "AUTHORITY_PROVENANCE.json");
  const provenance = parseJson(
    fs.readFileSync(provenancePath, "utf8"),
    provenancePath
  );
  if (provenance.schemaVersion !== "expai-fresh-review-authority/v1") {
    throw new Error(`unsupported authority provenance at ${provenancePath}`);
  }
  if (provenance.candidateSha !== candidateSha) {
    throw new Error(
      `authority candidate mismatch: expected ${candidateSha}, `
        + `found ${provenance.candidateSha}`
    );
  }
  if (provenance.runtimeGitObjectStoreRequired !== false) {
    throw new Error("authority provenance must declare no runtime Git dependency");
  }

  const values = {};
  for (const [logicalName, repositoryPath] of Object.entries(CANDIDATE_PATHS)) {
    const source = provenance.sources?.[logicalName];
    if (!source || source.repositoryPath !== repositoryPath) {
      throw new Error(`authority source mismatch for ${logicalName}`);
    }
    if (
      typeof source.vendoredFile !== "string"
      || source.vendoredFile !== path.basename(source.vendoredFile)
    ) {
      throw new Error(`unsafe authority file for ${logicalName}`);
    }
    const content = fs.readFileSync(path.join(authorityDir, source.vendoredFile));
    const actualDigest = sha256(content);
    if (actualDigest !== source.sha256) {
      throw new Error(`authority digest mismatch for ${logicalName}`);
    }
    if (content.length !== source.bytes) {
      throw new Error(`authority byte-count mismatch for ${logicalName}`);
    }
    values[logicalName] = parseJson(content.toString("utf8"), repositoryPath);
  }
  return values;
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
  const authorityDir = path.resolve(
    rootDir,
    valueAfter(args, "--authority-dir")
      ?? `data/expungement-ai/qa/authority/${candidateSha}`
  );

  if (!candidateSha || !/^[0-9a-f]{40}$/.test(candidateSha)) {
    throw new Error("--candidate-sha must be an exact 40-character lowercase SHA");
  }

  const authority = readAuthorityBundle(candidateSha, authorityDir);

  const artifacts = buildFreshReviewArtifacts({
    candidateSha,
    manifest: authority.manifest,
    dispositions: authority.dispositions,
    waitingRuleAuthority: authority.waitingRuleAuthority,
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
      + `${artifacts.summary.executableDeviceFixtures} executable fixtures, `
      + `${artifacts.summary.heldDeviceFixtures} held fixtures, `
      + `${artifacts.summary.browserShards} shards, candidate ${candidateSha}`
  );
}

try {
  main();
} catch (error) {
  console.error(`fresh-review-matrix: ${error.message}`);
  process.exit(1);
}
