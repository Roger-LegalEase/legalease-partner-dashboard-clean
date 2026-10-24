import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const component='src/components/expungement-ai/screening/ScreeningResult.tsx',contextFile='src/components/expungement-ai/LocalizationProvider.tsx';
const sources={};
for(const file of [component,contextFile]){
 const raw=file===component&&process.env.RCAP_GUIDANCE_BASELINE?execFileSync('git',['show',`${process.env.RCAP_GUIDANCE_BASELINE}:${file}`],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
 sources[pathToFileURL(`${process.cwd()}/${file}`).href]=ts.transpileModule(raw+(file===contextFile?'\nexport {LocalizationContext};':''),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
}
register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data){sources=data;} export async function load(url,context,next){return url in sources?{format:"module",source:sources[url],shortCircuit:true}:next(url,context);} ')}`,{data:sources});
const {ScreeningResult}=await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const {LocalizationContext}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const {t,resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {evaluateAuthoritativeScreeningResult}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const NV=await import('../src/lib/rcap-engine/nevada-176a-branch.ts');
const p=getProfileByJurisdiction('NV'),base={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'Probation or specialty-court dismissal / set-aside sealing',disposition_date:'2015-01-05',resolved_timing_bucket:'gt_10_years',pending_cases:'No',pardon_status:'No',[NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]:NV.NEVADA_176A_EXCLUDED_CHARGE_NO};
const screen=answers=>evaluateAuthoritativeScreeningResult({jurisdiction:'NV',profileVersion:p.profileVersion,matterId:'synthetic-guidance-claim',answers}).evaluation;
const variants=[
 ['automatic','Nevada',screen({...base,[NV.NEVADA_176A_CHARGE_FACT_ID]:NV.NEVADA_176A_CHARGE_OTHER,[NV.NEVADA_176A_DISPOSITION_FACT_ID]:NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE})],
 ['petition','Nevada',screen({...base,[NV.NEVADA_176A_CHARGE_FACT_ID]:NV.NEVADA_176A_CHARGE_NAMED,[NV.NEVADA_176A_DISPOSITION_FACT_ID]:NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL})]
];
const witnesses=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses;
for(const jurisdiction of ['MS','VA','CA']){
 const w=witnesses.find(w=>w.jurisdiction===jurisdiction),p=getProfileByJurisdiction(jurisdiction);
 variants.push([jurisdiction,p.jurisdiction.name,evaluateAuthoritativeScreeningResult({jurisdiction,profileVersion:p.profileVersion,matterId:'synthetic-guidance-preservation',answers:w.finalAnswers}).evaluation]);
}
const checks=[],html=[],check=(pass,message)=>checks.push({pass:Boolean(pass),message});
check(variants[0][2].resultCode==='guidance_only','Real automatic branch returns guidance');check(variants[1][2].resultCode==='packet_ready_with_caution','Real petition branch remains distinct');
for(const [id,stateName,evaluation]of variants)for(const locale of ['en','es'])for(const hasScreeningSession of [false,true]){
 const before=JSON.stringify(evaluation),value={locale,setLocale:()=>{},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};
 const markup=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value},React.createElement(ScreeningResult,{evaluation,stateName,hasScreeningSession,onEditAnswers:()=>{},onPacketAction:()=>{}})));
 const heading=t(locale,'result.packet_includes','What your packet would include');
 check(JSON.stringify(evaluation)===before,id+': original evaluator/authority values unchanged');
 if(evaluation.resultCode==='guidance_only'){check(!markup.includes(heading),id+': guidance has no planned-packet section: '+locale+'/'+hasScreeningSession);check(!markup.includes('$50'),id+': guidance shows no price');}
 if(id==='petition'&&locale==='es'){check(markup.includes('Nevada utiliza el sellado de antecedentes, no la eliminación de antecedentes.'),'Actual Spanish result includes the remedy explanation in Spanish');check(!markup.includes('Nevada uses record sealing, not expungement.'),'Spanish result does not fall back to English');}
 if(id==='petition'){check(markup.includes(heading),'Held petition retains its planned packet section');if(locale==='en')check(!markup.includes('path for cases that did not end in a conviction'),'Mixed Nevada program route is not described as universally nonconviction');}
 html.push({id,locale,hasScreeningSession,resultCode:evaluation.resultCode,html:markup,sha256:createHash('sha256').update(markup).digest('hex')});
}
if(process.env.RCAP_GUIDANCE_RECEIPT){assert.ok(!fs.existsSync(process.env.RCAP_GUIDANCE_RECEIPT));fs.writeFileSync(process.env.RCAP_GUIDANCE_RECEIPT,JSON.stringify({checks,html},null,2)+'\n');}
const failed=checks.filter(c=>!c.pass);console.log(JSON.stringify({status:failed.length?'FAIL':'PASS',checks:checks.length,rendered:html.length,failed,scope:'Actual automatic/petition evaluator outputs rendered EN/ES in DTC/partner modes; no authority or hosted deployment mutation.'}));assert.equal(failed.length,0);
