import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {register} from 'node:module';
import {spawnSync} from 'node:child_process';
// Fresh-process control for the VA victim guard's imported memo: the guard hashes the imported
// data/record-clearing/legal-design-intake/VA.memo.json once per process, so a tampered memo must be
// refused by a process that first sees it tampered, and accepted by a process that sees the exact
// bytes. The child serves a tampered copy of the memo module to the loader; no file on disk changes.
const root=process.cwd(),MEMO='data/record-clearing/legal-design-intake/VA.memo.json';
if(process.env.RCAP_VA_MEMO_CONTROL){
  register('./lib/ts-esm-loader.mjs',import.meta.url);
  if(process.env.RCAP_VA_MEMO_CONTROL==='tampered'){
    const tampered=JSON.stringify({...JSON.parse(fs.readFileSync(path.join(root,MEMO),'utf8')),unreviewedChange:true});
    register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"json",source:d.source,shortCircuit:true}:n(u,c)}')+'#va-memo-control',{data:{url:pathToFileURL(path.join(root,MEMO)).href,source:tampered}});
  }
  const {virginiaVictimQuestionContract}=await import(pathToFileURL(path.join(root,'src/lib/rcap-engine/virginia-victim-question.ts')).href);
  const {getProfileByJurisdiction}=await import(pathToFileURL(path.join(root,'src/lib/rcap-engine/profile-registry.ts')).href);
  const profile=getProfileByJurisdiction('VA');
  // Two calls: the second reads the per-process memo, so a stale or hard-coded hash would show here.
  console.log(JSON.stringify({control:process.env.RCAP_VA_MEMO_CONTROL,first:virginiaVictimQuestionContract(profile),second:virginiaVictimQuestionContract(profile)}));
  process.exit(0);
}
const run=control=>{const r=spawnSync(process.execPath,[process.argv[1]],{cwd:root,encoding:'utf8',env:{...process.env,RCAP_VA_MEMO_CONTROL:control}});assert.equal(r.status,0,control+' child exited '+r.status+': '+r.stderr.slice(-800));return JSON.parse(r.stdout.trim().split('\n').pop());};
const exact=run('exact'),tampered=run('tampered');
assert.deepEqual(exact,{control:'exact',first:true,second:true},'exact memo bytes must be accepted in a fresh process');
assert.deepEqual(tampered,{control:'tampered',first:false,second:false},'a tampered memo must be refused by every call in a fresh process');
console.log(JSON.stringify({status:'PASS_VA_VICTIM_MEMO_FRESH_PROCESS_CONTROLS',checks:4,exact,tampered}));
