// Original GA10 missing witnesses only; no database or entitlement activity.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-14';
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
const { sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { courtCompletionContractsFor } = await import('../src/lib/expungement-ai/court-completion-reuse.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const inventory = JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json'));
const memo = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/NE.memo.json'));
const subgroup = inventory.additionalSubgroups.find(s => s.id === 'NE-automatic-guidance-financial-witnesses-20261014');
assert.equal(inventory.originalMissingWitnesses.length, 22);
assert.equal(inventory.currentBatch.routeKey, 'KS:drug-registration-relief-coordination', 'Kansas batch remains intact');
assert.equal(memo.tracks.find(t => t.trackId === 'ne-nonconviction-auto').participantInputs.some(i => /financial|fine|restitution/i.test(i.key + i.question)), false);
assert(memo.tracks.find(t => t.trackId === 'ne-juvenile-sealing-routing').legalDesignDecision.limitations.some(l => l.classification === 'scope_restriction'));
const p = getProfileByJurisdiction('NE'), pub = projectPublicProfile(p);
const q = pub.questions.find(q => q.id === 'financial_obligations');
assert.equal(q.prompt, 'Have you paid off everything the court charged?');
assert.equal(q.translations.es.prompt, '¿Pagó todo lo que cobró el tribunal?');
const rows = [], renders = [];
for (const [index, routeKey] of subgroup.routeKeys.entries()) {
  const route = routeKey.slice(3), juvenile = route.startsWith('juvenile');
  assert.equal(inventory.originalMissingWitnesses.find(r => r.questionRecordId === subgroup.originalQuestionRecordIds[index]).routeKey, routeKey);
  assert(!courtCompletionContractsFor(routeKey).some(c => c.targetFactId === q.id));
  const base = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local',
    possible_pathway_context: p.pathways.find(p => p.id === route).label,
    case_outcome: juvenile ? 'Juvenile adjudication or offense committed as a minor' : 'Acquitted or found not guilty',
    court: 'County court', charge: 'Misdemeanor charge', offense_level: 'Misdemeanor',
    court_requirements_completed: 'yes', pending_cases: 'No', sentence_completion_date: 'Yes',
    special_preconditions_confirmed: 'Yes', new_convictions_during_waiting_period: 'No', record_documents: 'Yes',
    resolved_timing_bucket: '5_to_10_years', age_at_offense: juvenile ? 15 : 30, pardon_status: 'No', identity_error: 'No' };
  for (const [name, financial, completion] of [['paid', 'Yes', 'yes'], ['unpaid', 'No', 'no'], ['partly_paid', 'No', 'no'], ['waived_not_paid_hypothesis', 'No', 'yes'], ['unknown', 'I am not sure', 'yes'], ...(!juvenile ? [['not_asked', undefined, 'yes']] : [])]) {
    const answers = { ...base, financial_obligations: financial, court_requirements_completed: completion };
    const before = JSON.stringify(answers);
    const actual = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion, matterId: 'synthetic-ga10-ne', answers });
    assert.equal(actual.evaluation.pathwayId, route, 'exact factual candidate without forcing engine output');
    assert.equal(actual.evaluation.paymentAllowed, false);
    assert.equal(JSON.stringify(answers), before);
    const selected = selectScreeningQuestionIds(p, pub, answers);
    assert.equal(selected.includes(q.id), juvenile, "financial control is inactive only for proven adult acquittal");
    if (!juvenile) {
      assert.equal(actual.evaluation.resultCode, "guidance_only");
      assert(!actual.evaluation.missingQuestionIds.includes(q.id));
    }
    assert.equal(sanitizeResumedAnswersForQuestionIds(pub, JSON.parse(before), selected).financial_obligations, financial);
    const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative: actual, screeningAnswers: answers,
      dependencies: { commercialFlowVersion: null, entitlementSource: null, productId: null }, capturedAt: '2026-10-14T00:00:00Z' });
    assert(seed);
    const prior = { status: 'unverified', reason: 'synthetic-ga10', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
    const priorBytes = JSON.stringify(prior), model = P.protectedPacketInformationModelFor(JSON.parse(priorBytes));
    assert(model);
    assert.equal(model.initialAnswers.financial_obligations, financial);
    if (!juvenile) {
      const collection = P.packetCollectionFor({ jurisdiction: 'NE', pathwayId: route, requiredInputIds: model.requiredInputIds,
        serverFacts: model.serverFacts, screeningAnswers: model.screeningAnswers, prefilledAnswers: model.prefilledAnswers, savedAnswers: model.packetAnswers });
      const disposition = collection.facts.find(f => f.factId === q.id);
      assert.equal(disposition?.collection, 'conditional', 'retained financial fact has an explicit inactive disposition');
      assert.equal(disposition?.active, false);
      assert(!model.builderQuestions.some(q => q.id === 'financial_obligations'));
      assert(!model.missingInputIds.includes('financial_obligations'));
      assert(!P.reviewEditablePacketInputIds(model).has('financial_obligations'), 'inactive financial fact has no stale review edit link');
      assert(P.editablePacketInputIds(model, true).has('financial_obligations'), 'explicit historical correction remains supported');
    }
    assert(!seed.snapshot.dependencies.courtCompletionImplications?.financial_obligations);
    let state = prior;
    for (const value of ['I am not sure', 'No']) {
      const patch = P.packetInformationPatch({ existingItem: { id: 'synthetic-ga10-ne', jurisdiction: 'NE', artifactRefs: {} }, protectedVerification: state, answers: { financial_obligations: value } });
      assert(patch, 'real protected correction accepted');
      state = patch.protectedTransition.nextVerification;
      assert.notEqual(state.status, 'verified');
      assert.notEqual(patch.readyToGenerate, true);
      const nextModel = P.protectedPacketInformationModelFor(JSON.parse(JSON.stringify(state)));
      assert(nextModel);
      assert.equal(nextModel.initialAnswers.financial_obligations, value);
      assert.equal(nextModel.initialAnswers.court_requirements_completed, completion);
    }
    assert.equal(JSON.stringify(prior), priorBytes);
    if (!juvenile && name === 'waived_not_paid_hypothesis') {
      const changed = P.packetInformationPatch({ existingItem: { id: 'synthetic-ga10-ne', jurisdiction: 'NE', artifactRefs: {} },
        protectedVerification: state, answers: { case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted' } });
      assert(changed, 'actual protected disposition correction accepted');
      const restored = P.protectedPacketInformationModelFor(changed.protectedTransition.nextVerification);
      assert(restored);
      assert.equal(restored.initialAnswers.financial_obligations, 'No');
      assert(P.reviewEditablePacketInputIds(restored).has('financial_obligations'), 'history review control reappears after actual protected disposition change');
      assert.notEqual(changed.readyToGenerate, true);
    }
    for (const locale of ['en', 'es']) {
      const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (s, options) => resolveRuntimeText(locale, s, options) };
      const html = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value }, React.createElement(QuestionField, { question: q, stateCode: 'NE', value: financial, onChange() {} })));
      const expected = locale === 'es' ? q.translations.es.prompt : q.prompt;
      const escaped = renderToStaticMarkup(React.createElement('span', null, expected)).slice(6, -7);
      assert(html.includes(escaped));
      assert.equal((html.match(/type="radio"/g) ?? []).length, 3);
      renders.push({ routeKey, name, locale, html });
    }
    rows.push({ questionRecordId: subgroup.originalQuestionRecordIds[index], routeKey, name, financial, completion,
      observedResult: actual.evaluation.resultCode, observedReasons: actual.evaluation.reasons,
      observedUnknownFinancialHold: name === 'unknown' && actual.evaluation.missingQuestionIds.includes('financial_obligations'),
      legalFinancialEffect: 'NOT_VERIFIED', authenticatedAcceptance: 'NOT_RUN' });
  }
}
const { nebraskaNonconvictionQuestionApplies } = await import('../src/lib/rcap-engine/nebraska-nonconviction-facts.ts');
const adultRoute = 'automatic-nonconviction-sealing';
const facts = { case_outcome: 'Acquitted or found not guilty', age_at_offense: 30 };
assert.equal(nebraskaNonconvictionQuestionApplies('NE', adultRoute, facts, q.id), false);
for (const age of [undefined, null, '', 'I am not sure', 'adult', '18+', 17, -1, Number.POSITIVE_INFINITY, 30.5, { value: 30 }, { value: '30', unknown: true }, { value: '30', unknown: false, extra: true }, { value: 'adult', unknown: false }]) {
  assert.equal(nebraskaNonconvictionQuestionApplies('NE', adultRoute, { ...facts, age_at_offense: age }, q.id), true, `no adult assumption from ${JSON.stringify(age)}`);
}
for (const age of [18, 30, '30', 121, { value: '30', unknown: false }]) assert.equal(nebraskaNonconvictionQuestionApplies('NE', adultRoute, { ...facts, age_at_offense: age }, q.id), false);
for (const outcome of [undefined, 'I am not sure', 'Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Misdemeanor conviction', 'Juvenile adjudication or offense committed as a minor']) {
  const answers = { ...facts, case_outcome: outcome, financial_obligations: 'I am not sure', possible_pathway_context: p.pathways.find(p => p.id === adultRoute).label };
  assert.equal(nebraskaNonconvictionQuestionApplies('NE', adultRoute, answers, q.id), true);
  assert(selectScreeningQuestionIds(p, pub, answers).includes(q.id), 'financial control reappears when the proven disposition changes');
}
for (const raw of ['No', 'I am not sure']) {
  const answers = { ...facts, age_at_offense: { value: '30', unknown: false }, financial_obligations: raw, possible_pathway_context: p.pathways.find(p => p.id === adultRoute).label };
  const active = selectScreeningQuestionIds(p, pub, answers);
  assert(!active.includes(q.id));
  const resumed = sanitizeResumedAnswersForQuestionIds(pub, answers, active);
  assert.equal(resumed.financial_obligations, raw, 'inactive raw financial history survives actual resume sanitization');
  const changed = { ...resumed, case_outcome: 'Misdemeanor conviction' };
  assert(selectScreeningQuestionIds(p, pub, changed).includes(q.id));
  assert.equal(changed.financial_obligations, raw);
}
for (const sibling of p.pathways.filter(p => p.id !== adultRoute)) assert(nebraskaNonconvictionQuestionApplies('NE', sibling.id, facts, q.id));
assert(nebraskaNonconvictionQuestionApplies('KS', adultRoute, facts, q.id));
assert(nebraskaNonconvictionQuestionApplies('NE', adultRoute, facts, 'court_requirements_completed'));
console.log('PASS: exact NE adult-acquittal gate; unknown age/disposition, siblings and all independent facts retained; hidden No/unknown survive and reappear');

