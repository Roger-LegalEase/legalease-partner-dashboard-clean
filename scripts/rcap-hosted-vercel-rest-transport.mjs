import {sanitizeVercelDiagnostic} from './rcap-hosted-vercel-diagnostics.mjs';
import {HOSTED_VERCEL_TEAM_ID, HOSTED_VERCEL_PROJECT_ID, HOSTED_VERCEL_PROJECT_NAME, expectedHostedReturnOrigin} from './rcap-hosted-acceptance-vercel-identity.mjs';

export const FROZEN_APPLICATION_SHA = 'f5c4f40022e422033985302995511da7157f474d';
export const CREATE_PREVIEW_URL = `https://api.vercel.com/v13/deployments?teamId=${HOSTED_VERCEL_TEAM_ID}`;
const ACCEPTANCE_PROJECT = 'hyflxnlhpmiqxvvcoiia';

// API source contract: https://vercel.com/docs/rest-api/deployments/create-a-new-deployment
// Per-deployment env/build.env: vercel/vercel packages/client/src/types.ts
// and packages/client/src/deploy.ts (deploymentOptions serialized into POST).
export function createPreviewRequest({identity, applicationSha, runtimeEnv, buildEnv, meta}) {
  if (identity?.teamId !== HOSTED_VERCEL_TEAM_ID || identity?.projectId !== HOSTED_VERCEL_PROJECT_ID || identity?.projectName !== HOSTED_VERCEL_PROJECT_NAME) throw new Error('REST_PINNED_IDENTITY_MISMATCH');
  if (applicationSha !== FROZEN_APPLICATION_SHA || meta?.rcapApplicationSha !== applicationSha || meta?.rcapAcceptanceProjectRef !== ACCEPTANCE_PROJECT || meta?.rcapReturnOrigin !== expectedHostedReturnOrigin(applicationSha)) throw new Error('REST_FROZEN_METADATA_MISMATCH');
  for (const name of ['rcapStripeConfigured','rcapRouteState','rcapClinicDemoMode','rcapStagingScopeSha256']) if (typeof meta[name] !== 'string') throw new Error('REST_METADATA_MISSING');
  for (const env of [runtimeEnv, buildEnv]) {
    if (!env || Object.values(env).some(value => typeof value !== 'string')) throw new Error('REST_ENV_INVALID');
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith('sk_test_')) throw new Error('REST_LIVE_STRIPE_REFUSED');
    if (env.VERCEL_ENV || env.VERCEL_TARGET_ENV) throw new Error('REST_TARGET_OVERRIDE_REFUSED');
  }
  if (runtimeEnv.SUPABASE_URL !== `https://${ACCEPTANCE_PROJECT}.supabase.co` || runtimeEnv.NEXT_PUBLIC_SUPABASE_URL !== runtimeEnv.SUPABASE_URL || buildEnv.NEXT_PUBLIC_SUPABASE_URL !== runtimeEnv.SUPABASE_URL) throw new Error('REST_SUPABASE_MISMATCH');
  return {
    name: HOSTED_VERCEL_PROJECT_NAME,
    project: HOSTED_VERCEL_PROJECT_ID,
    // Omitted target is Preview. No branch tip, latest-commit option, custom
    // environment, deploymentId, projectSettings or project-env mutation.
    gitSource: {type: 'github', repoId: '1248656766', ref: applicationSha, sha: applicationSha},
    env: {...runtimeEnv}, build: {env: {...buildEnv}}, meta: {...meta}
  };
}

export function assertPreviewResponse(d, expectedMeta, expectedId) {
  if (!/^dpl_[A-Za-z0-9]+$/.test(d?.id ?? '') || (expectedId && d.id !== expectedId)) throw new Error('REST_DEPLOYMENT_ID_MISMATCH');
  if (!Object.hasOwn(d, 'target') || (d.target !== null && d.target !== 'preview')) throw new Error('REST_NON_PREVIEW_REFUSED');
  if (!/^[a-z0-9-]+\.vercel\.app$/.test(d.url ?? '')) throw new Error('REST_DEPLOYMENT_URL_INVALID');
  if (d.projectId !== HOSTED_VERCEL_PROJECT_ID || d.gitSource?.sha !== FROZEN_APPLICATION_SHA) throw new Error('REST_DEPLOYMENT_SOURCE_MISMATCH');
  if (Object.entries(expectedMeta).some(([key,value]) => d.meta?.[key] !== value)) throw new Error('REST_DEPLOYMENT_METADATA_MISMATCH');
  return d;
}

export async function createRestPreview(options, {fetchImpl=globalThis.fetch, sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)), maxPolls=180, onCreated=()=>{}, onState=()=>{}}={}) {
  const body=createPreviewRequest(options);
  if (!options.token) throw new Error('REST_TOKEN_REQUIRED');
  const headers={Authorization:`Bearer ${options.token}`, 'Content-Type':'application/json'};
  // Exactly ONE creation call. Network ambiguity, 401/403, malformed replies,
  // timeouts and failed builds never cause a retry or another deployment.
  const secrets=[options.token,...Object.entries({...options.runtimeEnv,...options.buildEnv}).filter(([key])=>/KEY|SECRET|PASSWORD|TOKEN/.test(key)).map(([,value])=>value)];
  let receipt={creationPostCount:1,creationCalls:1,creationHttpStatus:null,phase:'CREATE_ATTEMPTED',observedAt:new Date().toISOString()};
  const checkpoint=(d,extra={})=>{
    receipt={...receipt,...sanitizeVercelDiagnostic(d,secrets),...extra,observedAt:new Date().toISOString()};
    onState(receipt);return receipt;
  };
  onState(receipt);
  const response=await fetchImpl(CREATE_PREVIEW_URL,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(60000)});
  checkpoint({}, {creationHttpStatus:response.status,phase:'CREATE_RESPONSE'});
  let d=await response.json();
  checkpoint(d);
  if (!response.ok) throw new Error(`REST_CREATE_HTTP_${response.status}`);
  onCreated(receipt);
  d=assertPreviewResponse(d,body.meta);
  const id=d.id;
  for(let poll=0;;poll++) {
    const terminalState=d.readyState ?? d.state;
    if(terminalState==='READY') return {...receipt,id,url:`https://${d.url}`,sourceSha:d.gitSource.sha,target:d.target,creationCalls:1};
    if(['ERROR','CANCELED','CANCELLED','PAUSED','BLOCKED'].includes(terminalState)) throw new Error(`REST_BUILD_${terminalState}`);
    if(poll>=maxPolls) {
      checkpoint({}, {phase:'POLL_TIMEOUT',pollTimedOut:true});
      throw new Error('REST_BUILD_TIMEOUT_NO_RETRY');
    }
    await sleep(10000);
    const status=await fetchImpl(`https://api.vercel.com/v13/deployments/${id}?teamId=${HOSTED_VERCEL_TEAM_ID}`,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(30000)});
    checkpoint({}, {pollHttpStatus:status.status});
    if(!status.ok) throw new Error(`REST_POLL_HTTP_${status.status}`);
    d=await status.json();
    checkpoint(d,{phase:'BUILD_POLL'});
    d=assertPreviewResponse(d,body.meta,id);
  }
}
