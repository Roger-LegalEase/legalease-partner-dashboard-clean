import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';

const require=createRequire(import.meta.url);
const steps=parse(fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8')).jobs.preflight.steps;
test('hosted_legal_aid_browser installs frozen dependencies before verification and reuses the accepted Preview',()=>{
 const setup=steps.findIndex(s=>s.uses==='actions/setup-node@v4');
 const install=steps.findIndex(s=>s.run?.trim()==='npm ci');
 const verify=steps.findIndex(s=>s.id==='verify_legal_aid_browser');
 const browser=steps.findIndex(s=>s.id==='legal_aid_browser');
 assert.equal(steps[setup].with['node-version'],22);
 assert.ok(setup<install&&install<verify&&verify<browser);
 assert.equal(steps[install].if,undefined);
 assert.match(steps.find(s=>s.id==='contract').run,/legal_aid_browser\) DEPLOY=false;.*LEGAL_AID=true/);
 assert.match(steps[browser].if,/legal_aid_seed.outcome == 'success'/);
 assert.match(steps[browser].run,/node scripts\/rcap-hosted-legal-aid-browser.mjs/);
});
test('clean module graph with lockfile dependencies starts the real harness and stops before its first service call',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'legal-aid-clean-startup-'));
 try{
  const copied=new Set();
  function copyGraph(file){
   if(copied.has(file))return;copied.add(file);
   const source=fs.readFileSync(file,'utf8'),target=path.join(root,file);
   fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);
   for(const [,relative]of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
    const dependency=path.normalize(path.join(path.dirname(file),relative));
    if(dependency.endsWith('.mjs'))copyGraph(dependency);
   }
  }
  const entry='scripts/rcap-hosted-legal-aid-browser.mjs';copyGraph(entry);
  const boundary=path.join(root,'boundary.json'),evidence=path.join(root,'evidence');
  const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
  const code=`import fs from 'node:fs';globalThis.fetch=async(url,options={})=>{fs.writeFileSync(${JSON.stringify(boundary)},JSON.stringify({url:String(url),method:options.method??'GET',hasBody:options.body!==undefined}));throw Error('LOCAL_STOP_BEFORE_SERVICE');};await import(${JSON.stringify(pathToFileURL(path.join(root,entry)).href)});`;
  const env={PATH:process.env.PATH,...(process.env.NODE_OPTIONS?{NODE_OPTIONS:process.env.NODE_OPTIONS}:{}),
   ...Object.fromEntries(['GIT_DIR','GIT_WORK_TREE','GIT_OPTIONAL_LOCKS'].filter(k=>process.env[k]).map(k=>[k,process.env[k]])),
   HOSTED_APPLICATION_SHA:candidate.applicationSha,ACCEPTANCE_SUPABASE_PROJECT_REF:candidate.acceptanceProjectRef,
   HOSTED_PREVIEW_DEPLOYMENT_ID:candidate.hostedAcceptance.preview.deploymentId,HOSTED_PREVIEW_HOSTNAME:candidate.hostedAcceptance.preview.hostname,
   HOSTED_ACCEPTANCE_EVIDENCE_DIR:evidence,VERCEL_TOKEN:'local-placeholder',SUPABASE_ACCESS_TOKEN:'local-placeholder',
   VERCEL_AUTOMATION_BYPASS_SECRET:'local-placeholder',HOSTED_CLINIC_DEMO_PASSWORD:'local-placeholder-long-password'};
  function run(){
   const log=path.join(root,'startup.log'),fd=fs.openSync(log,'w');
   let result;try{result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
   assert.ifError(result.error);return {...result,output:fs.readFileSync(log,'utf8')};
  }
  const missing=run();assert.notEqual(missing.status,0);assert.match(missing.output,/ERR_MODULE_NOT_FOUND/);assert.equal(fs.existsSync(boundary),false);
  // Materialize only already-installed, exact lockfile packages; no install/network.
  fs.mkdirSync(path.join(root,'node_modules'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json'));
  for(const name of ['playwright','playwright-core','typescript','yaml']){
   const packagePath=require.resolve(name+'/package.json');
   assert.equal(JSON.parse(fs.readFileSync(packagePath)).version,lock.packages['node_modules/'+name].version,name);
   fs.symlinkSync(path.dirname(packagePath),path.join(root,'node_modules',name),'dir');
  }
  const result=run();assert.equal(result.status,1,result.output);
  assert.equal(fs.existsSync(boundary),true,result.output);
  const observed=JSON.parse(fs.readFileSync(boundary));
  assert.equal(observed.method,'GET');assert.equal(observed.hasBody,false);
  assert.equal(new URL(observed.url).origin,'https://api.vercel.com');
  const record=JSON.parse(fs.readFileSync(path.join(evidence,'legal-aid/browser.json')));
  assert.equal(record.passed,false);assert.equal(record.failure.message,'Vercel identity read failed or timed out');
  for(const flag of ['productionTouched','stripeTouched','workerRun','migrationApplied','checkoutCreated','paymentCompleted'])assert.equal(record[flag],false,flag);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// Rerun coverage uses the shipped SQL and real frozen Clinic/Legal Aid DDL in
// an in-memory PostgreSQL engine. No hosted credentials or services are used.
const seedPath='scripts/rcap-hosted-legal-aid-seed.mjs';
const seedSource=fs.readFileSync(seedPath,'utf8');
function assertSeedResetContract(source){
 const sql=source.replace(/\/\/[^\n]*|--[^\n]*/g,'');
 assert.doesNotMatch(sql,/(?:delete\s+from|update|truncate(?:\s+table)?)\s+(?:public\.)?(?:clinic_event_audit|legal_aid_access_audit)\b/i);
 assert.doesNotMatch(sql,/disable\s+trigger|drop\s+(?:trigger|constraint)|session_replication_role|truncate\b/i);
 assert.ok(source.indexOf('if (intakeAuditRows > 0)')<source.indexOf('await ensureSyntheticUser('));
 assert.ok(source.includes('retainedAuditRows >= priorAuditRows'));
 assert.ok(source.includes('const passed = auditPreserved &&'));
 for(const table of ['legal_aid_intakes','clinic_registrations','clinic_follow_ups','clinic_cases','clinic_event_staff'])assert.ok(source.includes(`delete from public.${table} where event_id=`));
 assert.ok(source.includes('productionTouched: false'));assert.ok(source.includes('stripeTouched: false'));
 assert.doesNotMatch(source,/api\.stripe\.com|api\.machines\.dev|flyctl|workflow_dispatch|production-canary/);
 assert.match(steps.find(s=>s.id==='legal_aid_browser').if,/legal_aid_seed.outcome == 'success'/);
}
test('seed retains audit counts, mutable reset and seed-gated browser without environment expansion',()=>assertSeedResetContract(seedSource));
for(const [name,from,to] of [
 ['audit deletion','delete from public.clinic_registrations','delete from public.clinic_event_audit'],
 ['audit update','delete from public.clinic_registrations','update public.legal_aid_access_audit'],
 ['audit truncation','delete from public.clinic_registrations','truncate public.clinic_event_audit'],
 ['trigger bypass','delete from public.clinic_registrations','alter table public.clinic_event_audit disable trigger all; delete from public.clinic_registrations'],
 ['missing count proof','retainedAuditRows >= priorAuditRows','true'],
 ['ignored count failure','const passed = auditPreserved &&','const passed ='],
 ['worker operation','productionTouched: false','productionTouched: false, worker: "api.machines.dev"'],
])test(`seed regression refuses ${name}`,()=>{
 assert.ok(seedSource.includes(from));assert.throws(()=>assertSeedResetContract(seedSource.replace(from,to)));
});

test('native frozen schema: audit-only reruns preserve history; audited intake refuses before mutation; mutable FK children reset in order',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');
 const vm=await import('node:vm');
 const {LEGAL_AID_FIXTURE:F}=await import('./rcap-legal-aid/hosted-fixture.mjs');
 const bootstrap=fs.readFileSync('scripts/legal-aid/local-stack/bootstrap.mjs','utf8');
 let stubs=vm.runInNewContext(bootstrap.match(/export const STUBS = (`[\s\S]*?`);/)[1]);
 const baseline=fs.readFileSync('supabase/migrations/20260728213131_remote_schema.sql','utf8');
 const originalTable=name=>{const start=baseline.indexOf(`CREATE TABLE IF NOT EXISTS "public"."${name}" (`);assert.ok(start>=0,name);return baseline.slice(start,baseline.indexOf('\n);',start)+4);};
 stubs=stubs.replace(/create table public\.partner_records\([^;]+;/,originalTable('partner_records')+'alter table partner_records add primary key(id); alter table partner_records add unique(partner_slug);');
 stubs=stubs.replace(/create table public\.partner_users\([^;]+;/,originalTable('partner_users')+'alter table partner_users add primary key(id); alter table partner_users add unique(auth_user_id); alter table partner_users add foreign key(auth_user_id) references auth.users(id); alter table partner_users add foreign key(partner_slug) references partner_records(partner_slug);');
 const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(stubs);
  const migrations=vm.runInNewContext(bootstrap.match(/export const MIGRATIONS = (\[[\s\S]*?\]);/)[1]);
  for(const file of migrations)await db.exec(fs.readFileSync(file,'utf8'));
  for(const name of ['partner_events','partner_entitlement'])await db.exec(originalTable(name));
  await db.exec('alter table partner_events add foreign key(partner_slug) references partner_records(partner_slug) on delete cascade; alter table partner_entitlement add foreign key(partner_slug) references partner_records(partner_slug) on delete restrict;');
  for(const [file,table]of [['supabase/phase-42-partner-onboarding.sql','partner_onboarding'],['supabase/phase-41-rcap-partner-access-codes.sql','partner_access_codes']]){
   const ddl=fs.readFileSync(file,'utf8');const re=new RegExp(`create table if not exists public\\.${table} \\([\\s\\S]*?\\n\\);`,'i');const match=ddl.match(re);assert.ok(match,table);await db.exec(match[0]);
  }
  const users=F.identities.map((u,i)=>({...u,id:`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`}));
  await db.exec(`insert into auth.users(id,email) values ${users.map(u=>`('${u.id}','${u.email}')`).join(',')}`);
  const byKey=Object.fromEntries(users.map(u=>[u.key,u]));
  const membershipRows=users.filter(u=>!['participant','auth_only'].includes(u.role)).map(u=>`('${u.id}',${u.role==='internal_admin'?'null':`'${F.partnerSlug}'`},'${u.role}','active','${u.email}')`);
  const noMembership=users.filter(u=>['participant','auth_only'].includes(u.role)).map(u=>`'${u.id}'`);
  const queryLog=[];
  const sandbox={F,byKey,membershipRows,noMembership,sqlText:v=>String(v).replaceAll("'","''"),evidence:{},writeEvidence(){},console:{log(){}},managementQuery:async q=>{queryLog.push(q);const results=await db.exec(q);return results.at(-1).rows;}};
  const preflight=seedSource.slice(seedSource.indexOf('  // Refuse retained intake history'),seedSource.indexOf('  // --- the exact Preview'));
  const reset=seedSource.slice(seedSource.indexOf('  // --- bounded reset and seed'),seedSource.indexOf('} catch (error)'));
  async function run(){queryLog.length=0;sandbox.evidence={};return vm.runInNewContext(`(async()=>{${preflight}\n${reset}})()`,sandbox);}
  await run();assert.equal(sandbox.evidence.passed,true);
  await db.exec(`insert into clinic_event_audit(event_id,action,target_type) values ('${F.eventId}','prior_training_run','event')`);
  const before=(await db.query('select * from clinic_event_audit order by id')).rows;
  await db.exec(`insert into partner_records(partner_id,partner_slug,partner_name,program_tier) values ('handoff-training','${F.handoffPartnerSlug}','Training handoff','sponsored');
    insert into partner_events(partner_slug,event_type,event_label) values ('${F.handoffPartnerSlug}','training','Training');
    insert into partner_onboarding(partner_slug) values ('${F.handoffPartnerSlug}');
    insert into partner_access_codes(partner_slug,code_hash) values ('${F.handoffPartnerSlug}','local-fixture-only');
    insert into partner_entitlement(partner_slug) values ('${F.handoffPartnerSlug}');`);
  await assert.rejects(db.exec(`delete from clinic_event_audit where event_id='${F.eventId}'`),/append-only/);
  await run();await run();
  assert.deepEqual((await db.query('select * from clinic_event_audit order by id')).rows,before);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.evidence.auditRowCounts)),{before:1,after:1,intakeAuditRows:0});
  // Every direct reset target is checked against native trigger definitions.
  const targets=[...new Set([...queryLog.join('\n').matchAll(/(?:delete from|update|insert into) public\.(\w+)/gi)].map(m=>m[1]))];
  const triggers=(await db.query(`select c.relname,p.proname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal`)).rows;
  for(const t of triggers.filter(t=>targets.includes(t.relname)))assert.notEqual(t.proname,'clinic_guard_append_only',t.relname);
  const admin=byKey.ADMIN_A.id;
  const profile=(await db.query(`insert into legal_aid_policy_profiles(partner_slug,version,intake_schema_version,prepared_by) values ('${F.partnerSlug}',1,'training-v1','${admin}') returning id`)).rows[0].id;
  const intake=(await db.query(`insert into legal_aid_intakes(event_id,participant_pseudonym,partner_slug,policy_profile_id,intake_schema_version) values ('${F.eventId}','${'a'.repeat(64)}','${F.partnerSlug}','${profile}','training-v1') returning id`)).rows[0].id;
  await db.exec(`insert into legal_aid_documents(intake_id,category,storage_path,original_filename,content_type,size_bytes,sha256,uploaded_role) values ('${intake}','other','legal-aid/training/document.pdf','test.pdf','application/pdf',1,'${'b'.repeat(64)}','participant');
    insert into legal_aid_document_tasks(intake_id,document_key,title,required_signer,execution_method,created_by) values ('${intake}','training','Training task','applicant','wet_signature','${admin}');
    insert into legal_aid_review_decisions(intake_id,decision_type,outcome,rationale,reviewer_user_id,reviewer_permission,policy_profile_id) values ('${intake}','attorney_review','reviewed','Training review','${admin}','attorney','${profile}');
    insert into legal_aid_case_exports(intake_id,exported_by,export_version,includes_restricted,storage_path,sha256) values ('${intake}','${admin}',1,false,'legal-aid/training/export.zip','${'c'.repeat(64)}');`);
  const staff=(await db.query(`insert into clinic_event_staff(event_id,partner_user_id,permissions,approved_by) select '${F.eventId}',id,array['assist'],'${admin}' from partner_users where auth_user_id='${admin}' returning id`)).rows[0].id;
  const assisted=(await db.query(`insert into clinic_assisted_sessions(event_id,event_staff_id,participant_user_id,handoff_token_hash,device_nonce_hash,consent_version,consented_at,expires_at) values ('${F.eventId}','${staff}','${admin}','${'d'.repeat(64)}','${'e'.repeat(64)}','training-v1',now(),now()+interval '1 hour') returning id`)).rows[0].id;
  const clinicCase=(await db.query(`insert into clinic_cases(event_id,participant_user_id,assisted_session_id,jurisdiction) values ('${F.eventId}','${admin}','${assisted}','MS') returning id`)).rows[0].id;
  await db.exec(`insert into clinic_follow_ups(event_id,clinic_case_id,owner_event_staff_id,created_by) values ('${F.eventId}','${clinicCase}','${staff}','${admin}'); update legal_aid_intakes set clinic_case_id='${clinicCase}' where id='${intake}';`);
  await db.exec('begin');
  await run();
  for(const table of ['legal_aid_intakes','legal_aid_documents','legal_aid_document_tasks','legal_aid_review_decisions','legal_aid_case_exports','clinic_cases','clinic_follow_ups','clinic_assisted_sessions','clinic_event_staff'])assert.equal((await db.query(`select count(*)::int as n from ${table}`)).rows[0].n,0,table);
  assert.deepEqual((await db.query('select * from clinic_event_audit order by id')).rows,before);
  await db.exec('rollback');
  await db.exec('begin');
  const render=(await db.query(`insert into packet_render_jobs(id,status) values (gen_random_uuid(),'queued') returning id`)).rows[0].id;
  await db.exec(`insert into clinic_packet_reservations(event_id,clinic_case_id,render_job_id,participant_user_id) values ('${F.eventId}','${clinicCase}','${render}','${admin}')`);
  await assert.rejects(run(),/LEGAL_AID_SEED_REFUSED_PACKET_RESERVATION_HISTORY/);assert.equal(queryLog.length,1);
  await db.exec('rollback');
  await db.exec(`insert into legal_aid_access_audit(intake_id,actor_user_id,action) values ('${intake}','${admin}','intake_viewed')`);
  const retained=(await db.query('select * from legal_aid_access_audit order by id')).rows;
  await assert.rejects(run(),/LEGAL_AID_SEED_REFUSED_AUDITED_INTAKE_HISTORY/);
  assert.equal(queryLog.length,1);assert.match(queryLog[0],/^select/);assert.equal(sandbox.evidence.passed,undefined);
  assert.deepEqual((await db.query('select * from legal_aid_access_audit order by id')).rows,retained);
  assert.equal((await db.query(`select count(*)::int as n from legal_aid_intakes where id='${intake}'`)).rows[0].n,1);
 }finally{await db.close();}
});

