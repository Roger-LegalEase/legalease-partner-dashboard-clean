import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// These are measured against an artifact created by the real owner generation
// path. An unavailable artifact leaves each applicable case NOT_RUN, never PASS.
export const artifactCases = [
  'owner-provenance-and-exact-bytes','owner-repeat-download','staff-owner-artifact-denied',
  'wrong-participant-denied','wrong-program-denied','unassigned-staff-denied',
  'queue-only-staff-denied','signed-out-replay-denied','missing-token-denied',
  'altered-token-denied','wrong-item-token-denied','no-assist-staff-denied',
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
    evidence.cases.every(row=>row.status==='PASS')?'PASS':'PARTIAL';
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
  if(![401,403,404].includes(status)||!privateHeaders(headers)||bytes.subarray(0,5).toString()==='%PDF-')return false;
  try {
    const body=JSON.parse(bytes.toString());
    return !Object.keys(body).some(key=>/artifact|storage|grant|download|token|path|url/i.test(key))
      && !/packet-artifacts\/|\/storage\/v1\/|https?:\/\//i.test(JSON.stringify(body));
  } catch { return false; }
}
export async function acceptRealArtifact({fixture,context,matterId,ownerId,response,evidence,check}) {
  uuid(matterId);uuid(ownerId);
  assert(fixture.actors.some(actor=>actor.id===ownerId)&&fixture.known.has(matterId),'Only run-owned artifacts');
  const target=protectedArtifactPath(response.headers().location,fixture.origin,matterId);
  // Administrative reads corroborate provenance; they never fetch or authorize
  // measured bytes. Only the ordinary authenticated owner request does that.
  const provenance=fixture.checked(await fixture.admin.from('consumer_packet_artifact_provenance')
    .select('consumer_auth_user_id,matter_id,render_job_id,verification_hash,artifact,revision')
    .eq('briefcase_item_id',matterId).single());
  const job=fixture.checked(await fixture.admin.from('packet_render_jobs')
    .select('consumer_auth_user_id,consumer_briefcase_item_id,matter_id,consumer_verification_hash,status,delivery_eligibility,accounting_result,output_sha256,output_byte_count,output_storage_path')
    .eq('id',provenance.render_job_id).single());
  const metadataValid=provenance.consumer_auth_user_id===ownerId&&job.consumer_auth_user_id===ownerId
    &&job.consumer_briefcase_item_id===matterId&&job.matter_id===provenance.matter_id
    &&job.consumer_verification_hash===provenance.verification_hash
    &&['artifact_validated','delivered'].includes(job.status)&&job.delivery_eligibility==='eligible'
    &&['zero_charge','consumed','already_consumed','overage_consumed'].includes(job.accounting_result)
    &&provenance.artifact?.source==='verified_render_job'&&provenance.artifact?.provider==='rcap_durable_render_v1'
    &&provenance.artifact.renderJobId===provenance.render_job_id
    &&provenance.artifact.artifactSha256===job.output_sha256&&provenance.artifact.storagePath===job.output_storage_path
    &&/^[a-f0-9]{64}$/.test(job.output_sha256)&&Number.isInteger(job.output_byte_count)&&job.output_byte_count>0;
  const expected={sha256:job.output_sha256,byteLength:job.output_byte_count};
  const bytesResponse=await context.request.get(target,{maxRedirects:0});
  const bytes=await bytesResponse.body();
  const pass=metadataValid&&privateHeaders(response.headers())&&exactArtifactResponse(bytesResponse.status(),bytesResponse.headers(),bytes,expected);
  record(evidence,check,'owner-provenance-and-exact-bytes',pass);
  assert(pass,'Actual owner PDF must match independently read finalized job/provenance');
  evidence.reason=null;evidence.identity={...expected,renderJobIdSha256:digest(provenance.render_job_id),revision:provenance.revision};
  const repeated=await context.request.get(target,{maxRedirects:0});
  record(evidence,check,'owner-repeat-download',exactArtifactResponse(repeated.status(),repeated.headers(),await repeated.body(),expected));
  // Neither the opaque grant nor the object path is serialized in evidence.
  return {target,matterId,ownerId,expected,evidence,origin:fixture.origin};
}
async function ownerPositiveControl(item,caseId) {
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
export async function artifactDenial({item,context,id,check,includeLink=true,target,ownerControl=true}) {
  if(!item.artifact)return;
  if(ownerControl)await ownerPositiveControl(item,id);
  const selectedTarget=typeof target==='function'?target(item.artifact.target):target??item.artifact.target;
  const paths=[selectedTarget];
  if(includeLink)paths.push(`/api/expungement-ai/packet/download-link?briefcaseItemId=${item.matterId}&participantId=${item.actor.id}`);
  let pass=true;
  for(const path of paths){
    const response=await context.request.get(path,{maxRedirects:0,headers:{'cache-control':'no-cache'}});
    pass=privateDenialResponse(response.status(),response.headers(),await response.body())&&pass;
  }
  record(item.artifact.evidence,check,id,pass);
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
  } finally { await anonymous.close(); }
}
export async function artifactAfterConsentRevocation({item,fixture,check}) {
  if(!item.artifact)return;
  await artifactDenial({item,context:item.selectedHelper.context,id:'revoked-consent-staff-denied',check});
  const grant=await item.context.request.get(`/api/expungement-ai/packet/download-link?briefcaseItemId=${item.matterId}`,{maxRedirects:0});
  assert.equal(grant.status(),303,'Ending assistance does not remove owner download authority');
  item.artifact.target=protectedArtifactPath(grant.headers().location,fixture.origin,item.matterId);
  const response=await item.context.request.get(item.artifact.target,{maxRedirects:0});
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
  const current=await context.request.get(item.api);assert.equal(current.status(),200);const model=await current.json();
  await ownerPositiveControl(item,'stale-verification-denied');
  const corrected=await context.request.post(item.api,{data:{expectedRevision:model.revision,answers:{participant_full_legal_name:'Synthetic Clinic Artifact Correction'}}});
  assert.equal(corrected.status(),200,'Real owner material correction required');
  assert.equal((await corrected.json()).readyToGenerate,false,'Correction invalidates verification');
  await artifactDenial({item,context,id:'stale-verification-denied',check,target:artifact.target,ownerControl:false});
}
