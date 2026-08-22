#!/usr/bin/env node
// Current terminal provenance sidecars for the four corrected NC translations.
//
//   node scripts/generate-rcap-nc-four-terminal-sidecars.mjs
//   node scripts/generate-rcap-nc-four-terminal-sidecars.mjs --check
//
// North Carolina publishes Spanish and Vietnamese AOC-CR-287 and AOC-CR-288
// carrying, in both languages, the court's own printed notice: THIS FORM IS FOR
// INFORMATIONAL PURPOSES ONLY. DO NOT COMPLETE THIS FORM FOR FILING. USE THE
// ENGLISH VERSION. The factory had been filling them anyway and shipping a
// canonical fixture, a boundary fixture and a contact sheet for each. 0ed17121
// withdrew all of that: the packages now hold no PDF at all, and the withdrawal
// is recorded in each family's own source-record.
//
// The old artifact sidecars went with the artifacts, and none of their hashes is
// carried forward here. A sidecar is a claim about specific bytes; those bytes
// were withdrawn on purpose, and a record still naming them would read as
// evidence that a filled Spanish petition exists. The person most likely to file
// one is the person the translation exists to help, which is why the court
// forbids completing it and why nothing here may look like a completed copy.
//
// So each record states the absence as the outcome:
//
//   artifactExpected      false
//   artifactCount         0
//   contactSheetExpected  false
//   referenceOnly         true
//   participantFillable   false
//
// and binds what does exist -- the official source hashed from the installed
// bytes, the package inputs, the terminal state, and the withdrawal receipt by
// its own digest. The receipt's per-artifact digests are deliberately NOT
// restated here: they are historical, they are already committed inside
// source-record.json, and republishing them beside a current record is how a
// withdrawn artifact gets mistaken for a live one. The receipt is bound by hash
// and by artifact name only.
//
// Every record binds to the corrected freeze. A record that names the tree
// instead of the bytes cannot be shown later to have been true.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");

const FREEZE_SHA = "0ed171216480b43f6e67848f1a3b3947caf59641";
const CAPTAIN_HEAD = "f6ae12208f13a38afa86cfd5bb5732c905197fc7";
const FREEZE_RECORD = "data/rcap-all50/pdf-nc-four-freeze-dispatch.json";
const GENERATED_AT = "2026-08-22T00:00:00.000Z";

const BATCH = "nc-four-terminal";
const EVIDENCE_DIR = `data/rcap-all50/gate-b-sidecars/${BATCH}`;
const MANIFEST = `${EVIDENCE_DIR}/sidecar-evidence.json`;
const SIDECAR = "artifact-provenance.json";
const SCHEMA = "rcap-terminal-provenance/v1";

const EXPECTED_FAMILIES = [
  "NC:aoc-cr-287-form-es",
  "NC:aoc-cr-287-form-vi",
  "NC:aoc-cr-288-form-es",
  "NC:aoc-cr-288-form-vi"
];

/** The English filing form each translation points at, and must not disturb. */
const ENGLISH_FILING_FAMILY = {
  "NC:aoc-cr-287-form-es": "data/rcap-all50/overlays/production/north-carolina/aoc-cr-287-form-en",
  "NC:aoc-cr-287-form-vi": "data/rcap-all50/overlays/production/north-carolina/aoc-cr-287-form-en",
  "NC:aoc-cr-288-form-es": "data/rcap-all50/overlays/production/north-carolina/aoc-cr-288-form-en",
  "NC:aoc-cr-288-form-vi": "data/rcap-all50/overlays/production/north-carolina/aoc-cr-288-form-en"
};

const MAP_FILES = ["production-field-map.json", "overlay-profile.json"];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const hashJson = (value) => sha256(Buffer.from(JSON.stringify(value ?? null), "utf8"));
const fileSha = (file) => sha256(fs.readFileSync(file));
const readJson = (file, fallback = null) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

/** Every PDF anywhere under a package, so "no artifact" is observed, not assumed. */
function pdfsUnder(dir) {
  const out = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.toLowerCase().endsWith(".pdf")) out.push(path.relative(dir, p));
    }
  };
  walk(dir);
  return out;
}

