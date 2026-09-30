import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PREACTIVATION_BASE,PREACTIVATION_STATUS,PREACTIVATION_PHASES,BOUND_PREFLIGHT,assertPreactivationAuthorization,requireProductionPhaseAuthorization} from './production-preflight-authorization.mjs';
import {PREFLIGHT_EVIDENCE_FILES,loadProductionPreflightDocuments,validateProductionPreflightDocuments,verifyProductionPreflightEvidence} from './verify-production-preflight-evidence.mjs';
import {HOSTED_EVIDENCE_FILES} from './verify-hosted-acceptance-evidence.mjs';
import {requireProductionDeploymentBinding} from '../rcap-production-migration-contract.mjs';
const prefix='data/rcap-grade-a/launch-control/';
const candidate=JSON.parse(fs.readFileSync(prefix+'RELEASE_CANDIDATE_BINDING.json'));
const clone=()=>structuredClone(candidate);
const refusal={message:'production_phase_not_authorized_for_current_release'};
const required=['preflight','clinic_migrate','forward_chain_readback','forward_chain_migrate','legal_aid_keys_read','legal_aid_keys_create','legal_aid_readback','legal_aid_migrate','production_worker_deploy','smoke'];
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
 assert.deepEqual(fs.readFileSync(prefix+'RELEASE_CANDIDATE_BINDING.json'),execFileSync('git',['show',`80e014d35c6af4dcfd57957013781483bb4ffb52:${prefix}RELEASE_CANDIDATE_BINDING.json`]));
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
