import {CLINIC_FRESH_ATTEMPT} from './rcap-clinic-fresh-attempt.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {collectClinicLivePrerequisites,readCurrentClinicGate,readClinicDatabasePrerequisites,clinicInspectionSql} from './rcap-clinic-live-prerequisites.mjs';
import {qualifyClinicClaimPrerequisites,CLINIC_CLAIM_SQL} from './lib/rcap-clinic-claim-prerequisites.mjs';
import {CLINIC_PREREQUISITE_SQL,qualifyClinicDatabasePrerequisites} from './lib/rcap-clinic-database-prerequisites.mjs';
const signatures=['public.rcap_partner_activation_for_launch(text)','public.rcap_program_screening_jurisdictions(text)','public.rcap_program_packet_scope_authorized(text,text)','public.clinic_entry_sponsor_capacity(uuid,text)','public.rcap_program_screening_capacity(text)'];
const identity={current_user:'postgres',session_user:'postgres',transaction_read_only:'on'};
const context=()=>({...identity,clinic_supplemental_contract:claimFixture(),service_role_bypassrls:true,service_role_public_usage:true,probe_execute:Object.fromEntries(signatures.map(s=>[s,true]))});
const env={SUPABASE_ACCESS_TOKEN:'mock-existing-context'};
const validContract=()=>({status:'READY',checks:[{id:'mock-contract',ok:true}],blockers:[],operational:{existing_code_available:false,
 existing_code_inventory:CLINIC_FRESH_ATTEMPT.history.map(h=>({id:h.id,uses_count:h.usesCount,max_uses:h.maxUses,is_active:true,starts_at:h.startsAt,expires_at:h.expiresAt,redemption_rows:h.redemptionRows})),
 fresh_attempt:{event:{eventId:CLINIC_SETUP.event,eventStatus:'published',capacity:20,entries:CLINIC_FRESH_ATTEMPT.entries},priorRedemption:{id:CLINIC_FRESH_ATTEMPT.redemptionId,codeId:CLINIC_FRESH_ATTEMPT.history[1].id,closed:false,assisted:false}}
}});
test('live adapter makes bounded fixed-project read-only aggregate and retains all blockers without catalog contents',async()=>{
 let reads=0;
 const result=await collectClinicLivePrerequisites({env:{SUPABASE_ACCESS_TOKEN:'mock-existing-context',VERCEL_TOKEN:'mock'},
  querySql:CLINIC_PREREQUISITE_SQL,
  fetchImpl:async(address,options)=>{
    if(String(address)===`https://api.supabase.com/v1/projects/${CLINIC_SETUP.project}/database/query`) {
      reads++;const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body),['query']);assert.match(body.query,/^begin transaction read only;/);assert.match(body.query,/commit;\n$/);assert.equal(options.redirect,'error');
      return Response.json([{...context(),clinic_known_compatibility_prerequisites:{privateSentinel:'not-recorded'}}],{status:201});
    }
    throw Error('unproven preview fixture');
  },
  qualifyDatabase:({catalog,projectRef,appSha})=>{
    assert.equal(catalog.privateSentinel,'not-recorded');assert.equal(projectRef,CLINIC_SETUP.project);assert.equal(appSha,CLINIC_SETUP.app);
    return {status:'BLOCKED',checks:[{id:'missing_claim_overload',ok:false},{id:'missing_retry_columns',ok:false}],blockers:[{id:'missing_claim_overload'},{id:'missing_retry_columns'}]};
  }});
 assert.equal(reads,1);assert.equal(result.status,'BLOCKED');
 for(const id of ['missing_claim_overload','missing_retry_columns','exact_current_preview','shipped_and_server_captcha'])assert.ok(result.blockers.some(check=>check.id===id));
 assert.ok(!JSON.stringify(result).includes('not-recorded'));assert.ok(!JSON.stringify(result).includes('mock-existing-context'));
});
test('browser admission rejects stale, other-run, unknown CAPTCHA and incomplete prerequisite artifacts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-gate-unit-'));const file=path.join(dir,'gate.json');
 const env={GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1'},now=Date.now();
 const gate={attemptId:CLINIC_FRESH_ATTEMPT.id,schemaVersion:'clinic_setup_live_readonly_prerequisites/v1',status:'READY',projectRef:CLINIC_SETUP.project,
  applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,controlHead:env.GITHUB_SHA,runId:'123',runAttempt:'1',capturedAt:new Date(now).toISOString(),
  databaseEvidence:{executionContext:identity,claimSqlSha256:createHash('sha256').update(CLINIC_CLAIM_SQL).digest('hex'),prerequisiteSqlSha256:createHash('sha256').update(CLINIC_PREREQUISITE_SQL).digest('hex'),inspectionSqlSha256:createHash('sha256').update(clinicInspectionSql(CLINIC_PREREQUISITE_SQL)).digest('hex'),requests:[{operation:'compatibility_inspection',httpStatus:201,sqlstate:null}],stateChangingStepReached:false},
  checks:[...qualifyClinicClaimPrerequisites({functions:[],relations:[]}).checks.map(c=>c.id),...qualifyClinicDatabasePrerequisites({catalog:{functions:[],relations:[{name:'public.legal_aid_policy_profiles',present:false}]},projectRef:CLINIC_SETUP.project,appSha:CLINIC_SETUP.app}).checks.map(c=>c.id),'database_execution_role','database_session_identity','database_transaction_read_only',...signatures.map(s=>`database_execute:${s}`),'application_service_rls_context','application_service_schema_usage','database_complete_compatibility','reconciled_clinic_history','exact_current_preview','shipped_and_server_captcha'].map(id=>({id,ok:true})),blockers:[],
  preview:{previewVerified:true,deploymentId:CLINIC_SETUP.deploymentId},captchaPolicy:{project:CLINIC_SETUP.project,serverCaptchaRequired:false,
    frontend:{applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,clientCaptchaRequired:false,widgetSiteKeyConfigured:true}}};
 try {
  fs.writeFileSync(file,JSON.stringify(gate));assert.equal(readCurrentClinicGate(file,env,now).status,'READY','unit-only artifact contract; no hosted readiness claim');
  for(const change of [d=>{d.attemptId=CLINIC_FRESH_ATTEMPT.priorRequestId;},d=>{d.status='BLOCKED';},d=>{d.runId='456';},d=>{d.capturedAt=new Date(now-300001).toISOString();},
   d=>{d.captchaPolicy.serverCaptchaRequired=true;},d=>{d.captchaPolicy.frontend.clientCaptchaRequired=null;},d=>{d.checks.shift();},...gate.checks.map(({id})=>d=>{d.checks=d.checks.filter(c=>c.id!==id);}),d=>{d.checks.push({...d.checks[0]});},d=>{d.projectRef='wrong';},d=>{d.controlHead='b'.repeat(40);},d=>{d.runAttempt='2';},d=>{d.databaseEvidence.requests=[];},d=>{d.databaseEvidence.inspectionSqlSha256='0'.repeat(64);},d=>{d.databaseEvidence.executionContext.session_user='anon';},d=>{d.databaseEvidence.executionContext={...identity,transaction_read_only:'off'};}]) {
    const changed=structuredClone(gate);change(changed);fs.writeFileSync(file,JSON.stringify(changed));assert.throws(()=>readCurrentClinicGate(file,env,now));
  }
 } finally {fs.rmSync(dir,{recursive:true});}
});

