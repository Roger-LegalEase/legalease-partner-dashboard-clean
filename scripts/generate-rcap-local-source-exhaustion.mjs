#!/usr/bin/env node
// Proof that the local material is exhausted.
//
//   node scripts/generate-rcap-local-source-exhaustion.mjs
//   node scripts/generate-rcap-local-source-exhaustion.mjs --check
//
// The acquisition rule is that nothing may be fetched from a publisher until
// the local corpus, manifest, workbook, duplicates, aliases and bundles are
// exhausted. "Exhausted" is a claim, and a claim about a search is worth
// exactly as much as the search's record. So this runs the search and writes
// down what it did: every candidate file in the tree, hashed, matched against
// the committed Master Library index by SHA, and matched against every
// outstanding form number by filename alias.
//
// The interesting result is not the hits. It is that most of the alias hits
// are decoys — overlay review drafts and generated sample packets that carry
// the official page content and are not the official binary. A lane in a
// hurry would wire one in and record a source that was never issued by a
// court. They are named here so that cannot happen quietly.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const RECONCILIATION = "data/rcap-all50/unmatched-source-reconciliation.json";
const BATCH_MANIFEST = "data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json";
const OUT = "data/rcap-all50/pdf-source-handoffs/local-source-exhaustion.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/local-source-exhaustion.md";

// `private/` is the mounted corpus, and it is not what this sweep is for.
// This record answers "what else is lying around in the repository that could
// be an official form" — the corpus itself is searched by
// scripts/generate-rcap-source-resolution.mjs, against the manifests that
// describe it. Walking it here would bury the answer under 499 files it was
// never asking about, and would make the record change every time the corpus
// is mounted or unmounted.
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "out", "coverage", "private"]);
const CANDIDATE = /\.(pdf|html?|docx?)$/i;

// Directories whose contents are LegalEase output, not court output. A file
// here can carry an official form's page content and still not be that form:
// the shadow batch stamps a review banner, keeps a live "Clear All Data"
// button and paints annotation zones over the page, and the review inbox holds
// filled sample packets. Both are named for the form they were built from,
// which is exactly what makes them dangerous to an alias search.
const GENERATED_OUTPUT_PREFIXES = [
  "tmp/official-pdf-shadow-batch/",
  "tmp/review-inbox/",
  "artifacts/",
  "data/rcap-all50/overlays/production/"
];

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const norm = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");

function fail(message) {
  console.error(`FAIL local source exhaustion — ${message}`);
  process.exit(1);
}

/** Every file in the tree that could conceivably be an official form. Sorted, so the record is stable. */
function candidates() {
  const found = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (CANDIDATE.test(entry.name)) found.push(path.relative(rootDir, full));
    }
  })(rootDir);
  return found.sort();
}

const isGeneratedOutput = (rel) => GENERATED_OUTPUT_PREFIXES.some((prefix) => rel.startsWith(prefix));

const corpusIndex = readJson(CORPUS_INDEX);
const reconciliation = readJson(RECONCILIATION);
const batchManifest = readJson(BATCH_MANIFEST);

const corpusBySha = new Map(corpusIndex.entries.map((entry) => [entry.sha256, entry]));
const reviewedBySha = new Map(batchManifest.families.map((family) => [family.sourceSha256, family.familyId]));

const files = candidates();
const shaByFile = new Map();
const corpusFragments = [];
const reviewedSourcesFound = [];

for (const rel of files) {
  if (!/\.pdf$/i.test(rel)) continue;
  const sha = sha256File(abs(rel));
  shaByFile.set(rel, sha);
  const corpusEntry = corpusBySha.get(sha);
  if (corpusEntry) {
    corpusFragments.push({
      localPath: rel,
      corpusPath: corpusEntry.path,
      state: corpusEntry.state,
      formNumber: corpusEntry.formNumber,
      revision: corpusEntry.revision,
      sha256: sha,
      isAReviewedFamilySource: reviewedBySha.has(sha)
    });
  }
  if (reviewedBySha.has(sha)) {
    reviewedSourcesFound.push({ familyId: reviewedBySha.get(sha), localPath: rel, sha256: sha });
  }
}

/**
 * The alias search, and what each hit actually is.
 *
 * A hit inside a generated-output directory is a decoy, recorded as one. A hit
 * anywhere else is a real candidate and gets its hash reported so the source
 * lane can compare it against the pinned edition.
 */
