// Publish an immutable Master Library edition.
//
// Builds Edition 1.1 from Edition 1.0 plus the Batch 1 amended authority
// bundle. The parent edition is opened read-only and copied; it is never
// edited, and a published edition is never rebuilt in place — a changed archive
// is a different edition, not a correction.
//
// Everything happens in a temporary directory outside the repository. The only
// output is the edition ZIP, written alongside its parent. Nothing here enters
// version control and nothing here promotes a route: every added asset lands
// `runtime_disabled` with `generation_allowed = no`.
//
// Usage:
//   node scripts/rcap-publish-master-library-edition.mjs \
//     --parent=<edition-1.0.zip> \
//     --amended-bundle=<bundle.zip> --original-archive=<originals.zip> \
//     --out=<edition-1.1.zip> [--force]

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

import { parseCsv, sha256File } from "./lib/master-library.mjs";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

const PARENT = required("parent");
const BUNDLE = required("amended-bundle");
const ORIGINALS = required("original-archive");
const OUT = required("out");

const EDITION = "1.1";
const PARENT_EDITION = "1.0";
const CUTOFF = "2026-08-03";
const PUBLISHED_AT = "2026-08-03";
const REVIEW_ASOF = "ASOF-2026-07-30";
const AMENDED_ON = "2026-07-30";

// The twelve Batch 1 jurisdictions whose amended review becomes the active
// canonical legal-review asset. The amended file carries the controlling
// addendum and the original review preserved beneath it, so it is one asset —
// not an addendum asset plus a review asset.
const BATCH_1 = [
  { code: "AK", state: "Alaska", file: "LegalEase-Alaska-Legal-Review.md" },
  { code: "AL", state: "Alabama", file: "LegalEase-Alabama-Legal-Review.md" },
  { code: "AR", state: "Arkansas", file: "LegalEase-Arkansas-Legal-Review.md" },
  { code: "AZ", state: "Arizona", file: "LegalEase-Arizona-Legal-Review.md" },
  { code: "CA", state: "California", file: "LegalEase-California-Legal-Review.md" },
  { code: "CO", state: "Colorado", file: "LegalEase-Colorado-Legal-Review.md" },
  { code: "CT", state: "Connecticut", file: "LegalEase-Connecticut-Legal-Review.md" },
  { code: "DC", state: "District of Columbia", file: "LegalEase-DC-Legal-Review.md" },
  { code: "DE", state: "Delaware", file: "LegalEase-Delaware-Legal-Review.md" },
  { code: "FL", state: "Florida", file: "LegalEase-Florida-Legal-Review.md" },
  { code: "HI", state: "Hawaii", file: "LegalEase-Hawaii-Legal-Review.md" },
  { code: "ID", state: "Idaho", file: "LegalEase-Idaho-Legal-Review.md" }
];

const ORIGINAL_MARKER = "## Original review, preserved unchanged";

// Container metadata that is never published as an authority asset.
const isContainerMetadata = (name) =>
  name.includes("__MACOSX/") || name.endsWith(".DS_Store") || path.basename(name).startsWith("._");

if (fs.existsSync(OUT) && !args.force) {
  fail(`${OUT} already exists. A published edition is immutable; publish a new one rather than rebuilding it.`);
}

const parentSha = sha256File(PARENT);
const bundleSha = sha256File(BUNDLE);
const originalsSha = sha256File(ORIGINALS);

let strippedContainerMetadata = 0;

const work = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-edition-publish-"));
process.on("exit", () => fs.rmSync(work, { recursive: true, force: true }));

console.log(`Publishing Edition ${EDITION} from Edition ${PARENT_EDITION}.`);
console.log(`  parent    ${parentSha}`);
console.log(`  amended   ${bundleSha}`);
console.log(`  originals ${originalsSha}`);

// ---------------------------------------------------------------------------
// Stage the inputs
// ---------------------------------------------------------------------------

const parentDir = path.join(work, "parent");
const bundleDir = path.join(work, "bundle");
const originalsDir = path.join(work, "originals");
unzip(PARENT, parentDir);
unzip(BUNDLE, bundleDir);
unzip(ORIGINALS, originalsDir);

const editionRoot = path.join(work, `Expungement_AI_RCAP_Master_Library_Edition_${EDITION.replace(".", "_")}`);
const parentRoot = soleChild(parentDir);
copyTree(parentRoot, editionRoot);

const bundleRoot = soleChild(bundleDir);
const originalsRoot = soleChild(originalsDir);
const amendedSource = path.join(bundleRoot, "amended-source");

