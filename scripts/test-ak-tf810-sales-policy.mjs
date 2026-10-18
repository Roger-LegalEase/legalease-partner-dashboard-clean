// AK-TF810-SALES-POLICY (AK GA15/GA16 + AT-GA-52/GA-42).
// Test-scoped reader verdicts only: no canonical record, proof, session or entitlement.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const C = await import('../src/lib/expungement-ai/ak-courtview-contact.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const F = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const A = await import('../src/lib/rcap/fulfillment/grade-a-authority.ts');
const payment = await import('../src/lib/expungement-ai/payment-adapter.ts');
const commercial = await import('../src/lib/rcap/render/commercial-admission.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getCurrentFulfillmentRecord } = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const root = process.cwd(), route = C.AK_COURTVIEW_PATHWAY, id = C.AK_TF810_PUBLIC_ID;
const routeId = `AK:${route}`, owner = 'TEST-ak-sales-owner', item = { id: 'TEST-ak-sales-matter', paymentStatus: 'unpaid' };
const fixtures = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
const witness = fixtures.find(f => f.pathwayKey === routeId);
const seed = P.protectedPacketDraftSeedFromAuthoritative({
  authoritative: evaluate({ jurisdiction: 'AK', profileVersion: witness.profileVersion, matterId: item.id, answers: witness.answers }),
  screeningAnswers: witness.answers, dependencies: {}, capturedAt: '2026-10-18T00:00:00Z'
});
assert(seed);
assert.equal(seed.snapshot.pathwayId, route);
assert.equal(seed.snapshot.paymentAllowed, true, 'original payable-caution branch must be exercised');
const no = "Because this case no longer appears on CourtView's public index, TF-810 is not needed for it. No payment is taken for this request.";
const unsure = "Check CourtView, the Alaska court system's public case search, for this case first. If it still appears there, come back and answer Yes. No payment is taken until you confirm that.";
const noEs = 'Como este caso ya no aparece en el índice público de CourtView, no se necesita el formulario TF-810 para este caso. No se cobra por esta solicitud.';
const unsureEs = 'Primero busque este caso en CourtView, la búsqueda pública de casos del sistema judicial de Alaska. Si todavía aparece, vuelva y responda Sí. No se cobra hasta que lo confirme.';
const conflict = 'Your saved answers to this question do not match each other, so no payment is taken. Your answers have not been changed.';
const conflictEs = 'Sus respuestas guardadas para esta pregunta no coinciden entre sí, así que no se cobra. Sus respuestas no se han cambiado.';
const maps = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'];
const snapshotFor = (raw, map = 'packetAnswers') => {
  const snapshot = structuredClone(seed.snapshot);
  for (const key of maps) delete snapshot[key][id];
  if (raw !== undefined) snapshot[map][id] = raw;
  return snapshot;
};
const cases = [
  ['yes', 'Yes', true], ['known-yes', { value: 'Yes', unknown: false }, true],
  ['no', 'No', false, true], ['known-no', { value: 'No', unknown: false }, false, true],
  ['unsure', 'I am not sure'], ['not-sure', 'Not sure'], ['spanish-unsure', 'No estoy seguro'], ['missing', undefined], ['blank', ''],
  ['unknown-yes', { value: 'Yes', unknown: true }], ['unknown-no', { value: 'No', unknown: true }],
  ['missing-unknown-flag', { value: 'Yes' }], ['extra-property', { value: 'Yes', unknown: false, injected: true }],
  ['array', ['Yes']], ['nested', { value: { value: 'Yes', unknown: false }, unknown: false }],
  ['null', null], ['boolean', true], ['number', 1], ['padded-yes', ' Yes '], ['lowercase-yes', 'yes']
].flatMap(([name, raw, allowed = false, notNeeded = false]) => maps.map(map => ({
  name: `${name}/${map}`, snapshot: snapshotFor(raw, map), allowed,
  reason: notNeeded ? 'ak_tf810_request_not_needed' : 'ak_tf810_public_status_unconfirmed',
  guidance: notNeeded ? no : unsure, es: notNeeded ? noEs : unsureEs
})));
for (const [name, copies, allowed] of [
  ['agreeing', ['Yes', { value: 'Yes', unknown: false }, 'Yes'], true],
  ['conflicting-no', ['Yes', 'No', 'Yes'], false],
  ['conflicting-unknown', ['Yes', { value: 'Yes', unknown: true }, 'Yes'], false],
  ['conflicting-null', ['Yes', null, 'Yes'], false]
]) {
  const snapshot = snapshotFor(undefined);
  maps.forEach((map, i) => { snapshot[map][id] = copies[i]; });
  // Disagreeing copies keep the same refusal code but explain the disagreement itself.
  cases.push({ name, snapshot, allowed, reason: 'ak_tf810_public_status_unconfirmed', guidance: conflict, es: conflictEs });
}
let checks = 0;
const check = async (name, fn) => { try { await fn(); checks++; } catch (e) { e.message = `${name}: ${e.message}`; throw e; } };
const price = (adapter, snapshot) => adapter.createConsumerPaymentPlaceholder({ ...snapshot, state: snapshot.jurisdiction }, snapshot.pathwayId);
const noPrice = p => { assert.equal(p.enabled, false); assert.equal(p.amountCents, undefined); assert(!p.label.includes('$50')); };
const genericRefusal = p => { noPrice(p); assert.equal(p.label, 'No payment available for this result'); };
for (const c of cases) await check(`guidance/raw/${c.name}`, () => {
  const before = structuredClone(c.snapshot), policy = C.akCourtviewSalesPolicy('AK', route, c.snapshot);
  assert.equal(policy.allowed, c.allowed);
  if (!c.allowed) {
    assert.equal(policy.reason, c.reason); assert.equal(policy.guidance.en, c.guidance);
    assert.equal(policy.guidance.es, c.es); assert.equal(policy.qualifiedSpanishReview, 'pending');
  }
  assert.deepEqual(c.snapshot, before);
});
for (const [raw, en, es] of [['No', no, noEs], ['I am not sure', unsure, unsureEs], ['No estoy seguro', unsure, unsureEs], [undefined, unsure, unsureEs]]) {
  await check(`participant question/${raw}`, () => {
    const q = C.akCourtviewContactQuestions('AK', route, raw === undefined ? {} : { [id]: raw }).find(q => q.id === id);
    assert(q.helperText.endsWith(en)); assert(q.translations.es.helperText.endsWith(es));
    assert(q.helperText.includes('does not establish a legal ground'));
  });
}
await check('policy is route-specific', () => {
  for (const [state, pathway] of [['VA', route], ['AK', 'different-route'], ['AK', null]]) {
    assert.equal(C.akCourtviewSalesPolicy(state, pathway, snapshotFor('No')), null);
  }
});
assert.equal(getCurrentFulfillmentRecord(routeId), null);
const missing = F.packetFulfillmentAuthority('AK', route, 'participant delivery', { trackId: seed.snapshot.selectedTrackId });
assert.equal(missing.allowed, false); assert(missing.reason.includes(': NO_RECORD.'));
for (const c of cases) await check(`actual NO_RECORD/${c.name}`, () => {
  const before = structuredClone(c.snapshot);
  assert.throws(() => payment.assertCheckoutAllowed(c.snapshot), e => e instanceof F.PacketFulfillmentNotProvenError && e.detail === missing.reason);
  genericRefusal(price(payment, c.snapshot)); assert.deepEqual(c.snapshot, before);
});

// Same imported-reader seam as the historical caution test. The successful
// verdict is scoped to the exact route + track + surfaces, never persisted.
let mode = 'valid', verificationFailure = false, preflightReady = true, sponsored = false, routeSellable = true;
let admissionRefusal = null;
let currentSnapshot = snapshotFor('Yes'), preflightCalls = 0, authorityReads = 0;
const invalid = A.evaluateFulfillmentAuthority({ schemaVersion: 'TEST_INVALID_SCHEMA', routeId }, null, routeId);
assert.equal(invalid.authorized, false);
const invalidReason = `${routeId}: ${invalid.state}. ${invalid.reason}`;
const scopedRead = (state, pathway, surface, binding) => {
  assert.equal(state, 'AK'); assert.equal(pathway, route);
  assert.equal(binding?.trackId, seed.snapshot.selectedTrackId);
  assert(['participant delivery', 'checkout creation', 'consumer payment authority'].includes(surface));
  authorityReads++;
  if (mode === 'missing') return F.assertPacketFulfillmentProven(state, pathway, surface, binding);
  if (mode === 'invalid') throw new F.PacketFulfillmentNotProvenError(routeId, ['canonical authority'], surface, invalidReason);
};
const stub = code => 'data:text/javascript,' + encodeURIComponent(code);
const fileUrl = file => pathToFileURL(path.join(root, file)).href;
const hooks = {
  assertPacketFulfillmentProven: scopedRead,
  isOperationallySellable: key => { assert.equal(key, routeId); return mode === 'valid' && routeSellable; },
  requireCurrentPacketVerification: async (user, candidate) => {
    assert.equal(candidate.id, item.id);
    if (verificationFailure || user !== owner) throw new Error('TEST protected verification refused');
    return { snapshot: currentSnapshot, hash: seed.hash };
  },
  governCommercialAdmission: (point, identity, context) => {
    assert.equal(point, 'consumer_checkout'); assert.equal(identity.routeId, routeId);
    assert.equal(context.participantUserId, owner); assert.equal(context.matterOwnerUserId, owner);
    assert.equal(mode, 'valid');
    if (admissionRefusal) throw admissionRefusal;
  },
  readyToPurchase: input => {
    assert.deepEqual(input.snapshot, currentSnapshot); preflightCalls++;
    return preflightReady ? { ready: true } : { ready: false, reason: 'TEST_required_case_number_missing', missingFactIds: ['ak_tf810_case_number'] };
  },
  isPartnerSponsoredPacketItem: async () => sponsored
};
globalThis.__akSalesReaders = hooks;
const mockModule = (file, names) => stub(`export * from ${JSON.stringify(fileUrl(file))};\n` + names.map(name => `export const ${name}=(...args)=>globalThis.__akSalesReaders.${name}(...args);`).join('\n'));
const replacements = [
  ['@/lib/expungement-ai/packet-fulfillment-authority', 'src/lib/expungement-ai/packet-fulfillment-authority.ts', ['assertPacketFulfillmentProven']],
  ['@/lib/rcap/render/commercial-admission', 'src/lib/rcap/render/commercial-admission.ts', ['isOperationallySellable', 'governCommercialAdmission']],
  ['@/lib/expungement-ai/packet-information', 'src/lib/expungement-ai/packet-information.ts', ['requireCurrentPacketVerification']],
  ['@/lib/expungement-ai/render-preflight', 'src/lib/expungement-ai/render-preflight.ts', ['readyToPurchase']],
  ['@/lib/expungement-ai/briefcase', 'src/lib/expungement-ai/briefcase.ts', ['isPartnerSponsoredPacketItem']]
];
const loadSource = async (file, source, suffix) => {
  const url = fileUrl(file) + `?TEST-${suffix}`;
  register(stub('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), {
    data: { url, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText }
  });
  return import(url);
};
const paymentFile = 'src/lib/expungement-ai/payment-adapter.ts';
let source = fs.readFileSync(paymentFile, 'utf8');
for (const [specifier, file, names] of replacements) {
  const target = `from "${specifier}";`; assert(source.includes(target));
  source = source.replace(target, `from ${JSON.stringify(mockModule(file, names))};`);
}
const mutation = process.argv.find(a => a.startsWith('--mutation='))?.split('=')[1];
if (mutation === 'checkout') source = source.replace('if (salesPolicy?.allowed === false)', 'if (false)');
if (mutation === 'price') source = source.replace('salesPolicy?.allowed !== false && ', '');
if (mutation === 'precedence') {
  const gate = source.match(/  const salesPolicy = akCourtviewSalesPolicy\(verifiedSnapshot[\s\S]*?\n  }\n/)[0];
  source = source.replace(gate, '').replace('  const checkoutMatterId =', gate + '  const checkoutMatterId =');
}
if (mutation === 'label') source = source.replace('otherwiseEnabled && salesPolicy?.allowed === false', 'salesPolicy?.allowed === false');
const hypothetical = await loadSource(paymentFile, source, 'scoped-readers');
for (mode of ['valid', 'missing', 'invalid']) for (const c of cases) await check(`${mode}/${c.name}`, async () => {
  const before = structuredClone(c.snapshot);
  currentSnapshot = c.snapshot;
  if (mode !== 'valid') {
    const expectedReason = mode === 'missing' ? missing.reason : invalidReason;
    await assert.rejects(hypothetical.requireConsumerPacketPurchaseReadiness(owner, item), e => e instanceof F.PacketFulfillmentNotProvenError && e.detail === expectedReason);
    genericRefusal(price(hypothetical, c.snapshot));
  } else if (c.allowed) {
    assert.equal((await hypothetical.requireConsumerPacketPurchaseReadiness(owner, item)).purchaseReadiness.ready, true);
    assert.deepEqual(price(hypothetical, c.snapshot), { enabled: true, amountCents: 5000, label: '$50 one-time self-help packet payment' });
  } else {
    await assert.rejects(hypothetical.requireConsumerPacketPurchaseReadiness(owner, item), e => e instanceof hypothetical.ConsumerCheckoutNotAllowedError && e.resultCode === c.reason && e.message === c.guidance && e.participantMessage === c.guidance);
    const p = price(hypothetical, c.snapshot); noPrice(p); assert.equal(p.label, c.guidance);
  }
  assert.deepEqual(c.snapshot, before);
});
mode = 'valid'; currentSnapshot = snapshotFor('Yes');
await check('Yes never overrides eligibility', async () => {
  currentSnapshot = { ...snapshotFor('Yes'), paymentAllowed: false };
  await assert.rejects(hypothetical.requireConsumerPacketPurchaseReadiness(owner, item), e => e.resultCode === currentSnapshot.resultCode);
  genericRefusal(price(hypothetical, currentSnapshot));
  currentSnapshot = snapshotFor('Yes');
});
await check('Yes still requires protected verification and owner', async () => {
  const before = preflightCalls;
  verificationFailure = true;
  await assert.rejects(hypothetical.requireConsumerPacketPurchaseReadiness(owner, item), { name: 'ConsumerCheckoutReviewRequiredError' });
  verificationFailure = false;
  await assert.rejects(hypothetical.requireConsumerPacketPurchaseReadiness('TEST-other-owner', item), { name: 'ConsumerCheckoutReviewRequiredError' });
  assert.equal(preflightCalls, before);
});
for (const raw of ['Yes', 'No', 'Not sure', 'No estoy seguro', undefined]) {
  currentSnapshot = snapshotFor(raw);
  await check(`admission refusal precedes AK policy/${raw}`, async () => {
    const before = preflightCalls;
    admissionRefusal = new commercial.CommercialAdmissionDeniedError(A.admitCommercialAction({
      admissionPoint: 'consumer_checkout', request: commercial.commercialRouteIdentity({ jurisdiction: 'AK', pathwayId: route }), record: null, observation: null
    }));
    assert.equal(admissionRefusal.denialCode, 'fulfillment_no_record');
    await assert.rejects(hypothetical.requireConsumerPacketPurchaseReadiness(owner, item), e => e === admissionRefusal);
    assert.equal(preflightCalls, before);
    admissionRefusal = null;
  });
  await check(`readiness refusal precedes AK policy/${raw}`, async () => {
    const before = preflightCalls;
    preflightReady = false;
    await assert.rejects(hypothetical.requireConsumerPacketPurchaseReadiness(owner, item), e => e.name === 'ConsumerCheckoutRenderPreflightError'
      && e.reason === 'TEST_required_case_number_missing' && e.missingFactIds.length === 1 && e.missingFactIds[0] === 'ak_tf810_case_number');
    assert.equal(preflightCalls, before + 1);
    preflightReady = true;
  });
  await check(`placeholder keeps existing refusal label/${raw}`, () => {
    genericRefusal(price(hypothetical, { ...currentSnapshot, paymentAllowed: false }));
    routeSellable = false;
    genericRefusal(price(hypothetical, currentSnapshot));
    routeSellable = true;
  });
}
await check('AK policy follows successful preflight', async () => {
  currentSnapshot = snapshotFor('No'); const before = preflightCalls;
  await assert.rejects(hypothetical.requireConsumerPacketPurchaseReadiness(owner, item), e => e.resultCode === 'ak_tf810_request_not_needed');
  assert.equal(preflightCalls, before + 1);
  currentSnapshot = snapshotFor('Yes');
  assert.equal((await hypothetical.requireConsumerPacketPurchaseReadiness(owner, item)).purchaseReadiness.ready, true);
});
await check('sponsored policy unchanged, no new checkout', async () => {
  sponsored = true;
  assert.equal(await hypothetical.consumerPacketPurchaseAllowedNow(owner, item), false);
  await assert.rejects(hypothetical.createConsumerPacketCheckout({ userId: owner, item }), e => e.resultCode === 'partner_sponsored' && e.participantMessage === undefined);
  sponsored = false;
});

// VA remains undeliverable even with its own narrowly scoped successful reader.
const vaRoute = 'regime-1-expungement-available-now', vaProfile = getProfileByJurisdiction('VA');
const vaWitness = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(f => f.jurisdiction === 'VA' && f.pathwayId === vaRoute);
const vaAnswers = { ...vaWitness.finalAnswers, case_outcome: 'Pardoned conviction', pardon_status: 'Yes' };
for (const raw of ['Yes', 'No', 'I am not sure', undefined, { value: 'Yes', unknown: true }]) await check(`VA still undeliverable/${JSON.stringify(raw)}`, () => {
  const va = P.protectedPacketDraftSeedFromAuthoritative({ authoritative: evaluate({ jurisdiction: 'VA', profileVersion: vaProfile.profileVersion, matterId: 'TEST-va', answers: vaAnswers }), screeningAnswers: vaAnswers, packetAnswers: raw === undefined ? {} : { pardonType: raw }, dependencies: {}, capturedAt: '2026-10-18T00:00:00Z' }).snapshot;
  assert.equal(getCurrentFulfillmentRecord(`VA:${vaRoute}`), null);
  assert.throws(() => payment.assertCheckoutAllowed(va), e => e instanceof F.PacketFulfillmentNotProvenError && e.detail.includes(': NO_RECORD.'));
  noPrice(price(payment, va));
  hooks.assertPacketFulfillmentProven = (state, pathway, surface, binding) => { assert.equal(state, 'VA'); assert.equal(pathway, vaRoute); assert.equal(binding.trackId, va.selectedTrackId); };
  hooks.isOperationallySellable = key => { assert.equal(key, `VA:${vaRoute}`); return true; };
  assert.throws(() => hypothetical.assertCheckoutAllowed(va), { name: 'ConsumerPacketNotDeliverableError' });
  noPrice(price(hypothetical, va));
});
hooks.assertPacketFulfillmentProven = scopedRead;
hooks.isOperationallySellable = key => { assert.equal(key, routeId); return mode === 'valid'; };

// Run the actual HTTP catch path, with only auth/storage/checkout transport replaced.
const apiFile = 'src/app/api/expungement-ai/checkout/route.ts';
let apiSource = fs.readFileSync(apiFile, 'utf8'), thrown;
globalThis.__akSalesHttp = { requireConsumerBriefcaseSession: async () => ({ userId: owner }), getBriefcaseItem: async () => item,
  isPartnerSponsoredPacketItem: async () => false, createConsumerPacketCheckout: async () => { throw thrown; } };
for (const [specifier, file, names] of [
  ['@/lib/expungement-ai/auth', 'src/lib/expungement-ai/auth.ts', ['requireConsumerBriefcaseSession']],
  ['@/lib/expungement-ai/briefcase', 'src/lib/expungement-ai/briefcase.ts', ['getBriefcaseItem', 'isPartnerSponsoredPacketItem']],
  ['@/lib/expungement-ai/payment-adapter', paymentFile, ['createConsumerPacketCheckout']]
]) {
  const target = `from "${specifier}";`; assert(apiSource.includes(target));
  const mockUrl = stub(`export * from ${JSON.stringify(fileUrl(file))};\n` + names.map(name => `export const ${name}=(...args)=>globalThis.__akSalesHttp.${name}(...args);`).join('\n'));
  apiSource = apiSource.replace(target, `from ${JSON.stringify(mockUrl)};`);
}
const api = await loadSource(apiFile, apiSource, 'http');
for (const [code, message] of [['ak_tf810_request_not_needed', no], ['ak_tf810_public_status_unconfirmed', unsure], ['partner_sponsored', undefined]]) await check(`HTTP refusal/${code}`, async () => {
  thrown = new payment.ConsumerCheckoutNotAllowedError(code, message);
  const response = await api.POST(new Request('http://localhost/api/expungement-ai/checkout', { method: 'POST', body: JSON.stringify({ briefcaseItemId: item.id }) }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), message ? { error: message, resultCode: code } : { error: 'Payment isn’t available for this case. Your information is still saved. Return to your Briefcase to review the next step.' });
});
console.log(JSON.stringify({ status: 'PASS', checks, branches: cases.length, authorityReads, liveCalls: 0, registryWrites: 0, checkoutSessionsCreated: 0,
  qualifiedSpanishReview: 'pending', limit: 'Valid authority/verification/readiness are process-only scoped reader verdicts; no claim of actual canonical proof, readiness or charge.' }));
