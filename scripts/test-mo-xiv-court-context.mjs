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

const baseline=false,receiptPath=process.env.RCAP_MOXIV_COURT_RECEIPT;
if(receiptPath)assert(!fs.existsSync(receiptPath),'Optional receipt path must be fresh');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {packetPlanForPathway}=await load('src/lib/rcap-engine/packet-planner.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile=getProfileByJurisdiction('MO'),route='marijuana-expungement-under-missouri-constitution-article-xiv';
assert(profile);const plan=packetPlanForPathway(profile,route);assert(plan);
const {contactRepresentationHash:hashJSON}=await load('src/lib/expungement-ai/contact-representation.ts');
const checks=[],rows=[],check=(name,actual,expected)=>checks.push({name,pass:isDeepStrictEqual(actual,expected),actual,expected});
// Exact retained accepted status setup; never substitute its fuller facts
// for original146/B. No route override or new qualifying facts are introduced.
const original={"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "I am not sure", "identity_error": "No", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Marijuana expungement under Missouri Constitution article XIV", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "state_exclusion_categories": ["None of these"], "mo_marijuana_custody_posture": "incarceration_and_supervision_complete", "mo_marijuana_record_is_marijuana": "yes", "mo_marijuana_record_offense": "Possession of marijuana, RSMo 195.202", "mo_marijuana_offense_date": "2010-01-01", "mo_marijuana_record_grade": "misdemeanor", "mo_marijuana_minor_distribution": "no", "mo_marijuana_violence": "no", "mo_marijuana_impaired_driving": "no", "mo_marijuana_commercial_vehicle": "no", "mo_marijuana_record_status": "record_remains"};
const witness={expected:{resultCode:"guidance_only",pathwayId:route}};
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
 if(!baseline)check(variant+'/source-owned-context',fact,{factId:'court',collection:'conditional',phase:'known',group:null,active:false,source:'mo_xiv_court_retained_context',reason:'Generic court text is optional record-location context for this completed-incarceration-and-supervision status check; it does not establish a conditional CR375 filing destination or per-conviction court.'});
 // Preserve the observed original outcome; a route change must fail this test.
 // No requested-route override or qualifying-case inference is used.
 const authoritative=evaluate({jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:'synthetic-moXIV-retained-witness113',answers});
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
  const question=model.questions.find(q=>q.id==='court');check(variant+'/held-safety',model.reviewSafety.safe,false);check(variant+'/held-reason',authoritative.evaluation.reasons.some(r=>r.code==='mo.marijuana_status_check'),true);
  check(variant+'/offered-current-location-optional',question?.required,false);check(variant+'/offered-current-location-context',question?.contextOnly,true);check(variant+'/offered-current-no-location-gate',model.missingInputIds.includes('court'),false);check(variant+'/offered-current-no-location-builder',model.builderQuestions.some(q=>q.id==='court'),false);
 }
 rows.push({variant,answers,savedAnswers,fact,resolution,authoritative,record,actualModel:model,exactRouteModelOffered:model?.pathwayId===route});
}
const siblings=Object.fromEntries(profile.pathways.filter(p=>p.id!==route).map(p=>[p.id,P.packetCollectionFor({jurisdiction:'MO',pathwayId:p.id,requiredInputIds:packetPlanForPathway(profile,p.id)?.requiredInputIds??[],serverFacts:{jurisdiction:'MO',pathway_id:p.id},screeningAnswers:original,prefilledAnswers:{},savedAnswers:{}})]));
const React=requireFromR('react'),{renderToStaticMarkup}=requireFromR('react-dom/server');
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
let stored,sourceAnswers,owner='synthetic-moXIV-owner';const item={id:'synthetic-moXIV-witness113-court',jurisdiction:'MO',artifactRefs:{}};
const present=()=>decorate({consumerAuthUserId:'synthetic-moXIV-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__moXIVCourtTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-moXIV-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__moXIVCourtTransport.'+b+'(...args);').join('\n'));};
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
 check(row.variant+'/exact-offered-status-controls',builderIds,['case_outcome','mo_marijuana_custody_posture','mo_marijuana_record_is_marijuana','mo_marijuana_record_offense','mo_marijuana_offense_date','mo_marijuana_record_grade','mo_marijuana_minor_distribution','mo_marijuana_violence','mo_marijuana_impaired_driving','mo_marijuana_commercial_vehicle','mo_marijuana_record_status']);check(row.variant+'/no-offered-generic-court',builderIds.includes('court'),false);
 const pages=[];for(const locale of ['en','es']){const markup=html(tree,locale);check(row.variant+'/'+locale+'/no-offered-location-control',markup.includes('data-packet-question="court"')||markup.includes('value="court"'),false);pages.push({locale,markup});}
 surfaces.push({variant:row.variant,getStatus:get.status,body,builderIds,pages});check(row.variant+'/GET-keeps-exact-record',stored,before);
 const response=await post({}),receipt=await response.json();httpObservations.push({variant:row.variant,kind:'noop',status:response.status,body:receipt});check(row.variant+'/actual-noop-status',response.status,200);check(row.variant+'/actual-strict-noop-receipt',isPacketSaveReceipt(receipt),true);check(row.variant+'/noop-raw-history-unchanged',stored,before);check(row.variant+'/no-verification-authority',receipt.readyToGenerate,false);for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.variant+'/commerce-'+key,receipt.commercialActions?.[key],false);
 const wrongBefore=structuredClone(stored);owner='wrong-owner';const wrong=await post({});owner='synthetic-moXIV-owner';check(row.variant+'/wrong-owner-denied',wrong.status,404);check(row.variant+'/wrong-owner-atomic',stored,wrongBefore);
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


