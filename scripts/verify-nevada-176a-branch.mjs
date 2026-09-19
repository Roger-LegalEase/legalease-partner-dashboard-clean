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

import { readFileSync } from "node:fs";
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
const { documentContractFor } = await import("../src/lib/rcap/grade-a/document-contract.ts");
const { routeSafetyGateFactIds } = await import("../src/lib/expungement-ai/packet-route-safety.ts");
const { packetFulfillmentAuthority } = await import("../src/lib/expungement-ai/packet-fulfillment-authority.ts");
const { friendlyMissingFieldLabel, safeUserFacingEngineText } = await import("../src/lib/expungement-ai/missing-fields.ts");
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
  pardon_status: "No",
  // Subsection 3 answered in the negative, so the bar is out of the way and the
  // branch is what these cases measure. The bar has its own section below.
  [NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]: NV.NEVADA_176A_EXCLUDED_CHARGE_NO
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
  [NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]: NV.NEVADA_176A_EXCLUDED_CHARGE_NO,
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

// ---------------------------------------------------------------------------
// 6. Subsection 3 — a bar on both branches, not a third branch.
//
// "The court may not order sealing under the section where the defendant was
// charged with a violation of NRS 200.508 or NRS 200.5099, whether the
// defendant was discharged from probation, the case was dismissed, or the
// judgment of conviction was set aside."
//
// The approved petition asserts in terms that the petitioner was not so
// charged, so this is not a note: until it is asked, the packet would have a
// participant swear to something the product never established.
// ---------------------------------------------------------------------------

const barQuestion = publicById.get(NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID);
check(Boolean(barQuestion), "the subsection 3 bar is published as a public screening question");
check(barQuestion?.required === true, "the subsection 3 bar is required, so the route cannot proceed without it");
check(
  Array.isArray(barQuestion?.options) && barQuestion.options.length > 1,
  "the subsection 3 bar is answered by choosing, never by typing"
);
check(
  gateFactIds.includes(NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID),
  "the subsection 3 bar is a route-safety gate fact, so it resolves before Checkout"
);

const withBar = (barAnswer, charge, disposition) => evaluateScreening({
  jurisdiction: JURISDICTION,
  profileVersion: profile.profileVersion,
  answers: {
    ...baseAnswers,
    ...branchFacts(charge, disposition),
    [NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]: barAnswer
  }
});

// Both branches, because the bar reaches both. A bar that only closed the
// petition branch would leave a barred participant being told their record
// seals automatically, which is the more harmful of the two errors.
for (const [label, charge, disposition] of [
  ["petition branch", NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL],
  ["automatic branch", NV.NEVADA_176A_CHARGE_OTHER, NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE]
]) {
  const barred = await withBar(NV.NEVADA_176A_EXCLUDED_CHARGE_YES, charge, disposition);
  check(barred.resultCode === "likely_not_eligible", `a barred charge on the ${label} is not eligible (got ${barred.resultCode})`);
  check(barred.paymentAllowed === false, `a barred charge on the ${label} never opens payment`);
  check(barred.resultCode !== "guidance_only", `a barred charge on the ${label} is not told the record seals automatically`);

  const unsure = await withBar(NV.NEVADA_176A_EXCLUDED_CHARGE_UNSURE, charge, disposition);
  check(unsure.resultCode === "needs_review", `an unanswered bar on the ${label} fails closed (got ${unsure.resultCode})`);
  check(unsure.paymentAllowed === false, `an unanswered bar on the ${label} never opens payment`);
}

// ---------------------------------------------------------------------------
// 7. English and Spanish, on every surface these questions reach.
//
// They are route- and payment-deciding, so an English-only fallback would leave
// a Spanish-speaking participant unable to establish whether they should file
// anything or pay anything. The reason texts are checked by exact English,
// because that is how the runtime resolver finds their Spanish: if the module
// and the copy map drift apart, the lookup silently returns English.
// ---------------------------------------------------------------------------

