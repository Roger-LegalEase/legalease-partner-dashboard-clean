import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync('scripts/rcap-hosted-legal-aid-browser.mjs','utf8');
const block=source.slice(source.indexOf('// BEGIN response-bound signature/submit controls'),source.indexOf('// END response-bound signature/submit controls'));
const {signAll,submitApplication,sanitizedSubmitResult}=vm.runInNewContext(block+'\n({signAll,submitApplication,sanitizedSubmitResult})',{URL,Set,Error});
const origin='https://accepted-preview.example.test',id='10000000-0000-4000-8000-000000000001';
const keys=['financial_attestation','citizenship_attestation','information_sharing_consent'];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function browser({status=200,body={success:true,outcome:'submitted'},signStatus=200,signPayload={success:signStatus===200,signatureId:'10000000-0000-4000-8000-000000000002'}}={}){
 const calls=[],cards=keys.map(key=>({key,sign:true,busy:false,signed:false,finish:deferred(),reload:deferred()}));let watcher;
 const response=(action,key,code,payload,finish=Promise.resolve(null),path=`/api/legal-aid/intakes/${id}/actions`,method='POST',host=origin)=>({url:()=>host+path,request:()=>({method:()=>method,postDataJSON:()=>({action,statementKey:key})}),status:()=>code,finished:()=>finish,json:async()=>payload});
 const count=selector=>cards.filter(c=>selector.includes('Signing')?c.busy:c.sign).length;
 const page={
  locator(selector){
   if(selector==='div:has(> blockquote)')return {count:async()=>cards.length,nth:index=>({locator:s=>{
    const c=cards[index];
    if(s==='p')return {filter:()=>({waitFor:async()=>{await c.reload.promise;assert.equal(c.signed,true);calls.push('signed:'+index);}})};
    return {count:async()=>s.includes('Signing')?Number(c.busy):Number(c.sign),waitFor:async()=>{await c.reload.promise;assert.equal(c.busy,false);},click:async()=>{
     calls.push('sign:'+index);assert.ok(cards.slice(0,index).every(c=>c.signed));c.sign=false;c.busy=true;
     const actual=response('sign',c.key,signStatus,signPayload,c.finish.promise);
     assert.equal(watcher.predicate(actual),true);watcher.resolve(actual);
    }};
   }})};
   return {count:async()=>count(selector)};
  },
  waitForResponse(predicate){const d=deferred();watcher={predicate,resolve:d.resolve};return d.promise;},
  async click(){calls.push('submit');assert.ok(cards.every(c=>c.signed));const actual=response('submit',null,status,body);assert.ok(watcher.predicate(actual));watcher.resolve(actual);},
  async waitForSelector(){calls.push('success-banner');}
 };
 return {page,cards,calls,response,get watcher(){return watcher;},finish(i){cards[i].finish.resolve(null);},reload(i){cards[i].busy=false;cards[i].signed=true;cards[i].reload.resolve();},signed(){for(const c of cards){c.sign=false;c.busy=false;c.signed=true;}}};
}
test('each sign waits for complete HTTP 200 and server-reloaded signed UI; submit follows all three',async()=>{
 const b=browser();let complete=false;
 const task=signAll(b.page,id,origin).then(()=>{complete=true;return submitApplication(b.page,id,origin,()=>{});});
 for(let i=0;i<3;i++){
  await tick();assert.deepEqual(b.calls.filter(c=>c.startsWith('sign:')),Array.from({length:i+1},(_,j)=>'sign:'+j));
  assert.equal(complete,false);assert.equal(b.cards[i].sign,false);assert.equal(b.cards[i].busy,true);
  await assert.rejects(submitApplication(b.page,id,origin,()=>{}),/incomplete or pending/);
  assert.equal(b.calls.includes('submit'),false);
  b.finish(i);await tick();assert.equal(complete,false);assert.equal(b.calls.includes('sign:'+(i+1)),false);
  b.reload(i);
 }
 await task;assert.equal(complete,true);assert.deepEqual(b.calls,['sign:0','signed:0','sign:1','signed:1','sign:2','signed:2','submit','success-banner']);
});
for(const signStatus of [409,500])test(`sign ${signStatus} refuses before next sign or submit`,async()=>{
 const b=browser({signStatus});await assert.rejects(signAll(b.page,id,origin),new RegExp('HTTP '+signStatus));assert.deepEqual(b.calls,['sign:0']);
});
test('exact response matcher excludes other action, intake, origin and HTTP method',async()=>{
 const b=browser();const task=signAll(b.page,id,origin);await tick();const match=b.watcher.predicate;
 for(const r of [b.response('submit',keys[0],200,{}),b.response('sign',keys[0],200,{},undefined,'/api/legal-aid/intakes/other/actions'),b.response('sign',keys[0],200,{},undefined,undefined,'GET'),b.response('sign',keys[0],200,{},undefined,undefined,'POST','https://other.test')])assert.equal(match(r),false);
 for(let i=0;i<3;i++){b.finish(i);b.reload(i);await tick();}await task;
});
test('409 surfaces only sanitized structured outcome immediately, with no success-banner wait',async()=>{
 const b=browser({status:409,body:{success:false,outcome:'signature_required',statementKey:'financial_attestation',missing:['name.first'],errors:{ssn:'123-45-6789'},error:'participant private text',answers:{ssn:'123456789'}}});b.signed();let observed;
 await assert.rejects(submitApplication(b.page,id,origin,r=>{observed=r;}),error=>{assert.match(error.message,/signature_required/);assert.doesNotMatch(error.message,/123|private|answers/);return true;});
 assert.deepEqual(JSON.parse(JSON.stringify(observed)),{status:409,success:false,outcome:'signature_required',statementKey:'financial_attestation',missingFields:['name.first'],errorFields:['ssn'],error:'Submission refused; see bounded outcome and field keys.'});assert.deepEqual(b.calls,['submit']);
});
for(const outcome of ['submitted','already_submitted'])test(`submit accepts HTTP 200 ${outcome} before UI wait`,async()=>{const b=browser({body:{success:true,outcome}});b.signed();assert.equal((await submitApplication(b.page,id,origin,()=>{})).outcome,outcome);assert.deepEqual(b.calls,['submit','success-banner']);});
test('unrecognized server strings never enter evidence',()=>{const r=sanitizedSubmitResult(409,{outcome:'123-45-6789',statementKey:'private name',missing:['123456789',{ssn:'123'}],errors:{'123-45-6789':'secret'}});assert.deepEqual(JSON.parse(JSON.stringify(r)),{status:409,success:false,outcome:'unrecognized_outcome',missingFields:[],errorFields:[],error:'Submission refused; see bounded outcome and field keys.'});});
test('CAPTCHA/session, seed, worker readiness and metadata implementation remain byte-identical to the conditional parent',()=>{
 const base='4ea0f4f111ba5863bdbef3817c75bb2949232e34';
 const prior=rel=>execFileSync('git',['show',`${base}:${rel}`],{encoding:'utf8'});
 const previous=prior('scripts/rcap-hosted-legal-aid-browser.mjs');
 const section=s=>s.slice(s.indexOf('    // 2. Applicant A:'),s.indexOf('    const personA ='));
 assert.equal(section(source),section(previous));
 assert.equal(source.slice(0,source.indexOf('// BEGIN response-bound')),previous.slice(0,previous.indexOf('async function signAll(page)')));
 const tail='    // Another participant cannot read A';assert.equal(source.slice(source.indexOf(tail)),previous.slice(previous.indexOf(tail)));
 for(const rel of ['scripts/rcap-hosted-legal-aid-seed.mjs','scripts/rcap-legal-aid/hosted-fixture.mjs','scripts/rcap-hosted-legal-aid-startup.test.mjs','scripts/rcap-production-worker-readiness.mjs','scripts/rcap-production-worker-readiness.test.mjs','scripts/rcap-production-environment-metadata.mjs','scripts/rcap-production-environment-metadata.test.mjs','scripts/rcap-production-canary.mjs','scripts/rcap-production-canary-smoke.mjs'])assert.equal(fs.readFileSync(rel,'utf8'),prior(rel),rel);
});

