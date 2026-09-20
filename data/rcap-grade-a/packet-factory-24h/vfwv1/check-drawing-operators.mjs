import fs from 'node:fs';import assert from 'node:assert/strict';import {PDFDocument,PDFArray,PDFRawStream,decodePDFRawStream} from 'pdf-lib';
const base='data/rcap-all50/overlays/census-v1/wv/wv-nc-diversion-deferred-set--official-pdf-fill';
const map=JSON.parse(fs.readFileSync(base+'/production-field-map.json'));const measurements=[];
for(const fixture of ['canonical','boundary']){const coverage=JSON.parse(fs.readFileSync(`${base}/${fixture}.coverage.json`));for(const c of coverage){const pdf=await PDFDocument.load(fs.readFileSync(`${base}/${fixture}.${c.documentId}.pdf`),{updateMetadata:false});for(const [i,page]of pdf.getPages().entries()){
 const contents=page.node.Contents();const refs=contents instanceof PDFArray?contents.asArray():[contents];let text='';for(const ref of refs){const stream=pdf.context.lookup(ref);assert.ok(stream instanceof PDFRawStream);text+=Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1')+'\n';}
 assert.ok(!/(?:^|\s)(?:Do|BI|re|c|v|y|f|f\*|B|B\*|b|b\*)(?=\s|$)/m.test(text),`Unexpected nontext graphics:${fixture}/${c.documentId}/${i+1}`);
 const lines=[...text.matchAll(/([-\d.]+) ([-\d.]+) m\s+([-\d.]+) ([-\d.]+) l/g)].map(m=>m.slice(1).map(Number));
 const blanks=map.refusals.filter(r=>r.fixture===fixture&&r.document===c.documentId&&r.page===i+1);
 assert.equal(lines.length,blanks.length,'Unexpected drawing path count');
 for(const [x0,y0,x1,y1]of lines){assert.equal(x0,54);assert.equal(x1,558);assert.equal(y0,y1);assert.ok(blanks.some(b=>Math.abs(b.rect[1]-1-y0)<.001),'Line is not the lower boundary of a declared blank');}
 measurements.push({fixture,document:c.documentId,page:i+1,horizontalBlankBoundaryLines:lines.length,otherNontextPaintingOperators:0});
}}}
fs.writeFileSync(new URL('./drawing-operator-evidence.json',import.meta.url),JSON.stringify({familyId:'wv_nc_diversion_deferred-set',reviewer:'/root/nc_build',measurements,protectedFieldEvidence:'Only horizontal lines one point below declared protected blank rectangles; no image, fill or curve painting in current composed components.'},null,2)+'\n');console.log(JSON.stringify({pages:measurements.length,blankBoundaryLines:measurements.reduce((n,m)=>n+m.horizontalBlankBoundaryLines,0)}));
