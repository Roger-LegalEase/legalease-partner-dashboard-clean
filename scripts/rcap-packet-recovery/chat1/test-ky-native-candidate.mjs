#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {auditFamily,auditPreparedInputs} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {auditKyNativeCandidate,KY_NATIVE_DIRECTORY as DIR,KY_NATIVE_FAMILY as FAMILY} from '../../rcap-packet-completeness/ky-native-candidate.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const base=path.join(ROOT,DIR), sha=b=>createHash('sha256').update(b).digest('hex');
const bindings=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts/rcap-packet-completeness/ky-reviewed-candidate-inputs.json')));
const originals=Object.fromEntries(bindings.files.map(f=>[f.path,sha(fs.readFileSync(path.join(ROOT,f.path)))]));
const results=[],prepared=[];let actual;
function test(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
function rejectFile(name,relative,edit){test(name,()=>{const p=path.join(ROOT,relative),before=fs.readFileSync(p);try{edit(p,before);const r=auditFamily(DIR,FAMILY);assert.equal(r.auditable,false);assert.notEqual(r.result,'PASS_COMPLETE');assert.equal(r.counters.requiredFactsNotCollected,null);assert.equal(r.runtimeIntakeCounters,null);}finally{fs.writeFileSync(p,before);}});}
const changeJson=fn=>(p,b)=>{const d=JSON.parse(b);fn(d);fs.writeFileSync(p,JSON.stringify(d));};
test('actual shared reader classifies each exact fixture rather than an unread empty map',()=>{
 actual=auditFamily(DIR,FAMILY);assert.equal(actual.result,'PASS_COMPLETE');assert.equal(actual.auditable,true);assert.equal(actual.fixtureResults.length,13);assert.equal(actual.totals.terminalFields,569);assert.equal(actual.totals.written,270);assert.equal(actual.totals.blank,299);assert.equal(actual.totals.blanksByDisposition.REQUIRED_BEFORE_FILING,21);assert.equal(actual.runtimeIntakeCounters,null);assert.equal(actual.runtimeInstalled,false);assert.equal(actual.visualProofReuse.normalBlankRegions,63);assert.equal(actual.visualProofReuse.explainedSourceUnderlayRegions,6);
});
test('selected component coverage is seven six-page and six eight-page packets',()=>{assert.equal(actual.fixtureResults.filter(x=>x.pageCount===6).length,7);assert.equal(actual.fixtureResults.filter(x=>x.pageCount===8).length,6);assert.equal(actual.fixtureResults.reduce((n,x)=>n+x.pageCount,0),90);});
test('no source field is omitted or classified twice within a fixture component',()=>{for(const f of actual.fixtureResults){assert.equal(new Set(f.ledger.map(r=>r.documentId+'/'+r.field)).size,f.ledger.length);assert.equal(f.ledger.length,f.pageCount===6?29:61);}});
test('21 private/unknown field disclosures are verified without inventing execution',()=>{const pending=actual.fixtureResults.flatMap(x=>x.ledger.filter(r=>r.disposition==='REQUIRED_BEFORE_FILING'));assert.equal(pending.filter(x=>/ssn/i.test(x.field)).length,19);assert.equal(pending.filter(x=>x.field==='phone number').length,2);assert(pending.filter(x=>x.field==='phone number').every(x=>x.fixture==='boundary'));});
test('all 51 original review input identities remain unchanged',()=>{for(const f of bindings.files)assert.equal(sha(fs.readFileSync(path.join(ROOT,f.path))),f.sha256);});
test('CLI discovers this native candidate without a fabricated approval request',()=>{assert(!fs.existsSync(path.join(base,'approval-request.json')));const r=spawnSync(process.execPath,['scripts/rcap-packet-completeness/verify-packet-completeness.mjs','--family',FAMILY],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/270\/569/);assert.match(r.stdout,/runtime intake and fulfillment are unmeasured/);});
rejectFile('changed native schema fails explicitly with unmeasured counters',DIR+'/production-field-map.json',changeJson(m=>m.schemaVersion='unknown'));
rejectFile('deleted native census link cannot fall back to zero inspected fields',DIR+'/production-field-map.json',changeJson(m=>delete m.sourceCensuses));
rejectFile('changed whole PDF cannot borrow prior review',DIR+'/fixtures/canonical.pdf',(p,b)=>fs.writeFileSync(p,Buffer.concat([b,Buffer.from('\nUNREVIEWED')])));
rejectFile('changed boundary phone facts cannot borrow canonical proof',DIR+'/fixtures/boundary.facts.json',changeJson(f=>f.participant.phoneLocal='555-0000'));
rejectFile('changed selected-order input cannot borrow no-order proof',DIR+'/fixtures/canonical.facts.json',changeJson(f=>f.options.includeProposedOrder=true));
rejectFile('missing report write is not a zero missing-field count',DIR+'/reports/canonical.json',changeJson(r=>r.writes.pop()));
rejectFile('forged court field write cannot borrow protected-region proof',DIR+'/reports/boundary.json',changeJson(r=>r.writes.push({documentId:'AOC-497',field:'check denied',value:true})));
rejectFile('omitted census field refuses rather than reducing denominator',DIR+'/official-field-census.json',changeJson(c=>c['AOC-497.2'].pop()));
rejectFile('changed source receipt refuses the reused source proof',DIR+'/source-receipt.json',changeJson(r=>r.sources['AOC-497.2'].sha256='0'.repeat(64)));
rejectFile('raw source corruption refuses even when receipt is unchanged','reference/chat-parallel-2026-09-07/chat5/AOC-497.2.pdf',(p,b)=>fs.writeFileSync(p,Buffer.concat([b,Buffer.from('x')])));
rejectFile('modified validator cannot borrow the retained predicate review','scripts/rcap-packet-recovery/chat5/ky-nonconviction.mjs',(p,b)=>fs.writeFileSync(p,Buffer.concat([b,Buffer.from('\n// changed')])));
rejectFile('missing manual-completion instructions refuse',DIR+'/participant-instructions.md',(p,b)=>fs.writeFileSync(p,b.toString().replaceAll('SSN','REMOVED')));
rejectFile('truncated artifact inventory refuses',DIR+'/reports/rendered-artifacts.json',changeJson(i=>i.pdfs.pop()));
// Exercise the actual existing classifier after normalization, not only hashes.
test('adapter supplies source-bound per-fixture inputs to the original classifier',()=>{
 const r=auditKyNativeCandidate({root:ROOT,directory:DIR,familyId:FAMILY},inputs=>{prepared.push(structuredClone(inputs));return auditPreparedInputs(DIR,FAMILY,inputs);});assert.equal(r.result,'PASS_COMPLETE');assert.equal(prepared.length,13);
});
function classifier(name,fixture,edit,check){test(name,()=>{const input=structuredClone(prepared[fixture]);edit(input);check(auditPreparedInputs(DIR,FAMILY,input));});}
classifier('boundary missing phone is correctly permitted only with actual disclosure',1,i=>{},r=>assert.equal(r.counters.requiredFactsNotCollected,0));
classifier('held phone cannot be relabelled unknown in the same fixture',1,i=>{i.fieldMap.factMap={'AOC-497.2/phone number':'555-0142'};},r=>assert(r.counters.knownRequiredFieldsMissing>0));
classifier('removing actual private-field disclosure is caught by existing classifier',0,i=>i.instructions=i.instructions.replace(/ssn/gi,'MASKED'),r=>assert(r.counters.requiredFactsNotCollected>0));
classifier('removing selected order retains missing-component failure',1,i=>i.rendered.packets[0].documents=i.rendered.packets[0].documents.filter(x=>x!=='AOC-497'),r=>assert(r.counters.requiredComponentsMissing>0));
classifier('untyped source blank remains unclassified, not a blanket exception',0,i=>i.fieldMap.refusals.push({fieldId:'invented',label:'Unexplained',documentId:'AOC-497.2',reason:'No reason'}),r=>assert(r.counters.unclassifiedBlanks>0));
classifier('claimed signature write remains protected',0,i=>i.fieldMap.writes.push({fieldId:'Signature',label:'Signature',documentId:'AOC-497.2',value:'FORGED'}),r=>assert(r.counters.protectedWrites>0));
test('complete original source/output/helper preservation after all mutations',()=>{for(const [f,h] of Object.entries(originals))assert.equal(sha(fs.readFileSync(path.join(ROOT,f))),h);});
const report={scope:'exact static native-candidate integration; no new independent review, runtime-intake zero, renderer or admission',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,tests:results,actualCandidate:actual,originalInputFiles:51,allOriginalInputsPreserved:true,terminalPromotions:0,productionTouched:false};console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
