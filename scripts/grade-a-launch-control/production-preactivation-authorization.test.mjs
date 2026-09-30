import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PREACTIVATION_BASE,PREACTIVATION_STATUS,PREACTIVATION_PHASES,BOUND_PREFLIGHT,BOUND_RESTAGE,STAGED_DEPLOYMENT,PREACTIVATION_NOTE,assertPreactivationAuthorization,requireProductionPhaseAuthorization} from './production-preflight-authorization.mjs';
import {PREFLIGHT_EVIDENCE_FILES,loadProductionPreflightDocuments,validateProductionPreflightDocuments,verifyProductionPreflightEvidence} from './verify-production-preflight-evidence.mjs';
import {HOSTED_EVIDENCE_FILES} from './verify-hosted-acceptance-evidence.mjs';
import {requireProductionDeploymentBinding} from '../rcap-production-migration-contract.mjs';
const prefix='data/rcap-grade-a/launch-control/';
const candidate=JSON.parse(fs.readFileSync(prefix+'RELEASE_CANDIDATE_BINDING.json'));
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
 for(const rel of [...HOSTED_EVIDENCE_FILES,'scripts/rcap-production-clinic-migrate.mjs','scripts/rcap-production-canary-smoke.mjs']) {
  assert.deepEqual(fs.readFileSync(rel),execFileSync('git',['show',`${PREACTIVATION_BASE}:${rel}`],{maxBuffer:32*1024*1024}));
 }
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
 assert.deepEqual(candidate,{...priorCandidate,productionAuthorization:{...priorCandidate.productionAuthorization,phases:[...priorCandidate.productionAuthorization.phases,'restage'],note:PREACTIVATION_NOTE,stagedDeploymentId:STAGED_DEPLOYMENT,restage:candidate.productionAuthorization.restage}});
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
