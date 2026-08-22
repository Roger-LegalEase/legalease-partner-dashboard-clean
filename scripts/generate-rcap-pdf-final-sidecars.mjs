#!/usr/bin/env node
// Current provenance sidecars for the 38-family PDF-finish evidence queue.
//
//   node scripts/generate-rcap-pdf-final-sidecars.mjs
//   node scripts/generate-rcap-pdf-final-sidecars.mjs --check
//
// The captain froze the implementation at f34fe99d and dispatched two evidence
// sessions against it. This produces the sidecar half. Every digest is
// recomputed from a file in this checkout, and every sidecar names the freeze
// it describes, because a record that names the tree instead of the bytes
// cannot be shown later to have been true.
//
// SOURCE IDENTITY COMES FROM THE INSTALLED SOURCE BYTES. The evidence pack
// installs each official source under private/ at the path the freeze names, so
// the digest here is taken from the file and then checked against the frozen
// sourceSha256 and sourceByteLength. A family whose source is not installed is
// a failure, never a fallback to a receipt.
//
// THE QUEUE IS RE-DERIVED, NOT TRUSTED. The 38 family IDs are recomputed from
// the captain's own predicate over pdf-finish-workview.json -- an
// implementation-complete family whose sidecar or visual evidence is absent or
// stale -- and the count must come out at the declared EVIDENCE_QUEUE. A list
// copied from the pack would agree with the pack about everything, including a
// mistake.
//
// Captain metadata is read with `git show` from the coordination head, so the
// implementation base under the working tree is never changed to reach it.
//
// THREE FAMILY SHAPES, AND ONLY ONE OF THEM HAS AN ARTIFACT.
//
//   filing_artifact            a finalized participant PDF exists; the canonical
//                              schema describes it, bound to its output hash
//   no_participant_artifact    the family's terminal disposition correctly
//                              produces no participant PDF
//   reference_only             a translation the issuing court prints as not for
//                              filing; it has no participant artifact by design
//
// The last two get a record that says `artifactExpected: false` and carries an
// empty artifact list. Nothing is manufactured to fill the gap: a digest
// invented for an artifact that does not exist is worse than no record, because
// it reads exactly like evidence. An intentionally absent artifact is a
// recorded outcome here, not an evidence failure.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { artifactProvenance, PROVENANCE_SCHEMA } from "./rcap-official-forms/rcap-artifact-provenance.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");

const FREEZE_SHA = "f34fe99d8760805eef219c4014664a87f6e90e50";
const CAPTAIN_HEAD = "513b9ce35df005af956781ce4e05c5a400806478";
const SOURCE_PACK = "pdf-finish-final-evidence";
// Taken from the freeze commit rather than the clock, so a second invocation
// reproduces the first byte for byte.
const GENERATED_AT = "2026-08-22T00:00:00.000Z";

const BATCH = "pdf-finish-final";
const EVIDENCE_DIR = `data/rcap-all50/gate-b-sidecars/${BATCH}`;
const MANIFEST = `${EVIDENCE_DIR}/sidecar-evidence.json`;
const SIDECAR = "artifact-provenance.json";
const TERMINAL_SCHEMA = "rcap-terminal-provenance/v1";

const CANONICAL = "fixtures/canonical-filled.pdf";
const BOUNDARY = "fixtures/boundary-filled.pdf";
const CONTACT_SHEET = "contact-sheet/blank-vs-filled.pdf";
const ARTIFACT_ORDER = [CANONICAL, BOUNDARY, CONTACT_SHEET];

