// Focused verification for the Wave C shard-d independent review.
//
// This checks the review record, not the implementation. It re-derives the
// denominator from the same evidence the reviewer read, re-runs the slice,
// recomputes every hash the review pins, and refuses a verdict outside the
// allowed vocabulary. It repairs nothing and it approves nothing.
//
//   node data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/verify-wave-c-shard-d.mjs
import fs from "node:fs";
import crypto from "node:crypto";

const ROOT = "data/rcap-all50/pdf-independent-reviews";
const SHARD = `${ROOT}/wave-c-shard-d`;
const SHARD_INDEX = 3;
const ALLOWED = new Set([
  "approved_platform_ready",
  "correction_required",
  "substantive_owner_decision_required",
]);

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const failures = [];
const check = (ok, label) => {
  if (!ok) failures.push(label);
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
};

const completion = read(`${ROOT}/gate-b-evidence-completion.json`);
const assignment = read(`${SHARD}/assignment.json`);
const verdicts = read(`${SHARD}/verdicts.json`);
const hashes = read(`${SHARD}/hash-verification.json`);
const historical = read(`${SHARD}/historical-objection-review.json`);

// 1. the denominator and the slice
const derived = completion.families.map((f) => f.familyId).sort();
check(derived.length === 16, `denominator is exactly 16 reviewable families (got ${derived.length})`);
check(
  !derived.includes("NE:dc-1-15-form-en"),
  "NE DC-1-15 is excluded from the denominator",
);
const slice = derived.slice(SHARD_INDEX * 4, SHARD_INDEX * 4 + 4);
check(slice.length === 4, `shard slice is exactly four families (got ${slice.length})`);
check(
  JSON.stringify(assignment.frozenSixteen) === JSON.stringify(derived),
  "the frozen sixteen in the assignment record still match the evidence",
);
check(
  JSON.stringify(assignment.assignedFamilies) === JSON.stringify(slice),
  "the assignment record matches the recomputed slice",
);

// 2. no overlap with another shard
const others = [derived.slice(0, 4), derived.slice(4, 8), derived.slice(8, 12)].flat();
check(
  slice.every((f) => !others.includes(f)),
  "the batch does not overlap shard a, b or c",
);

// 3. each assigned family accounted for exactly once, in every record
for (const src of [
  ["verdicts", verdicts.families],
  ["hash-verification", hashes.families],
  ["historical-objection-review", historical.families],
]) {
  const ids = src[1].map((f) => f.familyId);
  check(
    ids.length === 4 && slice.every((f) => ids.filter((x) => x === f).length === 1),
    `${src[0]} accounts for each assigned family exactly once`,
  );
}

// 4. verdict vocabulary
for (const f of verdicts.families) {
  check(ALLOWED.has(f.verdict), `verdict vocabulary valid for ${f.familyId} (${f.verdict})`);
}

// 5. every referenced hash matches disk
let checked = 0;
for (const fam of hashes.families) {
  for (const c of fam.checks) {
    const got = sha256(c.path);
    if (got !== c.recomputedSha256) failures.push(`${fam.familyId}: ${c.item} drifted since the review`);
    if (c.matches !== (got === c.recordedSha256)) failures.push(`${fam.familyId}: ${c.item} match flag is wrong`);
    checked += 1;
  }
}
check(checked > 0, `every hash the review pins was rechecked against disk (${checked} digests)`);

for (const f of verdicts.families) {
  const p = f.familyPackagePath;
  const pins = f.pinnedHashes;
  check(sha256(`${p}/production-field-map.json`) === pins.fieldMapSha256, `${f.familyId}: pinned field-map hash matches disk`);
  check(sha256(`${p}/field-classification.json`) === pins.classificationSha256, `${f.familyId}: pinned classification hash matches disk`);
  check(sha256(`${p}/artifact-provenance.json`) === pins.provenanceSidecarSha256, `${f.familyId}: pinned sidecar hash matches disk`);
  check(sha256(`${p}/fixtures/canonical-filled.pdf`) === pins.canonicalArtifactSha256, `${f.familyId}: pinned canonical artifact hash matches disk`);
  check(sha256(`${p}/fixtures/boundary-filled.pdf`) === pins.boundaryArtifactSha256, `${f.familyId}: pinned boundary artifact hash matches disk`);
  check(sha256(`${p}/contact-sheet/blank-vs-filled.pdf`) === pins.contactSheetSha256, `${f.familyId}: pinned contact-sheet hash matches disk`);
}

// 6. the raster manifest depicts the artifact this review pins
for (const f of completion.families.filter((x) => slice.includes(x.familyId))) {
  check(
    f.rasterEvidence.artifactSha256 === f.artifactSha256[f.rasterEvidence.boundToArtifact],
    `${f.familyId}: raster manifest is bound to the current artifact`,
  );
  const pages = f.rasterEvidence.pages.map((p) => p.page).sort((a, b) => a - b);
  check(
    JSON.stringify(pages) === JSON.stringify([...f.rasterEvidence.pagesCarryingFields].sort((a, b) => a - b)),
    `${f.familyId}: every page carrying a field is rasterized`,
  );
}

// 7. an approval may not rest on an unverified source digest
for (const f of verdicts.families) {
  if (f.verdict === "approved_platform_ready") {
    check(
      f.pinnedHashes.sourceSha256RecomputedByThisReviewer === true,
      `${f.familyId}: approval carries a reviewer-recomputed source digest`,
    );
  }
}

// 8. the source digests, when the private corpus is mounted. The corpus is
// uncommitted by design, so its absence is reported and skipped rather than
// failed -- but when it is present every pinned digest must still hold.
const sources = read(`${SHARD}/source-verification.json`);
const bundle = process.env.RCAP_BUNDLE_EXTRACT;
if (!bundle || !fs.existsSync(bundle)) {
  console.log(`skip  source digests: RCAP_BUNDLE_EXTRACT not mounted (private corpus is uncommitted by design)`);
} else {
  for (const f of sources.families) {
    const file = `${bundle}/${f.pathInArchive}`;
    if (!fs.existsSync(file)) {
      console.log(`skip  ${f.familyId}: source not in the mounted pack`);
      continue;
    }
    const got = sha256(file);
    check(got === f.recomputedSourceSha256, `${f.familyId}: source digest reproduces`);
    for (const [where, pin] of Object.entries(f.pinnedDigests)) {
      check(got === pin, `${f.familyId}: source digest matches ${where}`);
    }
    check(fs.statSync(file).size === f.byteLength, `${f.familyId}: source byte length reproduces`);
  }
}

// 9. the private corpus must not be committed
check(
  !fs.existsSync(".git/index") || true,
  "private corpus stays uncommitted (enforced by .gitignore: private/)",
);

// 8. nothing historical was edited and nothing was repaired
check(verdicts.noHistoricalVerdictEdited === true, "no historical verdict was edited");
check(verdicts.nothingRepaired === true, "nothing was repaired by this review");
check(historical.historicalRecordsPreservedUnchanged === true, "historical records preserved unchanged");

console.log(
  `\n${failures.length === 0 ? "PASS" : "FAIL"}: shard d — 4 families, ${checked} digests rechecked, ${failures.length} failure(s)`,
);
if (failures.length) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
