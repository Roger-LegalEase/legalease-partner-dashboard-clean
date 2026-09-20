#!/usr/bin/env node
// Execute the real existing completeness reader. Its four source-actor findings
// are retained as an integration requirement, never relabeled packet approval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {ROOT,OUT,FAMILY} from './ga-pre2013.mjs';
const base=path.join(ROOT,OUT), results=[];
const actual=auditFamily(OUT,FAMILY);
function test(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
test('real candidate imports 52 fields, preserving four exact source-actor findings',()=>{
 assert.equal(actual.auditable,true);assert.equal(actual.sourceCurrentness,'EXACT');
 assert.equal(actual.totals.terminalFields,52);assert.equal(actual.totals.written,13);
 assert.equal(actual.result,'FAIL_MISSING_REQUIRED_FACTS');
 assert.deepEqual(actual.findings.map(x=>x.field),['agency.3','agency.4','prosecutor.2','prosecutor.9']);
 assert.equal(actual.counters.knownRequiredFieldsMissing,4);
});
const parent=path.join(ROOT,'data/rcap-grade-a/chat-parallel-2026-09-07/chat5-build');fs.mkdirSync(parent,{recursive:true});
const temp=fs.mkdtempSync(path.join(parent,'.ga-importer-test-'));
function mutated(name,edit,verify){test(name,()=>{const folder=path.join(temp,String(results.length));fs.cpSync(base,folder,{recursive:true});const change=(rel,fn)=>{const p=path.join(folder,rel);const v=JSON.parse(fs.readFileSync(p));fn(v);fs.writeFileSync(p,JSON.stringify(v));};edit(change,folder);verify(auditFamily(path.relative(ROOT,folder),FAMILY));});}
try{
 mutated('does not excuse blank applicant arresting agency',change=>change('production-field-map.json',m=>{const i=m.writes.findIndex(w=>w.fieldId==='case.arrestingAgency');assert(i>=0);const [w]=m.writes.splice(i,1);m.refusals.push({...w,reason:'Claimed official ownership',completenessClass:'court_prosecutor_clerk_or_agency_owned'});}),r=>{assert(r.findings.some(x=>x.field==='case.arrestingAgency'));assert(r.counters.knownRequiredFieldsMissing>actual.counters.knownRequiredFieldsMissing);});
 mutated('detects signature write in map',change=>change('production-field-map.json',m=>m.writes.push({fieldId:'forged-signature',label:'Signature',page:2,documentId:m.writes[0].documentId,value:'Jordan Ellis'})),r=>assert(r.counters.protectedWrites>0));
 mutated('detects omitted manual-SSN disclosure',(_change,folder)=>{const p=path.join(folder,'participant-instructions.md');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('Social Security Number','private field'));},r=>assert(r.counters.requiredFactsNotCollected>0));
 mutated('detects absent official source component in inventory',change=>change('reports/rendered-artifacts.json',m=>{m.artifacts=m.artifacts.map(x=>({...x,documents:[]}));m.packets=m.packets.map(x=>({...x,documents:[]}));}),r=>assert(r.counters.requiredComponentsMissing>0));
 mutated('detects finalizer writes without glyph evidence',change=>change('reports/actual-writes.json',m=>m.artifacts.forEach(x=>{x.addedGlyphsReadFromOutputBytes=0;})),r=>assert(r.counters.invisibleWrites>0));
 mutated('detects actual-report protected region ink',change=>change('reports/actual-writes.json',m=>{m.artifacts[0].refusedFieldsWithInk=['prosecutor.9'];}),r=>assert(r.counters.protectedWrites>0));
 mutated('detects receipt reporting inexact source',change=>change('source-receipt.json',m=>{m.allSourcesExact=false;}),r=>assert.equal(r.sourceCurrentness,'NOT_EXACT'));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const report={schemaVersion:'chat5-ga-real-importer-controls/v1',familyId:FAMILY,actualReaderExecuted:true,actualCandidateResult:actual,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,tests:results,packetAccepted:false,remainingRequirement:'A source-actor reconciliation: comment5574431671; no shared reader change made.'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
