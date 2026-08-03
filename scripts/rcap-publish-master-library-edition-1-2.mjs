// Publish Master Library Edition 1.2.
//
// Edition 1.2 consolidates the accepted Batch 1 and Batch 2 normalization
// results into the source authority. It inherits every Edition 1.1 canonical
// asset unchanged and adds three things Edition 1.1 could not carry:
//
//   1. controlling legal-review addenda, where an accepted normalization
//      corrected the retained state review;
//   2. a Batch 2 authority area — the adopted memorandum's 14-jurisdiction
//      result expressed as a concise authority matrix rather than as copies of
//      derived registries;
//   3. sources acquired after the Edition 1.1 cutoff, each individually
//      identified rather than captured generically.
//
// Edition 1.1 is opened read-only and copied. It is never edited: a changed
// archive is a different edition, not a correction. Everything happens in a
// temporary directory outside the repository, and the only output is the
// edition ZIP written alongside its parent.
//
// An addendum is NOT a second jurisdictional legal review. It amends the one
// active controlling review for its jurisdiction and is manifested under its own
// asset class, so legal-review coverage stays 51 of 51 and cannot be inflated by
// publishing corrections.
//
// Nothing here promotes a route: every added asset lands `runtime_disabled` with
// `generation_allowed = no`.
//
// Usage:
//   node scripts/rcap-publish-master-library-edition-1-2.mjs \
//     --parent=<edition-1.1.zip> --out=<edition-1.2.zip> [--force] [--dry-run]

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { parseCsv, sha256File, documentIdKey } from "./lib/master-library.mjs";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

const EDITION = "1.2";
const PARENT_EDITION = "1.1";
const INPUT_DIR = path.join(root, "data/record-clearing/master-library/edition-1-2");

const spec = readJson(path.join(INPUT_DIR, "edition.json"));
const CUTOFF = spec.cutoffDate;
const PUBLISHED_AT = spec.publicationDate;
const ADDENDUM_ASOF = `ASOF-${PUBLISHED_AT}`;

const PARENT = args.parent ?? spec.parentArchivePath;
const OUT = args.out ?? spec.outputArchivePath;

if (!PARENT) fail("Missing --parent.");
if (!OUT) fail("Missing --out.");
if (fs.existsSync(OUT) && !args.force) {
  fail(`${OUT} already exists. A published edition is immutable; publish a new one rather than rebuilding it.`);
}

const isContainerMetadata = (name) =>
  name.includes("__MACOSX/") || name.endsWith(".DS_Store") || path.basename(name).startsWith("._");

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const parentSha = sha256File(PARENT);
if (spec.parentArchiveSha256 && parentSha !== spec.parentArchiveSha256) {
  fail(
    `Parent archive hash is ${parentSha}; the Edition ${EDITION} specification pins ${spec.parentArchiveSha256}. A changed archive is a different edition.`
  );
}

const candidateDecisions = readJson(path.join(INPUT_DIR, "candidate-dispositions.json"));
const acquiredSources = readJson(path.join(INPUT_DIR, "acquired-sources.json"));
const addendaDir = path.join(INPUT_DIR, "legal-review-addenda");

const trackRegistry = readJson(path.join(root, "data/record-clearing/legal-design-track-registry.json"));
const composedApprovals = readJson(
  path.join(root, "data/record-clearing/legal-design-composed-unit-approvals.json")
);
const slotReconciliation = readJson(
  path.join(root, "docs/record-clearing/batch-2-source-slot-reconciliation.json")
);

let strippedContainerMetadata = 0;

const work = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-edition-1-2-"));
process.on("exit", () => fs.rmSync(work, { recursive: true, force: true }));

console.log(`Publishing Edition ${EDITION} from Edition ${PARENT_EDITION}.`);
console.log(`  parent    ${parentSha}`);

const parentDir = path.join(work, "parent");
unzip(PARENT, parentDir);
const editionRoot = path.join(work, `Expungement_AI_RCAP_Master_Library_Edition_${EDITION.replace(".", "_")}`);
copyTree(soleChild(parentDir), editionRoot);

const G = (name) => path.join(editionRoot, "00_GOVERNANCE", name);
const manifest = readJsonl(G("MASTER_ASSET_MANIFEST.jsonl"));
const manifestHeader = readHeader(G("MASTER_ASSET_MANIFEST.csv"));
const stateCoverage = parseCsv(fs.readFileSync(G("STATE_COVERAGE.csv"), "utf8"));
const legalReviewCoverage = parseCsv(fs.readFileSync(G("LEGAL_REVIEW_COVERAGE.csv"), "utf8"));
const sourceGaps = parseCsv(fs.readFileSync(G("MISSING_FILES_AND_SOURCE_GAPS.csv"), "utf8"));
const exclusions = parseCsv(fs.readFileSync(G("EXCLUDED_RETIRED_AND_REDUNDANT_SOURCES.csv"), "utf8"));
const duplicates = parseCsv(fs.readFileSync(G("DUPLICATE_SOURCE_LOG.csv"), "utf8"));

const inheritedAssets = manifest.length;
console.log(`  inherited ${inheritedAssets} canonical assets from Edition ${PARENT_EDITION}.`);

const stateNameByCode = new Map(stateCoverage.map((row) => [row.jurisdiction_code, row.state]));

// ---------------------------------------------------------------------------
// 1. Legal-review addenda
// ---------------------------------------------------------------------------
//
// An addendum records only supported differences between the retained review and
// the accepted normalization. It never rewrites a settled portion of a review and
// never replaces one: the original stays exactly where it is, and the addendum is
// published beside it with express precedence.

