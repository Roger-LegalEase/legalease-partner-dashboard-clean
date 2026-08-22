#!/usr/bin/env node
// The bounded working view of the 81 retained_problematic PDFs for the finish sprint.
//
//   node scripts/generate-rcap-pdf-finish-workview.mjs
//   node scripts/generate-rcap-pdf-finish-workview.mjs --check
//
// This is a VIEW over the existing canonical register and terminalization queue,
// not a second ledger. It adds exactly one thing they cannot carry: whether each
// family's official source bytes are actually reachable right now.
//
// That distinction matters because the register's `binaryPresent` is computed
// against the family package directory, not against the corpora. A family whose
// package holds no binary is recorded as a missing binary even when its exact
// source — same SHA-256, same byte length — is sitting in the Nationwide tree or
// the Master Library. Twenty-seven of the thirty-seven "missing" families are in
// that position. Treating them as unavailable sends work to a source-acquisition
// lane that has nothing to acquire.
//
// So source presence is re-derived here by hashing the corpora and matching the
// digest already pinned in the asset id. Nothing is trusted from a filename, a
// path convention or a manifest claim; only a matching digest counts.
//
// The corpora are git-ignored and stay that way. What is committed is the
// resolution: which corpus file carries the digest, how many bytes it is, and
// which of the two corpora it came from.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { operationalCorpusPath, OPERATIONAL_CORPUS_RELATIVE, MASTER_LIBRARY_RELATIVE }
  from "./rcap-official-forms/operational-corpus-precondition.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const QUEUE = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const OUT = "data/rcap-all50/pdf-finish-workview.json";
const OUT_MD = "docs/record-clearing/pdf-finish-workview.md";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const fail = (m) => { console.error(`FAIL pdf finish workview — ${m}`); process.exit(1); };

const queue = readJson(QUEUE);
const register = readJson(REGISTER);

/**
 * Index every corpus file by content digest.
 *
 * Both corpora are indexed, not just the operational one: a family's official
 * source legitimately lives in either, and which tree holds it is a custody
 * fact worth recording rather than a reason to call the source missing.
 */
function indexCorpora() {
  const roots = [
    { label: "nationwide", dir: (() => { try { return operationalCorpusPath(rootDir); } catch { return abs(OPERATIONAL_CORPUS_RELATIVE); } })() },
    { label: "master_library", dir: abs(MASTER_LIBRARY_RELATIVE) }
  ];
  const index = new Map();
  let files = 0;
  const walk = (dir, label) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, label); continue; }
      let bytes;
      try { bytes = fs.readFileSync(full); } catch { continue; }
      files += 1;
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      // First writer wins, and the corpora are walked in a fixed order, so a
      // digest present in both trees always resolves to the same one.
      if (!index.has(digest)) {
        index.set(digest, { corpus: label, path: path.relative(rootDir, full), byteLength: bytes.length });
      }
    }
  };
  for (const { dir, label } of roots) walk(dir, label);
  return { index, files, roots: roots.map((r) => path.relative(rootDir, r.dir)) };
}

const { index: corpus, files: corpusFiles, roots: corpusRoots } = indexCorpora();
if (corpusFiles === 0) {
  fail("no corpus file was readable; the Nationwide tree and the Master Library are both absent, so source presence cannot be re-derived. " +
       "Run where the corpora are mounted rather than recording every family as unavailable.");
}

const recordFor = new Map();
for (const rec of register.records ?? []) recordFor.set(rec.identity, rec);

/**
 * One root blocker per family, chosen by precedence rather than by listing every
 * finding. A family with no reachable source cannot have a classification
 * problem fixed first, so source outranks everything; a retire/repoint decision
 * outranks a render defect because the artifact may not need to exist at all.
 */
const ROOT_CAUSE_GROUPS = [
  { id: "source_unmaterialized", title: "Official source bytes not reachable in any accessible corpus",
    owner: { session: 3, lane: "source custody and materialization" } },
  { id: "source_identity_never_pinned", title: "No source SHA-256 was ever recorded — identity cannot be settled by acquiring bytes",
    owner: { session: 3, lane: "source custody and materialization" } },
  { id: "not_a_filing_artifact", title: "Captured HTML, index or download page — retire, repoint or guidance",
    owner: { session: 13, lane: "retirement, repoint and guidance" } },
  { id: "render_or_finalizer_defect", title: "Source reachable; artifact carries a render, classification or finalizer defect",
    owner: { session: null, lane: "implementation worker" } }
];

