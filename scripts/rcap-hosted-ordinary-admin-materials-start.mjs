import assert from 'node:assert/strict';
import {nextPostProvisionStep,createStepRequestGate} from './rcap-hosted-ordinary-admin-postprovision.mjs';
const sha=/^[a-f0-9]{64}$/;
/** Projection must come from actual current DOM/document reads, never an offline fixture as evidence. */
export function assertCurrentMaterialReview(plan,review){
 assert.equal(plan.kind,'operation');assert.equal(plan.stage,'start');assert.equal(review?.actualContentRead,true);
 assert.equal(review.sourceVersion,plan.body.version);assert.equal(review.scopeHash,plan.body.scopeHash);assert.equal(review.reviewToken,plan.body.reviewToken);
 assert.equal(review.rows?.length,2);assert.equal(new Set(review.rows.map(r=>r.id)).size,2);
 for(const m of plan.materials){const r=review.rows.find(r=>r.id===m.id);assert.ok(r);assert.equal(r.attributeVersion,m.version);assert.equal(r.attributeHash,m.hash);assert.equal(r.visible,true);assert.ok(Number.isSafeInteger(r.textLength)&&r.textLength>0);assert.match(r.textSha256,sha);}
 return{sourceVersion:plan.body.version,matchedMaterialCount:2,materialVersions:plan.materials.map(m=>m.version),materialHashes:plan.materials.map(m=>m.hash),renderedTextHashes:review.rows.map(r=>r.textSha256)};
}
/** Only the two later program operations; never delegates backward to provision/config/capacity. */
export function nextMaterialsStartStep(snapshot,review){
 const plan=nextPostProvisionStep(snapshot);
 if(plan.kind!=='operation')return plan;
 if(!['materials_prepare','start'].includes(plan.stage))return{kind:'halt',reason:'prior_stage_actual_state_not_satisfied',participantVerificationAllowed:false};
 if(plan.stage==='start'){
  if(!review)return{kind:'read_current_materials',reason:'actual_current_DOM_content_review_required',materials:plan.materials,sourceVersion:plan.body.version,participantVerificationAllowed:false};
  return{...plan,reviewSummary:assertCurrentMaterialReview(plan,review)};
 }
 return plan;
}
export function createMaterialsStartGate(snapshot,review,{checkpoint,pending}){
 const plan=nextMaterialsStartStep(snapshot,review);assert.equal(plan.kind,'operation');
 const gate=createStepRequestGate(plan,{pending,checkpoint:async witness=>checkpoint({...witness,...(plan.stage==='start'?{review:plan.reviewSummary}:{}),participantVerificationAllowed:false})});
 return{plan,gate};
}
