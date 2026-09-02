#!/usr/bin/env node
// Indexes the source custodies this repository holds, so the register can be
// reconciled against real bytes instead of against a URL somebody hopes still
// resolves.
//
//   node scripts/generate-rcap-local-source-corpus-index.mjs
//   node scripts/generate-rcap-local-source-corpus-index.mjs --check
//
// The corpus itself is never committed: private/ is ignored, and it is a
// working input, not a repository artifact. What is committed is this index --
// path, custody, identity, hash and structure per file -- so a later session
// can tell whether the corpus it has is the corpus these decisions were made
// against.
//
// Structure is read from the bytes, not from the file name. A form named
// "__FORM__" that turns out to carry no AcroForm dictionary is a flat-overlay
// job, and naming it otherwise would send the wrong factory at it.
//
// WHY THERE IS MORE THAN ONE CUSTODY
//
// This walked exactly one root -- the Master Library -- and so a file this
// repository genuinely holds, in a different custody, was invisible to every
// binding downstream. Not refused, not reported: absent. The reconciler binds a
// custody row only when this index carries the path at the exact hash, so a
// document sitting on disk under private/human-source-returns bound nothing,
// and the families it serves stayed source-blocked with no visible reason.
//
// Custodies are therefore declared in a table below, and adding one is a row in
// that table rather than a change to this file's logic.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTER_LIBRARY = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const SHARD_MANIFEST = path.join(rootDir, "private/source-imports/rcap-source-shards-manifest.json");
const OUT = path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json");
const checkOnly = process.argv.includes("--check");

// AppleDouble sidecars are macOS metadata, not documents. Indexing them would
// put 4KB "PDFs" in the corpus that no factory can read.
const isAppleDouble = (name) => name.startsWith("._") || name === ".DS_Store";

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "__MACOSX" || isAppleDouble(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.pdf$/i.test(entry.name)) out.push(full);
  }
  return out;
}

// The library's naming standard: STATE__CLASS__DOCID__slug__REV-x__LANG.pdf
function identityFromMasterLibraryName(relativePath) {
  const parts = path.basename(relativePath, path.extname(relativePath)).split("__");
  return {
    state: parts[0] ?? null,
    assetClass: parts[1] ?? null,
    formNumber: parts[2] ?? null,
    revision: (parts[4] ?? "").startsWith("REV-") ? parts[4] : null,
    language: parts[5] ?? null
  };
}

/*
 * A human source return is filed under a jurisdiction directory and named by
 * whoever returned it -- not by the library's six-field standard. Splitting
 * "TX__STATEMENTOFINABILITYTOAFFORDPAYMENTOFCOURTCOSTSO.pdf" on "__" the way
 * the library parser does would record the whole slug as an asset class and
 * leave a form number that was never printed anywhere. So this records only
 * what the tree actually states -- the jurisdiction it is filed under -- and
 * leaves the rest null. A null form number is also what keeps these entries out
 * of the reconciler's form-number tiers, which is correct: a return binds by
 * hash or by an identity somebody read off the page, never by a name nobody
 * standardised.
 */
function identityFromReturnTree(relativePath) {
  const jurisdiction = relativePath.split(path.sep)[0] ?? "";
  return {
    state: /^[A-Z]{2}$/.test(jurisdiction) ? jurisdiction : null,
    assetClass: null,
    formNumber: null,
    revision: null,
    language: null
  };
}

