// Step-1 source gate for census-v1 family ak-tf800-set (AK TF-800, official_pdf_fill).
//
// WHAT THIS IS
//
// The build order for this family starts: "Locate the official source bytes and
// verify the SHA-256 against the corpus index. Mismatch means stop and report,
// not build." This script is that step and only that step. It hashes the bytes
// on disk and compares them to the pinned digest in the committed corpus index.
//
// WHAT THIS IS NOT
//
// It is not a second field-map factory. Field census, geometry, fills, fixtures
// and rasterization all belong to scripts/rcap-official-forms/ and
// scripts/rcap-all50-overlay-factory-lib.mjs, which are the only factory. This
// script deliberately stops at the gate so that nothing downstream can run on
// bytes whose identity was never established.
//
// WHY IT REFUSES INSTEAD OF REPORTING ZERO
//
// An absent file is not a mismatched file and neither is a verified one. The
// failure mode this guards against is the one already recorded in
// scripts/rcap-official-forms/operational-corpus-precondition.mjs: a check that
// computed whether the tree was mounted, never consulted the answer, and read
// "not found" as "passing". So absence exits non-zero and names the exact path
// it expected, the same way that module does.
//
// Exit codes: 0 verified, 2 bytes absent, 3 digest mismatch, 4 index entry absent.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const FAMILY_ID = "ak-tf800-set";
export const JURISDICTION = "AK";
export const DOCUMENT_ID = "TF-800";
export const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

/** Where the bytes are expected, honouring the same env override the factory uses. */
export function expectedSourcePath(rootDir = ROOT, relPathInArchive) {
  const base = process.env.RCAP_MASTER_LIBRARY_DIR
    ? path.resolve(process.env.RCAP_MASTER_LIBRARY_DIR)
    : path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
  return path.join(base, relPathInArchive);
}

/** The pinned corpus-index entry for TF-800, or null when the index does not name it. */
export function corpusIndexEntry(rootDir = ROOT) {
  const index = JSON.parse(fs.readFileSync(path.join(rootDir, CORPUS_INDEX), "utf8"));
  return (index.entries ?? []).find(
    (e) => e.state === JURISDICTION && e.formNumber === DOCUMENT_ID,
  ) ?? null;
}

export function sha256OfFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

/** Runs the gate and returns a verdict record; never throws on a normal refusal. */
export function runGate(rootDir = ROOT) {
  const entry = corpusIndexEntry(rootDir);
  if (!entry) {
    return {
      verdict: "INDEX_ENTRY_ABSENT",
      exitCode: 4,
      detail: `${CORPUS_INDEX} names no ${JURISDICTION} ${DOCUMENT_ID} entry.`,
    };
  }

  const relPathInArchive = entry.path;
  const expected = expectedSourcePath(rootDir, relPathInArchive);
  const pinnedSha256 = entry.sha256;

  if (!fs.existsSync(expected)) {
    return {
      verdict: "SOURCE_BYTES_ABSENT",
      exitCode: 2,
      pinnedSha256,
      pinnedByteLength: entry.byteLength,
      expectedPath: expected,
      detail:
        "The corpus index pins a digest but the bytes are not mounted. " +
        "An absent file is not a verified one and is not an empty one. " +
        "Mount the Master Library (or set RCAP_MASTER_LIBRARY_DIR) and re-run.",
    };
  }

  const observedSha256 = sha256OfFile(expected);
  const observedByteLength = fs.statSync(expected).size;
  if (observedSha256 !== pinnedSha256) {
    return {
      verdict: "DIGEST_MISMATCH",
      exitCode: 3,
      pinnedSha256,
      observedSha256,
      expectedPath: expected,
      detail: "Bytes present but not the pinned edition. Stop and report; do not build.",
    };
  }

  return {
    verdict: "VERIFIED",
    exitCode: 0,
    pinnedSha256,
    observedSha256,
    pinnedByteLength: entry.byteLength,
    observedByteLength,
    expectedPath: expected,
    detail: "Source identity established. Downstream census may proceed via the existing factory.",
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runGate();
  console.log(JSON.stringify({ family: FAMILY_ID, document: DOCUMENT_ID, ...result }, null, 2));
  process.exit(result.exitCode);
}
