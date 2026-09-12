import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {rasterCustodyIntegrationSteps as steps} from './raster-custody-integration.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-custody-integration-'));
const hash='a'.repeat(64),commit='b'.repeat(40);
const verdict={familyId:'fixture',verdict:'RASTER_PASS',workflowRunId:12,packetCommitSha:commit,pagesMeasured:1,problems:[],environmentProblems:[]};
const proof={familyId:'fixture',verdict:'RASTER_PASS',currentAndPinnedPdfHashesVerified:true,originalArtifactAndJobLogAgree:true,originalPngBytesVerified:true,archiveSha256:hash,packetCommit:commit,verdictPath:'verdict.json',pagesMeasured:1,jobId:34,artifact:{id:56,name:'originals',expires_at:'2027-01-01',digest:'sha256:'+hash,workflow_run:{id:12}}};
const custody={conclusion:'success',runId:12,inputs:{commit_sha:commit},selectedFamilies:['fixture'],families:[proof]};
const run=(c=custody,v=verdict)=>{fs.writeFileSync(path.join(root,'custody.json'),JSON.stringify(c));fs.writeFileSync(path.join(root,'verdict.json'),JSON.stringify(v));return steps(root,'custody.json');};
let passed=0;
assert.deepEqual(run()[0].argv,['scripts/grade-a-packet-factory-24h/ingest-raster-receipt.mjs','--payload','verdict.json','--job-id','34','--artifact-id','56','--artifact-name','originals','--artifact-digest','sha256:'+hash,'--artifact-expires','2027-01-01','--job-conclusion','success']);passed++;
const partial=structuredClone(custody);partial.conclusion=null;partial.partialRunAdmission=true;partial.selectedFamiliesConclusion='success';assert.equal(run(partial).length,1);passed++;
for(const mutate of [c=>c.conclusion='failure',c=>c.families=[],c=>c.families.push(structuredClone(proof)),c=>c.families[0].originalPngBytesVerified=false,c=>c.families[0].currentAndPinnedPdfHashesVerified=false,c=>c.families[0].originalArtifactAndJobLogAgree=false,c=>c.selectedFamilies=[],c=>c.families[0].artifact.digest='wrong',c=>c.families[0].artifact.workflow_run.id=99,c=>c.inputs.commit_sha='wrong',c=>c.families[0].verdictPath='../outside.json']){
 const bad=structuredClone(custody);mutate(bad);assert.throws(()=>run(bad));passed++;
}
for(const mutate of [v=>v.familyId='other',v=>v.packetCommitSha='wrong',v=>v.workflowRunId=99,v=>v.pagesMeasured=0,v=>v.problems=['bad'],v=>v.environmentProblems=['bad'],v=>v.verdict='RASTER_FAIL']){
 const bad=structuredClone(verdict);mutate(bad);assert.throws(()=>run(custody,bad));passed++;
}
console.log(`PASS ${passed} receipt-integration controls; existing native ingester retains current-byte/coverage refusals`);
