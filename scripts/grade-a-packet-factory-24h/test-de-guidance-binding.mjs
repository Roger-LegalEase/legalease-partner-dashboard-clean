import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {bindDeclaredDeGuidance, DE_FAMILY, DE_ROUTE} from './de-guidance-binding.mjs';
const root=process.env.RCAP_TEST_ROOT ?? process.cwd();
const home='data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill';
const read=p=>JSON.parse(fs.readFileSync(`${root}/${p}`,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(`${root}/${p}`)).digest('hex');
const original={record:read(`${home}/product-wiring.json`),family:{familyId:DE_FAMILY,routeKeys:[DE_ROUTE],directory:home,state:'VERIFY_PENDING'},report:read(`${home}/reports/rendered-artifacts.json`),receipt:read(`${home}/source-receipt.json`),instructions:fs.readFileSync(`${root}/${home}/participant-instructions.md`,'utf8')};
const frozen=JSON.stringify(original);
const fixture=()=>structuredClone(original);
const apply=x=>bindDeclaredDeGuidance(x.record,x.family,{report:x.report,receipt:x.receipt,instructions:x.instructions,hashFile:x.hashFile ?? hash});
const output=apply(fixture());
assert.equal(output.binding.deliveryType,'process_guidance');
assert.equal(output.proposedRepresentation.outputStrategy,'process_guidance');
assert.equal(output.proposedRepresentation.components[0].role,'participant_guide');
assert.equal(output.proposedRepresentation.components[0].sha256,hash(`${home}/fixtures/canonical.pdf`));
assert.equal(output.proposedRepresentation.fixtureBindings.length,2);
assert.equal(output.binding.lastIndependentVerification,null);
assert.equal(output.binding.independentReviewStatus,'CURRENT_REVIEW_PENDING');
assert.equal(output.binding.paymentEligible,false);assert.equal(output.binding.sponsorshipEligible,false);
const again=fixture();again.record=output;assert.deepEqual(apply(again),output,'Not idempotent');
const other=fixture();other.family.familyId='other-family';assert.equal(apply(other),other.record,'Unrelated family changed');
let rejected=0;
const cases=[
 ['wrong family',x=>x.record.family='other'],
 ['extra route',x=>x.family.routeKeys.push('other')],
 ['wrong wiring route',x=>x.record.routeKeys=[]],
 ['wrong source route',x=>x.receipt.routeKeys=[]],
 ['wrong inventory family',x=>x.report.familyId='other'],
 ['filing component',x=>x.report.componentSet=['primary_filing']],
 ['filing source declaration',x=>x.receipt.composedComponentsAuthoredByThisBuild=['application']],
 ['new application source',x=>x.receipt.sourceBinaryCommitted=true],
 ['no guidance declaration',x=>x.receipt.formIdentityNote='unknown'],
 ['missing no-checkout boundary',x=>x.instructions=x.instructions.replace('There is no checkout and nothing to file from this guide','Changed')],
 ['missing no-filing boundary',x=>x.instructions=x.instructions.replace('Do not submit it to a court or agency','Changed')],
 ['installed contract',x=>x.record.status='INSTALLED_RUNTIME'],
 ['authority granted',x=>x.record.authorityCreated='yes'],
 ['generation enabled',x=>x.record.currentState.generationAllowed=true],
 ['checkout enabled',x=>x.record.binding.paymentEligible=true],
 ['sponsorship enabled',x=>x.record.binding.sponsorshipEligible=true],
 ['missing fixture',x=>x.report.pdfs.pop()],
 ['duplicated fixture',x=>x.report.pdfs[1].fixture='canonical'],
 ['wrong output path',x=>x.report.pdfs[0].file='another.pdf'],
 ['wrong page inventory',x=>x.report.pdfs[0].pageCount=2],
 ['corrupt declared hash',x=>x.report.pdfs[0].sha256='0'.repeat(64)],
 ['corrupt actual bytes',x=>x.hashFile=()=>'0'.repeat(64)],
];
for(const [name,mutate] of cases){const x=fixture();mutate(x);assert.throws(()=>apply(x),name);rejected++;}
assert.equal(JSON.stringify(original),frozen);
console.log(JSON.stringify({familyId:DE_FAMILY,positiveCases:3,rejectedCases:rejected,inputRecordsUnchanged:true,onlyMetadataChanged:true,independentApproval:false},null,2));
