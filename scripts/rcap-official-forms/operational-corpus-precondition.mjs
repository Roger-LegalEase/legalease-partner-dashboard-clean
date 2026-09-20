// Is the seventh retirement condition answerable right now?
//
// Condition 7 asks whether the regenerated overlay factory manifest still names
// an asset. Answering it requires the operational Nationwide Record Clearing
// tree, because that tree is what the manifest is generated from and therefore
// what defines the operational inventory.
//
// The failure this module exists to stop is quiet and it has already happened:
// the adjudication computed whether the tree was mounted, never consulted the
// answer, and with the tree absent walked an empty file list. Every candidate
// was then "not found in the delivery", which the verdict read as the condition
// passing. Twelve assets whose source files are sitting in the operational tree
// flipped from held to passing on the strength of a missing directory, and the
// record said so in the same breath as reporting mounted: false.
//
// An absent tree is not an empty tree. An empty directory is not a proof that
// nothing references an asset. Neither is a directory that turns out to be a
// different corpus. So this module answers one question -- can condition 7 be
// evaluated -- and refuses rather than guessing, naming the exact path it
// expected in every refusal so the reader knows what to mount.
//
// THE MASTER LIBRARY IS NOT A SUBSTITUTE
//
// private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1 is the
// authoritative archive of official binaries: it answers "what is the current
// official edition of this form". The operational tree answers "what does this
// platform build packets from". Those are different questions, and an asset can
// be absent from one and present in the other -- which is precisely the case
// for the ten retired assets whose official binaries the Master Library holds.
// Substituting one for the other would make a retirement mean something nobody
// intended, so a corpus with the Master Library's shape is refused by name.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const OPERATIONAL_CORPUS_ENV = "OFFICIAL_FORMS_SOURCE_DIR";
export const OPERATIONAL_CORPUS_RELATIVE = "private/Nationwide Record Clearing";
export const MASTER_LIBRARY_RELATIVE = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
export const MANIFEST_GENERATOR = "scripts/rcap-all50-overlay-factory-lib.mjs";
export const NATIONWIDE_RESTORE_MANIFEST = "data/rcap-all50/nationwide-restore-manifest.json";

/** The tree the operational manifest is generated from, however it was pointed at. */
export function operationalCorpusPath(rootDir) {
  return process.env[OPERATIONAL_CORPUS_ENV]
    ? path.resolve(process.env[OPERATIONAL_CORPUS_ENV])
    : path.join(rootDir, OPERATIONAL_CORPUS_RELATIVE);
}

/** Resolved through symlinks, so a link pointing at the wrong corpus is seen as the corpus it reaches. */
function realPath(target) {
  try { return fs.realpathSync(target); } catch { return path.resolve(target); }
}

/**
 * Which corpus a directory actually is, read from its own top level.
 *
 * Comparing paths is not enough. A symlink at the operational path pointing at
 * the Master Library has the right path and the wrong contents, and that is the
 * exact substitution this module refuses -- so the shape is read from the
 * directory rather than inferred from where it sits.
 */
function corpusShape(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return "unreadable"; }
  const names = new Set(entries.map((entry) => entry.name));
  if (names.has("STATES") && names.has("00_GOVERNANCE")) return "master_library";
  if (entries.some((entry) => entry.isDirectory() && /^LegalEase[\s_]/i.test(entry.name))) return "operational_nationwide";
  return "unrecognized";
}

/**
 * What a corpus IS, read from its contents rather than from where it is mounted.
 *
 * The generator and this module resolved their trees independently and the
 * agreement test compared the two absolute paths. An absolute filesystem prefix
 * is not corpus identity: the same Nationwide tree reached as
 * /workspaces/... and as /home/user/... is one corpus, and refusing it made a
 * mount-point difference look like a substituted archive. The reverse error is
 * worse and this still catches it -- a partial tree, a different edition, or the
 * Master Library at the expected path all fingerprint differently.
 *
 * Identity is the corpus role plus the exact member set: every member's path
 * relative to the corpus root, its byte length, and its SHA-256.
 */
