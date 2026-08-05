#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SOURCE_MATERIALIZATION_REQUIREMENT_SCHEMA,
  assertPortableRelativePath,
  parsePortableLocator,
  validateMaterializationRequirement
} from "./verify-rcap-materialized-source.mjs";
import {
  OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  validateOfficialPdfSourceProjection
} from "./lib/rcap-factory/materialization-planning.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMILY_ROOT =
  "data/record-clearing/production-factory/official-pdf-families";
const PRODUCTION_QUEUE_PATH =
  "data/record-clearing/production-factory/official-pdf-production-queue.json";
const REVIEW_PATH =
  "data/record-clearing/production-factory/official-pdf-source-contract-reconciliation.json";
const WRITE = process.argv.includes("--write");
const ALLOW_INCOMPLETE = process.argv.includes("--allow-incomplete");
const PORTABLE_PATH_KEYS = new Set([
  "canonicalAuthorityPath",
  "canonicalRelativePath",
  "materializationDestination",
  "proposedMaterializationDestination",
  "resolvedReadOnlySourcePath",
  "verificationSourcePath"
]);
const PORTABLE_LOCATOR_KEYS = new Set([
  "portableLocator",
  "portableLocatorCandidate"
]);
const APPROVED_PORTABLE_LOCATOR_SCHEMES = new Set([
  "master-library-edition-1.2",
  "rcap-master-library-edition-1-2",
  "source-artifact-registry"
]);
const unexpected = process.argv
  .slice(2)
  .filter(
    (argument) =>
      argument !== "--write" && argument !== "--allow-incomplete"
  );

assert.deepEqual(
  unexpected,
  [],
  `Unsupported arguments: ${unexpected.join(", ")}`
);
assert.equal(
  WRITE && ALLOW_INCOMPLETE,
  false,
  "--write cannot be combined with --allow-incomplete"
);

const result = buildReconciliation();
const absoluteReviewPath = path.join(ROOT, REVIEW_PATH);

if (WRITE) {
  writeReviewAtomically(absoluteReviewPath, result);
}

if (!ALLOW_INCOMPLETE) {
  assert.ok(fs.existsSync(absoluteReviewPath), `${REVIEW_PATH} is missing`);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(absoluteReviewPath, "utf8")),
    result,
    `${REVIEW_PATH} is stale; rerun this verifier with --write`
  );
}

process.stdout.write(
  [
    ALLOW_INCOMPLETE
      ? "Official-PDF source-contract reconciliation progress passed."
      : "Official-PDF source-contract reconciliation passed.",
    `families=${result.familyCount}`,
    `expectedFamilies=${result.queueCoverage.expectedFamilyCount}`,
    `sourceRecords=${result.totals.sourceRecords}`,
    `exactIdentityPins=${result.totals.exactIdentityPins}`,
    `queueCoverageGaps=${result.totals.queueCoverageGaps}`,
    `contractSafetyGaps=${result.totals.contractSafetyGaps}`,
    `normativeAssignedRequirements=${result.totals.normativeAssignedRequirements}`,
    `pendingAssignmentFamilies=${result.totals.pendingAssignmentFamilies}`
  ].join(" ") + "\n"
);
if (ALLOW_INCOMPLETE && result.totals.queueCoverageGaps > 0) {
  for (const family of result.families.filter(
    (entry) => entry.queueCoverageGaps.length > 0
  )) {
    process.stdout.write(
      `${family.jurisdiction}: ${family.queueCoverageGaps.join(", ")}\n`
    );
  }
}
if (ALLOW_INCOMPLETE && result.totals.contractSafetyGaps > 0) {
  for (const family of result.families.filter(
    (entry) => entry.contractSafetyGaps.length > 0
  )) {
    process.stdout.write(
      `${family.jurisdiction} safety: ${family.contractSafetyGaps.join(", ")}\n`
    );
  }
}

