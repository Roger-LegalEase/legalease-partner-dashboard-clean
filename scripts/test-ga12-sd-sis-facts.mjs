// GA-12 Q-cde3ef0a5bed58e60545 / QD-bd6b15fff22cbe1501cb.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
// Resume preservation is still asserted; the old screening-arm mutant is equivalent after the protected-field move.
const mutations={
 precedence:['south-dakota-sis-facts.ts','if (a.sd_sis_granted !== "Yes")','if (a.offense_level !== "Misdemeanor" && a.offense_level !== "Felony") return review("record_review"); if (a.sd_sis_granted !== "Yes")'],
 completion_settles:['south-dakota-sis-facts.ts','["yes", "no", "not_sure", "not_applicable"].includes(a.court_requirements_completed)','["yes", "no"].includes(a.court_requirements_completed)'],
 level_settles:['south-dakota-sis-facts.ts','["Felony", "Misdemeanor", "Infraction or violation", "Traffic or driving matter", "Municipal or ordinance matter"].includes(a.offense_level)','["Felony", "Misdemeanor"].includes(a.offense_level)'],
 consumer:['evaluator.ts','southDakotaSisContext(profile, evaluated.pathwayId) && evaluated.resultCode === "guidance_only"','false'],
 order:['south-dakota-sis-facts.ts','a.sd_sis_granted !== "Yes"','false'],
 duty:['south-dakota-sis-facts.ts','a.court_requirements_completed !== "yes" || a.sd_sis_discharge_dismissal !== "Yes"','false'],
 licence:['south-dakota-sis-facts.ts','a.sd_sis_teaching_licence === "Yes" && a.sd_sis_specified_charge === "Yes"','false'],
 history:['packet-collection.ts','const sdSisCategoryHistory = sdSisCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);','const sdSisCategoryHistory = false;'],
 retained_editor:['packet-information.ts','sdSisCategoryIsHistory(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))','false'],
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replace(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
// GA-16-M01616 location/history checks share this existing CI command.
await import('./test-sd-sis-location-history.mjs');
const G=await import('../src/lib/rcap-engine/south-dakota-sis-facts.ts');
const Stage=await import('../src/lib/rcap-engine/south-dakota-23a-27-17-escalation.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {sdSisCategoryIsHistory:history,resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {planIncludedDocuments}=await import('../src/lib/rcap/grade-a/composer.ts');
const F=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const route='suspended-imposition-of-sentence-sealing',key='SD:'+route,profile=getProfileByJurisdiction('SD'),pub=projectPublicProfile(profile),spec=packetSpecificationFor(key);
assert.equal(G.SD_SIS_ROUTE,route);assert.equal(Stage.SD_SIS_ROUTE_KEY,key);
const parsed=parseJurisdictionProfile(pub);assert(parsed.ok);
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey===key);
const base={...witness.answers,sd_sis_granted:'Yes',sd_sis_discharge_dismissal:'Yes',sd_sis_record_public:'Yes',sd_sis_prior_felony:'No',sd_sis_prior_sis:'No',sd_sis_teaching_licence:'No'};
let checks=0,httpCases=0;const records=new Map(),maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,checks}));throw e;}};
const evalFor=answers=>evaluate({jurisdiction:'SD',profileVersion:profile.profileVersion,matterId:'TEST-sd-sis',answers});
const modelFor=answers=>{const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:evalFor(answers),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);return{status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};};
const decision=(patch,code)=>{const a={...base,...patch},before=structuredClone(a);assert.equal(G.southDakotaSisFacts(a).code,code);const r=evalFor(a).evaluation;assert.equal(r.pathwayId,route);assert.equal(r.paymentAllowed,false);assert(!r.resultCode.startsWith('packet_ready'));if(r.resultCode==='guidance_only'){assert(r.reasons.some(r=>r.code==='sd.guidance_only_no_user_filed_court_petition'));assert(r.reasons.some(r=>r.code==='sd.sis_'+code));}assert.deepEqual(a,before);return r;};
// Reviewer counterexamples: valid answered values settle; they are not missing intake.
const ledger=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json'));
const generator=fs.readFileSync('scripts/generate-rcap-public-witness-answer-sets.mjs','utf8');
const ast=ts.createSourceFile('generator.mjs',generator,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=name=>{const n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(n);return n.getText(ast);};
const converge=new Function('evaluateAuthoritativeScreeningResult','CLEAR_RECORD',declaration('answerFor')+'\n'+declaration('converge')+'\nreturn converge;')(evaluate,ledger.determinism.clearRecord);
const questions=new Map();function visit(n){if(!n||typeof n!=='object')return;if(n.id&&n.type&&(n.prompt||n.label)&&!questions.has(n.id))questions.set(n.id,n);Object.values(n).forEach(visit);}visit(pub);
check('reviewed SD witness still settles to prior review',()=>{
 const w=ledger.witnesses.find(w=>w.pathwayKey===key);assert(w);const run=converge('SD',profile,questions,w.seedAnswers);
 assert.equal(run.error,null);assert.equal(run.evaluation.resultCode,'guidance_only');assert.equal(run.evaluation.paymentAllowed,false);
 assert.deepEqual(run.evaluation.missingQuestionIds,[]);assert(run.evaluation.reasons.some(r=>r.code==='sd.sis_prior_review'));
});
const predecessorCases=[{"id":"court_requirements_completed","value":"not_sure","draftHash":"98c030ca6257c9a511f7632d07b34a3cb86715c6f139a32a78f04fc9ed844075"},{"id":"court_requirements_completed","value":"not_applicable","draftHash":"e9edee6292d572909cb35edb923ccfdcbef7277c6ddfeb68df89a4a3f2a33964"},{"id":"offense_level","value":"Infraction or violation","draftHash":"c9ba9f2ade246ae93f8b58b4559980cfe78e4053c36e9b123b9cfaeee0b24e87"},{"id":"offense_level","value":"Traffic or driving matter","draftHash":"8fcdcfc36151cc4a7e65ca4665a0f78976e96d2b411578d93ef179af369845d1"},{"id":"offense_level","value":"Municipal or ordinance matter","draftHash":"9f92c098db276dcc8cd2b8b50e4040cf1913f4ab19c1bf5f79ea11dde0a04342"}];
for(const {id,value,draftHash}of predecessorCases)check('reviewer answered value settles/'+id+'/'+value,()=>{
 const answers={...base,[id]:value},before=structuredClone(answers),run=converge('SD',profile,questions,answers,answers);
 assert.equal(run.error,null,JSON.stringify(run.unresolvedEvaluation));assert.deepEqual(run.answers,answers);
 const code=id==='court_requirements_completed'?'duty_review':'record_review',r=run.evaluation;
 assert.equal(G.southDakotaSisFacts(answers).code,code);assert.equal(r.resultCode,'guidance_only');assert.equal(r.paymentAllowed,false);
 assert.deepEqual(r.missingQuestionIds,[]);assert(r.reasons.some(r=>r.code==='sd.sis_'+code));assert(r.nextSteps.includes(G.SD_SIS_COPY[code]));assert(!r.nextSteps.some(x=>/add these details/i.test(x)));
 const record=modelFor(answers);assert.equal(record.draftHash,draftHash);const saved=structuredClone(record);assert(P.protectedPacketInformationModelFor(record));
 assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,saved);
 assert.deepEqual(record,saved);assert.deepEqual(answers,before);
 for(const map of maps)if(Object.hasOwn(saved.draftSnapshot[map],id))assert.deepEqual(record.draftSnapshot[map][id],value);
});
for(const id of ['court_requirements_completed','offense_level'])for(const raw of [undefined,'',[],{unexpected:true}])check('blank or malformed remains requested/'+id+'/'+JSON.stringify(raw),()=>{
 const answers={...base,[id]:raw},facts=G.southDakotaSisFacts(answers);assert.equal(facts.code,'missing');assert(facts.ids.includes(id));assert(evalFor(answers).evaluation.missingQuestionIds.includes(id));
});
for(const level of ['Infraction or violation','Traffic or driving matter','Municipal or ordinance matter'])for(const [patch,code]of [[{sd_sis_granted:'No'},'order_review'],[{court_requirements_completed:'no'},'duty_review'],[{sd_sis_prior_felony:'Yes'},'prior_review'],[{sd_sis_teaching_licence:'Yes',sd_sis_specified_charge:'Yes'},'licence_review'],[{[Stage.SD_SIS_STAGE_FACT_ID]:Stage.SD_SIS_STAGE_RECORD_CORRECTED},'stage_review'],[{sd_sis_record_public:'No'},'public_status_review']])check('specific SIS hold precedes general level review/'+level+'/'+code,()=>{
 const r=decision({...patch,offense_level:level},code);assert.deepEqual(r.missingQuestionIds,[]);assert.equal(r.paymentAllowed,false);
});
check('complete record facts retain the original guidance hold',()=>{const r=decision({},'record_review');assert.equal(r.resultCode,'guidance_only');assert(r.reasons.some(r=>r.code==='sd.sis_record_review'));});
for(const [patch,code]of [[{sd_sis_granted:'No'},'order_review'],[{sd_sis_discharge_dismissal:'No'},'duty_review'],[{court_requirements_completed:'no'},'duty_review'],[{offense_level:'Felony'},'felony_review'],[{sd_sis_prior_felony:'Yes'},'prior_review'],[{sd_sis_prior_sis:'Yes'},'prior_review'],[{sd_sis_teaching_licence:'Yes',sd_sis_specified_charge:'Yes'},'licence_review'],[{sd_sis_record_public:'No'},'public_status_review'],[{[Stage.SD_SIS_STAGE_FACT_ID]:Stage.SD_SIS_STAGE_RECORD_CORRECTED},'stage_review']])check(code+'/'+JSON.stringify(patch),()=>decision(patch,code));
for(const id of G.SD_SIS_FACT_IDS)for(const value of [undefined,'I am not sure',true,['Yes'],{value:'Yes',unknown:true}])check('no inferred fact/'+id+'/'+JSON.stringify(value),()=>{const a={...base,sd_sis_teaching_licence:'Yes',sd_sis_specified_charge:'No',[id]:value};const d=G.southDakotaSisFacts(a);assert.equal(d.code,'missing');assert(d.ids.includes(id));});
check('teacher charge is conditional and retains hidden saved raw',()=>{
 assert(!selectScreeningQuestionIds(profile,pub,base).includes('sd_sis_specified_charge'));
 assert(!selectScreeningQuestionIds(profile,pub,{...base,sd_sis_teaching_licence:'Yes'}).includes('sd_sis_specified_charge'));
 assert(!P.factualPathwayCorrectionIds('SD',route,base).includes('sd_sis_specified_charge'));assert(P.factualPathwayCorrectionIds('SD',route,{...base,sd_sis_teaching_licence:'Yes'}).includes('sd_sis_specified_charge'));
 const a={...base,sd_sis_specified_charge:'Yes'};assert.equal(sanitizeResumedAnswersForQuestionIds(parsed.data,a,['ownership_scope']).sd_sis_specified_charge,'Yes');
 assert.equal(G.southDakotaSisFacts(a).code,'record_review');
});
for(const q of G.SD_SIS_QUESTIONS)check('protected record fact/'+q.id,()=>{
 const a={...base,sd_sis_teaching_licence:'Yes'};assert(!selectScreeningQuestionIds(profile,pub,a).includes(q.id));assert.equal(q.stage,'packet_information');assert.equal(q.lifecyclePhase,'postpay_packet_field');assert(P.factualPathwayCorrectionIds('SD',route,a).includes(q.id));
 assert(P.protectedPacketInformationModelFor(modelFor(a)).questions.some(x=>x.id===q.id));assert(q.translations.es.prompt);
 assert.deepEqual(sanitizeResumedAnswersForQuestionIds(parsed.data,{...a,[q.id]:'No'},['ownership_scope'])[q.id],'No');
 for(const sibling of profile.pathways.filter(p=>p.id!==route))assert(!G.southDakotaSisQuestionApplies(profile,sibling.id,a,q.id));
});
check('category guard refuses source, spec and own-field drift',()=>{
 assert(history(profile,route,spec));assert(!history(profile,route,null));
 const p=structuredClone(profile);p.source.sourceCorpusSha256='changed';assert(!history(p,route,spec));assert(!G.southDakotaSisContext(p,route));
 const s=structuredClone(spec);s.requiredFacts.push({factId:'offense_category'});assert(!history(profile,route,s));
 const input={jurisdiction:'SD',pathwayId:route,requiredInputIds:['offense_category'],serverFacts:{},screeningAnswers:base,savedAnswers:{},specification:spec,questionById:new Map()};
 const f=resolvePacketCollection(input).facts[0];assert.equal(f.source,'sd_sis_category_history');assert.equal(f.active,false);assert.equal(f.optional,true);
 assert.notEqual(resolvePacketCollection({...input,recordOwnQuestionIds:new Set(['offense_category'])}).facts[0].source,f.source);
});
for(const map of maps)for(const raw of ['SDCL 23A-27-53 drug deferred','SIS under 23A-27-17',{unknown:true,value:'SIS'},null,['Old shape']])check('category raw history/'+map+'/'+JSON.stringify(raw),()=>{
 const record=modelFor(base);record.draftSnapshot[map].offense_category=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record),m=P.protectedPacketInformationModelFor(record);assert(m);assert(!m.missingInputIds.includes('offense_category'));
 const r=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;assert(r.reasons.some(r=>r.code==='sd.sis_record_review'));assert.equal(r.paymentAllowed,false);
 assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
});
// B-1b: offense-level uncertainty still has no packet plan, so the retained-editor fallback is required.
check('held offense-level uncertainty keeps the editable literal category and its history',()=>{
 const record=modelFor({...base,offense_level:'I am not sure'});assert.equal(record.draftSnapshot.resultCode,'needs_review');assert(!record.draftSnapshot.packetPlan);
 record.draftSnapshot.packetAnswers.offense_category='Old SIS category';record.draftSnapshot.prefilledAnswers.offense_category={value:'Old drug category',unknown:true};record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
 const model=P.protectedPacketInformationModelFor(record);assert(model);assert(model.questions.some(q=>q.id==='offense_category'));
 const patch=P.packetInformationPatch({protectedVerification:record,answers:{offense_category:{value:'Participant amended literal category',unknown:false}}});assert(patch);const next=patch.protectedTransition.nextVerification;
 assert.equal(next.revision,record.revision+1);assert.equal(next.draftSnapshot.paymentAllowed,false);assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.resultCode,'needs_review');
 for(const map of ['prefilledAnswers','packetAnswers']){const h=next.draftSnapshot.dependencies.semanticAnswerHistory.find(h=>h.factId==='offense_category'&&h.source===map);assert(h);assert.deepEqual(h.value,before.draftSnapshot[map].offense_category);}assert.deepEqual(record,before);
});
check('existing stage selection unchanged and never inferred from new facts',()=>{
 for(const stage of [undefined,Stage.SD_SIS_STAGE_REQUEST_NOT_MADE,Stage.SD_SIS_STAGE_RECORD_CORRECTED,Stage.SD_SIS_STAGE_RECORD_NOT_CORRECTED]){
  const a=stage?{[Stage.SD_SIS_STAGE_FACT_ID]:stage}:{};
  const before=planIncludedDocuments(spec,a);assert.deepEqual(planIncludedDocuments(spec,{...base,...a,sd_sis_record_public:'No'}),before);
  assert.equal(Stage.southDakotaEscalationStageReached(a),stage===undefined?undefined:stage===Stage.SD_SIS_STAGE_RECORD_NOT_CORRECTED);
  assert.equal(Object.hasOwn(base,Stage.SD_SIS_STAGE_FACT_ID),false);
 }
});
check('original witness and absent new facts remain readable without rewriting history',()=>{
 const record=modelFor(witness.answers),before=structuredClone(record);assert(P.protectedPacketInformationModelFor(record));assert.equal(record.draftSnapshot.resultCode,'guidance_only');assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
 const result=evalFor(witness.answers).evaluation;assert(result.reasons.some(r=>r.code==='sd.sis_missing'));assert.equal(result.paymentAllowed,false);
});
check('no authority and deferred drug track stays absent',()=>{
 const a=F.packetFulfillmentAuthority('SD',route,'checkout creation');assert.equal(a.allowed,false);assert.equal(a.reason,`${key}: NO_RECORD. No Grade-A fulfillment record binds ${key}; a route nobody has written a record for fails closed.`);
 assert(!profile.pathways.some(p=>p.id.includes('23a-27-53')));
});
for(const id of ['first','second'])records.set('synthetic-'+id,modelFor(base));
// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-sd-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'SD', artifactRefs: {} });
globalThis.__sdSisTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-sd-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-sd-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-sd-owner');
    assert.equal(transition.expectedPriorRevision, records.get(briefcaseItemId).revision);
    records.set(briefcaseItemId, structuredClone(transition.nextVerification)); saves++;
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  decorateBriefcaseItemForPresentation: async () => ({ commercialActions: {} }),
  protectedPacketVerificationSeedFromTrustedSource: () => { throw Error('No substitute source'); },
  readTrustedBriefcasePresentationSource: () => { throw Error('No substitute source'); }
};
const apiUrl = pathToFileURL(`${process.cwd()}/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts`).href;
let source = fs.readFileSync(new URL(apiUrl), 'utf8');
for (const [bindings, module] of [
  [['getRcapBriefcaseAuthState'], '@/lib/rcap/briefcase/auth'],
  [['getBriefcaseItem'], '@/lib/expungement-ai/briefcase'],
  [['decorateBriefcaseItemForPresentation', 'protectedPacketVerificationSeedFromTrustedSource', 'readTrustedBriefcasePresentationSource'], '@/lib/expungement-ai/briefcase-presentation-authority'],
  [['persistProtectedPacketVerification', 'readProtectedPacketVerification'], '@/lib/expungement-ai/verification-cas']
]) {
  const pattern = new RegExp('import \\{\\s*' + bindings.join(',\\s*') + '\\s*\\} from "' + module + '";');
  assert(pattern.test(source));
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__sdSisTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for(const [id,original]of [...records]){
 const stored=structuredClone(original);stored.draftSnapshot.prefilledAnswers.offense_category={value:'Old drug category',unknown:true};stored.draftSnapshot.packetAnswers.offense_category='Old SIS category';stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);records.set(id,stored);
 const others=[...records].filter(([k])=>k!==id).map(([k,v])=>[k,structuredClone(v)]);
 let response=await post(id,{});httpCases++;check(id+' HTTP no-op',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stored);});
 response=await post(id,{sd_sis_specified_charge:'Yes'});httpCases++;const denied=await response.json();check(id+' premature conditional fact refused',()=>{assert.equal(response.status,422);assert.equal(denied.error,'invalid_packet_answers');assert.deepEqual(records.get(id),stored);});
 for(const [answers,expected]of [[{sd_sis_granted:'No'},'order_review'],[{sd_sis_granted:'Yes'},'record_review'],[{sd_sis_teaching_licence:'Yes'},'missing'],[{sd_sis_specified_charge:'Yes'},'licence_review'],[{sd_sis_teaching_licence:'No'},'record_review']]){
  const before=structuredClone(records.get(id));response=await post(id,answers);httpCases++;const body=await response.json();
  check(id+' staged fact amendment '+JSON.stringify(answers),()=>{
   assert.equal(response.status,200);const s=records.get(id).draftSnapshot;for(const[k,v]of Object.entries(answers))assert.equal(s.packetAnswers[k],v);
   const r=P.evaluateProtectedPacketFacts(s).evaluation;assert(r.reasons.some(r=>r.code==='sd.sis_'+expected));assert.equal(r.paymentAllowed,false);assert.equal(body.readyToGenerate,false);
   for(const map of maps)for(const[k,v]of Object.entries(before.draftSnapshot[map]))if(!Object.hasOwn(answers,k))assert.deepEqual(s[map][k],v,map+'/'+k);
   for(const[k,v]of others)assert.deepEqual(records.get(k),v);
  });
 }
 response=await post(id,{sd_sis_granted:'I am not sure'});httpCases++;check(id+' explicit uncertainty remains held',()=>{assert.equal(response.status,200);assert.equal(records.get(id).draftSnapshot.packetAnswers.sd_sis_granted,'I am not sure');assert.equal(P.evaluateProtectedPacketFacts(records.get(id).draftSnapshot).evaluation.paymentAllowed,false);});
 response=await post(id,{sd_sis_granted:'Yes',offense_category:{value:'Participant amended literal category',unknown:false}});httpCases++;
 check(id+' category amendment archives raw copies',()=>{assert.equal(response.status,200);const s=records.get(id).draftSnapshot;for(const map of ['prefilledAnswers','packetAnswers']){const h=s.dependencies.semanticAnswerHistory.find(h=>h.factId==='offense_category'&&h.source===map);assert(h);assert.deepEqual(h.value,stored.draftSnapshot[map].offense_category);}assert(!Object.hasOwn(s.packetAnswers,Stage.SD_SIS_STAGE_FACT_ID));});
 const stable=structuredClone(records.get(id)),savesBefore=saves;
 for(const[kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-sd-owner';response=await post(id,{sd_sis_granted:'No'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+' '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-sd-owner';
}
delete globalThis.__sdSisTransport;
console.log(JSON.stringify({status:'PASS',checks,httpCases,originalIds:['Q-cde3ef0a5bed58e60545','QD-bd6b15fff22cbe1501cb'],route:key,limits:['Existing guidance and NO_RECORD hold; no eligibility or drug-route transfer.','Pure stage planning only, no composition/render/service/hosted call.','Draft EN/ES needs qualified review.']}));
