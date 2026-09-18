#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = [
  ".github/workflows/rcap-production-canary.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-production-activate.mjs",
  "scripts/verify-rcap-production-activation.mjs"
];
const mutations = [
  ["staged deployment", "dpl_BrnF7PUSzZvojpCqhBHd3oFR4rXz", "dpl_wrongstaged"],
  ["rollback deployment", "dpl_A6YmB9G6LJGYFrt3xj3ZFKxC5yXM", "dpl_wrongrollback"],
  ["smoke run", "35300111459", "32900000000"],
  // The superseded set specifically, not just any wrong value. This is the
  // failure the release actually hit: the previous staged candidate became the
  // live deployment, so reusing the old pins would have promoted Production onto
  // itself against a smoke run that never tested this release. Each of the three
  // is a rejected mutation rather than a silent regression.
  ["superseded staged deployment", "dpl_BrnF7PUSzZvojpCqhBHd3oFR4rXz", "dpl_A6YmB9G6LJGYFrt3xj3ZFKxC5yXM"],
  ["superseded rollback deployment", "dpl_A6YmB9G6LJGYFrt3xj3ZFKxC5yXM", "dpl_DjAscmNucgJHauNsTtpbzGp9zfpU"],
  ["superseded smoke run", "35300111459", "35248212982"],
  ["Production project", "wwtwtsmywnckfkdaqqeg", "hyflxnlhpmiqxvvcoiia"],
  ["application SHA", "1f9e1e9a8654c7c41ddae64fad230b55b5912620", "0c4d8275cca6310329ab0d2b8f2f5bcb3435eb1b"],
  ["worker digest", "sha256:94adca2182ea841e7b6942d597569e8e3132b239abe1d8bf208cdda6f3449369", "sha256:07bb99a83e4c1b8e6d23d23103d0a1fe6d9bc49fc105a9c52a7a352a855c4832"],
  ["smoke proof", "successful_smoke_artifact_is_exact", "smoke_proof_removed"],
  ["rollback active", "rollback_is_ready_and_active_before_promotion", "rollback_active_removed"],
  ["staged identity", "staged_deployment_identity_is_exact", "staged_identity_removed"],
  ["Clinic schema", "production_clinic_schema_is_exact", "clinic_schema_removed"],
  ["domain activation", "production_domains_resolve_to_staged_deployment", "domain_activation_removed"],
  ["canonical runtime domain", "canonicalRuntimeDomain", "unboundedRuntimeDomain"],
  ["bounded runtime retry", "fetchWithRetry", "fetchWithoutRetry"],
  ["health", "active_production_health_is_200", "health_removed"],
  ["runtime project", "active_runtime_project_is_canonical", "runtime_project_removed"],
  ["environment unchanged", "environment_metadata_is_unchanged", "environment_unchanged_removed"],
  ["automatic rollback", "automaticRollback", "rollbackDisabled"],
  ["rollback restoration", "rollback_domains_restored", "rollback_restoration_removed"]
];

for (const [name, from, to] of mutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-production-activation-mutation-"));
  try {
    for (const file of files) {
      const destination = path.join(root, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(file, destination);
    }
    let mutated = false;
    for (const file of files) {
      const target = path.join(root, file);
      const source = fs.readFileSync(target, "utf8");
      if (source.includes(from)) {
        fs.writeFileSync(target, source.replaceAll(from, to));
        mutated = true;
      }
    }
    assert.equal(mutated, true, `${name}: mutation target absent`);
    const result = spawnSync(process.execPath, ["scripts/verify-rcap-production-activation.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, RCAP_PRODUCTION_ACTIVATION_VERIFY_ROOT: root },
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, `${name}: verifier accepted mutation`);
    console.log(`ok   ${name} mutation is rejected`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
console.log(`test-rcap-production-activation-mutations passed: ${mutations.length}/${mutations.length}`);
