#!/usr/bin/env node
// The field-classification completeness contract, re-derived and adversarially probed.
//
//   node scripts/verify-rcap-classification-completeness.mjs
//   node scripts/verify-rcap-classification-completeness.mjs --mutations
//
// Both platform-ready approval channels ask one arithmetic question of a
// family: how many fields or anchors did the document declare, and how many of
// them carry a terminal disposition. The counters are the answer, and a counter
// nobody can falsify undetected is the only kind worth having.
//
// So the default run re-derives the wave-0 claim from the tree — the census on
// disk, the entries on disk, the artifact bytes on disk — and the --mutations
// run asks the ten questions that decide whether the contract is real:
//
//    1  a missing discovered count
//    2  a missing classified count
//    3  discovered exceeding classified — a genuinely under-classified form
//    4  classified exceeding discovered — a form claiming fields it lacks
//    5  a count that is not the canonical census
//    6  an unclassified entry hidden behind a falsified pair
//    7  duplicate widgets counted as separate fields, against the census
//    8  a flat-overlay anchor left out of the denominator
//    9  the platform-ready gate itself moving
//   10  a PDF artifact moving during a metadata-only wave
//
// THIS VERIFIER DOES NOT CHANGE THE GATE, AND CONTROL 9 IS WHY. The gate was
// never the defect; the classification files were. Its bytes are pinned here so
// that a wave which "fixes" completeness by loosening the clause that reads it
// fails loudly instead of passing quietly.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { completenessFailures, classifiedCount, acroformDenominator, flatOverlayDenominator }
  from "./rcap-official-forms/rcap-classification-completeness.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
// Prints the clause each control actually trips, so a control that passes for
// the wrong reason is visible rather than merely green.
const EXPLAIN = process.argv.includes("--explain");

const WAVE = "data/rcap-all50/classification-completeness-wave-0.json";
const GATE = "scripts/rcap-official-forms/rcap-platform-ready.mjs";

// The gate's bytes at the reviewed lineage e94fb456. This wave corrects the
// writers, not the clause that reads them.
const GATE_SHA256_UNCHANGED = "0e0f8037feb8c4b86335c6ab8a276d5e69d1d19c18324e195f89d77aa74b4229";

// A flat overlay with real measured anchors, so control 8 probes the anchor
// denominator rather than the vacuous zero-of-zero every source-gated family has.
const FLAT_OVERLAY_SUBJECT = "data/rcap-all50/overlays/production/wisconsin/cr-266-form-en";

const abs = (p) => path.join(rootDir, p);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sha256File = (file) => (fs.existsSync(abs(file)) ? sha256(fs.readFileSync(abs(file))) : null);
const readJson = (p) => (fs.existsSync(abs(p)) ? JSON.parse(fs.readFileSync(abs(p), "utf8")) : null);
const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * The gate's own completeness clause, restated where it can be exercised.
 *
 * Restated rather than imported because the clause is inline in two places in
 * the gate and neither is exported. Restating it would normally be a way for
 * the two to drift apart, which is exactly what control 9 is for: the gate's
 * bytes are pinned, so a change to the clause there fails here rather than
 * leaving this copy quietly describing a gate that no longer exists.
 */
const gateAdmits = (classification) =>
  Boolean(classification)
  && Number(classification.classifiedFieldsOrAnchors) === Number(classification.discoveredFieldsOrAnchors)
  && Number(classification.discoveredFieldsOrAnchors) !== 0;

/** Everything the contract can be wrong about, for one subject. */
function failures(subject) {
  const out = [];
  const { families, gateSha, artifactHashes } = subject;

  for (const family of families) {
    const label = family.familyId;
    out.push(...completenessFailures(family.record, {
      census: family.census,
      overlayProfile: family.overlayProfile,
      familyKind: family.familyKind,
      label
    }));
    if (!gateAdmits(family.record)) {
      out.push(`${label}: the platform-ready completeness clause refuses this family (${family.record?.classifiedFieldsOrAnchors} of ${family.record?.discoveredFieldsOrAnchors})`);
    }
  }

  // 9 — the gate is not this wave's to change.
  if (gateSha !== GATE_SHA256_UNCHANGED) {
    out.push(`${GATE} has changed; this wave corrects the classification writers and may not touch the gate that reads them`);
  }

  // 10 — nothing that a reviewer looked at may move during a metadata-only wave.
  for (const [file, recorded] of Object.entries(artifactHashes)) {
    if (recorded.expected !== recorded.actual) {
      out.push(`${file} hashes to ${recorded.actual} against the ${recorded.expected} the wave recorded; a metadata-only wave moved a rendered byte`);
    }
  }
  return out;
}

