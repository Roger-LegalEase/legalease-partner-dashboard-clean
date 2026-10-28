// Two existing canonical transactions; a failed or uncertain outcome never retries or invokes an inverse.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const QUALIFIED_DATABASE_MIGRATIONS=Object.freeze([
 {path:'supabase/migrations/20261023151500_ordinary_sponsored_packet_authority.sql',sha256:'ffbb587fec452fc360668e63936eccad773125b77821790e1f1ed2571045c738'},
 {path:'supabase/migrations/20261024193000_managed_program_capacity.sql',sha256:'6fd142707a1fb3b41be0887af38ee2ea7ba0bce7b8400750fcb8e01b44cbfcb4'},
]);
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function readQualifiedDatabaseTransactions(root){
 return QUALIFIED_DATABASE_MIGRATIONS.map(ref=>{
  const bytes=fs.readFileSync(path.join(root,ref.path));assert.equal(hash(bytes),ref.sha256,'Unchanged canonical migration '+ref.path);
  const sql=bytes.toString('utf8');assert.match(sql,/\nbegin;\n/);assert.match(sql,/commit;\s*$/);
  return {...ref,sql};
 });
}
export async function executeQualifiedDatabaseTransactions({transactions,admit,readState,assertState,prepareWire,apply,persist,priorAcceptedCommit}){
 for(const fn of [admit,readState,assertState,prepareWire,apply,persist])assert.equal(typeof fn,'function');
 assert.deepEqual(transactions.map(({path,sha256})=>({path,sha256})),QUALIFIED_DATABASE_MIGRATIONS,'Only the two canonical migrations in their original order');
 for(const transaction of transactions){
  assert.equal(hash(transaction.sql),transaction.sha256,'Exact canonical SQL bytes');
  assert.match(transaction.wireTemplateSha256??'',/^[a-f0-9]{64}$/,'Separately admitted guarded wire template required');
 }
 const journal={schemaVersion:'qualified-production-database-execution/v1',status:'HOLD_NO_EFFECT',stage:'admission',attemptedTransactions:0,committedTransactions:0,transactions:transactions.map(({path,sha256,wireTemplateSha256})=>({path,sha256,wireTemplateSha256,outcome:'not_attempted'})),automaticRetry:false,automaticInverse:false};
 if(priorAcceptedCommit){
  assert.equal(priorAcceptedCommit.runId,40615885933);assert.deepEqual(priorAcceptedCommit.remainingCanonicalIndices,[1]);
  const prior=priorAcceptedCommit.transaction;
  assert.equal(prior.sha256,transactions[0].sha256);assert.equal(prior.wireTemplateSha256,transactions[0].wireTemplateSha256);
  assert.equal(prior.nativeReceipt.step,0);assert.equal(prior.nativeReceipt.canonicalSha256,transactions[0].sha256);assert.equal(prior.nativeReceipt.transactionLocalPreimageAndPreservationGuardPassed,true);
  journal.priorAcceptedCommit=priorAcceptedCommit;
  journal.transactions[0]={...prior,outcome:'prior_commit_independently_verified'};
 }
 try{
  await admit();await persist(journal);
  for(let i=priorAcceptedCommit?1:0;i<transactions.length;i++){
   journal.stage='before_transaction_'+(i+1);const before=await readState(journal.stage);await assertState(i,before);await persist(journal);
   journal.stage='immediately_before_transaction_'+(i+1);const immediate=await readState(journal.stage);await assertState(i,immediate);
   const wire=await prepareWire({index:i,before:immediate,transaction:transactions[i]});
   assert.equal(hash(wire.wireSql),wire.wireSha256,'Exact bound guarded wire bytes');assert.equal(wire.canonicalSha256,transactions[i].sha256);
   Object.assign(journal.transactions[i],{wirePath:wire.wirePath,wireSha256:wire.wireSha256,beforeStateSha256:wire.beforeStateSha256});
   // Durable intent precedes every request; a lost response may have committed.
   journal.status='DATABASE_TRANSACTION_OUTCOME_PENDING';journal.transactions[i].outcome='unknown_until_transaction_response';await persist(journal);
   journal.stage='transaction_'+(i+1);journal.attemptedTransactions++;const receipt=await apply(wire.wireSql,{index:i});
   assert.equal(receipt?.schemaVersion,'wwt-two-migration-schema-native-receipt/v1');assert.equal(receipt.step,i);assert.equal(receipt.canonicalSha256,transactions[i].sha256);assert.equal(receipt.transactionLocalPreimageAndPreservationGuardPassed,true);assert.match(receipt.catalogOwnerXid??'',/^[1-9][0-9]*$/);
   journal.transactions[i].nativeReceipt=receipt;
   journal.status='DATABASE_COMMIT_RESPONSE_RECEIVED_POSTSTATE_PENDING';journal.transactions[i].outcome='transaction_commit_response_received';journal.committedTransactions++;await persist(journal);
   journal.stage='after_transaction_'+(i+1);const after=await readState(journal.stage);const verified=await assertState(i+1,after);if(verified!==undefined)journal.transactions[i].poststate=verified;
   journal.transactions[i].outcome='poststate_verified';await persist(journal);
  }
  journal.stage='complete';journal.status='DATABASE_POSTSTATE_VERIFIED_REQUIRES_C_ACCEPTANCE';await persist(journal);
 }catch{
  journal.status='HOLD_DATABASE_RECONCILIATION_NO_RETRY';try{await persist(journal);}catch{}
 }
 return journal;
}
