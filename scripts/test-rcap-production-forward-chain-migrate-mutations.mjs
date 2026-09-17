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
    "62425c837b5edf3d7e22b110910885abdaec1692",
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
  // These two strings live only in the authorization record, which does not
  // exist between a release's readback and its measured record. They are marked
  // rather than dropped: when the record is absent the case announces itself as
  // not proven instead of quietly mutating nothing and passing.
  [
    "drop authorization",
    "\"dropAuthorized\": false",
    "\"dropAuthorized\": true",
    { needsAuthorizationRecord: true }
  ],
  [
    "authorization status",
    "\"status\": \"authorized_production_incident\"",
    "\"status\": \"pending\"",
    { needsAuthorizationRecord: true }
  ]
];

// The authorization record is absent between a release's readback and the
// moment its measured record is written, so a copy that demanded it would make
// this proof unrunnable in exactly the window the proof matters most.
const stageRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-forward-chain-mutation-"));
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const destination = path.join(root, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
  }
  return root;
};

// The verifier is run with the phase unset unless a case sets one, which is the
// authorization-required path. A case that wants the read-only phase has to ask
// for it by name, the same way the workflow does.
const runVerifier = (root, phase = "") => spawnSync(
  process.execPath,
  ["scripts/verify-rcap-production-forward-chain-migrate.mjs"],
  { cwd: process.cwd(), env: { ...process.env, RCAP_FORWARD_CHAIN_VERIFY_ROOT: root, RCAP_PRODUCTION_PHASE: phase }, encoding: "utf8" }
);

let passed = 0;

let skipped = 0;

for (const [name, from, to, options = {}] of mutations) {
  if (options.needsAuthorizationRecord && !fs.existsSync("data/rcap-production-forward-chain-migration-authorization.json")) {
    console.log(`SKIP ${name} mutation — NOT PROVEN: this case mutates the authorization record, and no record exists yet. It runs again the moment this release's measured record is written, before any apply.`);
    skipped += 1;
    continue;
  }
  const root = stageRoot();
  try {
    let mutated = false;
    for (const file of files) {
      const target = path.join(root, file);
      if (!fs.existsSync(target)) continue;
      const source = fs.readFileSync(target, "utf8");
      if (source.includes(from)) { fs.writeFileSync(target, source.replaceAll(from, to)); mutated = true; }
    }
    assert.equal(mutated, true, `${name}: mutation target absent`);
    const result = runVerifier(root);
    assert.notEqual(result.status, 0, `${name}: verifier accepted mutation`);
    console.log(`ok   ${name} mutation is rejected`);
    passed += 1;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// The phase gate itself. Deleting the authorization record is the strongest
// mutation available against it, so each of these removes the record outright
// and then varies only the phase. Exactly one phase value may proceed.
const authorizationPath = "data/rcap-production-forward-chain-migration-authorization.json";
const phaseCases = [
  ["no phase", "", false],
  ["an unexpected phase", "forward_chain_migrate_please", false],
  ["the apply phase", "forward_chain_migrate", false],
  ["a truncated read-only phase", "forward_chain_readbac", false],
  ["a suffixed read-only phase", "forward_chain_readback_apply", false],
  ["the capitalised read-only phase", "Forward_Chain_Readback", false],
  ["the exact read-only phase", "forward_chain_readback", true],
  // Trimmed on purpose: a workflow input can arrive with surrounding
  // whitespace, and trimming cannot turn one phase into another.
  ["the read-only phase with surrounding whitespace", "  forward_chain_readback\n", true]
];

for (const [name, phase, shouldPass] of phaseCases) {
  const root = stageRoot();
  try {
    fs.rmSync(path.join(root, authorizationPath), { force: true });
    const result = runVerifier(root, phase);
    if (shouldPass) {
      assert.equal(result.status, 0, `${name}: verifier refused a read-only readback that needs no apply authorization\n${result.stdout}${result.stderr}`);
      console.log(`ok   a missing authorization record is permitted by ${name}`);
    } else {
      assert.notEqual(result.status, 0, `${name}: verifier accepted a missing authorization record`);
      console.log(`ok   a missing authorization record is refused by ${name}`);
    }
    passed += 1;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// A record that exists is examined in every phase, the read-only one included,
// so the gate above can never leave a wrong record unchecked.
{
  const root = stageRoot();
  try {
    if (fs.existsSync(path.join(root, authorizationPath))) {
      const target = path.join(root, authorizationPath);
      fs.writeFileSync(target, fs.readFileSync(target, "utf8").replaceAll("\"dropAuthorized\": false", "\"dropAuthorized\": true"));
      const result = runVerifier(root, "forward_chain_readback");
      assert.notEqual(result.status, 0, "a present record escaped checking in the read-only phase");
      console.log("ok   a present authorization record is still checked in the read-only phase");
      passed += 1;
    } else {
      console.log("skip a present authorization record is still checked in the read-only phase — no record on disk yet");
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log(
  `test-rcap-production-forward-chain-migrate-mutations passed: ${passed}/${passed}`
  + (skipped ? `; ${skipped} record-dependent case(s) NOT PROVEN until the measured authorization record exists` : "")
);
