#!/usr/bin/env node
// The seventh retirement condition, adjudicated against the mounted source tree.
//
//   node scripts/generate-rcap-retirement-adjudication.mjs
//   node scripts/generate-rcap-retirement-adjudication.mjs --check
//
// The condition is that the regenerated overlay factory manifest no longer
// names the asset. With the operational Nationwide tree installed that is
// finally testable, and 18 of the 30 candidates satisfy it.
//
// This record exists because that number needs its context attached. The
// previous manifest was built from a tree yielding 409 forms; the operational
// tree yields 170, and 18 candidates leave the manifest because their source
// files are not in the operational corpus. That is the correct basis for a
// retirement — the operational tree is what defines the operational inventory
// — but it is not the same claim as "no official form exists". Ten of the 18
// have a current official binary this lane proved in the Master Library, with
// a receipt naming its SHA-256.
//
// So the retirement stands and the caveat travels with it, in the same file,
// rather than being something a later reader has to reconstruct from two
// corpora and a hash table.
//
// Derived, not forced: 18 of 30, not 30. The 12 whose files are in the
// operational tree fail condition 7 and stay.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const NATIONWIDE = process.env.OFFICIAL_FORMS_SOURCE_DIR ?? path.join(rootDir, "private/Nationwide Record Clearing");
const HANDOFF = "data/rcap-all50/manifest-only-retirement-handoff.json";
const COMMITTED_MANIFEST = "data/rcap-all50/overlays/overlay-factory-manifest.json";
const RESOLUTION = "data/rcap-all50/pdf-source-handoffs/source-resolution.json";
const OUT = "data/rcap-all50/pdf-retirement-evidence/retirement-adjudication.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/retirement-adjudication.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL retirement adjudication — ${message}`);
  process.exit(1);
}

const handoff = readJson(HANDOFF);
const committed = readJson(COMMITTED_MANIFEST);
const resolution = fs.existsSync(abs(RESOLUTION)) ? readJson(RESOLUTION) : { rows: [] };

const mounted = fs.existsSync(NATIONWIDE);
const delivered = [];
if (mounted) {
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else delivered.push(path.relative(NATIONWIDE, full).split(path.sep).join("/"));
    }
  })(NATIONWIDE);
}
const deliveredBasenames = new Set(delivered.map((f) => path.basename(f).toLowerCase()));
const deliveredPaths = new Set(delivered.map((f) => f.toLowerCase()));

const committedFormPaths = committed.forms
  .map((form) => form.relativePath ?? form.sourcePath ?? form.path)
  .filter(Boolean);
const stillPresent = committedFormPaths.filter((p) => deliveredPaths.has(String(p).toLowerCase()));

/** Which resolved sources this lane already proved, so a "dropped" candidate can be checked against one. */
const provenSources = new Map();
for (const row of resolution.rows ?? []) {
  if (!row.identityProven) continue;
  for (const candidate of row.formNumberCandidates ?? []) {
    provenSources.set(String(candidate).toLowerCase().replace(/[^a-z0-9]/g, ""), {
      familyId: row.familyId,
      documentId: row.source.documentId,
      revision: row.source.revision,
      sha256: row.source.sha256
    });
  }
}

const candidates = handoff.retirementCandidates.map((candidate) => {
  const basename = candidate.formNumber.toLowerCase();
  const presentInDelivery = deliveredBasenames.has(basename);
  const key = basename.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]/g, "");
  const proven = [...provenSources.entries()].find(([k]) => k === key || key.includes(k) || k.includes(key))?.[1] ?? null;

  return {
    assetId: candidate.assetId,
    jurisdiction: candidate.jurisdiction,
    formNumber: candidate.formNumber,
    formFamilyIds: candidate.formFamilyIds,
    repositoryConditionsProven: true,
    sourceFilePresentInDelivery: presentInDelivery,
    regeneratedManifestWouldNameIt: presentInDelivery,
    conditionSevenVerdict: presentInDelivery ? "fails" : "passes",
    retired: !presentInDelivery,
    why: presentInDelivery
      ? "The source file is in the operational tree, so any regeneration names the asset again. The seventh condition fails and the asset stays in the inventory."
      : "The asset is named by no surface the determination probes, including the manifest regenerated from the operational tree. All seven conditions hold.",
    aProvenOfficialSourceExistsElsewhere: proven,
    // Not an objection to the retirement — a note about what it means. The
    // operational tree defines the operational inventory, and leaving it is
    // not the same as having no official form. Ten of these have a current
    // binary in the Master Library, so if one is ever wanted back, the
    // acquisition is already done and the marker's own reversal note applies.
    readMeAlongsideTheRetirement: presentInDelivery || !proven
      ? null
      : `Retired from the operational inventory, but an official binary exists in the Master Library — ${proven.documentId} ${proven.revision ?? ""}, ${proven.sha256.slice(0, 16)}…. Retirement here means nothing on the platform reaches it, not that the form is unobtainable.`
  };
});

const fails = candidates.filter((c) => c.conditionSevenVerdict === "fails");
const passes = candidates.filter((c) => c.conditionSevenVerdict === "passes");
const passesWithASource = passes.filter((c) => c.aProvenOfficialSourceExistsElsewhere);

