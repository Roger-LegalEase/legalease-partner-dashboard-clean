import {CLINIC_FRESH_ATTEMPT,qualifyClinicFreshInventory} from './rcap-clinic-fresh-attempt.mjs';
import {readClinicLiveScreeningProgress,assertClinicProgressEvidence} from './rcap-clinic-live-screening-progress.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {resolveHostedVercelIdentity,hostedVercelScopedUrl} from './rcap-hosted-acceptance-vercel-identity.mjs';
import {previewRequestHeaders,readResumeCaptchaPolicy} from './rcap-clinic-resume-network-policy.mjs';
import {inspectShippedCaptcha} from './rcap-clinic-resume-captcha.mjs';
import {CLINIC_CLAIM_SQL,qualifyClinicClaimPrerequisites} from './lib/rcap-clinic-claim-prerequisites.mjs';
import {CLINIC_PREREQUISITE_SQL,qualifyClinicDatabasePrerequisites} from './lib/rcap-clinic-database-prerequisites.mjs';
const worker='16908485a94f475448657cea90583a4d352da9a3';
const digest='sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af';
const prerequisiteSqlHash='669061842c6fbc70b9c6fbf8e6162530703dbd57fb285e71dbcf42f47a3aa2a8';
const claimSqlHash='c0e6fd0ffcbf785e9166536df3ce95adca73eea783501cd4690ff1c3a56b8395';
const probeSignatures=['public.rcap_partner_activation_for_launch(text)','public.rcap_program_screening_jurisdictions(text)',
  'public.rcap_program_packet_scope_authorized(text,text)','public.clinic_entry_sponsor_capacity(uuid,text)','public.rcap_program_screening_capacity(text)'];
