#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = [
  ".github/workflows/rcap-production-canary.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-production-canary.mjs"
];

const mutations = [
  ['Production domain scope', 'production=true&redirects=true', 'production=false&redirects=false'],
  ['custom environment exclusion', '!d.gitBranch&&!d.customEnvironmentId', '!d.gitBranch'],
  ['redirect source classification', "if(entry.redirect!=null&&entry.redirect!=='')", 'if(false)'],
  ['routing target binding', "redirect:entry.redirect,redirectStatusCode:entry.redirectStatusCode??null", "redirect:'ignored',redirectStatusCode:308"],
  ['routing state comparison', 'receipt.routingStateBeforeSha256===receipt.routingStateAfterSha256', 'true'],
  ['read attempt bound', "method==='GET'?3:1", "method==='GET'?4:2"],
  ['read retry classification', 'status===429||(status>=500&&status<=599)', 'status>=400'],
  ['read-only retry', "method==='GET'&&retryable&&attempt<maxAttempts", 'retryable&&attempt<maxAttempts'],
  ['safe diagnostics', 'receipt.transportFailure={operation,method,...(status===undefined?{}:{status}),attempts:attempt,retryable}', 'receipt.transportFailure={operation,url,options,status}'],
  ['restage owner phase', "requireProductionPhaseAuthorization(release,'restage')", 'removedPhase(release)'],
  ['restage decryption disabled', '/env?decrypt=false', '/env?decrypt=true'],
  ['restage uniqueness', 'replacements.length<=1', 'replacements.length<=2'],
  ['restage key timing', 'createdAt>t', 'createdAt<t'],
  ['restage rerun guard', "String(env.GITHUB_RUN_ATTEMPT)==='1'", 'true'],
  ['restage public-domain alias guard', '!publicBefore.domains.includes(alias)', 'true'],
  ['restage unchanged environment', 'restage_environment_metadata_unchanged', 'environment_check_removed'],

  ["separate phase authorization", "requireProductionMigrationRelease(ROOT_DIR, process.env);", "/* authorization removed */"],
  ["application SHA", "const APPLICATION_SHA = RELEASE_CANDIDATE.applicationSha;", "0c4d8275cca6310329ab0d2b8f2f5bcb3435eb1b"],
  ["worker digest", "const WORKER_DIGEST = RELEASE_CANDIDATE.workerDigest;", "sha256:07bb99a83e4c1b8e6d23d23103d0a1fe6d9bc49fc105a9c52a7a352a855c4832"],
  ["acceptance negative control", "hyflxnlhpmiqxvvcoiia", "wrongacceptanceproject"],
  ["canonical Production project", "wwtwtsmywnckfkdaqqeg", "wrongproductionproject"],
  ["accepted Preview deployment", "const ACCEPTANCE_DEPLOYMENT_ID = RELEASE_CANDIDATE.hostedAcceptance?.preview?.deploymentId;", "dpl_wrongacceptedpreview"],
  ["environment separation verdict", "production_environment_is_separate_from_acceptance", "environment_separation_removed"],
  ["staged Production identity verdict", "staged_production_deployment_is_exact", "staged_identity_removed"],
  ["accepted Preview identity verdict", "accepted_preview_deployment_is_exact", "accepted_preview_identity_removed"],
  ["bounded runtime inspector", "inspectRuntimeSupabaseOrigin", "inspectUntrustedConfigurationValue"],
  ["exactly one runtime origin", "candidateOrigins.size !== 1", "candidateOrigins.size < 1"],
  ["canonical Production runtime verdict", "production_runtime_project_is_canonical", "production_runtime_identity_removed"],
  ["exact acceptance runtime verdict", "acceptance_preview_project_is_exact", "acceptance_runtime_identity_removed"],
  // The staged candidate is created through the REST transport, so the guard
  // that no Production domain can move is autoAssignCustomDomains: false, not
  // the CLI's --skip-domain. The old needle matched nothing and silently
  // stopped guarding anything.
  ["staged deployment cannot assign domains", "autoAssignCustomDomains: false", "autoAssignCustomDomains: true"],
  ["withdrawn decrypt gate stays absent", 'valueReadbackRequirement: "superseded"', 'valueReadbackRequirement: "decrypt=true"'],
  ["environment remains unchanged", "environmentVariableChanged: false", "environmentVariableChanged: true"],
  ["Production aliases remain unchanged", "productionAliasChanged: false", "productionAliasChanged: true"],
  ["origin is never persisted", "originPersisted: false", "originPersisted: true"],
  ["rollback verdict", "rollback_target_recorded_before_mutation", "rollback_not_recorded"],
  ["GET-only transport", 'method: "GET"', 'method: "POST"']
];

