// R7 / GA-16: exercise both real render entry points; authority/storage are synthetic boundaries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const file = new URL('../src/lib/expungement-ai/consumer-render-request.ts', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
if (process.argv.includes('--mutant')) {
  const anchor = 'petitioner_city: packetText(input.packetFields, "city")';
  assert.equal(source.split(anchor).length, 2);
  source = source.replace(anchor, 'petitioner_city: packetText(input.packetFields, "residency_or_location", "city")');
}
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
} }).outputText;

function application(fields, { missing = [], paid = true, verified = true } = {}) {
  const queued = [];
  const item = { id: '00000000-0000-4000-8000-000000000001' };
  const snapshot = { jurisdiction: 'GA', pathwayId: 'synthetic-route', resultCode: 'packet_ready',
    packetPlan: { packetReadyWhen: ['Synthetic review instruction'] }, screeningAnswers: {},
    prefilledAnswers: {}, packetAnswers: fields, serverFacts: {}, selectedTrackId: null };
  const model = { initialAnswers: fields, serverFacts: {}, missingInputIds: missing,
    stage: 'ready_to_generate', reviewedAt: '2026-10-21T00:00:00Z' };
  const deps = {
    'server-only': {},
    'node:crypto': require('node:crypto'),
    '@/lib/expungement-ai/consumer-identity': {
      CONSUMER_PERSON_NAMESPACE: 'synthetic-consumer', consumerMatterIdForItem: () => 'synthetic-matter',
      resolveConsumerPersonId: async () => ({ ok: true, personId: 'synthetic-person' })
    },
    '@/lib/expungement-ai/consumer-payment-authority': {
      CONSUMER_PACKET_PRODUCT_ID: 'synthetic-packet',
      consumerPacketPaymentAuthority: async () => ({ valid: paid, reason: 'synthetic-unpaid', providerEventId: 'synthetic-event' })
    },
    '@/lib/expungement-ai/consumer-packet-safety': { CONSUMER_PACKET_SAFETY_DISCLAIMER: 'Synthetic disclaimer' },
    '@/lib/expungement-ai/render-preflight': { renderPreflight: () => ({ ready: true }) },
    '@/lib/expungement-ai/briefcase': { getBriefcaseItem: async () => item, getBriefcaseItemForWebhook: async () => item },
    '@/lib/expungement-ai/packet-information': {
      protectedPacketInformationModelFor: () => model,
      requireCurrentPacketVerification: async () => {
        if (!verified) throw Error('synthetic-unverified');
        return { hash: 'a'.repeat(64), snapshot, revision: 1 };
      }
    },
    '@/lib/rcap/render/job-contract': {
      RenderContractError: class extends Error {},
      buildRenderJobSpec: input => ({ route: { jurisdiction: 'GA', pathwayId: snapshot.pathwayId },
        spec: { packetId: input.packetId, routeId: 'GA:synthetic-route', rendererKind: 'synthetic',
          rendererVersion: '1', sourceSha256: null, profileId: 'GA', profileVersion: 'synthetic', inputHash: 'b'.repeat(64) } })
    },
    '@/lib/rcap/render/job-queue': { enqueueVerifiedConsumerRender: async (spec, identity, payload) => {
      queued.push({ spec, identity, payload }); return { id: 'synthetic-job' };
    } },
    '@/lib/rcap/render/consumer-delivery-control': { resolveConsumerDeliveryAccess: () => ({ allowed: true }) },
    '@/lib/rcap/render/commercial-admission': {
      CommercialAdmissionDeniedError: class extends Error {}, commercialRouteIdentity: () => ({ packetFamilyId: 'synthetic' }),
      entitlementContext: value => value, finalVerificationSnapshotFrom: value => value,
      fulfillmentRequestContext: value => value, governProviderDispatch: () => {}
    }
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    assert(Object.hasOwn(deps, name), `unexpected dependency: ${name}`); return deps[name];
  }, mod, mod.exports);
  return { api: mod.exports, queued, model, snapshot };
}

const cases = [
  ['location only', { residency_or_location: 'PRIVATE LOCATION CONTEXT' }, null],
  ['wrapped location', { residency_or_location: { value: 'PRIVATE LOCATION CONTEXT' } }, null],
  ['array location', { residency_or_location: ['PRIVATE LOCATION CONTEXT'] }, null],
  ['city only', { city: ' Atlanta ' }, 'Atlanta'],
  ['city and conflicting context', { city: 'Atlanta', residency_or_location: 'PRIVATE LOCATION CONTEXT' }, 'Atlanta'],
  ['wrapped city', { city: { value: ' Atlanta ' }, residency_or_location: 'PRIVATE LOCATION CONTEXT' }, 'Atlanta'],
  ['empty city', { city: ' ', residency_or_location: 'PRIVATE LOCATION CONTEXT' }, null],
  ['unknown city', { city: { unknown: true }, residency_or_location: 'PRIVATE LOCATION CONTEXT' }, null],
  ['no city or context', {}, null]
];
let checks = 0;
const failures = [];
function check(label, fn) { checks++; try { fn(); } catch (error) { failures.push({ label, error: error.message }); } }
for (const entry of ['requestConsumerPacketRender', 'requestConsumerPacketRenderForWebhook']) {
  for (const [label, values, expected] of cases) {
    const fields = { participant_full_legal_name: 'Synthetic Participant', county: 'Synthetic County', ...values };
    const before = structuredClone(fields), app = application(fields);
    const result = await app.api[entry]({ authUserId: 'synthetic-owner', briefcaseItemId: '00000000-0000-4000-8000-000000000001' });
    check(`${entry}:${label}:queued`, () => assert.equal(result.status, 'queued'));
    assert.equal(app.queued.length, 1);
    const payload = app.queued[0].payload;
    check(`${entry}:${label}:city`, () => assert.equal(payload.renderPacket.petitioner_city, expected));
    check(`${entry}:${label}:saved-facts`, () => {
      assert.deepEqual(fields, before);
      assert.deepEqual(payload.renderInputPayload.packetFields, before);
      assert.deepEqual(payload.renderPacket.missing_fields, []);
      assert.equal(payload.renderPacket.petitioner_county, 'Synthetic County');
    });
  }
  for (const [label, options, status] of [
    ['missing city', { missing: ['city'] }, 'route_not_renderable'],
    ['unverified', { verified: false }, 'route_not_renderable'],
    ['unpaid', { paid: false }, 'payment_required']
  ]) {
    const app = application({ residency_or_location: 'PRIVATE LOCATION CONTEXT' }, options);
    const result = await app.api[entry]({ authUserId: 'synthetic-owner', briefcaseItemId: '00000000-0000-4000-8000-000000000001' });
    check(`${entry}:${label}:refused`, () => { assert.equal(result.status, status); assert.equal(app.queued.length, 0); });
  }
}
console.log(JSON.stringify({ checks, passed: checks - failures.length, failures, scope: 'Real request and atomic enqueue payload construction; synthetic authority/storage only; no database, payment or delivery.' }, null, 2));
process.exitCode = failures.length ? 1 : 0;
