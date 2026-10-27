import assert from 'node:assert/strict';
import {CLINIC} from './rcap-hosted-existing-clinic-readonly.mjs';
import {clinicReviewRequest} from './rcap-hosted-clinic-review-queue.mjs';
const config={origin:'https://legalease-rcap-clinic-c0052e13d980-roger947s-projects.vercel.app'};
const state={revision:0,verifyAttempts:0,generateAttempts:0,verified:false};
let checks=0;
for(const path of ['/briefcase/documents?_rsc=opaque','/briefcase/settings?_rsc=opaque','/expungement-ai/support','/expungement-ai/check',`/briefcase/${CLINIC.item}/packet-information?edit=county&_rsc=opaque`,'/_next/image?url=%2Fexpungement-ai%2Fwilma-avatar.png&w=64&q=75','/expungement-ai/wilma-avatar.png']){
 assert.equal(clinicReviewRequest(config,config.origin+path,'GET',null,state),'read');checks++;
}
for(const path of ['/_next/image?url=https%3A%2F%2Fother.test%2Fimage.png&w=64&q=75','/_next/image?url=%2Fapi%2Frcap%2Fpackets%2Fother%2Fdownload&w=64&q=75','/_next/image?url=%2Fexpungement-ai%2Fwilma-avatar.png&w=64&q=75&url=other',`/briefcase/${CLINIC.item}/packet-information?edit=county&edit=other`,'/briefcase/other-case/packet-information?edit=county','/api/expungement-ai/packet/download?briefcaseItemId=other-case']){
 assert.equal(clinicReviewRequest(config,config.origin+path,'GET',null,state),null);checks++;
}
assert.equal(clinicReviewRequest(config,config.origin+`/api/expungement-ai/briefcase/${CLINIC.item}/packet-information`,'POST',{answers:{county:'do-not-write'},verify:true,expectedRevision:0},state),null);checks++;
assert.equal(clinicReviewRequest(config,config.origin+'/api/expungement-ai/checkout','POST',{briefcaseItemId:CLINIC.item},state),null);checks++;
console.log(`${checks} focused actual review prefetch/avatar reads and foreign-object/write denial checks PASS; no browser or live calls.`);
