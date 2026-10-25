// GET-only Fly identity collector. No deployment authorization is consumed.
// This deliberately does not import the mutation-capable production harness.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const APP='legalease-rcap-render-worker';
// Fly CLI-issued scoped tokens include the "FlyV1 " authorization scheme in
// their value. Do not prepend "Bearer " to a complete Authorization header.
// Historical raw personal tokens use Bearer; bare fm2_ macaroons use FlyV1.
export function flyReadOnlyAuthorizationHeader(token){
 if(typeof token!=='string')throw Error('Existing runner Fly credential unavailable');
 if(/[\x00-\x1f\x7f]/.test(token))throw Error('Malformed Fly credential');
 const t=token.trim();
 if(!t)throw Error('Existing runner Fly credential unavailable');
 if(/^FlyV1\s+\S+$/i.test(t)||/^Bearer\s+\S+$/i.test(t))return t;
 if(/^fm2_\S+$/.test(t))return `FlyV1 ${t}`;
 if(/^\S+$/.test(t))return `Bearer ${t}`;
 throw Error('Malformed Fly credential');
}
// Classify only explicit config already returned by the identity GET; never expose its raw values.
export function classifyWorkerRuntime(config){
 if(!config||typeof config!=='object'||Array.isArray(config))return {command:'unknown',configuredSupabaseHost:'unknown',basis:'returned_machine_config_only'};
 let command='unknown';
 const init=config?.init;
 if(init===undefined)command='image_default';
 else if(init&&typeof init==='object'&&!Array.isArray(init)){
  const fields=['exec','entrypoint','cmd'];
  const present=fields.filter(key=>Object.hasOwn(init,key));
  if(present.length===0)command='image_default';
  else if(present.every(key=>Array.isArray(init[key])&&init[key].every(value=>typeof value==='string'))){
   let argv=null;
   if(present.length===1&&present[0]==='exec'&&init.exec.length)argv=init.exec;
   else if(!present.includes('exec')&&present.includes('entrypoint')&&present.includes('cmd')&&init.entrypoint.length>0&&init.cmd.length>0)argv=[...init.entrypoint,...init.cmd];
   if(argv){
    if(JSON.stringify(argv)===JSON.stringify(['node','scripts/rcap-render-worker.mjs','--loop']))command='known_loop';
    else if(JSON.stringify(argv)===JSON.stringify(['node','-e','process.exit(0)']))command='known_health_only';
   }
  }
 }
 let configuredSupabaseHost='unknown';
 const env=config?.env;
 if(env===undefined)configuredSupabaseHost='absent';
 else if(env&&typeof env==='object'&&!Array.isArray(env)){
  const supplied=[env.SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_URL].filter(value=>value!==undefined&&value!==null&&value!=='');
  if(supplied.length===0)configuredSupabaseHost='absent';
  else {
   try {
    const urls=supplied.map(value=>{
     if(typeof value!=='string'||value.trim()!==value||/[\x00-\x1f\x7f]/.test(value))throw Error();
     const url=new URL(value);
     if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error();
     return url;
    });
    if(new Set(urls.map(url=>url.origin)).size!==1)configuredSupabaseHost='inconsistent';
    else if(urls[0].origin==='https://hyflxnlhpmiqxvvcoiia.supabase.co')configuredSupabaseHost='acceptance';
    else if(urls[0].origin==='https://wwtwtsmywnckfkdaqqeg.supabase.co')configuredSupabaseHost='known_production';
    else configuredSupabaseHost='other';
   }catch{configuredSupabaseHost='unknown';}
  }
 }
 return {command,configuredSupabaseHost,basis:'returned_machine_config_only'};
}

export async function readWorkerIdentity({token,fetchImpl=fetch}){
 const authorization=flyReadOnlyAuthorizationHeader(token);
 const response=await fetchImpl(`https://api.machines.dev/v1/apps/${APP}/machines`,{method:'GET',redirect:'error',headers:{Authorization:authorization},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`Fly identity GET HTTP ${response.status}`);
 const machines=await response.json();
 if(!Array.isArray(machines)||machines.some(m=>!m.id||!m.state))throw Error('Incomplete Fly machine identity');
 return {schemaVersion:'rcap-worker-readonly-identity/v1',app:APP,capturedAt:new Date().toISOString(),readOnly:true,secretValuesIncluded:false,runtimeClassifications:machines.map(m=>({machineId:m.id,...classifyWorkerRuntime(m.config)})),machines:machines.map(m=>({id:m.id,state:m.state,imageReference:m.config?.image??null,imageDigest:m.image_ref?.digest??null,imageRegistry:m.image_ref?.registry??null,imageRepository:m.image_ref?.repository??null,ociRevision:m.image_ref?.labels?.['org.opencontainers.image.revision']??null,recordedSourceSha:m.config?.metadata?.rcap_worker_source_sha??null,acceptedDigest:m.config?.env?.RCAP_WORKER_CONTAINER_DIGEST??null}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await readWorkerIdentity({token:process.env.FLY_API_TOKEN});fs.mkdirSync('worker-identity-evidence',{recursive:true});fs.writeFileSync('worker-identity-evidence/identity.json',JSON.stringify(result,null,2)+'\n');console.log('Fly machine identities recorded; GET only; no environment/configuration values emitted.');}
 catch{console.error('Read-only Fly identity inspection failed; raw response and credential withheld.');process.exitCode=1;}
}
