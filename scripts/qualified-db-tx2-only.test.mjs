import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {hash,executeQualifiedDatabaseTransactions} from './qualified-production-database.mjs';
import {loadQualifiedDatabasePackage} from './qualified-production-database-package.mjs';
import {readQualifiedDatabaseAcceptedFirstCommit,QUALIFIED_DATABASE_PARTIAL_REFS} from './qualified-db-accepted-first-commit.mjs';
import {readQualifiedDatabaseNoEffectRearm,QUALIFIED_DATABASE_PACKAGE_SHA256} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {assertForwardSingleAttempt} from './grade-a-launch-control/forward-production-single-attempt.mjs';
const root=process.cwd(),prior=readQualifiedDatabaseAcceptedFirstCommit(root),source=await loadQualifiedDatabasePackage(root,QUALIFIED_DATABASE_PACKAGE_SHA256);
const rearm=readQualifiedDatabaseNoEffectRearm(root),original='2026-10-28T00:40:16.119879+00:00';
const scratch=()=>fs.mkdtempSync(path.join(os.tmpdir(),'qualified-tx2-only-'));
test('actual partial acceptance, native receipt and corrected package evidence are mandatory and immutable',()=>{
 assert.equal(prior.runId,40615885933);assert.equal(prior.transaction.nativeReceipt.step,0);assert.equal(prior.correctedPackageSha256,source.manifestSha256);
 const dir=scratch();try{
  for(const ref of Object.values(QUALIFIED_DATABASE_PARTIAL_REFS)){const file=path.join(dir,ref.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(ref.path,file);}
  assert.deepEqual(readQualifiedDatabaseAcceptedFirstCommit(dir),prior);
  for(const ref of Object.values(QUALIFIED_DATABASE_PARTIAL_REFS)){const file=path.join(dir,ref.path),bytes=fs.readFileSync(file);fs.writeFileSync(file,'{}');assert.throws(()=>readQualifiedDatabaseAcceptedFirstCommit(dir));fs.writeFileSync(file,bytes);}
 }finally{fs.rmSync(dir,{recursive:true});}
});
function coreFixture({drift=false,badReceipt=false,failIntent=false}={}){
 let state=1,reads=0;const indices=[],applied=[],saved=[];
 const ports={transactions:source.transactions,priorAcceptedCommit:prior,admit:async()=>{},readState:async()=>++reads===2&&drift?-1:state,assertState:async(index,snapshot)=>assert.equal(index,snapshot),prepareWire:async({index,transaction})=>{indices.push(index);return{wireSql:transaction.sql,wireSha256:transaction.sha256,canonicalSha256:transaction.sha256,wirePath:'fixture-only.sql',beforeStateSha256:'fixture-only'};},apply:async(sql,{index})=>{applied.push({sql,index});state=2;return{schemaVersion:'wwt-two-migration-schema-native-receipt/v1',step:badReceipt?0:index,canonicalSha256:source.transactions[index].sha256,catalogOwnerXid:'42',transactionLocalPreimageAndPreservationGuardPassed:true};},persist:async journal=>{if(failIntent&&journal.transactions[1].outcome==='unknown_until_transaction_response')throw Error('synthetic custody failure');saved.push(structuredClone(journal));}};
 return{ports,indices,applied,saved};
}
test('remaining branch keeps both descriptors and prior receipt but executes only index1 with honest current counters',async()=>{
 const f=coreFixture(),result=await executeQualifiedDatabaseTransactions(f.ports);
 assert.equal(result.status,'DATABASE_POSTSTATE_VERIFIED_REQUIRES_C_ACCEPTANCE');assert.equal(result.attemptedTransactions,1);assert.equal(result.committedTransactions,1);assert.deepEqual(f.indices,[1]);assert.deepEqual(f.applied,[{sql:source.transactions[1].sql,index:1}]);
 assert.equal(result.transactions[0].outcome,'prior_commit_independently_verified');assert.deepEqual(result.transactions[0].nativeReceipt,prior.transaction.nativeReceipt);assert.equal(result.transactions[1].nativeReceipt.step,1);assert.equal(result.priorAcceptedCommit.runId,40615885933);assert(f.saved.every(s=>s.attemptedTransactions<=1&&s.committedTransactions<=1));
});
test('remaining branch refuses drift/custody before mutation and rejects wrong native step without replay',async()=>{
 for(const options of [{drift:true},{failIntent:true},{badReceipt:true}]){const f=coreFixture(options),result=await executeQualifiedDatabaseTransactions(f.ports);assert.equal(result.status,'HOLD_DATABASE_RECONCILIATION_NO_RETRY');assert.equal(f.applied.length,options.badReceipt?1:0);assert.equal(result.committedTransactions,0);assert.equal(result.automaticRetry,false);assert.equal(result.automaticInverse,false);}
 const f=coreFixture();await assert.rejects(executeQualifiedDatabaseTransactions({...f.ports,priorAcceptedCommit:{...prior,remainingCanonicalIndices:[0,1]}}));assert.equal(f.applied.length,0);
});
// Executes the actual runtime function with synthetic transport/comparison ports only; this is not native poststate evidence or controller admission.
const runtimeCode=fs.readFileSync('scripts/qualified-production-database-runtime.mjs','utf8').replace(/^import .*;\n/gm,'').replace('export async function','async function');
const makeRuntime=new Function('assert','fs','path','hash','executeQualifiedDatabaseTransactions','loadQualifiedDatabasePackage','requireProductionMigrationRelease','assertForwardSingleAttempt','readQualifiedDatabaseAcceptedFirstCommit',runtimeCode+'\nreturn runQualifiedProductionDatabase;');
async function runtimeFixture({drift=false,wrongReceipt=false,badPost=false,lostResponse=false}={}){
 const dir=scratch();let rounds=0,mutations=0,transitions=0;const queries=[],wireIndices=[];
 const comparison={requireReadOnlyCapture:s=>assert.deepEqual(Object.keys(s),['core','fulfillment','ordinaryRegistry']),stateSha256:s=>s.core[0].fixtureState,bindWire:({index,before,canonicalSql})=>{assert.equal(index,1);assert.equal(before.core[0].fixtureState,prior.acceptedPoststateSha256);wireIndices.push(index);return{wireSql:canonicalSql,wireSha256:hash(canonicalSql),canonicalSha256:hash(canonicalSql),beforeStateSha256:prior.acceptedPoststateSha256};},compareTransition:({index,before,after})=>{transitions++;assert.equal(index,1);assert.equal(before.core[0].fixtureState,prior.acceptedPoststateSha256);assert.equal(after.core[0].fixtureState,'synthetic-final-state');assert.equal(badPost,false);return{fixtureOnly:true};}};
 const run=makeRuntime(assert,fs,path,hash,executeQualifiedDatabaseTransactions,async()=>({...source,comparison}),()=>{},async()=>({fixtureOnly:true}),readQualifiedDatabaseAcceptedFirstCommit);
 const fetchImpl=async(url,options)=>{
  if(options.method==='GET')return new Response(JSON.stringify({ref:'wwtwtsmywnckfkdaqqeg'}),{status:200});
  const request=JSON.parse(options.body);queries.push(request);
  const reader=source.readers.findIndex(r=>r.sql===request.query);
  if(reader!==-1){if(reader===0)rounds++;const fixtureState=mutations?'synthetic-final-state':drift&&rounds===2?'synthetic-drift':prior.acceptedPoststateSha256;return new Response(JSON.stringify([{fixtureState}]),{status:200});}
  assert.equal(request.query,source.transactions[1].sql);assert.equal(request.read_only,false);mutations++;if(lostResponse)throw Error('synthetic lost response');
  return new Response(JSON.stringify([{wwt_schema_operation_receipt:{schemaVersion:'wwt-two-migration-schema-native-receipt/v1',step:wrongReceipt?0:1,canonicalSha256:source.transactions[1].sha256,catalogOwnerXid:'42',transactionLocalPreimageAndPreservationGuardPassed:true}}]),{status:201});
 };
 try{
  const result=await run({env:{RCAP_PRODUCTION_PHASE:'forward_chain_migrate',SUPABASE_ACCESS_TOKEN:'synthetic-token',GITHUB_RUN_ID:'40619999999',GITHUB_SHA:'a'.repeat(40)},rootDir:root,fetchImpl,release:{productionProjectRef:'wwtwtsmywnckfkdaqqeg',qualifiedWorkerDatabase:{package:{sha256:source.manifestSha256},priorAcceptedCommit:prior}},evidenceDir:dir});
  return{result,mutations,transitions,queries,wireIndices,files:fs.readdirSync(path.join(dir,'qualified-database-40619999999'))};
 }finally{fs.rmSync(dir,{recursive:true});}
}
test('actual runtime uses only transaction-2 custody and compares canonical transition1 after two current post1 checks',async()=>{
 const r=await runtimeFixture();assert.equal(r.result.passed,true);assert.equal(r.mutations,1);assert.equal(r.transitions,1);assert.deepEqual(r.wireIndices,[1]);assert.equal(r.result.committedTransactions,1);
 for(const name of ['transaction-2.bound-wire.private.sql','transaction-2.request.private.json','transaction-2.response.private.json','before_transaction_2.native-catalog.private.json','immediately_before_transaction_2.native-catalog.private.json','after_transaction_2.native-catalog.private.json'])assert(r.files.includes(name),name);
 assert(!r.files.some(n=>n.startsWith('transaction-1.')));assert.equal(r.queries.length,10);assert(r.queries.every(q=>q.read_only===false));assert.equal(r.result.smokeAuthorized,false);
});
test('actual runtime holds on fresh drift, lost response, wrong receipt or bad poststate and never replays first commit',async()=>{
 for(const options of [{drift:true},{lostResponse:true},{wrongReceipt:true},{badPost:true}]){
  const r=await runtimeFixture(options);assert.equal(r.result.status,'HOLD_DATABASE_RECONCILIATION_NO_RETRY');assert.equal(r.result.passed,false);assert.equal(r.mutations,options.drift?0:1);assert.equal(r.result.committedTransactions,options.badPost?1:0);assert(!r.files.some(n=>n.startsWith('transaction-1.')));assert.equal(r.result.transactions[0].outcome,'prior_commit_independently_verified');
 }
});
const head='a'.repeat(40),tools='b'.repeat(40),currentId=40619999999,env={RCAP_PRODUCTION_PHASE:'forward_chain_migrate',GITHUB_TOKEN:'synthetic-token',GITHUB_RUN_ID:String(currentId),GITHUB_SHA:head};
const candidate={toolsSha:tools,qualifiedWorkerDatabase:{technicalAdmissionAt:original,priorNoEffectRearm:rearm,priorAcceptedCommit:prior}};
function inventory({missingPartial=false,missingNoEffect=false,other=false,partialChange={},jobChange={},stepChange={},currentChange={}}={}){
 const current={id:currentId,head_sha:head,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/rcap-f1-ephemeral-staging.yml',head_branch:'captain-release',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'},created_at:'2026-10-28T01:50:00Z',...currentChange};
 const known=p=>({...current,id:p.runId,head_sha:p.executionSha,status:'completed',conclusion:'failure',created_at:p===prior?'2026-10-28T01:34:48Z':'2026-10-28T01:11:40Z'});
 return async(url,options)=>{assert.equal(options.method,'GET');let body;
  if(url.includes('/jobs?')){const p=url.includes('/'+prior.runId+'/')?prior:rearm;body={jobs:[{id:p.jobId,...(p===prior?jobChange:{}),steps:[{name:'Apply and directly read back the exact Production forward migration chain',number:20,status:'completed',conclusion:'failure',...(p===prior?stepChange:{})}]}]};}
  else if(url.includes('/workflows/'))body={workflow_runs:[current,...(missingPartial?[]:[{...known(prior),...partialChange}]),...(missingNoEffect?[]:[known(rearm)]),...(other?[{...known(rearm),id:40613540062,created_at:'2026-10-28T00:41:00Z'}]:[])]};else body=current;
  return new Response(JSON.stringify(body),{status:200});
 };
}
test('original native inventory positively accounts both exact no-effect and partial predecessors',async()=>{
 const result=await assertForwardSingleAttempt(candidate,{env,fetchImpl:inventory()});assert.equal(result.originalTechnicalAdmissionAt,original);assert.deepEqual(result.knownAttempts.map(k=>k.classification),['KNOWN_ACCEPTED_NO_EFFECT','KNOWN_ACCEPTED_STEP1_COMMIT_REMAINING_STEP2_ONLY']);assert.equal(result.knownAttempts[1].allowedNextCanonicalIndex,1);assert.equal(result.rearmNotBefore,prior.at);
});
test('missing or altered predecessor, other executed run, reused tools and ambiguous current timestamp block continuation',async()=>{
 for(const options of [{missingPartial:true},{missingNoEffect:true},{other:true},{partialChange:{head_sha:'c'.repeat(40)}},{partialChange:{run_attempt:2}},{jobChange:{id:1}},{stepChange:{number:19}},{stepChange:{conclusion:'success'}},{currentChange:{created_at:'2026-10-28T01:43:55Z'}}])await assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:inventory(options)}));
 await assert.rejects(assertForwardSingleAttempt({...candidate,toolsSha:prior.toolsSha},{env,fetchImpl:inventory()}));
 await assert.rejects(assertForwardSingleAttempt({...candidate,qualifiedWorkerDatabase:{...candidate.qualifiedWorkerDatabase,priorAcceptedCommit:{...prior,remainingCanonicalIndices:[0,1]}}},{env,fetchImpl:inventory()}));
});
