#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFArray, decodePDFRawStream } from 'pdf-lib';
import { normalizeOrNativeFieldMap } from './or-contempt-native-field-map.mjs';
import { checkboxCandidates } from './lib/pdf-stroked-boxes.mjs';

export const FAMILY = 'or_contempt_setaside-set';
export const ROUTE = 'obligation:track-pathway:OR:or_contempt_setaside:set-aside-of-eligible-convictions-under-ors-137-225-1-a';
export const DIRECTORY = `data/rcap-all50/overlays/census-v1/or/or-contempt-setaside-set--official-pdf-fill`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = 'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1';
const PROFILE = 'data/rcap-all50/overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration';
const SOURCE = [
 {sourceId:'official-form:OR-OJD-ADULT-SET-ASIDE-PACKET',path:`${LIB}/STATES/OR/02_PACKET_FORMS/OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf`,sha256:'b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071',pageCount:5},
 {sourceId:'official-form:OR-OSP-SET-ASIDE-CCH',path:`${LIB}/STATES/OR/04_SUPPORTING_PROCESS/OR__SUPPORT__OR-OSP-SET-ASIDE-CCH__oregon-state-police-set-aside-criminal-history-request-and-instructions__REV-2022-01__EN.pdf`,sha256:'a523a9ffc3eb0cc35d89e1c81df8eafcd703cf1ffdb4237a0106b72e1e793ac6',pageCount:2},
];
const COMPONENTS = ['primary-filing','proposed-order','fingerprint-step','service-instructions','record-gathering-instructions','objection-and-hearing-instructions','post-order-verification'];
const read = p => fs.readFileSync(path.join(ROOT,p));
const json = p => JSON.parse(read(p));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const writeJSON = (p,v) => {fs.mkdirSync(path.dirname(path.join(ROOT,p)),{recursive:true});fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2)+'\n');};
const stamp = doc => {doc.setCreationDate(new Date('2026-09-14T00:00:00Z'));doc.setModificationDate(new Date('2026-09-14T00:00:00Z'));doc.setProducer('RCAP saved review candidate');};
export function fixtures() {
 const base={jurisdiction:'OR',courtKind:'circuit',route:ROUTE,adult:true,county:'Multnomah',caseNumber:'19CR04170',name:'Jordan Avery Reyes',dob:'04/17/1991',street:'42 Maple Street',city:'Portland, OR 97205',phone:'503-555-0142',email:'jordan.reyes@example.org',aliases:[],sid:'OR00004170',arrestAgency:'Portland Police Bureau',arrestDate:'02/14/2019',fpn:'FPN00004170',court:'Circuit Court for Multnomah County',filingDate:'09/14/2026',sentenceCompleted:true,probationRevoked:false,otherConvictions:false,sameEpisodeOtherConviction:false,pendingCharges:false,excludedOffense:false,gei:false,immigrationConcern:false,oppositionKnown:false,recordsVerified:true,eligibilityBeliefConfirmed:true,waitingPeriodConfirmed:true,serviceIntentConfirmed:true,fingerprintsFiled:false,feePaid:false,fingerprintCardIncluded:false,feeIncluded:false,currentOspFeeConfirmed:false,swornExecutionComplete:false,mailingComplete:false,prosecutorAddress:null,selection:'all',charges:[{count:'1',name:'Theft in the second degree',disposition:'conviction',class:'Class A misdemeanor',judgmentDate:'05/20/2019',releaseDate:'05/20/2019',eligibleOn:'05/20/2022',selected:true}]};
 return {canonical:base,boundary:{...structuredClone(base),name:"Maria-Alejandra O'Shaughnessy-Whitfield",county:'Josephine',court:'Circuit Court for Josephine County',caseNumber:'18CR0012760',dob:'12/31/1968',street:'1188 Upper Notch Crossing Road, Apartment 14B',city:'Grants Pass, OR 97526-2214',phone:'541-555-0199',email:'maria.alejandra.oshaughnessy.whitfield@longmailexample.org',aliases:['Maria Alejandra Whitfield','Maria OShaughnessy','Maria A Whitfield'],sid:'OR00012760',fpn:'FPN00012760',arrestAgency:'Grants Pass Police Department',arrestDate:'01/12/2018',selection:'partial',charges:[{...base.charges[0],judgmentDate:'04/15/2018',releaseDate:'04/15/2018',eligibleOn:'04/15/2021'},...Array.from({length:7},(_,i)=>({count:String(i+2),name:`Criminal mischief - dismissed allegation ${i+2}`,disposition:'dismissed',selected:true})),{count:'9',name:'Driving under the influence of intoxicants',disposition:'diversion_dismissed',selected:false}]}};
}
export function validateInput(f,{filing=false}={}) {
 assert.equal(f.jurisdiction,'OR');assert.equal(f.courtKind,'circuit');assert.equal(f.route,ROUTE);assert.equal(f.adult,true);
 for(const k of ['county','caseNumber','name','dob','street','city','phone','email','court','filingDate','arrestAgency','arrestDate'])assert.equal(typeof f[k],'string',`Missing ${k}`);
 for(const k of ['sentenceCompleted','recordsVerified','eligibilityBeliefConfirmed','waitingPeriodConfirmed','serviceIntentConfirmed'])assert.equal(f[k],true,`Unresolved ${k}`);
 for(const k of ['probationRevoked','otherConvictions','sameEpisodeOtherConviction','pendingCharges','excludedOffense','gei','immigrationConcern','oppositionKnown'])assert.equal(f[k],false,`Outside supported scope: ${k}`);
 assert(f.court===`Circuit Court for ${f.county} County`);assert(/^\d{3}-\d{3}-\d{4}$/.test(f.phone));assert(f.aliases.length<=3);
 assert(['all','partial'].includes(f.selection));assert(f.charges.length>0);assert.equal(new Set(f.charges.map(c=>c.count)).size,f.charges.length);
 const chosen=f.charges.filter(c=>c.selected);assert(chosen.length>0);assert(chosen.some(c=>c.disposition==='conviction'));
 assert(chosen.every(c=>['conviction','dismissed','acquitted'].includes(c.disposition)),'Unsupported selected disposition');
 assert.equal(f.selection==='all',chosen.length===f.charges.length,'Charge election inconsistent');
 for(const c of chosen.filter(c=>c.disposition==='conviction')) {
  assert.equal(c.class,'Class A misdemeanor','Other offense classes require their exact approved eligibility inputs');
  for(const key of ['judgmentDate','releaseDate','eligibleOn'])assert(Number.isFinite(Date.parse(c[key])));
  const latest=new Date(Math.max(Date.parse(c.judgmentDate),Date.parse(c.releaseDate)));latest.setUTCFullYear(latest.getUTCFullYear()+3);
  assert(Date.parse(c.eligibleOn)>=latest.getTime());assert(Date.parse(f.filingDate)>=Date.parse(c.eligibleOn));
 }
 if(filing)for(const k of ['fingerprintsFiled','feePaid','currentOspFeeConfirmed','swornExecutionComplete','mailingComplete'])assert.equal(f[k],true,`Before filing: ${k}`);
 if(filing)assert(f.prosecutorAddress,'Before filing: confirmed prosecutor mailing address');
 return {selected:chosen};
}
function mark(page,box,evidence,label,pageNumber){const inset=2;for(const reverse of [false,true])page.drawLine({start:{x:box.x0+inset,y:reverse?box.y1-inset:box.y0+inset},end:{x:box.x1-inset,y:reverse?box.y0+inset:box.y1-inset},thickness:0.9,color:rgb(0,0,0)});evidence.push({kind:'selection',label,page:pageNumber,box,sourceBoxRetained:true});}
function text(page,font,value,box,evidence,label,pageNumber,{size=10,fallback='See attachment'}={}) {
 let rendered=String(value);if(font.widthOfTextAtSize(rendered,size)>box.width)rendered=fallback;
 assert(font.widthOfTextAtSize(rendered,size)<=box.width,`No readable fit: ${label}`);
 page.drawText(rendered,{x:box.x,y:box.y,size,font,color:rgb(0,0,0)});
 evidence.push({kind:'text',label,page:pageNumber,value:String(value),rendered,box,fontSize:size,overflow:rendered!==String(value)});
}
function content(page){const contents=page.node.get(PDFName.of('Contents'));const refs=contents instanceof PDFArray?contents.asArray():[contents];return refs.filter(Boolean).map(ref=>Buffer.from((()=>{const stream=page.doc.context.lookup(ref);return stream.getUnencodedContents?stream.getUnencodedContents():decodePDFRawStream(stream).decode();})()).toString('latin1')).join('\n');}
async function original(title,f,paragraphs,evidence,documentId){
 const doc=await PDFDocument.create();stamp(doc);const font=await doc.embedFont(StandardFonts.TimesRoman);const bold=await doc.embedFont(StandardFonts.TimesRomanBold);let page,y,pageNo=0;
 function fresh(){page=doc.addPage([612,792]);pageNo++;y=724;page.drawText(title,{x:54,y,size:14,font:bold});y-=24;page.drawText('SYNTHETIC REVIEW SAMPLE - DO NOT FILE',{x:54,y:30,size:8,font});}
 fresh();
 for(const para of [`Circuit Court of Oregon, ${f.county} County`,`State of Oregon v. ${f.name}`,`Case ${f.caseNumber}`, ...paragraphs]) {
  if(para==='__JUDGE__'){if(y<170)fresh();for(const label of ['Date of entry:','Circuit Court Judge:']){page.drawText(label,{x:54,y,size:12,font});page.drawLine({start:{x:200,y:y-2},end:{x:520,y:y-2},thickness:0.5});evidence.push({kind:'protected',label,documentId,page:pageNo,box:{x:200,y:y-2,width:320,height:20}});y-=36;}continue;}
  const words=para.split(/\s+/);let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(next,12)>504&&line){if(y<72)fresh();text(page,font,line,{x:54,y,width:504,height:16},evidence,documentId,pageNo,{size:12});y-=18;line=word;}else line=next;}
  if(line){if(y<72)fresh();text(page,font,line,{x:54,y,width:504,height:16},evidence,documentId,pageNo,{size:12});y-=18;}y-=9;
 }
 return doc;
}
async function saveDoc(doc,rel){stamp(doc);const bytes=await doc.save();fs.mkdirSync(path.dirname(path.join(ROOT,rel)),{recursive:true});fs.writeFileSync(path.join(ROOT,rel),bytes);return {file:rel,sha256:hash(bytes),byteLength:bytes.length,pageCount:doc.getPageCount()};}

