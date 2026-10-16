import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=process.cwd(), file=p=>root+'/'+p, load=p=>import(pathToFileURL(file(p)).href);
register(pathToFileURL(file('scripts/lib/ts-esm-loader.mjs')));
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {LocalizationContext}=await import(pathToFileURL(loc).href);
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {PacketInformationBuilder}=await load('src/components/expungement-ai/PacketInformationBuilder.tsx');
const C=await load('src/lib/expungement-ai/ks-municipal-contact.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const K=await load('src/lib/expungement-ai/ks-municipal-category-context.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const routes=Object.keys(K.KS_MUNICIPAL_CATEGORY_CONTRACTS);
// Scoped in-memory protected handler/model/SSR test; transport dependencies
// no live auth/store/DB/owner or legal/output approval is claimed.
if (!process.env.KS_CATEGORY_ROUTE) {
 const {spawnSync}=await import('node:child_process');
 for(const route of routes){const run=spawnSync(process.execPath,[process.argv[1]],{cwd:root,env:{...process.env,KS_CATEGORY_ROUTE:route},encoding:'utf8'});process.stdout.write(run.stdout);process.stderr.write(run.stderr);assert.equal(run.status,0,route);}
 process.exit(0);
}
const route=process.env.KS_CATEGORY_ROUTE;assert(routes.includes(route));
const profile=getProfileByJurisdiction('KS'),spec=packetSpecificationFor('KS:'+route);
const witness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(row=>row.pathwayKey==='KS:'+route);assert(witness);
const legacy='Literal independent municipal category; not a statutory determination';
const sourceAnswers={...witness.answers};
const authoritative=evaluate({jurisdiction:'KS',profileVersion:witness.profileVersion,matterId:'synthetic-ks-category',answers:witness.answers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,packetAnswers:{offense_category:legacy},dependencies:{},capturedAt:'2026-10-16T00:00:00.000Z'});assert(seed);
const retainedHistory=[{factId:'offense_category',source:'packetAnswers',value:['Earlier incompatible category shape'],meaning:'prior_answer_for_shape_clarification',routeKey:'KS:'+route,profileVersion:seed.snapshot.profileVersion,profileSourceFingerprint:seed.snapshot.profileSourceFingerprint,profileAuthorityFingerprint:seed.snapshot.profileAuthorityFingerprint}];
seed.snapshot.dependencies={...seed.snapshot.dependencies,semanticAnswerHistory:structuredClone(retainedHistory)};seed.hash=P.protectedPacketDraftHash(seed.snapshot);
// This synthetic retained entry uses the actual legacy-shape history contract.
// It is preserved production data, not newly invented generic scalar history.
const transitionEvidence=[];
let original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-ks-owner';
let item={id:'synthetic-ks-category',jurisdiction:'KS',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const input=(extra={})=>({jurisdiction:'KS',pathwayId:route,specification:spec,requiredInputIds:['offense_category'],serverFacts:{},screeningAnswers:{offense_level:'Misdemeanor'},savedAnswers:{},questionById:new Map(),routeDecidingFactIds:new Set(),unresolvedRouteFactIds:new Set(),...extra});
check('exact approved two-route category guard',()=>assert(K.ksMunicipalCategoryIsContext(profile,route,spec)));
for(const level of profile.questions.find(q=>q.id==='offense_level').options)for(const raw of [undefined,legacy,{value:'Exact literal category',unknown:false},{unknown:true}])check('independent literal/unknown category and level '+level+JSON.stringify(raw),()=>{const c=resolvePacketCollection(input({screeningAnswers:{offense_level:level},savedAnswers:raw===undefined?{}:{offense_category:raw}})),fact=c.facts.find(f=>f.factId==='offense_category');assert.equal(fact.active,true);assert.equal(fact.phase,'render');assert.equal(fact.optional,true);assert.equal(fact.collection,'conditional');assert.equal(c.derivedFacts.offense_category,undefined);});
for(const extra of [{routeDecidingFactIds:new Set(['offense_category'])},{unresolvedRouteFactIds:new Set(['offense_category'])},{unresolvedSavedFactIds:new Set(['offense_category'])},{override:{routeKey:'KS:'+route,note:'retained explicit human classification',needsHumanClassification:['offense_category']}},{override:{routeKey:'KS:'+route,note:'retained explicit class',classes:{offense_category:'render_required'}}}])check('caller predicate/uncertainty refuses context',()=>assert.notEqual(resolvePacketCollection(input(extra)).facts[0].source,'ks_municipal_literal_category_context'));
for(const mutate of [p=>p.jurisdiction.code='CT',p=>p.profileVersion='wrong',p=>p.source.sourceCorpusSha256='wrong',p=>p.pathways.find(x=>x.id===route).triggerFields.push('offense_category'),p=>p.questions.push({id:'offense_category',type:'text_or_unknown',prompt:'new actual consumer'})])check('wrong/new relevant source refuses',()=>{const p=structuredClone(profile);mutate(p);assert.equal(K.ksMunicipalCategoryIsContext(p,route,spec),false)});
check('new specification consumer refuses',()=>{const s=structuredClone(spec);s.requiredFacts.push({factId:'offense_category'});assert.equal(K.ksMunicipalCategoryIsContext(profile,route,s),false)});
check('unrelated sibling source does not revoke exact guard',()=>{const p=structuredClone(profile);p.pathways.find(x=>!routes.includes(x.id)).summary+=' unrelated sibling';assert(K.ksMunicipalCategoryIsContext(p,route,spec))});
check('actual model keeps literal editable optional category without plan/result change',()=>{assert.equal(snap().packetAnswers.offense_category,legacy);assert.equal(snap().screeningAnswers.offense_category,undefined);assert(model());const q=model().builderQuestions.find(q=>q.id==='offense_category');assert(q);assert.equal(q.required,false);assert.equal(model().questions.find(q=>q.id==='offense_category').required,false);assert(P.editablePacketInputIds(model()).has('offense_category'));assert(P.heldPacketCorrectionInputIds(model(),snap().resultCode).has('offense_category'));assert(!model().missingInputIds.includes('offense_category'));assert.deepEqual(snap().packetPlan,original.draftSnapshot.packetPlan);assert.deepEqual(stored,original)});
const present=()=>decorate({consumerAuthUserId:'synthetic-ks-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'KS',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__ksCategoryTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-ks-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);transitionEvidence.push({matterId:item.id,prior:structuredClone(stored),transition:structuredClone(transition)});stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__ksCategoryTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Matter=await page('src/app/briefcase/[packetId]/page.tsx');
const Review=await page('src/app/briefcase/[packetId]/review/page.tsx'),Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id});
const context=()=>({params:Promise.resolve({itemId:item.id})});
const url=()=> 'http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url()+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context());
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200);const body=await response.json();assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};

