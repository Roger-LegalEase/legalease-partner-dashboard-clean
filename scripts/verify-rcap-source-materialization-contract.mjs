#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  SOURCE_MATERIALIZATION_REQUIREMENT_SCHEMA,
  SOURCE_MATERIALIZATION_STATES,
  SourceMaterializationError,
  assertPortableRelativePath,
  canonicalJsonSha256,
  initialMaterializationState,
  inspectMaterializedSource,
  inspectMaterializedSourceSet,
  loadAssignedMaterializationRequirement,
  materializeVerifiedSource,
  materializeVerifiedSourceSet,
  parsePortableLocator,
  validateMaterializationRequirement
} from "./verify-rcap-materialized-source.mjs";

import { loadFactoryPlan } from "./lib/rcap-factory/index.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const CONTRACT_PATH =
  "docs/record-clearing/RCAP_SOURCE_MATERIALIZATION_CONTRACT.md";
const MATERIALIZED_VERIFIER_PATH =
  "scripts/verify-rcap-materialized-source.mjs";
const CONTRACT_VERIFIER_PATH =
  "scripts/verify-rcap-source-materialization-contract.mjs";
const PROTECTED_INPUTS = [
  "data/record-clearing/legal-design-track-source-relationships.json",
  "data/record-clearing/master-library/authority.json",
  "data/record-clearing/source-artifact-registry.json",
  "planning/record-clearing-100-percent/jobs/AUTH-06-source-gate-clearance.json"
];
const REQUIRED_OUTPUTS = [
  CONTRACT_PATH,
  MATERIALIZED_VERIFIER_PATH,
  CONTRACT_VERIFIER_PATH
];
const LOCATOR_SCHEME = "fixture-edition";
const PDF_ONE = Buffer.from(
  "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
  "ascii"
);
const PDF_TWO = Buffer.from(
  "%PDF-1.7\n2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n%%EOF\n",
  "ascii"
);
const checks = [];
const failures = [];
const statusBefore = gitStatus();
const protectedBefore = snapshotFiles(PROTECTED_INPUTS);
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "rcap-source-materialization-contract-")
);

