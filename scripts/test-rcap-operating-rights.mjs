// Credential-free regression in the existing real-launch PostgreSQL harness.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
export async function testOperatingRights(db,id){
 const source=fs.readFileSync('supabase/migrations/20261010023000_rcap_operating_authority.sql','utf8');
 await db.exec("alter table public.partner_onboarding add column if not exists operating_model text not null default 'partner_managed'");
 for(const name of ['rcap_program_external_rights_present','rcap_service_get_program_configuration','rcap_service_save_program_configuration']){
  const pattern=new RegExp(`create (?:or replace )?function public\\.${name}\\(`,'i');
  const start=source.search(pattern);assert.ok(start>=0);const end=source.indexOf('$$;',source.indexOf('as $$',start))+3;
  await db.exec(source.slice(start,end));
 }
 await db.exec('revoke all on function public.rcap_program_external_rights_present(uuid) from public,anon,authenticated;grant execute on function public.rcap_program_external_rights_present(uuid) to service_role;');
 const partner=randomUUID(),workspace=randomUUID(),agreement=randomUUID(),member=randomUUID(),slug='operating-rights-fixture';
 await db.query("insert into auth.users(id,email) values($1,'rights-member@example.test')",[member]);
 await db.query("insert into public.partner_records(id,partner_id,partner_slug,partner_name,program_tier) values($1,$2,$2,'Fictional operating rights fixture','pilot')",[partner,slug]);
 await db.query("insert into public.partner_onboarding(id,partner_slug,partner_record_id) values($1,$2,$3)",[workspace,slug,partner]);
 await db.query("insert into public.partner_users(auth_user_id,partner_slug,role,status) values($1,$2,'partner_admin','active')",[member,slug]);
 await db.query("insert into public.partner_onboarding_sections(workspace_id,section_key,response_data) values($1,'program_goals','{}')",[workspace]);
 await db.query("insert into public.partner_onboarding_agreements(id,workspace_id,agreement_type,status,is_required,recorded_by,recorded_at) values($1,$2,'order_form','not_required',false,$3,now()),($4,$2,'master_services_agreement','not_required',false,$3,now())",[agreement,workspace,id.admin,randomUUID()]);
 const scalar=async(sql,params=[])=>(await db.query(sql,params)).rows[0].value;
 const configuration=()=>scalar('select public.rcap_service_get_program_configuration($1,$2) value',[slug,id.admin]);
 const rights=()=>scalar('select public.rcap_program_external_rights_present($1) value',[workspace]);
 const before=await configuration(),request=randomUUID();
 const changes=[{section:'program_goals',base:before.data.program_goals,values:{operating_model:'legalease_managed',operator_authority_reference:'Owner-designated fictional program with no external operating rights.',external_agreement_applicability:'not_applicable',service_mode:'screening_only'}}];
 const save=(actor=id.admin)=>scalar('select public.rcap_service_save_program_configuration($1,$2,$3,$4,$5) value',[slug,actor,before.version,JSON.stringify(changes),request]);
 assert.equal(await rights(),true,'released evaluator reproduces false administrative rights');
 await assert.rejects(save(),e=>e.code==='42501');
 await db.exec(fs.readFileSync('supabase/migrations/20261010074948_rcap_operating_responsibility_rights.sql','utf8'));
 assert.equal(await rights(),false,'metadata and active membership no longer confer independent rights');
 for(const status of ['finalized','executed','approved']){
  await db.exec('begin');
  try{
   await db.query('update public.partner_onboarding_agreements set status=$1 where id=$2',[status,agreement]);
   assert.equal(await rights(),true);
   await assert.rejects(save(),e=>e.code==='42501'&&e.message==='rcap_external_operating_rights');
  }finally{await db.exec('rollback');}
 }
 await assert.rejects(save(member),e=>e.code==='42501');
 await assert.rejects(save(id.attacker),e=>e.code==='42501','another tenant cannot change the operator');
 const protectedRows=()=>scalar(`select jsonb_build_object('members',(select jsonb_agg(u order by id) from public.partner_users u where partner_slug=$1),'agreements',(select jsonb_agg(a order by id) from public.partner_onboarding_agreements a where workspace_id=$2),'record',(select to_jsonb(r) from public.partner_records r where partner_slug=$1)) value`,[slug,workspace]);
 const protectedBefore=await protectedRows();
 const saved=await save();assert.equal(saved.operatingModel,'legalease_managed');assert.equal(saved.policyVersion,'rcap2.2');
 assert.deepEqual(await protectedRows(),protectedBefore);assert.deepEqual(await save(),saved,'idempotent retry');
 assert.equal(await scalar("select count(*)::int value from public.partner_events where id=$1",[request]),1);
 const audit=await scalar("select event_payload->'operatingResponsibilityDecision' value from public.partner_events where id=$1",[request]);
 assert.equal(audit.actor,id.admin);assert.equal(audit.from,'partner_managed');assert.equal(audit.to,'legalease_managed');assert.deepEqual(audit.externalRights,[]);
 for(const role of ['anon','authenticated'])assert.equal(await scalar("select has_function_privilege($1,'public.rcap_program_external_rights_evidence(uuid)','EXECUTE') value",[role]),false);
 console.log('PASS operating-rights baseline reproduction and corrected atomic conversion, genuine-rights refusal, partner denial, preservation, audit and idempotency');
}
