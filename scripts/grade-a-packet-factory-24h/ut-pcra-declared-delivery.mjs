import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const UT_PCRA_FAMILY = "census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement";
export const UT_PCRA_ROUTE = "obligation:runtime-only:UT:path-l-vacatur-human-trafficking-related-expungement";
export const UT_PCRA_DIRECTORY = "data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill";
export const UT_PCRA_SOURCE = "reference/utah/04_PCRA_Petition-2022-06-13.pdf";
export const UT_PCRA_SOURCE_ID = "official-form:1231XX";
export const UT_PCRA_SOURCE_SHA256 = "9c5bd552fab0ada747b6f680b61e48acf4eca89275e2c8ad86d7ee3d82e95a09";
export const UT_PCRA_DECISION = "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json";
export const UT_PCRA_DECISION_ID = "UT-TRAFFICKING-PCRA-RULE-65C";
export const UT_PCRA_DECISION_SHA256 = "5e3b6fb6bdeff849949d1d2c44d9b4e7badfdf6e7ba38be6135c388df176b1f2";
export const UT_PCRA_IMPLEMENTATION = "data/rcap-grade-a/legal-decisions/UT_TRAFFICKING_PCRA_IMPLEMENTATION_2026-09-11.md";
export const UT_PCRA_IMPLEMENTATION_SHA256 = "f7af74fc6fabbd4ce98dedf06f351a3f3673d3e5c817140d4093b4d8f088efda";
export const UT_PCRA_COMPONENTS = ["UT-RULE-65C-PCRA", "UT-PCRA-ATTACHMENTS-A-B"];
export const UT_PCRA_ROUTE_COMPONENT_IDS = UT_PCRA_COMPONENTS.map(id => `component:${id}`);

const routeSet = value => [...(value ?? [])].sort();

function assertExactRoute(value, label) {
  assert.deepEqual(routeSet(value), [UT_PCRA_ROUTE], `${label} changed the exact PCRA route scope`);
}

function assertNoDeliveryAuthority(record) {
  if (Object.hasOwn(record, "status")) assert.equal(record.status, "DECLARED_NOT_INSTALLED");
  if (Object.hasOwn(record, "authorityCreated")) assert.equal(record.authorityCreated, "none");
  if (Object.hasOwn(record, "generationAllowed")) assert.equal(record.generationAllowed, false);
  if (Object.hasOwn(record, "runtimeSelectable")) assert.equal(record.runtimeSelectable, false);
  if (Object.hasOwn(record, "commercialRoutesOpened")) assert.equal(record.commercialRoutesOpened, 0);
  if (Object.hasOwn(record, "createsFulfillmentRecord")) assert.equal(record.createsFulfillmentRecord, false);
  if (Object.hasOwn(record, "opensCommercialRoute")) assert.equal(record.opensCommercialRoute, false);
  if (record.currentState) assert.equal(record.currentState.generationAllowed, false);
  assert.equal(record.binding.paymentEligible, false);
  assert.equal(record.binding.sponsorshipEligible, false);
}

export function assertUtPcraDeclaredEvidence({manifest, report, receipt, hashFile, byteLengthFile}) {
  for (const value of [manifest.familyId, report.familyId, receipt.familyId])
    assert.equal(value, UT_PCRA_FAMILY, "PCRA evidence names another family");
  assertExactRoute(manifest.routeKeys, "packet manifest");
  assert.equal(manifest.packetKind, "standalone_rule65c_pcra_with_incorporated_attachments");
  assert.deepEqual(manifest.orderedComponents.map(row => row.componentId),
    ["UT-RULE-65C-PCRA", "UT-PCRA-ATTACHMENT-A", "UT-PCRA-ATTACHMENT-B"],
    "PCRA packet manifest component order changed");
  assert.equal(manifest.orderedComponents[0].sourceSha256, UT_PCRA_SOURCE_SHA256);

  assert.equal(receipt.allSourcesExact, true);
  assert.equal(receipt.legalDecision, UT_PCRA_IMPLEMENTATION);
  assert.equal(receipt.documents.length, 1, "PCRA source receipt must bind one official source");
  const source = receipt.documents[0];
  assert.equal(source.documentId, "UT-RULE-65C-PCRA");
  assert.equal(source.sourceId, UT_PCRA_SOURCE_ID);
  assert.equal(source.heldCorpusPath, UT_PCRA_SOURCE);
  assert.equal(source.sha256, UT_PCRA_SOURCE_SHA256);
  assert.equal(source.byteLength, 128059);
  assert.equal(source.pageCount, 10);
  assert.equal(hashFile(UT_PCRA_SOURCE), UT_PCRA_SOURCE_SHA256, "Held PCRA source bytes changed");
  assert.equal(byteLengthFile(UT_PCRA_SOURCE), source.byteLength, "Held PCRA source length changed");

  assert.equal(report.renderedFresh, true);
  assert.equal(report.componentIdentityMode, "exact");
  assert.equal(report.packets.length, 2);
  assert.equal(report.artifacts.length, 2);
  for (const fixture of ["canonical", "boundary"]) {
    const packets = report.packets.filter(row => row.fixture === fixture);
    const artifacts = report.artifacts.filter(row => row.fixture === fixture);
    assert.equal(packets.length, 1, `Missing or duplicate ${fixture} packet declaration`);
    assert.equal(artifacts.length, 1, `Missing or duplicate ${fixture} artifact`);
    assert.deepEqual(packets[0].documents, UT_PCRA_COMPONENTS,
      `${fixture} packet document declaration changed`);
    const artifact = artifacts[0];
    assert.equal(artifact.file, packets[0].file);
    assert.equal(artifact.pageCount, 12);
    assert.equal(hashFile(artifact.file), artifact.sha256, `${fixture} PDF digest changed`);
    assert.equal(byteLengthFile(artifact.file), artifact.byteLength,
      `${fixture} PDF byte length changed`);
    assert.equal(artifact.pageManifest.length, 12);
    for (let page = 1; page <= 10; page++) {
      assert.deepEqual(artifact.pageManifest[page - 1], {
        packetPage: page, formNumber: "UT-RULE-65C-PCRA", sourcePage: page,
        sourceSha256: UT_PCRA_SOURCE_SHA256,
      }, `${fixture} official-page binding ${page} changed`);
    }
    for (let page = 11; page <= 12; page++) {
      assert.deepEqual(artifact.pageManifest[page - 1], {
        packetPage: page, formNumber: "UT-PCRA-ATTACHMENTS-A-B",
        generatedFrom: UT_PCRA_DECISION_ID,
      }, `${fixture} attachment-page binding ${page} changed`);
    }
  }
}

