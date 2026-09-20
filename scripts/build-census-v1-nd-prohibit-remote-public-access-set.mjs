#!/usr/bin/env node
// Family-only ND criminal remote-access candidate. Source admission is separate
// from independent acceptance. No commercial permission or terminal flag is set.
import assert from 'node:assert/strict';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {finalizeOfficialForm} from './rcap-official-forms/rcap-official-form-finalize.mjs';
import {flattenedWidgets,drawnAt} from './rcap-official-forms/pdf-flattened-widgets.mjs';
import {stampDeterministic} from './rcap-official-forms/rcap-deterministic-pdf-date.mjs';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {emitNativeMetadata,checkSavedCandidate,appendInstructions} from './build-census-v1-nd-remote-native-metadata.mjs';
import {PDFDocument,PDFTextField,PDFCheckBox,PDFRadioGroup,PDFDropdown,PDFOptionList} from 'pdf-lib';
import {extractTextItems,groupIntoLines,captureWidgetContext,normalizeHarvestedText} from './rcap-official-forms/rcap-pdf-anchor-capture.mjs';
import {strokedRectangles} from './lib/pdf-stroked-boxes.mjs';
import {CHARGE_VALUE_WORDS,captionDescribesChargeValue,descriptorsMatching,protectCategoryOf} from './rcap-official-forms/rcap-field-semantics.mjs';
function fieldType(f){return f instanceof PDFTextField?'text':f instanceof PDFCheckBox?'checkbox':f instanceof PDFRadioGroup?'radio':f instanceof PDFDropdown?'dropdown':f instanceof PDFOptionList?'optionlist':'other'}
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  const strokedByPage = new Map();
  pages.forEach((page, i) => {
    let content = "";
    for (const stream of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
      try { content += Buffer.from(pdf.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
    }
    strokedByPage.set(i + 1, content ? strokedRectangles(content) : []);
  });

  const widgetsForCapture = new Map();
  const fields = form.getFields().map((f) => {
    const name = f.getName();
    const type = fieldType(f);
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P?.();
      let page = 1;
      pages.forEach((p, i) => { if (p.ref === ref) page = i + 1; });
      return {
        page,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document"
      };
    });
    for (const w of widgets) {
      if (!widgetsForCapture.has(w.page)) widgetsForCapture.set(w.page, []);
      widgetsForCapture.get(w.page).push({ name, rect: w.rect });
    }
    return {
      name, type, widgets,
      // Read from the document, not assumed. See maxLengthOverflows(): pdf-lib
      // THROWS on a value longer than a text field's declared /MaxLen rather
      // than reporting it unfittable, so a value that will not fit has to be
      // refused before the finalizer is asked to write it.
      maxLength: type === "text" ? (f.getMaxLength() ?? null) : null
    };
  });

  const context = new Map();
  pages.forEach((page, i) => {
    const list = widgetsForCapture.get(i + 1) ?? [];
    if (!list.length) return;
    for (const c of captureWidgetContext(page, list, { precomputedLines: linesByPage[i], isFirstPage: i === 0 })) {
      if (!context.has(c.name)) context.set(c.name, c);
    }
  });

  const ruleUnder = (page, rect) => {
    const candidates = (strokedByPage.get(page) ?? []).filter((s) =>
      s.height <= 3
      && Math.min(s.x1, rect.x + rect.width) - Math.max(s.x0, rect.x) > rect.width * 0.4
      && rect.y - s.y1 >= -3 && rect.y - s.y1 <= 12);
    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => (rect.y - a.y1) - (rect.y - b.y1))[0];
    return { x0: best.x0, x1: best.x1, y: best.y1, construction: best.construction };
  };

  // Printed-label corrections. See the header note: each replaces the harvested
  // caption for ONE named widget with the printed text this build read at that
  // widget's own measured position. The harvested value it replaces is kept
  // beside it so both answers stay visible.
  const corrections = doc.printedLabelCorrections ?? {};
  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const w = f.widgets[0] ?? null;
    const correction = Object.hasOwn(corrections, f.name) ? corrections[f.name] : null;
    const harvested = c.effectiveLabel ?? null;
    const effective = correction ? correction.printedLabel : harvested;
    const subject = effective ?? f.name;
    return {
      name: f.name,
      type: f.type,
      maxLength: f.maxLength ?? null,
      effectiveLabel: effective,
      harvestedLabel: harvested,
      printedLabelCorrection: correction,
      labelBasis: correction
        ? "printed_page_text_read_at_the_measured_widget_position"
        : (c.labelBasis ?? null),
      regionHeading: c.regionHeading ?? null,
      widgets: f.widgets,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: effective ? descriptorsMatching(effective).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedByPage
  };
}




