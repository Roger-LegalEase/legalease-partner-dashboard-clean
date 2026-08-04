#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireMaterialized = process.argv.includes("--require-materialized");
const unexpectedArgs = process.argv
  .slice(2)
  .filter((arg) => arg !== "--" && arg !== "--require-materialized");

if (unexpectedArgs.length > 0) {
  fail(`Unsupported argument(s): ${unexpectedArgs.join(", ")}`);
}

const familyDataDir =
  "data/record-clearing/production-factory/official-pdf-families/MA";
const packetCatalogPath =
  "src/lib/rcap/packets/jurisdictions/massachusetts/packet-assemblies.json";
const expectedRoutes = [
  "ma-expunge-k",
  "ma-expunge-mj",
  "ma-expunge-time",
  "ma-seal-admin",
  "ma-seal-court",
  "ma-seal-decrim"
];
const expectedSourceIds = [
  "ma-100k-petition-for-expungement-rev-2018-12-20",
  "ma-mps-petition-to-expunge-rev-2018-10-11-legacy",
  "ma-mps-petition-to-seal-rev-2012-04",
  "ma-tc0021-rev-2022-11",
  "ma-tc0057-rev-unknown-held"
];

try {
  await verify();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

async function verify() {
  const schemas = {
    sourceRequirements: readJson(`${familyDataDir}/source-requirements.schema.json`),
    fieldMap: readJson(`${familyDataDir}/field-map.schema.json`),
    fieldOwnership: readJson(`${familyDataDir}/field-ownership.schema.json`),
    fixture: readJson(`${familyDataDir}/fixture.schema.json`),
    packetAssembly: readJson(`${familyDataDir}/packet-assembly.schema.json`)
  };
  const sourceRequirements = readJson(`${familyDataDir}/source-requirements.json`);
  const ownership = readJson(`${familyDataDir}/field-ownership.json`);
  const fixtureCatalog = readJson(`${familyDataDir}/fixtures.json`);
  const packetCatalog = readJson(packetCatalogPath);
  const sourceRegistry = readJson(
    "data/record-clearing/source-artifact-registry.json"
  );
  const acquisitionDocuments = readJson(
    "planning/record-clearing-100-percent/acquisition-intelligence/documents.json"
  );
  const trackRegistry = readJson(
    "data/record-clearing/legal-design-track-registry.json"
  );
  const repositoryAssetAudit = readJson(
    "data/record-clearing/master-library/repository-asset-audit.json"
  );
  const fieldMaps = fs
    .readdirSync(resolveRepoPath(`${familyDataDir}/field-maps`))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readJson(`${familyDataDir}/field-maps/${name}`));

  verifySchemaEnvelopes(schemas);
  verifySourceRequirements(
    sourceRequirements,
    sourceRegistry,
    acquisitionDocuments,
    repositoryAssetAudit
  );
  verifyFieldMaps(fieldMaps, sourceRequirements, ownership);
  verifyOwnership(ownership, sourceRequirements);
  verifyFixtures(fixtureCatalog, ownership, sourceRequirements);
  verifyPacketAssemblies(
    packetCatalog,
    fixtureCatalog,
    ownership,
    sourceRequirements,
    fieldMaps,
    trackRegistry
  );
  verifyNotRegistered();

  const sourceResults = [];
  for (const requirement of sourceRequirements.documents) {
    const result = await inspectMaterializedSource(requirement, rootDir);
    sourceResults.push(result);
    if (
      result.code !== "source_missing" &&
      result.code !== "verified_candidate_bytes" &&
      result.code !== "legacy_candidate_rejected"
    ) {
      throw new Error(
        `${requirement.sourceId}: ${result.code} (${result.detail})`
      );
    }
  }

  if (requireMaterialized) {
    const unresolved = sourceResults.filter(
      (result) => result.code !== "verified_candidate_bytes"
    );
    assert(
      unresolved.length === 0,
      `--require-materialized failed: ${unresolved
        .map((result) => `${result.sourceId}:${result.code}`)
        .join(", ")}`
    );
  }

  await verifyFailClosedSelfTests(sourceRequirements.documents[0]);

  const counts = sourceResults.reduce(
    (summary, result) => {
      summary[result.code] = (summary[result.code] ?? 0) + 1;
      return summary;
    },
    {}
  );

  process.stdout.write(
    [
      "Massachusetts official-PDF family verification passed.",
      `  routes: ${packetCatalog.packetAssemblies.length} (all runtime_disabled)`,
      `  physical source requirements: ${sourceRequirements.documents.length}`,
      `  field-map scaffolds: ${fieldMaps.length} (0 active bindings, 0 confirmed overlays)`,
      `  synthetic fixtures: ${fixtureCatalog.fixtures.length}`,
      `  current source state: ${Object.entries(counts)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([code, count]) => `${code}=${count}`)
        .join(", ")}`,
      "  fail-closed self-tests: missing source, same-size hash mismatch, and exact synthetic fingerprint all behaved as declared",
      "  live registry integration: absent"
    ].join("\n") + "\n"
  );
}