test('seed successor binding refuses wrong base, extra paths, changed prior hashes and merge parents',async()=>{
 const vm=await import('node:vm');const {execFileSync}=await import('node:child_process');
 const base='652793bb1469192ae3ec8c6dbdb5ae8402c05743';
 const toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',`ac9befc5972ebd24e5f1aba2e07ee9081d554698:${toolsPath}`],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(seedRerunCorrection){'),source.indexOf('  }else if(harnessCorrection){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=[toolsPath,'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','scripts/rcap-hosted-legal-aid-seed.mjs','scripts/rcap-hosted-legal-aid-startup.test.mjs'];
 const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){
  const b=structuredClone(binding);mutate(b);
  const sandbox={binding:b,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,
   seedRerunCorrection:b.successorTools.preactivationLegalAidSeedRerunCorrectionBaseSha,
   harnessCorrection:b.successorTools.preactivationHarnessCorrectionBaseSha,
   LEGAL_AID_SEED_RERUN_CORRECTION_BASE:base,LEGAL_AID_SEED_RERUN_CORRECTION_FILES:files,HARNESS_CORRECTION_BASE:'c015c7dbf44596d1f77f405697af9a75c03e045a',commitBase:base,
   expect:(a,b,message)=>assert.equal(JSON.stringify(a),JSON.stringify(b),message),
   git:args=>({show:JSON.stringify(prior),diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]};
  vm.runInNewContext(scope+'\n'+ancestry,sandbox);
 }
 run();
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationLegalAidSeedRerunCorrectionBaseSha='0'.repeat(40)}),/exact Legal Aid seed rerun correction base/);
 assert.throws(()=>run({delta:[...files,'src/unrelated.ts']}),/exact Legal Aid seed rerun correction paths/);
 assert.throws(()=>run({delta:files.slice(1)}),/exact Legal Aid seed rerun correction paths/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/rcap-hosted-legal-aid-browser.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationHarnessCorrectionBaseSha='0'.repeat(40)}),/preserved approved harness correction base/);
 assert.throws(()=>run({parents:[head,base,'b'.repeat(40)]}),/one non-merge tools successor/);
 assert.throws(()=>run({parents:[head,'b'.repeat(40)]}),/one non-merge tools successor/);
});
