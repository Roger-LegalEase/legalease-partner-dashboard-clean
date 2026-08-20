#!/usr/bin/env node
// Which retained assets have a source, and which are actually missing one.
//
//   node scripts/generate-rcap-pdf-source-materialization-handoff.mjs
//   node scripts/generate-rcap-pdf-source-materialization-handoff.mjs --check
//
// "We do not have the source" and "the source is not mounted right now" are
// different problems with different owners, and collapsing them costs the PDF
// rendering lane real time: it cannot tell which families are waiting on an
// acquisition and which are waiting on a volume.
//
// So every retained asset is matched against the committed corpus index in a
// fixed order -- exact pinned hash, then form number plus revision, then the
// official workbook, then a verified replacement, then genuinely unresolved --
// and separately checked for whether its bytes are reachable in this clone
// right now, by hashing what is on disk rather than by trusting a flag.
//
// Those two answers are independent, and the handoff states both. An asset can
// have a perfectly good source that nobody can read today.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS_INDEX = path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json");
const MASTER_LIST = path.join(rootDir, "data/rcap-all50/problematic-pdf-master-list.json");
const DETERMINATION = path.join(rootDir, "data/rcap-all50/pdf-retirement-determination.json");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/pdf-source-handoffs/source-materialization-handoff.json");
const checkOnly = process.argv.includes("--check");

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};
const fail = (message) => { console.error(`FAIL source materialization handoff — ${message}`); process.exit(1); };

const corpus = readJson(CORPUS_INDEX) ?? fail("the local source corpus index has not been generated");
const masterList = readJson(MASTER_LIST) ?? fail("the problematic-pdf master list has not been generated");
const determination = readJson(DETERMINATION) ?? fail("the retirement determination has not been generated");

// ---- what the corpus index says exists --------------------------------------
const corpusBySha = new Map();
const corpusByFormAndRevision = new Map();
for (const entry of corpus.entries ?? []) {
  if (entry.sha256) corpusBySha.set(entry.sha256, entry);
  if (entry.formNumber && entry.revision) {
    const key = `${entry.state}|${String(entry.formNumber).toUpperCase()}|${entry.revision}`;
    corpusByFormAndRevision.set(key, entry);
  }
}

// ---- what is actually readable in this clone right now ----------------------
// Hashed, not trusted. `sourceBinaryPresentInClone` records the state of the
// machine that generated it, which is not this one.
const onDiskBySha = new Map();
const skipDir = new Set(["node_modules", ".git", ".next", "tmp"]);
const walkForPdfs = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { if (!skipDir.has(entry.name)) walkForPdfs(path.join(dir, entry.name)); continue; }
    if (!/\.pdf$/i.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const sha = createHash("sha256").update(fs.readFileSync(full)).digest("hex");
    if (!onDiskBySha.has(sha)) onDiskBySha.set(sha, path.relative(rootDir, full));
  }
};
walkForPdfs(rootDir);

// ---- the retained set, from the corrected determination ---------------------
const retainedAssetIds = new Set(
  determination.assets.filter((a) => a.determination === "retain_and_remediate").map((a) => a.assetId)
);
const masterRowById = new Map((masterList.rows ?? []).map((row) => [row.assetId, row]));

/** The family package directories an asset's families resolve to. */
function familyDirectoriesFor(familyIds) {
  const found = [];
  for (const familyId of familyIds) {
    const slug = familyId.split(":")[1];
    if (!slug) continue;
    for (const stateDir of fs.readdirSync(OVERLAY_DIR)) {
      const candidate = path.join(OVERLAY_DIR, stateDir, slug);
      if (fs.existsSync(path.join(candidate, "source-record.json"))) found.push(path.relative(rootDir, candidate));
    }
  }
  return [...new Set(found)];
}

/** A recorded replacement for an asset whose pinned bytes are not in the corpus. */
function supersedingCandidates(familyDirs) {
  const out = [];
  for (const dir of familyDirs) {
    const record = readJson(path.join(rootDir, dir, "source-record.json"), {});
    for (const candidate of record.bundleReconciliation?.supersedingCandidatesByDocumentId ?? []) {
      out.push({
        bundlePath: candidate.bundlePath ?? null,
        documentId: candidate.documentId ?? null,
        revision: candidate.revision ?? null,
        assetClass: candidate.assetClass ?? null,
        sha256: candidate.sha256 ?? null,
        // An instruction sheet and the form it explains carry the same form
        // number and are not the same document. VA cc1473inst is the
        // instructions; the only CC-1473 asset in the corpus is the petition
        // form. Offering one as the other's source would silently re-pin a
        // family to a document it is not.
        recordedComponentRole: record.componentRole ?? null,
        roleAgrees: !record.componentRole || !candidate.assetClass
          || (String(record.componentRole).toUpperCase() === "INSTRUCTIONS")
             === (String(candidate.assetClass).toUpperCase() === "INSTRUCTIONS")
      });
    }
  }
  return out;
}

