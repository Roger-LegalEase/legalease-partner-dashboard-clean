// Runs in the existing disposable real-launch SQL harness. Uses the actual page,
// canonical session resolver, services, SQL RPCs and React server renderer.
// Authentication doubles are local-only; this is not a staged browser session.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
register('./lib/ts-esm-loader.mjs',import.meta.url);
register('./lib/internal-auth-test-loader.mjs',import.meta.url);
register('./lib/workspace-recovery-test-loader.mjs',import.meta.url);
export async function testWorkspaceRecovery(db,id){
 Object.assign(process.env,{RCAP_PARTNER_ONBOARDING_ENABLED:'true',RCAP_ONBOARDING_PREFILL_ENABLED:'true',RCAP_ONBOARDING_LAUNCH_PREP_ENABLED:'true',RCAP_2_0_ENABLED:'true'});
 const {setWorkspaceDatabase,setWorkspaceFault,operations}=await import('./lib/workspace-recovery-test-db.mjs');setWorkspaceDatabase(db);
 const {setInternalAuthTestState}=await import('./lib/internal-auth-test-doubles.mjs');
 const context={authUserId:id.admin,partnerSlug:'signed-fixture',role:'internal_admin'};
 const adminSession=()=>setInternalAuthTestState({user:{id:id.admin,email:'internal@legalease.test'},rows:[{auth_user_id:id.admin,partner_slug:null,role:'internal_admin',status:'active'}]});
 const partnerSession=()=>setInternalAuthTestState({user:{id:id.attacker,email:'partner@legalease.test'},rows:[{auth_user_id:id.attacker,partner_slug:'signed-fixture',role:'partner_admin',status:'active'}]});
 const {getInternalPrefillSnapshot,savePreparedProgramValue}=await import('../src/lib/partners/onboarding/prefill-service.ts');
 await assert.rejects(getInternalPrefillSnapshot(context),error=>error.details?.databaseCode==='42703','Production prefill failure reproduced on the pre-lineage schema');
 console.log('PASS underlying failure reproduced: prefill supersedes_value_id query raises PostgreSQL 42703');
 const snapshot=async()=>JSON.stringify((await db.query(`select jsonb_object_agg(table_name,rows) snapshot from (
 select 'workspace' table_name,jsonb_agg(to_jsonb(t)) rows from public.partner_onboarding t union all
 select 'sections',jsonb_agg(to_jsonb(t)) from public.partner_onboarding_sections t union all
 select 'approvals',jsonb_agg(to_jsonb(t)) from public.partner_onboarding_launch_approvals t union all
 select 'checks',jsonb_agg(to_jsonb(t)) from public.partner_onboarding_launch_checks t union all
 select 'artifacts',jsonb_agg(to_jsonb(t)) from public.partner_onboarding_artifacts t union all
 select 'versions',jsonb_agg(to_jsonb(t)) from public.partner_onboarding_artifact_versions t union all
 select 'commercial',jsonb_agg(to_jsonb(t)) from public.rcap_commercial_authorizations t union all
 select 'entitlements',jsonb_agg(to_jsonb(t)) from public.partner_packet_entitlement t union all
 select 'events',jsonb_agg(to_jsonb(t)) from public.partner_events t) s`)).rows[0].snapshot);
 await db.query("insert into public.partner_onboarding_sections(workspace_id,section_key,status,response_data) values($1,'geography_audience_language_accessibility','in_progress','{\"jurisdictions\":[\"MS\"]}') on conflict(workspace_id,section_key) do nothing",[id.workspace]);
 await db.exec("insert into public.partner_records(id,partner_id,partner_slug,partner_name,program_tier,payment_status) values('11111111-1111-4111-8111-111111111112','pb','another-tenant','Another Fixture','pilot','unpaid'); insert into public.partner_onboarding(partner_slug,partner_record_id) values('another-tenant','11111111-1111-4111-8111-111111111112');");
 await db.query("insert into public.partner_onboarding_sections(workspace_id,section_key,status,response_data) values($1,'organization_contacts','in_progress','{}') on conflict(workspace_id,section_key) do nothing",[id.workspace]);
 const before=await snapshot();
 const migration=fs.readFileSync('supabase/migrations/20261010000731_rcap_prefill_lineage_compatibility.sql','utf8');await db.exec(migration);await db.exec(migration);
 assert.equal(await snapshot(),before,'migration preserves stored program and authority');
 assert.equal((await getInternalPrefillSnapshot(context)).workspace.id,id.workspace);
 assert.equal((await db.query("select has_column_privilege('authenticated','public.partner_onboarding_prefill_values','supersedes_value_id','SELECT') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select relrowsecurity enabled from pg_class where oid='public.partner_onboarding_prefill_values'::regclass")).rows[0].enabled,true);
 console.log('PASS backward-compatible lineage migration applies and replays; actual prefill service recovers without changing program records');
 const {default:AdminPage}=await import('../src/app/internal/partners/onboarding/[partnerSlug]/page.tsx');
 const {default:PartnerPage}=await import('../src/app/partner/onboarding/page.tsx');
 const {LocalizationProvider}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
 const {getProgramOperations}=await import('../src/lib/partners/onboarding/program-operations-service.ts');
 const {programDecision,prepareProgramDefaults,prepareProgramReview,enableProgramPolicy}=await import('../src/lib/partners/onboarding/program-experience-service.ts');
 const html=element=>renderToStaticMarkup(createElement(LocalizationProvider,null,element));
 const page=()=>AdminPage({params:Promise.resolve({partnerSlug:'signed-fixture'})});
 const startDisabled=value=>assert.match(value,/<button[^>]*disabled=""[^>]*>Start program<\/button>/);
 adminSession();
 let result=await page(),rendered=html(result);assert.match(rendered,/Signed Fixture/);assert.match(rendered,/Manage program clinics/);assert.match(rendered,/Use five-step setup/);startDisabled(rendered);
 const legacy=await getProgramOperations(context);assert(legacy.view&&legacy.preflight&&legacy.launchDecision);assert.deepEqual(legacy.issues,[]);assert.equal(legacy.identity.policyVersion,'legacy');
 assert.equal(await snapshot(),before,'legacy SSR and preflight do not mutate setup, policy, approvals, artifacts or money');
 assert(!operations.some(op=>op.operation.startsWith('rpc:')&&!['rcap_service_assert_internal_actor','rcap_service_evaluate_program','rcap_program_material_scope','rcap_agreement_clearance'].includes(op.operation.slice(4))));
 console.log('PASS actual authenticated legacy admin page server rendering; preparation editor and Clinic navigation survive; all stored program records unchanged');
 await db.exec('begin');
 try{
  for(const name of ['First preparation','Corrected preparation']){
   const current=await getInternalPrefillSnapshot(context);
   await savePreparedProgramValue(context,{requestId:crypto.randomUUID(),sectionKey:'organization_contacts',fieldKey:'public_organization_name',proposedValue:name,expectedWorkspaceVersion:current.workspace.aggregateVersion,expectedFieldValueHash:current.fieldValueHashes.public_organization_name});
   assert.equal((await getInternalPrefillSnapshot(context)).currentValues.public_organization_name,name);
  }
  const lineage=(await db.query("select supersedes_value_id,superseded_at,review_status from public.partner_onboarding_prefill_values where workspace_id=$1 order by created_at",[id.workspace])).rows;
  assert.equal(lineage.length,2);assert(lineage[0].superseded_at);assert(lineage[1].supersedes_value_id);assert.equal(lineage[1].review_status,'applied');
  assert.equal((await db.query('select rcap_policy_version from public.partner_onboarding where id=$1',[id.workspace])).rows[0].rcap_policy_version,'legacy');
 }catch(e){console.error('Isolated preparation SQL errors:',operations.filter(op=>op.error).map(op=>({operation:op.operation,error:op.error})));throw e;}finally{await db.exec('rollback');}
 assert.equal(await snapshot(),before);
 console.log('PASS actual legacy preparation service saves and corrects an answer with preserved lineage, without a policy upgrade');
 partnerSession();rendered=html(await PartnerPage({searchParams:Promise.resolve({})}));assert.match(rendered,/Program setup/);assert.match(rendered,/Use five-step setup/);assert.equal(await snapshot(),before);
 await assert.rejects(prepareProgramDefaults({...context,authUserId:id.attacker,role:'partner_admin'},crypto.randomUUID()),e=>e.code==='invalid_transition');
 await assert.rejects(prepareProgramReview(context),e=>e.code==='invalid_transition');
 assert.equal(await snapshot(),before);
 console.log('PASS actual partner onboarding entry renders five steps; opening or automatic preparation cannot upgrade legacy policy');
 adminSession();
 setWorkspaceFault((query)=>query.includes('from public."partner_events"')?{code:'08006',message:'sensitive fixture details MUST NOT LOG'}:null);
 rendered=html(await page());assert.match(rendered,/Administrator access details are unavailable/);assert.match(rendered,/Reload workspace/);assert.match(rendered,/Prepare and start/);
 setWorkspaceFault(query=>query.includes('"id","approval_type","decision","recorded_at","policy_details"')?{code:'08006'}:null);
 const partial=await getProgramOperations(context);assert(partial.view&&partial.preflight);assert.equal(partial.decisions,null);assert(partial.issues.some(i=>i.loader==='operations.decisions'));
 console.log('PASS independent page and nested optional administrative failures retain the valid workspace with recovery actions');
 setWorkspaceFault(query=>query.includes('from public."partner_onboarding_launch_checks"')?{code:'08006'}:null);
 const held=await getProgramOperations(context);assert(held.view);assert.equal(held.preflight,null);assert.equal(held.canStart,false);rendered=html(await page());startDisabled(rendered);assert.match(rendered,/Launch readiness is unavailable/);
 console.log('PASS unavailable legacy launch preflight leaves preparation visible and Start disabled');
 setWorkspaceFault(query=>query.includes('from public."rcap_launch_exception_events"')?{code:'42501'}:null);
 await assert.rejects(page(),e=>e.code==='forbidden');setWorkspaceFault(null);
 setInternalAuthTestState({});await assert.rejects(page(),e=>e.name==='InternalAuthTestRedirect'&&e.location.startsWith('/sign-in'));await assert.rejects(PartnerPage({searchParams:Promise.resolve({})}),e=>e.name==='InternalAuthTestRedirect');
 partnerSession();const denied=await page();assert.equal(denied.props.title,'Internal admin access denied');
 await assert.rejects(programDecision({...context,authUserId:id.attacker,partnerSlug:'another-tenant',role:'partner_admin'},'complete_setup'),e=>e.code==='forbidden');
 adminSession();await assert.rejects(AdminPage({params:Promise.resolve({partnerSlug:'absent-workspace'})}),e=>e.code==='workspace_not_found');
 console.log('PASS anonymous, wrong-role, cross-tenant, invalid-identity and database permission failures deny protected access');
 const upgrade={confirmed:true,requestId:crypto.randomUUID(),expectedVersion:legacy.identity.version};
 await assert.rejects(enableProgramPolicy(context,{...upgrade,confirmed:false}),e=>e.code==='forbidden');
 await assert.rejects(enableProgramPolicy(context,{...upgrade,expectedVersion:-1}),e=>e.code==='revision_conflict');
 await assert.rejects(enableProgramPolicy({...context,role:'partner_staff'},upgrade),e=>e.code==='forbidden');
 await enableProgramPolicy(context,upgrade);await enableProgramPolicy(context,upgrade);
 assert.equal((await db.query("select count(*)::int n from public.partner_events where id=$1 and event_type='rcap_program_policy_upgrade_requested'",[upgrade.requestId])).rows[0].n,1);
 const v2Before=await snapshot();
 console.log('PASS policy upgrade requires explicit administrator intent, current version and a durable audit; replay is idempotent');
 const v2=await getProgramOperations(context);assert(v2.view&&v2.preflight&&v2.launchDecision);assert.deepEqual(v2.issues,[]);assert.equal(v2.identity.policyVersion,'rcap2.2');
 rendered=html(await page());assert.match(rendered,/Prepare and start/);startDisabled(rendered);
 partnerSession();rendered=html(await PartnerPage({searchParams:Promise.resolve({})}));assert.match(rendered,/Program setup/);assert.doesNotMatch(rendered,/Use five-step setup/);assert.equal(await snapshot(),v2Before);
 adminSession();setWorkspaceFault(query=>query.includes('from public."rcap_launch_operation_events"')?{code:'08006'}:null);const heldV2=await getProgramOperations(context);assert(heldV2.view);assert.equal(heldV2.preflight,null);assert.equal(heldV2.canStart,false);startDisabled(html(await page()));setWorkspaceFault(null);
 assert.equal(await snapshot(),v2Before);
 console.log('PASS actual RCAP2 admin and partner server rendering; unavailable preflight disables Start; records and approvals preserved');
 await db.query("delete from public.partner_onboarding_sections where workspace_id=$1 and section_key in ('geography_audience_language_accessibility','organization_contacts')",[id.workspace]);
 console.log('LIMITATION isolated authenticated SSR is not legitimate authenticated staged-browser verification');
}
