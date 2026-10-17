#!/usr/bin/env node
// GA-12-M00730 / Q-4cfc4c0189f5eec06b72 only; no nationwide audit or PDF run.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { createHash } from 'node:crypto';
register('./lib/ts-esm-loader.mjs', import.meta.url);
// Expose existing pure helpers in memory; no rewritten production module or DB.
register('data:text/javascript,' + encodeURIComponent(`export async function load(url,context,next){const r=await next(url,context);if(typeof r.source!=='string')return r; const suffix=url.endsWith('/src/lib/expungement-ai/packet-information.ts')?'export { protectedPacketQuestionSurface as categorySurface, evaluateProtectedPacketFacts as categoryAuthority, validatePacketAnswer as categoryValidate };':url.endsWith('/src/components/expungement-ai/LocalizationProvider.tsx')?'export { LocalizationContext };':''; return {...r,source:r.source+'\\n'+suffix};}`), import.meta.url);
const G = await import('../src/lib/rcap-engine/georgia-pardon-facts.ts');
const H = await import('../src/lib/expungement-ai/ga-pardon-category-context.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { stableStringify } = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const { prepayGateFactIds, renderGateFactIds, resolvePacketCollection } = await import('../src/lib/expungement-ai/packet-collection.ts');
const { reviewedPacketQuestion } = await import('../src/lib/expungement-ai/reviewed-question-copy.ts');
const { composeParticipantDeliveryPacket } = await import('../src/lib/rcap/grade-a/participant-packet.ts');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createElement } = await import('react');
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const { QuestionField } = await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const { t, resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const profile = getProfileByJurisdiction('GA'), id = G.GA_PARDON_ROUTE, route = 'GA:' + id;
const spec = packetSpecificationFor(route), plan = packetPlanForPathway(profile, id);
const fixture = JSON.parse(fs.readFileSync('scripts/fixtures/conviction-fallback-predecessors.json')).rows.find(r => r.id.startsWith('GA') && r.id.endsWith('/omitted'));
const complete = { ...fixture.answers, case_outcome: 'Misdemeanor conviction', ga_record_help: 'pardon_record', pardon_status: 'Yes', ga_board_pardon: 'yes', ga_pardon_date: '2021-01-02', ga_pardoned_offense_section: '16-8-14(a)', ga_convictions_since_pardon: 'none', ga_pardon_pending_charges: 'no', pending_cases: 'No' };
const checks = []; const check = (name, fn) => { fn(); checks.push({ name, pass: true }); };
const memo = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/GA.memo.json'));
check('original source asks the conviction Code section, not broad category', () => {
 const inputs = memo.tracks.find(t => t.trackId === 'ga-pardon-j7').participantInputs;
 assert(inputs.some(i => i.key === 'offenseCodeSection' && i.requirement === 'required'));
 assert(!inputs.some(i => /category/i.test(i.key)));
 assert(spec.statutoryAuthority.ruleStatement.includes('§ 17-10-6.1'));
 assert(spec.statutoryAuthority.ruleStatement.includes('§ 17-10-6.2'));
});
// The guard pins the declared digest; it is only a review fingerprint if the
// declared value is the actual content digest of the registered specification.
check('reviewed specification pin is the actual content digest', () => {
 const content = JSON.parse(fs.readFileSync('data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json'));
 const declared = content.specificationSha256; delete content.specificationSha256;
 assert.equal(declared, spec.specificationSha256);
 assert.equal(createHash('sha256').update(stableStringify(content)).digest('hex'), declared);
 assert(H.georgiaPardonCategoryIsContext('GA', id, spec));
});
const rawQuestion = { id: 'offense_category', stage: 'packet_information', prompt: 'What category does the court record use for this offense?', type: 'text_or_unknown', required: true, contextOnly: false, lifecyclePhase: 'postpay_packet_field', options: null };
const values = [undefined, 'Possession', 'Amended theft count', 'Count 1 theft; Count 2 possession', 'Felony', { value: '', unknown: true }, { value: 'Categoría guardada', unknown: false }];
for (const [source, mapName] of [['screening', 'screeningAnswers'], ['prefilled', 'prefilledAnswers'], ['saved', 'savedAnswers']]) {
 for (const value of values) {
  const maps = { screeningAnswers: { ...complete, offense_level: 'Misdemeanor' }, prefilledAnswers: {}, savedAnswers: {} };
  if (value !== undefined) maps[mapName].offense_category = value;
  const raw = JSON.stringify(maps);
  const surface = P.categorySurface(profile, id, maps.screeningAnswers, plan.requiredInputIds,
    { jurisdiction: 'GA', pathway_id: id }, maps.prefilledAnswers, maps.savedAnswers);
  const fact = surface.collection.facts.find(f => f.factId === 'offense_category');
  const q = surface.builderQuestions.find(q => q.id === 'offense_category');
  check(source + '/' + JSON.stringify(value) + ' retained context never gates or derives', () => {
   assert.equal(fact.source, 'ga_pardon_exact_record_category_context');
   assert(!prepayGateFactIds(surface.collection).includes('offense_category'));
   assert(!renderGateFactIds(surface.collection).includes('offense_category'));
   assert(!Object.hasOwn(surface.collection.derivedFacts, 'offense_category'));
   assert(!Object.hasOwn(surface.collection.knownFacts, 'offense_category'));
   assert.equal(JSON.stringify(maps), raw);
   if (value === undefined) assert.equal(q, undefined, 'never ask a new empty category question');
   else { assert.equal(q.required, false); assert.equal(P.categoryValidate(q, value, true).safe, true); }
  });
  if (q) for (const locale of ['en', 'es']) check(source + '/' + JSON.stringify(value) + '/' + locale + ' optional copy rendered', () => {
   const text = locale === 'es' ? q.translations.es : q;
   const localization = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (s, options) => resolveRuntimeText(locale, s, options) };
   const html = renderToStaticMarkup(createElement(LocalizationContext.Provider, { value: localization }, createElement(QuestionField, { question: q, stateCode: 'GA', value, onChange() { assert.fail('render never changes the saved answer'); }, headingLevel: 3 })));
   assert(html.includes('q-offense_category'));
   assert(html.includes(renderToStaticMarkup(createElement('span', null, text.prompt)).slice(6, -7)));
   assert(html.includes('type="text"'));
   assert(!html.includes(' required=""'));
   assert(html.includes(locale === 'es' ? 'opcional' : 'Optional'));
   assert(html.includes(locale === 'es' ? 'Código' : 'Code section'));
   assert(html.includes(locale === 'es' ? 'no se imprime' : 'not printed'));
  });
  const editModel = { stateCode: 'GA', pathwayId: id, requiredInputIds: plan.requiredInputIds,
   serverFacts: { jurisdiction: 'GA', pathway_id: id }, screeningAnswers: maps.screeningAnswers,
   prefilledAnswers: maps.prefilledAnswers, packetAnswers: maps.savedAnswers, recordOwnQuestionIds: [], questions: surface.questions };
  check(source + '/' + JSON.stringify(value) + ' existing answer stays editable', () =>
   assert.equal(P.editablePacketInputIds(editModel).has('offense_category'), value !== undefined));
 }
}
for (const value of [{}, [], 7, { value: 'Unconfirmed wrapper' }, { value: 'Context', unknown: 'false' }]) check('malformed optional answer is not accepted ' + JSON.stringify(value), () => assert.equal(P.categoryValidate(rawQuestion, value, true).safe, false));
for (const patch of [{ prompt: 'New meaning' }, { helperText: 'New source' }, { type: 'text' }, { required: false }, { contextOnly: true }, { options: ['New'] }, { lifecyclePhase: 'prepay_route_splitter' }]) check('changed descriptor stays intact ' + JSON.stringify(patch), () => {
 const q = { ...rawQuestion, ...patch }; assert.equal(H.gaPardonCategoryQuestion(q, 'GA', id, spec), q);
});
for (const alter of [s => { s.specificationSha256 = 'changed'; }, s => { s.trackId = 'another-track'; }, s => { s.requiredFacts.push({ factId: 'offense_category', use: 'Required source fact' }); }, s => { s.documents[0].sections.push({ kind: 'pleading_paragraph', body: '{{offense_category}}' }); }]) check('changed document contract cannot use this exception ' + checks.length, () => {
 const changed = structuredClone(spec); alter(changed);
 assert(!H.georgiaPardonCategoryIsContext('GA', id, changed));
 const r = resolvePacketCollection({ jurisdiction: 'GA', pathwayId: id, requiredInputIds: ['offense_category'], serverFacts: {}, screeningAnswers: {}, specification: changed, routeDecidingFactIds: new Set(['offense_category']) });
 assert(prepayGateFactIds(r).includes('offense_category'));
});
for (const alter of [p => { p.profileVersion = 'changed'; }, p => { p.source.sourceCorpusSha256 = 'changed'; }, p => { p.pathways = p.pathways.filter(pathway => pathway.id !== id); }]) check('changed profile epoch requires review ' + checks.length, () => { const p = structuredClone(profile); alter(p); assert(!H.georgiaPardonCategoryIsContext('GA', id, spec, p)); });
check('every other required fact retains its exact collection disposition', () => {
 const input = { jurisdiction: 'GA', pathwayId: id, requiredInputIds: plan.requiredInputIds,
  serverFacts: { jurisdiction: 'GA', pathway_id: id }, screeningAnswers: {}, specification: spec,
  routeDecidingFactIds: new Set(['offense_category', ...G.GA_PARDON_FACT_IDS]) };
 const current = resolvePacketCollection(input);
 const prior = resolvePacketCollection({ ...input, specification: { ...spec, specificationSha256: 'unreviewed-scope' } });
 assert.deepEqual(current.facts.filter(f => f.factId !== 'offense_category'), prior.facts.filter(f => f.factId !== 'offense_category'));
 assert.deepEqual(current.facts.map(f => f.factId), prior.facts.map(f => f.factId));
 assert(prepayGateFactIds(prior).includes('offense_category'));
 assert(!prepayGateFactIds(current).includes('offense_category'));
});
for (const sibling of profile.pathways.filter(p => p.id !== id)) check('sibling is untouched ' + sibling.id, () => {
 assert(!H.georgiaPardonCategoryIsContext('GA', sibling.id, packetSpecificationFor('GA:' + sibling.id)));
 assert.equal(reviewedPacketQuestion(rawQuestion, { state: 'GA', pathwayId: sibling.id, participantOwnsRecord: true }).prompt, rawQuestion.prompt);
});
check('different jurisdiction and absent source have no exception', () => { assert(!H.georgiaPardonCategoryIsContext('MD', id, spec)); assert(!H.georgiaPardonCategoryIsContext('GA', id, null)); });

