import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {additiveOtherFamilyRegistry, assessDeReviewedGuidance} from '../../grade-a-packet-factory-24h/de-reviewed-guidance.mjs';

// Independent reviewer controls; no installed input or shared queue is written.
const out = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/md-independent-review';
const implementation = 'scripts/grade-a-packet-factory-24h/de-reviewed-guidance.mjs';
const registry = 'data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json';
const notePath = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/ut-me-source-adoption.json';
const familyId = 'de_mandatory_expungement-set';
const oldCommit = 'c6af0d84134216c5d0757e5543ccf3fcaa42f19c';
const read = p => fs.readFileSync(p);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const identity = p => ({path:p, sha256:sha(read(p)), bytes:read(p).length});
const oldBytes = execFileSync('git', ['show', `${oldCommit}:${registry}`]);
const currentBytes = read(registry);
const old = JSON.parse(oldBytes), current = JSON.parse(currentBytes);
const returned = JSON.parse(read('data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json')).rows
  .find(r => r.familyId === familyId && !r.superseded);
const cases = [];
const check = (name, fn) => {const measured = fn();cases.push({name,result:'PASS',...measured});};
const encode = x => Buffer.from(JSON.stringify(x));
const corrupt = b => {const x=Buffer.from(b);x[x.length-1]^=1;return x;};

let baseline;
check('actual installed admission with actual disk raster validator and original independent review', () => {
  baseline = assessDeReviewedGuidance(process.cwd(), returned);
  assert.equal(baseline?.eligible, true, baseline?.reason);
  assert.equal(baseline.terminalTreatment, 'GUIDANCE_READY');
  assert.equal(baseline.sourceChecks.length, 9);
  const registryProof=baseline.sourceChecks.find(s=>s.path===registry);
  assert.equal(registryProof.unchangedPriorFamilyEntries, 73);
  assert.equal(registryProof.custodyChecks.length, 3);
  for(const flag of ['reviewAuthoredByIntegrator','packetBytesChanged','runtimeInstalled','filingPermitted','paymentEligible','sponsorshipEligible'])assert.equal(baseline[flag],false);
  return {mockedInputs:false, overridesUsed:false, measuredCustodySources:3, originalWholePdfs:2, originalWholePages:6};
});
check('previous exact-prefix validator rejects the otherwise unchanged installed registry', () => {
  const source=execFileSync('git',['show',`81ab23f8f4c56490b411255964179f37669ea2dd:${implementation}`],{encoding:'utf8'});
  const body=source.slice(source.indexOf('export function additiveOtherFamilyRegistry'),source.indexOf('export function assessDeReviewedGuidance'))
    .replace('export function','function');
  const prior=new Function('assert','sha',`${body}; return additiveOtherFamilyRegistry;`)(assert,sha);
  assert.throws(()=>prior(oldBytes,currentBytes,familyId));
  return {priorImplementationCommit:'81ab23f8f4c56490b411255964179f37669ea2dd',expectedOutcome:'reject new custody path'};
});

