import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';

const root=process.cwd();
const base='ff85fd0d8ea131a9885885ebde308611bda9c152';
const innerSha='4e18b47b2c45f06a241d1565fb5b43a45354330184f0d7a9f2ac81ec10d34bf6';
const inner=execFileSync('python3',['-c',"import sys,zipfile; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read('production-canary-smoke.json'))",'hosted-acceptance-evidence/production-smoke-36779982696/11127253731.zip']);
assert.equal(createHash('sha256').update(inner).digest('hex'),innerSha);
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function verify(cwd){return spawnSync(process.execPath,['scripts/grade-a-launch-control/verify-release-candidate-binding.mjs'],{cwd,encoding:'utf8'});}
function current(cwd){const r=verify(cwd);assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/status\s*: CURRENT/);}
function resolveSmoke(cwd,file){
 const source=fs.readFileSync(path.join(cwd,'scripts/rcap-production-activate.mjs'),'utf8');
 const start=source.indexOf('const SMOKE_FILE ='),end=source.indexOf('const EVIDENCE_DIR =',start);
 assert.ok(start>=0&&end>start);
 // Execute only the unchanged file-resolution declaration. No runtime imports,
 // network client, token, promotion or main() is evaluated.
 const context={path,process:{env:{RCAP_PRODUCTION_SMOKE_EVIDENCE_FILE:file}}};
 vm.runInNewContext(source.slice(start,end)+';globalThis.file=SMOKE_FILE;',context);
 assert.equal(context.file,file);assert.deepEqual(fs.readFileSync(context.file),inner);
 assert.equal(createHash('sha256').update(fs.readFileSync(context.file)).digest('hex'),innerSha);
}

test('exact Captain reproduces the real untracked-artifact refusal; identical external evidence preserves CURRENT',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-activation-isolation-'));
 const checkout=path.join(temp,'checkout'),external=path.join(temp,'external','production-canary-smoke.json');
 let added=false;
 try{
  git(root,'worktree','add','--quiet','--detach',checkout,base);added=true;
  fs.symlinkSync(fs.realpathSync(path.join(root,'node_modules')),path.join(checkout,'node_modules'),'dir');
  assert.equal(git(checkout,'rev-parse','HEAD'),base);assert.equal(git(checkout,'status','--short'),'');
  current(checkout);
  const local=path.join(checkout,'prior-production-smoke-evidence','production-canary-smoke.json');
  fs.mkdirSync(path.dirname(local));fs.writeFileSync(local,inner);
  assert.equal(git(checkout,'ls-files','--others','--exclude-standard'),'prior-production-smoke-evidence/production-canary-smoke.json');
  const refusal=verify(checkout);assert.notEqual(refusal.status,0);assert.match(refusal.stdout+refusal.stderr,/exact activation authorization paths/);
  fs.unlinkSync(local);fs.rmdirSync(path.dirname(local));
  fs.mkdirSync(path.dirname(external));fs.writeFileSync(external,inner);
  assert.equal(git(checkout,'status','--short'),'');current(checkout);resolveSmoke(checkout,external);
 }finally{
  if(added)git(root,'worktree','remove',checkout);
  fs.rmSync(temp,{recursive:true,force:true});
 }
});

test('corrected workflow ordering keeps real currentness CURRENT after staging exact external smoke bytes',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-activation-runner-temp-'));
 try{
  const before=git(root,'ls-files','--others','--exclude-standard');
  current(root);
  const workflow=parse(fs.readFileSync('.github/workflows/rcap-production-canary.yml','utf8'));
  const steps=workflow.jobs.preflight.steps;
  const download=steps.find(s=>s.name==='Download the exact successful Production smoke evidence');
  const activation=steps.find(s=>s.name==='Activate the exact staged Production deployment with rollback protection');
  const expand=value=>value.replaceAll('${{ runner.temp }}',temp).replaceAll('${{ env.PRODUCTION_SMOKE_RUN_ID }}','36779982696');
  const destination=expand(download.with.path),file=expand(activation.env.RCAP_PRODUCTION_SMOKE_EVIDENCE_FILE);
  assert.equal(path.relative(temp,destination),'rcap-production-smoke-36779982696');
  assert.equal(file,path.join(destination,'production-canary-smoke.json'));
  assert.equal(download.with['run-id'],'${{ env.PRODUCTION_SMOKE_RUN_ID }}');
  assert.equal(expand(download.with.name),'rcap-production-smoke-36779982696');
  assert.ok(steps.findIndex(s=>s.run?.includes('node scripts/rcap-production-migration-contract.mjs'))<steps.indexOf(download));
  assert.ok(steps.indexOf(download)<steps.indexOf(activation));
  fs.mkdirSync(destination);fs.writeFileSync(file,inner);
  assert.equal(git(root,'ls-files','--others','--exclude-standard'),before);
  assert.equal(fs.existsSync('prior-production-smoke-evidence/production-canary-smoke.json'),false);
  current(root);resolveSmoke(root,file);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
