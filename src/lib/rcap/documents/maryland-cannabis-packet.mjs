/** Exact source-native R041 fill/companion extraction; no admission or release authority. */
import {PDFDocument} from 'pdf-lib';
import assert from 'node:assert/strict';
import {scanBytesForActiveContent} from '../../../../scripts/rcap-official-forms/rcap-active-content.mjs';
import {stampDeterministic} from '../../../../scripts/rcap-official-forms/rcap-deterministic-pdf-date.mjs';
import {hash,SOURCES as COST_SOURCES,mdOfficialWriter,renderMdCostRequest,renderMdFinancialNotice,renderMdCompanion} from '../../../../scripts/rcap-packet-recovery/chat5/md-conviction.mjs';
import {ROUTE,BASIS,validateMdCannabis} from '../../rcap-engine/maryland-cannabis-rules.mjs';
export {ROUTE};
export const SOURCE={path:'reference/md-law-2026-10-21/CC-DC-CR-072D.pdf',sha256:'87465cb08d93f3469dc4fe7288360aaa650f21e2dee06ebd4f7f05a4998d2703',bytes:167894,pages:1,edition:'10/2025',url:'https://www.mdcourts.gov/sites/default/files/court-forms/ccdccr072d.pdf'};
export const SOURCES={'CC-DC-CR-072D':SOURCE,'CC-DC-089':COST_SOURCES['CC-DC-089'],'MDJ-008':COST_SOURCES['MDJ-008']};
const get=(o,k)=>k.split('.').reduce((a,p)=>a?.[p],o),has=x=>x!==undefined&&x!==null&&x!=='';
const date=x=>`${x.slice(5,7)}/${x.slice(8,10)}/${x.slice(0,4)}`;
const EVENTS={arrest:'Arrested',summons:'served with summons',citation:'served with citation'};
export const PROTECTED=['Signature of Attorney','Attorney Number','Date_1','Printed Name of Attorney','Address of Attorney','City, State, Zip','Attorney Telephone No','Attorney Fax No','Attorney Email Address','Signature of Defendant','Date_2'];
const MAP={"Court's City/County":'court.option',"Court's Address":'court.address',"Court's Telephone Number":'court.phone','Case Number':'case.number','Tracking Number':'case.tracking','Defendant Name':'person.name','DOB':'person.dob','Date':'case.eventDate','law enforcement agency':'case.agency','City/County':'case.locality','Printed Name of Defendant':'person.name','Address of Defendant':'person.street','City, State, Zip_1':'person.cityStateZip','Defendant Telephone No':'person.phone','Defendant Email Address':'person.email','Defendant Fax No':'person.fax'};
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
 const searchLabel=f.records.caseSearchResult==='shown'?'case appeared':f.records.caseSearchResult==='not_shown'?'case did not appear':'result not confirmed';
 const courtLabel=f.records.courtRecordStatus==='exists_unexpunged'?'actual court record still requires expungement':f.records.courtRecordStatus==='already_expunged'?'court record already expunged':'actual court status not confirmed';
 const disclosure=missing.map(m=>`${m.documentId?m.documentId+' page '+m.page+': ':''}${m.label??m.field??m.factId}: ${m.why}`);
 const charges=f.case.charges.map(c=>`${c.requested?'Requested':'Not requested on this form'} charge ${c.id}: ${c.description}; ${c.statute}; ${c.disposition}${has(c.convictionDate)?'; conviction '+c.convictionDate:''}.`);
 const fee=f.options.feeTreatment==='paid'?
  'You chose to pay. Maryland Judiciary lists a nonrefundable $30 filing fee per case for eligible guilty dispositions on 072D, including these cannabis convictions, not $30 per charge. Confirm the clerk\'s accepted payment method. No financial waiver application or MDJ-008 is included on this paid branch. Sponsorship does not itself waive a court fee.':
  'You expressly requested a prepaid-cost waiver because you cannot prepay. Submit ALL THREE pages of CC-DC-089 with the petition and the one-page MDJ-008 notice. No filing fee accompanies that request at submission. Give complete, truthful household income, assets and debts; exclude SNAP, your principal home, one vehicle and ordinary personal items as the source instructs. Never invent financial zeros or mark NONE for missing data. The financial document, not the whole criminal case, is identified as restricted. Sign/date your own request and MDJ-008 after review. Leave the attorney certification and every judicial finding/order selection blank. The judge, not LegalEase, decides. If denied or partly granted, follow the order and pay the unwaived amount within 10 days; otherwise the papers are treated as withdrawn. A prepaid waiver is not necessarily a final waiver. '+(f.options.finalOpenCostsRequested?'You separately requested a final waiver on the no-material-change assertion. Review that statement; the court decides at the end.':'You did not request final open-cost relief here. A later final request is a separate procedure.');
 return [
  ['Prepare and verify the actual court record',[
   'This packet uses official CC-DC-CR-072D for the stated cannabis CONVICTION, not the favorable-disposition form, an early-release form, a pardon application, a sentence-reduction application or a proposed expungement order. The government has not approved this request. Any example marked synthetic is not a real person\'s filing.',
   `Case ${show(f.case.number)}; ${show(f.person.name)}; ${show(f.court.option)}. Check the complete charging document, every disposition and sentence/supervision history. Record check: ${searchLabel} on Case Search; ${courtLabel}. Verification reference: ${show(f.records.confirmationReference)}. This is supplied information, not a LegalEase database search or invented clerk contact.`,
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
   'Primary authorities: Criminal Procedure 10-105(a)(11)-(12), (b)-(f); 10-110(a)(2)(ii), (b)-(h); 10-107(a)-(b); 10-112. Current Judiciary adult-expungement fee page resolves the old internal free/$30 uncertainty for 072D guilty dispositions. Current filing-fee-waiver page and CC-DC-089 require the conditional MDJ-008. Cannabis rules and fees reviewed through October 29, 2026; current CC-DC-CR-072D face remains revision10/2025. The held source is pinned separately; no new live binary match is claimed.',
   'Official form: https://www.mdcourts.gov/sites/default/files/court-forms/ccdccr072d.pdf ; fee/process: https://www.mdcourts.gov/legalhelp/expungement ; costs: https://www.mdcourts.gov/legalhelp/filingfeewaivers ; statutes: https://mgaleg.maryland.gov/mgawebsite/Laws/Statutes .'
  ]]
 ];
}
export async function renderMarylandCannabisPacket(input,overrides){
 if(!overrides||!overrides['CC-DC-CR-072D']||input.options?.feeTreatment==='waiver'&&(!overrides['CC-DC-089']||!overrides['MDJ-008']))throw Error('EXPLICIT_OFFICIAL_SOURCE_BYTES_REQUIRED');
 const v=validateMdCannabis(input),components=[await petition(v,overrides['CC-DC-CR-072D'])];
 if(v.facts.options.feeTreatment==='waiver'){components.push(await renderMdCostRequest(v,overrides['CC-DC-089']));components.push(await renderMdFinancialNotice(v,overrides['MDJ-008']));}
 const missing=[...v.missing,...components.flatMap(c=>c.blanks.filter(x=>x.requiredBeforeFiling))],sections=instructions(v,missing,components.map(c=>c.documentId));
 const guide=await renderMdCompanion(sections,input.isSyntheticFixture===true,'Maryland 072D companion'),doc=await PDFDocument.create(),pageManifest=[];
 for(const c of components){const p=await PDFDocument.load(c.bytes,{updateMetadata:false});for(const [i,page]of(await doc.copyPages(p,p.getPageIndices())).entries()){doc.addPage(page);pageManifest.push({packetPage:pageManifest.length+1,documentId:c.documentId,sourcePage:i+1,sourceSha256:c.source.sha256,componentSha256:c.sha256});}}
 const g=await PDFDocument.load(guide,{updateMetadata:false});for(const page of await doc.copyPages(g,g.getPageIndices())){doc.addPage(page);pageManifest.push({packetPage:pageManifest.length+1,documentId:'participant-instructions',role:'not_filed'});}
 stampDeterministic(doc);const bytes=Buffer.from(await doc.save({useObjectStreams:false}));const scan=scanBytesForActiveContent(bytes);assert(scan.inspectable&&!scan.hits.length,'ACTIVE_CONTENT_IN_PACKET');
 return {bytes,filingReady:false,sha256:hash(bytes),pageCount:doc.getPageCount(),components,pageManifest,missing,sections,earliest:v.earliest,mayMarkBasis:v.mayMarkBasis,allKnownFactsPrepared:missing.length===0};
}
