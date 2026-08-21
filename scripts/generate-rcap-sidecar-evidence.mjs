#!/usr/bin/env node
// Wave A sidecar evidence at 1b8a8cdd, pinned to current bytes.
//
//   node scripts/generate-rcap-sidecar-evidence.mjs
//   node scripts/generate-rcap-sidecar-evidence.mjs --check
//   node scripts/generate-rcap-sidecar-evidence.mjs --mutations
//
// The rerender at da902cba re-emitted these four families from installed
// official source, and 1b8a8cdd then gave two of them a real field
// classification: the AOC-CR-287 Spanish and Vietnamese forms went from an empty
// classCounts to three classified anchors with completeness counters. A sidecar
// written before that commit pins a classification that no longer exists, which
// is why this rebuilds rather than amends. The sidecars on disk bind the
// artifact hashes and nothing else: classificationSha256, activeContentResult, flatteningResult,
// protectedFieldResult and fixtureIdentity are null in all four, because the D1
// renderer never passes them. A reviewer opening one learns which bytes it
// describes and cannot learn whether those bytes are flattened, whether they
// are free of active content, which classification decided what the factory was
// allowed to touch, or whether the contact sheet beside them is a picture of
// that artifact or of an earlier one.
//
// Every slot the current schema has is filled here from the files on disk. The
// schema is not extended and the shared provenance module is not touched:
// `artifactProvenance()` already accepts all of these and the renderers simply
// never supplied them.
//
// SOURCE IDENTITY IS HASHED, NOT ASSERTED. Unlike the lane-2 batches, this
// pack installs the official binaries into the Master Library path the family
// records pin, so the source bytes are in the clone and are re-hashed here. The
// recorded digest has to equal the bytes at the receipt's own resolved path,
// and the source's descriptive metadata is fingerprinted from the document
// rather than left null. Where a source is absent the record says so and falls
// back to corroboration across the committed records, but it never quietly
// treats a receipt as if it were a hash of bytes.
//
// No source URL is synthesized. The sidecar carries exactly what the family's
// own source-record.json holds and nothing else: the three NC forms record a
// real nccourts.gov citation acquired 2026-08-02, AK TF-810 records none. Where
// there is none the verified archive path plus digest is the controlling
// provenance, and inventing a URL to fill the gap would turn an archive digest
// into a citation nobody can check.
//
// The field map is re-derived from the map's OWN declared schema. The three
// shapes in this corpus disagree about where the map lives -- an AcroForm map
// hashes its bindings, a v5 flat profile nests its anchors under anchorCapture,
// a v8 flat profile keeps them at the top -- so the shape is never guessed by
// trying candidates until one matches, which is a check that cannot fail. An
// unrecognised schema is a failure.
//
// The classification is pinned WITH its completeness counters, so a reviewer can
// see not just which classification decided what the factory could touch but
// whether that classification covered the whole document. Where a family
// carries the counters they are checked -- classified must equal discovered, and
// the class tally must equal the classified count. Where a family does not carry
// them the record says so rather than reading their absence as agreement; two
// of these four have no counters and one of those has an empty classification,
// and neither fact is this lane's to fix.
//
// `--check` re-reads the committed sidecars and the batch manifest FROM DISK and
// requires them to equal a fresh recomputation, so a sidecar that stopped
// describing its artifact fails rather than being quietly rewritten.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { artifactProvenance, provenanceCoversArtifact, PROVENANCE_SCHEMA } from "./rcap-official-forms/rcap-artifact-provenance.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { sourceMetadataFingerprint } from "./rcap-official-forms/rcap-official-form-finalize.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");

const BATCH = "wave-a";
const BASE_COMMIT = "1b8a8cdd6c3a17a5452cfa3e4c238c5e6b329800";
// The instant the current bytes came into existence, taken from the rerender
// commit rather than the clock. A clock read would make the second pass of this
// generator differ from the first, which is the one thing the drift gate exists
// to detect.
const GENERATED_AT = "2026-08-21T16:57:47.000Z";
const SOURCE_PACK = "family-rerender-lane-1-batch-01";

const OVERLAYS = "data/rcap-all50/overlays/production";
const EVIDENCE_DIR = `data/rcap-all50/gate-b-sidecars/${BATCH}`;
const MANIFEST = `${EVIDENCE_DIR}/sidecar-evidence.json`;

const FAMILIES = [
  "alaska/tf-810-form-en",
  "north-carolina/aoc-cr-287-form-es",
  "north-carolina/aoc-cr-287-form-vi",
  "north-carolina/aoc-cr-288-form-es"
];

