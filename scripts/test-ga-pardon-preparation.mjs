#!/usr/bin/env node
// Original GA protected-document preparation gap; no DB, PDF, or authority mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { georgiaPardonPreparationFactIds: scope } = await import('../src/lib/expungement-ai/ga-pardon-preparation.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { GA_PARDON_ROUTE } = await import('../src/lib/rcap-engine/georgia-pardon-facts.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { GA_PARDON_CAPTION_QUESTIONS, GA_PARDON_DOCUMENT_QUESTIONS } = await import('../src/lib/expungement-ai/ga-pardon-caption.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { workerStaticPacketBinding } = await import('../src/lib/rcap/fulfillment/worker-static-authority.ts');
const fixture = JSON.parse(fs.readFileSync('scripts/fixtures/conviction-fallback-predecessors.json')).rows.find(r => r.id.startsWith('GA') && r.id.endsWith('/omitted'));
const answers = { ...fixture.answers, case_outcome: 'Misdemeanor conviction', ga_record_help: 'pardon_record', pardon_status: 'Yes', ga_board_pardon: 'yes', ga_pardon_date: '2021-01-02', ga_pardoned_offense_section: '16-8-14(a)', ga_convictions_since_pardon: 'none', ga_pardon_pending_charges: 'no', pending_cases: 'No' };
const profile = getProfileByJurisdiction('GA');
const authoritative = evaluateAuthoritativeScreeningResult({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'ga-preparation-pure', answers });
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, packetAnswers: {}, dependencies: { commercialFlowVersion: null, entitlementSource: null, productId: null }, capturedAt: '2026-10-14T00:00:00Z' });
const snapshot = seed.snapshot;
const current = { profile, profileAuthorityFingerprint: snapshot.profileAuthorityFingerprint, today: '2026-10-14', specification: packetSpecificationFor('GA:' + GA_PARDON_ROUTE) };
const checks = [];
function check(name, fn) { fn(); checks.push({ name, pass: true }); }
const expected = ['ga_pardoned_offense_section', 'ga_pardon_date', 'court', 'county', 'case_number', 'arrest_date', 'participant_narrative'];
check('actual protected held seed gains only a preparation scope', () => {
 const before = JSON.stringify(snapshot), result = scope(snapshot, current);
 assert.deepEqual(result.requiredFactIds, expected); assert.deepEqual(result.optionalFactIds, ['otn']);
 assert.deepEqual(result.captionConfirmationFactIds, ['court', 'county']);
 assert.equal(result.purpose, 'participant_document_preparation'); assert.equal(JSON.stringify(snapshot), before);
 assert.equal(snapshot.resultCode, 'needs_review'); assert.equal(snapshot.paymentAllowed, false);
 assert.equal(snapshot.packetPlan, null); assert.equal(snapshot.selectedTrackId, null); assert.deepEqual(snapshot.requiredInputIds, []);
});
for (const [key, value] of [['jurisdiction', 'MS'], ['pathwayId', 'sealing-court-records'], ['profileVersion', 'other'], ['profileSourceFingerprint', '0'.repeat(64)], ['profileAuthorityFingerprint', '0'.repeat(64)], ['resultCode', 'packet_ready'], ['resultCode', 'likely_not_eligible'], ['paymentAllowed', true], ['packetPlan', {}], ['selectedTrackId', 'ga-seal-m']]) {
 check('refuse changed protected identity ' + key + '/' + String(value), () => assert.equal(scope({ ...snapshot, [key]: value }, current), null));
}
for (const [key, value] of [['profileAuthorityFingerprint', ''], ['profileAuthorityFingerprint', '0'.repeat(64)], ['today', '2026-02-30'], ['today', 'bad'], ['specification', null], ['specification', { ...current.specification, trackId: 'ga-seal-m' }], ['specification', { ...current.specification, specificationSha256: '0'.repeat(64) }], ['profile', { ...profile, source: { ...profile.source, sourceCorpusSha256: '0'.repeat(64) } }]]) {
 check('refuse changed current source ' + key + '/' + checks.length, () => assert.equal(scope(snapshot, { ...current, [key]: value }), null));
}
const scenarios = [
 ['felony supported', { case_outcome: 'Felony conviction' }, true],
 ['missing Board', { ga_board_pardon: undefined }, false], ['uncertain Board', { ga_board_pardon: 'unknown' }, false],
 ['no Board', { ga_board_pardon: 'no' }, false], ['unknown class', { case_outcome: 'Pardoned conviction' }, false],
 ['future pardon', { ga_pardon_date: '2027-01-01' }, false], ['missing citation', { ga_pardoned_offense_section: '' }, false],
 ['ambiguous citation', { ga_pardoned_offense_section: 'theft' }, false], ['exclusion', { case_outcome: 'Felony conviction', ga_pardoned_offense_section: '16-5-1' }, false],
 ['class conflict', { ga_pardoned_offense_section: '16-5-1' }, false], ['later conviction', { ga_convictions_since_pardon: 'other' }, false],
 ['pending', { pending_cases: 'Yes', ga_pardon_pending_charges: 'yes' }, false], ['pending conflict', { pending_cases: 'Yes' }, false],
 ['conditional offense unclear', { ga_pardoned_offense_section: '16-5-21', ga_pardon_assault_rape_intent: 'unknown' }, false]
];
const traffic = { ga_convictions_since_pardon: 'traffic_only', ga_post_pardon_traffic_records: 'Saved traffic record', ga_post_pardon_traffic_jurisdictions: 'all_georgia' };
scenarios.push(['supported nonserious traffic', { ...traffic, ga_post_pardon_traffic_citations: '40-6-181' }, true],
 ['serious traffic', { ...traffic, ga_post_pardon_traffic_citations: '40-6-391' }, false],
 ['uncertain traffic', { ...traffic, ga_post_pardon_traffic_citations: '40-6-999' }, false],
 ['foreign traffic', { ...traffic, ga_post_pardon_traffic_jurisdictions: 'other_jurisdiction' }, false]);