const addedAddenda = [];
for (const entry of spec.legalReviewAddenda) {
  const src = path.join(addendaDir, `${entry.jurisdiction}.md`);
  if (!fs.existsSync(src)) fail(`Legal-review addendum missing for ${entry.jurisdiction}.`);

  const review = manifest.find(
    (row) => row.jurisdiction_code === entry.jurisdiction && row.asset_class === "legal_review"
  );
  if (!review) {
    fail(`${entry.jurisdiction} has no active controlling legal review; an addendum must amend one.`);
  }
  if (manifest.some((row) => row.jurisdiction_code === entry.jurisdiction && row.asset_class === "legal_review_addendum")) {
    fail(`${entry.jurisdiction} already carries an Edition ${EDITION} legal-review addendum.`);
  }

  const text = fs.readFileSync(src, "utf8");
  for (const required of ["## Precedence", "## Amended statements", "Amends:", "Controlling source:"]) {
    if (!text.includes(required)) fail(`${entry.jurisdiction} addendum is missing its \`${required}\` section.`);
  }
  if (!text.includes(review.canonical_relative_path)) {
    fail(`${entry.jurisdiction} addendum does not name the retained review it amends.`);
  }

  const state = stateNameByCode.get(entry.jurisdiction);
  const slugName = `${slug(state)}-record-clearing-legal-review-addendum-edition-1-2`;
  const rel = `STATES/${entry.jurisdiction}/01_LEGAL_REVIEW/${entry.jurisdiction}__LEGAL-REVIEW-ADDENDUM__STATEWIDE__${slugName}__${ADDENDUM_ASOF}__EN.md`;
  const dest = path.join(editionRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);

  manifest.push({
    library_edition: EDITION,
    jurisdiction_code: entry.jurisdiction,
    state,
    asset_class: "legal_review_addendum",
    document_role: "LEGAL_REVIEW_ADDENDUM",
    document_id: "STATEWIDE-ADDENDUM",
    official_title: `${state} Record-Clearing Legal Review — Edition ${EDITION} Controlling Addendum`,
    revision: ADDENDUM_ASOF,
    language: "EN",
    workflow_key: `${entry.jurisdiction}:STATEWIDE-ADDENDUM:LEGAL_REVIEW_ADDENDUM:EN`,
    packet_candidate: "no",
    generation_allowed: "no",
    runtime_status: "runtime_disabled",
    eligibility_role: "release_gated_source",
    packet_stage: "disabled_pending_release_gates",
    track_ids: "SEE_STATE_LEGAL_REVIEW",
    legal_review_mapping_status: "amends_the_retained_controlling_review",
    source_status: "controlling_legal_review_addendum",
    freshness_status: "legal_review_present",
    source_group: "edition_1_2_legal_review_addendum",
    source_filename: `${entry.jurisdiction}.md`,
    canonical_relative_path: rel,
    source_url: "",
    notes: `Controlling addendum to ${review.canonical_relative_path}. It amends only the statements listed in it; every other conclusion of the retained review is unchanged. It is not a second jurisdictional legal review and is not counted as one. Normalization commit ${entry.normalizationCommit}.`,
    required_follow_up: entry.requiredFollowUp,
    structural_class: "markdown",
    pages: "",
    field_count: "",
    bytes: fs.statSync(dest).size,
    sha256: sha256File(dest),
    checked_date: PUBLISHED_AT,
    all_source_origins: `data/record-clearing/master-library/edition-1-2/legal-review-addenda/${entry.jurisdiction}.md`
  });

  addedAddenda.push({ ...entry, state, canonicalRelativePath: rel, amends: review.canonical_relative_path });
}

// ---------------------------------------------------------------------------
// 2. Sources acquired after the Edition 1.1 cutoff
// ---------------------------------------------------------------------------

const addedSources = [];
for (const source of acquiredSources.sources) {
  const src = path.join(root, source.repositoryPath);
  if (!fs.existsSync(src)) fail(`Acquired source binary missing: ${source.repositoryPath}`);
  const sha = sha256File(src);
  if (sha !== source.sha256) fail(`Acquired source ${source.documentId} hash changed on disk.`);
  if (manifest.some((row) => row.sha256 === sha)) {
    fail(`Acquired source ${source.documentId} duplicates a retained asset by SHA-256.`);
  }
  const workflowKey = `${source.jurisdiction}:${source.documentId}:${source.documentRole}:${source.language}`;
  if (manifest.some((row) => row.workflow_key === workflowKey)) {
    fail(`Acquired source ${source.documentId} collides with a retained workflow key: ${workflowKey}.`);
  }

  const folder =
    source.assetClass === "packet_form"
      ? "02_PACKET_FORMS"
      : source.assetClass === "instructions"
        ? "03_INSTRUCTIONS"
        : source.assetClass === "supporting_process"
          ? "04_SUPPORTING_PROCESS"
          : "05_SOURCE_GATED";
  const rel = `STATES/${source.jurisdiction}/${folder}/${source.canonicalFileName}`;
  const dest = path.join(editionRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);

  manifest.push({
    library_edition: EDITION,
    jurisdiction_code: source.jurisdiction,
    state: stateNameByCode.get(source.jurisdiction),
    asset_class: source.assetClass,
    document_role: source.documentRole,
    document_id: source.documentId,
    official_title: source.officialTitle,
    revision: source.revision,
    language: source.language,
    workflow_key: workflowKey,
    packet_candidate: source.assetClass === "packet_form" ? "yes" : "no",
    generation_allowed: "no",
    runtime_status: "runtime_disabled",
    eligibility_role: "release_gated_source",
    packet_stage: "disabled_pending_release_gates",
    track_ids: "SEE_STATE_LEGAL_REVIEW",
    legal_review_mapping_status: "requires_track-level import mapping",
    source_status: source.sourceStatus,
    freshness_status: source.freshnessStatus,
    source_group: "edition_1_2_source_acquisition",
    source_filename: path.basename(source.repositoryPath),
    canonical_relative_path: rel,
    source_url: source.officialUrl ?? "",
    notes: source.notes,
    required_follow_up: source.requiredFollowUp,
    structural_class: source.structuralClass,
    pages: source.pages ?? "",
    field_count: source.fieldCount ?? "",
    bytes: fs.statSync(dest).size,
    sha256: sha,
    checked_date: source.retrievalDate,
    all_source_origins: source.repositoryPath
  });
  addedSources.push({ ...source, canonicalRelativePath: rel, workflowKey });
}

// ---------------------------------------------------------------------------
// 3. Pending-candidate dispositions
// ---------------------------------------------------------------------------
//
// Every open candidate carries one Edition 1.2 disposition. A reference-only
// adoption is logged with its hash rather than retained as an active asset, which
// is what "reference only" means in this library: evidence preserved, never
// resolver-selectable, never a generation target.

