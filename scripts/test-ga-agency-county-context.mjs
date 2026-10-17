#!/usr/bin/env node
// Existing GA-14-M01022 / Q-f9ab18cb15132636724a only. No nationwide campaign.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { isGeorgiaAgencyWithoutCounty, GA_AGENCY_RESTRICTION_PATHWAY: id } = await import('../src/lib/rcap-engine/georgia-agency-county-context.ts');
const { packetCollectionFor, packetInformationModelFor } = await import('../src/lib/expungement-ai/packet-information.ts');
const { prepayGateFactIds } = await import('../src/lib/expungement-ai/packet-collection.ts');
const { renderPreflight } = await import('../src/lib/expungement-ai/render-preflight.ts');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const profile = read('src/lib/rcap-engine/compiled/profiles/GA-georgia.json');
const path = profile.pathways.find(p => p.id === id);
const sourceRoot = 'data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/';
const memo = read('data/record-clearing/legal-design-intake/GA.memo.json');
const track = memo.tracks.find(t => t.trackId === 'ga-nonconv-pre2013');
const map = read(sourceRoot + 'production-field-map.json');
const receipt = read(sourceRoot + 'source-receipt.json');
const wiring = read(sourceRoot + 'product-wiring.json');
assert.equal(receipt.documents[0].sha256, '5fe841de263070f192ddfb0e322e41b2c2a97e8d07e7e643e98fdf780aefa1ab');
assert.equal(map.sourceSha256, receipt.documents[0].sha256);
assert.equal(createHash('sha256').update(fs.readFileSync(receipt.documents[0].path)).digest('hex'), receipt.documents[0].sha256,
  'the original official PDF, not just its metadata, remains source-bound');
assert.deepEqual(track.geography.keys, []);
assert(track.geography.venue.includes('arresting law enforcement agency, then the prosecuting attorney, then GCIC'));
assert(track.participantInputs.some(x => x.key === 'arrestingAgency' && x.requirement === 'required'));
assert(!track.participantInputs.some(x => /county/i.test(x.key)));
assert(map.writes.some(x => x.factId === 'case.arrestingAgency' && x.label === 'Arresting Agency'));
assert(!map.writes.some(x => /county/i.test(x.factId + x.label)));
assert(map.writes.every(x => x.page === 2), 'the map writes only applicant Section One, never agency or prosecutor sections');
assert(track.manualCompletionItems.some(x => x.item === 'Section Two in its entirety'));
assert(track.manualCompletionItems.some(x => x.item === 'Section Three in its entirety'));
assert.equal(wiring.binding.generationAllowed, false);
assert.equal(wiring.binding.paymentEligible, false);
const rawProfile = JSON.stringify(profile);
const plan = packetPlanForPathway(profile, id);
assert.equal(isGeorgiaAgencyWithoutCounty(profile, id), true);
assert(!plan.requiredInputIds.includes('county'));
assert.deepEqual(plan.requiredInputIds, profile.packetGenerator.requiredInputs.filter(x => x !== 'county'));
const input = { jurisdiction: 'GA', pathwayId: id, requiredInputIds: plan.requiredInputIds,
  serverFacts: { jurisdiction: 'GA', pathway_id: id }, screeningAnswers: {} };
