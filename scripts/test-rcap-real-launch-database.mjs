// Fresh disposable PostgreSQL-compatible migration and privilege verification.
import assert from 'node:assert/strict';
import {testProgramPolicy} from './test-rcap2-program-policy.mjs';
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
 for(const file of ['supabase/proposals/rcap_launch_package_20261008.sql','supabase/proposals/rcap_launch_authority_20261008.sql','supabase/proposals/rcap_real_launch_20261008.sql','supabase/proposals/rcap_signed_agreement_alignment_20261008.sql'])await db.exec(read(file));
 await db.exec(originalTable('supabase/migrations/20260825120000_clinic_mode_core.sql','create table public.clinic_events'));
 await db.exec('alter table public.clinic_events add column jurisdiction text;');
 await db.exec(read('supabase/migrations/20261009224252_rcap2_program_policy_and_start.sql'));
 await db.exec(read('supabase/migrations/20261010010147_rcap_canonical_program_configuration.sql'));
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
 console.log('PASS signed-agreement proposal applies to the full real-launch migration chain');
 const contractRpc='public.rcap_service_record_signed_agreement(text,uuid,bigint,uuid,text,uuid,boolean,text,text,text,text,bigint,text,date,text,boolean)';
 for(const role of ['anon','authenticated'])assert.equal(
   (await db.query('select has_function_privilege($1,$2,$3) as allowed',[role,contractRpc,'EXECUTE'])).rows[0].allowed,false
 );
 const signedTable='public.rcap_signed_agreement_receipts';
 for(const privilege of ['UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])
   assert.equal((await db.query('select has_table_privilege($1,$2,$3) as allowed',['service_role',signedTable,privilege])).rows[0].allowed,false);
 for(const privilege of ['SELECT','INSERT'])
   assert.equal((await db.query('select has_table_privilege($1,$2,$3) as allowed',['service_role',signedTable,privilege])).rows[0].allowed,true);
 for(const column of ['signed_receipt_id','signed_asset_sha256'])assert.equal((await db.query('select has_column_privilege($1,$2,$3,$4) as allowed',['authenticated','public.partner_onboarding_agreements',column,'SELECT'])).rows[0].allowed,true);
 assert.equal((await db.query('select has_column_privilege($1,$2,$3,$4) as allowed',['authenticated','public.partner_onboarding_assets','sha256_hex','SELECT'])).rows[0].allowed,false);
 assert.equal((await db.query('select has_function_privilege($1,$2,$3) as allowed',['authenticated','public.rcap_agreement_clearance(uuid)','EXECUTE'])).rows[0].allowed,false);
 console.log('PASS signed agreement receipts are append-only and browser calls denied');
 const id={partner:'11111111-1111-4111-8111-111111111111',workspace:'11111111-2222-4333-8444-555555555555',admin:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',request:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',attacker:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 await db.exec(`insert into auth.users(id,email) values('${id.admin}','internal@legalease.test'),('${id.attacker}','attacker@unrelated.test');
   insert into public.partner_records(id,partner_id,partner_slug,partner_name,program_tier,payment_status)
     values('${id.partner}','pa','signed-fixture','Signed Fixture','pilot','unpaid');
   insert into public.partner_users(auth_user_id,partner_slug,role,status)
     values('${id.admin}',null,'internal_admin','active'),('${id.attacker}','signed-fixture','partner_admin','active');
   insert into public.partner_onboarding(id,partner_slug,partner_record_id,status,commercial_gate_status,commercial_gate_override_reason)
     values('${id.workspace}','signed-fixture','${id.partner}','setup_in_progress','cleared_by_authorized_internal_override','Synthetic isolated fixture; not real commercial authorization');`);
 const version=Number((await db.query('select aggregate_version from public.partner_onboarding where id=$1',[id.workspace])).rows[0].aggregate_version);
 const signedAssetPath=`partners/${id.partner}/onboarding/${id.workspace}/procurement_document/${id.request}.pdf`;
 await db.query("insert into storage.objects(bucket_id,name) values('rcap-partner-onboarding-private',$1)",[signedAssetPath]);
 const callSigned=(actor=id.admin,confirmed=true,savedVersion=version,reason='I reviewed the signed legal agreement') =>
   db.query(`select * from public.rcap_service_record_signed_agreement(
     $1,$2,$3,$4,'order_form',$5,true,$6,'actual-signed.pdf',
     'application/pdf','pdf',34,$7,'2026-10-01',$8,$9)`,
     ['signed-fixture',actor,savedVersion,id.request,id.request,signedAssetPath,'a'.repeat(64),reason,confirmed]);
 await assert.rejects(callSigned(id.attacker));
 await assert.rejects(callSigned(id.admin,false));
 await assert.rejects(callSigned(id.admin,null));
 await assert.rejects(callSigned(id.admin,true,null));
 await assert.rejects(callSigned(id.admin,true,version+1));
 assert.equal(Number((await db.query('select count(*)::integer as n from public.rcap_signed_agreement_receipts')).rows[0].n),0);
 await assert.rejects(db.query("update public.partner_onboarding set agreement_status='signed' where id=$1",[id.workspace]),error=>error.code==='42501');
 assert.equal((await db.query('select public.rcap_agreement_clearance($1) as ok',[id.workspace])).rows[0].ok,false);
 const receipt=await callSigned();
 assert.equal(receipt.rows[0].duplicate,false);
 assert.equal((await db.query('select agreement_status from public.partner_onboarding where id=$1',[id.workspace])).rows[0].agreement_status,'signed');
 const normalized=(await db.query("select status,partner_safe_detail,finalized_asset_id,effective_date::text as date from public.partner_onboarding_agreements where workspace_id=$1 and agreement_type='order_form'",[id.workspace])).rows[0];
 assert.equal(normalized.status,'executed');
 assert.equal(normalized.partner_safe_detail,'Executed agreement verified by LegalEase');
 assert.equal(normalized.finalized_asset_id,id.request);
 assert.equal(normalized.date,'2026-10-01');
 assert.equal((await callSigned()).rows[0].duplicate,true);
 await assert.rejects(db.query('update public.rcap_signed_agreement_receipts set reviewed_reason=$1 where id=$2',['Forged amendment',id.request]));
 await assert.rejects(db.query('delete from public.rcap_signed_agreement_receipts where id=$1',[id.request]));
 console.log('PASS signed-file evidence, admin authority, atomic agreement, idempotency and audit immutability');
 const sqlClearance=async()=> (await db.query('select public.rcap_agreement_clearance($1) as ok',[id.workspace])).rows[0].ok;
 assert.equal(await sqlClearance(),true);
 await db.query("delete from storage.objects where name=$1",[signedAssetPath]);
 assert.equal(await sqlClearance(),false,'absent private object must block despite signed metadata');
 await db.query("insert into storage.objects(bucket_id,name) values('rcap-partner-onboarding-private',$1)",[signedAssetPath]);
 assert.equal(await sqlClearance(),true);
 const canonicalBefore=Number((await db.query('select aggregate_version from public.partner_onboarding where id=$1',[id.workspace])).rows[0].aggregate_version);
 assert.equal((await callSigned()).rows[0].duplicate,true);
 assert.equal(Number((await db.query('select aggregate_version from public.partner_onboarding where id=$1',[id.workspace])).rows[0].aggregate_version),canonicalBefore);
 await assert.rejects(db.query("update public.partner_onboarding set agreement_status='not_sent' where id=$1",[id.workspace]),error=>error.code==='42501');
 const metadata=(await db.query('select signed_receipt_id,signed_asset_sha256 from public.partner_onboarding_agreements where workspace_id=$1',[id.workspace])).rows[0];
 assert.equal(metadata.signed_receipt_id,id.request);assert.equal(metadata.signed_asset_sha256,'a'.repeat(64));
 await db.query("insert into public.partner_onboarding_agreements(workspace_id,agreement_type,status,is_required) values($1,'data_privacy_security_addendum','requested',true)",[id.workspace]);
 assert.equal(await sqlClearance(),false,'missing required supporting document must block');
 await db.query("update public.partner_onboarding_agreements set status='approved',finalized_asset_id=$2,recorded_by=$3,recorded_at=now() where workspace_id=$1 and agreement_type='data_privacy_security_addendum'",[id.workspace,id.request,id.admin]);
 assert.equal(await sqlClearance(),true);
 await db.query("update public.partner_onboarding_assets set sha256_hex=$2 where id=$1",[id.request,'b'.repeat(64)]);
 assert.equal(await sqlClearance(),false,'receipt/file hash mismatch must block');
 await db.query("update public.partner_onboarding_assets set sha256_hex=$2 where id=$1",[id.request,'a'.repeat(64)]);
 assert.equal(await sqlClearance(),true);
 await db.query("update public.partner_onboarding_assets set lifecycle_status='superseded' where id=$1",[id.request]);
 assert.equal(await sqlClearance(),false,'superseded execution evidence must block');
 await db.query("update public.partner_onboarding_assets set lifecycle_status='active' where id=$1",[id.request]);
 const signedDefinition=(await db.query('select pg_get_functiondef($1::regprocedure) as definition',[contractRpc])).rows[0].definition;
 assert(signedDefinition.includes('p_effective_date>current_date'));
 console.log('PASS same-request replay preserves version; missing supporting document, supersession, changed hash and legacy billing writes fail closed');
 // A later downgrade must fail closed rather than relying on the old signed flag.
 await db.query("update public.partner_onboarding_agreements set status='approved' where workspace_id=$1 and agreement_type='order_form'",[id.workspace]);
 await assert.rejects(db.query("update public.partner_onboarding set rcap_launch_operation_id=$2,status='live',landing_page_ready=true where id=$1",[id.workspace,'cccccccc-cccc-4ccc-8ccc-cccccccccccc']));
 assert.equal((await db.query('select agreement_status from public.partner_onboarding where id=$1',[id.workspace])).rows[0].agreement_status,'sent');
 assert.equal(await sqlClearance(),false);
 console.log('PASS real launch refuses a stale or withdrawn executed document even with a legacy signed flag');

 await (await import("./test-rcap-workspace-recovery.mjs")).testWorkspaceRecovery(db,id);
 await (await import("./test-rcap2-program-configuration.mjs")).testProgramConfiguration(db,id);
 await testProgramPolicy(db,id);
 await (await import('./test-rcap-operating-rights.mjs')).testOperatingRights(db,id);
}finally{await db.close();}
