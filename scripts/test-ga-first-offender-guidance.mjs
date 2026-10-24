import fs from 'node:fs';
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-13';
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const B = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/ga-first-offender-guidance-predecessors.json', import.meta.url)));
const profile = getProfileByJurisdiction('GA');
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses;
const base = { ...witnesses.find(w => w.jurisdiction === 'GA').finalAnswers, case_outcome: 'Diversion, deferred disposition, supervision, or similar program', prior_relief: 'No', ga_original_first_offender: 'yes' };
delete base.possible_pathway_context;
const cases = [
  ['active_pre2026', 'active', '2026-06-30', undefined, 'court that imposed'],
  ['sentencing_post2026', 'active', '2026-07-01', undefined, 'at sentencing'],
  ['discharged_pre2026', 'exonerated_and_discharged', '2020-02-29', '2026-06-30', 'court that granted'],
  ['discharged_post2026', 'exonerated_and_discharged', '2020-02-29', '2026-07-01', 'upon exoneration and discharge']
];
const checks = [], outcomes = [];
const check = (id, pass) => checks.push({ id, pass: !!pass });
const same = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
const evaluate = answers => evaluateScreening({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'synthetic-ga-guidance', answers });
const paths = profile.pathways, rules = profile.orderedDecisionRules;
try {
  for (const [branch, status, sentence, discharge, expected] of cases) {
    const answers = { ...base, ga_first_offender_status: status, ga_first_offender_sentence_date: sentence, ...(discharge ? { ga_first_offender_discharge_date: discharge } : {}) };
    const before = structuredClone(answers), result = evaluate(answers), reason = result.reasons.find(r => r.code === 'ga.original_first_offender_' + branch);
    check(branch + '/branch-specific-source-guidance', !!reason && reason.text.includes(expected));
    check(branch + '/existing-review-hold', result.resultCode === 'needs_review' && result.paymentAllowed === false && result.pathwayId === 'youthful-first-offender-restriction-route');
    check(branch + '/customer-next-step', !!reason && same(result.nextSteps, [reason.text]));
    check(branch + '/Spanish', !!reason && resolveRuntimeText('es', reason.text) !== reason.text);
    check(branch + '/no-internal-contract-message', !result.reasons.some(r => /route_presentation_conflicts|packet its legal authority/.test(r.code + r.text)));
    check(branch + '/answers-preserved', same(answers, before));
    for (const reversed of [false, true]) {
      profile.pathways = reversed ? [...paths].reverse() : paths;
      profile.orderedDecisionRules = reversed ? [...rules].reverse() : rules;
      for (const hint of [undefined, '', 'Skip', ...paths.map(p => p.label)]) check(branch + '/hint-order/' + reversed + '/' + hint, same(evaluate({ ...answers, possible_pathway_context: hint }), result));
    }
    const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'synthetic-ga-guidance', answers }) }));
    const body = await response.json();
    check(branch + '/actual-handler', response.status === 200 && same(body.reasons, result.reasons) && same(body.nextSteps, result.nextSteps) && body.pathwayId === result.pathwayId && body.resultCode === result.resultCode && body.paymentAllowed === false && body.consumerPacketAvailable === false && body.sponsoredPacketAvailable === false);
    outcomes.push({ branch, answers, result });
  }
} finally { profile.pathways = paths; profile.orderedDecisionRules = rules; }
for (const [name, changes, code] of [
  ['unknown status', { ga_first_offender_status: 'other_or_unknown' }, 'ga.original_first_offender_facts_missing'],
  ['impossible date', { ga_first_offender_status: 'active', ga_first_offender_sentence_date: '2026-02-29' }, 'ga.original_first_offender_facts_missing'],
  ['revoked', { ga_first_offender_status: 'revoked_with_adjudication' }, 'ga.original_first_offender_revoked']
]) {
  const r = evaluate({ ...base, ...changes });
  check(name + '/existing-safety-reason', r.reasons.some(x => x.code === code) && !r.paymentAllowed);
}
for (const { branch, source, verification: original, evaluation: prior } of fixtures.rows) {
  const before = structuredClone(original), item = { id: source.matterId, jurisdiction: 'GA', artifactRefs: {} };
  const current = evaluateAuthoritativeScreeningResult({ jurisdiction: 'GA', profileVersion: source.profileVersion, matterId: source.matterId, answers: source.answers }).evaluation;
  const omitCopy = ({ reasons, nextSteps, ...authority }) => authority;
  check(branch + '/authority-unchanged', same(omitCopy(current), omitCopy(prior)));
  check(branch + '/genuine-held-predecessor-readable', !!P.protectedPacketInformationModelFor(original));
  for (const mode of ['protected', 'trusted']) {
    const decorated = await B.decorateBriefcaseItemForPresentationWithDependencies({ consumerAuthUserId: 'synthetic-owner', item }, {
      readProtectedArtifact: async () => ({ ok: true, value: null }),
      readProtectedVerification: async () => mode === 'protected' ? ({ ok: true, value: original }) : ({ ok: false, reason: 'protected_verification_authority_missing' }),
      readTrustedPendingSource: async () => ({ ok: true, value: source }),
      readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
      evaluateAuthoritative: evaluateAuthoritativeScreeningResult,
      readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
    });
    check(branch + '/' + mode + '/summary', decorated.summary === current.reasons[0].text);
    check(branch + '/' + mode + '/next-steps', same(decorated.nextSteps, current.nextSteps));
    check(branch + '/' + mode + '/Spanish', typeof decorated.summary === 'string' && resolveRuntimeText('es', decorated.summary) !== decorated.summary);
    check(branch + '/' + mode + '/no-authority-promotion', decorated.resultCode === 'needs_review' && decorated.verificationStatus !== 'verified' && Object.values(decorated.commercialActions).every(v => v === false));
  }
  check(branch + '/read-preserves-snapshot', same(original, before));
  const noop = P.packetInformationPatch({ existingItem: item, protectedVerification: original, answers: {} });
  check(branch + '/noop-preserves-snapshot', same(noop?.protectedTransition.nextVerification, original));
  const verify = P.packetInformationPatch({ existingItem: item, protectedVerification: original, answers: {}, verify: true });
  check(branch + '/cannot-verify-held-route', !verify?.readyToGenerate);
}
const result = { status: checks.every(c => c.pass) ? 'PASS' : 'FAIL', checks: checks.length, failed: checks.filter(c => !c.pass), outcomes, assertions: checks };
console.log(JSON.stringify(result, null, 2));
if (result.failed.length) process.exitCode = 1;
