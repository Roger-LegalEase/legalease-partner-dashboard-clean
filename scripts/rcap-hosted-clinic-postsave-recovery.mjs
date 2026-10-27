import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import fs from 'node:fs';
import {CLINIC,hash,admitClinic,clinicRuntime} from './rcap-hosted-existing-clinic-readonly.mjs';
import {assertConsumerPurposeRelease} from './rcap-hosted-consumer-purpose-release.mjs';
import {projectClinicPacketInformation} from './rcap-hosted-clinic-packet-information-readonly.mjs';
import {planClinicUnverifiedSave} from './rcap-hosted-clinic-unverified-save-plan.mjs';
import {clinicClarificationResponse} from './rcap-hosted-clinic-clarification-response.mjs';
import {MS_NONCONVICTION_SCREENING_ANSWERS} from './lib/rcap-ms-nonconviction-fixture.mjs';
const originalIds=JSON.parse(fs.readFileSync(new URL('./clinic-original-question-ids.fixture.json',import.meta.url)));
const PACKET=`/api/expungement-ai/briefcase/${CLINIC.item}/packet-information`;
const EDITING='?editingFact=social_security_number';
const known=value=>value&&typeof value==='object'&&!Array.isArray(value)?value.unknown===false?value.value:undefined:value;
const safeId=id=>typeof id==='string'&&/^[a-z][a-z0-9_]{0,99}$/.test(id);
export function admitAcceptedClinicSave(witness){
 assert.equal(witness.before.phase,'before_unverified_save');assert.equal(witness.before.expectedRevision,0);assert.equal(witness.before.verify,false);assert.equal(witness.before.newAnswerCount,47);assert.equal(witness.before.originalPrefillCount,10);assert.equal(witness.before.customerWriteAttempts,1);
 assert.equal(witness.before.payloadSha256,'4df3239618b518272fc8d52f6f1fe4d8214931331f41f3bf589c500e740cb9d4');assert.equal(witness.before.questionIdsSha256,'76836461fa965e36ba20c6c8c15ce57922e6277ebd38fa1ade9485910e2a25ff');
 assert.equal(witness.response.phase,'unverified_save_response');assert.equal(witness.response.observedHttpStatus,200);assert.equal(witness.response.authPosts,1);assert.equal(witness.response.customerWriteAttempts,1);
 assert.equal(witness.result.phase,'unverified_save_response');assert.equal(witness.result.errorClass,'AssertionError');assert.equal(witness.result.customerWriteAttempts,1);assert.equal(witness.result.verify,false);assert.equal(witness.result.payloadSha256,witness.before.payloadSha256);
 assert(originalIds.includes('social_security_number'),'accepted original47 included the sensitive editing field');
 return true;
}
export function projectClinicSavedRecovery(response,witness){
 admitAcceptedClinicSave(witness);const projection=projectClinicPacketInformation(response),model=response.json;
 const result={...projection,acceptedPriorCasHttp:200,expectedSavedRevision:1,savedRevisionMatches:model.revision===1,originalPrefillsTenExactComparisonAvailable:false,sourceSupportedSensitiveQuery:true,sensitiveIdentifierReturned:Object.hasOwn(model.answers,'social_security_number'),customerWrites:0,confirmation:false,participantVerificationAllowed:false,checkoutAllowed:false,workerAllowed:false};
 const ids=value=>{assert(Array.isArray(value));const accepted=value.filter(safeId);if(accepted.length!==value.length){result.unsafeMetadataIdsPresent=true;result.unsafeMetadataIdsSha256=hash(JSON.stringify(value));}return accepted;};
 result.actualMissingInputIds=ids(model.missingInputIds);result.actualRecordClarificationIds=ids(model.recordClarificationIds);
 result.actualPendingDerivationIds=ids(model.pendingDerivations.map(d=>d.factId));
 const screening=Object.entries(MS_NONCONVICTION_SCREENING_ANSWERS).map(([id,value])=>({fieldId:id,knownValueMatchesOriginal: isDeepStrictEqual(known(model.answers[id]),value)}));
 result.originalScreeningSeven=screening;result.originalScreeningSevenRecovered=screening.every(f=>f.knownValueMatchesOriginal);
 // Reconstruct only the already accepted submitted body, never a new save/model.
 // The HTTP200 witness's payload hash decides whether this reconstruction matches.
 try{
  const reconstruction=planClinicUnverifiedSave({...model,revision:0,answers:{},missingInputIds:originalIds,pendingDerivations:[],readyToGenerate:false,nextAction:'continue_packet',courtRecordConflict:false,resumeSectionId:null});
  result.acceptedPayloadReconstructionMatches=reconstruction.payloadSha256===witness.before.payloadSha256;
  const rawMismatch=[],knownMismatch=[];
  for(const[id,expected]of Object.entries(reconstruction.body.answers)){
   if(!isDeepStrictEqual(model.answers[id],expected))rawMismatch.push(id);
   if(!isDeepStrictEqual(known(model.answers[id]),known(expected)))knownMismatch.push(id);
  }
  result.original47RawWireMismatchIds=rawMismatch;result.original47KnownValueMismatchIds=knownMismatch;
  result.original47KnownValuesRecovered=knownMismatch.length===0;
  result.rawEqualityOnlyMismatch=result.acceptedPayloadReconstructionMatches&&rawMismatch.length>0&&knownMismatch.length===0;
 }catch{result.acceptedPayloadReconstructionMatches=false;result.reconstructionHeld=true;}
 result.recordClarification=clinicClarificationResponse(model);
 result.status=model.revision===1&&model.readyToGenerate===false?'EXISTING_DRAFT_RECOVERED_READONLY_NO_FORWARD':'HOLD_SAVED_REVISION_RECONCILIATION';
 return result;
}
export function clinicRecoveryRequestAllowed(config,url,method){
 const u=new URL(url);if(u.username||u.password||u.hash)return false;
 if(method==='POST')return u.href===`https://${CLINIC.project}.supabase.co/auth/v1/token?grant_type=password`;
 return method==='GET'&&u.origin===config.origin&&((u.pathname==='/api/rcap/release'&&!u.search)||(u.pathname===PACKET&&u.search===EDITING));
}
export async function createClinicRecoveryRuntime(config,env,witness,{fetcher=fetch,onObservation=()=>{}}={}){
 admitAcceptedClinicSave(witness);let packetReads=0;
 const guarded=async(url,options)=>{
  let actual=url;
  if(options.method==='GET'&&url===new URL(PACKET,config.origin).href){assert.equal(++packetReads,1,'only one recovery GET');actual=url+EDITING;}
  assert(clinicRecoveryRequestAllowed(config,actual,options.method));
  return fetcher(actual,options);
 };
 const existing=await clinicRuntime(config,env,guarded,onObservation);
 return {get:existing.get,login:existing.login};
}
export async function recoverSavedClinicDraft(config,native,witness,io,checkpoint){
 admitClinic(config,native);admitAcceptedClinicSave(witness);assert.equal(typeof checkpoint,'function');
 assertConsumerPurposeRelease(await io.get('/api/rcap/release'),'clinic_deploy');await io.login();
 await checkpoint({phase:'before_postsave_recovery_get',acceptedPriorCasHttp:200,sourceSupportedSensitiveQuery:true,customerWrites:0});
 const response=await io.get(PACKET);await checkpoint({phase:'postsave_recovery_get_response',observedHttpStatus:response.status,customerWrites:0});
 await checkpoint({phase:'postsave_recovery_counts',...projectClinicPacketInformation(response),customerWrites:0});
 const result=projectClinicSavedRecovery(response,witness);await checkpoint({phase:'postsave_recovery_observed',...result});
 return {schema:'existing-clinic-postsave-get-recovery/v1',...result};
}
