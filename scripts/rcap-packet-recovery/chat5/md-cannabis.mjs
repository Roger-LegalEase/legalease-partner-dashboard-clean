/** Source-bound Maryland CC-DC-CR-072D adapter. Not a replacement for A/B/C.
 * Reuses the owned Maryland writer and exact requested 089/MDJ-008 components.
 * All route facts are supplied explicitly; no judicial act or signature is made.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {PDFDocument} from 'pdf-lib';
import {scanBytesForActiveContent} from '../../rcap-official-forms/rcap-active-content.mjs';
import {stampDeterministic} from '../../rcap-official-forms/rcap-deterministic-pdf-date.mjs';
import {flattenedWidgets,drawnAt} from '../../rcap-official-forms/pdf-flattened-widgets.mjs';
import {ROOT,hash,json,SOURCES as COST_SOURCES,mdOfficialWriter,validateMdCostRequest,renderMdCostRequest,renderMdFinancialNotice,renderMdCompanion,financialFixture} from './md-conviction.mjs';
export {ROOT,hash,json};
export const FAMILY='md_cannabis_petition-set';
export const ROUTE='obligation:track-pathway:MD:md_cannabis_petition:cannabis-specific-expungement';
export const OUT='data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill';
export const SOURCE={path:'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072D.pdf',sha256:'6a5337a5d142c8ae1cc41845bd4c5efb5598e7a64acbda17c9ab70134773f147',bytes:166429,pages:1,edition:'10/2025',driveId:'12qn6XUfmp3TWHQbVaC0dcUkUsw5io7yN',url:'https://www.mdcourts.gov/sites/default/files/court-forms/ccdccr072d.pdf'};
export const SOURCES={'CC-DC-CR-072D':SOURCE,'CC-DC-089':COST_SOURCES['CC-DC-089'],'MDJ-008':COST_SOURCES['MDJ-008']};
export const BASIS={
 no_longer_crime:{field:'possession of controlled dangerous substance',statute:'CR 5-601',years:0,label:'Cannabis possession: conduct no longer a crime',authority:'Criminal Procedure 10-105(a)(11)'},
 possession:{field:'possession of cannabis',statute:'CR 5-601',years:0,label:'Cannabis possession after sentence completion',authority:'Criminal Procedure 10-105(a)(12), (c)(8)'},
 pwid:{field:'possession with intent to distribute cannabis',statute:'CR 5-602',years:3,label:'Cannabis possession with intent to distribute',authority:'Criminal Procedure 10-110(a)(2)(ii), (c)(5)'}
};
const get=(o,k)=>k.split('.').reduce((a,p)=>a?.[p],o),has=x=>x!==undefined&&x!==null&&x!=='';
const clone=x=>structuredClone(x),date=x=>`${x.slice(5,7)}/${x.slice(8,10)}/${x.slice(0,4)}`;
const EVENTS={arrest:'Arrested',summons:'served with summons',citation:'served with citation'};
export const PROTECTED=['Signature of Attorney','Attorney Number','Date_1','Printed Name of Attorney','Address of Attorney','City, State, Zip','Attorney Telephone No','Attorney Fax No','Attorney Email Address','Signature of Defendant','Date_2'];
const MAP={"Court's City/County":'court.option',"Court's Address":'court.address',"Court's Telephone Number":'court.phone','Case Number':'case.number','Tracking Number':'case.tracking','Defendant Name':'person.name','DOB':'person.dob','Date':'case.eventDate','law enforcement agency':'case.agency','City/County':'case.locality','Printed Name of Defendant':'person.name','Address of Defendant':'person.street','City, State, Zip_1':'person.cityStateZip','Defendant Telephone No':'person.phone','Defendant Email Address':'person.email','Defendant Fax No':'person.fax'};
function iso(v,k){assert(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v,'INVALID_DATE: '+k);return v;}
function text(v,k){if(!has(v))return;assert(typeof v==='string'&&v.trim()&&!/[\n\r\t]/.test(v),'INVALID_TEXT: '+k);assert(!/^(unknown|tbd|insert|not supplied|see instructions)$/i.test(v),'PLACEHOLDER_NOT_FACT: '+k);}
/** The possession carve-out is NOT extended to PWID. Missing facts remain explicit. */
export function validateMdCannabis(input){
 const f=clone(input),missing=[];assert.equal(f.routeKey,ROUTE,'WRONG_ROUTE');iso(f.asOf,'asOf');assert(f.asOf<'2026-10-01','LAW_VERSION_REVIEW');
 assert(f.person&&f.case&&f.court&&f.confirmations&&f.options&&f.records,'MISSING_INPUT_SECTIONS');assert(BASIS[f.case.basis],'WRONG_072D_BASIS');
 if(f.person.signature||f.person.signatureDate||f.attorney||f.notary||f.judicialFindings||f.court.order||f.options.generalRelease)throw Error('PROTECTED_OR_DIFFERENT_INSTRUMENT');
 const need=(k,want,label=k)=>{const v=get(f,k);if(!has(v))missing.push({factId:k,label,why:'Supply and verify this exact case fact before selecting the recital or filing.',requiredBeforeFiling:true});else assert.equal(v,want,'CONDITION_NOT_MET: '+k);};
 for(const k of ['person.dob','case.eventDate','case.convictionDate','case.completionDate'])if(has(get(f,k))){iso(get(f,k),k);assert(get(f,k)<=f.asOf,'FUTURE_CASE_FACT: '+k);}
 if(has(f.person.dob)&&has(f.case.eventDate))assert(f.person.dob<=f.case.eventDate,'DOB_AFTER_EVENT');
 if(has(f.case.eventDate)&&has(f.case.convictionDate))assert(f.case.eventDate<=f.case.convictionDate,'EVENT_AFTER_CONVICTION');
 if(has(f.case.completionDate)&&has(f.case.convictionDate))assert(f.case.completionDate>=f.case.convictionDate,'COMPLETION_BEFORE_CONVICTION');
 assert(['district','circuit'].includes(f.court.level),'COURT_LEVEL');if(has(f.court.option))assert(f.court.option.endsWith(f.court.level==='district'?'(DC)':'(CC)'),'COURT_OPTION_LEVEL_MISMATCH');
 need('court.venueConfirmed',true);assert(['none','adult'].includes(f.court.transfer),'TRANSFER_ROUTE_REVIEW');if(f.court.transfer==='adult')need('court.receivingCourtConfirmed',true);
 need('court.appealed',f.court.appealed===true);if(f.court.appealed){assert.equal(f.court.level,'circuit','APPELLATE_CAPTION_REVIEW');need('court.isAppellateFilingCourt',true);}
 if(has(f.case.event))assert(EVENTS[f.case.event],'EVENT_NOT_SUPPORTED');
 need('confirmations.allIncidentChargesListed',true);need('confirmations.pendingCriminalProceeding',false);need('confirmations.selectedRecitalTrue',true);
 need('records.caseSearchChecked',true);if(has(f.records.caseSearchResult))assert(['shown','not_shown'].includes(f.records.caseSearchResult),'CASE_SEARCH_RESULT');else missing.push({factId:'records.caseSearchResult',label:'Case Search result',why:'Check Case Search, but do not infer court expungement from a missing search result.',requiredBeforeFiling:true});
 if(f.records.courtRecordStatus==='already_expunged')throw Error('COURT_RECORD_ALREADY_EXPUNGED: do not request or pay for duplicate relief');
 if(!has(f.records.courtRecordStatus)||f.records.courtRecordStatus==='unknown')missing.push({factId:'records.courtRecordStatus',label:'Court record still requires expungement',why:'Ask the clerk to verify the actual court record and any existing expungement order. CJIS removal or absence from Case Search is not court expungement.',requiredBeforeFiling:true});
 else assert.equal(f.records.courtRecordStatus,'exists_unexpunged','COURT_RECORD_STATUS');
 if(!has(f.records.confirmationReference))missing.push({factId:'records.confirmationReference',label:'Record verification source',why:'Record the actual docket or clerk confirmation used; no contact or court response is invented.',requiredBeforeFiling:true});else text(f.records.confirmationReference,'records.confirmationReference');
 assert(Array.isArray(f.case.charges)&&f.case.charges.length,'ALL_CHARGES_REQUIRED');const ids=new Set();
 for(const [i,c] of f.case.charges.entries()){
  for(const k of ['id','description','statute','disposition']){text(c[k],`charges.${i}.${k}`);assert(has(c[k]),'CHARGE_FIELD_REQUIRED: '+k);}assert(!ids.has(c.id),'DUPLICATE_CHARGE_ID');ids.add(c.id);assert.equal(typeof c.requested,'boolean','EXPLICIT_REQUESTED_CHARGE');
  if(c.requested){assert.equal(c.disposition,'guilty','NOT_A_CONVICTION_USE_ANOTHER_FORM');assert.equal(c.substance,'cannabis','NOT_CANNABIS');assert.equal(c.basis,f.case.basis,'MIXED_072D_BASES_REQUIRE_SEPARATE_RECITALS');assert.equal(c.statute,BASIS[f.case.basis].statute,'WRONG_STATUTE');assert.equal(c.convictionDate,f.case.convictionDate,'MIXED_CONVICTION_DATES');}
 }
 const requested=f.case.charges.filter(c=>c.requested);assert(requested.length,'NO_REQUESTED_CHARGE');const others=f.case.charges.filter(c=>!c.requested);
 if(!has(f.case.otherOffenses))missing.push({factId:'case.otherOffenses',label:'Fourth checkbox: other offenses',why:'Confirm all charges from this incident. Do not infer NO from an incomplete inventory.',requiredBeforeFiling:true});
 else {assert.equal(typeof f.case.otherOffenses,'boolean','OTHER_OFFENSES_BOOLEAN');assert.equal(f.case.otherOffenses,f.case.charges.length>1,'OTHER_OFFENSES_INVENTORY_MISMATCH');}
 if(!has(f.case.convictionDate))missing.push({factId:'case.convictionDate',label:'Conviction date',why:'Confirm the actual guilty disposition, not a PBJ or a dismissal.',requiredBeforeFiling:true});
 let earliest=null;
 if(f.case.basis==='no_longer_crime')need('confirmations.conductNoLongerCrime',true);
 else {
  need('confirmations.sentenceComplete',true);
  if(!has(f.case.completionDate))missing.push({factId:'case.completionDate',label:'Actual sentence completion date',why:'Obtain the actual completion date including applicable supervision; an anticipated date is not completion.',requiredBeforeFiling:true});
  else if(f.case.basis==='pwid'){assert(!f.case.completionDate.endsWith('02-29'),'LEAP_ANNIVERSARY_REVIEW');earliest=String(+f.case.completionDate.slice(0,4)+3)+f.case.completionDate.slice(4);}
  else earliest=f.case.completionDate;
 }
 if(f.case.basis==='pwid'){
  need('confirmations.unitEligible',true);
  for(const c of others){if(c.minorTraffic===true||c.statute==='CR 5-601'&&c.substance==='cannabis')continue;throw Error('OTHER_UNIT_CHARGE_REQUIRES_COMPONENT_REVIEW: '+c.id);}
  need('confirmations.newCrimeDuringWaiting',f.confirmations.newCrimeDuringWaiting===true);
  if(f.confirmations.newCrimeDuringWaiting===true)need('confirmations.newConvictionNowEligible',true);
 }
 if(earliest)assert(f.asOf>=earliest,'WAITING_PERIOD_NOT_MET: '+earliest);
 if(!has(f.case.restitution?.status))missing.push({factId:'case.restitution.status',label:'Restitution status',why:'Confirm whether restitution was ordered and the current status; inability to pay is not automatically treated as ineligibility.',requiredBeforeFiling:true});
 else {assert(['not_ordered','paid','unable_to_pay','disputed'].includes(f.case.restitution.status),'RESTITUTION_STATUS');if(f.case.restitution.status==='disputed')throw Error('DISPUTED_RESTITUTION_HANDOFF');if(f.case.restitution.status==='unable_to_pay')need('case.restitution.inabilityAsserted',true);if(['paid','unable_to_pay'].includes(f.case.restitution.status))need('case.restitution.documentationAvailable',true);}
 if(f.confirmations.actualObjection||f.confirmations.hearingScheduled)throw Error('CONTESTED_MATTER_HANDOFF');
 const mayMarkBasis=missing.length===0;validateMdCostRequest(f,need);
 for(const [o,ks] of [[f.person,['name','street','cityStateZip','phone','email','fax']],[f.court,['option','address','phone']],[f.case,['number','tracking','agency','locality','incident']]])for(const k of ks)text(o[k],k);
 return {facts:f,missing,earliest,mayMarkBasis,requested,others};
}
async function petition(v,raw){
 const f=v.facts,w=await mdOfficialWriter('CC-DC-CR-072D',raw,SOURCE);
 for(const [field,key] of Object.entries(MAP)){let value=get(f,key);if(has(value)&&['person.dob','case.eventDate'].includes(key))value=date(value);w.text(field,key,value,['case.tracking','person.email','person.fax'].includes(key));}
 w.lines(['as a result of the following incident','as a result of the following incident_1'],'case.incident',f.case.incident);
 w.mark(f.court.level==='district'?'District court':'Circuit Court','court.level');
 if(has(f.case.event))w.mark(EVENTS[f.case.event],'case.event');else w.missing('Arrested','case.event','Select the actual arrest, summons or citation event.');
 if(v.mayMarkBasis)w.mark(BASIS[f.case.basis].field,'case.basis');else w.missing(BASIS[f.case.basis].field,'case.basis','This recital is unmarked until the required case facts are resolved.');
 if(f.case.otherOffenses===true)w.mark('charged with other offenses','case.otherOffenses');else if(!has(f.case.otherOffenses))w.missing('charged with other offenses','case.otherOffenses','Confirm whether other offenses arose from this incident.');
 return w.finish(PROTECTED);
}
function instructions(v,missing,ids){
 const f=v.facts,show=x=>has(x)?String(x):'[not supplied]',grounds=BASIS[f.case.basis];
 const disclosure=missing.map(m=>`${m.documentId?m.documentId+' page '+m.page+': ':''}${m.label??m.field??m.factId}: ${m.why}`);
 const charges=f.case.charges.map(c=>`${c.requested?'Requested':'Not requested on this form'} charge ${c.id}: ${c.description}; ${c.statute}; ${c.disposition}${has(c.convictionDate)?'; conviction '+c.convictionDate:''}.`);
 const fee=f.options.feeTreatment==='paid'?
  'You chose to pay. Maryland Judiciary lists a nonrefundable $30 filing fee per case for eligible guilty dispositions on 072D, including these cannabis convictions, not $30 per charge. Confirm the clerk\'s accepted payment method. No financial waiver application or MDJ-008 is included on this paid branch. Sponsorship does not itself waive a court fee.':
  'You expressly requested a prepaid-cost waiver because you cannot prepay. Submit ALL THREE pages of CC-DC-089 with the petition and the one-page MDJ-008 notice. No filing fee accompanies that request at submission. Give complete, truthful household income, assets and debts; exclude SNAP, your principal home, one vehicle and ordinary personal items as the source instructs. Never invent financial zeros or mark NONE for missing data. The financial document, not the whole criminal case, is identified as restricted. Sign/date your own request and MDJ-008 after review. Leave the attorney certification and every judicial finding/order selection blank. The judge, not LegalEase, decides. If denied or partly granted, follow the order and pay the unwaived amount within 10 days; otherwise the papers are treated as withdrawn. A prepaid waiver is not necessarily a final waiver. '+(f.options.finalOpenCostsRequested?'You separately requested a final waiver on the no-material-change assertion. Review that statement; the court decides at the end.':'You did not request final open-cost relief here. A later final request is a separate procedure.');
 return [
  ['Prepare and verify the actual court record',[
   'This packet uses official CC-DC-CR-072D for the stated cannabis CONVICTION, not the favorable-disposition form, an early-release form, a pardon application, a sentence-reduction application or a proposed expungement order. The government has not approved this request. Any example marked synthetic is not a real person\'s filing.',
   `Case ${show(f.case.number)}; ${show(f.person.name)}; ${show(f.court.option)}. Check the complete charging document, every disposition and sentence/supervision history. Record check: ${show(f.records.caseSearchResult)} on Case Search; court-record status ${show(f.records.courtRecordStatus)}. Verification reference: ${show(f.records.confirmationReference)}. This is supplied information, not a LegalEase database search or invented clerk contact.`,
   'Before paying or filing, verify whether the COURT record still needs relief. Criminal Procedure 10-112 removes qualifying old cannabis-only cases from the Central Repository; it does not by itself destroy the court file. Case Search can also omit cannabis cases by law. A missing search result is not proof that the court record was expunged. Ask the clerk about the actual file and any prior expungement order. Do not pay for duplicate relief where the court has already expunged it.'
  ]],
  ['Your selected 072D request',[
   `Selected basis: ${grounds.label} (${grounds.authority}). Event: ${show(f.case.event)} on ${show(f.case.eventDate)}; conviction ${show(f.case.convictionDate)}; sentence completion ${show(f.case.completionDate)}. ${v.mayMarkBasis?'The selected source recital is marked from supplied confirmed facts.':'The selected source recital remains UNMARKED. Do not file or sign before the missing predicates are resolved.'}`,
   f.case.basis==='no_longer_crime'?'This specific no-longer-crime ground has no additional waiting period. It requires the actual underlying cannabis possession conduct to be no longer criminal; do not infer that all cannabis conduct is now lawful.':f.case.basis==='possession'?`Ordinary cannabis possession requires actual sentence completion under 10-105(c)(8), with no extra three-year wait. Current completion threshold: ${show(v.earliest)}.`:`Cannabis PWID requires three years after actual sentence completion under 10-110(c)(5). Earliest date from supplied facts: ${show(v.earliest)}. An intervening conviction in that period must itself be eligible before this route can proceed.`,
   ...charges,
   `Other-offenses checkbox: ${f.case.otherOffenses===true?'checked because additional charges are listed':f.case.otherOffenses===false?'not checked because the complete supplied inventory confirms none':'UNKNOWN; deliberately unmarked and needs confirmation'}. Simple cannabis possession under CR 5-601 is excluded from the ordinary unit under 10-107(a), even when another charge cannot be expunged. That exception does not turn PWID under CR 5-602 into possession. This petition does not erase any unrequested non-cannabis charge. Complicated PWID units need the exact other instrument/components, not a blanket unit approval.`
  ]],
  ['Finish missing information and execution',[
   ...(disclosure.length?disclosure:['All facts needed for these prepared fields have been supplied. Review each for accuracy; this is not a legal eligibility or court approval.']),
   'The defendant signs and dates 072D personally beneath its perjury affirmation only after reviewing every statement. Attorney fields are for an actual attorney and are blank in this self-represented packet. No notarization is required by this form. Do not use another person\'s signature, manufacture a notarial act or fill a court decision. Optional tracking, email and fax remain blank when not supplied. An overlong known value is disclosed, never clipped or silently abbreviated.',
   fee
  ]],
  ['File and follow up',[
   `File the signed petition${ids.includes('CC-DC-089')?' and selected complete waiver/notice forms':''} with ${show(f.court.option)}, ${show(f.court.address)}, telephone ${show(f.court.phone)}. File in person, by mail, or through applicable MDEC filing. Confirm local copy/payment instructions with the clerk, and retain a complete personal copy. The proper court is ordinarily where the case began; an adult transfer or appeal changes venue under 10-105(b) / 10-110(b). The supplied venue must match the actual docket; do not infer it from your present residence.`,
   f.case.basis==='pwid'?'The COURT serves the State\'s Attorney and sends notice to each listed victim using the court file. A timely State\'s Attorney or victim objection within the statutory 30-day period leads to a hearing. You do not contact the victim or certify the court\'s notice.':'The COURT has the petition served on the State\'s Attorney. The State\'s Attorney has 30 days after service to object. A timely objection leads to a hearing. You do not manufacture or file a participant service certificate.',
   'A court order is still required. No response, filing receipt or software success proves expungement. Unless stayed on appeal, custodians must report compliance within 60 days of the order; retain each actual certificate and ask the clerk about missing compliance. Keep the complete case record before expungement because copies may later be unavailable.',
   'Stop this initial self-help preparation for a real objection/hearing, disputed restitution or conviction facts, an unresolved mixed unit, or an appeal/transfer whose court is uncertain. A demonstrated inability to pay restitution is not automatically treated as disqualification; the court considers the actual evidence. Preserve documents for an attorney or the Maryland Court Help Center (410-260-1392). Expungement does not necessarily remove privately retained records or resolve federal/immigration disclosure duties. Get immigration advice before destroying or losing access to needed records.'
  ]],
  ['Sources and packet contents',[
   `Complete official components: ${ids.join('; ')}. All source pages are present; separate companion pages are instructions, not filed pleadings or substitutes for official documents. No proposed expungement order, fee-waiver grant, court certificate, general release or authentic criminal-history report is fabricated.`,
   'Primary authorities: Criminal Procedure 10-105(a)(11)-(12), (b)-(f); 10-110(a)(2)(ii), (b)-(h); 10-107(a)-(b); 10-112. Current Judiciary adult-expungement fee page resolves the old internal free/$30 uncertainty for 072D guilty dispositions. Current filing-fee-waiver page and CC-DC-089 require the conditional MDJ-008. Review date: September 7, 2026.',
   'Official form: https://www.mdcourts.gov/sites/default/files/court-forms/ccdccr072d.pdf ; fee/process: https://www.mdcourts.gov/legalhelp/expungement ; costs: https://www.mdcourts.gov/legalhelp/filingfeewaivers ; statutes: https://mgaleg.maryland.gov/mgawebsite/Laws/Statutes .'
  ]]
 ];
}
export async function renderMdCannabis(input,overrides={}){
 const v=validateMdCannabis(input),components=[await petition(v,overrides['CC-DC-CR-072D'])];
 if(v.facts.options.feeTreatment==='waiver'){components.push(await renderMdCostRequest(v,overrides['CC-DC-089']));components.push(await renderMdFinancialNotice(v,overrides['MDJ-008']));}
 const missing=[...v.missing,...components.flatMap(c=>c.blanks.filter(x=>x.requiredBeforeFiling))],sections=instructions(v,missing,components.map(c=>c.documentId));
 const guide=await renderMdCompanion(sections,input.isSyntheticFixture===true,'Maryland 072D companion'),doc=await PDFDocument.create(),pageManifest=[];
 for(const c of components){const p=await PDFDocument.load(c.bytes,{updateMetadata:false});for(const [i,page]of(await doc.copyPages(p,p.getPageIndices())).entries()){doc.addPage(page);pageManifest.push({packetPage:pageManifest.length+1,documentId:c.documentId,sourcePage:i+1,sourceSha256:c.source.sha256,componentSha256:c.sha256});}}
 const g=await PDFDocument.load(guide,{updateMetadata:false});for(const page of await doc.copyPages(g,g.getPageIndices())){doc.addPage(page);pageManifest.push({packetPage:pageManifest.length+1,documentId:'participant-instructions',role:'not_filed'});}
 stampDeterministic(doc);const bytes=Buffer.from(await doc.save({useObjectStreams:false}));const scan=scanBytesForActiveContent(bytes);assert(scan.inspectable&&!scan.hits.length,'ACTIVE_CONTENT_IN_PACKET');
 return {bytes,sha256:hash(bytes),pageCount:doc.getPageCount(),components,pageManifest,missing,sections,earliest:v.earliest,mayMarkBasis:v.mayMarkBasis,allKnownFactsPrepared:missing.length===0};
}
export function cannabisFixtures(){
 const f={isSyntheticFixture:true,asOf:'2026-09-07',routeKey:ROUTE,person:{name:'Jordan Avery Reyes',dob:'1979-02-17',street:'42 Larkspur Street',cityStateZip:'Westminster, MD 21157',phone:'410-555-0142',email:'jordan.reyes@example.org'},court:{level:'district',option:'Carroll County (DC)',address:'101 North Court Street, Westminster, MD 21157',phone:'410-871-3500',venueConfirmed:true,restrictedCaseType:false,transfer:'none',appealed:false},case:{number:'D-10-CR-18-900001',tracking:'MD-QA-072D-01',event:'arrest',eventDate:'2018-01-10',convictionDate:'2018-04-02',completionDate:'2019-04-02',agency:'Westminster Police Department',locality:'Carroll County',incident:'Possessing cannabis for personal use during a traffic stop.',basis:'no_longer_crime',otherOffenses:false,charges:[{id:'1',description:'Cannabis possession',statute:'CR 5-601',substance:'cannabis',disposition:'guilty',convictionDate:'2018-04-02',basis:'no_longer_crime',requested:true}],restitution:{status:'not_ordered'}},records:{caseSearchChecked:true,caseSearchResult:'not_shown',courtRecordStatus:'exists_unexpunged',confirmationReference:'Synthetic fixture: clerk record status supplied, not an actual clerk contact'},confirmations:{allIncidentChargesListed:true,pendingCriminalProceeding:false,selectedRecitalTrue:true,conductNoLongerCrime:true,sentenceComplete:true,unitEligible:true,newCrimeDuringWaiting:false},options:{feeTreatment:'paid'}};
 const waiver=(input,final=false)=>{const o=clone(input);o.options={feeTreatment:'waiver',prepaidWaiverRequested:true,unableToPrepay:true,finalOpenCostsRequested:final,...(final?{noMaterialChangeAnticipated:true}:{})};o.financial=financialFixture();return o;};
 const types={no_longer_crime:clone(f),possession:clone(f),pwid:clone(f)};
 types.no_longer_crime.case.completionDate=null; // Not a hidden extra waiting/completion rule on the decriminalized ground.
 types.possession.case.basis='possession';types.possession.case.charges[0].basis='possession';types.possession.case.completionDate='2026-09-07';
 types.pwid.case.basis='pwid';Object.assign(types.pwid.case.charges[0],{basis:'pwid',statute:'CR 5-602',description:'Cannabis possession with intent to distribute'});types.pwid.case.incident='Possessing packaged cannabis with intent to distribute it.';types.pwid.case.completionDate='2023-09-07';
 const rows={canonical:clone(types.no_longer_crime)};for(const [k,x]of Object.entries(types)){rows['selectable/'+k+'-paid']=clone(x);rows['selectable/'+k+'-waiver']=waiver(x);}
 const b=waiver(types.pwid,true);b.person={name:"María-Alejandra O'Shaughnessy",dob:'1978-11-30',street:'1188 Upper Coastal Crossing Road, Apt 14B',cityStateZip:'Westminster, MD 21157-2214',phone:'410-555-0199',email:'maria.oshaughnessy@example.org'};b.case.number='C-06-CR-18-999999';b.case.tracking=null;b.case.event='summons';b.court={...b.court,level:'circuit',option:'Carroll County (CC)',address:'55 North Court Street, Westminster, MD 21157',phone:'410-386-8720'};rows.boundary=b;
 const carve=clone(types.possession);carve.case.otherOffenses=true;carve.case.charges.push({id:'2',description:'First-degree assault, not requested',statute:'CR 3-202',disposition:'guilty',requested:false});rows['selectable/possession-separate-from-ineligible-unit']=carve;
 const traffic=clone(types.pwid);traffic.case.otherOffenses=true;traffic.case.charges.push({id:'2',description:'Speeding, not requested',statute:'TR 21-801.1',disposition:'guilty',minorTraffic:true,requested:false});rows['selectable/pwid-with-minor-traffic']=traffic;
 const later=clone(types.pwid);later.confirmations.newCrimeDuringWaiting=true;later.confirmations.newConvictionNowEligible=true;rows['selectable/pwid-new-conviction-now-eligible']=later;
 const citation=clone(types.possession);citation.case.event='citation';rows['selectable/citation']=citation;
 const transfer=clone(b);transfer.court.transfer='adult';transfer.court.receivingCourtConfirmed=true;rows['selectable/adult-transfer-waiver']=transfer;
 const missing=clone(types.possession);missing.case.completionDate=null;rows['diagnostic/missing-completion']=missing;
 const unknown=clone(types.possession);unknown.case.otherOffenses=null;rows['diagnostic/unknown-other-offenses']=unknown;
 const fin=waiver(types.possession);delete fin.financial;rows['diagnostic/waiver-missing-financial']=fin;
 const rec=clone(types.possession);rec.records.courtRecordStatus='unknown';rec.records.confirmationReference=null;rows['diagnostic/court-record-status-unknown']=rec;
 const contacts=clone(types.possession);contacts.case.agency=null;contacts.person.phone=null;contacts.person.email=null;rows['diagnostic/missing-contact']=contacts;
 return rows;
}
// Source-native projection only. The existing shared auditFamily decides completeness.
export function cannabisMap(facts,report,census){
 const normalize=r=>({...r,fieldId:r.field,sourceIdentity:r.field,sourceLabel:r.field,label:r.field,page:r.page??r.widgets?.[0]?.page,isSelectionControl:(census[r.documentId]??[]).some(c=>c.field===r.field&&c.type==='PDFCheckBox')});
 const writes=report.writes.map(normalize),refusals=report.blanks.map(raw=>{const r=normalize(raw);r.reason=raw.why;
  if(raw.requiredBeforeFiling){r.completenessDisposition='REQUIRED_BEFORE_FILING';r.completenessClass=null;return r;}
  if(raw.completenessClass==='court_or_execution_owned'){r.refusalClass=/signature|^Date_/i.test(raw.field)?'signature_or_date_participant_completion':'court_prosecutor_clerk_or_agency_owned';return r;}
  delete r.completenessClass;r.completenessDisposition='NOT_APPLICABLE_ON_THIS_ROUTE';r.routeConditionThatMakesItInapplicable=raw.completenessClass==='not_applicable_optional'?`Optional ${raw.field} not supplied or not needed; no known value was shortened.`:raw.documentId==='CC-DC-CR-072D'?`Selected ${facts.case.basis}, ${facts.court.level}, ${facts.case.event}; other-offenses state=${facts.case.otherOffenses}. Other recitals/court/event controls are not selected.`:raw.documentId==='CC-DC-089'?`Only expressly supplied complete financial categories apply; incomeComplete=${facts.financial?.incomeComplete===true}, propertyComplete=${facts.financial?.propertyComplete===true}, debtsComplete=${facts.financial?.debtsComplete===true}, finalOpenCosts=${facts.options.finalOpenCostsRequested===true}. No missing item is presumed zero.`:'Only the selected financial CC-DC-089 submission is restricted; all other document/category controls are not applicable.';return r;});
 const factMap={};const walk=(x,k='')=>{if(x&&typeof x==='object')for(const[n,v]of Object.entries(x))walk(v,k?k+'.'+n:n);else if(has(x))factMap[k]=x;};walk(facts);
 return {schemaVersion:'rcap-official-form-field-map/v1-census-v1',familyId:FAMILY,routeKeys:[ROUTE],renderStrategy:'official_pdf_fill',writes,refusals,factMap,casePredicateDisclosures:report.requiredBeforeFiling.filter(x=>!x.documentId),sourceCensus:census,allKnownFactsPrepared:report.allKnownFactsPrepared,runtimeSelectable:false,requiresExternalEligibilityVerification:true};
}
export async function runMdCannabis({outDir=path.join(ROOT,OUT),inputFile=null}={}){
 if(inputFile&&path.resolve(outDir)===path.join(ROOT,OUT))throw Error('CUSTOM_INPUT_REQUIRES_ISOLATED_OUTPUT');
 const inputs=inputFile?{supplied:JSON.parse(fs.readFileSync(inputFile,'utf8'))}:cannabisFixtures(),ready=[];
 for(const [fixture,facts]of Object.entries(inputs))ready.push({fixture,facts,r:await renderMdCannabis(facts)});
 const artifacts=[],reports={},census={},maps={},actualDocuments=[],actualArtifacts=[];
 const write=(rel,b)=>{const p=path.join(outDir,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);};
 for(const {fixture,facts,r}of ready){
  const rel=`fixtures/${fixture}.pdf`,ip=`fixtures/${fixture}.facts.json`;write(rel,r.bytes);write(ip,json(facts));
  const decoder=new TextDecoder('windows-1252'),apparent=(await flattenedWidgets(path.join(outDir,rel))).map(a=>({...a,text:decoder.decode(Buffer.from(a.text,'latin1'))}));
  for(const c of r.components){census[c.documentId]=c.census;const offset=r.pageManifest.findIndex(p=>p.documentId===c.documentId);const actualWrites=c.writes.filter(w=>w.kind==='text').flatMap(w=>w.widgets.map(widget=>{const drawnText=drawnAt(apparent,{page:offset+widget.page,rect:widget.rect,tolerance:.2}).filter(x=>x.text).map(x=>x.text).join('');assert.equal(drawnText,w.value,'ACTUAL_APPEARANCE_MISMATCH: '+fixture+'/'+w.field);return {field:w.field,factId:w.factId,page:offset+widget.page,expected:w.value,drawnText,readFromFinalArtifact:true};}));actualDocuments.push({fixture,formNumber:c.documentId,sourceSha256:c.source.sha256,actualWrites});}
  actualArtifacts.push({fixture,file:`${OUT}/${rel}`,sha256:r.sha256,valuesReportedByFinalizer:r.components.reduce((n,c)=>n+c.writes.length,0),flattenedWidgetAppearancesReadFromOutputBytes:apparent.filter(x=>x.text).length});
  const documents=r.components.map(c=>({documentId:c.documentId,role:c.documentId==='CC-DC-CR-072D'?'primary_filing':c.documentId==='CC-DC-089'?'fee_waiver':'restricted_information_notice',pages:c.pageCount,sourceSha256:c.source.sha256,componentSha256:c.sha256}));
  const report={schemaVersion:'chat5-md072d-author-build/v1',familyId:FAMILY,fixture,inputPath:ip,inputSha256:hash(Buffer.from(json(facts))),output:{file:`${OUT}/${rel}`,sha256:r.sha256,byteLength:r.bytes.length,pageCount:r.pageCount},documents,pageManifest:r.pageManifest,writes:r.components.flatMap(c=>c.writes),blanks:r.components.flatMap(c=>c.blanks),requiredBeforeFiling:r.missing,earliest:r.earliest,mayMarkBasis:r.mayMarkBasis,allKnownFactsPrepared:r.allKnownFactsPrepared,signatureExecuted:false,judicialDecisionSupplied:false,independentReview:'PENDING',centralRaster:'PENDING'};
  reports[fixture]=report;write(`reports/${fixture}.json`,json(report));artifacts.push({fixture,file:`${OUT}/${rel}`,sha256:r.sha256,byteLength:r.bytes.length,pageCount:r.pageCount,documents,pageManifest:r.pageManifest,diagnostic:fixture.startsWith('diagnostic/')});
  const md=r.sections.map(([t,ps])=>`## ${t}\n\n${ps.join('\n\n')}`).join('\n\n')+'\n';write(`instructions/${fixture}.md`,md);if(fixture==='canonical')write('participant-instructions.md',md);
 }
 for(const {fixture,facts}of ready)maps[fixture]=cannabisMap(facts,reports[fixture],census);
 write('official-field-census.json',json(census));write('production-field-map.json',json({...maps[ready[0].fixture],conditionalMaps:maps,printedRecitals:BASIS}));
 write('reports/actual-writes.json',json({schemaVersion:'rcap-actual-writes/v1',familyId:FAMILY,derivedFromArtifactBytes:true,documents:actualDocuments,artifacts:actualArtifacts}));
 write('reports/rendered-artifacts.json',json({schemaVersion:'rcap-rendered-artifacts/v1',familyId:FAMILY,pdfs:artifacts,artifacts,renderedFresh:true,derivedFromBytes:true,independentVerificationPending:true}));
 write('source-receipt.json',json({schemaVersion:'chat5-exact-official-sources/v1',familyId:FAMILY,sourceCatalog:SOURCES,sources:Object.entries(SOURCES).map(([documentId,s])=>({documentId,...s})),allSourcesExact:true,officialFacesReadOn:'2026-09-07',liveIssuerBinaryShaMeasured:false,conditionalComponent:'CC-DC-089 all THREE pages and MDJ-008 only on express requested waiver',globalRelationshipCorrection:'Chat14 owns MDJ-008 relationship and narrow fee/record-system clarification; not modified here'}));
 write('build-status.json',json({familyId:FAMILY,buildStatus:'state_built',reviewStatus:'qa_review_pending',pdfCount:artifacts.length,completePages:artifacts.reduce((n,a)=>n+a.pageCount,0),runtimeSelectable:false,generationAllowed:false,commercialRoutesOpened:0,selfVerified:false,limitations:['This is the 072D conviction route, not every cannabis charge or civil citation.','Only one selected basis/conviction date per supplied incident; mixed recitals or other PWID unit instruments require explicit component design.','Unknown predicates/financial facts remain diagnostic and unfileable until resolved.','Binary publication, independent review, exact shared-reader integration and central/runtime admission remain separate.']}));
 return artifacts;
}