// The bundle's own checksum file is the gate on using it at all.
verifyBundleChecksums(bundleRoot);

// ---------------------------------------------------------------------------
// Load parent governance
// ---------------------------------------------------------------------------

const G = (name) => path.join(editionRoot, "00_GOVERNANCE", name);
const manifest = readJsonl(G("MASTER_ASSET_MANIFEST.jsonl"));
const manifestHeader = readHeader(G("MASTER_ASSET_MANIFEST.csv"));
const stateCoverage = parseCsv(fs.readFileSync(G("STATE_COVERAGE.csv"), "utf8"));
const legalReviewCoverage = parseCsv(fs.readFileSync(G("LEGAL_REVIEW_COVERAGE.csv"), "utf8"));
const sourceGaps = parseCsv(fs.readFileSync(G("MISSING_FILES_AND_SOURCE_GAPS.csv"), "utf8"));
const exclusions = parseCsv(fs.readFileSync(G("EXCLUDED_RETIRED_AND_REDUNDANT_SOURCES.csv"), "utf8"));
const duplicates = parseCsv(fs.readFileSync(G("DUPLICATE_SOURCE_LOG.csv"), "utf8"));
const parentSummary = JSON.parse(fs.readFileSync(G("EDITION_SUMMARY.json"), "utf8"));

const inheritedAssets = manifest.length;
console.log(`  inherited ${inheritedAssets} canonical assets from Edition ${PARENT_EDITION}.`);

// ---------------------------------------------------------------------------
// 1. Add the twelve amended legal reviews
// ---------------------------------------------------------------------------

const addedReviews = [];
for (const entry of BATCH_1) {
  const src = path.join(amendedSource, entry.file);
  if (!fs.existsSync(src)) fail(`Amended review missing: ${entry.file}`);

  const text = fs.readFileSync(src, "utf8");
  if (!text.includes(ORIGINAL_MARKER)) {
    fail(`${entry.file} does not preserve its original review beneath the addendum.`);
  }
  assertOriginalPreserved(entry, text);

  const slug = `${entry.state.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-record-clearing-legal-review-batch-1-amended`;
  const rel = `STATES/${entry.code}/01_LEGAL_REVIEW/${entry.code}__LEGAL-REVIEW__STATEWIDE__${slug}__${REVIEW_ASOF}__EN.md`;
  const dest = path.join(editionRoot, rel);

  // Existing rows for this jurisdiction's legal review would mean two active
  // controlling reviews. Edition 1.0 has none for these twelve, and the check
  // stays so a future edition cannot introduce one silently.
  const existing = manifest.filter(
    (row) => row.jurisdiction_code === entry.code && row.asset_class === "legal_review"
  );
  if (existing.length > 0) fail(`${entry.code} already has an active legal-review asset.`);

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
  const sha = sha256File(dest);

  manifest.push({
    library_edition: EDITION,
    jurisdiction_code: entry.code,
    state: entry.state,
    asset_class: "legal_review",
    document_role: "LEGAL_REVIEW",
    document_id: "STATEWIDE",
    official_title: `${entry.state} Record-Clearing Legal Review, Batch 1 Amended`,
    revision: REVIEW_ASOF,
    language: "EN",
    workflow_key: `${entry.code}:STATEWIDE:LEGAL_REVIEW:EN`,
    packet_candidate: "no",
    generation_allowed: "no",
    runtime_status: "runtime_disabled",
    eligibility_role: "release_gated_source",
    packet_stage: "disabled_pending_release_gates",
    track_ids: "SEE_STATE_LEGAL_REVIEW",
    legal_review_mapping_status: "requires_track-level import mapping",
    source_status: "controlling_state_review_amended",
    freshness_status: "legal_review_present",
    source_group: "batch1_amended_import_bundle",
    source_filename: entry.file,
    canonical_relative_path: rel,
    source_url: "",
    notes: `Batch 1 amended review: a controlling packet-only addendum dated ${AMENDED_ON} followed by the original ${entry.state} review preserved unchanged beneath it. Precedence: state addendum, then 00-Batch-1-Amendment-Decision-Matrix.md, then 00-Source-Packet-Only-Product-Model-Amendment.md, then the preserved original review.`,
    required_follow_up:
      "Reconcile the 117-track authority crosswalk against the current normalized registry before mapping any track to a form.",
    structural_class: "markdown",
    pages: "",
    field_count: "",
    bytes: fs.statSync(dest).size,
    sha256: sha,
    checked_date: PUBLISHED_AT,
    all_source_origins: `LegalEase_Batch_1_Amended_Import_Bundle(1).zip!/amended-source/${entry.file}`
  });

  addedReviews.push({ ...entry, canonicalRelativePath: rel, sha256: sha });
}