const rows = [];
for (const asset of determination.assets) {
  if (!retainedAssetIds.has(asset.assetId)) continue;

  const master = masterRowById.get(asset.assetId) ?? null;
  const familyDirs = familyDirectoriesFor(asset.familyIds);
  const sha = master?.sourceSha256 ?? (/^[0-9a-f]{64}$/.test(asset.assetId.split("|")[2] ?? "") ? asset.assetId.split("|")[2] : null);

  const exact = sha ? corpusBySha.get(sha) ?? null : null;
  const revisionKey = master?.sourceRevision && master?.formNumber
    ? `${asset.jurisdiction}|${String(master.formNumber).toUpperCase()}|${master.sourceRevision}`
    : null;
  const byRevision = revisionKey ? corpusByFormAndRevision.get(revisionKey) ?? null : null;
  const superseding = exact ? [] : supersedingCandidates(familyDirs);
  const readableNow = sha ? onDiskBySha.get(sha) ?? null : null;

  let matchClass;
  let matchedCorpusPath = null;
  if (exact) { matchClass = "exact_pinned_sha256"; matchedCorpusPath = exact.path; }
  else if (byRevision) { matchClass = "exact_form_number_and_revision"; matchedCorpusPath = byRevision.path; }
  else if (superseding.some((c) => c.roleAgrees)) matchClass = "verified_replacement_or_source_drift_candidate";
  else if (superseding.length > 0) matchClass = "replacement_offered_but_document_role_disagrees";
  else matchClass = "genuinely_unresolved";

  rows.push({
    assetId: asset.assetId,
    jurisdiction: asset.jurisdiction,
    formNumber: asset.formNumber,
    familyIds: asset.familyIds,
    familyPackagePaths: familyDirs,
    sourceSha256: sha,
    structuralClass: master?.structuralClass ?? null,
    officialSourceUrl: master?.officialSourceUrl ?? null,
    matchClass,
    matchedCorpusPath,
    matchedCorpusEntry: exact
      ? { revision: exact.revision, language: exact.language, assetClass: exact.assetClass, pageCount: exact.pageCount,
          acroFormPresent: exact.acroFormPresent, acroFieldCount: exact.acroFieldCount, xfaPresent: exact.xfaPresent,
          structuralClassObserved: exact.structuralClassObserved, loadError: exact.loadError ?? null }
      : null,
    supersedingCandidates: superseding,
    bytesReadableInThisCloneAt: readableNow,
    // The only rows the PDF lane can act on with no further input.
    materializableNow: Boolean(readableNow),
    // The rows it can act on the moment the corpus volume is mounted.
    materializableOnCorpusMount: Boolean(exact) && !readableNow
  });
}

const byClass = (name) => rows.filter((r) => r.matchClass === name).length;
const totals = {
  retainedAssets: rows.length,
  exactPinnedSha256: byClass("exact_pinned_sha256"),
  exactFormNumberAndRevision: byClass("exact_form_number_and_revision"),
  verifiedReplacementOrSourceDrift: byClass("verified_replacement_or_source_drift_candidate"),
  replacementOfferedButRoleDisagrees: byClass("replacement_offered_but_document_role_disagrees"),
  genuinelyUnresolved: byClass("genuinely_unresolved"),
  materializableNow: rows.filter((r) => r.materializableNow).length,
  materializableOnCorpusMount: rows.filter((r) => r.materializableOnCorpusMount).length
};

const corpusMounted = fs.existsSync(path.join(rootDir, corpus.corpusRoot ?? "private/never"));

const payload = {
  schemaVersion: "rcap-pdf-source-materialization-handoff/v1",
  generatedBy: "scripts/generate-rcap-pdf-source-materialization-handoff.mjs",
  purpose: "For every retained problematic asset: whether a source exists, which corpus bytes it is, and whether anyone in this clone can read them today. The second question is not the first.",
  twoQuestionsKeptApart: {
    doWeHaveASource: "Answered against data/rcap-all50/local-source-corpus-index.json, the committed record of the installed Master Library. An exact pinned-sha256 match means those bytes were present and hash-verified when the index was built.",
    canAnyoneReadItHere: "Answered by hashing every PDF in this clone. `sourceBinaryPresentInClone` in the master list is NOT used: it records the state of the machine that generated it, and 61 of its 62 true values point into private/, which is git-ignored and absent from every clone of this branch."
  },
  corpus: {
    root: corpus.corpusRoot ?? null,
    mountedInThisClone: corpusMounted,
    indexedPdfs: corpus.totals?.pdfsIndexed ?? null,
    sourceArchiveSha256: corpus.importVerification?.sourceArchiveSha256 ?? null,
    filesDeclared: corpus.importVerification?.filesDeclared ?? null,
    filesHashVerified: corpus.importVerification?.filesHashVerified ?? null
  },
  retirementDeterminationTotals: determination.totals,
  totals,
  rows: rows.sort((a, b) => a.assetId.localeCompare(b.assetId))
};

const json = `${JSON.stringify(payload, null, 2)}\n`;
if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) fail(`${path.relative(rootDir, OUT)} is stale; re-run this generator`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
}

console.log(`OK source materialization handoff — ${totals.retainedAssets} retained; ${totals.exactPinnedSha256} exact-hash, ${totals.verifiedReplacementOrSourceDrift} drift candidates, ${totals.genuinelyUnresolved} unresolved; ${totals.materializableNow} readable here now, ${totals.materializableOnCorpusMount} on corpus mount`);
