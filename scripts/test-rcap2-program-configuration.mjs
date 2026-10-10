import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function testProgramConfiguration(db,id){
 await db.exec('begin');
 try {
 await db.query("update public.partner_onboarding set rcap_policy_version='legacy' where id=$1",[id.workspace]);
 for(const section of ['organization_contacts','program_goals','geography_audience_language_accessibility'])await db.query("insert into public.partner_onboarding_sections(workspace_id,section_key,response_data) values($1,$2,'{}') on conflict(workspace_id,section_key) do nothing",[id.workspace,section]);
 const refused=async(fn,predicate)=>{await db.exec('savepoint refused');try{await assert.rejects(fn,predicate);}finally{await db.exec('rollback to savepoint refused');await db.exec('release savepoint refused');}};
 const read=async(actor=id.admin)=>(await db.query('select public.rcap_service_get_program_configuration($1,$2) value',['signed-fixture',actor])).rows[0].value;
 const call=async(snapshot,patches,request=randomUUID(),actor=id.admin)=>(await db.query('select public.rcap_service_save_program_configuration($1,$2,$3,$4::jsonb,$5) value',['signed-fixture',actor,snapshot.version,JSON.stringify(patches),request])).rows[0].value;
 const protectedTables=['partner_onboarding_agreements','partner_onboarding_launch_approvals','partner_packet_entitlement','rcap_commercial_authorizations'];
 const protectedState=async()=>Promise.all(protectedTables.map(async t=>(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') value from public.${t} t`)).rows[0].value));
 await db.query("update public.partner_onboarding_sections set response_data=response_data||'{\"target_population\":\"Preserve this existing population\"}',revision=revision+1 where workspace_id=$1 and section_key='program_goals'",[id.workspace]);
 await db.query("update public.partner_onboarding_sections set response_data=response_data||'{\"counties\":[\"Existing county\"],\"primary_language\":\"English\"}',revision=revision+1 where workspace_id=$1 and section_key='geography_audience_language_accessibility'",[id.workspace]);
 const baseline=await read(), protectedBefore=await protectedState();
 const patches=[{section:'program_goals',values:{participation_mode:'both'},base:{participation_mode:baseline.data.program_goals?.participation_mode??null}},{section:'geography_audience_language_accessibility',values:{jurisdictions:['MD'],service_area_description:'Baltimore and nearby Maryland communities'},base:{jurisdictions:baseline.data.geography_audience_language_accessibility?.jurisdictions??null,service_area_description:baseline.data.geography_audience_language_accessibility?.service_area_description??null}}];
 const request=randomUUID(),saved=await call(baseline,patches,request);
 assert.equal(saved.data.program_goals.participation_mode,'both');assert.deepEqual(saved.data.geography_audience_language_accessibility.jurisdictions,['MD']);assert.equal(saved.version,baseline.version+1);assert.equal(saved.data.program_goals.target_population,baseline.data.program_goals.target_population);assert.deepEqual(saved.data.geography_audience_language_accessibility.counties,baseline.data.geography_audience_language_accessibility.counties);assert.equal(saved.data.geography_audience_language_accessibility.primary_language,'English');assert.equal(saved.policyVersion,baseline.policyVersion);assert.deepEqual(await protectedState(),protectedBefore);
 assert.deepEqual(await call(baseline,patches,request),saved);assert.equal((await db.query('select count(*)::int n from public.partner_events where id=$1',[request])).rows[0].n,1);
 console.log('PASS canonical multi-section save, exact readback, one revision and audit event; replay and policy/approval/finance preservation');
 await refused(()=>call(baseline,patches),e=>e.code==='40001');
 const first={section:'program_goals',values:{participation_mode:'online'},base:{participation_mode:'both'}};
 await refused(()=>call(saved,[first,{section:'geography_audience_language_accessibility',values:{jurisdictions:['XX']},base:{jurisdictions:['MD']}}]),e=>e.code==='22023');
 assert.deepEqual(await read(),saved,'second-section failure rolls back first-section write');
 await refused(()=>call(saved,[{section:'access_sponsorship_capacity',values:{payment_status:'paid'},base:{}}]),e=>e.code==='42501');
 console.log('PASS stale writes, protected financial fields and invalid later fields refuse atomically');
 const outsider=randomUUID();await db.query('insert into auth.users(id,email) values($1,$2)',[outsider,'isolated-outside@example.test']);
 await refused(()=>read(outsider),e=>e.code==='42501');await refused(()=>call(saved,[first],randomUUID(),outsider),e=>e.code==='42501');
 for(const role of ['anon','authenticated'])for(const signature of ['rcap_service_get_program_configuration(text,uuid)','rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid)'])assert.equal((await db.query('select has_function_privilege($1,$2,$3) allowed',[role,'public.'+signature,'EXECUTE'])).rows[0].allowed,false);
 console.log('PASS configuration refuses cross-tenant actors and direct browser RPC access');
 await db.query("update public.partner_onboarding set rcap_policy_version='rcap2.2' where id=$1",[id.workspace]);
 const current=await read();const v2=await call(current,[first]);assert.equal(v2.policyVersion,'rcap2.2');assert.equal(v2.data.program_goals.participation_mode,'online');
 console.log('PASS both legacy and RCAP2 canonical configuration remain editable under their actual policy');
 // Agreement recording must not require a fabricated commercial clearance.
 await db.query("update public.partner_onboarding set commercial_gate_status='blocked' where id=$1",[id.workspace]);
 const agreementVersion=(await read()).version,reviewId=randomUUID();
 const recordAgreement=()=>db.query(`select * from public.rcap_service_record_signed_agreement($1,$2,$3,$4,'order_form',$5,false,'','','','',0,$6,current_date,'Reviewed local executed fixture; no financial clearance',true)`,['signed-fixture',id.admin,agreementVersion,reviewId,id.request,'a'.repeat(64)]);
 const financeBefore=await db.query("select payment_status from public.partner_records where id=$1",[id.partner]);
 await db.query("update public.partner_onboarding set rcap_policy_version='legacy' where id=$1",[id.workspace]);
 await refused(recordAgreement,e=>e.code==='55000');
 await db.query("update public.partner_onboarding set rcap_policy_version='rcap2.2' where id=$1",[id.workspace]);
 await recordAgreement();
 assert.equal((await db.query('select commercial_gate_status from public.partner_onboarding where id=$1',[id.workspace])).rows[0].commercial_gate_status,'blocked');
 assert.deepEqual((await db.query("select payment_status from public.partner_records where id=$1",[id.partner])).rows,financeBefore.rows);
 assert.equal((await db.query('select count(*)::int n from public.rcap_commercial_authorizations where workspace_id=$1',[id.workspace])).rows[0].n,0);
 console.log('PASS RCAP2 records executed evidence before service authority; legacy gate, unpaid status and separate financial authorization remain intact');

 } finally { await db.exec('rollback'); }
}
