import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolveSources,censusFlat,measuredCourtControls,dischargeGate,DISCHARGE_GATE,FIXTURES} from '../build-census-v1-wi_exp_cr266-set.mjs';
import {checkboxCandidates} from '../lib/pdf-stroked-boxes.mjs';
const {PDFDocument,PDFRawStream}=createRequire(import.meta.url)('pdf-lib');
const {resolved,failures}=resolveSources();assert.deepEqual(failures,[]);
for(const s of resolved){const c=await censusFlat(s);assert.equal(c.strokedCheckboxCount,s.formNumber==='CR-267'?8:0);const controls=measuredCourtControls(s.formNumber,c);assert(controls.every(x=>x.owner==='court'&&x.participantMayFill===false));if(s.formNumber==='CR-267'){
 assert.deepEqual(controls.map(x=>[x.geometry.x0,x.geometry.y0]),[[37.08,362.83],[37.08,310.61],[37.08,286.61],[68.52,274.61],[68.52,250.61],[68.52,226.61],[68.52,214.37],[68.52,190.61]]);
 const doc=await PDFDocument.load(s.bytes);let encoded='';for(const p of doc.getPages())for(const ref of p.node.normalizedEntries().Contents.asArray()){const stream=doc.context.lookup(ref);if(stream instanceof PDFRawStream)encoded+=Buffer.from(stream.getContents()).toString('latin1');}assert.equal(checkboxCandidates(encoded).length,0,'Negative control must reproduce the old compressed-stream blindness');
 assert.throws(()=>measuredCourtControls(s.formNumber,{...c,strokedBoxes:[]}),/control\/label count mismatch/);
}}
assert.equal(dischargeGate(FIXTURES.canonical).passes,true);assert.equal(dischargeGate(FIXTURES.boundary).passes,true);
for(const rule of DISCHARGE_GATE)for(const value of [null,undefined,!rule.mustBe,'yes'])assert.equal(dischargeGate({...FIXTURES.canonical,[rule.factId]:value}).passes,false);
console.log('PASS: exact0/8decodedsourcecontrols; encoded-streamnegativecontrol; control-labelmismatchrefused; bothpositiveand16negative dischargecases');
