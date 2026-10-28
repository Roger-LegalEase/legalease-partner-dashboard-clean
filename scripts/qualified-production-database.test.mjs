import test from 'node:test';
import assert from 'node:assert/strict';
import {readQualifiedDatabaseTransactions,executeQualifiedDatabaseTransactions} from './qualified-production-database.mjs';
// Synthetic transport fixtures only: real runtime admission must load B's separate guarded wire payloads.
const transactions=readQualifiedDatabaseTransactions(process.cwd()).map(t=>({...t,wireSql:t.sql,wirePath:t.path,wireSha256:t.sha256}));
function fixture({deny=false,failApply=0,drift=false,badPost=false,failIntent=false}={}){
 let state=0,reads=0;const applied=[],saved=[];
 return {applied,saved,ports:{transactions,admit:async()=>assert.equal(deny,false),readState:async()=>{reads++;return drift&&reads===2?-1:state;},assertState:async(expected,actual)=>assert.equal(actual,expected),apply:async sql=>{applied.push(sql);if(applied.length===failApply)throw Error('synthetic transport loss');state=badPost?-1:state+1;},persist:async journal=>{if(failIntent&&journal.transactions[0].outcome==='unknown_until_transaction_response')throw Error('synthetic durable custody refusal');saved.push(structuredClone(journal));}}};
}
test('only the two original canonical transactions execute once in order with accepted intermediate and final poststates',async()=>{
 const f=fixture(),r=await executeQualifiedDatabaseTransactions(f.ports);assert.equal(r.status,'DATABASE_POSTSTATE_VERIFIED_REQUIRES_C_ACCEPTANCE');assert.equal(r.committedTransactions,2);assert.deepEqual(f.applied,transactions.map(t=>t.wireSql));
 for(let i=0;i<2;i++)assert(f.saved.some(r=>r.transactions[i].outcome==='unknown_until_transaction_response'&&r.attemptedTransactions===i));
 assert.equal(r.automaticRetry,false);assert.equal(r.automaticInverse,false);
});
for(const options of [{deny:true},{drift:true},{failIntent:true}])test('authority, immediate preimage or durable-intent refusal prevents SQL '+JSON.stringify(options),async()=>{
 const f=fixture(options),r=await executeQualifiedDatabaseTransactions(f.ports);assert.equal(r.status,'HOLD_DATABASE_RECONCILIATION_NO_RETRY');assert.equal(f.applied.length,0);
});
for(const failApply of [1,2])test('uncertain transaction '+failApply+' stops without retry or inverse',async()=>{
 const f=fixture({failApply}),r=await executeQualifiedDatabaseTransactions(f.ports);assert.equal(f.applied.length,failApply);assert.equal(r.committedTransactions,failApply-1);assert.equal(r.transactions[failApply-1].outcome,'unknown_until_transaction_response');assert.equal(r.status,'HOLD_DATABASE_RECONCILIATION_NO_RETRY');
});
test('unaccepted first poststate preserves known partial commit and never attempts the second transaction',async()=>{
 const f=fixture({badPost:true}),r=await executeQualifiedDatabaseTransactions(f.ports);assert.equal(f.applied.length,1);assert.equal(r.committedTransactions,1);assert.equal(r.transactions[0].outcome,'transaction_commit_response_received');assert.equal(r.status,'HOLD_DATABASE_RECONCILIATION_NO_RETRY');
});
test('different SQL bytes or transaction order refuse before admission/effects',async()=>{
 for(const altered of [[...transactions].reverse(),transactions.map((t,i)=>i? t:{...t,sql:t.sql+'\n'}),transactions.map((t,i)=>i? t:{...t,wireSql:t.wireSql+'\n'})]){
  const f=fixture();await assert.rejects(executeQualifiedDatabaseTransactions({...f.ports,transactions:altered}));assert.equal(f.applied.length,0);assert.equal(f.saved.length,0);
 }
});
