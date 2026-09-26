import assert from 'node:assert/strict';
export const ACCEPTANCE_ORIGIN='https://hyflxnlhpmiqxvvcoiia.supabase.co';
export const TURNSTILE_LOADER='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const SIGN_IN_NEXT_PATHS=Object.freeze(['/briefcase','/clinic/staff/77000000-0000-4000-8000-000000000055/queue']);
const PRIVATE_HEADERS=new Set(['x-vercel-protection-bypass','x-vercel-skip-toolbar']);
export function withoutPreviewHeaders(headers={}){return Object.fromEntries(Object.entries(headers).filter(([k])=>!PRIVATE_HEADERS.has(k.toLowerCase())));}
export function previewRequestHeaders(bypass,headers={}){return {...withoutPreviewHeaders(headers),'x-vercel-protection-bypass':bypass,'x-vercel-skip-toolbar':'1'};}
// Fresh read-only server configuration; missing fields are not disabled. The
// application's independent client CAPTCHA requirement remains enforced too.
export async function readResumeCaptchaPolicy({project,token,frontend,fetchImpl=fetch}){
 assert.equal(project,'hyflxnlhpmiqxvvcoiia','exact Acceptance project required');
 let r;try{r=await fetchImpl(`https://api.supabase.com/v1/projects/${project}/config/auth`,{method:'GET',headers:{Authorization:`Bearer ${token}`},redirect:'error'});}catch{throw new Error('Acceptance CAPTCHA configuration unavailable');}
 assert.ok(r.ok,`Acceptance CAPTCHA configuration HTTP ${r.status}`);
 let body;try{body=await r.json();}catch{throw new Error('Acceptance CAPTCHA configuration unreadable');}assert.equal(typeof body?.security_captcha_enabled,'boolean','Acceptance CAPTCHA configuration must contain a boolean');assert.equal(body.security_captcha_enabled,false,'required or unknown Acceptance CAPTCHA cannot be bypassed by the resume');
 assert.equal(frontend?.clientCaptchaRequired,false,'verified optional shipped CAPTCHA required');assert.equal(frontend?.widgetSiteKeyConfigured,true,'verified shipped widget required');
 return Object.freeze({project,frontend,serverCaptchaRequired:false,source:'read-only Management API config/auth',clientGuard:'unmodified sign-in form; required CAPTCHA still refuses without a token',syntheticProfile:'bounded no-analytics Clinic resume'});
}
export function createNetworkEvidence(){return {schemaVersion:'rcap-resume-network/v1',counts:{},dispositions:[],omitted:0};}
function record(evidence,disposition,resource,method,type){
 if(!evidence)return;
 const key=`${disposition}:${resource}`;evidence.counts[key]=(evidence.counts[key]??0)+1;
 // Never persist URLs, query strings, headers, bodies or frame URLs.
 const item={disposition,resource,method:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(method)?method:'OTHER',type:['document','script','stylesheet','image','font','xhr','fetch','other'].includes(type)?type:'other'};
 if(evidence.dispositions.length<500)evidence.dispositions.push(item);else evidence.omitted++;
}
export async function handleResumeRequest(route,{origin,bypass,violations,captchaPolicy,network}){
 const request=route.request(),url=new URL(request.url()),method=request.method(),type=request.resourceType?.()??'other';
 const resource=url.origin===origin?'preview':url.origin===ACCEPTANCE_ORIGIN?'acceptance_auth':url.origin==='https://challenges.cloudflare.com'?'turnstile':url.origin==='https://vercel.live'?'vercel_toolbar':'unrecognized_external';
 const refuse=reason=>{record(network,'refused',resource,method,type);violations.push(`${method} ${resource}: ${reason}`);return route.abort();};
 if(url.username||url.password)return refuse('URL credentials');
 if(url.origin===origin){
  if(method==='POST'&&url.pathname==='/api/analytics/web'){record(network,'locally_suppressed','analytics',method,type);return route.fulfill({status:204});}
  if(method==='GET'||method==='HEAD'||(method==='POST'&&url.pathname==='/api/clinic/session/reset')){
   // continue() header overrides survive redirects. Fetch one response only,
   // preventing a cross-origin redirect from carrying Preview headers away.
   let response;try{response=await route.fetch({headers:previewRequestHeaders(bypass,request.headers()),maxRedirects:0});}catch{return refuse('Preview transport failed');}
   const location=response.headers().location;
   if(response.status()>=300&&response.status()<400&&location){let destination;try{destination=new URL(location,url);}catch{return refuse('invalid redirect');}if(destination.origin!==origin||destination.username||destination.password)return refuse('cross-origin redirect');}
   record(network,'forwarded',resource,method,type);return route.fulfill({response});
  }
  return refuse('mutation outside reset');
 }
 if(url.origin===ACCEPTANCE_ORIGIN&&url.pathname.startsWith('/auth/v1/')){
  record(network,'forwarded',resource,method,type);return route.continue({headers:withoutPreviewHeaders(request.headers())});
 }
 let frameUrl;try{frameUrl=request.frame().url();}catch{frameUrl=null;}
 const signInContext=SIGN_IN_NEXT_PATHS.some(next=>frameUrl===`${origin}/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(next)}`);
 if(url.href===TURNSTILE_LOADER&&method==='GET'&&type==='script'&&signInContext&&captchaPolicy?.project==='hyflxnlhpmiqxvvcoiia'&&captchaPolicy.serverCaptchaRequired===false&&captchaPolicy.frontend?.clientCaptchaRequired===false&&captchaPolicy.frontend?.widgetSiteKeyConfigured===true&&captchaPolicy.syntheticProfile==='bounded no-analytics Clinic resume'){
  record(network,'expected_block','optional_sign_in_turnstile_loader',method,type);return route.abort();
 }
 return refuse('resource outside exact resume policy');
}
