import assert from 'node:assert/strict';

// A new execution requires owner authorization for this identity; it is not the spent 401528 attempt.
export const CLINIC_FRESH_ATTEMPT=Object.freeze({
 id:'71403c61-b073-4ece-a95c-99da50c3bf8d',eventId:'77000000-0000-4000-8000-000000000055',
 priorRequestId:'aca01bff-cd19-4c75-b1dc-630588d3680d',redemptionId:'3a6f7921-a71c-4ca8-bae4-9292b63473cf',
 capacity:20,entries:16,maxUses:1,startsAt:'2026-09-25T02:28:08.978166+00:00',endsAt:'2026-10-26T02:28:08.978166+00:00',
 history:Object.freeze([
  Object.freeze({id:'77000000-0000-4000-8000-000000000057',maxUses:2,usesCount:2,redemptionRows:15,startsAt:'2026-09-25T02:28:08.978166+00:00',expiresAt:'2026-10-26T02:28:08.978166+00:00'}),
  Object.freeze({id:'5fe1f896-c735-4ef4-838e-d86a4b293d86',maxUses:1,usesCount:1,redemptionRows:1,startsAt:'2026-10-25T02:02:30.379+00:00',expiresAt:'2026-10-25T02:17:30.379+00:00'})
 ])
});
export function assertClinicAttemptAuthority(env) {
 assert.equal(env.RCAP_BROWSER_CLINIC_ATTEMPT_ID,CLINIC_FRESH_ATTEMPT.id,'An explicitly authorized fresh attempt identity is required');
 assert.equal(env.GITHUB_RUN_ATTEMPT,'1','A rerun cannot create a replacement Clinic entitlement');
}
export function assertClinicHistoricalCodes(codes,newCodeId=null) {
 assert.ok(Array.isArray(codes),'Clinic code inventory must be readable');
 assert.equal(new Set(codes.map(c=>c.id)).size,codes.length,'Duplicate code inventory');
 assert.equal(codes.length,CLINIC_FRESH_ATTEMPT.history.length+(newCodeId?1:0),'Changed or previously issued code inventory requires reconciliation');
 if(newCodeId)assert.ok(!CLINIC_FRESH_ATTEMPT.history.some(c=>c.id===newCodeId),'A historical code cannot become the new entitlement');
 return CLINIC_FRESH_ATTEMPT.history.map(expected=>{
  const actual=codes.find(c=>c.id===expected.id);assert.ok(actual,'Missing historical code');
  assert.equal(actual.eventId,CLINIC_FRESH_ATTEMPT.eventId);assert.equal(actual.maxUses,expected.maxUses);assert.equal(actual.usesCount,expected.usesCount);
  assert.equal(actual.isActive,true,'Historical code activation changed');
  for(const key of ['startsAt','expiresAt'])assert.equal(Date.parse(actual[key]),Date.parse(expected[key]),'Historical code validity changed');
  return {id:actual.id,eventId:actual.eventId,maxUses:actual.maxUses,usesCount:actual.usesCount,isActive:actual.isActive,startsAt:actual.startsAt,expiresAt:actual.expiresAt};
 });
}
export function assertClinicEventWindow(event,now) {
 assert.equal(Date.parse(event.startsAt),Date.parse(CLINIC_FRESH_ATTEMPT.startsAt),'Event start changed');
 assert.equal(Date.parse(event.endsAt),Date.parse(CLINIC_FRESH_ATTEMPT.endsAt),'Event end changed');
 assert.ok(Date.parse(event.startsAt)<=now&&now<Date.parse(event.endsAt),'existing event is outside its actual window');
}
export function assertClinicAttemptCapacity(report) {
 assert.equal(report?.eventId,CLINIC_FRESH_ATTEMPT.eventId);assert.equal(report.eventStatus,'published');
 assert.equal(report.capacity,CLINIC_FRESH_ATTEMPT.capacity,'Event capacity changed');
 assert.equal(report.entries,CLINIC_FRESH_ATTEMPT.entries,'Redemption history changed');
 assert.ok(report.capacity-report.entries>=1,'No event entry capacity remains');
}
export function qualifyClinicCodeHistory(inventory) {
 try {
  assertClinicHistoricalCodes(inventory.map(c=>({id:c.id,eventId:CLINIC_FRESH_ATTEMPT.eventId,maxUses:c.max_uses,usesCount:c.uses_count,isActive:c.is_active,startsAt:c.starts_at,expiresAt:c.expires_at})));
  for(const h of CLINIC_FRESH_ATTEMPT.history)assert.equal(inventory.find(c=>c.id===h.id).redemption_rows,h.redemptionRows,'Historical redemption count changed');
  return true;
 }catch{return false;}
}
export function qualifyClinicFreshInventory(operational) {
 try {
  assert.ok(qualifyClinicCodeHistory(operational.existing_code_inventory));
  assert.equal(operational.existing_code_available,false,'Existing usable code requires reconciliation');
  assertClinicAttemptCapacity(operational.fresh_attempt?.event);
  assert.deepEqual(operational.fresh_attempt.priorRedemption,{id:CLINIC_FRESH_ATTEMPT.redemptionId,codeId:CLINIC_FRESH_ATTEMPT.history[1].id,closed:false,assisted:false});
  return true;
 }catch{return false;}
}
