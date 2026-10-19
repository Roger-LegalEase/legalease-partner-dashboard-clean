import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
try {
  save(fixture);assert.equal(loadApprovedParityDeltas({rootDir:dir}).deltas.length,1);checks++;
  for (const [name, mutate, marker] of [
    ['scope omitted',r=>{delete r.deltas[0].scopeRestatement},/approval does not cover these bytes/],
    ['HI continuity omitted',r=>{delete r.deltas[0].scopeRestatement.sharedSourceContinuity},/exact Item 11/],
    ['HI review forged',r=>r.deltas[0].scopeRestatement.sharedSourceContinuity[0].independentReviewSha256='0'.repeat(64),/exact Item 11/],
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
  console.log(JSON.stringify({status:'PASS',checks,mutants:11,scope:'MD only; original approval and other delta records unchanged'}));
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
