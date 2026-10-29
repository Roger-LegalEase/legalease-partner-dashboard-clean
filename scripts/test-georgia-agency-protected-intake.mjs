import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const I = await import('../src/lib/expungement-ai/research115-intake.ts');
const { GA_NONCONVICTION_REASON_COPY } = await import('../src/lib/rcap-engine/georgia-nonconviction-research.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const route = 'GA:non-conviction-record-restriction-through-the-agency-prosecutor-process';
const profile = getProfileByJurisdiction('GA');
const witness = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(row => row.pathwayKey === route);
const ids = new Set(projectPublicProfile(profile).questions.map(q => q.id));
const answers = Object.fromEntries(Object.entries(witness.finalAnswers).filter(([id]) => ids.has(id)));
const evaluateAnswers = answers => evaluate({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'synthetic-ga-agency', answers });
let checks = 0;
function check(label, run) { run(); checks++; console.log('PASS ' + label); }
const authoritative = evaluateAnswers(answers);
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, dependencies: {}, capturedAt: '2026-10-29T00:00:00.000Z' });
assert(seed);
const original = { status: 'unverified', reason: 'synthetic_source_witness', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
const originalBytes = JSON.stringify(original);
const initial = P.protectedPacketInformationModelFor(original);
check('fresh held authoritative draft exposes the agency branch facts', () => {
  assert.equal(initial.pathwayId, route.slice(3));
  assert(initial.questions.some(q => q.id === 'arrest_date'));
  assert(initial.questions.some(q => q.id === 'ga_nc_already_restricted'));
  assert.equal(JSON.stringify(original), originalBytes);
  assert.equal(original.draftSnapshot.paymentAllowed, false);
});
const first = P.packetInformationPatch({ protectedVerification: original, answers: { arrest_date: { value: '2012-06-15', unknown: false }, ga_nc_already_restricted: 'No' } });
assert(first?.protectedTransition);
const current = first.protectedTransition.nextVerification;
const model = P.protectedPacketInformationModelFor(current);
check('pre2013 selection exposes native fields and human bilingual choices', () => {
  assert(model.questions.some(q => q.id === 'ga_nc_fullName'));
  const basis = model.questions.find(q => q.id === 'ga_nc_basis');
  assert.equal(basis.optionDisplay.all_charged_offenses_dismissed.label, 'All charged offenses dismissed');
  assert(basis.optionDisplay.all_charged_offenses_dismissed.translations.es.label);
  for (const q of model.questions.filter(q => q.id.startsWith('ga_nc_'))) assert(q.translations.es.prompt);
});
// Independently declared coherent agency facts; ordinary UI values are capitalized.
const facts = { arrest_date: '2012-06-15', disposition_date: '2012-10-01', ga_nc_already_restricted: 'No', ga_nc_basis: 'all_charged_offenses_dismissed', ga_nc_arresting_agency: 'Fictional City Police', ga_nc_offenses: 'Count1: Criminal trespass', ga_nc_history_presence: 'georgia', ga_nc_disposition_on_history: 'Yes', ga_nc_disposition_document: 'not_required', ga_nc_fee_difficulty: 'No', ga_nc_fullName: 'Taylor Arden Fiction', ga_nc_birthDate: '1986-03-12', ga_nc_race: 'Participant-supplied synthetic category', ga_nc_sex: 'Participant-supplied synthetic category', ga_nc_phone: '404-555-0177', ga_nc_email: 'taylor.fiction@example.org', ga_nc_street: '910 Fictional Avenue', ga_nc_city: 'Atlanta', ga_nc_state: 'GA', ga_nc_zip: '30303', ga_nc_selected_route_verified: 'Yes', ga_nc_entire_arrest_confirmed: 'Yes', ga_nc_same_incident_plea: 'No', ga_nc_subsection_i_exclusion: 'No', ga_nc_history_reviewed: 'Yes', ga_nc_immigration_advice: 'No', ga_nc_denied_or_returned: 'No', ga_nc_civil_action: 'No' };
check('ordinary UI Yes/No satisfies native case predicate', () => assert.equal(I.research115Eligibility(route, facts, '2026-10-29').status, 'qualifying'));
check('explicit unknown beats a retained capitalized Yes', () => assert.equal(I.research115Eligibility(route, { ...facts, ga_nc_history_reviewed: { unknown: true, value: 'Yes' } }, '2026-10-29').status, 'unknown'));
check('qualifying facts preserve existing commercial refusal', () => assert.equal(I.constrainResearch115Evaluation(authoritative, route, facts, '2026-10-29'), authoritative));
const saved = P.packetInformationPatch({ protectedVerification: current, answers: facts });
check('actual protected patch retains agency answers without fabricating verified status', () => {
  assert(saved?.protectedTransition);
  const next = saved.protectedTransition.nextVerification;
  assert.notEqual(next.status, 'verified');
  const snapshot = next.draftSnapshot ?? next.snapshot;
  assert.equal(snapshot.packetAnswers.ga_nc_fullName, facts.ga_nc_fullName);
  assert.equal(snapshot.paymentAllowed, false);
});
check('actual ownership hard stop survives missing agency facts', () => {
  const stopped = evaluateAnswers({ ...answers, ownership_scope: 'No' });
  assert.equal(stopped.evaluation.resultCode, 'hard_stop');
  assert.equal(I.constrainResearch115Evaluation(stopped, route, {}, '2026-10-29'), stopped);
});
check('unrelated routes retain the exact existing model and evaluation', () => {
  const other = { stateCode: 'MS', pathwayId: 'unrelated', questions: [], builderQuestions: [], initialAnswers: {}, missingInputIds: [], stage: 'not_started', reviewedAt: null };
  assert.equal(I.withResearch115PacketQuestions(other), other);
  assert.equal(I.constrainResearch115Evaluation(authoritative, 'MS:unrelated', {}, '2026-10-29'), authoritative);
});
for (const [en, es] of GA_NONCONVICTION_REASON_COPY) check('Spanish meaning: ' + en, () => { assert.equal(resolveRuntimeText('es', en), es); assert.equal(resolveRuntimeText('en', en), en); });
console.log(`${checks}/${checks} Georgia protected intake controls passed; no payment, delivery, hosted or production proof.`);
