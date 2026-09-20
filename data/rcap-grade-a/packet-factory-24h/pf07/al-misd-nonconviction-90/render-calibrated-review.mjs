// Reproducible local review evidence. Central raster and independent approval
// remain separate gates; this script emits no acceptance verdict.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {rasterizePageCalibrated} from '../../../../../scripts/raster/pdf-page-raster.mjs';
import {resolveSources} from '../../../../../scripts/build-census-v1-al-misd-nonconviction-90-set.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp');
const stage=process.argv[2];if(!stage)throw new Error('Pass an explicit scratch directory.');
const family='data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(stage,{recursive:true});
const targets=[];
for(const source of resolveSources()){
 // The governed rasterizer embeds static page content and omits source
 // annotations. Preserve those exact bytes here; compare static content only
 // outside ALL source widgets. Inspect final flattened widget ink separately.
 const file=path.join(stage,'source-'+source.documentId+'.pdf');
 fs.writeFileSync(file,source.bytes);
 targets.push({fixture:'source',documentId:source.documentId,file,pages:source.pages,sourceSha256:source.sha256});
}
// test-final-packet-page-equivalence.mjs separately proves that these pages,
// including their complete resource graphs, survive final assembly exactly.
for(const fixture of ['canonical','boundary'])for(const source of resolveSources())targets.push({fixture,documentId:source.documentId,file:family+'/fixtures/'+fixture+'--'+source.documentId+'.pdf',pages:source.pages});
const rows=[];
for(const target of targets){
 const pdfSha256=sha(fs.readFileSync(target.file));
 for(let page=1;page<=target.pages;page++){
  const keep=path.join(stage,target.fixture,target.documentId,'page-'+page);
  const receipt=path.join(keep,'receipt.json');
  if(fs.existsSync(receipt)){
   const prior=JSON.parse(fs.readFileSync(receipt));
   if(prior.pdfSha256===pdfSha256&&fs.existsSync(prior.image)&&sha(fs.readFileSync(prior.image))===prior.imageSha256){rows.push(prior);continue;}
  }
  const failedAttempts=[];let render;
  for(let attempt=0;attempt<3;attempt++){
   try{render=await rasterizePageCalibrated({file:target.file,pageIndex:page-1,keep:attempt?path.join(keep,'retry-'+attempt):keep});break;}
   catch(error){
    failedAttempts.push({attempt:attempt+1,error:String(error.message),stage:attempt?path.join(keep,'retry-'+attempt):keep});
    fs.mkdirSync(keep,{recursive:true});fs.writeFileSync(path.join(keep,'failed-attempts.json'),JSON.stringify(failedAttempts,null,2)+'\n');
    if(attempt===2)throw error;
   }
  }
  const cropped=path.join(keep,'paper.png');
  await sharp(render.image).extract({left:render.paper.x0,top:render.paper.y0,width:render.paper.width,height:render.paper.height}).png().toFile(cropped);
  const row={fixture:target.fixture,documentId:target.documentId,page,pdfSha256,sourceSha256:target.sourceSha256??null,image:cropped,imageSha256:sha(fs.readFileSync(cropped)),paper:render.paper,pageWidth:render.pageWidth,pageHeight:render.pageHeight,pxPerPt:render.pxPerPt,pxPerPtVertical:render.pxPerPtVertical,calibrationResidualPx:render.calibrationResidualPx,failedAttempts};
  fs.writeFileSync(receipt,JSON.stringify(row,null,2)+'\n');rows.push(row);
  fs.writeFileSync(path.join(stage,'raster-results.json'),JSON.stringify({method:'scripts/raster/pdf-page-raster.mjs',centralAcceptance:false,sourceReferenceIncludesAnnotations:false,rows},null,2)+'\n');
  console.log(JSON.stringify({fixture:row.fixture,documentId:row.documentId,page,calibrationResidualPx:row.calibrationResidualPx,image:cropped,imageSha256:row.imageSha256}));
 }
}
