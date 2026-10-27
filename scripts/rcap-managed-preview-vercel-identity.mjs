// Existing managed alias rule belongs to the operator; keep application identity bytes frozen.
export * from './rcap-hosted-acceptance-vercel-identity.mjs';
import {expectedHostedReturnOrigin as originalOrigin,HOSTED_VERCEL_TEAM_SLUG} from './rcap-hosted-acceptance-vercel-identity.mjs';
export function expectedHostedReturnOrigin(applicationSha,previewPurpose=''){
 if(previewPurpose!=='managed_start')return originalOrigin(applicationSha,previewPurpose);
 if(!/^[0-9a-f]{40}$/.test(applicationSha??''))throw Error('one exact application SHA is required');
 return `https://legalease-rcap-managed-${applicationSha.slice(0,12)}-${HOSTED_VERCEL_TEAM_SLUG}.vercel.app`;
}
