import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveHostedVercelIdentity,HOSTED_VERCEL_PROJECT_NAME,HOSTED_VERCEL_TEAM_SLUG,hostedVercelCliEnvironment} from './rcap-hosted-acceptance-vercel-identity.mjs';
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
  if(result.passed){
    result.cliProbes=[];
    for(const scoped of [true,false]){
      const args=['--yes','vercel@59.17.0','project','inspect',HOSTED_VERCEL_PROJECT_NAME,'--token',process.env.VERCEL_TOKEN];
      if(scoped)args.push('--scope',HOSTED_VERCEL_TEAM_SLUG);
      const probe=spawnSync('npx',args,{encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024,env:{...process.env,...hostedVercelCliEnvironment(result.identity),VERCEL_TELEMETRY_DISABLED:'1',NO_COLOR:'1'}});
      const output=String(probe.stdout??'')+String(probe.stderr??'');
      result.cliProbes.push({command:'vercel@59.17.0 project inspect '+HOSTED_VERCEL_PROJECT_NAME+(scoped?' --scope '+HOSTED_VERCEL_TEAM_SLUG:''),scoped,environment:hostedVercelCliEnvironment(result.identity),exitCode:probe.status,errorCode:probe.error?.code??null,output:output.split(process.env.VERCEL_TOKEN).join('[REDACTED]')});
    }
  }
  const {root}=prepareHostedAcceptanceEvidenceLayout();fs.writeFileSync(path.join(root,'vercel-identity-recheck.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}
