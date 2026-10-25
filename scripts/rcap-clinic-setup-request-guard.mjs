import {observedOriginalResponse,safeOriginalResponse} from './rcap-clinic-original-response.mjs';
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
    return ['/partner/clinic',adminPath,entryPath,entryPath+'/assist',entryPath+'/screening/ms','/expungement-ai/screening/ms','/briefcase'].includes(url.pathname)
      || /^\/briefcase\/(?:matters\/)?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(url.pathname)?'clinic_page':null;
  } catch{return null;}
}
function clinicRequestDecision(request,{actor,captchaPolicy}) {
  const url=new URL(request.url()),method=request.method(),type=request.resourceType();
  if(url.username||url.password||[...url.searchParams.keys()].some(key=>['email','password','access_token','refresh_token','token'].includes(key.toLowerCase())))return {classification:'critical_blocked',ruleId:'sensitive_url_denied'};
  if(url.href===TOOLBAR_LOADER&&method==='GET'&&type==='script'&&frameContext(request))return {classification:'optional_toolbar_blocked',ruleId:'exact_toolbar_optional'};
  if(url.href===TURNSTILE_LOADER&&method==='GET'&&type==='script'&&frameContext(request)==='sign_in'
    &&captchaPolicy?.project===CLINIC_SETUP.project&&captchaPolicy.frontend?.applicationSha===CLINIC_SETUP.app
    &&captchaPolicy.frontend?.deploymentId===CLINIC_SETUP.deploymentId&&captchaPolicy.serverCaptchaRequired===false&&captchaPolicy.frontend?.clientCaptchaRequired===false
    &&captchaPolicy.frontend?.widgetSiteKeyConfigured===true)return {classification:'optional_turnstile_blocked',ruleId:'verified_turnstile_optional'};
  if(url.origin===CLINIC_SETUP.origin&&method==='GET'&&type==='fetch'&&request.headers?.()['next-router-prefetch']==='1'
    &&['/auth/forgot-password','/expungement-ai/sign-in','/expungement-ai','/briefcase','/partner/clinic'].includes(url.pathname))return {classification:'optional_prefetch_blocked',ruleId:'named_next_prefetch_optional'};
  if(url.origin===CLINIC_SETUP.origin&&browserDeliveryPath(url.pathname))return {classification:'critical_blocked',ruleId:'browser_delivery_denied'};
  const allowed=(actor==='admin'?clinicAdminCodeRequestAllowed:clinicSetupRequestAllowed)(method,request.url());
  return {classification:allowed?'allowed':'critical_blocked',ruleId:actor==='admin'?(allowed?'admin_boundary_allowed':'admin_boundary_denied'):(allowed?'participant_boundary_allowed':'participant_boundary_denied')};
}
export function classifyClinicRequest(request,options) {return clinicRequestDecision(request,options).classification;}
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
function safeRoute(address) {
  let url;try{url=new URL(address);}catch{return {routeCategory:'unavailable',routeTemplate:'[unavailable]'};}
  if(url.origin!==CLINIC_SETUP.origin)return {routeCategory:'external',routeTemplate:'[external]'};
  const delivery=browserDeliveryPath(url.pathname);
  if(delivery)return {routeCategory:'packet_delivery_or_ambiguous',routeTemplate:delivery==='delivery'?'[packet_delivery]':'[ambiguous_path]'};
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{pathname='';}
  const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
  const routes=[
    ['canonical_matter',`^/briefcase/matters/${uuid}$`,'/briefcase/matters/[matterId]'],
    ['matter_alias',`^/briefcase/${uuid}$`,'/briefcase/[matterId]'],
    ['packet_information',`^/briefcase/${uuid}/packet-information$`,'/briefcase/[matterId]/packet-information'],
    ['packet_information',`^/briefcase/matters/${uuid}/packet-information$`,'/briefcase/matters/[matterId]/packet-information'],
    ['matter_review',`^/briefcase/${uuid}/review$`,'/briefcase/[matterId]/review'],
    ['matter_review',`^/briefcase/matters/${uuid}/review$`,'/briefcase/matters/[matterId]/review']
  ];
  const match=routes.find(([,pattern])=>new RegExp(pattern).test(pathname));
  if(match)return {routeCategory:match[0],routeTemplate:match[2]};
  if(['/briefcase','/briefcase/matters','/briefcase/documents','/briefcase/settings','/expungement-ai/sign-in',entryPath,entryPath+'/assist',entryPath+'/screening/ms','/expungement-ai/screening/ms'].includes(pathname))
    return {routeCategory:'known_preview',routeTemplate:pathname.startsWith(entryPath)?pathname.replace(entryPath,'/clinic/[eventSlug]'):pathname};
  return {routeCategory:'other_preview',routeTemplate:'[other_preview_path]'};
}
function safeRequestPurpose(request,url) {
  // Query names are bounded too: an arbitrary name can itself contain private data.
  const knownNames=['_rsc','preparation','editingFact','mode','next','grant_type'];
  const names=[...new Set(url.searchParams.keys())],headers=request.headers?.()??{};
  let frameRouteTemplate='[unavailable]';try{frameRouteTemplate=safeRoute(request.frame().url()).routeTemplate;}catch{}
  return {...safeRoute(url.href),queryNames:knownNames.filter(name=>names.includes(name)),unknownQueryNames:names.some(name=>!knownNames.includes(name)),
    rsc:headers.rsc==='1',nextRouterPrefetch:headers['next-router-prefetch']==='1',
    purposePrefetch:[headers.purpose,headers['sec-purpose']].some(value=>typeof value==='string'&&value.split(/[;,\s]+/).includes('prefetch')),
    initiatorContext:{frameRouteTemplate,refererRouteTemplate:safeRoute(headers.referer).routeTemplate,navigationRequest:request.isNavigationRequest?.()===true}};
}
function expectedNavigationAbort(request,stage,error) {
  const url=new URL(request.url());
  if(error!=='net::ERR_ABORTED'||url.origin!==CLINIC_SETUP.origin||request.method()!=='GET'||request.resourceType()!=='document')return false;
  return (['admin_normal_signin','participant_normal_signin'].includes(stage)&&url.pathname==='/expungement-ai/sign-in')
    ||(stage==='participant_code_redemption'&&url.pathname===entryPath)
    ||(stage==='participant_fresh_consent'&&url.pathname===entryPath+'/assist')
    ||(stage==='participant_claim'&&url.pathname===entryPath+'/screening/ms');
}
export function createClinicRequestGuard({actor,captchaPolicy,env,stage,events,requestFailures,stageResults=[],isOwnedMatterSpeculativePrefetch=()=>false}) {
  assert.ok(['admin','participant'].includes(actor));
  const fatal=[],optional=new WeakSet(),optionalUrls=new Set(),criticalUrls=new Set(),requestMetadata=new WeakMap();let codePosts=0,requestSequence=0;
  const metadata=request=>{
    if(!requestMetadata.has(request))requestMetadata.set(request,{requestId:++requestSequence,ruleId:clinicRequestDecision(request,{actor,captchaPolicy}).ruleId});
    return requestMetadata.get(request);
  };
  const describeRequest=request=>{
    const url=new URL(request.url());
    return {stage:stage(),actor,origin:resourceClass(url),method:request.method(),
      resourceType:request.resourceType(),pathname:safeKnownPath(request.url(),env),...metadata(request),...safeRequestPurpose(request,url)};
  };
  const record=(request,outcome,error=null)=>{
    const value={...describeRequest(request),outcome};
    if(error)value.error=error;
    if(events.length<500)events.push(value);
    return value;
  };
  return {
    recordReadonlyBoundary(request,{outcome,ruleId}) {
      assert.ok(['readonly_blocked','readonly_telemetry_suppressed'].includes(outcome),'Unknown readonly diagnostic outcome');
      assert.ok(['readonly_mutation_blocked','readonly_read_path_blocked','readonly_invalid_url_blocked','readonly_redirect_blocked',
        'readonly_telemetry_suppressed','readonly_http_refusal_blocked'].includes(ruleId),'Unknown readonly diagnostic rule');
      assert.equal(outcome==='readonly_telemetry_suppressed',ruleId==='readonly_telemetry_suppressed','Readonly diagnostic outcome/rule mismatch');
      const details=metadata(request);details.setupRuleId??=details.ruleId;details.ruleId=ruleId;
      return record(request,outcome);
    },
    async route(route) {
      const request=route.request(),decision=clinicRequestDecision(request,{actor,captchaPolicy});
      const verifiedSpeculativePrefetch=actor==='participant'&&isOwnedMatterSpeculativePrefetch(request);
      let classification=verifiedSpeculativePrefetch?'optional_owned_matter_prefetch':decision.classification;
      const details=metadata(request);details[details.setupRuleId?'setupRuleId':'ruleId']=verifiedSpeculativePrefetch?'owned_matter_speculative_prefetch':decision.ruleId;
      const url=new URL(request.url());
      if(actor==='admin'&&classification==='allowed'&&request.method()==='POST'&&url.origin===CLINIC_SETUP.origin
        &&url.pathname===`/api/clinic/events/${CLINIC_SETUP.event}/access-codes`&&++codePosts>1){classification='critical_blocked';details[details.setupRuleId?'setupRuleId':'ruleId']='second_code_post_denied';}
      if(classification.startsWith('optional_')) {
        optional.add(request);optionalUrls.add(request.url());record(request,classification);return route.abort('blockedbyclient');
      }
      if(classification==='critical_blocked') {
        criticalUrls.add(request.url());fatal.push(record(request,classification));return route.abort('blockedbyclient');
      }
      if(request.method()==='POST')record(request,'allowed_effect_boundary');
      else if(['fetch','document'].includes(request.resourceType()))record(request,'allowed_request');
      if(url.origin!==CLINIC_SETUP.origin)return route.fallback({headers:withoutPreviewHeaders(request.headers())});
      return route.fallback();
    },
    response(response) {
      const request=response.request(),url=new URL(request.url()),method=request.method();
      if(method==='GET'&&['fetch','document'].includes(request.resourceType()))record(request,'response_received').httpStatus=response.status();
      const observed=observedOriginalResponse(request);
      if(observed&&!observed.accepted)fatal.push(safeOriginalResponse(observed));
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
      if(named) {
        const value={actor,stage:named,httpStatus:response.status(),
          pathname:safeKnownPath(request.url(),env),outcome:response.status()===(named==='one_code_issuance'?201:200)?'http_success':'http_refusal'};
        if(stageResults.length<200)stageResults.push(value);
        if(value.outcome==='http_refusal')fatal.push(value);
      }
    },
    requestFailed(request) {
      const error=request.failure()?.errorText?.match(/(?:net::)?ERR_[A-Z_]+/)?.[0]??'request failed';
      const navigation=expectedNavigationAbort(request,stage(),error);
      // A true speculative RSC fetch can be canceled by Next after a successful navigation.
      // Only the dedicated owned-matter predicate can mark this background abort optional.
      const speculative=actor==='participant'&&['net::ERR_ABORTED','net::ERR_BLOCKED_BY_CLIENT'].includes(error)
        &&isOwnedMatterSpeculativePrefetch(request);
      const value=record(request,optional.has(request)||speculative?'optional_request_failed':navigation?'expected_navigation_abort':'critical_request_failed',error);
      requestFailures.push(value);
      if(!optional.has(request)&&!speculative&&!navigation)fatal.push(value);
    },
    consoleError(message) {
      if(message.type()!=='error')return;
      const address=message.location()?.url;
      if(address&&optionalUrls.has(address)&&!criticalUrls.has(address)
        &&/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT|FAILED)(?:\.Inspector)?$/.test(message.text()))return;
      fatal.push({stage:stage(),actor,outcome:'critical_console_error'});
    },
    pageError(){fatal.push({stage:stage(),actor,outcome:'critical_page_error'});},
    assertNoCritical(){assert.deepEqual(fatal,[],'Clinic context encountered a critical boundary or application failure');}
  };
}
