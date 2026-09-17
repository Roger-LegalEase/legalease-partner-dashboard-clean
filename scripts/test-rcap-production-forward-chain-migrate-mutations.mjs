#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = [
  ".github/workflows/rcap-production-canary.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-production-forward-chain-migrate.mjs",
  "data/rcap-production-forward-chain-migration-authorization.json"
];

const mutations = [
  [
    "Production project",
    "wwtwtsmywnckfkdaqqeg",
    "hyflxnlhpmiqxvvcoiia"
  ],
  [
    "application SHA",
    "0fee79bd127eb3dc072c2a35945177fa7e7b6683",
    "0dc8df2341c99c44d7646578505eed170daa5c8d"
  ],
  [
    "migration hash",
    "9d4cfcc1849585ad609fe04547cdaf2186582e7369fac1c4868d414de1f9113c",
    "9d4cfcc1849585ad609fe04547cdaf2186582e7369fac1c4868d414de1f9113d"
  ],
  [
    "ledger baseline readback",
    "migration_ledger_carries_the_recovered_baseline",
    "ledger_ignored"
  ],
  [
    "unledgered prior step reconciliation",
    "unledgered_prior_steps_reconciled_against_objects",
    "prior_steps_ignored"
  ],
  [
    "unsafe gap refusal",
    "forward_chain_gaps_cannot_clobber_later_definitions",
    "order_ignored"
  ],
  [
    "late-apply clobber guard",
    "_late_apply_cannot_clobber_later_definitions",
    "_late_apply_unguarded"
  ],
  [
    "ledger-only re-execution guard",
    "&& migration.signature.kind === \"ledger\"",
    "&& true"
  ],
  [
    "non-unique signature",
    "signature: { kind: \"column\", table: \"consumer_packet_artifact_provenance\", name: \"superseded_artifacts\" }",
    "signature: { kind: \"function\", name: \"finalize_sponsored_packet_generation_for_route\" }"
  ],
  [
    "independent authorization",
    "independent_production_authorization_names_the_exact_chain",
    "authorization_ignored"
  ],
  [
    "existing-row revocation bound",
    "existing_row_revocation_within_the_owner_accepted_bound",
    "revocation_unbounded"
  ],
  [
    "read-only phase",
    "readback_phase_wrote_nothing",
    "readback_may_write"
  ],
  [
    "drop safety",
    "structureDropped: false",
    "structureDropped: true"
  ],
  [
    "drop authorization",
    "\"dropAuthorized\": false",
    "\"dropAuthorized\": true"
  ],
  [
    "authorization status",
    "\"status\": \"authorized_production_incident\"",
    "\"status\": \"pending\""
  ]
];

for (const [name, from, to] of mutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-forward-chain-mutation-"));
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
    const result = spawnSync(process.execPath, ["scripts/verify-rcap-production-forward-chain-migrate.mjs"], { cwd: process.cwd(), env: { ...process.env, RCAP_FORWARD_CHAIN_VERIFY_ROOT: root }, encoding: "utf8" });
    assert.notEqual(result.status, 0, `${name}: verifier accepted mutation`);
    console.log(`ok   ${name} mutation is rejected`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log(`test-rcap-production-forward-chain-migrate-mutations passed: ${mutations.length}/${mutations.length}`);
