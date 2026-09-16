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
  ["staged deployment", "dpl_DGDUFV4B7ufTAW5wsfR2txJE2dVL", "dpl_wrongstaged"],
  ["rollback deployment", "dpl_9WoA51v3wXSvG3VmBKGUEKtVBCfS", "dpl_wrongrollback"],
  ["smoke run", "32967717618", "32900000000"],
  ["Production project", "wwtwtsmywnckfkdaqqeg", "hyflxnlhpmiqxvvcoiia"],
  ["application SHA", "61a2f018a9a444a24b3c1ee9533f4811bcfa56b6", "0c4d8275cca6310329ab0d2b8f2f5bcb3435eb1b"],
  ["worker digest", "sha256:477afe68b5d7dec8d4c2f550761b3491036950346bfc0c8654e7cf85460c4249", "sha256:07bb99a83e4c1b8e6d23d23103d0a1fe6d9bc49fc105a9c52a7a352a855c4832"],
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
