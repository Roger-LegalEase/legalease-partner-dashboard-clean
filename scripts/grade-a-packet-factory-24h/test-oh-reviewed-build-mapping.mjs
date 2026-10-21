import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assessOhReviewedBuildMapping as assess, OH_FAMILY, OH_ROUTES, OH_HISTORICAL_MAPPING, OH_EVIDENCE_PINS, OH_DIRECTORY } from './oh-reviewed-build-mapping.mjs';
const root = process.cwd();
const input = {familyId: OH_FAMILY, implementationStrategy:'custom_pleading', treatment:null,
  executionReclassification: structuredClone(OH_HISTORICAL_MAPPING),
  routes:[{routeKey:OH_ROUTES[0],requiredSourceIds:['official-form:BCI-RECORD-SEAL-NOTIFICATION','component:historical-only'],preservedMetadata:'preserve'}]};
const copy = value => structuredClone(value);
let controls=0;
const pass = assess(root,input);
assert.deepEqual(pass.routes.map(r=>r.routeKey),OH_ROUTES);
assert.equal(pass.routes.flatMap(r=>r.requiredSourceIds.filter(s=>s.startsWith('component:'))).length,20);
assert(pass.routes.every(r=>r.requiredSourceIds.includes('official-form:BCI-RECORD-SEAL-NOTIFICATION')));
assert.equal(pass.routes[0].preservedMetadata,'preserve');
assert.equal(pass.executionReclassification.stateOverride,null);
assert.equal(pass.executionReclassification.historicalStateOverride,'PRODUCT_PATH_PENDING');
assert.equal(input.executionReclassification.stateOverride,'PRODUCT_PATH_PENDING');
assert(!Object.hasOwn(pass,'counters'));assert(!Object.hasOwn(pass,'rasterState'));assert(!Object.hasOwn(pass,'generationAllowed'));controls++;
assert.equal(assess(root,{familyId:'unrelated'}),null);controls++;
for(const change of [
 x=>x.routes.push(copy(x.routes[0])),
 x=>x.routes[0].routeKey='unreviewed-route',
 x=>x.routes=[],
 x=>x.routes=OH_ROUTES.concat('extra').map(routeKey=>({routeKey})),
 x=>x.executionReclassification.stateOverride='BLOCKED_LEGAL_APPROVAL_INPUT',
 x=>x.executionReclassification.ownerDecision='newer unresolved defect',
 x=>x.executionReclassification=null,
 x=>x.treatment={unexpected:true},
 x=>x.implementationStrategy='official_pdf_fill'
]) {const changed=copy(input);change(changed);assert.throws(()=>assess(root,changed));controls++;}
const expanded=copy(input);expanded.routes=pass.routes;assert.deepEqual(assess(root,expanded).routes,pass.routes);controls++;
const receipt=JSON.parse(fs.readFileSync(`${OH_DIRECTORY}/source-receipt.json`));
const report=JSON.parse(fs.readFileSync(`${OH_DIRECTORY}/reports/rendered-artifacts.json`));
const targets=[...Object.keys(OH_EVIDENCE_PINS),...receipt.documents.map(s=>s.path),...report.packets.map(p=>`${OH_DIRECTORY}/${p.file}`),`${OH_DIRECTORY}/continuation/${report.packets[0].documents[0].documentId}.pdf`];
for(const target of new Set(targets)) {
  assert.throws(()=>assess(root,input,{readBytes:p=>p===target?Buffer.from('changed exact reviewed bytes'):fs.readFileSync(p)}),undefined,target);controls++;
  assert.throws(()=>assess(root,input,{readBytes:p=>{if(p===target)throw Error('missing input');return fs.readFileSync(p);}}),undefined,target);controls++;
}
console.log(`PASS ${controls} OH reviewed mapping controls; four routes/twenty components; no terminal or commercial authority`);