const current = packetCollectionFor(input);
const before = packetCollectionFor({ ...input, requiredInputIds: profile.packetGenerator.requiredInputs });
assert.equal(before.facts.find(x => x.factId === 'county').source, 'unresolved_route_rule_scope');
assert(!current.facts.some(x => x.factId === 'county'));
assert(!prepayGateFactIds(current).includes('county'));
assert.deepEqual(current.facts, before.facts.filter(x => x.factId !== 'county'), 'all noncounty dispositions stay exact');
assert.deepEqual([...current.facts.map(x => x.factId)].sort(), [...plan.requiredInputIds].sort());
assert.deepEqual(renderPreflight({ snapshot: { jurisdiction: 'GA', pathwayId: id, selectedTrackId: 'ga-nonconv-pre2013' },
  verificationHash: 'synthetic-source-fixture', facts: {} }),
{ ready: false, reason: 'no_composable_specification_for_route', missingFactIds: [] }, 'a corrected question never creates rendering authority');
function itemWith(answers = {}, screeningAnswers = {}) {
  return { state: 'GA', paymentAllowed: false, resultCode: 'needs_review', pathwayLabel: path.label,
    artifactRefs: { commercialFlow: { screening: { pathwayId: id, pathwayLabel: path.label, packetPlan: plan, answers: screeningAnswers },
      packetInformation: { answers, prefilledAnswers: {} } } } };
}
for (const county of [undefined, 'Fulton', { value: 'Condado de DeKalb', source: 'historical' }, { unknown: true }]) {
  const item = itemWith(county === undefined ? {} : { county });
  const raw = JSON.stringify(item);
  const model = packetInformationModelFor(item);
  assert(model);
  assert(!model.requiredInputIds.includes('county'));
  assert(!model.missingInputIds.includes('county'));
  assert(!model.questions.some(q => q.id === 'county'), 'no EN/ES obsolete county control');
  assert(!model.builderQuestions.some(q => q.id === 'county'));
  assert(!model.builderSections.some(s => s.questionIds.includes('county')));
  assert.deepEqual(model.initialAnswers.county, county);
  assert.equal(model.initialAnswers.arrestingAgency, undefined, 'county never becomes arresting agency');
  assert.equal(model.initialAnswers.court, undefined, 'county never becomes court');
  assert.equal(JSON.stringify(item), raw);
}
const historicalScreen = itemWith({}, { county: 'Screening county retained' });
assert.equal(packetInformationModelFor(historicalScreen).screeningAnswers.county, 'Screening county retained');
assert.equal(JSON.stringify(profile), rawProfile);
const noException = structuredClone(profile);
noException.packetGenerator.pathways.find(p => p.pathwayId === id).sourceRuleRefs.push('unreviewed');
for (const sibling of profile.pathways.filter(p => p.id !== id)) {
  assert.deepEqual(packetPlanForPathway(profile, sibling.id), packetPlanForPathway(noException, sibling.id));
  assert(packetPlanForPathway(profile, sibling.id).requiredInputIds.includes('county'));
}
// Sibling GA-14 county members M01021/M01024/M01026: county stays an unresolved
// participant fact, known values are kept, and no output or family is inferred.
{
  const { packetCollectionFor: collectFor } = await import('../src/lib/expungement-ai/packet-information.ts');
  const registry = read('data/record-clearing/factory-v2-route-registry.json'), GA = 'data/rcap-all50/overlays/census-v1/ga/';
  const members = {
    'GA-14-M01021': { route: 'automatic-restriction-of-qualifying-post-july-1-2013-non-convictions', families: { 'ga-nonconv-post2013-set--custom-pleading': ['primary_filing.county_of_arrest'] } },
    'GA-14-M01024': { route: 'retroactive-first-offender-treatment-under-42-8-66', absentSet: 'ga-rfo-set', families: {
      'rcap-ga-guidance-implementation--custom-pleading': ['ga-rfo-participant-factual-record-1.fact_convictingCourtAndCounty'] } },
    'GA-14-M01026': { route: 'youthful-first-offender-restriction-route', families: {
      'composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading': ['ga-retroactive-first-offender-42-8-66-petition-1.court_of_conviction'],
      'ga-fo-active-pre2026-set--custom-pleading': ['primary_filing.caption_court_and_county', 'proposed_order.order_caption_court_and_county'],
      'ga-fo-discharged-pre2026-set--custom-pleading': ['primary_filing.caption_court_and_county', 'proposed_order.order_caption_court_and_county'] } } };
  const countyFields = o => { const out = []; const w = x => { if (Array.isArray(x)) x.forEach(w); else if (x && typeof x === 'object') { if (typeof x.field === 'string' && /county|court_of_conviction/i.test(x.field)) out.push(x); Object.values(x).forEach(w); } }; w(o); return out; };
  for (const [member, { route, families, absentSet }] of Object.entries(members)) {
    const plan = packetPlanForPathway(profile, route);
    const collect = answers => collectFor({ jurisdiction: 'GA', pathwayId: route, requiredInputIds: plan.requiredInputIds, serverFacts: { jurisdiction: 'GA', pathway_id: route }, screeningAnswers: answers });
    for (const [label, value] of [['absent', undefined], ['typed-unknown', { unknown: true }], ['not-sure', 'I am not sure'], ['empty', '']]) {
      const c = collect(value === undefined ? {} : { county: value }), facts = c.facts.filter(f => f.factId === 'county');
      assert.equal(facts.length, 1, member + '/' + label);
      assert.equal(facts[0].collection, 'unresolved', member + '/' + label);
      assert.equal(facts[0].source, 'unresolved_route_rule_scope', member + '/' + label);
      assert(!Object.hasOwn(facts[0], 'value') && !Object.hasOwn(c.knownFacts, 'county'), member + '/' + label + ' no inferred value');
      assert(c.unresolvedRequiredFacts.includes('county') && prepayGateFactIds(c).includes('county'), member + '/' + label + ' requirement retained');
    }
    for (const known of ['Fulton', 'Condado de DeKalb']) {
      const c = collect({ county: known }), fact = c.facts.find(f => f.factId === 'county');
      assert.equal(fact.collection, 'already_known', member + '/' + known); assert.equal(fact.value, known); assert.equal(c.knownFacts.county, known);
      assert(!c.unresolvedRequiredFacts.includes('county'), member + '/' + known);
    }
    assert.deepEqual(renderPreflight({ snapshot: { jurisdiction: 'GA', pathwayId: route, selectedTrackId: null }, verificationHash: 'synthetic', facts: { county: 'Fulton' } }),
      { ready: false, reason: 'no_composable_specification_for_route', missingFactIds: [] }, member + ' no render authority');
    for (const [dir, expected] of Object.entries(families)) {
      const familyMap = read(GA + dir + '/production-field-map.json'), fields = countyFields(familyMap);
      for (const field of expected) {
        const xs = fields.filter(x => x.field === field);
        assert(xs.length && xs.every(x => x.factId == null) && xs.some(x => typeof x.participantMustSupply === 'string' && x.participantMustSupply.length > 0), member + '/' + field + ' participant-supplied');
      }
      assert(!JSON.stringify(familyMap).includes('"factId":"county"'), member + '/' + dir + ' generic county never bound');
      assert.equal(read(GA + dir + '/product-wiring.json').binding.paymentEligible, false, member + '/' + dir);
    }
    if (absentSet) {
      const r = registry.routes.find(x => x.pathwayKey === 'GA:' + route);
      assert.deepEqual(r.packetSetIds, [absentSet]); assert(r.separateGates.openBlockerIds.includes('renderer_unavailable'));
      assert(!fs.readdirSync(GA).some(d => d.startsWith(absentSet + '--')), member + ' no family inferred');
    }
  }
}
for (const [name, change] of [
  ['jurisdiction', p => { p.jurisdiction.code = 'MD'; }],
  ['explicit route input', p => { p.packetGenerator.pathways.find(x => x.pathwayId === id).requiredInputIds = [...p.packetGenerator.requiredInputs]; }],
  ['new source', p => { p.packetGenerator.pathways.find(x => x.pathwayId === id).sourceRuleRefs.push('new-source'); }],
  ['new mode', p => { p.packetGenerator.pathways.find(x => x.pathwayId === id).mode = 'official_pdf_overlay'; }],
  ['new mapping', p => { p.packetGenerator.pathways.find(x => x.pathwayId === id).formMappingStatus = 'mapped'; }],
  ['new form', p => { p.packetGenerator.pathways.find(x => x.pathwayId === id).formCandidates.push({ relativePath: 'new.pdf', sha256: 'new' }); }],
  ['changed rule', p => { p.exclusionRules.find(x => x.id === 'exclusion-29').ruleText = 'New county condition'; }],
  ['new unscoped county rule', p => { p.exclusionRules.push({ id: 'new-county-rule', fieldsReferenced: ['county'] }); }],
  ['authored consumer', p => { p.questionLifecycle.routeConsumers.county = [id]; }],
  ['route trigger', p => { p.pathways.find(x => x.id === id).triggerFields.push('county'); }],
]) {
  const changed = structuredClone(profile); change(changed);
  assert.equal(isGeorgiaAgencyWithoutCounty(changed, id), false, name);
  assert(packetPlanForPathway(changed, id).requiredInputIds.includes('county'), name);
}

