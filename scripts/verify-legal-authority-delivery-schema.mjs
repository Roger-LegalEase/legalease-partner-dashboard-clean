#!/usr/bin/env node
/**
 * The delivery layer of the route-contract schema, checked by making it fail.
 *
 * Two things are asserted here and nowhere else:
 *
 *   1. Every new invariant fires. A rule that has never been seen to reject
 *      anything is not known to be a rule.
 *   2. Legal resolution does not set generationAllowed, paymentAllowed,
 *      sponsoredGenerationAllowed or commerciallyDeliverable. The national
 *      report of 2026-08-28 says a resolved legal question does not make a
 *      route commercially ready, and the only way to hold that line in code is
 *      to derive the four flags from gates rather than from the answer.
 */
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  assertRouteContractInvariants,
  routeDeliveryAuthority,
  routePaymentAuthority,
  LEGAL_AUTHORITY
} = await import("@/lib/legal-authority/index");

let passed = 0;
const failures = [];
const ok = (name, condition, detail = "") => {
  if (condition) { passed += 1; console.log(`  ok   ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
};

/** A minimal valid packet-bearing contract to mutate. */
const base = () => ({
  routeKey: "ZZ:test-route",
  jurisdiction: "ZZ",
  pathwayId: "test-route",
  decisionId: "TEST-01",
  ruleId: "TEST-RULE",
  mechanism: "Test mechanism",
  statute: "Test Code § 1",
  stage: "single_stage",
  outcomeMode: "participant_packet",
  timing: { kind: "event_trigger", anchorText: "on the qualifying event" },
  requiredFacts: ["A fact the decision requires"],
  packetFamily: "Test Packet Family"
});

const codesFor = (route) => assertRouteContractInvariants([route]).map((v) => v.code);

console.log("Each new invariant rejects what it exists to reject:");

ok("a precondition collected in anonymous screening is rejected",
  codesFor({ ...base(), packetReleasePreconditions: [{ id: "consent", requires: "written consent", whenAbsent: "fail_closed_handoff", collectedAt: "anonymous_screening", note: "" }] })
    .includes("precondition_in_anonymous_screening"));

ok("the same precondition collected at authenticated intake is accepted",
  codesFor({ ...base(), packetReleasePreconditions: [{ id: "consent", requires: "written consent", whenAbsent: "fail_closed_handoff", collectedAt: "authenticated_intake", note: "" }] })
    .length === 0);

ok("a precondition with no requirement is rejected",
  codesFor({ ...base(), packetReleasePreconditions: [{ id: "empty", requires: "  ", whenAbsent: "fail_closed_guidance", collectedAt: "final_verification", note: "" }] })
    .includes("precondition_without_requirement"));

ok("declared checkout on a guidance route is rejected",
  codesFor({ ...base(), outcomeMode: "guidance_status", packetFamily: null, commercialPosture: { checkoutEnabled: true, sponsoredGenerationEnabled: false, packetCreditsConsumed: 0, note: "" } })
    .includes("declared_checkout_on_closed_route"));

ok("sponsored credits on a closed route are rejected",
  codesFor({ ...base(), outcomeMode: "guidance_status", packetFamily: null, commercialPosture: { checkoutEnabled: false, sponsoredGenerationEnabled: false, packetCreditsConsumed: 1, note: "" } })
    .includes("credits_on_closed_route"));

ok("sponsored generation on a closed route is rejected",
  codesFor({ ...base(), outcomeMode: "guidance_status", packetFamily: null, commercialPosture: { checkoutEnabled: false, sponsoredGenerationEnabled: true, packetCreditsConsumed: 0, note: "" } })
    .includes("sponsored_generation_on_closed_route"));

ok("checkout declared open before a future effective date is rejected",
  codesFor({ ...base(), effectiveDateGate: { notBefore: "2027-01-01", note: "" }, commercialPosture: { checkoutEnabled: true, sponsoredGenerationEnabled: false, packetCreditsConsumed: 1, note: "" } })
    .includes("checkout_before_effective_date"));

ok("a service branch binding a packet to a guidance outcome is rejected",
  codesFor({ ...base(), serviceBranches: [{ id: "denied", when: "the solicitor denies", outcomeMode: "guidance_status", packetFamily: "Some Family", note: "" }] })
    .includes("branch_packet_on_non_packet_outcome"));

ok("a service branch with no condition is rejected",
  codesFor({ ...base(), serviceBranches: [{ id: "x", when: "   ", outcomeMode: "referral", packetFamily: null, note: "" }] })
    .includes("branch_without_condition"));

ok("a delivery gate that names nothing to close it is rejected",
  codesFor({ ...base(), deliveryGates: [{ kind: "source_acquisition", items: [], owner: "someone", note: "" }] })
    .includes("delivery_gate_without_items"));

ok("a delivery gate with no owner is rejected",
  codesFor({ ...base(), deliveryGates: [{ kind: "source_acquisition", items: ["a fee schedule"], owner: "  ", note: "" }] })
    .includes("delivery_gate_without_owner"));

console.log("\nLegal resolution does not open delivery:");

const day = new Date("2026-08-28T00:00:00.000Z");
const clean = routeDeliveryAuthority(base(), day);
ok("a resolved packet route with no gates is fully deliverable",
  clean.paymentAllowed && clean.generationAllowed && clean.sponsoredGenerationAllowed && clean.commerciallyDeliverable && clean.holdReason === null);

const gated = routeDeliveryAuthority({ ...base(), deliveryGates: [{ kind: "source_acquisition", items: ["the circuit fee schedule"], owner: "RCAP source acquisition", note: "" }] }, day);
ok("a source-acquisition gate closes payment, generation and sponsorship",
  gated.legallyResolved && !gated.paymentAllowed && !gated.generationAllowed && !gated.sponsoredGenerationAllowed && !gated.commerciallyDeliverable,
  JSON.stringify({ pay: gated.paymentAllowed, gen: gated.generationAllowed, spon: gated.sponsoredGenerationAllowed }));
ok("a gated route still reports itself legally resolved", gated.legallyResolved === true);
ok("a gated route names its hold reason", typeof gated.holdReason === "string" && gated.holdReason.includes("source_acquisition"));

const artifact = routeDeliveryAuthority({ ...base(), artifactApprovalRequired: true }, day);
ok("artifact approval blocks delivery but not generation",
  artifact.generationAllowed && !artifact.commerciallyDeliverable,
  JSON.stringify({ gen: artifact.generationAllowed, deliver: artifact.commerciallyDeliverable }));

const future = routeDeliveryAuthority({ ...base(), effectiveDateGate: { notBefore: "2027-01-01", note: "" } }, day);
ok("a future effective date closes everything",
  future.effectiveDateStatus === "future_effective" && !future.generationAllowed && !future.paymentAllowed && !future.sponsoredGenerationAllowed && !future.commerciallyDeliverable);
ok("a future-effective route names the date in its hold reason",
  (future.holdReason ?? "").includes("2027-01-01"));

const afterDate = routeDeliveryAuthority({ ...base(), effectiveDateGate: { notBefore: "2027-01-01", note: "" } }, new Date("2027-01-01T00:00:00.000Z"));
ok("the same route is in force on its effective date", afterDate.effectiveDateStatus === "in_force" && afterDate.paymentAllowed);

const unreadable = routeDeliveryAuthority({ ...base(), effectiveDateGate: { notBefore: "not-a-date", note: "" } }, day);
ok("an unreadable effective date fails closed rather than open",
  unreadable.effectiveDateStatus === "unknown" && !unreadable.paymentAllowed);

const guidance = routeDeliveryAuthority({ ...base(), outcomeMode: "guidance_status", packetFamily: null }, day);
ok("a guidance route never allows payment or sponsorship",
  !guidance.paymentAllowed && !guidance.sponsoredGenerationAllowed && !guidance.commerciallyDeliverable);

console.log("\nEvery committed contract still satisfies the schema:");
const violations = assertRouteContractInvariants(LEGAL_AUTHORITY.routes);
ok(`all ${LEGAL_AUTHORITY.routes.length} committed contracts pass every invariant`,
  violations.length === 0, violations.slice(0, 3).map((v) => `${v.routeKey}: ${v.code}`).join(", "));

// No committed contract may currently declare a posture its payment authority
// contradicts. This is the live version of the invariants above.
for (const route of LEGAL_AUTHORITY.routes) {
  if (!route.commercialPosture) continue;
  const payment = routePaymentAuthority(route);
  if (route.commercialPosture.checkoutEnabled && payment !== "packet_checkout") {
    failures.push(`${route.routeKey} declares checkout while payment authority is ${payment}`);
  }
}

console.log("");
if (failures.length > 0) {
  console.error(`Legal-authority delivery schema FAILED — ${failures.length} of ${passed + failures.length}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Legal-authority delivery schema passed: ${passed} checks.`);
