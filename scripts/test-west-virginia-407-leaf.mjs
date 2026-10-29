import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {WEST_VIRGINIA_407_ROUTE:route,evaluateWestVirginia407:evaluate,westVirginia407Questions:questions,westVirginia407DocumentManifest:manifest}=await import('../src/lib/rcap-engine/west-virginia-407-facts.ts');
const prior=JSON.parse(fs.readFileSync('scripts/fixtures/wv-407-leaf-equivalence.json','utf8'));
const base=JSON.parse(fs.readFileSync('scripts/fixtures/wv-407-frozen-matter.json','utf8')).facts;
let count=0;
for(const c of prior.cases){const facts={...base,...c.patch};for(const id of c.remove)delete facts[id];assert.deepEqual(evaluate(route,facts,c.asOf),c.expected,c.name);count++;}
assert.deepEqual(questions(route),prior.questions,'Exact existing bilingual questions/options preserved');count++;
assert.deepEqual(manifest(route),prior.documentManifest,'Exact existing five-component manifest preserved');count++;
for(const other of['MS:unrelated','MA:juvenile-record-sealing-under-100b','WV:juvenile-record-relief']){assert.equal(evaluate(other,{},'invalid-date'),null);assert.deepEqual(questions(other),[]);assert.equal(manifest(other),null);count++;}
assert.throws(()=>evaluate(route,base,'2026-02-30'),/exact valid as-of/);count++;
assert(!/^import\s|node:|pdf-lib|process\.|Buffer\./m.test(fs.readFileSync('src/lib/rcap-engine/west-virginia-407-facts.ts','utf8')),'Pure WV leaf has no runtime dependencies');count++;
console.log(`${count}/${count} WV-only prior-output/question/document/scope/dependency controls passed. No new rules, approval or checkout authority.`);