export function corpusFingerprint(dir) {
  const files = filesUnder(dir);
  if (files === null) return null;
  const hash = crypto.createHash("sha256");
  let byteLength = 0;
  for (const relative of files) {
    let bytes;
    try { bytes = fs.readFileSync(path.join(dir, relative)); } catch { return null; }
    byteLength += bytes.length;
    hash.update(`${relative}\t${bytes.length}\t${crypto.createHash("sha256").update(bytes).digest("hex")}\n`);
  }
  return {
    role: corpusShape(dir),
    sourceCount: files.length,
    byteLength,
    digest: hash.digest("hex")
  };
}

/** Two trees are the same corpus when their contents say so, wherever they sit. */
export function sameCorpus(a, b) {
  if (!a || !b) return false;
  return a.role === b.role && a.sourceCount === b.sourceCount && a.byteLength === b.byteLength && a.digest === b.digest;
}

/** Every file under a directory, or null if it cannot be walked. */
function filesUnder(dir) {
  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.push(path.relative(dir, full).split(path.sep).join("/"));
    }
  };
  try { walk(dir); } catch { return null; }
  return found;
}

/**
 * SHAPE IS NOT COMPLETENESS.
 *
 * corpusShape() answers "does this look like the operational tree" by finding
 * "LegalEase <State>/" folders at the top level. That was the only content test
 * standing between a mounted directory and condition 7, and it is satisfied by
 * a tree that is missing most of the corpus -- because a partial copy of the
 * operational tree has the operational tree's exact shape.
 *
 * That is not hypothetical. The 2026-09-02 recovery pool at
 * private/source-imports/Nationwide_Recovery_Pool_2026-09-02 holds 513 of the
 * 583 files, in "LegalEase <State>/" folders, every byte hash-verified. Pointed
 * at by OFFICIAL_FORMS_SOURCE_DIR it would have passed every test above it:
 * it exists, it is readable, it is not empty, it is not the Master Library, and
 * its shape is operational_nationwide. Condition 7 would then have been
 * answered against a corpus with seventy documents missing, and the answer for
 * each of those seventy would have been "not found in the delivery" -- which
 * this module's own header records as the exact failure it exists to stop, in
 * the exact form it took the first time.
 *
 * So completeness is measured, against the repository's own 583 path-and-hash
 * pairs, and it is measured the way the bootstrap measures it: every recorded
 * file present at its recorded hash. A hash mismatch counts as incomplete
 * rather than as a separate class, because for this question they mean the same
 * thing -- the corpus in front of us is not the inventoried one.
 *
 * A file the manifest does not record is NOT counted against the corpus. The
 * bootstrap reports those and does not fail on them, and this follows it.
 */
export function corpusCompleteness(rootDir, dir) {
  const manifestPath = path.join(rootDir, NATIONWIDE_RESTORE_MANIFEST);
  if (!fs.existsSync(manifestPath)) return null;
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch { return null; }
  const files = manifest.files ?? [];
  if (files.length === 0) return null;

  const absent = [];
  const mismatched = [];
  let verified = 0;
  for (const file of files) {
    const abs = path.join(dir, file.relativePath);
    let bytes;
    try { bytes = fs.readFileSync(abs); } catch { absent.push(file.relativePath); continue; }
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== file.sha256) { mismatched.push(file.relativePath); continue; }
    verified += 1;
  }
  return {
    manifest: NATIONWIDE_RESTORE_MANIFEST,
    required: files.length,
    verified,
    absent: absent.length,
    mismatched: mismatched.length,
    complete: absent.length === 0 && mismatched.length === 0,
    firstAbsent: absent.slice(0, 5),
    firstMismatched: mismatched.slice(0, 5)
  };
}

/**
 * Can condition 7 be evaluated, and against what.
 *
 * Returns `evaluable: false` with located refusals rather than throwing, so a
 * caller can decide whether an unevaluable condition is fatal (writing a
 * retirement) or merely reportable (checking one that already exists).
 */
