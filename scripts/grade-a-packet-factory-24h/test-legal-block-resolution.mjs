#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEGAL_BLOCK_RESOLUTION_PATHS,
  LEGAL_BLOCK_SUPERSESSION_PATHS,
  applyLegalResolutionSupersessions,
  assessLegalResolutionAtReviewBase,
  loadLegalBlockResolutions,
  sourcePermissionHoldResolved,
  mergeLegalBlockResolutionRecords
} from "./legal-block-resolution.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MASTER = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const ACTIVE = "data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json";
const LEDGER = "data/rcap-grade-a/packet-factory-24h/claim-ledger.json";
const read = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const originalAtHead = (relative) => JSON.parse(execFileSync("git", ["show", `HEAD:${relative}`], {
  cwd: ROOT, maxBuffer: 1 << 27
}));
const docs = LEGAL_BLOCK_RESOLUTION_PATHS.map((recordPath) => ({ path: recordPath, document: read(recordPath) }));
const attestations = LEGAL_BLOCK_SUPERSESSION_PATHS.map((recordPath) => ({ path: recordPath, document: read(recordPath) }));
const baseResolutions = mergeLegalBlockResolutionRecords(docs);
const resolutions = loadLegalBlockResolutions(ROOT);

assert.equal(baseResolutions.records.length, 7);
assert.deepEqual(baseResolutions.records.map((row) => [row.legalClearFamilies, row.legalHoldFamilies]), [[29, 6], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]]);
assert.equal(baseResolutions.clearFamilyIds.length, 35);
assert.equal(baseResolutions.holdFamilyIds.length, 6);
assert.equal(resolutions.records.length, 8);
assert.equal(resolutions.clearFamilyIds.length, 41);
assert.equal(resolutions.holdFamilyIds.length, 0);
assert.equal(resolutions.byFamily.size, 41);
assert.equal(new Set([...resolutions.clearFamilyIds, ...resolutions.holdFamilyIds]).size, 41);

const nh = docs.find(r => r.path.endsWith("NH_STREAMLINED_OWNER_ADOPTION_2026-09-12.json")).document;
assert.deepEqual(nh.legalClearFamilyIds, ["nh_conviction_streamlined-set"]);
assert.equal(nh.provenance.owner, "Roger Roman");
assert.equal(nh.provenance.ownerAdoption, true);
for (const key of ["counselApproval", "courtRuling", "packetPass", "productionAuthorization"]) assert.equal(nh.provenance[key], false);
assert.equal(nh.decisions[0].adoptedRevisions.length, 5);
assert.equal(assessLegalResolutionAtReviewBase(ROOT, "7abe0badf93e02c1bce940ca6cd86739016b2b57", resolutions.byFamily.get("nh_conviction_streamlined-set")).available, false, "original draft commit is not adopted candidate acceptance");

const kyService = docs.find(r => r.path.endsWith("KY_PROTECTIVE_ORDER_SERVICE_OWNER_ADOPTION_2026-09-12.json")).document;
assert.deepEqual(kyService.legalClearFamilyIds, ["ky_protective_order_record_expungement-set"]);
assert.equal(kyService.provenance.owner, "Roger Roman");
assert.equal(kyService.provenance.ownerAdoption, true);
for (const key of ["counselApproval", "courtRuling", "packetPass", "terminalPromotion", "productionAuthorization"]) assert.equal(kyService.provenance[key], false);
const kyScope = kyService.provenance.governingMemoReconciliation;
assert.equal(kyScope.trackId, "ky_protective_order_record_expungement");
assert.deepEqual(kyScope.effectiveFieldReplacements.map(r => r.field), ["components[role=service_instructions].notes", "manualCompletionItems[1].whereInPacket"]);
assert.deepEqual(kyScope.requiredComponentPreserved, {role:"service_instructions", requirement:"required", outputStrategy:"process_guidance"});
assert.match(kyService.decisions[0].bindingProductRule, /CR 5\.03 where applicable/);
assert.match(kyService.decisions[0].bindingProductRule, /No proof obligation is waived/);
assert.equal(read(kyService.provenance.draft.path).status, "RESEARCH_DRAFT_NOT_ADOPTED");
assert.equal(assessLegalResolutionAtReviewBase(ROOT, kyService.provenance.draftCommit, resolutions.byFamily.get("ky_protective_order_record_expungement-set")).available, false, "original research draft commit is not owner adoption or packet acceptance");

