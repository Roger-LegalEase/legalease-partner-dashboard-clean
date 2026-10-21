import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { assessConnecticutReviewedGuidance, CT_GUIDANCE_FAMILIES, CT_GUIDANCE_REVIEW } from '../../../../../../../scripts/grade-a-packet-factory-24h/ct-reviewed-guidance.mjs';

const out='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/resume-independent-ia-review/ct-absolute-pardon-readiness';
const helperPath='scripts/grade-a-packet-factory-24h/ct-reviewed-guidance.mjs';
const originalSource=fs.readFileSync(helperPath,'utf8');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const publication=execFileSync('git',['log','-1','--format=%H','--',CT_GUIDANCE_REVIEW],{encoding:'utf8'}).trim();
const family=CT_GUIDANCE_FAMILIES.find(f=>f.includes('ct-absolute-pardon'));
const actual=assessConnecticutReviewedGuidance(process.cwd(),family);
assert.equal(actual.eligible,true,actual.reason);
assert.equal(actual.reviewPublicationCommit,publication);
fs.writeFileSync(out+'/actual-committed-ct-assessment.json',JSON.stringify({reviewer:'/root/session10_admission_review',observedHead:head,assessment:actual},null,2)+'\n');

// Instrument only immutable IO for distinct hypothetical later HEADs. The
// exact assessment/acceptance function bodies are unchanged and no repository
// code or Git refs are modified. Actual candidate reads still use real Git.
let syntheticHead='e'.repeat(40);
globalThis.__session10CtReviewExec=(command,args)=>{
  assert.equal(command,'git');
  if(JSON.stringify(args)===JSON.stringify(['rev-parse','HEAD']))return syntheticHead+'\n';
  assert.deepEqual(args,['log','-1','--format=%H','--',CT_GUIDANCE_REVIEW]);
  return publication+'\n';
};
const instrumented=originalSource
  .replace("import { execFileSync } from 'node:child_process';",'const execFileSync = globalThis.__session10CtReviewExec;')
  .replace("from './treatment-reconciliation.mjs'",`from '${pathToFileURL(process.cwd()+'/scripts/grade-a-packet-factory-24h/treatment-reconciliation.mjs').href}'`);
assert.notEqual(instrumented,originalSource);
const mod=await import('data:text/javascript,'+encodeURIComponent(instrumented));
const show=(commit,path)=>execFileSync('git',['show',commit+':'+path],{maxBuffer:32*1024*1024});
const observations=[];
const evaluate=(mutate=null)=>mod.assessConnecticutReviewedGuidance(process.cwd(),family,{readHistorical:(commit,path)=>mutate?.(commit,path)??show(commit===syntheticHead?publication:commit,path)});
const after=evaluate();assert.equal(after.eligible,true,after.reason);
observations.push({name:'later unrelated HEAD preserves complete generated assessment',passed:JSON.stringify(after)===JSON.stringify(actual)});
syntheticHead='f'.repeat(40);
const later=evaluate();observations.push({name:'second later unrelated HEAD preserves complete generated assessment',passed:JSON.stringify(later)===JSON.stringify(actual)});
for(const [name,target,scope]of[
  ['current committed review drift refused',CT_GUIDANCE_REVIEW,'head'],
  ['current committed PDF drift refused',actual.reviewedOutputs[0].path,'head'],
  ['current committed source evidence drift refused',actual.checked.find(x=>x.path.endsWith('ct-application-instructions.html.gz')).path,'head'],
  ['stable publication evidence drift refused',actual.reviewedOutputs[0].path,'publication'],
]){
  const bad=evaluate((commit,path)=>path===target&&commit===(scope==='head'?syntheticHead:publication)?Buffer.from('changed bytes'):null);
  observations.push({name,passed:!bad.eligible,reason:bad.reason});
}

