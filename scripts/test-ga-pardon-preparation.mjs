#!/usr/bin/env node
// Original GA protected-document preparation gap; no DB, PDF, or authority mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { georgiaPardonPreparationFactIds: scope } = await import('../src/lib/expungement-ai/ga-pardon-preparation.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { GA_PARDON_ROUTE } = await import('../src/lib/rcap-engine/georgia-pardon-facts.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { GA_PARDON_CAPTION_QUESTIONS, GA_PARDON_DOCUMENT_QUESTIONS } = await import('../src/lib/expungement-ai/ga-pardon-caption.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { workerStaticPacketBinding } = await import('../src/lib/rcap/fulfillment/worker-static-authority.ts');
const fixture = JSON.parse(fs.readFileSync('scripts/fixtures/conviction-fallback-predecessors.json')).rows.find(r => r.id.startsWith('GA') && r.id.endsWith('/omitted'));
const answers = { ...fixture.answers, case_outcome: 'Misdemeanor conviction', ga_record_help: 'pardon_record', pardon_status: 'Yes', ga_board_pardon: 'yes', ga_pardon_date: '2021-01-02', ga_pardoned_offense_section: '16-8-14(a)', ga_convictions_since_pardon: 'none', ga_pardon_pending_charges: 'no', pending_cases: 'No' };
const profile = getProfileByJurisdiction('GA');
const authoritative = evaluateAuthoritativeScreeningResult({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'ga-preparation-pure', answers });
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, packetAnswers: {}, dependencies: { commercialFlowVersion: null, entitlementSource: null, productId: null }, capturedAt: '2026-10-14T00:00:00Z' });
const snapshot = seed.snapshot;
const current = { profile, profileAuthorityFingerprint: snapshot.profileAuthorityFingerprint, today: '2026-10-14', specification: packetSpecificationFor('GA:' + GA_PARDON_ROUTE) };
const checks = [];
function check(name, fn) { fn(); checks.push({ name, pass: true }); }
const expected = ['ga_pardoned_offense_section', 'ga_pardon_date', 'court', 'county', 'case_number', 'arrest_date', 'participant_narrative'];
check('actual protected held seed gains only a preparation scope', () => {
 const before = JSON.stringify(snapshot), result = scope(snapshot, current);
 assert.deepEqual(result.requiredFactIds, expected); assert.deepEqual(result.optionalFactIds, ['otn']);
 assert.deepEqual(result.captionConfirmationFactIds, ['court', 'county']);
 assert.equal(result.purpose, 'participant_document_preparation'); assert.equal(JSON.stringify(snapshot), before);
 assert.equal(snapshot.resultCode, 'needs_review'); assert.equal(snapshot.paymentAllowed, false);
 assert.equal(snapshot.packetPlan, null); assert.equal(snapshot.selectedTrackId, null); assert.deepEqual(snapshot.requiredInputIds, []);
});
for (const [key, value] of [['jurisdiction', 'MS'], ['pathwayId', 'sealing-court-records'], ['profileVersion', 'other'], ['profileSourceFingerprint', '0'.repeat(64)], ['profileAuthorityFingerprint', '0'.repeat(64)], ['resultCode', 'packet_ready'], ['resultCode', 'likely_not_eligible'], ['paymentAllowed', true], ['packetPlan', {}], ['selectedTrackId', 'ga-seal-m']]) {
 check('refuse changed protected identity ' + key + '/' + String(value), () => assert.equal(scope({ ...snapshot, [key]: value }, current), null));
}
for (const [key, value] of [['profileAuthorityFingerprint', ''], ['profileAuthorityFingerprint', '0'.repeat(64)], ['today', '2026-02-30'], ['today', 'bad'], ['specification', null], ['specification', { ...current.specification, trackId: 'ga-seal-m' }], ['specification', { ...current.specification, specificationSha256: '0'.repeat(64) }], ['profile', { ...profile, source: { ...profile.source, sourceCorpusSha256: '0'.repeat(64) } }]]) {
 check('refuse changed current source ' + key + '/' + checks.length, () => assert.equal(scope(snapshot, { ...current, [key]: value }), null));
}
const scenarios = [
 ['felony supported', { case_outcome: 'Felony conviction' }, true],
 ['missing Board', { ga_board_pardon: undefined }, false], ['uncertain Board', { ga_board_pardon: 'unknown' }, false],
 ['no Board', { ga_board_pardon: 'no' }, false], ['unknown class', { case_outcome: 'Pardoned conviction' }, false],
 ['future pardon', { ga_pardon_date: '2027-01-01' }, false], ['missing citation', { ga_pardoned_offense_section: '' }, false],
 ['ambiguous citation', { ga_pardoned_offense_section: 'theft' }, false], ['exclusion', { case_outcome: 'Felony conviction', ga_pardoned_offense_section: '16-5-1' }, false],
 ['class conflict', { ga_pardoned_offense_section: '16-5-1' }, false], ['later conviction', { ga_convictions_since_pardon: 'other' }, false],
 ['pending', { pending_cases: 'Yes', ga_pardon_pending_charges: 'yes' }, false], ['pending conflict', { pending_cases: 'Yes' }, false],
 ['conditional offense unclear', { ga_pardoned_offense_section: '16-5-21', ga_pardon_assault_rape_intent: 'unknown' }, false]
];
const traffic = { ga_convictions_since_pardon: 'traffic_only', ga_post_pardon_traffic_records: 'Saved traffic record', ga_post_pardon_traffic_jurisdictions: 'all_georgia' };
scenarios.push(['supported nonserious traffic', { ...traffic, ga_post_pardon_traffic_citations: '40-6-181' }, true],
 ['serious traffic', { ...traffic, ga_post_pardon_traffic_citations: '40-6-391' }, false],
 ['uncertain traffic', { ...traffic, ga_post_pardon_traffic_citations: '40-6-999' }, false],
 ['foreign traffic', { ...traffic, ga_post_pardon_traffic_jurisdictions: 'other_jurisdiction' }, false]);
