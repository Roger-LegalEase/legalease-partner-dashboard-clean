#!/usr/bin/env node
// Did the ledger move underneath the frozen 55-row assignment?
//
//   node scripts/grade-a-route-obligation-census/diff-category-b-post-regeneration.mjs
//   node ... --check
//   node ... --mutations
//
// WHY THIS EXISTS
//
// The Category B assignment is frozen and traceable to one exact source blob.
// The national census ledger is not frozen — it is regenerated whenever the
// tree it describes changes, and integrating five family censuses changed it.
// Both of those are correct, and together they create the question this record
// answers: is the assignment a reviewer is holding still an accurate
// description of the routes it names?
//
// The wrong ways to answer it are worth naming, because both look tidy. One is
// to regenerate the assignment so it matches the new ledger, which silently
// changes what a reviewer was asked. The other is to leave the assignment
// pinned and never check, which is how a reviewer ends up revalidating an
// exclusion that has since been reclassified. This compares them instead, and
// refuses to be quiet about a difference.
//
// It makes no legal determination and changes no classification. It reports.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FROZEN = "data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json";
const CURRENT = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const OUT = "data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-post-regeneration-delta.json";
const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");

/**
 * A supersession record is how a route may legitimately leave the ledger: some
 * other route has to say it replaced it. Without one, a disappearance is a
 * silent replacement, and a reviewer holding the frozen assignment would be
 * revalidating a route that no longer exists.
 */
const SUPERSESSION_RECORDS = "data/rcap-grade-a/route-obligation-census-v1/route-supersessions.json";

// The classification fields whose movement actually matters to a revalidator.
// A changed publicLabel is noise; a changed category is the whole assignment.
const SUBSTANTIVE_FIELDS = [
  "possibleCategory",
  "possibleCategoryBReason",
  "classificationConfidence",
  "requiresLegalReview",
  "participantCanInitiate",
  "currentCommercialState"
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 512 }).trim();
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

const frozenText = read(FROZEN);
const frozen = JSON.parse(frozenText);
const currentText = read(CURRENT);
const current = JSON.parse(currentText);

const frozenLedgerBlob = frozen.generatedFrom.sourceGitBlobSha;
const frozenLedgerText = git(["cat-file", "blob", frozenLedgerBlob]);
const frozenLedger = JSON.parse(frozenLedgerText);
const frozenLedgerFingerprint = frozenLedger.metadata?.sourceFingerprint ?? null;
const currentFingerprint = current.metadata?.sourceFingerprint ?? null;
const fingerprintChanged = frozenLedgerFingerprint !== currentFingerprint;

const currentByKey = new Map((current.routes ?? []).map((row) => [row.routeKey, row]));
const supersessions = fs.existsSync(path.join(ROOT, SUPERSESSION_RECORDS))
  ? JSON.parse(read(SUPERSESSION_RECORDS))
  : { supersessions: [] };
const supersededBy = new Map((supersessions.supersessions ?? []).map((entry) => [entry.retiredRouteKey, entry]));

const rows = frozen.rows.map((frozenRow) => {
  const live = currentByKey.get(frozenRow.routeKey) ?? null;
  const exists = Boolean(live);
  const changed = [];
  if (live) {
    for (const field of SUBSTANTIVE_FIELDS) {
      const before = frozenRow[field] ?? null;
      const after = live[field] ?? null;
      if (JSON.stringify(before) !== JSON.stringify(after)) changed.push({ field, frozen: before, current: after });
    }
  }
  return {
    routeKey: frozenRow.routeKey,
    jurisdiction: frozenRow.jurisdiction,
    existsInCurrentLedger: exists,
    // Both sides of every field a revalidator's answer depends on, side by
    // side. Reporting only the current value would leave a reader unable to
    // tell whether it moved without going back to the frozen file to compare —
    // which is the comparison this record exists to have already done.
    frozenPossibleCategory: frozenRow.possibleCategory ?? null,
    currentPossibleCategory: live ? live.possibleCategory ?? null : null,
    frozenPossibleCategoryBReason: frozenRow.possibleCategoryBReason ?? null,
    currentPossibleCategoryBReason: live ? live.possibleCategoryBReason ?? null : null,
    frozenClassificationConfidence: frozenRow.classificationConfidence ?? null,
    currentClassificationConfidence: live ? live.classificationConfidence ?? null : null,
    sourceFingerprintChanged: fingerprintChanged,
    substantiveClassificationChanged: changed.length > 0,
    // Two names for one list: the field names, and the same entries with their
    // before and after. Neither is derived from the other at read time, so a
    // reader cannot be handed a summary that disagrees with its own detail.
    changedFields: changed.map((entry) => entry.field),
    exactChangedFields: changed,
    supersededBy: exists ? null : (supersededBy.get(frozenRow.routeKey) ?? null)
  };
});

