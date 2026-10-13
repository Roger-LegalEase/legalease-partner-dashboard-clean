import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { convictionReliefQuestions, CONVICTION_RELIEF_COPY } = await import('../src/lib/rcap-engine/conviction-relief-request.ts');
const { parseJurisdictionProfile } = await import('../src/lib/expungement-ai/frontend/schemas.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const B = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/conviction-fallback-predecessors.json', import.meta.url)));
const checks = [], rows = [];
const check = (id, pass) => checks.push({ id, pass: !!pass });
const same = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
const maps = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'];
for (const state of ['MS', 'GA', 'IL']) {
  const fixture = fixtures.rows.find(r => r.id.startsWith(state) && r.id.endsWith('/omitted'));
  const p = getProfileByJurisdiction(state), pub = projectPublicProfile(p), parsed = parseJurisdictionProfile(pub);
  check(state + '/strict-profile', parsed.ok);
  const answers = fixture.answers;
  const before = structuredClone(answers), pathways = p.pathways, rules = p.orderedDecisionRules;
  const wrong = pathways.find(path => path.id === fixture.verification.draftSnapshot.pathwayId);
  const evaluate = a => evaluateScreening({ jurisdiction: state, profileVersion: p.profileVersion, matterId: 'synthetic-fallback-test', answers: a });
  const helpId = `${state.toLowerCase()}_record_help`;
  for (const reversed of [false, true]) {
    p.pathways = reversed ? [...pathways].reverse() : pathways;
    p.orderedDecisionRules = reversed ? [...rules].reverse() : rules;
    for (const hint of [undefined, '', 'Skip', 'None of these / I am not sure', wrong.label, wrong.id]) {
      const a = { ...answers, possible_pathway_context: hint }, result = evaluate(a), selected = selectScreeningQuestionIds(p, pub, a);
      const id = `${state}/${reversed}/${hint}`;
      check(id + '/asks-real-election', result.resultCode === 'needs_more_info' && same(result.missingQuestionIds, [helpId]));
      check(id + '/no-wrong-authority', !result.pathwayId && !result.packetPlan && !result.paymentAllowed);
      check(id + '/visible', result.missingQuestionIds.every(q => selected.includes(q) && pub.questions.some(question => question.id === q)));
      check(id + '/es-reason', result.reasons.every(r => resolveRuntimeText('es', r.text) !== r.text));
      rows.push({ state, hint, reversed, result });
    }
    const selected = evaluate({ ...answers, [helpId]: 'conviction_record' });
    check(`${state}/${reversed}/ordinary-request`, state === 'MS'
      ? selected.resultCode === 'needs_more_info' && selected.missingQuestionIds.includes('case_outcome') && !selected.pathwayId
      : selected.pathwayId === (state === 'GA' ? 'sb-288-misdemeanor-conviction-restriction-and-sealing' : 'adult-conviction-sealing'));
  }
  p.pathways = pathways; p.orderedDecisionRules = rules;
  try {
    p.pathways = [wrong];
    p.orderedDecisionRules = rules.filter(r => r.candidatePathwayIds?.length === 1 && r.candidatePathwayIds[0] === wrong.id);
    const result = evaluate(answers);
    check(state + '/sole-rule-not-proof', !result.pathwayId && !result.paymentAllowed && result.missingQuestionIds.includes(helpId));
  } finally { p.pathways = pathways; p.orderedDecisionRules = rules; }
  for (const invalid of [[], ['conviction_record'], {}, { value: 'conviction_record' }, true, 1, 'not_a_choice']) {
    const r = evaluate({ ...answers, [helpId]: invalid });
    check(state + '/strict-election/' + JSON.stringify(invalid), !r.pathwayId && !r.paymentAllowed && r.missingQuestionIds.includes(helpId));
  }
  for (const q of convictionReliefQuestions(state)) {
    const projected = pub.questions.find(question => question.id === q.id);
    check(state + '/' + q.id + '/copy-and-wire', same(projected.options, q.options) && !!projected.translations?.es?.prompt
      && q.options.every(value => q.optionDisplay[value].translations.es.label));
    if (parsed.ok) {
      const a = { ...answers, [q.id]: q.options[0] };
      check(state + '/' + q.id + '/inactive-retention', same(sanitizeAnswersForQuestionIds(a, pub.questions.map(q => q.id), [], parsed.data)[q.id], a[q.id]));
      check(state + '/' + q.id + '/resumed-retention', same(sanitizeResumedAnswersForQuestionIds(parsed.data, a, [helpId])[q.id], a[q.id]));
    }
  }
  check(state + '/raw-unchanged', same(answers, before));
  const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jurisdiction: state, profileVersion: p.profileVersion, matterId: 'synthetic-fallback-handler', answers }) }));
  const body = await response.json();
  check(state + '/actual-handler', response.status === 200 && !body.pathwayId && !body.paymentAllowed && body.missingQuestionIds.includes(helpId));
  if (state === 'GA') for (const outcome of ['Pardoned conviction', 'Other conviction or adjudication', 'Misdemeanor conviction', 'Felony conviction']) {
    const a = { ...answers, case_outcome: outcome, ga_record_help: 'pardon_record', pardon_status: 'Yes' }, r = evaluate(a);
    check('GA/pardon-class/' + outcome, outcome === 'Felony conviction' ? r.pathwayId === 'restriction-and-sealing-of-a-pardoned-felony'
      : !r.pathwayId && !r.paymentAllowed && (outcome === 'Misdemeanor conviction' ? r.resultCode === 'needs_review' : r.missingQuestionIds.includes('case_outcome')));
  }
  if (state === 'IL') for (const later of ['vacated', 'reversed', 'none', 'dismissed', 'unknown', ['vacated']]) {
    const a = { ...answers, il_record_help: 'later_order', il_later_order: later }, r = evaluate(a);
    check('IL/later/' + later, ['vacated', 'reversed'].includes(later) ? r.pathwayId === wrong.id : !r.pathwayId && !r.paymentAllowed);
    check('IL/later/original-unchanged/' + later, a.case_outcome === 'Misdemeanor conviction');
  }
  if (state === 'MS') for (const court of ['justice', 'municipal', 'county', 'circuit']) {
    const a = { ...answers, case_outcome: 'Misdemeanor conviction', ms_record_help: 'conviction_record', ms_conviction_traffic: 'other_traffic', ms_conviction_court: court };
    const result = evaluate(a), ids = selectScreeningQuestionIds(p, pub, a);
    check('MS/other-traffic/' + court, result.pathwayId === (court === 'justice' ? 'additional-justice-court-misdemeanor-relief-9-11-15-3' : court === 'municipal' ? 'additional-municipal-court-misdemeanor-relief-21-23-7-6' : undefined));
    check('MS/other-traffic/no-first-offender-burden/' + court, !ids.includes('ms_other_convictions') && !ids.includes('ms_prior_conviction_expungement'));
  }
  if (state === 'MS') for (const other of ['no', 'yes']) for (const cleared of ['no', 'yes']) for (const court of ['justice', 'municipal', 'county']) {
    const a = { ...answers, case_outcome: 'Misdemeanor conviction', ms_record_help: 'conviction_record', ms_conviction_traffic: 'nontraffic', ms_other_convictions: other, ms_prior_conviction_expungement: cleared, ms_conviction_court: court };
    const r = evaluate(a), expected = other === 'no' && cleared === 'no' ? 'first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1'
      : court === 'justice' ? 'additional-justice-court-misdemeanor-relief-9-11-15-3' : court === 'municipal' ? 'additional-municipal-court-misdemeanor-relief-21-23-7-6' : undefined;
    check(`MS/history/${other}/${cleared}/${court}`, r.pathwayId === expected);
    check(`MS/history/${other}/${cleared}/${court}/not-nonconv`, r.pathwayId !== wrong.id);
  }
}

