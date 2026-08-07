import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const AUTHORITY_PATH = "data/record-clearing/master-library/authority.json";
const TRACK_AUDIT_PATH =
  "data/record-clearing/master-library/track-source-audit.json";
const REPOSITORY_AUDIT_PATH =
  "data/record-clearing/master-library/repository-asset-audit.json";
const SOURCE_REGISTRY_PATH =
  "data/record-clearing/source-artifact-registry.json";
/**
 * Supplemental published-memo lanes.
 *
 * A jurisdiction enters the queue from the integrated track-source audit. The
 * supplemental lane exists only for a jurisdiction whose memo is published but
 * whose tracks the global audit has not yet regenerated — it is a fallback, not
 * a second opinion. Once the audit carries that jurisdiction's official-form
 * components the fallback retires itself, and the same jurisdiction may never
 * enter through both paths.
 *
 * Pennsylvania was the first jurisdiction to make that transition. The rule
 * below is general so the next one needs no code change.
 */
const SUPPLEMENTAL_MEMO_PATHS = Object.freeze([
  "data/record-clearing/legal-design-intake/PA.memo.json"
]);
const OUTPUT_PATH =
  "data/record-clearing/production-factory/official-pdf-production-queue.json";
const MATERIALIZATION_DEPENDENCY =
  "rcap-nationwide-source-materialization-contract";

const PRIORITY = new Map(
  [
    "MI",
    "MA",
    "PA",
    "MD",
    "CA",
    "IL",
    "CO",
    "AK",
    "CT",
    "GA",
    "HI",
    "AL",
    "AZ",
    "FL",
    "IN",
    "MO",
    "AR",
    "DE",
    "ID",
    "IA",
    "MN",
    "KS",
    "LA",
    "ME",
    "MT"
  ].map((jurisdiction, index) => [jurisdiction, index + 1])
);

const PREFERRED_AUDIT_STATUS = Object.freeze({
  packet_form: "manifested_packet_form",
  source_gated: "manifested_source_gated",
  supporting_process: "manifested_supporting_process",
  instructions: "manifested_instruction"
});

