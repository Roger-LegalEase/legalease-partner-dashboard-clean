#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { loadMsPaidConsumerSuccessor, MS_PAID_SUCCESSOR_DECISION_PATH: decisionPath,
  MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH: priorDecisionPath,
  MS_PAID_SUCCESSOR_FIRST_DECISION_PATH: firstDecisionPath, MS_PAID_SUCCESSOR_ROUTE: route } =
  await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const root = process.cwd();
const approved = JSON.parse(fs.readFileSync(decisionPath));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-paid-scope-'));
let passed = 0;
function check(label, run) { run(); passed++; console.log(`PASS ${label}`); }
function writeDecision(decision) { fs.writeFileSync(path.join(scratch, decisionPath), JSON.stringify(decision)); }
try {
  // The whole superseded chain and the approved bytes are custody inputs now,
  // not only the evidence list: the loader reads all of them. The chain is two
  // links deep since v3, so v1 is copied too -- the loader verifies that v2
  // still names v1 exactly, and a fixture missing it would fail for the wrong
  // reason in every control below.
  for (const rel of [decisionPath, priorDecisionPath, firstDecisionPath,
    ...approved.preservedEvidence.map(e => e.path), ...approved.approvedArtifacts.map(a => a.path)]) {
    fs.mkdirSync(path.dirname(path.join(scratch, rel)), { recursive: true });
    fs.copyFileSync(path.join(root, rel), path.join(scratch, rel));
  }
  /*
   * The scratch decision names the scratch bytes.
   *
   * This copies the real artifacts, and after the shared Fees & Costs
   * correction moved two of them the real decision no longer names what was
   * copied -- so every control below failed for one reason that has nothing to
   * do with the rule it is testing. These 49 controls are about the LOADER's
   * rules: that it refuses a changed route, a waived gate, an edited
   * supersession, a swapped artifact path. Re-pointing the fixture's decision
   * at the fixture's own bytes is what lets each of them fail for its own
   * reason again.
   *
   * It is a fixture, and it says nothing about what Roger approved. The real
   * mismatch is recorded in MS_NONCONVICTION_ARTIFACT_MOVE_2026-09-20.json and
   * held by its own control; the real decision is never edited.
   */
  const fixtureDecision = JSON.parse(JSON.stringify(approved));
  const scratchDigest = rel => crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(scratch, rel))).digest('hex');
  for (const entry of fixtureDecision.approvedArtifacts) entry.sha256 = scratchDigest(entry.path);
  for (const entry of fixtureDecision.preservedEvidence) entry.sha256 = scratchDigest(entry.path);
  // The assembly binding pins the guide the review was produced from; the
  // review evidence in the fixture tree states it, so the fixture reads it from
  // there rather than restating a digest of its own.
  const fixtureReview = JSON.parse(fs.readFileSync(path.join(scratch,
    'data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json'), 'utf8'));
  fixtureDecision.assemblyBinding.supplementalGuideContentSha256 =
    fixtureReview.generatedFrom.supplementalGuideIdentity.contentSha256;
  fixtureDecision.assemblyBinding.supplementalGuideSha256 =
    fixtureReview.generatedFrom.supplementalGuideSha256;
  fixtureDecision.assemblyBinding.specificationSha256 = fixtureReview.generatedFrom.specificationSha256;
  for (const entry of fixtureDecision.approvedArtifacts) {
    const produced = (fixtureReview.artifacts ?? []).find(row => row.id === entry.id);
    if (produced) entry.pageCount = produced.pageCount;
  }
  /*
   * The account of what moved has to follow the fixture's own digests.
   *
   * The loader ties `supersedes.movedArtifacts[].to` to the approved digest and
   * `.from` to the superseded decision's, so a fixture that re-pointed the
   * approved bytes without re-pointing the account would be refused for the
   * bookkeeping rather than for the rule each control is about.
   */
  const supersededDecision = JSON.parse(fs.readFileSync(path.join(scratch, priorDecisionPath), 'utf8'));
  for (const moved of fixtureDecision.supersedes.movedArtifacts) {
    moved.from = supersededDecision.approvedArtifacts.find(a => a.id === moved.id).sha256;
    moved.to = fixtureDecision.approvedArtifacts.find(a => a.id === moved.id).sha256;
    moved.moved = moved.from !== moved.to;
  }
  writeDecision(fixtureDecision);

  check('new exact approval loads without granting technical acceptance', () => {
    const a = loadMsPaidConsumerSuccessor(scratch);
    assert.equal(a.routeId, route); assert.equal(a.trackId, 'ms-nonconv');
    assert.equal(a.packetContentsChanged, true, 'the successor packet contents changed and the approval says so');
    assert.equal(a.approvedArtifacts.length, 3);
    assert.equal(a.decisionSha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(scratch,decisionPath))).digest('hex'));
  });
  const artifact = (d, id) => d.approvedArtifacts.find(a => a.id === id);
  const mutations = {
    'other route': d => d.routeId += '-other', 'other track': d => d.trackId = 'ms-misd-addl',
    'other family': d => d.packetSetId = 'ms-misd-addl-set', 'wrong price': d => d.priceCents = 100,
    'no paid approval': d => d.consumerPaidAuthorized = false,
    'invented prior approval': d => d.priorPaidApprovalInvented = true,
    'security waiver': d => d.paymentSecurityWaived = true,
    'technical waiver': d => d.technicalAcceptanceWaived = true,
    'production scope': d => d.productionAuthorized = true,
    'changed eligibility': d => d.eligibilityChanged = true,
    // The whole point of this decision: an approval that denies the contents
    // change cannot describe these bytes, and is refused rather than adopted.
    'an approval that denies the packet change': d => d.packetContentsChanged = false,
    'an unnamed supersession of the retired filing page': d => d.packetContentsChange.supersededPacketComponentId = 'something-else',
    'retirement removed': d => d.legacyRetirementPreserved = false,
    'historical approval overwritten': d => d.historicalSponsoredPreviewApprovalPreserved = false,
    'missing source binding': d => d.preservedEvidence.pop(),
    'duplicate source binding': d => d.preservedEvidence[1] = d.preservedEvidence[0],
    'changed source digest': d => d.preservedEvidence[0].sha256 = '0'.repeat(64),
    'a superseded decision that was edited': d => d.supersedes.sha256 = '0'.repeat(64),
    'a superseded decision claimed to have been mutated': d => d.supersedes.priorDecisionMutated = true,
    'a different approved artifact hash': d => artifact(d, 'full-en').sha256 = '0'.repeat(64),
    'an approved artifact read from another path': d => artifact(d, 'full-es').path = artifact(d, 'full-en').path,
    'a missing approved artifact': d => d.approvedArtifacts.pop(),
    'a court-only artifact claiming the guide': d => artifact(d, 'court-only').guideAssembled = true,
    'a full artifact shipping without the guide': d => artifact(d, 'full-en').guideAssembled = false,
    'a single-locale approval presented as both': d => artifact(d, 'full-es').locale = 'en',
    'an assembly binding that names another guide': d => d.assemblyBinding.supplementalGuideContentSha256 = '0'.repeat(64),
    'an assembly binding that names another assembler version': d => d.assemblyBinding.assemblyVersion = '1.0.0',
    'a review fixture that is not participant delivery': d => d.assemblyBinding.reviewFixturePath = 'data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.fixture.json',
    'a claim that the superseded bytes still reproduce': d => d.historicalApprovalStatus.artifactBytesStillReproduce = true,
    /*
     * The account of what moved, which v3 added.
     *
     * A superseding decision has to be RIGHT about what changed. Claiming an
     * artifact moved when it did not, or holding one still when it did, names
     * the wrong relationship between two approvals -- which is the same class
     * of defect as naming the wrong bytes, one level up.
     */
    'an account that starts from bytes the superseded decision never approved':
      d => d.supersedes.movedArtifacts[0].from = '0'.repeat(64),
    'an account whose destination is not the bytes this decision approves':
      d => d.supersedes.movedArtifacts[0].to = '0'.repeat(64),
    'an artifact flagged as moved that did not move':
      d => { const row = d.supersedes.movedArtifacts.find(m => !m.moved); row.moved = true; },
    'an artifact flagged as unmoved that did move':
      d => { const row = d.supersedes.movedArtifacts.find(m => m.moved); row.moved = false; },
    'an account that leaves an approved artifact out entirely':
      d => d.supersedes.movedArtifacts = d.supersedes.movedArtifacts.slice(1),
    // A supersession in which nothing moved is not a supersession: it would be
    // a second approval of the same bytes, which is a way of quietly reissuing
    // an approval the owner did not give again.
    'a supersession in which nothing actually moved':
      d => d.supersedes.movedArtifacts = d.supersedes.movedArtifacts.map(m => ({ ...m, from: m.to, moved: false })),
    // And custody one link further back, which is the reason the chain check
    // does not stop at the immediate predecessor.
    'a chain whose tail no longer names the first decision':
      (d, tree) => {
        const v2 = JSON.parse(fs.readFileSync(path.join(tree, priorDecisionPath), 'utf8'));
        v2.supersedes.sha256 = '0'.repeat(64);
        fs.writeFileSync(path.join(tree, priorDecisionPath), JSON.stringify(v2));
      }
  };
  for (const [label, mutate] of Object.entries(mutations)) {
    // A mutation gets the decision and the tree: custody rules live in files
    // beside the decision, so proving those refuse means editing one of them.
    const d = structuredClone(fixtureDecision); mutate(d, scratch); writeDecision(d);
    check(`refuses ${label}`, () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
    // Restore whatever the mutation may have touched, so each refusal is its own.
    fs.copyFileSync(path.join(root, priorDecisionPath), path.join(scratch, priorDecisionPath));
    fs.copyFileSync(path.join(root, firstDecisionPath), path.join(scratch, firstDecisionPath));
  }
  writeDecision(fixtureDecision);
  check('the unmutated fixture still loads (control for every refusal above)',
    () => assert.ok(loadMsPaidConsumerSuccessor(scratch)));
  const evidencePath = path.join(scratch, fixtureDecision.preservedEvidence[0].path);
  fs.appendFileSync(evidencePath, '\n');
  check('refuses changed packet specification bytes', () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  fs.copyFileSync(path.join(root, fixtureDecision.preservedEvidence[0].path), evidencePath);
  const approvedPdf = path.join(scratch, artifact(fixtureDecision, 'full-en').path);
  fs.appendFileSync(approvedPdf, '\n');
  check('refuses changed approved packet bytes', () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  fs.copyFileSync(path.join(root, artifact(fixtureDecision, 'full-en').path), approvedPdf);
  check('the restored evidence and bytes load again (control for the two refusals above)',
    () => assert.ok(loadMsPaidConsumerSuccessor(scratch)));
  fs.unlinkSync(path.join(scratch, priorDecisionPath));
  check('a deleted superseded decision fails closed', () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  fs.copyFileSync(path.join(root, priorDecisionPath), path.join(scratch, priorDecisionPath));
  fs.unlinkSync(path.join(scratch, decisionPath));
  check('missing approval fails closed', () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  check('historical sponsored approval remains unpaid', () => {
    const prior = JSON.parse(fs.readFileSync('data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json'));
    assert.equal(prior.participantDeliveryReview.consumerPaidAuthorized, false);
    assert.equal(prior.outputLegalApproval.consumerPaidAuthorized, false);
  });
} finally { fs.rmSync(scratch, {recursive:true, force:true}); }
const { resolvePacketRoute } = await import('../src/lib/rcap/documents/packet-route-resolver.ts');
/*
 * While the approval is refused, the route is not a live factory route.
 *
 * This asserted factory_v2 on the premise that the approval loads. The shared
 * Fees & Costs correction moved two of the artifacts it names, so it does not,
 * and the resolver falls all the way back to legacy_retired. That is the
 * product failing closed, not a regression: no approval, no factory route, and
 * nothing sellable either way.
 *
 * It goes back to factory_v2 when a new owner decision names the current bytes.
 * The control asserts BOTH halves so neither direction can drift unnoticed --
 * the resolution follows the approval, and it is never sellable from here.
 */
check('the successor route follows its approval, and is never sellable from here', () => {
  const result = resolvePacketRoute({state:'MS', pathway:route.slice(3)});
  const approvalLoads = loadMsPaidConsumerSuccessor(root) !== null;
  assert.equal(result.routeKind, approvalLoads ? 'factory_v2' : 'legacy_retired');
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
  assert.equal(current[0].recordId, 'grade-a-ms-nonconv-paid-consumer-successor-20260920');
  const live = loadMsPaidConsumerSuccessor();
  if (live) {
    assert.equal(current[0].evidenceBindings.paidConsumerSuccessor.decisionSha256, live.decisionSha256);
    assert.equal(current[0].finalVerification.state, 'bound');
    assert.equal(current[0].evidenceBindings.exactPaidPacketProof.currentInputsVerified, true);
  } else {
    /*
     * The approval names bytes the product no longer composes, so it is
     * refused. The record must carry NO owner scope at all -- not a weakened
     * one -- and must say on its face that an owner decision is what it waits
     * for. Anything less would leave a reader to infer the hold from an
     * absence, and an absence is exactly what a later change can fill in.
     */
    assert.equal(current[0].evidenceBindings.paidConsumerSuccessor, undefined,
      'a refused approval must not appear on the record in any form');
    assert.equal(current[0].evidenceBindings.paidConsumerSuccessorAwaitingOwnerDecision.consumerPaidAuthorized, false);
    assert.ok(current[0].ownerDecisionPendingOnComposedArtifact,
      'the record states the pending owner decision where the authority reads it');
    assert.ok(current[0].ownerDecisionPendingOnComposedArtifact.movedArtifacts.length > 0);
  }
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
      //
      // The record-only case can only make that distinction while the
      // publication is current. When worker inputs have drifted since the
      // accepted publication there is no admitted observation to leave intact,
      // for the real binding or for any mutation of it, so asserting one would
      // be asserting a state the repository is not in.
      if (!c.recordOnly || !publicationCurrent) assert.equal(observation, null, `${label}: the resolver must refuse`);
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
