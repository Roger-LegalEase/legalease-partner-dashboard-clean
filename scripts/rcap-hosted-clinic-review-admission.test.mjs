import assert from 'node:assert/strict';
import fs from 'node:fs';
import {admitClinicReviewRecovery} from './rcap-hosted-clinic-review-admission.mjs';
const root=process.env.CLINIC_PERSISTED_RESUME_ROOT;assert(root);
const source=root+'/clinic-postsave-get-recovery-actual-execution-20261027/';
const archive=fs.readFileSync(source+'artifact-12721225764.zip');
const entries=new Map(fs.readdirSync(source+'extracted').map(name=>[name,fs.readFileSync(source+'extracted/'+name)]));
// Completed status is mocked for these source-guard checks, not a new native receipt.
const run={...JSON.parse(fs.readFileSync(source+'ACTUAL-DISPATCHED-RUN.PRIVATE.json')),status:'completed',conclusion:'success'};
let checks=0;
assert.equal(admitClinicReviewRecovery({archive,entries,run}).revision,0);checks++;
for(const change of [r=>r.id++,r=>r.head_sha='a'.repeat(40),r=>r.status='in_progress',r=>r.conclusion='failure',r=>r.run_attempt=2,r=>r.repository.full_name='another/repository']){
 const copy=structuredClone(run);change(copy);assert.throws(()=>admitClinicReviewRecovery({archive,entries,run:copy}));checks++;
}
const corrupt=Buffer.from(archive);corrupt[0]^=1;assert.throws(()=>admitClinicReviewRecovery({archive:corrupt,entries,run}));checks++;
const missing=new Map(entries);missing.delete('result.json');assert.throws(()=>admitClinicReviewRecovery({archive,entries:missing,run}));checks++;
const added=new Map(entries);added.set('extra.json',Buffer.from('{}'));assert.throws(()=>admitClinicReviewRecovery({archive,entries:added,run}));checks++;
const changed=new Map(entries);changed.set('result.json',Buffer.from('{}'));assert.throws(()=>admitClinicReviewRecovery({archive,entries:changed,run}));checks++;
console.log(`${checks} focused Clinic recovery native archive/entry/run admission checks PASS; completed run status mocked, no live calls.`);
