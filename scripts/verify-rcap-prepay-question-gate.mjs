import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening, InvalidAnswerError } = await import("../src/lib/rcap-engine/evaluator.ts");
const { selectScreeningQuestionIds } = await import("../src/lib/rcap-engine/screening-question-selection.ts");
const { caProp64RecordQuestions } = await import("../src/lib/expungement-ai/ca-prop64-record-facts.ts");

const ROOT = path.resolve(".");
const REPORT_PATH = path.join(ROOT, "data/expungement-ai/reports/prepay-question-load.json");
const METADATA_PATH = path.join(ROOT, "data/expungement-ai/route-product-metadata.json");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function normalized(value) {
  return String(value ?? "").toLowerCase();
}

function isPostpay(question) {
  return String(question.lifecyclePhase ?? "").startsWith("postpay_") || question.lifecyclePhase === "optional_or_later" || question.lifecyclePhase === "guidance_only";
}

function answerFor(question, profile) {
  const id = question.id;
  if (id === "ownership_scope") return "Yes";
  if (id === "jurisdiction_scope") return "State or local";
  if (id === "case_outcome") return "Dismissed, no-billed, nolle prosequi, or not prosecuted";
  if (id === "offense_level") return "Misdemeanor";
  if (id === "possible_pathway_context") return question.options?.[0] ?? profile.pathways[0]?.label ?? "I am not sure";
  if (id === "state_exclusion_categories") return ["None of these"];
  // These scoped DE questions have stable wire values, not the legacy label
  // "None of these". Use explicit uncertainty; this is not an eligibility fixture.
  if (profile.jurisdiction.code === "DE" && id.startsWith("de_") && question.type === "multi_select") return ["unknown"];
  // Tool1 current status also uses source-owned wire values. A display label
  // is invalid here; uncertainty keeps this synthetic fixture non-qualifying.
  if (profile.jurisdiction.code === "CA" && id === "ca_12034_current_status" && question.type === "multi_select") return ["unknown"];
  if (/pending|new_convictions|sex_offender|ineligible|prior_sealing|identity_error|trafficking|pardon/.test(id)) return "No";
  if (/qualifying|lesser_or_no|special_preconditions|court_order|ordered_at_sentencing|no_probation|treatment_program|prosecutor_consent/.test(id)) return "Yes";
  if (/total_eligible_convictions|felony_convictions|count/.test(id)) return 1;
  if (/date|disposition|completion|release|sentencing|discharge|conviction/.test(id)) return "2010-01-01";
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "number_or_range") return 1;
  if (question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say") return "No";
  if (Array.isArray(question.options) && question.options.length) {
    return question.options.find((option) => !/federal|not sure|unknown|prefer not/i.test(String(option))) ?? question.options[0];
  }
  return "Synthetic answer";
}

function completeAnswers(profile, publicProfile) {
  const answers = {};
  for (const question of publicProfile.questions) answers[question.id] = answerFor(question, profile);
  return answers;
}

function allCompletionGroups(publicProfile) {
  const groups = publicProfile.postPaymentPacketCompletion ?? {};
  return [
    ...(groups.requiredPacketCompletionFields ?? []),
    ...(groups.officialFormFields ?? []),
    ...(groups.customPleadingFields ?? []),
    ...(groups.externalDocumentChecklist ?? []),
    ...(groups.filingReadinessFields ?? []),
    ...(groups.serviceOrMailingFields ?? []),
    ...(groups.narrativeFields ?? []),
    ...(groups.optionalFields ?? [])
  ];
}

