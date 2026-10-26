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
const juvenileNode = memo.tracks.find(t => t.trackId === 'ne-juvenile-sealing-routing');
assert.equal(juvenileNode.outputStrategy, 'process_guidance');
assert.equal(juvenileNode.participantInputs.some(i => /financial|fine|payment|restitution/i.test(i.key + i.question)), false,
  'the exact routing-only node has no financial input; this does not classify substantive juvenile completion');
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
  for (const [name, financial, completion] of [['paid', 'Yes', 'yes'], ['unpaid', 'No', 'no'], ['partly_paid', 'No', 'no'], ['waived_not_paid_hypothesis', 'No', 'yes'], ['unknown', 'I am not sure', 'yes'], ['not_asked', undefined, 'yes']]) {
    const answers = { ...base, financial_obligations: financial, court_requirements_completed: completion };
    const before = JSON.stringify(answers);
    const actual = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion, matterId: 'synthetic-ga10-ne', answers });
    assert.equal(actual.evaluation.pathwayId, route, 'exact factual candidate without forcing engine output');
    assert.equal(actual.evaluation.paymentAllowed, false);
    assert.equal(JSON.stringify(answers), before);
    const selected = selectScreeningQuestionIds(p, pub, answers);
    assert.equal(selected.includes(q.id), false, 'financial control is inactive only for these exact adult-acquittal or juvenile-guidance facts');
      assert.equal(actual.evaluation.resultCode, "guidance_only");
      assert(!actual.evaluation.missingQuestionIds.includes(q.id));
    assert.equal(sanitizeResumedAnswersForQuestionIds(pub, JSON.parse(before), selected).financial_obligations, financial);
    const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative: actual, screeningAnswers: answers,
      dependencies: { commercialFlowVersion: null, entitlementSource: null, productId: null }, capturedAt: '2026-10-14T00:00:00Z' });
    assert(seed);
    const prior = { status: 'unverified', reason: 'synthetic-ga10', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
    const priorBytes = JSON.stringify(prior), model = P.protectedPacketInformationModelFor(JSON.parse(priorBytes));
    assert(model);
    assert.equal(model.initialAnswers.financial_obligations, financial);
    const noop = P.packetInformationPatch({ existingItem: { id: 'synthetic-ga10-ne', jurisdiction: 'NE', artifactRefs: {} },
      protectedVerification: prior, answers: {} });
    assert.deepEqual(noop?.protectedTransition.nextVerification, prior, 'inactive financial history has a whole-record no-op');
    const material = P.packetInformationPatch({ existingItem: { id: 'synthetic-ga10-ne', jurisdiction: 'NE', artifactRefs: {} },
      protectedVerification: prior, answers: { charge: 'Explicit unrelated charge text correction' } });
    assert(material);
    for (const source of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) {
      const unrelated = map => Object.fromEntries(Object.entries(map).filter(([id]) => id !== 'charge'));
      assert.deepEqual(unrelated(material.protectedTransition.nextVerification.draftSnapshot[source]), unrelated(seed.snapshot[source]),
        'unrelated material save preserves raw financial/completion maps');
    }
    {
      const collection = P.packetCollectionFor({ jurisdiction: 'NE', pathwayId: route, requiredInputIds: model.requiredInputIds,
        serverFacts: model.serverFacts, screeningAnswers: model.screeningAnswers, prefilledAnswers: model.prefilledAnswers, savedAnswers: model.packetAnswers });
      const disposition = collection.facts.find(f => f.factId === q.id);
      assert.equal(disposition?.collection, 'conditional', 'retained financial fact has an explicit inactive disposition');
      assert.equal(disposition?.active, false);
      assert.equal(disposition?.source, juvenile ? 'ne_juvenile_routing_guidance_no_financial_input' : 'ne_adult_acquittal_no_financial_predicate');
      assert(disposition.reason.includes(juvenile ? 'without inferring completion or sealing eligibility' : 'adult acquittal automatic route has no financial predicate'));
      assert(!model.builderQuestions.some(q => q.id === 'financial_obligations'));
      assert(!model.missingInputIds.includes('financial_obligations'));
      assert(!P.reviewEditablePacketInputIds(model).has('financial_obligations'), 'inactive financial fact has no stale review edit link');
      assert(P.editablePacketInputIds(model, true).has('financial_obligations'), 'explicit historical correction remains supported');
    }
    assert(!seed.snapshot.dependencies.courtCompletionImplications?.financial_obligations);
    let state = prior;
    for (const value of ['I am not sure', 'No']) {
      const previousHistory = structuredClone(state.draftSnapshot.dependencies.semanticAnswerHistory ?? []);
      const patch = P.packetInformationPatch({ existingItem: { id: 'synthetic-ga10-ne', jurisdiction: 'NE', artifactRefs: {} }, protectedVerification: state, answers: { financial_obligations: value } });
      assert(patch, 'real protected correction accepted');
      state = patch.protectedTransition.nextVerification;
      assert.notEqual(state.status, 'verified');
      assert.notEqual(patch.readyToGenerate, true);
      const nextModel = P.protectedPacketInformationModelFor(JSON.parse(JSON.stringify(state)));
      assert(nextModel);
      assert.equal(nextModel.initialAnswers.financial_obligations, value);
      assert.equal(nextModel.initialAnswers.court_requirements_completed, completion);
      const unrelated = map => Object.fromEntries(Object.entries(map).filter(([id]) => id !== q.id));
      for (const source of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) {
        assert.deepEqual(unrelated(state.draftSnapshot[source]), unrelated(seed.snapshot[source]), 'explicit correction preserves every unrelated raw map');
      }
      for (const entry of previousHistory) assert(state.draftSnapshot.dependencies.semanticAnswerHistory.some(next => JSON.stringify(next) === JSON.stringify(entry)),
        'explicit financial correction preserves every existing protected history entry');
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

const juvenileRoute = 'juvenile-automatic-sealing';
const juvenileFacts = { case_outcome: 'Juvenile adjudication or offense committed as a minor', age_at_offense: 15 };
for (const age of [0, 15, 17, '17', { value: '15', unknown: false }]) {
  assert.equal(nebraskaNonconvictionQuestionApplies('NE', juvenileRoute, { ...juvenileFacts, age_at_offense: age }, q.id), false);
}
for (const age of [undefined, null, '', 'I am not sure', 'minor', '17+', -1, 18, 30, 15.5, Infinity,
  { value: 15 }, { value: 15, unknown: true }, { value: 15, unknown: false, extra: true }]) {
  assert.equal(nebraskaNonconvictionQuestionApplies('NE', juvenileRoute, { ...juvenileFacts, age_at_offense: age }, q.id), true,
    `juvenile routing applicability requires explicit known minor age: ${JSON.stringify(age)}`);
}
for (const outcome of [undefined, 'I am not sure', 'Mixed charges or different case outcomes', 'Misdemeanor conviction', 'Acquitted or found not guilty']) {
  assert(nebraskaNonconvictionQuestionApplies('NE', juvenileRoute, { ...juvenileFacts, case_outcome: outcome }, q.id));
}
for (const way of p.pathways.filter(way => way.id !== juvenileRoute)) {
  assert(nebraskaNonconvictionQuestionApplies('NE', way.id, juvenileFacts, q.id), 'no other NE route inherits a juvenile finance bypass');
}
assert(nebraskaNonconvictionQuestionApplies('KS', juvenileRoute, juvenileFacts, q.id));
for (const id of ['case_outcome', 'age_at_offense', 'sentence_completion_date', 'court_requirements_completed', 'county', 'court']) {
  assert(nebraskaNonconvictionQuestionApplies('NE', juvenileRoute, juvenileFacts, id), 'actual routing/completion facts remain applicable');
}
// Independently uncertain completion remains held; an irrelevant payment answer
// supplies neither that fact nor a claim that the juvenile record was sealed.
const juvenileSeedFacts = { ...rows.find(row => row.routeKey === 'NE:' + juvenileRoute && row.name === 'unknown') };
assert.equal(juvenileSeedFacts.observedUnknownFinancialHold, false, 'preserved before-example no longer holds solely on payment');
const juvenileBase = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local',
  possible_pathway_context: p.pathways.find(way => way.id === juvenileRoute).label,
  ...juvenileFacts, court: 'County court', charge: 'Misdemeanor charge', offense_level: 'Misdemeanor',
  court_requirements_completed: 'yes', pending_cases: 'No', sentence_completion_date: 'Yes',
  special_preconditions_confirmed: 'Yes', new_convictions_during_waiting_period: 'No', record_documents: 'Yes',
  resolved_timing_bucket: '5_to_10_years', pardon_status: 'No', identity_error: 'No', financial_obligations: 'I am not sure' };
for (const completion of ['No', 'I am not sure']) {
  const answers = { ...juvenileBase, sentence_completion_date: completion };
  const before = structuredClone(answers), actual = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion,
    matterId: 'synthetic-ne-juvenile-completion', answers });
  assert.equal(actual.evaluation.paymentAllowed, false);
  assert.notEqual(actual.evaluation.resultCode, 'packet_ready');
  if (completion === 'I am not sure') assert.equal(actual.evaluation.resultCode, 'needs_review');
  assert(!actual.evaluation.reasons.some(reason => reason.text.includes('financial_obligations')));
  assert.deepEqual(answers, before, 'completion and raw financial uncertainty are not rewritten');
}
for (const facts of [{ age_at_offense: 'I am not sure' }, { case_outcome: 'Mixed charges or different case outcomes' }]) {
  const answers = { ...juvenileBase, ...facts }, before = structuredClone(answers);
  const actual = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion, matterId: 'synthetic-ne-juvenile-review', answers });
  assert.equal(actual.evaluation.paymentAllowed, false);
  assert.notEqual(actual.evaluation.resultCode, 'guidance_only', 'unknown age or mixed disposition retains its own review');
  assert(selectScreeningQuestionIds(p, pub, answers).includes(q.id), 'uncertain route facts do not acquire the exact juvenile applicability exception');
  assert.deepEqual(answers, before);
}
console.log('PASS: juvenile routing-only financial applicability, minor/mixed boundaries and independent completion uncertainty retained');

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

