// Provenance for a finalized artifact, kept beside it rather than inside it.
//
// The factory used to record which pipeline built an artifact by stamping its
// own Producer and Creator into the PDF. That put partner branding on a court
// form whose footer says it shall not be modified, and it destroyed the issuing
// court's own author, subject, keywords and title. The participant's official
// form now carries the court's identity and nothing of ours.
//
// Provenance moves here, where it can hold what a PDF Info dictionary never
// could: the source and output hashes, a normalized content hash that survives
// a metadata change, the hashes of the field map, the classification and the
// packet specification that produced it, and the factory and renderer versions.
// It is also the right home on the merits — an Info dictionary is written by
// whoever touched the file last and is not evidence of anything.
//
// STALENESS AND DRIFT READ THIS FILE, NOT /Producer. A stale artifact keeps its
// stamp; its hash stops matching the moment it or any of its inputs move. Any
// verifier that asked whether an artifact carried a LegalEase Producer string
// was asking a question the answer to which proves nothing.
import crypto from "node:crypto";
import { createRequire } from "node:module";

import { extractPageGeometry, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

export const FACTORY_VERSION = "d0-remediated-v2-content-stream-geometry";
export const PROVENANCE_SCHEMA = "rcap-artifact-provenance/v1";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const hashJson = (value) => sha256(Buffer.from(JSON.stringify(value ?? null), "utf8"));

/**
 * A hash of what the artifact says, independent of how it was packaged.
 *
 * Two renders of the same fill differ in their Info dictionary, their object
 * order and their timestamps while drawing exactly the same page. Hashing the
 * extracted page text instead gives a fingerprint that moves when the document
 * changes and holds still when only its wrapper does — which is what a
 * staleness check actually wants to know.
 */
export async function normalizedContentHash(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const text = doc.getPages()
    .map((page) => groupIntoLines(extractPageGeometry(page).text).map((l) => l.text).join("\n"))
    .join("\n\f\n")
    .replace(/\s+/g, " ")
    .trim();
  return sha256(Buffer.from(text, "utf8"));
}

/**
 * The record that stands in for the removed Producer stamp.
 *
 * `generatedAt` is supplied by the caller rather than read from the clock, so a
 * re-render of unchanged inputs produces an identical record and a drift check
 * stays meaningful.
 *
 * The finalized PDF and this record are bound by `outputSha256`: the record
 * names the exact bytes it describes, so a record that survives a re-render of
 * different bytes stops matching rather than quietly covering them.
 */
export async function artifactProvenance({
  jurisdiction,
  assetId,
  documentId,
  formFamily = null,
  officialFormNumber = null,
  officialTitle = null,
  sourcePublisher = null,
  sourceUrl = null,
  sourceRevision = null,
  sourceSha256,
  sourceMetadataFingerprint = null,
  fieldMap = null,
  fieldMapSha256 = null,
  classification = null,
  classificationSha256 = null,
  packetSpec = null,
  packetSpecSha256 = null,
  rendererVersion,
  generatedAt,
  activeContentResult = null,
  flatteningResult = null,
  protectedFieldResult = null,
  fixtureIdentity = null,
  artifacts
}) {
  if (!generatedAt) throw new Error("artifactProvenance requires an explicit generatedAt; reading the clock makes a drift check meaningless");
  if (!Array.isArray(artifacts) || artifacts.length === 0) throw new Error("artifactProvenance requires at least one artifact");

  const rows = [];
  for (const { rel, bytes, pageCount = null } of artifacts) {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    rows.push({
      artifact: rel,
      outputSha256: sha256(bytes),
      normalizedContentSha256: await normalizedContentHash(bytes),
      byteLength: bytes.length,
      pageCount: pageCount ?? doc.getPageCount()
    });
  }

  return {
    schemaVersion: PROVENANCE_SCHEMA,
    purpose:
      "External provenance for finalized participant artifacts. The PDF Info dictionary carries the court's metadata, not ours, so nothing here may be inferred from it and no staleness check may depend on a Producer stamp.",
    jurisdiction,
    assetId: assetId ?? documentId ?? null,
    documentId: documentId ?? null,
    formFamily,
    officialFormNumber,
    officialTitle,
    sourcePublisher,
    sourceUrl,
    sourceRevision,
    sourceSha256,
    sourceMetadataFingerprint,
    fieldMapSha256: fieldMapSha256 ?? (fieldMap ? hashJson(fieldMap) : null),
    classificationSha256: classificationSha256 ?? (classification ? hashJson(classification) : null),
    packetSpecSha256: packetSpecSha256 ?? (packetSpec ? hashJson(packetSpec) : null),
    factoryVersion: FACTORY_VERSION,
    rendererVersion,
    generatedAt,
    activeContentResult,
    flatteningResult,
    protectedFieldResult,
    fixtureIdentity,
    artifacts: rows
  };
}

/**
 * Whether a sidecar still describes the bytes on disk.
 *
 * This is the staleness question, asked correctly. It returns the exact reason
 * rather than a boolean, because "no record names this artifact" and "the
 * record names it at a different hash" are different failures with different
 * remedies.
 *
 * Pass `sourceSha256` to separate the two kinds of drift. SOURCE DRIFT means
 * the court reissued the form and the artifact is built from bytes the record
 * does not describe; the remedy is to re-acquire and re-render. OUTPUT DRIFT
 * means the source is unchanged but the artifact is not the one the record
 * names; the remedy is to re-render, or to find out who wrote those bytes.
 * Reporting both as "stale" sends the wrong repair every other time.
 */
export function provenanceCoversArtifact(record, rel, bytes, { sourceSha256 = null } = {}) {
  if (!record || record.schemaVersion !== PROVENANCE_SCHEMA) {
    return { covered: false, reason: "no_provenance_record", drift: null };
  }
  // Source drift is checked first. When the source has moved, an output-hash
  // mismatch is a consequence rather than a finding, and naming the
  // consequence sends a reviewer to re-render against a form the court has
  // already replaced.
  if (sourceSha256 && record.sourceSha256 && record.sourceSha256 !== sourceSha256) {
    return {
      covered: false,
      reason: "provenance_describes_a_different_source_document",
      drift: "source",
      recordedSourceSha256: record.sourceSha256,
      actualSourceSha256: sourceSha256
    };
  }
  const row = (record.artifacts ?? []).find((r) => r.artifact === rel);
  if (!row) return { covered: false, reason: "artifact_not_named_by_any_provenance_record", drift: "output" };
  const actual = sha256(bytes);
  if (row.outputSha256 !== actual) {
    return {
      covered: false,
      reason: "provenance_hash_does_not_match_the_bytes",
      drift: "output",
      recorded: row.outputSha256,
      actual
    };
  }
  return {
    covered: true,
    drift: null,
    outputSha256: actual,
    normalizedContentSha256: row.normalizedContentSha256
  };
}