export function buildOfficialPdfProductionQueue(root) {
  const authority = readJson(root, AUTHORITY_PATH);
  const trackAudit = readJson(root, TRACK_AUDIT_PATH);
  const repositoryAudit = readJson(root, REPOSITORY_AUDIT_PATH);
  const sourceRegistry = readJson(root, SOURCE_REGISTRY_PATH);
  const adjudicatedDocuments = readAdjudicatedSourceDocuments(root);

  const auditedTracks = trackAudit.tracks
    .map(normalizeAuditedTrack)
    .filter((track) => track.components.length > 0);
  const auditedJurisdictions = new Set(
    auditedTracks.map((track) => track.jurisdiction)
  );

  const supplemental = resolveSupplementalLanes({
    root,
    auditedTracks,
    auditedJurisdictions
  });
  const supplementalTracks = supplemental.tracks;

  // The two lanes are disjoint by construction; assert it anyway, because a
  // jurisdiction entering twice would double every one of its components and
  // the counts would still look internally consistent.
  const duplicated = [
    ...new Set(supplementalTracks.map((track) => track.jurisdiction))
  ].filter((jurisdiction) => auditedJurisdictions.has(jurisdiction));
  assert.deepEqual(
    duplicated,
    [],
    `jurisdiction present in both the integrated audit and a supplemental lane: ${duplicated.join(", ")}`
  );

  const tracks = [...auditedTracks, ...supplementalTracks];
  const trackKeys = tracks.map((track) => `${track.jurisdiction}:${track.trackId}`);
  assert.equal(
    new Set(trackKeys).size,
    trackKeys.length,
    "queue track rows must be unique across both lanes"
  );
  const componentKeys = tracks.flatMap((track) =>
    track.components.map(
      (component) => `${component.jurisdiction}:${component.componentId}`
    )
  );
  assert.equal(
    new Set(componentKeys).size,
    componentKeys.length,
    "queue component rows must be unique across both lanes"
  );
  const jurisdictions = unique(tracks.map((track) => track.jurisdiction));
  const families = jurisdictions
    .map((jurisdiction) =>
      buildFamily({
        jurisdiction,
        tracks: tracks.filter((track) => track.jurisdiction === jurisdiction),
        repositoryAudit,
        sourceRegistry,
        adjudicatedDocuments
      })
    )
    .sort(compareFamilies);

  const components = tracks.flatMap((track) => track.components);
  const documents = families.flatMap((family) => family.documents);
  const rendererCounts = countBy(
    documents.map((document) => document.rendererLaneCandidate)
  );
  const identityCounts = countBy(
    documents.map((document) => document.sourceIdentityState)
  );

  return {
    schemaVersion: "rcap-official-pdf-production-queue/v1",
    planOfRecord: "docs/record-clearing/100_PERCENT_PRODUCTION_PLAN.md",
    authorityEdition: authority.edition,
    generatedFrom: {
      trackSourceAudit: TRACK_AUDIT_PATH,
      repositoryAssetAudit: REPOSITORY_AUDIT_PATH,
      sourceArtifactRegistry: SOURCE_REGISTRY_PATH,
      supplementalPublishedMemos: supplemental.active,
      supersededSupplementalPublishedMemos: supplemental.superseded
    },
    materializationDependency: {
      jobId: MATERIALIZATION_DEPENDENCY,
      requiredBeforeWorkerReady: true,
      registryPresenceConfersReadiness: false,
      packetWorkerMayAcquireOrImproviseSources: false,
      exactReadOnlyBytesRequired: true
    },
    scope: {
      jurisdictionCount: families.length,
      trackCount: tracks.length,
      auditedTrackCount: auditedTracks.length,
      supplementalPublishedMemoTrackCount: supplementalTracks.length,
      topLevelOfficialPdfTrackCount: tracks.filter(
        (track) => track.declaredOutputStrategy === "official_pdf_fill"
      ).length,
      composedTrackWithOfficialPdfComponentCount: tracks.filter(
        (track) => track.declaredOutputStrategy === "composed"
      ).length,
      officialPdfComponentCount: components.length,
      distinctJurisdictionDocumentCount: documents.length,
      rendererLaneCounts: rendererCounts,
      sourceIdentityCounts: identityCounts
    },
    policies: {
      legalDesignMutationAllowed: false,
      sourceDownloadInPacketImplementationAllowed: false,
      generatedSampleMaySubstituteForSource: false,
      carriedForwardPdfStructureIsEvidenceOnly: true,
      rendererSelectionRequiresFreshLocalInspection: true,
      fieldMappingRequiresVerifiedSourceBytes: true,
      allThirdPartyFieldsRemainBlank: true,
      packetReadyDefault: false,
      enabledDefault: false
    },
    families
  };
}

export function writeOfficialPdfProductionQueue(root) {
  const queue = buildOfficialPdfProductionQueue(root);
  const output = path.join(root, OUTPUT_PATH);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  return queue;
}

