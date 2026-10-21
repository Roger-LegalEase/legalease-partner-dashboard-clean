#!/usr/bin/env node
/**
 * The exact residual acquisition list for the Nationwide operational corpus.
 *
 * Roger supplied a hash-addressed recovery pool assembled from the retained
 * original archive, the June All-51 build kit, the nationwide overlay and the
 * Batch 1-3 source packages. Run against this repository's own 583-file
 * restore manifest, the kit's reconstructor recovered 513 files at their exact
 * SHA-256 and refused the remaining 70. It installed nothing and wrote no
 * archive, which is the correct behaviour: a partial tree published under the
 * operational asset name is a corpus that lies about its own completeness.
 *
 * This writes down what is still owed, and nothing else. It is a list of paths
 * and hashes -- never a source body -- so it is safe to commit, and it is the
 * only acquisition assignment the corpus lane now has.
 *
 * ON "DEPENDENT FAMILIES". The restore manifest carries a relative path, a
 * SHA-256, a byte length and a classification. It carries no artifact id and no
 * family binding, so no per-file dependency can be derived from it, and
 * NATIONWIDE_MOUNT_GAP already recorded why: the link between an unheld file
 * and a blocked family is jurisdictional, not per-obligation. The
 * jurisdictional roll-up below is therefore an UPPER BOUND on what a given
 * state's residual files could unblock, and is labelled as one. Presenting it
 * as a forecast would be inventing a binding the repository does not hold.
 *
 *   node scripts/rcap-corpus/generate-nationwide-residual-acquisition.mjs \
 *     --report /tmp/nationwide-corpus-recovery-report.json
 */
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const reportPath = argv[argv.indexOf("--report") + 1] ?? "/tmp/nationwide-corpus-recovery-report.json";
const OUT = "data/rcap-all50/NATIONWIDE_RESIDUAL_ACQUISITION.json";

const read = (p) => JSON.parse(fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), "utf8"));
const report = read(reportPath);
const manifest = read("data/rcap-all50/nationwide-restore-manifest.json");
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");

if (report.expectedFiles !== manifest.files.length) {
  console.error(`REFUSING: the report counts ${report.expectedFiles} expected files and the manifest holds ${manifest.files.length}. They must be the same manifest.`);
  process.exit(1);
}

/* The folder name is the only jurisdiction signal on a manifest row, and the
 * manifest's own perState block already maps every folder to its state code.
 * Reading it there rather than parsing "LegalEase Colorado" keeps one answer. */
const stateOfFolder = new Map();
for (const [code, s] of Object.entries(manifest.perState ?? {}))
  for (const folder of s.folders ?? []) stateOfFolder.set(folder, code);

const jurisdictionOf = (relativePath) => stateOfFolder.get(relativePath.split("/")[0]) ?? null;

const missing = report.missing.map((m) => ({
  relativePath: m.relativePath,
  sha256: m.sha256,
  byteLength: m.byteLength,
  classification: m.classification ?? null,
  jurisdiction: jurisdictionOf(m.relativePath)
})).sort((a, b) => a.relativePath.localeCompare(b.relativePath));

const byClassification = {};
for (const m of missing) byClassification[m.classification ?? "unclassified"] = (byClassification[m.classification ?? "unclassified"] ?? 0) + 1;

/*
 * SOME OF WHAT THE POOL LACKS, THIS CHECKOUT ALREADY HOLDS.
 *
 * The reconstructor searches Roger's pool and nothing else, which is correct
 * for what it is doing -- but it means "missing from the pool" is not the same
 * claim as "missing everywhere", and only the second is worth asking Roger to
 * go and find. So every residual hash is looked for in the corpora this
 * checkout already mounts, by hashing the bytes rather than by matching a name.
 * Anything found here is not an acquisition task; it is a file the kit simply
 * never looked at.
 *
 * The kit itself is left exactly as supplied. Dropping these into its pool
 * would raise the recovered count without changing anything operational -- 517
 * is as short of 583 as 513 is -- while making the report misattribute four
 * files to a pool that does not contain them.
 */
const LOCAL_CUSTODY_ROOTS = [
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/nationwide-source-cache"
];
const wantedLengths = new Set(missing.map((m) => m.byteLength));
const wantedHashes = new Map();
for (const m of missing) {
  if (!wantedHashes.has(m.sha256)) wantedHashes.set(m.sha256, []);
  wantedHashes.get(m.sha256).push(m.relativePath);
}
const heldLocally = new Map();
const walk = (dir) => {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.isFile()) continue;
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (!wantedLengths.has(st.size)) continue;
    let h;
    try { h = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } catch { continue; }
    if (wantedHashes.has(h) && !heldLocally.has(h)) heldLocally.set(h, path.relative(ROOT, p));
  }
};
for (const r of LOCAL_CUSTODY_ROOTS) if (fs.existsSync(path.join(ROOT, r))) walk(path.join(ROOT, r));
for (const m of missing) {
  const at = heldLocally.get(m.sha256) ?? null;
  m.alreadyHeldInThisCheckoutAt = at;
  m.isAnAcquisitionTask = at === null;
}
const stillToAcquire = missing.filter((m) => m.isAnAcquisitionTask);
const distinctHashesToAcquire = new Set(stillToAcquire.map((m) => m.sha256)).size;

