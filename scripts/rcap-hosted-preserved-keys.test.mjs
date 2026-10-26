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
 const got=vm.runInNewContext('('+runtime+')',{MANAGED_START:null,ISOLATED_CLINIC_PREVIEW:false,configuredSandboxEnv:null,closedPreviewEnv:{},PRESERVED_DATA_KEYS:expected,RETURN_ORIGIN:'https://synthetic.invalid',SUPABASE_URL:'https://synthetic.invalid',keys:{anon:'synthetic',service:'synthetic'},process:{env:{}},CATALOG_PRODUCT_ID:'',ROUTE_STATE:'',CLINIC_DEMO_MODE:'',SCOPE_IDS:'',LEGAL_AID_EMAIL:null});
 assert.ok(Object.keys(expected).every(k=>got[k]===expected[k]));
 const build=s.slice(s.indexOf('const buildEnv ='),s.indexOf('// A live Stripe key'));
 const meta=s.slice(s.indexOf('const deploymentMeta ='),s.indexOf('let deploymentUrl ='));
 assert.ok(!/PRESERVED_DATA_KEYS|HOSTED_LEGAL_AID_RESTRICTED|HOSTED_PARTICIPANT_PRIVACY/.test(build+meta));
});
// Run the actual request mappings and reuse predicates with synthetic provider rows.
const acceptanceUrl='https://hyflxnlhpmiqxvvcoiia.supabase.co';
const configContext=phase=>{const context={MANAGED_START:null,ISOLATED_CLINIC_PREVIEW:false,configuredSandboxEnv:null,PRESERVED_DATA_KEYS:expected,RETURN_ORIGIN:'https://synthetic.vercel.app',SUPABASE_URL:acceptanceUrl,
 keys:{anon:'synthetic-acceptance-anon',service:'synthetic-acceptance-service'},process:{env:{PHASE_INPUT:phase,
 HOSTED_STRIPE_TEST_SECRET:'sk_test_synthetic',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'whsec_synthetic'}},
 CATALOG_PRODUCT_ID:'',ROUTE_STATE:'',CLINIC_DEMO_MODE:'',SCOPE_IDS:'',LEGAL_AID_EMAIL:null};
 const start=s.indexOf('const closedPreviewEnv = ');
 const expression=start<0?'{}':s.slice(start+'const closedPreviewEnv = '.length,s.indexOf('\nconst runtimeEnv =',start)).trim().replace(/;$/,'');
 context.closedPreviewEnv=vm.runInNewContext('('+expression+')',context);return context;};
