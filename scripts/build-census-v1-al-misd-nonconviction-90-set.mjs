#!/usr/bin/env node
// PF07: exact Alabama misdemeanor/nonconviction source family. Artifact-only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {makeCorpusEntryResolver} from './lib/corpus-index-paths.mjs';
import {extractTextItems, groupIntoLines, captureWidgetContext} from './rcap-official-forms/rcap-pdf-anchor-capture.mjs';
import {finalizeOfficialForm} from './rcap-official-forms/rcap-official-form-finalize.mjs';
import {flattenedWidgets, drawnAt} from './rcap-official-forms/pdf-flattened-widgets.mjs';
import {scanBytesForActiveContent} from './rcap-official-forms/rcap-active-content.mjs';
const require=createRequire(import.meta.url);
const {PDFDocument,PDFTextField,PDFName}=require('pdf-lib');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(ROOT);
const FAMILY='al-misd-nonconviction-90-set',TRACK='al-misd-nonconviction-90';
const OUT=`data/rcap-all50/overlays/census-v1/al/${FAMILY}--official-pdf-fill`;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const FIXED=new Date('2026-09-06T00:00:00Z');
const SOURCES=[
 {documentId:'CR-65',path:'LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf',sha256:'c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39',byteLength:468056,pages:8},
 {documentId:'C-10-CRIMINAL',path:'STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf',sha256:'527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8',byteLength:711433,pages:3}
];
const FIXTURES={
 canonical:{'participant.first_name':'Jordan','participant.middle_name':'Avery','participant.last_name':'Reyes','participant.full_legal_name':'Jordan Avery Reyes','participant.street_address':'412 Magnolia Avenue','participant.city_state_zip':'Montgomery, AL 36104','participant.email':'jordan.reyes@example.org','participant.phone':'334-555-0142','participant.date_of_birth':'1988-06-14','matter.county':'Montgomery','matter.court':'Circuit','matter.case_number':'DC-2024-004217','matter.charge':'Disorderly conduct','matter.grounds':'The charge was dismissed with prejudice on March 3, 2025. More than 90 days have passed.','matter.arresting_agency':'Example Police Department, 10 Example Avenue, Montgomery, AL 36104.','matter.detention_agencies':'Example County Jail, 20 Example Street, Montgomery, AL 36104.','answers.basis':'dismissed_with_prejudice','answers.disposition_date':'2025-03-03','answers.refiled':false,'answers.pro_se':true,'answers.seek_fee_waiver':true,'answers.unable_to_pay_fee':true,'answers.offense_level':'misdemeanor','answers.all_court_ordered_amounts_paid':true},
 boundary:{'participant.first_name':'Alexandria','participant.middle_name':'Catherine','participant.last_name':'Montgomery-Washington','participant.full_legal_name':'Alexandria Catherine Montgomery-Washington','participant.street_address':'1188 Martin Luther King Junior Boulevard, Apartment 1407','participant.city_state_zip':'Birmingham, AL 35203-4417','participant.email':'alexandria.montgomery.washington@example.org','participant.phone':'205-555-0199','participant.date_of_birth':'1979-12-31','matter.county':'Jefferson','matter.court':'Circuit','matter.case_number':'DC-2024-000001.99','matter.charge':'Disorderly conduct','matter.grounds':'The charge was nolle prossed without conditions on February 12, 2025. More than 90 days have passed and it has not been refiled.','matter.arresting_agency':'Example Metropolitan Police Department, 1188 North Example Boulevard, Birmingham, AL 35203-4417.','matter.detention_agencies':'Example County Detention Center, 2500 West Example Parkway, Birmingham, AL 35203-4417.','answers.basis':'nolle_without_conditions','answers.disposition_date':'2025-02-12','answers.refiled':false,'answers.pro_se':true,'answers.seek_fee_waiver':true,'answers.unable_to_pay_fee':true,'answers.offense_level':'misdemeanor','answers.all_court_ordered_amounts_paid':true}
};
// These are synthetic answers, not field captions used as answers. No signature,
// completed service, prior petition, income, attachment receipt or judicial act is held.
const CR_TEXT={
 'Name of County':['matter.county','Name of County'], 'Last Name':['participant.last_name','Last Name'], 'First Name':['participant.first_name','First Name'], 'Middle Name':['participant.middle_name','Middle Name'],
 'Street Address':['participant.street_address','Street Address'],'City State Zip Code':['participant.city_state_zip','City State Zip Code'],'Email Address':['participant.email','E-mail Address'],'Telephone Number':['participant.phone','Telephone Number'],'Date of Birth':['participant.date_of_birth','Date of Birth'],
 'Text3':['matter.case_number','Court case number to be expunged'],
 'Only one offense per petition Multicount cases require multiple petitions':['matter.charge','Charge or conviction to be expunged'],
 'Printed Name of Petitioner':['participant.full_legal_name','Printed Name of Petitioner']
};
const C10_TEXT={
 'IN THE':['matter.court','Type of court (Circuit, District, or Municipal)'],'COURT OF':['matter.county','Name of County or Municipality'],'v':['participant.full_legal_name','Defendant'],
 'IN THE_2':['matter.court','Type of court (Circuit, District, or Municipal)'],'COURT OF_2':['matter.county','Name of County or Municipality'],'v_2':['participant.full_legal_name','Defendant'],
 'Full Name':['participant.full_legal_name','Full Name'],'Complete Home Address':['participant.street_address','Complete Home Address'],'undefined':['participant.city_state_zip','Home address continuation: City State Zip Code'],
 'Telephone Number Cell':['participant.phone','Telephone Number (Cell)'],'Text4':['participant.date_of_birth','Date of Birth'],'Print or Type Name':['participant.full_legal_name','Print or Type Name of affiant']
};
const NARRATIVES=[
 {factId:'matter.charge',fields:['1 Criminal charge from the record to be considered 1','1 Criminal charge from the record to be considered 2'],label:'Criminal charge or conviction from the record to be considered'},
 {factId:'matter.grounds',fields:['2 Grounds for or reasons why you seek expungement 1','2 Grounds for or reasons why you seek expungement 2'],label:'Grounds for or reasons why you seek expungement'},
 {factId:'matter.arresting_agency',fields:['3 The agency or department that made the arrest 1','3 The agency or department that made the arrest 2'],label:'The agency or department that made the arrest'},
 {factId:'matter.detention_agencies',fields:['incarcerated or detained pursuant to arrest on the abovelisted charge that must be indicated here 1','incarcerated or detained pursuant to arrest on the abovelisted charge that must be indicated here 2'],label:'Any agency or department where the Petitioner was booked or was incarcerated or detained pursuant to the arrest or charge sought to be expunged'}
];
const LABELS={
 'C-10-CRIMINAL:Home':'Telephone number (Home)',
 'C-10-CRIMINAL:Other':'Telephone number (Other)',
 'C-10-CRIMINAL:Other_2':'Other assistance benefits (describe)',
 'CR-65:Text2':'Social Security Number, last four digits only',
 'CR-65:COUNTY and it was given Court Case Number':'County of a previous expungement petition, if any',
 'CR-65:was     granted':'Case number of a previous expungement petition, if any',
 'CR-65:Check Box2.0':'No previous expungement application (selection)',
 'CR-65:Check Box2.1':'Previous expungement application (selection)',
 'CR-65:Check Box3.0':'Previous expungement was granted (selection)',
 'CR-65:Check Box3.1.0':'Previous expungement was denied (selection)',
 'CR-65:Check Box3.1.1':'pro se (Not represented by an attorney)',
 'CR-65:Check Box1.0':'Certified arrest record actually attached (selection)',
 'CR-65:Check Box1.1':'Certified disposition or case action summary actually attached (selection)',
 'CR-65:Check Box1.2':'Certified ALEA criminal record actually attached (selection)',
 'C-10-CRIMINAL:Check Box1.0':'State of Alabama caption (selection)',
 'C-10-CRIMINAL:Check Box1.1':'Municipality caption (selection)',
 'C-10-CRIMINAL:Check Box6.0':'State of Alabama caption (selection)',
 'C-10-CRIMINAL:Check Box6.1':'Municipality caption (selection)',
 'C-10-CRIMINAL:Check Box2.0':'Request court-appointed attorney (selection)',
 'C-10-CRIMINAL:Check Box2.1':'Request ignition-interlock fee waiver (selection)',
 'C-10-CRIMINAL:Check Box2.2':'I, because of financial hardship, am unable to pay the expungement petition administrative filing fee and request that these fees be waived.',
 'C-10-CRIMINAL:Check Box5.0':'Other property of value: yes (selection)',
 'C-10-CRIMINAL:Check Box5.1':'Other property of value: no (selection)'
};

