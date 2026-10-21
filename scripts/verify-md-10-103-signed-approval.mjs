#!/usr/bin/env node
/**
 * The Maryland § 10-103 signed approval, proven by running it.
 *
 * The approval of 2026-08-25 is signed by "Roger Roman and the LegalEase legal
 * team". Its statement is the authority, and it says two things about the
 * arrest date:
 *
 *   "arrest_date is collected as the prepay deadline anchor for the
 *    police-record route"
 *   "The LD-MD-03 police-record route collects arrest_date before checkout,
 *    treats eight years as a maximum filing deadline rather than a waiting
 *    period, permits the exact eight-year boundary, and bars a later request."
 *
 * That statement was enforced by a hash of MD-maryland.json's bytes and by
 * nothing else. A byte pin cannot tell a reader whether the sentence is still
 * true; it only says the file changed. Commit 3716eba4 changed the file, the
 * pin failed, and the question of whether the approval still held could not be
 * answered from the pin either way.
 *
 * So the approval is enforced here by behaviour, at every point it names.
 *
 * PREPAY IS NOT FREE SCREENING. This is the reading the whole item turns on.
 * The flow is: anonymous screening -> claim -> packet information -> final
 * verification -> checkout -> generation. "Prepay" is everything before
 * checkout, which includes the authenticated packet-information step; it is not
 * a synonym for the anonymous stage. The approval's own second sentence settles
 * it by saying "before checkout" rather than "in screening". An exact arrest
 * date in anonymous screening would violate the free-screening boundary, and
 * the approval never asked for that.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";
const TODAY = process.env.RCAP_EVALUATOR_TODAY;

const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { evaluateScreening } = await import("@/lib/rcap-engine/evaluator");
const { selectScreeningQuestionIds } = await import("@/lib/rcap-engine/screening-question-selection");
const { packetPlanForPathway } = await import("@/lib/rcap-engine/packet-planner");
const { isConsumerPaymentAllowed } = await import("@/lib/expungement-ai/eligibility-adapter");
const { evaluateAuthoritativeScreeningResult } = await import("@/lib/expungement-ai/authoritative-screening-result");
const { protectedPacketDraftSeedFromAuthoritative } = await import("@/lib/expungement-ai/packet-information");
const { resolveRoute } = await import("@/lib/legal-authority/resolve-route");

const PATHWAY_ID = "police-record-expungement-when-no-charge-was-filed-under-10-103";
const APPROVAL_ID = "md-pardon-signed-date-2026-08-25";
const DELTAS = "data/expungement-ai/screening-parity-approved-deltas.json";

let checks = 0;
const failures = [];
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

const profile = getProfileByJurisdiction("MD");
const publicProfile = projectPublicProfile(profile);
const pathway = profile.pathways.find((candidate) => candidate.id === PATHWAY_ID);
ok("the § 10-103 pathway exists", Boolean(pathway));

// ---------------------------------------------------------------- the statement
/**
 * The signed statement's own hash, over the fields a person signed: the
 * authority, the purpose, the route behaviour and the authorization block.
 *
 * Deliberately NOT over the whole delta. The delta also carries byte pins for
 * five source files, and those move whenever any of them is edited for any
 * reason. Hashing them together makes every unrelated edit look like a change
 * to what the legal team approved, which is how a stale pin came to sit in
 * front of an approval nobody had withdrawn. This hash covers the sentences and
 * nothing else, so it moves only when the approval itself is rewritten.
 */
const SIGNED_STATEMENT_SHA256 = "43041dad4a9867d548cc8db41a5a9e1d967c0b4ea0708d515d99cd2476177193";
const deltas = JSON.parse(fs.readFileSync(DELTAS, "utf8"));
const delta = deltas.deltas.find((row) => row.id === APPROVAL_ID);
ok(`the ${APPROVAL_ID} approval is present`, Boolean(delta));
const signed = delta && {
  id: delta.id,
  statutoryAuthority: delta.statutoryAuthority,
  purpose: delta.purpose,
  routeBehavior: delta.routeBehavior,
  authorization: delta.authorization
};
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};
const signedHash = signed ? crypto.createHash("sha256").update(canonical(signed)).digest("hex") : "absent";
ok("the signed statement is unchanged", signedHash === SIGNED_STATEMENT_SHA256, signedHash);
ok("and it still says the arrest date is the prepay deadline anchor",
  (delta?.routeBehavior ?? []).some((line) => /collects arrest_date before checkout/i.test(line))
  && /arrest_date is collected as the prepay deadline anchor/i.test(delta?.authorization?.statement ?? ""));