// Real presentation and server-page consumer. Only transport reads are supplied;
// this is a pure test, never authentication or database acceptance.
const { decorateBriefcaseItemForPresentationWithDependencies: decorate } = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const pageItem = { id: 'synthetic-ne-owner-guidance', jurisdiction: 'NE', artifactRefs: {} };
async function present(record) {
  return decorate({ consumerAuthUserId: 'synthetic-ne-owner', item: pageItem }, {
    readProtectedArtifact: async () => ({ ok: true, value: null }),
    readProtectedVerification: async () => ({ ok: true, value: record }),
    readTrustedPendingSource: async () => ({ ok: false, reason: 'synthetic_absent' }),
    readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
    evaluateAuthoritative: evaluate,
    readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
  });
}
const pageFile = process.cwd() + '/src/app/briefcase/[packetId]/packet-information/page.tsx';
let pageSource = fs.readFileSync(pageFile, 'utf8');
// Font setup is a Next build concern; retain the page's complete child tree.
pageSource = pageSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";', 'const BriefcaseShell = ({ children }: any) => children;');
for (const [binding, module] of [['requireConsumerBriefcaseSession', 'auth'], ['getBriefcaseItem', 'briefcase'], ['decorateBriefcaseItemForPresentation', 'briefcase-presentation-authority']]) {
  const original = 'import { ' + binding + ' } from "@/lib/expungement-ai/' + module + '";';
  assert(pageSource.includes(original));
  pageSource = pageSource.replace(original, 'const ' + binding + ' = (...args: unknown[]) => (globalThis as any).__nePageTransport.' + binding + '(...args);');
}
const compiledPage = ts.transpileModule(pageSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), { data: { url: pathToFileURL(pageFile).href, source: compiledPage } });
const { default: Page } = await import(pathToFileURL(pageFile).href);
const { AppRouterContext } = await import(pathToFileURL(process.cwd() + '/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js').href);
function nodes(element, result = []) {
  if (!element || typeof element !== 'object') return result;
  if (Array.isArray(element)) { for (const child of element) nodes(child, result); return result; }
  if (element.props) { result.push(element); nodes(element.props.children, result); }
  return result;
}
async function pageFor(presentation, edit) {
  globalThis.__nePageTransport = {
    requireConsumerBriefcaseSession: async () => ({ userId: 'synthetic-ne-owner', userEmail: 'owner@example.test' }),
    getBriefcaseItem: async () => pageItem,
    decorateBriefcaseItemForPresentation: async () => presentation
  };
  return nodes(await Page({ params: Promise.resolve({ packetId: pageItem.id }), searchParams: Promise.resolve({ edit }) }));
}
const historicalPresentation = await present(historical);
assert.equal(historicalPresentation.authorityStatus, 'protected_draft');
assert.equal(historicalPresentation.resultCode, 'guidance_only');
assert.equal(historicalPresentation.packetDraft.status, 'available');
assert.equal(historicalPresentation.verificationStatus, 'unverified');
assert.equal(Object.values(historicalPresentation.commercialActions).some(Boolean), false);
assert.equal(JSON.stringify(historical), historicalBytes);
const fullOwnerSequence = [];
const uncertainOwnerSequence = [];
for (const financial of ['No', 'I am not sure', undefined]) {
  const answers = { ...heldSnapshot.screeningAnswers, ...heldSnapshot.prefilledAnswers, financial_obligations: financial };
  const authoritative = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion, matterId: pageItem.id, answers });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, dependencies: {}, capturedAt: '2026-10-14T00:00:00Z' });
  const record = { status: 'unverified', reason: 'synthetic-guidance', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
  for (const current of [record, historical]) {
    const presentation = await present(current), model = P.protectedPacketInformationModelFor(current);
    assert.deepEqual([...P.heldPacketCorrectionInputIds(model, presentation.resultCode)].sort(), ['age_at_offense', 'case_outcome']);
    for (const edit of ['age_at_offense', 'case_outcome']) {
      const elements = await pageFor(presentation, edit);
      const builder = elements.find(e => e.type?.name === 'PacketInformationBuilder');
      assert(builder, 'actual server page creates correction builder');
      assert.deepEqual(builder.props.questions.map(q => q.id), [edit]);
      assert.equal(builder.props.initialRouteChanged, false, 'opening guidance is not a route change');
      assert.equal(builder.props.returnToMatterAfterCorrection, true);
      if (financial === 'No' && current === record) for (const locale of ['en', 'es']) {
        const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (s, options) => resolveRuntimeText(locale, s, options) };
        const markup = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: { push() {} } },
          React.createElement(LocalizationContext.Provider, { value }, builder)));
        assert(markup.includes(locale === 'es' ? 'Guardar y volver al caso' : 'Save and return to matter'));
        assert(!markup.includes('Your saved answers changed which packet path') && !markup.includes('Sus respuestas guardadas cambiaron la vía'));
        assert(markup.includes('data-packet-question="' + edit + '"'));
      }
      const links = elements.filter(e => typeof e.props.href === 'string').map(e => e.props.href);
      for (const id of ['case_outcome', 'age_at_offense']) assert(links.some(href => href.endsWith('?edit=' + id)), 'actual correction navigation retains each predicate');
      assert(!links.some(href => href.includes('financial_obligations')));
      const paired = elements.filter(e => typeof e.props.en === 'string' && typeof e.props.es === 'string');
      assert(paired.some(e => e.props.en === 'Review saved case answers' && e.props.es === 'Revise las respuestas guardadas sobre el caso'));
      assert(paired.some(e => e.props.en.includes('used for this guidance') && e.props.es.includes('se usan para esta orientación')));
      assert(!paired.some(e => /result remains on hold|pay only when/.test(e.props.en)));
    }
  }
  let sequenced = record;
  for (const [answers, verify] of [[{ age_at_offense: { value: '31', unknown: false } }, false], [{ age_at_offense: { value: '30', unknown: false } }, false], [{}, true]]) {
    const patch = P.packetInformationPatch({ existingItem: pageItem, protectedVerification: sequenced, answers, verify });
    assert(patch); assert.equal(patch.readyToGenerate, false);
    sequenced = JSON.parse(JSON.stringify(patch.protectedTransition.nextVerification));
  }
  assert.equal(sequenced.status, 'invalidated', 'the actual verify attempt never grants authority');
  for (const [id, value, restore] of [
    ['age_at_offense', { value: '', unknown: true }, { value: '30', unknown: false }],
    ['age_at_offense', { value: '', unknown: false }, { value: '30', unknown: false }],
    ['case_outcome', 'I am not sure', 'Acquitted or found not guilty']
  ]) {
    const original = JSON.stringify(sequenced);
    const patch = P.packetInformationPatch({ existingItem: pageItem, protectedVerification: sequenced, answers: { [id]: value } });
    assert.equal(JSON.stringify(sequenced), original);
    const held = patch?.protectedTransition.nextVerification ?? sequenced;
    if (patch) { assert.equal(patch.readyToGenerate, false); assert.notEqual(held.status, 'verified'); }
    const presentation = await present(held);
    let builder;
    try { builder = (await pageFor(presentation, id)).find(e => e.type?.name === 'PacketInformationBuilder'); } catch { /* Retain the exact before failure for this control. */ }
    const restored = P.packetInformationPatch({ existingItem: pageItem, protectedVerification: held, answers: { [id]: restore } });
    uncertainOwnerSequence.push({ financial: financial ?? 'absent', id, value, saveAccepted: Boolean(patch), result: presentation.resultCode,
      builderAvailable: Boolean(builder?.props.questions.some(q => q.id === id)), restorationAccepted: Boolean(restored) });
    if (restored) {
      assert.equal(restored.readyToGenerate, false);
      const restoredView = await present(restored.protectedTransition.nextVerification);
      uncertainOwnerSequence[uncertainOwnerSequence.length - 1].restoredResult = restoredView.resultCode;
    }
  }
  const dismissed = P.packetInformationPatch({ existingItem: pageItem, protectedVerification: sequenced, answers: { case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted' } });
  assert(dismissed); const changed = dismissed.protectedTransition.nextVerification, changedModel = P.protectedPacketInformationModelFor(changed);
  assert(changedModel); assert(P.reviewEditablePacketInputIds(changedModel).has('financial_obligations'));
  assert.equal(changedModel.pathwayId, adultRoute);
  if (financial === undefined) {
    assert.equal(changedModel.resultCode, 'needs_more_info');
    assert.equal(changed.draftSnapshot.paymentAllowed, false);
    assert.equal(changed.draftSnapshot.packetPlan, null);
    assert(P.heldPacketCorrectionInputIds(changedModel, changedModel.resultCode).has('case_outcome'));
  }
  assert.equal(changedModel.initialAnswers.financial_obligations, financial);
  const changedPresentation = await present(changed);
  const surfaces = [];
  for (const edit of ['financial_obligations', 'age_at_offense', 'case_outcome']) {
    let builder = null;
    try { builder = (await pageFor(changedPresentation, edit)).find(e => e.type?.name === 'PacketInformationBuilder'); } catch { /* The before correction redirects unavailable controls. */ }
    if (builder) { assert.equal(builder.props.initialRouteChanged, false); assert.equal(builder.props.returnToMatterAfterCorrection, true); }
    surfaces.push({ edit, builderAvailable: Boolean(builder?.props.questions.some(q => q.id === edit)), raw: builder?.props.initialAnswers.financial_obligations });
  }
  fullOwnerSequence.push({ financial: financial ?? 'absent', result: changedPresentation.resultCode, status: changed.status, surfaces });
  let financialCorrection = changed;
  for (const value of ['I am not sure', 'No']) {
    const edit = P.packetInformationPatch({ existingItem: pageItem, protectedVerification: financialCorrection, answers: { financial_obligations: value } });
    assert(edit); assert.equal(edit.readyToGenerate, false);
    financialCorrection = JSON.parse(JSON.stringify(edit.protectedTransition.nextVerification));
    assert.notEqual(financialCorrection.status, 'verified');
    const savedPresentation = await present(financialCorrection);
    assert.equal(Object.values(savedPresentation.commercialActions).some(Boolean), false);
    const savedBuilder = (await pageFor(savedPresentation, 'financial_obligations')).find(e => e.type?.name === 'PacketInformationBuilder');
    assert(savedBuilder?.props.questions.some(q => q.id === 'financial_obligations'));
    assert.equal(savedBuilder.props.initialAnswers.financial_obligations, value);
    assert.equal(savedBuilder.props.initialAnswers.case_outcome, 'Dismissed, no-billed, nolle prosequi, or not prosecuted');
    for (const locale of ['en', 'es']) {
      const localized = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (s, options) => resolveRuntimeText(locale, s, options) };
      const html = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: { push() {} } },
        React.createElement(LocalizationContext.Provider, { value: localized }, savedBuilder)));
      assert(html.includes('data-packet-question="financial_obligations"'));
      assert.equal((html.match(/type="radio"/g) ?? []).length, 3);
    }
  }
  const restored = P.packetInformationPatch({ existingItem: pageItem, protectedVerification: changed, answers: { case_outcome: 'Acquitted or found not guilty' } });
  assert(restored); const restoredModel = P.protectedPacketInformationModelFor(restored.protectedTransition.nextVerification);
  assert(!P.reviewEditablePacketInputIds(restoredModel).has('financial_obligations'));
  assert.equal(restoredModel.initialAnswers.financial_obligations, financial);
  assert.equal(restored.readyToGenerate, false);
  const restoredPresentation = await present(restored.protectedTransition.nextVerification);
  const restoredPage = await pageFor(restoredPresentation, 'case_outcome');
  assert(restoredPage.some(e => e.type?.name === 'PacketInformationBuilder' && e.props.questions.some(q => q.id === 'case_outcome')));
  assert(!restoredPage.some(e => typeof e.props.href === 'string' && e.props.href.includes('financial_obligations')));
}
// Optional pathway hints are never provenance: these are fresh, genuine seeds
// without the hint, followed by ordinary protected edits and saved reloads.
const noHintHistoryCases = [], rejectedHistoryCases = [];
let heldWithoutHint;
for (const financial of ['No', 'I am not sure', undefined]) {
  const answers = { ...heldSnapshot.screeningAnswers, ...heldSnapshot.prefilledAnswers, financial_obligations: financial };
  delete answers.possible_pathway_context;
  const authoritative = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion, matterId: pageItem.id, answers });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, dependencies: {}, capturedAt: '2026-10-14T00:00:00Z' });
  assert.equal(seed.snapshot.resultCode, 'guidance_only');
  const record = { status: 'unverified', reason: 'synthetic-guidance-no-hint', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
  for (const [id, value, restore] of [
    ['age_at_offense', { value: '', unknown: true }, { value: '30', unknown: false }],
    ['age_at_offense', { value: '', unknown: false }, { value: '30', unknown: false }],
    ['case_outcome', 'I am not sure', 'Acquitted or found not guilty']
  ]) {
    const patch = P.packetInformationPatch({ existingItem: pageItem, protectedVerification: record, answers: { [id]: value } });
    assert(patch); const held = JSON.parse(JSON.stringify(patch.protectedTransition.nextVerification));
    const bytes = JSON.stringify(held), model = P.protectedPacketInformationModelFor(held);
    assert(model); assert.equal(model.packetPlan, null);
    if (model.pathwayId === null) assert.deepEqual(model.heldFactualCorrectionIds, ['case_outcome', 'age_at_offense']);
    if (model.pathwayId === null) assert.deepEqual([...P.heldPacketCorrectionInputIds(model, model.resultCode)].sort(), ['age_at_offense', 'case_outcome']);
    assert.equal(model.initialAnswers.possible_pathway_context, undefined);
    assert.equal(held.draftSnapshot.paymentAllowed, false);
    assert.equal(Object.hasOwn(held.draftSnapshot, 'heldFactualCorrectionIds'), false, 'projection is not persisted authority');
    const view = await present(held);
    assert.equal(view.authorityStatus, 'protected_draft'); assert.notEqual(view.verificationStatus, 'verified');
    assert.equal(Object.values(view.commercialActions).some(Boolean), false);
    for (const edit of ['case_outcome', 'age_at_offense']) {
      const page = await pageFor(view, edit);
      assert(page.some(e => e.type?.name === 'PacketInformationBuilder' && e.props.questions.some(q => q.id === edit)));
      assert(page.some(e => typeof e.props.href === 'string' && e.props.href.endsWith('?edit=' + edit)));
      if (model.pathwayId === null) assert(!page.some(e => typeof e.props.href === 'string' && e.props.href.includes('financial_obligations')));
      const builder = page.find(e => e.type?.name === 'PacketInformationBuilder');
      assert.equal(builder.props.initialRouteChanged, false);
      assert.equal(builder.props.returnToMatterAfterCorrection, true);
      for (const locale of ['en', 'es']) {
        const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (s, options) => resolveRuntimeText(locale, s, options) };
        const html = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: { push() {} } },
          React.createElement(LocalizationContext.Provider, { value }, builder)));
        const label = locale === 'es' ? 'Guardar y volver al caso' : 'Save and return to matter';
        const button = html.match(new RegExp('<button[^>]*>' + label + '</button>'))?.[0];
        assert(button && !button.includes('disabled='), 'held correction has enabled save-and-return in ' + locale);
        assert(!html.includes('Your saved answers changed which packet path') && !html.includes('Sus respuestas guardadas cambiaron la vía'));
      }
    }
    const restored = P.packetInformationPatch({ existingItem: pageItem, protectedVerification: held, answers: { [id]: restore } });
    assert(restored); assert.equal(restored.readyToGenerate, false);
    const restoredView = await present(restored.protectedTransition.nextVerification);
    assert.equal(restoredView.resultCode, 'guidance_only');
    assert.equal(Object.values(restoredView.commercialActions).some(Boolean), false);
    assert.equal(JSON.stringify(held), bytes, 'all protected source maps and history unchanged by projection and restore');
    noHintHistoryCases.push({ financial: financial ?? 'absent', id, value, result: view.resultCode, path: model.pathwayId, restored: restoredView.resultCode });
    if (model.pathwayId === null) heldWithoutHint = held;
  }
}
for (const [name, change] of [
  ['absent history', s => { delete s.dependencies.semanticAnswerHistory; }],
  ['empty history', s => { s.dependencies.semanticAnswerHistory = []; }],
  ...Object.entries({ routeKey: 'NE:juvenile-automatic-sealing', profileVersion: 'wrong', profileSourceFingerprint: 'wrong',
    profileAuthorityFingerprint: 'wrong', meaning: 'legacy', factId: 'financial_obligations', source: 'serverFacts', value: { unknown: false, extra: 'malformed' } })
    .map(([key, value]) => ['wrong prior ' + key, s => { s.dependencies.semanticAnswerHistory = s.dependencies.semanticAnswerHistory.map(entry => ({ ...entry, [key]: value })); }]),
  ...['profileVersion', 'profileSourceFingerprint', 'profileAuthorityFingerprint'].map(key => ['wrong current ' + key, s => { s[key] = 'wrong'; }])
]) {
  const altered = structuredClone(heldWithoutHint); change(altered.draftSnapshot);
  altered.draftHash = P.protectedPacketDraftHash(altered.draftSnapshot);
  const model = P.protectedPacketInformationModelFor(altered);
  assert.equal(model?.heldFactualCorrectionIds?.length ?? 0, 0, name);
  if (model) assert.equal(P.heldPacketCorrectionInputIds(model, model.resultCode).size, 0, name);
  const view = await present(altered);
  let builder; try { builder = (await pageFor(view, 'case_outcome')).find(e => e.type?.name === 'PacketInformationBuilder'); } catch { /* Explicitly refused edit. */ }
  assert.equal(Boolean(builder), false, name + ' must not expose correction from unsupported history');
  rejectedHistoryCases.push(name);
}
const unavailableSequenceControls = fullOwnerSequence.flatMap(row => row.surfaces.filter(surface => !surface.builderAvailable).map(surface => ({ financial: row.financial, result: row.result, edit: surface.edit })));
assert.deepEqual(unavailableSequenceControls, [], 'full verified-refusal then dismissal sequence keeps actual correction controls reachable: ' + JSON.stringify(unavailableSequenceControls));
const uncertainFailures = uncertainOwnerSequence.filter(row => !row.builderAvailable || !row.restorationAccepted || row.restoredResult !== 'guidance_only');
assert.deepEqual(uncertainFailures, [], 'unknown/cleared predicate stays correctable: ' + JSON.stringify(uncertainFailures));
for (const patch of [{ stateCode: 'KS' }, { pathwayId: 'juvenile-automatic-sealing' }, { packetPlan: null }, { packetPlan: { ...historicalModel.packetPlan, sourceFormIds: ['invented'] } }, { prefilledAnswers: { ...historicalModel.prefilledAnswers, age_at_offense: { unknown: true } } }]) {
  assert.equal(P.isNebraskaNonconvictionGuidanceCorrection({ ...historicalModel, ...patch }, 'guidance_only'), false);
}
for (const name of ['profileSourceFingerprint', 'profileAuthorityFingerprint', 'profileVersion']) {
  const altered = structuredClone(historical); altered.draftSnapshot[name] = 'changed'; altered.draftHash = P.protectedPacketDraftHash(altered.draftSnapshot);
  assert.equal((await present(altered)).authorityStatus, 'unavailable', 'presentation never upgrades altered historical source');
}
assert.equal((await present(tampered)).authorityStatus, 'unavailable');
const { nebraskaMissingFinancialCorrectionPathway } = await import('../src/lib/rcap-engine/nebraska-nonconviction-facts.ts');
const { nebraskaAdultNonconvictionCorrectionApplies } = await import('../src/lib/rcap-engine/nebraska-nonconviction-facts.ts');
for (const outcome of ['Acquitted or found not guilty', 'Dismissed, no-billed, nolle prosequi, or not prosecuted']) {
  const answers = { case_outcome: outcome, age_at_offense: { value: '30', unknown: false } };
  assert(nebraskaAdultNonconvictionCorrectionApplies('NE', adultRoute, answers));
  for (const patch of [{ case_outcome: [outcome] }, { case_outcome: { value: outcome, unknown: false } }, { case_outcome: 'I am not sure' }, { age_at_offense: { value: '30', unknown: true } }, { age_at_offense: 17 }]) {
    assert.equal(nebraskaAdultNonconvictionCorrectionApplies('NE', adultRoute, { ...answers, ...patch }), false);
  }
  assert.equal(nebraskaAdultNonconvictionCorrectionApplies('KS', adultRoute, answers), false);
  assert.equal(nebraskaAdultNonconvictionCorrectionApplies('NE', 'juvenile-automatic-sealing', answers), false);
}
const dismissedFacts = { ...heldSnapshot.screeningAnswers, ...heldSnapshot.prefilledAnswers,
  case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted', financial_obligations: undefined };
assert(nebraskaMissingFinancialCorrectionPathway('NE', adultRoute, dismissedFacts, ['financial_obligations']));
for (const [state, route, answers, missing] of [
  ['KS', adultRoute, dismissedFacts, ['financial_obligations']],
  ['NE', 'juvenile-automatic-sealing', dismissedFacts, ['financial_obligations']],
  ['NE', null, dismissedFacts, ['financial_obligations']],
  ['NE', adultRoute, { ...dismissedFacts, age_at_offense: 17 }, ['financial_obligations']],
  ['NE', adultRoute, { ...dismissedFacts, age_at_offense: { value: '30', unknown: true } }, ['financial_obligations']],
  ['NE', adultRoute, { ...dismissedFacts, case_outcome: 'I am not sure' }, ['financial_obligations']],
  ['NE', adultRoute, dismissedFacts, ['financial_obligations', 'case_outcome']],
  ['NE', adultRoute, dismissedFacts, ['age_at_offense']]
]) assert.equal(nebraskaMissingFinancialCorrectionPathway(state, route, answers, missing), false);
for (const patch of [{ age_at_offense: undefined }, { age_at_offense: 'I am not sure' }, { case_outcome: undefined }, { case_outcome: 'I am not sure' }]) {
  const actual = evaluate({ jurisdiction: 'NE', profileVersion: p.profileVersion, matterId: pageItem.id, answers: { ...dismissedFacts, ...patch } });
  assert.equal(actual.evaluation.pathwayId ?? null, null, 'unknown route predicate does not acquire correction routing context');
  assert.equal(actual.evaluation.paymentAllowed, false);
}
delete globalThis.__nePageTransport;
// Execute the actual component event-handler bodies with controlled successful
// save receipts; no duplicate navigation implementation or browser/DB claim.
const builderSource = fs.readFileSync('src/components/expungement-ai/PacketInformationBuilder.tsx', 'utf8');
const forwardBody = builderSource.slice(builderSource.indexOf('  async function continueForward()'), builderSource.indexOf('  async function leave('));
const backBody = builderSource.slice(builderSource.indexOf('  async function back()'), builderSource.indexOf('  const displayedAnswerState'));
assert(forwardBody.startsWith('  async function continueForward()'));
assert(backBody.startsWith('  async function back()'));
async function navigationFor(returnToMatterAfterCorrection, result, event) {
  const destinations = [], cleared = [];
  const bindings = { returnToMatterAfterCorrection, itemId: pageItem.id,
    screen: { id: 'case_outcome', questions: [] }, screenId: 'case_outcome',
    screens: [{ id: 'case_outcome', questions: [] }], index: 0,
    latest: { current: {} }, confirmed: { current: {} }, inflight: { current: null },
    editingFromReview: true, blocksContinue: () => false, setFieldErrors: value => cleared.push(value),
    save: async () => result, navigate: destination => destinations.push(destination),
    leave: async destination => destinations.push(destination), changedPacketAnswers: () => ({}) };
  const actions = new Function(...Object.keys(bindings), forwardBody + backBody + '\nreturn { continueForward, back };')(...Object.values(bindings));
  await actions[event](); return destinations;
}
for (const receipt of [{ nextAction: 'open_matter', reviewPath: '/forbidden-review' }, { nextAction: 'review', reviewPath: '/forbidden-review' }]) {
  assert.deepEqual(await navigationFor(true, receipt, 'continueForward'), ['/briefcase/' + pageItem.id]);
}
assert.deepEqual(await navigationFor(true, null, 'continueForward'), [], 'failed save never navigates or discards');
assert.deepEqual(await navigationFor(true, {}, 'back'), ['/briefcase/' + pageItem.id]);
assert.deepEqual(await navigationFor(false, { nextAction: 'open_matter' }, 'continueForward'), [], 'other held routes keep prior guard');
assert.deepEqual(await navigationFor(false, { nextAction: 'review', reviewPath: '/existing-review' }, 'continueForward'), ['/existing-review#packet-review-heading']);
assert.deepEqual(await navigationFor(false, {}, 'back'), ['/briefcase/' + pageItem.id + '/review#packet-review-heading']);
console.log('PASS: actual NE presentation/page builder exposes age and disposition corrections, preserves history, rejects altered source and grants no packet/payment authority');

const receipt = { scope: subgroup.id, status: 'PASS_BOUNDED_ENGINEERING_ONLY', rows, renders,
  ownerCorrectionConsumers: { status: 'PASS_PURE_CONSUMERS',
    fullOwnerSequence, uncertainOwnerSequence, noHintHistoryCases, rejectedHistoryCases,
    surfaces: ['actual protected presentation', 'actual server page correction links and builder props', 'EN/ES builder SSR', 'actual continue/back event handlers'],
    cases: ['No/unknown/missing financial history', 'fresh and exact historical draft', 'age and disposition correction controls', 'dismissal restores financial correction and acquittal hides it', 'missing financial hold retains exact known route', 'source mismatch denial', 'unchanged sibling navigation'],
    authenticatedOwnerAcceptance: 'NOT_RUN_BY_THIS_TEST' },
  remaining: ['Authenticated owner acceptance remains outstanding; this receipt uses real pure protected functions without a database.',
    'Jurisdiction-specific qualification, waiver and restitution legal effect remain unverified.',
    'Juvenile source contract is an adult-package routing node; this is not juvenile fulfillment acceptance.',
    'Authenticated owner journeys and qualified language review remain NOT_RUN.'] };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(receipt, null, 2) + '\n');
console.log(`PASS bounded engineering: ${rows.length} original NE witness variants, protected edit/reload and ${renders.length} EN/ES renders; authenticated acceptance remains open`);