// Distinct actual legal controls: category text must not supply missing exact
// facts or override exclusions, uncertainty, misdemeanor/felony conflicts.
const legalCases = [
 ['qualifying-predicate', {}, 'court_review'],
 ['violent-exclusion', { case_outcome: 'Felony conviction', ga_pardoned_offense_section: '16-8-41' }, 'excluded_offense'],
 ['missing-citation', { ga_pardoned_offense_section: undefined }, 'missing'],
 ['unparsed-citation', { ga_pardoned_offense_section: 'Shoplifting' }, 'citation_review'],
 ['missing-final-class', { case_outcome: 'Pardoned conviction' }, 'classification'],
 ['missing-exception', { case_outcome: 'Felony conviction', ga_pardoned_offense_section: '16-5-21(a)(1)' }, 'missing'],
 ['nonexcluded-assault', { case_outcome: 'Felony conviction', ga_pardoned_offense_section: '16-5-21(a)(1)', ga_pardon_assault_rape_intent: 'no' }, 'court_review'],
 ['later-conviction', { ga_convictions_since_pardon: 'other' }, 'later_conviction'],
 ['traffic-details-missing', { ga_convictions_since_pardon: 'traffic_only' }, 'missing'],
 ['pending', { ga_pardon_pending_charges: 'yes', pending_cases: 'Yes' }, 'pending']
];
for (const [name, patch, code] of legalCases) for (const category of values) check(name + '/category:' + JSON.stringify(category), () => {
 const answers = { ...complete, ...patch, ...(category === undefined ? {} : { offense_category: category }) };
 const guarded = new Proxy(answers, { get(target, key) { assert.notEqual(key, 'offense_category', 'exact legal matcher never reads generic category'); return target[key]; } });
 assert.equal(G.georgiaPardonFacts(guarded, '2026-10-14').code, code);
});
check('screening rejects category rather than treating it as an eligibility answer', () => assert.throws(() => evaluateScreening({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'ga12-synthetic', answers: { ...complete, offense_category: 'Theft' } }), e => e.invalidQuestionIds?.includes('offense_category')));
const authoritative = evaluateAuthoritativeScreeningResult({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'ga12-synthetic', answers: complete });
for (const category of values) check('real held snapshot retains original category and no-op ' + JSON.stringify(category), () => {
 const packetAnswers = category === undefined ? {} : { offense_category: category };
 const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: complete, packetAnswers, dependencies: { commercialFlowVersion: null, entitlementSource: null, productId: null }, capturedAt: '2026-10-14T00:00:00Z' });
 assert(seed); const raw = JSON.stringify(seed.snapshot);
 assert.deepEqual(seed.snapshot.packetAnswers.offense_category, category);
 const verified = { status: 'unverified', reason: 'synthetic-pure-test', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
 const model = P.protectedPacketInformationModelFor(verified); assert(model);
 assert(!model.packetPlan && !model.reviewSafety.safe, 'existing held authority stays held');
 const evaluated = P.categoryAuthority(seed.snapshot);
 assert.deepEqual(evaluated.evaluation, { ...authoritative.evaluation, matterId: 'protected:' + id }, 'actual protected evaluator drops only rejected packet-only ID');
 const patch = P.packetInformationPatch({ existingItem: { id: 'ga12-synthetic', artifactRefs: {} }, protectedVerification: verified, answers: {} });
 assert(patch); assert.equal(patch.protectedTransition.nextVerification.draftHash, seed.hash);
 assert.equal(JSON.stringify(seed.snapshot), raw);
});

