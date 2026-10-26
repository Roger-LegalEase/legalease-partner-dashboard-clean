import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const dir=process.argv[2]??'data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading';
const court="clerk's office of the Mississippi court that granted nonadjudication and entered the dismissal or closure order";
const scope='THIS PETITION IS BROUGHT UNDER SEC. 99-15-26(5), NOT UNDER SEC. 99-19-71.';
const uncertainty='No record this packet binds settles whether the Sec. 99-19-72 fee reaches a petition brought under Sec. 99-15-26(5), and this packet does not decide it in either direction.';
const waiver="No record this packet binds states a fee waiver for this route, and the office that answers that is the same clerk's office.";
const map=JSON.parse(fs.readFileSync(`${dir}/production-field-map.json`,'utf8'));
const surfaces=[
 ['participant instructions',fs.readFileSync(`${dir}/participant-instructions.md`,'utf8')],
 ['fee obligation',map.participantFacingObligations.find(row=>row.question==='FEE_AND_WAIVER')?.answer]
];
for(const fixture of ['canonical','boundary']) surfaces.push([fixture,execFileSync('pdftotext',['-layout',`${dir}/fixtures/${fixture}.pdf`,'-'],{encoding:'utf8'})]);
for(const [name,value]of surfaces){
 assert.equal(typeof value,'string',`${name}: fee surface exists`);
 const text=value.replace(/\s+/g,' ');
 assert.ok(!text.includes('So: expect to be asked for $150'),`${name}: no unconfirmed amount to expect`);
 assert.ok(!text.includes('$150'),`${name}: no sibling fee figure published on this route`);
 assert.ok(text.includes(scope),`${name}: distinct statutory ground retained`);
 assert.ok(text.includes(uncertainty),`${name}: fee applicability remains unresolved`);
 assert.ok(text.includes(`So: ask the ${court} what that court charges for this petition before you go`),`${name}: current amount comes from the named clerk`);
 assert.ok(text.includes(waiver),`${name}: waiver uncertainty and clerk retained`);
 console.log(`PASS ${name}: scoped fee uncertainty and clerk direction`);
}
const counters=JSON.parse(fs.readFileSync(`${dir}/reports/completeness-counters.json`,'utf8')).counters;
assert.equal(Object.keys(counters).length,9);
for(const [name,value]of Object.entries(counters))assert.equal(value,0,name);
console.log(JSON.stringify({passedSurfaces:surfaces.length,zeroCompletenessCounters:9}));
