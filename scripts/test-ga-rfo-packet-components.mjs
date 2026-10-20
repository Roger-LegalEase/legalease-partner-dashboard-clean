import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=process.argv[2]??'data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading';
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const prefix='ga-retroactive-first-offender-42-8-66-';
// LA-IMM-01 requires these supplied documents independently of the builder's declaration.
const required=['petition-1','filing-instructions-2','proposed-order-3','hearing-request-4','service-notice-5','post-order-instructions-6'].map(id=>prefix+id);
const fieldMap=read('production-field-map.json');
assert.deepEqual(fieldMap.componentSet,required,'all six source-required supplied components must be declared');
const rendered=read('reports/rendered-artifacts.json');
const instructions=fs.readFileSync(path.join(dir,'participant-instructions.md'),'utf8');
const maps=new Map(fieldMap.maps.map(map=>[map.documentId,map]));
const order=maps.get(prefix+'proposed-order-3');
for(const fixture of ['canonical','boundary']){
 const artifact=rendered.artifacts.find(a=>a.fixture===fixture);
 assert.ok(artifact,`${fixture}: rendered packet exists`);
 const texts=new Map();
 for(const id of required){
  const pages=artifact.pageManifest.filter(p=>p.component===id).map(p=>p.packetPage);
  assert.ok(pages.length,`${fixture}: ${id} rendered`);
  const text=pages.map(p=>execFileSync('pdftotext',['-f',String(p),'-l',String(p),'-layout',path.join(dir,'fixtures',fixture+'.pdf'),'-'],{encoding:'utf8'})).join(' ').replace(/\s+/g,' ');
  texts.set(id.slice(prefix.length),text);
 }
 const proposed=texts.get('proposed-order-3');
 for(const phrase of ['PROPOSED ORDER','Original criminal case number','Court decision','GRANTED','DENIED','on or after July 1, 2026','restriction','court-record sealing','JUDICIAL OFFICER','DATE ENTERED'])assert.ok(proposed.includes(phrase),`${fixture}: proposed order ${phrase}`);
 assert.match(proposed,/Court decision[^.]*\.{10}/,`${fixture}: decision remains blank`);
 const hearing=texts.get('hearing-request-4');
 for(const phrase of ['[ ] I request a hearing.','[ ] I do not request a hearing.','petitioner or prosecutor requests one','SIGNATURE OF PETITIONER'])assert.ok(hearing.includes(phrase),`${fixture}: hearing ${phrase}`);
 assert.ok(!hearing.includes('[X]'),`${fixture}: no invented hearing election`);
 const service=texts.get('service-notice-5');
 for(const phrase of ['clerk of the court of conviction','recipient or method','Recipient','Method','Date of service or notice','actually completed','SIGNATURE'])assert.ok(service.includes(phrase),`${fixture}: service ${phrase}`);
 for(const label of ['Recipient','Method','Date of service or notice'])assert.match(service,new RegExp(label+'[^.]*\\.{10}'),`${fixture}: ${label} blank`);
 const post=texts.get('post-order-instructions-6');
 for(const phrase of ['entered order','on or after July 1, 2026','restriction','sealing','distribution','verification','Do not file a second merits or sealing petition','clerk of the court of conviction'])assert.ok(post.includes(phrase),`${fixture}: post-order ${phrase}`);
 const filing=texts.get('filing-instructions-2');
 for(const phrase of ['PACKET SUPPLIES','YOU OBTAIN','CONSENT PRESENT','CONSENT ABSENT OR DISPUTED','do not generate or file','original First Offender eligibility is uncertain','prosecutor withdraws consent'])assert.ok(filing.includes(phrase),`${fixture}: branch/material boundary ${phrase}`);
 const refusals=order[fixture+'Refusals'];
 for(const id of ['court_decision','restriction_directions','sealing_directions','distribution_directions','judge_signature','order_date']){
  const refusal=refusals.find(r=>r.field===prefix+'proposed-order-3.'+id);
  assert.equal(refusal?.category,'court_prosecutor_clerk_or_agency_owned',`${fixture}: ${id} is court-owned`);
  assert.equal(refusal.requiredBeforeFiling,false,`${fixture}: ${id} is not a participant filing gate`);
  assert.ok(!order[fixture+'Writes'].some(w=>w.field===refusal.field),`${fixture}: ${id} never written`);
 }
 for(const suffix of ['hearing-request-4','service-notice-5']){
  const map=maps.get(prefix+suffix);
  for(const r of map[fixture+'Refusals'].filter(r=>/signature|date/.test(r.field))){
   assert.equal(r.category,'signature_or_date_participant_completion',`${fixture}: signing/date act protected`);
   assert.ok(!map[fixture+'Writes'].some(w=>w.field===r.field));
  }
 }
 console.log(`PASS ${fixture}: all six components, court/participant blanks, hearing choices, service uncertainty and route boundaries`);
}
assert.ok(instructions.includes('**Assemble the supplied packet and the records you obtain.**'));
assert.ok(instructions.includes('The packet supplies'));
assert.ok(instructions.includes('You obtain'));
for(const name of ['generationAllowed','runtimeSelectable'])assert.equal(fieldMap[name],false);
assert.equal(fieldMap.commercialRoutesOpened,0);
for(const [name,value]of Object.entries(read('reports/completeness-counters.json').counters))assert.equal(value,0,name);
console.log('PASS supplied-versus-obtained instructions, unchanged closed delivery gates and zero completeness counters');