Object.assign(LABELS, {
  "CR-65:COUNTY and it was given Court Case Number": "County where any previous expungement was filed",
  "CR-65:was     granted": "Court case number of any previous expungement",
  "C-10-CRIMINAL:undefined_2": "Your monthly gross income",
  "C-10-CRIMINAL:undefined_3": "Your spouse's monthly gross income, unless this is a marital offense",
  "C-10-CRIMINAL:undefined_4": "Your other monthly earnings, including commissions, bonuses, and interest",
  "C-10-CRIMINAL:undefined_5": "Combined monthly income of other household members",
  "C-10-CRIMINAL:undefined_6": "Monthly unemployment, workers' compensation, Social Security, retirement, or similar income",
  "C-10-CRIMINAL:undefined_7": "Child support or alimony received each month",
  "C-10-CRIMINAL:undefined_8": "Other monthly income amount",
  "C-10-CRIMINAL:undefined_9": "Total monthly gross income (item 3a)",
  "C-10-CRIMINAL:undefined_10": "Monthly rent or mortgage expense",
  "C-10-CRIMINAL:undefined_11": "Total monthly utility expense",
  "C-10-CRIMINAL:undefined_12": "Monthly food expense",
  "C-10-CRIMINAL:undefined_13": "Monthly clothing expense",
  "C-10-CRIMINAL:undefined_14": "Monthly health-care or medical-insurance expense",
  "C-10-CRIMINAL:undefined_15": "Monthly car-payment or transportation expense",
  "C-10-CRIMINAL:undefined_16": "Monthly loan-payment expense",
  "C-10-CRIMINAL:undefined_17": "Monthly credit-card-payment expense",
  "C-10-CRIMINAL:undefined_18": "Monthly educational or employment expense",
  "C-10-CRIMINAL:undefined_19": "Monthly cell-phone expense",
  "C-10-CRIMINAL:undefined_20": "Additional description of other monthly expenses",
  "C-10-CRIMINAL:undefined_21": "Other monthly expense amount",
  "C-10-CRIMINAL:undefined_22": "Monthly-expense subtotal (item 3b)",
  "C-10-CRIMINAL:undefined_23": "Monthly child-support or alimony expense subtotal (item 3c)",
  "C-10-CRIMINAL:undefined_24.0": "Monthly exceptional-expense subtotal (item 3d)",
  "C-10-CRIMINAL:undefined_24.1": "Total monthly expenses (item 3e)",
  "C-10-CRIMINAL:undefined_25": "Total monthly gross income minus total monthly expenses",
  "C-10-CRIMINAL:undefined_26": "Cash, bank funds, stocks, bonds, or certificates of deposit",
  "C-10-CRIMINAL:undefined_27": "Equity in real estate",
  "C-10-CRIMINAL:undefined_28": "Equity in personal property",
  "C-10-CRIMINAL:undefined_29": "Other asset amount",
  "C-10-CRIMINAL:undefined_30": "Value of any other property described",
  "C-10-CRIMINAL:undefined_31": "Total assets",
});
for (const [i, label] of ['Dismissed with prejudice and more than 90 days passed','No billed and more than 90 days passed','Found not guilty and more than 90 days passed','Nolle prossed without conditions, more than 90 days passed, not refiled','Indictment quashed and limitations expired or non-refiling confirmed'].entries()) LABELS[`CR-65:Check Box8.${i}`]=label+' (selection)';
for (const [i,label] of ['TANF','Food Stamps','Medicaid','SSI','Disability','Other benefits'].entries()) LABELS[`C-10-CRIMINAL:Check Box3.${i<3?'0':'1'}.${i%3}`]='Household receives '+label+' (selection)';
function normalRect(r){return {x:Math.min(r.x,r.x+r.width),y:Math.min(r.y,r.y+r.height),width:Math.abs(r.width),height:Math.abs(r.height)};}
function resolveSources(){
 const index=json('data/rcap-all50/local-source-corpus-index.json');
 const resolve=makeCorpusEntryResolver(index,{repoRoot:ROOT,masterLibraryRoot:process.env.MASTER_LIBRARY_SOURCE_DIR});
 return SOURCES.map(s=>{const entry=index.entries.find(x=>x.path===s.path);assert.ok(entry,s.path);const absolute=resolve.resolve(entry);assert.ok(absolute&&fs.existsSync(absolute),'exact source missing: '+s.path);const bytes=fs.readFileSync(absolute);assert.equal(sha(bytes),s.sha256);assert.equal(bytes.length,s.byteLength);return {...s,bytes};});
}
async function censusOf(source){
 const doc=await PDFDocument.load(source.bytes,{updateMetadata:false}),pages=doc.getPages();assert.equal(pages.length,source.pages);
 const pageText=pages.map((p,i)=>({page:i+1,lines:groupIntoLines(extractTextItems(p))}));
 const fields=doc.getForm().getFields().map(f=>{
  const widgets=f.acroField.getWidgets().map((w,i)=>{let pg=pages.findIndex(p=>p.ref===w.P());if(pg<0)pg=pages.findIndex(p=>(p.node.Annots()?.asArray()??[]).some(ref=>doc.context.lookup(ref)===w.dict));assert.ok(pg>=0,f.getName());const rect=normalRect(w.getRectangle());return {widgetIndex:i,page:pg+1,rect,...captureWidgetContext(pages[pg],[{name:f.getName(),rect}],{precomputedLines:pageText[pg].lines})[0]};});
  const map=source.documentId==='CR-65'?CR_TEXT:C10_TEXT;
  const nar=source.documentId==='CR-65'?NARRATIVES.find(n=>n.fields.includes(f.getName())):null;
  const label=map[f.getName()]?.[1]??nar?.label??LABELS[source.documentId+':'+f.getName()]??f.getName();
  return {name:f.getName(),type:({PDFTextField:"text",PDFCheckBox:"checkbox",PDFRadioGroup:"radio",PDFDropdown:"dropdown",PDFButton:"button",PDFSignature:"signature"})[f.constructor.name]??f.constructor.name,multiline:f instanceof PDFTextField&&f.isMultiline(),maxLength:f.getMaxLength?.()??null,effectiveLabel:label,regionHeading:null,widgets,sourceValue:f.getText?.()??null};
 });assert.equal(fields.length,108,source.documentId);return {fields,pageText:pageText.map(p=>({page:p.page,lines:p.lines.map(l=>({y:l.y,text:l.text}))}))};
}
function policy(source,f){
 const id=source.documentId,n=f.name,p=f.widgets[0].page,label=f.effectiveLabel;
 const common={field:n,fieldName:n,fieldId:id+':'+n,documentId:id,page:p,effectiveLabel:label,printedLabel:label,widgets:f.widgets};
 const text=(id==='CR-65'?CR_TEXT:C10_TEXT)[n];
 if(text)return {...common,decision:'write',factId:text[0]};
 const nar=id==='CR-65'?NARRATIVES.find(a=>a.fields.includes(n)):null;
 if(nar)return {...common,effectiveLabel:label+' — continuation block line '+(nar.fields.indexOf(n)+1)+' of '+nar.fields.length,decision:'narrative',factId:nar.factId};
 // New expungement proceeding number belongs to the clerk. Text3 is the
 // distinct underlying case-number line and is explicitly mapped above.
 if(/^Court Case Number/.test(n)||(id==='CR-65'&&['Text1','Text4','Text5','Text7'].includes(n)))return {...common,decision:'refuse',blankTreatment:'LATER_COMPLETION',completenessDisposition:'LATER_COMPLETION',reason:'Assigned by the clerk after filing: the new expungement proceeding number.',refusalClass:'court_prosecutor_clerk_or_agency_owned',laterCompletionTrigger:'clerk assigns new expungement proceeding number',requiredBeforeFiling:false};
 if(id==='CR-65'&&p===7)return {...common,decision:'refuse',blankTreatment:'PROTECTED_FIELD',refusalClass:'signature_or_date_participant_completion',reason:'Certificate of service completed by the actual server only after service occurs; no server identity, recipient, date, method or performed service is held.',completesAfterService:true,requiredBeforeFiling:false};
 const attorney=id==='CR-65'&&p===6&&['Printed or Typed Name of Attorney  AL State Bar No','Business Address of Attorney','City','State','Zip Code','Telephone Number_2','Email Address_2'].includes(n);
 const notary=id==='CR-65'&&p===6&&['Date','Text8','Text9','Text26','Text10'].includes(n)||id==='C-10-CRIMINAL'&&p===2&&['undefined_32','1','2','day of','Text1'].includes(n);
 if(attorney)return {...common,decision:'refuse',blankTreatment:'NOT_APPLICABLE_ON_THIS_ROUTE',completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:'The participant explicitly confirms self representation; attorney-only signature and contact block is not used.',reason:'Attorney-only block; participant is self represented.',refusalClass:'attorney_only'};
 if(notary||id==='C-10-CRIMINAL'&&p===3&&!['Check Box6.0','Check Box6.1','MUNICIPALITY OF_2'].includes(n))return {...common,decision:'refuse',blankTreatment:'PROTECTED_FIELD',reason:'Notary or court-only act; identity, signature, findings and dates remain for the authorized officer or judge.',refusalClass:'court_prosecutor_clerk_or_agency_owned',requiredBeforeFiling:false};
 const offroute=id==='CR-65'&&(/^Check Box(?:9|10|11)\./.test(n)||['Check Box8.5','Check Box8.6'].includes(n))||id==='C-10-CRIMINAL'&&['MUNICIPALITY OF','MUNICIPALITY OF_2','Check Box1.1','Check Box6.1','Check Box2.0','Check Box2.1'].includes(n);
 if(offroute)return {...common,decision:'refuse',blankTreatment:'NOT_APPLICABLE_ON_THIS_ROUTE',completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:id==='CR-65'?'This family uses only the first five Section I misdemeanor nonconviction bases; felony, conviction, diversion, trafficking and without-prejudice bases belong to other tracks.':'State circuit caption and expungement fee-waiver request, not a municipality, counsel appointment or interlock fee request.',reason:'Branch not reached by this exact route and explicit participant request.'};
 if(f.type==='checkbox')return {...common,decision:'selection',blankTreatment:'PARTICIPANT_ELECTION_GENUINE',refusalClass:'participant_sworn_narrative_or_legal_election',reason:'Participant choice must match actual records or facts; no unchecked condition is assumed true.',isSelectionControl:true,routeDetermined:false};
 return {...common,decision:'refuse',blankTreatment:'REQUIRED_BEFORE_FILING',completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,routeDetermined:false,reason:'Required before filing: complete '+label+' from your actual records; this fact is not held. Do not guess.'};
}
function selections(source,facts){
 if(source.documentId==='CR-65'){
  assert.ok((FIXED-new Date(facts['answers.disposition_date']))/86400000>90);assert.equal(facts['answers.refiled'],false);assert.equal(facts['answers.pro_se'],true);
  assert.ok(['misdemeanor','violation','traffic_violation','municipal_ordinance_violation'].includes(facts['answers.offense_level']),'wrong offense level');
  assert.equal(facts['answers.all_court_ordered_amounts_paid'],true,'The printed CR-65 payment affirmation must match the participant answer; otherwise stop for the stated indigency exception or legal help.');
  const key={dismissed_with_prejudice:'Check Box8.0',no_billed:'Check Box8.1',not_guilty:'Check Box8.2',nolle_without_conditions:'Check Box8.3',indictment_quashed:'Check Box8.4'}[facts['answers.basis']];assert.ok(key,'unsupported nonconviction basis');
  if(facts['answers.basis']==='indictment_quashed')assert.ok(facts['answers.limitations_expired']===true||facts['answers.prosecuting_agency_confirmed_no_refile']===true,'Quashed-indictment condition must be confirmed; do not infer it.');
  return {[key]:{checked:true,basis:'Explicit participant outcome '+facts['answers.basis']+' on '+facts['answers.disposition_date']+'; more than 90 days at fixture date; non-refiling confirmed.'},'Check Box3.1.1':{checked:true,basis:'Participant explicitly confirms self representation.'}};
 }
 assert.equal(facts['answers.seek_fee_waiver'],true);assert.equal(facts['answers.unable_to_pay_fee'],true,'A fee-waiver request requires the held claim of inability to pay.');
 return Object.fromEntries(['Check Box1.0','Check Box6.0','Check Box2.2'].map(n=>[n,{checked:true,basis:n==='Check Box2.2'?'Participant explicitly requests expungement filing-fee waiver; this is not a judicial indigency finding.':'State of Alabama is the respondent in this state circuit proceeding.'}]));
}
async function render(source,census,facts){
 const rows=census.fields.map(f=>policy(source,f)),selected=selections(source,facts);
 for(const row of rows)if(source.documentId==='CR-65'&&/^Check Box8\.[0-4]$/.test(row.field)&&!selected[row.field])Object.assign(row,{decision:'refuse',refusalClass:null,blankTreatment:'NOT_APPLICABLE_ON_THIS_ROUTE',completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:'The participant selected the mutually exclusive '+facts['answers.basis']+' basis. CR-65 page 1 says to select only one; this other basis is not asserted.',reason:'Mutually exclusive unselected basis, not a missing route answer.'});
 const allowed=new Set(rows.filter(r=>['write','narrative'].includes(r.decision)).map(r=>r.field));Object.keys(selected).forEach(n=>allowed.add(n));
 const result=await finalizeOfficialForm({sourceBytes:source.bytes,expectedSha256:source.sha256,census:census.fields,facts,
 explicitMappings:Object.fromEntries(rows.filter(r=>r.decision==='write').map(r=>[r.field,r.factId])),
 unwritableFields:rows.filter(r=>!allowed.has(r.field)).map(r=>({field:r.field,class:r.refusalClass??r.blankTreatment})),
 narrativeAcrossFields:source.documentId==='CR-65'?[...NARRATIVES,{factId:'matter.case_number',fields:['Text3']}]:[],selectionsFromHeldFacts:selected,
 documentTextLines:census.pageText.flatMap(p=>p.lines.map(l=>l.text)),
 maxFontSize:10,minFontSize:6,evaluateDeclaredMinimumSize:true,alignWidgetFontSizeToFit:true,fitTextPerWidget:true,
 detachNestedControlFields:true,suppressSynthesizedAppearances:true,preserveUnwrittenSelectionBackgrounds:true,
 title:FAMILY+' '+source.documentId});
 const written=new Map(result.report.written.map(w=>[w.field,w]));
 const mapped=rows.map(r=>{const w=written.get(r.field);if(w)return {...r,decision:'write',kind:w.kind,fontSize:w.fontSize??null,actualReport:w,routeDetermined:!!selected[r.field],isSelectionControl:!!selected[r.field]};
 if(r.decision==='narrative'&&result.report.narrativesWritten.some(n=>n.fields.includes(r.field)))return {...r,decision:'refuse',factId:null,blankTreatment:'NOT_APPLICABLE_ON_THIS_ROUTE',completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:'The complete held statement fits on preceding lines of this same numbered information block; no continuation line is needed.',reason:'Unused continuation line after the complete statement, not a missing or repeated charge.'};
 if(allowed.has(r.field))return {...r,decision:'refuse',heldButNotPrinted:true,blankTreatment:'KNOWN_FACT_NOT_WRITTEN',reason:'Measured finalizer refusal; value must be handed off: '+JSON.stringify(result.report.refused.filter(x=>x.field===r.field)),value: facts[r.factId],measurement:result.report.unfittable.filter(x=>x.field===r.field)};
 return r;});
 return {...result,rows:mapped};
}
async function savePacket(docs,title){const packet=await PDFDocument.create();for(const d of docs){const src=await PDFDocument.load(d.bytes,{updateMetadata:false});for(const p of await packet.copyPages(src,src.getPageIndices()))packet.addPage(p);}packet.setTitle(title);packet.setCreationDate(FIXED);packet.setModificationDate(FIXED);packet.setProducer('LegalEase deterministic official-form builder');const bytes=Buffer.from(await packet.save({useObjectStreams:false,updateFieldAppearances:false}));assert.deepEqual(scanBytesForActiveContent(bytes).hits,[]);return bytes;}
function instructions(track,results){
 const known=[];for(const [fixture,docs] of Object.entries(results))for(const d of docs)for(const r of d.rows.filter(r=>r.heldButNotPrinted))known.push('- '+fixture+' '+r.documentId+' page '+r.page+' '+r.effectiveLabel+': '+r.value+'; copy the complete value into the named blank before filing; never shorten your name or facts to match a clipped field.');
 const required=results.canonical.flatMap(d=>d.rows.filter(r=>r.requiredBeforeFiling));
 return '# Alabama misdemeanor nonconviction expungement packet\n\nThis is a prepared self-help packet, not legal advice or a filed petition. It grants no approval. The participant remains responsible for verifying every fact and completing the required items.\n\n## Exact route and one-offense limit\n\nUse only the first five Section I nonconviction bases on CR-65. The checked basis comes from the participant’s own stated outcome and dates, not from the family name. No felony, conviction, diversion, trafficking or without-prejudice basis is selected. File one petition per offense. One fee covers charges from the same arrest; separate arrests may require separate fees (CR-65 page 4). Confirm current local practice with the circuit clerk.\n\n## What is held and what remains blank\n\nCheck every printed identity, contact detail, filing county, underlying case number, charge, stated ground and record-holding agency against your own facts and records. Clerk-assigned header numbers remain blank. No prior-expungement answer, attachment receipt, service act, sworn signature, financial amount or court finding is invented. Include C-10 only if you request a filing-fee waiver; a participant paying the fee does not need that affidavit. A request does not establish indigency.\n\n'+(known.length?'## Held values not printed — complete before filing\n\n'+known.join('\n')+'\n\n':'')+'## Required before filing\n\n'+required.map(r=>'- '+r.documentId+' page '+r.page+': '+r.effectiveLabel+' (`'+r.field+'`).').join('\n')+'\n\n'+track.participantFilingRequirements.map(r=>'- '+r.name+': '+r.howToObtain+' Obtain from '+r.obtainedFrom+'.').join('\n')+'\n\n'+track.packetSet.participantActionRequired.filter(a=>a.kind==='confirm_answer').map(a=>'- '+a.description).join('\n')+'\n\nVerify these answers before signing:\n\n'+track.generationRequirements.map(a=>'- '+a.question+(a.conditionDescription?' '+a.conditionDescription:'')).join('\n')+'\n\nCheck all attachment boxes only when the records are actually attached. Supply either certified local arrest record or certified local disposition/case-action summary, and the certified ALEA record. The approved record does not yet establish the current ALEA request procedure or fee; ask ALEA or the clerk for it.\n\nAnswer all prior-expungement questions on page 6, including every prior jurisdiction, county, case number and outcome where applicable. Verify the underlying-case caption matches your name. Complete C-10 household, spouse if applicable, income, expense, asset and benefits answers only from actual financial information. Sign under oath only when complete.\n\n## Signatures and protected acts\n\nCR-65 pages 6 and 8 require the participant to sign under oath before a notary or officer authorized to administer oaths. C-10 page 2 also requires oath verification. No signature, jurat date, notary identity, service date, indigency finding or judge’s order is prefilled. C-10 page 3 caption facts identify this matter; only the judge completes its decision.\n\n## Filing, fees and service\n\n'+track.rules.filing+'\n\n'+track.rules.fees+' The C-10 request is available when indigency is claimed; the judge decides it. Ask the circuit clerk for local filing logistics and the current address.\n\nCR-65 page 8 requires service on the district attorney, the law-enforcement agency and the clerk of the jurisdiction whose records are sought. Identify every record holder and address. Use one copy of page 7 for each entity actually served. The actual server completes all its facts and signs after service; this packet does not assume the participant is the server or that service occurred. '+track.rules.service+' '+track.rules.notice+' No service method or objection deadline is invented here.\n\n## Continuation and additional records\n\nCR-65 pages 5 and 8 allow additional pages for required information when necessary. If your information extends beyond those lines, attach a continuation clearly identifying the case, one offense and the numbered item. Do not omit a record holder or truncate information. Duplicate page 7 as needed for completed service; additional certificates are not evidence that service happened.\n\n## Stop and obtain help\n\n'+track.selfHelpStopConditions.map(c=>'- '+c).join('\n')+'\n\nStop if the records do not establish the stated basis or waiting period, if another track applies, or if any required condition is uncertain. Ask the clerk about procedure; seek an Alabama lawyer or legal aid for eligibility, disputed facts, objection, hearing or legal-consequence questions. The clerk cannot decide eligibility for you.\n';
}