async function readWith(responses,qualifyDatabase=validContract) {
 let calls=0;
 const result=await readClinicDatabasePrerequisites({env,querySql:CLINIC_PREREQUISITE_SQL,qualifyDatabase,
  fetchImpl:async(address,options)=>{
   assert.equal(address,`https://api.supabase.com/v1/projects/${CLINIC_SETUP.project}/database/query`);
   assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
   assert.deepEqual(Object.keys(JSON.parse(options.body)),['query']);
   return responses[calls++];
  }});
 return {...result,calls};
}
test('201 and retained 200 accept only the exact context and single inspection row',async()=>{
 for(const status of [200,201]) {
  const result=await readWith([Response.json([{...context(),clinic_known_compatibility_prerequisites:{privateSentinel:'never-output'}}],{status})]);
  assert(result.checks.every(c=>c.ok));assert.equal(result.calls,1);assert.deepEqual(result.executionContext,identity);
  assert.deepEqual(result.requests.map(r=>r.httpStatus),[status]);assert.equal(result.stateChangingStepReached,false);
  assert(!JSON.stringify(result).includes('never-output'));
 }
});
test('permission denial preserves sanitized HTTP status SQLSTATE stage and operation',async()=>{
 for(const body of [{code:'42501',message:'private contents'}, {message:'Failed to run sql query: ERROR: 42501: private contents'}]) {
  const result=await readWith([Response.json(body,{status:403})]);
  assert.equal(result.calls,1);assert.deepEqual(result.checks.at(-1),{id:'database_complete_compatibility',ok:false,reason:'database_inspection_failed',stage:'http_status',operation:'compatibility_inspection',httpStatus:403,sqlstate:'42501',expected:'HTTP 200 or 201',observed:403});
  assert(!JSON.stringify(result).includes('private contents'));assert(!JSON.stringify(result).includes(env.SUPABASE_ACCESS_TOKEN));
 }
 const result=await readWith([Response.json({code:'42501'},{status:500})]);
 assert.equal(result.checks.at(-1).operation,'compatibility_inspection');assert.equal(result.checks.at(-1).sqlstate,'42501');
});
test('malformed JSON rows status and missing catalog fail closed without leaking response contents',async()=>{
 for(const response of [new Response('private invalid JSON',{status:201}),Response.json([],{status:201}),Response.json([{},{}],{status:201}),Response.json({secret:'private contents'},{status:201}),Response.json([context()],{status:202})]) {
  const result=await readWith([response]);assert.equal(result.calls,1);assert(result.checks.some(c=>!c.ok));assert(!JSON.stringify(result).includes('private'));
 }
 for(const catalog of [undefined,null,[],1,'private contents']) {
  let qualified=false;
  const result=await readWith([Response.json([{...context(),clinic_known_compatibility_prerequisites:catalog}],{status:201})],()=>{qualified=true;throw Error('must not qualify');});
  assert.equal(qualified,false);assert.equal(result.checks.at(-1).stage,'database_contract');
 }
});
test('actual restricted execution role and all five privilege denials aggregate before operational probes',async()=>{
 const denied={...context(),current_user:'supabase_read_only_user',session_user:'supabase_read_only_user',probe_execute:Object.fromEntries(signatures.map(s=>[s,false]))};
 const result=await readWith([Response.json([denied],{status:201})]);
 assert.equal(result.calls,1);assert.equal(result.executionContext.current_user,'supabase_read_only_user');
 assert.equal(result.checks.filter(c=>c.id.startsWith('database_execute:')&&!c.ok).length,5);
 assert(result.checks.some(c=>c.id==='database_execution_role'&&!c.ok));assert.equal(result.stateChangingStepReached,false);
});
test('missing identity or a read-write transaction never qualifies',async()=>{
 for(const delta of [{current_user:undefined},{session_user:undefined},{transaction_read_only:'off'},{transaction_read_only:undefined},{service_role_bypassrls:false},{service_role_public_usage:false}]) {
  const result=await readWith([Response.json([{...context(),...delta}],{status:201})]);assert.equal(result.calls,1);assert(result.checks.some(c=>!c.ok));
 }

});
test('exact reviewed SQL stays pinned inside the same-transaction inspection envelope',()=>{
 const wire=clinicInspectionSql(CLINIC_PREREQUISITE_SQL);
 const body=CLINIC_PREREQUISITE_SQL.slice('begin transaction read only;\n'.length,-'\ncommit;\n'.length);
 assert(wire.includes(body.slice(0,-1)));assert.match(wire,/^begin transaction read only;/);assert.match(wire,/commit;\n$/);
 assert.match(wire,/case when current_user='postgres' and current_setting\('transaction_read_only'\)='on' and probes_allowed/);
 assert.match(wire,/session_user::text/);assert.match(wire,/else null end as clinic_known_compatibility_prerequisites/);
 assert.throws(()=>clinicInspectionSql(CLINIC_PREREQUISITE_SQL.replace('read only','read write')));
 assert.throws(()=>clinicInspectionSql(CLINIC_PREREQUISITE_SQL+'select 1;'));
 assert.doesNotMatch(wire,/set role|grant |insert into |update public |delete from /i);
});

