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
 if(typeof token!=='string'||!token.trim())throw Error('Existing runner Fly credential unavailable');
 const t=token.trim();
 if(/[\r\n]/.test(t))throw Error('Malformed Fly credential');
 if(/^FlyV1\s+\S+$/i.test(t)||/^Bearer\s+\S+$/i.test(t))return t;
 if(/^fm2_\S+$/.test(t))return `FlyV1 ${t}`;
 if(/^\S+$/.test(t))return `Bearer ${t}`;
 throw Error('Malformed Fly credential');
}
export async function readWorkerIdentity({token,fetchImpl=fetch}){
 const authorization=flyReadOnlyAuthorizationHeader(token);
 const response=await fetchImpl(`https://api.machines.dev/v1/apps/${APP}/machines`,{method:'GET',redirect:'error',headers:{Authorization:authorization},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`Fly identity GET HTTP ${response.status}`);
 const machines=await response.json();
 if(!Array.isArray(machines)||machines.some(m=>!m.id||!m.state))throw Error('Incomplete Fly machine identity');
 return {schemaVersion:'rcap-worker-readonly-identity/v1',app:APP,capturedAt:new Date().toISOString(),readOnly:true,secretValuesIncluded:false,machines:machines.map(m=>({id:m.id,state:m.state,imageReference:m.config?.image??null,imageDigest:m.image_ref?.digest??null,imageRegistry:m.image_ref?.registry??null,imageRepository:m.image_ref?.repository??null,ociRevision:m.image_ref?.labels?.['org.opencontainers.image.revision']??null,recordedSourceSha:m.config?.metadata?.rcap_worker_source_sha??null,acceptedDigest:m.config?.env?.RCAP_WORKER_CONTAINER_DIGEST??null}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await readWorkerIdentity({token:process.env.FLY_API_TOKEN});fs.mkdirSync('worker-identity-evidence',{recursive:true});fs.writeFileSync('worker-identity-evidence/identity.json',JSON.stringify(result,null,2)+'\n');console.log('Fly machine identities recorded; GET only; no environment/configuration values emitted.');}
 catch{console.error('Read-only Fly identity inspection failed; raw response and credential withheld.');process.exitCode=1;}
}
