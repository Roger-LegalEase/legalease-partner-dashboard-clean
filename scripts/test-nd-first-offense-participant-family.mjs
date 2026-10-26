import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { ND_FIRST_OFFENSE_COMPONENTS as components, ND_FIRST_OFFENSE_COMPONENT_IDS as ids, ndFirstOffenseBody } from "./lib/nd-first-offense-possession-composition.mjs";
import { courtFacingRows } from "./rcap-custom-pleading/court-facing-rows.mjs";
const hash = value => createHash("sha256").update(value).digest("hex");
let checks=0; const check=(label,fn)=>{try{fn();checks++;}catch(error){error.message=label+": "+error.message;throw error;}};
const expected = {
  "sourceCommit": "1206486108e80c5fab5d33443922a55cf3dfeaac",
  "builderSha256": "36d734a46c178e7750369d7fbd11bf156f6fd727b5c1fbb53c9c3a7f9cc05310",
  "completeSpecificationSha256": "9fca55d9a073b0f891aeee9d31e61e629e97042dfc35905eb7417ccedb16b290",
  "componentsSha256": "4e056d141aec82d01da81c8a9e4fd7e4e1726b7398c9b13942ba9df91cd9be2b",
  "componentIds": [
    "nd-marijuana-first-offense-seal-primary-filing-1",
    "nd-marijuana-first-offense-seal-proposed-order-2",
    "nd-marijuana-first-offense-seal-legal-effect-explanation-3",
    "nd-marijuana-first-offense-seal-filing-instructions-4"
  ],
  "bodyHashes": {
    "canonical:nd-marijuana-first-offense-seal-primary-filing-1": "8a5b9eff8d1e7193b633f269c3b6be2a274aa8d2bfa8b818cf0d28b0c1ab0017",
    "canonical:nd-marijuana-first-offense-seal-proposed-order-2": "e11b95247f2ae2df7e6306c0ad010099ada8957685c23787333a9075747d09bf",
    "canonical:nd-marijuana-first-offense-seal-legal-effect-explanation-3": "573763d0d47d80fe83c436d1857fd42d2a58518ed97dc914f8626f6bfbb3833d",
    "canonical:nd-marijuana-first-offense-seal-filing-instructions-4": "b14673aab001737d78434b0de3de60a3b089081b5291306e69e7803d1e26d211",
    "boundary:nd-marijuana-first-offense-seal-primary-filing-1": "c7fb810c4777923dc2f3954f655ea417f94c0541808d962e7fb92c1c5b3e942f",
    "boundary:nd-marijuana-first-offense-seal-proposed-order-2": "52efb6a87d60372e27c2283972334fdbba566511c768161632ee4e576bb0548e",
    "boundary:nd-marijuana-first-offense-seal-legal-effect-explanation-3": "f37d22c92b4aa61d194a3dbe3c1e3d9c3d3438ed3432ff575a0b805852f8e530",
    "boundary:nd-marijuana-first-offense-seal-filing-instructions-4": "45ad3c93b585ab2ce37009b308a4059eaa3f254b379995f28ebcaa9fe3a12e96"
  }
};
const builder=fs.readFileSync("scripts/build-census-v1-rcap-nd-custom-pleading.mjs","utf8");
const start=builder.indexOf("const SPEC = ")+"const SPEC = ".length;
const end=builder.indexOf("\n};",start)+2;
// Evaluate only the inert object literal, never import/run the builder or its filesystem setup.
const spec=vm.runInNewContext("("+builder.slice(start,end)+")", {ND_FIRST_OFFENSE_COMPONENTS:components},{timeout:1000});
check("complete original five-route family object remains byte-canonical identical",()=>assert.equal(hash(JSON.stringify(spec)),expected.completeSpecificationSha256));
check("exact four adopted component objects remain unchanged",()=>assert.equal(hash(JSON.stringify(components)),expected.componentsSha256));
check("source component arrays and descriptions cannot mutate after binding",()=>{assert.throws(()=>components[0].body.push("invented"),TypeError);assert.throws(()=>{components[0].title="Changed"},TypeError);});
check("only exact first-offense component membership",()=>assert.deepEqual(ids,expected.componentIds));
for(const [fixture,facts] of Object.entries(spec.fixtures))for(const id of ids)check(fixture+":"+id+" exact retained body",()=>assert.equal(hash(ndFirstOffenseBody(id,facts)),expected.bodyHashes[fixture+":"+id]));
check("wrong component refuses",()=>assert.throws(()=>ndFirstOffenseBody("nd-seal-felony-conviction-primary-filing-1",spec.fixtures.canonical),/Unknown/));
check("absent identity is never substituted from fixture",()=>assert.throws(()=>ndFirstOffenseBody(ids[0],{}),/missing exact participant fact/));
console.log(JSON.stringify({status:"PASS_ND_CANONICAL_COMPONENT_EXTRACTION",checks,sourceCommit:expected.sourceCommit,componentSha256:expected.componentsSha256,noFamilyRun:true,noRender:true}));

