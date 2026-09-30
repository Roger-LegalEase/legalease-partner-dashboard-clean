import {ACTIVATION_BASE,ACTIVATION_STATUS,ACTIVATION_SCOPE,ACTIVATION_NOTE,assertActivationAuthorization} from './production-preflight-authorization.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PREACTIVATION_BASE,PREACTIVATION_STATUS,PREACTIVATION_PHASES,BOUND_PREFLIGHT,BOUND_RESTAGE,BOUND_SMOKE,STAGED_DEPLOYMENT,PREACTIVATION_NOTE,assertPreactivationAuthorization,requireProductionPhaseAuthorization} from './production-preflight-authorization.mjs';
import {PREFLIGHT_EVIDENCE_FILES,loadProductionPreflightDocuments,validateProductionPreflightDocuments,verifyProductionPreflightEvidence} from './verify-production-preflight-evidence.mjs';
import {HOSTED_EVIDENCE_FILES} from './verify-hosted-acceptance-evidence.mjs';
import {requireProductionDeploymentBinding} from '../rcap-production-migration-contract.mjs';
const prefix='data/rcap-grade-a/launch-control/';
const authorizedCandidate=JSON.parse(fs.readFileSync(prefix+'RELEASE_CANDIDATE_BINDING.json'));
const candidate=JSON.parse(execFileSync('git',['show',ACTIVATION_BASE+':'+prefix+'RELEASE_CANDIDATE_BINDING.json'],{encoding:'utf8'}));
const clone=()=>structuredClone(candidate);
const refusal={message:'production_phase_not_authorized_for_current_release'};
const required=['preflight','clinic_migrate','forward_chain_readback','forward_chain_migrate','legal_aid_keys_read','legal_aid_keys_create','legal_aid_readback','legal_aid_migrate','production_worker_deploy','smoke','restage'];
test('one bounded successor binds exactly the owner phases and actual preflight',()=>{
 assert.equal(candidate.status,PREACTIVATION_STATUS);assert.deepEqual([...PREACTIVATION_PHASES],required);
 assert.deepEqual(candidate.productionAuthorization.phases,required);
 assert.equal(assertPreactivationAuthorization(candidate),candidate.productionAuthorization);
 assert.deepEqual(verifyProductionPreflightEvidence(process.cwd()),candidate.productionAuthorization.preflight);
 assert.deepEqual(candidate.productionAuthorization.preflight,BOUND_PREFLIGHT);
});
for(const phase of required)test(`${phase}: exact frozen release authorized`,()=>{
 assert.equal(requireProductionPhaseAuthorization(candidate,phase),candidate.productionAuthorization);
 assert.equal(requireProductionDeploymentBinding(candidate,phase),candidate.productionAuthorization);
});
const dispatcher=fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8');
const modes=dispatcher.match(/options: \[([^\n]+)\]/)[1].split(', ').filter(p=>p.startsWith('production_'));
const denied=[...new Set([...modes,...modes.map(p=>p.slice(11)), 'activate','public_verify','save_transition_reproduce','save_transition_verify','live_zero_dollar_order','live_open_payable_checkout','payable','live_order','alias','promote','alias_move','production_alias','production_promote','unknown_future_phase','production_save_transition_*'])].filter(p=>!required.includes(p));
for(const phase of denied)test(`${phase}: refusal survives substitution and appended phase`,()=>{
 assert.throws(()=>requireProductionPhaseAuthorization(candidate,phase),refusal);
 for(const list of [[phase],[...required,phase]]){
  const c=clone();c.productionAuthorization.phases=list;
  assert.throws(()=>requireProductionPhaseAuthorization(c,phase),refusal);
  for(const allowed of required)assert.throws(()=>requireProductionPhaseAuthorization(c,allowed),refusal);
 }
});
for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'])for(const location of ['candidate','authorization','both'])test(`wrong ${key} in ${location}`,()=>{
 const c=clone();if(location!=='authorization')c[key]='wrong';if(location!=='candidate')c.productionAuthorization[key]='wrong';
 for(const p of required)assert.throws(()=>requireProductionPhaseAuthorization(c,p),refusal);
});
for(const [name,mutate]of [
 ['missing owner',c=>delete c.productionAuthorization.recordedBy],['wrong owner',c=>c.productionAuthorization.recordedBy='Codex'],
 ['missing timestamp',c=>delete c.productionAuthorization.recordedAt],...['invalid','2026-02-30T00:00:00.000Z','2999-01-01T00:00:00.000Z'].map(v=>[`invalid timestamp ${v}`,c=>c.productionAuthorization.recordedAt=v]),
 ['missing authorization',c=>delete c.productionAuthorization],['false outer flag',c=>c.productionAuthorized=false],['false inner flag',c=>c.productionAuthorization.authorized=false],
 ['old status',c=>c.status=c.supersededRecord.status],['wrong mirror',c=>c.hostedAcceptanceStatus='PRODUCTION_LIVE'],['wrong base',c=>c.releaseBaseSha='0'.repeat(40)],
 ['general status',c=>c.status='PRODUCTION_AUTHORIZED'],['broadened owner note',c=>c.productionAuthorization.note+=' Activate.'],
 ['old permission',c=>c.productionAuthorization=c.supersededRecord.productionAuthorization],['missing phase',c=>c.productionAuthorization.phases.pop()],['duplicate phase',c=>c.productionAuthorization.phases.push('smoke')],
 ...['stagedDeploymentId','rollbackDeploymentId'].map(k=>[`wrong ${k}`,c=>c.productionAuthorization[k]='dpl_invented']),
 ...Object.keys(BOUND_PREFLIGHT).map(k=>[`wrong preflight ${k}`,c=>c.productionAuthorization.preflight[k]='wrong']),
 ...['smokeRunId','smokeArtifactSha256','smokeReceipt','activationReceipt'].flatMap(k=>['candidate','authorization'].map(l=>[`invented ${l} ${k}`,c=>(l==='candidate'?c:c.productionAuthorization)[k]='invented'])),
 ...Object.keys(candidate.hostedAcceptance.preview).map(k=>[`Preview ${k}`,c=>c.hostedAcceptance.preview[k]='wrong']),
])test(`mutation refuses ${name}`,()=>{const c=clone();mutate(c);for(const p of required)assert.throws(()=>requireProductionPhaseAuthorization(c,p),refusal);});
const documents=loadProductionPreflightDocuments(process.cwd());
for(const [name,mutate]of [
 ['run',d=>d.run.id++],['run tools',d=>d.run.head_sha='0'.repeat(40)],['failed run',d=>d.run.conclusion='failure'],['wrong phase',d=>d.run.display_title=d.run.display_title.replace('preflight','smoke')],
 ['artifact',d=>d.artifact.id++],['artifact digest',d=>d.artifact.digest='sha256:'+'0'.repeat(64)],['artifact run',d=>d.artifact.workflow_run.id++],
 ['skipped preflight',d=>d.jobs.jobs.find(j=>j.conclusion==='success').steps.find(s=>s.number===15).conclusion='skipped'],
 ['activation ran',d=>d.jobs.jobs.find(j=>j.conclusion==='success').steps.find(s=>s.number===23).conclusion='success'],
 ['receipt failed',d=>d.body.passed=false],['staged deployment',d=>d.body.deployments.stagedProduction='dpl_wrong'],['rollback',d=>d.body.deployments.rollbackTarget='dpl_wrong'],['Preview',d=>d.body.deployments.acceptedPreview='dpl_wrong'],
 ['application',d=>d.body.requestedIdentity.applicationSha='0'.repeat(40)],['worker source',d=>d.body.requestedIdentity.workerSourceSha='0'.repeat(40)],['worker digest',d=>d.body.requestedIdentity.workerDigest='wrong'],['project',d=>d.body.projectRefs.production='wrong'],
 ...['productionAliasChanged','productionDatabaseMutated','environmentVariableChanged','workerChanged','applicationChanged'].map(k=>[k,d=>d.body[k]=true]),
 ['changed alias hash',d=>d.body.controlHashes.productionAliasMappingAfterSha256='0'.repeat(64)],['failed verdict',d=>d.body.verdicts[0].passed=false],['missing verdict',d=>d.body.verdicts.pop()],
])test(`native preflight semantic mutation refuses ${name}`,()=>{const d=structuredClone(documents);mutate(d);assert.throws(()=>validateProductionPreflightDocuments(d));});
test('prior authority and hosted evidence are preserved; integrated controls retain frozen safeguards',()=>{
 for(const name of ['RELEASE_CANDIDATE_BINDING.json','HOSTED_TOOLS_BINDING.json','PENDING_WORKER_SUCCESSOR.json']){
  const rel=prefix+name,record=JSON.parse(fs.readFileSync(rel));const bytes=execFileSync('git',['show',`${PREACTIVATION_BASE}:${rel}`],{maxBuffer:32*1024*1024});
  assert.equal(JSON.stringify(record.supersededRecord,null,2).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))+'\n',bytes.toString());
  assert.equal(record.supersededRecordSha256,createHash('sha256').update(bytes).digest('hex'));
 }
 assert.deepEqual(candidate.hostedAcceptance,candidate.supersededRecord.hostedAcceptance);
 for(const rel of [...HOSTED_EVIDENCE_FILES,'scripts/rcap-production-clinic-migrate.mjs']) {
  assert.deepEqual(fs.readFileSync(rel),execFileSync('git',['show',`${PREACTIVATION_BASE}:${rel}`],{maxBuffer:32*1024*1024}));
 }
 // The smoke reset harness has an explicitly bound tools-only successor.
 // Preserve every prior byte outside its reset block and the two plumbing edits;
 // behavioral tests exercise the new block against the real frozen reset route.
 const smokePath='scripts/rcap-production-canary-smoke.mjs';
 const priorSmoke=execFileSync('git',['show',`${PREACTIVATION_BASE}:${smokePath}`],{encoding:'utf8'});
 const smoke=fs.readFileSync(smokePath,'utf8');
 const beforeReset=s=>s.slice(0,s.indexOf('  const reset = await '));
 const afterReset=s=>s.slice(s.indexOf('\n  evidence.runtime ='));
 assert.equal(beforeReset(smoke)
  .replace("import { runCleanDeviceReset } from './rcap-production-smoke-reset.mjs';\n",'')
  .replace('redirect: options.redirect ?? "follow",','redirect: "follow",'),beforeReset(priorSmoke),'all pre-reset safeguards preserved');
 assert.equal(afterReset(smoke),afterReset(priorSmoke),'entire post-reset persistence and failure handling preserved');
 assert.match(smoke,/const reset = await runCleanDeviceReset\(\(pathname, options\) =>\s*stagedFetch\(runtime.deploymentOrigin, pathname, options\)\)/);
 assert.match(smoke,/"clinic_reset_boundary_passed",\s*reset\.passed,/);
 for(const rel of ['data/rcap-production-forward-chain-migration-authorization.json','data/rcap-production-legal-aid-migration-authorization.json']) {
  const prior=JSON.parse(execFileSync('git',['show',`${PREACTIVATION_BASE}:${rel}`],{maxBuffer:32*1024*1024}));
  const current=JSON.parse(fs.readFileSync(rel));assert.deepEqual(current.supersededRecord,prior);assert.equal(current.dropAuthorized,false);
 }
 const priorControl=rel=>execFileSync('git',['show',`${PREACTIVATION_BASE}:${rel}`],{encoding:'utf8',maxBuffer:32*1024*1024});
 const keysPath='scripts/rcap-production-legal-aid-keys.mjs';
 const shapeGuard=`    record("existing_production_key_shape_is_safe", existingKey.length <= 1 && existingVersion.length <= 1 && existingPseudonym.length <= 1
      && existingKey.every(entry => entry.type === "sensitive") && existingPseudonym.every(entry => entry.type === "sensitive"),
      "duplicate or nonsensitive existing protected keys refuse before any creation");
`;
 assert.equal(fs.readFileSync(keysPath,'utf8'),priorControl(keysPath)
  .replace('if (existingKey.length === 0 || existingVersion.length === 0) {','if (existingKey.length === 0 || existingVersion.length === 0 || existingPseudonym.length === 0) {')
  .replace('    record("existing_pseudonym_secret_is_never_overwritten"',shapeGuard+'    record("existing_pseudonym_secret_is_never_overwritten"'));
 const legalPath='scripts/rcap-production-legal-aid-migrate.mjs',legal=fs.readFileSync(legalPath,'utf8'),priorLegal=priorControl(legalPath);
 const reviewedLegal=execFileSync('git',['show',`80e014d35c6af4dcfd57957013781483bb4ffb52:${legalPath}`],{encoding:'utf8'});
 const tail='      await managementQuery(sql, "legal_aid_migration_applied");';
 assert.equal(legal.slice(legal.indexOf(tail)),reviewedLegal.slice(reviewedLegal.indexOf(tail)),'entire migration apply and postcondition tail preserved');
 for(const guard of ['authorization?.productionProjectRef === PRODUCTION_PROJECT_REF','authorization?.migration?.path === LEGAL_AID_MIGRATION.path','authorization?.migration?.sha256 === LEGAL_AID_MIGRATION.sha256','authorization?.migration?.sourceSha === LEGAL_AID_MIGRATION.sourceSha','authorization?.dropAuthorized === false','!before.empty || authorized','if (before.empty && identityAuthorized)','await proof({','immediateBeforeWrite.empty && immediateBeforeWrite.prerequisitesExact'])assert.ok(legal.includes(guard),guard);
 assert.ok(legal.indexOf('await behaviorProof({')<legal.indexOf('await managementGet('),'local proof before service access');
 assert.ok(legal.indexOf('await proof({')<legal.indexOf('await readback("legal_aid_immediate_prewrite_readback")'));
 const owner=JSON.parse(fs.readFileSync('data/rcap-production-legal-aid-migration-authorization.json'));
 assert.equal(owner.status,'authorized_on_unchanged_application_and_reviewed_behavior');
 assert.equal(owner.authorizedBy,'Roger Roman');assert.equal(owner.hostedAcceptance.browserRunId,null);
 assert.deepEqual(owner.releaseTuple,Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'].map(k=>[k,candidate[k]])));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`36f1e3f716aca14ba874cfdb3082edf1c8279ffa:${prefix}RELEASE_CANDIDATE_BINDING.json`],{encoding:'utf8'}));
 assert.deepEqual(candidate,{...priorCandidate,productionAuthorization:{...priorCandidate.productionAuthorization,phases:[...priorCandidate.productionAuthorization.phases,'restage'],note:PREACTIVATION_NOTE,stagedDeploymentId:STAGED_DEPLOYMENT,restage:candidate.productionAuthorization.restage,smokeRunId:BOUND_SMOKE.runId,smokeArtifactSha256:BOUND_SMOKE.smokeArtifactSha256,smokeReceipt:{...BOUND_SMOKE}}});
 assert.equal(candidate.productionAuthorization.stagedDeploymentId,'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc');
 assert.equal(candidate.productionAuthorization.restage.oldStagedDeploymentId,'dpl_4Kmyt51JN8P4D7iB1GC3VaZcN2hp');
 assert.equal(candidate.productionAuthorization.rollbackDeploymentId,'dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK');
 const forwardPath='scripts/rcap-production-forward-chain-migrate.mjs',forward=fs.readFileSync(forwardPath,'utf8'),priorForward=priorControl(forwardPath);
 const forwardImport="import { loadCorrection, requireForwardCorrectionAuthorization, stateFingerprint } from './rcap-production-packet-forward-correction.mjs';\n";
 const fundingImport="import {fundingCatalogQuery} from './rcap-production-funding-dependency-contract.mjs';\n";
 assert.equal(forward.split(fundingImport).length,2,'exactly one approved funding catalog import');
 const forwardBoundary='  const release = requireRelease(ROOT_DIR, env);';
 assert.equal(forward.replace(forwardImport,'').replace(fundingImport,'').split(forwardBoundary)[0],priorForward.split(forwardBoundary)[0]);
 assert.equal(forward.slice(forward.indexOf('} catch (error) {')),priorForward.slice(priorForward.indexOf('} catch (error) {')));
 for(const guard of ['requireForwardCorrectionAuthorization(ROOT_DIR,release,correction)','current.fingerprint === correction.manifest.beforeFingerprint','immediate.fingerprint === correction.manifest.beforeFingerprint','current.fingerprint === correction.manifest.afterFingerprint','requireMigrationCertification({expected: contract.current','evidence.ledgerRowsRecorded.length === 0',"managementQuery(fundingCatalogQuery,label+'_funding')","managementQuery(correction.prerequisites.query,label+'_prerequisites')",'stateFingerprint(packet,canonical,full,funding,prerequisites)'])assert.ok(forward.includes(guard),guard);
 assert.equal(PREFLIGHT_EVIDENCE_FILES.length,4);
});
console.log(`Pre-activation boundary: ${required.length} permitted phases; ${denied.length} denied spellings with substitution/appending refusals.`);

