#!/usr/bin/env node
// Historical command retained. VA-01 supersedes its former premise that an
// unverified CC-1472 participant petition was a current second branch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {specificationDocumentRefusals,documentContractFor}=await import('../src/lib/rcap/grade-a/document-contract.ts');
const {packetSpecificationFor,composablePacketSpecificationFor,packetSpecificationRequiredFactIdsFor,specificationLegalSectionsBound}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {renderPreflight}=await import('../src/lib/expungement-ai/render-preflight.ts');
const SPEC='data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json';
const spec=JSON.parse(fs.readFileSync(SPEC));
const historical=JSON.parse(execFileSync('git',['show','38e5f204fa5c3151ee73af58301a2a3772791a49:'+SPEC],{encoding:'utf8'}));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
let checks=0;const check=fn=>{fn();checks++;};
function adoptedTreatment(s){
 assert.equal(s.branchModel?.branchB,undefined,'unsupported CC-1472 petition branch must not remain current');
 assert.equal(s.branchModel.branchA.participantFilingRequired,false);
 assert.match(s.branchModel.branchA.trigger,/2\.2-402/);
 assert.match(s.branchModel.branchA.rule,/court shall enter an order/);
 assert.equal(s.statutoryAuthority.reliefIsMandatoryOnMotion,false);
 assert.equal(s.procedureAdoption.decisionId,'VA-01');
 assert.equal(s.procedureAdoption.registerSha256,'4ffc56d4cc8dfa9b882f64ad51f49be815704fe20009ee7425b429418b54ead2');
 assert.equal(s.officialForm.officialFormId,null);
 assert.equal(s.officialForm.status,'CURRENT_ROLE_UNESTABLISHED');
 assert.equal(s.legalSectionsBound,false);
 assert.ok(s.documents.every(d=>d.officialFormId===null&&d.outputStrategy!=='official_pdf_fill'));
 assert.ok(!s.participantChecklist.some(c=>c.requiredBeforeFiling));
 assert.deepEqual(s.fieldOwnership.participantAtSigningFields,[]);
 assert.deepEqual(s.fieldOwnership.participantAtServiceFields,[],'no current CC-1472 participant service binding');
 assert.equal(s.serviceAndNotice.serviceRequired,'unestablished');
 assert.equal(s.feeAndWaiver.feeIdentified,false);
 assert.equal(s.feeAndWaiver.feeExemptionEstablished,false);
}
check(()=>adoptedTreatment(spec));
check(()=>assert.throws(()=>adoptedTreatment(historical),/unsupported CC-1472 petition branch/));
check(()=>assert.deepEqual(spec.historicalSupersededSpecification.record,historical));
check(()=>assert.deepEqual(spec.artifactBinding.fixtures,historical.artifactBinding.fixtures));
check(()=>assert.deepEqual(spec.supersession.priorBinding,historical.supersession.priorBinding));
check(()=>assert.deepEqual(spec.fieldOwnership.retainedHistoricalParticipantAtServiceFields,historical.fieldOwnership.participantAtServiceFields));
const currentServiceMutation=structuredClone(spec);currentServiceMutation.fieldOwnership.participantAtServiceFields=historical.fieldOwnership.participantAtServiceFields;
check(()=>assert.throws(()=>adoptedTreatment(currentServiceMutation),/no current CC-1472 participant service binding/));
check(()=>assert.equal(spec.artifactBinding.artifactStatus,'HISTORICAL_EVIDENCE_ONLY'));
for(const fixture of spec.artifactBinding.fixtures){
 const bytes=fs.readFileSync(fixture.file);
 check(()=>assert.equal(bytes.length,fixture.byteLength));
 check(()=>assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.sha256));
}
check(()=>assert.equal(spec.historicalSupersededSpecification.priorFileSha256,createHash('sha256').update(execFileSync('git',['show','38e5f204fa5c3151ee73af58301a2a3772791a49:'+SPEC])).digest('hex')));
const without={...spec};delete without.specificationSha256;
check(()=>assert.equal(spec.specificationSha256,createHash('sha256').update(JSON.stringify(canonical(without))).digest('hex')));
const registered=packetSpecificationFor(spec.routeKey);
check(()=>assert.deepEqual(registered,spec));
check(()=>assert.equal(specificationLegalSectionsBound(registered),false));
check(()=>assert.equal(composablePacketSpecificationFor(spec.routeKey),undefined));
check(()=>assert.deepEqual(packetSpecificationRequiredFactIdsFor(spec.routeKey),[]));
const primary=spec.documents.find(d=>d.documentId==='primary_filing');
check(()=>assert.equal(documentContractFor(primary).instrumentClass,'unresolved'));
check(()=>assert.ok(specificationDocumentRefusals(spec).some(s=>s.includes('actual receiving-court implementation instrument')),'actual missing source, not a fake form refusal'));
for(const legacy of [{},{date_of_birth:'1980-01-01',mailing_address:'Synthetic safe address',phone_number:'202-555-0100',email_address:'synthetic@example.invalid',full_name_at_time_of_arrest:'Synthetic prior name'}, {charges_to_be_expunged:'Synthetic covered offense',final_disposition_dates_and_courts:'Synthetic conviction court'}]){
 const facts={participant_full_legal_name:'Synthetic VA participant',...legacy};const before=structuredClone(facts);
 const result=renderPreflight({snapshot:{jurisdiction:'VA',pathwayId:spec.pathwayId,selectedTrackId:spec.trackId},verificationHash:'synthetic-test-not-acceptance',facts});
 check(()=>assert.deepEqual(result,{ready:false,reason:'no_composable_specification_for_route',missingFactIds:[]}));
 check(()=>assert.deepEqual(facts,before));
}
for(const form of ['CC-1472','CC-1473','CC-1474A']){
 const mutated=structuredClone(spec);mutated.officialForm.officialFormId=form;
 check(()=>assert.throws(()=>adoptedTreatment(mutated)));
}
console.log(JSON.stringify({status:'PASS',checks,refusal:'no_composable_specification_for_route',historicArtifactsVerified:2,limits:'Actual local registered-specification/document-contract/prepayment consumers; no current court instrument, rendered output, hosted journey, signature or commercial acceptance.'},null,2));
