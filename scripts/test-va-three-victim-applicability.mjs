import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import path from 'node:path';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY='2026-10-16';
const root=process.cwd(),file=p=>root+'/'+p,load=p=>import(pathToFileURL(file(p)).href);
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {LocalizationContext}=await import(pathToFileURL(loc).href);

const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {packetFulfillmentAuthority}=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {saveScreeningSession,loadScreeningSession}=await import('../src/lib/expungement-ai/screening-session-persistence.ts');
const profile=getProfileByJurisdiction('VA'),pub=projectPublicProfile(profile),checks=[],rows=[];
const check=(name,actual,expected)=>checks.push({name,pass:JSON.stringify(actual)===JSON.stringify(expected),actual,expected});
const witnesses=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.filter(x=>x.jurisdiction==='VA');
const seeds=[];
for(const pathway of profile.pathways){
 const retained=witnesses.find(w=>w.pathwayId===pathway.id);
 const base=structuredClone(retained?.finalAnswers??{...witnesses[0].finalAnswers,possible_pathway_context:pathway.label,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',identity_error:'No'});
 const run=answers=>evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-va-victim-scope',answers});
 const expected=run({...base,trafficking_status:'No'}).evaluation;
 for(const [variant,value]of [['yes','Yes'],['no','No'],['unknown','I am not sure'],['declined','Prefer not to say'],['absent',undefined]]){
  const answers={...base};if(value===undefined)delete answers.trafficking_status;else answers.trafficking_status=value;
  const before=structuredClone(answers),authoritative=run(answers),result=authoritative.evaluation,ids=selectScreeningQuestionIds(profile,pub,answers);
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
  const record=seed?{status:'unverified',reason:'synthetic-current-source-not-authenticated-owner',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot}:null;
  const model=record?P.protectedPacketInformationModelFor(record):null;
  rows.push({originalMember:'VA:'+pathway.id+'#trafficking_status',variant,input:answers,result,selectedIds:ids,record,model:model?{pathwayId:model.pathwayId,resultCode:model.resultCode,missing:model.missingInputIds,questions:model.questions.map(q=>({id:q.id,required:q.required,contextOnly:q.contextOnly})),builder:model.builderQuestions.map(q=>({id:q.id,required:q.required,contextOnly:q.contextOnly})),correctionIds:[...P.heldPacketCorrectionInputIds(model,model.resultCode)]}:null,fixtureQualification:retained?'Unchanged retained synthetic witness premise; not complete statutory qualification':'Synthetic nonconviction premise for missing automatic witness; not source-qualified route case'});
  check(pathway.id+'/'+variant+'/result-invariance',result,expected);
  check(pathway.id+'/'+variant+'/no-victim-screen',ids.includes('trafficking_status'),false);
  check(pathway.id+'/'+variant+'/raw-preserved',answers,before);
  check(pathway.id+'/'+variant+'/no-victim-packet-gate',Boolean(model?.missingInputIds.includes('trafficking_status')),false);
  check(pathway.id+'/'+variant+'/no-required-victim-builder',Boolean(model?.builderQuestions.some(q=>q.id==='trafficking_status'&&q.required)),false);
  if(pathway.automatic)check(pathway.id+'/'+variant+'/automatic-nonpayable',result.paymentAllowed,false);
  for(const surface of ['checkout creation','consumer payment authority','sponsored entitlement','packet generation','packet credit consumption','participant delivery'])check(pathway.id+'/'+variant+'/'+surface,packetFulfillmentAuthority('VA',pathway.id,surface,{trackId:null}).allowed,false);
  if(record)seeds.push({pathway,base,variant,record});
 }
}
const q=pub.questions.find(q=>q.id==='trafficking_status');
check('public-victim-descriptor-optional',q?.required,false);
check('public-victim-descriptor-retained-context-only',q?.contextOnly,true);
// Existing ordinary persistence contract, using an isolated memory adapter.
let saved;const storage={async saveSession(input){saved={...structuredClone(input),sessionId:'synthetic-va-victim-session',createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z'};return saved;},async loadSession(){return structuredClone(saved);}};
for(const raw of ['Yes','No','I am not sure','Prefer not to say',{value:'Yes',unknown:true}]){await saveScreeningSession(storage,{jurisdiction:'VA',answers:{trafficking_status:raw}});const resumed=await loadScreeningSession(storage,'synthetic-va-victim-session');check('ordinary-save-load-retains-raw-'+JSON.stringify(raw),resumed.answers.trafficking_status,raw);}
const {sanitizeAnswersForQuestionIds,sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
for(const raw of ['Yes','No','I am not sure','Prefer not to say',{value:'Yes',unknown:true}]){
 const answers={trafficking_status:raw,offense_level:'Misdemeanor'};
 check('actual-dirty-plan-keeps-raw-'+JSON.stringify(raw),sanitizeAnswersForQuestionIds(answers,['trafficking_status'],[],pub).trafficking_status,raw);
 check('actual-resume-keeps-raw-'+JSON.stringify(raw),sanitizeResumedAnswersForQuestionIds(pub,answers,[]).trafficking_status,raw);
}
const H=await import('../src/lib/rcap-engine/virginia-victim-question.ts');
check('exact-source-guard',H.virginiaVictimQuestionContract(profile),true);
check('exact-three-original-pathways-only',profile.pathways.map(p=>p.id),H.VA_VICTIM_CONTEXT_ROUTES);
for(const [label,p,route,current]of [
 ['wrong-state',{...profile,jurisdiction:{...profile.jurisdiction,code:'FL'}},profile.pathways[0].id,{}],
 ['wrong-route',profile,'unreviewed-victim-route',{}],
 ['profile-version',{...profile,profileVersion:'changed'},profile.pathways[0].id,{}],
 ['source-corpus',{...profile,source:{...profile.source,sourceCorpusSha256:'0'.repeat(64)}},profile.pathways[0].id,{}],
 ['question-meaning',{...profile,questions:profile.questions.map(q=>q.id==='trafficking_status'?{...q,prompt:'Different victim fact'}:q)},profile.pathways[0].id,{}],
 ['memo',profile,profile.pathways[0].id,{memo:{}}],
 ['regime1-spec',profile,profile.pathways[0].id,{specification:null}],
 ['automatic-new-spec',profile,profile.pathways[1].id,{specification:{requiredFacts:[{factId:'trafficking_status'}]}}]
])check('exact-guard-refuses-'+label,H.virginiaVictimQuestionContract(p,route,current),false);
for(const state of ['FL','MS','GA']){
 const p=getProfileByJurisdiction(state),q=p.questions.find(q=>q.id==='trafficking_status');
 check('other-state-victim-requirement-untouched-'+state,H.virginiaVictimQuestionApplies(p,p.pathways[0].id,'trafficking_status'),true);
 if(q)check('other-state-descriptor-not-normalized-'+state,H.virginiaVictimContextQuestion(p,q),q);
}
const memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/VA.memo.json'));
for(const code of ['18.2-346','18.2-347'])check('retained-source-carveback-'+code,JSON.stringify(memo).includes(code),true);
for(const {pathway,base}of seeds.filter(x=>x.variant==='no')){
 const current={...base,trafficking_status:'No'};
 const missing={...current};delete missing.case_outcome;
 check(pathway.id+'/real-missing-outcome-retained',evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-va-victim-scope',answers:missing}).evaluation.resultCode==='needs_more_info',true);
 const excluded={...current,state_exclusion_categories:['Sex offense or registration']};
 const result=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-va-victim-scope',answers:excluded}).evaluation;
 check(pathway.id+'/real-offense-exclusion-retained',result.paymentAllowed,false);
 check(pathway.id+'/victim-does-not-supply-offense',Object.hasOwn(current,'state_exclusion_categories'),Object.hasOwn(base,'state_exclusion_categories'));
}
const {resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
// Only the observed regime1 identity and its one declared adopted successor;
// a further change, or a successor that consumes victim status, is refused.
{const regime1=H.VA_VICTIM_CONTEXT_ROUTES[0],spec=packetSpecificationFor('VA:'+regime1);
 check('declared-successor-spec-accepted',H.virginiaVictimQuestionContract(profile,regime1,{specification:spec}),true);
 for(const [label,changed] of [['unreviewed-third-spec',{...spec,specificationNote:'changed'}],['successor-consumes-victim-status',{...spec,requiredFacts:[...(spec.requiredFacts??[]),{factId:'trafficking_status'}]}]])
  check('exact-guard-refuses-'+label,H.virginiaVictimQuestionContract(profile,regime1,{specification:changed}),false);
 check('exact-guard-refuses-successor-on-specless-route',H.virginiaVictimQuestionContract(profile,H.VA_VICTIM_CONTEXT_ROUTES[1],{specification:spec}),false);}
for(const pathway of profile.pathways){
 for(const value of [undefined,'Yes','No','I am not sure','Prefer not to say']){
  const answers=value===undefined?{}:{trafficking_status:value};
  const actual=P.packetCollectionFor({jurisdiction:'VA',pathwayId:pathway.id,requiredInputIds:['trafficking_status'],serverFacts:{},screeningAnswers:answers,prefilledAnswers:{},savedAnswers:{}});
  const fact=actual.facts.find(f=>f.factId==='trafficking_status');
  check(pathway.id+'/'+value+'/actual-collector-inactive',fact?.active,false);
  check(pathway.id+'/'+value+'/actual-collector-source',fact?.source,'va_three_routes_victim_status_retained_context');
 }
 const common={jurisdiction:'VA',pathwayId:pathway.id,requiredInputIds:['trafficking_status'],serverFacts:{},screeningAnswers:{},prefilledAnswers:{},savedAnswers:{},questionById:new Map(pub.questions.map(q=>[q.id,q])),specification:packetSpecificationFor('VA:'+pathway.id)};
 const held=resolvePacketCollection({...common,override:{needsHumanClassification:['trafficking_status']}});
 check(pathway.id+'/explicit-human-review-not-overridden',held.facts.find(f=>f.factId==='trafficking_status')?.source==='va_three_routes_victim_status_retained_context',false);
}
// Follow actual emitted runtime imports of the changed browser helper. No
// engine/server helper may cross this client boundary through a type-only edge.
const clientSeen=new Set(),serverPaths=[];
function visitClient(file,chain=[]){
 if(clientSeen.has(file))return;clientSeen.add(file);
 const emitted=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:file}).outputText;
 for(const {fileName:specifier}of ts.preProcessFile(emitted,true,true).importedFiles){
  if(specifier==='server-only'){serverPaths.push([...chain,file,specifier]);continue;}
  const base=specifier.startsWith('@/')?path.resolve('src',specifier.slice(2)):specifier.startsWith('.')?path.resolve(path.dirname(file),specifier):null;if(!base)continue;
  const resolved=[base,base+'.ts',base+'.tsx',base+'.json',path.join(base,'index.ts'),path.join(base,'index.tsx')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
  if(resolved&&/\.[cm]?[jt]sx?$/.test(resolved))visitClient(resolved,[...chain,file]);
 }
}
visitClient(path.resolve('src/components/expungement-ai/screening/screens.ts'));
check('actual-screens-client-runtime-closure-no-server-only',serverPaths,[]);
// Production protected HTTP/page code with an isolated in-memory transport.
// Session/CAS/storage transport is stubbed; this is NOT authenticated owner proof.
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
let stored,sourceAnswers,owner='synthetic-va-owner';const item={id:'synthetic-va-victim-scope',jurisdiction:'VA',artifactRefs:{}};
const present=()=>decorate({consumerAuthUserId:'synthetic-va-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__vaVictimTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-va-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__vaVictimTransport.'+b+'(...args);').join('\n'));};
const pageFile=file('src/app/briefcase/[packetId]/packet-information/page.tsx');let pageSource=fs.readFileSync(pageFile,'utf8');pageSource=pageSource.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');pageSource=pageSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])pageSource=substitute(pageSource,[b],'@/lib/expungement-ai/'+m);compile(pageFile,pageSource);const Edit=(await import(pathToFileURL(pageFile).href)).default;
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let apiSource=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])apiSource=substitute(apiSource,b,m);compile(apiFile,apiSource);const API=await import(pathToFileURL(apiFile).href);
const context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={})=>API.POST(new Request(url,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const {isPacketSaveReceipt}=await load('src/lib/expungement-ai/packet-save-contract.ts');
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};
const offered=[];
for(const row of rows){
 stored=structuredClone(row.record);sourceAnswers=row.input;const before=structuredClone(stored),presented=await present();
 const get=await API.GET(new Request(url),context),body=await get.json();
 const tree=await Edit({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({})});
 const builders=nodes(tree).filter(n=>n.type?.name==='PacketInformationBuilder');
 check(row.originalMember+'/'+row.variant+'/actual-builder-omits-victim-question',builders.some(n=>n.props.questions.some(q=>q.id==='trafficking_status')),false);
 const pages=[];
 for(const locale of ['en','es']){const markup=html(tree,locale);check(row.originalMember+'/'+row.variant+'/'+locale+'/no-victim-disclosure-field',/name="trafficking_status"/.test(markup),false);check(row.originalMember+'/'+row.variant+'/'+locale+'/no-victim-navigation-or-prompt',markup.includes(q.prompt)||markup.includes(q.translations?.es?.prompt??'¿Esto ocurrió porque fue víctima de trata de personas?')||markup.includes('value="trafficking_status"'),false);pages.push({locale,markup});}
 offered.push({originalMember:row.originalMember,variant:row.variant,getStatus:get.status,authorityStatus:presented.authorityStatus,paymentState:presented.paymentState,pageBuilderCount:builders.length,offeredQuestionIds:builders.flatMap(n=>n.props.questions.map(q=>q.id)),pages});
 check(row.originalMember+'/'+row.variant+'/protected-read-raw-immutable',stored,before);
 check(row.originalMember+'/'+row.variant+'/GET-no-victim-gate',(body.missingInputIds??[]).includes('trafficking_status'),false);
 const noop=await post({}),receipt=await noop.json();
 if(noop.status===200){check(row.originalMember+'/'+row.variant+'/strict-noop-save-receipt',isPacketSaveReceipt(receipt),true);check(row.originalMember+'/'+row.variant+'/no-ready-authority',receipt.readyToGenerate,false);for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.originalMember+'/'+row.variant+'/commerce-'+key,receipt.commercialActions?.[key],false);}
 else check(row.originalMember+'/'+row.variant+'/held-noop-denied',noop.status,403);
 check(row.originalMember+'/'+row.variant+'/whole-row-noop-preserved',stored,before);
 check(row.originalMember+'/'+row.variant+'/noop-keeps-raw-victim',stored.draftSnapshot.screeningAnswers.trafficking_status,before.draftSnapshot.screeningAnswers.trafficking_status);
 // A normal offered filing fact remains writable. Context is retained in its
 // original map; saving another fact supplies neither victimhood nor authority.
 if(!row.originalMember.includes('automatic-sealing-no-filing')){
  const deniedBefore=structuredClone(stored),unowned=await post({unowned_victim_fact:'Yes'});
  check(row.originalMember+'/'+row.variant+'/unowned-field-denied',unowned.status,422);
  check(row.originalMember+'/'+row.variant+'/unowned-field-atomic',stored,deniedBefore);
  const changed=await post({participant_full_legal_name:'Synthetic VA Participant'}),changedReceipt=await changed.json();
  check(row.originalMember+'/'+row.variant+'/offered-fact-save-status',changed.status,200);
  check(row.originalMember+'/'+row.variant+'/offered-fact-strict-receipt',isPacketSaveReceipt(changedReceipt),true);
  check(row.originalMember+'/'+row.variant+'/offered-fact-stored',stored.draftSnapshot.packetAnswers.participant_full_legal_name,'Synthetic VA Participant');
  for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])check(row.originalMember+'/'+row.variant+'/material-save-keeps-raw-'+map,stored.draftSnapshot[map].trafficking_status,before.draftSnapshot[map].trafficking_status);
  check(row.originalMember+'/'+row.variant+'/material-save-does-not-verify',stored.status==='verified',false);
  check(row.originalMember+'/'+row.variant+'/material-save-no-authority',changedReceipt.readyToGenerate,false);
  const reentry=await API.GET(new Request(url),context),reentryBody=await reentry.json();
  check(row.originalMember+'/'+row.variant+'/reentry-uses-saved-name',reentryBody.answers?.participant_full_legal_name,'Synthetic VA Participant');
  const afterSave=structuredClone(stored),again=await post({});check(row.originalMember+'/'+row.variant+'/reentry-noop-status',again.status,200);
  check(row.originalMember+'/'+row.variant+'/reentry-noop-preserves-all',stored,afterSave);
 }
 const wrongBefore=structuredClone(stored);owner='wrong-owner';const denied=await post({});owner='synthetic-va-owner';check(row.originalMember+'/'+row.variant+'/wrong-owner-denied',denied.status,404);check(row.originalMember+'/'+row.variant+'/wrong-owner-atomic',stored,wrongBefore);
}
// Synthetic exact pre-correction drafts: the source reproduction established
// these held tuples. The absent draft has no route; a context hint cannot fill it.
const historical=[];
for(const row of rows){
 const old=structuredClone(row.record),snap=old.draftSnapshot,held=['unknown','declined','absent'].includes(row.variant);
 if(held){
  snap.resultCode=row.variant==='absent'?'needs_more_info':'needs_review';snap.paymentAllowed=false;
  snap.packetPlan=null;snap.packetType=null;snap.requiredInputIds=[];snap.packetFamilyIdentifiers={mode:null,sourceFormIds:[]};
  if(row.variant==='absent'){snap.screeningAnswers={...snap.screeningAnswers,...snap.prefilledAnswers};snap.prefilledAnswers={};snap.pathwayId=null;snap.serverFacts={jurisdiction:'VA'};snap.profileAuthorityFingerprint='3e4537fa7a650262f0b6970afcc2b9af3fefacc53b465e1f534465809e0be8d6';}
 }else if(Object.hasOwn(snap.screeningAnswers,'trafficking_status')){
  snap.prefilledAnswers.trafficking_status=snap.screeningAnswers.trafficking_status;delete snap.screeningAnswers.trafficking_status;
 }
 old.draftHash=P.protectedPacketDraftHash(snap);
 const oldBefore=structuredClone(old),model=P.protectedPacketInformationModelFor(old);
 check(row.originalMember+'/'+row.variant+'/old-draft-model-readable',Boolean(model),true);
 if(held){check(row.originalMember+'/'+row.variant+'/old-draft-retains-held-result',model?.resultCode,snap.resultCode);check(row.originalMember+'/'+row.variant+'/old-draft-keeps-original-route',model?.pathwayId,snap.pathwayId);check(row.originalMember+'/'+row.variant+'/old-draft-no-borrowed-plan',model?.packetPlan,null);check(row.originalMember+'/'+row.variant+'/old-draft-unsafe',model?.reviewSafety.safe,false);}
 stored=old;sourceAnswers=row.input;const presented=await present(),get=await API.GET(new Request(url),context),getBody=await get.json();
 const tree=await Edit({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({})}),builders=nodes(tree).filter(n=>n.type?.name==='PacketInformationBuilder');
 check(row.originalMember+'/'+row.variant+'/old-draft-actual-GET200',get.status,200);
 check(row.originalMember+'/'+row.variant+'/old-draft-protected-presentation',presented.authorityStatus,'protected_draft');
 if(held)check(row.originalMember+'/'+row.variant+'/old-held-page-no-builder',builders.length,0);
 check(row.originalMember+'/'+row.variant+'/old-draft-no-victim-builder',builders.some(n=>n.props.questions.some(q=>q.id==='trafficking_status')),false);
 for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.originalMember+'/'+row.variant+'/old-draft-commerce-'+key,presented.commercialActions[key],false);
 for(const verify of [false,true]){
  const response=await post({},{verify});const body=await response.json();
  if(held)check(row.originalMember+'/'+row.variant+'/old-held-'+verify+'-no-offered-editor',response.status,403);
  check(row.originalMember+'/'+row.variant+'/old-draft-'+verify+'-cannot-create-readiness',body.readyToGenerate===true,false);
  if(held||!verify)check(row.originalMember+'/'+row.variant+'/old-draft-'+verify+'-preserves-exact-record',stored,oldBefore);
  for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])check(row.originalMember+'/'+row.variant+'/old-draft-'+verify+'-preserves-raw-'+map,stored.draftSnapshot[map].trafficking_status,oldBefore.draftSnapshot[map].trafficking_status);
 }
 historical.push({originalMember:row.originalMember,variant:row.variant,record:oldBefore,getStatus:get.status,getBody,authorityStatus:presented.authorityStatus,pageBuilderCount:builders.length,modelResult:model?.resultCode,modelRoute:model?.pathwayId});
 if(!held)continue;
 if(row.variant==='unknown'){
  const typed=structuredClone(oldBefore),snapshot=typed.draftSnapshot;
  snapshot.screeningAnswers.trafficking_status={value:'Yes',unknown:true};
  snapshot.dependencies.semanticAnswerHistory=[{factId:'trafficking_status',value:'I am not sure',source:'screeningAnswers',meaning:'prior_factual_pathway_answer',routeKey:'VA:'+snapshot.pathwayId,profileVersion:snapshot.profileVersion,profileSourceFingerprint:snapshot.profileSourceFingerprint,profileAuthorityFingerprint:snapshot.profileAuthorityFingerprint}];
  typed.draftHash=P.protectedPacketDraftHash(snapshot);const typedBefore=structuredClone(typed);stored=typed;
  check(row.originalMember+'/typed-unknown-history-model-readable',Boolean(P.protectedPacketInformationModelFor(typed)),true);
  const read=await API.GET(new Request(url),context);check(row.originalMember+'/typed-unknown-history-GET200',read.status,200);
  const noop=await post({});check(row.originalMember+'/typed-unknown-history-no-new-editor',noop.status,403);
  check(row.originalMember+'/typed-unknown-raw-and-history-preserved',stored,typedBefore);stored=old;
 }
 if(row.variant==='unknown'){
  const retained=structuredClone(oldBefore),contextAnswers={va_disposition_locality:{value:'Richmond city',unknown:false},va_court_level:'unknown'};
  Object.assign(retained.draftSnapshot.packetAnswers,{va_record_origin:'virginia'},contextAnswers);
  retained.draftHash=P.protectedPacketDraftHash(retained.draftSnapshot);stored=retained;
  const before=structuredClone(stored),model=P.protectedPacketInformationModelFor(stored);
  for(const[id,value]of Object.entries(contextAnswers)){
   check(row.originalMember+'/old-held-context-retained-'+id,model?.initialAnswers[id],value);
   check(row.originalMember+'/old-held-context-not-offered-'+id,model?.questions.some(q=>q.id===id),false);
   check(row.originalMember+'/old-held-context-not-editable-'+id,model?P.heldPacketCorrectionInputIds(model,model.resultCode).has(id):true,false);
  }
  const denied=await post({va_disposition_locality:'Different city',va_court_level:'circuit'});
  check(row.originalMember+'/old-held-context-write-refused',denied.status,403);
  check(row.originalMember+'/old-held-context-write-preserves-record',stored,before);stored=old;
 }
 // Guard failures are tested after rehashing, so integrity alone cannot conceal
 // a missing source, route, family or envelope applicability check.
 for(const [label,mutate]of [
  ['source',x=>x.profileSourceFingerprint='0'.repeat(64)],['authority',x=>x.profileAuthorityFingerprint='0'.repeat(64)],
  ['profile',x=>x.profileVersion='different'],['family',x=>x.packetFamilyIdentifiers={mode:'forged',sourceFormIds:['forged']}],
  ['plan',x=>x.packetPlan=row.record.draftSnapshot.packetPlan],['result',x=>x.resultCode='packet_ready'],
  ['route',x=>x.pathwayId='unreviewed-victim-route'],['payment',x=>x.paymentAllowed=true]
 ]){const forged=structuredClone(oldBefore);mutate(forged.draftSnapshot);forged.draftHash=P.protectedPacketDraftHash(forged.draftSnapshot);check(row.originalMember+'/'+row.variant+'/old-held-refuses-'+label,P.protectedPacketInformationModelFor(forged),null);}
 const finalRecord=structuredClone(oldBefore),final={...finalRecord.draftSnapshot,schemaVersion:'expungement-ai/final-verification/v1',verifiedAt:'2026-10-16T00:00:00Z'};delete final.capturedAt;
 finalRecord.status='verified';finalRecord.snapshot=final;finalRecord.hash=P.protectedPacketDraftHash(final);
 check(row.originalMember+'/'+row.variant+'/old-final-envelope-not-adopted',P.protectedPacketInformationModelFor(finalRecord),null);
 let denied=false;try{P.requireCurrentPacketVerificationRecord(item,finalRecord);}catch(error){denied=error instanceof P.CurrentPacketVerificationRequiredError;}
 check(row.originalMember+'/'+row.variant+'/old-final-current-authority-denied',denied,true);
 const forgedStatus={...oldBefore,status:'verified'};check(row.originalMember+'/'+row.variant+'/verified-status-with-only-draft-denied',P.protectedPacketInformationModelFor(forgedStatus),null);
}
// GA-14-M01070/M01071/M01072 residency_or_location on the same three routes:
// legacy location stays an unresolved retained obligation, known values are kept,
// it is never a screening/record-origin or output consumer (origin is jurisdiction_scope).
{
const {packetPlanForPathway}=await import('../src/lib/rcap-engine/packet-planner.ts');
const {prepayGateFactIds}=await import('../src/lib/expungement-ai/packet-collection.ts');
const {renderPreflight}=await import('../src/lib/expungement-ai/render-preflight.ts');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),W=read('data/rcap-ledger/public-witness-answer-sets.json').witnesses;
const locationCheck=(name,fn)=>{let pass=true;try{fn();}catch{pass=false;}check(name,pass,true);};
const C='data/rcap-all50/overlays/census-v1/va/',PR='data/rcap-all50/overlays/production/virginia/';
const LEGACY=['residency_or_location','county_or_filing_location','court','jurisdiction_scope','county'];
// Every existing family/destination per route (registry + memo track corroboration, case-insensitive search).
const members={
 'GA-14-M01070':{route:'automatic-sealing-no-filing',maps:[],guidance:['va_auto_seal_clean_record','va_auto_seal_nonconvictions','va_auto_seal_without_order']},
 'GA-14-M01071':{route:'petition-based-sealing',maps:[C+'va-seal-ancillary-matter-only-set--official-pdf-fill',C+'va-seal-petition-misdemeanor-set--official-pdf-fill',C+'va-seal-petition-felony-set--official-pdf-fill',C+'va-seal-enumerated-seven-year-set--official-pdf-fill',PR+'cc-1201-form-en',PR+'cc-1201-a-form-en',PR+'cc-1203-form-en',PR+'cc-1203-a-form-en',PR+'cc-1203-b-form-en']},
 'GA-14-M01072':{route:'regime-1-expungement-available-now',maps:[C+'va-exp-absolute-pardon-set--custom-pleading',C+'va-exp-nonconviction-set--official-pdf-fill',C+'va-exp-identity-used-by-another-set--custom-pleading',PR+'cc-1473-form-en',PR+'cc1473'],spec:'data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json',guidance:['va_exp_actual_innocence']}};
