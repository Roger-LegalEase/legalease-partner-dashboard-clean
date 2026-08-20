#!/usr/bin/env node
// Focused independent-review verification for Gate B shard A, final pass.
// Reviewer-owned, read-only. Checks that final-verdicts.json is internally sound
// and that every hash it pins still matches the bytes at the reviewed base.
//
//   node data/rcap-all50/pdf-independent-reviews/wave-c-shard-a/verify-wave-c-shard-a.mjs
//
// The reviewed base is e94fb456, which is not this branch's HEAD: the reviewer
// branch is deliberately distinct from the reviewed branch. Family bytes are read
// out of git at that commit. Source bytes are checked only when the gitignored
// private corpus is present; otherwise reported as skipped.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "../../../..");
const record = JSON.parse(fs.readFileSync(path.join(HERE, "final-verdicts.json"), "utf8"));
const BASE = record.baseReviewed;
const VOCAB = new Set(["approved_platform_ready", "correction_required", "substantive_owner_decision_required"]);
const EXPECTED = ["AK:tf-800-form-en", "AK:tf-805-form-en", "KY:aoc-334-form-en", "KY:aoc-496-3-form-en"];
const DIRS = {
  "AK:tf-800-form-en": "data/rcap-all50/overlays/production/alaska/tf-800-form-en",
  "AK:tf-805-form-en": "data/rcap-all50/overlays/production/alaska/tf-805-form-en",
  "KY:aoc-334-form-en": "data/rcap-all50/overlays/production/kentucky/aoc-334-form-en",
  "KY:aoc-496-3-form-en": "data/rcap-all50/overlays/production/kentucky/aoc-496-3-form-en"
};
const FILES = {
  fieldMapSha256: "production-field-map.json",
  classificationSha256: "field-classification.json",
  sidecarSha256: "artifact-provenance.json",
  canonicalArtifactSha256: "fixtures/canonical-filled.pdf",
  boundaryArtifactSha256: "fixtures/boundary-filled.pdf",
  contactSheetSha256: "contact-sheet/blank-vs-filled.pdf",
  contactSheetProofSha256: "contact-sheet/contact-sheet-proof.json"
};
const fails = [], skips = [];
let checks = 0;
const check = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const shaBuf = (b) => crypto.createHash("sha256").update(b).digest("hex");
const atBase = (rel) => execFileSync("git", ["show", `${BASE}:${rel}`], { cwd: REPO, maxBuffer: 1 << 28 });

// base must be resolvable, or nothing below means anything
let baseOk = true;
try { execFileSync("git", ["cat-file", "-e", `${BASE}^{commit}`], { cwd: REPO }); }
catch { baseOk = false; }
check(baseOk, `reviewed base ${BASE} is not resolvable in this repository — fetch all remotes first`);
if (!baseOk) { console.error(`FAIL  base ${BASE} unresolvable`); process.exit(1); }

// reviewer branch must be distinct from the reviewed base
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO }).toString().trim();
const baseFull = execFileSync("git", ["rev-parse", `${BASE}^{commit}`], { cwd: REPO }).toString().trim();
check(head !== baseFull, "reviewer HEAD must be distinct from the reviewed base");

// four families, exactly once, no NE DC-1-15
const seen = record.verdicts.map((v) => v.familyId);
check(seen.length === 4, `expected 4 verdicts, found ${seen.length}`);
check(new Set(seen).size === seen.length, "a family is reviewed more than once");
for (const f of EXPECTED) check(seen.includes(f), `assigned family missing a verdict: ${f}`);
for (const f of seen) {
  check(EXPECTED.includes(f), `verdict outside this shard: ${f}`);
  check(!/DC-1-15/i.test(f), `NE DC-1-15 must not appear: ${f}`);
}
check(record.authoritative === true, "final record must be marked authoritative");