/** One family's evidence, recomputed from disk. */
function readFamily(frozen) {
  const dir = frozen.packagePath;
  const at = (rel) => path.join(dir, rel);
  const record = readJson(at("source-record.json"), {});
  const receipt = readJson(at("source-receipt.json"), {});
  const classification = readJson(at("field-classification.json"));

  // Source identity from the installed official bytes, checked against the
  // corrected freeze. The freeze is the authority on which bytes these are.
  const resolved = receipt.resolvedPath
    ?? (frozen.canonicalBundlePath ? path.join("private/source-imports", frozen.canonicalBundlePath) : null);
  const present = Boolean(resolved && fs.existsSync(resolved));
  const source = {
    resolvedPath: resolved,
    bytesInstalled: present,
    sha256: present ? fileSha(resolved) : null,
    byteLength: present ? fs.statSync(resolved).size : null,
    frozenSha256: frozen.sourceSha256 ?? null,
    frozenByteLength: frozen.sourceByteLength ?? null,
    canonicalBundlePath: frozen.canonicalBundlePath ?? null,
    revision: receipt.revision ?? record.revision ?? null,
    // Carried exactly as the family records it; never invented.
    sourceUrl: record.sourceUrl ?? null
  };
  source.matchesFreeze = present && source.sha256 === source.frozenSha256 && source.byteLength === source.frozenByteLength;

  const maps = MAP_FILES.filter((f) => fs.existsSync(at(f)))
    .map((f) => ({ file: f, sha256: fileSha(at(f)), schemaVersion: readJson(at(f), {}).schemaVersion ?? null }));

  // The terminal state and the withdrawal receipt both live inside the
  // corrected source-record, so each is bound by the digest of its own block as
  // well as by the file digest that contains them.
  const disposition = record.ownerDisposition ?? null;
  const withdrawn = record.artifactsWithdrawn ?? [];

  return {
    familyId: frozen.familyId,
    dir,
    documentId: receipt.documentId ?? record.documentId ?? null,
    officialTitle: record.officialTitle ?? null,
    language: record.language ?? null,
    documentRole: record.documentRole ?? null,
    participantFillable: record.participantFillable === true,
    terminalCategory: frozen.canonicalTerminalCategory ?? null,
    familyLocalDetail: frozen.familyLocalDetail ?? null,
    source,
    inputs: {
      sourceRecordSha256: fs.existsSync(at("source-record.json")) ? fileSha(at("source-record.json")) : null,
      sourceReceiptSha256: fs.existsSync(at("source-receipt.json")) ? fileSha(at("source-receipt.json")) : null,
      maps,
      fieldCensusSha256: fs.existsSync(at("field-census.json")) ? fileSha(at("field-census.json")) : null,
      fieldClassificationSha256: fs.existsSync(at("field-classification.json")) ? fileSha(at("field-classification.json")) : null
    },
    classificationEntries: (classification?.entries ?? []).length,
    terminalState: {
      source: "source-record.json:ownerDisposition",
      sha256: hashJson(disposition),
      referenceOnly: disposition?.referenceOnly === true,
      documentOwner: disposition?.documentOwner ?? null,
      printedNoticeBasis: disposition?.basis ?? null,
      filingVersion: disposition?.filingVersion ?? null
    },
    // Bound by digest and by artifact name. The per-artifact digests inside the
    // receipt are historical and are not restated in a current record.
    withdrawalReceipt: {
      source: "source-record.json:artifactsWithdrawn",
      sha256: hashJson(withdrawn),
      withdrawnCount: withdrawn.length,
      withdrawnArtifacts: withdrawn.map((w) => w.artifact).sort(),
      bases: [...new Set(withdrawn.map((w) => w.basis))].sort()
    },
    englishFilingFamily: {
      packagePath: ENGLISH_FILING_FAMILY[frozen.familyId],
      treeSha: git("rev-parse", `${FREEZE_SHA}:${ENGLISH_FILING_FAMILY[frozen.familyId]}`)
    },
    observed: {
      participantPdfCount: pdfsUnder(dir).length,
      participantPdfs: pdfsUnder(dir),
      contactSheetCount: fs.existsSync(at("contact-sheet")) ? pdfsUnder(at("contact-sheet")).length : 0,
      fixturesDirPresent: fs.existsSync(at("fixtures")),
      contactSheetDirPresent: fs.existsSync(at("contact-sheet")),
      placementReports: (readJson(at("reports/populated-fields.json"), []) ?? []).length
    }
  };
}