export async function build(){
 for(const s of SOURCE){const bytes=read(s.path);assert.equal(hash(bytes),s.sha256);assert.equal((await PDFDocument.load(bytes)).getPageCount(),s.pageCount);}
 const acceptance=json('data/rcap-grade-a/packet-factory-24h/vf02/or-contempt-mapping-completion-acceptance-20260912.json');assert.equal(acceptance.status,'PASS_MAPPING_COMPLETION_ONLY');
 const profile=json(`${PROFILE}/overlay-profile.json`),census=json(`${PROFILE}/field-census.json`),geometry=json('data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json');
 const packets=[],allWrites=[],fieldMaps=[];
 for(const [fixture,f]of Object.entries(fixtures())) {
  const {selected}=validateInput(f);const evidence=[],components=[];const target=`${DIRECTORY}/components/${fixture}`;
  const motion=await PDFDocument.load(read(SOURCE[0].path));const font=await motion.embedFont(StandardFonts.Helvetica);
  const facts={'matter.county':f.county,'matter.case_number':f.caseNumber,'participant.full_legal_name':f.name,'participant.date_of_birth':f.dob,'participant.email':f.email,'participant.street_address':f.street,'participant.city_state_zip':f.city,'participant.phone':f.phone};
  for(const a of profile.anchors)text(motion.getPage(a.page-1),font,facts[a.factId],a.writeBox,evidence,a.label,a.page,{fallback:a.factId==='participant.phone'?'Att.':'See attachment'});
  const slots=Object.fromEntries(census.fields.map(x=>[x.name,x]));
  const fillSlot=(id,value,label)=>{const s=slots[id];assert(s,id);text(motion.getPage(s.page-1),font,value,s.widgets[0].rect,evidence,label,s.page);};
  fillSlot('p4.r564.1.x146.rule',f.sid||'Unknown','SID if known');fillSlot('p4.r537.8.x277.rule',f.arrestAgency,'Arrest agency');fillSlot('p4.r512.2.x134.rule',f.arrestDate,'Arrest date');fillSlot('p4.r479.0.x264.rule',f.fpn||'Unknown','FPN if known');
  fillSlot('p5.r115.6.x288.rule',f.name,'Printed name on mailing certificate');
  const boxes=checkboxCandidates(content(motion.getPage(3))).sort((a,b)=>b.y0-a.y0);
  assert.equal(boxes.length,6,'Exact OJD Option controls changed');
  mark(motion.getPage(3),geometry.options.find(o=>o.page===4&&o.option==='Option 1').box,evidence,'Option 1',4);
  mark(motion.getPage(3),boxes[f.selection==='all'?1:2],evidence,`${f.selection} charges`,4);
  if(f.selection==='partial') {
   selected.slice(0,7).forEach((c,i)=>{const ys=[295.2,282.1,269.2,256.2,243.1,230.2,217.2];fillSlot(`p4.r${ys[i].toFixed(1)}.x144.rule`,c.name,`Selected charge ${i+1}`);fillSlot(`p4.r${ys[i].toFixed(1)}.x477.rule`,c.count,`Selected count ${i+1}`);});
   if(selected.length>7)mark(motion.getPage(3),boxes[3],evidence,'Additional selected charges attached',4);
  }
  const declarations=[f.waitingPeriodConfirmed,f.eligibilityBeliefConfirmed,f.fingerprintsFiled,f.serviceIntentConfirmed,!f.pendingCharges,f.feePaid,f.sentenceCompleted];
  geometry.declarationBoxes.forEach((b,i)=>{if(declarations[i])mark(motion.getPage(4),b.box,evidence,`Declaration ${i+1}`,5);});
  for(const id of ['p5.r378.2.x72.rule','p5.r378.2.x288.rule','p5.r229.8.x186.rule','p5.r154.8.x72.rule','p5.r154.8.x288.rule'])evidence.push({kind:'protected',label:id,page:5,box:slots[id].widgets[0].rect});
  const motionInfo=await saveDoc(motion,`${target}/official-motion-and-instructions.pdf`);components.push({...motionInfo,documentId:'official-motion-and-instructions',role:'primary_filing'});
  const attachment=await original('Attachment to Motion and Declaration',f,[
   'This attachment supplies the full identifying facts and selected charge list referenced by Att. or See attachment on the official motion. It is part of the motion and must accompany every copy served or filed.',
   `Full legal name: ${f.name}. Date of birth: ${f.dob}.`, `Address: ${f.street}; ${f.city}. Phone: ${f.phone}. Email: ${f.email}.`,
   `SID: ${f.sid||'unknown'}. FPN: ${f.fpn||'unknown'}. Arrest agency: ${f.arrestAgency}. Arrest/citation date: ${f.arrestDate}.`,
   `Relief election: ${f.selection==='all'?'all charges in this case':'only the selected counts listed below'}. The motion proceeds under ORS 137.225(1)(a), Option 1.`,
   ...selected.map(c=>`SELECTED Count ${c.count}: ${c.name}; disposition: ${c.disposition}.`),
   ...f.charges.filter(c=>!c.selected).map(c=>`EXCLUDED from this motion - Count ${c.count}: ${c.name}; disposition: ${c.disposition}. No relief is requested for this count.`),
   'The defendant adopts this attachment when signing the declaration on the official motion. Signature and execution date remain for the defendant. The certificate of mailing must describe an actual mailing; it is not pre-executed.'
  ],evidence,'motion-attachment');components.push({...await saveDoc(attachment,`${target}/motion-attachment.pdf`),documentId:'motion-attachment',role:'primary_filing_continuation'});
  const order=await original('Proposed Order Setting Aside and Sealing',f,[
   'PROPOSED - submitted for the court to review. This document is not an entered order and makes no finding until the court adopts and signs it.',
   'Upon consideration of the motion, declaration, records, any objection and any hearing, the Court finds that the requirements of ORS 137.225 for the relief specifically granted below are satisfied.',
   `IT IS ORDERED that the following selected records in case ${f.caseNumber} are set aside and sealed under ORS 137.225:`,
   ...selected.map(c=>`Count ${c.count}: ${c.name}; ${c.disposition}.`),
   ...(f.selection==='partial'?['No relief is granted for any count not listed above.']:[]),
   'The records concerning the matters ordered set aside shall be sealed as provided by ORS 137.225. The clerk shall distribute the entered order as required by law to the appropriate courts and public agencies, including Oregon State Police and the identified arresting agency.',
   'This order does not adjudicate restoration of firearm rights or direct federal, tribal, out-of-state, or private entities to destroy records. Any relief is limited to the Oregon records specified above.',
   '__JUDGE__'
  ],evidence,'proposed-order');components.push({...await saveDoc(order,`${target}/proposed-order.pdf`),documentId:'proposed-order',role:'proposed_order'});
  const osp=await PDFDocument.load(read(SOURCE[1].path));const ospFont=await osp.embedFont(StandardFonts.Helvetica);const form=osp.getForm();
  const ospValues={'NAME':f.name,'DATE OF BIRTH':f.dob,'AREA CODE':f.phone.slice(0,3),'PHONE NUMBER':f.phone.slice(4),'Street, City, State, Zip code':`${f.street}; ${f.city}`,'ALIAS NAME1':f.aliases[0]||'None','ALIAS NAME2':f.aliases[1]||'None','ALIAS NAME3':f.aliases[2]||'None','1':f.court};
  for(const [name,value]of Object.entries(ospValues)){const field=form.getTextField(name),box=field.acroField.getWidgets()[0].getRectangle();let size=10;while(size>9&&ospFont.widthOfTextAtSize(value,size)>box.width-4)size-=.5;assert(ospFont.widthOfTextAtSize(value,size)<=box.width-4,`OSP full value cannot fit ${name}`);field.setText(value);field.setFontSize(size);field.updateAppearances(ospFont);evidence.push({kind:'widget',documentId:'osp-request',page:1,label:name,value,rendered:value,fontSize:size,box});}
  form.getCheckBox('YES').check();form.getCheckBox('NO').uncheck();if(f.fingerprintCardIncluded)form.getCheckBox('Fingerprint Card Form').check();if(f.feeIncluded)form.getCheckBox('Fee for set aside of CONVICTION Include check or money order in the amount of 3300 payable').check();
  form.updateFieldAppearances(ospFont);form.flatten();components.push({...await saveDoc(osp,`${target}/osp-request-and-instructions.pdf`),documentId:'osp-request',role:'record_gathering_instructions',deliveryRole:'separate_agency_handoff'});
  const paragraphs=[
   '1. Scope and records. This packet covers an adult Oregon circuit-court Option 1 motion under ORS 137.225(1)(a). Obtain and compare the complete OSP/LEDS history, judgment, sentence and payment records, and all charge dispositions. The court decides eligibility. Do not file with unresolved other convictions, same-episode convictions, pending charges, offense exclusions, probation revocation, GEI, immigration concerns or an objection without appropriate legal help.',
   `The selected case is ${f.caseNumber} in ${f.court}. The requested counts are ${selected.map(c=>c.count).join(', ')}. Verify all names, dates, count numbers and dispositions. ${f.selection==='partial'?'The excluded count is not included in either the motion or proposed relief.':'The all-charge election applies only if every charge in this case qualifies.'}`,
   '2. Waiting and completion. For the supported Class A misdemeanor conviction, review the three-year waiting period measured from conviction or release from imprisonment, whichever is later, and sentence completion. Other convictions, probation revocation, contempt categories and other offense classes require their own applicable rules; this sample does not decide those branches.',
   '3. Fingerprints and OSP. Obtain a properly rolled FD-258 fingerprint card. Complete printed name, required signatures, date of birth and the reason APPLICATION FOR SET ASIDE ORS 137.225. Submit the completed OSP request and fingerprint card to Oregon State Police, CJIS - Unit 11, ATTN: SET ASIDE, P.O. Box 4395, Portland, OR 97208-4395. Keep proof of submission. OSP sends the results to the prosecutor; this does not replace filing the motion with the court.',
   '4. Fees. The official motion states No Filing Fee. The held OSP form effective January 2022 prints a $33 conviction record-check fee. Confirm the current OSP amount and accepted payment before submission; include the required check or money order payable to Oregon State Police. A court filing-fee waiver does not establish waiver of the separate OSP charge. Do not mark fee paid or fingerprint submitted until true.',
   '5. Sign and serve. Read the motion, its attachment and every declaration. Fingerprints-filed and OSP-fee-paid boxes are deliberately unchecked until those acts occur. Sign and date the official declaration yourself only after every required statement is true. Make two copies of the motion, declaration and attachment: one for yourself and one to mail to the prosecuting attorney. Confirm that prosecutor\'s current address using the official county directory linked in the enclosed OJD instructions; supply the address on the mailing certificate. After actual mailing, complete its actual date, sign and date it. The printed defendant name is already supplied.',
   '6. File in the circuit court where the case occurred. Submit the official motion and declaration, attachment, and proposed order in the format the clerk accepts. Confirm the court\'s filing method and any local requirements using the OJD court directory in the enclosed instructions. The OSP request and fingerprint card belong to the agency submission, not as substitutes for court pleadings. This review assembly groups both deliveries only for inspection; separate them before submission.',
   '7. Objection and hearing. The enclosed official instructions describe a typical 120-day prosecutor objection period. Monitor court notices; if an objection or hearing arises, read it promptly and obtain help as needed. File and attend as the court directs. No proposed order is effective merely because it is included in this packet.',
   '8. After an entered order. Obtain the signed order, confirm the clerk\'s distribution and check that the relevant court and Oregon agency records were updated. Keep your own copies securely. A set-aside does not guarantee removal from private databases or federal/out-of-state records and does not itself restore firearm rights.',
   'Before filing: replace every synthetic fact with verified participant information; confirm current OSP fee, actual fingerprint submission and payment, the prosecutor address, every required declaration, actual signature/date and actual mailing. The OSP enclosure checkboxes must reflect items physically enclosed. Unknown agency completion and judicial signature/date are never generated.',
  ];
  const guide=await original('Filing and Agency Submission Instructions',f,paragraphs,evidence,'participant-guide');components.push({...await saveDoc(guide,`${target}/participant-guide.pdf`),documentId:'participant-guide',role:'filing_instructions'});
  const assembled=await PDFDocument.create();stamp(assembled);let next=1;const docs=[];
  for(const c of components){const d=await PDFDocument.load(read(c.file));for(const p of await assembled.copyPages(d,d.getPageIndices()))assembled.addPage(p);docs.push({...c,firstPage:next});next+=c.pageCount;}
  const packet=await saveDoc(assembled,`${DIRECTORY}/fixtures/${fixture}.pdf`);packets.push({...packet,file:`fixtures/${fixture}.pdf`,fixture,fixtureRole:fixture,pageCount:packet.pageCount,documents:docs,filingReady:false});
  const map=census.fields.map(field=>({field:field.name,page:field.page,disposition:field.page<=3?'printed_instruction_rule':evidence.some(w=>w.label===field.name&&w.kind==='protected')?'participant_execution_protected':profile.anchors.some(a=>a.slot===field.name)||['p4.r564.1.x146.rule','p4.r537.8.x277.rule','p4.r512.2.x134.rule','p4.r479.0.x264.rule','p5.r115.6.x288.rule'].includes(field.name)?'known_fact_written_or_attached':field.name.startsWith('p4.r2')&&field.name.includes('rule')?'charge_row_selected_or_not_applicable':field.name==='p5.r211.1.x432.rule'||field.name==='p5.r192.4.x72.rule'?'prosecutor_address_required_before_filing':'off_route_or_printed_rule',box:field.widgets[0].rect}));
  fieldMaps.push({fixture,fields:map});allWrites.push({fixture,writes:evidence});writeJSON(`${DIRECTORY}/fixtures/${fixture}.json`,f);writeJSON(`${DIRECTORY}/${fixture}.coverage.json`,{fixture,knownValues:allWrites.at(-1),components:docs,requiredBeforeFiling:['actual fingerprint submission','actual OSP payment','confirmed current fee','confirmed prosecutor mailing address','participant declaration signature/date','actual mailing certificate signature/date'],filingReady:false});
 }
 writeJSON(`${DIRECTORY}/source-receipt.json`,{familyId:FAMILY,documents:SOURCE.map(s=>({...s,byteLength:read(s.path).length})),allSourcesExact:true,identityAcceptance:'data/rcap-grade-a/packet-factory-24h/vf02/or-contempt-mapping-completion-acceptance-20260912.json'});
 writeJSON(`${DIRECTORY}/packet-set-manifest.json`,{familyId:FAMILY,routeKeys:[ROUTE],canonicalRuntimeRouteId:'OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a',legacyAliases:['or_contempt_setaside',FAMILY],components:COMPONENTS.map((role,i)=>({componentId:`or_contempt_setaside-${role}-${i+1}`,role})),implementationStrategy:'official_pdf_fill',proposedOrderStrategy:'custom_pleading',proposedOrderBasis:'Captain authorized a composed proposed order because exact OJD packet has motion/instructions but no order.',sourceHashes:SOURCE,filingReady:false});
 writeJSON(`${DIRECTORY}/reports/rendered-artifacts.json`,{familyId:FAMILY,schemaVersion:'rcap-rendered-artifacts/v1',packets,measurementScope:'Saved component and assembled packet SHA/page identities; planned writes are not independently measured output proof.',addedGlyphsReadFromOutputBytes:null,flattenedWidgetAppearancesReadFromOutputBytes:null,nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:null});
 writeJSON(`${DIRECTORY}/reports/expected-writes.json`,{familyId:FAMILY,measurementKind:'author_expected_placements_not_independent_measurement',fixtures:allWrites});
 const nativeMap=await normalizeOrNativeFieldMap({root:ROOT,directory:DIRECTORY,familyId:FAMILY,fixtures:fixtures(),expectedWrites:allWrites,census,sourcePath:SOURCE[1].path,retainedCensus:fieldMaps});writeJSON(`${DIRECTORY}/production-field-map.json`,nativeMap);
 writeJSON(`${DIRECTORY}/reports/actual-writes.json`,{familyId:FAMILY,derivedFromArtifactBytes:false,documents:[...new Set(nativeMap.writes.map(w=>w.documentId))].map(documentId=>({documentId,actualWrites:nativeMap.writes.filter(w=>w.documentId===documentId).map(w=>({field:w.field,page:w.page,rect:w.rect,factId:w.factId,expected:w.value}))})),artifacts:packets.map(p=>({fixture:p.fixture,sha256:p.sha256,valuesReportedByFinalizer:nativeMap.writes.filter(w=>w.fixture===p.fixture).length,addedGlyphsReadFromOutputBytes:null,flattenedWidgetAppearancesReadFromOutputBytes:null,nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:null,refusedFieldsWithInk:null})),measurementScope:'Expected placements only; independent current-byte proof pending.'});
 writeJSON(`${DIRECTORY}/build-status.json`,{familyId:FAMILY,status:'BUILT_RASTER_PENDING',artifactStatus:'complete_saved_candidate',reviewStatus:'independent_review_pending',visualReview:'pending',commercialAuthorityGranted:false});
 writeJSON(`${DIRECTORY}/approval-request.json`,{schemaVersion:'rcap-output-approval-request/v1',familyId:FAMILY,status:'PENDING_RASTER_AND_FINAL_INDEPENDENT_REVIEW',artifactLegalReview:'REQUIRED',commercialAuthorityGranted:false});
 writeJSON(`${DIRECTORY}/product-wiring.json`,{familyId:FAMILY,routeKeys:[ROUTE],generationAllowed:false,checkoutAllowed:false,commercialAuthorityGranted:false,approvedForLive:false,productionTouched:false});
 fs.writeFileSync(path.join(ROOT,DIRECTORY,'participant-instructions.md'),'# Oregon Option 1 motion\n\nRead the complete participant-guide.pdf and all five official OJD pages. Verify records, waiting period, sentence completion and every selected charge. Confirm current OSP fee, submit actual fingerprints/payment, confirm the prosecutor mailing address, sign the declaration, complete actual service and file in the circuit court. Separate the OSP agency request from the court delivery. Judicial and participant execution fields remain blank. Other convictions, same-episode ambiguity, pending charges, local-court, GEI and unsupported classes require separate review. No automatic firearm-rights restoration or private-database deletion is promised.\n');
 return {familyId:FAMILY,directory:DIRECTORY,packets,allWrites,fieldMaps};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))build().then(r=>console.log(JSON.stringify({familyId:r.familyId,packets:r.packets.map(({fixture,sha256,pageCount})=>({fixture,sha256,pageCount}))},null,2)));