export async function resolveOperationalCorpus(rootDir, { requireManifestGenerator = true } = {}) {
  const expectedPath = path.join(rootDir, OPERATIONAL_CORPUS_RELATIVE);
  const resolvedPath = operationalCorpusPath(rootDir);
  const masterLibraryPath = path.join(rootDir, MASTER_LIBRARY_RELATIVE);
  const refusals = [];

  const expected = {
    operationalCorpus: path.relative(rootDir, expectedPath),
    absoluteOperationalCorpus: expectedPath,
    orSetTheEnvironmentVariable: OPERATIONAL_CORPUS_ENV,
    currentlyPointingAt: resolvedPath,
    whichIsNotTheMasterLibraryAt: path.relative(rootDir, masterLibraryPath)
  };
  const refuse = (code, because, extra = {}) => refusals.push({ code, because, expected, ...extra });

  const exists = fs.existsSync(resolvedPath);
  const shape = exists ? corpusShape(resolvedPath) : null;
  const files = exists && shape !== "unreadable" ? filesUnder(resolvedPath) : null;

  if (!exists) {
    refuse(
      "operational_corpus_absent",
      "The operational Nationwide Record Clearing tree is not present, so no manifest can be regenerated from it and condition 7 has no answer. An absent tree is not an empty tree: reading it as one makes every candidate look unreferenced."
    );
  } else if (shape === "unreadable" || files === null) {
    refuse(
      "operational_corpus_unreadable",
      "The operational corpus path exists but cannot be walked. A directory that refuses to be read yields the same empty file list as a directory with nothing in it, and only one of those is evidence."
    );
  } else if (files.length === 0) {
    refuse(
      "operational_corpus_empty",
      "The operational corpus path exists and is empty. Zero files is not a zero-reference proof -- it is the absence of the evidence the condition needs."
    );
  } else if (shape === "master_library") {
    refuse(
      "operational_corpus_is_the_master_library",
      `The path resolves to the Master Library archive, which answers what the current official edition of a form is, not what this platform builds packets from. The operational manifest condition cannot be satisfied by the Master Library alone. Expected the operational tree at ${expected.operationalCorpus}.`,
      { resolvedTo: realPath(resolvedPath) }
    );
  } else if (shape !== "operational_nationwide") {
    refuse(
      "operational_corpus_shape_unrecognized",
      `The path holds neither the operational tree's per-state folders nor anything else this check recognizes, so what it would regenerate is unknown. Expected the operational tree at ${expected.operationalCorpus}.`
    );
  }

  /*
   * COMPLETENESS, once the tree in front of us claims to be the operational one.
   *
   * Only reached when the shape test passed, because measuring an absent or
   * unrecognised tree against 583 hashes would just restate a refusal already
   * made, in 583 lines. A tree that says it is the operational corpus and is
   * not the whole of it is refused here by name, so a partial custody cannot
   * answer a question that is about the complete corpus.
   */
  let completeness = null;
  if (shape === "operational_nationwide") {
    completeness = corpusCompleteness(rootDir, resolvedPath);
    if (completeness && !completeness.complete) {
      refuse(
        "operational_corpus_incomplete",
        `The tree has the operational corpus's shape but not its contents: ${completeness.verified} of `
        + `${completeness.required} recorded files verified, ${completeness.absent} absent, `
        + `${completeness.mismatched} mismatched against ${completeness.manifest}. `
        + `Condition 7 asks what the operational manifest names, and a corpus missing `
        + `${completeness.absent + completeness.mismatched} document(s) answers "not found in the delivery" for every `
        + `one of them -- which is indistinguishable from a genuine zero-reference result and is exactly the `
        + `failure this module exists to stop. A partial custody, such as the hash-verified recovery pool at `
        + `private/source-imports/Nationwide_Recovery_Pool_2026-09-02, may satisfy an INDIVIDUAL source `
        + `obligation by exact hash; it may never stand in for the complete corpus.`,
        { completeness }
      );
    }
  }

  // The condition is about what the manifest generator produces, so a generator
  // that cannot be loaded -- or that reads a different tree than the one just
  // validated -- leaves the condition unevaluable no matter how good the corpus
  // is. The second case is not hypothetical: the generator defaults to an
  // absolute path from another checkout, so an operational tree mounted in this
  // repository is invisible to it unless the environment variable is set.
  let manifestGenerator = { module: MANIFEST_GENERATOR, loadable: null, readsTree: null, agreesWithTheCorpus: null };
  if (requireManifestGenerator) {
    try {
      const factory = await import(`file://${path.join(rootDir, MANIFEST_GENERATOR)}`);
      if (typeof factory.buildOverlayFactory !== "function") throw new Error("buildOverlayFactory is not exported");
      manifestGenerator = {
        module: MANIFEST_GENERATOR,
        loadable: true,
        readsTree: factory.sourceDir ?? null,
        // Same path is the cheap yes. Different paths are not yet a no: the
        // contents decide, so an identical corpus mounted elsewhere agrees.
        agreesWithTheCorpus: factory.sourceDir
          ? (realPath(factory.sourceDir) === realPath(resolvedPath)
            || sameCorpus(corpusFingerprint(factory.sourceDir), corpusFingerprint(resolvedPath)))
          : false
      };
      if (!manifestGenerator.agreesWithTheCorpus) {
        const theirs = factory.sourceDir ? corpusFingerprint(factory.sourceDir) : null;
        const ours = corpusFingerprint(resolvedPath);
        refuse(
          "manifest_generator_reads_a_different_corpus",
          `The manifest generator reads ${manifestGenerator.readsTree}, whose contents are not this corpus `
          + `(${theirs ? `${theirs.role}, ${theirs.sourceCount} source(s), ${theirs.digest.slice(0, 12)}` : "unreadable"} `
          + `against ${ours ? `${ours.role}, ${ours.sourceCount} source(s), ${ours.digest.slice(0, 12)}` : "unreadable"}), `
          + `so regenerating it would answer condition 7 against a different corpus. `
          + `Set ${OPERATIONAL_CORPUS_ENV} to the operational tree so both read the same one.`
        );
      }
    } catch (error) {
      manifestGenerator = { module: MANIFEST_GENERATOR, loadable: false, readsTree: null, agreesWithTheCorpus: false, error: String(error.message).slice(0, 200) };
      refuse(
        "manifest_generator_unavailable",
        `The overlay factory cannot be loaded (${manifestGenerator.error}), so the manifest condition 7 asks about cannot be regenerated at all.`
      );
    }
  }

  return {
    evaluable: refusals.length === 0,
    expectedPath: path.relative(rootDir, expectedPath),
    resolvedPath,
    resolvedRealPath: exists ? realPath(resolvedPath) : null,
    environmentVariable: OPERATIONAL_CORPUS_ENV,
    environmentVariableSet: Boolean(process.env[OPERATIONAL_CORPUS_ENV]),
    masterLibraryPath: path.relative(rootDir, masterLibraryPath),
    masterLibraryPresent: fs.existsSync(masterLibraryPath),
    masterLibraryIsNotASubstitute:
      "The Master Library answers what the current official edition of a form is. The operational tree answers what this platform builds packets from. Condition 7 asks the second question.",
    shape,
    completeness,
    shapeIsNotCompleteness:
      "corpusShape() finds \"LegalEase <State>/\" folders, which a partial copy of the operational tree also has. completeness measures every file the restore manifest records; only that answers whether this is the operational corpus.",
    filesFound: files === null ? null : files.length,
    pdfsFound: files === null ? null : files.filter((file) => /\.pdf$/i.test(file)).length,
    manifestGenerator,
    refusals
  };
}

/** The refusal text a caller prints before exiting, with the expected path in it. */
export function refusalReport(corpus) {
  const lines = [
    `the seventh retirement condition is unevaluable in this environment (${corpus.refusals.length} refusal(s))`,
    `  expected the operational corpus at: ${corpus.expectedPath}`,
    `  currently pointing at:              ${corpus.resolvedPath}`,
    `  or set ${corpus.environmentVariable} to the operational tree`
  ];
  for (const refusal of corpus.refusals) lines.push(`  refusal ${refusal.code}: ${refusal.because}`);
  return lines.join("\n");
}
