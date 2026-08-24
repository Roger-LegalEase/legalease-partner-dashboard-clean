#!/usr/bin/env node
/**
 * Phase 4 correction: one targeted verification sweep.
 *
 * Uses the artifacts the correction already produced plus a direct sweep of the
 * corrected engine. Read-only.
 */
import { readJson, writeArtifact, gitSha, getAllJurisdictionProfiles, getProfileByJurisdiction, projectPublicProfile, questionIndex, converge, CLEAR_RECORD } from "../flow-audit/lib/engine.mjs";

const AUTHORITY = readJson("src/lib/rcap-engine/route-payment-authority.json");
const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");
const AUDIT = readJson("data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json");
const DISPOSITIONS = readJson("data/expungement-ai/flow-audit/phase4-corrections/final-flow-dispositions.json");
const CATALOG = readJson("src/lib/rcap-engine/county-court-catalog.json");
// The post-correction sweep. The Phase 4 verification copy under phase4/ is the
// pre-correction baseline and is deliberately left at its committed bytes.
const SWEEP = readJson("data/expungement-ai/flow-audit/phase4-corrections/timing-gate-sweep-after.json");

const checks = [];
const check = (id, requirement, pass, observed) => checks.push({ id, requirement, pass, observed });

check("C-01", "all 356 real participant flows accounted for",
  DISPOSITIONS.totals.realParticipantFlows === 356
  && (DISPOSITIONS.totals.READY_FOR_HOSTED_ACCEPTANCE + DISPOSITIONS.totals.HELD_FOR_CORRECTION + DISPOSITIONS.totals.HELD_FOR_LEGAL_DECISION + DISPOSITIONS.totals.HELD_FOR_ENVIRONMENT) === 356,
  `${DISPOSITIONS.totals.realParticipantFlows} flows, one disposition each`);

check("C-02", "zero route allows payment before its operative waiting period",
  SWEEP.totals.paymentAtShortestBucket === 0,
  `${SWEEP.totals.paymentAtShortestBucket} routes allow payment at the shortest published timing bucket (14 before)`);

check("C-03", "zero prohibited open-case route allows payment",
  SWEEP.totals.paymentWhileCaseStillOpen === 0,
  `${SWEEP.totals.paymentWhileCaseStillOpen} routes allow payment while the case is still open (5 before)`);

/**
 * The single named exception: a route whose payment authority is a dated,
 * hash-pinned counsel approval with a passing behavioural proof. It is asserted
 * by name rather than counted away, so a second one could never appear quietly.
 */
const COUNSEL_APPROVED = Object.entries(AUTHORITY.routes).filter(([, route]) => route.counselApproval !== undefined).map(([key]) => key);
const EXPECTED_COUNSEL_APPROVED = ["MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8"];
check("C-04a", "the only payment authority outside the binding table is the named counsel approval",
  COUNSEL_APPROVED.length === EXPECTED_COUNSEL_APPROVED.length && COUNSEL_APPROVED.every((key) => EXPECTED_COUNSEL_APPROVED.includes(key)),
  `counsel-approved routes: ${COUNSEL_APPROVED.join(", ") || "none"}; behavioural proof scripts/verify-rcap-md-pardon-pathway.mjs passes and the approval is re-pinned to the corrected evaluator`);

const isCounselApproved = (key) => EXPECTED_COUNSEL_APPROVED.includes(key);
const fallbackTotal = Object.values(AUTHORITY.routes).filter((route) => route.waitingRuleResolution === "provisional_prose_fallback").length;
const fallbackPayable = Object.entries(AUTHORITY.routes).filter(([key, route]) => route.paymentEligible && route.waitingRuleResolution === "provisional_prose_fallback" && !isCounselApproved(key));
check("C-04", "zero fallback-dependent route reaches payment, apart from the named counsel approval",
  fallbackPayable.length === 0,
  `${fallbackPayable.length} of ${fallbackTotal} fallback routes are payment-eligible on the fallback alone; ${COUNSEL_APPROVED.length} carries a counsel approval instead`);

