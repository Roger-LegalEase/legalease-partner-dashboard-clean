// Verifies the render job contract module and, most importantly, that its
// status machine has not drifted from the shared contract.
//
// The phase-49 migration lives on a separate migration branch, because
// assertSourceEngineChangeScope treats `supabase/` as production-forbidden and
// this engine branch must not change it. Both sides therefore verify against
// data/rcap-render/state-machine.json rather than against each other: this
// script checks the TypeScript, and the migration branch checks the SQL. Two
// artifacts pinned to one fixture cannot drift even while they live apart, and
// neither branch needs to read the other.
//
// Pure Node plus the repo's TypeScript loader. No database, no network.

import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(rootDir, "data/rcap-render/state-machine.json");

const contract = await import("../src/lib/rcap/render/job-contract.ts");
const {
  RENDER_JOB_STATUSES,
  RENDER_JOB_TRANSITIONS,
  CREDITABLE_STATUSES,
  RENDER_JOB_ERROR_CODES,
  canTransition,
  hasValidatedOutput,
  mayConsumeCredit,
  guardRenderInputs,
  validateRenderedPdf,
  shouldRetry,
  MAX_RENDER_ATTEMPTS
} = contract;

const checks = [];
function check(label, fn) {
  fn();
  checks.push(label);
}

// ---------------------------------------------------------------------------
// 1. The SQL and TypeScript transition tables must agree.
// ---------------------------------------------------------------------------

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

check("the shared state-machine fixture is present and well formed", () => {
  assert.ok(fixture.transitions && typeof fixture.transitions === "object");
  assert.ok(Array.isArray(fixture.statuses) && fixture.statuses.length > 0);
  assert.ok(Array.isArray(fixture.errorCodes) && fixture.errorCodes.length > 0);
});

check("TypeScript and fixture cover the same statuses", () => {
  assert.deepEqual([...RENDER_JOB_STATUSES].sort(), [...fixture.statuses].sort());
});

check("every transition arm matches the fixture exactly", () => {
  const fixtureFrom = Object.keys(fixture.transitions).sort();
  const tsFrom = Object.keys(RENDER_JOB_TRANSITIONS).sort();
  assert.deepEqual(tsFrom, fixtureFrom, "transition source states differ");
  for (const from of fixtureFrom) {
    assert.deepEqual(
      [...RENDER_JOB_TRANSITIONS[from]].sort(),
      [...fixture.transitions[from]].sort(),
      `transitions from '${from}' differ from the shared contract`
    );
  }
});

check("declared error codes match the fixture", () => {
  assert.deepEqual([...RENDER_JOB_ERROR_CODES].sort(), [...fixture.errorCodes].sort());
});

check("creditable statuses match the fixture", () => {
  assert.deepEqual([...CREDITABLE_STATUSES].sort(), [...fixture.creditableStatuses].sort());
});

// ---------------------------------------------------------------------------
// 2. Transition predicate.
// ---------------------------------------------------------------------------

check("the happy path is permitted step by step", () => {
  assert.equal(canTransition("queued", "claimed"), true);
  assert.equal(canTransition("claimed", "rendering"), true);
  assert.equal(canTransition("rendering", "validating"), true);
  assert.equal(canTransition("validating", "artifact_validated"), true);
  assert.equal(canTransition("artifact_validated", "delivered"), true);
});

check("a jump straight to a creditable state is refused", () => {
  assert.equal(canTransition("queued", "artifact_validated"), false);
  assert.equal(canTransition("claimed", "artifact_validated"), false);
  assert.equal(canTransition("rendering", "delivered"), false);
});

check("delivered is terminal and failed may only requeue", () => {
  assert.equal(RENDER_JOB_TRANSITIONS.delivered.length, 0);
  assert.deepEqual([...RENDER_JOB_TRANSITIONS.failed], ["queued"]);
});

// ---------------------------------------------------------------------------
// 3. The credit gate. This is the invariant the whole contract exists for.
// ---------------------------------------------------------------------------

const validated = {
  status: "artifact_validated",
  outputStoragePath: "rcap-document-packets-private/ms/packet.pdf",
  outputSha256: "c".repeat(64)
};

check("credit may move from a validated job with stored output", () => {
  assert.equal(mayConsumeCredit(validated), true);
  assert.equal(hasValidatedOutput(validated), true);
});

check("credit may not move from any non-creditable status", () => {
  for (const status of RENDER_JOB_STATUSES) {
    if (CREDITABLE_STATUSES.includes(status)) continue;
    assert.equal(
      mayConsumeCredit({ ...validated, status }),
      false,
      `credit moved from status '${status}'`
    );
  }
});

check("credit may not move without a storage path", () => {
  assert.equal(mayConsumeCredit({ ...validated, outputStoragePath: null }), false);
  assert.equal(mayConsumeCredit({ ...validated, outputStoragePath: "" }), false);
  assert.equal(mayConsumeCredit({ ...validated, outputStoragePath: "   " }), false);
});

check("credit may not move without a real sha256", () => {
  assert.equal(mayConsumeCredit({ ...validated, outputSha256: null }), false);
  assert.equal(mayConsumeCredit({ ...validated, outputSha256: "not-a-digest" }), false);
  assert.equal(mayConsumeCredit({ ...validated, outputSha256: "C".repeat(64) }), false);
});

