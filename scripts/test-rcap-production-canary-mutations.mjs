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
  ["application SHA", "441ee3188ee52047a012232d8d11f890a09b4ac5", "041ee3188ee52047a012232d8d11f890a09b4ac5"],
  ["worker digest", "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c", "sha256:07132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c"],
  ["acceptance negative control", "hyflxnlhpmiqxvvcoiia", "wrongacceptanceproject"],
  ["environment separation verdict", "production_environment_is_separate_from_acceptance", "environment_separation_removed"],
  ["optional server URL match", "optional_server_supabase_url_matches_when_present", "optional_server_url_match_removed"],
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
