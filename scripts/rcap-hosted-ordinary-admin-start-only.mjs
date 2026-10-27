import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ORIGIN as OLD_ORIGIN, ROOT, SLUG, ALLOCATION_REQUEST, assertPlannedRequest} from './rcap-hosted-ordinary-admin-postprovision.mjs';
import {nextMaterialsStartStep} from './rcap-hosted-ordinary-admin-materials-start.mjs';
import {readPinnedAdminCredentials,requestAllowed} from './rcap-hosted-ordinary-admin-readonly.mjs';

export const START_ONLY = Object.freeze({
  app:'9aadacd0c5a7fac90a1662f1928b7b86f8685c7a',
  origin:'https://legalease-rcap-managed-9aadacd0c5a7-roger947s-projects.vercel.app',
  admin:'6574d21e-5e0a-4567-b14e-01447c162f37',
  requestId:'d8a07a4e-3f5c-49fb-b8ad-5e2c892ce38c',
  payloadHash:'617fafd186895af99d5ceb7c5a63cd6483762ac97ca286059189e30aff6ae167',
  version:5
});
const sha=b=>createHash('sha256').update(b).digest('hex');
const MATERIALS=[
  ['co_branded_page_configuration','3d1250399ba18f80283255bb021cd650b8a126a12b980d85eb9fd18286633388'],
  ['implementation_brief','2ba6a142d46d43ba79ca3ad9623c031c99ca345aa8eabeabb88df371b62f9c47']
];

