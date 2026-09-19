#!/usr/bin/env node
/**
 * The Nevada NRS 176A.245 / .265 / .295 branch control.
 *
 * Nevada's three chapter 176A sealing sections are identical to one another and
 * carry two mechanisms. Subsection 1 is automatic: the court seals the record
 * itself, the participant files nothing, and there is nothing to sell.
 * Subsection 2 is a petition the participant files, not sooner than seven years
 * after a conditional dismissal or a set-aside of a judgment, and only where the
 * charge was under NRS 200.485, NRS 484C.110 or NRS 484C.120.
 *
 * The packet specification already marked its petition, proposed order,
 * declaration and filing instructions conditional on
 * `subsection_2_petition_branch`. Nothing evaluated that string, so the branch
 * existed only as a note: screening told BOTH branches the same thing
 * (`needs_review`, "the source-specific waiting period needs review"), and the
 * composer dropped all four components without saying so.
 *
 * This control asserts the behaviour the branch is supposed to produce, in both
 * directions, at every boundary it crosses: routing, payment, collection and
 * composition. It is written against invariants, not counts — it never asserts
 * "there are four conditional documents" — so a specification that gains or
 * loses a branch-conditional component still passes, and a composer that stops
 * distinguishing the branches still fails.
 *
 * Sources: data/record-clearing/legal-design-intake/NV.memo.json track
 * `nv_seal_probation_family`, and
 * data/record-clearing/legal-decisions/2026-09-19-case-mode-resolutions-nv-ct-ks.json.
 */

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { routeSafetyGateFactIds } = await import("../src/lib/expungement-ai/packet-route-safety.ts");
const { packetFulfillmentAuthority } = await import("../src/lib/expungement-ai/packet-fulfillment-authority.ts");
const NV = await import("../src/lib/rcap-engine/nevada-176a-branch.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const JURISDICTION = "NV";
const PATHWAY_ID = "probation-or-specialty-court-dismissal-set-aside-sealing";
const ROUTE_KEY = `${JURISDICTION}:${PATHWAY_ID}`;

check(NV.NEVADA_176A_ROUTE_KEY === ROUTE_KEY, "the branch module names the route this control measures");

// ---------------------------------------------------------------------------
// 1. The resolver reads the sections, not a shape.
//
// Subsection 2 needs BOTH conjuncts. Every other combination is subsection 1,
// and anything unanswered or unsure is unresolved. Enumerated exhaustively so a
// resolver that silently widens either branch fails here first.
// ---------------------------------------------------------------------------

const CHARGES = [NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_CHARGE_OTHER, NV.NEVADA_176A_CHARGE_UNSURE, ""];
const DISPOSITIONS = [
  NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE,
  NV.NEVADA_176A_DISPOSITION_ORDINARY_DISMISSAL,
  NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL,
  NV.NEVADA_176A_DISPOSITION_SET_ASIDE,
  NV.NEVADA_176A_DISPOSITION_UNSURE,
  ""
];

const branchFacts = (charge, disposition) => ({
  [NV.NEVADA_176A_CHARGE_FACT_ID]: charge,
  [NV.NEVADA_176A_DISPOSITION_FACT_ID]: disposition
});

const expectedBranch = (charge, disposition) => {
  const known = (value, unsure) => value !== "" && value !== unsure;
  if (!known(charge, NV.NEVADA_176A_CHARGE_UNSURE) || !known(disposition, NV.NEVADA_176A_DISPOSITION_UNSURE)) {
    return "unresolved";
  }
  const opensPetition = disposition === NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL
    || disposition === NV.NEVADA_176A_DISPOSITION_SET_ASIDE;
  return charge === NV.NEVADA_176A_CHARGE_NAMED && opensPetition ? "subsection_2_petition" : "subsection_1_automatic";
};

let combinations = 0;
let resolverWrong = [];
for (const charge of CHARGES) {
  for (const disposition of DISPOSITIONS) {
    combinations += 1;
    const actual = NV.nevada176ABranch(branchFacts(charge, disposition));
    const wanted = expectedBranch(charge, disposition);
    if (actual !== wanted) resolverWrong.push(`${charge || "(blank)"} + ${disposition || "(blank)"} => ${actual}, expected ${wanted}`);
  }
}
check(combinations === CHARGES.length * DISPOSITIONS.length, `every answer combination is exercised (${combinations})`);
check(resolverWrong.length === 0, `the branch resolver matches the sections on every combination${resolverWrong.length ? `: ${resolverWrong.join("; ")}` : ""}`);

const petitionCombinations = CHARGES.flatMap((charge) => DISPOSITIONS
  .filter((disposition) => NV.nevada176ABranch(branchFacts(charge, disposition)) === "subsection_2_petition")
  .map((disposition) => [charge, disposition]));
check(
  petitionCombinations.length > 0 && petitionCombinations.every(([charge]) => charge === NV.NEVADA_176A_CHARGE_NAMED),
  "no answer that does not name one of NRS 200.485, 484C.110 or 484C.120 opens the petition branch"
);

// ---------------------------------------------------------------------------
// 2. The branch is asked before Checkout, and asked as a fact rather than a
//    document.
// ---------------------------------------------------------------------------

const profile = getProfileByJurisdiction(JURISDICTION);
const publicProfile = projectPublicProfile(profile);
const publicById = new Map(publicProfile.questions.map((question) => [question.id, question]));

for (const factId of NV.NEVADA_176A_BRANCH_FACT_IDS) {
  const question = publicById.get(factId);
  check(Boolean(question), `${factId} is published as a public screening question`);
  if (!question) continue;
  check(question.required === true, `${factId} is required, so the branch cannot be skipped`);
  check(Array.isArray(question.options) && question.options.length > 1, `${factId} is answered by choosing, never by typing`);
  const text = `${question.prompt} ${question.helperText ?? ""}`.toLowerCase();
  check(
    !/(upload|attach|scan|photograph|copy of|certified|do you have|bring your)/.test(text),
    `${factId} asks for a fact about the case, not for a document the participant must hold`
  );
}

const gateFactIds = routeSafetyGateFactIds(JURISDICTION, PATHWAY_ID);
check(
  NV.NEVADA_176A_BRANCH_FACT_IDS.every((factId) => gateFactIds.includes(factId)),
  "both branch facts are route-safety gate facts, so the collection policy keeps them ahead of Checkout"
);

// ---------------------------------------------------------------------------
// 3. Screening: the three treatments, and payment closed on all of them.
// ---------------------------------------------------------------------------

const baseAnswers = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  offense_level: "Misdemeanor",
  possible_pathway_context: "Probation or specialty-court dismissal / set-aside sealing",
  disposition_date: "2015-01-05",
  resolved_timing_bucket: "gt_10_years",
  pending_cases: "No",
  pardon_status: "No"
};

