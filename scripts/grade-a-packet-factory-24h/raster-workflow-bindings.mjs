import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const RASTER_WORKFLOW = '.github/workflows/rcap-packet-raster-acceptance-batch.yml';
export const BINDINGS_PATH = 'data/rcap-grade-a/packet-factory-24h/RASTER_WORKFLOW_BINDINGS.json';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const receiptDigest = receipt => sha(JSON.stringify(receipt));

export function readRunProof(root, receipt) {
  if (!/^\d+$/.test(String(receipt.workflowRunId)) || !/^\d+$/.test(String(receipt.jobId))) throw new Error('Exact run and job IDs required');
  const base = `data/rcap-grade-a/packet-factory-24h/raster-runs/${receipt.workflowRunId}`;
  const read = name => {
    const completed = `${base}/${name}-completed-20260914.json`;
    const file = fs.existsSync(path.join(root, completed)) ? completed : `${base}/${name}.json`;
    const bytes = fs.readFileSync(path.join(root, file));
    return { path: file, sha256: sha(bytes), value: JSON.parse(bytes) };
  };
  const run = read('run'), jobs = read('jobs');
  const matching = (jobs.value.jobs ?? jobs.value).filter(j => String(j.id) === String(receipt.jobId));
  if (String(run.value.id) !== String(receipt.workflowRunId) || run.value.path !== RASTER_WORKFLOW
    || matching.length !== 1 || matching[0].conclusion !== 'success'
    || String(matching[0].run_id) !== String(receipt.workflowRunId)) throw new Error('Run/workflow/successful job identity mismatch');
  return { workflow: run.value.path, run: {path:run.path,sha256:run.sha256}, jobs: {path:jobs.path,sha256:jobs.sha256} };
}

export function provenReceiptWorkflow(root, row, bindings) {
  const receipt = row.rasterReceipt;
  if (!receipt) return null;
  if (receipt.workflow !== undefined) return receipt.workflow;
  const bound = bindings?.rows?.find(b => b.familyId === row.familyId);
  if (!bound || bound.receiptSha256 !== receiptDigest(receipt)) return null;
  try {
    const proof = readRunProof(root, receipt);
    return JSON.stringify(proof) === JSON.stringify(bound.proof) ? proof.workflow : null;
  } catch { return null; }
}
