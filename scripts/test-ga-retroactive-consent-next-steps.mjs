#!/usr/bin/env node
// GA21-CONVICTION-REQUEST-01 / O26 GA3: the retained reviewer counterexample.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const url = path => pathToFileURL(`${process.cwd()}/${path}`).href;
register(url('scripts/lib/ts-esm-loader.mjs'));
const mode = process.argv[2] ?? 'candidate';
assert(['candidate', 'remove-handoff', 'remove-spanish'].includes(mode));
if (mode !== 'candidate') {
  const target = mode === 'remove-handoff' ? '/src/lib/rcap-engine/evaluator.ts' : '/src/lib/expungement-ai/localization.ts';
  const anchor = mode === 'remove-handoff' ? 'nextSteps: [GA_RETROACTIVE_CONSENT_GUIDANCE[0]]' : 'GA_RETROACTIVE_CONSENT_GUIDANCE, KS_REGISTRATION_REVIEW_COPY';
  const replacement = mode === 'remove-handoff' ? 'nextSteps: unavailable.nextSteps' : 'KS_REGISTRATION_REVIEW_COPY';
  register('data:text/javascript,' + encodeURIComponent(`export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith(${JSON.stringify(target)}))return r;const a=${JSON.stringify(anchor)},s=String(r.source);if(s.split(a).length!==2)throw Error('nonunique mutant anchor');return {...r,source:s.replace(a,${JSON.stringify(replacement)})};}`));
}
const { getProfileByJurisdiction } = await import(url('src/lib/rcap-engine/profile-registry.ts'));
const { projectPublicProfile } = await import(url('src/lib/rcap-engine/public-profile-projection.ts'));
const { evaluateScreening } = await import(url('src/lib/rcap-engine/evaluator.ts'));
const { selectScreeningQuestionIds } = await import(url('src/lib/rcap-engine/screening-question-selection.ts'));
const { sanitizeResumedAnswersForQuestionIds } = await import(url('src/components/expungement-ai/screening/screens.ts'));
const { resolveRuntimeText } = await import(url('src/lib/expungement-ai/localization.ts'));
const { POST } = await import(url('src/app/api/expungement-ai/evaluate/route.ts'));
const P = await import(url('src/lib/expungement-ai/packet-information.ts'));
const B = await import(url('src/lib/expungement-ai/briefcase-presentation-authority.ts'));
const { evaluateAuthoritativeScreeningResult } = await import(url('src/lib/expungement-ai/authoritative-screening-result.ts'));
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/conviction-fallback-predecessors.json', import.meta.url))).rows.find(row => row.id === 'GA-no-original-treatment/omitted');
assert(fixture);
const profile = getProfileByJurisdiction('GA'), pub = projectPublicProfile(profile);
const answers = { ...fixture.answers, ga_record_help: 'retroactive_treatment', ga_original_first_offender: 'no' };
delete answers.possible_pathway_context;
const original = structuredClone(answers), request = { jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'synthetic-ga3-handoff', answers };
const en = "Work with an attorney or legal-aid expungement desk at the consent stage. LegalEase does not request or negotiate consent for you. The prosecutor's silence is not consent.";
const es = 'Trabaje con un abogado o un servicio de ayuda legal para la eliminación de antecedentes durante la etapa de consentimiento. LegalEase no solicita ni negocia el consentimiento en su nombre. El silencio de la fiscalía no equivale a consentimiento.';
const failures = [];
let checks = 0;
function check(name, fn) { checks++; try { fn(); } catch (error) { failures.push({ name, error: error.message }); } }
const result = evaluateScreening(request);
check('exact-route', () => assert.equal(result.pathwayId, 'retroactive-first-offender-treatment-under-42-8-66'));
check('held-result', () => assert.equal(result.resultCode, 'needs_more_info'));
check('payment-refused', () => assert.equal(result.paymentAllowed, false));
check('no-public-document-question', () => assert.deepEqual(result.missingQuestionIds, []));
check('consent-handoff', () => assert.deepEqual(result.nextSteps, [en]));
check('no-generic-wait', () => assert.doesNotMatch(result.nextSteps.join('\n'), /waiting period|dismissal date|completion date/i));
check('consent-reason-preserved', () => assert.match(result.reasons[0].text, /verified written prosecutorial consent/));
check('spanish-approved', () => assert.equal(resolveRuntimeText('es', result.nextSteps[0]), es));
check('english-preserved', () => assert.equal(resolveRuntimeText('en', en), en));
check('raw-preserved', () => assert.deepEqual(answers, original));
check('resumed-preserved', () => assert.deepEqual(sanitizeResumedAnswersForQuestionIds(pub, answers, selectScreeningQuestionIds(profile, pub, answers)), original));
const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) }));
const body = await response.json();
check('public-handler', () => assert.equal(response.status, 200));
check('public-result-and-availability', () => assert.deepEqual(body, { ...result,
  pathwayLabel: 'Petition for retroactive First Offender treatment, exoneration and discharge',
  consumerPacketAvailable: false, sponsoredPacketAvailable: false }));
