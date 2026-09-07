#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {applyNvSpecialRoutes, SPECIAL_ROUTES, CORRECTION} from './nv-special-routes.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
const builder='scripts/build-census-v1-rcap-nv-custom-pleading.mjs';
const source=fs.readFileSync(builder,'utf8');
const start=source.indexOf('const SPEC = ')+13;
const end=source.indexOf('\n};',start)+2;
assert.ok(start>=13 && end>start,'SPEC boundaries not found');
const original=JSON.parse(source.slice(start,end));
const current=applyNvSpecialRoutes(structuredClone(original));
const specialKeys=new Set(Object.values(SPECIAL_ROUTES).map(x=>x.routeKey));
const out=current.outDir;
const read=p=>JSON.parse(fs.readFileSync(path.join(out,p),'utf8'));
const normalize=s=>s.replace(/\s+/g,' ').trim();
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
let passed=0;const results=[];
function test(name,fn){fn();passed++;results.push({name,status:'PASS'});console.log('PASS '+name);}
function group(spec,track){return spec.components.filter(c=>c.routeKey===SPECIAL_ROUTES[track].routeKey);}
function validate(spec){
 assert.equal(spec.components.length,28);
 assert.deepEqual(spec.routes,original.routes);
 assert.deepEqual(spec.components.filter(x=>!specialKeys.has(x.routeKey)),original.components.filter(x=>!specialKeys.has(x.routeKey)));
 for(const track of Object.keys(SPECIAL_ROUTES)){
  const components=group(spec,track);assert.equal(components.length,4);
  assert.deepEqual(components.map(c=>c.role),['primary_filing','proposed_order','declaration_and_verification','filing_instructions']);
  const primary=components[0], guide=components[3]; const text=guide.body.join('\n');
  assert.match(text,/No court or agency of criminal justice may charge a fee/);
  assert.match(text,/directly to the clerk of a court in which you were convicted/);
  assert.doesNotMatch(components.map(c=>c.body.join('\n')).join('\n'),/it carries a fee|only file.*after the DA stipulates|must obtain prosecutor consent/i);
  assert.ok(primary.blanks.some(x=>x.id==='signature' && x.kind==='protected'));
  assert.ok(primary.blanks.some(x=>x.id==='signature_date' && x.kind==='protected'));
  assert.ok(primary.blanks.some(x=>x.id==='case_number' && x.kind==='rbf'));
  assert.equal(primary.writes.length,5);
  assert.ok(primary.writes.every(x=>/^participant\.(full_legal_name|date_of_birth|street_address|phone|email)$/.test(x.factId)));
  assert.match(text,/self-help|SELF-HELP/);
  if(track==='nv_seal_decrim'){
   assert.match(text,/10 judicial days after receipt/);
   assert.match(text,/The court sends written notice/);
   assert.match(text,/traffic offenses/i);
   assert.match(text,/NRS 179\.271\(2\)/);
   assert.match(primary.body.join('\n'),/Act, referendum or initiative and effective date/);
  } else {
   assert.match(text,/automatic sealing/i);
   assert.match(text,/Proof of the pardon is a required attachment/);
   assert.match(text,/NRS 179\.273\(3\) expressly excludes/);
   assert.match(text,/NRS 179\.273\(5\)/);
   assert.match(text,/conditional or ambiguous pardon goes to legal review/);
   assert.doesNotMatch(components[1].body.join('\n'),/NRS 179\.285|NRS 213/);
  }
 }
 assert.ok(spec.records.some(x=>x.path===CORRECTION));
}

