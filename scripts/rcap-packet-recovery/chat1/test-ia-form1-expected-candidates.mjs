import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {auditPreparedInputs} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {IA_FORM1_FAMILY,IA_FORM1_DIRECTORY,IA_FORM1_ROUTE,iaForm1CandidateMatrix,auditIaForm1ExpectedOutcomes,createDeclaredIaForm1Delivery,bindDeclaredIaForm1Delivery,selectDeclaredIaForm1Fixture,resolveIaForm1RasterEnrollment} from './ia-form1-expected-candidates.mjs';

const family={familyId:IA_FORM1_FAMILY,directory:IA_FORM1_DIRECTORY,routeKeys:[IA_FORM1_ROUTE],implementationStrategy:'official_pdf_fill'};
const read=file=>fs.readFileSync(file),json=file=>JSON.parse(read(file)),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const guard=json('data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ia-form1-closure/exact-candidate-install.json');
const originals=new Map(guard.files.map(item=>[item.path,sha(read(item.path))]));
const binding={family:family.familyId,routeKeys:family.routeKeys,paymentEligible:false,sponsorshipEligible:false};
const record=createDeclaredIaForm1Delivery(family,binding);
const items=record.binding.conditionalDelivery.fixtureBindings;
const invoke=inputs=>auditPreparedInputs(family.directory,family.familyId,inputs);
const audited=auditIaForm1ExpectedOutcomes(family,invoke);

