#!/usr/bin/env node
// Original GA-16-M01436 / Q-968b7bc50644bf0950b6; no rendering or database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
register('data:text/javascript,' + encodeURIComponent(`export async function load(url,context,next){const r=await next(url,context);return url.endsWith('/src/components/expungement-ai/LocalizationProvider.tsx')?{...r,source:r.source+'\\nexport { LocalizationContext };'}:r;}`), import.meta.url);
const H = await import('../src/lib/rcap-engine/dc-innocence-location-context.ts');
const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { reviewedPacketQuestion } = await import('../src/lib/expungement-ai/reviewed-question-copy.ts');
const profile = JSON.parse(fs.readFileSync('src/lib/rcap-engine/compiled/profiles/DC-district-of-columbia.json'));
const id = H.DC_INNOCENCE_PATHWAY, fact = H.DC_LEGACY_LOCATION;
const spec = packetSpecificationFor('DC:' + id);
const before = JSON.stringify({ profile, spec });
let checks = 0;
const check = (name, fn) => { try { fn(); checks++; } catch (error) { console.error(name); throw error; } };
check('retained source fixes court and separates mailing/service destinations', () => {
 assert.equal(H.dcInnocenceLocationIsContext(profile, id, spec), true);
 assert.deepEqual(spec.documents[0].sections[0].captionContract.courtLines,
  [{ prefix: 'SUPERIOR COURT OF THE DISTRICT OF COLUMBIA' }, { prefix: 'CRIMINAL DIVISION' }]);
 assert(spec.requiredFacts.some(f => f.factId === 'mailing_address'));
 assert(spec.fieldOwnership.participantCompletesBeforeFilingFields.includes('dc_prosecuting_office_2'));
 assert(!JSON.stringify(spec).includes(fact));
});
check('only exact route plan loses unsupported inherited location', () => {
 const original = profile.packetGenerator.pathways.find(p => p.pathwayId === id);
 const result = packetPlanForPathway(profile, id);
 assert.deepEqual(result, { pathwayId: id, mode: original.mode, formMappingStatus: original.formMappingStatus,
  sourceFormIds: [], requiredInputIds: [...new Set([...profile.packetGenerator.requiredInputs, ...spec.requiredFacts.map(f => f.factId)])].filter(x => x !== fact),
  sourceRuleRefs: original.sourceRuleRefs, packetReadyWhen: original.packetReadyWhen });
 for (const sibling of profile.packetGenerator.pathways.filter(p => p.pathwayId !== id))
  assert(packetPlanForPathway(profile, sibling.pathwayId).requiredInputIds.includes(fact));
});
const mutations = [
 p => p.jurisdiction.code = 'VA', p => p.profileVersion += '-changed', p => p.source.sourceCorpusSha256 = 'changed',
 p => p.pathways.push(structuredClone(p.pathways.find(x => x.id === id))),
 p => p.packetGenerator.pathways.push(structuredClone(p.packetGenerator.pathways.find(x => x.pathwayId === id))),
 p => p.packetGenerator.pathways.find(x => x.pathwayId === id).requiredInputIds = [fact],
 p => p.packetGenerator.pathways.find(x => x.pathwayId === id).mode = 'other',
 p => p.packetGenerator.pathways.find(x => x.pathwayId === id).formMappingStatus = 'other',
 p => p.packetGenerator.pathways.find(x => x.pathwayId === id).formCandidates.push({ relativePath: 'new.pdf', sha256: 'new' }),
 p => p.packetGenerator.pathways.find(x => x.pathwayId === id).sourceRuleRefs.reverse(),
 p => p.packetGenerator.requiredInputs.push(fact),
 p => p.pathways.find(x => x.id === id).newCondition = fact,
 p => p.questionLifecycle = { exactPacketFactIds: [fact], routeConsumers: { [fact]: [id] } },
 p => p.packetGenerator.newCondition = { [fact]: true }
];
for (const [i, mutate] of mutations.entries()) check('changed source/consumer refuses exception ' + i, () => {
 const p = structuredClone(profile); mutate(p);
 assert.equal(H.dcInnocenceLocationIsContext(p, id, spec), false);
});
for (const mutate of [s => s.routeKey = 'DC:other', s => s.trackId = 'other', s => s.specificationSha256 = 'changed',
 s => s.requiredFacts.push({ id: fact }), s => s.documents[0].sections.push({ kind: 'paragraph', template: '{{' + fact + '}}' })]) {
 check('changed exact document consumer refuses exception', () => {
  const s = structuredClone(spec); mutate(s); assert.equal(H.dcInnocenceLocationIsContext(profile, id, s), false);
 });
}
const raw = { id: fact, stage: 'packet_information', prompt: 'What city or location belongs with this matter?',
 type: 'text_or_unknown', required: true, contextOnly: false, lifecyclePhase: 'postpay_packet_field', options: null };
