#!/usr/bin/env node
// Focused controls for the participant-fillability hold derivation.
//
//   node scripts/verify-rcap-participant-fill-hold-derivation.mjs
//
// `not_participant_fillable_no_fixture_fill` is the one production hold that is
// derived rather than decided, and discharging it wrongly promotes a document
// nobody can file. The derivation therefore has to fail closed under every way
// it could be talked into a false discharge.
//
// Each control MUTATES A COPY of a real family package -- never the worktree --
// and requires the derivation to refuse. The unchanged family must discharge
// first: a control suite whose baseline is already red proves nothing, because
// every mutation "passes" for free.
//
// Two controls read source text rather than evidence. They guard the shape of
// the fix itself: that no family ID was hardcoded in place of the derivation,
// and that the hold was not simply added to the set an approval outranks. Both
// are ways to make these assets ready without proving anything about them.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { PARTICIPANT_FILL_HOLD, participantFillEvidence } from "./rcap-official-forms/rcap-participant-fill-hold.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY = path.join(rootDir, "data/rcap-all50/overlays/production");
const SHEET_PROOF = path.join(rootDir, "data/rcap-all50/contact-sheet-visual-proof.json");

const ASSIGNED = [
  { familyId: "AK:tf-800-form-en", dir: "alaska/tf-800-form-en" },
  { familyId: "AK:tf-805-form-en", dir: "alaska/tf-805-form-en" },
  { familyId: "NC:aoc-cr-287-form-en", dir: "north-carolina/aoc-cr-287-form-en" }
];
// Same form number, different asset. It must be judged on its own package.
const SIBLING = { familyId: "NC:aoc-cr-287-form-es", dir: "north-carolina/aoc-cr-287-form-es" };

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const sheetProof = readJson(SHEET_PROOF);
const sheetFor = (familyId) => (sheetProof.families ?? []).find((f) => f.familyId === familyId) ?? null;

const failures = [];
const check = (name, ok, detail) => {
  if (ok) console.log(`  ok    ${name}`);
  else { console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); failures.push(name); }
};

/** A throwaway copy of one family package, so a mutation never touches the clone. */
function copyFamily(dirRel) {
  const src = path.join(OVERLAY, dirRel);
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-fill-control-"));
  fs.cpSync(src, dst, { recursive: true });
  return dst;
}

const evidenceOf = (familyPath, familyId, overrides = {}) => participantFillEvidence({
  familyPath,
  record: overrides.record ?? readJson(path.join(familyPath, "source-record.json")),
  protectedScan: overrides.protectedScan
    ?? readJson(path.join(familyPath, "reports/protected-fields-scan.json")),
  sheet: overrides.sheet ?? sheetFor(familyId)
});

console.log("baseline — the unchanged assigned families must discharge");
let baselineGreen = true;
for (const fam of ASSIGNED) {
  const legs = evidenceOf(path.join(OVERLAY, fam.dir), fam.familyId);
  if (!legs.proven) baselineGreen = false;
  check(`${fam.familyId} discharges on its committed evidence`, legs.proven,
    legs.proven ? "" : `legs: ${JSON.stringify(legs)}`);
}
if (!baselineGreen) {
  console.error("\nFAIL participant-fill hold derivation — the baseline is not green; mutations are not counted.");
  process.exit(1);
}

// 1. A participant-filled artifact incorrectly assigned the hold.
console.log("\ncontrol 1 — a participant-filled artifact carrying the stale hold is discharged");
{
  const fam = ASSIGNED[0];
  const record = readJson(path.join(OVERLAY, fam.dir, "source-record.json"));
  check("the stale hold is present on the record and the evidence contradicts it",
    (record.productionHolds ?? []).includes(PARTICIPANT_FILL_HOLD)
      && evidenceOf(path.join(OVERLAY, fam.dir), fam.familyId).proven);
}

// 2. Nonzero bindings, zero reported fills, because the report is stale.
console.log("\ncontrol 2 — a stale populated-fields report holds the family");
{
  const fam = ASSIGNED[0];
  const dir = copyFamily(fam.dir);
  fs.writeFileSync(path.join(dir, "reports/populated-fields.json"), "[]\n");
  const legs = evidenceOf(dir, fam.familyId);
  check("zero reported fills refuses the discharge", legs.proven === false && legs.participantBindings > 0,
    JSON.stringify({ proven: legs.proven, bindings: legs.participantBindings, populated: legs.populatedFields }));
}

// 3. An approval applied to a sibling revision.
console.log("\ncontrol 3 — a sibling revision is judged on its own package");
{
  const legs = evidenceOf(path.join(OVERLAY, SIBLING.dir), SIBLING.familyId);
  check(`${SIBLING.familyId} does not inherit its sibling's discharge`, legs.proven === false,
    JSON.stringify({ proven: legs.proven, panelsVisuallyDiffer: legs.panelsVisuallyDiffer,
      expectedValuesVisibleOnPage: legs.expectedValuesVisibleOnPage }));
}

// 4. An informational form becoming ready merely because it was reviewed.
console.log("\ncontrol 4 — an informational companion stays held");
{
  const fam = ASSIGNED[0];
  const record = readJson(path.join(OVERLAY, fam.dir, "source-record.json"));
  const legs = evidenceOf(path.join(OVERLAY, fam.dir), fam.familyId, {
    record: { ...record, documentOwnership: "informational_companion",
      ownershipDetermination: "Informational companion. Nothing is filed from it." }
  });
  check("a non-participant-owned document refuses the discharge", legs.proven === false && legs.participantOwned === false);
}

