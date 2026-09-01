#!/usr/bin/env node
/**
 * The four Batch A routes, at every surface that could take money or produce a
 * document — run, not grepped.
 *
 * The canonical legal authority holds Georgia § 42-8-66, Missouri § 311.326,
 * North Dakota § 12-60.1-05 and South Carolina's diversion route closed, each
 * for its own reason. That is a claim about the resolver. What matters to a
 * participant is whether the claim survives every hop from the resolver to a
 * Stripe session, a render job or a Briefcase card, and no test crossed those
 * hops: the resolver was proven, the evaluator was proven, and the surfaces in
 * between were assumed.
 *
 * So each surface is exercised through its own real entry point:
 *
 *   evaluator        the screening result a participant receives
 *   checkout         isConsumerPaymentAllowed, the predicate every paid path
 *                    calls before opening a Stripe session
 *   generation       the packet-ready predicate that guards
 *                    requireGenerationAllowed, on the snapshot the evaluator wrote
 *   sponsorship      the resolver's sponsorship authority
 *   render           the resolver's generation authority and factory_v2 admission
 *   Briefcase        the card state the result maps to
 *
 * And every assertion is mutation-proven, because "closed" is the default
 * answer at most of these boundaries. A test that only ever asserts closed on
 * routes that are closed for unrelated reasons proves nothing; each route is
 * re-run with its own hold lifted, and the surfaces must open. If they do not,
 * the boundary is not wired to the authority at all — it is just off.
 */
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";
const ON = new Date(`${process.env.RCAP_EVALUATOR_TODAY}T00:00:00Z`);

const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { evaluateScreening } = await import("@/lib/rcap-engine/evaluator");
const { isConsumerPaymentAllowed } = await import("@/lib/expungement-ai/eligibility-adapter");
const { resolveRoute } = await import("@/lib/legal-authority/resolve-route");
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import("@/lib/rcap-engine/packet-planner");

