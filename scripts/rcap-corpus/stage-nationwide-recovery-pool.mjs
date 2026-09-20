#!/usr/bin/env node
// Stages the exactly-recovered subset of the Nationwide corpus into a PARTIAL
// custody, and writes the custody receipt that says so.
//
//   node scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs \
//     --kit-root /tmp/legalease-nationwide-recovery/Nationwide_Corpus_Recovery_Kit
//   node scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs --verify-only
//
// WHY THIS IS NOT THE OPERATIONAL CORPUS
//
// The recovery kit reconstructs 513 of the 583 files the restore manifest
// records, each at its exact SHA-256. Seventy paths are absent. That is a
// genuinely useful custody -- 513 official binaries whose bytes are proven --
// and it is emphatically NOT the operational Nationwide corpus, which is 583
// files and nothing less.
//
// The distinction has to survive contact with every consumer downstream, so it
// is carried three ways rather than stated once in a comment:
//
//   1. the install root is named for what it is, a recovery POOL, and is not
//      "private/Nationwide Record Clearing" -- that path stays absent, and this
//      script refuses to write there under any argument;
//   2. every receipt row and the receipt document itself carry
//      custodyType: "PARTIAL_NATIONWIDE_RECOVERY_POOL" and
//      completeOperationalCorpus: false;
//   3. scripts/rcap-corpus/bootstrap-private-corpus.sh is untouched and still
//      requires all 583, so nothing about this custody can be mistaken for a
//      completed bootstrap.
//
// WHY THE POOL INDEX IS NOT TRUSTED
//
// The kit's pool is content-addressed: a file's name is its hash. Reading that
// name is not verification, it is repeating an assertion made by whoever wrote
// the name. So every staged file is re-hashed FROM THE STAGED BYTES after the
// copy, and compared against the repository's own restore manifest. A file that
// does not match is deleted rather than staged: a wrong byte in a source
// custody is worse than an absent one, because absence is visible.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const CUSTODY_TYPE = "PARTIAL_NATIONWIDE_RECOVERY_POOL";
const STAGE_REL = "private/source-imports/Nationwide_Recovery_Pool_2026-09-02";
const MANIFEST_REL = "data/rcap-all50/nationwide-restore-manifest.json";
const RECEIPT_REL = "data/rcap-all50/NATIONWIDE_PARTIAL_CUSTODY_2026-09-02.json";

// The path reserved for the complete 583-file operational corpus. Nothing here
// may write into it, however it is spelled on the command line.
const RESERVED_OPERATIONAL_REL = "private/Nationwide Record Clearing";

// The reassembled recovery kit archive, verified before extraction. Recorded on
// every row so a later reader can tell which kit these bytes came out of.
const DEFAULT_KIT_SHA256 = "db8a02db11f3951dfffe34fa443d444d53ab4e09bce25767960905396a54f6f1";
const DEFAULT_KIT_ROOT = "/tmp/legalease-nationwide-recovery/Nationwide_Corpus_Recovery_Kit";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
};
const verifyOnly = process.argv.includes("--verify-only");
const kitRoot = path.resolve(arg("--kit-root", DEFAULT_KIT_ROOT));
const kitSha256 = arg("--kit-sha256", DEFAULT_KIT_SHA256);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const fail = (...lines) => { for (const l of lines) console.error(l); process.exit(1); };

const stageAbs = path.join(rootDir, STAGE_REL);

/* ---------------------------------------------------------------- guardrails */

// The reserved operational path must stay absent, and this script must be
// incapable of populating it. Both are checked, not assumed.
const reservedAbs = path.join(rootDir, RESERVED_OPERATIONAL_REL);
if (path.resolve(stageAbs) === reservedAbs || path.resolve(stageAbs).startsWith(`${reservedAbs}${path.sep}`)) {
  fail(`REFUSED: the stage root resolves inside ${RESERVED_OPERATIONAL_REL}.`,
       "That path is reserved for the complete 583-file operational corpus and a partial custody may never occupy it.");
}
if (fs.existsSync(reservedAbs)) {
  fail(`REFUSED: ${RESERVED_OPERATIONAL_REL} exists.`,
       "This script stages a PARTIAL custody and must not run beside a tree claiming to be the operational corpus;",
       "if that tree is genuinely the complete 583, it is the bootstrap's business and not this script's.");
}

