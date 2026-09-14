import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {PDFDocument, PDFName, StandardFonts, rgb} from 'pdf-lib';
import {fitTextToWidget, applyFitToTextField, wrapToWidth} from './rcap-official-forms/rcap-text-fitting.mjs';
import {sanitizeAndFlatten, scanBytesForActiveContent} from './rcap-official-forms/rcap-active-content.mjs';
import {stampDeterministic} from './rcap-official-forms/rcap-deterministic-pdf-date.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FAMILY='ne-trafficking-setaside-and-seal-set';
const OUT='data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill';
const ROUTES=['obligation:unit:NE:ne-trafficking-setaside-and-seal:ne_trafficking_setaside_motion','obligation:unit:NE:ne-trafficking-setaside-and-seal:ne_trafficking_seal_motion'];
const SOURCES={CC612:{sourceId:'official-form:CC-6-12',path:'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/NE/02_PACKET_FORMS/NE__FORM__CC-6-12__motion-to-seal-an__REV-2024-04__EN.pdf',sha256:'68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28',pages:2}};
const HELD_ROOT=process.env.RCAP_HELD_SOURCE_ROOT||ROOT;
const RECORDS=['data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json','data/record-clearing/legal-design-track-registry.json','docs/rcap/grade-a/research/2026-09-06-batch-02/Packet_Blocker_Batch_02_Handoff.md'];
const j=x=>JSON.stringify(x,null,2)+'\n';
export const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const t=x=>x==null?'':String(x).trim();
const fullName=p=>[p.firstName,p.middleName,p.lastName].map(t).filter(Boolean).join(' ');
const addressLine=p=>[p.address,[p.city,p.state,p.zip].map(t).filter(Boolean).join(' ')].filter(Boolean).join(', ');
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(t(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`INVALID_DATE:${v}`);return `${v.slice(5,7)}/${v.slice(8,10)}/${v.slice(0,4)}`};
function pageOf(doc,widget){const p=widget.dict.get(PDFName.of('P'))?.toString();return doc.getPages().findIndex(x=>x.ref.toString()===p)+1;}
function rectOf(widget){const r=widget.getRectangle();return {x:Math.min(r.x,r.x+r.width),y:Math.min(r.y,r.y+r.height),width:Math.abs(r.width),height:Math.abs(r.height)};}
function normalizeWidgets(doc){for(const field of doc.getForm().getFields())for(const w of field.acroField.getWidgets()){const r=rectOf(w);w.setRectangle(r);}}
function required(o,k,label=k){if(!t(o?.[k]))throw Error(`REQUIRED_INPUT:${label}`);return o[k];}
function validateMoney(v,label){if(v==null||v==='')throw Error(`REQUIRED_FINANCIAL_INPUT:${label}`);if(!Number.isFinite(Number(v))||Number(v)<0)throw Error(`INVALID_FINANCIAL_INPUT:${label}`);return Number(v).toFixed(2);}
async function loadPdf(key,root=HELD_ROOT){const s=SOURCES[key],bytes=fs.readFileSync(path.join(root,s.path));if(hash(bytes)!==s.sha256)throw Error(`SOURCE_HASH_MISMATCH:${key}`);const d=await PDFDocument.load(bytes,{updateMetadata:false});if(d.getPageCount()!==s.pages)throw Error(`SOURCE_PAGE_COUNT:${key}`);for(const f of d.getForm().getFields())if(typeof f.isRichFormatted==='function'&&f.isRichFormatted())f.disableRichFormatting();normalizeWidgets(d);return {doc:d,bytes};}
async function finishForm(doc,written,audit){const font=await doc.embedFont(StandardFonts.Helvetica);const {clean,report}=await sanitizeAndFlatten(doc,{defaultFont:font,writtenFields:written,detachNestedControlFields:true,suppressSynthesizedAppearances:true,fitAppearancesToRect:true,suppressSynthesizedWidgetBorders:true,honorWidgetBorderStyle:true});stampDeterministic(clean);const bytes=await clean.save({useObjectStreams:false});if(scanBytesForActiveContent(bytes).length)throw Error('ACTIVE_CONTENT');return {bytes,pages:clean.getPageCount(),audit:{...audit,sanitization:report}};}
async function setText(doc,name,value,written,mapped,factId,{min=8,max=10,multiline=false}={}){if(!t(value))return;const form=doc.getForm(),field=form.getTextField(name);if(multiline)field.enableMultiline();const widgets=field.acroField.getWidgets();if(widgets.length!==1)throw Error(`UNEXPECTED_WIDGET_COUNT:${name}`);const rect=rectOf(widgets[0]),font=await doc.embedFont(StandardFonts.Helvetica);const fit=fitTextToWidget({font,text:t(value),rect,multiline:multiline||field.isMultiline(),minFontSize:min,maxFontSize:max,evaluateDeclaredMinimumSize:true});if(!applyFitToTextField(field,fit))throw Error(`FIELD_OVERFLOW:${name}:${fit.reason}`);written.add(name);mapped.push({field:name,label:name,printedLabel:name,page:pageOf(doc,widgets[0]),rect:[rect.x,rect.y,rect.width,rect.height],value:t(value),factId,fontSize:fit.fontSize,isSelectionControl:false});}
function setCheck(doc,name,written,mapped,factId){const field=doc.getForm().getCheckBox(name),w=field.acroField.getWidgets()[0],r=rectOf(w);field.check();written.add(name);mapped.push({field:name,label:name,printedLabel:name,page:pageOf(doc,w),rect:[r.x,r.y,r.width,r.height],value:'X',factId,isSelectionControl:true});}
function mapRows(fixture,component,result){const writes=(result.mapped??[]).map((w,i)=>({fieldId:`${fixture}/${component}/${w.field}/${i}`,field:w.field,name:w.field,label:w.label,printedLabel:w.printedLabel,documentId:w.document||`${fixture}/${component}`,fixture,page:w.page,rect:w.rect,value:w.value,factId:`${fixture}.${w.factId}`,decision:'write',isSelectionControl:w.isSelectionControl}));const blanks=(result.blanks??[]).map(x=>({...x,fieldId:x.fieldId||`${fixture}/${component}/${x.field}`,documentId:x.document?`${fixture}/${x.document}`:`${fixture}/${component}`,fixture}));return {writes,blanks};}
function markdownInstructions(sections){return sections.map(s=>`## ${s.heading}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n')+'\n';}
function validatePacketText(bytes,expected,forbidden){const tmp=`/tmp/mo-packet-${process.pid}-${Math.random().toString(16).slice(2)}.pdf`,txt=tmp+'.txt';fs.writeFileSync(tmp,bytes);const p=spawnSync('pdftotext',['-layout',tmp,txt],{encoding:'utf8'});if(p.status!==0)throw Error(`PDFTOTEXT_FAILED:${p.stderr}`);const out=fs.readFileSync(txt,'utf8').replace(/\s+/g,' ');for(const x of expected)if(!out.includes(x.replace(/\s+/g,' ')))throw Error(`OUTPUT_TEXT_MISSING:${x}`);for(const x of forbidden)if(out.includes(x))throw Error(`DELIVERED_INTERNAL_TEXT:${x}`);return {characters:out.replace(/\s/g,'').length};}
async function assemble(components){const doc=stampDeterministic(await PDFDocument.create()),coverage=[];let first=1;for(const c of components){const d=await PDFDocument.load(c.bytes,{updateMetadata:false});for(const p of await doc.copyPages(d,d.getPageIndices()))doc.addPage(p);coverage.push({documentId:c.id,role:c.role,firstPage:first,pageCount:c.pages,lastPage:first+c.pages-1,sha256:hash(c.bytes)});first+=c.pages;}return {bytes:await doc.save({useObjectStreams:false}),pages:doc.getPageCount(),coverage};}
function textPageBuilder(title,sections,{header='LEGALEASE | NEBRASKA',footer='Keep instructions separate from court forms'}={}){return async()=>{const doc=stampDeterministic(await PDFDocument.create()),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);let page,y,pageNo=0;const next=()=>{page=doc.addPage([612,792]);pageNo++;page.drawText(header,{x:42,y:754,size:9,font:bold});page.drawText(title,{x:42,y:727,size:16,font:bold});y=698};next();for(const sec of sections){const h=wrapToWidth(bold,sec.heading,11,528);const paragraphs=sec.paragraphs.flatMap(p=>wrapToWidth(font,p,9.2,528));const needed=h.length*14+12+Math.min(paragraphs.length,5)*12;if(y-needed<48)next();for(const line of h){page.drawText(line,{x:42,y,size:11,font:bold});y-=14}y-=5;for(const para of sec.paragraphs){const lines=wrapToWidth(font,para,9.2,528);if(y-lines.length*12-12<45)next();for(const line of lines){page.drawText(line,{x:42,y,size:9.2,font});y-=12}y-=7;}}
 for(const [i,p] of doc.getPages().entries())p.drawText(`${footer} | Page ${i+1} of ${doc.getPageCount()}`,{x:42,y:25,size:7.5,font});return {bytes:await doc.save({useObjectStreams:false}),pages:doc.getPageCount()};};}

// Stage-specific snapshots: a future sealing motion is never generated from a
// first-stage input. Synthetic post-order snapshots are separate review cases.
export function fixtureOf(boundary=false,stage='set-aside') {
 return {synthetic:true,stage,adult:true,participant:{name:boundary?'Alexandria Montgomery Example':'Jordan Example',address:boundary?'9876 Synthetic Long Residence Lane':'412 Example Avenue',city:'Lincoln',state:'NE',zip:'68508',phone:'402-555-0142',email:boundary?null:'jordan@example.org',noEmailReason:boundary?'No internet access':null},court:{division:'DISTRICT',county:'LANCASTER',caseNumber:boundary?'SYNTH-CR-25-002':'SYNTH-CR-25-001'},offense:{description:boundary?'Synthetic other offense':'Synthetic prostitution-related offense',chargeDate:'2025-01-10',convictionDate:'2025-03-10',sentenceCompleteDate:'2025-11-10',sentenceComplete:true,branch:boundary?'other-offense':'prostitution-related',basis:boundary?'proximately-caused':'victim-at-time',account:boundary?'My participation in the identified offense was proximately caused by my status as a victim of sex trafficking. This is a synthetic sample account for review.':'I was a victim of sex trafficking when I committed the identified prostitution-related offense. This is a synthetic sample account for review.'},inCameraRequested:boundary,stageOneProcedure:{confirmation:'REQUIRED_BEFORE_FILING'},...(stage==='seal'?{setAsideOrder:{granted:true,traffickingBased:true,signedOrderVerified:true,caseNumber:boundary?'SYNTH-CR-25-002':'SYNTH-CR-25-001',date:'2026-01-12'},allChargesResolvedByTraffickingSetAside:true,stillPublic:true}:{})};
}
export function importFacts(input) {
 const f=structuredClone(input);
 if(!['set-aside','seal'].includes(f.stage))throw Error('STAGE_REQUIRED');
 if(f.adult!==true)throw Error('JUVENILE_REQUIRES_SEPARATE_MECHANISM');
 for(const k of ['name','address','city','state','zip','phone'])required(f.participant,k);
 for(const k of ['division','county','caseNumber'])required(f.court,k);
 if(!['DISTRICT','COUNTY'].includes(f.court.division))throw Error('ADULT_COURT_REQUIRED');
 for(const k of ['description','chargeDate'])required(f.offense,k);
 date(f.offense.chargeDate);
 if(!f.participant.email&&!f.participant.noEmailReason)throw Error('EMAIL_OR_ACTUAL_INABILITY_REASON_REQUIRED');
 if(f.stage==='seal') {
  const o=f.setAsideOrder;
  if(!o||o.granted!==true||o.traffickingBased!==true||o.signedOrderVerified!==true||o.caseNumber!==f.court.caseNumber)throw Error('SIGNED_TRAFFICKING_SETASIDE_ORDER_REQUIRED');
  date(o.date);
  if(f.allChargesResolvedByTraffickingSetAside!==true||f.stillPublic!==true)throw Error('ALL_CHARGES_AND_CONTINUED_PUBLIC_RECORD_REQUIRED');
 }else {
  for(const k of ['convictionDate','sentenceCompleteDate','branch','basis','account'])required(f.offense,k);
  date(f.offense.convictionDate);date(f.offense.sentenceCompleteDate);
  if(f.offense.sentenceComplete!==true)throw Error('SENTENCE_COMPLETION_REQUIRED');
  const allowed=f.offense.branch==='prostitution-related'?['victim-at-time','proximately-caused']:f.offense.branch==='other-offense'?['direct-result','proximately-caused']:[];
  if(!allowed.includes(f.offense.basis))throw Error('EXACT_STATUTORY_BRANCH_AND_BASIS_REQUIRED');
  if(typeof f.inCameraRequested!=='boolean')throw Error('HEARING_ELECTION_REQUIRED');
 }
 return f;
}
const protectedBlank=(field,label,page,rect,document)=>({field,label,printedLabel:label,page,rect,document,disposition:'PROTECTED_FIELD',completenessDisposition:'PROTECTED_FIELD',refusalClass:'signature_or_date_participant_completion',requiredBeforeFiling:false,reason:'Complete personally only at actual execution; no signature or date is generated',laterCompletionTrigger:'Actual participant execution'});
async function renderMotion(f){
 const doc=stampDeterministic(await PDFDocument.create()),font=await doc.embedFont(StandardFonts.TimesRoman),bold=await doc.embedFont(StandardFonts.TimesRomanBold);let page,y;const mapped=[],blanks=[];
 const next=()=>{page=doc.addPage([612,792]);y=746;};next();
 const line=(label,value,factId)=>{const text=label+(value??'');const lines=wrapToWidth(font,text,12,504);if(y-lines.length*16<65)next();const top=y;for(const s of lines){page.drawText(s,{x:54,y,font,size:12});y-=16;}if(value)mapped.push({field:factId,label,printedLabel:label,page:doc.getPageCount(),rect:[54,y,504,top-y+14],value,factId,isSelectionControl:false});y-=8;};
 line('',`IN THE ${f.court.division} COURT OF ${f.court.county} COUNTY, NEBRASKA`,'court.caption');
 line('Plaintiff: ','STATE OF NEBRASKA','court.plaintiff');line('Defendant: ',f.participant.name,'participant.name');line('Case number: ',f.court.caseNumber,'court.caseNumber');
 line('','MOTION TO SET ASIDE CONVICTION UNDER NEB. REV. STAT. SEC. 29-3005','route.motionTitle');
 line('','I request that this court set aside the conviction identified below. I state the following facts in support of this motion:','route.request');
 line('Offense: ',f.offense.description,'offense.description');line('Conviction date: ',date(f.offense.convictionDate),'offense.convictionDate');line('Sentence completed: ',date(f.offense.sentenceCompleteDate),'offense.sentenceCompleteDate');
 const authority=f.offense.branch==='prostitution-related'?'Sec. 29-3005(2)(a) and (3)(a)':'Sec. 29-3005(2)(b) and (3)(b)';
 line('Statutory branch: ',authority,'offense.branch');
 const branchText=f.offense.branch==='prostitution-related'?`The identified offense is prostitution-related within subsection (1). ${f.offense.basis==='victim-at-time'?'I was a victim of sex trafficking at the time of the offense.':'My participation in the offense was proximately caused by my status as a victim of sex trafficking.'}`:`My participation in the identified other offense was ${f.offense.basis==='direct-result'?'a direct result of':'proximately caused by'} my status as a victim of sex trafficking.`;
 line('',branchText,'offense.selectedAllegation');line('Supporting factual account: ',f.offense.account,'offense.account');
 if(f.inCameraRequested)line('','I request that any hearing relating to this motion be held in camera under Sec. 29-3005(6).','hearing.inCameraRequested');
 line('','I ask the court to make the findings required by the selected statutory branch and grant the motion.','route.relief');
 if(y<155)next();
 line('Printed name: ',f.participant.name,'participant.printedName');line('Address: ',`${f.participant.address}, ${f.participant.city}, ${f.participant.state} ${f.participant.zip}`,'participant.address');line('Telephone: ',f.participant.phone,'participant.phone');
 if(f.participant.email)line('Email: ',f.participant.email,'participant.email');
 if(y<95)next();
 for(const[label,id]of [['Signature','signature'],['Date','signatureDate']]){page.drawText(`${label}: ________________________________________`,{x:54,y,size:12,font});blanks.push(protectedBlank(id,label,doc.getPageCount(),[54,y-2,504,15],'set-aside-motion'));y-=23;}
 for(const[i,p]of doc.getPages().entries())p.drawText(`Motion under Sec. 29-3005 | Page ${i+1} of ${doc.getPageCount()}`,{x:54,y:25,size:9,font});
 return {bytes:await doc.save({useObjectStreams:false}),pages:doc.getPageCount(),mapped,blanks};
}
async function sealing(f){
 const{doc}=await loadPdf('CC612');const written=new Set(),mapped=[];const form=doc.getForm();
 for(const [choiceName,displayName,value]of [['TYPEOFCOURTDROPDOWN','TYPEOFCOURTRESULTS',f.court.division],['DROPDOWNCOUNTY2','fullcountystatementRIGHT',f.court.county]]){
  const choice=form.getDropdown(choiceName),entry=choice.acroField.getOptions().find(x=>x.display?.decodeText()===value);
  if(!entry)throw Error('SOURCE_CAPTION_OPTION_NOT_FOUND:'+value);
  await setText(doc,displayName,entry.value.decodeText(),written,mapped,'court.'+choiceName,{min:8,max:11});
 }
 const vals={'Case No':f.court.caseNumber,'Adult name':f.participant.name,Text3:f.offense.description,Text5:date(f.offense.chargeDate),printedname:f.participant.name,streetaddress:f.participant.address,citystatezip:`${f.participant.city}, ${f.participant.state} ${f.participant.zip}`,'telephone number':f.participant.phone};
 if(f.participant.email)vals.emailaddress=f.participant.email;else vals.noemailreason=f.participant.noEmailReason;
 for(const[name,value]of Object.entries(vals))await setText(doc,name,value,written,mapped,'CC612.'+name,{min:8,max:10});
 setCheck(doc,'Check Box4',written,mapped,'setAsideOrder.traffickingBased');if(!f.participant.email)setCheck(doc,'Check Box7',written,mapped,'participant.noEmailCapability');
 const blanks=[];
 for(const field of form.getFields())if(!written.has(field.getName())){
  const name=field.getName(),w=field.acroField.getWidgets()[0],r=rectOf(w),page=pageOf(doc,w);
  if(name==='datesigned'){blanks.push(protectedBlank(name,'Date signed',page,[r.x,r.y,r.width,r.height],'CC-6-12'));continue;}
  const reasons={Text4:'The single supplied offense fits the first offense line; this continuation line is unused.','Check Box1':'Dismissal is not the supplied disposition.','Check Box2':'Acquittal is not the supplied disposition.','Check Box3':'Pardon is not the supplied disposition.',emailaddress:'Participant reports no ability to receive email and supplies the source alternative reason.','Check Box7':'Participant supplies a usable email address.',noemailreason:'Participant supplies a usable email address.',noemailreason2:'The actual inability reason fits the first reason line.',TYPEOFCOURTDROPDOWN:'Source viewer-only selector; exact selected option export is written in the printable calculated caption.',DROPDOWNCOUNTY2:'Source viewer-only selector; exact selected option export is written in the printable calculated caption.','enter the type of court':'Source alternate manual caption control; exact court option is already printed.','enter the county':'Source alternate manual caption control; exact county option is already printed.'};
  if(!reasons[name])throw Error('UNCLASSIFIED_SOURCE_FIELD:'+name);
  blanks.push({field:name,label:name,printedLabel:name,document:'CC-6-12',page,rect:[r.x,r.y,r.width,r.height],disposition:'NOT_APPLICABLE_ON_THIS_ROUTE',completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',reason:reasons[name],routeConditionThatMakesItInapplicable:reasons[name],requiredBeforeFiling:false});
 }
 blanks.push(protectedBlank('printed-signature-line','Signature',2,[177,618,160,15],'CC-6-12'));
 const r=await finishForm(doc,written,{});return {...r,mapped,blanks};
}
function instructionSections(f){return [
 {heading:'Use only the current stage',paragraphs:[`Prepared for ${f.participant.name}, case ${f.court.caseNumber}. ${f.stage==='set-aside'?'This packet contains the first-stage motion only. It does not include a sealing motion. A section 29-3005 set-aside does not seal a record.':'This is the later adult sealing packet. Your supplied facts state that the court already granted a trafficking-related set-aside for every charge in this case and that the record still appears publicly. Check the actual signed order and court file before signing CC 6:12.'}`,'The two stages are separate filings. Ask the clerk for the signed set-aside order after it is granted. Only then request the adult sealing motion. Juvenile adjudications require the separate juvenile mechanism and cannot use adult CC 6:12.']},
 {heading:'Check the facts and obtain supporting records',paragraphs:['Confirm the offense and charge date against the court file and Nebraska State Patrol criminal-history report. Request the report through nebraska.gov. Confirm conviction and sentence completion dates. Do not substitute the conviction date for the charge date. Correct discrepancies before signing.','For the first motion, verify the selected prostitution-related or other-offense statutory branch and the supplied basis and account. A prostitution-related offense may qualify where committed while the person was a trafficking victim or where participation was proximately caused by that status. For an other offense, the basis is direct result or proximate cause. Do not sign an inaccurate account.','Government documentation is not required to seek relief. Section 29-3005(4) also identifies affidavits or sworn testimony from attorneys, clergy, medical professionals, trained victim-services professionals or other professionals from whom you sought relevant assistance. Other sufficiently credible and probative evidence may be considered. The presumption concerns victim status, not every element of relief.']},
 {heading:'Required before filing and actual execution',paragraphs:['REQUIRED_BEFORE_FILING: Review and complete your victimization account and obtain appropriate supporting material. Confirm with the original court its accepted execution procedure for the supporting account, including any oath or affidavit requirement. Do not treat the printed narrative as sworn testimony or an executed affidavit.','REQUIRED_BEFORE_FILING: For the first-stage motion, confirm with the actual convicting court the local filing and scheduling procedure, any prosecutor notice or service, who performs it, recipient, method, timing and any required notice or proof. Follow those directions and complete any resulting required component before filing. The later sealing clerk-notice procedure is not an instruction for the first stage.','REQUIRED_BEFORE_FILING: Personally sign and date only the motion for your current stage, after reviewing it. Dates and signatures remain blank for actual execution. Confirm any filing fee, payment procedure and applicable fee-waiver request with the clerk; a fee is not established in the adopted route. Fee waiver is available in principle under Neb. Rev. Stat. Sec. 25-2301.01.','REQUIRED_BEFORE_FILING for sealing: Obtain the actual signed trafficking set-aside order; compare its case, coverage and basis to your answers. Do not file if the prior order, all-charge coverage or continued public appearance is unconfirmed.']},
 {heading:'File and follow up',paragraphs:[`File the first-stage motion in the court of conviction. For this adult sample the supplied caption is ${f.court.division} Court, ${f.court.county} County. After relief is granted, file CC 6:12 in the sentencing court. For adult sealing the court notifies the county or city attorney and schedules the matter; do not complete a certificate for an act you have not performed. Keep the signed orders and check that public records are updated after sealing. A set-aside alone is not sealing.`]},
 {heading:'Synthetic review sample',paragraphs:['These sample facts are fictional and must not be filed. The court decides whether to grant relief. Use your actual reviewed facts when preparing a filing.']}
 ];}
const privacySections=f=>[{heading:'Hearing privacy request',paragraphs:[`Prepared for ${f.participant.name}. ${f.inCameraRequested?'The supplied first-stage election requests an in-camera hearing.':'The supplied first-stage election does not request an in-camera hearing; you may ask about making that request if desired.'} Under Sec. 29-3005(6), on the movant\'s request a hearing on that motion must be held in camera. The rules of evidence do not apply at that hearing. This does not make all filed papers automatically confidential and does not state a privacy rule for the later sealing hearing.`,`Before submitting sensitive material, confirm with the court the procedure for protected filing and the accepted execution of any supporting factual account. Avoid unnecessary graphic detail or identifying information about others. This guidance is not an assurance of secrecy.`]}];
const safetySections=f=>[{heading:'Safety and advocacy support',paragraphs:[`Prepared for ${f.participant.name}. Consider working with a trafficking-survivor advocate or legal-aid attorney to prepare the account and supporting material. You control the facts you provide. Seek support if preparing or receiving case papers creates a safety concern.`,`Use safe contact information the court can accept. Ask about any protected-contact or sensitive-filing procedure before filing. Do not disclose a location that puts you at risk without discussing a safe alternative with the court or an advocate. Do not rely on a later sealing order to protect papers while the case is pending.`]}];
export async function buildPacket(input,fixture){
 const f=importFacts(input),parts=[];
 if(f.stage==='set-aside')parts.push({id:'set-aside-motion',role:'primary_filing',...await renderMotion(f)});
 else parts.push({id:'CC-6-12',role:'sealing_motion',...await sealing(f)});
 const sections=instructionSections(f);
 for(const[id,title,role,s]of [['in-camera-guidance','In-camera hearing guidance','in_camera_request',privacySections(f)],['safety-handoff','Safety and advocacy handoff','safety_and_advocacy_handoff',safetySections(f)],['participant-guide','Nebraska staged filing guide','instructions',sections]])parts.push({id,role,...await textPageBuilder(title,s)(),mapped:[],blanks:[]});
 const packet=await assemble(parts);packet.proof=validatePacketText(packet.bytes,[f.participant.name,f.court.caseNumber,...parts.flatMap(c=>(c.mapped??[]).filter(x=>!x.isSelectionControl).map(x=>x.value))],[]);
 return {f,parts,packet,rows:parts.flatMap(c=>{const m=mapRows(fixture,c.id,c);return [...m.writes,...m.blanks]}),sections};
}
export async function buildFamily(){
 // Validate every source and adopted record before any packet output changes.
 await loadPdf('CC612');
 const records=RECORDS.map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(ROOT,p)))}));
 const decision=fs.readFileSync(path.join(ROOT,RECORDS[0]),'utf8');
 if(!decision.includes('NE-TRAFFICKING-STAGED-SETASIDE-THEN-SEAL'))throw Error('ADOPTED_STAGED_DECISION_MISSING');
 const target=path.join(ROOT,OUT);fs.mkdirSync(path.join(target,'reports'),{recursive:true});fs.mkdirSync(path.join(target,'fixtures'),{recursive:true});
 const built={},inputs={};let rows=[];
 for(const base of ['canonical','boundary'])for(const stage of ['set-aside','seal']){
  const fixture=stage==='set-aside'?base:`${base}-post-order`;const input=fixtureOf(base==='boundary',stage),r=await buildPacket(input,fixture);built[fixture]=r;inputs[fixture]=input;rows.push(...r.rows);
  fs.writeFileSync(path.join(target,`${fixture}.fixture.json`),j(input));fs.writeFileSync(path.join(target,'fixtures',`${fixture}.pdf`),r.packet.bytes);
  for(const c of r.parts)fs.writeFileSync(path.join(target,`${fixture}.${c.id}.pdf`),c.bytes);
  fs.writeFileSync(path.join(target,`${fixture}.coverage.json`),j(r.packet.coverage));fs.writeFileSync(path.join(target,`${fixture}.participant-instructions.md`),markdownInstructions(r.sections));
 }
 const write=(p,o)=>fs.writeFileSync(path.join(target,p),j(o));
 const historicalStopPath=path.join(target,'vehicle-conflict-stop.json');
 if(fs.existsSync(historicalStopPath)){const old=JSON.parse(fs.readFileSync(historicalStopPath,'utf8'));write('vehicle-conflict-stop.json',{...old,historicalStatus:old.historicalStatus||old.status,status:'SUPERSEDED_BY_ADOPTED_STAGED_BUILD',historicalEvidenceOnly:true,supersededBy:{decisionId:'NE-TRAFFICKING-STAGED-SETASIDE-THEN-SEAL',exactSourceSha256:SOURCES.CC612.sha256,builder:'scripts/build-census-v1-ne-trafficking-setaside-and-seal-set.mjs'},commercialRoutesOpened:0});}
 const source={schemaVersion:'rcap-source-receipt/v1',familyId:FAMILY,allSourcesExact:true,documents:[{formNumber:'CC-6-12',...SOURCES.CC612,byteLength:fs.statSync(path.join(HELD_ROOT,SOURCES.CC612.path)).size,sha256Exact:true}],committedRecords:records,scope:'Adopted two-stage route. CC6:12 source is rendered only in separate adult post-order snapshots.'};write('source-receipt.json',source);
 const instructions=Object.entries(built).map(([fixture,r])=>`# ${fixture}\n\n`+markdownInstructions(r.sections)+'\n'+markdownInstructions(privacySections(r.f))+'\n'+markdownInstructions(safetySections(r.f))).join('\n');fs.writeFileSync(path.join(target,'participant-instructions.md'),instructions);fs.writeFileSync(path.join(target,'filing-instructions.md'),instructions);
 const writes=rows.filter(x=>x.decision==='write'),refusals=rows.filter(x=>x.decision!=='write');
 write('production-field-map.json',{schemaVersion:'rcap-production-field-map/v2',familyId:FAMILY,routeKeys:ROUTES,writes,refusals,availableFacts:Object.fromEntries(writes.map(x=>[x.factId,x.value])),fixtureSpecificFacts:inputs,protectedFieldPolicy:'No signature, signature date, service event or court finding is written.'});
 const rendered={schemaVersion:'rcap-rendered-artifacts/v1',familyId:FAMILY,componentIdentityMode:'exact',packets:Object.entries(built).map(([fixture,r])=>({fixture,file:`fixtures/${fixture}.pdf`,sha256:hash(r.packet.bytes),pageCount:r.packet.pages,stage:r.f.stage,documents:[...r.packet.coverage.map(x=>({documentId:x.documentId,role:x.role,firstPage:x.firstPage,pageCount:x.pageCount})),...Array.from(new Set(r.rows.map(x=>x.documentId))).map(documentId=>({documentId,role:'mapped-source-occurrence',firstPage:null,pageCount:null}))]})),artifacts:Object.entries(built).map(([fixture,r])=>({fixture,file:`fixtures/${fixture}.pdf`,sha256:hash(r.packet.bytes),pageCount:r.packet.pages,valuesReportedByFinalizer:r.rows.filter(x=>x.decision==='write').length,wholePdfNonWhitespaceCharactersExtracted:r.packet.proof.characters,addedGlyphsReadFromOutputBytes:null,flattenedWidgetAppearancesReadFromOutputBytes:null,nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:null,refusedFieldsWithInk:null,measurementScope:'Text values independently extracted from final PDF bytes; text fitting guards measured source widget bounds and composed line layout. Checkboxes and protected appearance require independent original-page review.'}))};
 write('reports/rendered-artifacts.json',rendered);write('reports/actual-writes.json',{schemaVersion:'rcap-actual-writes-byte-proof/v1',familyId:FAMILY,derivedFromArtifactBytes:false,provenance:'Expected-write inventory from author mapping. Final PDF text inclusion is checked separately; glyph deltas, flattened controls and protected ink require independent measurement.',documents:Object.entries(built).flatMap(([fixture,r])=>r.parts.map(c=>({fixture,formNumber:c.id,actualWrites:(c.mapped??[]).map(x=>({document:c.id,field:x.field,expected:x.value,factId:`${fixture}.${x.factId}`,page:x.page,rect:x.rect,fontSize:x.fontSize??null}))}))),artifacts:rendered.artifacts,protectedFieldsUnwritten:null,protectedFieldPolicy:"Builder does not write protected fields; final-byte ink verification pending"});
 write('packet-set-manifest.json',{schemaVersion:'rcap-composed-packet-set/v1',familyId:FAMILY,jurisdiction:'NE',routeKeys:ROUTES,implementationStrategy:'staged_custom_pleading_and_official_pdf_fill',components:[{componentId:'ne-trafficking-setaside-and-seal-primary-filing-1',documentId:'set-aside-motion',role:'primary_filing',required:true,stage:'set-aside'},{componentId:'ne-trafficking-setaside-and-seal-sealing-motion-2',documentId:'CC-6-12',role:'sealing_motion',conditional:true,condition:'Only after a verified signed adult trafficking set-aside covering every charge, with continued public appearance confirmed'},{componentId:'ne-trafficking-setaside-and-seal-in-camera-request-3',documentId:'in-camera-guidance',role:'in_camera_request',required:true},{componentId:'ne-trafficking-setaside-and-seal-safety-and-advocacy-handoff-4',documentId:'safety-handoff',role:'safety_and_advocacy_handoff',required:true}],sourceBindings:source.documents,stageRule:'Separate input snapshots and separate PDFs. No sealing motion exists in a first-stage packet.'});
 write('build-findings.json',{schemaVersion:'rcap-build-findings/v1',familyId:FAMILY,status:'BUILT_RASTER_PENDING',sourceFidelity:'Exact CC6:12 bytes filled only at adult post-order stage. Stale historical source/vehicle and legal-design STOP is superseded by adopted staged decision.',remainingReleaseBlockers:['Independent semantic, raster and original-page review pending.'],noCommercialAuthority:true});
 write('approval-request.json',{schemaVersion:'rcap-output-approval-request/v1',familyId:FAMILY,status:'BUILT_CANDIDATE_REVIEW_PENDING',raster:'PENDING_CENTRAL',independentReview:'PENDING',noAdmissionGranted:true});
 write('build-status.json',{schemaVersion:'rcap-build-status/v1',familyId:FAMILY,buildStatus:'state_built',reviewStatus:'qa_review_pending',rasterState:'BUILT_RASTER_PENDING',independentReview:'PENDING',generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0,productionTouched:false});
 write('product-wiring.json',{schemaVersion:'rcap-census-v1-product-wiring/v1',family:FAMILY,routeKeys:ROUTES,workType:'PRODUCT_WIRING_REQUIRED',status:'DECLARED_NOT_INSTALLED',authorityCreated:'none',binding:{family:FAMILY,jurisdiction:'NE',routeKeys:ROUTES,deliveryType:'staged_custom_pleading_and_official_pdf_fill',paymentEligible:false,sponsorshipEligible:false,runtimeInstalled:false,generationAllowed:false,filingPermitted:false}});
 return {target,built,rendered};
}
export async function selfTest(){
 const assert=(await import('node:assert/strict')).default;
 for(const stage of ['set-aside','seal'])for(const b of [false,true])assert.equal(importFacts(fixtureOf(b,stage)).stage,stage);
 for(const mutate of [f=>delete f.setAsideOrder,f=>f.setAsideOrder.granted=false,f=>f.setAsideOrder.traffickingBased=false,f=>f.setAsideOrder.signedOrderVerified=false,f=>f.setAsideOrder.caseNumber='WRONG',f=>f.stillPublic=false,f=>f.allChargesResolvedByTraffickingSetAside=false,f=>f.adult=false]){const f=fixtureOf(false,'seal');mutate(f);assert.throws(()=>importFacts(f));}
 const branch=fixtureOf(false);branch.offense.basis='direct-result';assert.throws(()=>importFacts(branch));
 const first=await buildPacket(fixtureOf(false),'canonical');assert.equal(first.parts.some(x=>x.id==='CC-6-12'),false);
 const text=validatePacketText(first.packet.bytes,['victim of sex trafficking at the time'],['My participation in the identified other offense']);assert.ok(text.characters>0);
 console.log('NE staged input and first-stage rendering checks passed');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.includes('--self-test'))await selfTest();else{
  if(args.some(x=>x!=='--no-raster'))throw Error('UNSUPPORTED_ARGUMENT');const r=await buildFamily();
  const{auditFamily}=await import('./rcap-packet-completeness/verify-packet-completeness.mjs');const audit=auditFamily(OUT,FAMILY);
  fs.writeFileSync(path.join(r.target,'reports/native-audit.json'),j(audit));
  fs.writeFileSync(path.join(r.target,'reports/completeness-counters.json'),j({schemaVersion:'rcap-builder-completeness-counters/v1',familyId:FAMILY,measured:true,counters:audit.counters,totals:audit.totals,status:audit.result,independentReviewPending:true}));
  console.log(j({familyId:FAMILY,nativeResult:audit.result,counters:audit.counters,findings:audit.findings,fixtures:r.rendered.packets.map(x=>({fixture:x.fixture,sha256:x.sha256,pageCount:x.pageCount})),output:r.target}));
 }
}