// Reviewer-discovered bypass: the appended NC row names the exact custody note.
// Preserve all 73 old rows, all old paths, and all unrelated top-level data.
const alias=structuredClone(current);
const appended=alias.reconciliation42.families.slice(old.reconciliation42.families.length);
assert.equal(appended.length,1);
assert.equal(appended[0].familyId,'nc_146_dismissal_petition-set');
const formerPath=appended[0].evidencePath;
appended[0].evidencePath=notePath;
alias.reconciliation42.acquisitionEvidencePaths=alias.reconciliation42.acquisitionEvidencePaths.filter(p=>p!==formerPath);
check('reviewer bypass reproduction now authenticates custody note before generic family shortcut', () => {
  const reads=[];
  assert.throws(()=>additiveOtherFamilyRegistry(oldBytes,encode(alias),familyId,p=>{
    reads.push(p);return p===notePath?corrupt(read(p)):read(p);
  }),/custody evidence changed/);
  assert.deepEqual(reads,[notePath]);
  return {sameLengthCorruptedNoteRejected:true, noteReadBeforeRefusal:true, reads};
});
check('legitimate appended-row alias still authenticates note and all three held originals', () => {
  const reads=[];
  const result=additiveOtherFamilyRegistry(oldBytes,encode(alias),familyId,p=>{reads.push(p);return read(p);});
  assert.equal(result.custodyChecks.length,3);
  assert.deepEqual(reads,[notePath,...JSON.parse(read(notePath)).documents.map(d=>d.heldCorpusPath)]);
  return {authenticatedFiles:reads, unchangedPriorFamilyEntries:result.unchangedPriorFamilyEntries};
});
check('missing custody reader cannot accept aliased custody note',()=>{
  assert.throws(()=>additiveOtherFamilyRegistry(oldBytes,encode(alias),familyId),/unmeasured custody/);
  return {expectedOutcome:'rejected'};
});
for(const d of JSON.parse(read(notePath)).documents)check(`same-length source corruption refused: ${d.itemId}`,()=>{
  const result=assessDeReviewedGuidance(process.cwd(),returned,{readBytes:p=>p===d.heldCorpusPath?corrupt(read(p)):read(p)});
  assert.equal(result.eligible,false);
  assert.match(result.reason,/held custody bytes changed/);
  return {sourcePath:d.heldCorpusPath, byteLengthPreserved:true, expectedOutcome:'rejected'};
});
for(const [name,mutate] of [
  ['historical family semantic edit',d=>d.reconciliation42.families[0].decision='reviewer negative control'],
  ['historical evidence order change',d=>{const p=d.reconciliation42.acquisitionEvidencePaths;
    const i=p.indexOf(old.reconciliation42.acquisitionEvidencePaths[0]),j=p.indexOf(old.reconciliation42.acquisitionEvidencePaths[1]);
    assert.ok(i>=0&&j>=0&&i!==j);[p[i],p[j]]=[p[j],p[i]];}],
  ['unexplained evidence path',d=>d.reconciliation42.acquisitionEvidencePaths.push('reviewer-unexplained-custody.json')],
])check(name+' is refused',()=>{
  const input=structuredClone(current);mutate(input);
  assert.throws(()=>additiveOtherFamilyRegistry(oldBytes,encode(input),familyId,read));
  return {expectedOutcome:'rejected'};
});
assert.equal(sha(read(registry)),sha(currentBytes));
const reusedPaths=[returned.evidencePath,
  ...baseline.outputs.map(d=>d.file),...baseline.sourceChecks.map(d=>d.path),
  'data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/source-receipt.json',
  'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json',notePath,
  ...JSON.parse(read(notePath)).documents.map(d=>d.heldCorpusPath)];
const report={schemaVersion:'rcap-independent-delta-review/v1',reviewer:'/root/independent_md_review',
  reviewedAt:new Date().toISOString(),verdict:'PASS',scope:'DE exact UT/ME custody compatibility guard only',
  authorReviewerSeparation:'Root implemented the repair. This separate reviewer authored and executed these controls, discovered the shortcut bypass, and re-executed it after the root repair.',
  implementation:identity(implementation),reviewerScript:identity('scripts/rcap-packet-recovery/session10/review-de-custody-compatibility.mjs'),
  initialFailure:identity(`${out}/de-custody-shortcut-initial-finding.json`),
  initialFailureDisposition:'Closed: exact custody note no longer bypasses authentication by being named by an appended unrelated family row.',
  independentCases:cases.length,cases,actualAdmission:baseline,
  reusedEvidence:reusedPaths.map(identity),
  originalReviewAttribution:{reviewer:baseline.reviewer,sessionIdentity:baseline.sessionIdentity,path:baseline.reviewPath,sha256:baseline.reviewSha256},
  authorSuite:{...identity('data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/de-custody-admission-tests.json'),rerunHere:false,claimedAsIndependent:false},
  reviewLimits:['No new counsel or legal acceptance. Original exact guidance review and six whole-page receipt remain the authority for that scope.','No packet rebuild or new visual review was necessary: reviewed outputs, receipt and source pins remain bound.','This accepts only static GUIDANCE_READY compatibility; runtime, filing, payment and sponsorship grants remain false.'],
  sharedFilesModified:false,productionChanged:false};
fs.writeFileSync(`${out}/de-custody-compatibility-review.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verdict:report.verdict,independentCases:cases.length,bypassClosed:true,actualAdmissionEligible:baseline.eligible,report:`${out}/de-custody-compatibility-review.json`},null,2));
