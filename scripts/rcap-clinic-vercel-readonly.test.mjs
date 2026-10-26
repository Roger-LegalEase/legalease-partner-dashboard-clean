import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),YAML=require('yaml'),ts=require('typescript');
const H='9fe0ea17727339755c10e73c06adb34215ba2a0e',PARENT='1b36b87a468dc2df5a3f2d3559d9404b9df933e3';
const branch='codex/f-vercel-raw-readonly-20261026',mode='clinic_vercel_readonly';
const source=(sha,file)=>execFileSync('git',['show',`${sha}:${file}`],{cwd:process.cwd(),encoding:'utf8'});
const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8'));
const job=workflow.jobs[mode],guard=job.steps.find(s=>s.name==='Require the exact read-only dispatch before credentials'),binding=job.steps.find(s=>s.name==='Require pinned actual CURRENT before credentials'),probe=job.steps.find(s=>s.env?.VERCEL_TOKEN);
const inline=step=>step.run.split("<<'JS'\n")[1].split('\nJS')[0];
const tuple={mode,tools_sha:H,application_sha:'4feb8e94b3dee4085fe05ea75d78853fe21e5097',worker_source_sha:'16908485a94f475448657cea90583a4d352da9a3',worker_digest:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',supabase_project_ref:'hyflxnlhpmiqxvvcoiia'};
const env={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF_NAME:branch,GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123'};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const stripped=s=>s.replace(/^import .*;\n/gm,'');
const selected=(w,value)=>Object.entries(w.jobs).filter(([,j])=>!j.if||vm.runInNewContext(j.if,{inputs:{mode:value},startsWith:(v,p)=>v.startsWith(p)})).map(([name])=>name);

test('only the new read-only mode is added; every existing mode/job/input and branch setting is preserved',()=>{
 const before=YAML.parse(source(PARENT,'.github/workflows/rcap-f1-ephemeral-staging.yml')),after=structuredClone(workflow);
 assert.deepEqual(selected(workflow,mode),[mode]);
 for(const value of before.on.workflow_dispatch.inputs.mode.options)assert.deepEqual(selected(workflow,value),selected(before,value));
 delete after.jobs[mode];after.on.workflow_dispatch.inputs.mode.options=after.on.workflow_dispatch.inputs.mode.options.filter(v=>v!==mode);assert.deepEqual(after,before);
 const old=JSON.parse(source(PARENT,'vercel.json')),now=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.equal(now.git.deploymentEnabled[branch],false);delete now.git.deploymentEnabled[branch];assert.deepEqual(now,old);
});

test('actual dispatch guard rejects wrong scope, other modes, repeated attempts and automatic deployment before private bindings',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'f-vercel-read-guard-'));
 try{
  const config=value=>fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify({git:{deploymentEnabled:{[branch]:value}}}));config(false);
  const run=(patch={},extra={})=>spawnSync(process.execPath,['--input-type=module','-'],{cwd:root,input:inline(guard),encoding:'utf8',env:{...env,DISPATCH_INPUTS:JSON.stringify({...tuple,...patch}),...extra}}).status;
  assert.equal(run(),0);for(const key of Object.keys(tuple))assert.notEqual(run({[key]:'wrong'}),0);
  for(const key of ['clinic_attempt_id','preview_hostname','preview_deployment_id','preview_creation_run_id','sponsor_case','contradiction_job_id','promotion_code','journey_state','expected_total_cents','resume_matter_id','clinic_resume_authorization','clinic_session_closure_authorization'])assert.notEqual(run({[key]:'unexpected'}),0);
  assert.notEqual(run({sponsor_items:'["unexpected"]'}),0);assert.notEqual(run({sponsor_fulfillment:true}),0);
  for(const extra of [{GITHUB_EVENT_NAME:'push'},{GITHUB_REF_NAME:'captain-release'},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_WORKFLOW_SHA:'b'.repeat(40)}])assert.notEqual(run({},extra),0);
  config(true);assert.notEqual(run(),0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('inline binding assertions use a CURRENT return port and reject wrong head, role and native/correction provenance',()=>{
 const release=JSON.parse(source(H,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
 const run=(value,head=H)=>new Function('assert','execFileSync','requireCurrentReleaseCandidate','process',stripped(inline(binding)))(assert,()=>head,()=>value,{cwd:()=>'/synthetic'});
 assert.doesNotThrow(()=>run(release));assert.throws(()=>run(release,'b'.repeat(40)));assert.throws(()=>run(null));
 for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionAuthorized'])assert.throws(()=>run({...release,[key]:'wrong'}));
 for(const [section,key]of [['hostedAdmission','runId'],['hostedAdmission','workflowSourceSha'],['hostedAdmission','closureControlSha'],['verifierCorrection','sourceSha'],['verifierCorrection','predecessorSha']])assert.throws(()=>run({...release,[section]:{...release[section],[key]:'wrong'}}));
 assert.match(inline(binding),/import \{requireCurrentReleaseCandidate\} from '\.\/scripts\/grade-a-launch-control\/verify-release-candidate-binding\.mjs'/);
});

// Use the exact existing pure assertion declarations, without importing their CURRENT-bound module initializer.
const declarations=(file,names)=>{const text=source(H,file),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);return ast.statements.filter(s=>ts.isFunctionDeclaration(s)?names.includes(s.name?.text):ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>names.includes(d.name.getText(ast)))).map(s=>s.getText(ast).replace(/^export /,'')).join('\n');};
const identityNames=['HOSTED_VERCEL_TEAM_SLUG','HOSTED_VERCEL_TEAM_ID','HOSTED_VERCEL_PROJECT_ID','HOSTED_VERCEL_PROJECT_NAME','HOSTED_MS_CLINIC_PARTICIPANTS','HOSTED_ORDINARY_PREVIEW','TEAM_ID','PROJECT_ID','getJson','expectedHostedReturnOrigin','hostedVercelScopedUrl','resolveHostedVercelIdentity'];
const identity=new Function(declarations('scripts/rcap-hosted-acceptance-vercel-identity.mjs',identityNames)+'\nreturn {HOSTED_ORDINARY_PREVIEW,HOSTED_VERCEL_PROJECT_ID,expectedHostedReturnOrigin,hostedVercelScopedUrl,resolveHostedVercelIdentity};')();
const release=JSON.parse(source(H,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const FROZEN_WORKER_METADATA={rcapWorkerSourceSha:release.workerSourceSha,rcapWorkerDigest:release.workerDigest,rcapWorkerInputFingerprint:release.workerInputFingerprint};
const transport=new Function('HOSTED_ORDINARY_PREVIEW','HOSTED_VERCEL_PROJECT_ID','FROZEN_APPLICATION_SHA','FROZEN_WORKER_METADATA','ACCEPTANCE_PROJECT','expectedHostedReturnOrigin',declarations('scripts/rcap-hosted-vercel-rest-transport.mjs',['assertPreviewResponse','assertPreservedOrdinaryPreview'])+'\nreturn {assertPreviewResponse,assertPreservedOrdinaryPreview,FROZEN_WORKER_METADATA};')(identity.HOSTED_ORDINARY_PREVIEW,identity.HOSTED_VERCEL_PROJECT_ID,release.applicationSha,FROZEN_WORKER_METADATA,tuple.supabase_project_ref,identity.expectedHostedReturnOrigin);
const ordinary={id:identity.HOSTED_ORDINARY_PREVIEW.id,url:identity.HOSTED_ORDINARY_PREVIEW.immutableHostname,target:null,projectId:identity.HOSTED_VERCEL_PROJECT_ID,gitSource:{sha:release.applicationSha},readyState:'READY',meta:{...FROZEN_WORKER_METADATA,rcapApplicationSha:release.applicationSha,rcapAcceptanceProjectRef:tuple.supabase_project_ref,rcapReturnOrigin:identity.expectedHostedReturnOrigin(release.applicationSha),rcapClinicDemoMode:'none'}};
const clinic={...ordinary,id:'dpl_SyntheticClinic',url:'synthetic-clinic.vercel.app',meta:{...ordinary.meta,rcapPreviewPurpose:'mississippi_clinic',rcapClinicDemoMode:'mississippi_preview',rcapRouteState:'staging_scoped',rcapStagingScopeSha256:createHash('sha256').update('e7c1d76e-dcf2-4d41-b585-ba164806f391,255998e1-eb69-4239-b151-0f8b8935a539').digest('hex'),rcapReturnOrigin:identity.expectedHostedReturnOrigin(release.applicationSha,'mississippi_clinic'),rcapStripeConfigured:'false',rcapCatalogProduct:'inline'}};
async function execute(options={}){
 const calls=[],written={},logs=[],fakeProcess={env:{...env,VERCEL_TOKEN:options.noToken?'':'SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT'},exitCode:undefined};let pages=0;
 const fakeFetch=async(url,request)=>{
  calls.push({url,method:request.method,redirect:request.redirect});let status=200,body;
  const u=new URL(url);
  if(u.pathname.startsWith('/v9/projects/'))body={id:identity.HOSTED_VERCEL_PROJECT_ID,name:'legalease-partner-dashboard-clean',accountId:options.wrongTeam?'team_wrong':'team_4qLmZK9WI6xIy5vjYC0IF3ae'};
  else if(u.pathname==='/v13/deployments/'+new URL(identity.expectedHostedReturnOrigin(release.applicationSha,'mississippi_clinic')).host){status=options.aliasStatus??(options.alias?200:404);body=Object.hasOwn(options,'alias')?options.alias:{};}
  else if(u.pathname.startsWith('/v13/'))body=structuredClone(u.pathname.endsWith('/dpl_SyntheticClinic')?clinic:ordinary);
  else if(u.pathname==='/v6/deployments'){
   pages++;
   body=options.pages?options.pages(pages):{deployments:options.candidate?[{id:clinic.id,meta:clinic.meta}]:[],pagination:{next:pages===1?123:null}};
  }else throw Error('Unexpected endpoint');
  if(options.response)({status,body}=options.response(u,{status,body,pages}));
  return {ok:status>=200&&status<300,status,text:async()=>typeof body==='string'?body:JSON.stringify(body)};
 };
 const body=stripped(inline(probe)).replaceAll('await import(','await importHelper(');
 await new AsyncFunction('fs','assert','createHash','fetch','process','importHelper','console',body)({mkdirSync(){},writeFileSync(file,text){written[file]=text;}},assert,createHash,fakeFetch,fakeProcess,async spec=>spec.includes('rest-transport')?transport:identity,{log:value=>logs.push(value)});
 const text=written['hosted-acceptance-evidence/vercel-raw-readonly/result.json'];
 assert(text);assert(Buffer.byteLength(text)<=262144);assert(!text.includes('SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT'));assert(!text.includes('CURSOR_PRIVATE_CANARY_DO_NOT_EMIT'));assert(!logs.join('\n').includes('SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT'));
 for(const call of calls){const u=new URL(call.url);assert.equal(u.origin,'https://api.vercel.com');assert.equal(u.searchParams.get('teamId'),'team_4qLmZK9WI6xIy5vjYC0IF3ae');assert.equal(call.method,'GET');assert.equal(call.redirect,'error');}
 return {result:JSON.parse(text),calls,exit:fakeProcess.exitCode};
}

test('actual raw body passes only full two-page/three-ordinary/absent-alias GET proof using existing assertions and saved credential',async()=>{
 const {result,calls,exit}=await execute();assert.equal(result.status,'PASS');assert.equal(result.passed,true);assert.equal(exit,undefined);assert.equal(result.ordinary.length,3);assert.equal(result.pages.length,2);assert.equal(result.paginationComplete,true);assert.equal(result.clinicAlias.state,'absent');assert.equal(calls.length,7);assert.equal(result.writes,0);
});

test('actual raw body refuses missing credential, wrong identity, HTTP403/201/204, incomplete/repeated/nonfinite pagination without leaking response values',async()=>{
 const cases=[{noToken:true},{wrongTeam:true},{response:(u,x)=>u.pathname.startsWith('/v9/')?{status:403,body:{secret:'SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT'}}:x},{pages:()=>({deployments:[],pagination:{}})},{pages:()=>({deployments:[],pagination:{next:123}})},{pages:()=>({deployments:[],pagination:{next:'CURSOR_PRIVATE_CANARY_DO_NOT_EMIT'}})},{response:(u,x)=>u.pathname==='/v6/deployments'?{...x,status:201}:x},{response:(u,x)=>u.pathname==='/v6/deployments'?{...x,status:204}:x}];
 for(const scenario of cases){const {result,exit}=await execute(scenario);assert.equal(result.status,'HOLD');assert.equal(result.passed,false);assert.equal(exit,1);assert.equal(result.writes,0);}
 const missing=await execute({noToken:true});assert.equal(missing.calls.length,0);
 const denied=await execute(cases[2]);assert.equal(denied.result.failure,'PROVIDER_HTTP_403');assert.equal(denied.calls.length,1);
});

test('actual raw body preserves metadata/non-READY/candidate/alias conflicts as HOLD and never creates or emits protection metadata',async()=>{
 for(const scenario of [
  {response:(u,x)=>u.pathname.startsWith('/v13/')?{...x,body:{...x.body,target:'production'}}:x},
  {candidate:true,response:(u,x)=>u.pathname.endsWith('/dpl_SyntheticClinic')?{...x,body:{...x.body,readyState:'ERROR'}}:x},
  {candidate:true,response:(u,x)=>u.pathname.endsWith('/dpl_SyntheticClinic')?{...x,body:{...x.body,meta:{...x.body.meta,rcapStagingScopeSha256:'wrong'}}}:x},
  {candidate:true},
  {alias:{projectId:'SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT',deploymentId:'SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT',protectionBypass:{SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT:{}}}},
  ...[null,false,0,''].map(alias=>({aliasStatus:200,alias}))
 ]){const {result,exit}=await execute(scenario);assert.equal(result.status,'HOLD');assert.equal(exit,1);assert.equal(result.writes,0);}
 const falsey=await execute({aliasStatus:200,alias:null});assert.equal(falsey.result.clinicAlias.state,'present');assert.equal(falsey.result.failure,'EXISTING_CLINIC_ALIAS_REQUIRES_RECONCILIATION');
});

test('response/page bounds fail closed and workflow has one narrowly scoped secret, safe artifact and no mutating scripts',async()=>{
 const huge=await execute({response:(u,x)=>u.pathname.startsWith('/v13/')?{status:200,body:'x'.repeat(2097153)}:x});assert.equal(huge.result.failure,'RESPONSE_SIZE_BOUND');
 const bound=await execute({pages:n=>({deployments:[],pagination:{next:n}})});assert.equal(bound.result.failure,'PAGE_BOUND');assert.equal(bound.result.pages.length,50);
 const privateSteps=job.steps.filter(s=>s.env&&Object.values(s.env).some(v=>String(v).includes('${{ secrets.')));assert.deepEqual(privateSteps,[probe]);assert.deepEqual(Object.keys(probe.env),['VERCEL_TOKEN']);assert(job.steps.indexOf(binding)<job.steps.indexOf(probe));
 assert.equal(job.steps[1]['working-directory'],'carrier');assert.equal(job.defaults.run['working-directory'],'admitted-controller');
 const checkout=job.steps.filter(s=>s.uses==='actions/checkout@v4');assert.equal(checkout[1].with.ref,H);assert.equal(checkout[1].with['fetch-depth'],0);for(const c of checkout)assert.equal(c.with['persist-credentials'],false);
 const upload=job.steps.at(-1);assert.equal(upload.if,'always()');assert.equal(upload.with.name,'rcap-vercel-raw-readonly-${{ github.run_id }}');assert.equal(upload.with.path,'admitted-controller/hosted-acceptance-evidence/vercel-raw-readonly/');assert.equal(upload.with['if-no-files-found'],'error');
 assert.doesNotMatch(job.steps.map(s=>s.run??'').join('\n'),/createRestPreview\(|rcap-hosted-acceptance-deploy\.mjs|--prod|flyctl|docker|auth-config|npm run build|migrate\.mjs|VERCEL_TOKEN.*console/);
});
