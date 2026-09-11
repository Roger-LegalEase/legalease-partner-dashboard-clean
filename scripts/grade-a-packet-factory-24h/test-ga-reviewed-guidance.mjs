import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import { assessGeorgiaReviewedGuidance, applyGeorgiaGuidanceAcceptance, GA_STAGE_REVIEW } from './ga-reviewed-guidance.mjs';
import { assessWashingtonReviewedGuidance } from './wa-reviewed-guidance.mjs';
import { GA_GUIDANCE, preserveTreatmentAcceptance } from './treatment-reconciliation.mjs';
const root=process.cwd(), original=JSON.parse(fs.readFileSync(GA_STAGE_REVIEW));
const current=new Map(), pinned=new Map();
function readBytes(p){if(!current.has(p))current.set(p,fs.readFileSync(p));return current.get(p);}
function readHistorical(c,p){const k=c+':'+p;if(!pinned.has(k))pinned.set(k,execFileSync('git',['show',k],{maxBuffer:2**26}));return pinned.get(k);}
const run=(review=original,extra={})=>assessGeorgiaReviewedGuidance(root,{readBytes:p=>p===GA_STAGE_REVIEW?Buffer.from(JSON.stringify(review)):readBytes(p),readHistorical,...extra});
const good=run();assert.equal(good.eligible,true,good.reason);
for(const change of [
 r=>r.stageIds.pop(),r=>r.secondPetitionGenerated=true,r=>r.independentlyReviewed=false,
 r=>r.editsNothingItVerifies=false,r=>r.commercialAuthority=true,r=>r.separatePetitionFamilyId='wrong-family',
 r=>r.failedObligations.push('SERVICE'),r=>r.reviewedFiles=r.reviewedFiles.filter(f=>!f.path.endsWith('boundary.pdf')),
 r=>r.reviewedFiles.push(r.reviewedFiles[0]),r=>r.verifiedAtBase='main'
]){const r=structuredClone(original);change(r);assert.equal(run(r).eligible,false);}
assert.equal(run(original,{readHistorical:()=>Buffer.from('different historical bytes')}).eligible,false);
const target=original.reviewedFiles.find(f=>f.path.endsWith('canonical.pdf')).path;
assert.equal(run(original,{readBytes:p=>p===target?Buffer.from('changed packet'):p===GA_STAGE_REVIEW?Buffer.from(JSON.stringify(original)):readBytes(p)}).eligible,false);
const treatment={familyId:GA_GUIDANCE};
assert.equal(applyGeorgiaGuidanceAcceptance('COMPLETE_PACKET_PROVEN',preserveTreatmentAcceptance('COMPLETE_PACKET_PROVEN',treatment),good),'GUIDANCE_READY');
assert.equal(applyGeorgiaGuidanceAcceptance('COMPLETE_PACKET_PROVEN',preserveTreatmentAcceptance('COMPLETE_PACKET_PROVEN',treatment),{eligible:false}),'PRODUCT_PATH_PENDING');
for(const state of ['BUILT_RASTER_PENDING','FAIL_REPAIR_REQUIRED','LEGAL_BLOCKED','SOURCE_BLOCKED','PRODUCT_PATH_PENDING','VERIFY_PENDING'])assert.equal(applyGeorgiaGuidanceAcceptance(state,preserveTreatmentAcceptance(state,treatment),good),state);
console.log('GA stage adapter: current reviewed bytes pass; 12 missing/tampered-review controls refuse; incomplete packet gates never promote.');

const wa = assessWashingtonReviewedGuidance(root);
assert.equal(wa.eligible, true, `GA change invalidated existing Washington reviewed input: ${wa.reason}`);
console.log('Existing Washington guidance review remains current on its exact pinned bytes.');