export function admitStartOnlyTarget({creatorBytes,creatorRun,binding}) {
  assert.match(binding.nativeSha256??'',/^[a-f0-9]{64}$/);assert.equal(sha(creatorBytes),binding.nativeSha256);
  assert.match(binding.carrierSha??'',/^[a-f0-9]{40}$/);assert.ok(Number.isSafeInteger(binding.runId)&&binding.runId>0);
  const n=JSON.parse(creatorBytes);
  for(const[k,v]of Object.entries({id:binding.runId,workflow_id:332448793,head_sha:binding.carrierSha,head_branch:'codex/f-vercel-raw-readonly-20261026',run_attempt:1,event:'workflow_dispatch',status:'completed',conclusion:'success'}))assert.equal(creatorRun[k],v);
  assert.equal(creatorRun.repository?.full_name,'Roger-LegalEase/legalease-partner-dashboard-clean');
  assert.equal(n.passed,true);assert.deepEqual(n.failedCases,[]);assert.equal(n.neverPassedProdFlag,true);assert.equal(n.neverWroteProjectLevelEnv,true);
  assert.equal(n.applicationSha,START_ONLY.app);assert.equal(n.acceptanceProjectRef,'hyflxnlhpmiqxvvcoiia');assert.equal(n.previewUrl,START_ONLY.origin);
  for(const[k,v]of Object.entries({phase:'managed_start_source_successor',carrierSha:binding.carrierSha,carrierWorkflowSha:binding.carrierSha,controllerSha:'3e755c9726184bba052bd985dcf2388b9cf8b79b',toolsSha:'c4a9eb13a51a1dba676c7716b5da022b98823418',runId:String(binding.runId),runAttempt:'1'}))assert.equal(n.purposeSource?.[k],v);
  const d=n.deployment;assert.match(d?.id??'',/^dpl_[A-Za-z0-9]+$/);assert.equal(d.id,binding.deploymentId);assert.notEqual(d.id,'dpl_BAxSvMXJCJqUAxATgpZgANAjZhjt');assert.equal(d.readyState,'READY');assert.equal(d.target,null);assert.equal(d.gitSourceSha,START_ONLY.app);assert.equal(d.projectId,'prj_cdgwGzFqIHgEUlzEburSLaZETdQV');
  for(const[k,v]of Object.entries({rcapApplicationSha:START_ONLY.app,rcapWorkerSourceSha:'32499751569359315248c2048fa111064a47c67f',rcapWorkerDigest:'sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494',rcapAcceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',rcapPreviewPurpose:'managed_start',rcapReturnOrigin:START_ONLY.origin,rcapManagedSourceSuccessor:'ordinary-prepare-command-trace-v1',rcapSourcePredecessor:'dpl_BAxSvMXJCJqUAxATgpZgANAjZhjt',rcapOnboardingLaunchPrepEnabled:'true',rcapLaunchStudioEnabled:'false'}))assert.equal(d.metadata?.[k],v);
  assert.equal(n.restCreation.creationCalls,1);assert.equal(n.restCreation.creationPostCount,1);assert.equal(n.restCreation.id,d.id);assert.equal(n.restCreation.readyState,'READY');
  assert.equal(n.aliasAssignment.passed,true);assert.equal(n.aliasAssignment.deploymentId,d.id);assert.equal(n.aliasAssignment.hostname,new URL(START_ONLY.origin).hostname);assert.equal(n.aliasAssignment.target,null);
  assert.deepEqual(n.sourceSuccessorProtectedAfter,n.sourceSuccessorProtectedBefore);assert.ok(n.sourceSuccessorProtectedBefore);assert.equal(n.sourceSuccessorAliasInverse?.performed,false);assert.notEqual(n.sourceSuccessorAliasInverse?.blocked,true);
  return{applicationSha:START_ONLY.app,origin:START_ONLY.origin,deploymentId:d.id,nativeCreatorVerified:true};
}

export function qualifyRetainedStartProof({before,review,poststate}) {
  assert.equal(before.stage,'start_before_forward');
  assert.equal(before.applicationSha,'c0052e13d9801d24080275aab02c70c6ea213fa3');
  assert.equal(before.deploymentId,'dpl_BAxSvMXJCJqUAxATgpZgANAjZhjt');
  assert.equal(before.exactExistingAdmin,true);
  assert.equal(before.request.stage,'start');
  assert.equal(before.request.requestId,START_ONLY.requestId);
  assert.equal(before.request.payloadHash,START_ONLY.payloadHash);
  assert.equal(before.request.expectedVersion,START_ONLY.version);
  assert.deepEqual(before.request.review,review.review);
  assert.equal(review.stage,'actual_current_material_dom_review');
  assert.equal(review.review.sourceVersion,5);
  assert.equal(review.review.matchedMaterialCount,2);
  assert.deepEqual(review.review.materialVersions,[1,1]);
  assert.deepEqual([...review.review.materialHashes].sort(),MATERIALS.map(m=>m[1]).sort());
  const old=poststate[0]?.ordinary_start_404538_poststate;
  assert.equal(poststate.length,1); assert.ok(old);
  assertStartOnlyPrestate(old,old);
  return old;
}

export function assertStartOnlyPrestate(current, retained) {
  assert.equal(current.readOnly,'on');
  assert.deepEqual(current.workspace,retained.workspace);
  assert.equal(current.workspace.version,5); assert.equal(current.workspace.launched,false);
  assert.equal(current.workspace.hasLaunchOperation,false);
  for(const k of ['exactWorkspaceCount','originalOnePlusOneReceiptCount','childReviewRowCount','childReviewExactApprovedCount','allFinalReviewCount']) assert.equal(current[k],1,k);
  for(const k of ['childReviewArtifactReviews','childReviewExactMaterialCount','submittedTwoHashesCurrentCount','artifactVersionCount']) assert.equal(current[k],2,k);
  for(const k of ['launchReceiptCount','launchCompleteCount','launchPreparedCount','ordinaryRegistrationCount','ordinaryExactMsRegistrationCount','originalStartRequestJournalCount','packetReservedOrConsumed']) assert.equal(current[k],0,k);
  assert.deepEqual(current.originalStartRequestSteps,[]);
  assert.equal(current.exactMsJurisdiction,true); assert.equal(current.childReviewHasExpectedJurisdictions,true);
  assert.equal(current.sponsoredServiceMode,true); assert.equal(current.packetCapTotal,1);
  assert.deepEqual(current.screeningCapacity,{used:0,allowed:1,remaining:1});
  assert.deepEqual(current.currentMaterials,retained.currentMaterials);
  assert.equal(current.currentMaterials.length,2);
  for(const[type,hash]of MATERIALS){const m=current.currentMaterials.find(m=>m.type===type);assert.ok(m);assert.equal(m.hash,hash);assert.equal(m.version,1);assert.equal(m.sourceVersion,5);for(const k of ['approved','generated','notDrifted','notSuperseded'])assert.equal(m[k],true);}
}

export function createStartOnlyGate(plan, pending, checkpoint) {
  assert.equal(plan.kind,'operation'); assert.equal(plan.stage,'start');
  assert.equal(plan.endpoint,ROOT+'/program'); assert.equal(plan.body.action,'start');
  let used=false;
  return async request=>{
    assert.equal(used,false,'One Start forward only');
    assert.equal(request.url,START_ONLY.origin+plan.endpoint);
    assert.equal(request.originHeader,START_ONLY.origin);
    // Normalize only this verified origin for the unchanged historical pure validator.
    const witness=assertPlannedRequest(plan,{...request,url:OLD_ORIGIN+plan.endpoint,originHeader:OLD_ORIGIN},pending);
    used=true; await checkpoint(witness); return witness;
  };
}

/** io uses the existing normal admin browser/API and protected read-only ports.
 * Admission must validate the new actual creator native before credentials are read. */
export async function runOrdinaryStartOnly({retained},io) {
  const old=qualifyRetainedStartProof(retained);
  for(const k of ['admitSourceTarget','signInExistingAdminOnce','readProtectedPoststate','readCurrentProgram','readMaterialDom','checkpoint','forwardNormalStart'])assert.equal(typeof io[k],'function',k);
  const target=await io.admitSourceTarget({applicationSha:START_ONLY.app,origin:START_ONLY.origin,phase:'managed_start_source_successor'});
  assert.equal(target.applicationSha,START_ONLY.app);assert.equal(target.origin,START_ONLY.origin);
  assert.match(target.deploymentId??'',/^dpl_[A-Za-z0-9]+$/);assert.notEqual(target.deploymentId,retained.before.deploymentId);
  assert.equal(target.nativeCreatorVerified,true);assert.equal(target.sourceBound,true);
  assert.equal(await io.signInExistingAdminOnce(),START_ONLY.admin);
  const pre=await io.readProtectedPoststate();
  const observed=Date.parse(pre.observedAt);assert.ok(Number.isFinite(observed)&&observed<=Date.now()&&Date.now()-observed<120000,'Fresh protected prestate required');
  assertStartOnlyPrestate(pre,old);
  const snapshot=await io.readCurrentProgram();
  const capacityProof={kind:'original_one_plus_one_confirmed',workspaceId:snapshot.configuration.workspaceId,partnerSlug:SLUG,requestId:ALLOCATION_REQUEST,confirmed:true,screeningsAllowed:1,packetCap:1,noInterveningCapacityStep:true};
  const input={...snapshot,capacityProof,pending:{...retained.before.request,reconciled:true}};
  assert.equal(snapshot.configuration.version,5);
  const pending=nextMaterialsStartStep(input);
  assert.equal(pending.kind,'read_current_materials','Current materials required; never prepare or configure');
  const review=await io.readMaterialDom(pending.materials);
  const plan=nextMaterialsStartStep(input,review);assert.equal(plan.stage,'start');
  assert.deepEqual(plan.reviewSummary,retained.review.review,'Current material DOM must match both retained reviewed documents');
  const request={url:START_ONLY.origin+plan.endpoint,method:'POST',originHeader:START_ONLY.origin,body:{...plan.body,requestId:START_ONLY.requestId}};
  assert.equal(sha(JSON.stringify(request.body)),START_ONLY.payloadHash,'Original Start payload changed; reconcile without forwarding');
  const gate=createStartOnlyGate(plan,retained.before.request,witness=>io.checkpoint('start-only-before.json',{stage:'start_only_before_forward',target,request:witness,participantVerificationAllowed:false}));
  await gate(request);
  let response, after, uncertain=false;
  try {
    response=await io.forwardNormalStart(request);
    await io.checkpoint('start-only-response.json',{stage:'start_only_response',httpStatus:response.status,operationsPresent:Boolean(response.body?.operations),reportedLive:response.body?.operations?.view?.decision?.live===true,participantVerificationAllowed:false});
  } catch {
    uncertain=true;
    await io.checkpoint('start-only-uncertain.json',{stage:'start_only_transport_or_receipt_uncertain',participantVerificationAllowed:false});
  } finally {
    after=await io.readProtectedPoststate();
    await io.checkpoint('start-only-poststate.json',{stage:'start_only_poststate',poststate:after,participantVerificationAllowed:false});
  }
  assert.equal(uncertain,false,'Preserve uncertain Start; never forward another request');
  assert.equal(response.status,200);assert.equal(response.body?.operations?.view?.decision?.live,true);
  assert.equal(after.readOnly,'on');assert.equal(after.workspace.launched,true);
  assert.deepEqual(after.currentMaterials,old.currentMaterials);
  for(const k of ['childReviewRowCount','childReviewArtifactReviews','childReviewExactApprovedCount','allFinalReviewCount','originalOnePlusOneReceiptCount','packetCapTotal','packetReservedOrConsumed'])assert.equal(after[k],old[k],k);
  assert.deepEqual(after.screeningCapacity,old.screeningCapacity);
  assert.equal(after.launchPreparedCount,1);assert.equal(after.launchCompleteCount,1);
  assert.equal(after.ordinaryRegistrationCount,1);assert.equal(after.ordinaryExactMsRegistrationCount,1);
  return {status:'normal_start_observed_stop',requestId:START_ONLY.requestId,applicationSha:START_ONLY.app,deploymentId:target.deploymentId,prepareForwards:0,startForwards:1,participantVerificationAllowed:false};
}

/** Existing runner supplies and closes its browser context; no browser install or alternate login. */
export async function createStartOnlyBrowserIo({context,admitSourceTarget,readProtectedPoststate,checkpoint,bypass,credentialReader=readPinnedAdminCredentials}) {
  for(const f of [admitSourceTarget,readProtectedPoststate,checkpoint,credentialReader])assert.equal(typeof f,'function');
  assert.ok(typeof bypass==='string'&&bypass.trim()&&!/[\r\n]/.test(bypass));
  const authOrigin='https://hyflxnlhpmiqxvvcoiia.supabase.co';
  let page, snapshot, authPosts=0, startPosts=0, authorized=null, admittedDeploymentId=null;
  await context.route('**/*',async route=>{
    const r=route.request(),u=new URL(r.url());
    if(u.origin===OLD_ORIGIN)return route.abort('blockedbyclient');
    let normalized=u.origin===START_ONLY.origin?OLD_ORIGIN+u.pathname+u.search:r.url();
    if(u.origin===START_ONLY.origin&&u.searchParams.has('dpl')){
      if(!admittedDeploymentId||u.search!=='?dpl='+admittedDeploymentId||!/^\/_next\/static\/chunks\/[A-Za-z0-9_.~/-]+\.(?:js|css)$/.test(u.pathname))return route.abort('blockedbyclient');
      normalized=OLD_ORIGIN+u.pathname+'?dpl=dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF';
    }
    let allowed=requestAllowed(normalized,r.method(),authPosts);
    if(r.method()==='POST'&&u.origin===START_ONLY.origin){
      allowed=false;
      if(authorized&&startPosts===0&&r.url()===authorized.url&&r.headers().origin===START_ONLY.origin){
        try{assert.deepEqual(r.postDataJSON(),authorized.body);startPosts++;authorized=null;allowed=true;}catch{}
      }
    }
    if(!allowed)return route.abort('blockedbyclient');
    if(r.method()==='POST'&&u.origin===authOrigin)authPosts++;
    const headers={...r.headers()};delete headers['x-vercel-protection-bypass'];
    if(u.origin===START_ONLY.origin){headers['x-vercel-protection-bypass']=bypass;headers['x-vercel-skip-toolbar']='1';}
    return route.continue({headers});
  });
  await context.addInitScript(()=>window.addEventListener('submit',event=>{const f=event.target;if(location.pathname==='/expungement-ai/sign-in'&&f instanceof HTMLFormElement&&f.querySelector('input[name="password"]')&&!event.defaultPrevented)event.preventDefault();}));
  return {
    admitSourceTarget:async expected=>{
      const native=await admitSourceTarget(expected);
      // The runtime read supplements the creator native; it never replaces that admission.
      assert.equal(native.applicationSha,START_ONLY.app);assert.equal(native.origin,START_ONLY.origin);assert.equal(native.nativeCreatorVerified,true);
      assert.match(native.deploymentId??'',/^dpl_[A-Za-z0-9]+$/);admittedDeploymentId=native.deploymentId;
      page=await context.newPage();
      const r=await page.goto(START_ONLY.origin+'/api/rcap/release',{waitUntil:'domcontentloaded'});
      assert.equal(r.status(),200);const body=await r.json();
      assert.equal(body.application,'RCAP 2.0');assert.equal(body.policyVersion,'rcap2.2');assert.equal(body.buildSha,START_ONLY.app);assert.equal(body.runtimeSha,START_ONLY.app);assert.equal(body.sourceBound,true);
      return{...native,sourceBound:true};
    },
    signInExistingAdminOnce:async()=>{
      assert.ok(page);assert.equal(authPosts,0);
      await page.goto(START_ONLY.origin+'/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase',{waitUntil:'domcontentloaded'});
      await page.locator('form[data-handler-ready="true"]').waitFor({state:'attached'});
      let credentials=credentialReader();await page.locator('input[name="email"]').fill(credentials.email);await page.locator('input[name="password"]').fill(credentials.password);credentials=null;
      const token=page.waitForResponse(r=>r.url().startsWith(authOrigin+'/auth/v1/token?')&&r.request().method()==='POST');
      await page.getByRole('button',{name:'Sign in',exact:true}).click();const response=await token;assert.equal(response.status(),200);
      const session=await response.json();assert.equal(session.user?.id,START_ONLY.admin);assert.equal(authPosts,1);
      await page.waitForURL(u=>u.origin===START_ONLY.origin&&u.pathname==='/briefcase');return session.user.id;
    },
    readProtectedPoststate,
    readCurrentProgram:async()=>{
      const rows={};for(const kind of ['configuration','program']){
        const r=await page.evaluate(async p=>{const response=await fetch(p,{cache:'no-store',redirect:'manual'});return{status:response.status,body:await response.json()};},ROOT+'/'+kind);
        assert.equal(r.status,200);rows[kind]=r.body;
      }
      snapshot={configuration:rows.configuration.configuration,operations:rows.program.operations};return snapshot;
    },
    readMaterialDom:async materials=>{
      const r=await page.goto(START_ONLY.origin+'/internal/partners/onboarding/'+SLUG,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);
      const rows=[];for(const m of materials){const node=page.locator(`[data-material-id="${m.id}"]`);await node.waitFor({state:'visible'});const text=(await node.innerText()).trim();rows.push({id:await node.getAttribute('data-material-id'),attributeVersion:Number(await node.getAttribute('data-material-version')),attributeHash:await node.getAttribute('data-material-hash'),visible:await node.isVisible(),textLength:text.length,textSha256:sha(text)});}
      return{actualContentRead:true,sourceVersion:snapshot.operations.view.version,scopeHash:snapshot.operations.view.decision.scopeHash,reviewToken:snapshot.operations.view.reviewToken,rows};
    },
    checkpoint,
    forwardNormalStart:async request=>{
      assert.equal(startPosts,0);assert.equal(authorized,null);assert.equal(request.url,START_ONLY.origin+ROOT+'/program');assert.equal(request.method,'POST');assert.equal(request.body.action,'start');
      authorized=request;
      const response=await page.evaluate(async input=>{const r=await fetch(input.path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input.body),redirect:'manual'});let body=null;try{body=await r.json();}catch{}return{status:r.status,body};},{path:ROOT+'/program',body:request.body});
      assert.equal(startPosts,1);return response;
    }
  };
}