const CANONICAL = "fixtures/canonical-filled.pdf";
const BOUNDARY = "fixtures/boundary-filled.pdf";
const CONTACT_SHEET = "contact-sheet/blank-vs-filled.pdf";
const ARTIFACT_ORDER = [CANONICAL, BOUNDARY, CONTACT_SHEET];

/** Which committed file holds the map, and which part of it the renderer hashed. */
const FIELD_MAP_SHAPES = [
  { file: "production-field-map.json", schema: /^rcap-acroform-map\//, hashedPart: "bindings", pick: (m) => m.bindings },
  { file: "overlay-profile.json", schema: /^rcap-flat_overlay-map\/v5$/, hashedPart: "anchorCapture.anchors", pick: (m) => m.anchorCapture?.anchors },
  { file: "overlay-profile.json", schema: /^rcap-flat_overlay-map\/v8/, hashedPart: "anchors", pick: (m) => m.anchors }
];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const hashJson = (value) => sha256(Buffer.from(JSON.stringify(value ?? null), "utf8"));
const fileSha = (file) => sha256(fs.readFileSync(file));
const readJson = (file, fallback = null) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;

/**
 * The classification, with the completeness counters 1b8a8cdd introduced.
 *
 * `classCounts` alone says how the classified fields were classified; it cannot
 * say whether anything went unclassified. The counters answer that, so they are
 * pinned beside the digest. A family that does not carry them is recorded as not
 * carrying them: absent counters are not agreement, and reading them that way is
 * how an unclassified field reaches a filed page.
 */
function classificationEvidence(classification) {
  const int = (v) => (Number.isInteger(v) ? v : null);
  const discovered = int(classification?.discoveredFieldsOrAnchors);
  const classified = int(classification?.classifiedFieldsOrAnchors);
  const counts = classification?.classCounts ?? {};
  const tally = Object.values(counts).reduce((n, v) => n + (Number.isInteger(v) ? v : 0), 0);
  return {
    schemaVersion: classification?.schemaVersion ?? null,
    documentOwnership: classification?.documentOwnership ?? null,
    denominator: classification?.denominator ?? null,
    discoveredFieldsOrAnchors: discovered,
    classifiedFieldsOrAnchors: classified,
    countersPresent: discovered !== null && classified !== null,
    complete: discovered !== null && classified !== null ? discovered === classified : null,
    classCounts: counts,
    classCountsTotal: tally,
    entries: (classification?.entries ?? []).length
  };
}

/** What the artifact is, observed from the artifact rather than asserted. */
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
 * The official source, hashed from the installed bytes when they are present.
 *
 * The pack installs each binary at the path the family's receipt already names,
 * so this is a direct check of the recorded digest against the file rather than
 * a restatement of the receipt. When the binary is absent the record says so
 * and the digest falls back to agreement across the committed records; the two
 * cases are never conflated.
 */
async function readSource(record, receipt) {
  const recorded = receipt.sha256 ?? record.sha256 ?? null;
  const resolved = receipt.resolvedPath ?? null;
  const present = Boolean(resolved && fs.existsSync(path.join(rootDir, resolved)));
  const out = {
    sha256: recorded,
    byteLength: receipt.byteLength ?? record.byteLength ?? null,
    bytesInClone: present,
    hashedFromBytes: null,
    observedByteLength: null,
    metadataFingerprint: null,
    controllingProvenance: "verified_archive_path_plus_digest",
    sourcePack: SOURCE_PACK,
    sourceArchive: receipt.sourceArchive ?? null,
    pathInArchive: receipt.pathInArchive ?? null,
    resolvedPath: resolved,
    matchedBy: receipt.matchedBy ?? null,
    sourceUrl: record.sourceUrl ?? null
  };
  if (!present) return out;
  const bytes = fs.readFileSync(path.join(rootDir, resolved));
  out.hashedFromBytes = sha256(bytes);
  out.observedByteLength = bytes.length;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    out.metadataFingerprint = sourceMetadataFingerprint(doc);
  } catch {
    out.metadataFingerprint = null;
  }
  return out;
}

/**
 * One family's evidence, recomputed from disk.
 *
 * Nothing is carried forward from the committed sidecar, so a sidecar that has
 * drifted away from its artifact cannot launder itself through a regeneration.
 */