// Historical plans differ ONLY by the inherited county input. The stored plan
// remains evidence; do not migrate it, its authority, or any raw answer map.
const legacyPlan = { ...plan, requiredInputIds: [...profile.packetGenerator.requiredInputs] };
for (const maps of [
  { answers: {}, prefilledAnswers: {}, screeningAnswers: {} },
  { answers: { county: 'Fulton' }, prefilledAnswers: {}, screeningAnswers: {} },
  { answers: { county: { unknown: true } }, prefilledAnswers: {}, screeningAnswers: {} },
  { answers: {}, prefilledAnswers: { county: { value: 'Condado de DeKalb', source: 'historical' } }, screeningAnswers: {} },
  { answers: { county: 'Saved county' }, prefilledAnswers: { county: 'Prefilled county' }, screeningAnswers: { county: 'Screening county' } },
]) {
  const item = itemWith(maps.answers, maps.screeningAnswers);
  item.artifactRefs.commercialFlow.screening.packetPlan = structuredClone(legacyPlan);
  item.artifactRefs.commercialFlow.packetInformation.prefilledAnswers = maps.prefilledAnswers;
  const raw = JSON.stringify(item);
  const model = packetInformationModelFor(item);
  assert.deepEqual(model.requiredInputIds, plan.requiredInputIds);
  assert(!model.missingInputIds.includes('county'));
  assert(!model.questions.some(q => q.id === 'county'), 'historical EN/ES question retired only on this exact plan');
  assert(!model.builderQuestions.some(q => q.id === 'county'));
  assert(!model.builderSections.some(s => s.questionIds.includes('county')));
  assert.deepEqual(model.initialAnswers.county, maps.answers.county ?? maps.prefilledAnswers.county);
  assert.deepEqual(model.screeningAnswers.county, maps.screeningAnswers.county);
  assert.deepEqual(model.packetPlan, legacyPlan, 'stored plan is never silently upgraded');
  assert.equal(model.initialAnswers.arrestingAgency, undefined);
  assert.equal(model.initialAnswers.court, undefined);
  assert.equal(JSON.stringify(item), raw);
}
const legacy = itemWith({ county: { value: 'Condado guardado', source: 'historical' } });
legacy.artifactRefs.commercialFlow.screening.packetPlan = structuredClone(legacyPlan);
const siblingId = profile.pathways.find(p => p.id !== id).id;
for (const [name, alter] of [
  ['wrong jurisdiction', item => { item.state = 'MD'; }],
  ['different screening route', item => { item.artifactRefs.commercialFlow.screening.pathwayId = siblingId; }],
  ['different plan route', item => { item.artifactRefs.commercialFlow.screening.packetPlan.pathwayId = siblingId; }],
  ['duplicate county', item => { item.artifactRefs.commercialFlow.screening.packetPlan.requiredInputIds.push('county'); }],
  ['extra required fact', item => { item.artifactRefs.commercialFlow.screening.packetPlan.requiredInputIds.push('unreviewed_fact'); }],
  ['changed forms', item => { item.artifactRefs.commercialFlow.screening.packetPlan.sourceFormIds.push('unreviewed:form'); }],
  ['changed source epoch', item => { item.artifactRefs.commercialFlow.screening.packetPlan.sourceRuleRefs.push('unreviewed:source'); }],
  ['changed readiness', item => { item.artifactRefs.commercialFlow.screening.packetPlan.packetReadyWhen.push('unreviewed'); }],
  ['unknown property', item => { item.artifactRefs.commercialFlow.screening.packetPlan.unreviewedProperty = true; }],
  ['changed mode', item => { item.artifactRefs.commercialFlow.screening.packetPlan.mode = 'official_pdf_overlay'; }],
  ['changed mapping', item => { item.artifactRefs.commercialFlow.screening.packetPlan.formMappingStatus = 'mapped'; }],
]) {
  const changed = structuredClone(legacy); alter(changed);
  const raw = JSON.stringify(changed);
  assert(packetInformationModelFor(changed).requiredInputIds.includes('county'), name);
  assert.equal(JSON.stringify(changed), raw, name + ': preserve all history');
}