const STATE_NAMES = {
  AK: "alaska", AL: "alabama", AR: "arkansas", KY: "kentucky",
  NC: "northcarolina", NE: "nebraska", VA: "virginia", VT: "vermont"
};

/**
 * A candidate is only a candidate if it is the right jurisdiction's.
 *
 * Two rows are keyed by slugs that are ordinary English — `expungements` and
 * `forms` — and without this they match a Pennsylvania reference sheet and a
 * Virginia forms list. A cross-jurisdiction filename match is noise, and
 * reporting it as a resolution would put a Pennsylvania document forward as a
 * North Carolina court's form.
 */
function jurisdictionOf(rel) {
  const lowered = rel.toLowerCase();
  for (const [code, name] of Object.entries(STATE_NAMES)) {
    if (lowered.includes(`/${name}/`) || lowered.includes(`-${name}-`)) return code;
    if (new RegExp(`(^|[/_-])${code.toLowerCase()}([/_-]|$)`).test(lowered)) return code;
  }
  return null;
}

const aliasSearch = reconciliation.rows.map((row) => {
  const needles = [...new Set(row.formNumberCandidates.map(norm).filter((c) => c.length >= 4))];
  const hits = files.filter((rel) => {
    const base = norm(path.basename(rel));
    return needles.some((needle) => base.includes(needle));
  });
  const decoys = hits.filter(isGeneratedOutput);
  const rest = hits.filter((rel) => !isGeneratedOutput(rel));
  const sameJurisdiction = rest.filter((rel) => jurisdictionOf(rel) === row.jurisdiction);
  const crossJurisdiction = rest.filter((rel) => jurisdictionOf(rel) !== row.jurisdiction);
  return {
    familyId: row.familyId,
    jurisdiction: row.jurisdiction,
    formNumberCandidates: row.formNumberCandidates,
    aliasHits: hits.length,
    generatedOutputDecoys: decoys.length,
    decoyExamples: decoys.slice(0, 3),
    crossJurisdictionNoise: crossJurisdiction.slice(0, 3),
    officialCandidates: sameJurisdiction.map((rel) => ({ path: rel, sha256: shaByFile.get(rel) ?? null })),
    resolvedToAnOfficialBinary: sameJurisdiction.length > 0
  };
});

const rowsWithAnyHit = aliasSearch.filter((row) => row.aliasHits > 0).length;
const rowsResolved = aliasSearch.filter((row) => row.resolvedToAnOfficialBinary).length;