function claimFixture() {
 const contract=JSON.parse(fs.readFileSync(new URL('./lib/rcap-clinic-claim-prerequisite-contract.json',import.meta.url),'utf8'));
 const functions=contract.functions.map(f=>({name:f.name,overloads:[{...f,owner:'postgres',service_execute:true,anon_execute:false,authenticated_execute:false}]}));
 const relations=contract.relations.map(t=>({...t,present:true,owner:'postgres',service_select:true,service_insert:true,anon_access:false,authenticated_access:false,
  columns:Object.entries(t.columns).map(([name,type])=>({name,type})),constraints:[],indexes:[],triggers:[]}));
 relations[0].constraints=[
  {name:'consumer_pending_screening_results_claim_shape',definition:"CHECK (((status <> 'CLAIMED'::text) OR ((claimed_user_id IS NOT NULL) AND (claimed_matter_id IS NOT NULL) AND (claimed_at IS NOT NULL))))"},
  {name:'consumer_pending_screening_results_matter_implies_claimed',definition:"CHECK (((claimed_matter_id IS NULL) OR (status = 'CLAIMED'::text)))"},
  {name:'consumer_pending_screening_results_claimed_matter_fkey',definition:'FOREIGN KEY (claimed_matter_id) REFERENCES consumer_briefcase_items(id) ON DELETE SET NULL'}];
 relations[0].indexes=[{name:'pending_token_unique',valid:true,ready:true,definition:'CREATE UNIQUE INDEX pending_token_unique ON public.consumer_pending_screening_results USING btree (claim_token_hash)'}];
 relations[1].triggers=[{name:'participant_claim_events_no_update',enabled:'O',function_body_md5:contract.append_only_body_md5,definition:'CREATE TRIGGER participant_claim_events_no_update BEFORE DELETE OR UPDATE ON public.participant_claim_events FOR EACH ROW EXECUTE FUNCTION participant_claim_events_append_only()'}];
 relations[1].indexes=[['participant_claim_events_pending_idx','pending_result_id'],['participant_claim_events_actor_idx','actor_user_id']].map(([name,column])=>({name,valid:true,ready:true,definition:`CREATE INDEX ${name} ON public.participant_claim_events USING btree (${column}, occurred_at DESC)`}));
 const analytics=relations[2];
 for(const c of analytics.columns) {c.not_null=false;c.default=({id:'gen_random_uuid()',occurred_at:'now()',metadata:"'{}'::jsonb"})[c.name]??null;}
 analytics.anon_access=true;analytics.authenticated_access=true;
 analytics.policies=[{name:'rcap_screening_analytics_select_own_partner',command:'r',role_names:['authenticated'],using:'(partner_slug = current_partner_slug())'},
  {name:'rcap_screening_analytics_select_internal_admin',command:'r',role_names:['authenticated'],using:'is_internal_admin()'}];
 analytics.constraints=[{name:'rcap_screening_analytics_events_event_type_check',definition:"CHECK ((event_type = ANY (ARRAY['screening_started'::text, 'screening_completed'::text, 'eligibility_result_recorded'::text, 'guidance_only_result'::text, 'packet_ready_result'::text, 'packet_generated'::text, 'packet_overage_recorded'::text])))"}];
 analytics.indexes=[['partner','partner_slug, occurred_at'],['code','partner_access_code_id'],['session','session_id, event_type']].map(([suffix,columns])=>({valid:true,ready:true,definition:`CREATE INDEX rcap_screening_analytics_events_${suffix}_idx ON public.rcap_screening_analytics_events USING btree (${columns})`}));
 analytics.triggers=['UPDATE','DELETE'].map(action=>({enabled:'O',function_body_md5:contract.analytics_append_only_body_md5,definition:`CREATE TRIGGER rcap_screening_analytics_prevent_${action.toLowerCase()} BEFORE ${action} ON public.rcap_screening_analytics_events FOR EACH ROW EXECUTE FUNCTION prevent_rcap_screening_analytics_mutation()`}));
 const admission_analytics_trigger={present:true,enabled:'O',owner_insert:true,function_owner:'postgres',function_source_body_md5:contract.functions.find(f=>f.kind==='trigger').source_body_md5,
  definition:'CREATE TRIGGER rcap_screening_started_event AFTER INSERT ON public.screening_sessions FOR EACH ROW EXECUTE FUNCTION emit_rcap_screening_started_event()'};
 return {functions,relations,admission_analytics_trigger};
}
test('claim dependencies verify atomic RPC, consumption, table shape, rights and replay protections together',()=>{
 assert(qualifyClinicClaimPrerequisites(claimFixture()).checks.every(c=>c.ok));
 const data=claimFixture();data.functions[0].overloads=[];data.functions[1].overloads[0].arguments='wrong defaults';data.relations[0].columns.pop();data.relations[0].indexes[0].valid=false;data.relations[1].triggers[0].enabled='D';
 const result=qualifyClinicClaimPrerequisites(data);
 for(const id of ['consume_rcap_screening_session(uuid)','claim_pending_screening_result(text,uuid,jsonb,text)','public.consumer_pending_screening_results','unique_claim_token','append_only_claim_events'])assert(result.checks.some(c=>c.id===`claim_contract:${id}`&&!c.ok));
});
test('claim scope rejects weakened constraints, changed body, direct access and missing audit indexes',()=>{
 for(const change of [d=>{d.functions[1].overloads[0].source_body_md5='0'.repeat(32);},d=>{d.relations[0].constraints[0].definition='CHECK (true)';},d=>{d.relations[0].anon_access=true;},d=>{d.relations[1].authenticated_access=true;},d=>{d.relations[1].indexes.pop();},d=>{d.relations[1].triggers[0].function_body_md5='0'.repeat(32);}]) {
  const data=claimFixture();change(data);assert(qualifyClinicClaimPrerequisites(data).checks.some(c=>!c.ok));
 }
 const data=claimFixture();data.functions[2].overloads=[];const result=qualifyClinicClaimPrerequisites(data);
 assert(result.checks.every(c=>c.ok));assert.deepEqual(result.observations,[{id:'optional:record_rcap_screening_analytics_event',compatible:false,blocking:false}]);
});

