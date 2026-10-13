import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
// Expose the existing context only to select EN/ES. Render the actual control.
const file='src/components/expungement-ai/LocalizationProvider.tsx';
const source=ts.transpileModule(fs.readFileSync(file,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`,{data:{url:pathToFileURL(`${process.cwd()}/${file}`).href,source}});
const {LocalizationContext}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const {QuestionField}=await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const {t,resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {AR_RECORD_ORIGIN_QUESTION:q}=await import('../src/lib/rcap-engine/arkansas-record-origin.ts');
const rows=[];
for(const locale of ['en','es']) for(const answer of [...q.options,undefined]) {
 const value={locale,setLocale:()=>{},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};
 const markup=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value},React.createElement(QuestionField,{question:q,stateCode:'AR',value:answer,onChange(){}})));
 const escaped=text=>renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7);
 assert.ok(markup.includes(escaped(locale==='es'?q.translations.es.prompt:q.prompt)));
 for(const choice of q.options) assert.ok(markup.includes(escaped(locale==='es'?q.optionDisplay[choice].translations.es.label:q.optionDisplay[choice].label)));
 assert.ok(markup.includes(escaped(locale==='es'?q.translations.es.helperText:q.helperText)));
 assert.equal((markup.match(/type="radio"/g)||[]).length,4);
 rows.push({locale,answer:answer??null,markup});
}
const report={status:'PASS',actualRenders:rows.length,scope:'Actual QuestionField EN/ES SSR, not authenticated browser or qualified copy approval',rows};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',actualRenders:rows.length}));
