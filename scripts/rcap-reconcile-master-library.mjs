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
// 4. Pending edition amendments
// ---------------------------------------------------------------------------

// Only an asset this repository actually holds can be proposed for a successor
// edition. An inventory row with no binary has nothing to publish.
const unmanifested = repositoryAssets.filter(
  (asset) => asset.status === "unmanifested_repository_asset" && asset.binaryPresent
);
const registryByArtifactId = new Map(artifactRegistry.artifacts.map((a) => [a.artifactId, a]));

const pendingAmendments = {
  schemaVersion: 1,
  authorityEdition: governance.edition.edition,
  authorityCutoff: governance.edition.cutoff_date,
  status: "pending_review",
  note:
    "Valid repository sources the adopted edition does not retain. They are neither discarded nor treated as authoritative: each is library_authority_pending and runtime disabled until an explicitly published and adopted successor edition retains it. This file is the input to that publication task. It is not Edition 1.1 and does not amend Edition 1.",
  totals: {
    candidates: unmanifested.length,
    byJurisdiction: tally(unmanifested, (asset) => asset.jurisdiction),
    byProposedAssetClass: tally(unmanifested, (asset) => proposedAssetClass(registryByArtifactId.get(asset.artifactId))),
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
      revision: artifact?.revision ?? artifact?.revisionDate ?? null,
      sourceUrl: null,
      retrievalDate: artifact?.retrievalDate ?? null,
      structuralClass: artifact?.technicalClass ?? null,
      fieldCount: artifact?.fieldCount ?? null,
      sha256: asset.sha256,
      repositoryPath: asset.sourcePath,
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
      runtimeStatus: "runtime_disabled"
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

const blockerLedger = {
  schemaVersion: 1,
  authorityEdition: governance.edition.edition,
  note:
    "Blocker scopes are joined, not summed. A Master Library source gap, a legal-design blocker and a mapping blocker are different questions about the same build and are counted separately; the joined unique count deduplicates by dedupeKey so one issue appearing in a state review and in the edition's gap ledger is counted once. No total here is hard-coded in application logic.",
  scopes: {
    master_library_source_gap:
      "Derived from MISSING_FILES_AND_SOURCE_GAPS.csv. The edition records the source as missing, unposted, unconfirmed or local-only.",
    legal_design_blocker:
      "Derived from normalized track data. LegalEase cannot determine what to generate.",
    source_or_currentness_blocker:
      "The source exists, but revision, currentness, provenance, licensing or official status remains open.",
    mapping_blocker:
      "The source exists but is not mapped to the correct normalized track or packet unit under the adopted edition.",
    technical_blocker: "Field mapping, rendering, storage, access or completed-output proof is incomplete.",
    visual_or_legal_output_blocker: "A rendered output has not passed legal and visual review.",
    jurisdiction_input_requirement:
      "A priority county, court, district, circuit or local implementation has not been supplied."
  },
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

console.log(`1. Edition integrity: ${checksumResult.verified}/${checksumResult.checksumLines} checksums verified, ${checksumResult.mismatches.length} mismatched, ${checksumResult.missing.length} missing.`);
console.log(`2. Repository assets: ${repositoryAssets.length} audited — ${JSON.stringify(repositoryAssetAudit.totals.byStatus)}`);
console.log(`3. Tracks: ${trackSourceAudit.totals.tracksAudited} audited across ${trackSourceAudit.totals.jurisdictionsAudited} jurisdictions; ${trackSourceAudit.totals.tracksCleared} authority-cleared.`);
console.log(`4. Official-form components: ${JSON.stringify(trackSourceAudit.totals.officialPdfComponentsByResult)}`);
console.log(`5. Pending edition amendments: ${pendingAmendments.totals.candidates}.`);
console.log(`6. Blocker ledger: ${blockerLedger.totals.joinedUniqueRows} unique rows across ${Object.keys(blockerLedger.totals.byScope).length} scopes.`);
console.log("7. Nothing was promoted. Every audited track remains runtime_disabled.");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  const candidates = index.byJurisdictionDocumentId.get(`${track.jurisdiction}:${documentIdKey(formId)}`) ?? [];

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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(OUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}
