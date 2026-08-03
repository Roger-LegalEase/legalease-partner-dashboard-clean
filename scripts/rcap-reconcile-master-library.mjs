// Reconcile this repository against the adopted Master Library edition.
//
// Writes five derived records under `data/record-clearing/master-library/`:
//
//   reconciliation.json              edition integrity and coverage reconciliation
//   repository-asset-audit.json      one status for every repository source asset
//   track-source-audit.json          one authority result for every packet component
//   pending-edition-amendments.json  valid repository sources Edition 1 does not retain
//   authoritative-blocker-ledger.json  blockers joined across scopes, deduped, not summed
//
// Nothing here edits the adopted edition, and nothing here changes a legal-design
// conclusion. Reconciliation moves provenance, not law: a track's mechanism,
// output strategy and counsel status are read, never rewritten.
//
// Reconciliation is by SHA-256 first. Document ID, official title, revision and
// canonical path are secondary evidence, recorded as evidence rather than
// promoted to a match, because a same-named form at different bytes is a
// different document.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

register("./lib/ts-esm-loader.mjs", import.meta.url);

import {
  readAuthorityRecord,
  openLibrary,
  loadGovernance,
  indexLibrary,
  documentIdKey,
  workflowKeyOf,
  sha256File,
  isDuplicatePathExclusion
} from "./lib/master-library.mjs";

const { decideTrackAuthority, isResolverSelectable } = await import(
  "@/lib/rcap/legal-design/master-library-authority"
);

const root = process.cwd();
const OUT_DIR = path.join(root, "data/record-clearing/master-library");

const authority = readAuthorityRecord(root);
const library = openLibrary(root, authority);
const governance = loadGovernance(library);
const index = indexLibrary(governance);

console.log(
  `Master Library ${authority.libraryName} Edition ${governance.edition.edition} (cutoff ${governance.edition.cutoff_date}) opened in ${library.mode} mode.`
);

// ---------------------------------------------------------------------------
// 1. Edition integrity
// ---------------------------------------------------------------------------

const checksumResult = library.withTree((treeRoot) => {
  const mismatches = [];
  const missing = [];
  for (const entry of governance.checksums) {
    const file = path.join(treeRoot, entry.path);
    if (!fs.existsSync(file)) {
      missing.push(entry.path);
      continue;
    }
    const actual = sha256File(file);
    if (actual !== entry.sha256) mismatches.push({ path: entry.path, expected: entry.sha256, actual });
  }

  const covered = new Set(governance.checksums.map((entry) => entry.path));
  const retained = library.listFiles();
  const uncovered = retained.filter((file) => !covered.has(file));

  return {
    checksumLines: governance.checksums.length,
    retainedFiles: retained.length,
    verified: governance.checksums.length - mismatches.length - missing.length,
    mismatches,
    missing,
    // The checksum file cannot list itself; anything else uncovered is a defect.
    uncoveredFiles: uncovered.filter((file) => file !== authority.checksumFilePath)
  };
});

const manifestPaths = new Set(governance.manifest.map((row) => row.canonical_relative_path));
const retainedFiles = new Set(library.listFiles());
const manifestPathsWithNoFile = [...manifestPaths].filter((file) => !retainedFiles.has(file));
const assetFilesNotInManifest = [...retainedFiles].filter(
  (file) => file.startsWith("STATES/") && !file.endsWith("STATE_MANIFEST.csv") && !file.endsWith("STATE_README.md") && !manifestPaths.has(file)
);

const workflowKeyCollisions = [];
for (const [key, rows] of index.byWorkflowKey) {
  if (rows.length > 1) workflowKeyCollisions.push({ workflowKey: key, rows: rows.length });
}
const canonicalPathCollisions = [];
const seenPaths = new Map();
for (const row of governance.manifest) {
  const existing = seenPaths.get(row.canonical_relative_path);
  if (existing) canonicalPathCollisions.push({ canonicalPath: row.canonical_relative_path, workflowKeys: [workflowKeyOf(existing), workflowKeyOf(row)] });
  else seenPaths.set(row.canonical_relative_path, row);
}
const shaConflicts = [];
for (const [key, rows] of index.byWorkflowKey) {
  const shas = new Set(rows.map((row) => row.sha256));
  if (shas.size > 1) shaConflicts.push({ workflowKey: key, shas: [...shas] });
}

const assetClassCounts = tally(governance.manifest, (row) => row.asset_class);
const generationAllowed = governance.manifest.filter((row) => row.generation_allowed === "yes");
const resolverSelectable = governance.manifest.filter((row) => isResolverSelectable(toAssetRef(row)));

const reconciliation = {
  schemaVersion: 1,
  generatedBy: "npm run rcap:reconcile-master-library",
  authority: {
    library: authority.libraryName,
    edition: governance.edition.edition,
    cutoffDate: governance.edition.cutoff_date,
    canonicalPath: authority.canonicalPath,
    retentionForm: authority.retention.form,
    archiveSha256: library.archiveSha256,
    archiveSha256MatchesAuthorityRecord:
      library.archiveSha256 === null || library.archiveSha256 === authority.retention.archiveSha256
  },
  editionSummary: governance.edition,
  integrity: {
    ...checksumResult,
    manifestRows: governance.manifest.length,
    manifestPathsWithNoRetainedFile: manifestPathsWithNoFile,
    assetFilesAbsentFromManifest: assetFilesNotInManifest,
    duplicateWorkflowKeys: workflowKeyCollisions,
    duplicateCanonicalPaths: canonicalPathCollisions,
    conflictingShaForOneWorkflowKey: shaConflicts,
    hasAdoptedMemorandum: governance.hasAdoptedMemorandum
  },
  coverage: {
    manifestRowsReconcileWithEditionSummary:
      governance.manifest.length === governance.edition.retained_assets,
    manifestCsvRowsMatchJsonl: governance.manifestCsv.length === governance.manifest.length,
    assetClassCounts,
    assetClassCountsReconcile: shallowEqual(assetClassCounts, governance.edition.asset_classes),
    stateCoverageRows: governance.stateCoverage.length,
    stateManifestsFound: Object.keys(governance.stateManifests).length,
    stateCoverageReconciles: reconcileStateCoverage(),
    legalReviewCoverageRows: governance.legalReviewCoverage.length,
    legalReviewsPresent: governance.legalReviewCoverage.filter((row) => row.status === "present").length,
    legalReviewsMissing: governance.legalReviewCoverage.filter((row) => row.status !== "present").length,
    legalReviewCoverageReconciles:
      governance.legalReviewCoverage.filter((row) => row.status === "present").length ===
      governance.edition.jurisdictions_with_legal_review,
    sourceGapRows: governance.sourceGaps.length,
    sourceGapRowsReconcile: governance.sourceGaps.length === governance.edition.missing_and_source_gap_rows,
    exclusionRows: governance.exclusions.length,
    exclusionRowsReconcile: governance.exclusions.length === governance.edition.excluded_or_retired_rows,
    duplicateRows: governance.duplicates.length,
    duplicateRowsReconcile:
      governance.duplicates.length === governance.edition.exact_duplicate_copies_removed
  },
  runtimePosture: {
    declared: governance.edition.runtime_status,
    assetsWithGenerationAllowed: generationAllowed.length,
    resolverSelectableAssets: resolverSelectable.length,
    note:
      "Edition 1 sets generation_allowed = no on every retained asset. No asset is resolver-selectable under Edition 1 alone; promotion happens in this repository through an auditable legal-design and renderer change."
  }
};

// ---------------------------------------------------------------------------
// 2. Repository asset audit
// ---------------------------------------------------------------------------

const artifactRegistry = readJson("data/record-clearing/source-artifact-registry.json");

