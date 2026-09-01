// The governed official-source registry.
//
// WHY THIS EXISTS
//
// The Grade-A authority used to ask whether Git held the court's PDF
// (`heldInRepository`). That question is unanswerable by design: `private/` is
// git-ignored and this repository's settled rule is to judge a source by its
// identity, not by whether Git holds the bytes. So the requirement could only
// ever be satisfied by breaking another rule, and while it stood, zero of the
// 424 official forms named across the launch graph were marked held and no
// route in the product could reach COMPLETE_PACKET_PROVEN however much proof it
// accumulated.
//
// This registry replaces that question with one that can actually be answered
// and can actually fail: does the content digest the packet was built against
// equal the content digest the corpus import verified on disk?
//
// TWO INDEPENDENT COMMITTED RECORDS
//
// The two sides come from records produced by different processes at different
// times, which is what makes their agreement evidence rather than a tautology:
//
//   expected  - the `sha256` on the packet's own official-form source record,
//               written when the overlay was built against that document.
//   installed - the `sha256` in the local source corpus index, written when the
//               corpus was imported and every file was rehashed on disk.
//
// A source is proven when both exist and are exactly equal. It fails closed
// when either is absent, and it fails closed when they disagree. Neither
// requires the bytes to be committed, and this file carries no bytes -- only
// digests, paths and identities.
//
// WHAT THIS FILE DOES NOT ESTABLISH
//
// It does not prove the bytes on this machine right now are those bytes. That
// is a live check against a mounted corpus, and it belongs to
// scripts/verify-rcap-official-source-corpus.mjs, which rehashes the installed
// files and refuses to pass on a mismatch. Generation stays deterministic and
// runs with or without a corpus mounted; verification is where live bytes are
// consulted. Keeping them apart is what lets CI reproduce this file exactly
// while still allowing a real byte proof where the corpus exists.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const OVERLAY_ROOTS = [
  "data/rcap-all50/overlays/production",
  "data/rcap-all50/overlays/lane-c-candidates"
];
const OUT = "data/rcap-grade-a/official-source-registry.json";

// The corpus release this registry is written against. Recorded so that a
// change of release or archive invalidates every authority record that cites
// it, rather than silently carrying old proofs onto new bytes.
const CORPUS_RELEASE = {
  releaseId: "source-corpus-2026-08-28",
  repository: "Roger-LegalEase/legalease-source-artifacts",
  asset: "Expungement_AI_RCAP_Master_Library_Edition_1.zip",
  archiveSha256: "a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89",
  installRoot: "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  corpusIsNotCommitted: true
};

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const corpusIndex = readJson(CORPUS_INDEX);
const launchGraph = readJson(LAUNCH_GRAPH);

// ---- installed side: the corpus import's on-disk verification ---------------
const installedById = new Map();
for (const entry of corpusIndex.entries ?? []) {
  if (!entry.formNumber || !entry.sha256) continue;
  const prior = installedById.get(entry.formNumber);
  // A form number that names two different files cannot identify a source.
  if (prior && prior.sha256 !== entry.sha256) {
    installedById.set(entry.formNumber, { ambiguous: true });
    continue;
  }
  if (!prior) {
    installedById.set(entry.formNumber, {
      sha256: entry.sha256,
      byteLength: entry.byteLength ?? null,
      corpusPath: entry.path
    });
  }
}

// ---- expected side: what each packet was actually built against -------------
const expectedById = new Map();
function scanOverlays(dir) {
  const abs = path.join(rootDir, dir);
  if (!fs.existsSync(abs)) return;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) { scanOverlays(rel); continue; }
    if (entry.name !== "source-record.json") continue;
    let record;
    try { record = readJson(rel); } catch { continue; }
    const id = record.documentId;
    if (!id || !record.sha256) continue;
    const prior = expectedById.get(id);
    if (prior && prior.sha256 !== record.sha256) {
      expectedById.set(id, { ambiguous: true, recordPath: prior.recordPath });
      continue;
    }
    if (!prior) {
      expectedById.set(id, {
        sha256: record.sha256,
        byteLength: record.byteLength ?? null,
        corpusPath: record.canonicalBundlePath ?? null,
        recordPath: rel
      });
    }
  }
}
for (const dir of OVERLAY_ROOTS) scanOverlays(dir);

