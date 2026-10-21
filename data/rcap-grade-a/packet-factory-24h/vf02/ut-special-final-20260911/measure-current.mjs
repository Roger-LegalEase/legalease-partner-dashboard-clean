import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=process.cwd(), req=createRequire(path.join(root,'package.json'));
const {PDFDocument}=req('pdf-lib');
const {extractTextItems}=await import(pathToFileURL(path.join(root,'scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs')));
const {resolveExactSources,specialCertificateStageGate,FAMILY_ID}=await import(pathToFileURL(path.join(root,'scripts/build-census-v1-ut_pet_special_certificate-set.mjs')));
const out='data/rcap-grade-a/packet-factory-24h/vf02/ut-special-final-20260911';
const overlay='data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill';
const original='data/rcap-grade-a/packet-factory-24h/raster-runs/34629454670';
const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const digest=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const hashFile=(p)=>{const b=fs.readFileSync(p);return {path:p,sha256:digest(b),bytes:b.length}};
const save=(n,v)=>fs.writeFileSync(`${out}/${n}`,JSON.stringify(v,null,2)+'\n');
const sources=resolveExactSources();
const round=(n)=>Math.round(n*100)/100;
function glyphs(page){return extractTextItems(page).flatMap(t=>(t.chars??[]).map(c=>({x:round(c.x),y:round(t.y),w:round(c.w),c:c.c})));}
const key=g=>`${g.x}|${g.y}|${g.c}`;
const sourceDocs={};
for(const s of sources){const b=fs.readFileSync(s.path);const p=await PDFDocument.load(b,{ignoreEncryption:true,updateMetadata:false});sourceDocs[s.formNumber]=p;s.currentSha256=digest(b);s.currentByteLength=b.length;s.pageCount=p.getPageCount();s.liveFieldCount=p.getForm().getFields().length;}
const renders=read(`${overlay}/reports/rendered-artifacts.json`).artifacts;
const reported=read(`${overlay}/reports/actual-writes.json`).artifacts;
const pdfs=[];const observations=[];
for(const r of renders){const b=fs.readFileSync(r.file),pdf=await PDFDocument.load(b,{ignoreEncryption:true,updateMetadata:false});assert.equal(digest(b),r.sha256);assert.equal(b.length,r.byteLength);const added=[]; const missingSourceGlyphs=[];
 for(const pm of r.pageManifest){const source=sourceDocs[pm.formNumber].getPage(pm.sourcePage-1);const before=new Map();for(const g of glyphs(source))before.set(key(g),(before.get(key(g))??0)+1);for(const g of glyphs(pdf.getPage(pm.packetPage-1))){const n=before.get(key(g))??0;if(n)before.set(key(g),n-1);else added.push({...g,page:pm.packetPage});} for(const [glyphKey,count] of before)if(count&&/\S/.test(glyphKey.split('|').at(-1)))missingSourceGlyphs.push({packetPage:pm.packetPage,glyphKey,count});}
 const actual=reported.find(x=>x.fixture===r.fixture).actualWrites;
 const outsideAddedGlyphs=added.filter(g=>/\S/.test(g.c)&&!actual.some(w=>{const q=w.writeBox;return g.page===w.packetPage&&g.x>=q.x-3&&g.x+g.w<=q.x+q.width+3&&g.y>=q.y-4&&g.y<=q.y+q.height+4;}));
 const writes=actual.map(w=>{const q=w.writeBox;const gs=added.filter(g=>g.page===w.packetPage&&g.x>=q.x-3&&g.x+g.w<=q.x+q.width+3&&g.y>=q.y-4&&g.y<=q.y+q.height+4);const text=gs.map(g=>g.c).join('');const eq=text.replace(/\s/g,'')===w.textReadFromOutputBytes.replace(/\s/g,'');return {formNumber:w.formNumber,fieldId:w.fieldId,field:w.field,factId:w.factId,kind:w.kind,packetPage:w.packetPage,writeBox:q,readText:text,reportedText:w.textReadFromOutputBytes,valueEquality:eq,glyphCount:gs.filter(g=>/\S/.test(g.c)).length,glyphBounds:gs.length?{x0:Math.min(...gs.map(g=>g.x)),x1:Math.max(...gs.map(g=>g.x+g.w)),baselineY:[...new Set(gs.map(g=>g.y))]}:null};});
 pdfs.push({...hashFile(r.file),fixture:r.fixture,pageCount:pdf.getPageCount(),liveFieldCount:pdf.getForm().getFields().length,addedNonWhitespaceGlyphs:added.filter(g=>/\S/.test(g.c)).length,missingSourceGlyphs,outsideAddedGlyphs,writesMeasured:writes.length,writesMatching:writes.filter(w=>w.valueEquality).length,writes});
 if(missingSourceGlyphs.length||outsideAddedGlyphs.length)observations.push({fixture:r.fixture,missingSourceGlyphs,outsideAddedGlyphs});
 if(writes.some(w=>!w.valueEquality))observations.push({fixture:r.fixture,valueMismatches:writes.filter(w=>!w.valueEquality)});
}
const pins=read(`${original}/${FAMILY_ID}.PAGE_IMAGES_SHA256.json`);const sharp=req('sharp');const pngs=[];
for(const pin of pins){const p=`/tmp/rcap-original-34629454670/family-10275673600/${pin.member}`;const h=hashFile(p);assert.equal(h.sha256,pin.sha256);assert.equal(h.bytes,pin.bytes);const m=await sharp(p).metadata();pngs.push({...h,member:pin.member,width:m.width,height:m.height,originalManifestHashMatch:true});}
const archives=['/tmp/rcap-original-34629454670/family-10275673600.zip','/tmp/rcap-original-34629454670/canary-10275995190.zip'].map(hashFile);
const receipt=read(`${original}/${FAMILY_ID}.ORIGINAL_EVIDENCE_VERIFIED.json`);for(const a of archives){const exact=receipt.artifacts.find(x=>x.apiDigest===`sha256:${a.sha256}`);assert.ok(exact);a.originalDigestMatches=true;}
const census=read(`${overlay}/field-census.census-v1.json`),map=read(`${overlay}/production-field-map.json`);
const native=census.documents.map(d=>{const m=map.maps.find(x=>x.formNumber===d.formNumber);const blanks=d.fields.filter(x=>x.blankId),sels=d.fields.filter(x=>x.selectionId);const canon=new Set(m.canonicalWrites.map(x=>x.fieldId)),boundary=new Set(m.boundaryWrites.map(x=>x.fieldId)),refused=new Set(m.roleRefusals.map(x=>x.blankId));return {formNumber:d.formNumber,sourceSha256:d.sourceSha256,nativeTerminals:d.fields.length,blanks:blanks.length,selections:sels.length,declaredTerminals:d.fieldCount,unclassifiedNativeBlankIds:blanks.filter(x=>!canon.has(x.blankId)&&!boundary.has(x.blankId)&&!refused.has(x.blankId)).map(x=>x.blankId),selectionDispositions:m.selectionControls.length,canonicalTextWrites:m.canonicalWrites.length,boundaryTextWrites:m.boundaryWrites.length,blankDispositionCounts:m.roleRefusals.reduce((a,x)=>(a[x.approvedBlankDisposition]=(a[x.approvedBlankDisposition]??0)+1,a),{})};});