// Preserve the untouched original negative. Its absent completion/financial
// answers remain absent; the fuller retained witness above cannot repair them.
const originalObservations=[];
const original146={"ownership_scope": "Yes", "jurisdiction_scope": "State or local", "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "offense_level": "Misdemeanor", "possible_pathway_context": "Marijuana expungement under Missouri Constitution article XIV", "prior_relief": "Yes", "identity_error": "Yes", "pending_cases": "Yes", "resolved_timing_bucket": "lt_1_year", "court_requirements_completed": "yes", "state_exclusion_categories": ["Sex offense or registration"]};
for(const [variant,court]of [['known','Earlier case court or agency'],['absent',undefined],['unknown','I am not sure']]){
 const a={...original146};if(court!==undefined)a.court=court;
 const auth=evaluate({jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:item.id,answers:a});
 check('original146/'+variant+'/no-payment',auth.evaluation.paymentAllowed,false);
 check('original146/'+variant+'/held-result',auth.evaluation.resultCode,'needs_more_info');check('original146/'+variant+'/exact-route',auth.evaluation.pathwayId,route);check('original146/'+variant+'/missing-custody',auth.evaluation.missingQuestionIds,['mo_marijuana_custody_posture']);
 originalObservations.push({variant,answers:a,evaluation:auth.evaluation});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:auth,screeningAnswers:a,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
 stored={status:'unverified',reason:'synthetic-original-negative',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};sourceAnswers=a;const old=structuredClone(stored);
 const g=await API.GET(new Request(url),context);check('original146/'+variant+'/GET200',g.status,200);
 for(const answers of [{},{court:'Explicit text'}]){const res=await post(answers);originalObservations.at(-1).posts??=[];originalObservations.at(-1).posts.push({answers,status:res.status,body:await res.json()});check('original146/'+variant+'/existing-handler-boundary/'+Object.keys(answers).join(','),res.status,Object.keys(answers).length?422:200);check('original146/'+variant+'/raw-unchanged',stored,old);}
}



// Freeze full prechange sibling collections and current plan from the retained
// natural diagnostic. These are predecessor values, not current substitutions.
const expectedSiblingHashes={"general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140":"17c8a9b8ac48c77826923625144cf29ae273e4e07e5c2728f5e7d9239ebcaeca","closed-record-outcome-under-rsmo-610-105":"f91a9ebe189e0fdbb3acde5139f6c4fa73d8563125f567500860d76c4236913f","false-information-or-qualifying-arrest-record-expungement-under-610-122-123":"9fab6e940d078b94a39be5a124db05f3f75f10f30b3c702d4788dd6c645fd763","first-intoxication-related-traffic-or-boating-expungement-under-610-130":"bcf20c3a3437a4957f71c9a5c93c1f35c6216852956c05e96b824a952341db9e","stolen-or-mistaken-identity-expungement-under-610-145":"bcaee4ce2c19980507d92df211a3e19e00e5b9c755cdb3f2999cb6c1fc70b73d","first-minor-in-possession-alcohol-expungement-under-311-326":"40a29e63a0ec04e26c8d52cc239b9a73efc62bd0a1e530609c863de094a13bcf","state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141":"3ae309838b1579e609fd950ec2a7049bb83b4e06da8a6ef6ec3baba475369503"};
for(const [id,expected]of Object.entries(expectedSiblingHashes))check('unrelated-full-sibling/'+id,hashJSON(moR1CategoryPredecessor(a9e4ContactPredecessor(siblings[id],id),id)),expected);
{const id='closed-record-outcome-under-rsmo-610-105';for(const [key,refused]of moR1CategoryDriftRefusals(siblings[id],id))check('r1-category-history-refuses-'+key,refused,true);}
{const carrier=Object.values(siblings).find(c=>c.facts.some(f=>f.factId==='contact_information'));for(const [key,refused]of a9e4DiagnosticDriftRefusals(carrier))check('a9e4-contact-diagnostic-refuses-'+key,refused,true);}
check('unchanged-plan',hashJSON(plan),'9b4fd0668c728dcf72608ec2d14bf3ba4d71cf8b2fa19d9557db4fa1c474cc00');
const H=await load('src/lib/expungement-ai/mo-xiv-court-context.ts');
const custody='mo_marijuana_custody_posture',complete='incarceration_and_supervision_complete';
check('exact-completed-status-source',H.moXivCourtIsContext(profile,route,null,complete),true);
for(const value of ['', 'unknown','incarcerated','probation_or_parole','different'])check('no-other-custody-context/'+value,H.moXivCourtIsContext(profile,route,null,value),false);
for(const key of ['memo','proof','family','fieldMap','wiring','sourceReceipt'])check('source-drift/'+key,H.moXivCourtIsContext(profile,route,null,complete,{[key]:{}}),false);
for(const[label,p,r,s]of [['profile',{...profile,profileVersion:'changed'},route,null],['source',{...profile,source:{...profile.source,sourceCorpusSha256:'0'.repeat(64)}},route,null],['wrong-state',{...profile,jurisdiction:{...profile.jurisdiction,code:'MN'}},route,null],['wrong-route',profile,'closed-record-outcome-under-rsmo-610-105',null],['mapped-spec',profile,route,{}]])check('guard-refuses/'+label,H.moXivCourtIsContext(p,r,s,complete),false);
const q={id:'court',stage:'case_details',prompt:'Which court or agency handled the case?',type:'text',options:null,required:true,contextOnly:false,lifecyclePhase:'postpay_official_form_field',translations:{es:{prompt:'¿Qué tribunal o agencia manejó el caso?'}}};
check('context-keeps-exact-prompt-and-translation',H.moXivCourtContextQuestion(q,true),{...q,required:false,contextOnly:true,lifecyclePhase:'guidance_only'});
for(const change of [{...q,id:'filing_county'},{...q,prompt:'County where charged or found guilty'},{...q,type:'single_choice'},{...q,stage:'screening'}])check('no-alias/'+JSON.stringify(change),H.moXivCourtContextQuestion(change,true),change);
const common={jurisdiction:'MO',pathwayId:route,requiredInputIds:plan.requiredInputIds,serverFacts:{jurisdiction:'MO',pathway_id:route},screeningAnswers:original,prefilledAnswers:{},savedAnswers:{},questionById:new Map([[custody,{id:custody,type:'single_choice',options:['incarcerated','probation_or_parole',complete,'unknown']}],['court',q]]),specification:null};
for(const [label,patch]of [['saved-empty',{savedAnswers:{[custody]:''}}],['saved-unknown',{savedAnswers:{[custody]:'unknown'}}],['saved-wrapper-unknown',{savedAnswers:{[custody]:{value:complete,unknown:true}}}],['saved-null',{savedAnswers:{[custody]:null}}],['saved-incarcerated',{savedAnswers:{[custody]:'incarcerated'}}],['saved-supervision',{savedAnswers:{[custody]:'probation_or_parole'}}],['saved-conflict',{savedAnswers:{[custody]:[complete,'incarcerated']}}],['unresolved-saved',{savedAnswers:{[custody]:complete},unresolvedSavedFactIds:new Set([custody])}],['human-review',{override:{routeKey:'MO:'+route,note:'explicit',needsHumanClassification:['court']}}],['explicit-class',{override:{routeKey:'MO:'+route,note:'explicit',classes:{court:'render_required'}}}]]){
 const resolution=resolvePacketCollection({...common,...patch}),court=resolution.facts.find(f=>f.factId==='court');
 check('no-old-completed-fallback/'+label,court.source==='mo_xiv_court_retained_context',false);
 check('guard-read-only/'+label,original,rows[0].answers);
}
// Deliberately inconsistent synthetic envelopes keep the predecessor null-model
// refusal. Exact preserved-preimage measurement denied all five cases. The direct
// resolver controls above independently test cleared/unknown/unresolved precedence.
for(const value of ['','unknown',{value:complete,unknown:true},'incarcerated','probation_or_parole']){
 const old=structuredClone(rows[0].record);old.draftSnapshot.packetAnswers[custody]=value;old.draftHash=P.protectedPacketDraftHash(old.draftSnapshot);const before=structuredClone(old),model=P.protectedPacketInformationModelFor(old);
 check('changed-custody-inconsistent-envelope-denied/'+JSON.stringify(value),model,null);
 if(model)check('changed-custody-no-context/'+JSON.stringify(value),model.questions.find(q=>q.id==='court')?.contextOnly===true,false);
 check('changed-custody-raw-unchanged/'+JSON.stringify(value),old,before);
}
const memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MO.memo.json','utf8')),track=memo.tracks.find(t=>t.trackId==='mo-art-xiv-marijuana');
check('genuine-conditional-petition-purpose-retained',JSON.stringify(track).includes('county where the conviction was charged or the finding of guilt entered'),true);
const fm=JSON.parse(fs.readFileSync('data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/production-field-map.json','utf8'));
check('no-generic-court-source-alias',fm.writes.some(w=>w.factId==='court'),false);
for(const id of ['case.filing_county','case.judicial_circuit','case.circuit_court_division'])check('distinct-petition-field/'+id,fm.writes.some(w=>w.factId===id),true);

const result={originalObservations,httpObservations,surfaces,mode:'source-correction-current-regression',originalMember:'GA14 / Q-f57ac5d91f3085beddd1; original146/B separately from exact retained accepted status setup',plan,rows,siblings,checks,remainingAcceptance:['Actual held page preserves eleven existing status/custody/case-outcome controls and offers no generic court editor; no new owner workflow is opened.','No authenticated owner, DB/browser, qualification, court-purpose or sibling closure claim.'],failed:checks.filter(c=>!c.pass)};
if(receiptPath)fs.writeFileSync(receiptPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({checks:checks.length,failed:result.failed.map(c=>c.name),exactRouteModels:rows.filter(r=>r.exactRouteModelOffered).length,acceptanceComplete:false}));assert.equal(result.failed.length,0);