const adoptedReference = [];
const retiredOrExcluded = [];
const adoptedSourceGated = [];
const ADOPTED_CLASSES = {
  adopt_source_gated: "source_gated",
  adopt_packet_form: "packet_form",
  adopt_instructions: "instructions",
  adopt_supporting_process: "supporting_process"
};
const CLASS_FOLDERS = {
  packet_form: "02_PACKET_FORMS",
  instructions: "03_INSTRUCTIONS",
  supporting_process: "04_SUPPORTING_PROCESS",
  source_gated: "05_SOURCE_GATED"
};
const CLASS_TOKENS = {
  packet_form: "FORM",
  instructions: "INSTRUCTIONS",
  supporting_process: "SUPPORT",
  source_gated: "SOURCE-GATED"
};
for (const decision of candidateDecisions.decisions) {
  if (ADOPTED_CLASSES[decision.edition12Disposition]) {
    const assetClass = ADOPTED_CLASSES[decision.edition12Disposition];
    const src = path.join(root, decision.repositoryPath);
    if (!fs.existsSync(src)) fail(`Adopted candidate binary missing: ${decision.repositoryPath}`);
    const sha = sha256File(src);
    if (sha !== decision.sha256) fail(`Adopted candidate ${decision.documentId} hash changed on disk.`);
    if (manifest.some((row) => row.sha256 === sha)) {
      fail(`Adopted candidate ${decision.documentId} duplicates a retained asset by SHA-256.`);
    }
    const workflowKey = `${decision.jurisdiction}:${decision.documentId}:${decision.documentRole}:EN`;
    if (manifest.some((row) => row.workflow_key === workflowKey)) {
      fail(`Adopted candidate ${decision.documentId} collides with a retained workflow key: ${workflowKey}.`);
    }

    const rel = `STATES/${decision.jurisdiction}/${CLASS_FOLDERS[assetClass]}/${decision.canonicalFileName.replace(
      "__SOURCE-GATED__",
      `__${CLASS_TOKENS[assetClass]}__`
    )}`;
    const dest = path.join(editionRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);

    manifest.push({
      library_edition: EDITION,
      jurisdiction_code: decision.jurisdiction,
      state: stateNameByCode.get(decision.jurisdiction),
      asset_class: assetClass,
      document_role: decision.documentRole,
      document_id: decision.documentId,
      official_title: decision.officialTitle,
      revision: decision.revision,
      language: "EN",
      workflow_key: workflowKey,
      packet_candidate: assetClass === "packet_form" ? "yes" : "no",
      generation_allowed: "no",
      runtime_status: "runtime_disabled",
      eligibility_role: "release_gated_source",
      packet_stage: "disabled_pending_release_gates",
      track_ids: "SEE_STATE_LEGAL_REVIEW",
      legal_review_mapping_status: "requires_track-level import mapping",
      source_status: assetClass === "source_gated" ? "source_gated" : decision.sourceStatus ?? "current_official_source",
      freshness_status: decision.freshnessStatus,
      source_group: "edition_1_2_repository_import",
      source_filename: path.basename(decision.repositoryPath),
      canonical_relative_path: rel,
      source_url: decision.officialUrl ?? "",
      notes: decision.notes,
      required_follow_up: decision.requiredFollowUp,
      structural_class: decision.structuralClass,
      pages: decision.pages ?? "",
      field_count: decision.fieldCount ?? "",
      bytes: fs.statSync(dest).size,
      sha256: sha,
      checked_date: PUBLISHED_AT,
      all_source_origins: decision.repositoryPath
    });
    adoptedSourceGated.push({ ...decision, canonicalRelativePath: rel, workflowKey });
    continue;
  }
  if (decision.edition12Disposition === "adopt_reference_only") {
    exclusions.push({
      jurisdiction_code: decision.jurisdiction,
      state: stateNameByCode.get(decision.jurisdiction) ?? "",
      source_filename: decision.documentId,
      status: "reference_only_source",
      reason: `Edition ${EDITION} reference adoption. ${decision.rationale} Logged with its hash rather than retained as an active asset; never resolver-selectable and never a generation target.`,
      source_path: decision.repositoryPath,
      bytes: decision.bytes ?? "",
      sha256: decision.sha256
    });
    adoptedReference.push(decision);
    continue;
  }
  if (["excluded", "retired", "superseded"].includes(decision.edition12Disposition)) {
    exclusions.push({
      jurisdiction_code: decision.jurisdiction,
      state: stateNameByCode.get(decision.jurisdiction) ?? "",
      source_filename: decision.documentId,
      status: `edition_1_2_${decision.edition12Disposition}`,
      reason: `Edition ${EDITION}: ${decision.rationale}`,
      source_path: decision.repositoryPath,
      bytes: decision.bytes ?? "",
      sha256: decision.sha256
    });
    retiredOrExcluded.push(decision);
  }
}

// ---------------------------------------------------------------------------
// 3b. Declared exclusion-status corrections
// ---------------------------------------------------------------------------
//
// A source cannot be both active and retired. Where the parent edition logged a
// path as obsolete while retaining the identical bytes as an active asset, the
// log is describing a duplicate path rather than a superseded document — the
// edition kept one canonical copy and logged the other. Correcting that is what
// a new edition is for; the parent edition is not edited and the evidence, with
// its hash, is not deleted.

const exclusionCorrections = [];
for (const correction of spec.exclusionStatusCorrections ?? []) {
  const rows = exclusions.filter((row) => row.sha256 === correction.sha256 && row.status === correction.fromStatus);
  if (rows.length === 0) {
    fail(`Declared exclusion correction for ${correction.sha256} matches no ${correction.fromStatus} row.`);
  }
  const active = manifest.find((row) => row.sha256 === correction.sha256);
  if (!active) {
    fail(`Declared exclusion correction for ${correction.sha256} names no active retained asset at those bytes.`);
  }
  for (const row of rows) {
    row.status = correction.toStatus;
    row.reason = `${correction.reason} Corrected in Edition ${EDITION}; the Edition ${PARENT_EDITION} entry read: "${correction.fromStatus}". Canonical asset: ${active.workflow_key} at ${active.canonical_relative_path}.`;
    exclusionCorrections.push({ ...correction, canonicalWorkflowKey: active.workflow_key });
  }
}