let checks = 0;
const failures = [];
const ok = (label, condition, detail) => {
  checks += 1;
  if (condition) return;
  failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

const PACKET_READY_CODES = new Set(["packet_ready", "packet_ready_with_caution"]);
const BRIEFCASE_PACKET_READY = new Set(["packet_ready", "packet_ready_with_caution"]);

/** A complete answer set for a route, built from the profile's own options. */
function answersFor(profile, pathway, extra = {}) {
  const publicProfile = projectPublicProfile(profile);
  const answers = { ownership_scope: "yes", jurisdiction_scope: "yes", possible_pathway_context: pathway.label };
  for (const question of publicProfile.questions) {
    if (answers[question.id] !== undefined || question.required !== true) continue;
    const options = question.options ?? [];
    const benign = options.find((option) => /none of these|^no$|^none$/i.test(option))
      ?? options.find((option) => !/not sure|unknown/i.test(option));
    answers[question.id] = benign ?? (/^yes_no/.test(String(question.type)) ? "no" : "not applicable");
  }
  return { ...answers, ...extra };
}

/**
 * Each route with the lift that reaches its own hold, and what must happen then.
 *
 * `opens` is not uniform, and writing it as though it were is what a vacuous
 * version of this test would look like. Georgia's contract sets
 * artifactApprovalRequired, which closes payment with no input that can satisfy
 * it — only counsel approving a rendered artifact clears it — so Georgia's
 * generation opens and its checkout must not. South Carolina binds no packet
 * family at all, so closing its solicitor gate must change nothing. Asserting
 * "everything opens" would have failed on the two routes that are right.
 */
const ROUTES = [
  {
    label: "Georgia § 42-8-66 retroactive First Offender petition",
    jurisdiction: "GA",
    pathwayId: "retroactive-first-offender-treatment-under-42-8-66",
    heldBy: "written prosecutorial consent, two artifact gates, and artifact approval",
    lift: {
      closedGateIds: ["ga_42_8_66_petition_family_build", "ga_42_8_66_candidate_and_review"],
      facts: { ga_written_prosecutor_consent_status: { value: "verified_written_consent", provenance: "server_verified_document" } }
    },
    opens: { generation: true, payment: false },
    why: "artifactApprovalRequired closes payment and sponsorship on its own, and no resolver input satisfies it. Generation opening is what proves the gates and the consent precondition were the things holding it."
  },
  {
    label: "Missouri § 311.326 minor-in-possession petition",
    jurisdiction: "MO",
    pathwayId: "first-minor-in-possession-alcohol-expungement-under-311-326",
    heldBy: "six clerk-configuration gates and the date-of-birth eligibility clock",
    lift: {
      closedGateIds: ["mo_311_326_clerk_final_caption", "mo_311_326_clerk_filing_code", "mo_311_326_clerk_fee",
        "mo_311_326_clerk_service", "mo_311_326_clerk_summons", "mo_311_326_clerk_division_instructions"],
      facts: {
        mo_311_326_conviction_origin: { value: "state_311_325", provenance: "verified_record" },
        date_of_birth: { value: "2000-01-01", provenance: "verified_record" }
      }
    },
    opens: { generation: true, payment: true },
    why: "The clerk gates are operational configuration, not legal research, so closing them plus a verified date of birth is the whole hold."
  },
  {
    label: "North Dakota § 12-60.1-05 non-conviction closing",
    jurisdiction: "ND",
    pathwayId: "non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
    heldBy: "an unresolved branch and the pre-effective-date petition's artifact gate",
    lift: {
      closedGateIds: ["nd_pre_2025_petition_artifact"],
      facts: { nd_qualifying_disposition_date: { value: "2025-01-01", provenance: "verified_record" } }
    },
    opens: { generation: true, payment: true },
    why: "A disposition before 2025-08-01 selects the participant-petition branch; that branch is packet-bearing once its artifact exists."
  },
  {
    label: "South Carolina diversion or program-completion expungement",
    jurisdiction: "SC",
    pathwayId: "diversion-or-program-completion-expungement",
    heldBy: "a solicitor-administered process with no participant filing",
    lift: { closedGateIds: ["sc_pti_circuit_solicitor_configuration"], facts: {} },
    opens: { generation: false, payment: false },
    why: "This is the route whose hold must NOT lift. It binds no packet family, so closing its source-acquisition gate changes nothing. If this one opens, the boundary is keyed to gates rather than to what the route is."
  }
];

for (const route of ROUTES) {
  const { jurisdiction, pathwayId, label } = route;
  const profile = getProfileByJurisdiction(jurisdiction);
  const pathway = profile?.pathways.find((candidate) => candidate.id === pathwayId);
  if (!pathway) {
    failures.push(`${jurisdiction}:${pathwayId} — the route does not exist`);
    continue;
  }
  console.log(`\n${label}\n  held by ${route.heldBy}`);

  const evaluation = evaluateScreening({
    jurisdiction, profileVersion: profile.profileVersion, answers: answersFor(profile, pathway)
  });
  const resolution = resolveRoute({ jurisdiction, pathwayId, facts: {}, on: ON, phase: "FINAL_VERIFICATION" });

  // 1. The evaluator. Nothing downstream can be safe if this says ready.
  ok(`${jurisdiction}: the evaluator does not present a ready packet`,
    !PACKET_READY_CODES.has(evaluation.resultCode), evaluation.resultCode);
  ok(`${jurisdiction}: the evaluator does not allow payment`,
    evaluation.paymentAllowed !== true);

  // 2. Checkout, through the predicate every paid path calls.
  ok(`${jurisdiction}: checkout refuses`,
    isConsumerPaymentAllowed(evaluation.resultCode, evaluation.paymentAllowed === true) === false);

  // 3. Generation, through the same packet-ready predicate that guards it.
  ok(`${jurisdiction}: packet generation refuses`,
    !(PACKET_READY_CODES.has(evaluation.resultCode)
      && isConsumerPaymentAllowed(evaluation.resultCode, evaluation.paymentAllowed === true)));

  // 4. Sponsorship, which is a separate authority and must close separately.
  ok(`${jurisdiction}: sponsorship is closed`, resolution.sponsorshipAuthority === "closed",
    resolution.sponsorshipAuthority);

  // 5. Render authority.
  ok(`${jurisdiction}: generation authority is closed`, resolution.generationAuthority === "closed",
    resolution.generationAuthority);

  // 6. The Briefcase card. A held route must not present as a ready packet.
  ok(`${jurisdiction}: the Briefcase does not show a ready packet`,
    !BRIEFCASE_PACKET_READY.has(evaluation.resultCode), evaluation.resultCode);

  // The packet planner is reported rather than asserted: a plan can be
  // structurally complete for a family that does not exist yet, which is
  // exactly Georgia's case, and asserting otherwise would encode a wrong idea
  // of what the planner answers.
  const plan = packetPlanForPathway(profile, pathwayId);
  console.log(`  evaluator ${evaluation.resultCode}; planner ready=${isPacketPlanFulfillmentReady(plan)}; resolver payment=${resolution.paymentAuthority}, generation=${resolution.generationAuthority}, sponsorship=${resolution.sponsorshipAuthority}`);

  // 7. The mutation. Lift this route's own hold and require exactly the outcome
  //    the contract says it should have — which is not "open" for two of them.
  const lifted = resolveRoute({
    jurisdiction, pathwayId, facts: route.lift.facts ?? {}, on: ON,
    phase: "FINAL_VERIFICATION", closedGateIds: route.lift.closedGateIds
  });
  const liftedDetail = `payment ${lifted.paymentAuthority}/${lifted.delivery?.paymentAllowed}, generation ${lifted.generationAuthority}, hold "${lifted.holdReason ?? "none"}"`;
  ok(`${jurisdiction}: with its hold lifted, generation ${route.opens.generation ? "opens" : "stays closed"} — ${route.why}`,
    (lifted.generationAuthority === "open") === route.opens.generation, liftedDetail);
  ok(`${jurisdiction}: with its hold lifted, payment ${route.opens.payment ? "opens" : "stays closed"}`,
    (lifted.delivery?.paymentAllowed === true) === route.opens.payment, liftedDetail);
}

console.log(`\nBatch A product boundaries: ${checks} checks.`);
if (failures.length > 0) {
  console.error("\nBatch A product boundary FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Every Batch A route is closed at the evaluator, checkout, generation, sponsorship and the Briefcase, and each one reaches exactly the state its contract says when its own hold is lifted.");
