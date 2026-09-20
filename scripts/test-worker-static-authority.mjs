import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {evaluateStaticRenderAuthority,evaluateFulfillmentAuthority}=await import('../src/lib/rcap/fulfillment/grade-a-authority.ts');
const {workerStaticPacketBinding}=await import('../src/lib/rcap/fulfillment/worker-static-authority.ts');
const doc=JSON.parse(fs.readFileSync('data/rcap-grade-a/worker-static-authority.json'));
const route='MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
const entry=doc.entries.find(e=>e.record.routeId===route);assert(entry);
/*
 * Static render authority follows the owner approval, in both directions.
 *
 * This asserted `allowed` unconditionally. The shared Fees & Costs correction
 * moved two of the artifacts the 2026-09-20 approval names, so the approval is
 * refused and the record carries a pending owner decision -- which
 * collectMissingProof reports, which closes rendering too. That is the right
 * outcome and not a weaker one: a worker must not render a packet whose current
 * bytes no owner has approved, and "render it but do not sell it" is not a
 * distinction a participant holding the PDF can see.
 *
 * So the assertion is the RULE rather than today's answer, and the refusal has
 * to name the owner decision rather than being allowed to arrive for some other
 * reason nobody noticed.
 */
const staticAuthority=evaluateStaticRenderAuthority(entry.record,entry.observation);
const ownerDecisionPending=Boolean(entry.record.ownerDecisionPendingOnComposedArtifact);
assert.equal(staticAuthority.allowed,!ownerDecisionPending,staticAuthority.reason);
if(ownerDecisionPending)assert.match(staticAuthority.reason,/owner_decision:/);
/*
 * The worker's binding follows the same rule, so while the decision is pending
 * there is no binding to hand the worker at all.
 */
assert.equal(Boolean(workerStaticPacketBinding(route,'ms-nonconv')),!ownerDecisionPending);
for(const track of [null,'*','wrong'])assert.equal(workerStaticPacketBinding(route,track),null);
assert.equal(workerStaticPacketBinding('IL:'+route.split(':')[1],'ms-nonconv'),null);
assert.equal(evaluateFulfillmentAuthority(entry.record,entry.observation,route).authorized,false,'render-only projection cannot authorize commercial admission');

/*
 * Everything below measures the OTHER rules -- revocation, supersession, legal
 * status, source digests, packet completeness, provider identity -- and each
 * one has to be able to fail on its own. Against a record something else already
 * refuses they would all pass while asking nothing, which is the worst kind of
 * green.
 *
 * For one commit they ran against the HEAD-committed record, because the live
 * one was refused by the pending owner decision and a mutation cannot break what
 * is already broken. The owner has since approved the moved bytes, so the live
 * record renders again and the mutations run against WHAT SHIPS -- which is what
 * they were always supposed to measure, and a borrowed baseline can drift from.
 *
 * The guard below is therefore not ceremony. If this route is ever refused for
 * another reason, this control must say so loudly rather than quietly testing a
 * record that was never going to pass.
 */
const baseline=entry;
assert(evaluateStaticRenderAuthority(baseline.record,baseline.observation).allowed,
 'the shipped record must render, or these mutations are measuring nothing: '
 +evaluateStaticRenderAuthority(baseline.record,baseline.observation).reason);
const mutations=[
 r=>r.revocation.revoked=true,r=>r.supersededBy='successor',r=>r.legalAuthority.status='unapproved',
 r=>r.packetSpecification.complete=false,r=>r.officialSources[0].installedSha256='wrong',
 r=>r.artifactValidation.state='unverified',r=>r.finalVerification.state='missing',
 r=>r.visualReview.state='missing',r=>r.outputLegalApproval.state='missing',
 r=>r.packetCompleteness.filingApplication.state='missing',r=>r.provider.rendererVersion=''
];
for(const mutate of mutations){const r=structuredClone(baseline.record);mutate(r);assert.equal(evaluateStaticRenderAuthority(r,baseline.observation).allowed,false,mutate.toString());}
console.log('Static render authority PASS: the binding follows the owner approval; positive exact binding; wrong track/jurisdiction denied; commercial admission denied; 11 legal/source/packet/provider mutations caught.');
