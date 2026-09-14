import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveHostedVercelIdentity,HOSTED_VERCEL_PROJECT_NAME} from './rcap-hosted-acceptance-vercel-identity.mjs';
import {prepareHostedAcceptanceEvidenceLayout} from './rcap-hosted-acceptance-evidence-layout.mjs';
export async function recheck({token,fetchImpl=globalThis.fetch}={}) {
  const result={schemaVersion:'rcap-vercel-identity-recheck/v1',checkedAt:new Date().toISOString(),operation:'VERCEL_IDENTITY_ONLY',passed:false,identity:null,reads:[],teamIdentitySource:'canonical_pin',mutations:{deploy:false,migration:false,auth:false,stripe:false,worker:false,browser:false,supabase:false,productionInspection:false},candidateAcceptance:false};
  if(!token){result.failure={reason:'MISSING_CREDENTIAL',endpoint:'NOT_REQUESTED',httpStatus:null};return result;}
  let endpoint='NOT_REQUESTED',httpStatus=null;
  try {
    result.identity=await resolveHostedVercelIdentity({token,fetchImpl:async(url,options)=>{
      const u=new URL(url);endpoint=u.origin==='https://api.vercel.com'&&u.pathname===`/v9/projects/${HOSTED_VERCEL_PROJECT_NAME}`?'VERCEL_PINNED_PROJECT':'UNEXPECTED_ENDPOINT';httpStatus=null;
      if(endpoint==='UNEXPECTED_ENDPOINT'||(options.method&&options.method!=='GET'))throw new Error('REFUSED');
      const response=await fetchImpl(url,{...options,method:'GET',redirect:'error',signal:AbortSignal.timeout(15000)});httpStatus=response.status;const read={endpoint,httpStatus};result.reads.push(read);
      return response;
    }});
    result.passed=true;
  }catch(error){
    const allowed=['PINNED_PROJECT_ID_MISMATCH','PINNED_PROJECT_NAME_MISMATCH','PINNED_PROJECT_TEAM_MISMATCH'];
    const reason=allowed.includes(error.code)?error.code:endpoint==='UNEXPECTED_ENDPOINT'?'UNEXPECTED_ENDPOINT':httpStatus===401?'HTTP_UNAUTHENTICATED':httpStatus===403?'HTTP_FORBIDDEN':httpStatus===404?'HTTP_NOT_FOUND':httpStatus===null?'READ_FAILED_OR_TIMED_OUT':'IDENTITY_READ_FAILED';
    result.failure={reason,endpoint,httpStatus};
  }
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const result=await recheck({token:process.env.VERCEL_TOKEN});result.runId=process.env.GITHUB_RUN_ID??null;result.toolsSha=process.env.HOSTED_TOOLS_SHA??null;
  const {root}=prepareHostedAcceptanceEvidenceLayout();fs.writeFileSync(path.join(root,'vercel-identity-recheck.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}
