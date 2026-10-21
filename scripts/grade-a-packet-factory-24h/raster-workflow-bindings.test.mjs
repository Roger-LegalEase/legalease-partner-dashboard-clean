import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readRunProof, receiptDigest, provenReceiptWorkflow, RASTER_WORKFLOW} from './raster-workflow-bindings.mjs';

test('missing workflow requires exact receipt, run, job and original metadata bindings', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'raster-workflow-proof-'));
  const base=path.join(root,'data/rcap-grade-a/packet-factory-24h/raster-runs/123');
  fs.mkdirSync(base,{recursive:true});
  const run={id:123,path:RASTER_WORKFLOW};
  const jobs={jobs:[{id:456,run_id:123,conclusion:'success'}]};
  const write=()=>{fs.writeFileSync(path.join(base,'run.json'),JSON.stringify(run));fs.writeFileSync(path.join(base,'jobs.json'),JSON.stringify(jobs));};
  try {
    write();
    const row={familyId:'synthetic',rasterReceipt:{workflowRunId:'123',jobId:'456',boundToCanonicalSha256:'a'.repeat(64)}};
    const bindings={rows:[{familyId:row.familyId,receiptSha256:receiptDigest(row.rasterReceipt),proof:readRunProof(root,row.rasterReceipt)}]};
    assert.equal(provenReceiptWorkflow(root,row,bindings),RASTER_WORKFLOW);
    assert.equal(provenReceiptWorkflow(root,row,{rows:[]}),null);
    const changed=structuredClone(row);changed.rasterReceipt.boundToCanonicalSha256='b'.repeat(64);
    assert.equal(provenReceiptWorkflow(root,changed,bindings),null);
    run.path='.github/workflows/unrelated.yml';write();assert.equal(provenReceiptWorkflow(root,row,bindings),null);
    run.path=RASTER_WORKFLOW;jobs.jobs[0].conclusion='failure';write();assert.equal(provenReceiptWorkflow(root,row,bindings),null);
    jobs.jobs[0].conclusion='success';jobs.jobs[0].run_id=789;write();assert.equal(provenReceiptWorkflow(root,row,bindings),null);
    jobs.jobs[0].run_id=123;run.unboundChange=true;write();assert.equal(provenReceiptWorkflow(root,row,bindings),null);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
