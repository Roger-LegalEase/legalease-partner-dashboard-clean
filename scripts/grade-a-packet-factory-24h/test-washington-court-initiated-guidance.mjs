import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { prepareWashingtonCourtInitiatedGuidance } from "./washington-court-initiated-guidance.mjs";
import { WA_AUTOMATIC, WA_MOTION_ROUTE } from "./treatment-reconciliation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = "data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation";
const base = { cohort: "scheduled_administrative_hearing_automatic",
  courtName: "SYNTHETIC EXAMPLE — juvenile court identified in participant's case record",
  caseNumber: "SYNTHETIC-CASE-001", excludedOffense: false,
  onSupervision: false, individualVictimRestitutionOutstanding: false };
const cases = [
  ["administrative", base, "verify_court_status"],
  ["immediate", { ...base, cohort: "acquittal_or_dismissal_immediate_automatic", disposition: "acquittal_after_fact_finding" }, "verify_court_status"],
  ["supervision", { ...base, onSupervision: true }, "await_continued_administrative_hearing"],
  ["unpaid-restitution", { ...base, individualVictimRestitutionOutstanding: true }, "obtain_restitution_denial_and_balance"],
  ["paid-follow-up", { ...base, writtenRestitutionDenial: true, remainingIndividualVictimRestitutionPaid: true, paymentProofAvailable: false }, "request_administrative_follow_up"],
  ["paid-follow-up-known-contact", { ...base, writtenRestitutionDenial: true, remainingIndividualVictimRestitutionPaid: true, paymentProofAvailable: true, juvenileDepartmentContact: "SYNTHETIC Juvenile Department — 555-0100\nRecords desk" }, "request_administrative_follow_up"],
  ["conflicting-restitution", { ...base, writtenRestitutionDenial: true, remainingIndividualVictimRestitutionPaid: true, individualVictimRestitutionOutstanding: true }, "confirm_route_facts"],
  ["excluded-offense", { ...base, excludedOffense: true }, "professional_handoff"],
  ["unknown-status", { cohort: base.cohort }, "confirm_route_facts"],
  ["deferred-disposition", { ...base, cohort: "acquittal_or_dismissal_immediate_automatic", disposition: "dismissal_with_prejudice", deferredDispositionDismissal: true }, "professional_handoff"],
  ["unknown-dismissal-basis", { ...base, cohort: "acquittal_or_dismissal_immediate_automatic", disposition: "dismissal_with_prejudice" }, "confirm_route_facts"],
  ["appeal", { ...base, appealPending: true }, "professional_handoff"]
];
const rows = [];
for (const [id, facts, expectedStatus] of cases) {
  const result = prepareWashingtonCourtInitiatedGuidance(facts);
  assert.equal(result.status, expectedStatus, id);
  assert.equal(result.petitionPrepared, false);
  assert.equal(result.sealingConfirmed, false);
  assert.equal(result.documents.length, 1);
  const text = result.documents[0].text;
  assert.ok(text.includes(result.nextAction), `${id}: actual delivered text must contain the selected next action`);
  assert.ok(text.includes("does not confirm that your record is sealed"));
  assert.ok(text.includes("separate subsection (3) motion"));
  assert.ok(text.includes("quotes no filing fee or fee waiver"));
  assert.ok(!/JU 10\./.test(text), "no motion forms are acquired or prepared by this guide");
  if (id === "paid-follow-up") assert.ok(result.requiredBeforeAction.some(value => value.startsWith("Actual proof of payment")));
  if (id === "paid-follow-up-known-contact") {
    assert.ok(text.includes("Juvenile department contact: SYNTHETIC Juvenile Department — 555-0100 Records desk"));
    assert.ok(!result.requiredBeforeAction.some(value => value.startsWith("The juvenile department's contact details")));
  }
  if (id === "conflicting-restitution") {
    assert.ok(text.includes("payment information conflicts"));
    assert.ok(!text.includes("department verifies payment and circulates the order"));
  }
  if (id === "unknown-status") assert.ok(result.requiredBeforeAction.length >= 4, "missing court/case/contact/eligibility remain missing");
  if (id === "unpaid-restitution") assert.ok(text.includes("five business days"));
  if (id === "supervision") assert.ok(text.includes("within 30 days"));
  rows.push({ fixture: id, input: facts, expectedStatus, actualStatus: result.status,
    routeKey: result.routeKey, outputKind: result.documents[0].mediaType,
    outputPath: `${out}/wa-guides/${id}.md`,
    sha256: crypto.createHash("sha256").update(text).digest("hex"), requiredBeforeAction: result.requiredBeforeAction });
  if (process.argv.includes("--write-evidence")) {
    fs.mkdirSync(path.join(root, out, "wa-guides"), { recursive: true });
    fs.writeFileSync(path.join(root, out, "wa-guides", `${id}.md`), text);
  }
}
const motion = prepareWashingtonCourtInitiatedGuidance({ cohort: "participant_motion_branch" });
assert.equal(motion.handoffRouteKey, WA_MOTION_ROUTE);
assert.deepEqual(motion.documents, []);
assert.equal(prepareWashingtonCourtInitiatedGuidance({}).status, "separate_route_handoff");
const result = { schemaVersion: "rcap-scoped-guidance-build/v1", familyId: WA_AUTOMATIC,
  implementation: "scripts/grade-a-packet-factory-24h/washington-court-initiated-guidance.mjs",
  cases: rows, refusalControls: ["participant motion never becomes an automatic guide", "missing cohort does not select a route"],
  independentReview: "PENDING", terminalStateGranted: false, runtimeInstalled: false, commercialAuthority: false };
if (process.argv.includes("--write-evidence")) fs.writeFileSync(path.join(root, out, "wa-guidance-build.json"), JSON.stringify(result, null, 2) + "\n");
console.log(`Washington guidance: ${rows.length} distinct route/fact outcomes and 2 route-refusal controls passed; ${process.argv.includes("--write-evidence") ? "Markdown candidates written" : "no files written"}; independent acceptance remains pending.`);
