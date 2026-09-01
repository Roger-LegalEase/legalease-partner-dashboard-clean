#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = [
  ".github/workflows/rcap-production-canary.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-production-canary-smoke.mjs",
  "scripts/verify-rcap-production-smoke.mjs"
];
const mutations = [
  ["staged deployment", "dpl_DGDUFV4B7ufTAW5wsfR2txJE2dVL", "dpl_wrongstaged"],
  ["rollback deployment", "dpl_9WoA51v3wXSvG3VmBKGUEKtVBCfS", "dpl_wrongrollback"],
  ["Production project", "wwtwtsmywnckfkdaqqeg", "hyflxnlhpmiqxvvcoiia"],
  ["staged identity", "exact_staged_application_worker_identity", "staged_identity_removed"],
  ["rollback readiness", "rollback_target_is_ready_and_still_active", "rollback_readiness_removed"],
  ["runtime project", "runtime_supabase_origin_is_canonical", "runtime_project_removed"],
  ["health", "staged_health_is_200", "health_removed"],
  ["Clinic readback", "production_clinic_schema_direct_readback", "clinic_readback_removed"],
  ["Colorado commerce boundary", "colorado_juvenile_guidance_has_no_commerce", "commerce_boundary_removed"],
  ["Clinic isolation", "clinic_negative_control_isolated", "isolation_removed"],
  ["Clinic reset", "clinic_reset_boundary_passed", "reset_removed"],
  ["transaction rollback", "transactional_synthetic_fixture_rolled_back", "rollback_removed"],
  ["real participants", "realParticipantRecordsCreated: false", "realParticipantRecordsCreated: true"],
  ["real charges", "realChargesCreated: false", "realChargesCreated: true"]
];

for (const [name, from, to] of mutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-production-smoke-mutation-"));
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
    const result = spawnSync(process.execPath, ["scripts/verify-rcap-production-smoke.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, RCAP_PRODUCTION_SMOKE_VERIFY_ROOT: root },
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, `${name}: verifier accepted mutation`);
    console.log(`ok   ${name} mutation is rejected`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
console.log(`test-rcap-production-smoke-mutations passed: ${mutations.length}/${mutations.length}`);