// ---------------------------------------------------------------------------
// 4. Batch 2 authority area
// ---------------------------------------------------------------------------

const BATCH_2_DIR = "00_GOVERNANCE/BATCH_2_AUTHORITY";
const BATCH_2_CODES = spec.batch2Jurisdictions.map((entry) => entry.jurisdiction);
const composedByTrack = new Map(composedApprovals.tracks.map((entry) => [entry.trackId, entry]));

const matrixHeader = [
  "jurisdiction",
  "source_slot",
  "final_track_ids",
  "node_type",
  "final_output_strategy",
  "composition_mode",
  "composed_units",
  "controlling_authority",
  "normalization_commit",
  "remaining_legal_design_blocker",
  "authority_note"
];
const matrixRows = [];
for (const entry of spec.batch2Jurisdictions) {
  const tracks = trackRegistry.tracks.filter((track) => track.jurisdiction === entry.jurisdiction);
  for (const track of tracks) {
    const composed = composedByTrack.get(track.trackId);
    const splits = (slotReconciliation.approvedSplits ?? []).filter(
      (split) => split.jurisdiction === entry.jurisdiction
    );
    matrixRows.push({
      jurisdiction: entry.jurisdiction,
      source_slot: (track.officialSources ?? []).length > 0 ? "see_state_legal_review" : "see_state_legal_review",
      final_track_ids: track.trackId,
      node_type: track.mechanism ? "relief_track" : "relief_track",
      final_output_strategy: track.outputStrategy ?? track.outputStrategyDeclared ?? "",
      composition_mode: track.compositionMode ?? "",
      composed_units: composed ? composed.units.map((unit) => unit.unitId).join(" | ") : "",
      controlling_authority: (track.authority ?? []).slice(0, 3).join("; "),
      normalization_commit: entry.normalizationCommit,
      remaining_legal_design_blocker: (track.legalDesignBlockers ?? []).join(" | "),
      authority_note: splits.length > 0 ? `counsel-approved split(s) applied in this jurisdiction` : ""
    });
  }
}

// The registry is the accurate source for node type, strategy and composition,
// so the matrix is generated from it rather than restated by hand. Node type
// lives on the registry track under `legalDesignStatus`/`mechanism`; where the
// registry records a non-relief node it is carried through unchanged.
for (const row of matrixRows) {
  const track = trackRegistry.tracks.find((entry) => entry.trackId === row.final_track_ids);
  row.node_type = track?.nodeType ?? track?.legalDesignStatus?.nodeType ?? "relief_track";
}

writeCsv(path.join(editionRoot, BATCH_2_DIR, "BATCH_2_AUTHORITY_MATRIX.csv"), matrixHeader, matrixRows);

const slotHeader = [
  "jurisdiction",
  "source_slots",
  "normalized_nodes",
  "relief_tracks",
  "non_relief_nodes",
  "composed_tracks",
  "composed_units",
  "normalization_commit"
];
const slotRows = spec.batch2Jurisdictions.map((entry) => {
  const tracks = trackRegistry.tracks.filter((track) => track.jurisdiction === entry.jurisdiction);
  const composed = tracks.filter((track) => composedByTrack.has(track.trackId));
  return {
    jurisdiction: entry.jurisdiction,
    source_slots: entry.sourceSlots,
    normalized_nodes: tracks.length,
    relief_tracks: tracks.filter((track) => (track.nodeType ?? "relief_track") === "relief_track").length,
    non_relief_nodes: tracks.filter((track) => (track.nodeType ?? "relief_track") !== "relief_track").length,
    composed_tracks: composed.length,
    composed_units: composed.reduce((sum, track) => sum + (composedByTrack.get(track.trackId)?.units.length ?? 0), 0),
    normalization_commit: entry.normalizationCommit
  };
});
writeCsv(path.join(editionRoot, BATCH_2_DIR, "BATCH_2_SOURCE_SLOT_RECONCILIATION.csv"), slotHeader, slotRows);

writeBatch2Readme();

// ---------------------------------------------------------------------------
// 5. Source-gap ledger
// ---------------------------------------------------------------------------

const closedGaps = [];
const closedGapKeys = new Set(spec.closedSourceGaps ?? []);
const remainingGaps = sourceGaps.filter((gap) => {
  const key = `${gap.jurisdiction_code}:${gap.requested_item}`;
  if (!closedGapKeys.has(key)) return true;
  closedGaps.push(gap);
  return false;
});
for (const key of closedGapKeys) {
  if (!closedGaps.some((gap) => `${gap.jurisdiction_code}:${gap.requested_item}` === key)) {
    fail(`Edition ${EDITION} declares source gap ${key} closed, but the parent ledger has no such row.`);
  }
}
for (const gap of spec.newSourceGaps ?? []) remainingGaps.push(gap);

// ---------------------------------------------------------------------------
// 6. Coverage, state manifests and READMEs
// ---------------------------------------------------------------------------

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
}

// The addendum is recorded on the coverage row as an amendment to the existing
// review, never as a second present review: `status` is untouched, so coverage
// stays 51 of 51 and cannot be inflated by publishing a correction.
for (const addendum of addedAddenda) {
  const row = legalReviewCoverage.find((entry) => entry.jurisdiction_code === addendum.jurisdiction);
  if (!row) fail(`No legal-review coverage row for ${addendum.jurisdiction}.`);
  if (row.status !== "present") fail(`${addendum.jurisdiction} coverage is not \`present\`; an addendum cannot stand alone.`);
  row.required_action = `Edition ${EDITION} controlling addendum retained at ${addendum.canonicalRelativePath}. Read the addendum first, then the retained review.`;
}

manifest.sort((a, b) =>
  a.jurisdiction_code.localeCompare(b.jurisdiction_code) || a.workflow_key.localeCompare(b.workflow_key)
);
for (const row of manifest) row.library_edition = EDITION;

for (const row of stateCoverage) {
  const code = row.jurisdiction_code;
  const rows = manifest.filter((entry) => entry.jurisdiction_code === code);
  const dir = path.join(editionRoot, "STATES", code);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  writeCsv(path.join(dir, "STATE_MANIFEST.csv"), manifestHeader, rows);
  writeStateReadme(dir, code, row, rows, remainingGaps.filter((gap) => gap.jurisdiction_code === code));
}