export function verifyOfficialPdfProductionQueue(root) {
  const expected = buildOfficialPdfProductionQueue(root);
  const actual = readJson(root, OUTPUT_PATH);
  assert.deepEqual(actual, expected, "official-PDF production queue is stale");

  assert.deepEqual(
    actual.families.slice(0, 5).map((family) => family.jurisdiction),
    ["MI", "MA", "PA", "MD", "CA"],
    "sprint priority order changed"
  );
  assert.ok(actual.scope.trackCount > 0);
  assert.ok(actual.scope.officialPdfComponentCount > 0);
  assert.equal(
    actual.scope.officialPdfComponentCount,
    actual.families.reduce(
      (total, family) => total + family.counts.componentCount,
      0
    )
  );
  assert.equal(
    actual.scope.distinctJurisdictionDocumentCount,
    actual.families.reduce(
      (total, family) => total + family.counts.documentCount,
      0
    )
  );
  assert.equal(
    actual.families.every(
      (family) =>
        family.workerReady === false &&
        family.packetReady === false &&
        family.enabled === false
    ),
    true
  );

  for (const family of actual.families) {
    assert.equal(family.ownershipKey, family.jurisdiction);
    assert.equal(family.materializationDependency, MATERIALIZATION_DEPENDENCY);
    assert.equal(
      new Set(family.trackIds).size,
      family.trackIds.length,
      `${family.jurisdiction}: duplicate track`
    );
    assert.equal(
      new Set(family.documents.map((document) => document.officialFormId))
        .size,
      family.documents.length,
      `${family.jurisdiction}: duplicate document`
    );
    for (const document of family.documents) {
      assert.ok(document.usageBindings.length > 0);
      if (document.exactSourceRequirement) {
        assert.match(
          document.exactSourceRequirement.expectedSha256,
          /^[0-9a-f]{64}$/u
        );
        assert.ok(
          Number.isSafeInteger(document.exactSourceRequirement.expectedBytes)
        );
        assert.ok(document.exactSourceRequirement.expectedBytes > 0);
        assert.equal(
          document.exactSourceRequirement.expectedMediaType,
          "application/pdf"
        );
        assert.equal(
          document.exactSourceRequirement.readOnlyTreatment,
          "worker_read_only_no_modify"
        );
        assert.equal(
          document.exactSourceRequirement.materializationState,
          "binary_materialization_required"
        );
      }
    }
  }

  return actual;
}

export const OFFICIAL_PDF_PRODUCTION_QUEUE_PATH = OUTPUT_PATH;

/**
 * Decides, for each supplemental memo lane, whether it is still the canonical
 * source for its jurisdiction.
 *
 * Retiring a lane is only safe if the audit actually carries what the memo
 * carried, so a retirement is not taken on trust: every official-form component
 * the memo declares must be present in the audit under the same track, role and
 * form. If any is missing the lane cannot retire, because dropping it would
 * silently shrink the queue.
 */
function resolveSupplementalLanes({ root, auditedTracks, auditedJurisdictions }) {
  const active = [];
  const superseded = [];
  const tracks = [];

  for (const memoPath of SUPPLEMENTAL_MEMO_PATHS) {
    const memoFile = path.join(root, memoPath);
    if (!fs.existsSync(memoFile)) continue;
    const memo = JSON.parse(fs.readFileSync(memoFile, "utf8"));
    const memoTracks = memo.tracks
      .map((track) => normalizeMemoTrack(track, memo))
      .filter((track) => track.components.length > 0);

    if (!auditedJurisdictions.has(memo.jurisdiction)) {
      active.push(memoPath);
      tracks.push(...memoTracks);
      continue;
    }

    const auditedKeys = new Set(
      auditedTracks
        .filter((track) => track.jurisdiction === memo.jurisdiction)
        .flatMap((track) =>
          track.components.map((component) => componentIdentityKey(component))
        )
    );
    const lost = memoTracks
      .flatMap((track) => track.components)
      .map((component) => componentIdentityKey(component))
      .filter((key) => !auditedKeys.has(key))
      .sort();
    assert.deepEqual(
      lost,
      [],
      `${memo.jurisdiction}: the integrated audit does not carry every official-form component the supplemental memo declares, so the supplemental lane cannot retire: ${lost.join(", ")}`
    );
    superseded.push(memoPath);
  }

  return { active: active.sort(), superseded: superseded.sort(), tracks };
}

/**
 * Identity of an official-form component use, independent of which lane
 * produced it. The audit spells a component id with hyphens where the memo
 * lane synthesizes it with the role's own underscores, so the id itself is not
 * comparable across lanes; the track, role and form are.
 */