check('closed candidate request overrides inherited authority without changing other phases',()=>{
 const got=vm.runInNewContext('('+runtime+')',configContext('replace_preview'));
 for(const [name,value] of Object.entries({SUPABASE_URL:acceptanceUrl,NEXT_PUBLIC_SUPABASE_URL:acceptanceUrl,
 SUPABASE_SERVICE_ROLE_KEY:'synthetic-acceptance-service',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-acceptance-anon',
 RCAP_PARTNER_ONBOARDING_ENABLED:'true',RCAP_CONSUMER_DELIVERY_ROUTE_STATE:'disabled',RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:'',
 RCAP_SPONSORED_PREVIEW_CHANNEL:'',STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:'',
 STRIPE_LEGACY_WEBHOOK_SECRET:'',ENABLE_PARTNER_EMAIL_DELIVERY:'false',EXPUNGEMENT_EMAIL_PROVIDER:'',RESEND_API_KEY:'',INTERNAL_ADMIN_ACCESS_TOKEN:'',
 LEGALEASE_OS_EVENTS_ENABLED:'false',LEGALEASE_OS_EVENTS_ENDPOINT:''})) assert.equal(got[name],value,name);
 const payment=vm.runInNewContext('('+runtime+')',configContext('payment'));
 assert.equal(payment.STRIPE_SECRET_KEY,'sk_test_synthetic');assert.equal(payment.RCAP_PARTNER_ONBOARDING_ENABLED,undefined);
 const build=s.slice(s.indexOf('const buildEnv = {')+'const buildEnv = '.length,s.indexOf('// A live Stripe key')).trim().replace(/;$/,'');
 const built=vm.runInNewContext('('+build+')',configContext('replace_preview'));
 assert.equal(built.NEXT_PUBLIC_SUPABASE_URL,acceptanceUrl);assert.equal(built.NEXT_PUBLIC_SUPABASE_ANON_KEY,'synthetic-acceptance-anon');
 const inherited={SUPABASE_URL:'https://production.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-production-service',
 STRIPE_SECRET_KEY:'sk_live_synthetic',STRIPE_WEBHOOK_SECRET:'synthetic-production-webhook',STRIPE_LEGACY_WEBHOOK_SECRET:'synthetic-legacy',
 ENABLE_PARTNER_EMAIL_DELIVERY:'true',EXPUNGEMENT_EMAIL_PROVIDER:'resend',RESEND_API_KEY:'synthetic-production-email',INTERNAL_ADMIN_ACCESS_TOKEN:'synthetic-admin',
 LEGALEASE_OS_EVENTS_ENABLED:'true',LEGALEASE_OS_EVENTS_ENDPOINT:'https://production.invalid/events',RCAP_PARTNER_ONBOARDING_ENABLED:'false',
 RCAP_CONSUMER_DELIVERY_ROUTE_STATE:'staging_scoped',RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:'synthetic-owner',RCAP_SPONSORED_PREVIEW_CHANNEL:'mississippi_preview'};
 const merged={...inherited,...built};
 for(const name of Object.keys(inherited)){
  assert.ok(Object.hasOwn(built,name),name+' must explicitly override inherited build authority');
  assert.equal(merged[name],name==='SUPABASE_SERVICE_ROLE_KEY'?'':got[name],name);
 }
 assert.equal(merged.SUPABASE_SERVICE_ROLE_KEY,'');
 for(const value of [configContext('replace_preview').keys.service,...Object.values(expected)])assert.ok(!Object.values(built).includes(value),'server credential/data key remains runtime-only');
 const paymentBuild=vm.runInNewContext('('+build+')',configContext('payment'));
 for(const name of Object.keys(inherited))assert.equal(paymentBuild[name],undefined,'other phase unchanged: '+name);
});
const functionText=(source,name)=>{const start=source.indexOf(`function ${name}(`);assert(start>=0,name);const end=source.indexOf('\n}\n',start)+2;assert(end>start,name);return source.slice(start,end);};
const resolverSource=fs.readFileSync(path.join(root,'scripts/rcap-hosted-resolve-preview.mjs'),'utf8');
const transportSource=fs.readFileSync(path.join(root,'scripts/rcap-hosted-vercel-rest-transport.mjs'),'utf8');
const app='a'.repeat(40),worker={rcapWorkerSourceSha:'b'.repeat(40),rcapWorkerDigest:'sha256:'+'c'.repeat(64),rcapWorkerInputFingerprint:'sha256:'+'d'.repeat(64)};
const goodPreview={id:'dpl_Synthetic',url:'synthetic.vercel.app',projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',gitSource:{sha:app},target:null,readyState:'READY',
 meta:{rcapApplicationSha:app,...worker,rcapAcceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',rcapStripeConfigured:'false',rcapRouteState:'disabled',
 rcapPartnerOnboardingEnabled:'true',rcapClosedPreview:'true',rcapCatalogProduct:'inline',rcapReturnOrigin:'https://synthetic.vercel.app',rcapClinicDemoMode:'none',rcapStagingScopeSha256:crypto.createHash('sha256').update('').digest('hex')}};