const ids=o=>{const out=[];const w=x=>{if(Array.isArray(x))x.forEach(w);else if(x&&typeof x==='object'){for(const k of ['factId','sourceFactId','canonicalFactId'])if(typeof x[k]==='string')out.push(x[k]);Object.values(x).forEach(w);}};w(o);return out;};
function assertMap(map,label){
 const f=ids(map);
 locationCheck(label+'/no-legacy-location-consumer',()=>assert(!f.some(id=>LEGACY.includes(id)),JSON.stringify(f.filter(id=>LEGACY.includes(id)))));
}
for(const [member,{route,maps,guidance,spec}] of Object.entries(members)){
 const plan=packetPlanForPathway(profile,route),sf={jurisdiction:'VA',pathway_id:route};
 const collect=(map,v)=>{const input={jurisdiction:'VA',pathwayId:route,requiredInputIds:plan.requiredInputIds,serverFacts:sf,screeningAnswers:{},prefilledAnswers:{},savedAnswers:{}};if(v!==undefined)input[map]={residency_or_location:v};const before=JSON.stringify(input);const c=P.packetCollectionFor(input);assert.equal(JSON.stringify(input),before);return c;};
 locationCheck(member+'/plan-retains-legacy-obligation',()=>assert(plan.requiredInputIds.includes('residency_or_location')));
 for(const [label,v] of [['absent',undefined],['typed-unknown',{unknown:true}],['not-sure','I am not sure'],['empty','']]){
  const c=collect('screeningAnswers',v),f=c.facts.filter(x=>x.factId==='residency_or_location');
  locationCheck(member+'/'+label+'/unresolved-scope',()=>{assert.equal(f.length,1);assert.equal(f[0].collection,'unresolved');assert.equal(f[0].source,'unresolved_route_rule_scope');assert(!Object.hasOwn(f[0],'value'));assert(c.unresolvedRequiredFacts.includes('residency_or_location'));assert(prepayGateFactIds(c).includes('residency_or_location'));});
 }
 for(const v of ['Fairfax County',{value:'Earlier location',unknown:false}]){const f=collect('prefilledAnswers',v).facts.find(x=>x.factId==='residency_or_location');locationCheck(member+'/known-raw-preserved/'+JSON.stringify(v),()=>{assert.equal(f.collection,'already_known');assert.deepEqual(f.value,v);});}
 const retainedVa=W.find(x=>x.pathwayKey==='VA:'+route),firstVa=W.find(x=>x.jurisdiction==='VA');
 const w={finalAnswers:retainedVa?.finalAnswers??{...firstVa.finalAnswers,possible_pathway_context:profile.pathways.find(x=>x.id===route).label,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',identity_error:'No'}};
 {
  const authoritative=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-va-location',answers:w.finalAnswers});
  locationCheck(member+'/location-is-not-a-screening-consumer',()=>assert.throws(()=>evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'m',answers:{...w.finalAnswers,residency_or_location:'Maryland'}}),e=>JSON.stringify(e.invalidQuestionIds)==='["residency_or_location"]'));
  locationCheck(member+'/federal-origin-hard-stop',()=>{const e=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'m',answers:{...w.finalAnswers,jurisdiction_scope:'Federal'}}).evaluation;assert.equal(e.resultCode,'hard_stop');assert.equal(e.reasons[0].code,'va.federal_or_out_of_scope');assert.equal(e.paymentAllowed,false);});
  for(const v of [undefined,{unknown:true},'Fairfax County','Maryland',{value:'Earlier location',unknown:false}]){
   const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:w.finalAnswers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
   if(v!==undefined)seed.snapshot.packetAnswers.residency_or_location=v;
   const rec={status:'unverified',reason:'synthetic',revision:0,draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot},before=JSON.stringify(rec),m=P.protectedPacketInformationModelFor(rec);
   const known=typeof v==='string'||(v&&v.unknown===false);
   locationCheck(member+'/model/'+JSON.stringify(v),()=>{assert.equal(authoritative.evaluation.pathwayId,route);assert.equal(m.pathwayId,route);assert.equal(m.missingInputIds.includes('residency_or_location'),!known);assert.deepEqual(m.initialAnswers.residency_or_location,v);assert.equal(JSON.stringify(rec),before);});
  }
 }
 for(const s of ['checkout creation','packet generation'])locationCheck(member+'/no-output/'+s,()=>{const a=packetFulfillmentAuthority('VA',route,s,{trackId:null});assert.equal(a.allowed,false);assert(a.reason.includes('NO_RECORD'),a.reason);});
 locationCheck(member+'/no-render-authority',()=>assert.equal(renderPreflight({snapshot:{jurisdiction:'VA',pathwayId:route,selectedTrackId:null},verificationHash:'x',facts:{residency_or_location:'Fairfax County'}}).reason,'no_composable_specification_for_route'));
 for(const dir of maps){const map=read(dir+'/production-field-map.json');assertMap(map,member+'/'+dir.split('/').pop());}
 if(guidance){const g=read('data/rcap-all50/guidance-packets/va.json').packets;for(const t of guidance)locationCheck(member+'/guidance-binds-no-facts/'+t,()=>{const p=g.find(x=>x.trackId===t);assert(p);assert.deepEqual(ids(p),[]);});}
 if(spec){const j=read(spec),d=j.procedureAdoption.originalFactDispositions.find(x=>x.factId==='final_disposition_dates_and_courts');
  locationCheck(member+'/v3s7-court-owned-venue',()=>{assert.equal(j.officialForm.sourceSha256,'85ac8ea0f2dc40d890fa2b37921a1b24956ed4aecb1555109a0bb5a65793c656');assert.equal(j.legalSectionsBound,false);assert.equal(j.procedureAdoption.participantPetitionEstablished,false);assert.equal(d.participantPetitionRequired,false);assert.equal(d.historicalRawAnswerPreserved,true);assert.equal(j.procedureAdoption.mechanism.implementationActor,'receiving circuit court');assert.equal(d.officialFormDestination,null);assert(!j.requiredFacts.some(f=>LEGACY.includes(f.factId)));});}
}
}
const failed=checks.filter(c=>!c.pass);
if(process.env.RCAP_VA_VICTIM_RECEIPT)fs.writeFileSync(process.env.RCAP_VA_VICTIM_RECEIPT,JSON.stringify({head:process.env.RCAP_VA_VICTIM_SOURCE_HEAD,checks,rows,offered,historical,clientDependencyClosure:{files:[...clientSeen].map(p=>path.relative(root,p)),serverOnlyPaths:serverPaths},limits:['Synthetic evaluator/projection/model/persistence only; no authenticated owner, DB, legal eligibility, currentness expansion, language or output acceptance.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checks:checks.length,rows:rows.length,failed:failed.map(({name,actual,expected})=>({name,actual:typeof actual==='object'?actual?.resultCode:actual,expected:typeof expected==='object'?expected?.resultCode:expected}))}));
assert.equal(failed.length,0);
