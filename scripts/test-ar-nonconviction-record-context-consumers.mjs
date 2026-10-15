import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {spawnSync} from 'node:child_process';
const routes=['situation-a-non-convictions'];
if(!process.argv[2]){
 let failed=false;
 for(const route of routes){const r=spawnSync(process.execPath,[process.argv[1],route],{cwd:process.cwd(),encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);if(r.status!==0)failed=true;}
 process.exit(failed?1:0);
}
assert(routes.includes(process.argv[2]),'exact test route');
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
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const route=process.argv[2];
const witness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(row=>row.pathwayKey==='AR:'+route);
const legacy='Earlier contact prose retained as history';
const sourceAnswers={...witness.answers,contact_information:legacy,residency_or_location:'Earlier judicial district answer'};
const authoritative=evaluate({jurisdiction:'AR',profileVersion:witness.profileVersion,matterId:'synthetic-ar-contact',answers:witness.answers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-ar-owner';
const item={id:'synthetic-ar-contact',jurisdiction:'AR',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const present=()=>decorate({consumerAuthUserId:'synthetic-ar-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'AR',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__arHistoryTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-ar-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__arHistoryTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const {isPacketSaveReceipt}=await load('src/lib/expungement-ai/packet-save-contract.ts');
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200);const body=await response.json();assert(isPacketSaveReceipt(body),'strict real save receipt');assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};

const id='record_type',options=['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure'];
const shape=s=>Object.fromEntries(['pathwayId','resultCode','selectedTrackId','paymentAllowed','packetPlan','requiredInputIds'].map(k=>[k,s[k]]));
const baselineShape=shape(original.draftSnapshot);
const assign=(map,raw)=>{stored=structuredClone(original);stored.draftSnapshot[map][id]=structuredClone(raw);stored.draftHash=P.protectedPacketDraftHash(snap());};
const noInference=()=>{for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const k of ['case_outcome','offense_level','offense_category','ar_record_origin','disposition','filingStatus','refiled','disposition_date','sentence_completion_date','pending_cases','financial_obligations'])assert.deepEqual(snap()[map][k],original.draftSnapshot[map][k],k+' must not be inferred');};
check('corrected actual model omits absent unsupported mandatory taxonomy',()=>{const m=model();assert(m);assert(!m.builderQuestions.some(q=>q.id===id),'record_type must be inactive when absent');assert(!m.missingInputIds.includes(id));assert(snap().requiredInputIds.includes(id),'retain old plan');assert.deepEqual(stored,original);assert.equal(snap().paymentAllowed,false);assert.equal(snap().selectedTrackId,null);assert.equal(snap().resultCode,'not_covered_yet');noInference();});
const g=await API.GET(new Request(url),context),gb=await g.json();check('actual serialized GET no absent taxonomy gate',()=>{assert.equal(g.status,200);assert(!gb.questions.some(q=>q.id===id));assert(!gb.missingInputIds.includes(id));assert.equal(gb.readyToGenerate,false);});
const absent=structuredClone(stored);await save({});check('ordinary absent no-op exact',()=>assert.deepEqual(stored,absent));
for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const raw of options){
 assign(map,raw);const prior=structuredClone(stored),m=model();
 check('retained scalar optional original context '+map+'/'+raw,()=>{const q=m.builderQuestions.find(q=>q.id===id);assert(q);assert.equal(q.required,false);assert(q.prompt.includes('optional history'));assert.deepEqual(q.options,options);assert(P.editablePacketInputIds(m).has(id));assert(!m.missingInputIds.includes(id));assert.deepEqual(stored,prior);assert.deepEqual(shape(snap()),baselineShape);noInference();});
 await save({});check('raw scalar exact no-op '+map+'/'+raw,()=>assert.deepEqual(stored,prior));
}
for(const [map,raw] of [['screeningAnswers',{value:'Court case',unknown:true}],['prefilledAnswers',['Conviction']],['packetAnswers',null]]){
 assign(map,raw);const prior=structuredClone(stored);check('malformed historical copy optional and preserved on read',()=>{assert(model().builderQuestions.some(q=>q.id===id&&!q.required));assert(!model().missingInputIds.includes(id));assert.deepEqual(stored,prior);});await save({});check('malformed historical copy exact no-op',()=>assert.deepEqual(stored,prior));await save({[id]:'Court case'});check('ordinary explicit scalar repair archives typed original',()=>{assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.source===map&&JSON.stringify(h.value)===JSON.stringify(raw)));assert.deepEqual(shape(snap()),baselineShape);noInference();});
}
assign('prefilledAnswers','Arrest or charge');stored.draftSnapshot.packetAnswers[id]='Conviction';stored.draftHash=P.protectedPacketDraftHash(snap());const conflict=structuredClone(stored);await save({});check('both original conflicting maps preserved on no-op',()=>assert.deepEqual(stored,conflict));await save({[id]:'Juvenile matter'});check('explicit correction archives both source copies without inference',()=>{for(const map of ['prefilledAnswers','packetAnswers'])assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.source===map&&h.value===conflict.draftSnapshot[map][id]));assert.deepEqual(shape(snap()),baselineShape);noInference();});
await save({[id]:'I am not sure'});check('unknown scalar saved without completion gate',()=>{assert.equal(snap().packetAnswers[id],'I am not sure');assert(!model().missingInputIds.includes(id));noInference();});await save({[id]:'Court case'});check('restored known scalar retains uncertainty history',()=>assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.value==='I am not sure')));
for(const raw of options){await save({[id]:raw});check('actual scalar transport and authority '+raw,()=>{assert.equal(snap().packetAnswers[id],raw);assert.deepEqual(shape(snap()),baselineShape);noInference();});}
for(const locale of ['en','es']){
 const tree=await Edit({params,searchParams:Promise.resolve({})});check('actual page retains origin correction and no taxonomy editor '+locale,()=>{const builders=nodes(tree).filter(n=>n.type===PacketInformationBuilder);assert.equal(builders.length,1);assert.deepEqual(builders[0].props.questions.map(q=>q.id),['ar_record_origin']);});
 await assert.rejects(()=>Edit({params,searchParams:Promise.resolve({edit:id})}),/NEXT_REDIRECT/);
 check('standalone existing history control EN/ES optional copy '+locale,()=>{const q=model().builderQuestions.find(q=>q.id===id),markup=html(React.createElement(PacketInformationBuilder,{itemId:item.id,stateCode:'AR',pathwayId:route,questions:[q],initialAnswers:{[id]:'Court case'},initiallyMissing:[],initialRevision:stored.revision,initialResumeSectionId:id,editingFromReview:true}),locale);assert(markup.includes(locale==='es'?'historial opcional':'optional history'));assert(markup.includes(locale==='es'?'categorías anteriores pueden coincidir':'labels can overlap'));assert(markup.includes(locale==='es'?'No establece una resolución':'does not establish a disposition')); });
}
const stable=structuredClone(stored);
for(const [answers,extra,query,status]of [[{[id]:{value:'Court case',unknown:true}},{},'',422],[{[id]:'Conviction'},{expectedRevision:0},'',409],[{[id]:'Conviction'},{},'?preparation=mt-deferred',403]]){const response=await post(answers,extra,query);check('actual unchanged refusal '+status,()=>{assert.equal(response.status,status);assert.deepEqual(stored,stable);});}
owner='another-owner';for(const method of ['GET','POST']){const response=method==='GET'?await API.GET(new Request(url),context):await post({[id]:'Conviction'});check('actual wrong-owner '+method,()=>{assert.equal(response.status,404);assert.deepEqual(stored,stable);});}owner='synthetic-ar-owner';
const {preparePersonalizedPacket}=await load('src/lib/rcap/render/personalized-packet.ts');
check('actual render preparation still refuses authority',()=>assert.throws(()=>preparePersonalizedPacket({snapshot:snap()}),/personalized render authority refused/));
const verify=await post({},{verify:true}),verifyBody=await verify.json();check('no successful verification or commerce from optional history',()=>{assert.notEqual(stored.status,'verified');assert(!stored.hash);assert.equal(snap().paymentAllowed,false);assert.equal(verify.status,200);assert(isPacketSaveReceipt(verifyBody));assert.equal(verifyBody.readyToGenerate,false);assert(Object.values(verifyBody.commercialActions).every(x=>x===false));});
console.log(JSON.stringify({status:'PASS_ACTUAL_AR_NONCONVICTION_HISTORY_CONSUMERS',route,checks,originalQuestionId:'Q-1ab16c42dd48e5b516f6',qualifiedSpanishReview:'pending',noDatabase:true,noRender:true,noAuthenticatedJourneyClaim:true}));