/*
 * THE CUSTODY TABLE
 *
 * `pathsRelativeTo` decides how an entry's `path` is written, and the two
 * choices are deliberate rather than incidental:
 *
 *   "custodyRoot"     — paths read STATES/AK/…, relative to the custody's own
 *                       root. The Master Library has always been written this
 *                       way and every committed binding, field map, census row
 *                       and fixture is keyed to that form. Changing it would
 *                       silently unbind all of them, so it does not change.
 *
 *   "repositoryRoot"  — paths read private/human-source-returns/TX/…, relative
 *                       to the repository root. This is the form the source
 *                       findings already record in `held.pathInArchive`, so the
 *                       reconciler's path lookup reaches these entries with no
 *                       change to the reconciler, and it is unique by
 *                       construction: a repository-relative path names exactly
 *                       one location in this checkout.
 *
 * The two forms cannot collide. Every repository-relative custody root lives
 * under private/, and no Master Library path begins with "private/" — its
 * top-level directories are STATES/, 00_GOVERNANCE/ and their siblings. That is
 * asserted below rather than assumed, and a duplicate path from any cause is a
 * hard failure: two entries at one path means a binding could resolve to either
 * set of bytes, which is the thing this index exists to prevent.
 *
 * Adding a custody is adding a row here. The one still outstanding is the
 * operational Nationwide tree:
 *
 *   { id: "nationwide_record_clearing",
 *     root: "private/Nationwide Record Clearing",
 *     pathsRelativeTo: "repositoryRoot", identity: … }
 *
 * It is deliberately NOT declared. private/source-corpus-environment.txt
 * records that it is a different corpus, not carried by the pinned release, and
 * it is not mounted in this environment. A declared root that is not mounted is
 * a refusal (see below), so declaring it now would only stop the generator from
 * running; declaring it the day it is mounted is the whole change.
 */
const CUSTODIES = [
  {
    id: "master_library",
    root: MASTER_LIBRARY,
    pathsRelativeTo: "custodyRoot",
    identity: identityFromMasterLibraryName,
    describes: "The pinned Master Library, Edition 1: the authoritative archive of official binaries, installed by scripts/rcap-corpus/bootstrap-private-corpus.sh."
  },
  {
    id: "human_source_returns",
    root: "private/human-source-returns",
    pathsRelativeTo: "repositoryRoot",
    identity: identityFromReturnTree,
    describes: "Documents returned by a person with provenance, each with a receipt under data/rcap-grade-a/source-verification/human-source-returns/. Held outside the Master Library and not carried by any release."
  }
];

/*
 * ABSENCE IS A REFUSAL, NOT AN EMPTY INDEX.
 *
 * Before this, an unmounted Master Library produced a perfectly well-formed
 * index containing nothing, which would have unbound every source in the
 * repository on the next commit of it. A declared custody root that is not
 * mounted, or that is mounted and holds no PDF at all, stops the generator
 * instead -- in --check mode too, because "the corpus and the index disagree"
 * is exactly what an absent corpus means.
 */
const unmounted = [];
for (const custody of CUSTODIES) {
  const abs = path.join(rootDir, custody.root);
  if (!fs.existsSync(abs)) { unmounted.push(`${custody.id}: ${custody.root} is not mounted`); continue; }
  if (walk(abs).length === 0) unmounted.push(`${custody.id}: ${custody.root} is mounted but holds no PDF`);
}
if (unmounted.length) {
  console.error("REFUSED: a declared source custody is not present, and an index missing its entries would unbind every source keyed to them.");
  for (const line of unmounted) console.error(`  ${line}`);
  console.error("Mount it (bash scripts/rcap-corpus/bootstrap-private-corpus.sh for the Master Library) or remove the custody from the table in this file.");
  process.exit(1);
}

const entries = [];
const duplicates = [];
const crossCustodyIdenticalBinaries = [];
const shaToEntry = new Map();

