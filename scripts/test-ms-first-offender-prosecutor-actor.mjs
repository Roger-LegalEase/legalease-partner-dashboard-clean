import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {composeGradeAPacket}=await import('../src/lib/rcap/grade-a/composer.ts');
const spec=JSON.parse(fs.readFileSync('data/record-clearing/packet-specifications/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json'));
const facts=Object.fromEntries(spec.requiredFacts.map(f=>[f.factId,`STRUCTURAL ${f.factId}`]));
Object.assign(facts,{participant_full_legal_name:'Marcus Deshawn Whitfield',date_of_birth:'1993-06-08',mailing_address:'218 Pinehurst Avenue, Tupelo, MS 38801',phone_number:'662-555-0148',email_address:'marcus.whitfield@example.org'});
const matter={routeKey:spec.routeKey,jurisdiction:'MS',pathwayId:spec.pathwayId,facts,verifiedAt:'2026-10-15T00:00:00.000Z',verificationHash:'synthetic-structural-not-protected-verification',generationPurpose:'internal_review'};
const packet=composeGradeAPacket(spec,matter);
const actorItem=packet.documents.find(d=>d.documentId==='proposed_order').blocks.flatMap(b=>b.items??[]).find(i=>i.label==='APPROVED AS TO FORM, for the prosecuting authority');
assert.deepEqual(actorItem,{label:'APPROVED AS TO FORM, for the prosecuting authority',value:'',blank:true,completedBy:'prosecutor'});
console.log('PASS exact prosecutor actor on blank approval line');
let checks=1;
const check=fn=>{fn();checks++;};
const field='order_approved_as_to_form';
const section=s=>s.documents.find(d=>d.documentId==='proposed_order').sections.find(s=>s.fields?.includes(field));
const source=JSON.parse(fs.readFileSync('data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/reports/blanks-left-for-the-participant.json'));
check(()=>assert.match(source.protectedBlanks.find(x=>x.field==='proposed_order.approved_as_to_form').why,/prosecuting authority/));
check(()=>assert.ok(spec.fieldOwnership.prosecutorOwnedFields.includes(field)&&!spec.fieldOwnership.courtOwnedFields.includes(field)));
for(const value of ['INJECTED PROSECUTOR NAME','unknown',''])check(()=>assert.deepEqual(composeGradeAPacket(spec,{...matter,facts:{...facts,[field]:value}}),packet));
for(const id of ['order_entry_date','order_judicial_signature'])check(()=>{
 const label=section(spec).fieldLabels[id];
 assert.equal(packet.documents.find(d=>d.documentId==='proposed_order').blocks.flatMap(b=>b.items??[]).find(x=>x.label===label).completedBy,'court');
});
check(()=>assert.equal(packet.documents[0].blocks.flatMap(b=>b.items??[]).find(x=>x.label===spec.documents[0].sections.find(s=>s.fields?.includes('charge')).fieldLabels.charge).completedBy,'participant'));
for(const mutate of [
 s=>{s.fieldOwnership.prosecutorOwnedFields=s.fieldOwnership.prosecutorOwnedFields.filter(id=>id!==field);},
 s=>{s.fieldOwnership.courtOwnedFields.push(field);},
 s=>{s.fieldOwnership.participantOwnedFacts.push(field);},
 s=>{s.fieldOwnership.participantCompletesBeforeFilingFields.push(field);},
 s=>{s.fieldOwnership.participantAtServiceFields.push(field);},
 s=>{s.fieldOwnership.serverOwnedRouteFacts.push(field);}
])check(()=>{const changed=structuredClone(spec);mutate(changed);assert.throws(()=>composeGradeAPacket(changed,{...matter,facts:{...facts,[field]:'UNTRUSTED'}}),/Prosecutor blank/);});
check(()=>assert.throws(()=>composeGradeAPacket(spec,{...matter,verificationHash:''})));
check(()=>assert.throws(()=>composeGradeAPacket(spec,{...matter,routeKey:'MS:other-route'})));
const {resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
check(()=>{const r=resolvePacketCollection({jurisdiction:'MS',pathwayId:spec.pathwayId,specification:spec,requiredInputIds:[field],screeningAnswers:{},serverFacts:{},savedAnswers:{[field]:'UNTRUSTED'}});assert.equal(r.facts.find(x=>x.factId===field).actor,'prosecutor');assert.equal(r.prepayQuestions.includes(field),false);});
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {packetPlanForPathway}=await import('../src/lib/rcap-engine/packet-planner.ts');
const {reviewedContactRepresentation,contactRepresentationHash,isProvenContactOutput}=await import('../src/lib/expungement-ai/contact-representation.ts');
const {packetCollectionFor}=await import('../src/lib/expungement-ai/packet-information.ts');
const profile=getProfileByJurisdiction('MS'),plan=packetPlanForPathway(profile,spec.pathwayId);
check(()=>assert.equal(plan.requiredInputIds.includes(field),false));
const args={profile,pathwayId:spec.pathwayId,specification:spec,requiredInputIds:plan.requiredInputIds,decidingFactIds:new Set(),unresolvedFactIds:new Set()};
const original='de11bdfd88a2ae547adc37725ab791fe660a0d2f4d596e78050fae37bda3ccc9';
check(()=>assert.equal(reviewedContactRepresentation(args)?.contractSha256,original));
const components={mailing_address:facts.mailing_address,phone_number:facts.phone_number,email_address:facts.email_address},aggregate=Object.values(components).join(' | ');
const provenance={version:1,routeKey:spec.routeKey,contractSha256:original,inputSha256:contactRepresentationHash(Object.values(components)),outputSha256:contactRepresentationHash(aggregate)};
check(()=>{const before=structuredClone(provenance);assert.equal(isProvenContactOutput(reviewedContactRepresentation(args),aggregate,provenance),true);assert.deepEqual(provenance,before);});
for(const mutate of [
 s=>{s.requiredFacts.find(f=>f.factId==='mailing_address').use='changed purpose';},
 s=>{s.fieldOwnership.prosecutorOwnedFields.push('mailing_address');},
 s=>{s.documents[0].includeWhen='changed';},
 s=>{s.specificationVersion='unreviewed';}
])check(()=>{const changed=structuredClone(args);mutate(changed.specification);assert.equal(reviewedContactRepresentation(changed),null);});
const resolve=savedAnswers=>packetCollectionFor({jurisdiction:'MS',pathwayId:spec.pathwayId,requiredInputIds:plan.requiredInputIds,serverFacts:{},screeningAnswers:{},savedAnswers,prefilledAnswers:{}});
check(()=>assert.equal(resolve(components).derivedFacts.contact_information,aggregate));
check(()=>{const raw={...components,contact_information:'Original independent raw wording'},before=structuredClone(raw);const r=resolve(raw);assert.equal(r.derivedFacts.contact_information,undefined);assert.equal(r.contactReconciliation.canUseComponents,true);assert.deepEqual(raw,before);});
console.log(`PASS ${checks}: exact prosecutor source actor, no supplied write, other actors preserved, strict owner guards and contact provenance`);