function buildReconciliation() {
  const absoluteFamilyRoot = path.join(ROOT, FAMILY_ROOT);
  const productionQueue = readJson(PRODUCTION_QUEUE_PATH);
  const sourceProjection = readJson(OFFICIAL_PDF_SOURCE_PROJECTION_PATH);
  const projectionIssues =
    validateOfficialPdfSourceProjection(sourceProjection);
  assert.deepEqual(
    projectionIssues,
    [],
    "Official-PDF portable source projection is invalid"
  );
  const expectedJurisdictions = productionQueue.families
    .map((family) => family.jurisdiction)
    .sort();
  const queueTotals = {
    tracks: sum(
      productionQueue.families.map((family) => family.counts.trackCount)
    ),
    components: sum(
      productionQueue.families.map((family) => family.counts.componentCount)
    ),
    documentIdentities: sum(
      productionQueue.families.map((family) => family.counts.documentCount)
    ),
    exactSourceRequirements: sum(
      productionQueue.families.map(
        (family) => family.counts.exactSourceRequirementCount
      )
    ),
    unresolvedSourceIdentities: sum(
      productionQueue.families.map(
        (family) => family.counts.unresolvedSourceIdentityCount
      )
    )
  };
  assert.deepEqual(
    queueTotals,
    {
      tracks: productionQueue.scope.trackCount,
      components: productionQueue.scope.officialPdfComponentCount,
      documentIdentities:
        productionQueue.scope.distinctJurisdictionDocumentCount,
      exactSourceRequirements:
        productionQueue.scope.sourceIdentityCounts
          .exact_source_requirement_ready,
      unresolvedSourceIdentities:
        productionQueue.scope.sourceIdentityCounts
          .authority_identity_unresolved +
        productionQueue.scope.sourceIdentityCounts
          .registry_measurement_not_uniquely_selectable
    },
    "Official-PDF production queue aggregate counts drift"
  );
  const familyJurisdictions = fs
    .readdirSync(absoluteFamilyRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[A-Z]{2}$/u.test(entry.name))
    .map((entry) => entry.name)
    .filter((jurisdiction) =>
      fs.existsSync(
        path.join(absoluteFamilyRoot, jurisdiction, "source-requirements.json")
      )
    )
    .sort();
  const missingJurisdictions = expectedJurisdictions.filter(
    (jurisdiction) => !familyJurisdictions.includes(jurisdiction)
  );
  const unexpectedJurisdictions = familyJurisdictions.filter(
    (jurisdiction) => !expectedJurisdictions.includes(jurisdiction)
  );

  if (!ALLOW_INCOMPLETE) {
    assert.deepEqual(
      missingJurisdictions,
      [],
      `Official-PDF production queue families still missing: ${missingJurisdictions.join(", ")}`
    );
  }
  assert.deepEqual(
    unexpectedJurisdictions,
    [],
    `Official-PDF family directories are absent from the production queue: ${unexpectedJurisdictions.join(", ")}`
  );

  const queueFamilyByJurisdiction = new Map(
    productionQueue.families.map((family) => [family.jurisdiction, family])
  );
  const families = familyJurisdictions.map((jurisdiction) =>
    inspectFamily(
      jurisdiction,
      queueFamilyByJurisdiction.get(jurisdiction),
      sourceProjection.identities.filter(
        (identity) => identity.jurisdiction === jurisdiction
      )
    )
  );

  assert.ok(families.length > 0, "No official-PDF source families were found");

  const totals = {
    sourceRecords: sum(families.map((family) => family.sourceRecordCount)),
    retainedFingerprintEvidence: sum(
      families.map((family) => family.retainedFingerprintEvidenceCount)
    ),
    exactIdentityPins: sum(
      families.map((family) => family.exactIdentityPinCount)
    ),
    validatedPortablePaths: sum(
      families.map((family) => family.validatedPortablePathCount)
    ),
    validatedPortableLocators: sum(
      families.map((family) => family.validatedPortableLocatorCount)
    ),
    queueDocumentIdentitiesCovered: sum(
      families.map((family) => family.queueDocumentIdentitiesCovered)
    ),
    queueUsageBindingsCovered: sum(
      families.map((family) => family.queueUsageBindingsCovered)
    ),
    queueCoverageGaps: sum(
      families.map((family) => family.queueCoverageGaps.length)
    ),
    contractSafetyGaps: sum(
      families.map((family) => family.contractSafetyGaps.length)
    ),
    normativeAssignedRequirements: sum(
      families.map((family) => family.normativeAssignedRequirementCount)
    ),
    projectedDocumentIdentities: sum(
      families.map((family) => family.projectedDocumentIdentityCount)
    ),
    projectedExactWorkerAssignments: sum(
      families.map((family) => family.projectedExactWorkerAssignmentCount)
    ),
    pendingAssignmentFamilies: families.filter(
      (family) => family.portableProjectionState !==
        "integration_owned_projection_present"
    ).length,
    materializationBlockedFamilies: families.filter(
      (family) => family.workerReady === false
    ).length,
      workerReadyFamilies: families.filter((family) => family.workerReady).length
  };

  assert.equal(
    totals.workerReadyFamilies,
    0,
    "A source family claims worker readiness without this reconciliation being promoted"
  );
  if (!ALLOW_INCOMPLETE) {
    assert.equal(
      totals.queueCoverageGaps,
      0,
      `Official-PDF family queue coverage gaps remain: ${families
        .flatMap((family) =>
          family.queueCoverageGaps.map(
            (gap) => `${family.jurisdiction}:${gap}`
          )
        )
        .join(", ")}`
    );
    assert.equal(
      totals.contractSafetyGaps,
      0,
      `Official-PDF source-contract safety gaps remain: ${families
        .flatMap((family) =>
          family.contractSafetyGaps.map(
            (gap) => `${family.jurisdiction}:${gap}`
          )
        )
        .join(", ")}`
    );
  }
  const verifierBoundary = verifyNoLegacyWorkerSourceReads();

  return {
    schemaVersion: "rcap-official-pdf-source-contract-reconciliation/v1",
    normativeContract: {
      requirementSchema: SOURCE_MATERIALIZATION_REQUIREMENT_SCHEMA,
      contractPath:
        "docs/record-clearing/RCAP_SOURCE_MATERIALIZATION_CONTRACT.md",
      workerVerifier: "scripts/verify-rcap-materialized-source.mjs",
      assignmentMarker: "tmp/rcap-factory/job.json"
    },
    portableAssignmentProjection: {
      path: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
      schemaVersion: sourceProjection.schemaVersion,
      queueIdentityCount: sourceProjection.coverage.queueIdentityCount,
      exactWorkerAssignable:
        sourceProjection.coverage.assignmentEligibleCount,
      externalArchiveStatus: sourceProjection.sourceArchive.status,
      projectionIsMaterialization: false,
      projectionIsApproval: false,
      projectionEnablesRuntime: false
    },
    familyCount: families.length,
    queueCoverage: {
      productionQueuePath: PRODUCTION_QUEUE_PATH,
      expectedFamilyCount: expectedJurisdictions.length,
      expectedJurisdictions,
      missingJurisdictions,
      unexpectedJurisdictions,
      complete:
        missingJurisdictions.length === 0 &&
        totals.queueCoverageGaps === 0 &&
        totals.contractSafetyGaps === 0,
      totals: queueTotals
    },
    families,
    totals,
    verifierBoundary,
    invariants: {
      legacyPrivatePathsAreIdentityEvidenceOnly: true,
      privatePathsAreNeverMaterializationDestinations: true,
      portableLocatorsWithoutCaptainAssignmentAreCandidatesOnly: true,
      packetWorkersMayAcquireOrMaterializeSources: false,
      registryPresenceConfersWorkerReadiness: false,
      fabricatedAssignmentBindingsAllowed: false
    }
  };
}

