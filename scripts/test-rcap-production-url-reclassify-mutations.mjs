#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const files = [
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  ".github/workflows/rcap-production-url-reclassify.yml",
  "scripts/rcap-production-url-reclassify.mjs",
  "scripts/verify-rcap-production-url-reclassify.mjs"
];
const mutations = [
  ["scripts/rcap-production-url-reclassify.mjs", 'const TEAM_SLUG = "roger947s-projects"', 'const TEAM_SLUG = "wrong-team"'],
  ["scripts/rcap-production-url-reclassify.mjs", 'const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg"', 'const PRODUCTION_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"'],
  ["scripts/rcap-production-url-reclassify.mjs", 'candidateOrigins.size !== 1', 'candidateOrigins.size < 1'],
  ["scripts/rcap-production-url-reclassify.mjs", 'candidateValues.size !== 1', 'candidateValues.size < 1'],
  ["scripts/rcap-production-url-reclassify.mjs", 'candidateValues.add(match[1])', 'candidateValues.add(parsed.origin)'],
  ["scripts/rcap-production-url-reclassify.mjs", 'sensitiveEnvironmentVariablePolicy === "on"', 'sensitiveEnvironmentVariablePolicy === "ignored"'],
  ["scripts/rcap-production-url-reclassify.mjs", 'currentEntry.type === "sensitive"', 'Boolean(currentEntry.type)'],
  ["scripts/rcap-production-url-reclassify.mjs", "const productionBearingEntries = keyEntries.filter", "const productionEntries = keyEntries.filter"],
  ["scripts/rcap-production-url-reclassify.mjs", "function sharedTargetsAreExact(entry)", "function sharedTargetsIgnored(entry)"],
  ["scripts/rcap-production-url-reclassify.mjs", "active_environment_operation_detected", "active_operations_ignored"],
  ["scripts/rcap-production-url-reclassify.mjs", 'createHash("sha256")', 'createHash("sha1")'],
  ["scripts/rcap-production-url-reclassify.mjs", 'type: "sensitive",\n    target: ["preview"]', 'type: "sensitive",\n    target: ["production"]'],
  ["scripts/rcap-production-url-reclassify.mjs", "body: previewBody", "body: productionBody"],
  ["scripts/rcap-production-url-reclassify.mjs", "async function rollbackAtomicSplit", "async function skipAtomicRollback"],
  ["scripts/rcap-production-url-reclassify.mjs", "!initialEnvironmentIds.has(entry.id)", "initialEnvironmentIds.has(entry.id)"],
  ["scripts/rcap-production-url-reclassify.mjs", "rollback_original_state_verified", "rollback_verification_ignored"],
  ["scripts/rcap-production-url-reclassify.mjs", "const developmentEntriesUnchanged =", "const developmentEntriesIgnored ="],
  ["scripts/rcap-production-url-reclassify.mjs", 'type: "encrypted"', 'type: "sensitive"'],
  ["scripts/rcap-production-url-reclassify.mjs", 'type: "encrypted",\n    target: ["production"]', 'type: "encrypted",\n    target: ["production", "preview"]'],
  ["scripts/rcap-production-url-reclassify.mjs", 'productionDatabaseMutated: false', 'productionDatabaseMutated: true'],
  [".github/workflows/rcap-production-url-reclassify.yml", "node scripts/rcap-production-url-reclassify.mjs", "npm test"]
];

const sourceRoot = process.cwd();
for (const [index, [file, from, to]] of mutations.entries()) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `rcap-production-url-mutation-${index}-`));
  try {
    for (const relative of files) {
      const source = path.join(sourceRoot, relative);
      const destination = path.join(tempRoot, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
    const target = path.join(tempRoot, file);
    const original = fs.readFileSync(target, "utf8");
    if (!original.includes(from)) throw new Error(`mutation ${index + 1} target is missing`);
    fs.writeFileSync(target, original.replace(from, to));
    const result = spawnSync(process.execPath, [path.join(tempRoot, "scripts/verify-rcap-production-url-reclassify.mjs")], {
      cwd: tempRoot,
      encoding: "utf8"
    });
    if (result.status === 0) throw new Error(`mutation ${index + 1} escaped verification`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log(`test-rcap-production-url-reclassify-mutations passed: ${mutations.length}/${mutations.length}`);
