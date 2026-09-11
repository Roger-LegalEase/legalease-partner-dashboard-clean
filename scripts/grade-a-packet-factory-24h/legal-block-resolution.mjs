import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const LEGAL_BLOCK_RESOLUTION_PATHS = Object.freeze([
  "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json",
  "data/rcap-grade-a/legal-decisions/KY_COMPANION_CHARGES_RESOLUTION_2026-09-11.json",
]);
export const LEGAL_BLOCK_SUPERSESSION_PATHS = Object.freeze([
  "data/rcap-grade-a/legal-decisions/OWNER_KJC_PERMISSION_ATTESTATION_2026-09-11.json",
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const strings = (value, label, { allowEmpty = false } = {}) => {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  if (!allowEmpty) assert.ok(value.length > 0, `${label} must not be empty`);
  for (const item of value) assert.ok(typeof item === "string" && item.trim(), `${label} contains a blank/non-string identity`);
  assert.equal(new Set(value).size, value.length, `${label} contains a duplicate identity`);
  return value;
};
const sorted = (values) => [...values].sort();

/**
 * Validate and merge the explicitly named additive legal-disposition records.
 * A family may occur once across the whole set. Even a duplicate with the same
 * disposition is refused because it leaves two rules competing for authority.
 */
export function mergeLegalBlockResolutionRecords(records) {
  assert.ok(Array.isArray(records) && records.length > 0, "legal resolution records must be a nonempty array");
  const recordPaths = strings(records.map((record) => record.path), "legal resolution record paths");
  const byFamily = new Map();
  const decisionIds = new Set();
  const normalizedRecords = [];

  for (const { path: recordPath, document, bytes = null } of records) {
    assert.ok(document && typeof document === "object" && !Array.isArray(document), `${recordPath}: record must be an object`);
    assert.equal(document.schemaVersion, "rcap-grade-a-legal-block-resolution/v1", `${recordPath}: unsupported schemaVersion`);
    assert.ok(typeof document.producedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(document.producedOn), `${recordPath}: producedOn must be YYYY-MM-DD`);
    assert.ok(typeof document.producedBy === "string" && document.producedBy.trim(), `${recordPath}: producedBy is required`);
    assert.ok(typeof document.scope === "string" && document.scope.trim(), `${recordPath}: scope is required`);
    assert.ok(document.stateSemantics && typeof document.stateSemantics === "object", `${recordPath}: stateSemantics is required`);

    const decisions = document.decisions;
    assert.ok(Array.isArray(decisions) && decisions.length > 0, `${recordPath}: decisions must be nonempty`);
    const listedClear = strings(document.legalClearFamilyIds, `${recordPath}: legalClearFamilyIds`, { allowEmpty: true });
    const listedHold = strings(document.legalHoldFamilyIds, `${recordPath}: legalHoldFamilyIds`, { allowEmpty: true });
    const overlap = listedClear.filter((familyId) => new Set(listedHold).has(familyId));
    assert.deepEqual(overlap, [], `${recordPath}: clear/hold lists overlap`);
    const decided = { LEGAL_CLEAR: [], LEGAL_HOLD: [] };

    for (const decision of decisions) {
      assert.ok(decision && typeof decision === "object" && !Array.isArray(decision), `${recordPath}: decision must be an object`);
      assert.ok(typeof decision.decisionId === "string" && decision.decisionId.trim(), `${recordPath}: decisionId is required`);
      assert.ok(!decisionIds.has(decision.decisionId), `${recordPath}: duplicate decisionId ${decision.decisionId}`);
      decisionIds.add(decision.decisionId);
      assert.ok(["LEGAL_CLEAR", "LEGAL_HOLD"].includes(decision.disposition), `${recordPath}/${decision.decisionId}: invalid disposition`);
      assert.ok(typeof document.stateSemantics[decision.disposition] === "string"
        && document.stateSemantics[decision.disposition].trim(), `${recordPath}/${decision.decisionId}: missing state semantic`);
      assert.ok(typeof decision.bindingProductRule === "string" && decision.bindingProductRule.trim(), `${recordPath}/${decision.decisionId}: bindingProductRule is required`);
      assert.ok(typeof decision.authority === "string" && decision.authority.trim(), `${recordPath}/${decision.decisionId}: authority is required`);
      if (decision.disposition === "LEGAL_HOLD") {
        assert.ok(typeof decision.liftCondition === "string" && decision.liftCondition.trim(), `${recordPath}/${decision.decisionId}: liftCondition is required for a hold`);
      }
      const familyIds = strings(decision.familyIds, `${recordPath}/${decision.decisionId}: familyIds`);
      for (const familyId of familyIds) {
        assert.ok(!byFamily.has(familyId), `${recordPath}: conflicting or duplicate family decision for ${familyId}`);
        decided[decision.disposition].push(familyId);
        byFamily.set(familyId, Object.freeze({
          familyId,
          disposition: decision.disposition,
          decisionId: decision.decisionId,
          bindingProductRule: decision.bindingProductRule,
          authority: decision.authority,
          liftCondition: decision.liftCondition ?? null,
          producedOn: document.producedOn,
          decisionRecord: recordPath,
        }));
      }
    }
    assert.deepEqual(sorted(decided.LEGAL_CLEAR), sorted(listedClear), `${recordPath}: LEGAL_CLEAR decisions do not equal legalClearFamilyIds`);
    assert.deepEqual(sorted(decided.LEGAL_HOLD), sorted(listedHold), `${recordPath}: LEGAL_HOLD decisions do not equal legalHoldFamilyIds`);
    if (document.result) {
      assert.equal(document.result.decisionPackets, decisions.length, `${recordPath}: decisionPackets count drifted`);
      assert.equal(document.result.legalClearDecisionPackets, decisions.filter((row) => row.disposition === "LEGAL_CLEAR").length, `${recordPath}: legalClearDecisionPackets count drifted`);
      assert.equal(document.result.legalHoldDecisionPackets, decisions.filter((row) => row.disposition === "LEGAL_HOLD").length, `${recordPath}: legalHoldDecisionPackets count drifted`);
      assert.equal(document.result.families, listedClear.length + listedHold.length, `${recordPath}: family count drifted`);
      assert.equal(document.result.legalClearFamilies, listedClear.length, `${recordPath}: legalClearFamilies count drifted`);
      assert.equal(document.result.legalHoldFamilies, listedHold.length, `${recordPath}: legalHoldFamilies count drifted`);
    }
    const recordBytes = bytes ?? Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
    normalizedRecords.push(Object.freeze({
      path: recordPath,
      sha256: sha256(recordBytes),
      legalClearFamilies: listedClear.length,
      legalHoldFamilies: listedHold.length,
      decisionPackets: decisions.length,
    }));
  }

  const clearFamilyIds = sorted([...byFamily.values()].filter((row) => row.disposition === "LEGAL_CLEAR").map((row) => row.familyId));
  const holdFamilyIds = sorted([...byFamily.values()].filter((row) => row.disposition === "LEGAL_HOLD").map((row) => row.familyId));
  assert.deepEqual(clearFamilyIds.filter((familyId) => new Set(holdFamilyIds).has(familyId)), [], "merged clear/hold families overlap");
  return Object.freeze({ recordPaths, records: Object.freeze(normalizedRecords), byFamily, clearFamilyIds, holdFamilyIds });
}

export function applyLegalResolutionSupersessions(resolutions, attestations) {
  assert.ok(resolutions?.byFamily instanceof Map, "validated base legal resolutions are required");
  assert.ok(Array.isArray(attestations), "legal resolution supersessions must be an array");
  const byFamily = new Map(resolutions.byFamily);
  const seenSupersessions = new Set();
  const records = [...resolutions.records];

  for (const { path: recordPath, document, bytes = null } of attestations) {
    assert.ok(typeof recordPath === "string" && recordPath.trim(), "attestation path is required");
    assert.ok(!seenSupersessions.has(document?.supersedesDecisionId), `${recordPath}: duplicate supersession of ${document?.supersedesDecisionId}`);
    assert.equal(document?.schemaVersion, "rcap-grade-a-owner-permission-attestation/v1", `${recordPath}: unsupported attestation schemaVersion`);
    assert.ok(typeof document.producedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(document.producedOn), `${recordPath}: producedOn must be YYYY-MM-DD`);
    assert.ok(typeof document.owner === "string" && document.owner.trim(), `${recordPath}: owner is required`);
    assert.ok(typeof document.ownerStatement === "string" && document.ownerStatement.trim(), `${recordPath}: ownerStatement is required`);
    assert.equal(document.evidenceType, "owner_attestation", `${recordPath}: evidenceType must truthfully remain owner_attestation`);
    assert.equal(document.documentaryPermissionStoredInRepository, false, `${recordPath}: may not claim documentary permission is stored`);
    assert.ok(typeof document.scope === "string" && document.scope.trim(), `${recordPath}: scope is required`);
    assert.ok(typeof document.supersedesDecisionId === "string" && document.supersedesDecisionId.trim(), `${recordPath}: supersedesDecisionId is required`);
    assert.equal(document.dispositionOverride, "LEGAL_CLEAR", `${recordPath}: only an explicit LEGAL_CLEAR override is supported`);
    assert.ok(typeof document.bindingProductRule === "string" && document.bindingProductRule.trim(), `${recordPath}: bindingProductRule is required`);
    const familyIds = strings(document.familyIds, `${recordPath}: familyIds`);
    const held = [...resolutions.byFamily.values()].filter((row) => row.decisionId === document.supersedesDecisionId);
    assert.ok(held.length > 0, `${recordPath}: supersedesDecisionId does not name a base decision`);
    assert.ok(held.every((row) => row.disposition === "LEGAL_HOLD"), `${recordPath}: superseded decision is not a legal hold`);
    assert.deepEqual(sorted(familyIds), sorted(held.map((row) => row.familyId)), `${recordPath}: attested family scope does not exactly equal the superseded hold`);
    assert.equal(document.stateEffect?.legalClearFamilies, familyIds.length, `${recordPath}: stateEffect legalClearFamilies count drifted`);
    assert.equal(document.stateEffect?.legalHoldFamiliesRemainingFromLEGAL_BLOCKED_RESOLUTION_2026_09_11, 0, `${recordPath}: stateEffect must leave zero families on the superseded hold`);
    assert.equal(document.stateEffect?.productionTerminalGranted, false, `${recordPath}: attestation may not grant production-terminal state`);
    seenSupersessions.add(document.supersedesDecisionId);
    for (const familyId of familyIds) {
      const prior = byFamily.get(familyId);
      assert.equal(prior?.decisionId, document.supersedesDecisionId, `${recordPath}: ${familyId} is outside the superseded decision`);
      byFamily.set(familyId, Object.freeze({
        ...prior,
        disposition: "LEGAL_CLEAR",
        decisionId: `${document.supersedesDecisionId}:OWNER_ATTESTATION_RELEASE`,
        bindingProductRule: document.bindingProductRule,
        producedOn: document.producedOn,
        decisionRecord: recordPath,
        decisionRecords: Object.freeze([prior.decisionRecord, recordPath]),
        supersedesDecisionId: document.supersedesDecisionId,
        supersededDecisionRecord: prior.decisionRecord,
        supersededBindingProductRule: prior.bindingProductRule,
        supersededLiftCondition: prior.liftCondition,
        liftCondition: null,
        evidenceType: document.evidenceType,
        documentaryPermissionStoredInRepository: false,
        owner: document.owner,
        ownerStatement: document.ownerStatement,
      }));
    }
    const recordBytes = bytes ?? Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
    records.push(Object.freeze({
      path: recordPath,
      sha256: sha256(recordBytes),
      evidenceType: document.evidenceType,
      documentaryPermissionStoredInRepository: false,
      supersedesDecisionId: document.supersedesDecisionId,
      legalClearFamilies: familyIds.length,
      legalHoldFamilies: 0,
    }));
  }
  const clearFamilyIds = sorted([...byFamily.values()].filter((row) => row.disposition === "LEGAL_CLEAR").map((row) => row.familyId));
  const holdFamilyIds = sorted([...byFamily.values()].filter((row) => row.disposition === "LEGAL_HOLD").map((row) => row.familyId));
  return Object.freeze({
    recordPaths: Object.freeze([...resolutions.recordPaths, ...attestations.map((row) => row.path)]),
    records: Object.freeze(records), byFamily, clearFamilyIds, holdFamilyIds,
  });
}

export function loadLegalBlockResolutions(root, {
  resolutionPaths = LEGAL_BLOCK_RESOLUTION_PATHS,
  supersessionPaths = LEGAL_BLOCK_SUPERSESSION_PATHS,
} = {}) {
  const base = mergeLegalBlockResolutionRecords(resolutionPaths.map((recordPath) => {
    const bytes = fs.readFileSync(path.join(root, recordPath));
    return { path: recordPath, bytes, document: JSON.parse(bytes.toString("utf8")) };
  }));
  return applyLegalResolutionSupersessions(base, supersessionPaths.map((recordPath) => {
    const bytes = fs.readFileSync(path.join(root, recordPath));
    return { path: recordPath, bytes, document: JSON.parse(bytes.toString("utf8")) };
  }));
}

/** A decision-aware independent read must have seen these exact record bytes. */
export function assessLegalResolutionAtReviewBase(root, verifiedAtBase, resolution) {
  const recordPaths = resolution?.decisionRecords ?? (resolution?.decisionRecord ? [resolution.decisionRecord] : []);
  const result = { verifiedAtBase: verifiedAtBase ?? null, decisionRecord: resolution?.decisionRecord ?? null,
    decisionRecords: recordPaths, available: false, reason: null };
  if (!resolution || recordPaths.length === 0) return { ...result, reason: "no authoritative family resolution" };
  if (typeof verifiedAtBase !== "string" || !/^[0-9a-f]{7,40}$/.test(verifiedAtBase)) {
    return { ...result, reason: "independent verdict declares no commit-shaped verifiedAtBase" };
  }
  const bindings = [];
  for (const recordPath of recordPaths) {
    const current = fs.readFileSync(path.join(root, recordPath));
    let reviewed;
    try {
      reviewed = execFileSync("git", ["show", `${verifiedAtBase}:${recordPath}`], {
        cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26,
      });
    } catch {
      return { ...result, recordBindings: [...bindings, { path: recordPath, currentSha256: sha256(current), matches: false }],
        reason: `${recordPath} was unavailable at verifiedAtBase` };
    }
    const binding = { path: recordPath, currentSha256: sha256(current), reviewedSha256: sha256(reviewed), matches: reviewed.equals(current) };
    bindings.push(binding);
    if (!binding.matches) return { ...result, recordBindings: bindings,
      reason: `${recordPath} bytes at verifiedAtBase differ from the authoritative current record` };
  }
  return { ...result, recordBindings: bindings, available: true,
    reason: "exact authoritative decision record bytes were available to the independent review" };
}