const groupFor = (asset, sourceHit, digestRecorded) => {
  if (!digestRecorded) return "source_identity_never_pinned";
  if (!sourceHit) return "source_unmaterialized";
  if (asset.primaryBucket === "RETIRE_OR_REPOINT") return "not_a_filing_artifact";
  return "render_or_finalizer_defect";
};

const families = queue.assets.map((asset) => {
  // Two assets carry sha256_unrecorded_in_repo rather than a digest. That is a
  // third source state, not a variant of absent: nothing was ever pinned, so a
  // content match is impossible in principle and acquiring bytes would not
  // settle identity either. It is called out rather than folded into "absent",
  // which would imply a corpus search could resolve it.
  const digest = String(asset.assetId).split("|").pop();
  const digestRecorded = /^[0-9a-f]{64}$/.test(digest);
  const hit = digestRecorded ? (corpus.get(digest) ?? null) : null;
  const rec = recordFor.get(asset.assetId) ?? null;
  const group = groupFor(asset, hit, digestRecorded);
  return {
    familyId: asset.familyId,
    familyIds: asset.familyIds ?? [],
    assetId: asset.assetId,
    jurisdiction: asset.jurisdiction,
    formId: asset.formId,
    packagePath: asset.familyPackagePath ?? null,
    artifactPaths: asset.familyPackagePath
      ? ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]
        .map((rel) => `${asset.familyPackagePath}/${rel}`)
      : [],
    sourceRecordPath: asset.familyPackagePath ? `${asset.familyPackagePath}/source-record.json` : null,
    rootCauseGroup: group,
    rootBlocker: group === "source_unmaterialized"
      ? "official source bytes are not present in any accessible corpus"
      : group === "source_identity_never_pinned"
        ? "no source SHA-256 was ever recorded for this asset, so no corpus match can establish its identity"
        : asset.primaryBlocker,
    sourceAvailability: hit
      ? { status: "present_and_hash_verified", corpus: hit.corpus, resolvedPath: hit.path,
          sha256: digest, byteLength: hit.byteLength }
      : digestRecorded
        ? { status: "absent_from_every_accessible_corpus", corpus: null, resolvedPath: null,
            sha256: digest, byteLength: null }
        : { status: "no_digest_ever_recorded", corpus: null, resolvedPath: null,
            sha256: null, byteLength: null },
    registerSaysBinaryPresent: rec ? rec.binaryPresent === true : null,
    registerAndCorpusDisagree: rec ? (rec.binaryPresent === false && Boolean(hit)) : false,
    currentnessStatus: asset.currentnessStatus ?? null,
    mapOrProfileStatus: asset.currentArtifactStatus ?? null,
    censusStatus: asset.sourceStatus ?? null,
    classificationStatus: asset.subtype ?? "not_flagged",
    artifactStatus: asset.currentArtifactStatus ?? null,
    evidenceStatus: { sidecar: asset.sidecarStatus ?? null, visual: asset.allPageEvidenceStatus ?? null },
    reviewStatus: asset.reviewStatus ?? null,
    primaryBucket: asset.primaryBucket,
    terminalOutcome: asset.terminalOutcome,
    terminalTarget: asset.terminalTarget,
    terminalExitCondition: asset.doneCondition,
    mustPacket: asset.mustPacket === true,
    ownerLane: ROOT_CAUSE_GROUPS.find((g) => g.id === group).owner,
    ownedPaths: asset.ownedPaths ?? []
  };
});

// One root blocker and one owner each — asserted, not assumed.
{
  const seen = new Set();
  for (const f of families) {
    if (!f.rootBlocker) fail(`${f.familyId} has no root blocker`);
    if (!f.rootCauseGroup) fail(`${f.familyId} has no root-cause group`);
    if (!f.terminalExitCondition) fail(`${f.familyId} has no terminal exit condition`);
    const key = f.assetId;
    if (seen.has(key)) fail(`${key} appears twice; a family may have exactly one owner`);
    seen.add(key);
  }
  if (families.length !== 81) fail(`expected 81 families, built ${families.length}`);
}

