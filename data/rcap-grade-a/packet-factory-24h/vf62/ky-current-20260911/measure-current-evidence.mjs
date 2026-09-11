// Independent, nonmutating inspection of current bytes and original GHA images.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import sharp from 'sharp';
import {flattenedWidgets,drawnAt} from '../../../../../scripts/rcap-official-forms/pdf-flattened-widgets.mjs';
import {validateKy} from '../../../../../scripts/rcap-packet-recovery/ky-misdemeanor.mjs';
const OUT=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(OUT,'../../../../..');
assert.equal(process.cwd(),ROOT);
const F='ky_misdemeanor_expungement-set',DIR='data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill';
const RUN='data/rcap-grade-a/packet-factory-24h/raster-runs/34602920153';
const ORIGINAL='/tmp/rcap-ky-original-34602920153/artifact';
const read=p=>JSON.parse(fs.readFileSync(path.resolve(ROOT,p),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const norm=s=>String(s).replace(/\s+/g,'');
const xmlDecode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
const wordsFor=file=>[...execFileSync('pdftotext',['-bbox',file,'-'],{encoding:'utf8',maxBuffer:16e6}).matchAll(/<page width="([^"]+)" height="([^"]+)">([\s\S]*?)<\/page>/g)].map(m=>({width:+m[1],height:+m[2],words:[...m[3].matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([\s\S]*?)<\/word>/g)].map(w=>({box:w.slice(1,5).map(Number),text:xmlDecode(w[5])}))}));
const overlap=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
const rectBox=r=>[r.x,792-r.y-r.height,r.x+r.width,792-r.y];
const receipt=read(`${RUN}/${F}.verdict.json`),pins=read(`${RUN}/${F}.PAGE_IMAGES_SHA256.json`),original=read(`${RUN}/${F}.ORIGINAL_EVIDENCE_VERIFIED.json`);
assert.equal(fs.readFileSync(`${RUN}/${F}.verdict.json`,'utf8'),fs.readFileSync(`${ORIGINAL}/${F}.verdict.json`,'utf8'));
const sourceRows=[];
for(const s of read(`${DIR}/source-receipt.json`).sources){
 const bytes=fs.readFileSync(s.path),pdf=await PDFDocument.load(bytes,{updateMetadata:false});
 assert.equal(sha(bytes),s.sha256);assert.equal(bytes.length,s.byteLength);assert.equal(pdf.getPageCount(),s.pages);assert.equal(pdf.getForm().getFields().length,s.fields);
 const fields=pdf.getForm().getFields().map(f=>({name:f.getName(),type:f.constructor.name,sourceValue:f.getText?.()??f.getSelected?.()??f.isChecked?.()??null,options:f.getOptions?.(),widgets:f.acroField.getWidgets().map(w=>({page:pdf.getPages().findIndex(p=>p.ref===w.P())+1,rect:w.getRectangle()}))}));
 sourceRows.push({...s,measuredSha256:sha(bytes),fields,words:wordsFor(s.path)});
}
const artifacts=[],pageMeasurements=[];
for(const d of receipt.documentsRendered){
 const file=d.path,bytes=fs.readFileSync(file),pdf=await PDFDocument.load(bytes,{updateMetadata:false}),fixture=d.document.replace(/\.pdf$/,'');
 const report=read(`${DIR}/reports/${fixture}.json`),facts=read(`${DIR}/fixtures/${fixture}.facts.json`),flat=await flattenedWidgets(file),words=wordsFor(file);
 assert.equal(sha(bytes),d.pinned);assert.equal(sha(bytes),report.output.sha256);assert.equal(pdf.getPageCount(),report.output.pageCount);assert.equal(pdf.getForm().getFields().length,0);
 const election=validateKy(facts).election;assert.equal(election.field,report.election.field);
 const images=new Map();
 for(const m of receipt.measurements.filter(m=>m.document===d.document)){
  const p=pins.find(p=>p.member===m.png),b=fs.readFileSync(path.join(ORIGINAL,m.png)),meta=await sharp(b).metadata();
  assert.equal(sha(b),m.pngSha256);assert.equal(sha(b),p.sha256);assert.equal(b.length,p.bytes);assert.equal(meta.width,2448);assert.equal(meta.height,3168);
  const raw=await sharp(b).removeAlpha().greyscale().raw().toBuffer();images.set(m.page,{m,raw,width:meta.width});
  pageMeasurements.push({document:d.document,page:m.page,png:m.png,sha256:sha(b),bytes:b.length,actualCanvas:[meta.width,meta.height],measuredPaper:m.paper,pxPerPt:m.pxPerPt,calibrationResidualPx:m.calibrationResidualPx,wordsExtracted:words[m.page-1].words.length});
 }
 const fieldReadings=[];
 for(const w of report.writes){
  const c=report.components.find(c=>c.documentId===w.documentId);
  for(const widget of w.widgets){
   const page=widget.page+c.firstPage-1,placed=drawnAt(flat,{page,rect:widget.rect,tolerance:0.03});
   assert.equal(placed.length,1,`${fixture}/${w.field} placement`);
   if(w.isSelectionControl)assert(placed[0].text.trim());else assert.equal(norm(placed[0].text),norm(w.value),`${fixture}/${w.field} glyph value`);
   const box=rectBox(widget.rect),image=images.get(page);
   const boxWords=words[page-1].words.filter(q=>{const x=(q.box[0]+q.box[2])/2,y=(q.box[1]+q.box[3])/2;return x>=box[0]&&x<=box[2]&&y>=box[1]&&y<=box[3]});
   const pixels=box.map((v,i)=>Math.round(v*image.m.pxPerPt+(i%2===0?image.m.paper.x0:image.m.paper.y0)));
   let dark=0;for(let y=pixels[1];y<=pixels[3];y++)for(let x=pixels[0];x<=pixels[2];x++)if(image.raw[y*image.width+x]<128)dark++;
   assert(dark>0);
   fieldReadings.push({documentId:w.documentId,field:w.field,factId:w.factId,page,expected:w.value,drawnText:placed[0].text,sourceWidgetPt:box,pngBoxPx:pixels,darkPixelsBelow128:dark,popplerWords:boxWords});
  }
 }
 const controls=[];
 for(const c of report.components.filter(c=>['AOC-496.2','AOC-496'].includes(c.documentId))){
  const source=sourceRows.find(s=>s.documentId===c.documentId);
  for(const field of source.fields.filter(f=>f.type==='PDFCheckBox'))for(const w of field.widgets){
   const page=w.page+c.firstPage-1,found=drawnAt(flat,{page,rect:w.rect,tolerance:.03});assert.equal(found.length,1);
   const marked=Boolean(found[0].text.trim()),expected=c.documentId==='AOC-496.2'&&field.name===election.field;assert.equal(marked,expected);
   controls.push({documentId:c.documentId,field:field.name,page,rect:w.rect,drawnText:found[0].text,marked,expectedMarked:expected});
  }
 }
 const nonWriteFieldReadings=[];
 for(const c of report.components.filter(c=>['AOC-496.2','AOC-496'].includes(c.documentId))){
  const source=sourceRows.find(s=>s.documentId===c.documentId);
  for(const field of source.fields.filter(field=>!report.writes.some(w=>w.documentId===c.documentId&&w.field===field.name))){
   for(const w of field.widgets){const page=w.page+c.firstPage-1,found=drawnAt(flat,{page,rect:w.rect,tolerance:.03});
    const nonempty=found.filter(f=>f.text.trim());
    for(const at of nonempty)assert.equal(norm(at.text),norm(field.sourceValue),`${fixture}/${field.name} unexplained ink`);
    nonWriteFieldReadings.push({documentId:c.documentId,field:field.name,page,rect:w.rect,sourceValue:field.sourceValue,drawn:found,disposition:nonempty.length?'UNCHANGED_SOURCE_DEFAULT':'BLANK_OR_REMOVED_VIEWER_CONTROL'});
   }
  }
 }
 const phoneOverlaps=[];
 for(const reading of fieldReadings.filter(r=>r.field==='Def.PhoneNo')){
  const phone=words[reading.page-1].words.find(w=>w.text===facts.participant.phone);
  const source=sourceRows.find(s=>s.documentId===reading.documentId);
  const parentheses=source.words[0].words.filter(w=>['(',')'].includes(w.text)&&overlap(w.box,reading.sourceWidgetPt)>0);
  phoneOverlaps.push({page:reading.page,documentId:reading.documentId,phone,preprintedParentheses:parentheses.map(p=>({...p,overlapWithPhoneBoxSquarePt:overlap(p.box,phone.box)}))});
 }
 const headWords=words[1].words.filter(w=>overlap(w.box,[152,109,355,124])>0);
 artifacts.push({fixture,file,sha256:sha(bytes),bytes:bytes.length,pages:pdf.getPageCount(),remainingInteractiveFields:pdf.getForm().getFields().length,inputSha256:sha(fs.readFileSync(`${DIR}/fixtures/${fixture}.facts.json`)),election,components:report.components,fieldReadings,controls,nonWriteFieldReadings,phoneOverlaps,agencyHeadingWords:headWords,allReportWritesReadFromActualFlattenedAppearances:true,syntheticFacts:facts.isSyntheticFixture});
}
assert.equal(pageMeasurements.length,32);assert.equal(artifacts.length,6);
const legalPath='private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/KY/01_LEGAL_REVIEW/KY__LEGAL-REVIEW__STATEWIDE__kentucky-record-clearing-legal-review__ASOF-2026-08-02__EN.md';
const result={schemaVersion:'vf62-ky-current-byte-and-raster-measurements/v1',reviewer:'/root/ky_current_independent',baseSha:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),familyId:F,runId:'34602920153',method:'Read-only source/PDF SHA-256, pdf-lib source-field and page counts, flattened appearance values at exact source widgets, Poppler word coordinates, and calibrated original-PNG dark-pixel evidence. No local rendering. Dark-pixel presence does not by itself establish readability; all 32 images were independently viewed.',originalReceiptSha256:sha(fs.readFileSync(`${ORIGINAL}/${F}.verdict.json`)),sources:sourceRows,legalSource:{path:legalPath,sha256:sha(fs.readFileSync(legalPath))},artifacts,pageMeasurements,totals:{pdfs:artifacts.length,pages:pageMeasurements.length,logicalWrites:artifacts.reduce((n,a)=>n+read(`${DIR}/reports/${a.fixture}.json`).writes.length,0),widgetWriteInstances:artifacts.reduce((n,a)=>n+a.fieldReadings.length,0),selectionWidgetInstances:artifacts.reduce((n,a)=>n+a.controls.length,0),phoneOverlapOccurrences:artifacts.reduce((n,a)=>n+a.phoneOverlaps.length,0),sourceDuplicateHeadingOccurrences:artifacts.length}};
fs.writeFileSync(path.join(OUT,'current-evidence-measurements.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.totals,null,2));
