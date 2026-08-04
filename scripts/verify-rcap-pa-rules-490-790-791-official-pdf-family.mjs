#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { PDFCheckBox, PDFDocument } from "pdf-lib";

const rootDir = process.cwd();
const requireAllSources = process.argv.includes("--require-all-sources");
const familyDir = path.join(
  rootDir,
  "data/record-clearing/production-factory/official-pdf-families/PA"
);
const implementationPath = path.join(
  rootDir,
  "src/lib/rcap/packets/jurisdictions/pennsylvania/official-pdf/index.ts"
);
const implementation = await import(pathToFileURL(implementationPath).href);

const family = readJson("family-manifest.json");
const dependencies = readJson("materialization-dependencies.json");
const requirements = readJson("source-requirements.json");
const fieldMap = readJson("field-map-scaffold.json");
const ownership = readJson("field-ownership.json");
const fixtures = readJson("fixtures.json");
const assembly = readJson("packet-assembly.json");
const inspection = readJson("rule-790-petition-source-inspection.json");
const review = readJson("review-manifest.json");
const sourceRegistry = readRepositoryJson("data/record-clearing/source-artifact-registry.json");
const repositoryAudit = readRepositoryJson(
  "data/record-clearing/master-library/repository-asset-audit.json"
);
const authority = readRepositoryJson("data/record-clearing/master-library/authority.json");
const memo = readRepositoryJson("data/record-clearing/legal-design-intake/PA.memo.json");

assert.equal(family.schemaVersion, "rcap-official-pdf-family/v1");
assert.equal(family.familyId, "pa-rules-490-790-791");
assert.equal(family.jurisdiction, "PA");
assert.equal(family.sourceMaterialization.workerReady, false);
assert.equal(
  family.sourceMaterialization.contractState,
  "pending_captain_owned_assignment"
);
assert.equal(family.sourceMaterialization.assignmentManifest, null);
assert.equal(family.sourceMaterialization.portableProjectionAvailable, false);
assert.equal(family.sourceMaterialization.registryPresenceConfersReadiness, false);
assert.equal(family.sourceMaterialization.workerMayAcquireSources, false);
assert.equal(family.status.packetReady, false);
assert.equal(family.status.enabled, false);
assert.equal(dependencies.workerReady, false);
assert.equal(dependencies.failurePolicy.fallbackAllowed, false);
assert.equal(
  requirements.schemaVersion,
  "rcap-source-materialization-requirement-scaffold-set/v1"
);
assert.equal(
  requirements.normativeRequirementSchema,
  "rcap-source-materialization-requirement/v1"
);
assert.equal(requirements.contractState, "pending_captain_owned_assignment");
assert.equal(requirements.assignmentManifest, null);
assert.equal(requirements.portableProjectionAvailable, false);
assert.equal(requirements.requirements.length, 6);
assert.equal(fieldMap.forms.length, 6);
assert.equal(ownership.forms.length, 6);
assert.equal(assembly.packets.length, 7);
assert.equal(review.promotion.generationAllowed, false);
assert.equal(review.promotion.enabled, false);
assert.deepEqual(review.completeParticipantPackets, []);
assert.equal(review.visualReview, "partial_rule_790_text_fields_passed");
assert.equal(
  review.visualInspectionArtifacts[0].status,
  "mapped_text_placement_passed_protected_fields_blank_checkbox_semantics_pending"
);
assert.equal(
  review.visualInspectionArtifacts[0].filledPdfSha256,
  "309d058e7e520a20414bdf5eb15ec4f7e5b3875da42e27b050c6ce613ca111f9"
);