const counts = families.reduce((acc, f) => {
  acc.byGroup[f.rootCauseGroup] = (acc.byGroup[f.rootCauseGroup] ?? 0) + 1;
  acc.bySource[f.sourceAvailability.status] = (acc.bySource[f.sourceAvailability.status] ?? 0) + 1;
  if (f.registerAndCorpusDisagree) acc.registerUnderstatesSourceBy += 1;
  return acc;
}, { byGroup: {}, bySource: {}, registerUnderstatesSourceBy: 0 });

const record = {
  schemaVersion: "rcap-pdf-finish-workview/v1",
  generatedBy: "scripts/generate-rcap-pdf-finish-workview.mjs",
  isNotASecondLedger:
    "a view over data/rcap-all50/problematic-pdf-register.json and the 81-asset terminalization queue. It introduces no status, no denominator and no ownership that those two do not already carry — only re-derived source reachability.",
  denominator: {
    platform_ready: register.totals.platformReady,
    retired: register.totals.retiredFromOperationalInventory,
    retained_problematic: register.totals.problematicPdfsTotal,
    retained_missing_per_register: register.totals.missingPdfBinaries
  },
  corpus: { roots: corpusRoots, filesIndexed: corpusFiles },
  sourceReDerivation: {
    method: "every corpus file hashed; matched against the SHA-256 already pinned in each asset id. A filename, a path convention or a manifest claim never counts as a match.",
    presentAndHashVerified: counts.bySource.present_and_hash_verified ?? 0,
    absentFromEveryAccessibleCorpus: counts.bySource.absent_from_every_accessible_corpus ?? 0,
    noDigestEverRecorded: counts.bySource.no_digest_ever_recorded ?? 0,
    registerRecordsMissingButCorpusHasIt: counts.registerUnderstatesSourceBy,
    whyTheyDisagree:
      "the register's binaryPresent asks whether the family package directory holds the binary. That is the right question for the package and the wrong question for the sprint: it reports a family as a missing binary while its exact bytes sit in the corpora, sending work to an acquisition lane with nothing to acquire.",
    thisMovesNoCount:
      "retained_missing stays as the register computes it. This records what is reachable; only a canonical generator may move a count."
  },
  rootCauseGroups: ROOT_CAUSE_GROUPS.map((g) => ({ ...g, familyCount: counts.byGroup[g.id] ?? 0 })),
  totals: { families: families.length, ...counts },
  families
};

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];

const md = [];
md.push("# RCAP PDF finish — bounded work view of the 81");
md.push("");
md.push(`Generated by \`scripts/generate-rcap-pdf-finish-workview.mjs\`. A view over the canonical register and the 81-asset queue, not a second ledger.`);
md.push("");
md.push(`Source re-derived by hashing ${corpusFiles} corpus files: **${record.sourceReDerivation.presentAndHashVerified} present and hash-verified**, **${record.sourceReDerivation.absentFromEveryAccessibleCorpus} absent from every accessible corpus**. ${record.sourceReDerivation.registerRecordsMissingButCorpusHasIt} families the register records as a missing binary have their exact bytes in a corpus.`);
md.push("");
for (const g of record.rootCauseGroups) {
  md.push(`## ${g.title} — ${g.familyCount}`);
  md.push("");
  md.push("| family | jurisdiction | root blocker | source | terminal outcome |");
  md.push("| --- | --- | --- | --- | --- |");
  for (const f of families.filter((x) => x.rootCauseGroup === g.id)) {
    md.push(`| \`${f.familyId}\` | ${f.jurisdiction} | ${String(f.rootBlocker).slice(0, 70)} | ${f.sourceAvailability.status === "present_and_hash_verified" ? f.sourceAvailability.corpus : "absent"} | ${f.terminalOutcome} |`);
  }
  md.push("");
}
outputs.push([OUT_MD, `${md.join("\n")}\n`]);

let stale = 0;
for (const [rel, body] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === body) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-pdf-finish-workview.mjs`);

console.log(
  `OK pdf finish workview — 81 families in ${record.rootCauseGroups.length} root-cause group(s); ` +
  `source ${record.sourceReDerivation.presentAndHashVerified} present / ${record.sourceReDerivation.absentFromEveryAccessibleCorpus} absent ` +
  `across ${corpusFiles} indexed corpus files; ${record.sourceReDerivation.registerRecordsMissingButCorpusHasIt} register/corpus disagreement(s)`
);
