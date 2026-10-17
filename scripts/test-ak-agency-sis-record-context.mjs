import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
const H=await import('../src/lib/expungement-ai/ak-pardon-record-context.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const profile=getProfileByJurisdiction('AK');
const routes=[H.AK_MISTAKEN_IDENTITY_CONTEXT_ROUTE,H.AK_SIS_CONTEXT_ROUTE];
const options=['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure'];
const question={id:'record_type',stage:'packet_information',type:'single_choice',required:true,prompt:'What type of record is this?',options,translations:{es:{prompt:'¿Qué tipo de registro es este?'}}};
let checks=0;const check=(label,fn)=>{try{fn();checks++;}catch(e){e.message=label+': '+e.message;throw e;}};
const maps=[
 'data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/production-field-map.json',
 'data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/production-field-map.json'
];
const decisions=['data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json','data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json'];
const memo=read('data/record-clearing/legal-design-intake/AK.memo.json');
for(const [i,route] of routes.entries()){
 const spec=packetSpecificationFor('AK:'+route),source={memo,fieldMap:read(maps[i]),decision:read(decisions[i])};
 check('exact retained source accepted '+route,()=>{assert.equal(spec,undefined);assert(H.akAgencyOrSisRecordIsContext(profile,route,spec,source));assert(!JSON.stringify(source.fieldMap).includes('record_type'));});
 for(const key of Object.keys(source))for(const value of [null,{}, {...source[key],unreviewedChange:true}])check('source drift refused '+key,()=>assert(!H.akAgencyOrSisRecordIsContext(profile,route,spec,{...source,[key]:value})));
 for(const mutate of [p=>p.jurisdiction.code='OR',p=>p.profileVersion='changed',p=>p.source.sourceCorpusSha256='changed',p=>p.pathways.find(x=>x.id===route).triggerFields.push('record_type')])check('profile drift refused',()=>{const p=structuredClone(profile);mutate(p);assert(!H.akAgencyOrSisRecordIsContext(p,route,spec));});
 check('new registered contract refuses inherited exception',()=>assert(!H.akAgencyOrSisRecordIsContext(profile,route,{routeKey:'AK:'+route})));
 const original=structuredClone(question),q=H.akAgencyOrSisRecordContextQuestion(question,profile,route,spec);
 check('only optional contextual descriptor changed',()=>{assert.notEqual(q,question);assert.deepEqual(question,original);assert.equal(q.required,false);assert.deepEqual(q.options,options);assert.equal(q.type,'single_choice');assert.equal(q.stage,'packet_information');assert(q.prompt.includes('optional history'));assert(q.translations.es.prompt.includes('historial opcional'));assert(q.helperText.includes(i?'not a filing packet':'does not currently offer'));});
 for(const mutate of [q=>q.id='case_outcome',q=>q.stage='screening',q=>q.type='multi_choice',q=>q.prompt='New meaning',q=>q.options.reverse()])check('descriptor drift identity preserved',()=>{const q=structuredClone(question);mutate(q);assert.strictEqual(H.akAgencyOrSisRecordContextQuestion(q,profile,route,spec),q);});
 for(const raw of [...options,{value:'Court case',unknown:true},['Conviction'],null])check('descriptor never reads, coerces or rewrites retained history',()=>{const history={screeningAnswers:{record_type:raw},prefilledAnswers:{record_type:'Arrest or charge'},packetAnswers:{record_type:raw}};const before=structuredClone(history);H.akAgencyOrSisRecordContextQuestion(question,profile,route,spec);assert.deepEqual(history,before);assert(!Object.hasOwn(history.packetAnswers,'juvenileRecord'));assert(!Object.hasOwn(history.packetAnswers,'sisImposed'));assert(!Object.hasOwn(history.packetAnswers,'identity_error'));});
}
for(const route of [null,'',...profile.pathways.map(p=>p.id).filter(id=>!routes.includes(id))])check('all sibling and absent routes unchanged',()=>{assert(!H.akAgencyOrSisRecordIsContext(profile,route,undefined));assert.strictEqual(H.akAgencyOrSisRecordContextQuestion(question,profile,route,undefined),question);});
check('prior accepted pardon and juvenile predicates remain exact',()=>{assert(H.akPardonRecordIsContext(profile,H.AK_PARDON_CONTEXT_ROUTE,undefined));assert(H.akJuvenileRecordIsContext(profile,H.AK_JUVENILE_CONTEXT_ROUTE,undefined));assert(!H.akPardonRecordIsContext(profile,routes[0],undefined));assert(!H.akJuvenileRecordIsContext(profile,routes[1],undefined));});
check('mistaken-identity adopted delivery withholding preserved',()=>{const decision=read(decisions[0]).answers.find(x=>x.id==='Q1-route-treatment-guidance-or-packet');assert(decision.families.includes('ak-mistaken-identity-set'));assert.equal(decision.effect,'DELIVERY_TYPE_REFUSED');assert(decision.ownerDecision.includes('GUIDANCE / OUT-OF-SCOPE STANDS'));});
check('SIS newer resolved source reused, no renewed old research blocker',()=>{const decision=read(decisions[1]).researchTrackDecisions.find(x=>x.jurisdiction==='AK'&&x.trackId==='ak-set-aside');assert(decision);assert(decision.completeSectionText.includes('LEGAL RESEARCH: COMPLETE'));assert(decision.completeSectionText.includes('original sentencing criminal case'));assert(decision.completeSectionText.includes('prosecutor service'));});
// Explicit diagnostic switch preserves the demonstrated before-consumer gap.
// It is not the default future integration assertion and does not claim a fix.
let consumerGap;
if(process.argv.includes('--expect-unintegrated')){
 const P=await import('../src/lib/expungement-ai/packet-information.ts');const{evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
 consumerGap=[];
 for(const route of routes){const w=read('data/rcap-ledger/public-witness-fixtures.json').fixtures.find(x=>x.pathwayKey==='AK:'+route),authoritative=evaluate({jurisdiction:'AK',profileVersion:w.profileVersion,matterId:'source-only-two-route-probe',answers:w.answers}),seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:w.answers,dependencies:{},capturedAt:'2026-10-15T00:00:00.000Z'});assert(seed);const r={status:'unverified',reason:'source-probe-only',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(r),m=P.protectedPacketInformationModelFor(r);check('unintegrated actual consumer remains required, not falsely closed',()=>{assert(m.builderQuestions.find(q=>q.id==='record_type')?.required);assert(m.missingInputIds.includes('record_type'));assert.equal(seed.snapshot.paymentAllowed,false);assert.equal(seed.snapshot.selectedTrackId,null);assert.deepEqual(r,before);});consumerGap.push({route,resultCode:seed.snapshot.resultCode,requiredUnusedTaxonomyStillPresent:true});}
}
console.log(JSON.stringify({status:'PASS_STAGED_HELPER_ONLY',checks,consumerGap,qualifiedSpanishReview:'pending',noConsumerClosure:true,noDatabase:true,noRender:true}));
