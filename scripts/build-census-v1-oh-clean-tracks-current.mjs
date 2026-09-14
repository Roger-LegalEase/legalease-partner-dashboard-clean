#!/usr/bin/env node
// Exact adopted four-track continuation. No runtime or commercial authority.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {stampDeterministic} from './rcap-official-forms/rcap-deterministic-pdf-date.mjs';
const require=createRequire(import.meta.url);
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const FAMILY='rcap-oh-custom-pleading-clean-tracks';
const LANE='data/rcap-grade-a/packet-factory-24h/pf08/oh-continuation-20260913';
export const OUT='data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const abs=p=>path.join(ROOT,p);
const read=p=>JSON.parse(fs.readFileSync(abs(p)));
const write=(p,x)=>{fs.mkdirSync(path.dirname(abs(p)),{recursive:true});fs.writeFileSync(abs(p),typeof x==='string'||Buffer.isBuffer(x)||x instanceof Uint8Array?x:JSON.stringify(x,null,2)+'\n');};
const FIXTURES=read(`${LANE}/coherent-eight-fixture-inputs.json`).fixtures;
const TRACKS=read(`${LANE}/adopted-track-input-projection.json`).tracks;
const ROUTES=[
 'obligation:track-only:OH:oh_2953_32_sealing',
 'obligation:track-pathway:OH:oh_2953_32_expungement:adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32',
 'obligation:track-pathway:OH:oh_2953_33_nonconviction:adult-non-conviction-sealing-or-expungement-under-2953-33',
 'obligation:track-pathway:OH:oh_2953_35_firearm:certain-firearm-carry-conviction-expungement-under-2953-35'
];
const SOURCES=[
 {sourceId:'official-rules:OH-SUPR-APPENDIX-D-FORM-96-C1',path:'private/source-acquisition-20260913/oh-96c1/OH-SUPR-Superintendence-2026-08-06.pdf',sha256:'3c0adba6f9fed5d9f012dced1ed2e6aabf542de860b9b2ebdabfcd6e927cdf05',physicalPage:475},
 {sourceId:'font:ArialMT',path:'private/source-imports/oh-exact-fonts-20260914/Arial.TTF',sha256:'35c0f3559d8db569e36c31095b8a60d441643d95f59139de40e23fada819b833'},
 {sourceId:'official-order:Franklin-criminal-sixth-amended-efiling',path:'private/transfers/pf08-oh-continuation-20260913/efiling-order.pdf',sha256:'f7ac3b2e20684f86c7b1f2ac6b0107909e82c2029d5f1043731f8483d9336500'},
 {sourceId:'official-rule:Franklin-local19',path:'private/transfers/pf08-oh-continuation-20260913/local-rule19.pdf',sha256:'8f7511dced91c931f216af7b155dfbfc930bd946dbdaeabf05f85fe88502cb26'},
 {sourceId:'official-form:OH-BCI-SEALING-EXPUNGEMENT-REQUEST',path:`${OUT}/companion/OH-BCI-SEALING-EXPUNGEMENT-REQUEST--official-source.pdf`,sha256:'9234ec763403b1ccfbed796dfcf86f29bf7887390d1770460d0bcc9da31fc8cb'}
];
function sources(){return SOURCES.map(s=>{const bytes=fs.readFileSync(abs(s.path));assert.equal(hash(bytes),s.sha256,`SOURCE_HASH:${s.sourceId}`);return {...s,bytes};});}
let cachedFontkit;
function fontkit(){if(cachedFontkit)return cachedFontkit;try{cachedFontkit=require('@pdf-lib/fontkit');}catch{cachedFontkit=require(process.env.OH_FONTKIT_PATH||'/tmp/rcap-font-renderer/node_modules/@pdf-lib/fontkit');}return cachedFontkit;}
async function document(){const pdf=stampDeterministic(await PDFDocument.create());pdf.registerFontkit(fontkit());const font=await pdf.embedFont(fs.readFileSync(abs(SOURCES[1].path)),{subset:true});return {pdf,font};}
function val(x){if(x===false)return 'No';if(x===true)return 'Yes';if(x==null)return 'Not applicable';if(Array.isArray(x))return x.length?x.map(val).join('; '):'None';if(typeof x==='object')return Object.entries(x).map(([k,v])=>`${k}: ${val(v)}`).join('; ');return String(x);}
function wrap(text,font,size,width){const lines=[];let line='';for(const word of String(text).split(/\s+/)){assert.ok(font.widthOfTextAtSize(word,size)<=width,`TOKEN_TOO_WIDE:${word}`);const next=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(next,size)>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
export function validateInput(f){
 assert.ok(TRACKS.some(t=>t.trackId===f.trackId),'UNBOUND_TRACK');
 assert.equal(f.court,f.recordEvidence?.judgmentOrDisposition?.court,'RECORD_COURT_MISMATCH');
 assert.equal(f.caseNumber,f.recordEvidence?.judgmentOrDisposition?.caseNumber,'RECORD_CASE_MISMATCH');
 assert.equal(f.court,'Court of Common Pleas, Franklin County, Ohio','UNBOUND_DESTINATION_MECHANICS');
 assert.equal(f.mechanicsBinding,'Franklin Common Pleas Sixth Amended Criminal Efiling Order and Local Rule 19','UNBOUND_MECHANICS');
 for(const k of ['pendingCriminalProceedings','openWarrants','immigrationExposure','prosecutorObjection','victimObjection','excludedOffense','registrationHistory'])assert.equal(f[k],false,`SELF_HELP_STOP:${k}`);
 assert.equal(f.sameActInventoryConfirmed,true,'SAME_ACT_INVENTORY_REQUIRED');assert.equal(f.BCIRecordCompared,true,'BCI_COMPARISON_REQUIRED');
 assert.equal(f.indigent,false,'INDIGENCY_BRANCH_REQUIRES_EXACT_CURRENT_LOCAL_AFFIDAVIT');
 assert.deepEqual(f.sameActCharges,f.recordEvidence.judgmentOrDisposition.sameActCharges,'CHARGE_RECORD_MISMATCH');
 assert.equal(new Set(f.sameActCharges.map(c=>c.disposition)).size,1,'MIXED_DISPOSITIONS_REQUIRE_REVIEW');
 assert.equal(f.outOfStateOrFederal,false,'DESTINATION_BRANCH_REQUIRES_SEPARATE_RECORD_BINDING');
 if(f.earliestApplication)assert.ok(f.reviewDate>=f.earliestApplication,'WAITING_PERIOD_NOT_COMPLETE');
 if(f.divisionCExclusions!==undefined)assert.equal(f.divisionCExclusions,false,'NONCONVICTION_DIVISION_C_STOP');
 if(f.allExclusionChecks)for(const [key,value]of Object.entries(f.allExclusionChecks))assert.ok(value===false||value===0,`EXCLUSION_REQUIRES_REVIEW:${key}`);

 assert.ok(['sealing','expungement'].includes(f.remedy),'UNRESOLVED_REMEDY');
 for(const [key,p]of Object.entries(f.requiredInputProjection??{}))if(p.requirement==='required'||p.conditionalApplicability==='applicable')assert.ok(p.value!==null&&p.value!==undefined&&p.value!=='',`REQUIRED_INPUT:${key}`);
 const t=TRACKS.find(t=>t.trackId===f.trackId);for(const r of t.generationRequirements.filter(r=>r.requirement==='required'))assert.ok(f.requiredInputProjection[r.key],`UNPROJECTED_REQUIRED_INPUT:${r.key}`);
 if(f.trackId==='oh_2953_32_sealing')assert.equal(f.remedy,'sealing','96C1_IS_SEALING_ONLY');
 if(f.trackId==='oh_2953_32_expungement')assert.equal(f.remedy,'expungement','EXPUNGEMENT_REMEDY_REQUIRED');
 if(f.trackId==='oh_2953_35_firearm'){assert.ok(f.statutoryBranch&&f.conduct&&f.authorizationEvidence,'FIREARM_BRANCH_RECORDS_REQUIRED');assert.equal(f.licenseHeld,true,'LICENSE_EVIDENCE_REQUIRED');assert.equal(f.licenseEvidence.suspendedOrRevoked,false,'LICENSE_SUSPENDED_OR_REVOKED');assert.ok(f.licenseEvidence.validFrom<=f.offenseDate&&f.licenseEvidence.validThrough>=f.offenseDate,'LICENSE_NOT_VALID_ON_OFFENSE_DATE');assert.ok(f.offenseDate<'2022-06-13','FORMER_PROVISION_DATE_REQUIRED');}
 return f;
}
async function textPdf(title,paragraphs,fixture,id){
 const {pdf,font}=await document();let page,y;const writes=[];const newPage=()=>{page=pdf.addPage([612,792]);y=720;page.drawText(title,{x:54,y,size:12,font});y-=36;page.drawText(`Synthetic review fixture - ${fixture.trackId} / ${fixture.fixture}`,{x:54,y:30,size:8,font});};newPage();
 for(const p of paragraphs){const text=typeof p==='string'?p:p.text;const key=typeof p==='string'?null:p.factId;for(const line of wrap(text,font,12,504)){if(y<72)newPage();page.drawText(line,{x:54,y,size:12,font});if(key)writes.push({fieldId:`${fixture.trackId}/${fixture.fixture}/${id}/${writes.length}`,documentId:`${fixture.trackId}/${fixture.fixture}/${id}`,fixture:`${fixture.trackId}-${fixture.fixture}`,factId:`${fixture.trackId}.${fixture.fixture}.${key}`,value:line,page:pdf.getPageCount(),rect:[54,y-3,504,15],fontSize:12,decision:'write',label:key});y-=24;}y-=12;}
 return {id,bytes:await pdf.save({useObjectStreams:false}),pages:pdf.getPageCount(),writes,paragraphs};
}
const field=(factId,text)=>({factId,text});
function facts(f){const t=TRACKS.find(t=>t.trackId===f.trackId);return [
 field('fullName',`Applicant: ${f.fullName}. Other names: ${f.otherNames}. Date of birth: ${f.dateOfBirth}.`),
 field('court',`${f.court}; ${f.division}. Case ${f.caseNumber}. Assigned judge: ${f.judge}.`),
 field('address',`Address: ${f.street}, ${f.cityStateZip}. Telephone: ${f.phone}. Email: ${f.email}.`),
 field('offense',`Offense: ${f.offense}. Offense date: ${f.offenseDate}; arrest date: ${f.arrestDate}; arresting agency: ${f.arrestingAgency}.`),
 ...f.sameActCharges.map((c,i)=>field(`sameActCharges.${i}`,`Count ${c.count}: ${c.charge}; disposition: ${c.disposition}; date: ${c.date}.`)),
 ...(f.finalDischarge?[field('finalDischarge',`Conviction date: ${f.convictionDate}. Final discharge: ${f.finalDischarge}. ${f.minimumWait?`Applicable waiting period: ${f.minimumWait}. Earliest application: ${f.earliestApplication}.`:''}`)]:[field('disposition',`Disposition: ${f.dispositionType}, ${f.dispositionDate}; dismissal prejudice: ${f.dismissalPrejudice??'not applicable'}; no-bill report date: ${f.noBillReportedDate??'not applicable'}. Earliest application: ${f.earliestApplication}.`)]),
 ...(f.rehabilitationFacts?[field('rehabilitationFacts',f.rehabilitationFacts)]:[]),
 field('interestStatement',f.interestStatement),
 ...(f.conduct?[field('conduct',f.conduct),field('statutoryBranch',f.statutoryBranch),field('authorizationEvidence',f.authorizationEvidence),field('licenseEvidence',`License evidence: ${val(f.licenseEvidence)}.`),field('syntheticJurisdictionRecord',f.syntheticJurisdictionRecord)]:[]),
 field('recordChecks',`Other convictions: ${val(f.otherConvictions)}. Pending criminal proceedings: ${val(f.pendingCriminalProceedings)}. Open warrants: ${val(f.openWarrants)}. Registration history: ${val(f.registrationHistory)}. BCI record comparison completed: ${val(f.BCIRecordCompared)}. All same-incident charges inventoried: ${val(f.sameActInventoryConfirmed)}.`),
 field('courtCostsOnly',`Unpaid court costs only: ${val(f.courtCostsOnly)}; court-cost balance: $${f.courtCostsBalance}. Indigency requested: ${val(f.indigent)}.`),
 ...Object.entries(f.requiredInputProjection).filter(([,p])=>p.conditionalApplicability==='applicable').map(([key,p])=>field(key,`${t.generationRequirements.find(r=>r.key===key)?.question??key} Answer: ${val(p.value)}.`))
 ];}
async function form96(f,source){
 const {pdf,font}=await document();const container=await PDFDocument.load(source.bytes,{updateMetadata:false});assert.equal(container.getPageCount(),536,'96C1_CONTAINER_PAGES');pdf.addPage((await pdf.copyPages(container,[474]))[0]);const page=pdf.getPage(0),writes=[],overflow=[];
 function put(label,value,x,baseline,width,key){let text=String(value);if(font.widthOfTextAtSize(text,12)>width){overflow.push(field(key,`${label}: ${text}`));text='See continuation';}page.drawText(text,{x,y:792-baseline,size:12,font});writes.push({fieldId:`${f.trackId}/${f.fixture}/96C1/${key}`,documentId:`${f.trackId}/${f.fixture}/96C1`,fixture:`${f.trackId}-${f.fixture}`,factId:`${f.trackId}.${f.fixture}.${key}`,value:text,page:1,rect:[x,792-baseline-3,width,15],fontSize:12,decision:'write',label});}
 // Coordinates measured from the existing original-page image; source is copied intact.
 put('Court','Common Pleas',220,108,170,'courtType');put('County',f.county,220,131,89,'county');
 put('Applicant name',f.fullName,105,154,165,'fullName');put('Case number',f.caseNumber,360,167,152,'caseNumber');
 // The source caption Judge control remains court-owned; supplied assignment is disclosed in the continuation.
 put('Applicant printed name',f.fullName,100,322,165,'applicantPrintedName');
 put('Street',f.street,100,383,165,'street');put('City, State, ZIP',f.cityStateZip,100,413,165,'cityStateZip');put('Phone',f.phone,100,474,165,'phone');
 return {id:'96C1',bytes:await pdf.save({useObjectStreams:false}),pages:1,writes,overflow,protectedRegions:[{page:1,rect:[98,435,172,17],reason:'Applicant signature'},{page:1,rect:[335,276,180,195],reason:'Attorney fields; no attorney supplied'},{page:1,rect:[98,168,420,83],reason:'Entire court-completed service'}],requiredBeforeFiling:['Driver license number on Form96-C1, if applicable; confirm whether applicable and enter actual number before filing.','Execute applicant signature personally after reviewing application and attached continuation.']};
}
async function primary(f,source){
 const section=f.trackId.includes('2953_35')?'2953.35':f.trackId.includes('2953_33')?'2953.33':'2953.32';
 if(f.trackId==='oh_2953_32_sealing'){const form=await form96(f,source);const addendum=await textPdf('Continuation to Form 96-C1', [...form.overflow,...facts(f),'The accompanying official Form 96-C1 is the sealing application. Review these facts and complete the applicant signature on that form.'],f,'application-continuation');return [form,addendum];}
 const title=`Application for ${f.remedy} under R.C. ${section}`;
 return [await textPdf(title,[`${f.court} - ${f.division}`,`State of Ohio v. ${f.fullName}. Case ${f.caseNumber}.`,field('remedy',`The applicant requests ${f.remedy} of the identified record under R.C. ${section}, subject to the court's determination of the statutory requirements.`),...facts(f),'WHEREFORE, the applicant requests the relief stated above for the listed case and no other case.','Applicant signature: __________________________________','Date: ____________________',`Printed name: ${f.fullName}`],f,'application')];
}
const paragraphs=s=>s.split(/\n\s*\n/).map(x=>x.replace(/\n/g,' ').replace(/^#+\s*/,''));
function localGuidance(f){return [
 `Your destination is ${f.court}, ${f.division}, determined from the supplied court record. These Franklin diagnostic fixtures do not limit statewide route coverage; another court requires its own current mandatory mechanics before generation.`,
 'Franklin criminal filings use electronic filing. A self-represented filer may bring paper to the clerk for registration/scanning assistance and submission, or mail paper for clerk registration/scanning/filing. Incarcerated self-represented defendants submit paper themselves. Email and fax are not substitutes. Clerk: Franklin County Clerk of Courts, General Division, 345 South High Street, first floor, Columbus, OH 43215.',
 'Original application, continuation and service pages use embedded Arial at 12 points, double spaced. Official Form96-C1 and the BCI form retain the issuer layout. Each submitted PDF is limited to 5 MB, with 25 MB together. Retain both submission receipt and final clerk acceptance; correct rejections and verify accepted timestamp. Proposed orders must be DOCX; no proposed order is required by the adopted packet and none is included.',
 'Serve opposing counsel and unrepresented parties under Local Rule 19 and retain written proof. The included service certificate is unexecuted. Confirm recipient name/address and permitted method, and complete actual method/date/signature only after service. Court statutory notice does not replace this written proof. Self-represented defendants receive paper service.',
 f.trackId.includes('2953_32')?'R.C.2953.32 requires a $50 fee unless indigent and permits an additional local fee up to $50; the held Franklin listing states $50 for conviction sealing. Confirm the exact total for your selected remedy before submission.':f.trackId.includes('2953_35')?'R.C.2953.35 requires $50 unless indigent; confirm current clerk payment instructions.':'The held sources do not establish the exact Franklin fee for this R.C.2953.33 application. Confirm the amount, if any, before submission; no no-fee claim is made.',
 'These fixtures are nonindigent. If requesting indigency, obtain the exact current court affidavit and execute it truthfully; generation refuses that branch until the document is bound. No judicial indigency finding is prefilled.',
 ...(f.trackId==='oh_2953_32_sealing'?['Form96-C1 is used only for sealing. Full values too long for an official line are printed in its attached continuation; do not file the official page without the continuation. Driver license number, if applicable: confirm applicability and enter the actual number before filing. Sign the applicant block after review. Attorney blocks and the entire court SERVICE certification remain blank.']:['Review and sign the original application and date it personally. It is an original pleading, not an official state form.'])
 ];}
function recordsGuidance(f,t){return [
 ...t.packetSet.participantActionRequired.filter(a=>['obtain_document','confirm_answer'].includes(a.kind)).map(a=>a.description),
 'Keep originals and certified dispositions for every charge from the incident. Compare the docket with your BCI record and proof of final discharge, including fines and restitution. Unpaid court costs alone do not delay final discharge. Synthetic fixture facts are not certified documents; obtain actual record evidence before filing.',
 ...(f.trackId.includes('2953_35')?['Obtain the former statutory version, charging language, incident/conduct evidence, license and authorization evidence for the exact former-notification branch. This is not general firearm relief or a firearm-rights restoration packet.']:[])
 ];}
function hearingGuidance(f,t){return [
 'The court decides eligibility and relief. Do not fill judicial findings, prosecutor decisions, hearing dates or court/service certifications.',
 f.trackId.includes('2953_35')?'The court sets a hearing and gives prosecutor notice under R.C.2953.35; follow the actual notice.':'R.C.2953.32 and 2953.33 hearings follow the applicable 45–90 day statutory framework. Follow the actual court notice, preserve prosecutor/victim notice and objection rights, and bring requested records; no generated hearing date is supplied.',
 ...t.selfHelpStopConditions.map(s=>typeof s==='string'?`Stop for legal assistance: ${s}`:JSON.stringify(s)),
 ...t.scopeRestrictions.map(s=>typeof s==='string'?s:JSON.stringify(s)),
 ...t.packetInstructions,
 'If relief is granted, retain the signed order and follow its agency distribution directions. The BCI request is a blank post-order transmission companion for the authorized sender, not an application for relief. Do not sign, date, check record-system boxes or certify a judicial order before those events occur.',
 f.trackId.includes('2953_32')?'Sealing does not destroy records. For expungement under R.C.2953.32(D)(5), BCI retains a limited record for law-enforcement employment qualification or disqualification even when other notified entities destroy, delete or erase records. Do not claim erasure everywhere.':f.trackId.includes('2953_33')?'Any requested DNA relief needs the applicable separate court direction; it does not erase records remaining in NDIS. No DNA application is generated by this packet.':'Do not import R.C.2953.32 limited-retention language as though it were a rule of R.C.2953.35. The exact signed order controls.'
 ];}
async function assemble(parts){const pdf=stampDeterministic(await PDFDocument.create()),coverage=[];for(const p of parts){const src=await PDFDocument.load(p.bytes,{updateMetadata:false});const first=pdf.getPageCount()+1;for(const pg of await pdf.copyPages(src,src.getPageIndices()))pdf.addPage(pg);coverage.push({documentId:p.id,role:p.role,firstPage:first,pageCount:src.getPageCount(),sha256:hash(p.bytes)});}return {bytes:await pdf.save({useObjectStreams:false}),pages:pdf.getPageCount(),coverage};}
export async function buildFixture(input){const f=validateInput(input),s=sources(),t=TRACKS.find(t=>t.trackId===f.trackId);const parts=(await primary(f,s[0])).map(p=>({...p,role:'primary_filing'}));
 parts.push({...await textPdf('Certificate of service',[`${f.court}; Case ${f.caseNumber}. State of Ohio v. ${f.fullName}.`,`To be served: ${f.prosecutionOffice}; confirm actual opposing counsel and required recipients.`,`Documents: the application under R.C.${f.trackId.includes('2953_35')?'2953.35':f.trackId.includes('2953_33')?'2953.33':'2953.32'} and all filed continuations and attachments.`,'I certify that I served the identified documents on the following actual recipients by the method stated below. Complete only after actual service.','Recipient name and service address: __________________________________','Additional required recipients: __________________________________','Actual service method: __________________________________','Actual service date: __________________________________','Server signature: __________________________________','Server printed name: __________________________________'],f,'certificate-of-service'),role:'certificate_of_service'});
 for(const [id,role,title,body]of [['local-instructions','local_form_instructions','Local filing instructions',localGuidance(f)],['records-instructions','record_gathering_instructions','Records to obtain and compare',recordsGuidance(f,t)],['hearing-instructions','hearing_and_objection_instructions','Hearing, objections and post-order instructions',hearingGuidance(f,t)]])parts.push({...await textPdf(title,body,f,id),role});
 parts.push({id:'bci-transmission',role:'bci_transmission',bytes:s[4].bytes,pages:1,writes:[]});
 const packet=await assemble(parts);assert.ok(parts.filter(p=>['primary_filing','certificate_of_service'].includes(p.role)).every(p=>p.bytes.length<=5*1024*1024),'INDIVIDUAL_FILING_LIMIT');assert.ok(packet.bytes.length<=25*1024*1024,'TOTAL_FILING_LIMIT');return {f,parts,packet};}
export async function checkSaved(){sources();const r=read(`${OUT}/reports/rendered-artifacts.json`);for(const p of r.packets){const b=fs.readFileSync(abs(`${OUT}/${p.file}`));assert.equal(hash(b),p.sha256,`PACKET_HASH:${p.fixture}`);assert.equal((await PDFDocument.load(b)).getPageCount(),p.pageCount);}return {familyId:FAMILY,result:'EXACT_SAVED_BYTES',packets:r.packets.map(p=>({fixture:p.fixture,sha256:p.sha256,pageCount:p.pageCount})),sourceCount:SOURCES.length};}
export async function build(){sources();for(const f of FIXTURES)validateInput(f);const built=[];for(const f of FIXTURES){const r=await buildFixture(f),dir=`continuation/${f.trackId}/${f.fixture}`;write(`${OUT}/${dir}/packet.pdf`,r.packet.bytes);write(`${OUT}/${dir}/fixture.json`,f);write(`${OUT}/${dir}/coverage.json`,r.packet.coverage);for(const p of r.parts)write(`${OUT}/${dir}/${p.id}.pdf`,p.bytes);built.push({...r,dir});}
 const writes=built.flatMap(r=>r.parts.flatMap(p=>p.writes??[]));const refusals=built.flatMap(r=>[
 {fieldId:`${r.f.trackId}/${r.f.fixture}/signatures`,documentId:`${r.f.trackId}/${r.f.fixture}/${r.f.trackId==='oh_2953_32_sealing'?'96C1':'application'}`,decision:'PROTECTED_FIELD',approvedDisposition:'PROTECTED_FIELD',label:'Applicant signature and actual signing date',reason:'Applicant signature/date and service execution remain blank until actual execution.'},
 {fieldId:`${r.f.trackId}/${r.f.fixture}/bci`,documentId:`${r.f.trackId}/${r.f.fixture}/bci-transmission`,decision:'PROTECTED_FIELD',approvedDisposition:'PROTECTED_FIELD',label:'Clerk and agency post-order transmission',refusalClass:'court_prosecutor_clerk_or_agency_owned',laterCompletionTrigger:'Signed court order and authorized sender transmission',reason:'Entire BCI form is post-order sender-owned; no transmission or judicial certification before order.'},
 ...(r.f.trackId==='oh_2953_32_sealing'?[{fieldId:`${r.f.trackId}/${r.f.fixture}/driverLicense`,documentId:`${r.f.trackId}/${r.f.fixture}/96C1`,decision:'REQUIRED_BEFORE_FILING',approvedDisposition:'REQUIRED_BEFORE_FILING',label:'Driver license number, if applicable',requiredBeforeFiling:true,reason:'Confirm driver-license applicability and fill actual number if applicable.'},{fieldId:`${r.f.trackId}/${r.f.fixture}/court-and-attorney`,documentId:`${r.f.trackId}/${r.f.fixture}/96C1`,decision:'PROTECTED_FIELD',approvedDisposition:'PROTECTED_FIELD',label:'Court, attorney and actual event controls',reason:'Judge caption, court SERVICE and attorney blocks remain blank; no court action or attorney supplied.'}]:[])
 ]);
 const report={schemaVersion:'rcap-rendered-artifacts/v1',familyId:FAMILY,componentIdentityMode:'exact',packets:built.map(r=>({fixture:`${r.f.trackId}-${r.f.fixture}`,fixtureRole:r.f.fixture,file:`${r.dir}/packet.pdf`,sha256:hash(r.packet.bytes),pageCount:r.packet.pages,documents:r.packet.coverage.map(c=>({...c,documentId:`${r.f.trackId}/${r.f.fixture}/${c.documentId}`}))})),artifacts:built.map(r=>({fixture:`${r.f.trackId}-${r.f.fixture}`,fixtureRole:r.f.fixture,file:`${r.dir}/packet.pdf`,sha256:hash(r.packet.bytes),pageCount:r.packet.pages,addedGlyphsReadFromOutputBytes:null,flattenedWidgetAppearancesReadFromOutputBytes:null,nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:null,refusedFieldsWithInk:null,measurementScope:'Independent saved-output measurement and central raster pending.'}))};
 write(`${OUT}/reports/rendered-artifacts.json`,report);write(`${OUT}/production-field-map.json`,{schemaVersion:'rcap-production-field-map/v2',familyId:FAMILY,routeKeys:ROUTES,writes,refusals,availableFacts:Object.fromEntries(writes.map(w=>[w.factId,w.value])),fixtureSpecificFacts:FIXTURES,protectedFieldPolicy:'Actual signatures, dates, service execution, attorney/court blocks and BCI post-order fields stay blank.'});
 write(`${OUT}/source-receipt.json`,{schemaVersion:'rcap-source-receipt/v1',familyId:FAMILY,routeKeys:ROUTES,allSourcesExact:true,documents:SOURCES,adoptedInputs:[`${LANE}/coherent-eight-fixture-inputs.json`,`${LANE}/adopted-track-input-projection.json`,`${LANE}/captain-implementation-dispatch.json`],fontCustody:'data/rcap-grade-a/packet-factory-24h/prerequisite-resolution-20260914/oh-exact-arial-custody-release.json'});
 const instructions=TRACKS.map(t=>{const f=FIXTURES.find(f=>f.trackId===t.trackId&&f.fixture==='canonical');return `# ${t.trackId}\n\n${[...localGuidance(f),...recordsGuidance(f,t),...hearingGuidance(f,t)].join('\n\n')}`;}).join('\n\n');write(`${OUT}/participant-instructions.md`,instructions);write(`${OUT}/filing-instructions.md`,instructions);
 write(`${OUT}/packet-set-manifest.json`,{schemaVersion:'rcap-composed-packet-set/v1',familyId:FAMILY,routeKeys:ROUTES,components:TRACKS.flatMap(t=>t.packetSet.components),tracks:TRACKS.map(t=>({trackId:t.trackId,packetSet:t.packetSet})),additionalServiceComponent:'Unexecuted local Rule 19 certificate',font:'ArialMT12pt, original paragraphs24ptbaseline spacing',exclusiveBuilder:'scripts/build-census-v1-oh-clean-tracks-current.mjs'});
 write(`${OUT}/product-wiring.json`,{schemaVersion:'rcap-family-product-wiring/v1',familyId:FAMILY,routeKeys:ROUTES,generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0,createsFulfillmentRecord:false,opensCommercialRoute:false,integrationStatus:'CANDIDATE_NOT_ADMITTED',binding:{family:FAMILY,jurisdiction:'OH',routeKeys:ROUTES,packetComponents:TRACKS.flatMap(t=>t.packetSet.components.map(c=>c.componentId)),deliveryType:'official_96C1_sealing_plus_three_original_application_tracks',fieldMap:`${OUT}/production-field-map.json`,instructions:`${OUT}/participant-instructions.md`,renderedArtifacts:`${OUT}/reports/rendered-artifacts.json`,sourceReceipt:`${OUT}/source-receipt.json`,generationAllowed:false,runtimeSelectable:false,paymentEligible:false,sponsorshipEligible:false,filingPermitted:false}});
 write(`${OUT}/build-status.json`,{schemaVersion:'rcap-build-status/v1',familyId:FAMILY,status:'BUILT_CANDIDATE',rasterState:'PENDING_CENTRAL',independentReview:'PENDING',commercialAuthority:false});write(`${OUT}/approval-request.json`,{schemaVersion:'rcap-output-approval-request/v1',familyId:FAMILY,status:'BUILT_CANDIDATE_REVIEW_PENDING',generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0});
 write(`${OUT}/build-findings.json`,{schemaVersion:'rcap-build-findings/v1',familyId:FAMILY,status:'BUILT_RASTER_PENDING',exactFontResolved:true,fixtures:8,tracks:4,mechanicsScope:'Franklin diagnostics; other courts require exact record-derived mechanics binding',remainingReleaseBlockers:['Independent semantic/source review','Original-page/raster acceptance','Output-byte write measurement','Form96-C1 driver-license applicability before actual filing'],commercialAuthority:false});
 return checkSaved();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const argv=process.argv.slice(2);assert.ok(argv.every(a=>['--check','--no-raster'].includes(a)),'UNSUPPORTED_ARGUMENT');console.log(JSON.stringify(await(argv.includes('--check')?checkSaved():build()),null,2));}
