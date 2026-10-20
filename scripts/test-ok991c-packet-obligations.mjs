import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const dir=process.argv[2]??'data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading';
const heading='BEFORE YOU FILE - SECTION 991c';
const court='Oklahoma district court that entered the deferred sentence';
const fee=`The held record does not establish a filing fee or fee waiver for the section 991c motion. Before filing, ask the clerk of the ${court} whether a fee applies and whether a fee waiver is available. The separate $150 OSBI arrest-record processing fee does not establish the fee for this court-record motion.`;
const service=`The held record does not establish service or notice requirements for this section 991c motion. Before filing, ask the clerk of the ${court} who must receive the motion or notice and how. Do not assume that the section 18 court-notice procedure applies to this motion.`;
const instructions=fs.readFileSync(`${dir}/participant-instructions.md`,'utf8');
const map=JSON.parse(fs.readFileSync(`${dir}/production-field-map.json`,'utf8'));
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`)};

// VF07: readers must be pointed to a printed heading, not an internal component role.
check('participant steps name the printed section991c heading',()=>{
 assert.ok(instructions.includes(`For section 991c, read ${heading} in this packet instead.`));
 assert.ok(instructions.includes(`For section 991c, use the court named under ${heading} in this packet.`));
});
check('motion and order court fields identify the sentencing court',()=>{
 for(const [document,id]of [
  ['ok_991c_deferred-primary-filing-2','court_identity'],
  ['ok_991c_deferred-proposed-order-3','order_court_identity']
 ]){
  const field=map.requiredBeforeFiling.find(b=>b.document===document&&b.field===`${document}.${id}`);
  assert.ok(field,`${document}.${id}`);
  assert.ok(field.why.includes(court));
  if(id==='court_identity')assert.ok(field.participantMustSupply.includes(court));
  else assert.ok(field.participantMustSupply.includes('same Oklahoma district court you name on the petition'));
 }
});
check('companion fee and service instructions name the clerk without assuming section18 rules',()=>{
 const route='Update an Oklahoma deferred sentence so the case shows as dismissed';
 for(const [obligation,text]of [['FEE_AND_WAIVER',fee],['SERVICE',service]]){
  assert.equal(map.participantFacingObligations.find(r=>r.question===`${obligation} — ${route}`)?.answer,text);
  assert.ok(instructions.includes(text));
 }
 assert.ok(instructions.includes('copy its identity from the case record and confirm it with that court'));
});
for(const fixture of ['canonical','boundary']){
 const text=execFileSync('pdftotext',['-layout',`${dir}/fixtures/${fixture}.pdf`,'-'],{encoding:'utf8'}).replace(/\s+/g,' ');
 check(`${fixture}: motion pointer names an actual printed heading`,()=>{
  assert.ok(text.includes(`see ${heading} in this packet)`));
  assert.ok(text.includes(`${heading} File the motion in the ${court}.`));
  assert.ok(!text.includes('see BEFORE YOU FILE on the effect-disclosure page'));
 });
 check(`${fixture}: arrest-record screen distinguishes OSBI processing from the unknown motion fee`,()=>{
  assert.ok(text.includes("OSBI states that a separate arrest-record expungement carries a $150 processing fee; the court's fee for this section 991c motion is not established (see BEFORE YOU FILE - SECTION 991c in this packet)."));
  assert.ok(!text.includes('the registry records that expunging a court record is free'));
 });
 check(`${fixture}: fee/service uncertainty and arrest-record limits survive in saved bytes`,()=>{
  assert.ok(text.includes(fee));
  assert.ok(text.includes(service));
  assert.ok(text.includes('It does not remove the ARREST record. Do not say your record is clear'));
 });
}
check('measured completeness counters remain zero',()=>{
 const counts=JSON.parse(fs.readFileSync(`${dir}/reports/completeness-counters.json`,'utf8')).counters;
 assert.equal(Object.keys(counts).length,9);
 for(const [name,value]of Object.entries(counts))assert.equal(value,0,name);
});
console.log(JSON.stringify({passed,failed:0}));