const repositoryAssets = artifactRegistry.artifacts.map((artifact) => {
  // Reconcile by SHA-256 first, and use whichever hash the repository actually
  // holds. A missing binary still carries its inventory hash, and that hash is
  // enough to say whether the adopted edition retains the same bytes.
  const sha = artifact.measuredSha256 || artifact.inventorySha256 || null;
  const manifestRows = sha ? index.bySha.get(sha) : undefined;
  const excludedRows = sha ? index.excludedSha.get(sha) : undefined;
  const duplicateRows = sha ? index.duplicateSha.get(sha) : undefined;
  const binaryPresent = artifact.presence === "present";

  let status;
  let reason;
  let libraryRow = null;

  if (!binaryPresent && manifestRows && manifestRows.length > 0) {
    // The edition retains these bytes; this repository does not hold them.
    libraryRow = manifestRows[0];
    status = "manifested_but_missing_binary";
    reason = `The adopted edition retains ${libraryRow.workflow_key} at these bytes; the repository inventory expects the file and does not hold it.`;
  } else if (!binaryPresent) {
    status = "unmanifested_repository_asset";
    reason =
      "Repository inventory expects the file, the repository does not hold it, and the adopted edition retains no row for its recorded hash. Nothing to map and nothing to amend an edition with.";
  } else if (manifestRows && manifestRows.length > 0) {
    libraryRow = manifestRows[0];
    status = statusForManifestedAsset(libraryRow);
    reason = `Exact SHA-256 match to retained ${libraryRow.asset_class} ${libraryRow.workflow_key}.`;
    if (manifestRows.length > 1) {
      reason += ` ${manifestRows.length} retained rows share these bytes; the canonical asset is one file mapped to several tracks.`;
    }
  } else if (duplicateRows && duplicateRows.length > 0) {
    status = "exact_duplicate";
    libraryRow = duplicateRows[0];
    reason = `Exact SHA-256 duplicate of retained ${duplicateRows[0].kept_canonical_path}; the edition keeps one canonical copy.`;
  } else if (excludedRows && excludedRows.length > 0) {
    const retiredRows = excludedRows.filter((row) => !isDuplicatePathExclusion(row));
    libraryRow = (retiredRows[0] ?? excludedRows[0]);
    status = retiredRows.length > 0 ? "excluded_or_retired_source" : "exact_duplicate";
    reason = `Logged as ${libraryRow.status} in the exclusion log: ${libraryRow.reason}`;
  } else if (isNonWorkflowAsset(artifact)) {
    status = "not_a_workflow_asset";
    reason = `Repository capture of type ${artifact.fileType} that the edition does not treat as a workflow document.`;
  } else {
    status = "unmanifested_repository_asset";
    reason =
      "Present in this repository with no retained row, exclusion row or duplicate row in the adopted edition. Runtime disabled pending an edition amendment.";
  }

  // Revision is *not* re-derived from an exact hash match. Identical bytes are
  // the same document, so the edition's normalized revision is authoritative
  // and the repository's free-text revision string is secondary evidence of the
  // same fact. A revision mismatch is only meaningful where document identity
  // matches and the bytes differ — see `evidenceLimits` below.
  const revisionEvidence = compareRevision(artifact, libraryRow);

  return {
    jurisdiction: artifact.jurisdiction,
    artifactId: artifact.artifactId,
    fileName: artifact.fileName,
    sourcePath: artifact.sourcePath,
    fileType: artifact.fileType,
    presence: artifact.presence,
    sha256: sha,
    binaryPresent,
    hashState: artifact.hashState,
    repositorySourceTreatment: artifact.sourceTreatment,
    repositoryRuntimeEligibility: artifact.runtimeEligibility,
    status,
    reason,
    repositoryRevisionText: artifact.revision ?? null,
    revisionEvidence,
    libraryRow: libraryRow
      ? {
          workflowKey: libraryRow.workflow_key ?? null,
          assetClass: libraryRow.asset_class ?? null,
          documentId: libraryRow.document_id ?? null,
          revision: libraryRow.revision ?? null,
          canonicalRelativePath: libraryRow.canonical_relative_path ?? libraryRow.kept_canonical_path ?? null,
          logStatus: libraryRow.status ?? null
        }
      : null
  };
});

const repositoryShas = new Set(
  artifactRegistry.artifacts.filter((a) => a.presence === "present" && a.measuredSha256).map((a) => a.measuredSha256)
);
const libraryAssetsAbsentFromRepository = governance.manifest
  .filter((row) => !repositoryShas.has(row.sha256))
  .map((row) => ({
    workflowKey: row.workflow_key,
    jurisdiction: row.jurisdiction_code,
    assetClass: row.asset_class,
    documentId: row.document_id,
    revision: row.revision,
    canonicalRelativePath: row.canonical_relative_path,
    sha256: row.sha256
  }));

const repositoryAssetAudit = {
  schemaVersion: 1,
  authorityEdition: governance.edition.edition,
  note:
    "One reconciliation status per repository source asset, decided by exact SHA-256 against the adopted edition. Document ID, official title, revision and canonical path are secondary evidence only. Nothing in this repository was deleted, moved or renamed to produce this audit.",
  totals: {
    repositoryAssets: repositoryAssets.length,
    byStatus: tally(repositoryAssets, (asset) => asset.status),
    excludedOrRetiredStillPresent: repositoryAssets.filter(
      (asset) => asset.status === "excluded_or_retired_source"
    ).length,
    libraryAssetsAbsentFromRepositoryInventory: libraryAssetsAbsentFromRepository.length,
    libraryAssetsAbsentByClass: tally(libraryAssetsAbsentFromRepository, (row) => row.assetClass),
    hashMismatches: repositoryAssets.filter((asset) => asset.status === "hash_mismatch").length,
    revisionMismatches: repositoryAssets.filter((asset) => asset.status === "revision_mismatch").length,
    revisionEvidenceOnExactMatches: tally(
      repositoryAssets.filter((asset) => asset.libraryRow && asset.status.startsWith("manifested_")),
      (asset) => asset.revisionEvidence
    )
  },
  evidenceLimits: {
    hashAndRevisionMismatch:
      "A hash or revision mismatch is only decidable where a repository asset carries the same document identity as a retained asset at different bytes. The repository artifact registry records no document ID and records an official title for a small minority of its unmatched assets, so no such pair is currently decidable and both counts are zero by absence of evidence, not by proof of agreement. The registry's own hashState reports zero internal mismatches across its measured assets. Closing this is a mapping-blocker item, not a legal-design one.",
    revisionStrings:
      "Repository revision strings are free text ('Rev. 5/2024', 'TF-810 (5/25)'); the edition normalizes revisions to REV-YYYY[-MM[-DD]]. Where the SHA-256 matches exactly the two describe the same document, and the edition's normalized form is authoritative."
  },
  libraryAssetsAbsentFromRepositoryInventory: libraryAssetsAbsentFromRepository,
  assets: repositoryAssets
};

// ---------------------------------------------------------------------------
// 3. Track-source audit
// ---------------------------------------------------------------------------

const trackRegistry = readJson("data/record-clearing/legal-design-track-registry.json");
const packetSets = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const relationships = readJson("data/record-clearing/legal-design-track-source-relationships.json").relationships;
const specifications = readJson("data/record-clearing/legal-design-specifications.json");
const composedApprovals = readJson("data/record-clearing/legal-design-composed-unit-approvals.json");

const relationshipByComponent = new Map(
  relationships.map((relationship) => [`${relationship.trackId}::${relationship.componentId}`, relationship])
);
const customPleadingSpecs = new Set(
  (specifications.customPleadingSpecs ?? []).map((spec) => `${spec.trackId}::${spec.componentId}`)
);
// Guidance specifications are written per track (and per unit for a composed
// route), not per component, so they are keyed that way rather than forced into
// a component key that would never match.
const processGuidanceSpecs = new Set((specifications.processGuidanceSpecs ?? []).map((spec) => spec.trackId));
const officialFormAssignments = new Map(
  (specifications.officialFormAssignments ?? []).map((assignment) => [
    `${assignment.trackId}::${assignment.componentId}`,
    assignment
  ])
);
const packetSetByTrack = new Map(packetSets.map((set) => [set.trackId, set]));
const composedByTrack = new Map((composedApprovals.tracks ?? []).map((entry) => [entry.trackId, entry]));

const trackAudits = trackRegistry.tracks.map((track) => {
  const legalReviewRow = index.legalReviewByJurisdiction.get(track.jurisdiction);
  const legalReviewRetained = legalReviewRow?.status === "present";
  const set = packetSetByTrack.get(track.trackId);
  const components = (set?.components ?? []).map((component) =>
    auditComponent(track, component, legalReviewRetained)
  );

  const audit = decideTrackAuthority({
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    outputStrategy: track.outputStrategy,
    legalReviewRetained,
    pendingAuthorityReconciliation: pendingReconciliationFor(track.jurisdiction),
    openLegalDesignBlockers: track.legalDesignBlockers ?? [],
    components
  });

  const composed = composedByTrack.get(track.trackId);

  return {
    ...audit,
    declaredOutputStrategy: track.outputStrategyDeclared ?? null,
    compositionMode: track.compositionMode ?? null,
    legalReviewAsset: legalReviewRetained
      ? governance.manifest.find(
          (row) => row.jurisdiction_code === track.jurisdiction && row.asset_class === "legal_review"
        )?.canonical_relative_path ?? null
      : null,
    // Composed routes are audited unit by unit: one unit may be an official
    // packet form and the next a portal handoff, and a single track-level
    // verdict would be wrong for both.
    units: (track.units ?? []).map((unit) => ({
      unitId: unit.unitId,
      order: unit.order ?? null,
      outputStrategy: unit.outputStrategy ?? null,
      available: unit.available ?? null,
      approvalPinned: Boolean(composed?.units?.some((entry) => entry.unitId === unit.unitId)),
      requiresPacketBinary: unit.outputStrategy === "official_pdf_fill"
    }))
  };
});

const officialComponents = trackAudits.flatMap((audit) =>
  audit.components.filter((component) => component.outputStrategy === "official_pdf_fill")
);

