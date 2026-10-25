import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {CLINIC_SETUP,assertClinicSetupDispatch} from './rcap-clinic-setup-only-boundary.mjs';
import {readClinicRuntimePrerequisites} from './rcap-clinic-live-prerequisites.mjs';
export const OWNED_MATTER='6765fcb9-586d-4abe-bc60-9f77f6a11e16';
export const OWNED_SQL_SHA='7ff5a92fdbb4fef78370d728f3620781e0319c0a3ef76003d1ce5ddc67811b3c';
export const OWNED_CHECKS=Object.freeze(['inspector_readonly','expected_owner_account_usable','exact_records_exist','unique_existing_session_graph','owned_claimed_source_links','clinic_owner_event_session_linkage','valid_recorded_consent_at_claim','exact_success_audit','canonical_route_matches','screening_completed','pending_has_seven_answers','pending_saved_answers_match','matter_has_seven_screening_answers','stored_history_counts_preserved']);
const counts=['matterRows','pendingRows','screeningRows','caseRows','assistanceRows','mattersForSession','pendingForSession','casesForSession','screeningAnswerCount','pendingAnswerCount','matterScreeningAnswerCount','historyCodeCount','historyRedemptionCount','historyUseCounters','linkedClaimAuditCount'];
const identities={ownerId:CLINIC_SETUP.owner,matterId:OWNED_MATTER,pendingId:'98fea483-9e4b-41bf-833b-1bf57e359fa6',screeningId:'56f6cbfa-3dd2-44b1-95bf-84c800396519',clinicCaseId:'31b63a9d-7016-4b71-af1e-8b3426f142cc',assistanceId:'ad03264c-a40b-4217-b724-8851b39ce914',claimAuditId:'292de01d-d377-4b92-b13f-5a49008d4455',eventId:CLINIC_SETUP.event};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function assertOwnedMatterReadonlyDispatch(inputs) {
  assert.equal(inputs?.mode,'clinic_owned_matter_readonly');
  assert.equal(inputs.resume_matter_id,OWNED_MATTER);
  assert.ok(!inputs.clinic_attempt_id,'No intake attempt is permitted');
  assertClinicSetupDispatch({...inputs,mode:'clinic_prerequisites_only'});
}
export function qualifyOwnedMatterRow(row) {
  assert.ok(object(row)&&object(row.execution_context)&&object(row.checks)&&object(row.counts)&&object(row.identities));
  assert.deepEqual(Object.keys(row.checks).sort(),[...OWNED_CHECKS].sort());
  assert.ok(OWNED_CHECKS.every(k=>typeof row.checks[k]==='boolean'));
  assert.match(row.businessFingerprint,/^[a-f0-9]{64}$/);
  assert.deepEqual(row.identities,identities);
  assert.ok(counts.every(k=>Number.isSafeInteger(row.counts[k])&&row.counts[k]>=0));
  const safeRole=v=>['postgres','supabase_admin','supabase_read_only_user','service_role','authenticated','anon'].includes(v)?v:'unrecognized';
  const executionContext={current_user:safeRole(row.execution_context.current_user),session_user:safeRole(row.execution_context.session_user),transaction_read_only:['on','off'].includes(row.execution_context.transaction_read_only)?row.execution_context.transaction_read_only:'unknown'};
  const checks=OWNED_CHECKS.map(id=>({id,ok:row.checks[id]}));
  checks.find(c=>c.id==='inspector_readonly').ok&&=executionContext.current_user==='postgres'&&executionContext.session_user==='postgres'&&executionContext.transaction_read_only==='on';
  const expectedCounts={exact_records_exist:{matterRows:1,pendingRows:1,screeningRows:1,caseRows:1,assistanceRows:1},unique_existing_session_graph:{mattersForSession:1,pendingForSession:1,casesForSession:1},pending_has_seven_answers:{pendingAnswerCount:7},matter_has_seven_screening_answers:{matterScreeningAnswerCount:7},stored_history_counts_preserved:{historyCodeCount:8,historyRedemptionCount:22,historyUseCounters:9}};
  for(const [id,expected] of Object.entries(expectedCounts)){const check=checks.find(c=>c.id===id);if(check)check.ok&&=Object.entries(expected).every(([key,value])=>row.counts[key]===value);}

  return {checks,executionContext,businessFingerprint:row.businessFingerprint,counts:Object.fromEntries(counts.map(k=>[k,row.counts[k]])),identities:{...identities}};
}
export async function readOwnedMatterDatabase({env=process.env,fetchImpl=fetch}={}) {
  let stage='credential',httpStatus=null,sqlstate=null;
  try {
    assert.ok(env.SUPABASE_ACCESS_TOKEN?.trim());stage='sql_binding';
    const sql=fs.readFileSync(new URL('./sql/rcap-clinic-owned-matter-readonly.sql',import.meta.url),'utf8');
    assert.equal(createHash('sha256').update(sql).digest('hex'),OWNED_SQL_SHA);
    stage='database_http';
    const response=await fetchImpl(`https://api.supabase.com/v1/projects/${CLINIC_SETUP.project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql}),redirect:'error',signal:AbortSignal.timeout(30000)});
    httpStatus=response.status;stage='database_json';const rows=await response.json();
    if(object(rows))sqlstate=[rows.code,rows.sqlstate,typeof rows.message==='string'?rows.message.match(/\b(?:ERROR:|SQLSTATE[:=]?)\s*([0-9A-Z]{5})\b/)?.[1]:null].find(v=>typeof v==='string'&&/^[0-9A-Z]{5}$/.test(v))??null;
    stage='database_status';assert.ok([200,201].includes(httpStatus));
    stage='database_contract';assert.ok(Array.isArray(rows)&&rows.length===1&&object(rows[0]));
    const evidence=qualifyOwnedMatterRow(rows[0].owned_matter_readonly);
    return {...evidence,httpStatus,sqlstate,sqlSha256:OWNED_SQL_SHA,stateChangingStepReached:false};
  } catch {
    const conditions={credential:['existing inspector credential','unavailable'],sql_binding:['reviewed read-only SQL','mismatch'],database_http:['provider response','transport_failed'],database_json:['JSON response','invalid_json'],database_status:['HTTP 200 or 201',httpStatus],database_contract:['exact existing-matter contract','invalid_contract']};
    const [expected,observed]=conditions[stage];
    return {checks:[{id:'owned_matter_database',ok:false,stage,operation:'inspect_existing_owned_matter',httpStatus,sqlstate,expected,observed}],httpStatus,sqlstate,sqlSha256:OWNED_SQL_SHA,stateChangingStepReached:false};
  }
}
function assertGate(gate,env,now,fresh) {
  assert.equal(gate?.schema,'clinic_owned_matter_readonly/v1');assert.equal(gate.status,'READY');
  for(const [k,v] of Object.entries({matterId:OWNED_MATTER,projectRef:CLINIC_SETUP.project,applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:'1'})){assert.ok(v);assert.equal(gate[k],v,`Gate ${k} mismatch`);}
  assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.match(gate.controlHead,/^[a-f0-9]{40}$/);assert.match(gate.runId,/^\d+$/);
  const age=now-Date.parse(gate.capturedAt);assert.ok(Number.isFinite(age)&&age>=0&&(!fresh||age<300000),'Gate is stale or future-dated');
  assert.deepEqual(gate.blockers,[]);
  const expected=[...OWNED_CHECKS,'exact_current_preview','shipped_and_server_captcha'];
  assert.ok(Array.isArray(gate.checks)&&gate.checks.length===expected.length);
  assert.deepEqual(gate.checks.map(c=>c.id).sort(),expected.sort());assert.ok(gate.checks.every(c=>c.ok===true));
  assert.equal(gate.databaseEvidence.sqlSha256,OWNED_SQL_SHA);assert.ok([200,201].includes(gate.databaseEvidence.httpStatus));
  assert.match(gate.databaseEvidence.businessFingerprint,/^[a-f0-9]{64}$/);
  assert.deepEqual(gate.databaseEvidence.identities,identities);
  assert.deepEqual(gate.databaseEvidence.executionContext,{current_user:'postgres',session_user:'postgres',transaction_read_only:'on'});
  assert.ok(gate.preview&&gate.captchaPolicy,'Runtime evidence required');
  for(const [key,value] of Object.entries({previewVerified:true,deploymentId:CLINIC_SETUP.deploymentId,hostname:new URL(CLINIC_SETUP.origin).hostname,applicationSha:CLINIC_SETUP.app,acceptanceProjectRef:CLINIC_SETUP.project,routeState:'disabled',stripeConfigured:false,productionAliasCount:0}))assert.equal(gate.preview[key],value);
  assert.equal(gate.captchaPolicy.project,CLINIC_SETUP.project);assert.equal(gate.captchaPolicy.serverCaptchaRequired,false);
  for(const [key,value] of Object.entries({applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,clientCaptchaRequired:false,widgetSiteKeyConfigured:true}))assert.equal(gate.captchaPolicy.frontend?.[key],value);
  return gate;
}
export function readOwnedMatterGate(filename,env=process.env,now=Date.now()) {return assertGate(JSON.parse(fs.readFileSync(filename,'utf8')),env,now,true);}
export async function collectOwnedMatterPrerequisites({env=process.env,fetchImpl=fetch}={}) {
  const [databaseEvidence,runtime]=await Promise.all([readOwnedMatterDatabase({env,fetchImpl}),readClinicRuntimePrerequisites({env,fetchImpl})]);
  const checks=[...databaseEvidence.checks,...runtime.checks];const blockers=checks.filter(c=>!c.ok).map(c=>c.id);
  return {schema:'clinic_owned_matter_readonly/v1',status:blockers.length?'BLOCKED':'READY',matterId:OWNED_MATTER,projectRef:CLINIC_SETUP.project,applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,capturedAt:new Date().toISOString(),checks,blockers,preview:runtime.preview,captchaPolicy:runtime.captchaPolicy,databaseEvidence};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const dir=process.env.RCAP_BROWSER_EVIDENCE_DIR||'clinic-owned-matter-evidence';fs.mkdirSync(dir,{recursive:true});
  const gateFile=path.join(dir,'gate.json');
  if(process.argv.includes('--after')) {
    const before=assertGate(JSON.parse(fs.readFileSync(gateFile,'utf8')),process.env,Date.now(),false);
    const after=await readOwnedMatterDatabase();const unchanged=after.checks.every(c=>c.ok)&&before.databaseEvidence.businessFingerprint===after.businessFingerprint;
    fs.writeFileSync(path.join(dir,'business-state-after.json'),JSON.stringify({capturedAt:new Date().toISOString(),unchanged,after,authSessionEffects:'Normal authentication may create sessions; excluded from scoped business fingerprint'},null,2));
    assert.ok(unchanged,'Existing business state changed or verification failed; no retry');
  } else {
    const result=await collectOwnedMatterPrerequisites();fs.writeFileSync(gateFile,JSON.stringify(result,null,2));assertGate(result,process.env,Date.now(),true);
  }
}
