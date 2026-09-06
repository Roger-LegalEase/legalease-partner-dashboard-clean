#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateExternalTestDatabase } from "./lib/rcap-ephemeral-pg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const safe = {
  RCAP_ALLOW_LOCAL_TEST_DATABASE: "true",
  RCAP_EXTERNAL_TEST_DATABASE_URL: "postgresql://test_verifier:test_password@127.0.0.1:5432/rcap_test_admin"
};
assert.equal(validateExternalTestDatabase(safe).hostname, "127.0.0.1");
for (const env of [
  { ...safe, RCAP_ALLOW_LOCAL_TEST_DATABASE: "false" },
  { ...safe, RCAP_EXTERNAL_TEST_DATABASE_URL: "postgresql://test_verifier:x@example.com/rcap_test_admin" },
  { ...safe, RCAP_EXTERNAL_TEST_DATABASE_URL: "postgresql://operator:x@127.0.0.1/postgres" },
  { ...safe, STRIPE_SECRET_KEY: "synthetic-production-shaped-value" }
]) assert.throws(() => validateExternalTestDatabase(env), /UNAVAILABLE/);

for (const phase of [52, 53]) {
  const migration = path.join(root, `supabase/phase-${phase}-rcap-consumer-${phase === 52 ? "payment-authority" : "job-binding"}.sql`);
  const before = createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  let output = "";
  try {
    execFileSync(process.execPath, [`scripts/test-rcap-phase${phase}-mutations.mjs`], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, RCAP_ALLOW_LOCAL_TEST_DATABASE: "true", RCAP_EXTERNAL_TEST_DATABASE_URL: "postgresql://test_verifier:x@nonlocal.invalid/rcap_test_admin" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    assert.fail(`Phase ${phase} unavailable baseline unexpectedly succeeded`);
  } catch (error) {
    output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    assert.equal(error.status, 2);
  }
  assert.match(output, /BASELINE_UNAVAILABLE/);
  assert.doesNotMatch(output, /caught|SURVIVED|killed/i);
  assert.equal(createHash("sha256").update(fs.readFileSync(migration)).digest("hex"), before);
}

console.log("platform-verification-runtime self-tests passed");
