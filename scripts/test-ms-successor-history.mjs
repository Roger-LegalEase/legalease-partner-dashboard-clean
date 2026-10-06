#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import test from 'node:test';
const source = fs.readFileSync('scripts/generate-rcap-grade-a-fulfillment-authority.mjs','utf8');
const start = source.indexOf('  const prior = priorCurrentRecordFor(MS_CLINIC_ROUTE);', source.indexOf('function mississippiPaidConsumerSuccessorRecord'));
assert(start >= 0);
const end = source.indexOf('\n  return record;\n}', start);
assert(end >= 0);
const code = source.slice(start,end)+'\nreturn record;';
const hash = r => createHash('sha256').update(JSON.stringify({...r,history:undefined})).digest('hex');
const approval = {decisionPath:'v3.json',decisionSha256:'v3-hash',supersededDecisionPath:'v2.json',supersededDecisionSha256:'v2-hash'};
function build(prior,record,date='2026-10-06',body=code){return vm.runInNewContext('(function(){'+body+'})()', {priorCurrentRecordFor:()=>prior,MS_CLINIC_ROUTE:'ms',record:structuredClone(record),approval,changeDate:date,GENERATOR_ID:'generator',fulfillmentRecordSha256:hash});}
function plain(v){return JSON.parse(JSON.stringify(v));}
function historical(r){const h=r.history.at(-1);assert.equal(h.changeKind,'created');assert.equal(h.changedAt,'2026-09-20');assert.match(h.reason,/New exact paid-consumer owner approval v3.json/);assert.match(h.reason,/The packet contents changed:/);assert.match(h.reason,/superseding v2.json/);assert.match(h.reason,/Preserves the prior sponsored Preview authority separately/);assert.equal(h.supersedesRecordSha256,null);assert.equal(h.recordSha256,hash(r));}
function refreshed(r,prior){const h=r.history.at(-1);assert.equal(h.changeKind,'proof_added');assert.equal(h.changedAt,'2026-10-06');assert.match(h.reason,/Regenerated current evidence/);assert.doesNotMatch(h.reason,/New exact paid-consumer owner approval|The packet contents changed:/);for(const term of ['owner approval','packet-content decision','legal treatment','eligibility change','hosted acceptance'])assert(h.reason.includes(term));assert.deepEqual(plain(r.history.slice(0,-1)),plain(prior.history));assert.equal(h.supersedesRecordSha256,prior.history.at(-1).recordSha256);assert.equal(h.recordSha256,hash(r));}
const initial = () => build({recordId:'old',history:[]},{recordId:'successor',evidence:'original'});
test('historical creation retains exact historical event and valid chain',()=>historical(initial()));
test('same identity appends truthful evidence refresh and remains deterministic',()=>{const prior=initial();const next=build(prior,{recordId:'successor',evidence:'new'});refreshed(next,prior);assert.equal(next.version,prior.version+1);assert.deepEqual(plain(build(next,{recordId:'successor',evidence:'new'})),plain(next));});
test('semantic mutations fail: false approval, erased historical event, rewritten prior history',()=>{const prior=initial(),next=plain(build(prior,{recordId:'successor',evidence:'new'}));next.history.at(-1).reason='New exact paid-consumer owner approval. The packet contents changed:';assert.throws(()=>refreshed(next,prior));const erased=plain(initial());erased.history[0].reason='Regenerated current evidence bindings';assert.throws(()=>historical(erased));const rewritten=plain(build(prior,{recordId:'successor',evidence:'new'}));rewritten.history[0].reason='rewritten';assert.throws(()=>refreshed(rewritten,prior));});
