#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = [
  ".github/workflows/rcap-production-canary.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-production-clinic-migrate.mjs",
  "scripts/verify-rcap-production-clinic-migrate.mjs"
];

const mutations = [
  ["Production project", "wwtwtsmywnckfkdaqqeg", "hyflxnlhpmiqxvvcoiia"],
  ["application SHA", "441ee3188ee52047a012232d8d11f890a09b4ac5", "041ee3188ee52047a012232d8d11f890a09b4ac5"],
  ["core hash", "5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef", "0e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef"],
  ["security hash", "9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835", "0a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835"],
  ["accounting hash", "9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010", "0fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010"],
  ["baseline readback", "baseline_phases_49_55_readback_passed", "baseline_readback_removed"],
  ["partial schema refusal", "clinic_schema_initial_state_is_empty_or_complete", "partial_schema_allowed"],
  ["exact order", "clinic_migrations_applied_in_exact_order", "migration_order_ignored"],
  ["RLS readback", "all_10_clinic_tables_exist_with_rls_enabled", "rls_readback_removed"],
  ["function readback", "all_22_clinic_functions_exist", "function_readback_removed"],
  ["participant safety", "realParticipantRecordsCreated: false", "realParticipantRecordsCreated: true"],
  ["charge safety", "realChargesCreated: false", "realChargesCreated: true"]
];

for (const [name, from, to] of mutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-production-clinic-mutation-"));
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
    const result = spawnSync(process.execPath, ["scripts/verify-rcap-production-clinic-migrate.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, RCAP_PRODUCTION_CLINIC_VERIFY_ROOT: root },
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, `${name}: verifier accepted mutation`);
    console.log(`ok   ${name} mutation is rejected`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log(`test-rcap-production-clinic-migrate-mutations passed: ${mutations.length}/${mutations.length}`);