let response=await post({});check('actual no-op preserves full envelope',()=>{assert.equal(response.status,200);assert.deepEqual(stored,original)});
for(const raw of ['Literal court category','Misdemeanor','Felony','Traffic',{value:'Amended literal category',unknown:false},{unknown:true}]){
 const before=structuredClone(stored);const independentBefore=Object.fromEntries(['offense_level','charge','case_outcome'].map(id=>[id,structuredClone(model().initialAnswers[id])]));const response=await post({offense_category:raw});assert.equal(response.status,200);const body=await response.json();
 check('actual category save preserves raw and all independent authority',()=>{assert.deepEqual(snap().packetAnswers.offense_category,raw);for(const id of Object.keys(independentBefore))assert.deepEqual(model().initialAnswers[id],independentBefore[id]);assert.equal(snap().screeningAnswers.offense_category,undefined);assert.deepEqual(snap().dependencies.semanticAnswerHistory,retainedHistory);const event=transitionEvidence.at(-1);assert.deepEqual(event.transition.answerDelta.offense_category,raw);assert.equal(event.transition.expectedPriorRevision,before.revision);assert.deepEqual(event.prior,before);assert.deepEqual(snap().packetPlan,original.draftSnapshot.packetPlan);for(const id of ['pathwayId','resultCode','paymentAllowed','selectedTrackId','profileSourceFingerprint','profileAuthorityFingerprint'])assert.deepEqual(snap()[id],original.draftSnapshot[id]);assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));assert.notEqual(stored.status,'verified');assert(stored.revision>before.revision)});
 const same=structuredClone(stored);await post({offense_category:raw});check('same-value no-op exact',()=>assert.deepEqual(stored,same));
 const get=await API.GET(new Request(url()),context());assert.equal(get.status,200);assert.deepEqual((await get.json()).answers.offense_category,raw);
}
for(const locale of ['en','es']){const tree=await Edit({params,searchParams:Promise.resolve({edit:'offense_category'})}),builder=nodes(tree).find(n=>n.type===PacketInformationBuilder);check('actual protected editor EN/ES optional field',()=>{assert(builder);assert(builder.props.questions.some(q=>q.id==='offense_category'&&q.required===false));const rendered=html(tree,locale);assert(rendered.includes(locale==='es'?'Contexto opcional.':'Optional context.'));assert(rendered.includes('data-packet-question=\"offense_category\"'));});}

