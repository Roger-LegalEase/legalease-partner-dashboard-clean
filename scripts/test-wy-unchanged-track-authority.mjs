import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { WY_CONTAINER as c, reconcileWyUnchangedTrack } from './lib/wy-unchanged-track-authority.mjs';
const base = { familyId: c.familyId, routeId: c.routeId,
  approvedBytes: execFileSync('git', ['show', `${c.approvedCommit}:${c.path}`]),
  currentBytes: fs.readFileSync(c.path), readBytes: p => fs.readFileSync(p) };
let checks = 0;
const proof = reconcileWyUnchangedTrack(base);
assert.equal(proof.createsApproval, false); assert.equal(proof.approvedMemo.sha256, c.approvedSha256); checks++;
const refuse = (label, args) => { assert.throws(() => reconcileWyUnchangedTrack({ ...base, ...args }), /WY unchanged-track refusal/); console.log('PASS refusal:', label); checks++; };
refuse('MS cannot use WY reconciliation', { familyId: 'ms-misd-addl-set' });
refuse('different route', { routeId: 'WY:other' });
refuse('changed approved memo', { approvedBytes: Buffer.concat([base.approvedBytes, Buffer.from(' ')]) });
for (const [label, mutate] of [
 ['selected track changed', d => { d.tracks.find(t => t.trackId === c.trackId).legalName = 'Changed'; }],
 ['selected track removed', d => { d.tracks = d.tracks.filter(t => t.trackId !== c.trackId); }],
 ['selected track duplicated', d => { d.tracks.push(d.tracks.find(t => t.trackId === c.trackId)); }],
 ['shared authority changed', d => { d.memoVersion = 'unapproved'; }],
 ['another sibling added', d => { d.tracks.push({ trackId: 'extra' }); }]
]) { const d = JSON.parse(base.currentBytes); mutate(d); refuse(label, { currentBytes: Buffer.from(JSON.stringify(d)) }); }
for (const path of Object.keys(proof.unchangedSupportingFiles)) refuse(`changed ${path}`, { readBytes: p => p === path ? Buffer.concat([fs.readFileSync(p), Buffer.from(' changed')]) : fs.readFileSync(p) });
for (const [label, path, mutate] of [
 ['audit successor changed', proof.successor.auditPath, d => { d.families.find(r => r.familyId === c.familyId).currentIndependentVerification.verifiedAtBase = 'other'; }],
 ['current verdict failed', proof.successor.registryPath, d => { d.rows.find(r => r.familyId === c.familyId && r.superseded === false).verdict = 'FAIL_REPAIR_REQUIRED'; }],
 ['current verdict duplicated', proof.successor.registryPath, d => { d.rows.push(d.rows.find(r => r.familyId === c.familyId && r.superseded === false)); }],
 ['review bytes changed', proof.successor.reviewPath, d => { d.rows.find(r => r.itemId === c.familyId).canonicalSha256 = 'changed'; }]
]) refuse(label, { readBytes: p => { const b = fs.readFileSync(p); if (p !== path) return b; const d = JSON.parse(b); mutate(d); return Buffer.from(JSON.stringify(d)); } });
// Unrelated review rows must not invalidate this exact selected-row proof.
assert.deepEqual(reconcileWyUnchangedTrack({ ...base, readBytes: p => { const b = fs.readFileSync(p); if (p !== proof.successor.registryPath) return b; const d = JSON.parse(b); d.rows.push({ familyId: 'unrelated', verdict: 'FAIL_REPAIR_REQUIRED', superseded: false }); return Buffer.from(JSON.stringify(d)); } }), proof); checks++;
console.log(`${checks} WY reconciliation controls PASS`);
