import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync(new URL('./rcap-hosted-acceptance-deploy.mjs',import.meta.url),'utf8');
const original=execFileSync('git',['show','9fe0ea17727339755c10e73c06adb34215ba2a0e:scripts/rcap-hosted-acceptance-deploy.mjs'],{encoding:'utf8',cwd:new URL('..',import.meta.url)});
const grantText=execFileSync('git',['show','f0ceb5b2:data/record-clearing/legal-decisions/2026-10-24-ms-nonconv-ordinary-internal-qa.json'],{encoding:'utf8',cwd:new URL('..',import.meta.url)});
const grant=JSON.parse(grantText);
const sha='828de28b383715d545d4eead791f9d80a237447b';
const binding={schema:'rcap-partner-acceptance-launch/v1',applicationSha:sha,projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',supabaseProjectRef:'hyflxnlhpmiqxvvcoiia',partnerSlug:'legalease-ordinary-qa-20261024',adminAuthUserId:'6574d21e-5e0a-4567-b14e-01447c162f37'};
function context(phase='managed_start_preview') {
 return {APPLICATION_SHA:sha,PROJECT_REF:binding.supabaseProjectRef,EXPECTED_PROJECT_REF:binding.supabaseProjectRef,
  ROUTE_STATE:phase==='managed_start_preview'?'staging_scoped':'',SCOPE_IDS:phase==='managed_start_preview'?grant.participantUserIds.join(','):'',CLINIC_DEMO_MODE:'',ISOLATED_CLINIC_PREVIEW:false,LEGAL_AID_EMAIL:null,CATALOG_PRODUCT_ID:'',configuredSandboxEnv:null,
  RETURN_ORIGIN:'https://rcap-acceptance-synthetic.vercel.app',SUPABASE_URL:`https://${binding.supabaseProjectRef}.supabase.co`,
  keys:{anon:'synthetic-anon',service:'synthetic-service'},PRESERVED_DATA_KEYS:{LEGAL_AID_RESTRICTED_FIELD_KEY:'synthetic-data-key',LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION:'v1',PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:'synthetic-pseudonym'},
  rootDir:'/synthetic-reviewed-checkout',sha256:value=>crypto.createHash('sha256').update(String(value)).digest('hex'),
  execFileSync:(command,args)=>{assert.equal(command,'git');assert.deepEqual(Array.from(args),['show',`${sha}:data/record-clearing/legal-decisions/2026-10-24-ms-nonconv-ordinary-internal-qa.json`]);return grantText;},
  process:{env:{PHASE_INPUT:phase,HOSTED_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:JSON.stringify(binding),VERCEL_AUTOMATION_BYPASS_SECRET:'synthetic-private-bypass'}}};
}
function readBinding(s,c) {
 const start=s.indexOf('const MANAGED_START =');
 return start<0?null:vm.runInNewContext(s.slice(start,s.indexOf('const VERCEL_IDENTITY',start))+'\nMANAGED_START;',c);
}
function maps(s,c) {
 c.MANAGED_START=readBinding(s,c);
 return JSON.parse(vm.runInNewContext(s.slice(s.indexOf('const closedPreviewEnv ='),s.indexOf('// A live Stripe key'))+'\nJSON.stringify({runtimeEnv,buildEnv});',c));
}
test('managed maps bind exact source in build and runtime and keep authority private',()=>{
 const c=context(),{runtimeEnv:r,buildEnv:b}=maps(source,c);
 for(const env of [r,b]) {
  assert.equal(env.NEXT_PUBLIC_RCAP_BUILD_SHA,sha);
  assert.equal(env.RCAP_PARTNER_ONBOARDING_ENABLED,'true');assert.equal(env.RCAP_2_0_ENABLED,'true');
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,c.SUPABASE_URL);assert.equal(env.SUPABASE_URL,c.SUPABASE_URL);
  for(const key of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','RESEND_API_KEY','INTERNAL_ADMIN_ACCESS_TOKEN'])assert.equal(env[key],'',key);
  for(const key of ['VERCEL','VERCEL_ENV','VERCEL_TARGET_ENV','VERCEL_GIT_COMMIT_SHA','VERCEL_PROJECT_ID','VERCEL_DEPLOYMENT_ID','VERCEL_URL'])assert.equal(Object.hasOwn(env,key),false,key);
 }
 assert.equal(r.RCAP_CONSUMER_DELIVERY_ROUTE_STATE,'staging_scoped');assert.equal(r.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE,grant.participantUserIds.join(','));assert.equal(r.RCAP_SPONSORED_PREVIEW_CHANNEL,grant.channel);
 assert.equal(b.RCAP_CONSUMER_DELIVERY_ROUTE_STATE,'disabled');assert.equal(b.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE,'');assert.equal(b.RCAP_SPONSORED_PREVIEW_CHANNEL,'');
 assert.equal(r.RCAP_PARTNER_LAUNCH_ENABLED,'true');assert.deepEqual(JSON.parse(r.RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION),binding);
 assert.equal(r.VERCEL_AUTOMATION_BYPASS_SECRET,'synthetic-private-bypass');assert.equal(r.SUPABASE_SERVICE_ROLE_KEY,'synthetic-service');
 for(const [key,value] of Object.entries(c.PRESERVED_DATA_KEYS))assert.equal(r[key],value,key);
 assert.equal(b.RCAP_PARTNER_LAUNCH_ENABLED,'false');
 for(const key of ['SUPABASE_SERVICE_ROLE_KEY',...Object.keys(c.PRESERVED_DATA_KEYS),'RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION','RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN','VERCEL_AUTOMATION_BYPASS_SECRET'])assert.equal(b[key],'',key);
});
test('invalid binding, missing bypass and conflicting purposes refuse before remote identity resolution',()=>{
 for(const patch of [{applicationSha:'0'.repeat(40)},{schema:'other'},{projectId:'prj_other'},{supabaseProjectRef:'other'},{partnerSlug:'other'},{adminAuthUserId:'bad'},{extra:'unexpected'}]) {
  const c=context();c.process.env.HOSTED_PARTNER_LAUNCH_RELEASE_AUTHORIZATION=JSON.stringify({...binding,...patch});
  assert.throws(()=>readBinding(source,c),/DEPLOY_MANAGED_START_BINDING_INVALID/);
 }
 for(const raw of ['', 'null','[]','{']) {
  const c=context();c.process.env.HOSTED_PARTNER_LAUNCH_RELEASE_AUTHORIZATION=raw;
  assert.throws(()=>readBinding(source,c),/DEPLOY_MANAGED_START_BINDING_INVALID/);
 }
 for(const bypass of [undefined,'','   ','synthetic\r\nheader']) {
  const c=context();c.process.env.VERCEL_AUTOMATION_BYPASS_SECRET=bypass;
  assert.throws(()=>readBinding(source,c),/DEPLOY_MANAGED_START_BYPASS_REQUIRED/);
 }
 for(const key of ['CLINIC_DEMO_MODE','ISOLATED_CLINIC_PREVIEW','LEGAL_AID_EMAIL']) {
  const c=context();c[key]=true;assert.throws(()=>readBinding(source,c),/DEPLOY_MANAGED_START_PURPOSE_MISMATCH/);
 }
 for(const key of ['HOSTED_STRIPE_TEST_SECRET','HOSTED_STRIPE_TEST_WEBHOOK_SECRET','HOSTED_STRIPE_CATALOG_PRODUCT_ID']) {
  const c=context();c.process.env[key]='unexpected';assert.throws(()=>readBinding(source,c),/DEPLOY_MANAGED_START_PURPOSE_MISMATCH/);
 }
 assert(source.indexOf('const MANAGED_START =')<source.indexOf('await resolveHostedVercelIdentity'));
});
test('all preexisting maps are exactly preserved, including Clinic and configured sandbox overrides',()=>{
 for(const phase of ['deploy','replace_preview','clinic_preview','configured_sandbox_preview']) {
  const a=context(phase),b=context(phase);
  for(const c of [a,b]) {
   c.ISOLATED_CLINIC_PREVIEW=phase==='clinic_preview';
   if(c.ISOLATED_CLINIC_PREVIEW)Object.assign(c,{ROUTE_STATE:'staging_scoped',SCOPE_IDS:'participant-a,participant-b',CLINIC_DEMO_MODE:'mississippi_preview'});
   if(phase==='configured_sandbox_preview')c.configuredSandboxEnv={runtime:{STRIPE_SECRET_KEY:'sk_test_existing',RCAP_PARTNER_LAUNCH_ENABLED:'false'},build:{STRIPE_SECRET_KEY:''}};
  }
  assert.deepEqual(maps(source,a),maps(original,b),phase);
 }
});
test('project exposure gate requires actual true and precedes deployment creation',()=>{
 const start=source.indexOf('// Existing project readback');
 const gate=source.slice(start,source.indexOf('const aliasesBefore =',start));assert(start>=0);
 for(const value of [undefined,false,'true'])assert.throws(()=>vm.runInNewContext(gate,{MANAGED_START:{},beforeProject:{json:{autoExposeSystemEnvs:value}}}),/DEPLOY_MANAGED_START_SYSTEM_ENV_EXPOSURE_UNPROVEN/);
 vm.runInNewContext(gate,{MANAGED_START:{},beforeProject:{json:{autoExposeSystemEnvs:true}}});
 vm.runInNewContext(gate,{MANAGED_START:null,beforeProject:{json:{}}});
 assert(start<source.indexOf('const created = await createRestPreview'));
});
test('existing exact-host release GET refuses redirects and mismatched platform/runtime source',async()=>{
 const start=source.indexOf('if (MANAGED_START) {\n  const response = await fetch');assert(start>=0);
 const code=source.slice(start,source.indexOf('if (deploymentId && verdicts.get',start));
 for(const patch of [null,{status:302},{buildSha:'0'.repeat(40)},{runtimeSha:null},{sourceBound:false},{policyVersion:'other'}]) {
  const calls=[],evidence={};const good={application:'RCAP 2.0',policyVersion:'rcap2.2',buildSha:sha,runtimeSha:sha,sourceBound:true};
  const c={MANAGED_START:{bypass:'synthetic-private-bypass'},APPLICATION_SHA:sha,deploymentUrl:'https://exact-immutable.vercel.app',deploymentId:'dpl_Synthetic',evidence,AbortSignal,record:()=>{},fetch:async(url,init)=>{calls.push({url,init});return {status:patch?.status??200,json:async()=>({...good,...patch})};}};
  const promise=vm.runInNewContext(`(async()=>{${code}})()`,c);
  if(patch)await assert.rejects(promise,/DEPLOY_MANAGED_START_RELEASE_SOURCE_UNPROVEN/);else await promise;
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://exact-immutable.vercel.app/api/rcap/release');assert.equal(calls[0].init.redirect,'manual');
  assert.deepEqual(Object.keys(calls[0].init.headers).sort(),['x-vercel-protection-bypass','x-vercel-skip-toolbar']);
  assert(!JSON.stringify(evidence).includes('synthetic-private-bypass'));
 }
});
test('managed purpose has a distinct alias and remains connected through existing REST purpose validation',async()=>{
 const {expectedHostedReturnOrigin}=await import('./rcap-hosted-acceptance-vercel-identity.mjs');
 const managed=expectedHostedReturnOrigin(sha,'managed_start');
 assert.notEqual(managed,expectedHostedReturnOrigin(sha));assert.notEqual(managed,expectedHostedReturnOrigin(sha,'mississippi_clinic'));
 assert.match(managed,/^https:\/\/legalease-rcap-managed-828de28b3837-/);
 assert.match(source,/ISOLATED_CLINIC_PREVIEW \? "mississippi_clinic" : MANAGED_START \? "managed_start" : ""/);
 assert.match(source,/MANAGED_START \? \{ rcapPreviewPurpose: "managed_start" \}/);
 const transport=fs.readFileSync(new URL('./rcap-hosted-vercel-rest-transport.mjs',import.meta.url),'utf8');
 assert.match(transport,/expectedHostedReturnOrigin\(applicationSha, meta\?\.rcapPreviewPurpose\)/);
 assert.throws(()=>expectedHostedReturnOrigin(sha,'unreviewed'),/unsupported hosted return-origin purpose/);
});
test('private runtime values stay redacted when actual build maps explicitly blank them',async()=>{
 const transport=fs.readFileSync(new URL('./rcap-hosted-vercel-rest-transport.mjs',import.meta.url),'utf8');
 const start=transport.indexOf('const secrets=');const end=transport.indexOf('\n',start);assert(start>=0);
 const actual=maps(source,context());
 const secrets=vm.runInNewContext(transport.slice(start,end)+'\nsecrets;',{options:{token:'synthetic-token',...actual}});
 const {sanitizeVercelDiagnostic}=await import('./rcap-hosted-vercel-diagnostics.mjs');
 for(const key of ['RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION','VERCEL_AUTOMATION_BYPASS_SECRET','SUPABASE_SERVICE_ROLE_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY','PARTICIPANT_PRIVACY_PSEUDONYM_SECRET']) {
  const value=actual.runtimeEnv[key];assert(value);assert.equal(actual.buildEnv[key],'',key);
  const receipt=sanitizeVercelDiagnostic({error:{message:`invalid value ${value}`}},secrets);
  assert(!receipt.error.message.includes(value),`${key} must not appear in a provider error receipt`);
 }
});
test('only the exact accepted ordinary grant and one participant scope are admitted',()=>{
 for(const patch of [{ROUTE_STATE:'disabled'},{ROUTE_STATE:'live'},{SCOPE_IDS:''},{SCOPE_IDS:grant.participantUserIds[0]+',other'},{SCOPE_IDS:'e7c1d76e-dcf2-4d41-b585-ba164806f391'},{SCOPE_IDS:grant.participantUserIds[0]+','+grant.participantUserIds[0]}]) {
  assert.throws(()=>readBinding(source,{...context(),...patch}),/DEPLOY_MANAGED_START_GRANT_SCOPE_MISMATCH/);
 }
 for(const patch of [{channel:'other'},{partnerSlug:'other'},{eventId:'clinic'},{eventName:'clinic'},{acquisitionMode:'clinic'},{approved:false},{participantUserIds:['other']},{productionAuthorized:true}]) {
  const c=context();c.execFileSync=()=>JSON.stringify({...grant,...patch});assert.throws(()=>readBinding(source,c),/DEPLOY_MANAGED_START_GRANT_MISMATCH/);
 }
 const missing=context();missing.execFileSync=()=>{throw Error('missing exact source object');};assert.throws(()=>readBinding(source,missing),/DEPLOY_MANAGED_START_GRANT_SOURCE_MISSING/);
});
test('existing participant lookup is read-only and refuses absent, extra or wrong identities',async()=>{
 const start=source.indexOf('if (MANAGED_START) {\n  const participantId');assert(start>=0);
 const code=source.slice(start,source.indexOf('const reusable =',start));
 for(const rows of [[{id:grant.participantUserIds[0]}],[],[{id:'other'}],[{id:grant.participantUserIds[0]},{id:'extra'}],null,'failed-http']) {
  const calls=[],evidence={};const c={MANAGED_START:readBinding(source,context()),PROJECT_REF:binding.supabaseProjectRef,SUPABASE_ACCESS_TOKEN:'synthetic-access-token',evidence,
   fetch:async(url,init)=>{calls.push({url,init});return {ok:rows!=='failed-http',json:async()=>rows};}};
  const operation=vm.runInNewContext(`(async()=>{${code}})()`,c);
  if(Array.isArray(rows)&&rows.length===1&&rows[0].id===grant.participantUserIds[0])await operation;else await assert.rejects(operation,/DEPLOY_MANAGED_START_EXISTING_PARTICIPANT_REQUIRED/);
  assert.equal(calls.length,1);assert.equal(calls[0].url,`https://api.supabase.com/v1/projects/${binding.supabaseProjectRef}/database/query`);
  const sql=JSON.parse(calls[0].init.body).query;assert.match(sql,/^select id from auth.users where id=/);assert(sql.includes(grant.participantUserIds[0]));assert(!/insert|update|delete from|auth\/v1\/admin/i.test(sql));
  assert(!JSON.stringify(evidence).includes('synthetic-access-token'));
 }
});