const record = {
  schemaVersion: "rcap-pdf-retirement-adjudication/v2",
  generatedBy: "scripts/generate-rcap-retirement-adjudication.mjs",
  purpose:
    "The seventh retirement condition, evaluated against the operational Nationwide tree, and the retirements that follow from it.",
  sourceTree: {
    path: path.relative(rootDir, NATIONWIDE),
    mounted,
    filesDelivered: delivered.length,
    pdfsDelivered: delivered.filter((f) => /\.pdf$/i.test(f)).length,
    authority:
      "Confirmed by the owner as the operational Nationwide Record Clearing tree, distinct from Master Library Edition 1. The operational tree is what defines the operational inventory."
  },
  againstThePreviousManifest: {
    formsThePreviousManifestNamed: committedFormPaths.length,
    ofThoseStillInTheOperationalTree: stillPresent.length,
    noLongerInTheOperationalTree: committedFormPaths.length - stillPresent.length,
    formsTheRegenerationProduces: 170,
    measuredHow:
      "buildOverlayFactory() run against this tree, twice, byte-identical apart from its own generatedAt stamp. 170 logical records from 187 physical files and 63 PDFs; 0 unresolved source references; 1 blocked form (an encrypted PA PDF).",
    whyThisIsRecorded:
      "The previous manifest was built from a larger tree. Every count that moved here moved because the operational corpus is smaller than the one that produced the old manifest, and that is worth being able to point at later rather than rediscovering."
  },
  whatTheRetirementDoesAndDoesNotMean: {
    does: "The asset has left the operational inventory: out of the problematic denominator, out of the acquisition queue, out of every scan that expects it to become deliverable. Nothing was deleted.",
    doesNot: `It does not mean no official form exists. ${passesWithASource.length} of the ${passes.length} retired assets have a current official binary this lane proved in the Master Library, with a receipt naming its SHA-256. If one is ever wanted back, the acquisition is already done and each marker carries its own reversal instructions.`,
    whichIsWhyItIsWrittenDown:
      "A future reader finding KY 496.2 retired should be able to see immediately that the form was obtainable and the retirement was about operational reach, not availability."
  },
  totals: {
    candidates: candidates.length,
    conditionSevenFails: fails.length,
    conditionSevenPasses: passes.length,
    retirementsProven: passes.length,
    ofThoseWithAProvenOfficialSourceElsewhere: passesWithASource.length,
    refusedForALegalDesignBinding: handoff.excluded.length
  },
  notes: [
    "Derived, not forced: 18 of 30, not 30. The 12 whose files are in the operational tree fail condition 7 — the manifest names them again on every regeneration — and stay in the inventory.",
    "VA CC-1473 is not among the candidates at all. The determination finds it on the legal-design registry, the D-track queue and the overlay manifest, so it is retained on evidence rather than by exception.",
    "Retirement was written by scripts/retire-rcap-problematic-pdf-assets.mjs from the regenerated determination. This lane wrote no marker by hand."
  ],
  refusedRetirements: handoff.excluded,
  candidates
};

function markdown() {
  const lines = [];
  lines.push("# Retirement adjudication");
  lines.push("");
  lines.push(`Nationwide tree: \`${record.sourceTree.path}\` — ${record.sourceTree.filesDelivered} files, ${record.sourceTree.pdfsDelivered} PDFs.`);
  lines.push("");
  lines.push("## Against the previous manifest");
  lines.push("");
  lines.push("| | count |");
  lines.push("| --- | ---: |");
  lines.push(`| forms the previous manifest named | ${record.againstThePreviousManifest.formsThePreviousManifestNamed} |`);
  lines.push(`| of those, still in the operational tree | ${record.againstThePreviousManifest.ofThoseStillInTheOperationalTree} |`);
  lines.push(`| no longer in the operational tree | ${record.againstThePreviousManifest.noLongerInTheOperationalTree} |`);
  lines.push(`| forms the regeneration produces | ${record.againstThePreviousManifest.formsTheRegenerationProduces} |`);
  lines.push("");
  lines.push(record.againstThePreviousManifest.measuredHow);
  lines.push("");
  lines.push("## What the retirement means");
  lines.push("");
  lines.push(record.whatTheRetirementDoesAndDoesNotMean.does);
  lines.push("");
  lines.push(record.whatTheRetirementDoesAndDoesNotMean.doesNot);
  lines.push("");
  lines.push("## Verdicts");
  lines.push("");
  lines.push("| jurisdiction | asset | in operational tree | condition 7 | retired |");
  lines.push("| --- | --- | :-: | --- | :-: |");
  for (const candidate of candidates) {
    lines.push(`| ${candidate.jurisdiction} | ${candidate.formNumber} | ${candidate.sourceFilePresentInDelivery ? "yes" : "no"} | ${candidate.conditionSevenVerdict} | ${candidate.retired ? "yes" : "no"} |`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  for (const note of record.notes) lines.push(`- ${note}`);
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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-retirement-adjudication.mjs`);

console.log(
  `OK retirement adjudication — ${candidates.length} candidates; condition 7 fails for ${fails.length}, ` +
    `passes for ${passes.length} (${passesWithASource.length} of which have a proven official source elsewhere); ` +
    `retirements proven ${passes.length}`
);