const authorityBindings=read('data/rcap-grade-a/packet-factory-24h/vf62/ut-special-final-20260911/authority-bindings.json').map(a=>({...hashFile(a.path),id:a.id,previousSha256:a.sha256,unchanged:digest(fs.readFileSync(a.path))===a.sha256}));
const boundFiles=[`${overlay}/source-receipt.json`,`${overlay}/field-census.census-v1.json`,`${overlay}/production-field-map.json`,`${overlay}/packet-set-manifest.json`,`${overlay}/participant-instructions.md`,`${overlay}/reports/actual-writes.json`,`${overlay}/reports/rendered-artifacts.json`,'scripts/build-census-v1-ut_pet_special_certificate-set.mjs','scripts/build-census-v1-ut_pet_acquittal-set.mjs','scripts/rcap-packet-recovery/ut-special-certificate-repair.test.mjs','scripts/lib/ut-special-certificate-stage-gate.test.mjs',`${original}/${FAMILY_ID}.verdict.json`,`${original}/${FAMILY_ID}.ORIGINAL_EVIDENCE_VERIFIED.json`,`${original}/${FAMILY_ID}.PAGE_IMAGES_SHA256.json`].map(hashFile);
save('current-measurements.json',{familyId:FAMILY_ID,method:'Read-only exact-source glyph subtraction; extractor reused from previous independent review, all measurements run on current bytes. No render or PDF save.',sources,pdfs,native,totalNativeTerminals:native.reduce((a,x)=>a+x.nativeTerminals,0),observations,boundFiles});
save('authority-bindings.json',authorityBindings);
save('original-bindings.json',{familyId:FAMILY_ID,runId:'34629454670',packetCommitSha:'4abaf4f7dc9e7c9be6d9b0e1c053da401942cf15',originalReceiptPath:`${original}/${FAMILY_ID}.verdict.json`,archives,pngs,all33OriginalBodiesVerified:pngs.length===33,currentPdfHashMatches:renders.map(x=>({fixture:x.fixture,sha256:x.sha256}))});
console.log(JSON.stringify({sources:sources.length,pdfs:pdfs.map(x=>({fixture:x.fixture,writes:x.writesMeasured,matching:x.writesMatching,pages:x.pageCount})),nativeTerminals:native.reduce((a,x)=>a+x.nativeTerminals,0),unclassified:native.flatMap(x=>x.unclassifiedNativeBlankIds),pngs:pngs.length,authorities:authorityBindings.map(a=>({id:a.id,unchanged:a.unchanged})),observations}));