assert.equal(authority.edition, "1.2");
assert.equal(authority.defaultRuntimePosture, "runtime_disabled");
assert.equal(
  authority.retention.archiveSha256,
  "7edd0a0e8308b58e12f59494a326342cc83dd362bb58f787e43d6fb475ef43bd"
);
for (const requirement of requirements.requirements) {
  assert.equal(
    requirement.schemaVersion,
    "rcap-source-materialization-requirement-scaffold/v1"
  );
  assert.equal(
    requirement.normativeRequirementSchema,
    "rcap-source-materialization-requirement/v1"
  );
  assert.equal(requirement.contractState, "pending_captain_owned_assignment");
  assert.equal(
    requirement.authorityEdition,
    `master-library/${authority.edition}`
  );
  assert.equal(requirement.authorityArchiveSha256, authority.retention.archiveSha256);
  assert.equal(requirement.expectedMediaType, "application/pdf");
  assert.equal(requirement.identityBindingStatus, "exact_pinned_identity");
  assert.equal(requirement.provenance.registryPresenceConfersReadiness, false);
  assert.ok(
    requirement.portableLocatorCandidate.endsWith(
      requirement.canonicalAuthorityPath
    ),
    `${requirement.documentId} portable locator must carry the exact canonical authority path`
  );
  assert.equal(requirement.repositorySourcePathTreatment, "identity_evidence_only");
  assert.equal(requirement.workerMaterializationAuthorized, false);
  assert.deepEqual(requirement.assignmentBinding, {
    assignmentJobId: null,
    assignmentBaseCommit: null,
    assignmentManifestSha256: null,
    state: "captain_owned_assignment_required"
  });
  assert.equal(
    requirement.proposedMaterializationDestination,
    `official-pdf-sources/PA/${requirement.documentId}.pdf`
  );
  assert.equal(
    requirement.verificationCommandCandidate,
    `node scripts/verify-rcap-materialized-source.mjs --document-id ${requirement.documentId} --sha256 ${requirement.expectedSha256} --bytes ${requirement.expectedBytes}`
  );

  const registryEntry = sourceRegistry.artifacts.find(
    (entry) => entry.sourcePath === requirement.repositorySourcePath
  );
  assert.ok(registryEntry, `${requirement.documentId} source-registry row must exist`);
  assert.equal(registryEntry.fileType, "pdf");
  assert.equal(registryEntry.inventorySha256, requirement.expectedSha256);
  assert.equal(registryEntry.measuredSha256, requirement.expectedSha256);
  assert.equal(registryEntry.sizeBytes, requirement.expectedBytes);
  assert.equal(registryEntry.technicalClass, requirement.expectedStructure.technicalClass);
  assert.equal(registryEntry.pageCount, requirement.expectedStructure.pageCount);
  assert.equal(registryEntry.fieldCount, requirement.expectedStructure.fieldCount);
  assert.equal(registryEntry.encrypted, false);
  assert.equal(registryEntry.xfa, false);

  const auditEntry = repositoryAudit.assets.find(
    (entry) => entry.libraryRow?.documentId === requirement.documentId
  );
  assert.ok(auditEntry, `${requirement.documentId} repository-audit row must exist`);
  assert.equal(auditEntry.sourcePath, requirement.repositorySourcePath);
  assert.equal(auditEntry.sha256, requirement.expectedSha256);
  assert.equal(auditEntry.status, "manifested_packet_form");
  assert.equal(auditEntry.libraryRow.workflowKey, requirement.workflowKey);
  assert.equal(auditEntry.libraryRow.revision, requirement.revision);
  assert.equal(auditEntry.libraryRow.canonicalRelativePath, requirement.canonicalAuthorityPath);
}

verifyLegalDesignProvenance();
verifyPacketAssemblyAgainstMemo();
verifyUsageBindings();

const expectedAvailable = requirements.requirements.filter(
  (requirement) => requirement.materializationState === "exact_read_only_alternate_verified"
);
const expectedMissing = requirements.requirements.filter(
  (requirement) => requirement.materializationState === "binary_materialization_required"
);
assert.deepEqual(
  expectedAvailable.map((requirement) => requirement.documentId),
  ["PA-RCRIM-P-790-PETITION"]
);
assert.equal(expectedMissing.length, 5);

for (const requirement of expectedMissing) {
  assert.equal(requirement.materializationStateBasis, "no_local_source");
  await expectPennsylvaniaError(
    () =>
      implementation.verifyPennsylvaniaOfficialPdfSource(
        rootDir,
        requirement.documentId
      ),
    "source_missing"
  );
}

