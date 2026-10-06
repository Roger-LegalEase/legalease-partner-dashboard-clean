import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const names=['LEGAL_AID_RESTRICTED_FIELD_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'];
for(let mask=0;mask<8;mask++)test(`create only missing names, never overwrite: presence mask ${mask}`,()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-key-replay-'));
 try{
  fs.symlinkSync(path.join(root,'data'),path.join(dir,'data'),'dir');
  const hook=path.join(dir,'fetch.mjs');
  fs.writeFileSync(hook,`import assert from 'node:assert/strict';
const names=${JSON.stringify(names)},mask=${mask};
let envs=names.filter((_,i)=>mask&(1<<i)).map((key)=>({key,id:key,type:key.endsWith('_VERSION')?'plain':'sensitive',target:['production'],value:'MUST_NOT_PERSIST'}));
let writes=0;
globalThis.fetch=async(url,options={})=>{
 const u=new URL(url);assert.equal(u.origin,'https://api.vercel.com');assert.equal(u.searchParams.get('teamId'),'team_4qLmZK9WI6xIy5vjYC0IF3ae');
 let body;
 if(u.pathname==='/v9/projects/legalease-partner-dashboard-clean')body={id:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',name:'legalease-partner-dashboard-clean',accountId:'team_4qLmZK9WI6xIy5vjYC0IF3ae'};
 else if(options.method==='GET'){assert.equal(u.searchParams.get('decrypt'),'false');body={envs};}
 else {assert.equal(options.method,'POST');assert.equal(u.pathname,'/v10/projects/prj_cdgwGzFqIHgEUlzEburSLaZETdQV/env');assert.equal(u.searchParams.get('upsert'),'false');
  assert.equal(++writes,1);const items=JSON.parse(options.body);assert.deepEqual(items.map(x=>x.key),names.filter((_,i)=>!(mask&(1<<i))));
  for(const item of items){assert.deepEqual(item.target,['production']);assert.ok(item.value);assert.ok(!envs.some(x=>x.key===item.key));}
  const created=items.map(x=>({...x,id:x.key}));envs.push(...created);body={created,failed:[]};
 }
 return {status:200,ok:true,text:async()=>JSON.stringify(body)};
};
process.on('exit',()=>assert.equal(writes,mask===7?0:1));
`);
  const result=spawnSync(process.execPath,['--import',hook,path.join(root,'scripts/rcap-production-legal-aid-keys.mjs')],{cwd:dir,encoding:'utf8',env:{PATH:process.env.PATH,RCAP_LEGAL_AID_KEYS_PHASE:'create',VERCEL_TOKEN:'local-test-no-service'}});
  assert.equal(result.status,0,result.stdout+result.stderr);
  const bytes=fs.readFileSync(path.join(dir,'production-canary-evidence/production-legal-aid-keys-create.json'),'utf8');
  assert.ok(!bytes.includes('MUST_NOT_PERSIST'));assert.ok(!bytes.includes('local-test-no-service'));
  const receipt=JSON.parse(bytes);assert.equal(receipt.passed,true);assert.equal(receipt.environmentVariableOverwritten,false);
  assert.equal(receipt.environmentVariableCreated,mask!==7);
  assert.deepEqual(receipt.observed.after.map(x=>x.key).sort(),names.slice().sort());
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
for(const problem of ['duplicate-key','duplicate-pseudonym','plain-key','plain-pseudonym'])test(`${problem} refuses before any creation`,()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-key-refusal-'));
 try{
  fs.symlinkSync(path.join(root,'data'),path.join(dir,'data'),'dir');
  const hook=path.join(dir,'fetch.mjs');
  const name=problem.endsWith('pseudonym')?names[2]:names[0];
  const entry={key:name,id:'existing',type:problem.startsWith('plain')?'plain':'sensitive',target:['production']};
  fs.writeFileSync(hook,`import assert from 'node:assert/strict';globalThis.fetch=async(url,o={})=>{assert.equal(o.method??'GET','GET','no write permitted');const body=url.includes('/env?')?{envs:${JSON.stringify(problem.startsWith('duplicate')?[entry,{...entry,id:'duplicate'}]:[entry])}}:{id:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',name:'legalease-partner-dashboard-clean',accountId:'team_4qLmZK9WI6xIy5vjYC0IF3ae'};return {status:200,ok:true,text:async()=>JSON.stringify(body)};};`);
  const r=spawnSync(process.execPath,['--import',hook,path.join(root,'scripts/rcap-production-legal-aid-keys.mjs')],{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,RCAP_LEGAL_AID_KEYS_PHASE:'create',VERCEL_TOKEN:'local-test-no-service'}});
  assert.equal(r.status,1);
  const receipt=JSON.parse(fs.readFileSync(path.join(dir,'production-canary-evidence/production-legal-aid-keys-create.json')));
  assert.equal(receipt.failure,'existing_production_key_shape_is_safe');assert.equal(receipt.environmentVariableCreated,false);assert.equal(receipt.environmentVariableOverwritten,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
