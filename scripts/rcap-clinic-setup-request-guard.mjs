import assert from 'node:assert/strict';
import {TOOLBAR_LOADER,TURNSTILE_LOADER,withoutPreviewHeaders,browserDeliveryPath} from './rcap-clinic-resume-network-policy.mjs';
import {CLINIC_SETUP,clinicSetupRequestAllowed,clinicSetupSafePathname,clinicSetupSafeError} from './rcap-clinic-setup-only-boundary.mjs';
import {clinicAdminCodeRequestAllowed} from './rcap-clinic-setup-admin-code.mjs';
const adminPath=`/partner/clinic/${CLINIC_SETUP.event}`;
const entryPath=`/clinic/${CLINIC_SETUP.slug}`;
function frameContext(request) {
  try {
    const url=new URL(request.frame().url());
    if(url.origin!==CLINIC_SETUP.origin)return null;
    if(url.pathname==='/expungement-ai/sign-in') {
      const next=url.searchParams.getAll('next'),mode=url.searchParams.getAll('mode');
      return next.length===1&&[adminPath,entryPath,entryPath+'/assist','/briefcase'].includes(next[0])
        &&mode.length===1&&mode[0]==='signin'&&[...url.searchParams.keys()].every(key=>['mode','next'].includes(key))?'sign_in':null;
    }
    if(url.search)return null;
    return ['/partner/clinic',adminPath,entryPath,entryPath+'/assist',entryPath+'/screening/ms','/briefcase'].includes(url.pathname)
      || /^\/briefcase\/[a-f0-9-]{36}$/.test(url.pathname)?'clinic_page':null;
  } catch{return null;}
}
export function classifyClinicRequest(request,{actor,captchaPolicy}) {
  const url=new URL(request.url()),method=request.method(),type=request.resourceType();
  if(url.username||url.password||[...url.searchParams.keys()].some(key=>['email','password','access_token','refresh_token','token'].includes(key.toLowerCase())))return 'critical_blocked';
  if(url.href===TOOLBAR_LOADER&&method==='GET'&&type==='script'&&frameContext(request))return 'optional_toolbar_blocked';
  if(url.href===TURNSTILE_LOADER&&method==='GET'&&type==='script'&&frameContext(request)==='sign_in'
    &&captchaPolicy?.project===CLINIC_SETUP.project&&captchaPolicy.frontend?.applicationSha===CLINIC_SETUP.app
    &&captchaPolicy.frontend?.deploymentId===CLINIC_SETUP.deploymentId&&captchaPolicy.serverCaptchaRequired===false&&captchaPolicy.frontend?.clientCaptchaRequired===false
    &&captchaPolicy.frontend?.widgetSiteKeyConfigured===true)return 'optional_turnstile_blocked';
  if(url.origin===CLINIC_SETUP.origin&&method==='GET'&&type==='fetch'&&request.headers?.()['next-router-prefetch']==='1'
    &&['/auth/forgot-password','/expungement-ai/sign-in','/expungement-ai','/briefcase','/partner/clinic'].includes(url.pathname))return 'optional_prefetch_blocked';
  if(url.origin===CLINIC_SETUP.origin&&browserDeliveryPath(url.pathname))return 'critical_blocked';
  return (actor==='admin'?clinicAdminCodeRequestAllowed:clinicSetupRequestAllowed)(method,request.url())?'allowed':'critical_blocked';
}
function resourceClass(url) {
  return url.origin===CLINIC_SETUP.origin?'preview':url.origin===`https://${CLINIC_SETUP.project}.supabase.co`?'acceptance_auth':
    url.origin==='https://vercel.live'?'vercel_toolbar':url.origin==='https://challenges.cloudflare.com'?'turnstile':'unrecognized_external';
}
function safeKnownPath(address,env) {
  const url=new URL(address),known=[new URL(TOOLBAR_LOADER).pathname,new URL(TURNSTILE_LOADER).pathname,
    '/auth/v1/token','/auth/v1/user','/auth/v1/settings','/expungement-ai/sign-in','/auth/forgot-password','/expungement-ai','/briefcase',
    '/partner/clinic',adminPath,adminPath+'/follow-up',entryPath,entryPath+'/assist',entryPath+'/screening/ms',
    `/api/clinic/events/${CLINIC_SETUP.event}`,`/api/clinic/events/${CLINIC_SETUP.event}/access-codes`,
    `/api/clinic/events/${CLINIC_SETUP.event}/queue`,`/api/clinic/events/${CLINIC_SETUP.event}/follow-ups`,`/api/clinic/events/${CLINIC_SETUP.event}/reporting`,
    '/api/clinic/entry','/api/clinic/assistance/start','/api/expungement-ai/evaluate','/api/expungement-ai/screening/progress',
    '/api/expungement-ai/screening/complete','/api/expungement-ai/screening/pending','/api/expungement-ai/screening/pending/claim',
    '/api/analytics/web','/api/events/product'];
  if(known.includes(url.pathname))return clinicSetupSafePathname(address,env);
  return url.origin===CLINIC_SETUP.origin?(url.pathname.startsWith('/_next/static/')?'/_next/static/[asset]':'[other_preview_path]'):'[other_external_path]';
}
function expectedNavigationAbort(request,stage,error) {
  const url=new URL(request.url());
  if(error!=='net::ERR_ABORTED'||url.origin!==CLINIC_SETUP.origin||request.method()!=='GET'||request.resourceType()!=='document')return false;
  return (['admin_normal_signin','participant_normal_signin'].includes(stage)&&url.pathname==='/expungement-ai/sign-in')
    ||(stage==='participant_code_redemption'&&url.pathname===entryPath)
    ||(stage==='participant_fresh_consent'&&url.pathname===entryPath+'/assist')
    ||(stage==='participant_claim'&&url.pathname===entryPath+'/screening/ms');
}
export function createClinicRequestGuard({actor,captchaPolicy,env,stage,events,requestFailures,stageResults=[]}) {
  assert.ok(['admin','participant'].includes(actor));
  const fatal=[],optional=new WeakSet(),optionalUrls=new Set(),criticalUrls=new Set();let codePosts=0;
  const record=(request,outcome,error=null)=>{
    const url=new URL(request.url());
    const value={stage:stage(),actor,origin:resourceClass(url),method:request.method(),
      resourceType:request.resourceType(),pathname:safeKnownPath(request.url(),env),outcome};
    if(error)value.error=error;
    if(events.length<500)events.push(value);
    return value;
  };
  return {
    async route(route) {
      const request=route.request();let classification=classifyClinicRequest(request,{actor,captchaPolicy});
      const url=new URL(request.url());
      if(actor==='admin'&&classification==='allowed'&&request.method()==='POST'&&url.origin===CLINIC_SETUP.origin
        &&url.pathname===`/api/clinic/events/${CLINIC_SETUP.event}/access-codes`&&++codePosts>1)classification='critical_blocked';
      if(classification.startsWith('optional_')) {
        optional.add(request);optionalUrls.add(request.url());record(request,classification);return route.abort('blockedbyclient');
      }
      if(classification==='critical_blocked') {
        criticalUrls.add(request.url());fatal.push(record(request,classification));return route.abort('blockedbyclient');
      }
      if(request.method()==='POST')record(request,'allowed_effect_boundary');
      if(url.origin!==CLINIC_SETUP.origin)return route.continue({headers:withoutPreviewHeaders(request.headers())});
      return route.fallback();
    },
    response(response) {
      const request=response.request(),url=new URL(request.url()),method=request.method();
      const normalAuth=url.origin===`https://${CLINIC_SETUP.project}.supabase.co`&&method==='POST'&&url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password';
      const paths={
        '/api/clinic/entry':'clinic_entry','/api/clinic/assistance/start':'fresh_consent',
        '/api/expungement-ai/evaluate':'screening_evaluation','/api/expungement-ai/screening/progress':'screening_progress',
        '/api/expungement-ai/screening/complete':'screening_complete','/api/expungement-ai/screening/pending':'pending_save',
        '/api/expungement-ai/screening/pending/claim':'atomic_claim',
        [`/api/clinic/events/${CLINIC_SETUP.event}/access-codes`]:'one_code_issuance'
      };
      const named=normalAuth?'normal_auth':url.origin===CLINIC_SETUP.origin
        ?method==='POST'?paths[url.pathname]:method==='GET'&&url.pathname===`/api/clinic/events/${CLINIC_SETUP.event}`?'event_workspace':null:null;
      if(named&&stageResults.length<200)stageResults.push({actor,stage:named,httpStatus:response.status(),
        pathname:safeKnownPath(request.url(),env),outcome:response.status()>=200&&response.status()<300?'http_success':'http_refusal'});
    },
    requestFailed(request) {
      const error=request.failure()?.errorText?.match(/(?:net::)?ERR_[A-Z_]+/)?.[0]??'request failed';
      const navigation=expectedNavigationAbort(request,stage(),error);
      const value=record(request,optional.has(request)?'optional_request_failed':navigation?'expected_navigation_abort':'critical_request_failed',error);
      requestFailures.push(value);
      if(!optional.has(request)&&!navigation)fatal.push(value);
    },
    consoleError(message) {
      if(message.type()!=='error')return;
      const address=message.location()?.url;
      if(address&&optionalUrls.has(address)&&!criticalUrls.has(address)
        &&/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT|FAILED)$/.test(message.text()))return;
      fatal.push({stage:stage(),actor,outcome:'critical_console_error'});
    },
    pageError(){fatal.push({stage:stage(),actor,outcome:'critical_page_error'});},
    assertNoCritical(){assert.deepEqual(fatal,[],'Clinic context encountered a critical boundary or application failure');}
  };
}