function verifyNoLegacyWorkerSourceReads() {
  const scriptDirectory = path.join(ROOT, "scripts");
  const verifierPaths = fs
    .readdirSync(scriptDirectory)
    .filter(
      (name) =>
        name.startsWith("verify-rcap-") &&
        (name.includes("official") ||
          name.includes("acroform") ||
          name.includes("overlay")) &&
        name.endsWith(".mjs") &&
        name !== path.basename(fileURLToPath(import.meta.url))
    )
    .map((name) => `scripts/${name}`)
    .sort();
  verifierPaths.push(
    "scripts/lib/rcap-official-pdf-family-scaffold.mjs",
    "scripts/lib/rcap-queued-official-pdf-family-scaffold.mjs",
    "scripts/lib/rcap-queued-official-pdf-family-verifier.mjs"
  );
  const packetModuleRoot = path.join(
    ROOT,
    "src/lib/rcap/packets/jurisdictions"
  );
  const packetModulePaths = collectFiles(packetModuleRoot)
    .map((absolutePath) => path.relative(ROOT, absolutePath))
    .filter((relativePath) =>
      [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"].some(
        (extension) => relativePath.endsWith(extension)
      )
    )
    .sort();
  const inspectedPaths = [...new Set([...verifierPaths, ...packetModulePaths])];

  const prohibitedPatterns = [
    {
      pattern:
        /resolveWithin\([^)]*requirement\.repositorySourcePath[^)]*\)/su,
      label: "resolves repositorySourcePath"
    },
    {
      pattern:
        /path\.(?:join|resolve)\([^)]*requirement\.materializationDestination[^)]*\)/su,
      label: "resolves a pre-contract materializationDestination"
    },
    {
      pattern:
        /(?:fs(?:\.promises)?\.)?(?:access|copyFile|createReadStream|existsSync|lstat|lstatSync|open|openSync|readFile|readFileSync|stat|statSync)\([^)]*(?:repositorySourcePath|repositoryPathEvidence|historicalRepositoryPath)[^)]*\)/su,
      label: "reads repositorySourcePath"
    },
    {
      pattern:
        /(?:path\.)?(?:join|resolve)\([^)]*(?:repositorySourcePath|repositoryPathEvidence|historicalRepositoryPath)[^)]*\)/su,
      label: "resolves legacy repository identity evidence"
    },
    {
      pattern:
        /(?:fs(?:\.promises)?\.)?(?:access|copyFile|createReadStream|existsSync|lstat|lstatSync|open|openSync|readFile|readFileSync|stat|statSync)\([^)]*["'`]private\/Nationwide Record Clearing\//su,
      label: "reads a literal private Nationwide source path",
      scanRaw: true
    },
    {
      pattern:
        /(?:path\.)?(?:join|resolve)\([^)]*["'`]private\/Nationwide Record Clearing\//su,
      label: "resolves a literal private Nationwide source path",
      scanRaw: true
    }
  ];

  for (const inspectedPath of inspectedPaths) {
    const text = fs.readFileSync(path.join(ROOT, inspectedPath), "utf8");
    const executableText = stripJavaScriptCommentsAndLiterals(text);
    for (const { pattern, label, scanRaw = false } of prohibitedPatterns) {
      assert.doesNotMatch(
        scanRaw ? text : executableText,
        pattern,
        `${inspectedPath}: ${label}; legacy repository paths are evidence only`
      );
    }
  }

  const networkAcquisitionPatterns = [
    {
      pattern: /\bfetch\s*\(/u,
      label: "calls fetch"
    },
    {
      pattern: /\b(?:axios|got|https?|undici)\.(?:get|request)\s*\(/u,
      label: "starts a network request"
    },
    {
      pattern: /\b(?:axios|got)\s*\(/u,
      label: "calls a network client"
    },
    {
      pattern:
        /\b(?:exec|execFile|spawn|spawnSync)\s*\([^)]*["'`](?:curl|wget)["'`]/su,
      label: "starts a download subprocess"
    }
  ];
  for (const inspectedPath of inspectedPaths) {
    const text = fs.readFileSync(path.join(ROOT, inspectedPath), "utf8");
    const executableText = stripJavaScriptCommentsAndLiterals(text);
    for (const { pattern, label } of networkAcquisitionPatterns) {
      assert.doesNotMatch(
        executableText,
        pattern,
        `${inspectedPath}: ${label}; official-PDF code may only consume captain-projected sources`
      );
    }
  }

  return {
    verifierCount: verifierPaths.length,
    packetModuleCount: packetModulePaths.length,
    legacyRepositoryPathReads: 0,
    packetWorkerMaterializationPaths: 0,
    packetImplementationNetworkAcquisitionPaths: 0
  };
}

function inspectFamily(jurisdiction, queueFamily, projectedIdentities) {
  assert.ok(queueFamily, `${jurisdiction}: production queue family is missing`);
  const manifestPath =
    `${FAMILY_ROOT}/${jurisdiction}/source-requirements.json`;
  const manifest = readJson(manifestPath);
  const sourceRecords = sourceRecordsFrom(manifest);
  assert.ok(
    sourceRecords.length > 0,
    `${jurisdiction}: source requirement manifest has no records`
  );

  const normativeRequirements = [];
  const authorizingClaims = [];
  let validatedPortablePathCount = 0;
  let validatedPortableLocatorCount = 0;
  const forbiddenTrueKeys = new Set([
    "enabled",
    "generationAllowed",
    "mappingApproved",
    "materialized",
    "packetReady",
    "registryPresenceConfersReadiness",
    "rendererEnabled",
    "workerDownloadAuthorized",
    "workerMaterializationAuthorized",
    "workerMayAcquireOrDownloadSources",
    "workerMayAcquireOrImproviseSources",
    "workerMayAcquireSources",
    "workerMayDownload",
    "workerMayModify",
    "workerMayRead",
    "workerReadAuthorized",
    "workerReady"
  ]);
  walk(manifest, (value, key) => {
    if (
      isPlainObject(value) &&
      value.schemaVersion === SOURCE_MATERIALIZATION_REQUIREMENT_SCHEMA
    ) {
      normativeRequirements.push(value);
    }
    if (
      key === "materializationDestination" &&
      typeof value === "string" &&
      value.startsWith("private/")
    ) {
      assert.fail(
        `${jurisdiction}: private/ cannot be a materialization destination`
      );
    }
    if (
      key === "verificationSourcePath" &&
      typeof value === "string" &&
      value.startsWith("private/")
    ) {
      assert.fail(
        `${jurisdiction}: private/ cannot be exposed as a worker verification path`
      );
    }
    if (
      PORTABLE_PATH_KEYS.has(key) &&
      value !== null &&
      value !== undefined
    ) {
      assert.equal(
        typeof value,
        "string",
        `${jurisdiction}: ${key} must be null or a portable relative path`
      );
      validatePortablePlanningPath(value, `${jurisdiction}.${key}`);
      validatedPortablePathCount += 1;
    }
    if (
      PORTABLE_LOCATOR_KEYS.has(key) &&
      value !== null &&
      value !== undefined
    ) {
      assert.equal(
        typeof value,
        "string",
        `${jurisdiction}: ${key} must be null or a portable locator`
      );
      validatePortablePlanningLocator(value, `${jurisdiction}.${key}`);
      validatedPortableLocatorCount += 1;
    }
    if (forbiddenTrueKeys.has(key) && value === true) {
      authorizingClaims.push(key);
    }
    if (key === "runtimeStatus" && value === "runtime_enabled") {
      authorizingClaims.push("runtimeStatus=runtime_enabled");
    }
  });

  for (const requirement of normativeRequirements) {
    validateMaterializationRequirement(requirement);
  }
  if (normativeRequirements.length === 0) {
    assert.deepEqual(
      authorizingClaims,
      [],
      `${jurisdiction}: pre-assignment source metadata contains authorizing claims`
    );
  }

  const pendingAssignment =
    manifest.contractState === "pending_captain_owned_assignment" ||
    manifest.contractState === "pending_captain_assignment" ||
    manifest.contractKind === "dependency_scaffold_not_worker_assignment" ||
    manifest.contractKind ===
      "pre_materialization_dependency_scaffold_not_worker_assignment";
  const assignmentAbsent =
    (manifest.assignmentManifest === undefined ||
      manifest.assignmentManifest === null) &&
    (manifest.assignmentAnchor === undefined ||
      manifest.assignmentAnchor === null);
  const projectionAbsent =
    manifest.portableProjectionAvailable !== true &&
    manifest.portableProjectionPresent !== true &&
    (manifest.portableProjection === undefined ||
      manifest.portableProjection === null);

  if (normativeRequirements.length === 0) {
    assert.equal(
      pendingAssignment,
      true,
      `${jurisdiction}: non-normative requirements must declare pending assignment`
    );
    assert.equal(
      assignmentAbsent,
      true,
      `${jurisdiction}: non-normative requirements must not fabricate an assignment anchor`
    );
    assert.equal(
      projectionAbsent,
      true,
      `${jurisdiction}: non-normative requirements must not claim a portable projection`
    );
    for (const record of sourceRecords) {
      assert.equal(
        record.workerMaterializationAuthorized,
        false,
        `${jurisdiction}: every source record must deny worker materialization`
      );
      assert.notEqual(
        record.schemaVersion,
        SOURCE_MATERIALIZATION_REQUIREMENT_SCHEMA,
        `${jurisdiction}: an incomplete record claims the normative schema`
      );
      if (record.portableLocator !== undefined) {
        assert.equal(
          record.portableLocatorTreatment,
          "candidate_identity_locator_only_not_materialization_authority",
          `${jurisdiction}: a pre-assignment portableLocator is not explicitly candidate-only`
        );
      }
    }
  }

  const contractSafetyGaps = sourceRecords
    .filter(
      (record) =>
        record.workerReadAuthorized !== false &&
        record.workerMayRead !== false
    )
    .map(
      (record, index) =>
        `missing_worker_read_denial:${sourceRecordDocumentId(record) ?? `index-${index}`}`
    )
    .sort();
  const queueReconciliation = reconcileFamilyToQueue(
    jurisdiction,
    queueFamily,
    sourceRecords
  );
  const retainedFingerprintEvidenceCount =
    sourceRecords.filter(hasRetainedFingerprint).length;
  const familyWorkerReady =
    manifest.workerReady === true ||
    manifest.runtimeStatus === "runtime_enabled" ||
    manifest.generationAllowed === true;
  assert.equal(
    familyWorkerReady,
    false,
    `${jurisdiction}: source family claims runtime or worker readiness`
  );
  assert.equal(
    projectedIdentities.length,
    queueFamily.counts.documentCount,
    `${jurisdiction}: portable projection does not disposition every queue identity`
  );
  const projectedExactWorkerAssignmentCount = projectedIdentities.filter(
    (identity) => identity.assignmentEligible
  ).length;

  return {
    jurisdiction,
    manifestPath,
    manifestSchemaVersion: manifest.schemaVersion,
    sourceRecordCount: sourceRecords.length,
    retainedFingerprintEvidenceCount,
    exactIdentityPinCount: queueReconciliation.exactIdentityPinCount,
    validatedPortablePathCount,
    validatedPortableLocatorCount,
    queueDocumentIdentityCount: queueFamily.counts.documentCount,
    queueDocumentIdentitiesCovered:
      queueReconciliation.documentIdentitiesCovered,
    queueUsageBindingCount: queueFamily.counts.componentCount,
    queueUsageBindingsCovered: queueReconciliation.usageBindingsCovered,
    queueCoverageGaps: queueReconciliation.gaps,
    contractSafetyGaps,
    normativeAssignedRequirementCount: normativeRequirements.length,
    projectedDocumentIdentityCount: projectedIdentities.length,
    projectedExactWorkerAssignmentCount,
    projectedTerminalOrBlockedIdentityCount:
      projectedIdentities.length - projectedExactWorkerAssignmentCount,
    assignmentState: "captain_owned_portable_assignment_projection_present",
    portableProjectionState: "integration_owned_projection_present",
    workerMaterializationAuthorized: false,
    workerReady: false
  };
}

function sourceRecordsFrom(manifest) {
  if (Array.isArray(manifest.requirements)) return manifest.requirements;
  if (Array.isArray(manifest.documents)) {
    return [
      ...manifest.documents,
      ...(Array.isArray(manifest.unmanifestedSources)
        ? manifest.unmanifestedSources
        : []),
      ...(Array.isArray(manifest.unresolvedIdentities)
        ? manifest.unresolvedIdentities
        : [])
    ];
  }
  throw new Error("Source manifest has neither requirements nor documents");
}

function reconcileFamilyToQueue(jurisdiction, queueFamily, sourceRecords) {
  const queueBindings = queueFamily.documents.flatMap((document) =>
    document.usageBindings.map((binding) => ({
      documentId: document.officialFormId,
      componentId: binding.componentId,
      trackId: binding.trackId
    }))
  );
  const queueBindingByComponent = new Map(
    queueBindings.map((binding) => [binding.componentId, binding])
  );
  const queueDocumentIds = new Set(
    queueFamily.documents.map((document) => document.officialFormId)
  );
  const recordProjections = sourceRecords.map((record, index) => ({
    index,
    documentId: sourceRecordDocumentId(record),
    componentIds: sourceRecordComponentIds(record),
    bindingPairs: sourceRecordBindingPairs(record),
    retainedFingerprint: hasRetainedFingerprint(record)
  }));
  const gaps = [];

  for (const projection of recordProjections) {
    for (const componentId of projection.componentIds) {
      if (!queueBindingByComponent.has(componentId)) {
        gaps.push(`unexpected_usage:${componentId}`);
      }
    }
    for (const binding of projection.bindingPairs) {
      const expected = queueBindingByComponent.get(binding.componentId);
      if (expected && binding.trackId !== expected.trackId) {
        gaps.push(
          `usage_track_mismatch:${binding.componentId}:${binding.trackId}`
        );
      }
    }
    const mapsToQueue =
      queueDocumentIds.has(projection.documentId) ||
      projection.componentIds.some((componentId) =>
        queueBindingByComponent.has(componentId)
      );
    if (!mapsToQueue) {
      gaps.push(
        `unmapped_source_record:${projection.documentId ?? `index-${projection.index}`}`
      );
    }
  }

  let documentIdentitiesCovered = 0;
  let exactIdentityPinCount = 0;
  for (const document of queueFamily.documents) {
    const expectedComponentIds = document.usageBindings.map(
      (binding) => binding.componentId
    );
    const matchingRecords = recordProjections.filter(
      (projection) =>
        projection.documentId === document.officialFormId ||
        projection.componentIds.some((componentId) =>
          expectedComponentIds.includes(componentId)
        )
    );
    if (matchingRecords.length === 0) {
      gaps.push(`missing_document:${document.officialFormId}`);
      continue;
    }

    const coveredComponentIds = new Set(
      matchingRecords.flatMap((projection) => projection.componentIds)
    );
    for (const componentId of expectedComponentIds) {
      if (!coveredComponentIds.has(componentId)) {
        gaps.push(`missing_usage:${document.officialFormId}:${componentId}`);
      }
    }

    const exactRequired =
      document.sourceIdentityState === "exact_source_requirement_ready";
    const exactPinned = matchingRecords.some(
      (projection) => projection.retainedFingerprint
    );
    if (exactRequired && !exactPinned) {
      gaps.push(`missing_exact_pin:${document.officialFormId}`);
    }
    if (exactRequired && exactPinned) exactIdentityPinCount += 1;
    if (!exactRequired || exactPinned) documentIdentitiesCovered += 1;
  }

  const declaredComponentIds = new Set(
    recordProjections.flatMap((projection) => projection.componentIds)
  );
  const usageBindingsCovered = queueBindings.filter((binding) =>
    declaredComponentIds.has(binding.componentId)
  ).length;

  return {
    jurisdiction,
    documentIdentitiesCovered,
    usageBindingsCovered,
    exactIdentityPinCount,
    gaps: [...new Set(gaps)].sort()
  };
}

function sourceRecordDocumentId(record) {
  return (
    record.componentDocumentId ??
    record.documentId ??
    record.officialFormId ??
    null
  );
}

function sourceRecordComponentIds(record) {
  const componentIds = [];
  if (Array.isArray(record.usageBindings)) {
    for (const binding of record.usageBindings) {
      if (typeof binding?.componentId === "string") {
        componentIds.push(binding.componentId);
      }
    }
  }
  if (Array.isArray(record.componentIds)) {
    for (const componentId of record.componentIds) {
      if (typeof componentId === "string") componentIds.push(componentId);
    }
  }
  if (typeof record.componentId === "string") {
    componentIds.push(record.componentId);
  }
  return [...new Set(componentIds)];
}

function sourceRecordBindingPairs(record) {
  const pairs = [];
  if (Array.isArray(record.usageBindings)) {
    for (const binding of record.usageBindings) {
      if (
        typeof binding?.componentId === "string" &&
        typeof binding.trackId === "string"
      ) {
        pairs.push({
          componentId: binding.componentId,
          trackId: binding.trackId
        });
      }
    }
  }
  if (
    typeof record.componentId === "string" &&
    typeof record.trackId === "string"
  ) {
    pairs.push({
      componentId: record.componentId,
      trackId: record.trackId
    });
  }
  return pairs;
}

function hasRetainedFingerprint(record) {
  const sha256 = record.expectedSha256 ?? record.expected?.sha256;
  const bytes = record.expectedBytes ?? record.expected?.bytes;
  return (
    typeof sha256 === "string" &&
    /^[0-9a-f]{64}$/u.test(sha256) &&
    Number.isSafeInteger(bytes) &&
    bytes > 0
  );
}

function validatePortablePlanningPath(value, label) {
  assertPortableRelativePath(value, label);
  assert.doesNotMatch(
    value,
    /[?#]|:\/\//u,
    `${label} must not contain a query, fragment, or URI scheme`
  );
  const segments = value.split("/").map((segment) => segment.toLowerCase());
  assert.notEqual(
    segments[0],
    "private",
    `${label} must not expose private/ as a portable interface`
  );
  assert.equal(
    segments.includes("workspaces"),
    false,
    `${label} must not encode a Codespace path`
  );
}

function validatePortablePlanningLocator(value, label) {
  const parsed = parsePortableLocator(value);
  assert.equal(
    APPROVED_PORTABLE_LOCATOR_SCHEMES.has(parsed.scheme),
    true,
    `${label} uses an unapproved portable locator scheme: ${parsed.scheme}`
  );
}

function walk(value, visit, key = null) {
  visit(value, key);
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, visit);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [childKey, childValue] of Object.entries(value)) {
    walk(childValue, visit, childKey);
  }
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function stripJavaScriptCommentsAndLiterals(source) {
  return source.replace(
    /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/gu,
    (match) => match.replace(/[^\r\n]/gu, " ")
  );
}

function writeReviewAtomically(reviewPath, value) {
  if (fs.existsSync(reviewPath)) {
    const existing = fs.lstatSync(reviewPath);
    assert.equal(
      existing.isSymbolicLink(),
      false,
      `${REVIEW_PATH} must not be a symbolic link`
    );
    assert.equal(existing.isFile(), true, `${REVIEW_PATH} must be a file`);
  }
  const temporaryPath = `${reviewPath}.tmp-${process.pid}`;
  assert.equal(
    fs.existsSync(temporaryPath),
    false,
    `${path.relative(ROOT, temporaryPath)} already exists`
  );
  try {
    fs.writeFileSync(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o644
      }
    );
    fs.renameSync(temporaryPath, reviewPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function collectFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}
