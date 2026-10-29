import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import{execFileSync}from'node:child_process';
import{PDFDocument}from'pdf-lib';
import{finalizeOfficialForm}from'./rcap-official-forms/rcap-official-form-finalize.mjs';
import{APPEARANCE_DISPOSITION}from'./rcap-official-forms/rcap-appearance-semantics.mjs';
import{settledIndianaSection1ParticipantSelections as select}from'./lib/indiana-cca-section1-route-selections.mjs';
import{enrichIndianaSection1Fixture,factsForIndianaInsertCase,applyIndianaSection1OccurrencePlan}from'./lib/indiana-cca-section1-occurrence-repair.mjs';
const sourceRoot=process.env.IN_SECTION1_SOURCE_ROOT??'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1';
const source=path.join(sourceRoot,'STATES/IN/02_PACKET_FORMS/IN__FORM__CCA-SECTION1-INSERTS__section-1-non-conviction-expungement-facts-findings-and-exhibit-inserts__REV-2020-01__EN.pdf');
assert(fs.existsSync(source),'BLOCKED_SOURCE: supply the existing verified IN_SECTION1_SOURCE_ROOT; no source substitution');
const raw=fs.readFileSync(source),sha=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(sha(raw),'65500e2cf0916fddbe20afc0e12906c03c7e10aefd148de71b48bc9782f04707');
const frozenBytes=fs.readFileSync('scripts/fixtures/indiana-section1-native-selection.json'),frozen=JSON.parse(frozenBytes),facts=factsForIndianaInsertCase(enrichIndianaSection1Fixture(frozen,'in_section1_petition'),0);
const choices=select({trackId:'in_section1_petition',dispositions:['all_charges_dismissed'],facts});
// Independent source-bound expectations: FACTS participant boxes17,19,25; never court FINDINGS page3.
assert.deepEqual(Object.keys(choices).sort(),['Check Box17','Check Box19','Check Box25'].sort());
const document=await PDFDocument.load(raw),form=document.getForm();
const courtBoxes=['Check Box16','Check Box18','Check Box20','Check Box22','Check Box24','Check Box27','Check Box28','Check Box30'];
const baselineCourt=Object.fromEntries(courtBoxes.map(name=>[name,form.getCheckBox(name).isChecked()]));
for(const field of Object.keys(choices))form.getCheckBox(field).check();
const roundTrip=await PDFDocument.load(await document.save({useObjectStreams:false}));
for(const field of ['Check Box17','Check Box19','Check Box25'])assert.equal(roundTrip.getForm().getCheckBox(field).isChecked(),true);
for(const field of ['Check Box15','Check Box21','Check Box23','Check Box26'])assert.equal(roundTrip.getForm().getCheckBox(field).isChecked(),false);
for(const field of courtBoxes)assert.equal(roundTrip.getForm().getCheckBox(field).isChecked(),baselineCourt[field]);
const census=JSON.parse(fs.readFileSync('data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/field-census.census-v1.json')).documents.find(d=>d.documentId==='IN-CCA-SECTION1-NONCONVICTION-INSERT-FORMS');
assert(census);const selected=await finalizeOfficialForm({sourceBytes:raw,expectedSha256:sha(raw),census:census.fields,facts,explicitMappings:{},selectionsFromHeldFacts:choices,unwritableFields:census.fields.filter(field=>!Object.hasOwn(choices,field.name)).map(field=>({field:field.name,class:'not_settled_by_this_frozen_matter'})),documentTextLines:census.documentTextLines,appearanceDispositions:new Map(census.fields.filter(f=>f.type==='dropdown'||f.type==='optionlist').map(f=>[f.name,APPEARANCE_DISPOSITION.PRESERVE_SOURCE_APPEARANCE])),preserveUnwrittenChoiceAppearances:true});
assert.equal(selected.report.written.length,3,'generic binder must not write officer, agency IDs, related cases or court findings');
for(const field of ['Check Box17','Check Box19','Check Box25'])assert(selected.report.written.some(w=>w.field===field&&w.kind==='selection_settled_from_held_facts'),'production finalizer must actually write '+field);
const actual=await applyIndianaSection1OccurrencePlan({bytes:selected.bytes,docKey:'inserts',census,facts,trackId:'in_section1_petition',officialSourceSha256:sha(raw)});
const out=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:fs.mkdtempSync(path.join(os.tmpdir(),'in-native-controls-'));
assert(out&&path.isAbsolute(out)&&out.startsWith('/tmp/'));fs.mkdirSync(out,{recursive:true});const pdf=path.join(out,'native-insert-control.pdf');fs.writeFileSync(pdf,actual.bytes);
const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'}),rawText=execFileSync('pdftotext',['-raw',pdf,'-'],{encoding:'utf8'}),pages=text.split('\f').filter(s=>s.trim());assert.equal(pages.length,4);
// Values are manually specified rather than extracted to construct their own expected result.
for(const value of ['Lena Stone','01/07/1995','01/01/2020','01/02/2020','49D01-2001-CM-001234','Criminal trespass','10/28/2026'])assert(rawText.includes(value),'missing frozen value '+value);
for(const name of ['Jordan Avery Reyes','Morgan Sample','Acceptance Consumer','Alexandrina-Katharine'])assert(!text.includes(name));
assert(!actual.occurrenceWrites.some(w=>w.page===3),'no participant overlay writes on judicial FINDINGS');
// Expected facts keyed to actual printed field labels, independently of generated PDF text.
const expectedFields={
 'DD-ArrestOrSummons':{value:'arrested',pages:[1]},County:{value:'Marion',pages:[1]},ArrestDate:{value:'01/01/2020',pages:[1,4]},'DD-CountNumber':{value:'I',pages:[1,4]},
 'cap-PetitionerFullName':{value:'Lena Stone',pages:[4]},PetDOB:{value:'01/07/1995',pages:[4]},CountyCityArrest:{value:'Indianapolis / Marion County',pages:[4]},
 DateChargesFiled:{value:'01/02/2020',pages:[1]},'DD-HowChargesFiled':{value:'criminal charged as an adult',pages:[1]},CauseNumber:{value:'49D01-2001-CM-001234',pages:[1]},
 'OffenseDescript-Ct1':{value:'Criminal trespass',pages:[1,4]},'DD-LevelChoice-Ct1':{value:'class',pages:[1,4]},'DD-ChargeLevel-Ct1':{value:'A',pages:[1,4]},'DD-Misd/Felony-Ct1':{value:'misdemeanor',pages:[1,4]},
 DateChargesDismissed:{value:'10/28/2026',pages:[1]},'Criminal Cause Number':{value:'49D01-2001-CM-001234',pages:[4]},'Date of Dismissal':{value:'10/28/2026',pages:[4]},'ChargeDisposition-Ct1':{value:'Dismissed',pages:[4]}
};
for(const w of actual.occurrenceWrites){const expected=expectedFields[w.field];assert(expected,'unexpected source field '+w.field);assert.equal(w.value,expected.value,'wrong frozen fact in '+w.field);assert(expected.pages.includes(w.page),'wrong actor/page for '+w.field);}
for(const field of Object.keys(expectedFields))assert(actual.occurrenceWrites.some(w=>w.field===field),'missing field-specific expected fact '+field);

