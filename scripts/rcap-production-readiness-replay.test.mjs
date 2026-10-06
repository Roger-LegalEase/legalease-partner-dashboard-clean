import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {runProductionClinicMigration} from './rcap-production-clinic-migrate.mjs';
import {buildClinicSourceReference,clinicSourceCatalogQuery,certifyClinicSourceCatalog,requireProductionPhaseAuthorization,requireProductionReleaseTuple} from './rcap-production-migration-contract.mjs';
import * as forward from './rcap-production-forward-chain-migrate.mjs';
import {summarizeReadback as legalSummary} from './rcap-legal-aid/contract.mjs';
import {loadPacketContract,normalizeCatalog} from './rcap-packet-database-contract.mjs';
import {migrationCertification,requireMigrationCertification} from './rcap-migration-certification.mjs';
const root=process.cwd(),directory='scripts/fixtures/production-readiness-20260929/';
const capture=n=>JSON.parse(fs.readFileSync(directory+n+'.json'));
const row=n=>capture(n).data[0];
const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const reference=await buildClinicSourceReference(root);
function extract(file,names){
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),found=[];
 function visit(n){if((ts.isFunctionDeclaration(n)||ts.isVariableDeclaration(n))&&names.includes(n.name?.getText(ast)))found.push(ts.isVariableDeclaration(n)?'const '+n.getText(ast)+';':n.getText(ast));ts.forEachChild(n,visit);}visit(ast);return found.join('\n');
}
test('today\'s independently read Clinic catalog certifies clinic_jurisdiction with zero semantic differences',()=>{
 assert.equal(capture('clinic_source_catalog').readOnly,true);
 assert.equal(certifyClinicSourceCatalog(reference,row('clinic_source_catalog').catalog).stage,'clinic_jurisdiction');
 assert.equal(migrationCertification({expected:reference.snapshots.clinic_jurisdiction,actual:row('clinic_source_catalog').catalog}).failures.length,0);
});
test('actual Clinic entrypoint replays exact captured queries and returns no-write PASS',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-exact-replay-'));
 const normalized=s=>s.trim().replace(/\s+/g,' ');
 const queryMap=new Map(['clinic_baseline','clinic_inventory','clinic_source_catalog'].map(n=>[normalized(capture(n).query),capture(n).data]));
 // The expanded query additionally inventories the frozen funding overlay.
 // Its separate fresh Production readback proves all four objects absent;
 // therefore the original captured core catalog is the exact combined result.
 const fundingCapture=JSON.parse(fs.readFileSync('scripts/fixtures/production-packet-forward-correction/captured-funding-full.json'));
 assert.equal(fundingCapture.readOnly,true);assert.equal(fundingCapture.projectRef,candidate.productionProjectRef);
 assert.deepEqual(fundingCapture.data[0].catalog,{});
 queryMap.set(normalized(clinicSourceCatalogQuery),capture('clinic_source_catalog').data);
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();let queries=0;
 try{
  const result=await runProductionClinicMigration({rootDir:root,sourceReference:async()=>reference,
   env:{RCAP_APPLICATION_SHA:candidate.applicationSha,RCAP_WORKER_SOURCE_SHA:candidate.workerSourceSha,RCAP_WORKER_DIGEST:candidate.workerDigest,RCAP_TOOLS_SHA:head,GITHUB_SHA:head,RCAP_PRODUCTION_PROJECT_REF:candidate.productionProjectRef,RCAP_PRODUCTION_PHASE:'clinic_migrate',SUPABASE_ACCESS_TOKEN:'offline-only',RCAP_PRODUCTION_EVIDENCE_DIR:tmp},
   requireRelease:(_root,env)=>{requireProductionReleaseTuple(candidate,candidate,env);requireProductionPhaseAuthorization(candidate,env.RCAP_PRODUCTION_PHASE);return candidate;},
   fetch:async(url,options)=>{
    assert.equal(new URL(url).origin,'https://api.supabase.com');let json;
    if(options.method==='GET'){assert.equal(url,`https://api.supabase.com/v1/projects/${candidate.productionProjectRef}`);json={ref:capture('project').projectRef};}
    else {const q=normalized(JSON.parse(options.body).query);assert.ok(queryMap.has(q),'uncaptured query or any write refused');json=queryMap.get(q);queries++;}
    return{status:200,ok:true,text:async()=>JSON.stringify(json)};
   }});
  assert.equal(result.passed,true,result.failure);assert.equal(result.productionDatabaseMutated,false);assert.equal(result.migrationApplied,false);assert.equal(result.certification.stage,'clinic_jurisdiction');assert.ok(queries>=4);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('actual forward inventory logic: all 17–27 signatures, no unsafe gaps; stale canonical RPC still refuses',()=>{
 const definitions=extract('scripts/rcap-production-forward-chain-migrate.mjs',['truthy','postgresArray','summarizeReadback','definedObjects','unsafeGaps']);
 const r=vm.runInNewContext(definitions+'\nconst summary=summarizeReadback(row); ({summary,gaps:unsafeGaps(summary,new Map())})',{...forward,row:row('forward_inventory'),certifiedExecutions:new Set()});
 assert.equal(r.summary.prerequisitesExact,true);assert.equal(r.summary.baselineExact,true);assert.equal(r.summary.priorStepsRequiredPresent,true);assert.equal(r.summary.present.length,11);assert.equal(r.summary.missing.length,0);assert.equal(r.summary.orderedPrefix,true);assert.equal(r.gaps.length,0);assert.equal(r.summary.complete,false);
 const expected=fs.readFileSync('supabase/migrations/20260925134704_canonical_consumer_presentation_matter.sql','utf8').split('$source$')[1],rpc=row('canonical_matter_rpc');
 assert.notEqual(rpc.prosrc,expected);assert.ok(rpc.prosrc.includes("p.candidate_route_context ->> 'matterId'"));assert.ok(expected.includes('public.consumer_matter_id_for_briefcase_item(i.id)::text'));assert.equal(rpc.prosecdef,true);assert.deepEqual(rpc.proconfig,['search_path=""']);assert.equal(rpc.provolatile,'s');assert.equal(rpc.lanname,'sql');assert.equal(rpc.service_execute,true);assert.equal(rpc.anon_execute,false);assert.equal(rpc.authenticated_execute,false);
});
test('actual packet certification refuses all 19 current semantic differences; missing retry history is not a source-model exception',()=>{
 const args={expected:loadPacketContract(root).current,actual:normalizeCatalog(row('packet_source_catalog').catalog)};
 const result=migrationCertification(args);assert.equal(result.certified,false);assert.equal(result.failures.length,19);
 for(const key of ['column:packet_render_jobs.retry_reconciliation_history','functions:guard_packet_render_job_retry_history','trigger:packet_render_jobs.guard_packet_render_job_retry_history'])assert.ok(result.failures.some(x=>x.name===key));
 assert.throws(()=>requireMigrationCertification(args),/migration_not_certified/);
});
test('Legal Aid captured empty state requires Production-native proof and immediate exact readback before frozen migration',async()=>{
 const summary=legalSummary(row('legal_inventory'));assert.equal(summary.prerequisitesExact,true);assert.equal(summary.empty,true);assert.equal(summary.complete,false);
 const partial=legalSummary({...row('legal_inventory'),legal_aid_tables:['legal_aid_intakes']});assert.equal(partial.empty,false);assert.equal(partial.complete,false);
 const authorization=JSON.parse(fs.readFileSync('data/rcap-production-legal-aid-migration-authorization.json'));
 assert.equal(authorization.status,'authorized_on_unchanged_application_and_reviewed_behavior');assert.equal(authorization.hostedAcceptance.browserRunId,null);assert.equal(authorization.dropAuthorized,false);
 assert.equal(authorization.productionProjectRef,'wwtwtsmywnckfkdaqqeg');
 assert.equal(authorization.supersededRecord.status,'pending_hosted_acceptance');assert.equal(authorization.supersededRecord.hostedAcceptance.browserRunId,null);
 assert.deepEqual(authorization.migration,{path:'supabase/migrations/20260916120000_legal_aid_clinic_mode.sql',sha256:'91c9b887324ce36d0515357fef2b9ce19cef271c99c157e8004533c73015cce8',sourceSha:'f5c4f40022e422033985302995511da7157f474d'});
 assert.equal(authorization.hostedAcceptance.legalAidMigrateRunId,'35114154196');
 assert.deepEqual(authorization.hostedAcceptance.migration,{runId:'35114154196',artifactId:'10453896397',artifactZipSha256:'sha256:fad3384b88249d8cd2411089867b2971c97f66b258269e5958f7a12c29be45db'});
 assert.deepEqual(authorization.releaseTuple,Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'].map(key=>[key,candidate[key]])));
 assert.equal(requireProductionPhaseAuthorization(candidate,'legal_aid_migrate'),candidate.productionAuthorization);
 const denied=structuredClone(candidate);denied.productionAuthorization.phases=denied.productionAuthorization.phases.filter(p=>p!=='legal_aid_migrate');assert.throws(()=>requireProductionPhaseAuthorization(denied,'legal_aid_migrate'));
 const {PRODUCTION_PROOF_TUPLE,verifyReviewedLegalAidBehavior}=await import('./rcap-production-legal-aid-browser-receipt.mjs');
 assert.deepEqual(authorization.releaseTuple,PRODUCTION_PROOF_TUPLE);
 assert.equal(candidate.applicationSha,'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226');
 const {applicationInputEquivalence}=await import('./rcap-application-inputs.mjs');
 const equivalence=applicationInputEquivalence(root,candidate.applicationSha,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
 assert.equal(equivalence.equivalent,true);assert.deepEqual(equivalence.changedPaths,[]);assert.equal(equivalence.comparedInputs,10285);
 assert.equal(verifyReviewedLegalAidBehavior(root).baseSha,'80e014d35c6af4dcfd57957013781483bb4ffb52');
 const control=fs.readFileSync('scripts/rcap-production-legal-aid-migrate.mjs','utf8');
 // Require actual call sites to exist: indexOf(-1) must never count as proof
 // that a removed guard precedes a write. Runtime race/refusal coverage lives
 // in the required Production proof-gate entrypoint suite.
 const ordered=['const release = requireRelease(ROOT_DIR, env);','await behaviorProof({','await managementGet(',
  '"clinic_mode_prerequisites_read_back_exact"','"legal_aid_schema_initial_state_is_empty_or_complete"',
  'await proof({','"independent_production_authorization_and_reviewed_behavior"',
  'await readback("legal_aid_immediate_prewrite_readback")','immediateBeforeWrite.empty && immediateBeforeWrite.prerequisitesExact',
  'await managementQuery(sql, "legal_aid_migration_applied")','"legal_aid_source_postconditions_after"','await readback("legal_aid_catalog_direct_readback")'];
 let previous=-1;for(const marker of ordered){const index=control.indexOf(marker);assert.ok(index>=0&&index>previous,marker);previous=index;}
 for(const guard of ['proof = verifyProductionLegalAidProof','before.empty || before.complete','if (before.empty && identityAuthorized)','!before.empty || authorized','authorization?.dropAuthorized === false','frozenMigrationSql(ROOT_DIR, APPLICATION_SHA)','certifyClinicSourceCatalog(reference,','all_12_legal_aid_tables_exist_with_rls_enabled','all_32_legal_aid_functions_exist','private_bucket_and_grants_read_back_tight','legal_aid_schema_complete_after_apply'])assert.ok(control.includes(guard),guard);
 assert.doesNotMatch(control,/verifyFreshLegalAidBrowserReceipt|RCAP_LEGAL_AID_BROWSER_RUN_ID/);
});
test('current smoke schema and worker queue predicates pass; they do not substitute for remote smoke or Machine proof',()=>{
 const q=row('worker_queue');for(const k of ['stale_queued','queued','claimed','terminal_failed'])assert.equal(Number(q[k]),0);
 const declarations=extract('scripts/rcap-production-canary-smoke.mjs',['SAVE_CLAIM_REQUIRED_COLUMNS','SAVE_CLAIM_LEGACY_COLUMNS','SAVE_CLAIM_FUNCTION','SAVE_CLAIM_EVENTS_TABLE','REQUIRED_TABLES','REQUIRED_FUNCTIONS','postgresArray','exactNames']);
 const r=vm.runInNewContext(declarations+`\n({clinic:exactNames(postgresArray(clinic.rls_tables),REQUIRED_TABLES)&&exactNames(postgresArray(clinic.functions),REQUIRED_FUNCTIONS),save:SAVE_CLAIM_REQUIRED_COLUMNS.every(n=>save.required_columns.includes(n))&&save.legacy_columns.length===0&&postgresArray(save.functions).includes(SAVE_CLAIM_FUNCTION)&&postgresArray(save.tables).includes(SAVE_CLAIM_EVENTS_TABLE)})`,{clinic:row('smoke_clinic'),save:row('smoke_save_claim')});
 assert.equal(r.clinic,true);assert.equal(r.save,true);
});
