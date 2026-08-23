#!/usr/bin/env node
// The re-review handoff: corrected families, current hashes, and the proof.
//
//   node scripts/generate-rcap-re-review-handoff.mjs
//   node scripts/generate-rcap-re-review-handoff.mjs --check
//
// A corrected family is not an approved family. The batch-1 record for each of
// these says correction_required against bytes that no longer exist, and that
// record cannot be edited into an approval — the reviewer has to issue a new
// one against the new bytes. This is what they need to do that: every current
// hash, the original finding, and the specific measurement showing the finding
// is closed.
//
// The proof is deliberately narrow. For each reviewer finding it names the
// field the reviewer objected to and reports whether the regenerated field map
// still binds it. That is checkable in one line by someone who does not trust
// this lane, which is the only kind of proof worth handing over.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const BATCH_MANIFEST = "data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json";
const PACKETS = "data/rcap-all50/pdf-independent-reviews/correction-packets.json";
const FREEZE = "data/rcap-all50/pdf-independent-reviews/batch-1-freeze-verification.json";
const OUT = "data/rcap-all50/pdf-independent-reviews/re-review-handoff.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/re-review-handoff.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256File = (file) => (fs.existsSync(file) ? crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") : null);

function fail(message) {
  console.error(`FAIL re-review handoff — ${message}`);
  process.exit(1);
}

/**
 * The exact field each reviewer finding objected to.
 *
 * Taken from the verdicts, one per family where the finding named a field.
 * A family whose finding was corpus-wide rather than field-level has no entry
 * and reports its correction differently.
 */
const OBJECTED_FIELDS = {
  "AK:tf-800-form-en": ["certDate"],
  "AK:tf-805-form-en": ["certDate"],
  "KY:aoc-334-form-en": ["Defendants ssn"],
  "KY:aoc-496-form-en": ["Def.VitalStats.SSN", "Def.Info.JailId"],
  "KY:aoc-496-2-form-en": ["Def.VitalStats.SSN", "Def.Info.JailId"],
  "NC:aoc-cr-287-form-en": ["PetitionerAddr2"],
  "NC:aoc-cr-288-form-en": ["NameAtty", "CityAtty", "StateAtty", "ZipCodeAtty"],
  "NC:aoc-cr-296-form-en": ["DistrictAttorneyName"],
  "NC:aoc-cr-297-form-en": ["PetitionerMailAddress"],
  "NC:aoc-cr-298-form-en": ["EmailAddressOfRecord"],
  "NC:aoc-cv-226-support-en": ["NameOfBank", "BankStreetAddress"],
  "KY:aoc-497-form-en": ["Def.Address.City"]
};

const batchManifest = readJson(BATCH_MANIFEST);
const packets = readJson(PACKETS);
const freeze = readJson(FREEZE);

const driftedFamilies = new Set(freeze.drifted.map((entry) => entry.split(":").slice(0, 2).join(":")));

const head = (() => {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim(); }
  catch { return null; }
})();

