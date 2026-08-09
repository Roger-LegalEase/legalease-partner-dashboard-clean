// Publish Master Library Edition 1.3.
//
// Edition 1.3 is a metadata-correction tranche. It adds no bytes, retires no
// asset and acquires nothing. Three corrections that Edition 1.2 could not carry
// are applied to the inherited corpus; every other row passes through unchanged.
//
// Edition 1.2 is opened read-only and copied. It is never edited: a changed
// archive is a different edition, not a correction. Everything happens in a
// temporary directory outside the repository, and the only binary output is the
// edition ZIP written alongside its parent — never into version control.
//
// Nothing here promotes a route. Every row, corrected or inherited, keeps
// generation_allowed = no and runtime_status = runtime_disabled.
//
// The admitted set is not chosen here. It is read from the generated successor
// plan, which admits a row only when every admission criterion is satisfied
// exactly, and this script refuses to publish if the two disagree — so the
// tranche cannot drift from the plan that authorized it.
//
// Usage:
//   node scripts/rcap-publish-master-library-edition-1-3.mjs [--out=<path>] [--force] [--dry-run]

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

import { parseCsv, sha256File } from "./lib/master-library.mjs";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

const EDITION = "1.3";
const PARENT_EDITION = "1.2";
const INPUT_DIR = path.join(root, "data/record-clearing/master-library/edition-1-3");
const SUCCESSOR_PLAN_PATH =
  "data/record-clearing/master-library/edition-successor-plan.json";

const spec = readJson(path.join(INPUT_DIR, "edition.json"));
const plan = readJson(path.join(root, SUCCESSOR_PLAN_PATH));

const CUTOFF = spec.cutoffDate;
const PUBLISHED_AT = spec.publicationDate;
const PARENT = args.parent ?? spec.parentArchivePath;
const OUT = args.out ?? spec.outputArchivePath;

if (!PARENT) fail("Missing --parent.");
if (!OUT) fail("Missing --out.");
if (fs.existsSync(OUT) && !args.force) {
  fail(
    `${OUT} already exists. A published edition is immutable; publish a new one rather than rebuilding it.`
  );
}

const isContainerMetadata = (name) =>
  name.includes("__MACOSX/") ||
  name.endsWith(".DS_Store") ||
  path.basename(name).startsWith("._");

let strippedContainerMetadata = 0;

// ---------------------------------------------------------------------------
// The tranche must be exactly what the plan admitted
// ---------------------------------------------------------------------------

const admittedByPlan = (plan.candidateTranche?.rows ?? [])
  .map((row) => row.jobId)
  .sort();
const admittedBySpec = spec.admittedRows.map((row) => row.jobId).sort();
if (JSON.stringify(admittedByPlan) !== JSON.stringify(admittedBySpec)) {
  fail(
    "the tranche specification and the generated successor plan do not admit the same rows.\n" +
      `  plan: ${admittedByPlan.join(", ") || "(none)"}\n` +
      `  spec: ${admittedBySpec.join(", ") || "(none)"}\n` +
      "The plan decides admission. Regenerate it, or correct the specification to match it."
  );
}
if (admittedBySpec.length === 0) fail("the tranche admits no rows; there is nothing to publish.");

const parentSha = sha256File(PARENT);
if (spec.parentArchiveSha256 && parentSha !== spec.parentArchiveSha256) {
  fail(
    `Parent archive hash is ${parentSha}; the Edition ${EDITION} specification pins ${spec.parentArchiveSha256}. A changed archive is a different edition.`
  );
}

console.log(`Publishing Edition ${EDITION} from Edition ${PARENT_EDITION}.`);
console.log(`  parent    ${parentSha}`);
console.log(`  admitted  ${admittedBySpec.length} row(s): ${admittedBySpec.join(", ")}`);
console.log(`  deferred  ${plan.totals?.deferred ?? "?"} candidate(s) carried forward`);

const work = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-edition-1-3-"));
process.on("exit", () => fs.rmSync(work, { recursive: true, force: true }));

const parentDir = path.join(work, "parent");
unzip(PARENT, parentDir);
const editionRoot = path.join(
  work,
  `Expungement_AI_RCAP_Master_Library_Edition_${EDITION.replace(".", "_")}`
);
copyTree(soleChild(parentDir), editionRoot);

const G = (name) => path.join(editionRoot, "00_GOVERNANCE", name);
const manifest = readJsonl(G("MASTER_ASSET_MANIFEST.jsonl"));
const manifestHeader = readHeader(G("MASTER_ASSET_MANIFEST.csv"));
const exclusions = parseCsv(fs.readFileSync(G("EXCLUDED_RETIRED_AND_REDUNDANT_SOURCES.csv"), "utf8"));
const exclusionHeader = readHeader(G("EXCLUDED_RETIRED_AND_REDUNDANT_SOURCES.csv"));

