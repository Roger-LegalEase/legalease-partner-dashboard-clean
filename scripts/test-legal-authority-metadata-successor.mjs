import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(), base='c2246711d82982cc41304c07be54a7d4b5583ce6';
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
const modulePath=root+'/src/lib/expungement-ai/packet-information.ts';
// Export the real fingerprint only in memory; no alternate hash implementation.
register('data:text/javascript,'+encodeURIComponent(`import{createRequire}from'node:module';let d,ts;export function initialize(x){d=x;ts=createRequire(d.root+'/package.json')('typescript')}export async function load(u,c,n){if(u!==d.url)return n(u,c);return{format:'module',shortCircuit:true,source:ts.transpileModule(d.source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}}`),{data:{root,url:pathToFileURL(modulePath).href,source:fs.readFileSync(modulePath,'utf8')+'\nexport {profileAuthorityFingerprint};'}});
const {legalAuthorityMetadataDraftSuccessor:successor,profileAuthorityFingerprint:fp}=await import(pathToFileURL(modulePath));
let checks=0;const rows=[];
for(const[name,route]of[
 ['GA-georgia','automatic-restriction-of-qualifying-post-july-1-2013-non-convictions'],
 ['MD-maryland','police-record-expungement-when-no-charge-was-filed-under-10-103'],
 ['MT-montana','non-conviction-criminal-history-removal-through-criss'],
 ['ND-north-dakota','non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05'],
 ['OK-oklahoma','clean-slate-automatic-expungement'],
 ['SC-south-carolina','diversion-or-program-completion-expungement']]){
 const file='src/lib/rcap-engine/compiled/profiles/'+name+'.json';
 const old=JSON.parse(execFileSync('git',['show',base+':'+file],{cwd:root})),profile=JSON.parse(fs.readFileSync(file));
 const before=fp(old,route),after=fp(profile,route);assert.notEqual(before,after);checks++;
 // Synthetic boundary records, not captured participant records. Full protected
 // consumers are exercised by the unchanged MD/OK/SC regression scripts.
 const snapshot={schemaVersion:'expungement-ai/protected-packet-draft/v1',jurisdiction:profile.jurisdiction.code,
  pathwayId:route,profileVersion:profile.profileVersion,profileSourceFingerprint:profile.source.sourceCorpusSha256,
  profileAuthorityFingerprint:before,paymentAllowed:false,resultCode:'guidance_only',
  screeningAnswers:{financial_obligations:'No',raw:[' A ',{unknown:true}]},prefilledAnswers:{court:'unchanged'},
  packetAnswers:{arrest_date:{value:'2018-08-25',unknown:false},note:'  literal\n'},
  dependencies:{semanticAnswerHistory:[{factId:'financial_obligations',value:{unknown:true},source:'packetAnswers'}]},
  capturedAt:'2026-10-19T00:00:00.000Z'};
 const authority={profile,evaluation:{pathwayId:route,paymentAllowed:false}};
 const bytes=JSON.stringify(snapshot);
 for(const status of ['unverified','invalidated']){
  const result=successor(snapshot,authority,status);assert(result);
  assert.equal(result.profileAuthorityFingerprint,after);
  assert.equal(JSON.stringify({...result,profileAuthorityFingerprint:before}),bytes,'entire snapshot except declared metadata is byte-identical');
  assert.equal(JSON.stringify(snapshot),bytes,'input never mutates');checks+=4;
 }
 for(const status of ['verified','final']){assert.equal(successor(snapshot,authority,status),null);checks++;}
 for(const[key,value]of [['profileAuthorityFingerprint','0'.repeat(64)],['profileSourceFingerprint','wrong'],['profileVersion','wrong'],['jurisdiction','VA'],['pathwayId','other'],['paymentAllowed',true],['schemaVersion','expungement-ai/packet-verification/v1']]){
  assert.equal(successor({...snapshot,[key]:value},authority,'unverified'),null,key);checks++;
 }
 const drift=structuredClone(authority);drift.profile.pathways.find(p=>p.id===route).summary+=' unapproved';
 assert.equal(successor(snapshot,drift,'unverified'),null,'new authority drift');checks++;
 assert.equal(successor(snapshot,{...authority,evaluation:{...authority.evaluation,paymentAllowed:true}},'unverified'),null);checks++;
 assert.equal(successor(snapshot,{...authority,evaluation:{...authority.evaluation,pathwayId:'other'}},'unverified'),null);checks++;
 assert.equal(successor({...snapshot,profileAuthorityFingerprint:after},authority,'unverified'),null,'not an unrestricted current-profile alias');checks++;
 rows.push({jurisdiction:profile.jurisdiction.code,pathwayId:route,priorSha256:before,newSha256:after});
}
console.log(JSON.stringify({status:'PASS',checks,rows,limits:'Synthetic tuple boundary checks; actual saved-answer consumers tested separately.'}));
