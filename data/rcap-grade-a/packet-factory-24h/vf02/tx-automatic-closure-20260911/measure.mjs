import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib';
import { flattenedWidgets, drawnAt } from '../../../../../scripts/rcap-official-forms/pdf-flattened-widgets.mjs';
import { FIXTURES } from '../../../../../scripts/build-census-v1-tx_nd_automatic_misdemeanor_deferred-set.mjs';

const family='tx_nd_automatic_misdemeanor_deferred-set';
const dir='data/rcap-all50/overlays/census-v1/tx/tx-nd-automatic-misdemeanor-deferred-set--official-pdf-fill';
const out='data/rcap-grade-a/packet-factory-24h/vf02/tx-automatic-closure-20260911';
const raster='data/rcap-grade-a/packet-factory-24h/raster-runs/34645317724';
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const decode=s=>{try{return zlib.inflateSync(s.contents)}catch{return Buffer.from(s.contents)}};
const map=read(`${dir}/production-field-map.json`),receipt=read(`${dir}/source-receipt.json`),rendered=read(`${dir}/reports/rendered-artifacts.json`);
const census=read(`${dir}/field-census.census-v1.json`);
const instr=fs.readFileSync(`${dir}/participant-instructions.md`,'utf8');
const result={familyId:family,reviewBase:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceReadback:[],fixtures:[],requiredBeforeFiling:{declared:map.requiredBeforeFiling.length,missingLabels:map.requiredBeforeFiling.filter(r=>!instr.includes(r.effectiveLabel)).map(r=>r.field)}};
let statement;
for(const source of receipt.documents){
 const p=source.custody==='master_library'?`private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/${source.pathInArchive}`:source.pathInArchive;
 const b=fs.readFileSync(p); const pageCount=Number(execFileSync('pdfinfo',[p],{encoding:'utf8'}).match(/^Pages:\s+(\d+)/m)[1]);
 const row={path:p,sha256:hash(b),expectedSha256:source.sha256,exact:hash(b)===source.sha256,bytes:b.length,pages:pageCount};
 if(source.role==='fee_waiver_statement'){
  const d=await PDFDocument.load(b,{updateMetadata:false});
  statement=d;row.fields=d.getForm().getFields().map(f=>({name:f.getName(),widgets:f.acroField.getWidgets().map(w=>({page:d.getPages().findIndex(p=>p.node.Annots()?.asArray().some(a=>d.context.lookup(a)===w.dict))+1,rect:w.getRectangle()}))}));
 }
 result.sourceReadback.push(row);
}
const sourceField=n=>statement.getForm().getField(n);
const sampleFields=['Court Number / Número del Tribunal','Mailing  Dirección Postal','Day / Día','Month / Mes','Year / Año','My address is  Mi domicilio es','My date of birth / Mi fecha de nacimiento es','Choice 1'];
for(const [fixture,facts] of Object.entries(FIXTURES)){
 const p=`${dir}/fixtures/${fixture}.pdf`,bytes=fs.readFileSync(p),doc=await PDFDocument.load(bytes,{updateMetadata:false});
 const widgets=await flattenedWidgets(p), text=execFileSync('pdftotext',['-layout',p,'-'],{encoding:'utf8'}).split('\f');
 const row={fixture,sha256:hash(bytes),bytes:bytes.length,pages:doc.getPageCount(),remainingAcroFields:doc.getForm().getFields().length,heldFacts:facts,fieldReadback:[],nativeGroup10:[],allDeclaredTextWrites:[],refusedTextWithInk:[],orderAddedAppearanceCount:widgets.filter(w=>w.page>=8&&w.page<=10).length};
 for(const name of sampleFields)for(const widget of sourceField(name).acroField.getWidgets()){
  const sourcePage=statement.getPages().findIndex(p=>p.node.Annots()?.asArray().some(a=>statement.context.lookup(a)===widget.dict))+1,rect=widget.getRectangle(),page=sourcePage+10;
  const readback=drawnAt(widgets,{page,rect}).map(w=>w.text).join('');
  const m=read(`${raster}/${family}.verdict.json`).measurements.find(m=>m.kind===fixture&&m.page===page);
  const inset=name==='Choice 1'?12:5;
  const left=Math.round(m.paper.x0+rect.x*m.pxPerPt)+inset,top=Math.round(m.paper.y0+(792-rect.y-rect.height)*m.pxPerPt)+inset;
  const width=Math.max(1,Math.round(rect.width*m.pxPerPt)-inset*2),height=Math.max(1,Math.round(rect.height*m.pxPerPt)-inset*2);
  const {data,info}=await sharp(`${raster}/${m.png}`).extract({left,top,width,height}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let dark=0;for(let i=0;i<data.length;i+=info.channels)if(data[i]<200&&data[i+1]<200&&data[i+2]<200)dark++;
  row.fieldReadback.push({field:name,sourcePage,packetPage:page,rect,drawnText:readback,originalRasterInteriorDarkPixels:dark,interiorPixelRect:{left,top,width,height},pngSha256:m.pngSha256});
 }
 const placements=[];
 for(const [idx,page]of doc.getPages().entries()){
  const res=page.node.Resources()?.lookup(PDFName.of('XObject'));if(!res)continue;
  const contents=page.node.Contents(),refs=contents instanceof PDFArray?contents.asArray():contents?[contents]:[];
  const stream=refs.map(ref=>decode(doc.context.lookup(ref)).toString('latin1')).join('\n');
  for(const m of stream.matchAll(/q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/((?:NativeWidget|FlatWidget)-\d+)\s+Do/g)){
   let x=0,y=0;for(const cm of m[1].matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)){x+=+cm[5];y+=+cm[6]}
   const object=res.lookup(PDFName.of(m[2]));placements.push({page:idx+1,x,y,name:m[2],sha256:hash(Buffer.from(object.contents)),decoded:decode(object)});
  }
 }
 for(const [idx,w]of sourceField('Group10').acroField.getWidgets().entries()){
  const rect=w.getRectangle(),page=(idx<2?3:9)+10,ap=w.getNormalAppearance();
  const hits=placements.filter(p=>p.name.startsWith('NativeWidget')&&p.page===page&&Math.abs(p.x-rect.x)<.01&&Math.abs(p.y-rect.y)<.01);
  const state=idx===1?'Choice2':idx===2?'Choice3':'Off';const expected=hash(Buffer.from(ap.lookup(PDFName.of(state)).contents));
  row.nativeGroup10.push({widget:idx,page,rect,expectedState:state,expectedAppearanceSha256:expected,observedAppearanceSha256:hits.map(h=>h.sha256),exact:hits.length===1&&hits[0].sha256===expected});
 }
 row.statementSelectionReadback=[];
 for(const f of statement.getForm().getFields()){
  if(f.getName()==='Group10'||!['PDFRadioGroup','PDFCheckBox'].includes(f.constructor.name))continue;
  for(const [idx,w]of f.acroField.getWidgets().entries()){
   const rect=w.getRectangle(),sp=statement.getPages().findIndex(p=>p.node.Annots()?.asArray().some(a=>statement.context.lookup(a)===w.dict))+1;
   const ap=w.getNormalAppearance(),off=decode(ap.lookup(PDFName.of('Off'))),states=ap.keys().filter(k=>k.decodeText()!=='Off');
   const marks=states.map(k=>decode(ap.lookup(k))).filter(b=>b.subarray(0,off.length).equals(off)).map(b=>b.subarray(off.length));
   const hits=placements.filter(p=>p.name.startsWith('FlatWidget')&&p.page===sp+10&&Math.abs(p.x-rect.x)<.01&&Math.abs(p.y-rect.y)<.01);
   row.statementSelectionReadback.push({field:f.getName(),widget:idx,page:sp+10,markExtractable:marks.length===states.length,selectedSourceMarkPresent:hits.some(h=>marks.some(m=>h.decoded.includes(m)))});
  }
 }
 for(const component of map.maps){const offset=component.documentRole==='fee_waiver_statement'?10:0;
  for(const w of component.canonicalWrites){if(w.kind!=='acroform_text')continue;
   let expected=facts[w.factId];if(w.factId==='participant.date_of_birth'){const[y,m,d]=expected.split('-');expected=`${m}/${d}/${y}`}
   const actual=drawnAt(widgets,{page:w.page+offset,rect:w.rect}).map(w=>w.text).join('');row.allDeclaredTextWrites.push({field:w.fieldName,page:w.page+offset,expected,actual,exact:expected===actual});
  }
  for(const w of component.canonicalRefusals){if(!w.rect)continue;const actual=drawnAt(widgets,{page:w.page+offset,rect:w.rect}).map(w=>w.text).join('');if(actual)row.refusedTextWithInk.push({field:w.fieldName,page:w.page+offset,actual});}
 }
 row.relevantPageText=Object.fromEntries([4,6,11,12,13,19,20,21,22].map(n=>[n,text[n-1]]));
 result.fixtures.push(row);
}
fs.writeFileSync(`${out}/measurement.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({sources:result.sourceReadback.map(s=>({sha256:s.sha256,exact:s.exact,pages:s.pages,fields:s.fields?.length})),requiredBeforeFiling:result.requiredBeforeFiling,fixtures:result.fixtures.map(f=>({fixture:f.fixture,sha256:f.sha256,pages:f.pages,textWrites:f.allDeclaredTextWrites.length,textWriteMismatches:f.allDeclaredTextWrites.filter(w=>!w.exact),nativeExact:f.nativeGroup10.every(w=>w.exact),refusedTextWithInk:f.refusedTextWithInk,fieldReadback:f.fieldReadback}))},null,2));
