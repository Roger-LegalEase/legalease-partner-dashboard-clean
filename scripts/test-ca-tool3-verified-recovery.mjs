// GA-20/O17 Q-73bd8ae566887c633a11; Reviewer2's actual base-final-verified counterexample.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
if (process.argv.some(a => a.startsWith('--mutation='))) {
  const file = new URL('../src/lib/expungement-ai/packet-information.ts', import.meta.url);
  const original = fs.readFileSync(file, 'utf8');
  const anchor = 'export function californiaTool3VerifiedHeldSuccessor(\n  verification: ProtectedPacketVerificationRecord\n): ProtectedPacketVerificationRecord | null {';
  assert.equal(original.split(anchor).length, 2);
  let mutated = original.replace(anchor, anchor + '\n  return null;');
  if (process.argv.includes('--mutation=cas')) {
    const target = 'expectedPriorHash: storedProtected.status === "verified" ? storedProtected.hash ?? null : null';
    assert.equal(original.split(target).length, 3);
    mutated = original.replaceAll(target, 'expectedPriorHash: priorProtected.status === "verified" ? priorProtected.hash ?? null : null');
  }
  const source = ts.transpileModule(mutated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), { data: { url: file.href, source } });
}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { decorateBriefcaseItemForPresentationWithDependencies: decorate } = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const record = JSON.parse(fs.readFileSync(new URL('./fixtures/ca-tool3-verified-predecessor.json', import.meta.url)));
const original = structuredClone(record), item = { id: 'synthetic-ca-verified', jurisdiction: 'CA', artifactRefs: {} };
assert.equal(record.status, 'verified');
assert.equal(P.protectedPacketDraftHash(record.draftSnapshot), record.draftHash);
// Final and draft hashes use the same canonical JSON algorithm.
assert.equal(P.protectedPacketDraftHash(record.snapshot), record.hash);
const model = P.protectedPacketInformationModelFor(record);
assert(model, 'Exact previously final-verified record must recover readable details');
assert.equal(model.resultCode, 'guidance_only');
assert.equal(model.reviewSafety.safe, false);
assert.equal(model.reviewedAt, null);
assert.notEqual(model.stage, 'ready_to_generate');
const held = P.californiaTool3VerifiedHeldSuccessor(record);
assert(held);
assert.equal(held.status, 'invalidated');
assert.equal(held.hash, undefined);
assert.equal(held.snapshot, undefined);
assert.equal(held.draftSnapshot.paymentAllowed, false);
for (const key of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers', 'dependencies', 'packetPlan', 'requiredInputIds', 'packetFamilyIdentifiers']) assert.deepEqual(held.draftSnapshot[key], record.draftSnapshot[key], 'Preserve ' + key);
const presented = await decorate({ consumerAuthUserId: 'synthetic-owner', item }, {
  readProtectedArtifact: async () => ({ ok: true, value: null }), readProtectedVerification: async () => ({ ok: true, value: record }),
  readTrustedPendingSource: async () => ({ ok: false, reason: 'no_source' }), readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }), evaluateAuthoritative: evaluate,
  readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
});
assert.equal(presented.authorityStatus, 'protected_draft');
assert.equal(presented.verificationStatus, 'invalidated');
assert.equal(presented.resultCode, 'guidance_only');
let saves = 0;
for (const [name, answers, verify] of [['no-op', {}, false], ['edit', { participant_full_legal_name: 'Synthetic Corrected Name' }, false], ['verify', {}, true]]) {
  const patch = P.packetInformationPatch({ existingItem: item, protectedVerification: record, answers, verify });
  assert(patch, name + ': held save resolves');
  const transition = patch.protectedTransition, next = transition.nextVerification;
  assert.equal(transition.expectedPriorHash, record.hash, 'CAS binds the ORIGINAL verified hash');
  assert.equal(transition.expectedPriorRevision, record.revision);
  assert.equal(next.revision, record.revision + 1);
  assert.equal(next.status, 'invalidated');
  assert.equal(next.hash, undefined); assert.equal(next.snapshot, undefined);
  assert.equal(next.draftSnapshot.paymentAllowed, false);
  assert.equal(next.draftSnapshot.resultCode, 'guidance_only');
  assert.equal(next.draftHash, P.protectedPacketDraftHash(next.draftSnapshot));
  assert.equal(patch.readyToGenerate, false);
  assert.deepEqual(transition.answerDelta, answers);
  assert.equal(next.draftSnapshot.packetAnswers.participant_full_legal_name, name === 'edit' ? answers.participant_full_legal_name : record.draftSnapshot.packetAnswers.participant_full_legal_name);
  for (const key of ['screeningAnswers', 'prefilledAnswers', 'dependencies']) assert.deepEqual(next.draftSnapshot[key], record.draftSnapshot[key]);
  assert(P.protectedPacketInformationModelFor(JSON.parse(JSON.stringify(next))), 'Saved held successor resumes');
  assert.deepEqual(P.packetInformationPatch({ existingItem: item, protectedVerification: next, answers: {} }).protectedTransition.nextVerification, next, 'Held successor no-op stays exact');
  assert.throws(() => P.requireCurrentPacketVerificationRecord(item, next), P.CurrentPacketVerificationRequiredError);
  saves++;
}
assert.throws(() => P.requireCurrentPacketVerificationRecord(item, record), P.CurrentPacketVerificationRequiredError);
assert.deepEqual(record, original, 'Reading/editing must never mutate the original record');
let boundaries = 0;
for (const mutate of [
  r => { r.status = 'unverified'; }, r => { r.status = 'invalidated'; },
  r => { r.hash = '0'.repeat(64); }, r => { r.draftHash = '0'.repeat(64); },
  r => { delete r.snapshot; }, r => { delete r.draftSnapshot; },
  r => { r.draftSnapshot.packetAnswers.participant_full_legal_name = 'Conflicting draft'; r.draftHash = P.protectedPacketDraftHash(r.draftSnapshot); },
  r => { for (const s of [r.snapshot, r.draftSnapshot]) s.profileAuthorityFingerprint = 'unapproved'; r.hash = P.protectedPacketDraftHash(r.snapshot); r.draftHash = P.protectedPacketDraftHash(r.draftSnapshot); },
  r => { for (const s of [r.snapshot, r.draftSnapshot]) s.pathwayId = 'tool-4-arrest-record-sealing'; r.hash = P.protectedPacketDraftHash(r.snapshot); r.draftHash = P.protectedPacketDraftHash(r.draftSnapshot); },
  r => { for (const s of [r.snapshot, r.draftSnapshot]) s.paymentAllowed = false; r.hash = P.protectedPacketDraftHash(r.snapshot); r.draftHash = P.protectedPacketDraftHash(r.draftSnapshot); }
]) {
  const altered = structuredClone(record); mutate(altered);
  assert.equal(P.californiaTool3VerifiedHeldSuccessor(altered), null, 'Reject outside exact verified predecessor'); boundaries++;
}
console.log(JSON.stringify({ status: 'PASS', verifiedPredecessors: 1, heldSaves: saves, refusalBoundaries: boundaries, originalRecordUnchanged: true, verificationCarried: false, paymentOpened: false }));
