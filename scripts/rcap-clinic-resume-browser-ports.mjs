import assert from 'node:assert/strict';
import fs from 'node:fs';
import {previewRequestHeaders,browserDeliveryPath} from './rcap-clinic-resume-network-policy.mjs';
import {installSignInSafety,signInWithRealForm} from './rcap-clinic-resume-sign-in.mjs';
import {RESUME,CHECKPOINT,queuePrivacySql,assertQueuePrivacyPrerequisites} from './rcap-clinic-resume-contract.mjs';
import {plantParticipantState,storageInventory,serverReset,runShippedDeviceReset,observeSameDeviceHandover,applyAnalyticsOptOut,ANALYTICS_OPT_OUT_PROFILE} from './rcap-clinic-resume-browser-reset.mjs';
// The SAME browser caller is used by the hosted harness and disposable local
// rehearsal. Only origin/backend/credentials differ at explicit external ports.
export function createResumeBrowserPorts({activity,origin,bypass,password,query,project,observed,helperSource=fs.readFileSync('src/lib/clinic-mode/device-reset.mjs','utf8')}){
 let owner,page,requests=0;
 const cleanEntryPath='/clinic/mississippi-volunteer-lawyers-demo';
 const downloadPath=`/api/rcap/packets/${RESUME.job}/download`;
async function context(){const c=await activity.context({acceptDownloads:false});c.on('request',r=>{if(new URL(r.url()).origin===origin&&browserDeliveryPath(new URL(r.url()).pathname))requests++;});await applyAnalyticsOptOut(c);await installSignInSafety(c);return c;}
async function signIn(c,email,next){return signInWithRealForm({context:c,origin,email,password,next,observe:proof=>observed('signInDiagnostics',proof)});}
async function probe(c,route){const r=await c.request.get(origin+route,{headers:previewRequestHeaders(bypass),maxRedirects:0});return {status:r.status(),body:await r.text()};}
const missingPath='/api/rcap/packets/00000000-0000-4000-8000-000000000000/download';
 return {
 signInOwner:async()=>{owner=await context();const signed=await signIn(owner,'mvl-demo-participant-a@rcap-acceptance.test','/briefcase');page=signed.p;assert.equal(signed.id,RESUME.owner);observed('ownerSignIn',{exactIdentity:true});},
 observeBeforeMatter:async()=>{assert.equal(requests,0,'no automatic download during direct sign-in/Briefcase landing');},
 openReadyMatter:async()=>{await page.goto(`${origin}/briefcase/${RESUME.item}`,{waitUntil:'domcontentloaded',timeout:30000});await page.locator('[data-packet-ready="true"]').waitFor({timeout:30000});await page.locator(`a[href="${downloadPath}"]`).waitFor({state:'visible'});observed('readyMatter',{ready:true,automaticDownloads:requests});},
 downloadRequests:()=>requests,
 explicitDownload:async()=>{const pending=page.waitForEvent('download');await page.locator(`a[href="${downloadPath}"]`).click();const d=await pending;assert.equal(await d.failure(),null);return fs.readFileSync(await d.path());},
 proveDenials:async()=>{const anon=await context(),stranger=await context();const signed=await signIn(stranger,'mvl-demo-participant-b@rcap-acceptance.test','/briefcase');assert.equal(signed.id,RESUME.stranger);const a=await probe(anon,downloadPath),b=await probe(stranger,downloadPath);const missing=await probe(stranger,missingPath);assert.equal(b.status,missing.status);assert.equal(b.body,missing.body);await anon.close();await stranger.close();observed('denials',{anonymous:a.status,stranger:b.status,indistinguishable:b.status===missing.status&&b.body===missing.body});return{anonymous:a.status,stranger:b.status};},
 proveStaffQueuePrivacy:async()=>{
 const rows=await query(queuePrivacySql(project));assert.equal(rows.length,1);assertQueuePrivacyPrerequisites(rows[0].evidence);
 const admin=await context(),staff=await context();try{
  const {p,id}=await signIn(admin,'mvl-demo-admin@rcap-acceptance.test',`/clinic/staff/${RESUME.event}/queue`);assert.equal(id,CHECKPOINT.admin);
  const response=await admin.request.get(`${origin}/api/clinic/events/${RESUME.event}/queue`,{headers:previewRequestHeaders(bypass),maxRedirects:0});assert.equal(response.status(),200);const body=await response.json();
  const index=body.cases.findIndex(c=>c.id===RESUME.clinicCase);assert.ok(index>=0,'exact durable admin case');const exact=body.cases[index];assert.equal(exact.participantUserId,RESUME.owner);assert.equal(exact.queueStatus,'packet_ready');assert.equal(exact.routeDisposition,'packet');
  const uiRows=p.locator('tbody tr');assert.equal(await uiRows.count(),body.cases.length);assert.equal(await uiRows.nth(index).getByLabel(`Packet status for participant ending ${RESUME.owner.slice(-8)}`).inputValue(),'packet_ready');
  const signed=await signIn(staff,'mvl-demo-staff@rcap-acceptance.test',`/clinic/staff/${RESUME.event}/queue`);assert.equal(signed.id,CHECKPOINT.staff);
  const staffResponse=await staff.request.get(`${origin}/api/clinic/events/${RESUME.event}/queue`,{headers:previewRequestHeaders(bypass),maxRedirects:0});assert.equal(staffResponse.status(),200);const staffBody=await staffResponse.json();
  const current=await query(queuePrivacySql(project));assert.equal(current.length,1);assertQueuePrivacyPrerequisites(current[0].evidence);assert.ok(!staffBody.cases.some(c=>c.id===RESUME.clinicCase),'expired exact case must be hidden from authorized ordinary staff');
  observed('queue',{partnerAdminDurableCaseVisible:true,eventStaffAuthorized:true,expiredCaseHidden:true});
  return {partnerAdminDurableCaseVisible:true,exactCaseId:RESUME.clinicCase,eventStaffAuthorized:true,expiredAssistanceCaseHiddenFromEventStaff:true,eventStaffAuthUserId:CHECKPOINT.staff,adminAuthUserId:CHECKPOINT.admin};
 }finally{await admin.close();await staff.close();}
 },
 resetDevice:async()=>{
 // Browser sign-out and device cleanup use unchanged shipped implementations,
 // driven through the factored adapter. Nothing here writes to the database:
 // the canonical closure of the LOST-cookie session is the separate port below,
 // which the contract calls only after every result returned here is asserted.
 await plantParticipantState(page);const priorState=await storageInventory(page);await serverReset(page);observed('serverReset',{signOutConfirmed:true});
 const cleanup=await runShippedDeviceReset({page,owner,helperSource,cleanEntryPath,itemId:RESUME.item,priorState});
 observed('deviceCleanup',{cookies:cleanup.cookies,storage:cleanup.storage,storageAfterEntryInit:cleanup.storageAfterEntryInit,historySafe:cleanup.historySafe,helperSucceeded:cleanup.helperReport?.ok===true,doNotTrack:cleanup.doNotTrack});
 const handover=await observeSameDeviceHandover({cleanup,owner,probe,signIn,strangerEmail:'mvl-demo-participant-b@rcap-acceptance.test',expectedStrangerId:RESUME.stranger,downloadPath,missingPath});
 observed('handover',{revokedStatus:handover.revokedStatus,exactParticipantB:handover.strangerId===RESUME.stranger,sameDeviceStranger:handover.sameDeviceStranger,indistinguishable:handover.strangerMatchesMissing});
 return {...cleanup,...handover,analyticsProfile:ANALYTICS_OPT_OUT_PROFILE};
 },
 finishBrowserActivity:()=>activity.finish(),
 assertBrowserFinished:()=>activity.assertFinished()
 };
}
