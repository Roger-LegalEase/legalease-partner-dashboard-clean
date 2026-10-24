import assert from 'node:assert/strict';
export const CLINIC_SETUP = Object.freeze({
  origin: 'https://legalease-rcap-4feb8e94b3de-roger947s-projects.vercel.app',
  deploymentId: 'dpl_Eg2n58h38JhnU9uuXQ7Nk46QXGuL',
  app: '4feb8e94b3dee4085fe05ea75d78853fe21e5097', project: 'hyflxnlhpmiqxvvcoiia',
  owner: 'e7c1d76e-dcf2-4d41-b585-ba164806f391',
  email: 'mvl-demo-participant-a@rcap-acceptance.test',
  event: '77000000-0000-4000-8000-000000000055', slug: 'mississippi-volunteer-lawyers-demo',
  staff: '77000000-0000-4000-8000-000000000056'
});
export function assertClinicSetupInput(env) {
  for (const [key,value] of Object.entries({
    RCAP_BROWSER_BASE_URL:CLINIC_SETUP.origin, RCAP_BROWSER_EMAIL:CLINIC_SETUP.email,
    RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID:CLINIC_SETUP.deploymentId,
    RCAP_BROWSER_APPLICATION_SHA:CLINIC_SETUP.app, RCAP_BROWSER_ACCEPTANCE_PROJECT_REF:CLINIC_SETUP.project,
    RCAP_BROWSER_WORKER_SOURCE_SHA:'16908485a94f475448657cea90583a4d352da9a3',
    RCAP_BROWSER_WORKER_DIGEST:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',
    RCAP_BROWSER_CLINIC_EVENT_ID:CLINIC_SETUP.event, RCAP_BROWSER_CLINIC_EVENT_SLUG:CLINIC_SETUP.slug,
    RCAP_BROWSER_PARTNER_SLUG:'mvl-demo', RCAP_BROWSER_ALLOW_MUTATION:'1'
  })) assert.equal(env[key],value,`Clinic setup refuses ${key} mismatch`);
  for (const key of ['RCAP_BROWSER_PASSWORD','RCAP_BROWSER_CLINIC_ACCESS_CODE','RCAP_BROWSER_VERCEL_TOKEN','RCAP_BROWSER_VERCEL_BYPASS_SECRET'])
    assert.ok(env[key]?.trim(),`existing ${key} required before browser effects`);
}
export function clinicSetupRequestAllowed(method, address) {
  const url=new URL(address);
  if (url.origin===`https://${CLINIC_SETUP.project}.supabase.co`) return (method==='GET' && ['/auth/v1/user','/auth/v1/settings'].includes(url.pathname))
    || (['POST','OPTIONS'].includes(method) && url.pathname==='/auth/v1/token' && url.searchParams.get('grant_type')==='password');
  if (url.origin!==CLINIC_SETUP.origin) return false;
  if (/packet-information|\/review(?:\/|$)|\/funding(?:\/|$)|\/checkout(?:\/|$)|\/stripe(?:\/|$)|\/packet\/(?:render|generate|download)|\/packets\/[^/]+\/download/.test(url.pathname)) return false;
  if (['GET','HEAD'].includes(method)) return true;
  return method==='POST' && new Set([
    '/api/clinic/entry','/api/clinic/assistance/start','/api/expungement-ai/evaluate',
    '/api/expungement-ai/screening/progress','/api/expungement-ai/screening/complete',
    '/api/expungement-ai/screening/pending','/api/expungement-ai/screening/pending/claim',
    '/api/analytics/web','/api/events/product'
  ]).has(url.pathname);
}

export function clinicSetupSafeError(error,env) {
  let message=String(error?.stack ?? error?.message ?? error);
  for (const key of ['RCAP_BROWSER_PASSWORD','RCAP_BROWSER_CLINIC_ACCESS_CODE','RCAP_BROWSER_VERCEL_TOKEN','RCAP_BROWSER_VERCEL_BYPASS_SECRET']) {
    const value=env[key]; if (value?.trim()) for (const literal of [value,value.trim()]) message=message.replaceAll(literal,'[redacted]');
  }
  return message;
}

export async function captureClinicEntryResponse(response) {
  if (!response) return {httpStatus:null,accepted:false};
  const body=await response.json().catch(()=>null);
  let accepted=false;
  if (body?.success===true && typeof body.next==='string') {
    try {const url=new URL(body.next,CLINIC_SETUP.origin);accepted=url.origin===CLINIC_SETUP.origin
      && url.pathname===`/clinic/${CLINIC_SETUP.slug}/assist`;} catch { /* invalid next */ }
  }
  return {httpStatus:response.status(),accepted};
}
export function assertClinicEntryAccepted(observation) {
  assert.equal(observation.httpStatus,200,`Clinic entry refused HTTP ${observation.httpStatus ?? 'no response'}`);
  assert.equal(observation.accepted,true,'Clinic entry response did not confirm the expected continuation');
}