const trackSourceAudit = {
  schemaVersion: 1,
  authorityEdition: governance.edition.edition,
  note:
    "One authority result per packet component. An official-form component must reach one retained asset by workflow key or document ID with a matching SHA-256, correct role and correct language. A custom-pleading component is not failed for lacking an official binary, and a process-guidance component is not failed for lacking a packet form: the adopted memorandum makes both legitimate by design. No legal-design conclusion is changed here.",
  totals: {
    jurisdictionsAudited: new Set(trackAudits.map((audit) => audit.jurisdiction)).size,
    tracksAudited: trackAudits.length,
    tracksCleared: trackAudits.filter((audit) => audit.cleared).length,
    tracksBlocked: trackAudits.filter((audit) => !audit.cleared).length,
    tracksWithoutRetainedLegalReview: trackAudits.filter((audit) => !audit.legalReviewRetained).length,
    componentsAudited: trackAudits.reduce((count, audit) => count + audit.components.length, 0),
    officialPdfComponents: officialComponents.length,
    officialPdfComponentsByResult: tally(officialComponents, (component) => component.result),
    officialPdfComponentsWithPinnedSha: officialComponents.filter((component) => component.sha256Verified).length,
    customPleadingComponents: trackAudits.reduce(
      (count, audit) => count + audit.components.filter((c) => c.outputStrategy === "custom_pleading").length,
      0
    ),
    processGuidanceComponents: trackAudits.reduce(
      (count, audit) => count + audit.components.filter((c) => c.outputStrategy === "process_guidance").length,
      0
    ),
    composedTracks: trackAudits.filter((audit) => audit.compositionMode !== null).length,
    composedUnits: trackAudits.reduce((count, audit) => count + audit.units.length, 0)
  },
  tracks: trackAudits
};

// ---------------------------------------------------------------------------
// 3b. Batch 1 authority crosswalk — 117 expected source IDs
// ---------------------------------------------------------------------------
//
// The amended bundle defines 117 pre-amendment source track IDs. Every one of
// them gets exactly one express disposition here. A count difference is not an
// error by itself; an ID that quietly disappears is.
//
// The crosswalk is a *completeness* instrument. It never decides legal
// substance: the amended state addendum does that, and this pass does not
// rewrite a single normalized memo to make the arithmetic come out.

const BATCH_1_DIR = "00_GOVERNANCE/BATCH_1_AUTHORITY";
const batch1 = library.exists(`${BATCH_1_DIR}/expected/expected-track-ids.json`)
  ? buildBatch1Crosswalk()
  : null;

function buildBatch1Crosswalk() {
  const expectedIds = JSON.parse(library.readText(`${BATCH_1_DIR}/expected/expected-track-ids.json`));
  const expectedCounts = JSON.parse(library.readText(`${BATCH_1_DIR}/expected/expected-track-counts.json`));
  const byJurisdiction = expectedIds.expected_track_ids_by_jurisdiction;

  // The pre-amendment normalization supplies each expected ID's source slot.
  const preAmendment = new Map();
  for (const code of Object.keys(byJurisdiction)) {
    const file = `${BATCH_1_DIR}/pre-amendment-crosswalk/jurisdictions/${code}.normalized-tracks.json`;
    if (!library.exists(file)) continue;
    for (const track of JSON.parse(library.readText(file)).tracks ?? []) {
      preAmendment.set(track.track_id, track);
    }
  }

  const currentByTrackId = new Map(trackRegistry.tracks.map((track) => [track.trackId, track]));
  const deferredByTrackId = new Map(
    (readJson("data/record-clearing/legal-design-batch-delta-report.json").deferredTracks ?? []).map((track) => [
      track.trackId,
      track
    ])
  );
  const auditByTrackId = new Map(trackAudits.map((audit) => [audit.trackId, audit]));

  const rows = [];
  const queue = [];

  for (const [code, ids] of Object.entries(byJurisdiction)) {
    const reviewRow = governance.manifest.find(
      (row) => row.jurisdiction_code === code && row.asset_class === "legal_review"
    );
    const controllingSource = reviewRow?.canonical_relative_path ?? null;

    for (const expectedId of ids) {
      const pre = preAmendment.get(expectedId);
      const current = currentByTrackId.get(expectedId);
      const deferred = deferredByTrackId.get(expectedId);
      const audit = auditByTrackId.get(expectedId);

      let disposition;
      let amendmentEffect;
      let authorityStatus;
      let runtimeEffect;
      let requiredNextAction;

      if (current) {
        disposition = "exact_current_track";
        amendmentEffect =
          "The amended state addendum governs this track's operational classification; the current normalization carries the same source track ID.";
        authorityStatus = audit?.legalReviewRetained
          ? "legal_review_authority_retained"
          : "legal_review_authority_missing";
        runtimeEffect = "runtime_disabled";
        requiredNextAction = audit?.cleared
          ? "No crosswalk action. Track-source mapping and the remaining release gates still apply."
          : `Authority-blocked: ${(audit?.blockingReasons ?? ["not audited"])[0]}`;
      } else if (deferred) {
        // Deferred is an express, source-supported outcome, not an omission:
        // the amended matrix keeps these as true blockers, and a deferred track
        // is unregistered and unreachable rather than quietly dropped.
        disposition = "missing_from_current_normalization";
        amendmentEffect =
          "Retained as a true blocker by the amended state addendum. The track was deferred under legal_research_required rather than imported, so no strategy was asserted on counsel's behalf.";
        // Reconciled, not resolved. The source ID is accounted for and the
        // absence of a live track is intentional and source-supported; the
        // legal question the controlling review left open is still open.
        authorityStatus = reconciliationApplied(code)
          ? "reconciled_deferred_blocker"
          : "deferred_pending_legal_research";
        runtimeEffect = "absent_from_runtime_resolution_and_unreachable";
        requiredNextAction =
          (deferred.deferralReasons ?? [])
            .map((reason) => (typeof reason === "string" ? reason : reason.statement))
            .filter(Boolean)[0] ?? "Resolve the deferred legal question before normalizing this track.";
        queue.push({
          jurisdiction: code,
          sourceTrackId: expectedId,
          currentTrackId: null,
          status: reconciliationApplied(code) ? "reconciled_deferred_blocker" : "not_started",
          sourceIdAccounted: true,
          liveTrackIntentionallyAbsent: true,
          blockerRemainsOpen: true,
          normalizationReconciliationComplete: reconciliationApplied(code),
          legalDesignResolved: false,
          runtimeStatus: "runtime_disabled",
          issueType: "deferred_track_not_normalized",
          controllingAddendumSection: sectionsOf(deferred).join(" | ") || `${code} operational amendments`,
          currentStrategy: null,
          requiredStrategy: "undetermined — counsel has not settled the output strategy",
          currentLimitationClassification: "legal_design_blocker",
          requiredClassification: "legal_design_blocker",
          sourceOrFormImpact: (deferred.deferralReasons ?? [])
            .map((reason) => (typeof reason === "string" ? reason : reason.affectedElement))
            .filter(Boolean)
            .join(", "),
          buildOrReleaseImpact: "build_blocker",
          requiredRepositoryChange:
            "No repository change until counsel resolves the deferred question. The track stays unregistered and unreachable; it must not be given an invented strategy to close the crosswalk."
        });
      } else {
        disposition = "unresolved_crosswalk";
        amendmentEffect = "No express amendment accounts for this ID's absence from the current normalization.";
        authorityStatus = "authority_reconciliation_required";
        runtimeEffect = "runtime_disabled";
        requiredNextAction =
          "Locate the controlling amendment or record an express disposition. Fail closed until resolved.";
        queue.push({
          jurisdiction: code,
          sourceTrackId: expectedId,
          currentTrackId: null,
          issueType: "unresolved_crosswalk",
          controllingAddendumSection: `${code} operational amendments`,
          currentStrategy: null,
          requiredStrategy: null,
          currentLimitationClassification: null,
          requiredClassification: null,
          sourceOrFormImpact: "unknown",
          buildOrReleaseImpact: "build_blocker",
          requiredRepositoryChange:
            "Reconcile this expected source ID against the current normalization before any Batch 1 track in this jurisdiction is promoted."
        });
      }

      rows.push({
        jurisdiction: code,
        expectedSourceId: expectedId,
        expectedSourceSlot: pre
          ? { trackNumber: pre.track_number ?? null, sourceHeading: pre.source_heading ?? null, sourceTrackTitle: pre.source_track_title ?? null }
          : null,
        preAmendmentOutputStrategy: pre?.output_strategy?.mode ?? pre?.output_strategy?.raw ?? null,
        currentNormalizedIds: current ? [current.trackId] : [],
        currentNodeType: current ? "relief_track" : "not_normalized",
        currentOutputStrategy: current ? current.outputStrategy : null,
        controllingAmendedSource: controllingSource,
        amendmentEffect,
        crosswalkDisposition: disposition,
        authorityStatus,
        runtimeEffect,
        requiredNextAction
      });
    }
  }

  // Current tracks with no expected source ID would be an unexplained addition.
  const expectedSet = new Set(Object.values(byJurisdiction).flat());
  const batch1Codes = new Set(Object.keys(byJurisdiction));
  const currentOnly = trackRegistry.tracks
    .filter((track) => batch1Codes.has(track.jurisdiction) && !expectedSet.has(track.trackId))
    .map((track) => ({ jurisdiction: track.jurisdiction, trackId: track.trackId, outputStrategy: track.outputStrategy }));

  const countsByJurisdiction = {};
  for (const [code, ids] of Object.entries(byJurisdiction)) {
    const current = trackRegistry.tracks.filter((track) => track.jurisdiction === code).length;
    countsByJurisdiction[code] = {
      expected: ids.length,
      declaredExpected: expectedCounts.counts_by_jurisdiction[code],
      currentNormalized: current,
      exact: rows.filter((row) => row.jurisdiction === code && row.crosswalkDisposition === "exact_current_track").length,
      missing: rows.filter((row) => row.jurisdiction === code && row.crosswalkDisposition === "missing_from_current_normalization").length,
      unresolved: rows.filter((row) => row.jurisdiction === code && row.crosswalkDisposition === "unresolved_crosswalk").length
    };
  }

  return {
    crosswalk: {
      schemaVersion: 1,
      authorityEdition: governance.edition.edition,
      note:
        "Every expected Batch 1 source track ID receives exactly one disposition. A count difference is not an error where each ID has an express, source-supported outcome; a silently dropped ID is. This file reconciles completeness only — the amended state addendum, not this crosswalk, decides legal substance, and no normalized memo was rewritten to make the counts agree.",
      expectedSourceIds: expectedSet.size,
      declaredExpectedTotal: expectedCounts.expected_track_count,
      currentNormalizedBatch1Tracks: trackRegistry.tracks.filter((track) => batch1Codes.has(track.jurisdiction)).length,
      totals: {
        byDisposition: tally(rows, (row) => row.crosswalkDisposition),
        countsReconcileWithExpectedFile:
          expectedSet.size === expectedCounts.expected_track_count &&
          Object.entries(countsByJurisdiction).every(([, entry]) => entry.expected === entry.declaredExpected),
        currentTracksWithNoExpectedSourceId: currentOnly.length,
        jurisdictionsRequiringFollowUp: [...new Set(queue.map((entry) => entry.jurisdiction))].sort()
      },
      countsByJurisdiction,
      currentTracksWithNoExpectedSourceId: currentOnly,
      rows
    },
    delta: {
      schemaVersion: 1,
      authorityEdition: governance.edition.edition,
      note:
        "The difference between the 117 expected Batch 1 source IDs and the current normalized inventory, measured directly rather than assumed. A difference is acceptable only where every ID carries an express, source-supported disposition — which is what the crosswalk records and what this file summarises.",
      expectedSourceIds: expectedSet.size,
      currentNormalizedBatch1Tracks: trackRegistry.tracks.filter((track) => batch1Codes.has(track.jurisdiction)).length,
      difference:
        expectedSet.size - trackRegistry.tracks.filter((track) => batch1Codes.has(track.jurisdiction)).length,
      allDifferencesExpresslyDispositioned: rows.every((row) => row.crosswalkDisposition !== "unresolved_crosswalk"),
      byJurisdiction: Object.fromEntries(
        Object.entries(countsByJurisdiction).map(([code, entry]) => [
          code,
          { ...entry, difference: entry.expected - entry.currentNormalized }
        ])
      ),
      expectedIdsWithNoCurrentTrack: rows
        .filter((row) => row.currentNormalizedIds.length === 0)
        .map((row) => ({
          jurisdiction: row.jurisdiction,
          expectedSourceId: row.expectedSourceId,
          expectedSourceSlot: row.expectedSourceSlot?.sourceHeading ?? null,
          disposition: row.crosswalkDisposition,
          authorityStatus: row.authorityStatus,
          runtimeEffect: row.runtimeEffect,
          requiredNextAction: row.requiredNextAction
        })),
      currentTracksWithNoExpectedSourceId: currentOnly
    },
    queue: {
      schemaVersion: 2,
      authorityEdition: governance.edition.edition,
      status: queue.every((entry) => entry.status === "reconciled_deferred_blocker")
        ? "reconciled_deferred_blockers"
        : "not_started",
      note:
        "The bounded Batch 1 amended-normalization follow-up. `reconciled_deferred_blocker` means the source ID is accounted for, the absence of a live track is intentional and source-supported, and normalization reconciliation is complete — while the legal question the controlling review left open is still open and the route stays runtime disabled. It is not `resolved`, and nothing here was closed by inventing a strategy.",
      totals: {
        rows: queue.length,
        byIssueType: tally(queue, (entry) => entry.issueType),
        byStatus: tally(queue, (entry) => entry.status)
      },
      rows: queue
    }
  };
}

