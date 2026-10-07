#!/usr/bin/env node
// No application/worker build. One native attempt, exact ordered operations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {HOTFIX_OWNER,HOTFIX_PROJECT,HOTFIX_MIGRATION,HOTFIX_ENV,HOTFIX_PHASES,hotfixHash,executeHotfix,assertHotfixStaging,deploymentApplicationSha,assertHotfixRollback,requireHotfixAdmission} from './grade-a-launch-control/hotfix-production-contract.mjs';
import {resolveHostedVercelIdentity,hostedVercelScopedUrl,HOSTED_VERCEL_PROJECT_NAME} from './rcap-hosted-acceptance-vercel-identity.mjs';
import {productionDomainsPath,productionProjectDomains,productionDeploymentAliases} from './grade-a-launch-control/vercel-production-scopes.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shaSQL="select pg_get_functiondef('public.rcap_service_review_onboarding(text,uuid,uuid,bigint,uuid,text,jsonb)'::regprocedure) as definition";
const original="raise exception using errcode = '40001', message = 'Onboarding workspace revision conflict';";
const corrected="raise exception using errcode = 'PT409', message = 'Onboarding workspace revision conflict';";
export function expectedHotfixDefinition(definition){assert.equal(definition.split(original).length-1,1,'one original conflict statement');assert(!definition.includes(corrected));return definition.replace(original,corrected);}
export function safeEnvironment(envs){assert(Array.isArray(envs));return envs.map(({value,...e})=>e).sort((a,b)=>String(a.id).localeCompare(String(b.id)));}
export function assertOnlyFlagChange(before,after){
 const other=rows=>safeEnvironment(rows.filter(e=>e.key!==HOTFIX_ENV.key));assert.deepEqual(other(after),other(before),'zero additional environment mutation');
 const flags=after.filter(e=>e.key===HOTFIX_ENV.key);assert.equal(flags.length,1);assert.deepEqual(flags[0].target,['production']);assert.equal(flags[0].type,'plain');
}
export async function assertNativeHotfixAttempt(owner,env,request=fetch){
 const base='https://api.github.com/repos/Roger-LegalEase/legalease-partner-dashboard-clean';
 const get=async p=>{const r=await request(base+p,{headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok,'native run/job inventory failed');return r.json();};
 const run=await get('/actions/runs/'+env.GITHUB_RUN_ID);assert.equal(String(run.id),env.GITHUB_RUN_ID);assert.equal(run.head_sha,env.GITHUB_SHA);assert.equal(run.head_branch,'captain-release');assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');assert.equal(run.event,'workflow_dispatch');assert.equal(run.run_attempt,1);assert.equal(run.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');assert(run.display_title.includes('production_hotfix'));
 const since=Math.floor(Date.parse(owner.recordedAt)/1000)*1000;
 for(let page=1;page<=100;page++){const list=await get('/actions/workflows/rcap-f1-ephemeral-staging.yml/runs?event=workflow_dispatch&per_page=100&page='+page);assert(Array.isArray(list.workflow_runs));
  for(const prior of list.workflow_runs){if(prior.id===run.id||Date.parse(prior.created_at)<since||!prior.display_title.includes('production_hotfix'))continue;
   const jobs=await get('/actions/runs/'+prior.id+'/jobs?per_page=100');assert(!jobs.total_count||jobs.total_count<=100,'complete attempt inventory');
   assert(!jobs.jobs.some(j=>j.steps?.some(s=>s.name==='Execute bounded onboarding hotfix Production release'&&s.conclusion!=='skipped')),'hotfix already attempted; no second staging or activation');
  }if(list.workflow_runs.length<100||list.workflow_runs.every(r=>Date.parse(r.created_at)<since))return run;
 }throw Error('complete native attempt inventory required');
}
export async function runHotfixProduction(root,env=process.env,{admit=requireHotfixAdmission,request=fetch,command=execFileSync,runCommand}={}){
 const {owner,candidate,current,bindingVerified,admissionVerified,rebuildRequired}=await admit(root,env);
 assert.equal(current,true,'current release binding required');assert.equal(bindingVerified,true);assert.equal(admissionVerified,true,'current release admission required');assert.equal(rebuildRequired,false);
 assert.equal(env.RCAP_APPLICATION_SHA,owner.applicationSha);assert.equal(env.RCAP_WORKER_SOURCE_SHA,owner.workerSourceSha);assert.equal(env.RCAP_WORKER_DIGEST,owner.workerDigest);assert.equal(env.RCAP_TOOLS_SHA,owner.toolsSha);
 for(const k of ['VERCEL_TOKEN','SUPABASE_ACCESS_TOKEN','GITHUB_TOKEN','VERCEL_AUTOMATION_BYPASS_SECRET'])assert(env[k],k+' unavailable');
 const dir=path.join(root,'production-hotfix-evidence');fs.mkdirSync(dir,{recursive:true});
 const journalPath=path.join(dir,'execution.json');assert(!fs.existsSync(journalPath),'no local execution replay');
 const save=(name,data)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(data,null,2)+'\n');
 const native=await assertNativeHotfixAttempt(owner,env,request);save('native-start-run.json',native);
 const journal={schemaVersion:'rcap-onboarding-hotfix-execution/v1',ownerSha256:hotfixHash(fs.readFileSync(path.join(root,HOTFIX_OWNER))),executorControlSha:owner.executorControlSha,executionSha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,steps:[],rollback:{attempted:false,status:'not-required'},databaseRollbackAuthorized:false};
 const persist=j=>save('execution.json',j);
 const identity=await resolveHostedVercelIdentity({token:env.VERCEL_TOKEN,fetchImpl:request});
 const api=async(url,token,method='GET',body)=>{const r=await request(url,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(120000)});const j=await r.json().catch(()=>null);assert(r.ok,`provider ${method} failed HTTP ${r.status} ${j?.error?.code??j?.code??''}`);return j;};
 const vercel=(p,method,body)=>api(hostedVercelScopedUrl(p,identity),env.VERCEL_TOKEN,method,body);
 const query=(sql,read_only=true)=>api(`https://api.supabase.com/v1/projects/${HOTFIX_PROJECT}/database/query`,env.SUPABASE_ACCESS_TOKEN,'POST',{query:sql,read_only});
 const run=async(program,args,extra={},input)=>{if(runCommand)return runCommand(program,args,{...env,...extra},input);await new Promise((resolve,reject)=>{const child=spawn(program,args,{cwd:root,env:{...env,...extra},stdio:input?['pipe','inherit','inherit']:'inherit'});if(input)child.stdin.end(input);child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error(program+' failed exit '+code)));});};
 const childEnv=phase=>({...env,RCAP_HOTFIX_JOURNAL:journalPath,RCAP_PRODUCTION_PHASE:phase,RCAP_PRODUCTION_PROJECT_REF:HOTFIX_PROJECT,RCAP_TOOLS_SHA:owner.toolsSha,RCAP_APPLICATION_SHA:owner.applicationSha,RCAP_WORKER_SOURCE_SHA:owner.workerSourceSha,RCAP_WORKER_DIGEST:owner.workerDigest,RCAP_PRODUCTION_EVIDENCE_DIR:path.join(dir,phase),RCAP_PRODUCTION_SMOKE_EVIDENCE_FILE:path.join(dir,'smoke/production-canary-smoke.json'),IMAGE_REPOSITORY:'ghcr.io/roger-legalease/rcap-render-worker',FLY_APP_NAME:'legalease-rcap-render-worker'});
 const flagRows=rows=>rows.filter(e=>e.key===HOTFIX_ENV.key);
 const value=async e=>{const r=await vercel(`/v1/projects/${identity.projectId}/env/${e.id}?decrypt=true`);assert.equal(r.key,HOTFIX_ENV.key);return r.value;};
 const inventory=async rollback=>{
  const [domains,aliases,environ]=await Promise.all([vercel(productionDomainsPath(identity.projectId)),vercel(`/v3/deployments/${rollback}/aliases`),vercel(`/v9/projects/${identity.projectId}/env`)]);
  const d=productionProjectDomains(domains),a=productionDeploymentAliases(aliases);const targets=[];
  for(const domain of d.filter(d=>d.redirect===null)){const t=await vercel('/v13/deployments/'+encodeURIComponent(domain.name));assert.equal(t.projectId,identity.projectId);assert.equal(t.readyState,'READY');assert.equal(t.target,'production');targets.push({domain:domain.name,id:t.id??t.uid});}
  return {domains:d,aliases:a,environment:safeEnvironment(environ.envs),targets};
 };
 let initialEnv,initialFlag,initialDefinition,expectedDefinition,envChanged=false,stagingBefore;
 const perform=async(phase,request,j)=>{
  console.log('HOTFIX phase '+phase+' — exact scope authorized');
  if(phase==='preflight'){
   const projects=await api('https://api.supabase.com/v1/projects',env.SUPABASE_ACCESS_TOKEN);const prod=projects.find(p=>p.id===HOTFIX_PROJECT);assert(prod&&prod.status==='ACTIVE_HEALTHY','exact Production project ACTIVE_HEALTHY');
   const scopes=productionProjectDomains(await vercel(productionDomainsPath(identity.projectId)));const current=await vercel('/v13/deployments/'+encodeURIComponent(scopes.find(d=>d.redirect===null).name));
   assert.equal(current.projectId,identity.projectId);assert.equal(current.target,'production');assert.equal(current.readyState,'READY');deploymentApplicationSha(current);
   // A newer rollback is accepted only with an existing successful native
   // activation receipt committed in this repository, never from chat.
   assert(scopes.some(d=>d.name==='legaleasepartner.com'&&d.redirect===null),'authorized Production domain');
   assert.deepEqual(scopes,candidate.hostedAdmission.productionProjectDomains,'Production routing unchanged from admission');
   const closureRollback=candidate.hostedAdmission.productionRollback;
   const acceptedRollback=new Set([closureRollback]);
   const walk=p=>{for(const entry of fs.readdirSync(p,{withFileTypes:true})){const file=path.join(p,entry.name);if(entry.isDirectory())walk(file);else if(entry.name==='production-activation.json'){const a=read(file);if(a.passed===true&&a.promotionCompleted===true)acceptedRollback.add(a.stagedDeploymentId);}}};walk(path.join(root,'hosted-acceptance-evidence'));
   assert(acceptedRollback.has(current.id??current.uid),'active Production rollback must have accepted native history');
   j.rollbackDeploymentId=current.id??current.uid;j.rollbackApplicationSha=deploymentApplicationSha(current);const state=await inventory(j.rollbackDeploymentId);assert(state.targets.every(t=>t.id===j.rollbackDeploymentId),'sole READY rollback active');
   j.productionProjectDomains=state.domains;j.productionDeploymentAliases=state.aliases;j.preflightState=state;
   initialEnv=(await vercel(`/v9/projects/${identity.projectId}/env`)).envs;assert(Array.isArray(initialEnv));const flags=flagRows(initialEnv);assert(flags.length<=1,'one Production flag entry');initialFlag=flags[0]??null;
   if(initialFlag){assert.deepEqual(initialFlag.target,['production']);assert.equal(initialFlag.type,'plain','no secret change');initialFlag={...initialFlag,value:await value(initialFlag)};assert(['true','false'].includes(initialFlag.value),'bounded existing flag value');}
   j.preReleaseFlag=initialFlag?{key:HOTFIX_ENV.key,value:initialFlag.value,target:initialFlag.target,type:initialFlag.type}:null;
   initialDefinition=(await query(shaSQL))[0]?.definition;assert(typeof initialDefinition==='string');expectedDefinition=initialDefinition.includes(corrected)?initialDefinition:expectedHotfixDefinition(initialDefinition);
   const history=await query("select version,name from supabase_migrations.schema_migrations where version='20261007034510'");assert(history.length<=1);j.migrationAlreadyApplied=history.length===1;assert(!j.migrationAlreadyApplied||initialDefinition===expectedDefinition,'migration history agrees with catalog');
   save('preflight.json',{passed:true,productionProjectRef:prod.id,projectState:prod.status,rollbackDeploymentId:j.rollbackDeploymentId,rollbackApplicationSha:j.rollbackApplicationSha,state,flag:initialFlag?{id:initialFlag.id,key:initialFlag.key,value:initialFlag.value,target:initialFlag.target,type:initialFlag.type}:null,functionSha256:hotfixHash(initialDefinition),migrationHistory:history});
   return {passed:true,rollbackDeploymentId:j.rollbackDeploymentId};
  }
  if(phase==='onboarding_review_migrate'){
   assert.deepEqual(await inventory(j.rollbackDeploymentId),j.preflightState,'Production unchanged since preflight');
   const sql=fs.readFileSync(path.join(root,HOTFIX_MIGRATION),'utf8');assert.equal(hotfixHash(sql),owner.migrations[0].sha256);
   const before=(await query(shaSQL))[0].definition;assert.equal(before,initialDefinition,'no concurrent schema change');
   if(!j.migrationAlreadyApplied){
    // Exact one migration plus its ordinary migration-history entry, atomically.
    const literal="'"+sql.replaceAll("'","''")+"'";
    await query(`begin;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('20261007034510','onboarding_review_conflict_transport',ARRAY[${literal}]);\ncommit;`,false);
   }
   const after=(await query(shaSQL))[0].definition;assert.equal(after,expectedDefinition,'only exact transport code changed');const history=await query("select version,name from supabase_migrations.schema_migrations where version='20261007034510'");assert.equal(history.length,1);
   save('migration.json',{passed:true,path:HOTFIX_MIGRATION,sha256:hotfixHash(sql),disposition:j.migrationAlreadyApplied?'ALREADY_APPLIED_NO_WRITE':'APPLIED_EXACTLY_ONCE',beforeSha256:hotfixHash(before),afterSha256:hotfixHash(after),history,databaseRollbackPerformed:false});return {passed:true,disposition:j.migrationAlreadyApplied?'ALREADY_APPLIED_NO_WRITE':'APPLIED_EXACTLY_ONCE'};
  }
  if(phase==='onboarding_launch_flag'){
   assert.deepEqual(await inventory(j.rollbackDeploymentId),j.preflightState,'no out-of-scope mutation before flag');
   assert.deepEqual((await vercel(`/v9/projects/${identity.projectId}/env`)).envs,initialEnv,'exact environment unchanged before flag');
   if(initialFlag?.value!=='true'){
    envChanged=true;
    if(initialFlag)await vercel(`/v9/projects/${identity.projectId}/env/${initialFlag.id}`,'PATCH',HOTFIX_ENV);
    else await vercel(`/v10/projects/${identity.projectId}/env`,'POST',HOTFIX_ENV);
   }
   const after=(await vercel(`/v9/projects/${identity.projectId}/env`)).envs;assertOnlyFlagChange(initialEnv,after);const flag=flagRows(after)[0];assert.equal(await value(flag),'true');j.flagId=flag.id;j.productionFlagReadback='true';
   const now=await inventory(j.rollbackDeploymentId);assert.deepEqual({...now,environment:j.preflightState.environment},j.preflightState,'flag leaves aliases/domains unchanged');stagingBefore=now;
   save('environment.json',{passed:true,key:HOTFIX_ENV.key,value:'true',target:['production'],type:'plain',mutated:envChanged,before:safeEnvironment(initialEnv),after:safeEnvironment(after)});return {passed:true,key:HOTFIX_ENV.key,value:'true',mutated:envChanged};
  }
  if(phase==='stage'){
   assert.deepEqual(await inventory(j.rollbackDeploymentId),stagingBefore,'no concurrent mutation before staging');
   const body={name:HOSTED_VERCEL_PROJECT_NAME,project:identity.projectId,gitSource:{type:'github',repoId:'1248656766',ref:owner.applicationSha,sha:owner.applicationSha},target:'production',autoAssignCustomDomains:false,
    meta:{rcapStagedProduction:'true',rcapApplicationSha:owner.applicationSha,rcapWorkerSourceSha:owner.workerSourceSha,rcapWorkerDigest:owner.workerDigest,rcapWorkerInputFingerprint:owner.workerInputFingerprint,rcapToolsSha:owner.toolsSha,rcapExecutorControlSha:owner.executorControlSha,rcapHotfixRunId:j.runId}};
   save('staging-request.json',body);const created=await vercel('/v13/deployments','POST',body);j.stagedDeploymentId=created.id??created.uid;assert.match(j.stagedDeploymentId??'',/^dpl_[A-Za-z0-9]+$/);persist(j);
   let deployment;for(let tries=0;tries<240;tries++){deployment=await vercel('/v13/deployments/'+j.stagedDeploymentId);if(deployment.readyState==='READY')break;assert(!['ERROR','CANCELED'].includes(deployment.readyState),'staged build failed');await sleep(5000);}
   const after=await inventory(j.rollbackDeploymentId);assertHotfixStaging(stagingBefore,after,deployment,owner);j.stagedHostname=deployment.url;save('staged-deployment.json',deployment);save('staging-before.json',stagingBefore);save('staging-after.json',after);return {passed:true,deploymentId:j.stagedDeploymentId,hostname:j.stagedHostname,productionAliasesUnchanged:true};
  }
  if(phase==='smoke'){
   assert.deepEqual(await inventory(j.rollbackDeploymentId),stagingBefore,'aliases/domains unchanged before smoke');
   await run(process.execPath,['scripts/rcap-production-canary-smoke.mjs'],childEnv(phase));const file=path.join(dir,'smoke/production-canary-smoke.json'),smoke=read(file);assert.equal(smoke.passed,true);assert.equal(smoke.stagedDeploymentId,j.stagedDeploymentId);assert.equal(smoke.transactionalFixtureRolledBack,true);assert.equal(smoke.productionDatabasePersistentlyMutated,false);j.smokeArtifactSha256=hotfixHash(fs.readFileSync(file));return {passed:true,smokeArtifactSha256:j.smokeArtifactSha256};
  }
  if(phase==='activate'){
   assert.deepEqual(await inventory(j.rollbackDeploymentId),stagingBefore,'exact no-alias movement until successful smoke');
   await run(process.execPath,['scripts/rcap-production-activate.mjs'],childEnv(phase));const receipt=read(path.join(dir,'activate/production-activation.json'));assert.equal(receipt.passed,true);assert.equal(receipt.promotionCompleted,true);const active=await vercel('/v13/deployments/legaleasepartner.com');assert.equal(active.id??active.uid,j.stagedDeploymentId);assert.equal(deploymentApplicationSha(active),owner.applicationSha);j.finalProductionApplicationSha=deploymentApplicationSha(active);return {passed:true,activationArtifactSha256:hotfixHash(JSON.stringify(receipt))};
  }
  throw Error('unauthorized Production phase');
 };
 try{return await executeHotfix(owner,{journal,perform,persist});}
 catch(error){
  // DB rollback/repair is deliberately absent. Restore only this one flag and
  // the native preflight rollback deployment under existing authorization.
  if(journal.rollbackDeploymentId&&(envChanged||journal.steps.some(s=>s.phase==='stage'))){journal.rollback.attempted=true;persist(journal);
   try{
    assertHotfixRollback(journal,{deploymentId:journal.rollbackDeploymentId,applicationSha:journal.rollbackApplicationSha,flag:journal.preReleaseFlag});
    const active=await vercel('/v13/deployments/'+encodeURIComponent(journal.productionProjectDomains.find(d=>d.redirect===null).name));
    if((active.id??active.uid)!==journal.rollbackDeploymentId)await vercel(`/v9/projects/${identity.projectId}/rollback/${journal.rollbackDeploymentId}`,'POST',{});
    if(envChanged){const rows=(await vercel(`/v9/projects/${identity.projectId}/env`)).envs,flag=flagRows(rows)[0];
     if(initialFlag){assert(flag,'captured flag missing during rollback');await vercel(`/v9/projects/${identity.projectId}/env/${flag.id}`,'PATCH',{...HOTFIX_ENV,value:initialFlag.value});}else if(flag)await vercel(`/v9/projects/${identity.projectId}/env/${flag.id}`,'DELETE');}
    const after=await inventory(journal.rollbackDeploymentId);assert.deepEqual(after.domains,journal.preflightState.domains);assert.deepEqual(after.aliases,journal.preflightState.aliases);assert(after.targets.every(t=>t.id===journal.rollbackDeploymentId));
    const rows=(await vercel(`/v9/projects/${identity.projectId}/env`)).envs;assert.deepEqual(safeEnvironment(rows.filter(e=>e.key!==HOTFIX_ENV.key)),safeEnvironment(initialEnv.filter(e=>e.key!==HOTFIX_ENV.key)));if(initialFlag)assert.equal(await value(flagRows(rows)[0]),initialFlag.value);else assert.equal(flagRows(rows).length,0);
    journal.rollback.status='restored';journal.rollback.databaseRollbackPerformed=false;
   }catch(rollbackError){journal.rollback.status='failed';journal.rollback.failure=rollbackError.message;}
  }journal.failure=error.message;persist(journal);throw error;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runHotfixProduction(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')).then(j=>console.log('Exact hotfix Production sequence PASS '+j.stagedDeploymentId)).catch(error=>{console.error(error.message);process.exitCode=1;});
}