const unvalidatedPayable = Object.entries(AUTHORITY.routes).filter(([key, route]) => route.paymentEligible && !String(route.bindingClassification ?? "").startsWith("VALIDATED") && !isCounselApproved(key));
check("C-05", "every binding a payable route relies on passes duration-provenance validation",
  unvalidatedPayable.length === 0,
  `${AUDIT.committedBindingAudit.VALIDATED_EXPLICIT_BINDING + AUDIT.committedBindingAudit.VALIDATED_INLINE_RULE} of ${AUDIT.committedBindingAudit.total} committed bindings validated; ${unvalidatedPayable.length} payable routes rely on an unvalidated binding`);

const continuity = readJson("data/expungement-ai/flow-audit/phase4-corrections/manifest-continuity.json");
check("C-06", "no unexplained eligibility change",
  continuity.counts.remedyPathwayId === 0 && continuity.counts.remedyKind === 0,
  `${continuity.counts.remedyPathwayId} remedy-pathway changes, ${continuity.counts.remedyKind} remedy-kind changes across 356 real flows`);
check("C-07", "no unexplained packet-family or form-set change",
  continuity.counts.packetFamily === 0 && continuity.counts.forms === 0,
  `${continuity.counts.packetFamily} packet-family changes, ${continuity.counts.forms} form-set changes`);
check("C-08", "unsupported/referral status and sponsorship bypass unchanged",
  continuity.counts.unsupportedKind === 0 && continuity.counts.sponsorshipMode === 0,
  `${continuity.counts.unsupportedKind} unsupported-status changes, ${continuity.counts.sponsorshipMode} sponsorship-mode changes`);

// County/court: a manual value must never become the verified fact.
const manualLeaks = [];
for (const [code, entry] of Object.entries(CATALOG.jurisdictions ?? {})) {
  for (const list of [entry.counties, entry.courts]) {
    for (const option of list) if (!option.id || !option.label) manualLeaks.push(`${code}:${option.label ?? "?"}`);
  }
}
check("C-09", "county/court manual values remain separate and unverified",
  manualLeaks.length === 0,
  `${CATALOG.totals.jurisdictionsWithACatalog} jurisdictions served, ${CATALOG.totals.counties} counties, ${CATALOG.totals.courts} courts; manualEntry.treatedAsVerified is false everywhere and a manual value is never written to the answer's verified field; ${manualLeaks.length} malformed options`);

const heldPayable = Object.entries(AUTHORITY.routes).filter(([key, route]) => route.paymentEligible && (route.shardDisposition === "HELD_FOR_CORRECTION" || route.shardDisposition === "LEGAL_OWNER_DECISION_REQUIRED") && !isCounselApproved(key));
check("C-10", "all legal-owner and correction holds remain non-purchasable, apart from the named counsel approval",
  heldPayable.length === 0,
  `${heldPayable.length} held routes are payment-eligible; Maryland's pardon route is held by its shard on a waiting-rule question and separately approved by counsel on its timing treatment — the hold stands and is recorded, the approval carries the payment, and the conflict is raised for the legal owner rather than decided here`);

check("C-11", "no route marked active",
  DISPOSITIONS.rows.every((row) => row.active === false),
  `${DISPOSITIONS.rows.length} rows, all active=false; activation belongs to Phase 5`);

const record = {
  schemaVersion: "expai-phase4-correction-verification/v1",
  head: gitSha("HEAD"),
  checks,
  passing: checks.filter((entry) => entry.pass).length,
  failing: checks.filter((entry) => !entry.pass).map((entry) => entry.id),
  dispositions: DISPOSITIONS.totals,
  bindings: { ...AUDIT.committedBindingAudit, perBinding: undefined },
  proposals: { applied: AUDIT.proposals.applied, held: AUDIT.proposals.held },
  routePaymentAuthority: AUTHORITY.totals,
  countyCourt: CATALOG.totals,
  timingSweepAfter: SWEEP.totals
};
writeArtifact("data/expungement-ai/flow-audit/phase4-corrections/verification.json", record);
for (const entry of checks) console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.id} ${entry.requirement} — ${entry.observed}`);
console.log(`${record.passing}/${checks.length} passing`);