async function readFamily(slug) {
  const dir = path.join(OVERLAYS, slug);
  const [state, familySlug] = slug.split("/");
  const record = readJson(path.join(dir, "source-record.json"), {});
  const receipt = readJson(path.join(dir, "source-receipt.json"), {});
  const classification = readJson(path.join(dir, "field-classification.json"));
  const census = readJson(path.join(dir, "field-census.json"));
  const proof = readJson(path.join(dir, "contact-sheet/contact-sheet-proof.json"), {});
  const protectedScan = readJson(path.join(dir, "reports/protected-fields-scan.json"), {});
  const rendered = readJson(path.join(dir, "reports/rendered-artifacts.json"), {});

  let fieldMap = null;
  let declaredMapSchema = null;
  for (const shape of FIELD_MAP_SHAPES) {
    const map = readJson(path.join(dir, shape.file));
    if (!map) continue;
    declaredMapSchema = declaredMapSchema ?? String(map.schemaVersion ?? "(none)");
    if (!shape.schema.test(String(map.schemaVersion ?? ""))) continue;
    fieldMap = {
      file: shape.file,
      schemaVersion: map.schemaVersion,
      hashedPart: shape.hashedPart,
      fileSha256: fileSha(path.join(dir, shape.file)),
      derivedSha256: hashJson(shape.pick(map)),
      declaredSourceSha256: map.sha256 ?? null
    };
    break;
  }

  const observed = {};
  for (const rel of ARTIFACT_ORDER) observed[rel] = await observeArtifact(path.join(dir, rel));

  const source = await readSource(record, receipt);
  const corroboration = {
    "source-record.json": record.sha256 ?? null,
    "source-receipt.json": receipt.sha256 ?? null,
    [fieldMap ? fieldMap.file : "field map"]: fieldMap?.declaredSourceSha256 ?? null,
    "reports/rendered-artifacts.json": rendered.sourceSha256 ?? null
  };
  source.corroboratedBy = corroboration;
  source.corroborationAgrees = [...new Set(Object.values(corroboration).filter(Boolean))].length === 1;

  return {
    familyId: `${receipt.jurisdiction ?? record.jurisdiction}:${familySlug}`,
    state,
    slug,
    dir,
    jurisdiction: receipt.jurisdiction ?? record.jurisdiction ?? null,
    documentId: receipt.documentId ?? record.documentId ?? null,
    familySlug,
    officialTitle: record.officialTitle ?? null,
    // The receipt is the controlling record: it carries the revision even where
    // source-record.json leaves it null.
    sourceRevision: receipt.revision ?? record.revision ?? null,
    language: record.language ?? null,
    documentRole: record.documentRole ?? null,
    participantFillable: record.participantFillable ?? null,
    generationAllowed: record.generationAllowed ?? null,
    productionHolds: record.productionHolds ?? [],
    source,
    fieldMap,
    declaredMapSchema,
    inputs: {
      fieldMapFile: fieldMap?.file ?? null,
      fieldMapFileSha256: fieldMap?.fileSha256 ?? null,
      fieldMapDerivedSha256: fieldMap?.derivedSha256 ?? null,
      fieldCensusFileSha256: fileSha(path.join(dir, "field-census.json")),
      fieldCensusSha256: hashJson(census),
      fieldClassificationFileSha256: fileSha(path.join(dir, "field-classification.json")),
      fieldClassificationSha256: hashJson(classification),
      classification: classificationEvidence(classification),
      populatedFieldsReportSha256: fileSha(path.join(dir, "reports/populated-fields.json")),
      protectedFieldScanSha256: fileSha(path.join(dir, "reports/protected-fields-scan.json")),
      contactSheetProofSha256: fileSha(path.join(dir, "contact-sheet/contact-sheet-proof.json"))
    },
    proof,
    protectedScan,
    observed
  };
}

