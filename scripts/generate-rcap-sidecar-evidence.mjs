#!/usr/bin/env node
// Sidecar evidence for the lane-2 batch-01 rerender, pinned to current bytes.
//
//   node scripts/generate-rcap-sidecar-evidence.mjs
//   node scripts/generate-rcap-sidecar-evidence.mjs --check
//   node scripts/generate-rcap-sidecar-evidence.mjs --mutations
//
// Session 8's first batch-01 render was held as correction_required_before_review:
// Session 10 measured 34 opaque white rectangles covering official source content
// and flattened chooser prompts, command buttons and option-list residue reaching
// the filed page. Session 8 consumed the shared finalizer hotfix and re-emitted
// all eighteen artifacts at e6ffff87. This evidence is built on those corrected
// bytes and on nothing earlier: the sidecars written against the withdrawn
// artifacts are preserved on their own branch and are deliberately not carried
// forward, because a sidecar is a claim about specific bytes and those bytes no
// longer exist.
//
// The sidecars the corrected render left behind bind the artifact hashes and
// nothing else:
// classificationSha256, activeContentResult, flatteningResult,
// protectedFieldResult and fixtureIdentity are null in every one of them,
// because the D1 renderer never passes them. So a reviewer opening a sidecar
// learns which bytes it describes and cannot learn whether those bytes are
// flattened, whether they are free of active content, which classification
// decided what the factory was allowed to touch, or whether the contact sheet
// beside them is a picture of that artifact or of some earlier one.
//
// This fills every slot the current schema has, from the current bytes, for the
// six artifact-bearing families. It does not extend the schema and does not
// touch the shared provenance module: `artifactProvenance()` already accepts
// all of these and the renderers simply never supplied them.
//
// SOURCE IDENTITY IS RECEIPT-CONTROLLED HERE, AND SAYS SO. The official
// binaries live under private/Nationwide Record Clearing/, which this worktree
// does not carry, so the source bytes cannot be re-hashed. The digest is
// instead corroborated across the four committed records that independently
// name it -- source-record.json, source-receipt.json, production-field-map.json
// and reports/rendered-artifacts.json -- and the receipt's verified archive
// path is recorded as the controlling provenance. No source URL is synthesized:
// every one of these families records sourceUrl as null, and inventing one
// would turn an archive digest into a citation nobody can check.
//
// The seventh family in the pack, NE:cc-6-11a-instructions-en, is a no-fill
// instructional document. Its disposition is confirmed and recorded, and no PDF
// sidecar is written for it, because it has no artifact for one to describe.
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

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");

const BATCH = "lane2-batch01";
const RERENDER_COMMIT = "e6ffff87e3b56747dab8b2b7975eb26c40eb9f91";
// The instant the current bytes came into existence, taken from the rerender
// commit rather than the clock. A clock read would make the second pass of this
// generator differ from the first, which is the one thing the drift gate exists
// to detect.
const GENERATED_AT = "2026-08-21T15:58:03.000Z";

const OVERLAYS = "data/rcap-all50/overlays/production";
const EVIDENCE_DIR = `data/rcap-all50/gate-b-sidecars/${BATCH}`;
const MANIFEST = `${EVIDENCE_DIR}/sidecar-evidence.json`;

const ARTIFACT_BEARING = [
  "kentucky/aoc-496-form-en",
  "kentucky/aoc-496-2-form-en",
  "kentucky/aoc-496-4-form-en",
  "nebraska/cc-6-11-form-en",
  "nebraska/cc-6-11-2-form-en",
  "nebraska/cc-6-12-form-en"
];
const NO_FILL = "nebraska/cc-6-11a-instructions-en";

const CANONICAL = "fixtures/canonical-filled.pdf";
const BOUNDARY = "fixtures/boundary-filled.pdf";
const CONTACT_SHEET = "contact-sheet/blank-vs-filled.pdf";
const ARTIFACT_ORDER = [CANONICAL, BOUNDARY, CONTACT_SHEET];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const hashJson = (value) => sha256(Buffer.from(JSON.stringify(value ?? null), "utf8"));
const fileSha = (file) => sha256(fs.readFileSync(file));
const readJson = (file, fallback = null) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;

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
 * One family's evidence, recomputed from disk.
 *
 * Every value here is measured from a file in the clone. Nothing is carried
 * forward from the committed sidecar, so a sidecar that has drifted away from
 * its artifact cannot launder itself through a regeneration.
 */