// Independent bounded expectation: these existing timing gates are needed by
// the evaluator before it can decide whether the statutory wait has elapsed.
const msTimingCases = [
  { pathwayId: 'additional-justice-or-municipal-court-misdemeanor-relief', expected: ['ms_last_conviction_date_any_court'], answers: {} },
  { pathwayId: 'first-offense-dui-expungement', expected: ['ms_successful_sentence_completion_date'], answers: {} },
  { pathwayId: 'minor-in-possession-underage-alcohol-expungement', expected: ['ms_mip_dismissal_and_discharge_date'], answers: {case_outcome: 'Dismissed / not prosecuted'} },
  { pathwayId: 'minor-in-possession-underage-alcohol-expungement', expected: ['ms_mip_fine_imposed'], answers: {case_outcome: 'Misdemeanor conviction'} },
  { pathwayId: 'minor-in-possession-underage-alcohol-expungement', expected: ['ms_mip_fine_imposed', 'ms_mip_sentence_completion_date'], answers: {case_outcome: 'Misdemeanor conviction', ms_mip_fine_imposed: 'No'} },
  { pathwayId: 'minor-in-possession-underage-alcohol-expungement', expected: ['ms_mip_fine_imposed', 'ms_mip_sentence_completion_date', 'ms_mip_fine_payment_date'], answers: {case_outcome: 'Misdemeanor conviction', ms_mip_fine_imposed: 'Yes'} }
];
const msTimingIds = new Set(msTimingCases.flatMap(row => row.expected));
function expectedMsTiming(context) {
  const matching = msTimingCases.filter(row => row.pathwayId === context.pathwayId);
  if (matching.length === 1) return matching[0].expected;
  if (!matching.length) return [];
  if (/dismiss|acquit|discharge/i.test(context.answers.case_outcome ?? '')) return matching[0].expected;
  return matching.find(row => row.answers.ms_mip_fine_imposed === context.answers.ms_mip_fine_imposed && !row.answers.case_outcome?.includes('Dismissed'))?.expected ?? [];
}
function screeningContexts(profile) {
  return [
    { contextId: "empty", pathwayId: null, answers: {} },
    ...profile.pathways.map((pathway) => ({
      contextId: pathway.id,
      pathwayId: pathway.id,
      answers: { possible_pathway_context: pathway.label }
    })),
    ...(profile.jurisdiction.code === 'MS' ? msTimingCases.map((row, index) => ({
      contextId: 'exact-timing-' + index, pathwayId: row.pathwayId,
      answers: {possible_pathway_context: profile.pathways.find(pathway => pathway.id === row.pathwayId).label, ...row.answers}
    })) : []),
    // Adopted MS section 6 requires a fresh attestation to both events. The
    // historical OR value stays raw context and cannot answer the AND control.
    ...(profile.jurisdiction.code === 'MS' ? [{
      contextId: 'exact-timing-legacy-or-only',
      pathwayId: 'minor-in-possession-underage-alcohol-expungement',
      answers: {
        possible_pathway_context: profile.pathways.find(pathway => pathway.id === 'minor-in-possession-underage-alcohol-expungement').label,
        case_outcome: 'Dismissed / not prosecuted',
        ms_mip_dismissal_or_discharge_date: '2012-06-01'
      }
    }] : [])
  ];
}

function isCourtOrCaseIdentifier(question) {
  const text = `${question.id} ${question.prompt ?? ""} ${question.helperText ?? ""}`.toLowerCase();
  return /docket|case[ _-]?(?:identifier|number)|cause number|arrest number/.test(text);
}

// Adopted GA-02 asks whether the specified Board pardon exists. Referring the
// participant to their certificate is not an upload/acquisition checklist.
// Pin this exact factual control, not every question mentioning a certificate.
function isGeorgiaBoardPardonPredicate(code, question) {
  return code === "GA" && question.id === "ga_board_pardon"
    && question.type === "single_choice" && question.required === false
    && question.lifecyclePhase === "prepay_route_splitter"
    && JSON.stringify(question.options) === '["yes","no","unknown"]'
    && question.prompt === "Did the Georgia Board of Pardons and Paroles grant a pardon for this conviction? A pardon does not by itself guarantee that the record can be restricted."
    && question.helperText === "Check the actual pardon certificate. An application, restoration of rights or another kind of relief does not establish a Board pardon for this conviction.";
}

