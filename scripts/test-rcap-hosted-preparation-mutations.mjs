#!/usr/bin/env node
// #42: mutate only an isolated copy; a green baseline is required for credit.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-preparation-mutations-"));
const testFile = "rcap-hosted-acceptance-preparation.test.mjs";
const deployFile = "rcap-hosted-acceptance-deploy.mjs";
const originals = new Map([testFile, deployFile, "rcap-hosted-acceptance-prepare.mjs", "rcap-hosted-acceptance-worker-input-plan.mjs"].map(name => [name, fs.readFileSync(path.join(root, "scripts", name), "utf8")]));
try {
  fs.mkdirSync(path.join(fixture, "scripts"));
  // Read existing Git objects, without checking out or changing any source.
  const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: root, encoding: "utf8" }).trim();
  fs.symlinkSync(gitDir, path.join(fixture, ".git"));
  for (const name of fs.readdirSync(path.join(root, "scripts"))) {
    if (!originals.has(name)) fs.symlinkSync(path.join(root, "scripts", name), path.join(fixture, "scripts", name));
  }
  const restore = () => {
    for (const [name, source] of originals) fs.writeFileSync(path.join(fixture, "scripts", name), source);
  };
  const run = () => spawnSync(process.execPath, ["--test", "--test-reporter=tap", path.join(fixture, "scripts", testFile)], {
    cwd: fixture, encoding: "utf8", timeout: 60000
  });
  restore();
  const baseline = run();
  assert.equal(baseline.status, 0, `Unmutated control must pass: ${baseline.stdout}\n${baseline.stderr}`);
  const mutations = [
    ["retired worker source", testFile, 'const CANONICAL_ACCEPTED_SOURCE = "117b469c453a403fbd217f1c441a08c7c68f6b3a"', 'const CANONICAL_ACCEPTED_SOURCE = "5ac0d8d6910aec3dc6259b2d4da6931abc5af7e8"', "same worker source SHA"],
    ["non-equivalent candidate", testFile, 'const EVIDENCE_ONLY_CANDIDATE = "b3bbb4a6b274e373f904815d87f5cee10d16f847"', 'const EVIDENCE_ONLY_CANDIDATE = "247687a7d9238349f94dbbc490249903f19838ca"', "distinct evidence-only SHA"],
    ["candidate compared with itself", testFile, 'const EVIDENCE_ONLY_CANDIDATE = "b3bbb4a6b274e373f904815d87f5cee10d16f847"', "const EVIDENCE_ONLY_CANDIDATE = CANONICAL_ACCEPTED_SOURCE", "distinct evidence-only SHA"],
    ["scope hash removed from REST metadata", deployFile, "rcapStagingScopeSha256: sha256(SCOPE_IDS)", 'rcapStagingScopeSha256: "unbound"', "Mississippi Preview preparation"],
    ["scope reuse comparison removed", deployFile, "d.meta?.rcapStagingScopeSha256 === sha256(SCOPE_IDS)", "true", "Mississippi Preview preparation"],
    ["metadata omitted from REST invocation", deployFile, "meta: deploymentMeta", "meta: {}", "Mississippi Preview preparation"]
  ];
  for (const [name, file, before, after, expectedTest] of mutations) {
    restore();
    const source = originals.get(file);
    assert.equal(source.split(before).length, 2, `${name}: mutation must apply exactly once`);
    fs.writeFileSync(path.join(fixture, "scripts", file), source.replace(before, after));
    const result = run();
    assert.equal(result.status, 1, `${name}: expected assertion failure, not crash/timeout`);
    assert.match(result.stdout, new RegExp(`not ok \\d+ - ${expectedTest}`), `${name}: wrong failure reason`);
    assert.match(result.stdout, /ERR_ASSERTION/);
    console.log(`PASS mutation: ${name}`);
  }
  console.log(`PASS #42: green baseline; ${mutations.length}/${mutations.length} mutations caught`);
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