// ---------------------------------------------------------------------------
// 7. Governance rewrite
// ---------------------------------------------------------------------------

writeCsv(G("MASTER_ASSET_MANIFEST.csv"), manifestHeader, manifest);
fs.writeFileSync(G("MASTER_ASSET_MANIFEST.jsonl"), `${manifest.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeCsv(G("STATE_COVERAGE.csv"), Object.keys(stateCoverage[0]), stateCoverage);
writeCsv(G("LEGAL_REVIEW_COVERAGE.csv"), Object.keys(legalReviewCoverage[0]), legalReviewCoverage);
writeCsv(G("MISSING_FILES_AND_SOURCE_GAPS.csv"), Object.keys(sourceGaps[0]), remainingGaps);
writeCsv(G("EXCLUDED_RETIRED_AND_REDUNDANT_SOURCES.csv"), Object.keys(exclusions[0]), exclusions);
writeCsv(G("DUPLICATE_SOURCE_LOG.csv"), Object.keys(duplicates[0]), duplicates);

const assetClasses = tally(manifest, (row) => row.asset_class);
const summary = {
  edition: EDITION,
  parent_edition: PARENT_EDITION,
  parent_sha256: parentSha,
  published_at: PUBLISHED_AT,
  cutoff_date: CUTOFF,
  repository_normalization_commit: spec.normalizationBaselineCommit,
  source_archive_inputs: spec.sourceArchiveInputs,
  jurisdictions: 51,
  jurisdictions_with_retained_assets: new Set(manifest.map((row) => row.jurisdiction_code)).size,
  jurisdictions_with_legal_review: legalReviewCoverage.filter((row) => row.status === "present").length,
  jurisdictions_missing_legal_review: legalReviewCoverage.filter((row) => row.status !== "present").length,
  inherited_assets: inheritedAssets,
  added_legal_review_addenda: addedAddenda.length,
  added_assets_by_class: tally(
    manifest.filter((row) => row.source_group?.startsWith("edition_1_2_")),
    (row) => row.asset_class
  ),
  added_non_review_assets: addedSources.length + adoptedSourceGated.length,
  added_acquired_sources: addedSources.length,
  added_adopted_candidates: adoptedSourceGated.length,
  superseded_assets: retiredOrExcluded.filter((entry) => entry.edition12Disposition === "superseded").length,
  retired_assets: retiredOrExcluded.filter((entry) => entry.edition12Disposition === "retired").length,
  excluded_assets: retiredOrExcluded.filter((entry) => entry.edition12Disposition === "excluded").length,
  reference_only_adoptions: adoptedReference.length,
  candidates_carried_forward_by_hold_type: tally(
    candidateDecisions.decisions.filter((entry) => entry.edition12Disposition.startsWith("hold_")),
    (entry) => entry.edition12Disposition
  ),
  normalized_jurisdictions_covered: spec.normalizedJurisdictionsCovered,
  normalized_tracks_audited: spec.normalizedTracksAudited,
  retained_assets: manifest.length,
  asset_classes: assetClasses,
  missing_and_source_gap_rows: remainingGaps.length,
  gap_impacts: tally(remainingGaps, (gap) => gap.impact),
  closed_gap_rows: closedGaps.length,
  excluded_or_retired_rows: exclusions.length,
  exact_duplicate_copies_removed: duplicates.length,
  batch_1_expected_track_ids: 117,
  batch_2_jurisdictions: BATCH_2_CODES.length,
  batch_2_authority_matrix_rows: matrixRows.length,
  container_metadata_files_excluded: strippedContainerMetadata,
  runtime_status: "runtime_disabled"
};
fs.writeFileSync(G("EDITION_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`);

writeReadme(summary);
writeGapLedgerMarkdown(remainingGaps, closedGaps);
appendWorkflowIntegration();

// ---------------------------------------------------------------------------
// 8. Integrity, then seal
// ---------------------------------------------------------------------------

const checksumPath = "00_GOVERNANCE/CHECKSUMS.sha256";
fs.rmSync(path.join(editionRoot, checksumPath), { force: true });
const files = listFiles(editionRoot).filter((rel) => !isContainerMetadata(rel));
const lines = files
  .filter((rel) => rel !== checksumPath)
  .map((rel) => `${sha256File(path.join(editionRoot, rel))}  ${rel}`);
fs.writeFileSync(path.join(editionRoot, checksumPath), `${lines.join("\n")}\n`);

verifyEditionIntegrity();

if (args["dry-run"]) {
  console.log("");
  console.log(`Dry run: Edition ${EDITION} tree built and verified. No archive written.`);
  process.exit(0);
}