for (const fact of [undefined, 'unknown', 'yes']) {
  const input = { ...answers };
  if (fact === undefined) delete input.ga_original_first_offender; else input.ga_original_first_offender = fact;
  const before = structuredClone(input), boundary = evaluateScreening({ ...request, answers: input });
  check(`original-${fact}:refused`, () => assert.equal(boundary.paymentAllowed, false));
  check(`original-${fact}:missing-fact`, () => assert.deepEqual(boundary.missingQuestionIds, [fact === 'yes' ? 'ga_first_offender_status' : 'ga_original_first_offender']));
  check(`original-${fact}:no-premature-handoff`, () => assert(!boundary.nextSteps.includes(en)));
  check(`original-${fact}:raw-preserved`, () => assert.deepEqual(input, before));
}
const verification = structuredClone(fixture.verification), savedBefore = structuredClone(verification);
const item = { id: 'synthetic-ga3-owner', jurisdiction: 'GA', artifactRefs: {} };
const update = P.packetInformationPatch({ existingItem: item, protectedVerification: verification, answers: { ga_record_help: 'retroactive_treatment', ga_original_first_offender: 'no' } });
const saved = update?.protectedTransition.nextVerification;
check('saved-correction-readable', () => assert(saved && P.protectedPacketInformationModelFor(saved)));
check('saved-correction-no-authority', () => assert(saved?.status !== 'verified' && update?.readyToGenerate === false && saved?.draftSnapshot.paymentAllowed === false));
check('original-saved-immutable', () => assert.deepEqual(verification, savedBefore));
if (saved) {
  for (const map of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) check(`saved-${map}-history`, () => {
    for (const [id, value] of Object.entries(verification.draftSnapshot[map])) if (!['ga_record_help', 'ga_original_first_offender'].includes(id)) assert.deepEqual(saved.draftSnapshot[map][id], value);
  });
  check('saved-noop-preserved', () => assert.deepEqual(P.packetInformationPatch({ existingItem: item, protectedVerification: saved, answers: {} })?.protectedTransition.nextVerification, saved));
  const decorated = await B.decorateBriefcaseItemForPresentationWithDependencies({ consumerAuthUserId: 'synthetic-owner', item }, {
    readProtectedArtifact: async () => ({ ok: true, value: null }), readProtectedVerification: async () => ({ ok: true, value: saved }),
    readTrustedPendingSource: async () => ({ ok: false, reason: 'synthetic_source_absent' }), readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
    evaluateAuthoritative: evaluateAuthoritativeScreeningResult,
    readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
  });
  check('briefcase-handoff', () => assert.deepEqual(decorated.nextSteps, [en]));
  check('briefcase-commercial-closed', () => assert(Object.values(decorated.commercialActions).every(value => value === false)));
}
console.log(JSON.stringify({ mode, checks, passed: checks - failures.length, failures, result, protectedSaved: Boolean(saved) }, null, 2));
process.exitCode = failures.length ? 1 : 0;
