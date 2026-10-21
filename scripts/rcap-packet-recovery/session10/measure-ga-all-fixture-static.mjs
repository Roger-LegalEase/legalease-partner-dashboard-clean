import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {classifyBlank,BLANK_DISPOSITIONS,PASS_COUNTERS} from '../../rcap-packet-completeness/completeness-contract.mjs';
import {FIELDS,validateGa,FAMILY,OUT,FORM} from '../chat5/ga-pre2013.mjs';

const out='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ga-warning-closure';
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const identity=p=>({path:p,sha256:sha(read(p)),gitBlob:blob(read(p))});
const load=p=>json(`${OUT}/${p}`);
const map=load('production-field-map.json'),rendered=load('reports/rendered-artifacts.json');
const original=json(`${out}/ga-measurements-03.json`),delta=json(`${out}/ga-warning-delta-04.json`).rows[0];
const installed=json(`${out}/installed-warning-and-actors-review.json`);
assert.equal(installed.verdict,'PASS');assert.equal(installed.independentCases,35);
for(const i of installed.implementation)assert.equal(sha(read(i.path)),i.sha256);
const actorProof=json(`${out}/installed-native-audit.json`).result.sourceActorMeasurements[0];
assert.equal(actorProof.verified,true);assert.equal(actorProof.outputs.length,15);
const readerPath='scripts/rcap-packet-completeness/verify-packet-completeness.mjs';
const reader=read(readerPath).toString(),start=reader.indexOf('const normalizeRow ='),end=reader.indexOf('\n});',start);
assert.ok(start>=0&&end>start);
const normalize=new Function(`${reader.slice(start,end+4)};return normalizeRow;`)();
const exactOfficial=new Set(['agency.3','agency.4','prosecutor.2','prosecutor.9']);
const globalCounters=Object.fromEntries(PASS_COUNTERS.map(k=>[k,0]));
const fixtures=[];
const at=(f,p)=>p.split('.').reduce((v,k)=>v?.[k],f);
const held=v=>v!==null&&v!==undefined&&v!=='';
const dateText=v=>`${v.slice(5,7)}/${v.slice(8,10)}/${v.slice(0,4)}`;
const normalizedText=v=>String(v).replace(/\s+/g,' ').trim();
for(const artifact of rendered.artifacts){
  const r=load(`reports/${artifact.fixture}.json`),facts=load(`fixtures/${artifact.fixture}.facts.json`),validated=validateGa(facts);
  const expected=delta.wholePdfHashesMeasured.find(x=>x.fixture===artifact.fixture),pdf=read(`${OUT}/${artifact.path}`);
  assert.equal(sha(pdf),expected.sha256);assert.equal(pdf.length,expected.bytes);
  assert.equal(actorProof.outputs.find(x=>x.fixture===artifact.fixture).sha256,expected.sha256);
  assert.equal(r.output.sha256,expected.sha256);assert.deepEqual(r.missingParticipantFacts,validated.missing);
  const counters=Object.fromEntries(PASS_COUNTERS.map(k=>[k,0])),findings=[];
  const add=(counter,field,reason)=>{counters[counter]++;findings.push({counter,field,reason});};
  const ids=new Set(),ledger=[];
  for(const w of r.writes){
    if(ids.has(w.fieldId))add('incompleteRows',w.fieldId,'duplicate write/refusal identity');ids.add(w.fieldId);
    if(w.page!==2||w.documentId!==FORM||w.owner||/signature|ssn|agency\.|prosecutor\./i.test(w.fieldId))add('protectedWrites',w.fieldId,'write outside participant source scope');
    const actual=r.actualWrites.find(x=>x.fieldId===w.fieldId);
    if(!actual||!(actual.glyphsRead>0))add('invisibleWrites',w.fieldId,'no output glyph evidence');
    ledger.push({field:w.fieldId,disposition:'WRITTEN',page:w.page});
  }
  for(const field of FIELDS){
    const value=at(facts,field.factId),w=r.writes.find(x=>x.fieldId===field.fieldId);
    if(held(value)&&(!w||w.value!==(field.factId.endsWith('Date')?dateText(value):value)))add('knownRequiredFieldsMissing',field.fieldId,'held fact not written accurately');
    if(!held(value)&&w)add('knownRequiredFieldsMissing',field.fieldId,'write has no supplied fact');
    if(!ids.has(field.fieldId)&&!r.blanks.some(x=>x.fieldId===field.fieldId))add('unclassifiedBlanks',field.fieldId,'participant source field omitted from partition');
  }
  const chargeWrites=r.writes.filter(x=>x.fieldId.startsWith('case.offenses.line'));
  if(normalizedText(chargeWrites.map(x=>x.value).join(' '))!==normalizedText(facts.case.offenses.join('; ')))add('incompleteRows','case.offenses','complete charge wording differs');
  for(const raw of r.blanks){
    if(ids.has(raw.fieldId))add('unclassifiedBlanks',raw.fieldId,'duplicate write/refusal identity');ids.add(raw.fieldId);
    const field=normalize(raw);let classified;
    if(exactOfficial.has(field.id)){
      const accepted=map.refusals.find(x=>x.fieldId===field.id);
      // The one actual source-actor measurement binds every current whole PDF.
      // Reuse it only for exactly the same field/page/heading/actor declaration.
      assert.deepEqual(raw,accepted);
      classified={disposition:'PROTECTED_FIELD',fieldClass:'EXACT_SOURCE_OFFICIAL_ACTOR',evidence:'installed-native-audit.json'};
    }else classified=classifyBlank(field,field.reason,Object.hasOwn(raw,'completenessClass')?raw.completenessClass:field.refusalClass,
      {...field.declared,factAvailable:held(at(facts,raw.fieldId))});
    if(!BLANK_DISPOSITIONS[classified.disposition]?.allowed){
      const k=classified.disposition==='KNOWN_FACT_NOT_WRITTEN'?'knownRequiredFieldsMissing':classified.disposition==='ROUTE_OPTION_NOT_SELECTED'?'requiredOptionsMissing':'unclassifiedBlanks';
      add(k,field.id,classified.basis);
    }
    if(classified.disposition==='REQUIRED_BEFORE_FILING'){
      const missing=validated.missing.find(x=>x.fieldId===field.id);
      const guide=r.guide.flatMap(x=>x.sections.map(y=>y[1])).join('\n');
      const acquisition=r.guide.find(x=>x.title==='Disposition-document acquisition');
      const attachmentDisclosed=field.id==='officialDispositionAttachment'&&validated.attachmentGuidance&&acquisition
        &&acquisition.sections.some(([h,b])=>h==='This is NOT your official disposition'&&b.includes('does not certify a disposition'))
        &&acquisition.sections.some(([h,b])=>h==='Check the actual document'&&b.includes('attach')&&b.includes('before submitting')&&b.includes('not automatically included in this PDF'))
        &&acquisition.sections.some(([h,b])=>h==='When no official record can be obtained'&&b.includes('This packet does not supply an exception request or substitute disposition.'));
      if(!missing||(!guide.includes(missing.label)&&!attachmentDisclosed))add('requiredFactsNotCollected',field.id,'required fact or exact source-specific acquisition step not disclosed in own guide');
    }
    ledger.push({field:field.id,disposition:classified.disposition,page:field.page});
  }
  for(const common of map.refusals.filter(x=>x.fieldId!=='participant.ssn'))if(!ids.has(common.fieldId))add('unclassifiedBlanks',common.fieldId,'source actor/execution field omitted');
  if(r.selectedBasis!==facts.case.basis)add('requiredOptionsMissing','case.basis','selected native route differs');
  const expectedComponents=[{documentId:FORM,role:'primary_filing',pages:[1,2,3,4],participantWritablePages:[2]},
    {documentId:'participant-instructions',role:'process_guidance',pages:[5,6,7]}];
  if(validated.attachmentGuidance)expectedComponents.push({documentId:'disposition-acquisition-guidance',role:'process_guidance',pages:[8],isActualDisposition:false});
  if(JSON.stringify(r.componentPages)!==JSON.stringify(expectedComponents))add('requiredComponentsMissing','components','actual selected instruments/pages differ');
  const allPages=r.componentPages.flatMap(x=>x.pages);
  if(JSON.stringify(allPages)!==JSON.stringify(Array.from({length:expected.pages},(_,i)=>i+1)))add('requiredComponentsMissing','pages','component pages do not exhaust actual output');
  assert.equal(r.readyToSubmit,false);
  // Appearance reuse is explicitly independent and version bound, not a fresh
  // self-review: original108 pages + accepted page7 delta cover every output.
  assert.equal(delta.proofObligations.CLIPPING_AND_OVERLAP.result,'PASS');
  assert.equal(delta.measuredCoverage.completePageInstancesCompared,108);
  assert.equal(original.ownChecks.textWritesPassed,original.ownChecks.textWrites);
  assert.equal(original.ownChecks.protectedRegionsPassed,original.ownChecks.protectedRegions);
  for(const k of PASS_COUNTERS)globalCounters[k]+=counters[k];
  fixtures.push({fixture:artifact.fixture,sha256:expected.sha256,pageCount:expected.pages,fieldInstances:ledger.length,
    written:r.writes.length,blank:r.blanks.length,counters,findings,ledger,
    participantFactDiagnostic:artifact.fixture==='missing-participant-facts',
    expectedStage:r.missingParticipantFacts.some(x=>x.fieldId==='officialDispositionAttachment')?'PREPARED_REQUIRES_ACTUAL_DISPOSITION_DOCUMENT':artifact.fixture==='missing-participant-facts'?'INCOMPLETE_PARTICIPANT_FACT_DIAGNOSTIC':'PREPARED_REQUIRES_PRIVATE_MANUAL_COMPLETION',
    requiredManualOrDocumentFields:validated.missing.map(x=>x.fieldId),submissionReady:false});
}
const totals={fieldInstances:fixtures.reduce((n,x)=>n+x.fieldInstances,0),written:fixtures.reduce((n,x)=>n+x.written,0),blank:fixtures.reduce((n,x)=>n+x.blank,0),
  classifiedProtected:fixtures.flatMap(x=>x.ledger).filter(x=>x.disposition==='PROTECTED_FIELD').length,
  requiredBeforeFiling:fixtures.flatMap(x=>x.ledger).filter(x=>x.disposition==='REQUIRED_BEFORE_FILING').length};
