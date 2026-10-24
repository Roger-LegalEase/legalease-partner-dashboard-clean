// Original GA42 index90/Q-05da98d5c9ff4737b1d0. Exact synthetic audit B
// premises copied from retained raw routes149, not a new qualifying example.
// Raw source SHA3173bbec9a9cd51ef2abd6cd05e68c1830585d833cd45157dbb7f31fe3dedcc1,
// original source c63e420, evaluation date2026-10-11. Public handlers only;
// no real HTTP listener, DB, protected owner, render or hosted acceptance.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
process.env.RCAP_EVALUATOR_TODAY='2026-10-11';
register('./lib/ts-esm-loader.mjs',import.meta.url);
// Established SSR seam: export the real provider context, leaving its body
// and the real ScreeningResult component unchanged. No application/browser.
const localeFile=process.cwd()+'/src/components/expungement-ai/LocalizationProvider.tsx';
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(localeFile).href,source:ts.transpileModule(fs.readFileSync(localeFile,'utf8')+'\nexport {LocalizationContext};',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});

const {GET}=await import('../src/app/api/expungement-ai/profiles/[state]/route.ts');
const {POST}=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {MO_AUTOMATIC_DRUG_ROUTE:route,moAutomaticDrugGuidanceSourceIsCurrent:current,MO_AUTOMATIC_DRUG_GUIDANCE:copy}=await import('../src/lib/rcap-engine/missouri-automatic-drug-guidance.ts');
const original={
  "ownership_scope": "Yes",
  "jurisdiction_scope": "State or local",
  "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  "offense_level": "Misdemeanor",
  "possible_pathway_context": "State-initiated automatic expungement of eligible drug offenses under § 610.141",
  "prior_relief": "Yes",
  "identity_error": "Yes",
  "pending_cases": "Yes",
  "resolved_timing_bucket": "lt_1_year",
  "court_requirements_completed": "yes",
  "state_exclusion_categories": [
    "Sex offense or registration"
  ]
};
const fixtureHash='8fda017efb7fdf611b7fd10edd32fdc76872806d0ee4218845f7a5b7bbdee843';
assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),fixtureHash);
const profile=getProfileByJurisdiction('MO'),beforeProfile=structuredClone(profile);
const response=await GET(new Request('http://isolated.invalid/api/expungement-ai/profiles/MO'),{params:Promise.resolve({state:'MO'})});
assert.equal(response.status,200);const pub=await response.json();
const before=structuredClone(original);
const post=async answers=>{const raw=structuredClone(answers);const response=await POST(new Request('http://isolated.invalid/api/expungement-ai/evaluate',{method:'POST',body:JSON.stringify({jurisdiction:'MO',profileVersion:pub.profileVersion,matterId:'synthetic-original-GA42-index90',answers})}));assert.equal(response.status,200);assert.deepEqual(answers,raw);return response.json();};
const safe=e=>{assert.equal(e.paymentAllowed,false);assert.equal(e.consumerPacketAvailable,false);assert.equal(e.sponsoredPacketAvailable,false);};
const actual=await post(original);safe(actual);
assert.equal(actual.resultCode,'likely_not_eligible','the original adverse category must reach its existing exclusion instead of an unoffered-alias dead end');
assert.equal(actual.reasons[0].code,'mo.state_exclusion_selected');
assert.equal(actual.pathwayId??null,null,'preserve the existing exclusion result without installing route authority');
assert.equal(actual.packetPlan??null,null,'general information must not install a packet plan');
assert.deepEqual(actual.missingQuestionIds,[]);
assert(actual.reasons.some(r=>r.code==='mo.automatic_drug_general_information'&&r.sourceRef.includes('mo-610-141-automatic-drug')));
assert.equal(actual.nextSteps.at(-1),copy.nextStep);assert(actual.cautions.includes(copy.individualLimit));assert(actual.cautions.includes(copy.operationLimit));
assert.deepEqual(original,before);
const offered=selectScreeningQuestionIds(profile,pub,original);assert(!offered.includes('sentence_completion_date'));assert(!offered.includes('financial_obligations'));assert(pub.questions.find(q=>q.id==='possible_pathway_context').options.includes(original.possible_pathway_context));
assert(current(profile));
let guardChecks=0;
for(const change of [p=>p.jurisdiction.code='KS',p=>p.profileVersion='drift',p=>p.source.sourceCorpusSha256='drift',p=>p.pathways.find(p=>p.id===route).legalAuthority.paymentAuthority='packet_checkout',p=>p.pathways.find(p=>p.id===route).filingRequired=true,p=>p.pathways.find(p=>p.id===route).legalAuthority.packetFamily='invented',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).requiredInputIds=['financial_obligations'],p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates=[{relativePath:'other'}]]){const altered=structuredClone(profile);change(altered);assert.equal(current(altered),false);guardChecks++;}
for(const key of ['memo','guide','proof','family','specification']){assert.equal(current(profile,{[key]:{drift:true}}),false,key);guardChecks++;}
for(const value of ['Yes','No','I am not sure','unknown','Prefer not to say','Waived']){const answers={...original,financial_obligations:value};const e=await post(answers);safe(e);assert.equal(e.resultCode,'likely_not_eligible');assert.deepEqual(e.missingQuestionIds,[]);assert.equal(e.pathwayId??null,null);assert.equal(answers.financial_obligations,value);}
for(const value of ['Yes','No','I am not sure']){const answers={...original,sentence_completion_date:value};const e=await post(answers);safe(e);assert.equal(e.resultCode,'likely_not_eligible');assert.equal(e.pathwayId??null,null);assert.equal(answers.sentence_completion_date,value);}
// Explicit derivative controls only remove the broad category or mark it
// uncertain. They are general-information/review cases, not qualifying drug
// records: no statute, conviction, final date or operation fact is added.
const derivativeOutcomes=[];
const nonexcluded={...original,state_exclusion_categories:['None of these']};
for(const value of [undefined,'Yes','No','I am not sure','Waived']){const answers={...nonexcluded};if(value!==undefined)answers.financial_obligations=value;const e=await post(answers);safe(e);assert.equal(e.resultCode,'guidance_only');assert.equal(e.pathwayId,route);assert.equal(e.packetPlan??null,null);assert.deepEqual(e.missingQuestionIds,[]);assert.equal(e.nextSteps[0],copy.nextStep);derivativeOutcomes.push({financial:value??'absent',response:e});}
const uncertain=await post({...original,state_exclusion_categories:['I am not sure']});safe(uncertain);assert.equal(uncertain.resultCode,'needs_review');assert.equal(uncertain.reasons[0].code,'mo.state_exclusion_unknown');assert.equal(uncertain.packetPlan??null,null);assert.deepEqual(uncertain.missingQuestionIds,[]);
assert.deepEqual(await post(original),actual,'unchanged ordinary public replay preserves the exact result and raw original');
for(const answers of [{...original,ownership_scope:'No'},{...original,jurisdiction_scope:'Federal'}]){const e=await post(answers);safe(e);assert.equal(e.resultCode,'hard_stop');assert(!e.reasons.some(r=>r.code==='mo.automatic_drug_general_information'));}
for(const label of [undefined,'Unrecognized route',profile.pathways.find(p=>p.id==='closed-record-outcome-under-rsmo-610-105').label]){const answers={...original};if(label===undefined)delete answers.possible_pathway_context;else answers.possible_pathway_context=label;const e=await post(answers);assert(!e.reasons.some(r=>r.code==='mo.automatic_drug_general_information'));}
const savedFingerprint=profile.source.sourceCorpusSha256;
try{profile.source.sourceCorpusSha256='drift';assert(!current(profile));const e=await post(original);safe(e);assert(!e.reasons.some(r=>r.code==='mo.automatic_drug_general_information'));}finally{profile.source.sourceCorpusSha256=savedFingerprint;}
assert.deepEqual(profile,beforeProfile);assert.deepEqual(original,before);
const {safeUserFacingEngineText:safeText}=await import('../src/lib/expungement-ai/missing-fields.ts');
const {resolveRuntimeText,t}=await import('../src/lib/expungement-ai/localization.ts');
const guide=JSON.parse(fs.readFileSync('data/rcap-all50/guidance-packets/mo.json','utf8')).packets.find(p=>p.trackId==='mo-610-141-automatic-drug');
const sentence=(text,start,end)=>text.slice(text.indexOf(start),end?text.indexOf(end)+1:undefined);
const sourcePairs=[
 [copy.filing,guide.participantFiles.en,guide.participantFiles.es],
 [copy.nextStep,guide.nextStep.en,guide.nextStep.es],
 [copy.individualLimit,sentence(guide.handoff.en,'And to be plain about our limits:'),sentence(guide.handoff.es,'Y para ser claros sobre nuestros límites:')],
 [copy.operationLimit,sentence(guide.timing.en,"The state's clock:",'. Those are three'),sentence(guide.timing.es,'El reloj del estado:', '. Son tres')]
];
for(const[raw,en,es]of sourcePairs){assert.equal(raw,en);assert.equal(safeText(raw,{locale:'en'}),en);assert.equal(safeText(raw,{locale:'es'}),es);assert.notEqual(en,es);}
assert(!copy.operationLimit.includes('no implementation notice'));assert(!copy.operationLimit.includes('not published'));
assert.equal(safeText('We could not find that source-defined.',{locale:'en'}),'We could not find that state.');
assert.equal(safeText('We could not find that source-defined.',{locale:'es'}),'No pudimos encontrar ese estado.','softened text must still reach its existing translated runtime entry');
assert.equal(safeText('The answers require source review before a packet decision.',{locale:'es'}),t('es','result.ms_missing_detail_title'));
assert(!fs.readFileSync('src/lib/expungement-ai/localization.ts','utf8').includes('missouri-automatic-drug-guidance'),'client localization must not import the server-only guard');
const {LocalizationContext}=await import(pathToFileURL(localeFile));
const {ScreeningResult}=await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const escape=text=>renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7);
const presentation=[];
for(const e of [actual,uncertain,derivativeOutcomes[0].response])for(const locale of ['en','es']){
 const context={locale,setLocale:()=>{},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};
 const html=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value:context},React.createElement(ScreeningResult,{evaluation:e,stateName:'Missouri',questionPromptById:{},onEditAnswers:()=>{},onPacketAction:()=>{}})));
 const display=[...e.reasons.map(r=>r.text),...e.cautions,...e.nextSteps];
 for(const raw of display){const translated=safeText(raw,{locale});assert(html.includes(escape(translated)),e.resultCode+'/'+locale+' actual component displays translated engine text');if(locale==='es'){assert.notEqual(translated,safeText(raw,{locale:'en'}),'no English fallback for affected result text');assert(!html.includes(escape(safeText(raw,{locale:'en'}))),'no affected English text leaked into Spanish component');}}
 const title=resolveRuntimeText(locale,e.userLabel);assert(html.includes(escape(title)));if(locale==='es')assert.notEqual(title,e.userLabel);
 if(e.pathwayLabel&&locale==='es'){const existing=JSON.parse(fs.readFileSync('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json','utf8')).entries.find(row=>row.kind==='route_display_label'&&row.jurisdiction==='MO'&&row.pathwayId===route&&row.originalEnglish===e.pathwayLabel);assert(existing);assert(html.includes(escape(existing.es)),'preserve the existing reviewed route display pair');assert(!html.includes(escape(e.pathwayLabel)));}
 assert(!html.includes('$50'));
 presentation.push({result:e.resultCode,locale,htmlSha256:createHash('sha256').update(html).digest('hex'),translatedAffectedStrings:display.length});
}
console.log(JSON.stringify({status:'PASS_EXACT_MO610141_GENERAL_GUIDANCE_PUBLIC_BOUNDARY',original196Index:90,fixtureHash,guardChecks,pairedGuideCopyChecks:sourcePairs.length,presentation,originalResponse:actual,nonexcludedDerivativeOutcomes:derivativeOutcomes,uncertainCategoryResponse:uncertain,originalRawUnchanged:true,individualQualificationAsserted:false,operationAsserted:false,authorityGranted:false,authenticatedAcceptance:false}));
