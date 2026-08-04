#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  TRACK_PROMOTION_APPLICATION_SCHEMA,
  TRACK_PROMOTION_BATCH_SCHEMA,
  TRACK_STAGE_ARTIFACT_SCHEMA,
  TRACK_STAGE_PROOF_SCHEMA,
  buildTrackApprovalEntries,
  buildTrackApprovalEntry,
  canonicalJson,
  canonicalJsonSha256,
  classifyTrackReliefCharacter,
  evaluateTrackPromotionBatch
} from "./rcap-apply-track-promotion-batch.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY_SCRIPT = "scripts/rcap-apply-track-promotion-batch.mjs";
const TEMPLATE_PATH = "docs/rcap-promotion/track-approval-template.json";
const ADOPTION_PATHS = [
  "data/record-clearing/template-families/ADOPT-01-custom-pleading-family-adoption.json",
  "data/record-clearing/template-families/ADOPT-02-official-acroform-family-adoption.json"
];
const PROTECTED_INPUTS = [
  ...ADOPTION_PATHS,
  "data/record-clearing/legal-design-track-registry.json",
  "data/record-clearing/master-library/authority.json",
  "data/record-clearing/master-library/track-source-audit.json",
  "data/record-clearing/production-factory/review-manifests/rcap-ga-custom-pleading.json",
  "src/lib/rcap/jurisdictions/packet-capability.ts",
  "src/lib/rcap/state-promotion-manifest.ts"
];
const EXPECTED_ROUTES = [
  "ms-fel",
  "ms-misd-1st",
  "ms-misd-addl",
  "ms-nonconv",
  "ms-nonadj",
  "md_second_chance_shielding",
  "ga-felony-j1",
  "ga-vacated-j2",
  "ga-deaddocket-j3",
  "ga-misd-j4",
  "ga-fugitive-j5",
  "ga-pardon-j7",
  "ga-seal-m",
  "ga-fo-active-pre2026",
  "ga-fo-discharged-pre2026"
];
const FIXED_APPLICATION_TIME = "2026-08-04T00:00:00.000Z";
const TEMP_RELATIVE = `tmp/rcap-track-promotion/verifier-${process.pid}-${crypto
  .randomBytes(6)
  .toString("hex")}`;
const TEMP_ABSOLUTE = path.join(ROOT, TEMP_RELATIVE);
const EVIDENCE_FIXTURE_ROOT = path.join(
  TEMP_ABSOLUTE,
  "committed-evidence-repository"
);
const STAGE_PROOF_POLICIES = {
  packet_persistence: {
    directory:
      "data/record-clearing/production-factory/promotion-evidence/packet-persistence",
    producerContract: "rcap-packet-persistence/v1",
    environment: "artifact_store",
    deployment: "not_applicable"
  },
  staging_contract: {
    directory:
      "data/record-clearing/production-factory/promotion-evidence/staging-contract",
    producerContract: "rcap-staging-contract/v1",
    environment: "staging",
    deployment: "contract_only"
  },
  staging_acceptance: {
    directory:
      "data/record-clearing/production-factory/promotion-evidence/staging-acceptance",
    producerContract: "rcap-staging-acceptance/v1",
    environment: "staging",
    deployment: "staging_applied_and_verified"
  }
};
const checks = [];

const bytesBefore = snapshotFiles(PROTECTED_INPUTS);
const statusBefore = gitStatus();