for (const factId of NV.NEVADA_176A_ROUTE_SAFETY_FACT_IDS) {
  const question = publicById.get(factId);
  if (!question) continue;
  const spanishPrompt = question.translations?.es?.prompt;
  check(Boolean(spanishPrompt) && spanishPrompt !== question.prompt, `${factId} has a Spanish prompt that is not the English one`);
  check(
    !question.helperText || Boolean(question.translations?.es?.helperText),
    `${factId} has Spanish helper text wherever it has English helper text`
  );
  const options = question.options ?? [];
  const translatedOptions = options.filter((option) => {
    const display = question.optionDisplay?.[option];
    const spanish = display?.translations?.es?.label;
    return Boolean(spanish) && spanish !== option;
  });
  check(
    translatedOptions.length === options.length,
    `every one of ${factId}'s ${options.length} options has a Spanish label (${translatedOptions.length} translated)`
  );
  const englishLabel = friendlyMissingFieldLabel(factId, null, "en");
  const spanishLabel = friendlyMissingFieldLabel(factId, null, "es");
  check(
    Boolean(spanishLabel) && spanishLabel !== englishLabel && !/^tell us more about/i.test(englishLabel),
    `${factId} has friendly missing-field copy in both languages, not a humanized field id`
  );
}

for (const [name, text] of [
  ["the subsection 1 guidance", NV.NEVADA_176A_SUBSECTION_1_GUIDANCE],
  ["the unresolved-branch text", NV.NEVADA_176A_UNRESOLVED_BRANCH_TEXT],
  ["the subsection 3 bar text", NV.NEVADA_176A_SUBSECTION_3_BARRED_TEXT],
  ["the unresolved-bar text", NV.NEVADA_176A_SUBSECTION_3_UNRESOLVED_TEXT]
]) {
  const english = safeUserFacingEngineText(text, { locale: "en" });
  const spanish = safeUserFacingEngineText(text, { locale: "es" });
  check(english === text, `${name} reaches the participant in English unchanged`);
  check(spanish !== english && spanish.length > 0, `${name} reaches the participant in Spanish`);
}

// ---------------------------------------------------------------------------
// 8. Required-fact completeness: every value the documents consume has an
//    authoritative owner, and no unnecessary question was created.
//
// The owner-adopted field map
// (scripts/build-census-v1-nv_seal_probation_family-set.mjs, adopted
// 2026-09-02) already classified every one of these. This asserts the
// specification agrees with it: the values the platform generates are required
// facts, the values the participant writes on the printed page are declared
// blanks, and nothing is in both or in neither.
// ---------------------------------------------------------------------------

const declaredFacts = new Set(specification.requiredFacts.map((required) => required.factId));
const declaredBlanks = new Set(specification.fieldOwnership?.participantCompletesBeforeFilingFields ?? []);
const consumed = new Set(specification.documents.flatMap((document) => document.sections
  .flatMap((section) => [
    ...(section.fields ?? []),
    ...(section.assertions ?? []).flatMap((assertion) => assertion.facts),
    ...[...String(section.body ?? "").matchAll(/\{\{([a-z0-9_]+)\}\}/g)].map((match) => match[1])
  ])));

check(consumed.size > 0, `the documents consume values to classify (${consumed.size})`);
const unclassified = [...consumed].filter((id) => !declaredFacts.has(id) && !declaredBlanks.has(id)).sort();
check(
  unclassified.length === 0,
  `every value the documents consume is either a required fact or a declared blank${unclassified.length ? `; unclassified: ${unclassified.join(", ")}` : ""}`
);
const bothWays = [...declaredBlanks].filter((id) => declaredFacts.has(id)).sort();
check(bothWays.length === 0, `no value is both a required fact and a blank${bothWays.length ? `: ${bothWays.join(", ")}` : ""}`);

// No unnecessary question: a declared blank must never be something the
// participant is asked for before Checkout. That is the whole point of the
// bucket — the approved design leaves these as lines on the page precisely
// because a value typed weeks earlier is likelier wrong than blank.
const askedBeforeCheckout = [...declaredBlanks].filter((id) => publicById.has(id)).sort();
check(
  askedBeforeCheckout.length === 0,
  `no participant-completable blank is also a screening question${askedBeforeCheckout.length ? `: ${askedBeforeCheckout.join(", ")}` : ""}`
);