/** Whether the bounded amended-normalization pass has run for a jurisdiction. */
function reconciliationApplied(jurisdiction) {
  return authority.batch1AmendedNormalizationApplied?.byJurisdiction?.[jurisdiction] === true;
}

function sectionsOf(deferred) {
  return [
    ...new Set(
      (deferred.unresolvedQuestions ?? [])
        .map((question) => question.provenance?.sourceHeading)
        .filter(Boolean)
    )
  ];
}

// ---------------------------------------------------------------------------
// 4. Pending edition amendments
// ---------------------------------------------------------------------------

// Only an asset this repository actually holds can be proposed for a successor
// edition. An inventory row with no binary has nothing to publish.
const unmanifested = repositoryAssets.filter(
  (asset) => asset.status === "unmanifested_repository_asset" && asset.binaryPresent
);
const registryByArtifactId = new Map(artifactRegistry.artifacts.map((a) => [a.artifactId, a]));

/**
 * The final disposition for a candidate the adopted edition does not retain.
 *
 * Every rule below reads evidence the repository already holds. None of them
 * infers currentness, licensing or official status, because establishing those
 * is research and research is what a hold is for. Adopting a form as canonical
 * asserts an identity nobody has confirmed, so the honest outcome for an
 * unprovenanced binary is a hold, not an adoption.
 */
function dispositionFor(asset, artifact) {
  if (!artifact) return ["hold_legal_identity", "No repository registry record for this asset."];
  if (artifact.sourceTreatment === "historical_obsolete") {
    return ["excluded_retired_or_out_of_scope", "The repository already classifies this source as historical and obsolete."];
  }
  if (artifact.fileType === "html" || artifact.fileType === "aspx") {
    return ["not_a_workflow_asset", "Web capture rather than a workflow document."];
  }
  if (artifact.currency === "reference_only") {
    return ["adopt_reference_only", "Recorded as a reference source; logged with its hash rather than retained as an active asset."];
  }
  if (artifact.currency === "local_only") {
    return ["hold_provenance", "Local-only source. Its controlling statewide identity and issuing authority are unestablished."];
  }
  if (!artifact.officialTitle && !artifact.revision) {
    return ["hold_legal_identity", "No official title and no printed revision are recorded, so the document's legal identity is unestablished."];
  }
  return ["hold_currentness", "Identity recorded but currentness unconfirmed against the issuing authority."];
}

/** The single gate that has to close before a held candidate can be adopted. */
function remainingGateFor(disposition) {
  switch (disposition) {
    case "hold_currentness":
      return "Confirm the printed revision and current publication status with the issuing authority.";
    case "hold_provenance":
      return "Establish the issuing authority, retrieval provenance and whether the source is statewide or local.";
    case "hold_legal_identity":
      return "Establish the official title, document number and printed revision.";
    case "hold_commercial_use":
      return "Resolve the publisher's licensing and commercial-use terms.";
    case "adopt_reference_only":
      return "None. Logged as a reference source; it is not a workflow asset and is not retained.";
    case "excluded_retired_or_out_of_scope":
    case "not_a_workflow_asset":
      return "None. Excluded from the authority set.";
    default:
      return "None.";
  }
}

// Candidates this edition newly retains are resolved, not pending. Identified by
// the source group the publisher stamps on an added asset — `library_edition`
// is rewritten on every inherited row and so cannot distinguish new from
// inherited.
const ADDED_SOURCE_GROUPS = new Set(["batch1_amended_import_bundle", "batch2_repository_import"]);
const resolvedByEdition = governance.manifest.filter((row) => ADDED_SOURCE_GROUPS.has(row.source_group));

