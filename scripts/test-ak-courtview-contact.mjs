import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
const mutations={
 packet_confirmation:['packet-information.ts','if (isAkCourtviewContact(snapshot.jurisdiction, snapshot.pathwayId)) for (const id of AK_TF810_GROUND_IDS)','if (false) for (const id of AK_TF810_GROUND_IDS)'],
 packet_ground_only:['ak-courtview-contact.ts','akCourtviewGroundInputs({ ...snapshot.packetAnswers,','akCourtviewGroundInputs({ ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers,'],
 official_box:['ak-courtview-contact.ts','"2a": "Check Box2.1"','"2a": "Check Box2.2"'],
 exact_ground:['ak-courtview-contact.ts','const ground = knownText(answers[AK_TF810_GROUND_ID]);','const ground = knownText(String(answers[AK_TF810_GROUND_ID]).trim().replace(/^Ground /, ""));'],
 required_ground:['ak-courtview-contact.ts','type: "single_choice", required: true, contextOnly: false','type: "single_choice", required: false, contextOnly: false']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replace(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
const C=await import('../src/lib/expungement-ai/ak-courtview-contact.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {questionAnswerState}=await import('../src/lib/expungement-ai/question-answer-state.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {getCurrentFulfillmentRecord}=await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const route=C.AK_COURTVIEW_PATHWAY, ids=C.AK_TF810_CONTACT_IDS, fields=C.AK_TF810_CONTACT_FIELDS;
const caseId='ak_tf810_case_number';
assert(fields.some(f=>f.id===caseId && f.field==='caseNo' && f.matterKey==='case_number' && !f.optional), 'explicit source-owned case identification missing');
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(x=>x.pathwayKey==='AK:'+route);
const answers={...witness.answers,contact_information:'Retained contact prose: court number and old personal details',residency_or_location:{value:'Earlier residence or record origin — not a mailing address',unknown:true}};
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:evaluate({jurisdiction:'AK',profileVersion:witness.profileVersion,matterId:'synthetic-ak-contact',answers:witness.answers}),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_not_historical_owner',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};let stored=structuredClone(original),checks=0;
const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,checks}));e.message=name+': '+e.message;throw e}};
const model=()=>P.protectedPacketInformationModelFor(stored);
const snap=()=>stored.draftSnapshot??stored.snapshot;
const save=answers=>{const result=P.packetInformationPatch({protectedVerification:stored,answers});assert(result,'protected patch refused '+Object.keys(answers));stored=result.protectedTransition.nextVerification;return result};
// AK F3/F4: independent expected fields from the official TF-810 geometry.
const expectedGroundBoxes={"1":"Check Box1.0","2":"Check Box2.0","2a":"Check Box2.1","2b":"Check Box2.2","3":"Check Box3.0","3a":"Check Box3.1","3b":"Check Box3.2","4":"Check Box4.0","5":"Check Box5.0","6":"Check Box6.0","7":"Check Box7.0","8":"Check Box8.0","9":"Check Box8.1","10":"Check Box8.2"};
check('ground boxes match independently read official geometry',()=>assert.deepEqual(C.AK_TF810_GROUND_BOXES,expectedGroundBoxes));
for(const raw of ['Ground 1',' 1 ',1])check('ground values are exact printed choice ids/'+JSON.stringify(raw),()=>{
 const answers={ak_tf810_case_still_public:'Yes',ak_tf810_ground:raw},before=structuredClone(answers);const facts=C.akCourtviewGroundInputs(answers);assert.deepEqual(facts.selectionsFromHeldFacts,{});assert.deepEqual(facts.unresolvedIds,[C.AK_TF810_GROUND_ID]);assert.deepEqual(answers,before);
});
for(const map of ['screeningAnswers','prefilledAnswers'])for(const [copy,packet,expected,missing]of [
 [{ak_tf810_ground:'1'},{},[],C.AK_TF810_GROUND_ID],
 [{ak_tf810_ground_2_detail:'2a'},{ak_tf810_ground:'2'},['Check Box2.0'],'ak_tf810_ground_2_detail'],
 [{ak_tf810_ground_3_detail:'3b'},{ak_tf810_ground:'3'},['Check Box3.0'],'ak_tf810_ground_3_detail'],
 [{ak_tf810_ground_rule:'Synthetic literal rule'},{ak_tf810_ground:'10'},['Check Box8.2'],'ak_tf810_ground_rule']
])check('only packet answers supply official ground facts/'+map+'/'+missing,()=>{
 const snapshot=structuredClone(original.draftSnapshot);snapshot.packetAnswers.ak_tf810_case_still_public='Yes';Object.assign(snapshot[map],copy);Object.assign(snapshot.packetAnswers,packet);const before=structuredClone(snapshot),facts=C.akCourtviewContactInputs(snapshot);assert(facts);assert.deepEqual(Object.keys(facts.selectionsFromHeldFacts),expected);assert(facts.unresolvedIds.includes(missing));assert(!facts.writes.some(w=>w.factId==='ak_tf810_ground_rule'));assert.deepEqual(snapshot,before);
 const record={status:'unverified',revision:0,draftHash:P.protectedPacketDraftHash(snapshot),draftSnapshot:snapshot},model=P.protectedPacketInformationModelFor(record);assert(model);assert.equal(model.initialAnswers[missing],undefined);assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
 const confirmed=P.packetInformationPatch({protectedVerification:record,answers:copy});assert(confirmed);const next=confirmed.protectedTransition.nextVerification;assert.equal(next.revision,1);assert.deepEqual(next.draftSnapshot.packetAnswers[missing],copy[missing]);assert(!C.akCourtviewContactInputs(next.draftSnapshot).unresolvedIds.includes(missing));assert.equal(next.draftSnapshot.paymentAllowed,record.draftSnapshot.paymentAllowed);assert.equal(C.akCourtviewContactInputs(next.draftSnapshot).generationAllowed,false);
 const old=next.draftSnapshot[map][missing],archived=next.draftSnapshot.dependencies.semanticAnswerHistory?.find(h=>h.factId===missing&&h.source===map);assert.deepEqual(old??archived?.value,copy[missing]);assert.deepEqual(snapshot,before);
 assert.deepEqual(P.packetInformationPatch({protectedVerification:next,answers:copy}).protectedTransition.nextVerification,next);
});
check('all official ground choice questions remain required',()=>{const qs=C.akCourtviewContactQuestions('AK',route,{ak_tf810_case_still_public:'Yes'},true);for(const id of [C.AK_TF810_GROUND_ID,'ak_tf810_ground_2_detail','ak_tf810_ground_3_detail'])assert.equal(qs.find(q=>q.id===id)?.required,true);});
check('actual canonical authority remains absent',()=>assert.equal(getCurrentFulfillmentRecord('AK:'+route),null));
check('original gap and source map identity are explicit',()=>{assert.equal(packetSpecificationFor('AK:'+route),undefined);const bytes=fs.readFileSync(C.AK_TF810_CONTACT_SOURCE.mapPath);assert.equal(createHash('sha256').update(bytes).digest('hex'),C.AK_TF810_CONTACT_SOURCE.mapSha256);const map=JSON.parse(bytes).maps[0];for(const f of fields)assert.equal(map.explicitMappings[f.field],'participantKey' in f?'participant.'+f.participantKey:'matter.'+f.matterKey);assert.deepEqual(Object.keys(map.explicitMappings).sort(),['address','caseNo','email','name','phoneNo']);});
check('current source ordinary model exposes conditional purpose only',()=>{const m=model();assert(m);assert(m.builderQuestions.some(q=>q.id===ids[0]));for(const f of fields){assert(!m.builderQuestions.some(q=>q.id===f.id));assert(!P.editablePacketInputIds(m).has(f.id));assert(!m.missingInputIds.includes(f.id));}assert.equal(C.akCourtviewContactInputs(snap()),null);assert.equal(P.packetAccountEmailSuggestion(m,'account@example.test'),null);assert.deepEqual(stored,original);});
check('no-op preserves original protected bytes',()=>{save({});assert.deepEqual(stored,original)});
check('explicit visible case offers only current source contacts',()=>{save({[ids[0]]:'Yes'});const m=model();for(const f of fields){assert(m.builderQuestions.some(q=>q.id===f.id));assert(P.editablePacketInputIds(m).has(f.id));assert.equal(m.missingInputIds.includes(f.id),!f.optional);}assert.equal(m.builderQuestions.find(q=>q.id===fields[2].id).required,false);});
const values={ak_tf810_contact_address:{value:'10 Exact Court Contact Ave, Unit 4',unknown:false},ak_tf810_contact_phone:'+1 907 555 0100 ext 12',ak_tf810_contact_email:'Exact.Local+Court@Example.ORG',ak_tf810_case_number:{value:' 3AN-26-00123 CR ',unknown:false}};
check('source-owned contacts save without authority or alias',()=>{save(values);const mapped=C.akCourtviewContactInputs(snap());assert.equal(mapped.writes.length,4);assert.deepEqual(mapped.unresolvedIds,[C.AK_TF810_GROUND_ID]);for(const f of fields)assert.equal(mapped.writes.find(w=>w.factId===f.id).value,typeof values[f.id]==='object'?values[f.id].value:values[f.id]);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const id of ['contact_information','residency_or_location'])assert.deepEqual(snap()[map][id],original.draftSnapshot[map][id]);assert.deepEqual(snap().packetPlan,original.draftSnapshot.packetPlan);assert.equal(snap().paymentAllowed,original.draftSnapshot.paymentAllowed);assert.equal(snap().selectedTrackId,original.draftSnapshot.selectedTrackId);assert.notEqual(stored.status,'verified');assert.equal(mapped.generationAllowed,false);assert.equal(mapped.deliveryAllowed,false);assert.equal(mapped.admissionGranted,false);});
for(const inactive of ['No','I am not sure'])check('inactive '+inactive+' preserves contacts and reentry',()=>{save({[ids[0]]:inactive});assert.equal(C.akCourtviewContactInputs(snap()),null);for(const f of fields){assert(!model().builderQuestions.some(q=>q.id===f.id));assert(!P.editablePacketInputIds(model()).has(f.id));assert.deepEqual(snap().packetAnswers[f.id],values[f.id]);assert(!model().missingInputIds.includes(f.id));}assert.deepEqual(P.packetInformationPatch({protectedVerification:stored,answers:{ak_tf810_contact_email:'inactive@example.test'}}).protectedTransition.nextVerification,stored);save({[ids[0]]:'Yes'});assert.equal(C.akCourtviewContactInputs(snap()).writes.length,4);});
for(const f of fields)check('unknown '+f.id+' remains editable and is not written',()=>{const known=values[f.id],raw={value:typeof known==='object'?known.value:known,unknown:true};save({[f.id]:raw});assert.deepEqual(snap().packetAnswers[f.id],raw);assert(!C.akCourtviewContactInputs(snap()).writes.some(w=>w.factId===f.id));assert.equal(model().missingInputIds.includes(f.id),!f.optional);assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===f.id));save({[f.id]:known});});
check('case number uses only explicit case fact and exact matter destination',()=>{const x=structuredClone(snap());delete x.packetAnswers[caseId];x.screeningAnswers.case_identifier='Unrelated prior case';x.prefilledAnswers.case_number='Generic old case';const unresolved=C.akCourtviewContactInputs(x);assert(unresolved.unresolvedIds.includes(caseId));assert(!unresolved.writes.some(w=>w.field==='caseNo'));const write=C.akCourtviewContactInputs(snap()).writes.find(w=>w.factId===caseId);assert.deepEqual(write,{factId:caseId,documentId:'TF-810',field:'caseNo',matterKey:'case_number',value:values[caseId].value});});
for(const raw of ['', '   ', 'I am not sure', {value:'3AN-26-00123 CR',unknown:true}, ['bad shape']])check('blank/unknown case stays required and raw preserved '+JSON.stringify(raw),()=>{save({[caseId]:raw});assert.deepEqual(snap().packetAnswers[caseId],raw);assert(model().missingInputIds.includes(caseId));const mapped=C.akCourtviewContactInputs(snap());assert(mapped.unresolvedIds.includes(caseId));assert(!mapped.writes.some(w=>w.field==='caseNo'));save({[caseId]:values[caseId]});});
check('optional email can be explicitly removed',()=>{save({ak_tf810_contact_email:''});assert(!model().missingInputIds.includes('ak_tf810_contact_email'));assert(!C.akCourtviewContactInputs(snap()).writes.some(w=>w.field==='email'));save({ak_tf810_contact_email:values.ak_tf810_contact_email});});
check('known text and paired source-consent copy',()=>{const qs=C.akCourtviewContactQuestions('AK',route,{[ids[0]]:'Yes'},true);assert.equal(qs.length,C.AK_TF810_CONTACT_IDS.length);for(const q of qs){assert(q.prompt&&q.translations.es.prompt);assert(q.helperText&&q.translations.es.helperText);}const email=qs.find(q=>q.id===fields[2].id);assert(email.helperText.includes('court and other parties'));assert(email.helperText.includes('court documents'));assert(email.translations.es.helperText.includes('documentos judiciales'));assert(email.helperText.includes('optional'));assert(!email.required);assert.equal(questionAnswerState(email,['not a scalar']),'invalid');});
for(const patch of [{jurisdiction:'GA'},{pathwayId:'executive-pardon-backstop'},{selectedTrackId:'ak-tf800'}])check('wrong route or track no source mapping',()=>assert.equal(C.akCourtviewContactInputs({...snap(),...patch}),null));
for(const key of ['profileVersion','profileSourceFingerprint','profileAuthorityFingerprint'])check('held source projection refuses stale '+key,()=>assert.equal(C.akCourtviewContactInputs({...snap(),[key]:'stale'}),null));
for(const raw of [{unknown:true},{value:'Yes',unknown:true},['Yes'],{value:'Yes',unknown:false,extra:true}])check('uncertain purpose refuses writes '+JSON.stringify(raw),()=>assert.equal(C.akCourtviewContactInputs({...snap(),packetAnswers:{...snap().packetAnswers,[ids[0]]:raw}}),null));
for(const source of ['screeningAnswers','prefilledAnswers'])for(const f of fields)check('conflicting source '+source+'/'+f.id,()=>{const x=structuredClone(snap());x[source][f.id]='conflicting value';assert(!C.akCourtviewContactInputs(x).writes.some(w=>w.factId===f.id));});
for(const key of ['profileSourceFingerprint','profileAuthorityFingerprint'])check('protected model refuses stale '+key,()=>{const x=structuredClone(stored);x.draftSnapshot[key]='0'.repeat(64);x.draftHash=P.protectedPacketDraftHash(x.draftSnapshot);assert.equal(P.protectedPacketInformationModelFor(x),null)});
const unavailable = [
 ['ak_tf810_contact_address',['none','ninguno','ninguna','unavailable','not available','confidential','no disponible','confidencial','no address','no mailing address','sin dirección','sin dirección postal','no tengo dirección']],
 ['ak_tf810_contact_phone',['none','ninguno','ninguna','unavailable','not available','confidential','no disponible','confidencial','no phone','no phone number','no telephone','no telephone number','sin teléfono','sin número de teléfono','no tengo teléfono']],
 ['ak_tf810_contact_email',['unavailable','no disponible','confidential','confidencial','none','no email','no email address','ninguno','ninguna','sin correo electrónico','no tengo correo electrónico']]
];
for(const[id,tokens]of unavailable)for(const token of tokens)for(const raw of [token,{value:token,unknown:false}])check('exact non-fact preserved '+id+'/'+JSON.stringify(raw),()=>{
 save({[id]:raw});assert.deepEqual(snap().packetAnswers[id],raw);assert(!C.akCourtviewContactInputs(snap()).writes.some(w=>w.factId===id));assert.equal(model().missingInputIds.includes(id),id!=='ak_tf810_contact_email');assert(P.editablePacketInputIds(model()).has(id));
 save({[id]:values[id]});assert(C.akCourtviewContactInputs(snap()).writes.some(w=>w.factId===id));
});
for(const [id,value]of [['ak_tf810_contact_address','10 Confidential Lane'],['ak_tf810_contact_phone','+1 907 555 0100 (unavailable after 5 pm)'],['ak_tf810_contact_email','confidential@example.test']])check('valid literal not parsed by substring '+id,()=>assert.equal(C.akCourtviewContactText(id,value),value));
console.log(JSON.stringify({status:'PASS_AK_TF810_CONTACT_PURE',checks,sourceCurrency:'existing_hold_preserved',qualifiedSpanishReview:'pending',databaseRuns:0,renderRuns:0}));

