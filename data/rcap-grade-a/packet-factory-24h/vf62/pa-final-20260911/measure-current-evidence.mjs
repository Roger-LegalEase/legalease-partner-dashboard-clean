#!/usr/bin/env node
// Independent acceptance evidence only. Reads PDFs and original GHA PNGs;
// never renders, rebuilds, edits packet files, or rewrites original receipts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const {PDFDocument}=require('pdf-lib');
const sharp=require('sharp');
const OUT=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(OUT,'../../../../..');
assert.equal(process.cwd(),ROOT,'Run only from the assigned checkout');
const read=p=>JSON.parse(fs.readFileSync(path.isAbsolute(p)?p:path.join(ROOT,p),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceRoot=path.join(ROOT,'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
const normal=s=>s.replace(/\s+/g,' ').trim();
function wordsFor(file){
 const xml=execFileSync('pdftotext',['-bbox',file,'-'],{encoding:'utf8',maxBuffer:16*1024*1024});
 return [...xml.matchAll(/<page width="([^"]+)" height="([^"]+)">([\s\S]*?)<\/page>/g)].map(m=>({width:+m[1],height:+m[2],words:[...m[3].matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([\s\S]*?)<\/word>/g)].map(w=>({box:w.slice(1,5).map(Number),text:decode(w[5])}))}));
}
function wordGroups(words,expected){
 // Poppler interleaves source underscore rules with text written above them.
 // Those retained rules are page art, not words in the participant's value.
 words=words.filter(w=>!/^[_ .]+$/.test(w.text));
 const need=normal(expected).split(' '),found=[];
 for(let i=0;i<words.length;i++)if(need.every((word,j)=>words[i+j]?.text===word))found.push(words.slice(i,i+need.length));
 return found;
}
const families=[];
for(const [state,key,familyId,run] of [
 ['pa','pa-6308-underage-set','pa_6308_underage-set','34627159438'],
]){
 const directory=`data/rcap-all50/overlays/census-v1/${state}/${key}--official-pdf-fill`;
 const receiptPath=`/tmp/rcap-original-${run}/family-10275441234/${familyId}.verdict.json`;
 const receipt=read(receiptPath),source=read(`${directory}/source-receipt.json`),map=read(`${directory}/production-field-map.json`),writes=read(`${directory}/reports/actual-writes.json`),rendered=read(`${directory}/reports/rendered-artifacts.json`);
 const originalRoot='/tmp/rcap-original-34627159438/family-10275441234';
 const zipBytes=fs.readFileSync('/tmp/rcap-original-34627159438/family-10275441234.zip');
 const metadata=read('/tmp/rcap-original-34627159438/run-artifacts.json');
 const artifactRows=metadata.artifacts??metadata;
 assert.ok(artifactRows.some(x=>x.id===10275441234&&x.digest===`sha256:${sha(zipBytes)}`),'original archive differs from original artifact metadata');
 const priorFamily=read('data/rcap-grade-a/packet-factory-24h/vf62/pa-ri-current-20260911/current-evidence-measurements.json').families.find(x=>x.familyId===familyId);
 const sourceIdentities=[];
 for(const d of source.documents){
  const file=path.join(sourceRoot,d.pathInArchive),bytes=fs.readFileSync(file),pdf=await PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
  assert.equal(sha(bytes),d.sha256);assert.equal(bytes.length,d.byteLength);assert.equal(pdf.getPageCount(),d.pageCount);
  sourceIdentities.push({documentId:d.documentId,pathInArchive:d.pathInArchive,sha256:sha(bytes),bytes:bytes.length,pages:pdf.getPageCount(),fieldCount:pdf.getForm().getFields().length});
 }
 const artifacts=[],pages=[];
 for(const d of receipt.documentsRendered){
  const file=path.join(ROOT,d.path),bytes=fs.readFileSync(file),pdf=await PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
  assert.equal(sha(bytes),d.pinned);
  const manifest=rendered.pdfs.find(a=>a.file===d.path),actual=writes.artifacts.find(a=>a.file===d.path),documentMap=map.documents.find(a=>a.documentId===manifest.documentId);
  assert.equal(sha(bytes),manifest.sha256);assert.equal(bytes.length,manifest.byteLength);assert.equal(pdf.getPageCount(),manifest.pageCount);
  const textPages=wordsFor(file),fieldReadings=[];
  assert.equal(textPages.length,pdf.getPageCount());
  const images=new Map();
  for(const m of receipt.measurements.filter(m=>m.document===d.document)){
   const originalPng=path.join(originalRoot,m.png),png=fs.readFileSync(originalPng),meta=await sharp(png).metadata();
   assert.equal(sha(png),m.pngSha256);assert.equal(png.length,m.bytes);
   assert.equal(meta.width,2448);assert.equal(meta.height,3168);
   assert.equal(m.paper.width,2040);assert.equal(m.paper.height,2640);
   images.set(m.page,{m,raw:await sharp(png).removeAlpha().greyscale().raw().toBuffer(),width:meta.width});
   pages.push({document:d.document,page:m.page,png:m.png,pngSha256:sha(png),bytes:png.length,canvas:[meta.width,meta.height],paper:m.paper,pxPerPt:m.pxPerPt,calibrationResidualPx:m.calibrationResidualPx});
  }
  const reuse=priorFamily.artifacts.find(a=>a.file===d.path&&a.sha256===sha(bytes));
  if(reuse){fieldReadings.push(...reuse.fieldReadings.map(r=>({...r,reviewMode:'REUSED_EXACT_UNCHANGED_CERTIFICATE_APPROVAL'})));}
  for(const w of reuse?[]:actual.written){
   const expected=actual.proof.writtenProof.find(x=>x.field===w.field).expectedValue;
   const field=documentMap.fields.find(x=>x.field===w.field);
   const widgets=w.widgets??field.widgets??[];
   const measured=[];
   if(widgets.length){
    for(const widget of widgets){
     const page=textPages[widget.page-1],r=widget.rect;
     const box=[r.x,page.height-r.y-r.height,r.x+r.width,page.height-r.y];
     const groups=wordGroups(page.words,expected);
     const group=groups.find(g=>g.every(w=>{const cx=(w.box[0]+w.box[2])/2,cy=(w.box[1]+w.box[3])/2;return cx>=box[0]-1&&cx<=box[2]+1&&cy>=box[1]-1&&cy<=box[3]+1;}));
     assert.ok(group,`${d.document} ${w.field} page ${widget.page}: expected value absent at its widget`);
     const image=images.get(widget.page),pixelWords=[];
     for(const word of group){
      const [x0,y0,x1,y1]=word.box.map((v,i)=>Math.round(v*image.m.pxPerPt+(i%2===0?image.m.paper.x0:image.m.paper.y0)));
      let dark=0;
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(image.raw[y*image.width+x]<128)dark++;
      assert.ok(dark>0,`${d.document} ${w.field}: no dark pixels at ${word.text}`);
      pixelWords.push({text:word.text,pdfBoxPt:word.box,pngBoxPx:[x0,y0,x1,y1],darkPixelsBelow128:dark});
     }
     measured.push({page:widget.page,sourceWidgetPt:box,readBack:group.map(w=>w.text).join(' '),pixelWords});
    }
   }else{
    const groups=wordGroups(textPages[0].words,expected);assert.ok(groups.length,`${d.document} composed ${w.field} absent`);
    measured.push({page:1,readBack:expected,occurrences:groups.length,composedPageVisuallyInspected:false});
   }
   fieldReadings.push({field:w.field,factId:w.factId,expectedValue:expected,measured});
  }
  artifacts.push({file:d.path,documentId:manifest.documentId,fixture:d.role,sha256:sha(bytes),bytes:bytes.length,pages:pdf.getPageCount(),fieldReadings});
 }
 assert.equal(pages.length,receipt.pagesMeasured);
 families.push({familyId,directory,runId:run,packetCommitSha:receipt.packetCommitSha,receipt:receiptPath,documentsDigest:receipt.documentsDigest,originalArtifactZipSha256:sha(zipBytes),sourceIdentities,artifacts,pages});
}
fs.writeFileSync(path.join(OUT,'current-evidence-measurements.json'),JSON.stringify({schemaVersion:'vf62-current-evidence-measurements/v1',reviewer:'/root/ky_current_independent',baseSha:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),method:'SHA-256 and lengths recomputed; PDF-lib parses page and field counts; Poppler pdftotext -bbox independently reads every declared write at its source widget; original GHA PNG pixels are read at the calibrated paper origin and scale for all changed official-form writes. Two hash-identical certificate approvals are reused from the named prior review without redundant visual review. No rendering. Pixel presence is corroborated by full-page human/model visual review, not treated alone as proof of text readability.',families},null,2)+'\n');
console.log(JSON.stringify(families.map(f=>({familyId:f.familyId,documents:f.artifacts.length,pages:f.pages.length,sourceCount:f.sourceIdentities.length,fieldReadings:f.artifacts.reduce((n,a)=>n+a.fieldReadings.length,0),result:'CURRENT_BYTES_AND_ORIGINAL_IMAGES_BOUND; DECLARED_WRITES_READ_BACK'})),null,2));