test('mandatory admission trigger is distinct from optional analytics RPC and checks nested INSERT prerequisites',()=>{
 for(const change of [d=>{d.functions.find(f=>f.name==='emit_rcap_screening_started_event').overloads=[];},d=>{d.admission_analytics_trigger.owner_insert=false;},
  d=>{d.admission_analytics_trigger.enabled='D';},d=>{d.relations[2].columns.find(c=>c.name==='metadata').default=null;},d=>{d.relations[2].rls=false;},
  d=>{d.relations[2].policies[0].command='*';},d=>{d.relations[2].triggers[0].enabled='D';},d=>{d.relations[2].constraints[0].definition='CHECK (false)';},d=>{d.relations[2].indexes.pop();}]) {
  const data=claimFixture();change(data);assert(qualifyClinicClaimPrerequisites(data).checks.some(c=>!c.ok));
 }
 const data=claimFixture();const trigger=data.functions.find(f=>f.name==='emit_rcap_screening_started_event').overloads[0];
 trigger.service_execute=false;trigger.anon_execute=true;assert(qualifyClinicClaimPrerequisites(data).checks.every(c=>c.ok),'trigger execution is not an application RPC grant');
});

const privateSentinel='PRIVATE_RESPONSE_TOKEN_COOKIE_DO_NOT_EMIT';
function shippedCaptchaFixture(required=false) {
 return `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([null,1,e=>{e.s(["isAuthCaptchaRequired",0,()=>${required},"getTurnstileSiteKey",0,()=>"fixture-widget","authCaptchaFailureMessage",0,"Please complete the security check and try again."]);},2,e=>{const h=e.i(1);function signIn(){if(h.isAuthCaptchaRequired()&&!token.trim()){h.authCaptchaFailureMessage;}}}]);`;
}
function previewFixture() {
 return {id:CLINIC_SETUP.deploymentId,readyState:'READY',target:'preview',projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',gitSource:{sha:CLINIC_SETUP.app},
  meta:{rcapApplicationSha:CLINIC_SETUP.app,rcapAcceptanceProjectRef:CLINIC_SETUP.project,rcapWorkerSourceSha:'16908485a94f475448657cea90583a4d352da9a3',
   rcapWorkerDigest:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',rcapRouteState:'disabled',rcapClinicDemoMode:'none',rcapStripeConfigured:'false',rcapStagingScopeSha256:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}};
}
async function providerResult(overrides={},envDelta={}) {
 const calls=[];
 const responses={
  database:()=>Response.json([{...context(),clinic_known_compatibility_prerequisites:{}}],{status:201}),
  project:()=>Response.json({name:'legalease-partner-dashboard-clean',id:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',accountId:'team_4qLmZK9WI6xIy5vjYC0IF3ae'}),
  deployment:()=>Response.json(previewFixture()),alias:()=>Response.json({id:CLINIC_SETUP.deploymentId}),aliases:()=>Response.json({aliases:[]}),
  document:()=>new Response('<script src="/_next/static/fixture.js"></script>'),script:()=>new Response(shippedCaptchaFixture()),
  captcha:()=>Response.json({security_captcha_enabled:false,privateValue:privateSentinel}),...overrides};
 const result=await collectClinicLivePrerequisites({env:{SUPABASE_ACCESS_TOKEN:privateSentinel,VERCEL_TOKEN:privateSentinel,VERCEL_AUTOMATION_BYPASS_SECRET:privateSentinel,...envDelta},
  querySql:CLINIC_PREREQUISITE_SQL,qualifyDatabase:validContract,fetchImpl:async(address,options)=>{
   const url=new URL(address);const kind=url.hostname==='api.supabase.com'?(url.pathname.endsWith('/database/query')?'database':'captcha')
    :url.hostname==='api.vercel.com'?(url.pathname.startsWith('/v9/projects/')?'project':url.pathname.endsWith('/aliases')?'aliases':url.pathname.endsWith(CLINIC_SETUP.deploymentId)?'deployment':'alias')
    :url.pathname==='/expungement-ai/sign-in'?'document':'script';
   calls.push(kind);assert.equal(options.redirect,'error');return responses[kind]();
  }});
 assert(!JSON.stringify(result).includes(privateSentinel));
 return {result,calls};
}
const failure=(result,id)=>result.blockers.find(c=>c.id===id);
test('provider diagnostics retain successful Preview and real static CAPTCHA inspection without private values',async()=>{
 const {result,calls}=await providerResult();assert.equal(result.status,'READY','unit fixture only, not live readiness');
 assert.equal(result.preview.applicationSha,CLINIC_SETUP.app);assert.equal(result.captchaPolicy.serverCaptchaRequired,false);
 assert.equal(result.captchaPolicy.frontend.clientCaptchaRequired,false);assert.equal(calls.filter(c=>c==='database').length,1);
});
test('missing provider credentials identify the exact variable and never send an unauthenticated request',async()=>{
 for(const [key,id,operation,absentCall] of [['VERCEL_TOKEN','exact_current_preview','VERCEL_TOKEN','project'],['VERCEL_AUTOMATION_BYPASS_SECRET','shipped_and_server_captcha','VERCEL_AUTOMATION_BYPASS_SECRET','document']]) {
  const {result,calls}=await providerResult({}, {[key]:''});
  assert.deepEqual(failure(result,id),{id,ok:false,httpStatus:null,observed:'missing',stage:'configuration',operation,expected:'existing credential available',reason:'missing_credential'});
  assert(!calls.includes(absentCall));
 }
 const {result,calls}=await providerResult({}, {SUPABASE_ACCESS_TOKEN:''});
 assert.equal(failure(result,'shipped_and_server_captcha').operation,'SUPABASE_ACCESS_TOKEN');assert(!calls.includes('captcha'));
});
test('provider denial, transport and malformed JSON retain request-local operation and status',async()=>{
 for(const [kind,operation] of [['project','vercel_project_lookup'],['deployment','deployment_lookup'],['alias','preview_alias_lookup'],['aliases','deployment_aliases_lookup'],['document','sign_in_document'],['script','sign_in_script:1'],['captcha','server_captcha_config']]) {
  for(const status of [401,403]) {
   const {result}=await providerResult({[kind]:()=>new Response(privateSentinel,{status})});
   const d=failure(result,['document','script','captcha'].includes(kind)?'shipped_and_server_captcha':'exact_current_preview');
   assert.equal(d.httpStatus,status);assert.equal(d.operation,operation);assert.equal(d.reason,'provider_access_denied');assert.equal(d.stage,'http_status');
  }
  const {result}=await providerResult({[kind]:()=>{throw Error(privateSentinel);}});
  const d=failure(result,['document','script','captcha'].includes(kind)?'shipped_and_server_captcha':'exact_current_preview');
  assert.equal(d.httpStatus,null);assert.equal(d.operation,operation);assert.equal(d.stage,'http_request');assert.equal(d.reason,'transport_failed');
 }
 for(const kind of ['project','deployment','alias','aliases','captcha']) {
  const {result}=await providerResult({[kind]:()=>new Response(privateSentinel)});
  const d=failure(result,kind==='captcha'?'shipped_and_server_captcha':'exact_current_preview');assert.equal(d.httpStatus,200);assert.equal(d.reason,'unreadable_provider_response');
 }
});
test('parallel Preview reads do not attribute an alias denial to a later successful deployment response',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});
 const {result}=await providerResult({deployment:async()=>{await pending;return Response.json(previewFixture());},alias:()=>{release();return new Response(privateSentinel,{status:403});}});
 const d=failure(result,'exact_current_preview');assert.equal(d.operation,'preview_alias_lookup');assert.equal(d.httpStatus,403);
});
test('deployment mismatch names the exact failed binding without serializing observed provider values',async()=>{
 for(const [change,operation] of [[d=>{d.id=privateSentinel;},'deployment_id'],[d=>{d.readyState=privateSentinel;},'deployment_readiness'],[d=>{d.target='production';},'deployment_target'],[d=>{d.projectId=privateSentinel;},'deployment_project'],[d=>{d.gitSource.sha=privateSentinel;},'application_source'],[d=>{d.meta.rcapRouteState=privateSentinel;},'deployment_metadata:rcapRouteState']]) {
  const deployment=previewFixture();change(deployment);const {result}=await providerResult({deployment:()=>Response.json(deployment)});
  const d=failure(result,'exact_current_preview');assert.equal(d.stage,'preview_identity');assert.equal(d.operation,operation);assert.equal(d.httpStatus,200);assert.equal(d.observed,'mismatch');
 }
 const {result}=await providerResult({project:()=>Response.json({name:privateSentinel})});assert.equal(failure(result,'exact_current_preview').operation,'project_name');
});
test('unreadable frontend assets, unverified guard, required client and required server CAPTCHA remain distinct refusals',async()=>{
 for(const [overrides,operation,reason,observed] of [
  [{document:()=>new Response('SSO '+privateSentinel)},'sign_in_script_inventory','frontend_assets_unreadable','missing_or_invalid'],
  [{script:()=>new Response('invalid {')},'inspect_shipped_captcha','frontend_assets_unreadable','unreadable_javascript'],
  [{script:()=>new Response('const validButNoGuard=true;')},'inspect_shipped_captcha','unverified_captcha','unverified'],
  [{script:()=>new Response(shippedCaptchaFixture(true))},'inspect_shipped_captcha','required_captcha','required'],
  [{captcha:()=>Response.json({security_captcha_enabled:true,privateValue:privateSentinel})},'server_captcha_config','required_captcha','required'],
  [{captcha:()=>Response.json({security_captcha_enabled:'false',privateValue:privateSentinel})},'server_captcha_config','unverified_captcha','unverified']]) {
  const {result}=await providerResult(overrides);assert.equal(result.status,'BLOCKED');const d=failure(result,'shipped_and_server_captcha');
  assert.equal(d.operation,operation);assert.equal(d.reason,reason);assert.equal(d.observed,observed);assert.equal(result.stateChangingStepReached,false);
 }
});

test('independent Preview read denials are aggregated without losing database evidence',async()=>{
 const {result}=await providerResult({deployment:()=>new Response(privateSentinel,{status:403}),alias:()=>new Response(privateSentinel,{status:401}),aliases:()=>new Response(privateSentinel,{status:503})});
 const d=failure(result,'exact_current_preview');assert.deepEqual(d.failures.map(x=>[x.operation,x.httpStatus]),[['deployment_lookup',403],['preview_alias_lookup',401],['deployment_aliases_lookup',503]]);
 assert(result.checks.some(c=>c.id==='database_complete_compatibility'&&c.ok));assert.equal(result.stateChangingStepReached,false);
});


test('an unknown third code blocks the new attempt without reopening database or credential acceptance',async()=>{
 const contract=validContract();contract.operational.existing_code_inventory.push({id:'11111111-1111-4111-8111-111111111111',uses_count:0,max_uses:1});
 const result=await readWith([Response.json([{...context(),clinic_known_compatibility_prerequisites:{}}],{status:201})],()=>contract);
 const failures=result.checks.filter(check=>!check.ok);
 assert.equal(failures.length,1);assert.equal(failures[0].id,'reconciled_clinic_history');
 assert.equal(failures[0].observed,'fresh_attempt_state_unqualified');
 assert.equal(result.calls,1);assert.equal(result.stateChangingStepReached,false);
});
