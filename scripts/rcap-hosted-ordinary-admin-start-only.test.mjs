import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectStartOnlyResponse,START_ONLY,admitStartOnlyTarget,qualifyRetainedStartProof,assertStartOnlyPrestate,createStartOnlyGate,runOrdinaryStartOnly,createStartOnlyBrowserIo} from './rcap-hosted-ordinary-admin-start-only.mjs';
import {ROOT,SLUG,AUTHORITY} from './rcap-hosted-ordinary-admin-postprovision.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function retained(){
 const materials=[{type:'co_branded_page_configuration',hash:'3d1250399ba18f80283255bb021cd650b8a126a12b980d85eb9fd18286633388',version:1,sourceVersion:5,approved:true,generated:true,notDrifted:true,notSuperseded:true,partnerApproved:false},{type:'implementation_brief',hash:'2ba6a142d46d43ba79ca3ad9623c031c99ca345aa8eabeabb88df371b62f9c47',version:1,sourceVersion:5,approved:true,generated:true,notDrifted:true,notSuperseded:true,partnerApproved:false}];
 const review={sourceVersion:5,matchedMaterialCount:2,materialVersions:[1,1],materialHashes:materials.map(m=>m.hash),renderedTextHashes:['a'.repeat(64),'b'.repeat(64)]};
 const p={readOnly:'on',observedAt:new Date().toISOString(),workspace:{status:'commercially_blocked',managed:true,version:5,launched:false,hasLaunchOperation:false},currentMaterials:materials,screeningCapacity:{used:0,allowed:1,remaining:1},packetCapTotal:1,packetReservedOrConsumed:0,exactMsJurisdiction:true,childReviewHasExpectedJurisdictions:true,sponsoredServiceMode:true,originalStartRequestSteps:[]};
 for(const k of ['exactWorkspaceCount','originalOnePlusOneReceiptCount','childReviewRowCount','childReviewExactApprovedCount','allFinalReviewCount'])p[k]=1;
 for(const k of ['childReviewArtifactReviews','childReviewExactMaterialCount','submittedTwoHashesCurrentCount','artifactVersionCount'])p[k]=2;
 for(const k of ['launchReceiptCount','launchCompleteCount','launchPreparedCount','ordinaryRegistrationCount','ordinaryExactMsRegistrationCount','originalStartRequestJournalCount'])p[k]=0;
 return{before:{stage:'start_before_forward',applicationSha:'c0052e13d9801d24080275aab02c70c6ea213fa3',deploymentId:'dpl_BAxSvMXJCJqUAxATgpZgANAjZhjt',exactExistingAdmin:true,request:{stage:'start',requestId:START_ONLY.requestId,payloadHash:START_ONLY.payloadHash,expectedVersion:5,review}},review:{stage:'actual_current_material_dom_review',review},poststate:[{ordinary_start_404538_poststate:p}]};
}
function gateFixture(checkpoint=async()=>{}){
 const plan={kind:'operation',stage:'start',endpoint:ROOT+'/program',body:{action:'start',version:5,scopeHash:'a'.repeat(64),reviewToken:'PRIVATE_FIXTURE_TOKEN',confirmed:true,requestId:null}};
 const request={url:START_ONLY.origin+plan.endpoint,method:'POST',originHeader:START_ONLY.origin,body:{...plan.body,requestId:START_ONLY.requestId}};
 const pending={stage:'start',requestId:START_ONLY.requestId,payloadHash:hash(JSON.stringify(request.body))};
 return{gate:createStartOnlyGate(plan,pending,checkpoint),plan,request,pending};
}
test('retained404538 semantic guards preserve v5, original d8 request, two materials and two reviews',()=>{
 const p=retained();qualifyRetainedStartProof(p);
 for(const mutate of [x=>x.before.request.requestId='00000000-0000-4000-8000-000000000001',x=>x.before.request.payloadHash='0'.repeat(64),x=>x.before.request.expectedVersion=6,x=>x.review.review.materialHashes[0]='0'.repeat(64),x=>x.poststate[0].ordinary_start_404538_poststate.childReviewArtifactReviews=3]){const x=structuredClone(p);mutate(x);assert.throws(()=>qualifyRetainedStartProof(x));}
});
test('fresh prestate refuses any earlier launch, usage, material drift or duplicate review',()=>{
 const old=retained().poststate[0].ordinary_start_404538_poststate;
 for(const mutate of [x=>x.workspace.version=6,x=>x.workspace.launched=true,x=>x.screeningCapacity.used=1,x=>x.packetReservedOrConsumed=1,x=>x.childReviewRowCount=2,x=>x.launchPreparedCount=1,x=>x.ordinaryRegistrationCount=1,x=>x.currentMaterials[0].hash='0'.repeat(64)]){const x=structuredClone(old);mutate(x);assert.throws(()=>assertStartOnlyPrestate(x,old));}
});
test('exact origin normalizes only after validation; gate binds request id/body hash before one forward',async()=>{
 const calls=[];const f=gateFixture(async witness=>calls.push(witness));await f.gate(f.request);assert.equal(calls.length,1);assert.equal(calls[0].requestId,START_ONLY.requestId);assert.equal(calls[0].payloadHash,f.pending.payloadHash);assert.ok(!JSON.stringify(calls).includes('PRIVATE_FIXTURE_TOKEN'));await assert.rejects(()=>f.gate(f.request));
 for(const mutate of [x=>x.url=x.url.replace('managed-9aadacd0c5a7','managed-c0052e13d980'),x=>x.originHeader='https://other.vercel.app',x=>x.method='GET',x=>x.body.action='prepare',x=>x.body.action='review',x=>x.body.version=6,x=>x.body.requestId='00000000-0000-4000-8000-000000000001']){const f=gateFixture();const r=structuredClone(f.request);mutate(r);await assert.rejects(()=>f.gate(r));}
});
test('a failed prewrite checkpoint prevents subsequent use of the same Start gate',async()=>{
 const f=gateFixture(async()=>{throw Error('private evidence unavailable');});await assert.rejects(()=>f.gate(f.request));await assert.rejects(()=>f.gate(f.request));
});
function ioFixture(proof,{badTarget=false,stale=false,missingMaterials=false}={}){
 const calls=[];const id='00000000-0000-4000-8000-000000000001';
 const configuration={workspaceId:id,partnerSlug:SLUG,version:5,operatingModel:'legalease_managed',policyVersion:'rcap2.2',status:'commercially_blocked',data:{program_goals:{operating_model:'legalease_managed',service_mode:'sponsored_packets',participation_mode:'online',external_agreement_applicability:'not_applicable',operator_authority_reference:AUTHORITY},geography_audience_language_accessibility:{jurisdictions:['MS'],enable_spanish:false},access_sponsorship_capacity:{participant_access_model:'open'}}};
 const operations={identity:{workspaceId:id,partnerSlug:SLUG,version:5,policyVersion:'rcap2.2'},view:{partnerSlug:SLUG,version:5,decision:{live:false,scopeHash:'a'.repeat(64)},commercial:{screenings:1,packets:1},materials:missingMaterials?[]:proof.poststate[0].ordinary_start_404538_poststate.currentMaterials.map((m,i)=>({...m,id:`00000000-0000-4000-8000-00000000000${i+2}`})),reviewToken:'PRIVATE_TOKEN',capabilities:{issue_sponsored_packet:false}},canStart:true,launchDecision:{sourceVersion:5}};
 const io={admitSourceTarget:async expected=>{calls.push('admit');assert.equal(expected.applicationSha,START_ONLY.app);return{applicationSha:badTarget?'0'.repeat(40):START_ONLY.app,origin:START_ONLY.origin,deploymentId:'dpl_FutureExactNative',nativeCreatorVerified:true,sourceBound:true};},signInExistingAdminOnce:async()=>{calls.push('auth');return START_ONLY.admin;},readProtectedPoststate:async()=>{calls.push('protectedRead');const p=structuredClone(proof.poststate[0].ordinary_start_404538_poststate);if(stale)p.observedAt='2020-01-01T00:00:00Z';return p;},readCurrentProgram:async()=>{calls.push('programRead');return{configuration,operations};},readMaterialDom:async()=>{calls.push('DOM');throw Error('No actual DOM fixture or operation');},checkpoint:async()=>calls.push('checkpoint'),forwardNormalStart:async()=>{calls.push('forward');throw Error('No actual provider fixture');}};
 return{io,calls};
}
test('wrong future native target stops before normal admin authentication',async()=>{
 const proof=retained(),{io,calls}=ioFixture(proof,{badTarget:true});await assert.rejects(()=>runOrdinaryStartOnly({retained:proof},io));assert.deepEqual(calls,['admit']);
});
test('stale protected state stops before program review or Start',async()=>{
 const proof=retained(),{io,calls}=ioFixture(proof,{stale:true});await assert.rejects(()=>runOrdinaryStartOnly({retained:proof},io));assert.deepEqual(calls,['admit','auth','protectedRead']);
});
test('missing materials refuse instead of delegating backward to prepare/review/configure',async()=>{
 const proof=retained(),{io,calls}=ioFixture(proof,{missingMaterials:true});await assert.rejects(()=>runOrdinaryStartOnly({retained:proof},io));assert.deepEqual(calls,['admit','auth','protectedRead','programRead']);
});
test('normal browser guard refuses prepare/review/allocation and the old host; bypass stays off Supabase Auth',async()=>{
 let guard;const context={route:async(_pattern,fn)=>{guard=fn;},addInitScript:async()=>{}};
 await createStartOnlyBrowserIo({context,admitSourceTarget:async()=>{},readProtectedPoststate:async()=>{},checkpoint:async()=>{},bypass:'PRIVATE_EXISTING_BYPASS',credentialReader:()=>assert.fail('no credentials during guard construction')});
 async function request(url,method='GET',body=null){let answer;await guard({request:()=>({url:()=>url,method:()=>method,headers:()=>({'x-vercel-protection-bypass':'INHERITED',origin:START_ONLY.origin}),postDataJSON:()=>body}),abort:async()=>{answer={blocked:true};},continue:async options=>{answer={blocked:false,...options};}});return answer;}
 for(const action of ['prepare','review','start'])assert.equal((await request(START_ONLY.origin+ROOT+'/program','POST',{action})).blocked,true);
 assert.equal((await request('https://legalease-rcap-managed-c0052e13d980-roger947s-projects.vercel.app/api/rcap/release')).blocked,true);
 const release=await request(START_ONLY.origin+'/api/rcap/release');assert.equal(release.blocked,false);assert.equal(release.headers['x-vercel-protection-bypass'],'PRIVATE_EXISTING_BYPASS');
 const auth='https://hyflxnlhpmiqxvvcoiia.supabase.co/auth/v1/token?grant_type=password';const a=await request(auth,'POST');assert.equal(a.blocked,false);assert.equal(a.headers['x-vercel-protection-bypass'],undefined);assert.equal((await request(auth,'POST')).blocked,true);
});
test('failed creator admission prevents even the runtime page and any credential read',async()=>{
 let pages=0;const context={route:async()=>{},addInitScript:async()=>{},newPage:async()=>{pages++;assert.fail('no page before creator admission');}};
 const io=await createStartOnlyBrowserIo({context,admitSourceTarget:async()=>({applicationSha:START_ONLY.app,origin:START_ONLY.origin,nativeCreatorVerified:false}),readProtectedPoststate:async()=>{},checkpoint:async()=>{},bypass:'PRIVATE_EXISTING_BYPASS',credentialReader:()=>assert.fail('no credentials before admission')});
 await assert.rejects(()=>io.admitSourceTarget({}));assert.equal(pages,0);
});
function creatorFixture(){
 const binding={runId:99999999999,carrierSha:'a'.repeat(40),deploymentId:'dpl_FutureNative'};
 const creatorRun={id:binding.runId,workflow_id:332448793,head_sha:binding.carrierSha,head_branch:'codex/f-vercel-raw-readonly-20261026',run_attempt:1,event:'workflow_dispatch',status:'completed',conclusion:'success',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'}};
 const metadata={rcapApplicationSha:START_ONLY.app,rcapWorkerSourceSha:'32499751569359315248c2048fa111064a47c67f',rcapWorkerDigest:'sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494',rcapAcceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',rcapPreviewPurpose:'managed_start',rcapReturnOrigin:START_ONLY.origin,rcapManagedSourceSuccessor:'ordinary-prepare-command-trace-v1',rcapSourcePredecessor:'dpl_BAxSvMXJCJqUAxATgpZgANAjZhjt',rcapOnboardingLaunchPrepEnabled:'true',rcapLaunchStudioEnabled:'false'};
 const native={passed:true,failedCases:[],neverPassedProdFlag:true,neverWroteProjectLevelEnv:true,applicationSha:START_ONLY.app,acceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',previewUrl:START_ONLY.origin,purposeSource:{phase:'managed_start_source_successor',carrierSha:binding.carrierSha,carrierWorkflowSha:binding.carrierSha,controllerSha:'3e755c9726184bba052bd985dcf2388b9cf8b79b',toolsSha:'c4a9eb13a51a1dba676c7716b5da022b98823418',runId:String(binding.runId),runAttempt:'1'},deployment:{id:binding.deploymentId,readyState:'READY',target:null,gitSourceSha:START_ONLY.app,projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',metadata},restCreation:{creationCalls:1,creationPostCount:1,id:binding.deploymentId,readyState:'READY'},aliasAssignment:{passed:true,deploymentId:binding.deploymentId,hostname:new URL(START_ONLY.origin).hostname,target:null},sourceSuccessorProtectedBefore:{old:'unchanged'},sourceSuccessorProtectedAfter:{old:'unchanged'},sourceSuccessorAliasInverse:{performed:false}};
 return{binding,creatorRun,native};
}
test('actual creator admission schema binds native hash, carrier/controller/tools, new source and alias without old repair reuse',()=>{
 const f=creatorFixture();const creatorBytes=JSON.stringify(f.native);f.binding.nativeSha256=hash(creatorBytes);assert.equal(admitStartOnlyTarget({...f,creatorBytes}).deploymentId,f.binding.deploymentId);
 for(const mutate of [x=>x.native.passed=false,x=>x.native.purposeSource.phase='managed_start_runtime_repair',x=>x.native.deployment.gitSourceSha='0'.repeat(40),x=>x.native.sourceSuccessorProtectedAfter={old:'changed'},x=>x.creatorRun.conclusion='failure',x=>x.creatorRun.repository.full_name='wrong/repo']){const x=structuredClone(f);mutate(x);const b=JSON.stringify(x.native);x.binding.nativeSha256=hash(b);assert.throws(()=>admitStartOnlyTarget({...x,creatorBytes:b}));}
 assert.throws(()=>admitStartOnlyTarget({...f,creatorBytes:creatorBytes+' '}));
});
test('static deployment query uses only the actual admitted new deployment, never the historical dpl pin',async()=>{
 let guard;const context={route:async(_p,fn)=>{guard=fn;},addInitScript:async()=>{},newPage:async()=>({goto:async()=>({status:()=>200,json:async()=>({application:'RCAP 2.0',policyVersion:'rcap2.2',buildSha:START_ONLY.app,runtimeSha:START_ONLY.app,sourceBound:true})})})};
 const io=await createStartOnlyBrowserIo({context,admitSourceTarget:async()=>({applicationSha:START_ONLY.app,origin:START_ONLY.origin,nativeCreatorVerified:true,deploymentId:'dpl_NewAdmitted'}),readProtectedPoststate:async()=>{},checkpoint:async()=>{},bypass:'PRIVATE_BYPASS',credentialReader:()=>assert.fail('no auth')});
 async function allowed(path){let ok;await guard({request:()=>({url:()=>START_ONLY.origin+path,method:()=>'GET',headers:()=>({})}),abort:async()=>{ok=false;},continue:async()=>{ok=true;}});return ok;}
 assert.equal(await allowed('/_next/static/chunks/app.js?dpl=dpl_NewAdmitted'),false);
 await io.admitSourceTarget({});assert.equal(await allowed('/_next/static/chunks/app.js?dpl=dpl_NewAdmitted'),true);
 for(const p of ['/_next/static/chunks/app.js?dpl=dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF','/_next/static/chunks/app.js?dpl=dpl_NewAdmitted&extra=1','/api/rcap/release?dpl=dpl_NewAdmitted'])assert.equal(await allowed(p),false);
});

// Only this finite response projection is new; old Start/gate/source fixtures are not rerun.
test('Start response reads the actual API code/error envelope and classifies exact deployed source literals',async()=>{
 const {execFileSync}=await import('node:child_process');
 const paths=['program-operations-service.ts','program-experience-service.ts','synthetic-launch-service.ts','http.ts'];
 const source=paths.map(p=>execFileSync('git',['show',START_ONLY.app+':src/lib/partners/onboarding/'+p],{encoding:'utf8'})).join('\n');
 const cases=[
  ['revision_conflict','The program changed. Reload before starting.','workspace_version_changed'],
  ['revision_conflict','This program changed. Reload and review the current details.','program_scope_or_version_changed'],
  ['revision_conflict','Preview the current materials before confirming Start Program.','material_review_token_changed'],
  ['revision_conflict','This decision could not be recorded. Review the current program and its real authority.','decision_recording_refused'],
  ['invalid_transition','This decision could not be recorded. Review the current program and its real authority.','decision_recording_refused'],
  ['invalid_transition','This operation requires an explicit five-step policy upgrade.','policy_upgrade_required'],
  ['invalid_transition','Current launch authority is unavailable.','launch_authority_unavailable'],
  ['invalid_transition','The program cannot start yet.','launch_preflight_held'],
  ['invalid_transition','The exact ordinary sponsored route source and Preview scope are required before Start.','ordinary_source_or_preview_scope_required'],
  ['request_in_progress','Another launch owns this workspace or the preparation receipt was refused. Refresh the journal.','launch_preparation_or_concurrency_refused'],
  ['request_in_progress','This launch is already running. Retry this request after it completes.','launch_in_progress'],
  ['persistence_failed','The previous publication could not be checked.','prior_publication_read_failed'],
  ['persistence_failed','Program setup could not be updated. Try again.','generic_persistence_failure']
 ];
 for(const [code,error,expected]of cases){assert(source.includes('"'+error+'"'),'Reason must be literal in the admitted application source');const p=projectStartOnlyResponse({status:code==='persistence_failed'?503:409,body:{success:false,code,error}});assert.equal(p.errorCode,code);assert.equal(p.errorReason,expected);assert.equal(p.errorReasonSha256,hash(error));assert.equal(p.operationsPresent,false);assert.equal(p.reportedLive,false);assert.equal(p.participantVerificationAllowed,false);assert(!JSON.stringify(p).includes(error));}
});
test('Start response uses only source-declared error codes and never exports unknown code/message/details',async()=>{
 const {execFileSync}=await import('node:child_process');
 const source=['errors.ts','request-security.ts'].map(p=>execFileSync('git',['show',START_ONLY.app+':src/lib/partners/onboarding/'+p],{encoding:'utf8'})).join('\n');
 for(const code of ['feature_disabled','unauthenticated','forbidden','workspace_not_found','commercially_blocked','invalid_input','revision_conflict','request_in_progress','duplicate_request','invalid_transition','required_asset_missing','persistence_failed','storage_failed','invalid_content_type','payload_too_large','invalid_json','invalid_origin','invalid_request_id']){assert(source.includes('"'+code+'"'));const p=projectStartOnlyResponse({status:409,body:{success:false,code,error:'PRIVATE_TOKEN https://private.invalid?token=PRIVATE_SECRET',details:{answers:['PRIVATE_FACT']}}});assert.equal(p.errorCode,code);assert.equal(p.errorReason,'unclassified');assert.equal(p.errorReasonSha256,null);assert(!JSON.stringify(p).includes('PRIVATE_'));assert(!JSON.stringify(p).includes('private.invalid'));}
 const p=projectStartOnlyResponse({status:409,body:{success:false,code:'PRIVATE_CODE',error:'The program changed. Reload before starting.'}});assert.equal(p.errorCode,null);assert.equal(p.errorReason,'unclassified');assert.equal(p.errorReasonSha256,null);assert(!JSON.stringify(p).includes('PRIVATE_CODE'));
});
test('Start response does not infer a known reason from wrong codes, substrings or retained status-only409',()=>{
 for(const body of [null,{},[],{code:null,error:null},{code:{secret:'PRIVATE'},error:42}]){const p=projectStartOnlyResponse({status:409,body});assert.equal(p.errorReason,'not_reported');assert.equal(p.errorReasonSha256,null);assert.equal(p.reportedLive,false);}
 for(const body of [{code:'invalid_transition',error:'The program changed. Reload before starting.'},{code:'revision_conflict',error:'The program changed. Reload before starting. PRIVATE_FACT'},{code:'revision_conflict',error:' The program changed. Reload before starting.'}]){const p=projectStartOnlyResponse({status:409,body});assert.equal(p.errorReason,'unclassified');assert.equal(p.errorReasonSha256,null);assert(!JSON.stringify(p).includes('PRIVATE_FACT'));}
 const retained=projectStartOnlyResponse({status:409});assert.equal(retained.errorCode,null);assert.equal(retained.errorReason,'not_reported');assert.equal(retained.errorReasonSha256,null);
});
test('Start response preserves success flags while omitting operations, review tokens and raw facts',()=>{
 const p=projectStartOnlyResponse({status:200,body:{operations:{view:{decision:{live:true},reviewToken:'PRIVATE_REVIEW_TOKEN',data:{facts:'PRIVATE_FACT'}}},token:'PRIVATE_TOKEN'}});assert.equal(p.operationsPresent,true);assert.equal(p.reportedLive,true);assert.equal(p.httpStatus,200);assert.equal(p.errorCode,null);assert.equal(p.errorReason,'not_reported');assert.equal(p.participantVerificationAllowed,false);assert(!JSON.stringify(p).includes('PRIVATE_'));assert.deepEqual(Object.keys(p).sort(),['stage','httpStatus','operationsPresent','reportedLive','errorCode','errorReason','errorReasonSha256','participantVerificationAllowed'].sort());
});