// The blanks are blanks in the render, not missing facts: composing with every
// required fact present and every blank absent must get past the fact gate.
const blanksAbsent = Object.fromEntries(Object.entries(petitionFacts).filter(([id]) => !declaredBlanks.has(id)));
let blankComposition;
try {
  composeGradeAPacket(specification, {
    routeKey: ROUTE_KEY, jurisdiction: JURISDICTION, pathwayId: PATHWAY_ID,
    facts: { ...blanksAbsent, ...branchFacts(NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL) },
    verificationHash: "nevada-176a-branch-control", verifiedAt: "2026-09-19T00:00:00.000Z",
    generationPurpose: "internal_review"
  });
  blankComposition = "";
} catch (error) {
  blankComposition = String(error?.message ?? error);
}
check(
  !/required fact\(s\) are missing/.test(blankComposition),
  `the eleven participant-completable blanks are not demanded as facts (got: ${blankComposition.slice(0, 160) || "composed"})`
);

// ---------------------------------------------------------------------------
// 9. The declaration's requirement state, encoded as its own record declares it.
//
// Approved wording is not approved requirement state. The owner adoption of
// 2026-09-02 named this family under the general qualification and named it in
// none of the eight withholding answers, and its Q7 ruling is that a
// component's requirement state comes from the family's own record and that
// changing it takes a new legal-design decision. So the rule to encode is the
// one NV.memo states — conditional, accompanying the subsection 2 petition —
// and NOT "required" merely because approved text exists for it.
// ---------------------------------------------------------------------------

const declaration = specification.documents.find((document) => document.role === "declaration_and_verification");
check(Boolean(declaration), "the declaration is still a component of this family");
check(
  declaration?.requirement === "conditional",
  `the declaration is conditional, not universally required (got ${declaration?.requirement})`
);
check(
  declaration?.includeWhen === NV.NEVADA_176A_PETITION_BRANCH_CONDITION,
  "the declaration's condition is the subsection 2 petition branch, which is the rule its own record states"
);
check(
  documentContractFor(declaration).formApplicability === "custom_document_permitted",
  "the declaration is recorded as permitted rather than as a required official form, matching sections that prescribe no verification"
);
check(
  documentContractFor(declaration).executionType === "signature",
  "the declaration is signed, not sworn or notarised — the sections prescribe neither"
);

// Q7 compliance for this family: no component its own record declares required
// is absent from the specification.
const memoTrack = JSON.parse(readFileSync(path.join(rootDir, "data/record-clearing/legal-design-intake/NV.memo.json"), "utf8"))
  .tracks.find((track) => (track.trackId ?? track.id) === "nv_seal_probation_family");
const declaredRoles = new Map((memoTrack?.components ?? []).map((component) => [component.role, component.requirement]));
const specRoles = new Map(specification.documents.map((document) => [document.role, document.requirement]));
check(declaredRoles.size > 0, `the family record declares its components (${declaredRoles.size})`);
const missingRequired = [...declaredRoles].filter(([role, requirement]) => requirement === "required" && !specRoles.has(role)).map(([role]) => role);
check(missingRequired.length === 0, `no component the family record declares required is absent${missingRequired.length ? `: ${missingRequired.join(", ")}` : ""}`);
const requirementDrift = [...declaredRoles]
  .filter(([role, requirement]) => specRoles.has(role) && specRoles.get(role) !== requirement)
  .map(([role, requirement]) => `${role}: record says ${requirement}, specification says ${specRoles.get(role)}`);
check(requirementDrift.length === 0, `every component's requirement state matches its own record${requirementDrift.length ? `; ${requirementDrift.join("; ")}` : ""}`);
check(
  [...specRoles.keys()].every((role) => declaredRoles.has(role)) && specRoles.size === declaredRoles.size,
  `the component set is the adopted one, neither widened nor narrowed (${specRoles.size} vs ${declaredRoles.size})`
);