function verifySchemaEnvelopes(schemas) {
  for (const [name, schema] of Object.entries(schemas)) {
    assert(
      schema.$schema === "https://json-schema.org/draft/2020-12/schema",
      `${name} schema must declare JSON Schema 2020-12`
    );
    assert(schema.$id && schema.title, `${name} schema needs $id and title`);
    assert(schema.type === "object", `${name} schema root must be an object`);
    assert(
      schema.additionalProperties === false,
      `${name} schema root must reject additional properties`
    );
  }
}

function verifySourceRequirements(
  manifest,
  sourceRegistry,
  acquisitionDocuments,
  repositoryAssetAudit
) {
  assert(manifest.schemaVersion === 1, "source requirements schemaVersion drift");
  assert(
    manifest.familyId === "ma-trial-court-official-pdf-families",
    "source requirements familyId drift"
  );
  assert(manifest.jurisdiction === "MA", "source requirements jurisdiction drift");
  assert(
    manifest.runtimePosture === "fail_closed_pending_source_materialization",
    "source requirements must remain fail closed"
  );
  assert(manifest.physicalSourceCount === 5, "physical source count must remain 5");
  assert(manifest.routeCount === 6, "route count must remain 6");
  assert(
    manifest.documents.length === manifest.physicalSourceCount,
    "source requirements document count mismatch"
  );
  assertExactSet(
    manifest.documents.map((entry) => entry.sourceId),
    expectedSourceIds,
    "source IDs"
  );
  assertExactSet(
    manifest.documents.flatMap((entry) => entry.routeIds),
    expectedRoutes,
    "source-bound route IDs"
  );

  const legalReview = findObject(
    repositoryAssetAudit,
    (entry) => entry.workflowKey === "MA:STATEWIDE:LEGAL_REVIEW:EN"
  );
  const legalReviewAddendum = findObject(
    repositoryAssetAudit,
    (entry) =>
      entry.workflowKey ===
      "MA:STATEWIDE-ADDENDUM:LEGAL_REVIEW_ADDENDUM:EN"
  );
  assert(legalReview, "MA legal-review authority row is missing");
  assert(legalReviewAddendum, "MA legal-review addendum authority row is missing");
  assertAuthorityPin(manifest.authorityPins.legalReview, legalReview);
  assertAuthorityPin(
    manifest.authorityPins.legalReviewAddendum,
    legalReviewAddendum
  );

  const expectedArtifactIds = new Set(
    manifest.documents.map((entry) => entry.artifactId)
  );
  const registryArtifacts = uniqueBy(
    sourceRegistry.artifacts.filter((entry) =>
      expectedArtifactIds.has(entry.artifactId)
    ),
    (entry) => entry.artifactId,
    "target MA source artifact registry IDs"
  );
  const expectedAcquisitionIds = new Set(
    manifest.documents.flatMap((entry) => entry.acquisitionIds)
  );
  const acquisitions = uniqueBy(
    acquisitionDocuments.documents.filter((entry) =>
      expectedAcquisitionIds.has(entry.acquisitionId)
    ),
    (entry) => entry.acquisitionId,
    "target MA acquisition intelligence IDs"
  );

  for (const requirement of manifest.documents) {
    assert(
      /^[0-9a-f]{64}$/.test(requirement.expected.sha256),
      `${requirement.sourceId}: invalid expected SHA-256`
    );
    assert(
      Number.isInteger(requirement.expected.bytes) &&
        requirement.expected.bytes > 0,
      `${requirement.sourceId}: invalid expected byte length`
    );
    assert(
      requirement.expected.mimeType === "application/pdf",
      `${requirement.sourceId}: MIME must be application/pdf`
    );
    assert(
      requirement.expected.pdfMagicHex === "25504446",
      `${requirement.sourceId}: PDF magic must be pinned`
    );
    assert(
      requirement.materializationState === "binary_materialization_required",
      `${requirement.sourceId}: source must remain materialization-required`
    );
    assert(
      requirement.workerMayRead === true &&
        requirement.workerMayModify === false,
      `${requirement.sourceId}: sources must be read-only to this lane`
    );
    assert(
      requirement.generationAllowed === false &&
        requirement.runtimeStatus === "runtime_disabled",
      `${requirement.sourceId}: runtime/source gate was widened`
    );
    assert(
      requirement.materializationDependencies.length >= 5,
      `${requirement.sourceId}: incomplete materialization dependency declaration`
    );

    const registryArtifact = registryArtifacts.get(requirement.artifactId);
    assert(
      registryArtifact,
      `${requirement.sourceId}: source registry artifact ${requirement.artifactId} is missing`
    );
    assert(
      registryArtifact.inventorySha256 === requirement.expected.sha256,
      `${requirement.sourceId}: SHA-256 differs from source registry`
    );
    assert(
      registryArtifact.sizeBytes === requirement.expected.bytes,
      `${requirement.sourceId}: byte length differs from source registry`
    );
    assert(
      registryArtifact.sourcePath === requirement.repositorySourcePath,
      `${requirement.sourceId}: source path differs from source registry`
    );

    const sourceAcquisitions = requirement.acquisitionIds.map((acquisitionId) => {
      const acquisition = acquisitions.get(acquisitionId);
      assert(
        acquisition,
        `${requirement.sourceId}: acquisition record ${acquisitionId} is missing`
      );
      return acquisition;
    });
    assertExactSet(
      sourceAcquisitions.flatMap((entry) => entry.trackIds),
      requirement.routeIds,
      `${requirement.sourceId} acquisition track IDs`
    );
    assertExactSet(
      sourceAcquisitions.flatMap((entry) => entry.componentIds),
      requirement.componentIds,
      `${requirement.sourceId} acquisition component IDs`
    );
    for (const acquisition of sourceAcquisitions) {
      assert(
        acquisition.directOfficialUrl === requirement.directOfficialUrl,
        `${requirement.sourceId}: direct official URL differs from acquisition intelligence`
      );
    }

    if (requirement.canonicalAuthorityAsset) {
      const authorityAsset = findObject(
        repositoryAssetAudit,
        (entry) =>
          entry.workflowKey === requirement.canonicalAuthorityAsset.workflowKey &&
          entry.canonicalRelativePath ===
            requirement.canonicalAuthorityAsset.canonicalRelativePath
      );
      assert(
        authorityAsset,
        `${requirement.sourceId}: canonical authority asset was not found`
      );
      assert(
        authorityAsset.canonicalRelativePath ===
          requirement.canonicalAuthorityAsset.canonicalRelativePath,
        `${requirement.sourceId}: canonical authority path drift`
      );
      assert(
        authorityAsset.assetClass === "source_gated",
        `${requirement.sourceId}: canonical authority asset must remain source_gated`
      );
      assert(
        authorityAsset.sha256 === null ||
          authorityAsset.sha256 === undefined ||
          authorityAsset.sha256 === requirement.expected.sha256,
        `${requirement.sourceId}: canonical authority fingerprint conflicts with the exact source requirement`
      );
    }
  }

  const ocp = manifest.inventoryExclusions.find((entry) =>
    entry.artifactId.startsWith("ocp004-")
  );
  assert(ocp?.runtimeUse === "none", "OCP004 must remain an inventory-only exclusion");
}

