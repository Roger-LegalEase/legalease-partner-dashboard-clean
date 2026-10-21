#!/usr/bin/env node
// CHAT4-MD-01: test the actual validator, renderer, exported entry and CLI.
// No predicate copy, modified shared importer, network or live resource.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fixtures, validateMdFavorable, renderMdFavorable, ROOT, BASIS_FIELDS, sha256} from './md-favorable.mjs';
import {runFamily} from '../../build-census-v1-md_10105_favorable-set.mjs';
const results=[];
async function test(name,fn){await fn();results.push({name,result:'PASS'});}
const all=fixtures(), pbj=all['selectable/pbj'];
const change=(base,edit)=>{const x=structuredClone(base);edit(x);return x;};
const invalid=change(pbj,x=>x.case.probationDischargeDate='2019-01-01');
const refusal=/INCONSISTENT_PBJ_DATES/;
await test('exact CHAT4-MD-01 reproduction rejected without modifying input',()=>{
 const before=JSON.stringify(invalid);assert.throws(()=>validateMdFavorable(invalid),refusal);assert.equal(JSON.stringify(invalid),before);
});
for(const id of ['selectable/pbj','selectable/pbj-no-longer-crime','selectable/pbj-dui']){
 const base=all[id], entry=base.case.dispositionDate;
 const d=new Date(`${entry}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-1);const before=d.toISOString().slice(0,10);
 d.setUTCDate(d.getUTCDate()+2);const after=d.toISOString().slice(0,10);
 await test(`${id}: discharge one day before entry rejected`,()=>assert.throws(()=>validateMdFavorable(change(base,x=>x.case.probationDischargeDate=before)),refusal));
 for(const [label,discharge] of [['equal',entry],['after',after]])await test(`${id}: ${label} entry accepted without extra waiting rule`,()=>{
  const r=validateMdFavorable(change(base,x=>x.case.probationDischargeDate=discharge));assert.equal(r.mayMarkDisposition,true);
  const expected=id==='selectable/pbj-dui'?`${Number(discharge.slice(0,4))+15}${discharge.slice(4)}`:`${Number(entry.slice(0,4))+3}${entry.slice(4)}`;
  assert.equal(r.earliest,expected);
 });
 for(const field of ['dispositionDate','probationDischargeDate'])for(const [label,value] of [['absent',undefined],['null',null],['empty','']])await test(`${id}: ${field} ${label} stays disclosed and unmarkable`,async()=>{
  const f=change(base,x=>{if(value===undefined)delete x.case[field];else x.case[field]=value;if(field==='dispositionDate')for(const c of x.case.chargesInIncident){if(value===undefined)delete c.dispositionDate;else c.dispositionDate=value;}});
  const r=validateMdFavorable(f);assert.equal(r.mayMarkDisposition,false);assert(r.missing.some(x=>x.field===(field==='dispositionDate'?'Disposition date':'Probation discharge date')));
  const rendered=await renderMdFavorable(f);assert(!rendered.writes.some(w=>Object.values(BASIS_FIELDS).includes(w.field)));
 });
}
await test('later discharge beyond three-year anniversary remains controlling',()=>assert.equal(validateMdFavorable(all.boundary).earliest,'2026-09-07'));
await test('all 15 retained valid branches remain markable',()=>{assert.equal(Object.keys(all).length,15);for(const f of Object.values(all))assert.equal(validateMdFavorable(f).mayMarkDisposition,true);});
await test('renderer itself rejects exact contradictory input before bytes return',async()=>assert.rejects(renderMdFavorable(invalid),refusal));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'chat5-pbj-chronology-'));
try{
 const input=path.join(tmp,'invalid.json');fs.writeFileSync(input,JSON.stringify(invalid));
 const wrapper=path.join(ROOT,'scripts/build-census-v1-md_10105_favorable-set.mjs');
 for(const entry of ['exported runFamily','CLI'])for(const exists of [false,true])await test(`${entry}: invalid input emits no file and preserves ${exists?'existing':'absent'} destination`,async()=>{
  const out=path.join(tmp,`${entry==='CLI'?'cli':'export'}-${exists}`);
  if(exists){fs.mkdirSync(out);fs.writeFileSync(path.join(out,'existing-candidate.bin'),'unchanged retained bytes');}
  const snapshot=()=>fs.existsSync(out)?fs.readdirSync(out,{recursive:true}).sort().map(n=>[n,sha256(fs.readFileSync(path.join(out,n)))]):null;
  const before=snapshot();
  if(entry==='CLI'){const r=spawnSync(process.execPath,[wrapper,'--input',input,'--out',out],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,refusal);assert(!r.stdout.includes('rendererExecuted'));}
  else await assert.rejects(runFamily({inputFile:input,outDir:out}),refusal);
  assert.deepEqual(snapshot(),before);
 });
 await test('CLI valid equality input still emits complete four-page packet',async()=>{
  const equal=change(pbj,x=>x.case.probationDischargeDate=x.case.dispositionDate), p=path.join(tmp,'equal.json'),out=path.join(tmp,'valid');fs.writeFileSync(p,JSON.stringify(equal));
  const r=spawnSync(process.execPath,[wrapper,'--input',p,'--out',out],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).pages,4);assert(fs.existsSync(path.join(out,'fixtures/supplied.pdf')));
 });
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const result={familyId:'md_10105_favorable-set',finding:'CHAT4-MD-01',scope:'AUTHOR_DELTA_QA_NOT_INDEPENDENT_REVIEW',passed:results.length,failed:0,results};
if(process.argv[2]){fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result,null,2));