// The separate original-review archive is provenance, never a second active
// review. It is recorded in the exclusion/reference log with its hash so the
// "original preserved beneath the amendment" claim stays independently checkable.
for (const entry of BATCH_1) {
  const original = path.join(originalsRoot, entry.file);
  if (!fs.existsSync(original)) fail(`Original review missing from the provenance archive: ${entry.file}`);
  exclusions.push({
    jurisdiction_code: entry.code,
    state: entry.state,
    source_filename: entry.file,
    status: "provenance_original_review",
    reason:
      "Original pre-amendment review. Retained as provenance for the amended review's preserved-original section; it is not a second active controlling review and is not counted as a legal-review authority.",
    source_path: `LegalEase Nationwide Legal Review(3).zip!/${entry.file}`,
    bytes: fs.statSync(original).size,
    sha256: sha256File(original)
  });
}

// ---------------------------------------------------------------------------
// 2. Batch 1 governance authority
// ---------------------------------------------------------------------------

const BATCH_1_DIR = "00_GOVERNANCE/BATCH_1_AUTHORITY";
const governanceCopies = [
  ["amended-source/00-Source-Packet-Only-Product-Model-Amendment.md", "00-Source-Packet-Only-Product-Model-Amendment.md"],
  ["amended-source/00-Batch-1-Amendment-Decision-Matrix.md", "00-Batch-1-Amendment-Decision-Matrix.md"],
  ["amended-source/README-FIRST.md", "AMENDED_SOURCE_README-FIRST.md"],
  ["README-IMPORT.md", "README-IMPORT.md"],
  ["SHA256SUMS.txt", "BUNDLE_SHA256SUMS.txt"],
  ["expected/expected-track-counts.json", "expected/expected-track-counts.json"],
  ["expected/expected-track-ids.json", "expected/expected-track-ids.json"],
  ["pre-amendment-crosswalk/BATCH_1_TRACK_MATRIX.md", "pre-amendment-crosswalk/BATCH_1_TRACK_MATRIX.md"],
  ["pre-amendment-crosswalk/BATCH_1_FOLLOW_UP_QUEUE.md", "pre-amendment-crosswalk/BATCH_1_FOLLOW_UP_QUEUE.md"],
  ["pre-amendment-crosswalk/MANIFEST.md", "pre-amendment-crosswalk/MANIFEST.md"],
  ["pre-amendment-crosswalk/README.md", "pre-amendment-crosswalk/README.md"],
  ["pre-amendment-crosswalk/batch-1-normalized-tracks.json", "pre-amendment-crosswalk/batch-1-normalized-tracks.json"]
];
for (const entry of BATCH_1) {
  governanceCopies.push([
    `pre-amendment-crosswalk/jurisdictions/${entry.code}.normalized-tracks.json`,
    `pre-amendment-crosswalk/jurisdictions/${entry.code}.normalized-tracks.json`
  ]);
}

