import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { sanitizeVercelDiagnostic } from "./rcap-hosted-vercel-diagnostics.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOY_SOURCE=fs.readFileSync(path.join(ROOT,"scripts/rcap-hosted-acceptance-deploy.mjs"),"utf8");

// Exercise actual preserved-key validation and deployment construction with
// synthetic inputs only; these tests never invoke the deployment entrypoint.
{
const s=DEPLOY_SOURCE, root=ROOT;
const start=s.indexOf('function preservedDataKeys(env) {');
const end=s.indexOf('const PRESERVED_DATA_KEYS = preservedDataKeys(process.env);',start);
assert.ok(start>0 && end>start);
const resolve=vm.runInNewContext('('+s.slice(start,end).trim()+')',{Buffer,Object,Error});
const base={HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY:crypto.randomBytes(32).toString('base64'),HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION:'v1',HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:crypto.randomBytes(32).toString('base64url')};

function check(name,fn){test('DS-08: '+name,fn);}
const expected=resolve(base);
for(const name of Object.keys(base))check('missing '+name+' refuses',()=>{const env={...base,HOSTED_CLINIC_DEMO_PASSWORD:"synthetic-old-password-with-required-length",SUPABASE_ACCESS_TOKEN:"synthetic-old-management-pat"};delete env[name];assert.throws(()=>resolve(env),/DEPLOY_PRESERVED_/);});
for(const key of ['', ' ', crypto.randomBytes(31).toString('base64'), base.HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY+'\n'])check('invalid encryption input refuses',()=>assert.throws(()=>resolve({...base,HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY:key}),/DEPLOY_PRESERVED_ENCRYPTION_KEY_REQUIRED/));
check('incorrect existing version refuses',()=>assert.throws(()=>resolve({...base,HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION:'v2'}),/VERSION_MISMATCH/));
check('short pseudonym refuses',()=>assert.throws(()=>resolve({...base,HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:'short'}),/PSEUDONYM_REQUIRED/));
for(const name of ['HOSTED_CLINIC_DEMO_PASSWORD','SUPABASE_ACCESS_TOKEN'])check(name+' change cannot change either key',()=>{
 for(const value of [undefined,'synthetic-old-credential-only','synthetic-new-credential-only']){
  const got=resolve({...base,[name]:value});
  assert.ok(Object.keys(expected).every(k=>got[k]===expected[k]));
 }
 const env={...base}; Object.defineProperty(env,name,{get(){throw Error('credential read forbidden');}});
 resolve(env);
});
check('pseudonym exact bytes preserved without normalization',()=>{const value=' '+base.HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET+' ';assert.ok(resolve({...base,HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:value}).PARTICIPANT_PRIVACY_PSEUDONYM_SECRET===value);});
check('old derivation and fallback absent',()=>{assert.ok(!s.includes('acceptanceServerSecret'));assert.ok(!s.includes('rcap-acceptance-server-secret:'));assert.ok(!s.includes('legal-aid-restricted-field-key/v1'));assert.ok(!s.includes('participant-privacy-pseudonym-secret/v1'));});
check('validation runs before first remote call',()=>assert.ok(s.indexOf('const PRESERVED_DATA_KEYS =')<s.indexOf('await resolveHostedVercelIdentity')));
const runtime=s.slice(s.indexOf('const runtimeEnv = {')+'const runtimeEnv = '.length,s.indexOf('\nconst buildEnv =')).trim().replace(/;$/,'');
check('actual runtime mapping is exact and build/metadata exclude keys',()=>{
 const got=vm.runInNewContext('('+runtime+')',{PRESERVED_DATA_KEYS:expected,RETURN_ORIGIN:'https://synthetic.invalid',SUPABASE_URL:'https://synthetic.invalid',keys:{anon:'synthetic',service:'synthetic'},process:{env:{}},CATALOG_PRODUCT_ID:'',ROUTE_STATE:'',CLINIC_DEMO_MODE:'',SCOPE_IDS:'',LEGAL_AID_EMAIL:null});
 assert.ok(Object.keys(expected).every(k=>got[k]===expected[k]));
 const build=s.slice(s.indexOf('const buildEnv ='),s.indexOf('// A live Stripe key'));
 const meta=s.slice(s.indexOf('const deploymentMeta ='),s.indexOf('let deploymentUrl ='));
 assert.ok(!/PRESERVED_DATA_KEYS|HOSTED_LEGAL_AID_RESTRICTED|HOSTED_PARTICIPANT_PRIVACY/.test(build+meta));
});
check('old ciphertext continuity and pseudonym identity survive credential changes',()=>{
 const iv=crypto.randomBytes(12),plain=Buffer.from('synthetic restricted data');
 const c=crypto.createCipheriv('aes-256-gcm',Buffer.from(expected.LEGAL_AID_RESTRICTED_FIELD_KEY,'base64'),iv);
 const enc=Buffer.concat([c.update(plain),c.final()]);
 const after=resolve({...base,HOSTED_CLINIC_DEMO_PASSWORD:'rotated-synthetic',SUPABASE_ACCESS_TOKEN:'rotated-synthetic'});
 const d=crypto.createDecipheriv('aes-256-gcm',Buffer.from(after.LEGAL_AID_RESTRICTED_FIELD_KEY,'base64'),iv);d.setAuthTag(c.getAuthTag());
 assert.ok(Buffer.concat([d.update(enc),d.final()]).equals(plain));
 const pseudonym=k=>crypto.createHmac('sha256',k).update('synthetic-owner').digest();
 assert.ok(pseudonym(expected.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET).equals(pseudonym(after.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET)));
});
check('failure diagnostics redact both held preserved keys',()=>{
 const keys=[expected.LEGAL_AID_RESTRICTED_FIELD_KEY,expected.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET];
 const diagnostic=sanitizeVercelDiagnostic({error:{code:'BUILD_FAILED',message:keys.join(' ')}},keys);
 const text=JSON.stringify(diagnostic);
 assert.ok(keys.every(k=>!text.includes(k)));
});
check('metadata-only reuse refuses',()=>assert.ok(s.includes('if (reusable) throw new Error("DEPLOY_REUSE_PRESERVED_KEY_CONTINUITY_UNPROVEN")')));
const yaml=createRequire(import.meta.url)('yaml');
const wf=yaml.parse(fs.readFileSync(path.join(root,'.github/workflows/rcap-hosted-acceptance-staging.yml'),'utf8'));
const caller=yaml.parse(fs.readFileSync(path.join(root,'.github/workflows/rcap-f1-ephemeral-staging.yml'),'utf8'));
check('caller to reusable to deploy passes all three reviewed inputs',()=>{
 const job=Object.values(caller.jobs).find(j=>j.uses?.includes('rcap-hosted-acceptance-staging.yml'));
 const steps=Object.values(wf.jobs).flatMap(j=>j.steps||[]);
 const deploy=steps.find(x=>x.run==='node scripts/rcap-hosted-acceptance-deploy.mjs');
 const bootstrap=steps.find(x=>x.id==='preserved_acceptance_keys');
 assert.ok(job && deploy && bootstrap);
 assert.ok(steps.indexOf(bootstrap)<steps.indexOf(deploy));
 assert.equal(bootstrap.if,deploy.if);
 for(const name of Object.keys(base)){
  assert.ok(Object.hasOwn(wf.on.workflow_call.secrets,name));
  assert.ok(job.secrets[name]==='${{ secrets.'+name+' }}');
  assert.ok(bootstrap.env[name]==='${{ secrets.'+name+' }}');
  assert.ok(!Object.hasOwn(deploy.env,name), 'deploy must inherit GITHUB_ENV without empty-secret overrides');
 }
});
}

