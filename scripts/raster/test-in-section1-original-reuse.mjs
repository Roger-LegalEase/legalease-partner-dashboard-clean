import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {reuseHeldFactCanonicalEvidence as reuse} from './reuse-held-fact-canonical-evidence.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-in-original-reuse-check-'));
const file='data/rcap-grade-a/packet-factory-24h/warp-20260912/in-two/semantic-repair/followup-repair/original-baseline-repair/date-charges-filed-followup/raster-manifest.json';
const m=JSON.parse(fs.readFileSync(root+'/'+file)),docs=m.rows[0].documents.filter(d=>d.reuseOriginalPageEvidence);
let passes=0;
for(const d of docs){
 const args={root,out,familyId:'in_section1_petition-set',familyPath:'in_section1_petition-set',target:{kind:d.role,name:d.name,rel:d.path,expected:d.sha256,expectedPages:d.pageCount},descriptor:d.reuseOriginalPageEvidence,scale:2.5,currentPageCount:d.pageCount};
 const result=await reuse(args);assert.equal(result.measurements.length,15);assert.equal(result.document.renderedInThisRun,false);assert.equal(result.document.role,d.role);passes++;
 for(const mutation of [a=>a.familyId='in_arrest_no_charges-set',a=>a.target.name='inserts-canonical-filled.pdf',a=>a.target.expected='0'.repeat(64),a=>a.currentPageCount=14,a=>a.descriptor.originalRunId='34675992782',a=>a.target.kind='wrong',a=>a.scale=2]){
  const bad=structuredClone(args);mutation(bad);await assert.rejects(()=>reuse(bad));passes++;
 }
}
console.log(`PASS ${passes} actual reuse controls: 30 exact original PNG pages and 14 refusals; no raster performed`);
