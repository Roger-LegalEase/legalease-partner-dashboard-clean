import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {fixtureFacts,renderFixture,validateFacts,ROOT,SOURCE,SOURCE_SHA256,sha256,OUTPUT,FAMILY} from './ia-901c3.mjs';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
const clone=()=>fixtureFacts().canonical;
const results={};
for(const [name,facts] of Object.entries(fixtureFacts())) {
  test('real renderer: '+name,async()=>{
    const r=await renderFixture(facts);results[name]=r;
    assert.equal(r.map.length,74);assert.equal(r.actualWrites.length+r.blanks.length,74);
    assert.equal(new Set(r.map.map(x=>x.fieldId)).size,74);
    assert.equal(r.viewerElements.length,7);
    assert.equal(r.components[0].sourceDocumentId,'Rule 2.86 Form 2');
    const doc=await PDFDocument.load(r.packet,{updateMetadata:false});
    assert.equal(doc.getPageCount(),name==='additional-aliases'?7:6);
    assert.equal(doc.getForm().getFields().length,0);
    assert.equal(r.assessment.externalHistoryIncluded,false);assert.equal(r.assessment.filingReady,false);
    assert(!r.actualWrites.some(x=>x.fieldId==='2.86-2.09'));
    for(const x of r.actualWrites.filter(x=>x.type==='PDFTextField'))assert(x.fit.fontSize>=8);
  });
}
test('source bytes and exact mixed field prefixes',async()=>{
  const raw=await fs.readFile(path.join(ROOT,SOURCE));assert.equal(sha256(raw),SOURCE_SHA256);assert.equal(raw.length,2674736);
  const doc=await PDFDocument.load(raw,{updateMetadata:false}),fields=doc.getForm().getFields();
  assert.equal(fields.length,73);assert.equal(fields.flatMap(x=>x.acroField.getWidgets()).length,74);
  assert(fields.some(f=>f.getName()==='2.86-1.sig.a.01'));assert(fields.some(f=>f.getName()==='2.86-2.cap.04.f'));
});
test('all known canonical prefill values are measured in final bytes',()=>{
  const r=results.canonical;
  assert.equal(r.measuredTextWrites.length,r.actualWrites.filter(x=>x.type==='PDFTextField').length);
  assert(r.measuredTextWrites.some(x=>x.verifiedValue==='0001'));
  assert(r.measuredTextWrites.some(x=>x.verifiedValue==='Avery Jordan Example'));
});
test('current and alternate middle-name facts are distinct',()=>{
  const w=results.boundary.actualWrites;
  assert.equal(w.find(x=>x.fieldId==='2.86-2.01.02').value,'Catherine');
  assert.equal(w.find(x=>x.fieldId==='2.86-2.01.05').value,'N/A');
});
test('additional alias checkbox corresponds to actual generated sheet',()=>{
  assert(results['additional-aliases'].actualWrites.some(x=>x.fieldId==='2.86-2.01.07'));
  assert(results['additional-aliases'].components.some(x=>x.id==='additional-alternate-names'));
  for(const n of ['canonical','boundary']){
    assert(!results[n].actualWrites.some(x=>x.fieldId==='2.86-2.01.07'));
    assert(!results[n].components.some(x=>x.id==='additional-alternate-names'));
  }
});
test('no request, returned report, order or fee waiver is fabricated',()=>{
  for(const r of Object.values(results))assert(r.components.every(c=>['form-2','additional-alternate-names','participant-instructions'].includes(c.id)));
});
test('paper vs eFile changes service prefills, not execution',()=>{
  assert(results.canonical.actualWrites.some(x=>x.fieldId==='2.86-1.cert.05'));
  assert(!results.boundary.actualWrites.some(x=>x.fieldId.startsWith('2.86-1.cert.')));
  for(const r of Object.values(results))assert(!r.actualWrites.some(x=>/^2\.86-1\.(sig\.AB|sig\.b\.|sig\.a\.0[234]|cert\.0[234])/.test(x.fieldId)));
});
test('legal assertions 4 and 8 are manual; unrelated-case item 3 is not fabricated',()=>{
  for(const r of Object.values(results))for(const key of ['2.86-2.04','2.86-2.08','2.86-2.03.00','2.86-2.03.f','2.86-2.03.c'])assert(!r.actualWrites.some(x=>x.fieldId===key));
});
test('30-day report boundary is inclusive and separate from attachment',()=>{
  assert.equal(results.boundary.assessment.reportAgeDays,30);assert.equal(results.boundary.assessment.historyReadyByParticipantReport,true);
  assert.equal(results['history-stale'].assessment.reportAgeDays,31);assert.equal(results['history-stale'].assessment.historyReadyByParticipantReport,false);
  assert.equal(results['history-requested'].assessment.historyReadyByParticipantReport,false);
  assert.equal(results['release-missing'].assessment.historyReadyByParticipantReport,false);
  assert(Object.values(results).every(r=>r.blanks.some(x=>x.fieldId==='2.86-2.09')));
});
test('exact eight-year anniversary is not more than eight years',()=>{
  const r=results['exact-eight-years'];assert.equal(r.assessment.exactAnniversary,true);assert(!r.actualWrites.some(x=>x.fieldId==='2.86-2.06'));
  assert(results.canonical.actualWrites.some(x=>x.fieldId==='2.86-2.06'));
});
test('unavailable identifying facts remain explicit, never invented',()=>{
  const r=results['missing-identifiers'];
  for(const k of ['01.08','01.09','01.10','01.11','01.12','01.13','01.14'])assert.equal(r.blanks.find(x=>x.fieldId==='2.86-2.'+k).completenessDisposition,'REQUIRED_BEFORE_FILING');
});
test('leap-year conviction uses calendar anniversary',()=>{
  const f=clone();f.convictionDate='2016-02-29';f.filingDate='2024-02-29';f.historyReport.issuedOn='2024-02-01';
  assert.equal(validateFacts(f).exactAnniversary,true);f.filingDate='2024-03-01';assert.equal(validateFacts(f).exactAnniversary,false);
});
// Real renderer entrypoint rejects every defective input; no textual renderer double.
const negatives={
  'under-eight-years':f=>{f.convictionDate='2020-01-01'},
  'sentence-completion substitution':f=>{f.sentenceCompletionDate='2018-01-01'},
  'future returned history date':f=>{f.historyReport.issuedOn='2026-09-08'},
  'report request with invented issue date':f=>{f.historyReport.availability='requested'},
  'available history without issue date':f=>{f.historyReport.issuedOn=null},
  'claimed attached report input':f=>{f.historyReport.attached=true},
  'forged returned history bytes':f=>{f.historyReport.bytes='fake PDF'},
  'agency certification':f=>{f.agencyCertified=true},
  'participant signature injection':f=>{f.signature='Avery Example'},
  'service date injection':f=>{f.serviceDate='2026-09-07'},
  'judicial finding injection':f=>{f.orderGranted=true},
  'unknown pending charges':f=>{f.pendingCharges=null},
  'pending charges':f=>{f.pendingCharges=true},
  'prior grant':f=>{f.hasPrior901c3Grant=true},
  'unknown prior grant':f=>{f.hasPrior901c3Grant=null},
  'deferred disposition':f=>{f.deferredJudgmentDisposition=true},
  'felony disposition':f=>{f.misdemeanorConviction=false},
  'unpaid original debt':f=>{f.financialObligationsPaid=false},
  'unknown debt':f=>{f.financialObligationsPaid=null},
  'two deferred proceedings':f=>{f.deferredJudgmentProceedings=2},
  'unknown deferred proceedings':f=>{f.deferredJudgmentProceedings=null},
  'multiple conviction strategy':f=>{f.hasOtherEligibleConvictions=true},
  'related cases judgment':f=>{f.relatedCases=['EXAMPLE-SECOND']},
  'unknown comparability':f=>{f.comparabilityUncertain=true},
  'sex offense':f=>{f.sexOffense=true},
  'unreviewed statutory exclusions':f=>{f.exclusionsReviewed=false},
  'unknown middle name':f=>{f.name.middle=null},
  'duplicate alias':f=>{f.aliases=[f.name]},
  'alias unknown middle':f=>{f.aliases=[{first:'A',middle:null,last:'B'}]},
  'impossible date':f=>{f.convictionDate='2017-02-30'},
  'impossible history date':f=>{f.historyReport.issuedOn='2026-02-30'},
  'unknown filing channel':f=>{f.filingMethod='email'},
  'attorney route':f=>{f.selfRepresented=false},
  'unknown acknowledgment':f=>{f.acknowledgments.lifetime=null},
  'invented fee election':f=>{f.feePaid=true},
  'instructional offense':f=>{f.offense.section='enter code section'},
  'ambiguous subsection':f=>{f.offense.section='708.2'},
  'name source max':f=>{f.name.first='A'.repeat(41)},
  'caption source overflow':f=>{f.caseNumber='W'.repeat(200)},
  'address source max':f=>{f.address='A'.repeat(81)},
  'known text unfit at font floor':f=>{f.email='W'.repeat(45)+'@example.org'},
  'invalid SSN length':f=>{f.ssn='1234'},
  'invalid phone':f=>{f.phone='319-555-0101'},
  'invalid postal code':f=>{f.zip='unknown'},
};
for(const [label,mutate]of Object.entries(negatives))test('reject '+label,async()=>{const f=clone();mutate(f);await assert.rejects(renderFixture(f));});
for(const section of ['123.46','123.47(3)','235B.20','321.218','321A.32','321J.21','321J.2','707.5','708.2(3)','708.2A','708.7','708.11','708.12','716.8(3)','716.8(4)','717C.1','719.1','720.1','721.2','721.10','723.1','724.1','726.1','728.1','901A.1'])test('reject excluded source/statutory category '+section,async()=>{const f=clone();f.offense.section=section;await assert.rejects(renderFixture(f));});
for(const key of Object.keys(clone()))test('reject absent explicit fact '+key,async()=>{const f=clone();delete f[key];await assert.rejects(renderFixture(f));});
test('source-byte drift rejected',async()=>{const raw=await fs.readFile(path.join(ROOT,SOURCE));await assert.rejects(renderFixture(clone(),{sourceBytes:Buffer.concat([raw,Buffer.from('\n')])}),/source bytes/);});
test('wrong official form rejected',async()=>{const raw=await PDFDocument.create();raw.addPage();await assert.rejects(renderFixture(clone(),{sourceBytes:await raw.save()}),/source bytes/);});
test('read-only wrapper import has no generation side effect',()=>{const r=spawnSync(process.execPath,['--input-type=module','-e',"await import('./scripts/build-census-v1-ia-901c3-set.mjs');"],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,0);assert(!r.stdout.includes('completeGeneratedPages'));});
test('--check is refused, not counted as a full build',()=>{const r=spawnSync(process.execPath,['scripts/build-census-v1-ia-901c3-set.mjs','--check'],{cwd:ROOT,encoding:'utf8'});assert.notEqual(r.status,0);});
test('actual shared importer reads all fields and retains missing returned-report requirement',()=>{
  const a=auditFamily(OUTPUT,FAMILY);assert.equal(a.auditable,true);assert.equal(a.totals.terminalFields,593);assert.equal(a.result,'FAIL_COMPONENT_SET');
  assert.equal(a.counters.requiredComponentsMissing,1);for(const[k,v]of Object.entries(a.counters))if(k!=='requiredComponentsMissing')assert.equal(v,0,k);
  assert.equal(a.findings[0].component,'returned-dci-history');
});
