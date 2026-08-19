#!/usr/bin/env node
// One row per artifact that does not meet the finalization contract, with the
// thing that actually has to change and who owns changing it.
//
//   node scripts/generate-rcap-remaining-finalization-failures.mjs
//   node scripts/generate-rcap-remaining-finalization-failures.mjs --check
//
// The headline counts in the audit are per failure code, and an artifact can
// fail several at once. Adding them up overstates the work: 32 + 2 + 3 + 2 is
// not 39 artifacts. This file is keyed by artifact, so the number of rows is
// the number of things that need fixing.
//
// The point of the ownership column is that most of these are not the family's
// fault. Active-content residue and surviving form fields come out of the
// shared finalizer's sanitize and flatten steps: the same defect on thirty
// artifacts is one upstream fix, and correcting thirty field maps would change
// nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT = path.join(rootDir, "data/rcap-all50/finalized-artifact-audit.json");
const MASTER = path.join(rootDir, "data/rcap-all50/problematic-pdf-master-list.json");
const CORPUS_INDEX = path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json");
const OUT = path.join(rootDir, "data/rcap-all50/remaining-pdf-finalization-failures.json");
const checkOnly = process.argv.includes("--check");

const readJson = (p, fallback = null) => {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
};

// The contract in the order the factory applies it. The first boundary an
// artifact fails is the one worth acting on: an artifact that is not flattened
// will also look wrong at every later step, and chasing the later symptom is
// how one defect becomes five tickets.
const BOUNDARY_ORDER = [
  ["parses", "parse"],
  ["not_flattened_live_form_fields_survive", "flatten"],
  ["object_streams_hide_active_content_from_the_scan", "serialize_inspectably"],
  ["active_content_residue", "sanitize_active_content"],
  ["participant_values_absent_from_the_artifact_entirely", "write_participant_values"],
  ["no_provenance_record_names_this_artifact", "record_provenance"],
  ["provenance_output_hash_does_not_match_the_bytes", "record_provenance"]
];

// Who has to change something for the row to clear, and what.
const OWNERSHIP = {
  not_flattened_live_form_fields_survive: {
    owner: "shared-module-owned",
    module: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs (sanitizeAndFlatten)",
    nextAction: "The flatten step left live AcroForm fields on the output. One upstream fix clears every artifact carrying this code; editing the family's map changes nothing."
  },
  object_streams_hide_active_content_from_the_scan: {
    owner: "shared-module-owned",
    module: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs (save options)",
    nextAction: "The artifact was serialized with object streams, so the residue scan cannot see into every object it judges. Save with useObjectStreams:false. Until then this artifact's active-content verdict is unproven, not clean."
  },
  active_content_residue: {
    owner: "shared-module-owned",
    module: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs (sanitizeAndFlatten) and rcap-active-content.mjs",
    nextAction: "Active-content constructs survive sanitation. The residue is in the source document and the sanitizer is not removing it, so this is one upstream fix across every affected artifact rather than a per-family correction."
  },
  participant_values_absent_from_the_artifact_entirely: {
    owner: "family-owned",
    module: null,
    nextAction: "A fixture that is meant to carry participant values carries none in its page content. Check this family's field map or overlay profile: either nothing bound, or everything bound was refused. Correct the map, re-render this family alone, and re-measure its contact sheet."
  },
  no_provenance_record_names_this_artifact: {
    owner: "family-owned",
    module: null,
    nextAction: "No sidecar names this artifact. Re-render the family so a provenance record is written beside it, or delete the artifact if it is a leftover from a run that no longer describes anything."
  },
  provenance_output_hash_does_not_match_the_bytes: {
    owner: "family-owned",
    module: null,
    nextAction: "The artifact changed after its provenance was written. Re-render the family so the record and the bytes agree."
  }
};

const audit = readJson(AUDIT, { families: [] });
const master = readJson(MASTER, { rows: [] });
const corpus = readJson(CORPUS_INDEX, { entries: [] });
const corpusBySha = new Map((corpus.entries ?? []).map((e) => [e.sha256, e]));

// Asset ids are keyed by family in the master list; one row can cover several.
const assetIdByFamily = new Map();
for (const row of master.rows ?? []) {
  for (const familyId of row.formFamilyIds ?? []) {
    if (!assetIdByFamily.has(familyId)) assetIdByFamily.set(familyId, []);
    assetIdByFamily.get(familyId).push(row.assetId);
  }
}

