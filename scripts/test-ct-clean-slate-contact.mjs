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
const C=await load('src/lib/expungement-ai/ct-clean-slate-contact.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const route=C.CT_CLEAN_SLATE_ROUTE,ids=C.CT_CLEAN_SLATE_CONTACT_IDS;
const witness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(row=>row.pathwayKey==='CT:'+route);
const legacy='Earlier contact prose: court number 555-0000; email unavailable';
const sourceAnswers={...witness.answers,contact_information:legacy};
const authoritative=evaluate({jurisdiction:'CT',profileVersion:witness.profileVersion,matterId:'synthetic-ct-contact',answers:witness.answers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-ct-owner';
const item={id:'synthetic-ct-contact',jurisdiction:'CT',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const values={mailing_address:{value:'42 Exact Mailing Street, Unit 7',unknown:false},phone_number:{value:'+1 203 555 0101 ext 04',unknown:false},email_address:{value:'Exact.Local+CT@Example.TEST',unknown:false}};
check('retained source-owned destination map',()=>{const bytes=fs.readFileSync(file(C.CT_CLEAN_SLATE_CONTACT_SOURCE.mapPath));assert.equal(createHash('sha256').update(bytes).digest('hex'),C.CT_CLEAN_SLATE_CONTACT_SOURCE.mapSha256);const map=JSON.parse(bytes).documents[0];for(const f of C.CT_CLEAN_SLATE_CONTACT_FIELDS)assert(map.writeBoxes.some(w=>w.field===f.field&&w.factId==='participant.'+f.participantKey&&w.page===1));assert(!map.writeBoxes.some(w=>w.factId==='contact_information'));});
check('current source witness is held, never a finding of qualification',()=>{assert.equal(snap().resultCode,'needs_review');assert.equal(snap().paymentAllowed,false);assert(C.ctCleanSlateContactContract(getProfileByJurisdiction('CT'),route));assert(model());assert.deepEqual(stored,original);});
check('exact separate components replace active aggregate collection without plan mutation',()=>{const m=model();for(const id of ids){assert(m.builderQuestions.some(q=>q.id===id));assert(P.editablePacketInputIds(m).has(id));assert(P.heldPacketCorrectionInputIds(m,snap().resultCode).has(id));assert(m.missingInputIds.includes(id));}assert(!m.builderQuestions.some(q=>q.id==='contact_information'));assert(!m.missingInputIds.includes('contact_information'));assert(!P.editablePacketInputIds(m).has('contact_information'));assert(m.builderQuestions.find(q=>q.id==='mailing_address').helperText.includes(legacy));assert.equal(P.packetAccountEmailSuggestion(m,'account@example.test'),null);assert.deepEqual(snap().packetPlan,original.draftSnapshot.packetPlan);});
for(const mutate of [p=>p.version='wrong',p=>p.source.sourceCorpusSha256='wrong',p=>p.packetGenerator.requiredInputs.push('new_contract'),p=>p.questions.push({...p.questions[0],id:'contact_information'})])check('changed source contract refuses scoped replacement',()=>{const p=structuredClone(getProfileByJurisdiction('CT'));mutate(p);assert(!C.ctCleanSlateContactContract(p,route))});
for(const state of ['CT','KS','OR'])for(const pathway of [route,'wrong-route'])check('exact route boundary '+state+'/'+pathway,()=>assert.equal(C.isCtCleanSlateContact(state,pathway),state==='CT'&&pathway===route));
for(const deciding of [new Set(['contact_information']),new Set()])check('collector retains new legal consumer',()=>{const input={jurisdiction:'CT',pathwayId:route,requiredInputIds:['contact_information'],serverFacts:{},screeningAnswers:{},savedAnswers:{contact_information:legacy},questionById:new Map(),routeDecidingFactIds:deciding,ctCleanSlateSeparateContact:true};const fact=resolvePacketCollection(input).facts[0];assert.equal(fact.active===false,deciding.size===0)});

const present=()=>decorate({consumerAuthUserId:'synthetic-ct-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'CT',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__ctContactTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-ct-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__ctContactTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Matter=await page('src/app/briefcase/[packetId]/page.tsx');
const Review=await page('src/app/briefcase/[packetId]/review/page.tsx'),Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200);const body=await response.json();assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};

let response=await post({});check('actual handler no-op is exact protected identity',()=>{assert.equal(response.status,200);assert.deepEqual(stored,original)});
let body=await save(values);
check('actual handler exact source values, history and authority',()=>{for(const id of ids)assert.deepEqual(snap().packetAnswers[id],values[id]);assert.equal(C.ctCleanSlateContactInputs(snap()).writes.length,3);assert.deepEqual(C.ctCleanSlateContactInputs(snap()).unresolvedIds,[]);assert.equal(snap().screeningAnswers.contact_information,legacy);assert.equal(snap().paymentAllowed,false);assert.equal(snap().resultCode,'needs_review');assert.notEqual(stored.status,'verified');assert.deepEqual(snap().packetPlan,original.draftSnapshot.packetPlan);});
response=await API.GET(new Request(url),context);body=await response.json();
check('actual GET reload preserves exact saved values without writing',()=>{assert.equal(response.status,200);for(const id of ids)assert.deepEqual(body.answers[id],values[id]);assert.equal(body.readyToGenerate,false);assert.equal(body.accountEmailSuggestion,null);});
check('adapter grants no form, delivery or signature authority',()=>{const mapped=C.ctCleanSlateContactInputs(snap());assert.equal(mapped.generationAllowed,false);assert.equal(mapped.deliveryAllowed,false);assert.equal(mapped.admissionGranted,false);assert(mapped.writes.every(write=>!/(?:SIGN|COURT|PRINTNAME)/.test(write.field)));});
for(const field of C.CT_CLEAN_SLATE_CONTACT_FIELDS){
 for(const raw of [{value:values[field.id].value,unknown:true},'unavailable','no disponible',['wrong shape']]){
  await save({[field.id]:raw});check('unknown/unavailable/malformed retained and withheld '+field.id+JSON.stringify(raw),()=>{assert.deepEqual(snap().packetAnswers[field.id],raw);assert(model().missingInputIds.includes(field.id));assert(!C.ctCleanSlateContactInputs(snap()).writes.some(w=>w.factId===field.id));assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===field.id));assert.equal(snap().resultCode,'needs_review');});
 }
 await save({[field.id]:values[field.id]});
}
for(const source of ['screeningAnswers','prefilledAnswers'])for(const id of ids)check('conflicting protected copies are withheld '+source+'/'+id,()=>{const copy=structuredClone(snap());copy[source][id]='Different explicit value';assert(!C.ctCleanSlateContactInputs(copy).writes.some(w=>w.factId===id));});
for(const key of ['profileVersion','profileSourceFingerprint','profileAuthorityFingerprint','pathwayId','selectedTrackId'])check('stale/wrong mapping contract '+key,()=>assert.equal(C.ctCleanSlateContactInputs({...snap(),[key]:'wrong'}),null));
const beforeConflicts=structuredClone(stored);
for(const source of ['screeningAnswers','prefilledAnswers'])for(const id of ids){
 stored=structuredClone(beforeConflicts);stored.draftSnapshot[source][id]={value:'Different exact protected contact',unknown:false};stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);
 check('conflict visible and incomplete '+source+'/'+id,()=>{assert(model().missingInputIds.includes(id));assert(model().questions.find(q=>q.id===id).savedAnswerNeedsClarification);});
 const before=structuredClone(stored);await save({});check('conflicting source no-op is exact '+source+'/'+id,()=>assert.deepEqual(stored,before));
 await save({[id]:values[id]});check('explicit conflict repair preserves original typed history '+source+'/'+id,()=>{assert(C.ctCleanSlateContactInputs(snap()).writes.some(w=>w.factId===id&&w.value===values[id].value));assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.value?.value==='Different exact protected contact'));});
}
stored=structuredClone(beforeConflicts);
const sameIdRecord=structuredClone(stored);for(const id of ids){sameIdRecord.draftSnapshot.prefilledAnswers[id]=values[id];delete sameIdRecord.draftSnapshot.packetAnswers[id];}sameIdRecord.draftHash=P.protectedPacketDraftHash(sameIdRecord.draftSnapshot);stored=sameIdRecord;
check('existing exact owned fields are reused without account or aggregate inference',()=>{for(const id of ids){assert.deepEqual(model().initialAnswers[id],values[id]);assert(!model().missingInputIds.includes(id));}assert.equal(C.ctCleanSlateContactInputs(snap()).writes.length,3);});
const existing=structuredClone(stored);await save({});check('known source no-op remains byte-identical',()=>assert.deepEqual(stored,existing));
stored=structuredClone(beforeConflicts);
response=await post({}, {verify:true});body=await response.json();check('final-verification action preserves actual held route',()=>{assert.equal(response.status,200);assert.equal(body.readyToGenerate,false);assert.notEqual(stored.status,'verified');assert.equal(snap().paymentAllowed,false);assert.equal(snap().resultCode,'needs_review');});
const stable=structuredClone(stored);
for(const [answers,extra,query,status]of [[{phone_number:'wrong mode'}, {},'?preparation=mt-deferred',403],[{phone_number:'stale'}, {expectedRevision:0},'',409],[{constructor:'untrusted'}, {},'',422]]){
 response=await post(answers,extra,query);check('actual denied write '+status,()=>{assert.equal(response.status,status);assert.deepEqual(stored,stable)});
}
const diagnosis=[];
for(const locale of ['en','es']){
 const overview=html(await Edit({params,searchParams:Promise.resolve({})}),locale);
 for(const id of ids){const tree=await Edit({params,searchParams:Promise.resolve({edit:id})}),builder=nodes(tree).find(n=>n.type===PacketInformationBuilder);check('actual offered component control '+locale+'/'+id,()=>{assert(overview.includes('edit='+id));assert(builder);assert.deepEqual(builder.props.questions.map(q=>q.id),[id]);assert(html(tree,locale).includes('data-packet-question="'+id+'"'));assert.equal(builder.props.initialRouteChanged,false);assert.equal(builder.props.returnToMatterAfterCorrection,true);assert(!overview.includes(locale==='es'?'Revise las respuestas guardadas sobre la elegibilidad':'Review saved eligibility answers'));assert(overview.includes(locale==='es'?'Revise los datos de contacto de la persona acusada':'Review defendant contact details'));const output=html(tree,locale);const leave=locale==='es'?'Guardar y volver al caso':'Save and return to matter';assert(new RegExp('<button(?![^>]*\\sdisabled(?:[\\s=>]))[^>]*>'+leave+'</button>').test(output));});diagnosis.push({locale,id,initialRouteChanged:builder.props.initialRouteChanged,returnToMatter:builder.props.returnToMatterAfterCorrection,overviewLabelsEligibility:overview.includes(locale==='es'?'Revise las respuestas guardadas sobre la elegibilidad':'Review saved eligibility answers')});}
 const matter=html(await Matter({params}),locale);check('actual matter offers owner entry '+locale,()=>assert(matter.includes('/briefcase/'+item.id+'/packet-information')));
}
owner='other-owner';for(const method of ['GET','POST']){response=method==='GET'?await API.GET(new Request(url),context):await post(values);check('actual other owner refusal '+method,()=>{assert.equal(response.status,404);assert.deepEqual(stored,stable)});}
console.log(JSON.stringify({status:'PASS_CT_CONTACT_SOURCE_AND_HANDLER',checks,diagnosis,source:C.CT_CLEAN_SLATE_CONTACT_SOURCE,qualifiedSpanishReview:'pending',databaseRuns:0,renderRuns:0}));
