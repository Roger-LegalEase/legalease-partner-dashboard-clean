import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

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

function isPrepay(question) {
  return String(question.lifecyclePhase ?? "").startsWith("prepay_");
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

/**
 * Pre-payment question ceilings.
 *
 * The cap keeps the free record check short. UX-GLOBAL-019 raised several
 * states past 15 by putting the shared facts the evaluator consumes before it
 * will open a packet onto a rendered screen; before that correction those facts
 * were consumed and never asked, and a participant answering everything they
 * were shown could not reach the outcome the engine would reach. Each state
 * over the general cap is listed here with its own ceiling, so the gate still
 * fails when a state grows past what was reviewed, and a state not listed still
 * fails at 16.
 */
const GENERAL_PREPAY_CAP = 15;
const PREPAY_CAP_ALLOWLIST = {
  NY: { ceiling: 22, reason: "CPL 160.59 conviction counting is asked before the route is known. Pre-existing." },
  AK: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  CA: { ceiling: 17, reason: "UX-GLOBAL-019 shared facts" },
  DC: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  FL: { ceiling: 17, reason: "UX-GLOBAL-019 shared facts" },
  GA: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  IL: { ceiling: 17, reason: "UX-GLOBAL-019 shared facts" },
  MD: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  ME: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  MO: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  MT: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  NJ: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  SC: { ceiling: 17, reason: "UX-GLOBAL-019 shared facts" },
  SD: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  TX: { ceiling: 16, reason: "UX-GLOBAL-019 shared facts" },
  VA: { ceiling: 17, reason: "UX-GLOBAL-019 shared facts" },
  WI: { ceiling: 18, reason: "UX-GLOBAL-019 shared facts" },
  WV: { ceiling: 17, reason: "UX-GLOBAL-019 shared facts" },
  WY: { ceiling: 17, reason: "UX-GLOBAL-019 shared facts" }
};

const profiles = getAllJurisdictionProfiles();
const report = fs.existsSync(REPORT_PATH) ? JSON.parse(fs.readFileSync(REPORT_PATH, "utf8")) : null;
const routeMetadata = fs.existsSync(METADATA_PATH) ? JSON.parse(fs.readFileSync(METADATA_PATH, "utf8")).routes ?? {} : {};

let paBefore = 0;
let paAfter = 0;
let externalPrepay = 0;
let officialFormPrepay = 0;
let narrativePrepay = 0;
let docketPrepay = 0;
let hardDisqualifiers = 0;
let timingGates = 0;
let postpayQuestions = 0;

for (const profile of profiles) {
  const publicProfile = projectPublicProfile(profile);
  const questions = publicProfile.questions;
  const prepay = questions.filter(isPrepay);
  const postpay = questions.filter(isPostpay);
  const code = profile.jurisdiction.code;

  if (code === "PA") {
    paBefore = report?.byState?.PA?.estimatedPrepaymentQuestionsBeforeProjectionFix ?? 37;
    paAfter = prepay.length;
  }

  const prepayText = prepay.map((question) => `${question.id} ${question.prompt ?? ""} ${question.helperText ?? ""}`.toLowerCase());
  externalPrepay += prepayText.filter((text) => /patch|psp|sbi|chr\/scope|criminal[- ]history report|fingerprint|certificate|certified disposition|judgment of conviction|discharge paperwork|agency letter/.test(text)).length;
  officialFormPrepay += prepay.filter((question) => question.lifecyclePhase === "postpay_official_form_field").length;
  narrativePrepay += prepay.filter((question) => question.lifecyclePhase === "postpay_narrative" || /hardship|rehabilitation|manifest injustice|substantial justice|statement/.test(normalized(question.prompt))).length;
  // What the question ASKS for, not where the answer can be found. The helper on
  // disposition_date says the date is usually on the court docket, which is
  // useful guidance and not a request for a docket number; matching it counted
  // 28 date questions as docket fields once UX-GLOBAL-019 made that date prepay.
  docketPrepay += prepay
    .map((question) => `${question.id} ${question.prompt ?? ""}`.toLowerCase())
    .filter((text) => /docket number|case number|case_identifier|case_number|docket_number/.test(text)).length;
  hardDisqualifiers += prepay.filter((question) => question.lifecyclePhase === "prepay_hard_disqualifier").length;
  timingGates += prepay.filter((question) => question.lifecyclePhase === "prepay_timing_gate").length;
  postpayQuestions += postpay.length;

  const ceiling = PREPAY_CAP_ALLOWLIST[code]?.ceiling ?? GENERAL_PREPAY_CAP;
  if (prepay.length > ceiling) {
    failures.push(`${code}: prepay count ${prepay.length} exceeds its ceiling of ${ceiling}${PREPAY_CAP_ALLOWLIST[code] ? ` (${PREPAY_CAP_ALLOWLIST[code].reason})` : " without allowlist reason"}.`);
  }

  const completionIds = new Set(allCompletionGroups(publicProfile).map((question) => question.id));
  for (const question of postpay) {
    assert(completionIds.has(question.id), `${code}: moved question ${question.id} missing from postPaymentPacketCompletion metadata.`);
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
assert(paBefore >= 30, `PA before count should reflect the audited high-friction baseline; got ${paBefore}.`);
assert(paAfter <= 12, `PA prepayment count should be <=12 after projection fix; got ${paAfter}.`);
assert(paAfter < paBefore, `PA prepayment count did not reduce (${paBefore} -> ${paAfter}).`);
assert(externalPrepay === 0, `${externalPrepay} external-document questions remain before checkout.`);
assert(officialFormPrepay === 0, `${officialFormPrepay} official-form fields remain before checkout.`);
assert(narrativePrepay === 0, `${narrativePrepay} narrative fields remain before checkout.`);
assert(docketPrepay === 0, `${docketPrepay} docket/case-number fields remain before checkout.`);
assert(hardDisqualifiers > 0, "No hard disqualifier questions remain before checkout.");
assert(timingGates > 0, "No timing gate questions remain before checkout.");
assert(postpayQuestions > 0, "No moved post-payment questions are available.");
assert(paidMetadata.length === 97, `Expected 97 paid route metadata rows; got ${paidMetadata.length}.`);
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
console.log(`Hard disqualifier prepay questions: ${hardDisqualifiers}`);
console.log(`Timing gate prepay questions: ${timingGates}`);
console.log(`Post-payment completion questions available: ${postpayQuestions}`);
console.log("GREEN — prepayment gate is route/eligibility focused; moved fields remain available post-payment.");
