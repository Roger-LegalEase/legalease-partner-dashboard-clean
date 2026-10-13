import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const file='src/components/expungement-ai/LocalizationProvider.tsx';
const source=ts.transpileModule(fs.readFileSync(file,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);} ')}`,{data:{url:pathToFileURL(`${process.cwd()}/${file}`).href,source}});
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const F=await import('../src/lib/rcap-engine/california-prop64-facts.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {POST}=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const {resolveRuntimeText,t}=await import('../src/lib/expungement-ai/localization.ts');
const {ScreeningResult}=await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const {LocalizationContext}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const profile=getProfileByJurisdiction('CA'),pub=projectPublicProfile(profile),checks=[],scenarios=[],renders=[];
function check(name,actual,expected){checks.push({name,actual,expected,pass:JSON.stringify(actual)===JSON.stringify(expected)});}
const facts={charge:'HSC11357',ca_prop64_next_step:'apply',ca_prop64_offense_date:'2000-01-01',ca_prop64_age_at_offense:21,ca_prop64_court_type:'adult',ca_prop64_existing_relief:'none',ca_prop64_substance:'flower',ca_prop64_flower_grams:28.5,ca_prop64_possession_context:'ordinary'};
const evaluateAnswers=answers=>evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'synthetic-ca-conduct',answers});
for(const name of ['currently-serving','completed']){
 const fixture=JSON.parse(fs.readFileSync(new URL(`./fixtures/ca-prop64-protected-baseline/${name}.json`,import.meta.url)));
 const base=fixture.answers,positive={...base,...facts};
 const target=name==='completed'?'packet_ready':'packet_ready_with_caution';
 const held=evaluateAnswers(base).evaluation;
 check(name+' legacy baseline now held',held.resultCode,'needs_more_info');check(name+' no missing facts payment',held.paymentAllowed,false);
 const legacy=P.caProp64ClarificationModelFor(fixture.record);check(name+' genuine old protected snapshot recoverable',Boolean(legacy),true);
 const wrong=structuredClone(fixture.record);wrong.draftHash='0'.repeat(64);check(name+' invalid source hash denied',P.caProp64ClarificationModelFor(wrong),null);
 const newAnswers={...facts,ca_prop64_record_section:'11357'};
 // New conditional children are collected in successive saves; a hidden child
 // cannot be injected through a different question's correction request.
 let record=fixture.record,iterations=0;
 while(iterations++<8){const m=P.caProp64ClarificationModelFor(record);if(!m)break;const delta=Object.fromEntries(Object.entries(newAnswers).filter(([id,v])=>m.requiredInputIds.includes(id)&&JSON.stringify(m.initialAnswers[id])!==JSON.stringify(v)));if(!Object.keys(delta).length)break;const patch=P.caProp64ClarificationPatch({protectedVerification:record,answers:delta});check(name+' protected factual save '+iterations,Boolean(patch),true);if(!patch)break;record=patch.protectedTransition.nextVerification;}
 const recovered=P.protectedPacketInformationModelFor(record);check(name+' corrected legacy model',Boolean(recovered?.packetPlan),true);check(name+' correction invalidates',record.status,'invalidated');
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])check(name+' raw legal conclusion retained '+map,record.draftSnapshot[map].ca_prop64_lesser_or_no_offense,fixture.record.draftSnapshot[map].ca_prop64_lesser_or_no_offense);
 if(recovered){for(const id of F.caProp64ActiveFactIds(positive))check(name+' correction owned '+id,P.editablePacketInputIds(recovered).has(id),true);check(name+' old conclusion no packet requirement',recovered.requiredInputIds.some(id=>F.CA_PROP64_LEGACY_IDS.includes(id)),false);}
 for(const menu of [undefined,'Skip',...profile.pathways.map(p=>p.label)]){const a={...positive,possible_pathway_context:menu};const r=evaluateAnswers(a).evaluation;check(name+' menu invariant '+menu,{result:r.resultCode,route:r.pathwayId},{result:target,route:fixture.pathwayId});}
 for(const apply of ['apply',{value:'apply',unknown:false}])for(const branch of [undefined,'unknown',{value:'unknown',unknown:false}])for(const menu of [undefined,'Skip',...profile.pathways.map(p=>p.label)]){const a={...positive,ca_prop64_next_step:apply,ca_prop64_branch:branch,possible_pathway_context:menu};const r=evaluateAnswers(a).evaluation;const label=name+' unconfirmed branch '+JSON.stringify([apply,branch,menu]);check(label+' held',{result:r.resultCode,branchMissing:r.missingQuestionIds.includes('ca_prop64_branch'),payment:r.paymentAllowed},{result:'needs_more_info',branchMissing:true,payment:false});check(label+' reachable',selectScreeningQuestionIds(profile,pub,a).includes('ca_prop64_branch'),true);}
 for(const [id,value]of [['ca_prop64_qualifying_marijuana_offense','No'],['ca_prop64_lesser_or_no_offense','unknown'],['pending_cases','Yes'],['financial_obligations','No'],['new_convictions_during_waiting_period','Yes'],['state_exclusion_categories',['Sex offense or registration']]]){const a={...positive,[id]:value};check(name+' no imported blanket bar '+id,evaluateAnswers(a).evaluation.resultCode,target);}
 const selected=selectScreeningQuestionIds(profile,pub,positive);for(const id of F.CA_PROP64_LEGACY_IDS)check(name+' legal conclusion not asked '+id,selected.includes(id),false);
 for(const id of F.caProp64ActiveFactIds(positive))check(name+' active fact asked '+id,selected.includes(id),true);
 const hidden={...positive,ca_prop64_plant_count:22,ca_prop64_prior_superstrike:'Yes'};const resumed=sanitizeResumedAnswersForQuestionIds(pub,hidden,selected);for(const id of ['ca_prop64_plant_count','ca_prop64_prior_superstrike',...F.CA_PROP64_LEGACY_IDS])check(name+' hidden raw retained '+id,resumed[id],hidden[id]);
 for(const [label,patch,expected]of [['legacy',{},'needs_more_info'],['positive',facts,target],['zero',{...facts,ca_prop64_flower_grams:0},'needs_review'],['juvenile',{...facts,ca_prop64_court_type:'juvenile'},'needs_review'],['oldrelief',{...facts,ca_prop64_existing_relief:'dismissed',ca_prop64_additional_benefit:'sealing'},'needs_review'],['school',{...facts,ca_prop64_possession_context:'school_children'},name==='completed'?'needs_review':target]]){
  const answers={...base,...patch},evaluation=evaluateAnswers(answers).evaluation;scenarios.push({name,label,answers,evaluation});check(name+'/'+label,evaluation.resultCode,expected);
  const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'synthetic-ca-handler',answers})}));const body=await response.json();check(name+'/'+label+' actual handler',[response.status,body.resultCode],[200,expected]);
  for(const locale of ['en','es']){const value={locale,setLocale:()=>{},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};const markup=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value},React.createElement(ScreeningResult,{evaluation,stateName:'California',questionPromptById:Object.fromEntries(pub.questions.map(q=>[q.id,q.prompt])),hasScreeningSession:false,onEditAnswers:()=>{},onPacketAction:()=>{}})));renders.push({name,label,locale,markup});for(const reason of evaluation.reasons.filter(r=>Object.values(F.CA_PROP64_REASON_COPY).some(([en])=>en===r.text))){const text=resolveRuntimeText(locale,reason.text);check(name+'/'+label+'/'+locale+' reason rendered',markup.includes(renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)),true);if(locale==='es')check(name+'/'+label+' Spanish reason',text!==reason.text,true);}}
 }
}
const failed=checks.filter(c=>!c.pass),report={status:failed.length?'FAIL':'PASS',checks:checks.length,scenarios:scenarios.length,renders:renders.length,failed,details:checks,scenarioDetails:scenarios,renderDetails:renders,limits:['Pure protected transitions and real stateless handlers/SSR; not DB/browser/RLS acceptance or professional approval.']};
const out=process.argv[2];if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,scenarios:scenarios.length,renders:renders.length,failed},null,2));assert.equal(failed.length,0);