for (const helping of [false, true]) check('paired optional context copy preserves ownership ' + helping, () => {
 const q = reviewedPacketQuestion(raw, { state: 'DC', pathwayId: id, participantOwnsRecord: !helping, participantHelpingRecord: helping });
 assert.equal(q.required, false); assert.equal(q.id, fact); assert.equal(q.type, raw.type);
 assert(q.helperText.includes('not printed')); assert(q.helperText.includes('prosecutor'));
 assert(q.translations.es.helperText.includes('no se imprime')); assert(q.translations.es.helperText.includes('fiscalía'));
 assert(q.translations.es.prompt.includes('opcional'));
});
for (const mutate of [q => q.prompt += ' Changed', q => q.type = 'text', q => q.contextOnly = true,
 q => q.required = false, q => q.helperText = 'Different source meaning', q => q.options = []]) {
 check('changed descriptor remains exact', () => {
  const q = { ...raw }; mutate(q); assert.equal(H.dcInnocenceLocationQuestion(q, profile, id, spec), q);
 });
}
check('wrong route never receives the copy', () => assert.equal(H.dcInnocenceLocationQuestion(raw, profile, 'dc_auto_expungement_16_802', spec), raw));
check('source and specification bytes remain unmodified', () => assert.equal(JSON.stringify({ profile, spec }), before));
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { reviewedPacketContractSuccessor } = await import('../src/lib/expungement-ai/packet-contract-successors.ts');
const { prepayGateFactIds, renderGateFactIds } = await import('../src/lib/expungement-ai/packet-collection.ts');
const fixture = JSON.parse(fs.readFileSync('scripts/fixtures/dc-innocence-location-predecessor.json'));
const plan = packetPlanForPathway(profile, id);
check('every reproduced baseline module matches its published Git blob', () => {
 assert.equal(fixture.loadedSourceModules.length, 152);
 assert.equal(new Set(fixture.loadedSourceModules.map(entry => entry.path)).size, 152);
 for (const entry of fixture.loadedSourceModules) assert.equal(createHash('sha256').update(execFileSync('git', ['show', fixture.sourceCommit + ':' + entry.path], { maxBuffer: 30000000 })).digest('hex'), entry.sha256);
});
check('actual prior-runtime synthetic save is intact', () => {
 assert.equal(fixture.classification, 'FRESH_EXACT_BASELINE_PROTECTED_SAVE_REPRODUCTION_NOT_PRIOR_CAPTURE');
 assert.equal(fixture.sourceCommit, '0983b7fc34d8fa9299b71d4d8775634d0e4007c2');
 assert.equal(P.protectedPacketDraftHash(fixture.record.draftSnapshot), fixture.record.draftHash);
 assert.deepEqual({ ...fixture.record.draftSnapshot.packetPlan, requiredInputIds: fixture.record.draftSnapshot.requiredInputIds.filter(x => x !== fact) }, plan);
});
for (const map of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) for (const value of [undefined, 'Washington', { value: 'Lugar guardado', unknown: false }, { unknown: true }, '', null, { value: ['legacy malformed'], unknown: false }]) {
 check('protected optional raw context ' + map + '/' + JSON.stringify(value), () => {
  const record = structuredClone(fixture.record);
  for (const source of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) delete record.draftSnapshot[source][fact];
  if (value !== undefined) record.draftSnapshot[map][fact] = value;
  record.draftHash = P.protectedPacketDraftHash(record.draftSnapshot);
  const before = JSON.stringify(record), model = P.protectedPacketInformationModelFor(record);
  assert(model); assert(!model.requiredInputIds.includes(fact)); assert(!model.missingInputIds.includes(fact));
  const question = model.builderQuestions.find(q => q.id === fact);
  if (value === undefined) assert.equal(question, undefined); else { assert(question); assert.equal(question.required, false); }
  assert.equal(JSON.stringify(record), before);
  const noop = P.packetInformationPatch({ existingItem: { id: 'dc-location-source-fixture', artifactRefs: {} }, protectedVerification: record, answers: {} });
  assert(noop); assert.equal(noop.protectedTransition.nextVerification.draftHash, record.draftHash);
  assert.deepEqual(noop.protectedTransition.nextVerification.draftSnapshot, record.draftSnapshot);
  const update = P.packetInformationPatch({ existingItem: { id: 'dc-location-source-fixture', artifactRefs: {} }, protectedVerification: record, answers: { charge: 'Updated source fixture charge' } });
  assert(update); const next = update.protectedTransition.nextVerification;
  assert.deepEqual(next.draftSnapshot.packetPlan, plan);
  for (const source of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) assert.deepEqual(next.draftSnapshot[source][fact], record.draftSnapshot[source][fact]);
  assert.equal(next.status, 'unverified'); assert.equal(next.hash ?? null, null); assert.equal(next.snapshot ?? null, null);
  assert.equal(update.readyToGenerate, false);
  assert.equal(next.draftSnapshot.resultCode, record.draftSnapshot.resultCode);
  assert.equal(next.draftSnapshot.paymentAllowed, record.draftSnapshot.paymentAllowed);
 });
}
for (const value of [undefined, 'Washington', { unknown: true }]) check('legacy model and collection no location gate ' + JSON.stringify(value), () => {
 const answers = value === undefined ? {} : { [fact]: value };
 const item = { state: 'DC', artifactRefs: { commercialFlow: { screening: { pathwayId: id, packetPlan: fixture.record.draftSnapshot.packetPlan, answers: fixture.sourceEstablishedAnswers }, packetInformation: { answers, prefilledAnswers: {} } } } };
 const model = P.packetInformationModelFor(item); assert(model); assert(!model.requiredInputIds.includes(fact)); assert(!model.missingInputIds.includes(fact));
 const collection = P.packetCollectionFor({ jurisdiction: 'DC', pathwayId: id, requiredInputIds: plan.requiredInputIds, serverFacts: { jurisdiction: 'DC', pathway_id: id }, screeningAnswers: fixture.sourceEstablishedAnswers, savedAnswers: answers });
 assert(!prepayGateFactIds(collection).includes(fact)); assert(!renderGateFactIds(collection).includes(fact));
 assert(!Object.hasOwn(collection.derivedFacts, fact)); assert(!Object.hasOwn(collection.knownFacts, fact));
});
for (const [label, mutate] of [
 ['version', s => s.profileVersion = 'changed'], ['source', s => s.profileSourceFingerprint = 'changed'], ['authority', s => s.profileAuthorityFingerprint = 'changed'],
 ['wrong route', s => s.pathwayId = 'dc_auto_expungement_16_802'], ['changed mode', s => s.packetPlan.mode = 'other'],
 ['extra field', s => s.packetPlan.requiredInputIds.push('other')], ['duplicate', s => s.packetPlan.requiredInputIds.push(fact)],
 ['reordered', s => s.requiredInputIds.reverse()], ['missing other', s => s.packetPlan.requiredInputIds = s.packetPlan.requiredInputIds.filter(x => x !== 'court')],
 ['extra property', s => s.packetPlan.unreviewed = true]
]) check('historical successor rejects ' + label, () => {
 const snapshot = structuredClone(fixture.record.draftSnapshot); mutate(snapshot); assert.equal(reviewedPacketContractSuccessor(snapshot, plan), null);
});
check('invalid protected digest cannot gain compatibility', () => {
 const record = structuredClone(fixture.record); record.draftHash = '0'.repeat(64); assert.equal(P.protectedPacketInformationModelFor(record), null);
});
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { QuestionField } = await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const { t, resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
for (const locale of ['en', 'es']) check('actual localized optional owner control ' + locale, () => {
 const model = P.protectedPacketInformationModelFor(fixture.record), question = model.builderQuestions.find(q => q.id === fact);
 const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
 const html = renderToStaticMarkup(createElement(LocalizationContext.Provider, { value }, createElement(QuestionField, { question, stateCode: 'DC', value: model.initialAnswers[fact], onChange() { assert.fail('render must not edit'); }, headingLevel: 3 })));
 assert(html.includes(locale === 'es' ? 'Contexto guardado opcional' : 'Optional saved context'));
 assert(html.includes(locale === 'es' ? 'no se imprime' : 'not printed'));
 assert(html.includes('Original saved location context')); assert(!html.includes(' required=""'));
});
for (const value of [{ unknown: true }, { value: 'Corrected context', unknown: false }, '']) check('explicit optional context edit ' + JSON.stringify(value), () => {
 const patch = P.packetInformationPatch({ existingItem: { id: 'dc-location-source-fixture', artifactRefs: {} }, protectedVerification: fixture.record, answers: { [fact]: value } });
 assert(patch); const next = patch.protectedTransition.nextVerification;
 assert.deepEqual(next.draftSnapshot.packetAnswers[fact], value);
 assert(!P.protectedPacketInformationModelFor(next).missingInputIds.includes(fact));
 assert.equal(next.draftSnapshot.paymentAllowed, fixture.record.draftSnapshot.paymentAllowed);
 assert.equal(next.status, 'unverified'); assert.equal(patch.readyToGenerate, false);
});
check('other current plan mutations cannot reuse historical exception', () => {
 for (const mutate of [p => p.requiredInputIds.reverse(), p => p.requiredInputIds.push('new'), p => p.mode = 'changed']) {
  const changed = structuredClone(plan); mutate(changed); assert.equal(reviewedPacketContractSuccessor(fixture.record.draftSnapshot, changed), null);
 }
});
check('conflicting retained context copies survive until explicit edit archives them', () => {
 const record = structuredClone(fixture.record);
 record.draftSnapshot.screeningAnswers[fact] = 'Original screening place';
 record.draftSnapshot.prefilledAnswers[fact] = { value: 'Original prefill place', unknown: false };
 record.draftHash = P.protectedPacketDraftHash(record.draftSnapshot);
 const unchanged = P.packetInformationPatch({ existingItem: { id: 'dc-location-source-fixture', artifactRefs: {} }, protectedVerification: record, answers: { charge: 'Another explicit charge' } });
 assert(unchanged); for (const source of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) assert.deepEqual(unchanged.protectedTransition.nextVerification.draftSnapshot[source][fact], record.draftSnapshot[source][fact]);
 const patch = P.packetInformationPatch({ existingItem: { id: 'dc-location-source-fixture', artifactRefs: {} }, protectedVerification: record, answers: { [fact]: 'Corrected context' } });
 assert(patch); const next = patch.protectedTransition.nextVerification.draftSnapshot;
 assert.equal(next.packetAnswers[fact], 'Corrected context');
 for (const source of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) assert.deepEqual(next.dependencies.semanticAnswerHistory.find(entry => entry.factId === fact && entry.source === source)?.value, record.draftSnapshot[source][fact]);
 assert.equal(next.resultCode, record.draftSnapshot.resultCode); assert.equal(next.paymentAllowed, record.draftSnapshot.paymentAllowed);
});
console.log(`PASS DC fixed-caption location context: ${checks} checks`);