test('actual shared importer measures supported171areas and preserves aggregate285areas/two expected errors',()=>{
  assert.equal(audited.result,'PASS_COMPLETE');assert.equal(audited.totals.terminalFields,171);assert.equal(audited.totals.written,74);assert.equal(audited.totals.blank,97);
  assert(Object.values(audited.counters).every(value=>value===0));
  const all=audited.expectedOutcomeAccounting;assert.equal(all.rawAggregate.result,'FAIL_ROUTE_SELECTION');assert.equal(all.rawAggregate.totals.terminalFields,285);assert.equal(all.rawAggregate.counters.requiredOptionsMissing,2);
  assert.equal(all.fixtures.length,5);assert.equal(all.allDeclaredFixturesAccountedFor,true);assert.equal(all.expectedDay180RefusalPreserved,true);
  assert.equal(all.fixtures.find(item=>item.fixture==='exact-day-180').result.result,'FAIL_ROUTE_SELECTION');
  assert.equal(all.fixtures.find(item=>item.fixture==='missing-contact').readiness.missingParticipantFacts,11);
});
for(const item of items) test(`${item.fixture}: exact complete PDF, selected components and own whole guide section`,()=>{
  const options=item.diagnostic?{deliveryPurpose:'diagnostic-preview'}:{};
  const result=selectDeclaredIaForm1Fixture(record,json(item.input.file),item.fixture,options);
  assert.equal(result.sha256,sha(read(item.file)));assert.equal(result.guide.sha256,sha(read(item.guide.file)));
  assert.equal(result.guide.section.sha256,sha(Buffer.from(result.guideMarkdown)));
  assert.equal(result.guideMarkdown.startsWith(`## ${item.fixture}\n`),true);
  assert.equal(result.components[0].pages,3);assert.equal(result.components.at(-1).fileWithCourt,false);
  assert.equal(result.filingPositive,false);assert.equal(result.filingPermitted,false);assert.equal(result.runtimeInstalled,false);
  assert.equal(result.participantExecutionCompleted,false);assert.equal(result.grantsDeliveryAuthority,false);
  assert.equal(result.components.some(component=>component.id==='participant-good-cause-statement'),item.fixture==='good-cause-waiver');
});
for(const fixture of ['exact-day-180','missing-contact']) test(`${fixture}: default delivery refuses a diagnostic as a positive draft`,()=>{
  const item=items.find(item=>item.fixture===fixture);
  assert.throws(()=>selectDeclaredIaForm1Fixture(record,json(item.input.file),fixture),/DIAGNOSTIC_NOT_FILING_POSITIVE/);
  assert.throws(()=>selectDeclaredIaForm1Fixture(record,json(item.input.file),fixture,{deliveryPurpose:'filing-positive'}),/DIAGNOSTIC_NOT_FILING_POSITIVE/);
});
test('missing-contact preserves12controls/11unknownfacts and no invented service recipient',()=>{
  const item=items.find(item=>item.fixture==='missing-contact');assert.equal(item.readiness.missingParticipantControlAreas,12);assert.equal(item.readiness.unknownFactIds.length,11);
  assert(item.readiness.unknownFactIds.includes('missing-contact:countyAttorney.address'));assert.equal(item.readiness.filingReady,false);
});
test('all five complete outputs enrolled; diagnostics retain explicit negative-delivery treatment',async()=>{
  const result=await resolveIaForm1RasterEnrollment(family);assert.equal(result.documents.length,5);
  assert.equal(result.documents.reduce((sum,item)=>sum+item.pageCount,0),26);assert.deepEqual(result.coverage.notRenderedByThisGate,[]);
  assert.deepEqual(result.documents.map(item=>item.path).sort(),items.map(item=>item.file).sort());
  assert.equal(result.documents.filter(item=>item.diagnostic).length,2);assert(result.documents.every(item=>item.filingPositive===false));
  assert.equal(result.canonical.name,'canonical.pdf');assert.equal(result.boundary.name,'boundary.pdf');
});
for(const [name,fixture,mutate] of [
  ['wrong participant','canonical',input=>{input.name='Other Person';}],
  ['changed source date','boundary',input=>{input.assessmentDate='2026-09-08';}],
  ['changed selected service method','boundary',input=>{input.filingMethod='paper';}],
  ['new known phone borrowing blank diagnostic','missing-contact',input=>{input.phone='3195550101';}],
  ['exact day180 changed to181 borrowing old output','exact-day-180',input=>{input.assessmentDate='2026-09-08';}],
  ['unsupported179-day assertion','canonical',input=>{input.dispositionDate='2026-03-12';}],
  ['missing acknowledgment','canonical',input=>{delete input.acknowledgments.provideCopy;}],
  ['invented signature','canonical',input=>{input.signature='Signed';}],
  ['invented fee election','canonical',input=>{input.applicationFeePaid=true;}],
  ['software-authored narrative','good-cause-waiver',input=>{input.narrativeAuthorship='software';}],
  ['identity waiver without legal assistance','good-cause-waiver',input=>{input.waiverBasis='identity-theft';}],
  ['different participant narrative','good-cause-waiver',input=>{input.goodCauseNarrative+=' Changed facts.';}],
]) test(`actual validator and exact input binding reject ${name}`,()=>{
  const item=items.find(item=>item.fixture===fixture),input=json(item.input.file);mutate(input);
  assert.throws(()=>selectDeclaredIaForm1Fixture(record,input,fixture,{deliveryPurpose:'diagnostic-preview'}));
});
test('real participant input cannot use a retained synthetic packet',()=>{
  const item=items[0],input=json(item.input.file);input.synthetic=false;
  assert.throws(()=>selectDeclaredIaForm1Fixture(record,input,item.fixture),/PARTICIPANT_RENDER_REQUIRED/);
});
for(const [name,mutate] of [
  ['installed status',r=>{r.runtimeInstalled=true;}],
  ['payment authority',r=>{r.binding.paymentEligible=true;}],
  ['sponsored authority',r=>{r.binding.sponsorshipEligible=true;}],
  ['wrong route',r=>{r.binding.routeKeys=['wrong'];}],
  ['diagnostic relabeled positive',r=>{r.binding.conditionalDelivery.fixtureBindings[3].diagnostic=false;}],
  ['dropped selected waiver sheet',r=>{r.binding.conditionalDelivery.fixtureBindings[2].components.splice(1,1);}],
]) test(`declared selector rejects ${name}`,()=>{
  const copy=structuredClone(record);mutate(copy);assert.throws(()=>selectDeclaredIaForm1Fixture(copy,json(items[0].input.file),items[0].fixture));
});
for(const target of [
  'reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-1-2024-08.pdf',
  `${family.directory}/reports/packet-level-readiness.json`,`${family.directory}/reports/fixture-input-facts.json`,
  `${family.directory}/reports/rendered-artifacts.json`,`${family.directory}/participant-instructions.md`,
  'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ia-form1-closure/current-august2026-chapter2.pdf',
]) test(`changed reviewed input cannot borrow prior proof: ${target.split('/').at(-1)}`,()=>{
  const options={readFile:file=>{const bytes=Buffer.from(read(file));if(file===target)bytes[100]^=1;return bytes;}};
  assert.throws(()=>iaForm1CandidateMatrix(family,options));
});
test('partial output inventory refuses declaration',()=>{
  const report=json(`${family.directory}/reports/rendered-artifacts.json`);report.fixtures.pop();
  assert.throws(()=>bindDeclaredIaForm1Delivery(record,family,{report}),/differs from reviewed bytes/);
});
test('partial purported central pass cannot cover all selected branches',()=>{
  const raster={familyId:family.familyId,rasterReceipt:{verdict:'RASTER_PASS',coversTheWholeFamily:true,documentsMeasured:2}};
  assert.throws(()=>bindDeclaredIaForm1Delivery(record,family,{raster}));
});
for(const [name,mutate] of [
  ['known case omitted from both write lists',p=>{const row=p.fieldMap.writes.find(row=>row.fieldId==='canonical:2.86-1.cap.04');if(!row)return;p.fieldMap.writes=p.fieldMap.writes.filter(item=>item!==row);p.fieldMap.refusals.push({...row,completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true});for(const doc of p.actualWrites.documents)if(doc.fixture==='canonical')doc.actualWrites=doc.actualWrites.filter(item=>item.field!=='2.86-1.cap.04');}],
  ['genuinely missing contact counter laundered with known fact',p=>{p.fieldMap.availableFacts['missing-contact:phone']='3195550101';}],
  ['expected negative removed',p=>{p.fieldMap.refusals=p.fieldMap.refusals.filter(row=>!['exact-day-180:2.86-1.03.00','exact-day-180:2.86-1.03.AB'].includes(row.fieldId));}],
  ['unrelated required option added',p=>{p.fieldMap.refusals.push({fieldId:'canonical:regression',label:'Required option',isSelectionControl:true,routeDetermined:true});}],
  ['required undisclosed information',p=>{p.fieldMap.refusals.push({fieldId:'canonical:new-undisclosed',label:'Required undisclosed residence',completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true});}],
  ['unclassified source blank',p=>{p.fieldMap.refusals[0].completenessDisposition='NOT_A_REAL_DISPOSITION';}],
  ['incomplete repeating row',p=>{p.fieldMap.writes.push({fieldId:'canonical:row.a',fieldName:'Item9[0].Row7[0].CaseNo[0]',label:'Case number',value:'CASE'});p.fieldMap.refusals.push({fieldId:'canonical:row.b',fieldName:'Item9[0].Row7[0].Section[0]',label:'Section'});}],
  ['protected actor write',p=>{p.fieldMap.writes.push({fieldId:'canonical:fake-signature',label:'Participant signature',value:'Signed'});}],
  ['actual invisible writes',p=>{p.actualWrites.artifacts[0].addedGlyphsReadFromOutputBytes=0;p.actualWrites.artifacts[0].flattenedWidgetAppearancesReadFromOutputBytes=0;}],
  ['actual visual defect',p=>{p.actualWrites.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=1;}],
  ['missing component',p=>{p.fieldMap.writes.push({fieldId:'canonical:absent-component',label:'Case number',value:'CASE',documentId:'ABSENT'});}],
]) test(`actual shared importer regression remains fatal: ${name}`,()=>{
  assert.throws(()=>auditIaForm1ExpectedOutcomes(family,inputs=>{mutate(inputs);return invoke(inputs);}));
});
test('zero-area audit cannot satisfy exhaustive expected outcomes',()=>{
  assert.throws(()=>auditIaForm1ExpectedOutcomes(family,inputs=>{const r=invoke(inputs);r.totals.terminalFields=0;return r;}));
});
test('passing aggregate does not hide a lost per-fixture expected refusal',()=>{
  assert.throws(()=>auditIaForm1ExpectedOutcomes(family,inputs=>{
    const r=invoke(inputs);
    if(inputs.fieldMap.writes.length+inputs.fieldMap.refusals.length===57 && inputs.fieldMap.refusals[0].fixture==='exact-day-180') {
      r.result='PASS_COMPLETE';r.counters.requiredOptionsMissing=0;r.findings=[];
    }
    return r;
  }),/Expected Iowa day180 refusal was lost/);
});
test('supported combined partition is measured after individual outcomes',()=>{
  assert.throws(()=>auditIaForm1ExpectedOutcomes(family,inputs=>{
    if(inputs.fieldMap.writes.length+inputs.fieldMap.refusals.length===171) inputs.actualWrites.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=1;
    return invoke(inputs);
  }),/partition failed/);
});
test('unrelated families remain unchanged through declaration and enrollment',async()=>{
  const other={familyId:'other'},r={untouched:true};assert.equal(bindDeclaredIaForm1Delivery(r,other),r);assert.equal(createDeclaredIaForm1Delivery(other,{}),null);assert.equal(await resolveIaForm1RasterEnrollment(other),null);
});
test('all65 candidate files remain unchanged after every control',()=>{
  for(const [file,digest] of originals)assert.equal(sha(read(file)),digest,file);
});