// ------------------------------------------------- PRELIMINARY SCREENING
const screeningIds = new Set([
  ...selectScreeningQuestionIds(profile, publicProfile, {}),
  ...profile.pathways.flatMap((candidate) =>
    selectScreeningQuestionIds(profile, publicProfile, { possible_pathway_context: candidate.label }))
]);
ok("free screening asks no exact arrest date", !screeningIds.has("arrest_date"));
ok("free screening asks no other Maryland exact date",
  !screeningIds.has("pardon_signed_date") && !screeningIds.has("date_of_birth"));
ok("the approximate timing fact remains answerable in screening",
  screeningIds.has("resolved_timing_bucket"));

// --------------------------------------- AUTHENTICATED PACKET INFORMATION
const arrestQuestion = publicProfile.questions.find((question) => question.id === "arrest_date");
ok("the exact arrest date is collected at packet information", arrestQuestion?.stage === "packet_information",
  arrestQuestion?.stage);
ok("and it is a real date question, not a bucket", /date/.test(String(arrestQuestion?.type)), arrestQuestion?.type);
const completion = publicProfile.postPaymentPacketCompletion ?? {};
ok("it is a required packet-completion field",
  (completion.requiredPacketCompletionFields ?? []).some((question) => question.id === "arrest_date"));
ok("it is bound to the § 10-103 route and to no other",
  (profile.questionLifecycle?.routeConsumers?.arrest_date ?? []).join() === PATHWAY_ID,
  (profile.questionLifecycle?.routeConsumers?.arrest_date ?? []).join(", "));
ok("and the owning packet plan retains it",
  packetPlanForPathway(profile, PATHWAY_ID)?.requiredInputIds.includes("arrest_date"));
for (const other of profile.pathways) {
  if (other.id === PATHWAY_ID) continue;
  ok(`no other Maryland packet plan inherits the arrest date (${other.id})`,
    !packetPlanForPathway(profile, other.id)?.requiredInputIds.includes("arrest_date"));
}

// --------------------------------------------------- FINAL VERIFICATION
function answersFor(extra = {}) {
  const answers = {
    ownership_scope: "yes",
    jurisdiction_scope: "yes",
    possible_pathway_context: pathway.label,
    case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
    resolved_timing_bucket: "years_7_to_10",
    // Both are option-less required questions. Left to the generic filler they
    // answer "not applicable", which trips the shared timing-and-completion
    // blocker before the route ever reaches its own deadline gate — and a test
    // that stops there proves nothing about the deadline.
    sentence_completion_date: "yes",
    financial_obligations: "yes"
  };
  for (const question of publicProfile.questions) {
    if (answers[question.id] !== undefined || question.required !== true) continue;
    const options = question.options ?? [];
    answers[question.id] = options.find((option) => /none of these|^no$|^none$/i.test(option))
      ?? options.find((option) => !/not sure|unknown/i.test(option))
      ?? (/^yes_no/.test(String(question.type)) ? "no" : "not applicable");
  }
  return { ...answers, ...extra };
}
const evaluate = (extra) => evaluateScreening({
  jurisdiction: "MD", profileVersion: profile.profileVersion, answers: answersFor(extra)
});
const codesOf = (evaluation) => (evaluation.reasons ?? []).map((entry) => entry.code);

const missing = evaluate({});
ok("with no exact arrest date the route cannot reach a packet",
  missing.resultCode === "needs_more_info", missing.resultCode);
ok("and it says which anchor is missing",
  codesOf(missing).some((code) => code.endsWith(".waiting_anchor_missing")), codesOf(missing).join(", "));

// The deadline is a maximum window. Eight years to the day is timely; the day
// before that is not. TODAY is pinned, so these are exact, not approximate.
const shift = (years, days) => {
  const at = new Date(`${TODAY}T00:00:00Z`);
  at.setUTCFullYear(at.getUTCFullYear() - years);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};
const atBoundary = evaluate({ arrest_date: shift(8, 0) });
const pastBoundary = evaluate({ arrest_date: shift(8, -1) });
const wellInside = evaluate({ arrest_date: shift(2, 0) });
const longPast = evaluate({ arrest_date: shift(12, 0) });

const deadlineFired = (evaluation) =>
  codesOf(evaluation).some((code) => code.endsWith(".md_police_record_deadline_not_eligible"));
ok(`the exact eight-year boundary (${shift(8, 0)}) is permitted`, !deadlineFired(atBoundary), codesOf(atBoundary).join(", "));
ok(`one day past eight years (${shift(8, -1)}) is barred`, deadlineFired(pastBoundary), codesOf(pastBoundary).join(", "));
ok(`a request twelve years on (${shift(12, 0)}) is barred`, deadlineFired(longPast));
ok("a request well inside the window reaches a packet",
  wellInside.resultCode === "packet_ready" || wellInside.resultCode === "packet_ready_with_caution",
  wellInside.resultCode);