// Apply the exact state-integration block now installed by Captain to all
// current family states. Existing WA assessment is supplied unchanged from
// MASTER_QUEUE; only the newly reviewed CT absolute family may transition.
const generatorPath='scripts/grade-a-packet-factory-24h/generate.mjs';
const generator=fs.readFileSync(generatorPath,'utf8');
const start=generator.indexOf('  const ctGuidanceAssessment = assessConnecticutReviewedGuidance(ROOT, familyId);');
const end=generator.indexOf('  families.push({',start);assert(start>=0&&end>start);
const body=generator.slice(start,end)+'\nreturn {state, reviewedTreatmentGuidance};';
const execute=new Function('familyId','state','treatment','ROOT','WA_AUTOMATIC','assessWashingtonReviewedGuidance','assessConnecticutReviewedGuidance','preserveTreatmentAcceptance','applyConnecticutGuidanceAcceptance','independentReturn','verifierSourceHold','readiness','nineZero','legalBlocked','deliveryTypeRefusal',body);
const treatment=await import(pathToFileURL(process.cwd()+'/scripts/grade-a-packet-factory-24h/treatment-reconciliation.mjs').href);
const master=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json')).families;
const returns=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json')).rows;
const map=new Map(returns.filter(x=>!x.superseded).map(x=>[x.familyId,x]));
function apply(row,change={}){
  const c={state:row.state,independentReturn:map.get(row.familyId),verifierSourceHold:row.verifierSourceHold,readiness:row.sourceReadiness,nineZero:row.allNineCountersZero,legalBlocked:row.state==='LEGAL_BLOCKED',deliveryTypeRefusal:row.ownerDeliveryTypeRefusal,...change};
  return execute(row.familyId,c.state,row.treatmentReconciliation,process.cwd(),treatment.WA_AUTOMATIC,()=>row.reviewedTreatmentGuidance,assessConnecticutReviewedGuidance,treatment.preserveTreatmentAcceptance,mod.applyConnecticutGuidanceAcceptance,c.independentReturn,c.verifierSourceHold,c.readiness,c.nineZero,c.legalBlocked,c.deliveryTypeRefusal);
}
const transitions=master.map(row=>({familyId:row.familyId,before:row.state,after:apply(row).state})).filter(x=>x.before!==x.after);
observations.push({name:'only exact independently reviewed CT family changes across all current families',passed:transitions.length===1&&transitions[0].familyId===family&&transitions[0].after==='GUIDANCE_READY',transitions,familiesChecked:master.length});
const ct=master.find(x=>x.familyId===family);
for(const[name,change]of[
  ['current legal hold',{state:'LEGAL_BLOCKED',legalBlocked:true}],
  ['current owner delivery refusal',{state:'WRONG_DELIVERY_TYPE',deliveryTypeRefusal:{reason:'new refusal'}}],
  ['current measured defect',{state:'FAIL_REPAIR_REQUIRED',nineZero:false}],
  ['current unavailable source',{state:'SOURCE_BLOCKED',readiness:{ready:false}}],
  ['later independent failure',{state:'FAIL_REPAIR_REQUIRED',independentReturn:{...map.get(family),verifiedAtBase:'a'.repeat(40),verdict:'FAIL_REPAIR_REQUIRED',failedObligations:[{obligation:'COMPONENT_SET',finding:'new measured failure'}]}}],
  ['unclosed current source hold',{state:'SOURCE_BLOCKED',verifierSourceHold:{reason:'new independent source hold'}}],
]){const r=apply(ct,change);observations.push({name:'preserve '+name,passed:r.state===change.state&&r.reviewedTreatmentGuidance.eligible===false,result:r.state});}
const report={reviewer:'/root/session10_admission_review',actualObservedHead:head,stableReviewPublication:publication,
  reviewedFiles:[helperPath,generatorPath,'scripts/grade-a-packet-factory-24h/test-ct-reviewed-guidance.mjs',CT_GUIDANCE_REVIEW].map(path=>({path,sha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')})),
  observations,passed:observations.filter(x=>x.passed).length,total:observations.length,sharedFilesEdited:false,
  originalIndependentAttributionPreserved:true,actualAssessmentAdmissionPerformed:false,
  scope:'Actual committed custody plus IO-instrumented convergence/refusal controls; exact integrated state block exercised against all current family states. No source/PDF/review/queue mutation.'};
fs.writeFileSync(out+'/stable-ct-admission-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,transitions,stableReviewPublication:publication}));
assert.equal(report.passed,report.total);