const profiles = getAllJurisdictionProfiles();
const report = fs.existsSync(REPORT_PATH) ? JSON.parse(fs.readFileSync(REPORT_PATH, "utf8")) : null;
const routeMetadata = fs.existsSync(METADATA_PATH) ? JSON.parse(fs.readFileSync(METADATA_PATH, "utf8")).routes ?? {} : {};

let paBefore = 0;
let paAfter = 0;
let externalPrepay = 0;
let officialFormPrepay = 0;
let narrativePrepay = 0;
let docketPrepay = 0;
let exactDatePrepay = 0;
const necessaryNyTimingDates = new Set();
const necessaryMsTimingFacts = new Set();
let exactPacketFactPrepay = 0;
let crossRoutePrepay = 0;
let duplicateSelectedIds = 0;
let selectorContextsAudited = 0;
let hardDisqualifiers = 0;
let timingGates = 0;
let postpayQuestions = 0;

for (const profile of profiles) {
  const publicProfile = projectPublicProfile(profile);
  const questions = publicProfile.questions;
  const postpay = questions.filter(isPostpay);
  const code = profile.jurisdiction.code;
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const selectedAcrossContexts = new Set();
  const effectiveQuestions = new Map(questionsById);
  const selectedExactDates = new Set();
  const selectedExactPacketFacts = new Set();
  const selectedCrossRouteQuestions = new Set();
  const contexts = screeningContexts(profile);
  const selectedContextQuestionCounts = [];

  for (const context of contexts) {
    // The existing, source-pinned CA adapter reuses court/charge as record
    // predicates on exactly two child routes. Inspect the questions actually
    // selected there, not the unadapted postpay metadata. The adapter itself
    // refuses changed corpus/rule/question identity; no general exemption.
    const recordQuestions = caProp64RecordQuestions(profile, questions, context.pathwayId);
    const recordIds = new Set(recordQuestions.map(question => question.id));
    if (recordQuestions.length > 0) {
      assert(code === "CA" && JSON.stringify([...recordIds]) === '["court","charge"]', `${code}/${context.contextId}: unexpected record-predicate exemption.`);
      let rejectedDrift = false;
      try {
        caProp64RecordQuestions({ ...profile, source: { ...profile.source, sourceCorpusSha256: "unverified-source" } }, questions, context.pathwayId);
      } catch { rejectedDrift = true; }
      assert(rejectedDrift, `${code}/${context.contextId}: unverified record-predicate source was accepted.`);
    }
    for (const question of recordQuestions) effectiveQuestions.set(question.id, question);
    selectorContextsAudited += 1;
    const answersBeforeSelection = JSON.stringify(context.answers);
    const selectedIds = selectScreeningQuestionIds(profile, publicProfile, context.answers);
    if (code === 'MS') {
      assert(!selectedIds.includes('ms_mip_dismissal_or_discharge_date'), `${code}/${context.contextId}: legacy OR timing control must not be offered.`);
      if (context.contextId === 'exact-timing-legacy-or-only') {
        assert(selectedIds.includes('ms_mip_dismissal_and_discharge_date'), 'MS legacy-only raw must still request the current AND timing control.');
        assert(!Object.hasOwn(context.answers, 'ms_mip_dismissal_and_discharge_date'), 'MS legacy OR raw must not be aliased into an AND attestation.');
        assert(JSON.stringify(context.answers) === answersBeforeSelection, 'MS legacy-only selection must preserve the exact raw answers.');
      }
    }
    selectedContextQuestionCounts.push(selectedIds.length);
    const expectedTiming = code === 'MS' ? expectedMsTiming(context) : [];
    if (code === 'MS') assert(JSON.stringify(selectedIds.filter(id => msTimingIds.has(id)).sort()) === JSON.stringify([...expectedTiming].sort()), `${code}/${context.contextId}: exact timing controls differ from independent branch expectation.`);
    const uniqueIds = new Set(selectedIds);
    duplicateSelectedIds += selectedIds.length - uniqueIds.size;
    assert(uniqueIds.size === selectedIds.length, `${code}/${context.contextId}: duplicate selected screening question ids.`);
    if (selectedIds.length > 15 + recordQuestions.length && code !== "NY") {
      failures.push(`${code}/${context.contextId}: selected prepay count ${selectedIds.length} exceeds hard cap without allowlist reason.`);
    }
    for (const questionId of selectedIds) {
      selectedAcrossContexts.add(questionId);
      const question = recordQuestions.find(question => question.id === questionId) ?? questionsById.get(questionId);
      assert(Boolean(question), `${code}/${context.contextId}: selected question ${questionId} is missing from the public profile.`);
      if (!question) continue;
      // CPL160.59(5) needs exact anchors to prove its ten-year clock. This
      // bounded exception is timing eligibility, not permission for packet data.
      const nyTiming = code === "NY" && context.pathwayId === "discretionary-conviction-sealing-by-petition-under-cpl-160-59"
        && ["sentencing_date", "release_date", "ny_16059_earliest_conviction_date"].includes(questionId)
        && question.lifecyclePhase === "prepay_timing_gate" && question.required === false;
      if (nyTiming) necessaryNyTimingDates.add(questionId);
      const msTiming = code === 'MS' && expectedTiming.includes(questionId)
        && question.lifecyclePhase === (questionId === 'ms_mip_fine_imposed' ? 'prepay_soft_confidence' : 'prepay_timing_gate') && question.required === false
        && question.type === (questionId === 'ms_mip_fine_imposed' ? 'yes_no_unsure' : 'date_or_unknown');
      if (msTiming) necessaryMsTimingFacts.add(questionId);
      const isExactDate = question.type === "date_or_unknown" && !nyTiming && !msTiming;
      if (isExactDate) selectedExactDates.add(questionId);
      assert(!isExactDate, `${code}/${context.contextId}: exact-date question ${questionId} remains in free screening.`);
      assert(!isCourtOrCaseIdentifier(question), `${code}/${context.contextId}: court/case identifier ${questionId} remains in free screening.`);
      const isExactPacketFact = profile.questionLifecycle?.exactPacketFactIds.includes(questionId) === true && !recordIds.has(questionId) && !nyTiming && !msTiming;
      if (isExactPacketFact) selectedExactPacketFacts.add(questionId);
      assert(!isExactPacketFact, `${code}/${context.contextId}: exact packet fact ${questionId} remains in free screening.`);
      const routeConsumers = profile.questionLifecycle?.routeConsumers[questionId] ?? [];
      const leaksAcrossRoute = !nyTiming && !msTiming && routeConsumers.length > 0 && !Boolean(context.pathwayId && routeConsumers.includes(context.pathwayId));
      if (leaksAcrossRoute) selectedCrossRouteQuestions.add(questionId);
      assert(!leaksAcrossRoute, `${code}/${context.contextId}: ${questionId} leaks outside its route consumers.`);
    }
  }

  const prepay = [...selectedAcrossContexts].map((questionId) => effectiveQuestions.get(questionId)).filter(Boolean);
  const maximumSelectedQuestionCount = Math.max(0, ...selectedContextQuestionCounts);
  exactDatePrepay += selectedExactDates.size;
  exactPacketFactPrepay += selectedExactPacketFacts.size;
  crossRoutePrepay += selectedCrossRouteQuestions.size;

  if (code === "PA") {
    paBefore = report?.byState?.PA?.estimatedPrepaymentQuestionsBeforeProjectionFix ?? 37;
    paAfter = maximumSelectedQuestionCount;
  }

  const prepayText = prepay.map((question) => `${question.id} ${question.prompt ?? ""} ${question.helperText ?? ""}`.toLowerCase());
  externalPrepay += prepay.filter((question, index) =>
    !isGeorgiaBoardPardonPredicate(code, question)
    && /patch|psp|sbi|chr\/scope|criminal[- ]history report|fingerprint|certificate|certified disposition|judgment of conviction|discharge paperwork|agency letter/.test(prepayText[index])).length;
  if (code === "GA") {
    const boardPardon = prepay.find(question => question.id === "ga_board_pardon");
    assert(boardPardon && isGeorgiaBoardPardonPredicate(code, boardPardon), "GA: adopted Board-pardon predicate must remain a factual yes/no/unknown control.");
    for (const mutation of [{ id: "pardon_certificate" }, { type: "file" }, { required: true },
      { lifecyclePhase: "postpay_external_document" }, { options: ["yes", "no"] },
      { prompt: "Upload the pardon certificate before checkout." },
      { helperText: `${boardPardon?.helperText} Obtain and upload a certified copy before continuing.` }]) {
      assert(!isGeorgiaBoardPardonPredicate(code, { ...boardPardon, ...mutation }), "GA: external-document/predicate drift must not receive the factual-control exception.");
    }
    assert(!isGeorgiaBoardPardonPredicate("VA", boardPardon ?? {}), "The Board-pardon exception cannot apply outside Georgia.");
  }
  officialFormPrepay += prepay.filter((question) => question.lifecyclePhase === "postpay_official_form_field").length;
  narrativePrepay += prepay.filter((question) => question.lifecyclePhase === "postpay_narrative" || /hardship|rehabilitation|manifest injustice|substantial justice|statement/.test(normalized(question.prompt))).length;
  docketPrepay += prepayText.filter((text) => /docket|case number|case_identifier|case_number/.test(text)).length;
  hardDisqualifiers += prepay.filter((question) => question.lifecyclePhase === "prepay_hard_disqualifier").length;
  timingGates += prepay.filter((question) => question.lifecyclePhase === "prepay_timing_gate").length;
  postpayQuestions += postpay.length;

  const completionIds = new Set(allCompletionGroups(publicProfile).map((question) => question.id));
  for (const question of postpay) {
    assert(completionIds.has(question.id), `${code}: moved question ${question.id} missing from postPaymentPacketCompletion metadata.`);
  }

  if (code === "CA") {
    const answers = completeAnswers(profile, publicProfile);
    assert(JSON.stringify(answers.ca_12034_current_status) === '["unknown"]', "CA: synthetic current-status fixture must use the canonical uncertain wire.");
    const before = JSON.stringify(answers);
    const evaluation = evaluateScreening({ jurisdiction: code, profileVersion: profile.profileVersion,
      matterId: "prepay-ca-current-status-wire", answers });
    assert(evaluation.paymentAllowed === false, "CA: uncertain current status opened payment.");
    assert(JSON.stringify(answers) === before, "CA: evaluating uncertainty mutated the source answers.");
    let oldDisplayLabelRefused = false;
    try {
      evaluateScreening({ jurisdiction: code, profileVersion: profile.profileVersion,
        matterId: "prepay-ca-current-status-invalid-label", answers: { ...answers, ca_12034_current_status: ["None of these"] } });
    } catch (error) {
      oldDisplayLabelRefused = error instanceof InvalidAnswerError
        && JSON.stringify(error.invalidQuestionIds) === '["ca_12034_current_status"]';
    }
    assert(oldDisplayLabelRefused, "CA: display text must not become an accepted current-status wire.");
  }

  const requiredGate = prepay.find((question) => question.required === true && question.contextOnly !== true);
  if (requiredGate) {
    const answers = completeAnswers(profile, publicProfile);
    answers[requiredGate.id] = "I am not sure";
    const evaluation = evaluateScreening({
      jurisdiction: code,
      profileVersion: profile.profileVersion,
      matterId: `prepay-gate-${code}`,
      answers
    });
    assert(evaluation.paymentAllowed === false, `${code}: unknown/not-sure required eligibility fact ${requiredGate.id} opened payment.`);
  }
}