// Actual existing HTTP handler, with auth/storage transport replaced in memory.
// No JWT, database session, claim or authorized delivery is manufactured.
const {pathToFileURL}=await import('node:url'),{default:ts}=await import('typescript');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const item={id:'synthetic-ak-tf810-owner',jurisdiction:'AK',artifactRefs:{}};
let owner='synthetic-ak-owner',writes=0;stored=structuredClone(original);
const present=()=>decorate({consumerAuthUserId:'synthetic-ak-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:false,reason:'synthetic_absent'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__akContactTransport={getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner,userEmail:'account-not-court@example.test'}),getBriefcaseItem:async(user,id)=>user==='synthetic-ak-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);writes++;stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const apiFile=process.cwd()+'/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts';let apiSource=fs.readFileSync(apiFile,'utf8');
for(const[bindings,module]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']]){
 const pattern=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(pattern.test(apiSource));apiSource=apiSource.replace(pattern,bindings.map(name=>'const '+name+'=(...args:unknown[])=>(globalThis as any).__akContactTransport.'+name+'(...args);').join('\n'));
}
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(apiFile).href,source:ts.transpileModule(apiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}});
const API=await import(pathToFileURL(apiFile).href),url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information',context={params:Promise.resolve({itemId:item.id})};
const post=async(answers,extra={},target=url)=>API.POST(new Request(target,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const read=async()=>{const r=await API.GET(new Request(url),context);assert.equal(r.status,200);return r.json();};
let body=await read();check('actual GET is read-only and offers purpose, not inferred contact',()=>{assert.deepEqual(stored,original);assert(body.questions.some(q=>q.id===ids[0]));assert.equal(body.accountEmailSuggestion,null);for(const f of fields)assert(!body.questions.some(q=>q.id===f.id));});
let response=await post({[ids[0]]:'Yes'});assert.equal(response.status,200);body=await read();check('actual bilingual owner controls include exact optional email delivery meaning',()=>{for(const f of fields){const q=body.questions.find(q=>q.id===f.id);assert(q);assert(q.prompt&&q.translations.es.prompt);assert(body.reviewQuestions.some(q=>q.id===f.id));}assert(!body.questions.find(q=>q.id===fields[2].id).required);assert.equal(body.accountEmailSuggestion,null);});
response=await post(values);assert.equal(response.status,200);body=await response.json();check('actual source save/reload preserves field values and all authority holds',()=>{assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(v=>v===false));assert.notEqual(stored.status,'verified');assert.equal(stored.hash??null,null);assert.equal(stored.snapshot??null,null);assert.equal(C.akCourtviewContactInputs(snap()).writes.length,4);});
body=await read();check('actual reload has exact saved values',()=>{for(const f of fields)assert.deepEqual(body.answers[f.id],values[f.id]);});
for(const raw of ['', {value:'3AN-26-00123 CR',unknown:true}]){response=await post({[caseId]:raw});assert.equal(response.status,200);body=await read();check('actual case correction preserves raw and leaves before-filing requirement',()=>{assert.deepEqual(body.answers[caseId],raw);assert(model().missingInputIds.includes(caseId));assert(C.akCourtviewContactInputs(snap()).unresolvedIds.includes(caseId));assert(!C.akCourtviewContactInputs(snap()).writes.some(w=>w.field==='caseNo'));assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===caseId));});response=await post({[caseId]:values[caseId]});assert.equal(response.status,200);}
for(const inactive of ['No','I am not sure']){
 response=await post({[ids[0]]:inactive});assert.equal(response.status,200);body=await read();check('actual inactive '+inactive+' hides fields and output without deleting history',()=>{for(const f of fields){assert(!body.questions.some(q=>q.id===f.id));assert.deepEqual(snap().packetAnswers[f.id],values[f.id]);}assert.equal(C.akCourtviewContactInputs(snap()),null);});
 const before=structuredClone(stored),n=writes;response=await post({ak_tf810_contact_email:'not-offered@example.test'});check('actual inactive write refused',()=>{assert.equal(response.status,422);assert.deepEqual(stored,before);assert.equal(writes,n)});
 response=await post({[ids[0]]:'Yes'});assert.equal(response.status,200);body=await read();check('actual reentry restores explicit source values',()=>{for(const f of fields)assert.deepEqual(body.answers[f.id],values[f.id]);});
}
response=await post({ak_tf810_contact_email:{value:values.ak_tf810_contact_email,unknown:true}});assert.equal(response.status,200);check('unknown email revokes mapped delivery choice while retaining raw/history',()=>{assert.deepEqual(snap().packetAnswers.ak_tf810_contact_email,{value:values.ak_tf810_contact_email,unknown:true});assert(!C.akCourtviewContactInputs(snap()).writes.some(w=>w.field==='email'));assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId==='ak_tf810_contact_email'&&h.value===values.ak_tf810_contact_email));});
response=await post({ak_tf810_contact_email:''});assert.equal(response.status,200);check('blank email never blocks completeness or adds consent',()=>{assert(!model().missingInputIds.includes('ak_tf810_contact_email'));assert(!C.akCourtviewContactInputs(snap()).writes.some(w=>w.field==='email'));});
for(const[answers,extra,expected,target]of [[{}, {expectedRevision:0},409,url],[{email:'wrong-field'}, {},422,url],[{ak_tf810_contact_phone:'999'}, {},403,url+'?preparation=ca-prop64-juvenile']]){
 const before=structuredClone(stored),n=writes;response=await post(answers,extra,target);check('actual invalid/stale/mode refusal '+expected,()=>{assert.equal(response.status,expected);assert.deepEqual(stored,before);assert.equal(writes,n);});
}
response=await post({ak_tf810_contact_phone:['wrong-shape']});assert.equal(response.status,200);check('actual malformed raw contact is retained for correction but never mapped',()=>{assert.deepEqual(snap().packetAnswers.ak_tf810_contact_phone,['wrong-shape']);assert(model().missingInputIds.includes('ak_tf810_contact_phone'));assert(!C.akCourtviewContactInputs(snap()).writes.some(w=>w.field==='phoneNo'));});
response=await post({ak_tf810_contact_phone:values.ak_tf810_contact_phone});assert.equal(response.status,200);
response=await post({}, {verify:true});assert.equal(response.status,200);body=await response.json();check('ordinary incomplete verification grants no authority',()=>{assert.equal(body.readyToGenerate,false);assert.notEqual(stored.status,'verified');assert.equal(stored.hash??null,null);assert.equal(stored.snapshot??null,null);assert(Object.values(body.commercialActions).every(v=>v===false));});
for(const[id,raw]of [['ak_tf810_contact_address','confidential'],['ak_tf810_contact_phone',{value:'no phone number',unknown:false}],['ak_tf810_contact_address','no disponible'],['ak_tf810_contact_phone','sin teléfono'],['ak_tf810_contact_email','no email']]){
 response=await post({[id]:raw});assert.equal(response.status,200);body=await read();check('actual unavailable contact remains saved but unresolved '+id+'/'+JSON.stringify(raw),()=>{assert.deepEqual(body.answers[id],raw);assert.equal(model().missingInputIds.includes(id),id!=='ak_tf810_contact_email');assert(!C.akCourtviewContactInputs(snap()).writes.some(w=>w.factId===id));});
 response=await post({[id]:values[id]});assert.equal(response.status,200);
}
owner='wrong-owner';for(const method of ['GET','POST']){const before=structuredClone(stored),n=writes;response=method==='GET'?await API.GET(new Request(url),context):await post({[ids[0]]:'Yes'});check('actual wrong-owner '+method+' refusal',()=>{assert.equal(response.status,404);assert.deepEqual(stored,before);assert.equal(writes,n);});}
console.log(JSON.stringify({status:'PASS_AK_TF810_CONTACT_HANDLER',checks,ownerTransport:'synthetic_in_memory_only',databaseRuns:0,renderRuns:0,qualifiedSpanishReview:'pending',generationOrDeliveryGranted:false}));