// Genuine incompatible legacy shapes use the existing shape-clarification
// archive. Read/no-op must preserve raw; only explicit replacement archives it.
const beforeLegacyCase=structuredClone(stored),badLegacy=['Older unsupported category array'];
stored.draftSnapshot.packetAnswers.offense_category=structuredClone(badLegacy);stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);
const legacyEnvelope=structuredClone(stored);const legacyNoop=await post({});assert.equal(legacyNoop.status,200);
check('malformed legacy raw and retained history survive actual no-op',()=>{assert.deepEqual(stored,legacyEnvelope);assert.deepEqual(snap().dependencies.semanticAnswerHistory,retainedHistory)});
const legacyReplacement='Explicit fresh replacement of incompatible category shape';const legacyResponse=await post({offense_category:legacyReplacement});assert.equal(legacyResponse.status,200);
check('existing shape clarification archives exact replaced raw source only after explicit save',()=>{
 assert.equal(snap().packetAnswers.offense_category,legacyReplacement);
 assert.deepEqual(snap().dependencies.semanticAnswerHistory.slice(0,retainedHistory.length),retainedHistory);
 assert(snap().dependencies.semanticAnswerHistory.some(entry=>entry.factId==='offense_category'&&entry.source==='packetAnswers'&&entry.meaning==='prior_answer_for_shape_clarification'&&JSON.stringify(entry.value)===JSON.stringify(badLegacy)));
 assert.deepEqual(transitionEvidence.at(-1).prior,legacyEnvelope);assert.equal(transitionEvidence.at(-1).transition.answerDelta.offense_category,legacyReplacement);
});
stored=beforeLegacyCase;

// Material charge change goes through the actual existing protected POST and
// model, not a cloned collector-only expectation. Category cannot classify it.
const beforeAmendment=structuredClone(stored);
const amendedCharge={value:'Amended municipal ordinance citation, recorded literally',unknown:false};
check('material amendment differs and is an existing protected editable fact',()=>{
 assert.notDeepEqual(model().initialAnswers.charge,amendedCharge);
 assert(P.editablePacketInputIds(model(),true).has('charge'));
});
const amendmentResponse=await post({charge:amendedCharge});assert.equal(amendmentResponse.status,200);
const amendmentBody=await amendmentResponse.json();
check('actual material amendment preserves independent category and records prior charge',()=>{
 assert.deepEqual(snap().packetAnswers.charge,amendedCharge);
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert.deepEqual(snap()[map].offense_category,beforeAmendment.draftSnapshot[map].offense_category);
 assert(stored.revision>beforeAmendment.revision);assert.notEqual(stored.status,'verified');
 assert.deepEqual(snap().dependencies.semanticAnswerHistory,retainedHistory);
 const event=transitionEvidence.at(-1);assert.deepEqual(event.prior,beforeAmendment);assert.deepEqual(event.transition.answerDelta.charge,amendedCharge);assert.equal(event.transition.expectedPriorRevision,beforeAmendment.revision);
 assert.equal(amendmentBody.readyToGenerate,false);assert(Object.values(amendmentBody.commercialActions).every(x=>x===false));
 const q=model().builderQuestions.find(q=>q.id==='offense_category');assert(q);assert.equal(q.required,false);
});
const amendedNatural={pathwayId:snap().pathwayId,resultCode:snap().resultCode,paymentAllowed:snap().paymentAllowed,selectedTrackId:snap().selectedTrackId,packetPlan:structuredClone(snap().packetPlan),exclusionFlags:structuredClone(snap().exclusionFlags)};
const amendedCategory='Separate category after real charge amendment';
const amendedCategoryResponse=await post({offense_category:amendedCategory});assert.equal(amendedCategoryResponse.status,200);
check('category change after actual charge amendment does not change natural legal output',()=>{
 assert.deepEqual(snap().packetAnswers.charge,amendedCharge);assert.equal(snap().packetAnswers.offense_category,amendedCategory);
 for(const key of Object.keys(amendedNatural))assert.deepEqual(snap()[key],amendedNatural[key]);
});
const afterAmendment=structuredClone(stored);await post({charge:amendedCharge,offense_category:amendedCategory});
check('same amended facts retain exact protected no-op',()=>assert.deepEqual(stored,afterAmendment));
let getResponse=await API.GET(new Request(url()),context());assert.equal(getResponse.status,200);let reloaded=await getResponse.json();
check('actual GET/model reload retains amended charge and independent category',()=>{assert.deepEqual(reloaded.answers.charge,amendedCharge);assert.equal(reloaded.answers.offense_category,amendedCategory);assert.deepEqual(model().initialAnswers.charge,amendedCharge)});

