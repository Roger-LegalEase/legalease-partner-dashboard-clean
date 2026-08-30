// Source gate for ROUTE OBLIGATION CENSUS V1, family ak-courtview-set
// (jurisdiction AK, implementationStrategy official_pdf_fill, form TF-810).
//
// The build order for this family starts with one precondition: locate the
// official source bytes and verify their SHA-256 against the committed corpus
// index. Everything downstream -- the field census, the measured field map, the
// canonical and boundary fixtures, the byte-level verification, the raster
// review -- is a statement about a specific 85,386-byte document. None of those
// statements can be made without the document.
//
// This module answers that one question and refuses rather than guessing.
//
// WHY A DERIVED FIELD MAP IS NOT A SUBSTITUTE FOR THE BYTES
//
// data/rcap-all50/overlays/production/alaska/tf-810-form-en/ already holds a
// field-census.json and a production-field-map.json for this same form, built
// in an earlier session when the corpus was mounted. Copying those numbers
// forward would produce a census-v1 overlay that looks complete and is not:
// the census asks for boxes MEASURED off the document, and inherited numbers
// are the opposite of a measurement. That overlay also still carries the hold
// f_independent_visual_review_required and the status
// implemented_pending_independent_review, so it is not a verified base either.
//
// The failure this guards against is the one already recorded in
// scripts/measure-rcap-oregon-option-geometry.mjs: a lane that reported a
// confident geometric conclusion it had not actually measured, and derived a
// mark into the margin on the strength of it. An absent corpus read as an
// empty one produces exactly that class of error, one step earlier.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const FAMILY = {
  worklistGroupId: "ak-courtview-set",
  jurisdiction: "AK",
  implementationStrategy: "official_pdf_fill",
  wave: "census-v1-wave-AK-01",
  documentId: "TF-810",
  routeKey:
    "obligation:track-pathway:AK:ak-courtview:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40"
};

export const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
export const CORPUS_ROOT_RELATIVE =
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
/**
 * The Master Library mount point, and the only environment variable that may
 * move this gate.
 *
 * `OFFICIAL_FORMS_SOURCE_DIR` used to be read here. That was wrong, and it was
 * a trap: it names the *operational* Nationwide tree, which is a different
 * corpus answering a different question. The packet-worker brief forbids
 * pointing it at the Master Library, and
 * `scripts/verify-packet-build-environment.mjs` actively refuses that
 * substitution by name (`master_library_not_at_operational_path`). So the one
 * variable that would have moved this gate was the one variable that makes the
 * preflight fail — a worker who mounted the corpus anywhere but the default
 * path could satisfy either check but never both.
 *
 * `MASTER_LIBRARY_SOURCE_DIR` is what the brief tells workers to export and
 * what the preflight already resolves the corpus from. Reading the same
 * variable is what makes the two agree.
 */
export const MASTER_LIBRARY_ENV = "MASTER_LIBRARY_SOURCE_DIR";

/** The corpus index entry this family is pinned to, by form number. */
export function pinnedEntry(rootDir) {
  const index = JSON.parse(
    fs.readFileSync(path.join(rootDir, CORPUS_INDEX), "utf8")
  );
  const entry = index.entries.find(
    (candidate) =>
      candidate.state === FAMILY.jurisdiction &&
      candidate.formNumber === FAMILY.documentId &&
      candidate.assetClass === "FORM"
  );
  return { index, entry: entry ?? null };
}

function sha256Of(absolutePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolutePath))
    .digest("hex");
}

/**
 * Is the source gate open, and on what evidence.
 *
 * Returns `open: false` with located refusals rather than throwing. A caller
 * writing an overlay must treat a closed gate as fatal: there is nothing to
 * measure and therefore nothing truthful to write into a field map.
 */