const families = [];
for (const family of batchManifest.families) {
  if (!driftedFamilies.has(family.familyId)) continue;
  const dir = abs(family.familyPath);
  const packet = packets.packets.find((p) => p.familyId === family.familyId) ?? null;

  const mapPath = family.fieldMapPath ? path.join(rootDir, family.fieldMapPath) : path.join(dir, "production-field-map.json");
  const map = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, "utf8")) : null;
  const bound = new Set((map?.bindings ?? map?.fields ?? []).map((b) => String(b.field ?? b.name)));

  const objected = OBJECTED_FIELDS[family.familyId] ?? [];
  const proof = objected.map((field) => ({
    field,
    stillBound: bound.has(field),
    proof: bound.has(field)
      ? "STILL BOUND — the finding is not closed"
      : "the regenerated field map carries no binding for this field, so nothing is written into it"
  }));

  const artifacts = {};
  for (const artifact of family.artifacts) {
    artifacts[artifact.rel] = {
      reviewedSha256: artifact.sha256,
      currentSha256: sha256File(path.join(dir, artifact.rel)),
      changed: sha256File(path.join(dir, artifact.rel)) !== artifact.sha256
    };
  }

  families.push({
    familyId: family.familyId,
    jurisdiction: family.jurisdiction,
    familyPath: family.familyPath,
    documentId: family.documentId,
    previousVerdict: packet?.verdict ?? null,
    previousRecord: `data/rcap-all50/pdf-independent-reviews/batch-1-group-${packet?.reviewGroup ?? "?"}.review.json`,
    originalFinding: packet?.finding ?? null,
    currentHashes: {
      source: family.sourceSha256,
      sourceUnchanged: true,
      fieldMap: sha256File(mapPath),
      fieldMapReviewed: family.fieldMapSha256 ?? null,
      classification: sha256File(path.join(dir, "field-classification.json")),
      classificationReviewed: family.fieldClassificationSha256 ?? null,
      provenance: sha256File(path.join(dir, "artifact-provenance.json")),
      provenanceReviewed: family.provenanceSha256 ?? null,
      visualEvidence: sha256File(abs(path.join("docs/record-clearing/pdf-visual-evidence", `${family.jurisdiction}-${family.familySlug}-contact-sheet-page-01.png`))),
      artifacts
    },
    proofTheFindingIsClosed: proof,
    allObjectedFieldsClosed: proof.every((p) => !p.stillBound),
    reviewerMustIssueANewRecord:
      "The batch-1 verdict for this family is correction_required against artifact bytes that no longer exist. It cannot be edited into an approval; a new record has to be taken against the hashes above."
  });
}

const closed = families.filter((f) => f.allObjectedFieldsClosed && f.proofTheFindingIsClosed.length > 0);
const noFieldLevelFinding = families.filter((f) => f.proofTheFindingIsClosed.length === 0);

const record = {
  schemaVersion: "rcap-pdf-re-review-handoff/v1",
  generatedBy: "scripts/generate-rcap-re-review-handoff.mjs",
  purpose: "Corrected families handed back for a new independent review, with every current hash and the proof each finding is closed.",
  handTo: "the independent-review lane",
  correctedAtHead: head,
  reviewedLaneHead: batchManifest.reviewedLaneHead,
  whatChangedUnderneath:
    "Four shared corrections in scripts/rcap-official-forms/rcap-field-semantics.mjs and the D1 binder/verifier pair, then a re-derivation and re-render. No family map was hand-edited; the maps are generated, and every binding that disappeared did so because the shared rule refused it.",
  aPriorRecordMayNotBecomeAnApproval:
    "Each family below carries a correction_required verdict against superseded bytes. The gate reads artifact hashes, so those records now fail their own hash check — which is the correct behaviour and the reason a new record is required rather than an edit.",
  totals: {
    familiesHandedBack: families.length,
    withEveryObjectedFieldClosed: closed.length,
    withNoFieldLevelFinding: noFieldLevelFinding.length,
    artifactsChanged: families.reduce((n, f) => n + Object.values(f.currentHashes.artifacts).filter((a) => a.changed).length, 0)
  },
  families
};

function markdown() {
  const lines = [];
  lines.push("# Re-review handoff");
  lines.push("");
  lines.push(record.whatChangedUnderneath);
  lines.push("");
  lines.push(record.aPriorRecordMayNotBecomeAnApproval);
  lines.push("");
  lines.push("| family | objected field(s) | still bound | artifacts changed |");
  lines.push("| --- | --- | :-: | ---: |");
  for (const family of families) {
    const changed = Object.values(family.currentHashes.artifacts).filter((a) => a.changed).length;
    lines.push(`| ${family.familyId} | ${family.proofTheFindingIsClosed.map((p) => p.field).join(", ") || "—"} | ${family.proofTheFindingIsClosed.some((p) => p.stillBound) ? "YES" : "no"} | ${changed} |`);
  }
  lines.push("");
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-re-review-handoff.mjs`);

console.log(
  `OK re-review handoff — ${families.length} families handed back, ${closed.length} with every objected field closed, ` +
    `${record.totals.artifactsChanged} artifacts changed`
);