for (const custody of CUSTODIES) {
  const custodyRoot = path.join(rootDir, custody.root);
  // Deduplication is WITHIN a custody, not across them. Two custodies holding
  // the same bytes is a fact about provenance, and dropping one of them would
  // make a path a finding legitimately names unreachable in this index.
  const bySha = new Map();
  for (const file of walk(custodyRoot)) {
    const bytes = fs.readFileSync(file);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const relativeToCustody = path.relative(custodyRoot, file);
    const relative = custody.pathsRelativeTo === "repositoryRoot"
      ? path.relative(rootDir, file)
      : relativeToCustody;
    if (bySha.has(sha256)) {
      duplicates.push({ path: relative, identicalTo: bySha.get(sha256), sha256 });
      continue;
    }
    bySha.set(sha256, relative);
    const alreadyElsewhere = shaToEntry.get(sha256);
    if (alreadyElsewhere) {
      crossCustodyIdenticalBinaries.push({
        sha256,
        path: relative, custody: custody.id,
        alsoHeldAt: alreadyElsewhere.path, inCustody: alreadyElsewhere.custody
      });
    }

    const identity = custody.identity(relativeToCustody);
    const text = bytes.toString("latin1");
    let pageCount = null;
    let acroFieldCount = null;
    let loadError = null;
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      pageCount = doc.getPageCount();
      try { acroFieldCount = doc.getForm().getFields().length; } catch { acroFieldCount = 0; }
    } catch (error) {
      loadError = error?.message ?? String(error);
    }

    const entry = {
      path: relative,
      // Which custody these bytes came from, on the entry itself, so a reader
      // never has to infer it from the shape of a path.
      custody: custody.id,
      fileName: path.basename(file),
      state: identity.state,
      assetClass: identity.assetClass,
      formNumber: identity.formNumber,
      revision: identity.revision,
      language: identity.language,
      byteLength: bytes.length,
      sha256,
      pageCount,
      // Read from the bytes. The name says what someone meant; the dictionary
      // says what the factory will actually find.
      acroFormPresent: /\/AcroForm\b/.test(text),
      acroFieldCount,
      xfaPresent: /\/XFA[\s/[]/.test(text),
      // An XFA form's fields may live entirely in the XML, so an AcroForm
      // dictionary with zero fields on an XFA document means "not readable by
      // this factory", not "nothing to fill".
      structuralClassObserved: loadError ? "unreadable"
        : /\/XFA[\s/[]/.test(text) ? "xfa"
          : (acroFieldCount ?? 0) > 0 ? "acroform"
            : "flat_pdf",
      loadError
    };
    entries.push(entry);
    shaToEntry.set(sha256, entry);
  }
}

// One path, one set of bytes. Asserted rather than assumed, because the whole
// point of the custody table is that a second root can now contribute paths.
const seenPaths = new Map();
const pathCollisions = [];
for (const entry of entries) {
  const prior = seenPaths.get(entry.path);
  if (prior) pathCollisions.push(`${entry.path}: held in both ${prior} and ${entry.custody}`);
  else seenPaths.set(entry.path, entry.custody);
}
for (const entry of entries) {
  if (entry.custody === "master_library" && entry.path.startsWith("private/")) {
    pathCollisions.push(`${entry.path}: a Master Library path in the repository-relative namespace`);
  }
}
if (pathCollisions.length) {
  console.error("REFUSED: the custody roots produce colliding index paths; a binding could resolve to either set of bytes.");
  for (const line of pathCollisions) console.error(`  ${line}`);
  process.exit(1);
}

/*
 * The shard manifest is a cross-check of the original import -- that the 499
 * files which arrived in eleven shards were the 499 files the archive declared.
 * It is not a custody root and it is not carried by the pinned release, so a
 * checkout that bootstraps the Master Library from that release does not get it
 * back.
 *
 * Recomputing it when present and silently writing null when absent is the same
 * hazard the refusal above exists to close: the index would quietly stop
 * carrying a verification that was really performed, and every reader of
 * `importVerification.sourceArchiveSha256` would see it vanish with no
 * explanation. So when the manifest is absent the record already committed is
 * carried forward unchanged, and `importVerificationProvenance` says which of
 * the two happened. The numbers are the same either way; the provenance is what
 * tells a reader whether they were measured on this run.
 */
const shardManifest = fs.existsSync(SHARD_MANIFEST) ? JSON.parse(fs.readFileSync(SHARD_MANIFEST, "utf8")) : null;
const masterLibraryRoot = path.join(rootDir, MASTER_LIBRARY);
let importVerification = null;
let importVerificationProvenance = "never_recorded";
if (shardManifest) {
  let declared = 0; let present = 0; let hashOk = 0; const missing = []; const mismatched = [];
  for (const shard of shardManifest.shards ?? []) {
    for (const f of shard.files ?? []) {
      declared += 1;
      const p = path.join(masterLibraryRoot, f.path);
      if (!fs.existsSync(p)) { missing.push(f.path); continue; }
      present += 1;
      const sha = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
      if (sha === f.sha256) hashOk += 1; else mismatched.push({ path: f.path, declared: f.sha256, observed: sha });
    }
  }
  importVerification = {
    shardsDeclared: (shardManifest.shards ?? []).length,
    sourceArchiveSha256: shardManifest.source_archive_sha256 ?? null,
    filesDeclared: declared, filesPresent: present, filesHashVerified: hashOk,
    filesMissing: missing, filesHashMismatched: mismatched
  };
  importVerificationProvenance = "recomputed_from_shard_manifest";
} else if (fs.existsSync(OUT)) {
  const committed = JSON.parse(fs.readFileSync(OUT, "utf8"));
  if (committed.importVerification) {
    importVerification = committed.importVerification;
    importVerificationProvenance = "carried_forward_from_committed_index_shard_manifest_absent";
  }
}

const byState = {};
const byStructure = {};
const byCustody = {};
for (const e of entries) {
  byState[e.state ?? "unknown"] = (byState[e.state ?? "unknown"] ?? 0) + 1;
  byStructure[e.structuralClassObserved] = (byStructure[e.structuralClassObserved] ?? 0) + 1;
  byCustody[e.custody] = (byCustody[e.custody] ?? 0) + 1;
}

const payload = {
  schemaVersion: "rcap-local-source-corpus-index/v2",
  generatedBy: "scripts/generate-rcap-local-source-corpus-index.mjs",
  purpose: "An index of every source custody this repository holds, so every asset can be reconciled against bytes that are actually present rather than against a URL.",
  corpusRoot: MASTER_LIBRARY,
  custodies: CUSTODIES.map((c) => ({
    id: c.id, root: c.root, pathsRelativeTo: c.pathsRelativeTo, describes: c.describes,
    pdfsIndexed: byCustody[c.id] ?? 0
  })),
  corpusIsNotCommitted: "private/ is git-ignored. This index is the committed record of what the corpus contained; the corpus itself is a working input.",
  whatThisIndexDoesNotEstablish: [
    "that a file is the current official edition",
    "that a file has not been superseded since it was collected",
    "that a form belongs on any particular route"
  ],
  importVerification,
  importVerificationProvenance,
  totals: {
    pdfsIndexed: entries.length,
    exactDuplicateBinariesSkipped: duplicates.length,
    byCustody,
    byStructure,
    statesRepresented: Object.keys(byState).length
  },
  byState,
  duplicates,
  crossCustodyIdenticalBinaries,
  entries
};

if (checkOnly) {
  const committed = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (committed !== `${JSON.stringify(payload, null, 2)}\n`) {
    console.error("FAIL local source corpus index has drifted from the committed record");
    process.exit(1);
  }
  console.log("OK local source corpus index matches the committed record");
  process.exit(0);
}

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.totals, null, 1));
console.log(`importVerification: ${importVerificationProvenance}`);
if (importVerification) {
  console.log(`import: ${importVerification.shardsDeclared} shards, ${importVerification.filesPresent}/${importVerification.filesDeclared} files present, ${importVerification.filesHashVerified} hash-verified, ${importVerification.filesMissing.length} missing, ${importVerification.filesHashMismatched.length} mismatched`);
  for (const m of importVerification.filesHashMismatched) console.log(`  MISMATCH ${m.path}`);
}
