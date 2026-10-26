import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const F = await import('../src/lib/expungement-ai/ny-16059-future-applications.ts');
const futureFixture = answers => {
 if (F.nyFutureIntent(answers) !== true) return {};
 const c = { ...F.emptyNyFutureCase('future-case'), source: 'saved_future' };
 c.savedReview = F.nyFutureCaseReview(F.nyFutureReferences(answers), c);
 return { [F.NY_FUTURE_ID]: F.encodeNyFutureApplications({ version: F.NY_FUTURE_CONTRACT, applications: [{ id: 'future-application', laws: ['16059'], cases: [c] }] }) };
};
const H = await import('../src/lib/expungement-ai/ny-16059-sealing-history.ts');
const noPriorSealingRecords = { [H.NY_SEALING_HISTORY_ID]: H.encodeNySealingHistory({ ...H.emptyNySealingHistory(), prior16058Application: 'no' }) };
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const R = await import('../src/lib/expungement-ai/ny-16059-case-records.ts');
const C = await import('../src/lib/expungement-ai/ny-16059-case-classification.ts');
const Q = await import('../src/lib/expungement-ai/ny-16059-case-questions.ts');
const { ny16059ProtectedDocumentPreparation: prepare } = await import('../src/lib/expungement-ai/ny-16059-document-preparation.ts');
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/ny-16059-pre-classification.json', import.meta.url)));
const checks = [], check = (id, pass) => checks.push({ id, pass: !!pass });
const same = (a,b) => { try { assert.deepEqual(a,b); return true; } catch { return false; } };
const item = { id: 'synthetic-classification', jurisdiction: 'NY', artifactRefs: {} };
const patch = (record, answers, verify=false) => P.packetInformationPatch({existingItem:item, protectedVerification:record, answers, verify})?.protectedTransition.nextVerification;
// Retained predecessor fixtures predate these source-owned caption fields.
// Supply explicit new synthetic facts through the ordinary protected transition;
// do not rewrite old snapshots or weaken their verification hold.
const supplyCurrentCaptionFacts = (record, prefix) => {
 const facts = {date_of_birth:{value:'1980-02-03',unknown:false},street_address:{value:'123 Synthetic Example Street',unknown:false},city_state_zip:{value:'Albany, NY 12207',unknown:false},phone_number:{value:'202-555-0101',unknown:false}};
 const ids = Object.keys(facts), before = structuredClone(record), missing = P.protectedPacketInformationModelFor(record).missingInputIds;
 check(prefix+'/old fixture lacks exactly the four current caption facts', same(missing.filter(id=>ids.includes(id)).sort(), [...ids].sort()));
 check(prefix+'/missing caption facts cannot reuse final verification', patch(record,{},true)?.status !== 'verified');
 const saved = patch(record,facts), current = P.protectedPacketInformationModelFor(saved);
 check(prefix+'/explicit caption save preserves other missing obligations', same(current.missingInputIds, missing.filter(id=>!ids.includes(id))));
 check(prefix+'/explicit caption save records each new fact', ids.every(id=>same(saved.draftSnapshot.packetAnswers[id],facts[id])));
 check(prefix+'/caption transition leaves historical record unchanged', same(record,before));
 return saved;
};
const classify = (records, level='misdemeanor', categories=['none']) => {
 for (const record of records) for (const conviction of record.convictions) {
  conviction.classification = C.withNyClassificationAnswer(conviction,'recordClass',level);
  conviction.classification = C.withNyClassificationAnswer(conviction,'excluded',categories);
 }
 return records;
};
for (const row of fixture.rows) {
 const old = structuredClone(row.verifiedRecord), untouched = structuredClone(old), id=row.id;
 const m = P.protectedPacketInformationModelFor(old);
 check(id+'/prior genuine verification retained',old.status==='verified' && row.genuineVerification);
 check(id+'/old record read without mutation',same(old,untouched));
 check(id+'/new required classifications hold old verification',m && m.stage!=='ready_to_generate' && m.missingInputIds.includes(R.NY_CASE_RECORDS_ID));
 check(id+'/old full arrays reach owner editor',same(m.initialAnswers[R.NY_CASE_RECORDS_ID],old.snapshot.packetAnswers[R.NY_CASE_RECORDS_ID]));
 check(id+'/case control stays editable',P.editablePacketInputIds(m,true).has(R.NY_CASE_RECORDS_ID));
 check(id+'/cannot verify by empty save',patch(old,{},true)?.status!=='verified');
 const original=R.parseNyCourtCaseRecords(m.initialAnswers[R.NY_CASE_RECORDS_ID]);
 check(id+'/legacy parser does not invent classifications',original.every(record=>record.convictions.every(c=>!Object.hasOwn(c,'classification'))));
 const level=id.includes('literal-felony')||id.includes('literal-excluded')?'felony':id.includes('literal-violation')?'violation':'misdemeanor';
 const categories=id.includes('literal-excluded')?['article_125_felony','class_a_felony']:['none'];
 const records=classify(structuredClone(original),level,categories), wire=R.encodeNyCourtCaseRecords(records);
 let current=patch(old,{...noPriorSealingRecords,...futureFixture(m.initialAnswers),[R.NY_CASE_RECORDS_ID]:wire}); let model=P.protectedPacketInformationModelFor(current);
 check(id+'/declarations saved without parsing original record text',same(current.draftSnapshot.packetAnswers[R.NY_CASE_RECORDS_ID],wire));
 check(id+'/original full array retained in history',current.draftSnapshot.dependencies.semanticAnswerHistory.some(e=>e.factId===R.NY_CASE_RECORDS_ID&&same(e.value,m.initialAnswers[R.NY_CASE_RECORDS_ID])));
 check(id+'/preparation grants no source or legal authority',prepare(current)?.generationAllowed===false&&prepare(current)?.casePreparation.legalConvictionGroupCount===null);
 if(level==='felony')check(id+'/felony conflicts with both zero counts',['ny_16059_history_felonies','ny_16059_requested_felonies'].every(fact=>model.nyCaseIssues.some(i=>i.code==='declared_felony_conflict'&&i.id===fact)));
 if(categories.includes('class_a_felony'))check(id+'/exclusion contradicts aggregate No',model.nyCaseIssues.some(i=>i.code==='declared_exclusion_conflict'));
 if(level==='violation')check(id+'/violation stays review without record deletion',model.nyCaseIssues.some(i=>i.code==='declared_noncrime_request')&&same(prepare(current).casePreparation.records.map(({certificateAttachmentIncluded,...r})=>r),records));
 if(level!=='misdemeanor')check(id+'/inconsistent declarations cannot verify',patch(current,{},true)?.status!=='verified');
 else {
  current=supplyCurrentCaptionFacts(current,id);model=P.protectedPacketInformationModelFor(current);
  check(id+'/coherent actual declarations allow final fact review',model.reviewSafety.safe&&model.missingInputIds.length===0);
  check(id+'/explicit final verification succeeds',patch(current,{},true)?.status==='verified');
  for(const field of ['charge','section','grade','id']) {
   const changed=structuredClone(records);changed[0].convictions[0][field]+='-changed';let cv=changed[0].convictions[0];
   check(id+'/changed '+field+' invalidates both independent answers',!C.nyClassificationAnswerCurrent(cv,'recordClass')&&!C.nyClassificationAnswerCurrent(cv,'excluded'));
   const held=patch(current,{[R.NY_CASE_RECORDS_ID]:R.encodeNyCourtCaseRecords(changed)});
   check(id+'/stale '+field+' answer held and readable',held&&P.protectedPacketInformationModelFor(held).missingInputIds.includes(R.NY_CASE_RECORDS_ID)&&prepare(held).casePreparation.records[0].convictions[0][field]===cv[field]);
   cv.classification=C.withNyClassificationAnswer(cv,'recordClass','misdemeanor');
   check(id+'/class correction never renews excluded '+field,C.nyClassificationAnswerCurrent(cv,'recordClass')&&!C.nyClassificationAnswerCurrent(cv,'excluded')&&!C.nyClassificationComplete(cv));
   cv.classification=C.withNyClassificationAnswer(cv,'excluded',['none']);check(id+'/separate confirmation restores '+field,C.nyClassificationComplete(cv));
  }
  for(const [name,level,categories,code] of [['registration','misdemeanor',['registration_6c'],'declared_registration_conflict'],['misdemeanor felony-category','misdemeanor',['article_125_felony'],'declared_class_category_conflict'],['misdemeanor article130','misdemeanor',['article_130'],'declared_exclusion_conflict'],['misdemeanor article263','misdemeanor',['article_263'],'declared_exclusion_conflict']]){
   const changed=classify(structuredClone(records),level,categories),held=patch(current,{[R.NY_CASE_RECORDS_ID]:R.encodeNyCourtCaseRecords(changed)});
   check(id+'/'+name+' visible conflict',P.protectedPacketInformationModelFor(held).nyCaseIssues.some(i=>i.code===code));
  }
  for(const [kind,value] of [['recordClass','unknown'],['recordClass',''],['excluded',['unknown']],['excluded',[]]]){
   const changed=structuredClone(records);const cv=changed[0].convictions[0];cv.classification=C.withNyClassificationAnswer(cv,kind,value);
   check(id+'/'+kind+' '+JSON.stringify(value)+' never known',!C.nyClassificationComplete(cv));
   check(id+'/'+kind+' unknown cannot verify',patch(patch(current,{[R.NY_CASE_RECORDS_ID]:R.encodeNyCourtCaseRecords(changed)}),{},true)?.status!=='verified');
  }
  for(const zero of [0,'0','00','000',{value:'00',unknown:false}]) {
   const changed=classify(structuredClone(records),'felony');
   const held=patch(current,{[R.NY_CASE_RECORDS_ID]:R.encodeNyCourtCaseRecords(changed),ny_16059_requested_felonies:zero,ny_16059_history_felonies:zero});
   check(id+'/normalized zero contradicts declared felony '+JSON.stringify(zero),P.protectedPacketInformationModelFor(held).nyCaseIssues.filter(i=>i.code==='declared_felony_conflict').length===2&&patch(held,{},true)?.status!=='verified');
  }
  for(const negative of ['No','NO',' no ','false',false,'No, none',{value:'NO',unknown:false}]) {
   const changed=classify(structuredClone(records),'misdemeanor',['registration_6c']);
   const held=patch(current,{[R.NY_CASE_RECORDS_ID]:R.encodeNyCourtCaseRecords(changed),ny_16059_requested_excluded:negative,ny_16059_sex_offender_registration:negative});
   check(id+'/normalized negative contradiction '+JSON.stringify(negative),['declared_exclusion_conflict','declared_registration_conflict'].every(code=>P.protectedPacketInformationModelFor(held).nyCaseIssues.some(i=>i.code===code))&&patch(held,{},true)?.status!=='verified');
  }
  const text=R.formatNyCourtCaseRecords(wire,'es');check(id+'/classification summary labels not binding JSON',text.includes('Delito menor (misdemeanor)')&&text.includes('Ninguna de estas categorías')&&!text.includes('convictionId')&&!text.includes('recordClass'));
  for (const [category, adverse] of [['article_130',{ny_16059_requested_excluded:'Yes'}],['registration_6c',{ny_16059_requested_excluded:'Yes',ny_16059_sex_offender_registration:'Yes'}]]) {
   const prefix=id+'/truthful adverse '+category;
   const excludedWire=R.encodeNyCourtCaseRecords(classify(structuredClone(records),'misdemeanor',[category]));
   const adverseRecord=patch(patch(current,{[R.NY_CASE_RECORDS_ID]:excludedWire}),adverse), adverseModel=P.protectedPacketInformationModelFor(adverseRecord);
   check(prefix+'/truthful answer holds authority',adverseModel.packetPlan===null&&!adverseModel.reviewSafety.safe&&adverseRecord.draftSnapshot.paymentAllowed===false);
   check(prefix+'/case editor and held navigation retained',adverseModel.questions.some(q=>q.id===R.NY_CASE_RECORDS_ID&&q.type==='court_case_records')&&P.editablePacketInputIds(adverseModel,true).has(R.NY_CASE_RECORDS_ID)&&P.heldPacketCorrectionInputIds(adverseModel,adverseRecord.draftSnapshot.resultCode).has(R.NY_CASE_RECORDS_ID));
   check(prefix+'/existing case associations remain correctable',P.editablePacketInputIds(adverseModel,true).has('ny_16059_first_case_numbers'));
   const unknown=structuredClone(records);unknown[0].convictions[0].classification=C.withNyClassificationAnswer(unknown[0].convictions[0],'recordClass','unknown');
   const stale=structuredClone(records);stale[0].convictions[0].section+=' corrected';
   for(const [label,replacement] of [['known',wire],['unknown',R.encodeNyCourtCaseRecords(unknown)],['stale',R.encodeNyCourtCaseRecords(stale)],['malformed',['{broken']]]) {
    const saved=patch(adverseRecord,{[R.NY_CASE_RECORDS_ID]:replacement}), held=P.protectedPacketInformationModelFor(saved);
    check(prefix+'/'+label+' actual case edit saved',same(saved.draftSnapshot.packetAnswers[R.NY_CASE_RECORDS_ID],replacement));
    check(prefix+'/'+label+' previous whole case array archived',saved.draftSnapshot.dependencies.semanticAnswerHistory.some(e=>e.factId===R.NY_CASE_RECORDS_ID&&same(e.value,excludedWire)));
    check(prefix+'/'+label+' truthful adverse answers retained',Object.entries(adverse).every(([key,value])=>held.initialAnswers[key]===value));
    check(prefix+'/'+label+' cannot verify or restore plan',held.packetPlan===null&&!held.reviewSafety.safe&&patch(saved,{},true)?.status!=='verified');
    check(prefix+'/'+label+' editor remains owned',held.questions.some(q=>q.id===R.NY_CASE_RECORDS_ID)&&P.editablePacketInputIds(held,true).has(R.NY_CASE_RECORDS_ID));
   }
   const correction=patch(adverseRecord,{[R.NY_CASE_RECORDS_ID]:wire});
   const corrected=patch(correction,Object.fromEntries(Object.keys(adverse).map(key=>[key,'No'])));
   check(prefix+'/separate aggregate correction restores full fact review',!!P.protectedPacketInformationModelFor(corrected)?.packetPlan&&P.protectedPacketInformationModelFor(corrected).missingInputIds.length===0);
   check(prefix+'/only explicit final verification restores verified',corrected.status!=='verified'&&patch(corrected,{},true)?.status==='verified');
  }
 }
 const cv=records[0].convictions[0];const before=structuredClone(cv);const copy=C.withNyClassificationAnswer(cv,'recordClass',level);copy.excluded.value.push('unknown');check(id+'/helper returns no mutation alias',same(cv,before));
 for(const mutate of [v=>v.approved=true,v=>v.version='approved',v=>v.recordClass.record.convictionId=[],v=>v.excluded.value=['none','article_130'],v=>v.excluded.value=['unknown','article_263'],v=>v.excluded.value=['article_130','article_130'],v=>v.excluded.value=['unlisted'],v=>v.recordClass.value='Felony',v=>v.excluded.record.verified=true]){
  const changed=structuredClone(records);mutate(changed[0].convictions[0].classification);check(id+'/malformed declaration rejected '+checks.length,R.parseNyCourtCaseRecords(R.encodeNyCourtCaseRecords(changed))===null);
 }
}
const report={status:checks.every(c=>c.pass)?'PASS':'FAIL',checks:checks.length,failed:checks.filter(c=>!c.pass),details:checks,limits:['Pure protected transitions; actual authenticated journeys, independent source tests and qualified approval separate.','Owner declarations do not resolve statute/version/subdivision or legal grouping.']};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,checks:report.checks,failed:report.failed},null,2));assert.equal(report.failed.length,0);