const retainedSource = requirements.requirements.find(
  (requirement) => requirement.documentId === "PA-RCRIM-P-790-PETITION"
);
assert.ok(retainedSource);
assert.equal(
  retainedSource.materializationStateBasis,
  "tracked_review_source_not_worker_projection"
);
assert.equal(
  retainedSource.resolvedReadOnlySourcePath,
  "reference/pennsylvania/222612-petitionforexpungement790030912-000077.pdf"
);
const retainedAbsolutePath = path.resolve(rootDir, retainedSource.resolvedReadOnlySourcePath);
assert.ok(fs.existsSync(retainedAbsolutePath));
assert.equal(fs.lstatSync(retainedAbsolutePath).isSymbolicLink(), false);
assert.equal(fs.statSync(retainedAbsolutePath).isFile(), true);
assert.equal(fs.statSync(retainedAbsolutePath).size, retainedSource.expectedBytes);
assert.equal(sha256(fs.readFileSync(retainedAbsolutePath)), retainedSource.expectedSha256);
assert.equal(
  fs.readFileSync(retainedAbsolutePath).subarray(0, 5).toString("ascii"),
  "%PDF-"
);
assertGitTrackedAndUnmodified(retainedSource.resolvedReadOnlySourcePath);

const sourceBefore = fs.readFileSync(retainedAbsolutePath);
const verifiedSource = await implementation.verifyPennsylvaniaOfficialPdfSource(
  rootDir,
  retainedSource.documentId
);
assert.equal(verifiedSource.relativePath, retainedSource.resolvedReadOnlySourcePath);
assert.equal(verifiedSource.sha256, retainedSource.expectedSha256);
assert.equal(verifiedSource.byteLength, retainedSource.expectedBytes);
assert.equal(verifiedSource.pageCount, retainedSource.expectedStructure.pageCount);
assert.deepEqual(
  [...verifiedSource.fieldNames].sort(),
  [...implementation.RULE_790_PETITION_FIELD_NAMES].sort()
);
assert.equal(inspection.sha256, retainedSource.expectedSha256);
assert.equal(inspection.bytes, retainedSource.expectedBytes);
assert.equal(inspection.structure.technicalClass, "clean_acroform");
assert.equal(inspection.structure.fieldCount, 76);
assert.equal(inspection.structure.widgetCount, 78);
assert.deepEqual(inspection.structure.duplicateFieldNames, []);
assert.equal(inspection.structure.encrypted, false);
assert.equal(inspection.structure.xfa, false);
assert.equal(inspection.measurement.visualRendererAvailable, true);
assert.equal(inspection.measurement.visualReviewZoomPercent, 150);
assert.equal(inspection.reviewState.mappedTextPlacementsVerified, true);
assert.equal(inspection.reviewState.protectedBlankFieldsVerified, true);
assert.equal(inspection.reviewState.checkboxSemanticsVerified, false);
assert.equal(inspection.reviewState.visualSemanticsVerified, false);
assert.equal(inspection.reviewState.productionReady, false);

verifyFieldMapAndOwnership(verifiedSource.fieldNames);

const fixture = fixtures.positiveFixtures.find(
  (candidate) => candidate.fixtureId === "pa-rule790-technical-review-positive"
);
assert.ok(fixture);
assert.equal(fixture.syntheticDataOnly, undefined);
assert.equal(fixtures.syntheticDataOnly, true);
assert.equal(fixture.reviewOnly, true);

const firstRender = await implementation.renderRule790PetitionReviewComponent({
  rootDir,
  facts: fixture.facts
});
const secondRender = await implementation.renderRule790PetitionReviewComponent({
  rootDir,
  facts: fixture.facts
});
assert.equal(firstRender.sha256, secondRender.sha256);
assert.deepEqual(Buffer.from(firstRender.bytes), Buffer.from(secondRender.bytes));
assert.equal(firstRender.reviewOnly, true);
assert.equal(firstRender.participantPacket, false);
assert.equal(firstRender.pageCount, 1);
assert.equal(firstRender.sourceSha256, retainedSource.expectedSha256);
assert.equal(firstRender.filledFieldNames.length, 38);
assert.deepEqual(
  [...firstRender.protectedBlankFieldNames],
  ["Check Box1", "Checkbox2", "Social Security Number"]
);