async function actualWriteProof(results){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'al-pf07-write-readback-'));
 const documents=[];
 try {
  for(const [fixture,docs]of Object.entries(results))for(const doc of docs){
   const file=path.join(directory,fixture+'--'+doc.documentId+'.pdf');fs.writeFileSync(file,doc.bytes);
   const appearances=await flattenedWidgets(file),actualWrites=[],refusedFieldsWithInk=[];
   for(const row of doc.rows){
    for(const widget of row.widgets){
     const drawn=drawnAt(appearances,widget),drawnText=drawn.map(a=>a.text).join('').trim();
     if(row.decision!=='write'){if(drawnText)refusedFieldsWithInk.push({fieldId:row.field,page:widget.page,drawnText});continue;}
     const narrative=doc.report.narrativesWritten.flatMap(n=>n.written).find(w=>w.field===row.field);
     const expected=row.kind==='selection_settled_from_held_facts'?'4':narrative?.text??FIXTURES[fixture][row.factId];
     assert.equal(drawnText,String(expected),'actual flattened write mismatch: '+fixture+' '+doc.documentId+' '+row.field);
     actualWrites.push({field:row.field,page:widget.page,rect:widget.rect,factId:row.factId,kind:row.kind,expected,drawnText,appearanceCount:drawn.length});
    }
   }
   assert.deepEqual(refusedFieldsWithInk,[],'refused field contains printed text');
   documents.push({fixture,documentId:doc.documentId,sha256:sha(doc.bytes),actualWrites,refusedFieldsWithInk,finalizerWritten:doc.report.written.length,flattenedWidgetAppearancesReadFromOutputBytes:appearances.length});
  }
 }finally{for(const file of fs.readdirSync(directory))fs.unlinkSync(path.join(directory,file));fs.rmdirSync(directory);}
 return {familyId:FAMILY,method:'Read the flattened output appearance at each exact source widget rectangle and compare the expected held fact or explicitly selected checkmark; inspect raster separately for visual acceptance.',documents,totalActualWrites:documents.reduce((n,d)=>n+d.actualWrites.length,0)};
}