for(const signPayload of [{success:false,signatureId:id},{success:true},{success:true,signatureId:'invented'}])test(`HTTP 200 sign refuses invalid confirmation ${JSON.stringify(signPayload)}`,async()=>{
 const b=browser({signPayload});b.finish(0);await assert.rejects(signAll(b.page,id,origin),/did not confirm/);assert.deepEqual(b.calls,['sign:0']);
});
test('only exact frozen public submit error copy is retained',()=>{
 const r=sanitizedSubmitResult(409,{success:false,outcome:'signature_required',error:'Sign each statement that applies to you before submitting.'});
 assert.equal(r.error,'Sign each statement that applies to you before submitting.');
});
test('signature submit successor binding is exact, preserves earlier tools and refuses merges or alternate parents',async()=>{
 const {execFileSync}=await import('node:child_process');const vm=await import('node:vm');
 const base='4ea0f4f111ba5863bdbef3817c75bb2949232e34',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));const binding=JSON.parse(fs.readFileSync(toolsPath));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('  if(signatureSubmitCorrection){'),source.indexOf('  }else if(environmentCorrection){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const SIGNATURE_SUBMIT_FILES=(\[[\s\S]*?\]);/)[1]);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){
  const b=structuredClone(binding);mutate(b);
  vm.runInNewContext(scope+'\n'+ancestry,{binding:b,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,signatureSubmitCorrection:b.successorTools.preactivationLegalAidSignatureSubmitBaseSha,SIGNATURE_SUBMIT_BASE:base,SIGNATURE_SUBMIT_FILES:files,commitBase:base,
   expect:(a,b,message)=>assert.equal(JSON.stringify(a),JSON.stringify(b),message),git:args=>({show:JSON.stringify(prior),diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});
 }
 run();
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationLegalAidSignatureSubmitBaseSha='0'.repeat(40)}),/exact signature submit correction base/);
 for(const delta of [files.slice(1),[...files,'src/unrelated.ts']])assert.throws(()=>run({delta}),/exact signature submit correction paths/);
 for(const rel of ['scripts/rcap-production-worker-readiness.mjs','scripts/rcap-production-environment-metadata.mjs'])assert.throws(()=>run({mutate:b=>b.successorTools.files[rel]='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationProductionEnvironmentMetadataCorrectionBaseSha}),/only bounded signature submit correction/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
});

test('field diagnostics allow exactly frozen schema keys, including numbered address keys, never arbitrary response text',async()=>{
 const ts=await import('typescript');const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/legal-aid/intake-schema.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
 const keys=Array.from(exports.INTAKE_FIELDS,f=>f.key).sort();
 const result=sanitizedSubmitResult(409,{outcome:'validation_failed',missing:[...keys,'private_participant_text','123-45-6789'],errors:{'address.line1':'protected answer','private_participant_text':'secret'}});
 assert.deepEqual(JSON.parse(JSON.stringify(result.missingFields)),keys);
 assert.deepEqual(JSON.parse(JSON.stringify(result.errorFields)),['address.line1']);
});