try {
  fs.mkdirSync(TEMP_ABSOLUTE, { recursive: true });

  await check("template documents the strict route-scoped contract", () => {
    const template = readJson(TEMPLATE_PATH);
    assert.equal(
      template.schemaVersion,
      "rcap-track-promotion-batch-template/v1"
    );
    assert.equal(template.batchSchemaVersion, TRACK_PROMOTION_BATCH_SCHEMA);
    assert.deepEqual(template.operations, [
      "bind_adopted_tracks",
      "select_staging_tracks",
      "validate_staging_acceptance",
      "validate_production_promotion_eligibility"
    ]);
    assert.equal(template.contract.selectionMode, "exact_tracks_only");
    assert.equal(template.contract.atomicBatch, true);
    assert.equal(template.contract.jurisdictionApprovalInferred, false);
    assert.equal(
      template.contract.currentStateMustBeAuthoredAndRecomputed,
      true
    );
    assert.equal(template.contract.materialHashDriftRequiresNewReview, true);
    assert.equal(
      template.contract.authorityEditionMustMatchCounselScope,
      true
    );
    assert.equal(
      template.contract.sharedRuntimeRegistrationMustBeCurrent,
      true
    );
    assert.equal(
      template.contract.nonCounselReleaseBlockersMustBeClosed,
      true
    );
    assert.equal(template.contract.stageEvidenceMustFormExactChain, true);
    assert.equal(
      template.contract.commercialLicenseExclusionsRemainBlocking,
      true
    );
    assert.equal(
      template.contract.externalDependenciesRequireExactEvidence,
      true
    );
    assert.equal(template.contract.nonReliefRoutesRemainDistinct, true);
    assert.equal(
      template.contract.operatorRoleAssertionGrantsAuthority,
      false
    );
    assert.equal(template.contract.applyCreatesReceiptOnly, true);
    assert.equal(template.receipt.schemaVersion, TRACK_PROMOTION_APPLICATION_SCHEMA);
    assert.equal(template.receipt.mutatesSharedRegistries, false);
    assert.equal(template.receipt.eligibilityOnly, true);
    assert.equal(template.receipt.authorizesPromotion, false);
    assert.equal(template.receipt.changesRuntimePosture, false);
    assert.equal(template.receipt.changesPublicRouting, false);
    assert.match(
      template.batchEnvelope.tracks[0].trackScopeSha256,
      /canonical-sha256/u
    );
    assert.deepEqual(
      Object.keys(template.evidenceDocument.artifactPins[0]).sort(),
      ["path", "sha256"]
    );
    assert.match(
      template.evidenceDocument.artifactPins[0].path,
      /tracked-repository-relative/u
    );
    assert.equal(template.evidenceTrust.stageProofMustBeCommittedAtHead, true);
    assert.equal(template.evidenceTrust.artifactPinsMustBeCommittedAtHead, true);
    assert.equal(template.evidenceTrust.worktreeBytesMustMatchHead, true);
    assert.match(
      template.evidenceTrust.allowedArtifactDirectory,
      /promotion-evidence\/artifacts\/$/u
    );
    assert.equal(template.evidenceTrust.allowedProofDirectories.length, 3);
    assert.equal(
      template.stageArtifactReceipt.schemaVersion,
      TRACK_STAGE_ARTIFACT_SCHEMA
    );
    assert.match(
      template.stageArtifactReceipt.contentHashes[0],
      /lowercase-sha256/u
    );
  });

  await check("canonical hashing rejects values the F-02 contract rejects", () => {
    const vector = { z: [3, { b: true, a: "x" }], a: null };
    assert.equal(
      canonicalJson(vector),
      '{"a":null,"z":[3,{"a":"x","b":true}]}'
    );
    assert.equal(
      canonicalJsonSha256(vector),
      "f39f20b5b275a590ffdbf04446b233ed928b40757f744e70a5e1c0a385aa83f9"
    );
    const sparse = new Array(1);
    assert.throws(
      () => canonicalJson(sparse),
      (error) => error?.code === "non_canonical_value"
    );
    let getterCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, "unsafe", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "not-hashable";
      }
    });
    assert.throws(
      () => canonicalJson(accessor),
      (error) => error?.code === "non_canonical_value"
    );
    assert.equal(getterCalls, 0);
    const symbolProperty = { safe: true };
    symbolProperty[Symbol("hidden")] = true;
    assert.throws(
      () => canonicalJson(symbolProperty),
      (error) => error?.code === "non_canonical_value"
    );
    assert.equal(canonicalJson(-0), "0");
  });

  await check("relief and non-relief normalized tracks remain distinct", () => {
    const registry = readJson(
      "data/record-clearing/legal-design-track-registry.json"
    );
    const byId = new Map(
      registry.tracks.map((track) => [track.trackId, track])
    );
    assert.equal(
      classifyTrackReliefCharacter(byId.get("ms-fel")),
      "relief"
    );
    assert.equal(
      classifyTrackReliefCharacter(byId.get("ia-dci77")),
      "non_relief"
    );
  });

  const adoptedEntries = buildTrackApprovalEntries({
    rootDir: ROOT,
    entries: EXPECTED_ROUTES.map((trackId) => ({ trackId }))
  });
  const adoptedBatch = makeBatch({
    batchName: "verify-current-adopted-routes",
    operation: "bind_adopted_tracks",
    tracks: adoptedEntries
  });
  const adoptedEvaluation = evaluateTrackPromotionBatch(adoptedBatch, {
    rootDir: ROOT
  });

  await check("all exact current adoptions bind without status inference", () => {
    assert.equal(adoptedEvaluation.eligible, true);
    assert.equal(adoptedEvaluation.exactTrackCount, 15);
    assert.equal(adoptedEvaluation.receipt.routeScopedSelection.length, 15);
    assert.equal(
      adoptedEvaluation.receipt.safety.sharedRegistryMutation,
      false
    );
    assert.equal(adoptedEvaluation.receipt.safety.runtimeDisableSwitchChanged, false);
    assert.equal(adoptedEvaluation.receipt.safety.publicRoutingChanged, false);

    for (const entry of adoptedEvaluation.receipt.tracks) {
      assert.equal(entry.observedState.sourcePinning, "pinned");
      assert.equal(entry.observedState.implementationProof, "proven");
      assert.equal(entry.observedState.technicalProof, "passed");
      assert.equal(entry.observedState.visualProof, "passed");
      assert.equal(entry.observedState.counselAdoption, "adopted");
      assert.equal(entry.observedState.packetPersistence, "not_proven");
      assert.equal(entry.observedState.stagingContract, "not_satisfied");
      assert.equal(entry.observedState.stagingAcceptance, "not_accepted");
      assert.equal(entry.observedState.productionPromotion, "not_promoted");
    }
    const maryland = adoptedEvaluation.receipt.tracks.find(
      (entry) => entry.trackId === "md_second_chance_shielding"
    );
    assert.equal(maryland.observedState.authorityClearance, "blocked");
    assert.ok(
      maryland.typedBlockers.some(
        (blocker) => blocker.code === "external_dependency_unavailable"
      )
    );
    for (const entry of adoptedEvaluation.receipt.tracks.filter(
      (candidate) => candidate.jurisdiction !== "MD"
    )) {
      assert.equal(entry.observedState.authorityClearance, "cleared");
    }
    const mississippi = adoptedEvaluation.receipt.tracks.find(
      (entry) => entry.trackId === "ms-fel"
    );
    assert.equal(
      mississippi.trackProjection.sharedRuntimeRegistration.status,
      "registered"
    );
    assert.equal(
      mississippi.trackProjection.releaseBlockerClosure.status,
      "closed"
    );
    const georgia = adoptedEvaluation.receipt.tracks.find(
      (entry) => entry.trackId === "ga-felony-j1"
    );
    assert.equal(
      georgia.trackProjection.sharedRuntimeRegistration.status,
      "not_registered"
    );
    assert.equal(
      georgia.trackProjection.releaseBlockerClosure.status,
      "open"
    );
    assert.ok(
      georgia.typedBlockers.some(
        (blocker) => blocker.code === "shared_registration_missing"
      )
    );
  });

  await check("track scope binds every required hash and approval family", () => {
    const mississippi = adoptedEvaluation.receipt.tracks.find(
      (entry) => entry.trackId === "ms-fel"
    );
    const binding = mississippi.trackProjection;
    assert.equal(binding.schemaVersion, "rcap-track-hash-scope/v1");
    assert.match(binding.authority.authorityRecord.sha256, /^[0-9a-f]{64}$/u);
    assert.match(binding.authority.authorityArchiveSha256, /^[0-9a-f]{64}$/u);
    assert.ok(
      binding.authority.sourcePins.every(
        (pin) =>
          typeof pin.sourceRole === "string" &&
          /^[0-9a-f]{64}$/u.test(pin.sha256)
      )
    );
    assert.match(binding.templateFamily.sha256, /^[0-9a-f]{64}$/u);
    assert.match(binding.legalDesignSpecification.sha256, /^[0-9a-f]{64}$/u);
    assert.match(binding.branchLogic.sha256, /^[0-9a-f]{64}$/u);
    assert.ok(binding.reviewManifestPins.length >= 2);
    assert.ok(binding.representativePacketPins.length >= 1);
    assert.ok(
      binding.representativePacketPins.every(
        (packet) =>
          /^[0-9a-f]{64}$/u.test(packet.sha256) &&
          Number.isInteger(packet.pageCount) &&
          packet.pageCount > 0
      )
    );
    assert.equal(binding.counselAdoption.status, "counsel_adopted");
    assert.match(
      binding.counselAdoption.recordSha256,
      /^[0-9a-f]{64}$/u
    );
    assert.match(
      binding.implementationVersion.integratedCommit,
      /^[0-9a-f]{40}$/u
    );
    assert.equal(
      mississippi.trackScopeSha256,
      canonicalSha256(mississippi.trackProjection)
    );
    const maryland = adoptedEvaluation.receipt.tracks.find(
      (entry) => entry.trackId === "md_second_chance_shielding"
    );
    assert.ok(maryland.trackProjection.mappingPins.length >= 2);
    assert.ok(
      maryland.trackProjection.mappingPins.every((pin) =>
        /^[0-9a-f]{64}$/u.test(pin.sha256)
      )
    );
  });

  await check("jurisdiction aggregation never widens an adopted subset", () => {
    const byCode = new Map(
      adoptedEvaluation.receipt.jurisdictionAggregates.map((entry) => [
        entry.jurisdiction,
        entry
      ])
    );
    assert.deepEqual(
      {
        selected: byCode.get("MS").selectedTrackCount,
        adopted: byCode.get("MS").adoptedTrackCount,
        normalized: byCode.get("MS").normalizedTrackCount
      },
      { selected: 5, adopted: 5, normalized: 9 }
    );
    assert.deepEqual(
      {
        selected: byCode.get("GA").selectedTrackCount,
        adopted: byCode.get("GA").adoptedTrackCount,
        normalized: byCode.get("GA").normalizedTrackCount
      },
      { selected: 9, adopted: 9, normalized: 15 }
    );
    assert.deepEqual(
      {
        selected: byCode.get("MD").selectedTrackCount,
        adopted: byCode.get("MD").adoptedTrackCount,
        normalized: byCode.get("MD").normalizedTrackCount
      },
      { selected: 1, adopted: 1, normalized: 11 }
    );
    for (const aggregate of byCode.values()) {
      assert.equal(aggregate.scope, "partial_track_subset");
      assert.equal(aggregate.allJurisdictionTracksSelected, false);
      assert.equal(aggregate.jurisdictionApprovalInferred, false);
      assert.equal(aggregate.blanketApproval, false);
    }
  });

  await check("dry run is deterministic and writes nothing", () => {
    const batchPath = writeTempJson("current-adoptions.json", adoptedBatch);
    const before = snapshotTree(TEMP_ABSOLUTE);
    const first = runCli([
      "--file",
      batchPath,
      "--dry-run"
    ]);
    const afterFirst = snapshotTree(TEMP_ABSOLUTE);
    const second = runCli([
      "--file",
      batchPath,
      "--dry-run"
    ]);
    const afterSecond = snapshotTree(TEMP_ABSOLUTE);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
    assert.deepEqual(afterFirst, before);
    assert.deepEqual(afterSecond, before);
    const report = JSON.parse(first.stdout);
    assert.equal(report.mode, "dry_run");
    assert.equal(report.eligible, true);
    assert.equal(report.exactTrackCount, 15);
  });

  await check("apply emits one immutable deterministic receipt", () => {
    const batchPath = writeTempJson("apply-current-adoptions.json", adoptedBatch);
    const outputPath = `${TEMP_RELATIVE}/applied-current-adoptions.json`;
    const first = runCli([
      "--file",
      batchPath,
      "--apply",
      "--out",
      outputPath
    ]);
    assert.equal(first.status, 0, first.stderr);
    const receiptBytes = fs.readFileSync(path.join(ROOT, outputPath));
    const receipt = JSON.parse(receiptBytes);
    assert.equal(receipt.schemaVersion, TRACK_PROMOTION_APPLICATION_SCHEMA);
    assert.equal(receipt.exactTrackCount, 15);
    assert.equal(receipt.eligibilityOnly, true);
    assert.equal(receipt.authorizesPromotion, false);
    const second = runCli([
      "--file",
      batchPath,
      "--apply",
      "--out",
      outputPath
    ]);
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(fs.readFileSync(path.join(ROOT, outputPath)), receiptBytes);
    assert.equal(JSON.parse(second.stdout).idempotent, true);
  });

  const baseMississippiEntry = buildTrackApprovalEntry({
    rootDir: ROOT,
    trackId: "ms-fel"
  });
  const baseMarylandEntry = buildTrackApprovalEntry({
    rootDir: ROOT,
    trackId: "md_second_chance_shielding"
  });
  const evidenceFixture = createCommittedEvidenceFixture([
    baseMississippiEntry,
    baseMarylandEntry
  ]);
  const stagingEvidence = evidenceFixture.references["ms-fel"];
  const stagingEntry = buildTrackApprovalEntry({
    rootDir: evidenceFixture.rootDir,
    trackId: "ms-fel",
    evidence: {
      packetPersistence: stagingEvidence.packet_persistence,
      stagingContract: stagingEvidence.staging_contract,
      stagingAcceptance: null
    }
  });

  await check("staging selection consumes only exact adopted route hashes", () => {
    const batch = makeBatch({
      batchName: "verify-single-route-staging-selection",
      operation: "select_staging_tracks",
      tracks: [stagingEntry]
    });
    const evaluation = evaluateTrackPromotionBatch(batch, {
      rootDir: evidenceFixture.rootDir
    });
    assert.equal(evaluation.eligible, true);
    assert.deepEqual(
      evaluation.receipt.routeScopedSelection.map((entry) => entry.trackId),
      ["ms-fel"]
    );
    const aggregate = evaluation.receipt.jurisdictionAggregates[0];
    assert.equal(aggregate.selectedTrackCount, 1);
    assert.equal(aggregate.adoptedTrackCount, 5);
    assert.equal(aggregate.normalizedTrackCount, 9);
    assert.equal(aggregate.allAdoptedTracksSelected, false);
    assert.equal(aggregate.allJurisdictionTracksSelected, false);
    assert.equal(aggregate.jurisdictionApprovalInferred, false);
    assert.match(
      evaluation.receipt.tracks[0].evidence.packetPersistence.repositoryCommit,
      /^[0-9a-f]{40}$/u
    );
  });

  await check("staging acceptance and production authorization stay separate", () => {
    const acceptedEntry = buildTrackApprovalEntry({
      rootDir: evidenceFixture.rootDir,
      trackId: "ms-fel",
      evidence: {
        packetPersistence: stagingEvidence.packet_persistence,
        stagingContract: stagingEvidence.staging_contract,
        stagingAcceptance: stagingEvidence.staging_acceptance
      }
    });
    const stagingBatch = makeBatch({
      batchName: "verify-staging-acceptance",
      operation: "validate_staging_acceptance",
      tracks: [acceptedEntry]
    });
    const stagingResult = evaluateTrackPromotionBatch(stagingBatch, {
      rootDir: evidenceFixture.rootDir
    });
    assert.equal(stagingResult.eligible, true);
    assert.equal(
      stagingResult.receipt.tracks[0].observedState.stagingAcceptance,
      "accepted"
    );
    assert.equal(
      stagingResult.receipt.tracks[0].observedState.productionPromotion,
      "not_promoted"
    );

    const productionBatch = makeBatch({
      batchName: "verify-production-authorization",
      operation: "validate_production_promotion_eligibility",
      tracks: [acceptedEntry]
    });
    const productionResult = evaluateTrackPromotionBatch(productionBatch, {
      rootDir: evidenceFixture.rootDir
    });
    assert.equal(productionResult.eligible, true);
    assert.equal(productionResult.receipt.targetEnvironment, "production");
    assert.equal(productionResult.receipt.safety.productionActivationChanged, false);
    assert.equal(productionResult.receipt.safety.deploymentApplied, false);
  });

  await check("drift, exclusions, commercial terms, and unsafe fields fail closed", () => {
    const gaEntry = adoptedEntries.find(
      (entry) => entry.trackId === "ga-felony-j1"
    );
    const mdEntry = adoptedEntries.find(
      (entry) => entry.trackId === "md_second_chance_shielding"
    );
    const jailEntry = {
      ...structuredClone(gaEntry),
      trackId: "ga-jail-k2"
    };
    assertRefused(
      makeBatch({
        batchName: "reject-explicit-ga-exclusion",
        operation: "bind_adopted_tracks",
        tracks: [jailEntry]
      }),
      "route_explicitly_excluded"
    );

    const wildcard = {
      ...structuredClone(gaEntry),
      trackId: "*"
    };
    assertRefused(
      makeBatch({
        batchName: "reject-wildcard",
        operation: "bind_adopted_tracks",
        tracks: [wildcard]
      }),
      "track_identity_invalid"
    );

    const scopeDrift = structuredClone(gaEntry);
    scopeDrift.trackScopeSha256 = mutateSha(scopeDrift.trackScopeSha256);
    assertRefused(
      makeBatch({
        batchName: "reject-track-scope-drift",
        operation: "bind_adopted_tracks",
        tracks: [scopeDrift]
      }),
      "track_scope_drift"
    );

    const recordDrift = structuredClone(gaEntry);
    recordDrift.adoptionBinding.recordSha256 = mutateSha(
      recordDrift.adoptionBinding.recordSha256
    );
    assertRefused(
      makeBatch({
        batchName: "reject-adoption-record-drift",
        operation: "bind_adopted_tracks",
        tracks: [recordDrift]
      }),
      "adoption_binding_drift"
    );

    const falseInference = structuredClone(mdEntry);
    falseInference.expectedState.authorityClearance = "cleared";
    assertRefused(
      makeBatch({
        batchName: "reject-status-inference",
        operation: "bind_adopted_tracks",
        tracks: [falseInference]
      }),
      "state_claim_mismatch"
    );

    const duplicate = makeBatch({
      batchName: "reject-duplicate-route",
      operation: "bind_adopted_tracks",
      tracks: [gaEntry, structuredClone(gaEntry)]
    });
    assertRefused(duplicate, "duplicate_track");

    const unsafe = structuredClone(gaEntry);
    unsafe[["live", "Enabled"].join("")] = true;
    assertRefused(
      makeBatch({
        batchName: "reject-unsafe-state-override",
        operation: "bind_adopted_tracks",
        tracks: [unsafe]
      }),
      "unsafe_state_override"
    );

    const commercial = {
      ...structuredClone(gaEntry),
      jurisdiction: "KS",
      trackId: "ks-21-6614-conviction"
    };
    assertRefused(
      makeBatch({
        batchName: "reject-commercial-license-route",
        operation: "bind_adopted_tracks",
        tracks: [commercial]
      }),
      "commercial_license_exclusion"
    );

    const guidance = {
      ...structuredClone(gaEntry),
      jurisdiction: "AK",
      trackId: "ak-sej"
    };
    assertRefused(
      makeBatch({
        batchName: "reject-unadopted-guidance-route",
        operation: "bind_adopted_tracks",
        tracks: [guidance]
      }),
      "guidance_route_not_adopted"
    );

    const unresolvedStrategy = {
      ...structuredClone(gaEntry),
      jurisdiction: "AR",
      trackId: "ar-misdemeanor-dwi-seal"
    };
    assertRefused(
      makeBatch({
        batchName: "reject-unresolved-output-route",
        operation: "bind_adopted_tracks",
        tracks: [unresolvedStrategy]
      }),
      "output_strategy_unresolved"
    );
  });

  await check("evidence drift and blocked authority refuse staging", () => {
    const authorityPath =
      "data/record-clearing/master-library/authority.json";
    const authorityAbsolute = path.join(
      evidenceFixture.rootDir,
      authorityPath
    );
    const authorityBytes = fs.readFileSync(authorityAbsolute);
    try {
      const driftedAuthority = JSON.parse(authorityBytes.toString("utf8"));
      driftedAuthority.edition = "1.3";
      fs.writeFileSync(
        authorityAbsolute,
        `${JSON.stringify(driftedAuthority, null, 2)}\n`,
        "utf8"
      );
      assertRefused(
        adoptedBatch,
        "authority_scope_drift",
        evidenceFixture.rootDir
      );
    } finally {
      fs.writeFileSync(authorityAbsolute, authorityBytes);
    }

    const evidenceDrift = structuredClone(stagingEntry);
    evidenceDrift.evidence.packetPersistence.sha256 = mutateSha(
      evidenceDrift.evidence.packetPersistence.sha256
    );
    assertRefused(
      makeBatch({
        batchName: "reject-persistence-proof-drift",
        operation: "select_staging_tracks",
        tracks: [evidenceDrift]
      }),
      "evidence_hash_drift",
      evidenceFixture.rootDir
    );

    const persistenceProof = readJsonFrom(
      evidenceFixture.rootDir,
      stagingEvidence.packet_persistence.path
    );
    const artifactPath = persistenceProof.artifactPins[0].path;
    const artifactAbsolute = path.join(evidenceFixture.rootDir, artifactPath);
    const artifactBytes = fs.readFileSync(artifactAbsolute);
    try {
      fs.writeFileSync(
        artifactAbsolute,
        Buffer.concat([artifactBytes, Buffer.from("\\ndrift", "utf8")])
      );
      assertRefused(
        makeBatch({
          batchName: "reject-stage-artifact-drift",
          operation: "select_staging_tracks",
          tracks: [stagingEntry]
        }),
        "evidence_artifact_drift",
        evidenceFixture.rootDir
      );
    } finally {
      fs.writeFileSync(artifactAbsolute, artifactBytes);
    }

    const uncommittedProofPath =
      "data/record-clearing/production-factory/promotion-evidence/packet-persistence/uncommitted-ms-fel.json";
    const uncommittedProofAbsolute = path.join(
      evidenceFixture.rootDir,
      uncommittedProofPath
    );
    fs.writeFileSync(
      uncommittedProofAbsolute,
      `${JSON.stringify(persistenceProof, null, 2)}\n`,
      "utf8"
    );
    try {
      const uncommitted = structuredClone(stagingEntry);
      uncommitted.evidence.packetPersistence = {
        path: uncommittedProofPath,
        sha256: fileSha256From(
          evidenceFixture.rootDir,
          uncommittedProofPath
        )
      };
      assertRefused(
        makeBatch({
          batchName: "reject-uncommitted-stage-proof",
          operation: "select_staging_tracks",
          tracks: [uncommitted]
        }),
        "evidence_not_committed",
        evidenceFixture.rootDir
      );
    } finally {
      fs.unlinkSync(uncommittedProofAbsolute);
    }

    const mdEvidence = evidenceFixture.references[baseMarylandEntry.trackId];
    const mdStagingEntry = buildTrackApprovalEntry({
      rootDir: evidenceFixture.rootDir,
      trackId: baseMarylandEntry.trackId,
      evidence: {
        packetPersistence: mdEvidence.packet_persistence,
        stagingContract: mdEvidence.staging_contract,
        stagingAcceptance: null
      }
    });
    assertRefused(
      makeBatch({
        batchName: "reject-authority-blocked-staging",
        operation: "select_staging_tracks",
        tracks: [mdStagingEntry]
      }),
      "operation_prerequisite_missing",
      evidenceFixture.rootDir
    );

    const extraArtifactPath =
      "data/record-clearing/production-factory/promotion-evidence/artifacts/ms-fel-packet-persistence-extra.json";
    writeJsonFrom(evidenceFixture.rootDir, extraArtifactPath, {
      schemaVersion: TRACK_STAGE_ARTIFACT_SCHEMA,
      artifactType: "packet_persistence",
      jurisdiction: "MS",
      trackId: "ms-fel",
      trackScopeSha256: stagingEntry.trackScopeSha256,
      status: "passed",
      contentHashes: [
        sha256(Buffer.from("ms-fel:packet-persistence:extra", "utf8"))
      ]
    });
    const chainedPacketProof = structuredClone(persistenceProof);
    chainedPacketProof.artifactPins.push({
      path: extraArtifactPath,
      sha256: fileSha256From(evidenceFixture.rootDir, extraArtifactPath)
    });
    writeJsonFrom(
      evidenceFixture.rootDir,
      stagingEvidence.packet_persistence.path,
      chainedPacketProof
    );
    commitEvidenceFixture(
      [
        extraArtifactPath,
        stagingEvidence.packet_persistence.path
      ],
      "test: change packet-persistence evidence"
    );
    const chainDrift = structuredClone(stagingEntry);
    chainDrift.evidence.packetPersistence.sha256 = fileSha256From(
      evidenceFixture.rootDir,
      stagingEvidence.packet_persistence.path
    );
    assertRefused(
      makeBatch({
        batchName: "reject-mixed-stage-evidence-chain",
        operation: "select_staging_tracks",
        tracks: [chainDrift]
      }),
      "evidence_chain_drift",
      evidenceFixture.rootDir
    );

    const unrelatedArtifactProof = structuredClone(chainedPacketProof);
    unrelatedArtifactProof.artifactPins[0] = {
      path: authorityPath,
      sha256: fileSha256From(evidenceFixture.rootDir, authorityPath)
    };
    writeJsonFrom(
      evidenceFixture.rootDir,
      stagingEvidence.packet_persistence.path,
      unrelatedArtifactProof
    );
    commitEvidenceFixture(
      [stagingEvidence.packet_persistence.path],
      "test: cite an unrelated tracked artifact"
    );
    const unrelatedArtifact = structuredClone(stagingEntry);
    unrelatedArtifact.evidence.packetPersistence.sha256 = fileSha256From(
      evidenceFixture.rootDir,
      stagingEvidence.packet_persistence.path
    );
    assertRefused(
      makeBatch({
        batchName: "reject-unrelated-stage-artifact",
        operation: "select_staging_tracks",
        tracks: [unrelatedArtifact]
      }),
      "evidence_artifact_pin_invalid",
      evidenceFixture.rootDir
    );

    const discoveredAdoptionPath =
      "data/record-clearing/template-families/ADOPT-03-verifier-family-adoption.json";
    fs.copyFileSync(
      path.join(evidenceFixture.rootDir, ADOPTION_PATHS[0]),
      path.join(evidenceFixture.rootDir, discoveredAdoptionPath)
    );
    commitEvidenceFixture(
      [discoveredAdoptionPath],
      "test: add a newly discovered adoption record"
    );
    assertRefused(
      adoptedBatch,
      "duplicate_adoption",
      evidenceFixture.rootDir
    );
  });

  await check("one invalid route refuses the whole apply atomically", () => {
    const invalid = structuredClone(adoptedEntries[1]);
    invalid.trackScopeSha256 = mutateSha(invalid.trackScopeSha256);
    const batch = makeBatch({
      batchName: "reject-partial-apply",
      operation: "bind_adopted_tracks",
      tracks: [adoptedEntries[0], invalid]
    });
    const batchPath = writeTempJson("partial-apply.json", batch);
    const outputPath = `${TEMP_RELATIVE}/partial-apply-receipt.json`;
    const result = runCli([
      "--file",
      batchPath,
      "--apply",
      "--out",
      outputPath
    ]);
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(path.join(ROOT, outputPath)), false);
  });

  await check("apply never overwrites a different receipt", () => {
    const batchPath = writeTempJson("non-overwrite.json", adoptedBatch);
    const outputPath = `${TEMP_RELATIVE}/existing-receipt.json`;
    const absoluteOutput = path.join(ROOT, outputPath);
    const sentinel = "{\"sentinel\":true}\n";
    fs.writeFileSync(absoluteOutput, sentinel, "utf8");
    const result = runCli([
      "--file",
      batchPath,
      "--apply",
      "--out",
      outputPath
    ]);
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(absoluteOutput, "utf8"), sentinel);
  });

  await check("execution mode and output boundaries fail closed", () => {
    const batchPath = writeTempJson("mode-boundaries.json", adoptedBatch);
    const neither = runCli(["--file", batchPath]);
    assert.notEqual(neither.status, 0);
    const both = runCli([
      "--file",
      batchPath,
      "--dry-run",
      "--apply",
      "--out",
      `${TEMP_RELATIVE}/both.json`
    ]);
    assert.notEqual(both.status, 0);
    const outside = runCli([
      "--file",
      batchPath,
      "--apply",
      "--out",
      "docs/rcap-promotion/not-an-application.json"
    ]);
    assert.notEqual(outside.status, 0);
    assert.equal(
      JSON.parse(outside.stderr).error.code,
      "output_path_invalid"
    );
    assert.equal(
      fs.existsSync(
        path.join(ROOT, "docs/rcap-promotion/not-an-application.json")
      ),
      false
    );

    const externalDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "rcap-promotion-output-")
    );
    const aliasPath = path.join(TEMP_ABSOLUTE, "external-alias");
    try {
      fs.symlinkSync(externalDirectory, aliasPath, "dir");
      const escaped = runCli([
        "--file",
        batchPath,
        "--apply",
        "--out",
        `${TEMP_RELATIVE}/external-alias/created/receipt.json`
      ]);
      assert.notEqual(escaped.status, 0);
      assert.equal(
        JSON.parse(escaped.stderr).error.code,
        "output_path_invalid"
      );
      assert.equal(
        fs.existsSync(path.join(externalDirectory, "created")),
        false
      );
    } finally {
      if (fs.existsSync(aliasPath)) fs.unlinkSync(aliasPath);
      fs.rmSync(externalDirectory, { recursive: true, force: true });
    }
  });
} finally {
  if (fs.existsSync(TEMP_ABSOLUTE)) {
    fs.rmSync(TEMP_ABSOLUTE, { recursive: true, force: true });
  }
}

