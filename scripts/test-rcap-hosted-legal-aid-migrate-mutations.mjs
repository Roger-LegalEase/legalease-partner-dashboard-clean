#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = [
  ".github/workflows/rcap-hosted-acceptance-staging.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-hosted-legal-aid-migrate.mjs",
  "scripts/rcap-legal-aid/contract.mjs",
  "data/rcap-staging-authorization-readiness.json"
];

const mutations = [
  [
    "acceptance project",
    "hyflxnlhpmiqxvvcoiia",
    "wwtwtsmywnckfkdaqqeg"
  ],
  [
    "migration hash",
    "91c9b887324ce36d0515357fef2b9ce19cef271c99c157e8004533c73015cce8",
    "91c9b887324ce36d0515357fef2b9ce19cef271c99c157e8004533c73015cce9"
  ],
  [
    "source commit",
    "f5c4f40022e422033985302995511da7157f474d",
    "f5c4f40022e422033985302995511da7157f474e"
  ],
  [
    "prerequisite readback",
    "clinic_mode_prerequisites_read_back_exact",
    "prerequisites_ignored"
  ],
  [
    "partial schema refusal",
    "legal_aid_schema_initial_state_is_empty_or_complete",
    "partial_schema_allowed"
  ],
  [
    "ledger agreement",
    "ledger_and_catalog_agree",
    "ledger_ignored"
  ],
  [
    "RLS readback",
    "all_12_legal_aid_tables_exist_with_rls_enabled",
    "rls_readback_removed"
  ],
  [
    "function readback",
    "all_32_legal_aid_functions_exist",
    "function_readback_removed"
  ],
  [
    "grant readback",
    "private_bucket_and_grants_read_back_tight",
    "grant_readback_removed"
  ],
  [
    "readiness status",
    "authorized_nonproduction_acceptance_only",
    "authorized_everywhere"
  ],
  [
    "production untouched",
    "productionTouched: false",
    "productionTouched: true"
  ],
  [
    "participant safety",
    "realParticipantRecordsCreated: false",
    "realParticipantRecordsCreated: true"
  ]
];

for (const [name, from, to] of mutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-legal-aid-mutation-"));
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
      if (source.includes(from)) { fs.writeFileSync(target, source.replaceAll(from, to)); mutated = true; }
    }
    assert.equal(mutated, true, `${name}: mutation target absent`);
    const result = spawnSync(process.execPath, ["scripts/verify-rcap-hosted-legal-aid-migrate.mjs"], { cwd: process.cwd(), env: { ...process.env, RCAP_LEGAL_AID_VERIFY_ROOT: root }, encoding: "utf8" });
    assert.notEqual(result.status, 0, `${name}: verifier accepted mutation`);
    console.log(`ok   ${name} mutation is rejected`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log(`test-rcap-hosted-legal-aid-migrate-mutations passed: ${mutations.length}/${mutations.length}`);
