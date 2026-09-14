import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
import {loadMsPaidPacketProof,MS_PAID_PACKET_PROOF} from './lib/ms-paid-packet-proof.mjs';
import {MS_TRACK_CONTAINER as c,reconcileMsUnchangedTrack} from './lib/ms-unchanged-track-authority.mjs';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {loadMsPaidConsumerSuccessor,msPaidSuccessorConsumerScope}=await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const {stableStringify}=await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const {isPersonalizedDeliveryRoute}=await import('../src/lib/rcap/render/personalized-packet.ts');
const {consumerSpecificationBinding}=await import('../src/lib/rcap/fulfillment/consumer-specification-binding.ts');
const approval=loadMsPaidConsumerSuccessor();const original=JSON.parse(fs.readFileSync(MS_PAID_PACKET_PROOF));
let count=0;function check(name,run){run();count++;console.log('PASS '+name);}
const load=(proof,changed)=>loadMsPaidPacketProof({approval,stableStringify,readBytes:p=>p===MS_PAID_PACKET_PROOF?Buffer.from(JSON.stringify(proof)):changed?.path===p?changed.bytes:fs.readFileSync(p)});
check('valid current packet/source proof binds',()=>assert.equal(load(original).proof.results.length,2));
for(const [name,mutate] of Object.entries({
 'wrong route':p=>p.routeId+='-other','wrong family':p=>p.packetFamilyId='other','wrong track':p=>p.trackId='ms-misd-addl',
 'wrong owner decision':p=>p.ownerDecision.decisionSha256='0'.repeat(64),
 'missing boundary':p=>p.results.pop(),'unverified current renderer':p=>p.results[0].currentRendererByteIdentical=false,
 'unverified Postgres':p=>p.results[0].postgresVerificationHashIdentical=false,
 'wrong artifact':p=>p.results[0].artifactSha256='0'.repeat(64),
 'wrong final verification hash':p=>p.results[0].verificationBoundInputsSha256='0'.repeat(64),
 'wrong source hash':p=>p.sourceAuthority.boundInputsSha256='0'.repeat(64),
 'wrong source route':p=>p.sourceAuthority.boundInputs.routeId+='-other',
 'missing verifier binding':p=>delete p.inputs[p.generatedBy]
})){const p=structuredClone(original);mutate(p);check('refuses '+name,()=>assert.throws(()=>load(p)));}
for(const file of [approval.specificationPath,approval.historicalApprovalPath,'src/lib/rcap/grade-a/renderer.ts',original.results[0].artifactPath])
 check('refuses moved input '+file,()=>assert.throws(()=>load(original,{path:file,bytes:Buffer.concat([fs.readFileSync(file),Buffer.from('\n')])})));
const registry=JSON.parse(fs.readFileSync('data/rcap-grade-a/fulfillment-authority-registry.json'));
const record=registry.records.find(r=>r.routeId===approval.routeId);
check('exact worker provider resolves registered MS specification',()=>assert.ok(consumerSpecificationBinding(record,{trackId:'ms-nonconv',packetFamilyId:'ms-nonconv-set'})));
check('wrong track cannot bind',()=>assert.equal(consumerSpecificationBinding(record,{trackId:'ms-misd-addl'}),null));
check('exact owner consumer scope applies',()=>assert.equal(msPaidSuccessorConsumerScope(record),true));
check('historical clinic does not inherit consumer scope',()=>assert.equal(msPaidSuccessorConsumerScope({...record,recordId:'grade-a-ms-non-conviction-expungement-clinic-demo-v1'}),false));
check('exact MS route selects protected participant rendering',()=>assert.equal(isPersonalizedDeliveryRoute(approval.routeId),true));
check('other MS route does not inherit participant rendering',()=>assert.equal(isPersonalizedDeliveryRoute(c.routes[0]),false));
check('Illinois participant rendering remains selected',()=>assert.equal(isPersonalizedDeliveryRoute('IL:felony-prostitution-relief'),true));
const args={familyId:c.familyId,routeId:c.routes[0],approvedBytes:execFileSync('git',['show',`${c.approvedCommit}:${c.path}`]),currentBytes:fs.readFileSync(c.path)};
check('unchanged MS sibling track reconciles without clearing revocation',()=>assert.equal(reconcileMsUnchangedTrack(args).revocationCleared,false));
for(const [name,change] of Object.entries({'wrong route':{routeId:approval.routeId},'wrong family':{familyId:'ms-nonconv-set'},'changed approved memo':{approvedBytes:Buffer.from('{}')},'changed current memo':{currentBytes:Buffer.from('{}')}}))check('container refuses '+name,()=>assert.throws(()=>reconcileMsUnchangedTrack({...args,...change})));
console.log(`${count}/${count} proof and scope controls passed; no commercial or hosted acceptance implied.`);