// Real Builder SSR: only exact AK contact controls use the same source-fact state.
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const provider=process.cwd()+'/src/components/expungement-ai/LocalizationProvider.tsx',providerUrl=pathToFileURL(provider).href;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:providerUrl,source:ts.transpileModule(fs.readFileSync(provider,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const {LocalizationContext}=await import(providerUrl),{t,resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts'),{AppRouterContext}=await import(pathToFileURL(fs.realpathSync('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js')).href),{PacketInformationBuilder}=await import('../src/components/expungement-ai/PacketInformationBuilder.tsx');
let ssrCases=0;for(const locale of ['en','es'])for(const [id,raw,status]of [
 ['ak_tf810_case_number',{value:'3AN-26-00123 CR',unknown:true},'needs_attention'],['ak_tf810_case_number',undefined,'not_started'],['ak_tf810_case_number','3AN-26-00123 CR','complete'],['ak_tf810_contact_address','unavailable','needs_attention'],['ak_tf810_contact_address','confidencial','needs_attention'],['ak_tf810_contact_phone',{value:'no phone number',unknown:false},'needs_attention'],['ak_tf810_contact_phone','sin teléfono','needs_attention'],['ak_tf810_contact_phone',{value:'+1 907 555 0100',unknown:true},'needs_attention'],['ak_tf810_contact_phone',undefined,'not_started'],['ak_tf810_contact_phone','+1 907 555 0100','complete'],['ak_tf810_contact_address','10 Confidential Lane','complete'],['ak_tf810_contact_email','no email','needs_attention']
])for(const [state,path,enabled]of [['AK',route,true],['AK','other-pathway',false],['NY',route,false],['CA',route,false]]){
 const question=C.akCourtviewContactQuestions('AK',route,{[ids[0]]:'Yes'}).find(q=>q.id===id);
 const html=renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)}},React.createElement(PacketInformationBuilder,{itemId:'synthetic-ak-status',stateCode:state,pathwayId:path,questions:[question],initialAnswers:{[id]:raw},initiallyMissing:[],initialRevision:1,initialResumeSectionId:id}))));
 const generic=questionAnswerState(question,raw),expected=enabled?status:generic==='known_valid'?'complete':generic==='unanswered'?'not_started':'needs_attention';assert(html.includes('data-packet-section-status="'+expected+'"'),JSON.stringify({locale,state,path,id,raw,expected,actual:html.match(/data-packet-section-status="([^"]+)/)?.[1]}));assert(html.includes(expected==='complete'?(locale==='es'?'Completo':'Complete'):expected==='not_started'?(locale==='es'?'Sin empezar':'Not started'):(locale==='es'?'Necesita atención':'Needs attention')));ssrCases++;
}
console.log(JSON.stringify({status:'PASS_AK_TF810_UNAVAILABLE_AND_DISPLAY',checks,ssrCases,rawPreserved:true,defaultStatesPreserved:true,databaseRuns:0,renderRuns:0}));