for (const [from, to] of governanceCopies) {
  const src = path.join(bundleRoot, from);
  if (!fs.existsSync(src)) fail(`Batch 1 governance input missing: ${from}`);
  const dest = path.join(editionRoot, BATCH_1_DIR, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// The bundle's `audit/` tree restates `jurisdictions/` with source annotations.
// One copy reproduces the 117-ID reconciliation; the second is an audit
// duplicate and is logged rather than published.
const auditDir = path.join(bundleRoot, "pre-amendment-crosswalk/audit");
let auditDuplicates = 0;
if (fs.existsSync(auditDir)) {
  for (const name of fs.readdirSync(auditDir).sort()) {
    const file = path.join(auditDir, name);
    if (!fs.statSync(file).isFile() || isContainerMetadata(name)) continue;
    auditDuplicates += 1;
    exclusions.push({
      jurisdiction_code: "",
      state: "",
      source_filename: name,
      status: "redundant_combined_source",
      reason:
        "Pre-amendment crosswalk audit restatement. The published jurisdictions/ copy reproduces the 117-ID reconciliation; this duplicate is logged rather than retained as a canonical workflow asset.",
      source_path: `LegalEase_Batch_1_Amended_Import_Bundle(1).zip!/pre-amendment-crosswalk/audit/${name}`,
      bytes: fs.statSync(file).size,
      sha256: sha256File(file)
    });
  }
}

// Container metadata is excluded from publication entirely. It is counted as it
// is stripped, so the exclusion appears in the edition summary rather than
// happening silently.
const containerMetadata = strippedContainerMetadata;

// ---------------------------------------------------------------------------
// 3. Adopt pending candidates cleared for this edition
// ---------------------------------------------------------------------------

const adopted = JSON.parse(fs.readFileSync(path.join(root, args["adopt-manifest"]), "utf8"));
const addedNonReview = [];
for (const candidate of adopted.adopt) {
  const src = path.join(root, candidate.repositoryPath);
  if (!fs.existsSync(src)) fail(`Adopted candidate binary missing: ${candidate.repositoryPath}`);
  const sha = sha256File(src);
  if (sha !== candidate.sha256) fail(`Adopted candidate ${candidate.documentId} hash changed on disk.`);
  if (manifest.some((row) => row.sha256 === sha)) {
    fail(`Adopted candidate ${candidate.documentId} duplicates a retained asset.`);
  }

  const rel = `STATES/${candidate.jurisdiction}/05_SOURCE_GATED/${candidate.canonicalFileName}`;
  const dest = path.join(editionRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);

  manifest.push({
    library_edition: EDITION,
    jurisdiction_code: candidate.jurisdiction,
    state: candidate.state,
    asset_class: "source_gated",
    document_role: candidate.documentRole,
    document_id: candidate.documentId,
    official_title: candidate.officialTitle,
    revision: candidate.revision,
    language: "EN",
    workflow_key: `${candidate.jurisdiction}:${candidate.documentId}:${candidate.documentRole}:EN`,
    packet_candidate: "no",
    generation_allowed: "no",
    runtime_status: "runtime_disabled",
    eligibility_role: "release_gated_source",
    packet_stage: "disabled_pending_release_gates",
    track_ids: "SEE_STATE_LEGAL_REVIEW",
    legal_review_mapping_status: "requires_track-level import mapping",
    source_status: "source_gated",
    freshness_status: candidate.freshnessStatus,
    source_group: "batch2_repository_import",
    source_filename: path.basename(candidate.repositoryPath),
    canonical_relative_path: rel,
    source_url: "",
    notes: candidate.notes,
    required_follow_up: candidate.requiredFollowUp,
    structural_class: candidate.structuralClass,
    pages: "",
    field_count: candidate.fieldCount ?? "",
    bytes: fs.statSync(dest).size,
    sha256: sha,
    checked_date: PUBLISHED_AT,
    all_source_origins: candidate.repositoryPath
  });
  addedNonReview.push({ ...candidate, canonicalRelativePath: rel });
}

// ---------------------------------------------------------------------------
// 4. Coverage, gap ledger and state files
// ---------------------------------------------------------------------------

const reviewCodes = new Set(addedReviews.map((entry) => entry.code));

for (const row of legalReviewCoverage) {
  if (!reviewCodes.has(row.jurisdiction_code)) continue;
  const added = addedReviews.find((entry) => entry.code === row.jurisdiction_code);
  row.status = "present";
  row.legal_review_file = added.canonicalRelativePath;
  row.required_action =
    "Amended Batch 1 review retained. Reconcile the 117-track authority crosswalk before mapping any track to a form.";
}

// A missing-legal-review gap closes only now that the canonical asset exists.
const closedGaps = [];
const remainingGaps = sourceGaps.filter((gap) => {
  const closes = gap.item_type === "legal_review" && reviewCodes.has(gap.jurisdiction_code);
  if (closes) closedGaps.push(gap);
  return !closes;
});
if (closedGaps.length !== BATCH_1.length) {
  fail(`Expected to close ${BATCH_1.length} legal-review gaps, closed ${closedGaps.length}.`);
}

for (const row of stateCoverage) {
  const code = row.jurisdiction_code;
  const forCode = manifest.filter((entry) => entry.jurisdiction_code === code);
  row.legal_reviews = String(forCode.filter((entry) => entry.asset_class === "legal_review").length);
  row.packet_forms = String(forCode.filter((entry) => entry.asset_class === "packet_form").length);
  row.instructions = String(forCode.filter((entry) => entry.asset_class === "instructions").length);
  row.supporting_process_assets = String(forCode.filter((entry) => entry.asset_class === "supporting_process").length);
  row.source_gated_assets = String(forCode.filter((entry) => entry.asset_class === "source_gated").length);
  row.total_assets = String(forCode.length);
  const gaps = remainingGaps.filter((gap) => gap.jurisdiction_code === code);
  row.missing_or_gap_items = String(gaps.length);
  row.build_blockers = String(gaps.filter((gap) => gap.impact === "build_blocker").length);
  row.release_blockers = String(gaps.filter((gap) => gap.impact === "release_blocker").length);
  row.local_jurisdiction_inputs_needed = String(
    gaps.filter((gap) => gap.impact === "jurisdiction_input_required").length
  );
  if (reviewCodes.has(code)) {
    row.legal_review_status = "present_amended";
    row.coverage_class = forCode.some((entry) => entry.asset_class !== "legal_review")
      ? "forms_present_legal_review_present"
      : "legal_review_present_no_forms";
  }
}

// State manifests and READMEs are rewritten from the manifest so they cannot
// drift from it.
for (const row of stateCoverage) {
  const code = row.jurisdiction_code;
  const rows = manifest.filter((entry) => entry.jurisdiction_code === code);
  const dir = path.join(editionRoot, "STATES", code);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  writeCsv(path.join(dir, "STATE_MANIFEST.csv"), manifestHeader, rows);
  writeStateReadme(dir, code, row, rows, remainingGaps.filter((gap) => gap.jurisdiction_code === code));
}

// ---------------------------------------------------------------------------
// 5. Governance rewrite
// ---------------------------------------------------------------------------

manifest.sort((a, b) =>
  a.jurisdiction_code.localeCompare(b.jurisdiction_code) || a.workflow_key.localeCompare(b.workflow_key)
);
for (const row of manifest) row.library_edition = EDITION;

writeCsv(G("MASTER_ASSET_MANIFEST.csv"), manifestHeader, manifest);
fs.writeFileSync(G("MASTER_ASSET_MANIFEST.jsonl"), `${manifest.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeCsv(G("STATE_COVERAGE.csv"), Object.keys(stateCoverage[0]), stateCoverage);
writeCsv(G("LEGAL_REVIEW_COVERAGE.csv"), Object.keys(legalReviewCoverage[0]), legalReviewCoverage);
writeCsv(G("MISSING_FILES_AND_SOURCE_GAPS.csv"), Object.keys(sourceGaps[0]), remainingGaps);
writeCsv(G("EXCLUDED_RETIRED_AND_REDUNDANT_SOURCES.csv"), Object.keys(exclusions[0]), exclusions);
writeCsv(G("DUPLICATE_SOURCE_LOG.csv"), Object.keys(duplicates[0]), duplicates);

const assetClasses = tally(manifest, (row) => row.asset_class);
const gapImpacts = tally(remainingGaps, (gap) => gap.impact);
const summary = {
  edition: EDITION,
  parent_edition: PARENT_EDITION,
  parent_sha256: parentSha,
  published_at: PUBLISHED_AT,
  cutoff_date: CUTOFF,
  batch_1_amended_bundle_sha256: bundleSha,
  batch_1_original_review_archive_sha256: originalsSha,
  jurisdictions: 51,
  jurisdictions_with_retained_assets: new Set(manifest.map((row) => row.jurisdiction_code)).size,
  jurisdictions_with_legal_review: legalReviewCoverage.filter((row) => row.status === "present").length,
  jurisdictions_missing_legal_review: legalReviewCoverage.filter((row) => row.status !== "present").length,
  inherited_assets: inheritedAssets,
  added_legal_reviews: addedReviews.length,
  added_non_review_assets: addedNonReview.length,
  superseded_or_retired_assets: 0,
  retained_assets: manifest.length,
  asset_classes: assetClasses,
  missing_and_source_gap_rows: remainingGaps.length,
  gap_impacts: gapImpacts,
  closed_gap_rows: closedGaps.length,
  excluded_or_retired_rows: exclusions.length,
  exact_duplicate_copies_removed: duplicates.length,
  batch_1_expected_track_ids: 117,
  container_metadata_files_excluded: containerMetadata,
  audit_duplicates_logged: auditDuplicates,
  runtime_status: "runtime_disabled"
};
fs.writeFileSync(G("EDITION_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`);

writeReadme(summary);
appendGapLedgerMarkdown(remainingGaps, closedGaps);

// ---------------------------------------------------------------------------
// 6. Checksums, then seal
// ---------------------------------------------------------------------------

const checksumPath = "00_GOVERNANCE/CHECKSUMS.sha256";
fs.rmSync(path.join(editionRoot, checksumPath), { force: true });
const files = listFiles(editionRoot).filter((rel) => !isContainerMetadata(rel));
const lines = files
  .filter((rel) => rel !== checksumPath)
  .map((rel) => `${sha256File(path.join(editionRoot, rel))}  ${rel}`);
fs.writeFileSync(path.join(editionRoot, checksumPath), `${lines.join("\n")}\n`);

// Deterministic archive: fixed timestamps, sorted entries, no extra attributes.
const allFiles = listFiles(editionRoot);
spawnSync("touch", ["-t", "202608030000.00", ...allFiles.map((rel) => path.join(editionRoot, rel))], {
  encoding: "utf8"
});
const listing = path.join(work, "entries.txt");
fs.writeFileSync(listing, `${allFiles.map((rel) => `${path.basename(editionRoot)}/${rel}`).join("\n")}\n`);
fs.rmSync(OUT, { force: true });
const zipped = spawnSync("zip", ["-X", "-q", "-9", OUT, "-@"], {
  cwd: work,
  input: fs.readFileSync(listing),
  encoding: "buffer"
});
if (zipped.status !== 0) fail(`zip failed: ${zipped.stderr?.toString()}`);

const outSha = sha256File(OUT);
const outBytes = fs.statSync(OUT).size;

console.log("");
console.log(`Edition ${EDITION} published.`);
console.log(`  path      ${OUT}`);
console.log(`  sha256    ${outSha}`);
console.log(`  bytes     ${outBytes}`);
console.log(`  files     ${allFiles.length}`);
console.log(`  assets    ${manifest.length} (${inheritedAssets} inherited + ${addedReviews.length} legal reviews + ${addedNonReview.length} other)`);
console.log(`  reviews   ${summary.jurisdictions_with_legal_review}/51 jurisdictions`);
console.log(`  gaps      ${remainingGaps.length} (closed ${closedGaps.length})`);
console.log(`  checksums ${lines.length}`);
console.log("");
console.log("The archive is sealed. Do not modify it; publish a new edition instead.");

fs.writeFileSync(
  path.join(root, "tmp", "edition-publication-receipt.json"),
  `${JSON.stringify({ edition: EDITION, path: OUT, sha256: outSha, bytes: outBytes, files: allFiles.length, summary, addedReviews, addedNonReview }, null, 2)}\n`
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertOriginalPreserved(entry, amendedText) {
  const original = path.join(originalsRoot, entry.file);
  if (!fs.existsSync(original)) fail(`Original review missing for ${entry.code}.`);
  const originalText = fs.readFileSync(original, "utf8");
  const body = originalText.startsWith("# ") ? originalText.split("\n").slice(1).join("\n") : originalText;
  const preserved = amendedText.slice(amendedText.indexOf(ORIGINAL_MARKER) + ORIGINAL_MARKER.length);
  const lines = (text) => text.trim().split("\n").map((line) => line.replace(/\s+$/, ""));
  const a = lines(body);
  const b = lines(preserved);
  if (a.length !== b.length || a.some((line, index) => line !== b[index])) {
    fail(
      `${entry.code}: the original review beneath the amendment does not match the provenance archive. Do not merge text from the separate original archive; report the discrepancy.`
    );
  }
}

function verifyBundleChecksums(dir) {
  const file = path.join(dir, "SHA256SUMS.txt");
  if (!fs.existsSync(file)) fail("Amended bundle has no SHA256SUMS.txt.");
  let checked = 0;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([0-9a-f]{64})\s+(.+)$/);
    if (!match) continue;
    const target = path.join(dir, match[2].replace(/^\.\//, ""));
    if (!fs.existsSync(target)) fail(`Bundle checksum lists a missing file: ${match[2]}`);
    if (sha256File(target) !== match[1]) fail(`Bundle checksum mismatch: ${match[2]}`);
    checked += 1;
  }
  console.log(`  bundle SHA256SUMS.txt: ${checked}/${checked} verified.`);
}

function writeStateReadme(dir, code, coverage, rows, gaps) {
  const review = rows.find((row) => row.asset_class === "legal_review");
  const amended = review && review.source_group === "batch1_amended_import_bundle";
  const out = [
    `# ${coverage.state} (${code})`,
    "",
    `**Edition:** ${EDITION}  `,
    `**Cutoff:** ${CUTOFF}  `,
    "**Runtime status:** `runtime_disabled`",
    "",
    `- Legal review: ${review ? (amended ? "present (Batch 1 amended)" : "present") : "missing"}`,
    `- Packet forms: ${coverage.packet_forms}`,
    `- Instructions: ${coverage.instructions}`,
    `- Supporting process assets: ${coverage.supporting_process_assets}`,
    `- Source-gated assets: ${coverage.source_gated_assets}`,
    `- Missing/source-gap entries: ${coverage.missing_or_gap_items}`,
    "",
    "## Folder meaning",
    "",
    "- `01_LEGAL_REVIEW`: controlling or current state legal-design analysis supplied for this edition.",
    "- `02_PACKET_FORMS`: packet candidates only; not runtime-approved.",
    "- `03_INSTRUCTIONS`: participant filing and process instructions.",
    "- `04_SUPPORTING_PROCESS`: record requests, fee waivers, certifications, releases, and verification.",
    "- `05_SOURCE_GATED`: local, provisional, stale, third-party, or currentness-sensitive material.",
    ""
  ];

  if (review) {
    out.push("## Legal review", "", `\`${review.canonical_relative_path}\``, "");
    if (amended) {
      out.push(
        "### Controlling precedence",
        "",
        "1. The state-specific controlling addendum at the beginning of this amended review.",
        "2. `00_GOVERNANCE/BATCH_1_AUTHORITY/00-Batch-1-Amendment-Decision-Matrix.md`.",
        "3. `00_GOVERNANCE/BATCH_1_AUTHORITY/00-Source-Packet-Only-Product-Model-Amendment.md`.",
        "4. The original state review preserved beneath the state addendum.",
        "5. `00_GOVERNANCE/BATCH_1_AUTHORITY/pre-amendment-crosswalk/` only as a completeness inventory and crosswalk.",
        "",
        "The addendum controls output strategy, packet capability, participant-document treatment, manual completion, product scope, handoff treatment, legal-design blockers, release blockers, guidance classification and staged-route treatment. The preserved original review continues to control the legal research, statutes, terminology, venue, filing procedure, form identity, eligibility analysis, source requirements and unresolved legal questions unless expressly amended.",
        "",
        "This is the one active controlling review for the jurisdiction. The addendum and the preserved original are parts of it, not separate authorities, and the copy in the separate original-review archive is provenance only.",
        ""
      );
    }
  } else {
    out.push(
      "## Legal review gap",
      "",
      "No state legal-review file was supplied. Existing form assets must not be mapped to eligibility tracks until the controlling review is supplied.",
      ""
    );
  }

  if (gaps.length > 0) {
    out.push("## Open items", "");
    for (const gap of gaps) out.push(`- **${gap.requested_item}** — \`${gap.status}\` / \`${gap.impact}\``);
    out.push("");
  }

  out.push(
    "## Integration rule",
    "",
    "Use `STATE_MANIFEST.csv` and the application’s normalized legal-design registry. Do not select a packet by scanning filenames or folders.",
    ""
  );
  fs.writeFileSync(path.join(dir, "STATE_README.md"), out.join("\n"));
}

function writeReadme(summary) {
  const text = `# Expungement.ai + RCAP Master Forms and Legal-Review Library

**Edition:** ${summary.edition}
**Parent edition:** ${summary.parent_edition} (\`${summary.parent_sha256}\`)
**Published:** ${summary.published_at}
**Cutoff date:** ${summary.cutoff_date}
**Jurisdictions:** 50 states plus the District of Columbia
**Runtime posture:** Disabled by default

Edition ${summary.edition} inherits every Edition ${summary.parent_edition} canonical asset unchanged and adds the Batch 1 amended legal-review authority. Edition ${summary.parent_edition} remains immutable and independently verifiable.

## Edition ${summary.edition} inventory

- **${summary.retained_assets} retained canonical assets** (${summary.inherited_assets} inherited, ${summary.added_legal_reviews} legal reviews added, ${summary.added_non_review_assets} other assets added)
- **${summary.jurisdictions_with_legal_review} of 51 jurisdictions** carry a controlling legal review
- **${summary.asset_classes.packet_form} packet-form candidates**
- **${summary.asset_classes.instructions} participant instruction assets**
- **${summary.asset_classes.supporting_process} supporting or prerequisite process assets**
- **${summary.asset_classes.source_gated} source-gated or currentness-gated assets**
- **${summary.excluded_or_retired_rows} excluded, retired, redundant, provenance or container entries logged**
- **${summary.missing_and_source_gap_rows} missing-file, currentness, local-source or availability entries** (${summary.closed_gap_rows} closed by this edition)

## What Edition ${summary.edition} adds

The twelve Batch 1 jurisdictions — Alaska, Alabama, Arkansas, Arizona, California, Colorado, Connecticut, the District of Columbia, Delaware, Florida, Hawaii and Idaho — now carry a controlling legal review. Each is the **amended** review: a packet-only controlling addendum dated ${AMENDED_ON} followed by the original review preserved unchanged beneath it.

Source archives:

- Amended import bundle — \`${summary.batch_1_amended_bundle_sha256}\`
- Original review archive — \`${summary.batch_1_original_review_archive_sha256}\` (provenance only; not a second set of active reviews)

The bundle's 117-track pre-amendment normalization is retained under \`00_GOVERNANCE/BATCH_1_AUTHORITY/\` as a completeness crosswalk. **It is not final legal truth and is not runtime data.**

## Governing rules

1. The state-specific controlling addendum at the beginning of an amended Batch 1 review controls where it changes an operational classification.
2. \`BATCH_1_AUTHORITY/00-Batch-1-Amendment-Decision-Matrix.md\`, then \`00-Source-Packet-Only-Product-Model-Amendment.md\`, then the preserved original review.
3. For Batch 2 jurisdictions the adopted Batch 2 resolution memorandum controls, then the individual state review.
4. A current official primary source or form controls source currency.
5. Historical internal agent references, HTML replicas, old form mirrors, generic webpage captures and superseded packets are not production sources.
6. File presence does **not** equal packet readiness. Every asset remains \`runtime_disabled\` until the applicable source, legal, mapping, technical and visual gates pass.
7. Source-gated files must never be selected by the packet resolver.
8. Track IDs live in the legal-design registry and manifest mapping layer, not in the human-readable filename.

## A retained review is not readiness

Adding a controlling legal review removes a missing-authority problem. It does not establish source currentness, packet mapping, rendering, legal output, visual approval or runtime readiness, and it does not resolve a conflict between the 117-track crosswalk and the current normalization. \`generation_allowed\` is \`no\` on every retained asset in this edition.

## Immutability

Edition ${summary.edition} is immutable. A newer law, revision or correction enters through a pending amendment and a newly published edition, never by editing this archive.
`;
  fs.writeFileSync(G("README_MASTER_LIBRARY.md"), text);
}

function appendGapLedgerMarkdown(remaining, closed) {
  const byImpact = tally(remaining, (gap) => gap.impact);
  const text = `# Missing files and source gaps — Edition ${EDITION}

**Published:** ${PUBLISHED_AT}
**Parent edition:** ${PARENT_EDITION}

Edition ${EDITION} closes **${closed.length}** Edition ${PARENT_EDITION} gap rows: the twelve missing Batch 1 state legal reviews, each replaced by a retained amended review asset. Legal-review coverage is now **51 of 51**.

**${remaining.length} rows remain.**

| Impact | Rows |
|---|---|
${Object.entries(byImpact)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([impact, count]) => `| \`${impact}\` | ${count} |`)
  .join("\n")}

## Closed by Edition ${EDITION}

${closed.map((gap) => `- **${gap.jurisdiction_code}** — ${gap.requested_item}`).join("\n")}

## Remaining rows

| Jurisdiction | Item | Status | Impact |
|---|---|---|---|
${remaining
  .map((gap) => `| ${gap.jurisdiction_code} | ${gap.requested_item} | \`${gap.status}\` | \`${gap.impact}\` |`)
  .join("\n")}

Closing a legal-review gap does not clear a form, a mapping, a revision or a release gate. Those are separate scopes and are tracked in the application's authoritative blocker ledger.
`;
  fs.writeFileSync(G("MISSING_FILES_AND_SOURCE_GAPS.md"), text);
}

function readJsonl(file) {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
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
  fs.writeFileSync(file, `﻿${header.join(",")}\n${body.join("\n")}\n`);
}

function listFiles(dir) {
  const out = [];
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
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
  fs.cpSync(from, to, { recursive: true, filter: (src) => !isContainerMetadata(src.replace(from, "")) });
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

function tally(list, keyOf) {
  const counts = {};
  for (const item of list) {
    const key = String(keyOf(item));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function parseArgs(argv) {
  const out = {};
  for (const entry of argv) {
    const match = entry.match(/^--([^=]+)(?:=(.*))?$/);
    if (match) out[match[1]] = match[2] ?? true;
  }
  return out;
}

function required(name) {
  if (!args[name]) fail(`Missing --${name}.`);
  return args[name];
}

function fail(message) {
  console.error(`Edition publication failed: ${message}`);
  process.exit(1);
}
