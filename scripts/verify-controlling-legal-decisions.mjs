// Focused tests for the four controlling legal decisions of 2026-08-28.
//
// These exercise the route-effect projection directly, so the decisions are
// behaviour rather than prose. Every assertion traces to a line the decision
// owner supplied.
//
// Usage: node scripts/verify-controlling-legal-decisions.mjs

import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const effects = await import("../src/lib/rcap/legal-decisions/controlling-route-effects.ts");

const failures = [];
let passed = 0;
function check(condition, label, detail = "") {
  if (condition) { passed += 1; console.log(`  ok   ${label}`); }
  else { failures.push(detail ? `${label} -- ${detail}` : label); console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ""}`); }
}
const section = (t) => console.log(`\n${t}`);

section("Georgia — ga-rfo");
{
  const { georgiaRfoOutcome, GEORGIA_RFO_VENUE } = effects;
  check(georgiaRfoOutcome({ prosecutorConsent: "none" }).kind === "handoff", "no consent means no packet");
  check(georgiaRfoOutcome({ prosecutorConsent: "refused" }).kind === "handoff", "refused consent means no packet");
  check(georgiaRfoOutcome({ prosecutorConsent: "silent" }).kind === "handoff", "prosecutor silence does not qualify");
  const consented = georgiaRfoOutcome({ prosecutorConsent: "written" });
  check(consented.kind === "packet", "written consent opens the petition stage", JSON.stringify(consented));
  check(consented.kind === "packet" && consented.unit === "ga-rfo-participant-petition", "the opened stage is the participant petition");
  check(GEORGIA_RFO_VENUE === "court_of_conviction", "petition uses the court of conviction");
  const granted = georgiaRfoOutcome({ prosecutorConsent: "written", qualifyingOrderDate: "2026-03-15" });
  check(granted.kind === "implementation_tracking", "an existing granted order does not generate a duplicate petition");
  const post = georgiaRfoOutcome({ prosecutorConsent: "written", qualifyingOrderDate: "2026-08-01" });
  check(post.kind === "implementation_tracking" && /2026-07-01/.test(post.reason),
    "a post-July 1 2026 order produces restriction and sealing implementation tracking");
}

section("Missouri — mo-311-326-minor-in-possession");
{
  const { missouri311326Scope, missouriFilingCodeDisposition, missouriPacketReleasable,
    MISSOURI_CLERK_CONFIRMATION_GATE, MISSOURI_311_326_FILING_MODEL } = effects;
  check(missouri311326Scope({ kind: "state", statute: "311.325" }).inScope === true, "state conviction route is in scope");
  const adopted = missouri311326Scope({ kind: "municipal_ordinance", expresslyAdopts311326: true });
  check(adopted.route === "local_route", "express municipal adoption is a separate local route");
  const equivalent = missouri311326Scope({ kind: "municipal_ordinance", expresslyAdopts311326: false });
  check(equivalent.inScope === false && equivalent.route === "610.140_analysis_or_local_law_review",
    "mere municipal equivalence is excluded from § 311.326");
  check(missouriFilingCodeDisposition("X5", true).allowed === false, "X5 is prohibited even on clerk direction");
  check(missouriFilingCodeDisposition("X5", false).allowed === false, "X5 is prohibited");
  const xg = missouriFilingCodeDisposition("XG", false);
  check(xg.allowed === true && xg.provisional === true, "XG is provisional");
  check(missouriFilingCodeDisposition("X1", false).allowed === false, "X1 is not used without clerk direction");
  check(missouriFilingCodeDisposition("X1", true).allowed === true, "X1 is used only when the clerk directs");
  check(MISSOURI_311_326_FILING_MODEL === "new_miscellaneous_civil_matter", "filing model is a new miscellaneous civil matter");
  check(missouriPacketReleasable(new Set()) === false, "no final packet before clerk configuration");
  check(missouriPacketReleasable(new Set(MISSOURI_CLERK_CONFIRMATION_GATE.slice(0, -1))) === false,
    "a partially confirmed clerk gate still blocks the packet");
  check(missouriPacketReleasable(new Set(MISSOURI_CLERK_CONFIRMATION_GATE)) === true,
    "a fully confirmed clerk gate releases the packet");
}

section("North Dakota — nd-nonconviction-auto-close-verify");
{
  const { northDakotaRoute, NORTH_DAKOTA_WAIT_DAYS, NORTH_DAKOTA_VERIFY_ON_DAY } = effects;
  const pre = northDakotaRoute("2025-07-31");
  check(pre.branch === "pre_effective_date" && pre.output === "official_petition_and_proposed_order",
    "a pre-August 1 2025 matter uses the official petition and proposed order");
  const post = northDakotaRoute("2025-08-01");
  check(post.branch === "post_effective_date" && post.output === "automatic_closure_guidance",
    "a post-August 1 2025 matter files no initial petition");
  check(NORTH_DAKOTA_WAIT_DAYS === 61, "the wait is 61 complete days");
  check(NORTH_DAKOTA_VERIFY_ON_DAY === 62, "verification is on day 62 or the next business day");
  check(post.escalation[0] === "written_request_to_original_court_clerk", "first correction is a written request to the original court clerk");
  check(post.escalation[1] === "motion_in_original_criminal_case", "judicial escalation is a motion in the original criminal case");
  check(post.agencyHistoryErrors === "bci_or_originating_agency_challenge",
    "the BCI challenge is separated from court closure");
  check(post.individualisedNoticePromised === false, "no closure notice is promised");
}

section("South Carolina — sc_pti_17_22_150");
{
  const { southCarolinaPtiOutcome, southCarolinaPtiFeeSchedule, southCarolinaPtiCommercialPosture,
    SOUTH_CAROLINA_PTI_CUSTOM_PLEADING_RETIRED, SOUTH_CAROLINA_RESCINDED_FEE_CENTS } = effects;
  const schedule = southCarolinaPtiFeeSchedule(true);
  check(schedule.administrativeFeeCents === 25_000, "$250 is displayed");
  check(schedule.sledFeeCents === 0, "the PTI SLED fee is $0");
  check(schedule.clerkFeeCents === 3_500, "the clerk fee is $35 when applicable");
  check(southCarolinaPtiFeeSchedule(false).clerkFeeCents === 0, "the clerk fee is qualified, not automatic");
  check(schedule.expectedTotalCents === 28_500, "the ordinary expected total is $285");
  check(schedule.administrativeFeeCents !== SOUTH_CAROLINA_RESCINDED_FEE_CENTS, "the rescinded $150 amount is not the fee");
  check(SOUTH_CAROLINA_PTI_CUSTOM_PLEADING_RETIRED === true, "the ordinary custom pleading is retired");
  const ordinary = southCarolinaPtiOutcome({ solicitorDecision: "pending", eligibilityContested: false });
  check(ordinary.kind === "process_guidance", "process guidance is selected");
  const denied = southCarolinaPtiOutcome({ solicitorDecision: "denied", eligibilityContested: false });
  check(denied.kind === "handoff" && denied.to === "retained_counsel", "solicitor denial becomes a retained-counsel handoff");
  const contested = southCarolinaPtiOutcome({ solicitorDecision: "pending", eligibilityContested: true });
  check(contested.kind === "handoff", "contested eligibility becomes a retained-counsel handoff");
  const posture = southCarolinaPtiCommercialPosture();
  check(posture.checkoutEnabled === false, "checkout is disabled");
  check(posture.sponsoredCreditsConsumed === 0, "sponsored credit is zero");

  // No active $150 copy anywhere in the projection or the decision record.
  const projection = fs.readFileSync(path.join(root, "src/lib/rcap/legal-decisions/controlling-route-effects.ts"), "utf8");
  const activeDollar150 = projection
    .split("\n")
    .filter((line) => /\$150|15_000|\b15000\b/.test(line))
    .filter((line) => !/RESCINDED|rescinded/.test(line));
  check(activeDollar150.length === 0, "no active $150 copy in the route projection", activeDollar150.join(" | "));
}

section("The decision record itself");
{
  const record = JSON.parse(fs.readFileSync(path.join(root, effects.CONTROLLING_DECISION_RECORD), "utf8"));
  check(record.reviewedThrough === "2026-08-28", "the record is reviewed through 2026-08-28");
  check(record.decisions.length === 4, "four decisions are recorded");
  check(record.createsApproval === false, "the record creates no approval of its own");
  // Look for signature-shaped FIELDS, not for the word. The record's own note
  // says no signature is represented, and a substring match flagged that
  // disclaimer as the thing it warns against.
  const keys = new Set();
  (function walk(node) {
    if (Array.isArray(node)) { for (const item of node) walk(item); return; }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) { keys.add(key); walk(value); }
    }
  })(record);
  const fabricated = [...keys].filter((k) => /signature|signedby|initials|approvedby|approver|ratifiedby/i.test(k));
  check(fabricated.length === 0, "no signature or approver field is fabricated", fabricated.join(", "));
  for (const decision of record.decisions) {
    check(decision.existingMemo?.sha256?.length === 64, `${decision.decisionId} names its memo hash`);
    check(Array.isArray(decision.recordedAuthority) && decision.recordedAuthority.length > 0,
      `${decision.decisionId} records the authority exactly as supplied`);
    check(Array.isArray(decision.engineeringConsequences) && decision.engineeringConsequences.length > 0,
      `${decision.decisionId} names its engineering consequences`);
  }
}

console.log("");
if (failures.length > 0) {
  console.error(`Controlling legal decision tests failed: ${failures.length} of ${passed + failures.length}.`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Controlling legal decision tests passed: ${passed} checks.`);
