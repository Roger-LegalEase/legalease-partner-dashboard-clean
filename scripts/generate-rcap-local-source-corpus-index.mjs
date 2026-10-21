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
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTER_LIBRARY = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const SHARD_MANIFEST = path.join(rootDir, "private/source-imports/rcap-source-shards-manifest.json");
const NATIONWIDE_RECOVERY_POOL = "private/source-imports/Nationwide_Recovery_Pool_2026-09-02";
const NATIONWIDE_RESTORE_MANIFEST = path.join(rootDir, "data/rcap-all50/nationwide-restore-manifest.json");
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
    /*
     * NOT EVERY OFFICIAL BINARY IS A PDF.
     *
     * This filter was `\.pdf$`, and the index's own counter is still called
     * pdfsIndexed, which was accurate and hid something. The Master Library
     * holds seven DOCX files and five of them are Montana's: the OCA MMRTA
     * proposed order and certificate of service, Form A and Form B. Zero were
     * indexed, so `byState` carried no MT entry at all, and the third leg of
     * the tier-3 admission rule -- the committed corpus index must hold this
     * exact path at this exact hash -- was unsatisfiable for every one of
     * them. Five held, hash-verifiable documents read as absent, and the only
     * address the MMRTA label had was the Supreme Court order ADOPTING the
     * rules, so a family could read as addressed-and-acquired on rule text.
     *
     * A DOCX is indexed for what an index is for: identity and custody. It is
     * NOT given the PDF structural fields; those are measured from a PDF
     * dictionary and inventing them would be the dangerous kind of wrong this
     * file exists to prevent. `assetFormat` says which it is, and a consumer
     * that needs page counts or AcroForm fields must check that first.
     */
    else if (/\.(pdf|docx|doc)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const PIKEPDF_PROBE = `
import json, sys
import pikepdf
out = {}
for arg in sys.argv[1:]:
    try:
        with pikepdf.open(arg) as pdf:
            acro = pdf.Root.get("/AcroForm")
            fields = acro.get("/Fields") if acro is not None else None
            def terminal(node):
                n = 0
                for f in node:
                    kids = f.get("/Kids")
                    if kids is not None and any("/T" in k for k in kids):
                        n += terminal(kids)
                    else:
                        n += 1
                return n
            out[arg] = {
                "acroFormPresent": acro is not None,
                "xfaPresent": acro is not None and "/XFA" in acro,
                "acroFieldCount": terminal(fields) if fields is not None else 0,
                "pageCount": len(pdf.pages),
                "encrypted": bool(pdf.is_encrypted),
            }
    except Exception as error:
        out[arg] = {"error": str(error)}
print(json.dumps(out))
`;

/*
 * A second instrument, used only where the first one could not read at all.
 *
 * The structure fields are matched against the file's own bytes. That works for
 * a document whose catalogue sits in a plain object, and it silently lies about
 * one whose catalogue sits inside a cross-reference stream: the names are there,
 * compressed and -- on every document in this class -- encrypted, so neither the
 * regex nor an inflate finds them. What the record then wrote was not "unknown",
 * it was `xfaPresent: false`: a positive claim that the document is not XFA.
 *
 * Every document pdf-lib cannot open here is in exactly that class. They are
 * AES-encrypted Judicial Council and state forms, so `loadError` and a wrong
 * `xfaPresent: false` arrived together. Measured with pikepdf against the pinned
 * bytes, California CR-106 (sha256 f8a37a9a…), CR-106-INFO (427936ac…) and
 * CR-401 (394421959…) each carry /Root/AcroForm/XFA with 48, 2 and 42 terminal
 * fields; the committed index recorded all three as XFA-free.
 *
 * pikepdf is the instrument the California packet host already uses on these
 * same binaries, so this adds no new dependency to the factory -- only to this
 * generator, and only for the documents the primary reader refused. Where no
 * Python can import it, the fields record `null`: unknown is a worse record than
 * measured and a far better one than a confident falsehood.
 *
 * Nothing here changes a document that loads. That path keeps the original
 * regexes exactly, and `structuralClassObserved` still says "unreadable" for a
 * document nobody could read, because that stays true.
 */
function pikepdfStructure(files) {
  if (files.length === 0) return { readings: new Map(), reader: null };
  const candidates = [process.env.RCAP_PIKEPDF_PYTHON, process.env.PYTHON, "python3", "python"]
    .filter(Boolean);
  for (const python of candidates) {
    const result = spawnSync(python, ["-c", PIKEPDF_PROBE, ...files],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0 || !result.stdout) continue;
    try {
      return { readings: new Map(Object.entries(JSON.parse(result.stdout))), reader: python };
    } catch {
      continue;
    }
  }
  return { readings: new Map(), reader: null };
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
 * The D source packs follow the Master Library's six-field naming standard --
 * STATE__CLASS__DOCID__slug__REV-x__LANG.pdf -- because they were cut from the
 * same production line. So their identity parses the same way. What differs is
 * where the paths sit: these are repository-relative, because the packs are a
 * THIRD custody and not the library, and a STATES/-shaped path relative to a
 * custody root would collide with the library's own.
 */
function identityFromDSourcePack(relativePath) {
  return identityFromMasterLibraryName(relativePath);
}

/*
 * THE NATIONWIDE RECOVERY POOL: JURISDICTION ONLY, DELIBERATELY.
 *
 * These files are named by the courts and agencies that published them and by
 * whoever downloaded them -- "3-Misdemeanor-Petition-8_01_2023.pdf", where the
 * "3-" is a download-ordering artifact. Nothing in that is a form number, and
 * parsing one out would be inventing an identity nobody printed.
 *
 * So this follows identityFromReturnTree: record the jurisdiction and leave the
 * rest null. That is not a limitation to work around, it is the safety property
 * of a PARTIAL custody expressed in the index. A null form number keeps every
 * one of these entries out of the reconciler's tier-1 and tier-2 form-label
 * matchers, so a recovered file can bind only by an exact SHA-256 or by an
 * identity somebody read off the page -- never by a name that merely looks
 * right. A partial corpus is exactly where a loose matcher would do its worst
 * damage, because the file the label really names may be one of the seventy
 * that are absent.
 *
 * The jurisdiction is READ from the restore manifest's own perState/folders
 * record rather than derived from the folder name: the corpus spells Arkansas's
 * folder "LegalEase Arkanasa", and any name-based guess would drop it.
 */
const nationwideFolderToJurisdiction = (() => {
  const map = new Map();
  if (!fs.existsSync(NATIONWIDE_RESTORE_MANIFEST)) return map;
  const manifest = JSON.parse(fs.readFileSync(NATIONWIDE_RESTORE_MANIFEST, "utf8"));
  for (const [code, state] of Object.entries(manifest.perState ?? {})) {
    for (const folder of state.folders ?? []) map.set(folder, code);
  }
  return map;
})();

function identityFromNationwideRecoveryPool(relativePath) {
  const folder = relativePath.split(path.sep)[0] ?? "";
  return {
    state: nationwideFolderToJurisdiction.get(folder) ?? null,
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
  },
  {
    id: "d_source_packs",
    root: "private/source-imports/rcap-d-source-packs-2026-08-12",
    pathsRelativeTo: "repositoryRoot",
    identity: identityFromDSourcePack,
    /*
     * The D1/D2/D3 packs from release rcap-d-source-packs-2026-08-12, whose
     * three archive digests were verified against the release's own record
     * before extraction. Twenty-seven states across the three packs.
     *
     * They are a THIRD custody, and the distinction is load-bearing twice
     * over. They are not the Master Library: they carry their own
     * RCAP_SOURCE_HANDOFF_MANIFEST and a different, mostly source-gated,
     * member set. And they are emphatically not the operational Nationwide
     * tree -- scripts/rcap-official-forms/operational-corpus-precondition.mjs
     * recognises that tree by its LegalEase <State>/ top level and refuses a
     * STATES/-shaped corpus at the operational path by name, so installing
     * these there would be exactly the substitution it exists to catch.
     *
     * Only two of the twenty-seven source hashes the attach cohort recorded
     * from the Nationwide inventory are present here by exact hash. That is
     * not a defect in the packs: they hold a great many official forms these
     * families name, at different bytes and different revisions, and the way
     * those reach a family is the reconciler's read-identity tier, not a hash
     * the Nationwide inventory recorded from a corpus nobody can mount.
     */
    describes: "The D1/D2/D3 source packs from private release rcap-d-source-packs-2026-08-12, archive digests verified before extraction. Not the Master Library and not the operational Nationwide tree."
  },
  {
    id: "nationwide_recovery_pool_2026_09_02",
    root: NATIONWIDE_RECOVERY_POOL,
    /*
     * Custody-root-relative, and that is the whole reason this custody can be
     * reached at all. Every Nationwide artifact the source findings record
     * writes `held.pathInArchive` as "LegalEase Arkanasa/3-Misdemeanor-…pdf" --
     * relative to the Nationwide corpus root, because that is the corpus it was
     * inventoried from. The reconciler and the attach cohort both look those
     * paths up in this index verbatim, so writing them repository-relative here
     * would leave all forty-three of them unreachable while the bytes sat on
     * disk. It cannot collide: the Master Library's top level is STATES/ and
     * 00_GOVERNANCE/, and every repository-relative custody root lives under
     * private/, so no other custody produces a "LegalEase <State>/" path.
     */
    pathsRelativeTo: "custodyRoot",
    identity: identityFromNationwideRecoveryPool,

    /*
     * A PARTIAL CUSTODY, AND THE MARKER SAYS SO ON EVERY ENTRY.
     *
     * This is 513 of the operational corpus's 583 files, recovered at their
     * exact manifest SHA-256 and re-verified from the staged bytes by
     * scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs. Seventy paths are
     * absent.
     *
     * Individually, each of the 513 is as good as any other held source: a hash
     * either matches or it does not, and a file's completeness has nothing to
     * do with its neighbours'. Collectively it is NOT the operational corpus,
     * and the difference matters because this tree has the operational tree's
     * exact shape -- "LegalEase <State>/" folders -- which is how
     * scripts/rcap-official-forms/operational-corpus-precondition.mjs
     * recognises the real one.
     *
     * So the type travels on the row AND on every entry generated from it,
     * rather than being something a reader has to look up. A consumer asking
     * "may these bytes satisfy an individual source obligation" reads the hash;
     * a consumer asking "is the operational corpus present" must read
     * custodyType and refuse.
     */
    custodyType: "PARTIAL_NATIONWIDE_RECOVERY_POOL",
    completeOperationalCorpus: false,
    describes: "513 of the 583 files of the operational Nationwide corpus, recovered from the 2026-09-02 recovery kit at exact SHA-256 and re-verified from the staged bytes. A PARTIAL custody: it satisfies an individual source obligation and never a completeness assertion. Receipt: data/rcap-all50/NATIONWIDE_PARTIAL_CUSTODY_2026-09-02.json."
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
  if (walk(abs).length === 0) unmounted.push(`${custody.id}: ${custody.root} is mounted but holds no indexable binary`);
}
if (unmounted.length) {
  console.error("REFUSED: a declared source custody is not present, and an index missing its entries would unbind every source keyed to them.");
  for (const line of unmounted) console.error(`  ${line}`);
  console.error("Mount it (bash scripts/rcap-corpus/bootstrap-private-corpus.sh for the Master Library) or remove the custody from the table in this file.");
  process.exit(1);
}

const entries = [];
// Absolute path -> entry, for the documents the primary reader refused.
const unreadable = new Map();
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
    const isPdf = /\.pdf$/i.test(file);
    const text = isPdf ? bytes.toString("latin1") : "";
    let pageCount = null;
    let acroFieldCount = null;
    let loadError = null;
    if (isPdf) try {
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
      /* A custody-type restriction that travels WITH the bytes. null means the
       * custody declares none. "PARTIAL_NATIONWIDE_RECOVERY_POOL" means these
       * bytes are individually verified and collectively incomplete, so they
       * may satisfy a source obligation and may never evidence a complete
       * corpus. Carried per entry so the restriction survives being copied out
       * of the index one row at a time. */
      custodyType: custody.custodyType ?? null,
      fileName: path.basename(file),
      state: identity.state,
      assetClass: identity.assetClass,
      formNumber: identity.formNumber,
      revision: identity.revision,
      language: identity.language,
      byteLength: bytes.length,
      sha256,
      /* What kind of binary this is. Present on every entry so no reader has
       * to infer it from the path, and so the absence of a structural
       * measurement below is explained rather than ambiguous. */
      assetFormat: isPdf ? "pdf" : path.extname(file).slice(1).toLowerCase(),
      pageCount,
      // Read from the bytes. The name says what someone meant; the dictionary
      // says what the factory will actually find.
      // A document the primary reader refused is measured again below, with an
      // instrument that can open it. Until then it claims nothing.
      acroFormPresent: !isPdf ? null : loadError ? null : /\/AcroForm\b/.test(text),
      acroFieldCount,
      xfaPresent: !isPdf ? null : loadError ? null : /\/XFA[\s/[]/.test(text),
      // An XFA form's fields may live entirely in the XML, so an AcroForm
      // dictionary with zero fields on an XFA document means "not readable by
      // this factory", not "nothing to fill".
      /* A non-PDF is not "unreadable": nothing tried to read it as a PDF and
       * nothing should. It carries its own format and no PDF verdict. */
      structuralClassObserved: !isPdf ? `not_a_pdf_${path.extname(file).slice(1).toLowerCase()}`
        : loadError ? "unreadable"
        : /\/XFA[\s/[]/.test(text) ? "xfa"
          : (acroFieldCount ?? 0) > 0 ? "acroform"
            : "flat_pdf",
      loadError
    };
    if (loadError && isPdf) unreadable.set(file, entry);
    entries.push(entry);
    shaToEntry.set(sha256, entry);
  }
}

// Second pass: measure what the primary reader could not open.
{
  const files = [...unreadable.keys()].sort();
  const { readings, reader } = pikepdfStructure(files);
  for (const file of files) {
    const entry = unreadable.get(file);
    const reading = readings.get(file);
    if (!reading || reading.error) {
      entry.structureReadBy = reader ? `pikepdf refused: ${reading?.error ?? "no reading returned"}` : "not_measured_no_pikepdf";
      continue;
    }
    entry.acroFormPresent = reading.acroFormPresent;
    entry.xfaPresent = reading.xfaPresent;
    entry.acroFieldCount = reading.acroFieldCount;
    entry.pageCount = reading.pageCount;
    entry.encrypted = reading.encrypted;
    // structuralClassObserved keeps saying "unreadable": that is a true
    // statement about the factory's own reader, it is what committed source
    // receipts already pin, and this second reading does not change it.
    entry.structureReadBy = "pikepdf";
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
    custodyType: c.custodyType ?? null,
    completeOperationalCorpus: c.completeOperationalCorpus ?? null,
    binariesIndexed: byCustody[c.id] ?? 0,
    /* Kept under its old name as well: several committed records and readers
     * ask for pdfsIndexed by name, and renaming it silently would make them
     * read zero. It counts every indexed binary, as it always did. */
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
    binariesIndexed: entries.length,
    pdfsIndexed: entries.length,
    byAssetFormat: entries.reduce((acc, e) => { acc[e.assetFormat] = (acc[e.assetFormat] ?? 0) + 1; return acc; }, {}),
    whyByAssetFormatExists: "The index held PDFs only until a non-PDF official binary was needed. Five Montana DOCX documents were held, hash-verifiable and invisible to every identity check because of it. A consumer that needs pageCount, acroFormPresent or structuralClassObserved must read assetFormat first: those are PDF measurements and are null on anything else.",
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
