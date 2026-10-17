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
const C=await load('src/lib/expungement-ai/nd-first-offense-family-inputs.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const route=C.ND_FIRST_OFFENSE_FAMILY.route,ids=C.ND_FIRST_OFFENSE_CONTACT_FIELDS.map(field=>field.id);
const witness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(row=>row.pathwayKey==='ND:'+route);
const legacy='Earlier contact prose retained as history';
const sourceAnswers={...witness.answers,contact_information:legacy,residency_or_location:'Earlier judicial district answer'};
const authoritative=evaluate({jurisdiction:'ND',profileVersion:witness.profileVersion,matterId:'synthetic-nd-contact',answers:witness.answers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-nd-owner';
const item={id:'synthetic-nd-contact',jurisdiction:'ND',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const values={mailing_address:{value:'42 Exact Mailing Street, Unit 7',unknown:false},phone_number:{value:'+1 785 555 0101 ext 04',unknown:false},email_address:{value:'Exact.Local+ND@Example.TEST',unknown:false}};
const present=()=>decorate({consumerAuthUserId:'synthetic-nd-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'ND',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__ndFamilyTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-nd-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__ndFamilyTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Matter=await page('src/app/briefcase/[packetId]/page.tsx');
const Review=await page('src/app/briefcase/[packetId]/review/page.tsx'),Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200);const body=await response.json();assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};

const {isPacketSaveReceipt}=await load('src/lib/expungement-ai/packet-save-contract.ts');
const captured=process.env.ND_RECORD_CONTEXT_PARTIAL_RECORD;
if(captured){stored=JSON.parse(fs.readFileSync(captured,'utf8'));assert.equal(P.protectedPacketDraftHash(stored.draftSnapshot),stored.draftHash);assert.equal(stored.draftSnapshot.jurisdiction,'ND');assert.equal(stored.draftSnapshot.pathwayId,route);assert.equal(stored.draftSnapshot.packetAnswers.record_type,'I am not sure');}
const initial=structuredClone(stored);
const immutableFacts=record=>({state:record.draftSnapshot.jurisdiction,route:record.draftSnapshot.pathwayId,result:record.draftSnapshot.resultCode,plan:record.draftSnapshot.packetPlan,payment:record.draftSnapshot.paymentAllowed,maps:Object.fromEntries(['screeningAnswers','prefilledAnswers','packetAnswers'].map(map=>[map,Object.fromEntries(Object.entries(record.draftSnapshot[map]).filter(([id])=>id!=='record_type'))]))});
for(const value of [undefined,'Court case','I am not sure',{value:'Court case',unknown:true},'Court case']){
 if(value && typeof value==='object'){const prior=structuredClone(stored),denied=await post({record_type:value});check('current single-choice transport refuses typed wrapper unchanged',()=>{assert.equal(denied.status,422);assert.deepEqual(stored,prior);});
 // Fresh typed-history reproduction, not an actual owner capture or accepted current input.
 stored.draftSnapshot.packetAnswers.record_type=structuredClone(value);stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);}
 const prior=structuredClone(stored),response=await post(value===undefined||typeof value==='object'?{}:{record_type:value}),body=await response.json();
 check('actual handler valid client receipt '+JSON.stringify(value),()=>{assert.equal(response.status,200,JSON.stringify({value,body}));assert.equal(isPacketSaveReceipt(body),true);assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(v=>v===false));});
 check('single canonical section owns each contact '+JSON.stringify(value),()=>{for(const id of ids){assert.equal(body.sections.filter(s=>s.questionIds.includes(id)).length,1);assert(body.sections.find(s=>s.id==='nd_first_offense_participant_contact').questionIds.includes(id));}assert.equal(new Set(body.sections.flatMap(s=>s.questionIds)).size,body.sections.flatMap(s=>s.questionIds).length);});
 check('receipt retains exact source values and review questions '+JSON.stringify(value),()=>{for(const q of body.questions)assert(body.reviewQuestions.some(r=>r.id===q.id));assert.deepEqual(body.questions.find(q=>q.id==='record_type')?.options,value===undefined&&!captured?undefined:['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure']);if(value!==undefined)assert.deepEqual(stored.draftSnapshot.packetAnswers.record_type,value);});
 check('raw unrelated facts and authority preserved '+JSON.stringify(value),()=>{assert.deepEqual(immutableFacts(stored),immutableFacts(prior));assert.notEqual(stored.status,'verified');if(value===undefined||typeof value==='object')assert.deepEqual(stored,prior);});
 const duplicate=structuredClone(body);duplicate.sections.push({...duplicate.sections.find(s=>s.id==='nd_first_offense_participant_contact'),id:'duplicate-contact-owner'});
 check('strict client still refuses duplicated navigation ownership '+JSON.stringify(value),()=>assert.equal(isPacketSaveReceipt(duplicate),false));
 const missing=structuredClone(body);missing.reviewQuestions=missing.reviewQuestions.filter(q=>q.id!=='mailing_address');check('strict client still refuses missing review counterpart '+JSON.stringify(value),()=>assert.equal(isPacketSaveReceipt(missing),false));
 const foreign=structuredClone(body);foreign.sections[0].questionIds.push('not_an_offered_question');check('strict client still refuses invented section member '+JSON.stringify(value),()=>assert.equal(isPacketSaveReceipt(foreign),false));
}
console.log(JSON.stringify({status:'PASS_ND_SAVE_RECEIPT_PRODUCER',checks,actualPartialRecord:Boolean(captured),noDatabase:true,guardUnchanged:true,sourceRecordUnchanged:captured?JSON.stringify(initial)===JSON.stringify(JSON.parse(fs.readFileSync(captured,'utf8'))):true}));