const pendingAmendments = {
  schemaVersion: 2,
  authorityEdition: governance.edition.edition,
  authorityCutoff: governance.edition.cutoff_date,
  status: "pending_review",
  note:
    "Valid repository sources the adopted edition does not retain. They are neither discarded nor treated as authoritative: each is library_authority_pending and runtime disabled until an explicitly published and adopted successor edition retains it. Every candidate carries one final disposition. An `adopt_*` disposition is only reachable where identity is already established; where it is not, the honest answer is a hold, because adopting a form as canonical would assert exactly the identity nobody has confirmed.",
  resolvedByCurrentEdition: {
    assetsRetained: resolvedByEdition.length,
    byAssetClass: tally(resolvedByEdition, (row) => row.asset_class),
    dispositions: resolvedByEdition.map((row) => ({
      jurisdiction: row.jurisdiction_code,
      workflowKey: row.workflow_key,
      sha256: row.sha256,
      disposition: row.asset_class === "legal_review" ? "adopt_legal_review" : `adopt_${row.asset_class}`,
      canonicalRelativePath: row.canonical_relative_path
    }))
  },
  totals: {
    candidates: unmanifested.length,
    byJurisdiction: tally(unmanifested, (asset) => asset.jurisdiction),
    byProposedAssetClass: tally(unmanifested, (asset) => proposedAssetClass(registryByArtifactId.get(asset.artifactId))),
    byDisposition: tally(unmanifested, (asset) => dispositionFor(asset, registryByArtifactId.get(asset.artifactId))[0]),
    referencedByANormalizedTrack: 0
  },
  candidates: unmanifested.map((asset) => {
    const artifact = registryByArtifactId.get(asset.artifactId);
    const referencingComponents = officialComponents.filter(
      (component) => component.result === "authority_unmanifested_source" && component.jurisdiction === asset.jurisdiction
    );
    return {
      jurisdiction: asset.jurisdiction,
      documentId: artifact?.artifactId ?? asset.artifactId,
      title: artifact?.officialTitle ?? null,
      role: artifact?.role ?? null,
      language: "EN",
      revision: artifact?.revision ?? artifact?.revisionDate ?? null,
      sourceUrl: null,
      retrievalDate: artifact?.retrievalDate ?? null,
      structuralClass: artifact?.technicalClass ?? null,
      pages: artifact?.pages ?? null,
      fieldCount: artifact?.fieldCount ?? null,
      sha256: asset.sha256,
      repositoryPath: asset.sourcePath,
      // Held candidates have no canonical path: a canonical path is what
      // adoption grants, and naming one for an unadopted asset would imply a
      // retention that has not happened.
      canonicalRelativePath: null,
      proposedAssetClass: proposedAssetClass(artifact),
      proposedTrackMappings: referencingComponents.map((component) => ({
        trackId: component.trackId,
        componentId: component.componentId,
        officialFormId: component.officialFormId
      })),
      reasonForAddition:
        "Held in the repository source corpus and not retained by the adopted edition. Required before any track that depends on it can be mapped.",
      sourceAndCurrentnessQuestions: [
        "Confirm the issuing authority, official title, printed revision and current publication status.",
        "Confirm licensing and commercial-use terms.",
        "Confirm the asset class: packet form, instructions, supporting process, source-gated or excluded."
      ],
      buildOrReleaseEffect:
        referencingComponents.length > 0
          ? "release_blocker: a normalized official-form component in this jurisdiction has no retained Edition 1 asset."
          : "none_yet: no normalized component currently depends on this asset.",
      libraryAuthorityStatus: "library_authority_pending",
      runtimeStatus: "runtime_disabled",
      runtimeEffect: "not_resolver_selectable",
      disposition: dispositionFor(asset, artifact)[0],
      dispositionRationale: dispositionFor(asset, artifact)[1],
      remainingGate: remainingGateFor(dispositionFor(asset, artifact)[0])
    };
  })
};
pendingAmendments.totals.referencedByANormalizedTrack = pendingAmendments.candidates.filter(
  (candidate) => candidate.proposedTrackMappings.length > 0
).length;

// ---------------------------------------------------------------------------
// 5. Authoritative blocker ledger
// ---------------------------------------------------------------------------

const ledgerRows = [];

// Scope 1 — Master Library source gap. The edition's own ledger, unmodified.
for (const gap of governance.sourceGaps) {
  ledgerRows.push({
    authorityEdition: governance.edition.edition,
    jurisdiction: gap.jurisdiction_code,
    trackId: null,
    documentId: gap.requested_item,
    blockerScope: "master_library_source_gap",
    blockerType: gap.item_type,
    impact: gap.impact,
    controllingLibraryRow: `MISSING_FILES_AND_SOURCE_GAPS.csv:${gap.jurisdiction_code}:${gap.item_type}:${gap.requested_item}`,
    currentRepositoryTreatment:
      trackRegistry.tracks.some((track) => track.jurisdiction === gap.jurisdiction_code)
        ? "jurisdiction normalized in this repository; every track runtime_disabled"
        : "jurisdiction not yet normalized in this repository",
    requiredResolution: gap.next_action,
    runtimeEffect: gap.impact === "release_blocker" || gap.impact === "build_blocker" ? "runtime_disabled" : "none",
    dedupeKey: `library-gap:${gap.jurisdiction_code}:${gap.item_type}:${slug(gap.requested_item)}`
  });
}

// Scope 2 — legal-design blocker. LegalEase cannot determine what to generate.
for (const track of trackRegistry.tracks) {
  for (const statement of track.legalDesignBlockers ?? []) {
    ledgerRows.push({
      authorityEdition: governance.edition.edition,
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      documentId: null,
      blockerScope: "legal_design_blocker",
      blockerType: "undetermined_design_element",
      impact: "build_blocker",
      controllingLibraryRow: legalReviewRowFor(track.jurisdiction),
      currentRepositoryTreatment: "track normalized and runtime_disabled",
      requiredResolution: statement,
      runtimeEffect: "runtime_disabled",
      dedupeKey: `legal-design:${track.jurisdiction}:${track.trackId}:${slug(statement)}`
    });
  }
  for (const statement of track.releaseBlockers ?? []) {
    const text = typeof statement === "string" ? statement : statement.question ?? JSON.stringify(statement);
    ledgerRows.push({
      authorityEdition: governance.edition.edition,
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      documentId: null,
      blockerScope: "source_or_currentness_blocker",
      blockerType: "open_release_question",
      impact: "release_blocker",
      controllingLibraryRow: legalReviewRowFor(track.jurisdiction),
      currentRepositoryTreatment: "track normalized and runtime_disabled",
      requiredResolution: text,
      runtimeEffect: "runtime_disabled",
      dedupeKey: `release-question:${track.jurisdiction}:${track.trackId}:${slug(text)}`
    });
  }
}

// Scope 3 — mapping blocker. The source exists but is not mapped to the track.
for (const audit of trackAudits) {
  for (const component of audit.components) {
    if (component.outputStrategy !== "official_pdf_fill") continue;
    if (component.result === "authority_mapped_packet_candidate" && component.sha256Verified) continue;
    ledgerRows.push({
      authorityEdition: governance.edition.edition,
      jurisdiction: audit.jurisdiction,
      trackId: audit.trackId,
      documentId: component.officialFormId,
      blockerScope: "mapping_blocker",
      blockerType: component.result ?? "not_audited",
      impact: "release_blocker",
      controllingLibraryRow: component.asset ? component.asset.workflowKey : "MASTER_ASSET_MANIFEST.csv:no-matching-row",
      currentRepositoryTreatment: "component normalized and runtime_disabled",
      requiredResolution:
        component.result === "authority_unmanifested_source"
          ? "Retain the source in an adopted successor edition, then map the component to its workflow key and SHA-256."
          : component.result === "authority_mapped_source_gated"
            ? "Clear the edition's source gate for this asset, or keep the component release-disabled while retaining its packet identity."
            : "Pin the mapped asset's SHA-256 on the track source relationship and confirm role, language and revision.",
      runtimeEffect: "runtime_disabled",
      dedupeKey: `mapping:${audit.jurisdiction}:${audit.trackId}:${component.componentId}`
    });
  }
}

// Scope 4 — technical blocker. Field mapping, rendering and output proof.
for (const track of trackRegistry.tracks) {
  for (const blocker of track.blockers ?? []) {
    if (!["technical_proof_gate", "visual_review_gate", "output_review_gate"].includes(blocker.kind)) continue;
    ledgerRows.push({
      authorityEdition: governance.edition.edition,
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      documentId: null,
      blockerScope: blocker.kind === "technical_proof_gate" ? "technical_blocker" : "visual_or_legal_output_blocker",
      blockerType: blocker.kind,
      impact: "release_blocker",
      controllingLibraryRow: "WORKFLOW_INTEGRATION.md:release-gates",
      currentRepositoryTreatment: "track normalized and runtime_disabled",
      requiredResolution: blocker.statement,
      runtimeEffect: "runtime_disabled",
      dedupeKey: `${blocker.kind}:${track.jurisdiction}:${track.trackId}`
    });
  }
}

