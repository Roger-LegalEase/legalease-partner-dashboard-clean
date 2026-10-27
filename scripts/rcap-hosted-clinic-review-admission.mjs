import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hash} from './rcap-hosted-existing-clinic-readonly.mjs';
import {assertClinicReviewRecovery} from './rcap-hosted-clinic-review-queue.mjs';
const binding=JSON.parse(fs.readFileSync(new URL('./clinic-review-recovery-native-binding.json',import.meta.url)));

// Admit the completed native GET and exact typed artifact before reading credentials.
export function admitClinicReviewRecovery({archive,entries,run}){
 assert.equal(binding.runId,40475914225);assert.equal(binding.artifactId,12721225764);
 assert.equal(binding.archiveSha256,'b74477976c30ea79e2e6db74bafc6914fa53290c253c348f2ddb596601788e1b');
 assert.equal(archive.length,binding.archiveBytes);assert.equal(hash(archive),binding.archiveSha256);
 assert(entries instanceof Map);assert.deepEqual([...entries.keys()].sort(),Object.keys(binding.entries).sort());
 for(const [name,expected]of Object.entries(binding.entries))assert.equal(hash(entries.get(name)),expected,'exact typed recovery entry');
 for(const [key,value]of Object.entries({id:binding.runId,head_sha:binding.carrier,head_branch:'codex/f-vercel-raw-readonly-20261026',run_attempt:1,status:'completed',conclusion:'success',workflow_id:332448793,event:'workflow_dispatch'}))assert.equal(run[key],value);
 assert.equal(run.repository?.full_name,'Roger-LegalEase/legalease-partner-dashboard-clean');
 const recovery=JSON.parse(entries.get('result.json'));assertClinicReviewRecovery(recovery);
 assert.equal(hash(entries.get('result.json')),'c8e3e4f9c17a549764aa19980b42696142a93d123ca25646e9bdd3b7ac249389');
 return recovery;
}
