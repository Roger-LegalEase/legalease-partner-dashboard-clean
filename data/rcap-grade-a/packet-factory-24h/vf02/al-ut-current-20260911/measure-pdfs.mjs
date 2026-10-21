import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PDFDocument,PDFName,PDFArray,decodePDFRawStream} from 'pdf-lib';
import {extractTextItems} from '../../../../../scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs';
import {flattenedWidgets,drawnAt} from '../../../../../scripts/rcap-official-forms/pdf-flattened-widgets.mjs';
import {fixtures,validateUtTraffickingPcraFacts} from '../../../../../scripts/build-census-v1-census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement.mjs';

const OUT=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(OUT,'../../../../..');process.chdir(ROOT);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(n,d)=>fs.writeFileSync(path.join(OUT,n),JSON.stringify(d,null,n.endsWith('direct-text-items.json')?0:2)+'\n');
const al='data/rcap-all50/overlays/census-v1/al/al-pardon-set--official-pdf-fill';
const ut='data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill';
const streams=(doc,page)=>{const c=page.node.Contents();return (c instanceof PDFArray?c.asArray().map(x=>doc.context.lookup(x)):[c]).filter(Boolean);};
const raw=(doc,page)=>streams(doc,page).map(s=>Buffer.from(decodePDFRawStream(s).decode()).toString('latin1'));
const asource=await PDFDocument.load(fs.readFileSync('private/source-imports/src05-worker-materialization-2026-09-02/LegalEase Alabama/AL_ABPP-3_rev-2025-06-14.pdf'),{ignoreEncryption:true,updateMetadata:false});
const amap=read(al+'/production-field-map.json');
const apages=asource.getPages();
const afields=asource.getForm().getFields().map(f=>({name:f.getName(),type:f.constructor.name,value:f.getText?.()??f.isChecked?.()??null,widgets:f.acroField.getWidgets().map(w=>({page:apages.findIndex(p=>p.ref===w.P())+1,rect:w.getRectangle()}))}));
const ar=[];
for(const fixture of ['canonical','boundary']){
 const file=al+'/fixtures/'+fixture+'.pdf',d=await PDFDocument.load(fs.readFileSync(file),{ignoreEncryption:true,updateMetadata:false}),appearances=await flattenedWidgets(file);
 ar.push({fixture,sha256:hash(fs.readFileSync(file)),pages:d.getPageCount(),acroFields:d.getForm().getFields().length,
 sourceStreamsPreserved:apages.map((p,i)=>({page:i+1,preserved:streams(asource,p).every(s=>streams(d,d.getPages()[i]).some(t=>hash(t.contents)===hash(s.contents)))})),
 fields:afields.map(f=>({name:f.name,type:f.type,disposition:amap.writes.some(w=>w.field===f.name)?'WRITTEN':amap.refusals.find(w=>w.field===f.name)?.completenessDisposition??amap.refusals.find(w=>w.field===f.name)?.refusalClass??'UNCLASSIFIED',widgets:f.widgets.map(w=>({...w,actualAppearances:drawnAt(appearances,w)}))})),appearances});
}
save('al-direct-field-and-stream-measurement.json',{sourceFields:afields,sourceFieldCount:afields.length,sourceWidgetCount:afields.reduce((n,f)=>n+f.widgets.length,0),fixtures:ar});
const usource=await PDFDocument.load(fs.readFileSync('reference/utah/04_PCRA_Petition-2022-06-13.pdf'));
const umap=read(ut+'/production-field-map.json');
const ur=[];
for(const fixture of ['canonical','boundary']){
 const file=ut+'/fixtures/'+fixture+'.pdf',d=await PDFDocument.load(fs.readFileSync(file));
 const pages=d.getPages().map((p,i)=>({page:i+1,dimensions:p.getSize(),textItems:extractTextItems(p)}));
 const actualRects=[];
 for(let i=0;i<10;i++){
  const sourceRaw=raw(usource,usource.getPages()[i]); const outputRaw=raw(d,d.getPages()[i]);
  const added=outputRaw.filter(s=>!sourceRaw.includes(s));
  for(const stream of added){
   const pattern=/q\s+1 1 1 rg\s+0 w\s+\[\] 0 d\s+1 0 0 1 ([-\d.]+) ([-\d.]+) cm\s+1 0 0 1 0 0 cm\s+1 0 0 1 0 0 cm\s+0 0 m\s+0 ([-\d.]+) l\s+([-\d.]+) [-\d.]+ l\s+[-\d.]+ 0 l\s+h\s+f\s+Q/g;
   for(const m of stream.matchAll(pattern)) actualRects.push({page:i+1,x:+m[1],y:+m[2],width:+m[4],height:+m[3]});
  }
 }
 const writes=umap.maps.flatMap(m=>m[fixture+'Writes']??[]).map(w=>{
  const box=w.measured;
  const items=pages[w.page-1].textItems.filter(t=>t.x>=box.x-0.1&&t.x<box.x+box.width+0.1&&t.y>=box.y-0.1&&t.y<=box.y+box.height+0.1);
  const whiteRect=actualRects.find(r=>r.page===w.page&&Math.abs(r.x-box.x+1)<.01&&Math.abs(r.y-box.y+1)<.01&&Math.abs(r.width-box.width-2)<.01);
  return {field:w.field,factId:w.factId,page:w.page,box,whiteRect: whiteRect??null,actualText:items.filter(t=>t.baseFont?.startsWith('Helvetica')).map(t=>t.text)};
 });
 const sourceStreams=usource.getPages().map((p,i)=>({page:i+1,preserved:streams(usource,p).every(s=>streams(d,d.getPages()[i]).some(t=>hash(t.contents)===hash(s.contents)))}));
 ur.push({fixture,sha256:hash(fs.readFileSync(file)),pages:d.getPageCount(),acroFormPresent:!!d.catalog.get(PDFName.of('AcroForm')),sourceStreams,writes,actualWhiteRects:actualRects,refusals:umap.maps[0][fixture+'Refusals'],sourceOfficialFieldCount:111,fixtureGateResult:validateUtTraffickingPcraFacts(fixtures[fixture])});
 save('ut-'+fixture+'-direct-text-items.json',pages);
}
save('ut-source-direct-text-items.json',usource.getPages().map((p,i)=>({page:i+1,dimensions:p.getSize(),textItems:extractTextItems(p)})));
save('ut-direct-placement-measurement.json',ur);
save('ut-fixture-facts.json',fixtures);
console.log(JSON.stringify({alSourceFields:afields.length,alSourceWidgets:afields.reduce((n,f)=>n+f.widgets.length,0),alAppearanceCounts:ar.map(x=>({fixture:x.fixture,appearances:x.appearances.length})),ut:ur.map(x=>({fixture:x.fixture,officialWhiteRects:x.actualWhiteRects.length,writes:x.writes.length,withReadback:x.writes.filter(w=>w.actualText.length).length}))},null,2));