// Scope 4b — legal-review coverage. A jurisdiction with no retained controlling
// review cannot have any track mapped to a form. Recorded once per jurisdiction,
// not once per track, so one authority problem stays one blocker.
for (const row of governance.legalReviewCoverage) {
  if (row.status === "present") continue;
  const normalized = trackRegistry.tracks.filter((track) => track.jurisdiction === row.jurisdiction_code).length;
  ledgerRows.push({
    authorityEdition: governance.edition.edition,
    jurisdiction: row.jurisdiction_code,
    trackId: null,
    documentId: null,
    blockerScope: "legal_review_coverage_blocker",
    blockerType: "no_retained_controlling_review",
    impact: "release_blocker",
    controllingLibraryRow: `LEGAL_REVIEW_COVERAGE.csv:${row.jurisdiction_code}:${row.status}`,
    currentRepositoryTreatment:
      normalized > 0 ? `${normalized} normalized tracks, all runtime_disabled` : "not yet normalized",
    requiredResolution: row.required_action,
    runtimeEffect: "runtime_disabled",
    dedupeKey: `legal-review-coverage:${row.jurisdiction_code}`
  });
}

// Scope 4c — legal-design reconciliation. One row per jurisdiction whose
// controlling review was adopted after its normalization was written, plus one
// row per expected source ID with no current track. Those are two different
// facts — "the live tracks have not been read against the amended source" and
// "this ID was never normalized" — so they are separate rows rather than the
// same authority problem counted twice.
for (const jurisdiction of [...new Set(trackRegistry.tracks.map((track) => track.jurisdiction))].sort()) {
  const pending = pendingReconciliationFor(jurisdiction);
  if (!pending) continue;
  const affected = trackAudits.filter((audit) => audit.jurisdiction === jurisdiction).length;
  ledgerRows.push({
    authorityEdition: governance.edition.edition,
    jurisdiction,
    trackId: null,
    documentId: null,
    blockerScope: "legal_design_reconciliation_blocker",
    blockerType: "normalization_predates_adopted_controlling_review",
    impact: "release_blocker",
    controllingLibraryRow:
      governance.manifest.find((row) => row.jurisdiction_code === jurisdiction && row.asset_class === "legal_review")
        ?.canonical_relative_path ?? "LEGAL_REVIEW_COVERAGE.csv",
    currentRepositoryTreatment: `${affected} normalized tracks preserved unchanged and failed closed in this publication pass`,
    requiredResolution:
      "Run the bounded Batch 1 amended-normalization pass: read the controlling addendum and the 117-track authority crosswalk against every live track, then set batch1AmendedNormalizationApplied.",
    runtimeEffect: "runtime_disabled",
    dedupeKey: `batch1-reconciliation-jurisdiction:${jurisdiction}`
  });
}

for (const entry of batch1?.queue.rows ?? []) {
  ledgerRows.push({
    authorityEdition: governance.edition.edition,
    jurisdiction: entry.jurisdiction,
    trackId: entry.currentTrackId ?? entry.sourceTrackId,
    documentId: null,
    blockerScope: "legal_design_reconciliation_blocker",
    blockerType: entry.issueType,
    impact: entry.buildOrReleaseImpact,
    controllingLibraryRow: entry.controllingAddendumSection,
    currentRepositoryTreatment:
      entry.currentTrackId === null
        ? "expected source ID has no current normalized track; unregistered and unreachable"
        : "current normalized track preserved unchanged in this publication pass",
    requiredResolution: entry.requiredRepositoryChange,
    runtimeEffect: "runtime_disabled",
    dedupeKey: `batch1-reconciliation:${entry.jurisdiction}:${entry.sourceTrackId}`
  });
}

// Scope 5 — jurisdiction input required. A local implementation has not been supplied.
for (const gap of governance.sourceGaps) {
  if (gap.impact !== "jurisdiction_input_required") continue;
  const existing = ledgerRows.find(
    (row) => row.dedupeKey === `library-gap:${gap.jurisdiction_code}:${gap.item_type}:${slug(gap.requested_item)}`
  );
  if (existing) existing.blockerScope = "jurisdiction_input_requirement";
}

const dedupedLedger = [];
const seenKeys = new Set();
for (const row of ledgerRows) {
  if (seenKeys.has(row.dedupeKey)) continue;
  seenKeys.add(row.dedupeKey);
  dedupedLedger.push(row);
}

// A commercial-use blocker is recorded where the edition's own notes flag the
// publisher's licensing terms. It is a distinct scope from currentness: a form
// can be confirmed current and still be unusable commercially.
for (const row of governance.manifest) {
  if (!/non-commercial|commercial-use|commercial use/i.test(`${row.notes} ${row.required_follow_up}`)) continue;
  ledgerRows.push({
    authorityEdition: governance.edition.edition,
    jurisdiction: row.jurisdiction_code,
    trackId: null,
    documentId: row.document_id,
    blockerScope: "commercial_use_blocker",
    blockerType: "publisher_licensing_terms_unresolved",
    impact: "release_blocker",
    controllingLibraryRow: row.workflow_key,
    currentRepositoryTreatment: "asset retained source-gated and never resolver-selectable",
    requiredResolution: row.required_follow_up,
    runtimeEffect: "runtime_disabled",
    dedupeKey: `commercial-use:${row.jurisdiction_code}:${row.document_id}`
  });
}

// Runtime promotion. Every retained asset in the edition is generation-disabled,
// so no route can be promoted from the library alone. Recorded once, as an
// edition-level fact, rather than repeated per asset.
ledgerRows.push({
  authorityEdition: governance.edition.edition,
  jurisdiction: null,
  trackId: null,
  documentId: null,
  blockerScope: "runtime_promotion_blocker",
  blockerType: "generation_disabled_edition_wide",
  impact: "release_blocker",
  controllingLibraryRow: "WORKFLOW_INTEGRATION.md:release-gates",
  currentRepositoryTreatment: `all ${governance.manifest.length} retained assets carry generation_allowed = no`,
  requiredResolution:
    "Promotion happens in this repository through an auditable legal-design and renderer change, per track, never by moving a file inside the archive.",
  runtimeEffect: "runtime_disabled",
  dedupeKey: "runtime-promotion:edition-wide"
});

const blockerLedger = {
  schemaVersion: 2,
  authorityEdition: governance.edition.edition,
  note:
    "Blocker scopes are joined, not summed. A Master Library source gap, a legal-design blocker and a mapping blocker are different questions about the same build and are counted separately; the joined unique count deduplicates by dedupeKey so one issue appearing in a state review and in the edition's gap ledger is counted once. No total here is hard-coded in application logic.",
  scopes: {
    master_library_source_gap:
      "Derived from MISSING_FILES_AND_SOURCE_GAPS.csv. The edition records the source as missing, unposted, unconfirmed or local-only.",
    legal_review_coverage_blocker:
      "The adopted edition retains no controlling legal review for the jurisdiction. Counted once per jurisdiction.",
    legal_design_reconciliation_blocker:
      "The controlling amended source and the current normalization disagree, or an expected source track ID has no express disposition. Failed closed rather than reconciled by rewriting the normalization.",
    legal_design_blocker:
      "Derived from normalized track data. LegalEase cannot determine what to generate.",
    source_or_currentness_blocker:
      "The source exists, but revision, currentness, provenance, licensing or official status remains open.",
    mapping_blocker:
      "The source exists but is not mapped to the correct normalized track or packet unit under the adopted edition.",
    commercial_use_blocker: "The publisher's licensing or commercial-use terms are unresolved.",
    technical_blocker: "Field mapping, rendering, storage, access or completed-output proof is incomplete.",
    visual_or_legal_output_blocker: "A rendered output has not passed legal and visual review.",
    jurisdiction_input_requirement:
      "A priority county, court, district, circuit or local implementation has not been supplied.",
    runtime_promotion_blocker:
      "Edition-wide: every retained asset is generation-disabled, so nothing can be promoted from the library alone."
  },
  editionDelta: parentEditionDelta(),
  totals: {
    masterLibrarySourceGapRows: governance.sourceGaps.length,
    masterLibrarySourceGapsByImpact: tally(governance.sourceGaps, (gap) => gap.impact),
    byScope: tally(dedupedLedger, (row) => row.blockerScope),
    joinedUniqueReleaseBlockers: dedupedLedger.filter((row) => row.impact === "release_blocker").length,
    joinedUniqueBuildBlockers: dedupedLedger.filter((row) => row.impact === "build_blocker").length,
    joinedUniqueRows: dedupedLedger.length,
    rowsBeforeDedupe: ledgerRows.length
  },
  rows: dedupedLedger
};

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

fs.mkdirSync(OUT_DIR, { recursive: true });
writeJson("reconciliation.json", reconciliation);
writeJson("repository-asset-audit.json", repositoryAssetAudit);
writeJson("track-source-audit.json", trackSourceAudit);
writeJson("pending-edition-amendments.json", pendingAmendments);
writeJson("authoritative-blocker-ledger.json", blockerLedger);
if (batch1) {
  writeJson("batch-1-authority-crosswalk.json", batch1.crosswalk);
  writeJson("batch-1-authority-delta.json", batch1.delta);
  writeJson("batch-1-amended-normalization-queue.json", batch1.queue);
}

