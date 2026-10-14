#!/usr/bin/env node
// GA14-MD-EXPLICIT_NO_PARTICIPANT_FILING_NO_COUNTY_INPUT / GA-14-M01028.
// Uses the existing source contract and real shared collection/model consumers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { packetCollectionFor, packetInformationModelFor } = await import('../src/lib/expungement-ai/packet-information.ts');
const { prepayGateFactIds } = await import('../src/lib/expungement-ai/packet-collection.ts');
const profile = JSON.parse(fs.readFileSync('src/lib/rcap-engine/compiled/profiles/MD-maryland.json', 'utf8'));
const memo = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MD.memo.json', 'utf8'));
const pathwayId = 'automatic-expungement-under-crim-proc-10-105-1';
const track = memo.tracks.find(t => t.trackId === 'md_10105_1_automatic');
// Controlling source: Md. Criminal Procedure §10-105.1(b)-(d), official current
// https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-105.1
// Court-initiated, statewide relief; subsection (d) assigns notices to the court.
assert.equal(track.rules.filing, 'There is no participant filing on this track.');
assert.equal(track.geography.venue, 'No venue. There is no participant filing on this track.');
assert.deepEqual(track.geography.keys, []);
assert(!JSON.stringify(track.participantInputs).toLowerCase().includes('county'));
const rawBefore = JSON.stringify(profile);
const pathway = profile.pathways.find(p => p.id === pathwayId);
const plan = packetPlanForPathway(profile, pathwayId);
assert.equal(plan.mode, 'automatic_relief_verification_and_guidance');
assert.equal(plan.formMappingStatus, 'not_required');
assert.deepEqual(plan.sourceFormIds, []);
assert.equal(isPacketPlanFulfillmentReady(plan), false, 'guidance does not become a filing product');
assert.equal(plan.requiredInputIds.includes('county'), false, 'automatic route must not inherit the unrelated county-effective-date requirement');
const input = { jurisdiction: 'MD', pathwayId, requiredInputIds: plan.requiredInputIds,
  serverFacts: { jurisdiction: 'MD', pathway_id: pathwayId }, screeningAnswers: {} };
const resolution = packetCollectionFor(input);
assert(!resolution.facts.some(f => f.factId === 'county'));
assert(!prepayGateFactIds(resolution).includes('county'));
function itemWith(answers = {}, screeningAnswers = {}) {
  return { state: 'MD', paymentAllowed: false, resultCode: 'guidance_only', pathwayLabel: pathway.label,
    artifactRefs: { commercialFlow: { screening: { pathwayId, pathwayLabel: pathway.label, packetPlan: plan, answers: screeningAnswers },
      packetInformation: { answers, prefilledAnswers: {} } } } };
}
for (const county of [undefined, 'Baltimore County', { value: 'Condado de Montgomery', source: 'historical' }]) {
  const item = itemWith(county === undefined ? {} : { county });
  const rawItem = JSON.stringify(item);
  const model = packetInformationModelFor(item);
  assert(model, 'the real shared model remains available');
  assert(!model.requiredInputIds.includes('county'));
  assert(!model.missingInputIds.includes('county'));
  assert(!model.questions.some(q => q.id === 'county'), 'neither EN nor ES can render the removed county control');
  assert(!model.builderQuestions.some(q => q.id === 'county'));
  assert(!model.builderSections.some(s => s.questionIds.includes('county')));
  assert.deepEqual(model.initialAnswers.county, county, 'saved raw answer survives independently of active requirements');
  assert.equal(JSON.stringify(item), rawItem, 'reading the model never rewrites historical answers');
}
const screeningHistory = itemWith({}, { county: 'Historical screening county' });
const screeningBefore = JSON.stringify(screeningHistory);
const historicalModel = packetInformationModelFor(screeningHistory);
assert.equal(historicalModel.screeningAnswers.county, 'Historical screening county');
assert.equal(JSON.stringify(screeningHistory), screeningBefore);
assert.equal(JSON.stringify(profile), rawBefore, 'compiled source history remains unchanged');
// Every sibling retains exactly its old plan. Replacing only the automatic
// identity with an unrelated identity cannot alter sibling plan resolution.
const siblingFixture = structuredClone(profile);
siblingFixture.pathways.find(p => p.id === pathwayId).id = 'unrelated-route';
for (const sibling of profile.pathways.filter(p => p.id !== pathwayId)) {
  const actual = packetPlanForPathway(profile, sibling.id);
  assert.deepEqual(actual, packetPlanForPathway(siblingFixture, sibling.id), `${sibling.id}: unchanged plan`);
  assert(actual.requiredInputIds.includes('county'), `${sibling.id}: county requirement retained`);
}
const filing = profile.pathways.find(p => p.id === 'adult-non-conviction-expungement-under-crim-proc-10-105');
const filingPlan = packetPlanForPathway(profile, filing.id);
const filingResolution = packetCollectionFor({ ...input, pathwayId: filing.id, requiredInputIds: filingPlan.requiredInputIds,
  serverFacts: { jurisdiction: 'MD', pathway_id: filing.id } });
assert(prepayGateFactIds(filingResolution).includes('county'), 'a participant-filed MD route still collects its venue');
for (const [field, value] of [['automatic', false], ['filingRequired', true], ['routeType', 'court_filing']]) {
  const changed = structuredClone(profile);
  changed.pathways.find(p => p.id === pathwayId)[field] = value;
  assert(packetPlanForPathway(changed, pathwayId).requiredInputIds.includes('county'), `${field}: a changed source posture needs fresh review`);
}
for (const [field, value] of [['mode', 'official_pdf_overlay'], ['formMappingStatus', 'mapped']]) {
  const changed = structuredClone(profile);
  changed.packetGenerator.pathways.find(p => p.pathwayId === pathwayId)[field] = value;
  assert(packetPlanForPathway(changed, pathwayId).requiredInputIds.includes('county'), `${field}: never extend the automatic exception to a filing plan`);
}
console.log('PASS: MD source-bound automatic route removes county from real EN/ES model and gate; saved history, sibling filing inputs, guidance-only posture and changed-source guards preserved');
