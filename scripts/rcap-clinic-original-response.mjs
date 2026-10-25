import assert from 'node:assert/strict';
import {previewRequestHeaders,withoutPreviewHeaders} from './rcap-clinic-resume-network-policy.mjs';
const captured=new WeakMap();
const resultCodes=['packet_ready','packet_ready_with_caution','needs_more_info','not_yet','guidance_only','not_covered_yet','likely_not_eligible','needs_review','hard_stop'];
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const paths={
 '/api/expungement-ai/evaluate':'evaluation','/api/expungement-ai/screening/progress':'progress',
 '/api/clinic/entry':'entry','/api/clinic/assistance/start':'assistance',
 '/api/expungement-ai/screening/complete':'completion','/api/expungement-ai/screening/pending':'pending',
 '/api/expungement-ai/screening/pending/claim':'claim','/api/expungement-ai/packet/generate':'generation'
};
export function originalResponseOperation(request,{origin,authOrigin}) {
 const url=new URL(request.url());
 if(request.method()==='GET'&&url.origin===origin&&url.pathname==='/api/expungement-ai/profiles/MS'&&!url.search&&!url.hash&&!url.username&&!url.password)return 'profile';
 if(request.method()!=='POST'||url.username||url.password||url.hash)return null;
 if(url.origin===authOrigin&&url.pathname==='/auth/v1/token'&&url.search==='?grant_type=password')return 'signin';
 if(url.origin!==origin||url.search)return null;
 if(url.pathname==='/api/clinic/session/reset') {
  let action;try {action=request.postDataJSON()?.action??'close';}catch{return 'reset_unknown';}
  return ['prepare','close','complete'].includes(action)?`reset_${action}`:'reset_unknown';
 }
 return Object.hasOwn(paths,url.pathname)?paths[url.pathname]:null;
}
function exactPath(value,pathname,origin) {
 if(typeof value!=='string')return false;
 try {const url=new URL(value,origin);return url.origin===origin&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname===pathname;}catch{return false;}
}
export function projectOriginalResponse(operation,httpStatus,body,config,requestShape={}) {
 const result={operation,httpStatus,bodyState:'parsed',outcome:'contract_mismatch',accepted:false};
 if(operation==='progress'&&['invalid_request','unsupported_jurisdiction','profile_version_mismatch','question_lifecycle_metadata_invalid'].includes(body?.error))result.errorCode=body.error;
 if(httpStatus!==200||body?.success===false||body?.ok===false) {
  // A prepared reset deliberately reports success=false until its close phase.
  if(!(operation==='reset_prepare'&&httpStatus===200&&body?.prepared===true))return {...result,outcome:'application_refusal'};
 }
 if(!body||typeof body!=='object'||Array.isArray(body))return {...result,outcome:'malformed_response'};
 let accepted=false,values={};
 switch(operation) {
  case 'profile':accepted=body.jurisdiction?.code==='MS'&&typeof body.profileVersion==='string'&&Array.isArray(body.questions)&&body.questions.length>0;
   if(accepted)values={profile:{jurisdiction:{code:body.jurisdiction.code},profileVersion:body.profileVersion,
    questions:body.questions.filter(q=>q?.id==='ms_program_order').map(({id,prompt,type,required,contextOnly})=>({id,prompt,type,required,contextOnly}))}};break;
  case 'signin':accepted=uuid(body.user?.id);if(accepted)values={userId:body.user.id};break;
  case 'entry':accepted=body.success===true&&exactPath(body.next,`/clinic/${config.clinicSlug}/assist`,config.origin);break;
  case 'assistance':accepted=body.success===true&&exactPath(body.screeningUrl,`/clinic/${config.clinicSlug}/screening/ms`,config.origin);break;
  case 'evaluation':accepted=typeof requestShape.jurisdiction==='string'&&body.jurisdiction===requestShape.jurisdiction
   &&typeof requestShape.profileVersion==='string'&&body.profileVersion===requestShape.profileVersion&&typeof requestShape.matterId==='string'&&body.matterId===requestShape.matterId
   &&resultCodes.includes(body.resultCode)&&typeof body.paymentAllowed==='boolean'&&typeof body.consumerPacketAvailable==='boolean'&&typeof body.sponsoredPacketAvailable==='boolean'
   &&Array.isArray(body.missingQuestionIds)&&body.missingQuestionIds.every(id=>typeof id==='string');break;
  case 'progress':accepted=typeof requestShape.jurisdiction==='string'&&body.jurisdiction===requestShape.jurisdiction
   &&typeof requestShape.profileVersion==='string'&&body.profileVersion===requestShape.profileVersion&&Array.isArray(body.questionIds)&&body.questionIds.every(id=>typeof id==='string');break;
  case 'completion':accepted=body.ok===true;break;
  case 'pending':accepted=body.ok===true&&typeof body.claimToken==='string'&&body.claimToken.length>0;break;
  case 'claim':accepted=body.ok===true&&uuid(body.matterId)&&exactPath(body.redirectTo,`/briefcase/matters/${body.matterId}`,config.origin);
   if(accepted)values={matterId:body.matterId,redirectTo:`/briefcase/matters/${body.matterId}`};break;
  case 'generation':accepted=uuid(body.briefcaseItemId);if(accepted)values={briefcaseItemId:body.briefcaseItemId};break;
  case 'reset_prepare':accepted=body.prepared===true;break;
  case 'reset_close':accepted=body.success===true&&body.revocationConfirmed===true&&body.signOutConfirmed===true;break;
  case 'reset_complete':accepted=body.success===true&&body.revocationConfirmed===true&&body.signOutConfirmed===true
   &&exactPath(body.cleanEntryPath,`/clinic/${config.clinicSlug}`,config.origin);break;
 }
 return {...result,...values,accepted,outcome:accepted?'accepted':'contract_mismatch'};
}
export function safeOriginalResponse(value) {
 return {operation:value.operation,httpStatus:value.httpStatus,bodyState:value.bodyState,outcome:value.outcome,accepted:value.accepted,...(value.errorCode?{errorCode:value.errorCode}:{}),...(value.profile?{profile:value.profile}:{})};
}
export const observedOriginalResponse=request=>captured.get(request);
export function originalResponse(response,operation) {
 const value=response?captured.get(response.request()):null;
 return value??{operation,httpStatus:response?.status()??null,bodyState:'unavailable',outcome:'observation_unavailable',accepted:false};
}
export function requireOriginalResponse(response,operation) {
 const value=originalResponse(response,operation);
 assert.equal(value.outcome,'accepted',`${value.operation}: ${value.outcome} (HTTP ${value.httpStatus??'unavailable'})`);
 assert.equal(value.operation,operation,'Original response operation mismatch');
 assert.equal(value.httpStatus,response.status(),'Original response status mismatch');
 return value;
}
export function matchesOriginalResponse(response,operation,config) {
 return originalResponseOperation(response.request(),config)===operation;
}
export function createOriginalResponseObserver(config,{bypass='',onObservation=()=>{},onStage=()=>{}}={}) {
 return async route=>{
  const request=route.request(),operation=originalResponseOperation(request,config);
  if(!operation)return route.fallback();
  const save=value=>{captured.set(request,Object.freeze(value));onObservation(safeOriginalResponse(value));};
  const stage=(stage,httpStatus=null)=>onStage({operation,stage,httpStatus});
  stage('transport_started');
  let response;
  try {
   const headers=new URL(request.url()).origin===config.origin&&bypass
    ?previewRequestHeaders(bypass,request.headers()):withoutPreviewHeaders(request.headers());
   response=await route.fetch({headers,maxRedirects:0,maxRetries:0});
   stage('response_headers',response.status());
  } catch {
   save({operation,httpStatus:null,bodyState:'unavailable',outcome:'transport_failure',accepted:false});return route.abort('failed');
  }
  // A browser can follow a fulfilled redirect without a second routing interception.
  if(response.status()>=300&&response.status()<400) {
   save({operation,httpStatus:response.status(),bodyState:'not_read',outcome:'redirect_refused',accepted:false});return route.abort('blockedbyclient');
  }
  let bytes;
  try {bytes=await response.body();}catch {
   save({operation,httpStatus:response.status(),bodyState:'body_read_failed',outcome:'body_read_failure',accepted:false});return route.abort('failed');
  }
  stage('response_body',response.status());
  let value,requestShape;try {requestShape=request.postDataJSON();}catch{requestShape={};}
  let body;
  try {body=JSON.parse(bytes.toString('utf8'));}
  catch {value={operation,httpStatus:response.status(),bodyState:'malformed_json',outcome:response.status()===200?'malformed_response':'application_refusal',accepted:false};}
  if(!value)value=projectOriginalResponse(operation,response.status(),body,config,requestShape??{});
  save(value);
  // Read the original bytes before the page can navigate; never re-submit a POST.
  await route.fulfill({response,body:bytes});
  stage('response_fulfilled',response.status());
 };
}
