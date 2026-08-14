#!/usr/bin/env node
// Proves the F1 run's marked log evidence is real, complete and honest.
//
// The evidence artifact and the marked log block must say the SAME thing: a
// coding terminal that cannot reach the artifact CDN reads the log instead, so
// the two must not be allowed to drift. This verifier is the thing that stops
// a marked block from being decorative — it re-derives the totals from the
// per-case results rather than trusting the printed numbers, so a fabricated
// pass count fails here even though the JSON parses.
//
// Usage:  node scripts/verify-f1-evidence-markers.mjs <marked-log> [summary.json]
//         node scripts/verify-f1-evidence-markers.mjs --self-test

import fs from "node:fs";

const BEGIN = "F1_EVIDENCE_JSON_BEGIN";
const END = "F1_EVIDENCE_JSON_END";

export const MANDATORY_CASES = [
  "baseline_schema_complete",
  "migration_hashes_match",
  "migrations_apply_in_order",
  "auth_healthy_real_users",
  "storage_healthy_private",
  "email_captured_mailpit",
  "browser_role_person_access_denied",
  "cross_tenant_access_denied",
  "payment_write_denied_to_participant",
  "sponsored_partner_seeded",
  "corruption_detected",
  "worker_digest_runs_and_drains",
  "route_disabled_by_default",
  "scoped_refused_in_production_runtime",
  "route_scoped_refuses_outsiders",
  "rollback_restores_disabled"
];

const MANDATORY_FIELDS = [
  "workflowRunId", "toolsSha", "applicationSha", "workerSourceSha", "workerDigest",
  "baselineSchemaComplete", "migrations", "cases", "totals", "results",
  "syntheticIds", "generatedAtUtc"
];

// A secret reaching the log is a hard failure, not a warning.
const FORBIDDEN = [
  /eyJ[A-Za-z0-9_-]{20,}\./,          // JWT (anon / service-role key)
  /sk_(?:live|test)_[A-Za-z0-9]{8,}/, // Stripe secret key
  /whsec_[A-Za-z0-9]{8,}/,            // Stripe webhook secret
  /gh[pusor]_[A-Za-z0-9]{20,}/,       // GitHub token
  /postgres(?:ql)?:\/\/[^\s"]*:[^\s"]*@/ // connection string carrying a password
];

export function extract(text) {
  const b = text.indexOf(BEGIN);
  const e = text.indexOf(END);
  if (b === -1) throw new Error("missing F1_EVIDENCE_JSON_BEGIN marker");
  if (e === -1) throw new Error("missing F1_EVIDENCE_JSON_END marker");
  if (e < b) throw new Error("markers out of order");
  return text.slice(b + BEGIN.length, e).trim();
}

export function validate(text, summaryJson = null) {
  const problems = [];
  const raw = extract(text);

  let doc;
  try { doc = JSON.parse(raw); }
  catch (err) { throw new Error(`marked block is not valid JSON: ${err.message}`); }

  for (const f of MANDATORY_FIELDS) {
    if (doc[f] === undefined || doc[f] === null) problems.push(`missing field: ${f}`);
  }

  const cases = doc.cases ?? {};
  for (const id of MANDATORY_CASES) {
    if (!(id in cases)) problems.push(`missing mandatory case: ${id}`);
    else if (!["pass", "fail"].includes(cases[id]?.result)) problems.push(`case ${id} has no pass/fail result`);
  }

  if (doc.baselineSchemaComplete?.result !== "pass") {
    problems.push(`baseline_schema_complete is '${doc.baselineSchemaComplete?.result}', must be pass`);
  }
  if (doc.baselineSchemaComplete?.detail?.assertedBeforePhase49 !== true) {
    problems.push("baseline case did not assert it ran before phase 49");
  }

  // Totals are re-derived, never trusted: a fabricated count fails here.
  const entries = Object.entries(cases);
  const derivedPassed = entries.filter(([, v]) => v?.result === "pass").length;
  const derivedFailed = entries.filter(([, v]) => v?.result === "fail").length;
  const derivedSkipped = MANDATORY_CASES.filter((id) => !(id in cases)).length;
  const t = doc.totals ?? {};
  if (t.passed !== derivedPassed) problems.push(`totals.passed=${t.passed} but ${derivedPassed} cases are pass (fabricated count)`);
  if (t.failed !== derivedFailed) problems.push(`totals.failed=${t.failed} but ${derivedFailed} cases are fail (fabricated count)`);
  if (t.skipped !== derivedSkipped) problems.push(`totals.skipped=${t.skipped} but ${derivedSkipped} mandatory cases absent`);
  if (t.skipped !== 0) problems.push(`skipped must be 0, got ${t.skipped}`);
  if (derivedFailed !== 0) problems.push(`${derivedFailed} case(s) failed`);

  if (!Array.isArray(doc.migrations) || doc.migrations.length !== 6) {
    problems.push(`migrations must list all six phases, got ${Array.isArray(doc.migrations) ? doc.migrations.length : "none"}`);
  } else {
    for (const m of doc.migrations) {
      if (!/^[0-9a-f]{64}$/.test(m.actual ?? "")) problems.push(`phase ${m.phase}: no recomputed sha256`);
      if (m.actual !== m.recorded) problems.push(`phase ${m.phase}: hash drift`);
    }
  }

  for (const pattern of FORBIDDEN) {
    if (pattern.test(raw)) problems.push(`marked evidence contains a secret matching ${pattern}`);
  }

  if (summaryJson !== null) {
    let written;
    try { written = JSON.parse(summaryJson); }
    catch (err) { throw new Error(`written summary is not valid JSON: ${err.message}`); }
    // Substance, not formatting: the artifact and the log must agree on every
    // case result and on the totals.
    const a = JSON.stringify({ cases: written.cases, totals: written.totals, baseline: written.baselineSchemaComplete?.result });
    const b = JSON.stringify({ cases: doc.cases, totals: doc.totals, baseline: doc.baselineSchemaComplete?.result });
    if (a !== b) problems.push("marked log evidence and the written artifact summary disagree");
  }

  return { doc, problems };
}

