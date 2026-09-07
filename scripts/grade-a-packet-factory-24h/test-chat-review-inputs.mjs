import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chatReviewInputs, chatRowProblem, normalizeBoundedChatFailure} from './chat-review-inputs.mjs';
const base='data/rcap-grade-a/chat-parallel-2026-09-07/review/';
const read=n=>JSON.parse(fs.readFileSync(base+n+'.json','utf8'));
const de=read('de-current-review-reconciliation');
const obligations=Object.keys(de.rows[0].proofObligations);
assert.equal(obligations.length,15);
const before=JSON.stringify(de);
let positives=0, negatives=0;
const check=d=>chatRowProblem(d,d.rows[0],obligations);
assert.equal(check(de),null);positives++;
for(const name of ['fl-complete-independent-review','nc-complete-branch-independent-review','il-complete-candidate-independent-review']){
 const d=read(name);assert.equal(check(d),null);assert.equal(d.rows[0].verdict,'FAIL_REPAIR_REQUIRED');positives++;
}
const inputs=chatReviewInputs(process.cwd());
assert.ok(inputs.some(x=>x.file===base+'de-current-review-reconciliation.json'));
assert.ok(!inputs.some(x=>/addendum|audit-results/.test(x.file)));positives++;
assert.equal(normalizeBoundedChatFailure(process.cwd(),de,de.rows[0]),de.rows[0]);positives++;
for (const fixture of ['canonical','boundary']) {const d=structuredClone(de);d.rows[0].anchors[fixture].gitBlobSha='0'.repeat(40);assert.throws(()=>normalizeBoundedChatFailure(process.cwd(),d,d.rows[0]));negatives++;}
const ri=read('ri-independent-findings');
for (const r of ri.rows) {const x=normalizeBoundedChatFailure(process.cwd(),ri,r);assert.equal(chatRowProblem(ri,x,obligations),null);assert.equal(x.verdict,'FAIL_REPAIR_REQUIRED');positives++;}
for (const mutate of [d=>d.rows[0].verdict='PASS_COMPLETE_INDEPENDENT',d=>d.currentPacketSnapshot='latest',d=>d.independence.mapsEdited=true,d=>d.rows[0].canonical.gitBlobShaAtBothSnapshots='0'.repeat(40)]){const d=structuredClone(ri);mutate(d);assert.throws(()=>normalizeBoundedChatFailure(process.cwd(),d,d.rows[0]));negatives++;}
const mutations=[
 d=>d.schemaVersion='builder/v1',d=>d.reviewer='',d=>d.sessionIdentity='',
 d=>d.laneKind='packet-builder',d=>d.packetFilesEdited=true,d=>d.overlayDirectoriesModified=1,
 d=>d.rows[0].familyId='',d=>d.rows[0].itemId='other',d=>d.rows[0].verifiedAtBase='latest',
 d=>delete d.laneKind,d=>delete d.rows[0].proofObligations.SERVICE,
 d=>d.rows[0].proofObligations.SERVICE.result='FAIL',
 d=>d.rows[0].proofObligations.SERVICE.result='UNMEASURED',
 d=>d.rows[0].proofObligations.SERVICE.measured=false,
 d=>d.rows[0].failedObligations=['SERVICE'],d=>d.rows[0].unmeasuredObligations=['SERVICE'],
 d=>d.rows[0].nineCounters.measuredHere=false,d=>d.rows[0].nineCounters.allZero=false,
 d=>d.rows[0].nineCounters.visualDefects=1,d=>delete d.rows[0].nineCounters.invisibleWrites,
 d=>{d.candidateCodeCommit='a'.repeat(40);d.rows[0].packetPublicationCommit=null;},
 d=>delete d.rows[0].anchors.canonical,d=>delete d.rows[0].anchors.boundary,
];
for(const mutate of mutations){const d=structuredClone(de);mutate(d);assert.notEqual(check(d),null);negatives++;}
assert.notEqual(chatRowProblem(de,structuredClone(de.rows[0]),obligations),null);negatives++;
assert.equal(JSON.stringify(de),before);
console.log(JSON.stringify({suite:'chat-review-inputs',positiveCases:positives,rejectionControls:negatives,rawReviewsUnchanged:true},null,2));