for(const word of ['undefined','NaN'])assert(!text.includes(word),'missing facts cannot become printed '+word);
assert(!text.includes('1995-01-07'),'birth date is printed once in the native MM/DD/YYYY vehicle');
assert.equal((text.match(/01\/07\/1995/g)??[]).length,1);
assert.equal((text.match(/49D01-2001-CM-001234/g)??[]).length,2,'criminal cause belongs only in the actual criminal cause fields');
assert(!/by\s+Lena Stone/.test(pages[0]),'participant cannot be the unknown arresting officer');
for(const forbidden of ['Lena Stone','49D01-2001-CM-001234','01/07/1995','10/28/2026'])assert(!pages[2].includes(forbidden),'court FINDINGS source stays blank: '+forbidden);
const unknownRoleFields=['PersonArresting','LEACaseNumber','AppellateCauseNumber','DateAppellateDecFinal'];
assert(!actual.occurrenceWrites.some(w=>unknownRoleFields.includes(w.field)),'missing officer/agency/appellate facts must remain blank');

assert.equal(sha(fs.readFileSync(source)),sha(raw),'source remained immutable');
const report={status:'PASS_NATIVE_IN_SECTION1_CONTROLS',sourceSha256:sha(raw),frozenInputSha256:sha(frozenBytes),artifactSha256:sha(actual.bytes),pageCount:4,participantChoices:['Check Box17','Check Box19','Check Box25'],courtChoicesUntouched:true,shorterWaitNotInvented:true,independentCaseFactsPresent:true,priorParticipantAbsent:true,participantWritesExcludeCourtFindingsPage:true,sourceUnchanged:true,genericBinderWritesOnlyThreeParticipantChoices:true,unknownOfficerAgencyAndOtherCaseFieldsRemainBlank:true,blankCourtFindingsIndependentlyVerified:true,completePacket:false,scope:'Focused native required-form control and occurrence regression, not a family rebuild, complete packet, approval, checkout, hosted or production proof',output:out};fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