async function main(){
 const sources=resolveSources(),track=json('data/record-clearing/legal-design-track-registry.json').tracks.find(t=>t.trackId===TRACK);assert.ok(track);assert.equal(track.packetSet.packetSetId,FAMILY);
 const censuses=await Promise.all(sources.map(censusOf)),results={};
 for(const [name,facts] of Object.entries(FIXTURES)){results[name]=[];for(let i=0;i<sources.length;i++)results[name].push({...sources[i],...(await render(sources[i],censuses[i],facts))});}
 const writeProof=await actualWriteProof(results);
 const output=new Map();const put=(p,v)=>output.set(p,Buffer.from(typeof v==='string'?v:JSON.stringify(v,null,2)+'\n'));
 for(const [fixture,docs] of Object.entries(results))output.set('fixtures/'+fixture+'.pdf',await savePacket(docs,FAMILY+' '+fixture));
 for(const [fixture,docs] of Object.entries(results))for(const d of docs)output.set('fixtures/'+fixture+'--'+d.documentId+'.pdf',d.bytes);
 put('participant-instructions.md',instructions(track,results));
 put('field-census.census-v1.json',{familyId:FAMILY,documents:sources.map((s,i)=>({documentId:s.documentId,sourceSha256:s.sha256,...censuses[i]}))});
 put('production-field-map.json',{schemaVersion:'rcap-production-field-map/v2',familyId:FAMILY,routeKeys:['obligation:track-only:AL:'+TRACK],commercialAuthority:false,maps:sources.map((s,i)=>({formNumber:s.documentId,documentId:s.documentId,documentPolicy:{mode:'participant',documentAcceptsFill:true},structuralClass:'acroform',canonicalWrites:results.canonical[i].rows.filter(r=>r.decision==='write'),canonicalRefusals:results.canonical[i].rows.filter(r=>r.decision!=='write'),boundaryWrites:results.boundary[i].rows.filter(r=>r.decision==='write'),boundaryRefusals:results.boundary[i].rows.filter(r=>r.decision!=='write')}))});
 put('source-receipt.json',{schemaVersion:'rcap-source-receipt/v2',familyId:FAMILY,sources:sources.map(({bytes,...s})=>({...s,sourceId:'official-form:'+s.documentId,formNumber:s.documentId,sha256Exact:true})),allSourcesExact:true});
 put('reports/actual-writes.json',writeProof);
 put('fixtures/participant-facts.json',FIXTURES);
 put('reports/finalizer-reports.json',{familyId:FAMILY,fixtures:Object.fromEntries(Object.entries(results).map(([f,ds])=>[f,ds.map(d=>({documentId:d.documentId,report:d.report}))]))});
 put('reports/rendered-artifacts.json',{schemaVersion:'rcap-rendered-artifacts/v2',familyId:FAMILY,rasterState:'BUILT_RASTER_PENDING',packets:Object.entries(results).map(([fixture,docs])=>({fixture,file:OUT+'/fixtures/'+fixture+'.pdf',sha256:sha(output.get('fixtures/'+fixture+'.pdf')),byteLength:output.get('fixtures/'+fixture+'.pdf').length,pageCount:11,documents:[{documentId:'CR-65',componentKinds:['primary_filing','certificate_of_service'],pages:8},{documentId:'C-10-CRIMINAL',componentKinds:['fee_waiver'],pages:3,conditional:true,trigger:'participant explicitly requests indigency-based expungement fee waiver'}]})),conditionalContinuation:{triggered:false,reason:'No required-information block overflows in either fixture.'},independentVerificationPending:true});
 put('build-findings.json',{familyId:FAMILY,sourceNote:'CR-65 pages6/8 explicitly require oath verification; prior registry note only described an incomplete earlier review. Exact source requirement disclosed, legal records unchanged.',independentVerification:'PENDING',routesOpened:0,productionTouched:false});
 const check=process.argv.includes('--check');
 if(check){for(const [p,b]of output){assert.ok(fs.existsSync(OUT+'/'+p),p);assert.deepEqual(fs.readFileSync(OUT+'/'+p),b,'deterministic drift '+p);}}
 else for(const[p,b]of output){fs.mkdirSync(path.dirname(OUT+'/'+p),{recursive:true});fs.writeFileSync(OUT+'/'+p,b);}
 console.log(JSON.stringify({familyId:FAMILY,status:check?'CHECK_PASS':'BUILT_RASTER_PENDING',fixtures:Object.fromEntries(Object.entries(results).map(([f,ds])=>[f,ds.map(d=>({documentId:d.documentId,writes:d.report.written.length,heldRefusals:d.rows.filter(r=>r.heldButNotPrinted).map(r=>({field:r.field,reason:r.reason}))}))])),routesOpened:0}));
}
export {FAMILY,FIXTURES,SOURCES,NARRATIVES,resolveSources,censusOf,render,selections};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