function componentIdentityKey(component) {
  return [
    component.jurisdiction,
    component.trackId,
    String(component.role ?? "").replaceAll("-", "_"),
    component.officialFormId
  ].join("::");
}

function normalizeAuditedTrack(track) {
  const components = track.components
    .filter((component) => component.outputStrategy === "official_pdf_fill")
    .map((component) => ({
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      componentId: component.componentId,
      role: component.role,
      requirement: component.requirement ?? null,
      conditionDescription: component.conditionDescription ?? null,
      officialFormId: component.officialFormId,
      officialSourceUrl: component.officialSourceUrl,
      relationshipResult: component.result,
      repositoryMappingStatus: component.repositoryMappingStatus,
      corpusState: component.corpusState,
      asset: component.asset,
      sourceKind: "regenerated_track_source_audit"
    }));
  return {
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    declaredOutputStrategy:
      track.declaredOutputStrategy ??
      (track.outputStrategy === "official_pdf_fill"
        ? "official_pdf_fill"
        : "composed"),
    cleared: track.cleared,
    blockingReasonCount: track.blockingReasons?.length ?? 0,
    components
  };
}

function normalizeMemoTrack(track, memo) {
  const components = (track.components ?? [])
    .map((component, index) => ({ component, index }))
    .filter(
      ({ component }) => component.outputStrategy === "official_pdf_fill"
    )
    .map(({ component, index }) => ({
      jurisdiction: memo.jurisdiction,
      trackId: track.trackId,
      componentId: `${track.trackId}-${component.role}-${index + 1}`,
      role: component.role,
      requirement: component.requirement ?? null,
      conditionDescription: component.conditionDescription ?? null,
      officialFormId: component.officialFormId,
      officialSourceUrl: component.officialSourceUrl ?? null,
      relationshipResult: "pending_global_audit_regeneration",
      repositoryMappingStatus: "supplemental_published_memo",
      corpusState: "unchecked",
      asset: null,
      sourceKind: "published_normalization_memo"
    }));
  return {
    jurisdiction: memo.jurisdiction,
    trackId: track.trackId,
    declaredOutputStrategy:
      track.outputStrategy === "official_pdf_fill"
        ? "official_pdf_fill"
        : "composed",
    cleared: false,
    blockingReasonCount:
      (track.buildBlockers?.length ?? 0) +
      (track.releaseBlockers?.length ?? 0),
    components
  };
}

function buildFamily({
  jurisdiction,
  tracks,
  repositoryAudit,
  sourceRegistry,
  adjudicatedDocuments
}) {
  const components = tracks.flatMap((track) => track.components);
  const documents = unique(components.map((component) => component.officialFormId))
    .sort((left, right) => left.localeCompare(right))
    .map((officialFormId) =>
      buildDocument({
        jurisdiction,
        officialFormId,
        components: components.filter(
          (component) => component.officialFormId === officialFormId
        ),
        repositoryAudit,
        sourceRegistry,
        adjudicatedDocuments
      })
    );

  return {
    familyId: `rcap-${jurisdiction.toLowerCase()}-official-pdf-family`,
    jurisdiction,
    priority: PRIORITY.get(jurisdiction) ?? 999,
    ownershipKey: jurisdiction,
    sourceKind: tracks.some((track) =>
      track.components.some(
        (component) => component.sourceKind === "published_normalization_memo"
      )
    )
      ? "published_normalization_memo_pending_global_regeneration"
      : "regenerated_track_source_audit",
    materializationDependency: MATERIALIZATION_DEPENDENCY,
    scaffoldDirectory: `data/record-clearing/production-factory/official-pdf-families/${jurisdiction}`,
    trackIds: tracks.map((track) => track.trackId).sort(),
    counts: {
      trackCount: tracks.length,
      topLevelOfficialPdfTrackCount: tracks.filter(
        (track) => track.declaredOutputStrategy === "official_pdf_fill"
      ).length,
      composedTrackCount: tracks.filter(
        (track) => track.declaredOutputStrategy === "composed"
      ).length,
      componentCount: components.length,
      documentCount: documents.length,
      exactSourceRequirementCount: documents.filter(
        (document) => document.exactSourceRequirement !== null
      ).length,
      unresolvedSourceIdentityCount: documents.filter(
        (document) =>
          document.sourceIdentityState !== "exact_source_requirement_ready"
      ).length
    },
    rendererLaneCounts: countBy(
      documents.map((document) => document.rendererLaneCandidate)
    ),
    workerReady: false,
    packetReady: false,
    enabled: false,
    documents
  };
}