assert.equal(totals.fieldInstances,785);assert.equal(totals.written,188);assert.equal(totals.blank,597);
assert.equal(totals.classifiedProtected,570);assert.equal(totals.requiredBeforeFiling,27);
const allZero=Object.values(globalCounters).every(x=>x===0);
const report={schemaVersion:'rcap-independent-fixture-static-measurements/v1',reviewer:'/root/independent_md_review',
  verdict:allZero?'PASS':'FAIL_REPAIR_REQUIRED',familyId:FAMILY,scope:'All15 exact reviewed fixture field/report partitions; static preparation only',
  currentClassifier:identity('scripts/rcap-packet-completeness/completeness-contract.mjs'),currentNormalizer:identity(readerPath),
  measurementScript:identity('scripts/rcap-packet-recovery/session10/measure-ga-all-fixture-static.mjs'),
  actualActorProofReused:identity(`${out}/installed-native-audit.json`),
  originalIndependentVisualAndGlyphProof:identity(`${out}/ga-measurements-03.json`),
  acceptedIndependentWarningDelta:identity(`${out}/ga-warning-delta-04.json`),
  counters:globalCounters,allZero,totals,fixtures,
  independentEvidenceAttribution:'Original Chat4 188/188 text writes,171/171 supplied facts,17/17 offense strings,90/90 protected regions,27/27 missing disclosures and108 complete pages are reused on exact unchanged source/form/fact outputs; accepted Warning V2 delta supplies changed page7 coverage. Those observations are not relabeled fresh.',
  runtimeCounters:null,submissionAuthority:false,newRasterImages:0,newRendererRuns:0};
fs.writeFileSync(`${out}/all-fixture-static-measurements.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verdict:report.verdict,totals,counters:globalCounters,findings:fixtures.flatMap(x=>x.findings.map(f=>({fixture:x.fixture,...f})))},null,2));
if(!allZero)process.exitCode=1;
