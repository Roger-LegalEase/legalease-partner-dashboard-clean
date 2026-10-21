import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {evaluateStaticRenderAuthority,evaluateFulfillmentAuthority}=await import('../src/lib/rcap/fulfillment/grade-a-authority.ts');
const {workerStaticPacketBinding}=await import('../src/lib/rcap/fulfillment/worker-static-authority.ts');
const doc=JSON.parse(fs.readFileSync('data/rcap-grade-a/worker-static-authority.json'));
const route='MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
const entry=doc.entries.find(e=>e.record.routeId===route);assert(entry);
assert(evaluateStaticRenderAuthority(entry.record,entry.observation).allowed);
assert(workerStaticPacketBinding(route,'ms-nonconv'));
for(const track of [null,'*','wrong'])assert.equal(workerStaticPacketBinding(route,track),null);
assert.equal(workerStaticPacketBinding('IL:'+route.split(':')[1],'ms-nonconv'),null);
assert.equal(evaluateFulfillmentAuthority(entry.record,entry.observation,route).authorized,false,'render-only projection cannot authorize commercial admission');
const mutations=[
 r=>r.revocation.revoked=true,r=>r.supersededBy='successor',r=>r.legalAuthority.status='unapproved',
 r=>r.packetSpecification.complete=false,r=>r.officialSources[0].installedSha256='wrong',
 r=>r.artifactValidation.state='unverified',r=>r.finalVerification.state='missing',
 r=>r.visualReview.state='missing',r=>r.outputLegalApproval.state='missing',
 r=>r.packetCompleteness.filingApplication.state='missing',r=>r.provider.rendererVersion=''
];
for(const mutate of mutations){const r=structuredClone(entry.record);mutate(r);assert.equal(evaluateStaticRenderAuthority(r,entry.observation).allowed,false,mutate.toString());}
console.log('Static render authority PASS: positive exact binding; wrong track/jurisdiction denied; commercial admission denied; 11 legal/source/packet/provider mutations caught.');