for (const v of record.verdicts) {
  check(VOCAB.has(v.verdict), `invalid verdict vocabulary: ${v.familyId} -> ${v.verdict}`);
  const dir = DIRS[v.familyId];
  for (const [key, rel] of Object.entries(FILES)) {
    let buf;
    try { buf = atBase(`${dir}/${rel}`); }
    catch { fails.push(`${v.familyId}: ${rel} not present at ${BASE}`); checks++; continue; }
    check(shaBuf(buf) === v.pinnedHashes[key], `${v.familyId} ${rel}: pinned ${key} does not match the bytes at ${BASE}`);
  }
  // sidecar must pin what we pinned
  const sc = JSON.parse(atBase(`${dir}/artifact-provenance.json`).toString("utf8"));
  check(sc.sourceSha256 === v.sourceIdentity.sourceSha256, `${v.familyId}: sidecar source hash disagrees with the verdict`);
  check(sc.fieldMapSha256 === v.pinnedHashes.fieldMapSha256, `${v.familyId}: sidecar fieldMapSha256 does not reproduce from the committed map`);
  check(sc.classificationSha256 === v.pinnedHashes.classificationSha256, `${v.familyId}: sidecar classificationSha256 does not reproduce`);
  // rerender claim must be consistent with the frozen hash
  const rr = v.rerenderStatus;
  check((rr.currentCanonicalSha256 === rr.historicallyFrozenCanonicalSha256) === (rr.reRenderedSinceCorrectionWave === false),
    `${v.familyId}: rerender claim contradicts the frozen-vs-current hashes`);
  check(rr.currentCanonicalSha256 === v.pinnedHashes.canonicalArtifactSha256,
    `${v.familyId}: rerenderStatus and pinnedHashes disagree on the canonical artifact`);
  // source bytes when the private corpus is available
  const src = path.join(REPO, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1", v.sourceIdentity.archiveRelPath);
  if (fs.existsSync(src)) check(shaBuf(fs.readFileSync(src)) === v.sourceIdentity.sourceSha256,
    `${v.familyId}: official source bytes do not match the pinned source identity`);
  else skips.push(`${v.familyId}: source-byte recomputation skipped (private corpus absent)`);
  // every historical objection carries a verified disposition
  check(Array.isArray(v.historicalObjections) && v.historicalObjections.length > 0, `${v.familyId}: no historical objections evaluated`);
  for (const h of v.historicalObjections) {
    for (const k of ["objectionId", "originalObjection", "closedByCurrentBytes", "howVerified"]) {
      check(h[k] !== undefined && h[k] !== null && String(h[k]).length > 0, `${v.familyId}: historical objection missing ${k}`);
    }
  }
  // corrections actionable
  if (v.verdict === "correction_required") {
    check(v.corrections.length > 0, `${v.familyId}: correction_required with no correction named`);
    for (const c of v.corrections) {
      for (const k of ["family", "artifact", "page", "fieldOrRectangle", "observedResult", "requiredResult", "smallestCorrection"]) {
        check(c[k] !== undefined && c[k] !== null && String(c[k]).length > 0, `${v.familyId}: correction missing ${k}`);
      }
    }
  } else {
    check(v.corrections.length === 0, `${v.familyId}: non-correction verdict carries corrections`);
    // an approval must close every historical objection and pin a full evidence set
    const open = v.historicalObjections.filter((h) => h.closedByCurrentBytes !== true).map((h) => h.objectionId);
    check(open.length === 0, `${v.familyId}: approved while historical objections remain open: ${open.join(", ")}`);
    check(v.allPagesInspected === true, `${v.familyId}: approval without all-page inspection`);
    check(Object.keys(v.reviewerRasterSha256).length === v.relevantPageCount,
      `${v.familyId}: approval rasters do not cover every relevant page`);
    check(v.structuralResult.flattened && !v.structuralResult.xfa && !v.structuralResult.javaScript
      && !v.structuralResult.additionalActions && !v.structuralResult.openAction,
      `${v.familyId}: approval without a clean structural result`);
    check(Object.values(v.protectedRegionResult).every((x) => x === true),
      `${v.familyId}: approval with a non-blank protected region`);
  }
}

for (const s of skips) console.log(`SKIP  ${s}`);
if (fails.length) {
  console.error(`\nFAIL  ${fails.length} of ${checks} checks failed:`);
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nPASS  ${checks} checks against base ${BASE}; 4 families accounted for exactly once; vocabulary valid; every pinned hash matches the reviewed bytes.`);
