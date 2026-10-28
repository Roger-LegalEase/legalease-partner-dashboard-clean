import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {hash,executeQualifiedDatabaseTransactions} from './qualified-production-database.mjs';
import {loadQualifiedDatabasePackage} from './qualified-production-database-package.mjs';
import {requireProductionMigrationRelease} from './rcap-production-migration-contract.mjs';
import {assertForwardSingleAttempt} from './grade-a-launch-control/forward-production-single-attempt.mjs';
const PROJECT='wwtwtsmywnckfkdaqqeg',API='https://api.supabase.com/v1/projects/'+PROJECT;
export async function runQualifiedProductionDatabase({env,rootDir,fetchImpl,release,evidenceDir}){
 assert.equal(env.RCAP_PRODUCTION_PHASE,'forward_chain_migrate');assert.equal(release.productionProjectRef,PROJECT);assert.ok(env.SUPABASE_ACCESS_TOKEN?.trim());
 // This repeats the current binding/phase gate before loading executable package components.
 requireProductionMigrationRelease(rootDir,env);
 const source=await loadQualifiedDatabasePackage(rootDir,release.qualifiedWorkerDatabase.package.sha256),{comparison}=source;
 const output=path.join(evidenceDir,'qualified-database-'+env.GITHUB_RUN_ID);fs.mkdirSync(output,{mode:0o700});
 let sequence=0,requestSequence=0;const snapshots=[];
 const write=(name,value,raw=false)=>{
  assert.equal(path.basename(name),name);const file=path.join(output,name),bytes=raw?Buffer.from(value):Buffer.from(JSON.stringify(value)+'\n');
  const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  const dir=fs.openSync(output,'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}return {path:name,sha256:hash(bytes)};
 };
 const query=async(sql,name,readOnly)=>{
  assert.equal(typeof readOnly,'boolean');
  const intent=write(name+'.request.private.json',{query:sql,read_only:readOnly}),body=fs.readFileSync(path.join(output,intent.path));assert.equal(hash(body),intent.sha256);
  const response=await fetchImpl(API+'/database/query',{method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},body,redirect:'error',signal:AbortSignal.timeout(45000)});
  const bytes=Buffer.from(await response.arrayBuffer());write(name+'.response.private.json',bytes,true);write(name+'.http.json',{status:response.status,actualTargetProjectRef:PROJECT,request:intent});
  assert.ok([200,201].includes(response.status),'Management query did not return a successful transaction response');
  const rows=JSON.parse(bytes);assert(Array.isArray(rows));return rows;
 };
 const result=await executeQualifiedDatabaseTransactions({transactions:source.transactions,
  admit:async()=>{
   requireProductionMigrationRelease(rootDir,env);const inventory=await assertForwardSingleAttempt(release,{env,fetchImpl});if(inventory)write('native-attempt-accounting.json',inventory);
   const response=await fetchImpl(API,{method:'GET',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN},redirect:'error',signal:AbortSignal.timeout(20000)});
   assert.equal(response.status,200);const project=await response.json();assert.equal(project.ref??project.id,PROJECT);
   write('actual-project-identity.json',{status:response.status,actualTargetProjectRef:PROJECT,authenticatedProjectRef:project.ref??project.id});
  },
  readState:async stage=>{
   // BEGIN READ ONLY in the pinned SQL enforces read-only capture while the API retains the admitted postgres principal.
   const snapshot={};for(const reader of source.readers)snapshot[reader.key]=await query(reader.sql,stage+'-'+reader.key,false);
   comparison.requireReadOnlyCapture(snapshot);write(stage+'.native-catalog.private.json',snapshot);return snapshot;
  },
  assertState:async(index,snapshot)=>{
   comparison.requireReadOnlyCapture(snapshot);const actual=comparison.stateSha256(snapshot);
   if(snapshots[index])assert.equal(actual,comparison.stateSha256(snapshots[index]),'Immediate catalog differs from verified state');
   else if(index===0){assert.equal(actual,source.manifest.beforeStateSha256,'Current WWT preimage differs from admitted capture');snapshots[0]=snapshot;}
   else{
    assert(snapshots[index-1]);const verified=comparison.compareTransition({index:index-1,before:snapshots[index-1],after:snapshot,effects:source.effects});snapshots[index]=snapshot;
    write('verified-poststate-'+index+'.json',verified);return verified;
   }
   return {stateSha256:actual};
  },
  prepareWire:async({index,before,transaction})=>{
   requireProductionMigrationRelease(rootDir,env);
   const wire=comparison.bindWire({index,before,transaction:transaction.descriptor,template:transaction.template,canonicalSql:transaction.sql});
   const custody=write('transaction-'+(index+1)+'.bound-wire.private.sql',wire.wireSql,true);assert.equal(custody.sha256,wire.wireSha256);
   write('transaction-'+(index+1)+'.wire-intent.json',{...custody,canonicalSha256:wire.canonicalSha256,beforeStateSha256:wire.beforeStateSha256,actualTargetProjectRef:PROJECT});
   return {...wire,wirePath:custody.path};
  },
  apply:async wireSql=>{
   const index=requestSequence++,rows=await query(wireSql,'transaction-'+(index+1),false),receipts=rows.filter(row=>row?.wwt_schema_operation_receipt);
   assert.equal(receipts.length,1,'Exactly one native guarded SQL receipt required');return receipts[0].wwt_schema_operation_receipt;
  },
  persist:async journal=>{write('checkpoint-'+String(++sequence).padStart(3,'0')+'.json',journal);},
 });
 result.passed=result.status==='DATABASE_POSTSTATE_VERIFIED_REQUIRES_C_ACCEPTANCE';result.actualTargetProjectRef=PROJECT;result.packageSha256=source.manifestSha256;
 result.releaseTuple=Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha','productionProjectRef'].map(k=>[k,release[k]]));result.workflowExecutionSha=env.GITHUB_SHA;result.runId=Number(env.GITHUB_RUN_ID);
 result.consumedPreflight=release.consumedPreflight;result.effectsLimitedToCanonicalTransactions=result.passed?true:null;result.smokeAuthorized=false;write('result.json',result);
 return result;
}
