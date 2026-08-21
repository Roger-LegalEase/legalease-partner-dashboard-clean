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
  // the canonical top-level batch this reviewer emits; the batch id is unique to
  // shard c, so these three files collide with no other session's paths.
  'data/rcap-all50/pdf-independent-reviews/wave-c-shard-c-manifest.json',
  'data/rcap-all50/pdf-independent-reviews/wave-c-shard-c-group-1.review.json',
  'data/rcap-all50/pdf-independent-reviews/wave-c-shard-c-verdicts.json',
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
  // the source must be recomputed from bytes and agree with every pinned identity
  check(h.sourceRecomputeStatus === 'verified', `${v.familyId}: source recompute status is ${h.sourceRecomputeStatus}, expected verified`);
  const bundle = process.env.RCAP_BUNDLE_EXTRACT;
  if (!bundle) { failures.push('RCAP_BUNDLE_EXTRACT is not set — source verification cannot be re-proven'); }
  else {
    const src = `${bundle}/${h.sourceArchivePath}`;
    if (!existsSync(src)) { failures.push(`${v.familyId}: source absent at ${src}`); }
    else {
      const got = sha256(src);
      check(got === h.sourceSha256RecomputedByThisReviewer, `${v.familyId}: source sha drifted — disk ${got}, record ${h.sourceSha256RecomputedByThisReviewer}`);
      check(got === h.sourceSha256Pinned, `${v.familyId}: source sha does not match the pinned identity`);
      // and against the family's own records, not the pack manifest
      const rc = JSON.parse(readFileSync(`${pkg}/source-receipt.json`, 'utf8'));
      const sr = JSON.parse(readFileSync(`${pkg}/source-record.json`, 'utf8'));
      const sc = JSON.parse(readFileSync(`${pkg}/artifact-provenance.json`, 'utf8'));
      check(got === rc.sha256, `${v.familyId}: source sha disagrees with source-receipt.json`);
      check(got === sr.sha256, `${v.familyId}: source sha disagrees with source-record.json`);
      check(got === sc.sourceSha256, `${v.familyId}: source sha disagrees with artifact-provenance.json`);
    }
  }
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
// NB: do not trim() this — the porcelain status prefix is two columns plus a
// space, and trimming would eat the leading column of the first line.
const dirty = execFileSync('git', ['status', '--porcelain', '-z']).toString();
for (const entry of dirty.split('\0')) {
  if (!entry) continue;
  const p = entry.slice(3);
  check(ALLOWED_PATH_PREFIXES.some((a) => p.startsWith(a)), `non-review path dirty: ${p}`);
}
execFileSync('git', ['diff', '--check']);

// the private source corpus must never be committed
const tracked = execFileSync('git', ['ls-files', 'private/']).toString().trim();
check(tracked === '', 'private/ source corpus is tracked by git and must not be');

// 8. the canonical batch must agree with the shard record, family for family
const CANON = 'data/rcap-all50/pdf-independent-reviews/wave-c-shard-c-';
const canonManifest = JSON.parse(readFileSync(`${CANON}manifest.json`, 'utf8'));
const canonGroup = JSON.parse(readFileSync(`${CANON}group-1.review.json`, 'utf8'));
const canonRollup = JSON.parse(readFileSync(`${CANON}verdicts.json`, 'utf8'));
check(canonManifest.schemaVersion.startsWith('rcap-pdf-independent-review-batch/'),
  'canonical manifest carries the wrong schemaVersion prefix');
check(canonManifest.reviewerBranch !== canonManifest.reviewedLaneBranch,
  'canonical manifest is not independent: reviewer and reviewed branch are the same');
check(/^[0-9a-f]{40}$/.test(canonManifest.reviewedLaneHead), 'canonical manifest does not pin a 40-hex lane head');
const canonFamilies = canonManifest.families.map((f) => f.familyId).sort();
check(JSON.stringify(canonFamilies) === JSON.stringify([...assigned].sort()),
  'canonical manifest families do not match the frozen shard assignment');
const canonVerdicts = new Map(canonGroup.verdicts.map((v) => [v.family, v.verdict]));
for (const v of record.verdicts) {
  check(canonVerdicts.get(v.familyId) === v.verdict,
    `${v.familyId}: canonical verdict ${canonVerdicts.get(v.familyId)} disagrees with the shard record ${v.verdict}`);
}
for (const f of canonManifest.families) {
  const shard = record.verdicts.find((v) => v.familyId === f.familyId).pinnedHashes;
  check(f.sourceSha256 === shard.sourceSha256RecomputedByThisReviewer, `${f.familyId}: canonical sourceSha256 drifted`);
  check(f.fieldClassificationSha256 === shard.classificationSha256, `${f.familyId}: canonical classification sha drifted`);
  check(f.provenanceSha256 === shard.provenanceSidecarSha256, `${f.familyId}: canonical provenance sha drifted`);
  check(f.contactSheetSha256 === shard.contactSheetSha256, `${f.familyId}: canonical contact-sheet sha drifted`);
  for (const a of f.artifacts) check(/^[0-9a-f]{64}$/.test(a.sha256), `${f.familyId}: ${a.rel} has no SHA-256`);
}
check(canonRollup.totals.correction_required === record.totals.correction_required
  && canonRollup.totals.substantive_owner_decision_required === record.totals.substantive_owner_decision_required
  && canonRollup.totals.approved_platform_ready === record.totals.approved_platform_ready,
  'canonical rollup totals disagree with the shard record');

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
console.log('  source bytes recomputed and agreeing with every pinned identity; private/ uncommitted');
  console.log('  canonical batch wave-c-shard-c agrees with the shard record, family for family');
