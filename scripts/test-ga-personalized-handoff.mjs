import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {gaPardonDocumentFacts,GA_PERSONALIZED_DELIVERY_ROUTE:route}=await import('../src/lib/rcap/render/ga-pardon-facts.ts');
const {prepareBoundPersonalizedPacket,preparePersonalizedPacket,isPersonalizedDeliveryRoute}=await import('../src/lib/rcap/render/personalized-packet.ts');
const {workerStaticPacketBinding}=await import('../src/lib/rcap/fulfillment/worker-static-authority.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {composeParticipantDeliveryPacket}=await import('../src/lib/rcap/grade-a/participant-packet.ts');
const {renderGradeAPacketPdf}=await import('../src/lib/rcap/grade-a/renderer.ts');
const {consumerMatterIdForItem}=await import('../src/lib/expungement-ai/consumer-identity.ts');
const output=process.argv[2];assert.ok(output&&path.isAbsolute(output),'private output directory required');fs.mkdirSync(output,{recursive:true});
assert.ok(!fs.existsSync(path.join(output,'RESULTS.json')),'fresh output required');
const hash=b=>createHash('sha256').update(b).digest('hex');
const specFile='data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json';
const spec=packetSpecificationFor(route),facts=Object.fromEntries(spec.requiredFacts.map(r=>[r.factId,'Synthetic '+r.factId]));
facts.participant_full_legal_name='Synthetic Casey Pardon';facts.ga_pardoned_offense_section='16-8-14(a)';facts.ga_pardon_date='2021-01-02';
const screening={...facts};delete screening.ga_pardoned_offense_section;delete screening.ga_pardon_date;
const snapshot={jurisdiction:'GA',pathwayId:route.slice(3),verifiedAt:'2026-10-13T00:00:00.000Z',selectedTrackId:'ga-pardon-j7',screeningAnswers:screening,prefilledAnswers:{},packetAnswers:{ga_pardoned_offense_section:{value:facts.ga_pardoned_offense_section,unknown:false},ga_pardon_date:{value:facts.ga_pardon_date,unknown:false}},serverFacts:{}};
const id='00000000-0000-4000-8000-000000000001';
const input={authUserId:id,briefcaseItemId:id,personId:id,matterId:consumerMatterIdForItem(id),verificationHash:'a'.repeat(64),snapshot,deliveryLocale:'en'};
const binding={packetSpecificationSha256:spec.specificationSha256,packetSpecificationFileSha256:hash(fs.readFileSync(specFile))};
const expected={ga_pardoned_offense_section:facts.ga_pardoned_offense_section,ga_pardon_date:facts.ga_pardon_date};
const checks=[];function check(name,fn){fn();checks.push({name,pass:true});}
check('actual v14 known wrappers preserved',()=>assert.deepEqual(gaPardonDocumentFacts(snapshot),expected));
const before=JSON.stringify(snapshot);gaPardonDocumentFacts(snapshot);check('source maps unchanged',()=>assert.equal(JSON.stringify(snapshot),before));
for(const field of ['screeningAnswers','prefilledAnswers','packetAnswers','serverFacts']){
 const s=structuredClone(snapshot);s.packetAnswers={};s[field]={...s[field],...expected};
 check('known scalar facts in '+field,()=>assert.deepEqual(gaPardonDocumentFacts(s),expected));
}
const equiv=structuredClone(snapshot);equiv.screeningAnswers.ga_pardoned_offense_section='O.C.G.A. § 16–8–14 (a)';
check('equivalent exact citation representations retain corrected value',()=>assert.deepEqual(gaPardonDocumentFacts(equiv),expected));
for(const key of Object.keys(expected)){
 for(const value of [undefined,null,'','  ',{},[],7,true,{value:expected[key]},{value:expected[key],unknown:true},{value:7,unknown:false},{value:expected[key],unknown:'false'}]){
  const s=structuredClone(snapshot);if(value===undefined)delete s.packetAnswers[key];else s.packetAnswers[key]=value;
  check(key+' refuses '+JSON.stringify(value),()=>assert.throws(()=>gaPardonDocumentFacts(s),/document fact missing or unknown/));
  check(key+' actual preparation refuses before compositor',()=>assert.throws(()=>prepareBoundPersonalizedPacket({...input,snapshot:s},binding),/document fact missing or unknown/));
 }
 const conflict=structuredClone(snapshot);conflict.screeningAnswers[key]=key==='ga_pardon_date'?'2021-01-03':'16-8-41';
 check(key+' conflicting protected sources refuse',()=>assert.throws(()=>gaPardonDocumentFacts(conflict),/document fact conflict/));
 const unknown=structuredClone(snapshot);unknown.screeningAnswers[key]={unknown:true};
 check(key+' explicit unknown never overwritten by another map',()=>assert.throws(()=>gaPardonDocumentFacts(unknown),/document fact missing or unknown/));
}
for(const value of ['2026-02-30','2025-02-29','2026-10-14','Yes','unknown','01/02/2021','2021-01-02T00:00:00Z']){
 const s=structuredClone(snapshot);s.packetAnswers.ga_pardon_date=value;
 check('actual Board date rejects '+value,()=>assert.throws(()=>gaPardonDocumentFacts(s),/Board pardon date invalid/));
 check('actual preparation rejects invalid date '+value,()=>assert.throws(()=>prepareBoundPersonalizedPacket({...input,snapshot:s},binding),/Board pardon date invalid/));
}
for(const value of ['armed robbery','attempt 16-8-41','16-8-14,16-8-41','16-8-14 (not convicted)','unknown']){
 const s=structuredClone(snapshot);s.packetAnswers.ga_pardoned_offense_section=value;
 check('exact final citation rejects '+value,()=>assert.throws(()=>gaPardonDocumentFacts(s),/conviction citation invalid/));
}
const aliases=structuredClone(snapshot);aliases.packetAnswers={};Object.assign(aliases.screeningAnswers,{charge:'16-8-14(a)',pardon_status:'Yes',sentence_completion_date:'2021-01-02'});
check('legacy aliases cannot manufacture Board date or exact final section',()=>assert.throws(()=>gaPardonDocumentFacts(aliases),/document fact missing or unknown/));
check('unrelated route refused',()=>assert.throws(()=>gaPardonDocumentFacts({...snapshot,pathwayId:'other'}),/route mismatch/));
check('invalid verification time refused',()=>assert.throws(()=>gaPardonDocumentFacts({...snapshot,verifiedAt:'2026-02-30T00:00:00.000Z'}),/verification date invalid/));
check('GA exact membership',()=>assert.equal(isPersonalizedDeliveryRoute(route),true));
for(const value of ['GA:other',route+'-other','GA:sb-288-misdemeanor-conviction-restriction-and-sealing'])check('no broad GA membership '+value,()=>assert.equal(isPersonalizedDeliveryRoute(value),false));
check('IL retained',()=>assert.equal(isPersonalizedDeliveryRoute('IL:felony-prostitution-relief'),true));
for(const purpose of ['application','claimed_worker'])check('actual '+purpose+' job still held',()=>assert.throws(()=>prepareBoundPersonalizedPacket(input,binding,purpose),/personalized route cannot render/));
check('actual app authority remains absent',()=>assert.throws(()=>preparePersonalizedPacket(input),/personalized render authority refused:.*NO_RECORD/));
check('actual worker static authority remains absent',()=>assert.equal(workerStaticPacketBinding(route,'ga-pardon-j7'),null));
// Actual predecessor extraction semantics, retained in personalized-packet.ts
// for unrelated routes, would stringify an invalid number and missing flag.
// These are isolated synthetic counterexamples, not delivered packets.
function predecessorProjection(s){const merged={...s.screeningAnswers,...s.prefilledAnswers,...s.packetAnswers,...s.serverFacts},out={};for(const {factId}of spec.requiredFacts){const a=merged[factId];const v=a&&typeof a==='object'&&!Array.isArray(a)?(a.unknown===true?undefined:a.value):a;if(typeof v==='string'||typeof v==='number')out[factId]=String(v);}return out;}
const defective=structuredClone(snapshot);defective.packetAnswers.ga_pardon_date={value:'2026-02-30',unknown:false};
const oldFacts=predecessorProjection(defective);
check('predecessor accepts malformed calendar fact for correct reason',()=>assert.equal(oldFacts.ga_pardon_date,'2026-02-30'));
check('current normalization refuses predecessor calendar defect',()=>assert.throws(()=>gaPardonDocumentFacts(defective),/Board pardon date invalid/));
const generationPurpose='internal_review',matter={routeKey:route,jurisdiction:'GA',pathwayId:snapshot.pathwayId,verificationHash:input.verificationHash,verifiedAt:snapshot.verifiedAt,generationPurpose};
const oldPacket=composeParticipantDeliveryPacket(spec,{...matter,facts:oldFacts});
check('actual composer would carry malformed predecessor date',()=>assert.ok(JSON.stringify(oldPacket).includes('2026-02-30')));
const currentFacts={...predecessorProjection(snapshot),...gaPardonDocumentFacts(snapshot)};
const packet=composeParticipantDeliveryPacket(spec,{...matter,facts:currentFacts});
const protectedFacts={...currentFacts};for(const key of [...spec.fieldOwnership.participantCompletesBeforeFilingFields,...spec.fieldOwnership.courtOwnedFields,...spec.fieldOwnership.participantAtSigningFields,...spec.fieldOwnership.participantAtServiceFields])protectedFacts[key]='PROTECTED_MUST_REMAIN_BLANK';
check('actual composer keeps all reserved facts blank',()=>assert.ok(!JSON.stringify(composeParticipantDeliveryPacket(spec,{...matter,facts:protectedFacts})).includes('PROTECTED_MUST_REMAIN_BLANK')));
const renders=[];
for(const variant of ['full','court_only']){
 const bytes=await renderGradeAPacketPdf(packet,{variant}),file=path.join(output,variant+'.pdf');fs.writeFileSync(file,bytes,{flag:'wx'});
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
 for(const value of Object.values(expected))check(variant+' exact supplied fact '+value,()=>assert.ok(text.includes(value)));
 check(variant+' no felony-only label/internal wire',()=>assert.ok(!/pardoned[- ]felony|restriction-and-sealing-of-a-pardoned-felony/i.test(text)));
 check(variant+' no protected sentinel',()=>assert.ok(!text.includes('PROTECTED_MUST_REMAIN_BLANK')));
 renders.push({variant,file,sha256:hash(bytes),byteLength:bytes.length});
}
for(const artifact of spec.approvedArtifacts){const bytes=fs.readFileSync(artifact.file);check('original PDF hash '+artifact.file,()=>assert.equal(hash(bytes),artifact.sha256));check('original PDF size '+artifact.file,()=>assert.equal(bytes.length,artifact.byteLength));}
check('raw snapshot still unchanged',()=>assert.equal(JSON.stringify(snapshot),before));
const report={status:'PASS',checks:checks.length,details:checks,renders,specificationFileSha256:binding.packetSpecificationFileSha256,limits:['Synthetic protected-shape facts and actual local composer/PDF only; no actual final verification, worker claim, permission bypass or delivery acceptance.','Application and static worker authority remain absent; no commercial, source or qualified output/language approval created.']};
fs.writeFileSync(path.join(output,'RESULTS.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:report.checks,renders}));