// --- the tree, read once -----------------------------------------------------

const wave = readJson(WAVE);
if (!wave) {
  console.error(`FAIL classification completeness — ${WAVE} is absent; run scripts/regenerate-rcap-classification-completeness.mjs`);
  process.exit(1);
}

const loadFamily = (dirRel, familyId) => {
  const record = readJson(path.join(dirRel, "field-classification.json"));
  const census = readJson(path.join(dirRel, "field-census.json"));
  const overlayProfile = readJson(path.join(dirRel, "overlay-profile.json"));
  return { familyId, dirRel, record, census, overlayProfile, familyKind: overlayProfile ? "flat_overlay" : "acroform" };
};

const families = wave.families.map((row) => loadFamily(row.familyPackagePath, row.familyId));
const flatSubject = loadFamily(FLAT_OVERLAY_SUBJECT, "WI:cr-266-form-en");

// Every rendered byte the wave named, measured now.
const artifactHashes = {};
for (const row of wave.families) {
  for (const [rel, expected] of Object.entries(row.artifactSha256 ?? {})) {
    const file = path.join(row.familyPackagePath, rel);
    artifactHashes[file] = { expected, actual: sha256File(file) };
  }
  const mapRel = path.join(row.familyPackagePath,
    row.familyKind === "flat_overlay" ? "overlay-profile.json" : "production-field-map.json");
  artifactHashes[mapRel] = { expected: row.mapSha256, actual: sha256File(mapRel) };
  for (const [file, expected] of Object.entries(row.visualEvidenceSha256 ?? {})) {
    artifactHashes[file] = { expected, actual: sha256File(file) };
  }
}

const subject = { families, gateSha: sha256File(GATE), artifactHashes };

// --- the ten controls --------------------------------------------------------

