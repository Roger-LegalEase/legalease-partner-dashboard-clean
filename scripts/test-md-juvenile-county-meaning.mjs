import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';import{register,createRequire}from'node:module';import{pathToFileURL}from'node:url';import{isDeepStrictEqual as same}from'node:util';import{execFileSync}from'node:child_process';
const root=process.cwd(),file=p=>path.join(root,p),sha=b=>createHash('sha256').update(b).digest('hex'),out=process.env.RCAP_MD_JUVENILE_CAPTION_RECEIPT;
if(out)assert(!fs.existsSync(out),'Fresh optional receipt required');
const fixture={"kind":"MD_JUVENILE_ORIGINAL124B_AND_RETAINED_FIVE_COUNTY_CONTEXTS","originalId":"Q-d7118400a5658cf4acb7","archive":{"sha256":"3173bbec9a9cd51ef2abd6cd05e68c1830585d833cd45157dbb7f31fe3dedcc1","pointer":"/routes/124/scenarios/B/screeningAnswers"},"originalB":{"ownership_scope":"Yes","jurisdiction_scope":"State or local","case_outcome":"Dismissed, no-billed, nolle prosequi, or not prosecuted","offense_level":"Misdemeanor","possible_pathway_context":"Juvenile expungement","age_at_offense":"30","prior_relief":"Yes","pardon_status":"No","sentence_completion_date":"Yes","financial_obligations":"Yes","pending_cases":"No","resolved_timing_bucket":"gt_10_years","state_exclusion_categories":["None of these"]},"retainedCountyFixtures":{"sha256":"5acaf974cd00b96cdf88c6e8f1f4ff6b2ae0f3cec66b493107c666d08d51f013","pointer":"/original55/15/scenarios"},"cases":[{"name":"EMPTY","countyMapPlacements":{"screeningAnswers":{},"prefilledAnswers":{},"savedAnswers":{}}},{"name":"EXACT_SCREENING_KNOWN","countyMapPlacements":{"screeningAnswers":{"county":"Example County"},"prefilledAnswers":{},"savedAnswers":{}}},{"name":"EXACT_SCREENING_UNKNOWN","countyMapPlacements":{"screeningAnswers":{"county":{"value":"Example County","unknown":true}},"prefilledAnswers":{},"savedAnswers":{}}},{"name":"EXACT_SAVED_KNOWN","countyMapPlacements":{"screeningAnswers":{},"prefilledAnswers":{},"savedAnswers":{"county":"Example County"}}},{"name":"EXACT_PREFILLED_KNOWN","countyMapPlacements":{"screeningAnswers":{},"prefilledAnswers":{"county":"Example County"},"savedAnswers":{}}}],"qualification":"EMPTY denotes only empty county placement, while original124/B legal/context answers remain exact. County map values/unknown wrapper unchanged from original five fixtures. No juvenile positive/guardian/qualification/age/outcome changes."};
const head=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),headBefore=head();
const sourcePaths=['src/lib/expungement-ai/md-juvenile-county-source-purpose.ts','src/lib/expungement-ai/record-fact-clarification.ts','src/lib/record-clearing/renderers/overlay-renderer.ts','src/lib/rcap-engine/compiled/profiles/MD-maryland.json','src/lib/rcap-engine/evaluator.ts','src/lib/rcap-engine/public-profile-projection.ts','src/lib/rcap-engine/screening-question-selection.ts','src/lib/rcap-engine/packet-planner.ts','src/lib/rcap-engine/route-fact-relevance.ts','src/lib/expungement-ai/packet-information.ts','src/lib/expungement-ai/packet-collection.ts','src/lib/expungement-ai/briefcase-presentation-authority.ts','src/lib/expungement-ai/authoritative-screening-result.ts','src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts','src/app/briefcase/[packetId]/page.tsx','src/app/briefcase/[packetId]/packet-information/page.tsx','scripts/lib/ts-esm-loader.mjs'],pins=()=>Object.fromEntries(sourcePaths.map(p=>[p,sha(fs.readFileSync(file(p)))])),diff=()=>sha(execFileSync('git',['diff','HEAD','--','src','data'],{cwd:root})),untracked=()=>Object.fromEntries(execFileSync('git',['ls-files','--others','--exclude-standard','src','data'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).map(p=>[p,fs.lstatSync(file(p)).isSymbolicLink()?{linkSha256:sha(fs.readlinkSync(file(p),{encoding:'buffer'}))}:sha(fs.readFileSync(file(p)))])),before={pins:pins(),diff:diff(),untracked:untracked()};
process.chdir(root);process.env.RCAP_EVALUATOR_TODAY='2026-10-16';const requireFromR=createRequire(root+'/package.json'),ts=requireFromR('typescript');register(root+'/scripts/lib/ts-esm-loader.mjs',import.meta.url);const load=p=>import(pathToFileURL(file(p)).href),compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#mdjuvenile'+Buffer.from(name).toString('hex'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');const{LocalizationContext}=await import(pathToFileURL(loc).href),React=requireFromR('react'),{renderToStaticMarkup}=requireFromR('react-dom/server'),{t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts'),{AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const P=await load('src/lib/expungement-ai/packet-information.ts'),C=await load('src/lib/expungement-ai/packet-collection.ts'),{evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts'),{getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts'),{decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const profile=getProfileByJurisdiction('MD'),route='juvenile-expungement',item={id:'synthetic-original-md-juvenile-county',jurisdiction:'MD',artifactRefs:{}};let stored,sourceAnswers;const owner='synthetic-md-juvenile-owner';let activeOwner=owner,authenticated=true,accountVerified=true;
const present=()=>decorate({consumerAuthUserId:owner,item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MD',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-isolated-original124B',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__mdJuvenileCountyTransport={requireConsumerBriefcaseSession:async()=>({userId:activeOwner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:authenticated,isVerified:accountVerified,userId:authenticated?activeOwner:undefined}),getBriefcaseItem:async(user,id)=>user===owner&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substituted seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substituted trusted source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__mdJuvenileCountyTransport.'+b+'(...args);').join('\n'));};
async function page(relative){const name=file(relative);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";').replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;}
const Matter=await page('src/app/briefcase/[packetId]/page.tsx'),Editor=await page('src/app/briefcase/[packetId]/packet-information/page.tsx');const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let apiSource=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])apiSource=substitute(apiSource,b,m);compile(apiFile,apiSource+'\nexport {isMdJuvenileHeldMatterOnly as __actualMdJuvenileGuard};');const API=await import(pathToFileURL(apiFile).href),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information',html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const rows=[],http=[],surfaces=[],invariants=[];const invariant=(name,value)=>{invariants.push({name,pass:!!value});assert(value,name);};
const rawMaps=()=>Object.fromEntries(['screeningAnswers','prefilledAnswers','packetAnswers'].map(k=>[k,structuredClone(stored.draftSnapshot[k])]));
function summarize(){const m=P.protectedPacketInformationModelFor(stored);return{record:structuredClone(stored),model:m,collection:m?P.packetCollectionFor({jurisdiction:'MD',pathwayId:route,requiredInputIds:m.requiredInputIds,serverFacts:m.serverFacts,screeningAnswers:m.screeningAnswers,prefilledAnswers:m.prefilledAnswers,savedAnswers:m.packetAnswers,unresolvedSavedFactIds:m.questions.filter(q=>q.savedAnswerNeedsClarification).map(q=>q.id)}):null};}
async function request(name,method,data){const before=structuredClone(stored),response=await API[method](new Request(url,method==='POST'?{method,body:JSON.stringify(data)}:{}),context),body=await response.json();http.push({name,method,status:response.status,body,before,after:structuredClone(stored),recordUnchanged:same(before,stored)});return{status:response.status,body};}
async function observe(name){const original=structuredClone(stored),value=summarize(),presentation=await present();rows.push({name,...value,exportProjection:value.collection?{prepayGateFactIds:C.prepayGateFactIds(value.collection),filingReadinessFactIds:C.filingReadinessFactIds(value.collection),renderGateFactIds:C.renderGateFactIds(value.collection),resolvedValues:C.resolvedFactValues(value.collection)}:null,presentation,editableCounty:value.model?P.editablePacketInputIds(value.model,true).has('county'):false,heldCorrectionIds:value.model?[...P.heldPacketCorrectionInputIds(value.model,value.model.resultCode)]:[]});
 for(const locale of ['en','es'])for(const[k,component]of [['matter',Matter],['editor',Editor]]){try{const markup=html(await component({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({})}),locale);surfaces.push({name,locale,kind:k,html:markup,countyOffered:markup.includes('data-packet-question="county"'),courtOffered:markup.includes('data-packet-question="court"'),guardianOffered:/data-packet-question="[^"]*guardian/.test(markup),offeredEditorLink:markup.includes('href="/briefcase/'+item.id+'/packet-information"')});}catch(error){surfaces.push({name,locale,kind:k,threw:{name:error.name,digest:error.digest??null,message:String(error.message)}});}}
 invariant(name+'/read-model-pages-no-mutation',same(original,stored));}

// Scoped in-memory protected intake-meaning target with PRIVATE caption geometry check. Not a real owner journey,
// final petition, eligibility determination or production generation approval.
const Caption=await load('src/lib/expungement-ai/md-juvenile-county-source-purpose.ts');
const AnswerState=await load('src/lib/expungement-ai/question-answer-state.ts');
const Meaning=await load('src/lib/expungement-ai/record-fact-clarification.ts');
const Overlay=await load('src/lib/record-clearing/renderers/overlay-renderer.ts');
const sourcePdf=process.env.RCAP_MD_CAPTION_SOURCE_PDF,fieldMapPath=process.env.RCAP_MD_CAPTION_FIELD_MAP;
const outputDir=process.env.RCAP_MD_CAPTION_OUTPUT_DIR;
assert(sourcePdf&&fieldMapPath&&outputDir,'Explicit exact private source/map/fresh output directory required');
assert.equal(sha(fs.readFileSync(sourcePdf)),Caption.MD_JUVENILE_CAPTION_SOURCE.sha256);
assert(!fs.existsSync(outputDir),'Caption evidence directory must be fresh');
fs.mkdirSync(outputDir,{recursive:true});
// Map v2 succeeds immutable516ead07... with ONLY baseline+0.5pt after actual v1
// glyph bbox exceeded the widget bottom by0.456pt. Full bounds remain strict.
assert.equal(sha(fs.readFileSync(fieldMapPath)),'54922f105925d4efed6c455b94da6b3873348e7ab475e0d20f6a4cb589610685','Exact reviewed private field-map v2 bytes');
const fieldMap=JSON.parse(fs.readFileSync(fieldMapPath));
assert.equal(fieldMap.formId,'md_juvenile_expungement_petition');
assert.deepEqual(fieldMap.overlays.map(row=>row.textKey),['juvenileCourtCityCounty']);
const checks=[];const check=(name,actual,expected=true)=>checks.push({name,pass:same(actual,expected),...(same(actual,expected)?{}:{actual,expected})});
// This is intentionally private test preparation. There is NO production
// export/generation caller for this projection; do not credit Qd711 completion.
const privateCaptionProjection=record=>{
 const model=P.protectedPacketInformationModelFor(record);
 if(!model||!['unverified','invalidated'].includes(record.status)||model.resultCode!=='not_covered_yet'||model.reviewSafety.safe)return null;
 const question=Caption.mdJuvenileCaptionQuestion(profile,model.pathwayId,null);
 if(!question||!P.heldPacketCorrectionInputIds(model,model.resultCode).has('county'))return null;
 const answers={...model.screeningAnswers,...model.prefilledAnswers,...model.packetAnswers};
 if(Meaning.unresolvedRecordFactConfirmations(Caption.MD_JUVENILE_CAPTION_ROUTE,answers,new Map([['county',question]]),record.draftSnapshot.dependencies.recordFactConfirmations).includes('county'))return null;
 const value=AnswerState.scalarAnswerText(answers.county)?.trim();
 if(!value||AnswerState.questionAnswerState(question,answers.county)!=='known_valid')return null;
 return{source:Caption.MD_JUVENILE_CAPTION_SOURCE,sampleData:{juvenileCourtCityCounty:value},privateTechnicalOnly:true,productionConsumerConnected:false};
};
const geometryScript=`import json,sys,pymupdf
p=pymupdf.open(sys.argv[1]);value=sys.argv[2]
widgets=[{'page':n+1,'name':w.field_name,'type':w.field_type_string,'rect':list(w.rect),'value':w.field_value,'choices':w.choice_values} for n,page in enumerate(p) for w in page.widgets() or []]
spans=[{'page':n+1,'text':s['text'],'origin':list(s['origin']),'bbox':list(s['bbox'])} for n,page in enumerate(p) for block in page.get_text('dict')['blocks'] if 'lines' in block for line in block['lines'] for s in line['spans'] if s['text']==value]
print(json.dumps({'pages':len(p),'pageHeights':[page.rect.height for page in p],'widgets':widgets,'spans':spans}))`;
const inspectGeometry=(pdf,value)=>JSON.parse(execFileSync('python',['-c',geometryScript,pdf,value],{encoding:'utf8'}));
const sourceGeometry=inspectGeometry(sourcePdf,'');
const captionWidget=sourceGeometry.widgets.find(row=>row.name==='City/County of Circuit Court');assert(captionWidget);
const captionExports=[],pdfs=[];let caught;
const seedFor=c=>{const placement=c.countyMapPlacements;sourceAnswers={...fixture.originalB,...placement.screeningAnswers};
 const auth=evaluate({jurisdiction:'MD',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers});
 assert.equal(auth.evaluation.pathwayId,route);assert.equal(auth.evaluation.resultCode,'not_covered_yet');
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:auth,screeningAnswers:sourceAnswers,
 prefilledAnswers:placement.prefilledAnswers,packetAnswers:placement.savedAnswers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
 assert(seed);return{status:'unverified',reason:'synthetic-isolated-original124B-caption',revision:0,
 draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot,hash:null,snapshot:null};};
try{
 for(const c of fixture.cases){
  stored=seedFor(c);const initial=structuredClone(stored),raw=rawMaps();
  check(c.name+'/legacy values do not establish caption',privateCaptionProjection(stored),null);
  const first=await request(c.name+'/GET','GET');check(c.name+'/GET',first.status,200);
  check(c.name+'/GET exact stored record',stored,initial);
  const noop=await request(c.name+'/noop','POST',{expectedRevision:stored.revision,answers:{}});
  check(c.name+'/noop',noop.status,200);check(c.name+'/noop raw maps unchanged',rawMaps(),raw);
  const model=P.protectedPacketInformationModelFor(stored);assert(model);
  const question=model.questions.find(q=>q.id==='county');
  check(c.name+'/same source prompt model/collector',question?.prompt,Caption.mdJuvenileCaptionQuestion(profile,route,null)?.prompt);
  check(c.name+'/held editor admits county only',[...P.heldPacketCorrectionInputIds(model,model.resultCode)],['county']);
  for(const locale of ['en','es']){const markup=html(await Editor({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:'county'})}),locale);
   surfaces.push({name:c.name+'/caption-editor',locale,html:markup});check(c.name+'/'+locale+'/actual held entry',markup.includes(locale==='en'?'circuit court':'tribunal de circuito'));
  }
  const value=c.name==='EXACT_PREFILLED_KNOWN'?"Prince George's County":'Baltimore City';
  const bare=await request(c.name+'/bare-caption-edit','POST',{expectedRevision:stored.revision,answers:{county:value}});
  check(c.name+'/bare-caption-edit',bare.status,200);check(c.name+'/bare edit not auto-confirmed',privateCaptionProjection(stored),null);
  const confirm=await request(c.name+'/explicit-source-confirmation','POST',{expectedRevision:stored.revision,answers:{},confirmRecordFacts:['county']});
  check(c.name+'/explicit source confirmation',confirm.status,200);
  const exported=privateCaptionProjection(stored);captionExports.push({case:c.name,exported});assert(exported,c.name+' actual source-bound protected export');
  check(c.name+'/actual caption value',exported.sampleData,{juvenileCourtCityCounty:value});
  check(c.name+'/route stays held',P.protectedPacketInformationModelFor(stored)?.resultCode,'not_covered_yet');
  check(c.name+'/no final verification',stored.status==='verified',false);
  for(const [source,values]of Object.entries(raw))if(Object.hasOwn(values,'county'))check(c.name+'/'+source+'/legacy exact value in protected history',stored.draftSnapshot.dependencies.semanticAnswerHistory.some(entry=>entry.factId==='county'&&entry.source===source&&same(entry.value,values.county)));
  const beforeNoop=structuredClone(stored);await request(c.name+'/confirmed-noop','POST',{expectedRevision:stored.revision,answers:{}});
  check(c.name+'/confirmed noop record exact',stored,beforeNoop);
  const beforeVerify=structuredClone(stored);const verify=await request(c.name+'/verify-held','POST',{expectedRevision:stored.revision,answers:{},verify:true});
  check(c.name+'/verification cannot synthesize authority',stored.status==='verified',false);
  check(c.name+'/verification receipt absent',stored.hash??null,null);
  http.push({name:c.name+'/exact verification envelope',response:verify,before:beforeVerify,after:structuredClone(stored)});
  // Stop after the actual captured failure; no repair/hash update or forced eligibility.
  assert(checks.every(row=>row.pass),c.name+' failed scoped caption assertion');
  if(c.name==='EXACT_SCREENING_KNOWN'||c.name==='EXACT_PREFILLED_KNOWN'){
   const pdfPath=path.join(outputDir,c.name+'-caption-shadow.pdf');
   const rendered=await Overlay.renderPdfOverlayShadow({template:{blankSourceHash:Caption.MD_JUVENILE_CAPTION_SOURCE.sha256},
    fieldMap,sourcePdfPath:sourcePdf,outputDirectory:outputDir,outputFileName:path.basename(pdfPath),purpose:'shadow_verification',shadowMode:true,sampleData:exported.sampleData},'overlay',path.basename(pdfPath));
   check(c.name+'/existing overlay seam rendered',rendered.status,'shadow_rendered');
   const text=execFileSync('pdftotext',['-layout',pdfPath,'-'],{encoding:'utf8'});
   check(c.name+'/caption value in actual PDF text',text.includes(value));
   const geometry=inspectGeometry(pdfPath,value),overlay=fieldMap.overlays[0],spans=geometry.spans;
   check(c.name+'/all source widgets unchanged',geometry.widgets,sourceGeometry.widgets);
   check(c.name+'/one actual caption-position span',spans.length,1);
   if(spans.length===1){const span=spans[0],rect=captionWidget.rect;
    check(c.name+'/caption on correct page',span.page,1);
    check(c.name+'/caption x exact overlay',Math.abs(span.origin[0]-overlay.x)<=0.001);
    check(c.name+'/caption baseline exact overlay',Math.abs((sourceGeometry.pageHeights[0]-span.origin[1])-overlay.y)<=0.001);
    check(c.name+'/actual caption bounds fit source widget',span.bbox[0]>=rect[0]-0.001&&span.bbox[1]>=rect[1]-0.001&&span.bbox[2]<=rect[2]+0.001&&span.bbox[3]<=rect[3]+0.001);
   }

   const {PDFDocument,PDFCheckBox}=requireFromR('pdf-lib'),original=await PDFDocument.load(fs.readFileSync(sourcePdf)),next=await PDFDocument.load(fs.readFileSync(pdfPath));
   const checkboxState=doc=>doc.getForm().getFields().filter(field=>field instanceof PDFCheckBox).map(field=>[field.getName(),field.isChecked()]);
   check(c.name+'/all paragraph3/4 checkboxes untouched',checkboxState(next),checkboxState(original));
   check(c.name+'/same two source pages',next.getPageCount(),2);
   check(c.name+'/source bytes unchanged',sha(fs.readFileSync(sourcePdf)),Caption.MD_JUVENILE_CAPTION_SOURCE.sha256);
   pdfs.push({case:c.name,path:pdfPath,sha256:sha(fs.readFileSync(pdfPath)),rendered,text,geometry});
  }
  assert(checks.every(row=>row.pass),c.name+' failed scoped caption assertion after rendering');
  const beforeUnknown=structuredClone(stored);const unknown=await request(c.name+'/unknown-caption','POST',{expectedRevision:stored.revision,answers:{county:'I am not sure'}});
  check(c.name+'/unknown caption save',unknown.status,200);check(c.name+'/unknown no legacy fallback',privateCaptionProjection(stored),null);
  // Test the actual confirmation invalidator directly as well as caller saves.
  const confirmed=beforeUnknown.draftSnapshot.dependencies.recordFactConfirmations,answers={...beforeUnknown.draftSnapshot.screeningAnswers,...beforeUnknown.draftSnapshot.prefilledAnswers,...beforeUnknown.draftSnapshot.packetAnswers};
  for(const changed of [{...answers,county:'I am not sure'},{...answers,county:''},{...answers,court:'Different juvenile court'},{...answers,charge:'Different target charge'}]){
   const invalid=Meaning.mdJuvenileCaptionConfirmationsAfterChange(Caption.MD_JUVENILE_CAPTION_ROUTE,answers,changed,confirmed);
   check(c.name+'/meaning changed marker invalidated',invalid?.county?.status,'unconfirmed');
   check(c.name+'/away-back does not resurrect',Meaning.mdJuvenileCaptionConfirmationsAfterChange(Caption.MD_JUVENILE_CAPTION_ROUTE,changed,answers,invalid)?.county?.status,'unconfirmed');
  }
  check(c.name+'/same meaning wrapper is no-op',Meaning.mdJuvenileCaptionConfirmationsAfterChange(Caption.MD_JUVENILE_CAPTION_ROUTE,answers,{...answers,county:{value:answers.county,unknown:false}},confirmed),confirmed);
  check(c.name+'/wrong route confirmation unavailable',Meaning.recordFactConfirmationFor('MD:adult-route','county',answers,question),null);
  check(c.name+'/non-null specification refuses',Caption.mdJuvenileCaptionQuestion(profile,route,{}),null);
 }
}catch(error){caught={name:error.name,message:error.message,stack:error.stack};}
const after={pins:pins(),diff:diff(),untracked:untracked()};check('source/head stable',head()===headBefore&&same(before,after));
const failed=checks.filter(row=>!row.pass),result={status:caught||failed.length?'FAIL':'PASS',sourceHead:headBefore,sourceBefore:before,sourceAfter:after,checks,failed,caught,rows,http,surfaces,captionExports,pdfs,
 limits:['Prepared target; actual execution required before any PASS.','In-memory existing auth/CAS/HTTP/page seam, no DB/browser or real owner journey.','Original124/B remains adverse adult-context negative; caption mapping is not juvenile qualification.','Private projection/overlay has no application generation/export caller and cannot establish production document binding. Only exact City/County caption technical overlay; court address/manual fields, all eligibility boxes, signature/service stay untouched. No final filing, legal/visual/language/output or delivery approval.']};
if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({status:result.status,checks:checks.length,failed,caught}));assert.equal(result.status,'PASS');
