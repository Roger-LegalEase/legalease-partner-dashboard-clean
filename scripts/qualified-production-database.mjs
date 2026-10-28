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
export async function executeQualifiedDatabaseTransactions({transactions,admit,readState,assertState,apply,persist}){
 for(const fn of [admit,readState,assertState,apply,persist])assert.equal(typeof fn,'function');
 assert.deepEqual(transactions.map(({path,sha256})=>({path,sha256})),QUALIFIED_DATABASE_MIGRATIONS,'Only the two canonical migrations in their original order');
 for(const transaction of transactions){
  assert.equal(hash(transaction.sql),transaction.sha256,'Exact canonical SQL bytes');
  assert.match(transaction.wireSha256??'',/^[a-f0-9]{64}$/,'Separately admitted guarded wire payload required');assert.equal(hash(transaction.wireSql),transaction.wireSha256,'Exact admitted wire bytes');
 }
 const journal={schemaVersion:'qualified-production-database-execution/v1',status:'HOLD_NO_EFFECT',stage:'admission',attemptedTransactions:0,committedTransactions:0,transactions:transactions.map(({path,sha256,wirePath,wireSha256})=>({path,sha256,wirePath,wireSha256,outcome:'not_attempted'})),automaticRetry:false,automaticInverse:false};
 try{
  await admit();await persist(journal);
  for(let i=0;i<transactions.length;i++){
   journal.stage='before_transaction_'+(i+1);const before=await readState(journal.stage);await assertState(i,before);await persist(journal);
   journal.stage='immediately_before_transaction_'+(i+1);const immediate=await readState(journal.stage);await assertState(i,immediate);
   // Durable intent precedes every request; a lost response may have committed.
   journal.transactions[i].outcome='unknown_until_transaction_response';await persist(journal);
   journal.stage='transaction_'+(i+1);journal.attemptedTransactions++;await apply(transactions[i].wireSql);
   journal.transactions[i].outcome='transaction_commit_response_received';journal.committedTransactions++;await persist(journal);
   journal.stage='after_transaction_'+(i+1);const after=await readState(journal.stage);await assertState(i+1,after);
   journal.transactions[i].outcome='poststate_verified';await persist(journal);
  }
  journal.stage='complete';journal.status='DATABASE_POSTSTATE_VERIFIED_REQUIRES_C_ACCEPTANCE';await persist(journal);
 }catch{
  journal.status='HOLD_DATABASE_RECONCILIATION_NO_RETRY';try{await persist(journal);}catch{}
 }
 return journal;
}
