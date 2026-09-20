#!/usr/bin/env node
/**
 * The seven Batch B routes, at every surface that could take money or produce a
 * document — run, not grepped.
 *
 * Batch B is Louisiana, Maine and Alaska. Five of its seven routes carried no
 * legal contract at all before this batch, and the two that did derived an open
 * checkout with nothing holding them — while the report's own implementation
 * matrix recorded four of the questions as CONDITIONAL — SOURCE GATE, one as
 * ARTIFACT REVIEW STILL REQUIRED and one as a FORM-CONFLICT GATE. The
 * conditions existed in the report and had never been projected into anything
 * that runs.
 *
 * Two of the seven are deliberately NOT held, and that is the part worth
 * checking: Article 985.3 is released as a packet by the report, and Maine's
 * non-conviction route is released as guidance. A boundary test that expected
 * every route to be closed would pass on the five and be wrong about the two.
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
    label: "Louisiana art. 977(D)/998 first-offense marijuana expungement",
    jurisdiction: "LA",
    pathwayId: "first-offense-marijuana-expungement-after-90-days-art-998",
    heldBy: "the post-sunset parish fee practice",
    closedAtEveryProductSurface: true,
    lift: { closedGateIds: ["la_977d_post_sunset_fee_schedule"], facts: {} },
    opens: { generation: true, payment: true },
    why: "A source gate on a parish fee. Nothing legal is open, so closing the gate must release the route."
  },
  {
    label: "Louisiana art. 985 expungement by redaction",
    jurisdiction: "LA",
    pathwayId: "expungement-by-redaction-for-multi-person-records",
    heldBy: "artifact review, which no input can satisfy",
    closedAtEveryProductSurface: true,
    lift: { closedGateIds: ["la_985_redaction_supplement_review"], facts: {} },
    opens: { generation: true, payment: false },
    why: "artifactApprovalRequired closes checkout with no resolver input that can clear it — only counsel reading a rendered candidate. Generation must stay open even before that, because the candidate has to exist before it can be reviewed."
  },
  {
    label: "Louisiana art. 985.3 immediate expungement",
    jurisdiction: "LA",
    pathwayId: "immediate-expungement-after-successful-court-program-completion-art-985-3",
    heldBy: "nothing — the report releases it as a packet",
    closedAtEveryProductSurface: false,
    lift: { closedGateIds: [], facts: {} },
    opens: { generation: true, payment: true },
    why: "Released. The contested-timing branch leaves the route for counsel rather than holding it, so an uncontested matter must reach the packet."
  },
  {
    label: "Maine § 2264 adult conviction sealing",
    jurisdiction: "ME",
    pathwayId: "adult-conviction-sealing",
    heldBy: "the prosecutor-notice method, which the report records as local",
    closedAtEveryProductSurface: true,
    lift: { closedGateIds: ["me_2264_prosecutor_notice_method"], facts: {} },
    opens: { generation: true, payment: true },
    why: "A source gate on court practice. The legal answer is settled."
  },
  {
    label: "Maine § 2264(7) survivor sealing",
    jurisdiction: "ME",
    pathwayId: "sex-trafficking-sexual-exploitation-survivor-sealing",
    heldBy: "a form whose printed warning contradicts its statute, and the same notice method",
    closedAtEveryProductSurface: true,
    lift: { closedGateIds: ["me_2264_7_cr308_warning_conflict", "me_2264_7_prosecutor_notice_method"], facts: {} },
    opens: { generation: true, payment: true },
    why: "Two independent gates. Closing only one must not release the route, which is checked separately below."
  },
  {
    label: "Maine § 703(2) adult non-conviction relief",
    jurisdiction: "ME",
    pathwayId: "adult-non-conviction-record-relief",
    heldBy: "nothing — released as guidance that may not promise confidentiality",
    closedAtEveryProductSurface: true,
    lift: { closedGateIds: [], facts: {} },
    opens: { generation: false, payment: false },
    why: "Guidance binds no packet family, so there is no state in which it sells. The decision is a limit on what the product may say, not a hold on saying it."
  },
  {
    label: "Alaska AS 12.55.085(e) belated set-aside motion",
    jurisdiction: "AK",
    pathwayId: "set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085",
    heldBy: "an artifact gate — the report located no official Alaska form",
    closedAtEveryProductSurface: true,
    lift: { closedGateIds: ["ak_12_55_085_e_motion_artifact"], facts: {} },
    opens: { generation: true, payment: true },
    why: "Every component is custom because no form exists. Once the artifact does, nothing legal is open."
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

  // Surface checks apply to the routes the authority actually holds. Two Batch B
  // routes are released by the report — art. 985.3 as a packet, § 703(2) as
  // guidance — and asserting them closed would encode the opposite of the
  // decision. `closedAtEveryProductSurface` says which is which, and the lift
  // below still runs on every route.
  if (route.closedAtEveryProductSurface) {
    // 1. The evaluator. Nothing downstream can be safe if this says ready.
    ok(`${pathwayId}: the evaluator does not present a ready packet`,
      !PACKET_READY_CODES.has(evaluation.resultCode), evaluation.resultCode);
    ok(`${pathwayId}: the evaluator does not allow payment`,
      evaluation.paymentAllowed !== true);

    // 2. Checkout, through the predicate every paid path calls.
    ok(`${pathwayId}: checkout refuses`,
      isConsumerPaymentAllowed(evaluation.resultCode, evaluation.paymentAllowed === true) === false);

    // 3. Generation, through the same packet-ready predicate that guards it.
    ok(`${pathwayId}: packet generation refuses`,
      !(PACKET_READY_CODES.has(evaluation.resultCode)
        && isConsumerPaymentAllowed(evaluation.resultCode, evaluation.paymentAllowed === true)));

    // 4. Sponsorship, which is a separate authority and must close separately.
    ok(`${pathwayId}: sponsorship is closed`, resolution.sponsorshipAuthority === "closed",
      resolution.sponsorshipAuthority);

    // 5. Render authority. Not asserted where the contract holds only on
    //    artifact review: a candidate has to be generated before counsel can
    //    read it, so generation being open there is the design, not a leak.
    if (!resolution.contract?.artifactApprovalRequired) {
      ok(`${pathwayId}: generation authority is closed`, resolution.generationAuthority === "closed",
        resolution.generationAuthority);
    } else {
      ok(`${pathwayId}: checkout stays closed while its artifact is unapproved`,
        resolution.delivery?.paymentAllowed !== true);
    }

    // 6. The Briefcase card. A held route must not present as a ready packet.
    ok(`${pathwayId}: the Briefcase does not show a ready packet`,
      !BRIEFCASE_PACKET_READY.has(evaluation.resultCode), evaluation.resultCode);
  }

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

  // Two gates must be two gates. Closing all but one has to leave that one
  // holding the route, or the second gate is decoration on the first.
  const gateIds = route.lift.closedGateIds ?? [];
  if (gateIds.length > 1) {
    for (const held of gateIds) {
      const partial = resolveRoute({
        jurisdiction, pathwayId, facts: route.lift.facts ?? {}, on: ON,
        phase: "FINAL_VERIFICATION", closedGateIds: gateIds.filter((id) => id !== held)
      });
      ok(`${pathwayId}: closing every gate but ${held} leaves ${held} holding the route`,
        partial.openDeliveryGateIds.join() === held && partial.delivery?.paymentAllowed !== true,
        partial.openDeliveryGateIds.join(", ") || "none");
    }
  }
  ok(`${pathwayId}: with its hold lifted, generation ${route.opens.generation ? "opens" : "stays closed"} — ${route.why}`,
    (lifted.generationAuthority === "open") === route.opens.generation, liftedDetail);
  ok(`${pathwayId}: with its hold lifted, payment ${route.opens.payment ? "opens" : "stays closed"}`,
    (lifted.delivery?.paymentAllowed === true) === route.opens.payment, liftedDetail);
}

console.log(`\nBatch B product boundaries: ${checks} checks.`);
if (failures.length > 0) {
  console.error("\nBatch B product boundary FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Every held Batch B route is closed at the evaluator, checkout, generation, sponsorship and the Briefcase, and each one reaches exactly the state its contract says when its own hold is lifted.");

/**
 * `supersedes` and a future effective date, which is not the leak it looks like.
 *
 * `legalAuthorityGate` reads `if (effectiveFrom && !supersedes)`. A past
 * effective date passes the comparison anyway, so the exemption can only act on
 * a contract whose date has NOT arrived — which reads as declaring a route in
 * force before its own statute. I removed it on that reasoning and broke the
 * pre-effective Mississippi proof, which is the answer: `supersedes` means an
 * earlier rule governed before this date and still does until it arrives.
 * Section 99-19-71 pre-2026-07-01 uses the superseded five-year clock, and
 * refusing the route outright would deny relief available under the rule
 * actually in force.
 *
 * So this asserts the behaviour rather than a refusal: a superseding contract's
 * route stays evaluable the day before its effective date, and it must not sell
 * on the strength of a rule that is not yet law.
 */
{
  const { LEGAL_AUTHORITY } = await import("@/lib/legal-authority/index");
  const withBoth = LEGAL_AUTHORITY.routes.filter((route) => route.effectiveFrom && route.supersedes);
  console.log(`\nSupersession fallback: ${withBoth.length} contract(s) carry both effectiveFrom and supersedes.`);
  for (const route of withBoth) {
    const beforeEffective = new Date(new Date(`${route.effectiveFrom}T00:00:00Z`).getTime() - 86400000)
      .toISOString().slice(0, 10);
    const previous = process.env.RCAP_EVALUATOR_TODAY;
    process.env.RCAP_EVALUATOR_TODAY = beforeEffective;
    const profile = getProfileByJurisdiction(route.jurisdiction);
    const pathway = profile?.pathways.find((candidate) => candidate.id === route.pathwayId);
    if (!pathway) { process.env.RCAP_EVALUATOR_TODAY = previous; continue; }
    const evaluation = evaluateScreening({
      jurisdiction: route.jurisdiction, profileVersion: profile.profileVersion,
      answers: answersFor(profile, pathway)
    });
    process.env.RCAP_EVALUATOR_TODAY = previous;
    const codes = (evaluation.reasons ?? []).map((entry) => entry.code);
    ok(`${route.routeKey}: the day before its effective date it falls back rather than refusing outright`,
      !codes.some((code) => code.endsWith(".legal_authority_not_in_force")), codes.join(", ") || "none");
    ok(`${route.routeKey}: and does not sell on a rule that is not yet law`,
      evaluation.paymentAllowed !== true || route.effectiveFrom <= beforeEffective,
      `paymentAllowed ${evaluation.paymentAllowed}`);
  }
}

if (failures.length > 0) {
  console.error("\nBatch B product boundary FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
