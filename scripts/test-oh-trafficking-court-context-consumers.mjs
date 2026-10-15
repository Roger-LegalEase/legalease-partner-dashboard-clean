import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {spawnSync} from 'node:child_process';
const routes=['human-trafficking-survivor-conviction-expungement-under-2953-36','human-trafficking-survivor-non-conviction-expungement-under-2953-521'];
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
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {PacketInformationBuilder}=await load('src/components/expungement-ai/PacketInformationBuilder.tsx');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const route=process.argv[2];
const witness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-answer-sets.json'))).witnesses.find(row=>row.pathwayKey==='OH:'+route);
const legacy='Earlier contact prose retained as history';
const sourceAnswers={...witness.finalAnswers,contact_information:legacy,residency_or_location:'Earlier judicial district answer'};
const authoritative=evaluate({jurisdiction:'OH',profileVersion:witness.profileVersion,matterId:'synthetic-oh-contact',answers:witness.finalAnswers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-oh-owner';
const item={id:'synthetic-oh-contact',jurisdiction:'OH',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const present=()=>decorate({consumerAuthUserId:'synthetic-oh-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'OH',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__ohCourtTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-oh-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__ohCourtTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const Matter=await page('src/app/briefcase/[packetId]/page.tsx');
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const {isPacketSaveReceipt}=await load('src/lib/expungement-ai/packet-save-contract.ts');
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200);const body=await response.json();assert(isPacketSaveReceipt(body),'strict real save receipt');assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};

const id='court';
const shape=s=>Object.fromEntries(['pathwayId','resultCode','selectedTrackId','paymentAllowed','packetPlan','requiredInputIds'].map(k=>[k,s[k]]));
const baselineShape=shape(original.draftSnapshot);
const maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const assign=(map,raw)=>{stored=structuredClone(original);stored.draftSnapshot[map][id]=structuredClone(raw);stored.draftHash=P.protectedPacketDraftHash(snap());};
const noInference=()=>{for(const map of maps)for(const k of Object.keys(original.draftSnapshot[map]))if(k!==id)assert.deepEqual(snap()[map][k],original.draftSnapshot[map][k],map+'.'+k+' unchanged');assert.deepEqual(shape(snap()),baselineShape);};
check('actual model omits absent unsupported court prerequisite',()=>{const m=model();assert(m);assert(!m.builderQuestions.some(q=>q.id===id),'court must be inactive when absent');assert(!m.missingInputIds.includes(id));assert(snap().requiredInputIds.includes(id),'retain original plan');assert.deepEqual(stored,original);assert.equal(snap().paymentAllowed,false);assert.equal(snap().selectedTrackId,null);assert.equal(snap().resultCode,'needs_review');assert.deepEqual([...P.heldPacketCorrectionInputIds(m,snap().resultCode)],[]);});
const g=await API.GET(new Request(url),context),gb=await g.json();check('actual GET no absent court gate',()=>{assert.equal(g.status,200);assert(!gb.questions.some(q=>q.id===id));assert(!gb.missingInputIds.includes(id));assert.equal(gb.readyToGenerate,false);});
await save({});check('absent HTTP no-op preserves entire original record',()=>assert.deepEqual(stored,original));
for(const map of maps)for(const raw of ['SYNTHETIC ORIGINAL COURT',{value:'SYNTHETIC EARLIER COURT',unknown:true},['SYNTHETIC MALFORMED COURT'],null]){
 assign(map,raw);const prior=structuredClone(stored),m=model();
 check('retained optional court context '+map,()=>{const q=m.builderQuestions.find(q=>q.id===id);assert(q);assert.equal(q.required,false);assert.equal(q.contextOnly,true);assert.equal(q.prompt,'Which court or agency handled the case?');assert.equal(q.translations.es.prompt,'¿Qué tribunal o agencia manejó el caso?');assert(!m.missingInputIds.includes(id));assert.deepEqual([...P.heldPacketCorrectionInputIds(m,snap().resultCode)],[]);assert.deepEqual(stored,prior);});
 await save({});check('retained raw full-record HTTP no-op '+map,()=>assert.deepEqual(stored,prior));
 await save({[id]:'SYNTHETIC CORRECTED COURT'});check('explicit correction archives raw source '+map,()=>{assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.source===map&&JSON.stringify(h.value)===JSON.stringify(raw)));assert.equal(snap().packetAnswers[id],'SYNTHETIC CORRECTED COURT');assert(!model().missingInputIds.includes(id));noInference();});
}
assign('prefilledAnswers','SYNTHETIC COURT ONE');stored.draftSnapshot.packetAnswers[id]='SYNTHETIC COURT TWO';stored.draftHash=P.protectedPacketDraftHash(snap());const conflict=structuredClone(stored);await save({});check('conflicting copies no-op exact',()=>assert.deepEqual(stored,conflict));await save({[id]:'SYNTHETIC EXPLICIT CORRECTION'});check('explicit correction archives both copies',()=>{for(const map of ['prefilledAnswers','packetAnswers'])assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.source===map&&h.value===conflict.draftSnapshot[map][id]));noInference();});
await save({[id]:{unknown:true,value:''}});check('unknown stays optional/raw',()=>{assert.deepEqual(snap().packetAnswers[id],{unknown:true,value:''});assert(!model().missingInputIds.includes(id));noInference();});
await save({[id]:'SYNTHETIC FINAL COURT'});check('known correction retains unknown history',()=>assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.value?.unknown===true)));
for(const locale of ['en','es'])for(const edit of [undefined,id]){
 const tree=await Edit({params,searchParams:Promise.resolve(edit?{edit}:{})}),markup=html(tree,locale);
 check('actual held page has no editor '+locale+'/'+edit,()=>{assert.equal(nodes(tree).filter(n=>n.type===PacketInformationBuilder).length,0);assert(!markup.includes('SYNTHETIC FINAL COURT'));assert(!markup.includes('name="court"'));});
 const matter=await Matter({params});const rendered=html(matter,locale);check('actual matter offers no packet editor '+locale+'/'+edit,()=>assert(!rendered.includes('/packet-information')));
}
const stable=structuredClone(stored);
for(const [answers,extra,query,status]of [[{constructor:'unsafe'},{},'',422],[{[id]:'NEW'},{expectedRevision:0},'',409],[{[id]:'NEW'},{},'?preparation=mt-deferred',403]]){const response=await post(answers,extra,query);check('actual refusal '+status,()=>{assert.equal(response.status,status);assert.deepEqual(stored,stable);});}
owner='another-owner';for(const method of ['GET','POST']){const response=method==='GET'?await API.GET(new Request(url),context):await post({[id]:'NEW'});check('wrong-owner '+method,()=>{assert.equal(response.status,404);assert.deepEqual(stored,stable);});}owner='synthetic-oh-owner';
const {preparePersonalizedPacket}=await load('src/lib/rcap/render/personalized-packet.ts');check('current render authority remains refused',()=>assert.throws(()=>preparePersonalizedPacket({snapshot:snap()}),/personalized render authority refused/));
const verify=await post({},{verify:true}),body=await verify.json();check('no verification/commercial uplift',()=>{assert.equal(verify.status,200);assert(isPacketSaveReceipt(body));assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(v=>v===false));assert.notEqual(stored.status,'verified');assert.equal(snap().paymentAllowed,false);});
console.log(JSON.stringify({status:'PASS_ACTUAL_OH_GUIDANCE_COURT_CONTEXT_CONSUMERS',route,checks,noDatabase:true,noBrowser:true,noRender:true,noAuthenticatedJourneyClaim:true,noNewEditor:true,existingLocalizedPromptPreserved:true}));
