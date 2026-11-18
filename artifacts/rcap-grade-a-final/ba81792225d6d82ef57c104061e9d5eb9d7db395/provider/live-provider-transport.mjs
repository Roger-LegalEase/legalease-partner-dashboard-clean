// Live transport only: the existing isolated application calls the real provider
// through an expiring, signed Vercel runtime. No simulated translation response.
import fs from 'node:fs';import {randomUUID} from 'node:crypto';import {callRuntime} from './runtime-client.mjs';
if(process.env.VERCEL_ENV!=='development'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321'||process.env.OPENAI_API_KEY!=='rcap-isolated-provider-fixture')throw Error('Live transport requires the existing isolated application');
const out='/workspaces/legalease-partner-dashboard-clean/artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395/provider',actualFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=String(input instanceof Request?input.url:input);if(!url.startsWith('https://api.openai.com/'))return actualFetch(input,init);
 if(url!=='https://api.openai.com/v1/responses')throw Error('Unexpected provider endpoint');
 const requestData=JSON.parse(init.body);
 const modePath=out+'/isolated-failure-mode.json';
 if(fs.existsSync(modePath)){
  const {mode}=JSON.parse(fs.readFileSync(modePath));
  const keys=Object.keys(JSON.parse(requestData.input).publicText);
  fs.appendFileSync(out+'/isolated-failure-calls.jsonl',JSON.stringify({origin:'DETERMINISTIC_FAILURE_INJECTION',mode,keys,time:new Date().toISOString()})+'\n');
  if(mode==='unavailable')return new Response(JSON.stringify({error:{message:'Isolated provider unavailable',type:'server_error'}}),{status:503,headers:{'content-type':'application/json'}});
  if(mode==='unauthorized'||mode==='rate_limit')return new Response(JSON.stringify({error:{message:'Isolated injected refusal',type:mode==='unauthorized'?'authentication_error':'rate_limit_error'}}),{status:mode==='unauthorized'?401:429,headers:{'content-type':'application/json'}});
  if(mode==='timeout')return await new Promise((resolve,reject)=>{init.signal.addEventListener('abort',()=>reject(new DOMException('Isolated timeout','AbortError')),{once:true});});
  const fields=['headline','subheadline','organizationDescription','primaryActionLabel','participantSupportCopy','serviceArea','targetAudience'];
  let output=Object.fromEntries(fields.map(key=>[key,keys.includes(key)?mode==='schema'?42:mode==='semantic'?'Resultados garantizados':'Texto público de prueba':null]));
  if(mode==='concurrent'){
   const prior=JSON.parse(fs.readFileSync(out+'/concurrent-valid-provider-response.json'));output=JSON.parse(prior.provider.output.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''));
   fs.writeFileSync(out+'/concurrent-request-ready','ready');
   while(!fs.existsSync(out+'/concurrent-request-release'))await new Promise(r=>setTimeout(r,100));
  }
  return new Response(JSON.stringify({id:'resp_isolated_fixture',object:'response',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:mode==='malformed'?'{invalid':JSON.stringify(output),annotations:[]}]}]}),{status:200,headers:{'content-type':'application/json','x-request-id':'isolated_failure_injection'}});
 }
 const request=JSON.parse(init.body),source=JSON.parse(fs.readFileSync(out+'/production-public-source.json')).source,keys=Object.keys(JSON.parse(request.input).publicText),requestId=randomUUID();
 const result=callRuntime({requestId,source,keys,request,mode:'transport'});
 fs.appendFileSync(out+'/live-provider-calls.jsonl',JSON.stringify({requestId,providerRequestId:result.requestId,keys,ok:result.ok,databaseWrites:result.databaseWrites})+'\n');
 if(!result.ok||!result.provider)throw Error('Protected provider transport failed: '+(result.diagnostic?.code??result.error??'unknown'));
 fs.writeFileSync(out+'/last-live-provider-response.json',JSON.stringify(result),{mode:0o600});
 return new Response(JSON.stringify(result.provider),{status:200,headers:{'Content-Type':'application/json','x-request-id':result.requestId}});
};