const rows = [];
// Retired families still carry artifacts on disk. They are out of operational
// inventory, so their failures are not work -- but the count is recorded, or
// this file and the audit disagree with no way to tell why.
let artifactsInRetiredFamilies = 0;
for (const family of audit.families ?? []) {
  if (family.retired) {
    artifactsInRetiredFamilies += (family.artifacts ?? []).filter((a) => (a.failures ?? []).length > 0).length;
    continue;
  }
  for (const artifact of family.artifacts ?? []) {
    const failures = artifact.failures ?? [];
    if (failures.length === 0) continue;

    const boundary = BOUNDARY_ORDER.find(([code]) => failures.includes(code));
    const primary = boundary ? boundary[0] : failures[0];
    const ownership = OWNERSHIP[primary] ?? {
      owner: "family-owned", module: null,
      nextAction: `Unclassified failure code ${primary}: decide the owner before acting on it.`
    };

    // A source that is absent or that no reader can open is a different
    // problem from a factory that mishandled it, and must not be filed as one.
    // A family that bound nothing meaningful is a mapping gap, not a factory
    // defect, and the two need different people. NC's Spanish petitions bind
    // exactly one fact -- the two-letter state -- because the shared fact
    // descriptors are written against English captions, so their fixture is a
    // blank Spanish petition with "XX" on it. The contact sheet proof is right
    // that the one value it wrote is visible; the audit is right that no
    // participant values are present. Both are true and the family is not
    // implemented.
    const profilePath = family.relativePath
      ? path.join(rootDir, family.relativePath, "overlay-profile.json") : null;
    const profile = profilePath ? readJson(profilePath, null) : null;
    const boundNothing = profile !== null
      && (profile.anchors ?? []).length === 0 && (profile.bindings ?? []).length === 0;

    const corpusEntry = family.sourceSha256 ? corpusBySha.get(family.sourceSha256) ?? null : null;
    const sourceState = !family.sourceSha256 ? "missing-source"
      : !corpusEntry ? "missing-source"
        : corpusEntry.structuralClassObserved === "unreadable" ? "unreadable-source"
          : null;

    rows.push({
      jurisdiction: family.jurisdiction,
      assetIds: assetIdByFamily.get(family.familyId) ?? [],
      family: family.familyId,
      familyPath: family.relativePath ?? null,
      fixture: artifact.rel,
      fixtureKind: artifact.kind,
      fixtureSha256: artifact.sha256 ?? null,
      sourceSha256: family.sourceSha256 ?? null,
      sourcePathInCorpus: corpusEntry?.path ?? null,
      currentFailureCode: primary,
      overlappingFailureCodes: failures.filter((f) => f !== primary),
      allFailureCodes: failures,
      firstFailedFinalizationBoundary: boundary ? boundary[1] : "unclassified",
      defectClass: sourceState ?? ownership.owner,
      blockedByModule: ownership.module,
      boundNothing: boundNothing || undefined,
      exactNextAction: boundNothing && primary === "participant_values_absent_from_the_artifact_entirely"
        ? "This family's map binds no anchor and no field, so its fixture is the blank form. Nothing is wrong with the factory. The captions are not matched by the shared fact descriptors -- these are the Spanish-language petitions, and the descriptors are written against English captions -- so either the family supplies explicit mappings of its own, or it is recorded as label-unmatched rather than implemented. Its fixture should not stand as a participant artifact in the meantime."
        : sourceState === "missing-source"
        ? "The source binary this family pins is not in the corpus index. Nothing about the artifact can be corrected until the bytes are here."
        : sourceState === "unreadable-source"
          ? "The pinned source does not open with the factory's reader. Re-acquire or re-derive the source before treating this as a factory defect."
          : ownership.nextAction,
      expectedOwner: sourceState ? "source acquisition" : ownership.owner === "shared-module-owned"
        ? "Session A (shared PDF contract reconciliation)"
        : "this lane (family-owned)"
    });
  }
}

rows.sort((a, b) => `${a.defectClass}|${a.jurisdiction}|${a.family}|${a.fixture}`
  .localeCompare(`${b.defectClass}|${b.jurisdiction}|${b.family}|${b.fixture}`));

const only = (code) => rows.filter((r) => r.allFailureCodes.length === 1 && r.allFailureCodes[0] === code).length;
const payload = {
  schemaVersion: "rcap-remaining-finalization-failures/v1",
  generatedBy: "scripts/generate-rcap-remaining-finalization-failures.mjs",
  purpose: "One row per artifact that does not meet the finalization contract, with the first boundary it fails, who owns the fix, and what that fix is.",
  doNotAddTheHeadlineCounts: "The audit's per-code totals overlap. The number of things to fix is the row count below, not the sum of the codes.",
  boundaryOrder: BOUNDARY_ORDER.map(([code, boundary]) => ({ code, boundary })),
  totals: {
    uniqueAffectedArtifacts: rows.length,
    activeContentOnly: only("active_content_residue"),
    flatteningOnly: only("not_flattened_live_form_fields_survive"),
    missingValueOnly: only("participant_values_absent_from_the_artifact_entirely"),
    multipleFailures: rows.filter((r) => r.allFailureCodes.length > 1).length,
    sharedModuleBlockers: rows.filter((r) => r.defectClass === "shared-module-owned").length,
    familyOwnedBlockers: rows.filter((r) => r.defectClass === "family-owned").length,
    missingSource: rows.filter((r) => r.defectClass === "missing-source").length,
    unreadableSource: rows.filter((r) => r.defectClass === "unreadable-source").length,
    familiesAffected: new Set(rows.map((r) => r.family)).size,
    // Reconciles this file's row count with the audit's, which counts them.
    failingArtifactsInRetiredFamiliesExcluded: artifactsInRetiredFamilies
  },
  rows
};

if (checkOnly) {
  const committed = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (committed !== `${JSON.stringify(payload, null, 2)}\n`) {
    console.error("FAIL remaining-finalization-failures has drifted from the committed record");
    process.exit(1);
  }
  console.log("OK remaining-finalization-failures matches the committed record");
  process.exit(0);
}

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.totals, null, 1));