// Before a single byte is written: the stage root must be ignored by git. A
// source corpus that git can see is a corpus that git will eventually commit.
{
  const r = spawnSync("git", ["check-ignore", "-v", STAGE_REL], { cwd: rootDir, encoding: "utf8" });
  if (r.status !== 0) {
    fail(`REFUSED: ${STAGE_REL} is not git-ignored, and no source body may be written where git can stage it.`,
         "Add it to .gitignore (private/ already covers it in this repository) and rerun.");
  }
  console.log(`gitignored: ${r.stdout.trim()}`);
}

/* -------------------------------------------------------------------- inputs */

const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, MANIFEST_REL), "utf8"));
const manifestFiles = manifest.files ?? [];
if (manifestFiles.length === 0) fail("REFUSED: the restore manifest carries no files.");

const poolDir = path.join(kitRoot, "pool", "files");
if (!verifyOnly && !fs.existsSync(poolDir)) {
  fail(`REFUSED: the recovery pool is not present at ${poolDir}.`,
       "Extract the recovery kit first, or pass --kit-root.");
}

/*
 * The pool is content-addressed as <sha256><ext>, so a candidate is found by
 * hash prefix rather than by any name the manifest records. This builds the
 * hash -> pool file map ONCE from the directory listing; the name is used only
 * to FIND a candidate, never to accept one.
 */
const poolByHash = new Map();
if (fs.existsSync(poolDir)) {
  for (const name of fs.readdirSync(poolDir)) {
    const m = /^([0-9a-f]{64})/.exec(name);
    if (m && !poolByHash.has(m[1])) poolByHash.set(m[1], path.join(poolDir, name));
  }
}

/*
 * Jurisdiction. The manifest's perState block already records which folders
 * belong to which jurisdiction, so the mapping is READ from the repository's
 * own record rather than re-derived from folder names -- "LegalEase Arkanasa"
 * is misspelled in the corpus and any name-based guess would drop it.
 */
const folderToJurisdiction = new Map();
for (const [code, state] of Object.entries(manifest.perState ?? {})) {
  for (const folder of state.folders ?? []) folderToJurisdiction.set(folder, code);
}

/* --------------------------------------------------------------- stage + verify */

const staged = [];
const absentFromPool = [];
const rejected = [];
const startedAt = new Date().toISOString();

for (const file of [...manifestFiles].sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
  const expected = String(file.sha256 ?? "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) {
    rejected.push({ relativePath: file.relativePath, reason: "manifest_sha256_malformed", expectedSha256: file.sha256 ?? null });
    continue;
  }
  const candidate = poolByHash.get(expected);
  const destAbs = path.join(stageAbs, file.relativePath);

  if (verifyOnly) {
    if (!fs.existsSync(destAbs)) { absentFromPool.push({ relativePath: file.relativePath, sha256: expected, reason: "not_staged" }); continue; }
  } else {
    if (!candidate) { absentFromPool.push({ relativePath: file.relativePath, sha256: expected, byteLength: file.byteLength ?? null, classification: file.classification ?? null, reason: "no_pool_candidate_at_this_hash" }); continue; }
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.copyFileSync(candidate, destAbs);
  }

  // THE VERIFICATION. Re-read what is on disk at the destination and hash it.
  // Not the candidate, not the pool index, not the file name: the staged bytes.
  const stagedBytes = fs.readFileSync(destAbs);
  const actual = sha256(stagedBytes);
  if (actual !== expected) {
    fs.rmSync(destAbs, { force: true });
    rejected.push({ relativePath: file.relativePath, reason: "staged_bytes_did_not_match_manifest_sha256", expectedSha256: expected, actualSha256: actual });
    continue;
  }
  if (file.byteLength != null && stagedBytes.length !== file.byteLength) {
    fs.rmSync(destAbs, { force: true });
    rejected.push({ relativePath: file.relativePath, reason: "staged_byte_length_did_not_match_manifest", expectedByteLength: file.byteLength, actualByteLength: stagedBytes.length });
    continue;
  }

  const folder = file.relativePath.split("/")[0];
  staged.push({
    manifestPath: file.relativePath,
    stagedPath: path.posix.join(STAGE_REL, file.relativePath.split(path.sep).join("/")),
    sha256: actual,
    byteLength: stagedBytes.length,
    jurisdiction: folderToJurisdiction.get(folder) ?? null,
    jurisdictionFolder: folder,
    classification: file.classification ?? null,
    recoveryKitSha256: kitSha256,
    verifiedAt: new Date().toISOString(),
    custodyType: CUSTODY_TYPE,
    completeOperationalCorpus: false
  });
}

