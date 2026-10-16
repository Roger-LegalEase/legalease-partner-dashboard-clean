import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {register} from 'node:module';
import ts from 'typescript';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const root=process.cwd(),file=p=>path.join(root,p),load=p=>import(pathToFileURL(file(p)).href);
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#binding-'+Buffer.from(name).toString('hex'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {LocalizationContext}=await import(pathToFileURL(loc).href);

const baseline=process.argv.includes('--baseline'),receiptPath=process.env.RCAP_MN299C11_LOCATION_RECEIPT;
if(receiptPath)assert(!fs.existsSync(receiptPath),'Optional receipt path must be fresh');
if(baseline&&process.env.RCAP_MN299C11_LOCATION_PREIMAGES)for(const relative of ['src/lib/expungement-ai/packet-collection.ts','src/lib/expungement-ai/packet-information.ts'])compile(file(relative),fs.readFileSync(path.join(process.env.RCAP_MN299C11_LOCATION_PREIMAGES,relative),'utf8'));

const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {packetPlanForPathway}=await load('src/lib/rcap-engine/packet-planner.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile=getProfileByJurisdiction('MN'),route='arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11';
assert(profile);const plan=packetPlanForPathway(profile,route);assert(plan);
// Narrow immutable comparisons from the actual preserved predecessor replay at
// a1a958. No private record, rendered page, or participant-like map is published.
const frozenBefore={
  "head": "a1a958876bc06985046418ed5bb35d56323eb979",
  "receiptSha256": "2907b1a11af87c7cc9fd6334f877d670b22f5cfc09ee688093f356571f96b367",
  "plan": "1a86946b50eb1a9b1bbc273d9c22a967a5e6fb14a9b8bf0ae1c2be6dcbc70d69",
  "siblings": {
    "automatic-mistaken-identity-expungement-under-609a-017": "e4b1006503d36d6a17d4654d9129afc3ba8a050be37e2463e223f7e72eeb5f5b",
    "automatic-clean-slate-expungement-under-609a-015": "71832eebb1c6be601e0924ee6ae9a9c11db783188b7075f1a1258c1e1898c2c8",
    "cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06": "cd82ca78def90cde38d6438884af8f3eca0be2b574f4533d090bc459c6442d0d",
    "prosecutor-agreed-sealing-without-a-full-petition-under-609a-025": "be1946eb022d3c150ba39764237f0fed774a6b42686d1020ea22ce5bb67ac0b0",
    "petition-based-expungement-under-609a-02-03": "d497d99dd8f1f836cd35fd6a57e29e1d40bb24d2e3295bc1932871fbe7b5527e"
  },
  "court": {
    "known": "47a537bb50f6b8aa5df90614b40eb744d136606ec270e0aea40cce31cae7ceaa",
    "absent": "47a537bb50f6b8aa5df90614b40eb744d136606ec270e0aea40cce31cae7ceaa",
    "unknown": "47a537bb50f6b8aa5df90614b40eb744d136606ec270e0aea40cce31cae7ceaa"
  }
};
const comparisonHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const checks=[],rows=[],check=(name,actual,expected)=>checks.push({name,pass:isDeepStrictEqual(actual,expected),actual,expected});
// Exact retained original /routes/136/scenarios/B. This is an intentional
// negative, not a manufactured eligible Clean Slate case or route projection.
// Original archive SHA3173bbec9a9cd51ef2abd6cd05e68c1830585d833cd45157dbb7f31fe3dedcc1.
const original={"ownership_scope":"Yes","jurisdiction_scope":"State or local","case_outcome":"Arrest or citation with no charge filed","offense_level":"Misdemeanor","possible_pathway_context":"Arrest-identification-data destruction when no charges were filed (Minn. Stat. § 299C.11)","identity_error":"Yes","pending_cases":"Yes","resolved_timing_bucket":"lt_1_year","court_requirements_completed":"yes"};
// Direct collection calls reproduce the original exact source-consumer contract.
// They do not claim an offered current owner model or select a route by label.
for(const [variant,value]of [['known','Earlier Minnesota location'],['absent',undefined],['unknown','I am not sure']]){
 const answers={...original},savedAnswers=value===undefined?{}:{residency_or_location:value};
 const before=structuredClone({answers,savedAnswers}),resolution=P.packetCollectionFor({jurisdiction:'MN',pathwayId:route,requiredInputIds:plan.requiredInputIds,serverFacts:{jurisdiction:'MN',pathway_id:route},screeningAnswers:answers,prefilledAnswers:{},savedAnswers});
 assert(resolution);const fact=resolution.facts.find(f=>f.factId==='residency_or_location');assert(fact);
 check(variant+'/raw-answers-unchanged',{answers,savedAnswers},before);
 check(variant+'/plan-retained',packetPlanForPathway(profile,route),plan);
 check(variant+'/null-spec',packetSpecificationFor('MN:'+route),undefined);
 check(variant+'/inactive-location',fact.active===false,!baseline);
 if(!baseline)check(variant+'/source-owned-context',fact.source,'mn_299c11_location_retained_context');
 // Preserve the observed original outcome; a route change must fail this test.
 // No requested-route override or qualifying-case inference is used.
 const authoritative=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'synthetic-mn-location',answers});
 check(variant+'/original-not-yet',authoritative.evaluation.resultCode,'not_yet');check(variant+'/original-exact-route',authoritative.evaluation.pathwayId,route);check(variant+'/original-payment-closed',authoritative.evaluation.paymentAllowed,false);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
 if(value!==undefined){
  seed.snapshot.packetAnswers.residency_or_location=value;
  seed.snapshot.dependencies.semanticAnswerHistory=[{factId:'residency_or_location',value,source:'packetAnswers',meaning:'prior_answer_for_shape_clarification',routeKey:'MN:'+route,profileVersion:seed.snapshot.profileVersion,profileSourceFingerprint:seed.snapshot.profileSourceFingerprint,profileAuthorityFingerprint:seed.snapshot.profileAuthorityFingerprint}];
 }
 const record={status:'unverified',reason:'source-synthetic-not-authenticated-owner',revision:0,draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot};
 const recordBefore=structuredClone(record),model=P.protectedPacketInformationModelFor(record);
 check(variant+'/read-preserves-raw-history',record,recordBefore);
 check(variant+'/no-actor-intake-invented',model.questions.some(q=>['arrestingAgency','custodiansHoldingRecord'].includes(q.id)),false);check(variant+'/no-held-editor-invented',[...P.heldPacketCorrectionInputIds(model,model.resultCode)],[]);
 check(variant+'/actual-protected-model-exact-route',model?.pathwayId,route);
 if(!baseline){
  const question=model.questions.find(q=>q.id==='residency_or_location');check(variant+'/offered-current-location-optional',question?.required,false);check(variant+'/offered-current-location-context',question?.contextOnly,true);check(variant+'/offered-current-no-location-gate',model.missingInputIds.includes('residency_or_location'),false);check(variant+'/offered-current-no-location-builder',model.builderQuestions.some(q=>q.id==='residency_or_location'),false);
 }
 rows.push({variant,answers,savedAnswers,fact,resolution,authoritative,record,actualModel:model,exactRouteModelOffered:model?.pathwayId===route});
}
const siblings=Object.fromEntries(profile.pathways.filter(p=>p.id!==route).map(p=>[p.id,P.packetCollectionFor({jurisdiction:'MN',pathwayId:p.id,requiredInputIds:packetPlanForPathway(profile,p.id)?.requiredInputIds??[],serverFacts:{jurisdiction:'MN',pathway_id:p.id},screeningAnswers:original,prefilledAnswers:{},savedAnswers:{}})]));
if(!baseline){
 check('exact-five-sibling-identities',Object.keys(siblings),Object.keys(frozenBefore.siblings));
 for(const [id,expected]of Object.entries(frozenBefore.siblings))check('independent-frozen-sibling-'+id,comparisonHash(siblings[id]),expected);
 check('independent-frozen-source-plan',comparisonHash(plan),frozenBefore.plan);
 for(const row of rows)check(row.variant+'/independent-frozen-court',comparisonHash(row.resolution.facts.find(f=>f.factId==='court')),frozenBefore.court[row.variant]);
 const sourceTrack=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MN.memo.json','utf8')).tracks.find(t=>t.trackId==='mn_299c11_arrest_demand');
 check('source-agency-demand-not-court-filing',sourceTrack.rules.filing,'There is no court filing. The participant mails a signed written demand to each custodian that may hold the record.');
 check('source-no-venue',sourceTrack.geography.venue,"No court. The demand goes to each records custodian that may hold the participant's data.");
 check('source-no-location-input',sourceTrack.participantInputs.some(i=>['residency_or_location','county','court'].includes(i.key)),false);
 // Optional author comparison retains complete independent raw equality.
 if(process.env.RCAP_MN299C11_LOCATION_BASELINE){
  const before=JSON.parse(fs.readFileSync(process.env.RCAP_MN299C11_LOCATION_BASELINE,'utf8'));assert(before.mode==='baseline');check('all-five-sibling-collections-raw-equal',siblings,before.siblings);check('source-plan-byte-meaning-unchanged',plan,before.plan);
  for(const [index,row]of rows.entries())check(row.variant+'/independent-court-consumer-unchanged',row.resolution.facts.find(f=>f.factId==='court'),before.rows[index].resolution.facts.find(f=>f.factId==='court'));
 }
 const H=await load('src/lib/expungement-ai/mn-299c11-location-context.ts');check('exact-source-guard',H.mn299c11LocationIsContext(profile,route,null),true);
 for(const [name,p,r,s,current]of [['wrong-state',{...profile,jurisdiction:{...profile.jurisdiction,code:'MO'}},route,null,{}],['profile-drift',{...profile,profileVersion:'changed'},route,null,{}],['source-drift',{...profile,source:{...profile.source,sourceCorpusSha256:'0'.repeat(64)}},route,null,{}],['route',profile,profile.pathways[1].id,null,{}],['specification',profile,route,{},{}],['memo',profile,route,null,{memo:{}}],['proof',profile,route,null,{proof:{}}],['family',profile,route,null,{family:{}}]])check('guard-denies-'+name,H.mn299c11LocationIsContext(p,r,s,current),false);
 const q={id:'residency_or_location',stage:'packet_information',prompt:'What city or location belongs with this matter?',type:'text_or_unknown',options:null,required:true,contextOnly:false,lifecyclePhase:'postpay_packet_field'};
 check('descriptor-exact-only',H.mn299c11LocationContextQuestion(q,profile,route,null),{...q,required:false,contextOnly:true,lifecyclePhase:'guidance_only'});
 for(const sibling of profile.pathways.filter(p=>p.id!==route))check('sibling-descriptor-unchanged-'+sibling.id,H.mn299c11LocationContextQuestion(q,profile,sibling.id,null),q);
 for(const changed of [{...q,id:'court'},{...q,prompt:'Which filing county?'},{...q,type:'single_choice'}])check('different-purpose-unchanged-'+changed.id+'-'+changed.type,H.mn299c11LocationContextQuestion(changed,profile,route,null),changed);
 for(const override of [{needsHumanClassification:['residency_or_location']},{classes:{residency_or_location:'render_required'}}]){
  const result=resolvePacketCollection({jurisdiction:'MN',pathwayId:route,requiredInputIds:['residency_or_location'],serverFacts:{},screeningAnswers:{},prefilledAnswers:{},savedAnswers:{},questionById:new Map([[q.id,q]]),specification:null,override});check('explicit-other-requirement-preserved-'+JSON.stringify(override),result.facts[0].source==='mn_299c11_location_retained_context',false);
 }
}
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
let stored,sourceAnswers,owner='synthetic-mn-owner';const item={id:'synthetic-mn299c11-location',jurisdiction:'MN',artifactRefs:{}};
const present=()=>decorate({consumerAuthUserId:'synthetic-mn-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__mnLocationTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-mn-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__mnLocationTransport.'+b+'(...args);').join('\n'));};
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
 check(row.variant+'/GET-current-builder-IDs',body.questions?.map(q=>q.id),row.actualModel.builderQuestions.map(q=>q.id));
 const tree=await Edit({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({})}),builders=nodes(tree).filter(n=>n.type?.name==='PacketInformationBuilder'),builderIds=builders.flatMap(n=>n.props.questions.map(q=>q.id));
 check(row.variant+'/no-page-builder-on-this-held-nonfiling-route',builderIds,[]);
 const pages=[];for(const locale of ['en','es']){const markup=html(tree,locale);check(row.variant+'/'+locale+'/no-offered-location-control',markup.includes('data-packet-question="residency_or_location"')||markup.includes('value="residency_or_location"'),false);pages.push({locale,markup});}
 surfaces.push({variant:row.variant,getStatus:get.status,body,builderIds,pages});check(row.variant+'/GET-keeps-exact-record',stored,before);
 const response=await post({}),receipt=await response.json();check(row.variant+'/actual-noop-status',response.status,200);check(row.variant+'/actual-strict-noop-receipt',isPacketSaveReceipt(receipt),true);check(row.variant+'/noop-raw-history-unchanged',stored,before);check(row.variant+'/no-verification-authority',receipt.readyToGenerate,false);for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.variant+'/commerce-'+key,receipt.commercialActions?.[key],false);
 const wrongBefore=structuredClone(stored);owner='wrong-owner';const wrong=await post({});owner='synthetic-mn-owner';check(row.variant+'/wrong-owner-denied',wrong.status,404);check(row.variant+'/wrong-owner-atomic',stored,wrongBefore);
 const model=P.protectedPacketInformationModelFor(stored);check(row.variant+'/resume-stays-unsafe',model.reviewSafety.safe,false);check(row.variant+'/resume-preserves-raw-history',stored,before);
 {
  // Existing handler permits explicit optional-context persistence. Absence
  // from the ordinary held page does not make its historical raw field immutable.
  const change=await post({residency_or_location:'Explicit saved context'}),receipt=await change.json();
  check(row.variant+'/explicit-context-save200',change.status,200);check(row.variant+'/explicit-context-strict-receipt',isPacketSaveReceipt(receipt),true);
  check(row.variant+'/explicit-context-raw',stored.draftSnapshot.packetAnswers.residency_or_location,'Explicit saved context');
  check(row.variant+'/explicit-context-screening-unchanged',stored.draftSnapshot.screeningAnswers,before.draftSnapshot.screeningAnswers);
  check(row.variant+'/explicit-context-history-preserved',stored.draftSnapshot.dependencies.semanticAnswerHistory,before.draftSnapshot.dependencies.semanticAnswerHistory);
  check(row.variant+'/explicit-context-payment-closed',stored.draftSnapshot.paymentAllowed,false);check(row.variant+'/explicit-context-no-readiness',receipt.readyToGenerate,false);
  for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.variant+'/explicit-context-commerce-'+key,receipt.commercialActions?.[key],false);
  const changed=structuredClone(stored),again=await post({});check(row.variant+'/post-change-noop200',again.status,200);check(row.variant+'/post-change-noop-preserves-record',stored,changed);
  const reentry=await API.GET(new Request(url),context);check(row.variant+'/post-change-reentry200',reentry.status,200);check(row.variant+'/post-change-reentry-keeps-record',stored,changed);
  const foreign=await post({unowned_foreign_fact:'value'});check(row.variant+'/unknown-foreign-field-denied',foreign.status,422);
  const stale=await API.POST(new Request(url,{method:'POST',body:JSON.stringify({expectedRevision:0,answers:{}})}),context);check(row.variant+'/stale-CAS-denied',stale.status,409);
  const malformed=await API.POST(new Request(url,{method:'POST',body:'{'}),context);check(row.variant+'/malformed-denied',malformed.status,400);check(row.variant+'/denials-atomic',stored,changed);

 }
}

const result={surfaces,mode:baseline?'baseline':'after',originalMember:'GA14 / Q-349904621014116bdccf',plan,rows,siblings,checks,remainingAcceptance:['Actual held page offers no builder on this nonfiling route; protected GET model applicability is measured without opening a new owner workflow.','No authenticated owner, DB/browser, qualification, court-purpose or sibling closure claim.'],failed:checks.filter(c=>!c.pass)};
if(receiptPath)fs.writeFileSync(receiptPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({checks:checks.length,failed:result.failed.map(c=>c.name),exactRouteModels:rows.filter(r=>r.exactRouteModelOffered).length,acceptanceComplete:false}));assert.equal(result.failed.length,0);
