import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PDFDocument,PDFRadioGroup} from 'pdf-lib';
import {FAMILY,ROOT,OUTPUT,SOURCE,SOURCE_SHA256,EVIDENCE,sha256,fixtureFacts,validateFacts,renderFixture} from './ia-dci77.mjs';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
const fixtures=fixtureFacts(),results=[],rendered=new Map();
const raw=await fs.readFile(path.join(ROOT,SOURCE));
async function render(id){if(!rendered.has(id))rendered.set(id,await renderFixture(fixtures[id]));return rendered.get(id);}
const base=()=>structuredClone(fixtures.canonical);
const j=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const w=(r,id,component='request-1')=>r.writes.find(w=>w.fieldId===id&&w.documentId===component);
const b=(r,id,component='request-1')=>r.blanks.find(w=>w.fieldId===id&&w.documentId===component);
async function snapshot(dir){const o={};async function walk(p){for(const f of (await fs.readdir(p,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const q=path.join(p,f.name);if(f.isDirectory())await walk(q);else o[path.relative(dir,q)]=sha256(await fs.readFile(q));}}await walk(dir);return o;}
const original=await snapshot(path.join(ROOT,OUTPUT));
for(const id of Object.keys(fixtures))test(`${id}: actual complete component renderer`,async()=>{
 const r=await render(id),d=await PDFDocument.load(r.bytes,{updateMetadata:false});
 assert.equal(d.getPageCount(),r.pageCount);assert.equal(d.getForm().getFields().length,0);
 assert.equal(r.pageCount,r.components.reduce((n,c)=>n+c.pages,0));
 assert.equal(r.assessment.agencyReportIncluded,false);assert.equal(r.assessment.submissionReady,false);
 assert.equal(r.assessment.paymentCompleted,false);assert.equal(r.assessment.filingMechanism,false);
 assert.ok(r.assessment.pendingActions.length);
 assert.equal(r.sourceFields.length,r.writes.length+r.blanks.length);
 for(const c of r.components){assert.equal(sha256(c.bytes),r.coverage.find(x=>x.id===c.id).sha256);}
 if(fixtures[id].channel==='online_portal'){
  assert.equal(r.sourceFields.length,0);assert.equal(r.components.length,1);assert.equal(r.assessment.kind,'ONLINE_GUIDANCE_ONLY');
  assert.equal(r.assessment.candidateClass,'GUIDANCE_ONLY_NOT_SUBMITTED');
 }else{
  assert.equal(r.sourceFields.length,26+19*fixtures[id].names.length);
  assert.equal(r.components.filter(x=>x.id==='billing').length,1);
  assert.equal(r.components.filter(x=>/^request-/.test(x.id)).length,fixtures[id].names.length);
  assert.ok(r.components.some(x=>x.id==='official-instructions'));
 }
 results.push({test:id,completeRenderer:true,pages:r.pageCount,wholePdfSha256:sha256(r.bytes),areas:r.sourceFields.length,classification:r.assessment.candidateClass});
});
test('both held locators resolve to one three-page source with 45 actual fields',async()=>{
 assert.equal(sha256(raw),SOURCE_SHA256);assert.equal(raw.length,1076864);
 const d=await PDFDocument.load(raw,{updateMetadata:false});assert.equal(d.getPageCount(),3);assert.equal(d.getForm().getFields().length,45);
});
test('one surname means one $15 fee and one request, not a generated record result',async()=>{
 const r=await render('canonical');assert.equal(w(r,'Number_Requests','billing').value,'1');assert.equal(w(r,'Total_Due','billing').value,'15.00');
 assert.equal(w(r,'Payment','billing').value,'Check');assert.equal(w(r,'Check_Number','billing').value,'1001');
 assert.equal(r.writes.filter(x=>x.fieldId.startsWith('DCI_USE_')).length,0);
});
test('two surname batch has one $30 billing page and two distinct requests',async()=>{
 const r=await render('boundary');assert.equal(w(r,'Total_Due','billing').value,'30.00');assert.equal(w(r,'Number_Requests','billing').value,'2');
 assert.equal(w(r,'Last_Name2','request-1').value,'Montgomery-Example');assert.equal(w(r,'Last_Name2','request-2').value,'Rivera-Example');
 assert.equal(w(r,'Name_Business_Individual2','request-2').value,'Alexandra Catherine Montgomery-Example');
});
test('eleventh surname is actually delivered on request11 and a continuation',async()=>{
 const r=await render('eleven-surnames');assert.equal(w(r,'Number_Requests','billing').value,'11');assert.equal(w(r,'Total_Due','billing').value,'165.00');
 assert.equal(w(r,'Last_Name2','request-11').value,'Example-Juliet');assert.ok(r.components.some(c=>c.id==='additional-surnames'));
 assert.equal(r.writes.filter(w=>/^Last_Name_\d+$/.test(w.fieldId)).length,10);
});
test('payment modes select exactly the participant-provided source option',async()=>{
 for(const [id,expected] of Object.entries({canonical:'Check','fax-card':'Credit_Card_Debit_Card','email-prepaid':'PrePaid_DCI_Account','in-person-cash':'Cash','money-order':'Money_Order'})){
  const r=await render(id);assert.equal(w(r,'Payment','billing').value,expected);assert.equal(r.writes.filter(x=>x.fieldId==='Payment').length,1);
  assert.equal(r.assessment.paymentCompleted,false);
 }
});
test('card credentials remain private unfilled completion, not stored synthetic credentials',async()=>{
 const r=await render('fax-card');for(const id of ['Credit_Card_Number','Expiration_Date','CSV_Code']){assert.ok(b(r,id,'billing').requiredBeforeSubmission);assert.equal(w(r,id,'billing'),undefined);}
 assert.equal(w(r,'Cardholder_Name','billing').value,'Avery Jordan Example');
});
test('prepaid account appears on billing and request, no artificial card requirement',async()=>{
 const r=await render('email-prepaid');assert.equal(w(r,'DCI_Account_Number','billing').value,'EXAMPLE-ACCOUNT-1');assert.equal(w(r,'DCI_Account_Number2').value,'EXAMPLE-ACCOUNT-1');
 assert.equal(b(r,'Credit_Card_Number','billing').completenessDisposition,'NOT_APPLICABLE_ON_THIS_ROUTE');
});
test('known gender is only the volunteered literal option',async()=>{
 for(const gender of ['M','F','Other']){const f=base();f.gender=gender;const r=await renderFixture(f);assert.equal(w(r,'Gender').value,gender);}
});
test('unknown gender never defaults to Other or becomes submission-positive',async()=>{
 const r=await render('unknown-gender');assert.equal(w(r,'Gender'),undefined);assert.equal(b(r,'Gender').completenessDisposition,'REQUIRED_BEFORE_FILING');
 assert.equal(r.assessment.candidateClass,'DIAGNOSTIC_NOT_SUBMISSION_READY');assert.ok(r.assessment.missing.includes('gender_requirement_conflict'));
 assert.match(r.instructions.flatMap(x=>x.paragraphs).join('\n'),/NOT submission-ready/);
});
test('portal guidance does not silently use paper batch billing or accept unknown gender',async()=>{
 const r=await render('portal-two-names'),t=r.instructions.flatMap(x=>x.paragraphs).join('\n');
 assert.match(t,/request AND billing submission for EACH/);assert.match(t,/No DCI request or billing PDF/);assert.equal(r.writes.length,0);
 assert.ok(r.assessment.missing.includes('gender_requirement_conflict'));assert.equal(r.assessment.submissionReady,false);
});
test('source malformed rectangles are normalized to the identical geometric region',async()=>{
 const r=await render('email-prepaid');for(const name of ['Email_Address2','Mailing_Address2','DCI_Account_Number2']){
  const x=w(r,name).widgets[0],s=x.sourceRect;assert.ok(s.height<0);assert.equal(x.rect.y,Math.min(s.y,s.y+s.height));assert.equal(x.rect.height,Math.abs(s.height));
  assert.equal(x.rect.width,Math.abs(s.width));assert.equal(x.sourcePage,2);
 }
});
test('signatures, actual dates, agency decisions and notarization choice remain unexecuted',async()=>{
 for(const id of Object.keys(fixtures).filter(x=>fixtures[x].channel!=='online_portal')){
  const r=await render(id);assert.equal(w(r,'Date_af_date','billing'),undefined);
  for(const request of r.components.filter(c=>/^request-/.test(c.id))){
   for(const key of ['Signature2','DCI_USE_DATE','DCI_USE_Criminal_Record','DCI_USE_DCI#','DCI_USE_Processed_By'])assert.equal(b(r,key,request.id).completenessDisposition,'PROTECTED_FIELD');
   assert.equal(b(r,'Results_Notorized',request.id).completenessDisposition,'PARTICIPANT_ELECTION_GENUINE');
  }
 }
});
test('source actor proofs bind only DCI-owned fields to actual source heading',async()=>{
 const r=await render('canonical');for(const x of r.blanks.filter(x=>x.fieldId.startsWith('DCI_USE_'))){assert.equal(x.sourceActorEvidence.sourceSha256,SOURCE_SHA256);assert.equal(x.sourceActorEvidence.printedHeading,'FOR DCI USE ONLY');assert.equal(x.sourceActorEvidence.sourceFieldId,x.fieldId);}
 assert.equal(w(r,'First_Name2').sourceActorEvidence,undefined);
});
test('recommended middle name and SSN may be omitted; known optional values are written',async()=>{
 const f=base();f.names[0].middle=null;let r=await renderFixture(f);assert.equal(w(r,'Middle_Name2'),undefined);assert.equal(b(r,'Middle_Name2').completenessDisposition,'NOT_APPLICABLE_ON_THIS_ROUTE');
 f.ssn='000000000';r=await renderFixture(f);assert.equal(w(r,'Social_Security_Number2').value,'000000000'); // conspicuously invalid identifier for synthetic exercise, no external record
});
test('email return does not invent an irrelevant mailing-country requirement',()=>{
 const f=base();f.returnMethod='email';f.requester.country=null;assert.ok(!validateFacts(f).missing.includes('requester.country'));
});
test('the own-record personal-use guide does not invent a universal report expiry',async()=>{
 const f=base();f.purpose='personal_record';const r=await renderFixture(f);assert.match(r.instructions.flatMap(s=>s.paragraphs).join('\n'),/no universal court-filing expiry/);
});
test('current Form2 downstream timing is explicitly distinct from request date and generation',async()=>{
 const r=await render('canonical'),t=r.instructions.flatMap(s=>s.paragraphs).join('\n');assert.match(t,/Form 2 item 9/);assert.match(t,/within 30 days/);assert.match(t,/not this request date/);assert.match(t,/not the returned report/);
});

test('both portal guides never claim that their online fields were filled',async()=>{
 for(const id of ['portal-two-names','portal-known-answer']){
  const r=await render(id),t=r.instructions.flatMap(s=>s.paragraphs).join('\n');
  assert.equal(r.components.length,1);assert.equal(r.components[0].id,'participant-instructions');
  assert.equal(r.writes.length,0);assert.match(t,/has not filled either online form/);
  assert.doesNotMatch(t,/Known source-required identity\/payment-reference fields are entered/);
  assert.doesNotMatch(t,/that exact allowed value is entered on the printed form/);
 }
});
test('known portal gender stays participant-operated with no claimed submission',async()=>{
 const r=await render('portal-known-answer'),t=r.instructions.flatMap(s=>s.paragraphs).join('\n');
 assert.match(t,/has not entered or submitted that answer/);assert.equal(r.assessment.submissionReady,false);
 assert.equal(r.assessment.candidateClass,'GUIDANCE_ONLY_NOT_SUBMITTED');
});
test('notarized-result branch is delivered but never marks an agency or participant act',async()=>{
 const r=await render('notarized-results-request'),t=r.instructions.flatMap(s=>s.paragraphs).join('\n');
 assert.equal(w(r,'Results_Notorized'),undefined);assert.equal(b(r,'Results_Notorized').completenessDisposition,'PARTICIPANT_ELECTION_GENUINE');
 assert.match(t,/You report needing notarized results/);assert.match(t,/no universal court-filing expiry/);
 assert.doesNotMatch(t,/You report needing notarized results for a foreign\/immigration requirement/);
});
test('participant guides avoid internal channel keys and source-custody jargon',async()=>{
 for(const id of ['in-person-cash','money-order']){
  const r=await render(id),t=r.instructions.flatMap(s=>s.paragraphs).join('\n');
  assert.doesNotMatch(t,/in_person|money_order|raw-byte equality/);
 }
});
test('selected source radios retain original circle appearance rather than erasing it',async()=>{
 const r=await render('canonical');for(const row of r.writes.filter(w=>w.type==='PDFRadioGroup'))assert.equal(row.selectionMode,'retained_original_off_appearance_plus_inset_mark');
});

const rejects={
 'third-party request has no model authority':f=>f.subjectIsRequester=false,
 'unknown subject-is-requester rejected':f=>f.subjectIsRequester=null,
 'cannot declare court relief':f=>f.purpose='expungement',
 'unsupported telephone request':f=>f.channel='phone',
 'unselected delivery':f=>f.returnMethod=null,
 'invalid DOB calendar':f=>f.dob='1990-02-30',
 'future DOB':f=>f.dob='2026-09-09',
 'DOB equal assessment':f=>f.dob=f.assessmentDate,
 'invalid assessment date':f=>f.assessmentDate='2026-02-29',
 'gender inferred from name rejected':f=>f.genderAnswerSource='inferred',
 'unknown gender must have explicit null provenance':f=>f.gender=null,
 'non-form gender option rejected rather than converted':f=>f.gender='Unknown',
 'notary approval cannot be fabricated':f=>f.notarizedResults='completed',
 'identity-free request rejected':f=>f.names=[],
 'missing required surname rejected':f=>f.names[0].last=null,
 'unknown first name rejected':f=>f.names[0].first=null,
 'case-insensitive duplicate surname not charged':f=>f.names.push({...f.names[0],last:'EXAMPLE'}),
 'all name rows retained or explicit capacity refusal':f=>f.names=Array.from({length:41},(_,i)=>({...f.names[0],last:`Example-${i}`})),
 'extra hidden alias key rejected':f=>f.names[0].approved=true,
 'unknown optional middle needs explicit null':f=>delete f.names[0].middle,
 'invalid phone is not silently shortened':f=>f.requester.phone='319555010199',
 'email validation':f=>f.requester.email='unusable',
 'foreign mail does not claim agency delivery':f=>f.requester.country='OTHER',
 'foreign fax does not claim US destination':f=>{f.returnMethod='fax';f.requester.country='CA';f.requester.fax='3195550102';},
 'cash not mailed':f=>f.payment={method:'cash',reference:null,account:null,cardholderName:null},
 'physical check not transmitted by email':f=>f.channel='email',
 'physical check not transmitted by fax':f=>f.channel='fax',
 'physical check not transmitted through portal':f=>f.channel='online_portal',
 'inter-agency payment not participant authority':f=>f.payment.method='Inter_Agency',
 'credit card raw credentials not accepted':f=>f.payment.cardNumber='0000000000000000',
 'security code never input':f=>f.payment.cvv='000',
 'inapplicable prepaid account rejected':f=>f.payment.account='EXAMPLE-ACCOUNT',
 'inapplicable cardholder rejected':f=>f.payment.cardholderName='Example',
 'inapplicable reference rejected':f=>{f.payment.method='card';},
 'signature injection refused':f=>f.signature='Signed',
 'agency result injection refused':f=>f.noRecordFound=true,
 'report-date injection refused':f=>f.reportIssueDate='2026-09-01',
 'paid status injection refused':f=>f.paymentCompleted=true,
 'missing top-level key refused':f=>delete f.genderAnswerSource,
 'invalid SSN length not truncated':f=>f.ssn='0000000001',
};
for(const [name,mutate] of Object.entries(rejects))test(name,async()=>{const f=base();mutate(f);await assert.rejects(renderFixture(f));results.push({test:name,actualRendererInputRefused:true});});
test('wrong source bytes cannot be used for an apparently successful render',async()=>{
 await assert.rejects(renderFixture(base(),{sourceBytes:Buffer.from('not a DCI source')}),/source drift/);
 const changed=Buffer.concat([raw,Buffer.from('\n')]);await assert.rejects(renderFixture(base(),{sourceBytes:changed}),/source drift/);
});
test('long known address fails readable fitting rather than losing data',async()=>{
 const f=base();f.requester.address='W'.repeat(170);await assert.rejects(renderFixture(f),/Unreadable supplied DCI text/);
});
test('wrapper check mode cannot masquerade as a full build',()=>{
 const p=spawnSync(process.execPath,['scripts/build-census-v1-ia-dci77-set.mjs','--check'],{cwd:ROOT,encoding:'utf8'});assert.notEqual(p.status,0);assert.match(p.stderr,/Usage/);
});
after(async()=>{
 assert.deepEqual(await snapshot(path.join(ROOT,OUTPUT)),original,'tests altered committed candidate output');
 await fs.mkdir(path.join(ROOT,EVIDENCE),{recursive:true});await fs.writeFile(path.join(ROOT,EVIDENCE,'renderer-test-cases.json'),JSON.stringify({authorQAOnly:true,results,wholeFamilyUnchanged:true},null,2)+'\n');
});