// --- refusals -----------------------------------------------------------------
const problems = [];

for (const row of rows) {
  if (!row.existsInCurrentLedger && !row.supersededBy) {
    problems.push(`${row.routeKey} is gone from the current ledger with no supersession record; a frozen assignment row cannot simply vanish`);
  }
  // A reason or a confidence that moved must appear in exactChangedFields. If
  // the comparison says it changed but the enumeration is empty, the record is
  // describing less than it found.
  if (row.existsInCurrentLedger) {
    const live = currentByKey.get(row.routeKey);
    const frozenRow = frozen.rows.find((r) => r.routeKey === row.routeKey);
    const enumerated = new Set(row.exactChangedFields.map((entry) => entry.field));
    if ((frozenRow.possibleCategoryBReason ?? null) !== (live.possibleCategoryBReason ?? null)
      && !enumerated.has("possibleCategoryBReason")) {
      problems.push(`${row.routeKey}: the Category B reason changed but is not in exactChangedFields`);
    }
    if ((frozenRow.classificationConfidence ?? null) !== (live.classificationConfidence ?? null)
      && !enumerated.has("classificationConfidence")) {
      problems.push(`${row.routeKey}: the confidence changed but is not in exactChangedFields`);
    }
  }
}

// The summary and the detail must agree. A changedFields that has drifted from
// exactChangedFields is a record telling a reader two different stories.
for (const row of rows) {
  const detail = row.exactChangedFields.map((entry) => entry.field);
  if (JSON.stringify(row.changedFields) !== JSON.stringify(detail)) {
    problems.push(`${row.routeKey}: changedFields disagrees with exactChangedFields`);
  }
  if (row.substantiveClassificationChanged !== (detail.length > 0)) {
    problems.push(`${row.routeKey}: substantiveClassificationChanged disagrees with the enumerated fields`);
  }
}

// A route key that exists but names a different route is a silent replacement.
// routeContractId, runtimePathwayId, trackId and jurisdiction are the identity
// behind the key.
//
// The null handling here is deliberate and was wrong the first time. Skipping a
// field that is null in the frozen row made this check nearly vacuous: 50 of
// the 55 rows carry a null routeContractId, so for almost every row the
// comparison never ran. A null is not "no opinion" — it is the recorded state,
// and a route that acquires a contract id it did not have has had its identity
// filled in. So both transitions are detected, and they are treated
// differently: a value moving to a DIFFERENT value is a silent replacement and
// refuses, while a null being filled in is reported as a change for the
// revalidator to see rather than blocking the record.
const identityFilledIn = [];
for (const frozenRow of frozen.rows) {
  const live = currentByKey.get(frozenRow.routeKey);
  if (!live) continue;
  for (const field of ["routeContractId", "runtimePathwayId", "trackId", "jurisdiction"]) {
    const before = frozenRow[field] ?? null;
    const after = live[field] ?? null;
    if (before === after) continue;
    if (before === null) {
      identityFilledIn.push({ routeKey: frozenRow.routeKey, field, frozen: null, current: after });
      continue;
    }
    problems.push(`${frozenRow.routeKey}: ${field} moved from ${before} to ${after}; the key names a different route than it did`);
  }
}

// The frozen assignment must not have moved by one byte.
const frozenBlobNow = git(["hash-object", FROZEN]);
const frozenBlobCommitted = git(["rev-parse", `HEAD:${FROZEN}`]);
if (frozenBlobNow !== frozenBlobCommitted) {
  problems.push(`the frozen assignment changed: working blob ${frozenBlobNow} is not the committed ${frozenBlobCommitted}`);
}

const changedRows = rows.filter((row) => row.substantiveClassificationChanged);
const missingRows = rows.filter((row) => !row.existsInCurrentLedger);

