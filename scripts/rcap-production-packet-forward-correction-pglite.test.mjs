import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
const root=process.cwd(),queue=[];
const {default:assert}=await import('node:assert/strict');
globalThis.__smokeQueueDb={sql:q=>queue.push({query:q}),applyFile:p=>queue.push({path:p,query:fs.readFileSync(p,'utf8')}),stop(){}};
let source=fs.readFileSync(root+'/scripts/rcap-packet-database-reference.mjs','utf8').replace("import { startEphemeralPg } from './lib/rcap-ephemeral-pg.mjs';",'const startEphemeralPg = () => globalThis.__smokeQueueDb;').replace("'./rcap-packet-database-contract.mjs'",JSON.stringify('file://'+root+'/scripts/rcap-packet-database-contract.mjs'));
const reference=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
reference.packetApplicationTestDatabase(root,{fundingChoice:false});
const baseline=fs.readFileSync(root+'/supabase/migrations/20260728213131_remote_schema.sql','utf8');
const table=n=>{const start=baseline.indexOf(`CREATE TABLE IF NOT EXISTS "public"."${n}" (`);if(start<0)throw Error('missing baseline table '+n);return baseline.slice(start,baseline.indexOf('\n);',start)+4);};
const db=new PGlite({extensions:{pgcrypto}});let step='source';
try {
 for(let i=0;i<queue.length;i++){
  let {query,path:file}=queue[i];step=file??'reference prerequisite block '+i;
  if(i===0){query=query.replace('create table public.partner_records(id uuid primary key default gen_random_uuid(),partner_slug text unique not null);',table('partner_records')+'alter table partner_records add primary key(id); alter table partner_records add unique(partner_slug);');
   query+=`alter table auth.users add column instance_id uuid,add column aud text,add column role text,add column email text,add column encrypted_password text,add column email_confirmed_at timestamptz,add column created_at timestamptz,add column updated_at timestamptz; grant usage on schema auth to authenticated,anon,service_role;`;
  }
  if(query.includes('create table consumer_pending_screening_results')){
   query=query.replace(/create table screening_sessions\([\s\S]*?\);/,table('screening_sessions')+'alter table screening_sessions add primary key(session_id);');
   query=query.replace(/create table clinic_events\([\s\S]*?\);/,'').replace(/create table clinic_cases\([\s\S]*?\);/,'');
   query+=table('partner_users')+'alter table partner_users add primary key(id); alter table partner_users add unique(auth_user_id); alter table partner_users add foreign key(auth_user_id) references auth.users(id); alter table partner_users add foreign key(partner_slug) references partner_records(partner_slug);';
   await db.exec(query);
   for(const file of ['20260825120000_clinic_mode_core.sql','20260825121000_clinic_mode_security.sql','20260825122000_clinic_mode_accounting_reporting.sql','20260903120000_clinic_event_jurisdiction_lock.sql']){step=file;await db.exec(fs.readFileSync(root+'/supabase/migrations/'+file,'utf8'));}
  }else {
    if(file?.endsWith('20260901115000_consumer_packet_artifact_provenance.sql'))query=query.replace("where c.conrelid = 'public.consumer_packet_artifact_provenance'::regclass\n  ) <> 7", "where c.conrelid = 'public.consumer_packet_artifact_provenance'::regclass and c.contype <> 'n'\n  ) <> 7");
    await db.exec(query);
  }
 }

 const {loadCorrection,equal}=await import('file://'+root+'/scripts/rcap-production-packet-forward-correction.mjs');
 const {packetCatalogQuery}=await import('file://'+root+'/scripts/rcap-packet-database-contract.mjs');
 const {fundingCatalogQuery}=await import('file://'+root+'/scripts/rcap-production-funding-dependency-contract.mjs');
 const plan=loadCorrection(root),sql=plan.sql;
 const cats=[...sql.matchAll(/expected jsonb := '((?:''|[^'])*)'::jsonb/g)].map(m=>JSON.parse(m[1].replaceAll("''","'")));
 const before=cats[0],after=cats[1];
 // Reconstruct only schema metadata for captured dependency relations; no rows
 // or service responses are mocked. This fills intentionally minimal local
 // dependency fixtures before the actual transaction evaluates native catalogs.
 const actualPrereqs=(await db.query(plan.prerequisites.query)).rows[0];
 for(const[name,expected]of Object.entries(plan.prerequisites.expected.relations)){
  const actual=actualPrereqs.relations[name];
  if(name==='processed_stripe_events'&&actual.columns.some(c=>c.name==='event_id')){await db.exec('alter table processed_stripe_events rename column event_id to stripe_event_id');actual.columns.find(c=>c.name==='event_id').name='stripe_event_id';}
  for(const col of expected.columns){
   const prior=actual.columns.find(c=>c.name===col.name);
   if(!prior)await db.exec(`alter table public.${name} add column "${col.name}" ${col.type}${col.notNull?' not null':''}`);
   else{assert.equal(prior.type,col.type);if(prior.notNull!==col.notNull)await db.exec(`alter table public.${name} alter column "${col.name}" ${col.notNull?'set':'drop'} not null`);}
  }
  assert.deepEqual(actual.columns.filter(c=>!expected.columns.some(e=>e.name===c.name)),[],name+' unexpected fixture columns');
  if(actual.rls!==expected.rls)await db.exec(`alter table public.${name} ${expected.rls?'enable':'disable'} row level security`);
 }
 assert.deepEqual((await db.query(plan.prerequisites.query)).rows[0],plan.prerequisites.expected);

 await db.exec(plan.canonicalFull.data[0].definition);
 await db.exec('revoke all on function get_consumer_briefcase_presentation_source(uuid,uuid) from public,anon,authenticated; grant execute on function get_consumer_briefcase_presentation_source(uuid,uuid) to service_role;');
 await db.exec(`create function reject_tombstoned_participant_write() returns trigger language plpgsql as $$begin return new; end$$; ${before['trigger:consumer_briefcase_items.reject_tombstoned_consumer_briefcase_writes'].definition};`);
 await db.exec(`drop trigger guard_packet_render_job_retry_history on packet_render_jobs; alter table packet_render_jobs drop column retry_reconciliation_history; drop function guard_packet_render_job_retry_history(); alter table packet_render_jobs drop constraint packet_render_jobs_error_code_check; alter table packet_render_jobs add constraint packet_render_jobs_error_code_check ${before['constraint:packet_render_jobs.packet_render_jobs_error_code_check'].definition};`);
 for(const key of Object.keys(before).filter(k=>k.startsWith('functions:')))for(const [sig,fn]of Object.entries(before[key])){await db.exec(fn.definition);await db.exec(`revoke all on function public.${sig} from public,anon,authenticated,service_role,rcap_render_worker,rcap_packet_delivery;`);for(const[role,allowed]of Object.entries(fn.execute))if(allowed)await db.exec(`grant execute on function public.${sig} to ${role};`);if(fn.publicExecute)await db.exec(`grant execute on function public.${sig} to public;`);}
 const projection=q=>q.replaceAll('join pg_constraint x on x.conrelid=c.oid',"join pg_constraint x on x.conrelid=c.oid and x.contype <> 'n'");
 const actual=(await db.query(projection(packetCatalogQuery()).replace(/^set search_path = public, pg_catalog;\s*/,''))).rows[0].catalog;
 const differences=[...new Set([...Object.keys(actual),...Object.keys(before)])].filter(k=>!equal(actual[k],before[k]));
 if(differences.length){console.log(JSON.stringify({differences}));throw Error('before model differences');}

 const mutations={
  'unexpected funding relation':'create view clinic_packet_funding as select 1 as unexpected',
  'unexpected funding overload':"create function allocate_clinic_packet_funding(uuid) returns bool language sql as $$select false$$",
  'packet RLS':'alter table packet_render_jobs disable row level security',
  'packet extra column':'alter table packet_render_jobs add column unexpected integer',
  'canonical owner':'alter function get_consumer_briefcase_presentation_source(uuid,uuid) owner to service_role',
  'dependency column drift':'alter table processed_stripe_events drop column related_object_id',
  'packet CHECK':'alter table packet_render_jobs drop constraint packet_render_jobs_error_code_check',
 };
 let mutationCount=0;
 for(const[name,mutation]of Object.entries(mutations)){
  await db.exec('begin; '+mutation+';');
  await assert.rejects(db.exec(projection(sql)),/precondition_changed/,name);
  await db.exec('rollback;');mutationCount++;
  assert.deepEqual((await db.query(projection(packetCatalogQuery()).replace(/^set search_path = public, pg_catalog;\s*/,''))).rows[0].catalog,before);
  assert.deepEqual((await db.query(fundingCatalogQuery)).rows[0].catalog,{});
 }
 const corrupted=sql.replace("default '[]'::jsonb;","default '[1]'::jsonb;");
 await assert.rejects(db.exec(projection(corrupted)),/postcondition_failed/);await db.exec('rollback;');mutationCount++;
 assert.deepEqual((await db.query(fundingCatalogQuery)).rows[0].catalog,{});
 step='actual bounded forward transaction';await db.exec(projection(sql));
 const {expectedFundingCatalog}=await import('file://'+root+'/scripts/rcap-production-funding-dependency-contract.mjs');
 assert.deepEqual((await db.query(fundingCatalogQuery)).rows[0].catalog,expectedFundingCatalog(root));
 assert.deepEqual((await db.query(projection(packetCatalogQuery()).replace(/^set search_path = public, pg_catalog;\s*/,''))).rows[0].catalog,after);
 assert.equal((await db.query('select count(*)::int as count from clinic_packet_funding')).rows[0].count,0);
 console.log(JSON.stringify({pass:true,actualTransaction:true,mutations:mutationCount,packetBeforeExact:true,packetAfterExact:true,fundingBeforeExact:true,fundingAfterExact:true,fundingRows:0,limitations:['PGlite PostgreSQL18 packet pg_constraint projection excludes duplicate NOT NULL entries; columns.notNull remain exact','Local source-modeled dependencies plus captured typed prerequisite metadata; no service calls or real concurrency execution']}));

}catch(e){console.error(JSON.stringify({result:'FAIL',step,error:e.message,detail:e.detail??null}));process.exitCode=1;}finally{await db.close();}
