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
const packetInformationFile=file('src/lib/expungement-ai/packet-information.ts');
compile(packetInformationFile,fs.readFileSync(packetInformationFile,'utf8')+'\nexport {packetCollectionFor,validatePacketAnswer,protectedPacketDraftReviewSafety};');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {PacketInformationBuilder}=await load('src/components/expungement-ai/PacketInformationBuilder.tsx');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const route='juvenile-record-sealing-as-47-12-300';
const witness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(row=>row.pathwayKey==='AK:'+route);
const legacy='Earlier contact prose retained as history';
const sourceAnswers={...witness.answers,contact_information:legacy,residency_or_location:'Earlier judicial district answer'};
const authoritative=evaluate({jurisdiction:'AK',profileVersion:witness.profileVersion,matterId:'synthetic-ak-contact',answers:witness.answers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-ak-owner';
const item={id:'synthetic-ak-contact',jurisdiction:'AK',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const present=()=>decorate({consumerAuthUserId:'synthetic-ak-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'AK',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__akHistoryTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-ak-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__akHistoryTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200);const body=await response.json();assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};

const H=await load('src/lib/expungement-ai/ak-pardon-record-context.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const specification=packetSpecificationFor('AK:'+route),profile=getProfileByJurisdiction('AK'),id="record_type";
const memo=JSON.parse(fs.readFileSync(file('data/record-clearing/legal-design-intake/AK.memo.json'))),proof=JSON.parse(fs.readFileSync(file('data/record-clearing/production-factory/packet-proofs/rcap-ak-guidance-implementation.json')));
const shape=s=>Object.fromEntries(['pathwayId','resultCode','selectedTrackId','paymentAllowed','packetPlan','requiredInputIds'].map(k=>[k,s[k]]));
const baselineShape=shape(original.draftSnapshot),options=['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure'];
const assign=(map,raw)=>{stored=structuredClone(original);stored.draftSnapshot[map][id]=structuredClone(raw);stored.draftHash=P.protectedPacketDraftHash(snap());};
check('exact adopted guidance source supports context only',()=>{assert(H.akJuvenileRecordIsContext(profile,route,specification));assert.equal(specification,undefined);assert.equal(proof.jobId,'rcap-ak-guidance-implementation');assert.equal(snap().resultCode,'not_covered_yet');assert.equal(snap().paymentAllowed,false);assert.equal(snap().selectedTrackId,null);assert.equal(proof.productionEnabled,false);assert(!H.akJuvenileRecordIsContext(getProfileByJurisdiction('ND'),route,specification));});
for(const mutate of [p=>p.profileVersion='changed',p=>p.source.sourceCorpusSha256='changed',p=>p.questions.push({id}),p=>p.pathways.find(p=>p.id===route).triggerFields.push('new_field')])check('changed profile refuses context exception',()=>{const p=structuredClone(profile);mutate(p);assert(!H.akJuvenileRecordIsContext(p,route,specification));});
for(const mutate of [m=>m.jurisdiction='other',m=>m.newConsumer='record_type'])check('changed adopted memo refuses',()=>{const m=structuredClone(memo);mutate(m);assert(!H.akJuvenileRecordIsContext(profile,route,specification,m,proof));});
for(const mutate of [p=>p.jobId='other',p=>p.implementationOutputs[0].sha256='changed',p=>p.samplePackets.find(p=>p.trackId==='ak-juvenile').assembledSha256='changed'])check('changed retained family or output proof refuses',()=>{const p=structuredClone(proof);mutate(p);assert(!H.akJuvenileRecordIsContext(profile,route,specification,memo,p));});
check('new registered specification cannot inherit this exception',()=>assert(!H.akJuvenileRecordIsContext(profile,route,{routeKey:'AK:'+route,trackId:'ak-juvenile'})));
for(const mutate of [r=>r.draftSnapshot.profileSourceFingerprint='changed',r=>r.draftSnapshot.profileAuthorityFingerprint='changed',r=>r.draftSnapshot.selectedTrackId='ak-juvenile'])check('protected current source and selected identity guard retained',()=>{const r=structuredClone(original);mutate(r);r.draftHash=P.protectedPacketDraftHash(r.draftSnapshot);assert.equal(P.protectedPacketInformationModelFor(r),null);});
const {execFileSync}=await import('node:child_process');
check('reuse exact existing approved guidance implementation and named decision',()=>{for(const output of proof.implementationOutputs){const bytes=execFileSync('git',['show',proof.completionCommit+':'+output.path],{cwd:root});assert.equal(createHash('sha256').update(bytes).digest('hex'),output.sha256);assert(!bytes.toString().includes('record_type'));}const adoption=JSON.parse(fs.readFileSync(file('data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json')));assert(adoption.boundFamilies.some(f=>f.familyJobId===proof.jobId));const decision=JSON.parse(fs.readFileSync(file('data/rcap-authorization-queue.json'))).entries.find(e=>e.id==='auth-2026-08-19-owner-legal-approval-completed-output');assert.equal(decision.kind,'owner_legal_decision');assert.equal(decision.decision,'approved');assert(decision.decisionScope.completedOutputPacketFamilies.includes(proof.jobId));});
check('retained juvenile source uses its own yes/no fact and stays outside adult scope',()=>{
 const track=memo.tracks.find(t=>t.trackId==='ak-juvenile');
 assert.deepEqual(track.participantInputs.map(i=>i.key),['juvenileRecord']);
 assert.equal(track.legalDesignDecision.status,'legal_design_approved_with_limitations');
 assert.equal(track.rules.filing,'none through LegalEase. Outside the approved adult scope.');
 const implementation=execFileSync('git',['show',proof.completionCommit+':src/lib/rcap/packets/jurisdictions/alaska/guidance.ts'],{cwd:root}).toString();
 assert(implementation.includes('branch(trackId, "juvenileRecord", AK_YES_NO, facts.juvenileRecord)'));
 assert(implementation.includes('"record_is_not_a_juvenile_record"'));
 const ratification=JSON.parse(fs.readFileSync(file('data/record-clearing/legal-decisions/route-ratification-registry.json'))).routes.find(r=>r.routeKey==='AK:'+route);
 assert.equal(ratification.status,'intentional_unsupported');assert.equal(ratification.intentionalUnsupported,true);
});
check('public taxonomy remains unsupported, not a new eligibility fact',()=>{for(const value of options)assert.throws(()=>evaluate({jurisdiction:'AK',profileVersion:witness.profileVersion,matterId:item.id,answers:{...witness.answers,[id]:value}}),/Unknown question ids/);});
check('absent inherited menu inactive without changing original stored plan or answers',()=>{assert(model());assert(!model().builderQuestions.some(q=>q.id===id));assert(!model().missingInputIds.includes(id));assert(snap().requiredInputIds.includes(id));assert.deepEqual(stored,original);assert.deepEqual(shape(snap()),baselineShape);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert(!Object.hasOwn(snap()[map],'juvenileRecord'));});
const absentResponse=await API.GET(new Request(url),context),absentBody=await absentResponse.json();
check('actual GET omits absent taxonomy from builder and missing gates',()=>{assert.equal(absentResponse.status,200);assert(!absentBody.questions.some(q=>q.id===id));assert(!absentBody.missingInputIds.includes(id));});
const before=structuredClone(stored);await save({});check('absent no-op exact protected bytes',()=>assert.deepEqual(stored,before));
const originalDescriptor={id,stage:'packet_information',type:'single_choice',required:true,contextOnly:false,prompt:'What type of record is this?',options};
for(const mutate of [q=>q.type='text',q=>q.stage='screening',q=>q.prompt='Changed source meaning',q=>q.options=['Court case'],q=>q.id='case_outcome'])check('descriptor drift stays unchanged',()=>{const q=structuredClone(originalDescriptor);mutate(q);assert.strictEqual(H.akJuvenileRecordContextQuestion(q,profile,route,specification),q);});
for(const sibling of profile.pathways.filter(p=>p.id!==route))check('all AK sibling routes refuse scoped exception '+sibling.id,()=>{assert(!H.akJuvenileRecordIsContext(profile,sibling.id,specification));assert.strictEqual(H.akJuvenileRecordContextQuestion(originalDescriptor,profile,sibling.id,specification),originalDescriptor);});
const absenceCollection=P.packetCollectionFor({jurisdiction:'AK',pathwayId:route,requiredInputIds:snap().requiredInputIds,serverFacts:snap().serverFacts,screeningAnswers:snap().screeningAnswers,prefilledAnswers:snap().prefilledAnswers,savedAnswers:snap().packetAnswers});
const absenceDisposition=absenceCollection.facts.find(f=>f.factId===id);
check('protected and compatibility verification share exact inactive optional contract',()=>{assert.equal(absenceDisposition.collection,'conditional');assert.equal(absenceDisposition.active,false);assert.equal(absenceDisposition.optional,true);assert.equal(P.validatePacketAnswer(model().questions.find(q=>q.id===id),undefined,absenceDisposition.optional).safe,true);assert.notEqual(P.protectedPacketDraftReviewSafety(snap(),'2026-10-14T00:00:00Z').reason,'invalid_packet_answer:record_type');});
// Exercise the actual legacy compatibility consumer without inventing completed
// filing facts. Its independent charge hold is retained; this is not an owner journey.
const compatibilityItem={...item,state:'AK',resultCode:snap().resultCode,paymentAllowed:snap().paymentAllowed,artifactRefs:{commercialFlow:{screening:{profileVersion:snap().profileVersion,pathwayId:route,resultCode:snap().resultCode,paymentAllowed:snap().paymentAllowed,packetPlan:structuredClone(snap().packetPlan),answers:structuredClone(snap().screeningAnswers)},packetInformation:{requiredInputIds:[...snap().requiredInputIds],serverFacts:structuredClone(snap().serverFacts),prefilledAnswers:structuredClone(snap().prefilledAnswers),answers:structuredClone(snap().packetAnswers)}}}};
check('actual compatibility model and review preserve other holds without taxonomy gate',()=>{const before=structuredClone(compatibilityItem),m=P.packetInformationModelFor(compatibilityItem);assert(m);assert(!m.builderQuestions.some(q=>q.id===id));assert(!m.missingInputIds.includes(id));assert(m.requiredInputIds.includes(id));const safety=P.packetInformationReviewSafety(compatibilityItem);assert.equal(safety.safe,false);assert.notEqual(safety.reason,'invalid_packet_answer:record_type');assert.deepEqual(compatibilityItem,before);});
const {packetFulfillmentAuthority}=await load('src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {preparePersonalizedPacket}=await load('src/lib/rcap/render/personalized-packet.ts');
check('actual canonical authority and generation remain held',()=>{const authority=packetFulfillmentAuthority('AK',route,'packet generation');assert.equal(authority.allowed,false);assert(authority.missing.includes('fulfillment record'));assert.throws(()=>preparePersonalizedPacket({snapshot:snap()}),/personalized render authority refused/);const verification=P.packetInformationPatch({existingItem:item,answers:{},verify:true,protectedVerification:stored});assert.equal(verification.readyToGenerate,false);assert.notEqual(verification.protectedTransition.nextVerification.status,'verified');assert(!verification.protectedTransition.nextVerification.hash);});


for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const raw of options){
 assign(map,raw);const prior=structuredClone(stored),m=model();
 check('original scalar remains optional editable history '+map+'/'+raw,()=>{const q=m.builderQuestions.find(q=>q.id===id);assert(q);assert.equal(q.required,false);assert.deepEqual(q.options,options);assert(P.editablePacketInputIds(m).has(id));assert(!m.missingInputIds.includes(id));assert.deepEqual(stored,prior);assert.deepEqual(shape(snap()),baselineShape);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert(!Object.hasOwn(snap()[map],'juvenileRecord'));});
 await save({});check('raw scalar no-op exact '+map+'/'+raw,()=>assert.deepEqual(stored,prior));
}
assign('prefilledAnswers','Court case');stored.draftSnapshot.packetAnswers[id]='Conviction';stored.draftHash=P.protectedPacketDraftHash(snap());
const conflict=structuredClone(stored);await save({});check('both independent original scalar copies survive read/no-op',()=>assert.deepEqual(stored,conflict));
await save({[id]:'Juvenile matter'});check('explicit correction archives both prior scalars without legal inference',()=>{assert.equal(snap().packetAnswers[id],'Juvenile matter');assert.deepEqual(shape(snap()),baselineShape);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert(!Object.hasOwn(snap()[map],'juvenileRecord'));for(const map of ['prefilledAnswers','packetAnswers'])assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.source===map&&h.value===conflict.draftSnapshot[map][id]));});
await save({[id]:'I am not sure'});check('unknown original wire is saved without optional completion gate',()=>{assert.equal(snap().packetAnswers[id],'I am not sure');assert(!model().missingInputIds.includes(id));assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.value==='Juvenile matter'));});
await save({[id]:'Court case'});check('known restoration preserves unknown history',()=>assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.value==='I am not sure')));
for(const raw of options){
 await save({[id]:raw});
 check('actual original wire correction retains scope and never infers juvenileRecord '+raw,()=>{
  assert.equal(snap().packetAnswers[id],raw);assert.deepEqual(shape(snap()),baselineShape);
  assert(!model().missingInputIds.includes(id));
  for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert(!Object.hasOwn(snap()[map],'juvenileRecord'));
 });
}
for(const locale of ['en','es']){
 const tree=await Edit({params,searchParams:Promise.resolve({edit:id})});
 check('no new ordinary guidance editor entry '+locale,()=>assert(!nodes(tree).some(n=>n.type===PacketInformationBuilder)));
 check('existing control presentation of optional API history is meaningful '+locale,()=>{const m=model(),q=m.builderQuestions.find(q=>q.id===id);assert(q);assert.equal(q.required,false);const markup=html(React.createElement(PacketInformationBuilder,{itemId:item.id,stateCode:'AK',pathwayId:route,questions:[q],initialAnswers:{[id]:'Court case'},initiallyMissing:[],initialRevision:stored.revision,initialResumeSectionId:id,editingFromReview:true}),locale);assert(markup.includes(locale==='es'?'historial opcional':'optional history'));assert(markup.includes(locale==='es'?'categorías anteriores pueden coincidir':'labels can overlap'));assert(markup.includes(locale==='es'?'no una solicitud judicial para menores':'not a juvenile filing'));});
}
const stable=structuredClone(stored);
for(const [answers,extra,query,status]of [[{[id]:{value:'Court case',unknown:true}},{},'',422],[{[id]:'Conviction'},{expectedRevision:0},'',409],[{[id]:'Conviction'},{},'?preparation=mt-deferred',403]]){const response=await post(answers,extra,query);check('actual unchanged refusal '+status,()=>{assert.equal(response.status,status);assert.deepEqual(stored,stable);});}
owner='another-owner';for(const method of ['GET','POST']){const response=method==='GET'?await API.GET(new Request(url),context):await post({[id]:'Conviction'});check('actual wrong-owner '+method,()=>{assert.equal(response.status,404);assert.deepEqual(stored,stable);});}owner='synthetic-ak-owner';
for(const sibling of profile.pathways.filter(p=>p.id!==route))check('all AK sibling routes refuse scoped exception '+sibling.id,()=>assert(!H.akJuvenileRecordIsContext(profile,sibling.id,specification)));
console.log(JSON.stringify({status:'PASS_AK_JUVENILE_EXACT_RECORD_CONTEXT',checks,noDatabase:true,noRender:true,noOwnerJourneyClaim:true,originalQuestion:'Q-109ca1a84eab3ee90c38',qualifiedSpanishReview:'pending'}));
