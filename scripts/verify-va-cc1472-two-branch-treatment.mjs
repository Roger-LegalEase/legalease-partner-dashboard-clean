#!/usr/bin/env node
// Historical command retained. VA-01 supersedes its former premise that an
// unverified CC-1472 participant petition was a current second branch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const VA_V3_REGISTER = '3f8998b2fdba92b77c6804934c949bb367bf4c945ca2826d6b119da0e81cdf0b';
const VA_OLD_REGISTER = '4ffc56d4cc8dfa9b882f64ad51f49be815704fe20009ee7425b429418b54ead2'; // immutable predecessor ancestry
const VA_SOURCE = '85ac8ea0f2dc40d890fa2b37921a1b24956ed4aecb1555109a0bb5a65793c656';
const VA_URL = 'https://www.fairfaxcounty.gov/circuit/sites/circuit/files/assets/documents/pdf/expungement-order.pdf';
// Portable metadata tuple only; private PDF bytes were independently checked in custody.
// CI has no dependency on the ignored private source path and performs no network acquisition.
const sourceSuccessor = s => s.procedureAdoption?.registerSha256 === VA_V3_REGISTER
  && s.procedureAdoption?.supersededRegisterSha256 === VA_OLD_REGISTER
  && s.procedureAdoption?.currentInstrument?.officialFormId === 'CC-1474'
  && s.procedureAdoption.currentInstrument.revision === '07/26'
  && s.procedureAdoption.currentInstrument.sourceUrl === VA_URL
  && s.procedureAdoption.currentInstrument.sha256 === VA_SOURCE
  && s.procedureAdoption.currentInstrument.custodyReceipt === 'data/rcap-grade-a/source-custody/court-source-handoff-20261013/va-cc1474-current-source-20261016.json';
const {specificationDocumentRefusals,documentContractFor}=await import('../src/lib/rcap/grade-a/document-contract.ts');
const {packetSpecificationFor,composablePacketSpecificationFor,packetSpecificationRequiredFactIdsFor,specificationLegalSectionsBound}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {renderPreflight}=await import('../src/lib/expungement-ai/render-preflight.ts');
const SPEC='data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json';
const spec=JSON.parse(fs.readFileSync(SPEC));
// Full predecessor bytes are retained in the tracked specification; no remote
// or local-worker Git history is needed for this check.
const historical=spec.historicalSupersededSpecification.record;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
let checks=0;const check=fn=>{fn();checks++;};
function adoptedTreatment(s){
 assert.equal(s.branchModel?.branchB,undefined,'unsupported CC-1472 petition branch must not remain current');
 assert.equal(s.branchModel.branchA.participantFilingRequired,false);
 assert.match(s.branchModel.branchA.trigger,/2\.2-402/);
 assert.match(s.branchModel.branchA.rule,/court shall enter an order/);
 assert.equal(s.statutoryAuthority.reliefIsMandatoryOnMotion,false);
 assert.equal(s.procedureAdoption.decisionId,'VA-01');
 assert.ok(sourceSuccessor(s), 'exact adopted v3/source successor');
 assert.equal(s.officialForm.officialFormId,'CC-1474');
 assert.equal(s.officialForm.sourceSha256,VA_SOURCE);
 assert.equal(s.officialForm.status,'NOT_VERIFIED');
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
check(()=>assert.equal(spec.historicalSupersededSpecification.priorFileSha256,'6b420997ef1c3638f80694e95ec2a9d35e8695962808f91ae305b409960d7a9c'));
check(()=>assert.equal(createHash('sha256').update(JSON.stringify(historical,null,2)+'\n').digest('hex'),'6b420997ef1c3638f80694e95ec2a9d35e8695962808f91ae305b409960d7a9c'));
const oldContent={...historical};delete oldContent.specificationSha256;
check(()=>assert.equal(createHash('sha256').update(JSON.stringify(canonical(oldContent))).digest('hex'),'b1ca5efc07c82a3ff81e77c039fb89ca773271cc69946d8c4506197e1da3a3f2'));
const without={...spec};delete without.specificationSha256;
check(()=>assert.equal(spec.specificationSha256,createHash('sha256').update(JSON.stringify(canonical(without))).digest('hex')));
const registered=packetSpecificationFor(spec.routeKey);
check(()=>assert.deepEqual(registered,spec));
check(()=>assert.equal(specificationLegalSectionsBound(registered),false));
check(()=>assert.equal(composablePacketSpecificationFor(spec.routeKey),undefined));
check(()=>assert.deepEqual(packetSpecificationRequiredFactIdsFor(spec.routeKey),[]));
const primary=spec.documents.find(d=>d.documentId==='primary_filing');
check(()=>assert.equal(documentContractFor(primary).instrumentClass,'court_generated'));
check(()=>assert.equal(documentContractFor(primary).preparedBy,'court'));
check(()=>assert.equal(documentContractFor(primary).signer,'judge'));
check(()=>assert.equal(specificationDocumentRefusals(spec).length,0,'court-generated attributes may resolve; actual composition still refuses legalSectionsBoundfalse'));
check(()=>assert.equal(spec.documents[0].officialFormId,null,'no live official population from source metadata'));
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
console.log(JSON.stringify({status:'PASS',checks,refusal:'no_composable_specification_for_route',historicArtifactsVerified:2,limits:'Actual local registered-specification/document-contract/prepayment consumers; portable source metadata/court-owned contract only; actual case and applicable source/guidance/context/nonrequirement consumer/output acceptance remain; geometry only if demonstrated applicable output requires it. No hosted journey, official execution or commerce acceptance.'},null,2));
