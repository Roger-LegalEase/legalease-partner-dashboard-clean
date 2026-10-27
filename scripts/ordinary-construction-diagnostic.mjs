// Bounded constructor only: existing stranger Auth once, no participant or worker call.
import assert from 'node:assert/strict';
import {ORDINARY} from './rcap-hosted-ordinary-full-admission.mjs';
import {createOrdinaryFullRuntime,ORDINARY_CONSTRUCTION_STATE_SQL} from './rcap-hosted-ordinary-full-runtime.mjs';
export const CONSTRUCTION_PHASES=Object.freeze(['continuous_window','management_keys','source_release_and_program','worker_binding_construction','credential_blob','browser_module','browser_launch','browser_contexts','browser_routes','stranger_auth','constructed_before_participant','browser_close']);
export const PARTICIPANT_PHASES=Object.freeze(['full_runtime_construction','participant_admission','participant_custody','participant_routes','owner_signin_observer','owner_signin_navigation','owner_signin_fill_email','owner_signin_fill_password','owner_signin_click','owner_signin_response','owner_briefcase_navigation','public_landing_navigation','intake_get_navigation','intake_request_id_read','before_durable_intake_checkpoint','participant_after_intake_boundary']);
const AUTH='https://hyflxnlhpmiqxvvcoiia.supabase.co';
export function constructionFetchAllowed(input,options={}){
 let u;try{u=new URL(input);}catch{return false;}if(u.username||u.password||u.hash)return false;const method=options.method??'GET';
 if(u.origin===AUTH)return method==='POST'&&u.pathname==='/auth/v1/token'&&u.search==='?grant_type=password';
 if(method==='GET'&&u.origin===ORDINARY.origin)return u.pathname==='/api/rcap/release'&&!u.search;
 if(method==='GET'&&u.origin==='https://api.github.com')return u.pathname==='/repos/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs'&&['queued','in_progress','waiting','pending','requested'].includes(u.searchParams.get('status'))&&u.searchParams.get('per_page')==='100'&&/^[1-9][0-9]*$/.test(u.searchParams.get('page')??'')&&[...u.searchParams.keys()].every(k=>['status','per_page','page'].includes(k));
 if(u.origin!=='https://api.supabase.com'||u.search)return false;
 if(method==='GET')return u.pathname==='/v1/projects/'+ORDINARY.project+'/api-keys';
 if(method!=='POST'||u.pathname!=='/v1/projects/'+ORDINARY.project+'/database/query')return false;
 let q;try{const b=JSON.parse(options.body);if(Object.keys(b).join(',')!=='query')return false;q=b.query;}catch{return false;}
 return q===ORDINARY_CONSTRUCTION_STATE_SQL;
}
export function sanitizedConstructionFailure(error,phase){
 assert(CONSTRUCTION_PHASES.includes(phase)||PARTICIPANT_PHASES.includes(phase)||phase==='construction_not_started');
 const errorClass=['AssertionError','TimeoutError','TypeError','ReferenceError','SyntaxError','Error'].includes(error?.name)?error.name:'Error';
 const code=['ERR_MODULE_NOT_FOUND','MODULE_NOT_FOUND','ENOENT','EACCES','ETIMEDOUT','ECONNRESET','ECONNREFUSED','ERR_ASSERTION'].includes(error?.code)?error.code:null;
 const source=String(error?.stack??'').match(/scripts\/(rcap-hosted-ordinary-full-runtime|ordinary-full-window|rcap-hosted-saved-dtc-credentials|ordinary-construction-diagnostic|rcap-hosted-ordinary-participant|rcap-clinic-screening-profile|rcap-ms-screening-browser)\.mjs:(\d+):(\d+)/);
 return{constructionPhase:phase,errorClass,errorCode:code,sourcePath:source?'scripts/'+source[1]+'.mjs':null,sourceLine:source?Number(source[2]):null};
}
export async function diagnoseOrdinaryConstruction({env,qualification,checkpoint,loadCustody,createRuntime=createOrdinaryFullRuntime}){
 let constructionPhase='construction_not_started',runtime,result,authPosts=0;const originalFetch=globalThis.fetch;
 const mark=async phase=>{assert(CONSTRUCTION_PHASES.includes(phase));constructionPhase=phase;await checkpoint({schemaVersion:'ordinary-construction-diagnostic/v1',constructionPhase:phase});};
 globalThis.fetch=async(input,options={})=>{assert(constructionFetchAllowed(input,options),'Construction diagnostic network boundary');if(new URL(input).origin===AUTH){assert.equal(constructionPhase,'stranger_auth');assert.equal(authPosts,0,'Only existing stranger Auth once');authPosts++;}return originalFetch(input,options);};
 try{runtime=await createRuntime({env,qualification,checkpoint,loadCustody,onConstructionPhase:mark});assert.equal(constructionPhase,'constructed_before_participant');result={schemaVersion:'ordinary-construction-diagnostic/v1',phase:'CONSTRUCTION_COMPLETE_STOP_BEFORE_PARTICIPANT',constructionPhase,existingStrangerAuthPosts:authPosts,participantInvoked:false,workerPreparationInvoked:false};}
 catch(error){result={schemaVersion:'ordinary-construction-diagnostic/v1',phase:'CONSTRUCTION_FAILED_STOP_NO_RETRY',...sanitizedConstructionFailure(error,constructionPhase),existingStrangerAuthPosts:authPosts,participantInvoked:false,workerPreparationInvoked:false};}
 finally{try{if(runtime)await runtime.close();}catch(error){result={schemaVersion:'ordinary-construction-diagnostic/v1',phase:'CONSTRUCTION_FAILED_STOP_NO_RETRY',...sanitizedConstructionFailure(error,'browser_close'),existingStrangerAuthPosts:authPosts,participantInvoked:false,workerPreparationInvoked:false};}finally{globalThis.fetch=originalFetch;}}
 return result;
}
