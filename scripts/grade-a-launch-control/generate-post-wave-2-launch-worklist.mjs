#!/usr/bin/env node
/** Existing national worklist/freeze, reconciled from native evidence; no admission. */
import fs from 'node:fs';
import { CURRENT_SERVICE_REVIEW } from './verified-current-service-preflight.mjs';
import {groupReleaseGapCauses} from './release-gap-causes.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reconcileReleaseEvidence, RELEASE_DIMENSIONS} from './reconcile-release-evidence.mjs';
import {composedArtifactReportBindings} from './composed-artifact-report-bindings.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');process.chdir(ROOT);
const CHECK=process.argv.includes('--check');
const shaBytes=b=>crypto.createHash('sha256').update(b).digest('hex');
const INPUTS=['data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json','data/rcap-grade-a/route-obligation-census-v1/FREEZE.json','data/rcap-grade-a/fulfillment-authority-registry.json','data/rcap-grade-a/fulfillment-authority-projection.json','data/rcap-ledger/launch-graph.json'];
const inputDigests={};
const composedAdapterPath='scripts/grade-a-launch-control/composed-artifact-report-bindings.mjs';
inputDigests[composedAdapterPath]=shaBytes(fs.readFileSync(composedAdapterPath));
const read=p=>{const b=fs.readFileSync(p);inputDigests[p]=shaBytes(b);return JSON.parse(b);};
const [masterQueue,freeze,registry,projection,launchGraph]=INPUTS.map(read);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const savedWorklistPath='data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json';
let atCaptainHead=head;
if(CHECK && fs.existsSync(savedWorklistPath)){
 const saved=JSON.parse(fs.readFileSync(savedWorklistPath,'utf8'));
 if(saved.schemaVersion==='rcap-grade-a-post-wave-2-national-launch-worklist/v2'){
  execFileSync('git',['merge-base','--is-ancestor',saved.atCaptainHead,head]);
  atCaptainHead=saved.atCaptainHead;
 }
}
// No default baseline, no inferred346 completion, and no overwritten approval pins.
let baseline=null;const flag=process.argv.indexOf('--baseline-binding');
const defaultBinding='data/rcap-grade-a/launch-control/FAMILY_BASELINE_BINDING.json';
if(flag>=0 || fs.existsSync(defaultBinding)){
 const bindingPath=flag>=0 ? process.argv[flag+1] : defaultBinding;
 if(!bindingPath||bindingPath.startsWith('--'))throw new Error('--baseline-binding requires a JSON path');
 const supplied=read(bindingPath);
 try{
  if(!/^[a-f0-9]{40}$/.test(supplied.commitSha??''))throw new Error('Baseline requires exact40-character commit SHA');
  execFileSync('git',['merge-base','--is-ancestor',supplied.commitSha,head]);
  const bytes=execFileSync('git',['show',`${supplied.commitSha}:${INPUTS[0]}`],{maxBuffer:64*1024*1024});
  if(shaBytes(bytes)!==supplied.masterQueueSha256||inputDigests[INPUTS[0]]!==supplied.masterQueueSha256)throw new Error('Baseline queue digest disagrees with pinned or current queue bytes');
  baseline={verified:true,commitSha:supplied.commitSha,masterQueueSha256:supplied.masterQueueSha256,bindingPath,bindingSha256:inputDigests[bindingPath]};
 }catch(error){baseline={verified:false,reason:error.message,bindingPath};}
}
const artifactBindings={};
for(const f of masterQueue.families){
 if(typeof f.directory!=='string')continue;
 const reportPath=path.posix.join(f.directory,'reports/rendered-artifacts.json');
 if(!fs.existsSync(reportPath))continue;
 const report=read(reportPath);
 if(report.familyId!==f.familyId)continue; // No directory-name or alias inference.
 const bounded=['wy_fel_1502-set','dc_innocence_expungement-set'].includes(f.familyId)
  ? composedArtifactReportBindings({familyId:f.familyId,directory:f.directory,report,readBytes:p=>{const b=fs.readFileSync(p);inputDigests[p]=shaBytes(b);return b;}}) : null;
 artifactBindings[f.familyId]={path:reportPath,sha256:inputDigests[reportPath],packets:bounded?.packets??report.packets??[],
  ...(bounded?{bytesVerified:bounded.bytesVerified,refusal:bounded.refusal}:{}),
  measurementScope:bounded?.measurementScope??'Preserved native report bindings; this generator does not rerender or re-review artifacts.'};
}
const reconciliation=reconcileReleaseEvidence({masterQueue,registry,projection,launchGraph,baseline,artifactBindings});
const causeHelper='scripts/grade-a-launch-control/release-gap-causes.mjs';
inputDigests[causeHelper]=shaBytes(fs.readFileSync(causeHelper));
inputDigests['scripts/grade-a-launch-control/verified-current-service-preflight.mjs']=shaBytes(fs.readFileSync('scripts/grade-a-launch-control/verified-current-service-preflight.mjs'));
const serviceReviewPath='data/rcap-grade-a/participant-data-rights/service-preflight-independent-review-34843210160.json';
const ncInquiryPath='data/rcap-grade-a/packet-factory-24h/prerequisite-resolution-20260914/nc-dna-institutional-question-not-sent.json';
const vercelReviewPath='data/rcap-grade-a/participant-data-rights/vercel-identity-independent-review-20260914.json';
const ncOwnerScopePath='data/record-clearing/legal-decisions/2026-09-14-nc-146-core-and-conditional-dna-scope.json';
const supabaseReviewPath='data/rcap-grade-a/participant-data-rights/service-preflight-independent-review-34857707932.json';
const sharedCauses=groupReleaseGapCauses(reconciliation.gaps,{
 currentServiceReview:fs.existsSync(CURRENT_SERVICE_REVIEW)?read(CURRENT_SERVICE_REVIEW):null,
 reconciledFamilies:reconciliation.families,
 supabaseReview:fs.existsSync(supabaseReviewPath)?read(supabaseReviewPath):null,supabaseReviewPath,
 ncOwnerScope:fs.existsSync(ncOwnerScopePath)?read(ncOwnerScopePath):null,ncOwnerScopePath,currentQueueSha256:inputDigests[INPUTS[0]],
 serviceReview:fs.existsSync(serviceReviewPath)?read(serviceReviewPath):null,serviceReviewPath,
 ncInquiry:fs.existsSync(ncInquiryPath)?read(ncInquiryPath):null,ncInquiryPath,
 vercelReview:fs.existsSync(vercelReviewPath)?read(vercelReviewPath):null,vercelReviewPath,
 readSuccessorBytes:p=>{const real=fs.realpathSync(p);if(!real.startsWith(ROOT+path.sep))throw new Error('Successor custody leaves workspace');const bytes=fs.readFileSync(p);inputDigests[p]=shaBytes(bytes);return bytes;}
});
const oldLinks=['source_bound','artifact_built','independently_verified','output_approved','product_path_proven'];
const families=reconciliation.families.map(f=>{
 const native=masterQueue.families.find(n=>n.familyId===f.familyId);
 const every=d=>f.routes.length>0&&f.routes.every(r=>r.dimensions[d].status==='SATISFIED');
 const chain={source_bound:native.sourceBound===true,artifact_built:native.artifactStatus==='RENDERED',independently_verified:native.selectedIndependentVerdict?.verdict==='PASS_COMPLETE_INDEPENDENT',output_approved:f.packetSaleApplicable&&every('output_approval'),product_path_proven:f.packetSaleApplicable&&every('hosted_acceptance')};
 return {...f,implementationStrategy:native.implementationStrategy,sourceCustody:native.sourceReadiness,chain,linksHeld:oldLinks.filter(k=>chain[k]).length,firstMissingLink:f.missingObligations[0]?.dimension??null,verification:native.selectedIndependentVerdict??{verdict:'NOT_YET_VERIFIED'},nextOwner:native.activeOwner??null,commercialState:'CLOSED'};
});
const countBy=key=>families.reduce((a,f)=>(a[f[key]??'none']=(a[f[key]??'none']??0)+1,a),{});
const worklist={schemaVersion:'rcap-grade-a-post-wave-2-national-launch-worklist/v2',generatedBy:'scripts/grade-a-launch-control/generate-post-wave-2-launch-worklist.mjs',question:'For each exact current family and route, which release obligations remain evidenced or missing?',atCaptainHead,
 censusDenominator:{obligations:freeze.totals?.totalObligations,categoryA:freeze.totals?.categoryA,packetFamilies:families.length,historicalCensusPacketFamilies:freeze.totals?.packetFamilies},
 theChain:{links:RELEASE_DIMENSIONS,rule:'Terminal treatment, runtime reachability, output approval, fulfillment, hosted acceptance and Production are separate dimensions. Terminal non-packet dispositions are not packet sales. Missing baseline remains closed.'},
 counts:{families:families.length,launchReady:0,sourceBound:families.filter(f=>f.chain.source_bound).length,artifactBuilt:families.filter(f=>f.chain.artifact_built).length,independentlyVerified:families.filter(f=>f.chain.independently_verified).length,outputApproved:families.filter(f=>f.chain.output_approved).length,productPathProven:0,byFirstMissingLink:countBy('firstMissingLink'),byVerificationVerdict:families.reduce((a,f)=>(a[f.verification.verdict]=(a[f.verification.verdict]??0)+1,a),{})},
 releaseReconciliation:{baseline:reconciliation.baseline,dimensions:reconciliation.dimensions,counts:reconciliation.counts,gaps:reconciliation.gaps,sharedCauses},
 commercial:{commercialRoutesOpened:0,completePacketProven:projection.counters?.completePacketProven??null,commerciallyEligible:projection.counters?.commerciallyEligible??null,rule:'Native fulfillment projection is reported separately from family terminal states; this worklist creates no approval or commercial admission.'},launchGate:reconciliation.launchGate,families};
