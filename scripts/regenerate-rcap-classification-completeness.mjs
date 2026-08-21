#!/usr/bin/env node
// Adds the two completeness counters to a named set of families, and nothing else.
//
//   node scripts/regenerate-rcap-classification-completeness.mjs
//   node scripts/regenerate-rcap-classification-completeness.mjs --check
//   node scripts/regenerate-rcap-classification-completeness.mjs AK:tf-800-form-en ...
//
// Both platform-ready approval channels refuse a family whose
// field-classification.json does not carry discoveredFieldsOrAnchors equal to
// classifiedFieldsOrAnchors. Four families have already been through
// independent review and are held out of approval by nothing but the absent
// counters, so this wave puts the counters on those four and leaves every
// substantive byte alone.
//
// METADATA ONLY, AND PROVABLY SO. No PDF is re-rendered, no anchor is
// re-measured, no field is re-classified. Every entry, every class count, every
// artifact, the field map and the visual evidence are compared before and after
// and the run REFUSES if any of them moved. The counters are re-derived from
// the canonical census on disk rather than read from a plan, because a
// hand-entered denominator is exactly the thing the denominator exists to
// prevent.
//
// The one sidecar field that changes is artifact-provenance.json's
// classificationSha256, which pins the classification file by hash. Adding the
// counters changes that hash, so leaving the pin alone would leave the sidecar
// describing a file that is no longer there. Re-pinning it is the whole of the
// sidecar's change and the run refuses if anything else in it moves.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { completenessCounters, completenessFailures } from "./rcap-official-forms/rcap-classification-completeness.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const requested = args.filter((a) => !a.startsWith("--"));

// The reviewed lineage. The handoff's "old" hashes are the bytes the reviewers
// pinned, read from this commit rather than from whatever the working tree
// happened to hold when the script last ran — so re-running --check reproduces
// the record instead of recording a no-op transition from the file to itself.
const REVIEWED_BASE = "e94fb456b13dacd05479641bc3c4fe37eb898d07";

const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const EVIDENCE = "data/rcap-all50/pdf-independent-reviews/gate-b-evidence-completion.json";
const OUT = "data/rcap-all50/classification-completeness-wave-0.json";

// The four families an independent reviewer has already approved, held out of
// platform-ready by the missing counters alone. Named here so the wave's scope
// is a decision rather than whatever the loop happened to reach.
const WAVE_0 = [
  "AK:tf-800-form-en",
  "AK:tf-805-form-en",
  "NC:aoc-cr-287-form-en",
  "NC:aoc-cr-288-form-en"
];

const abs = (p) => path.join(rootDir, p);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sha256File = (file) => (fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null);
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);
const stable = (value) => JSON.stringify(value);

function fail(message) {
  console.error(`FAIL classification completeness — ${message}`);
  process.exit(1);
}

