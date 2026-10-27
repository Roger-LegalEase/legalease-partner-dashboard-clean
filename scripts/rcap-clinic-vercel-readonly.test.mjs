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
const H='1e5878528f0b7aea1ada192b01b514bd38b54192',PARENT='2b408f7a15230af1b91cdabd404232f82f87896f';
const branch='codex/f-vercel-raw-readonly-20261026',mode='clinic_vercel_readonly';
const source=(sha,file)=>execFileSync('git',['show',`${sha}:${file}`],{cwd:process.cwd(),encoding:'utf8'});
const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8'));
const job=workflow.jobs[mode],guard=job.steps.find(s=>s.name==='Require the exact read-only dispatch before credentials'),binding=job.steps.find(s=>s.name==='Require the already accepted immutable HELD record bytes before credentials'),probe=job.steps.find(s=>s.name==='Execute only the bounded raw Vercel GET predicates');
const inline=step=>step.run.split("<<'JS'\n")[1].split('\nJS')[0];
const tuple={mode,tools_sha:H,application_sha:'c0052e13d9801d24080275aab02c70c6ea213fa3',worker_source_sha:'32499751569359315248c2048fa111064a47c67f',worker_digest:'sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494',supabase_project_ref:'hyflxnlhpmiqxvvcoiia'};
const env={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF_NAME:branch,GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123'};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const stripped=s=>s.replace(/^import .*;\n/gm,'');
const selected=(w,value)=>Object.entries(w.jobs).filter(([,j])=>!j.if||vm.runInNewContext(j.if,{inputs:{mode:value},startsWith:(v,p)=>v.startsWith(p)})).map(([name])=>name);

test('only the existing read-only job changes; all other jobs, inputs and deployment settings are preserved',()=>{
 const before=YAML.parse(source(PARENT,'.github/workflows/rcap-f1-ephemeral-staging.yml')),after=structuredClone(workflow);
 assert.deepEqual(selected(workflow,mode),[mode]);
 for(const value of before.on.workflow_dispatch.inputs.mode.options)assert.deepEqual(selected(workflow,value),selected(before,value));
 delete after.jobs.ordinary_admin_readonly;after.on.workflow_dispatch.inputs.mode.options=after.on.workflow_dispatch.inputs.mode.options.filter(v=>v!=='ordinary_admin_readonly');delete after.jobs.ordinary_admin_provision;after.on.workflow_dispatch.inputs.mode.options=after.on.workflow_dispatch.inputs.mode.options.filter(v=>v!=='ordinary_admin_provision');
 delete before.jobs[mode];delete after.jobs[mode];assert.deepEqual(after,before);
 assert.equal(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'),source(PARENT,'vercel.json'));
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

test('binding checks immutable accepted HELD bytes without rerunning native/source/CURRENT checks',()=>{
 const read=name=>Buffer.from(source(H,name));
 const run=(readFileSync=read,head=H)=>new Function('fs','assert','createHash','execFileSync',stripped(inline(binding)))({readFileSync},assert,createHash,()=>head);
 assert.doesNotThrow(()=>run());assert.throws(()=>run(read,'b'.repeat(40)));
 for(const name of ['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'])assert.throws(()=>run(file=>file.includes(name)?Buffer.from('{}'):read(file)));
 assert.doesNotMatch(inline(binding),/requireCurrentReleaseCandidate|requireManagedStartPreviewAdmission|verify-release|canonical-worker/);
 assert.match(inline(binding),/FORWARD_BOUND_HOSTED_PENDING/);assert.match(inline(binding),/deploymentAuthorized:false/);
});

// Use the exact existing pure assertion declarations, without importing their CURRENT-bound module initializer.
const declarations=(file,names)=>{const text=source(H,file),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);return ast.statements.filter(s=>ts.isFunctionDeclaration(s)?names.includes(s.name?.text):ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>names.includes(d.name.getText(ast)))).map(s=>s.getText(ast).replace(/^export /,'')).join('\n');};
const identityNames=['HOSTED_VERCEL_TEAM_SLUG','HOSTED_VERCEL_TEAM_ID','HOSTED_VERCEL_PROJECT_ID','HOSTED_VERCEL_PROJECT_NAME','HOSTED_MS_CLINIC_PARTICIPANTS','HOSTED_ORDINARY_PREVIEW','TEAM_ID','PROJECT_ID','getJson','expectedHostedReturnOrigin','hostedVercelScopedUrl','resolveHostedVercelIdentity'];
const identity=new Function(declarations('scripts/rcap-hosted-acceptance-vercel-identity.mjs',identityNames)+'\nreturn {HOSTED_ORDINARY_PREVIEW,HOSTED_VERCEL_PROJECT_ID,expectedHostedReturnOrigin,hostedVercelScopedUrl,resolveHostedVercelIdentity};')();
const release=JSON.parse(source(H,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const FROZEN_WORKER_METADATA={rcapWorkerSourceSha:release.workerSourceSha,rcapWorkerDigest:release.workerDigest,rcapWorkerInputFingerprint:release.workerInputFingerprint};
const grantText=source(H,'data/record-clearing/legal-decisions/2026-10-24-ms-nonconv-ordinary-internal-qa.json'),grant=JSON.parse(grantText);
const historical={rcapWorkerSourceSha:'615b4021f7fff4b41b774967a78f4b117cfce3e2',rcapWorkerDigest:'sha256:4704199f2f683b9169702f0d2b5038cb7724569091d88c347867ab6a95aa1b7b',rcapWorkerInputFingerprint:'sha256:7418fff6198b7c1f137916ddb8d379f4229ce525d691f766e1e01bf522318fe3'};
const ordinary={id:identity.HOSTED_ORDINARY_PREVIEW.id,url:identity.HOSTED_ORDINARY_PREVIEW.immutableHostname,target:null,projectId:identity.HOSTED_VERCEL_PROJECT_ID,gitSource:{sha:identity.HOSTED_ORDINARY_PREVIEW.applicationSha},readyState:'READY',meta:{...historical,rcapApplicationSha:identity.HOSTED_ORDINARY_PREVIEW.applicationSha,rcapAcceptanceProjectRef:tuple.supabase_project_ref,rcapReturnOrigin:identity.expectedHostedReturnOrigin(identity.HOSTED_ORDINARY_PREVIEW.applicationSha),rcapClinicDemoMode:'none'}};
const clinic={...ordinary,id:'dpl_SyntheticClinic',url:'synthetic-managed.vercel.app',gitSource:{sha:release.applicationSha},meta:{...FROZEN_WORKER_METADATA,rcapApplicationSha:release.applicationSha,rcapAcceptanceProjectRef:tuple.supabase_project_ref,rcapPreviewPurpose:'managed_start',rcapClinicDemoMode:'none',rcapRouteState:'staging_scoped',rcapStagingScopeSha256:createHash('sha256').update(grant.participantUserIds.join(',')).digest('hex'),rcapReturnOrigin:identity.expectedHostedReturnOrigin(release.applicationSha,'managed_start'),rcapStripeConfigured:'false',rcapCatalogProduct:'inline',rcapOrdinaryGrantSha256:createHash('sha256').update(grantText).digest('hex'),rcapSponsoredChannel:grant.channel}};
async function execute(options={}){
 const calls=[],written={},logs=[],fakeProcess={env:{...env,VERCEL_TOKEN:options.noToken?'':'SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT'},exitCode:undefined};let pages=0;
 const fakeFetch=async(url,request)=>{
  calls.push({url,method:request.method,redirect:request.redirect});let status=200,body;
  const u=new URL(url);
  if(u.pathname.startsWith('/v9/projects/'))body={id:identity.HOSTED_VERCEL_PROJECT_ID,name:'legalease-partner-dashboard-clean',accountId:options.wrongTeam?'team_wrong':'team_4qLmZK9WI6xIy5vjYC0IF3ae',autoExposeSystemEnvs:options.systemEnvs??true};
  else if(u.pathname==='/v13/deployments/'+new URL(identity.expectedHostedReturnOrigin(release.applicationSha,'managed_start')).host){status=options.aliasStatus??(options.alias?200:404);body=Object.hasOwn(options,'alias')?options.alias:{};}
  else if(u.pathname.startsWith('/v13/'))body=structuredClone(u.pathname.endsWith('/dpl_SyntheticClinic')?clinic:ordinary);
  else if(u.pathname==='/v6/deployments'){
   pages++;
   body=options.pages?options.pages(pages):{deployments:options.candidate?[{id:clinic.id,meta:clinic.meta}]:[],pagination:{next:pages===1?123:null}};
  }else throw Error('Unexpected endpoint');
  if(options.response)({status,body}=options.response(u,{status,body,pages}));
  return {ok:status>=200&&status<300,status,text:async()=>typeof body==='string'?body:JSON.stringify(body)};
 };
 let body=stripped(inline(probe)).replaceAll('await import(','await importHelper(');if(options.injectSend)body=body.replace("stage='fixed_project_team_identity';",options.injectSend+";stage='fixed_project_team_identity';");
 await new AsyncFunction('fs','assert','createHash','fetch','process','importHelper','console',body)({mkdirSync(){},readFileSync:file=>source(H,file),writeFileSync(file,text){written[file]=text;}},assert,createHash,fakeFetch,fakeProcess,async spec=>spec==='typescript'?{default:ts}:options.invalidMethod?{...identity,resolveHostedVercelIdentity:opts=>opts.fetchImpl('https://api.vercel.com/v9/projects/legalease-partner-dashboard-clean?teamId=team_4qLmZK9WI6xIy5vjYC0IF3ae',{method:'POST',redirect:'error'})}:identity,{log:value=>logs.push(value)});
 const text=written['hosted-acceptance-evidence/vercel-raw-readonly/result.json'];
 assert(text);assert(Buffer.byteLength(text)<=262144);assert(!text.includes('SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT'));assert(!text.includes('CURSOR_PRIVATE_CANARY_DO_NOT_EMIT'));assert(!logs.join('\n').includes('SYNTHETIC_PRIVATE_TOKEN_DO_NOT_EMIT'));
 for(const call of calls){const u=new URL(call.url);assert.equal(u.origin,'https://api.vercel.com');assert.equal(u.searchParams.get('teamId'),'team_4qLmZK9WI6xIy5vjYC0IF3ae');assert.equal(call.method,'GET');assert.equal(call.redirect,'error');}
 return {result:JSON.parse(text),calls,exit:fakeProcess.exitCode};
}

test('actual raw body passes only full two-page/three-ordinary/absent-alias GET proof using existing assertions and saved credential',async()=>{
 const {result,calls,exit}=await execute();assert.equal(result.status,'PASS');assert.equal(result.passed,true);assert.equal(exit,undefined);assert.equal(result.ordinary.length,3);assert.equal(result.pages.length,2);assert.equal(result.paginationComplete,true);assert.equal(result.managedAlias.state,'absent');assert.equal(calls.length,7);assert.equal(result.writes,0);
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
 const falsey=await execute({aliasStatus:200,alias:null});assert.equal(falsey.result.managedAlias.state,'present');assert.equal(falsey.result.failure,'EXISTING_MANAGED_ALIAS_REQUIRES_RECONCILIATION');
});

test('response/page bounds fail closed and workflow has only the existing scoped credentials, safe artifact and no mutating scripts',async()=>{
 const huge=await execute({response:(u,x)=>u.pathname.startsWith('/v13/')?{status:200,body:'x'.repeat(2097153)}:x});assert.equal(huge.result.failure,'RESPONSE_SIZE_BOUND');
 const bound=await execute({pages:n=>({deployments:[],pagination:{next:n}})});assert.equal(bound.result.failure,'PAGE_BOUND');assert.equal(bound.result.pages.length,50);
 const privateSteps=job.steps.filter(s=>s.env&&Object.values(s.env).some(v=>String(v).includes('${{ secrets.')));const provider=job.steps.find(s=>s.name==='Prove credentials and Preview-only deployment boundary');assert.deepEqual(privateSteps,[provider,probe]);assert(job.steps.indexOf(binding)<job.steps.indexOf(provider));assert(job.steps.indexOf(provider)<job.steps.indexOf(probe));assert.deepEqual(Object.keys(probe.env),['VERCEL_TOKEN']);assert.equal(provider.run,'node scripts/rcap-hosted-acceptance-preflight.mjs');assert.equal(provider.env.PREFLIGHT_SCOPE,'full');assert.equal(provider.env.HOSTED_PREFLIGHT_SERVICE_ONLY,'false');assert.equal(provider.env.SUPABASE_ACCESS_TOKEN,'${{ secrets.SUPABASE_ACCESS_TOKEN }}');assert.equal(provider.env.VERCEL_TOKEN,'${{ secrets.VERCEL_TOKEN }}');assert(job.steps.indexOf(binding)<job.steps.indexOf(probe));
 assert.equal(job.steps[1]['working-directory'],'carrier');assert.equal(job.defaults.run['working-directory'],'admitted-controller');
 const checkout=job.steps.filter(s=>s.uses==='actions/checkout@v4');assert.equal(checkout[1].with.ref,H);assert.equal(checkout[1].with['fetch-depth'],0);for(const c of checkout)assert.equal(c.with['persist-credentials'],false);
 const upload=job.steps.at(-1);assert.equal(upload.if,'always()');assert.equal(upload.with.name,'rcap-vercel-raw-readonly-${{ github.run_id }}');assert.equal(upload.with.path,'admitted-controller/hosted-acceptance-evidence/vercel-raw-readonly/result.json\nadmitted-controller/hosted-acceptance-evidence/preflight.json\n');assert.equal(upload.with['if-no-files-found'],'error');
 assert.doesNotMatch(job.steps.map(s=>s.run??'').join('\n'),/createRestPreview\(|rcap-hosted-acceptance-deploy\.mjs|--prod|flyctl|docker|auth-config|npm run build|migrate\.mjs|VERCEL_TOKEN.*console/);
});


test('fixed GET boundary rejects unexpected method, URL, parameters and system env suppression',async()=>{
 for(const options of [{invalidMethod:true},{systemEnvs:false},...[
 'https://example.com/v6/deployments?teamId=team_4qLmZK9WI6xIy5vjYC0IF3ae',
 'https://api.vercel.com/v9/projects/wrong?teamId=team_4qLmZK9WI6xIy5vjYC0IF3ae',
 'https://api.vercel.com/v13/deployments/dpl_Unlisted?teamId=team_4qLmZK9WI6xIy5vjYC0IF3ae',
 'https://api.vercel.com/v6/deployments?teamId=team_4qLmZK9WI6xIy5vjYC0IF3ae&projectId=prj_cdgwGzFqIHgEUlzEburSLaZETdQV&limit=100&decrypt=true',
 'https://api.vercel.com/v6/deployments?teamId=team_4qLmZK9WI6xIy5vjYC0IF3ae&projectId=wrong&limit=100',
 'https://api.vercel.com/v6/deployments?teamId=team_4qLmZK9WI6xIy5vjYC0IF3ae&projectId=prj_cdgwGzFqIHgEUlzEburSLaZETdQV&limit=101',
 'https://api.vercel.com/v6/deployments?teamId=team_4qLmZK9WI6xIy5vjYC0IF3ae&projectId=prj_cdgwGzFqIHgEUlzEburSLaZETdQV&limit=100&until=bad'
 ].map(url=>({injectSend:'await send('+JSON.stringify(url)+')'}))]){
 const {result,exit}=await execute(options);assert.equal(result.status,'HOLD');assert.equal(exit,1);assert.equal(result.writes,0);
 }
 assert.doesNotMatch(inline(probe),/await import\('.*rest-transport/);
 assert.match(inline(probe),/createHash\('sha256'\).update\(transportText\)/);
});

const adminMode='ordinary_admin_readonly',adminJob=workflow.jobs[adminMode],adminGuard=adminJob.steps.find(s=>s.name==='Require the exact current ordinary read-only dispatch before credentials');
const adminTuple={mode:adminMode,application_sha:tuple.application_sha,tools_sha:tuple.application_sha,worker_source_sha:tuple.worker_source_sha,worker_digest:tuple.worker_digest,supabase_project_ref:tuple.supabase_project_ref,preview_hostname:'legalease-rcap-managed-c0052e13d980-roger947s-projects.vercel.app',preview_deployment_id:'dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF',preview_creation_run_id:'40424719189'};

test('ordinary read continuation adds only its existing-carrier mode/job and leaves all previous jobs/input defaults unchanged',()=>{
 const before=YAML.parse(source('5259a100e7c00cf91f8360f4d1fc4579d5dd196f','.github/workflows/rcap-f1-ephemeral-staging.yml')),after=structuredClone(workflow);
 assert.deepEqual(selected(workflow,adminMode),[adminMode]);
 for(const value of before.on.workflow_dispatch.inputs.mode.options)assert.deepEqual(selected(workflow,value),selected(before,value));
 delete after.jobs.ordinary_admin_provision;after.on.workflow_dispatch.inputs.mode.options=after.on.workflow_dispatch.inputs.mode.options.filter(v=>v!=='ordinary_admin_provision');delete after.jobs[adminMode];after.on.workflow_dispatch.inputs.mode.options=after.on.workflow_dispatch.inputs.mode.options.filter(v=>v!==adminMode);assert.deepEqual(after,before);
});

test('ordinary exact dispatch guard rejects tuple, ref, attempts, business inputs and helper byte drift before any credential',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordinary-admin-guard-'));
 try{
  fs.mkdirSync(path.join(root,'scripts'));fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify({git:{deploymentEnabled:{[branch]:false}}}));
  for(const name of ['rcap-hosted-ordinary-admin-readonly.mjs','rcap-hosted-ordinary-admin-readonly-runner.mjs'])fs.copyFileSync(new URL(name,import.meta.url),path.join(root,'scripts',name));
  const run=(patch={},extra={})=>spawnSync(process.execPath,['--input-type=module','-'],{cwd:root,input:inline(adminGuard),encoding:'utf8',env:{...env,GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',DISPATCH_INPUTS:JSON.stringify({...adminTuple,...patch}),...extra}}).status;
  assert.equal(run(),0);for(const key of Object.keys(adminTuple))assert.notEqual(run({[key]:'wrong'}),0);
  for(const key of ['clinic_attempt_id','sponsor_case','contradiction_job_id','promotion_code','journey_state','expected_total_cents','resume_matter_id','clinic_resume_authorization','clinic_session_closure_authorization'])assert.notEqual(run({[key]:'unexpected'}),0);
  assert.notEqual(run({sponsor_items:'["unexpected"]'}),0);assert.notEqual(run({sponsor_fulfillment:true}),0);
  for(const extra of [{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_EVENT_NAME:'push'},{GITHUB_REF_NAME:'captain-release'},{GITHUB_WORKFLOW_SHA:'b'.repeat(40)},{GITHUB_REPOSITORY:'another/repo'}])assert.notEqual(run({},extra),0);
  fs.appendFileSync(path.join(root,'scripts/rcap-hosted-ordinary-admin-readonly.mjs'),'\n// drift');assert.notEqual(run(),0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('ordinary customer read uses only existing Chrome/pinned dependencies, bypass-only app credential, exact native artifact and sanitized output',()=>{
 const runs=adminJob.steps.map(s=>s.run??'').join('\n');
 assert.doesNotMatch(runs,/playwright install|npm run build|docker|flyctl|requireCurrentReleaseCandidate|requireManagedStartPreviewAdmission|verify-rcap-application-candidate|SUPABASE_SERVICE_ROLE_KEY|INTERNAL_ADMIN_TOKEN/);
 const secretSteps=adminJob.steps.filter(s=>s.env&&Object.values(s.env).some(v=>String(v).includes('${{ secrets.')));assert.equal(secretSteps.length,1);
 assert.deepEqual(Object.keys(secretSteps[0].env).sort(),['ORDINARY_ADMIN_EVIDENCE_FILE','RCAP_ADMIN_NATIVE_DEPLOY_FILE','VERCEL_AUTOMATION_BYPASS_SECRET'].sort());assert.equal(secretSteps[0].env.VERCEL_AUTOMATION_BYPASS_SECRET,'${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}');
 assert.equal(secretSteps[0].run,'node scripts/rcap-hosted-ordinary-admin-readonly-runner.mjs');assert.equal(secretSteps[0].env.ORDINARY_ADMIN_EVIDENCE_FILE,'ordinary-admin-readonly-evidence/result.json');
 const installs=adminJob.steps.filter(s=>s.run?.startsWith('npm ci'));assert.equal(installs.length,1);assert.equal(installs[0]['working-directory'],'admitted-controller');assert.equal(installs[0].run,'npm ci --ignore-scripts --no-audit --no-fund');assert.match(runs,/test -x \/usr\/bin\/google-chrome/);
 const checkouts=adminJob.steps.filter(s=>s.uses==='actions/checkout@v4');assert.equal(checkouts.length,2);assert.equal(checkouts[1].with.ref,H);for(const c of checkouts)assert.equal(c.with['persist-credentials'],false);
 const credential=adminJob.steps.find(s=>s.name==='Require the exact original credential source object without executing it');assert(adminJob.steps.indexOf(credential)<adminJob.steps.indexOf(secretSteps[0]));assert.match(credential.run,/git cat-file -e 'd3d8ff707d4d21ab508405494e6ee27056582a1a\^\{commit\}'/);assert.match(credential.run,/git fetch --no-tags --no-write-fetch-head origin d3d8ff707d4d21ab508405494e6ee27056582a1a/);assert.match(credential.run,/cdf9d28192cc54de72e6c9ccef5f389c678b7472a60c6408ad54b0735e5d695c/);assert.doesNotMatch(credential.run,/console\.log|import\(.*auth-config|node scripts\/rcap-hosted-acceptance-auth-config/);
 const native=adminJob.steps.find(s=>s.name==='Read only the original accepted native creation artifact');assert.deepEqual(native.env,{GH_TOKEN:'${{ github.token }}'});assert.match(native.run,/artifacts\/12699943085\/zip/);assert.match(native.run,/z.getinfo\('deploy.json'\)/);assert.doesNotMatch(native.run,/extractall|extract\(/);
 const upload=adminJob.steps.at(-1);assert.equal(upload.if,'always()');assert.equal(upload.with.path,'carrier/ordinary-admin-readonly-evidence/result.json');assert.doesNotMatch(upload.with.path,/\*|screenshots|traces|session|native|deploy/);
});


// Actual15 script/style requests from protected current sign-in HTML in failed40430532114.
test('ordinary sign-in hydration admits exactly current deployment static assets and preserves restrictive auth/business boundaries',async()=>{
 const {requestAllowed,ORIGIN}=await import('./rcap-hosted-ordinary-admin-readonly.mjs');
 const oldText=source('afda59d6f8eb0e3bfefd5edca9a12d12f64e8ff4','scripts/rcap-hosted-ordinary-admin-readonly.mjs').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
 const before=vm.runInNewContext(oldText+'\n({requestAllowed});',{});
 const paths=["/_next/static/chunks/0lgd-rsdcyvo..css","/_next/static/chunks/0-hrh_uw98wb_.js","/_next/static/chunks/11hoao1sm226v.js","/_next/static/chunks/0aqpm5mabssqz.js","/_next/static/chunks/0uqgm3y7qfyr6.js","/_next/static/chunks/128aahewwf1we.js","/_next/static/chunks/turbopack-0ofv4dff~juen.js","/_next/static/chunks/05efiop9yrqzr.js","/_next/static/chunks/0re8tk4-vssb-.js","/_next/static/chunks/0i.l9589uvx0j.js","/_next/static/chunks/04sj6i5ht5ob-.js","/_next/static/chunks/0rvnzn~axm.b-.js","/_next/static/chunks/0f.g0mlz752ge.js","/_next/static/chunks/03~yq9q893hmn.js","/_next/static/chunks/0-hrh_uw98wb_.js"];assert.equal(paths.length,15);
 for(const file of paths){
  const url=ORIGIN+file+'?dpl=dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF';
  assert.equal(before.requestAllowed(url,'GET',0),false);assert.equal(requestAllowed(url,'GET',0),true);assert.equal(requestAllowed(url,'HEAD',0),true);
  for(const bad of [url.replace('dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF','dpl_Wrong'),url+'&unexpected=1',url.replace(ORIGIN,'https://example.com'),url.replace('/_next/static/chunks/','/api/internal/'),url+'&dpl=dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF'])assert.equal(requestAllowed(bad,'GET',0),false);
  assert.equal(requestAllowed(url,'POST',0),false);
 }
 assert.equal(requestAllowed('https://hyflxnlhpmiqxvvcoiia.supabase.co/auth/v1/token?grant_type=password','POST',0),true);assert.equal(requestAllowed('https://hyflxnlhpmiqxvvcoiia.supabase.co/auth/v1/token?grant_type=password','POST',1),false);
 const helper=fs.readFileSync(new URL('./rcap-hosted-ordinary-admin-readonly.mjs',import.meta.url),'utf8');assert(helper.indexOf('form[data-handler-ready="true"]')<helper.indexOf('credentials=credentialReader()'));assert.match(helper,/blockedRequests\[category\]/);
});

const provisionMode='ordinary_admin_provision',provisionJob=workflow.jobs[provisionMode],provisionGuard=provisionJob.steps.find(s=>s.name==='Require the exact current ordinary one-provision dispatch before credentials');
test('one-provision continuation adds only its carrier mode/job; existing read-only and other jobs remain unchanged',()=>{
 const before=YAML.parse(source('8f1faf416fbcd9ff4e8999cfe966623e3b22c0cf','.github/workflows/rcap-f1-ephemeral-staging.yml')),after=structuredClone(workflow);
 assert.deepEqual(selected(workflow,provisionMode),[provisionMode]);for(const value of before.on.workflow_dispatch.inputs.mode.options)assert.deepEqual(selected(workflow,value),selected(before,value));
 delete after.jobs[provisionMode];after.on.workflow_dispatch.inputs.mode.options=after.on.workflow_dispatch.inputs.mode.options.filter(v=>v!==provisionMode);assert.deepEqual(after,before);
});
test('provision dispatch freezes current tuple/source and rejects business override, drift and repeated attempts before credentials',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ordinary-provision-guard-'));
 try{
  fs.mkdirSync(path.join(root,'scripts'));fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify({git:{deploymentEnabled:{[branch]:false}}}));
  const files=['rcap-hosted-ordinary-admin-readonly.mjs','rcap-hosted-ordinary-admin-provision-once.mjs','rcap-hosted-ordinary-admin-provision-once-runner.mjs'];for(const name of files)fs.copyFileSync(new URL(name,import.meta.url),path.join(root,'scripts',name));
  const input={...adminTuple,mode:provisionMode},run=(patch={},extra={})=>spawnSync(process.execPath,['--input-type=module','-'],{cwd:root,input:inline(provisionGuard),encoding:'utf8',env:{...env,GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',DISPATCH_INPUTS:JSON.stringify({...input,...patch}),...extra}}).status;
  assert.equal(run(),0);for(const key of Object.keys(input))assert.notEqual(run({[key]:'wrong'}),0);
  for(const key of ['clinic_attempt_id','sponsor_case','contradiction_job_id','promotion_code','journey_state','expected_total_cents','resume_matter_id','clinic_resume_authorization','clinic_session_closure_authorization'])assert.notEqual(run({[key]:'unexpected'}),0);
  assert.notEqual(run({sponsor_items:'["unexpected"]'}),0);assert.notEqual(run({sponsor_fulfillment:true}),0);for(const extra of [{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_EVENT_NAME:'push'},{GITHUB_REF_NAME:'captain-release'},{GITHUB_WORKFLOW_SHA:'b'.repeat(40)}])assert.notEqual(run({},extra),0);
  for(const name of files){const file=path.join(root,'scripts',name),original=fs.readFileSync(file);fs.appendFileSync(file,'\n// drift');assert.notEqual(run(),0);fs.writeFileSync(file,original);}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('provision continuation retains existing dependency/browser/native bindings and uploads only three sanitized checkpoints',()=>{
 const sharedNames=['Bind the already accepted immutable controller record bytes','Install only locked controller runner dependencies without builds or browser install','Use the existing runner Chrome and pinned controller dependencies','Require the exact original credential source object without executing it','Read only the original accepted native creation artifact'];
 for(const name of sharedNames)assert.deepEqual(provisionJob.steps.find(s=>s.name===name),adminJob.steps.find(s=>s.name===name));
 assert.equal(provisionJob.steps.filter(s=>s.run?.startsWith('npm ci')).length,1);
 const secrets=provisionJob.steps.filter(s=>s.env&&Object.values(s.env).some(v=>String(v).includes('${{ secrets.')));assert.equal(secrets.length,1);assert.deepEqual(Object.keys(secrets[0].env).sort(),['ORDINARY_ADMIN_EVIDENCE_FILE','RCAP_ADMIN_NATIVE_DEPLOY_FILE','VERCEL_AUTOMATION_BYPASS_SECRET'].sort());assert.equal(secrets[0].run,'node scripts/rcap-hosted-ordinary-admin-provision-once-runner.mjs');assert.equal(secrets[0].env.VERCEL_AUTOMATION_BYPASS_SECRET,'${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}');
 const upload=provisionJob.steps.at(-1);assert.equal(upload.if,'always()');assert.equal(upload.with.path,'carrier/ordinary-admin-provision-evidence/before-submit.json\ncarrier/ordinary-admin-provision-evidence/provision-response.json\ncarrier/ordinary-admin-provision-evidence/result.json\n');assert.doesNotMatch(upload.with.path,/\*|screenshots|session|native|deploy/);
 assert.doesNotMatch(provisionJob.steps.map(s=>s.run??'').join('\n'),/playwright install|npm run build|docker|flyctl|node scripts\/rcap-hosted-acceptance-auth-config|SUPABASE_SERVICE_ROLE_KEY|INTERNAL_ADMIN_ACCESS_TOKEN|verify-rcap-application-candidate|requireCurrentReleaseCandidate|migrate\.mjs/);
});
