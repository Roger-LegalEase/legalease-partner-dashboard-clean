import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
register(pathToFileURL(path.resolve('scripts/lib/ts-esm-loader.mjs')));
const {composeGradeAPacket}=await import('../src/lib/rcap/grade-a/composer.ts');
const file='data/record-clearing/packet-specifications/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json';
const spec=JSON.parse(fs.readFileSync(file));
// Synthetic structural witness only; no eligibility, verification or owner claim.
const facts=Object.fromEntries(spec.requiredFacts.map(f=>[f.factId,`STRUCTURAL ${f.factId}`]));
facts.participant_full_legal_name='Jordan Avery Reyes';
Object.assign(facts,{mailing_address:'42 Peachtree Lane, Atlanta, GA 30303',phone_number:'404-555-0142',email_address:'jordan.reyes@example.org'});
const matter={routeKey:spec.routeKey,jurisdiction:'GA',pathwayId:spec.pathwayId,facts,verificationHash:'internal-structural-not-protected-verification',verifiedAt:'2026-10-15T00:00:00.000Z',generationPurpose:'internal_review'};
const packet=composeGradeAPacket(spec,matter);
const expected={primary_filing:['primary_filing_otn','primary_filing_judge'],proposed_order:['proposed_order_otn','proposed_order_judge'],certificate_of_service:['certificate_of_service_otn']};
const actual=Object.fromEntries(Object.keys(expected).map(id=>[id,packet.documents.find(d=>d.documentId===id)?.blocks.find(b=>b.kind==='pleading_caption')?.blankFields?.map(f=>f.field)??[]]));
assert.deepEqual(actual,expected,'Five exact adopted caption blanks must have actual composed destinations');
console.log('PASS: five source-owned SB288 caption blanks consumed');
let checks=1;
const check=(fn)=>{fn();checks++;};
const captions=()=>packet.documents.flatMap(d=>d.blocks.filter(b=>b.kind==='pleading_caption'));
check(()=>assert.deepEqual(captions().flatMap(b=>b.blankFields??[]).map(f=>[f.field,f.completedBy]),Object.values(expected).flat().map(f=>[f,f.endsWith('_judge')?'court':'participant'])));
check(()=>assert.equal(JSON.stringify(packet).includes('certificate_of_service_judge'),false));
const primary=spec.documents.find(d=>d.documentId==='primary_filing').sections.find(s=>s.captionContract);
const sourceLabel=spec.documents.find(d=>d.documentId==='proposed_order').sections.find(s=>s.fields?.includes('proposed_order_blank_3')).fieldLabels.proposed_order_blank_3;
check(()=>assert.ok(packet.documents.find(d=>d.documentId==='proposed_order').blocks.some(b=>b.items?.some(i=>i.label===sourceLabel&&i.blank&&i.value===''&&i.completedBy==='court'))));
const blankIds=[...Object.values(expected).flat(),'certificate_of_service_judge','proposed_order_blank_3'];
for(const value of ['INJECTED MUST NEVER PRINT','unknown',''])check(()=>assert.deepEqual(composeGradeAPacket(spec,{...matter,facts:{...facts,...Object.fromEntries(blankIds.map(id=>[id,value]))}}),packet));
for(const mutate of [
 s=>{s.blankFields=['not_declared'];},
 s=>{s.blankFields=['primary_filing_otn','primary_filing_otn'];},
 s=>{s.blankFields=Array(1);},
 s=>{s.blankFields='primary_filing_otn';},
 s=>{s.blankFields=null;},
 s=>{s.courtLines=[];}
])check(()=>{const changed=structuredClone(spec);mutate(changed.documents[0].sections.find(s=>s.captionContract).captionContract);assert.throws(()=>composeGradeAPacket(changed,matter),/Caption blank/);});
for(const mutate of [
 s=>{s.fieldTreatments.primary_filing_otn='value';},
 s=>{s.fieldTreatments.primary_filing_otn='value_or_ruled_blank';},
 s=>{s.fieldTreatments.primary_filing_otn='court_owned_space';},
 s=>{delete s.fieldLabels.primary_filing_otn;},
 s=>{s.fields=s.fields.filter(id=>id!=='primary_filing_otn');}
])check(()=>{const changed=structuredClone(spec);mutate(changed.documents[0].sections.find(s=>s.captionContract));assert.throws(()=>composeGradeAPacket(changed,matter),/Caption blank/);});
check(()=>{const changed=structuredClone(spec);changed.fieldOwnership.participantCompletesBeforeFilingFields=changed.fieldOwnership.participantCompletesBeforeFilingFields.filter(id=>id!=='primary_filing_otn');assert.throws(()=>composeGradeAPacket(changed,{...matter,facts:{...facts,primary_filing_otn:'INJECTED'}}),/Caption blank/);});
check(()=>assert.throws(()=>composeGradeAPacket(spec,{...matter,routeKey:'GA:another-route'})));
check(()=>assert.throws(()=>composeGradeAPacket(spec,{...matter,verificationHash:''})));
check(()=>{const missing={...facts};delete missing.participant_full_legal_name;assert.throws(()=>composeGradeAPacket(spec,{...matter,facts:missing}));});
check(()=>assert.equal(primary.captionContract.optionalIdentifier,undefined));
// All service blanks stay source-defined handbacks. Recipient addresses can be
// prepared; the method is settled only at service, as the unchanged notice says.
const service=spec.documents.find(d=>d.documentId==='certificate_of_service');
for(let n=1;n<=5;n++)check(()=>{const id=`certificate_of_service_blank_${n}`;assert.ok(spec.fieldOwnership.participantCompletesBeforeFilingFields.includes(id));assert.equal(service.sections.find(s=>s.fields?.includes(id)).fieldTreatments[id],'ruled_blank');});
check(()=>assert.ok(JSON.stringify(service).includes('It is completed and signed when the copies actually go out.')));
check(()=>assert.equal(spec.requiredFacts.some(f=>blankIds.includes(f.factId)),false));
// The whole-document contact guard recognizes only this exact successor while
// preserving the old representation identity and independently supplied raw text.
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {packetPlanForPathway}=await import('../src/lib/rcap-engine/packet-planner.ts');
const {reviewedContactRepresentation,contactRepresentationHash,isProvenContactOutput}=await import('../src/lib/expungement-ai/contact-representation.ts');
const {packetCollectionFor}=await import('../src/lib/expungement-ai/packet-information.ts');
const profile=getProfileByJurisdiction('GA'),plan=packetPlanForPathway(profile,spec.pathwayId);
const args={profile,pathwayId:spec.pathwayId,specification:spec,requiredInputIds:plan.requiredInputIds,decidingFactIds:new Set(),unresolvedFactIds:new Set()};
const original='d66448eba0f5acf7f33f540a6ec5b674e575a8428a982b629a80b22f95585552';
check(()=>assert.equal(reviewedContactRepresentation(args)?.contractSha256,original));
const components={mailing_address:facts.mailing_address,phone_number:facts.phone_number,email_address:facts.email_address};
const aggregate=Object.values(components).join(' | ');
const provenance={version:1,routeKey:spec.routeKey,contractSha256:original,inputSha256:contactRepresentationHash(Object.values(components)),outputSha256:contactRepresentationHash(aggregate)};
check(()=>{const before=structuredClone(provenance);assert.equal(isProvenContactOutput(reviewedContactRepresentation(args),aggregate,provenance),true);assert.deepEqual(provenance,before);});
for(const mutate of [
 s=>{s.requiredFacts.find(f=>f.factId==='mailing_address').use='Different purpose';},
 s=>{s.fieldOwnership.participantOwnedFacts=s.fieldOwnership.participantOwnedFacts.filter(id=>id!=='mailing_address');s.fieldOwnership.courtOwnedFields.push('mailing_address');},
 s=>{s.documents[0].sections.find(x=>JSON.stringify(x).includes('{{mailing_address}}')).body+=' {{mailing_address}}';},
 s=>{s.documents[0].includeWhen='unreviewed';},
 s=>{s.specificationVersion='unreviewed';}
])check(()=>{const changed=structuredClone(args);mutate(changed.specification);assert.equal(reviewedContactRepresentation(changed),null);});
const resolve=savedAnswers=>packetCollectionFor({jurisdiction:'GA',pathwayId:spec.pathwayId,requiredInputIds:plan.requiredInputIds,serverFacts:{},screeningAnswers:{},savedAnswers,prefilledAnswers:{}});
check(()=>assert.equal(resolve(components).derivedFacts.contact_information,aggregate));
check(()=>{const raw={...components,contact_information:'Independent earlier contact wording'},before=structuredClone(raw),r=resolve(raw);assert.deepEqual(raw,before);assert.equal(r.derivedFacts.contact_information,undefined);assert.equal(r.contactReconciliation.canUseComponents,true);});
check(()=>assert.equal(resolve({...components,phone_number:{value:components.phone_number,unknown:true}}).derivedFacts.contact_information,undefined));
// Rendering is opt-in and writes only a new external internal-review artifact.
const outputIndex=process.argv.indexOf('--held-output');
if(outputIndex!==-1){
 const target=path.resolve(process.argv[outputIndex+1]??'');
 assert.ok(process.argv[outputIndex+1]&&path.extname(target)==='.pdf'&&!target.startsWith(path.resolve('.')+path.sep),'external PDF path required');
 assert.equal(fs.existsSync(target),false,'preserve prior artifacts');
 const {renderGradeAPacketPdf}=await import('../src/lib/rcap/grade-a/renderer.ts');
 const bytes=await renderGradeAPacketPdf(structuredClone(packet),{variant:'court_only'});
 fs.writeFileSync(target,bytes,{flag:'wx'});
 fs.writeFileSync(`${target}.composition.json`,JSON.stringify({scope:'Synthetic structural internal review, not authenticated owner or legal/output approval',matter,packet},null,2)+'\n',{flag:'wx'});
 console.log(`Held structural PDF: ${target}`);
}
console.log(`PASS ${checks}: exact caption blanks, actor ownership, phantom absence, strict refusals and no supplied-value inference`);