for (const [name, from, to] of mutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-production-mutation-"));
  try {
    for (const file of files) {
      const destination = path.join(root, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(file, destination);
    }
    let mutated = false;
    for (const file of files) {
      const target = path.join(root, file);
      const source = fs.readFileSync(target, "utf8");
      if (source.includes(from)) {
        fs.writeFileSync(target, source.replaceAll(from, to));
        mutated = true;
      }
    }
    assert.equal(mutated, true, `${name}: mutation target was absent`);
    const result = spawnSync(process.execPath, ["scripts/verify-rcap-production-canary.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, RCAP_PRODUCTION_VERIFY_ROOT: root },
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, `${name}: verifier accepted the mutation`);
    console.log(`ok   ${name} mutation is rejected`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log(`test-rcap-production-canary-mutations passed: ${mutations.length}/${mutations.length}`);

// Execute the real restage entrypoint with an offline transport. No Vercel,
// Supabase, worker or Preview service is contacted by this regression battery.
const {runProductionRestage,productionRestageKeyTimes,restageDeploymentRequest,validateRestageDeploymentRequest}=await import('./rcap-production-canary.mjs');
const {HOSTED_VERCEL_PROJECT_ID:projectId,HOSTED_VERCEL_TEAM_ID:teamId,HOSTED_VERCEL_PROJECT_NAME:projectName}=await import('./rcap-hosted-acceptance-vercel-identity.mjs');
const {RESTAGE_AUTHORITY}=await import('./grade-a-launch-control/production-preflight-authorization.mjs');
const release=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const publicDomains=['legalease.com','expungement.ai','www.expungement.ai'];
const redirectDomain={name:'www.legalease.com',redirect:'synthetic-redirect.example.test',redirectStatusCode:308};
const tools='a'.repeat(40),now=Date.now();let runtimeCases=0;
const keyEntries=()=>['LEGAL_AID_RESTRICTED_FIELD_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'].map(key=>({id:key,key,target:['production'],type:key.endsWith('_VERSION')?'plain':'sensitive',createdAt:now-30000,updatedAt:now-20000,value:'do-not-read-or-record'}));
function deployment(id,restage=false){return {id,projectId,target:'production',readyState:'READY',url:'synthetic-restage.vercel.app',alias:[],createdAt:restage?now-1000:now-100000,gitSource:{sha:release.applicationSha},meta:{rcapStagedProduction:'true',rcapApplicationSha:release.applicationSha,rcapWorkerSourceSha:release.workerSourceSha,rcapWorkerDigest:release.workerDigest,rcapToolsSha:tools,...(restage?{rcapProductionRestage:RESTAGE_AUTHORITY.marker}:{})}};}
async function exercise(change=()=>{}) {
 const f={candidate:structuredClone(release),domains:[...publicDomains.map(name=>({name})),{...redirectDomain}],keys:keyEntries(),old:deployment(RESTAGE_AUTHORITY.oldStagedDeploymentId),replacement:deployment('dpl_Replacement',true),existing:[],rollback:RESTAGE_AUTHORITY.rollbackDeploymentId,attempt:'1',readFaults:[],delays:[],requests:[],envReads:0,mappingReads:0};change(f);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'restage-offline-'));let posts=0;
 try {
 const result=await runProductionRestage({rootDir:process.cwd(),env:{RCAP_PRODUCTION_PHASE:'restage',RCAP_TOOLS_SHA:tools,GITHUB_RUN_ATTEMPT:f.attempt,VERCEL_TOKEN:'synthetic-token',SUPABASE_ACCESS_TOKEN:'synthetic-management',VERCEL_AUTOMATION_BYPASS_SECRET:'synthetic-bypass',RCAP_PRODUCTION_EVIDENCE_DIR:temporary},
  requireRelease:()=>f.candidate,resolveIdentity:f.realReaders?undefined:async()=>({projectId,teamId}),pause:async ms=>{f.delays.push(ms);},
  inspectRuntime:f.realReaders?undefined:async()=>({origin:'https://wwtwtsmywnckfkdaqqeg.supabase.co'}),originMatches:f.realReaders?undefined:async()=>!f.wrongRuntime,
  fetchImpl:async(url,options)=>{
   const u=new URL(url);f.requests.push({host:u.host,path:u.pathname,method:options.method});
   assert.ok(['api.vercel.com','api.supabase.com','synthetic-restage.vercel.app'].includes(u.host),'unexpected external endpoint');
   let body;
   if(options.method==='GET'&&u.pathname===(f.faultPath??'/v13/deployments/'+RESTAGE_AUTHORITY.oldStagedDeploymentId)&&f.readFaults.length){
    const fault=f.readFaults.shift();if(fault==='timeout')throw Error('synthetic-token secret-response-body timeout');
    if(fault!==200)return {ok:false,status:fault,text:async()=>{throw Error('response body must not be read');}};
   }
   if(options.method==='POST'){
    assert.equal(u.pathname,'/v13/deployments');assert.equal(u.host,'api.vercel.com');posts++;
    assert.equal(posts,1,'only one create');const payload=JSON.parse(options.body);validateRestageDeploymentRequest(payload,projectId,tools);assert.equal(payload.gitSource.sha,release.applicationSha);assert.equal(payload.autoAssignCustomDomains,false);
    if(f.timeout)throw Error('synthetic-token secret-response-body timeout');if(f.postStatus)return {ok:false,status:f.postStatus,text:async()=>{throw Error('response body must not be read');}};body=f.replacement;
   }else{
    assert.equal(options.method,'GET');
    if(u.host==='synthetic-restage.vercel.app')return {ok:true,status:200,url:String(url),text:async()=>'<html>https://wwtwtsmywnckfkdaqqeg.supabase.co</html>'};
    else if(u.host==='api.supabase.com'){assert.equal(u.pathname,'/v1/projects/wwtwtsmywnckfkdaqqeg');body={ref:f.wrongProject?'wrong':'wwtwtsmywnckfkdaqqeg'};}
    else if((u.pathname==='/v9/projects/'+projectId||u.pathname==='/v9/projects/'+projectName))body={id:projectId,name:projectName,accountId:teamId};
    else if(u.pathname.endsWith('/domains')){assert.equal(u.searchParams.get('production'),'true');assert.equal(u.searchParams.get('redirects'),'true');f.mappingReads++;const domains=structuredClone(f.domains);if(f.changeRouting&&f.mappingReads>=(f.routingChangeAt??3))f.changeRouting(domains);if(f.reverseInventory&&f.mappingReads>1)domains.reverse();body={domains,...(f.incompleteDomains?{pagination:{next:123}}:{})};}
    else if(u.pathname.endsWith('/env')){assert.equal(u.searchParams.get('decrypt'),'false');f.envReads++;body={envs:f.keys.map(k=>({...k,...(f.envChangeAt&&f.envReads>=f.envChangeAt?{updatedAt:now-500}: {})}))};}
    else if(u.pathname==='/v6/deployments'){assert.equal(u.searchParams.has('state'),false);body={deployments:[f.old,...f.existing]};}
    else if(u.pathname.endsWith('/www.legalease.com')&&!f.redirectBecomesDirect)return {ok:false,status:404,text:async()=>{throw Error('redirect source lookup must not read response');}};
    else if([...publicDomains,...(f.redirectBecomesDirect?['www.legalease.com']:[])].some(domain=>u.pathname.endsWith('/'+domain))){const changed=f.changedDomain&&u.pathname.endsWith('/'+f.changedDomain)&&f.mappingReads>=f.domainChangeAt;body=deployment(changed?f.replacement.id:f.mappingChangeAt&&f.mappingReads>=f.mappingChangeAt?'dpl_Wrong':f.rollback);}
    else if(u.pathname.endsWith('/'+RESTAGE_AUTHORITY.oldStagedDeploymentId))body=f.old;
    else if(u.pathname.endsWith('/'+f.replacement.id))body={...f.replacement,id:f.detailId??f.replacement.id};
    else throw Error('unexpected API request');
   }
   return {ok:true,status:200,text:async()=>JSON.stringify(body)};
  }});
 assert.ok(!JSON.stringify(result).includes('do-not-read-or-record'));assert.ok(!JSON.stringify(result).includes('synthetic-token'));assert.ok(!JSON.stringify(result).includes('secret-response-body'));assert.ok(!JSON.stringify(result).includes('supabase.co'));
 for(const flag of ['productionDatabaseMutated','workerChanged','migrationReplayed','keysCreated','keyValuesRecorded'])assert.equal(result[flag],false);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temporary,'production-restage.json'))),result);
 return {result,posts,requests:f.requests,delays:f.delays};
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
async function runtime(name,fn){await fn();runtimeCases++;console.log('ok   restage runtime: '+name);}
await runtime('zero replacement creates exactly once, after safe key inventory',async()=>{const {result,posts}=await exercise();assert.equal(result.passed,true,result.failure);assert.equal(posts,1);assert.equal(result.deploymentCreated,true);assert.equal(result.reusedExactReplacement,false);assert.equal(result.replacementCreatedAfterKeys,true);assert.equal(result.publicAliasesChanged,false);assert.equal(result.environmentMetadataChanged,false);});
await runtime('one READY exact replacement reuses with zero POST, including a rerun',async()=>{const {result,posts}=await exercise(f=>{f.existing=[f.replacement];f.attempt='2';});assert.equal(result.passed,true,result.failure);assert.equal(posts,0);assert.equal(result.reusedExactReplacement,true);assert.equal(result.deploymentCreated,false);});
await runtime('live-shaped www.legalease.com redirect skips source lookup and preserves canonical routing hash',async()=>{
 const {result,posts,requests}=await exercise();assert.equal(result.passed,true,result.failure);assert.equal(posts,1);
 assert.equal(requests.some(r=>r.path==='/v13/deployments/www.legalease.com'),false);
 const expected=[...publicDomains.map(name=>({name,kind:'deployment',deploymentId:RESTAGE_AUTHORITY.rollbackDeploymentId})),{...redirectDomain,kind:'redirect'}].sort((a,b)=>a.name<b.name?-1:1);
 assert.deepEqual(result.routingStateBefore,expected);assert.deepEqual(result.routingStateAfter,expected);
 const {createHash}=await import('node:crypto');assert.equal(result.routingStateBeforeSha256,createHash('sha256').update(JSON.stringify(result.routingStateBefore)).digest('hex'));assert.equal(result.routingStateBeforeSha256,result.routingStateAfterSha256);
});
await runtime('inventory order does not change routing hash',async()=>{const {result}=await exercise(f=>f.reverseInventory=true);assert.equal(result.passed,true);assert.equal(result.routingStateBeforeSha256,result.routingStateAfterSha256);});
await runtime('branch and custom environment entries excluded from Production routing',async()=>{
 const {result,requests}=await exercise(f=>{f.domains.push({name:'branch.example.test',gitBranch:'feature'},{name:'custom.example.test',customEnvironmentId:'env_test'});});
 assert.equal(result.passed,true);assert.equal(result.routingStateBefore.length,4);assert.equal(requests.some(r=>/branch\.example|custom\.example/.test(r.path)),false);
});
for(const [name,change]of [
 ['redirect target',d=>d.find(x=>x.redirect).redirect='changed.example.test'],
 ['redirect status',d=>d.find(x=>x.redirect).redirectStatusCode=307],
 ['redirect to direct',d=>{const e=d.find(x=>x.redirect);e.redirect=null;e.redirectStatusCode=null;}],
 ['direct to redirect',d=>{d[0].redirect='synthetic-redirect.example.test';d[0].redirectStatusCode=308;}],
 ['removed routing entry',d=>d.pop()],
 ['added redirect',d=>d.push({name:'new.example.test',redirect:'synthetic-redirect.example.test',redirectStatusCode:308})]
])await runtime(name+' after create refuses via routing-state hash',async()=>{
 const {result,posts}=await exercise(f=>{f.changeRouting=change;f.redirectBecomesDirect=true;});
 assert.equal(posts,1);assert.equal(result.passed,false);assert.equal(result.failure,'restage_public_aliases_unchanged');assert.equal(result.publicAliasesChanged,true);assert.notEqual(result.routingStateBeforeSha256,result.routingStateAfterSha256);
});
await runtime('redirect change immediately before create refuses with zero POST',async()=>{const {result,posts}=await exercise(f=>{f.routingChangeAt=2;f.changeRouting=d=>d.find(x=>x.redirect).redirectStatusCode=307;});assert.equal(posts,0);assert.equal(result.failure,'restage_precreate_mapping_unchanged');});
await runtime('direct Production domain 404 refuses once before any create',async()=>{
 const {result,posts,requests}=await exercise(f=>{f.faultPath='/v13/deployments/legalease.com';f.readFaults=[404];});
 assert.equal(posts,0);assert.equal(result.deploymentCreateAttempted,false);assert.equal(result.failure,'restage_read_transport_refused');assert.deepEqual(result.transportFailure,{operation:'public_domain:legalease.com',method:'GET',status:404,attempts:1,retryable:false});assert.equal(requests.filter(r=>r.path==='/v13/deployments/legalease.com').length,1);
});
await runtime('incomplete project domain inventory refuses before lookup or POST',async()=>{const {result,posts}=await exercise(f=>f.incompleteDomains=true);assert.equal(posts,0);assert.equal(result.failure,'restage_domains_complete');});
await runtime('real identity and runtime readers use injected read transport',async()=>{
 const {result,posts}=await exercise(f=>{f.realReaders=true;f.existing=[f.replacement];});assert.equal(result.passed,true,result.failure);assert.equal(posts,0);
});
for(const [operation,faultPath]of [
 ['project_identity','/v9/projects/'+projectName],['production_project','/v1/projects/wwtwtsmywnckfkdaqqeg'],
 ['public_domains','/v9/projects/'+projectId+'/domains'],['public_domain:expungement.ai','/v13/deployments/expungement.ai'],
 ['environment_metadata','/v9/projects/'+projectId+'/env'],['replacement_inventory','/v6/deployments'],
 ['replacement_detail','/v13/deployments/dpl_Replacement'],['replacement_runtime','/']
])await runtime(operation+' read failure is labeled without secrets',async()=>{
 const {result,posts}=await exercise(f=>{f.realReaders=true;f.existing=[f.replacement];f.faultPath=faultPath;f.readFaults=[404];});
 assert.equal(posts,0);assert.equal(result.failure,'restage_read_transport_refused');assert.deepEqual(result.transportFailure,{operation,method:'GET',status:404,attempts:1,retryable:false});
});
for(const fault of [429,503,'timeout'])await runtime('old staged GET '+fault+' then 200 recovers',async()=>{
 const {result,posts,requests,delays}=await exercise(f=>{f.readFaults=[fault,200];f.existing=[f.replacement];});
 assert.equal(result.passed,true,result.failure);assert.equal(posts,0);assert.equal(requests.filter(r=>r.path.endsWith('/'+RESTAGE_AUTHORITY.oldStagedDeploymentId)).length,2);assert.deepEqual(delays,[1000]);assert.equal(result.transportFailure,undefined);
});
await runtime('old staged transient GET recovery continues to exactly one create',async()=>{
 const {result,posts,requests}=await exercise(f=>{f.readFaults=[503,200];});assert.equal(result.passed,true);assert.equal(posts,1);assert.equal(requests.filter(r=>r.path.endsWith('/'+RESTAGE_AUTHORITY.oldStagedDeploymentId)).length,2);
});
for(const status of [400,401,403,404,429,500,503,599])await runtime('old staged GET '+status+' bounded refusal records only safe metadata',async()=>{
 const retryable=status===429||status>=500,attempts=retryable?3:1;
 const {result,posts,requests,delays}=await exercise(f=>{f.readFaults=[status,status,status,200];});
 assert.equal(result.passed,false);assert.equal(posts,0);assert.equal(result.deploymentCreateAttempted,false);assert.equal(result.deploymentCreated,false);assert.equal(result.replacementStagedDeploymentId,null);
 assert.equal(result.failure,'restage_read_transport_refused');assert.deepEqual(result.transportFailure,{operation:'old_staged_deployment',method:'GET',status,attempts,retryable});
 assert.equal(requests.filter(r=>r.path.endsWith('/'+RESTAGE_AUTHORITY.oldStagedDeploymentId)).length,attempts);assert.deepEqual(delays,retryable?[1000,2000]:[]);
 assert.equal(requests.some(r=>r.path.endsWith('/env')||r.path==='/v6/deployments'),false);
 assert.equal(result.verdicts.some(v=>v.caseId==='restage_old_staged_exact'),false);
});
await runtime('repeated GET timeout refuses after three attempts without error text',async()=>{
 const {result,posts,delays}=await exercise(f=>{f.readFaults=['timeout','timeout','timeout'];});assert.equal(posts,0);assert.deepEqual(delays,[1000,2000]);assert.deepEqual(result.transportFailure,{operation:'old_staged_deployment',method:'GET',attempts:3,retryable:true});
});
for(const fault of ['timeout',500,429])await runtime('deployment POST '+fault+' never retries',async()=>{
 const {result,posts,delays}=await exercise(f=>{if(fault==='timeout')f.timeout=true;else f.postStatus=fault;});
 assert.equal(posts,1);assert.deepEqual(delays,[]);assert.equal(result.deploymentCreated,null);assert.equal(result.deploymentCreateAttempted,true);assert.equal(result.failure,'restage_write_transport_refused');
 assert.deepEqual(result.transportFailure,{operation:'deployment_create',method:'POST',...(fault==='timeout'?{}:{status:fault}),attempts:1,retryable:true});
});
for(const reuse of [false,true])await runtime('automatic Vercel aliases accepted with rollback mapping: '+(reuse?'reuse':'create'),async()=>{
 const {result,posts,requests}=await exercise(f=>{f.replacement.alias=['legalease-partner-dashboard-clean-roger947s-projects.vercel.app','legalease-partner-dashboard-clean-git-abcdef-roger947s-projects.vercel.app'];if(reuse)f.existing=[f.replacement];});
 assert.equal(result.passed,true,result.failure);assert.equal(posts,reuse?0:1);assert.equal(result.publicAliasesChanged,false);
 for(const domain of publicDomains)assert.equal(requests.filter(r=>r.path==='/v13/deployments/'+domain).length,reuse?2:3,'every configured domain read before and after');
});
for(const domain of publicDomains)for(const stage of ['before','after'])await runtime(domain+' mapped to replacement '+stage+' refuses',async()=>{
 const {result,posts}=await exercise(f=>{f.changedDomain=domain;f.domainChangeAt=stage==='before'?1:3;});
 assert.equal(result.passed,false);assert.equal(posts,stage==='before'?0:1);assert.equal(result.failure,'restage_public_mapping_is_rollback');if(stage==='after')assert.equal(result.publicAliasesChanged,true);
});
for(const [name,change]of [
 ['wrong rollback',f=>f.rollback='dpl_Wrong'],['wrong old staged ID',f=>f.old.id='dpl_Wrong'],['old staged not READY',f=>f.old.readyState='BUILDING'],
 ...['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'].map(k=>['wrong release '+k,f=>f.candidate[k]='wrong']),
 ['missing phase permission',f=>f.candidate.productionAuthorization.phases=f.candidate.productionAuthorization.phases.filter(p=>p!=='restage')],
 ['missing owner record',f=>delete f.candidate.productionAuthorization.restage],['canonical project mismatch',f=>f.wrongProject=true],
 ['missing key',f=>f.keys.pop()],['duplicate key',f=>f.keys.push({...f.keys[0]})],['nonsensitive key',f=>f.keys[0].type='plain'],['nonsensitive pseudonym',f=>f.keys[2].type='plain'],
 ['key only in Preview',f=>f.keys[0].target=['preview']],['missing key timestamp',f=>delete f.keys[0].createdAt],
 ['replacement before keys',f=>{f.replacement.createdAt=now-60000;f.existing=[f.replacement];}],
 ['wrong exact-ID readback',f=>{f.existing=[f.replacement];f.detailId='dpl_Other';}],
 ['replacement future timestamp',f=>{f.replacement.createdAt=now+86400000;f.existing=[f.replacement];}],
 ['multiple replacements',f=>f.existing=[f.replacement,{...f.replacement,id:'dpl_Other'}]],
 ['inflight replacement',f=>{f.replacement.readyState='BUILDING';f.existing=[f.replacement];}],
 ['failed replacement',f=>{f.replacement.readyState='ERROR';f.existing=[f.replacement];}],
 ['invisible replacement on rerun',f=>f.attempt='2'],
 ['replacement wrong app',f=>{f.replacement.gitSource.sha='wrong';f.existing=[f.replacement];}],
 ['replacement wrong worker',f=>{f.replacement.meta.rcapWorkerDigest='wrong';f.existing=[f.replacement];}],
 ['replacement wrong project',f=>{f.replacement.projectId='wrong';f.existing=[f.replacement];}],
 ['replacement has public alias',f=>{f.replacement.alias=['legalease.com'];f.existing=[f.replacement];}],
 ['replacement has configured apex alias',f=>{f.replacement.alias=['expungement.ai'];f.existing=[f.replacement];}],
 ['replacement domain autoassignment',f=>{f.replacement.autoAssignCustomDomains=true;f.existing=[f.replacement];}],
 ['environment changes before POST',f=>f.envChangeAt=2],['mapping changes before POST',f=>f.mappingChangeAt=2]
])await runtime(name+' refuses without POST',async()=>{const {result,posts}=await exercise(change);assert.equal(result.passed,false,name);assert.equal(posts,0,name);});
for(const [name,change,flag]of [
 ['environment changes after create',f=>f.envChangeAt=3,'environmentMetadataChanged'],
 ['public mapping changes after create',f=>f.mappingChangeAt=3,'publicAliasesChanged'],
 ['wrong runtime',f=>f.wrongRuntime=true,null],['creation timeout never retries',f=>f.timeout=true,null]
])await runtime(name,async()=>{const {result,posts}=await exercise(change);assert.equal(result.passed,false);assert.equal(posts,1);if(flag)assert.equal(result[flag],true);});
await runtime('key metadata never reads value property',()=>{const entries=keyEntries();for(const e of entries)Object.defineProperty(e,'value',{get(){throw Error('secret value read');}});assert.equal(productionRestageKeyTimes(entries).length,3);});
await runtime('request with autoAssignCustomDomains true refuses',()=>{const request=restageDeploymentRequest(projectId,tools);request.autoAssignCustomDomains=true;assert.throws(()=>validateRestageDeploymentRequest(request,projectId,tools));});
console.log(`Production restage runtime passed: ${runtimeCases}/${runtimeCases}`);