/** A file's bytes at the reviewed base, or null if the base did not carry it. */
function bytesAtReviewedBase(relPath) {
  try {
    return execFileSync("git", ["show", `${REVIEWED_BASE}:${relPath}`], { cwd: rootDir, maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return null;
  }
}
const shaAtReviewedBase = (relPath) => {
  const bytes = bytesAtReviewedBase(relPath);
  return bytes ? sha256(bytes) : null;
};
const jsonAtReviewedBase = (relPath) => {
  const bytes = bytesAtReviewedBase(relPath);
  if (!bytes) return null;
  try { return JSON.parse(bytes.toString("utf8")); } catch { return null; }
};

const familyDirOf = (familyId) => {
  const slug = String(familyId).split(":").pop();
  for (const state of fs.readdirSync(abs(OVERLAY_DIR)).sort()) {
    const candidate = path.join(abs(OVERLAY_DIR), state, slug);
    if (fs.existsSync(path.join(candidate, "source-record.json"))) return candidate;
  }
  return null;
};

/**
 * The record the corrected writer would emit for this family, key for key.
 *
 * The completeness block goes exactly where the patched writers put it — after
 * the record's identity fields, before whatever the schema records next — so
 * that a later full run of the writer over this family reproduces these bytes
 * rather than reordering them. A regeneration whose output the generator would
 * not reproduce is a hand edit with a script wrapped around it.
 *
 * A record that ALREADY carries the counters is returned untouched. The
 * controlling v2-complete model emits them under its own key order and its own
 * `denominator` wording, and rewriting that into this shape would change bytes
 * the controlling generator would immediately call stale — a metadata-only wave
 * churning the one writer that was never wrong.
 */
function rebuild(classification, counters) {
  if (Number.isInteger(classification.discoveredFieldsOrAnchors)
    && Number.isInteger(classification.classifiedFieldsOrAnchors)) {
    return classification;
  }
  // Insert after the last identity key the schema actually carries, and leave
  // every other key exactly where it was.
  const anchorKey = classification.schemaVersion === "rcap-field-classification/v1" ? "family" : "ownershipBasis";
  const insertAfter = anchorKey in classification ? anchorKey : "schemaVersion";
  const out = {};
  for (const [key, value] of Object.entries(classification)) {
    out[key] = value;
    if (key === insertAfter) Object.assign(out, counters);
  }
  return out;
}

const evidence = readJson(abs(EVIDENCE));
const rasterPagesOf = (familyId) => {
  const row = (evidence?.families ?? []).find((f) => f.familyId === familyId);
  return (row?.rasterEvidence?.pages ?? []).map((p) => p.path);
};

const targets = requested.length > 0 ? requested : WAVE_0;
const rows = [];
let written = 0;

for (const familyId of targets) {
  const dir = familyDirOf(familyId);
  if (!dir) fail(`${familyId}: no family package`);
  const rel = (name) => path.join(dir, name);
  const label = `${familyId}`;

  const classificationPath = rel("field-classification.json");
  const before = readJson(classificationPath);
  if (!before) fail(`${label}: no field-classification.json`);

  const census = readJson(rel("field-census.json"));
  const overlayProfile = readJson(rel("overlay-profile.json"));
  const familyKind = overlayProfile ? "flat_overlay" : "acroform";
  if (familyKind === "acroform" && !Array.isArray(census?.fields)) {
    fail(`${label}: an AcroForm family with no canonical census has no denominator to classify against`);
  }

  // Re-derived, never read back off a plan.
  const counters = completenessCounters({ familyKind, census, overlayProfile, entries: before.entries ?? [] });
  const after = rebuild(before, counters);

  // THE COMPARISON IS AGAINST THE REVIEWED BASE, NOT AGAINST THE WORKING TREE.
  // Compared against the file beside it, every "unchanged" claim is trivially
  // true the second time this runs — the wave would be certifying its own
  // output. The reviewers approved the bytes at e94fb456, so that is what the
  // regenerated record has to be metadata-only WITH RESPECT TO.
  const classificationRel = path.relative(rootDir, classificationPath);
  const baseline = jsonAtReviewedBase(classificationRel);
  if (!baseline) fail(`${label}: the reviewed base ${REVIEWED_BASE.slice(0, 12)} carries no ${classificationRel}`);

  const entriesUnchanged = stable(baseline.entries ?? null) === stable(after.entries ?? null);
  const classCountsUnchanged = stable(baseline.classCounts ?? null) === stable(after.classCounts ?? null);
  if (!entriesUnchanged) fail(`${label}: a classification entry changed against the reviewed base; this wave is metadata only and stops here`);
  if (!classCountsUnchanged) fail(`${label}: the class counts changed against the reviewed base; this wave is metadata only and stops here`);

  const alreadyCarriedCounters = Number.isInteger(baseline.discoveredFieldsOrAnchors)
    && Number.isInteger(baseline.classifiedFieldsOrAnchors);
  const addedKeys = Object.keys(after).filter((k) => !(k in baseline));
  const removedKeys = Object.keys(baseline).filter((k) => !(k in after));
  const changedKeys = Object.keys(after).filter((k) => k in baseline && stable(baseline[k]) !== stable(after[k]));
  const allowed = new Set(Object.keys(counters));
  for (const key of [...addedKeys, ...changedKeys]) {
    if (!allowed.has(key)) fail(`${label}: ${key} is neither a completeness counter nor deterministic schema metadata`);
  }
  if (removedKeys.length) fail(`${label}: regeneration would drop ${removedKeys.join(", ")}`);

  const problems = completenessFailures(after, { census, overlayProfile, familyKind, label });
  if (problems.length) fail(problems.join("; "));
  if (!after.complete) {
    fail(`${label}: ${after.classifiedFieldsOrAnchors} of ${after.discoveredFieldsOrAnchors} classified; approval completeness requires equality`);
  }

  // What must NOT move: every rendered and measured byte a reviewer looked at,
  // compared file by file against the same reviewed base.
  const mapPath = overlayProfile ? rel("overlay-profile.json") : rel("production-field-map.json");
  const artifactRels = ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf"].filter((r) => fs.existsSync(rel(r)));
  const contactSheetRel = "contact-sheet/blank-vs-filled.pdf";
  const held = [
    ...artifactRels.map((r) => path.relative(rootDir, rel(r))),
    path.relative(rootDir, rel(contactSheetRel)),
    ...rasterPagesOf(familyId)
  ].filter((r) => fs.existsSync(abs(r)));
  const mapRel = path.relative(rootDir, mapPath);
  const censusRel = path.relative(rootDir, rel("field-census.json"));

  const drifted = [...held, mapRel, censusRel].filter((r) => sha256File(abs(r)) !== shaAtReviewedBase(r));
  if (drifted.length) {
    fail(`${label}: ${drifted.join(", ")} ${drifted.length === 1 ? "has" : "have"} moved since the reviewed base; this wave adds metadata and re-renders nothing`);
  }

  const classificationJson = `${JSON.stringify(after, null, 2)}\n`;
  const oldClassificationSha = shaAtReviewedBase(classificationRel);
  const newClassificationSha = sha256(Buffer.from(classificationJson, "utf8"));

  // The sidecar, re-pinned on exactly one field.
  //
  // A family with no sidecar, or a sidecar that pins no classification hash, has
  // nothing to re-pin and is not an error: the pin is what makes the sidecar
  // stale, and a sidecar that never made the claim cannot have broken it. A
  // sidecar pinning a hash that is NOT the file beside it is a different thing
  // entirely — it was already stale before this wave, and this wave will not
  // quietly overwrite the evidence of that.
  const sidecarPath = rel("artifact-provenance.json");
  const sidecarRel = path.relative(rootDir, sidecarPath);
  const sidecarBefore = readJson(sidecarPath);
  const onDiskClassificationSha = sha256File(classificationPath);
  const pinsClassification = Boolean(sidecarBefore) && typeof sidecarBefore.classificationSha256 === "string";
  if (pinsClassification && sidecarBefore.classificationSha256 !== onDiskClassificationSha) {
    fail(`${label}: the sidecar pins ${sidecarBefore.classificationSha256} against a classification that hashes to ${onDiskClassificationSha}; it was already stale and this wave will not paper over that`);
  }
  const sidecarAfter = pinsClassification ? { ...sidecarBefore, classificationSha256: newClassificationSha } : sidecarBefore;
  if (pinsClassification) {
    for (const key of Object.keys(sidecarAfter)) {
      if (key === "classificationSha256") continue;
      if (stable(sidecarBefore[key]) !== stable(sidecarAfter[key])) fail(`${label}: the sidecar's ${key} moved, and only its classification pin may`);
    }
  }
  const sidecarJson = pinsClassification ? `${JSON.stringify(sidecarAfter, null, 2)}\n` : null;
  const oldSidecarSha = sidecarBefore ? shaAtReviewedBase(sidecarRel) : null;
  const newSidecarSha = pinsClassification ? sha256(Buffer.from(sidecarJson, "utf8")) : oldSidecarSha;
  if (sidecarBefore && !oldSidecarSha) fail(`${label}: the reviewed base ${REVIEWED_BASE.slice(0, 12)} carries no ${sidecarRel}`);

  if (checkOnly) {
    if (fs.readFileSync(classificationPath, "utf8") !== classificationJson) {
      fail(`${label}: field-classification.json is stale; re-run scripts/regenerate-rcap-classification-completeness.mjs`);
    }
    if (pinsClassification && fs.readFileSync(sidecarPath, "utf8") !== sidecarJson) {
      fail(`${label}: artifact-provenance.json does not pin the classification on disk`);
    }
  } else {
    fs.writeFileSync(classificationPath, classificationJson);
    if (pinsClassification) fs.writeFileSync(sidecarPath, sidecarJson);
    written += 1;
  }

  // And measured once more after the write, because a metadata-only claim that
  // is only ever asserted is not evidence of anything.
  const stillHeld = [...held, mapRel, censusRel].every((r) => sha256File(abs(r)) === shaAtReviewedBase(r));
  if (!stillHeld) fail(`${label}: a map, artifact or visual-evidence byte moved during a metadata-only wave`);

  rows.push({
    familyId,
    familyPackagePath: path.relative(rootDir, dir),
    familyKind,
    schemaVersion: after.schemaVersion,
    denominatorBasis: after.denominatorBasis,
    canonicalCensusCount: familyKind === "flat_overlay"
      ? (overlayProfile.anchors?.length ?? 0) + (overlayProfile.deliberatelyUnbound?.length ?? 0)
      : census.fields.length,
    discoveredFieldsOrAnchors: after.discoveredFieldsOrAnchors,
    classifiedFieldsOrAnchors: after.classifiedFieldsOrAnchors,
    oldClassificationSha256: oldClassificationSha,
    newClassificationSha256: newClassificationSha,
    oldSidecarSha256: oldSidecarSha,
    newSidecarSha256: newSidecarSha,
    sidecarRepinned: pinsClassification,
    entriesUnchanged,
    classCountsUnchanged,
    artifactUnchanged: [...artifactRels, contactSheetRel]
      .every((r) => sha256File(rel(r)) === shaAtReviewedBase(path.relative(rootDir, rel(r)))),
    mapUnchanged: sha256File(mapPath) === shaAtReviewedBase(mapRel),
    visualEvidenceUnchanged: rasterPagesOf(familyId).every((r) => sha256File(abs(r)) === shaAtReviewedBase(r)),
    comparedAgainst: REVIEWED_BASE,
    artifactSha256: Object.fromEntries([...artifactRels, contactSheetRel]
      .filter((r) => fs.existsSync(rel(r))).map((r) => [r, sha256File(rel(r))])),
    mapSha256: sha256File(mapPath),
    visualEvidenceSha256: Object.fromEntries(rasterPagesOf(familyId).map((r) => [r, sha256File(abs(r))])),
    addedKeys,
    alreadyCarriedCounters,
    result: "metadata_only"
  });
}

const payload = {
  schemaVersion: "rcap-classification-completeness-wave/v1",
  generatedBy: "scripts/regenerate-rcap-classification-completeness.mjs",
  wave: "wave-0",
  reviewedBase: REVIEWED_BASE,
  purpose:
    "The independent-review repin handoff for the four families whose approvals are held only by the absent field-classification completeness counters. Every hash here is measured from this tree; none is hand-entered.",
  notAnApproval:
    "This is not a review verdict and changes no review record. It states which pinned classification hashes moved, and by how little, so the reviewers who issued those verdicts can re-pin them.",
  counterContract: {
    controllingModel: "rcap-field-classification/v2-complete",
    sharedImplementation: "scripts/rcap-official-forms/rcap-classification-completeness.mjs",
    acroform: "discoveredFieldsOrAnchors is the canonical field-census fields[] count; widgets are never counted separately",
    flatOverlay: "discoveredFieldsOrAnchors is overlay-profile anchors[] plus deliberatelyUnbound[]",
    classified: "entries carrying exactly one terminal class or refusal",
    invariant: "0 <= classifiedFieldsOrAnchors <= discoveredFieldsOrAnchors; approval completeness only at equality"
  },
  gateUnchanged: "scripts/rcap-official-forms/rcap-platform-ready.mjs is not modified by this wave. The classification files were what was incomplete.",
  totals: {
    families: rows.length,
    metadataOnly: rows.filter((r) => r.result === "metadata_only").length,
    entriesChanged: rows.filter((r) => !r.entriesUnchanged).length,
    classCountsChanged: rows.filter((r) => !r.classCountsUnchanged).length,
    artifactsChanged: rows.filter((r) => !r.artifactUnchanged).length,
    mapsChanged: rows.filter((r) => !r.mapUnchanged).length,
    visualEvidenceChanged: rows.filter((r) => !r.visualEvidenceUnchanged).length
  },
  reviewRepinHandoff: {
    field: "families[].fieldClassificationSha256, and the sidecar pin the record compares against",
    why: "the platform-ready record channel compares the pinned classification hash against the file on disk, so a reviewer who does not re-pin will see condition 5 refuse a family whose entries did not move",
    reviewerA: { families: ["AK:tf-800-form-en", "AK:tf-805-form-en"] },
    reviewerB: { families: ["NC:aoc-cr-287-form-en", "NC:aoc-cr-288-form-en"] }
  },
  families: rows
};

const json = `${JSON.stringify(payload, null, 2)}\n`;
if (checkOnly) {
  const current = fs.existsSync(abs(OUT)) ? fs.readFileSync(abs(OUT), "utf8") : "";
  if (current !== json) fail(`${OUT} is stale; re-run scripts/regenerate-rcap-classification-completeness.mjs`);
} else {
  fs.writeFileSync(abs(OUT), json);
}

console.log(`OK classification completeness wave 0 — ${rows.length} family(ies), ${written} regenerated, all metadata_only`);
for (const row of rows) {
  const sidecar = row.sidecarRepinned
    ? `sidecar ${row.oldSidecarSha256.slice(0, 12)} → ${row.newSidecarSha256.slice(0, 12)}`
    : "no sidecar classification pin to move";
  console.log(`  ${row.familyId}: ${row.classifiedFieldsOrAnchors}/${row.discoveredFieldsOrAnchors} — classification ${row.oldClassificationSha256.slice(0, 12)} → ${row.newClassificationSha256.slice(0, 12)}, ${sidecar}`);
}