// Two separately evaluated matter identities use the same unchanged actual
// handler/transition/CAS implementation. In-memory stores replace transport
// only. Neither a second-case category nor a category edit supplies a ground.
const matters=new Map([[item.id,{item:structuredClone(item),original:structuredClone(original),stored:structuredClone(stored)}]]);
const firstId=item.id,secondId='synthetic-ks-category-second-matter';
const secondAnswers={...sourceAnswers,charge:'Second matter distinct municipal citation'};
const secondCategory='Second matter independent literal category';
const secondAuthoritative=evaluate({jurisdiction:'KS',profileVersion:witness.profileVersion,matterId:secondId,answers:{...witness.answers,charge:secondAnswers.charge}});
const secondSeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:secondAuthoritative,screeningAnswers:secondAnswers,packetAnswers:{offense_category:secondCategory},dependencies:{},capturedAt:'2026-10-16T00:00:00.000Z'});assert(secondSeed);
const secondOriginal={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:secondSeed.hash,draftSnapshot:secondSeed.snapshot};
matters.set(secondId,{item:{id:secondId,jurisdiction:'KS',artifactRefs:{}},original:structuredClone(secondOriginal),stored:structuredClone(secondOriginal)});
function selectMatter(id){
 const previous=matters.get(item.id);previous.stored=structuredClone(stored);
 const next=matters.get(id);assert(next);item=structuredClone(next.item);original=structuredClone(next.original);stored=structuredClone(next.stored);
}
selectMatter(secondId);
const firstFrozen=structuredClone(matters.get(firstId).stored);
getResponse=await API.GET(new Request(url()),context());assert.equal(getResponse.status,200);reloaded=await getResponse.json();
check('second matter actual GET/model has its own charge/category',()=>{assert.equal(item.id,secondId);assert.equal(reloaded.answers.offense_category,secondCategory);assert.equal(model().initialAnswers.offense_category,secondCategory);assert.notDeepEqual(model().initialAnswers.charge,amendedCharge)});
const secondRaw={value:'Second matter edited category only',unknown:false};
const secondSaveResponse=await post({offense_category:secondRaw});assert.equal(secondSaveResponse.status,200);
check('second matter actual material save/CAS cannot modify first matter',()=>{
 assert.deepEqual(snap().packetAnswers.offense_category,secondRaw);assert(stored.revision>secondOriginal.revision);
 assert.deepEqual(matters.get(firstId).stored,firstFrozen);
 assert.deepEqual(snap().dependencies.semanticAnswerHistory,secondOriginal.draftSnapshot.dependencies.semanticAnswerHistory);
});
const secondFrozen=structuredClone(stored);await post({offense_category:secondRaw});
check('second matter exact no-op independent',()=>assert.deepEqual(stored,secondFrozen));
selectMatter(firstId);getResponse=await API.GET(new Request(url()),context());assert.equal(getResponse.status,200);reloaded=await getResponse.json();
check('return first matter via actual GET/model preserves first raw/history',()=>{assert.deepEqual(stored,firstFrozen);assert.equal(reloaded.answers.offense_category,amendedCategory);assert.deepEqual(reloaded.answers.charge,amendedCharge);assert.deepEqual(matters.get(secondId).stored,secondFrozen)});
for(const locale of ['en','es']){const tree=await Edit({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:'offense_category'})});check('return first matter actual editor EN/ES after amendment',()=>assert(html(tree,locale).includes('data-packet-question="offense_category"')));}
if(process.env.KS_CATEGORY_EVIDENCE_DIR){const evidenceFile=process.env.KS_CATEGORY_EVIDENCE_DIR+'/'+route+'.json';fs.writeFileSync(evidenceFile,JSON.stringify({scope:'Synthetic test-only prior raw envelopes and actual production transition payloads; not persistent production history/DB or owner acceptance',route,checks,transitions:transitionEvidence},null,2)+'\n');}
console.log('KS municipal original78/79 '+route+': '+checks+' focused assertions PASS; in-memory protected handler/SSR only, no owner/output approval.');
