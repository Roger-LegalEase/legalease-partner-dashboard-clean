#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const FAMILY='nc_auto_146_a4_agency_followup-set';
export const ROUTE='obligation:track-only:NC:nc_auto_146_a4_agency_followup';
export const OUTPUT=`data/rcap-all50/overlays/census-v1/nc/nc-auto-146-a4-agency-followup-set--custom-pleading`;
export const SOURCE='reference/source-recovery/2026-09-11-wave1/CODEX-CS1-SRC4__AOC-G-260__cf998cecefea.pdf';
export const SOURCE_SHA='cf998cecefea090e4b3fce260b330b6f3896d66ae65ab9f9e7a698e6586a1817';
export const HISTORICAL_READINESS='data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/nc-auto146-agency-followup-readiness.json';
const PDF_DATE=new Date('2026-09-13T00:00:00.000Z');
const stamp=pdf=>{pdf.setCreationDate(PDF_DATE);pdf.setModificationDate(PDF_DATE);pdf.setProducer('RCAP NC agency followup evidence');pdf.setCreator('RCAP PF05');};
const normalize=s=>s.replace(/\s+/g,' ').trim();
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REQUIRED_COMPONENTS=['primary-filing-1','verification-instructions-2','certificate-of-verification-application-3','legal-effect-explanation-4'].map(x=>`nc_auto_146_a4_agency_followup-${x}`);
const CENSUS='data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json';
const WORKLIST='data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json';
const MANIFEST='data/record-clearing/legal-design-packet-set-manifests.json';
const REGISTRY='data/record-clearing/legal-design-track-registry.json';
const CUSTODY='data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json';
const PRIOR='data/rcap-grade-a/packet-factory-24h/pf05/rows-pf05-nc-auto146-agency-followup-20260913.json';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bind=(root,p)=>{const b=fs.readFileSync(path.join(root,p));return {path:p,sha256:sha(b),byteLength:b.length};};

export function validateBuildInputs({route,worklist,manifest,sourceBytes,prior}) {
 assert.equal(route.routeKey,ROUTE);assert.equal(route.trackId,'nc_auto_146_a4_agency_followup');
 assert.equal(route.currentOutputStrategy,'custom_pleading');assert.equal(route.processActor,'agency');
 assert.equal(route.participantCanInitiate,true);assert.equal(route.requiresLegalReview,false);
 assert(route.requiredSourceIds.includes('official-form:AOC-G-260'));
 assert.equal(worklist.worklistGroupId,FAMILY);assert.deepEqual(worklist.routeKeys,[ROUTE]);
 assert.equal(manifest.packetSetId,FAMILY);
 assert.deepEqual([...manifest.components].sort((a,b)=>a.order-b.order).map(c=>c.componentId),REQUIRED_COMPONENTS);
 assert.equal(manifest.components[2].officialFormId,'AOC-G-260');assert.equal(manifest.components[2].requirement,'conditional');
 assert.match(manifest.components[2].conditionDescription,/record holder asks for documentary proof/);
 assert.equal(sha(sourceBytes),SOURCE_SHA,'Exact governed AOC-G-260 source differs');assert.equal(sourceBytes.length,290429);
 assert.equal(prior.itemId,FAMILY);assert.equal(prior.assignmentId,'PF05');assert.equal(prior.status,'STOPPED');
 return true;
}