function buildSidecar(family) {
  return {
    schemaVersion: SCHEMA,
    purpose:
      "Current terminal provenance for a court-designated reference-only translation. The absence of a participant artifact is the outcome, not a gap. No artifact digest is recorded, and no digest from the withdrawn artifacts is carried forward: a record still naming them would read as evidence that a completed copy of a form the court forbids completing exists.",
    implementationFreezeSha: FREEZE_SHA,
    captainCoordinationHead: CAPTAIN_HEAD,
    familyId: family.familyId,
    documentId: family.documentId,
    officialTitle: family.officialTitle,
    language: family.language,
    documentRole: family.documentRole,
    generatedAt: GENERATED_AT,

    referenceOnly: true,
    participantFillable: false,
    artifactExpected: false,
    artifactCount: 0,
    contactSheetExpected: false,
    contactSheetCount: 0,
    artifacts: [],

    sourceIdentity: {
      resolvedPath: family.source.resolvedPath,
      sha256: family.source.sha256,
      byteLength: family.source.byteLength,
      hashedFromInstalledBytes: family.source.bytesInstalled,
      matchesImplementationFreeze: family.source.matchesFreeze,
      canonicalBundlePath: family.source.canonicalBundlePath,
      revision: family.source.revision,
      sourceUrl: family.source.sourceUrl
    },
    packageIdentity: family.inputs,
    terminalState: family.terminalState,
    withdrawalReceipt: family.withdrawalReceipt,
    englishFilingFamily: family.englishFilingFamily,
    observedOnDisk: family.observed
  };
}

function buildManifest(families, sidecars) {
  return {
    schemaVersion: "rcap-nc-four-terminal-sidecar-manifest/v1",
    batch: BATCH,
    purpose:
      "Terminal sidecar evidence for the four corrected NC reference-only translations. Every digest is recomputed from a file in this checkout; each source digest is taken from the installed official bytes and checked against the corrected freeze.",
    implementationFreezeSha: FREEZE_SHA,
    captainCoordinationHead: CAPTAIN_HEAD,
    generatedAt: GENERATED_AT,
    theCourtsOwnNotice:
      "THIS FORM IS FOR INFORMATIONAL PURPOSES ONLY. DO NOT COMPLETE THIS FORM FOR FILING. USE THE ENGLISH VERSION.",
    staleHashPolicy:
      "No digest from a withdrawn artifact appears in any current record. The withdrawal receipt is bound by its own hash and by artifact name; its per-artifact digests stay where they belong, inside the committed source-record.",
    families: families.map((family, i) => ({
      familyId: family.familyId,
      packagePath: family.dir,
      terminalCategory: family.terminalCategory,
      familyLocalDetail: family.familyLocalDetail,
      referenceOnly: true,
      participantFillable: false,
      artifactExpected: false,
      artifactCount: 0,
      contactSheetExpected: false,
      source: {
        resolvedPath: family.source.resolvedPath,
        sha256: family.source.sha256,
        byteLength: family.source.byteLength,
        matchesImplementationFreeze: family.source.matchesFreeze,
        revision: family.source.revision
      },
      inputs: family.inputs,
      terminalState: family.terminalState,
      withdrawalReceipt: family.withdrawalReceipt,
      englishFilingFamily: family.englishFilingFamily,
      observedOnDisk: family.observed,
      sidecar: {
        file: `${family.dir}/${SIDECAR}`,
        schemaVersion: sidecars[i].schemaVersion,
        sha256: sha256(Buffer.from(`${JSON.stringify(sidecars[i], null, 2)}\n`, "utf8"))
      }
    })),
    totals: {
      families: families.length,
      referenceOnlyFamilies: families.length,
      participantArtifacts: families.reduce((n, f) => n + f.observed.participantPdfCount, 0),
      contactSheets: families.reduce((n, f) => n + f.observed.contactSheetCount, 0),
      sourcesHashedFromInstalledBytes: families.filter((f) => f.source.bytesInstalled).length,
      withdrawnArtifactsRecorded: families.reduce((n, f) => n + f.withdrawalReceipt.withdrawnCount, 0),
      staleArtifactHashesCarriedForward: 0
    }
  };
}