/**
 * Documents a captain-integrated source decision has adjudicated.
 *
 * The adopted manifest measures every asset it retains, but a measurement is
 * only allowed to stand in for a corpus copy where a decision record has
 * independently established that identity — the same evidentiary bar the rest
 * of the factory applies before an identity becomes assignable. Without that
 * gate a manifest row alone would promote documents nobody has adjudicated.
 */
function readAdjudicatedSourceDocuments(root) {
  const adjudicated = new Set();
  const directory = path.join(
    root,
    "data/record-clearing/production-factory/legal-design-decisions"
  );
  if (!fs.existsSync(directory)) return adjudicated;
  for (const name of fs.readdirSync(directory).sort()) {
    if (!name.endsWith(".json")) continue;
    let decision;
    try {
      decision = JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
    } catch {
      continue;
    }
    const jurisdiction = decision.jurisdiction;
    const detail = decision.terminalDispositionDetail;
    if (typeof jurisdiction !== "string" || !detail || typeof detail !== "object") {
      continue;
    }
    for (const [documentId, disposition] of Object.entries(detail)) {
      if (
        typeof disposition === "string" &&
        disposition.startsWith("exact_identity_confirmed")
      ) {
        adjudicated.add(`${jurisdiction}:${documentId}`);
      }
    }
  }
  return adjudicated;
}

