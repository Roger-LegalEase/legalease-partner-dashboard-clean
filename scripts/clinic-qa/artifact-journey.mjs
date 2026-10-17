import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {artifactWorkerBinding} from './source-bindings.mjs';

// These are measured against an artifact created by the real owner generation
// path. An unavailable artifact leaves each applicable case NOT_RUN, never PASS.
export const artifactCases = [
  'owner-provenance-and-exact-bytes','current-worker-source-provenance','owner-repeat-download','staff-owner-artifact-denied',
  'wrong-participant-denied','wrong-program-denied','unassigned-staff-denied',
  'queue-only-staff-denied','signed-out-replay-denied','reset-signed-out-replay-denied','missing-token-denied',
  'altered-token-denied','wrong-item-token-denied','wrong-job-denied','no-assist-staff-denied',
  'suspended-staff-denied','expired-consent-staff-denied',
  'revoked-consent-staff-denied','revoked-consent-owner-retains-artifact',
  'expired-grant-denied','revoked-grant-denied','stale-verification-denied'
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const uuid = value => assert.match(value,/^[a-f0-9]{8}-[a-f0-9-]{27}$/i);
const privateHeaders = headers => /(?:^|,)\s*private\s*(?:,|$)/i.test(headers['cache-control']??'')
  && /(?:^|,)\s*no-store\s*(?:,|$)/i.test(headers['cache-control']??'');

export function startArtifactEvidence(report, locale) {
  const evidence={locale,status:'NOT_RUN',reason:'REAL_PROTECTED_ARTIFACT_UNAVAILABLE',
    cases:artifactCases.map(id=>({id,status:'NOT_RUN'}))};
  (report.artifactAcceptance??=[]).push(evidence);
  return evidence;
}
function record(evidence,check,id,pass) {
  const row=evidence.cases.find(row=>row.id===id);assert(row,'Known original artifact acceptance case');
  row.status=pass?'PASS':'FAIL';check(`${evidence.locale}-artifact-${id}`,pass);
  evidence.status=evidence.cases.some(row=>row.status==='FAIL')?'FAIL':
    evidence.cases.every(row=>['PASS','NOT_APPLICABLE'].includes(row.status))?'PASS':'PARTIAL';
}
export function protectedArtifactPath(location, origin, matterId) {
  const url=new URL(location,origin);
  assert.equal(url.origin,origin,'Artifact redirect must remain on the authenticated origin');
  assert.equal(url.pathname,`/api/expungement-ai/packet/artifacts/${matterId}`,'Exact owner artifact path required');
  assert.match(url.searchParams.get('grant')??'',/^[A-Za-z0-9_-]{43}$/,'Opaque actual grant required');
  assert.equal([...url.searchParams.keys()].join(','),'grant','No credentials or storage locator in redirect');
  return url.pathname+url.search;
}
export function alteredGrantPath(target, origin) {
  const url=new URL(target,origin);const token=url.searchParams.get('grant');
  assert.match(token??'',/^[A-Za-z0-9_-]{43}$/);
  url.searchParams.set('grant',(token[0]==='a'?'b':'a')+token.slice(1));
  return url.pathname+url.search;
}
export function exactArtifactResponse(status, headers, bytes, expected) {
  return status===200 && privateHeaders(headers) && /^application\/pdf(?:;|$)/i.test(headers['content-type']??'')
    && bytes.subarray(0,5).toString()==='%PDF-' && bytes.length===expected.byteLength
    && digest(bytes)===expected.sha256;
}
export function privateDenialResponse(status, headers, bytes) {
  if(![401,403,404,409].includes(status)||!privateHeaders(headers)||bytes.subarray(0,5).toString()==='%PDF-')return false;
  try {
    const body=JSON.parse(bytes.toString());
    return !Object.keys(body).some(key=>/artifact|storage|grant|download|token|path|url/i.test(key))
      && !/packet-artifacts\/|\/storage\/v1\/|https?:\/\//i.test(JSON.stringify(body));
  } catch { return false; }
}
export function artifactCleanupIds({ownerId,matterId,provenance,job,partnerId}) {
  uuid(provenance.render_job_id);uuid(provenance.matter_id);
  assert.equal(provenance.consumer_auth_user_id,ownerId,'Provenance must belong to the run-created owner');
  const sponsored=job.partner_id!=null;
  if(sponsored){
    uuid(partnerId);assert.equal(job.partner_id,partnerId,'Sponsored job must match the actual fixture program');
    assert.equal(job.consumer_auth_user_id,null,'Sponsored job cannot borrow consumer identity');
    assert.equal(job.consumer_briefcase_item_id,null,'Sponsored job cannot borrow consumer item');
  }
  assert.equal(sponsored?job.sponsored_consumer_auth_user_id:job.consumer_auth_user_id,ownerId,'Job must belong to the run-created owner');
  assert.equal(sponsored?job.sponsored_consumer_briefcase_item_id:job.consumer_briefcase_item_id,matterId,'Job must belong to the run-created item');
  assert.equal(job.matter_id,provenance.matter_id,'Provenance and job must identify the same matter');
  assert.match(job.output_sha256,/^[a-f0-9]{64}$/);
  assert.equal(job.output_storage_path,`packet-artifacts/${job.partner_id??'consumer'}/${provenance.matter_id}/${provenance.render_job_id}/${job.output_sha256}.pdf`,
    'Only the canonical exact-job storage path acquires cleanup ownership');
  return [provenance.matter_id,provenance.render_job_id];
}
export function sponsoredArtifactPath(location,origin,jobId) {
  uuid(jobId);const url=new URL(location,origin);
  assert.equal(url.origin,origin,'Sponsored artifact must remain on the authenticated origin');
  assert.equal(url.pathname,`/api/rcap/packets/${jobId}/download`,'Exact sponsored job download path required');
  assert(!url.search&&!url.hash&&!url.username&&!url.password,'Sponsored artifact path has no grant or storage parameters');
  return url.pathname;
}
export function applyArtifactMode(evidence,mode) {
  assert(['sponsored','consumer'].includes(mode));evidence.mode=mode;
  const ids=mode==='sponsored'?['missing-token-denied','altered-token-denied','wrong-item-token-denied','expired-grant-denied','revoked-grant-denied']:['wrong-job-denied'];
  for(const id of ids){const row=evidence.cases.find(row=>row.id===id);row.status='NOT_APPLICABLE';
    row.basis=mode==='sponsored'?'src/lib/rcap/render/sponsored-packet.ts:finalizeSponsoredRenderArtifact and src/app/api/rcap/packets/[jobId]/download/route.ts: authenticated job delivery uses no consumer grant':
      'src/app/api/expungement-ai/packet/artifacts/[itemId]/route.ts: consumer grant binds the item; wrong-item-token case applies';}
}
export function shouldAwaitArtifactStatus({generationHttp,generationPacketStatus,status,deadlineExpired}) {
  // getConsumerPacketStatus returns not_started while a sponsored job has no
  // finalized provenance. The successful enqueue response supplies the fact
  // that a real job was requested; neither signal alone invents readiness.
  return [200,202].includes(generationHttp)&&generationPacketStatus==='generating'
    &&status.canDownload!==true&&['not_started','pending','generating'].includes(status.packetStatus)
    &&!deadlineExpired;
}
export async function acceptRealArtifact({fixture,context,matterId,ownerId,downloadPath,session,evidence,check,readWorkerBinding=artifactWorkerBinding}) {
  uuid(matterId);uuid(ownerId);
  assert(fixture.actors.some(actor=>actor.id===ownerId)&&fixture.known.has(matterId),'Only run-owned artifacts');
  // Read-only corroboration never fetches/authorizes the measured PDF bytes.
  const provenance=fixture.checked(await fixture.admin.from('consumer_packet_artifact_provenance')
    .select('consumer_auth_user_id,matter_id,render_job_id,verification_hash,entitlement_source,artifact,revision')
    .eq('briefcase_item_id',matterId).single());
  const job=fixture.checked(await fixture.admin.from('packet_render_jobs')
    .select('partner_id,route_id,consumer_auth_user_id,consumer_briefcase_item_id,matter_id,consumer_verification_hash,sponsored_consumer_auth_user_id,sponsored_consumer_briefcase_item_id,sponsored_verification_hash,sponsored_route_key,sponsored_session_id,sponsored_clinic_event_id,status,delivery_eligibility,accounting_result,output_sha256,output_byte_count,output_storage_path,container_digest,renderer_kind,renderer_version')
    .eq('id',provenance.render_job_id).single());
  const sponsored=job.partner_id!=null;
  const scoped=sponsored?job.partner_id===fixture.partnerId&&job.consumer_auth_user_id===null&&job.consumer_briefcase_item_id===null
    &&job.sponsored_consumer_auth_user_id===ownerId&&job.sponsored_consumer_briefcase_item_id===matterId
    &&job.sponsored_verification_hash===provenance.verification_hash&&job.sponsored_route_key===job.route_id
    &&job.sponsored_session_id===session.screening_session_id&&job.sponsored_clinic_event_id===session.event_id
    &&provenance.entitlement_source==='partner_sponsorship'
    &&provenance.artifact?.provider==='rcap_grade_a_composer_v1'&&provenance.artifact?.source==='grade_a_packet_specification':
    job.consumer_auth_user_id===ownerId&&job.consumer_briefcase_item_id===matterId&&job.consumer_verification_hash===provenance.verification_hash
    &&provenance.entitlement_source==='consumer_payment'&&provenance.artifact?.provider==='rcap_durable_render_v1'&&provenance.artifact?.source==='verified_render_job';
  const metadataValid=scoped&&provenance.consumer_auth_user_id===ownerId&&job.matter_id===provenance.matter_id
    &&['artifact_validated','delivered'].includes(job.status)&&job.delivery_eligibility==='eligible'
    &&['zero_charge','consumed','already_consumed','overage_consumed'].includes(job.accounting_result)
    &&provenance.artifact.renderJobId===provenance.render_job_id&&provenance.artifact.downloadPath===downloadPath
    &&provenance.artifact.artifactSha256===job.output_sha256&&provenance.artifact.storagePath===job.output_storage_path
    &&/^[a-f0-9]{64}$/.test(job.output_sha256)&&Number.isInteger(job.output_byte_count)&&job.output_byte_count>0;
  assert(metadataValid,'Actual artifact must match exact program/owner/session/job/provenance');
  for(const id of artifactCleanupIds({ownerId,matterId,provenance,job,partnerId:fixture.partnerId}))fixture.known.add(id);
  try {
    evidence.worker=readWorkerBinding(job);
    record(evidence,check,'current-worker-source-provenance',true);
  } catch(error) {
    record(evidence,check,'current-worker-source-provenance',false);
    throw error;
  }
  const mode=sponsored?'sponsored':'consumer';let target;
  if(sponsored)target=sponsoredArtifactPath(downloadPath,fixture.origin,provenance.render_job_id);
  else {
    assert.equal(downloadPath,`/api/expungement-ai/packet/download-link?briefcaseItemId=${matterId}`);
    const grant=await context.request.get(downloadPath,{maxRedirects:0});
    assert.equal(grant.status(),303,'Actual consumer owner grant required');assert(privateHeaders(grant.headers()));
    target=protectedArtifactPath(grant.headers().location,fixture.origin,matterId);
  }
  const expected={sha256:job.output_sha256,byteLength:job.output_byte_count};
  const bytesResponse=await context.request.get(target,{maxRedirects:0});
  const pass=exactArtifactResponse(bytesResponse.status(),bytesResponse.headers(),await bytesResponse.body(),expected);
  record(evidence,check,'owner-provenance-and-exact-bytes',pass);
  assert(pass,'Actual owner PDF must match independently read finalized job/provenance');
  applyArtifactMode(evidence,mode);
  evidence.reason=null;evidence.identity={...expected,renderJobIdSha256:digest(provenance.render_job_id),revision:provenance.revision};
  const repeated=await context.request.get(target,{maxRedirects:0});
  record(evidence,check,'owner-repeat-download',exactArtifactResponse(repeated.status(),repeated.headers(),await repeated.body(),expected));
  return {target,matterId,ownerId,expected,evidence,mode,jobId:provenance.render_job_id,origin:fixture.origin,program:fixture.program};
}
async function ownerPositiveControl(item,caseId) {
  if(item.artifact.mode==='sponsored'){await exactOwnerControl(item,item.artifact.target,caseId);return item.artifact.target;}
  const grant=await item.context.request.get(`/api/expungement-ai/packet/download-link?briefcaseItemId=${item.matterId}`,{maxRedirects:0});
  assert.equal(grant.status(),303,'Current owner authority is required before testing a denial');
  const target=protectedArtifactPath(grant.headers().location,item.artifact.origin,item.matterId);
  await exactOwnerControl(item,target,caseId);
  item.artifact.target=target;
  return target;
}
async function exactOwnerControl(item,target,caseId) {
  const owner=await item.context.request.get(target,{maxRedirects:0});
  const passed=exactArtifactResponse(owner.status(),owner.headers(),await owner.body(),item.artifact.expected);
  (item.artifact.evidence.controls??=[]).push({forCase:caseId,status:passed?'PASS':'FAIL'});
  assert(passed,'Exact issued grant must deliver current owner bytes before its negative condition');
}
export async function artifactDenial({item,context,id,check,includeLink=true,target,ownerControl=true,expectedStatuses=[401,403,404],expectedCodes}) {
  if(!item.artifact)return;
  if(ownerControl)await ownerPositiveControl(item,id);
  const selectedTarget=typeof target==='function'?target(item.artifact.target):target??item.artifact.target;
  const paths=[selectedTarget];
  if(includeLink)paths.push(item.artifact.mode==='sponsored'?`${selectedTarget}?participantId=${item.actor.id}&partnerSlug=${item.artifact.program}`:`/api/expungement-ai/packet/download-link?briefcaseItemId=${item.matterId}&participantId=${item.actor.id}`);
  let pass=true;
  for(const path of paths){
    const response=await context.request.get(path,{maxRedirects:0,headers:{'cache-control':'no-cache'}});
    const body=await response.body();let code=null;try{code=JSON.parse(body).code;}catch{}
    pass=expectedStatuses.includes(response.status())&&(!expectedCodes||expectedCodes.includes(code))&&privateDenialResponse(response.status(),response.headers(),body)&&pass;
  }
  record(item.artifact.evidence,check,id,pass);
}
export async function artifactAfterDeviceReset({item,fixture,check,login}) {
  if(!item.artifact)return;
  // Normal shared-device reset explicitly signs the participant out. A fresh
  // ordinary owner login obtains and proves a current grant before replaying
  // that same handle in the reset context; expiry cannot explain the denial.
  const returning=await login(item.actor,item.locale,`/briefcase/${item.matterId}/packet-information`);
  const resumed={...item,...returning};
  try {
    const target=await ownerPositiveControl(resumed,'reset-signed-out-replay-denied');
    await artifactDenial({item:resumed,context:item.context,id:'reset-signed-out-replay-denied',check,
      target,ownerControl:false,expectedStatuses:[401]});
    await artifactAfterConsentRevocation({item:resumed,fixture,check});
    await artifactGrantAndRevisionCases({fixture,item:resumed,check});
  } finally { await returning.context.close(); }
}
export async function artifactActorCases({owned,outsider,unauthorized,queueOnlyContext,browser,fixture,check}) {
  const anonymous=await browser.newContext({baseURL:fixture.origin});
  try {
    for(const item of owned){
      if(!item.artifact)continue;
      const other=owned.find(candidate=>candidate!==item);
      for(const [id,context] of [['wrong-participant-denied',other.context],['wrong-program-denied',outsider.context],
        ['unassigned-staff-denied',unauthorized.context],['queue-only-staff-denied',queueOnlyContext],['signed-out-replay-denied',anonymous]])
        await artifactDenial({item,context,id,check});
      if(item.artifact.mode==='sponsored'){
        if(other.artifact?.mode!=='sponsored'){
          item.artifact.evidence.cases.find(row=>row.id==='wrong-job-denied').reason='OTHER_PARTICIPANT_REAL_ARTIFACT_UNAVAILABLE';
          continue;
        }
        // This negative requests B's job as A, so B must positively fetch that
        // exact current artifact first. A's unrelated artifact is no control.
        const target=await ownerPositiveControl(other,'wrong-job-target-owner-control');
        (item.artifact.evidence.controls??=[]).push({forCase:'wrong-job-denied',targetOwner:'other-participant',status:'PASS'});
        await artifactDenial({item,context:item.context,id:'wrong-job-denied',check,includeLink:false,target,ownerControl:false});
      } else {
      await artifactDenial({item,context:item.context,id:'missing-token-denied',check,includeLink:false,
        target:target=>{const url=new URL(target,fixture.origin);url.searchParams.delete('grant');return url.pathname+url.search;}});
      await artifactDenial({item,context:item.context,id:'altered-token-denied',check,includeLink:false,target:target=>alteredGrantPath(target,fixture.origin)});
      await artifactDenial({item,context:item.context,id:'wrong-item-token-denied',check,includeLink:false,target:target=>{
        const tampered=new URL(target,fixture.origin);
        tampered.pathname=`/api/expungement-ai/packet/artifacts/${other.matterId}`;
        tampered.searchParams.set('participantId',item.actor.id);tampered.searchParams.set('partnerSlug',fixture.program);
        return tampered.pathname+tampered.search;
      }});
      }
    }
  } finally { await anonymous.close(); }
}
export async function artifactAfterConsentRevocation({item,check}) {
  if(!item.artifact)return;
  await artifactDenial({item,context:item.selectedHelper.context,id:'revoked-consent-staff-denied',check});
  const target=await ownerPositiveControl(item,'revoked-consent-owner-retains-artifact');
  const response=await item.context.request.get(target,{maxRedirects:0});
  record(item.artifact.evidence,check,'revoked-consent-owner-retains-artifact',
    exactArtifactResponse(response.status(),response.headers(),await response.body(),item.artifact.expected));
}
export async function artifactGrantAndRevisionCases({fixture,item,check}) {
  if(!item.artifact)return;
  const {matterId,actor,context,artifact}=item;uuid(matterId);uuid(actor.id);
  assert(fixture.actors.some(candidate=>candidate.id===actor.id)&&fixture.known.has(matterId),'Only run-created owner state can be conditioned');
  async function freshGrant(){
    const response=await context.request.get(`/api/expungement-ai/packet/download-link?briefcaseItemId=${matterId}`,{maxRedirects:0});
    assert.equal(response.status(),303,'Fresh actual owner grant required before negative condition');
    const target=protectedArtifactPath(response.headers().location,fixture.origin,matterId);
    const tokenHash=digest(new URL(target,fixture.origin).searchParams.get('grant'));
    const grant=fixture.checked(await fixture.admin.from('consumer_artifact_download_grants').select('id,created_at,expires_at')
      .eq('consumer_auth_user_id',actor.id).eq('briefcase_item_id',matterId).eq('token_hash',tokenHash).single());
    uuid(grant.id);return {target,grant};
  }
  if(artifact.mode!=='sponsored'){
  const expired=await freshGrant();
  await exactOwnerControl(item,expired.target,'expired-grant-denied');
  // Run-owned setup only, no system clock change or fabricated grant. The
  // actual owner HTTP fetch is measured after conditioning this issued grant.
  fixture.sql(`update consumer_artifact_download_grants set created_at=now()-interval '6 minutes',expires_at=now()-interval '1 second' where id='${expired.grant.id}' and consumer_auth_user_id='${actor.id}' and briefcase_item_id='${matterId}';`);
  await artifactDenial({item,context,id:'expired-grant-denied',check,includeLink:false,target:expired.target,ownerControl:false});
  const revoked=await freshGrant();
  await exactOwnerControl(item,revoked.target,'revoked-grant-denied');
  assert.equal(await fixture.rpc('revoke_consumer_artifact_download_grant',{p_consumer_auth_user_id:actor.id,p_briefcase_item_id:matterId,p_grant_id:revoked.grant.id}),true);
  await artifactDenial({item,context,id:'revoked-grant-denied',check,includeLink:false,target:revoked.target,ownerControl:false});
  }
  const current=await context.request.get(item.api);assert.equal(current.status(),200);const model=await current.json();
  await ownerPositiveControl(item,'stale-verification-denied');
  const corrected=await context.request.post(item.api,{data:{expectedRevision:model.revision,answers:{participant_full_legal_name:'Synthetic Clinic Artifact Correction'}}});
  assert.equal(corrected.status(),200,'Real owner material correction required');
  assert.equal((await corrected.json()).readyToGenerate,false,'Correction invalidates verification');
  await artifactDenial({item,context,id:'stale-verification-denied',check,target:artifact.target,ownerControl:false,
    expectedStatuses:artifact.mode==='sponsored'?[409]:[404],expectedCodes:artifact.mode==='sponsored'?['verification_not_current','verification_binding_mismatch']:undefined});
}
