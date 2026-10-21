#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stableJson } from "./fresh-review-matrix-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");

const SOURCES = Object.freeze({
  manifest: Object.freeze({
    repositoryPath: "data/expungement-ai/flow-audit/flow-manifest.json",
    vendoredFile: "flow-manifest.json"
  }),
  dispositions: Object.freeze({
    repositoryPath:
      "data/expungement-ai/flow-audit/phase4-corrections/final-flow-dispositions.json",
    vendoredFile: "final-flow-dispositions.json"
  }),
  waitingRuleAuthority: Object.freeze({
    repositoryPath:
      "data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json",
    vendoredFile: "waiting-rule-authority.json"
  })
});

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function main() {
  const args = process.argv.slice(2);
  const candidateSha = valueAfter(args, "--candidate-sha");
  if (!/^[0-9a-f]{40}$/.test(candidateSha ?? "")) {
    throw new Error("--candidate-sha must be an exact 40-character lowercase SHA");
  }

  const outputDir = path.resolve(
    rootDir,
    valueAfter(args, "--output-dir")
      ?? `data/expungement-ai/qa/authority/${candidateSha}`
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const provenanceSources = {};
  for (const [logicalName, source] of Object.entries(SOURCES)) {
    const content = execFileSync(
      "git",
      ["show", `${candidateSha}:${source.repositoryPath}`],
      { cwd: rootDir, maxBuffer: 64 * 1024 * 1024 }
    );
    fs.writeFileSync(path.join(outputDir, source.vendoredFile), content);
    provenanceSources[logicalName] = {
      repositoryPath: source.repositoryPath,
      vendoredFile: source.vendoredFile,
      bytes: content.length,
      sha256: sha256(content)
    };
  }

  const provenance = {
    schemaVersion: "expai-fresh-review-authority/v1",
    candidateSha,
    runtimeGitObjectStoreRequired: false,
    refreshCommand:
      `node scripts/expungement-ai/qa/vendor-fresh-review-authority.mjs `
      + `--candidate-sha ${candidateSha}`,
    sources: provenanceSources
  };
  fs.writeFileSync(
    path.join(outputDir, "AUTHORITY_PROVENANCE.json"),
    stableJson(provenance)
  );
  console.log(
    `fresh-review authority vendored: ${candidateSha} -> ${outputDir}`
  );
}

try {
  main();
} catch (error) {
  console.error(`fresh-review authority vendor: ${error.message}`);
  process.exit(1);
}