/* SOURCE_BLOCKED families in each jurisdiction that still owes files. An upper
 * bound, for the reason recorded at the top of this file. */
const blockedByJurisdiction = new Map();
for (const f of master.families) {
  if (f.state !== "SOURCE_BLOCKED") continue;
  for (const j of String(f.jurisdiction ?? "").split("/").filter(Boolean)) {
    if (!blockedByJurisdiction.has(j)) blockedByJurisdiction.set(j, []);
    blockedByJurisdiction.get(j).push(f.familyId);
  }
}

const perJurisdiction = {};
for (const m of missing) {
  const j = m.jurisdiction ?? "UNMAPPED";
  perJurisdiction[j] ??= { filesStillOwed: 0, byClassification: {}, sourceBlockedFamiliesInThisJurisdiction: [] };
  perJurisdiction[j].filesStillOwed += 1;
  const c = m.classification ?? "unclassified";
  perJurisdiction[j].byClassification[c] = (perJurisdiction[j].byClassification[c] ?? 0) + 1;
}
for (const [j, row] of Object.entries(perJurisdiction))
  row.sourceBlockedFamiliesInThisJurisdiction = [...new Set(blockedByJurisdiction.get(j) ?? [])].sort();

const atCommit = (() => {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); }
  catch { return null; }
})();

const doc = {
  schemaVersion: "rcap-nationwide-residual-acquisition/v1",
  generatedBy: "scripts/rcap-corpus/generate-nationwide-residual-acquisition.mjs",
  atCommit,
  derivedFrom: {
    recoveryReport: report.schemaVersion,
    manifest: "data/rcap-all50/nationwide-restore-manifest.json",
    recoveryKitSha256: "db8a02db11f3951dfffe34fa443d444d53ab4e09bce25767960905396a54f6f1",
    recoveryKitBytes: 228260257
  },
  outcome: "NATIONWIDE_CORPUS_RESIDUAL_HASHES_REQUIRED",
  counts: {
    expectedFiles: report.expectedFiles,
    recoveredFromThePoolAtExactHash: report.recoverableFiles,
    absentFromThePool: report.missingFiles,
    distinctHashesAbsentFromThePool: new Set(missing.map((m) => m.sha256)).size,
    ofThoseAlreadyHeldInThisCheckout: missing.length - stillToAcquire.length,
    trueAcquisitionTaskPaths: stillToAcquire.length,
    trueAcquisitionTaskDistinctHashes: distinctHashesToAcquire,
    wrongSize: report.wrongSizeFiles,
    jurisdictionsStillOwingFiles: Object.keys(perJurisdiction).length
  },
  whyTwoCountsDiffer: "Seventy manifest PATHS are absent from the pool, but two Wisconsin paths name the same bytes, so they are sixty-nine distinct hashes. Four of those are already held in this checkout's Master Library at their exact recorded SHA-256, so what Roger is actually being asked to find is smaller than the number the reconstructor prints.",
  whatWasInstalled: {
    operationalTree: false,
    releaseArchive: false,
    why: "The reconstructor refuses partial recovery, and so does the bootstrap. A tree short of its manifest may not be installed under private/Nationwide Record Clearing, and an archive short of its manifest may not be published as Nationwide_Record_Clearing.zip. Nothing was renamed, nothing was substituted, and the Master Library was not put in its place."
  },
  whatTheRecoveredFilesDoNotAuthorize: [
    "The 513 recovered files are staged nowhere and mounted nowhere. They are recoverable from the pool on demand once the denominator is complete.",
    "No family moved on the strength of this recovery, because no source is mounted at its recorded hash.",
    "The residual list opens no commercial route and proves no packet."
  ],
  howToRecheckOnceMoreBytesArrive: "Add the missing bytes to the pool and re-run the kit's reconstruct_nationwide_corpus.py against this repository's manifest. It exits 2 with a shorter residual list, or writes the archive at 583/583.",
  dependentFamiliesCaveat: "The restore manifest carries no artifact id and no family binding, so no per-file dependency exists to report. The per-jurisdiction roll-up below is an UPPER BOUND on what a state's residual files could unblock, never a forecast that any listed family depends on any listed file.",
  byClassification,
  perJurisdiction,
  missing
};

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${OUT}`);
console.log(`  ${doc.counts.recoveredFromThePoolAtExactHash}/${doc.counts.expectedFiles} recovered from the pool at exact hash`);
console.log(`  ${doc.counts.absentFromThePool} path(s) absent from the pool; ${doc.counts.ofThoseAlreadyHeldInThisCheckout} already held here, so ${doc.counts.trueAcquisitionTaskPaths} path(s) / ${doc.counts.trueAcquisitionTaskDistinctHashes} hash(es) are the acquisition task across ${doc.counts.jurisdictionsStillOwingFiles} jurisdiction(s)`);
for (const [c, n] of Object.entries(byClassification).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${c}`);