const screen = (charge, disposition, extra = {}) => evaluateScreening({
  jurisdiction: JURISDICTION,
  profileVersion: profile.profileVersion,
  answers: { ...baseAnswers, ...branchFacts(charge, disposition), ...extra }
});

const subsection1 = [
  [NV.NEVADA_176A_CHARGE_OTHER, NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE],
  [NV.NEVADA_176A_CHARGE_OTHER, NV.NEVADA_176A_DISPOSITION_SET_ASIDE],
  [NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_ORDINARY_DISMISSAL],
  [NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE]
];
for (const [charge, disposition] of subsection1) {
  const evaluation = await screen(charge, disposition);
  const label = `${charge} / ${disposition}`;
  check(evaluation.resultCode === "guidance_only", `subsection 1 (${label}) resolves to guidance, not a packet (got ${evaluation.resultCode})`);
  check(evaluation.paymentAllowed === false, `subsection 1 (${label}) never opens payment`);
  const said = evaluation.reasons.map((entry) => entry.text).join(" ");
  check(/seal/i.test(said) && /do not file|files nothing|not file a petition|nothing to pay/i.test(said),
    `subsection 1 (${label}) is told the court seals it and they file nothing`);
}

const subsection2 = [
  [NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL],
  [NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_SET_ASIDE]
];
for (const [charge, disposition] of subsection2) {
  const evaluation = await screen(charge, disposition);
  const label = `${charge} / ${disposition}`;
  check(evaluation.resultCode !== "guidance_only", `subsection 2 (${label}) is not sent to the automatic branch`);
  check(evaluation.pathwayId === PATHWAY_ID, `subsection 2 (${label}) keeps the one route identity — Nevada is not split`);

  // The seven-year rule is the route's own, and it is now executed rather than
  // deferred. Before the branch existed, both branches came back needs_review
  // with `waiting_rule_not_executed`, which is a failure to compute.
  const tooSoon = await screen(charge, disposition, { disposition_date: "2024-03-01", resolved_timing_bucket: "years_1_to_2" });
  check(tooSoon.resultCode === "not_yet", `subsection 2 (${label}) inside seven years is not yet (got ${tooSoon.resultCode})`);
  check(tooSoon.paymentAllowed === false, `subsection 2 (${label}) inside seven years never opens payment`);
  check(
    evaluation.reasons.every((entry) => entry.code !== `${JURISDICTION.toLowerCase()}.waiting_rule_not_executed`)
    && tooSoon.reasons.every((entry) => entry.code !== `${JURISDICTION.toLowerCase()}.waiting_rule_not_executed`),
    `subsection 2 (${label}) executes the seven-year rule rather than deferring it`
  );
}

