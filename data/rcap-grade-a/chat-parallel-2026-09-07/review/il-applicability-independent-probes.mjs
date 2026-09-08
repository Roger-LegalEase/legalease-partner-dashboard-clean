#!/usr/bin/env node
// Independent read-only helper tests. Never import the packet host or renderer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [root,out]=process.argv.slice(2);assert.ok(root && out);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const input=path.join(root,'scripts/rcap-packet-recovery/chat3/il-input-contract.mjs');
const policy=path.join(root,'scripts/rcap-packet-recovery/chat3/il-field-applicability.mjs');
const before=[input,policy].map(x=>hash(fs.readFileSync(x)));
const {validateSealingRecord}=await import(pathToFileURL(input));
const {EDUCATION_FIELD,fieldCompletionPolicy,expectedComponents,assertFullComponentSet}=await import(pathToFileURL(policy));
const tests=[];const run=(name,fn)=>{fn();tests.push({case:name,passed:true});};
const base={caseNumber:'CASE-2137',arrestAgency:'Synthetic Agency',charge:'Synthetic recorded charge',arrestDate:'01/01/2020',outcome:'FC',full:'Synthetic Applicant',street:'Synthetic address',phone:'555-0100'};
for(const email of [undefined,null,'',' ', 'test@example.invalid'])run('email:'+String(email),()=>assert.equal(validateSealingRecord({...base,email}).email,email));
for(const v of ['unknown','Dismissed','DA','MC',null])run('invalid-outcome:'+String(v),()=>assert.throws(()=>validateSealingRecord({...base,outcome:v}),/WRONG_EDUCATION_ROUTE_OUTCOME|REQUIRED_BEFORE_FILING/));
for(const v of ['unknown','Enter the actual charge','CASE-2137',''])run('invalid-charge:'+v,()=>assert.throws(()=>validateSealingRecord({...base,charge:v}),/REQUIRED_BEFORE_FILING/));
for(const facts of [{},{educationVerified:true,proofAttached:true},{syntheticEducationScenario:{lastSentenceCompleted:true,firstCompletionOfSameGoal:true}},{educationVerified:false}])run('education-remains-unasserted:'+JSON.stringify(facts),()=>{
 const x=fieldCompletionPolicy('EXP-AD Request',EDUCATION_FIELD,facts);assert.equal(x.noAutomaticAttestation,true);assert.equal(x.routeDetermined,false);assert.equal(x.completionActor,'participant');
});
for(const doc of ['EXP-AD Request','EXP-AD Order Granting','EXP-AD Order Denying','FW-CIV-APPLICATION'])run('optional-email-policy:'+doc,()=>assert.equal(fieldCompletionPolicy(doc,'Last - Email',{email:null}).requiredBeforeFiling,false));
for(const status of ['qualifying','none',null])run('financial-and-hardship:'+String(status),()=>{
 const f={feeBenefitStatus:status};const x=fieldCompletionPolicy('FW-CIV-APPLICATION','19 - My Employment Total',f);const y=fieldCompletionPolicy('FW-CIV-APPLICATION','107-110 - Hardship',f);
 assert.equal(x.requiredBeforeFiling,status!=='qualifying');assert.equal(y.requiredBeforeFiling,false);
 if(status==='qualifying')assert.equal(x.completenessDisposition,'NOT_APPLICABLE_ON_THIS_ROUTE');else assert.ok(x.requiredWhen);
});
run('held-hardship-retained-for-ordinary-mapper',()=>assert.equal(fieldCompletionPolicy('FW-CIV-APPLICATION','107-110 - Hardship',{feeBenefitStatus:'none',hardship:'Truthful supplied narrative'}),null));
run('qualifying-skip-takes-priority',()=>assert.equal(fieldCompletionPolicy('FW-CIV-APPLICATION','107-110 - Hardship',{feeBenefitStatus:'qualifying',hardship:'Supplied but skipped'}).requiredBeforeFiling,false));
run('sponsorship-not-benefit',()=>assert.equal(fieldCompletionPolicy('FW-CIV-APPLICATION','19 - My Employment Total',{sponsored:true}).requiredBeforeFiling,true));
for(const requested of [true,false])run('complete-component-identities:'+requested,()=>{const ids=expectedComponents({waiverRequested:requested});assert.equal(ids.length,requested?6:4);assertFullComponentSet(ids.map(documentId=>({documentId})),{waiverRequested:requested});});
run('sponsorship-not-waiver',()=>assert.equal(expectedComponents({sponsored:true,email:null}).length,4));
for(const id of ['EXP-AD Order Denying','FW-CIV-ORDER','FW-CIV-APPLICATION'])run('missing-required:'+id,()=>assert.throws(()=>assertFullComponentSet(expectedComponents({waiverRequested:true}).filter(x=>x!==id).map(documentId=>({documentId})),{waiverRequested:true}),/MISSING_REQUIRED_COMPONENT/));
run('old-four-source-set-rejected',()=>assert.throws(()=>assertFullComponentSet(['EXP-AD Request','EXP-AD Case List','EXP-AD Order Granting','FW-CIV-APPLICATION'].map(documentId=>({documentId})),{waiverRequested:true}),/MISSING_REQUIRED_COMPONENT/));
run('unrequested-waiver-rejected',()=>assert.throws(()=>assertFullComponentSet(expectedComponents({waiverRequested:true}).map(documentId=>({documentId})),{waiverRequested:false}),/unrequested/));
run('duplicate-component-rejected',()=>assert.throws(()=>assertFullComponentSet([...expectedComponents({waiverRequested:false}),'EXP-AD Request'].map(documentId=>({documentId})),{waiverRequested:false}),/duplicate/));
run('wrong-order-rejected',()=>assert.throws(()=>assertFullComponentSet(expectedComponents({waiverRequested:false}).reverse().map(documentId=>({documentId})),{waiverRequested:false}),/order/));
for(const val of ['true',null,1])run('waiver-type:'+String(val),()=>assert.throws(()=>validateSealingRecord({...base,waiverRequested:val}),/INVALID_WAIVER_REQUEST/));
for(const val of ['SNAP',true,{}])run('benefit-type:'+JSON.stringify(val),()=>assert.throws(()=>validateSealingRecord({...base,feeBenefitStatus:val}),/INVALID_BENEFIT_STATUS/));
assert.deepEqual([input,policy].map(x=>hash(fs.readFileSync(x))),before);
const r={schemaVersion:'chatb-il-applicability-helper-tests/v1',nodeVersion:process.version,inputHelperSha256:before[0],policyHelperSha256:before[1],tests,summary:{cases:tests.length,passed:tests.length,inputHelpersUnchanged:2,fullBuilderExecutions:0},scope:'Direct helper and component-identity-list probes only. These do not provide missing official PDF bytes, run a full packet renderer, prove new order field maps, or grant independent packet approval.'};
fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.summary));