// Reconstructed now by executing exact a74 source, not a historical capture.
const reproduction = subgroup.freshBaselineReproduction;
assert.equal(reproduction.classification, 'FRESH_EXACT_BASELINE_REPRODUCTION_NOT_PRIOR_CAPTURE');
assert.equal(reproduction.sourceCommit, 'a74db0ac9ef7bac434d6c21033d31981ad4cef8c');
assert.deepEqual(reproduction.beforeReasonCodes, ['ne.source_fact_unknown']);
assert.equal(reproduction.baselineModelAvailable, true);
const historical = structuredClone(reproduction.record), historicalBytes = JSON.stringify(historical);
const heldSnapshot = historical.draftSnapshot;
const currentAuthority = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion, matterId: 'synthetic-ne-a74-held-reproduction',
  answers: { ...heldSnapshot.screeningAnswers, ...heldSnapshot.prefilledAnswers, ...heldSnapshot.packetAnswers } });
const successor = P.nebraskaAcquittalHeldSuccessor(heldSnapshot, currentAuthority);
assert(successor);
assert.equal(successor.resultCode, 'guidance_only');
assert.equal(successor.paymentAllowed, false);
for (const map of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) assert.deepEqual(successor[map], heldSnapshot[map]);
assert.deepEqual(successor.dependencies, heldSnapshot.dependencies);
assert.equal(successor.capturedAt, heldSnapshot.capturedAt);
const withInactiveHistory = structuredClone(heldSnapshot);
withInactiveHistory.packetAnswers.retired_financial_note = { value: 'Synthetic prior wording', unknown: false };
const preservedHistory = P.nebraskaAcquittalHeldSuccessor(withInactiveHistory, currentAuthority);
assert(preservedHistory);
assert.deepEqual(preservedHistory.packetAnswers.retired_financial_note, withInactiveHistory.packetAnswers.retired_financial_note);