await check("repository inputs and worktree status remain byte-identical", () => {
  assert.deepEqual(snapshotFiles(PROTECTED_INPUTS), bytesBefore);
  assert.equal(gitStatus(), statusBefore);
});

if (checks.some((entry) => !entry.passed)) {
  console.error("RCAP track promotion verification failed.");
  for (const entry of checks.filter((candidate) => !candidate.passed)) {
    console.error(`  FAIL ${entry.name}: ${entry.error}`);
  }
  process.exit(1);
}

console.log("RCAP track promotion verification passed.");
for (const entry of checks) console.log(`  PASS ${entry.name}`);
console.log(
  "  PASS 15 exact adopted routes remain hash-bound; no runtime, routing, registry, or deployment mutation occurred."
);

async function check(name, callback) {
  try {
    await callback();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({
      name,
      passed: false,
      error: error instanceof Error ? error.stack ?? error.message : String(error)
    });
  }
}

function makeBatch({ batchName, operation, tracks }) {
  const role =
    operation === "validate_production_promotion_eligibility"
      ? "release_manager"
      : operation === "validate_staging_acceptance"
        ? "staging_release_operator"
        : "integration_captain";
  return {
    schemaVersion: TRACK_PROMOTION_BATCH_SCHEMA,
    batchName,
    appliedByRole: role,
    appliedOn: FIXED_APPLICATION_TIME,
    operation,
    promotionLane: "packet_delivery",
    targetEnvironment:
      operation === "validate_production_promotion_eligibility"
        ? "production"
        : "staging",
    contract: {
      selectionMode: "exact_tracks_only",
      atomicBatch: true,
      jurisdictionApprovalInferred: false,
      currentStateMustBeAuthoredAndRecomputed: true,
      materialHashDriftRequiresNewReview: true,
      authorityEditionMustMatchCounselScope: true,
      sharedRuntimeRegistrationMustBeCurrent: true,
      nonCounselReleaseBlockersMustBeClosed: true,
      stageEvidenceMustFormExactChain: true,
      commercialLicenseExclusionsRemainBlocking: true,
      externalDependenciesRequireExactEvidence: true,
      nonReliefRoutesRemainDistinct: true,
      operatorRoleAssertionGrantsAuthority: false,
      applyCreatesReceiptOnly: true
    },
    tracks: structuredClone(tracks),
    safety: {
      runtimeDisableSwitchMustRemainOn: true,
      generationPermissionMustRemainOff: true,
      deliveryReadinessMustRemainOff: true,
      jurisdictionActivationMustRemainOff: true,
      productionActivationMustRemainOff: true,
      publicRoutingMustRemainUnchanged: true
    }
  };
}

