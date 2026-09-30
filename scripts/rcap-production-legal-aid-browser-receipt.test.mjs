import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyProductionLegalAidProof,verifyReviewedLegalAidBehavior,runProductionLegalAidBehaviorProof,LOCAL_BEHAVIOR_COMMANDS,REVIEWED_BEHAVIOR_BASE,REVIEWED_BEHAVIOR_FILES,PRODUCTION_PROOF_STATUS,PRODUCTION_PROOF_TUPLE} from './rcap-production-legal-aid-browser-receipt.mjs';
import {applicationInputEquivalence} from './rcap-application-inputs.mjs';
import {runProductionLegalAidMigration} from './rcap-production-legal-aid-migrate.mjs';
import {buildClinicSourceReference,clinicSourceTestDatabase,CLINIC_SOURCE_FILES,clinicSourceCatalogQuery} from './rcap-production-migration-contract.mjs';
import {LEGAL_AID_MIGRATION,readbackQuery} from './rcap-legal-aid/contract.mjs';
const root=process.cwd(),read=rel=>fs.readFileSync(rel,'utf8');
const candidate=JSON.parse(read('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const authorization=JSON.parse(read('data/rcap-production-legal-aid-migration-authorization.json'));
const git=args=>{const s=execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});return args[0]==='show'?s:s.trimEnd();};
const head=git(['rev-parse','HEAD']);
const env={RCAP_PRODUCTION_PHASE:'legal_aid_migrate',RCAP_TOOLS_SHA:head,RCAP_APPLICATION_SHA:candidate.applicationSha,RCAP_WORKER_SOURCE_SHA:candidate.workerSourceSha,RCAP_WORKER_DIGEST:candidate.workerDigest,RCAP_PRODUCTION_PROJECT_REF:candidate.productionProjectRef,SUPABASE_ACCESS_TOKEN:'local-transport-only'};
// These adapters isolate identity guard negatives from repository setup. The
// positive canonical resolver and frozen ZIP/source bytes are real. No browser
// records or claimed live Production readback are used as proof.
const localResult=()=>({passed:true,commands:LOCAL_BEHAVIOR_COMMANDS.map(args=>({command:args.join(' '),passed:true}))});
let equivalent;
async function gate(mutate=()=>{}) {
  equivalent??=applicationInputEquivalence(root,candidate.applicationSha,head);
  const args={rootDir:root,env:{...env},authorization:structuredClone(authorization),candidate:structuredClone(candidate),behaviorProof:localResult(),
    git:args=>args[0]==='diff'?'':git(args),equivalence:()=>structuredClone(equivalent),requireRelease:()=>candidate};
  mutate(args);return verifyProductionLegalAidProof(args);
}
test('Production proof uses real canonical equivalence, frozen migration and committed Acceptance migration ZIP; no browser claim',async()=>{
 const result=await gate();assert.equal(result.status,PRODUCTION_PROOF_STATUS);assert.equal(result.application.comparedInputs,10285);assert.equal(result.application.equivalent,true);assert.deepEqual(result.application.changedPaths,[]);assert.equal(result.hostedBrowserSuccessClaimed,false);assert.equal(result.acceptanceMigration.runId,'35114154196');assert.equal(result.acceptanceMigration.artifactId,'10453896397');assert.equal(result.behavior.baseSha,REVIEWED_BEHAVIOR_BASE);
});
for(const [name,mutate,reason] of [
 ...Object.keys(PRODUCTION_PROOF_TUPLE).map(key=>[`candidate ${key}`,a=>a.candidate[key]='wrong',/exact release tuple/]),
 ...Object.keys(PRODUCTION_PROOF_TUPLE).map(key=>[`authorization ${key}`,a=>a.authorization.releaseTuple[key]='wrong',/owner exact release tuple/]),
 ['canonical input changed',a=>a.equivalence=()=>({equivalent:false,changedPaths:['src/app/page.tsx'],comparedInputs:10285}),/canonical application equivalence/],
 ['changed inputs falsely marked equivalent',a=>a.equivalence=()=>({equivalent:true,changedPaths:['src/app/page.tsx'],comparedInputs:10285}),/no changed application inputs/],
 ['truncated canonical resolver',a=>a.equivalence=()=>({equivalent:true,changedPaths:[],comparedInputs:1}),/canonical application input count/],
 ['Production project',a=>a.authorization.productionProjectRef='other',/Production project/],
 ['phase authorization absent',a=>{a.candidate.productionAuthorization.phases=a.candidate.productionAuthorization.phases.filter(p=>p!=='legal_aid_migrate');a.requireRelease=()=>a.candidate;},/not_authorized/],
 ['stale owner status',a=>a.authorization.status='conditional_on_fresh_hosted_browser',/owner authorization status/],
 ['wrong owner',a=>a.authorization.authorizedBy='agent',/owner authorization/],
 ['future owner date',a=>a.authorization.recordedAt='2999-01-01T00:00:00Z',/timestamp/],
 ['drop permission',a=>a.authorization.dropAuthorized=true,/drop authorization/],
 ...['path','sha256','sourceSha'].map(key=>[`migration ${key}`,a=>a.authorization.migration[key]='wrong',/frozen migration authority/]),
 ...['runId','artifactId','artifactZipSha256'].map(key=>[`Acceptance receipt ${key}`,a=>a.authorization.hostedAcceptance.migration[key]='wrong',/Acceptance migration receipt/]),
 ['invented hosted browser success',a=>a.authorization.hostedAcceptance.browserRunId='123',/no hosted browser success/],
 ['wrong reviewed base',a=>a.authorization.reviewedBehaviorBaseSha='0'.repeat(40),/reviewed behavior base/],
 ['missing reviewed ancestry',a=>a.reviewed=()=>verifyReviewedLegalAidBehavior(root,()=>{throw Error('reviewed base absent');}),/reviewed base absent/],
 ['failed local proof',a=>a.behaviorProof.passed=false,/required local behavior proof/],
 ['missing local test',a=>a.behaviorProof.commands.pop(),/every deterministic/],
 ['failed local command',a=>a.behaviorProof.commands[0].passed=false,/every deterministic/],
 ['stale tools',a=>a.env.RCAP_TOOLS_SHA='0'.repeat(40),/checked-out tools/],
 ['dirty application or tools',a=>a.git=args=>args[0]==='diff'?'src/app/page.tsx':git(args),/clean current tools/],
 ['stale release binding',a=>a.requireRelease=()=>{throw Error('binding stale');},/binding stale/],
 ['other phase',a=>a.env.RCAP_PRODUCTION_PHASE='activate',/exact authorized phase/]
])test(`Production proof refuses ${name}`,async()=>assert.rejects(()=>gate(mutate),reason));
for(const rel of REVIEWED_BEHAVIOR_FILES)test(`reviewed bytes refuse drift: ${rel}`,()=>{
 assert.throws(()=>verifyReviewedLegalAidBehavior(root,git,p=>read(p)+(p===rel?'\n':'')),/reviewed behavior drift/);
});
test('reviewed bytes permit only the exact owner-authorized historical test fixture adjustment',()=>{assert.equal(verifyReviewedLegalAidBehavior(root).files,REVIEWED_BEHAVIOR_FILES.length);});
test('local runner executes every required command without credentials or hosted inputs; failure aborts',()=>{
 const calls=[];const result=runProductionLegalAidBehaviorProof({rootDir:root,run:(exe,args,options)=>{calls.push(args);assert.equal(exe,process.execPath);assert.equal(options.cwd,root);for(const key of ['SUPABASE_ACCESS_TOKEN','VERCEL_TOKEN','GITHUB_TOKEN','RCAP_PRODUCTION_PHASE'])assert.equal(options.env[key],undefined);}});
 assert.deepEqual(calls,LOCAL_BEHAVIOR_COMMANDS);assert.deepEqual(result,localResult());
 for(let fail=0;fail<LOCAL_BEHAVIOR_COMMANDS.length;fail++){let n=0;assert.throws(()=>runProductionLegalAidBehaviorProof({run:()=>{if(n++===fail)throw Error('deterministic contract failed');}}),/deterministic contract failed/);assert.equal(n,fail+1);}
});
test('gate has no hosted receipt fetch, browser run input, Acceptance transport, Vercel or Stripe path',()=>{
 const proof=read('scripts/rcap-production-legal-aid-browser-receipt.mjs');assert.doesNotMatch(proof,/api\.github\.com|\bfetch\s*\(|verifyFreshLegalAidBrowserReceipt|RCAP_LEGAL_AID_BROWSER_RUN_ID|api\.vercel\.com|api\.stripe\.com/);
 for(const rel of ['.github/workflows/rcap-f1-ephemeral-staging.yml','.github/workflows/rcap-production-canary.yml','scripts/rcap-production-legal-aid-migrate.mjs'])assert.doesNotMatch(read(rel),/legal_aid_browser_run_id|RCAP_LEGAL_AID_BROWSER_RUN_ID/);
 assert.equal(createHash('sha256').update(JSON.stringify(authorization.supersededRecord)).digest('hex'),'fa51325f62f1088e2f7c7df26c4623e9f593b1b7ea644a21190fb123c5b293bf');
});
const response=json=>({status:200,ok:true,text:async()=>JSON.stringify(json)});
test('real migration entrypoint: local failure precedes all service access',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'legal-proof-before-service-'));let calls=0;
 try {const result=await runProductionLegalAidMigration({rootDir:root,env:{...env,RCAP_PRODUCTION_EVIDENCE_DIR:dir},requireRelease:()=>candidate,behaviorProof:()=>{throw Error('deterministic contract failed');},sourceReference:()=>{throw Error('source must not run');},fetch:()=>{calls++;throw Error('service must not run');}});assert.equal(result.passed,false);assert.match(result.failure,/deterministic contract failed/);assert.equal(calls,0);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('real migration entrypoint preserves empty/partial/prerequisite/race protections and exact frozen SQL ordering',async t=>{
 const reference=await buildClinicSourceReference(root),db=await clinicSourceTestDatabase();t.after(()=>db.close());
 for(const rel of CLINIC_SOURCE_FILES.filter(p=>p!==LEGAL_AID_MIGRATION.path))await db.exec(read(rel));
 const empty=(await db.query(readbackQuery())).rows[0];assert.equal(empty.legal_aid_tables.length,0);
 await db.exec(read(LEGAL_AID_MIGRATION.path));
 const complete=(await db.query(readbackQuery())).rows[0],catalog=(await db.query(clinicSourceCatalogQuery)).rows[0];
 // Source-derived catalogs, no live service. Transport explicitly refuses
 // every destination except the one synthetic canonical Production endpoint.
 async function run({first=empty,immediate=empty,proofFails=false,projectWrong=false}={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'legal-proof-order-'));const events=[];let reads=0;
  try {
   const result=await runProductionLegalAidMigration({rootDir:root,env:{...env,RCAP_PRODUCTION_EVIDENCE_DIR:dir},requireRelease:()=>candidate,
    behaviorProof:()=>{events.push('local');return localResult();},sourceReference:async()=>reference,
    proof:async args=>{events.push('proof');assert.deepEqual(args.behaviorProof,localResult());if(proofFails)throw Error('proof refused');return gate();},
    fetch:async(url,options)=>{
     assert.ok(url.startsWith(`https://api.supabase.com/v1/projects/${candidate.productionProjectRef}`));
     if(options.method==='GET'){events.push('project');return response({ref:projectWrong?'wrong':candidate.productionProjectRef});}
     const {query}=JSON.parse(options.body);
     if(query===readbackQuery()){events.push('readback');return response([++reads===1?first:reads===2?immediate:complete]);}
     if(query===clinicSourceCatalogQuery){events.push('certification');return response([catalog]);}
     if(query.trimStart().startsWith('select to_regclass')){events.push('inventory');return response([{}]);}
     assert.equal(query,read(LEGAL_AID_MIGRATION.path),'only frozen migration may write');events.push('write');return response([]);
    }});return {result,events};
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 }
 await t.test('success writes only after immediate readback, then directly certifies all postconditions',async()=>{const {result,events}=await run();assert.equal(result.passed,true,result.failure);assert.deepEqual(events,['local','project','inventory','readback','proof','readback','write','certification','readback']);assert.equal(result.certification.certified,true);assert.equal(result.readback.after.legalAid.tableCount,12);assert.equal(result.readback.after.legalAid.rlsTableCount,12);assert.equal(result.readback.after.legalAid.functionCount,32);});
 for(const [name,options,reason]of [
  ['partial initial schema',{first:{...empty,legal_aid_tables:['legal_aid_intakes']}},/initial_state/],
  ['missing initial prerequisites',{first:{...empty,clinic_tables:[]}},/prerequisites/],
  ['partial schema appears before write',{immediate:{...empty,legal_aid_tables:['legal_aid_intakes']}},/immediate_prewrite/],
  ['prerequisite changes before write',{immediate:{...empty,clinic_functions:[]}},/immediate_prewrite/],
  ['schema becomes complete before write',{immediate:complete},/immediate_prewrite/],
  ['proof refuses',{proofFails:true},/proof refused/],
  ['wrong project readback',{projectWrong:true},/canonical_production/]
 ])await t.test(name,async()=>{const {result,events}=await run(options);assert.equal(result.passed,false);assert.match(result.failure,reason);assert.equal(events.includes('write'),false);});
});