const unresolvedPairs = [
  [NV.NEVADA_176A_CHARGE_UNSURE, NV.NEVADA_176A_DISPOSITION_SET_ASIDE],
  [NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_UNSURE],
  [NV.NEVADA_176A_CHARGE_UNSURE, NV.NEVADA_176A_DISPOSITION_UNSURE]
];
for (const [charge, disposition] of unresolvedPairs) {
  const evaluation = await screen(charge, disposition);
  const label = `${charge} / ${disposition}`;
  check(evaluation.resultCode === "needs_more_info", `an unestablished branch (${label}) fails closed (got ${evaluation.resultCode})`);
  check(evaluation.paymentAllowed === false, `an unestablished branch (${label}) never opens payment`);
  check(
    NV.NEVADA_176A_BRANCH_FACT_IDS.every((factId) => (evaluation.missingQuestionIds ?? []).includes(factId)),
    `an unestablished branch (${label}) names the questions that decide it`
  );
  check(evaluation.resultCode !== "guidance_only", `an unestablished branch (${label}) is never called automatic — that would hide a real petition`);
}

// ---------------------------------------------------------------------------
// 4. No route requirement is invented by the branch.
//
// Subsection 2 is a real participant petition. It still sells nothing until a
// Grade-A fulfillment record proves this exact route and packet family, which is
// separate from the branch and must stay separate.
// ---------------------------------------------------------------------------

const fulfillment = packetFulfillmentAuthority(JURISDICTION, PATHWAY_ID);
check(
  fulfillment.proven !== true,
  "the branch opens no commercial authority of its own: the route still has no Grade-A fulfillment record"
);
for (const [charge, disposition] of subsection2) {
  const evaluation = await screen(charge, disposition);
  check(evaluation.paymentAllowed === false, `subsection 2 (${charge} / ${disposition}) stays payment-closed while the route has no Grade-A record`);
}

// ---------------------------------------------------------------------------
// 5. Composition: the petition set follows the branch, and an unestablished
//    branch refuses rather than composing either shape.
// ---------------------------------------------------------------------------

const specification = packetSpecificationFor(ROUTE_KEY);
const branchConditional = specification.documents.filter((document) =>
  document.requirement === "conditional" && document.includeWhen === NV.NEVADA_176A_PETITION_BRANCH_CONDITION);
check(branchConditional.length > 0, "the specification still gates components on the petition branch");
const alwaysIncluded = specification.documents.filter((document) => document.requirement === "required");
check(alwaysIncluded.length > 0, "the specification still ships components on both branches");

const petitionFacts = {
  participant_full_legal_name: "Jordan Alvarez",
  date_of_birth: "1988-04-02",
  mailing_address: "410 Fremont Street, Las Vegas, NV 89101",
  phone_number: "702-555-0148",
  email_address: "jordan@example.com",
  charge_wording: "Battery constituting domestic violence",
  court_identity: "Las Vegas Justice Court, Clark County",
  order_court_identity: "Las Vegas Justice Court, Clark County",
  declared_programme: "NRS 176A.240 substance-use treatment programme",
  programme_section: "NRS 176A.240",
  declared_resolution: "Charges conditionally dismissed",
  resolution_kind: "Conditional dismissal",
  resolution_date: "2015-01-05",
  disposition_date: "2015-01-05",
  case_number: "15C-000123",
  order_case_number: "15C-000123",
  underlying_case_number: "15C-000123",
  county_name: "Clark",
  agencies_and_officers: "Las Vegas Metropolitan Police Department; Clark County District Attorney",
  named_agencies_and_officers: "Las Vegas Metropolitan Police Department; Clark County District Attorney",
  terms_and_conditions_fulfilled: "Yes",
  discharge_type: "Honourable"
};

