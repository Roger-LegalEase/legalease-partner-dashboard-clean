import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {assessWaSudCustomMapping, WA_SUD_FAMILY, WA_SUD_ROUTE, WA_SUD_DIRECTORY, WA_SUD_REVIEW} from './wa-sud-custom-mapping.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(root,p));
const json = p => JSON.parse(read(p));
const review = json(WA_SUD_REVIEW);
const input = {
  familyId: WA_SUD_FAMILY,
  routes: json('data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json').routes.filter(r=>r.routeKey===WA_SUD_ROUTE),
  executionReclassification: json('data/rcap-grade-a/legal-decisions/OWNER_CORRECTIONS_REQUIRED.json').executionReclassifications.find(r=>r.familyId===WA_SUD_FAMILY),
  legalResolution: {...json('data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json').decisions.find(r=>r.familyIds.includes(WA_SUD_FAMILY)), decisionRecord:'data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json'},
  independentReturn: {familyId:WA_SUD_FAMILY,evidencePath:WA_SUD_REVIEW,lane:review.lane,verdict:'PASS',verifiedAtBase:review.verifiedAtBase}
};
test('authenticates only custom2PDF20page mapping and keeps review/raster ungranted',()=>{
 const before=JSON.stringify(input);const result=assessWaSudCustomMapping(root,input);
 assert.equal(result.directory,WA_SUD_DIRECTORY); assert.equal(result.implementationStrategy,'custom_pleading');
 assert.equal(result.evidence.documents.length,2);assert.equal(result.evidence.documents.reduce((n,p)=>n+p.pageCount,0),20);
 assert.equal(result.completeness.measurementProvenance.customFieldsPerFixture,53);
 assert.equal(result.completeness.measurementProvenance.visualMeasuredIndependently,false);
 assert.equal(result.executionReclassification.stateOverride,null);
 assert.deepEqual(result.evidence.historicalMapping,input.executionReclassification);
 assert.equal(result.evidence.finalAcceptance,false);assert.equal(result.evidence.grantsCommercialAuthority,false);
 assert(result.routes[0].requiredSourceIds.every(s=>s.startsWith('component:wa-96060-6-')));
 assert.equal(JSON.stringify(input),before);
});
test('unrelated families are untouched without reading files',()=>{
 assert.equal(assessWaSudCustomMapping(root,{familyId:'ia-12346-set'},{readBytes:()=>{throw Error('read');}}),null);
});
for(const [label,mutate] of [
 ['conflicting treatment directory',i=>i.treatment={directory:'historical-official-overlay',implementationStrategy:'official_pdf_fill'}],
 ['changed route',i=>i.routes[0].routeKey+='-other'],
 ['changed treatment',i=>i.legalResolution.bindingProductRule+=' changed'],
 ['new owner restriction',i=>i.executionReclassification.stateOverride='LEGAL_BLOCKED'],
 ['absent selected semantic review',i=>i.independentReturn=null],
 ['changed selected verdict',i=>i.independentReturn.verdict='PASS_COMPLETE_INDEPENDENT'],
 ['changed selected base',i=>i.independentReturn.verifiedAtBase='0'.repeat(40)]
]) test(`refuses ${label}`,()=>{const x=structuredClone(input);mutate(x);assert.throws(()=>assessWaSudCustomMapping(root,x));});
for(const relative of [WA_SUD_REVIEW,`${WA_SUD_DIRECTORY}/fixtures/canonical.pdf`,`${WA_SUD_DIRECTORY}/source-receipt.json`,'data/rcap-grade-a/packet-factory-24h/pf24/wa-sud-subsection-2-6-authority-review-20260913.json']) {
 test(`refuses changed bytes ${relative}`,()=>assert.throws(()=>assessWaSudCustomMapping(root,input,{readBytes:p=>p===relative?Buffer.concat([read(p),Buffer.from(' ') ]):read(p)})));
}
test('refuses extra unreviewed fixture',()=>assert.throws(()=>assessWaSudCustomMapping(root,input,{fixtureNames:()=>['canonical.pdf','boundary.pdf','extra.pdf']})));
test('refuses unproven page count',()=>assert.throws(()=>assessWaSudCustomMapping(root,input,{pageCount:()=>9})));
test('refuses missing historical object rather than inventing ancestry',()=>assert.throws(()=>assessWaSudCustomMapping(root,input,{git:()=>{throw Error('missing object');}})));

for (const verdict of ['PASS_COMPLETE_INDEPENDENT','FAIL_REPAIR_REQUIRED']) test(`later ${verdict} retains vehicle, never overwrites selected verdict`,()=>{
 const x=structuredClone(input);const nextPath='data/rcap-grade-a/packet-factory-24h/test-only-wa-final.json';
 x.independentReturn={...x.independentReturn,evidencePath:nextPath,lane:'INDEPENDENT_FINAL',verdict,verifiedAtBase:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()};
 const next={laneKind:'independent-verification',lane:'INDEPENDENT_FINAL',rows:[{familyId:WA_SUD_FAMILY,verifiedAtBase:x.independentReturn.verifiedAtBase,verdict}]};
 const before=JSON.stringify(x);const mapped=assessWaSudCustomMapping(root,x,{readBytes:p=>p===nextPath?Buffer.from(JSON.stringify(next)):read(p)});
 assert.equal(mapped.directory,WA_SUD_DIRECTORY);assert.equal(JSON.stringify(x),before);assert.equal(mapped.evidence.finalAcceptance,false);
});
test('default custody reader rejects a symlink evidence file',()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'wa-sud-mapping-'));
 try {const target=path.join(temporary,WA_SUD_REVIEW);fs.mkdirSync(path.dirname(target),{recursive:true});fs.symlinkSync(path.join(root,WA_SUD_REVIEW),target);assert.throws(()=>assessWaSudCustomMapping(temporary,input),/symlink/);}
 finally {fs.rmSync(temporary,{recursive:true,force:true});}
});
