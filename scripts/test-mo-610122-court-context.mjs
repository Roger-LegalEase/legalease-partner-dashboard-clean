import assert from 'node:assert/strict';
import {a9e4ContactPredecessor,a9e4DiagnosticDriftRefusals} from './lib/a9e4-contact-diagnostic.mjs';
import {moR1CategoryPredecessor,moR1CategoryDriftRefusals} from './lib/mo-r1-category-history.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {register,createRequire} from 'node:module';
const requireFromR=createRequire(import.meta.url);
const ts=requireFromR('typescript');
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const root=process.cwd(),file=p=>path.join(root,p),load=p=>import(pathToFileURL(file(p)).href);
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#binding-'+Buffer.from(name).toString('hex'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {LocalizationContext}=await import(pathToFileURL(loc).href);

const baseline=false,receiptPath=process.env.RCAP_MO122_COURT_RECEIPT;
if(receiptPath)assert(!fs.existsSync(receiptPath),'Optional receipt path must be fresh');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {packetPlanForPathway}=await load('src/lib/rcap-engine/packet-planner.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile=getProfileByJurisdiction('MO'),route='false-information-or-qualifying-arrest-record-expungement-under-610-122-123';
assert(profile);const plan=packetPlanForPathway(profile,route);assert(plan);
const {contactRepresentationHash:hashJSON}=await load('src/lib/expungement-ai/contact-representation.ts');
const checks=[],rows=[],check=(name,actual,expected)=>checks.push({name,pass:isDeepStrictEqual(actual,expected),actual,expected});
// Separately retained existing witness113; never substitute its fuller facts
// for original144/B. No route override or new qualifying facts are introduced.
const witnessPath=file('data/rcap-ledger/public-witness-fixtures.json'),witness=JSON.parse(fs.readFileSync(witnessPath,'utf8')).fixtures[113];assert.equal(witness.pathwayKey,'MO:'+route);assert.equal(witness.expected.resultCode,'guidance_only');assert.equal(witness.expected.pathwayId,route);assert.equal(hashJSON(witness.answers),'e5c20486504b2c9d2ac128bd3cdcd200b893f0aec684cc3843f5ce06eeab31fc');const original=witness.answers;
// Direct collection calls reproduce the original exact source-consumer contract.
// They do not claim an offered current owner model or select a route by label.
for(const [variant,value]of [['known','Earlier case court or agency'],['absent',undefined],['unknown','I am not sure']]){
 const answers={...original},savedAnswers=value===undefined?{}:{court:value};
 const before=structuredClone({answers,savedAnswers}),resolution=P.packetCollectionFor({jurisdiction:'MO',pathwayId:route,requiredInputIds:plan.requiredInputIds,serverFacts:{jurisdiction:'MO',pathway_id:route},screeningAnswers:answers,prefilledAnswers:{},savedAnswers});
 assert(resolution);const fact=resolution.facts.find(f=>f.factId==='court');assert(fact);
 check(variant+'/raw-answers-unchanged',{answers,savedAnswers},before);
 check(variant+'/plan-retained',packetPlanForPathway(profile,route),plan);
 check(variant+'/null-spec',packetSpecificationFor('MO:'+route),undefined);
 check(variant+'/inactive-location',fact.active===false,!baseline);
 if(!baseline)check(variant+'/source-owned-context',fact,{factId:'court',collection:'conditional',phase:'known',group:null,active:false,source:'mo_610122_court_retained_context',reason:'Generic historical court text is optional retained context in this held, unmapped consumer; it does not establish the county-of-arrest civil-division filing destination or distinct source-form court fields.'});
 // Preserve the observed original outcome; a route change must fail this test.
 // No requested-route override or qualifying-case inference is used.
 const authoritative=evaluate({jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:'synthetic-mo122-retained-witness113',answers});
 check(variant+'/retained-witness-natural-outcome',authoritative.evaluation.resultCode,witness.expected.resultCode);check(variant+'/retained-witness-natural-pathway',authoritative.evaluation.pathwayId,witness.expected.pathwayId);check(variant+'/original-payment-closed',authoritative.evaluation.paymentAllowed,false);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
 if(value!==undefined){
  seed.snapshot.packetAnswers.court=value;
  seed.snapshot.dependencies.semanticAnswerHistory=[{factId:'court',value,source:'packetAnswers',meaning:'prior_answer_for_shape_clarification',routeKey:'MO:'+route,profileVersion:seed.snapshot.profileVersion,profileSourceFingerprint:seed.snapshot.profileSourceFingerprint,profileAuthorityFingerprint:seed.snapshot.profileAuthorityFingerprint}];
 }
 const record={status:'unverified',reason:'source-synthetic-not-authenticated-owner',revision:0,draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot};
 const recordBefore=structuredClone(record),model=P.protectedPacketInformationModelFor(record);
 check(variant+'/read-preserves-raw-history',record,recordBefore);

 if(!baseline){
  const question=model.questions.find(q=>q.id==='court');check(variant+'/held-safety',model.reviewSafety.safe,false);check(variant+'/held-reason',authoritative.evaluation.reasons.some(r=>r.code==='mo.lawrence_hold_guidance_only'),true);
  check(variant+'/offered-current-location-optional',question?.required,false);check(variant+'/offered-current-location-context',question?.contextOnly,true);check(variant+'/offered-current-no-location-gate',model.missingInputIds.includes('court'),false);check(variant+'/offered-current-no-location-builder',model.builderQuestions.some(q=>q.id==='court'),false);
 }
 rows.push({variant,answers,savedAnswers,fact,resolution,authoritative,record,actualModel:model,exactRouteModelOffered:model?.pathwayId===route});
}
const siblings=Object.fromEntries(profile.pathways.filter(p=>p.id!==route).map(p=>[p.id,P.packetCollectionFor({jurisdiction:'MO',pathwayId:p.id,requiredInputIds:packetPlanForPathway(profile,p.id)?.requiredInputIds??[],serverFacts:{jurisdiction:'MO',pathway_id:p.id},screeningAnswers:original,prefilledAnswers:{},savedAnswers:{}})]));
const React=requireFromR('react'),{renderToStaticMarkup}=requireFromR('react-dom/server');
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
let stored,sourceAnswers,owner='synthetic-mo122-owner';const item={id:'synthetic-mo122-witness113-court',jurisdiction:'MO',artifactRefs:{}};
const present=()=>decorate({consumerAuthUserId:'synthetic-mo122-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__mo122CourtTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-mo122-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__mo122CourtTransport.'+b+'(...args);').join('\n'));};
const pageFile=file('src/app/briefcase/[packetId]/packet-information/page.tsx');let pageSource=fs.readFileSync(pageFile,'utf8');pageSource=pageSource.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');pageSource=pageSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])pageSource=substitute(pageSource,[b],'@/lib/expungement-ai/'+m);compile(pageFile,pageSource);const Edit=(await import(pathToFileURL(pageFile).href)).default;
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let apiSource=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])apiSource=substitute(apiSource,b,m);compile(apiFile,apiSource);const API=await import(pathToFileURL(apiFile).href);
const context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information',post=(answers,extra={})=>API.POST(new Request(url,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const {isPacketSaveReceipt}=await load('src/lib/expungement-ai/packet-save-contract.ts');
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};
const surfaces=[],httpObservations=[];
for(const row of rows){
 stored=structuredClone(row.record);sourceAnswers=row.answers;const before=structuredClone(stored),get=await API.GET(new Request(url),context),body=await get.json();check(row.variant+'/actual-GET200',get.status,200);
 check(row.variant+'/GET-current-builder-IDs',body.questions?.map(q=>q.id),row.actualModel?.builderQuestions?.map(q=>q.id));
 const tree=await Edit({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({})}),builders=nodes(tree).filter(n=>n.type?.name==='PacketInformationBuilder'),builderIds=builders.flatMap(n=>n.props.questions.map(q=>q.id));
 check(row.variant+'/no-page-builder-on-this-held-unmapped-route',builderIds,[]);
 const pages=[];for(const locale of ['en','es']){const markup=html(tree,locale);check(row.variant+'/'+locale+'/no-offered-location-control',markup.includes('data-packet-question="court"')||markup.includes('value="court"'),false);pages.push({locale,markup});}
 surfaces.push({variant:row.variant,getStatus:get.status,body,builderIds,pages});check(row.variant+'/GET-keeps-exact-record',stored,before);
 const response=await post({}),receipt=await response.json();httpObservations.push({variant:row.variant,kind:'noop',status:response.status,body:receipt});check(row.variant+'/actual-noop-status',response.status,200);check(row.variant+'/actual-strict-noop-receipt',isPacketSaveReceipt(receipt),true);check(row.variant+'/noop-raw-history-unchanged',stored,before);check(row.variant+'/no-verification-authority',receipt.readyToGenerate,false);for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.variant+'/commerce-'+key,receipt.commercialActions?.[key],false);
 const wrongBefore=structuredClone(stored);owner='wrong-owner';const wrong=await post({});owner='synthetic-mo122-owner';check(row.variant+'/wrong-owner-denied',wrong.status,404);check(row.variant+'/wrong-owner-atomic',stored,wrongBefore);
 const model=P.protectedPacketInformationModelFor(stored);check(row.variant+'/resume-stays-unsafe',model?.reviewSafety?.safe,false);check(row.variant+'/resume-preserves-raw-history',stored,before);
 {
  // Existing handler permits explicit optional-context persistence. Absence
  // from the ordinary held page does not make its historical raw field immutable.
  const change=await post({court:'Explicit saved context'}),receipt=await change.json();httpObservations.push({variant:row.variant,kind:'explicit-court-context',status:change.status,body:receipt});
  check(row.variant+'/explicit-context-save200',change.status,200);check(row.variant+'/explicit-context-strict-receipt',isPacketSaveReceipt(receipt),true);
  check(row.variant+'/explicit-context-raw',stored.draftSnapshot.packetAnswers.court,'Explicit saved context');
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


// Frozen predecessor full sibling collections and plan. No current-output substitution.
const expectedSiblingHashes={"general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140":"20230d880d04eb03d424c584688b7c68103fa55353d8d49b735c8c2bc1b45d98","closed-record-outcome-under-rsmo-610-105":"61f85ac41aec88c9b81379631b7caca1291b09862610c11d9ac8cc6b2537546a","first-intoxication-related-traffic-or-boating-expungement-under-610-130":"5c6b9f6ab8c475344ea348b0257fec30dc6565663c0bf66f4f4b270f55e60f40","marijuana-expungement-under-missouri-constitution-article-xiv":"0a6389943c84c133b9047a9fbd9da16da67b21ed89e0d8821fcc231013581de1","stolen-or-mistaken-identity-expungement-under-610-145":"56452e2a80549bb267bce1d0e1aa4d8135bc51de28183d9f0bdea1381e79c294","first-minor-in-possession-alcohol-expungement-under-311-326":"bd9239b289f333b5e4976a74bcebcf53b3e7c87b8cb500dc23b57d8170c14d0b","state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141":"3ae309838b1579e609fd950ec2a7049bb83b4e06da8a6ef6ec3baba475369503"};
for(const [id,expected]of Object.entries(expectedSiblingHashes))check('unrelated-sibling-full-collection/'+id,hashJSON(moR1CategoryPredecessor(a9e4ContactPredecessor(siblings[id],id),id)),expected);
{const id='closed-record-outcome-under-rsmo-610-105';for(const [key,refused]of moR1CategoryDriftRefusals(siblings[id],id))check('r1-category-history-refuses-'+key,refused,true);}
{const carrier=Object.values(siblings).find(c=>c.facts.some(f=>f.factId==='contact_information'));for(const [key,refused]of a9e4DiagnosticDriftRefusals(carrier))check('a9e4-contact-diagnostic-refuses-'+key,refused,true);}
check('source-plan-unchanged',hashJSON(plan),'914aeac3255eaecd6c9b35b74f5c73714d7793891cfee3572eb79c3f7adf095d');
const H=await load('src/lib/expungement-ai/mo-610122-court-context.ts');
check('exact-held-unmapped-source-guard',H.mo610122CourtIsContext(profile,route,null),true);
for(const key of ['memo','sourceReceipt','fieldMap','wiring','ratification'])check('refuse-source-drift/'+key,H.mo610122CourtIsContext(profile,route,null,{[key]:{}}),false);
for(const [label,p,r,s]of [['wrong-jurisdiction',{...profile,jurisdiction:{...profile.jurisdiction,code:'MN'}},route,null],['profile-drift',{...profile,profileVersion:'changed'},route,null],['route-drift',profile,'closed-record-outcome-under-rsmo-610-105',null],['new-mapped-spec',profile,route,{}]])check('refuse-'+label,H.mo610122CourtIsContext(p,r,s),false);
const q={id:'court',stage:'case_details',prompt:'Which court or agency handled the case?',type:'text',options:null,required:true,contextOnly:false,lifecyclePhase:'postpay_official_form_field',translations:{es:{prompt:'¿Qué tribunal o agencia manejó el caso?'}}};
for(const changed of [{...q,id:'arrest_county'},{...q,prompt:'Civil division in the county of arrest'},{...q,type:'single_choice'},{...q,stage:'screening'}])check('no-court-purpose-alias/'+changed.id+'/'+changed.prompt+'/'+changed.type+'/'+changed.stage,H.mo610122CourtContextQuestion(changed,profile,route,null),changed);
for(const override of [{needsHumanClassification:['court']},{classes:{court:'required'}}]){
 const x=resolvePacketCollection({jurisdiction:'MO',pathwayId:route,requiredInputIds:['court'],serverFacts:{},screeningAnswers:{},prefilledAnswers:{},savedAnswers:{},questionById:new Map([['court',q]]),specification:null,override});
 check('explicit-human-or-override-preserved/'+JSON.stringify(override),x.facts[0]?.source==='mo_610122_court_retained_context',false);
}
// Preserve the untouched original negative. Its absent completion/financial
// answers remain absent; the fuller retained witness above cannot repair them.
const original144={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'False-information or qualifying arrest-record expungement under §§ 610.122–.123',prior_relief:'Yes',identity_error:'Yes',pending_cases:'No',resolved_timing_bucket:'gt_10_years',court_requirements_completed:'yes',state_exclusion_categories:['None of these']};
for(const [variant,court]of [['known','Earlier case court or agency'],['absent',undefined],['unknown','I am not sure']]){
 const a={...original144};if(court!==undefined)a.court=court;
 const auth=evaluate({jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:item.id,answers:a});
 check('original144/'+variant+'/held',auth.evaluation.resultCode,'needs_more_info');check('original144/'+variant+'/no-route',auth.evaluation.pathwayId??null,null);check('original144/'+variant+'/no-payment',auth.evaluation.paymentAllowed,false);
 check('original144/'+variant+'/missing-facts',auth.evaluation.missingQuestionIds,['sentence_completion_date','financial_obligations']);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:auth,screeningAnswers:a,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
 stored={status:'unverified',reason:'synthetic-original-negative',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};sourceAnswers=a;const old=structuredClone(stored);
 const g=await API.GET(new Request(url),context);check('original144/'+variant+'/GET200',g.status,200);
 for(const answers of [{},{court:'Explicit text'}]){const res=await post(answers);check('original144/'+variant+'/held-refusal',res.status,403);check('original144/'+variant+'/raw-unchanged',stored,old);}
}


const sourceRoot='data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/';
const map=JSON.parse(fs.readFileSync(sourceRoot+'production-field-map.json','utf8'));
const memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MO.memo.json','utf8'));
const track=memo.tracks.find(t=>t.trackId==='mo-610-122-arrest-expungement');
check('retained-real-filing-purpose',JSON.stringify(track).includes('civil division of the circuit court in the county of arrest'),true);
check('no-installed-generic-court-alias',map.writes.some(w=>w.factId==='court'),false);
for(const id of ['canonical.facts.Circuit','canonical.facts.County','canonical.facts.County where Petitioner was arrested','canonical.respondents.circuit','boundary.respondents.municipal','canonical.caption.Court county and civil division'])check('distinct-source-destination/'+id,map.writes.some(w=>w.factId===id),true);

const result={httpObservations,surfaces,mode:baseline?'baseline':'after',originalMember:'GA14 / Q-09aa40a73d4a52efba7c; separately retained witness113, never original144/B',plan,rows,siblings,checks,remainingAcceptance:['Actual held page offers no builder for this unmapped filing contract; protected GET model applicability is measured without opening a new owner workflow.','No authenticated owner, DB/browser, qualification, court-purpose or sibling closure claim.'],failed:checks.filter(c=>!c.pass)};
if(receiptPath)fs.writeFileSync(receiptPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({checks:checks.length,failed:result.failed.map(c=>c.name),exactRouteModels:rows.filter(r=>r.exactRouteModelOffered).length,acceptanceComplete:false}));assert.equal(result.failed.length,0);
