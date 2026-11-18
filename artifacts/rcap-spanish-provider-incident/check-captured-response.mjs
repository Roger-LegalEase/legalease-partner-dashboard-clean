import fs from 'node:fs';import {register}from'node:module';register('../../scripts/lib/ts-esm-loader.mjs',import.meta.url);
const {validateSpanishDraft,spanishFailureDiagnostic}=await import('../../src/lib/partners/onboarding/program-spanish-provider.ts');const p='artifacts/rcap-spanish-provider-incident';
const r=JSON.parse(fs.readFileSync(p+'/reproduction.json')),source=JSON.parse(fs.readFileSync(p+'/production-public-source.json')).source,keys=JSON.parse(fs.readFileSync(p+'/probe-manifest.json')).keys;
const output=JSON.parse(r.provider.output.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''));
console.log(JSON.stringify({fields:Object.fromEntries(Object.entries(output).map(([k,v])=>[k,{type:v===null?'null':typeof v,length:typeof v==='string'?v.length:null}]))}));
const failures=[];for(const key of keys)try{validateSpanishDraft(source,output,[key]);}catch(e){failures.push(spanishFailureDiagnostic(e,'validation'));}
fs.writeFileSync(p+'/captured-validation.json',JSON.stringify({failures,providerRequestId:r.requestId,unrequestedFieldWasNotNull:output.serviceArea!==null},null,2));console.log(JSON.stringify({failures}));
