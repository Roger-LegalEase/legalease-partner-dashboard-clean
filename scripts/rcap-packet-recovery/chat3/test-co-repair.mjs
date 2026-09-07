#!/usr/bin/env node
// Actual source-bound preparation, shared finalizer, map and disclosure tests.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {prepareRequiredCbi} from './co-required-cbi.mjs';
import {resolveSources,censusOf,renderDocument,byteProof,mapFor,requiredBeforeFilingItems,participantInstructions} from '../../build-census-v1-co_motion_seal_nonconviction-set.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const out=path.join(root,'data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill');
const {resolved:sources,failures}=resolveSources();assert.deepEqual(failures,[]);
const original=sources.map(s=>sha(s.bytes));
const maps={canonical:[],boundary:[]},positive=[],negative=[];
for (const source of sources) {
  const census=await censusOf(source);
  const a=await prepareRequiredCbi(source),b=await prepareRequiredCbi(source);
  assert.equal(sha(a.bytes),sha(b.bytes),'preparation determinism');
  const prepared=await PDFDocument.load(a.bytes,{updateMetadata:false});
  assert.ok(prepared.getForm().getCheckBox(a.field).isChecked());
  assert.deepEqual(a.changedFields,source.formNumber==='JDF-477'?[]:['478.3D.0']);
  if(source.formNumber==='JDF-477')assert.equal(sha(a.bytes),source.sha256,'source-authored mark must not be redrawn');
  for (const fixture of ['canonical','boundary']) {
    const {bytes,report}=await renderDocument(source,census,fixture);
    const proof=await byteProof(source,census,bytes,report,fixture);
    assert.deepEqual(proof.refusedFieldsWithInk,[]);
    const map=mapFor(source,census,report,fixture);maps[fixture].push(map);
    const control=map.selectionControls.find(c=>c.acroFieldName===a.field);
    assert.ok(control.selected && control.routeDetermined && control.disposition!=='explicit_refusal');
    if(source.formNumber==='JDF-477') {
      assert.ok(!report.written.some(w=>w.field==='8C.0'),'no second CBI mark');
      const address=map.canonicalRefusals.find(r=>r.acroFieldName==='Address');
      assert.equal(Boolean(address),fixture==='boundary');
      if(address){assert.ok(address.factAvailable && address.requiredBeforeFiling);assert.equal(address.completenessDisposition,'KNOWN_FACT_NOT_WRITTEN');}
      else assert.ok(map.canonicalWrites.some(w=>w.acroFieldName==='Address'));
    } else {
      assert.deepEqual(report.familyRequiredSelectionPreparation.changedFields,['478.3D.0']);
      assert.equal(proof.requiredSelections.length,1);
      assert.ok(report.written.some(w=>w.field==='478.3D.0' && w.kind==='family_prepared_required_recipient'));
    }
    positive.push({fixture,form:source.formNumber,componentSha256:sha(bytes),markedControl:a.field,sourceDefaultPreserved:a.sourceAuthored});
  }
  for(const mutation of ['same-length-corruption','truncation','wrong-form']){
    let changed={...source,bytes:Buffer.from(source.bytes)};
    if(mutation==='same-length-corruption')changed.bytes[100]^=1;
    if(mutation==='truncation')changed.bytes=changed.bytes.subarray(0,-1);
    if(mutation==='wrong-form')changed.formNumber='JDF-999';
    await assert.rejects(()=>prepareRequiredCbi(changed),/source hash mismatch|exact two/);negative.push({form:source.formNumber,mutation,rejected:true});
  }
}
const combined=maps.canonical.map(c=>({...c,boundaryWrites:maps.boundary.find(b=>b.formNumber===c.formNumber).canonicalWrites,boundaryRefusals:maps.boundary.find(b=>b.formNumber===c.formNumber).canonicalRefusals}));
const rbf=requiredBeforeFilingItems(combined);const instructions=participantInstructions(combined,rbf);
const validate=(m,items,text)=>{
  const co=m.find(x=>x.formNumber==='JDF-477');const boundary=co.boundaryRefusals.find(r=>r.acroFieldName==='Address');
  assert.ok(boundary?.requiredBeforeFiling && boundary.factAvailable,'boundary held refusal absent');
  assert.ok(!co.boundaryWrites.some(w=>w.acroFieldName==='Address'),'false boundary address write');
  const item=items.find(i=>i.field==='JDF-477/Address');assert.ok(item && item.fixtures.includes('boundary') && item.factAvailable,'held address omitted from completion table');
  assert.ok(/JDF 477 section 5/.test(text) && /before filing/.test(text) && /6-point floor/.test(text),'disclosure missing');
  assert.ok(!/address.*phone.*on both forms/s.test(text),'old false blanket-prefill statement');
  for(const map of m){const key=map.formNumber==='JDF-477'?'8C.0':'478.3D.0';const c=map.selectionControls.find(c=>c.acroFieldName===key);assert.ok(c?.selected && c.routeDetermined && c.disposition!=='explicit_refusal','required CBI misclassified');}
};
validate(combined,rbf,instructions);
for(const mutation of ['hide-boundary-refusal','claim-boundary-write','omit-completion-table','omit-disclosure','misclassify-cbi']){
 const m=structuredClone(combined);let items=structuredClone(rbf),text=instructions;
 if(mutation==='hide-boundary-refusal')m[0].boundaryRefusals=m[0].boundaryRefusals.filter(r=>r.acroFieldName!=='Address');
 if(mutation==='claim-boundary-write')m[0].boundaryWrites.push({acroFieldName:'Address'});
 if(mutation==='omit-completion-table')items=items.filter(i=>i.field!=='JDF-477/Address');
 if(mutation==='omit-disclosure')text='';
 if(mutation==='misclassify-cbi')m[1].selectionControls.find(c=>c.acroFieldName==='478.3D.0').routeDetermined=false;
 assert.throws(()=>validate(m,items,text));negative.push({mutation,rejected:true});
}
const counts=JSON.parse(fs.readFileSync(path.join(out,'reports/completeness-counters.json')));
assert.equal(counts.counters.knownRequiredFieldsMissing,1,'do not hide the genuine held/unprinted address limitation');
assert.equal(counts.allNineZero,false);
assert.deepEqual(sources.map(s=>sha(s.bytes)),original);
console.log(JSON.stringify({familyId:'co_motion_seal_nonconviction-set',scope:'author source/finalizer/map/disclosure regressions',positive,negative,negativeCount:negative.length,knownHeldAddressRefusalPreserved:true,originalSourcesUnchanged:true,independentApproval:false},null,2));
