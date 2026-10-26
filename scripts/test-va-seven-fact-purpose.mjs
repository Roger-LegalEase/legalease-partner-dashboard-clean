import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const root=process.cwd(),file=p=>root+'/'+p,load=p=>import(pathToFileURL(file(p)).href);
register(pathToFileURL(file('scripts/lib/ts-esm-loader.mjs')));
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const localePath=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(localePath,fs.readFileSync(localePath,'utf8')+'\nexport {LocalizationContext};');
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {LocalizationContext}=await import(pathToFileURL(localePath).href);
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {verificationSummary}=await load('src/components/expungement-ai/verification-summary.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {packetFulfillmentAuthority}=await load('src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {packetSpecificationFor,composablePacketSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const route='regime-1-expungement-available-now',profile=getProfileByJurisdiction('VA');
const dispositions=packetSpecificationFor('VA:'+route).procedureAdoption.originalFactDispositions;
const ids=['date_of_birth','mailing_address','phone_number','email_address','full_name_at_time_of_arrest','charges_to_be_expunged','final_disposition_dates_and_courts'];
assert.deepEqual(dispositions.map(r=>r.factId),ids);
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(r=>r.jurisdiction==='VA'&&r.pathwayId===route);
const answers={...witness.finalAnswers,case_outcome:'Pardoned conviction',pardon_status:'Yes'};
const saved={date_of_birth:'1980-01-01',mailing_address:'123 Synthetic Street',phone_number:'2025550100',email_address:'synthetic@example.test',full_name_at_time_of_arrest:'Historical Example Alias',charges_to_be_expunged:'Synthetic covered charge and case SYN-1',final_disposition_dates_and_courts:'Original conviction 2001-01-01; receiving court needs confirmation'};
const make=(pardonType='Yes',input=answers)=>{
 const authoritative=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-va-seven-purpose',answers:input});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:input,packetAnswers:pardonType===undefined?{}:{pardonType},dependencies:{},capturedAt:'2026-10-17T00:00:00Z'});assert(seed);
 return {status:'unverified',revision:0,draftSnapshot:seed.snapshot,draftHash:seed.hash};
};
const withSaved=(record,values=saved,map='packetAnswers')=>{
 const copy=structuredClone(record);Object.assign(copy.draftSnapshot[map],values);copy.draftHash=P.protectedPacketDraftHash(copy.draftSnapshot);return copy;
};
const rows=model=>{const result=verificationSummary(model);assert(result);return [...result.screeningAnswers,...result.packetAnswers].filter(r=>ids.includes(r.id));};
let checks=0;const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,checks}));throw e;}};
let stored=withSaved(make()),owner='synthetic-va-owner';
const item={id:'synthetic-va-seven-purpose',jurisdiction:'VA',artifactRefs:{}};
globalThis.__vaPurposePage={requireConsumerBriefcaseSession:async()=>({userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-va-owner'&&id===item.id?item:null,
 decorateBriefcaseItemForPresentation:async()=>({...item,pathwayId:route,authorityStatus:'available',resultCode:stored.draftSnapshot.resultCode,paymentState:'unpaid',verificationStatus:'unverified',packetDraft:{...P.protectedPacketInformationModelFor(stored),status:'available'},commercialActions:{fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false},artifact:{status:'none'}})};
const pagePath=file('src/app/briefcase/[packetId]/review/page.tsx');let source=fs.readFileSync(pagePath,'utf8');
source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){
 const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(source.includes(original));source=source.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__vaPurposePage.'+binding+'(...args);');
}
compile(pagePath,source);const Review=(await import(pathToFileURL(pagePath).href)).default;
const render=async locale=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},await Review({params:Promise.resolve({packetId:item.id})}))));
const first=P.protectedPacketInformationModelFor(stored);assert(first);
if(process.argv.includes('--regression-only')){
 const html=await render('en');assert(html.includes('data-accuracy-review="true"'));
 assert.equal((html.match(/data-fact-purpose=/g)??[]).length,7,'adopted purposes must reach the actual review page');process.exit(0);
}
const purposeData=Object.fromEntries(rows(first).map(row=>[row.id,row.purpose]));
for(const id of ids)check(id+': adopted display pair',()=>{assert.equal(typeof purposeData[id]?.en,'string');assert(purposeData[id].en.length>30);assert.equal(typeof purposeData[id]?.es,'string');assert(purposeData[id].es.length>30);});
// Exact lead-reviewed EN/ES copy (LEAD-SPANISH-REVIEW-LOG-v1.json, 2026-10-19 VA seven-fact entry); a copy change needs a new review.
const REVIEWED_PURPOSES={
 date_of_birth:{en:'Saved only if needed to match the pardon and case identity. It is not added to CC-1474.',es:'Se conserva solo si hace falta para cotejar la identidad con el indulto y el caso. No se añade al formulario CC-1474.'},
 mailing_address:{en:'Saved as correspondence information. This adds no CC-1474 field or participant filing requirement.',es:'Se conserva como información para correspondencia. Esto no añade un campo al formulario CC-1474 ni un requisito de presentación para usted.'},
 phone_number:{en:'Saved as contact information, not an eligibility condition. It is not added to CC-1474.',es:'Se conserva como información de contacto, no como condición de elegibilidad. No se añade al formulario CC-1474.'},
 email_address:{en:'Saved as your independent contact choice. This gives no consent to electronic service and adds no CC-1474 field.',es:'Se conserva como su elección independiente de contacto. Esto no otorga consentimiento para la notificación procesal electrónica ni añade un campo al formulario CC-1474.'},
 full_name_at_time_of_arrest:{en:'Saved to match the actual pardon and case identity, including needed aliases. An earlier name is not automatically used as the CC-1474 subject name.',es:'Se conserva para cotejar la identidad con el indulto y el caso, incluidos los alias necesarios. Un nombre anterior no se usa automáticamente como nombre de la persona en el formulario CC-1474.'},
 charges_to_be_expunged:{en:'Saved to identify the actual offenses and case numbers covered by the pardon. This does not confirm that a court order has been prepared.',es:'Se conserva para identificar los delitos y números de caso que realmente abarca el indulto. Esto no confirma que se haya preparado una orden judicial.'},
 final_disposition_dates_and_courts:{en:'Saved to confirm the proper receiving court and case. An original conviction or disposition date is not the new court-order or clerk-forwarding date.',es:'Se conserva para confirmar el tribunal receptor y el caso correctos. La fecha original de condena o resolución no es la fecha de la nueva orden judicial ni la fecha de envío por la secretaría del tribunal.'}};