async function readFamily(slug) {
  const dir = path.join(OVERLAYS, slug);
  const [state, familySlug] = slug.split("/");
  const record = readJson(path.join(dir, "source-record.json"), {});
  const receipt = readJson(path.join(dir, "source-receipt.json"), {});
  const map = readJson(path.join(dir, "production-field-map.json"));
  const classification = readJson(path.join(dir, "field-classification.json"));
  const census = readJson(path.join(dir, "field-census.json"));
  const proof = readJson(path.join(dir, "contact-sheet/contact-sheet-proof.json"), {});
  const protectedScan = readJson(path.join(dir, "reports/protected-fields-scan.json"), {});
  const rendered = readJson(path.join(dir, "reports/rendered-artifacts.json"), {});

  const observed = {};
  for (const rel of ARTIFACT_ORDER) observed[rel] = await observeArtifact(path.join(dir, rel));

  // The digest every committed record independently names. Agreement across
  // four records is what stands in for hashing bytes the clone does not carry.
  const corroboration = {
    "source-record.json": record.sha256 ?? null,
    "source-receipt.json": receipt.sha256 ?? null,
    "production-field-map.json": map?.sha256 ?? null,
    "reports/rendered-artifacts.json": rendered.sourceSha256 ?? null
  };
  const digests = [...new Set(Object.values(corroboration).filter(Boolean))];

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
    // source-record.json leaves it null, which is the case for all three NE
    // families in this batch.
    sourceRevision: receipt.revision ?? record.revision ?? null,
    source: {
      sha256: receipt.sha256 ?? record.sha256 ?? null,
      byteLength: receipt.byteLength ?? record.byteLength ?? null,
      bytesInClone: false,
      controllingProvenance: "verified_archive_path_plus_digest",
      sourceArchive: receipt.sourceArchive ?? null,
      pathInArchive: receipt.pathInArchive ?? null,
      resolvedPath: receipt.resolvedPath ?? null,
      matchedBy: receipt.matchedBy ?? null,
      sourceUrl: record.sourceUrl ?? null,
      corroboratedBy: corroboration,
      corroborationAgrees: digests.length === 1
    },
    inputs: {
      productionFieldMapFileSha256: fileSha(path.join(dir, "production-field-map.json")),
      fieldMapBindingSha256: hashJson(map?.bindings),
      fieldCensusFileSha256: fileSha(path.join(dir, "field-census.json")),
      fieldCensusSha256: hashJson(census),
      fieldClassificationFileSha256: fileSha(path.join(dir, "field-classification.json")),
      fieldClassificationSha256: hashJson(classification),
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
    // Never synthesized. These families record no URL, so the archive path in
    // the manifest and in `fixtureIdentity.source` is the controlling citation.
    sourcePublisher: null,
    sourceUrl: family.source.sourceUrl,
    sourceRevision: family.sourceRevision,
    sourceSha256: family.source.sha256,
    // The source bytes are not in the clone, so a fingerprint of the source's
    // descriptive metadata cannot be computed. Left null rather than guessed.
    sourceMetadataFingerprint: null,
    // The map identity the artifacts were rendered from, derived exactly as the
    // renderer derived it. The file-level digest is recorded in the manifest;
    // moving this to the file hash would break the pin the render produced.
    fieldMapSha256: family.inputs.fieldMapBindingSha256,
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
      // carried over from an earlier render names an artifact hash that is no
      // longer on disk.
      contactSheetBinding: {
        proof: "contact-sheet/contact-sheet-proof.json",
        proofSha256: family.inputs.contactSheetProofSha256,
        finalizedSha256: family.proof.finalizedSha256 ?? null,
        sheetSha256: family.proof.sheetSha256 ?? null,
        boundToCurrentCanonical: family.proof.finalizedSha256 === o[CANONICAL].sha256,
        boundToCurrentSheet: family.proof.sheetSha256 === o[CONTACT_SHEET].sha256,
        allExpectedValuesVisible: family.proof.allExpectedValuesVisible ?? null,
        panelsDiffer: family.proof.panelsDiffer ?? null
      },
      reports: {
        fieldCensusSha256: family.inputs.fieldCensusSha256,
        populatedFieldsReportSha256: family.inputs.populatedFieldsReportSha256
      },
      source: {
        bytesInClone: false,
        controllingProvenance: family.source.controllingProvenance,
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

/** The no-fill instructional document, confirmed rather than assumed. */
function readNoFill() {
  const dir = path.join(OVERLAYS, NO_FILL);
  const record = readJson(path.join(dir, "source-record.json"), {});
  const receipt = readJson(path.join(dir, "source-receipt.json"), {});
  const profile = readJson(path.join(dir, "overlay-profile.json"), {});
  const pdfs = [];
  for (const sub of ["fixtures", "contact-sheet"]) {
    const d = path.join(dir, sub);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (f.toLowerCase().endsWith(".pdf")) pdfs.push(`${sub}/${f}`);
  }
  return {
    familyId: `${receipt.jurisdiction ?? record.jurisdiction}:${NO_FILL.split("/")[1]}`,
    disposition: "no_fill_instructional_document",
    participantFillable: record.participantFillable ?? null,
    generationAllowed: record.generationAllowed ?? null,
    renderStrategy: record.renderStrategy ?? null,
    documentRole: record.documentRole ?? null,
    anchorsMeasured: Array.isArray(profile.anchors) ? profile.anchors.length : null,
    artifactsExpected: 0,
    artifactsOnDisk: pdfs,
    sidecarWritten: false,
    sidecarPresent: fs.existsSync(path.join(dir, "artifact-provenance.json")),
    why: "An instructional document is read, not filled. There is no finalized participant artifact for a sidecar to describe, and writing one would attest to bytes that do not exist.",
    source: {
      sha256: receipt.sha256 ?? record.sha256 ?? null,
      byteLength: receipt.byteLength ?? record.byteLength ?? null,
      bytesInClone: false,
      resolvedPath: receipt.resolvedPath ?? null,
      sourceUrl: record.sourceUrl ?? null
    }
  };
}

function buildManifest(families, sidecars, noFill) {
  return {
    schemaVersion: "rcap-sidecar-evidence-manifest/v1",
    batch: BATCH,
    purpose:
      "Batch-level sidecar evidence for the lane-2 batch-01 rerender. Every digest here is recomputed from a file in this clone. Source bytes are the one exception and say so: the official binaries live under private/Nationwide Record Clearing/, which this worktree does not carry, so source identity is controlled by the receipt's verified archive path plus digest, corroborated across the four committed records that independently name it.",
    rerenderCommit: RERENDER_COMMIT,
    generatedAt: GENERATED_AT,
    sourceUrlPolicy: "No source URL is synthesized. Every family in this batch records sourceUrl as null; the verified archive path plus digest is the controlling provenance.",
    families: families.map((family, i) => ({
      familyId: family.familyId,
      slug: family.slug,
      documentId: family.documentId,
      sourceRevision: family.sourceRevision,
      source: family.source,
      inputs: family.inputs,
      artifacts: ARTIFACT_ORDER.map((rel) => ({
        artifact: rel,
        sha256: family.observed[rel].sha256,
        byteLength: family.observed[rel].byteLength,
        pageCount: family.observed[rel].pageCount,
        activeContentClean: family.observed[rel].activeContent.clean,
        flattened: family.observed[rel].flattening.flattened
      })),
      contactSheetBinding: sidecars[i].fixtureIdentity.contactSheetBinding,
      sidecar: {
        file: `${family.slug}/artifact-provenance.json`,
        schemaVersion: sidecars[i].schemaVersion,
        sha256: sha256(Buffer.from(`${JSON.stringify(sidecars[i], null, 2)}\n`, "utf8"))
      }
    })),
    noFillInstructional: noFill,
    totals: {
      artifactBearingFamilies: families.length,
      artifactsPinned: families.length * ARTIFACT_ORDER.length,
      noFillFamilies: 1,
      sidecarsWritten: sidecars.length
    }
  };
}

/**
 * Every way the committed evidence can stop describing the bytes on disk.
 *
 * Takes the committed records and a fresh recomputation and compares them, so
 * the failure is always "the record disagrees with the file", never "the
 * generator disagrees with itself".
 */
function failures({ families, sidecars, manifest, committedSidecars, committedManifest }) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  fail(families.length === ARTIFACT_BEARING.length,
    `expected ${ARTIFACT_BEARING.length} artifact-bearing families, read ${families.length}`);

  for (let i = 0; i < families.length; i += 1) {
    const family = families[i];
    const fresh = sidecars[i];
    const committed = committedSidecars[i];
    const id = family.familyId;

    if (!committed) { fail(false, `${id}: no committed sidecar on disk`); continue; }

    fail(committed.schemaVersion === PROVENANCE_SCHEMA,
      `${id}: sidecar declares ${JSON.stringify(committed.schemaVersion)}, not ${PROVENANCE_SCHEMA}`);

    // Exact source identity and revision.
    fail(committed.sourceSha256 === family.source.sha256,
      `${id}: sidecar source ${String(committed.sourceSha256).slice(0, 12)} is not the receipt digest ${String(family.source.sha256).slice(0, 12)}`);
    fail(Boolean(committed.sourceSha256), `${id}: sidecar states no source identity`);
    fail(committed.sourceRevision === family.sourceRevision,
      `${id}: sidecar revision ${JSON.stringify(committed.sourceRevision)} is not the receipt revision ${JSON.stringify(family.sourceRevision)}`);
    fail(Boolean(committed.sourceRevision), `${id}: sidecar states no exact source revision`);
    fail(family.source.corroborationAgrees,
      `${id}: the four committed records disagree about the source digest (${JSON.stringify(family.source.corroboratedBy)})`);
    fail(committed.sourceUrl === null,
      `${id}: sidecar carries a source URL where the family records none; an archive digest must not become a citation nobody can check`);
    fail(Boolean(committed.fixtureIdentity?.source?.resolvedPath),
      `${id}: no verified archive path recorded, so nothing controls source provenance in the absence of a URL`);

    // Exact map and classification identity.
    fail(committed.fieldMapSha256 === family.inputs.fieldMapBindingSha256,
      `${id}: MAP DRIFT — production-field-map.json bindings hash to ${family.inputs.fieldMapBindingSha256.slice(0, 12)}, sidecar names ${String(committed.fieldMapSha256).slice(0, 12)}`);
    fail(committed.classificationSha256 === family.inputs.fieldClassificationSha256,
      `${id}: CLASSIFICATION DRIFT — field-classification.json hashes to ${family.inputs.fieldClassificationSha256.slice(0, 12)}, sidecar names ${String(committed.classificationSha256).slice(0, 12)}`);
    fail(committed.fixtureIdentity?.reports?.fieldCensusSha256 === family.inputs.fieldCensusSha256,
      `${id}: the sidecar's field-census pin does not match field-census.json on disk`);
    fail(committed.fixtureIdentity?.reports?.populatedFieldsReportSha256 === family.inputs.populatedFieldsReportSha256,
      `${id}: the sidecar's populated-fields pin does not match reports/populated-fields.json on disk`);
    fail(committed.protectedFieldResult?.reportSha256 === family.inputs.protectedFieldScanSha256,
      `${id}: the sidecar's protected-field scan pin does not match reports/protected-fields-scan.json on disk`);

    // Flattened and active-content-clean status, stated and true.
    fail(committed.flatteningResult?.allFlattened === true,
      `${id}: sidecar does not state every artifact as flattened`);
    fail(committed.activeContentResult?.clean === true,
      `${id}: sidecar does not state the artifacts as active-content clean`);
    fail(committed.protectedFieldResult?.pass === true,
      `${id}: sidecar does not carry a passing protected-field scan`);
    for (const rel of ARTIFACT_ORDER) {
      fail(family.observed[rel].flattening.flattened === true, `${id}:${rel}: an AcroForm field survives on the current bytes`);
      fail(family.observed[rel].activeContent.clean === true, `${id}:${rel}: active content on the current bytes`);
    }

    // Exact artifact identity, and no stale historical hash.
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

  // The manifest describes the same bytes the sidecars do.
  if (!committedManifest) {
    fail(false, "no committed batch manifest on disk");
  } else {
    fail(committedManifest.rerenderCommit === RERENDER_COMMIT,
      `manifest names rerender commit ${committedManifest.rerenderCommit}, not ${RERENDER_COMMIT}`);
    fail(JSON.stringify(committedManifest) === JSON.stringify(manifest),
      "the committed batch manifest is not what the current bytes produce; re-run the generator");
    fail(committedManifest.noFillInstructional?.artifactsExpected === 0,
      "the no-fill instructional family is recorded as expecting artifacts");
    fail((committedManifest.noFillInstructional?.artifactsOnDisk ?? []).length === 0,
      "the no-fill instructional family carries artifacts, so its disposition is wrong");
    fail(committedManifest.noFillInstructional?.sidecarWritten === false,
      "a PDF sidecar was written for the no-fill instructional family");
  }
  return out;
}

// ---------------------------------------------------------------------------

const families = [];
for (const slug of ARTIFACT_BEARING) families.push(await readFamily(slug));
const sidecars = [];
for (const family of families) sidecars.push(await buildSidecar(family));
const noFill = readNoFill();
const manifest = buildManifest(families, sidecars, noFill);

const committedSidecars = families.map((f) => readJson(path.join(f.dir, "artifact-provenance.json")));
const committedManifest = readJson(MANIFEST);

if (MUTATIONS) {
  const state = { families, sidecars, manifest, committedSidecars, committedManifest };
  const base = failures(state).length;
  const clone = () => ({
    families: JSON.parse(JSON.stringify(families, (k, v) => (k === "bytes" ? undefined : v))),
    sidecars, manifest,
    committedSidecars: JSON.parse(JSON.stringify(committedSidecars)),
    committedManifest: JSON.parse(JSON.stringify(committedManifest))
  });
  // `bytes` is dropped by the clone above, so coverage is re-checked against a
  // restored buffer rather than a JSON-mangled one.
  const restore = (s) => {
    for (let i = 0; i < s.families.length; i += 1) {
      for (const rel of ARTIFACT_ORDER) s.families[i].observed[rel].bytes = families[i].observed[rel].bytes;
    }
    return s;
  };

  const mutations = [
    ["stale classification pin: field-classification.json is edited after the sidecar was written", (s) => {
      s.families[0].inputs.fieldClassificationSha256 = "a".repeat(64);
    }],
    ["stale artifact pin: the sidecar keeps a hash from an earlier render", (s) => {
      s.committedSidecars[0].artifacts[0].outputSha256 = "b".repeat(64);
    }],
    ["omitted source: the sidecar states no source identity", (s) => {
      s.committedSidecars[0].sourceSha256 = null;
    }],
    ["omitted source revision", (s) => {
      s.committedSidecars[0].sourceRevision = null;
    }],
    ["wrong contact sheet: the proof was taken against a different artifact", (s) => {
      s.committedSidecars[0].fixtureIdentity.contactSheetBinding.finalizedSha256 = "c".repeat(64);
    }],
    ["wrong contact sheet: the sheet on disk is not the sheet the proof names", (s) => {
      s.committedSidecars[0].fixtureIdentity.contactSheetBinding.sheetSha256 = "d".repeat(64);
    }],
    ["a synthesized source URL replaces the archive citation", (s) => {
      s.committedSidecars[0].sourceUrl = "https://courts.example.gov/forms/aoc-496.pdf";
    }],
    ["the verified archive path is dropped", (s) => {
      s.committedSidecars[0].fixtureIdentity.source.resolvedPath = null;
    }],
    ["the map is edited without re-rendering", (s) => {
      s.families[0].inputs.fieldMapBindingSha256 = "e".repeat(64);
    }],
    ["the four committed records disagree about the source digest", (s) => {
      s.families[0].source.corroborationAgrees = false;
    }],
    ["an artifact stops being flattened", (s) => {
      s.families[0].observed[CANONICAL].flattening.flattened = false;
    }],
    ["active content survives on an artifact", (s) => {
      s.families[0].observed[CANONICAL].activeContent.clean = false;
    }],
    ["the sidecar claims flattening it does not have", (s) => {
      s.committedSidecars[0].flatteningResult.allFlattened = false;
    }],
    ["the protected-field scan pin goes stale", (s) => {
      s.families[0].inputs.protectedFieldScanSha256 = "f".repeat(64);
    }],
    ["the field-census pin goes stale", (s) => {
      s.families[0].inputs.fieldCensusSha256 = "9".repeat(64);
    }],
    ["a page is added to an artifact", (s) => {
      s.families[0].observed[BOUNDARY].pageCount += 1;
    }],
    ["the sidecar names an artifact this batch does not produce", (s) => {
      s.committedSidecars[0].artifacts.push({ artifact: "fixtures/extra.pdf", outputSha256: "0".repeat(64) });
    }],
    ["the manifest drifts from the bytes", (s) => {
      s.committedManifest.totals.artifactsPinned = 0;
    }],
    ["a sidecar is written for the no-fill instructional document", (s) => {
      s.committedManifest.noFillInstructional.sidecarWritten = true;
    }],
    ["the no-fill instructional family is recorded as owing artifacts", (s) => {
      s.committedManifest.noFillInstructional.artifactsExpected = 3;
    }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const s = restore(clone());
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
  console.log(`OK sidecar evidence ${BATCH} — ${families.length} families, ${families.length * ARTIFACT_ORDER.length} artifacts pinned to current bytes; ${noFill.familyId} confirmed no-fill with 0 artifacts.`);
  process.exit(0);
}

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
for (let i = 0; i < families.length; i += 1) {
  fs.writeFileSync(path.join(families[i].dir, "artifact-provenance.json"), `${JSON.stringify(sidecars[i], null, 2)}\n`);
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `sidecar evidence ${BATCH}: ${families.length} sidecar(s) written, ${families.length * ARTIFACT_ORDER.length} artifact(s) pinned, ` +
  `manifest at ${MANIFEST}; ${noFill.familyId} confirmed no-fill (0 artifacts, no sidecar).`
);
