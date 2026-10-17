import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const load = p => import(pathToFileURL(process.cwd() + '/' + p).href);
const P = await load('src/lib/expungement-ai/packet-information.ts');
const H = await load('src/lib/rcap-engine/ohio-juvenile-source-stage.ts');
const Q = await load('src/lib/expungement-ai/oh-juvenile-stage-questions.ts');
const { getProfileByJurisdiction } = await load('src/lib/rcap-engine/profile-registry.ts');
const { packetPlanForPathway } = await load('src/lib/rcap-engine/packet-planner.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile = getProfileByJurisdiction('OH'), route = Q.OH_JUVENILE_ROUTE, [request, forum, sealed] = Q.OH_JUVENILE_STAGE_IDS;
const checks = [], check = (name, value, expected) => { assert.deepEqual(value, expected, name); checks.push(name); };
// Unchanged intentional negative /routes/229/scenarios/B, archive SHA3173bbec9a9cd51ef2abd6cd05e68c1830585d833cd45157dbb7f31fe3dedcc1.
// Explicit stage vectors below are synthetic claims about requested help; none establishes eligibility.
const original = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted', offense_level: 'Misdemeanor', possible_pathway_context: 'Juvenile sealing and expungement', age_at_offense: '30', trafficking_status: 'No', pardon_status: 'No', sentence_completion_date: 'Yes', pending_cases: 'No', resolved_timing_bucket: 'gt_10_years' };
const plan = packetPlanForPathway(profile, route), item = { id: 'synthetic-oh-juvenile-stage', jurisdiction: 'OH', artifactRefs: {} };
check('exact-source-contract', H.ohJuvenileSourceContract(profile, route, null), true);
for (const [name, mutate] of [
  ['version', p => { p.profileVersion += '-drift'; }], ['corpus', p => { p.source.sourceCorpusSha256 = 'wrong'; }],
  ['pathway', p => { p.pathways.find(x => x.id === route).label += ' drift'; }],
  ['plan', p => { p.packetGenerator.pathways.find(x => x.pathwayId === route).routeType = 'forged'; }],
  ['juvenile-ordered-rule-body', p => { p.orderedDecisionRules.find(r => r.candidatePathwayIds?.includes(route)).priority += 1; }],
  ['juvenile-ordered-rule-membership', p => { p.orderedDecisionRules.find(r => r.candidatePathwayIds?.includes(route)).candidatePathwayIds = []; }],
  ['missing-juvenile-waits', p => { delete p.waitingPeriodRules; }],
  ['missing-juvenile-exclusions', p => { delete p.exclusionRules; }],
  ['juvenile-exclusion-body', p => { p.exclusionRules.find(r => r.id === 'exclusion-04').ruleText += ' drift'; }],
  ['juvenile-exclusion-membership', p => { p.exclusionRules = p.exclusionRules.filter(r => r.id !== 'exclusion-05'); }],
  ['juvenile-wait-body', p => { p.waitingPeriodRules.find(r => r.id === 'wait-13').ruleText += ' drift'; }],
  ['juvenile-wait-order', p => { const a = p.waitingPeriodRules.findIndex(r => r.id === 'wait-13'), b = p.waitingPeriodRules.findIndex(r => r.id === 'wait-22'); [p.waitingPeriodRules[a], p.waitingPeriodRules[b]] = [p.waitingPeriodRules[b], p.waitingPeriodRules[a]]; }]
]) { const bad = structuredClone(profile); mutate(bad); check('refuse-' + name, H.ohJuvenileSourceContract(bad, route, null), false); }
check('wrong-route', H.ohJuvenileSourceContract(profile, profile.pathways.find(p => p.id !== route).id, null), false);
check('wrong-state', H.ohJuvenileSourceContract(getProfileByJurisdiction('MD'), route, null), false);
check('specification-refused', H.ohJuvenileSourceContract(profile, route, {}), false);
check('memo-drift-refused', H.ohJuvenileSourceContract(profile, route, null, []), false);
const vectors = [
  ['unknown', {}, 'unknown_stage', [request]],
  ['information', { [request]: 'court_status_information' }, 'information', [request]],
  ['application-unknown-forum', { [request]: 'sealing_application' }, 'forum_review', [request, forum]],
  ['application-adult-transfer', { [request]: 'sealing_application', [forum]: 'adult_criminal_case' }, 'forum_review', [request, forum]],
  ['application-juvenile', { [request]: 'sealing_application', [forum]: 'juvenile_court_record' }, 'sealing_application_held', [request, forum]],
  ['earlier-unconfirmed-order', { [request]: 'earlier_expungement_request', [forum]: 'juvenile_court_record' }, 'sealed_record_review', [request, forum, sealed]],
  ['earlier-no-order', { [request]: 'earlier_expungement_request', [forum]: 'juvenile_court_record', [sealed]: 'no' }, 'sealed_record_review', [request, forum, sealed]],
  ['earlier-existing-order', { [request]: 'earlier_expungement_request', [forum]: 'juvenile_court_record', [sealed]: 'yes' }, 'earlier_request_held', [request, forum, sealed]],
  ['explicit-unknown-over-old-known', { [request]: { value: 'court_status_information', unknown: true } }, 'unknown_stage', [request]]
];
for (const [name, answers, code, active] of vectors) {
  const facts = H.ohJuvenileStageFacts({ ...original, ...answers });
  check(name + '/stage', facts.code, code); check(name + '/active-facts', H.ohJuvenileStageFactIds(answers), active);
  check(name + '/no-application-authority', [facts.paymentAllowed, facts.applicationReady], [false, false]);
  for (const [placement, maps] of [
    ['absent', {}], ['screen-known', { screeningAnswers: { court: 'Example County District Court' } }],
    ['screen-unknown', { screeningAnswers: { court: { value: 'Example County District Court', unknown: true } } }],
    ['saved-known', { savedAnswers: { court: 'Example County District Court' } }],
    ['prefilled-known', { prefilledAnswers: { court: 'Example County District Court' } }]
  ]) {
    const input = { jurisdiction: 'OH', pathwayId: route, requiredInputIds: plan.requiredInputIds, serverFacts: { jurisdiction: 'OH', pathway_id: route }, screeningAnswers: { ...original, ...maps.screeningAnswers }, prefilledAnswers: maps.prefilledAnswers ?? {}, savedAnswers: { ...maps.savedAnswers, ...answers } };
    const before = structuredClone(input), collection = P.packetCollectionFor(input);
    assert(collection); check(name + '/' + placement + '/raw-preserved', input, before);
    const court = collection.facts.find(f => f.factId === 'court');
    check(name + '/' + placement + '/court-context-only-explicit-information', court.source === 'oh_juvenile_information_court_context', code === 'information');
    for (const id of Q.OH_JUVENILE_STAGE_IDS) {
      const fact = collection.facts.find(f => f.factId === id); assert(fact);
      check(name + '/' + placement + '/' + id + '/active', fact.active, active.includes(id));
      check(name + '/' + placement + '/' + id + '/optional', fact.optional, active.includes(id) ? true : undefined);
    }
    check(name + '/' + placement + '/plan-unchanged', packetPlanForPathway(profile, route), plan);
  }
}
check('no-inferred-forum-or-order', H.ohJuvenileStageFacts({ ...original, court: 'Juvenile Court', age_at_offense: '16', pardon_status: 'Yes' }).code, 'unknown_stage');
const authority = evaluate({ jurisdiction: 'OH', profileVersion: profile.profileVersion, matterId: item.id, answers: original });
check('original-natural-route', authority.evaluation.pathwayId, route);
check('original-natural-held-result', authority.evaluation.resultCode, 'guidance_only');
check('original-natural-payment-false', authority.evaluation.paymentAllowed, false);
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative: authority, screeningAnswers: original, packetAnswers: { court: 'Earlier raw court' }, dependencies: { commercialFlowVersion: 1 }, capturedAt: '2026-10-16T00:00:00Z' }); assert(seed);
let record = { status: 'unverified', reason: 'synthetic-source-stage', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot, hash: null, snapshot: null };
const initialRecord = structuredClone(record), model = P.protectedPacketInformationModelFor(record); assert(model);
check('old-record-read-no-mutation', record, initialRecord);
check('old-record-new-meaning-not-attested', Q.OH_JUVENILE_STAGE_IDS.filter(id => Object.hasOwn(model.initialAnswers, id)), []);
check('initial-offered-stage-control', [...P.heldPacketCorrectionInputIds(model, 'guidance_only')], [request]);
check('initial-unsafe', model.reviewSafety.safe, false);
const noop = P.packetInformationPatch({ existingItem: item, protectedVerification: record, answers: {} }); assert(noop);
check('noop-exact-record', noop.protectedTransition.nextVerification, record);
check('noop-cas-revision', noop.protectedTransition.expectedPriorRevision, record.revision);
check('noop-no-ready', noop.readyToGenerate, false);
for (const [name, answers, , active] of vectors.filter(v => typeof v[1][request] === 'string')) {
  const priorModel = P.protectedPacketInformationModelFor(record); assert(priorModel);
  const expectedDelta = Object.fromEntries(Object.entries(answers).filter(([id, value]) => priorModel.initialAnswers[id] !== value));
  const patch = P.packetInformationPatch({ existingItem: item, protectedVerification: record, answers }); assert(patch, name + '/material-save');
  check(name + '/exact-delta', patch.protectedTransition.answerDelta, expectedDelta);
  check(name + '/material-cas', patch.protectedTransition.expectedPriorRevision, record.revision);
  record = patch.protectedTransition.nextVerification;
  const current = P.protectedPacketInformationModelFor(record); assert(current);
  check(name + '/protected-active-control', [...P.heldPacketCorrectionInputIds(current, 'guidance_only')], active);
  check(name + '/no-ready', patch.readyToGenerate, false); check(name + '/unsafe', current.reviewSafety.safe, false);
  check(name + '/generic-court-raw-retained', record.draftSnapshot.packetAnswers.court, 'Earlier raw court');
  const again = P.packetInformationPatch({ existingItem: item, protectedVerification: record, answers: {} }); assert(again);
  check(name + '/reentry-noop-exact', again.protectedTransition.nextVerification, record);
  check(name + '/plan-preserved', record.draftSnapshot.packetPlan, seed.snapshot.packetPlan);
}
assert(record.draftSnapshot.dependencies.semanticAnswerHistory.some(h => h.factId === request && h.value === 'court_status_information'));
checks.push('prior-request-in-source-history');
for (const q of Q.OH_JUVENILE_STAGE_QUESTIONS) {
  assert(q.translations.es.prompt && q.translations.es.helperText); checks.push(q.id + '/ENES-prompt-and-help');
  for (const option of q.options) { assert(q.optionDisplay[option].translations.es.label); checks.push(q.id + '/' + option + '/ENES-option'); }
}
const browserModule = fs.readFileSync('src/lib/expungement-ai/oh-juvenile-stage-questions.ts', 'utf8');
assert(!browserModule.match(/^import(?! type).*from/gm)); checks.push('browser-descriptors-no-runtime-imports');
// GA-14-M01059 / Q-da1aeae32132608fb1f4: OH juvenile `court` on the application,
// 2151.358 and unknown branches stays an unresolved obligation (known kept); no juvenile
// instrument, family, guidance, spec or participant service/fee/docket copy exists (v4).
{
const path=(await import('node:path')).default,root=process.cwd();
const ohCheck=(name,fn)=>{let pass=true;try{fn();}catch{pass=false;}check(name,pass,true);};
process.env.RCAP_EVALUATOR_TODAY='2026-10-16';
const loadModule=p=>import(pathToFileURL(root+'/'+p).href);
const P=await loadModule('src/lib/expungement-ai/packet-information.ts'),Q=await loadModule('src/lib/expungement-ai/oh-juvenile-stage-questions.ts');
const {getProfileByJurisdiction}=await loadModule('src/lib/rcap-engine/profile-registry.ts'),{packetPlanForPathway}=await loadModule('src/lib/rcap-engine/packet-planner.ts');
const {packetFulfillmentAuthority}=await loadModule('src/lib/expungement-ai/packet-fulfillment-authority.ts'),{renderPreflight}=await loadModule('src/lib/expungement-ai/render-preflight.ts');
const {packetSpecificationFor}=await loadModule('src/lib/rcap/grade-a/packet-specification.ts'),{prepayGateFactIds}=await loadModule('src/lib/expungement-ai/packet-collection.ts');
const route='juvenile-sealing-and-expungement',profile=getProfileByJurisdiction('OH'),plan=packetPlanForPathway(profile,route),[request,forum]=Q.OH_JUVENILE_STAGE_IDS;
ohCheck('M01059/route-identity',()=>{assert.equal(Q.OH_JUVENILE_ROUTE,route);assert.equal(profile.pathways.find(p=>p.id===route)?.routeType,'juvenile');assert(plan.requiredInputIds.includes('court'));assert.equal(packetSpecificationFor('OH:'+route),undefined);});
const original={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'Juvenile sealing and expungement',age_at_offense:'30',trafficking_status:'No',pardon_status:'No',sentence_completion_date:'Yes',pending_cases:'No',resolved_timing_bucket:'gt_10_years'};
// v4: (C) person application and 2151.358 earlier expungement have no bound juvenile court/instrument here; court stays an unresolved obligation.
for(const [branch,stage] of [['C-application-unknown-forum',{[request]:'sealing_application'}],['C-application-juvenile',{[request]:'sealing_application',[forum]:'juvenile_court_record'}],['2151.358-earlier',{[request]:'earlier_expungement_request',[forum]:'juvenile_court_record'}],['unknown-service',{[request]:'unknown'}]]){
 for(const [placement,court,known] of [['absent',undefined,false],['typed-unknown',{value:'Example County District Court',unknown:true},false],['known','Example County District Court',true]]){
  const input={jurisdiction:'OH',pathwayId:route,requiredInputIds:plan.requiredInputIds,serverFacts:{jurisdiction:'OH',pathway_id:route},screeningAnswers:court===undefined?{...original}:{...original,court},prefilledAnswers:{},savedAnswers:{...stage}};
  const c=P.packetCollectionFor(input),f=c.facts.filter(x=>x.factId==='court');
  ohCheck(`M01059/${branch}/${placement}/court-disposition`,()=>{assert.equal(f.length,1);if(known){assert.equal(f[0].collection,'already_known');assert.deepEqual(f[0].value,court);assert(!c.unresolvedRequiredFacts.includes('court'));}else{assert.equal(f[0].collection,'unresolved');assert.equal(f[0].source,'unresolved_route_rule_scope');assert(!Object.hasOwn(f[0],'value'));assert(prepayGateFactIds(c).includes('court'));}});
 }
}
for(const s of ['checkout creation','packet generation'])ohCheck('M01059/no-instrument/'+s,()=>{const a=packetFulfillmentAuthority('OH',route,s,{trackId:null});assert.equal(a.allowed,false);assert(a.reason.startsWith('OH:'+route+': NO_RECORD.'),a.reason);});
ohCheck('M01059/no-render-authority',()=>assert.deepEqual(renderPreflight({snapshot:{jurisdiction:'OH',pathwayId:route,selectedTrackId:null},verificationHash:'x',facts:{court:'Example County District Court'}}),{ready:false,reason:'no_composable_specification_for_route',missingFactIds:[]}));
// Every existing OH family/destination, case-insensitive: none binds this juvenile route or a 2151.356/.358 instrument.
const ohDir='data/rcap-all50/overlays/census-v1/oh/';
for(const d of fs.readdirSync(root+'/'+ohDir)){ohCheck('M01059/family-not-bound/'+d,()=>{let blob='';for(const f of fs.readdirSync(root+'/'+ohDir+d))if(f.endsWith('.json'))blob+=fs.readFileSync(root+'/'+ohDir+d+'/'+f,'utf8');assert(!/juvenile|2151\.35[68]|oh-ls-[12]/i.test(blob));});}
ohCheck('M01059/guidance-and-specs-not-bound',()=>{assert(!/juvenile|2151/i.test(fs.readFileSync(root+'/data/rcap-all50/guidance-packets/oh.json','utf8')));assert(!fs.readdirSync(root+'/data/record-clearing/packet-specifications').some(f=>/^OH-/i.test(f)));});
ohCheck('M01059/legacy-state-pack-not-runtime',()=>{const hits=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(!p.endsWith(path.join('state-packs','ohio')))walk(p);}else if(/\.(ts|tsx)$/.test(e.name)&&/state-packs\/ohio/.test(fs.readFileSync(p,'utf8')))hits.push(p);}};walk(root+'/src');assert.deepEqual(hits,[]);});
// v4: no invented docket/application fee and no participant prosecutor service in the current EN/ES stage copy.
ohCheck('M01059/stage-copy-no-participant-service-fee-docket',()=>{const text=JSON.stringify(Q.OH_JUVENILE_STAGE_QUESTIONS);assert(!/\bserv(e|ice)\b|prosecut|\bfee\b|docket|court costs|county attorney|(mail|deliver) a copy|notif|tarifa|cuota|fiscal|arancel|honorarios|costas|ministerio p[uú]blico|n[uú]mero de causa/i.test(text),text.match(/\bserv(e|ice)\b|prosecut|\bfee\b|docket|notif|tarifa|cuota|fiscal/i)?.[0]);});
}
console.log(JSON.stringify({ status: 'PASS', checks: checks.length, scope: 'Original Qda stage-only protected controls; timing, venue, components, final qualified copy and actual owner acceptance remain separate. No authority granted.' }));