function buildDocument({
  jurisdiction,
  officialFormId,
  components,
  repositoryAudit,
  sourceRegistry,
  adjudicatedDocuments = new Set()
}) {
  const assetCandidates = distinctAssets(
    components.map((component) => component.asset).filter(Boolean)
  );
  if (assetCandidates.length === 0) {
    const memoAssets = repositoryAudit.assets
      .filter(
        (entry) =>
          entry.jurisdiction === jurisdiction &&
          entry.libraryRow?.documentId === officialFormId
      )
      .map((entry) => ({
        ...entry.libraryRow,
        documentRole:
          entry.libraryRow.workflowKey?.split(":")[2] ?? null,
        sha256: entry.sha256,
        packetCandidate: entry.libraryRow.assetClass === "packet_form",
        generationAllowed: false,
        runtimeStatus: "runtime_disabled"
      }));
    assetCandidates.push(...distinctAssets(memoAssets));
  }

  const asset = assetCandidates.length === 1 ? assetCandidates[0] : null;
  const repositoryCandidates = asset
    ? findRepositoryCandidates({
        jurisdiction,
        asset,
        repositoryAudit,
        sourceRegistry
      })
    : [];
  const exactCandidate = selectExactCandidate(asset, repositoryCandidates);
  // A document the private corpus never held could not state its own size, so
  // its identity stalled at repository_measurement_unavailable no matter how
  // exactly the authority knew it. The adopted manifest records the byte count
  // itself, and the authority — not the corpus — is what the resolution order
  // makes controlling. Where the corpus holds no byte-identical copy, the
  // authority's own measurement supplies the requirement. The corpus stays
  // preferred where it exists, so no existing contract changes basis.
  const authorityMeasurement =
    !exactCandidate &&
    adjudicatedDocuments.has(`${jurisdiction}:${officialFormId}`) &&
    asset?.authorityMeasurement?.bytes &&
    /^[0-9a-f]{64}$/u.test(asset.sha256 ?? "")
      ? asset.authorityMeasurement
      : null;
  const exactSourceRequirement = exactCandidate
    ? {
        schemaVersion: "rcap-source-materialization-requirement-scaffold/v1",
        authorityAssetState: "authority_asset_known",
        registryState: "registry_metadata_present",
        documentId: asset.documentId,
        documentRole: asset.documentRole,
        canonicalAuthorityPath: asset.canonicalRelativePath,
        repositorySourcePath: exactCandidate.sourcePath,
        expectedSha256: asset.sha256,
        expectedBytes: exactCandidate.sizeBytes,
        expectedMediaType: "application/pdf",
        readOnlyTreatment: "worker_read_only_no_modify",
        expectedMeasurementBasis: "carried_forward_registry_measurement",
        identityBindingStatus: "exact_pinned_identity",
        materializationState: "binary_materialization_required",
        usageBindings: components.map((component) => ({
          trackId: component.trackId,
          componentId: component.componentId
        }))
      }
    : authorityMeasurement
      ? {
          schemaVersion:
            "rcap-source-materialization-requirement-scaffold/v1",
          authorityAssetState: "authority_asset_known",
          registryState: "authority_manifest_measurement_present",
          documentId: asset.documentId,
          documentRole: asset.documentRole,
          canonicalAuthorityPath: asset.canonicalRelativePath,
          repositorySourcePath: asset.canonicalRelativePath,
          expectedSha256: asset.sha256,
          expectedBytes: authorityMeasurement.bytes,
          expectedMediaType: "application/pdf",
          readOnlyTreatment: "worker_read_only_no_modify",
          expectedMeasurementBasis: "adopted_authority_manifest_measurement",
          identityBindingStatus: "exact_pinned_identity",
          materializationState: "binary_materialization_required",
          usageBindings: components.map((component) => ({
            trackId: component.trackId,
            componentId: component.componentId
          }))
        }
      : null;

  return {
    officialFormId,
    usageBindings: components.map((component) => ({
      trackId: component.trackId,
      componentId: component.componentId,
      role: component.role,
      requirement: component.requirement,
      conditionDescription: component.conditionDescription
    })),
    sourceKinds: unique(components.map((component) => component.sourceKind)),
    officialSourceUrls: unique(
      components
        .map((component) => component.officialSourceUrl)
        .filter(Boolean)
    ),
    relationshipResults: unique(
      components.map((component) => component.relationshipResult)
    ),
    authorityAssets: assetCandidates,
    repositoryCandidates,
    sourceIdentityState:
      assetCandidates.length === 0
        ? "authority_identity_unresolved"
        : assetCandidates.length > 1
          ? "authority_identity_conflict"
          : exactCandidate || authorityMeasurement
            ? "exact_source_requirement_ready"
            : repositoryCandidates.length > 0
              ? "registry_measurement_not_uniquely_selectable"
              : "repository_measurement_unavailable",
    rendererLaneCandidate: rendererLane(
      exactCandidate?.technicalClass ?? authorityMeasurement?.structuralClass,
      exactCandidate ? exactCandidate.encrypted : false,
      exactCandidate ? exactCandidate.xfa : false
    ),
    rendererSelectionState: "pending_fresh_local_source_inspection",
    exactSourceRequirement,
    fieldMapState: "pending_verified_source_bytes",
    ownershipMapState: "pending_verified_source_bytes",
    fixtureState: "pending_field_map_binding",
    packetAssemblyState: "definition_required_or_scaffolded",
    workerReady: false
  };
}