// All applicable native checks are required. A family-only source PASS never
// converts partial global corpus custody or dirty shared paths into readiness.
export function requireReadyPreflight(run) {
 const result=run();
 assert.equal(result.status,0,`PACKET_BUILD_ENVIRONMENT_NOT_READY: ${result.detail??'native preflight refused; no family output written'}`);
 assert.equal(result.family,FAMILY,'Preflight must name this exact family');
 return result;
}
export function parseArgs(argv) {
 const allowed=new Set(['--no-raster','--preflight-only']);let base=null;
 for(let i=0;i<argv.length;i++) {
  if(argv[i]==='--minimum-captain-sha'){base=argv[++i];continue;}
  assert(allowed.has(argv[i]),`Unsupported option: ${argv[i]}`);
 }
 assert.match(base??'',/^[a-f0-9]{40}$/,'Provide the available Captain assignment base via --minimum-captain-sha');
 return {base,preflightOnly:argv.includes('--preflight-only')};
}
export function planFixture(f) {
 assert.equal(f.syntheticFixture,true,'Only explicitly synthetic nonfiling fixtures are generated');
 for(const k of ['name','address','city','state','zip','dob','county','caseNumber','holderName','holderAddress','disposition']) assert(typeof f[k]==='string'&&f[k].trim(),`Missing ${k}`);
 assert.equal(f.supportingRecordsChecked,true);assert.equal(f.recordStillReported,true);
 assert.equal(f.disposition,'dismissed','This bounded fixture branch does not infer another disposition');
 for(const k of ['dispositionDate','asOfDate']) assert(/^\d{4}-\d{2}-\d{2}$/.test(f[k])&&!Number.isNaN(Date.parse(f[k]))&&new Date(f[k]).toISOString().slice(0,10)===f[k],`Invalid ${k}`);
 const deadline=new Date(Date.parse(f.dispositionDate)+210*86400000).toISOString().slice(0,10);
 assert(f.asOfDate>=deadline,'The recorded 210-day outer window has not closed');
 assert.equal(typeof f.certificateRequired,'boolean');
 const application={ApplicantName:f.name,SignedName:f.name,ApplicantAddr1:f.address,ApplicantAddrCity:f.city,ApplicantAddrState:f.state,ApplicantAddrZip:f.zip,DOB:f.dob,CountyRow1:f.county,FileNoRow1:f.caseNumber};
 if(f.email)application.ApplicantEmailAddress=f.email;
 return {fixture:f.fixture,nonfiling:true,windowClosed:deadline,
   componentIds:REQUIRED_COMPONENTS.filter((_,i)=>i!==2||f.certificateRequired),
   applicationWrites:f.certificateRequired?application:{},certificateRequired:f.certificateRequired};
}
export function classifySourceField(name,writes) {
 if(Object.hasOwn(writes,name))return 'WRITTEN';
 if(['DLicenseNo','State','Race','Sex','SSN','FormerName','FormerDL','State2','FormerSSN'].includes(name))return 'REQUIRED_BEFORE_FILING';
 if(/^(CountyRow|FileNoRow)/.test(name))return 'UNUSED_REPEATING_ROW';
 if(['AtEmailAddressAboveCkBox','UsingStampedEnvelopeCkBox','SignedName'].includes(name))return 'PARTICIPANT_COMPLETES_SELECTED_APPLICATION';
 if(['ApplicantAddr2','ApplicantEmailAddress'].includes(name))return 'PARTICIPANT_COMPLETES_IF_APPLICABLE';
 if(/^(AtEmailAddressAbove[23]|UsingStampedEnvelope[23]|SignedName[23])/.test(name))return 'UNUSED_ALTERNATIVE_APPLICATION';
 return 'PROTECTED_OATH_SIGNATURE_OR_OFFICIAL_FIELD';
}
export function nativeBlankDeclaration(row) {
 const name=row.field;
 const y=row.rect?.y,page=row.page;
 if(/^(CountyRow|FileNoRow)/.test(name))assert(page===1&&y>=523&&y<=552,'Case cells must be in the shared table above every application');
 if((page===1&&y<200)||(page===2&&y>560))return {disposition:'NOT_APPLICABLE_ON_THIS_ROUTE',completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:page===1?'This page1 lower block is the unselected G.S.15A-152 private-entity civil-action application.':'This page2 upper block is the unselected conditional-discharge application.',routeDetermined:false};
 if(row.disposition==='REQUIRED_BEFORE_FILING')return {requiredBeforeFiling:true,identity:`AOC-G-260 field ${name}`};
 if(name==='ApplicantAddr2'||name==='ApplicantEmailAddress')return {reason:'Optional participant-authored contact detail; the platform does not invent it'};
 if(/^(CountyRow|FileNoRow)/.test(name))return {disposition:'NOT_APPLICABLE_ON_THIS_ROUTE',completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:'The selected synthetic fixture identifies exactly one case; CountyRow1/FileNoRow1 hold it. The other eleven county/file pairs in the same shared table are unused, not separate application tables.',routeDetermined:false};
 if(/^(AtEmailAddressAbove|UsingStampedEnvelope)/.test(name))return /[23]/.test(name)?{disposition:'NOT_APPLICABLE_ON_THIS_ROUTE',completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:'Only the first operation-of-law application is selected; private-entity civil-action and discharge applications are not selected.',routeDetermined:false}:{category:'participant_sworn_narrative_or_legal_election',reason:'The applicant personally chooses encrypted-email or stamped-envelope delivery; this preference is not determined by the agency-followup route.'};
 if(/^Signed(Date|Name)/.test(name))return {category:'signature_or_date_participant_completion',reason:'Signature or date field; never prefilled'};
 if(/^(Date\d*|AuthorizedName\d*|Notary\d*|ExpiresDate\d*|CountyNotarized\d*|DepCSC\d*|AsstCSC\d*|CSC\d*|Magistrate\d*|Search\d*|NoRecord\d*|CopyOrder|CertificateReport\d*|FurtherCertify|DateOn)$/.test(name))return {category:'court_prosecutor_clerk_or_agency_owned',reason:'Oath official or NCAOC records-officer certification, search, and result field; only that official supplies it.'};
 return {reason:row.disposition};
}
export const FIXTURES=[
 {fixture:'canonical',syntheticFixture:true,name:'Morgan Example',address:'120 Example Lane',city:'Raleigh',state:'NC',zip:'27601',dob:'01/02/1990',email:'morgan@example.invalid',county:'Wake',caseNumber:'20CR000001',holderName:'Example Record Holder',holderAddress:'100 Sample Avenue, Raleigh, NC 27601',disposition:'dismissed',dispositionDate:'2024-01-01',asOfDate:'2026-09-13',supportingRecordsChecked:true,recordStillReported:true,certificateRequired:false},
 {fixture:'boundary',syntheticFixture:true,name:'Alexandra Morgan Example-Sample',address:'1250 Long Example Boulevard Apt 204',city:'Winston-Salem',state:'NC',zip:'27101',dob:'12/31/1985',email:'alexandra.example@example.invalid',county:'Forsyth',caseNumber:'20CR000002',holderName:'Example County Records Department',holderAddress:'12345 Long Sample Administrative Road, Winston-Salem, NC 27101',disposition:'dismissed',dispositionDate:'2023-12-31',asOfDate:'2026-09-13',supportingRecordsChecked:true,recordStillReported:true,certificateRequired:true}
];