console.log(`1. Edition integrity: ${checksumResult.verified}/${checksumResult.checksumLines} checksums verified, ${checksumResult.mismatches.length} mismatched, ${checksumResult.missing.length} missing.`);
console.log(`2. Repository assets: ${repositoryAssets.length} audited — ${JSON.stringify(repositoryAssetAudit.totals.byStatus)}`);
console.log(`3. Tracks: ${trackSourceAudit.totals.tracksAudited} audited across ${trackSourceAudit.totals.jurisdictionsAudited} jurisdictions; ${trackSourceAudit.totals.tracksCleared} authority-cleared.`);
console.log(`4. Official-form components: ${JSON.stringify(trackSourceAudit.totals.officialPdfComponentsByResult)}`);
console.log(`5. Pending edition amendments: ${pendingAmendments.totals.candidates}.`);
console.log(`6. Blocker ledger: ${blockerLedger.totals.joinedUniqueRows} unique rows across ${Object.keys(blockerLedger.totals.byScope).length} scopes.`);
if (batch1) {
  console.log(
    `7. Batch 1 crosswalk: ${batch1.crosswalk.expectedSourceIds} expected source IDs — ${JSON.stringify(batch1.crosswalk.totals.byDisposition)}; ${batch1.queue.totals.rows} follow-up rows queued.`
  );
}
console.log("8. Nothing was promoted. Every audited track remains runtime_disabled.");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Whether a jurisdiction's tracks are still awaiting reconciliation against a
 * newly retained controlling source.
 *
 * Edition 1.1 retained twelve amended Batch 1 reviews. The tracks in those
 * jurisdictions were normalized before this edition adopted those reviews as
 * authority, and the 117-track crosswalk has not yet been read against the live
 * registry track by track. Until the bounded amended-normalization pass runs,
 * every affected track fails closed: a retained review answers "is there an
 * authority?", not "does the existing normalization agree with it?".
 */
function pendingReconciliationFor(jurisdiction) {
  const review = governance.manifest.find(
    (row) => row.jurisdiction_code === jurisdiction && row.asset_class === "legal_review"
  );
  if (review?.source_group !== "batch1_amended_import_bundle") return null;

  // Jurisdiction-specific by design. A jurisdiction whose reconciliation has run
  // is cleared; one that has not stays blocked, and there is no global switch
  // that could clear an unreconciled jurisdiction along with the rest.
  const applied = authority.batch1AmendedNormalizationApplied?.byJurisdiction ?? {};
  if (applied[jurisdiction] === true) return null;

  return {
    required: true,
    reason:
      "legal_design_reconciliation_required: the controlling review was adopted as authority after this jurisdiction was normalized, and the 117-track authority crosswalk has not yet been reconciled against the live registry. Queued in batch-1-amended-normalization-queue.json."
  };
}

function auditComponent(track, component, legalReviewRetained) {
  const relationship = relationshipByComponent.get(`${track.trackId}::${component.componentId}`);
  const base = {
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    componentId: component.componentId,
    role: component.role,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId ?? null,
    officialSourceUrl: component.officialSourceUrl ?? null,
    repositoryMappingStatus:
      officialFormAssignments.get(`${track.trackId}::${component.componentId}`)?.mappingStatus ?? null,
    corpusState: relationship?.corpusState ?? null,
    sha256Verified: Boolean(relationship?.sha256),
    asset: null,
    result: null,
    reasons: []
  };

  if (component.outputStrategy === "custom_pleading") {
    const hasSpec = customPleadingSpecs.has(`${track.trackId}::${component.componentId}`);
    return {
      ...base,
      result: null,
      requiresPacketBinary: false,
      specificationPresent: hasSpec,
      reasons: [
        hasSpec
          ? "Custom pleading by adopted design: a counsel-approved pleading is the statewide fallback where the law permits a participant petition and no current controlling form is identified. No official binary is required."
          : "Custom-pleading component has no custom-pleading specification in this repository."
      ]
    };
  }

  if (component.outputStrategy === "process_guidance") {
    const hasSpec = processGuidanceSpecs.has(track.trackId);
    return {
      ...base,
      result: null,
      requiresPacketBinary: false,
      specificationPresent: hasSpec,
      reasons: [
        hasSpec
          ? "Process guidance by adopted design: no participant filing is produced, so no packet binary is required. This is not a source gap."
          : "Process-guidance component has no guidance specification in this repository."
      ]
    };
  }

  // official_pdf_fill
  const formId = component.officialFormId;
  const reasons = [];
  if (!formId) {
    return { ...base, result: "authority_unmanifested_source", requiresPacketBinary: true, reasons: ["Official-form component carries no official form ID."] };
  }

  let candidates = index.byJurisdictionDocumentId.get(`${track.jurisdiction}:${documentIdKey(formId)}`) ?? [];
  let revisionSuffixJoin = null;

  // Some repository form IDs append the revision to the document ID
  // (`KSJC-PETITION-...-02-2013`), which the naming standard keeps in a separate
  // field. Stripping that suffix is a structural normalization, not a fuzzy
  // name match — and it is only accepted when the stripped revision *agrees*
  // with the retained asset's revision. A disagreement is a revision question,
  // never a silent match between two revisions of one form.
  if (candidates.length === 0) {
    const stripped = stripRevisionSuffix(formId);
    if (stripped) {
      const byBase = index.byJurisdictionDocumentId.get(`${track.jurisdiction}:${documentIdKey(stripped.documentId)}`) ?? [];
      if (byBase.length > 0) {
        candidates = byBase;
        revisionSuffixJoin = stripped;
      }
    }
  }

  if (candidates.length === 0) {
    return {
      ...base,
      result: "authority_unmanifested_source",
      requiresPacketBinary: true,
      candidateLibraryEvidence: secondaryEvidence(track.jurisdiction, formId),
      reasons: [
        `No retained Edition ${governance.edition.edition} asset for ${track.jurisdiction} document ID ${formId}. Any candidate rows recorded here are secondary evidence for a future edition, not a mapping.`
      ]
    };
  }

  const row = candidates[0];
  const asset = toAssetRef(row);
  let result;

  if (row.asset_class === "source_gated") {
    result = "authority_mapped_source_gated";
    reasons.push(
      "Mapped to a source-gated asset. This establishes form identity, packet identity, document role and packet composition, and remains release-disabled and never resolver-selectable."
    );
  } else if (row.asset_class === "packet_form") {
    result = "authority_mapped_packet_candidate";
    reasons.push(`Mapped to retained packet-form candidate ${row.workflow_key}.`);
    if (!base.sha256Verified) {
      reasons.push(
        "The track source relationship pins no SHA-256, so the mapping does not yet meet the edition's matching-hash requirement."
      );
    }
  } else {
    result = "authority_role_mismatch";
    reasons.push(
      `Mapped to a retained ${row.asset_class} asset, which cannot fill a ${component.role} component. Instructions and supporting-process assets are assembled around a packet; they do not replace one.`
    );
  }

  if (revisionSuffixJoin) {
    const editionRevision = normalizeRevision(row.revision);
    if (editionRevision && editionRevision !== revisionSuffixJoin.revision) {
      result = "authority_mapped_revision_pending";
      reasons.push(
        `The component names revision ${revisionSuffixJoin.revision}; the edition retains ${editionRevision}. Two revisions of one form are not interchangeable.`
      );
    } else {
      reasons.push(
        `Joined by document ID after removing the revision suffix the repository appends to the form ID, with revision ${revisionSuffixJoin.revision} confirmed against the retained asset.`
      );
    }
  }

  if (candidates.length > 1) {
    const shas = new Set(candidates.map((candidate) => candidate.sha256));
    if (shas.size > 1) {
      result = "authority_hash_conflict";
      reasons.push(`${candidates.length} retained rows share this document ID at ${shas.size} different hashes.`);
    }
  }

  // The exclusion log records paths. A retained asset sharing bytes with a
  // logged duplicate path is the deduplication rule working and is not a
  // retirement; only a content-retirement status disqualifies the mapping.
  const retired = (index.excludedSha.get(row.sha256) ?? []).filter(
    (exclusion) => !isDuplicatePathExclusion(exclusion)
  );
  if (retired.length > 0) {
    result = "authority_missing_asset";
    reasons.push(
      `The mapped bytes are logged as ${retired[0].status} in the exclusion/retirement log and may not be used as a current source.`
    );
  }
  if (!retainedFiles.has(row.canonical_relative_path)) {
    result = "authority_missing_asset";
    reasons.push("The adopted edition names this asset but does not retain its file.");
  }

  if (!legalReviewRetained) {
    reasons.push("The adopted edition retains no controlling legal review for this jurisdiction.");
  }

  return { ...base, result, asset, requiresPacketBinary: true, reasons };
}

