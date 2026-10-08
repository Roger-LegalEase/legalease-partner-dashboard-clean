// Fresh disposable PostgreSQL-compatible migration and privilege verification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),read=file=>fs.readFileSync(file,'utf8');
const originalTable=(file,marker)=>{const source=read(file),start=source.indexOf(marker),end=source.indexOf('\n);',start)+4;assert.ok(start>=0&&end>start);return source.slice(start,end);};
try{
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id uuid,metadata jsonb,created_at timestamptz default now(),updated_at timestamptz default now(),unique(bucket_id,name));
 grant usage on schema public,auth,storage to anon,authenticated,service_role;`);
 for(const file of ['supabase/partner-journey-os.sql','supabase/phase-18-rcap-wilma-intake.sql','supabase/phase-19-mississippi-document-generator.sql','supabase/phase-21-partner-auth-rls-foundation.sql','supabase/phase-28-rcap-record-audit-trail.sql','supabase/phase-32-expungement-screening-sessions.sql','supabase/phase-35-rcap-partner-entitlement.sql','supabase/phase-35b-rcap-screening-session-partner-mode.sql','supabase/phase-41-rcap-partner-access-codes.sql','supabase/phase-42-partner-onboarding.sql','supabase/phase-43-rcap-partner-onboarding-phase1.sql','supabase/phase-44-rcap-onboarding-prefill.sql','supabase/phase-45-rcap-onboarding-artifacts.sql','supabase/phase-46-rcap-onboarding-media-contact-role.sql','supabase/phase-47-rcap-onboarding-launch-readiness.sql'])await db.exec(read(file));
 const functions=read('supabase/migrations/20260818202000_rcap_upgrade_02_functions.sql');
 for(const name of ['rcap_service_assert_internal_actor','rcap_service_assert_partner_actor']){const start=functions.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'('),end=functions.indexOf('$function$;',start)+11;assert.ok(start>=0);await db.exec(functions.slice(start,end));}
 await db.exec(originalTable('supabase/phase-30-rcap-person-identity.sql','create table if not exists rcap_persons'));
 await db.exec(originalTable('supabase/phase-49-rcap-packet-render-jobs.sql','create table if not exists public.packet_render_jobs'));
 await db.exec(originalTable('supabase/phase-50-rcap-packet-delivery-hardening.sql','create table if not exists public.partner_packet_entitlement'));
 await db.exec(originalTable('supabase/phase-50-rcap-packet-delivery-hardening.sql','create table if not exists public.packet_credit_ledger'));
 await db.exec('grant all on all tables in schema public to service_role;grant execute on all functions in schema public to service_role;');
 const signatures=['public.claim_partner_screening_session(text,text,text,timestamptz)','public.claim_rcap_screening_session(text,text)'];
 const before=[];for(const signature of signatures)before.push((await db.query('select pg_get_functiondef($1::regprocedure) as definition',[signature])).rows[0].definition);
 for(const file of ['supabase/proposals/rcap_launch_package_20261008.sql','supabase/proposals/rcap_launch_authority_20261008.sql','supabase/proposals/rcap_real_launch_20261008.sql'])await db.exec(read(file));
 console.log('PASS complete real-launch SQL proposal applies atomically to a fresh disposable database');
 for(const [index,signature] of signatures.entries()){const after=(await db.query('select pg_get_functiondef($1::regprocedure) as definition',[signature])).rows[0].definition;assert.equal(after,before[index].replace("pr.payment_status in ('paid', 'demo_paid')",'public.rcap_partner_activation_for_launch(pr.partner_slug)'));}
 console.log('PASS both existing claim functions preserve every guard and effect except the bounded activation predicate');
 for(const table of ['rcap_commercial_authorizations','rcap_launch_capacity_events','rcap_launch_operation_events']){
  for(const role of ['anon','authenticated'])for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) as allowed',[role,'public.'+table,privilege])).rows[0].allowed,false);
  for(const privilege of ['UPDATE','DELETE'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) as allowed',['service_role','public.'+table,privilege])).rows[0].allowed,false);
 }
 console.log('PASS commercial, capacity, and launch journals deny anonymous/partner access and runtime rewriting');
 for(const signature of ['public.rcap_service_stage_real_launch(text,uuid,uuid,bigint,text,jsonb,uuid)','public.rcap_service_record_commercial_authority(text,uuid,text,uuid,text,text,timestamptz,uuid,uuid,bigint,boolean)','public.rcap_service_configure_launch_capacity(text,uuid,uuid,text,integer,integer,text,uuid,bigint)','public.rcap_service_compensate_real_launch(text,uuid,uuid,text)'])for(const role of ['anon','authenticated'])assert.equal((await db.query('select has_function_privilege($1,$2,$3) as allowed',[role,signature,'EXECUTE'])).rows[0].allowed,false);
 console.log('PASS partner and anonymous roles cannot invoke commercial, allocation, launch, or recovery mutations');
 await assert.rejects(db.query("select public.rcap_service_stage_real_launch('unregistered','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,$1,'[]','cccccccc-cccc-4ccc-8ccc-cccccccccccc')",['a'.repeat(64)]),error=>error.code==='42501');
 assert.equal((await db.query("select public.rcap_partner_activation_for_launch('unregistered') as active")).rows[0].active,false);
 console.log('PASS forged service actor and absent commercial/publication authority fail closed');
}finally{await db.close();}