check('exact reviewed purpose copy for all seven facts',()=>{assert.deepEqual(Object.keys(REVIEWED_PURPOSES).sort(),[...ids].sort());for(const id of ids)assert.deepEqual(purposeData[id],REVIEWED_PURPOSES[id],id);});
for(const locale of ['en','es']){
 const before=structuredClone(stored),html=await render(locale);
 check(locale+': actual review renders all seven purposes once',()=>{
  assert(html.includes('data-accuracy-review="true"'));assert.equal((html.match(/data-fact-purpose=/g)??[]).length,7);
  for(const id of ids){const text=renderToStaticMarkup(React.createElement('p',null,purposeData[id][locale])).slice(3,-4);assert.equal(html.split(text).length-1,1,id);}
  assert.deepEqual(stored,before);
 });
}
const bare=P.protectedPacketInformationModelFor(make());
for(const raw of ['Yes','No','I am not sure',null,{value:'Yes',unknown:true},['Yes']]){
 const record=withSaved(make(raw)),before=structuredClone(record),model=P.protectedPacketInformationModelFor(record);assert(model);
 check('explicit pardonType boundary '+JSON.stringify(raw),()=>{
  const count=rows(model).filter(row=>row.purpose).length;assert.equal(count,raw==='Yes'?7:0);
  assert.deepEqual(model.requiredInputIds,bare.requiredInputIds);assert.deepEqual(model.missingInputIds.filter(id=>ids.includes(id)),[]);
  assert.equal(model.reviewSafety.safe,false);assert.notEqual(model.stage,'ready_to_generate');
  assert.equal(composablePacketSpecificationFor('VA:'+route),undefined);assert.equal(packetFulfillmentAuthority('VA',route,'checkout creation').allowed,false);
  assert.deepEqual(record,before);
 });
}
for(const input of [witness.finalAnswers,{...answers,pardon_status:'No'},{...answers,case_outcome:'Acquitted or found not guilty'}]){
 const record=withSaved(make('Yes',input)),model=P.protectedPacketInformationModelFor(record);assert(model);
 check('generic pardon or other disposition does not acquire purpose',()=>assert(rows(model).every(r=>r.purpose===undefined)));
}
for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const shape of ['literal','wrapped','unknown','null','array']){
 const values=Object.fromEntries(ids.map(id=>[id,shape==='literal'?saved[id]:shape==='wrapped'?{value:saved[id],unknown:false}:shape==='unknown'?{value:saved[id],unknown:true}:shape==='null'?null:[saved[id],'Earlier value']]));
 const record=withSaved(make(),values,map),before=structuredClone(record),model=P.protectedPacketInformationModelFor(record);assert(model);
 check('saved '+map+'/'+shape+' preserves all history and authority',()=>{
  assert.deepEqual(record,before);assert.equal(rows(model).length,7);assert(rows(model).every(r=>r.purpose));
  assert.equal(model.reviewSafety.safe,false);assert.notEqual(model.stage,'ready_to_generate');
  const noop=P.packetInformationPatch({existingItem:item,protectedVerification:record,answers:{}});assert(noop);assert.equal(noop.readyToGenerate,false);assert.deepEqual(noop.protectedTransition.nextVerification,before);
  for(const id of ids){assert(!model.requiredInputIds.includes(id));assert(!model.builderQuestions.some(q=>q.id===id));}
  const edit=P.packetInformationPatch({existingItem:item,protectedVerification:record,answers:{pardonType:'No'}});assert(edit);assert.equal(edit.readyToGenerate,false);
  for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const id of ids)assert.deepEqual(edit.protectedTransition.nextVerification.draftSnapshot[source][id],before.draftSnapshot[source][id]);
 });
}
const shadowed=withSaved(withSaved(withSaved(make(),saved,'screeningAnswers'),Object.fromEntries(ids.map(id=>[id,'Prefilled '+id])),'prefilledAnswers'),Object.fromEntries(ids.map(id=>[id,'Saved '+id])));
check('material save preserves shadowed raw maps and saved precedence',()=>{
 const patch=P.packetInformationPatch({existingItem:item,protectedVerification:shadowed,answers:{pardonType:'No'}});assert(patch);
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const id of ids)assert.deepEqual(patch.protectedTransition.nextVerification.draftSnapshot[map][id],shadowed.draftSnapshot[map][id]);
 const model=P.protectedPacketInformationModelFor(patch.protectedTransition.nextVerification);assert(model);for(const id of ids)assert.equal(model.initialAnswers[id],'Saved '+id);
});
// Changing the explicit reported type changes display purpose only; seven saved facts survive.
for(const value of ['No','I am not sure','Yes']) {
 const before=structuredClone(stored),patch=P.packetInformationPatch({existingItem:item,protectedVerification:stored,answers:{pardonType:value}});assert(patch);
 stored=patch.protectedTransition.nextVerification;
 check('actual pardonType save '+value,()=>{
  for(const id of ids)assert.deepEqual(stored.draftSnapshot.packetAnswers[id],before.draftSnapshot.packetAnswers[id]);
  for(const key of ['packetPlan','requiredInputIds','paymentAllowed','resultCode','pathwayId'])assert.deepEqual(stored.draftSnapshot[key],before.draftSnapshot[key]);
  const model=P.protectedPacketInformationModelFor(stored);assert(model);assert.equal(rows(model).filter(r=>r.purpose).length,value==='Yes'?7:0);
  assert.equal(patch.readyToGenerate,false);assert.equal(model.reviewSafety.safe,false);
 });
}
for(const raw of [undefined,{en:'Only English'}, {en:'Text',es:'Texto',extra:true}, {en:12,es:'Texto'}, null]){
 const bad=structuredClone(first),fact=bad.verificationSummary.find(r=>ids.includes(r.id));fact.purpose=raw;
 check('malformed purpose refused '+JSON.stringify(raw),()=>assert.equal(verificationSummary(bad),null));
}
const bad=structuredClone(first);bad.verificationManifest.factKeys.pop();check('manifest guard survives',()=>assert.equal(verificationSummary(bad),null));
const stale=structuredClone(stored);stale.draftSnapshot.profileSourceFingerprint='changed';stale.draftHash=P.protectedPacketDraftHash(stale.draftSnapshot);check('stale source refused',()=>assert.equal(P.protectedPacketInformationModelFor(stale),null));
owner='other-owner';const denied=await render('en');check('other owner sees no facts',()=>{assert(!denied.includes('data-fact-purpose='));assert(denied.includes('data-review-branch="unavailable"'));});
// Actual protected presentation bridge and saved-matter consumer, using the
// same owner/read boundaries as the existing purpose and save harness.
const {VA_PARDON_FOLLOW_UP}=await load('src/lib/expungement-ai/va-pardon-follow-up-copy.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const specChecklist=packetSpecificationFor('VA:'+route).participantChecklist;
check('four adopted checklist IDs English and optionality preserved',()=>{
 assert.equal(VA_PARDON_FOLLOW_UP.checklist.length,4);
 for(const entry of VA_PARDON_FOLLOW_UP.checklist)assert.deepEqual(specChecklist.find(row=>row.id===entry.id),{id:entry.id,text:entry.en,requiredBeforeFiling:entry.requiredBeforeFiling});
 assert(VA_PARDON_FOLLOW_UP.checklist.every(entry=>entry.es&&entry.requiredBeforeFiling===false));
});
const present=()=>decorate({consumerAuthUserId:owner,item},{
 readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),
 readTrustedPendingSource:async()=>({ok:false,reason:'protected_pending_source_missing'}),evaluateAuthoritative:evaluate,
 readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),
 readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})
});
globalThis.__vaPurposePage.decorateBriefcaseItemForPresentation=present;
const matterPath=file('src/app/briefcase/[packetId]/page.tsx');let matterSource=fs.readFileSync(matterPath,'utf8');
matterSource=matterSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
matterSource=matterSource.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'const decorateBriefcaseItemForPresentation=(...args:unknown[])=>(globalThis as any).__vaPurposePage.decorateBriefcaseItemForPresentation(...args);');
for(const [binding,module]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase']]){
 const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(matterSource.includes(original));matterSource=matterSource.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__vaPurposePage.'+binding+'(...args);');
}
compile(matterPath,matterSource);const Matter=(await import(pathToFileURL(matterPath).href)).default;
const renderMatter=async locale=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},await Matter({params:Promise.resolve({packetId:item.id})}))));
const guidanceOut=process.argv.find(arg=>arg.startsWith('--output='))?.slice(9);
owner='synthetic-va-owner';
for(const raw of ['Yes','No','I am not sure',undefined,{value:'Yes',unknown:true}]){
 stored=withSaved(make(raw));
 if(raw===undefined){delete stored.draftSnapshot.packetAnswers.pardonType;stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);}
 const before=structuredClone(stored),presentation=await present();
 check('actual presentation forwards held context '+JSON.stringify(raw),()=>{
  assert.equal(presentation.packetDraft.status,'available');
  assert.deepEqual(presentation.packetDraft.vaPardonTypeHeldContext,P.protectedPacketInformationModelFor(stored).vaPardonTypeHeldContext);
  assert.equal(presentation.commercialActions.checkoutAllowed,false);assert.equal(presentation.commercialActions.generationAllowed,false);
 });
 for(const locale of ['en','es']){
  const html=await renderMatter(locale),escaped=text=>renderToStaticMarkup(React.createElement('p',null,text)).slice(3,-4);
  check('actual saved matter shows reviewed conditional guide '+locale+'/'+JSON.stringify(raw),()=>{
   assert(html.includes('data-va-pardon-follow-up="true"'));
   for(const section of VA_PARDON_FOLLOW_UP.sections){assert(html.includes(escaped(section.heading[locale])));for(const paragraph of section.paragraphs)assert(html.includes(escaped(paragraph[locale])));}
   assert.equal((html.match(/data-va-checklist-id=/g)??[]).length,4);
   for(const entry of VA_PARDON_FOLLOW_UP.checklist)assert(html.includes(escaped(entry[locale])));
   assert.deepEqual(stored,before);assert.equal(P.protectedPacketInformationModelFor(stored).reviewSafety.safe,false);
  });
  if(guidanceOut)fs.writeFileSync(guidanceOut+'.matter-'+String(raw===undefined?'absent':typeof raw==='string'?raw:'wrapped-unknown').replaceAll(' ','_')+'.'+locale+'.html',html);
 }
}
for(const input of [witness.finalAnswers,{...answers,pardon_status:'No'},{...answers,case_outcome:'Acquitted or found not guilty'}]){
 stored=withSaved(make('Yes',input));const html=await renderMatter('es');
 check('nonqualifying source route does not acquire guidance',()=>assert(!html.includes('data-va-pardon-follow-up=')));
}
const otherWitness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(row=>row.jurisdiction==='MS');
const otherProfile=getProfileByJurisdiction('MS');
const otherSeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:evaluate({jurisdiction:'MS',profileVersion:otherProfile.profileVersion,matterId:item.id,answers:otherWitness.finalAnswers}),screeningAnswers:otherWitness.finalAnswers,dependencies:{},capturedAt:'2026-10-17T00:00:00Z'});assert(otherSeed);
stored={status:'unverified',revision:0,draftSnapshot:otherSeed.snapshot,draftHash:otherSeed.hash};
check('non-Virginia protected matter has no Virginia context',()=>assert.equal(P.protectedPacketInformationModelFor(stored)?.vaPardonTypeHeldContext,undefined));
const otherMatter=await renderMatter('en');check('actual non-Virginia matter has no guide',()=>assert(!otherMatter.includes('data-va-pardon-follow-up=')));
stored=withSaved(make('Yes'));
owner='other-owner';const deniedMatter=await renderMatter('es');
check('wrong owner receives no guide or saved facts',()=>{assert(!deniedMatter.includes('data-va-pardon-follow-up='));assert(!deniedMatter.includes(saved.charges_to_be_expunged));});
if(guidanceOut)fs.writeFileSync(guidanceOut+'.owner-denied.es.html',deniedMatter);
delete globalThis.__vaPurposePage;
const report={status:'PASS',checks,originalIds:['GA15-DECLARED_COMPONENT_PURPOSE_CURRENT_OFFICIAL_OUTPUT_UNBOUND',...dispositions.map(r=>r.assertionId)],purposes:purposeData,limits:['EN/ES purpose drafts require lead meaning/language review.','Actual review-page SSR and protected save/no-op seams; no hosted owner, court output, paid delivery or authority acceptance.']};
const output=process.argv.find(arg=>arg.startsWith('--output='))?.slice(9);if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks}));