check('output analysis is build-only in the actual closed Preview request',()=>{
 const identity={teamId:'team_4qLmZK9WI6xIy5vjYC0IF3ae',projectId:goodPreview.projectId,projectName:'legalease-partner-dashboard-clean'};
 const create=vm.runInNewContext('('+functionText(transportSource,'createPreviewRequest')+')',{
  HOSTED_VERCEL_TEAM_ID:identity.teamId,HOSTED_VERCEL_PROJECT_ID:identity.projectId,HOSTED_VERCEL_PROJECT_NAME:identity.projectName,
  FROZEN_APPLICATION_SHA:app,FROZEN_WORKER_METADATA:worker,ACCEPTANCE_PROJECT:'hyflxnlhpmiqxvvcoiia',expectedHostedReturnOrigin:()=>goodPreview.meta.rcapReturnOrigin
 });
 const maps=isolationDeploymentMaps();
 const request=create({identity,applicationSha:app,...maps,meta:goodPreview.meta});
 assert.equal(request.build.env.VERCEL_ANALYZE_BUILD_OUTPUT,'1');
 assert.equal(Object.hasOwn(request.env,'VERCEL_ANALYZE_BUILD_OUTPUT'),false);
 assert.equal(request.build.env.SUPABASE_SERVICE_ROLE_KEY,'');
 assert.equal(request.build.env.STRIPE_SECRET_KEY,'');
 assert.equal(Object.hasOwn(request,'target'),false);
 for(const env of Object.values(isolationDeploymentMaps('payment')))assert.equal(Object.hasOwn(env,'VERCEL_ANALYZE_BUILD_OUTPUT'),false);
});
function reuseContext(candidate,phase='replace_preview'){
 const ctx={APPLICATION_SHA:app,FROZEN_APPLICATION_SHA:app,FROZEN_WORKER_METADATA:worker,HOSTED_VERCEL_PROJECT_ID:goodPreview.projectId,
 PROJECT_REF:'hyflxnlhpmiqxvvcoiia',VERCEL_IDENTITY:{projectId:goodPreview.projectId},REQUIRE_DTC_READINESS:true,
 EXPECTED_CATALOG_PRODUCT:'inline',EXPECTED_RETURN_ORIGIN:'https://synthetic.vercel.app',EXPECTED_RETURN_HOST:'synthetic.vercel.app',
 ISOLATED_CLINIC_PREVIEW:false,EXPECTED_CLINIC_DEMO_MODE:'none',CLINIC_DEMO_MODE:'',EXPECTED_CLINIC_SCOPE_SHA256:null,
 REQUIRED_ROUTE_STATE:'staging_scoped',REQUIRE_STAGING_SCOPED:phase!=='replace_preview',process:{env:{PHASE_INPUT:phase}},
 api:async route=>{assert(route.startsWith('/v6/deployments?')||route.startsWith('/v13/deployments/'),'GET-only fake provider');return route.startsWith('/v6/')?{deployments:[{id:candidate.id}]}:candidate;},
 isPreviewTarget:value=>value===null||value==='preview',routeStateOf:value=>value.meta?.rcapRouteState??null};
 const constants=resolverSource.slice(resolverSource.indexOf('const EXPECT_CLOSED_PREVIEW ='),resolverSource.indexOf('// Which catalog Product'));
 vm.runInNewContext(constants+'\nglobalThis.EXPECT_CLOSED_PREVIEW=EXPECT_CLOSED_PREVIEW;globalThis.EXPECTED_STRIPE_CONFIGURED=EXPECTED_STRIPE_CONFIGURED;',ctx);
 ctx.assertPreviewResponse=vm.runInNewContext('('+functionText(transportSource,'assertPreviewResponse')+')',ctx);
 ctx.closedPreviewPosture=vm.runInNewContext('('+functionText(resolverSource,'closedPreviewPosture')+')',ctx);
 ctx.routeStateAcceptable=vm.runInNewContext('('+functionText(resolverSource,'routeStateAcceptable')+')',ctx);
 return ctx;
}
check('actual resolver search reuses only exact closed metadata and retains other-phase refusal',async()=>{
 const run=async(candidate,phase)=>{const ctx=reuseContext(candidate,phase);const find=vm.runInNewContext('(async '+functionText(resolverSource,'findExistingExactPreview')+')',ctx);return find();};
 assert.equal((await run(goodPreview,'replace_preview')).found.id,goodPreview.id);
 for(const patch of [{rcapStripeConfigured:'true'},{rcapRouteState:'staging_scoped'},{rcapClosedPreview:undefined},
 {rcapPartnerOnboardingEnabled:undefined},{rcapPartnerOnboardingEnabled:'false'},{rcapWorkerDigest:'sha256:'+'e'.repeat(64)}]){
  const bad={...goodPreview,meta:{...goodPreview.meta,...patch}};assert.equal((await run(bad,'replace_preview')).found,null,JSON.stringify(patch));
  const ctx=reuseContext(bad);let verdict;
  ctx.meta=bad.meta;ctx.ok=()=>{verdict=true;};ctx.bad=()=>{verdict=false;};
  const start=resolverSource.indexOf('(closedPreviewPosture(meta)',resolverSource.indexOf('const deployedReturnOrigin'));
  const end=resolverSource.indexOf(';',start)+1;assert(start>0&&end>start);
  if(!Object.hasOwn(patch,'rcapWorkerDigest')){vm.runInNewContext(resolverSource.slice(start,end),ctx);assert.equal(verdict,false,'explicit mismatched Preview refuses');}
 }
 assert.equal((await run({...goodPreview,gitSource:{sha:'f'.repeat(40)}},'replace_preview')).found,null,'stale source refuses');
 assert.equal((await run(goodPreview,'payment')).found,null,'closed Preview cannot satisfy payment');
 const open={...goodPreview,meta:{...goodPreview.meta,rcapStripeConfigured:'true',rcapRouteState:'staging_scoped'}};
 assert.equal((await run(open,'payment')).found.id,open.id,'existing payment posture unchanged');
});
check('actual deploy READY search binds closed markers and preserves key-continuity refusal',async()=>{
 const run=async candidate=>{
  const ctx={...configContext('replace_preview'),ISOLATED_CLINIC_PREVIEW:false,APPLICATION_SHA:app,FROZEN_WORKER_METADATA:worker,
   PROJECT_REF:'hyflxnlhpmiqxvvcoiia',VERCEL_IDENTITY:{projectId:goodPreview.projectId},STRIPE_CONFIGURED:false,CATALOG_PRODUCT_TAG:'inline',ROUTE_STATE_TAG:'disabled',
   sha256:value=>crypto.createHash('sha256').update(String(value)).digest('hex'),vercelApi:async()=>({status:200,json:{deployments:[candidate]}})};
  return vm.runInNewContext('(async '+functionText(s,'findReusableDeployment')+')',ctx)();
 };
 assert.equal((await run(goodPreview)).id,goodPreview.id);
 for(const patch of [{rcapClosedPreview:undefined},{rcapPartnerOnboardingEnabled:undefined},{rcapStripeConfigured:'true'},{rcapRouteState:'staging_scoped'}])
  assert.equal(await run({...goodPreview,meta:{...goodPreview.meta,...patch}}),null,JSON.stringify(patch));
 assert.ok(s.includes('if (reusable) throw new Error("DEPLOY_REUSE_PRESERVED_KEY_CONTINUITY_UNPROVEN")'));
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
check('actual replace_preview contract closes execution without changing payment',()=>{
 const steps=Object.values(wf.jobs).flatMap(j=>j.steps||[]);
 const contract=steps.find(x=>x.id==='contract');assert.ok(contract);
 const tmp=fs.mkdtempSync('/tmp/rcap-preview-phase-');
 try {
  for(const phase of ['replace_preview','payment']){
   const output=path.join(tmp,phase);
   const shell=contract.run.replaceAll('${{ inputs.phase }}',phase).replace(/\$\{\{ inputs\.[a-z_]+ \}\}/g,'');
   execFileSync('bash',['-c',shell],{env:{...process.env,GITHUB_OUTPUT:output},stdio:'pipe'});
   const values=Object.fromEntries(fs.readFileSync(output,'utf8').trim().split('\n').map(line=>line.split('=')));
   assert.equal(values.deploy,'true');assert.equal(values.dtc,'true');
   assert.equal(values.require_staging_scoped,phase==='payment'?'true':'false');
   assert.equal(values.matrix,phase==='payment'?'true':'false');
   for(const name of ['gate','retarget','browser','clinic','resume','legal_aid','sponsor_cap','diagnose'])assert.equal(values[name],'false',name);
  }
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
 const deploy=steps.find(x=>x.id==='deploy_preview');
 for(const name of ['HOSTED_STRIPE_TEST_SECRET','HOSTED_STRIPE_TEST_WEBHOOK_SECRET'])assert.ok(deploy.env[name].startsWith("${{ inputs.phase != 'replace_preview' &&"));
 assert.equal(steps.find(x=>x.id==='resolve_preview').env.PHASE_INPUT,'${{ inputs.phase }}');
});
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

// These new isolation checks use actual request maps and TS entrypoints with
// intercepted I/O only; presentation/context dependencies are test fixtures.
const isolationRequire=createRequire(import.meta.url);
const isolationTs=isolationRequire('typescript');
const isolationStripe=isolationRequire('stripe');
function isolationDeploymentMaps(phase='replace_preview') {
 const start=DEPLOY_SOURCE.indexOf('const closedPreviewEnv =');
 const end=DEPLOY_SOURCE.indexOf('// A live Stripe key',start);
 assert(start>0&&end>start);
 return vm.runInNewContext(DEPLOY_SOURCE.slice(start,end)+'\n({runtimeEnv,buildEnv})',{
  MANAGED_START:null,ISOLATED_CLINIC_PREVIEW:false,configuredSandboxEnv:null,
  process:{env:{PHASE_INPUT:phase,HOSTED_STRIPE_TEST_SECRET:'sk_test_synthetic',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'whsec_synthetic'}},
  RETURN_ORIGIN:'https://synthetic-preview.invalid',SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',
  keys:{anon:'synthetic-anon',service:'synthetic-acceptance-service'},PRESERVED_DATA_KEYS:{},
  CATALOG_PRODUCT_ID:'',ROUTE_STATE:'',CLINIC_DEMO_MODE:'',SCOPE_IDS:'',LEGAL_AID_EMAIL:null
 });
}
function isolationEntryContext(env,{challenge=true}={}) {
 const cache=new Map(),calls=[],events=[];
 const aliases={
  '@/lib/expungement-ai/wilma-model':'src/lib/expungement-ai/wilma-model.ts',
  '@/lib/expungement-ai/wilma-rate-limit':'src/lib/expungement-ai/wilma-rate-limit.ts',
  '@/lib/expungement-ai/wilma-bot-challenge':'src/lib/expungement-ai/wilma-bot-challenge.ts',
  '@/lib/expungement-ai/wilma-kill-switch':'src/lib/expungement-ai/wilma-kill-switch.ts',
  '@/lib/expungement-ai/wilma':'src/lib/expungement-ai/wilma.ts',
  '@/lib/server-runtime-environment':'src/lib/server-runtime-environment.ts',
  '@/lib/stripe/server':'src/lib/stripe/server.ts'
 };
 const fixtures={
  'server-only':{},stripe:isolationStripe,'next/server':{NextResponse:{json:(value,init={})=>({status:init.status??200,value})}},
  '@/lib/expungement-ai/wilma-context':{buildPublicWilmaContext:()=>({state:'MS',pageContext:'landing'})},
  '@/lib/expungement-ai/wilma-system-prompt':{buildWilmaSystemPrompt:()=> 'Synthetic configuration probe.'},
  '@/lib/expungement-ai/wilma-safety':{guardWilmaResponse:({draftResponse})=>({response:draftResponse,blocked:false,flags:[]})},
  '@/lib/expungement-ai/wilma-telemetry':{createWilmaTelemetryRecord:value=>value,logWilmaExchange:async()=>{}},
  '@/lib/expungement-ai/localization':{normalizeLocale:()=> 'en',t:(_locale,_key,fallback)=>fallback},
  '@/lib/expungement-ai/checkout-reconciliation':{
   isExpungementAiCheckoutEvent:event=>{assert.equal(event.type,'preview.isolation.probe');return false;},
   reconcileExpungementAiCheckoutEvent:async()=>{throw Error('unexpected consumer branch');}
  },
  '@/lib/partners/billing':{reconcileStripeInvoiceEvent:event=>load('src/lib/partners/billing-reconciliation.ts').reconcilePartnerBillingInvoiceEvent(event,{
   hasProcessedStripeEvent:async()=>false,recordProcessedStripeEvent:async(...args)=>{events.push(args);},
   findBillingRequestById:async()=>null,findBillingRequestByStripeInvoiceId:async()=>null,
   updateBillingRequestFromInvoice:async()=>{throw Error('unexpected invoice update');}
  })}
 };
 const fakeFetch=async(url,init={})=>{
  const target=new URL(url);calls.push({host:target.host,path:target.pathname,method:init.method??'GET'});
  if(target.host==='challenges.cloudflare.com')return {ok:true,json:async()=>({success:challenge})};
  if(target.host==='synthetic-redis.invalid')return {ok:true,json:async()=>target.pathname==='/pipeline'?JSON.parse(init.body).map(()=>({result:1})):{result:0}};
  if(target.host==='api.openai.com')return {ok:true,json:async()=>({output_text:'Synthetic provider response.',usage:{input_tokens:1,output_tokens:1}})};
  throw Error('Unapproved test I/O target: '+target.host);
 };
 function load(rel) {
  if(cache.has(rel))return cache.get(rel);
  const source=execFileSync('git',['show','HEAD:'+rel],{cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024});
  const js=isolationTs.transpileModule(source,{compilerOptions:{module:isolationTs.ModuleKind.CommonJS,target:isolationTs.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const exports={};cache.set(rel,exports);
  const require=name=>{
   if(Object.hasOwn(fixtures,name))return fixtures[name];
   if(aliases[name])return load(aliases[name]);
   if(name==='node:crypto')return crypto;
   throw Error('Unapproved test dependency: '+name);
  };
  vm.runInNewContext('(function(exports,require,module){'+js+'\n})',{
   process:{env},fetch:fakeFetch,console:{info(){},warn(){},error(){}},AbortSignal,URL,URLSearchParams,Buffer,Date
  },{filename:rel})(exports,require,{exports});
  return exports;
 }
 return {load,calls,events};
}
const isolationInherited={VERCEL_ENV:'preview',NODE_ENV:'production',OPENAI_API_KEY:'synthetic-model-key',
 UPSTASH_REDIS_REST_URL:'https://synthetic-redis.invalid',UPSTASH_REDIS_REST_TOKEN:'synthetic-redis-token',TURNSTILE_SECRET_KEY:'synthetic-challenge-secret'};
test('closed integration isolation: explicit blank credentials at build and runtime; other phases unchanged',()=>{
 for(const env of Object.values(isolationDeploymentMaps()))for(const name of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN']){
  assert.ok(Object.hasOwn(env,name),name+' must override inheritance');assert.equal(env[name],'',name);
 }
 const payment=isolationDeploymentMaps('payment');assert.equal(payment.runtimeEnv.STRIPE_SECRET_KEY,'sk_test_synthetic');
 assert.equal(payment.runtimeEnv.STRIPE_WEBHOOK_SECRET,'whsec_synthetic');
 for(const name of ['OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'])assert.equal(Object.hasOwn(payment.runtimeEnv,name),false,name);
});
test('closed integration isolation: real public chat preserves challenge refusal and cannot reach inherited model or Redis',async()=>{
 const env={...isolationInherited,...isolationDeploymentMaps().runtimeEnv};
 const request=()=>new Request('https://synthetic-preview.invalid/api/expungement-ai/wilma/public-chat',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Synthetic configuration probe.',turnstileToken:'synthetic-valid-token'})
 });
 const rejected=isolationEntryContext(env,{challenge:false});
 assert.equal((await rejected.load('src/app/api/expungement-ai/wilma/public-chat/route.ts').POST(request())).status,403);
 assert.deepEqual(rejected.calls.map(c=>c.host),['challenges.cloudflare.com']);
 const accepted=isolationEntryContext(env);
 await accepted.load('src/app/api/expungement-ai/wilma/public-chat/route.ts').POST(request());
 assert.deepEqual(accepted.calls.filter(c=>c.host!=='challenges.cloudflare.com'),[],JSON.stringify(accepted.calls));
 assert.equal(env.TURNSTILE_SECRET_KEY,isolationInherited.TURNSTILE_SECRET_KEY,'security challenge remains configured');
});
test('closed integration isolation: real webhook refuses configuration before any logical event-store write',async()=>{
 const env={...isolationInherited,...isolationDeploymentMaps().runtimeEnv};
 const ctx=isolationEntryContext(env),handler=ctx.load('src/lib/stripe/webhook-handler.ts');
 const payload=JSON.stringify({id:'evt_synthetic_isolation_probe',type:'preview.isolation.probe',data:{object:{id:'synthetic_object'}}});
 const request=signature=>new Request('https://synthetic-preview.invalid/api/stripe/webhook',{
  method:'POST',headers:{'stripe-signature':signature},body:payload
 });
 const invalid=await handler.handleStripeWebhookPost(request('invalid'),{route:'/api/stripe/webhook',secretEnvVar:'STRIPE_WEBHOOK_SECRET'});
 assert.ok([400,500].includes(invalid.status));assert.equal(ctx.events.length,0,'bad signature/configuration already refuses');
 const signature=isolationStripe.webhooks.generateTestHeaderString({payload,secret:'whsec_hosted_acceptance_placeholder'});
 const result=await handler.handleStripeWebhookPost(request(signature),{route:'/api/stripe/webhook',secretEnvVar:'STRIPE_WEBHOOK_SECRET'});
 assert.equal(ctx.events.length,0,'closed Preview must not enter the actual billing reconciler event-write branch');
 assert.equal(result.status,500,'explicit absent configuration refuses before signature/reconciliation');assert.equal(ctx.calls.length,0);
});