/** The canonical sidecar for one family, with every slot the schema has filled. */
async function buildSidecar(family) {
  const committed = readJson(path.join(family.dir, "artifact-provenance.json"), {});
  const o = family.observed;

  return artifactProvenance({
    jurisdiction: family.jurisdiction,
    assetId: family.documentId,
    documentId: family.documentId,
    formFamily: family.familySlug,
    officialFormNumber: family.documentId,
    officialTitle: family.officialTitle,
    sourcePublisher: null,
    // Exactly what the family records, never more. Where the record holds no
    // URL the archive path in fixtureIdentity.source is the controlling
    // citation, and a synthesized URL would displace it with a dead one.
    sourceUrl: family.source.sourceUrl,
    sourceRevision: family.sourceRevision,
    sourceSha256: family.source.sha256,
    sourceMetadataFingerprint: family.source.metadataFingerprint,
    fieldMapSha256: family.inputs.fieldMapDerivedSha256,
    classificationSha256: family.inputs.fieldClassificationSha256,
    packetSpecSha256: null,
    rendererVersion: committed.rendererVersion,
    generatedAt: GENERATED_AT,
    activeContentResult: {
      basis: "scanBytesForActiveContent over the committed artifact bytes",
      clean: ARTIFACT_ORDER.every((rel) => o[rel].activeContent.clean),
      residueRecordedByScan: (family.protectedScan.activeContentResidue ?? []).length,
      perArtifact: Object.fromEntries(ARTIFACT_ORDER.map((rel) => [rel, o[rel].activeContent]))
    },
    flatteningResult: {
      basis: "AcroForm and XFA state observed on the committed artifact",
      allFlattened: ARTIFACT_ORDER.every((rel) => o[rel].flattening.flattened),
      perArtifact: Object.fromEntries(ARTIFACT_ORDER.map((rel) => [rel, o[rel].flattening]))
    },
    protectedFieldResult: {
      report: "reports/protected-fields-scan.json",
      reportSha256: family.inputs.protectedFieldScanSha256,
      pass: family.protectedScan.pass ?? null,
      writtenFields: family.protectedScan.writtenFields ?? null,
      refusedFields: family.protectedScan.refusedFields ?? null,
      protectedFieldsRefused: family.protectedScan.protectedFieldsRefused ?? null,
      violations: family.protectedScan.violations ?? null,
      valuesWrittenButNotVisible: family.protectedScan.valuesWrittenButNotVisible ?? null
    },
    fixtureIdentity: {
      canonical: CANONICAL,
      boundary: BOUNDARY,
      contactSheet: CONTACT_SHEET,
      // The contact sheet is a picture of a specific artifact. Its proof names
      // which one, so the binding is checkable rather than assumed: a sheet
      // carried over from an earlier render names a hash no longer on disk.
      contactSheetBinding: {
        proof: "contact-sheet/contact-sheet-proof.json",
        proofSha256: family.inputs.contactSheetProofSha256,
        finalizedSha256: family.proof.finalizedSha256 ?? null,
        sheetSha256: family.proof.sheetSha256 ?? null,
        boundToCurrentCanonical: family.proof.finalizedSha256 === o[CANONICAL].sha256,
        boundToCurrentSheet: family.proof.sheetSha256 === o[CONTACT_SHEET].sha256,
        allExpectedValuesVisible: family.proof.allExpectedValuesVisible ?? null,
        panelsDiffer: family.proof.panelsDiffer ?? null,
        expectedValues: family.proof.expectedValues ?? null
      },
      map: {
        file: family.inputs.fieldMapFile,
        schemaVersion: family.fieldMap?.schemaVersion ?? null,
        hashedPart: family.fieldMap?.hashedPart ?? null,
        fileSha256: family.inputs.fieldMapFileSha256
      },
      classification: {
        file: "field-classification.json",
        fileSha256: family.inputs.fieldClassificationFileSha256,
        ...family.inputs.classification
      },
      reports: {
        fieldCensusSha256: family.inputs.fieldCensusSha256,
        populatedFieldsReportSha256: family.inputs.populatedFieldsReportSha256
      },
      source: {
        bytesInClone: family.source.bytesInClone,
        hashedFromBytes: family.source.hashedFromBytes,
        observedByteLength: family.source.observedByteLength,
        controllingProvenance: family.source.controllingProvenance,
        sourcePack: family.source.sourcePack,
        sourceArchive: family.source.sourceArchive,
        pathInArchive: family.source.pathInArchive,
        resolvedPath: family.source.resolvedPath,
        matchedBy: family.source.matchedBy,
        byteLength: family.source.byteLength,
        corroboratedBy: family.source.corroboratedBy
      }
    },
    artifacts: ARTIFACT_ORDER.map((rel) => ({ rel, bytes: o[rel].bytes, pageCount: o[rel].pageCount }))
  });
}