const identityProjection="current_user::text as current_user, session_user::text as session_user, current_setting('transaction_read_only') as transaction_read_only";
export function clinicInspectionSql(querySql) {
  assert.equal(createHash('sha256').update(querySql).digest('hex'),prerequisiteSqlHash,'reviewed inspection SQL required');
  // Keep the reviewed inspection intact; denied callers return all five permissions without invoking probes.
  const body=querySql.slice('begin transaction read only;\n'.length,-'\ncommit;\n'.length);
  assert.ok(body.endsWith(';'));
  assert.equal(createHash('sha256').update(CLINIC_CLAIM_SQL).digest('hex'),claimSqlHash);
  const claimBody=CLINIC_CLAIM_SQL.slice('begin transaction read only;\n'.length,-'\ncommit;\n'.length);
  assert.ok(claimBody.endsWith(';'));
  return `begin transaction read only;
with execution_context as materialized (
 select jsonb_object_agg(signature,permitted) as probe_execute, bool_and(permitted) as probes_allowed
 from (select signature,case when to_regprocedure(signature) is not null then has_function_privilege(current_user,to_regprocedure(signature),'EXECUTE') else false end as permitted
 from (values ${probeSignatures.map(s=>`('${s}')`).join(',')}) as probes(signature)) as permissions
)
select ${identityProjection}, probe_execute,
 (select rolbypassrls from pg_roles where rolname='service_role') as service_role_bypassrls,
 has_schema_privilege('service_role','public','USAGE') as service_role_public_usage,
 case when current_user='postgres' and current_setting('transaction_read_only')='on' and probes_allowed
 then (${body.slice(0,-1)}) else null end as clinic_known_compatibility_prerequisites,
 (${claimBody.slice(0,-1)}) as clinic_supplemental_contract
from execution_context;
commit;
`;
}
function safeExecutionContext(row) {
  const role=value=>['postgres','supabase_admin','supabase_read_only_user','service_role','authenticated','anon','authenticator'].includes(value)?value:'unrecognized';
  return {current_user:role(row?.current_user),session_user:role(row?.session_user),
    transaction_read_only:['on','off'].includes(row?.transaction_read_only)?row.transaction_read_only:'unknown'};
}
function sqlState(body) {
  if(!body||Array.isArray(body)||typeof body!=='object')return null;
  for(const value of [body.code,body.sqlstate])if(typeof value==='string'&&/^[0-9A-Z]{5}$/.test(value))return value;
  return typeof body.message==='string'?body.message.match(/\b(?:ERROR:|SQLSTATE[:=]?)\s*([0-9A-Z]{5})\b/)?.[1]??null:null;
}
export async function readClinicDatabasePrerequisites({env=process.env,fetchImpl=fetch,querySql,qualifyDatabase}) {
  const checks=[],requests=[];let observations=[],stage='configuration',operation='compatibility_inspection',httpStatus=null,state=null,executionContext=null;
  let inspectionSqlSha256=null;
  const evidence=()=>({checks,requests,executionContext,observations,prerequisiteSqlSha256:prerequisiteSqlHash,claimSqlSha256:claimSqlHash,inspectionSqlSha256,stateChangingStepReached:false});
  const add=(id,ok,expected,observed)=>checks.push({id,ok:ok===true,...(ok?{}:{expected,observed})});
  const query=async sql=>{
    stage='http_request';httpStatus=null;state=null;
    // The general Management endpoint uses existing inspector authority; SQL itself enforces READ ONLY.
    const response=await fetchImpl(`https://api.supabase.com/v1/projects/${CLINIC_SETUP.project}/database/query`,{
      method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},
      body:JSON.stringify({query:sql}),redirect:'error',signal:AbortSignal.timeout(30000)});
    httpStatus=response.status;requests.push({operation,httpStatus,sqlstate:null});stage='response_json';const rows=await response.json();state=sqlState(rows);
    requests.at(-1).sqlstate=state;stage='http_status';assert.ok([200,201].includes(httpStatus));
    stage='response_shape';assert.ok(Array.isArray(rows)&&rows.length===1&&rows[0]&&typeof rows[0]==='object'&&!Array.isArray(rows[0]));
    return rows[0];
  };
  try {
    assert.ok(env.SUPABASE_ACCESS_TOKEN?.trim());stage='sql_binding';const inspectionSql=clinicInspectionSql(querySql);
    inspectionSqlSha256=createHash('sha256').update(inspectionSql).digest('hex');
    const context=await query(inspectionSql);executionContext=safeExecutionContext(context);stage='execution_identity';
    add('database_execution_role',context.current_user==='postgres','postgres',executionContext.current_user);
    add('database_session_identity',['postgres','supabase_admin'].includes(context.session_user),'known inspector session',executionContext.session_user);
    add('database_transaction_read_only',context.transaction_read_only==='on','on',executionContext.transaction_read_only);
    for(const signature of probeSignatures)add(`database_execute:${signature}`,context.probe_execute?.[signature]===true,true,context.probe_execute?.[signature]===true);
    const inspectionDenied=checks.some(c=>!c.ok);
    add('application_service_rls_context',context.service_role_bypassrls===true,true,context.service_role_bypassrls===true);
    add('application_service_schema_usage',context.service_role_public_usage===true,true,context.service_role_public_usage===true);
    const supplement=qualifyClinicClaimPrerequisites(context.clinic_supplemental_contract);checks.push(...supplement.checks);observations=supplement.observations;
    if(inspectionDenied)return evidence();
    const row=context;stage='database_contract';
    assert.ok(row.clinic_known_compatibility_prerequisites&&typeof row.clinic_known_compatibility_prerequisites==='object'&&!Array.isArray(row.clinic_known_compatibility_prerequisites));
    const result=qualifyDatabase({catalog:row.clinic_known_compatibility_prerequisites,projectRef:CLINIC_SETUP.project,appSha:CLINIC_SETUP.app});
    assert.ok(Array.isArray(result.checks)&&result.checks.length>0);checks.push(...result.checks);
    add('reconciled_clinic_history',qualifyClinicFreshInventory(result.operational),'exact reconciled four-code history, open prior redemption and remaining event capacity','fresh_attempt_state_unqualified');
    add('database_complete_compatibility',result.status==='READY'&&result.blockers?.length===0,'READY without blockers',result.status==='READY'?'READY':'BLOCKED');
    return evidence();
  } catch {
    const conditions={configuration:['existing SUPABASE_ACCESS_TOKEN','unavailable'],sql_binding:['reviewed SQL SHA-256','mismatch'],
      http_request:['HTTP response','transport_failed'],response_json:['JSON body','invalid_json'],http_status:['HTTP 200 or 201',httpStatus],
      response_shape:['exactly one object row','invalid_row_shape'],database_contract:['compatible prerequisite catalog','invalid_contract']};
    const [expected,observed]=conditions[stage]??['verified execution identity','unproven'];
    checks.push({id:'database_complete_compatibility',ok:false,reason:'database_inspection_failed',stage,operation,httpStatus,sqlstate:state,expected,observed});
    return evidence();
  }
}
const diagnosticFailures=new WeakMap();
async function diagnose(context,operation) {
  const state={httpStatus:null,observed:'unverified',...context};
  try {return await operation(state);}catch(error){
    if(diagnosticFailures.has(error))throw error;
    const failure=new Error('Clinic prerequisite verification failed');
    diagnosticFailures.set(failure,{...state});throw failure;
  }
}
const condition=(state,operation,ok,expected,observed='mismatch')=>{
  Object.assign(state,{stage:'preview_identity',operation,expected,observed,reason:'deployment_mismatch'});
  assert.ok(ok);
};
function observedFetch(state,fetchImpl) {
  return async(...args)=>{
    Object.assign(state,{stage:'http_request',httpStatus:null,expected:'HTTP response',observed:'transport_failed',reason:'transport_failed'});
    const response=await fetchImpl(...args);
    Object.assign(state,{stage:'http_status',httpStatus:response.status,expected:'successful HTTP response',observed:response.status,
      reason:[401,403].includes(response.status)?'provider_access_denied':'unexpected_http_status'});
    return response;
  };
}
async function readJson(url,token,fetchImpl,operation) {
  return diagnose({operation},async state=>{
    const response=await observedFetch(state,fetchImpl)(url,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(15000)});
    state.expected='HTTP 200';assert.equal(response.status,200);
    Object.assign(state,{stage:'response_json',expected:'JSON response',observed:'unreadable_json',reason:'unreadable_provider_response'});
    return response.json();
  });
}
async function readPreview(env,fetchImpl) {
  return diagnose({stage:'configuration',operation:'VERCEL_TOKEN',expected:'existing credential available',observed:'missing',reason:'missing_credential'},async state=>{
    assert.ok(env.VERCEL_TOKEN?.trim());
    const identity=await diagnose({operation:'vercel_project_lookup'},async projectState=>{
      try {return await resolveHostedVercelIdentity({token:env.VERCEL_TOKEN,fetchImpl:async(...args)=>{
        const response=await observedFetch(projectState,fetchImpl)(...args);
        if(response.ok)Object.assign(projectState,{stage:'response_json',expected:'readable project JSON',observed:'unreadable_json',reason:'unreadable_provider_response'});
        return response;
      }});}catch(error){
        const fields={PINNED_PROJECT_NAME_MISMATCH:'project_name',PINNED_PROJECT_ID_MISMATCH:'project_id',PINNED_PROJECT_TEAM_MISMATCH:'project_team'};
        if(fields[error?.code])Object.assign(projectState,{stage:'project_identity',operation:fields[error.code],expected:'pinned project identity',observed:'mismatch',reason:'deployment_mismatch'});
        throw error;
      }
    });
    const api=(pathname,operation)=>readJson(hostedVercelScopedUrl(pathname,identity),env.VERCEL_TOKEN,fetchImpl,operation);
    const reads=await Promise.allSettled([
      api(`/v13/deployments/${CLINIC_SETUP.deploymentId}`,'deployment_lookup'),api(`/v13/deployments/${new URL(CLINIC_SETUP.origin).host}`,'preview_alias_lookup'),
      api(`/v2/deployments/${CLINIC_SETUP.deploymentId}/aliases`,'deployment_aliases_lookup')
    ]);
    const rejected=reads.filter(read=>read.status==='rejected');
    if(rejected.length) {
      const error=rejected[0].reason,failures=rejected.map(read=>diagnosticFailures.get(read.reason));
      diagnosticFailures.set(error,{...failures[0],failures});throw error;
    }
    const [deployment,alias,aliases]=reads.map(read=>read.value);
    state.httpStatus=200;
    condition(state,'deployment_id',(deployment?.id??deployment?.uid)===CLINIC_SETUP.deploymentId,CLINIC_SETUP.deploymentId);
    condition(state,'preview_alias_binding',(alias?.id??alias?.uid)===CLINIC_SETUP.deploymentId,CLINIC_SETUP.deploymentId);
    condition(state,'deployment_readiness',(deployment.readyState??deployment.status)==='READY','READY');
    condition(state,'deployment_target',[null,'preview'].includes(deployment.target),'Preview target');
    condition(state,'deployment_project',deployment.projectId===identity.projectId,identity.projectId);
    condition(state,'application_source',deployment.gitSource?.sha===CLINIC_SETUP.app,CLINIC_SETUP.app);
    for(const [key,value] of Object.entries({rcapApplicationSha:CLINIC_SETUP.app,rcapAcceptanceProjectRef:CLINIC_SETUP.project,
      rcapWorkerSourceSha:worker,rcapWorkerDigest:digest,rcapRouteState:'disabled',rcapClinicDemoMode:'none',rcapStripeConfigured:'false',
      rcapStagingScopeSha256:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}))condition(state,`deployment_metadata:${key}`,deployment.meta?.[key]===value,value);
    condition(state,'deployment_aliases_shape',Array.isArray(aliases?.aliases),'alias list');
    condition(state,'production_alias_exclusion',!aliases.aliases.some(a=>a.target==='production'||a.deployment?.target==='production'),'no Production aliases');
    return {previewVerified:true,deploymentId:CLINIC_SETUP.deploymentId,hostname:new URL(CLINIC_SETUP.origin).hostname,
      applicationSha:CLINIC_SETUP.app,workerSourceSha:worker,workerDigest:digest,acceptanceProjectRef:CLINIC_SETUP.project,
      routeState:'disabled',clinicDemoMode:'none',stagingScopeSha256:deployment.meta.rcapStagingScopeSha256,stripeConfigured:false,productionAliasCount:0};
  });
}
async function readFrontend(env,fetchImpl) {
  const read=async(address,operation)=>diagnose({stage:'frontend_origin',operation,expected:'exact Preview origin',reason:'frontend_assets_unreadable'},async state=>{
    const url=new URL(address,CLINIC_SETUP.origin);assert.equal(url.origin,CLINIC_SETUP.origin);
    const response=await observedFetch(state,fetchImpl)(url.href,{headers:previewRequestHeaders(env.VERCEL_AUTOMATION_BYPASS_SECRET),redirect:'error',signal:AbortSignal.timeout(15000)});
    state.expected='HTTP 200';assert.equal(response.status,200);
    Object.assign(state,{stage:'frontend_body',expected:'readable text below 10000000 characters',observed:'unreadable_or_oversized',reason:'frontend_assets_unreadable'});
    const body=await response.text();assert.ok(body.length<10000000);return body;
  });
  const html=await read('/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase','sign_in_document');
  return diagnose({stage:'frontend_assets',operation:'sign_in_script_inventory',httpStatus:200,expected:'1 to 100 same-origin sign-in JavaScript assets',observed:'missing_or_invalid',reason:'frontend_assets_unreadable'},async state=>{
    const urls=[...new Set([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'))
      .filter(address=>address.startsWith('/_next/static/')&&new URL(address,CLINIC_SETUP.origin).pathname.endsWith('.js')))];
    assert.ok(urls.length>0&&urls.length<=100);
    const chunks=[];for(const [index,address] of urls.entries())chunks.push({body:await read(address,`sign_in_script:${index+1}`)});
    Object.assign(state,{stage:'frontend_captcha',operation:'inspect_shipped_captcha',httpStatus:null,expected:'verified optional CAPTCHA and configured widget',observed:'unverified',reason:'unverified_captcha'});
    try {return {...inspectShippedCaptcha(chunks),applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId};}catch(error){
      if(error?.code==='ERR_ASSERTION'&&error.message.startsWith('shipped client requires CAPTCHA'))Object.assign(state,{observed:'required',reason:'required_captcha'});
      if(error?.code==='ERR_ASSERTION'&&error.message.startsWith('unreadable shipped JavaScript'))Object.assign(state,{observed:'unreadable_javascript',reason:'frontend_assets_unreadable'});
      throw error;
    }
  });
}
async function readCaptcha(env,fetchImpl) {
  return diagnose({stage:'configuration',operation:'VERCEL_AUTOMATION_BYPASS_SECRET',expected:'existing credential available',observed:'missing',reason:'missing_credential'},async state=>{
    assert.ok(env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim());
    const frontend=await readFrontend(env,fetchImpl);
    Object.assign(state,{stage:'configuration',operation:'SUPABASE_ACCESS_TOKEN',httpStatus:null,expected:'existing credential available',observed:'missing',reason:'missing_credential'});
    assert.ok(env.SUPABASE_ACCESS_TOKEN?.trim());
    state.operation='server_captcha_config';
    try {return {...await readResumeCaptchaPolicy({project:CLINIC_SETUP.project,token:env.SUPABASE_ACCESS_TOKEN,frontend,fetchImpl:async(...args)=>{
      const response=await observedFetch(state,fetchImpl)(...args);
      if(response.ok)Object.assign(state,{stage:'server_captcha',expected:'security_captcha_enabled is boolean false',observed:'unverified',reason:'unverified_captcha'});
      return response;
    }}),syntheticProfile:'clinic_setup_only'};}catch(error){
      if(error?.code==='ERR_ASSERTION'&&error.message.startsWith('required or unknown Acceptance CAPTCHA cannot be bypassed'))Object.assign(state,{observed:'required',reason:'required_captcha'});
      if(error?.message==='Acceptance CAPTCHA configuration unreadable')Object.assign(state,{stage:'response_json',expected:'readable Auth configuration JSON',observed:'unreadable_json',reason:'unreadable_provider_response'});
      throw error;
    }
  });
}
export async function collectClinicLivePrerequisites({env=process.env,fetchImpl=fetch,querySql,qualifyDatabase,readProgress=readClinicLiveScreeningProgress}) {
  const checks=[];let preview=null,captchaPolicy=null,databaseEvidence=null,screeningProgress=null;
  const add=(id,ok,reason)=>checks.push({id,ok,reason:ok?null:reason});
  const database=async()=>{
    databaseEvidence=await readClinicDatabasePrerequisites({env,fetchImpl,querySql,qualifyDatabase});checks.push(...databaseEvidence.checks);
  };
  await Promise.all([database(),(async()=>{
    const failed=(id,error)=>checks.push({id,ok:false,...diagnosticFailures.get(error)});
    try {preview=await readPreview(env,fetchImpl);add('exact_current_preview',true);}catch(error){failed('exact_current_preview',error);}
    if(!preview){checks.push({id:'shipped_and_server_captcha',ok:false,stage:'dependency',operation:'verify_exact_preview',httpStatus:null,expected:'verified current Preview',observed:'unproven',reason:'preview_required_before_shipped_read'});return;}
    try {captchaPolicy=await readCaptcha(env,fetchImpl);add('shipped_and_server_captcha',true);}
    catch(error){failed('shipped_and_server_captcha',error);}
  })()]);
  if(preview&&captchaPolicy) {
    screeningProgress=await readProgress({env,captchaPolicy});
    checks.push({id:'live_screening_progress',ok:screeningProgress.status==='READY',...(screeningProgress.status==='READY'?{}:{stage:screeningProgress.stage,operation:screeningProgress.operation,httpStatus:screeningProgress.httpStatus,reason:screeningProgress.reason,expected:screeningProgress.expected,observed:screeningProgress.observed})});
  } else checks.push({id:'live_screening_progress',ok:false,stage:'dependency',operation:'verify_preview_and_captcha',reason:'preview_and_captcha_required_before_progress'});
  return {schemaVersion:'clinic_setup_live_readonly_prerequisites/v1',status:checks.length>0&&checks.every(c=>c.ok===true)?'READY':'BLOCKED',
    projectRef:CLINIC_SETUP.project,applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,
    attemptId:CLINIC_FRESH_ATTEMPT.id,attemptConsumedByRun:CLINIC_FRESH_ATTEMPT.consumedByRun,controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,capturedAt:new Date().toISOString(),
    checks,blockers:checks.filter(c=>c.ok!==true),preview,captchaPolicy,databaseEvidence,screeningProgress,stateChangingStepReached:false};
}
export function readCurrentClinicGate(filename,env=process.env,now=Date.now()) {
  const gate=JSON.parse(fs.readFileSync(filename,'utf8'));
  assert.equal(gate.attemptId,CLINIC_FRESH_ATTEMPT.id,'Gate must qualify the exact fresh attempt');
  assert.equal(gate.attemptConsumedByRun,null,'Consumed attempt cannot supply a READY gate');
  assert.equal(gate.schemaVersion,'clinic_setup_live_readonly_prerequisites/v1');assert.equal(gate.status,'READY');
  assert.equal(gate.projectRef,CLINIC_SETUP.project);assert.equal(gate.applicationSha,CLINIC_SETUP.app);assert.equal(gate.deploymentId,CLINIC_SETUP.deploymentId);
  for(const [key,value] of Object.entries({controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT}))assert.ok(value&&gate[key]===value,'live gate must belong to this exact runner');
  assert.ok(now-Date.parse(gate.capturedAt)>=0&&now-Date.parse(gate.capturedAt)<300000,'live prerequisite result must be fresh');
  assert.ok(gate.checks.length>0&&gate.checks.every(c=>c.ok===true)&&gate.blockers.length===0);
  for(const id of ['database_execution_role','database_session_identity','database_transaction_read_only',
    ...probeSignatures.map(s=>`database_execute:${s}`),'application_service_rls_context','application_service_schema_usage','database_complete_compatibility','reconciled_clinic_history','exact_current_preview','shipped_and_server_captcha','live_screening_progress'])assert.ok(gate.checks.some(c=>c.id===id&&c.ok));
  assertClinicProgressEvidence(gate.screeningProgress,now);
  assert.equal(gate.databaseEvidence?.executionContext?.current_user,'postgres');assert.equal(gate.databaseEvidence.executionContext.transaction_read_only,'on');
  assert.ok(['postgres','supabase_admin'].includes(gate.databaseEvidence.executionContext.session_user));
  assert.equal(gate.databaseEvidence.prerequisiteSqlSha256,prerequisiteSqlHash);
  assert.equal(gate.databaseEvidence.claimSqlSha256,claimSqlHash);
  const requiredChecks=[...qualifyClinicClaimPrerequisites({functions:[],relations:[]}).checks,
    ...qualifyClinicDatabasePrerequisites({catalog:{functions:[],relations:[{name:'public.legal_aid_policy_profiles',present:false}]},projectRef:CLINIC_SETUP.project,appSha:CLINIC_SETUP.app}).checks];
  for(const {id} of requiredChecks)assert.equal(gate.checks.filter(c=>c.id===id&&c.ok===true).length,1,`missing or duplicate prerequisite: ${id}`);
  const sql=fs.readFileSync(new URL('./sql/rcap-clinic-database-prerequisites.sql',import.meta.url),'utf8');
  assert.equal(gate.databaseEvidence.inspectionSqlSha256,createHash('sha256').update(clinicInspectionSql(sql)).digest('hex'));
  assert.equal(gate.databaseEvidence.requests?.length,1);assert.ok([200,201].includes(gate.databaseEvidence.requests[0].httpStatus));
  assert.equal(gate.databaseEvidence.requests[0].sqlstate,null);assert.equal(gate.databaseEvidence.stateChangingStepReached,false);
  assert.equal(gate.preview?.previewVerified,true);assert.equal(gate.preview.deploymentId,CLINIC_SETUP.deploymentId);
  assert.equal(gate.captchaPolicy?.project,CLINIC_SETUP.project);assert.equal(gate.captchaPolicy.frontend?.applicationSha,CLINIC_SETUP.app);
  assert.equal(gate.captchaPolicy.frontend?.deploymentId,CLINIC_SETUP.deploymentId);assert.equal(gate.captchaPolicy?.serverCaptchaRequired,false);assert.equal(gate.captchaPolicy?.frontend?.clientCaptchaRequired,false);assert.equal(gate.captchaPolicy.frontend.widgetSiteKeyConfigured,true);
  return gate;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const output=path.resolve(process.env.RCAP_BROWSER_EVIDENCE_DIR??'clinic-setup-only-evidence');fs.mkdirSync(output,{recursive:true});
  try {
    const gate=await collectClinicLivePrerequisites({querySql:CLINIC_PREREQUISITE_SQL,qualifyDatabase:qualifyClinicDatabasePrerequisites});
    fs.writeFileSync(path.join(output,'clinic-live-prerequisites.json'),JSON.stringify(gate,null,2)+'\n');
    if(gate.status!=='READY')process.exitCode=1;
  } catch {fs.writeFileSync(path.join(output,'clinic-live-prerequisites.json'),JSON.stringify({status:'BLOCKED',blockers:[{id:'prerequisite_contract',reason:'unavailable'}]})+'\n');process.exitCode=1;}
}