function findRepositoryCandidates({
  jurisdiction,
  asset,
  repositoryAudit,
  sourceRegistry
}) {
  const registryByPath = new Map(
    sourceRegistry.artifacts.map((entry) => [entry.sourcePath, entry])
  );
  return repositoryAudit.assets
    .filter(
      (entry) =>
        entry.jurisdiction === jurisdiction &&
        entry.sha256 === asset.sha256 &&
        (entry.libraryRow?.workflowKey === asset.workflowKey ||
          entry.libraryRow?.canonicalRelativePath ===
            asset.canonicalRelativePath)
    )
    .map((entry) => {
      const registry = registryByPath.get(entry.sourcePath);
      return {
        sourcePath: entry.sourcePath,
        auditStatus: entry.status,
        sha256: entry.sha256,
        sizeBytes: registry?.sizeBytes ?? null,
        fileType: registry?.fileType ?? null,
        technicalClass: registry?.technicalClass ?? null,
        fieldCount: registry?.fieldCount ?? null,
        encrypted: registry?.encrypted ?? null,
        xfa: registry?.xfa ?? null,
        registryHashState: registry?.hashState ?? null,
        registryMeasurementUsable:
          registry?.inventorySha256 === asset.sha256 &&
          registry?.measuredSha256 === asset.sha256 &&
          registry?.hashState === "match" &&
          registry?.fileType === "pdf" &&
          Number.isSafeInteger(registry?.sizeBytes) &&
          registry.sizeBytes > 0
      };
    })
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

function selectExactCandidate(asset, candidates) {
  if (!asset) return null;
  const usable = candidates.filter(
    (candidate) => candidate.registryMeasurementUsable
  );
  if (usable.length === 0) return null;
  const preferredStatus = PREFERRED_AUDIT_STATUS[asset.assetClass];
  const preferred = usable.filter(
    (candidate) => candidate.auditStatus === preferredStatus
  );
  if (preferred.length === 1) return preferred[0];
  if (preferred.length > 1) return null;
  return usable.length === 1 ? usable[0] : null;
}

function distinctAssets(assets) {
  const byIdentity = new Map();
  for (const asset of assets) {
    const key = `${asset.workflowKey ?? ""}|${asset.documentId ?? ""}|${asset.sha256 ?? ""}`;
    if (!byIdentity.has(key)) {
      byIdentity.set(key, {
        workflowKey: asset.workflowKey ?? null,
        documentId: asset.documentId ?? null,
        documentRole: asset.documentRole ?? null,
        officialTitle: asset.officialTitle ?? null,
        revision: asset.revision ?? null,
        assetClass: asset.assetClass ?? null,
        canonicalRelativePath: asset.canonicalRelativePath ?? null,
        sha256: asset.sha256 ?? null,
        packetCandidate: asset.packetCandidate ?? false,
        generationAllowed: asset.generationAllowed ?? false,
        runtimeStatus: asset.runtimeStatus ?? null,
        authorityMeasurement: asset.authorityMeasurement ?? null
      });
    }
  }
  return [...byIdentity.values()].sort((left, right) =>
    `${left.workflowKey}|${left.sha256}`.localeCompare(
      `${right.workflowKey}|${right.sha256}`
    )
  );
}

function rendererLane(technicalClass, encrypted, xfa) {
  if (encrypted === true || xfa === true) {
    return "nonrenderable_source_policy_required";
  }
  if (
    [
      "clean_acroform",
      "dirty_acroform",
      "acroform_clean",
      "acroform_dirty",
      // The adopted manifest's own spelling for the same structure.
      "acroform_pdf"
    ].includes(technicalClass)
  ) {
    return "acroform_or_hybrid_candidate";
  }
  if (["flat_pdf", "scanned_pdf"].includes(technicalClass)) {
    return "coordinate_overlay_candidate";
  }
  if (technicalClass === "source_missing") {
    return "source_materialization_required";
  }
  return "pending_fresh_local_source_inspection";
}

function compareFamilies(left, right) {
  return (
    left.priority - right.priority ||
    left.jurisdiction.localeCompare(right.jurisdiction)
  );
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );
}

function unique(values) {
  return [...new Set(values)];
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}