const compose = (charge, disposition) => {
  try {
    return { ok: true, packet: composeGradeAPacket(specification, {
      routeKey: ROUTE_KEY,
      jurisdiction: JURISDICTION,
      pathwayId: PATHWAY_ID,
      facts: { ...petitionFacts, ...branchFacts(charge, disposition) },
      verificationHash: "nevada-176a-branch-control",
      verifiedAt: "2026-09-19T00:00:00.000Z",
      generationPurpose: "internal_review"
    }) };
  } catch (error) {
    return { ok: false, message: String(error?.message ?? error) };
  }
};

const branchConditionalIds = new Set(branchConditional.map((document) => document.documentId));

// The specification's own guidance and declaration sections carry no body text
// and no spec block to render from, so the composer refuses on the section kind
// before it can emit anything. That is a separate Nevada specification gap and
// it blocks BOTH branches identically, so this control measures the branch
// decision where the branch decision is made — at the include gate — and says so
// rather than pretending the route renders.
const SECTION_GAP = /section kind "(route_detection|route_branch_screen|discharge_type_screen|declaration)"/;

const petitionAttempt = compose(NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL);
const automaticAttempt = compose(NV.NEVADA_176A_CHARGE_OTHER, NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE);
const unresolvedAttempt = compose(NV.NEVADA_176A_CHARGE_UNSURE, NV.NEVADA_176A_DISPOSITION_SET_ASIDE);

check(
  petitionAttempt.ok || !/conditional on/.test(petitionAttempt.message),
  `an established petition branch passes the include gate (got: ${petitionAttempt.ok ? "composed" : petitionAttempt.message.slice(0, 160)})`
);
check(
  automaticAttempt.ok || !/conditional on/.test(automaticAttempt.message),
  `an established automatic branch passes the include gate (got: ${automaticAttempt.ok ? "composed" : automaticAttempt.message.slice(0, 160)})`
);
check(
  !unresolvedAttempt.ok && /conditional on/.test(unresolvedAttempt.message),
  "an unestablished branch refuses at the include gate rather than composing either shape"
);
for (const documentId of branchConditionalIds) {
  check(
    !unresolvedAttempt.ok && unresolvedAttempt.message.includes(documentId),
    `the refusal names ${documentId} rather than dropping it silently`
  );
}
check(
  !petitionAttempt.ok && SECTION_GAP.test(petitionAttempt.message),
  "the next Nevada blocker is the specification's bodiless sections, not the branch"
    + (petitionAttempt.ok ? " (the route now composes — update this control)" : "")
);

// The include decision itself, measured directly rather than through the
// section gap: the petition set is in the plan on one branch and out on the
// other, and nothing about the always-shipped set changes.
const { includedDocumentIdsForFacts } = await import("../src/lib/rcap/grade-a/composer.ts");
if (typeof includedDocumentIdsForFacts === "function") {
  const onPetition = new Set(includedDocumentIdsForFacts(specification, { ...petitionFacts, ...branchFacts(NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL) }));
  const onAutomatic = new Set(includedDocumentIdsForFacts(specification, { ...petitionFacts, ...branchFacts(NV.NEVADA_176A_CHARGE_OTHER, NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE) }));
  check([...branchConditionalIds].every((id) => onPetition.has(id)), "every branch-conditional component is planned on the petition branch");
  check([...branchConditionalIds].every((id) => !onAutomatic.has(id)), "no branch-conditional component is planned on the automatic branch");
  check(
    alwaysIncluded.every((document) => onPetition.has(document.documentId) && onAutomatic.has(document.documentId)),
    "the components the specification ships on both branches are planned on both"
  );
} else {
  check(false, "the composer exports includedDocumentIdsForFacts so the include decision can be measured without a full render");
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