if (MUTATIONS) {
  const base = failures(subject).length;
  const baseline = new Set(failures(subject));
  const run = (mutate) => {
    const next = {
      families: clone(families),
      gateSha: subject.gateSha,
      artifactHashes: clone(artifactHashes)
    };
    mutate(next);
    const now = failures(next);
    return { caught: now.length > base, added: now.filter((f) => !baseline.has(f)) };
  };

  // The AcroForm subject with duplicate widgets: 26 fields drawn by 29 widgets.
  const widgetSubjectIndex = families.findIndex((f) => {
    const fields = f.census?.fields ?? [];
    const widgets = fields.reduce((n, x) => n + (x.widgets?.length ?? 0), 0);
    return widgets > fields.length;
  });
  if (widgetSubjectIndex < 0) {
    console.error("FAIL classification completeness — no wave family declares more widgets than fields, so control 7 cannot be probed");
    process.exit(1);
  }

  const withFlat = (next, mutate) => {
    const flat = clone(flatSubject);
    mutate(flat);
    next.families = [...next.families, flat];
  };

  const controls = [
    ["1  a classification carrying no discoveredFieldsOrAnchors", (d) => {
      delete d.families[0].record.discoveredFieldsOrAnchors;
    }],
    ["2  a classification carrying no classifiedFieldsOrAnchors", (d) => {
      delete d.families[0].record.classifiedFieldsOrAnchors;
    }],
    ["3  discovered exceeding classified — a genuinely under-classified form", (d) => {
      const r = d.families[0].record;
      r.entries.pop();
      r.classifiedFieldsOrAnchors = r.discoveredFieldsOrAnchors - 1;
    }],
    ["4  classified exceeding discovered — fields the document does not declare", (d) => {
      const r = d.families[0].record;
      r.entries.push({ ...r.entries[0], name: `${r.entries[0].name}__invented` });
      r.classifiedFieldsOrAnchors = r.discoveredFieldsOrAnchors + 1;
    }],
    ["5  both counts moved off the canonical census, agreeing with each other", (d) => {
      const r = d.families[0].record;
      r.discoveredFieldsOrAnchors -= 2;
      r.classifiedFieldsOrAnchors -= 2;
    }],
    ["6  an unclassified entry hidden behind counts that still balance", (d) => {
      d.families[0].record.entries[0].class = "awaiting_a_decision_nobody_made";
    }],
    ["7  duplicate widgets counted as separate fields, against the census", (d) => {
      const family = d.families[widgetSubjectIndex];
      const widgets = family.census.fields.reduce((n, x) => n + (x.widgets?.length ?? 0), 0);
      const extra = widgets - family.census.fields.length;
      for (let i = 0; i < extra; i += 1) family.record.entries.push({ ...family.record.entries[i] });
      family.record.discoveredFieldsOrAnchors = widgets;
      family.record.classifiedFieldsOrAnchors = widgets;
    }],
    ["8  a flat-overlay anchor left out of the denominator", (d) => {
      withFlat(d, (flat) => {
        flat.record.entries.pop();
        flat.record.discoveredFieldsOrAnchors -= 1;
        flat.record.classifiedFieldsOrAnchors -= 1;
      });
    }],
    ["9  the platform-ready gate itself moving", (d) => {
      d.gateSha = sha256(Buffer.from("a loosened completeness clause", "utf8"));
    }],
    ["10 a PDF artifact moving during a metadata-only wave", (d) => {
      const first = Object.keys(d.artifactHashes)[0];
      d.artifactHashes[first].actual = sha256(Buffer.from("a re-rendered artifact", "utf8"));
    }]
  ];

  let undetected = 0;
  for (const [label, mutate] of controls) {
    const { caught, added } = run(mutate);
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (EXPLAIN) for (const line of added) console.log(`           ↳ ${line}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-classification-completeness FAILED — ${undetected} control(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of falsifying the completeness counters is detected (${controls.length}/${controls.length}).`);
  process.exit(0);
}

// --- the default run: re-derive the claim ------------------------------------

const problems = failures(subject);

// The wave record itself has to say what the tree says.
for (const row of wave.families) {
  const family = families.find((f) => f.familyId === row.familyId);
  const label = row.familyId;
  const derived = family.familyKind === "flat_overlay"
    ? flatOverlayDenominator(family.overlayProfile).count
    : acroformDenominator(family.census).count;
  if (row.canonicalCensusCount !== derived) {
    problems.push(`${label}: the wave records a canonical census of ${row.canonicalCensusCount} against ${derived} on disk`);
  }
  if (row.discoveredFieldsOrAnchors !== family.record.discoveredFieldsOrAnchors
    || row.classifiedFieldsOrAnchors !== family.record.classifiedFieldsOrAnchors) {
    problems.push(`${label}: the wave records ${row.classifiedFieldsOrAnchors}/${row.discoveredFieldsOrAnchors} against ${family.record.classifiedFieldsOrAnchors}/${family.record.discoveredFieldsOrAnchors} on disk`);
  }
  if (classifiedCount(family.record.entries) !== family.record.classifiedFieldsOrAnchors) {
    problems.push(`${label}: the entries recount to ${classifiedCount(family.record.entries)}, not ${family.record.classifiedFieldsOrAnchors}`);
  }
  const classificationSha = sha256File(path.join(row.familyPackagePath, "field-classification.json"));
  const sidecarSha = sha256File(path.join(row.familyPackagePath, "artifact-provenance.json"));
  if (row.newClassificationSha256 !== classificationSha) {
    problems.push(`${label}: the wave records a new classification hash the file does not carry`);
  }
  if (row.newSidecarSha256 !== sidecarSha) {
    problems.push(`${label}: the wave records a new sidecar hash the file does not carry`);
  }
  const sidecar = readJson(path.join(row.familyPackagePath, "artifact-provenance.json"));
  if (sidecar?.classificationSha256 !== classificationSha) {
    problems.push(`${label}: the sidecar pins a classification hash that is not the file on disk`);
  }
  if (row.result !== "metadata_only" || !row.entriesUnchanged || !row.classCountsUnchanged
    || !row.artifactUnchanged || !row.mapUnchanged || !row.visualEvidenceUnchanged) {
    problems.push(`${label}: the wave does not record this family as metadata_only with every substantive byte held`);
  }
}

if (problems.length > 0) {
  console.error(`verify-rcap-classification-completeness FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
  if (problems.length > 40) console.error(` ... and ${problems.length - 40} more`);
  process.exit(1);
}

console.log(
  `field-classification completeness holds for ${families.length} wave-0 family(ies): `
  + families.map((f) => `${f.familyId} ${f.record.classifiedFieldsOrAnchors}/${f.record.discoveredFieldsOrAnchors}`).join(", ")
  + `; the platform-ready gate is unchanged at ${GATE_SHA256_UNCHANGED.slice(0, 12)}, and ${Object.keys(artifactHashes).length} rendered byte(s) are where the reviewers left them.`
);