const historicalModel = P.protectedPacketInformationModelFor(historical);
assert(historicalModel);
assert.equal(historicalModel.initialAnswers.financial_obligations, 'I am not sure');
assert.equal(historicalModel.reviewSafety.safe, false);
assert(!historicalModel.builderQuestions.some(q => q.id === 'financial_obligations'));
for (const financial of ['I am not sure', 'No']) {
  const patch = P.packetInformationPatch({ existingItem: { id: 'synthetic-ne-a74-held-reproduction', jurisdiction: 'NE', artifactRefs: {} },
    protectedVerification: historical, answers: { financial_obligations: financial } });
  assert(patch);
  assert.equal(patch.protectedTransition.nextVerification.status, 'unverified');
  assert.equal(patch.readyToGenerate, false);
  const loaded = P.protectedPacketInformationModelFor(JSON.parse(JSON.stringify(patch.protectedTransition.nextVerification)));
  assert(loaded);
  assert.equal(loaded.initialAnswers.financial_obligations, financial);
  assert.equal(loaded.reviewSafety.safe, false);
}
assert.equal(JSON.stringify(historical), historicalBytes);
for (const [name, change] of [
  ['different state', s => { s.jurisdiction = 'KS'; }],
  ['different route', s => { s.pathwayId = 'juvenile-automatic-sealing'; }],
  ['different profile version', s => { s.profileVersion += '-changed'; }],
  ['different source', s => { s.profileSourceFingerprint = 'changed'; }],
  ['different authority', s => { s.profileAuthorityFingerprint = 'changed'; }],
  ['different result', s => { s.resultCode = 'not_yet'; }],
  ['payment permission', s => { s.paymentAllowed = true; }],
  ['different packet type', s => { s.packetType = 'custom_pleading'; }],
  ['invented old plan', s => { s.packetPlan = successor.packetPlan; }],
  ['different old required inputs', s => { s.requiredInputIds = ['financial_obligations']; }],
  ['different old family', s => { s.packetFamilyIdentifiers.mode = 'custom_pleading'; }],
  ['different server facts', s => { s.serverFacts.pathway_id = 'other'; }],
  ['selected track', s => { s.selectedTrackId = 'other'; }],
  ['treatment', s => { s.treatmentClassification = 'other'; }],
  ['deferrals', s => { s.deferralComponentIds = ['other']; }],
  ['verified schema', s => { s.schemaVersion = 'expungement-ai/final-verification/v1'; }],
  ['known payment was not prior uncertainty', s => { s.screeningAnswers.financial_obligations = 'No'; }],
  ['different disposition', s => { s.prefilledAnswers.case_outcome = 'Misdemeanor conviction'; }],
  ['unknown age', s => { s.prefilledAnswers.age_at_offense = 'I am not sure'; }],
]) {
  const incompatible = structuredClone(heldSnapshot); change(incompatible);
  assert.equal(P.nebraskaAcquittalHeldSuccessor(incompatible, currentAuthority), null, name);
}
const otherUnknown = structuredClone(heldSnapshot);
otherUnknown.prefilledAnswers.pending_cases = 'I am not sure';
const heldAuthority = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion, matterId: 'synthetic-other-hold',
  answers: { ...otherUnknown.screeningAnswers, ...otherUnknown.prefilledAnswers } });