function buildManifest(families, sidecars) {
  return {
    schemaVersion: "rcap-sidecar-evidence-manifest/v1",
    batch: BATCH,
    purpose:
      "Batch-level sidecar evidence for the lane-1 wave-A rerender. Every digest here is recomputed from a file in this clone, source bytes included: this pack installs the official binaries at the paths the family receipts name, so each recorded source digest is checked against the file rather than restated from the receipt.",
    baseCommit: BASE_COMMIT,
    sourcePack: SOURCE_PACK,
    generatedAt: GENERATED_AT,
    sourceUrlPolicy: "No source URL is synthesized. Each sidecar carries exactly the citation its own source-record.json holds; where a family records none, the verified archive path plus digest is the controlling provenance.",
    noFillInstructional: null,
    families: families.map((family, i) => ({
      familyId: family.familyId,
      slug: family.slug,
      documentId: family.documentId,
      language: family.language,
      documentRole: family.documentRole,
      sourceRevision: family.sourceRevision,
      participantFillable: family.participantFillable,
      generationAllowed: family.generationAllowed,
      productionHolds: family.productionHolds,
      source: family.source,
      inputs: family.inputs,
      classification: family.inputs.classification,
      artifacts: ARTIFACT_ORDER.map((rel) => ({
        artifact: rel,
        sha256: family.observed[rel].sha256,
        byteLength: family.observed[rel].byteLength,
        pageCount: family.observed[rel].pageCount,
        activeContentClean: family.observed[rel].activeContent.clean,
        flattened: family.observed[rel].flattening.flattened
      })),
      // Recorded, not adjudicated. What the render wrote is a legal-design
      // question for the owning lane; the evidence states it exactly.
      whatTheRenderWrote: {
        writtenFields: family.protectedScan.writtenFields ?? null,
        refusedFields: family.protectedScan.refusedFields ?? null,
        expectedValues: family.proof.expectedValues ?? null,
        canonicalDiffersFromBoundary: family.observed[CANONICAL].sha256 !== family.observed[BOUNDARY].sha256
      },
      contactSheetBinding: sidecars[i].fixtureIdentity.contactSheetBinding,
      sidecar: {
        file: `${family.slug}/artifact-provenance.json`,
        schemaVersion: sidecars[i].schemaVersion,
        sha256: sha256(Buffer.from(`${JSON.stringify(sidecars[i], null, 2)}\n`, "utf8"))
      }
    })),
    totals: {
      families: families.length,
      artifactsPinned: families.length * ARTIFACT_ORDER.length,
      sourcesHashedFromBytes: families.filter((f) => f.source.bytesInClone).length,
      classificationsCarryingCounters: families.filter((f) => f.inputs.classification.countersPresent).length,
      // Reported, not failed. This lane may not edit a classification, so the
      // gap is named for the lane that owns it rather than silently tolerated.
      classificationsWithoutCounters: families.filter((f) => !f.inputs.classification.countersPresent).map((f) => f.familyId),
      classificationsEmpty: families.filter((f) => f.inputs.classification.entries === 0).map((f) => f.familyId),
      sidecarsWritten: sidecars.length
    }
  };
}

/**
 * Every way the committed evidence can stop describing the bytes on disk.
 *
 * Compares the committed records against a fresh recomputation, so the failure
 * is always "the record disagrees with the file", never "the generator
 * disagrees with itself".
 */
