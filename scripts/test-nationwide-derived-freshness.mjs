import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const packet = await import('../src/lib/expungement-ai/packet-information.ts');
const { assertLeafPacketDerivationGraph } = await import('../src/lib/expungement-ai/packet-collection.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { MS_NONCONVICTION_SCREENING_ANSWERS: screening, MS_NONCONVICTION_ROUTE: route } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const authoritative = evaluateAuthoritativeScreeningResult({ jurisdiction: 'MS', profileVersion: route.profileVersion, matterId: 'synthetic-derived-freshness', answers: screening });
const at = '2026-10-11T12:00:00Z';
const source = { court: 'Synthetic Circuit Court', county: 'Synthetic County' };
const seed = (answers = source) => { const s = packet.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: screening, packetAnswers: answers, dependencies: { commercialFlowVersion: 1, entitlementSource: 'consumer_payment', productId: 'expungement_packet' }, capturedAt: at }); assert.ok(s); return { status: 'unverified', reason: 'synthetic-contract-only', revision: 3, draftHash: s.hash, draftSnapshot: s.snapshot }; };
const patch = (record, answers) => { const p = packet.packetInformationPatch({ existingItem: { id: 'synthetic-derived-freshness', jurisdiction: 'MS', artifactRefs: {} }, answers, protectedVerification: record }); assert.ok(p); return p.protectedTransition.nextVerification; };
const model = r => { const m = packet.protectedPacketInformationModelFor(r); assert.ok(m); return m; };
let checks = 0;
const check = (name, fn) => { try { fn(); checks++; } catch (e) { e.message = name + ': ' + e.message; throw e; } };
check('leaf derivation graph accepted', () => assert.doesNotThrow(() => assertLeafPacketDerivationGraph({a:{from:['x','y']},b:{from:['y']}})));
for (const graph of [{a:{from:['a']}},{a:{from:['b']},b:{from:['a']}},{a:{from:['b']},b:{from:['x']}}]) check('unsupported cycle/chain fails with explicit contract error',()=>assert.throws(()=>assertLeafPacketDerivationGraph(graph),/packet_derivation_contract_requires_review/));
const before = seed();
const expected = { court_type: 'Circuit Court', court_name: source.court, filing_location: source.county };
for (const [id, value] of Object.entries(expected)) check(`seed ${id}`, () => { assert.equal(model(before).initialAnswers[id], value); assert.equal(before.draftSnapshot.dependencies.packetDerivations[id].version, 1); });
const next = patch(before, { court: 'Synthetic Municipal Court', county: 'Changed Synthetic County' });
for (const [id, value] of Object.entries({court_type:'Municipal Court', court_name:'Synthetic Municipal Court', filing_location:'Changed Synthetic County'})) check(`source edit refreshes ${id}`, () => assert.equal(model(next).initialAnswers[id], value));
check('single canonical revision, unverified', () => { assert.equal(next.revision, 4); assert.equal(next.status, 'unverified'); });
check('canonical no-op preserves snapshot/hash/revision', () => { const n = patch(next, {}); assert.deepEqual(n, next); });
for (const [sourceId, targetIds] of [['court',['court_type','court_name']], ['county',['filing_location']]]) {
  for (const value of ['', null, { value: source[sourceId], unknown: true }, 'Not sure']) {
    const r = patch(before, { [sourceId]: value });
    for (const id of targetIds) check(`lost ${sourceId}/${JSON.stringify(value)} invalidates ${id}`, () => { const m=model(r); assert.equal(m.initialAnswers[id], undefined); assert.ok(m.pendingDerivations.some(f => f.factId === id)); assert.equal(m.stage, 'in_progress'); });
    const restored=patch(r, {[sourceId]:source[sourceId]});
    for (const id of targetIds) check(`restored ${sourceId} restores ${id}`, () => assert.equal(model(restored).initialAnswers[id], expected[id]));
  }
}
for (const id of Object.keys(expected)) {
  const legacy = structuredClone(before);
  delete legacy.draftSnapshot.dependencies.packetDerivations;
  legacy.draftSnapshot.prefilledAnswers[id] = { value: expected[id], unknown: false };
  legacy.draftHash = packet.protectedPacketDraftHash(legacy.draftSnapshot);
  check(`exact legacy ${id} read/save stays raw`, () => assert.deepEqual(patch(legacy, {}), legacy));
  const r = patch(legacy, {court:'Synthetic Municipal Court',county:'Changed Synthetic County'});
  check(`legacy ${id} recomputed with exact raw retention`, () => { const p=r.draftSnapshot.dependencies.packetDerivations[id]; assert.deepEqual(p.legacyValues.find(v=>v.source==='prefilledAnswers').value,{value:expected[id],unknown:false}); assert.notEqual(model(r).initialAnswers[id],expected[id]); });
  const independent=structuredClone(before);
  independent.draftSnapshot.prefilledAnswers[id]='Independent prior answer';
  independent.draftHash=packet.protectedPacketDraftHash(independent.draftSnapshot);
  check(`changed independent ${id} defeats provenance`, () => assert.equal(model(patch(independent,{court:'Synthetic Municipal Court',county:'Changed Synthetic County'})).initialAnswers[id],'Independent prior answer'));
  const oldApp=structuredClone(before);
  oldApp.draftSnapshot.packetAnswers.court='Synthetic Municipal Court';
  oldApp.draftSnapshot.packetAnswers.county='Changed Synthetic County';
  oldApp.draftHash=packet.protectedPacketDraftHash(oldApp.draftSnapshot);
  check(`old-app stale ${id} is unsafe and repaired`, () => { const m=model(oldApp); assert.equal(m.reviewSafety.reason,'stale_packet_derivation'); assert.notEqual(m.initialAnswers[id],expected[id]); const r=patch(oldApp,{}); assert.equal(r.revision,4); assert.notEqual(r.draftHash,oldApp.draftHash); });
  for (const mutate of [p=>p.routeKey='CA:unreviewed',p=>p.inputFactIds=['unrelated'],p=>p.outputSha256='0'.repeat(64),p=>p.version=2]) {
    const wrong=structuredClone(oldApp); mutate(wrong.draftSnapshot.dependencies.packetDerivations[id]); wrong.draftHash=packet.protectedPacketDraftHash(wrong.draftSnapshot);
    check(`mismatched ${id} provenance cannot overwrite`,()=>assert.equal(model(wrong).initialAnswers[id],expected[id]));
  }
}
check('unparseable court invalidates former court type without invention',()=>{ const r=patch(before,{court:'Synthetic tribunal'}); const m=model(r); assert.equal(m.initialAnswers.court_type,undefined); assert.ok(m.pendingDerivations.some(f=>f.factId==='court_type')); });
console.log(`PASS: ${checks} protected derivation freshness, legacy, invalid-source and provenance checks. Pure synthetic models; no DB or runtime claim.`);
