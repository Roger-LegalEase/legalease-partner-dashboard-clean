#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  assertMeaningfulMutationOutcome,
  classifyVerifierOutcome
} from "./lib/rcap-verifier-outcome.mjs";

const passPattern = /phase verifier passed/;
const failPattern = /phase verifier FAILED: semantic assertion/;

assert.equal(classifyVerifierOutcome({ status: 0, output: "phase verifier passed" }, passPattern, failPattern), "green");
assert.equal(classifyVerifierOutcome({ status: 1, output: "phase verifier FAILED: semantic assertion" }, passPattern, failPattern), "red");
assert.equal(classifyVerifierOutcome({ status: 1, output: "markerless nonzero" }, passPattern, failPattern), "invalid");
assert.equal(classifyVerifierOutcome({ status: 1, output: "SyntaxError: unexpected token" }, passPattern, failPattern), "invalid");
assert.equal(classifyVerifierOutcome({ status: 1, output: "ENOENT: missing phase migration.sql" }, passPattern, failPattern), "invalid");
assert.equal(classifyVerifierOutcome({ status: 1, output: "EACCES: permission denied" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: 1, output: "ENOSPC: no space left on device" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: 0, output: "SKIPPED: no ephemeral PostgreSQL available" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: 1, output: "requires a local PostgreSQL toolchain" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: 1, output: "Cannot find package '@electric-sql/pglite'" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: 1, output: "PGlite command 0 timed out" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: 1, output: "PGlite command 2 returned an invalid response" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: null, signal: "SIGKILL", output: "" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: null, error: new Error("spawn EACCES"), output: "" }, passPattern, failPattern), "unavailable");
assert.equal(classifyVerifierOutcome({ status: 0, output: "unexpected success without proof marker" }, passPattern, failPattern), "invalid");
assert.equal(assertMeaningfulMutationOutcome({ state: "red", output: "formal semantic failure" }), true);
assert.throws(() => assertMeaningfulMutationOutcome({ state: "invalid", output: "SyntaxError" }), /neither a passing base nor a caught mutation/);
assert.throws(() => assertMeaningfulMutationOutcome({ state: "unavailable", output: "ENOSPC" }), /neither a passing base nor a caught mutation/);

console.log("RCAP verifier outcome classification passed.");