const arVeterans = docs.find(r => r.path.endsWith("AR_VETERANS_OWNER_PRODUCT_ADOPTION_2026-09-13.json")).document;
const arResolution = resolutions.byFamily.get("ar-veterans-court-set");
assert.deepEqual(arVeterans.legalClearFamilyIds, ["ar-veterans-court-set"]);
assert.deepEqual(arVeterans.legalHoldFamilyIds, []);
assert.equal(arVeterans.scope, "ar-veterans-court-set only; bounded pre-adjudication held-form implementation and conditional supported handoffs");
assert.equal(arVeterans.provenance.owner, "Roger Roman");
assert.equal(arVeterans.provenance.ownerAdoption, true);
for (const key of ["counselApproval", "courtRuling", "packetPass", "terminalPromotion", "productionAuthorization"]) assert.equal(arVeterans.provenance[key], false);
assert.match(arVeterans.stateSemantics.LEGAL_CLEAR, /No counsel\/packet\/production grant/);
assert.equal(arVeterans.decisions.length, 1);
assert.equal(arVeterans.decisions[0].decisionId, "AR-VETERANS-OWNER-PRODUCT-ADOPTION-20260913");
assert.equal(arVeterans.decisions[0].disposition, "LEGAL_CLEAR");
assert.deepEqual(arVeterans.decisions[0].familyIds, ["ar-veterans-court-set"]);
assert.deepEqual(arVeterans.decisions[0].adoptedRevisions.map((revision) => revision.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepEqual(arVeterans.decisions[0].adoptedRevisions.map((revision) => revision.id), [
  "CURRENT_GOVERNING_LAW",
  "PRE_ADJUDICATION_SCOPE",
  "COMPLETION_AND_JUDICIAL_FINDINGS",
  "CROSS_COURT_RELIEF",
  "TIMING_PRIOR_FELONIES_DWI_BWI",
  "SERVICE_OBJECTION_DISTRIBUTION",
  "FILING_FEE",
  "PROGRAM_EVIDENCE",
  "SOURCE_AND_PROTECTED_FIELDS",
  "ACCEPTANCE_CONTROLS"
]);
assert.equal(arVeterans.provenance.draftRemainsHistoricalUnadoptedDocument, true);
assert.equal(arVeterans.provenance.adoptedRevisionsControlDraft, true);
const arDraft = read(arVeterans.provenance.draft.path);
assert.equal(arDraft.status, "NOT_ADOPTED");
assert.equal(arDraft.familyId, "ar-veterans-court-set");
assert.equal(assessLegalResolutionAtReviewBase(ROOT, arDraft.reviewedAtBase, arResolution).available, false,
  "the additive AR owner record was unavailable at the historical draft review base");

const wvAcquittal = docs.find(r => r.path.endsWith("WV_ACQUITTAL_DISMISSAL_OWNER_ADOPTION_2026-09-13.json")).document;
const wvResolution = resolutions.byFamily.get("wv_nc_acquittal_dismissal-set");
assert.deepEqual(wvAcquittal.legalClearFamilyIds, ["wv_nc_acquittal_dismissal-set"]);
assert.deepEqual(wvAcquittal.legalHoldFamilyIds, []);
assert.equal(wvAcquittal.scope, "wv_nc_acquittal_dismissal-set: disposition-specific two-branch implementation under existing §61-11-25; no coverage reduction");
assert.equal(wvAcquittal.provenance.owner, "Roger Roman");
assert.equal(wvAcquittal.provenance.ownerAdoption, true);
for (const key of ["counselApproval", "courtRuling", "packetPass", "terminalPromotion", "productionAuthorization", "commercialAuthority"]) assert.equal(wvAcquittal.provenance[key], false);
assert.match(wvAcquittal.stateSemantics.LEGAL_CLEAR, /Does not grant counsel\/packet\/raster\/terminal\/commercial\/production approval/);
assert.equal(wvAcquittal.decisions.length, 1);
assert.equal(wvAcquittal.decisions[0].decisionId, "WV-ACQUITTAL-DISMISSAL-TWO-BRANCH-OWNER-ADOPTION-20260913");
assert.equal(wvAcquittal.decisions[0].disposition, "LEGAL_CLEAR");
assert.deepEqual(wvAcquittal.decisions[0].familyIds, ["wv_nc_acquittal_dismissal-set"]);
assert.deepEqual(wvAcquittal.decisions[0].adoptedRevisions.map((revision) => revision.number), [1, 2, 3, 4, 5, 6]);
assert.deepEqual(wvAcquittal.decisions[0].adoptedRevisions.map((revision) => revision.id), [
  "DISMISSAL_BRANCH",
  "ACQUITTAL_BRANCH",
  "SHARED_ROUTE_RULES",
  "ROUTING",
  "SOURCE_GOVERNANCE_CORRECTIONS",
  "ACCEPTANCE"
]);
assert.match(wvAcquittal.decisions[0].adoptedRevisions.find((revision) => revision.id === "ACQUITTAL_BRANCH").adoptedText, /certified acquittal order/);
assert.equal(wvAcquittal.provenance.historicalMeasuredFindingPreserved, true);
const historicalFinding = fs.readFileSync(path.join(ROOT, wvAcquittal.provenance.measuredIssue.path), "utf8");
assert.match(historicalFinding, /Status:\*\* open, for Roger/);
assert.match(historicalFinding, /Grants nothing/);
assert.equal(wvResolution.familyId, "wv_nc_acquittal_dismissal-set");
assert.equal(wvResolution.disposition, "LEGAL_CLEAR");

const permissionFamily = "ks-22-2410-arrest-set";
const permissionRecord = {disposition:"PRODUCT_PATH_PENDING", permissionHold:"Kansas Judicial Council noncommercial-use and republication restriction", productQuestion:null, unresolvedObligations:[]};
const permissionResolution = resolutions.byFamily.get(permissionFamily);
assert.equal(sourcePermissionHoldResolved(permissionFamily,permissionRecord,permissionResolution),true);
const nativePermissionRecord = read("data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json").reconciliation42.families.find(r => r.familyId === permissionFamily);
assert.equal(sourcePermissionHoldResolved(permissionFamily,nativePermissionRecord,permissionResolution),true);
for (const other of [{productQuestion:"unresolved delivery"},{unresolvedObligations:["source absent"]},{permissionHold:"another restriction"}])
  assert.equal(sourcePermissionHoldResolved(permissionFamily,{...permissionRecord,...other},permissionResolution),false);
for (const other of [null,{...permissionResolution,familyId:"another-family"},{...permissionResolution,disposition:"LEGAL_HOLD"},{...permissionResolution,evidenceType:"research_draft"},{...permissionResolution,decisionRecord:"unadopted.json"}])
  assert.equal(sourcePermissionHoldResolved(permissionFamily,permissionRecord,other),false);

const mustRefuse = (name, mutate, match) => {
  const copy = structuredClone(docs);
  mutate(copy);
  assert.throws(() => mergeLegalBlockResolutionRecords(copy), match, name);
};
mustRefuse("unknown schema", (copy) => { copy[0].document.schemaVersion = "unknown"; }, /unsupported schemaVersion/);
mustRefuse("duplicate decision id", (copy) => {
  copy[1].document.decisions[0].decisionId = copy[0].document.decisions[0].decisionId;
}, /duplicate decisionId/);
mustRefuse("conflicting duplicate family", (copy) => {
  const familyId = copy[0].document.legalClearFamilyIds[0];
  copy[1].document.decisions[0].familyIds = [familyId];
  copy[1].document.legalClearFamilyIds = [familyId];
}, /conflicting or duplicate family decision/);
mustRefuse("summary not backed by decisions", (copy) => {
  copy[1].document.legalClearFamilyIds = ["not-the-decided-family"];
}, /decisions do not equal legalClearFamilyIds/);
mustRefuse("clear and hold overlap", (copy) => {
  copy[0].document.legalHoldFamilyIds.push(copy[0].document.legalClearFamilyIds[0]);
}, /clear\/hold lists overlap/);

const exactSupersession = applyLegalResolutionSupersessions(baseResolutions, attestations);
assert.equal(exactSupersession.clearFamilyIds.length, 41);
assert.equal(exactSupersession.holdFamilyIds.length, 0);
for (const familyId of baseResolutions.holdFamilyIds) {
  const effective = exactSupersession.byFamily.get(familyId);
  assert.equal(effective.disposition, "LEGAL_CLEAR");
  assert.equal(effective.evidenceType, "owner_attestation");
  assert.equal(effective.documentaryPermissionStoredInRepository, false);
  assert.equal(effective.supersedesDecisionId, "KS-KJC-COMMERCIAL-REDISTRIBUTION");
}
const mustRefuseAttestation = (name, mutate, match) => {
  const copy = structuredClone(attestations);
  mutate(copy);
  assert.throws(() => applyLegalResolutionSupersessions(baseResolutions, copy), match, name);
};
mustRefuseAttestation("mismatched attestation family scope", (copy) => {
  copy[0].document.familyIds.pop();
  copy[0].document.stateEffect.legalClearFamilies -= 1;
}, /family scope does not exactly equal/);
mustRefuseAttestation("unknown superseded decision", (copy) => {
  copy[0].document.supersedesDecisionId = "NOT-THE-KJC-DECISION";
}, /does not name a base decision/);
mustRefuseAttestation("documentary permission claim", (copy) => {
  copy[0].document.documentaryPermissionStoredInRepository = true;
}, /may not claim documentary permission is stored/);

const packingFixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-claim-packing-"));
try {
  const generatedPath = path.join(packingFixtureDir, "generated.json");
  const priorPath = path.join(packingFixtureDir, "prior.json");
  const baseClaim = {
    subjectType: "packet-family",
    subjectId: "de_pardon_expungement-set",
    operation: "independent-verification",
    laneKind: "independent-verification"
  };
  const runPacking = (generated, prior) => {
    fs.writeFileSync(generatedPath, JSON.stringify({ claims: generated }));
    fs.writeFileSync(priorPath, JSON.stringify({ claims: prior }));
    return JSON.parse(execFileSync(process.execPath, [
      path.join(ROOT, "scripts/grade-a-packet-factory-24h/generate.mjs"),
      "--check-prior-claim-packing", generatedPath, priorPath
    ], { cwd: ROOT, encoding: "utf8" }));
  };

  const released = runPacking(
    [{ ...baseClaim, lane: "VF02", released: false }],
    [{ ...baseClaim, lane: "VF20", released: true, releasedAt: "2026-09-10T11:23:23.183Z" }]
  );
  assert.equal(released.claims.length, 1);
  assert.equal(released.claims[0].lane, "VF02", "released external history must follow current packing");
  assert.equal(released.claims[0].released, true);
  assert.equal(released.claims[0].releasedAt, "2026-09-10T11:23:23.183Z");
  assert.equal(released.carriedReleases, 1);

  const live = runPacking(
    [{ ...baseClaim, lane: "VF02", released: false }],
    [{ ...baseClaim, lane: "VF20", released: false }]
  );
  assert.equal(live.claims.length, 1);
  assert.equal(live.claims[0].lane, "VF20", "live external ownership must remain pinned");
  assert.equal(live.claims[0].released, false);

  const historicalOnly = runPacking([], [
    { ...baseClaim, lane: "VF20", released: true, releasedAt: "2026-09-10T11:23:23.183Z" }
  ]);
  assert.equal(historicalOnly.claims.length, 1, "released identity absent from current dispatch must remain as history");
  assert.equal(historicalOnly.claims[0].lane, "VF20");
} finally {
  fs.rmSync(packingFixtureDir, { recursive: true, force: true });
}

const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
for (const resolution of baseResolutions.byFamily.values()) assert.equal(
  assessLegalResolutionAtReviewBase(ROOT, head, resolution).available, true,
  `${resolution.familyId}: HEAD must contain the exact base decision bytes`);
const kansasResolution = resolutions.byFamily.get("ks-21-6614-conviction-set");
const attestationCommit = "9d4f81270";
assert.equal(assessLegalResolutionAtReviewBase(ROOT, attestationCommit, kansasResolution).available, true,
  "the owner-attestation commit must contain both exact decision records");
const beforeAttestation = execFileSync("git", ["rev-parse", `${attestationCommit}^`], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(assessLegalResolutionAtReviewBase(ROOT, beforeAttestation, kansasResolution).available, false,
  "a review base before the attestation must not authorize Kansas admission");
const kyResolution = resolutions.byFamily.get("ky_misdemeanor_expungement-set");
const kyAddedAt = execFileSync("git", ["log", "--diff-filter=A", "-1", "--format=%H", "--", kyResolution.decisionRecord], {
  cwd: ROOT, encoding: "utf8"
}).trim();
const beforeKyRecord = execFileSync("git", ["rev-parse", `${kyAddedAt}^`], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(assessLegalResolutionAtReviewBase(ROOT, beforeKyRecord, kyResolution).available, false,
  "a review base before the additive record must not authorize admission");

if (process.argv.includes("--generated")) {
  const before = originalAtHead(MASTER);
  const after = read(MASTER);
  const active = read(ACTIVE);
  const ledger = read(LEDGER);
  const beforeById = new Map(before.families.map((row) => [row.familyId, row]));
  const afterById = new Map(after.families.map((row) => [row.familyId, row]));
  const inScope = new Set(resolutions.byFamily.keys());
  const packetAdmissionStates = new Set([
    "PASS_COMPLETE", "VERIFIED_PASS", "LEGAL_REVIEW_READY", "LEGAL_APPROVED", "COMPLETE_PACKET_PROVEN"
  ]);

  for (const [familyId, resolution] of resolutions.byFamily) {
    const family = afterById.get(familyId);
    assert.ok(family, `${familyId}: missing generated family row`);
    assert.equal(family.currentLegalResolution.decisionId, resolution.decisionId);
    assert.equal(family.currentLegalResolution.bindingProductRule, resolution.bindingProductRule);
    assert.equal(family.currentLegalResolution.decisionRecord, resolution.decisionRecord);
    assert.ok(family.nextExecutableAction.includes(resolution.bindingProductRule));
    assert.ok(family.nextExecutableAction.includes(resolution.decisionRecord));
    for (const key of ["sourceStatus", "sourceReadiness", "sourceReconciliation", "sourceHashes",
      "rasterEnrolmentRefusal", "selectedIndependentVerdict", "ownerDeliveryTypeRefusal"]) {
      assert.deepEqual(family[key], beforeById.get(familyId)?.[key], `${familyId}: legal resolution changed nonlegal ${key}`);
    }
    if (resolution.disposition === "LEGAL_CLEAR") {
      assert.notEqual(family.state, "LEGAL_BLOCKED");
      assert.equal(family.legalInputStatus, "SETTLED");
      assert.equal(family.legalInputBasis, null);
      if (packetAdmissionStates.has(family.state)) {
        assert.equal(assessLegalResolutionAtReviewBase(ROOT,
          family.selectedIndependentVerdict?.verifiedAtBase, resolution).available, true,
        `${familyId}: admitted without decision-aware independent review`);
      }
    }
    if (resolution.evidenceType === "owner_attestation") {
      assert.equal(family.currentLegalResolution.evidenceType, "owner_attestation");
      assert.equal(family.currentLegalResolution.documentaryPermissionStoredInRepository, false);
      assert.equal(family.currentLegalResolution.supersedesDecisionId, "KS-KJC-COMMERCIAL-REDISTRIBUTION");
      assert.deepEqual(family.currentLegalResolution.decisionRecords, resolution.decisionRecords);
    }
  }

  const changedStatesOutsideScope = after.families.filter((family) =>
    !inScope.has(family.familyId) && beforeById.get(family.familyId)?.state !== family.state);
  assert.deepEqual(changedStatesOutsideScope, [], "an unaffected family changed state");
  const newlyAdmitted = after.families.filter((family) => inScope.has(family.familyId)
    && packetAdmissionStates.has(family.state)
    && !packetAdmissionStates.has(beforeById.get(family.familyId)?.state));
  assert.deepEqual(newlyAdmitted, [], "legal clearance alone created a packet-admission state");

  const southCarolina = afterById.get("rcap-sc-custom-pleading");
  assert.equal(southCarolina.state, "WRONG_DELIVERY_TYPE");
  assert.ok(southCarolina.ownerDeliveryTypeRefusal, "South Carolina owner product refusal was lost");
  assert.deepEqual(southCarolina.sourceReconciliation,
    beforeById.get(southCarolina.familyId).sourceReconciliation,
    "South Carolina's secondary source/custody issue was altered");

  const stateDelta = after.families.filter((family) =>
    beforeById.get(family.familyId)?.state !== family.state);
  assert.ok(stateDelta.every((family) => inScope.has(family.familyId)));
  assert.equal(active.assignments.length > 0, true);
  assert.equal(Array.isArray(ledger.claims), true);
  console.log(`LEGAL_BLOCK_RESOLUTION_GENERATED_OK: exact ${stateDelta.length}-family state delta; 0 unaffected changes; 0 sole-clear admissions; all 41 legally clear; SC source/product gates preserved`);
}

console.log("LEGAL_BLOCK_RESOLUTION_SCHEMA_OK: base 29+1+1+1+1+1+1 clear and 6 hold; exact owner-attestation supersession yields 41 clear; malformed/conflicting records refused; exact review-base byte ordering enforced; released VF20 repacks to VF02 while live VF20 stays pinned");
