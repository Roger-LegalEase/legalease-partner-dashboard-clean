// Static-source fidelity comparison. Source annotations are omitted by the
// governed rasterizer; exclude every source widget and inspect its final ink
// independently. This comparison alone never grants a raster approval.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const stage=process.argv[2],partial=process.argv.includes('--partial');
if(!stage)throw new Error('Pass the explicit raster scratch directory.');
const rows=JSON.parse(fs.readFileSync(path.join(stage,'raster-results.json'))).rows;
if(!partial)assert.equal(rows.length,33,'All 11 source and 22 fixture pages must finish.');
const directory='data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill';
const census=JSON.parse(fs.readFileSync(directory+'/field-census.census-v1.json'));
const findings=[];
for(const row of rows.filter(r=>r.fixture!=='source')){
 const source=rows.find(r=>r.fixture==='source'&&r.documentId===row.documentId&&r.page===row.page);
 const a=await sharp(source.image).greyscale().raw().toBuffer({resolveWithObject:true});
 const b=await sharp(row.image).greyscale().raw().toBuffer({resolveWithObject:true});
 assert.equal(a.info.width,b.info.width);assert.equal(a.info.height,b.info.height);assert.equal(source.pxPerPt,row.pxPerPt);
 const mask=Buffer.alloc(a.data.length);let changedPixels=0;
 for(let i=0;i<mask.length;i++)if(Math.abs(a.data[i]-b.data[i])>20){mask[i]=255;changedPixels++;}
 const document=census.documents.find(d=>d.documentId===row.documentId),{width,height}=b.info;
 for(const field of document.fields)for(const widget of field.widgets){
  if(widget.page!==row.page)continue;
  const r=widget.rect,sx=row.pxPerPt,sy=row.pxPerPtVertical;
  const left=Math.max(0,Math.floor((r.x-1)*sx)),right=Math.min(width,Math.ceil((r.x+r.width+1)*sx));
  const top=Math.max(0,Math.floor(height-(r.y+r.height+1)*sy)),bottom=Math.min(height,Math.ceil(height-(r.y-1)*sy));
  for(let y=top;y<bottom;y++)mask.fill(0,y*width+left,y*width+right);
 }
 let residual=0;for(const pixel of mask)if(pixel)residual++;
 const finding={fixture:row.fixture,documentId:row.documentId,page:row.page,artifactSha256:row.pdfSha256,sourceSha256:source.pdfSha256,changedPixels,changedPixelsOutsideSourceWidgetsPlus1pt:residual};
 if(residual){finding.residualImage=path.join(stage,row.fixture+'-'+row.documentId+'-'+row.page+'-residual.png');await sharp(mask,{raw:{width,height,channels:1}}).png().toFile(finding.residualImage);}
 findings.push(finding);
}
const result={method:'Calibrated exact-source static content comparison outside all source widgets plus 1 point; grayscale difference threshold 20 of 255.',sourceReferenceIncludesAnnotations:false,pagesCompared:findings.length,pagesWithResidual:findings.filter(f=>f.changedPixelsOutsideSourceWidgetsPlus1pt>0).length,centralRasterAcceptance:false,partial,findings};
fs.writeFileSync(path.join(stage,partial?'partial-static-comparison.json':'static-source-comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pagesCompared:result.pagesCompared,pagesWithResidual:result.pagesWithResidual,partial}));
if(!partial){
 const inspection=path.join(stage,'inspection');fs.mkdirSync(inspection,{recursive:true});
 for(const fixture of ['canonical','boundary']){
  const pages=rows.filter(r=>r.fixture===fixture);
  for(let start=0;start<pages.length;start+=2){
   const chunk=pages.slice(start,start+2),composite=[];
   for(const [index,row]of chunk.entries()){
    composite.push({input:await sharp(row.image).resize({width:1000,height:1300,fit:'inside'}).png().toBuffer(),left:index*1000,top:30});
    const label=Buffer.from('<svg width="1000" height="30"><text x="10" y="20" font-size="16">'+fixture+' '+row.documentId+' page '+row.page+'</text></svg>');
    composite.push({input:label,left:index*1000,top:0});
   }
   await sharp({create:{width:1000*chunk.length,height:1340,channels:3,background:'white'}}).composite(composite).png().toFile(path.join(inspection,fixture+'-'+(start/2+1)+'.png'));
  }
 }
}
