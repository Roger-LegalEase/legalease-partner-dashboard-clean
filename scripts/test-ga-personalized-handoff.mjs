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
const {GA_PARDON_CAPTION_QUESTIONS}=await import('../src/lib/expungement-ai/ga-pardon-caption.ts');
const {recordFactConfirmationFor}=await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const output=process.argv[2];assert.ok(output&&path.isAbsolute(output),'private output directory required');fs.mkdirSync(output,{recursive:true});
assert.ok(!fs.existsSync(path.join(output,'RESULTS.json')),'fresh output required');
const hash=b=>createHash('sha256').update(b).digest('hex');
const specFile='data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json';
const spec=packetSpecificationFor(route),facts=Object.fromEntries(spec.requiredFacts.map(r=>[r.factId,'Synthetic '+r.factId]));
facts.participant_full_legal_name='Synthetic Casey Pardon';facts.ga_pardoned_offense_section='16-8-14(a)';facts.ga_pardon_date='2021-01-02';
Object.assign(facts,{court:'Municipal Court',county:'Clarke',case_number:'2020-CR-0042',arrest_date:'2019-01-05',participant_narrative:'I was denied a warehouse job because of this record.'});
const mappedIds=['otn','ga_pardoned_offense_section','ga_pardon_date','court','county','case_number','arrest_date','participant_narrative'];
const screening={...facts};delete screening.ga_pardoned_offense_section;delete screening.ga_pardon_date;
const snapshot={jurisdiction:'GA',pathwayId:route.slice(3),verifiedAt:'2026-10-13T00:00:00.000Z',selectedTrackId:'ga-pardon-j7',screeningAnswers:screening,prefilledAnswers:{},packetAnswers:{ga_pardoned_offense_section:{value:facts.ga_pardoned_offense_section,unknown:false},ga_pardon_date:{value:facts.ga_pardon_date,unknown:false}},serverFacts:{}};
snapshot.dependencies={recordFactConfirmations:Object.fromEntries(GA_PARDON_CAPTION_QUESTIONS.map(q=>[q.id,recordFactConfirmationFor(route,q.id,facts,q)]))};
const id='00000000-0000-4000-8000-000000000001';
const input={authUserId:id,briefcaseItemId:id,personId:id,matterId:consumerMatterIdForItem(id),verificationHash:'a'.repeat(64),snapshot,deliveryLocale:'en'};
const binding={packetSpecificationSha256:spec.specificationSha256,packetSpecificationFileSha256:hash(fs.readFileSync(specFile))};
const expected=Object.fromEntries(mappedIds.map(id=>[id,facts[id]]));
const checks=[];function check(name,fn){fn();checks.push({name,pass:true});}
check('known protected wrappers and mapped participant facts preserved',()=>assert.deepEqual(gaPardonDocumentFacts(snapshot),expected));
for(const mutate of [s=>delete s.dependencies,s=>delete s.dependencies.recordFactConfirmations.court,s=>{s.dependencies.recordFactConfirmations.county.status='unconfirmed';},s=>{s.dependencies.recordFactConfirmations.court.routeKey='GA:other';},s=>{s.dependencies.recordFactConfirmations.county.valueSha256='0'.repeat(64);},s=>{s.dependencies.recordFactConfirmations.court.contractSha256='0'.repeat(64);}]){
 const s=structuredClone(snapshot);mutate(s);
 check('protected caption refuses absent/stale/wrong-route confirmation '+checks.length,()=>assert.throws(()=>gaPardonDocumentFacts(s),/convicting court caption is not confirmed/));
 check('actual preparation refuses unconfirmed caption '+checks.length,()=>assert.throws(()=>prepareBoundPersonalizedPacket({...input,snapshot:s},binding),/convicting court caption is not confirmed/));
}
const moved=structuredClone(snapshot);moved.screeningAnswers.court='Superior Court';
check('changing court meaning invalidates earlier caption confirmation',()=>assert.throws(()=>gaPardonDocumentFacts(moved),/convicting court caption is not confirmed/));
const correctedCaption={...facts,court:'Superior Court'};
moved.dependencies.recordFactConfirmations=Object.fromEntries(GA_PARDON_CAPTION_QUESTIONS.map(q=>[q.id,recordFactConfirmationFor(route,q.id,correctedCaption,q)]));
check('explicit new confirmation carries corrected court without rewriting old snapshot',()=>assert.equal(gaPardonDocumentFacts(moved).court,'Superior Court'));
const before=JSON.stringify(snapshot);gaPardonDocumentFacts(snapshot);check('source maps unchanged',()=>assert.equal(JSON.stringify(snapshot),before));
for(const field of ['screeningAnswers','prefilledAnswers','packetAnswers','serverFacts']){
 const s=structuredClone(snapshot);s.packetAnswers={};s[field]={...s[field],...expected};
 check('known scalar facts in '+field,()=>assert.deepEqual(gaPardonDocumentFacts(s),expected));
}
const equiv=structuredClone(snapshot);equiv.screeningAnswers.ga_pardoned_offense_section='O.C.G.A. § 16–8–14 (a)';
check('equivalent exact citation representations retain corrected value',()=>assert.deepEqual(gaPardonDocumentFacts(equiv),expected));
for(const key of Object.keys(expected).filter(key=>key!=='otn')){
 for(const value of [undefined,null,'','  ','unknown','I am not sure',{},[],7,true,{value:expected[key]},{value:expected[key],unknown:true},{value:7,unknown:false},{value:expected[key],unknown:'false'}]){
  const s=structuredClone(snapshot);delete s.screeningAnswers[key];if(value===undefined)delete s.packetAnswers[key];else s.packetAnswers[key]=value;
  check(key+' refuses '+JSON.stringify(value),()=>assert.throws(()=>gaPardonDocumentFacts(s),/document fact missing or unknown/));
  check(key+' actual preparation refuses before compositor',()=>assert.throws(()=>prepareBoundPersonalizedPacket({...input,snapshot:s},binding),/document fact missing or unknown/));
 }
 const conflict=structuredClone(snapshot);conflict.packetAnswers[key]=expected[key];conflict.screeningAnswers[key]=key==='ga_pardon_date'?'2021-01-03':key==='ga_pardoned_offense_section'?'16-8-41':'CONFLICTING SAVED FACT';
 check(key+' conflicting protected sources refuse',()=>assert.throws(()=>gaPardonDocumentFacts(conflict),/document fact conflict/));
 const unknown=structuredClone(snapshot);unknown.packetAnswers[key]=expected[key];unknown.screeningAnswers[key]={unknown:true};
 check(key+' explicit unknown never overwritten by another map',()=>assert.throws(()=>gaPardonDocumentFacts(unknown),/document fact missing or unknown/));
}
for(const value of ['2026-02-30','2025-02-29','2026-10-14','Yes','01/02/2021','2021-01-02T00:00:00Z']){
 const s=structuredClone(snapshot);s.packetAnswers.ga_pardon_date=value;
 check('actual Board date rejects '+value,()=>assert.throws(()=>gaPardonDocumentFacts(s),/Board pardon date invalid/));
 check('actual preparation rejects invalid date '+value,()=>assert.throws(()=>prepareBoundPersonalizedPacket({...input,snapshot:s},binding),/Board pardon date invalid/));
}
for(const value of ['2026-02-30','2025-02-29','2026-10-14','01/05/2019']){
 const s=structuredClone(snapshot);s.screeningAnswers.arrest_date=value;
 check('actual arrest date rejects '+value,()=>assert.throws(()=>gaPardonDocumentFacts(s),/arrest date invalid/));
 check('actual preparation refuses invalid arrest date '+value,()=>assert.throws(()=>prepareBoundPersonalizedPacket({...input,snapshot:s},binding),/arrest date invalid/));
}
const reversedDates=structuredClone(snapshot);reversedDates.screeningAnswers.arrest_date='2022-01-02';
const reversedBefore=JSON.stringify(reversedDates);
check('same-case arrest after Board pardon is a record conflict',()=>assert.throws(()=>gaPardonDocumentFacts(reversedDates),/arrest date is after the Board pardon date/));
check('actual preparation refuses conflicting same-case chronology',()=>assert.throws(()=>prepareBoundPersonalizedPacket({...input,snapshot:reversedDates},binding),/arrest date is after the Board pardon date/));
check('chronology refusal preserves both original dates',()=>assert.equal(JSON.stringify(reversedDates),reversedBefore));
const sameDay=structuredClone(snapshot);sameDay.screeningAnswers.arrest_date=facts.ga_pardon_date;
check('calendar-only facts do not invent within-day chronology',()=>assert.equal(gaPardonDocumentFacts(sameDay).arrest_date,facts.ga_pardon_date));
for(const value of ['armed robbery','attempt 16-8-41','16-8-14,16-8-41','16-8-14 (not convicted)']){
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
// Source destinations come from the preserved production field map, not a
// reconstructed answer key derived from the changed specification.
const fieldMap=JSON.parse(fs.readFileSync('data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/production-field-map.json','utf8'));
for(const source of ['proposed_order.order_otn','proposed_order.order_arrest_date','primary_filing.caption_court_and_county','primary_filing.case_number','primary_filing.arrest_date','primary_filing.participant_narrative'])
 check('preserved source destination '+source,()=>assert.ok(fieldMap.requiredBeforeFiling.some(f=>f.field===source)));
const captioned=packet.documents.filter(d=>['primary_filing','proposed_order','certificate_of_service'].includes(d.documentId));
check('all three filing captions checked',()=>assert.equal(captioned.length,3));
for(const doc of captioned){
 check(doc.documentId+' receives exact convicting court/county/case',()=>{for(const key of ['court','county','case_number','otn'])assert.ok(JSON.stringify(doc).includes(facts[key]));});
 if(doc.documentId!=='primary_filing')check(doc.documentId+' does not receive participant harm narrative',()=>assert.ok(!JSON.stringify(doc).includes(facts.participant_narrative)));
}
if(process.env.GA_DOCUMENT_BASELINE){
 const baselineSpec=JSON.parse(execFileSync('git',['show',process.env.GA_DOCUMENT_BASELINE+':'+specFile],{encoding:'utf8'}));
 const baselinePacket=composeParticipantDeliveryPacket(baselineSpec,{...matter,facts:currentFacts});
 check('absent optional caption fields do not enter canonical blocks',()=>assert.ok(!/continuationTitle|wrapCourtLines|optionalIdentifier/.test(JSON.stringify(baselinePacket))));
 for(const [variant,digest] of Object.entries({full:'e759181f1545952696e971fecffb44fc7022d2f02b8b36977c3fc631401fad2e',court_only:'9be84efff72b4f7482df1a35982022296480c82e725a4316328cd5607efe5e22'})){
  const bytes=await renderGradeAPacketPdf(baselinePacket,{variant});
  check('unchanged default renderer preserves accepted '+variant+' bytes',()=>assert.equal(hash(bytes),digest));
 }
 for(const key of ['court','county','case_number','arrest_date','participant_narrative'])check('actual predecessor loses supplied '+key,()=>assert.ok(!JSON.stringify(baselinePacket).includes(facts[key])));
 check('successor preserves original source and artifact records',()=>{for(const key of ['sourceIdentities','statutoryAuthority','approvedArtifacts','postApprovalChangeAudit','legalSectionsBoundBy'])assert.deepEqual(spec[key],baselineSpec[key]);});
}
for(const [key,next] of Object.entries({arrest_date:'2019-01-06',ga_pardon_date:'2021-01-03',ga_pardoned_offense_section:'16-8-14(b)',participant_narrative:'I was denied housing because of this record.'})){
 const corrected=composeParticipantDeliveryPacket(spec,{...matter,facts:{...currentFacts,[key]:next}});
 const beforeDocs=new Map(packet.documents.map(d=>[d.documentId,d]));
 check('explicit '+key+' correction affects only source-defined document destinations',()=>{
  assert.notDeepEqual(corrected.documents.find(d=>d.documentId==='primary_filing'),beforeDocs.get('primary_filing'));
  for(const doc of corrected.documents.filter(d=>d.documentId!=='primary_filing')){if(key==='arrest_date'&&doc.documentId==='proposed_order'){assert.notDeepEqual(doc,beforeDocs.get(doc.documentId));assert.ok(JSON.stringify(doc).includes(next));}else assert.deepEqual(doc,beforeDocs.get(doc.documentId));}
  const changed=JSON.stringify(corrected.documents.find(d=>d.documentId==='primary_filing'));
  assert.ok(changed.includes(next));assert.ok(!changed.includes(currentFacts[key]));
 });
}
const protectedFacts={...currentFacts};for(const key of [...spec.fieldOwnership.participantCompletesBeforeFilingFields,...spec.fieldOwnership.courtOwnedFields,...spec.fieldOwnership.participantAtSigningFields,...spec.fieldOwnership.participantAtServiceFields])protectedFacts[key]='PROTECTED_MUST_REMAIN_BLANK';
check('actual composer keeps all reserved facts blank',()=>assert.ok(!JSON.stringify(composeParticipantDeliveryPacket(spec,{...matter,facts:protectedFacts})).includes('PROTECTED_MUST_REMAIN_BLANK')));
const noOtnSnapshot=structuredClone(snapshot);delete noOtnSnapshot.screeningAnswers.otn;
for(const value of [undefined,null,'','unknown','I am not sure',{unknown:true},{value:'stale OTN',unknown:true}]){
 const sample=structuredClone(noOtnSnapshot);if(value!==undefined)sample.packetAnswers.otn=value;
 const raw=JSON.stringify(sample);
 check('optional OTN remains omitted for '+JSON.stringify(value),()=>assert.ok(!Object.hasOwn(gaPardonDocumentFacts(sample),'otn')));
 check('optional OTN raw answer preserved '+JSON.stringify(value),()=>assert.equal(JSON.stringify(sample),raw));
}
for(const value of [7,true,[],{}, {value:'OTN 123'}, {value:7,unknown:false}]){
 const sample=structuredClone(noOtnSnapshot);sample.packetAnswers.otn=value;
 check('malformed OTN refuses '+JSON.stringify(value),()=>assert.throws(()=>gaPardonDocumentFacts(sample),/OTN invalid/));
 check('actual preparation rejects malformed optional OTN '+JSON.stringify(value),()=>assert.throws(()=>prepareBoundPersonalizedPacket({...input,snapshot:sample},binding),/OTN invalid/));
}
for(const value of ['different OTN',{unknown:true},'unknown']){
 const sample=structuredClone(snapshot);sample.packetAnswers.otn=value;
 check('optional OTN conflicting protected maps refuse '+JSON.stringify(value),()=>assert.throws(()=>gaPardonDocumentFacts(sample),/OTN conflict/));
}
const wrappedOtn=structuredClone(noOtnSnapshot);wrappedOtn.packetAnswers.otn={value:'OTN 12345',unknown:false};
check('optional OTN explicit known wrapper preserved',()=>assert.equal(gaPardonDocumentFacts(wrappedOtn).otn,'OTN 12345'));
const noOtnFacts={...currentFacts};delete noOtnFacts.otn;
const noOtnPacket=composeParticipantDeliveryPacket(spec,{...matter,facts:noOtnFacts});
check('unknown OTN composes all original components',()=>assert.deepEqual(noOtnPacket.documents.map(d=>d.documentId),packet.documents.map(d=>d.documentId)));
check('known OTN reaches source order identifier',()=>assert.ok(JSON.stringify(packet.documents.find(d=>d.documentId==='proposed_order')).includes(currentFacts.otn)));
check('unknown OTN is a participant blank',()=>assert.ok(noOtnPacket.documents.find(d=>d.documentId==='proposed_order').blocks.some(b=>b.items?.some(i=>i.label.startsWith('OTN of the case')&&i.blank&&i.completedBy==='participant'))));
for(const consumer of ['value','template','field_template','assertion']){
 const guarded=structuredClone(spec),sections=guarded.documents.find(d=>d.documentId==='primary_filing').sections;
 sections.push(consumer==='value'?{heading:'Mandatory counterexample',kind:'pleading_identity_list',fields:['otn'],fieldTreatments:{otn:'value'}}:consumer==='field_template'?{heading:'Mandatory counterexample',kind:'pleading_identity_list',fields:['case_number'],fieldValueTemplates:{case_number:'Mandatory OTN {{otn}}'}}:consumer==='template'?{heading:'Mandatory counterexample',kind:'pleading_paragraph',body:'Mandatory OTN: {{otn}}'}:{heading:'Mandatory counterexample',kind:'pleading_numbered_assertions',assertions:[{id:'mandatory-otn',text:'Mandatory OTN: {{otn}}',facts:['otn']}]});
 check('optional declaration never waives mandatory '+consumer+' consumer',()=>assert.throws(()=>composeParticipantDeliveryPacket(guarded,{...matter,facts:noOtnFacts}),/required fact/));
}
const undeclared=structuredClone(spec);delete undeclared.requiredFacts.find(f=>f.factId==='otn').requiredForGeneration;
check('optional presentation requires explicit source permission',()=>assert.throws(()=>composeParticipantDeliveryPacket(undeclared,{...matter,facts:currentFacts}),/no source-declared generation permission|Optional caption identifier lacks source permission/));
const hostSource=fs.readFileSync('scripts/build-census-v1-ga-host.mjs','utf8');
for(const sourceLabel of ['OTN of the case (needed for this order to be actionable by GCIC):','Date of arrest identified in this order:'])check('preserved host exact unlettered label '+sourceLabel,()=>assert.ok(hostSource.includes('L.push("'+sourceLabel+'")')));
const renders=[];
function inspectOrderGrouping(text,variant){check(variant+' no invented lettered case fields',()=>assert.ok(!/\([a-z]\)\s+(?:OTN of the case|Date of arrest|SO ORDERED|Exact O\.C\.G\.A\.|Your own statement|NAME AND MAILING ADDRESS|OFFICE OF THE CLERK|Method used to serve)/.test(text)));const pages=text.split('\f');check(variant+' court execution rule and judge label share one page',()=>assert.ok(pages.some(page=>page.includes('SO ORDERED, this')&&page.includes('JUDGE, COURT NAMED IN THE CAPTION'))));}

for(const variant of ['full','court_only']){
 const bytes=await renderGradeAPacketPdf(packet,{variant}),file=path.join(output,variant+'.pdf');fs.writeFileSync(file,bytes,{flag:'wx'});
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
 inspectOrderGrouping(text,variant);
 for(const [key,value] of Object.entries(expected))check(variant+' supplied fact '+key,()=>assert.ok(text.replace(/\s+/g,' ').includes(['court','county'].includes(key)?value.toUpperCase():value)));
 check(variant+' no duplicated court label',()=>assert.ok(!text.includes('COURT COURT')));
 check(variant+' no felony-only label/internal wire',()=>assert.ok(!/pardoned[- ]felony|restriction-and-sealing-of-a-pardoned-felony/i.test(text)));
 check(variant+' no protected sentinel',()=>assert.ok(!text.includes('PROTECTED_MUST_REMAIN_BLANK')));
 renders.push({variant,file,sha256:hash(bytes),byteLength:bytes.length});
}
for(const variant of ['full','court_only']){
 const bytes=await renderGradeAPacketPdf(noOtnPacket,{variant}),file=path.join(output,'unknown-otn-'+variant+'.pdf');fs.writeFileSync(file,bytes,{flag:'wx'});
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
 inspectOrderGrouping(text,'unknown OTN '+variant);
 check(variant+' unknown OTN stays blank in actual PDF',()=>assert.ok(!text.includes(currentFacts.otn)&&!text.includes('undefined')&&!text.includes('null')));
 check(variant+' order arrest date still prints when OTN unknown',()=>assert.ok(text.includes(currentFacts.arrest_date)));
 renders.push({variant:'unknown-otn-'+variant,file,sha256:hash(bytes),byteLength:bytes.length});
}
// Boundary values are participant-authored; the renderer may wrap, never
// truncate, invent a legal narrative or put it into a judge/service block.
const boundaryFacts={...currentFacts,otn:'GA-OTN-'+Array.from({length:12},(_,i)=>'SYNTHETIC'+i).join('-'),court:'Municipal Court of the City of a Synthetic Municipality with a Long Record Caption',participant_narrative:'Me negaron un trabajo por este expediente. '+Array.from({length:35},(_,i)=>`Este es mi relato personal número ${i+1}.`).join(' ')+' FIN DE MI RELATO.'};
const boundaryPacket=composeParticipantDeliveryPacket(spec,{...matter,facts:boundaryFacts});
for(const variant of ['full','court_only']){
 const bytes=await renderGradeAPacketPdf(boundaryPacket,{variant}),file=path.join(output,'boundary-es-'+variant+'.pdf');fs.writeFileSync(file,bytes,{flag:'wx'});
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}).replace(/\s+/g,' ');
 inspectOrderGrouping(execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}),'boundary '+variant);
 check(variant+' complete long optional OTN survives',()=>assert.ok(text.replace(/\s+/g,'').includes(boundaryFacts.otn)));
 check(variant+' complete long court caption survives',()=>assert.ok(text.includes(('IN THE '+boundaryFacts.court).toUpperCase())));
 check(variant+' participant Spanish narrative preserved without invented translation',()=>assert.ok(text.includes(boundaryFacts.participant_narrative)));
 check(variant+' short continuation identifies component',()=>assert.ok(text.includes('PETITION FOLLOWING PARDON')));
 renders.push({variant:'boundary-es-'+variant,file,sha256:hash(bytes),byteLength:bytes.length});
}
for(const artifact of spec.approvedArtifacts){const bytes=fs.readFileSync(artifact.file);check('original PDF hash '+artifact.file,()=>assert.equal(hash(bytes),artifact.sha256));check('original PDF size '+artifact.file,()=>assert.equal(bytes.length,artifact.byteLength));}
check('raw snapshot still unchanged',()=>assert.equal(JSON.stringify(snapshot),before));
const report={status:'PASS',checks:checks.length,details:checks,renders,specificationFileSha256:binding.packetSpecificationFileSha256,limits:['Synthetic protected-shape facts and actual local composer/PDF only; no actual final verification, worker claim, permission bypass or delivery acceptance.','Application and static worker authority remain absent; no commercial, source or qualified output/language approval created.']};
fs.writeFileSync(path.join(output,'RESULTS.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:report.checks,renders}));