function verifyFieldMaps(fieldMaps, sourceRequirements, ownership) {
  assert(fieldMaps.length === 5, "exactly five field-map scaffolds are required");
  const sources = uniqueBy(
    sourceRequirements.documents,
    (entry) => entry.sourceId,
    "source requirement IDs"
  );
  const ownershipFields = new Set(
    ownership.fields.map((field) => field.fieldKey)
  );
  const ownershipRoutes = uniqueBy(
    ownership.routes,
    (entry) => entry.routeId,
    "ownership route IDs"
  );

  assertExactSet(
    fieldMaps.map((entry) => entry.sourceId),
    expectedSourceIds,
    "field-map source IDs"
  );

  for (const fieldMap of fieldMaps) {
    const source = sources.get(fieldMap.sourceId);
    assert(source, `${fieldMap.fieldMapId}: unknown sourceId`);
    assert(
      fieldMap.sourcePath === source.repositorySourcePath,
      `${fieldMap.fieldMapId}: source path drift`
    );
    assert(
      fieldMap.exactSourceSha256 === source.expected.sha256,
      `${fieldMap.fieldMapId}: source SHA-256 drift`
    );
    assert(
      fieldMap.mappingStatus === "blocked_pending_exact_source_inspection" &&
        fieldMap.activeRendererStrategy === null,
      `${fieldMap.fieldMapId}: field map was activated before source inspection`
    );
    assert(
      fieldMap.sourceInspection.state === "not_run_source_absent" &&
        fieldMap.sourceInspection.inspectedSha256 === null,
      `${fieldMap.fieldMapId}: unsupported source inspection claim`
    );
    assert(
      fieldMap.sourceFieldBindings.length === 0,
      `${fieldMap.fieldMapId}: source-field bindings were invented before materialization`
    );
    assert(
      fieldMap.overlayPlacements.length === 0,
      `${fieldMap.fieldMapId}: overlay coordinates were invented before materialization`
    );
    assert(
      fieldMap.reviewStatus.mappingApproved === false &&
        fieldMap.reviewStatus.visual !== "visual_review_passed" &&
        fieldMap.reviewStatus.legal !== "legal_approved",
      `${fieldMap.fieldMapId}: human-only approval was asserted`
    );
    assertExactSet(
      fieldMap.routeIds,
      source.routeIds,
      `${fieldMap.fieldMapId} route IDs`
    );

    for (const fieldKey of fieldMap.canonicalFieldRequirements) {
      assert(
        ownershipFields.has(fieldKey),
        `${fieldMap.fieldMapId}: ${fieldKey} lacks canonical ownership`
      );
      assert(
        fieldMap.routeIds.some((routeId) =>
          ownershipRoutes.get(routeId)?.fieldKeys.includes(fieldKey)
        ),
        `${fieldMap.fieldMapId}: ${fieldKey} belongs to none of its routes`
      );
    }
  }
}

