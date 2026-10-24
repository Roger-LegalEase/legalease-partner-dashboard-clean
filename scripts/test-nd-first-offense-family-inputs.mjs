import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const N=await import('../src/lib/expungement-ai/nd-first-offense-family-inputs.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {contactRepresentationHash}=await import('../src/lib/expungement-ai/contact-representation.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const source=N.ND_FIRST_OFFENSE_FAMILY,read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),hash=b=>createHash('sha256').update(b).digest('hex');
let checks=0;const check=(label,fn)=>{try{fn();checks++;}catch(error){error.message=label+': '+error.message;throw error;}};
const map=json(source.mapPath),primary=map.maps.find(row=>row.documentId===source.componentId);
check('exact retained family source and participant destinations',()=>{
 assert.equal(hash(read(source.mapPath)),source.mapSha256);
 assert.equal(hash(read(source.mapPath.replace('production-field-map.json','source-receipt.json'))),source.sourceReceiptSha256);
 assert.equal(map.familyId,source.familyId);assert.equal(map.generationAllowed,false);assert.equal(map.runtimeSelectable,false);
 for(const field of N.ND_FIRST_OFFENSE_CONTACT_FIELDS){assert(primary.canonicalWrites.some(write=>write.field===source.componentId+'.'+field.field&&write.factId==='participant.'+field.participantKey));assert(!map.requiredBeforeFiling.some(item=>item.field===source.componentId+'.'+field.field));}
 assert(!primary.canonicalWrites.some(write=>['contact_information','residency_or_location'].includes(write.factId)));
});
const memo=json('data/record-clearing/legal-design-intake/ND.memo.json').tracks.find(row=>row.trackId===source.track);
check('source county and court-type handbacks retain distinct questions and actors',()=>{
 for(const field of N.ND_FIRST_OFFENSE_LOCATION_HANDBACKS){assert(memo.participantInputs.some(item=>item.key===field.sourceKey&&item.question===field.question));assert(primary.canonicalRefusals.some(item=>item.field===source.componentId+'.'+field.field&&item.participantMustSupply===field.question&&item.disposition==='REQUIRED_BEFORE_FILING'));}
 assert.equal(memo.rules.service,'None stated by the subsection.');
 assert.equal(memo.rules.filing,'File the motion in the existing criminal case with the clerk of court.');
});
check('existing exact family approvals retained, no renewed approval inferred',()=>{
 const adoption=json('data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json');
 assert(adoption.boundFamilies.some(row=>row.familyJobId===source.familyId));
 assert(adoption.familiesCarryingSupersededTechnicalResult.some(row=>row.familyJobId===source.familyId&&row.note.includes('legal design is unchanged and adopted')));
 const approval=json('data/rcap-ledger/completed-output-counsel-manifest.json').families.find(row=>row.familyId===source.familyId);
 assert.equal(approval.legalDecisionRecordId,source.approvalId);assert.equal(approval.legalApprovalResult,'approved_by_decision_owner');assert.equal(approval.adoptedLegalDesignRecord,source.adoptionId);
 assert(approval.tracksServed.includes(source.track));
});
const witness=json('data/rcap-ledger/public-witness-fixtures.json').fixtures.find(row=>row.pathwayKey==='ND:'+source.route);
const authoritative=evaluate({jurisdiction:'ND',profileVersion:witness.profileVersion,matterId:'synthetic-nd-family-inputs',answers:witness.answers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:witness.answers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});
assert(seed);const original=structuredClone(seed.snapshot),snap=structuredClone(original);
check('actual retained witness remains held and never supplies eligibility',()=>{
 assert.equal(contactRepresentationHash(getProfileByJurisdiction('ND')),source.profileSha256);
 assert.equal(snap.pathwayId,source.route);assert.equal(snap.resultCode,'needs_review');assert.equal(snap.paymentAllowed,false);
 assert(N.ndFirstOffenseFamilyInputs(snap));assert.equal(P.protectedPacketDraftHash(snap),seed.hash);
});
Object.assign(snap.packetAnswers,{contact_information:'Service address only: 18 Earlier Street',residency_or_location:'Earlier judicial district',mjCounty:'County history',mjCourtType:'District history'});
check('generic and record-purpose answers cannot supply canonical contact or caption writes',()=>{
 const before=structuredClone(snap),out=N.ndFirstOffenseFamilyInputs(snap);assert.deepEqual(out.writes,[]);assert.deepEqual(out.universallyRequiredContactIds,[]);
 assert.deepEqual(out.legacyPurposeIdsNotAliased,['contact_information','residency_or_location']);
 assert(out.locationHandbacks.every(field=>field.actor==='participant_before_filing'&&!Object.hasOwn(field,'value')));
 assert.equal(out.serviceAddressIsMailingAddress,false);assert.equal(out.countyIsJudicialDistrict,false);assert.equal(out.courtTypeInferred,false);
 assert.deepEqual(snap,before);
});
const values={mailing_address:{value:'42 Exact Mailing Street, Unit 7',unknown:false},phone_number:{value:'+1 701 555 0101 ext 04',unknown:false},email_address:{value:'Exact.Local+ND@Example.TEST',unknown:false}};
Object.assign(snap.packetAnswers,values);
check('only explicit participant contact facts map to existing fields',()=>{
 const before=structuredClone(snap),out=N.ndFirstOffenseFamilyInputs(snap);assert.equal(out.writes.length,3);assert.deepEqual(out.conflictingIds,[]);
 for(const write of out.writes)assert.equal(write.value,values[write.factId].value);
 assert(out.writes.every(write=>primary.canonicalWrites.some(item=>item.field===write.field&&item.factId==='participant.'+write.participantKey)));
 assert.deepEqual(snap,before);assert.deepEqual(snap.packetPlan,original.packetPlan);
 for(const flag of ['generationAllowed','deliveryAllowed','admissionGranted','aggregateContactParsed','routeSelectedByContact'])assert.equal(out[flag],false);
});
for(const field of N.ND_FIRST_OFFENSE_CONTACT_FIELDS){
 for(const raw of [undefined,'','unknown','unavailable','no disponible','confidential',{unknown:true},{value:values[field.id].value,unknown:true},[values[field.id].value],{value:values[field.id].value},{value:values[field.id].value,unknown:false,authority:true},true,1])check('unknown/unavailable/malformed remains saved without false known write '+field.id+JSON.stringify(raw),()=>{
  const s=structuredClone(snap);s.packetAnswers[field.id]=raw;const before=structuredClone(s),out=N.ndFirstOffenseFamilyInputs(s);
  assert(!out.writes.some(write=>write.factId===field.id));assert(out.unavailableIds.includes(field.id));assert.deepEqual(out.universallyRequiredContactIds,[]);assert.deepEqual(s,before);
 });
 for(const sourceMap of ['screeningAnswers','prefilledAnswers'])check('conflicting protected copies withheld '+field.id+'/'+sourceMap,()=>{
  const s=structuredClone(snap);s[sourceMap][field.id]={value:'Different protected fact',unknown:false};const before=structuredClone(s),out=N.ndFirstOffenseFamilyInputs(s);
  assert(out.conflictingIds.includes(field.id));assert(!out.writes.some(write=>write.factId===field.id));assert.deepEqual(s,before);
 });
 check('exact same known wrapper or scalar reuses same actor fact '+field.id,()=>{const s=structuredClone(snap);s.prefilledAnswers[field.id]=values[field.id].value;assert(!N.ndFirstOffenseFamilyInputs(s).conflictingIds.includes(field.id));assert.equal(N.ndFirstOffenseFamilyInputs(s).writes.length,3);});
}
for(const [left,right,conflict]of [[{value:'old',unknown:true},{unknown:true,value:'old'},false],[{value:'old',unknown:true},{unknown:true,value:'different'},true],[{value:1,unknown:true},{unknown:true,value:'1'},true],['José','Jose',true],['Exact.Local@Example.TEST','exact.local@Example.TEST',true]])check('raw unknown and identity distinctions preserved '+JSON.stringify([left,right]),()=>{
 const s=structuredClone(snap);s.prefilledAnswers.email_address=left;s.packetAnswers.email_address=right;assert.equal(N.ndFirstOffenseFamilyInputs(s).conflictingIds.includes('email_address'),conflict);
});
for(const field of ['jurisdiction','pathwayId','selectedTrackId','profileVersion','profileSourceFingerprint','profileAuthorityFingerprint'])check('wrong exact source context refuses '+field,()=>assert.equal(N.ndFirstOffenseFamilyInputs({...snap,[field]:'wrong'}),null));
check('explicit same track accepted without route selection',()=>assert(N.ndFirstOffenseFamilyInputs({...snap,selectedTrackId:source.track})));
for(const path of getProfileByJurisdiction('ND').pathways.filter(path=>path.id!==source.route))check('all other ND routes untouched '+path.id,()=>assert.equal(N.ndFirstOffenseFamilyInputs({...snap,pathwayId:path.id}),null));
console.log(JSON.stringify({status:'PASS_STAGED_ND_EXISTING_FAMILY_INPUT_PROJECTION',checks,scope:'Original GA15 M01253 / GA16 M01540; pure source-owned input projection only. No collector, composer, owner, render, admission or filing completion.'}));
