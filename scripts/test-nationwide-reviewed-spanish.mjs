import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const catalog=JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-question-spanish.json','utf8'));
const {reviewedSpanishQuestion,reviewedPacketQuestion}=await import('../src/lib/expungement-ai/reviewed-question-copy.ts');
let checks=0;
for(const entry of catalog.entries){
 const question={id:entry.questionId,stage:'packet_information',type:entry.inputType,prompt:entry.english.prompt,helperText:entry.english.helperText,options:entry.english.options,required:true,contextOnly:false,optionDisplay:Object.fromEntries(entry.english.optionDisplay.map(({value,...display})=>[value,display]))};
 const contexts=[...entry.scope.publicStates.map(state=>({state})),...entry.scope.packetRouteIndexes.map(index=>{const [state,pathwayId]=catalog.routeKeys[index].split(':');return {state,pathwayId};})];
 for(const context of contexts){
  const translated=reviewedSpanishQuestion(question,context);
  assert.equal(translated.translations.es.prompt,entry.spanish.prompt);assert.equal(translated.translations.es.helperText,entry.spanish.helperText);
  for(const key of ['id','stage','type','prompt','helperText','options','required','contextOnly'])assert.deepEqual(translated[key],question[key],key);
  for(const option of entry.spanish.optionDisplay)assert.deepEqual(translated.optionDisplay[option.value].translations.es,{label:option.label,helperText:option.helperText});
  assert.strictEqual(reviewedSpanishQuestion({...question,prompt:question.prompt+' '},context).translations,undefined);
  checks++;
 }
 assert.strictEqual(reviewedSpanishQuestion(question,{state:'ZZ',pathwayId:'unreviewed'}),question);
}
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const states=new Set(catalog.entries.flatMap(entry=>entry.scope.publicStates));
for(const state of states){const profile=projectPublicProfile(getProfileByJurisdiction(state));assert.equal(profile.jurisdiction.code,state);for(const q of profile.questions)if(q.id==='possible_pathway_context'){assert.ok(q.translations?.es?.prompt);assert.ok(q.options.every(value=>q.optionDisplay?.[value]?.translations?.es?.label));}}
const {MS_NONCONVICTION_SCREENING_ANSWERS:screening,MS_NONCONVICTION_ROUTE:route}=await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const {evaluateAuthoritativeScreeningResult}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const packet=await import('../src/lib/expungement-ai/packet-information.ts');
const authoritative=evaluateAuthoritativeScreeningResult({jurisdiction:'MS',profileVersion:route.profileVersion,matterId:'synthetic-spanish-copy',answers:screening});
const seed=packet.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:screening,dependencies:{commercialFlowVersion:1,entitlementSource:'consumer_payment',productId:'expungement_packet'},capturedAt:'2026-10-11T12:00:00Z'});
const model=packet.protectedPacketInformationModelFor({status:'unverified',reason:'test',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot});
assert.match(model.questions.find(q=>q.id==='social_security_number_last_four').translations.es.prompt,/calculados/);
assert.match(model.questions.find(q=>q.id==='participant_full_legal_name').translations.es.prompt,/nombre/i);
const participantCatalog=JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-participant-copy.json','utf8'));
let participantChecks=0;
for(const entry of participantCatalog.entries){
 const q={id:entry.questionId,stage:'packet_information',type:entry.source.inputType,prompt:entry.source.prompt,helperText:entry.source.helperText,options:entry.source.wireOptions,required:true,contextOnly:false};
 for(const binding of entry.bindings){
  const [state,pathwayId]=participantCatalog.routeKeys[binding.routeIndex].split(':');
  const changed=reviewedPacketQuestion(q,{state,pathwayId,participantOwnsRecord:true});
  assert.equal(changed.prompt,entry.successor.en.prompt);assert.equal(changed.translations.es.prompt,entry.successor.es.prompt);
  const override=entry.routeHelperOverrides.find(o=>o.routeIndexes.includes(binding.routeIndex));
  assert.equal(changed.helperText,override?.helperTextEn??entry.successor.en.helperText);
  for(const key of ['id','type','options','required','contextOnly'])assert.deepEqual(changed[key],q[key]);
  const unknownAudience=reviewedPacketQuestion(q,{state,pathwayId,participantOwnsRecord:false});assert.equal(unknownAudience.prompt,q.prompt);assert.equal(unknownAudience.helperText,q.helperText);
  const drift={...q,prompt:q.prompt+' '};assert.equal(reviewedPacketQuestion(drift,{state,pathwayId,participantOwnsRecord:true}).prompt,drift.prompt);
  participantChecks++;
 }
}
assert.ok(model.questions.filter(q=>q.helperText).every(q=>!q.helperText.includes('A volunteer can help')),'ordinary MS model must use reviewed self-service successors');
console.log(JSON.stringify({status:'PASS_EXACT_COPY_SCOPE_AND_WIRE_PRESERVATION',catalogRows:catalog.entries.length,scopedChecks:checks,participantCopyRows:participantCatalog.entries.length,participantChecks,publicStates:states.size,protectedModelLastFourSuccessorPreserved:true,protectedBrowserAcceptance:false}));