// Execute the workflow's actual inline bootstrap. Provider/file/log interfaces
// are in-memory fakes; no real credentials, runner files, or network are used.
{
const yaml=createRequire(import.meta.url)('yaml');
const workflow=yaml.parse(fs.readFileSync(path.join(ROOT,'.github/workflows/rcap-hosted-acceptance-staging.yml'),'utf8'));
const step=Object.values(workflow.jobs).flatMap(j=>j.steps||[]).find(s=>s.id==='preserved_acceptance_keys');
const code=step.run.split("<<'NODE'\n")[1].replace(/\nNODE\s*$/,'').replace(/^import .*;\n/gm,'');
const names=['HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY','HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'];
const password='synthetic-unchanged-demo-password-for-continuity';
const explicit={
 HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY:crypto.randomBytes(32).toString('base64'),
 HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION:'v1',
 HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:crypto.randomBytes(32).toString('base64url')
};
function bootstrap(overrides={},pat='synthetic-current-pat') {
 const masks=[],writes=[],logs=[];let file='',derivations=0,patReads=0,error=null;
 const env={GITHUB_ACTIONS:'true',ACCEPTANCE_SUPABASE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia',GITHUB_ENV:'/synthetic/github-env',HOSTED_CLINIC_DEMO_PASSWORD:password,...overrides};
 Object.defineProperty(env,'SUPABASE_ACCESS_TOKEN',{get(){patReads++;return pat;}});
 // Observe any PAT access without logging its synthetic value.
 const context={process:{env},createHmac:(...args)=>{derivations++;return crypto.createHmac(...args);},randomUUID:crypto.randomUUID,
  console:{log:value=>{
   assert.ok(value.startsWith('::add-mask::'),'only masking commands may be emitted');
   masks.push(value.slice('::add-mask::'.length).replaceAll('%0D','\r').replaceAll('%0A','\n').replaceAll('%25','%'));
   // GitHub consumes masking commands; they are not visible log messages.
  }},
  appendFileSync:(target,value)=>{assert.equal(target,'/synthetic/github-env');assert.equal(masks.length,3,'all masks must precede any export');writes.push(target);file+=value;}
 };
 try{vm.runInNewContext(code,context);}catch(e){error=e.message;}
 const exported={};
 if(!error){
  const blocks=file.matchAll(/([^\n]+)<<([^\n]+)\n([\s\S]*?)\n\2\n/g);
  for(const [,name,,value] of blocks)exported[name]=value;
  assert.ok(names.every(name=>masks.includes(exported[name])),'every exported value must already be masked');
 }
 return {error,exported,masks,writes,logs,derivations,patReads};
}
test('DS-08 runner bootstrap: all explicit values win unchanged without a password or derivation',()=>{
 const r=bootstrap({...explicit,HOSTED_CLINIC_DEMO_PASSWORD:undefined});assert.equal(r.error,null);assert.equal(r.derivations,0);
 assert.ok(names.every(n=>r.exported[n]===explicit[n]));
});
test('DS-08 runner bootstrap: all absent matches actual pre-DS-08 helper bytes',()=>{
 const prior=execFileSync('git',['show','5e04eafd7eaed7e71722862e651fb787ebbd296d:scripts/rcap-hosted-acceptance-deploy.mjs'],{cwd:ROOT,encoding:'utf8'});
 const declaration=prior.slice(prior.indexOf('function acceptanceServerSecret('),prior.indexOf('function syntheticPassword(')).trim();
 const historical=vm.runInNewContext('('+declaration+')',{crypto,CLINIC_DEMO_PASSWORD:password,SUPABASE_ACCESS_TOKEN:'unused',PROJECT_REF:'hyflxnlhpmiqxvvcoiia'});
 for(const absent of [{},Object.fromEntries(names.map(n=>[n,'']))]){
  const r=bootstrap(absent);assert.equal(r.error,null);assert.equal(r.derivations,2);
  assert.ok(r.exported[names[0]]===historical('legal-aid-restricted-field-key/v1',32).toString('base64'));
  assert.equal(r.exported[names[1]],'v1');
  assert.ok(r.exported[names[2]]===historical('participant-privacy-pseudonym-secret/v1',32).toString('base64url'));
 }
});
test('DS-08 runner bootstrap: all six partial configurations refuse before derivation or export',()=>{
 for(let bits=1;bits<7;bits++){
  const r=bootstrap(Object.fromEntries(names.map((n,i)=>[n,bits&(1<<i)?explicit[n]:''])));
  assert.equal(r.error,'DS08_CONTINUITY_PARTIAL_PRESERVED_INPUTS');assert.equal(r.derivations,0);assert.equal(r.writes.length,0);assert.equal(r.masks.length,0);
 }
});
test('DS-08 runner bootstrap: absent or short password refuses without PAT fallback',()=>{
 for(const value of [undefined,'','x'.repeat(19)]){
  const r=bootstrap({HOSTED_CLINIC_DEMO_PASSWORD:value});assert.equal(r.error,'DS08_CONTINUITY_DEMO_PASSWORD_TOO_SHORT');assert.equal(r.derivations,0);assert.equal(r.writes.length,0);
 }
 assert.equal(bootstrap({HOSTED_CLINIC_DEMO_PASSWORD:'x'.repeat(20)}).error,null);
 assert.ok(!code.includes('SUPABASE_ACCESS_TOKEN'));
});
test('DS-08 runner bootstrap: current PAT is never read and changing it cannot affect keys',()=>{
 const a=bootstrap({},'synthetic-old-pat'),b=bootstrap({},'synthetic-new-pat');
 assert.equal(a.error,null);assert.equal(b.error,null);assert.equal(a.patReads,0);assert.equal(b.patReads,0);assert.ok(names.every(n=>a.exported[n]===b.exported[n]));
});
test('DS-08 runner bootstrap: wrong project, non-Actions execution and missing env path refuse',()=>{
 for(const change of [{GITHUB_ACTIONS:'false'},{ACCEPTANCE_SUPABASE_PROJECT_REF:'wrong-project'},{GITHUB_ENV:''}]){
  const r=bootstrap(change);assert.equal(r.error,'DS08_CONTINUITY_RUNNER_TARGET_REQUIRED');assert.equal(r.derivations,0);assert.equal(r.writes.length,0);
 }
});
test('DS-08 runner bootstrap: masks precede env exports with no log, output or evidence channel',()=>{
 const r=bootstrap();assert.equal(r.error,null);assert.equal(r.masks.length,3);assert.equal(r.writes.length,3);assert.equal(r.logs.length,0);
 assert.ok(!/GITHUB_OUTPUT|GITHUB_STEP_SUMMARY|JSON\.stringify|writeFileSync|createHash/.test(code));
 const unusual='preserved%value\n::warning::not-a-command\rstill-preserved';
 const e=bootstrap({...explicit,HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:unusual});
 assert.equal(e.error,null);assert.ok(e.exported[names[2]]===unusual);assert.ok(e.masks.includes(unusual));
});
}