// 5. A prosecutor-controlled form becoming ready merely because it was reviewed.
console.log("\ncontrol 5 — a prosecutor-controlled document stays held");
{
  const fam = ASSIGNED[0];
  const record = readJson(path.join(OVERLAY, fam.dir, "source-record.json"));
  const legs = evidenceOf(path.join(OVERLAY, fam.dir), fam.familyId, {
    record: { ...record, documentOwnership: "prosecutor_completed",
      ownershipDetermination: "Completed by the prosecuting authority." }
  });
  check("an outside-party document refuses the discharge", legs.proven === false && legs.participantOwned === false);
}

// 6. A truly blank participant form promoted without visible-value proof.
console.log("\ncontrol 6 — a blank participant form is not discharged without visible-value proof");
{
  const fam = ASSIGNED[0];
  const dir = copyFamily(fam.dir);
  const proofPath = path.join(dir, "contact-sheet/contact-sheet-proof.json");
  const proof = readJson(proofPath);
  fs.writeFileSync(proofPath, `${JSON.stringify({ ...proof, allExpectedValuesVisible: false }, null, 2)}\n`);
  const legs = evidenceOf(dir, fam.familyId);
  check("values not visible on the page refuses the discharge", legs.proven === false
    && legs.expectedValuesVisibleOnPage === false);

  // ...and the same when the proof simply asserts nothing at all.
  const dir2 = copyFamily(fam.dir);
  const p2 = path.join(dir2, "contact-sheet/contact-sheet-proof.json");
  fs.writeFileSync(p2, `${JSON.stringify({ ...readJson(p2), expectedValues: [] }, null, 2)}\n`);
  check("an empty expected-value set refuses the discharge", evidenceOf(dir2, fam.familyId).proven === false);
}

// 7. A family-ID hardcode replacing semantic derivation.
console.log("\ncontrol 7 — the derivation names no family");
{
  const src = fs.readFileSync(path.join(rootDir, "scripts/rcap-official-forms/rcap-participant-fill-hold.mjs"), "utf8");
  const familyLiterals = src.match(/["'][A-Z]{2}:[a-z0-9][a-z0-9-]*["']/g) ?? [];
  const slugLiterals = ASSIGNED.concat([SIBLING]).filter((f) => src.includes(f.dir.split("/")[1]));
  check("no jurisdiction:family literal appears in the derivation", familyLiterals.length === 0,
    familyLiterals.join(", "));
  check("no assigned family slug appears in the derivation", slugLiterals.length === 0,
    slugLiterals.map((f) => f.familyId).join(", "));
}

// 8. A reviewed map or profile changing without invalidating the review.
console.log("\ncontrol 8 — a map stripped of its participant bindings holds the family");
{
  const fam = ASSIGNED[0];
  const dir = copyFamily(fam.dir);
  const mapPath = path.join(dir, "production-field-map.json");
  const map = readJson(mapPath);
  fs.writeFileSync(mapPath, `${JSON.stringify({ ...map, bindings: [] }, null, 2)}\n`);
  const legs = evidenceOf(dir, fam.familyId);
  check("zero participant bindings refuses the discharge", legs.proven === false && legs.participantBindings === 0);
}

// 9. A current artifact hash differing from the one the proof approved.
console.log("\ncontrol 9 — a proof naming a superseded artifact holds the family");
{
  const fam = ASSIGNED[0];
  const dir = copyFamily(fam.dir);
  const proofPath = path.join(dir, "contact-sheet/contact-sheet-proof.json");
  const proof = readJson(proofPath);
  fs.writeFileSync(proofPath, `${JSON.stringify({ ...proof, finalizedSha256: "0".repeat(64) }, null, 2)}\n`);
  const legs = evidenceOf(dir, fam.familyId);
  check("a proof that does not name the current bytes refuses the discharge",
    legs.proven === false && legs.proofNamesCurrentArtifact === false);

  // The same defect from the other direction: the artifact moves, the proof does not.
  const dir2 = copyFamily(fam.dir);
  const canonical = path.join(dir2, "fixtures/canonical-filled.pdf");
  fs.appendFileSync(canonical, "\n% re-rendered\n");
  check("a re-rendered artifact its proof has not caught up with refuses the discharge",
    evidenceOf(dir2, fam.familyId).proven === false);
}

// 10. The global hold being added to the set an approval outranks.
console.log("\ncontrol 10 — the hold is not outranked by approval");
{
  const register = fs.readFileSync(path.join(rootDir, "scripts/generate-rcap-problematic-pdf-register.mjs"), "utf8");
  const outranked = register.match(/OUTRANKED_BY_APPROVAL\s*=\s*new Set\(\[([^\]]*)\]\)/s)?.[1] ?? "";
  check("the hold is absent from OUTRANKED_BY_APPROVAL", !outranked.includes(PARTICIPANT_FILL_HOLD), outranked.trim());

  const gate = fs.readFileSync(path.join(rootDir, "scripts/rcap-official-forms/rcap-platform-ready.mjs"), "utf8");
  check("the hold was not moved into RELEASE_STATE_HOLDS or REVIEW_REQUIRED_HOLDS",
    !gate.includes(PARTICIPANT_FILL_HOLD));
}

console.log("");
if (failures.length > 0) {
  console.error(`FAIL participant-fill hold derivation — ${failures.length} control(s) failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log(`OK participant-fill hold derivation — baseline green on ${ASSIGNED.length} assigned families; all 10 controls refuse a false discharge`);
