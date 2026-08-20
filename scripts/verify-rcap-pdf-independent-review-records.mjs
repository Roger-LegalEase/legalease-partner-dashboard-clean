#!/usr/bin/env node
// The independent-review record verifier.
//
//   node scripts/verify-rcap-pdf-independent-review-records.mjs
//
// Condition 2 of the approval contract is "the review record passes the
// independent-review verifier", and this is that verifier — running the same
// validation the shared platform-ready gate runs, from the same implementation.
// If it reimplemented the checks there would be two definitions of a valid
// record and the gate could accept one the verifier rejected.
//
// It reports what each record would do at the gate as well, so a record that is
// structurally valid but cannot approve anything says why.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadReviewRecords,
  validateReviewRecords,
  reviewRecordApproval,
  REVIEW_APPROVED_VERDICT
} from "./rcap-official-forms/rcap-platform-ready.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEWS_DIR = path.join(rootDir, "data/rcap-all50/pdf-independent-reviews");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const AUDIT = path.join(rootDir, "data/rcap-all50/finalized-artifact-audit.json");
const CORPUS_ROOTS = [
  process.env.OFFICIAL_FORMS_SOURCE_DIR || null,
  path.join(rootDir, "private/source-imports"),
  path.join(rootDir, "private/Nationwide Record Clearing")
].filter((candidate) => candidate && fs.existsSync(candidate));

const validation = validateReviewRecords(REVIEWS_DIR);
if (!validation.ok) {
  console.error(`FAIL independent-review records — ${validation.problems.length} problem(s)`);
  for (const problem of validation.problems) console.error(`  ${problem.batchId}: ${problem.message}`);
  process.exit(1);
}

const { byFamily } = loadReviewRecords(REVIEWS_DIR);
const audit = fs.existsSync(AUDIT) ? JSON.parse(fs.readFileSync(AUDIT, "utf8")) : { families: [] };
const artifactsByFamily = new Map((audit.families ?? []).map((f) => [f.familyId, f.artifacts ?? []]));

const verdictTally = {};
const refusalTally = {};
let approved = 0;

for (const [familyId, records] of byFamily) {
  const newest = records[records.length - 1];
  const verdict = newest.verdict?.verdict ?? "no_verdict";
  verdictTally[verdict] = (verdictTally[verdict] || 0) + 1;

  const result = reviewRecordApproval({
    overlayDir: OVERLAY_DIR,
    reviewsDir: REVIEWS_DIR,
    rootDir,
    corpusRoots: CORPUS_ROOTS,
    familyIds: [familyId],
    artifacts: (artifactsByFamily.get(familyId) ?? []).filter((a) => a.present)
  });
  if (result.approved) {
    approved += 1;
    continue;
  }
  const condition = /condition (\d+) —/.exec(result.reason ?? "");
  const key = condition ? `condition ${condition[1]}` : "no record";
  refusalTally[key] = (refusalTally[key] || 0) + 1;
}

console.log(`  records: ${validation.batches} batch(es), ${validation.families} family record(s)`);
console.log(`  verdicts: ${Object.entries(verdictTally).map(([k, v]) => `${k}=${v}`).join(", ")}`);
console.log(`  would approve at the gate: ${approved}`);
if (Object.keys(refusalTally).length) {
  console.log(`  refused at: ${Object.entries(refusalTally).sort().map(([k, v]) => `${k} (${v})`).join(", ")}`);
}
console.log(
  `OK independent-review records — every record is structurally valid, independent and hash-bound; ` +
    `${approved} of ${validation.families} carry a current ${REVIEW_APPROVED_VERDICT} approval the gate accepts`
);
