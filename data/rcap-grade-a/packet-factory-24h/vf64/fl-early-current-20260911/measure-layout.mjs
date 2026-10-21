import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PDFDocument,PDFArray,PDFRawStream} from 'pdf-lib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..');
const {extractPageGeometry}=await import(path.join(root,'scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs'));
const {FIXTURES,WRITE_LAYOUT,measureOverlay}=await import(path.join(root,'scripts/build-census-v1-fl-early-juvenile-set.mjs'));
const source=fs.readFileSync(path.join(root,'reference/source-recovery/2026-09-11-wave1/CODEX-CS2-SRC2__FL-EARLY-JUVENILE-SET__FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION__d9417ea382c9.pdf'));
const src=await PDFDocument.load(source); const g=extractPageGeometry(src.getPages()[2]);
const compact=({chars,...v})=>v;
const sourceFingerprint={captions:g.text.filter(t=>t.y>=615&&t.y<710&&t.text.trim()).map(compact),rules:g.paths.filter(t=>t.y>=615&&t.y<710)};
const targetRules={page3_last_name:[64.740012,214.860007,687.425],page3_first_name:[245.777997,387.557996,687.425],page3_middle_name:[425.121997,561.341998,687.425],page3_race:[75.840003,142.560004,615.425],page3_sex:[173.359999,198.38,615.425],page3_dob:[228.490002,281.310002,615.425]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const pageStreams=(doc,p)=>{const c=p.node.Contents();const a=c instanceof PDFArray?c.asArray():[c];return a.filter(Boolean).map(v=>doc.context.lookup(v)).filter(v=>v instanceof PDFRawStream).map(v=>hash(v.getContents()));};
const out={schemaVersion:'vf64-fl-early-source-region-measurement/v1',basis:'Actual held source paths and current stored PDF text; PDF parsing only, no generated PDF or raster.',sourceFingerprint,fixtures:[]};
for(const fixture of ['canonical','boundary']){
 const facts=FIXTURES[fixture];const bytes=fs.readFileSync(path.join(root,`data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/${fixture}.pdf`));
 const planned=WRITE_LAYOUT.map(p=>({...p,text:p.printedFormat==='last_comma_first_middle'?`${facts['participant.last_name']}, ${facts['participant.first_name']} ${facts['participant.middle_name']}`:facts[p.factId],heldValue:facts[p.factId],reformattedForPrintedCaption:Boolean(p.printedFormat)}));
 const measured=await measureOverlay(source,bytes,planned);const doc=await PDFDocument.load(bytes);
 out.fixtures.push({fixture,pdfSha256:hash(bytes),writesReadFromStoredBytes:measured.actualWrites.length,addedTextRuns:measured.addedTextRunsReadFromOutputBytes,addedGlyphs:measured.addedGlyphsReadFromOutputBytes,outsideDeclaredRegions:measured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,sourceWidgetAppearances:measured.widgetAppearancesReadFromSourceBytes,outputWidgetAppearances:measured.flattenedWidgetAppearancesReadFromOutputBytes,sourceContentStreamsPreserved:src.getPages().map((p,i)=>({page:i+1,source:pageStreams(src,p),output:pageStreams(doc,doc.getPages()[i]),allSourceStreamsPresent:pageStreams(src,p).every(h=>pageStreams(doc,doc.getPages()[i]).includes(h))})),writes:measured.actualWrites.map(w=>{const id=w.field.split('.').at(-1);const target=targetRules[id];return {...w,...(target?{actualSourceBlankRule:{x0:target[0],x1:target[1],y:target[2]},baselineAboveOwnRule:Number((w.measuredOrigin.y-target[2]).toFixed(3)),startsLeftOfOwnBlank:Number(Math.max(0,target[0]-w.measuredOrigin.x).toFixed(3)),entireValueLeftOfOwnBlank:w.measuredGlyphBounds.x1<target[0]}:{})};})});
}
console.log(JSON.stringify(out,null,2));