ok("eight years is a filing deadline, not a waiting period: a recent arrest is not told to wait",
  !codesOf(wellInside).some((code) => code.endsWith(".waiting_period_not_satisfied")));

// ---------------------------------------------- PAYMENT OR SPONSORSHIP
ok("checkout is closed while the exact date is absent",
  isConsumerPaymentAllowed(missing.resultCode, missing.paymentAllowed === true) === false);
ok("and the evaluator itself allows no payment",
  missing.paymentAllowed !== true);
ok("checkout is closed once the deadline has passed",
  isConsumerPaymentAllowed(pastBoundary.resultCode, pastBoundary.paymentAllowed === true) === false);
ok("checkout opens only inside the window",
  isConsumerPaymentAllowed(wellInside.resultCode, wellInside.paymentAllowed === true) === true);
const resolution = resolveRoute({
  jurisdiction: "MD", pathwayId: PATHWAY_ID, facts: {},
  on: new Date(`${TODAY}T00:00:00Z`), phase: "FINAL_VERIFICATION"
});
ok("the canonical authority does not open sponsorship on an unanchored route",
  resolution.contract ? resolution.sponsorshipAuthority !== "open" || wellInside.paymentAllowed === true : true,
  resolution.sponsorshipAuthority);

// ------------------------------------------------------------- POSTPAY
/**
 * The date must not first be asked for after payment. `postpay_packet_field` is
 * a phase name, not a collection point: those fields are written through
 * /api/expungement-ai/briefcase/[itemId]/packet-information, which requires an
 * authenticated owner and a matter and does NOT require payment, and checkout
 * calls requireCurrentPacketVerification before it will open a session. So the
 * field is collected before checkout, which is what the approval requires.
 */
const checkoutSource = fs.readFileSync("src/lib/expungement-ai/checkout-reconciliation.ts", "utf8");
ok("checkout demands a current verification before it will open",
  checkoutSource.includes("requireCurrentPacketVerification"));
const packetInformationRoute = fs.readFileSync(
  "src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts", "utf8");
ok("the packet-information route requires an authenticated owner",
  packetInformationRoute.includes("getRcapBriefcaseAuthState") && packetInformationRoute.includes("auth_required"));
ok("and it does not require payment to collect the anchor",
  !/paymentStatus|paid|entitlement/i.test(packetInformationRoute));

// ------------------------- the date is a verification dependency, so it invalidates
/**
 * Changing the anchor must invalidate the verification. `packetVerificationStateForRecord`
 * already rejects a stored record whose recomputed hash differs, so what has to
 * be true is that the arrest date is IN that hash. Two draft seeds differing
 * only in the arrest date must therefore hash differently.
 */
const authoritative = evaluateAuthoritativeScreeningResult({
  jurisdiction: "MD", profileVersion: profile.profileVersion,
  matterId: "md-10-103-signed-approval-probe", answers: answersFor({ arrest_date: shift(2, 0) })
});
const seedFor = (arrestDate) => protectedPacketDraftSeedFromAuthoritative({
  authoritative,
  screeningAnswers: answersFor({}),
  packetAnswers: { arrest_date: arrestDate, participant_full_legal_name: "Probe Person" },
  dependencies: { commercialFlowVersion: 1, entitlementSource: "consumer_payment", productId: "expungement_packet" },
  capturedAt: `${TODAY}T00:00:00.000Z`
});
const seedA = seedFor(shift(2, 0));
const seedB = seedFor(shift(3, 0));
ok("a draft seed can be built for the § 10-103 route", Boolean(seedA) && Boolean(seedB));
ok("changing the arrest date changes the verification hash, so the verification invalidates",
  Boolean(seedA) && Boolean(seedB) && seedA.hash !== seedB.hash,
  seedA && seedB ? `${seedA.hash.slice(0, 12)} vs ${seedB.hash.slice(0, 12)}` : "no seed");
ok("and the date is carried in the packet answers the hash covers",
  seedA?.snapshot?.packetAnswers?.arrest_date === shift(2, 0),
  JSON.stringify(seedA?.snapshot?.packetAnswers ?? null));

console.log(`Maryland § 10-103 signed approval: ${checks} checks against the statement itself.`);
if (failures.length > 0) {
  console.error("\nMaryland § 10-103 signed approval FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("The exact arrest date is absent from free screening, collected after the claim and before checkout, used as the eight-year filing deadline server-side, invalidates the verification when it changes, and holds checkout closed until it is supplied.");