function verifyOwnership(ownership, sourceRequirements) {
  assert(ownership.schemaVersion === 1, "ownership schemaVersion drift");
  assert(
    ownership.coverageScope ===
      "canonical_fields_only_pending_exact_source_inventory",
    "ownership map must not claim source-field coverage"
  );
  assert(
    ownership.sourceFieldCoverageState === "pending_exact_source_inventory" &&
      ownership.unclassifiedSourceFieldPolicy === "reject",
    "unclassified source fields must fail closed"
  );
  assertExactSet(
    ownership.routes.map((entry) => entry.routeId),
    expectedRoutes,
    "ownership route IDs"
  );
  assertExactSet(
    ownership.writableOwners,
    ["participant", "system_derived"],
    "writable owners"
  );

  const fields = uniqueBy(
    ownership.fields,
    (entry) => entry.fieldKey,
    "ownership field keys"
  );
  const sources = uniqueBy(
    sourceRequirements.documents,
    (entry) => entry.sourceId,
    "source requirement IDs"
  );
  const thirdPartyOwners = new Set([
    "participant_manual",
    "agency",
    "court",
    "clerk",
    "judge",
    "prosecutor",
    "notary",
    "process_server"
  ]);

  for (const field of ownership.fields) {
    if (thirdPartyOwners.has(field.owner)) {
      assert(
        field.automationPolicy === "leave_blank",
        `${field.fieldKey}: ${field.owner} field must stay blank`
      );
    }
    if (field.owner === "prohibited_from_generation") {
      assert(
        field.automationPolicy === "reject",
        `${field.fieldKey}: prohibited field must reject generation`
      );
    }
    if (field.automationPolicy === "auto_fill_candidate") {
      assert(
        field.owner === "participant" || field.owner === "system_derived",
        `${field.fieldKey}: non-writable owner marked auto-fillable`
      );
    }
  }

  const defaultPolicies = uniqueBy(
    ownership.actorDefaults,
    (entry) => entry.owner,
    "actor default owners"
  );
  for (const owner of [
    "participant_manual",
    "agency",
    "court",
    "clerk",
    "judge",
    "prosecutor",
    "notary",
    "process_server"
  ]) {
    assert(
      defaultPolicies.get(owner)?.automationPolicy === "leave_blank",
      `${owner}: missing fail-closed default ownership policy`
    );
  }
  assert(
    defaultPolicies.get("prohibited_from_generation")?.automationPolicy ===
      "reject",
    "prohibited source fields must reject"
  );

  for (const route of ownership.routes) {
    assert(sources.has(route.sourceId), `${route.routeId}: unknown ownership source`);
    for (const fieldKey of route.fieldKeys) {
      assert(fields.has(fieldKey), `${route.routeId}: unknown field ${fieldKey}`);
    }
  }
}

