import assert from 'node:assert/strict';
import {CLINIC_SETUP,clinicSetupRequestAllowed,clinicSetupSafePathname} from './rcap-clinic-setup-only-boundary.mjs';
export const CLINIC_CODE_ADMIN=Object.freeze({
  id:'bf40fd9f-cdb7-4530-be79-5b31f0f13eb1',email:'mvl-demo-admin@rcap-acceptance.test',
  oldCodeId:'77000000-0000-4000-8000-000000000057',requestId:'aca01bff-cd19-4c75-b1dc-630588d3680d'
});
const eventPath=`/api/clinic/events/${CLINIC_SETUP.event}`;
export function clinicAdminCodeRequestAllowed(method,address) {
  const url=new URL(address);
  if (url.origin!==CLINIC_SETUP.origin) return clinicSetupRequestAllowed(method,address);
  if (['GET','HEAD'].includes(method)) return clinicSetupRequestAllowed(method,address);
  return method==='POST' && [eventPath+'/access-codes','/api/analytics/web','/api/events/product'].includes(url.pathname);
}
export async function issueClinicSetupCode(io) {
  const actor=await io.normalLogin();
  assert.equal(actor.id,CLINIC_CODE_ADMIN.id,'normal test-admin identity mismatch');
  assert.equal(actor.partnerAdminVisible,true,'normal partner-admin role was not verified');
  const workspace=await io.readWorkspace();
  assert.equal(workspace.status,200,'normal event workspace must be authorized');
  assert.equal(workspace.json?.success,true);
  const event=workspace.json.workspace?.event;
  assert.equal(event?.id,CLINIC_SETUP.event);assert.equal(event.partnerSlug,'mvl-demo');
  assert.equal(event.publicSlug,CLINIC_SETUP.slug);assert.equal(event.jurisdiction,'MS');
  assert.equal(event.status,'published');assert.notEqual(event.experience,'legal_aid');
  const now=io.now(),starts=Date.parse(event.startsAt),ends=Date.parse(event.endsAt);
  assert.ok(Number.isFinite(starts)&&Number.isFinite(ends)&&starts<=now&&now<ends,'existing event is outside its actual window');
  assert.equal(workspace.json.workspace.accessCodes?.length,1,'changed or already renewed code inventory requires reconciliation');
  const old=workspace.json.workspace.accessCodes[0];
  assert.equal(old.id,CLINIC_CODE_ADMIN.oldCodeId);
  assert.equal(old?.eventId,CLINIC_SETUP.event);assert.equal(old.maxUses,2);assert.equal(old.usesCount,2,'old code must be confirmed exhausted');
  const body={requestId:CLINIC_CODE_ADMIN.requestId,maxUses:1,
    startsAt:new Date(now).toISOString(),expiresAt:new Date(Math.min(ends,now+15*60*1000)).toISOString()};
  const safe={httpStatus:null,actorId:actor.id,eventId:CLINIC_SETUP.event,codeId:null,maxUses:1,status:'attempting'};
  await io.saveAttempt(safe);
  const response=await io.createCode(body);
  const codeId=response.json?.accessCode?.id;
  const validId=typeof codeId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(codeId);
  await io.saveResult({...safe,httpStatus:response.status,codeId:validId?codeId:null,status:response.status===201?'created':'refused'});
  assert.equal(response.status,201,'normal one-code API request was refused; do not retry');
  assert.equal(response.json?.success,true);assert.ok(validId,'normal API did not return a code identity');
  const code=response.json.accessCode.code;
  assert.ok(typeof code==='string'&&/^CLINIC-[A-Z0-9_-]{8,120}$/.test(code),'normal API did not return a valid private code');
  const readback=await io.readWorkspace();
  assert.equal(readback.status,200);assert.equal(readback.json?.success,true);
  assert.equal(readback.json.workspace?.event?.id,CLINIC_SETUP.event);
  assert.equal(readback.json.workspace.event.partnerSlug,'mvl-demo');
  const codes=readback.json.workspace.accessCodes;
  assert.equal(codes?.length,2,'code inventory changed during issuance');
  const saved=codes.find(row=>row.id===codeId),historical=codes.find(row=>row.id===CLINIC_CODE_ADMIN.oldCodeId);
  assert.equal(saved?.eventId,CLINIC_SETUP.event);assert.equal(saved.maxUses,1);assert.equal(saved.usesCount,0);
  assert.equal(saved.isActive,true);assert.equal(Date.parse(saved.startsAt),Date.parse(body.startsAt));
  assert.equal(Date.parse(saved.expiresAt),Date.parse(body.expiresAt));
  assert.equal(historical?.maxUses,2);assert.equal(historical.usesCount,2);
  await io.saveVerified({...safe,httpStatus:201,codeId,status:'verified_unredeemed'});
  return code;
}

export async function requireClinicAdminControls(page) {
  const controls=page.locator('#clinic-codes');
  const failure=page.getByRole('heading',{name:/^(Clinic event unavailable|Clinic access denied|Application error|Server error)/i}).first();
  const ready=await Promise.race([
    controls.waitFor({state:'visible',timeout:15000}).then(()=>true),
    failure.waitFor({state:'visible',timeout:15000}).then(()=>false)
  ]);
  assert.equal(ready,true,'Scoped Clinic event page reports an error; no code request was made');
}
export async function captureClinicAdminFailure(page,diagnostic,env) {
  diagnostic.currentPathname=clinicSetupSafePathname(page.url(),env);
  const heading=page.getByRole('heading',{name:/^(Clinic event unavailable|Clinic access denied|Application error|Server error)/i}).first();
  const title=await heading.innerText({timeout:1000}).catch(()=>null);
  const known=title?.match(/^(Clinic event unavailable|Clinic access denied|Application error|Server error)/i)?.[1];
  diagnostic.inlineError=known?known.toLowerCase().replaceAll(' ','_'):diagnostic.inlineError??'unclassified_admin_page_failure';
}
