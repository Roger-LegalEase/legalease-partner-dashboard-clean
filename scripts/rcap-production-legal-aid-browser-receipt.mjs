import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const PROJECT = 'hyflxnlhpmiqxvvcoiia';
const DIGEST = 'fad3384b88249d8cd2411089867b2971c97f66b258269e5958f7a12c29be45db';
const SHA = bytes => createHash('sha256').update(bytes).digest('hex');
export function extractReceiptZip(bytes, files) {
  assert.ok(bytes.length < 64 * 1024 * 1024, 'receipt ZIP too large');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-native-receipt-'));
  try {
  const zipPath = path.join(temporary, 'artifact.zip'); fs.writeFileSync(zipPath, bytes, { mode: 0o600 });
  return JSON.parse(execFileSync('python3', ['-c', `import sys,zipfile,json
z=zipfile.ZipFile(sys.argv[2])
files=json.loads(sys.argv[1]); result={}
for name in files:
 matches=[i for i in z.infolist() if i.filename==name]
 assert len(matches)==1 and matches[0].file_size<8000000, 'missing, duplicate, or oversized receipt'
 result[name]=json.loads(z.read(matches[0]))
print(json.dumps(result))`, JSON.stringify(files), zipPath], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 30000, maxBuffer: 40 * 1024 * 1024 }));
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}
export function verifyBrowserRecords(records, candidate) {
  const preview = candidate.hostedAcceptance.preview;
  const browser = records['legal-aid/browser.json'], seed = records['legal-aid/seed.json'];
  for (const [record, schema] of [[browser, 'rcap-hosted-legal-aid-browser/v1'], [seed, 'rcap-hosted-legal-aid-seed/v1']]) {
    assert.equal(record?.schemaVersion, schema); assert.equal(record.passed, true);
    assert.equal(record.applicationSha, candidate.applicationSha); assert.equal(record.acceptanceProjectRef, PROJECT);
    assert.equal(record.previewDeploymentId, preview.deploymentId); assert.equal(record.previewUrl, `https://${preview.hostname}`);
  }
  assert.equal(seed.passwordsRecorded, false);
  for (const key of ['workerRun', 'migrationApplied', 'checkoutCreated', 'paymentCompleted', 'productionTouched', 'stripeTouched', 'secretsRecorded', 'protectedValueRecorded']) assert.equal(browser[key], false, key);
  assert.ok(Object.keys(browser.cases ?? {}).length > 0 && Object.values(browser.cases).every(row => row.passed === true), 'browser cases must all pass');
  for (const mode of ['prerequisite', 'preservation', 'relationships']) {
    const record = records[`legal-aid/${mode}.json`];
    assert.equal(record?.status, 'PASS'); assert.equal(record.boundary, mode); assert.equal(record.native?.result, 'PASS');
    assert.equal(record.applicationSha, candidate.applicationSha); assert.equal(record.project, PROJECT);
    assert.equal(record.deploymentId, preview.deploymentId); assert.equal(record.hostname, preview.hostname);
  }
}
// The historical filename is retained. No hosted browser success is asserted:
// this gate combines frozen schema evidence with reviewed local contracts.
import { applicationInputEquivalence } from './rcap-application-inputs.mjs';
import { requireProductionMigrationRelease, requireProductionPhaseAuthorization } from './rcap-production-migration-contract.mjs';
import { LEGAL_AID_MIGRATION, frozenMigrationSql } from './rcap-legal-aid/contract.mjs';
export const REVIEWED_BEHAVIOR_BASE = '80e014d35c6af4dcfd57957013781483bb4ffb52';
export const PRODUCTION_PROOF_STATUS = 'authorized_on_unchanged_application_and_reviewed_behavior';
export const PRODUCTION_PROOF_TUPLE = Object.freeze({
  applicationSha:'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226',
  workerSourceSha:'5e04eafd7eaed7e71722862e651fb787ebbd296d',
  workerDigest:'sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1',
  workerInputFingerprint:'sha256:90a1e89e306cb5fc23631c63c15c12a44d955d745bbe04aada0716af2805daab',
  productionProjectRef:'wwtwtsmywnckfkdaqqeg'
});
export const LOCAL_BEHAVIOR_COMMANDS = Object.freeze([
  ['--test','scripts/rcap-hosted-legal-aid-actions.test.mjs'],
  ['--test','scripts/rcap-hosted-legal-aid-startup.test.mjs'],
  ['--test','scripts/rcap-hosted-legal-aid-captcha.test.mjs'],
  ['--test','scripts/rcap-hosted-integration-contract.test.mjs'],
  ['--test','scripts/legal-aid/applicant-a-prerequisite.test.mjs'],
  ['scripts/verify-rcap-hosted-legal-aid-browser.mjs'],
  ['--test','scripts/rcap-production-legal-aid-browser-receipt.test.mjs']
]);
export const REVIEWED_BEHAVIOR_FILES = Object.freeze([
 'scripts/rcap-hosted-legal-aid-browser.mjs','scripts/rcap-hosted-legal-aid-seed.mjs',
 'scripts/rcap-legal-aid/hosted-fixture.mjs','scripts/rcap-legal-aid/hosted-actions.mjs',
 'scripts/rcap-hosted-legal-aid-prerequisite.mjs','scripts/legal-aid/verify-applicant-a-prerequisite.mjs',
 'scripts/rcap-clinic-resume-contract.mjs','scripts/rcap-hosted-legal-aid-actions.test.mjs',
 'scripts/rcap-hosted-legal-aid-startup.test.mjs','scripts/rcap-hosted-legal-aid-captcha.test.mjs',
 'scripts/rcap-hosted-integration-contract.test.mjs','scripts/legal-aid/applicant-a-prerequisite.test.mjs',
 'scripts/verify-rcap-hosted-legal-aid-browser.mjs'
]);
const gitAt = root => args => { const output=execFileSync('git',args,{cwd:root,encoding:args[0]==='show'?undefined:'utf8',maxBuffer:32*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'}});return args[0]==='show'?output:output.trimEnd(); };
export function verifyReviewedLegalAidBehavior(rootDir, git=gitAt(rootDir), read=rel=>fs.readFileSync(path.join(rootDir,rel))) {
  git(['merge-base','--is-ancestor',REVIEWED_BEHAVIOR_BASE,'HEAD']);
  assert.equal(git(['rev-list','--parents','-n','1',REVIEWED_BEHAVIOR_BASE]),`${REVIEWED_BEHAVIOR_BASE} 721530ba23f65b5fadd6e72ce83acd87e2d3b2d7`,'reviewed behavior lineage');
  for(const rel of REVIEWED_BEHAVIOR_FILES) {
    // Preserve complete file bytes, including trailing newlines.
    let expected=git(['show',`${REVIEWED_BEHAVIOR_BASE}:${rel}`]);
    if(rel==='scripts/rcap-hosted-legal-aid-actions.test.mjs') {
      expected=expected.toString('utf8');
      const old='const binding=JSON.parse(fs.readFileSync(toolsPath));';
      assert.equal(expected.split(old).length,2,'one authorized historical fixture adjustment');
      expected=expected.replace(old,"const binding=JSON.parse(execFileSync('git',['show',`80e014d35c6af4dcfd57957013781483bb4ffb52:${toolsPath}`],{encoding:'utf8'}));");
    }
    assert.deepEqual(Buffer.from(read(rel)),Buffer.from(expected),`reviewed behavior drift: ${rel}`);
  }
  return {baseSha:REVIEWED_BEHAVIOR_BASE,files:REVIEWED_BEHAVIOR_FILES.length,historicalFixtureAdjustmentOnly:true};
}
export function runProductionLegalAidBehaviorProof({rootDir=process.cwd(),run=execFileSync}={}) {
  // Credentials and hosted execution inputs are not inherited by local proofs.
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG','SystemRoot'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  Object.assign(env,{GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'});
  const commands=[];
  for(const args of LOCAL_BEHAVIOR_COMMANDS) {
    run(process.execPath,args,{cwd:rootDir,env,stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:16*1024*1024});
    commands.push({command:args.join(' '),passed:true});
  }
  return {passed:true,commands};
}
export async function verifyProductionLegalAidProof({env=process.env,rootDir=process.cwd(),authorization,candidate,behaviorProof,
  git=gitAt(rootDir),equivalence=applicationInputEquivalence,requireRelease=requireProductionMigrationRelease,
  reviewed=verifyReviewedLegalAidBehavior}={}) {
  assert.equal(authorization.status,PRODUCTION_PROOF_STATUS,'owner authorization status');
  assert.equal(authorization.authorizedBy,'Roger Roman','owner authorization');
  assert.equal(authorization.dropAuthorized,false,'drop authorization forbidden');
  assert.equal(authorization.productionProjectRef,PRODUCTION_PROOF_TUPLE.productionProjectRef,'Production project');
  assert.equal(authorization.reviewedBehaviorBaseSha,REVIEWED_BEHAVIOR_BASE,'reviewed behavior base');
  const timestamp=Date.parse(authorization.recordedAt);
  assert.ok(Number.isFinite(timestamp)&&timestamp<=Date.now()&&timestamp>=Date.parse('2026-09-30T00:00:00Z'),'current owner decision timestamp');
  assert.deepEqual(authorization.releaseTuple,PRODUCTION_PROOF_TUPLE,'owner exact release tuple');
  for(const [key,value]of Object.entries(PRODUCTION_PROOF_TUPLE))assert.equal(candidate[key],value,`exact release tuple ${key}`);
  assert.equal(env.RCAP_PRODUCTION_PHASE,'legal_aid_migrate','exact authorized phase');
  assert.deepEqual(requireRelease(rootDir,env),candidate,'current release/tools binding');
  requireProductionPhaseAuthorization(candidate,'legal_aid_migrate');
  assert.equal(git(['rev-parse','HEAD']),env.RCAP_TOOLS_SHA,'exact checked-out tools');
  assert.equal(git(['diff','--name-only','HEAD']),'','clean current tools bytes');
  const application=equivalence(rootDir,PRODUCTION_PROOF_TUPLE.applicationSha,env.RCAP_TOOLS_SHA);
  assert.equal(application.equivalent,true,'canonical application equivalence');
  assert.deepEqual(application.changedPaths,[],'no changed application inputs');
  assert.equal(application.comparedInputs,10285,'canonical application input count');
  const behavior=reviewed(rootDir);
  assert.equal(behaviorProof?.passed,true,'required local behavior proof');
  assert.deepEqual(behaviorProof.commands,LOCAL_BEHAVIOR_COMMANDS.map(args=>({command:args.join(' '),passed:true})),'every deterministic local behavior command passed');
  assert.deepEqual(authorization.migration,LEGAL_AID_MIGRATION,'frozen migration authority');
  const source=execFileSync('git',['show',`${LEGAL_AID_MIGRATION.sourceSha}:${LEGAL_AID_MIGRATION.path}`],{cwd:rootDir,maxBuffer:8*1024*1024});
  assert.equal(SHA(source),LEGAL_AID_MIGRATION.sha256,'frozen source migration hash');
  assert.equal(SHA(frozenMigrationSql(rootDir,PRODUCTION_PROOF_TUPLE.applicationSha)),LEGAL_AID_MIGRATION.sha256,'application frozen migration hash');
  const migration=authorization.hostedAcceptance.migration;
  assert.deepEqual(migration,{runId:'35114154196',artifactId:'10453896397',artifactZipSha256:'sha256:'+DIGEST},'Acceptance migration receipt');
  assert.equal(authorization.hostedAcceptance.legalAidMigrateRunId,migration.runId);
  assert.equal(authorization.hostedAcceptance.browserRunId,null,'no hosted browser success claimed');
  const bytes=fs.readFileSync(path.join(rootDir,'scripts/fixtures/production-legal-aid-browser-gate/10453896397.zip'));
  assert.equal(SHA(bytes),DIGEST,'committed Acceptance migration ZIP');
  const receipt=extractReceiptZip(bytes,['legal-aid-migrate.json'])['legal-aid-migrate.json'];
  assert.equal(receipt.passed,true);assert.equal(receipt.acceptanceProjectRef,PROJECT);
  assert.equal(receipt.productionTouched,false);assert.equal(receipt.readbackAfter?.complete,true);
  assert.deepEqual(receipt.exactMigration,LEGAL_AID_MIGRATION);
  return {status:PRODUCTION_PROOF_STATUS,toolsSha:env.RCAP_TOOLS_SHA,releaseTuple:PRODUCTION_PROOF_TUPLE,application,behavior,
    localBehavior:behaviorProof,acceptanceMigration: migration,hostedBrowserSuccessClaimed:false,verifiedAt:new Date().toISOString()};
}