function verifyFixtures(fixtureCatalog, ownership, sourceRequirements) {
  assert(fixtureCatalog.schemaVersion === 1, "fixture schemaVersion drift");
  assertExactSet(
    fixtureCatalog.fixtures.map((entry) => entry.routeId),
    expectedRoutes,
    "fixture route IDs"
  );
  const fixtures = uniqueBy(
    fixtureCatalog.fixtures,
    (entry) => entry.fixtureId,
    "fixture IDs"
  );
  assert(fixtures.size === 6, "exactly six fixture IDs are required");

  const ownershipRoutes = uniqueBy(
    ownership.routes,
    (entry) => entry.routeId,
    "ownership route IDs"
  );
  const fields = uniqueBy(
    ownership.fields,
    (entry) => entry.fieldKey,
    "ownership field keys"
  );
  const thirdPartyOwners = new Set([
    "agency",
    "court",
    "clerk",
    "judge",
    "prosecutor",
    "notary",
    "process_server",
    "prohibited_from_generation"
  ]);
  const sources = uniqueBy(
    sourceRequirements.documents,
    (entry) => entry.sourceId,
    "source requirement IDs"
  );

  for (const fixture of fixtureCatalog.fixtures) {
    assert(fixture.synthetic === true, `${fixture.fixtureId}: fixture must be synthetic`);
    const routeOwnership = ownershipRoutes.get(fixture.routeId);
    assert(routeOwnership, `${fixture.fixtureId}: missing route ownership`);
    assert(
      routeOwnership.sourceId === fixture.sourceId,
      `${fixture.fixtureId}: source differs from ownership map`
    );
    const source = sources.get(fixture.sourceId);
    assert(source, `${fixture.fixtureId}: unknown source`);
    assert(
      fixture.expectedSourceSha256 === source.expected.sha256,
      `${fixture.fixtureId}: source hash drift`
    );
    assertExactSet(
      fixture.manualFieldsExpectedBlank,
      routeOwnership.fieldKeys.filter(
        (fieldKey) => fields.get(fieldKey)?.owner === "participant_manual"
      ),
      `${fixture.fixtureId} manual fields expected blank`
    );
    assertExactSet(
      fixture.thirdPartyFieldsExpectedBlank,
      routeOwnership.fieldKeys.filter((fieldKey) =>
        thirdPartyOwners.has(fields.get(fieldKey)?.owner)
      ),
      `${fixture.fixtureId} third-party fields expected blank`
    );

    for (const requiredKey of fixture.requiredFactKeys) {
      assert(
        Object.hasOwn(fixture.facts, requiredKey),
        `${fixture.fixtureId}: required fixture fact ${requiredKey} is absent`
      );
      assertNonemptyFact(
        fixture.facts[requiredKey],
        `${fixture.fixtureId}.${requiredKey}`
      );
    }

    for (const factKey of Object.keys(fixture.facts)) {
      assert(
        routeOwnership.fieldKeys.includes(factKey),
        `${fixture.fixtureId}: fact ${factKey} lacks route ownership`
      );
      const field = fields.get(factKey);
      assert(field, `${fixture.fixtureId}: fact ${factKey} lacks field ownership`);
      assert(
        field.automationPolicy === "auto_fill_candidate" ||
          field.automationPolicy === "screening_only",
        `${fixture.fixtureId}: fixture supplies non-writable field ${factKey}`
      );
    }

    for (const fieldKey of fixture.manualFieldsExpectedBlank) {
      assert(
        !Object.hasOwn(fixture.facts, fieldKey),
        `${fixture.fixtureId}: manual field ${fieldKey} must be absent from facts`
      );
      assert(
        fields.get(fieldKey)?.owner === "participant_manual",
        `${fixture.fixtureId}: manual blank ${fieldKey} ownership mismatch`
      );
    }
    for (const fieldKey of fixture.thirdPartyFieldsExpectedBlank) {
      assert(
        !Object.hasOwn(fixture.facts, fieldKey),
        `${fixture.fixtureId}: third-party field ${fieldKey} must be absent from facts`
      );
      assert(
        !ownership.writableOwners.includes(fields.get(fieldKey)?.owner),
        `${fixture.fixtureId}: third-party blank ${fieldKey} marked writable`
      );
    }

    assert(
      fixture.expectedGateResult.currentWorkspace === "source_missing" &&
        fixture.expectedGateResult.wrongBytes === "source_hash_mismatch" &&
        fixture.expectedGateResult.runtime === "runtime_disabled",
      `${fixture.fixtureId}: fail-closed expectations drift`
    );
  }
}

