import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {runProductionClinicMigration} from './rcap-production-clinic-migrate.mjs';
import {buildClinicSourceReference,certifyClinicSourceCatalog,requireProductionPhaseAuthorization,requireProductionReleaseTuple} from './rcap-production-migration-contract.mjs';
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
test('Legal Aid current state is empty with exact prerequisites; absent independent browser authorization still refuses writes',()=>{
 const summary=legalSummary(row('legal_inventory'));assert.equal(summary.prerequisitesExact,true);assert.equal(summary.empty,true);assert.equal(summary.complete,false);
 const authorization=JSON.parse(fs.readFileSync('data/rcap-production-legal-aid-migration-authorization.json'));
 assert.equal(authorization.status,'pending_hosted_acceptance');assert.equal(authorization.hostedAcceptance.browserRunId,null);assert.equal(authorization.dropAuthorized,false);
});
test('current smoke schema and worker queue predicates pass; they do not substitute for remote smoke or Machine proof',()=>{
 const q=row('worker_queue');for(const k of ['stale_queued','queued','claimed','terminal_failed'])assert.equal(Number(q[k]),0);
 const declarations=extract('scripts/rcap-production-canary-smoke.mjs',['SAVE_CLAIM_REQUIRED_COLUMNS','SAVE_CLAIM_LEGACY_COLUMNS','SAVE_CLAIM_FUNCTION','SAVE_CLAIM_EVENTS_TABLE','REQUIRED_TABLES','REQUIRED_FUNCTIONS','postgresArray','exactNames']);
 const r=vm.runInNewContext(declarations+`\n({clinic:exactNames(postgresArray(clinic.rls_tables),REQUIRED_TABLES)&&exactNames(postgresArray(clinic.functions),REQUIRED_FUNCTIONS),save:SAVE_CLAIM_REQUIRED_COLUMNS.every(n=>save.required_columns.includes(n))&&save.legacy_columns.length===0&&postgresArray(save.functions).includes(SAVE_CLAIM_FUNCTION)&&postgresArray(save.tables).includes(SAVE_CLAIM_EVENTS_TABLE)})`,{clinic:row('smoke_clinic'),save:row('smoke_save_claim')});
 assert.equal(r.clinic,true);assert.equal(r.save,true);
});