function loadEvidence(root) {
  const bytes = relative => fs.readFileSync(path.join(root, relative));
  const json = relative => JSON.parse(bytes(relative));
  const hashFile = relative => crypto.createHash("sha256").update(bytes(relative)).digest("hex");
  const byteLengthFile = relative => fs.statSync(path.join(root, relative)).size;
  assert.equal(hashFile(UT_PCRA_DECISION), UT_PCRA_DECISION_SHA256, "PCRA final decision bytes changed");
  assert.equal(hashFile(UT_PCRA_IMPLEMENTATION), UT_PCRA_IMPLEMENTATION_SHA256,
    "PCRA implementation record bytes changed");
  const decisions = json(UT_PCRA_DECISION);
  const decision = decisions.decisions.find(row => row.decisionId === UT_PCRA_DECISION_ID);
  assert.equal(decision?.disposition, "LEGAL_CLEAR");
  assert.deepEqual(decision.familyIds, [UT_PCRA_FAMILY]);
  assert.match(decision.bindingProductRule, /Rule 65C PCRA petition/);
  const evidence = {
    manifest: json(`${UT_PCRA_DIRECTORY}/packet-set-manifest.json`),
    report: json(`${UT_PCRA_DIRECTORY}/reports/rendered-artifacts.json`),
    receipt: json(`${UT_PCRA_DIRECTORY}/source-receipt.json`),
    hashFile, byteLengthFile,
  };
  assertUtPcraDeclaredEvidence(evidence);
  return evidence;
}

// This exact-family normalizer preserves the route's existing authority and
// source obligations while naming the two documents the built packet carries.
export function normalizeDeclaredUtPcraBuildInputs(root, input) {
  if (input.familyId !== UT_PCRA_FAMILY) return input;
  assert.equal(input.legalResolution?.disposition, "LEGAL_CLEAR");
  assert.equal(input.legalResolution?.decisionId, UT_PCRA_DECISION_ID);
  assert.equal(input.legalResolution?.decisionRecord, UT_PCRA_DECISION);
  assert.equal(input.routes.length, 1);
  assert.equal(input.routes[0].routeKey, UT_PCRA_ROUTE);
  loadEvidence(root);
  const routes = input.routes.map(route => ({
    ...route,
    participantFacingInstrument: "generic Rule 65C PCRA petition plus Attachments A-B",
    currentOutputStrategy: "official_pdf_fill",
    requiredSourceIds: [...new Set([...(route.requiredSourceIds ?? []), ...UT_PCRA_ROUTE_COMPONENT_IDS])],
  }));
  return {...input, routes, implementationStrategy: "official_pdf_fill"};
}

// The report is the measurement. This binder changes only the declarative
// delivery fields and preserves current source, raster and review metadata.
export function bindDeclaredUtPcraDelivery(record, family, evidence) {
  if (family.familyId !== UT_PCRA_FAMILY) return record;
  assert.equal(family.directory, UT_PCRA_DIRECTORY);
  assert.equal(record.familyId ?? record.family, UT_PCRA_FAMILY);
  assert.equal(record.binding.family, UT_PCRA_FAMILY);
  assert.equal(record.binding.jurisdiction, "UT");
  for (const [value, label] of [[family.routeKeys, "queue family"], [record.routeKeys, "wiring"],
    [record.binding.routeKeys, "binding"]]) assertExactRoute(value, label);
  assert.equal(record.binding.deliveryType, "official_pdf_fill");
  assert.equal(record.binding.sourceVersion.length, 1);
  assert.equal(record.binding.sourceVersion[0].sourceId, UT_PCRA_SOURCE_ID);
  assert.equal(record.binding.sourceVersion[0].sha256, UT_PCRA_SOURCE_SHA256);
  assertNoDeliveryAuthority(record);
  assertUtPcraDeclaredEvidence(evidence);

  const result = structuredClone(record);
  result.binding.deliveryType = "official_pdf_fill";
  result.binding.instrumentKinds = ["generic Rule 65C PCRA petition", "Attachments A-B"];
  result.binding.packetComponents = [...UT_PCRA_COMPONENTS];
  result.binding.packetComponentsProvenance =
    `${UT_PCRA_DIRECTORY}/packet-set-manifest.json and reports/rendered-artifacts.json; `
    + "the report binds pages 1-10 to the held Rule 65C source and pages 11-12 to the two incorporated attachments";
  return result;
}

export function utPcraEvidenceFromRepository(root) {
  return loadEvidence(root);
}
