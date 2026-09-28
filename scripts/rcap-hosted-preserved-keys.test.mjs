import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
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
 assert.ok(job && deploy);
 for(const name of Object.keys(base)){
  assert.ok(Object.hasOwn(wf.on.workflow_call.secrets,name));
  assert.ok(job.secrets[name]==='${{ secrets.'+name+' }}');
  assert.ok(deploy.env[name]==='${{ secrets.'+name+' }}');
 }
});
}