test('scoped specification satisfies both distinct statutory procedures',()=>validate(current));
test('other four route components and all six route keys remain unchanged',()=>{
 assert.deepEqual(current.components.filter(x=>!specialKeys.has(x.routeKey)),original.components.filter(x=>!specialKeys.has(x.routeKey)));
 assert.deepEqual(current.routes,original.routes);
});
test('wrong family and wrong route cardinality refuse',()=>{
 assert.throws(()=>applyNvSpecialRoutes({...structuredClone(original),familyId:'other'}));
 const bad=structuredClone(original);bad.routes.pop();assert.throws(()=>applyNvSpecialRoutes(bad));
});
test('missing or interleaved components refuse instead of replacing neighboring routes',()=>{
 const missing=structuredClone(original);missing.components.shift();assert.throws(()=>applyNvSpecialRoutes(missing));
 const interleaved=structuredClone(original);[interleaved.components[1],interleaved.components[6]]=[interleaved.components[6],interleaved.components[1]];
 assert.throws(()=>applyNvSpecialRoutes(interleaved));
});
test('second application refuses instead of duplicating the correction',()=>assert.throws(()=>applyNvSpecialRoutes(structuredClone(current))));
test('the real builder applies the correction before reading OUT and composing PDFs',()=>{
 assert.match(source,/import \{ applyNvSpecialRoutes \} from/);
 assert.match(source,/renderComposedPdf\(body, COMPONENT\[componentId\]\.title, COMPONENT\[componentId\]\.pageBreakBefore/);
 assert.ok(source.indexOf('applyNvSpecialRoutes(SPEC);')<source.indexOf('const OUT = SPEC.outDir'));
});
const manifest=read('reports/rendered-artifacts.json');
const map=read('production-field-map.json');
const writes=read('reports/actual-writes.json');
const receipt=read('source-receipt.json');
const approve=read('approval-request.json');
const pagesByFixture=new Map();
for(const fixture of ['canonical','boundary']){
 const artifact=manifest.artifacts.find(x=>x.fixture===fixture);assert.ok(artifact);
 const bytes=fs.readFileSync(artifact.file);
 test(`${fixture}: saved PDF identity and all 28 component bindings agree`,()=>{
  assert.equal(hash(bytes),artifact.sha256);assert.equal(bytes.length,artifact.byteLength);
  assert.ok(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
  assert.deepEqual(manifest.componentSet,current.components.map(c=>c.id));
  assert.deepEqual(map.componentSet,manifest.componentSet);
  assert.equal(new Set(artifact.pageManifest.map(x=>x.documentId)).size,28);
 });
 const extracted=spawnSync('pdftotext',['-layout',artifact.file,'-'],{encoding:'utf8',maxBuffer:8*1024*1024});
 assert.ifError(extracted.error);assert.equal(extracted.status,0,extracted.stderr);
 const pages=extracted.stdout.split('\f').filter((p,i,a)=>!(i===a.length-1 && !p.trim()));
 assert.equal(pages.length,artifact.pageCount);pagesByFixture.set(fixture,{artifact,pages});
 for(const [track,rule] of Object.entries(SPECIAL_ROUTES)){
  const text=normalize(artifact.pageManifest.filter(x=>x.documentId.startsWith(track+'-')).map(x=>pages[x.packetPage-1]).join('\n'));
  test(`${fixture} ${track}: actual emitted pages contain the no-fee court-first procedure`,()=>{
   assert.match(text,/No court or agency of criminal justice may charge a fee/);
   assert.match(text,/directly to the clerk of a court in which you were convicted/);
   assert.doesNotMatch(text,/it carries a fee|must obtain prosecutor consent/i);
   assert.ok(!artifact.documents.includes(track+'-stipulation-5'));
   if(track==='nv_seal_decrim') {assert.match(text,/10 judicial days after receipt/);assert.match(text,/Traffic offenses are excluded/);}
   else {assert.match(text,/proof of the pardon/i);assert.match(text,/expressly excludes prosecuting-attorney or criminal-justice-agency review/);}
  });
  const primaryPages=artifact.pageManifest.filter(x=>x.documentId===track+'-primary-filing-2').map(x=>pages[x.packetPage-1]).join('\n');
  test(`${fixture} ${track}: execution and case facts stay blank`,()=>{
   assert.match(primaryPages,/Petitioner signature:\s*\.{10,}/);
   assert.match(primaryPages,/Date actually signed:\s*\.{10,}/);
   assert.match(primaryPages,/Existing case number:\s*\.{10,}/);
   if(track==='nv_seal_pardon') assert.match(primaryPages,/Proof of pardon attached:\s*\.{10,}/);
  });
 }
 test(`${fixture}: every reported write is independently found on its own component pages`,()=>{
  const doc=writes.documents.find(x=>x.fixture===fixture);assert.equal(doc.actualWrites.length,76);
  assert.deepEqual(doc.refusedFieldsWithInk,[]);
  for(const item of doc.actualWrites){
   const text=normalize(artifact.pageManifest.filter(x=>x.documentId===item.document).map(x=>pages[x.packetPage-1]).join(' '));
   assert.ok(text.includes(normalize(item.expected)),item.field);
  }
 });
}
test('the correction record is bound by actual SHA256 in the source receipt',()=>{
 const rec=receipt.committedRecords.find(x=>x.pathInRepository===CORRECTION);assert.ok(rec);
 assert.equal(rec.sha256,hash(fs.readFileSync(CORRECTION)));
});
test('all nine machine completeness counters remain zero without approval',()=>{
 const counters=read('reports/completeness-counters.json');assert.equal(Object.keys(counters.counters).length,9);
 assert.ok(Object.values(counters.counters).every(n=>n===0));
 assert.equal(approve.approvedForLive,false);assert.equal(approve.live,false);assert.equal(approve.commercialRoutesOpened,0);
 const correction=JSON.parse(fs.readFileSync(CORRECTION,'utf8'));
 assert.equal(correction.isCounselApproval,false);assert.equal(correction.createsTerminalStatus,false);
});
const mutations=[
 ['reintroduce fee',s=>group(s,'nv_seal_pardon')[0].body.push('This petition carries a fee; it carries a fee.')],
 ['wrong objection period',s=>{const c=group(s,'nv_seal_decrim')[3];c.body=c.body.map(x=>x.replace('10 judicial days after receipt','30 days after filing'));}],
 ['missing proof attachment',s=>{const c=group(s,'nv_seal_pardon')[3];c.body=c.body.map(x=>x.replace('Proof of the pardon is a required attachment','No proof is required'));}],
 ['missing prosecutor exclusion',s=>{const c=group(s,'nv_seal_pardon')[3];c.body=c.body.map(x=>x.replace('NRS 179.273(3) expressly excludes','The filing requires'));}],
 ['extra prosecutor stipulation',s=>s.components.push({id:'bad',routeKey:SPECIAL_ROUTES.nv_seal_pardon.routeKey,role:'stipulation',body:[]})],
 ['ordinary route altered',s=>s.components.find(c=>!specialKeys.has(c.routeKey)).body.push('unauthorized change')],
 ['signature becomes a write',s=>group(s,'nv_seal_decrim')[0].writes.push({id:'signature',factId:'participant.signature'})],
 ['case number not collected',s=>{const c=group(s,'nv_seal_pardon')[0];c.blanks=c.blanks.filter(x=>x.id!=='case_number');}],
 ['notice sent by wrong actor',s=>{const c=group(s,'nv_seal_decrim')[3];c.body=c.body.map(x=>x.replace('The court sends written notice','The requester must secure consent'));}],
 ['pardon receives unrelated statutory authority',s=>group(s,'nv_seal_pardon')[1].body.push('NRS 179.285 automatically controls this order')],
];
for(const [name,mutate] of mutations) test(`negative control: ${name} is caught`,()=>{const changed=structuredClone(current);mutate(changed);assert.throws(()=>validate(changed));});
console.log(JSON.stringify({schemaVersion:'rcap-nv-special-route-repair-tests/v1',passed,failed:0,injectedDefectsCaught:mutations.length,results,productionTouched:false,grantsIndependentApproval:false},null,2));
