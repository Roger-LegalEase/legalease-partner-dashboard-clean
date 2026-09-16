#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = [
  ".github/workflows/rcap-production-canary.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-production-canary.mjs"
];

const mutations = [
  ["application SHA", "3e3a528b5762ece971c53186d1a45a48e5633a9c", "0c4d8275cca6310329ab0d2b8f2f5bcb3435eb1b"],
  ["worker digest", "sha256:cb5e419bf741dec0158ee4fb8894d201d2054472f494e9e6edae872a2d96fed9", "sha256:07bb99a83e4c1b8e6d23d23103d0a1fe6d9bc49fc105a9c52a7a352a855c4832"],
  ["acceptance negative control", "hyflxnlhpmiqxvvcoiia", "wrongacceptanceproject"],
  ["canonical Production project", "wwtwtsmywnckfkdaqqeg", "wrongproductionproject"],
  ["accepted Preview deployment", "dpl_4MCQr3YdM2GuPHvcY8n4NzzGBajP", "dpl_wrongacceptedpreview"],
  ["environment separation verdict", "production_environment_is_separate_from_acceptance", "environment_separation_removed"],
  ["staged Production identity verdict", "staged_production_deployment_is_exact", "staged_identity_removed"],
  ["accepted Preview identity verdict", "accepted_preview_deployment_is_exact", "accepted_preview_identity_removed"],
  ["bounded runtime inspector", "inspectRuntimeSupabaseOrigin", "inspectUntrustedConfigurationValue"],
  ["exactly one runtime origin", "candidateOrigins.size !== 1", "candidateOrigins.size < 1"],
  ["canonical Production runtime verdict", "production_runtime_project_is_canonical", "production_runtime_identity_removed"],
  ["exact acceptance runtime verdict", "acceptance_preview_project_is_exact", "acceptance_runtime_identity_removed"],
  // The staged candidate is created through the REST transport, so the guard
  // that no Production domain can move is autoAssignCustomDomains: false, not
  // the CLI's --skip-domain. The old needle matched nothing and silently
  // stopped guarding anything.
  ["staged deployment cannot assign domains", "autoAssignCustomDomains: false", "autoAssignCustomDomains: true"],
  ["withdrawn decrypt gate stays absent", 'valueReadbackRequirement: "superseded"', 'valueReadbackRequirement: "decrypt=true"'],
  ["environment remains unchanged", "environmentVariableChanged: false", "environmentVariableChanged: true"],
  ["Production aliases remain unchanged", "productionAliasChanged: false", "productionAliasChanged: true"],
  ["origin is never persisted", "originPersisted: false", "originPersisted: true"],
  ["rollback verdict", "rollback_target_recorded_before_mutation", "rollback_not_recorded"],
  ["GET-only transport", 'method: "GET"', 'method: "POST"']
];

for (const [name, from, to] of mutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-production-mutation-"));
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
    assert.equal(mutated, true, `${name}: mutation target was absent`);
    const result = spawnSync(process.execPath, ["scripts/verify-rcap-production-canary.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, RCAP_PRODUCTION_VERIFY_ROOT: root },
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, `${name}: verifier accepted the mutation`);
    console.log(`ok   ${name} mutation is rejected`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log(`test-rcap-production-canary-mutations passed: ${mutations.length}/${mutations.length}`);