const inheritedAssets = manifest.length;
console.log(`  inherited ${inheritedAssets} canonical assets from Edition ${PARENT_EDITION}.`);

const applied = [];

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------
//
// Each is applied by locating the exact row it names and failing if that row is
// not there. A correction that silently matches nothing is the worst outcome
// available: the edition would publish, claim the correction, and change nothing.

for (const admitted of spec.admittedRows) {
  const c = admitted.corrections ?? {};

  if (admitted.jobId === "rcap-de-form-281e-edition-metadata-correction") {
    const row = manifest.find((entry) => entry.workflow_key === admitted.targetWorkflowKey);
    if (!row) fail(`Delaware correction found no row with workflow_key ${admitted.targetWorkflowKey}.`);
    if (row.document_role !== c.documentRole.from) {
      fail(
        `Delaware row carries document_role ${row.document_role}, not ${c.documentRole.from}. Refusing to correct a row that is not in the recorded state.`
      );
    }

    // The canonical path encodes the role, so correcting the role means moving
    // the file. Leaving it under a petition-shaped name would keep the defect
    // in the one place a human actually looks.
    const fromAbs = path.join(editionRoot, c.canonicalRelativePath.from);
    const toAbs = path.join(editionRoot, c.canonicalRelativePath.to);
    if (!fs.existsSync(fromAbs)) fail(`Delaware asset absent at ${c.canonicalRelativePath.from}.`);
    fs.mkdirSync(path.dirname(toAbs), { recursive: true });
    fs.renameSync(fromAbs, toAbs);

    row.document_role = c.documentRole.to;
    row.workflow_key = c.workflowKey.to;
    row.canonical_relative_path = c.canonicalRelativePath.to;
    row.source_filename = path.basename(c.canonicalRelativePath.to);
    row.issuer_index_title = c.issuerIndexTitle;
    row.eligibility_role = c.eligibilityRole.to;
    row.may_satisfy_primary_filing = c.maySatisfyPrimaryFiling;
    row.library_edition = EDITION;
    row.notes =
      "Charge extension sheet. Attaches to a petition and does not commence a proceeding. " +
      "It may not satisfy a primary_filing component: Delaware's Family Court petition is FORM-281, " +
      "which is a different document and is unmanifested. Edition 1.2 recorded this row as a PETITION.";
    applied.push({
      jobId: admitted.jobId,
      jurisdiction: "DE",
      rowsChanged: 1,
      fileRenamed: true
    });
    continue;
  }

  if (admitted.jobId === "rcap-ma-official-download-automation-blocked") {
    const rows = manifest.filter((entry) => entry.source_url === c.sourceUrl.from);
    if (rows.length === 0) fail("Massachusetts correction found no row carrying the recorded stale URL.");
    const expected = new Set(admitted.affectedWorkflowKeys ?? []);
    if (expected.size > 0) {
      const found = new Set(rows.map((entry) => entry.workflow_key));
      for (const key of expected) {
        if (!found.has(key)) fail(`Massachusetts correction expected to touch ${key} and did not find it.`);
      }
    }
    for (const row of rows) {
      row.source_url = c.sourceUrl.to;
      row.library_edition = EDITION;
    }
    applied.push({
      jobId: admitted.jobId,
      jurisdiction: "MA",
      rowsChanged: rows.length,
      fileRenamed: false
    });
    continue;
  }

  if (admitted.jobId === "rcap-fl-source-identity-resolution-rule-3-989-continuation") {
    // Nothing to edit: the identity names no document and never had a row. The
    // correction is the recorded negative, so a later pass cannot re-queue it
    // for acquisition as though it were merely unobtained.
    const entry = c.exclusionLogEntry;
    if (manifest.some((row) => row.document_id === admitted.identity)) {
      fail(
        `${admitted.identity} has a manifest row; this correction records a negative and must not be applied to a real asset.`
      );
    }
    if (exclusions.some((row) => row.source_filename === admitted.identity)) {
      fail(`${admitted.identity} is already recorded in the exclusion log.`);
    }
    const record = {};
    for (const column of exclusionHeader) record[column] = "";
    record.jurisdiction_code = "FL";
    record.state = "Florida";
    record.source_filename = admitted.identity;
    record.status = entry.status;
    record.reason = entry.reason;
    record.library_edition = EDITION;
    exclusions.push(record);
    applied.push({
      jobId: admitted.jobId,
      jurisdiction: "FL",
      rowsChanged: 0,
      exclusionRowsAdded: 1,
      fileRenamed: false
    });
    continue;
  }

  fail(`No correction handler for admitted row ${admitted.jobId}.`);
}

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

writeJsonl(G("MASTER_ASSET_MANIFEST.jsonl"), manifest);
writeCsv(G("MASTER_ASSET_MANIFEST.csv"), unionHeader(manifestHeader, manifest), manifest);
writeCsv(
  G("EXCLUDED_RETIRED_AND_REDUNDANT_SOURCES.csv"),
  unionHeader(exclusionHeader, exclusions),
  exclusions
);