function selfTest() {
  const good = {
    generatedAtUtc: "2026-08-12T00:00:00.000Z", workflowRunId: "1", toolsSha: "a".repeat(40),
    applicationSha: "b".repeat(40), workerSourceSha: "c".repeat(40), workerDigest: "sha256:" + "d".repeat(64),
    baselineSchemaComplete: { result: "pass", detail: { assertedBeforePhase49: true, missing: [] } },
    migrations: [49, 50, 51, 52, 53, 54].map((phase) => ({ phase, path: `p${phase}`, recorded: "e".repeat(64), actual: "e".repeat(64) })),
    cases: Object.fromEntries(MANDATORY_CASES.map((id) => [id, { result: "pass", observed: "ok" }])),
    totals: { required: 16, recorded: 16, passed: 16, failed: 0, skipped: 0 },
    results: { auth: "pass" }, syntheticIds: { partnerSlug: "rcap-staging-sandbox" }
  };
  const wrap = (o) => `noise\n${BEGIN}\n${JSON.stringify(o)}\n${END}\ntrailing`;
  const cases = [];
  const expect = (name, fn, shouldThrowOrFail) => {
    let failed = false;
    try { const { problems } = fn(); failed = problems.length > 0; }
    catch { failed = true; }
    const ok = failed === shouldThrowOrFail;
    cases.push([name, ok]);
  };

  expect("valid evidence passes", () => validate(wrap(good), JSON.stringify(good)), false);
  expect("missing BEGIN marker fails", () => validate(`${JSON.stringify(good)}\n${END}`), true);
  expect("missing END marker fails", () => validate(`${BEGIN}\n${JSON.stringify(good)}`), true);
  expect("malformed JSON fails", () => validate(`${BEGIN}\n{ not json,,\n${END}`), true);
  expect("missing baseline case fails", () => {
    const bad = structuredClone(good); delete bad.cases.baseline_schema_complete;
    bad.totals.passed = 15; bad.totals.skipped = 1;
    return validate(wrap(bad));
  }, true);
  expect("failing baseline case fails", () => {
    const bad = structuredClone(good); bad.baselineSchemaComplete.result = "fail";
    bad.cases.baseline_schema_complete.result = "fail"; bad.totals.passed = 15; bad.totals.failed = 1;
    return validate(wrap(bad));
  }, true);
  expect("fabricated pass count fails", () => {
    const bad = structuredClone(good); bad.totals.passed = 99;
    return validate(wrap(bad));
  }, true);
  expect("nonzero skipped fails", () => {
    const bad = structuredClone(good); bad.totals.skipped = 1;
    return validate(wrap(bad));
  }, true);
  expect("hash drift fails", () => {
    const bad = structuredClone(good); bad.migrations[3].actual = "f".repeat(64);
    return validate(wrap(bad));
  }, true);
  expect("artifact/log disagreement fails", () => {
    const other = structuredClone(good); other.totals.passed = 15;
    return validate(wrap(good), JSON.stringify(other));
  }, true);
  expect("leaked service-role JWT fails", () => {
    const bad = structuredClone(good);
    bad.syntheticIds.leak = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payloadpayloadpayload";
    return validate(wrap(bad));
  }, true);
  expect("leaked connection string fails", () => {
    const bad = structuredClone(good);
    bad.syntheticIds.leak = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    return validate(wrap(bad));
  }, true);

  const red = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  if (red.length > 0) { console.error(`verify-f1-evidence-markers self-test FAILED: ${red.length}`); process.exit(1); }
  console.log(`verify-f1-evidence-markers self-test passed: ${cases.length}/${cases.length}`);
}

const argv = process.argv.slice(2);
if (argv[0] === "--self-test") { selfTest(); }
else if (argv.length === 0) { console.error("usage: verify-f1-evidence-markers.mjs <marked-log> [summary.json] | --self-test"); process.exit(2); }
else {
  const text = fs.readFileSync(argv[0], "utf8");
  const summary = argv[1] ? fs.readFileSync(argv[1], "utf8") : null;
  let result;
  try { result = validate(text, summary); }
  catch (err) { console.error(`verify-f1-evidence-markers FAILED: ${err.message}`); process.exit(1); }
  if (result.problems.length > 0) {
    console.error(`verify-f1-evidence-markers FAILED:\n  - ${result.problems.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`verify-f1-evidence-markers passed: ${Object.keys(result.doc.cases).length} cases, skipped=0, six migration hashes verified, no secrets present.`);
}
