import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { signAll, submitApplication, sanitizedSubmitResult } from './rcap-legal-aid/hosted-actions.mjs';
import { resolveLegalAidFixture } from './rcap-legal-aid/hosted-fixture.mjs';
import { verifyBrowserRecords } from './rcap-production-legal-aid-browser-receipt.mjs';
const origin='https://accepted-preview.example.test',id='10000000-0000-4000-8000-000000000001';
const keys=['financial_attestation','citizenship_attestation','information_sharing_consent'];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function browser({status=200,body={success:true,outcome:'submitted'},signStatus=200}={}){
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
     const actual=response('sign',c.key,signStatus,{success:signStatus===200},c.finish.promise);
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
test('sign refusal stops before the next sign or submit',async()=>{
 const b=browser({signStatus:409});await assert.rejects(signAll(b.page,id,origin),/HTTP 409/);assert.deepEqual(b.calls,['sign:0']);
});
test('exact response matcher excludes other action, intake, origin and HTTP method',async()=>{
 const b=browser();const task=signAll(b.page,id,origin);await tick();const match=b.watcher.predicate;
 for(const r of [b.response('submit',keys[0],200,{}),b.response('sign',keys[0],200,{},undefined,'/api/legal-aid/intakes/other/actions'),b.response('sign',keys[0],200,{},undefined,undefined,'GET'),b.response('sign',keys[0],200,{},undefined,undefined,'POST','https://other.test')])assert.equal(match(r),false);
 for(let i=0;i<3;i++){b.finish(i);b.reload(i);await tick();}await task;
});
test('409 surfaces only sanitized structured outcome immediately, with no success-banner wait',async()=>{
 const b=browser({status:409,body:{success:false,outcome:'signature_required',statementKey:'financial_attestation',missing:['name_first'],errors:{ssn:'123-45-6789'},error:'participant private text',answers:{ssn:'123456789'}}});b.signed();let observed;
 await assert.rejects(submitApplication(b.page,id,origin,r=>{observed=r;}),error=>{assert.match(error.message,/signature_required/);assert.doesNotMatch(error.message,/123|private|answers/);return true;});
 assert.deepEqual(observed,{status:409,success:false,outcome:'signature_required',statementKey:'financial_attestation',missingFields:['name_first'],errorFields:['ssn']});assert.deepEqual(b.calls,['submit']);
});
for(const outcome of ['submitted','already_submitted'])test(`submit accepts HTTP 200 ${outcome} before UI wait`,async()=>{const b=browser({body:{success:true,outcome}});b.signed();assert.equal((await submitApplication(b.page,id,origin,()=>{})).outcome,outcome);assert.deepEqual(b.calls,['submit','success-banner']);});
test('unrecognized server strings never enter evidence',()=>{const r=sanitizedSubmitResult(409,{outcome:'123-45-6789',statementKey:'private name',missing:['123456789',{ssn:'123'}],errors:{'123-45-6789':'secret'}});assert.deepEqual(r,{status:409,success:false,outcome:'unrecognized_outcome',missingFields:[],errorFields:[]});});
test('run namespace deterministic, valid UUID and unique across run and attempt; participant identities preserved',()=>{
 const a=resolveLegalAidFixture({GITHUB_RUN_ID:'36663238472',GITHUB_RUN_ATTEMPT:'1'});
 assert.deepEqual(a,resolveLegalAidFixture({GITHUB_RUN_ID:'36663238472',GITHUB_RUN_ATTEMPT:'1'}));
 for(const env of [{GITHUB_RUN_ID:'36663238473',GITHUB_RUN_ATTEMPT:'1'},{GITHUB_RUN_ID:'36663238472',GITHUB_RUN_ATTEMPT:'2'}]){const b=resolveLegalAidFixture(env);assert.notEqual(a.eventId,b.eventId);assert.notEqual(a.eventSlug,b.eventSlug);assert.notEqual(a.eventName,b.eventName);assert.deepEqual(a.identities,b.identities);assert.equal(a.packetApplicantEmail,b.packetApplicantEmail);}
 assert.match(a.eventId,/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);assert.equal(a.partnerSlug,'mvlp');assert.equal(a.packetApplicantEmail,'mvl-demo-participant-a@rcap-acceptance.test');assert.deepEqual(resolveLegalAidFixture({}),resolveLegalAidFixture({}));
 assert.throws(()=>resolveLegalAidFixture({GITHUB_RUN_ID:"bad'input"}));
});
test('browser binds seed namespace and exact profile/event; every applicant uses response-bound signing and submission',()=>{
 const source=fs.readFileSync('scripts/rcap-hosted-legal-aid-browser.mjs','utf8');
 for(const key of ['runId','runAttempt','eventId','eventSlug'])assert.ok(source.includes(`seed.${key} === F.${key}`));
 for(const a of ['a','b','c']){assert.ok(source.includes(`await signAll(${a}, signing${a.toUpperCase()}.id, PREVIEW)`));assert.ok(source.includes(`await submitApplication(${a}, signing${a.toUpperCase()}.id, PREVIEW`));}
 assert.ok(source.indexOf('applicant_a_current_signatures_confirmed_before_submit')<source.indexOf('await submitApplication(a,'));assert.match(source,/s\.answers_hash=i\.answers_hash/);assert.match(source,/s\.status='active'/);
 assert.ok(source.includes('await internal.selectOption("select[name=policyProfileId]", draft.id)'));assert.ok(source.includes('a[href="${registrationPath}"]'));
 assert.doesNotMatch(source,/click\("button:has-text\('Submit my application'\)/);
});
test('seed preserves profiles and both append-only audits; resets are scoped to current event',()=>{
 const s=fs.readFileSync('scripts/rcap-hosted-legal-aid-seed.mjs','utf8');
 assert.doesNotMatch(s,/(?:delete from|update|truncate(?: table)?)\s+public\.(?:clinic_event_audit|legal_aid_access_audit|legal_aid_policy_profiles)\b/i);
 assert.doesNotMatch(s,/(?:disable|drop)\s+trigger|session_replication_role/i);
 for(const match of s.matchAll(/delete from public\.(legal_aid_\w+|clinic_\w+)[^;]+;/g))assert.ok(match[0].includes("event_id='${F.eventId}'"),match[0]);
 for(const file of ['scripts/rcap-hosted-legal-aid-seed.mjs','scripts/rcap-hosted-legal-aid-browser.mjs'])for(const key of ['runId','runAttempt','eventId','eventSlug'])assert.ok(fs.readFileSync(file,'utf8').includes(`${key}: F.${key}`));
});
test('unchanged Production receipt accepts two dynamic synthetic namespaces',()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));const preview=candidate.hostedAcceptance.preview;
 for(const runId of ['36663238473','36663238474']){
  const f=resolveLegalAidFixture({GITHUB_RUN_ID:runId,GITHUB_RUN_ATTEMPT:'1'});
  const identity={passed:true,applicationSha:candidate.applicationSha,acceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',previewDeploymentId:preview.deploymentId,previewUrl:`https://${preview.hostname}`,runId:f.runId,runAttempt:f.runAttempt,eventId:f.eventId,eventSlug:f.eventSlug};
  const records={'legal-aid/browser.json':{...identity,schemaVersion:'rcap-hosted-legal-aid-browser/v1',cases:{actual:{passed:true}},...Object.fromEntries(['workerRun','migrationApplied','checkoutCreated','paymentCompleted','productionTouched','stripeTouched','secretsRecorded','protectedValueRecorded'].map(k=>[k,false]))},'legal-aid/seed.json':{...identity,schemaVersion:'rcap-hosted-legal-aid-seed/v1',passwordsRecorded:false}};
  for(const mode of ['prerequisite','preservation','relationships'])records[`legal-aid/${mode}.json`]={status:'PASS',boundary:mode,native:{result:'PASS'},applicationSha:candidate.applicationSha,project:'hyflxnlhpmiqxvvcoiia',deploymentId:preview.deploymentId,hostname:preview.hostname};
  assert.doesNotThrow(()=>verifyBrowserRecords(records,candidate));
 }
});
test('harness successor binding is exact, preserves earlier tools and refuses merges or alternate parents',async()=>{
 const {execFileSync}=await import('node:child_process');const vm=await import('node:vm');
 const base='ac9befc5972ebd24e5f1aba2e07ee9081d554698',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));const binding=JSON.parse(execFileSync('git',['show',`721530ba23f65b5fadd6e72ce83acd87e2d3b2d7:${toolsPath}`],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(legalAidHarnessSuccessor){'),source.indexOf('  }else if(seedRerunCorrection){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const LEGAL_AID_HARNESS_SUCCESSOR_FILES=(\[[\s\S]*?\]);/)[1]);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){
  const b=structuredClone(binding);mutate(b);
  vm.runInNewContext(scope+'\n'+ancestry,{binding:b,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,legalAidHarnessSuccessor:b.successorTools.preactivationLegalAidHarnessSuccessorBaseSha,LEGAL_AID_HARNESS_SUCCESSOR_BASE:base,LEGAL_AID_HARNESS_SUCCESSOR_FILES:files,commitBase:base,
   expect:(a,b,message)=>assert.equal(JSON.stringify(a),JSON.stringify(b),message),git:args=>({show:JSON.stringify(prior),diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});
 }
 run();
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationLegalAidHarnessSuccessorBaseSha='0'.repeat(40)}),/exact Legal Aid harness successor base/);
 for(const delta of [files.slice(1),[...files,'src/unrelated.ts']])assert.throws(()=>run({delta}),/exact Legal Aid harness successor paths/);
 for(const rel of ['scripts/rcap-production-worker-readiness.mjs','scripts/rcap-production-worker-readiness.test.mjs'])assert.throws(()=>run({mutate:b=>b.successorTools.files[rel]='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationLegalAidSeedRerunCorrectionBaseSha}),/only bounded Legal Aid harness successor/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
});


test('real relationshipQuery binds each run namespace while preserving every historical owner/job/join and scalar constraint', async()=>{
 const {relationshipQuery}=await import('./rcap-hosted-legal-aid-prerequisite.mjs');
 const {LEGAL_AID_FIXTURE}=await import('./rcap-legal-aid/hosted-fixture.mjs');
 const {RESUME,CHECKPOINT}=await import('./rcap-clinic-resume-contract.mjs');
 const {execFileSync}=await import('node:child_process');const vm=await import('node:vm');
 const parent='721530ba23f65b5fadd6e72ce83acd87e2d3b2d7';
 const oldSource=execFileSync('git',['show',`${parent}:scripts/rcap-hosted-legal-aid-prerequisite.mjs`],{encoding:'utf8'});
 const oldFunction=oldSource.slice(oldSource.indexOf('export function relationshipQuery('),oldSource.indexOf('export function verifierOutput(')).replace('export function','function');
 const oldId='78000000-0000-4000-8000-000000000001',oldSlug='mvlp-training-clinic-acceptance';
 const before=vm.runInNewContext(oldFunction+'\nrelationshipQuery()',{RESUME,EVENT:oldId});
 const historicalIdentity=JSON.stringify({RESUME,CHECKPOINT});
 const environments=[{GITHUB_RUN_ID:'36663238472',GITHUB_RUN_ATTEMPT:'1'},{GITHUB_RUN_ID:'36663238473',GITHUB_RUN_ATTEMPT:'1'},{GITHUB_RUN_ID:'36663238472',GITHUB_RUN_ATTEMPT:'2'}];
 const fixtures=environments.map(resolveLegalAidFixture);
 assert.equal(new Set(fixtures.map(f=>f.eventId)).size,3);
 assert.equal(new Set(fixtures.map(f=>f.eventSlug)).size,3);
 const queries=environments.map(env=>{
  const fixture=resolveLegalAidFixture(env),sql=relationshipQuery(fixture);
  assert.ok(sql.includes(`where id='${fixture.eventId}' and public_slug='${fixture.eventSlug}'`));
  assert.ok(sql.includes(`r.participant_user_id='${RESUME.owner}'`));
  assert.ok(sql.includes(`t.unsigned_render_job_id='${RESUME.job}'`));
  assert.ok(!sql.includes(oldId));assert.ok(!sql.includes(oldSlug));
  assert.equal(sql,before.replace(oldId,fixture.eventId).replace(oldSlug,fixture.eventSlug));
  assert.equal(sql,relationshipQuery(resolveLegalAidFixture(env)));
  assert.deepEqual(fixture.identities,LEGAL_AID_FIXTURE.identities);
  assert.equal(fixture.packetApplicantEmail,LEGAL_AID_FIXTURE.packetApplicantEmail);
  assert.doesNotMatch(sql,/order by|limit|coalesce/i);
  assert.equal(JSON.stringify({RESUME,CHECKPOINT}),historicalIdentity);
  for(const other of fixtures.filter(f=>f.eventId!==fixture.eventId)) { assert.ok(!sql.includes(other.eventId));assert.ok(!sql.includes(other.eventSlug)); }
  return sql;
 });
 assert.equal(new Set(queries).size,3);
 assert.equal(relationshipQuery(),relationshipQuery(LEGAL_AID_FIXTURE));
 for(const rel of ['scripts/legal-aid/verify-applicant-a-prerequisite.mjs','scripts/rcap-clinic-resume-contract.mjs','scripts/rcap-legal-aid/hosted-fixture.mjs','scripts/rcap-legal-aid/hosted-actions.mjs','scripts/rcap-hosted-legal-aid-browser.mjs','scripts/rcap-hosted-legal-aid-seed.mjs'])assert.equal(fs.readFileSync(rel,'utf8'),execFileSync('git',['show',`${parent}:${rel}`],{encoding:'utf8'}),rel);
});

test('relationships successor binding is exact, preserves earlier tools and refuses merges or alternate parents',async()=>{
 const {execFileSync}=await import('node:child_process');const vm=await import('node:vm');
 const base='721530ba23f65b5fadd6e72ce83acd87e2d3b2d7',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));const binding=JSON.parse(execFileSync('git',['show',`80e014d35c6af4dcfd57957013781483bb4ffb52:${toolsPath}`],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(relationshipsCorrection){'),source.indexOf('  }else if(legalAidHarnessSuccessor){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const LEGAL_AID_RELATIONSHIPS_FILES=(\[[\s\S]*?\]);/)[1]);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){
  const b=structuredClone(binding);mutate(b);
  vm.runInNewContext(scope+'\n'+ancestry,{binding:b,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,relationshipsCorrection:b.successorTools.preactivationLegalAidRelationshipsCorrectionBaseSha,LEGAL_AID_RELATIONSHIPS_BASE:base,LEGAL_AID_RELATIONSHIPS_FILES:files,commitBase:base,
   expect:(a,b,message)=>assert.equal(JSON.stringify(a),JSON.stringify(b),message),git:args=>({show:JSON.stringify(prior),diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});
 }
 run();
 for(const [key,value] of [['applicationSha','0'.repeat(40)],['workerInputFingerprint','sha256:'+'0'.repeat(64)],['workerRebuildRequired',true]])assert.throws(()=>run({mutate:b=>b[key]=value}),/only bounded Legal Aid relationships correction/);
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationLegalAidRelationshipsCorrectionBaseSha='0'.repeat(40)}),/exact Legal Aid relationships correction base/);
 for(const delta of [files.slice(1),[...files,'src/unrelated.ts']])assert.throws(()=>run({delta}),/exact Legal Aid relationships correction paths/);
 for(const rel of ['scripts/rcap-production-worker-readiness.mjs','scripts/rcap-production-worker-readiness.test.mjs'])assert.throws(()=>run({mutate:b=>b.successorTools.files[rel]='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationLegalAidHarnessSuccessorBaseSha}),/only bounded Legal Aid relationships correction/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
});