function failures({ families, sidecars, manifest, committedSidecars, committedManifest }) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  fail(families.length === FAMILIES.length,
    `expected ${FAMILIES.length} families, read ${families.length}`);

  for (let i = 0; i < families.length; i += 1) {
    const family = families[i];
    const fresh = sidecars[i];
    const committed = committedSidecars[i];
    const id = family.familyId;

    if (!committed) { fail(false, `${id}: no committed sidecar on disk`); continue; }

    fail(committed.schemaVersion === PROVENANCE_SCHEMA,
      `${id}: sidecar declares ${JSON.stringify(committed.schemaVersion)}, not ${PROVENANCE_SCHEMA}`);

    // Source identity: hashed from the installed bytes, not restated.
    fail(Boolean(committed.sourceSha256), `${id}: sidecar states no source identity`);
    fail(committed.sourceSha256 === family.source.sha256,
      `${id}: sidecar source ${String(committed.sourceSha256).slice(0, 12)} is not the recorded digest ${String(family.source.sha256).slice(0, 12)}`);
    fail(family.source.bytesInClone === true,
      `${id}: the official source is not at ${family.source.resolvedPath}, so its digest cannot be checked against bytes`);
    if (family.source.bytesInClone) {
      fail(family.source.hashedFromBytes === family.source.sha256,
        `${id}: SOURCE DRIFT — the installed binary hashes to ${String(family.source.hashedFromBytes).slice(0, 12)}, the record names ${String(family.source.sha256).slice(0, 12)}`);
      fail(family.source.observedByteLength === family.source.byteLength,
        `${id}: the installed binary is ${family.source.observedByteLength} bytes, the record says ${family.source.byteLength}`);
      fail(committed.sourceMetadataFingerprint === family.source.metadataFingerprint,
        `${id}: the sidecar's source metadata fingerprint is not what the source document carries`);
    }
    fail(Boolean(committed.sourceRevision), `${id}: sidecar states no exact source revision`);
    fail(committed.sourceRevision === family.sourceRevision,
      `${id}: sidecar revision ${JSON.stringify(committed.sourceRevision)} is not the receipt revision ${JSON.stringify(family.sourceRevision)}`);
    fail(family.source.corroborationAgrees,
      `${id}: the committed records disagree about the source digest (${JSON.stringify(family.source.corroboratedBy)})`);
    // Synthesis in either direction: a URL the record does not hold, or one
    // that differs from the citation it does hold.
    fail(committed.sourceUrl === family.source.sourceUrl,
      family.source.sourceUrl === null
        ? `${id}: sidecar carries a source URL where the family records none; an archive digest must not become a citation nobody can check`
        : `${id}: sidecar's source URL is not the citation the family records`);
    fail(Boolean(committed.fixtureIdentity?.source?.resolvedPath),
      `${id}: no verified archive path recorded, so nothing controls source provenance in the absence of a URL`);

    // Map and classification identity.
    if (!family.fieldMap) {
      fail(false, `${id}: the map declares schema ${JSON.stringify(family.declaredMapSchema)}, which this generator cannot re-derive; fieldMapSha256 is unfalsifiable until it can`);
    } else {
      fail(committed.fieldMapSha256 === family.inputs.fieldMapDerivedSha256,
        `${id}: MAP DRIFT — ${family.fieldMap.file} (${family.fieldMap.hashedPart}) hashes to ${family.inputs.fieldMapDerivedSha256.slice(0, 12)}, sidecar names ${String(committed.fieldMapSha256).slice(0, 12)}`);
      fail(committed.fixtureIdentity?.map?.fileSha256 === family.inputs.fieldMapFileSha256,
        `${id}: the sidecar's map file digest does not match ${family.fieldMap.file} on disk`);
    }
    // A pin that is not the current file's hash is a historical pin, whatever
    // else it may be: the classification it names is not the one on disk.
    fail(committed.classificationSha256 === family.inputs.fieldClassificationSha256,
      `${id}: HISTORICAL CLASSIFICATION PIN — field-classification.json hashes to ${family.inputs.fieldClassificationSha256.slice(0, 12)}, sidecar names ${String(committed.classificationSha256).slice(0, 12)}`);
    const cls = committed.fixtureIdentity?.classification ?? {};
    fail(cls.fileSha256 === family.inputs.fieldClassificationFileSha256,
      `${id}: the sidecar's classification file digest does not match field-classification.json on disk`);
    fail(JSON.stringify({ ...cls, file: undefined, fileSha256: undefined }) ===
         JSON.stringify({ ...family.inputs.classification, file: undefined, fileSha256: undefined }),
      `${id}: the sidecar's classification counters are not what field-classification.json now carries`);
    if (family.inputs.classification.countersPresent) {
      fail(family.inputs.classification.complete === true,
        `${id}: INCOMPLETE CLASSIFICATION — ${family.inputs.classification.classifiedFieldsOrAnchors} of ${family.inputs.classification.discoveredFieldsOrAnchors} discovered field(s) or anchor(s) are classified`);
      fail(family.inputs.classification.classCountsTotal === family.inputs.classification.classifiedFieldsOrAnchors,
        `${id}: the class tally (${family.inputs.classification.classCountsTotal}) does not equal the classified count (${family.inputs.classification.classifiedFieldsOrAnchors})`);
    }
    fail(committed.fixtureIdentity?.reports?.fieldCensusSha256 === family.inputs.fieldCensusSha256,
      `${id}: the sidecar's field-census pin does not match field-census.json on disk`);
    fail(committed.fixtureIdentity?.reports?.populatedFieldsReportSha256 === family.inputs.populatedFieldsReportSha256,
      `${id}: the sidecar's populated-fields pin does not match reports/populated-fields.json on disk`);
    fail(committed.protectedFieldResult?.reportSha256 === family.inputs.protectedFieldScanSha256,
      `${id}: the sidecar's protected-field scan pin does not match reports/protected-fields-scan.json on disk`);

    // Flattened and active-content-clean, stated and true.
    fail(committed.flatteningResult?.allFlattened === true, `${id}: sidecar does not state every artifact as flattened`);
    fail(committed.activeContentResult?.clean === true, `${id}: sidecar does not state the artifacts as active-content clean`);
    fail(committed.protectedFieldResult?.pass === true, `${id}: sidecar does not carry a passing protected-field scan`);
    for (const rel of ARTIFACT_ORDER) {
      fail(family.observed[rel].flattening.flattened === true, `${id}:${rel}: an AcroForm field survives on the current bytes`);
      fail(family.observed[rel].activeContent.clean === true, `${id}:${rel}: active content on the current bytes`);
    }

    // Artifact identity, and no stale historical hash.
    const named = new Set();
    for (const rel of ARTIFACT_ORDER) {
      const row = (committed.artifacts ?? []).find((r) => r.artifact === rel);
      const seen = family.observed[rel];
      if (!row) { fail(false, `${id}: sidecar names no row for ${rel}`); continue; }
      named.add(rel);
      fail(row.outputSha256 === seen.sha256,
        `${id}:${rel}: STALE ARTIFACT PIN — bytes hash to ${seen.sha256.slice(0, 12)}, sidecar names ${String(row.outputSha256).slice(0, 12)}`);
      fail(row.byteLength === seen.byteLength, `${id}:${rel}: sidecar claims ${row.byteLength} bytes, file is ${seen.byteLength}`);
      fail(row.pageCount === seen.pageCount, `${id}:${rel}: sidecar claims ${JSON.stringify(row.pageCount)} page(s), file has ${seen.pageCount}`);
      const covered = provenanceCoversArtifact(committed, rel, seen.bytes);
      fail(covered.covered === true, `${id}:${rel}: provenance coverage refused (${covered.reason})`);
      const freshRow = fresh.artifacts.find((r) => r.artifact === rel);
      fail(row.normalizedContentSha256 === freshRow.normalizedContentSha256,
        `${id}:${rel}: the sidecar's normalized content hash is not what these bytes say`);
    }
    for (const row of committed.artifacts ?? []) {
      fail(named.has(row.artifact), `${id}: sidecar names ${row.artifact}, which this batch does not produce`);
    }

    // Current contact-sheet binding: the sheet is a picture of THIS artifact.
    const binding = committed.fixtureIdentity?.contactSheetBinding ?? {};
    fail(binding.finalizedSha256 === family.observed[CANONICAL].sha256,
      `${id}: WRONG CONTACT SHEET — its proof was taken against ${String(binding.finalizedSha256).slice(0, 12)}, the canonical artifact on disk is ${family.observed[CANONICAL].sha256.slice(0, 12)}`);
    fail(binding.sheetSha256 === family.observed[CONTACT_SHEET].sha256,
      `${id}: the contact-sheet proof names sheet ${String(binding.sheetSha256).slice(0, 12)}, the sheet on disk is ${family.observed[CONTACT_SHEET].sha256.slice(0, 12)}`);
    fail(binding.boundToCurrentCanonical === true, `${id}: the sidecar does not record the sheet as bound to the current canonical artifact`);
    fail(binding.allExpectedValuesVisible === true, `${id}: the contact sheet does not show every expected value`);
    fail(binding.panelsDiffer === true, `${id}: the contact sheet's blank and filled panels do not differ`);
  }

  if (!committedManifest) {
    fail(false, "no committed batch manifest on disk");
  } else {
    fail(committedManifest.baseCommit === BASE_COMMIT,
      `manifest names base commit ${committedManifest.baseCommit}, not ${BASE_COMMIT}`);
    fail(committedManifest.sourcePack === SOURCE_PACK,
      `manifest names source pack ${committedManifest.sourcePack}, not ${SOURCE_PACK}`);
    fail(JSON.stringify(committedManifest) === JSON.stringify(manifest),
      "the committed batch manifest is not what the current bytes produce; re-run the generator");
  }
  return out;
}

