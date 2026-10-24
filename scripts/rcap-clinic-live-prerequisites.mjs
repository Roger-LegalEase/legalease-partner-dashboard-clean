import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {resolveHostedVercelIdentity,hostedVercelScopedUrl} from './rcap-hosted-acceptance-vercel-identity.mjs';
import {previewRequestHeaders,readResumeCaptchaPolicy} from './rcap-clinic-resume-network-policy.mjs';
import {inspectShippedCaptcha} from './rcap-clinic-resume-captcha.mjs';
const worker='16908485a94f475448657cea90583a4d352da9a3';
const digest='sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af';
async function readJson(url,token,fetchImpl) {
  const response=await fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200);return response.json();
}
async function readPreview(env,fetchImpl) {
  const identity=await resolveHostedVercelIdentity({token:env.VERCEL_TOKEN,fetchImpl});
  const api=pathname=>readJson(hostedVercelScopedUrl(pathname,identity),env.VERCEL_TOKEN,fetchImpl);
  const [deployment,alias,aliases]=await Promise.all([
    api(`/v13/deployments/${CLINIC_SETUP.deploymentId}`),api(`/v13/deployments/${new URL(CLINIC_SETUP.origin).host}`),
    api(`/v2/deployments/${CLINIC_SETUP.deploymentId}/aliases`)
  ]);
  assert.equal(deployment.id??deployment.uid,CLINIC_SETUP.deploymentId);assert.equal(alias.id??alias.uid,CLINIC_SETUP.deploymentId);
  assert.equal(deployment.readyState??deployment.status,'READY');assert.ok([null,'preview'].includes(deployment.target));
  assert.equal(deployment.projectId,identity.projectId);assert.equal(deployment.gitSource?.sha,CLINIC_SETUP.app);
  for(const [key,value] of Object.entries({rcapApplicationSha:CLINIC_SETUP.app,rcapAcceptanceProjectRef:CLINIC_SETUP.project,
    rcapWorkerSourceSha:worker,rcapWorkerDigest:digest,rcapRouteState:'disabled',rcapClinicDemoMode:'none',rcapStripeConfigured:'false',
    rcapStagingScopeSha256:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}))assert.equal(deployment.meta?.[key],value);
  assert.ok(Array.isArray(aliases.aliases));assert.ok(!aliases.aliases.some(a=>a.target==='production'||a.deployment?.target==='production'));
  return {previewVerified:true,deploymentId:CLINIC_SETUP.deploymentId,hostname:new URL(CLINIC_SETUP.origin).hostname,
    applicationSha:CLINIC_SETUP.app,workerSourceSha:worker,workerDigest:digest,acceptanceProjectRef:CLINIC_SETUP.project,
    routeState:'disabled',clinicDemoMode:'none',stagingScopeSha256:deployment.meta.rcapStagingScopeSha256,stripeConfigured:false,productionAliasCount:0};
}
async function readFrontend(env,fetchImpl) {
  const read=async address=>{
    const url=new URL(address,CLINIC_SETUP.origin);assert.equal(url.origin,CLINIC_SETUP.origin);
    const response=await fetchImpl(url.href,{headers:previewRequestHeaders(env.VERCEL_AUTOMATION_BYPASS_SECRET),redirect:'error',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200);const body=await response.text();assert.ok(body.length<10000000);return body;
  };
  const html=await read('/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase');
  const urls=[...new Set([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'))
    .filter(address=>address.startsWith('/_next/static/')&&new URL(address,CLINIC_SETUP.origin).pathname.endsWith('.js')))];
  assert.ok(urls.length>0&&urls.length<=100);
  const chunks=[];for(const address of urls)chunks.push({body:await read(address)});
  return {...inspectShippedCaptcha(chunks),applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId};
}
export async function collectClinicLivePrerequisites({env=process.env,fetchImpl=fetch,querySql,qualifyDatabase}) {
  const checks=[];let preview=null,captchaPolicy=null;
  const add=(id,ok,reason)=>checks.push({id,ok,reason:ok?null:reason});
  const database=async()=>{
    try {
      assert.ok(env.SUPABASE_ACCESS_TOKEN);assert.match(querySql,/begin transaction read only;/i);
      const response=await fetchImpl(`https://api.supabase.com/v1/projects/${CLINIC_SETUP.project}/database/query`,{
        method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},
        body:JSON.stringify({query:querySql,read_only:true}),redirect:'error',signal:AbortSignal.timeout(30000)});
      assert.equal(response.status,200);const rows=await response.json();assert.ok(Array.isArray(rows)&&rows.length===1);
      const result=qualifyDatabase({catalog:rows[0].clinic_known_compatibility_prerequisites,projectRef:CLINIC_SETUP.project,appSha:CLINIC_SETUP.app});
      assert.ok(Array.isArray(result.checks)&&result.checks.length>0);checks.push(...result.checks);
      const inventory=result.operational?.existing_code_inventory;
      add('normal_code_issuance_inventory',result.operational?.codeIssuanceRequired===true&&Array.isArray(inventory)&&inventory.length===1
        &&inventory[0].id==='77000000-0000-4000-8000-000000000057'&&inventory[0].uses_count===2&&inventory[0].max_uses===2,
        'code_inventory_requires_reconciliation_before_auth');
      add('database_complete_compatibility',result.status==='READY'&&result.blockers?.length===0,'database_requirements_blocked');
    } catch {add('database_complete_compatibility',false,'database_read_or_contract_unproven');}
  };
  await Promise.all([database(),(async()=>{
    try {preview=await readPreview(env,fetchImpl);add('exact_current_preview',true);}catch{add('exact_current_preview',false,'preview_identity_unproven');}
    if(!preview){add('shipped_and_server_captcha',false,'preview_required_before_shipped_read');return;}
    try {
      assert.ok(env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim());const frontend=await readFrontend(env,fetchImpl);
      captchaPolicy={...await readResumeCaptchaPolicy({project:CLINIC_SETUP.project,token:env.SUPABASE_ACCESS_TOKEN,frontend,fetchImpl}),syntheticProfile:'clinic_setup_only'};
      add('shipped_and_server_captcha',true);
    } catch {add('shipped_and_server_captcha',false,'required_or_unknown_captcha_cannot_be_bypassed');}
  })()]);
  return {schemaVersion:'clinic_setup_live_readonly_prerequisites/v1',status:checks.length>0&&checks.every(c=>c.ok===true)?'READY':'BLOCKED',
    projectRef:CLINIC_SETUP.project,applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,
    controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,capturedAt:new Date().toISOString(),
    checks,blockers:checks.filter(c=>c.ok!==true),preview,captchaPolicy};
}
export function readCurrentClinicGate(filename,env=process.env,now=Date.now()) {
  const gate=JSON.parse(fs.readFileSync(filename,'utf8'));
  assert.equal(gate.schemaVersion,'clinic_setup_live_readonly_prerequisites/v1');assert.equal(gate.status,'READY');
  assert.equal(gate.projectRef,CLINIC_SETUP.project);assert.equal(gate.applicationSha,CLINIC_SETUP.app);assert.equal(gate.deploymentId,CLINIC_SETUP.deploymentId);
  for(const [key,value] of Object.entries({controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT}))assert.ok(value&&gate[key]===value,'live gate must belong to this exact runner');
  assert.ok(now-Date.parse(gate.capturedAt)>=0&&now-Date.parse(gate.capturedAt)<300000,'live prerequisite result must be fresh');
  assert.ok(gate.checks.length>0&&gate.checks.every(c=>c.ok===true)&&gate.blockers.length===0);
  for(const id of ['database_complete_compatibility','normal_code_issuance_inventory','exact_current_preview','shipped_and_server_captcha'])assert.ok(gate.checks.some(c=>c.id===id&&c.ok));
  assert.equal(gate.preview?.previewVerified,true);assert.equal(gate.preview.deploymentId,CLINIC_SETUP.deploymentId);
  assert.equal(gate.captchaPolicy?.project,CLINIC_SETUP.project);assert.equal(gate.captchaPolicy.frontend?.applicationSha,CLINIC_SETUP.app);
  assert.equal(gate.captchaPolicy.frontend?.deploymentId,CLINIC_SETUP.deploymentId);assert.equal(gate.captchaPolicy?.serverCaptchaRequired,false);assert.equal(gate.captchaPolicy?.frontend?.clientCaptchaRequired,false);assert.equal(gate.captchaPolicy.frontend.widgetSiteKeyConfigured,true);
  return gate;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const output=path.resolve(process.env.RCAP_BROWSER_EVIDENCE_DIR??'clinic-setup-only-evidence');fs.mkdirSync(output,{recursive:true});
  try {
    const {CLINIC_PREREQUISITE_SQL,qualifyClinicDatabasePrerequisites}=await import('./lib/rcap-clinic-database-prerequisites.mjs');
    const gate=await collectClinicLivePrerequisites({querySql:CLINIC_PREREQUISITE_SQL,qualifyDatabase:qualifyClinicDatabasePrerequisites});
    fs.writeFileSync(path.join(output,'clinic-live-prerequisites.json'),JSON.stringify(gate,null,2)+'\n');
    if(gate.status!=='READY')process.exitCode=1;
  } catch {fs.writeFileSync(path.join(output,'clinic-live-prerequisites.json'),JSON.stringify({status:'BLOCKED',blockers:[{id:'prerequisite_contract',reason:'unavailable'}]})+'\n');process.exitCode=1;}
}
