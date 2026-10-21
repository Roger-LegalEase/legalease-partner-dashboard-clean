import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveSources, censusFlat, measuredCourtControls, OUT } from '../build-census-v1-wi_exp_cr266-set.mjs';
const read = name => JSON.parse(fs.readFileSync(path.join(OUT, name)));
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2)+'\n');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const artifacts = read('reports/rendered-artifacts.json');
const pdfs = fs.readdirSync(path.join(OUT,'fixtures')).filter(f=>f.endsWith('.pdf')).map(f=>path.join(OUT,'fixtures',f));
const before = Object.fromEntries(pdfs.map(f=>[f,sha(f)]));
for (const a of artifacts.artifacts) assert.equal(before[a.file ?? a.path],a.sha256,'Current packet differs from bound rendered-artifact record');
const {resolved, failures}=resolveSources();assert.deepEqual(failures,[]);
const measured = new Map();
for (const source of resolved) {
 const census=await censusFlat(source);
 assert.equal(census.strokedCheckboxCount,source.formNumber==='CR-267'?8:0);
 measured.set(source.formNumber,{source,census,controls:measuredCourtControls(source.formNumber,census)});
}
const census=read('field-census.census-v1.json');
for(const d of census.documents){const m=measured.get(d.formNumber);assert.equal(d.sourceSha256,m.source.sha256);d.strokedTickBoxesOnTheForm=m.census.strokedCheckboxCount;d.measuredCourtSelectionControls=m.controls;d.printedSelectionControlsNotMeasured=[];}
write('field-census.census-v1.json',census);
const map=read('production-field-map.json');
for(const d of map.maps){const m=measured.get(d.formNumber);d.selectionControlsOnThisDocument.strokedCheckBoxPaths=m.census.strokedCheckboxCount;d.selectionControlsOnThisDocument.measuredCourtSelectionControls=m.controls;d.selectionControlsOnThisDocument.printedSelectionControlsNotMeasured=[];if(d.formNumber==='CR-267')d.selectionControlsOnThisDocument.note='CR-267 has eight stroked checkbox squares measured from decoded source streams. All are court-owned findings or order choices; ownership, not absence of geometry, requires leaving them blank.';}
write('production-field-map.json',map);
const blanks=read('reports/blanks-left-for-the-participant.json');blanks.handMarkedControls=[...measured.values()].flatMap(m=>m.controls);blanks.handMarkedControlsNote='All eight CR-267 controls are measured from decoded source streams and are court-owned findings or order choices. The participant must leave them blank.';write('reports/blanks-left-for-the-participant.json',blanks);
const findings=read('build-findings.json');findings.findings[0].finding="The owner's action asks for established discharge facts to be mapped to exact CR-266 selections. CR-266 has none: zero AcroForm fields, annotations and decoded stroked checkbox paths. CR-267 has eight measured court-owned checkbox squares. CR-266's only symbol glyphs are three SymbolMT marks mapped to U+F0B7, the Symbol bullet, heading the three-item list under paragraph 1.";write('build-findings.json',findings);
assert.deepEqual(Object.fromEntries(pdfs.map(f=>[f,sha(f)])),before,'Metadata correction changed a PDF');
console.log(JSON.stringify({familyId:'wi_exp_cr266-set',correction:'Decode page streams before checkbox census; preserve court ownership and every current PDF byte',sources:[...measured.values()].map(m=>({form:m.source.formNumber,sha256:m.source.sha256,measuredBoxes:m.census.strokedCheckboxCount,controls:m.controls})),unchangedPdfs:before},null,2));
