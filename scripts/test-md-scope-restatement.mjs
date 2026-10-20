import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadApprovedParityDeltas, APPROVED_DELTAS_PATH} from './lib/screening-parity-deltas.mjs';

// Exercise the actual parser on a separate MD-only fixture. Other jurisdictions
// are deliberately not reauthorized by this bounded owner decision.
const record = JSON.parse(fs.readFileSync(APPROVED_DELTAS_PATH));
const md = record.deltas.find(d => d.id === 'md-pardon-signed-date-2026-08-25');
const previous = JSON.parse(execFileSync('git',['show','c2246711d82982cc41304c07be54a7d4b5583ce6:'+APPROVED_DELTAS_PATH]));
const {scopeRestatement, ...history} = md;
const EVALUATOR = 'src/lib/rcap-engine/evaluator.ts';
// A17 (owner-authorized 2026-10-20): the only reviewed change since c2246711 is one
// appended unsigned re-pin on each of these deltas; everything else stays historical.
const A17_REPINS = {
  "md-pardon-signed-date-2026-08-25": {"path":"src/lib/rcap-engine/evaluator.ts","sha256":"2f832448c0efa6f5989695eab904886090d5b5f39e1c7bc5243b9d7754ba8aa4","repinnedTo":"295faa3388dd4619fe58649abfc5a934950247bd410013a8655f1a106e2a2989","behaviouralProof":"scripts/verify-md-10-103-signed-approval.mjs"},
  "nv-176a-excluded-charge-class-2026-09-28": {"path":"src/lib/expungement-ai/frontend/profiles/all51.json","sha256":"baf0daeff56a7588021b5d49181b4b6828e38a7ecd545c11348188abefaf2bb5","repinnedTo":"eb048480da0ee51b7613172b95a2b8dcf34097fad8203909ac3d601f0273d7ea","behaviouralProof":"scripts/verify-nevada-176a-branch.mjs"},
  "nv-176a-charge-class-2026-09-28": {"path":"src/lib/expungement-ai/frontend/profiles/all51.json","sha256":"baf0daeff56a7588021b5d49181b4b6828e38a7ecd545c11348188abefaf2bb5","repinnedTo":"eb048480da0ee51b7613172b95a2b8dcf34097fad8203909ac3d601f0273d7ea","behaviouralProof":"scripts/verify-nevada-176a-branch.mjs"},
  "nv-176a-disposition-class-2026-09-28": {"path":"src/lib/expungement-ai/frontend/profiles/all51.json","sha256":"baf0daeff56a7588021b5d49181b4b6828e38a7ecd545c11348188abefaf2bb5","repinnedTo":"eb048480da0ee51b7613172b95a2b8dcf34097fad8203909ac3d601f0273d7ea","behaviouralProof":"scripts/verify-nevada-176a-branch.mjs"},
  "sd-sis-record-correction-stage-2026-09-28": {"path":"src/lib/expungement-ai/frontend/profiles/all51.json","sha256":"baf0daeff56a7588021b5d49181b4b6828e38a7ecd545c11348188abefaf2bb5","repinnedTo":"eb048480da0ee51b7613172b95a2b8dcf34097fad8203909ac3d601f0273d7ea","behaviouralProof":"scripts/verify-sd-escalation-selection.mjs"}
};
const A17_REPINS_SHA256 = '5311fb17ede0afa69870af4382e7756d61e89ff710acf737678a95d1d5e14a0d'; // the five appended entries, reasons included, in record order
// A27 (owner-authorized 2026-10-20): one further md-pardon evaluator re-pin, appended after the A17 one.
const A27_REPIN = {"path":"src/lib/rcap-engine/evaluator.ts","sha256":"295faa3388dd4619fe58649abfc5a934950247bd410013a8655f1a106e2a2989","repinnedTo":"492e957b951885184d70ee8b6d12950a2e2a3e51d11b015e2ca3bbf893f67c25","behaviouralProof":"scripts/verify-md-10-103-signed-approval.mjs"};
const A27_REPIN_SHA256 = 'c28fc7f5881bf1578229e1ec150507012e54a2318b3755454353d34c1a96b22d'; // the appended entry, reason included
function withoutA27(delta) {
  const tail = delta.supersededSha256.at(-1);
  assert.deepEqual({path:tail.path,sha256:tail.sha256,repinnedTo:tail.repinnedTo,behaviouralProof:tail.behaviouralProof},
    A27_REPIN, `${delta.id}: the reviewed A27 re-pin is its last supersession`);
  assert.equal(createHash('sha256').update(JSON.stringify(tail)).digest('hex'), A27_REPIN_SHA256, 'exactly the reviewed A27 re-pin');
  return {...delta, supersededSha256: delta.supersededSha256.slice(0, -1)};
}
const a17Appended = [];
function withoutA17(delta) {
  const expected = A17_REPINS[delta.id];
  if (!expected) return delta;
  const tail = delta.supersededSha256?.at(-1);
  assert.deepEqual(tail && {path:tail.path,sha256:tail.sha256,repinnedTo:tail.repinnedTo,behaviouralProof:tail.behaviouralProof},
    expected, `${delta.id}: the reviewed A17 re-pin is its last supersession`);
  a17Appended.push(tail);
  const {supersededSha256, ...rest} = delta;
  return supersededSha256.length > 1 ? {...rest, supersededSha256: supersededSha256.slice(0, -1)} : rest;
}
assert.deepEqual(withoutA17(withoutA27(history)), previous.deltas.find(d => d.id === md.id), 'all historical approval fields preserved');
assert.deepEqual(record.deltas.filter(d => d !== md).map(withoutA17), previous.deltas.filter(d => d.id !== md.id), 'other approvals unchanged');
assert.equal(a17Appended.length, Object.keys(A17_REPINS).length, 'every reviewed A17 re-pin present');
assert.equal(createHash('sha256').update(JSON.stringify(a17Appended)).digest('hex'), A17_REPINS_SHA256, 'exactly the reviewed A17 re-pins');
const fixture = {...record,deltas:[md],runtimeReauthorizations:record.runtimeReauthorizations.filter(r => r.deltaId === md.id)};
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'md-scope-restatement-'));
const originals = new Map();
function copy(file) {
  const bytes = fs.readFileSync(file), target = path.join(dir,file);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);originals.set(file,bytes);
}
for (const file of new Set([...md.authorizedPaths,...md.beforeAfterEvidence.behavioralProof,
  ...md.supersededSha256.map(r => r.behaviouralProof),...fixture.runtimeReauthorizations.map(r => r.proofPath),scopeRestatement.proofPath])) copy(file);