const output='data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json';
const frozenOutput='data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST_FREEZE.json';
const bytes=JSON.stringify(worklist,null,2)+'\n';
const frozen={schemaVersion:'rcap-grade-a-post-wave-2-launch-worklist-freeze/v2',frozenAs:'POST WAVE 2 NATIONAL LAUNCH WORKLIST',frozenAtHead:atCaptainHead,worklist:output,worklistSha256:shaBytes(bytes),inputDigests,baseline:reconciliation.baseline,whatThisFreezeIs:['Exact native family denominator and route-specific release gaps.','Preserved source/artifact/review references and input hashes.'],whatThisFreezeIsNot:['Not approval, deployment authorization, a fulfillment record or runtime authority.','Terminal packet/guidance/handoff/exclusion evidence is not a sale authorization.'],totals:worklist.counts,commercialRoutesOpened:0,completePacketProven:projection.counters?.completePacketProven??null,launchGate:'CLOSED'};
let stale=false;
for(const [p,value]of [[output,bytes],[frozenOutput,JSON.stringify(frozen,null,2)+'\n']]){
 if(CHECK){if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==value){console.error(`Regeneration required: ${p}`);stale=true;}}
 else fs.writeFileSync(p,value);
}
console.log(JSON.stringify({families:families.length,terminal:reconciliation.counts.terminal,baseline:reconciliation.baseline.status,gaps:reconciliation.counts.byDimension,launchGate:'CLOSED',check:CHECK}));
if(stale)process.exitCode=1;