assert.equal(P.nebraskaAcquittalHeldSuccessor(otherUnknown, heldAuthority), null, 'an independent current uncertainty cannot be bypassed');
const noAuthority = structuredClone(currentAuthority); noAuthority.evaluation.paymentAllowed = true;
assert.equal(P.nebraskaAcquittalHeldSuccessor(heldSnapshot, noAuthority), null, 'never inherit a payment permission');
const changedPlan = structuredClone(currentAuthority); changedPlan.evaluation.packetPlan.sourceFormIds.push('new-form');
assert.equal(P.nebraskaAcquittalHeldSuccessor(heldSnapshot, changedPlan), null, 'unreviewed current forms fail closed');
const tampered = structuredClone(historical); tampered.draftSnapshot.screeningAnswers.financial_obligations = 'No';
assert.equal(P.protectedPacketInformationModelFor(tampered), null, 'hash protection still refuses a changed stored record');
console.log('PASS: fresh exact-baseline held draft recovers without changing history or granting authority; incompatible source, tuple, facts and forms refused');
const receipt = { scope: subgroup.id, status: 'PASS_BOUNDED_ENGINEERING_ONLY', rows, renders,
  remaining: ['Authenticated owner acceptance remains outstanding; this receipt uses real pure protected functions without a database.',
    'Jurisdiction-specific qualification, waiver and restitution legal effect remain unverified.',
    'Juvenile source contract is an adult-package routing node; this is not juvenile fulfillment acceptance.',
    'Authenticated owner journeys and qualified language review remain NOT_RUN.'] };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(receipt, null, 2) + '\n');
console.log(`PASS bounded engineering: ${rows.length} original NE witness variants, protected edit/reload and ${renders.length} EN/ES renders; authenticated acceptance remains open`);