function createCommittedEvidenceFixture(entries) {
  fs.cpSync(
    path.join(ROOT, "data/record-clearing"),
    path.join(EVIDENCE_FIXTURE_ROOT, "data/record-clearing"),
    { recursive: true }
  );
  fs.cpSync(
    path.join(ROOT, "src/lib/rcap/packets"),
    path.join(EVIDENCE_FIXTURE_ROOT, "src/lib/rcap/packets"),
    { recursive: true }
  );
  const capabilityDestination = path.join(
    EVIDENCE_FIXTURE_ROOT,
    "src/lib/rcap/jurisdictions/packet-capability.ts"
  );
  fs.mkdirSync(path.dirname(capabilityDestination), { recursive: true });
  fs.cpSync(
    path.join(ROOT, "src/lib/rcap/jurisdictions/packet-capability.ts"),
    capabilityDestination
  );

  runGit(EVIDENCE_FIXTURE_ROOT, ["init", "--quiet"]);
  const commonDirectory = path.resolve(
    ROOT,
    runGit(ROOT, ["rev-parse", "--git-common-dir"]).stdout.trim()
  );
  const alternatesPath = path.join(
    EVIDENCE_FIXTURE_ROOT,
    ".git/objects/info/alternates"
  );
  fs.mkdirSync(path.dirname(alternatesPath), { recursive: true });
  fs.writeFileSync(
    alternatesPath,
    `${path.join(commonDirectory, "objects")}\n`,
    "utf8"
  );
  const baselineCommit = runGit(ROOT, ["rev-parse", "HEAD"]).stdout.trim();
  runGit(EVIDENCE_FIXTURE_ROOT, [
    "update-ref",
    "refs/heads/fixture",
    baselineCommit
  ]);
  runGit(EVIDENCE_FIXTURE_ROOT, [
    "symbolic-ref",
    "HEAD",
    "refs/heads/fixture"
  ]);
  runGit(EVIDENCE_FIXTURE_ROOT, ["read-tree", "HEAD"]);
  runGit(EVIDENCE_FIXTURE_ROOT, ["config", "user.name", "RCAP Verifier"]);
  runGit(EVIDENCE_FIXTURE_ROOT, [
    "config",
    "user.email",
    "rcap-verifier@example.invalid"
  ]);

  const references = {};
  const addedPaths = [];
  const proofTypes = Object.keys(STAGE_PROOF_POLICIES);
  for (const entry of entries) {
    references[entry.trackId] = {};
    for (const proofType of proofTypes) {
      const policy = STAGE_PROOF_POLICIES[proofType];
      const artifactPath =
        `data/record-clearing/production-factory/promotion-evidence/artifacts/` +
        `${entry.trackId}-${proofType}.json`;
      const artifact = {
        schemaVersion: TRACK_STAGE_ARTIFACT_SCHEMA,
        artifactType: proofType,
        jurisdiction: entry.jurisdiction,
        trackId: entry.trackId,
        trackScopeSha256: entry.trackScopeSha256,
        status: "passed",
        contentHashes: [
          sha256(
            Buffer.from(
              `${entry.trackId}:${proofType}:verified-content`,
              "utf8"
            )
          )
        ]
      };
      writeJsonFrom(EVIDENCE_FIXTURE_ROOT, artifactPath, artifact);

      const proofPath = `${policy.directory}/${entry.trackId}.json`;
      const proof = {
        schemaVersion: TRACK_STAGE_PROOF_SCHEMA,
        proofType,
        status: "passed",
        jurisdiction: entry.jurisdiction,
        trackId: entry.trackId,
        trackScopeSha256: entry.trackScopeSha256,
        producerContract: policy.producerContract,
        environment: policy.environment,
        predecessorEvidence: {
          packetPersistenceSha256:
            proofType === "packet_persistence"
              ? null
              : references[entry.trackId].packet_persistence.sha256,
          stagingContractSha256:
            proofType === "staging_acceptance"
              ? references[entry.trackId].staging_contract.sha256
              : null
        },
        artifactPins: [
          {
            path: artifactPath,
            sha256: fileSha256From(EVIDENCE_FIXTURE_ROOT, artifactPath)
          }
        ],
        safety: {
          runtimePosture: "disabled",
          jurisdictionActivation: "inactive",
          productionPromotion: "not_promoted",
          deployment: policy.deployment
        }
      };
      writeJsonFrom(EVIDENCE_FIXTURE_ROOT, proofPath, proof);
      references[entry.trackId][proofType] = {
        path: proofPath,
        sha256: fileSha256From(EVIDENCE_FIXTURE_ROOT, proofPath)
      };
      addedPaths.push(artifactPath, proofPath);
    }
  }
  runGit(EVIDENCE_FIXTURE_ROOT, ["add", "--", ...addedPaths]);
  runGit(
    EVIDENCE_FIXTURE_ROOT,
    ["commit", "--quiet", "--no-gpg-sign", "-m", "test: add stage evidence"],
    {
      GIT_AUTHOR_DATE: FIXED_APPLICATION_TIME,
      GIT_COMMITTER_DATE: FIXED_APPLICATION_TIME
    }
  );
  return {
    rootDir: EVIDENCE_FIXTURE_ROOT,
    references
  };
}