for (const row of fixtures.rows) for (const [kind, fixture] of [['draft', row.verification], ['afterCompletion', row.afterCompletion]]) {
  if (!fixture) continue;
  const original = structuredClone(fixture), state = original.draftSnapshot.jurisdiction, helpId = `${state.toLowerCase()}_record_help`;
  const item = { id: 'synthetic-fallback-owner', jurisdiction: state, artifactRefs: {} }, before = structuredClone(original);
  const model = P.protectedPacketInformationModelFor(original), prefix = `${row.id}/${kind}`;
  check(prefix + '/readable-held', model && model.pathwayId === null && !model.packetPlan && !model.reviewSafety.safe);
  if (!model) continue;
  check(prefix + '/actual-control', model.builderQuestions.some(q => q.id === helpId) && P.editablePacketInputIds(model).has(helpId));
  check(prefix + '/read-immutable', same(original, before));
  const decorated = await B.decorateBriefcaseItemForPresentationWithDependencies({ consumerAuthUserId: 'synthetic-owner', item }, {
    readProtectedArtifact: async () => ({ ok: true, value: null }), readProtectedVerification: async () => ({ ok: true, value: original }),
    readTrustedPendingSource: async () => ({ ok: false, reason: 'synthetic_source_absent' }), readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
    evaluateAuthoritative: evaluateAuthoritativeScreeningResult,
    readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
  });
  check(prefix + '/actual-presentation-readable', decorated.authorityStatus === 'protected_draft' && decorated.packetDraft.status === 'available' && decorated.pathwayId === null);
  check(prefix + '/actual-presentation-no-readiness', decorated.resultCode === 'needs_more_info' && decorated.verificationStatus !== 'verified' && Object.values(decorated.commercialActions).every(value => value === false));
  check(prefix + '/actual-presentation-request-summary', decorated.summary === CONVICTION_RELIEF_COPY.missing[0]);
  check(prefix + '/actual-presentation-request-next-step', same(decorated.nextSteps, [CONVICTION_RELIEF_COPY.missing[0]]));
  check(prefix + '/actual-presentation-spanish-request', resolveRuntimeText('es', decorated.summary) === CONVICTION_RELIEF_COPY.missing[1]);

  check(prefix + '/cannot-inherit-verification', !P.packetInformationPatch({ existingItem: item, protectedVerification: original, answers: {}, verify: true })?.readyToGenerate);
  const noop = P.packetInformationPatch({ existingItem: item, protectedVerification: original, answers: {} });
  check(prefix + '/noop-immutable', same(noop?.protectedTransition.nextVerification, original));
  let current = original;
  const edits = [{ [helpId]: 'conviction_record' }, ...(state === 'MS' && row.answers.case_outcome === 'Other conviction or adjudication' ? [{ case_outcome: 'Misdemeanor conviction' }, { ms_conviction_traffic: 'nontraffic' }, { ms_other_convictions: 'no' }, { ms_prior_conviction_expungement: 'no' }] : [])];
  for (const [index, answers] of edits.entries()) {
    const previous = current, update = P.packetInformationPatch({ existingItem: item, protectedVerification: current, answers });
    current = update?.protectedTransition.nextVerification;
    check(prefix + '/' + index + '/explicit-save', current && update.protectedTransition.expectedPriorRevision === previous.revision && current.status !== 'verified' && !update.readyToGenerate);
    if (!current) break;
    for (const source of maps) for (const [id, value] of Object.entries(previous.draftSnapshot[source])) if (!(id in answers)) check(prefix + '/' + index + '/' + source + '/' + id, same(current.draftSnapshot[source][id], value));
    for (const source of maps) for (const id of Object.keys(answers)) if (Object.hasOwn(previous.draftSnapshot[source], id)) check(prefix + '/' + index + '/history/' + source + '/' + id, current.draftSnapshot.dependencies.semanticAnswerHistory?.some(e => e.factId === id && e.source === source && same(e.value, previous.draftSnapshot[source][id])));
    check(prefix + '/' + index + '/current-readable', P.protectedPacketInformationModelFor(current));
  }
  for (const [key, value] of Object.entries({ profileVersion: 'wrong', profileSourceFingerprint: 'wrong', profileAuthorityFingerprint: 'wrong', pathwayId: 'wrong', resultCode: 'packet_ready', paymentAllowed: !original.draftSnapshot.paymentAllowed, packetType: 'wrong', selectedTrackId: 'wrong', treatmentClassification: 'wrong', deferralComponentIds: ['wrong'], requiredInputIds: [], packetPlan: null, packetFamilyIdentifiers: { mode: null, sourceFormIds: [] }, serverFacts: { jurisdiction: state } })) {
    if (same(original.draftSnapshot[key], value)) continue;
    const bad = structuredClone(original); bad.draftSnapshot[key] = value; bad.draftHash = P.protectedPacketDraftHash(bad.draftSnapshot);
    check(prefix + '/tampered/' + key, P.protectedPacketInformationModelFor(bad) === null);
  }
}
const report = { status: checks.every(c => c.pass) ? 'PASS' : 'FAIL', checks: checks.length, failed: checks.filter(c => !c.pass), details: checks, rows,
  limits: ['No legal/language/source-currency approval. Actual later-order/program/mixed-charge acceptance, authority and owner browser/DB verification remain separately required. This is not GA21 or nationwide closure.'] };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: report.checks, failed: report.failed }, null, 2));
assert.equal(report.failed.length, 0);