const parentSummary = readJson(G("EDITION_SUMMARY.json"));
const summary = {
  ...parentSummary,
  edition: EDITION,
  parent_edition: PARENT_EDITION,
  parent_sha256: parentSha,
  published_at: PUBLISHED_AT,
  cutoff_date: CUTOFF,
  tranche_id: spec.trancheId,
  tranche_manifest_sha256: plan.trancheManifestSha256 ?? null,
  edition_kind: "metadata_correction_tranche",
  inherited_assets: inheritedAssets,
  added_assets_by_class: {},
  added_non_review_assets: 0,
  added_acquired_sources: 0,
  retained_assets: manifest.length,
  metadata_corrections_applied: applied.length,
  metadata_corrections: applied,
  deferred_candidates: plan.totals?.deferred ?? null,
  grandparent_container_note: spec.grandparentNote,
  runtime_status: "runtime_disabled",
  generation_allowed_on_added_assets: "no"
};
fs.writeFileSync(G("EDITION_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`);

// Checksums last: every other file must already be in its final state.
const checksumPath = G("CHECKSUMS.sha256");
fs.rmSync(checksumPath, { force: true });
const checksumLines = listFiles(editionRoot)
  .filter((rel) => rel !== "00_GOVERNANCE/CHECKSUMS.sha256")
  .map((rel) => `${sha256File(path.join(editionRoot, rel))}  ${rel}`);
fs.writeFileSync(checksumPath, `${checksumLines.join("\n")}\n`);

console.log(`  corrections applied: ${applied.length}`);
for (const entry of applied) {
  console.log(
    `    ${entry.jurisdiction} ${entry.jobId}: ${entry.rowsChanged} manifest row(s)` +
      `${entry.exclusionRowsAdded ? `, ${entry.exclusionRowsAdded} exclusion row(s)` : ""}` +
      `${entry.fileRenamed ? ", asset renamed" : ""}`
  );
}
console.log(`  checksums: ${checksumLines.length}`);

if (args["dry-run"]) {
  console.log("Dry run: no archive written.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

const zip = spawnSync(
  "zip",
  ["-q", "-r", "-X", OUT, path.basename(editionRoot)],
  { cwd: work, encoding: "utf8" }
);
if (zip.status !== 0) fail(`Could not write ${OUT}: ${zip.stderr}`);

const outSha = sha256File(OUT);
const outBytes = fs.statSync(OUT).size;
console.log(`Edition ${EDITION} published.`);
console.log(`  archive ${OUT}`);
console.log(`  sha256  ${outSha}`);
console.log(`  bytes   ${outBytes}`);
console.log(`  files   ${checksumLines.length + 1}`);
console.log(`  stripped container metadata entries: ${strippedContainerMetadata}`);
console.log(
  "  runtime_disabled; generation_allowed = no on every row; no packet, route or gate changed."
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unionHeader(header, rows) {
  const columns = [...header];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonl(file) {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function writeJsonl(file, rows) {
  fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function readHeader(file) {
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "").split("\n")[0].trim().split(",");
}

function writeCsv(file, header, rows) {
  const escape = (value) => {
    const text = value === undefined || value === null ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const body = rows.map((row) => header.map((column) => escape(row[column])).join(","));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `﻿${header.join(",")}\n${body.join("\n")}\n`);
}

function listFiles(dir) {
  const out = [];
  const walk = (current, prefix) => {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const next = path.join(current, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(next, rel);
      else out.push(rel);
    }
  };
  walk(dir, "");
  return out.sort();
}

function copyTree(from, to) {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => !isContainerMetadata(src.replace(from, ""))
  });
}

function unzip(archive, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const result = spawnSync("unzip", ["-q", "-o", archive, "-d", dest], { encoding: "utf8" });
  if (result.status !== 0) fail(`Could not extract ${archive}: ${result.stderr}`);
  for (const rel of listFiles(dest)) {
    if (!isContainerMetadata(rel)) continue;
    fs.rmSync(path.join(dest, rel), { force: true });
    strippedContainerMetadata += 1;
  }
}

function soleChild(dir) {
  const entries = fs.readdirSync(dir).filter((name) => name !== "__MACOSX");
  if (entries.length !== 1) fail(`Expected one top-level directory in ${dir}, found ${entries.length}.`);
  return path.join(dir, entries[0]);
}

function parseArgs(argv) {
  const out = {};
  for (const entry of argv) {
    const match = entry.match(/^--([^=]+)(?:=(.*))?$/u);
    if (match) out[match[1]] = match[2] ?? true;
  }
  return out;
}

function fail(message) {
  console.error(`Edition ${EDITION} publication failed: ${message}`);
  process.exit(1);
}