// Current participant consumer checks: source/mapping, not a delivery authorization.
const {register}=await import('node:module');register('./lib/ts-esm-loader.mjs',import.meta.url);
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {composeParticipantDeliveryPacket,hasParticipantFamilyComposer}=await import('../src/lib/rcap/grade-a/participant-packet.ts');
const {composeNdFirstOffenseParticipantPacket,composeNdFirstOffenseInternalReview}=await import('../src/lib/rcap/grade-a/families/nd-first-offense-possession-set.ts');
const {ND_FIRST_OFFENSE_FAMILY:source}=await import('../src/lib/expungement-ai/nd-first-offense-family-inputs.ts');
const {contactRepresentationHash}=await import('../src/lib/expungement-ai/contact-representation.ts');
const {packetCollectionFor,ndFirstOffenseFamilyContract}=await import('../src/lib/expungement-ai/packet-information.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const route='ND:first-offense-possession-sealing';
const specification=packetSpecificationFor(route);
const matter={routeKey:route,jurisdiction:'ND',pathwayId:source.route,facts:{participant_full_legal_name:'Explicit Synthetic Person',date_of_birth:'1991-04-17',mailing_address:'17 Exact Mailing Street',phone_number:'+1 701 555 0101',email_address:'Exact.Local+ND@Example.test'},verificationHash:'a'.repeat(64),verifiedAt:'2026-10-14T00:00:00Z',generationPurpose:'internal_review'};
const packet=composeParticipantDeliveryPacket(specification,matter);
const text=packet=>packet.documents.flatMap(d=>d.blocks.map(b=>JSON.stringify(b))).join('\n');
check('held review shares exact adapter result and source bodies without verification or delivery claim',()=>{const held=composeNdFirstOffenseInternalReview(specification,matter);assert.deepEqual(held.packet,packet);assert.equal(held.componentBodies.length,4);assert.equal(held.protectedRecordHash,matter.verificationHash);for(const key of ['finalVerificationAsserted','generationAllowed','deliveryAllowed','commercialAuthorityGranted'])assert.equal(held[key],false);assert.equal(held.internalReviewOnly,true);assert.throws(()=>composeNdFirstOffenseInternalReview(specification,{...matter,generationPurpose:'participant_delivery'}),/explicitly requested/);const absent=composeNdFirstOffenseInternalReview(specification,{...matter,facts:{},verifiedAt:''});assert.deepEqual(absent.missingIdentityIds,['participant_full_legal_name','date_of_birth']);assert(absent.componentBodies.every(c=>!c.body.includes('Jordan Avery Reyes')));});
check('exact current specification is pinned and exact route composer registered',()=>{assert.equal(contactRepresentationHash(specification),source.successorSpecificationCanonicalSha256);assert(ndFirstOffenseFamilyContract(getProfileByJurisdiction('ND'),source.route));assert(hasParticipantFamilyComposer(source.familyId,route));assert(!hasParticipantFamilyComposer(source.familyId,'ND:other'));});
check('four exact source components and original conditional order retained',()=>{assert.deepEqual(packet.documents.map(d=>d.documentId),ids);const order=specification.documents[1];assert.equal(order.requirement,'conditional');assert.equal(order.includeWhen,'always_unless_participant_declines');assert(order.conditionDescription.includes('does not require'));assert.equal(packet.documents.filter(d=>d.courtFacing).length,2);});
check('all source text after each caption survives unchanged, including all blank lines',()=>{const facts=Object.fromEntries(Object.entries({participant_full_legal_name:'participant.full_legal_name',date_of_birth:'participant.date_of_birth',mailing_address:'participant.street_address',phone_number:'participant.phone',email_address:'participant.email'}).map(([id,key])=>[key,matter.facts[id]]));for(let i=0;i<4;i++){const sourceLines=ndFirstOffenseBody(ids[i],facts).split('\n').flatMap(courtFacingRows(line=>[line]));if(i<2){assert.deepEqual(packet.documents[i].blocks.slice(2).flatMap(b=>b.kind==='pleading_identity_list'?[b.introduction,...b.items.map(item=>item.label)]:[b.text]),sourceLines.slice(13));const caption=packet.documents[i].blocks[1];assert.equal(caption.matterTitle,sourceLines[5]+' '+sourceLines[6]);assert.equal(caption.caseNumberLabel,sourceLines[8]);assert.equal(caption.title,sourceLines[11]);}else assert.deepEqual(packet.documents[i].blocks.map(b=>b.text),sourceLines);}});
check('actor-owned mapping and source-required blanks exactly preserved',()=>{const map=JSON.parse(fs.readFileSync(source.mapPath));for(const c of components){const mapped=map.maps.find(row=>row.documentId===c.id);assert(mapped);for(const field of c.writes)assert(mapped.canonicalWrites.some(w=>w.field===c.id+'.'+field.id&&w.factId===field.factId));for(const blank of c.blanks)assert(mapped.canonicalRefusals.some(w=>w.field===c.id+'.'+blank.id));}assert.equal(specification.serviceAndNotice.serviceRequired,false);assert(specification.documents.every(d=>d.documentContract.serviceTreatment==='no_service'));assert.deepEqual(specification.fieldOwnership.participantAtServiceFields,[]);});
check('all ten record questions remain participant handbacks, never added intake gates',()=>{const required=specification.requiredFacts.map(f=>f.factId);const collection=packetCollectionFor({jurisdiction:'ND',pathwayId:source.route,requiredInputIds:required,screeningAnswers:{},serverFacts:{}});for(const id of specification.fieldOwnership.participantCompletesBeforeFilingFields){const fact=collection.facts.find(f=>f.factId===id);assert.equal(fact?.collection,'external_actor',id);assert.equal(fact.actor,'participant_before_filing',id);}});
check('legacy service/caption and record values never alias or fill source handbacks',()=>{const changed={...matter,facts:{...matter.facts,contact_information:'NOT A MAILING ADDRESS',residency_or_location:'NOT A COUNTY',court:'DO NOT INFER COURT',case_number:'DO NOT FILL CASE',mjCounty:'DO NOT FILL COUNTY',mjCourtType:'DO NOT FILL COURT TYPE',mjFirstOffence:'DO NOT ASSERT',offense_category:'Controlled substance possession',offense_level:'Misdemeanor'}};assert.deepEqual(composeParticipantDeliveryPacket(specification,changed),packet);});
for(const id of ['mailing_address','phone_number','email_address'])for(const raw of [undefined,'','unknown','unavailable','no disponible'])check('optional/unavailable contact remains blank '+id+':'+raw,()=>{const facts={...matter.facts};if(raw===undefined)delete facts[id];else facts[id]=raw;const out=composeParticipantDeliveryPacket(specification,{...matter,facts});assert.equal(out.documents.length,4);if(raw)assert(!text(out).includes(raw));assert(!specification.requiredFacts.find(f=>f.factId===id).requiredForGeneration);});
for(const id of ['participant_full_legal_name','date_of_birth'])check('absent identity refuses delivery composition but held internal review never invents it '+id,()=>{const facts={...matter.facts};delete facts[id];assert.throws(()=>composeParticipantDeliveryPacket(specification,{...matter,facts,generationPurpose:'participant_delivery'}),/Missing exact participant identity/);const out=composeParticipantDeliveryPacket(specification,{...matter,facts});assert(!text(out).includes('Jordan Avery Reyes'));assert(!text(out).includes(matter.facts[id]));});
for(const date of ['2030-01-01','1991-02-30','unknown','17 April 1991'])check('invalid or unavailable DOB is never printed '+date,()=>{const facts={...matter.facts,date_of_birth:date};assert.throws(()=>composeParticipantDeliveryPacket(specification,{...matter,facts,generationPurpose:'participant_delivery'}),/Missing exact participant identity/);assert(!text(composeParticipantDeliveryPacket(specification,{...matter,facts})).includes(date));});
for(const mutate of [s=>s.documents[0].title='Changed',s=>s.documents.reverse(),s=>s.documents.pop(),s=>s.documents[1].requirement='required',s=>s.documents[0].documentContract.serviceTreatment='participant_serves',s=>s.requiredFacts.push({factId:'new_gate'}),s=>s.sourceIdentities.pop(),s=>s.profileVersion='changed'])check('unmatched source/specification refuses',()=>{const s=structuredClone(specification);mutate(s);assert.throws(()=>composeNdFirstOffenseParticipantPacket(s,matter),/unmatched source/);});
for(const change of [{jurisdiction:'KS'},{routeKey:'ND:other'},{pathwayId:'other'},{verificationHash:''}])check('wrong matter or unbound source refuses '+JSON.stringify(change),()=>assert.throws(()=>composeNdFirstOffenseParticipantPacket(specification,{...matter,...change}),/required|hash/));
check('missing verification date never acquires delivery authority',()=>assert.throws(()=>composeParticipantDeliveryPacket(specification,{...matter,verifiedAt:'',generationPurpose:'participant_delivery'}),/verified-at/));
// Exercise the actual existing renderer; no fabricated final-verification appendix.
const {renderGradeAPacketPdf}=await import('../src/lib/rcap/grade-a/renderer.ts');
const {PDFDocument}=await import('pdf-lib');
const {extractTextItems}=await import('./rcap-official-forms/rcap-pdf-anchor-capture.mjs');
const internal=composeNdFirstOffenseInternalReview(specification,{...matter,verifiedAt:''});
const courtBytes=await renderGradeAPacketPdf(structuredClone(internal.packet),{variant:'court_only'});
const courtPdf=await PDFDocument.load(courtBytes),courtText=courtPdf.getPages().flatMap(page=>extractTextItems(page).map(item=>item.text)).join(' ').replace(/\s+/g,' ');
check('actual court renderer excludes exact internal metadata and false verification, retaining legal and participant ink',()=>{
 assert(!courtText.includes('obligation:track-pathway:ND:'));assert(!courtText.includes('Route:'));assert(!courtText.includes('Prepared from verification'));assert(!courtText.includes('confirmed at final verification'));
 for(const text of ['MOTION TO SEAL A FIRST MARIJUANA OR THC POSSESSION','PROPOSED ORDER','Explicit Synthetic Person','17 Exact Mailing Street','+1 701 555 0101','Exact.Local+ND@Example.test','SIGNATURE OF PETITIONER','ORDERS that','Which North Dakota county?','district court or municipal court?'])assert(courtText.includes(text),text);
 assert.equal(internal.packet.documents.length,4);assert(internal.componentBodies.every(c=>c.body.includes('Route: obligation:')));assert(internal.packet.documents.every(d=>!JSON.stringify(d.blocks).includes('obligation:track-pathway:')));
});
check('all ten exact source handbacks group each question with two retained dotted lines',()=>{
 const blocks=internal.packet.documents[0].blocks,groups=blocks.filter(b=>b.kind==='pleading_identity_list');assert.equal(groups.length,10);
 for(let i=0;i<10;i++){const group=groups[i],index=blocks.indexOf(group);assert(group.introduction.startsWith('[C'+(i+1)+' - mj '));assert.equal(group.keepWithNext,true);assert.equal(group.listMarker,'none');assert.deepEqual(group.items,[{label:'.'.repeat(84),value:''},{label:'.'.repeat(84),value:''}]);assert.deepEqual(blocks[index+1],{kind:'pleading_paragraph',text:''});}
 const pages=courtPdf.getPages().map(page=>extractTextItems(page).map(item=>item.text));
 for(let n=1;n<=10;n++){const rows=pages.find(rows=>rows.some(text=>text.startsWith('[C'+n+' - mj ')));assert(rows,'question '+n);const index=rows.findIndex(text=>text.startsWith('[C'+n+' - mj ')),following=rows.slice(index+1),next=following.findIndex(text=>/^\[C(?:[1-9]|10) - mj /.test(text)),tail=next<0?following:following.slice(0,next);const dots=tail.filter(text=>text==='.'.repeat(84));assert.equal(dots.length,2,'same-page answer lines for C'+n);}
});
const priorMetadataPacket=structuredClone(internal.packet);
for(let i=0;i<priorMetadataPacket.documents.length;i++)priorMetadataPacket.documents[i].blocks.at(-1).text=internal.componentBodies[i].body.split('\n').at(-1);
const priorMetadataBytes=await renderGradeAPacketPdf(priorMetadataPacket,{variant:'court_only'});
const priorMetadataPdf=await PDFDocument.load(priorMetadataBytes),priorMetadataText=priorMetadataPdf.getPages().flatMap(page=>extractTextItems(page).map(item=>item.text)).join(' ');
check('actual-render negative control detects original metadata defect',()=>{assert(priorMetadataText.includes('Route:'));assert(priorMetadataText.includes('obligation:track-pathway:ND:'));assert(!courtText.includes('obligation:track-pathway:ND:'));});
console.log(JSON.stringify({status:'PASS_ND_CANONICAL_PARTICIPANT_BRIDGE',checks,noFamilyRun:true,actualCourtOnlyRender:true,noDeliveryAcceptance:true}));
