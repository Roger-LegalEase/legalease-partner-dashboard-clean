import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
const base='1b4dfeaa14dbf4facf145fd408069acba22d4b32';
const file='scripts/build-census-v1-rcap-ok-custom-pleading.mjs';
const prior=p=>execFileSync('git',['show',`${base}:${p}`]);
const spec=s=>runInNewContext(s.slice(s.indexOf('const SPEC = '),s.indexOf('\n};')+3)+'\nSPEC');
const old=spec(prior(file).toString()),next=spec(fs.readFileSync(file,'utf8')),dir=process.argv[2]??next.outDir;
const routeLabel='Update an Oklahoma deferred sentence so the case shows as dismissed';
const rows=next.obligationTable.filter(([label])=>label.endsWith(routeLabel));
const fee=rows.find(([k])=>k.startsWith('FEE_AND_WAIVER'))[1],service=rows.find(([k])=>k.startsWith('SERVICE'))[1];
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`)};
check('other seven route definitions and components unchanged',()=>{
 for(const c of old.components.filter(c=>!c.id.startsWith('ok_991c_deferred-')))
  assert.equal(JSON.stringify(next.components.find(n=>n.id===c.id)),JSON.stringify(c),c.id);
 assert.equal(JSON.stringify(next.obligationTable.filter(([k])=>!k.endsWith(routeLabel))),JSON.stringify(old.obligationTable.filter(([k])=>!k.endsWith(routeLabel))));
 for(const key of ['fixtures','records','routes','statutes','routeSelectionsMade'])assert.equal(JSON.stringify(next[key]),JSON.stringify(old[key]));
});
check('reviewer venue counterexample fixed in motion and order maps',()=>{
 const before=old.components.find(c=>c.id==='ok_991c_deferred-primary-filing-2').blanks.find(b=>b.id==='court_identity');
 assert.ok(before.supply.includes('county where the arrest information is located'));
 for(const id of ['ok_991c_deferred-primary-filing-2','ok_991c_deferred-proposed-order-3']){
  const c=next.components.find(c=>c.id===id),b=c.blanks.find(b=>b.id.endsWith('court_identity'));
  assert.ok(b.why.includes('court that entered the deferred sentence'));
  assert.ok(!b.why.includes('arrest information is located'));
 }
});
check('fee/waiver and service uncertainty name sentencing-court clerk without borrowing section18 rules',()=>{
 assert.ok(fee.includes('whether a fee applies and whether a fee waiver is available'));
 assert.ok(service.includes('who must receive the motion or notice and how'));
 for(const value of [fee,service])assert.ok(value.includes('clerk of the Oklahoma district court that entered the deferred sentence'));
 assert.ok(service.includes('Do not assume that the section 18 court-notice procedure applies'));
});
const instructions=fs.readFileSync(`${dir}/participant-instructions.md`,'utf8');
check('companion instructions agree with the printed section991c questions',()=>{
 assert.ok(instructions.includes(fee));assert.ok(instructions.includes(service));
 assert.ok(instructions.includes('copy its identity from the case record and confirm it with that court'));
 assert.ok(instructions.includes('For section 991c, read BEFORE YOU FILE on the effect-disclosure page instead.'));
 assert.ok(instructions.includes('For section 991c, use the court named in the BEFORE YOU FILE instructions on that page.'));
});
for(const fixture of ['canonical','boundary']){
 const pdf=`${dir}/fixtures/${fixture}.pdf`;
 const read=b=>execFileSync('pdftotext',['-layout','-','-'],{input:b,encoding:'utf8'}).replace(/\s+/g,' ');
 const before=read(prior(`${next.outDir}/fixtures/${fixture}.pdf`)),after=read(fs.readFileSync(pdf));
 check(`${fixture}: baseline lacks new authority answers; corrected saved bytes contain both`,()=>{
  assert.ok(!before.includes(fee));assert.ok(!before.includes(service));
  assert.ok(after.includes(fee));assert.ok(after.includes(service));
  assert.ok(after.includes('File the motion in the Oklahoma district court that entered the deferred sentence'));
 });
 check(`${fixture}: arrest-record distinction and saved facts preserved`,()=>{
  assert.ok(after.includes('It does not remove the ARREST record. Do not say your record is clear'));
  const writes=JSON.parse(fs.readFileSync(`${dir}/reports/actual-writes.json`));
  const original=JSON.parse(prior(`${next.outDir}/reports/actual-writes.json`));
  assert.deepEqual(writes.documents.find(d=>d.fixture===fixture).actualWrites,original.documents.find(d=>d.fixture===fixture).actualWrites);
 });
}
check('all measured completeness counters zero; no acceptance or authority claimed',()=>{
 const counts=JSON.parse(fs.readFileSync(`${dir}/reports/completeness-counters.json`)).counters;
 assert.equal(Object.keys(counts).length,9);for(const value of Object.values(counts))assert.equal(value,0);
 const status=JSON.parse(fs.readFileSync(`${dir}/build-status.json`));assert.equal(status.independentVerificationStatus,'PENDING');assert.equal(status.generationAllowed,false);
});
console.log(JSON.stringify({passed,failed:0,unmodifiedOtherRoutes:7}));