for(const key of ['marker','oldStagedDeploymentId','rollbackDeploymentId','authorizedBy','note','keyCreationReceipt','legalAidMigrationReceipt','recordedAt'])test(`restage refuses changed owner authority ${key}`,()=>{const c=clone();c.productionAuthorization.restage[key]='wrong';assert.throws(()=>requireProductionPhaseAuthorization(c,'restage'));});
test('restage is the only new phase; absent owner restage authority refuses',()=>{const c=clone();delete c.productionAuthorization.restage;assert.throws(()=>requireProductionPhaseAuthorization(c,'restage'));assert.throws(()=>requireProductionPhaseAuthorization(candidate,'activate'));assert.throws(()=>requireProductionPhaseAuthorization(candidate,'production_restage'));});

// These mutation fixtures are copies of captured native evidence, never live calls.
import {loadProductionRestageDocuments,validateProductionRestageDocuments,verifyProductionRestageEvidence,RESTAGE_EVIDENCE_FILES} from './verify-production-preflight-evidence.mjs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
const restageDocuments=loadProductionRestageDocuments(process.cwd());
test('exact successful restage receipt binds the replacement without changing historical preflight',()=>{
 assert.deepEqual(verifyProductionRestageEvidence(process.cwd()),BOUND_RESTAGE);
 assert.deepEqual(candidate.productionAuthorization.restage.successfulReceipt,BOUND_RESTAGE);
 assert.equal(documents.body.deployments.stagedProduction,candidate.productionAuthorization.restage.oldStagedDeploymentId);
 assert.notEqual(documents.body.deployments.stagedProduction,candidate.productionAuthorization.stagedDeploymentId);
 assert.equal(requireProductionDeploymentBinding(candidate,'smoke'),candidate.productionAuthorization);
});
for(const key of Object.keys(BOUND_RESTAGE))test(`smoke rejects substituted successful restage ${key}`,()=>{
 const c=clone();c.productionAuthorization.restage.successfulReceipt[key]='wrong';
 assert.throws(()=>requireProductionPhaseAuthorization(c,'smoke'),refusal);
 assert.throws(()=>requireProductionDeploymentBinding(c,'smoke'));
});
for(const [name,mutate] of [
 ['missing successful receipt',c=>delete c.productionAuthorization.restage.successfulReceipt],
 ['failed conclusion',c=>c.productionAuthorization.restage.successfulReceipt.conclusion='failure'],
 ['old staged target',c=>c.productionAuthorization.stagedDeploymentId=c.productionAuthorization.restage.oldStagedDeploymentId],
 ['arbitrary replacement in both locations',c=>{c.productionAuthorization.stagedDeploymentId='dpl_arbitrary';c.productionAuthorization.restage.successfulReceipt.replacementStagedDeploymentId='dpl_arbitrary';}],
])test(`smoke refuses ${name}`,()=>{const c=clone();mutate(c);assert.throws(()=>requireProductionPhaseAuthorization(c,'smoke'),refusal);assert.throws(()=>requireProductionDeploymentBinding(c,'smoke'));});
for(const [name,mutate]of [
 ['run ID',d=>d.run.id++],['tools',d=>d.run.head_sha='0'.repeat(40)],['conclusion',d=>d.run.conclusion='failure'],
 ['artifact ID',d=>d.artifact.id++],['artifact digest',d=>d.artifact.digest='sha256:'+'0'.repeat(64)],['artifact association',d=>d.artifact.workflow_run.id++],
 ...['replacementStagedDeploymentId','rollbackDeploymentId','applicationSha','workerSourceSha','workerDigest','productionProjectRef','oldStagedDeploymentId'].map(k=>[k,d=>d.body[k]='wrong']),
 ['failed receipt',d=>d.body.passed=false],['missing verdicts',d=>d.body.verdicts=[]],['failed verdict',d=>d.body.verdicts[0].passed=false],
 ['changed routing',d=>d.body.routingStateAfter[0].deploymentId='dpl_arbitrary'],['changed environment',d=>d.body.controlHashes.environmentAfter='0'.repeat(64)],
 ...['publicAliasesChanged','productionDatabaseMutated','workerChanged','migrationReplayed','keysCreated','environmentMetadataChanged'].map(k=>[k,d=>d.body[k]=true]),
])test(`native restage refuses ${name}`,()=>{const d=structuredClone(restageDocuments);mutate(d);assert.throws(()=>validateProductionRestageDocuments(d));});
test('missing or changed native receipt bytes refuse before the release gate can be current',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'restage-evidence-'));
 for(const rel of RESTAGE_EVIDENCE_FILES){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.copyFileSync(rel,path.join(root,rel));}
 assert.deepEqual(verifyProductionRestageEvidence(root),BOUND_RESTAGE);
 for(const rel of RESTAGE_EVIDENCE_FILES){const p=path.join(root,rel),b=fs.readFileSync(p);fs.appendFileSync(p,' ');assert.throws(()=>verifyProductionRestageEvidence(root),/native restage bytes/);fs.unlinkSync(p);assert.throws(()=>verifyProductionRestageEvidence(root));fs.writeFileSync(p,b);}
 fs.rmSync(root,{recursive:true});
});
test('real smoke target declarations consume the bound replacement and rollback; arbitrary input cannot override them',async()=>{
 const source=fs.readFileSync('scripts/rcap-production-canary-smoke.mjs','utf8');
 const start=source.indexOf('const APPLICATION_SHA ='),end=source.indexOf('const REQUIRED_MIGRATION_HASHES');
 const context={RELEASE_CANDIDATE:candidate};
 vm.runInNewContext(source.slice(start,end)+';globalThis.resolved={APPLICATION_SHA,WORKER_SOURCE_SHA,WORKER_DIGEST,STAGED_DEPLOYMENT_ID,ROLLBACK_DEPLOYMENT_ID};',context);
 assert.equal(context.resolved.STAGED_DEPLOYMENT_ID,BOUND_RESTAGE.replacementStagedDeploymentId);
 assert.equal(context.resolved.ROLLBACK_DEPLOYMENT_ID,BOUND_RESTAGE.rollbackDeploymentId);
 for(const [key,field]of [['APPLICATION_SHA','applicationSha'],['WORKER_SOURCE_SHA','workerSourceSha'],['WORKER_DIGEST','workerDigest']])assert.equal(context.resolved[key],BOUND_RESTAGE[field]);
 assert.ok(source.indexOf('requireProductionMigrationRelease(ROOT_DIR, process.env)')<source.indexOf('await resolveHostedVercelIdentity('),'full release gate precedes service calls');
 const calls=[];
 const boundary=source.slice(source.indexOf('  requireProductionMigrationRelease(ROOT_DIR, process.env);'),source.indexOf('  record(\n    "exact_staged_application_worker_identity"'));
 Object.assign(context,{ROOT_DIR:process.cwd(),process:{env:{RCAP_STAGED_DEPLOYMENT_ID:'dpl_arbitrary'}},VERCEL_TOKEN:'synthetic',
  requireProductionMigrationRelease:()=>{requireProductionPhaseAuthorization(candidate,'smoke');requireProductionDeploymentBinding(candidate,'smoke');calls.push('release-gate');},
  resolveHostedVercelIdentity:async()=>({projectId:'synthetic-project'}),hostedVercelScopedUrl:p=>p,
  getJson:async url=>{calls.push(url);return {status:200,json:{}};}});
 await vm.runInNewContext('(async()=>{'+boundary+'})()',context);
 assert.deepEqual(calls,['release-gate','/v9/projects/synthetic-project','/v13/deployments/'+BOUND_RESTAGE.replacementStagedDeploymentId,'/v13/deployments/'+BOUND_RESTAGE.rollbackDeploymentId,'/v9/projects/synthetic-project/domains?limit=100']);
 assert.equal(source.includes(candidate.productionAuthorization.restage.oldStagedDeploymentId),false);
 for(const phase of ['activate','public_verify','alias_move'])assert.throws(()=>requireProductionPhaseAuthorization(candidate,phase),refusal);
});