/**
 * Records same-jurisdiction rows whose document ID shares a leading token with
 * the requested form ID. Advisory only: it never becomes a mapping, because a
 * partial name match is exactly the filename-derived routing the edition
 * prohibits.
 */
function secondaryEvidence(jurisdiction, formId) {
  const wanted = documentIdKey(formId);
  return governance.manifest
    .filter((row) => row.jurisdiction_code === jurisdiction)
    .filter((row) => {
      const key = documentIdKey(row.document_id);
      return key.length >= 4 && (key.startsWith(wanted.slice(0, 6)) || wanted.startsWith(key.slice(0, 6)));
    })
    .map((row) => ({
      workflowKey: row.workflow_key,
      assetClass: row.asset_class,
      officialTitle: row.official_title,
      revision: row.revision,
      sha256: row.sha256,
      evidenceOnly: true
    }));
}

/** Splits a `<DOCUMENT-ID>-MM-YYYY` or `<DOCUMENT-ID>-YYYY-MM` form ID. */
function stripRevisionSuffix(formId) {
  const monthFirst = /^(.*?)[-_](0[1-9]|1[0-2])[-_](19|20)(\d{2})$/.exec(formId);
  if (monthFirst) {
    return { documentId: monthFirst[1], revision: `${monthFirst[3]}${monthFirst[4]}-${monthFirst[2]}` };
  }
  const yearFirst = /^(.*?)[-_]((?:19|20)\d{2})[-_](0[1-9]|1[0-2])$/.exec(formId);
  if (yearFirst) {
    return { documentId: yearFirst[1], revision: `${yearFirst[2]}-${yearFirst[3]}` };
  }
  return null;
}

/** `REV-2013-02` and `REV-2013-02-14` both normalize to `2013-02`. */
function normalizeRevision(revision) {
  const match = /(?:REV|SOURCE|ASOF)-((?:19|20)\d{2})-(\d{2})/.exec(String(revision ?? ""));
  return match ? `${match[1]}-${match[2]}` : null;
}

function statusForManifestedAsset(row) {
  switch (row.asset_class) {
    case "packet_form":
      return "manifested_packet_form";
    case "instructions":
      return "manifested_instruction";
    case "supporting_process":
      return "manifested_supporting_process";
    case "source_gated":
      return "manifested_source_gated";
    case "legal_review":
      return "manifested_exact";
    default:
      return "manifested_exact";
  }
}

function compareRevision(artifact, libraryRow) {
  if (!libraryRow || !libraryRow.revision) return "unknown";
  const declared = artifact.revision ?? artifact.revisionDate ?? null;
  if (!declared || declared === "unknown") return "unknown";
  const normalize = (value) => String(value).toLowerCase().replace(/[^0-9a-z]/g, "");
  return normalize(declared) === normalize(libraryRow.revision) ? "matches" : "differs";
}

function isNonWorkflowAsset(artifact) {
  return artifact.fileType === "html" || artifact.fileType === "aspx";
}

function proposedAssetClass(artifact) {
  if (!artifact) return "unknown";
  if (artifact.sourceTreatment === "source_gated") return "source_gated";
  if (artifact.sourceTreatment === "reference_only") return "excluded_or_reference";
  if (artifact.sourceTreatment === "historical_obsolete") return "retired";
  if (artifact.fileType === "html" || artifact.fileType === "aspx") return "excluded_or_reference";
  if (artifact.technicalClass === "no_pdf_required") return "supporting_process";
  return "packet_form";
}

function legalReviewRowFor(jurisdiction) {
  const row = index.legalReviewByJurisdiction.get(jurisdiction);
  if (!row) return "LEGAL_REVIEW_COVERAGE.csv:no-row";
  return row.status === "present"
    ? `LEGAL_REVIEW_COVERAGE.csv:${jurisdiction}:present`
    : `LEGAL_REVIEW_COVERAGE.csv:${jurisdiction}:missing`;
}

function toAssetRef(row) {
  return {
    libraryEdition: row.library_edition,
    jurisdictionCode: row.jurisdiction_code,
    workflowKey: row.workflow_key,
    documentId: row.document_id,
    documentRole: row.document_role,
    officialTitle: row.official_title,
    revision: row.revision,
    language: row.language,
    assetClass: row.asset_class,
    canonicalRelativePath: row.canonical_relative_path,
    sha256: row.sha256,
    packetCandidate: row.packet_candidate === "yes",
    generationAllowed: row.generation_allowed === "yes",
    runtimeStatus: row.runtime_status
  };
}

function reconcileStateCoverage() {
  const mismatches = [];
  for (const row of governance.stateCoverage) {
    const code = row.jurisdiction_code;
    const counted = governance.manifest.filter((entry) => entry.jurisdiction_code === code);
    const declared = Number(row.total_assets);
    if (counted.length !== declared) {
      mismatches.push({ jurisdiction: code, declared, counted: counted.length });
    }
  }
  return { reconciles: mismatches.length === 0, mismatches };
}

function tally(list, keyOf) {
  const counts = {};
  for (const item of list) {
    const key = String(keyOf(item));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function shallowEqual(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

/**
 * Compares this run against the audit committed under the parent edition.
 *
 * Read from git rather than recomputed, so the "before" column is the number
 * that was actually published rather than a reconstruction of it. Absent
 * history is reported as unavailable rather than filled in with a guess.
 */
function parentEditionDelta() {
  // Pinned to the commit that adopted the parent edition, not to HEAD. Reading
  // HEAD would make this file depend on whether it had been committed yet, so
  // the delta would collapse to zeros the moment it was.
  const ref = authority.adoptedAgainstCommit;
  const before = gitJson(ref, "data/record-clearing/master-library/track-source-audit.json");
  const beforeAssets = gitJson(ref, "data/record-clearing/master-library/repository-asset-audit.json");
  const beforeLedger = gitJson(ref, "data/record-clearing/master-library/authoritative-blocker-ledger.json");
  const beforeReconciliation = gitJson(ref, "data/record-clearing/master-library/reconciliation.json");
  if (!before || !beforeAssets || !beforeLedger) {
    return { available: false, note: "No committed parent-edition audit to compare against." };
  }

  const beforeResults = before.totals.officialPdfComponentsByResult ?? {};
  const afterResults = trackSourceAudit.totals.officialPdfComponentsByResult ?? {};
  const resultKeys = [...new Set([...Object.keys(beforeResults), ...Object.keys(afterResults)])].sort();

  return {
    available: true,
    parentEdition: before.authorityEdition,
    comparedAgainstCommit: ref,
    currentEdition: governance.edition.edition,
    note:
      "Manifested is not release-ready. A component moving out of `authority_unmanifested_source` has gained an identity in the adopted edition; it has not gained a release.",
    officialPdfComponents: Object.fromEntries(
      resultKeys.map((key) => [key, { before: beforeResults[key] ?? 0, after: afterResults[key] ?? 0 }])
    ),
    legalReviewCoverage: {
      before: beforeReconciliation?.coverage?.legalReviewsPresent ?? null,
      after: governance.edition.jurisdictions_with_legal_review,
      missingBefore: beforeReconciliation?.coverage?.legalReviewsMissing ?? null,
      missingAfter: governance.edition.jurisdictions_missing_legal_review,
      note:
        "The twelve reviews Edition 1.0 lacked were exactly the twelve Batch 1 jurisdictions, and closing them is why the source-gap ledger drops by twelve rows."
    },
    tracksAuthorityCleared: { before: before.totals.tracksCleared, after: trackSourceAudit.totals.tracksCleared },
    tracksWithoutRetainedLegalReview: {
      before: before.totals.tracksWithoutRetainedLegalReview,
      after: trackSourceAudit.totals.tracksWithoutRetainedLegalReview
    },
    repositoryAssetsByStatus: Object.fromEntries(
      [...new Set([...Object.keys(beforeAssets.totals.byStatus), ...Object.keys(repositoryAssetAudit.totals.byStatus)])]
        .sort()
        .map((key) => [
          key,
          { before: beforeAssets.totals.byStatus[key] ?? 0, after: repositoryAssetAudit.totals.byStatus[key] ?? 0 }
        ])
    ),
    blockersByScope: Object.fromEntries(
      [...new Set([...Object.keys(beforeLedger.totals.byScope), ...Object.keys(tally(dedupedLedger, (row) => row.blockerScope))])]
        .sort()
        .map((key) => [
          key,
          {
            before: beforeLedger.totals.byScope[key] ?? 0,
            after: tally(dedupedLedger, (row) => row.blockerScope)[key] ?? 0
          }
        ])
    ),
    joinedUniqueRows: { before: beforeLedger.totals.joinedUniqueRows, after: dedupedLedger.length }
  };
}

function gitJson(ref, relativePath) {
  const result = spawnSync("git", ["show", `${ref}:${relativePath}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024
  });
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(OUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}