function verifyPacketAssemblies(
  packetCatalog,
  fixtureCatalog,
  ownership,
  sourceRequirements,
  fieldMaps,
  trackRegistry
) {
  assert(packetCatalog.schemaVersion === 1, "packet catalog schemaVersion drift");
  assert(
    packetCatalog.definitionStatus === "preflight_only_not_registered",
    "packet catalog must remain preflight-only"
  );
  assert(
    packetCatalog.sourceSelectionPolicy ===
      "explicit_source_id_only_no_filename_scan_or_fallback",
    "packet source selection must be explicit and fail closed"
  );
  assertExactSet(
    packetCatalog.packetAssemblies.map((entry) => entry.trackId),
    expectedRoutes,
    "packet assembly route IDs"
  );

  const fixturesByRoute = uniqueBy(
    fixtureCatalog.fixtures,
    (entry) => entry.routeId,
    "fixture route IDs"
  );
  const ownershipByRoute = uniqueBy(
    ownership.routes,
    (entry) => entry.routeId,
    "ownership route IDs"
  );
  const sources = uniqueBy(
    sourceRequirements.documents,
    (entry) => entry.sourceId,
    "source requirement IDs"
  );
  const maps = uniqueBy(fieldMaps, (entry) => entry.fieldMapId, "field map IDs");
  const normalizedTracks = uniqueBy(
    trackRegistry.tracks.filter((entry) => entry.jurisdiction === "MA"),
    (entry) => entry.trackId,
    "normalized MA track IDs"
  );

  for (const assembly of packetCatalog.packetAssemblies) {
    assert(
      assembly.assemblyStatus === "blocked_pending_source_materialization" &&
        assembly.expectedPreMaterializationError === "source_missing",
      `${assembly.trackId}: assembly does not fail closed before materialization`
    );
    assert(
      assembly.sourceCurrent === false &&
        assembly.runtimeDisabled === true &&
        assembly.runtimeStatus === "runtime_disabled" &&
        assembly.packetReady === false &&
        assembly.generationAllowed === false,
      `${assembly.trackId}: runtime posture was widened`
    );

    const fixture = fixturesByRoute.get(assembly.trackId);
    assert(fixture, `${assembly.trackId}: fixture is missing`);
    assert(
      assembly.fixtureId === fixture.fixtureId,
      `${assembly.trackId}: fixture ID drift`
    );
    assertExactSet(
      assembly.requiredFactKeys,
      fixture.requiredFactKeys,
      `${assembly.trackId} required facts`
    );
    assert(
      ownershipByRoute.has(assembly.trackId),
      `${assembly.trackId}: ownership route is missing`
    );

    const normalized = normalizedTracks.get(assembly.trackId);
    assert(normalized, `${assembly.trackId}: normalized track is missing`);
    assert(
      assembly.packetSetId === normalized.packetSet.packetSetId &&
        assembly.packetSetVersion === normalized.packetSet.version,
      `${assembly.trackId}: packet-set identity differs from normalized legal design`
    );
    if (normalized.compositionMode === "sequential") {
      assert(
        assembly.trackOutputStrategy === "composed" &&
          assembly.compositionMode === "sequential",
        `${assembly.trackId}: sequential composition drift`
      );
    } else {
      assert(
        assembly.trackOutputStrategy === normalized.outputStrategy &&
          assembly.compositionMode === null,
        `${assembly.trackId}: output strategy drift`
      );
    }

    assert(
      assembly.components.length === normalized.packetSet.components.length,
      `${assembly.trackId}: packet component count drift`
    );
    for (const component of assembly.components) {
      const normalizedComponent = normalized.packetSet.components.find(
        (entry) => entry.componentId === component.componentId
      );
      assert(
        normalizedComponent,
        `${assembly.trackId}: component ${component.componentId} is not normalized`
      );
      assert(
        component.order === normalizedComponent.order &&
          component.role === normalizedComponent.role &&
          component.outputStrategy === normalizedComponent.outputStrategy,
        `${component.componentId}: normalized role/order/strategy drift`
      );
      assert(
        component.generationAllowed === false &&
          component.approval.mappingApproved === false &&
          component.approval.visual !== "visual_review_passed" &&
          component.approval.legal !== "legal_approved",
        `${component.componentId}: approval or generation gate widened`
      );

      if (component.kind === "official_pdf") {
        const source = sources.get(component.sourceId);
        assert(source, `${component.componentId}: unknown explicit source`);
        assert(
          source.componentIds.includes(component.componentId),
          `${component.componentId}: source does not bind this component`
        );
        assert(
          component.sourcePath === source.repositorySourcePath &&
            component.sourcePath === normalizedComponent.officialSourceUrl,
          `${component.componentId}: source path drift`
        );
        const fieldMap = maps.get(component.fieldMapId);
        assert(fieldMap, `${component.componentId}: unknown field-map scaffold`);
        assert(
          fieldMap.sourceId === source.sourceId &&
            fieldMap.mappingStatus ===
              "blocked_pending_exact_source_inspection",
          `${component.componentId}: field map/source gate mismatch`
        );
      } else {
        assert(
          component.sourceId === null &&
            component.sourcePath === null &&
            component.fieldMapId === null,
          `${component.componentId}: process guidance cannot select a PDF source`
        );
      }
    }

    const normalizedRequiredKeys = normalized.generationRequirements
      .filter((entry) => entry.requirement === "required")
      .map((entry) => entry.key);
    assertExactSet(
      assembly.requiredFactKeys,
      normalizedRequiredKeys,
      `${assembly.trackId} normalized generation requirements`
    );
  }
}

