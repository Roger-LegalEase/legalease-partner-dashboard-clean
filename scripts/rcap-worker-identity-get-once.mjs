import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APP,readWorkerIdentity} from './rcap-worker-identity-readonly.mjs';

export async function inspectWorkerOnce({token,fetchImpl=fetch}){
 let httpStatus=null,requestCount=0;
 const receipt={schemaVersion:'rcap-worker-get-once/v1',app:APP,readOnly:true,operation:'machine GET'};
 try{
   const identity=await readWorkerIdentity({token,fetchImpl:async(...args)=>{
     requestCount++;
     const response=await fetchImpl(...args);
     httpStatus=response.status;
     return response;
   }});
   return {...receipt,passed:true,httpStatus,requestCount,identity};
 }catch{
   const reason=httpStatus===null?'Identity inspection failed before an HTTP status was captured.':httpStatus>=200&&httpStatus<300?'Fly identity response was incomplete or unreadable.':`Fly identity GET HTTP ${httpStatus}; provider details withheld.`;
   return {...receipt,passed:false,httpStatus,requestCount,reason};
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await inspectWorkerOnce({token:process.env.FLY_API_TOKEN});
 fs.mkdirSync('worker-identity-evidence',{recursive:true});
 fs.writeFileSync('worker-identity-evidence/get-result.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed:result.passed,httpStatus:result.httpStatus,requestCount:result.requestCount,reason:result.reason}));
 if(!result.passed)process.exitCode=1;
}