// Corpus-free MODE 2 controls; official PDF appearances live in test-ak-tf810-mode2-pdf.mjs.
let groundHttpCases=0;
owner='synthetic-ak-owner';stored=structuredClone(original);
response=await post({[ids[0]]:'Yes'});assert.equal(response.status,200);groundHttpCases++;
check('blank ground is required without inventing a choice',()=>{
 assert.equal(model().builderQuestions.find(q=>q.id===C.AK_TF810_GROUND_ID)?.required,true);assert(model().missingInputIds.includes(C.AK_TF810_GROUND_ID));
 assert.deepEqual(C.akCourtviewContactInputs(snap()).selectionsFromHeldFacts,{});
});
// SHA-256 of the exact 15-text AK-TF810-GROUND-OPTIONS-EN-ES-v1 choices array adopted by the lead.
assert.equal(createHash('sha256').update(JSON.stringify(C.AK_TF810_GROUND_CHOICES)).digest('hex'),'8f1f4435e7b72002557050bba5f9e00b87f6f5c723a48dafd4896942cccfa3bd');
const questions=C.akCourtviewContactQuestions('AK',route,{[ids[0]]:'Yes'},true);
for(const qid of [C.AK_TF810_GROUND_ID,'ak_tf810_ground_2_detail','ak_tf810_ground_3_detail'])check('official choices EN/lead-approved ES '+qid,()=>{
 const q=questions.find(q=>q.id===qid);assert(q);
 for(const choice of q.options.filter(x=>x!=='I am not sure')){
  const official=C.AK_TF810_GROUND_CHOICES.find(x=>x.id===choice);assert(official);
  assert.equal(q.optionDisplay[choice].label,official.en);assert.equal(q.optionDisplay[choice].translations.es.label,official.es);
 }
});
for(const choice of Object.keys(expectedGroundBoxes)){
 const main=choice.length===2&&/[ab]$/.test(choice)?choice[0]:choice;
 response=await post({[C.AK_TF810_GROUND_ID]:main});assert.equal(response.status,200);groundHttpCases++;
 if(choice!==main){response=await post({['ak_tf810_ground_'+main+'_detail']:choice});assert.equal(response.status,200);groundHttpCases++;}
 if(main==='10'){response=await post({ak_tf810_ground_rule:'Alaska Administrative Rule 40(a)'});assert.equal(response.status,200);groundHttpCases++;}
 const responseBody=await response.json();
 const expected=[expectedGroundBoxes[main],...(choice!==main?[expectedGroundBoxes[choice]]:[])];
 // A heading-only fixture deliberately has no sub-choice, even if an earlier saved answer exists.
 const explicit={ak_tf810_case_still_public:'Yes',ak_tf810_ground:main,...(choice!==main?{['ak_tf810_ground_'+main+'_detail']:choice}:{}),...(main==='10'?{ak_tf810_ground_rule:'Alaska Administrative Rule 40(a)'}:{})};
 const actual=C.akCourtviewGroundInputs(explicit);assert.deepEqual(Object.keys(actual.selectionsFromHeldFacts),expected);assert.equal(actual.rule,main==='10'?'Alaska Administrative Rule 40(a)':null);
 check('explicit ground '+choice+' remains held and saved',()=>{
  assert.equal(snap().packetAnswers[C.AK_TF810_GROUND_ID],main);assert.equal(C.akCourtviewContactInputs(snap()).generationAllowed,false);
  assert.equal(responseBody.readyToGenerate,false);assert.notEqual(stored.status,'verified');
  if(main==='2'||main==='3')assert.equal(actual.unresolvedIds.includes('ak_tf810_ground_'+main+'_detail'),choice===main);
 });
}
for(const raw of ['', 'I am not sure', {value:'1',unknown:true}, ['1','2'], {value:'1',unknown:false,unexpected:true}]){
 const input={ak_tf810_case_still_public:'Yes',ak_tf810_ground:raw,case_outcome:'Acquitted',court_requirements_completed:'yes',ak_tf810_ground_2_detail:'2a'};
 const before=structuredClone(input),out=C.akCourtviewGroundInputs(input);assert.deepEqual(out.selectionsFromHeldFacts,{});
 check('blank malformed or unknown never infers ground '+JSON.stringify(raw),()=>{assert(out.unresolvedIds.includes(C.AK_TF810_GROUND_ID));assert.deepEqual(input,before);});
}
assert.deepEqual(C.akCourtviewGroundInputs({ak_tf810_case_still_public:'Yes',case_outcome:'Acquitted',court_requirements_completed:'yes'}).selectionsFromHeldFacts,{});
assert.deepEqual(C.akCourtviewGroundInputs({ak_tf810_case_still_public:'No',ak_tf810_ground:'1'}).selectionsFromHeldFacts,{});
const wrongSub=C.akCourtviewGroundInputs({ak_tf810_case_still_public:'Yes',ak_tf810_ground:'2',ak_tf810_ground_2_detail:'3a'});assert.deepEqual(Object.keys(wrongSub.selectionsFromHeldFacts),['Check Box2.0']);assert(wrongSub.unresolvedIds.includes('ak_tf810_ground_2_detail'));
const missingRule=C.akCourtviewGroundInputs({ak_tf810_case_still_public:'Yes',ak_tf810_ground:'10',ak_tf810_ground_rule:{value:'rule supplied but unknown',unknown:true}});assert.deepEqual(Object.keys(missingRule.selectionsFromHeldFacts),['Check Box8.2']);assert(missingRule.unresolvedIds.includes('ak_tf810_ground_rule'));
// The overlong-citation rendering refusal is checked in test-ak-tf810-mode2-pdf.mjs.
for(const map of ['screeningAnswers','prefilledAnswers'])check('packet ground choice wins without rewriting earlier copies '+map,()=>{
 const snapshot=structuredClone(snap());snapshot[map][C.AK_TF810_GROUND_ID]='1';snapshot.packetAnswers[C.AK_TF810_GROUND_ID]='10';const before=structuredClone(snapshot);
 const facts=C.akCourtviewContactInputs(snapshot);assert.deepEqual(Object.keys(facts.selectionsFromHeldFacts),['Check Box8.2']);assert(!facts.unresolvedIds.includes(C.AK_TF810_GROUND_ID));assert.deepEqual(snapshot,before);
});
response=await post({[C.AK_TF810_GROUND_ID]:'1'});assert.equal(response.status,200);groundHttpCases++;
const selectedBefore=structuredClone(stored);
response=await post({[C.AK_TF810_GROUND_ID]:'9'});assert.equal(response.status,200);groundHttpCases++;
check('changed saved choice replaces box and preserves prior answer history',()=>{
 const facts=C.akCourtviewContactInputs(snap());assert.deepEqual(Object.keys(facts.selectionsFromHeldFacts),['Check Box8.1']);
 assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===C.AK_TF810_GROUND_ID&&h.value==='1'));
 assert.equal(selectedBefore.draftSnapshot.packetAnswers[C.AK_TF810_GROUND_ID],'1');
});
for(const raw of ['', 'I am not sure']){
 response=await post({[C.AK_TF810_GROUND_ID]:raw});assert.equal(response.status,200);groundHttpCases++;
 const before=structuredClone(stored);response=await post({});assert.equal(response.status,200);groundHttpCases++;
 check('saved unknown/blank raw and no-op preserved '+JSON.stringify(raw),()=>{assert.deepEqual(stored,before);assert.deepEqual(snap().packetAnswers[C.AK_TF810_GROUND_ID],raw);assert.deepEqual(C.akCourtviewContactInputs(snap()).selectionsFromHeldFacts,{});assert(model().missingInputIds.includes(C.AK_TF810_GROUND_ID));});
}
const legacyUnknown={value:'9',unknown:true},stableBeforeUnsupported=structuredClone(stored);
response=await post({[C.AK_TF810_GROUND_ID]:legacyUnknown});assert.equal(response.status,422);groundHttpCases++;
assert.deepEqual(stored,stableBeforeUnsupported);
stored.draftSnapshot.packetAnswers[C.AK_TF810_GROUND_ID]=legacyUnknown;stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);
const historicalUnknown=structuredClone(stored);body=await read();
assert.deepEqual(stored,historicalUnknown);assert.equal(body.answers[C.AK_TF810_GROUND_ID],undefined);
assert(body.questions.some(q=>q.id===C.AK_TF810_GROUND_ID));
assert.deepEqual(snap().packetAnswers[C.AK_TF810_GROUND_ID],legacyUnknown);
response=await post({});assert.equal(response.status,200);groundHttpCases++;
check('historical unknown wrapper remains raw and incomplete without accepting a new invalid shape',()=>{
 assert.deepEqual(stored,historicalUnknown);assert(model().missingInputIds.includes(C.AK_TF810_GROUND_ID));
 assert.deepEqual(C.akCourtviewContactInputs(snap()).selectionsFromHeldFacts,{});
});
console.log(JSON.stringify({status:'PASS_AK_TF810_MODE2',checks,groundHttpCases,pdfSuite:'scripts/test-ak-tf810-mode2-pdf.mjs',rawPreserved:true,noInference:true,noPaymentOrFilingAuthority:true}));