function verifyNotRegistered() {
  const registry = fs.readFileSync(
    resolveRepoPath("src/lib/rcap/packets/registry.ts"),
    "utf8"
  );
  assert(
    !registry.includes("massachusetts/official-pdf-families") &&
      !registry.includes("ma-trial-court-official-pdf-families"),
    "preflight family must not be imported by the live packet registry"
  );
}

async function inspectMaterializedSource(requirement, baseDir) {
  const absolutePath = resolveWithin(baseDir, requirement.repositorySourcePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      sourceId: requirement.sourceId,
      code: "source_missing",
      detail: requirement.repositorySourcePath
    };
  }
  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) {
    return {
      sourceId: requirement.sourceId,
      code: "source_not_file",
      detail: requirement.repositorySourcePath
    };
  }
  const bytes = fs.readFileSync(absolutePath);
  if (bytes.byteLength !== requirement.expected.bytes) {
    return {
      sourceId: requirement.sourceId,
      code: "source_byte_length_mismatch",
      detail: `expected ${requirement.expected.bytes}, got ${bytes.byteLength}`
    };
  }
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== requirement.expected.sha256) {
    return {
      sourceId: requirement.sourceId,
      code: "source_hash_mismatch",
      detail: `expected ${requirement.expected.sha256}, got ${sha256}`
    };
  }
  if (bytes.subarray(0, 4).toString("hex") !== requirement.expected.pdfMagicHex) {
    return {
      sourceId: requirement.sourceId,
      code: "source_mime_mismatch",
      detail: "exact bytes do not start with %PDF"
    };
  }

  const structural = await inspectPdfStructure(bytes);
  if (structural.parseError) {
    return {
      sourceId: requirement.sourceId,
      code: "source_structure_mismatch",
      detail: `the fingerprint-matched candidate is not a parseable PDF: ${structural.parseError}`
    };
  }
  if (
    requirement.technicalExpectation.encrypted === false &&
    structural.encrypted
  ) {
    return {
      sourceId: requirement.sourceId,
      code: "source_structure_mismatch",
      detail: "the exact candidate unexpectedly contains an encryption dictionary"
    };
  }
  if (
    requirement.technicalExpectation.xfa === false &&
    structural.xfa
  ) {
    return {
      sourceId: requirement.sourceId,
      code: "source_structure_mismatch",
      detail: "the exact candidate unexpectedly contains XFA"
    };
  }
  if (
    requirement.technicalExpectation.evidenceState ===
      "historical_registry_measurement_requires_reinspection" &&
    (structural.pageCount !== requirement.technicalExpectation.pageCount ||
      structural.fieldCount !== requirement.technicalExpectation.fieldCount)
  ) {
    return {
      sourceId: requirement.sourceId,
      code: "source_structure_mismatch",
      detail: `expected ${requirement.technicalExpectation.pageCount} pages/${requirement.technicalExpectation.fieldCount} fields, got ${structural.pageCount} pages/${structural.fieldCount} fields`
    };
  }

  if (
    requirement.fingerprintDisposition ===
    "legacy_candidate_requires_replacement"
  ) {
    return {
      sourceId: requirement.sourceId,
      code: "legacy_candidate_rejected",
      detail: "fingerprint matched, but acquisition intelligence rejects this legacy candidate for current rendering",
      structural
    };
  }
  return {
    sourceId: requirement.sourceId,
    code: "verified_candidate_bytes",
    detail: `${structural.pageCount} pages, ${structural.fieldCount} AcroForm fields, xfa=${structural.xfa}`,
    structural
  };
}

async function inspectPdfStructure(bytes) {
  const latin = bytes.toString("latin1");
  const xfa = /\/XFA\b/.test(latin);
  const encrypted = /\/Encrypt\b/.test(latin);
  if (encrypted) {
    return { xfa, encrypted, pageCount: null, fieldCount: null };
  }
  try {
    const { PDFDocument } = await import("pdf-lib");
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    return {
      xfa,
      encrypted,
      pageCount: document.getPageCount(),
      fieldCount: document.getForm().getFields().length
    };
  } catch (error) {
    return {
      xfa,
      encrypted,
      pageCount: null,
      fieldCount: null,
      parseError: String(error instanceof Error ? error.message : error).slice(
        0,
        160
      )
    };
  }
}