function assertRefused(batch, expectedCode, rootDir = ROOT) {
  const result = evaluateTrackPromotionBatch(batch, { rootDir });
  assert.equal(result.eligible, false);
  assert.equal(result.receipt, null);
  assert.ok(
    result.refusals.some((refusal) => refusal.code === expectedCode),
    `Expected ${expectedCode}; received ${JSON.stringify(result.refusals)}`
  );
}

function runCli(args) {
  return spawnSync(process.execPath, [APPLY_SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
}

function writeTempJson(fileName, value) {
  const relativePath = `${TEMP_RELATIVE}/${fileName}`;
  fs.writeFileSync(
    path.join(ROOT, relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
  return relativePath;
}

function writeJsonFrom(rootDir, relativePath, value) {
  const absolutePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(
    absolutePath,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

function runGit(cwd, args, environment = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, ...environment }
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed: ${result.stderr}`
  );
  return result;
}

function commitEvidenceFixture(relativePaths, message) {
  runGit(EVIDENCE_FIXTURE_ROOT, ["add", "--", ...relativePaths]);
  runGit(
    EVIDENCE_FIXTURE_ROOT,
    ["commit", "--quiet", "--no-gpg-sign", "-m", message],
    {
      GIT_AUTHOR_DATE: FIXED_APPLICATION_TIME,
      GIT_COMMITTER_DATE: FIXED_APPLICATION_TIME
    }
  );
}

function snapshotFiles(relativePaths) {
  return Object.fromEntries(
    relativePaths.map((relativePath) => [
      relativePath,
      fileSha256(relativePath)
    ])
  );
}

function snapshotTree(directory) {
  const entries = [];
  walk(directory, "");
  return entries;

  function walk(current, relative) {
    for (const dirent of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const child = path.join(current, dirent.name);
      const childRelative = path.posix.join(relative, dirent.name);
      if (dirent.isDirectory()) walk(child, childRelative);
      else {
        entries.push({
          path: childRelative,
          sha256: sha256(fs.readFileSync(child))
        });
      }
    }
  }
}

function gitStatus() {
  const result = spawnSync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function readJsonFrom(rootDir, relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(rootDir, relativePath), "utf8")
  );
}

function fileSha256(relativePath) {
  return sha256(fs.readFileSync(path.join(ROOT, relativePath)));
}

function fileSha256From(rootDir, relativePath) {
  return sha256(fs.readFileSync(path.join(rootDir, relativePath)));
}

function canonicalSha256(value) {
  return sha256(Buffer.from(canonicalJson(value), "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function mutateSha(value) {
  return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
}
