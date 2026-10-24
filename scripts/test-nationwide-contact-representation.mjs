import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const packet = await import('../src/lib/expungement-ai/packet-information.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { routeDecidingFactScope } = await import('../src/lib/rcap-engine/route-fact-relevance.ts');
const { routeSafetyGateFactIds } = await import('../src/lib/expungement-ai/packet-route-safety.ts');
const { reviewedContactRepresentation, contactRepresentationHash, isProvenContactOutput } = await import('../src/lib/expungement-ai/contact-representation.ts');
const contracts = JSON.parse(readFileSync(new URL('../src/lib/expungement-ai/reviewed-contact-contracts.json', import.meta.url)));
const components = { mailing_address: ' 100 Synthetic Way\nTest City ', phone_number: ' 202-555-0134 ', email_address: ' synthetic@example.test ' };
const aggregate = '100 Synthetic Way\nTest City | 202-555-0134 | synthetic@example.test';
let checks = 0;
const check = (name, test) => { test(); checks++; };
for (const routeKey of Object.keys(contracts.routes)) {
  const [state, pathwayId] = routeKey.split(':');
  const profile = getProfileByJurisdiction(state), pathway = profile.pathways.find(p => p.id === pathwayId);
  const plan = packetPlanForPathway(profile, pathwayId), specification = packetSpecificationFor(routeKey), scope = routeDecidingFactScope(profile, pathway);
  const args = { profile, pathwayId, specification, requiredInputIds: plan.requiredInputIds, decidingFactIds: new Set([...scope.factIds, ...routeSafetyGateFactIds(state, pathwayId)]), unresolvedFactIds: new Set(scope.unresolvedRules.flatMap(r => r.factIds)) };
  const resolve = (savedAnswers = {}, prefilledAnswers = {}) => packet.packetCollectionFor({ jurisdiction: state, pathwayId, requiredInputIds: plan.requiredInputIds, serverFacts: {}, screeningAnswers: {}, savedAnswers, prefilledAnswers });
  check(`${routeKey}: exact contract`, () => assert.ok(reviewedContactRepresentation(args)));
  if (routeKey === 'GA:restriction-and-sealing-of-a-pardoned-felony') {
    const originalContractSha256 = 'faeedb29aac46968a94ad0c7501e60f1b959fc65f167b8cf24d24f68ad5fe024';
    const originalProvenance = { version: 1, routeKey, contractSha256: originalContractSha256,
      inputSha256: contactRepresentationHash(Object.values(components)), outputSha256: contactRepresentationHash(aggregate) };
    check('GA successor retains original contact representation identity', () => assert.equal(reviewedContactRepresentation(args).contractSha256, originalContractSha256));
    check('GA successor recognizes original saved provenance without rewriting it', () => {
      const before = structuredClone(originalProvenance);
      assert.equal(isProvenContactOutput(reviewedContactRepresentation(args), aggregate, originalProvenance), true);
      assert.deepEqual(originalProvenance, before);
    });
    check('GA successor does not trust a changed saved aggregate', () => assert.equal(isProvenContactOutput(reviewedContactRepresentation(args), 'Independent earlier contact text', originalProvenance), false));
    check('GA successor rejects an unreviewed specification version', () => {
      const changed = structuredClone(args); changed.specification.specificationVersion = 'unreviewed';
      assert.equal(reviewedContactRepresentation(changed), null);
    });
    check('GA successor rejects a changed document condition', () => {
      const changed = structuredClone(args); changed.specification.documents[0].includeWhen = 'different_condition';
      assert.equal(reviewedContactRepresentation(changed), null);
    });
    // The adopted 2207c357a successor changed only text before the signature
    // block; any change to the contact-bearing lines themselves is refused.
    for (const [from, to] of [['MAILING ADDRESS: {{mailing_address}}', 'ADDRESS: {{mailing_address}}'], ['TELEPHONE: {{phone_number}}', 'TELEPHONE: {{email_address}}'], ['\n\nEMAIL: {{email_address}}', '']])
      check('GA adopted successor rejects a changed contact line ' + JSON.stringify(from), () => {
        const changed = structuredClone(args), section = changed.specification.documents[0].sections[6];
        assert.ok(section.body.includes(from)); section.body = section.body.replace(from, to);
        assert.equal(reviewedContactRepresentation(changed), null);
      });
  }
  check(`${routeKey}: pending without fourth prompt`, () => { const r = resolve(); assert.ok(r.pendingDerivations.some(f => f.factId === 'contact_information')); assert.ok(!r.prepayQuestions.includes('contact_information')); });
  check(`${routeKey}: complete components`, () => { const r = resolve(components); assert.equal(r.derivedFacts.contact_information, aggregate); assert.ok(!r.contactReconciliation); });
  check(`${routeKey}: exact legacy wrapper`, () => assert.equal(resolve({ ...components, contact_information: { value: aggregate, unknown: false } }).derivedFacts.contact_information, aggregate));
  check(`${routeKey}: differing raw preserved`, () => { const r = resolve({ ...components, contact_information: 'Earlier independent contact text' }); assert.deepEqual(r.contactReconciliation, { canUseComponents: true }); assert.equal(r.derivedFacts.contact_information, undefined); });
  for (const id of Object.keys(components)) for (const value of ['', null, { value: components[id], unknown: true }]) check(`${routeKey}: lost ${id}`, () => { const r = resolve({ ...components, [id]: value }, components); assert.equal(r.derivedFacts.contact_information, undefined); assert.ok(r.pendingDerivations.some(f => f.factId === 'contact_information')); });
  for (const [name, mutate] of [
    ['unreviewed route', a => { a.pathwayId = 'unreviewed'; }],
    ['wrong spec', a => { a.specification.specificationId += '-changed'; }],
    ['aggregate use', a => { a.specification.requiredFacts.push({ factId: 'contact_information', use: 'prosecutor email', ownership: 'participant' }); }],
    ['missing component declaration', a => { a.specification.requiredFacts = a.specification.requiredFacts.filter(f => f.factId !== 'phone_number'); }],
    ['duplicate component declaration', a => { a.specification.requiredFacts.push(structuredClone(a.specification.requiredFacts.find(f => f.factId === 'phone_number'))); }],
    ['external ownership', a => { a.specification.fieldOwnership.courtOwnedFields.push('phone_number'); }],
    ['different destination', a => { a.specification.requiredFacts.find(f => f.factId === 'mailing_address').use = 'prosecutor address'; }],
    ['new public question', a => { a.profile.questions.push({ id: 'contact_information', prompt: 'New public question' }); }],
    ['new document value', a => { a.specification.documents[0].sections.push({ kind: 'pleading_paragraph', heading: 'New aggregate', body: '{{contact_information}}' }); }],
    ['new document condition', a => { a.specification.documents[0].includeWhen = 'contact_information'; }],
    ['new decision/safety consumer', a => a.decidingFactIds.add('contact_information')],
    ['unresolved consumer', a => a.unresolvedFactIds.add('contact_information')],
    ['profile reference', a => { a.profile.unreviewedConsumer = 'contact_information'; }],
    ['missing effective component', a => { a.requiredInputIds = a.requiredInputIds.filter(id => id !== 'email_address'); }]
  ]) check(`${routeKey}: refuse ${name}`, () => { const next = structuredClone(args); mutate(next); assert.equal(reviewedContactRepresentation(next), null); });
}
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { MS_NONCONVICTION_SCREENING_ANSWERS: screening, MS_NONCONVICTION_ROUTE: route } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const at = '2026-10-11T12:00:00Z';
const authoritative = evaluateAuthoritativeScreeningResult({ jurisdiction: 'MS', profileVersion: route.profileVersion, matterId: 'synthetic-contact-contract', answers: screening });
const seed = (answers = {}) => { const s = packet.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: screening, packetAnswers: answers, dependencies: { commercialFlowVersion: 1, entitlementSource: 'consumer_payment', productId: 'expungement_packet' }, capturedAt: at }); assert.ok(s); return { status: 'unverified', reason: 'synthetic-contract-only', revision: 3, draftHash: s.hash, draftSnapshot: s.snapshot }; };
const patch = (record, answers, useContactComponents = false) => packet.packetInformationPatch({ existingItem: { id: 'synthetic-contact-contract', jurisdiction: 'MS', artifactRefs: {} }, answers, useContactComponents, protectedVerification: record });
let record = seed(components);
check('new seed derived in protected prefill, editable components', () => { const m = packet.protectedPacketInformationModelFor(record); assert.equal(m.initialAnswers.contact_information, aggregate); assert.equal(m.builderQuestions.some(q => q.id === 'contact_information'), false); for (const id of Object.keys(components)) assert.ok(packet.editablePacketInputIds(m).has(id)); assert.equal(packet.editablePacketInputIds(m).has('contact_information'), false); });
for (const id of Object.keys(components)) {
  const changed = patch(record, { [id]: `Changed ${id}` });
  check(`protected ${id} edit recomputes`, () => { assert.ok(changed); const next = changed.protectedTransition.nextVerification; assert.equal(next.revision, 4); const m = packet.protectedPacketInformationModelFor(next); assert.equal(m.initialAnswers.contact_information, Object.entries(components).map(([key, value]) => key === id ? `Changed ${id}` : value.trim()).join(' | ')); assert.notEqual(next.status, 'verified'); });
  const cleared = patch(changed.protectedTransition.nextVerification, { [id]: { value: 'untrusted old value', unknown: true } });
  check(`protected ${id} clear removes stale output`, () => { const m = packet.protectedPacketInformationModelFor(cleared.protectedTransition.nextVerification); assert.equal(m.initialAnswers.contact_information, undefined); assert.ok(m.pendingDerivations.some(f => f.factId === 'contact_information')); assert.ok(m.missingInputIds.includes(id)); });
}
const raw = 'Earlier independent contact answer\nRetain this verbatim';
record = seed({ ...components, contact_information: raw });
check('conflict remains and blocks readiness', () => { const m = packet.protectedPacketInformationModelFor(record); assert.equal(m.packetAnswers.contact_information, raw); assert.ok(m.missingInputIds.includes('contact_information')); assert.ok(m.contactReconciliation.canUseComponents); const saved = patch(record, {}); assert.equal(saved.protectedTransition.nextVerification.draftHash, record.draftHash); });
const adopted = patch(record, {}, true);
check('explicit adoption replaces through canonical revision and hash only metadata', () => { assert.ok(adopted); assert.equal(adopted.protectedTransition.expectedPriorRevision, 3); const m = packet.protectedPacketInformationModelFor(adopted.protectedTransition.nextVerification); assert.equal(m.initialAnswers.contact_information, aggregate); assert.equal(m.contactReconciliation, undefined); const p = adopted.protectedTransition.nextVerification.draftSnapshot.dependencies.contactRepresentation; assert.equal(p.replacedAnswerSha256, contactRepresentationHash(raw)); assert.equal(p.legacyAnswers[0].value, raw); assert.equal(p.legacyAnswers[0].source, 'packetAnswers'); assert.equal(p.legacyAnswers[0].meaning, 'independent_legacy_contact_information'); });
check('newer aggregate edit cannot trust stale provenance', () => { const legacy = structuredClone(adopted.protectedTransition.nextVerification); legacy.draftSnapshot.prefilledAnswers.contact_information = raw; legacy.draftHash = packet.protectedPacketDraftHash(legacy.draftSnapshot); const m = packet.protectedPacketInformationModelFor(legacy); assert.equal(m.initialAnswers.contact_information, raw); assert.ok(m.contactReconciliation); });
check('old-app component edit recomputes, never trusts stale output', () => { const legacy = structuredClone(adopted.protectedTransition.nextVerification); legacy.draftSnapshot.packetAnswers.phone_number = '202-555-0199'; legacy.draftHash = packet.protectedPacketDraftHash(legacy.draftSnapshot); const m = packet.protectedPacketInformationModelFor(legacy); assert.equal(m.initialAnswers.contact_information, aggregate.replace('202-555-0134', '202-555-0199')); assert.equal(m.reviewSafety.reason, 'stale_packet_derivation'); const repaired = patch(legacy, {}); assert.notEqual(repaired.protectedTransition.nextVerification.draftHash, legacy.draftHash); });
check('cannot adopt absent dependencies', () => assert.equal(patch(seed({ contact_information: raw }), {}, true), null));
check('client answer cannot supply trusted provenance or overwrite derived aggregate', () => { const r = seed(components); const bad = patch(r, { contactRepresentation: 'spoof', contact_information: 'spoof' }); assert.equal(bad.protectedTransition.nextVerification.draftHash, r.draftHash); });
console.log(`PASS: ${checks} scoped collection/guard/protected-model contact checks across ${Object.keys(contracts.routes).length} routes. Protected HTTP, CAS, browser and document acceptance are separate.`);