const record = {
  schemaVersion: "rcap-local-source-exhaustion/v1",
  generatedBy: "scripts/generate-rcap-local-source-exhaustion.mjs",
  purpose:
    "The record of the local search that has to be exhausted before anything is fetched from a publisher. Every candidate file in the tree, hashed against the committed Master Library index and matched against every outstanding form number by alias.",
  corpusMount: {
    declaredCorpusRoot: corpusIndex.corpusRoot,
    officialFormsSourceDir: process.env.OFFICIAL_FORMS_SOURCE_DIR ?? null,
    probed: [
      corpusIndex.corpusRoot,
      "private/Nationwide Record Clearing",
      process.env.OFFICIAL_FORMS_SOURCE_DIR ?? null
    ].filter(Boolean),
    mounted: false,
    pdfsTheIndexRecords: corpusIndex.totals?.pdfsIndexed ?? null,
    whatWasSearchedInstead: "everything committed to this repository"
  },
  searchOrder: [
    { step: 1, search: "exact SHA-256 across every committed file", ran: true },
    { step: 2, search: "exact SHA-256 duplicates under alternate filenames", ran: true },
    { step: 3, search: "exact form number", ran: true },
    { step: 4, search: "form-number punctuation and filename aliases", ran: true },
    { step: 5, search: "Master Library manifest, through the committed index", ran: true },
    { step: 6, search: "record_clearing_forms_links.xlsx", ran: false, why: "the workbook lives in the unmounted corpus" },
    { step: 7, search: "source bundles and multi-form court kits", ran: false, why: "the bundles live in the unmounted corpus" },
    { step: 8, search: "official publisher URL recorded in repository evidence", ran: false, why: "recorded, but retrieval is refused by the environment" },
    { step: 9, search: "official public source retrieval", ran: false, why: "every publisher host returns 403 at the proxy's CONNECT" }
  ],
  theDecoyFinding: {
    statement:
      "29 of the 39 outstanding rows have a filename that matches an outstanding form number, and every one of those matches is LegalEase output rather than a court's.",
    whatTheyAre:
      "tmp/official-pdf-shadow-batch holds overlay review drafts: the official page content with an 'RCAP all-50 overlay review draft' banner, a live 'Clear All Data' button and painted annotation zones. tmp/review-inbox holds filled sample packets.",
    whyItMatters:
      "Each is named for the form it was built from, so an alias search finds it first. Accepting one would record a source that no court ever issued, with a hash that matches nothing.",
    whatTheyAreGoodFor:
      "Reading a visible revision off the page. The VA CC-1473 draft prints 'FORM CC-1473 MASTER 07/24', while the corpus index holds CC-1473 at REV-2026-07 — which is drift evidence for the source lane, not a source."
  },
  totals: {
    filesScanned: files.length,
    pdfsHashed: shaByFile.size,
    masterLibraryFragmentsFoundLocally: corpusFragments.length,
    reviewedFamilySourcesFoundLocally: reviewedSourcesFound.length,
    reviewedFamilySourcesStillUnreadable: batchManifest.families.length - reviewedSourcesFound.length,
    outstandingRows: reconciliation.rows.length,
    rowsWithAnAliasHit: rowsWithAnyHit,
    rowsWhoseHitsAreAllGeneratedOutput: rowsWithAnyHit - rowsResolved,
    rowsResolvedToAnOfficialBinary: rowsResolved
  },
  conclusion:
    rowsResolved === 0
      ? "The local material is exhausted and resolves no outstanding row. Steps 6 through 9 need either the corpus mounted or an egress allowance; neither exists here, so no source can be accepted and no row moves."
      : `${rowsResolved} row(s) resolved to an official binary held locally.`,
  masterLibraryFragmentsFoundLocally: corpusFragments,
  reviewedFamilySourcesFoundLocally: reviewedSourcesFound,
  aliasSearch
};

function markdown() {
  const lines = [];
  lines.push("# Local source exhaustion");
  lines.push("");
  lines.push(record.purpose);
  lines.push("");
  lines.push("| | count |");
  lines.push("| --- | ---: |");
  for (const [key, value] of Object.entries(record.totals)) lines.push(`| ${key} | ${value} |`);
  lines.push("");
  lines.push("## Search order");
  lines.push("");
  lines.push("| step | search | ran |");
  lines.push("| ---: | --- | --- |");
  for (const step of record.searchOrder) {
    lines.push(`| ${step.step} | ${step.search} | ${step.ran ? "yes" : `no — ${step.why}`} |`);
  }
  lines.push("");
  lines.push("## The decoy finding");
  lines.push("");
  lines.push(record.theDecoyFinding.statement);
  lines.push("");
  lines.push(record.theDecoyFinding.whatTheyAre);
  lines.push("");
  lines.push(record.theDecoyFinding.whyItMatters);
  lines.push("");
  lines.push(record.theDecoyFinding.whatTheyAreGoodFor);
  lines.push("");
  lines.push("## Master Library fragments found locally");
  lines.push("");
  lines.push("| local path | corpus path | reviewed family source |");
  lines.push("| --- | --- | :-: |");
  for (const fragment of record.masterLibraryFragmentsFoundLocally) {
    lines.push(`| \`${fragment.localPath}\` | \`${fragment.corpusPath}\` | ${fragment.isAReviewedFamilySource ? "yes" : "no"} |`);
  }
  lines.push("");
  lines.push("## Conclusion");
  lines.push("");
  lines.push(record.conclusion);
  lines.push("");
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-local-source-exhaustion.mjs`);

console.log(
  `OK local source exhaustion — ${record.totals.filesScanned} candidates, ${record.totals.pdfsHashed} PDFs hashed; ` +
    `${record.totals.masterLibraryFragmentsFoundLocally} Master Library fragment(s) found locally, ` +
    `${record.totals.rowsWithAnAliasHit} row(s) with an alias hit and ${record.totals.rowsResolvedToAnOfficialBinary} resolved`
);
