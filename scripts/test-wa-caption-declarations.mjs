import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {readsAsUnmoved} from './grade-a-packet-factory-24h/repin-lapsed-source-identities.mjs';
const base='bf02d807328f4edfe1ff2541127563bb8b371086';
const file='scripts/build-census-v1-rcap-wa-custom-pleading-clean-tracks.mjs';
const prior=p=>execFileSync('git',['show',`${base}:${p}`]);
const spec=s=>JSON.parse(JSON.stringify(runInNewContext(s.slice(s.indexOf('const SPEC = '),s.indexOf('\n};')+3)+'\nSPEC')));
const before=spec(prior(file).toString()),after=spec(fs.readFileSync(file,'utf8')),dir=after.outDir;
const ids=new Map([['wa_vac_post_probation_9_95_240-primary-filing-1','court_identity'],['wa_vac_post_probation_9_95_240-proposed-order-2','order_court_identity']]);
let passed=0;const check=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`)};
check('printed caption counterexample exists in both saved variants, on pages1 and4',()=>{
 for(const fixture of ['canonical','boundary']){
  const pdf=`${dir}/fixtures/${fixture}.pdf`,bytes=prior(pdf);
  assert.deepEqual(fs.readFileSync(pdf),bytes,'no packet-byte correction is needed');
  const pages=execFileSync('pdftotext',['-layout','-','-'],{input:bytes,encoding:'utf8'}).split('\f');
  for(const page of [1,4])assert.match(pages[page-1],/IN THE\s+\.+\s+COURT/);
 }
 for(const [id,field] of ids)assert.ok(!before.components.find(c=>c.id===id).blanks.some(b=>b.id===field));
});
check('only two required-before-filing declarations added; all bodies and saved facts preserved',()=>{
 const stripped=structuredClone(after);
 for(const c of stripped.components){
  if(!ids.has(c.id))continue;
  const field=ids.get(c.id),blank=c.blanks.find(b=>b.id===field);
  assert.equal(blank.kind,'rbf');assert.match(blank.supply,/sentencing court copied from the existing case record/);
  assert.match(blank.supply,/same court on the petition and proposed order/);
  assert.match(blank.why,/does not hold its court name/);
  c.blanks=c.blanks.filter(b=>b.id!==field);
 }
 assert.deepEqual(stripped,before);
});
check('generated map declares both captions for both variants without changing other writes/refusals',()=>{
 const old=JSON.parse(prior(`${dir}/production-field-map.json`)),next=JSON.parse(fs.readFileSync(`${dir}/production-field-map.json`));
 // Compare the entire map after removing only these new records wherever the native builder emits them.
 const fields=new Set([...ids].map(([doc,field])=>`${doc}.${field}`));
 const strip=value=>Array.isArray(value)?value.filter(x=>!x||!fields.has(x.field)).map(strip):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,strip(v)])):value;
 const text=JSON.stringify(next);for(const field of fields)assert.ok(text.includes(`"field":"${field}"`));
 assert.equal(next.requiredBeforeFilingCount,old.requiredBeforeFilingCount+2);
 next.requiredBeforeFilingCount=old.requiredBeforeFilingCount;
 assert.deepEqual(strip(next),old);
});
check('both caption requirements reach participant instructions and disclosure report',()=>{
 const instructions=fs.readFileSync(`${dir}/participant-instructions.md`,'utf8');
 const blanks=JSON.parse(fs.readFileSync(`${dir}/reports/blanks-left-for-the-participant.json`));
 for(const [document,field] of ids){
  const row=blanks.requiredBeforeFiling.find(r=>r.document===document&&r.field===`${document}.${field}`);
  assert.ok(row);assert.ok(instructions.includes(row.participantMustSupply));
 }
});
check('all nine measured counters zero; byte evidence, protected fields and source history preserved',()=>{
 const counts=JSON.parse(fs.readFileSync(`${dir}/reports/completeness-counters.json`)).counters;
 assert.equal(Object.keys(counts).length,9);for(const n of Object.values(counts))assert.equal(n,0);
 for(const file of ['reports/actual-writes.json','reports/rendered-artifacts.json'])assert.deepEqual(fs.readFileSync(`${dir}/${file}`),prior(`${dir}/${file}`));
 // The receipt may since carry a census identity re-pin (2026-10-20); anything else the generator would read as movement.
 const receipt=readsAsUnmoved(prior(`${dir}/source-receipt.json`).toString(),fs.readFileSync(`${dir}/source-receipt.json`,'utf8'));
 assert.ok(receipt.ok,receipt.why);
 // readsAsUnmoved sets aside sha256/byteLength on refreshed pins, so hold every pin to the bytes it names (Acceptance 1c9147698).
 for(const pin of JSON.parse(fs.readFileSync(`${dir}/source-receipt.json`)).committedRecords){
  const bytes=fs.readFileSync(pin.pathInRepository);
  assert.equal(pin.sha256,createHash('sha256').update(bytes).digest('hex'),pin.pathInRepository);
  assert.equal(pin.byteLength,bytes.length,pin.pathInRepository);
 }
});
console.log(JSON.stringify({passed,failed:0}));