const save = value => fs.writeFileSync(path.join(dir,APPROVED_DELTAS_PATH),JSON.stringify(value));
fs.mkdirSync(path.dirname(path.join(dir,APPROVED_DELTAS_PATH)),{recursive:true});
let checks=4;
// The A17 hop: it continues the chain only from the Item 11 binding's newSha256.
const a17Hop = (r, edit) => {
  const hops = r.deltas[0].supersededSha256;
  const i = hops.findIndex(e => e.path === EVALUATOR && e.sha256 === scopeRestatement.bindings[EVALUATOR].newSha256 && typeof e.repinnedTo === 'string');
  assert.ok(i >= 0, 'the A17 post-binding re-pin'); edit(hops, i);
};
const span = scopeRestatement.sharedSourceContinuity[1], transitions = span.transitions;
const commits = execFileSync('git', ['log','--first-parent','--reverse','--format=%H',
  transitions[0].commit+'^..'+transitions.at(-1).commit,'--',span.path], {encoding:'utf8'}).trim().split('\n');
assert.equal(transitions.length,93);
assert.deepEqual(transitions.map(t=>t.commit),commits,'every first-parent evaluator transition, in order');
assert.equal(transitions[0].previousSha256,span.previousSha256);
assert.equal(transitions.at(-1).currentSha256,span.currentSha256);checks+=4;
for (const [i, transition] of transitions.entries()) {
  for (const [ref, expected] of [[transition.commit+'^',transition.previousSha256],[transition.commit,transition.currentSha256]]) {
    assert.equal(createHash('sha256').update(execFileSync('git',['show',ref+':'+span.path])).digest('hex'),expected,'actual historical evaluator bytes');checks++;
  }
  if(i) {assert.equal(transitions[i-1].currentSha256,transition.previousSha256,'contiguous transition');checks++;}
}
assert.deepEqual(transitions.filter(t=>t.classification==='existing_item11_scope').map(t=>t.commit.slice(0,9)).sort(),
  ['252fc5867','46116aa19','89f4beee2'],'three disclosed MD changes stay in existing scope');checks++;
