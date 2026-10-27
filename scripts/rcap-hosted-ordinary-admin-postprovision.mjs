import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {materialReceipt} from './rcap-hosted-ordinary-admin.mjs'; // Pure reader only; never call its provisioning entry point.
export const APP='c0052e13d9801d24080275aab02c70c6ea213fa3';
export const ORIGIN='https://legalease-rcap-managed-c0052e13d980-roger947s-projects.vercel.app';
export const SLUG='legalease-ordinary-qa-20261024';
export const ROOT=`/api/internal/partners/onboarding/phase1/${SLUG}`;
export const AUTHORITY='User-authorized internal RCAP acceptance allocation: one screening and one sponsored packet; no external charge.';
export const ALLOCATION_REQUEST='718e921f-4e3a-428b-bd9f-94d4095a27c7';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha=/^[a-f0-9]{64}$/;
const targets={program_goals:{service_mode:'sponsored_packets',participation_mode:'online',external_agreement_applicability:'not_applicable',operator_authority_reference:AUTHORITY},geography_audience_language_accessibility:{jurisdictions:['MS'],enable_spanish:false},access_sponsorship_capacity:{participant_access_model:'open'}};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const halt=reason=>({kind:'halt',reason,participantVerificationAllowed:false});
function operation(stage,endpoint,body,ui){return{kind:'operation',stage,endpoint,method:'POST',body,ui,requestIdMode:body.requestId?'original_fixed_request':'normal_ui_first_request_persist_before_forward',participantVerificationAllowed:false};}
function identity(configuration,operations){
 assert.equal(configuration?.partnerSlug,SLUG);assert.equal(operations?.identity?.partnerSlug,SLUG);
 assert.match(configuration.workspaceId,uuid);assert.equal(operations.identity.workspaceId,configuration.workspaceId);
 assert.equal(configuration.operatingModel,'legalease_managed');assert.equal(configuration.policyVersion,'rcap2.2');assert.equal(operations.identity.policyVersion,'rcap2.2');
 assert.ok(Number.isSafeInteger(configuration.version)&&configuration.version>=1);assert.equal(operations.identity.version,configuration.version);
 assert.equal(configuration.data?.program_goals?.operating_model,'legalease_managed');
 assert.deepEqual(configuration.data?.geography_audience_language_accessibility?.jurisdictions,['MS']);
 assert.equal(configuration.data?.geography_audience_language_accessibility?.enable_spanish,false);
}
/** Pure plan from actual normal GET objects. This module performs no I/O, Auth or business action. */
export function nextPostProvisionStep({configuration,operations,capacityProof,pending}){
 if(pending&&!pending.reconciled)return halt('pending_request_requires_reconciliation');
 try{identity(configuration,operations);}catch{return halt('unexpected_or_stale_workspace_identity');}
 const c=configuration,o=operations,v=o.view;
 if(!v||v.version!==c.version||v.partnerSlug!==SLUG)return halt('current_program_view_unavailable_or_stale');
 if(v.decision?.live){
  try{materialReceipt(o);}catch{return halt('live_program_materials_need_reconciliation');}
  if(v.capabilities?.issue_sponsored_packet!==true)return halt('live_program_capability_needs_reconciliation');
  return{kind:'program_live_stop',reason:'already_live_no_repeat_start',participantUrl:ORIGIN+'/p/'+SLUG,participantVerificationAllowed:false};
 }
 if(['paused','closed','live'].includes(c.status))return halt('unexpected_workspace_status');
 const goals=c.data.program_goals;
 if(!['screening_only','sponsored_packets'].includes(goals.service_mode)||goals.participation_mode!=='online'||goals.external_agreement_applicability!=='not_applicable'||c.data.access_sponsorship_capacity?.participant_access_model!=='open')return halt('unexpected_existing_configuration_no_overwrite');
 if(![AUTHORITY,'LegalEase operates this program under its own internal business and publication authority.'].includes(goals.operator_authority_reference))return halt('unexpected_existing_authority_reference_no_overwrite');
 const patches=[];
 for(const[section,wanted]of Object.entries(targets)){
  const base=c.data[section]??{};const values=Object.fromEntries(Object.entries(wanted).filter(([key,value])=>!same(base[key],value)));
  if(Object.keys(values).length)patches.push({section,values,base:structuredClone(base)});
 }
 if(patches.length)return operation('configuration_save',ROOT+'/configuration',{patches,expectedVersion:c.version,confirmPublicationHold:false,requestId:null},'Normal Configure fields then Save program; preserve all other current fields and sections.');
 const remaining=v.commercial;
 if(capacityProof?.workspaceId!==c.workspaceId||capacityProof?.partnerSlug!==SLUG)return halt('target_capacity_history_required');
 if(capacityProof.kind==='fresh_provision_no_allocation'){
  if(capacityProof.created!==true||capacityProof.noAllocation!==true||capacityProof.noInterveningCapacityStep!==true||![null,0].includes(remaining?.screenings)||![null,0].includes(remaining?.packets))return halt('unexpected_existing_capacity_or_usage');
  return operation('allocation',ROOT+'/launch-capacity',{requestId:ALLOCATION_REQUEST,workspaceVersion:c.version,confirmed:true,screeningsAllowed:1,packetCap:1,authorityReference:AUTHORITY},'Original one-screening/one-packet normal allocation request; use original fixed requestId and actual configured version.');
 }
 if(capacityProof.kind!=='original_one_plus_one_confirmed'||capacityProof.requestId!==ALLOCATION_REQUEST||capacityProof.confirmed!==true||capacityProof.screeningsAllowed!==1||capacityProof.packetCap!==1||capacityProof.noInterveningCapacityStep!==true||remaining?.screenings!==1||remaining?.packets!==1)return halt('allocation_or_usage_needs_reconciliation_no_topup');
 let materials;
 try{materials=materialReceipt(o);}catch{
  if(!Array.isArray(v.materials)||v.materials.length>=2)return halt('unexpected_material_receipt_requires_reconciliation');
  if(!sha.test(v.decision?.scopeHash??''))return halt('current_scope_hash_required');
  return operation('materials_prepare',ROOT+'/program',{action:'prepare',version:v.version,scopeHash:v.decision.scopeHash,reviewToken:v.reviewToken??null,confirmed:false,reason:'Platform Admin confirms current program scope and reviewed materials',...(o.preflight?.commercialAuthority?.expires_at!==undefined?{expiresAt:o.preflight.commercialAuthority.expires_at}:{}),requestId:null},'Generate Materials or Update Materials only if actual current materials are missing/stale; no repeat when current two exist.');
 }
 if(o.canStart!==true||!v.reviewToken||!sha.test(v.decision?.scopeHash??'')||o.launchDecision?.sourceVersion!==c.version)return halt('actual_launch_preflight_not_ready');
 return{...operation('start',ROOT+'/program',{action:'start',version:v.version,scopeHash:v.decision.scopeHash,reviewToken:v.reviewToken,confirmed:true,reason:'Platform Admin confirms current program scope and reviewed materials',...(o.preflight?.commercialAuthority?.expires_at!==undefined?{expiresAt:o.preflight.commercialAuthority.expires_at}:{}),requestId:null},'Actually inspect both current material DOM documents/IDs/version/hash, check Confirm operating scope and current materials, then Start Program.'),materials};
}
/** Call from an actual route guard before forwarding ONE normal UI/API request. */
export function assertPlannedRequest(plan,{url,method,body,originHeader},pending){
 assert.equal(plan.kind,'operation');assert.equal(url,ORIGIN+plan.endpoint);assert.equal(originHeader,ORIGIN);assert.equal(method,'POST');assert.match(body?.requestId??'',uuid);
 assert.deepEqual(body,{...plan.body,requestId:body.requestId});
 if(plan.body.requestId)assert.equal(body.requestId,plan.body.requestId);
 const payloadHash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 if(pending){assert.equal(pending.stage,plan.stage);assert.equal(pending.requestId,body.requestId);assert.equal(pending.payloadHash,payloadHash);}
 return{stage:plan.stage,requestId:body.requestId,payloadHash,expectedVersion:body.expectedVersion??body.workspaceVersion??body.version,participantVerificationAllowed:false};
}
/** A route adapter must await this gate before forwarding its one planned request. */
export function createStepRequestGate(plan,{pending,checkpoint}){
 assert.equal(typeof checkpoint,'function');let used=false;
 return async request=>{assert.equal(used,false,'one planned request only');const witness=assertPlannedRequest(plan,request,pending);used=true;await checkpoint(witness);return witness;};
}