function failures({ families, sidecars, manifest, committedSidecars, committedManifest }) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  fail(families.length === 4, `expected 4 families, read ${families.length}`);
  fail(JSON.stringify(families.map((f) => f.familyId).sort()) === JSON.stringify([...EXPECTED_FAMILIES].sort()),
    "the assigned family set is not exactly the four NC translations");

  for (let i = 0; i < families.length; i += 1) {
    const family = families[i];
    const committed = committedSidecars[i];
    const id = family.familyId;
    if (!committed) { fail(false, `${id}: no committed sidecar on disk`); continue; }

    fail(committed.schemaVersion === SCHEMA, `${id}: sidecar declares ${JSON.stringify(committed.schemaVersion)}, not ${SCHEMA}`);
    fail(committed.implementationFreezeSha === FREEZE_SHA, `${id}: the sidecar does not bind to the corrected freeze ${FREEZE_SHA.slice(0, 8)}`);

    // Source identity, from installed bytes, agreeing with the freeze.
    fail(family.source.bytesInstalled, `${id}: the official source is not installed at ${family.source.resolvedPath}`);
    fail(family.source.matchesFreeze,
      `${id}: SOURCE DRIFT — installed bytes hash ${String(family.source.sha256).slice(0, 12)}/${family.source.byteLength}, freeze names ${String(family.source.frozenSha256).slice(0, 12)}/${family.source.frozenByteLength}`);
    fail(committed.sourceIdentity?.sha256 === family.source.sha256, `${id}: the sidecar's source digest is not the installed source's digest`);
    fail(committed.sourceIdentity?.hashedFromInstalledBytes === true, `${id}: the sidecar does not record its source digest as taken from installed bytes`);
    fail(committed.sourceIdentity?.sourceUrl === family.source.sourceUrl, `${id}: the sidecar's source URL is not the citation the family records`);

    // Package pins equal disk.
    fail(JSON.stringify(committed.packageIdentity) === JSON.stringify(family.inputs), `${id}: the sidecar's package pins do not match disk`);
    fail(JSON.stringify(committed.terminalState) === JSON.stringify(family.terminalState), `${id}: the sidecar's terminal state is not what source-record now carries`);
    fail(JSON.stringify(committed.withdrawalReceipt) === JSON.stringify(family.withdrawalReceipt), `${id}: the sidecar's withdrawal receipt is not what source-record now carries`);
    fail(committed.terminalState?.referenceOnly === true, `${id}: the terminal state does not record reference-only`);
    fail(Boolean(committed.terminalState?.printedNoticeBasis), `${id}: reference-only with no printed notice preserved`);

    // The outcome: nothing participant-facing exists, and nothing claims to.
    fail(committed.referenceOnly === true, `${id}: referenceOnly is not true`);
    fail(committed.participantFillable === false, `${id}: participantFillable is not false`);
    fail(committed.artifactExpected === false, `${id}: artifactExpected is not false`);
    fail(committed.artifactCount === 0, `${id}: artifactCount is ${committed.artifactCount}, not 0`);
    fail(committed.contactSheetExpected === false, `${id}: contactSheetExpected is not false`);
    fail(Array.isArray(committed.artifacts) && committed.artifacts.length === 0, `${id}: the sidecar names ${committed.artifacts?.length} artifact(s)`);
    fail(family.observed.participantPdfCount === 0, `${id}: ${family.observed.participantPdfCount} PDF(s) on disk in a reference-only package`);
    fail(family.observed.contactSheetCount === 0, `${id}: ${family.observed.contactSheetCount} contact sheet(s) on disk`);
    fail(family.observed.placementReports === 0, `${id}: ${family.observed.placementReports} participant placement(s) still recorded`);
    fail(family.participantFillable === false, `${id}: source-record still marks this translation participant-fillable`);

    // No stale artifact hash survives anywhere in the current record.
    const withdrawnDigests = new Set((readJson(path.join(family.dir, "source-record.json"), {}).artifactsWithdrawn ?? []).map((w) => w.sha256));
    const text = JSON.stringify(committed);
    for (const digest of withdrawnDigests) {
      fail(!text.includes(digest), `${id}: the current sidecar restates the withdrawn artifact digest ${digest.slice(0, 12)}`);
    }

    // The English filing form is the thing a participant actually files, and
    // nothing in this lane may disturb it.
    fail(committed.englishFilingFamily?.treeSha === git("rev-parse", `${FREEZE_SHA}:${ENGLISH_FILING_FAMILY[id]}`),
      `${id}: the recorded English filing-family tree hash is not the frozen one`);
    fail(git("rev-parse", `HEAD:${ENGLISH_FILING_FAMILY[id]}`) === committed.englishFilingFamily.treeSha,
      `${id}: the English filing family ${ENGLISH_FILING_FAMILY[id]} has moved`);
  }

  if (!committedManifest) {
    fail(false, "no committed batch manifest on disk");
  } else {
    fail(committedManifest.implementationFreezeSha === FREEZE_SHA, "the manifest does not bind to the corrected freeze");
    fail(committedManifest.totals?.families === 4, `the manifest covers ${committedManifest.totals?.families} famil(ies), not 4`);
    fail(committedManifest.totals?.participantArtifacts === 0, "the manifest records a participant artifact");
    fail(JSON.stringify(committedManifest) === JSON.stringify(manifest),
      "the committed batch manifest is not what the current bytes produce; re-run the generator");
  }
  return out;
}