export function resolveSourceGate(rootDir) {
  const { index, entry } = pinnedEntry(rootDir);
  const refusals = [];
  const refuse = (code, because, extra = {}) =>
    refusals.push({ code, because, ...extra });

  if (!entry) {
    refuse(
      "pinned_entry_absent_from_corpus_index",
      `The corpus index holds no ${FAMILY.jurisdiction} FORM entry for ${FAMILY.documentId}, so there is no pinned hash to verify against and no way to tell a correct binary from a wrong one.`
    );
    return { open: false, entry: null, refusals, corpusIndex: CORPUS_INDEX };
  }

  const envOverride = process.env[MASTER_LIBRARY_ENV] || null;
  const corpusRoot = envOverride
    ? path.resolve(envOverride)
    : path.join(rootDir, CORPUS_ROOT_RELATIVE);
  const expectedBinary = path.join(corpusRoot, entry.path);

  const corpusRootPresent = fs.existsSync(corpusRoot);
  const binaryPresent = fs.existsSync(expectedBinary);

  let observed = null;
  if (binaryPresent) {
    const stat = fs.statSync(expectedBinary);
    observed = {
      byteLength: stat.size,
      sha256: sha256Of(expectedBinary),
      byteLengthMatches: stat.size === entry.byteLength
    };
    observed.sha256Matches = observed.sha256 === entry.sha256;
  }

  if (!corpusRootPresent) {
    refuse(
      "corpus_root_absent",
      `The verified private corpus is not mounted at ${envOverride ? envOverride : CORPUS_ROOT_RELATIVE}. private/ is git-ignored, so a fresh clone never carries it. An absent corpus is not an empty corpus: reading it as one would make a form with a pinned hash look like a form with no source.`,
      {
        expectedCorpusRoot: envOverride ? envOverride : CORPUS_ROOT_RELATIVE,
        recoverWith: "bash scripts/rcap-corpus/bootstrap-private-corpus.sh",
        orSetTheEnvironmentVariable: MASTER_LIBRARY_ENV,
        doNotSet: {
          variable: "OFFICIAL_FORMS_SOURCE_DIR",
          because:
            "It names the operational Nationwide tree, not the Master Library. Pointing it here is refused by the preflight check master_library_not_at_operational_path."
        },
        environmentVariableSet: Boolean(envOverride)
      }
    );
  } else if (!binaryPresent) {
    refuse(
      "pinned_binary_absent_from_mounted_corpus",
      `The corpus is mounted but does not hold ${entry.path}. The index says this file was present and hash-verified at import time, so a mounted corpus missing it is a different corpus, not a resolved gate.`,
      { expectedBinary: path.relative(rootDir, expectedBinary) }
    );
  } else if (!observed.sha256Matches || !observed.byteLengthMatches) {
    refuse(
      "pinned_binary_hash_mismatch",
      "The binary at the pinned path does not hash to the pinned SHA-256. These are not the bytes the census pinned, and a field map measured off them would describe a document nobody named.",
      {
        expectedSha256: entry.sha256,
        observedSha256: observed.sha256,
        expectedByteLength: entry.byteLength,
        observedByteLength: observed.byteLength
      }
    );
  }

  return {
    open: refusals.length === 0,
    family: FAMILY,
    corpusIndex: CORPUS_INDEX,
    importVerification: index.importVerification,
    pinned: {
      path: entry.path,
      sha256: entry.sha256,
      byteLength: entry.byteLength,
      pageCount: entry.pageCount,
      acroFieldCount: entry.acroFieldCount,
      structuralClassObserved: entry.structuralClassObserved
    },
    resolved: {
      corpusRoot: envOverride ? envOverride : CORPUS_ROOT_RELATIVE,
      corpusRootPresent,
      binaryPresent,
      observed
    },
    refusals,
    whatAClosedGateRefuses: [
      "field census with real geometry -- there is no document to census",
      "official-form field map -- every write box must be measured off the document",
      "canonical and boundary fixtures -- the factory fills the source binary",
      "byte-level artifact verification -- there are no artifact bytes to verify",
      "independent visual review -- there is nothing to raster"
    ]
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = process.cwd();
  const gate = resolveSourceGate(rootDir);
  process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
  process.exit(gate.open ? 0 : 1);
}
