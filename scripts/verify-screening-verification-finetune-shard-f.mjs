#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { routesForJurisdiction } = await import("../src/lib/legal-authority/index.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { ROUTE_ESCALATION_FACT_IDS } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");
const { selectScreeningQuestionIds } = await import("../src/lib/rcap-engine/screening-question-selection.ts");

const ROOT = process.cwd();
const PROFILE_ROOT = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const EVIDENCE_PATH = path.join(ROOT, "data/expungement-ai/screening-verification-finetune/shard-f.json");
const MANIFEST_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/flow-manifest.json");
const RECONCILIATION_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/FINAL_CANDIDATE_RECONCILIATION.json");
const EVALUATOR_PATH = path.join(ROOT, "src/lib/rcap-engine/evaluator.ts");

const expected = {
  LA: {
    file: "LA-louisiana.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "arrest_date", "court", "case_number", "charge", "record_documents", "county_or_filing_location"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  ME: {
    file: "ME-maine.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  MD: {
    file: "MD-maryland.json",
    routeConsumers: {
      pardon_signed_date: ["pardoned-conviction-expungement-under-crim-proc-10-105-a-8"],
      arrest_date: ["police-record-expungement-when-no-charge-was-filed-under-10-103"]
    },
    exactPacketFactIds: ["county", "court", "charge", "record_documents", "case_identifier", "pardon_signed_date", "arrest_date"],
    completionAliasIds: []
  },
  MA: {
    file: "MA-massachusetts.json",
    routeConsumers: {},
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  MI: {
    file: "MI-michigan.json",
    routeConsumers: {},
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  MN: {
    file: "MN-minnesota.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  MS: {
    file: "MS-mississippi.json",
    routeConsumers: {},
    exactPacketFactIds: ["arrest_date", "ms_last_conviction_date_any_court", "ms_successful_sentence_completion_date", "ms_mip_dismissal_or_discharge_date", "ms_mip_sentence_completion_date", "ms_mip_fine_imposed", "ms_mip_fine_payment_date"],
    completionAliasIds: []
  },
  MO: {
    file: "MO-missouri.json",
    // The § 311.326 clock is one fact in two forms: an approximate threshold in
    // free screening and an exact date of birth behind the claim. Only the
    // exact one is a packet fact; the threshold is a route-scoped screening
    // question and must never be treated as an exact date.
    routeConsumers: {
      mo_at_least_twenty_two: ["first-minor-in-possession-alcohol-expungement-under-311-326"],
      date_of_birth: ["first-minor-in-possession-alcohol-expungement-under-311-326"]
    },
    exactPacketFactIds: ["disposition_date", "arrest_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier", "date_of_birth"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  MT: {
    file: "MT-montana.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "county", "court", "charge", "record_documents"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  }
};

// Item11: exact MD source-stage metadata and MT no-filing effective-date successors.
// Historical pins remain below; no other profile surface is admitted.
const legalSurfaceSuccessors = {
  MD: { prior: '36be6bbc3d24856bd12dd39a700ba70a783b6131d35cc7b1b7298e176bac4e2d', current: 'bd0b611760fa85e664b42251c353033361c691e1ca75a2611b5b0955c2156a53' },
  MT: { prior: '0097fa8710970de4209af06ed911f6dada0c557484d4bd7dda07eb9af4eced37', current: 'd1dc5f78502c559d913a7114e5bc08c8574e8fe716c0d7180bf370532cf92496' }
};
const legalSurfaceHashes = {
  // Rehashed for Batch B: Louisiana gained a contract for the art. 977(D)/998
  // route and had two ungated LD-LA-05 contracts superseded by gated ones.
  //
  // Rehashed again for the service-branch projection (78e79be41, 2026-09-05,
  // pre-baseline). Purely additive: six new leaves, nothing changed, nothing
  // removed. One serviceBranches entry on pathway 10 citing
  // NATIONAL-2026-08-28-B-LA-03, outcomeMode referral, packetFamily null.
  // Nothing became sellable.
  LA: "cb912598c285c0a7f598e42b10c87eae0c8d7372414f656090b6a3d3d85c2bec",
  // Rehashed for Batch B: Maine had no route contracts at all except juvenile
  // sealing; § 2264, § 2264(7) and § 703(2) all gained one.
  ME: "e4fae698f3f5d1ccb5973f02afddfa9bf4a119d87db9a755ca8633c2e77fbfbd",
  // Rehashed for the service-branch projection (78e79be41, 2026-09-05,
  // pre-baseline). Purely additive: six new leaves, nothing changed, nothing
  // removed. One serviceBranches entry on pathway 2 citing LD-MD-03,
  // outcomeMode automatic_relief, packetFamily null.
  MD: "36be6bbc3d24856bd12dd39a700ba70a783b6131d35cc7b1b7298e176bac4e2d",
  // Rehashed for the 2026-09-02 terminalization of the §§ 100K / 100K-1/4
  // marijuana route (78e79be41, 2026-09-05, pre-baseline). This one is not
  // additive and is named in full because it moves commercial state, in the
  // closing direction: pathway 6 goes filingRequired true -> false, routeType
  // court_filing -> automatic_guidance, outcomeMode participant_packet ->
  // guidance_status, paymentAuthority packet_checkout -> closed, packetFamily
  // -> null, and its two packetComponents are removed. A route stopped selling;
  // none started.
  MA: "88a60b013f1e0d6cbc0703173e8f4480eb5f3261ca18f8924b57deb995a7aa00",
  MI: "38f6e24e9049ebdfe33db2449554f3c0a32c538dc302cde240d9a62258bf163e",
  MN: "a5917918b52c8a856f9f95a5e59833c6ff50fd568d003565b86929e4104a70c8",
  MS: "ec89b172562919c1e963b0560eee1c5119f202622864cb0bda0b447e1005e9b2",
  // Rehashed for the § 311.326 fact-model correction: the exact birth date
  // moved behind the claim and an approximate threshold took its place in
  // screening. Both questions live in the legal surface, so the hash moves.
  MO: "a9aec1523f2317ce007d82cd6e2ad0dccba1e3e0211cf2921333965dc3a08583",
  // Rehashed for the service-branch projection (78e79be41, 2026-09-05,
  // pre-baseline). Purely additive: six new leaves, nothing changed, nothing
  // removed. One serviceBranches entry on pathway 1 citing LD-MT-03,
  // outcomeMode automatic_relief, packetFamily null.
  MT: "0097fa8710970de4209af06ed911f6dada0c557484d4bd7dda07eb9af4eced37"
};

const projectionPacketFacts = new Set([
  "MD:arrest_date",
  "MO:date_of_birth",
  "MS:arrest_date",
  "MS:ms_last_conviction_date_any_court",
  "MS:ms_successful_sentence_completion_date",
  "MS:ms_mip_dismissal_or_discharge_date",
  "MS:ms_mip_sentence_completion_date",
  "MS:ms_mip_fine_imposed",
  "MS:ms_mip_fine_payment_date"
]);

// Historical Lane F evidence is immutable. Later exact source contracts are
// checked separately; these do not turn a legacy hint/completion into a fact.
// Reuse accepted GA10 original139/373, MS timing e30e/1522, MS program-event,
// MO custody and MT deferred source controls; no new legal meaning is inferred.
const historicalSelectedQuestionCounts = {LA:{emptyContext:9,maxExactRoute:9},ME:{emptyContext:11,maxExactRoute:11},MD:{emptyContext:13,maxExactRoute:13},MA:{emptyContext:9,maxExactRoute:9},MI:{emptyContext:10,maxExactRoute:10},MN:{emptyContext:9,maxExactRoute:9},MS:{emptyContext:7,maxExactRoute:7},MO:{emptyContext:11,maxExactRoute:12},MT:{emptyContext:11,maxExactRoute:11}};
const sourceMsTimingCases = [
  {pathwayId:'additional-justice-or-municipal-court-misdemeanor-relief',answers:{},expected:['ms_last_conviction_date_any_court']},
  {pathwayId:'first-offense-dui-expungement',answers:{},expected:['ms_successful_sentence_completion_date']},
  {pathwayId:'minor-in-possession-underage-alcohol-expungement',answers:{case_outcome:'Dismissed / not prosecuted'},expected:['ms_mip_dismissal_and_discharge_date']},
  {pathwayId:'minor-in-possession-underage-alcohol-expungement',answers:{case_outcome:'Misdemeanor conviction'},expected:['ms_mip_fine_imposed']},
  {pathwayId:'minor-in-possession-underage-alcohol-expungement',answers:{case_outcome:'Misdemeanor conviction',ms_mip_fine_imposed:'No'},expected:['ms_mip_fine_imposed','ms_mip_sentence_completion_date']},
  {pathwayId:'minor-in-possession-underage-alcohol-expungement',answers:{case_outcome:'Misdemeanor conviction',ms_mip_fine_imposed:'Yes'},expected:['ms_mip_fine_imposed','ms_mip_sentence_completion_date','ms_mip_fine_payment_date']}
];
const sourceMsTimingIds = new Set(sourceMsTimingCases.flatMap(row=>row.expected));
const baseMsTimingFor = pathwayId => pathwayId===sourceMsTimingCases[0].pathwayId ? sourceMsTimingCases[0].expected
  : pathwayId===sourceMsTimingCases[1].pathwayId ? sourceMsTimingCases[1].expected
    : pathwayId===sourceMsTimingCases[3].pathwayId ? sourceMsTimingCases[3].expected : [];
// Literal paid money is independent of nonfinancial completion. This exception
// is only the exact unchanged question in these four original Lane F profiles.
const literalFinancialStates = new Set(['LA','ME','MO','MT']);
const literalFinancialControl = (state,question) => literalFinancialStates.has(state)
  && question?.id==='financial_obligations' && question.type==='yes_no_unsure'
  && question.prompt==='Have you paid off everything the court charged?';
const currentFlowSuccessors = {
 'EXPAI-MO-1bfe3f224f': {rawSha:'d0ee19438bad783732ee3fb1d2081ef77ebaf2689ad2320c973e7b70b200abc8',terminal:'needs_more_info',reason:'mo.marijuana_custody_missing',missing:['mo_marijuana_custody_posture'],basis:'LD-MO-03 / accepted test-ga10-mo-marijuana-custody'},
 'EXPAI-MS-167b6649e0': {rawSha:'dd7bac50d237cddac9f778294960cb89f338c5e07f4d3e8eb3859e0a09570592',terminal:'needs_more_info',reason:'ms.conditional_discharge_record_facts_missing',missing:['ms_program_order','ms_program_record_status'],basis:'LD-MS-01 / accepted test-ms-conditional-discharge-event'},
 'EXPAI-MS-82b9254c9f': {rawSha:'0c28e917749c8082d72d97ccc370192ee6657c62f083734b488eeeea8fc5a88c',terminal:'needs_more_info',reason:'ms.program_completion_event_missing',missing:['ms_program_order','ms_program_record_status','ms_program_final_disposition','ms_program_arrest_release'],basis:'LD-MS-01 / accepted test-ms-program-completion-events'},
 'EXPAI-MS-9c7d692811': {rawSha:'0199a9afa6374dea45ccab8b5c92d2b6312362f0bfb1371be424712a6fc5586f',terminal:'needs_review',reason:'ms.felony_route_case_outcome_conflict',missing:[],basis:'LD-MS-01 / accepted test-ms-felony-record-class-safety'},
 'EXPAI-MS-c80f911e03': {rawSha:'dc158ad6c558e0b626422dc067b915bde1ceb252629e3cb63bfc544b4e622bec',terminal:'needs_more_info',reason:'ms.program_completion_event_missing',missing:['ms_program_order','ms_program_record_status','ms_program_final_disposition','ms_program_arrest_release'],basis:'LD-MS-01 / accepted test-ms-program-completion-events'},
 'EXPAI-MT-50958fd557': {rawSha:'fe88cd4f9796ac4eba352f7631e258ea2c9954c2e8a00dacdddbe6e22bafc27e',terminal:'needs_more_info',reason:'mt.deferred_facts_unresolved',missing:['mt_deferred_order_type'],basis:'LD-MT-03 / accepted test-ga10-mt-deferred-facts'}
};
const currentSourceSelectionObservations = {};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const equal = (actual, wanted, message) => {
  try { assert.deepEqual(actual, wanted); } catch { failures.push(`${message}: got ${JSON.stringify(actual)}`); }
};

/**
 * What this froze, and what it froze it against.
 *
 * The original contract was: § 311.326 runs on an exact anchor, one year from
 * `twenty_first_birthday`, and must never be coarsened into a timing bucket.
 * The coarsening rule still holds. The anchor does not: `twenty_first_birthday`
 * asked an anonymous person for their birth date, and no Missouri profile
 * published the question, so the rule it guarded could not evaluate against
 * anything.
 *
 * The corrected contract keeps the clock exact and moves it behind the claim.
 * Twenty-two years from the date of birth is one year past the twenty-first
 * birthday. Where no date of birth exists yet, screening answers an approximate
 * threshold and says so; it never substitutes a bucket for the clock.
 */
function missouriMipExactClockViolations(source) {
  const start = source.indexOf('if (key === "MO:first-minor-in-possession-alcohol-expungement-under-311-326")');
  const end = start < 0 ? -1 : source.indexOf("\n  }\n", start);
  const branch = start < 0 || end < 0 ? "" : source.slice(start, end + 5);
  const violations = [];
  if (!branch) violations.push("missing exact MO §311.326 timing branch");
  if (!branch.includes("parseDateAnswer(answers.date_of_birth)")) violations.push("MO §311.326 exact anchor changed");
  if (!branch.includes('addDuration(born, 22, "years")')) violations.push("MO §311.326 twenty-two-year duration changed");
  if (!branch.includes("answers.mo_at_least_twenty_two")) violations.push("MO §311.326 lost its approximate screening threshold");
  if (branch.includes("resolved_timing_bucket") || branch.includes("RESOLVED_TIMING_BUCKET_FIELD_ID")) violations.push("MO §311.326 uses a coarse timing bucket");
  return violations;
}

const evaluatorSource = fs.readFileSync(EVALUATOR_PATH, "utf8");
equal(missouriMipExactClockViolations(evaluatorSource), [], "MO §311.326 exact-clock contract changed");
const exactClockMutations = [
  // The exact date of birth replaced by the coarse bucket.
  evaluatorSource.replace("parseDateAnswer(answers.date_of_birth)", "parseDateAnswer(answers.resolved_timing_bucket)"),
  // Twenty-two years silently shortened to twenty-one: eligible a year early.
  evaluatorSource.replace('addDuration(born, 22, "years")', 'addDuration(born, 21, "years")'),
  // The route key renamed, so the branch never runs.
  evaluatorSource.replace(
    'if (key === "MO:first-minor-in-possession-alcohol-expungement-under-311-326")',
    'if (key === "MO:mutated-minor-in-possession-route")'
  ),
  // The exact clock deleted, leaving only the approximate screening threshold.
  evaluatorSource.replace("const born = parseDateAnswer(answers.date_of_birth);", "const born = undefined;"),
  // The approximate threshold deleted, leaving screening unable to answer.
  evaluatorSource.replace("const threshold = answers.mo_at_least_twenty_two;", "const threshold = undefined;")
];
for (const [index, mutation] of exactClockMutations.entries()) {
  check(missouriMipExactClockViolations(mutation).length > 0, `MO §311.326 exact-clock mutation ${index + 1} survived`);
}
const selectPublicQuestionIds = (profile, publicProfile, selectedPathwayLabel = "", additionalAnswers = {}) => {
  return selectScreeningQuestionIds(profile, publicProfile, selectedPathwayLabel
    ? { possible_pathway_context: selectedPathwayLabel, ...additionalAnswers }
    : additionalAnswers);
};
const selectedQuestionCounts = {};
const normalizedSelectedQuestionCounts = {};

for (const [state, spec] of Object.entries(expected)) {
  const profile = readJson(path.join(PROFILE_ROOT, spec.file));
  const publicProfile = projectPublicProfile(profile);
  const publicQuestionIds = new Set(publicProfile.questions.map((question) => question.id));
  const rawQuestionById = new Map(profile.questions.map((question) => [question.id, question]));
  const pathwayIds = new Set(profile.pathways.map((pathway) => pathway.id));
  const authorityRoutes = routesForJurisdiction(state);

  const lifecycle = profile.questionLifecycle;
  check(Boolean(lifecycle), `${state}: missing questionLifecycle`);
  if (!lifecycle) continue;
  equal(Object.keys(lifecycle).sort(), ["completionAliasIds", "exactPacketFactIds", "routeConsumers"], `${state}: lifecycle envelope keys changed`);
  equal(lifecycle.routeConsumers, spec.routeConsumers, `${state}: routeConsumers mismatch`);
  equal(lifecycle.exactPacketFactIds, spec.exactPacketFactIds, `${state}: exactPacketFactIds mismatch`);
  equal(lifecycle.completionAliasIds, spec.completionAliasIds, `${state}: completionAliasIds mismatch`);
  const emptyContextIds = new Set(selectPublicQuestionIds(profile, publicProfile));
  const pathwaySelections = new Map(profile.pathways.map((pathway) => [pathway.id, new Set(selectPublicQuestionIds(profile, publicProfile, pathway.label))]));
  selectedQuestionCounts[state] = {
    emptyContext: emptyContextIds.size,
    maxExactRoute: Math.max(emptyContextIds.size, ...[...pathwaySelections.values()].map((ids) => ids.size))
  };

  for (const [questionId, consumers] of Object.entries(lifecycle.routeConsumers)) {
    check(publicQuestionIds.has(questionId), `${state}:${questionId}: route fact is not a public profile question`);
    const packetOnly = lifecycle.exactPacketFactIds.includes(questionId);
    check(!emptyContextIds.has(questionId), `${state}:${questionId}: route fact leaked into empty-context screening`);
    for (const pathwayId of consumers) {
      check(pathwayIds.has(pathwayId), `${state}:${questionId}: unknown pathway ${pathwayId}`);
      const escalationSupport = (ROUTE_ESCALATION_FACT_IDS[`${state}:${pathwayId}`] ?? []).includes(questionId);
      // A route fact is approved either because the contract screens on it or
      // because the contract holds the packet until it is supplied. The second
      // source was missing, so a fact deliberately kept out of screening — a
      // birth date, say — read as unsupported precisely for being correct.
      const authoritySupport = authorityRoutes.some((route) => route.pathwayId === pathwayId && (
        (route.screeningFactIds ?? []).includes(questionId)
        || (route.packetReleasePreconditions ?? []).some((precondition) =>
          precondition.id === questionId || precondition.satisfiedWhen?.factId === questionId)
      ));
      check(escalationSupport || authoritySupport, `${state}:${questionId}: ${pathwayId} lacks approved machine support`);
      if (packetOnly) {
        check(!pathwaySelections.get(pathwayId)?.has(questionId), `${state}:${questionId}: exact date leaked into free screening for ${pathwayId}`);
        check(packetPlanForPathway(profile, pathwayId)?.requiredInputIds.includes(questionId), `${state}:${questionId}: exact packet fact is not retained by ${pathwayId}`);
        for (const unrelatedPathwayId of pathwayIds) {
          if (unrelatedPathwayId !== pathwayId) {
            check(!packetPlanForPathway(profile, unrelatedPathwayId)?.requiredInputIds.includes(questionId), `${state}:${questionId}: leaked into unrelated packet plan ${unrelatedPathwayId}`);
          }
        }
      } else {
        check(pathwaySelections.get(pathwayId)?.has(questionId), `${state}:${questionId}: missing from exact pathway ${pathwayId}`);
      }
    }
    for (const [pathwayId, selectedIds] of pathwaySelections) {
      if (!consumers.includes(pathwayId)) check(!selectedIds.has(questionId), `${state}:${questionId}: leaked into unrelated pathway ${pathwayId}`);
    }
  }
  for (const questionId of lifecycle.exactPacketFactIds) {
    const question = publicProfile.questions.find((candidate) => candidate.id === questionId) ?? rawQuestionById.get(questionId);
    check(publicQuestionIds.has(questionId), `${state}:${questionId}: exact packet fact is not a public profile question`);
    const structural = question?.stage === "case_details" || question?.stage === "record_readiness" || question?.type === "date_or_unknown";
    check(structural || projectionPacketFacts.has(`${state}:${questionId}`), `${state}:${questionId}: exact packet fact lacks structural/date authority`);
    const sourceTiming = state==='MS' && sourceMsTimingIds.has(questionId);
    check(!emptyContextIds.has(questionId) && [...pathwaySelections].every(([id,ids]) => !ids.has(questionId) || sourceTiming && baseMsTimingFor(id).includes(questionId)), `${state}:${questionId}: exact packet fact leaked outside its accepted source timing consumer`);
  }
  for (const [pathwayId, selectedIds] of pathwaySelections) {
    for (const questionId of selectedIds) {
      const question = publicProfile.questions.find((candidate) => candidate.id === questionId);
      check(question?.type !== "date_or_unknown" || state==='MS' && baseMsTimingFor(pathwayId).includes(questionId), `${state}:${pathwayId}: exact date ${questionId} lacks an accepted source screening clock`);
    }
  }
  for (const questionId of lifecycle.completionAliasIds) {
    check(rawQuestionById.has(questionId), `${state}:${questionId}: completion alias is not a compiled question`);
    check(publicQuestionIds.has("court_requirements_completed"), `${state}:${questionId}: completion alias lacks canonical completion authority`);
    check(["sentence_completion_date", "financial_obligations"].includes(questionId), `${state}:${questionId}: completion alias is not approved`);
    check(!emptyContextIds.has(questionId) && [...pathwaySelections.values()].every((ids) => !ids.has(questionId))
      || literalFinancialControl(state,rawQuestionById.get(questionId)), `${state}:${questionId}: unsupported completion alias leaked into screening`);
  }

  // Reconstruct the original count boundary by removing ONLY the named,
  // accepted later controls. An unrelated selector addition/removal still fails
  // the immutable per-state baseline instead of blessing a new observed total.
  const laterControl = id => literalFinancialStates.has(state) && id==='financial_obligations'
    || state==='MS' && (id==='ms_program_order' || sourceMsTimingIds.has(id))
    || state==='MO' && id==='mo_marijuana_custody_posture'
    || state==='MT' && id==='mt_deferred_order_type';
  const originalCount = ids => [...ids].filter(id=>!laterControl(id)).length;
  normalizedSelectedQuestionCounts[state]={emptyContext:originalCount(emptyContextIds),maxExactRoute:Math.max(originalCount(emptyContextIds),...[...pathwaySelections.values()].map(originalCount))};
  for(const [pathwayId,ids] of pathwaySelections) {
    if(state==='MO') check(ids.has('mo_marijuana_custody_posture')===(pathwayId==='marijuana-expungement-under-missouri-constitution-article-xiv'),`MO:${pathwayId}: custody source-control scope changed`);
    if(state==='MT') check(ids.has('mt_deferred_order_type')===(pathwayId==='deferred-sentence-dismissal-or-confidentiality-route'),`MT:${pathwayId}: order source-control scope changed`);
  }
  // Current counts are selector observations, never replacements for the
  // historical evidence totals. Record the exact approved source-control delta.
  currentSourceSelectionObservations[state] = {
    financialConsumers:[...pathwaySelections].filter(([,ids])=>ids.has('financial_obligations')).map(([id])=>id),
    msTimingConsumers:[...pathwaySelections].map(([id,ids])=>({id,fields:[...ids].filter(q=>sourceMsTimingIds.has(q))})).filter(row=>row.fields.length)
  };
  if(literalFinancialStates.has(state)) {
    const routeId={LA:'misdemeanor-five-year-clean-period-expungement',ME:'adult-conviction-sealing',MO:'general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140',MT:'misdemeanor-conviction-expungement-under-mont-code-46-18-1104'}[state];
    const label=profile.pathways.find(row=>row.id===routeId)?.label;
    check(Boolean(label) && literalFinancialControl(state,rawQuestionById.get('financial_obligations')), `${state}: literal paid financial control lost exact identity`);
    for(const financial_obligations of ['No','I am not sure']) check(selectPublicQuestionIds(profile,publicProfile,label,{court_requirements_completed:'yes',financial_obligations}).includes('financial_obligations'),`${state}: broad completion cannot erase independent ${financial_obligations} money answer`);
  }
  if(state==='MS') {
    for(const [id,ids] of pathwaySelections) equal([...ids].filter(q=>sourceMsTimingIds.has(q)).sort(),[...baseMsTimingFor(id)].sort(),`MS:${id}: exact source timing applicability changed`);
    for(const row of sourceMsTimingCases) {
      const label=profile.pathways.find(p=>p.id===row.pathwayId).label;
      const ids=selectPublicQuestionIds(profile,publicProfile,label,row.answers);
      equal(ids.filter(id=>sourceMsTimingIds.has(id)).sort(),[...row.expected].sort(),`MS:${row.pathwayId}: independent factual timing branch changed`);
      check(!ids.includes('ms_mip_dismissal_or_discharge_date'),'MS legacy OR control offered');
    }
    const raw={case_outcome:'Dismissed / not prosecuted',ms_mip_dismissal_or_discharge_date:'2012-06-01'},prior=JSON.stringify(raw);
    const label=profile.pathways.find(p=>p.id===sourceMsTimingCases[2].pathwayId).label;
    const ids=selectPublicQuestionIds(profile,publicProfile,label,raw);
    check(ids.includes('ms_mip_dismissal_and_discharge_date')&&!ids.includes('ms_mip_dismissal_or_discharge_date'),'MS old-only answer must require fresh AND control');
    check(JSON.stringify(raw)===prior&&!Object.hasOwn(raw,'ms_mip_dismissal_and_discharge_date'),'MS old OR raw was mutated or silently attested as AND');
  }

// The legal/route/packet surface, minus two fields it is not about.
//
// questionLifecycle was already excluded. lawrenceRatification is excluded now
// for the same kind of reason and a stronger one: it is listed in
// INTERNAL_LEAK_MARKERS, so it never reaches the public projection and cannot
// change a question, a route selection or a packet fact — and since it became a
// generated projection of the ratification registry, leaving it inside this pin
// meant every counsel decision churned fifty-one hashes that this verifier is
// not about. Ratification changes are caught where they belong, by
// scripts/generate-route-ratification-projections.mjs --check.
  const legalSurface = structuredClone(profile);
  delete legalSurface.questionLifecycle;
  for (const pathway of legalSurface.pathways ?? []) delete pathway.lawrenceRatification;
  const hash = crypto.createHash("sha256").update(JSON.stringify(legalSurface)).digest("hex");
  const successor = legalSurfaceSuccessors[state];
  check(hash === legalSurfaceHashes[state] || successor?.prior === legalSurfaceHashes[state] && hash === successor.current,
    `${state}: legal/route/packet profile surface changed (${hash})`);
}

const manifest = readJson(MANIFEST_PATH);
const reconciliation = readJson(RECONCILIATION_PATH);
check(crypto.createHash('sha256').update(fs.readFileSync(MANIFEST_PATH)).digest('hex')==='8b96deb5121986c8dc3020750e676694f05e67caa87e23ad7ba6178ff3246c08','Original80-flow manifest/premises/history changed');
check(crypto.createHash('sha256').update(fs.readFileSync(EVIDENCE_PATH)).digest('hex')==='401db94e0d9b07401bddf6c10cdedcf5dca1579d2c528aa2b0927a0a5e20e213','Original LaneF evidence changed');
const assertCurrentFlowSuccessor=(flow,result,selected=false)=>{
 const contract=currentFlowSuccessors[flow.flowId];if(!contract)return false;
 check(crypto.createHash('sha256').update(JSON.stringify(flow.fixture.answers)).digest('hex')===contract.rawSha,`${flow.flowId}: original premises changed`);
 check(result.resultCode===contract.terminal,`${flow.flowId}: precise current source outcome changed`);
 check(result.paymentAllowed===false,`${flow.flowId}: unsupported payment uplift`);
 check(result.reasons.some(reason=>reason.code===contract.reason),`${flow.flowId}: exact source refusal/missing reason changed`);
 equal([...(result.missingQuestionIds??[])].sort(),[...contract.missing].sort(),`${flow.flowId}: exact source fact request changed`);
 if(selected)check(!result.packetPlan,`${flow.flowId}: conflicting selected-answer record gained packet plan`);
 return true;
};

const stateSet = new Set(Object.keys(expected));
const flows = manifest.flows.filter((flow) => stateSet.has(flow.jurisdiction));
const reconciliationRows = reconciliation.rows.filter((row) => stateSet.has(row.jurisdiction));
check(flows.length === 80, `Lane F flow count changed: expected 80, got ${flows.length}`);
check(reconciliationRows.filter((row) => row.browserRequired).length * 2 === 156, "Lane F browser witness count changed from 156");

for (const flow of flows) {
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const result = evaluateScreening({
    jurisdiction: flow.jurisdiction,
    profileVersion: profile.profileVersion,
    matterId: `shard-f-${flow.flowId}`,
    answers: flow.fixture.answers
  });
  check(result.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: pathway ${result.pathwayId} != ${flow.remedy.pathwayId}`);
  if(!assertCurrentFlowSuccessor(flow,result)) {
    check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flow.flowId}: terminal ${result.resultCode} != ${flow.terminalOutcome.effectiveTerminal}`);
    check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flow.flowId}: payment witness changed`);
  }
  if (["packet_ready", "packet_ready_with_caution"].includes(result.resultCode)) {
    check(result.packetPlan?.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: packet witness missing or changed`);
  }
}

const representativeSelectedFlowIds = [
  "EXPAI-MD-2ec5a936b1", "EXPAI-MA-1b8b8b38fd", "EXPAI-MI-31050183b1", "EXPAI-MN-1ecfc803d9",
  "EXPAI-MS-4fd3a68b39", "EXPAI-MS-9c7d692811", "EXPAI-MS-c9d86d7fda"
];
const authorityLimitedNoncommercialFlowIds = ["EXPAI-MS-c9d86d7fda"];
for (const flowId of representativeSelectedFlowIds) {
  const flow = flows.find((candidate) => candidate.flowId === flowId);
  check(Boolean(flow), `${flowId}: representative selected-answer flow is missing`);
  if (!flow) continue;
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const selectedIds = new Set(selectPublicQuestionIds(profile, projectPublicProfile(profile), flow.fixture.answers.possible_pathway_context));
  const selectedAnswers = Object.fromEntries(Object.entries(flow.fixture.answers).filter(([questionId]) => selectedIds.has(questionId)));
  const result = evaluateScreening({ jurisdiction: flow.jurisdiction, profileVersion: profile.profileVersion, matterId: `shard-f-selected-${flowId}`, answers: selectedAnswers });
  check(result.pathwayId === flow.remedy.pathwayId, `${flowId}: selected-answer pathway changed`);
  if(!assertCurrentFlowSuccessor(flow,result,true)) {
    check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flowId}: selected-answer terminal changed`);
    check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flowId}: selected-answer payment changed`);
  }
  if (flow.jurisdiction === "MS") {
    check(selectedAnswers.resolved_timing_bucket === "gt_10_years", `${flowId}: Mississippi coarse timing bucket was not retained`);
    check(expected.MS.exactPacketFactIds.every((questionId) => !(questionId in selectedAnswers)), `${flowId}: unsupported Mississippi exact fact leaked into selected answers`);
  }
  if (authorityLimitedNoncommercialFlowIds.includes(flowId)) {
    check(result.resultCode === "needs_more_info" && !result.paymentAllowed, `${flowId}: authority-limited route became commercial`);
  }
}

