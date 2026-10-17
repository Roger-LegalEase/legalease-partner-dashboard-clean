import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {register} from 'node:module';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const root=process.cwd(),file=p=>path.join(root,p),load=p=>import(pathToFileURL(file(p)).href);
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {LocalizationContext}=await import(pathToFileURL(loc).href);
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {contactRepresentationHash:hash}=await load('src/lib/expungement-ai/contact-representation.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const profile=getProfileByJurisdiction('MO'),route='closed-record-outcome-under-rsmo-610-105',checks=[],rows=[];
const check=(name,actual,expected)=>checks.push({name,pass:isDeepStrictEqual(actual,expected),actual,expected});
const fixture=JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json'));
const base={...fixture.additionalSubgroups.find(x=>x.id==='MO-610105-status-financial-witness-20261014').freshBaselineReproduction.base,financial_obligations:'No'};
for(const [variant,value]of [['known','Earlier originating court text'],['absent',undefined],['unknown','I am not sure']]){
 const answers={...base};if(value===undefined)delete answers.court;else answers.court=value;
 const authoritative=evaluate({jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:'synthetic-mo-610105-court-context',answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
 const record={status:'unverified',reason:'synthetic-source-reproduction-not-authenticated-owner',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},model=P.protectedPacketInformationModelFor(record);
 const collection=P.packetCollectionFor({jurisdiction:'MO',pathwayId:route,requiredInputIds:model.requiredInputIds,serverFacts:model.serverFacts,screeningAnswers:model.screeningAnswers,prefilledAnswers:model.prefilledAnswers,savedAnswers:model.packetAnswers});
 const q=model.questions.find(q=>q.id==='court'),fact=collection.facts.find(f=>f.factId==='court');
 rows.push({variant,answers,record,evaluation:authoritative.evaluation,courtQuestion:q,courtFact:fact,missing:model.missingInputIds,builderIds:model.builderQuestions.map(q=>q.id),heldIds:[...P.heldPacketCorrectionInputIds(model,model.resultCode)]});
 check(variant+'/guidance-result',authoritative.evaluation.resultCode,'guidance_only');check(variant+'/route-retained',authoritative.evaluation.pathwayId,route);check(variant+'/closed-payment',authoritative.evaluation.paymentAllowed,false);
 check(variant+'/automatic-status-plan',authoritative.evaluation.packetPlan.mode,'automatic_relief_verification_and_guidance');check(variant+'/no-source-form-destination',authoritative.evaluation.packetPlan.sourceFormIds,[]);check(variant+'/no-current-specification',packetSpecificationFor('MO:'+route),undefined);
 check(variant+'/court-optional',q?.required,false);check(variant+'/court-context-only',q?.contextOnly,true);check(variant+'/court-status-lifecycle',q?.lifecyclePhase,'guidance_only');check(variant+'/court-inactive',fact?.active,false);
 check(variant+'/no-court-gate',model.missingInputIds.includes('court'),false);check(variant+'/no-new-court-builder',model.builderQuestions.some(q=>q.id==='court'),false);check(variant+'/existing-disposition-control-only',[...P.heldPacketCorrectionInputIds(model,model.resultCode)],['case_outcome']);
}
// Real HTTP/presenter/page logic, isolated transport only. This is not an
// authenticated owner or database run and never repeats accepted MO owner work.
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
let stored,sourceAnswers,owner='synthetic-mo-owner';const item={id:'synthetic-mo-610105-court-context',jurisdiction:'MO',artifactRefs:{}};
const present=()=>decorate({consumerAuthUserId:'synthetic-mo-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__moCourtTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-mo-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__moCourtTransport.'+b+'(...args);').join('\n'));};
const pageFile=file('src/app/briefcase/[packetId]/packet-information/page.tsx');let pageSource=fs.readFileSync(pageFile,'utf8');pageSource=pageSource.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');pageSource=pageSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])pageSource=substitute(pageSource,[b],'@/lib/expungement-ai/'+m);compile(pageFile,pageSource);const Edit=(await import(pathToFileURL(pageFile).href)).default;
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let apiSource=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])apiSource=substitute(apiSource,b,m);compile(apiFile,apiSource);const API=await import(pathToFileURL(apiFile).href);
const context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information',post=(answers,extra={})=>API.POST(new Request(url,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const {isPacketSaveReceipt}=await load('src/lib/expungement-ai/packet-save-contract.ts');
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};
const surfaces=[];
for(const row of rows){
 stored=structuredClone(row.record);sourceAnswers=row.answers;const before=structuredClone(stored),get=await API.GET(new Request(url),context),body=await get.json();check(row.variant+'/actual-GET200',get.status,200);
 const tree=await Edit({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({})}),builders=nodes(tree).filter(n=>n.type?.name==='PacketInformationBuilder'),builderIds=builders.flatMap(n=>n.props.questions.map(q=>q.id));check(row.variant+'/actual-offered-field-IDs',builderIds,['case_outcome']);
 const pages=[];for(const locale of ['en','es']){const markup=html(tree,locale);check(row.variant+'/'+locale+'/no-offered-court-control',markup.includes('data-packet-question="court"')||markup.includes('value="court"'),false);pages.push({locale,markup});}
 surfaces.push({variant:row.variant,getStatus:get.status,body,builderIds,pages});check(row.variant+'/GET-keeps-exact-record',stored,before);
 for(const answers of [{},{case_outcome:row.answers.case_outcome}]){const response=await post(answers),receipt=await response.json();check(row.variant+'/actual-noop-status',response.status,200);check(row.variant+'/actual-strict-noop-receipt',isPacketSaveReceipt(receipt),true);check(row.variant+'/noop-raw-history-unchanged',stored,before);check(row.variant+'/no-verification-authority',receipt.readyToGenerate,false);for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.variant+'/commerce-'+key,receipt.commercialActions?.[key],false);}
 const wrongBefore=structuredClone(stored);owner='wrong-owner';const wrong=await post({});owner='synthetic-mo-owner';check(row.variant+'/wrong-owner-denied',wrong.status,404);check(row.variant+'/wrong-owner-atomic',stored,wrongBefore);
}
const helper=file('src/lib/expungement-ai/mo-610105-court-context.ts');
if(fs.existsSync(helper)){
 const H=await import(pathToFileURL(helper).href),q={id:'court',stage:'case_details',prompt:'Which court or agency handled the case?',type:'text',required:true,contextOnly:false,lifecyclePhase:'postpay_official_form_field',options:null,translations:{es:{prompt:'¿Qué tribunal o agencia manejó el caso?'}}};
 check('exact-source-context-guard',H.mo610105CourtIsContext(profile,route,null),true);
 for(const[label,p,r,s,current]of [['wrong-state',{...profile,jurisdiction:{...profile.jurisdiction,code:'OH'}},route,null,{}],['other-MO-122',profile,'false-information-or-qualifying-arrest-record-expungement-under-610-122-123',null,{}],['other-MO-XIV',profile,'marijuana-expungement-under-missouri-constitution-article-xiv',null,{}],['source',{...profile,source:{...profile.source,sourceCorpusSha256:'0'.repeat(64)}},route,null,{}],['profile',{...profile,profileVersion:'changed'},route,null,{}],['specification',profile,route,{},{}],['memo',profile,route,null,{memo:{}}],['proof',profile,route,null,{proof:{}}],['family',profile,route,null,{family:{}}]])check('source-guard-refuses-'+label,H.mo610105CourtIsContext(p,r,s,current),false);
 for(const sibling of ['false-information-or-qualifying-arrest-record-expungement-under-610-122-123','marijuana-expungement-under-missouri-constitution-article-xiv'])check('sibling-question-metadata-unchanged-'+sibling,H.mo610105CourtContextQuestion(q,profile,sibling,null),q);
 const common={jurisdiction:'MO',pathwayId:route,requiredInputIds:['court'],serverFacts:{},screeningAnswers:{},prefilledAnswers:{},savedAnswers:{},questionById:new Map([['court',q]]),specification:null};
 const explicit=resolvePacketCollection({...common,override:{needsHumanClassification:['court']}});check('genuine-human-classification-not-bypassed',explicit.facts[0].source==='mo_610105_court_retained_context',false);
 for(const sibling of ['false-information-or-qualifying-arrest-record-expungement-under-610-122-123','marijuana-expungement-under-missouri-constitution-article-xiv']){
  const resolution=P.packetCollectionFor({jurisdiction:'MO',pathwayId:sibling,requiredInputIds:['court'],serverFacts:{},screeningAnswers:{},prefilledAnswers:{},savedAnswers:{}});
  check('actual-sibling-court-not-reclassified-'+sibling,resolution.facts.find(f=>f.factId==='court')?.source==='mo_610105_court_retained_context',false);
 }
 check('prompt-preserved',rows[0].courtQuestion.prompt,q.prompt);check('Spanish-prompt-preserved',rows[0].courtQuestion.translations,q.translations);
 for(const changed of [{...q,prompt:'Different court purpose'},{...q,type:'single_choice'},{...q,id:'county_or_filing_location'}])check('independent-question-meaning-untouched-'+changed.id+'-'+changed.type+'-'+changed.prompt,H.mo610105CourtContextQuestion(changed,profile,route,null),changed);

}
// Exact source-reproduced pre-correction stored maps. The earlier known
// court was prefilled; a new seed's map partition cannot stand in for it.
const historical=[];
for(const row of rows){
 const old=structuredClone(row.record),snapshot=old.draftSnapshot;
 if(row.variant==='known'){snapshot.prefilledAnswers.court=snapshot.screeningAnswers.court;delete snapshot.screeningAnswers.court;old.draftHash=P.protectedPacketDraftHash(snapshot);}
 const before=structuredClone(old);stored=old;sourceAnswers=row.answers;
 check(row.variant+'/old-source-draft-readable',Boolean(P.protectedPacketInformationModelFor(old)),true);
 const read=await API.GET(new Request(url),context);check(row.variant+'/old-source-actual-GET200',read.status,200);check(row.variant+'/old-source-GET-preserves-record',stored,before);
 const noop=await post({}),body=await noop.json();check(row.variant+'/old-source-noop200',noop.status,200);check(row.variant+'/old-source-strict-receipt',isPacketSaveReceipt(body),true);check(row.variant+'/old-source-noop-keeps-raw-maps-history',stored,before);
 historical.push({variant:row.variant,originalRecord:before,getStatus:read.status});
}
// Explicitly synthetic prior typed value and existing semantic history. Read
// and noop must retain both even though there is no court intake destination.
const typed=structuredClone(rows[0].record),snapshot=typed.draftSnapshot;
for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])if(Object.hasOwn(snapshot[map],'court'))snapshot[map].court={value:'Earlier originating court text',unknown:true};
snapshot.dependencies.semanticAnswerHistory=[{factId:'court',value:'Earlier originating court text',source:'prefilledAnswers',meaning:'prior_answer_for_shape_clarification',routeKey:'MO:'+route,profileVersion:snapshot.profileVersion,profileSourceFingerprint:snapshot.profileSourceFingerprint,profileAuthorityFingerprint:snapshot.profileAuthorityFingerprint}];typed.draftHash=P.protectedPacketDraftHash(snapshot);
stored=typed;sourceAnswers=rows[0].answers;const typedBefore=structuredClone(stored),typedRead=await API.GET(new Request(url),context);check('typed-history-actual-GET200',typedRead.status,200);check('typed-history-read-keeps-whole-record',stored,typedBefore);
const typedNoop=await post({});check('typed-history-noop-200',typedNoop.status,200);check('typed-history-noop-keeps-whole-record',stored,typedBefore);
const review=await post({},{verify:true}),reviewBody=await review.json();check('explicit-review-cannot-create-readiness',reviewBody.readyToGenerate,false);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])check('explicit-review-retains-raw-'+map,stored.draftSnapshot[map],typedBefore.draftSnapshot[map]);check('explicit-review-retains-existing-history',stored.draftSnapshot.dependencies.semanticAnswerHistory,typedBefore.draftSnapshot.dependencies.semanticAnswerHistory);
const memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MO.memo.json')),proof=JSON.parse(fs.readFileSync('data/record-clearing/production-factory/packet-proofs/rcap-mo-guidance-implementation.json')),manifest=JSON.parse(fs.readFileSync('data/rcap-ledger/completed-output-counsel-manifest.json')),family=manifest.families.find(x=>x.familyId==='rcap-mo-guidance-implementation');
const failed=checks.filter(c=>!c.pass),receipt={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),originalMember:'GA14-MO-PARTICIPANT_ORIGINATING_COURT_FOR_RECORD_GUIDANCE_EXTERNAL_CLOSURE / Q-05683e402a6b283d367f',checks,rows,surfaces,historical,guardSourceHashes:{profile:hash(profile),memo:hash(memo),proof:hash(proof),family:hash(family)},limits:['Existing accepted financial/disposition/status owner work retained; no owner rerun, DB/browser, form/render or legal adoption.','Three source-synthetic current cases; actual production model/collector/API/page with isolated transport, not authenticated owner acceptance.','Sibling MO court meanings/destinations and conditional petition branches remain separate.']};
if(process.env.RCAP_MO_COURT_RECEIPT)fs.writeFileSync(process.env.RCAP_MO_COURT_RECEIPT,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({checks:checks.length,failed:failed.map(c=>({name:c.name,actual:c.actual,expected:c.expected}))}));assert.equal(failed.length,0);
