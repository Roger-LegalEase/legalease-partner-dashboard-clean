// Live transport only: the existing isolated application calls the real provider
// through an expiring, signed Vercel runtime. No simulated translation response.
import fs from 'node:fs';import {randomUUID} from 'node:crypto';import {callRuntime} from './runtime-client.mjs';
if(process.env.VERCEL_ENV!=='development'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321'||process.env.OPENAI_API_KEY!=='rcap-isolated-provider-fixture')throw Error('Live transport requires the existing isolated application');
const out='/workspaces/legalease-partner-dashboard-clean/artifacts/rcap-spanish-provider-incident',actualFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=String(input instanceof Request?input.url:input);if(!url.startsWith('https://api.openai.com/'))return actualFetch(input,init);
 if(url!=='https://api.openai.com/v1/responses')throw Error('Unexpected provider endpoint');
 const request=JSON.parse(init.body),source=JSON.parse(fs.readFileSync(out+'/production-public-source.json')).source,keys=Object.keys(JSON.parse(request.input).publicText),requestId=randomUUID();
 const result=callRuntime({requestId,source,keys,request,mode:'transport'});
 fs.appendFileSync(out+'/live-provider-calls.jsonl',JSON.stringify({requestId,providerRequestId:result.requestId,keys,ok:result.ok,databaseWrites:result.databaseWrites})+'\n');
 if(!result.ok||!result.provider)throw Error('Protected provider transport failed: '+(result.diagnostic?.code??result.error??'unknown'));
 fs.writeFileSync(out+'/last-live-provider-response.json',JSON.stringify(result),{mode:0o600});
 return new Response(JSON.stringify(result.provider),{status:200,headers:{'Content-Type':'application/json','x-request-id':result.requestId}});
};
