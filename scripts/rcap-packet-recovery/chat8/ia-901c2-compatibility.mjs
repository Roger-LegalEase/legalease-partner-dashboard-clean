/** Form 1 ONLY: standard reports over preserved candidate bytes; never runs the renderer. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PDFDocument } from 'pdf-lib';
import { auditFamily, verifySourcePresentation } from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import { classifyBlank } from '../../rcap-packet-completeness/completeness-contract.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const FAMILY='ia-901c2-set';
export const OUTPUT='data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill';
export const EVIDENCE='data/rcap-grade-a/chat-parallel-2026-09-07/chat8-build/ia-901c2-compatibility-v1';
const SOURCE='reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-1-2024-08.pdf';
const SOURCE_SHA='c7a6c42baa70cd327ee1567081791682d6a89ea121012fdd5de0b86876bfd0e5';
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export const read=p=>JSON.parse(fs.readFileSync(path.resolve(ROOT,p),'utf8'));
export const write=(p,v)=>{const f=path.resolve(ROOT,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const listFiles=dir=>fs.readdirSync(dir,{recursive:true}).filter(n=>fs.statSync(path.join(dir,n)).isFile()).sort();
export const snapshot=dir=>Object.fromEntries(listFiles(dir).map(n=>[n,sha(fs.readFileSync(path.join(dir,n)))]));
const docId=f=>`${f}/form-1`;
function rowOf(r, fixture) {
 const row={...r,fieldId:`${fixture}:${r.fieldId}`,field:r.fieldId,fixture,documentId:docId(fixture),factId:r.fact?`${fixture}:${r.fact}`:null,isSelectionControl:['PDFCheckBox','PDFRadioGroup'].includes(r.type)};
 // The source asks for a RECIPIENT, not an attorney's own execution. Preserve
 // printed role plus original label; do not let a misleading report label make
 // an applicant-completable address into an attorney-only field.
 if(r.fieldId==='2.86-1.cert.05') {row.effectiveLabel='Intended paper-service recipient name';row.printedLabel='Name of person to whom I delivered or mailed it';row.fieldOwner='participant preparing recipient details';}
 if(!r.disposition)return row;
 row.completenessDisposition=r.disposition;
 if(r.type==='PDFButton') {
  row.sourcePresentation={kind:'viewer_button',sourceSha256:SOURCE_SHA,sourceField:r.fieldId};
 } else if(r.disposition==='PROTECTED_FIELD') {
  row.refusalClass='signature_or_date_participant_completion';
 } else if(r.disposition==='PARTICIPANT_ELECTION_GENUINE') {
  row.refusalClass='participant_sworn_narrative_or_legal_election';
 } else if(r.disposition==='NOT_APPLICABLE_ON_THIS_ROUTE') {
  row.routeConditionThatMakesItInapplicable=r.reason;
 } else if(r.disposition==='REQUIRED_BEFORE_FILING') {
  if(fixture==='exact-day-180'&&['2.86-1.03.00','2.86-1.03.AB'].includes(r.fieldId)) {
   // Dates are KNOWN and neither printed answer is supported on this diagnostic.
   // Do not relabel a known-false >180 assertion as an unavailable contact fact.
   row.completenessDisposition='ROUTE_OPTION_NOT_SELECTED';row.routeDetermined=true;
   row.requiredBeforeFiling=false;row.diagnosticOnly=true;
  } else {
   row.requiredBeforeFiling=true;
   const k=r.fieldId.replace('2.86-1.','');
   const contacts={'sig.a.05':'address','sig.a.06':'city','sig.a.07':'state','sig.a.08':'zip','sig.a.09':'phone','sig.a.10':'phone','sig.a.11':'email'};
   if(contacts[k])row.factId=`${fixture}:${contacts[k]}`;
  }
 }
 return row;
}
export async function buildCompatibility({measurements, outDir=OUTPUT, fixtures=null}={}) {
 const root=path.resolve(ROOT,outDir), before=snapshot(root);
 const manifest=read(`${OUTPUT}/reports/rendered-artifacts.json`);
 const selected=manifest.fixtures.filter(r=>!fixtures||fixtures.includes(r.fixture));
 if(!selected.length)throw Error('No real fixtures selected');
 const bytes=fs.readFileSync(path.join(ROOT,SOURCE));if(sha(bytes)!==SOURCE_SHA)throw Error('Source drift');
 const source=await PDFDocument.load(bytes,{updateMetadata:false});
 const sourceFields=source.getForm().getFields();
 if(source.getPageCount()!==3||sourceFields.length!==56)throw Error('Source inventory drift');
 const fields=sourceFields.map(f=>({name:f.getName(),pdfType:f.constructor.name,widgets:f.acroField.getWidgets().map(w=>({page:source.getPages().findIndex(p=>p.ref===w.P())+1,rect:w.getRectangle(),flags:w.getFlags()}))}));
 const receipts=[],censusDocs=[],map={schemaVersion:1,familyId:FAMILY,writes:[],refusals:[]};
 const actual={familyId:FAMILY,derivedFromArtifactBytes:true,measurementMethod:'PyMuPDF final/source glyph-position difference and 216-DPI interior-ink comparison; Poppler full text import',artifacts:[],documents:[]};
 const packets=[],ledgers=[],readiness=[],instructions=[];
 for(const m of selected) {
  const f=m.fixture,r=read(`${OUTPUT}/reports/${f}.json`),facts=read(`${OUTPUT}/fixtures/${f}.json`);
  const proof=measurements.results.find(x=>x.fixture===f);
  const b=fs.readFileSync(path.join(ROOT,OUTPUT,m.path));
  if(!proof||proof.sha256!==sha(b)||sha(b)!==m.sha256||proof.writes.length!==r.actualWrites.length)throw Error(`Unbound measurements: ${f}`);
  if(r.actualWrites.length+r.blanks.length!==57||new Set(r.fieldMap.map(x=>x.fieldId)).size!==57)throw Error('Incomplete original partition');
  const originalFields=new Set(r.fieldMap.map(x=>x.fieldId));
  for(const field of fields)if(!originalFields.has(field.name))throw Error('Unmapped source field '+field.name);
  map.writes.push(...r.actualWrites.map(x=>rowOf(x,f)));map.refusals.push(...r.blanks.map(x=>rowOf(x,f)));
  receipts.push({formNumber:docId(f),path:SOURCE,sha256:SOURCE_SHA,byteCount:bytes.length,pages:3,edition:'August 2024'});
  censusDocs.push({formNumber:docId(f),sourceSha256:SOURCE_SHA,fields:fields.map(x=>({name:x.name,pdfType:x.pdfType,widgets:x.widgets})),documentPolicy:{sourceFieldEvidence:Object.fromEntries(fields.map(x=>[x.name,{pdfType:x.pdfType,annotationFlags:x.widgets.map(w=>w.flags)}]))}});
  actual.artifacts.push({fixture:f,file:`${outDir}/${m.path}`,sha256:sha(b),valuesReportedByFinalizer:r.actualWrites.length,addedGlyphsReadFromOutputBytes:proof.addedGlyphsReadFromOutputBytes,nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,refusedFieldsWithInk:proof.blankInk.filter(x=>x.addedDarkPixelsByWidget.some(n=>n>0)),measurements:proof.writes});
  actual.documents.push({fixture:f,formNumber:docId(f),sourceSha256:SOURCE_SHA,actualWrites:proof.writes.map(x=>({...x,field:x.fieldId,factId:map.writes.find(w=>w.fixture===f&&w.field===x.fieldId)?.factId,visibleInArtifactBytes:true,everyWidgetVisibleInArtifactBytes:true}))});
  packets.push({fixture:f,path:`${outDir}/${m.path}`,sha256:sha(b),pageCount:proof.pages,documents:m.components.map(c=>({...c,documentId:c.id==='application-with-embedded-service'?docId(f):`${f}/${c.id}`}))});
  const pending=r.blanks.filter(x=>x.disposition==='REQUIRED_BEFORE_FILING');
  readiness.push({fixture:f,classification:pending.length?'DIAGNOSTIC_NOT_FILING_POSITIVE':'SUPPORTED_UNEXECUTED_DRAFT',uncompletedSourceAreas:pending.map(x=>x.fieldId),missingParticipantFacts:pending.filter(x=>!x.fieldId.startsWith('2.86-1.03.')).length,sourceWordingConflict:r.timing.formWordingNeedsManualResolution,filingReady:false,source:'unchanged actual packet, explicit facts and original blank ledger; signatures/service remain real later acts'});
  instructions.push(`## ${f}\n\n${proof.guideText}\n\n### Exact completion ledger for this fixture\n\n`+r.blanks.filter(x=>x.type!=='PDFButton').map(x=>`${rowOf(x,f).fieldId}: ${rowOf(x,f).effectiveLabel??x.label}. ${x.reason}`).join('\n\n'));
 }
 const priorReceipt=read(`${OUTPUT}/source-receipt.json`);
 const receipt={...priorReceipt,documents:receipts,allSourcesExact:sha(bytes)===SOURCE_SHA};
 const census={schemaVersion:1,familyId:FAMILY,method:'Exact held PDF field inventory; no inferred geometry',documents:censusDocs};
 write(`${outDir}/source-receipt.json`,receipt);write(`${outDir}/field-census.census-v1.json`,census);write(`${outDir}/production-field-map.json`,map);
 write(`${outDir}/reports/actual-writes.json`,actual);
 write(`${outDir}/reports/rendered-artifacts.json`,{...manifest,packets});
 fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'participant-instructions.md'),'# Form 1: exact fixture instructions and completion disclosures\n\nThese are source-bound build examples, not completed filings. Exact-day-180 and missing-contact are diagnostics. The unchanged PDF guide in each fixture governs that fixture.\n\n'+instructions.join('\n\n'));
 write(`${outDir}/approval-request.json`,{familyId:FAMILY,status:'REVIEW_REQUESTED_NOT_APPROVED',independentReview:'Chat10 LIMITED_FINDING preserved; compatibility review requested',centralRaster:'PENDING_CHAT_A',productionReady:false});
 for(const blank of map.refusals) {
  const normal={id:blank.fieldId,name:blank.field,label:blank.effectiveLabel??blank.label,document:blank.documentId,sourceIdentity:blank.field,isSelectionControl:blank.isSelectionControl,declared:{...blank,disposition:blank.completenessDisposition}};
  const verified=verifySourcePresentation(normal,{census,receipt,fieldMap:map,actualWrites:actual,rendered:{packets}});
  const verdict=classifyBlank(normal,blank.reason,blank.refusalClass,{...normal.declared,sourcePresentation:verified,identity:normal.id});
  ledgers.push({...blank,importerDisposition:verdict.disposition,importerBasis:verdict.basis});
 }
 write(`${outDir}/reports/blank-dispositions.json`,{familyId:FAMILY,blanks:ledgers});
 write(`${outDir}/reports/blanks-left-for-the-participant.json`,{familyId:FAMILY,fixtures:readiness,blanks:ledgers.filter(x=>x.type!=='PDFButton')});
 write(`${outDir}/reports/packet-level-readiness.json`,{familyId:FAMILY,fixtures:readiness,filingReady:false,diagnosticsAreNotPositiveFixtures:true});
 const result=auditFamily(outDir,FAMILY);
 write(`${outDir}/reports/completeness-counters.json`,result.counters);
 write(`${outDir}/reports/completeness-result.json`,result);
 const after=snapshot(root),changed=Object.keys(before).filter(n=>before[n]!==after[n]);
 if(changed.some(n=>n.endsWith('.pdf')))throw Error('Compatibility must never change PDFs');
 return {result,changedOriginalFiles:changed,preservedPdfHashes:Object.fromEntries(Object.entries(before).filter(([n])=>n.endsWith('.pdf'))),readiness};
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)) {
 const measurements=JSON.parse(execFileSync('python',[path.join(ROOT,'scripts/rcap-packet-recovery/chat8/measure-ia-901c2-compatibility.py')],{maxBuffer:16*1024*1024}).toString());
 write(`${EVIDENCE}/byte-measurements.json`,measurements);
 const result=await buildCompatibility({measurements});write(`${EVIDENCE}/compatibility-result.json`,result);console.log(JSON.stringify(result.result,null,2));
}
