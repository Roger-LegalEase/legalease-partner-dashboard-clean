import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root=process.cwd();
const {classifyAzParticipantInputBundle:classify,AZ_REQUIRED_PARTICIPANT_INPUTS:defs}=await import(pathToFileURL(path.join(root,'scripts/build-census-v1-az_set_aside-set.mjs')));
const checks=[];function check(label,condition){assert.ok(condition,label);checks.push({label,result:'PASS'});}
const missing=classify({},4);check('Exactly four named participant inputs',defs.map(x=>x.key).join(',')==='sentenceImposed,offenseClasses,conditionsFulfilled,certificateRequested');
check('No absent answer fabricated',missing.every(x=>x.collectionStatus==='not_provided'&&x.required&&x.builderMayInfer===false&&x.participantAuthored));
check('All missing questions have a form destination',missing.every(x=>x.question&&x.formDestination&&x.blocksPacketReadyUntilProvided));
const full={sentenceImposed:'Two years probation, restitution and community service as stated in the judgment.',offenseClasses:['Class 1 misdemeanor','Class 2 misdemeanor','Class 3 misdemeanor','Class 1 misdemeanor'],conditionsFulfilled:{conditionsFulfilled:true,discharged:true,dischargeDate:'2024-02-29'},certificateRequested:false};
const provided=classify(full,4);check('Actual complete bundle accepted, including false certificate request',provided.every(x=>x.collectionStatus==='provided'));
check('Provided does not mean transferred or ready for filing',provided.every(x=>x.blocksPacketReadyUntilProvided&&/transfer/.test(x.validationCode)));
check('Participant certificate request never becomes court decision',provided.find(x=>x.key==='certificateRequested').courtDecision===false&&/Do not mark any Form 31\(b\)/.test(provided.find(x=>x.key==='certificateRequested').formDestination));
for(const [key,value] of [['sentenceImposed',' '],['offenseClasses',['Class 1']],['offenseClasses',['1','2','3',' ']],['conditionsFulfilled',{conditionsFulfilled:true,discharged:true}],['conditionsFulfilled',{conditionsFulfilled:true,discharged:true,dischargeDate:'2023-02-29'}],['conditionsFulfilled',{conditionsFulfilled:'yes',discharged:true,dischargeDate:'2024-02-29'}],['certificateRequested','yes']]){
 const rows=classify({...full,[key]:value},4);check(`Reject malformed ${key}: ${JSON.stringify(value)}`,rows.find(x=>x.key===key).collectionStatus==='invalid');
}
for(const value of [{conditionsFulfilled:false,discharged:true,dischargeDate:'2024-02-29'},{conditionsFulfilled:true,discharged:false}]){const r=classify({...full,conditionsFulfilled:value},4).find(x=>x.key==='conditionsFulfilled');check(`Explicit noncompletion/discharge stops filing: ${JSON.stringify(value)}`,r.collectionStatus==='provided'&&r.blocksSelfHelpFiling===true&&r.selfHelpTreatment.includes('Stop before filing'));}
check('Five-count fixture requires exactly five offence classes',classify(full,5).find(x=>x.key==='offenseClasses').collectionStatus==='invalid');
const out='data/rcap-grade-a/packet-factory-24h/warp-20260912/az/input-followup/independent-review/independent-input-behavior.json';
assert.equal(fs.existsSync(out),false);fs.writeFileSync(out,JSON.stringify({schemaVersion:'rcap-independent-input-behavior/v1',familyId:'az_set_aside-set',method:'Independent test cases exercising the current pure classifier; no builder execution and no PDF generation',checks,pass:checks.length,fail:0,scenarios:{missing,provided}},null,2)+'\n');console.log(JSON.stringify({pass:checks.length,fail:0,out}));
