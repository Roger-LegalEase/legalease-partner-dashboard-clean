#!/usr/bin/env node
// Focused independent-review verifier for Gate B Wave C, shard c.
// Reviewer-owned. Verifies the review record only; it never inspects or repairs
// implementation paths and it never promotes anything.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = 'data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/';
const REVIEWED_BRANCH = 'claude/rcap-pdf-family-rerender-mounted';
const VOCAB = new Set([
  'approved_platform_ready',
  'correction_required',
  'substantive_owner_decision_required',
]);
const ALLOWED_PATH_PREFIXES = [
  'data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/',
  'docs/record-clearing/pdf-independent-reviews/wave-c-shard-c/',
];

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const assignment = JSON.parse(readFileSync(ROOT + 'assignment.json', 'utf8'));
const record = JSON.parse(readFileSync(ROOT + 'verdicts.json', 'utf8'));

// 1. exactly four assigned families, each accounted for exactly once
const assigned = assignment.assignedFamilies;
check(assigned.length === 4, `expected 4 assigned families, got ${assigned.length}`);
const seen = new Map();
for (const v of record.verdicts) seen.set(v.familyId, (seen.get(v.familyId) ?? 0) + 1);
for (const fid of assigned) check(seen.get(fid) === 1, `family ${fid} appears ${seen.get(fid) ?? 0} times, expected exactly 1`);
check(record.verdicts.length === 4, `expected 4 verdicts, got ${record.verdicts.length}`);
for (const v of record.verdicts) check(assigned.includes(v.familyId), `verdict for unassigned family ${v.familyId}`);

// 2. the frozen denominator and the slice rule still agree
check(assignment.frozenFamilyIds.length === 16, `expected a 16-family denominator, got ${assignment.frozenFamilyIds.length}`);
const sorted = [...assignment.frozenFamilyIds].sort();
check(JSON.stringify(sorted) === JSON.stringify(assignment.frozenFamilyIds), 'frozen family ids are not lexicographically sorted');
const slice = sorted.slice(assignment.sliceRule.start, assignment.sliceRule.end);
check(JSON.stringify(slice) === JSON.stringify(assigned), 'assigned families do not match the shard slice');
check(!assigned.includes('NE:dc-1-15-form-en'), 'shard includes NE DC-1-15, which is held back');
check(assignment.overlapChecks.overlapWithOtherShards.length === 0, 'shard overlaps another shard');

// 3. every hash referenced by the review matches disk
for (const v of record.verdicts) {
  const h = v.pinnedHashes;
  const pkg = h.familyPackagePath;
  const pairs = [
    ['production-field-map.json', h.fieldMapSha256],
    ['field-classification.json', h.classificationSha256],
    ['artifact-provenance.json', h.provenanceSidecarSha256],
    ['fixtures/canonical-filled.pdf', h.canonicalArtifactSha256],
    ['fixtures/boundary-filled.pdf', h.boundaryArtifactSha256],
    ['contact-sheet/blank-vs-filled.pdf', h.contactSheetSha256],
  ];
  for (const [rel, want] of pairs) {
    const p = `${pkg}/${rel}`;
    if (!existsSync(p)) { failures.push(`${v.familyId}: missing ${p}`); continue; }
    const got = sha256(p);
    check(got === want, `${v.familyId}: ${rel} sha mismatch — disk ${got}, record ${want}`);
  }
  for (const r of h.allPageRasterManifest) {
    if (!existsSync(r.path)) { failures.push(`${v.familyId}: missing raster ${r.path}`); continue; }
    const got = sha256(r.path);
    check(got === r.sha256, `${v.familyId}: raster page ${r.page} sha mismatch — disk ${got}, record ${r.sha256}`);
  }
  check(h.allPageRasterManifest.length > 0, `${v.familyId}: no raster pages recorded`);
  // the source digest is carried forward unverified and must say so
  check(h.sourceSha256RecomputedByThisReviewer === null && h.sourceRecomputeStatus === 'impossible_corpus_absent',
    `${v.familyId}: source recompute status must record that the corpus was absent`);
}

// 4. verdict vocabulary
for (const v of record.verdicts) check(VOCAB.has(v.verdict), `${v.familyId}: invalid verdict ${v.verdict}`);

// 5. a correction verdict must name family, artifact, page, field, observed, required, smallest correction
for (const v of record.verdicts) {
  if (v.verdict === 'approved_platform_ready') continue;
  check(Array.isArray(v.corrections) && v.corrections.length > 0, `${v.familyId}: no corrections named`);
  for (const c of v.corrections ?? []) {
    for (const k of ['family', 'artifact', 'page', 'field', 'observed', 'required', 'smallestCorrection']) {
      check(c[k] !== undefined && c[k] !== null && c[k] !== '', `${v.familyId}: correction missing ${k}`);
    }
  }
  if (v.verdict === 'substantive_owner_decision_required') {
    check(v.ownerDecision && v.ownerDecision.question, `${v.familyId}: owner decision not stated`);
  }
}

// 6. historical objections are reviewed and preserved
for (const v of record.verdicts) {
  check((v.historicalObjectionReview ?? []).length > 0, `${v.familyId}: no historical objection review`);
  for (const o of v.historicalObjectionReview ?? []) {
    check(o.escalationId && o.originalObjection && o.reviewerFinding, `${v.familyId}: incomplete objection review`);
    check(o.historicalRecordPreserved === true, `${v.familyId}: historical record not marked preserved`);
  }
}

// 7. reviewer branch is distinct from the reviewed branch, and only review paths changed
const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
check(branch !== REVIEWED_BRANCH, `reviewer branch must differ from the reviewed branch ${REVIEWED_BRANCH}`);
const base = record.reviewBaseCommit;
const changed = execFileSync('git', ['diff', '--name-only', `${base}`, 'HEAD']).toString().trim();
for (const p of changed ? changed.split('\n') : []) {
  check(ALLOWED_PATH_PREFIXES.some((a) => p.startsWith(a)), `non-review path changed: ${p}`);
}
const untracked = execFileSync('git', ['status', '--porcelain']).toString().trim();
for (const line of untracked ? untracked.split('\n') : []) {
  const p = line.slice(3);
  check(ALLOWED_PATH_PREFIXES.some((a) => p.startsWith(a)), `non-review path dirty: ${p}`);
}
execFileSync('git', ['diff', '--check']);

if (failures.length) {
  console.error('FOCUSED INDEPENDENT-REVIEW VERIFIER: FAIL');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('FOCUSED INDEPENDENT-REVIEW VERIFIER: PASS');
console.log(`  shard c, base ${record.reviewBaseCommit.slice(0, 8)}, branch ${branch}`);
console.log(`  ${record.verdicts.length} families, each accounted for exactly once`);
console.log(`  approved ${record.totals.approved_platform_ready}, correction ${record.totals.correction_required}, owner decision ${record.totals.substantive_owner_decision_required}`);
console.log('  all referenced map, classification, sidecar, artifact, contact-sheet and raster hashes match disk');
