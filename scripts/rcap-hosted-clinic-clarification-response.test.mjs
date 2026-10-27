import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {clinicClarificationResponse} from './rcap-hosted-clinic-clarification-response.mjs';
import {packetFieldValue} from './rcap-packet-builder-filler.mjs';
import {MISSISSIPPI_SYNTHETIC_ROUTE} from './rcap-ms-nonconviction-synthetic-facts.mjs';
import {CLINIC} from './rcap-hosted-existing-clinic-readonly.mjs';
import {planClinicUnverifiedSave} from './rcap-hosted-clinic-unverified-save-plan.mjs';
import {saveExistingClinicDraft} from './rcap-hosted-clinic-unverified-save.mjs';
const recordIds=['county','court_name','case_number','disposition_date'];
const model={ok:true,revision:1,readyToGenerate:false,questions:recordIds.map(id=>({id,type:'text',prompt:id})),answers:Object.fromEntries(recordIds.map(id=>[id,packetFieldValue(id,id,MISSISSIPPI_SYNTHETIC_ROUTE)])),recordClarificationIds:[...recordIds],missingInputIds:[...recordIds],pendingDerivations:[],courtRecordConflict:false,contactReconciliation:null,resumeSectionId:null};
let checks=0;
const check=f=>{f();checks++;};
const planned=clinicClarificationResponse(model);
check(()=>assert.equal(planned.status,'ORIGINAL_RECORD_CONFIRMATION_CANDIDATE'));
check(()=>assert.deepEqual(planned.candidateBody,{answers:{},verify:false,expectedRevision:1,confirmRecordFacts:recordIds,resumeSectionId:null,navigationIntent:'stay'}));
check(()=>assert.equal(planned.executionAllowed,false));
check(()=>assert.equal(planned.provenance.length,4));
check(()=>assert(!JSON.stringify(planned).includes(model.answers.case_number)));
for(const [mutate,reason] of [
 [m=>m.revision=2,'saved_revision_or_model_shape'],
 [m=>m.recordClarificationIds.push('unknown_field'),'unmapped_original_record_field'],
 [m=>m.recordClarificationIds.push('county'),'clarification_identity'],
 [m=>m.answers.county='different preserved prefill','saved_prefill_differs_from_original_fixture'],
 [m=>delete m.answers.county,'current_record_answer_unavailable'],
 [m=>m.courtRecordConflict=true,'court_record_conflict'],
 [m=>m.contactReconciliation={required:true},'contact_reconciliation_requires_actual_source'],
 [m=>m.pendingDerivations=[{factId:'server_derived'}],'server_derivations_pending'],
 [m=>m.missingInputIds.push('another_missing_field'),'additional_current_inputs_missing'],
 [m=>m.questions[0].type='unsupported_wire','current_record_wire_type'],
 [m=>{m.questions[0].type='single_choice';m.questions[0].options=['unsupported'];},'original_record_wire_mapping'],
 [m=>m.resumeSectionId='not-current-section','resume_section_not_current']
]){const m=structuredClone(model);mutate(m);const held=clinicClarificationResponse(m);check(()=>assert.equal(held.status,'HOLD_RECONCILE'));check(()=>assert.equal(held.reason,reason));check(()=>assert(!held.candidateBody));}
const clean={...model,recordClarificationIds:[],missingInputIds:[]};check(()=>assert.equal(clinicClarificationResponse(clean).status,'NO_RECORD_CLARIFICATIONS_REMAIN'));
const wrapped=structuredClone(model);wrapped.answers.county={value:wrapped.answers.county,unknown:false};check(()=>assert.equal(clinicClarificationResponse(wrapped).status,'ORIGINAL_RECORD_CONFIRMATION_CANDIDATE'));
const unknown=structuredClone(model);unknown.answers.county={value:unknown.answers.county,unknown:true};check(()=>assert.equal(clinicClarificationResponse(unknown).status,'HOLD_RECONCILE'));
// Actual existing orchestration with an explicit I/O double; no extra read or write.
const ids=JSON.parse(fs.readFileSync(new URL('./clinic-original-question-ids.fixture.json',import.meta.url)));
const before={...model,revision:0,reviewPath:`/briefcase/${CLINIC.item}/review`,nextAction:'continue_packet',answers:{original_screening_fact:'preserved'},questions:ids.map(id=>({id,type:'text',prompt:id})),missingInputIds:ids};
const originalPlan=planClinicUnverifiedSave(before);const after={...before,revision:1,answers:{...before.answers,...originalPlan.body.answers},recordClarificationIds:recordIds,missingInputIds:recordIds};
const root=process.env.CLINIC_PERSISTED_RESUME_ROOT;assert(root);
const native=JSON.parse(fs.readFileSync(path.join(root,'hosted-fulfillment-20261027/clinic-purpose-deploy-execution/run-40448248665/extracted/deploy.json')));
const binding=JSON.parse(fs.readFileSync(new URL('./clinic-readonly-native-binding.json',import.meta.url)));
const config={origin:binding.origin,deploymentId:binding.deploymentId,toolsSha:CLINIC.tools,controllerSha:CLINIC.controller,savedCaseSha256:(await import('./rcap-hosted-existing-clinic-readonly.mjs')).hash(CLINIC.item)};
const calls=[];let reads=0;
const io={release:async()=>{calls.push('release');return{status:503,json:{application:'RCAP 2.0',policyVersion:'rcap2.2',buildSha:CLINIC.app,runtimeSha:CLINIC.app,sourceBound:false}}},login:async()=>calls.push('login'),read:async()=>{calls.push('read');return reads++===0?before:after},save:async body=>{calls.push('save');assert.deepEqual(body,originalPlan.body);return after}};
const result=await saveExistingClinicDraft(config,native,io);
check(()=>assert.deepEqual(calls,['release','login','read','save','read']));
check(()=>assert.equal(result.customerWriteAttempts,1));
check(()=>assert.equal(result.recordClarification.status,'ORIGINAL_RECORD_CONFIRMATION_CANDIDATE'));
check(()=>assert.equal(result.recordClarification.executionAllowed,false));
console.log(`${checks} focused actual-response provenance/HOLD/orchestration checks PASS; I/O is explicitly mocked, no live calls.`);