/** Optional package inputs, hashed where the family carries them. */
const MAP_FILES = ["production-field-map.json", "overlay-profile.json"];
const PROOF_FILES = ["implementation-proof.json", "terminal-state.json"];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const fileSha = (file) => sha256(fs.readFileSync(file));
const readJson = (file, fallback = null) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
const showJson = (ref) => JSON.parse(execFileSync("git", ["show", ref], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

/**
 * The evidence queue, re-derived from the captain's stated predicate.
 *
 * The pack ships a family list. Reading it back as the assignment would make
 * this agree with the pack about everything the pack got wrong, so the queue is
 * recomputed from the work view and only its size is checked against the
 * declared count.
 */
function evidenceQueue(workview) {
  const stale = (v) => !v || /none|absent|no |not /i.test(String(v));
  const ids = workview.families
    .filter((f) => f.ownerLane?.lane === "implementation_complete")
    .filter((f) => stale(f.evidenceStatus?.sidecar) || stale(f.evidenceStatus?.visual))
    .map((f) => f.familyId);
  return [...new Set(ids)].sort();
}

/** What a finalized artifact is, observed from the artifact. */
async function observeArtifact(file) {
  const bytes = fs.readFileSync(file);
  const scan = scanBytesForActiveContent(bytes);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const acro = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  const fields = acro ? doc.getForm().getFields() : [];
  return {
    bytes,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    pageCount: doc.getPageCount(),
    activeContent: { inspectable: scan.inspectable, hits: scan.hits, clean: scan.hits.length === 0 },
    flattening: {
      acroFormPresent: Boolean(acro),
      formFields: fields.length,
      xfaPresent: Boolean(acro && acro.get(PDFName.of("XFA")) !== undefined),
      flattened: fields.length === 0
    }
  };
}

/**
 * The classification and how completely it covers the document.
 *
 * classCounts says how the classified fields were classified; it cannot say
 * whether anything went unclassified. Where a family carries the completeness
 * counters they are recorded and checked; where it does not, that is recorded
 * as an absence rather than read as agreement.
 */
function classificationEvidence(classification) {
  if (!classification) return null;
  const int = (v) => (Number.isInteger(v) ? v : null);
  const discovered = int(classification.discoveredFieldsOrAnchors);
  const classified = int(classification.classifiedFieldsOrAnchors);
  const counts = classification.classCounts ?? {};
  const tally = Object.values(counts).reduce((n, v) => n + (Number.isInteger(v) ? v : 0), 0);
  return {
    schemaVersion: classification.schemaVersion ?? null,
    documentOwnership: classification.documentOwnership ?? null,
    denominator: classification.denominator ?? null,
    discoveredFieldsOrAnchors: discovered,
    classifiedFieldsOrAnchors: classified,
    countersPresent: discovered !== null && classified !== null,
    complete: discovered !== null && classified !== null ? discovered === classified : null,
    classCounts: counts,
    classCountsTotal: tally,
    entries: (classification.entries ?? []).length
  };
}

/** One family's evidence, recomputed from disk. */
async function readFamily(frozen) {
  const dir = frozen.packagePath;
  const at = (rel) => path.join(dir, rel);
  const record = readJson(at("source-record.json"), {});
  const receipt = readJson(at("source-receipt.json"), {});
  const classification = readJson(at("field-classification.json"));

  // Source identity, taken from the installed bytes the pack placed.
  const resolved = frozen.sourceResolvedPath;
  const present = Boolean(resolved && fs.existsSync(resolved));
  const source = {
    resolvedPath: resolved,
    bytesInstalled: present,
    sha256: present ? fileSha(resolved) : null,
    byteLength: present ? fs.statSync(resolved).size : null,
    frozenSha256: frozen.sourceSha256 ?? null,
    frozenByteLength: frozen.sourceByteLength ?? null,
    sourcePack: SOURCE_PACK,
    sourceArchive: receipt.sourceArchive ?? null,
    pathInArchive: receipt.pathInArchive ?? null,
    // Carried exactly as the family records it; never invented.
    sourceUrl: record.sourceUrl ?? null,
    revision: receipt.revision ?? record.revision ?? null
  };
  source.matchesFreeze = present && source.sha256 === source.frozenSha256 && source.byteLength === source.frozenByteLength;

  const map = MAP_FILES.filter((f) => fs.existsSync(at(f)))
    .map((f) => ({ file: f, sha256: fileSha(at(f)), schemaVersion: readJson(at(f), {}).schemaVersion ?? null }));
  const proofs = PROOF_FILES.filter((f) => fs.existsSync(at(f)))
    .map((f) => ({ file: f, sha256: fileSha(at(f)) }));

  const inputs = {
    sourceRecordSha256: fs.existsSync(at("source-record.json")) ? fileSha(at("source-record.json")) : null,
    sourceReceiptSha256: fs.existsSync(at("source-receipt.json")) ? fileSha(at("source-receipt.json")) : null,
    maps: map,
    fieldCensusSha256: fs.existsSync(at("field-census.json")) ? fileSha(at("field-census.json")) : null,
    fieldClassificationSha256: fs.existsSync(at("field-classification.json")) ? fileSha(at("field-classification.json")) : null,
    familyLocalProofs: proofs
  };

  // Frozen package bytes must still be the bytes on disk. This is what makes
  // the sidecar a statement about f34fe99d rather than about whatever the
  // working tree happens to hold.
  const freezeBinding = Object.entries(frozen.boundHashes ?? {}).map(([rel, expected]) => ({
    file: rel,
    frozenSha256: expected,
    onDiskSha256: fs.existsSync(at(rel)) ? fileSha(at(rel)) : null
  }));

  const artifactExpected = frozen.hasFilingArtifact === true;
  const observed = {};
  if (artifactExpected) {
    for (const rel of ARTIFACT_ORDER) {
      if (fs.existsSync(at(rel))) observed[rel] = await observeArtifact(at(rel));
    }
  }

  return {
    familyId: frozen.familyId,
    dir,
    jurisdiction: frozen.familyId.split(":")[0],
    documentId: receipt.documentId ?? record.documentId ?? null,
    officialTitle: record.officialTitle ?? null,
    disposition: frozen.canonicalTerminalDisposition ?? (artifactExpected ? "filing_artifact" : "no_participant_artifact"),
    canonicalTerminalDisposition: frozen.canonicalTerminalDisposition ?? null,
    artifactExpected,
    // The court's own printed reason a translation is not filed, kept with the
    // record that says the family has no artifact.
    referenceOnlyNotice: frozen.canonicalTerminalDisposition === "reference_only"
      ? (record.ownerDisposition?.basis ?? null)
      : null,
    documentRole: record.documentRole ?? null,
    language: record.language ?? null,
    participantFillable: record.participantFillable ?? null,
    source,
    inputs,
    classification: classificationEvidence(classification),
    freezeBinding,
    observed
  };
}

/** The sidecar for one family, in whichever of the two shapes it warrants. */
async function buildSidecar(family) {
  const common = {
    implementationFreezeSha: FREEZE_SHA,
    captainCoordinationHead: CAPTAIN_HEAD,
    sourcePack: SOURCE_PACK,
    familyId: family.familyId,
    disposition: family.disposition,
    canonicalTerminalDisposition: family.canonicalTerminalDisposition,
    artifactExpected: family.artifactExpected,
    sourceIdentity: {
      resolvedPath: family.source.resolvedPath,
      sha256: family.source.sha256,
      byteLength: family.source.byteLength,
      hashedFromInstalledBytes: family.source.bytesInstalled,
      matchesImplementationFreeze: family.source.matchesFreeze,
      sourcePack: family.source.sourcePack,
      sourceUrl: family.source.sourceUrl
    },
    packageIdentity: {
      sourceRecordSha256: family.inputs.sourceRecordSha256,
      sourceReceiptSha256: family.inputs.sourceReceiptSha256,
      maps: family.inputs.maps,
      fieldCensusSha256: family.inputs.fieldCensusSha256,
      fieldClassificationSha256: family.inputs.fieldClassificationSha256,
      familyLocalProofs: family.inputs.familyLocalProofs
    },
    classification: family.classification,
    freezeBinding: family.freezeBinding
  };

  if (!family.artifactExpected) {
    return {
      schemaVersion: TERMINAL_SCHEMA,
      purpose:
        "Provenance for a family whose terminal disposition correctly produces no participant artifact. The absence is the outcome, not a gap: no artifact digest is manufactured, and this record must never be read as one describing a document.",
      ...common,
      terminalState: {
        disposition: family.disposition,
        documentRole: family.documentRole,
        language: family.language,
        participantFillable: family.participantFillable,
        referenceOnlyNotice: family.referenceOnlyNotice,
        participantArtifacts: 0
      },
      generatedAt: GENERATED_AT,
      artifacts: []
    };
  }

  const rels = ARTIFACT_ORDER.filter((rel) => family.observed[rel]);
  const record = await artifactProvenance({
    jurisdiction: family.jurisdiction,
    assetId: family.documentId ?? family.familyId,
    documentId: family.documentId,
    formFamily: family.familyId.split(":")[1],
    officialFormNumber: family.documentId,
    officialTitle: family.officialTitle,
    sourcePublisher: null,
    sourceUrl: family.source.sourceUrl,
    sourceRevision: family.source.revision,
    sourceSha256: family.source.sha256,
    sourceMetadataFingerprint: null,
    fieldMapSha256: family.inputs.maps[0]?.sha256 ?? null,
    classificationSha256: family.inputs.fieldClassificationSha256,
    packetSpecSha256: null,
    rendererVersion: readJson(path.join(family.dir, SIDECAR), {}).rendererVersion ?? null,
    generatedAt: GENERATED_AT,
    activeContentResult: {
      basis: "scanBytesForActiveContent over the frozen artifact bytes",
      clean: rels.every((rel) => family.observed[rel].activeContent.clean),
      perArtifact: Object.fromEntries(rels.map((rel) => [rel, family.observed[rel].activeContent]))
    },
    flatteningResult: {
      basis: "AcroForm and XFA state observed on the frozen artifact",
      allFlattened: rels.every((rel) => family.observed[rel].flattening.flattened),
      perArtifact: Object.fromEntries(rels.map((rel) => [rel, family.observed[rel].flattening]))
    },
    protectedFieldResult: null,
    fixtureIdentity: common,
    artifacts: rels.map((rel) => ({ rel, bytes: family.observed[rel].bytes, pageCount: family.observed[rel].pageCount }))
  });
  return record;
}

function buildManifest(families, sidecars) {
  const shape = (f) => (f.canonicalTerminalDisposition === "reference_only" ? "reference_only"
    : f.artifactExpected ? "filing_artifact" : "no_participant_artifact");
  return {
    schemaVersion: "rcap-pdf-final-sidecar-manifest/v1",
    batch: BATCH,
    purpose:
      "Sidecar evidence for the 38-family PDF-finish evidence queue. Every digest is recomputed from a file in this checkout; every source digest is taken from the official bytes the evidence pack installed and checked against the implementation freeze.",
    implementationFreezeSha: FREEZE_SHA,
    captainCoordinationHead: CAPTAIN_HEAD,
    sourcePack: SOURCE_PACK,
    generatedAt: GENERATED_AT,
    sourceUrlPolicy: "No source URL is synthesized. Each sidecar carries exactly the citation its own source-record.json holds.",
    families: families.map((family, i) => ({
      familyId: family.familyId,
      packagePath: family.dir,
      shape: shape(family),
      disposition: family.disposition,
      artifactExpected: family.artifactExpected,
      source: {
        resolvedPath: family.source.resolvedPath,
        sha256: family.source.sha256,
        byteLength: family.source.byteLength,
        matchesImplementationFreeze: family.source.matchesFreeze,
        revision: family.source.revision
      },
      inputs: family.inputs,
      classification: family.classification,
      artifacts: ARTIFACT_ORDER.filter((rel) => family.observed[rel]).map((rel) => ({
        artifact: rel,
        sha256: family.observed[rel].sha256,
        byteLength: family.observed[rel].byteLength,
        pageCount: family.observed[rel].pageCount,
        activeContentClean: family.observed[rel].activeContent.clean,
        flattened: family.observed[rel].flattening.flattened
      })),
      freezeBinding: family.freezeBinding,
      sidecar: {
        file: `${family.dir}/${SIDECAR}`,
        schemaVersion: sidecars[i].schemaVersion,
        sha256: sha256(Buffer.from(`${JSON.stringify(sidecars[i], null, 2)}\n`, "utf8"))
      }
    })),
    totals: {
      families: families.length,
      filingArtifactFamilies: families.filter((f) => shape(f) === "filing_artifact").length,
      noParticipantArtifactFamilies: families.filter((f) => shape(f) === "no_participant_artifact").length,
      referenceOnlyFamilies: families.filter((f) => shape(f) === "reference_only").length,
      artifactsPinned: families.reduce((n, f) => n + ARTIFACT_ORDER.filter((r) => f.observed[r]).length, 0),
      sourcesHashedFromInstalledBytes: families.filter((f) => f.source.bytesInstalled).length,
      classificationsCarryingCounters: families.filter((f) => f.classification?.countersPresent).length
    }
  };
}

/** Every way the committed evidence can stop describing the bytes on disk. */
function failures({ queue, families, sidecars, manifest, committedSidecars, committedManifest }) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  fail(queue.length === 38, `the re-derived evidence queue holds ${queue.length} famil(ies), not 38`);
  fail(families.length === queue.length, `read ${families.length} famil(ies) for a queue of ${queue.length}`);

  for (let i = 0; i < families.length; i += 1) {
    const family = families[i];
    const committed = committedSidecars[i];
    const id = family.familyId;
    if (!committed) { fail(false, `${id}: no committed sidecar on disk`); continue; }

    fail(committed.implementationFreezeSha === FREEZE_SHA || committed.fixtureIdentity?.implementationFreezeSha === FREEZE_SHA,
      `${id}: the sidecar does not bind to the implementation freeze ${FREEZE_SHA.slice(0, 8)}`);

    // Source identity, from installed bytes, agreeing with the freeze.
    fail(family.source.bytesInstalled, `${id}: the official source is not installed at ${family.source.resolvedPath}`);
    fail(family.source.matchesFreeze,
      `${id}: SOURCE DRIFT — installed bytes hash ${String(family.source.sha256).slice(0, 12)}/${family.source.byteLength}, freeze names ${String(family.source.frozenSha256).slice(0, 12)}/${family.source.frozenByteLength}`);
    const si = committed.sourceIdentity ?? committed.fixtureIdentity?.sourceIdentity ?? {};
    fail(si.sha256 === family.source.sha256, `${id}: the sidecar's source digest is not the installed source's digest`);
    fail(si.hashedFromInstalledBytes === true, `${id}: the sidecar does not record its source digest as taken from installed bytes`);
    fail(si.sourceUrl === family.source.sourceUrl, `${id}: the sidecar's source URL is not the citation the family records`);

    // No historical implementation hash survives: every frozen package byte
    // must still be the byte on disk.
    for (const b of family.freezeBinding) {
      fail(b.onDiskSha256 === b.frozenSha256,
        `${id}: ${b.file} is ${String(b.onDiskSha256).slice(0, 12)} on disk, the freeze names ${String(b.frozenSha256).slice(0, 12)}`);
    }
    const pkg = committed.packageIdentity ?? committed.fixtureIdentity?.packageIdentity ?? {};
    fail(pkg.sourceRecordSha256 === family.inputs.sourceRecordSha256, `${id}: the sidecar's source-record pin does not match disk`);
    fail(pkg.fieldClassificationSha256 === family.inputs.fieldClassificationSha256, `${id}: the sidecar's classification pin does not match disk`);
    fail(pkg.fieldCensusSha256 === family.inputs.fieldCensusSha256, `${id}: the sidecar's census pin does not match disk`);
    fail(JSON.stringify(pkg.maps) === JSON.stringify(family.inputs.maps), `${id}: the sidecar's map pins do not match disk`);
    fail(JSON.stringify(pkg.familyLocalProofs) === JSON.stringify(family.inputs.familyLocalProofs), `${id}: the sidecar's family-local proof pins do not match disk`);

    const cls = committed.classification ?? committed.fixtureIdentity?.classification ?? null;
    fail(JSON.stringify(cls) === JSON.stringify(family.classification), `${id}: the sidecar's classification evidence is not what the file now carries`);
    if (family.classification?.countersPresent) {
      fail(family.classification.complete === true,
        `${id}: INCOMPLETE CLASSIFICATION — ${family.classification.classifiedFieldsOrAnchors} of ${family.classification.discoveredFieldsOrAnchors} classified`);
    }

    const expected = committed.artifactExpected ?? committed.fixtureIdentity?.artifactExpected;
    fail(expected === family.artifactExpected, `${id}: the sidecar's artifactExpected does not match the frozen disposition`);

    if (!family.artifactExpected) {
      // The absence is the outcome. Nothing may be manufactured to fill it.
      fail(committed.schemaVersion === TERMINAL_SCHEMA, `${id}: a no-artifact family carries the artifact schema`);
      fail(Array.isArray(committed.artifacts) && committed.artifacts.length === 0,
        `${id}: a no-artifact family's sidecar names ${committed.artifacts?.length} artifact(s)`);
      fail(committed.terminalState?.participantArtifacts === 0, `${id}: the terminal state does not record zero participant artifacts`);
      if (family.canonicalTerminalDisposition === "reference_only") {
        fail(committed.terminalState?.referenceOnlyNotice === family.referenceOnlyNotice,
          `${id}: the reference-only sidecar does not carry the court's printed notice`);
        fail(Boolean(committed.terminalState?.referenceOnlyNotice), `${id}: reference-only with no notice preserved`);
      }
      fail(Object.keys(family.observed).length === 0, `${id}: a no-artifact family has artifacts on disk`);
      continue;
    }

    // Artifact identity against the bytes on disk.
    fail(committed.schemaVersion === PROVENANCE_SCHEMA, `${id}: sidecar declares ${JSON.stringify(committed.schemaVersion)}, not ${PROVENANCE_SCHEMA}`);
    const rels = ARTIFACT_ORDER.filter((rel) => family.observed[rel]);
    fail(rels.length > 0, `${id}: a filing-artifact family carries no artifact on disk`);
    for (const rel of rels) {
      const row = (committed.artifacts ?? []).find((r) => r.artifact === rel);
      const seen = family.observed[rel];
      if (!row) { fail(false, `${id}: sidecar names no row for ${rel}`); continue; }
      fail(row.outputSha256 === seen.sha256, `${id}:${rel}: STALE ARTIFACT PIN — bytes hash ${seen.sha256.slice(0, 12)}, sidecar names ${String(row.outputSha256).slice(0, 12)}`);
      fail(row.byteLength === seen.byteLength, `${id}:${rel}: byte length disagrees with the file`);
      fail(row.pageCount === seen.pageCount, `${id}:${rel}: page count disagrees with the file`);
      fail(seen.activeContent.clean === true, `${id}:${rel}: active content on the frozen artifact`);
    }
    for (const row of committed.artifacts ?? []) {
      fail(rels.includes(row.artifact), `${id}: sidecar names ${row.artifact}, which is not on disk`);
    }
  }

  if (!committedManifest) {
    fail(false, "no committed batch manifest on disk");
  } else {
    fail(committedManifest.implementationFreezeSha === FREEZE_SHA, "the manifest does not bind to the implementation freeze");
    fail(committedManifest.totals?.families === 38, `the manifest covers ${committedManifest.totals?.families} famil(ies), not 38`);
    fail(JSON.stringify(committedManifest) === JSON.stringify(manifest),
      "the committed batch manifest is not what the current bytes produce; re-run the generator");
  }
  return out;
}

// ---------------------------------------------------------------------------

const freeze = showJson(`${CAPTAIN_HEAD}:data/rcap-all50/pdf-implementation-freeze.json`);
const workview = showJson(`${CAPTAIN_HEAD}:data/rcap-all50/pdf-finish-workview.json`);

if (freeze.PDF_IMPLEMENTATION_FREEZE_SHA !== FREEZE_SHA) {
  console.error(`FAIL the freeze record names ${freeze.PDF_IMPLEMENTATION_FREEZE_SHA}, not ${FREEZE_SHA}`);
  process.exit(1);
}
const queue = evidenceQueue(workview);
if (queue.length !== workview.queues.EVIDENCE_QUEUE) {
  console.error(`FAIL re-derived ${queue.length} famil(ies) against a declared evidence queue of ${workview.queues.EVIDENCE_QUEUE}`);
  process.exit(1);
}
const frozenById = new Map(freeze.families.map((f) => [f.familyId, f]));
const unknown = queue.filter((id) => !frozenById.has(id));
if (unknown.length) {
  console.error(`FAIL ${unknown.length} queued famil(ies) carry no freeze row: ${unknown.join(", ")}`);
  process.exit(1);
}

const families = [];
for (const id of queue) families.push(await readFamily(frozenById.get(id)));
const sidecars = [];
for (const family of families) sidecars.push(await buildSidecar(family));
const manifest = buildManifest(families, sidecars);

const committedSidecars = families.map((f) => readJson(path.join(f.dir, SIDECAR)));
const committedManifest = readJson(MANIFEST);

if (CHECK) {
  const problems = failures({ queue, families, sidecars, manifest, committedSidecars, committedManifest });
  if (problems.length > 0) {
    console.error(`FAIL pdf-finish sidecars — ${problems.length} problem(s):\n`);
    for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
    if (problems.length > 40) console.error(` ... and ${problems.length - 40} more`);
    process.exit(1);
  }
  const t = manifest.totals;
  console.log(
    `OK pdf-finish sidecars — ${t.families}/38 families covered (${t.filingArtifactFamilies} filing artifact, ` +
    `${t.noParticipantArtifactFamilies} no participant artifact, ${t.referenceOnlyFamilies} reference only); ` +
    `${t.artifactsPinned} artifact(s) pinned, ${t.sourcesHashedFromInstalledBytes}/38 source digests from installed bytes, all bound to ${FREEZE_SHA.slice(0, 8)}.`
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
  `pdf-finish sidecars: ${t.families} written (${t.filingArtifactFamilies} filing artifact, ${t.noParticipantArtifactFamilies} no participant artifact, ` +
  `${t.referenceOnlyFamilies} reference only), ${t.artifactsPinned} artifact(s) pinned, manifest at ${MANIFEST}.`
);