/* ------------------------------------------------------------------- receipt */

const byJurisdiction = {};
for (const row of staged) {
  const k = row.jurisdiction ?? "unknown";
  byJurisdiction[k] = (byJurisdiction[k] ?? 0) + 1;
}

const receipt = {
  schemaVersion: "rcap-nationwide-partial-custody-receipt/v1",
  generatedBy: "scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs",
  generatedOn: startedAt,

  // The two markers, at the document level as well as on every row. A reader
  // that checks only the document, and a reader that checks only a row, both
  // learn the same thing.
  custodyType: CUSTODY_TYPE,
  completeOperationalCorpus: false,

  custodyId: "nationwide_recovery_pool_2026_09_02",
  installRoot: STAGE_REL,
  reservedOperationalRootLeftAbsent: RESERVED_OPERATIONAL_REL,
  purpose: "A custody receipt for the exactly-recovered SUBSET of the Nationwide corpus. Paths, hashes and lengths only -- never a source body, never a court PDF, never an archive.",
  whatThisCustodyIs: [
    `${staged.length} files recovered at their exact manifest SHA-256 and re-verified from the staged bytes.`,
    "Sufficient to satisfy an INDIVIDUAL official-source obligation whose expected hash is present here.",
    "NOT sufficient to satisfy any assertion that requires the complete operational corpus."
  ],
  whatThisCustodyIsNot: {
    theOperationalCorpus: `The operational corpus is the ${manifestFiles.length}-file tree at ${RESERVED_OPERATIONAL_REL}. It is absent, and this custody does not stand in for it.`,
    aBootstrapSubstitute: "scripts/rcap-corpus/bootstrap-private-corpus.sh is unchanged and still requires every file the restore manifest records.",
    aCompletenessWarrant: "No count, no coverage claim and no jurisdiction-complete assertion may cite this receipt."
  },
  verification: {
    method: "Each file was copied from the content-addressed recovery pool and then re-hashed FROM THE STAGED BYTES; the pool index and the pool file names were not trusted as evidence.",
    manifest: MANIFEST_REL,
    manifestAtCommit: manifest.atCommit ?? null,
    recoveryKitSha256: kitSha256,
    recoveryKitRoot: kitRoot
  },
  totals: {
    manifestFiles: manifestFiles.length,
    stagedAndVerified: staged.length,
    absentFromRecoveryPool: absentFromPool.length,
    rejectedAfterStaging: rejected.length,
    jurisdictionsRepresented: Object.keys(byJurisdiction).length,
    jurisdictionsInCompleteCorpus: Object.keys(manifest.perState ?? {}).length
  },
  byJurisdiction,
  absentFromRecoveryPool: absentFromPool,
  rejectedAfterStaging: rejected,
  files: staged
};

if (rejected.length > 0) {
  console.error(`${rejected.length} file(s) failed verification after staging and were removed:`);
  for (const r of rejected) console.error(`  ${r.reason} ${r.relativePath}`);
}

fs.writeFileSync(path.join(rootDir, RECEIPT_REL), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt.totals, null, 1));
console.log(`receipt: ${RECEIPT_REL}`);
console.log(`custodyType: ${CUSTODY_TYPE} completeOperationalCorpus: false`);