const allFiles = listFiles(editionRoot);
spawnSync("touch", ["-t", `${PUBLISHED_AT.replace(/-/g, "")}0000.00`, ...allFiles.map((rel) => path.join(editionRoot, rel))], {
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
console.log(
  `  assets    ${manifest.length} (${inheritedAssets} inherited + ${addedAddenda.length} addenda + ${addedSources.length} acquired + ${adoptedSourceGated.length} adopted candidates)`
);
console.log(`  logged    ${adoptedReference.length} reference-only, ${retiredOrExcluded.length} superseded/retired/excluded`);
console.log(`  reviews   ${summary.jurisdictions_with_legal_review}/51 jurisdictions`);
console.log(`  gaps      ${remainingGaps.length} (closed ${closedGaps.length})`);
console.log(`  checksums ${lines.length}`);
console.log("");
console.log("The archive is sealed. Do not modify it; publish a new edition instead.");

fs.writeFileSync(
  path.join(root, "tmp", "edition-1-2-publication-receipt.json"),
  `${JSON.stringify(
    {
      edition: EDITION,
      path: OUT,
      sha256: outSha,
      bytes: outBytes,
      files: allFiles.length,
      summary,
      addedAddenda,
      addedSources,
      adoptedSourceGated,
      adoptedReference: adoptedReference.length,
      retiredOrExcluded: retiredOrExcluded.length
    },
    null,
    2
  )}\n`
);

// ---------------------------------------------------------------------------
// Integrity
// ---------------------------------------------------------------------------

function verifyEditionIntegrity() {
  const problems = [];
  const retained = new Set(listFiles(editionRoot));

  const seenPath = new Map();
  const seenKey = new Map();
  for (const row of manifest) {
    if (!retained.has(row.canonical_relative_path)) {
      problems.push(`manifest row has no retained file: ${row.canonical_relative_path}`);
    }
    if (seenPath.has(row.canonical_relative_path)) {
      problems.push(`duplicate canonical path: ${row.canonical_relative_path}`);
    }
    seenPath.set(row.canonical_relative_path, row);
    const previous = seenKey.get(row.workflow_key);
    if (previous && previous.sha256 !== row.sha256) {
      problems.push(`conflicting active workflow key: ${row.workflow_key}`);
    }
    seenKey.set(row.workflow_key, row);
    if (row.generation_allowed !== "no") {
      problems.push(`asset is generation-allowed: ${row.workflow_key}`);
    }
    if (row.runtime_status !== "runtime_disabled") {
      problems.push(`asset is not runtime_disabled: ${row.workflow_key}`);
    }
    if (row.asset_class === "source_gated" && row.packet_candidate === "yes") {
      problems.push(`source-gated asset is marked a packet candidate: ${row.workflow_key}`);
    }
  }

  const manifestPaths = new Set(manifest.map((row) => row.canonical_relative_path));
  for (const file of retained) {
    if (!file.startsWith("STATES/")) continue;
    if (file.endsWith("/STATE_MANIFEST.csv") || file.endsWith("/STATE_README.md")) continue;
    if (!manifestPaths.has(file)) problems.push(`retained asset absent from the manifest: ${file}`);
  }

  const checksumLines = fs
    .readFileSync(path.join(editionRoot, checksumPath), "utf8")
    .split("\n")
    .filter(Boolean);
  const covered = new Set(checksumLines.map((line) => line.slice(66)));
  for (const file of retained) {
    if (file === checksumPath) continue;
    if (!covered.has(file)) problems.push(`retained file absent from CHECKSUMS.sha256: ${file}`);
  }
  for (const line of checksumLines) {
    const [sha, file] = [line.slice(0, 64), line.slice(66)];
    if (!retained.has(file)) {
      problems.push(`checksum names a missing file: ${file}`);
      continue;
    }
    if (sha256File(path.join(editionRoot, file)) !== sha) problems.push(`checksum mismatch: ${file}`);
  }

  // A source is never both active and excluded, and a retired source is never
  // active. Compared by SHA-256, not by filename: the same document under two
  // names is one source.
  const activeSha = new Map(manifest.map((row) => [row.sha256, row]));
  for (const row of exclusions) {
    const sha = (row.sha256 || "").trim();
    if (!sha || !activeSha.has(sha)) continue;
    const retiredStatus = /retired|superseded|obsolete|excluded|prohibited/i.test(row.status);
    if (retiredStatus) problems.push(`source is both active and ${row.status}: ${sha}`);
  }

  // State manifests reconcile to the master manifest.
  for (const row of stateCoverage) {
    const code = row.jurisdiction_code;
    const file = path.join(editionRoot, "STATES", code, "STATE_MANIFEST.csv");
    if (!fs.existsSync(file)) {
      problems.push(`${code} has no STATE_MANIFEST.csv`);
      continue;
    }
    const stateRows = parseCsv(fs.readFileSync(file, "utf8"));
    const expected = manifest.filter((entry) => entry.jurisdiction_code === code);
    if (stateRows.length !== expected.length) {
      problems.push(`${code} state manifest has ${stateRows.length} rows, master has ${expected.length}`);
    }
    if (String(expected.length) !== row.total_assets) {
      problems.push(`${code} state coverage total_assets ${row.total_assets} does not match ${expected.length}`);
    }
  }

  // Legal-review coverage reconciles, and an addendum is never counted as one.
  const reviewRows = manifest.filter((row) => row.asset_class === "legal_review");
  const presentCoverage = legalReviewCoverage.filter((row) => row.status === "present").length;
  if (reviewRows.length !== presentCoverage) {
    problems.push(`legal-review coverage is ${presentCoverage} but ${reviewRows.length} review assets are retained`);
  }
  if (presentCoverage !== 51) problems.push(`legal-review coverage is ${presentCoverage}/51`);
  for (const addendum of manifest.filter((row) => row.asset_class === "legal_review_addendum")) {
    if (!reviewRows.some((row) => row.jurisdiction_code === addendum.jurisdiction_code)) {
      problems.push(`${addendum.jurisdiction_code} addendum has no controlling review to amend`);
    }
    if (!addendum.notes.includes("Controlling addendum to STATES/")) {
      problems.push(`${addendum.jurisdiction_code} addendum has no explicit precedence and provenance note`);
    }
  }

  // Summary reconciles.
  if (summary.retained_assets !== manifest.length) problems.push("edition summary asset count does not reconcile");
  if (summary.missing_and_source_gap_rows !== remainingGaps.length) problems.push("gap counts do not reconcile");
  if (summary.excluded_or_retired_rows !== exclusions.length) problems.push("exclusion counts do not reconcile");
  if (summary.exact_duplicate_copies_removed !== duplicates.length) problems.push("duplicate log does not reconcile");

  if (problems.length > 0) {
    console.error(`Edition ${EDITION} integrity failed:`);
    for (const problem of problems.slice(0, 40)) console.error(`  - ${problem}`);
    if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`);
    process.exit(1);
  }
  console.log(`  integrity ${lines.length} checksums, ${manifest.length} manifest rows, 0 defects.`);
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

function writeBatch2Readme() {
  const text = `# Batch 2 authority — Edition ${EDITION}

**Published:** ${PUBLISHED_AT}
**Jurisdictions:** ${BATCH_2_CODES.join(", ")} (14 of 14 normalized)
**Repository normalization baseline:** \`${spec.normalizationBaselineCommit}\`

Batch 2 is complete. This area records what the adopted memorandum and the
accepted normalization together settled, in a form that can be checked without
opening the application.

## Precedence within Batch 2

1. The jurisdiction's Edition ${EDITION} legal-review addendum, where one exists.
2. \`00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md\` — the adopted
   Batch 2 legal-research resolution memorandum, where it expressly changes track
   structure, output strategy, packet capability, blocker treatment, product
   scope, geography or supporting-document treatment.
3. The jurisdiction's retained legal review, for everything the memorandum and
   the addendum do not change.
4. \`BATCH_2_AUTHORITY_MATRIX.csv\` and \`BATCH_2_SOURCE_SLOT_RECONCILIATION.csv\`
   for the final track, node-type, strategy and composition result.

## What is here, and what is deliberately not

\`BATCH_2_AUTHORITY_MATRIX.csv\` — one row per normalized node: final track ID,
node type, final output strategy, composition mode, composed units, controlling
authority, the commit that normalized it, and any remaining legal-design blocker.

\`BATCH_2_SOURCE_SLOT_RECONCILIATION.csv\` — the 14-jurisdiction source-slot
reconciliation: slots counted from the source review against nodes actually
normalized, with composed-track and unit counts.

Derived registries are **not** copied here. A registry is an implementation
output; publishing a copy of one inside the authority archive would create a
second source of truth that could drift from the first. The matrix is a concise
authority statement, and the registries remain where they are generated.

## Approved splits

${(slotReconciliation.approvedSplits ?? [])
  .map((split) => `- **${split.jurisdiction} ${split.sourceSlot}** — +${split.addedNodes} node(s). ${split.reason}`)
  .join("\n")}

## What a matrix row does not mean

A row here records that a mechanism is accounted for, its legal design is
represented, and its blockers are classified. It does not mean the source is
promoted, the field map exists, the completed output is approved, or the route is
enabled. Every Batch 2 track remains \`runtime_disabled\`.
`;
  const dest = path.join(editionRoot, BATCH_2_DIR, "README.md");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
}

function writeStateReadme(dir, code, coverage, rows, gaps) {
  const review = rows.find((row) => row.asset_class === "legal_review");
  const addendum = rows.find((row) => row.asset_class === "legal_review_addendum");
  const amended = review && review.source_group === "batch1_amended_import_bundle";
  const out = [
    `# ${coverage.state} (${code})`,
    "",
    `**Edition:** ${EDITION}  `,
    `**Cutoff:** ${CUTOFF}  `,
    "**Runtime status:** `runtime_disabled`",
    "",
    `- Legal review: ${review ? (amended ? "present (Batch 1 amended)" : "present") : "missing"}`,
    `- Edition ${EDITION} controlling addendum: ${addendum ? "present" : "none"}`,
    `- Packet forms: ${coverage.packet_forms}`,
    `- Instructions: ${coverage.instructions}`,
    `- Supporting process assets: ${coverage.supporting_process_assets}`,
    `- Source-gated assets: ${coverage.source_gated_assets}`,
    `- Missing/source-gap entries: ${coverage.missing_or_gap_items}`,
    "",
    "## Folder meaning",
    "",
    "- `01_LEGAL_REVIEW`: controlling or current state legal-design analysis, and any controlling addendum to it.",
    "- `02_PACKET_FORMS`: packet candidates only; not runtime-approved.",
    "- `03_INSTRUCTIONS`: participant filing and process instructions.",
    "- `04_SUPPORTING_PROCESS`: record requests, fee waivers, certifications, releases, and verification.",
    "- `05_SOURCE_GATED`: local, provisional, stale, third-party, or currentness-sensitive material.",
    ""
  ];

  if (review) {
    out.push("## Legal review", "", `\`${review.canonical_relative_path}\``, "");
    if (addendum) {
      out.push(
        `### Edition ${EDITION} controlling addendum`,
        "",
        `\`${addendum.canonical_relative_path}\``,
        "",
        "Read the addendum **first**. It amends only the statements it lists, each with the retained statement it replaces, the accepted normalized treatment, the controlling official source and the normalization commit. Every other conclusion in the retained review is unchanged and still controls.",
        "",
        "The addendum is **not** a second legal review for this jurisdiction and is not counted as one. Legal-review coverage is measured on the retained review alone.",
        ""
      );
    }
    if (amended) {
      out.push(
        "### Batch 1 controlling precedence",
        "",
        `1. The Edition ${EDITION} controlling addendum, where one exists.`,
        "2. The state-specific controlling addendum at the beginning of this amended review.",
        "3. `00_GOVERNANCE/BATCH_1_AUTHORITY/00-Batch-1-Amendment-Decision-Matrix.md`.",
        "4. `00_GOVERNANCE/BATCH_1_AUTHORITY/00-Source-Packet-Only-Product-Model-Amendment.md`.",
        "5. The original state review preserved beneath the state addendum.",
        ""
      );
    }
    if (BATCH_2_CODES.includes(code)) {
      out.push(
        "### Batch 2 controlling precedence",
        "",
        `1. The Edition ${EDITION} controlling addendum, where one exists.`,
        "2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.",
        "3. This retained state review.",
        "4. `00_GOVERNANCE/BATCH_2_AUTHORITY/` for the final track, node-type, strategy and composition result.",
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
**Repository normalization baseline:** \`${summary.repository_normalization_commit}\`
**Jurisdictions:** 50 states plus the District of Columbia
**Runtime posture:** Disabled by default

Edition ${summary.edition} inherits every Edition ${summary.parent_edition} canonical asset unchanged and consolidates the accepted Batch 1 and Batch 2 normalization results into the source authority. Editions ${summary.parent_edition} and 1.0 remain immutable and independently verifiable.

## Edition ${summary.edition} inventory

- **${summary.retained_assets} retained canonical assets** (${summary.inherited_assets} inherited, ${summary.added_legal_review_addenda} legal-review addenda, ${summary.added_non_review_assets} acquired sources)
- **${summary.jurisdictions_with_legal_review} of 51 jurisdictions** carry a controlling legal review
- **${summary.added_legal_review_addenda} jurisdictions** additionally carry an Edition ${summary.edition} controlling addendum
- **${summary.asset_classes.packet_form} packet-form candidates**
- **${summary.asset_classes.instructions} participant instruction assets**
- **${summary.asset_classes.supporting_process} supporting or prerequisite process assets**
- **${summary.asset_classes.source_gated} source-gated or currentness-gated assets**
- **${summary.excluded_or_retired_rows} excluded, retired, redundant, reference, provenance or container entries logged**
- **${summary.missing_and_source_gap_rows} missing-file, currentness, local-source or availability entries** (${summary.closed_gap_rows} closed by this edition)

## What Edition ${summary.edition} adds

**Legal-review addenda.** Edition ${summary.parent_edition}'s retained reviews predate several accepted normalization findings. Where an accepted memo, continuation record or current official source materially corrected a retained review, this edition publishes a concise controlling addendum beside it. An addendum records only supported differences — each with the retained statement it amends, the accepted normalized treatment, the controlling official source and its date, the normalization commit, the authority effect and the runtime effect. **No original review was overwritten, and no settled portion of a review was rewritten.**

An addendum is not a second jurisdictional legal review. Legal-review coverage is measured on the retained review alone and remains **${summary.jurisdictions_with_legal_review} of 51**.

**Batch 2 authority.** \`00_GOVERNANCE/BATCH_2_AUTHORITY/\` holds the concise 14-jurisdiction authority matrix and source-slot reconciliation: old source slot, final track IDs, node type, final strategy, composed-unit structure, controlling authority, normalization commit and any remaining legal-design blocker. Derived registries are not copied in as if they were legal source documents.

**Acquired sources.** Sources acquired after the Edition ${summary.parent_edition} cutoff are retained individually identified — with a document ID, a role, a revision and a SHA-256 — rather than as generic captures. A generic multi-document web capture can carry none of those and can never be manifested or resolver-selectable.

## Governing rules

1. The jurisdiction's Edition ${summary.edition} legal-review addendum controls where one exists.
2. Then the adopted Batch 1 or Batch 2 resolution authority, then the retained state legal review.
3. The Master Asset Manifest, state manifests, gap ledger, exclusion log, duplicate log and checksums control source identity, currentness, role, revision and release treatment.
4. A current official primary source or form controls source currency.
5. Historical internal agent references, HTML replicas, old form mirrors, generic webpage captures and superseded packets are not production sources.
6. File presence does **not** equal packet readiness. Every asset remains \`runtime_disabled\` until the applicable source, legal, mapping, technical and visual gates pass.
7. Source-gated and reference-only files must never be selected by the packet resolver.
8. Track IDs live in the legal-design registry and manifest mapping layer, not in the human-readable filename.

## Publication is not readiness

Publishing an asset removes a source-identity problem. It does not establish currentness, packet mapping, rendering, legal output, visual approval or runtime readiness. \`generation_allowed\` is \`no\` on every one of the ${summary.retained_assets} retained assets in this edition, so nothing in it is resolver-selectable on its own.

## Immutability

Edition ${summary.edition} is immutable. A newer law, revision or correction enters through a pending amendment, a source-acquisition queue row and a newly published edition — never by editing this archive.
`;
  fs.writeFileSync(G("README_MASTER_LIBRARY.md"), text);
}

function appendWorkflowIntegration() {
  const file = G("WORKFLOW_INTEGRATION.md");
  const existing = fs.readFileSync(file, "utf8");
  const addition = `

## Edition ${EDITION} — two authority mechanics changed

### 1. A legal-review addendum takes precedence over the review it amends

Edition ${EDITION} publishes controlling addenda beside retained state reviews.
Resolution order inside a jurisdiction is now:

1. \`asset_class: legal_review_addendum\` for the jurisdiction, where one exists;
2. \`asset_class: legal_review\` — the retained controlling review;
3. the adopted Batch 1 or Batch 2 resolution authority for anything the review
   does not settle.

An addendum amends **only** the statements it lists. It is manifested under its
own asset class and its own document role, so a consumer counting legal-review
coverage counts reviews and never addenda. Coverage stays 51 of 51.

### 2. A required source can be absent from the pending-amendment ledger

The pending-amendment ledger is built by scanning the repository source corpus,
so a required source the corpus holds only as a generic capture — or does not
hold at all — can never become a candidate there. Edition ${EDITION} adds a
generated **source-acquisition queue** built from the normalized tracks and this
manifest, which lists a required source because a track needs it rather than
because a binary exists.

Read the two together. The pending ledger answers *what valid binaries do we hold
that the edition does not retain*; the acquisition queue answers *what does the
edition fail to retain that a track actually needs*. Neither is complete alone,
and neither may be hand-edited to change a source's status.
`;
  fs.writeFileSync(file, existing.trimEnd() + addition);
}

function writeGapLedgerMarkdown(remaining, closed) {
  const byImpact = tally(remaining, (gap) => gap.impact);
  const text = `# Missing files and source gaps — Edition ${EDITION}

**Published:** ${PUBLISHED_AT}
**Parent edition:** ${PARENT_EDITION}

Edition ${EDITION} closes **${closed.length}** Edition ${PARENT_EDITION} gap rows and records **${remaining.length}** remaining.

A gap row is the edition working correctly: it records a source the edition could
not retain, with its authoritative impact. It is not a defect in the archive, and
closing one does not clear a form, a mapping, a revision or a release gate.

**This ledger is not the complete account of unretained sources.** A required
source with no individually identified workflow asset never reaches it. The
application's generated source-acquisition queue carries those; read the two
together.

| Impact | Rows |
|---|---|
${Object.entries(byImpact)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([impact, count]) => `| \`${impact}\` | ${count} |`)
  .join("\n")}

## Closed by Edition ${EDITION}

${closed.length > 0 ? closed.map((gap) => `- **${gap.jurisdiction_code}** — ${gap.requested_item}`).join("\n") : "_None._"}

## Remaining rows

| Jurisdiction | Item | Status | Impact |
|---|---|---|---|
${remaining
  .map((gap) => `| ${gap.jurisdiction_code} | ${gap.requested_item} | \`${gap.status}\` | \`${gap.impact}\` |`)
  .join("\n")}
`;
  fs.writeFileSync(G("MISSING_FILES_AND_SOURCE_GAPS.md"), text);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseArgs(argv) {
  const out = {};
  for (const entry of argv) {
    const match = entry.match(/^--([^=]+)(?:=(.*))?$/);
    if (match) out[match[1]] = match[2] ?? true;
  }
  return out;
}

function fail(message) {
  console.error(`Edition ${EDITION} publication failed: ${message}`);
  process.exit(1);
}