// ---- the governed universe --------------------------------------------------
// Every source id the launch graph names, plus every id a packet source record
// binds. An id named by a route but absent from both sides still gets an entry,
// because "we cannot account for this source" is a fact the authority needs to
// read, not a row to omit.
const named = new Set();
for (const row of launchGraph.rows ?? launchGraph.routes ?? []) {
  for (const id of row.sourceAssets?.officialFormIdsNamed ?? []) named.add(id);
}
for (const id of expectedById.keys()) named.add(id);

const sources = {};
let proven = 0;
let unaccounted = 0;
let mismatched = 0;

for (const sourceId of [...named].sort()) {
  const expected = expectedById.get(sourceId) ?? null;
  const installed = installedById.get(sourceId) ?? null;

  const expectedSha256 = expected && !expected.ambiguous ? expected.sha256 : "";
  const installedSha256 = installed && !installed.ambiguous ? installed.sha256 : "";
  const match = expectedSha256 !== "" && expectedSha256 === installedSha256;

  let status;
  if (expected?.ambiguous || installed?.ambiguous) status = "ambiguous_identity";
  else if (expectedSha256 === "" && installedSha256 === "") status = "unaccounted";
  else if (expectedSha256 === "" || installedSha256 === "") status = "single_record_only";
  else if (!match) status = "records_disagree";
  else status = "corroborated";

  if (status === "corroborated") proven += 1;
  else if (status === "records_disagree" || status === "ambiguous_identity") mismatched += 1;
  else unaccounted += 1;

  sources[sourceId] = {
    sourceId,
    status,
    expectedSha256,
    expectedFrom: expected && !expected.ambiguous ? expected.recordPath : "",
    installedSha256,
    installedFrom: installed && !installed.ambiguous ? CORPUS_INDEX : "",
    corpusPath: (expected && !expected.ambiguous ? expected.corpusPath : null)
      ?? (installed && !installed.ambiguous ? installed.corpusPath : null) ?? "",
    byteLength: (expected && !expected.ambiguous ? expected.byteLength : null)
      ?? (installed && !installed.ambiguous ? installed.byteLength : null) ?? null,
    match
  };
}

const doc = {
  schemaVersion: "rcap-grade-a-official-source-registry/v1",
  generatedBy: "scripts/generate-rcap-official-source-registry.mjs",
  purpose:
    "Content identity for every official source a Grade-A route may bind. A source is corroborated when the digest the packet was built against equals the digest the corpus import verified on disk. No source bytes are recorded here and none are committed anywhere.",
  whatThisDoesNotEstablish:
    "That the bytes present on this machine right now are those bytes. That is a live check against a mounted corpus and belongs to scripts/verify-rcap-official-source-corpus.mjs.",
  corpusRelease: CORPUS_RELEASE,
  // The corpus import's own declaration, carried forward so the installed side
  // can be traced to the run that produced it.
  corpusImportVerification: corpusIndex.importVerification ?? null,
  totals: { sources: Object.keys(sources).length, corroborated: proven, mismatched, unaccounted },
  sources
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(rootDir, OUT);

if (check) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) {
    console.error(`Official source registry is stale. Run: node ${path.relative(rootDir, fileURLToPath(import.meta.url))}`);
    process.exit(1);
  }
  console.log(`Official source registry current. ${doc.totals.sources} source(s), ${doc.totals.corroborated} corroborated.`);
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`Official source registry written: ${doc.totals.sources} source(s).`);
  console.log(`  corroborated: ${doc.totals.corroborated}   records disagree or ambiguous: ${doc.totals.mismatched}   unaccounted: ${doc.totals.unaccounted}`);
}
