import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {prepareVerifierCorrection,verifyClosureControl,VERIFIER_CORRECTION_BASE,VERIFIER_CORRECTION_PATHS} from './preview-closure-control.mjs';

test('exact verifier successor preserves native authority and refuses unbound or mutated corrections',async t=>{
 const origin=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-verifier-correction-'));
 const records=['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'].map(n=>`data/rcap-grade-a/launch-control/${n}.json`);
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024}).trim();
 const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel)));
 const write=(rel,value)=>{fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.writeFileSync(path.join(root,rel),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
 const commit=()=>{git('-c','user.name=Synthetic Verifier Test','-c','user.email=synthetic@example.invalid','commit','--quiet','-m','synthetic bounded verifier correction');return git('rev-parse','HEAD');};
 try{
  execFileSync('git',['clone','--quiet','--shared','--no-checkout',origin,root]);
  const old=JSON.parse(git('show',`${VERIFIER_CORRECTION_BASE}:${records[1]}`));
  git('sparse-checkout','init','--no-cone');
  git('sparse-checkout','set','--no-cone',...[...new Set([...records,...Object.keys(old.closureControl.files),...VERIFIER_CORRECTION_PATHS])].map(p=>'/'+p));
  git('checkout','--quiet','--detach',VERIFIER_CORRECTION_BASE);
  const prior=Object.fromEntries(records.map(p=>[p,read(p)]));
  for(const rel of VERIFIER_CORRECTION_PATHS)write(rel,fs.readFileSync(path.join(origin,rel),'utf8'));
  git('add','--sparse','--',...VERIFIER_CORRECTION_PATHS);const sourceSha=commit();
  const correction=prepareVerifierCorrection(root,{predecessorSha:VERIFIER_CORRECTION_BASE,sourceSha});
  const restore=()=>{for(const rel of records)write(rel,{...prior[rel],verifierCorrection:correction});};
  restore();git('add','--sparse','--',...records);commit();
  const check=()=>verifyClosureControl(root,read(records[1]));
  await t.test('positive exact correction retains all original records and native receipt',()=>{
   const verified=check();for(const rel of VERIFIER_CORRECTION_PATHS)assert(verified.has(rel));
   for(const rel of records){const {verifierCorrection,...unchanged}=read(rel);assert.deepEqual(unchanged,prior[rel]);assert.deepEqual(verifierCorrection,correction);}
   assert.equal(read(records[1]).hostedAdmission.runId,40236198602);
   assert.equal(read(records[1]).productionAuthorized,false);
  });
  for(const [name,mutate] of [
   ['missing manifest',r=>{delete r.verifierCorrection;}],
   ['wrong predecessor',r=>{r.verifierCorrection.predecessorSha='0'.repeat(40);}],
   ['wrong source',r=>{r.verifierCorrection.sourceSha=VERIFIER_CORRECTION_BASE;}],
   ['altered before hash',r=>{r.verifierCorrection.files[VERIFIER_CORRECTION_PATHS[0]].before.sha256='0'.repeat(64);}],
   ['altered after hash',r=>{r.verifierCorrection.files[VERIFIER_CORRECTION_PATHS[0]].after.sha256='0'.repeat(64);}],
   ['altered mode',r=>{r.verifierCorrection.files[VERIFIER_CORRECTION_PATHS[0]].after.mode='100755';}],
   ['altered native admission',r=>{r.hostedAdmission.runId=40239937629;}],
   ['Production authority expansion',r=>{r.productionAuthorized=true;}],
   ['different frozen application',r=>{r.applicationSha='0'.repeat(40);}],
   ['unknown record field',r=>{r.unreviewedPermission=true;}],
  ])await t.test(name+' refuses',()=>{try{const r=read(records[1]);mutate(r);write(records[1],r);assert.throws(check);}finally{restore();}});
  await t.test('inconsistent companion record refuses',()=>{try{const r=read(records[2]);delete r.verifierCorrection;write(records[2],r);assert.throws(check);}finally{restore();}});
  for(const rel of [...VERIFIER_CORRECTION_PATHS,'.github/workflows/rcap-f1-ephemeral-staging.yml'])await t.test('working drift refuses '+rel,()=>{
   const file=path.join(root,rel),before=fs.readFileSync(file);try{fs.appendFileSync(file,'\n// unbound drift\n');assert.throws(check);}finally{fs.writeFileSync(file,before);}
  });
  await t.test('untracked input refuses',()=>{
   const rel='scripts/untracked-verifier-extra.mjs';try{write(rel,'export const unknown=true;\n');assert.throws(check,/untracked/);}finally{fs.unlinkSync(path.join(root,rel));}
  });
  await t.test('working mode drift refuses',()=>{
   const file=path.join(root,VERIFIER_CORRECTION_PATHS[0]);try{fs.chmodSync(file,0o755);assert.throws(check,/HEAD|working/);}finally{fs.chmodSync(file,0o644);}
  });
  await t.test('committed drift cannot hide behind restored working bytes',()=>{
   const rel=VERIFIER_CORRECTION_PATHS[0],before=fs.readFileSync(path.join(root,rel),'utf8');
   write(rel,before+'\n// committed unreviewed drift\n');git('add','--sparse','--',rel);commit();write(rel,before);
   assert.throws(check,/HEAD/);git('add','--sparse','--',rel);commit();check();
  });
  for(const rel of ['scripts/rcap-hosted-acceptance-deploy.mjs',records[1]])await t.test('unrelated committed drift cannot hide behind working restoration '+rel,()=>{
   const before=fs.readFileSync(path.join(root,rel),'utf8');
   write(rel,rel.endsWith('.json')?{...JSON.parse(before),productionAuthorized:true}:before+'\n// unrelated committed drift\n');
   git('add','--sparse','--',rel);commit();write(rel,before);assert.throws(check,/committed|HEAD/);
   git('add','--sparse','--',rel);commit();check();
  });
  await t.test('working executable mode refuses even when Git filemode comparison is disabled',()=>{
   const file=path.join(root,VERIFIER_CORRECTION_PATHS[0]);git('config','core.filemode','false');
   try{fs.chmodSync(file,0o755);assert.throws(check,/working mode/);}finally{fs.chmodSync(file,0o644);git('config','core.filemode','true');}
  });
  await t.test('unreviewed source path refuses before manifest preparation',()=>{
   write('scripts/unreviewed-verifier-extra.mjs','export const unauthorized=true;\n');git('add','--sparse','--','scripts/unreviewed-verifier-extra.mjs');const bad=commit();
   assert.throws(()=>prepareVerifierCorrection(root,{predecessorSha:VERIFIER_CORRECTION_BASE,sourceSha:bad}),/exact three/);
   assert.throws(check,/unrelated/);
  });
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
