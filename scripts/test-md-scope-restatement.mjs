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
assert.deepEqual(history, previous.deltas.find(d => d.id === md.id), 'all historical approval fields preserved');
assert.deepEqual(record.deltas.filter(d => d !== md), previous.deltas.filter(d => d.id !== md.id), 'other approvals unchanged');
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
let checks=2;
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
  for (const [name, mutate, marker] of [
    ['scope omitted',r=>{delete r.deltas[0].scopeRestatement},/approval does not cover these bytes/],
    ['HI continuity omitted',r=>{delete r.deltas[0].scopeRestatement.sharedSourceContinuity},/exact Item 11/],
    ['HI review forged',r=>r.deltas[0].scopeRestatement.sharedSourceContinuity[0].independentReviewSha256='0'.repeat(64),/exact Item 11/],
    ['whole history omitted',r=>r.deltas[0].scopeRestatement.sharedSourceContinuity.pop(),/exact Item 11/],
    ['transition removed',r=>r.deltas[0].scopeRestatement.sharedSourceContinuity[1].transitions.splice(12,1),/exact Item 11/],
    ['MD change relabelled',r=>{r.deltas[0].scopeRestatement.sharedSourceContinuity[1].transitions.find(t=>t.commit.startsWith('252fc5867')).classification='non_md_continuity'},/exact Item 11/],
    ['intermediate acceptance invented',r=>{r.deltas[0].scopeRestatement.sharedSourceContinuity[1].transitions.find(t=>t.commit.startsWith('f84ea78c7')).admission='ACCEPT'},/exact Item 11/],
    ['scope widened',r=>r.deltas[0].scopeRestatement.scope.push('all jurisdictions'),/exact Item 11/],
    ['foreign jurisdiction',r=>r.deltas[0].jurisdiction='VA',/exact Item 11/],
    ['foreign path',r=>r.deltas[0].scopeRestatement.bindings['src/foreign.ts']={priorSha256:'0'.repeat(64),newSha256:'1'.repeat(64)},/exact Item 11/],
    ['invented hash',r=>r.deltas[0].scopeRestatement.bindings['src/lib/rcap-engine/evaluator.ts'].newSha256='0'.repeat(64),/exact Item 11/],
    ['historical signature rewritten',r=>r.deltas[0].authorization.statement+=' widened',/historical signed statement/],
    ['history hop removed',r=>r.deltas[0].supersededSha256.pop(),/does not continue the historical chain/],
    ['proof weakened',()=>fs.appendFileSync(path.join(dir,scopeRestatement.proofPath),'\n// changed proof'),/proof bytes changed/],
    ['current source drift',()=>fs.appendFileSync(path.join(dir,'src/lib/rcap-engine/evaluator.ts'),'\n// drift'),/approval does not cover these bytes/]
  ]) {
    for(const [file,bytes] of originals)fs.writeFileSync(path.join(dir,file),bytes);
    const changed=structuredClone(fixture);mutate(changed);save(changed);
    assert.throws(()=>loadApprovedParityDeltas({rootDir:dir}),marker,name);checks++;
  }
  console.log(JSON.stringify({status:'PASS',checks,mutants:15,scope:'MD only; original approval and other delta records unchanged'}));
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