// Successful smoke is evidence, never a new owner-authorized phase.
import {loadProductionSmokeDocuments,validateProductionSmokeDocuments,verifyProductionSmokeEvidence,SMOKE_EVIDENCE_FILES} from './verify-production-preflight-evidence.mjs';
import {requireProductionMigrationRelease} from '../rcap-production-migration-contract.mjs';
const smokeDocuments=loadProductionSmokeDocuments(process.cwd());
test('native smoke archive and inner hash bind the exact successful tuple without activation authority',()=>{
 assert.deepEqual(verifyProductionSmokeEvidence(process.cwd()),BOUND_SMOKE);
 const a=candidate.productionAuthorization;
 assert.deepEqual(a.smokeReceipt,BOUND_SMOKE);assert.equal(a.smokeRunId,36779982696);
 assert.equal(a.smokeArtifactSha256,'4e18b47b2c45f06a241d1565fb5b43a45354330184f0d7a9f2ac81ec10d34bf6');
 assert.notEqual(a.smokeArtifactSha256,a.smokeReceipt.artifactZipSha256.slice(7));
 const prior=JSON.parse(execFileSync('git',['show',`eb5099862b664d82449ee20e90798fe9fc275a26:${prefix}RELEASE_CANDIDATE_BINDING.json`],{encoding:'utf8'}));
 assert.deepEqual(candidate,{...prior,productionAuthorization:{...prior.productionAuthorization,smokeRunId:BOUND_SMOKE.runId,smokeArtifactSha256:BOUND_SMOKE.smokeArtifactSha256,smokeReceipt:{...BOUND_SMOKE}}});
 assert.deepEqual(a.phases,prior.productionAuthorization.phases);
 assert.equal(Object.hasOwn(a,'activationReceipt'),false);
 assert.throws(()=>requireProductionPhaseAuthorization(candidate,'activate'),refusal);
});
for(const key of Object.keys(BOUND_SMOKE))test(`smoke evidence binding refuses receipt substitution: ${key}`,()=>{
 const c=clone();c.productionAuthorization.smokeReceipt[key]='wrong';
 assert.throws(()=>assertPreactivationAuthorization(c));
 assert.throws(()=>requireProductionPhaseAuthorization(c,'smoke'),refusal);
});
for(const [name,mutate]of [
 ['wrong smoke run',c=>c.productionAuthorization.smokeRunId++],
 ['wrong inner hash',c=>c.productionAuthorization.smokeArtifactSha256='0'.repeat(64)],
 ['ZIP hash used as inner hash',c=>c.productionAuthorization.smokeArtifactSha256=BOUND_SMOKE.artifactZipSha256.slice(7)],
 ...['smokeRunId','smokeArtifactSha256','smokeReceipt'].map(k=>['missing '+k,c=>delete c.productionAuthorization[k]]),
 ['failed conclusion',c=>c.productionAuthorization.smokeReceipt.conclusion='failure'],
 ['activation appended',c=>c.productionAuthorization.phases.push('activate')],
 ['activation substituted',c=>c.productionAuthorization.phases=['activate']],
 ['invented activation receipt',c=>c.productionAuthorization.activationReceipt={passed:true}],
])test(`evidence-only authority refuses ${name}`,()=>{const c=clone();mutate(c);assert.throws(()=>assertPreactivationAuthorization(c));assert.throws(()=>requireProductionPhaseAuthorization(c,'activate'),refusal);});
for(const [name,mutate]of [
 ['run ID',d=>d.run.id++],['attempt',d=>d.run.run_attempt++],['tools SHA',d=>d.run.head_sha='0'.repeat(40)],['failed run',d=>d.run.conclusion='failure'],
 ['wrong phase',d=>d.run.display_title=d.run.display_title.replace('production_smoke','production_activate')],
 ['artifact ID',d=>d.artifact.id++],['artifact name',d=>d.artifact.name+='-wrong'],['ZIP digest',d=>d.artifact.digest='sha256:'+'0'.repeat(64)],['artifact association',d=>d.artifact.workflow_run.id++],
 ['missing jobs',d=>d.jobs.jobs.pop()],['failed smoke step',d=>d.jobs.jobs.find(j=>j.conclusion==='success').steps.find(s=>s.number===23).conclusion='failure'],
 ['activation ran',d=>d.jobs.jobs.find(j=>j.conclusion==='success').steps.find(s=>s.number===25).conclusion='success'],
 ...['applicationSha','workerSourceSha','workerDigest','productionProjectRef','stagedDeploymentId','rollbackDeploymentId'].map(k=>[k,d=>d.body[k]='wrong']),
 ['passed false',d=>d.body.passed=false],['missing receipt',d=>delete d.body],['missing verdicts',d=>d.body.verdicts=[]],['failed verdict',d=>d.body.verdicts[0].passed=false],
 ['missing rollback',d=>d.body.transactionalFixtureRolledBack=false],
 ...['realParticipantRecordsCreated','realChargesCreated','checkoutCreated','workerRun','deploymentTriggered','aliasChanged','environmentVariableChanged','productionDatabasePersistentlyMutated'].map(k=>[k,d=>d.body[k]=true]),
 ...['resetPrepared','resetRecoveryCookieIssued','resetCloseSuccess','resetRevocationConfirmed','resetSignOutConfirmed','resetClearSiteDataStorage','resetClinicCookiesCleared','resetCompleteSuccess','resetRecoveryRetired'].map(k=>[k,d=>d.body[k]=false]),
])test(`native smoke semantic mutation refuses ${name}`,()=>{const d=structuredClone(smokeDocuments);mutate(d);assert.throws(()=>validateProductionSmokeDocuments(d));});
test('each missing or modified native smoke file refuses; originals restore the positive path',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'smoke-evidence-binding-'));
 try{
  for(const rel of SMOKE_EVIDENCE_FILES){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.copyFileSync(rel,path.join(root,rel));}
  assert.deepEqual(verifyProductionSmokeEvidence(root),BOUND_SMOKE);
  for(const rel of SMOKE_EVIDENCE_FILES){const p=path.join(root,rel),b=fs.readFileSync(p);fs.appendFileSync(p,' ');assert.throws(()=>verifyProductionSmokeEvidence(root),/native smoke bytes/);fs.unlinkSync(p);assert.throws(()=>verifyProductionSmokeEvidence(root));fs.writeFileSync(p,b);}
  assert.deepEqual(verifyProductionSmokeEvidence(root),BOUND_SMOKE);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('existing workflow data flow selects exact smoke run/name, and the real local release guard accepts only the dedicated decision',async()=>{
 const {parse}=await import('yaml');
 const source=fs.readFileSync('scripts/rcap-production-migration-contract.mjs','utf8');
 const start=source.indexOf('    if (process.env.GITHUB_ENV)'),end=source.indexOf("    console.log('Production release tuple",start);
 assert.ok(start>=0&&end>start);
 const writes=[];
 // Evaluate only the existing value-export fragment, never its authorization
 // gate or an activation entrypoint. The real gate is tested separately below.
 vm.runInNewContext(source.slice(start,end),{candidate,process:{env:{GITHUB_ENV:'mock-only',RCAP_PRODUCTION_PHASE:'activate'}},fs:{appendFileSync:(_p,value)=>writes.push(value)}});
 const environment=Object.fromEntries(writes.join('').trim().split('\n').map(line=>line.split('=')));
 assert.equal(environment.PRODUCTION_SMOKE_RUN_ID,'36779982696');
 const workflow=parse(fs.readFileSync('.github/workflows/rcap-production-canary.yml','utf8'));
 const steps=workflow.jobs.preflight.steps,download=steps.find(s=>s.name==='Download the exact successful Production smoke evidence');
 assert.equal(download.uses,'actions/download-artifact@v4');assert.equal(download.if,"inputs.phase == 'activate'");
 const resolve=value=>value.replaceAll('${{ env.PRODUCTION_SMOKE_RUN_ID }}',environment.PRODUCTION_SMOKE_RUN_ID);
 assert.equal(resolve(download.with.name),'rcap-production-smoke-36779982696');assert.equal(resolve(download.with['run-id']),'36779982696');assert.equal(download.with.path,'${{ runner.temp }}/rcap-production-smoke-${{ env.PRODUCTION_SMOKE_RUN_ID }}');
 const activation=steps.find(s=>s.name==='Activate the exact staged Production deployment with rollback protection');
 assert.equal(activation.env.RCAP_PRODUCTION_SMOKE_EVIDENCE_FILE,download.with.path+'/production-canary-smoke.json');
 assert.ok(steps.findIndex(s=>s.run?.includes('node scripts/rcap-production-migration-contract.mjs'))<steps.indexOf(download));
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 assert.deepEqual(requireProductionMigrationRelease(process.cwd(),{RCAP_PRODUCTION_PHASE:'activate',RCAP_APPLICATION_SHA:candidate.applicationSha,RCAP_WORKER_SOURCE_SHA:candidate.workerSourceSha,RCAP_WORKER_DIGEST:candidate.workerDigest,RCAP_PRODUCTION_PROJECT_REF:candidate.productionProjectRef,RCAP_TOOLS_SHA:head,GITHUB_SHA:head}),authorizedCandidate);
});
test('actual activation declarations and pure smoke predicate consume exact inner bytes; substitutions refuse',()=>{
 const source=fs.readFileSync('scripts/rcap-production-activate.mjs','utf8');
 const inner=execFileSync('python3',['-c',"import sys,zipfile; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read('production-canary-smoke.json'))",SMOKE_EVIDENCE_FILES[3]],{encoding:'utf8'});
 const declarations=source.slice(source.indexOf('const APPLICATION_SHA ='),source.indexOf('const SMOKE_FILE ='));
 const migrations=source.slice(source.indexOf('const REQUIRED_MIGRATION_HASHES ='),source.indexOf('const REQUIRED_TABLES ='));
 const predicate=source.slice(source.indexOf('  const smokeExact ='),source.indexOf('\n  record(',source.indexOf('  const smokeExact =')));
 assert.ok(declarations&&migrations&&predicate);
 const sha256=value=>createHash('sha256').update(value).digest('hex');
 function run(c=candidate,text=inner){const context={RELEASE_CANDIDATE:c,smokeText:text,smoke:JSON.parse(text),sha256};
  vm.runInNewContext(declarations+migrations+predicate+';globalThis.result={smokeExact,SMOKE_RUN_ID,STAGED_DEPLOYMENT_ID,ROLLBACK_DEPLOYMENT_ID,APPLICATION_SHA,WORKER_SOURCE_SHA,WORKER_DIGEST};',context);return context.result;}
 const result=run();assert.equal(result.smokeExact,true);assert.equal(result.SMOKE_RUN_ID,36779982696);
 for(const [symbol,key]of [['STAGED_DEPLOYMENT_ID','stagedDeploymentId'],['ROLLBACK_DEPLOYMENT_ID','rollbackDeploymentId'],['APPLICATION_SHA','applicationSha'],['WORKER_SOURCE_SHA','workerSourceSha'],['WORKER_DIGEST','workerDigest']])assert.equal(result[symbol],BOUND_SMOKE[key]);
 for(const key of ['applicationSha','workerSourceSha','workerDigest']){const c=clone();c[key]='wrong';assert.equal(run(c).smokeExact,false);}
 for(const key of ['stagedDeploymentId','rollbackDeploymentId','smokeArtifactSha256']){const c=clone();c.productionAuthorization[key]='wrong';assert.equal(run(c).smokeExact,false);}
 const zipHash=clone();zipHash.productionAuthorization.smokeArtifactSha256=BOUND_SMOKE.artifactZipSha256.slice(7);assert.equal(run(zipHash).smokeExact,false);
 assert.equal(run(candidate,inner+' ').smokeExact,false,'even semantic-equivalent byte substitution refuses');
 const failed=JSON.parse(inner);failed.passed=false;
 const c=clone(),text=JSON.stringify(failed);c.productionAuthorization.smokeArtifactSha256=sha256(text);
 assert.equal(run(c,text).smokeExact,false,'failed receipt cannot pass even with a matching substituted hash');
 assert.ok(source.indexOf('requireProductionMigrationRelease(ROOT_DIR, process.env);')<source.indexOf('const smokeText ='));
 assert.ok(source.indexOf('const smokeExact =')<source.indexOf('identity = await resolveHostedVercelIdentity('));
});

// Current owner decision is tested through the same gate used by the runtime.
const ownerText = 'I authorize exactly one `production_activate` for the frozen LegalEase Grade A release: application `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`, worker source `5e04eafd7eaed7e71722862e651fb787ebbd296d`, worker digest `sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1`, staged deployment `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`, rollback deployment `dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK`, and successful smoke run `36779982696`. This authorization permits the Production promotion/public-domain movement required by `production_activate` and the existing automatic rollback control if post-promotion verification fails. It does not authorize a rebuild, new deployment, migration, key creation, worker redeployment, Stripe/live order, save-transition live probe, or any other live customer transaction. Stop after activation evidence is collected.';
test('activation: exact owner text, timestamp, tuple and one attempt; historical authority and receipts preserved',()=>{
 const a=authorizedCandidate.productionAuthorization;
 assert.equal(a.activation.note,ownerText);assert.equal(ACTIVATION_NOTE,ownerText);
 assert.equal(a.activation.authorizedBy,'Roger Roman');
 assert.equal(a.activation.recordedAt,'2026-09-30T22:13:20.060Z');
 assert.equal(a.activation.maxAttempts,1);assert.equal(a.activation.state,'authorized_not_executed');
 assert.equal(assertActivationAuthorization(authorizedCandidate),a.activation);
 assert.equal(requireProductionPhaseAuthorization(authorizedCandidate,'activate'),a);
 assert.equal(requireProductionDeploymentBinding(authorizedCandidate,'activate'),a);
 const historical=structuredClone(authorizedCandidate);delete historical.productionAuthorization.activation;
 historical.status=candidate.status;historical.scope=candidate.scope;
 assert.deepEqual(historical,candidate,'only dedicated decision and current status/scope changed');
 for(const record of [authorizedCandidate,a,a.activation])assert.equal(Object.hasOwn(record,'activationReceipt'),false);
 const tools=JSON.parse(fs.readFileSync(prefix+'HOSTED_TOOLS_BINDING.json'));
 for(const key of ['deploymentAuthorized','migrationReplayAuthorized','additionalWorkerPublicationAuthorized'])assert.equal(tools[key],false);
});
for(const phase of required)test(`activation: prior ${phase} authority retains its meaning`,()=>{
 assert.equal(requireProductionPhaseAuthorization(authorizedCandidate,phase),authorizedCandidate.productionAuthorization);
});
for(const phase of denied.filter(p=>p!=='activate'))test(`activation: unrelated ${phase} still refuses`,()=>{
 assert.throws(()=>requireProductionPhaseAuthorization(authorizedCandidate,phase),refusal);
 const c=structuredClone(authorizedCandidate);c.productionAuthorization.phases.push(phase);
 assert.throws(()=>requireProductionPhaseAuthorization(c,phase),refusal);
});
const activationMutations=[
 ['absent decision',c=>delete c.productionAuthorization.activation],
 ['generic activate membership only',c=>{delete c.productionAuthorization.activation;c.productionAuthorization.phases.push('activate');}],
 ['generic flags only',c=>{delete c.productionAuthorization.activation;c.productionAuthorized=true;c.deploymentAuthorized=true;}],
 ...Object.keys(authorizedCandidate.productionAuthorization.activation).map(key=>[`decision ${key}`,c=>c.productionAuthorization.activation[key]='wrong']),
 ['missing timestamp',c=>delete c.productionAuthorization.activation.recordedAt],
 ...['invalid','2026-02-30T00:00:00.000Z','2999-01-01T00:00:00.000Z','2026-09-30T21:47:49.999Z'].map(value=>[`timestamp ${value}`,c=>c.productionAuthorization.activation.recordedAt=value]),
 ['missing successful smoke',c=>delete c.productionAuthorization.smokeReceipt],
 ['failed smoke',c=>c.productionAuthorization.smokeReceipt.conclusion='failure'],
 ['passed=false smoke',c=>c.productionAuthorization.smokeReceipt.passed=false],
 ...Object.keys(BOUND_SMOKE).map(key=>[`successful smoke ${key}`,c=>c.productionAuthorization.smokeReceipt[key]='wrong']),
 ...['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'].map(key=>[`candidate ${key}`,c=>c[key]='wrong']),
 ...['stagedDeploymentId','rollbackDeploymentId','smokeRunId','smokeArtifactSha256'].map(key=>[`outer ${key}`,c=>c.productionAuthorization[key]='wrong']),
 ['extra live customer authority',c=>c.productionAuthorization.liveCustomerTransactionsAuthorized=true],
 ['extra decision permission',c=>c.productionAuthorization.activation.permittedActions.push('public_verify')],
 ['reusable decision',c=>c.productionAuthorization.activation.maxAttempts=2],
 ...['candidate','authorization','decision'].map(location=>[`invented activation receipt ${location}`,c=>(location==='candidate'?c:location==='authorization'?c.productionAuthorization:c.productionAuthorization.activation).activationReceipt={passed:true}]),
];
for(const [name,mutate]of activationMutations)test(`activation mutation refuses ${name}`,()=>{
 const c=structuredClone(authorizedCandidate);mutate(c);
 assert.throws(()=>requireProductionPhaseAuthorization(c,'activate'),refusal);
});
