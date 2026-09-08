#!/usr/bin/env node
// Admit the already completed Delaware receipt. This changes raster evidence,
// never the independent semantic verdict, legal holds or release authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { pathToFileURL } from 'node:url';
const FAMILY = 'de_mandatory_expungement-set';
const QUEUE = 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json';
const VERDICT = 'data/rcap-grade-a/launch-recovery-2026-09-07/central-raster/de_mandatory_expungement-set.verdict.json';
const PIN = Object.freeze({
  run: '34078415178', commit: 'e1e421173bf65e1557c9253466f6c723d2cec278',
  job: '101609393830', artifact: '10002964440',
  zip: '409092ce888fff15b2c7e00ab882fb7b4bde1ba29679c213318d7acde4cf6946',
  digest: '399deb7257e2532ccbe3e6cad59cc44592034b2feccebecfbd5e9c3846001acc'
});
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export async function validateCompletedRaster(row, v, read = fs.readFileSync) {
  assert.equal(row.familyId, FAMILY); assert.equal(v.familyId, FAMILY);
  assert.equal(v.verdict, 'RASTER_PASS'); assert.equal(v.workflowRunId, PIN.run);
  assert.equal(v.packetCommitSha, PIN.commit);
  assert.equal(v.documentsDigest, PIN.digest); assert.equal(row.documentsDigest, PIN.digest);
  assert.deepEqual(v.problems, []); assert.deepEqual(v.environmentProblems, []);
  assert.equal(v.packetPdfsModified, 0); assert.equal(v.coversTheWholeFamily, true);
  assert.equal(row.documents.length, 2); assert.equal(v.documentsRendered.length, 2);
  assert.deepEqual(v.documentsRendered.map(x => x.path).sort(), row.documents.map(x => x.path).sort());
  let expectedPages = 0;
  for (const doc of row.documents) {
    const evidence = v.documentsRendered.find(x => x.path === doc.path);
    assert.equal(evidence.pinned, doc.sha256);
    assert.equal(v.hashesBound[doc.role].pinned, doc.sha256);
    assert.equal(v.hashesBound[doc.role].path, doc.path);
    const bytes = read(doc.path); assert.equal(hash(bytes), doc.sha256, doc.path);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const count = pdf.getPageCount(); assert.equal(count, doc.pageCount);
    const pages = v.measurements.filter(x => x.document === doc.name);
    assert.equal(pages.length, count);
    assert.deepEqual(pages.map(x => x.page).sort((a,b) => a-b), Array.from({length:count}, (_,i)=>i+1));
    for (const p of pages) {
      assert.equal(p.kind, doc.role); assert.equal(p.nonblank, true);
      assert.equal(p.croppedToThePage, true); assert.ok(p.bytes > 0);
      assert.ok(Number.isFinite(p.calibrationResidualPx) && p.calibrationResidualPx <= 2);
      assert.equal(p.pageWidthPt, pdf.getPage(p.page-1).getWidth());
      assert.equal(p.pageHeightPt, pdf.getPage(p.page-1).getHeight());
    }
    expectedPages += count;
  }
  assert.equal(v.measurements.length, expectedPages); assert.equal(v.pagesMeasured, expectedPages);
  return expectedPages;
}
async function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE));
  const row = queue.rows.find(x=>x.familyId===FAMILY); assert.ok(row);
  const v = JSON.parse(fs.readFileSync(VERDICT));
  const count = await validateCompletedRaster(row, v);
  if (process.argv.includes('--test')) {
    let caught=0;
    const mutations=[
      x=>{x.verdict='RASTER_FAIL';},x=>{x.packetCommitSha='0'.repeat(40);},
      x=>{x.documentsRendered.pop();},x=>{x.measurements.pop();},
      x=>{x.measurements[1].page=1;},x=>{x.problems.push('clipped');},
      x=>{x.environmentProblems.push('missing renderer');},x=>{x.coversTheWholeFamily=false;},
      x=>{x.packetPdfsModified=1;},x=>{x.documentsDigest='0'.repeat(64);},
      x=>{x.measurements[0].nonblank=false;},x=>{x.hashesBound.canonical.pinned='0'.repeat(64);}
    ];
    for (const mutate of mutations) {
      const copy=structuredClone(v);mutate(copy);
      await assert.rejects(()=>validateCompletedRaster(row,copy));caught++;
    }
    await assert.rejects(()=>validateCompletedRaster(row,v,()=>Buffer.from('wrong packet')));caught++;
    console.log(`Raster receipt validation: PASS; ${caught}/${mutations.length+1} corrupt evidence controls caught; ${count} pages bound.`);
    return;
  }
  const previous=row.rasterReceipt;
  if (previous && previous.workflowRunId!==PIN.run) {
    row.supersededReceipts ??= [];row.supersededReceipts.push({...previous,supersededBecause:'A newer complete current-byte receipt has been validated.'});
  }
  row.currentRasterState='RASTER_PASS'; row.nextOwner='VF07';
  row.rasterReceipt={
    verdict:'RASTER_PASS',workflowRunId:PIN.run,
    workflow:'.github/workflows/rcap-packet-raster-acceptance-batch.yml',renderedCommitSha:PIN.commit,
    jobId:PIN.job,jobConclusion:'success',boundToCanonicalSha256:row.canonicalPdfSha256,
    boundToBoundarySha256:row.boundaryPdfSha256,documentsDigest:v.documentsDigest,
    documentsCovered:v.documentsRendered.map(x=>x.document),documentsNotCovered:[],
    coversTheWholeFamily:true,documentsMeasured:v.documentsRendered.length,pagesMeasured:count,problemsFound:0,
    receiptArtifact:{id:PIN.artifact,name:`rcap-raster-${FAMILY}-${PIN.run}`,zipSha256:`sha256:${PIN.zip}`},
    verdictPath:VERDICT,
    receiptArtifactInspection:'ChatGPT downloaded the completed central artifact and checked its ZIP digest, both local PDF hashes, complete document set, all page numbers and successful run/job conclusions. Revalidated from retained verdict and current PDF bytes by ingest-completed-raster.mjs.',
    canaryPrecondition:'Central canary 101608935575, plan 101609254688 and family job 101609393830 completed successfully in run 34078415178; the family depended on the successful canary and plan.',
    admittedBy:'ChatGPT completion pass; raster evidence only. No independent semantic approval or terminal promotion.',
  };
  row.coverage={documents:v.documentsRendered.map(x=>x.document),rastered:v.documentsRendered.map(x=>x.document),notRastered:[],complete:true,basis:'Both complete canonical and boundary PDFs measured and bound in the retained central verdict.',notRenderedByThisGate:[]};
  fs.writeFileSync(QUEUE,JSON.stringify(queue,null,2)+'\n');
  console.log(`Admitted ${FAMILY}: RASTER_PASS, ${count} pages; independent review still required.`);
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await main();