// ---------------------------------------------------------------------------
// 4. Input guard: only whitelisted sources and known profiles are rendered.
// ---------------------------------------------------------------------------

const allowed = ["a".repeat(64)];
const profiles = { "ms-petition": ["1.0.0", "1.1.0"] };

check("a whitelisted source and known profile version passes", () => {
  const r = guardRenderInputs({
    sourceSha256: "a".repeat(64),
    profileId: "ms-petition",
    profileVersion: "1.0.0",
    allowedSourceSha256: allowed,
    knownProfileVersions: profiles
  });
  assert.equal(r.ok, true);
});

check("an unwhitelisted source is refused", () => {
  const r = guardRenderInputs({
    sourceSha256: "b".repeat(64),
    profileId: "ms-petition",
    profileVersion: "1.0.0",
    allowedSourceSha256: allowed,
    knownProfileVersions: profiles
  });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "source_not_whitelisted");
});

check("a malformed source digest is refused rather than rendered", () => {
  const r = guardRenderInputs({
    sourceSha256: "../../etc/passwd",
    profileId: "ms-petition",
    profileVersion: "1.0.0",
    allowedSourceSha256: allowed,
    knownProfileVersions: profiles
  });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "source_not_whitelisted");
});

check("an unknown profile id or version is refused", () => {
  assert.equal(
    guardRenderInputs({
      sourceSha256: "a".repeat(64),
      profileId: "unknown",
      profileVersion: "1.0.0",
      allowedSourceSha256: allowed,
      knownProfileVersions: profiles
    }).errorCode,
    "profile_unknown"
  );
  assert.equal(
    guardRenderInputs({
      sourceSha256: "a".repeat(64),
      profileId: "ms-petition",
      profileVersion: "9.9.9",
      allowedSourceSha256: allowed,
      knownProfileVersions: profiles
    }).errorCode,
    "profile_unknown"
  );
});

// ---------------------------------------------------------------------------
// 5. Output validation, applied to bytes read back out of storage.
// ---------------------------------------------------------------------------

const pdfBytes = new TextEncoder().encode("%PDF-1.7\n...body...");
const textBytes = new TextEncoder().encode("Petition for expungement\nplain text, not a PDF");
const digest = "d".repeat(64);

check("a real PDF with a matching digest validates", () => {
  const r = validateRenderedPdf({
    bytes: pdfBytes,
    expectedSha256: digest,
    actualSha256: digest,
    expectedPageCount: 3,
    countPages: () => 3
  });
  assert.equal(r.ok, true);
  assert.equal(r.pageCount, 3);
});

check("a text/plain artifact is rejected as not a PDF", () => {
  // This is precisely what the current generate path produces and calls ready.
  const r = validateRenderedPdf({
    bytes: textBytes,
    expectedSha256: digest,
    actualSha256: digest,
    countPages: () => 1
  });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "invalid_pdf_output");
});

check("empty stored bytes are rejected", () => {
  const r = validateRenderedPdf({
    bytes: new Uint8Array(),
    expectedSha256: digest,
    actualSha256: digest,
    countPages: () => 1
  });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "invalid_pdf_output");
});

check("a digest mismatch between recorded and stored bytes is rejected", () => {
  const r = validateRenderedPdf({
    bytes: pdfBytes,
    expectedSha256: digest,
    actualSha256: "e".repeat(64),
    countPages: () => 3
  });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "checksum_mismatch");
});

check("a page count mismatch is rejected", () => {
  const r = validateRenderedPdf({
    bytes: pdfBytes,
    expectedSha256: digest,
    actualSha256: digest,
    expectedPageCount: 4,
    countPages: () => 3
  });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "page_count_mismatch");
});

check("an unreadable page structure is rejected rather than assumed valid", () => {
  const r = validateRenderedPdf({
    bytes: pdfBytes,
    expectedSha256: digest,
    actualSha256: digest,
    countPages: () => {
      throw new Error("corrupt xref");
    }
  });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "invalid_pdf_output");
});

// ---------------------------------------------------------------------------
// 6. Retry policy.
// ---------------------------------------------------------------------------

check("transient failures retry until the attempt ceiling", () => {
  assert.equal(shouldRetry({ attemptCount: 1 }, "render_failed"), true);
  assert.equal(shouldRetry({ attemptCount: MAX_RENDER_ATTEMPTS }, "render_failed"), false);
});

check("input-shaped failures do not retry", () => {
  assert.equal(shouldRetry({ attemptCount: 0 }, "source_not_whitelisted"), false);
  assert.equal(shouldRetry({ attemptCount: 0 }, "profile_unknown"), false);
  assert.equal(shouldRetry({ attemptCount: 0 }, "protected_field_populated"), false);
});

// ---------------------------------------------------------------------------
// 7. The module must stay free of runtime dependencies.
// ---------------------------------------------------------------------------

check("the contract module imports nothing at runtime", () => {
  const source = fs.readFileSync(
    path.join(rootDir, "src/lib/rcap/render/job-contract.ts"),
    "utf8"
  );
  const imports = [...source.matchAll(/^\s*import\s+[^;]+;/gm)].map((m) => m[0]);
  assert.deepEqual(
    imports,
    [],
    `contract module must have no imports so it is safe before the migration applies; found: ${imports.join(" | ")}`
  );
});

console.log("RCAP render job contract verification passed.");
for (const label of checks) console.log(`  ok  ${label}`);
console.log(`\n${checks.length} checks passed.`);
