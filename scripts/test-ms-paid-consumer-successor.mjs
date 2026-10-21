#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { loadMsPaidConsumerSuccessor, MS_PAID_SUCCESSOR_DECISION_PATH: decisionPath, MS_PAID_SUCCESSOR_ROUTE: route } = await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const root = process.cwd();
const approved = JSON.parse(fs.readFileSync(decisionPath));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-paid-scope-'));
let passed = 0;
function check(label, run) { run(); passed++; console.log(`PASS ${label}`); }
function writeDecision(decision) { fs.writeFileSync(path.join(scratch, decisionPath), JSON.stringify(decision)); }
try {
  for (const rel of [decisionPath, ...approved.preservedEvidence.map(e => e.path)]) {
    fs.mkdirSync(path.dirname(path.join(scratch, rel)), { recursive: true });
    fs.copyFileSync(path.join(root, rel), path.join(scratch, rel));
  }
  check('new exact approval loads without granting technical acceptance', () => {
    const a = loadMsPaidConsumerSuccessor(scratch);
    assert.equal(a.routeId, route); assert.equal(a.trackId, 'ms-nonconv');
    assert.equal(a.decisionSha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(scratch,decisionPath))).digest('hex'));
  });
  const mutations = {
    'other route': d => d.routeId += '-other', 'other track': d => d.trackId = 'ms-misd-addl',
    'other family': d => d.packetSetId = 'ms-misd-addl-set', 'wrong price': d => d.priceCents = 100,
    'no paid approval': d => d.consumerPaidAuthorized = false,
    'invented prior approval': d => d.priorPaidApprovalInvented = true,
    'security waiver': d => d.paymentSecurityWaived = true,
    'technical waiver': d => d.technicalAcceptanceWaived = true,
    'production scope': d => d.productionAuthorized = true,
    'changed eligibility': d => d.eligibilityChanged = true,
    'changed packet': d => d.packetContentsChanged = true,
    'retirement removed': d => d.legacyRetirementPreserved = false,
    'historical approval overwritten': d => d.historicalSponsoredPreviewApprovalPreserved = false,
    'missing source binding': d => d.preservedEvidence.pop(),
    'duplicate source binding': d => d.preservedEvidence[1] = d.preservedEvidence[0],
    'changed source digest': d => d.preservedEvidence[0].sha256 = '0'.repeat(64)
  };
  for (const [label, mutate] of Object.entries(mutations)) {
    const d = structuredClone(approved); mutate(d); writeDecision(d);
    check(`refuses ${label}`, () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  }
  writeDecision(approved);
  const evidencePath = path.join(scratch, approved.preservedEvidence[0].path);
  fs.appendFileSync(evidencePath, '\n');
  check('refuses changed packet specification bytes', () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  fs.unlinkSync(path.join(scratch, decisionPath));
  check('missing approval fails closed', () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  check('historical sponsored approval remains unpaid', () => {
    const prior = JSON.parse(fs.readFileSync('data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json'));
    assert.equal(prior.participantDeliveryReview.consumerPaidAuthorized, false);
    assert.equal(prior.outputLegalApproval.consumerPaidAuthorized, false);
  });
} finally { fs.rmSync(scratch, {recursive:true, force:true}); }
const { resolvePacketRoute } = await import('../src/lib/rcap/documents/packet-route-resolver.ts');
check('exact successor resolves through factory and stays technically held', () => {
  const result = resolvePacketRoute({state:'MS', pathway:route.slice(3)});
  assert.equal(result.routeKind, 'factory_v2');
  assert.equal(result.sellable, false);
});
check('unmigrated Mississippi route remains retired', () => {
  const result = resolvePacketRoute({state:'MS', pathway:'felony-expungement-under-99-19-71'});
  assert.equal(result.routeKind, 'legacy_retired');
});
// Publication binding is a server admission fact, never owner scope. The
// provider digest may appear on the active record only when the committed
// publication evidence names a source whose worker inputs are equivalent to the
// current tree, and the admission resolver re-derives that from the evidence
// bytes on every read. These controls prove that contract in both directions
// instead of asserting a constant.
const { createWorkerInputPlan } = await import('./rcap-hosted-acceptance-worker-input-plan.mjs');
const admission = await import('../src/lib/rcap/fulfillment/grade-a-admission.ts');
const registryModule = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const { execFileSync } = await import('node:child_process');
const REGISTRY = 'data/rcap-grade-a/fulfillment-authority-registry.json';
const SNAPSHOT = 'data/rcap-grade-a/fulfillment-observation-snapshot.json';
const EVIDENCE = 'data/rcap-render/worker-publication-evidence.json';
const publication = JSON.parse(fs.readFileSync(EVIDENCE));
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const currentPlan = createWorkerInputPlan({ rootDir: root, acceptedSourceSha: publication.sourceSha, acceptedDigest: publication.immutableRegistryDigest, candidateSha: headSha });
const publicationCurrent = publication.workflowConclusion === 'success' && currentPlan.rebuildRequired === false;
function resetAuthorityCaches() { registryModule.resetFulfillmentRegistryCache(); admission.resetObservationCache(); }
check('new active record binds owner scope and does not invent missing technical proof', () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY));
  const current = registry.records.filter(r => r.routeId === route && !r.supersededBy);
  assert.equal(current.length, 1);
  assert.equal(current[0].recordId, 'grade-a-ms-nonconv-paid-consumer-successor-20260914');
  assert.equal(current[0].evidenceBindings.paidConsumerSuccessor.decisionSha256, loadMsPaidConsumerSuccessor().decisionSha256);
  assert.equal(current[0].finalVerification.state, 'bound');
  assert.equal(current[0].evidenceBindings.exactPaidPacketProof.currentInputsVerified, true);
  assert.equal(current[0].revocation.revoked, false);
  const binding = current[0].evidenceBindings.providerPublication;
  assert.equal(binding.publishedSourceSha, publication.sourceSha, 'the record names the committed publication source, not an owner-typed one');
  if (publicationCurrent) {
    // A valid, current publication is recognized: the digest on the record is the
    // registry digest the evidence carries, and the resolver admits the observation.
    assert.match(publication.immutableRegistryDigest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(current[0].provider.imageDigest, publication.immutableRegistryDigest, 'the record carries exactly the published registry digest');
    assert.equal(binding.state, 'published_input_equivalent');
    assert.equal(binding.currentInputsEquivalent, true);
    resetAuthorityCaches();
    const observation = admission.resolveObservation(route);
    assert.ok(observation, 'a current publication yields an admitted observation');
    assert.equal(observation.provider.imageDigest, publication.immutableRegistryDigest);
    assert.equal(observation.externalPublication.sourceSha, publication.sourceSha);
    const decision = admission.fulfillmentAuthorityFor(route);
    assert.equal(decision.missingProof.includes('provider'), false, 'provider proof is satisfied by the current publication');
    assert.equal(decision.stalenessReasons.length, 0);
  } else {
    // Worker inputs drifted since the publication (or it did not succeed): the
    // record must not carry a digest and admission must stay closed.
    assert.equal(current[0].provider.imageDigest, '', 'stale or missing publication cannot appear as a current digest');
    assert.equal(binding.state, 'missing_current_publication');
    resetAuthorityCaches();
    assert.equal(admission.resolveObservation(route), null);
    assert.equal(admission.fulfillmentAuthorityFor(route).commercialStatus, 'not_commercially_eligible');
  }
});
check('worker-input equivalence is derived from git trees, and drifted inputs require a rebuild', () => {
  assert.equal(currentPlan.aggregateInputSha256.startsWith('sha256:'), true);
  const superseded = publication.supersededChain.at(-1);
  assert.match(superseded.sourceSha, /^[0-9a-f]{40}$/);
  const drifted = createWorkerInputPlan({ rootDir: root, acceptedSourceSha: publication.sourceSha, acceptedDigest: publication.immutableRegistryDigest, candidateSha: superseded.sourceSha });
  assert.equal(drifted.rebuildRequired, true, 'a tree whose worker inputs differ from the published source cannot reuse the digest');
  assert.equal(drifted.image.digest, 'pending');
});
// Every refusal below runs the real resolver over a scratch copy of the
// authority files. Unmutated files are copied byte for byte, because the
// resolver hashes the evidence bytes; a case that changes a specific evidence
// field re-records that hash on the observation so the refusal is attributable
// to the field, not to the serialization.
function withScratchAuthority(label, mutate, expectAdmitted = false) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-publication-binding-'));
  try {
    const raw = Object.fromEntries([REGISTRY, SNAPSHOT, EVIDENCE].map(f => [f, fs.readFileSync(f)]));
    const c = { route, registry: JSON.parse(raw[REGISTRY]), snapshot: JSON.parse(raw[SNAPSHOT]), evidence: JSON.parse(raw[EVIDENCE]), dirty: new Set(), omit: new Set(), evidenceBytes: null, rehashEvidence: false };
    mutate(c);
    const bytes = {};
    bytes[EVIDENCE] = c.evidenceBytes ?? (c.dirty.has(EVIDENCE) ? Buffer.from(JSON.stringify(c.evidence, null, 2) + '\n') : raw[EVIDENCE]);
    if (c.rehashEvidence) { c.snapshot.routes[route].externalPublication.evidenceSha256 = crypto.createHash('sha256').update(bytes[EVIDENCE]).digest('hex'); c.dirty.add(SNAPSHOT); }
    bytes[SNAPSHOT] = c.dirty.has(SNAPSHOT) ? Buffer.from(JSON.stringify(c.snapshot, null, 2) + '\n') : raw[SNAPSHOT];
    bytes[REGISTRY] = c.dirty.has(REGISTRY) ? Buffer.from(JSON.stringify(c.registry, null, 2) + '\n') : raw[REGISTRY];
    for (const file of [REGISTRY, SNAPSHOT, EVIDENCE]) {
      if (c.omit.has(file)) continue;
      fs.mkdirSync(path.dirname(path.join(tmp, file)), { recursive: true });
      fs.writeFileSync(path.join(tmp, file), bytes[file]);
    }
    process.chdir(tmp); resetAuthorityCaches();
    const observation = admission.resolveObservation(route);
    const decision = admission.fulfillmentAuthorityFor(route);
    if (expectAdmitted) {
      assert.ok(observation, `${label}: expected an admitted observation`);
      assert.equal(observation.provider.imageDigest, c.evidence.immutableRegistryDigest, `${label}: observation digest is the published digest`);
      assert.equal(decision.missingProof.includes('provider'), false, `${label}: provider proof expected`);
    } else {
      // A tampered observation or evidence file is refused by the resolver; a
      // tampered record alone leaves the observation intact and is refused one
      // layer up, where the record is compared against it. Either way the
      // answer that matters — commercial authority — must be closed.
      if (!c.recordOnly) assert.equal(observation, null, `${label}: the resolver must refuse`);
      else assert.ok(observation, `${label}: the untouched observation is still readable; the refusal must come from the authority decision`);
      assert.equal(decision.authorized, false, `${label}: authority must stay closed`);
      assert.equal(decision.commercialStatus, 'not_commercially_eligible', `${label}: no commercial eligibility`);
    }
  } finally { process.chdir(root); resetAuthorityCaches(); fs.rmSync(tmp, { recursive: true, force: true }); }
}
if (publicationCurrent) {
  check('scratch copy of the real binding is recognized (control for the refusals below)', () => withScratchAuthority('unchanged', () => {}, true));
}
const fabricated = 'sha256:' + 'f'.repeat(64);
const activeRecord = c => c.registry.records.find(r => r.routeId === c.route && !r.supersededBy);
const refusals = {
  'missing publication evidence': c => { c.omit.add(EVIDENCE); },
  'fabricated digest asserted on the observation and record': c => {
    c.snapshot.routes[c.route].provider.imageDigest = fabricated;
    c.snapshot.routes[c.route].externalPublication.immutableRegistryDigest = fabricated;
    const r = activeRecord(c); r.provider.imageDigest = fabricated; r.history.at(-1).recordSha256 = registryModule.fulfillmentRecordSha256(r);
    c.dirty.add(SNAPSHOT); c.dirty.add(REGISTRY);
  },
  'fabricated digest on the record alone': c => { activeRecord(c).provider.imageDigest = fabricated; c.dirty.add(REGISTRY); c.recordOnly = true; },
  'publication from another source': c => { c.evidence.sourceSha = '1'.repeat(40); c.dirty.add(EVIDENCE); c.rehashEvidence = true; },
  'publication naming a different digest': c => { c.evidence.immutableRegistryDigest = fabricated; c.evidence.digestPinnedReference = `${c.evidence.imageRepository}@${fabricated}`; c.dirty.add(EVIDENCE); c.rehashEvidence = true; },
  'publication run that did not succeed': c => { c.evidence.workflowConclusion = 'failure'; c.dirty.add(EVIDENCE); c.rehashEvidence = true; },
  'altered publication evidence bytes': c => { c.evidenceBytes = Buffer.concat([fs.readFileSync(EVIDENCE), Buffer.from('\n')]); },
  'worker inputs drifted since publication': c => { c.snapshot.routes[c.route].externalPublication.currentInputsEquivalent = false; c.dirty.add(SNAPSHOT); },
  'observation digest that is not the published digest': c => { c.snapshot.routes[c.route].provider.imageDigest = ''; c.dirty.add(SNAPSHOT); }
};
for (const [label, mutate] of Object.entries(refusals)) {
  check(`refuses ${label}`, () => withScratchAuthority(label, mutate));
}
console.log(`${passed}/${passed} exact-scope controls passed`);