// Reuse prior four rendered variants. Only compose the current document model
// to check newly changed mappings have introduced no category consumer.
const facts = Object.fromEntries(spec.requiredFacts.map(f => [f.factId, 'Synthetic ' + f.factId]));
Object.assign(facts, { participant_full_legal_name: 'Synthetic Casey Pardon', ga_pardoned_offense_section: '16-8-14(a)', ga_pardon_date: '2021-01-02', court: 'Municipal Court', county: 'Clarke', case_number: '2020-CR-0042', arrest_date: '2019-01-05', participant_narrative: 'A warehouse job was denied because of this record.' });
let original;
for (const category of [undefined, 'CATEGORY_SENTINEL_POSSESSION', 'CATEGORY_SENTINEL_TRAFFIC', 'I am not sure']) check('current document model has no category read ' + String(category), () => {
 const input = { ...facts, ...(category === undefined ? {} : { offense_category: category }) };
 const guarded = new Proxy(input, { get(target, key) { assert.notEqual(key, 'offense_category'); return target[key]; } });
 const packet = composeParticipantDeliveryPacket(spec, { routeKey: route, generationPurpose: 'internal_review', facts: guarded, verifiedAt: '2026-10-14T00:00:00Z', verificationHash: 'synthetic-fixed-category-context' });
 const bytes = JSON.stringify(packet); assert(!bytes.includes('CATEGORY_SENTINEL'));
 if (original === undefined) original = bytes; else assert.equal(bytes, original);
});
const report = { status: 'PASS', obligation: 'GA-12-M00730', questionRecordId: 'Q-4cfc4c0189f5eec06b72', checks,
 currentDocumentModelSha256: createHash('sha256').update(original).digest('hex'), pdfRuns: 0,
 scope: 'Exact GA pardon category collection and saved-context copy; pure protected lifecycle and current canonical document model. Original category-variant PDFs preserved. No authenticated storage or protected delivery acceptance claimed.' };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: checks.length, documentModelSha256: report.currentDocumentModelSha256, pdfRuns: 0 }));