async function verifyFailClosedSelfTests(realRequirement) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "rcap-ma-official-pdf-gate-")
  );
  try {
    const missing = await inspectMaterializedSource(realRequirement, tempRoot);
    assert(
      missing.code === "source_missing",
      "self-test: missing source did not fail closed"
    );

    const tamperedPath = resolveWithin(
      tempRoot,
      realRequirement.repositorySourcePath
    );
    fs.mkdirSync(path.dirname(tamperedPath), { recursive: true });
    const tampered = Buffer.alloc(realRequirement.expected.bytes, 0x41);
    tampered.set(Buffer.from("%PDF"), 0);
    fs.writeFileSync(tamperedPath, tampered);
    const mismatch = await inspectMaterializedSource(realRequirement, tempRoot);
    assert(
      mismatch.code === "source_hash_mismatch",
      `self-test: same-size tampered source returned ${mismatch.code}`
    );

    const { PDFDocument } = await import("pdf-lib");
    const exactDocument = await PDFDocument.create();
    exactDocument.addPage([612, 792]);
    const exactBytes = Buffer.from(
      await exactDocument.save({
        addDefaultPage: false,
        updateFieldAppearances: false,
        useObjectStreams: false
      })
    );
    const syntheticRequirement = {
      ...realRequirement,
      sourceId: "ma-self-test-exact-fingerprint",
      repositorySourcePath: "private/ma-self-test/exact.pdf",
      expected: {
        sha256: crypto
          .createHash("sha256")
          .update(exactBytes)
          .digest("hex"),
        bytes: exactBytes.byteLength,
        mimeType: "application/pdf",
        pdfMagicHex: "25504446"
      },
      fingerprintDisposition:
        "historical_candidate_pending_manual_official_diff",
      technicalExpectation: {
        ...realRequirement.technicalExpectation,
        pageCount: 1,
        fieldCount: 0,
        xfa: null,
        encrypted: false,
        evidenceState: "historical_registry_conflict_requires_reinspection"
      }
    };
    const exactPath = resolveWithin(
      tempRoot,
      syntheticRequirement.repositorySourcePath
    );
    fs.mkdirSync(path.dirname(exactPath), { recursive: true });
    fs.writeFileSync(exactPath, exactBytes);
    const exact = await inspectMaterializedSource(
      syntheticRequirement,
      tempRoot
    );
    assert(
      exact.code === "verified_candidate_bytes",
      `self-test: exact fingerprint returned ${exact.code}`
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function assertAuthorityPin(pin, auditRow) {
  assert(pin.workflowKey === auditRow.workflowKey, `${pin.workflowKey}: workflow drift`);
  assert(pin.revision === auditRow.revision, `${pin.workflowKey}: revision drift`);
  assert(pin.sha256 === auditRow.sha256, `${pin.workflowKey}: SHA-256 drift`);
  assert(
    pin.canonicalRelativePath === auditRow.canonicalRelativePath,
    `${pin.workflowKey}: canonical path drift`
  );
  assert(
    pin.generationAllowed === false && pin.runtimeStatus === "runtime_disabled",
    `${pin.workflowKey}: authority pin must remain runtime-disabled`
  );
}

function assertNonemptyFact(value, label) {
  if (typeof value === "string") {
    assert(value.trim().length > 0, `${label} must not be blank`);
    return;
  }
  if (Array.isArray(value)) {
    assert(value.length > 0, `${label} must not be an empty array`);
    return;
  }
  assert(
    typeof value === "boolean" ||
      (Number.isInteger(value) && Number.isFinite(value)),
    `${label} has an unsupported fixture value`
  );
}

function uniqueBy(entries, keyOf, label) {
  const result = new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    assert(typeof key === "string" && key.length > 0, `${label}: blank key`);
    assert(!result.has(key), `${label}: duplicate ${key}`);
    result.set(key, entry);
  }
  return result;
}

function findObject(value, predicate) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findObject(entry, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (predicate(value)) return value;
  for (const entry of Object.values(value)) {
    const found = findObject(entry, predicate);
    if (found) return found;
  }
  return null;
}

function assertExactSet(actual, expected, label) {
  const normalizedActual = [...new Set(actual)].sort();
  const normalizedExpected = [...new Set(expected)].sort();
  assert(
    normalizedActual.length === actual.length,
    `${label}: duplicate values are not allowed`
  );
  assert(
    JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected),
    `${label}: expected [${normalizedExpected.join(", ")}], got [${normalizedActual.join(", ")}]`
  );
}

function readJson(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(
      `${relativePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function resolveRepoPath(relativePath) {
  return resolveWithin(rootDir, relativePath);
}

function resolveWithin(baseDir, relativePath) {
  assert(!path.isAbsolute(relativePath), `path must be repository-relative: ${relativePath}`);
  const absolutePath = path.resolve(baseDir, relativePath);
  const relative = path.relative(baseDir, absolutePath);
  assert(
    relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    `path escapes its root: ${relativePath}`
  );
  return absolutePath;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fail(message) {
  process.stderr.write(
    `Massachusetts official-PDF family verification failed: ${message}\n`
  );
  process.exitCode = 1;
}
