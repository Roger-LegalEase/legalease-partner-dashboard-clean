#!/usr/bin/env node
/** Actual Markdown generator test. No PDF renderer or raster job is run. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {participantInstructions} from '../../build-census-v1-nc_146_dismissal_petition-set.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const GUIDE='data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill/participant-instructions.md';
const HOST='scripts/build-census-v1-nc_146_dismissal_petition-set.mjs';
const OLD="**The court decides, on your petition, and the clerk certifies first.** You file Side One with the clerk of superior court; the clerk completes the CERTIFICATION BY CLERK on Side Two; a judge makes the findings and signs the order.";
const CORRECT="**The court decides before the clerk certifies copies.** Complete, sign and file Side One with the clerk of superior court. The court then decides the petition and enters its order. If an order of expunction is entered, the clerk makes copies, completes CERTIFICATION BY CLERK on each copy, and distributes the certified copies as the official instructions direct. Leave all findings, order and clerk-certification fields on Side Two blank.";
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const guide=fs.readFileSync(path.join(ROOT,GUIDE),'utf8');
const host=fs.readFileSync(path.join(ROOT,HOST),'utf8');
function verify(text, original) {
  assert.equal(text.split(CORRECT).length-1,1,'CORRECT_CHRONOLOGY_MISSING_OR_DUPLICATE');
  assert.ok(!text.includes(OLD),'OLD_CHRONOLOGY_REINTRODUCED');
  assert.ok(!/clerk certifies first/.test(text),'CLERK_BEFORE_COURT');
  if(original) assert.equal(text.replace(CORRECT,OLD),original,'UNRELATED_GUIDE_EDIT');
}
verify(guide);assert.ok(host.includes(JSON.stringify(CORRECT)));
assert.equal(blob(Buffer.from(guide.replace(CORRECT,OLD))),'4a3346ab6697bb6a6fc4dceffcf8723c95830824');
assert.equal(blob(Buffer.from(host.replace(CORRECT,OLD))),'173e51df9019986911605fabb71b8db83e364b95');
// Reuse the existing disclosed table as input to the actual pure-text generator.
// This verifies this text repair; it is not an independent audit of the field maps.
const supply=guide.split('## The items you must supply\n')[1].split('## What you do, in order')[0];
let document=null;const rbf=[];
for(const line of supply.split('\n')) {
  const m=line.match(/^### ([a-z_]+) — /);if(m){document=m[1];continue;}
  if(line.startsWith('| ')&&!line.startsWith('| The blank')&&!line.startsWith('| ---')) {
    const [,label,what]=line.split('|').map(x=>x.trim());
    assert.ok(document&&label&&what);rbf.push({document,disclosureLabel:label,participantMustSupply:what});
  }
}
assert.equal(rbf.length,60);
const first=participantInstructions([],rbf),second=participantInstructions([],rbf);
assert.equal(first,guide,'Actual generator differs from complete guide');assert.equal(second,first);
const previous=guide.replace(CORRECT,OLD);verify(first,previous);
const bad=[OLD,'',CORRECT+CORRECT,CORRECT.replace('If an order of expunction is entered','Before the court enters an order'),
  CORRECT.replace('the clerk makes copies','the participant makes copies'),
  CORRECT.replace('Leave all findings, order and clerk-certification fields on Side Two blank.','Complete Side Two yourself.'),
  CORRECT.replace('The court then decides the petition and enters its order.','The clerk certifies first.')];
const negative=[];
for(const [i,replacement] of bad.entries()) {
  assert.throws(()=>verify(guide.replace(CORRECT,replacement),previous),{name:'AssertionError'});
  negative.push({case:`chronology-mutation-${i+1}`,caught:true});
}
assert.throws(()=>verify(guide.replace('The no-fee and fee-paid branches contain neither','The no-fee branch requires'),previous),/UNRELATED_GUIDE_EDIT/);
negative.push({case:'unrelated-conditional-fee-copy-change',caught:true});
const current=fs.readFileSync(path.join(ROOT,'scripts/rcap-packet-recovery/nc-146-indigency.mjs'));
assert.equal(blob(current),'dad1291fd0498a23bcd7421a0cbb89558f705cd0','Fee selection helper must remain unchanged');
console.log(JSON.stringify({suite:'NC guide chronology; actual text generator only',
  fullMarkdownGenerationPasses:2,allBytesMatched:true,existingDisclosureRows:60,
  negativeControls:negative,negativeCount:negative.length,
  currentGuideSha256:sha(Buffer.from(guide)),currentGuideBlob:blob(Buffer.from(guide)),
  currentHostSha256:sha(Buffer.from(host)),currentHostBlob:blob(Buffer.from(host)),
  difference:'One identical paragraph corrected in host and long guide; every other byte preserved against current Git blobs',
  pdfRendererRuns:0,rasterRuns:0,pdfFilesWritten:0,independentApproval:false},null,2));
