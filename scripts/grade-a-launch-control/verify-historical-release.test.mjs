import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {nativeDecisionTime,historicalCheckTime,verifyHistoricalRelease} from './verify-historical-release.mjs';
import {assertCommittedPredecessor,assertForwardHosted,CANDIDATE,PENDING} from './verify-pinned-worker-successor.mjs';
import {pinnedRecords} from './prepare-pinned-worker-successor.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Synthetic native decision fixtures exercise integrity and chronology only;
// they cannot mint the private context or admit production.
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-history-time-'));
 const prefix='hosted-acceptance-evidence/synthetic/';fs.mkdirSync(path.join(root,prefix),{recursive:true});
 const ref={runId:1,jobId:2,workflowSourceSha:'a'.repeat(40),runPath:prefix+'run.json',jobsPath:prefix+'jobs.json',receiptPath:prefix+'receipt.json',files:[]};
 const docs={run:{id:1,head_sha:ref.workflowSourceSha,status:'completed',conclusion:'success',event:'workflow_dispatch',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'}},jobs:{jobs:[{id:2,run_id:1,status:'completed',conclusion:'success',started_at:'2020-01-01T00:00:00Z',completed_at:'2020-01-01T00:01:00Z'}]},receipt:{capturedAt:'2020-01-01T00:00:30Z'}};
 const write=()=>{ref.files=[];for(const [key,doc]of Object.entries(docs)){const rel=ref[key+'Path'],bytes=Buffer.from(JSON.stringify(doc));fs.writeFileSync(path.join(root,rel),bytes);ref.files.push({path:rel,bytes:bytes.length,sha256:hash(bytes)});}};
 write();return {root,ref,docs,write,close:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('intact native historical decision does not expire with today',()=>{const f=fixture();try{assert.deepEqual(nativeDecisionTime(f.root,f.ref),{start:Date.parse('2020-01-01T00:00:00Z'),end:Date.parse('2020-01-01T00:01:00Z')});}finally{f.close();}});
for(const mode of ['missing','tampered','wrong run','wrong source','failed result','reversed chronology','stale at decision','future decision'])test('historical native decision refuses '+mode,()=>{
 const f=fixture();try{
 if(mode==='missing')fs.unlinkSync(path.join(f.root,f.ref.receiptPath));
 else if(mode==='tampered')fs.appendFileSync(path.join(f.root,f.ref.receiptPath),' ');
 else{if(mode==='wrong run')f.docs.jobs.jobs[0].run_id=3;
 if(mode==='wrong source')f.docs.run.head_sha='b'.repeat(40);
 if(mode==='failed result')f.docs.run.conclusion='failure';
 if(mode==='reversed chronology')f.docs.jobs.jobs[0].started_at='2020-01-02T00:00:00Z';
 if(mode==='stale at decision')f.docs.receipt.capturedAt='2019-12-30T00:00:00Z';
 if(mode==='future decision')f.docs.jobs.jobs[0].completed_at='2999-01-01T00:00:00Z';f.write();}
 assert.throws(()=>nativeDecisionTime(f.root,f.ref));
 }finally{f.close();}
});
test('caller-selected historical clocks cannot authorize current checks',()=>{assert.throws(()=>historicalCheckTime({time:0},process.cwd()),/private historical/);assert.throws(()=>assertForwardHosted({capturedAt:'2020-01-01T00:00:00Z'},{},undefined,process.cwd()),/fresh hosted/);});
test('real committed predecessor chain is history and new canonical preparation is HELD',()=>{
 const root=process.cwd(),base='9794f078553d8cd95aec47518ac773ee3e968fdc';
 assert.deepEqual(assertCommittedPredecessor(root,base),{historyValid:true,current:false,productionAuthorized:false});
 const records=pinnedRecords(root,{sourceSha:'b0b721470ea38455d8429c45300c9b3127bfe780',sourceRangeBaseSha:base,releaseBaseSha:base,toolsSha:'6c2f4c29b8cd9a80815dee13ffa15d912da5b59e'});
 assert.equal(records[PENDING].previewExecution,'held');assert.equal(records[PENDING].productionAuthorized,false);assert.equal(records[CANDIDATE].productionAuthorization,null);
});
