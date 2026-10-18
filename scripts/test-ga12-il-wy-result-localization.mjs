// GA-12 Q-3ab8bb479903ec6dc680 / Q-51b8ea53b02426f2f685 / QD-bd6b15fff22cbe1501cb.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
if(mutation){assert(['IL','WY'].includes(mutation));register('data:text/javascript,'+encodeURIComponent(`let state;export function initialize(x){state=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/reviewed-result-copy.ts')){const target=state==='IL'?'...Object.values(IL_PROSTITUTION_COPY)':'...Object.values(WY_1502_COPY)';if(!r.source.includes(target))throw Error('mutation target absent');return {...r,source:r.source.replace(target,'...[]')}}return r}`),{data:mutation});}
const {IL_PROSTITUTION_COPY}=await import('../src/lib/rcap-engine/illinois-prostitution-facts.ts');
const {WY_1502_COPY}=await import('../src/lib/rcap-engine/wyoming-1502-facts.ts');
const {reviewedResultText}=await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {packetMatterSummaryCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
let checks=0;const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,checks}));throw e;}};
const pairs={IL:IL_PROSTITUTION_COPY,WY:WY_1502_COPY};
for(const[state,copy]of Object.entries(pairs))for(const[code,pair]of Object.entries(copy))check(state+'/'+code+' reason and next-step display',()=>{
 assert(Array.isArray(pair));assert.equal(pair.length,2);const[en,es]=pair;assert(es&&es!==en);
 assert.deepEqual(reviewedResultText(en),{en,es});assert.equal(resolveRuntimeText('es',en),es);assert.equal(resolveRuntimeText('en',en),en);
 assert.deepEqual(packetMatterSummaryCopy({authorityStatus:'available',summary:en}),{en,es});
 assert.deepEqual(packetMatterSummaryCopy({authorityStatus:'unavailable',summary:en}),{en});
});
// Exact lead-reviewed vocabulary, including all B1/B2 additions; no worker translation.
check('17 pairs match the lead-reviewed English and Spanish',()=>{
 const canonical=Object.fromEntries(Object.entries(pairs).map(([state,copy])=>[state,Object.fromEntries(Object.keys(copy).sort().map(key=>[key,{en:copy[key][0],es:copy[key][1]}]))]));
 assert.equal(createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),'070690ffda3cdb8b94f428148e2fdfc078d4a8ded1d5792ee480e2c747cef4d2');assert.equal(checks,17);
});
console.log(JSON.stringify({status:'PASS',checks,translatedPairs:17,liveCalls:0}));