// Execute the ORIGINAL export function and ORIGINAL validator section 2 on
// exactly this fixture, in memory. Never run their nationwide entrypoints or
// overwrite accepted reports. The loader changes only selection/export bounds.
const exporter = new URL('./generate-packet-collection-audit.mjs', import.meta.url).href;
const validator = new URL('./verify-packet-collection.mjs', import.meta.url).href;
const hook = `import { readFileSync } from 'node:fs';
export async function load(url, context, next) {
  if (url === ${JSON.stringify(exporter)}) {
    const source = readFileSync(new URL(url), 'utf8');
    const end = source.indexOf('const profiles = getAllJurisdictionProfiles();');
    if (end < 0) throw new Error('original export boundary changed');
    return { format: 'module', shortCircuit: true, source: source.slice(0,end) + '\\nexport { auditRoute };' };
  }
  if (url === ${JSON.stringify(validator)}) {
    const source = readFileSync(new URL(url), 'utf8');
    const endImports = source.indexOf('// 1. The sections');
    const start = source.indexOf('const resolutions = [];');
    const end = source.indexOf('// 3. No participant');
    if (endImports < 0 || start < 0 || end < 0) throw new Error('original validator boundaries changed');
    const selection = 'getAllJurisdictionProfiles().filter(p => p.jurisdiction.code === "GA").map(p => ({ ...p, pathways: p.pathways.filter(x => x.id === ${JSON.stringify(id)}) }))';
    return { format: 'module', shortCircuit: true, source: source.slice(0,endImports) + source.slice(start,end).replace('getAllJurisdictionProfiles()', selection) + '\\nexport { resolutions, unresolvedFacts, failures };' };
  }
  return next(url, context);
}`;
register('data:text/javascript,' + encodeURIComponent(hook), import.meta.url);
const { auditRoute } = await import(exporter);
const exported = auditRoute(profile, path);
const validated = await import(validator);
assert.equal(validated.resolutions.length, 1);
assert.deepEqual(validated.resolutions[0].resolution, current);
assert.deepEqual(exported.unresolvedRequiredFacts, current.unresolvedRequiredFacts);
assert(!exported.unresolvedRequiredFacts.includes('county'));
assert(!validated.unresolvedFacts.some(x => x.endsWith('|county')));
assert.equal(exported.reconciliation.accountedFor, true);
assert.deepEqual(exported.reconciliation.droppedFactIds, []);
assert.deepEqual(exported.reconciliation.inventedFactIds, []);
assert.deepEqual(validated.failures, []);
const proof = { obligation: 'GA14-GA-EXACT_OFFICIAL_FORM_NO_PARTICIPANT_COUNTY_FIELD_CONTEXT_ROUTING_REVIEW',
  manifestation: 'GA-14-M01022', routeKey: 'GA:' + id,
  beforeCounty: before.facts.find(x => x.factId === 'county'), afterCounty: null,
  sourceHashes: Object.fromEntries(['data/record-clearing/legal-design-intake/GA.memo.json', sourceRoot + 'production-field-map.json', sourceRoot + 'source-receipt.json'].map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),
  originalExport: exported, originalValidator: { unresolvedFacts: validated.unresolvedFacts, failures: validated.failures },
  scope: 'Collection dependency only; no route eligibility, official form bytes, actor ownership, protected generation or commercial authority changed.' };
const output = process.argv.indexOf('--receipt');
if (output >= 0) fs.writeFileSync(process.argv[output + 1], JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
console.log('PASS: exact GA agency county dependency and historical-plan compatibility; saved answers, EN/ES model, sibling counties, source-change guards and original resolver/export/validator fixture');
