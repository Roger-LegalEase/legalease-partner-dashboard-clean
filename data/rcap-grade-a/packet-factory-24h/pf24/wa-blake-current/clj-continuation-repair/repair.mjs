import fs from 'node:fs';
import path from 'node:path';
import {buildPacket,hash,ROOT} from '../../../../../../scripts/build-census-v1-wa-blake-current.mjs';
const base=path.join(ROOT,'data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill');
const evidence=path.dirname(new URL(import.meta.url).pathname);
const j=x=>JSON.stringify(x,null,2)+'\n';
const read=f=>JSON.parse(fs.readFileSync(path.join(base,f)));
const report=read('reports/rendered-artifacts.json'),map=read('production-field-map.json'),proof=read('reports/actual-writes.json');
for(const name of ['rendered-artifacts','actual-writes'])fs.copyFileSync(path.join(base,`reports/${name}.json`),path.join(evidence,`${name}.before.json`));
const before=Object.fromEntries(report.packets.map(p=>[p.fixture,hash(fs.readFileSync(path.join(base,p.file)))]));
for(const fixture of ['canonical','municipal-partial']) {
 const r=await buildPacket(read(`${fixture}.fixture.json`),fixture);
 fs.writeFileSync(path.join(base,'fixtures',`${fixture}.pdf`),r.packet.bytes);
 for(const c of r.parts)fs.writeFileSync(path.join(base,`${fixture}.${c.id}.pdf`),c.bytes);
 fs.writeFileSync(path.join(base,`${fixture}.coverage.json`),j(r.packet.coverage));
 map.writes=map.writes.filter(w=>w.fixture!==fixture).concat(r.rows.filter(w=>w.decision==='write'));
 map.refusals=map.refusals.filter(w=>w.fixture!==fixture).concat(r.rows.filter(w=>w.decision!=='write'));
 for(const key of ['packets','artifacts'])for(const p of report[key].filter(p=>p.fixture===fixture)){p.sha256=hash(r.packet.bytes);p.pageCount=r.packet.pages;}
 for(const d of proof.documents.filter(d=>d.fixture===fixture)) {
  const c=r.parts.find(c=>c.id===d.formNumber);d.actualWrites=(c?.mapped??[]).map(x=>({document:c.id,field:x.field,expected:x.value,factId:`${fixture}.${x.factId}`,page:x.page,rect:x.rect,fontSize:x.fontSize??null}));
 }
}
for(const a of report.artifacts) {
 a.addedGlyphsReadFromOutputBytes=null;
 a.flattenedWidgetAppearancesReadFromOutputBytes=null;
 a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=null;
 a.refusedFieldsWithInk=null;
 a.measurementScope='Pending independent source/output glyph and protected-ink measurement; builder write counts are not evidence of visible writes.';
}
proof.derivedFromArtifactBytes=false;proof.protectedFieldsUnwritten=null;proof.artifacts=report.artifacts;
proof.measurementScope='Expected write locations from the builder; independent output-byte confirmation pending.';
for(const [name,value]of [['reports/rendered-artifacts.json',report],['production-field-map.json',map],['reports/actual-writes.json',proof]])fs.writeFileSync(path.join(base,name),j(value));
const after=Object.fromEntries(report.packets.map(p=>[p.fixture,hash(fs.readFileSync(path.join(base,p.file)))]));
if(before.boundary!==after.boundary||before['superior-full']!==after['superior-full'])throw Error('UNRELATED_FIXTURE_CHANGED');
fs.writeFileSync(path.join(evidence,'repair-byte-delta.json'),j({familyId:'wa_blake_vacatur_and_lfo_refund-set',before,after,unchangedFixtures:['boundary','superior-full'],changedFixtures:['canonical','municipal-partial'],reason:'CLJ p3 continuation overlay moved from top201 to215 below printed Additional information label. Unmeasured evidence fields now null.'}));
console.log(j({before,after}));
