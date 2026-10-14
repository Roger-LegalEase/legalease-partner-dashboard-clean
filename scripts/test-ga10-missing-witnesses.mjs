import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-13';
// Expose only the existing locale context; all evaluated and rendered behavior is real.
const contextFile = 'src/components/expungement-ai/LocalizationProvider.tsx';
const source = ts.transpileModule(fs.readFileSync(contextFile, 'utf8') + '\nexport { LocalizationContext };', {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`, {
  data: { url: pathToFileURL(`${process.cwd()}/${contextFile}`).href, source }
});
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const { QuestionField } = await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const { t, resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { screensFromQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { courtCompletionContractsFor, isIndependentPaidFinancialFact } = await import('../src/lib/expungement-ai/court-completion-reuse.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { KS_REGISTRATION_REVIEW_COPY, withKansasRegistrationProcedure } = await import('../src/lib/rcap-engine/kansas-district-facts.ts');
const { isCourtFiledPetitionRoute } = await import('../src/lib/rcap-engine/evaluator.ts');
const { decorateBriefcaseItemForPresentationWithDependencies: decorate } = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const inventory = JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json'));
const identity = 'Q-0004565ad78ccafeab1e', route = 'drug-registration-relief-coordination';
const routeKey = `KS:${route}`, p = getProfileByJurisdiction('KS'), pub = projectPublicProfile(p);
const checks = [], rows = [], renders = [];
function check(name, actual, expected) {
  checks.push({ name, actual, expected, pass: JSON.stringify(actual) === JSON.stringify(expected) });
}
check('all 22 original missing identities retained', inventory.originalMissingWitnesses.length, 22);
check('original identities unique', new Set(inventory.originalMissingWitnesses.map(r => r.questionRecordId)).size, 22);
check('original absence remains historical', inventory.originalMissingWitnesses.every(r => r.status === 'NOT_RUN_NO_RETAINED_PUBLIC_WITNESS'), true);
check('exact original question/route', inventory.originalMissingWitnesses.find(r => r.questionRecordId === identity)?.routeKey, routeKey);
// This is a NEW synthetic factual witness, reusing the source-supported combined
// registration case from test-ks-district-factual-routing, never migrating an old answer.
const base = {
  case_outcome: 'Misdemeanor conviction', offense_level: 'Misdemeanor',
  ks_record_court_scope: 'district_state_law', ks_district_request: 'registration_and_expungement',
  ks_registration_basis: 'drug_only', court_requirements_completed: 'yes',
  financial_obligations: 'Yes', jurisdiction_scope: 'State or local',
  new_convictions_during_waiting_period: 'No', ownership_scope: 'Yes', pending_cases: 'No',
  record_documents: 'Yes', resolved_timing_bucket: 'gt_10_years', sentence_completion_date: 'Yes',
  special_preconditions_confirmed: 'Yes'
};
const run = answers => evaluate({ jurisdiction: 'KS', profileVersion: p.profileVersion, matterId: 'synthetic-ga10-ks-registration', answers });
const q = pub.questions.find(q => q.id === 'financial_obligations');
const rawProfile = JSON.parse(fs.readFileSync('src/lib/rcap-engine/compiled/profiles/KS-kansas.json'));
const rawBefore = structuredClone(rawProfile), adapted = withKansasRegistrationProcedure(rawProfile);
const actualRoute = p.pathways.find(p => p.id === route);
check('adopted petition procedure', isCourtFiledPetitionRoute(p, actualRoute), true);
check('predecessor classification fails adopted petition control', isCourtFiledPetitionRoute(rawProfile, rawProfile.pathways.find(p => p.id === route)), false);
check('source corpus remains unchanged', rawProfile, rawBefore);
check('only exact route metadata affected', adapted.pathways.filter(p => p.id !== route), rawProfile.pathways.filter(p => p.id !== route));
check('only exact route plan affected', adapted.packetGenerator.pathways.filter(p => p.pathwayId !== route), rawProfile.packetGenerator.pathways.filter(p => p.pathwayId !== route));
check('no source form invented', adapted.packetGenerator.pathways.find(p => p.pathwayId === route).formCandidates, []);
check('form mapping remains outstanding', adapted.packetGenerator.pathways.find(p => p.pathwayId === route).formMappingStatus, 'custom_or_manual_mapping_required');
for (const state of ['GA', 'MS', 'IL']) {
  const unrelated = getProfileByJurisdiction(state);
  check(`no ${state} profile change`, withKansasRegistrationProcedure(unrelated) === unrelated, true);
}
check('literal EN question', q.prompt, 'Have you paid off everything the court charged?');
check('literal ES question', q.translations.es.prompt, '¿Pagó todo lo que cobró el tribunal?');
check('separate paid-only contract', isIndependentPaidFinancialFact(routeKey, q), true);
check('no completion-to-paid implication', courtCompletionContractsFor(routeKey).some(c => c.targetFactId === q.id), false);
const scenarios = [
  ['paid', 'Yes', 'yes'], ['unpaid', 'No', 'no'], ['partially_paid', 'No', 'no'],
  ['waived_not_paid_hypothesis', 'No', 'yes'], ['unknown', 'I am not sure', 'not_sure']
];
const maps = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'];
for (const [name, financial, completion] of scenarios) {
  const answers = { ...base, financial_obligations: financial, court_requirements_completed: completion };
  const before = structuredClone(answers), a = run(answers);
  check(`${name}/actual factual candidate`, a.evaluation.pathwayId, route);
  check(`${name}/no commercial authority`, a.evaluation.paymentAllowed, false);
  check(`${name}/adopted held treatment`, a.evaluation.resultCode, 'needs_review');
  check(`${name}/no unapproved packet plan`, a.evaluation.packetPlan ?? null, null);
  check(`${name}/no automatic or no-petition assertion`, a.evaluation.reasons.some(r => r.code === 'ks.guidance_only_no_user_filed_court_petition'), false);
  if (name !== 'unknown') {
    check(`${name}/specific statutory hold`, a.evaluation.reasons[0].code, 'ks.registration_statutory_facts_review');
    check(`${name}/EN adopted petition meaning`, a.evaluation.reasons[0].text, KS_REGISTRATION_REVIEW_COPY[0]);
    check(`${name}/ES exact draft binding`, resolveRuntimeText('es', a.evaluation.reasons[0].text), KS_REGISTRATION_REVIEW_COPY[1]);
  }
  check(`${name}/input unchanged`, answers, before);
  const selected = selectScreeningQuestionIds(p, pub, answers);
  check(`${name}/paid control reachable`, selected.includes(q.id), true);
  check(`${name}/actual screen builder`, screensFromQuestionIds(pub, selected).some(q => q.id === 'financial_obligations'), true);
  const resumed = sanitizeResumedAnswersForQuestionIds(pub, JSON.parse(JSON.stringify(answers)), selected);
  check(`${name}/raw resumed payment`, resumed.financial_obligations, financial);
  check(`${name}/raw resumed completion`, resumed.court_requirements_completed, completion);
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative: a, screeningAnswers: answers,
    dependencies: { commercialFlowVersion: null, entitlementSource: null, productId: null }, capturedAt: '2026-10-13T00:00:00Z' });
  check(`${name}/real protected pure seed`, Boolean(seed), true);
  if (!seed) continue;
  const positions = maps.filter(k => Object.hasOwn(seed.snapshot[k], q.id));
  check(`${name}/one canonical payment value`, positions.length, 1);
  check(`${name}/canonical raw payment`, seed.snapshot[positions[0]]?.[q.id], financial);
  check(`${name}/no implied payment marker`, Boolean(seed.snapshot.dependencies.courtCompletionImplications?.[q.id]), false);
  const prior = { status: 'unverified', reason: 'synthetic-ga10', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
  const priorBytes = JSON.stringify(prior), reloaded = JSON.parse(priorBytes);
  const model = P.protectedPacketInformationModelFor(reloaded);
  check(`${name}/actual protected reload model`, Boolean(model), true);
  check(`${name}/reload no mutation`, JSON.stringify(reloaded), priorBytes);
  check(`${name}/model raw paid value`, model?.initialAnswers.financial_obligations, financial);
  check(`${name}/no entitlement invented`, seed.snapshot.paymentAllowed, false);
  if (name === 'unknown') {
    check('unknown/actual unresolved result', a.evaluation.resultCode, 'needs_review');
    check('unknown/specific missing fact', a.evaluation.missingQuestionIds.includes(q.id), true);
  }
  const item = { id: 'synthetic-ga10-ks-registration', jurisdiction: 'KS', artifactRefs: {} };
  const changed = P.packetInformationPatch({ existingItem: item, protectedVerification: prior,
    answers: { financial_obligations: 'I am not sure' } });
  const held = changed?.protectedTransition.nextVerification;
  check(`${name}/explicit unknown correction saved`, Boolean(held), true);
  if (held) {
    check(`${name}/saved unknown raw`, Object.assign({}, ...maps.map(k => held.draftSnapshot[k])).financial_obligations, 'I am not sure');
    check(`${name}/edit preserves prior bytes`, JSON.stringify(prior), priorBytes);
    check(`${name}/correction cannot verify`, held.status === 'verified' || changed.readyToGenerate === true, false);
    check(`${name}/unknown reload works`, Boolean(P.protectedPacketInformationModelFor(JSON.parse(JSON.stringify(held)))), true);
    const repaired = P.packetInformationPatch({ existingItem: item, protectedVerification: held,
      answers: { financial_obligations: 'No' } });
    const next = repaired?.protectedTransition.nextVerification;
    check(`${name}/explicit No correction saved`, next?.draftSnapshot.packetAnswers.financial_obligations, 'No');
    check(`${name}/no implicit verification after No`, next?.status === 'verified' || repaired?.readyToGenerate === true, false);
    if (next) {
      const nextModel = P.protectedPacketInformationModelFor(JSON.parse(JSON.stringify(next)));
      check(`${name}/recovered No remains literal`, nextModel?.initialAnswers.financial_obligations, 'No');
      for (const id of ['ks_registration_basis', 'ks_district_request', 'court_requirements_completed']) {
        check(`${name}/unrelated source fact retained/${id}`, nextModel?.initialAnswers[id], before[id]);
      }
    }
  }
  for (const locale of ['en', 'es']) {
    const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (s, options) => resolveRuntimeText(locale, s, options) };
    const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value },
      React.createElement(QuestionField, { question: q, stateCode: 'KS', value: financial, onChange() {} })));
    const escaped = s => renderToStaticMarkup(React.createElement('span', null, s)).slice(6, -7);
    check(`${name}/${locale}/actual literal question`, markup.includes(escaped(locale === 'es' ? q.translations.es.prompt : q.prompt)), true);
    check(`${name}/${locale}/three actual choices`, (markup.match(/type="radio"/g) ?? []).length, 3);
    renders.push({ name, locale, markup });
  }
  rows.push({ originalQuestionRecordId: identity, name, financial, completion, actualEvaluation: a.evaluation,
    protectedHash: seed.hash, syntheticProtectedPredecessor: prior,
    legalFinancialEffect: 'NOT_VERIFIED', protectedAuthenticatedAcceptance: 'NOT_RUN' });
}
for (const [name, patch, expectedCode, expectedMissing] of [
  ['missing registration type', { ks_registration_basis: undefined }, 'needs_more_info', ['ks_registration_basis']],
  ['unknown registration type', { ks_registration_basis: 'unknown' }, 'needs_more_info', ['ks_registration_basis']],
  ['mixed registration review', { ks_registration_basis: 'mixed' }, 'needs_review', []],
  ['separate registration request', { ks_district_request: 'registration_only' }, 'needs_review', []]
]) {
  const result = run({ ...base, ...patch }).evaluation;
  check(`${name}/expected treatment`, result.resultCode, expectedCode);
  check(`${name}/no payment`, result.paymentAllowed, false);
  check(`${name}/specific question`, result.missingQuestionIds, expectedMissing);
}
// These are precise test-of-the-test controls, not fabricated prior product bugs.
const canonicalRaw = snapshot => maps.flatMap(k => Object.hasOwn(snapshot[k], q.id) ? [snapshot[k][q.id]] : []);
const original = run({ ...base, financial_obligations: 'No', court_requirements_completed: 'yes' });
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative: original,
  screeningAnswers: { ...base, financial_obligations: 'No', court_requirements_completed: 'yes' },
  dependencies: {}, capturedAt: '2026-10-13T00:00:00Z' });
const mutant = structuredClone(seed.snapshot), location = maps.find(k => Object.hasOwn(mutant[k], q.id));
mutant[location][q.id] = 'Yes';
check('negative control detects No rewritten as Yes', JSON.stringify(canonicalRaw(mutant)) === JSON.stringify(['No']), false);
check('real source remains No', canonicalRaw(seed.snapshot), ['No']);
// Existing pure presentation seam: storage reads provide captured synthetic
// records, all legal evaluation/ownership projections execute production code.
// This is deliberately not authenticated API/DB acceptance.
async function present(record) {
  return decorate({ consumerAuthUserId: 'synthetic-ks-owner', item: { id: 'synthetic-ks-matter', jurisdiction: 'KS', artifactRefs: {} } }, {
    readProtectedArtifact: async () => ({ ok: true, value: null }),
    readProtectedVerification: async () => ({ ok: true, value: record }),
    readTrustedPendingSource: async () => ({ ok: false, reason: 'synthetic_source_absent' }),
    readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
    evaluateAuthoritative: evaluate,
    readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
  });
}
const predecessorResults = [];
for (const { name, record } of inventory.syntheticPredecessorCapture.records) {
  const before = JSON.stringify(record), old = record.draftSnapshot;
  check(`${name}/authentic captured draft hash`, P.protectedPacketDraftHash(old), record.draftHash);
  const model = P.protectedPacketInformationModelFor(record);
  check(`${name}/old model survives procedure correction`, Boolean(model), true);
  check(`${name}/old raw financial retained`, model?.initialAnswers.financial_obligations, Object.assign({}, ...maps.map(k => old[k])).financial_obligations);
  check(`${name}/old revision retained on read`, model?.revision, record.revision);
  check(`${name}/old automatic plan withdrawn`, model?.packetPlan ?? null, null);
  const actual = await present(record);
  check(`${name}/full presentation keeps recovery`, [actual.authorityStatus, actual.packetDraft.status], ['protected_draft', 'available']);
  check(`${name}/current held result`, actual.resultCode, 'needs_review');
  check(`${name}/no verified or commercial presentation`, actual.verificationStatus === 'verified' || Object.values(actual.commercialActions).some(Boolean), false);
  check(`${name}/read preserves historical record`, JSON.stringify(record), before);
  const patch = P.packetInformationPatch({ existingItem: { id: 'synthetic-ks-matter', jurisdiction: 'KS', artifactRefs: {} },
    protectedVerification: record, answers: { financial_obligations: 'No' } });
  const next = patch?.protectedTransition.nextVerification;
  check(`${name}/legacy explicit correction exists`, Boolean(next), true);
  check(`${name}/legacy correction remains unverified`, next?.status === 'verified' || patch?.readyToGenerate === true, false);
  if (next) {
    check(`${name}/legacy correction reload raw No`, P.protectedPacketInformationModelFor(next)?.initialAnswers.financial_obligations, 'No');
    check(`${name}/legacy correction displayed`, (await present(next)).packetDraft.status, 'available');
    const actualFactChange = Object.assign({}, ...maps.map(k => old[k])).financial_obligations !== 'No';
    check(`${name}/authority advances only on actual correction`, next.draftSnapshot.profileAuthorityFingerprint !== old.profileAuthorityFingerprint, actualFactChange);
  }
  predecessorResults.push({ name, oldAuthority: old.profileAuthorityFingerprint, oldResult: old.resultCode,
    actualAuthority: actual.authorityStatus, actualResult: actual.resultCode, correctionRevision: next?.revision });
  for (const [field, value] of Object.entries({ jurisdiction: 'MS', profileVersion: 'wrong', profileSourceFingerprint: 'wrong',
    profileAuthorityFingerprint: 'wrong', pathwayId: 'wrong', paymentAllowed: true, resultCode: 'packet_ready',
    packetType: 'custom_pleading', selectedTrackId: 'wrong', treatmentClassification: 'wrong', deferralComponentIds: ['wrong'],
    serverFacts: { jurisdiction: 'KS', pathway_id: 'wrong' }, packetFamilyIdentifiers: { mode: 'custom', sourceFormIds: [] }, requiredInputIds: ['invented'] })) {
    const bad = structuredClone(record);
    bad.draftSnapshot[field] = value;
    bad.draftHash = P.protectedPacketDraftHash(bad.draftSnapshot);
    check(`${name}/refuses altered ${field}`, P.protectedPacketInformationModelFor(bad), null);
    const denial = await present(bad);
    check(`${name}/presentation refuses altered ${field}`, [denial.authorityStatus, denial.packetDraft.status], ['unavailable', 'unavailable']);
  }
  const hashMismatch = { ...record, draftHash: 'wrong' };
  check(`${name}/refuses corrupted protected hash`, P.protectedPacketInformationModelFor(hashMismatch), null);
}
const failed = checks.filter(c => !c.pass);
const report = { status: failed.length ? 'FAIL' : 'PASS_BOUNDED_FACT_PRESERVATION_ONLY', originalQuestionRecordId: identity,
  routeKey, checks: checks.length, failed, scenarios: rows, renders, predecessorResults, details: checks,
  originalObligationStatus: 'OPEN',
  knownProcedureResidual: 'Petition classification corrected; actual statutory fact collection, findings, exact document and delivery authority remain outstanding. This test does not assert registration or expungement eligibility.',
  limits: ['One new synthetic witness, not an actual court waiver/payment order.', '21 other original missing witnesses untouched.',
    'No authenticated HTTP/DB run, qualified copy/output approval or positive worker/delivery acceptance.',
    'No conclusion that No plus broad completion satisfies Kansas restitution/waiver or registration requirements.'] };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: checks.length, renders: renders.length, failed }, null, 2));
assert.equal(failed.length, 0);