for(const prefix of ['f84ea78c7','c71d85cf2']) {
  assert.match(transitions.find(t=>t.commit.startsWith(prefix)).admission,/intermediate state.*not an accepted candidate/);checks++;
}
try {
  save(fixture);assert.equal(loadApprovedParityDeltas({rootDir:dir}).deltas.length,1);checks++;
  const mutants = [
    ['scope omitted',r=>{delete r.deltas[0].scopeRestatement},/approval does not cover these bytes/],
    ['HI continuity omitted',r=>{delete r.deltas[0].scopeRestatement.sharedSourceContinuity},/exact Item 11/],
    ['HI review forged',r=>r.deltas[0].scopeRestatement.sharedSourceContinuity[0].independentReviewSha256='0'.repeat(64),/exact Item 11/],
    ['whole history omitted',r=>r.deltas[0].scopeRestatement.sharedSourceContinuity.pop(),/exact Item 11/],
    ['transition removed',r=>r.deltas[0].scopeRestatement.sharedSourceContinuity[1].transitions.splice(12,1),/exact Item 11/],
    ['MD change relabelled',r=>{r.deltas[0].scopeRestatement.sharedSourceContinuity[1].transitions.find(t=>t.commit.startsWith('252fc5867')).classification='non_md_continuity'},/exact Item 11/],
    ['intermediate acceptance invented',r=>{r.deltas[0].scopeRestatement.sharedSourceContinuity[1].transitions.find(t=>t.commit.startsWith('f84ea78c7')).admission='ACCEPT'},/exact Item 11/],
    ['VA continuity omitted',r=>r.deltas[0].scopeRestatement.sharedSourceContinuity.pop(),/exact Item 11/],
    ['VA prior binding forged',r=>{r.deltas[0].scopeRestatement.sharedSourceContinuity[2].sourceBindings[0].previousSha256='0'.repeat(64)},/exact Item 11/],
    ['scope widened',r=>r.deltas[0].scopeRestatement.scope.push('all jurisdictions'),/exact Item 11/],
    ['foreign jurisdiction',r=>r.deltas[0].jurisdiction='VA',/exact Item 11/],
    ['foreign path',r=>r.deltas[0].scopeRestatement.bindings['src/foreign.ts']={priorSha256:'0'.repeat(64),newSha256:'1'.repeat(64)},/exact Item 11/],
    ['invented hash',r=>r.deltas[0].scopeRestatement.bindings['src/lib/rcap-engine/evaluator.ts'].newSha256='0'.repeat(64),/exact Item 11/],
    ['historical signature rewritten',r=>r.deltas[0].authorization.statement+=' widened',/historical signed statement/],
    ['history hop removed',r=>{const hops=r.deltas[0].supersededSha256,i=hops.findIndex(e=>e.path===EVALUATOR&&e.repinnedTo===scopeRestatement.bindings[EVALUATOR].priorSha256);
      assert.ok(i>=0,'the historical hop into the Item 11 binding');hops.splice(i,1)},/does not continue the historical chain/],
    ['proof weakened',()=>fs.appendFileSync(path.join(dir,scopeRestatement.proofPath),'\n// changed proof'),/proof bytes changed/],
    ['current source drift',()=>fs.appendFileSync(path.join(dir,'src/lib/rcap-engine/evaluator.ts'),'\n// drift'),/approval does not cover these bytes/],
    // A17 post-binding re-pin: valid only as recorded, refused when removed, unreachable, bypassing or malformed.
    // With A27 appended after it, losing or redirecting the A17 hop leaves A27's starting hash unreachable.
    ['post-binding re-pin removed',r=>a17Hop(r,(hops,i)=>hops.splice(i,1)),/which the authorization chain never reaches/],
    ['post-binding re-pin from an unreachable hash',r=>a17Hop(r,(hops,i)=>{hops[i].sha256='0'.repeat(64)}),/which the authorization chain never reaches/],
    ['re-pin bypasses the Item 11 binding',r=>a17Hop(r,(hops,i)=>{hops[i].sha256=scopeRestatement.bindings[EVALUATOR].priorSha256}),/scope restatement does not continue the historical chain/],
    ['post-binding re-pin to invented bytes',r=>a17Hop(r,(hops,i)=>{hops[i].repinnedTo='0'.repeat(64)}),/which the authorization chain never reaches/],
    ['post-binding re-pin recorded twice',r=>a17Hop(r,(hops,i)=>hops.push(structuredClone(hops[i]))),/superseded twice at the same hash/],
    ['post-binding re-pin without a real reason',r=>a17Hop(r,(hops,i)=>{hops[i].reason='updated'}),/reason is missing or too short/],
    ['post-binding re-pin cites a missing proof',r=>a17Hop(r,(hops,i)=>{hops[i].behaviouralProof='scripts/verify-nothing-at-all.mjs'}),/as proof, and it does not exist/],
    ['A27 re-pin removed',r=>{const hops=r.deltas[0].supersededSha256;assert.equal(hops.at(-1).repinnedTo,A27_REPIN.repinnedTo);hops.pop()},/approval does not cover these bytes/]
  ];
  for (const [name, mutate, marker] of mutants) {
    for(const [file,bytes] of originals)fs.writeFileSync(path.join(dir,file),bytes);
    const changed=structuredClone(fixture);mutate(changed);save(changed);
    assert.throws(()=>loadApprovedParityDeltas({rootDir:dir}),marker,name);checks++;
  }
  console.log(JSON.stringify({status:'PASS',checks,mutants:mutants.length,scope:'MD only; original approval and other delta records unchanged except the reviewed A17 and A27 re-pins'}));
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
