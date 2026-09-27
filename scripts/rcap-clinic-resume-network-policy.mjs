import assert from 'node:assert/strict';
export const ACCEPTANCE_ORIGIN='https://hyflxnlhpmiqxvvcoiia.supabase.co';
export const TOOLBAR_LOADER='https://vercel.live/_next-live/feedback/feedback.js';
export const TURNSTILE_LOADER='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const SIGN_IN_NEXT_PATHS=Object.freeze(['/briefcase','/clinic/staff/77000000-0000-4000-8000-000000000055/queue']);
const tokenIdentities=new WeakMap();
export const observedTokenIdentity=request=>tokenIdentities.get(request);
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
// Next decodes dynamic route segments once. Block delivery namespaces before
// forwarding, including encoded static/dynamic segments. Residual escapes,
// malformed encoding and ambiguous separators refuse rather than guess.
export function browserDeliveryPath(pathname){
 let decoded;try{decoded=decodeURIComponent(pathname);}catch{return 'ambiguous';}
 if(/[%\\\x00-\x20]/.test(decoded)||decoded.includes('//')||decoded.split('/').some(p=>p==='.'||p==='..'))return 'ambiguous';
 return ['/api/rcap/packets','/api/expungement-ai/packet'].some(prefix=>decoded===prefix||decoded.startsWith(prefix+'/'))?'delivery':null;
}
export function createNetworkEvidence(){return {schemaVersion:'rcap-resume-network/v1',counts:{},dispositions:[],omitted:0};}
function record(evidence,disposition,resource,method,type,details={}){
 if(!evidence)return;
 const key=`${disposition}:${resource}`;evidence.counts[key]=(evidence.counts[key]??0)+1;
 // Never persist URLs, query strings, headers, bodies or frame URLs.
 const item={...details,disposition,resource,method:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(method)?method:'OTHER',type:['document','script','stylesheet','image','font','xhr','fetch','other'].includes(type)?type:'other'};
 if(evidence.dispositions.length<500)evidence.dispositions.push(item);else evidence.omitted++;
}
export async function handleResumeRequest(route,{origin,bypass,violations,captchaPolicy,network}){
 const request=route.request(),url=new URL(request.url()),method=request.method(),type=request.resourceType?.()??'other';
 const resource=url.origin===origin?'preview':url.origin===ACCEPTANCE_ORIGIN?'acceptance_auth':url.origin==='https://challenges.cloudflare.com'?'turnstile':url.origin==='https://vercel.live'?'vercel_toolbar':'unrecognized_external';
 const safePaths=['/expungement-ai/sign-in','/auth/v1/token','/turnstile/v0/api.js','/_next-live/feedback/feedback.js'];
 const details={path:safePaths.includes(url.pathname)?url.pathname:'other',queryNames:[...url.searchParams.keys()].map(k=>['mode','next','render','email','password','grant_type'].includes(k)?k:'other')};
 const note=(disposition,name=resource)=>record(network,disposition,name,method,type,details);
 const refuse=reason=>{note('refused');violations.push(`${method} ${resource}: ${reason}`);return route.abort();};
 if(url.username||url.password)return refuse('URL credentials');
 // A second boundary if an application/native form ever creates a URL.
 if([...url.searchParams.keys()].some(k=>['email','password','access_token','refresh_token','token'].includes(k.toLowerCase())))return refuse('credential query forbidden');
 if(url.origin===origin){
  const delivery=browserDeliveryPath(url.pathname);if(delivery)return refuse(delivery==='delivery'?'browser packet delivery forbidden at six-event checkpoint':'ambiguous browser path');
  if(method==='POST'&&url.pathname==='/api/analytics/web'){note('locally_suppressed','analytics');return route.fulfill({status:204});}
  if(method==='GET'||method==='HEAD'||(method==='POST'&&url.pathname==='/api/clinic/session/reset')){
   // continue() header overrides survive redirects. Fetch one response only,
   // preventing a cross-origin redirect from carrying Preview headers away.
   let response;try{response=await route.fetch({headers:previewRequestHeaders(bypass,request.headers()),maxRedirects:0});}catch{return refuse('Preview transport failed');}
   const location=response.headers().location;
   if(response.status()>=300&&response.status()<400&&location){let destination;try{destination=new URL(location,url);}catch{return refuse('invalid redirect');}if(destination.origin!==origin||destination.username||destination.password)return refuse('cross-origin redirect');if(browserDeliveryPath(destination.pathname))return refuse('redirect to browser packet delivery or ambiguous path');}
   note('forwarded');return route.fulfill({response});
  }
  return refuse('mutation outside reset');
 }
 if(url.origin===ACCEPTANCE_ORIGIN&&url.pathname==='/auth/v1/token'&&method==='POST'){
  // Retain only returned identity before a fast document navigation can discard
  // Chromium's response body. This is the real form request, not another login.
  let response;try{response=await route.fetch({headers:withoutPreviewHeaders(request.headers()),maxRedirects:0});
   if(response.status()>=300&&response.status()<400)return refuse('auth redirect forbidden');
   const body=response.status()===200?await response.json():null;
   tokenIdentities.set(request,Object.freeze({status:response.status(),id:typeof body?.user?.id==='string'?body.user.id:null}));
  }catch{return refuse('auth response observation failed');}
  note('forwarded');return route.fulfill({response});
 }
 if(url.origin===ACCEPTANCE_ORIGIN&&url.pathname.startsWith('/auth/v1/')){
  note('forwarded');return route.continue({headers:withoutPreviewHeaders(request.headers())});
 }
 let frameUrl;try{frameUrl=request.frame().url();}catch{frameUrl=null;}
 let frame;try{frame=new URL(frameUrl);}catch{}
 details.frameContext=frame?.origin===origin?(frame.pathname==='/expungement-ai/sign-in'?'sign_in':'other_preview'):'non_preview_or_unavailable';
 details.frameQueryNames=frame?.origin===origin?[...frame.searchParams.keys()].map(k=>['mode','next','email','password'].includes(k)?k:'other'):[];
 const signInContext=frame?.origin===origin&&frame.pathname==='/expungement-ai/sign-in'&&frame.searchParams.getAll('mode').length===1&&frame.searchParams.get('mode')==='signin'&&frame.searchParams.getAll('next').length===1&&SIGN_IN_NEXT_PATHS.includes(frame.searchParams.get('next'))&&[...frame.searchParams.keys()].every(k=>k==='mode'||k==='next');
 // The suppression header cannot remove a tag already present in cached or
 // static HTML. Block only this known script; never forward or replace it.
 const toolbarContext=signInContext||(frame?.origin===origin&&!frame.search&&['/briefcase','/briefcase/6e7a0013-f372-438d-9454-6ba6451b290c','/clinic/mississippi-volunteer-lawyers-demo','/clinic/staff/77000000-0000-4000-8000-000000000055/queue'].includes(frame.pathname));
 if(url.href===TOOLBAR_LOADER&&method==='GET'&&type==='script'&&toolbarContext){note('expected_block','vercel_toolbar_loader');return route.abort();}
 if(url.href===TURNSTILE_LOADER&&method==='GET'&&type==='script'&&signInContext&&captchaPolicy?.project==='hyflxnlhpmiqxvvcoiia'&&captchaPolicy.serverCaptchaRequired===false&&captchaPolicy.frontend?.clientCaptchaRequired===false&&captchaPolicy.frontend?.widgetSiteKeyConfigured===true&&captchaPolicy.syntheticProfile==='bounded no-analytics Clinic resume'){
  note('expected_block','optional_sign_in_turnstile_loader');return route.abort();
 }
 return refuse('resource outside exact resume policy');
}