// ---------------------------------------------------------------------------

const families = [];
for (const slug of FAMILIES) families.push(await readFamily(slug));
const sidecars = [];
for (const family of families) sidecars.push(await buildSidecar(family));
const manifest = buildManifest(families, sidecars);

const committedSidecars = families.map((f) => readJson(path.join(f.dir, "artifact-provenance.json")));
const committedManifest = readJson(MANIFEST);

if (MUTATIONS) {
  const base = failures({ families, sidecars, manifest, committedSidecars, committedManifest }).length;
  const clone = () => {
    const s = {
      families: JSON.parse(JSON.stringify(families, (k, v) => (k === "bytes" ? undefined : v))),
      sidecars, manifest,
      committedSidecars: JSON.parse(JSON.stringify(committedSidecars)),
      committedManifest: JSON.parse(JSON.stringify(committedManifest))
    };
    for (let i = 0; i < s.families.length; i += 1) {
      for (const rel of ARTIFACT_ORDER) s.families[i].observed[rel].bytes = families[i].observed[rel].bytes;
    }
    return s;
  };

  const mutations = [
    ["the installed source binary is substituted", (s) => { s.families[0].source.hashedFromBytes = "a".repeat(64); }],
    ["the official source is missing from the clone", (s) => { s.families[0].source.bytesInClone = false; }],
    ["the source metadata fingerprint no longer matches the document", (s) => { s.families[0].source.metadataFingerprint = "b".repeat(64); }],
    ["a historical classification pin survives the counters commit", (s) => { s.families[1].inputs.fieldClassificationSha256 = "c".repeat(64); }],
    ["the classification file digest goes stale", (s) => { s.families[1].inputs.fieldClassificationFileSha256 = "7".repeat(64); }],
    ["the pinned counters are not what the classification now carries", (s) => { s.families[1].inputs.classification.discoveredFieldsOrAnchors = 99; }],
    ["a discovered anchor goes unclassified", (s) => { s.families[1].inputs.classification.classifiedFieldsOrAnchors = 2; s.families[1].inputs.classification.complete = false; s.committedSidecars[1].fixtureIdentity.classification.classifiedFieldsOrAnchors = 2; s.committedSidecars[1].fixtureIdentity.classification.complete = false; }],
    ["the class tally disagrees with the classified count", (s) => { s.families[1].inputs.classification.classCountsTotal = 9; s.committedSidecars[1].fixtureIdentity.classification.classCountsTotal = 9; }],
    ["stale artifact pin: the sidecar keeps a hash from an earlier render", (s) => { s.committedSidecars[0].artifacts[0].outputSha256 = "d".repeat(64); }],
    ["omitted source identity", (s) => { s.committedSidecars[0].sourceSha256 = null; }],
    ["omitted source revision", (s) => { s.committedSidecars[0].sourceRevision = null; }],
    ["wrong contact sheet: the proof was taken against a different artifact", (s) => { s.committedSidecars[0].fixtureIdentity.contactSheetBinding.finalizedSha256 = "e".repeat(64); }],
    ["wrong contact sheet: the sheet on disk is not the sheet the proof names", (s) => { s.committedSidecars[0].fixtureIdentity.contactSheetBinding.sheetSha256 = "f".repeat(64); }],
    ["a synthesized source URL is added where the family records none", (s) => { s.committedSidecars[0].sourceUrl = "https://courts.example.gov/forms/tf-810.pdf"; }],
    ["a recorded source URL is replaced with a different one", (s) => { s.committedSidecars[1].sourceUrl = "https://courts.example.gov/forms/aoc-cr-287-es.pdf"; }],
    ["a recorded source URL is dropped from the sidecar", (s) => { s.committedSidecars[1].sourceUrl = null; }],
    ["the verified archive path is dropped", (s) => { s.committedSidecars[0].fixtureIdentity.source.resolvedPath = null; }],
    ["an AcroForm map is edited without re-rendering", (s) => { s.families[0].inputs.fieldMapDerivedSha256 = "1".repeat(64); }],
    ["a flat overlay profile is edited without re-rendering", (s) => { s.families[1].inputs.fieldMapDerivedSha256 = "2".repeat(64); }],
    ["the map file digest goes stale", (s) => { s.families[1].inputs.fieldMapFileSha256 = "3".repeat(64); }],
    ["the map declares a schema the generator cannot re-derive", (s) => { s.families[1].fieldMap = null; s.families[1].declaredMapSchema = "rcap-flat_overlay-map/v99"; }],
    ["the committed records disagree about the source digest", (s) => { s.families[0].source.corroborationAgrees = false; }],
    ["an artifact stops being flattened", (s) => { s.families[0].observed[CANONICAL].flattening.flattened = false; }],
    ["active content survives on an artifact", (s) => { s.families[0].observed[CANONICAL].activeContent.clean = false; }],
    ["the protected-field scan pin goes stale", (s) => { s.families[0].inputs.protectedFieldScanSha256 = "4".repeat(64); }],
    ["the field-census pin goes stale", (s) => { s.families[0].inputs.fieldCensusSha256 = "5".repeat(64); }],
    ["a page is added to an artifact", (s) => { s.families[0].observed[BOUNDARY].pageCount += 1; }],
    ["the sidecar names an artifact this batch does not produce", (s) => { s.committedSidecars[0].artifacts.push({ artifact: "fixtures/extra.pdf", outputSha256: "0".repeat(64) }); }],
    ["the manifest drifts from the bytes", (s) => { s.committedManifest.totals.artifactsPinned = 0; }],
    ["the manifest names a different source pack", (s) => { s.committedManifest.sourcePack = "some-other-pack"; }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const s = clone();
    mutate(s);
    const caught = failures(s).length > base;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\ngenerate-rcap-sidecar-evidence FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way this batch's evidence can stop describing its source, its inputs or its bytes is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

if (CHECK) {
  const problems = failures({ families, sidecars, manifest, committedSidecars, committedManifest });
  if (problems.length > 0) {
    console.error(`FAIL sidecar evidence ${BATCH} — ${problems.length} problem(s):\n`);
    for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
    process.exit(1);
  }
  console.log(
    `OK sidecar evidence ${BATCH} — ${families.length} families, ${families.length * ARTIFACT_ORDER.length} artifacts pinned to current bytes; ` +
    `${families.filter((f) => f.source.bytesInClone).length}/${families.length} source digests hashed from the installed binaries.`
  );
  process.exit(0);
}

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
for (let i = 0; i < families.length; i += 1) {
  fs.writeFileSync(path.join(families[i].dir, "artifact-provenance.json"), `${JSON.stringify(sidecars[i], null, 2)}\n`);
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `sidecar evidence ${BATCH}: ${families.length} sidecar(s) written, ${families.length * ARTIFACT_ORDER.length} artifact(s) pinned, ` +
  `${families.filter((f) => f.source.bytesInClone).length} source digest(s) hashed from installed binaries; manifest at ${MANIFEST}.`
);
