import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';import {RESUME,CHECKPOINT,classifyDeliveryCheckpoint,requireResumeAuthorization,exactSessionClosureSql,resumeSql,assertResumeBytes,RESUME_STAGES} from './rcap-clinic-resume-contract.mjs';import {startEphemeralPg} from './lib/rcap-ephemeral-pg.mjs';
const source=fs.readFileSync('scripts/rcap-clinic-resume-contract.mjs','utf8');
function pinnedEvents(n=3){return CHECKPOINT.eventIds.slice(0,n).map((id,i)=>({id,event_type:['delivery_authorized','transmission_started','transmission_completed'][i%3],actor_user_id:RESUME.owner,render_job_id:RESUME.job,request_context:{surface:'briefcase_download',userAgentClass:'desktop'},created_at:i<3?`2026-09-26T02:29:5${i}Z`:`2026-09-26T15:49:48.${i}00Z`}));}
const queueProof=()=>({partnerAdminDurableCaseVisible:true,exactCaseId:RESUME.clinicCase,eventStaffAuthorized:true,expiredAssistanceCaseHiddenFromEventStaff:true,eventStaffAuthUserId:CHECKPOINT.staff,adminAuthUserId:CHECKPOINT.admin});
function fixture(){const r=RESUME;return {job:{id:r.job,matter_id:r.matter,status:'delivered',attempt_count:1,accounting_result:'consumed',delivery_eligibility:'eligible',output_sha256:r.hash,normalized_output_sha256:r.normalizedHash,output_byte_count:r.bytes,page_count:r.pages,container_digest:r.priorDigest,credit_ledger_id:r.credit,sponsored_consumer_briefcase_item_id:r.item,sponsored_consumer_auth_user_id:r.owner,sponsored_session_id:r.session,sponsored_clinic_event_id:r.event,sponsored_verification_hash:r.verification,partner_id:r.partner,failure_disposition:null,error_code:null},item:{id:r.item,user_id:r.owner,source_session_id:r.session},session:{session_id:r.session,claimed_slot_state:'consumed',partner_slug:'mvl-demo'},case:{id:r.clinicCase,matter_id:r.item,screening_session_id:r.session,assisted_session_id:r.assisted,participant_user_id:r.owner,event_id:r.event,queue_status:'packet_ready',route_disposition:'packet'},assisted:{id:r.assisted,participant_user_id:r.owner,event_id:r.event,screening_session_id:r.session,status:'active',ended_at:null,ended_reason:null},verification:{status:'verified',verification_hash:r.verification,consumer_auth_user_id:r.owner,matter_id:r.matter},provenance:[{render_job_id:r.job,verification_hash:r.verification,consumer_auth_user_id:r.owner}],generation:[{id:'generated'}],credit:[{id:r.credit,event_type:'consumed'}],capacity:{allPartnerRows:[{consumed:1,packet_cap:2}],screening:{screenings_used:1,screenings_allowed:2},eventConsumed:1,event:{sponsorship_allocation:2}},sessionAudit:[],access:{uses_count:2,max_uses:2,is_active:true},claimable:[],housekeeping:[],delivery:pinnedEvents()};}
// The canonical closure as the database would leave it: status reset, one
// audit record naming the exact session, event and ORIGINAL owner.
const applyClosure=s=>{Object.assign(s.assisted,{status:'reset',ended_reason:'staff_reset',ended_at:'now'});s.sessionAudit.push({target_id:RESUME.assisted,event_id:RESUME.event,actor_user_id:RESUME.owner,action:'assisted_session_ended',target_type:'assisted_session',metadata:{reason:'staff_reset'}});};
const zeroStorage=()=>({localStorage:0,sessionStorage:0,indexedDB:0,caches:0,serviceWorkers:0});
const cleanReset=()=>({signOutConfirmed:true,cookies:0,storage:zeroStorage(),storageAfterEntryInit:zeroStorage(),survived:[],created:[],doNotTrack:'1',historySafe:true,revokedStatus:401,strangerId:RESUME.stranger,sameDeviceStranger:404,strangerMatchesMissing:true});
// Execute the actual orchestration with transport ports. Only fixed binary and
// separately-tested capacity guards are adapted to synthetic local fixtures.
const bytes=Buffer.from('%PDF-1.7\nresume fixture\n');
const text=source.replace(/^import .*;$/mg,'').replace(/export /g,'').replace(/export const /g,'const ');
const sandbox=()=>({assert:{...assert,deepEqual:(a,b,...rest)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),...rest)},Buffer,createHash:crypto.createHash,assertPacketCapacity:()=>({}),packetCapacitySql:()=>'',Date,Error});
const exported='\n({runResumeProof,assertResumeState,assertPageLoadUnchanged,assertRepeatDelivery,classifyResumeLifecycle,assertBrowserCleanupBeforeClosure})';
const controller=vm.runInNewContext(text+exported,sandbox());
// Use the real binary assertion as a refusal test; success-path controller uses
// an in-memory fixture identity, never a configurable hosted expected hash.
const localText=text.replace(`hash:'${RESUME.hash}'`,`hash:'${crypto.createHash('sha256').update(bytes).digest('hex')}'`).replace('bytes:68873','bytes:'+bytes.length);
const local=vm.runInNewContext(localText+exported,sandbox());
// One port set per test: a spy on the write port, a captured progress log, and
// overrides for the fault under test.
function ports(s,over={}){
 const calls={closures:0,progress:[],signIns:0};
 const p={sourceRun:'final-checkpoint',snapshot:async()=>structuredClone(s),requireSuccessorPreview:async()=>({deploymentId:CHECKPOINT.previewId}),signInOwner:async()=>{calls.signIns++;},observeBeforeMatter:async()=>{},openReadyMatter:async()=>{},downloadRequests:()=>0,explicitDownload:async()=>{throw Error('must never download');},proveDenials:async()=>({stranger:404,anonymous:401}),proveStaffQueuePrivacy:async()=>queueProof(),resetDevice:async()=>cleanReset(),finishBrowserActivity:async()=>({finished:true}),assertBrowserFinished:()=>({finished:true}),violations:()=>[],recordProgress:async entry=>{calls.progress.push(entry);},closeExactSession:async()=>{calls.closures++;applyClosure(s);},...over};
 return {p,calls};
}
const sixEventFixture=()=>{const s=fixture();s.delivery=pinnedEvents(6);return s;};
test('resume defaults read-only; exact project and BOTH explicit execution authorities',async()=>{assert.equal(requireResumeAuthorization({project:RESUME.project}),false);assert.throws(()=>requireResumeAuthorization({project:'wwtwtsmywnckfkdaqqeg'}));assert.throws(()=>requireResumeAuthorization({project:RESUME.project,execute:true}));assert.throws(()=>exactSessionClosureSql(RESUME.project,''));assert.throws(()=>assertResumeBytes(bytes));assert.ok((await resumeSql(RESUME.project)).startsWith('select '));});
test('immutable namespace and accounting drift fail closed',()=>{const s=fixture();controller.assertResumeState(s);for(const change of [x=>x.job.id='other',x=>x.job.attempt_count=2,x=>x.job.container_digest='other',x=>x.case.assisted_session_id='other',x=>x.credit.push({}),x=>x.access.uses_count=0,x=>x.housekeeping.push('other'),x=>x.claimable.push('other'),x=>x.verification.verification_hash='other']){const bad=structuredClone(s);change(bad);assert.throws(()=>controller.assertResumeState(bad));}const b=structuredClone(s);b.delivery.push({});assert.throws(()=>controller.assertPageLoadUnchanged(s,b));});
test('actual resume sequencing; automatic download and page-load accounting mutations stop before explicit action',async()=>{
 const run=async(mutate)=>{const s=fixture();s.job.output_sha256=crypto.createHash('sha256').update(bytes).digest('hex');s.job.output_byte_count=bytes.length;let count=0,clicked=0;const calls=[];
  const {p}=ports(s,{signInOwner:async()=>calls.push('sign-in'),observeBeforeMatter:async()=>calls.push('observe'),openReadyMatter:async()=>{calls.push('open');mutate?.(s,()=>count++);},downloadRequests:()=>count,explicitDownload:async()=>{clicked++;count++;s.delivery.push(...['delivery_authorized','transmission_started','transmission_completed'].map((event_type,i)=>({id:`repeat-${i}`,event_type})));return bytes;}});
  try{const receipt=await local.runResumeProof(p);assert.equal(receipt.passed,true);assert.deepEqual(calls,['sign-in','observe','open']);assert.equal(clicked,1);}catch(e){assert.equal(clicked,0);throw e;}};
 await run();await assert.rejects(run((s,hit)=>hit()));await assert.rejects(run(s=>s.credit.push({})));await assert.rejects(run(s=>s.delivery.push({})));
});
test('exact lost-cookie session closure uses canonical function, idempotent and preserves unrelated rows',()=>{
 const db=startEphemeralPg();try{db.sql(`create table clinic_assisted_sessions(id uuid primary key,event_id uuid,participant_user_id uuid,screening_session_id uuid,status text,ended_at timestamptz,ended_reason text);create table clinic_cases(id uuid,assisted_session_id uuid,matter_id uuid,screening_session_id uuid,participant_user_id uuid,event_id uuid,queue_status text);create table clinic_event_staff(event_id uuid,status text,permissions text[],partner_user_id uuid);create table partner_users(id uuid,auth_user_id uuid,status text,partner_slug text);create table clinic_events(id uuid,partner_slug text);create table clinic_event_audit(event_id uuid,actor_user_id uuid,action text,target_type text,target_id uuid,metadata jsonb);`);
 const canonical=fs.readFileSync('supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql','utf8');const start=canonical.indexOf('create or replace function public.clinic_end_assisted_session');db.sql(canonical.slice(start,canonical.indexOf('create or replace function public.clinic_upsert_case',start)));
 const r=RESUME;db.sql(`insert into clinic_assisted_sessions values('${r.assisted}','${r.event}','${r.owner}','${r.session}','active',null,null),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${r.event}','${r.owner}','${r.session}','active',null,null);insert into clinic_cases values('${r.clinicCase}','${r.assisted}','${r.item}','${r.session}','${r.owner}','${r.event}','packet_ready');`);
 const sql=exactSessionClosureSql(r.project,'Roger:clinic-resume:36211668984:close-exact-lost-cookie-session');db.sql(sql);db.sql(sql);assert.equal(db.scalar(`select status from clinic_assisted_sessions where id='${r.assisted}'`),'reset');assert.equal(db.scalar('select count(*) from clinic_event_audit'),'1');assert.equal(db.scalar("select status from clinic_assisted_sessions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'"),'active');
 // The canonical record carries the exact session, event and original owner; the contract's after-reset readback pins the same shape.
 assert.equal(db.scalar(`select actor_user_id::text from clinic_event_audit`),r.owner);assert.equal(db.scalar(`select action||'/'||target_type||'/'||target_id::text from clinic_event_audit`),`assisted_session_ended/assisted_session/${r.assisted}`);assert.equal(db.scalar(`select metadata->>'reason' from clinic_event_audit`),'staff_reset');
 db.sql(`update clinic_cases set matter_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'`);assert.throws(()=>db.sql(sql));
 }finally{db.stop();}
});
test('closure SQL names the exact pinned session and original owner, never Participant B',()=>{
 const sql=exactSessionClosureSql(RESUME.project,'Roger:clinic-resume:36211668984:close-exact-lost-cookie-session');
 assert.ok(sql.includes(`'${RESUME.assisted}'`)&&sql.includes(`'${RESUME.owner}'`));assert.ok(!sql.includes(RESUME.stranger));assert.match(sql,/clinic_end_assisted_session\(s\.id,s\.participant_user_id,'staff_reset'\)/);
});
test('read-only resume query parses against current packet/consumer schema without invoking lifecycle writers',async()=>{
 const {packetApplicationTestDatabase}=await import('./rcap-packet-database-reference.mjs');const db=packetApplicationTestDatabase(process.cwd());try{
 db.sql('create table clinic_assisted_sessions(id uuid);create table clinic_event_access_codes(id uuid);create table clinic_event_audit(target_id uuid,action text);');
 const row=db.json(await resumeSql(RESUME.project));assert.equal(row.job,null);assert.deepEqual(row.claimable,[]);assert.deepEqual(row.housekeeping,[]);
 }finally{db.stop();}
});
test('exact six-event checkpoint skips explicit download, asserts the browser before the one write, reads the reset back, and records every stage',async()=>{
 const s=sixEventFixture();const original=structuredClone(s.delivery);let downloads=0;
 const {p,calls}=ports(s,{downloadRequests:()=>downloads,explicitDownload:async()=>{downloads++;throw Error('must never download');},closeExactSession:async()=>{calls.closures++;assert.deepEqual(s.delivery,original);assert.equal(s.assisted.status,'active');applyClosure(s);}});
 const receipt=await controller.runResumeProof(p);
 assert.equal(downloads,0);assert.equal(calls.closures,1);assert.deepEqual(s.delivery,original);assert.equal(s.delivery.length,6);
 assert.deepEqual(calls.progress.map(e=>e.stage),['browser_checks_passed','closure_requested','closure_committed','readback_verified']);
 for(const stage of calls.progress.map(e=>e.stage))assert.ok(RESUME_STAGES.includes(stage));
 assert.deepEqual(JSON.parse(JSON.stringify(calls.progress[1])),{stage:'closure_requested',at:calls.progress[1].at,session:RESUME.assisted,actor:RESUME.owner,reason:'staff_reset',writeNotYetAttempted:true});
 assert.equal(calls.progress[0].browser.cookies,0);assert.equal(calls.progress[0].browser.violations,0);assert.equal(calls.progress[3].closureAudit.actor_user_id,RESUME.owner);
 assert.equal(receipt.checkpoint.state,'SUCCESSOR_EXPLICIT_DOWNLOAD_ALREADY_PROVEN');assert.equal(receipt.correctedExplicitDelivery.sourceRun,'36252986173');assert.equal(receipt.originalAccidentalDelivery.sourceRun,'36211668984');assert.equal(receipt.finalCheckpointRun.noNewPacketDownload,true);
 assert.equal(receipt.finalCheckpointRun.reset.closureActor,RESUME.owner);assert.equal(receipt.finalCheckpointRun.reset.closureAuditRecords,1);assert.equal(receipt.after.assisted.status,'reset');
});
test('every browser defect is asserted before the canonical closure and leaves the exact session unclosed',async()=>{
 const faults=[
  ['cookies',{resetDevice:async()=>({...cleanReset(),cookies:1})},/participant cookies survived/],
  ['storage after Back/Forward',{resetDevice:async()=>({...cleanReset(),storage:{...zeroStorage(),indexedDB:1}})},/browser storage not empty after Back\/Forward/],
  ['empty storage report',{resetDevice:async()=>({...cleanReset(),storage:{}})},/browser storage not empty after Back\/Forward/],
  ['storage after clean-entry initialization',{resetDevice:async()=>({...cleanReset(),storageAfterEntryInit:{...zeroStorage(),localStorage:3},created:['localStorage.le_vid','localStorage.le_sid','localStorage.le_sid_ts']})},/not empty after the clean entry initialized/],
  ['prior participant state survived',{resetDevice:async()=>({...cleanReset(),survived:['localStorage.rcap-resume-reset']})},/prior participant state survived/],
  ['survival unreported',{resetDevice:async()=>({...cleanReset(),survived:undefined})},/prior participant state survived/],
  ['opt-out not observed',{resetDevice:async()=>({...cleanReset(),doNotTrack:null})},/documented opt-out observed/],
  ['history',{resetDevice:async()=>({...cleanReset(),historySafe:false})},/Back\/Forward reached participant state/],
  ['signed-out owner served',{resetDevice:async()=>({...cleanReset(),revokedStatus:200})},/signed-out owner must be denied/],
  ['wrong Participant B identity',{resetDevice:async()=>({...cleanReset(),strangerId:RESUME.owner})},/exact Participant B/],
  ['Participant B not 404',{resetDevice:async()=>({...cleanReset(),sameDeviceStranger:401})},/Participant B must receive 404/],
  ['Participant B body differs from missing packet',{resetDevice:async()=>({...cleanReset(),strangerMatchesMissing:false})},/missing-packet response/],
  ['network violation',{violations:()=>['POST /api/analytics/other']},/forbidden request/],
  ['owner download replay',{downloadRequests:()=>0,resetDevice:async()=>cleanReset()},/owner download replay/,s=>s],
  ['browser exception',{resetDevice:async()=>{throw new Error('page.evaluate: Execution context was destroyed');}},/Execution context was destroyed/]
 ];
 for(const [label,over,pattern] of faults){
  const s=sixEventFixture();let downloads=0;
  const {p,calls}=ports(s,{...over,...(label==='owner download replay'?{downloadRequests:()=>downloads,resetDevice:async()=>{downloads++;return cleanReset();}}:{})});
  await assert.rejects(controller.runResumeProof(p),pattern,label);
  assert.equal(calls.closures,0,`${label}: closure must not run`);assert.equal(s.assisted.status,'active',label);assert.deepEqual(s.sessionAudit,[],label);
  const stages=calls.progress.map(e=>e.stage);assert.deepEqual(stages,[label==='browser exception'?'browser_reset_failed':'browser_checks_failed'],label);assert.ok(calls.progress[0].error,label);
 }
});
test('mutation control: deleting or moving the cleanup assertion lets a dirty device reach the canonical closure',async()=>{
 const line=" try{assertBrowserCleanupBeforeClosure(reset,{expectedDownloads:alreadyProven?0:1});}catch(error){await failAt('browser_checks_failed',error);}\n";
 const anchor=" try{await p.closeExactSession();}catch(error){await failAt('closure_response_lost',error);}\n";
 assert.ok(text.includes(line)&&text.includes(anchor),'mutation markers missing');
 const noFinal=text.replace("assertBrowserCleanupBeforeClosure({...cleanup,violations:p.violations(),downloadRequests:p.downloadRequests()},{expectedDownloads:alreadyProven?0:1});",'');const mutants={deleted:noFinal.replace(line,''),moved:noFinal.replace(line,'').replace(anchor,anchor+line)};
 for(const [label,mutated] of Object.entries(mutants)){
  assert.notEqual(mutated,text);const mutant=vm.runInNewContext(mutated+exported,sandbox());
  const s=sixEventFixture();const {p,calls}=ports(s,{resetDevice:async()=>({...cleanReset(),cookies:1})});
  await mutant.runResumeProof(p).catch(()=>{});
  assert.equal(calls.closures,1,`${label} mutant must reach the closure with a dirty device, proving the control is not vacuous`);
  const shipped=sixEventFixture();const real=ports(shipped,{resetDevice:async()=>({...cleanReset(),cookies:1})});
  await assert.rejects(controller.runResumeProof(real.p),/participant cookies survived/);assert.equal(real.calls.closures,0);
 }
});
test('database drift between the browser checks and the write refuses before the write',async()=>{
 const s=sixEventFixture();let snapshots=0;
 const {p,calls}=ports(s,{snapshot:async()=>{snapshots++;const copy=structuredClone(s);if(snapshots>=5)copy.delivery.push({id:'seventh'});return copy;}});
 const error=await controller.runResumeProof(p).then(()=>null,e=>e);assert.ok(error);assert.equal(error.resumeStage,'pre_closure_state_failed');
 assert.equal(calls.closures,0);assert.deepEqual(calls.progress.map(e=>e.stage),['pre_closure_state_failed']);
});
test('a committed closure with a lost response is recorded, classified by the read-only inventory, and never closed or downloaded again',async()=>{
 const s=sixEventFixture();
 const {p,calls}=ports(s,{closeExactSession:async()=>{calls.closures++;applyClosure(s);throw new Error('fetch failed: socket hang up');}});
 const error=await controller.runResumeProof(p).then(()=>null,e=>e);
 assert.ok(error);assert.equal(error.resumeStage,'closure_response_lost');assert.match(error.message,/socket hang up/);
 assert.equal(calls.closures,1);assert.deepEqual(calls.progress.map(e=>e.stage),['browser_checks_passed','closure_requested','closure_response_lost']);
 // The inventory distinguishes the reset checkpoint with its one audit record.
 assert.equal(controller.classifyResumeLifecycle(structuredClone(s)),'EXACT_RESET_CHECKPOINT');assert.equal(controller.classifyResumeLifecycle(sixEventFixture()),'EXACT_ACTIVE_CHECKPOINT');
 // A second execution refuses before any browser step, closure or download.
 let downloads=0;const again=ports(s,{explicitDownload:async()=>{downloads++;throw Error('never');}});
 await assert.rejects(controller.runResumeProof(again.p));assert.equal(again.calls.closures,0);assert.equal(again.calls.signIns,0);assert.equal(downloads,0);assert.equal(s.sessionAudit.length,1);
});
test('a committed closure followed by a failed readback or a failed evidence write is reported at its stage without a second closure',async()=>{
 const readback=sixEventFixture();let snapshots=0;
 const r1=ports(readback,{snapshot:async()=>{snapshots++;if(snapshots>=7)throw new Error('database query HTTP 502');return structuredClone(readback);}});
 const e1=await controller.runResumeProof(r1.p).then(()=>null,e=>e);assert.equal(e1?.resumeStage,'readback_failed');assert.equal(r1.calls.closures,1);assert.deepEqual(r1.calls.progress.map(e=>e.stage),['browser_checks_passed','closure_requested','closure_committed','readback_failed']);
 const evidence=sixEventFixture();
 const r2=ports(evidence,{recordProgress:async entry=>{r2.calls.progress.push(entry);if(entry.stage==='closure_committed')throw new Error('ENOSPC: no space left on device');}});
 const e2=await controller.runResumeProof(r2.p).then(()=>null,e=>e);assert.equal(e2?.resumeStage,'closure_committed');assert.equal(e2.evidenceWriteFailed,true);assert.equal(r2.calls.closures,1);assert.equal(evidence.assisted.status,'reset');
 const seventh=sixEventFixture();
 const r3=ports(seventh,{closeExactSession:async()=>{r3.calls.closures++;applyClosure(seventh);seventh.delivery.push({...seventh.delivery[5],id:'seventh'});}});
 const e3=await controller.runResumeProof(r3.p).then(()=>null,e=>e);assert.equal(e3?.resumeStage,'readback_failed');assert.match(e3.message,/delivery changed|exact three- or six-event|deepEqual|Expected values to be strictly deep-equal/);
 const foreignActor=sixEventFixture();
 const r4=ports(foreignActor,{closeExactSession:async()=>{r4.calls.closures++;applyClosure(foreignActor);foreignActor.sessionAudit[0].actor_user_id=RESUME.stranger;}});
 const e4=await controller.runResumeProof(r4.p).then(()=>null,e=>e);assert.equal(e4?.resumeStage,'readback_failed');assert.match(e4.message,/closure actor must be the original owner/);
});
test('lifecycle classification refuses mismatched session, owner, audit and checkpoint records',()=>{
 const reset=sixEventFixture();applyClosure(reset);assert.equal(controller.classifyResumeLifecycle(reset),'EXACT_RESET_CHECKPOINT');
 for(const mutate of [x=>x.sessionAudit[0].actor_user_id=RESUME.stranger,x=>x.sessionAudit.push(structuredClone(x.sessionAudit[0])),x=>x.sessionAudit=[],x=>x.sessionAudit[0].target_id='other',x=>x.sessionAudit[0].action='other',x=>x.sessionAudit[0].metadata.reason='security_reset',x=>x.assisted.status='ended',x=>x.assisted.ended_reason='other',x=>x.assisted.participant_user_id=RESUME.stranger,x=>x.assisted.id='other',x=>x.delivery=x.delivery.slice(0,5),x=>x.delivery[5].id='other',x=>x.job.id='other',x=>x.credit.push({}),x=>x.case.assisted_session_id='other']){const bad=structuredClone(reset);mutate(bad);assert.throws(()=>controller.classifyResumeLifecycle(bad));}
 const active=sixEventFixture();assert.equal(controller.classifyResumeLifecycle(active),'EXACT_ACTIVE_CHECKPOINT');
 for(const mutate of [x=>x.sessionAudit.push({}),x=>x.assisted.ended_at='now',x=>x.assisted.status='handed_off']){const bad=structuredClone(active);mutate(bad);assert.throws(()=>controller.classifyResumeLifecycle(bad));}
});
test('4, 5, 7 and non-pinned six-event checkpoints refuse; actors, context and run times are exact',()=>{
 const s=fixture();s.delivery=pinnedEvents(6);classifyDeliveryCheckpoint(s);
 for(const mutate of [x=>x.delivery=x.delivery.slice(0,4),x=>x.delivery=x.delivery.slice(0,5),x=>x.delivery.push(x.delivery[5]),x=>x.delivery[5].id='other',x=>x.delivery[3].actor_user_id=RESUME.stranger,x=>x.delivery[3].request_context.surface='other',x=>x.delivery[3].created_at='2026-09-27T00:00:00Z',x=>x.delivery.reverse()]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>classifyDeliveryCheckpoint(bad));}
});
test('six-event path refuses page-load, denial or queue changes before reset; queue proof and every port cannot be skipped',async()=>{
 for(const phase of ['open','denial','queue','missing-proof']){
 const s=sixEventFixture();
 const mutate=where=>{if(phase===where)s.delivery.push({id:'seventh'});};
 const {p,calls}=ports(s,{openReadyMatter:async()=>mutate('open'),proveDenials:async()=>{mutate('denial');return{stranger:404,anonymous:401};},proveStaffQueuePrivacy:async()=>{mutate('queue');return phase==='missing-proof'?undefined:queueProof();}});
 await assert.rejects(controller.runResumeProof(p));assert.equal(calls.closures,0);assert.deepEqual(calls.progress,[]);
 }
 for(const port of ['resetDevice','violations','recordProgress','closeExactSession']){const {p}=ports(sixEventFixture());delete p[port];await assert.rejects(controller.runResumeProof(p),new RegExp(`resume port ${port} required`));}
});
