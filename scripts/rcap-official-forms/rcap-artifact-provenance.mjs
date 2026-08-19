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
// a metadata change, the hash of the field map that produced it, and the
// factory and renderer versions. It is also the right place for it on the
// merits -- an Info dictionary is written by whoever touched the file last and
// is not evidence of anything.
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

export const FACTORY_VERSION = "d0-remediated-v2-content-stream-geometry";
export const PROVENANCE_SCHEMA = "rcap-artifact-provenance/v1";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/**
 * A hash of what the artifact says, independent of how it was packaged.
 *
 * Two renders of the same fill differ in their Info dictionary, their object
 * order and their timestamps while drawing exactly the same page. Hashing the
 * extracted page text instead gives a fingerprint that moves when the document
 * changes and holds still when only its wrapper does -- which is what a
 * staleness check actually wants to know.
 */
export async function normalizedContentHash(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const text = doc.getPages()
    .map((page) => groupIntoLines(extractTextItems(page)).map((l) => l.text).join("\n"))
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
 */
export async function artifactProvenance({
  jurisdiction, documentId, sourceSha256, sourceRevision,
  fieldMap, artifacts, rendererVersion, generatedAt
}) {
  const fieldMapHash = sha256(Buffer.from(JSON.stringify(fieldMap), "utf8"));
  const rows = [];
  for (const { rel, bytes } of artifacts) {
    rows.push({
      artifact: rel,
      outputSha256: sha256(bytes),
      normalizedContentSha256: await normalizedContentHash(bytes),
      byteLength: bytes.length
    });
  }
  return {
    schemaVersion: PROVENANCE_SCHEMA,
    purpose: "External provenance for finalized participant artifacts. The PDF Info dictionary carries the court's metadata, not ours, so nothing here may be inferred from it.",
    jurisdiction,
    documentId,
    sourceSha256,
    sourceRevision: sourceRevision ?? null,
    fieldMapSha256: fieldMapHash,
    factoryVersion: FACTORY_VERSION,
    rendererVersion,
    generatedAt,
    artifacts: rows
  };
}
