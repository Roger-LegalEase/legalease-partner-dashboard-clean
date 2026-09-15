import {redactHostedAcceptanceOutput} from './rcap-hosted-acceptance-redaction.mjs';
export const FAILED_PREVIEW_ID='dpl_A9wFw7P7gWHFJDKSyBpz6DY9GnBZ';
const TEAM='team_4qLmZK9WI6xIy5vjYC0IF3ae';
const hiddenKey=/^(env|environmentVariables|environment|token|refreshToken|accessToken|password|secret|authorization)$/i;
export function sanitizeVercelDiagnostic(value,heldSecrets=[]) {
  const secrets=[...heldSecrets];
  const gather=(v,hidden=false)=>{
    if(typeof v==='string'&&hidden&&v.length>=8)secrets.push(v);
    else if(Array.isArray(v))v.forEach(x=>gather(x,hidden));
    else if(v&&typeof v==='object')Object.entries(v).forEach(([k,x])=>gather(x,hidden||hiddenKey.test(k)));
  };gather(value);
  const walk=(v,key='')=>{
    if(hiddenKey.test(key))return '[REDACTED]';
    if(typeof v==='string')return redactHostedAcceptanceOutput(v,secrets).replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]');
    if(Array.isArray(v))return v.map(x=>walk(x));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x,k)]));
    return v;
  };return walk(value);
}
export async function diagnoseFailedPreview({token,fetchImpl=globalThis.fetch,onReceipt=()=>{}}={}) {
  if(!token)throw Error('DIAGNOSTIC_TOKEN_REQUIRED');
  const urls=[['deployment',`https://api.vercel.com/v13/deployments/${FAILED_PREVIEW_ID}?teamId=${TEAM}`],['events',`https://api.vercel.com/v3/deployments/${FAILED_PREVIEW_ID}/events?teamId=${TEAM}&follow=0&limit=2000&direction=forward&builds=1`]];
  const result={operation:'EXACT_FAILED_PREVIEW_GET_ONLY',deploymentId:FAILED_PREVIEW_ID,requests:[],passed:false};
  for(const [kind,url]of urls){
    const response=await fetchImpl(url,{method:'GET',headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(30000)});
    const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
    const receipt={kind,url,httpStatus:response.status,fetchedAt:new Date().toISOString(),data:sanitizeVercelDiagnostic(data,[token])};result.requests.push(receipt);onReceipt(receipt);
    if(!response.ok)throw Error(`DIAGNOSTIC_HTTP_${response.status}`);
    if(kind==='deployment'&&(data?.id!==FAILED_PREVIEW_ID||data?.projectId!=='prj_cdgwGzFqIHgEUlzEburSLaZETdQV'||data?.gitSource?.sha!=='78c8c15c4fddd525bf3c327bbfde1c99dee778f0'||!Object.hasOwn(data,'target')||(data.target!==null&&data.target!=='preview')))throw Error('DIAGNOSTIC_IDENTITY_MISMATCH');
  }
  result.passed=true;return result;
}
