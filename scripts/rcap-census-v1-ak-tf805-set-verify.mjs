// Source-custody gate for ROUTE OBLIGATION CENSUS V1, family ak-tf805-set.
//
// WHY THIS EXISTS
//
// The census-v1 build for this family is ordered: verify the source binary
// first, then census geometry, then map write boxes, then render, then verify
// the rendered bytes. Every step after the first reads the official TF-805
// binary. So the first step is not a formality -- it decides whether any later
// step has anything to stand on.
//
// The failure this guards against is the one the operational-corpus
// precondition module already documents from experience: an absent tree read as
// an empty one, producing a walk over zero files that every downstream check
// then reports as passing. Applied here that would mean a field map with no
// document behind it -- write boxes "measured" off nothing, or worse, derived
// from label positions and presented as measurements.
//
// This script therefore answers one question from bytes on disk: is the TF-805
// binary the corpus index names actually present, and does it hash to what the
// index declares. It fails closed. It never substitutes a filled artifact from
// another lane for the blank official source: a filled PDF carries the original
// page content but is not the official binary, does not hash to it, and using
// one as a stand-in would launder a prior lane's output into this lane's source
// of truth.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const FAMILY = "ak-tf805-set";
const OWNED = "data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const FORM_NUMBER = "TF-805";
const STATE = "AK";

/** The corpus index entry for this family's official form, or null. */
function indexEntry() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      if (node.formNumber === FORM_NUMBER && node.state === STATE) found.push(node);
      return Object.values(node).forEach(walk);
    }
  };
  walk(index);
  return { entry: found[0] ?? null, corpusRoot: index.corpusRoot ?? null, duplicates: found.length };
}

/**
 * Where the official binary would be if the corpus were mounted.
 *
 * Both the env override and the in-repo default are reported, because a
 * refusal that does not name the path it wanted is a refusal nobody can act on.
 */
function candidatePaths(corpusRoot, relativePath) {
  const out = [];
  if (process.env.OFFICIAL_FORMS_SOURCE_DIR) {
    out.push(path.resolve(process.env.OFFICIAL_FORMS_SOURCE_DIR, relativePath));
  }
  if (corpusRoot) out.push(path.join(ROOT, corpusRoot, relativePath));
  return out;
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function main() {
  const { entry, corpusRoot, duplicates } = indexEntry();
  const result = {
    schemaVersion: "rcap-census-v1-source-verification/v1",
    family: FAMILY,
    worklistGroupId: FAMILY,
    routeKey: "obligation:track-only:AK:ak-tf805",
    checkedAt: new Date().toISOString(),
    corpusIndex: CORPUS_INDEX,
    corpusRoot,
    indexEntriesMatchingForm: duplicates,
  };

  if (!entry) {
    result.verified = false;
    result.verdict = "STOP";
    result.refusal = {
      code: "form_absent_from_corpus_index",
      because: `The corpus index names no ${STATE} ${FORM_NUMBER} entry, so there is no declared hash to verify a binary against.`,
    };
    return result;
  }

  result.declared = {
    path: entry.path,
    sha256: entry.sha256,
    byteLength: entry.byteLength,
    pageCount: entry.pageCount,
    acroFieldCount: entry.acroFieldCount,
    structuralClassObserved: entry.structuralClassObserved,
  };

  const candidates = candidatePaths(corpusRoot, entry.path);
  result.lookedFor = candidates.map((p) => path.relative(ROOT, p));

  const present = candidates.find((p) => fs.existsSync(p));
  if (!present) {
    result.verified = false;
    result.verdict = "STOP";
    result.refusal = {
      code: "source_binary_absent",
      because:
        "The official binary the corpus index names is not on disk, so its SHA-256 cannot be verified and no geometry can be measured from it. " +
        "An absent file is not an empty one: treating it as empty would yield a field map with no document behind it. " +
        "The corpus root is git-ignored and is a working input, not a committed asset.",
      unblockBy: [
        `Mount the Master Library at ${corpusRoot}, or`,
        "set OFFICIAL_FORMS_SOURCE_DIR to a checkout that contains it,",
        "then re-run this script. It must print verified: true before any later build step runs.",
      ],
    };
    return result;
  }

  const bytes = fs.readFileSync(present);
  const observed = sha256(bytes);
  result.observed = { path: path.relative(ROOT, present), sha256: observed, byteLength: bytes.length };
  result.verified = observed === entry.sha256 && bytes.length === entry.byteLength;
  result.verdict = result.verified ? "PROCEED" : "STOP";
  if (!result.verified) {
    result.refusal = {
      code: "source_binary_hash_mismatch",
      because:
        "A binary is present at the indexed path but its bytes are not the bytes the index declares. " +
        "It may be a different edition, a partial download, or a different document entirely. " +
        "Measuring geometry from it would attribute one document's coordinates to another's identity.",
    };
  }
  return result;
}

const result = main();
const outPath = path.join(ROOT, OWNED, "source-verification.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
console.log(`${result.verdict}: ${result.refusal?.code ?? "source binary verified against the corpus index"}`);
console.log(`wrote ${path.relative(ROOT, outPath)}`);
process.exitCode = result.verified ? 0 : 1;
