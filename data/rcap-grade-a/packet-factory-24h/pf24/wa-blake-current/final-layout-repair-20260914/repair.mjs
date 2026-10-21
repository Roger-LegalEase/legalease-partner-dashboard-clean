import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {PDFDocument} from 'pdf-lib';
import {buildPacket,hash,ROOT} from '../../../../../../scripts/build-census-v1-wa-blake-current.mjs';
import {stampDeterministic} from '../../../../../../scripts/rcap-official-forms/rcap-deterministic-pdf-date.mjs';
const base=path.join(ROOT,'data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill');
const evidence=path.dirname(new URL(import.meta.url).pathname),preserve=path.join(ROOT,'private/transfers/wa-final-layout-repair-20260914');fs.mkdirSync(preserve,{recursive:true});
const j=x=>JSON.stringify(x,null,2)+'\n',read=f=>JSON.parse(fs.readFileSync(path.join(base,f)));
const report=read('reports/rendered-artifacts.json'),map=read('production-field-map.json');
const before={};for(const p of report.packets){before[p.file]=hash(fs.readFileSync(path.join(base,p.file)));for(const c of read(`${p.fixture}.coverage.json`)){const f=`${p.fixture}.${c.documentId}.pdf`;before[f]=hash(fs.readFileSync(path.join(base,f)));}}
for(const name of ['reports/rendered-artifacts.json','reports/actual-writes.json','production-field-map.json','reports/completeness-counters.json'])if(fs.existsSync(path.join(base,name)))fs.copyFileSync(path.join(base,name),path.join(evidence,path.basename(name)+'.before.json'));
const changes=[];
for(const [fixture,form]of [['municipal-partial','BLAKE-006'],['superior-full','BLAKE-001']]){
 const oldPath=`${fixture}.${form}.pdf`,old=fs.readFileSync(path.join(base,oldPath));fs.writeFileSync(path.join(preserve,oldPath),old);fs.copyFileSync(path.join(base,'fixtures',fixture+'.pdf'),path.join(preserve,fixture+'.packet.pdf'));
 const result=await buildPacket(read(`${fixture}.fixture.json`),fixture),part=result.parts.find(c=>c.id===form);assert(part);
 fs.writeFileSync(path.join(base,oldPath),part.bytes);
 const coverage=read(`${fixture}.coverage.json`);for(const c of coverage)if(c.documentId===form)c.sha256=hash(part.bytes);
 const doc=stampDeterministic(await PDFDocument.create());for(const c of coverage){const pdf=await PDFDocument.load(fs.readFileSync(path.join(base,`${fixture}.${c.documentId}.pdf`)),{updateMetadata:false});for(const p of await doc.copyPages(pdf,pdf.getPageIndices()))doc.addPage(p);}
 const bytes=await doc.save({useObjectStreams:false});fs.writeFileSync(path.join(base,'fixtures',fixture+'.pdf'),bytes);fs.writeFileSync(path.join(base,`${fixture}.coverage.json`),j(coverage));
 for(const key of ['packets','artifacts'])for(const p of report[key].filter(p=>p.fixture===fixture)){p.sha256=hash(bytes);p.pageCount=doc.getPageCount();if(Object.hasOwn(p,'byteLength'))p.byteLength=bytes.length;}
 map.writes=map.writes.filter(w=>!(w.fixture===fixture&&w.documentId===`${fixture}/${form}`)).concat(result.rows.filter(w=>w.decision==='write'&&w.documentId===`${fixture}/${form}`));
 map.refusals=map.refusals.filter(w=>!(w.fixture===fixture&&w.documentId===`${fixture}/${form}`)).concat(result.rows.filter(w=>w.decision!=='write'&&w.documentId===`${fixture}/${form}`));
 changes.push({fixture,form,before:hash(old),after:hash(part.bytes),packetSha256:hash(bytes),pageCount:doc.getPageCount()});
}
for(const a of report.artifacts.filter(a=>['municipal-partial','superior-full'].includes(a.fixture))){a.addedGlyphsReadFromOutputBytes=null;a.flattenedWidgetAppearancesReadFromOutputBytes=null;a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=null;a.refusedFieldsWithInk=null;a.measurementScope='Changed current bytes require independent measurement and raster reread; prior measurements preserved in repair evidence.';}
fs.writeFileSync(path.join(base,'reports/rendered-artifacts.json'),j(report));fs.writeFileSync(path.join(base,'production-field-map.json'),j(map));
const changed=Object.entries(before).filter(([p,h])=>hash(fs.readFileSync(path.join(base,p)))!==h).map(([p])=>p).sort();assert.deepEqual(changed,['fixtures/municipal-partial.pdf','fixtures/superior-full.pdf','municipal-partial.BLAKE-006.pdf','superior-full.BLAKE-001.pdf']);
fs.writeFileSync(path.join(evidence,'repair-byte-delta.json'),j({familyId:'wa_blake_vacatur_and_lfo_refund-set',changes,changedPaths:changed,unchangedPaths:Object.keys(before).filter(p=>!changed.includes(p)),before,oldBytesPreservedIn:path.relative(ROOT,preserve),reasons:['BLAKE006 municipal plaintiff city starts211 after source of ends205.978.','BLAKE006 vacated count row top610 places glyphs within source data row614.667–646pt.','Re-render only superior-full BLAKE001 from current213 continuation position; old saved component was six points lower than the current map and builder. Boundary is already correct and retained byte-for-byte.'],independentMeasurementPending:true,visualReviewPending:true}));
console.log(j(changes));