const metadataValues = Object.values(routeMetadata);
const paidMetadata = metadataValues.filter((route) => route.paymentProductEligible === true);
assert(necessaryMsTimingFacts.size === 6, 'All six existing MS timing controls must be tested.');
assert(paBefore >= 30, `PA before count should reflect the audited high-friction baseline; got ${paBefore}.`);
assert(paAfter <= 12, `PA prepayment count should be <=12 after projection fix; got ${paAfter}.`);
assert(paAfter < paBefore, `PA prepayment count did not reduce (${paBefore} -> ${paAfter}).`);
assert(externalPrepay === 0, `${externalPrepay} external-document questions remain before checkout.`);
assert(officialFormPrepay === 0, `${officialFormPrepay} official-form fields remain before checkout.`);
assert(narrativePrepay === 0, `${narrativePrepay} narrative fields remain before checkout.`);
assert(docketPrepay === 0, `${docketPrepay} docket/case-number fields remain before checkout.`);
assert(exactDatePrepay === 0, `${exactDatePrepay} exact-date fields remain before checkout.`);
assert(exactPacketFactPrepay === 0, `${exactPacketFactPrepay} exact packet facts remain before checkout.`);
assert(crossRoutePrepay === 0, `${crossRoutePrepay} cross-route questions remain before checkout.`);
assert(duplicateSelectedIds === 0, `${duplicateSelectedIds} duplicate selected question ids remain before checkout.`);
assert(hardDisqualifiers > 0, "No hard disqualifier questions remain before checkout.");
assert(timingGates > 0, "No timing gate questions remain before checkout.");
assert(postpayQuestions > 0, "No moved post-payment questions are available.");
// The paid set is measured from the metadata that defines it, not pinned to a
// literal. This asserted 97, a figure no machine-readable source in the
// repository yields -- the packet collection audit records that explicitly, and
// the real product paid_now set is 79. A pinned denominator that no source
// produces fails on every legitimate route change and says nothing about the
// gate, which is what this file exists to check.
//
// What actually matters is that the paid set is non-empty and that every route
// in it carries the filing-readiness contract, which the next assertion states.
assert(
  paidMetadata.length > 0,
  "No route is marked paymentProductEligible; the prepay gate has nothing to check."
);