const doc = {
  schemaVersion: "category-b-medium-confidence-post-regeneration-delta/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/diff-category-b-post-regeneration.mjs",
  question: "The national census ledger was regenerated after five family censuses were integrated. Is the frozen 55-row assignment still an accurate description of the routes it names?",
  whyBothCanBeRightAtOnce:
    "The assignment is frozen because a reviewer is holding it and it must stay traceable to one blob. The ledger is regenerated because it describes a tree that changed. Neither is wrong; the difference between them is what this record reports rather than resolves.",
  frozenAssignment: {
    path: FROZEN,
    committedBlob: frozenBlobCommitted,
    sha256: sha256(frozenText),
    pinnedLedgerBlob: frozenLedgerBlob,
    pinnedLedgerFingerprint: frozenLedgerFingerprint,
    rows: frozen.rows.length
  },
  currentLedger: {
    path: CURRENT,
    blob: git(["hash-object", CURRENT]),
    sha256: sha256(currentText),
    fingerprint: currentFingerprint,
    routes: (current.routes ?? []).length
  },
  sourceFingerprintChanged: fingerprintChanged,
  whatTheFingerprintChangeMeans: fingerprintChanged
    ? "The ledger's inputs changed — five family censuses were integrated, which is what moved it. A moved fingerprint is not by itself a moved classification; the per-route comparison below is what decides that."
    : "The ledger's inputs are unchanged since the assignment was frozen.",
  counts: {
    frozenRows: rows.length,
    stillPresent: rows.length - missingRows.length,
    missing: missingRows.length,
    substantivelyChanged: changedRows.length,
    unchanged: rows.length - changedRows.length - missingRows.length
  },
  identityFieldsCompared: ["routeContractId", "runtimePathwayId", "trackId", "jurisdiction"],
  identityFilledInSinceFreeze: identityFilledIn,
  whatIdentityFilledInMeans:
    "A field that was null when the assignment was frozen and now carries a value. Not a replacement and not a blocker — the route acquired an identity it did not have — but a revalidator should see it, because it is the difference between a route the ledger could not fully name and one it now can.",
  substantiveFieldsCompared: SUBSTANTIVE_FIELDS,
  whyOnlyThoseFields:
    "A changed publicLabel or a reordered requiredSourceIds does not change what a revalidator was asked. A changed category, reason, confidence, review flag, initiability or commercial state does.",
  grantsNothing: [
    "It makes no legal determination and changes no classification.",
    "It does not alter the frozen assignment, and refuses to run if the assignment has moved.",
    "It opens no route and changes no commercial state."
  ],
  rows
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);

if (problems.length > 0) {
  console.error(`category B post-regeneration delta: ${problems.length} problem(s)`);
  for (const problem of problems.slice(0, 15)) console.error(`  - ${problem}`);
  process.exit(1);
}

if (CHECK) {
  const currentOut = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (currentOut !== serialized) { console.error(`${OUT} is stale. Run the differ.`); process.exit(1); }
  console.log(`category B post-regeneration delta current: ${doc.counts.frozenRows} row(s), ${doc.counts.substantivelyChanged} substantively changed.`);
  process.exit(0);
}

if (MUTATIONS) { runMutations(); process.exit(0); }

fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
console.log(`  ${doc.counts.frozenRows} frozen row(s): ${doc.counts.stillPresent} still present, ${doc.counts.missing} missing`);
console.log(`  substantive classification changes: ${doc.counts.substantivelyChanged}`);
console.log(`  source fingerprint changed: ${fingerprintChanged}`);
console.log(`  frozen assignment blob: ${frozenBlobCommitted} (unchanged)`);

/** A refusal that cannot fire is not a refusal. */
function runMutations() {
  const original = fs.readFileSync(outPath);
  const cases = [
    { name: "a dropped row is caught", mutate: (json) => { json.rows.splice(0, 1); json.counts.frozenRows = json.rows.length; return json; } },
    { name: "a row silently marked unchanged is caught", mutate: (json) => { json.rows[1].substantiveClassificationChanged = !json.rows[1].substantiveClassificationChanged; return json; } },
    { name: "a stale current-ledger fingerprint is caught", mutate: (json) => { json.currentLedger.fingerprint = "sha256:" + "0".repeat(64); return json; } },
    { name: "a stale frozen-assignment blob is caught", mutate: (json) => { json.frozenAssignment.committedBlob = "0".repeat(40); return json; } }
  ];
  let undetected = 0;
  try {
    for (const testCase of cases) {
      fs.writeFileSync(outPath, JSON.stringify(testCase.mutate(JSON.parse(original.toString("utf8"))), null, 2) + "\n");
      let caught = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--check"], { cwd: ROOT, stdio: "pipe" }); }
      catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(outPath, original);
    }
  } finally { fs.writeFileSync(outPath, original); }
  const restored = fs.readFileSync(outPath).equals(original);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the delta check proves less than it claims."); process.exit(1); }
  console.log(`\nOK category B delta mutations — ${cases.length} case(s), every mutation caught.`);
}