try {
  await check("the document defines the complete state and trust contract", () => {
    const text = fs.readFileSync(path.join(ROOT, CONTRACT_PATH), "utf8");
    for (const state of Object.values(SOURCE_MATERIALIZATION_STATES)) {
      assert.match(text, new RegExp(`\\b${escapeRegExp(state)}\\b`, "u"), state);
    }
    for (const phrase of [
      "presence: present",
      "every required source",
      "freshly_verified_local_bytes",
      "carried_forward_registry_measurement",
      "worker_read_only_no_modify",
      "path traversal",
      "never overwrite",
      "portable locator",
      "separate Codespace",
      "packet worker",
      "Master Library archive"
    ]) {
      assert.match(text, new RegExp(escapeRegExp(phrase), "iu"), phrase);
    }
  });

  await check("the state vocabulary is explicit and non-collapsing", () => {
    assert.deepEqual(
      new Set(Object.values(SOURCE_MATERIALIZATION_STATES)),
      new Set([
        "authority_asset_known",
        "registry_metadata_present",
        "binary_materialization_required",
        "binary_materialized",
        "binary_hash_verified",
        "binary_hash_mismatch",
        "binary_size_mismatch",
        "binary_media_type_mismatch",
        "binary_unavailable",
        "worker_read_authorized",
        "worker_ready"
      ])
    );
  });

  await check("verification commands are exact assertions, not shell prefixes", () => {
    const valid = makeRequirement({
      documentId: "fixture-command-binding",
      bytes: PDF_ONE,
      sourceEntry: "edition/forms/command.pdf",
      destination: "materialized/forms/command.pdf"
    });
    const injected = {
      ...structuredClone(valid),
      verificationCommand: `${valid.verificationCommand}; echo unsafe`
    };
    assert.throws(
      () => validateMaterializationRequirement(injected),
      (error) => error?.code === "invalid_materialization_requirement"
    );
  });

  const fixture = fixtureDirectories("primary");
  const sourceOne = writePortableSource(
    fixture.locatorRoot,
    "edition/forms/source-one.pdf",
    PDF_ONE
  );
  const requirementOne = makeRequirement({
    documentId: "fixture-source-one",
    bytes: PDF_ONE,
    sourceEntry: "edition/forms/source-one.pdf",
    destination: "materialized/forms/source-one.pdf",
    usageBindings: [
      { trackId: "fixture-track-one", componentId: "primary-filing" }
    ]
  });

  await check("registry presence with absent local bytes is unavailable", async () => {
    const initial = initialMaterializationState(requirementOne);
    assert.equal(
      initial.state,
      SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZATION_REQUIRED
    );
    assert.equal(initial.workerReady, false);
    assert.equal(
      initial.provenance.registryPresence,
      "present_in_another_environment"
    );
    const absent = await inspectMaterializedSource(requirementOne, {
      materializationRoot: fixture.materializationRoot
    });
    assert.equal(
      absent.state,
      SOURCE_MATERIALIZATION_STATES.BINARY_UNAVAILABLE
    );
    assert.equal(absent.workerReady, false);
    assert.ok(
      absent.states.includes(
        SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZATION_REQUIRED
      )
    );
    assert.ok(
      absent.states.includes(SOURCE_MATERIALIZATION_STATES.BINARY_UNAVAILABLE)
    );
  });

  const sourceOneBefore = snapshotFile(sourceOne);
  let installedOne;
  await check("correct bytes become freshly verified and read-only", async () => {
    const installed = await materializeVerifiedSourceSet([requirementOne], {
      materializationRoot: fixture.materializationRoot,
      locatorRoots: locatorResolutions(fixture.locatorRoot),
      authorizedRequirements: [requirementOne]
    });
    installedOne = installed.sources[0];
    assert.equal(installedOne.workerReady, true);
    assert.equal(
      installedOne.state,
      SOURCE_MATERIALIZATION_STATES.WORKER_READY
    );
    assert.equal(
      installedOne.localVerificationBasis,
      "freshly_verified_local_bytes"
    );
    assert.equal(installedOne.expectedMeasurementBasis, "carried_forward_registry_measurement");
    assert.ok(
      installedOne.states.includes(
        SOURCE_MATERIALIZATION_STATES.BINARY_HASH_VERIFIED
      )
    );
    assert.ok(
      installedOne.states.includes(
        SOURCE_MATERIALIZATION_STATES.WORKER_READ_AUTHORIZED
      )
    );
    assert.equal(installedOne.actualSha256, sha256(PDF_ONE));
    assert.equal(installedOne.actualBytes, PDF_ONE.length);
    assert.equal(installedOne.actualMediaType, "application/pdf");
    assert.equal(installedOne.actualMode & 0o222, 0);
    assert.equal(
      fs.lstatSync(
        path.join(
          fixture.materializationRoot,
          requirementOne.materializationDestination
        )
      ).nlink,
      1
    );
    assert.deepEqual(snapshotFile(sourceOne), sourceOneBefore);
  });

  await check("an exact existing destination is idempotently verified", async () => {
    const repeatedSet = await materializeVerifiedSourceSet([requirementOne], {
      materializationRoot: fixture.materializationRoot,
      locatorRoots: locatorResolutions(fixture.locatorRoot),
      authorizedRequirements: [requirementOne]
    });
    const repeated = repeatedSet.sources[0];
    assert.equal(repeated.workerReady, true);
    assert.equal(repeated.materializationAction, "verified_existing_binary");
    assert.equal(repeated.actualSha256, installedOne.actualSha256);
    assert.equal(repeated.receiptSha256, installedOne.receiptSha256);
  });

  await check("same-size wrong bytes fail hash verification without a write", async () => {
    const wrongFixture = fixtureDirectories("wrong-hash");
    const wrong = Buffer.from(PDF_ONE);
    wrong[wrong.length - 2] ^= 1;
    const sourceEntry = "edition/forms/wrong-hash.pdf";
    writePortableSource(wrongFixture.locatorRoot, sourceEntry, wrong);
    const requirement = makeRequirement({
      documentId: "fixture-wrong-hash",
      bytes: PDF_ONE,
      sourceEntry,
      destination: "materialized/forms/wrong-hash.pdf"
    });
    const error = await captureMaterializationError(() =>
      materializeVerifiedSource(requirement, {
        materializationRoot: wrongFixture.materializationRoot,
        locatorRoots: locatorResolutions(wrongFixture.locatorRoot),
        authorizedRequirements: [requirement]
      })
    );
    assert.equal(
      error.result.state,
      SOURCE_MATERIALIZATION_STATES.BINARY_HASH_MISMATCH
    );
    assert.equal(error.result.workerReady, false);
    assert.equal(
      fs.existsSync(
        path.join(
          wrongFixture.materializationRoot,
          requirement.materializationDestination
        )
      ),
      false
    );
  });

  await check("wrong expected size fails before worker readiness", async () => {
    const wrongFixture = fixtureDirectories("wrong-size");
    const sourceEntry = "edition/forms/wrong-size.pdf";
    writePortableSource(wrongFixture.locatorRoot, sourceEntry, PDF_ONE);
    const requirement = makeRequirement({
      documentId: "fixture-wrong-size",
      bytes: PDF_ONE,
      expectedBytes: PDF_ONE.length + 1,
      sourceEntry,
      destination: "materialized/forms/wrong-size.pdf"
    });
    const error = await captureMaterializationError(() =>
      materializeVerifiedSource(requirement, {
        materializationRoot: wrongFixture.materializationRoot,
        locatorRoots: locatorResolutions(wrongFixture.locatorRoot),
        authorizedRequirements: [requirement]
      })
    );
    assert.equal(
      error.result.state,
      SOURCE_MATERIALIZATION_STATES.BINARY_SIZE_MISMATCH
    );
    assert.equal(error.result.workerReady, false);
    assert.equal(
      fs.existsSync(
        path.join(
          wrongFixture.materializationRoot,
          requirement.materializationDestination
        )
      ),
      false
    );
  });

  await check("wrong byte-sniffed media type fails despite matching hash and size", async () => {
    const wrongFixture = fixtureDirectories("wrong-media");
    const notPdf = Buffer.from("not-a-pdf-but-hash-and-size-are-pinned", "ascii");
    const sourceEntry = "edition/forms/wrong-media.pdf";
    writePortableSource(wrongFixture.locatorRoot, sourceEntry, notPdf);
    const requirement = makeRequirement({
      documentId: "fixture-wrong-media",
      bytes: notPdf,
      sourceEntry,
      destination: "materialized/forms/wrong-media.pdf",
      expectedMediaType: "application/pdf"
    });
    const error = await captureMaterializationError(() =>
      materializeVerifiedSource(requirement, {
        materializationRoot: wrongFixture.materializationRoot,
        locatorRoots: locatorResolutions(wrongFixture.locatorRoot),
        authorizedRequirements: [requirement]
      })
    );
    assert.equal(
      error.result.state,
      SOURCE_MATERIALIZATION_STATES.BINARY_MEDIA_TYPE_MISMATCH
    );
    assert.equal(error.result.workerReady, false);
    assert.equal(
      fs.existsSync(
        path.join(
          wrongFixture.materializationRoot,
          requirement.materializationDestination
        )
      ),
      false
    );
  });

  await check("lexical, encoded, and symbolic-link traversal fail closed", async () => {
    for (const invalidPath of [
      "../outside.pdf",
      "/absolute/outside.pdf",
      "C:/outside.pdf",
      "materialized\\outside.pdf",
      "materialized/%2e%2e/outside.pdf"
    ]) {
      assert.throws(
        () => assertPortableRelativePath(invalidPath),
        (error) => error?.code === "path_boundary_violation",
        invalidPath
      );
    }
    for (const locator of [
      `${LOCATOR_SCHEME}://../outside.pdf`,
      `${LOCATOR_SCHEME}://edition/%2e%2e/outside.pdf`,
      `${LOCATOR_SCHEME}://fixture-secret-credential@edition/forms/source.pdf`,
      `${LOCATOR_SCHEME}://private/Nationwide/source.pdf`,
      "file:///workspaces/source.pdf"
    ]) {
      assert.throws(() => parsePortableLocator(locator), SourceMaterializationError);
    }
    assert.throws(
      () =>
        parsePortableLocator(
          `${LOCATOR_SCHEME}://fixture-secret-credential@edition/form.pdf`
        ),
      (error) =>
        error instanceof SourceMaterializationError &&
        !error.message.includes("fixture-secret-credential")
    );

    const outside = path.join(temporaryRoot, "outside");
    fs.mkdirSync(outside);
    const symlinkRoot = fixtureDirectories("symlink");
    fs.symlinkSync(outside, path.join(symlinkRoot.materializationRoot, "escape"));
    const requirement = makeRequirement({
      documentId: "fixture-symlink-destination",
      bytes: PDF_ONE,
      sourceEntry: "edition/forms/source-one.pdf",
      destination: "escape/outside.pdf"
    });
    const error = await captureMaterializationError(() =>
      materializeVerifiedSource(requirement, {
        materializationRoot: symlinkRoot.materializationRoot,
        locatorRoots: locatorResolutions(fixture.locatorRoot),
        authorizedRequirements: [requirement]
      })
    );
    assert.equal(error.code, "path_boundary_violation");
    assert.equal(fs.existsSync(path.join(outside, "outside.pdf")), false);
  });

  await check("a mismatched existing destination is never changed or overwritten", async () => {
    const overwriteFixture = fixtureDirectories("overwrite");
    const requirement = makeRequirement({
      documentId: "fixture-no-overwrite",
      bytes: PDF_ONE,
      sourceEntry: "edition/forms/source-one.pdf",
      destination: "materialized/forms/existing.pdf"
    });
    const destination = path.join(
      overwriteFixture.materializationRoot,
      requirement.materializationDestination
    );
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, "preserve-this-existing-file", {
      mode: 0o640
    });
    const before = snapshotFile(destination);
    const error = await captureMaterializationError(() =>
      materializeVerifiedSource(requirement, {
        materializationRoot: overwriteFixture.materializationRoot,
        locatorRoots: locatorResolutions(fixture.locatorRoot),
        authorizedRequirements: [requirement]
      })
    );
    assert.equal(error.code, "existing_destination_rejected");
    assert.deepEqual(snapshotFile(destination), before);
  });

  await check("multiple required sources use all-of readiness", async () => {
    const multipleFixture = fixtureDirectories("multiple");
    writePortableSource(
      multipleFixture.locatorRoot,
      "edition/forms/one.pdf",
      PDF_ONE
    );
    writePortableSource(
      multipleFixture.locatorRoot,
      "edition/forms/two.pdf",
      PDF_TWO
    );
    const first = makeRequirement({
      documentId: "fixture-multiple-one",
      bytes: PDF_ONE,
      sourceEntry: "edition/forms/one.pdf",
      destination: "materialized/forms/one.pdf"
    });
    const second = makeRequirement({
      documentId: "fixture-multiple-two",
      bytes: PDF_TWO,
      sourceEntry: "edition/forms/two.pdf",
      destination: "materialized/forms/two.pdf"
    });
    const before = await inspectMaterializedSourceSet([first, second], {
      materializationRoot: multipleFixture.materializationRoot
    });
    assert.equal(before.workerReady, false);
    const partialFixture = fixtureDirectories("multiple-partial");
    writePortableSource(
      partialFixture.locatorRoot,
      "edition/forms/one.pdf",
      PDF_ONE
    );
    await materializeVerifiedSourceSet([first], {
      materializationRoot: partialFixture.materializationRoot,
      locatorRoots: locatorResolutions(partialFixture.locatorRoot),
      authorizedRequirements: [first]
    });
    const partial = await inspectMaterializedSourceSet([first, second], {
      materializationRoot: partialFixture.materializationRoot
    });
    assert.equal(partial.workerReady, false);
    assert.equal(
      partial.sources.find(
        (source) => source.documentId === second.documentId
      ).state,
      SOURCE_MATERIALIZATION_STATES.BINARY_UNAVAILABLE
    );
    const result = await materializeVerifiedSourceSet([first, second], {
      materializationRoot: multipleFixture.materializationRoot,
      locatorRoots: locatorResolutions(multipleFixture.locatorRoot),
      authorizedRequirements: [first, second]
    });
    assert.equal(result.requiredSourceCount, 2);
    assert.equal(result.uniqueSourceCount, 2);
    assert.equal(result.workerReady, true);
    assert.ok(result.sources.every((source) => source.workerReady));
  });

  await check("one exact source can serve several component bindings once", async () => {
    const sharedFixture = fixtureDirectories("shared");
    writePortableSource(
      sharedFixture.locatorRoot,
      "edition/forms/shared.pdf",
      PDF_ONE
    );
    const first = makeRequirement({
      documentId: "fixture-shared-source",
      bytes: PDF_ONE,
      sourceEntry: "edition/forms/shared.pdf",
      destination: "materialized/forms/shared.pdf",
      usageBindings: [
        { trackId: "fixture-shared-track", componentId: "primary-filing" }
      ]
    });
    const second = {
      ...structuredClone(first),
      usageBindings: [
        { trackId: "fixture-shared-track", componentId: "proposed-order" }
      ]
    };
    const result = await materializeVerifiedSourceSet([first, second], {
      materializationRoot: sharedFixture.materializationRoot,
      locatorRoots: locatorResolutions(sharedFixture.locatorRoot),
      authorizedRequirements: [first, second]
    });
    assert.equal(result.requiredSourceCount, 2);
    assert.equal(result.uniqueSourceCount, 1);
    assert.equal(result.duplicateBindingCount, 1);
    assert.equal(result.sources[0].usageBindings.length, 2);
    assert.equal(
      countFiles(sharedFixture.materializationRoot, ".pdf"),
      1
    );
  });

  await check("conflicting shared identity and destination claims fail closed", async () => {
    const first = makeRequirement({
      documentId: "fixture-conflict",
      bytes: PDF_ONE,
      sourceEntry: "edition/forms/conflict.pdf",
      destination: "materialized/forms/conflict.pdf"
    });
    const conflictingIdentity = makeRequirement({
      documentId: "fixture-conflict",
      bytes: PDF_TWO,
      sourceEntry: "edition/forms/conflict.pdf",
      destination: "materialized/forms/conflict.pdf"
    });
    await assert.rejects(
      () =>
        inspectMaterializedSourceSet([first, conflictingIdentity], {
          materializationRoot: fixture.materializationRoot
        }),
      (error) => error?.code === "conflicting_source_identity"
    );
    const conflictingDestination = makeRequirement({
      documentId: "fixture-conflict-two",
      bytes: PDF_TWO,
      sourceEntry: "edition/forms/conflict-two.pdf",
      destination: first.materializationDestination
    });
    await assert.rejects(
      () =>
        inspectMaterializedSourceSet([first, conflictingDestination], {
          materializationRoot: fixture.materializationRoot
        }),
      (error) => error?.code === "conflicting_materialization_destination"
    );
  });

  await check("cross-Codespace regeneration is root-independent and deterministic", async () => {
    const portable = fixtureDirectories("portable");
    writePortableSource(
      portable.locatorRoot,
      "edition/forms/portable.pdf",
      PDF_ONE
    );
    const requirement = makeRequirement({
      documentId: "fixture-portable-source",
      bytes: PDF_ONE,
      sourceEntry: "edition/forms/portable.pdf",
      destination: "materialized/forms/portable.pdf"
    });
    const codespaceOne = fixtureDirectories("codespace-one");
    const codespaceTwo = fixtureDirectories("codespace-two");
    const options = (materializationRoot) => ({
      materializationRoot,
      locatorRoots: locatorResolutions(portable.locatorRoot),
      authorizedRequirements: [requirement]
    });
    const firstSet = await materializeVerifiedSourceSet(
      [requirement],
      options(codespaceOne.materializationRoot)
    );
    const secondSet = await materializeVerifiedSourceSet(
      [requirement],
      options(codespaceTwo.materializationRoot)
    );
    const first = firstSet.sources[0];
    const second = secondSet.sources[0];
    assert.equal(first.receiptSha256, second.receiptSha256);
    assert.deepEqual(first, second);
    const serialized = JSON.stringify(first);
    assert.equal(serialized.includes(codespaceOne.materializationRoot), false);
    assert.equal(serialized.includes(codespaceTwo.materializationRoot), false);
    assert.equal(serialized.includes("/workspaces/"), false);
  });

  await check("read-only drift removes worker authorization", async () => {
    const destination = path.join(
      fixture.materializationRoot,
      requirementOne.materializationDestination
    );
    const destinationDirectory = path.dirname(destination);
    assert.equal(
      fs.lstatSync(fixture.materializationRoot).mode & 0o777,
      0o555
    );
    assert.equal(fs.lstatSync(destinationDirectory).mode & 0o777, 0o555);
    fs.chmodSync(destinationDirectory, 0o755);
    const writableParent = await inspectMaterializedSource(requirementOne, {
      materializationRoot: fixture.materializationRoot
    });
    assert.equal(writableParent.workerReady, false);
    assert.equal(
      writableParent.state,
      "worker_read_authorization_denied"
    );
    fs.chmodSync(destinationDirectory, 0o555);
    fs.chmodSync(destination, 0o644);
    const drifted = await inspectMaterializedSource(requirementOne, {
      materializationRoot: fixture.materializationRoot
    });
    assert.equal(drifted.workerReady, false);
    assert.equal(drifted.state, "worker_read_authorization_denied");
    assert.equal(
      drifted.states.includes(
        SOURCE_MATERIALIZATION_STATES.WORKER_READ_AUTHORIZED
      ),
      false
    );
    fs.chmodSync(destination, 0o444);
  });

  await check("unknown identities fail before locator access or writes", async () => {
    const unknown = makeRequirement({
      documentId: "fixture-unknown-source",
      bytes: PDF_ONE,
      sourceEntry: "edition/forms/source-one.pdf",
      destination: "materialized/forms/unknown.pdf"
    });
    const error = await captureMaterializationError(() =>
      materializeVerifiedSource(unknown, {
        materializationRoot: fixture.materializationRoot,
        locatorRoots: {
          [LOCATOR_SCHEME]: {
            ...locatorResolutions("/does/not/exist")[LOCATOR_SCHEME]
          }
        },
        authorizedRequirements: [requirementOne]
      })
    );
    assert.equal(error.code, "unknown_source_identity");
    assert.equal(
      fs.existsSync(
        path.join(fixture.materializationRoot, unknown.materializationDestination)
      ),
      false
    );
  });

  await check("the CLI loader requires the captain-owned immutable anchor", async () => {
    const anchored = createAnchoredAssignmentFixture();
    const loaded = await loadAssignedMaterializationRequirement({
      rootDir: anchored.workerRoot,
      documentId: anchored.requirement.documentId,
      expectedSha256: anchored.requirement.expectedSha256,
      expectedBytes: anchored.requirement.expectedBytes
    });
    assert.equal(loaded.documentId, anchored.requirement.documentId);
    assert.equal(
      loaded.assignmentManifestSha256,
      anchored.assignmentManifestSha256
    );
    assert.equal(loaded.assignmentJobId, anchored.assignedJob.jobId);
    assert.equal(
      loaded.portableLocator.startsWith(`${LOCATOR_SCHEME}://edition/`),
      true
    );

    const marker = JSON.parse(
      fs.readFileSync(anchored.markerPath, "utf8")
    );
    marker.assignedJob.sourceMaterializationInputs[0].documentRole =
      "forged role";
    marker.assignedJobSha256 = canonicalJsonSha256(marker.assignedJob);
    fs.writeFileSync(
      anchored.markerPath,
      `${JSON.stringify(marker, null, 2)}\n`
    );
    await assert.rejects(
      () =>
        loadAssignedMaterializationRequirement({
          rootDir: anchored.workerRoot,
          documentId: anchored.requirement.documentId,
          expectedSha256: anchored.requirement.expectedSha256,
          expectedBytes: anchored.requirement.expectedBytes
        }),
      (error) => error?.code === "assignment_manifest_mismatch"
    );
  });

  await check("factory official-PDF work stays blocked on exact local verification", async () => {
    const plan = await loadFactoryPlan({ root: ROOT, rootDir: ROOT });
    const foundation = plan.jobs.find(
      (job) =>
        job.jobId === "rcap-nationwide-source-materialization-contract"
    );
    assert.ok(foundation);
    assert.deepEqual([...foundation.expectedOutputs].sort(), [...REQUIRED_OUTPUTS].sort());
    const officialJobs = plan.jobs.filter(
      (job) =>
        (job.officialPdfAssignment?.identityKeys?.length ?? 0) > 0 &&
        ["planned", "ready", "blocked", "in_progress"].includes(job.status)
    );
    assert.ok(officialJobs.length > 0);
    for (const job of officialJobs) {
      assert.equal(job.status, "blocked", job.jobId);
      assert.ok(
        job.dependencies.includes(
          "rcap-nationwide-source-materialization-contract"
        ),
        job.jobId
      );
      assert.ok(job.sourceMaterializationInputs.length > 0, job.jobId);
      for (const source of job.sourceMaterializationInputs) {
        assert.equal(
          source.materializationState,
          "binary_materialization_required",
          `${job.jobId}:${source.documentId}`
        );
        assert.equal(
          source.workerReadiness,
          "binary_materialization_required",
          `${job.jobId}:${source.documentId}`
        );
        assert.equal(source.workerMayRead, true);
        assert.equal(source.workerMayModify, false);
        assert.match(
          source.portableLocator,
          /^[a-z][a-z0-9+.-]*:\/\/[^/].+/u
        );
        assert.equal(source.portableLocator.includes("/workspaces/"), false);
        if (source.portableLocator.includes("://private/")) {
          assert.throws(
            () => parsePortableLocator(source.portableLocator),
            (error) => error?.code === "unsafe_portable_locator"
          );
        } else {
          parsePortableLocator(source.portableLocator);
        }
        const completePortableDescriptor = [
          "authorityEdition",
          "authorityArchiveSha256",
          "jurisdiction",
          "documentRole",
          "expectedMediaType",
          "readOnlyTreatment",
          "retentionPolicy",
          "expectedMeasurementBasis",
          "identityBindingStatus"
        ].every(
          (field) =>
            typeof source[field] === "string" &&
            source[field].trim().length > 0
        );
        if (!completePortableDescriptor) {
          assert.equal(job.status, "blocked", job.jobId);
        }
        assert.ok(job.requiredInputs.includes(source.materializationDestination));
        assert.ok(job.focusedValidation.includes(source.verificationCommand));
        assert.match(
          source.verificationCommand,
          /^node scripts\/verify-rcap-materialized-source\.mjs --source-identity-key /u
        );
      }
    }
    const registry = readJson(
      "data/record-clearing/source-artifact-registry.json"
    );
    assert.ok(
      registry.artifacts.some((artifact) => artifact.presence === "present")
    );
    assert.equal(
      officialJobs.some((job) => job.status === "ready"),
      false,
      "registry presence must not create worker readiness"
    );
  });

  await check("the worker CLI is verify-only and preserves assigned assertions", () => {
    const text = fs.readFileSync(
      path.join(ROOT, MATERIALIZED_VERIFIER_PATH),
      "utf8"
    );
    assert.match(text, /--source-identity-key/u);
    assert.match(text, /--sha256/u);
    assert.match(text, /--bytes/u);
    assert.match(text, /assignedJobSha256/u);
    assert.match(text, /assignmentManifestSha256/u);
    assert.match(text, /materialization_root_required/u);
    assert.match(text, /This worker command verifies/u);
    assert.doesNotMatch(text, /--download/u);
    assert.doesNotMatch(text, /--acquire/u);
    assert.doesNotMatch(text, /--overwrite/u);
  });

  await check("receipts are deterministic, redacted, and provenance-bound", () => {
    assert.ok(installedOne);
    assert.match(installedOne.receiptSha256, /^[0-9a-f]{64}$/u);
    assert.equal(
      installedOne.receiptSha256,
      canonicalJsonSha256(
        Object.fromEntries(
          Object.entries(installedOne).filter(
            ([key]) =>
              key !== "receiptSha256" &&
              key !== "materializationAction"
          )
        )
      )
    );
    const serialized = JSON.stringify(installedOne);
    assert.equal(serialized.includes(temporaryRoot), false);
    assert.equal(serialized.includes("fixture-secret-credential"), false);
    assert.equal(serialized.includes("fixture-participant-name"), false);
    assert.equal(serialized.includes(new Date().toISOString().slice(0, 10)), false);
  });

  await check("contract verification leaves protected repository inputs unchanged", () => {
    assert.deepEqual(snapshotFiles(PROTECTED_INPUTS), protectedBefore);
    assert.equal(gitStatus(), statusBefore);
  });
} finally {
  makeFixtureTreeRemovable(temporaryRoot);
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  process.stderr.write(
    `RCAP source materialization contract failed:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `RCAP source materialization contract verified (${checks.length} checks).\n`
  );
}

async function check(name, callback) {
  try {
    await callback();
    checks.push(name);
  } catch (error) {
    failures.push(
      `${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function fixtureDirectories(label) {
  const base = path.join(temporaryRoot, label);
  const locatorRoot = path.join(base, "portable-locator");
  const materializationRoot = path.join(base, "worker-checkout");
  fs.mkdirSync(locatorRoot, { recursive: true });
  fs.mkdirSync(materializationRoot, { recursive: true });
  fs.chmodSync(materializationRoot, 0o700);
  return { base, locatorRoot, materializationRoot };
}

function makeRequirement({
  documentId,
  bytes,
  sourceEntry,
  destination,
  expectedBytes = bytes.length,
  expectedMediaType = "application/pdf",
  usageBindings = [
    { trackId: `${documentId}-track`, componentId: "primary-filing" }
  ]
}) {
  const requirement = {
    schemaVersion: SOURCE_MATERIALIZATION_REQUIREMENT_SCHEMA,
    authorityEdition: "master-library/fixture-1",
    authorityArchiveSha256: "a".repeat(64),
    jurisdiction: "DC",
    documentId,
    documentRole: "participant court form",
    canonicalAuthorityPath: `STATES/DC/${path.posix.basename(sourceEntry)}`,
    expectedSha256: sha256(bytes),
    expectedBytes,
    expectedMediaType,
    repositorySourcePath: `evidence/DC/${path.posix.basename(sourceEntry)}`,
    portableLocator: `${LOCATOR_SCHEME}://${sourceEntry}`,
    materializationDestination: destination,
    readOnlyTreatment: "worker_read_only_no_modify",
    verificationCommand:
      `node scripts/verify-rcap-materialized-source.mjs --document-id ${documentId} ` +
      `--sha256 ${sha256(bytes)} --bytes ${expectedBytes}`,
    retentionPolicy:
      "retain_until_worker_integration_then_captain_managed_cleanup",
    expectedMeasurementBasis: "carried_forward_registry_measurement",
    identityBindingStatus: "exact_pinned_identity",
    authorityAssetState: "authority_asset_known",
    registryState: "registry_metadata_present",
    assignmentJobId: "rcap-fixture-official-pdf",
    assignmentBaseCommit: "b".repeat(40),
    assignmentManifestSha256: "c".repeat(64),
    usageBindings,
    provenance: {
      registryPath: "data/record-clearing/source-artifact-registry.json",
      registryArtifactId: documentId,
      registryPresence: "present_in_another_environment",
      registryHashState: "carried_forward_match",
      freshLocalVerification: false,
      registryPresenceConfersReadiness: false
    }
  };
  return validateMaterializationRequirement(requirement);
}

function locatorResolutions(root) {
  return {
    [LOCATOR_SCHEME]: {
      root,
      authorityEdition: "master-library/fixture-1",
      authorityArchiveSha256: "a".repeat(64),
      verificationBasis: "freshly_verified_read_only_authority_container"
    }
  };
}

function createAnchoredAssignmentFixture() {
  const captainRoot = path.join(temporaryRoot, "anchored-assignment");
  const assignedJobId = "rcap-fixture-official-pdf";
  const workerRoot = path.join(
    captainRoot,
    "tmp/rcap-factory/worktrees/fixture-worker"
  );
  const markerPath = path.join(workerRoot, "tmp/rcap-factory/job.json");
  const anchorPath = path.join(
    captainRoot,
    `tmp/rcap-factory/jobs/${assignedJobId}/job.json`
  );
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.mkdirSync(path.dirname(anchorPath), { recursive: true });
  fs.mkdirSync(
    path.join(workerRoot, "data/record-clearing/master-library"),
    { recursive: true }
  );
  fs.mkdirSync(path.join(workerRoot, "data/record-clearing"), {
    recursive: true
  });

  const requirement = makeRequirement({
    documentId: "fixture-anchored-source",
    bytes: PDF_ONE,
    sourceEntry: "edition/forms/anchored.pdf",
    destination: "materialized/forms/anchored.pdf"
  });
  const {
    schemaVersion: _schemaVersion,
    assignmentJobId: _assignmentJobId,
    assignmentBaseCommit: _assignmentBaseCommit,
    assignmentManifestSha256: _assignmentManifestSha256,
    ...claim
  } = requirement;
  const assignedJob = {
    jobId: assignedJobId,
    jurisdiction: "DC",
    baseCommit: "b".repeat(40),
    trackIds: ["fixture-anchored-source-track"],
    requiredInputs: [claim.materializationDestination],
    focusedValidation: [claim.verificationCommand],
    sourceMaterializationInputs: [
      {
        ...claim,
        authorityAssetState: "authority_asset_known",
        materializationState: "binary_materialization_required",
        workerReadiness: "binary_materialization_required",
        workerMayRead: true,
        workerMayModify: false
      }
    ]
  };
  const anchorBytes = Buffer.from(`${JSON.stringify(assignedJob, null, 2)}\n`);
  fs.writeFileSync(anchorPath, anchorBytes);
  const assignmentManifestSha256 = sha256(anchorBytes);
  const marker = {
    jobId: assignedJobId,
    assignedJob,
    assignedJobSha256: canonicalJsonSha256(assignedJob),
    assignmentManifestRelativePath: path
      .relative(workerRoot, anchorPath)
      .split(path.sep)
      .join("/"),
    assignmentManifestSha256,
    authorityVersion: requirement.authorityEdition,
    manifestBaseCommit: assignedJob.baseCommit
  };
  fs.writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
  fs.writeFileSync(
    path.join(
      workerRoot,
      "data/record-clearing/master-library/authority.json"
    ),
    `${JSON.stringify(
      {
        edition: "fixture-1",
        adoptionStatus: "adopted",
        retention: {
          archiveSha256: requirement.authorityArchiveSha256
        }
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(
      workerRoot,
      "data/record-clearing/source-artifact-registry.json"
    ),
    `${JSON.stringify(
      {
        artifacts: [
          {
            artifactId: requirement.documentId,
            jurisdiction: requirement.jurisdiction,
            sourcePath: requirement.repositorySourcePath,
            sizeBytes: requirement.expectedBytes,
            measuredSha256: requirement.expectedSha256,
            fileType: "pdf",
            role: requirement.documentRole,
            presence: "present",
            hashState: "match",
            provenance: {
              package: "fixture-package",
              manifest: "fixture-manifest"
            }
          }
        ]
      },
      null,
      2
    )}\n`
  );
  return {
    workerRoot,
    markerPath,
    assignedJob,
    requirement,
    assignmentManifestSha256
  };
}

function writePortableSource(root, relativePath, bytes) {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, bytes, { mode: 0o600 });
  return absolutePath;
}

async function captureMaterializationError(callback) {
  try {
    await callback();
  } catch (error) {
    assert.ok(error instanceof SourceMaterializationError);
    return error;
  }
  assert.fail("Expected source materialization to fail closed.");
}

function snapshotFile(filePath) {
  const stat = fs.lstatSync(filePath);
  return {
    sha256: sha256(fs.readFileSync(filePath)),
    mode: stat.mode & 0o777,
    size: stat.size,
    mtimeMs: stat.mtimeMs
  };
}

function snapshotFiles(relativePaths) {
  return Object.fromEntries(
    relativePaths.map((relativePath) => [
      relativePath,
      snapshotFile(path.join(ROOT, relativePath))
    ])
  );
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function countFiles(root, extension) {
  let count = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) count += countFiles(absolute, extension);
    if (entry.isFile() && entry.name.endsWith(extension)) count += 1;
  }
  return count;
}

function makeFixtureTreeRemovable(root) {
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink()) return;
  if (!stat.isDirectory()) {
    fs.chmodSync(root, 0o600);
    return;
  }
  fs.chmodSync(root, 0o700);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    makeFixtureTreeRemovable(absolute);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function gitStatus() {
  const result = spawnSync("git", ["status", "--porcelain=v1", "-uall"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