// ---------------------------------------------------------------------------

const frozenDoc = JSON.parse(git("show", `${CAPTAIN_HEAD}:${FREEZE_RECORD}`));
if (frozenDoc.NC_FOUR_IMPLEMENTATION_FREEZE_SHA !== FREEZE_SHA) {
  console.error(`FAIL the freeze record names ${frozenDoc.NC_FOUR_IMPLEMENTATION_FREEZE_SHA}, not ${FREEZE_SHA}`);
  process.exit(1);
}
const assigned = frozenDoc.families.map((f) => f.familyId).sort();
if (JSON.stringify(assigned) !== JSON.stringify([...EXPECTED_FAMILIES].sort())) {
  console.error(`FAIL the freeze assigns ${assigned.join(", ")}, not the four expected families`);
  process.exit(1);
}

const families = frozenDoc.families.map(readFamily);
const sidecars = families.map(buildSidecar);
const manifest = buildManifest(families, sidecars);

const committedSidecars = families.map((f) => readJson(path.join(f.dir, SIDECAR)));
const committedManifest = readJson(MANIFEST);

if (CHECK) {
  const problems = failures({ families, sidecars, manifest, committedSidecars, committedManifest });
  if (problems.length > 0) {
    console.error(`FAIL nc-four terminal sidecars — ${problems.length} problem(s):\n`);
    for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
    process.exit(1);
  }
  const t = manifest.totals;
  console.log(
    `OK nc-four terminal sidecars — ${t.families}/4 families covered, all reference-only; ` +
    `${t.participantArtifacts} participant artifact(s), ${t.contactSheets} contact sheet(s), ` +
    `${t.sourcesHashedFromInstalledBytes}/4 source digests from installed bytes, ` +
    `${t.withdrawnArtifactsRecorded} withdrawn artifact(s) bound by receipt, ${t.staleArtifactHashesCarriedForward} stale hash(es) carried forward; bound to ${FREEZE_SHA.slice(0, 8)}.`
  );
  process.exit(0);
}

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
for (let i = 0; i < families.length; i += 1) {
  fs.writeFileSync(path.join(families[i].dir, SIDECAR), `${JSON.stringify(sidecars[i], null, 2)}\n`);
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
const t = manifest.totals;
console.log(
  `nc-four terminal sidecars: ${t.families} written, all reference-only, ${t.participantArtifacts} participant artifact(s), ` +
  `${t.withdrawnArtifactsRecorded} withdrawn artifact(s) bound by receipt; manifest at ${MANIFEST}.`
);
