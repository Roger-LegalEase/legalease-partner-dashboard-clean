import fs from 'node:fs';import path from 'node:path';import {generateKeyPairSync,createHash} from 'node:crypto';
const root=process.cwd(),out=path.join(root,'artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395/provider'),release=root;
const {privateKey,publicKey}=generateKeyPairSync('ed25519');fs.writeFileSync(path.join(out,'probe-private.pem'),privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const source=JSON.parse(fs.readFileSync(path.join(out,'production-public-source.json'))).source;
const digest=createHash('sha256').update(JSON.stringify(stable(source))).digest('hex');
const expires=Date.now()+4*60*60*1000;
const code=`// TEMPORARY signed, expiring, fixed-source incident probe. Never in final release.
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, verify } from 'node:crypto';
import OpenAI from 'openai';
import { draftProgramSpanish, SpanishPreparationError, spanishFailureDiagnostic, spanishProviderConfig } from './program-spanish-provider';
import type { PublicCopyKey, publicCopySource } from './program-defaults';
const publicKey=${JSON.stringify(publicKey.export({type:'spki',format:'pem'}))};
const expires=${expires};const sourceHash=${JSON.stringify(digest)};
const stable=(v:unknown):unknown=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable((v as Record<string,unknown>)[k])])):v;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const capture=new AsyncLocalStorage<{provider?:unknown;requestId?:string}>();const actualFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{const response=await actualFetch(input,init);const current=capture.getStore();if(current&&String(input instanceof Request?input.url:input)==='https://api.openai.com/v1/responses'){current.requestId=response.headers.get('x-request-id')??undefined;current.provider=await response.clone().json();}return response;};
const attempts=new Map<string,Promise<unknown>>();
export async function incidentProbe(request:Request){
 const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private'}});
 if(process.env.RCAP_PROVIDER_INCIDENT_PROBE!=='true'||Date.now()>expires)return reply({error:'Probe expired'},404);
 const raw=await request.text();if(raw.length>24000||!verify(null,Buffer.from(raw),publicKey,Buffer.from(request.headers.get('x-rcap-provider-signature')??'','base64')))return reply({error:'Signature required'},403);
 const body=JSON.parse(raw);if(hash(body.source)!==sourceHash||typeof body.requestId!=='string'||!Array.isArray(body.keys)||body.keys.some((k:string)=>!Object.hasOwn(body.source.english,k)))return reply({error:'Exact public source required'},400);
 if(!attempts.has(body.requestId)){
  if(attempts.size>=5)return reply({error:'Probe request limit reached'},429);
  attempts.set(body.requestId,(async()=>{
   const receipt:{provider?:unknown;requestId?:string}={};
   return capture.run(receipt,async()=>{
    try{
     if(body.mode==='transport'){
      const config=spanishProviderConfig(),p=body.request,input=JSON.parse(p.input);
      if(p.model!==config.model||p.store!==false||p.max_output_tokens!==8000||hash(input.identity)!==hash(body.source.identity)||hash(input.authorizedJurisdictions)!==hash(body.source.jurisdictions)||input.services!==body.source.services||hash(input.publicText)!==hash(Object.fromEntries(body.keys.map((k:string)=>[k,body.source.english[k]]))))throw Error('Provider request does not match public source');
      const client=new OpenAI({...config,maxRetries:0,timeout:30000});await client.responses.create(p);
      return {ok:true,...receipt,databaseWrites:0};
     }
     const copy=await draftProgramSpanish(body.source as ReturnType<typeof publicCopySource>,body.keys as PublicCopyKey[],body.requestId);
     return {ok:true,copy,...receipt,databaseWrites:0};
    }catch(error){return {ok:false,diagnostic:error instanceof SpanishPreparationError?error.diagnostic:spanishFailureDiagnostic(error,'request'),...receipt,databaseWrites:0};}
   });
  })());
 }
 return reply(await attempts.get(body.requestId));
}
`;
fs.writeFileSync(path.join(release,'src/lib/partners/onboarding/incident-runtime-probe.ts'),code);
const route=path.join(release,'src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/program/route.ts');const original=fs.readFileSync(route,'utf8');fs.writeFileSync(path.join(out,'original-program-route.ts'),original);
fs.writeFileSync(route,"import { incidentProbe } from '@/lib/partners/onboarding/incident-runtime-probe';\n"+original.replace(' assertSameOrigin(request);'," if(process.env.RCAP_PROVIDER_INCIDENT_PROBE==='true' && (await params).partnerSlug==='rcap-provider-incident')return incidentProbe(request);\n assertSameOrigin(request);"));
fs.writeFileSync(path.join(out,'probe-manifest.json'),JSON.stringify({sourceHash:digest,expiresAt:new Date(expires).toISOString(),keys:Object.keys(source.english).filter(k=>k!=='serviceArea'),databaseWrites:0},null,2));
console.log(JSON.stringify({sourceHash:digest,fields:7,requestedProviderFields:6,approvedStandardFields:1,expiresAt:new Date(expires).toISOString()}));
