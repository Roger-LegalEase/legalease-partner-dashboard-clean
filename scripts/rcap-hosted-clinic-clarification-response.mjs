import {isDeepStrictEqual} from 'node:util';
import {hash} from './rcap-hosted-existing-clinic-readonly.mjs';
import {MS_NONCONVICTION_PACKET_ANSWERS} from './lib/rcap-ms-nonconviction-fixture.mjs';
import {MISSISSIPPI_SYNTHETIC_ROUTE} from './rcap-ms-nonconviction-synthetic-facts.mjs';
import {packetFieldValue,chooseOption} from './rcap-packet-builder-filler.mjs';
const originalFixtureSha256='fa2a3882607cb68bcc432dcaa2782268575a9c02bf8757c17a48dfe85e29cbaf';
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)?value.unknown===false?value.value:undefined:value;
const supportedText=new Set(['text','textarea','text_or_unknown','date','date_or_unknown','number_or_range']);
const supportedChoice=new Set(['single_choice','multi_select','yes_no_unsure','yes_no_prefer_not_to_say']);

// Classify only the actual owner recovery response. This function makes no calls
// and never writes answers, confirms records, verifies facts or grants funding.
export function clinicClarificationResponse(model){
 const result={schema:'clinic-original-record-clarification-response/v1',originalFixtureSha256,status:'HOLD_RECONCILE',executionAllowed:false,finalVerification:false,funding:false,enqueue:false,workerAllowed:false};
 const hold=reason=>({...result,reason});
 if(model?.ok!==true||model.revision!==1||model.readyToGenerate!==false||!Array.isArray(model.questions)||!Array.isArray(model.recordClarificationIds)||!Array.isArray(model.pendingDerivations)||!Array.isArray(model.missingInputIds)||!model.answers||typeof model.answers!=='object'||Array.isArray(model.answers))return hold('saved_revision_or_model_shape');
 const ids=model.recordClarificationIds;
 if(ids.length>5||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)return hold('clarification_identity');
 Object.assign(result,{actualRevision:model.revision,actualClarificationCount:ids.length,actualMissingInputCount:model.missingInputIds.length,actualPendingDerivationCount:model.pendingDerivations.length,actualClarificationIdsSha256:hash(JSON.stringify(ids))});
 if(model.courtRecordConflict!==false)return hold('court_record_conflict');
 const questions=[...model.questions,...(Array.isArray(model.reviewQuestions)?model.reviewQuestions:[])];
 const provenance=[];
 for(const id of ids){
  // Unrecognized IDs never enter a typed artifact as an arbitrary server string.
  if(!Object.hasOwn(MS_NONCONVICTION_PACKET_ANSWERS,id))return hold('unmapped_original_record_field');
  const q=questions.find(q=>q?.id===id);
  if(!q||q.answerContract||!Object.hasOwn(model.answers,id))return hold('current_record_answer_unavailable');
  let expected;
  try{
   if(supportedChoice.has(q.type)){
    const options=q.type==='yes_no_unsure'?['Yes','No','I am not sure']:q.type==='yes_no_prefer_not_to_say'?['Yes','No','Prefer not to say']:q.options;
    if(!Array.isArray(options)||!options.length)return hold('current_record_wire_options');
    expected=chooseOption(id,q.prompt??id,options,MISSISSIPPI_SYNTHETIC_ROUTE);
    if(q.type==='multi_select')expected=[expected];
   }else{
    if(!supportedText.has(q.type))return hold('current_record_wire_type');
    expected=packetFieldValue(id,q.prompt??id,MISSISSIPPI_SYNTHETIC_ROUTE);
   }
  }catch{return hold('original_record_wire_mapping');}
  if(!isDeepStrictEqual(plain(model.answers[id]),plain(expected)))return hold('saved_prefill_differs_from_original_fixture');
  provenance.push({fieldId:id,sourceKey:`MS_NONCONVICTION_PACKET_ANSWERS.${id}`,currentSavedAnswerMatchesOriginalFixture:true});
 }
 Object.assign(result,{actualClarificationIds:[...ids],provenance});
 if(model.contactReconciliation)return hold('contact_reconciliation_requires_actual_source');
 if(model.pendingDerivations.length)return hold('server_derivations_pending');
 if(model.missingInputIds.some(id=>!ids.includes(id)))return hold('additional_current_inputs_missing');
 if(ids.length===0)return {...result,status:'NO_RECORD_CLARIFICATIONS_REMAIN',nextBoundary:'separate_actual_window_and_final_verification'};
 if(model.resumeSectionId!=null&&(typeof model.resumeSectionId!=='string'||!/^[a-z][a-z0-9_-]{0,79}$/.test(model.resumeSectionId)||!Array.isArray(model.sections)||!model.sections.some(s=>s.id===model.resumeSectionId)))return hold('resume_section_not_current');
 return {...result,status:'ORIGINAL_RECORD_CONFIRMATION_CANDIDATE',requiresCurrentRecordReview:true,candidateBody:{answers:{},verify:false,expectedRevision:model.revision,confirmRecordFacts:[...ids],resumeSectionId:model.resumeSectionId??null,navigationIntent:'stay'}};
}
