// The decision-owner legal approval, read from the one register that already
// holds Roger's decisions: data/rcap-authorization-queue.json.
//
// This creates no approval and adds no approval system. It reads the queue, and
// it is deliberately narrow about what it will treat as an approval:
//
//   * kind must be owner_legal_decision — a deploy or route_enablement entry
//     never confers legal approval;
//   * decision must be exactly "approved";
//   * status must be one of the queue's own authorized statuses;
//   * scope is read literally. A family that is not named is not approved, and
//     nothing here widens a scope, infers one from a jurisdiction, or treats an
//     empty scope as universal.
//
// If no such entry exists the reader reports approved:false and every consumer
// falls back to owner_approval_pending. That is the fail-closed direction: the
// absence of a decision is never read as a decision.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUEUE_PATH = "data/rcap-authorization-queue.json";

const AUTHORIZED_STATUSES = new Set(["authorized", "authorized_scoped", "executed"]);

export const OWNER_APPROVED = "approved_by_decision_owner";
export const OWNER_PENDING = "owner_approval_pending";

const asSet = (value) => new Set(Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim() !== "") : []);

export function readOwnerLegalDecision(queueRelPath = QUEUE_PATH) {
  const abs = path.join(rootDir, queueRelPath);
  if (!fs.existsSync(abs)) {
    return { approved: false, reason: "no authorization queue in this tree", records: [] };
  }

  const queue = JSON.parse(fs.readFileSync(abs, "utf8"));
  const decisions = (queue.entries ?? []).filter(
    (entry) =>
      entry.kind === "owner_legal_decision" &&
      entry.decision === "approved" &&
      AUTHORIZED_STATUSES.has(entry.status)
  );

  if (decisions.length === 0) {
    return { approved: false, reason: "no approved owner_legal_decision entry in the authorization queue", records: [] };
  }

  const families = new Set();
  const jurisdictions = new Set();
  const legalActionPathwayKeys = new Set();
  const supersededFamilies = new Set();
  const annexJurisdictions = new Set();
  let annexApproved = false;

  for (const entry of decisions) {
    const scope = entry.decisionScope ?? {};
    for (const f of asSet(scope.completedOutputPacketFamilies)) families.add(f);
    for (const j of asSet(scope.familyJurisdictions)) jurisdictions.add(j);
    for (const k of asSet(scope.annexNamedLegalActionsRequired)) legalActionPathwayKeys.add(k);
    for (const f of asSet(scope.annexFamiliesWithSupersededTechnicalEvidence)) supersededFamilies.add(f);
    for (const j of asSet(scope.annexJurisdictionsOutsideStandingScope)) {
      annexJurisdictions.add(j);
      jurisdictions.add(j);
    }
    if (scope.exceptionAnnex === "complete_current_annex") annexApproved = true;
  }

  return {
    approved: true,
    result: OWNER_APPROVED,
    annexApproved,
    families,
    jurisdictions,
    legalActionPathwayKeys,
    supersededFamilies,
    annexJurisdictions,
    records: decisions.map((entry) => ({
      recordId: entry.id,
      decisionOwner: entry.decisionOwner,
      decision: entry.decision,
      legalApprovalResult: entry.legalApprovalResult,
      authority: entry.authority,
      effectiveDate: entry.effectiveDate,
      authorizedBy: entry.authorizedBy,
      authorizedAt: entry.authorizedAt,
      scopeStatement: entry.decisionScope?.statement ?? null,
      correctionsNotRequiringANewLegalDecision: entry.correctionsNotRequiringANewLegalDecision ?? [],
      requiresANewDecisionOwnerDecision: entry.requiresANewDecisionOwnerDecision ?? [],
      doesNotAuthorize: entry.doesNotAuthorize ?? []
    }))
  };
}

// A family's legal status under the decision. Named or not named; nothing in
// between, and no inference from the family's jurisdiction.
export function familyLegalStatus(decision, familyId) {
  if (!decision?.approved) return OWNER_PENDING;
  return decision.families.has(familyId) ? OWNER_APPROVED : OWNER_PENDING;
}

// A named legal action is approved only if the decision names that exact
// pathway key, or the decision adopts the complete current annex and the
// pathway key is in it.
export function legalActionStatus(decision, pathwayKey) {
  if (!decision?.approved) return OWNER_PENDING;
  return decision.legalActionPathwayKeys.has(pathwayKey) ? OWNER_APPROVED : OWNER_PENDING;
}

// A jurisdiction the standing counsel adoption never reached is approved only
// through the annex, and only if the decision adopted the complete annex.
export function annexJurisdictionStatus(decision, jurisdiction) {
  if (!decision?.approved || !decision.annexApproved) return OWNER_PENDING;
  return decision.annexJurisdictions.has(jurisdiction) ? OWNER_APPROVED : OWNER_PENDING;
}