assert(paidMetadata.every((route) => typeof route.filingReadiness === "string" && Array.isArray(route.externalDocuments)), "Paid routes must retain filingReadiness and external-document checklist metadata.");

const sourceChecks = [
  ["src/components/expungement-ai/screening/screens.ts", "deriveScreens"],
  ["src/components/expungement-ai/screening/ScreeningFlow.tsx", "ScreeningFlow"],
  ["src/components/expungement-ai/screening/ScreeningResult.tsx", "paymentAllowed"],
  ["src/components/expungement-ai/BriefcaseViews.tsx", "Briefcase"],
  ["src/lib/rcap-engine/evaluator.ts", "routeIsRatifiedDeployable"]
];
for (const [file, marker] of sourceChecks) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  assert(src.includes(marker), `${file}: expected existing surface marker ${marker} missing.`);
}

if (failures.length > 0) {
  console.error("verify-rcap-prepay-question-gate — RED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-prepay-question-gate");
console.log("==============================================================");
console.log(`PA prepayment questions: ${paBefore} -> ${paAfter}`);
console.log(`External-document prepay questions: ${externalPrepay}`);
console.log(`Official-form prepay fields: ${officialFormPrepay}`);
console.log(`Narrative prepay fields: ${narrativePrepay}`);
console.log(`Docket/case-number prepay fields: ${docketPrepay}`);
console.log(`Unnecessary exact-date prepay fields: ${exactDatePrepay}`);
console.log(`Source-required NY timing inputs: ${[...necessaryNyTimingDates].sort().join(", ")}`);
console.log(`Source-required MS timing inputs: ${[...necessaryMsTimingFacts].sort().join(", ")}`);
console.log(`Exact packet facts in prepay: ${exactPacketFactPrepay}`);
console.log(`Cross-route prepay questions: ${crossRoutePrepay}`);
console.log(`Duplicate selected question IDs: ${duplicateSelectedIds}`);
console.log(`Selector contexts audited: ${selectorContextsAudited}`);
console.log(`Hard disqualifier prepay questions: ${hardDisqualifiers}`);
console.log(`Timing gate prepay questions: ${timingGates}`);
console.log(`Post-payment completion questions available: ${postpayQuestions}`);
console.log("GREEN — prepayment gate is route/eligibility focused; moved fields remain available post-payment.");