async function textPdf(PDFDocument,StandardFonts,title,paragraphs) {
 const pdf=await PDFDocument.create();stamp(pdf);const font=await pdf.embedFont(StandardFonts.Helvetica);let page,y;
 const next=()=>{page=pdf.addPage([612,792]);y=746;page.drawText('SYNTHETIC REVIEW FIXTURE - DO NOT SEND OR FILE',{x:40,y,size:9,font});y-=24;};next();
 for(const paragraph of [title,...paragraphs]) {
  let line='';for(const word of paragraph.split(/\s+/)) {
   const proposed=line?`${line} ${word}`:word;
   if(font.widthOfTextAtSize(proposed,10)>530){if(y<55)next();page.drawText(line,{x:40,y,size:10,font});y-=14;line=word;}else line=proposed;
  }
  if(line){if(y<55)next();page.drawText(line,{x:40,y,size:10,font});y-=14;}y-=8;
 }
 return pdf;
}
export async function runFamily(argv=process.argv.slice(2),root=ROOT) {
 const args=parseArgs(argv);
 requireReadyPreflight(()=>{
  try {const output=execFileSync(process.execPath,['scripts/verify-packet-build-environment.mjs','--family',FAMILY,'--codex-cloud','--minimum-captain-sha',args.base],{cwd:root,encoding:'utf8',maxBuffer:4<<20});return {status:0,family:FAMILY,detail:output};}
  catch(e){return {status:e.status??1,family:FAMILY,detail:e.stdout?.toString()??e.message};}
 });
 if(args.preflightOnly)return {familyId:FAMILY,preflight:'PASS',artifactsWritten:0};
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const route=read(CENSUS).routes.find(r=>r.routeKey===ROUTE),worklist=read(WORKLIST).packetFamilies.find(r=>r.worklistGroupId===FAMILY),manifest=read(MANIFEST).packetSets.find(r=>r.packetSetId===FAMILY);
 const sourceBytes=fs.readFileSync(path.join(root,SOURCE)),prior=read(PRIOR);
 validateBuildInputs({route,worklist,manifest,sourceBytes,prior});
 const out=path.join(root,OUTPUT);assert(!fs.existsSync(out),'Refuse overwriting an existing candidate; reconcile its review first');
 const {PDFDocument,StandardFonts}=await import('pdf-lib');
 const source=await PDFDocument.load(sourceBytes);assert.equal(source.getPageCount(),3);
 const assets=new Map(),reports=[],fieldRows=[],writeDocuments=[],maps=[],participantInstructions=[];
 for(const fixture of FIXTURES) {
  const plan=planFixture(fixture),combined=await PDFDocument.create();stamp(combined);let packetPage=0;const pageManifest=[];
  const letter=await textPdf(PDFDocument,StandardFonts,'Request to check and conform an agency record',[
   `${fixture.name}; ${fixture.address}, ${fixture.city}, ${fixture.state} ${fixture.zip}`,
   `To: ${fixture.holderName}, ${fixture.holderAddress}`,
   `My records identify ${fixture.county} County case ${fixture.caseNumber}, disposed as ${fixture.disposition} on ${fixture.dispositionDate}. The recorded 210-day outer window closed on ${plan.windowClosed}. A current record still reports this charge. Please check whether your records should be conformed to the court's disposition and any automatic expunction under G.S.15A-146(a4) and applicable notice under G.S.15A-150.`,
   'This request does not certify that an expunction occurred or that your agency failed to act. Please identify any documentary verification you require and your procedure for correcting the record.',
   'Participant signature: ____________________  Date: ____________________'
  ]);
  const guide=await textPdf(PDFDocument,StandardFonts,'Verification and submission instructions',[
   ...manifest.requiredBeforeFiling.filter(s=>!['none required.','none applicable to the request.'].includes(s)),
   'The agency letter is correspondence, not a court filing. Confirm the holder and address from your own report. Send by the published written channel or mail with proof of posting. No court service rule or request fee is imposed for this letter. Do not assert that expunction actually happened without verification.',
   'Conditional AOC-G-260: include this application only when the holder requests documentary verification. It goes separately to NCAOC, not to the record holder or a trial court. Read all three original PDF pages. Use only the first application under G.S.15A-151(a)(2) for this bounded operation-of-law branch; if its sworn statements are not true or you are unsure, stop and consult an attorney. Do not select the private-entity civil-action or discharge sections.',
   'Complete every required identity field, including driver license, race, sex, Social Security number, and prior identity details if applicable; provide your own known county/file numbers. Obtain missing identifiers from your own or former attorney records. Do not guess. The system does not invent these sensitive facts.',
   'Choose email or mail response yourself. Sign and date the selected APPLICATION only before an authorized oath official. Leave all other application oath/signature blocks and every NCAOC certificate/search/result/records-officer field untouched. The letter needs no notarization; AOC-G-260 requires the applicant oath and cannot be signed by anyone on the applicant\'s behalf.',
   'For email submission use encrypted email to NCAOC_Expunctions@nccourts.org. For a mail response send the completed application with a self-addressed stamped envelope to NC Administrative Office of the Courts, Attn: Records Officer, PO Box2448, Raleigh, NC27602. Consult the source\'s complete instructions before transmitting sensitive identifiers. Do not call NCAOC about this application; its instructions provide only encrypted-email or mail response.',
   'Do not infer a certificate fee or waiver entitlement from the free agency letter. Confirm any applicable certificate charge through the receiving office\'s current published instructions before submitting. Do not manufacture a separate court fee-waiver filing.'
  ]);
  const legal=await textPdf(PDFDocument,StandardFonts,'Legal effect and self-help limits',[
   'This packet requests record verification and follow-up. It does not itself expunge, seal, certify, or order removal of a charge. A 210-day calculation is a route timing check, not proof that automatic expunction actually ran.',
   'Keep the SBI right-to-review record and the report showing the charge. Stop if the person/case/disposition does not match, if the recorded period has not elapsed, if the court record still needs relief rather than agency follow-up, or if an agency contests the legal basis. Get route-specific legal help rather than altering this letter into a petition.',
   'A private background-report disclosure may involve a different G.S.15A-152 civil-action branch. This packet does not select that sworn application or determine civil liability. Do not promise record destruction, employment results, a deadline for agency correction or a guaranteed response.',
   'Send NCAOC verification, if obtained, to the record holder only as its correction process requires. Preserve submission/response records. Do not treat a missing NCAOC record response as conclusive proof that no expunction occurred.'
  ]);
  const parts=[[REQUIRED_COMPONENTS[0],letter],[REQUIRED_COMPONENTS[1],guide]];
  if(plan.certificateRequired) {
   const application=await PDFDocument.load(sourceBytes),form=application.getForm();stamp(application);
   for(const [name,value] of Object.entries(plan.applicationWrites)){const field=form.getTextField(name);field.setText(value);field.setFontSize(name==='ApplicantName'?9:10);}
   for(const field of form.getFields()) {
    const name=field.getName(),disposition=classifySourceField(name,plan.applicationWrites);
    const widgets=field.acroField.getWidgets().map(w=>({rect:w.getRectangle(),page:application.getPages().findIndex(p=>String(p.ref)===String(w.P()))+1}));
    assert(name!=='SignedName'||(widgets[0].page===1&&Math.abs(widgets[0].rect.y-320.684)<0.01),'Selected printed applicant name widget identity changed');
    const row={fixture:fixture.fixture,document:REQUIRED_COMPONENTS[2],field:name,fieldName:name,printedLabel:name==='SignedName'?'Name Of Applicant (type or print)':name,labelBasis:name==='SignedName'?'Exact sourcepage1 printed label and widgetgeometry':'AcroForm name; printed-context review remains required',widgets,page:widgets[0]?.page??null,rect:widgets[0]?.rect??null,disposition,value:plan.applicationWrites[name]??null,fieldType:field.constructor.name};fieldRows.push(row);
   }
   form.updateFieldAppearances(await application.embedFont(StandardFonts.Helvetica));form.flatten();parts.push([REQUIRED_COMPONENTS[2],application]);
  }
  parts.push([REQUIRED_COMPONENTS[3],legal]);
  for(const [component,pdf] of parts)for(const [i,page] of (await combined.copyPages(pdf,pdf.getPageIndices())).entries()){
   combined.addPage(page);pageManifest.push({packetPage:++packetPage,component,sourcePage:i+1,sourceSha256:component===REQUIRED_COMPONENTS[2]?SOURCE_SHA:null});
  }
  const bytes=Buffer.from(await combined.save({useObjectStreams:false,updateMetadata:false})),file=`${OUTPUT}/fixtures/${fixture.fixture}.pdf`;assets.set(file,bytes);
  const text=execFileSync('pdftotext',['-layout','-','-'],{input:bytes,maxBuffer:4<<20}).toString();
  const pages=text.split('\f').filter((v,i,a)=>i<a.length-1||v.trim());assert.equal(pages.length,combined.getPageCount());
  const expectedLetter={name:fixture.name,address:fixture.address,city:fixture.city,state:fixture.state,zip:fixture.zip,holderName:fixture.holderName,holderAddress:fixture.holderAddress,county:fixture.county,caseNumber:fixture.caseNumber,disposition:fixture.disposition,dispositionDate:fixture.dispositionDate,windowClosed:plan.windowClosed};
  const actualWrites=[];
  for(const [component,expected] of [[REQUIRED_COMPONENTS[0],expectedLetter],...(plan.certificateRequired?[[REQUIRED_COMPONENTS[2],plan.applicationWrites]]:[])]) {
   const ownText=normalize(pageManifest.filter(p=>p.component===component).map(p=>pages[p.packetPage-1]).join(' '));
   for(const [field,value] of Object.entries(expected)) {
    const found=ownText.includes(normalize(value));assert(found,`Missing output value ${component}/${field}`);
    actualWrites.push({document:component,field:component===REQUIRED_COMPONENTS[2]?field:`${component}.${field}`,expected:value,foundInOutputBytes:found,proof:'pdftotext readback from own component pages in final saved PDF bytes'});
   }
  }
  writeDocuments.push({fixture:fixture.fixture,derivedFromArtifactBytes:true,actualWrites,refusedFieldsWithInk:null,nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:null,unmeasured:['raster visibility','protected source field ink delta']});
  if(!maps.length) {
   maps.push({documentId:REQUIRED_COMPONENTS[0],formNumber:REQUIRED_COMPONENTS[0],structuralClass:'composed_document',documentPolicy:{mode:'participant',documentAcceptsFill:true,routeKey:ROUTE},canonicalWrites:Object.keys(expectedLetter).map(field=>({document:REQUIRED_COMPONENTS[0],field:`${REQUIRED_COMPONENTS[0]}.${field}`,fieldName:`${REQUIRED_COMPONENTS[0]}.${field}`,page:1,printedLabel:field,factId:field,rectBasis:'composed_document_authored_by_this_build'})),canonicalRefusals:['signature','date'].map(field=>({document:REQUIRED_COMPONENTS[0],field:`${REQUIRED_COMPONENTS[0]}.${field}`,fieldName:`${REQUIRED_COMPONENTS[0]}.${field}`,page:1,printedLabel:`Participant ${field}`,category:'signature_or_date_participant_completion',reason:'Participant signs and dates the correspondence personally'}))});
   for(const id of [REQUIRED_COMPONENTS[1],REQUIRED_COMPONENTS[3]])maps.push({documentId:id,formNumber:id,structuralClass:'composed_document',documentPolicy:{mode:'guidance',documentAcceptsFill:false,routeKey:ROUTE},canonicalWrites:[],canonicalRefusals:[]});
   participantInstructions.push(...pageManifest.filter(p=>p.component===REQUIRED_COMPONENTS[1]||p.component===REQUIRED_COMPONENTS[3]).map(p=>pages[p.packetPage-1]));
  }
  reports.push({fixture:fixture.fixture,file,sha256:sha(bytes),byteLength:bytes.length,pageCount:combined.getPageCount(),components:plan.componentIds,pageManifest,syntheticNonfilingFixture:true});
 }
 // No output directory exists until every source, route, branch and serialization
 // above succeeds. This builder never emits claims, shared queues or acceptance.
 const emit=(p,value)=>assets.set(`${OUTPUT}/${p}`,Buffer.from(JSON.stringify(value,null,2)+'\n'));
 const sourceWrites=fieldRows.filter(r=>r.disposition==='WRITTEN').map(r=>({...r,factId:r.field,kind:'AcroForm',rectBasis:'measured_source_widget'}));
 const sourceBlanks=fieldRows.filter(r=>r.disposition!=='WRITTEN').map(r=>({...r,requiredBeforeFiling:r.disposition==='REQUIRED_BEFORE_FILING',reason:r.disposition,...nativeBlankDeclaration(r),measurementStatus:'Source widget identity/rectangle measured; legal blank classification and protected ink require independent review'}));
 maps.push({documentId:REQUIRED_COMPONENTS[2],formNumber:REQUIRED_COMPONENTS[2],officialFormId:'AOC-G-260',sourceSha256:SOURCE_SHA,structuralClass:'official_pdf_form',conditional:true,documentPolicy:{mode:'participant',documentAcceptsFill:true,routeKey:ROUTE},canonicalWrites:sourceWrites,canonicalRefusals:sourceBlanks});
 const requiredBeforeFiling=sourceBlanks.filter(r=>r.requiredBeforeFiling).map(r=>({...r,identity:`AOC-G-260 field ${r.field}`,disclosureLabel:r.field,printedContext:r.printedLabel,participantMustSupply:`Supply true ${r.field} on the selected application before sending; do not guess.`}));
 participantInstructions.push('Required application identity fields before submission: '+requiredBeforeFiling.map(r=>r.field).join(', '));
 assets.set(`${OUTPUT}/participant-instructions.md`,Buffer.from('# NC agency followup: participant instructions\n\n'+participantInstructions.join('\n\n')+'\n'));
 emit('production-field-map.json',{schemaVersion:'rcap-official-form-field-map/v1-census-v1',familyId:FAMILY,jurisdiction:'NC',implementationStrategy:'custom_pleading',renderStrategy:'composed_pleading_with_conditional_official_application',routeKeys:[ROUTE],componentSet:REQUIRED_COMPONENTS,componentConditions:{[REQUIRED_COMPONENTS[2]]:'record holder asks for documentary proof'},maps,requiredBeforeFiling,generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0,reviewLimit:'No native completeness PASS asserted; field printed contexts and blank classifications require independent review.'});
 emit('reports/actual-writes.json',{schemaVersion:'rcap-actual-writes-byte-proof/v1',familyId:FAMILY,derivedFromArtifactBytes:true,documents:writeDocuments,unmeasured:['raster visibility','source-to-output protected ink comparison']});
 emit('reports/blanks-left-for-the-participant.json',{schemaVersion:'rcap-blanks-left-for-the-participant/v1',familyId:FAMILY,requiredBeforeFiling,allBlankRows:sourceBlanks,unmeasured:['legal disposition verification','printed field labels']});
 emit('component-set.json',{familyId:FAMILY,routeKeys:[ROUTE],components:manifest.components});
 emit('source-receipt.json',{schemaVersion:'rcap-family-source-receipt/v1',familyId:FAMILY,implementationStrategy:'custom_pleading',routeKeys:[ROUTE],allSourcesExact:true,documents:[{sourceIds:['official-form:AOC-G-260'],documentId:REQUIRED_COMPONENTS[2],officialFormId:'AOC-G-260',...bind(root,SOURCE),pageCount:3}],committedRecords:[CENSUS,WORKLIST,MANIFEST,REGISTRY,CUSTODY,PRIOR].map(p=>bind(root,p)),missingHistoricalReadiness:{path:HISTORICAL_READINESS,present:fs.existsSync(path.join(root,HISTORICAL_READINESS)),notInventedOrReliedUpon:true},commercialRoutesOpened:0});
 emit('reports/rendered-artifacts.json',{schemaVersion:'rcap-rendered-artifacts/v1',familyId:FAMILY,artifacts:reports,pdfs:reports,componentSet:REQUIRED_COMPONENTS,rasterSkipped:true,everyPageRastered:false});
 emit('reports/field-classifications.json',{familyId:FAMILY,sourceFieldRows:fieldRows,unmeasured:['source-to-output visual comparison','clipping and overlap','native completeness audit'],grantsAcceptance:false});
 emit('approval-request.json',{schemaVersion:'rcap-approval-request/v1',familyId:FAMILY,routeKeys:[ROUTE],implementationStrategy:'custom_pleading',status:'REVIEW_PENDING',approvalStatus:'NOT_APPROVED',commercialRoutesOpened:0});
 emit('build-status.json',{familyId:FAMILY,status:'state_built',reviewStatus:'qa_review_pending',rasterState:'BUILT_RASTER_PENDING',allNineCountersZero:null,independentVerificationPending:true,commercialRoutesOpened:0});
 for(const [relative,bytes] of assets){const absolute=path.join(root,relative);fs.mkdirSync(path.dirname(absolute),{recursive:true});fs.writeFileSync(absolute,bytes);}
 return {familyId:FAMILY,artifacts:reports.map(({pageManifest,...r})=>r),rasterState:'BUILT_RASTER_PENDING',selfVerified:false,commercialRoutesOpened:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)runFamily().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
