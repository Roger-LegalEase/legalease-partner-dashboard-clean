#!/usr/bin/env node
// The artifacts that must not count for anything, and the hashes that say so.
//
//   node scripts/generate-rcap-stale-artifact-block.mjs
//   node scripts/generate-rcap-stale-artifact-block.mjs --check
//
// WHY THIS EXISTS
//
// Six official-form families were rendered through a binder that let a
// participant's own name be written into a blank holding the offence they were
// charged with. The binder is corrected. The bytes are not: an artifact is a
// record of what a rule did when it ran, and no later change to the rule reaches
// back into a PDF.
//
// The families are retired or runtime-disabled, so nothing routes to them today.
// That is a reason not to panic and not a reason to leave the hashes unguarded:
// "no surface names it" is a statement about the surfaces that exist now, and
// this record is what makes it a statement about the ones that come later.
//
// So every fixture of every affected family is blocked by hash. Blocking is at
// the FAMILY level rather than at the proven-defect level, because the defect is
// in the field map that produced all of them; one boundary fixture comes out
// clean only because the fixture's name was too long to fit the blank, which is
// luck rather than correctness, and luck is not a disposition.
//
// The bytes are kept. Deleting a stale PDF to make a verifier green would
// destroy the evidence of what was wrong, which is the opposite of the point.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const LIVE_IMPACT = "data/rcap-grade-a/field-semantics/full-name-charge-caption-live-impact.json";
const OUT = "data/rcap-grade-a/stale-artifact-block.json";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256File = (rel) => (fs.existsSync(path.join(rootDir, rel))
  ? crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex") : null);

const liveImpact = readJson(LIVE_IMPACT);

/**
 * The six things a blocked hash may never satisfy.
 *
 * Named as capabilities rather than as file paths, because the record has to
 * outlive any particular file. The verifier resolves each to the records that
 * currently carry it.
 */
const REFUSED_CAPABILITIES = [
  { capability: "artifact_approval", meaning: "No output-level legal review may approve one of these hashes as a completed artifact." },
  { capability: "grade_a_fulfillment", meaning: "No Grade-A fulfillment record may cite one of these hashes as the artifact a route delivers." },
  { capability: "packet_family_completion", meaning: "No packet family may be reported complete on the strength of one of these hashes." },
  { capability: "launch_authority", meaning: "No launch-graph row may reach live carrying one of these hashes." },
  { capability: "commercial_admission", meaning: "No commercial admission point may pass with one of these hashes as the artifact." },
  { capability: "participant_delivery", meaning: "No delivery may hand one of these hashes to a participant." },
  // Added when the national route-obligation census was frozen. The census's
  // denominator is built from what already exists, and an artifact rendered
  // through the defective binder is not evidence that a packet exists -- it is
  // evidence that one was produced wrongly. Counting it would shrink the build
  // denominator by exactly the families that most need rebuilding.
  { capability: "census_packet_evidence", meaning: "No route-obligation census may count one of these hashes as current packet evidence." }
];

const byFamily = new Map();
for (const row of liveImpact.rows ?? []) {
  if (!byFamily.has(row.familyDirectory)) {
    byFamily.set(row.familyDirectory, {
      familyDirectory: row.familyDirectory,
      jurisdiction: row.jurisdiction ?? null,
      retired: row.retired === true,
      productionHolds: row.productionHolds ?? [],
      offendingFields: [],
      artifacts: []
    });
  }
  const family = byFamily.get(row.familyDirectory);
  family.offendingFields.push({
    fieldName: row.fieldName,
    effectiveLabel: row.effectiveLabel,
    fieldRect: row.fieldRect ?? null,
    correctedInTheBinder: row.correctedInTheBinder === true,
    bindingNow: row.bindingNow ?? null
  });
  for (const artifact of row.artifacts ?? []) {
    const existing = family.artifacts.find((a) => a.artifact === artifact.artifact);
    if (existing) {
      existing.participantNameProvenAtAnOffendingField ||= artifact.participantNameDrawnAtTheField === true;
      continue;
    }
    family.artifacts.push({
      fixture: artifact.fixture,
      artifact: artifact.artifact,
      sha256: artifact.sha256,
      participantNameProvenAtAnOffendingField: artifact.participantNameDrawnAtTheField === true
    });
  }
}

const families = [...byFamily.values()].sort((a, b) => a.familyDirectory.localeCompare(b.familyDirectory));
for (const family of families) {
  family.offendingFields.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
  family.artifacts.sort((a, b) => a.artifact.localeCompare(b.artifact));
  // Every fixture the family carries, not only the ones a defect was proven on.
  for (const fixture of ["canonical", "boundary"]) {
    const rel = `${family.familyDirectory}/fixtures/${fixture}-filled.pdf`;
    if (family.artifacts.some((a) => a.artifact === rel)) continue;
    const digest = sha256File(rel);
    if (!digest) continue;
    family.artifacts.push({
      fixture, artifact: rel, sha256: digest,
      participantNameProvenAtAnOffendingField: false
    });
  }
  family.artifacts.sort((a, b) => a.artifact.localeCompare(b.artifact));
}

const blockedHashes = [...new Set(families.flatMap((f) => f.artifacts.map((a) => a.sha256)))].sort();

const doc = {
  schemaVersion: "rcap-stale-artifact-block/v1",
  generatedBy: "scripts/generate-rcap-stale-artifact-block.mjs",
  derivedFrom: LIVE_IMPACT,
  reason:
    "These artifacts were rendered through a field map that bound participant.full_legal_name to a blank holding a charge, offence or statute. The binder is corrected; the bytes are not.",
  correctedIn: "scripts/rcap-official-forms/rcap-field-semantics.mjs, captionDescribesChargeValue and the printed-label fallback guard",
  blockingIsAtFamilyLevel:
    "Every fixture of an affected family is blocked, including one boundary fixture that comes out clean only because the fixture's name was too long to fit the blank. The defect is in the map that produced all of them.",
  bytesAreKept:
    "Nothing here deletes a PDF. A stale artifact deleted to make a verifier green destroys the evidence of what was wrong.",
  rerenderPolicy:
    "Not re-rendered by this record. The national route-obligation census classifies each route: Category A families are regenerated through the bounded per-family entry point and their evidence replaced; Category B or superseded families keep the PDF as historical evidence and stay unselectable by runtime and fulfillment authority.",
  refusedCapabilities: REFUSED_CAPABILITIES,
  uniqueFamilies: families.length,
  blockedArtifacts: families.reduce((n, f) => n + f.artifacts.length, 0),
  blockedHashes: blockedHashes.length,
  artifactsWithAProvenWrongWrite: families.reduce((n, f) => n + f.artifacts.filter((a) => a.participantNameProvenAtAnOffendingField).length, 0),
  offendingFieldCount: families.reduce((n, f) => n + f.offendingFields.length, 0),
  allCorrectedInTheBinder: families.every((f) => f.offendingFields.every((x) => x.correctedInTheBinder)),
  hashes: blockedHashes,
  families
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== serialized) {
    console.error(`${OUT} is stale. Run: node scripts/generate-rcap-stale-artifact-block.mjs`);
    process.exit(1);
  }
  console.log(`stale-artifact block current: ${doc.blockedHashes} hash(es) across ${doc.uniqueFamilies} family(ies).`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}`);
console.log(`  ${doc.uniqueFamilies} family(ies), ${doc.blockedArtifacts} artifact(s), ${doc.blockedHashes} hash(es)`);
console.log(`  ${doc.artifactsWithAProvenWrongWrite} artifact(s) with a proven wrong write, ${doc.offendingFieldCount} offending field(s)`);