for (const [name, change, allowed] of scenarios) check(name, () => {
 const s = structuredClone(snapshot);
 for (const [id, value] of Object.entries(change)) {
  for (const key of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers', 'serverFacts']) delete s[key][id];
  if (value !== undefined) s.screeningAnswers[id] = value;
 }
 assert.equal(Boolean(scope(s, current)), allowed, name);
});
for (const map of ['prefilledAnswers', 'packetAnswers', 'serverFacts']) {
 for (const value of ['no', 'unknown', { value: 'yes', unknown: true }, { value: 'yes' }, ['yes'], null]) {
  check(map + ' cannot conceal conflicting or malformed legal predicate ' + JSON.stringify(value), () => assert.equal(scope({ ...snapshot, [map]: { ...snapshot[map], ga_board_pardon: value } }, current), null));
 }
 check(map + ' equivalent explicit known legal fact allowed', () => assert(scope({ ...snapshot, [map]: { ...snapshot[map], ga_board_pardon: { value: 'yes', unknown: false } } }, current)));
 check(map + ' equivalent citation formatting allowed', () => assert(scope({ ...snapshot, [map]: { ...snapshot[map], ga_pardoned_offense_section: { value: 'O.C.G.A. § 16-8-14 (a)', unknown: false } } }, current)));
}
for (const id of ['court', 'county', 'case_number', 'arrest_date', 'participant_narrative', 'otn']) {
 for (const value of ['', null, { unknown: true, value: 'retained raw' }, ['malformed retained']]) check('document correction stays reachable ' + id + '/' + JSON.stringify(value), () => {
  const s = structuredClone(snapshot); s.screeningAnswers[id] = 'old raw value'; s.packetAnswers[id] = value;
  const before = JSON.stringify(s); assert(scope(s, current)); assert.equal(JSON.stringify(s), before);
 });
}
check('inactive legal history stays preserved without creating a gate', () => {
 const s = structuredClone(snapshot); s.screeningAnswers.ga_pardon_imprisonment_under14 = 'yes'; s.packetAnswers.ga_pardon_imprisonment_under14 = 'no';
 const before = JSON.stringify(s); assert(scope(s, current)); assert.equal(JSON.stringify(s), before);
});
for (const id of [...expected, 'otn']) check('source cannot reassign participant fact ' + id, () => {
 const specification = structuredClone(current.specification);
 specification.requiredFacts.find(f => f.factId === id).ownership = 'court';
 assert.equal(scope(snapshot, { ...current, specification }), null);
});
check('source cannot turn optional OTN into a new mandatory gate', () => {
 const specification = structuredClone(current.specification);
 specification.requiredFacts.find(f => f.factId === 'otn').requiredForGeneration = true;
 assert.equal(scope(snapshot, { ...current, specification }), null);
});
check('missing specification fact contract refuses preparation', () => assert.equal(scope(snapshot, {
 ...current, specification: { ...current.specification, requiredFacts: undefined }
}), null));
check('existing bilingual caption and document controls retain ownership and optional OTN', () => {
 for (const question of [...GA_PARDON_CAPTION_QUESTIONS, ...GA_PARDON_DOCUMENT_QUESTIONS]) assert(question.translations.es.prompt && question.translations.es.helperText);
 assert.equal(GA_PARDON_DOCUMENT_QUESTIONS.find(q => q.id === 'otn').required, false);
 assert.equal(GA_PARDON_DOCUMENT_QUESTIONS.find(q => q.id === 'participant_narrative').multiline, true);
});
check('real application and worker admission remain refused', () => {
 assert.equal(packetFulfillmentAuthority('GA', GA_PARDON_ROUTE, 'packet generation', { trackId: 'ga-pardon-j7' }).allowed, false);
 assert.equal(workerStaticPacketBinding('GA:' + GA_PARDON_ROUTE, 'ga-pardon-j7'), null);
});
console.log(JSON.stringify({ status: 'PASS', checks: checks.length, scope: 'Pure preparation helper only; no protected UI integration, generation or delivery acceptance', results: checks }, null, 2));
