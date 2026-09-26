import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import vm from 'node:vm';
import {once} from 'node:events';
import {RESUME,resumeSql,requireResumeAuthorization,exactSessionClosureSql} from './rcap-clinic-resume-contract.mjs';

const source=fs.readFileSync(new URL('./rcap-hosted-clinic-resume.mjs',import.meta.url),'utf8');
// Execute the shipped helper with real fetch/HTTP response parsing. Only the
// destination is redirected to a loopback server; no remote query is executed.
const helper=source.slice(source.indexOf('async function query('),source.indexOf('\nconst snapshot='));
async function transport(run,code=helper){
 const requests=[];let status=200,body='[]';
 const server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;requests.push(JSON.parse(raw));res.writeHead(status,{'content-type':'application/json'});res.end(body);});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const query=vm.runInNewContext(`(${code})`,{assert,project:RESUME.project,token:'synthetic',fetch:(url,options)=>{assert.equal(url,`https://api.supabase.com/v1/projects/${RESUME.project}/database/query`);assert.equal(options.method,'POST');return fetch(`http://127.0.0.1:${server.address().port}`,options);}});
 try{await run({query,requests,respond:(s,b)=>{status=s;body=b;}});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
for(const status of [200,201])test(`HTTP ${status} valid array succeeds; snapshot request remains read_only`,()=>transport(async({query,requests,respond})=>{
 respond(status,'[{"evidence":{}}]');const sql=await resumeSql(RESUME.project);const rows=await query(sql);assert.equal(rows.length,1);assert.deepEqual(requests,[{query:sql,read_only:true}]);
}));
for(const [status,body,label]of [[204,'','empty JSON'],[400,'[]','bad request'],[401,'[]','unauthorized'],[500,'[]','server error'],[201,'{broken','malformed JSON'],[201,'{}','non-array object'],[200,'null','non-array null']])test(`HTTP ${status} ${label} refuses`,()=>transport(async({query,respond})=>{
 respond(status,body);await assert.rejects(query('select 1'));
}));
test('only the separately authorized exact closure sends read_only=false; SQL guards remain intact',()=>transport(async({query,requests,respond})=>{
 assert.match(source,/const closureSql=execute\?exactSessionClosureSql/);
 assert.ok(source.indexOf('const closureSql=')<source.indexOf("const token=env("));
 assert.match(source,/closeExactSession:async\(\)=>\{await query\(closureSql,false\);\}/);
 assert.equal((source.match(/query\([^\n]*?,false\)/g)||[]).length,1);
 // The write port is reached only after the contract has asserted every browser
 // result and recorded the pre-closure stage; the harness never calls it itself.
 const contract=fs.readFileSync(new URL('./rcap-clinic-resume-contract.mjs',import.meta.url),'utf8');
 // Each marker must be present exactly once before its position means anything;
 // an absent marker would otherwise compare as -1 and pass vacuously.
 const position=marker=>{const first=contract.indexOf(marker);assert.ok(first>=0,`contract marker missing: ${marker}`);assert.equal(contract.indexOf(marker,first+1),-1,`contract marker not unique: ${marker}`);return first;};
 const order=['assertBrowserCleanupBeforeClosure(reset,',"record('browser_checks_passed'","record('closure_requested'",'await p.closeExactSession()',"record('closure_committed'","assertResumeState(after,{afterReset:true})","record('readback_verified'"].map(position);
 for(let i=1;i<order.length;i++)assert.ok(order[i-1]<order[i],`contract ordering broken before marker ${i}`);
 assert.equal((source.match(/closeExactSession/g)||[]).length,1);
 // The harness's final write and outer catch go through the factored functions
 // the browser-reset suite exercises, with the recorded stages and the phase.
 assert.match(source,/finishResume\(\{receipt,assertNoViolations:\(\)=>assert\.deepEqual\(violations,\[\],'resume attempted a forbidden request'\),resultPath:[^\n]*setPhase:next=>\{phase=next;\}\}\)/);
 assert.match(source,/resumeFailureRecord\(\{error,stages:progress\.map\(s=>s\.stage\),phase,redact\}\)/);
 assert.match(source,/writeResumeFailureRecord\(\{failure,failurePath:[^\n]*emit:console\.error,redact\}\);\n throw error;/);
 assert.match(source,/expectedStrangerId:RESUME\.stranger/);
 // The documented analytics opt-out is installed on every context before any
 // application script, and the pre-reset inventory is taken before the server reset.
 assert.match(source,/async function context\(\)\{const c=await browser\.newContext\(\{acceptDownloads:true\}\);await applyAnalyticsOptOut\(c\);/);
 assert.match(source,/const priorState=await storageInventory\(page\);await serverReset\(page\);/);
 assert.match(source,/analyticsProfile:ANALYTICS_OPT_OUT_PROFILE/);
 for(const authorization of [undefined,'wrong'])assert.throws(()=>exactSessionClosureSql(RESUME.project,authorization));
 assert.throws(()=>requireResumeAuthorization({project:RESUME.project,execute:true,authorization:'wrong'}));
 assert.equal(requests.length,0);
 requireResumeAuthorization({project:RESUME.project,execute:true,authorization:'Roger:clinic-resume:36211668984:explicit-download-and-device-reset'});
 const sql=exactSessionClosureSql(RESUME.project,'Roger:clinic-resume:36211668984:close-exact-lost-cookie-session');
 for(const marker of [RESUME.assisted,RESUME.owner,RESUME.event,RESUME.session,RESUME.clinicCase,'resume session identity drift','resume case drift','resume session lifecycle drift','clinic_end_assisted_session'])assert.ok(sql.includes(marker));
 respond(201,'[]');await query(sql,false);assert.deepEqual(requests,[{query:sql,read_only:false}]);
 respond(401,'[]');await assert.rejects(query(sql,false),/HTTP 401/);
}));
// The shipped harness itself, spawned against a loopback Management API that
// serves a complete synthetic namespace: the read-only inventory distinguishes
// the exact active checkpoint from the exact already-reset checkpoint with its
// one matching audit record, refuses a drifted record, and execute mode refuses
// the reset checkpoint before any browser or credential requirement. The fake
// API throws on any non-read-only query, so a write attempt would surface.
test('spawned harness: read-only inventory classifies active and reset checkpoints; execute refuses a second lifecycle transition',async()=>{
 const {default:os}=await import('node:os');const {default:path}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const {ENTITLEMENT_ID,PARTNER_ID,EVENT_ID,NOTE,clinicAllowance}=await import('./rcap-clinic-packet-capacity.mjs');const {CHECKPOINT}=await import('./rcap-clinic-resume-contract.mjs');
 const r=RESUME;const events=CHECKPOINT.eventIds.map((id,i)=>({id,event_type:['delivery_authorized','transmission_started','transmission_completed'][i%3],actor_user_id:r.owner,render_job_id:r.job,request_context:{surface:'briefcase_download',userAgentClass:'desktop'},created_at:i<3?`2026-09-26T02:29:5${i}Z`:`2026-09-26T15:49:48.${i}00Z`}));
 const active={job:{id:r.job,matter_id:r.matter,status:'delivered',attempt_count:1,accounting_result:'consumed',delivery_eligibility:'eligible',output_sha256:r.hash,normalized_output_sha256:r.normalizedHash,output_byte_count:r.bytes,page_count:r.pages,container_digest:r.priorDigest,credit_ledger_id:r.credit,sponsored_consumer_briefcase_item_id:r.item,sponsored_consumer_auth_user_id:r.owner,sponsored_session_id:r.session,sponsored_clinic_event_id:r.event,sponsored_verification_hash:r.verification,partner_id:r.partner,failure_disposition:null,error_code:null},item:{id:r.item,user_id:r.owner,source_session_id:r.session},session:{session_id:r.session,claimed_slot_state:'consumed',partner_slug:'mvl-demo'},case:{id:r.clinicCase,matter_id:r.item,screening_session_id:r.session,assisted_session_id:r.assisted,participant_user_id:r.owner,event_id:r.event,queue_status:'packet_ready',route_disposition:'packet'},assisted:{id:r.assisted,participant_user_id:r.owner,event_id:r.event,screening_session_id:r.session,status:'active',ended_at:null,ended_reason:null},verification:{status:'verified',verification_hash:r.verification,consumer_auth_user_id:r.owner,matter_id:r.matter},provenance:[{render_job_id:r.job,verification_hash:r.verification,consumer_auth_user_id:r.owner}],generation:[{id:'generated'}],credit:[{id:r.credit,event_type:'consumed'}],
  capacity:{allPartnerRows:[{id:ENTITLEMENT_ID,partner_id:PARTNER_ID,entitlement_scope:'sponsored_packets',active:true,expires_at:null,contract_note:NOTE,overage_enabled:false,overage_cap:0,pause_at_cap:true,overageConsumed:0,packet_cap:2,consumed:1}],screening:{partner_slug:'mvl-demo',pause_at_cap:true,overage_enabled:false,screenings_allowed:2,screenings_used:1},event:{id:EVENT_ID,partner_slug:'mvl-demo',status:'published',sponsorship_allocation:clinicAllowance()},eventConsumed:1},
  sessionAudit:[],access:{uses_count:2,max_uses:2,is_active:true},claimable:[],housekeeping:[],delivery:events};
 const reset=structuredClone(active);Object.assign(reset.assisted,{status:'reset',ended_reason:'staff_reset',ended_at:'2026-09-26T18:00:00Z'});reset.sessionAudit=[{target_id:r.assisted,event_id:r.event,actor_user_id:r.owner,action:'assisted_session_ended',target_type:'assisted_session',metadata:{reason:'staff_reset'}}];
 const drift=structuredClone(reset);drift.sessionAudit[0].actor_user_id=r.stranger;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-resume-inventory-'));
 try{
  fs.writeFileSync(path.join(dir,'api.mjs'),`import fs from 'node:fs';globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(!String(url).startsWith('https://api.supabase.com/v1/projects/${RESUME.project}/database/query'))throw new Error('unexpected fetch');if(body.read_only!==true)throw new Error('WRITE ATTEMPTED');return new Response(fs.readFileSync(process.env.FAKE_INVENTORY,'utf8'),{status:200,headers:{'content-type':'application/json'}});};`);
  const run=(state,args=[])=>{const fixture=path.join(dir,'inventory.json');fs.writeFileSync(fixture,JSON.stringify([{evidence:state}]));return spawnSync(process.execPath,['--import',path.join(dir,'api.mjs'),'scripts/rcap-hosted-clinic-resume.mjs','--project',RESUME.project,...args],{encoding:'utf8',env:{...process.env,SUPABASE_ACCESS_TOKEN:'synthetic',FAKE_INVENTORY:fixture,RCAP_BROWSER_BASE_URL:'',HOSTED_CLINIC_DEMO_PASSWORD:''}});};
  const execute=['--execute','--owner-authorization','Roger:clinic-resume:36211668984:explicit-download-and-device-reset','--session-closure-authorization','Roger:clinic-resume:36211668984:close-exact-lost-cookie-session'];
  const activeInventory=run(active);assert.equal(activeInventory.status,0,activeInventory.stderr);const a=JSON.parse(activeInventory.stdout);assert.equal(a.mode,'READ_ONLY');assert.equal(a.lifecycle,'EXACT_ACTIVE_CHECKPOINT');assert.equal(a.acceptance,false);assert.equal(a.secondLifecycleTransitionPermitted,false);
  const resetInventory=run(reset);assert.equal(resetInventory.status,0,resetInventory.stderr);const b=JSON.parse(resetInventory.stdout);assert.equal(b.lifecycle,'EXACT_RESET_CHECKPOINT');assert.equal(b.acceptance,false);assert.equal(b.secondLifecycleTransitionPermitted,false);
  const drifted=run(drift);assert.notEqual(drifted.status,0);assert.match(drifted.stderr,/closure actor must be the original owner/);
  const secondTransition=run(reset,execute);assert.notEqual(secondTransition.status,0);assert.match(secondTransition.stderr,/exact checkpoint already reset: no second lifecycle transition/);assert.doesNotMatch(secondTransition.stderr,/WRITE ATTEMPTED|RCAP_BROWSER_BASE_URL/);
  const activeExecute=run(active,execute);assert.notEqual(activeExecute.status,0);assert.match(activeExecute.stderr,/RCAP_BROWSER_BASE_URL required/);assert.doesNotMatch(activeExecute.stderr,/WRITE ATTEMPTED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('mutation control: restoring exact HTTP 200 rejects the same real HTTP 201 response',async()=>{
 const mutant=helper.replace('assert.ok(response.ok,','assert.equal(response.status,200,');assert.notEqual(mutant,helper);
 await transport(async({query,respond})=>{respond(201,'[]');await assert.rejects(query('select 1'),/database query HTTP 201/);},mutant);
});