// ---------------------------------------------------------------------------
// 10. The adopted text is in the specification, and the specification is what
//     composes. The build script is the recovery source, not a hidden runtime
//     dependency.
// ---------------------------------------------------------------------------

const composedPetition = compose(NV.NEVADA_176A_CHARGE_NAMED, NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL);
const composedAutomatic = compose(NV.NEVADA_176A_CHARGE_OTHER, NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE);
check(composedPetition.ok, `the petition branch composes${composedPetition.ok ? "" : `: ${composedPetition.message.slice(0, 160)}`}`);
check(composedAutomatic.ok, `the automatic branch composes${composedAutomatic.ok ? "" : `: ${composedAutomatic.message.slice(0, 160)}`}`);

if (composedPetition.ok && composedAutomatic.ok) {
  const petitionIds = composedPetition.packet.documents.map((document) => document.documentId);
  const automaticIds = composedAutomatic.packet.documents.map((document) => document.documentId);
  check([...branchConditionalIds].every((id) => petitionIds.includes(id)), "every branch-conditional component is composed on the petition branch");
  check([...branchConditionalIds].every((id) => !automaticIds.includes(id)), "no branch-conditional component is composed on the automatic branch");

  const blocks = composedPetition.packet.documents.flatMap((document) => document.blocks);
  const prose = blocks
    .flatMap((block) => [block.text, block.heading, block.introduction, ...(block.items ?? []).flatMap((item) => [item.label, item.value])])
    .filter((value) => typeof value === "string" && value.length > 0)
    .join("\n");

  check(prose.length > 4000, `the composed packet carries real adopted text, not headings alone (${prose.length} characters)`);
  check(
    !/\{\{[a-z0-9_]+\}\}|\{[a-zA-Z]+\}/.test(prose),
    "no unresolved token reaches the composed packet"
  );
  check(
    !/TO BE CONFIRMED|\bTBD\b|\[[A-Z ]{3,}\]/i.test(prose),
    "no placeholder stands in for a value the participant writes"
  );

  // Sentences that exist only in the adopted family text. If the specification
  // ever loses them again, this fails rather than quietly shipping headings.
  for (const sentence of [
    "ONE QUESTION decides whether anything in this packet is filed",
    "BARRED ON BOTH BRANCHES",
    "USE THIS PETITION ONLY ON THE SUBSECTION 2 BRANCH",
    "The petitioner was not charged with a violation of NRS 200.508 or NRS 200.5099",
    "I declare under penalty of perjury that the foregoing is true and correct",
    "the branch, not the section, decides everything"
  ]) {
    check(prose.includes(sentence), `the adopted text survives transcription: "${sentence.slice(0, 52)}…"`);
  }

  // The captions are explicit: a named blank with its instruction, never an
  // empty value and never a placeholder token.
  const captions = blocks.filter((block) => block.kind === "pleading_caption");
  check(captions.length > 0, `the filed components carry captions (${captions.length})`);
  check(
    captions.every((caption) => caption.courtBlank === true && caption.caseNumberBlank === true),
    "every caption's court and case number is a declared blank, as the adopted filing expects"
  );
  check(
    captions.every((caption) => Boolean(caption.courtInstruction) && Boolean(caption.caseNumberInstruction)),
    "every caption blank carries the instruction that tells the participant what to write there"
  );
  check(
    captions.every((caption) => caption.court === "" && caption.caseNumber === ""),
    "no caption blank is filled with a value, a placeholder or a guess"
  );
  check(
    captions.every((caption) => Boolean(caption.matterTitle)),
    "the captions are the in-the-matter-of form this family uses, not a plaintiff-versus-defendant caption it has no parties for"
  );

  // No blank was eliminated by inventing a question for it.
  const blankItems = blocks.flatMap((block) => (block.items ?? []).filter((item) => item.blank === true));
  check(blankItems.length > 0, `the composed packet prints participant-completable blanks (${blankItems.length})`);
  check(blankItems.every((item) => item.value === ""), "a printed blank carries no value");
  check(blankItems.every((item) => item.label.trim().length > 0), "every printed blank is labelled, so the participant knows what to write");
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
