import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const A = await import('../src/lib/rcap-engine/arkansas-record-origin.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { parseJurisdictionProfile } = await import('../src/lib/expungement-ai/frontend/schemas.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {default: predecessors}=await import('./test-ar-record-origin-fixtures.mjs');
const checks = [], check = (id, pass) => checks.push({ id, pass: !!pass });
const same = (a,b) => { try { assert.deepEqual(a,b); return true; } catch { return false; } };
const profile = getProfileByJurisdiction('AR'), pub = projectPublicProfile(profile), parsed = parseJurisdictionProfile(pub);
// These controls deliberately exercise an unanswered origin. The generated new
// synthetic example may explicitly supply one; it is not a legacy fixture.
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.map(w => {
 const missingOrigin = { ...w, finalAnswers: { ...w.finalAnswers } };
 delete missingOrigin.finalAnswers.ar_record_origin;
 return missingOrigin;
});
check('strict-public-schema', parsed.ok);
const question = pub.questions.find(q => q.id === A.AR_RECORD_ORIGIN_ID);
check('explicit-origin-control', question?.type === 'single_choice');
check('bilingual-control', question?.translations?.es?.prompt && question?.optionDisplay?.federal?.translations?.es?.label);
for (const value of [undefined,null,'State or local','Arkansas','Little Rock','unknown',{},true,['arkansas'],{value:'arkansas',unknown:false}]) {
 const answers = { residency_or_location:'Arkansas', county_or_filing_location:'Pulaski', court:'Pulaski Circuit Court', jurisdiction_scope:'State or local', ar_record_origin:value };
 const before = structuredClone(answers);
 check('no-inference/'+JSON.stringify(value),A.arkansasRecordOrigin(answers)==='unknown');
 check('no-mutation/'+JSON.stringify(value),same(answers,before));
}
for(const value of ['arkansas','other_state','federal']) check('explicit/'+value,A.arkansasRecordOrigin({ar_record_origin:value})===value);
for(const state of ['MS','GA','IL','NY']) check('other-state-unchanged/'+state,!projectPublicProfile(getProfileByJurisdiction(state)).questions.some(q=>q.id===A.AR_RECORD_ORIGIN_ID));
for(const route of A.AR_RECORD_ORIGIN_ROUTES) {
 const witness=witnesses.find(w=>w.pathwayKey===`AR:${route}`), answers={...witness.finalAnswers,residency_or_location:{value:'Memphis',unknown:false},court:'Synthetic Pulaski Circuit Court',county_or_filing_location:{value:'Pulaski',unknown:false}};
 const before=structuredClone(answers);
 const unresolved=evaluateScreening({jurisdiction:'AR',profileVersion:profile.profileVersion,matterId:'synthetic-ar-no-inference',answers:{...witness.finalAnswers,court:'Pulaski Circuit Court',county_or_filing_location:'Pulaski'}});
 check(route+'/actual-gate-does-not-infer-from-state-local-and-venue',unresolved.resultCode==='needs_more_info'&&unresolved.missingQuestionIds.includes(A.AR_RECORD_ORIGIN_ID)&&!unresolved.paymentAllowed);
 for(const origin of [undefined,'unknown','arkansas']) for(const exclusion of ['Sex offense or registration','DUI/DWI or serious traffic']) {
  const r=evaluateScreening({jurisdiction:'AR',profileVersion:profile.profileVersion,matterId:'synthetic-origin-exclusion',answers:{...witness.finalAnswers,ar_record_origin:origin,state_exclusion_categories:[exclusion]}});
  check(route+'/'+String(origin)+'/'+exclusion+'/prior-exclusion-preserved',r.resultCode==='likely_not_eligible'&&r.reasons[0].code==='ar.state_exclusion_selected'&&!r.paymentAllowed);
 }
 for(const origin of [undefined,'unknown','arkansas']) {
  const r=evaluateScreening({jurisdiction:'AR',profileVersion:profile.profileVersion,matterId:'synthetic-origin-federal',answers:{...witness.finalAnswers,ar_record_origin:origin,jurisdiction_scope:'Federal'}});
  check(route+'/'+String(origin)+'/existing-hard-stop-preserved',r.resultCode==='hard_stop'&&r.reasons[0].code==='ar.federal_or_out_of_scope'&&!r.paymentAllowed);
 }

 check(route+'/screening-control',selectScreeningQuestionIds(profile,pub,answers).includes(A.AR_RECORD_ORIGIN_ID));
 check(route+'/protected-correction-control',P.factualPathwayCorrectionIds('AR',route,answers).includes(A.AR_RECORD_ORIGIN_ID));
 for(const value of ['arkansas','other_state','federal','unknown']) {
  const all={...answers,ar_record_origin:value};
  const inactive=sanitizeAnswersForQuestionIds(all,Object.keys(all),[],parsed.data);
  for(const id of ['ar_record_origin','residency_or_location','court','county_or_filing_location']) check(route+'/'+value+'/inactive/'+id,same(inactive[id],all[id]));
  const resumed=sanitizeResumedAnswersForQuestionIds(parsed.data,all,[]);
  for(const id of ['ar_record_origin','residency_or_location','court','county_or_filing_location']) check(route+'/'+value+'/reload/'+id,same(resumed[id],all[id]));
 }
 const collection=P.packetCollectionFor({jurisdiction:'AR',pathwayId:route,requiredInputIds:['residency_or_location'],serverFacts:{},screeningAnswers:{...witness.finalAnswers,ar_record_origin:'arkansas'}});
 check(route+'/origin-does-not-fill-legacy-location',!collection.facts.find(f=>f.factId==='residency_or_location')?.value);
 check(route+'/legacy-obligation-not-discarded',collection.facts.some(f=>f.factId==='residency_or_location'&&f.collection==='unresolved'));
 const authoritative=evaluate({jurisdiction:'AR',profileVersion:profile.profileVersion,matterId:'synthetic-ar-origin',answers:witness.finalAnswers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:witness.finalAnswers,packetAnswers:{residency_or_location:answers.residency_or_location,court:answers.court,county_or_filing_location:answers.county_or_filing_location},dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-13T01:00:00Z'});
 check(route+'/real-draft-seed',seed);
 if(seed) {
  const old={status:'unverified',reason:'synthetic-origin',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
  const model=P.protectedPacketInformationModelFor(old);
  check(route+'/protected-model',model);
  if(model) {
   check(route+'/actual-builder-control',model.builderQuestions.some(q=>q.id===A.AR_RECORD_ORIGIN_ID));
   const patch=P.packetInformationPatch({existingItem:{id:'synthetic-ar-origin',jurisdiction:'AR',artifactRefs:{}},protectedVerification:old,answers:{ar_record_origin:'arkansas'}});
   const next=patch?.protectedTransition.nextVerification;
   check(route+'/real-explicit-save',next?.draftSnapshot.packetAnswers.ar_record_origin==='arkansas');
   if(next) for(const id of ['residency_or_location','court','county_or_filing_location']) check(route+'/legacy-raw-preserved/'+id,same(next.draftSnapshot.packetAnswers[id],old.draftSnapshot.packetAnswers[id]));
   check(route+'/no-auto-verification',next?.status!=='verified'&&!patch?.readyToGenerate);
  }
 }
 check(route+'/inputs-immutable',same(answers,before));
}
for(const fixture of predecessors.rows) {
 const original=structuredClone(fixture.record), before=structuredClone(original), prefix=fixture.route;
 const model=P.protectedPacketInformationModelFor(original);
 check(prefix+'/genuine-prior-held-readable',model&&model.pathwayId===original.draftSnapshot.pathwayId&&!model.reviewSafety.safe);
 check(prefix+'/prior-read-immutable',same(original,before));
 if(!model) continue;
 for(const legacy of ['Arkansas','State or local','Pulaski','Memphis',{value:'Arkansas',unknown:false}]) {
  const prior=structuredClone(original);prior.draftSnapshot.packetAnswers.residency_or_location=legacy;prior.draftHash=P.protectedPacketDraftHash(prior.draftSnapshot);
  const current=P.protectedPacketInformationModelFor(prior);
  check(prefix+'/actual-protected-no-origin-inference/'+JSON.stringify(legacy),current&&current.missingInputIds.includes(A.AR_RECORD_ORIGIN_ID)&&!current.reviewSafety.safe&&same(current.initialAnswers.residency_or_location,legacy));
 }
 check(prefix+'/origin-now-missing',model.missingInputIds.includes(A.AR_RECORD_ORIGIN_ID));
 const item={id:'synthetic-ar-origin-predecessor',jurisdiction:'AR',artifactRefs:{}};
 let record=original;
 for(const value of ['unknown','other_state','federal','arkansas']) {
  const previous=record;
  const patch=P.packetInformationPatch({existingItem:item,protectedVerification:previous,answers:{ar_record_origin:value}});
  record=patch?.protectedTransition.nextVerification;
  check(prefix+'/'+value+'/actual-save',record&&record.draftSnapshot.packetAnswers.ar_record_origin===value);
  if(!record)break;
  const next=P.protectedPacketInformationModelFor(record);
  check(prefix+'/'+value+'/reload',next&&next.initialAnswers.ar_record_origin===value);
  check(prefix+'/'+value+'/no-verification',!patch.readyToGenerate&&record.status!=='verified'&&!record.draftSnapshot.paymentAllowed);
  check(prefix+'/'+value+'/compare-and-swap',patch.protectedTransition.expectedPriorRevision===previous.revision);
  for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers']) for(const [id,raw] of Object.entries(previous.draftSnapshot[map])) if(id!==A.AR_RECORD_ORIGIN_ID) check(prefix+'/'+value+'/preserve/'+map+'/'+id,same(record.draftSnapshot[map][id],raw));
  const expected=original.draftSnapshot.pathwayId==='situation-b-misdemeanor-convictions'?'guidance_only':value==='unknown'?'needs_more_info':value==='arkansas'?original.draftSnapshot.resultCode:'likely_not_eligible';
  check(prefix+'/'+value+'/expected-result',record.draftSnapshot.resultCode===expected);
 }
 for(const [field,value]of Object.entries({profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',pathwayId:'wrong',resultCode:'packet_ready',paymentAllowed:true,packetType:'wrong',selectedTrackId:'wrong',serverFacts:{jurisdiction:'AR',pathway_id:'wrong'}})) {
  const bad=structuredClone(original);bad.draftSnapshot[field]=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
  check(prefix+'/reject-tampered-'+field,P.protectedPacketInformationModelFor(bad)===null);
 }
}
// Filing-venue/output branch of the same members: venue stays source-owned and
// distinct from origin and residence; no AR output reads the legacy answers.
{
 const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
 const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
 const read=p=>JSON.parse(fs.readFileSync(p)), ok=fn=>{try{fn();return true;}catch{return false;}};
 const memo=read('data/record-clearing/legal-design-intake/AR.memo.json'), registry=read('data/record-clearing/factory-v2-route-registry.json');
 const finals=read('data/rcap-ledger/public-witness-answer-sets.json').witnesses;
 const LEGACY=['residency_or_location','ar_record_origin','jurisdiction_scope','county_or_filing_location','court'];
 const factIds=o=>{const out=[];const w=x=>{if(Array.isArray(x))x.forEach(w);else if(x&&typeof x==='object'){if(typeof x.factId==='string')out.push(x.factId);Object.values(x).forEach(w);}};w(o);return out;};
 const convicted=/offense was committed and the person was convicted/i;
 const venueTracks={'situation-a-non-convictions':{'ar-arrest-seal':/county of arrest/i,'ar-nonconviction-seal':/nolle prosequi or dismissal/i},
  'situation-b-misdemeanor-convictions':{'ar-misdemeanor-dwi-seal':convicted,'ar-misdemeanor-seal':convicted},
  'situation-c-felony-convictions':{'ar-felony-seal':convicted,'ar-cs-possession-seal':convicted}};
 for(const [route,tracks] of Object.entries(venueTracks)){
  check(route+'/venue/registry-track-is-reviewed-candidate',registry.routes.find(x=>x.pathwayKey==='AR:'+route).registryTrackIds.every(t=>Object.hasOwn(tracks,t)));
  for(const [trackId,venue] of Object.entries(tracks)){
   const t=memo.tracks.find(x=>x.trackId===trackId), dir=`data/rcap-all50/overlays/census-v1/ar/${trackId}-set--official-pdf-fill/`;
   check(route+'/'+trackId+'/source-owned-court-venue',t.destination.kind==='court'&&venue.test(t.geography.venue+' '+t.destination.name));
   if(trackId==='ar-nonconviction-seal')check(route+'/'+trackId+'/unresolved-acquittal-venue-not-invented',/acquittals and never-filed charges remains unresolved/i.test(t.geography.venue+' '+t.destination.name));
   check(route+'/'+trackId+'/memo-inputs-never-legacy-location',!t.participantInputs.some(q=>LEGACY.includes(q.key)));
   if(!fs.existsSync(dir))continue;
   const ids=factIds(read(dir+'production-field-map.json'));
   check(route+'/'+trackId+'/map-has-no-legacy-alias',!ids.some(id=>LEGACY.includes(id)));
   check(route+'/'+trackId+'/no-commercial-output-binding',read(dir+'product-wiring.json').binding.paymentEligible===false);
  }
  for(const trackId of Object.keys(tracks))for(const surface of ['checkout creation','packet generation','participant delivery'])
   check(route+'/'+trackId+'/'+surface+'/no-output',ok(()=>{const r=packetFulfillmentAuthority('AR',route,surface,{trackId});assert.equal(r.allowed,false);assert.deepEqual(r.missing,['fulfillment record']);}));
  const plan=packetPlanForPathway(profile,route), base=finals.find(w=>w.pathwayKey==='AR:'+route).finalAnswers;
  const collect=extra=>P.packetCollectionFor({jurisdiction:'AR',pathwayId:route,requiredInputIds:plan.requiredInputIds,serverFacts:{jurisdiction:'AR',pathway_id:route},screeningAnswers:{...base,...extra},prefilledAnswers:{},savedAnswers:{}});
  const fact=(c,id)=>c.facts.find(f=>f.factId===id);
  const blank=fact(collect({residency_or_location:undefined,court:undefined}),'residency_or_location');
  check(route+'/venue/blank-legacy-location-stays-unresolved',blank?.collection==='unresolved'&&blank.source==='unresolved_route_rule_scope'&&!('value' in blank));
  const distinct={ar_record_origin:'arkansas',residency_or_location:'Memphis, Tennessee',county_or_filing_location:'Pulaski',court:'Pulaski Circuit Court'}, before=structuredClone(distinct), c=collect(distinct);
  check(route+'/venue/distinct-residence-retained-not-venue',fact(c,'residency_or_location')?.value==='Memphis, Tennessee');
  check(route+'/venue/distinct-filing-court-retained',fact(c,'court')?.value==='Pulaski Circuit Court');
  const nested={ar_record_origin:'arkansas',residency_or_location:{value:'Memphis, Tennessee',unknown:false},county_or_filing_location:{value:'Pulaski',unknown:false},court:'Pulaski Circuit Court'}, nestedBefore=structuredClone(nested);collect(nested);
  check(route+'/venue/raw-inputs-unmutated',ok(()=>{assert.deepEqual(distinct,before);assert.deepEqual(nested,nestedBefore);}));
  for(const unknown of [{unknown:true},'I am not sure']){const u=collect({residency_or_location:unknown});check(route+'/venue/unknown-location-never-becomes-venue/'+JSON.stringify(unknown),!ok(()=>assert.deepEqual(fact(u,'court')?.value,unknown))&&!ok(()=>assert.deepEqual(u.knownFacts?.court,unknown))&&!Object.values(u.knownFacts??{}).includes('Pulaski'));}
 }
}
const failed=checks.filter(c=>!c.pass), report={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,scope:'AR original GA-14-M01018/19/20 record-origin clarification and lossless legacy/venue preservation. No authenticated database, legal/copy approval, rendering or commercial acceptance claimed.'};
if(process.argv[2]) fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,checks:checks.length,failed}));assert.equal(failed.length,0);