const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FAMILY='nd-prohibit-remote-public-access-set';
const OUT='data/rcap-all50/overlays/census-v1/nd/nd-prohibit-remote-public-access-set--official-pdf-fill';
const ADOPTION='data/rcap-grade-a/source-wave-integration/SOURCE_USER_UPLOAD_ADOPTION_2026-09-11.json';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=(rel,x)=>{const p=path.join(ROOT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n')};
const SID=s=>'official-form:ND-'+s;
const BRIEF=SID('BRIEF-PROHIBIT-PUBLIC-ACCESS'),DECL=SID('DECLARATION-SUPPORT-REMOTE-ACCESS');
const MAIL=SID('DECLARATION-OF-SERVICE'),OFFICE=SID('DECLARATION-OFFICE-SERVICE-REMOTE-ACCESS');
const FINDINGS=SID('PROPOSED-FINDINGS-PROHIBIT-PUBLIC-ACCESS'),CIF=SID('CONFIDENTIAL-INFORMATION-CRIMINAL');
const MOTION=SID('MOTION-PROHIBIT-PUBLIC-ACCESS'),NOTICE=SID('NOTICE-MOTION-REMOTE-ACCESS');
const ORDER=['official-authority:ND-REMOTE-ACCESS-PACKET-INSTRUCTIONS',NOTICE,MOTION,BRIEF,DECL,FINDINGS,CIF,MAIL,OFFICE];
export const FIXTURES={
 canonical:{name:'Jordan Avery Reyes',county:'Cass',district:'East Central',caseNumber:'09-2024-CR-001234',street:'118 Example Street',cityStateZip:'Fargo, ND 58102',phone:'701-555-0142',email:'jordan.reyes@example.com',chargedOn:'March 8, 2024',charge:'Example dismissed charge',disposition:'dismissed',dispositionOn:'June 14, 2024',reason:'The court dismissed the charge.',harms:'I have received unwanted inquiries about this dismissed case when people find the electronic case record online.',protection:'Removing remote access would reduce those unwanted inquiries. The courthouse record would remain available in person.',scope:'My request concerns remote access to this criminal case only. I am not asking to delete or seal the records.',service:'mail',protectedInformation:false},
 boundary:{name:'Alexandrina Katherine Montgomery Reyes',county:'Cass',district:'East Central',caseNumber:'09-2024-CR-009876',street:'4321 Example Avenue, Apartment 27',cityStateZip:'Fargo, ND 58102',phone:'701-555-0143',email:'alexandrina.reyes@example.com',chargedOn:'April 12, 2024',charge:'Example acquitted charge',disposition:'acquitted',dispositionOn:'August 20, 2024',reason:'The court entered an acquittal after trial.',harms:'I have received repeated unwanted inquiries from people who found the electronic case record. They continue asking about a charge of which I was acquitted. I want to explain that harm in my own words rather than have another person supply a statement for me.',protection:'I believe limiting remote access would reduce those inquiries and the resulting loss of privacy. This request leaves access at the courthouse available. These statements are synthetic facts for a diagnostic fixture, not a declaration by a real person.',scope:'I request the limited remote-access remedy for this case. I do not request expungement or sealing, and I understand that the public may still obtain the records in person at the courthouse.',service:'office',protectedInformation:true,birthDate:'April 17, 1991',birthYear:'1991'}
};
for(const f of Object.values(FIXTURES))Object.assign(f,{prosecutor:"Cass County State's Attorney",prosecutorStreet:'211 9th Street South',prosecutorCityStateZip:'Fargo, ND 58103',hasConviction:false,municipalCourt:false,expectsSealing:false,strongerRouteAvailable:false,contestedBalancing:false,feeCharged:false,feeUnaffordable:false,harmsSelected:['privacy'],otherHarms:'',synthetic:true});
export function validateFacts(f){for(const k of ['name','county','district','caseNumber','street','cityStateZip','phone','email','chargedOn','charge','dispositionOn','reason','harms','protection','scope','prosecutor','prosecutorStreet','prosecutorCityStateZip'])assert.equal(typeof f[k],'string',k+' required');for(const k of ['name','county','district','caseNumber','harms','prosecutor'])assert(f[k].trim(),k+' blank');assert(['dismissed','acquitted'].includes(f.disposition));for(const k of ['hasConviction','municipalCourt','expectsSealing','strongerRouteAvailable','contestedBalancing'])assert.equal(f[k],false,'Unresolved or triggered stop '+k);assert(Array.isArray(f.harmsSelected)&&f.harmsSelected.length>0);assert(f.harmsSelected.every(k=>['injury','privacy','business','publicSafety','other'].includes(k)));if(f.harmsSelected.includes('other'))assert(typeof f.otherHarms==='string'&&f.otherHarms.trim(),'Other harm must be supplied by participant');assert(['mail','office'].includes(f.service));assert(!(f.feeCharged&&f.feeUnaffordable),'Conditional fee waiver must be obtained before this branch can be completed');return true;}
export function stopReasons(f){return [f.hasConviction&&'conviction',f.municipalCourt&&'municipal_court',f.expectsSealing&&'wrong_remedy',f.strongerRouteAvailable&&'prefer_nonconviction_close',f.contestedBalancing&&'contested_balancing'].filter(Boolean)}
export function plan(d,fixture){
 const fields=d.fields,byName=new Map(fields.map(f=>[f.name,f]));const mapped={},narratives=[],selections={},meaning={};
 const bind=(name,fact,label)=>{assert(byName.has(name),d.sourceId+':'+name);narratives.push({fields:[name],factId:fact,...(((d.sourceId===FINDINGS&&name==='Defendant')||(d.sourceId===CIF&&name==='undefined'))?{maxFontSize:8,alignWidgetFontSizeToFit:true}:{}),...(fact==='prosecutor'?{allowProtectedCategories:['prosecutor','attorney']}: {})});meaning[name]=label};
 const narrative=(names,fact,label)=>{for(const name of names){assert(byName.has(name),name);meaning[name]=label}narratives.push({fields:names,factId:fact})};
 const choice=(name,label)=>{assert(byName.has(name),name);selections[name]={checked:true,basis:'Synthetic held '+fixture.disposition+' disposition / participant privacy-harm election'};meaning[name]=label};
 for(const [n,f,l] of [['County Of','county','County of criminal case'],['Judicial District','district','Judicial district of criminal case'],['Criminal Case No','caseNumber','Criminal case number'],['Defendant','name','Defendant name']])if(byName.has(n))bind(n,f,l);
 if([NOTICE,MOTION].includes(d.sourceId)){
  bind('State Of North Dakota','county','County of criminal case');bind('In District Court','district','Judicial district of criminal case');bind('vs','name','Defendant name');
  if(d.sourceId===NOTICE){bind('Text1','name','Printed Name');bind('Printed Name','fullAddress','Address, city, state and ZIP');bind('Address','phone','Telephone number');bind('City State Zip Code','email','Email address')}
  else{bind('undefined','name','Printed Name');bind('Text1','fullAddress','Address, city, state and ZIP');bind('Address','contact','Telephone number and email address')}
 }
 if([BRIEF,DECL].includes(d.sourceId))for(const [n,f,l] of [['Printed Name','name','Printed Name'],['Address','street','Participant street address'],['City State Zip Code','cityStateZip','Participant city state ZIP'],['Telephone Number','phone','Participant telephone number'],['Email Address','email','Participant email address']])if(byName.has(n))bind(n,f,l);
 if(d.sourceId===BRIEF){bind('The Defendant in the abovecaptioned case was charged on','chargedOn','Date defendant was charged');narrative(['with','undefined'],'charge','Charge description supplied by participant');narrative(['In the abovecaptioned cases the reason for choose one','undefined_2'],'reason','Participant explanation of case outcome');choice(fixture.disposition==='dismissed'?'Check Box1':'Check Box2','Participant case outcome election');choice(fixture.disposition==='dismissed'?'Check Box3':'Check Box4','Participant case outcome election');for(const [key,name]of Object.entries({injury:'Check Box5',privacy:'Check Box6',business:'Check Box7',publicSafety:'Check Box8',other:'Check Box9'}))if(fixture.harmsSelected.includes(key))choice(name,key==='privacy'?'Participant privacy rights and interests election':'Participant '+key+' harm election');if(fixture.harmsSelected.includes('other'))narrative(['undefined_3','1','2'],'otherHarms','Other harm stated by participant');narrative(['case is no broader than necessary to protect the Defendant from further harm because',...Array.from({length:4},(_,i)=>'explain Paragraph 12 continued on next page '+(i+1)),...Array.from({length:7},(_,i)=>'Paragraph 12 continued '+(i+1))],'scope','Participant statement of requested scope, paragraph 12')}
 if(d.sourceId===DECL){bind('I understand','name','Declarant name');bind('with','chargedOn','Date defendant was charged');narrative(['2','undefined'],'charge','Charge description');bind('choose one','dispositionOn','Date of case outcome');narrative(['4','undefined_2'],'reason','Participant explanation of case outcome');choice(fixture.disposition==='dismissed'?'Check Box1':'Check Box2','Participant case outcome election');choice(fixture.disposition==='dismissed'?'Check Box3':'Check Box4','Participant case outcome election');narrative(['1','2_2','3','4_2','5','6','7','8','9','10','11','12'],'harms','Participant harm statement, paragraph 5');narrative([...Array.from({length:7},(_,i)=>'of your Brief in Support of Motion Paragraph 6 continues on next page '+(i+1)),'1_2','2_3','3_2','4_3','5_2','6_2','7_2','8_2','9_2','undefined_3'],'protection','Participant explanation of protection from further harm, paragraph 6')}
 if(d.sourceId===CIF){bind('Printed Name','name','Printed Name');bind('Address','fullAddress','Address City State Zip Code');bind('Telephone Number','contact','Telephone Number Email Address')}
 if(d.sourceId===CIF&&fixture.protectedInformation){bind('undefined','name','Person whose protected information is referenced');bind('Date of Birth','birthDate','Full birthdate in confidential attachment');bind('Year of Birth','birthYear','Publicly referenced year of birth')}
 if([MAIL,OFFICE].includes(d.sourceId)){
  if(d.sourceId===MAIL){bind('Name of States Attorney','prosecutor','Name of States Attorney');bind('Mailing Address','prosecutorStreet','Mailing Address');bind('City State Zip Code','prosecutorCityStateZip','City State Zip Code')}
  else bind('and correct copy of each of the documents listed in Paragraph 3 to the offices of','prosecutor','Name of states attorney');
 }
 const narrativeNames=new Set(narratives.flatMap(n=>n.fields));const requested=new Set([...Object.keys(mapped),...narrativeNames,...Object.keys(selections)]);
 const records=fields.map(f=>{const w=f.widgets[0];let reason;
  if(requested.has(f.name))reason='HELD_FACT_OR_PARTICIPANT_ELECTION';
  else if(d.sourceId===FINDINGS)reason='COURT_OWNED';
  else if([MAIL,OFFICE].includes(d.sourceId))reason='SERVICE_ACT_OR_SERVER_COMPLETION';
  else if(d.sourceId===CIF)reason='NO_REFERENCED_PROTECTED_INFORMATION_FOR_THIS_SECTION';
  else if(f.type==='checkbox')reason='UNSELECTED_ALTERNATIVE';
  else reason='UNUSED_CONTINUATION_OR_CONDITIONAL_OTHER_HARM';
  return {field:f.name,page:w?.page,rect:w?.rect,reason,requested:requested.has(f.name),factIds:mapped[f.name]?.factIds??narratives.filter(n=>n.fields.includes(f.name)).map(n=>n.factId),effectiveLabel:meaning[f.name]??f.effectiveLabel??f.name};});
 return {mapped,narratives,selections,records,census:fields.map(f=>({...f,effectiveLabel:meaning[f.name]??f.effectiveLabel,printedLabelCorrection:meaning[f.name]?{printedLabel:meaning[f.name],basis:'source printed section and measured widget rectangle; original harvested label retained'}:null})),unwritable:records.filter(r=>!r.requested).map(r=>({field:r.field,class:r.reason}))};
}
export function instructions(){return `# North Dakota criminal remote-access packet

DIAGNOSTIC / SYNTHETIC REVIEW FIXTURES — DO NOT FILE THESE EXAMPLES.

This packet asks the district court holding the criminal case to restrict remote access after dismissal or acquittal. It does not expunge or seal records. Courthouse access remains; law-enforcement, prosecution and BCI records are unaffected. North Dakota Legal Self Help Center forms are not mandatory court forms and acceptance is not guaranteed.

Stop if there is any conviction in the case; the case is municipal; you expect expungement or sealing; the stronger nonconviction-closing route is available; or the balancing question is contested. Assess the stronger route first. Do not invent a reason why it is unavailable.

Prepare the separate Notice, Motion, Brief, supporting Declaration and proposed Findings/Order. Supply the county, judicial district, case number, defendant name, charge and charging date, disposition and date, reason, contact details and your own harm/protection/scope explanations. Check the actual dismissal or acquittal branch consistently. Supply the dismissal/acquittal record. Never substitute a platform-written argument for your own statement.

The Notice states the response and oral-argument procedure. Consult its original text and Rule 3.2. Leave all findings/order fields below the caption blank for the judge or judicial referee. Personally sign and date the Notice, Motion and Brief; execute the Declaration's perjury and place-of-signing controls yourself when signing. No signature or execution fact is filled by this builder.

Protected information belongs on the Confidential Information Form, not the public documents. Use the protected-information substitutions described on pages 4–5 of the original instructions. Fill applicable confidential sections and execute its signature/date. DO NOT SERVE the Confidential Information Form. It is separately filed confidentially. The diagnostic boundary includes a synthetic birthdate to exercise this conditional branch. Do not treat an unused section as a missing fact.

Serve all parties with the Notice, Motion, Brief, Declaration, proposed Findings/Order and any exhibits. Confirm the prosecutor office and address. Choose mail OR office service; the other declaration is an unselected alternative, not another completed service event. The original instructions require an adult server for mail, and an adult nonparty/noninterested server for office service. The actual server supplies identity, actual recipients, date/time/address and exhibit list, then signs the appropriate declaration after service. Repeat proof for every served party. No future service fact is certified here.

File the originals, applicable exhibits, confidential information form and completed proof of service with the clerk holding the criminal case. Confirm local filing mechanics. No fee amount is asserted; if a filing fee is required and unaffordable, the original instructions direct concurrent fee-waiver forms. Confirm that conditional input before filing. Retain all 13 original instruction pages.

The office-service source contains the original words 'Affidavit in Support' and 'civil matter'. For this criminal packet, serve the current Declaration in Support supplied here; those inherited labels do not require an invented affidavit.\n\nEvery unused narrative line is available for continuation. If a held narrative cannot fit all supplied lines at a readable size, this builder stops instead of truncating it. All generated fixtures are review-only; no production route, payment or sponsor permission is opened.
`;}
async function main(){
 if(process.argv.includes('--check'))return checkSavedCandidate(ROOT,OUT);
 const baseArg=process.argv.indexOf('--minimum-captain-sha');assert(baseArg>=0,'Actual authorized assignment base required');const base=process.argv[baseArg+1];assert(/^[a-f0-9]{40}$/.test(base));execFileSync(process.execPath,['scripts/verify-packet-build-environment.mjs','--family',FAMILY,'--codex-cloud','--minimum-captain-sha',base],{cwd:ROOT,stdio:'pipe'});

 const adoptionPath=process.env.ND_SOURCE_ADOPTION_PATH??ADOPTION;const a=JSON.parse(fs.readFileSync(path.join(ROOT,adoptionPath)));const sources=a.sources.filter(s=>s.familyIds.includes(FAMILY));assert.equal(sources.length,9);const docs=[];
 for(const id of ORDER){const s=sources.find(s=>s.sourceId===id);assert(s,id);const bytes=fs.readFileSync(path.join(ROOT,s.heldCorpusPath));assert.equal(sha(bytes),s.sha256);assert.equal(bytes.length,s.byteLength);const census=await censusDocument({},bytes);docs.push({...census,sourceId:id,source:s,bytes,documentId:id.split(':')[1]});}
 const artifacts=[],results=[];
 if(fs.existsSync(path.join(ROOT,OUT,'fixtures','canonical.pdf'))){
  assert(process.argv.includes('--replace-committed-candidate'),'Existing candidate must be preserved before rebuilding');
  // A bounded repair may replace only byte-exact committed artifacts. Their authentic
  // prior bytes remain in Git; dirty or untracked work already fails native preflight.
  const tracked=execFileSync('git',['ls-files','--',OUT],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  assert(tracked.includes(OUT+'/fixtures/canonical.pdf'),'Existing candidate is not committed');
  for(const rel of tracked){const prior=execFileSync('git',['show','HEAD:'+rel],{cwd:ROOT,maxBuffer:32*1024*1024});assert.equal(sha(fs.readFileSync(path.join(ROOT,rel))),sha(prior),'Unpreserved candidate difference: '+rel);}
 }
 fs.mkdirSync(path.join(ROOT,OUT,'fixtures'),{recursive:true});
 for(const [label,fixture] of Object.entries(FIXTURES)){
  validateFacts(fixture);assert.equal(stopReasons(fixture).length,0);const facts={...fixture,fullAddress:fixture.street+', '+fixture.cityStateZip,contact:fixture.phone+' / '+fixture.email};const packet=await PDFDocument.create();
  for(const d of docs){const p=plan(d,fixture);const r=await finalizeOfficialForm({sourceBytes:d.bytes,expectedSha256:d.source.sha256,census:p.census,facts,unwritableFields:p.unwritable,composedFieldValues:p.mapped,narrativeAcrossFields:p.narratives,selectionsFromHeldFacts:p.selections,documentTextLines:d.documentTextLines,suppressSynthesizedAppearances:true,minFontSize:8,maxFontSize:10,title:d.documentId});
   const written=new Set(r.report.written.map(w=>w.field));const requiredMissing=Object.keys(p.mapped).filter(f=>!written.has(f));const narrativeMissing=p.narratives.filter(n=>!r.report.narrativesWritten.some(w=>w.factId===n.factId&&JSON.stringify(w.fields)===JSON.stringify(n.fields)));const selectedMissing=Object.keys(p.selections).filter(f=>!written.has(f));
   if(requiredMissing.length||narrativeMissing.length||selectedMissing.length){write(`${OUT}/reports/author-mapping-failure.json`,{documentId:d.documentId,fixture:label,requiredMissing,narrativeMissing,selectedMissing,report:r.report});throw Error('Required ND writes refused: '+d.documentId+' '+label)}
   const saved=await PDFDocument.load(r.bytes);assert.equal(saved.getPageCount(),d.pages.length);assert.equal(saved.getForm().getFields().length,0);
   const startPage=packet.getPageCount()+1;for(const pg of await packet.copyPages(saved,saved.getPageIndices()))packet.addPage(pg);
   results.push({documentId:d.documentId,fixture:label,startPage,pageCount:d.pages.length,sourceSha256:d.source.sha256,report:r.report,fields:p.records,sourceCensus:p.census});
  }
  await appendInstructions(packet,instructions(),fixture);stampDeterministic(packet);const bytes=await packet.save();const rel=`${OUT}/fixtures/${label}.pdf`;fs.writeFileSync(path.join(ROOT,rel),bytes);const saved=await PDFDocument.load(fs.readFileSync(path.join(ROOT,rel)));assert(saved.getPageCount()>31,'Source31pages plus supplemental instructions required');artifacts.push({fixture:label,file:rel,sha256:sha(bytes),byteLength:bytes.length,pageCount:saved.getPageCount(),classification:'DIAGNOSTIC_NON_FILING'});
 }
 const route=JSON.parse(fs.readFileSync(path.join(ROOT,'data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json'))); // Retained as authoritative input; no route rewritten.
 write(`${OUT}/source-receipt.json`,{schemaVersion:'rcap-family-source-receipt/v1',familyId:FAMILY,implementationStrategy:'official_pdf_fill',jurisdiction:'ND',allSourcesExact:true,adoptionEvidence:ADOPTION,adoptionSnapshotSha256:sha(fs.readFileSync(path.join(ROOT,adoptionPath))),documents:docs.map(d=>({documentId:d.documentId,sourceIds:[d.sourceId],pathInRepository:d.source.heldCorpusPath,sha256:d.source.sha256,byteLength:d.bytes.length,pageCount:d.pages.length,acroFieldCount:d.fields.length}))});
 write(`${OUT}/field-census.census-v1.json`,{schemaVersion:'rcap-official-form-field-census/v1-census-v1',familyId:FAMILY,documents:docs.map(d=>({documentId:d.documentId,pageGeometry:d.pageGeometry,fieldCount:d.fields.length,fields:d.fields}))});
 write(`${OUT}/reports/author-render-results.json`,{familyId:FAMILY,artifacts,results,independentAcceptance:false,completenessStatus:'NOT_YET_AUDITED'});
 write(`${OUT}/fixture-facts.json`,{classification:'DIAGNOSTIC_NON_FILING',fixtures:FIXTURES});fs.writeFileSync(path.join(ROOT,OUT,'participant-instructions.md'),instructions());
 await emitNativeMetadata({root:ROOT,out:OUT,familyId:FAMILY,docs,artifacts,results,fixtures:FIXTURES,adoptionPath,instructions:instructions()});
 await checkSavedCandidate(ROOT,OUT);
 console.log(JSON.stringify({familyId:FAMILY,fixtures:artifacts.length,pages:artifacts.reduce((n,a)=>n+a.pageCount,0),status:'AUTHOR_RENDERED_NATIVE_AUDIT_PENDING'}));
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))if(process.argv.includes('--test-stops')){for(const key of ['hasConviction','municipalCourt','expectsSealing','strongerRouteAvailable','contestedBalancing'])assert.equal(stopReasons({[key]:true}).length,1);console.log('Five adopted stop controls PASS')}else await main();