const rendered = await PDFDocument.load(firstRender.bytes, { updateMetadata: false });
assert.equal(rendered.getPageCount(), 1);
assert.equal(rendered.getForm().getFields().length, 76);
assert.equal(rendered.getForm().getTextField("Full Name").getText(), "Avery Example");
assert.equal(
  rendered.getForm().getTextField("CPDocketNumber").getText(),
  "CP-22-CR-0000001-2024"
);
assert.equal(rendered.getForm().getTextField("Social Security Number").getText(), undefined);
for (const checkboxName of ["Check Box1", "Checkbox2"]) {
  const checkbox = rendered.getForm().getField(checkboxName);
  assert.ok(checkbox instanceof PDFCheckBox);
  assert.equal(checkbox.isChecked(), false);
}

const sourceAfter = fs.readFileSync(retainedAbsolutePath);
assert.deepEqual(sourceAfter, sourceBefore, "Rule 790 rendering must not modify retained source bytes");
assertGitTrackedAndUnmodified(retainedSource.resolvedReadOnlySourcePath);

const prohibitedFacts = structuredClone(fixture.facts);
prohibitedFacts.participant.socialSecurityNumber = "000-00-0000";
await expectPennsylvaniaError(
  () =>
    implementation.renderRule790PetitionReviewComponent({
      rootDir,
      facts: prohibitedFacts
    }),
  "prohibited_fact"
);
const checkboxFacts = structuredClone(fixture.facts);
checkboxFacts.petition.amountsPaid = false;
await expectPennsylvaniaError(
  () =>
    implementation.renderRule790PetitionReviewComponent({
      rootDir,
      facts: checkboxFacts
    }),
  "unconfirmed_widget_semantics"
);
await expectPennsylvaniaError(
  () =>
    implementation.assertPennsylvaniaPacketSourcesAvailable(rootDir, [
      "PA-RCRIM-P-790-PETITION",
      "PA-RCRIM-P-790-ORDER"
    ]),
  "packet_source_incomplete"
);

for (const packet of assembly.packets) {
  assert.equal(packet.targetParticipantPdf, true);
  assert.equal(packet.currentlyMaterializable, false);
  assert.ok(packet.blockingDocumentIds.length > 0);
}
assert.equal(assembly.assemblyPolicy.partialParticipantPacketAllowed, false);
assert.equal(assembly.assemblyPolicy.downloadOrSourceFallbackAllowed, false);
assert.equal(assembly.assemblyPolicy.componentReviewArtifactIsParticipantPacket, false);

verifyNoSourceCopies();
verifyLegacyIsolation();

if (requireAllSources) {
  throw new Error(
    `Exact Pennsylvania source materialization incomplete because no captain-owned assignment or portable projection exists for: ${expectedMissing
      .map((requirement) => requirement.documentId)
      .join(", ")}`
  );
}

process.stdout.write(
  [
    "PA Rules 490/790/791 official-PDF family verification passed.",
    `Exact local sources: ${expectedAvailable.length}/6 (Rule 790 petition only).`,
    `Fail-closed missing sources: ${expectedMissing.length}/6.`,
    `Rule 790 field ownership: ${verifiedSource.fieldNames.length}/76; mappings: ${implementation.RULE_790_PETITION_TEXT_MAPPINGS.length}; protected blank: 3.`,
    `Deterministic review component SHA-256: ${firstRender.sha256}.`,
    "Complete participant packets emitted: 0; generation enabled: false."
  ].join("\n") + "\n"
);

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(familyDir, fileName), "utf8"));
}

function readRepositoryJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    ...options
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`
    );
  }
  return result.stdout;
}

function assertGitTrackedAndUnmodified(relativePath) {
  git(["ls-files", "--error-unmatch", "--", relativePath]);
  const diff = spawnSync("git", ["diff", "--quiet", "--", relativePath], {
    cwd: rootDir
  });
  assert.equal(diff.status, 0, `${relativePath} must remain unmodified`);
}

function verifyLegalDesignProvenance() {
  assert.equal(memo.jurisdiction, "PA");
  assert.equal(
    family.legalDesignProvenance.normalizationCommit,
    "387656ac31a49f7338bd9d1e3e170df929659d98"
  );
  assert.equal(
    family.legalDesignProvenance.memoPath,
    "data/record-clearing/legal-design-intake/PA.memo.json"
  );
  assert.equal(family.legalDesignProvenance.treatment, "read_only_design_provenance");
  assert.equal(family.legalDesignProvenance.legalDesignChangedByThisFamily, false);
  const memoBytes = fs.readFileSync(
    path.join(rootDir, family.legalDesignProvenance.memoPath)
  );
  assert.equal(sha256(memoBytes), family.legalDesignProvenance.memoSha256);
  const publishedMemo = spawnSync(
    "git",
    [
      "show",
      `${family.legalDesignProvenance.normalizationCommit}:${family.legalDesignProvenance.memoPath}`
    ],
    { cwd: rootDir, encoding: "utf8" }
  );
  if (publishedMemo.status === 0) {
    assert.deepEqual(
      JSON.parse(publishedMemo.stdout),
      memo,
      "Integrated PA memo must match the published normalization commit"
    );
  }
  assertGitTrackedAndUnmodified(family.legalDesignProvenance.memoPath);
}

function verifyPacketAssemblyAgainstMemo() {
  const memoByTrack = new Map(memo.tracks.map((track) => [track.trackId, track]));
  for (const packet of assembly.packets) {
    const track = memoByTrack.get(packet.trackId);
    assert.ok(track, `${packet.trackId} must exist in the PA normalization memo`);
    assert.ok(
      track.outputStrategy === "official_pdf_fill" || track.outputStrategy === "composed"
    );
    assert.equal(track.legalDesignDecision.status, "legal_design_approved_with_limitations");
    const normalizedMemoComponents = track.components.map(normalizeMemoComponent);
    const normalizedAssemblyComponents = packet.documents.map(normalizeAssemblyComponent);
    assert.deepEqual(
      normalizedAssemblyComponents,
      normalizedMemoComponents,
      `${packet.trackId} packet components must reproduce the normalized legal design`
    );
  }
}

function normalizeMemoComponent(component) {
  return {
    role: component.role,
    requirement: component.requirement,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId ?? null,
    conditionDescription: component.conditionDescription ?? null
  };
}

function normalizeAssemblyComponent(component) {
  return {
    role: component.role,
    requirement: component.requirement,
    outputStrategy:
      component.rendererStrategy === "acroform_fill"
        ? "official_pdf_fill"
        : component.rendererStrategy,
    officialFormId: component.documentId ?? null,
    conditionDescription: component.conditionDescription ?? null
  };
}

function verifyUsageBindings() {
  const assemblyComponents = new Map(
    assembly.packets.flatMap((packet) =>
      packet.documents.map((component) => [component.componentId, { ...component, trackId: packet.trackId }])
    )
  );
  for (const requirement of requirements.requirements) {
    for (const binding of requirement.usageBindings) {
      const component = assemblyComponents.get(binding.componentId);
      assert.ok(component, `${binding.componentId} usage binding must resolve`);
      assert.equal(component.trackId, binding.trackId);
      assert.equal(component.documentId, requirement.documentId);
    }
  }
  for (const component of assemblyComponents.values()) {
    if (!family.documents.includes(component.documentId)) continue;
    const matches = requirements.requirements.flatMap((requirement) =>
      requirement.usageBindings.filter((binding) => binding.componentId === component.componentId)
    );
    assert.equal(matches.length, 1, `${component.componentId} must have one exact source binding`);
  }
}

function verifyFieldMapAndOwnership(fieldNames) {
  const rule790Map = fieldMap.forms.find(
    (form) => form.documentId === "PA-RCRIM-P-790-PETITION"
  );
  const rule790Ownership = ownership.forms.find(
    (form) => form.documentId === "PA-RCRIM-P-790-PETITION"
  );
  assert.ok(rule790Map);
  assert.ok(rule790Ownership);
  assert.equal(rule790Map.mappingReady, false);
  assert.equal(rule790Map.reviewRendererReady, true);
  assert.equal(rule790Map.overlays.length, 0);
  assert.equal(rule790Map.overlayState, "not_required_clean_acroform");
  assert.equal(rule790Map.mappings.length, 73);
  assert.equal(rule790Map.unmappedFields.length, 3);
  assert.equal(rule790Ownership.coverageComplete, true);
  assert.equal(rule790Ownership.approved, false);
  assert.equal(rule790Ownership.fields.length, 76);

  const ownershipNames = rule790Ownership.fields.map((field) => field.pdfFieldName);
  assert.equal(new Set(ownershipNames).size, ownershipNames.length);
  assert.deepEqual([...ownershipNames].sort(), [...fieldNames].sort());

  const mapNames = rule790Map.mappings.map((mapping) => mapping.pdfFieldName);
  const unmappedNames = rule790Map.unmappedFields.map((mapping) => mapping.pdfFieldName);
  assert.equal(new Set([...mapNames, ...unmappedNames]).size, 76);
  assert.deepEqual([...mapNames, ...unmappedNames].sort(), [...fieldNames].sort());
  assert.equal(mapNames.includes("Social Security Number"), false);
  assert.equal(mapNames.includes("Check Box1"), false);
  assert.equal(mapNames.includes("Checkbox2"), false);
  assert.deepEqual(
    [...unmappedNames].sort(),
    ["Check Box1", "Checkbox2", "Social Security Number"].sort()
  );
  const allowedOwners = new Set(ownership.policy.mappingAllowedFor);
  for (const mapping of rule790Map.mappings) {
    assert.ok(allowedOwners.has(mapping.owner));
    const owned = rule790Ownership.fields.find(
      (field) => field.pdfFieldName === mapping.pdfFieldName
    );
    assert.equal(owned.owner, mapping.owner);
  }
  for (const unmapped of rule790Map.unmappedFields) {
    const owned = rule790Ownership.fields.find(
      (field) => field.pdfFieldName === unmapped.pdfFieldName
    );
    assert.equal(owned.owner, unmapped.owner);
    assert.ok(ownership.policy.mustRemainBlank.includes(unmapped.owner));
  }

  const implementationMappings = implementation.RULE_790_PETITION_TEXT_MAPPINGS.map(
    ({ pdfFieldName, valuePath, owner, allowBlank }) => ({
      pdfFieldName,
      valuePath,
      owner,
      ...(allowBlank ? { allowBlank: true } : {})
    })
  );
  assert.deepEqual(
    sortMappings(implementationMappings),
    sortMappings(rule790Map.mappings),
    "Review renderer mappings must exactly match the field-map artifact"
  );
}

function sortMappings(mappings) {
  return [...mappings].sort((left, right) =>
    left.pdfFieldName.localeCompare(right.pdfFieldName)
  );
}

async function expectPennsylvaniaError(callback, expectedCode) {
  let caught = null;
  try {
    await callback();
  } catch (error) {
    caught = error;
  }
  assert.ok(
    caught instanceof implementation.PennsylvaniaOfficialPdfError,
    `Expected PennsylvaniaOfficialPdfError(${expectedCode})`
  );
  assert.equal(caught.code, expectedCode);
}

function verifyNoSourceCopies() {
  for (const relativeDir of [
    "data/record-clearing/production-factory/official-pdf-families/PA",
    "src/lib/rcap/packets/jurisdictions/pennsylvania/official-pdf"
  ]) {
    for (const filePath of walkFiles(path.join(rootDir, relativeDir))) {
      assert.notEqual(
        path.extname(filePath).toLowerCase(),
        ".pdf",
        `Official source bytes must not be copied into implementation paths: ${filePath}`
      );
    }
  }
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(filePath) : [filePath];
  });
}

function verifyLegacyIsolation() {
  const implementationImport = "packets/jurisdictions/pennsylvania/official-pdf";
  for (const relativePath of [
    "src/app/api/rcap/documents/pennsylvania/create/route.ts",
    "src/lib/rcap/documents/packet-pdf.ts",
    "src/lib/rcap/documents/source-repository.ts",
    "src/lib/rcap/packets/registry.ts"
  ]) {
    const contents = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
    assert.equal(
      contents.includes(implementationImport),
      false,
      `${relativePath} must not wire the review-only PA family into a live or central path`
    );
    assert.equal(
      contents.includes("pa-rules-490-790-791"),
      false,
      `${relativePath} must remain isolated from the PA family`
    );
  }
}
