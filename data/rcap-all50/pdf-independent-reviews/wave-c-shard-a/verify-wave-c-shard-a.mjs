#!/usr/bin/env node
// Focused independent-review verification for Gate B Wave C shard A.
// Reviewer-owned. Reads only; asserts the review record is internally sound and
// that every hash it pins still matches the bytes on disk.
//
//   node data/rcap-all50/pdf-independent-reviews/wave-c-shard-a/verify-wave-c-shard-a.mjs
//
// Source-byte checks run only when the private corpus is present; the corpus is
// gitignored, so its absence is reported as skipped rather than failed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "../../../..");
const VOCAB = new Set(["approved_platform_ready", "correction_required", "substantive_owner_decision_required"]);
const EXPECTED = ["AK:tf-800-form-en", "AK:tf-805-form-en", "KY:aoc-334-form-en", "KY:aoc-496-3-form-en"];
const DIRS = {
  "AK:tf-800-form-en": "data/rcap-all50/overlays/production/alaska/tf-800-form-en",
  "AK:tf-805-form-en": "data/rcap-all50/overlays/production/alaska/tf-805-form-en",
  "KY:aoc-334-form-en": "data/rcap-all50/overlays/production/kentucky/aoc-334-form-en",
  "KY:aoc-496-3-form-en": "data/rcap-all50/overlays/production/kentucky/aoc-496-3-form-en"
};
const FILES = {
  fieldMapFileSha256: "production-field-map.json",
  classificationFileSha256: "field-classification.json",
  sidecarSha256: "artifact-provenance.json",
  canonicalArtifactSha256: "fixtures/canonical-filled.pdf",
  boundaryArtifactSha256: "fixtures/boundary-filled.pdf",
  contactSheetSha256: "contact-sheet/blank-vs-filled.pdf",
  contactSheetProofSha256: "contact-sheet/contact-sheet-proof.json",
  sourceRecordSha256: "source-record.json",
  sourceReceiptSha256: "source-receipt.json"
};
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const fails = [];
const skips = [];
let checks = 0;
const check = (ok, msg) => { checks++; if (!ok) fails.push(msg); };

const assignment = JSON.parse(fs.readFileSync(path.join(HERE, "shard-assignment.json"), "utf8"));
const record = JSON.parse(fs.readFileSync(path.join(HERE, "verdicts.json"), "utf8"));

// 1. four assigned families accounted for exactly once, no NE DC-1-15
const seen = record.verdicts.map((v) => v.familyId);
check(seen.length === 4, `expected 4 verdicts, found ${seen.length}`);
check(new Set(seen).size === seen.length, "a family is reviewed more than once");
for (const f of EXPECTED) check(seen.includes(f), `assigned family missing a verdict: ${f}`);
for (const f of seen) {
  check(EXPECTED.includes(f), `verdict for a family outside this shard: ${f}`);
  check(!/DC-1-15/i.test(f), `NE DC-1-15 must not be reviewed by this shard: ${f}`);
}
check(assignment.assignmentBasis.familiesAssigned.join() === EXPECTED.join(),
  "assignment record and expected shard slice disagree");

// 2. verdict vocabulary valid
for (const v of record.verdicts) check(VOCAB.has(v.verdict), `invalid verdict vocabulary: ${v.familyId} -> ${v.verdict}`);

// 3. every referenced hash matches disk
const corpusRoot = path.join(REPO, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const corpusPresent = fs.existsSync(corpusRoot);
for (const v of record.verdicts) {
  const dir = path.join(REPO, DIRS[v.familyId]);
  for (const [key, rel] of Object.entries(FILES)) {
    const p = path.join(dir, rel);
    if (!fs.existsSync(p)) { fails.push(`missing file for ${v.familyId}: ${rel}`); checks++; continue; }
    check(sha(p) === v.pinnedHashes[key], `${v.familyId} ${rel}: pinned ${key} no longer matches disk`);
  }
  // field-map bindings semantic hash, the referent the sidecar actually uses
  const map = JSON.parse(fs.readFileSync(path.join(dir, "production-field-map.json"), "utf8"));
  const bindingsHash = crypto.createHash("sha256").update(Buffer.from(JSON.stringify(map.bindings), "utf8")).digest("hex");
  check(bindingsHash === v.pinnedHashes.fieldMapBindingsSemanticSha256,
    `${v.familyId}: bindings-array semantic hash drifted`);
  const sidecar = JSON.parse(fs.readFileSync(path.join(dir, "artifact-provenance.json"), "utf8"));
  check(sidecar.fieldMapSha256 === bindingsHash, `${v.familyId}: sidecar fieldMapSha256 no longer reproduces from the committed map`);
  check(sidecar.sourceSha256 === v.sourceIdentity.sourceSha256, `${v.familyId}: sidecar pinned source hash changed`);
  // source bytes, when the private corpus is available
  const src = path.join(REPO, v.sourceIdentity.archivePath);
  if (corpusPresent && fs.existsSync(src)) {
    check(sha(src) === v.sourceIdentity.sourceSha256, `${v.familyId}: official source bytes no longer match the pinned source identity`);
  } else {
    skips.push(`${v.familyId}: source-byte recomputation skipped (private corpus not present)`);
  }
}

// 4. corrections are actionable: each names family, artifact, page, field, observed, required, smallest
for (const v of record.verdicts) {
  if (v.verdict !== "correction_required") { check(v.corrections.length === 0, `${v.familyId}: non-correction verdict carries corrections`); continue; }
  check(v.corrections.length > 0, `${v.familyId}: correction_required with no correction named`);
  for (const c of v.corrections) {
    for (const k of ["family", "artifact", "page", "fieldOrRectangle", "observedResult", "requiredResult", "smallestCorrection"]) {
      check(c[k] !== undefined && c[k] !== null && String(c[k]).length > 0, `${v.familyId}: correction missing ${k}`);
    }
  }
}

// 5. approvals pin the full evidence set
for (const v of record.verdicts) {
  if (v.verdict !== "approved_platform_ready") continue;
  for (const k of ["fieldMapFileSha256", "classificationFileSha256", "sidecarSha256", "canonicalArtifactSha256",
                   "boundaryArtifactSha256", "contactSheetSha256", "fieldMapBindingsSemanticSha256"]) {
    check(/^[0-9a-f]{64}$/.test(v.pinnedHashes[k] || ""), `${v.familyId}: approval missing pinned ${k}`);
  }
  check(v.allPagesInspected === true, `${v.familyId}: approval without all-page inspection`);
  check(Object.keys(v.reviewerRasterSha256).length === v.relevantPageCount,
    `${v.familyId}: approval raster count does not cover every relevant page`);
  check(v.structuralResult.flattened && !v.structuralResult.xfa && !v.structuralResult.javaScript,
    `${v.familyId}: approval without a clean structural result`);
  check(Object.values(v.protectedRegionResult).every((x) => x === true),
    `${v.familyId}: approval with a non-blank protected region`);
}

for (const s of skips) console.log(`SKIP  ${s}`);
if (fails.length) {
  console.error(`\nFAIL  ${fails.length} of ${checks} checks failed:`);
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nPASS  ${checks} checks; 4 families accounted for exactly once; vocabulary valid; every pinned hash matches disk.`);