if (!fs.existsSync(EVIDENCE_PATH)) {
  failures.push("Lane F evidence/status file is missing");
} else {
  const evidence = readJson(EVIDENCE_PATH);
  equal(evidence.states, Object.keys(expected), "evidence state order changed");
  equal(evidence.before, { flows: 80, browserWitnessVariants: 156, freeQuestions: 108, exactDateFreeCheckInputs: 9, completionOverlaps: 8, genericSpecialRouteAsks: 17, rawPacketFields: 45 }, "evidence baseline changed");
  /**
   * The result block is computed, not restated.
   *
   * It used to be a literal compared against the evidence file's copy of the
   * same literal — two frozen numbers agreeing with each other while the lane
   * they described moved underneath both. Adding Missouri's second route
   * consumer changed the real totals and neither copy noticed. These are now
   * derived from the same spec the rest of the file checks against reality, so
   * the evidence file is checked against the lane rather than against a twin.
   */
  const specs = Object.values(expected);
  const sum = (fn) => specs.reduce((total, spec) => total + fn(spec), 0);
  equal(evidence.after, {
    flows: 80,
    browserWitnessVariants: 156,
    freeQuestions: {
      emptyContext: Object.values(historicalSelectedQuestionCounts).reduce((total,row)=>total+row.emptyContext,0),
      maxExactRoute: Object.values(historicalSelectedQuestionCounts).reduce((total,row)=>total+row.maxExactRoute,0)
    },
    routeConsumerFacts: sum((spec) => Object.keys(spec.routeConsumers).length),
    routeConsumerEdges: sum((spec) => Object.values(spec.routeConsumers).flat().length),
    exactPacketFactIds: sum((spec) => spec.exactPacketFactIds.length),
    completionAliasIds: sum((spec) => spec.completionAliasIds.length)
  }, "evidence result counts changed");
  equal(evidence.selectedQuestionCounts, historicalSelectedQuestionCounts, "historical evidence selected-question counts changed");
  equal(normalizedSelectedQuestionCounts,historicalSelectedQuestionCounts,'Unrelated selector count drift after only accepted source-control deltas');
  check(Object.keys(currentFlowSuccessors).length===6 && flows.filter(flow=>!currentFlowSuccessors[flow.flowId]).length===74,"Exact six source successors /74 untouched witness expectations changed");
  console.log(JSON.stringify({currentSelectedQuestionCounts:selectedQuestionCounts,normalizedSelectedQuestionCounts,historicalSelectedQuestionCounts,sourceScopedSelectionDelta:currentSourceSelectionObservations,qualification:"Derived current observations and exact accepted source-control assertions; no historical expected-total replacement or new approval."}));
  equal(evidence.representativeSelectedFlowIds, representativeSelectedFlowIds, "evidence selected-answer witnesses changed");
  equal(evidence.authorityLimitedNoncommercialFlowIds, authorityLimitedNoncommercialFlowIds, "evidence authority-limited route witnesses changed");
  equal(evidence.packetOnlyExactRouteFacts, { MD: ["pardon_signed_date", "arrest_date"], MO: ["date_of_birth"] }, "evidence packet-only exact route facts changed");
}

if (failures.length) {
  console.error(`Lane F screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane F screening-verification verifier passed.");
// Printed from the same computation the checks ran on. The hand-written version
// of this line said 90/90 and 3 route-consumer edges after both had moved.
{
  const specs = Object.values(expected);
  const stateCounts = Object.values(selectedQuestionCounts);
  const total = (fn) => specs.reduce((n, spec) => n + fn(spec), 0);
  const empty = stateCounts.reduce((n, row) => n + row.emptyContext, 0);
  const maxRoute = stateCounts.reduce((n, row) => n + row.maxExactRoute, 0);
  console.log(`${specs.length} states, 80 terminal/payment flow witnesses, 156 browser variants, ${empty} empty-context / ${maxRoute} max-route questions, ${total((spec) => spec.exactPacketFactIds.length)} exact packet facts, ${total((spec) => Object.values(spec.routeConsumers).flat().length)} route-consumer edges, ${total((spec) => spec.completionAliasIds.length)} completion aliases.`);
}