for (const [name, change, allowed] of scenarios) check(name, () => {
 const s = structuredClone(snapshot);
 for (const [id, value] of Object.entries(change)) {
  for (const key of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers', 'serverFacts']) delete s[key][id];
  if (value !== undefined) s.screeningAnswers[id] = value;
 }
 assert.equal(Boolean(scope(s, current)), allowed, name);
});
for (const map of ['prefilledAnswers', 'packetAnswers', 'serverFacts']) {
 for (const value of ['no', 'unknown', { value: 'yes', unknown: true }, { value: 'yes' }, ['yes'], null]) {
  check(map + ' cannot conceal conflicting or malformed legal predicate ' + JSON.stringify(value), () => assert.equal(scope({ ...snapshot, [map]: { ...snapshot[map], ga_board_pardon: value } }, current), null));
 }
 check(map + ' equivalent explicit known legal fact allowed', () => assert(scope({ ...snapshot, [map]: { ...snapshot[map], ga_board_pardon: { value: 'yes', unknown: false } } }, current)));
 check(map + ' equivalent citation formatting allowed', () => assert(scope({ ...snapshot, [map]: { ...snapshot[map], ga_pardoned_offense_section: { value: 'O.C.G.A. § 16-8-14 (a)', unknown: false } } }, current)));
}
for (const id of ['court', 'county', 'case_number', 'arrest_date', 'participant_narrative', 'otn']) {
 for (const value of ['', null, { unknown: true, value: 'retained raw' }, ['malformed retained']]) check('document correction stays reachable ' + id + '/' + JSON.stringify(value), () => {
  const s = structuredClone(snapshot); s.screeningAnswers[id] = 'old raw value'; s.packetAnswers[id] = value;
  const before = JSON.stringify(s); assert(scope(s, current)); assert.equal(JSON.stringify(s), before);
 });
}
check('inactive legal history stays preserved without creating a gate', () => {
 const s = structuredClone(snapshot); s.screeningAnswers.ga_pardon_imprisonment_under14 = 'yes'; s.packetAnswers.ga_pardon_imprisonment_under14 = 'no';
 const before = JSON.stringify(s); assert(scope(s, current)); assert.equal(JSON.stringify(s), before);
});
for (const id of [...expected, 'otn']) check('source cannot reassign participant fact ' + id, () => {
 const specification = structuredClone(current.specification);
 specification.requiredFacts.find(f => f.factId === id).ownership = 'court';
 assert.equal(scope(snapshot, { ...current, specification }), null);
});
check('source cannot turn optional OTN into a new mandatory gate', () => {
 const specification = structuredClone(current.specification);
 specification.requiredFacts.find(f => f.factId === 'otn').requiredForGeneration = true;
 assert.equal(scope(snapshot, { ...current, specification }), null);
});
check('missing specification fact contract refuses preparation', () => assert.equal(scope(snapshot, {
 ...current, specification: { ...current.specification, requiredFacts: undefined }
}), null));
check('existing bilingual caption and document controls retain ownership and optional OTN', () => {
 for (const question of [...GA_PARDON_CAPTION_QUESTIONS, ...GA_PARDON_DOCUMENT_QUESTIONS]) assert(question.translations.es.prompt && question.translations.es.helperText);
 assert.equal(GA_PARDON_DOCUMENT_QUESTIONS.find(q => q.id === 'otn').required, false);
 assert.equal(GA_PARDON_DOCUMENT_QUESTIONS.find(q => q.id === 'participant_narrative').multiline, true);
});
check('real application and worker admission remain refused', () => {
 assert.equal(packetFulfillmentAuthority('GA', GA_PARDON_ROUTE, 'packet generation', { trackId: 'ga-pardon-j7' }).allowed, false);
 assert.equal(workerStaticPacketBinding('GA:' + GA_PARDON_ROUTE, 'ga-pardon-j7'), null);
});
const record = { status: 'unverified', reason: 'pure-preparation-test', revision: 0, draftHash: seed.hash, draftSnapshot: snapshot };
check('ordinary protected held model does not gain document questions', () => {
 const normal = P.protectedPacketInformationModelFor(record);
 assert.equal(normal.gaPardonPreparationAvailable, true);
 assert(!normal.questions.some(q => ['court','county','case_number','arrest_date','participant_narrative','otn'].includes(q.id)));
 assert.deepEqual(normal.requiredInputIds, []);
});
check('explicit protected editor reuses exact source questions without a plan', () => {
 const m = P.gaPardonPreparationModelFor(record); assert(m);
 assert.deepEqual(new Set(m.questions.map(q=>q.id)), new Set([...expected,'otn']));
 assert.deepEqual(m.requiredInputIds, []); assert.equal(m.packetPlan, null);
 assert.equal(m.questions.find(q=>q.id==='otn').required, false);
 assert.deepEqual(new Set(P.editablePacketInputIds(m)), new Set([...expected,'otn']));
});
check('partial caption preparation does not impose ordinary correction requirements',()=>{
 const update=P.packetInformationPatch({existingItem:{id:'ga-preparation-pure',artifactRefs:{}},protectedVerification:record,gaPardonPreparation:true,answers:{court:'Municipal Court'}});
 assert(update);const normal=P.protectedPacketInformationModelFor(update.protectedTransition.nextVerification);
 assert(!normal.missingInputIds.some(id=>['court','county','case_number','arrest_date','participant_narrative','otn'].includes(id)));
});
let saved;
check('actual protected preparation save retains nonpayable held authority and raw facts', () => {
 const data={court:'Municipal Court',county:'Clarke',case_number:'2020-CR-0042',arrest_date:'2019-01-05',participant_narrative:'The record prevented me from taking a warehouse job.',otn:{unknown:true,value:''}};
 saved=P.packetInformationPatch({existingItem:{id:'ga-preparation-pure',artifactRefs:{}},protectedVerification:record,gaPardonPreparation:true,answers:data});
 assert(saved); const next=saved.protectedTransition.nextVerification.draftSnapshot;
 assert.equal(next.resultCode,'needs_review');assert.equal(next.paymentAllowed,false);assert.equal(next.packetPlan,null);assert.equal(next.selectedTrackId,null);assert.deepEqual(next.requiredInputIds,[]);
 for(const [id,value]of Object.entries(data))assert.deepEqual(next.packetAnswers[id],value,id);
 assert.equal(saved.readyToGenerate,false);
});
check('ordinary no-op retains preparation answers without new ordinary collection gates',()=>{
 const next=saved.protectedTransition.nextVerification;
 const noop=P.packetInformationPatch({existingItem:{id:'ga-preparation-pure',artifactRefs:{}},protectedVerification:next,answers:{}});
 assert(noop);assert.equal(noop.protectedTransition.nextVerification.draftHash,next.draftHash);
 assert(!P.protectedPacketInformationModelFor(next).builderQuestions.some(q=>q.id==='participant_narrative'));
});
check('preparation cannot verify and malformed protected hash cannot prepare',()=>{
 assert.equal(P.packetInformationPatch({existingItem:{id:'ga-preparation-pure',artifactRefs:{}},protectedVerification:record,gaPardonPreparation:true,answers:{},verify:true}),null);
 assert.equal(P.gaPardonPreparationModelFor({...record,draftHash:'0'.repeat(64)}),null);
});
check('self-consistent draft hash cannot substitute wrong server route facts',()=>{
 const corrupted=structuredClone(record);corrupted.draftSnapshot.serverFacts.pathway_id='other-route';
 corrupted.draftHash=P.protectedPacketDraftHash(corrupted.draftSnapshot);
 assert.equal(P.gaPardonPreparationModelFor(corrupted),null);
});
check('default save cannot add a preparation-only document fact',()=>{
 const update=P.packetInformationPatch({existingItem:{id:'ga-preparation-pure',artifactRefs:{}},protectedVerification:record,answers:{participant_narrative:'not an explicit preparation request'}});
 assert(update);assert.equal(update.protectedTransition.nextVerification.draftHash,record.draftHash);
});
const {gaPardonDocumentFacts}=await import('../src/lib/rcap/render/ga-pardon-facts.ts');
check('actual preparation save produces current caption confirmations for strict typed mapping',()=>{
 const next=saved.protectedTransition.nextVerification.draftSnapshot;
 const mapped=gaPardonDocumentFacts({...next,verifiedAt:'2026-10-14T00:00:00Z'});
 assert.equal(mapped.court,'Municipal Court');assert.equal(mapped.county,'Clarke');assert.equal(mapped.case_number,'2020-CR-0042');assert.equal(mapped.otn,undefined);
 assert.throws(()=>gaPardonDocumentFacts({...next,dependencies:{},verifiedAt:'2026-10-14T00:00:00Z'}),/not confirmed/);
});
check('legal uncertainty saved from preparation returns to existing eligibility correction only',()=>{
 const update=P.packetInformationPatch({existingItem:{id:'ga-preparation-pure',artifactRefs:{}},protectedVerification:saved.protectedTransition.nextVerification,gaPardonPreparation:true,answers:{ga_pardoned_offense_section:{unknown:true,value:''}}});
 assert(update);const next=update.protectedTransition.nextVerification;
 assert.equal(P.gaPardonPreparationModelFor(next),null);assert(P.protectedPacketInformationModelFor(next));
 assert.equal(next.draftSnapshot.packetAnswers.participant_narrative,'The record prevented me from taking a warehouse job.');
 assert.equal(update.readyToGenerate,false);
});
// Execute the unchanged HTTP handler logic with transport seams only. These
// are handler-contract checks, not a claim of authenticated DB acceptance.
const apiFile=process.cwd()+'/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts';
let apiSource=fs.readFileSync(apiFile,'utf8');
for(const [bindings,module]of [
 [['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],
 [['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],
 [['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']]){
 const pattern=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(pattern.test(apiSource),module);
 apiSource=apiSource.replace(pattern,bindings.map(binding=>'const '+binding+'=(...args:unknown[])=>(globalThis as any).__gaPreparationTransport.'+binding+'(...args);').join('\n'));
}
const compiled=ts.transpileModule(apiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(apiFile).href,source:compiled}});
const API=await import(pathToFileURL(apiFile).href);let stored=structuredClone(record),writes=0;
const item={id:'ga-preparation-pure',artifactRefs:{}};
globalThis.__gaPreparationTransport={
 getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:'synthetic-owner',userEmail:'owner@example.test'}),getBriefcaseItem:async()=>item,
 readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:async()=>({commercialActions:{fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false}}),
 persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);writes++;stored=JSON.parse(JSON.stringify(transition.nextVerification));return{ok:true,value:stored};},
 protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no seed substitution');},readTrustedBriefcasePresentationSource:()=>{throw Error('no trusted-source substitution');}
};
const url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information',context={params:Promise.resolve({itemId:item.id})};
const post=(body,prepare=true)=>API.POST(new Request(url+(prepare?'?preparation=ga-pardon':''),{method:'POST',body:JSON.stringify(body)}),context);
let response=await API.GET(new Request(url+'?preparation=ga-pardon'),context),body=await response.json();
check('explicit handler recovery exposes eight source questions without writing',()=>{assert.equal(response.status,200);assert.equal(body.questions.length,8);assert.equal(writes,0);});
response=await post({expectedRevision:stored.revision,answers:{participant_narrative:'My own retained account'}},false);
check('ordinary handler rejects new preparation-only answer',()=>assert.equal(response.status,422));
response=await post({expectedRevision:stored.revision,answers:{participant_narrative:'My own retained account',court:'Municipal Court',county:'Clarke'}});body=await response.json();
check('explicit handler saves document facts and returns to matter',()=>{assert.equal(response.status,200);assert.equal(body.nextAction,'open_matter');assert.equal(body.readyToGenerate,false);assert.equal(body.answers.participant_narrative,'My own retained account');});
const before=JSON.stringify(stored),writesBefore=writes;
response=await API.GET(new Request(url+'?preparation=ga-pardon'),context);body=await response.json();
check('preparation reentry reads saved facts without rewriting',()=>{assert.equal(response.status,200);assert.equal(body.answers.participant_narrative,'My own retained account');assert.equal(JSON.stringify(stored),before);assert.equal(writes,writesBefore);});
response=await post({expectedRevision:stored.revision,answers:{},verify:true});
check('actual handler refuses verification in preparation',()=>assert.equal(response.status,422));
response=await post({expectedRevision:stored.revision+1,answers:{otn:'123'}});
check('actual handler refuses stale preparation revision',()=>assert.equal(response.status,409));
response=await post({expectedRevision:stored.revision,answers:{ga_pardon_date:{unknown:true,value:''}}});
check('unknown pardon date saves and retains prior document facts',()=>{assert.equal(response.status,200);assert.equal(stored.draftSnapshot.packetAnswers.participant_narrative,'My own retained account');assert.equal(P.gaPardonPreparationModelFor(stored),null);});
response=await API.GET(new Request(url+'?preparation=ga-pardon'),context);
check('new legal uncertainty closes preparation editor',()=>assert.equal(response.status,409));
response=await post({expectedRevision:stored.revision,answers:{ga_pardon_date:'2021-01-02'}},false);
check('ordinary eligibility repair restores preparation without losing narrative',()=>{assert.equal(response.status,200);assert(P.gaPardonPreparationModelFor(stored));assert.equal(stored.draftSnapshot.packetAnswers.participant_narrative,'My own retained account');});
globalThis.__gaPreparationTransport.getBriefcaseItem=async()=>null;
response=await API.GET(new Request(url+'?preparation=ga-pardon'),context);
check('wrong-owner matter seam refuses before exposing facts',()=>assert.equal(response.status,404));
globalThis.__gaPreparationTransport.getRcapBriefcaseAuthState=async()=>({isAuthenticated:false});
response=await API.GET(new Request(url+'?preparation=ga-pardon'),context);
check('unauthenticated request refuses before exposing facts',()=>assert.equal(response.status,401));
console.log(JSON.stringify({ status: 'PASS', checks: checks.length, scope: 'Preparation helper, protected model/save and actual handler with transport seams; actual authenticated owner acceptance still required', results: checks }, null, 2));
